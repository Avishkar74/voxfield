"use client";

import { AlertTriangle, Info, ChevronRight } from "lucide-react";
import type { Alert } from "@/types/database";

export function AlertsList({ alerts = [] }: { alerts: Alert[] }) {
  // Compute real counts from the actual database alerts passed in
  const highCount = alerts.filter(a => a.severity === "CRITICAL" || a.severity === "HIGH").length;
  const mediumCount = alerts.filter(a => (a.severity as string) === "MEDIUM").length;
  const lowCount = alerts.filter(a => (a.severity as string) === "LOW").length;

  const categories = [
    {
      name: "High Priority",
      count: highCount,
      color: "text-red-600 bg-red-50 border-red-100",
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />
    },
    {
      name: "Medium Priority",
      count: mediumCount,
      color: "text-orange-600 bg-orange-50 border-orange-100",
      icon: <AlertTriangle className="w-4 h-4 text-orange-600" />
    },
    {
      name: "Informational",
      count: lowCount,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      icon: <Info className="w-4 h-4 text-blue-600" />
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden h-full">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#D14923]" />
          Alerts Summary
        </h2>
        <button className="text-[#D14923] hover:text-[#B73D1C] text-xs font-bold transition">
          View all
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {categories.map((cat) => (
          <div 
            key={cat.name} 
            className="p-5 flex items-center justify-between hover:bg-[#FAF9F5] transition duration-200 cursor-pointer group"
          >
            <div className="flex items-center space-x-4">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${cat.color}`}>
                {cat.icon}
              </div>
              <span className="text-sm font-semibold text-gray-800">
                {cat.name}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm font-extrabold text-gray-900">
                {cat.count}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
