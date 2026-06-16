import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

export const DELETE = withApiHandler(
  async (request, { params }) => {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(params.id as string);
    if (error) {
      throw new Error(error.message);
    }
    return apiSuccess({ success: true });
  },
  { auth: true, roles: ["SUPERVISOR"] },
);
