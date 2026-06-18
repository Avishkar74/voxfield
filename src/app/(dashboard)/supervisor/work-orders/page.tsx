import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { getSupervisorDashboard } from "@/services/operations.service";
import { createClient } from "@/lib/supabase/server";
import { DetailPageHeader } from "@/components/dashboard/DetailPageHeader";
import { SupervisorWorkOrdersView } from "@/components/dashboard/SupervisorWorkOrdersView";

export const dynamic = "force-dynamic";

export default async function SupervisorWorkOrdersPage() {
  const user = await requireAuth();
  if (user.role !== "SUPERVISOR") redirect("/technician");

  const supabase = await createClient();
  const data = await getSupervisorDashboard(supabase, user);

  return (
    <div className="space-y-6">
      <DetailPageHeader title="Work Orders" subtitle="All work orders across the organization" count={data.workOrders.length} />
      <SupervisorWorkOrdersView workOrders={data.workOrders} equipment={data.equipment} technicians={data.technicians} />
    </div>
  );
}
