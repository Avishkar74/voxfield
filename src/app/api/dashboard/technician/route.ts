import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getTechnicianDashboard } from "@/services/phase2.service";

export const GET = withApiHandler(
  async (_request, { user }) => {
    const supabase = await createClient();
    const result = await getTechnicianDashboard(supabase, user!);

    return apiSuccess(result);
  },
  { auth: true, roles: ["TECHNICIAN"] },
);