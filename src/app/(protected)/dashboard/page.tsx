import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/services/user.service";

export const dynamic = "force-dynamic";

/**
 * Generic /dashboard redirect page.
 * Reads the user's role from the database and redirects them to the
 * appropriate role-specific dashboard. This page never renders any UI.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const profile = await getUserProfile(supabase, authUser.id);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "SUPERVISOR") {
    redirect("/supervisor");
  } else {
    redirect("/technician");
  }
}
