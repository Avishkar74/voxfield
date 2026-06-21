import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { createClient } from "@/lib/supabase/server";
import { VoiceHistory } from "@/components/dashboard/VoiceHistory";
import { DetailPageHeader } from "@/components/dashboard/DetailPageHeader";

export const dynamic = "force-dynamic";

const PLACEHOLDER_RESPONSE =
  "Voice agent is not available yet. Your request was recorded and will be handled once Phase 3 is enabled.";

export default async function TechnicianVoiceHistoryPage() {
  const user = await requireAuth();
  if (user.role !== "TECHNICIAN") redirect("/supervisor");

  const supabase = await createClient();
  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("*")
    .eq("user_id", user.id)
    .neq("agent_response", PLACEHOLDER_RESPONSE)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title="Voice History"
        subtitle="Your past voice queries and assistant responses"
        count={transcripts?.length ?? 0}
      />
      <VoiceHistory transcripts={transcripts ?? []} />
    </div>
  );
}
