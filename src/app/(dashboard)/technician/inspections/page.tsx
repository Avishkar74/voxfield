import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { createClient } from "@/lib/supabase/server";
import { InspectionsList } from "@/components/dashboard/InspectionsList";
import { DetailPageHeader } from "@/components/dashboard/DetailPageHeader";

export const dynamic = "force-dynamic";

export default async function TechnicianInspectionsPage() {
  const user = await requireAuth();
  if (user.role !== "TECHNICIAN") redirect("/supervisor");

  const supabase = await createClient();
  const { data: inspections } = await supabase
    .from("inspection_reports")
    .select("*")
    .eq("technician_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title="Inspections"
        subtitle="Inspection reports you have submitted"
        count={inspections?.length ?? 0}
      />
      <InspectionsList inspections={inspections ?? []} />
    </div>
  );
}
