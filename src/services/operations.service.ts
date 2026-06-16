import { randomUUID } from "node:crypto";
import { processVoiceQuery } from "@/lib/agent";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  canAdvanceWorkOrderStatus,
  createInspectionSchema,
  createWorkOrderSchema,
  equipmentHistoryQuerySchema,
  syncOfflineQueueSchema,
  updateWorkOrderSchema,
  voiceQuerySchema,
  type CreateInspectionInput,
  type CreateWorkOrderInput,
  type EquipmentHistoryInput,
  type SyncOfflineQueueInput,
  type UpdateWorkOrderInput,
  type VoiceQueryInput,
} from "@/lib/operations.validation";
import type { AuthenticatedRequestUser } from "@/lib/api/middleware";
import type {
  ActivityLog,
  Alert,
  Database,
  Equipment,
  InspectionReport,
  RepairHistory,
  Transcript,
  User,
  WorkOrder,
} from "@/types/database";

export interface EquipmentHistoryResult {
  equipmentId: string;
  count: number;
  items: RepairHistory[];
}

export interface CreateInspectionResult {
  inspection: InspectionReport;
  alertCreated: boolean;
}

export interface CreateWorkOrderResult {
  workOrder: WorkOrder;
}

export interface UpdateWorkOrderResult {
  workOrder: WorkOrder;
  previousStatus: WorkOrder["status"];
}

export interface VoiceQueryResult {
  placeholder: boolean;
  agentResponse: string;
  transcriptId: string | null;
  sessionId: string | null;
}

export interface OfflineSyncResult {
  processed: number;
  failed: number;
  skipped: number;
  message: string;
}

export interface EquipmentSuggestion {
  text: string;
  category: "repair_history" | "work_order" | "inspection";
}

export interface TechnicianDashboardResult {
  user: AuthenticatedRequestUser;
  counts: {
    workOrders: number;
    openWorkOrders: number;
    inProgressWorkOrders: number;
    closedWorkOrders: number;
    inspections: number;
    transcripts: number;
    activityLogs: number;
  };
  workOrders: WorkOrder[];
  inspections: InspectionReport[];
  transcripts: Transcript[];
  activityLogs: ActivityLog[];
  /** Contextual AI suggestions generated from real DB relationships */
  equipmentSuggestions: EquipmentSuggestion[];
}

export interface SupervisorDashboardResult {
  user: AuthenticatedRequestUser;
  counts: {
    workOrders: number;
    openWorkOrders: number;
    inProgressWorkOrders: number;
    closedWorkOrders: number;
    inspections: number;
    lowInspections: number;
    mediumInspections: number;
    highInspections: number;
    criticalInspections: number;
    alerts: number;
    openAlerts: number;
    acknowledgedAlerts: number;
    resolvedAlerts: number;
    transcripts: number;
    activityLogs: number;
    activeTechnicians: number;
  };
  workOrders: WorkOrder[];
  inspections: InspectionReport[];
  alerts: Alert[];
  transcripts: Transcript[];
  activityLogs: ActivityLog[];
  technicians: User[];
  equipment: Equipment[];
  repairHistory: RepairHistory[];
}

const VOICE_PLACEHOLDER_RESPONSE =
  "Voice agent is not available yet. Your request was recorded and will be handled once Phase 3 is enabled.";

async function assertUserExists(
  adminClient: SupabaseClient<Database>,
  userId: string,
): Promise<User> {
  const { data, error } = await adminClient
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new ValidationError(error.message);
  }

  if (!data) {
    throw new NotFoundError("Assigned user not found");
  }

  return data;
}

function summarizeWorkOrders(workOrders: WorkOrder[]) {
  return workOrders.reduce(
    (counts, workOrder) => {
      counts.workOrders += 1;

      switch (workOrder.status) {
        case "OPEN":
          counts.openWorkOrders += 1;
          break;
        case "IN_PROGRESS":
          counts.inProgressWorkOrders += 1;
          break;
        case "CLOSED":
          counts.closedWorkOrders += 1;
          break;
      }

      return counts;
    },
    {
      workOrders: 0,
      openWorkOrders: 0,
      inProgressWorkOrders: 0,
      closedWorkOrders: 0,
    },
  );
}

function summarizeInspections(inspections: InspectionReport[]) {
  return inspections.reduce(
    (counts, inspection) => {
      counts.inspections += 1;

      switch (inspection.severity) {
        case "LOW":
          counts.lowInspections += 1;
          break;
        case "MEDIUM":
          counts.mediumInspections += 1;
          break;
        case "HIGH":
          counts.highInspections += 1;
          break;
        case "CRITICAL":
          counts.criticalInspections += 1;
          break;
      }

      return counts;
    },
    {
      inspections: 0,
      lowInspections: 0,
      mediumInspections: 0,
      highInspections: 0,
      criticalInspections: 0,
    },
  );
}

