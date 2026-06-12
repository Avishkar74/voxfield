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
            equipmentId: {
              type: "string",
              description: "The UUID of the equipment.",
            },
            limit: {
              type: "number",
              description: "Number of historical records to return. Defaults to 5.",
            },
          },
          required: ["equipmentId"],
        },
        function: async (args: { equipmentId: string; limit?: number }) => {
          try {
            const res = await getEquipmentHistory(supabase, {
              equipmentId: args.equipmentId,
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
            equipmentId: { type: "string", description: "The UUID of the equipment." },
            title: { type: "string", description: "Short title for the inspection." },
            description: { type: "string", description: "Detailed description of findings." },
            severity: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
              description: "Severity level. CRITICAL automatically triggers an alert.",
            },
            recommendation: { type: "string", description: "Recommended next steps." },
          },
          required: ["equipmentId", "title", "description", "severity"],
        },
        function: async (args: {
          equipmentId: string;
          title: string;
          description: string;
          severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
          recommendation?: string;
        }) => {
          try {
            const res = await createInspection(supabase, user, args);
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
            equipmentId: { type: "string", description: "The UUID of the equipment." },
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
          required: ["equipmentId", "title", "description", "priority"],
        },
        function: async (args: {
          equipmentId: string;
          title: string;
          description: string;
          priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
          assignedTo?: string;
        }) => {
          try {
            const res = await createWorkOrder(supabase, user, args);
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
            workOrderId: { type: "string", description: "UUID of the work order to update." },
            status: {
              type: "string",
              enum: ["OPEN", "IN_PROGRESS", "CLOSED"],
              description: "New status. Must move forward sequentially.",
            },
          },
          required: ["workOrderId", "status"],
        },
        function: async (args: {
          workOrderId: string;
          status: "OPEN" | "IN_PROGRESS" | "CLOSED";
        }) => {
          try {
            const res = await updateWorkOrder(supabase, user, args.workOrderId, {
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
            equipmentId: { type: "string", description: "The UUID of the equipment." },
            severity: {
              type: "string",
              enum: ["HIGH", "CRITICAL"],
            },
            message: { type: "string", description: "Alert message." },
          },
          required: ["equipmentId", "severity", "message"],
        },
        function: async (args: { equipmentId: string; severity: "HIGH" | "CRITICAL"; message: string }) => {
          try {
            const { data, error } = await (supabase as any).from("alerts").insert({
              equipment_id: args.equipmentId,
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
  ];
}
