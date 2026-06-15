import { requireAuth, requireRole } from "@/lib/api/middleware";
import { getSupervisorDashboard } from "@/services/phase2.service";
import { VoiceInput } from "@/components/voice/VoiceInput";
import { KPICards } from "@/components/dashboard/KPICards";
import { WorkOrdersKanban } from "@/components/dashboard/WorkOrdersKanban";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { TranscriptLog } from "@/components/dashboard/TranscriptLog";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupervisorDashboardPage() {
  const user = await requireAuth();
  requireRole(user, ["SUPERVISOR"]);

  const supabase = await createClient();
  const data = await getSupervisorDashboard(supabase, user);

  const kpiData = {
    openWorkOrders: data.counts.openWorkOrders,
    inProgressWorkOrders: data.counts.inProgressWorkOrders,
    completedWorkOrders: data.counts.closedWorkOrders,
    inspectionsCompleted: data.counts.inspections,
    highPriorityAlerts: data.alerts.filter(
      (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
    ).length,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column (Wider): Voice assistant, KPIs, and Transcripts */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        
        {/* Voice Assistant */}
        <section id="dashboard">
          <VoiceInput />
        </section>

        {/* Overview KPIs */}
        <section id="reports">
          <KPICards data={kpiData} />
        </section>

        {/* Transcript Monitoring */}
        <section id="transcripts">
          <TranscriptLog transcripts={data.transcripts} />
        </section>

      </div>

      {/* Right Column (Narrower): Alerts, Active Work Orders, and Recent Activity */}
      <div className="lg:col-span-5 xl:col-span-4 space-y-6">
        
        {/* Alerts Summary */}
        <section id="alerts">
          <AlertsList alerts={data.alerts} />
        </section>

        {/* Active Work Orders */}
        <section id="work-orders">
          <WorkOrdersKanban workOrders={data.workOrders} />
        </section>

        {/* Recent Activity */}
        <section id="activity">
          <ActivityFeed logs={data.activityLogs} />
        </section>

      </div>

    </div>
  );
}