function summarizeAlerts(alerts: Alert[]) {
  return alerts.reduce(
    (counts, alert) => {
      counts.alerts += 1;

      switch (alert.status) {
        case "OPEN":
          counts.openAlerts += 1;
          break;
        case "ACKNOWLEDGED":
          counts.acknowledgedAlerts += 1;
          break;
        case "RESOLVED":
          counts.resolvedAlerts += 1;
          break;
      }

      return counts;
    },
    {
      alerts: 0,
      openAlerts: 0,
      acknowledgedAlerts: 0,
      resolvedAlerts: 0,
    },
  );
}

export async function getEquipmentHistory(
  supabase: SupabaseClient<Database>,
  input: EquipmentHistoryInput,
): Promise<EquipmentHistoryResult> {
  const parsed = equipmentHistoryQuerySchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid equipment history input",
    );
  }

  const { data, error } = await supabase
    .from("repair_history")
    .select("*")
    .eq("equipment_id", parsed.data.equipmentId)
    .order("repair_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit);

  if (error) {
    throw new ValidationError(error.message);
  }

  return {
    equipmentId: parsed.data.equipmentId,
    count: data?.length ?? 0,
    items: data ?? [],
  };
}

export async function createInspection(
  adminClient: SupabaseClient<Database>,
  currentUser: AuthenticatedRequestUser,
  input: CreateInspectionInput,
): Promise<CreateInspectionResult> {
  const parsed = createInspectionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  if (currentUser.role !== "TECHNICIAN") {
    throw new ForbiddenError("Only technicians can create inspections");
  }

  const { data, error } = await (adminClient as any).rpc('create_inspection_tx', {
    p_equipment_id: parsed.data.equipmentId,
    p_technician_id: currentUser.id,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_severity: parsed.data.severity,
    p_recommendation: parsed.data.recommendation ?? null,
  });

  if (error || !data) {
    throw new ValidationError(error?.message ?? "Unable to create inspection");
  }

  return {
    inspection: data.inspection as InspectionReport,
    alertCreated: data.alertCreated as boolean,
  };
}

export async function createWorkOrder(
  adminClient: SupabaseClient<Database>,
  currentUser: AuthenticatedRequestUser,
  input: CreateWorkOrderInput,
): Promise<CreateWorkOrderResult> {
  const parsed = createWorkOrderSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  if (currentUser.role !== "TECHNICIAN") {
    throw new ForbiddenError("Only technicians can create work orders");
  }

  const assignedTo = parsed.data.assignedTo ?? currentUser.id;
  await assertUserExists(adminClient, assignedTo);

  const { data, error } = await (adminClient as any).rpc('create_work_order_tx', {
    p_equipment_id: parsed.data.equipmentId,
    p_created_by: currentUser.id,
    p_assigned_to: assignedTo,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_priority: parsed.data.priority,
  });

  if (error || !data) {
    throw new ValidationError(error?.message ?? "Unable to create work order");
  }

  return { workOrder: data.workOrder as WorkOrder };
}

