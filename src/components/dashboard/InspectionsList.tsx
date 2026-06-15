"use client";

import { FileSearch, ChevronRight, AlertTriangle } from "lucide-react";
import { FormattedDate } from "./FormattedDate";

interface Inspection {
  id: string;
  equipment_id: string;
  title: string;
  severity: string;
  created_at: string;
}

export function InspectionsList({ inspections }: { inspections: Inspection[] }) {
  if (!inspections || inspections.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 text-center">
        <FileSearch className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <h3 className="text-gray-900 font-bold text-sm">No Inspections Recorded</h3>
        <p className="text-gray-500 text-xs mt-1">Submit your first inspection report using the voice assistant.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-[#D14923]" />
          Inspections Recorded
        </h2>
        <button className="text-[#D14923] hover:text-[#B73D1C] text-xs font-bold transition">
          View all
        </button>
      </div>
      
      <div className="divide-y divide-gray-100">
        {inspections.map((ins) => (
          <div 
            key={ins.id} 
            className="p-4 flex items-center justify-between hover:bg-[#FAF9F5] transition duration-200 cursor-pointer group"
          >
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#D14923] transition-colors">
                {ins.title}
              </h3>
              <p className="text-xs text-gray-400 mt-1 flex items-center space-x-1.5">
                <span>Created:</span>
                <span className="font-medium text-gray-500">
                  <FormattedDate date={ins.created_at} includeTime={false} />
                </span>
              </p>
            </div>
            
            <div className="flex items-center space-x-3 flex-shrink-0">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                ins.severity === "CRITICAL"
                  ? "bg-red-50 text-red-600 border-red-100"
                  : ins.severity === "HIGH"
                  ? "bg-orange-50 text-orange-600 border-orange-100"
                  : ins.severity === "MEDIUM"
                  ? "bg-yellow-50 text-yellow-600 border-yellow-100"
                  : "bg-green-50 text-green-600 border-green-100"
              }`}>
                {ins.severity}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
