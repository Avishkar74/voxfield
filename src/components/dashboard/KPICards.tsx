"use client";

import { Activity, ClipboardList, FileSearch, AlertTriangle } from "lucide-react";

interface KPIData {
  activeWorkOrders: number;
  recentInspections: number;
  criticalAlerts: number;
  voiceQueries: number;
}

export function KPICards({ data }: { data: KPIData }) {
  const cards = [
    { label: "Active Orders", value: data.activeWorkOrders, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Inspections", value: data.recentInspections, icon: FileSearch, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Critical Alerts", value: data.criticalAlerts, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "Voice Interactions", value: data.voiceQueries, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg}`}>
              <Icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{card.value}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
