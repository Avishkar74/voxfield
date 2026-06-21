import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function HomePage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    // Unauthenticated visitors get the public landing page (first impression).
    return <LandingPage />;
  }

  if (user.role === "SUPERVISOR") {
    redirect("/supervisor");
  } else {
    redirect("/technician");
  }
}
