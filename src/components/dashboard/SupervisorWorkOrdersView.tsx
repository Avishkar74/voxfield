"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Wrench, Plus } from "lucide-react";
import type { WorkOrder, Equipment, User } from "@/types/database";
import { FormattedDate } from "./FormattedDate";
import { CreateWorkOrderModal } from "./CreateWorkOrderModal";

interface Props {
  workOrders: WorkOrder[];
  equipment: Equipment[];
  technicians: User[];
}

export function SupervisorWorkOrdersView({ workOrders, equipment, technicians }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [woModalOpen, setWoModalOpen] = useState(false);

  const equipMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);
  const techMap = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians]);

  const filtered = useMemo(() => {
    return workOrders.filter((wo) => {
      const matchesStatus = status === "all" || wo.status === status;
      const matchesPriority = priority === "all" || wo.priority === priority;
      const term = search.toLowerCase();
      const equip = equipMap.get(wo.equipment_id);
      const tech = wo.assigned_to ? techMap.get(wo.assigned_to) : null;
      const matchesSearch =
        !term ||
        wo.work_order_number.toLowerCase().includes(term) ||
        wo.title.toLowerCase().includes(term) ||
        (equip?.equipment_code.toLowerCase().includes(term) ?? false) ||
        (tech?.full_name.toLowerCase().includes(term) ?? false);
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [workOrders, status, priority, search, equipMap, techMap]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-3xl p-4 md:p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search WO #, title, equipment, tech…"
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-900">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]">
          <option value="all">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]">
          <option value="all">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-500" /> Work Orders
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{filtered.length} shown</span>
            <button
              type="button"
              onClick={() => setWoModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#D14923] hover:bg-[#B73D1C] px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" /> Create Work Order
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No work orders match the filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <th className="p-4 px-6">WO Number</th>
                  <th className="p-4 px-6">Equipment</th>
                  <th className="p-4 px-6">Title</th>
                  <th className="p-4 px-6">Priority</th>
                  <th className="p-4 px-6">Status</th>
                  <th className="p-4 px-6">Assigned</th>
                  <th className="p-4 px-6">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((wo) => {
                  const equip = equipMap.get(wo.equipment_id);
                  const tech = wo.assigned_to ? techMap.get(wo.assigned_to) : null;
                  return (
                    <tr key={wo.id} className="hover:bg-[#FAF9F5]/50 transition text-sm">
                      <td className="p-4 px-6 font-bold text-gray-900">{wo.work_order_number}</td>
                      <td className="p-4 px-6 font-semibold text-gray-800">{equip?.equipment_code ?? "Unknown"}</td>
                      <td className="p-4 px-6 text-gray-600 max-w-xs truncate" title={wo.title}>{wo.title}</td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${wo.priority === "CRITICAL" || wo.priority === "HIGH" ? "bg-red-50 text-red-700 border-red-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}>{wo.priority}</span>
                      </td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${wo.status === "CLOSED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : wo.status === "IN_PROGRESS" ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-gray-100 text-gray-700 border-gray-200"}`}>{wo.status}</span>
                      </td>
                      <td className="p-4 px-6 font-semibold text-gray-800">{tech?.full_name ?? "Unassigned"}</td>
                      <td className="p-4 px-6 text-xs text-gray-500"><FormattedDate date={wo.created_at} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateWorkOrderModal
        open={woModalOpen}
        onClose={() => setWoModalOpen(false)}
        onSuccess={() => router.refresh()}
        equipment={equipment}
        technicians={technicians}
      />
    </div>
  );
}