export async function updateWorkOrder(
  adminClient: SupabaseClient<Database>,
  currentUser: AuthenticatedRequestUser,
  workOrderId: string,
  input: UpdateWorkOrderInput,
): Promise<UpdateWorkOrderResult> {
  const normalized = updateWorkOrderSchema.safeParse(input);

  if (!normalized.success) {
    throw new ValidationError(
      normalized.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const { data: currentWorkOrderData, error: currentError } = await adminClient
    .from("work_orders")
    .select("*")
    .eq("id", workOrderId)
    .maybeSingle();

  const currentWorkOrder = currentWorkOrderData as WorkOrder | null;

  if (currentError) {
    throw new ValidationError(currentError.message);
  }

  if (!currentWorkOrder) {
    throw new NotFoundError("Work order not found");
  }

  if (
    currentUser.role === "TECHNICIAN" &&
    currentWorkOrder.created_by !== currentUser.id
  ) {
    throw new ForbiddenError("You can only update your own work orders");
  }

  const nextStatus = normalized.data.status ?? currentWorkOrder.status;

  if (
    nextStatus !== currentWorkOrder.status &&
    !canAdvanceWorkOrderStatus(currentWorkOrder.status, nextStatus)
  ) {
    throw new ValidationError("Work order status can only move forward");
  }

  const nextCompletedAt =
    nextStatus === "CLOSED"
      ? normalized.data.completedAt ?? currentWorkOrder.completed_at ?? new Date().toISOString()
      : null;

  if (nextStatus !== "CLOSED" && normalized.data.completedAt !== undefined) {
    throw new ValidationError(
      "completedAt can only be set when closing a work order",
    );
  }

  const { data, error: updateError } = await (adminClient as any).rpc('update_work_order_tx', {
    p_work_order_id: workOrderId,
    p_user_id: currentUser.id,
    p_next_status: nextStatus,
    p_completed_at: nextCompletedAt,
    p_current_status: currentWorkOrder.status,
  });

  if (updateError || !data) {
    throw new ValidationError(updateError?.message ?? "Unable to update work order");
  }

  return {
    workOrder: data.workOrder as WorkOrder,
    previousStatus: data.previousStatus as WorkOrder["status"],
  };
}

export async function createVoiceTranscript(
  adminClient: SupabaseClient<Database>,
  currentUser: AuthenticatedRequestUser,
  input: VoiceQueryInput,
): Promise<VoiceQueryResult> {
  const normalized = voiceQuerySchema.safeParse(input);

  if (!normalized.success) {
    throw new ValidationError(normalized.error.issues[0]?.message ?? "Invalid input");
  }

  const sessionId = normalized.data.sessionId ?? randomUUID();

  const { data, error } = await (adminClient as any).rpc('create_voice_transcript_tx', {
    p_user_id: currentUser.id,
    p_user_prompt: normalized.data.userPrompt,
    p_session_id: sessionId,
    p_tools_used: normalized.data.toolsUsed ?? null,
  });

  if (error || !data) {
    throw new ValidationError(error?.message ?? "Unable to save transcript");
  }

  const transcriptId = data.transcriptId as string;
  const agentResponse = normalized.data.agentResponse;

  if (agentResponse && transcriptId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const realAdminClient = createAdminClient();
      await (realAdminClient.from("transcripts") as any)
        .update({
          agent_response: agentResponse,
          tools_used: normalized.data.toolsUsed ?? null,
        })
        .eq("id", transcriptId);

      await (realAdminClient.from("activity_logs") as any)
        .update({
          description: `Voice Query: "${normalized.data.userPrompt.slice(0, 60)}${normalized.data.userPrompt.length > 60 ? "..." : ""}"`,
        })
        .eq("entity_id", transcriptId)
        .eq("action_type", "VOICE_QUERY");
    } catch (updateError) {
      console.warn("Failed to update voice transcript placeholder with real agent response:", updateError);
    }
  }

  return {
    placeholder: !agentResponse,
    agentResponse: agentResponse ?? (data.agentResponse as string),
    transcriptId,
    sessionId: data.sessionId as string,
  };
}

export async function processOfflineQueue(
  supabase: SupabaseClient<Database>,
  currentUser: AuthenticatedRequestUser,
  input: SyncOfflineQueueInput,
): Promise<OfflineSyncResult> {
  const normalized = syncOfflineQueueSchema.safeParse(input);

  if (!normalized.success) {
    throw new ValidationError(normalized.error.issues[0]?.message ?? "Invalid input");
  }

  let processed = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of normalized.data.items) {
    try {
      const payload = item.payload || {};

      switch (item.operation) {
        case "create-inspection": {
          await createInspection(supabase, currentUser, payload as CreateInspectionInput);
          processed++;
          break;
        }
        case "create-work-order": {
          await createWorkOrder(supabase, currentUser, payload as CreateWorkOrderInput);
          processed++;
          break;
        }
        case "update-work-order": {
          const { workOrderId, ...inputPayload } = payload as any;
          if (!workOrderId) {
            throw new ValidationError("Missing workOrderId in update payload");
          }
          await updateWorkOrder(supabase, currentUser, workOrderId, inputPayload as UpdateWorkOrderInput);
          processed++;
          break;
        }
        case "voice-query": {
          if (!payload.userPrompt) {
            throw new ValidationError("Missing userPrompt in voice-query payload");
          }
          await processVoiceQuery(supabase, currentUser, payload.userPrompt as string, payload.sessionId as string);
          processed++;
          break;
        }
        default:
          skipped++;
          errors.push(`Unknown operation: ${item.operation}`);
      }
    } catch (err: any) {
      failed++;
      errors.push(`Failed item ${item.id} (${item.operation}): ${err.message || err}`);
    }
  }

  return {
    processed,
    failed,
    skipped,
    message: errors.length > 0 ? `Completed with errors: ${errors.join("; ")}` : "Sync completed successfully",
  };
}

