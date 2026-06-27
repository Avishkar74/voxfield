import { withApiHandler } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/request";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { deactivateTechnician } from "@/services/operations.service";

export const PATCH = withApiHandler(
  async (request, { user, params }) => {
    const supabase = await createClient();
    const body = (await parseJsonBody(request)) as { action?: string };

    if (body.action !== "deactivate") {
      throw new Error("Unsupported action. Use action: deactivate");
    }

    const result = await deactivateTechnician(supabase, user!, params.id as string);
    return apiSuccess(result);
  },
  { auth: true, roles: ["SUPERVISOR"] },
);

/** @deprecated Use PATCH with { action: "deactivate" } — keeps history, soft-deactivates account */
export const DELETE = withApiHandler(
  async (request, { user, params }) => {
    const supabase = await createClient();
    const result = await deactivateTechnician(supabase, user!, params.id as string);
    return apiSuccess(result);
  },
  { auth: true, roles: ["SUPERVISOR"] },
);
