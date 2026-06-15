import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { AppLayout } from "@/components/layout/AppLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    redirect("/login");
  }

  return (
    <AppLayout user={user}>{children}</AppLayout>
  );
}
