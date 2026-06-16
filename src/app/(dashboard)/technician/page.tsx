import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { getTechnicianDashboard } from "@/services/operations.service";
import { VoiceInput } from "@/components/voice/VoiceInput";
import { WorkOrdersList } from "@/components/dashboard/WorkOrdersList";
import { InspectionsList } from "@/components/dashboard/InspectionsList";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { VoiceHistory } from "@/components/dashboard/VoiceHistory";
import { OfflineSyncSection } from "@/components/dashboard/OfflineSyncSection";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TechnicianDashboardPage() {
  const user = await requireAuth();
  if (user.role !== "TECHNICIAN") {
    redirect("/supervisor");
  }

  const supabase = await createClient();
  const data = await getTechnicianDashboard(supabase, user);

  return (
    <div className="space-y-6">
      {/* Voice Assistant Panel - Full Width */}
      <section id="dashboard" className="w-full">
        <VoiceInput suggestions={data.equipmentSuggestions} />
      </section>

      {/* Main Grid — Work Orders, Inspections, and Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <section id="work-orders">
            <WorkOrdersList workOrders={data.workOrders} />
          </section>

          <section id="inspections">
            <InspectionsList inspections={data.inspections} />
          </section>

          {/* Offline Sync Status — dedicated dashboard section */}
          <section id="offline-sync">
            <OfflineSyncSection />
          </section>
        </div>

        {/* Right Column — Activity Feed + Voice History */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Recent Activity from activity_logs table */}
          <section id="activity">
            <ActivityFeed logs={data.activityLogs} />
          </section>

          {/* Voice Interaction History from transcripts table — separate from activity */}
          <section id="voice-history">
            <VoiceHistory transcripts={data.transcripts} />
          </section>
        </div>

      </div>
    </div>
  );
}
