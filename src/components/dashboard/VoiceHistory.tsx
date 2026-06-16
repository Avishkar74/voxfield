"use client";

import { MessageSquare, User, Bot } from "lucide-react";
import type { Transcript } from "@/types/database";
import { FormattedDate } from "./FormattedDate";

interface VoiceHistoryProps {
  transcripts: Transcript[];
}

/**
 * Voice Interaction History
 * Data source: transcripts table (user_prompt + agent_response)
 * This section is completely separate from Recent Activity (activity_logs).
 */
export function VoiceHistory({ transcripts }: VoiceHistoryProps) {
  if (!transcripts || transcripts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 text-center">
        <MessageSquare className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <h3 className="text-gray-900 font-bold text-sm">No Voice Interactions Yet</h3>
        <p className="text-gray-500 text-xs mt-1">
          Your voice queries and assistant responses will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#D14923]" />
          Voice Interaction History
        </h2>
        <span className="text-[10px] font-bold text-[#D14923] bg-[#FAF0ED] px-2.5 py-1 rounded-full border border-[#FAF0ED] uppercase tracking-wider">
          {transcripts.length} session{transcripts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Conversation entries */}
      <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
        {transcripts.map((t) => (
          <div key={t.id} className="p-4 space-y-3 hover:bg-[#FAF9F5] transition-colors">
            {/* Timestamp */}
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
              <FormattedDate date={t.created_at} includeTime={true} />
            </p>

            {/* User message bubble */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">You</p>
                <p className="text-sm text-gray-800 leading-relaxed italic">
                  "{t.user_prompt}"
                </p>
              </div>
            </div>

            {/* Agent response bubble */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#FAF0ED] border border-[#FAD5C5] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-[#D14923]" />
              </div>
              <div className="flex-1 bg-[#FAF0ED] rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <p className="text-[10px] font-bold text-[#D14923] uppercase tracking-wide mb-1">VoxField AI</p>
                <p className="text-sm text-gray-900 leading-relaxed">
                  {t.agent_response}
                </p>
              </div>
            </div>

            {/* Tools used badge — only if present */}
            {t.tools_used && t.tools_used.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-10">
                {t.tools_used.map((tool, idx) => (
                  <span
                    key={`${tool}-${idx}`}
                    className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
                  >
                    {tool.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
