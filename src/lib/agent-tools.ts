import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AuthenticatedRequestUser } from "@/lib/api/middleware";
import {
  getEquipmentHistory,
  createInspection,
  createWorkOrder,
  updateWorkOrder,
} from "@/services/operations.service";

// ---------------------------------------------------------------------------
// Standard response envelope
// ---------------------------------------------------------------------------
type ToolResult = {
  success: boolean;
  data: Record<string, any> | null;
  summary: string;
  error: string | null;
};

function ok(data: Record<string, any>, summary: string): string {
  return JSON.stringify({ success: true, data, summary, error: null } satisfies ToolResult);
}

function fail(error: string): string {
  return JSON.stringify({ success: false, data: null, summary: "", error } satisfies ToolResult);
}

// ---------------------------------------------------------------------------
// Internal entity resolvers
// ---------------------------------------------------------------------------

function cleanEquipmentCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/\b(?:DASH|HYPHEN|SLASH|UNDERSCORE)\b/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/** Resolve equipment identifier (code or partial name) → { id, code, name, location, status } */
async function resolveEquipment(
  supabase: SupabaseClient<Database>,
  identifier: string,
): Promise<{ id: string; equipment_code: string; name: string; location: string; status: string }> {
  // Try exact code first
  const exactResult = await (supabase as any)
    .from("equipment")
    .select("id, equipment_code, name, location, status")
    .ilike("equipment_code", identifier)
    .maybeSingle();

  if (exactResult.data) return exactResult.data;

  // Fetch all equipment to perform speech-friendly normalization & fuzzy matching
  const allEquipmentResult = await (supabase as any)
    .from("equipment")
    .select("id, equipment_code, name, location, status");

  if (allEquipmentResult.data && allEquipmentResult.data.length > 0) {
    const cleanedIdentifier = cleanEquipmentCode(identifier);
    
    // 1. Try exact match on cleaned identifiers
    const exactCleanedMatch = allEquipmentResult.data.find(
      (eq: any) => cleanEquipmentCode(eq.equipment_code) === cleanedIdentifier
    );
    if (exactCleanedMatch) return exactCleanedMatch;

    // 2. Try fuzzy matching using Levenshtein distance on cleaned identifiers
    let bestMatch = null;
    let minDistance = Infinity;

    for (const eq of allEquipmentResult.data) {
      const cleanedCode = cleanEquipmentCode(eq.equipment_code);
      const distance = getLevenshteinDistance(cleanedIdentifier, cleanedCode);
      
      // We want to make sure the match is reasonably close (distance <= 2)
      if (distance < minDistance && distance <= 2) {
        minDistance = distance;
        bestMatch = eq;
      }
    }

    if (bestMatch) return bestMatch;
  }

  // Fall back to partial name search
  const nameResult = await (supabase as any)
    .from("equipment")
    .select("id, equipment_code, name, location, status")
    .ilike("name", `%${identifier}%`)
    .limit(1)
    .maybeSingle();

  if (nameResult.error) throw new Error(`Database error finding equipment "${identifier}"`);
  if (!nameResult.data) {
    throw new Error(
      `Equipment "${identifier}" not found. Try a different code or name, or use searchEquipment to browse available equipment.`,
    );
  }
  return nameResult.data;
}

/** Resolve work order number → { id, work_order_number, status } */
async function resolveWorkOrder(
  supabase: SupabaseClient<Database>,
  woNumber: string,
): Promise<{ id: string; work_order_number: string; status: string }> {
  const { data, error } = await (supabase as any)
    .from("work_orders")
    .select("id, work_order_number, status")
    .ilike("work_order_number", woNumber)
    .maybeSingle();
  if (error) throw new Error(`Database error finding work order ${woNumber}`);
  if (!data) throw new Error(`Work order "${woNumber}" not found. Verify the work order number.`);
  return data;
}

