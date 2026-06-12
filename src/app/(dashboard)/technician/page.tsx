import { requireAuth, requireRole } from "@/lib/api/middleware";
import { getTechnicianDashboard } from "@/services/phase2.service";
import { VoiceInput } from "@/components/voice/VoiceInput";
import { WorkOrdersList } from "@/components/dashboard/WorkOrdersList";
import { InspectionsList } from "@/components/dashboard/InspectionsList";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { createClient } from "@/lib/supabase/server";

export default async function TechnicianDashboardPage() {
  const user = await requireAuth();
  requireRole(user, ["TECHNICIAN"]);

  const supabase = await createClient();
  const data = await getTechnicianDashboard(supabase, user);

  return (
    <div className="space-y-6 max-w-lg mx-auto md:max-w-none md:grid md:grid-cols-12 md:gap-6 md:space-y-0">
      <div className="md:col-span-7 lg:col-span-8 space-y-6">
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Voice Assistant</h2>
          <VoiceInput />
        </section>

        <section>
          <WorkOrdersList workOrders={data.workOrders} />
        </section>
      </div>

      <div className="md:col-span-5 lg:col-span-4 space-y-6">
        <section>
          <InspectionsList inspections={data.inspections} />
        </section>
        
        <section>
          <ActivityFeed logs={data.activityLogs} />
        </section>
      </div>
    </div>
  );
}
