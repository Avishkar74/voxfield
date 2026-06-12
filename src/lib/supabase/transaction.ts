import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError, ErrorCode } from "@/lib/errors";
import type { Database } from "@/types/database";

export async function withTransaction<T>(
  supabase: SupabaseClient<Database>,
  callback: (supabase: SupabaseClient<Database>) => Promise<T>,
): Promise<T> {
  const { error: beginError } = await supabase.rpc("begin" as never);

  if (beginError) {
    throw new AppError(
      `Failed to begin transaction: ${beginError.message}`,
      ErrorCode.INTERNAL_ERROR,
      500,
    );
  }

  try {
    const result = await callback(supabase);
    const { error: commitError } = await supabase.rpc("commit" as never);

    if (commitError) {
      throw new AppError(
        `Failed to commit transaction: ${commitError.message}`,
        ErrorCode.INTERNAL_ERROR,
        500,
      );
    }

    return result;
  } catch (error) {
    const { error: rollbackError } = await supabase.rpc("rollback" as never);

    if (rollbackError) {
      throw new AppError(
        `Failed to rollback transaction: ${rollbackError.message}`,
        ErrorCode.INTERNAL_ERROR,
        500,
      );
    }

    throw error;
  }
}