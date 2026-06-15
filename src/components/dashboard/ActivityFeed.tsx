"use client";

import { Activity, Mic, Wrench, FileSearch, ChevronRight } from "lucide-react";
import type { ActivityLog } from "@/types/database";
import { FormattedDate } from "./FormattedDate";

export function ActivityFeed({ logs }: { logs: ActivityLog[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 text-center">
        <Activity className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <h3 className="text-gray-900 font-bold text-sm">No Recent Activity</h3>
        <p className="text-gray-500 text-xs mt-1">Activities will appear here as you perform tasks.</p>
      </div>
    );
  }

  const formatActivityMessage = (log: ActivityLog) => {
    const action = log.action_type.toLowerCase();
    const entity = log.entity_type.toLowerCase();
    
    if (entity === "work_order") {
      if (action === "create") return "Created work order";
      if (action === "update") return "Updated status for work order";
      return "Modified work order";
    }
    if (entity === "inspection_report") {
      return "Inspection completed";
    }
    if (entity === "transcript") {
      return "Voice query processed";
    }
    if (entity === "alert") {
      if (action === "update") return "Alert status acknowledged/resolved";
      return "System alert raised";
    }
    return `${log.action_type.replace(/_/g, " ")} on ${log.entity_type.replace(/_/g, " ")}`;
  };

  const getActivityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "work_order":
        return <Wrench className="w-4 h-4 text-[#D14923]" />;
      case "inspection_report":
        return <FileSearch className="w-4 h-4 text-[#D14923]" />;
      case "transcript":
        return <Mic className="w-4 h-4 text-[#D14923]" />;
      default:
        return <Activity className="w-4 h-4 text-[#D14923]" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#D14923]" />
          Recent Activity
        </h2>
        <button className="text-[#D14923] hover:text-[#B73D1C] text-xs font-bold transition">
          View all
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {logs.map((log) => (
          <div 
            key={log.id} 
            className="p-4 flex items-center justify-between hover:bg-[#FAF9F5] transition duration-200 cursor-pointer group"
          >
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              {/* Left Round Icon Wrapper */}
              <div className="w-9 h-9 rounded-full bg-[#FAF0ED] flex items-center justify-center flex-shrink-0">
                {getActivityIcon(log.entity_type)}
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#D14923] transition-colors">
                  {formatActivityMessage(log)}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  <FormattedDate date={log.created_at} includeTime={true} />
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
              {log.action_type.toLowerCase() === "update" && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                  Completed
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
