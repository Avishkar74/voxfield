"use client";

import { ClipboardList, Clock, CheckCircle2, FileSearch, AlertTriangle, Calendar } from "lucide-react";

interface KPIData {
  openWorkOrders: number;
  inProgressWorkOrders: number;
  completedWorkOrders: number;
  inspectionsCompleted: number;
  highPriorityAlerts: number;
}

export function KPICards({ data }: { data: KPIData }) {
  const cards = [
    { 
      label: "Open Work Orders", 
      value: data.openWorkOrders, 
      icon: ClipboardList, 
      color: "text-blue-600 bg-blue-50 border-blue-100" 
    },
    { 
      label: "In Progress", 
      value: data.inProgressWorkOrders, 
      icon: Clock, 
      color: "text-orange-600 bg-orange-50 border-orange-100" 
    },
    { 
      label: "Completed Orders", 
      value: data.completedWorkOrders, 
      icon: CheckCircle2, 
      color: "text-green-600 bg-green-50 border-green-100" 
    },
    { 
      label: "Inspections Recorded", 
      value: data.inspectionsCompleted, 
      icon: FileSearch, 
      color: "text-purple-600 bg-purple-50 border-purple-100" 
    },
    { 
      label: "High Priority Alerts", 
      value: data.highPriorityAlerts, 
      icon: AlertTriangle, 
      color: "text-red-600 bg-red-50 border-red-100" 
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 space-y-6">
      {/* Header with calendar filter */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-base">
          Overview
        </h2>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>Active Period</span>
        </div>
      </div>

      {/* Grid containing 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i} 
              className="bg-[#FAF9F5] border border-gray-100 hover:border-[#D14923]/20 rounded-2xl p-5 transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-gray-950 leading-none">
                  {card.value}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Real-time sync</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
