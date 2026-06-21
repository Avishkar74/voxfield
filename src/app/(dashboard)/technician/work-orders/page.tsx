import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { createClient } from "@/lib/supabase/server";
import { WorkOrdersList } from "@/components/dashboard/WorkOrdersList";
import { DetailPageHeader } from "@/components/dashboard/DetailPageHeader";

export const dynamic = "force-dynamic";

export default async function TechnicianWorkOrdersPage() {
  const user = await requireAuth();
  if (user.role !== "TECHNICIAN") redirect("/supervisor");

  const supabase = await createClient();
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("*")
    .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <DetailPageHeader
        title="Work Orders"
        subtitle="All work orders assigned to or created by you"
        count={workOrders?.length ?? 0}
      />
      <WorkOrdersList workOrders={workOrders ?? []} />
    </div>
  );
}
