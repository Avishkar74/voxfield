import type { SupabaseClient } from "@supabase/supabase-js";

import { ValidationError } from "@/lib/errors";
import type { Database, User } from "@/types/database";

export async function getUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new ValidationError(error.message);
  }

  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...(data as User),
    is_active: row.is_active !== false,
  };
}

export async function getUserProfileByEmail(
  supabase: SupabaseClient<Database>,
  email: string,
): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new ValidationError(error.message);
  }

  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...(data as User),
    is_active: row.is_active !== false,
  };
}
