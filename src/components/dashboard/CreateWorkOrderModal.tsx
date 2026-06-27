"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import type { Alert, Equipment, User, WorkOrderPriority } from "@/types/database";

export interface WorkOrderPrefill {
  equipmentId?: string;
  title?: string;
  description?: string;
  priority?: WorkOrderPriority;
  alertId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (workOrderNumber?: string) => void;
  equipment: Equipment[];
  technicians: User[];
  prefill?: WorkOrderPrefill;
}

export function CreateWorkOrderModal({
  open,
  onClose,
  onSuccess,
  equipment,
  technicians,
  prefill,
}: Props) {
  const activeTechnicians = technicians.filter((t) => t.is_active !== false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<WorkOrderPriority>("MEDIUM");
  const [equipmentId, setEquipmentId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [alertId, setAlertId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const active = technicians.filter((t) => t.is_active !== false);
    setTitle(prefill?.title ?? "");
    setDescription(prefill?.description ?? "");
    setPriority(prefill?.priority ?? "MEDIUM");
    setEquipmentId(prefill?.equipmentId ?? equipment[0]?.id ?? "");
    setAssignedTo(active[0]?.id ?? "");
    setAlertId(prefill?.alertId);
    setError(null);
  }, [open, prefill, equipment, technicians]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/work-orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          equipmentId,
          assignedTo: assignedTo || undefined,
          alertId: alertId ?? undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create work order");
      }

      onSuccess?.(data.data?.workOrder?.work_order_number);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create work order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 bg-[#FAF9F5] flex items-start justify-between gap-4 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Create Work Order</h3>
            {alertId && (
              <p className="text-xs text-[#D14923] font-semibold mt-1">Linked to alert — will be acknowledged on create</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 p-3 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Equipment</label>
            <select
              required
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]"
            >
              <option value="" disabled>Select equipment</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.equipment_code} — {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign to</label>
            <select
              required
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]"
            >
              <option value="" disabled>Select active technician</option>
              {activeTechnicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.full_name} ({tech.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Title</label>
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]"
              placeholder="Brief work order title"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
            <textarea
              required
              rows={4}
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923] resize-none"
              placeholder="Scope of work, safety notes, parts needed…"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as WorkOrderPriority)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || activeTechnicians.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-[#D14923] hover:bg-[#B73D1C] text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Work Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Build prefill from an alert + optional inspection context */
export function prefillFromAlert(alert: Alert, equipmentCode?: string): WorkOrderPrefill {
  const code = equipmentCode ? `${equipmentCode}: ` : "";
  return {
    equipmentId: alert.equipment_id,
    alertId: alert.id,
    title: `Address alert — ${alert.message.slice(0, 120)}`,
    description: alert.message,
    priority: alert.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
  };
}
