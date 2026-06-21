import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { getSupervisorDashboard } from "@/services/operations.service";
import { createClient } from "@/lib/supabase/server";
import { DetailPageHeader } from "@/components/dashboard/DetailPageHeader";
import { SupervisorVoiceHistoryView } from "@/components/dashboard/SupervisorVoiceHistoryView";

export const dynamic = "force-dynamic";

export default async function SupervisorVoiceHistoryPage() {
  const user = await requireAuth();
  if (user.role !== "SUPERVISOR") redirect("/technician");

  const supabase = await createClient();
  const data = await getSupervisorDashboard(supabase, user);

  return (
    <div className="space-y-6">
      <DetailPageHeader title="Voice History" subtitle="Voice interactions across all technicians" count={data.transcripts.length} />
      <SupervisorVoiceHistoryView transcripts={data.transcripts} technicians={data.technicians} />
    </div>
  );
}
