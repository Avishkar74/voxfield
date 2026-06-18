"use client";

import { useState } from "react";
import { FileSearch, ChevronRight, X } from "lucide-react";
import { FormattedDate } from "./FormattedDate";

interface Inspection {
  id: string;
  equipment_id: string;
  title: string;
  severity: string;
  created_at: string;
  description?: string;
  recommendation?: string;
  status?: string;
  updated_at?: string;
}

const severityClass = (severity: string) =>
  severity === "CRITICAL"
    ? "bg-red-50 text-red-600 border-red-100"
    : severity === "HIGH"
    ? "bg-orange-50 text-orange-600 border-orange-100"
    : severity === "MEDIUM"
    ? "bg-yellow-50 text-yellow-600 border-yellow-100"
    : "bg-green-50 text-green-600 border-green-100";

export function InspectionsList({ inspections }: { inspections: Inspection[] }) {
  const [selected, setSelected] = useState<Inspection | null>(null);

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
        <span className="text-[10px] font-bold text-[#D14923] bg-[#FAF0ED] px-2.5 py-1 rounded-full border border-[#FAF0ED] uppercase tracking-wider">
          {inspections.length} total
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {inspections.map((ins) => (
          <button
            key={ins.id}
            type="button"
            onClick={() => setSelected(ins)}
            className="w-full text-left p-4 flex items-center justify-between hover:bg-[#FAF9F5] transition duration-200 group"
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
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${severityClass(ins.severity)}`}>
                {ins.severity}
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
              <h3 className="text-lg font-extrabold text-gray-900">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${severityClass(selected.severity)}`}>
                  {selected.severity} Severity
                </span>
                {selected.status && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                    {selected.status}
                  </span>
                )}
              </div>
              {selected.description && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Findings</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
                </div>
              )}
              {selected.recommendation && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Recommendation</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selected.recommendation}</p>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Created</p>
                <p className="text-sm font-semibold text-gray-800"><FormattedDate date={selected.created_at} includeTime /></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
