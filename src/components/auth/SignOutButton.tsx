"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";

export function SignOutButton() {
  const router = useRouter();
  const { signOut, isLoading } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleSignOut}
      isLoading={isLoading}
      aria-label="Sign out"
    >
      Sign out
    </Button>
  );
}
