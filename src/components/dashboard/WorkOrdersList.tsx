"use client";

import { useState } from "react";
import { ClipboardList, ChevronRight, X } from "lucide-react";
import type { WorkOrder } from "@/types/database";
import { FormattedDate } from "./FormattedDate";

export function WorkOrdersList({ workOrders }: { workOrders: WorkOrder[] }) {
  const [selected, setSelected] = useState<WorkOrder | null>(null);

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

  const priorityClass = (priority: string) =>
    priority === "CRITICAL"
      ? "bg-red-50 text-red-600 border-red-100"
      : priority === "HIGH"
      ? "bg-orange-50 text-orange-600 border-orange-100"
      : "bg-blue-50 text-blue-600 border-blue-100";

  if (!workOrders || workOrders.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 text-center">
        <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <h3 className="text-gray-900 font-bold text-sm">No Active Work Orders</h3>
        <p className="text-gray-500 text-xs mt-1">You are currently caught up with all tasks!</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#D14923]" />
          My Work Orders
        </h2>
        <span className="text-[10px] font-bold text-[#D14923] bg-[#FAF0ED] px-2.5 py-1 rounded-full border border-[#FAF0ED] uppercase tracking-wider">
          {workOrders.length} total
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {workOrders.map((wo) => (
          <button
            key={wo.id}
            type="button"
            onClick={() => setSelected(wo)}
            className="w-full text-left p-4 flex items-center justify-between hover:bg-[#FAF9F5] transition duration-200 group"
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-gray-400">
                  {wo.work_order_number}
                </span>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityClass(wo.priority)}`}>
                  {wo.priority}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mt-1 truncate group-hover:text-[#D14923] transition-colors">
                {wo.title}
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">
                Created: <FormattedDate date={wo.created_at} includeTime={false} />
              </p>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(wo.status)}`}>
                {getStatusLabel(wo.status)}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Detail summary modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setSelected(null)}>
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 bg-[#FAF9F5] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold text-gray-400">{selected.work_order_number}</p>
                <h3 className="text-lg font-extrabold text-gray-900 mt-1">{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${priorityClass(selected.priority)}`}>
                  {selected.priority} Priority
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getStatusBadge(selected.status)}`}>
                  {getStatusLabel(selected.status)}
                </span>
              </div>
              {selected.description && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Created</p>
                  <p className="text-sm font-semibold text-gray-800"><FormattedDate date={selected.created_at} includeTime /></p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-800"><FormattedDate date={selected.updated_at} includeTime /></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
