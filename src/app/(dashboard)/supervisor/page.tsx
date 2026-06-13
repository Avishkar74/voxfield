import { requireAuth, requireRole } from "@/lib/api/middleware";
import { getSupervisorDashboard } from "@/services/phase2.service";
import { VoiceInput } from "@/components/voice/VoiceInput";
import { KPICards } from "@/components/dashboard/KPICards";
import { WorkOrdersKanban } from "@/components/dashboard/WorkOrdersKanban";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { TranscriptLog } from "@/components/dashboard/TranscriptLog";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { createClient } from "@/lib/supabase/server";

export default async function SupervisorDashboardPage() {
  const user = await requireAuth();
  requireRole(user, ["SUPERVISOR"]);

  const supabase = await createClient();
  const data = await getSupervisorDashboard(supabase, user);

  const kpiData = {
    activeWorkOrders: data.counts.openWorkOrders + data.counts.inProgressWorkOrders,
    recentInspections: data.counts.inspections,
    criticalAlerts: data.alerts.filter((a) => a.severity === "CRITICAL").length,
    voiceQueries: data.transcripts.length,
  };

  return (
    <div className="space-y-6">
      <KPICards data={kpiData} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section>
            <h2 className="text-lg font-bold mb-4">Work Orders</h2>
            <WorkOrdersKanban workOrders={data.workOrders} />
          </section>

          <section>
            <TranscriptLog transcripts={data.transcripts} />
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
              Global Voice Assistant
            </h2>
            <VoiceInput />
          </section>

          <section>
            <AlertsList alerts={data.alerts} />
          </section>

          <section>
            <ActivityFeed logs={data.activityLogs} />
          </section>
        </div>
      </div>
    </div>
  );
}
