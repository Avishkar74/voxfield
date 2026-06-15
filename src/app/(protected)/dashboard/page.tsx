import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/services/user.service";

export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Protected area
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Dashboard
          </h1>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Welcome, {profile?.full_name}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-300">
          <div className="flex justify-between gap-4">
            <dt className="font-medium">Employee code</dt>
            <dd>{profile?.employee_code}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-medium">Email</dt>
            <dd>{profile?.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-medium">Role</dt>
            <dd>{profile?.role}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
          This is a Phase 1 protected placeholder. Voice, dashboards, and
          operational features will be added in later phases.
        </p>
      </section>
    </div>
  );
}
