import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";

import type { User, UserRole } from "@/types/database";

export interface AuthUser extends User {
  authUser: SupabaseAuthUser;
}

export interface AuthSession {
  session: Session;
  user: AuthUser;
}

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  employeeCode: string;
  role: UserRole;
}

export interface SignInInput {
  email: string;
  password: string;
}
