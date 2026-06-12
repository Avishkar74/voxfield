"use client";

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  status: string;
  priority: string;
}

export function WorkOrdersKanban({ workOrders }: { workOrders: WorkOrder[] }) {
  const columns = [
    { id: "OPEN", title: "Open" },
    { id: "IN_PROGRESS", title: "In Progress" },
    { id: "CLOSED", title: "Closed" },
  ];

  return (
    <div className="bg-transparent overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[768px]">
        {columns.map((col) => {
          const items = workOrders.filter(w => w.status === col.id);
          return (
            <div key={col.id} className="flex-1 min-w-[280px] bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">{col.title}</h3>
                <span className="text-xs font-bold bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full shadow-sm">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map(wo => (
                  <div key={wo.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-grab hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-[10px] font-bold text-gray-400">{wo.work_order_number}</span>
                      <span className={`w-2 h-2 rounded-full ${wo.priority === 'CRITICAL' ? 'bg-red-500 animate-pulse' : wo.priority === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{wo.title}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
