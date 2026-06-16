import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getSupervisorOperations } from "@/services/operations.service";

export const GET = withApiHandler(
  async (request, { user }) => {
    const supabase = await createClient();
    const result = await getSupervisorOperations(supabase, user!);
    return apiSuccess(result);
  },
  { auth: true, roles: ["SUPERVISOR"] },
);
