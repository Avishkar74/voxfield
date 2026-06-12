import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getEquipmentHistory } from "@/services/phase2.service";

export const GET = withApiHandler(
  async (request, { params }) => {
    const supabase = await createClient();
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const result = await getEquipmentHistory(supabase, {
      equipmentId: params.id as string,
      limit,
    });

    return apiSuccess(result);
  },
  { auth: true },
);