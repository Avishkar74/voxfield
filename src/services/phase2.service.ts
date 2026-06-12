import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

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
} from "@/lib/phase2";
import type { AuthenticatedRequestUser } from "@/lib/api/middleware";
import type {
  ActivityLog,
  Alert,
  Database,
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
  };
  workOrders: WorkOrder[];
  inspections: InspectionReport[];
  alerts: Alert[];
  transcripts: Transcript[];
  activityLogs: ActivityLog[];
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

  return {
    placeholder: data.placeholder as boolean,
    agentResponse: data.agentResponse as string,
    transcriptId: data.transcriptId as string,
    sessionId: data.sessionId as string,
  };
}

export async function processOfflineQueue(
  input: SyncOfflineQueueInput,
): Promise<OfflineSyncResult> {
  const normalized = syncOfflineQueueSchema.safeParse(input);

  if (!normalized.success) {
    throw new ValidationError(normalized.error.issues[0]?.message ?? "Invalid input");
  }

  return {
    processed: 0,
    failed: 0,
    skipped: normalized.data.items.length,
    message:
      "Offline sync is a Phase 5 placeholder. Items were accepted but not processed yet.",
  };
}

export async function getTechnicianDashboard(
  supabase: SupabaseClient<Database>,
  currentUser: AuthenticatedRequestUser,
): Promise<TechnicianDashboardResult> {
  const [workOrdersResult, inspectionsResult, transcriptsResult, logsResult] =
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
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(10),
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
  };
}

export async function getSupervisorDashboard(
  supabase: SupabaseClient<Database>,
  currentUser: AuthenticatedRequestUser,
): Promise<SupervisorDashboardResult> {
  const [workOrdersResult, inspectionsResult, alertsResult, transcriptsResult, logsResult] =
    await Promise.all([
      supabase.from("work_orders").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("inspection_reports").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("transcripts").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

  if (workOrdersResult.error) throw new ValidationError(workOrdersResult.error.message);
  if (inspectionsResult.error) throw new ValidationError(inspectionsResult.error.message);
  if (alertsResult.error) throw new ValidationError(alertsResult.error.message);
  if (transcriptsResult.error) throw new ValidationError(transcriptsResult.error.message);
  if (logsResult.error) throw new ValidationError(logsResult.error.message);

  const workOrders = workOrdersResult.data ?? [];
  const inspections = inspectionsResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const transcripts = transcriptsResult.data ?? [];
  const activityLogs = logsResult.data ?? [];

  const workOrderCounts = summarizeWorkOrders(workOrders);
  const inspectionCounts = summarizeInspections(inspections);
  const alertCounts = summarizeAlerts(alerts);

  return {
    user: currentUser,
    counts: {
      ...workOrderCounts,
      ...inspectionCounts,
      ...alertCounts,
      transcripts: transcripts.length,
      activityLogs: activityLogs.length,
    },
    workOrders,
    inspections,
    alerts,
    transcripts,
    activityLogs,
  };
}