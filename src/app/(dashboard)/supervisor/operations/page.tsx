import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { getSupervisorOperations } from "@/services/operations.service";
import { SupervisorOperationsContainer } from "@/components/dashboard/SupervisorOperationsContainer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupervisorOperationsPage() {
  const user = await requireAuth();
  if (user.role !== "SUPERVISOR") {
    redirect("/technician");
  }

  const supabase = await createClient();
  const data = await getSupervisorOperations(supabase, user);

  // Map user data for safe initial container parsing
  const initialData = {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      employeeCode: user.employeeCode,
    },
    workOrders: data.workOrders,
    transcripts: data.transcripts,
    quantityLogs: data.quantityLogs,
    errorLogs: data.errorLogs,
    activityLogs: data.activityLogs,
    technicians: data.technicians,
  };

  return <SupervisorOperationsContainer initialData={initialData} />;
}
