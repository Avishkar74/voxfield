"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";

export function SignOutButton() {
  const { signOut, isLoading } = useAuth();

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // Sign out error is non-critical — redirect anyway
    } finally {
      // Use a full page navigation to ensure session cookies are cleared
      // and no stale auth state remains in memory.
      window.location.href = "/login";
    }
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
