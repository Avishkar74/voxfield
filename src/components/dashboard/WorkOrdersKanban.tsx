"use client";

import { useState } from "react";
import { ClipboardList, ChevronRight, Plus, X, AlertCircle } from "lucide-react";
import type { WorkOrder } from "@/types/database";
import { FormattedDate } from "./FormattedDate";

export function WorkOrdersKanban({ workOrders }: { workOrders: WorkOrder[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [equipmentId, setEquipmentId] = useState("33333333-3333-3333-3333-333333333331"); // Default HVAC
  const [assignedTo, setAssignedTo] = useState("11111111-1111-1111-1111-111111111111"); // Default John Doe
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-[#FAF0ED] text-[#D14923] border-[#FAF0ED]";
      case "CLOSED":
        return "bg-green-50 text-green-600 border-green-100";
      default: // OPEN
        return "bg-gray-100 text-gray-600 border-gray-100";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "IN_PROGRESS": return "In Progress";
      case "CLOSED": return "Closed";
      default: return "Open";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
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
          assignedTo
        })
      });

      if (res.status === 403 || res.status === 401) {
        // Handle explicit access control forbidden error
        throw new Error("Work Order creation is restricted to Technicians only per security policy (Access Control UC-03).");
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create work order");
      }

      setSuccessMsg("Work Order created successfully!");
      setTitle("");
      setDescription("");
      setTimeout(() => {
        setModalOpen(false);
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between h-full">
      <div>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#D14923]" />
            Active Work Orders
          </h2>
          <button className="text-[#D14923] hover:text-[#B73D1C] text-xs font-bold transition">
            View all
          </button>
        </div>

        <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
          {(!workOrders || workOrders.length === 0) ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No active work orders.
            </div>
          ) : (
            workOrders.map((wo) => (
              <div 
                key={wo.id} 
                className="p-4 flex items-center justify-between hover:bg-[#FAF9F5] transition duration-200 cursor-pointer group"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-gray-400">
                      {wo.work_order_number}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      wo.priority === "CRITICAL"
                        ? "bg-red-50 text-red-600 border-red-100"
                        : wo.priority === "HIGH"
                        ? "bg-orange-50 text-orange-600 border-orange-100"
                        : "bg-blue-50 text-blue-600 border-blue-100"
                    }`}>
                      {wo.priority}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mt-1 truncate group-hover:text-[#D14923] transition-colors">
                    {wo.title}
                  </h3>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(wo.status)}`}>
                    {getStatusLabel(wo.status)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Button and Modal section */}
      <div className="p-5 border-t border-gray-100 bg-[#FAF9F5]">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-3 bg-[#D14923] hover:bg-[#B73D1C] text-white font-bold rounded-2xl flex items-center justify-center space-x-2 transition duration-200 text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Work Order</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#1C1A17]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setModalOpen(false); setErrorMsg(null); }}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Work Order</h3>

            {errorMsg && (
              <div className="mb-4 flex items-start space-x-2 bg-red-50 border border-red-100 p-3.5 rounded-2xl text-red-600 text-xs leading-relaxed">
                <AlertCircle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-green-50 border border-green-100 p-3.5 rounded-2xl text-green-600 text-xs font-semibold">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Work Order Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Compressor unit repair"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-[#D14923] rounded-xl text-sm transition outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Detailed Description
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the details, safety checks required..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-[#D14923] rounded-xl text-sm transition outline-none font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Assigned Technician
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none"
                  >
                    <option value="11111111-1111-1111-1111-111111111111">John Doe (TECH-001)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Equipment
                </label>
                <select
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none"
                >
                  <option value="33333333-3333-3333-3333-333333333331">Rooftop HVAC Unit 01 (HVAC-R1-01)</option>
                  <option value="33333333-3333-3333-3333-333333333332">Backup Generator 500kW (GEN-B1-01)</option>
                  <option value="33333333-3333-3333-3333-333333333333">Main Water Pump (PUMP-W-01)</option>
                  <option value="33333333-3333-3333-3333-333333333334">Rooftop HVAC Unit 02 (HVAC-R1-02)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#D14923] hover:bg-[#B73D1C] text-white font-bold rounded-xl text-sm transition duration-200 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Work Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
