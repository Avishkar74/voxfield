import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function HomePage() {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return <LandingPage/>;
  }

  if (user.role === "SUPERVISOR") {
    redirect("/supervisor");
  } else {
    redirect("/technician");
  }
}
