import type { SupabaseClient } from "@supabase/supabase-js";

import { ValidationError } from "@/lib/errors";
import { signInSchema, signUpSchema } from "@/lib/validation";
import { getUserProfile } from "@/services/user.service";
import type {
  AuthSession,
  AuthUser,
  SignInInput,
  SignUpInput,
} from "@/types/auth";
import type { Database } from "@/types/database";

function mapAuthUser(
  profile: NonNullable<Awaited<ReturnType<typeof getUserProfile>>>,
  authUser: NonNullable<
    Awaited<ReturnType<SupabaseClient<Database>["auth"]["getUser"]>>["data"]["user"]
  >,
): AuthUser {
  return {
    ...profile,
    authUser,
  };
}

export async function signUpWithEmail(
  supabase: SupabaseClient<Database>,
  input: SignUpInput,
): Promise<{ requiresEmailConfirmation: boolean }> {
  const parsed = signUpSchema.safeParse({
    email: input.email,
    password: input.password,
    fullName: input.fullName,
    employeeCode: input.employeeCode,
    role: input.role,
  });

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { email, password, fullName, employeeCode, role } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        employee_code: employeeCode,
        role,
      },
    },
  });

  if (error) {
    throw new ValidationError(error.message);
  }

  return {
    requiresEmailConfirmation: data.user !== null && data.session === null,
  };
}

export async function signInWithEmail(
  supabase: SupabaseClient<Database>,
  input: SignInInput,
): Promise<AuthSession> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new ValidationError(error.message);
  }

  if (!data.session || !data.user) {
    throw new ValidationError("Unable to create session");
  }

  const profile = await getUserProfile(supabase, data.user.id);

  if (!profile) {
    throw new ValidationError(
      "Account profile not found. Please contact an administrator.",
    );
  }

  return {
    session: data.session,
    user: mapAuthUser(profile, data.user),
  };
}

export async function signOut(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new ValidationError(error.message);
  }
}

export async function getCurrentSession(
  supabase: SupabaseClient<Database>,
): Promise<AuthSession | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new ValidationError(sessionError.message);
  }

  if (!session) {
    return null;
  }

  const {
    data: { user: authUser },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !authUser) {
    return null;
  }

  const profile = await getUserProfile(supabase, authUser.id);

  if (!profile) {
    return null;
  }

  return {
    session,
    user: mapAuthUser(profile, authUser),
  };
}

export async function refreshSession(
  supabase: SupabaseClient<Database>,
): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    throw new ValidationError(error.message);
  }

  if (!data.session || !data.user) {
    return null;
  }

  const profile = await getUserProfile(supabase, data.user.id);

  if (!profile) {
    return null;
  }

  return {
    session: data.session,
    user: mapAuthUser(profile, data.user),
  };
}

export async function getCurrentUser(
  supabase: SupabaseClient<Database>,
): Promise<AuthUser | null> {
  const session = await getCurrentSession(supabase);
  return session?.user ?? null;
}
