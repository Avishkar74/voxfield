import { withApiHandler } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/request";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createInspection } from "@/services/operations.service";

export const POST = withApiHandler(
  async (request, { user }) => {
    const supabase = await createClient();
    const body = await parseJsonBody(request);
    const result = await createInspection(supabase, user!, body as never);

    return apiSuccess(result, 201);
  },
  { auth: true, roles: ["TECHNICIAN"] },
);