import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { getTechnicianDashboard } from "@/services/operations.service";
import { VoiceInput } from "@/components/voice/VoiceInput";
import { OfflineSyncSection } from "@/components/dashboard/OfflineSyncSection";
import { createClient } from "@/lib/supabase/server";
import { ClipboardList, FileSearch, MessageSquare, History, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TechnicianDashboardPage() {
  const user = await requireAuth();
  if (user.role !== "TECHNICIAN") {
    redirect("/supervisor");
  }

  const supabase = await createClient();
  const data = await getTechnicianDashboard(supabase, user);

  const activeWorkOrders = data.workOrders.filter((w) => w.status !== "CLOSED").length;
  const openInspections = data.inspections.filter((i: { status?: string }) => i.status === "OPEN").length;

  const summary = [
    {
      label: "Active Work Orders",
      value: activeWorkOrders,
      hint: "In open / progress",
      href: "/technician/work-orders",
      cta: "Open work orders",
      icon: ClipboardList,
      tone: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      label: "Open Inspections",
      value: openInspections,
      hint: "Awaiting review",
      href: "/technician/inspections",
      cta: "Open inspections",
      icon: FileSearch,
      tone: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      label: "Voice Queries",
      value: data.counts.transcripts,
      hint: "Total interactions",
      href: "/technician/voice-history",
      cta: "Open voice history",
      icon: MessageSquare,
      tone: "text-[#D14923] bg-[#FAF0ED] border-[#FAD5C5]",
    },
    {
      label: "Recent Activity",
      value: data.counts.activityLogs,
      hint: "Logged actions",
      href: "/technician/activity",
      cta: "Open activity",
      icon: History,
      tone: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Voice Assistant Panel - Full Width */}
      <section id="dashboard" className="w-full">
        <VoiceInput suggestions={data.equipmentSuggestions} />
      </section>

      {/* Summary KPI cards — each opens its dedicated page (full lists live in the sidebar) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group bg-white border border-gray-200 hover:border-[#D14923]/30 hover:-translate-y-0.5 transition rounded-3xl p-5 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
                  <p className="text-3xl font-black text-gray-950 mt-2 leading-none">{card.value}</p>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium">{card.hint}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${card.tone} group-hover:scale-110 transition`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[#D14923] group-hover:gap-2 transition-all">
                {card.cta} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          );
        })}
      </section>

      {/* Offline Sync Status */}
      <section id="offline-sync">
        <OfflineSyncSection />
      </section>
    </div>
  );
}
