"use client";

import { ClipboardList, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

export function WorkOrdersList({ workOrders }: { workOrders: WorkOrder[] }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50";
      case "HIGH": return "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/50";
      case "MEDIUM": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50";
      default: return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN": return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case "IN_PROGRESS": return <Clock className="w-4 h-4 text-orange-500" />;
      case "CLOSED": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default: return <ClipboardList className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!workOrders || workOrders.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center">
        <ClipboardList className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <h3 className="text-gray-900 dark:text-gray-100 font-medium">No Work Orders</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-500" />
          Active Work Orders
        </h2>
        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
          {workOrders.length} Pending
        </span>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
        {workOrders.map((wo) => (
          <div key={wo.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(wo.status)}
                <span className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">{wo.work_order_number}</span>
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${getPriorityColor(wo.priority)}`}>
                {wo.priority}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {wo.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Created: {new Date(wo.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
