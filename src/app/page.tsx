import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/middleware";

export default async function HomePage() {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    redirect("/login");
  }

  if (user.role === "SUPERVISOR") {
    redirect("/supervisor");
  } else {
    redirect("/technician");
  }
}
