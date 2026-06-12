import { z } from "zod";

export const inspectionSeveritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const workOrderPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const workOrderStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "CLOSED",
]);

export const voiceQuerySchema = z.object({
  userPrompt: z
    .string()
    .min(1, "Voice query text is required")
    .max(4000, "Voice query text must be at most 4000 characters"),
  sessionId: z
    .string()
    .min(1, "Session ID must not be empty")
    .max(100, "Session ID must be at most 100 characters")
    .optional(),
  toolsUsed: z
    .array(z.string().min(1).max(100))
    .max(20, "At most 20 tools can be attached")
    .optional(),
});

export const createInspectionSchema = z.object({
  equipmentId: z.string().uuid("Equipment ID must be a valid UUID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(4000, "Description must be at most 4000 characters"),
  recommendation: z
    .string()
    .max(4000, "Recommendation must be at most 4000 characters")
    .nullable()
    .optional(),
  severity: inspectionSeveritySchema,
});

export const createWorkOrderSchema = z.object({
  equipmentId: z.string().uuid("Equipment ID must be a valid UUID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(4000, "Description must be at most 4000 characters"),
  priority: workOrderPrioritySchema,
  assignedTo: z
    .string()
    .uuid("Assigned technician must be a valid UUID")
    .nullable()
    .optional(),
});

export const updateWorkOrderSchema = z
  .object({
    status: workOrderStatusSchema.optional(),
    completedAt: z
      .string()
      .datetime("completedAt must be an ISO-8601 timestamp")
      .nullable()
      .optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.completedAt !== undefined,
    {
      message: "Provide at least one work order field to update",
    },
  );

export const equipmentHistoryQuerySchema = z.object({
  equipmentId: z.string().uuid("Equipment ID must be a valid UUID"),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must be at most 100")
    .default(20),
});

export const syncOfflineQueueSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        operation: z.string().min(1).max(100),
        payload: z.record(z.string(), z.unknown()).optional(),
        queuedAt: z.string().datetime().optional(),
      }),
    )
    .max(10, "At most 10 queued items can be synced at once")
    .default([]),
});

export const workOrderStatusOrder: Record<string, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  CLOSED: 2,
};

export function canAdvanceWorkOrderStatus(
  currentStatus: "OPEN" | "IN_PROGRESS" | "CLOSED",
  nextStatus: "OPEN" | "IN_PROGRESS" | "CLOSED",
): boolean {
  return workOrderStatusOrder[nextStatus] >= workOrderStatusOrder[currentStatus];
}

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type VoiceQueryInput = z.infer<typeof voiceQuerySchema>;
export type EquipmentHistoryInput = z.infer<typeof equipmentHistoryQuerySchema>;
export type SyncOfflineQueueInput = z.infer<typeof syncOfflineQueueSchema>;