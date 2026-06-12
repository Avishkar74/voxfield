"use client";

import { AlertTriangle, Info, BellRing } from "lucide-react";

interface Alert {
  id: string;
  equipment_id: string;
  severity: string;
  message: string;
  status: string;
  created_at: string;
}

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center">
        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <Info className="w-6 h-6 text-green-500" />
        </div>
        <h3 className="text-gray-900 dark:text-gray-100 text-sm font-medium">No Active Alerts</h3>
        <p className="text-xs text-gray-500 mt-1">System is operating normally.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
          <BellRing className="w-4 h-4 text-red-500" />
          Active Alerts
        </h2>
        <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/50 max-h-64 overflow-y-auto">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3 items-start">
            <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-orange-100 text-orange-600'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {alert.message}
              </p>
              <div className="flex gap-2 items-center mt-1">
                <span className={`text-[10px] font-bold px-1.5 rounded ${alert.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                  {alert.severity}
                </span>
                <span className="text-[10px] text-gray-500">{new Date(alert.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
