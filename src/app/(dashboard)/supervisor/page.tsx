import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { getSupervisorDashboard } from "@/services/operations.service";
import { SupervisorDashboardContainer } from "@/components/dashboard/SupervisorDashboardContainer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupervisorDashboardPage() {
  const user = await requireAuth();
  if (user.role !== "SUPERVISOR") {
    redirect("/technician");
  }

  const supabase = await createClient();
  const data = await getSupervisorDashboard(supabase, user);

  // Map user data for safe initial container parsing
  const initialData = {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      employeeCode: user.employeeCode,
    },
    counts: data.counts,
    workOrders: data.workOrders,
    inspections: data.inspections,
    alerts: data.alerts,
    transcripts: data.transcripts,
    activityLogs: data.activityLogs,
    technicians: data.technicians,
    equipment: data.equipment,
    repairHistory: data.repairHistory,
  };

  return <SupervisorDashboardContainer initialData={initialData} />;
}
