import { withApiHandler } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/request";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { processVoiceQuery } from "@/lib/agent";

export const POST = withApiHandler(
  async (request, { user }) => {
    const supabase = await createClient();
    const body = await parseJsonBody(request);
    
    // The body should be mapped to the properties processVoiceQuery expects.
    // The voice query tool previously expected: userPrompt, sessionId (optional)
    const input = body as { userPrompt: string; sessionId?: string };
    
    if (!input.userPrompt) {
      throw new Error("Missing userPrompt in request body");
    }

    const result = await processVoiceQuery(supabase, user!, input.userPrompt, input.sessionId);

    return apiSuccess(result, 201);
  },
  { auth: true },
);