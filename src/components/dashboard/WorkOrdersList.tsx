"use client";

import { ClipboardList, ChevronRight } from "lucide-react";
import type { WorkOrder } from "@/types/database";
import { FormattedDate } from "./FormattedDate";

export function WorkOrdersList({ workOrders }: { workOrders: WorkOrder[] }) {
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
        <button className="text-[#D14923] hover:text-[#B73D1C] text-xs font-bold transition">
          View all
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {workOrders.map((wo) => (
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
              <p className="text-[10px] text-gray-400 mt-1">
                Assigned: <FormattedDate date={wo.created_at} includeTime={false} />
              </p>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(wo.status)}`}>
                {getStatusLabel(wo.status)}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
