import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { getSupervisorDashboard } from "@/services/operations.service";
import { createClient } from "@/lib/supabase/server";
import { DetailPageHeader } from "@/components/dashboard/DetailPageHeader";
import { FormattedDate } from "@/components/dashboard/FormattedDate";
import { ClipboardList, CheckCircle2, Clock, FileSearch, ShieldAlert, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SupervisorReportsPage() {
  const user = await requireAuth();
  if (user.role !== "SUPERVISOR") redirect("/technician");

  const supabase = await createClient();
  const data = await getSupervisorDashboard(supabase, user);

  const wo = data.workOrders;
  const total = wo.length;
  const closed = wo.filter((w) => w.status === "CLOSED");
  const inProgress = wo.filter((w) => w.status === "IN_PROGRESS").length;
  const open = wo.filter((w) => w.status === "OPEN").length;
  const completionRate = total > 0 ? Math.round((closed.length / total) * 100) : 0;

  const byPriority = (p: string) => wo.filter((w) => w.priority === p).length;
  const inspBySeverity = (s: string) => data.inspections.filter((i) => i.severity === s).length;

  const equipMap = new Map(data.equipment.map((e) => [e.id, e]));
  const techMap = new Map(data.technicians.map((t) => [t.id, t]));
  const recentClosed = closed.slice(0, 10);

  const metrics = [
    { label: "Total Work Orders", value: total, icon: ClipboardList, tone: "text-blue-600 bg-blue-50 border-blue-100" },
    { label: "Completed", value: closed.length, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { label: "In Progress", value: inProgress, icon: Clock, tone: "text-orange-600 bg-orange-50 border-orange-100" },
    { label: "Completion Rate", value: `${completionRate}%`, icon: CheckCircle2, tone: "text-[#D14923] bg-[#FAF0ED] border-[#FAD5C5]" },
  ];

  return (
    <div className="space-y-6">
      <DetailPageHeader title="Reports & Summaries" subtitle="Historical work order, inspection, and alert metrics for review and auditing" />

      {/* Headline metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{m.label}</p>
                <p className="text-3xl font-black text-gray-950 mt-2 leading-none">{m.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${m.tone}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4"><ClipboardList className="w-4 h-4 text-blue-500" /> Work Orders by Priority</h2>
          <div className="space-y-3">
            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
              <div key={p} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-600">{p}</span>
                <span className="font-black text-gray-900">{byPriority(p)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-500">Open / In Progress</span>
            <span className="font-black text-gray-900">{open} / {inProgress}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4"><FileSearch className="w-4 h-4 text-amber-500" /> Inspections by Severity</h2>
          <div className="space-y-3">
            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-600">{s}</span>
                <span className="font-black text-gray-900">{inspBySeverity(s)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-500">Total Inspections</span>
            <span className="font-black text-gray-900">{data.inspections.length}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4"><ShieldAlert className="w-4 h-4 text-red-500" /> Alerts Summary</h2>
          <div className="space-y-3">
            {["OPEN", "ACKNOWLEDGED", "RESOLVED"].map((st) => (
              <div key={st} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-600">{st}</span>
                <span className="font-black text-gray-900">{data.alerts.filter((a) => a.status === st).length}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-500">Critical / High</span>
            <span className="font-black text-gray-900">
              {data.alerts.filter((a) => a.severity === "CRITICAL").length} / {data.alerts.filter((a) => a.severity === "HIGH").length}
            </span>
          </div>
        </div>
      </div>

      {/* Recently completed work orders (audit trail) */}
      <section className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-base flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Recently Completed Work Orders</h2>
          <Link href="/supervisor/work-orders" className="text-xs font-bold text-[#D14923] hover:text-[#B73D1C] transition flex items-center gap-1">
            All work orders <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentClosed.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No completed work orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <th className="p-4 px-6">WO Number</th>
                  <th className="p-4 px-6">Equipment</th>
                  <th className="p-4 px-6">Title</th>
                  <th className="p-4 px-6">Assigned</th>
                  <th className="p-4 px-6">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentClosed.map((w) => {
                  const equip = equipMap.get(w.equipment_id);
                  const tech = w.assigned_to ? techMap.get(w.assigned_to) : null;
                  return (
                    <tr key={w.id} className="hover:bg-[#FAF9F5]/50 transition text-sm">
                      <td className="p-4 px-6 font-bold text-gray-900">{w.work_order_number}</td>
                      <td className="p-4 px-6 font-semibold text-gray-800">{equip?.equipment_code ?? "Unknown"}</td>
                      <td className="p-4 px-6 text-gray-600 max-w-xs truncate" title={w.title}>{w.title}</td>
                      <td className="p-4 px-6 font-semibold text-gray-800">{tech?.full_name ?? "Unassigned"}</td>
                      <td className="p-4 px-6 text-xs text-gray-500"><FormattedDate date={w.updated_at ?? w.created_at} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
