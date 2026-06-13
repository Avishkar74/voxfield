import { z } from "zod";
import type { RunnableToolFunction } from "openai/lib/RunnableFunction";
import {
  getEquipmentHistory,
  createInspection,
  createWorkOrder,
  updateWorkOrder,
} from "@/services/phase2.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AuthenticatedRequestUser } from "@/lib/api/middleware";

async function resolveEquipmentId(supabase: SupabaseClient<Database>, code: string): Promise<string> {
  const { data, error } = await supabase
    .from("equipment")
    .select("id")
    .ilike("equipment_code", code)
    .maybeSingle();
  if (error) throw new Error(`Database error finding equipment ${code}`);
  if (!data) throw new Error(`Equipment ${code} not found. Please provide a valid equipment code.`);
  return (data as any).id;
}

async function resolveWorkOrderId(supabase: SupabaseClient<Database>, code: string): Promise<string> {
  const { data, error } = await supabase
    .from("work_orders")
    .select("id")
    .ilike("work_order_number", code)
    .maybeSingle();
  if (error) throw new Error(`Database error finding work order ${code}`);
  if (!data) throw new Error(`Work order ${code} not found. Please provide a valid work order number.`);
  return (data as any).id;
}

export function getAgentTools(
  supabase: SupabaseClient<Database>,
  user: AuthenticatedRequestUser
): any[] {
  return [
    {
      type: "function",
      function: {
        name: "getEquipmentHistory",
        description: "Retrieve maintenance and repair history for a specific piece of equipment.",
        parameters: {
          type: "object",
          properties: {
            equipmentCode: {
              type: "string",
              description: "The equipment code or identifier (e.g., 'AC-101', 'GEN-B1-01').",
            },
            limit: {
              type: "number",
              description: "Number of historical records to return. Defaults to 5.",
            },
          },
          required: ["equipmentCode"],
        },
        function: async (args: { equipmentCode: string; limit?: number }) => {
          try {
            const equipmentId = await resolveEquipmentId(supabase, args.equipmentCode);
            const res = await getEquipmentHistory(supabase, {
              equipmentId,
              limit: args.limit || 5,
            });
            return JSON.stringify(res);
          } catch (err: any) {
            return JSON.stringify({ error: err.message });
          }
        },
      },
    },
    {
      type: "function",
      function: {
        name: "createInspection",
        description: "Create an inspection report for equipment. If severity is CRITICAL, an alert is automatically generated.",
        parameters: {
          type: "object",
          properties: {
            equipmentCode: { type: "string", description: "The equipment code (e.g., 'AC-101')." },
            title: { type: "string", description: "Short title for the inspection." },
            description: { type: "string", description: "Detailed description of findings." },
            severity: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
              description: "Severity level. CRITICAL automatically triggers an alert.",
            },
            recommendation: { type: "string", description: "Recommended next steps." },
          },
          required: ["equipmentCode", "title", "description", "severity"],
        },
        function: async (args: {
          equipmentCode: string;
          title: string;
          description: string;
          severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
          recommendation?: string;
        }) => {
          try {
            const equipmentId = await resolveEquipmentId(supabase, args.equipmentCode);
            const res = await createInspection(supabase, user, { ...args, equipmentId });
            return JSON.stringify(res);
          } catch (err: any) {
            return JSON.stringify({ error: err.message });
          }
        },
      },
    },
    {
      type: "function",
      function: {
        name: "createWorkOrder",
        description: "Create a new work order for a piece of equipment.",
        parameters: {
          type: "object",
          properties: {
            equipmentCode: { type: "string", description: "The equipment code (e.g., 'AC-101')." },
            title: { type: "string", description: "Title of the work order." },
            description: { type: "string", description: "Detailed description of the work needed." },
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            },
            assignedTo: {
              type: "string",
              description: "UUID of the technician. Optional. If omitted, assigns to the current user.",
            },
          },
          required: ["equipmentCode", "title", "description", "priority"],
        },
        function: async (args: {
          equipmentCode: string;
          title: string;
          description: string;
          priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
          assignedTo?: string;
        }) => {
          try {
            const equipmentId = await resolveEquipmentId(supabase, args.equipmentCode);
            const res = await createWorkOrder(supabase, user, { ...args, equipmentId });
            return JSON.stringify(res);
          } catch (err: any) {
            return JSON.stringify({ error: err.message });
          }
        },
      },
    },
    {
      type: "function",
      function: {
        name: "updateWorkOrder",
        description: "Update the status of an existing work order. Technicians can only update their own work orders.",
        parameters: {
          type: "object",
          properties: {
            workOrderNumber: { type: "string", description: "The work order number (e.g., 'WO-0001')." },
            status: {
              type: "string",
              enum: ["OPEN", "IN_PROGRESS", "CLOSED"],
              description: "New status. Must move forward sequentially.",
            },
          },
          required: ["workOrderNumber", "status"],
        },
        function: async (args: {
          workOrderNumber: string;
          status: "OPEN" | "IN_PROGRESS" | "CLOSED";
        }) => {
          try {
            const workOrderId = await resolveWorkOrderId(supabase, args.workOrderNumber);
            const res = await updateWorkOrder(supabase, user, workOrderId, {
              status: args.status,
              completedAt: args.status === "CLOSED" ? new Date().toISOString() : undefined,
            });
            return JSON.stringify(res);
          } catch (err: any) {
            return JSON.stringify({ error: err.message });
          }
        },
      },
    },
    {
      type: "function",
      function: {
        name: "createAlert",
        description: "Manually create a high or critical alert for an equipment. Note: It is preferred to use createInspection with CRITICAL severity which creates alerts automatically.",
        parameters: {
          type: "object",
          properties: {
            equipmentCode: { type: "string", description: "The equipment code (e.g., 'AC-101')." },
            severity: {
              type: "string",
              enum: ["HIGH", "CRITICAL"],
            },
            message: { type: "string", description: "Alert message." },
          },
          required: ["equipmentCode", "severity", "message"],
        },
        function: async (args: { equipmentCode: string; severity: "HIGH" | "CRITICAL"; message: string }) => {
          try {
            const equipmentId = await resolveEquipmentId(supabase, args.equipmentCode);
            const { data, error } = await (supabase as any).from("alerts").insert({
              equipment_id: equipmentId,
              severity: args.severity,
              message: args.message,
              source: "AGENT_MANUAL",
              status: "OPEN",
            }).select().single();
            if (error) throw new Error(error.message);
            return JSON.stringify({ alert: data });
          } catch (err: any) {
            return JSON.stringify({ error: err.message });
          }
        },
      },
    },
    {
      type: "function",
      function: {
        name: "executeDatabaseQuery",
        description: "Execute a read-only SQL SELECT query to retrieve custom data from the database. Use this tool ONLY when predefined tools (like getEquipmentHistory) are insufficient to answer the query (e.g. counts, averages, complex joins, list of all equipment). Only SELECT queries are permitted. Data modification queries are strictly blocked. Tables and columns:\n- public.users: id (uuid, primary), employee_code (varchar), full_name (varchar), email (varchar), role (user_role enum: 'TECHNICIAN', 'SUPERVISOR')\n- public.equipment: id (uuid, primary), equipment_code (varchar, unique, e.g. 'HVAC-R1-01'), name (varchar), location (varchar), manufacturer (varchar), installation_date (date), status (equipment_status enum: 'ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED')\n- public.repair_history: id (uuid, primary), equipment_id (uuid, foreign key to equipment.id), repair_date (date), failure_type (varchar), description (text), performed_by (uuid, foreign key to users.id), repair_duration_hours (decimal), cost (decimal)\n- public.inspection_reports: id (uuid, primary), equipment_id (uuid, foreign key to equipment.id), technician_id (uuid, foreign key to users.id), title (varchar), description (text), recommendation (text), severity (inspection_severity enum: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'), status (inspection_status enum: 'OPEN', 'REVIEWED', 'CLOSED')\n- public.work_orders: id (uuid, primary), work_order_number (varchar, unique, e.g. 'WO-2023-001'), equipment_id (uuid, foreign key to equipment.id), created_by (uuid, foreign key to users.id), assigned_to (uuid, foreign key to users.id), title (varchar), description (text), priority (work_order_priority enum: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'), status (work_order_status enum: 'OPEN', 'IN_PROGRESS', 'CLOSED'), completed_at (timestamptz)\n- public.alerts: id (uuid, primary), equipment_id (uuid, foreign key to equipment.id), inspection_report_id (uuid, foreign key to inspection_reports.id), severity (alert_severity enum: 'HIGH', 'CRITICAL'), message (text), status (alert_status enum: 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'), acknowledged_by (uuid, foreign key to users.id), resolved_at (timestamptz)\nUse standard SQL syntax. For text/string fields, use case-insensitive ILIKE comparisons where appropriate.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The SQL SELECT query to execute.",
            },
          },
          required: ["query"],
        },
        function: async (args: { query: string }) => {
          try {
            // Frontend validation/guardrail
            if (/insert|update|delete|drop|truncate|alter|grant|revoke|commit|rollback|create|replace/i.test(args.query)) {
              return JSON.stringify({ error: "SECURITY ERROR: Only SELECT queries are allowed." });
            }
            const { data, error } = await (supabase as any).rpc("execute_read_only_sql", { query: args.query });
            if (error) throw new Error(error.message);
            return JSON.stringify(data);
          } catch (err: any) {
            return JSON.stringify({ error: err.message });
          }
        },
      },
    },
  ];
}
