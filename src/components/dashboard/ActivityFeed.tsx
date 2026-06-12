"use client";

import { Activity, User, Mic } from "lucide-react";

import type { ActivityLog } from "@/types/database";

export function ActivityFeed({ logs }: { logs: ActivityLog[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center">
        <Activity className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <h3 className="text-gray-900 dark:text-gray-100 text-sm font-medium">No Activity Yet</h3>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-emerald-500" />
          Live Activity Feed
        </h2>
      </div>
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={log.id} className="flex gap-3 relative">
            {i !== logs.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-gray-100 dark:bg-gray-800" />
            )}
            <div className="relative z-10 w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
              {log.entity_type === "transcript" ? (
                <Mic className="w-3 h-3 text-blue-500" />
              ) : (
                <User className="w-3 h-3 text-blue-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                <span className="font-medium capitalize">{log.action_type.replace(/_/g, " ")}</span>
                <span className="text-gray-500 dark:text-gray-400"> on {log.entity_type}</span>
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