/** Resolve technician name → { id, full_name, employee_code } */
async function resolveTechnicianByName(
  supabase: SupabaseClient<Database>,
  name: string,
): Promise<{ id: string; full_name: string; employee_code: string }> {
  const { data, error } = await (supabase as any)
    .from("users")
    .select("id, full_name, employee_code")
    .ilike("full_name", `%${name}%`)
    .eq("role", "TECHNICIAN")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Database error finding technician "${name}"`);
  if (!data) throw new Error(`Technician "${name}" not found. Use findTechnician to look them up.`);
  return data;
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------
export function getAgentTools(
  supabase: SupabaseClient<Database>,
  user: AuthenticatedRequestUser,
): any[] {
  const db = supabase as any;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. getEquipmentHistory (enhanced)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_getEquipmentHistory = {
    type: "function",
    function: {
      name: "getEquipmentHistory",
      description:
        "Retrieve maintenance and repair history for a specific piece of equipment. " +
        "Use when the user asks about past failures, repair records, breakdowns, or failure frequency. " +
        "Accepts equipment codes ('HVAC-R1-01') OR partial names ('rooftop HVAC'). " +
        "Supports date range filters and summarise mode for aggregate counts. " +
        "Do NOT use for current equipment status (use getEquipmentStatus) or browsing equipment by location (use searchEquipment).",
      parameters: {
        type: "object",
        properties: {
          equipmentIdentifier: {
            type: "string",
            description: "Equipment code (e.g. 'HVAC-R1-01') or partial name (e.g. 'rooftop HVAC unit').",
          },
          limit: { type: "number", description: "Max records to return. Default 10." },
          from: { type: "string", description: "Start date filter ISO format e.g. '2026-01-01'." },
          to: { type: "string", description: "End date filter ISO format e.g. '2026-06-30'." },
          failureType: { type: "string", description: "Optional filter by failure category keyword." },
          summarise: {
            type: "boolean",
            description: "If true, return aggregate counts by failure type instead of raw records.",
          },
        },
        required: ["equipmentIdentifier"],
      },
      function: async (args: {
        equipmentIdentifier: string;
        limit?: number;
        from?: string;
        to?: string;
        failureType?: string;
        summarise?: boolean;
      }) => {
        try {
          const eq = await resolveEquipment(supabase, args.equipmentIdentifier);

          let query = db
            .from("repair_history")
            .select(
              "id, repair_date, failure_type, description, cost, repair_duration_hours, performed_by, created_at",
            )
            .eq("equipment_id", eq.id)
            .order("repair_date", { ascending: false });

          if (args.from) query = query.gte("repair_date", args.from);
          if (args.to) query = query.lte("repair_date", args.to);
          if (args.failureType) query = query.ilike("failure_type", `%${args.failureType}%`);
          query = query.limit(args.limit ?? 10);

          const { data, error } = await query;
          if (error) throw new Error(error.message);

          const records = (data ?? []) as any[];

          if (args.summarise) {
            const byType: Record<string, number> = {};
            records.forEach((r: any) => {
              byType[r.failure_type] = (byType[r.failure_type] ?? 0) + 1;
            });
            const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
            return ok(
              {
                equipment: { code: eq.equipment_code, name: eq.name, location: eq.location, status: eq.status },
                total_count: records.length,
                aggregate: { by_failure_type: byType },
              },
              records.length === 0
                ? `No repair records found for ${eq.equipment_code}.`
                : `${eq.equipment_code} has ${records.length} repair records. Most common: ${topType?.[0]} (${topType?.[1]} times).`,
            );
          }

          const mostRecent = records[0];
          return ok(
            {
              equipment: { code: eq.equipment_code, name: eq.name, location: eq.location, status: eq.status },
              records,
              total_count: records.length,
            },
            records.length === 0
              ? `No repair history found for ${eq.equipment_code}.`
              : `${eq.equipment_code} has ${records.length} repair record${records.length !== 1 ? "s" : ""}. Most recent: ${mostRecent?.failure_type} on ${mostRecent?.repair_date}.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. searchEquipment (new)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_searchEquipment = {
    type: "function",
    function: {
      name: "searchEquipment",
      description:
        "Search for equipment by name, type, location, or partial code. " +
        "Use when the user describes equipment vaguely ('pumps in Building A', 'all HVAC units') or when the exact code is unknown. " +
        "Call this before other equipment tools when the identifier is ambiguous.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Free-text search: 'pumps in building A', 'all HVAC units', 'GEN-B1'.",
          },
          location: { type: "string", description: "Optional location filter (partial match)." },
          status: {
            type: "string",
            enum: ["ACTIVE", "UNDER_MAINTENANCE", "RETIRED"],
            description: "Optional status filter.",
          },
          limit: { type: "number", description: "Max results. Default 10." },
        },
        required: ["query"],
      },
      function: async (args: {
        query: string;
        location?: string;
        status?: string;
        limit?: number;
      }) => {
        try {
          let q = db
            .from("equipment")
            .select("equipment_code, name, location, status, manufacturer, installation_date")
            .or(`name.ilike.%${args.query}%,equipment_code.ilike.%${args.query}%`);

          if (args.location) q = q.ilike("location", `%${args.location}%`);
          if (args.status) q = q.eq("status", args.status);
          q = q.limit(args.limit ?? 10);

          const { data, error } = await q;
          if (error) throw new Error(error.message);

          const results = (data ?? []) as any[];
          const activeCount = results.filter((r) => r.status === "ACTIVE").length;

          return ok(
            { results, total_count: results.length },
            results.length === 0
              ? `No equipment found matching "${args.query}".`
              : `Found ${results.length} equipment record${results.length !== 1 ? "s" : ""} matching "${args.query}". ${activeCount} active.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. getEquipmentStatus (new)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_getEquipmentStatus = {
    type: "function",
    function: {
      name: "getEquipmentStatus",
      description:
        "Retrieve the current operational status and specifications of a single piece of equipment, " +
        "including how many open work orders and open alerts it has. " +
        "Use when the user asks 'what is the status of X', 'is X operational', 'is X under maintenance'. " +
        "Do NOT use for repair history (use getEquipmentHistory).",
      parameters: {
        type: "object",
        properties: {
          equipmentIdentifier: {
            type: "string",
            description: "Equipment code (e.g. 'PUMP-W-01') or partial name.",
          },
        },
        required: ["equipmentIdentifier"],
      },
      function: async (args: { equipmentIdentifier: string }) => {
        try {
          const eq = await resolveEquipment(supabase, args.equipmentIdentifier);

          const [woResult, alertResult] = await Promise.all([
            db
              .from("work_orders")
              .select("id", { count: "exact", head: true })
              .eq("equipment_id", eq.id)
              .in("status", ["OPEN", "IN_PROGRESS"]),
            db
              .from("alerts")
              .select("id", { count: "exact", head: true })
              .eq("equipment_id", eq.id)
              .in("status", ["OPEN", "ACKNOWLEDGED"]),
          ]);

          const openWOs = woResult.count ?? 0;
          const openAlerts = alertResult.count ?? 0;

          const statusLabel =
            eq.status === "ACTIVE"
              ? "operational"
              : eq.status === "UNDER_MAINTENANCE"
              ? "under maintenance"
              : "retired";

          return ok(
            {
              equipment_code: eq.equipment_code,
              name: eq.name,
              location: eq.location,
              status: eq.status,
              open_work_orders: openWOs,
              open_alerts: openAlerts,
            },
            `${eq.equipment_code} (${eq.name}) is ${statusLabel}` +
              (openWOs > 0 ? ` with ${openWOs} open work order${openWOs !== 1 ? "s" : ""}` : "") +
              (openAlerts > 0 ? ` and ${openAlerts} open alert${openAlerts !== 1 ? "s" : ""}` : "") +
              ".",
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. createInspection (enhanced)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_createInspection = {
    type: "function",
    function: {
      name: "createInspection",
      description:
        "Create an inspection report for a piece of equipment. " +
        "Severity HIGH or CRITICAL automatically triggers an alert. " +
        "Use when a technician is reporting findings after inspecting equipment. " +
        "Do NOT use just to create an alert — the inspection auto-triggers it.",
      parameters: {
        type: "object",
        properties: {
          equipmentIdentifier: {
            type: "string",
            description: "Equipment code or partial name.",
          },
          title: { type: "string", description: "Short title for the inspection." },
          description: { type: "string", description: "Detailed description of findings." },
          severity: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            description: "Severity. HIGH or CRITICAL automatically raises an alert.",
          },
          recommendation: { type: "string", description: "Optional recommended next steps." },
          idempotency_key: {
            type: "string",
            description: "Optional UUID to prevent duplicate creation on offline replay.",
          },
        },
        required: ["equipmentIdentifier", "title", "description", "severity"],
      },
      function: async (args: {
        equipmentIdentifier: string;
        title: string;
        description: string;
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        recommendation?: string;
        idempotency_key?: string;
      }) => {
        try {
          const eq = await resolveEquipment(supabase, args.equipmentIdentifier);
          const res = await createInspection(supabase, user, {
            equipmentId: eq.id,
            title: args.title,
            description: args.description,
            severity: args.severity,
            recommendation: args.recommendation,
          });

          const inspection = res.inspection as any;
          const alertPhrase = res.alertCreated
            ? ` Alert has been raised.`
            : "";

          return ok(
            {
              inspection_id: inspection?.id,
              equipment_code: eq.equipment_code,
              severity: args.severity,
              status: "OPEN",
              alert_created: res.alertCreated,
            },
            `Inspection created for ${eq.equipment_code} with ${args.severity} severity.${alertPhrase}`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 5. listInspections (new)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_listInspections = {
    type: "function",
    function: {
      name: "listInspections",
      description:
        "Retrieve inspection reports with optional filters: equipment, severity, status, date range. " +
        "Use when a supervisor or technician asks to view inspection reports.",
      parameters: {
        type: "object",
        properties: {
          equipmentIdentifier: { type: "string", description: "Optional equipment code or partial name filter." },
          severity: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          },
          status: {
            type: "string",
            enum: ["OPEN", "REVIEWED", "CLOSED"],
          },
          from: { type: "string", description: "Start date ISO format." },
          to: { type: "string", description: "End date ISO format." },
          limit: { type: "number", description: "Max results. Default 10." },
        },
        required: [],
      },
      function: async (args: {
        equipmentIdentifier?: string;
        severity?: string;
        status?: string;
        from?: string;
        to?: string;
        limit?: number;
      }) => {
        try {
          let equipmentId: string | undefined;
          let equipmentCode: string | undefined;
          if (args.equipmentIdentifier) {
            const eq = await resolveEquipment(supabase, args.equipmentIdentifier);
            equipmentId = eq.id;
            equipmentCode = eq.equipment_code;
          }

          let q = db
            .from("inspection_reports")
            .select(
              "id, title, severity, status, created_at, equipment_id, technician_id, recommendation",
            )
            .order("created_at", { ascending: false });

          if (equipmentId) q = q.eq("equipment_id", equipmentId);
          if (args.severity) q = q.eq("severity", args.severity);
          if (args.status) q = q.eq("status", args.status);
          if (args.from) q = q.gte("created_at", args.from);
          if (args.to) q = q.lte("created_at", args.to);
          q = q.limit(args.limit ?? 10);

          const { data, error } = await q;
          if (error) throw new Error(error.message);

          const results = (data ?? []) as any[];
          const criticalCount = results.filter((r) => r.severity === "CRITICAL").length;

          const filterDesc = [
            args.severity ? `${args.severity} severity` : "",
            args.status ? `${args.status} status` : "",
            equipmentCode ? `for ${equipmentCode}` : "",
          ]
            .filter(Boolean)
            .join(", ");

          return ok(
            { results, total_count: results.length },
            results.length === 0
              ? `No inspection reports found${filterDesc ? ` (${filterDesc})` : ""}.`
              : `Found ${results.length} inspection${results.length !== 1 ? "s" : ""}${filterDesc ? ` (${filterDesc})` : ""}. ${criticalCount > 0 ? `${criticalCount} critical.` : ""}`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 6. createWorkOrder (enhanced)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_createWorkOrder = {
    type: "function",
    function: {
      name: "createWorkOrder",
      description:
        "Create a new work order for a piece of equipment. " +
        "Accepts technician name for assignment (resolved internally — no UUID needed). " +
        "Use when initiating a maintenance task. " +
        "Do NOT use when the work order already exists and needs a status change (use updateWorkOrder).",
      parameters: {
        type: "object",
        properties: {
          equipmentIdentifier: { type: "string", description: "Equipment code or partial name." },
          title: { type: "string", description: "Title of the work order." },
          description: { type: "string", description: "Detailed description of work needed." },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          },
          assignToName: {
            type: "string",
            description: "Human name of technician to assign to (e.g. 'John Miller'). If omitted, assigns to current user.",
          },
          idempotency_key: {
            type: "string",
            description: "Optional UUID to prevent duplicate creation on offline replay.",
          },
        },
        required: ["equipmentIdentifier", "title", "description", "priority"],
      },
      function: async (args: {
        equipmentIdentifier: string;
        title: string;
        description: string;
        priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        assignToName?: string;
        idempotency_key?: string;
      }) => {
        try {
          const eq = await resolveEquipment(supabase, args.equipmentIdentifier);

          let assignedToId: string | undefined;
          let assignedToName = user.fullName;
          if (args.assignToName) {
            const tech = await resolveTechnicianByName(supabase, args.assignToName);
            assignedToId = tech.id;
            assignedToName = tech.full_name;
          }

          const res = await createWorkOrder(supabase, user, {
            equipmentId: eq.id,
            title: args.title,
            description: args.description,
            priority: args.priority,
            assignedTo: assignedToId,
          });

          const wo = res.workOrder as any;
          return ok(
            {
              work_order_number: wo?.work_order_number,
              equipment_code: eq.equipment_code,
              priority: args.priority,
              status: "OPEN",
              assigned_to_name: assignedToName,
            },
            `Work order ${wo?.work_order_number ?? ""} created for ${eq.equipment_code} at ${args.priority} priority, assigned to ${assignedToName}.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 7. listWorkOrders (new)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_listWorkOrders = {
    type: "function",
    function: {
      name: "listWorkOrders",
      description:
        "Query work orders with filters: status, priority, equipment, technician name, date range. " +
        "Use when the user asks 'show my work orders', 'what is open', 'list all in-progress tasks'. " +
        "Set myOrdersOnly to true when the user says 'my tasks' or 'my work orders'.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "CLOSED"] },
          equipmentIdentifier: { type: "string", description: "Optional equipment code or partial name." },
          technicianName: { type: "string", description: "Optional technician name filter." },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          from: { type: "string", description: "Created-at start date ISO format." },
          to: { type: "string", description: "Created-at end date ISO format." },
          limit: { type: "number", description: "Max results. Default 10." },
          myOrdersOnly: {
            type: "boolean",
            description: "If true, only return work orders assigned to the current user.",
          },
        },
        required: [],
      },
      function: async (args: {
        status?: string;
        equipmentIdentifier?: string;
        technicianName?: string;
        priority?: string;
        from?: string;
        to?: string;
        limit?: number;
        myOrdersOnly?: boolean;
      }) => {
        try {
          let equipmentId: string | undefined;
          if (args.equipmentIdentifier) {
            const eq = await resolveEquipment(supabase, args.equipmentIdentifier);
            equipmentId = eq.id;
          }

          let techId: string | undefined;
          if (args.technicianName) {
            const tech = await resolveTechnicianByName(supabase, args.technicianName);
            techId = tech.id;
          }

          let q = db
            .from("work_orders")
            .select(
              "work_order_number, title, status, priority, created_at, completed_at, equipment_id, assigned_to",
            )
            .order("created_at", { ascending: false });

          if (args.status) q = q.eq("status", args.status);
          if (args.priority) q = q.eq("priority", args.priority);
          if (equipmentId) q = q.eq("equipment_id", equipmentId);
          if (args.myOrdersOnly) q = q.eq("assigned_to", user.id);
          else if (techId) q = q.eq("assigned_to", techId);
          if (args.from) q = q.gte("created_at", args.from);
          if (args.to) q = q.lte("created_at", args.to);
          q = q.limit(args.limit ?? 10);

          const { data, error } = await q;
          if (error) throw new Error(error.message);

          const results = (data ?? []) as any[];
          const openCount = results.filter((r) => r.status === "OPEN").length;
          const criticalCount = results.filter((r) => r.priority === "CRITICAL").length;
          const topPriority = results.find(
            (r) => r.status !== "CLOSED" && (r.priority === "CRITICAL" || r.priority === "HIGH"),
          );

          let summary = results.length === 0
            ? "No work orders found matching your criteria."
            : `Found ${results.length} work order${results.length !== 1 ? "s" : ""}. ${openCount} open.`;
          if (topPriority) {
            summary += ` Top priority: ${topPriority.work_order_number} (${topPriority.priority}).`;
          }

          return ok({ results, total_count: results.length }, summary);
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 8. getWorkOrder (new)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_getWorkOrder = {
    type: "function",
    function: {
      name: "getWorkOrder",
      description:
        "Retrieve full details of a single work order by its number. " +
        "Use when the user references a specific work order number and wants its current state.",
      parameters: {
        type: "object",
        properties: {
          workOrderNumber: {
            type: "string",
            description: "Work order number e.g. 'WO-2023-001'.",
          },
        },
        required: ["workOrderNumber"],
      },
      function: async (args: { workOrderNumber: string }) => {
        try {
          const { data, error } = await db
            .from("work_orders")
            .select("*")
            .ilike("work_order_number", args.workOrderNumber)
            .maybeSingle();

          if (error) throw new Error(error.message);
          if (!data) throw new Error(`Work order "${args.workOrderNumber}" not found.`);

          const wo = data as any;
          const ageMs = Date.now() - new Date(wo.created_at).getTime();
          const ageDays = Math.round(ageMs / 86_400_000);
          const ageLabel = ageDays === 0 ? "today" : ageDays === 1 ? "1 day ago" : `${ageDays} days ago`;

          return ok(
            {
              work_order_number: wo.work_order_number,
              title: wo.title,
              description: wo.description,
              status: wo.status,
              priority: wo.priority,
              created_at: wo.created_at,
              completed_at: wo.completed_at,
              equipment_id: wo.equipment_id,
              assigned_to: wo.assigned_to,
              created_by: wo.created_by,
            },
            `${wo.work_order_number} is ${wo.status} at ${wo.priority} priority. Created ${ageLabel}.${wo.completed_at ? " Completed." : ""}`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 9. updateWorkOrder (enhanced)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_updateWorkOrder = {
    type: "function",
    function: {
      name: "updateWorkOrder",
      description:
        "Update the status of an existing work order. " +
        "Technicians can only update their own work orders. " +
        "Status must move forward: OPEN → IN_PROGRESS → CLOSED. " +
        "Provide a resolutionNote when closing.",
      parameters: {
        type: "object",
        properties: {
          workOrderNumber: {
            type: "string",
            description: "Work order number e.g. 'WO-2023-001'.",
          },
          status: {
            type: "string",
            enum: ["OPEN", "IN_PROGRESS", "CLOSED"],
          },
          resolutionNote: {
            type: "string",
            description: "Optional note explaining what was done. Required when closing.",
          },
        },
        required: ["workOrderNumber", "status"],
      },
      function: async (args: {
        workOrderNumber: string;
        status: "OPEN" | "IN_PROGRESS" | "CLOSED";
        resolutionNote?: string;
      }) => {
        try {
          const wo = await resolveWorkOrder(supabase, args.workOrderNumber);
          const previousStatus = wo.status;
          const res = await updateWorkOrder(supabase, user, wo.id, {
            status: args.status,
            completedAt: args.status === "CLOSED" ? new Date().toISOString() : undefined,
          });

          const updated = res.workOrder as any;
          return ok(
            {
              work_order_number: wo.work_order_number,
              previous_status: previousStatus,
              new_status: args.status,
              completed_at: updated?.completed_at ?? null,
              resolution_note: args.resolutionNote ?? null,
            },
            `Work order ${wo.work_order_number} has been marked as ${args.status}.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 10. findTechnician (new)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_findTechnician = {
    type: "function",
    function: {
      name: "findTechnician",
      description:
        "Resolve a technician's name to their system ID, and see their current open work order count. " +
        "Always call this before passing a technician to createWorkOrder or listWorkOrders when you only have a name. " +
        "Do NOT call if you already have a UUID.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Partial or full name: 'John', 'John Miller'.",
          },
        },
        required: ["name"],
      },
      function: async (args: { name: string }) => {
        try {
          const { data, error } = await db
            .from("users")
            .select("id, full_name, employee_code, role")
            .ilike("full_name", `%${args.name}%`)
            .in("role", ["TECHNICIAN", "SUPERVISOR"])
            .limit(5);

          if (error) throw new Error(error.message);
          const results = (data ?? []) as any[];
          if (results.length === 0) throw new Error(`No user found matching "${args.name}".`);

          if (results.length > 1) {
            const names = results.map((r) => `${r.full_name} (${r.employee_code})`).join(", ");
            return ok(
              { results, total_count: results.length },
              `Found ${results.length} people matching "${args.name}": ${names}. Please clarify which one.`,
            );
          }

          const tech = results[0];

          // Get open WO count
          const { count: openWOs } = await db
            .from("work_orders")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to", tech.id)
            .in("status", ["OPEN", "IN_PROGRESS"]);

          return ok(
            {
              id: tech.id,
              full_name: tech.full_name,
              employee_code: tech.employee_code,
              role: tech.role,
              open_work_orders: openWOs ?? 0,
            },
            `${tech.full_name} (${tech.employee_code}) has ${openWOs ?? 0} open work order${openWOs !== 1 ? "s" : ""}.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 11. listAlerts (new)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_listAlerts = {
    type: "function",
    function: {
      name: "listAlerts",
      description:
        "Query alerts filtered by status, severity, or equipment. " +
        "Use when the user asks about active alerts, unresolved issues, or equipment-specific alerts.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["OPEN", "ACKNOWLEDGED", "RESOLVED"] },
          severity: { type: "string", enum: ["HIGH", "CRITICAL"] },
          equipmentIdentifier: { type: "string", description: "Optional equipment filter." },
          limit: { type: "number", description: "Max results. Default 10." },
        },
        required: [],
      },
      function: async (args: {
        status?: string;
        severity?: string;
        equipmentIdentifier?: string;
        limit?: number;
      }) => {
        try {
          let equipmentId: string | undefined;
          if (args.equipmentIdentifier) {
            const eq = await resolveEquipment(supabase, args.equipmentIdentifier);
            equipmentId = eq.id;
          }

          let q = db
            .from("alerts")
            .select("id, severity, message, status, created_at, equipment_id, inspection_report_id, acknowledged_by")
            .order("created_at", { ascending: false });

          if (args.status) q = q.eq("status", args.status);
          if (args.severity) q = q.eq("severity", args.severity);
          if (equipmentId) q = q.eq("equipment_id", equipmentId);
          q = q.limit(args.limit ?? 10);

          const { data, error } = await q;
          if (error) throw new Error(error.message);

          const results = (data ?? []) as any[];
          const criticalCount = results.filter((r) => r.severity === "CRITICAL").length;
          const highCount = results.filter((r) => r.severity === "HIGH").length;

          return ok(
            { results, total_count: results.length, critical_count: criticalCount },
            results.length === 0
              ? "No alerts found matching your criteria."
              : `There are ${results.length} alert${results.length !== 1 ? "s" : ""}: ${criticalCount} CRITICAL, ${highCount} HIGH.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 12. acknowledgeAlert (new, SUPERVISOR only)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_acknowledgeAlert = {
    type: "function",
    function: {
      name: "acknowledgeAlert",
      description:
        "Allow a SUPERVISOR to acknowledge or resolve an alert. " +
        "SUPERVISOR only — technicians cannot call this tool.",
      parameters: {
        type: "object",
        properties: {
          alertId: { type: "string", description: "Alert UUID." },
          action: { type: "string", enum: ["ACKNOWLEDGE", "RESOLVE"] },
          note: { type: "string", description: "Optional note." },
        },
        required: ["alertId", "action"],
      },
      function: async (args: { alertId: string; action: "ACKNOWLEDGE" | "RESOLVE"; note?: string }) => {
        try {
          if (user.role !== "SUPERVISOR") {
            return fail("Permission denied. Only supervisors can acknowledge or resolve alerts.");
          }

          const newStatus = args.action === "ACKNOWLEDGE" ? "ACKNOWLEDGED" : "RESOLVED";

          const { data: current, error: fetchError } = await db
            .from("alerts")
            .select("id, status, severity")
            .eq("id", args.alertId)
            .maybeSingle();

          if (fetchError) throw new Error(fetchError.message);
          if (!current) throw new Error(`Alert "${args.alertId}" not found.`);

          const previousStatus = (current as any).status;

          const { data, error } = await db
            .from("alerts")
            .update({
              status: newStatus,
              acknowledged_by: user.id,
              ...(newStatus === "RESOLVED" ? { resolved_at: new Date().toISOString() } : {}),
            })
            .eq("id", args.alertId)
            .select()
            .single();

          if (error) throw new Error(error.message);

          return ok(
            {
              alert_id: args.alertId,
              previous_status: previousStatus,
              new_status: newStatus,
              timestamp: new Date().toISOString(),
            },
            `Alert has been ${newStatus.toLowerCase()}.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 13. getDashboardKPIs (new, SUPERVISOR only)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_getDashboardKPIs = {
    type: "function",
    function: {
      name: "getDashboardKPIs",
      description:
        "Return supervisor-level KPI metrics: open work orders, critical alert count, technician counts, inspections. " +
        "SUPERVISOR only. " +
        "Use when the supervisor asks for an operational overview or morning briefing.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["today", "this_week", "this_month"],
            description: "Time period for metrics. Default: today.",
          },
        },
        required: [],
      },
      function: async (args: { period?: "today" | "this_week" | "this_month" }) => {
        try {
          if (user.role !== "SUPERVISOR") {
            return fail("Permission denied. Only supervisors can access dashboard KPIs.");
          }

          const period = args.period ?? "today";
          const now = new Date();
          let fromDate: string;
          if (period === "today") {
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          } else if (period === "this_week") {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            fromDate = new Date(now.getFullYear(), now.getMonth(), diff).toISOString();
          } else {
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          }

          const [woOpen, woInProgress, criticalAlerts, openAlerts, inspectionsInPeriod, techCount] =
            await Promise.all([
              db.from("work_orders").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
              db.from("work_orders").select("id", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
              db.from("alerts").select("id", { count: "exact", head: true }).eq("severity", "CRITICAL").eq("status", "OPEN"),
              db.from("alerts").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
              db.from("inspection_reports").select("id", { count: "exact", head: true }).gte("created_at", fromDate),
              db.from("users").select("id", { count: "exact", head: true }).eq("role", "TECHNICIAN"),
            ]);

          const metrics = {
            open_work_orders: (woOpen.count ?? 0) + (woInProgress.count ?? 0),
            critical_alerts: criticalAlerts.count ?? 0,
            open_alerts: openAlerts.count ?? 0,
            inspections_in_period: inspectionsInPeriod.count ?? 0,
            total_technicians: techCount.count ?? 0,
          };

          return ok(
            metrics,
            `${period === "today" ? "Today" : period === "this_week" ? "This week" : "This month"}: ` +
              `${metrics.open_work_orders} open work orders, ${metrics.critical_alerts} critical alerts, ` +
              `${metrics.inspections_in_period} inspections.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 14. createAlert (retained, now with service-layer note)
  // ──────────────────────────────────────────────────────────────────────────
  const tool_createAlert = {
    type: "function",
    function: {
      name: "createAlert",
      description:
        "Manually create a HIGH or CRITICAL alert for equipment. " +
        "PREFER using createInspection with HIGH or CRITICAL severity — it auto-creates the alert with full traceability. " +
        "Use this only when an alert is needed without an inspection context.",
      parameters: {
        type: "object",
        properties: {
          equipmentIdentifier: { type: "string", description: "Equipment code or partial name." },
          severity: { type: "string", enum: ["HIGH", "CRITICAL"] },
          message: { type: "string", description: "Alert message." },
        },
        required: ["equipmentIdentifier", "severity", "message"],
      },
      function: async (args: {
        equipmentIdentifier: string;
        severity: "HIGH" | "CRITICAL";
        message: string;
      }) => {
        try {
          const eq = await resolveEquipment(supabase, args.equipmentIdentifier);

          const { data, error } = await db
            .from("alerts")
            .insert({
              equipment_id: eq.id,
              severity: args.severity,
              message: args.message,
              status: "OPEN",
            })
            .select()
            .single();

          if (error) throw new Error(error.message);
          const alert = data as any;

          return ok(
            { alert_id: alert?.id, equipment_code: eq.equipment_code, severity: args.severity, status: "OPEN" },
            `${args.severity} alert created for ${eq.equipment_code}.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 15. executeDatabaseQuery (hardened)
  // ──────────────────────────────────────────────────────────────────────────
  const BLOCKED_PATTERNS = [
    /\b(insert|update|delete|drop|truncate|alter|grant|revoke|commit|rollback|create|replace)\b/i,
    /information_schema/i,
    /pg_catalog/i,
    /pg_stat/i,
    /pg_sleep/i,
    /\bcopy\b/i,
    /select\s+into\b/i,
  ];

  const tool_executeDatabaseQuery = {
    type: "function",
    function: {
      name: "executeDatabaseQuery",
      description:
        "Execute a read-only SQL SELECT query for analytical questions that NO structured tool can answer. " +
        "Use ONLY as a last resort after considering: getEquipmentHistory, searchEquipment, listWorkOrders, " +
        "listInspections, listAlerts, getDashboardKPIs. " +
        "Only SELECT queries are permitted. System tables are blocked. Results are capped at 100 rows.\n" +
        "Schema:\n" +
        "- equipment: equipment_code, name, location, status, manufacturer, installation_date\n" +
        "- repair_history: equipment_id, repair_date, failure_type, description, cost, repair_duration_hours\n" +
        "- inspection_reports: equipment_id, technician_id, title, severity, status, created_at\n" +
        "- work_orders: work_order_number, equipment_id, assigned_to, created_by, title, priority, status, completed_at\n" +
        "- alerts: equipment_id, severity, message, status, created_at\n" +
        "- users: id, full_name, employee_code, role",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The SQL SELECT statement to execute.",
          },
          context: {
            type: "string",
            description: "The natural language question this query answers (for logging).",
          },
        },
        required: ["query", "context"],
      },
      function: async (args: { query: string; context: string }) => {
        try {
          // Client-side guardrails
          for (const pattern of BLOCKED_PATTERNS) {
            if (pattern.test(args.query)) {
              return fail("SECURITY ERROR: This query type is not permitted. Only read-only SELECT queries on application tables are allowed.");
            }
          }

          // Inject LIMIT if missing
          let safeQuery = args.query.trim().replace(/;$/, "");
          if (!/\blimit\b/i.test(safeQuery)) {
            safeQuery = `${safeQuery} LIMIT 100`;
          }

          const { data, error } = await (supabase as any).rpc("execute_read_only_sql", {
            query: safeQuery,
          });

          if (error) throw new Error(error.message);

          const rows = Array.isArray(data) ? data : [];
          const rowCount = rows.length;

          return ok(
            { rows, row_count: rowCount },
            rowCount === 0
              ? "The query returned no results."
              : `Query returned ${rowCount} row${rowCount !== 1 ? "s" : ""}.`,
          );
        } catch (err: any) {
          return fail(err.message);
        }
      },
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Return all tools
  // ──────────────────────────────────────────────────────────────────────────
  return [
    tool_getEquipmentHistory,
    tool_searchEquipment,
    tool_getEquipmentStatus,
    tool_createInspection,
    tool_listInspections,
    tool_createWorkOrder,
    tool_listWorkOrders,
    tool_getWorkOrder,
    tool_updateWorkOrder,
    tool_findTechnician,
    tool_listAlerts,
    tool_acknowledgeAlert,
    tool_getDashboardKPIs,
    tool_createAlert,
    tool_executeDatabaseQuery,
  ];
}
