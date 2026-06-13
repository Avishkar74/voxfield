"use client";

import { FileSearch, AlertTriangle } from "lucide-react";

interface Inspection {
  id: string;
  equipment_id: string;
  title: string;
  severity: string;
  created_at: string;
}

import { FormattedDate } from "./FormattedDate";

export function InspectionsList({ inspections }: { inspections: Inspection[] }) {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "bg-red-500 text-white";
      case "HIGH": return "bg-orange-500 text-white";
      case "MEDIUM": return "bg-yellow-400 text-yellow-900";
      default: return "bg-green-500 text-white";
    }
  };

  if (!inspections || inspections.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center">
        <FileSearch className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <h3 className="text-gray-900 dark:text-gray-100 text-sm font-medium">No Recent Inspections</h3>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
          <FileSearch className="w-4 h-4 text-purple-500" />
          Recent Inspections
        </h2>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/50 max-h-64 overflow-y-auto">
        {inspections.map((ins) => (
          <div key={ins.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                {ins.title}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                <FormattedDate date={ins.created_at} includeTime={false} />
              </p>
            </div>
            <div className="flex items-center gap-2">
              {ins.severity === "CRITICAL" && <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSeverityBadge(ins.severity)}`}>
                {ins.severity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
