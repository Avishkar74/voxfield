import { requireAuth, requireRole } from "@/lib/api/middleware";
import { getTechnicianDashboard } from "@/services/phase2.service";
import { VoiceInput } from "@/components/voice/VoiceInput";
import { WorkOrdersList } from "@/components/dashboard/WorkOrdersList";
import { InspectionsList } from "@/components/dashboard/InspectionsList";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TechnicianDashboardPage() {
  const user = await requireAuth();
  requireRole(user, ["TECHNICIAN"]);

  const supabase = await createClient();
  const data = await getTechnicianDashboard(supabase, user);

  return (
    <div className="space-y-6">
      {/* Voice Assistant Panel - Full Width */}
      <section id="dashboard" className="w-full">
        <VoiceInput />
      </section>

      {/* Main Grid for Orders, Inspections, and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column - Work Orders & Inspections */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <section id="work-orders">
            <WorkOrdersList workOrders={data.workOrders} />
          </section>

          <section id="inspections">
            <InspectionsList inspections={data.inspections} />
          </section>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="lg:col-span-5 xl:col-span-4">
          <section id="activity">
            <ActivityFeed logs={data.activityLogs} />
          </section>
        </div>

      </div>
    </div>
  );
}
