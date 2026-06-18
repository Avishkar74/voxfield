"use client";

import { useMemo, useState } from "react";
import { Search, X, FileCheck } from "lucide-react";
import type { InspectionReport, Equipment, User } from "@/types/database";
import { FormattedDate } from "./FormattedDate";

interface Props {
  inspections: InspectionReport[];
  equipment: Equipment[];
  technicians: User[];
}

export function SupervisorInspectionsView({ inspections, equipment, technicians }: Props) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  const equipMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);
  const techMap = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians]);

  const filtered = useMemo(() => {
    return inspections.filter((insp) => {
      const matchesSeverity = severity === "all" || insp.severity === severity;
      const matchesStatus = status === "all" || insp.status === status;
      const term = search.toLowerCase();
      const equip = equipMap.get(insp.equipment_id);
      const tech = techMap.get(insp.technician_id);
      const matchesSearch =
        !term ||
        insp.title.toLowerCase().includes(term) ||
        insp.description.toLowerCase().includes(term) ||
        (equip?.equipment_code.toLowerCase().includes(term) ?? false) ||
        (tech?.full_name.toLowerCase().includes(term) ?? false);
      return matchesSeverity && matchesStatus && matchesSearch;
    });
  }, [inspections, severity, status, search, equipMap, techMap]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-3xl p-4 md:p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, equipment, tech…"
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-900">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]">
          <option value="all">All severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]">
          <option value="all">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-500" /> Inspection Reports
          </h2>
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{filtered.length} shown</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No inspections match the filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <th className="p-4 px-6">Equipment</th>
                  <th className="p-4 px-6">Title</th>
                  <th className="p-4 px-6">Severity</th>
                  <th className="p-4 px-6">Status</th>
                  <th className="p-4 px-6">Technician</th>
                  <th className="p-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((insp) => {
                  const equip = equipMap.get(insp.equipment_id);
                  const tech = techMap.get(insp.technician_id);
                  return (
                    <tr key={insp.id} className="hover:bg-[#FAF9F5]/50 transition text-sm">
                      <td className="p-4 px-6 font-bold text-gray-900">{equip?.equipment_code ?? "Unknown"}</td>
                      <td className="p-4 px-6 text-gray-600 max-w-xs truncate" title={insp.title}>{insp.title}</td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${insp.severity === "CRITICAL" || insp.severity === "HIGH" ? "bg-red-50 text-red-700 border-red-100" : insp.severity === "MEDIUM" ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}>{insp.severity}</span>
                      </td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${insp.status === "CLOSED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : insp.status === "REVIEWED" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100"}`}>{insp.status}</span>
                      </td>
                      <td className="p-4 px-6 font-semibold text-gray-800">{tech?.full_name ?? "Unknown"}</td>
                      <td className="p-4 px-6 text-xs text-gray-500"><FormattedDate date={insp.created_at} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
