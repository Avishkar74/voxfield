import OpenAI from "openai";
import { getSystemPrompt } from "./agent-prompt";
import { getAgentTools } from "./agent-tools";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AuthenticatedRequestUser } from "@/lib/api/middleware";
import { createVoiceTranscript } from "@/services/operations.service";

// We will instantiate the client inside the function to prevent test crashes
// when OPENAI_API_KEY is not defined in the test environment.

export async function processVoiceQuery(
  adminClient: SupabaseClient<Database>,
  user: AuthenticatedRequestUser,
  userPrompt: string,
  sessionId?: string
): Promise<{ agentResponse: string; transcriptId: string; sessionId: string; toolsUsed: string[] }> {
  const tools = getAgentTools(adminClient, user);
  const systemPrompt = getSystemPrompt(user);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "test-mock-key",
  });

  let messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const toolsUsed: string[] = [];
  let rawResponse = "I'm sorry, I couldn't process that request.";

  for (let i = 0; i < 5; i++) { // Max 5 iterations to prevent infinite loops
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages,
      tools: tools.map(t => ({ type: t.type, function: t.function })) as any,
      tool_choice: "auto",
    });

    const msg = response.choices[0]?.message;
    if (!msg) break;

    messages.push(msg);

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const call of msg.tool_calls) {
        if (call.type !== "function") continue;
        
        toolsUsed.push(call.function.name);
        
        const tool = tools.find(t => t.function.name === call.function.name);
        let toolResult = JSON.stringify({ error: "Tool not found" });
        
        if (tool) {
          try {
            const args = JSON.parse(call.function.arguments);
            toolResult = await (tool.function as any).function(args);
          } catch (e: any) {
            toolResult = JSON.stringify({ error: e.message });
          }
        }
        
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: toolResult,
        });
      }
    } else {
      rawResponse = msg.content || rawResponse;
      break;
    }
  }

  // Create the transcript via phase 2 tool
  const transcriptResult = await createVoiceTranscript(adminClient, user, {
    userPrompt,
    sessionId,
    toolsUsed,
    agentResponse: rawResponse,
  });

  return {
    agentResponse: rawResponse,
    transcriptId: transcriptResult.transcriptId || "",
    sessionId: transcriptResult.sessionId || "",
    toolsUsed,
  };
}