/**
 * Generate contextual AI voice suggestions based on actual DB relationships.
 * Only generates suggestions for equipment that has related records —
 * never generates suggestions for entities that have no data.
 */
async function generateEquipmentSuggestions(
  supabase: SupabaseClient<Database>,
  technicianId: string,
): Promise<EquipmentSuggestion[]> {
  const suggestions: EquipmentSuggestion[] = [];

  // Fetch equipment IDs linked to this technician's work orders and inspections
  const [woResult, inspResult, repairResult] = await Promise.all([
    supabase
      .from("work_orders")
      .select("equipment_id, status")
      .or(`created_by.eq.${technicianId},assigned_to.eq.${technicianId}`)
      .in("status", ["OPEN", "IN_PROGRESS"])
      .limit(5),
    supabase
      .from("inspection_reports")
      .select("equipment_id, status")
      .eq("technician_id", technicianId)
      .in("status", ["OPEN", "REVIEWED"])
      .limit(5),
    supabase
      .from("repair_history")
      .select("equipment_id")
      .limit(5),
  ]);

  // Collect unique equipment IDs from work orders and inspections
  const woEquipIds = [...new Set((woResult.data as Array<{ equipment_id: string; status: string }> ?? []).map((r) => r.equipment_id).filter(Boolean))];
  const inspEquipIds = [...new Set((inspResult.data as Array<{ equipment_id: string; status: string }> ?? []).map((r) => r.equipment_id).filter(Boolean))];
  const repairEquipIds = [...new Set((repairResult.data as Array<{ equipment_id: string }> ?? []).map((r) => r.equipment_id).filter(Boolean))];

  const allEquipIds = [...new Set([...woEquipIds, ...inspEquipIds, ...repairEquipIds])];

  if (allEquipIds.length === 0) {
    return suggestions; // No data — return empty, no fake suggestions
  }

  // Fetch equipment codes for the collected IDs
  const { data: equipmentData } = await supabase
    .from("equipment")
    .select("id, equipment_code")
    .in("id", allEquipIds)
    .limit(6);

  const equipMap = new Map((equipmentData as Array<{ id: string; equipment_code: string }> ?? []).map((e) => [e.id, e.equipment_code]));

  // Generate suggestions only for entities with actual related records
  // Priority 1: Open/in-progress work orders (most urgent)
  for (const equipId of woEquipIds.slice(0, 2)) {
    const code = equipMap.get(equipId);
    if (code) {
      suggestions.push({
        text: `Show open work orders for ${code}`,
        category: "work_order",
      });
    }
  }

  // Priority 2: Open inspection reports
  for (const equipId of inspEquipIds.slice(0, 1)) {
    const code = equipMap.get(equipId);
    if (code) {
      suggestions.push({
        text: `What inspections are pending on ${code}?`,
        category: "inspection",
      });
    }
  }

  // Priority 3: Equipment with repair history
  for (const equipId of repairEquipIds.slice(0, 2)) {
    const code = equipMap.get(equipId);
    if (code && !woEquipIds.includes(equipId) && !inspEquipIds.includes(equipId)) {
      suggestions.push({
        text: `Show repair history of ${code}`,
        category: "repair_history",
      });
    }
  }

  // Cap at 4 suggestions
  return suggestions.slice(0, 4);
}

