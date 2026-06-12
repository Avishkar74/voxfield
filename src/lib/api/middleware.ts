import type { NextRequest } from "next/server";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/services/user.service";
import type { UserRole } from "@/types/database";

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  role: UserRole;
  employeeCode: string;
  fullName: string;
}

export async function requireAuth(): Promise<AuthenticatedRequestUser> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new UnauthorizedError();
  }

  const profile = await getUserProfile(supabase, authUser.id);

  if (!profile) {
    throw new UnauthorizedError("User profile not found");
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    employeeCode: profile.employee_code,
    fullName: profile.full_name,
  };
}

export function requireRole(
  user: AuthenticatedRequestUser,
  allowedRoles: UserRole[],
): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError();
  }
}

export function getRequestRoute(request: NextRequest): string {
  return request.nextUrl.pathname;
}
