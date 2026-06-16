import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { AppLayout } from "@/components/layout/AppLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireAuth() throws UnauthorizedError if no valid session exists.
  // We catch it and redirect to /login instead of surfacing an error page.
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect("/login");
  }

  return (
    // user is always defined here — redirect() above is a no-return throw.
    // The non-null assertion is safe because redirect() exits the function.
    <AppLayout user={user!}>{children}</AppLayout>
  );
}
