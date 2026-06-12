import { withApiHandler } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/request";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createVoiceTranscript } from "@/services/phase2.service";

export const POST = withApiHandler(
  async (request, { user }) => {
    const supabase = await createClient();
    const body = await parseJsonBody(request);
    const result = await createVoiceTranscript(supabase, user!, body as never);

    return apiSuccess(result, 201);
  },
  { auth: true },
);