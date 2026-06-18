import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { getSupervisorDashboard } from "@/services/operations.service";
import { createClient } from "@/lib/supabase/server";
import { DetailPageHeader } from "@/components/dashboard/DetailPageHeader";
import { SupervisorInspectionsView } from "@/components/dashboard/SupervisorInspectionsView";

export const dynamic = "force-dynamic";

export default async function SupervisorInspectionsPage() {
  const user = await requireAuth();
  if (user.role !== "SUPERVISOR") redirect("/technician");

  const supabase = await createClient();
  const data = await getSupervisorDashboard(supabase, user);

  return (
    <div className="space-y-6">
      <DetailPageHeader title="Inspections" subtitle="All inspection reports across the organization" count={data.inspections.length} />
      <SupervisorInspectionsView inspections={data.inspections} equipment={data.equipment} technicians={data.technicians} />
    </div>
  );
}
