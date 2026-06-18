import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { createClient } from "@/lib/supabase/server";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DetailPageHeader } from "@/components/dashboard/DetailPageHeader";

export const dynamic = "force-dynamic";

export default async function TechnicianActivityPage() {
  const user = await requireAuth();
  if (user.role !== "TECHNICIAN") redirect("/supervisor");

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", user.id)
    .neq("description", "Stored a placeholder voice query response")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title="Activity"
        subtitle="Your recent actions across work orders, inspections, and voice"
        count={logs?.length ?? 0}
      />
      <ActivityFeed logs={logs ?? []} />
    </div>
  );
}