export async function getTechnicianDashboard(
  supabase: SupabaseClient<Database>,
  currentUser: AuthenticatedRequestUser,
): Promise<TechnicianDashboardResult> {
  const [workOrdersResult, inspectionsResult, transcriptsResult, logsResult, equipmentSuggestions] =
    await Promise.all([
      supabase
        .from("work_orders")
        .select("*")
        .or(`created_by.eq.${currentUser.id},assigned_to.eq.${currentUser.id}`)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("inspection_reports")
        .select("*")
        .eq("technician_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("transcripts")
        .select("*")
        .eq("user_id", currentUser.id)
        .neq("agent_response", "Voice agent is not available yet. Your request was recorded and will be handled once Phase 3 is enabled.")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", currentUser.id)
        .neq("description", "Stored a placeholder voice query response")
        .order("created_at", { ascending: false })
        .limit(15),
      generateEquipmentSuggestions(supabase, currentUser.id),
    ]);

  if (workOrdersResult.error) throw new ValidationError(workOrdersResult.error.message);
  if (inspectionsResult.error) throw new ValidationError(inspectionsResult.error.message);
  if (transcriptsResult.error) throw new ValidationError(transcriptsResult.error.message);
  if (logsResult.error) throw new ValidationError(logsResult.error.message);

  const workOrders = workOrdersResult.data ?? [];
  const inspections = inspectionsResult.data ?? [];
  const transcripts = transcriptsResult.data ?? [];
  const activityLogs = logsResult.data ?? [];

  const workOrderCounts = summarizeWorkOrders(workOrders);

  return {
    user: currentUser,
    counts: {
      ...workOrderCounts,
      inspections: inspections.length,
      transcripts: transcripts.length,
      activityLogs: activityLogs.length,
    },
    workOrders,
    inspections,
    transcripts,
    activityLogs,
    equipmentSuggestions,
  };
}

export async function getSupervisorDashboard(
  supabase: SupabaseClient<Database>,
  currentUser: AuthenticatedRequestUser,
): Promise<SupervisorDashboardResult> {
  const [
    workOrdersResult,
    inspectionsResult,
    alertsResult,
    transcriptsResult,
    logsResult,
    usersResult,
    equipmentResult,
    repairHistoryResult,
  ] = await Promise.all([
    supabase.from("work_orders").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("inspection_reports").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(100),
    supabase
      .from("transcripts")
      .select("*")
      .neq(
        "agent_response",
        "Voice agent is not available yet. Your request was recorded and will be handled once Phase 3 is enabled."
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("activity_logs")
      .select("*")
      .neq("description", "Stored a placeholder voice query response")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("users").select("*").eq("role", "TECHNICIAN"),
    supabase.from("equipment").select("*").limit(100),
    supabase.from("repair_history").select("*").order("repair_date", { ascending: false }).limit(100),
  ]);

  if (workOrdersResult.error) throw new ValidationError(workOrdersResult.error.message);
  if (inspectionsResult.error) throw new ValidationError(inspectionsResult.error.message);
  if (alertsResult.error) throw new ValidationError(alertsResult.error.message);
  if (transcriptsResult.error) throw new ValidationError(transcriptsResult.error.message);
  if (logsResult.error) throw new ValidationError(logsResult.error.message);
  if (usersResult.error) throw new ValidationError(usersResult.error.message);
  if (equipmentResult.error) throw new ValidationError(equipmentResult.error.message);
  if (repairHistoryResult.error) throw new ValidationError(repairHistoryResult.error.message);

  const workOrders: WorkOrder[] = (workOrdersResult.data as WorkOrder[]) ?? [];
  const inspections: InspectionReport[] = (inspectionsResult.data as InspectionReport[]) ?? [];
  const alerts: Alert[] = (alertsResult.data as Alert[]) ?? [];
  const transcripts: Transcript[] = (transcriptsResult.data as Transcript[]) ?? [];
  const activityLogs: ActivityLog[] = (logsResult.data as ActivityLog[]) ?? [];
  const technicians: User[] = (usersResult.data as User[]) ?? [];
  const equipment: Equipment[] = (equipmentResult.data as Equipment[]) ?? [];
  const repairHistory: RepairHistory[] = (repairHistoryResult.data as RepairHistory[]) ?? [];

  const workOrderCounts = summarizeWorkOrders(workOrders);
  const inspectionCounts = summarizeInspections(inspections);
  const alertCounts = summarizeAlerts(alerts);

  // A technician is active if they have activity logs or transcripts in the last 7 days.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeTechIds = new Set<string>();
  activityLogs.forEach((log) => {
    if (new Date(log.created_at) >= sevenDaysAgo) {
      activeTechIds.add(log.user_id);
    }
  });
  transcripts.forEach((t) => {
    if (new Date(t.created_at) >= sevenDaysAgo) {
      activeTechIds.add(t.user_id);
    }
  });

  const activeTechs = technicians.filter((tech) => activeTechIds.has(tech.id));
  // Fallback to total technicians with ANY activity if 7-day count is 0, to avoid showing 0 on older databases.
  let activeTechniciansCount = activeTechs.length;
  if (activeTechniciansCount === 0 && technicians.length > 0) {
    const allActivityUserIds = new Set([
      ...activityLogs.map((l) => l.user_id),
      ...transcripts.map((t) => t.user_id),
    ]);
    const techniciansWithActivity = technicians.filter((tech) => allActivityUserIds.has(tech.id));
    activeTechniciansCount =
      techniciansWithActivity.length > 0 ? techniciansWithActivity.length : technicians.length;
  }

  return {
    user: currentUser,
    counts: {
      ...workOrderCounts,
      ...inspectionCounts,
      ...alertCounts,
      transcripts: transcripts.length,
      activityLogs: activityLogs.length,
      activeTechnicians: activeTechniciansCount,
    },
    workOrders,
    inspections,
    alerts,
    transcripts,
    activityLogs,
    technicians,
    equipment,
    repairHistory,
  };
}
