import { withApiHandler } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/request";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { updateWorkOrder } from "@/services/operations.service";

export const PATCH = withApiHandler(
  async (request, { params, user }) => {
    const supabase = await createClient();
    const body = await parseJsonBody(request);
    const result = await updateWorkOrder(
      supabase,
      user!,
      params.id as string,
      body as never,
    );

    return apiSuccess(result);
  },
  { auth: true, roles: ["TECHNICIAN", "SUPERVISOR"] },
);