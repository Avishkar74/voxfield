"use client";

import { MessageSquare, Mic, User } from "lucide-react";
import type { Transcript } from "@/types/database";
import { FormattedDate } from "./FormattedDate";

export function TranscriptLog({ transcripts }: { transcripts: Transcript[] }) {
  if (!transcripts || transcripts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 text-center">
        <MessageSquare className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <h3 className="text-gray-900 font-bold text-sm">No Voice Interactions</h3>
        <p className="text-gray-500 text-xs mt-1">Transcripts will populate when voice assistant queries are made.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden h-full">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#D14923]" />
          Transcript Monitoring
        </h2>
        <button className="text-[#D14923] hover:text-[#B73D1C] text-xs font-bold transition">
          View all
        </button>
      </div>

      <div className="p-6 space-y-6 max-h-[420px] overflow-y-auto bg-gray-50">
        {transcripts.map((t) => (
          <div key={t.id} className="space-y-3 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
            {/* User prompt balloon */}
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 border border-gray-300">
                <User className="w-3.5 h-3.5 text-gray-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800 font-medium shadow-sm max-w-[85%]">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Technician Query</p>
                <p className="italic">"{t.user_prompt}"</p>
              </div>
            </div>

            {/* Agent response balloon */}
            <div className="flex items-start flex-row-reverse space-x-reverse space-x-3">
              <div className="w-7 h-7 rounded-full bg-[#FAF0ED] flex items-center justify-center shrink-0 border border-[#FAF0ED]">
                <Mic className="w-3.5 h-3.5 text-[#D14923]" />
              </div>
              <div className="bg-[#1C1A17] text-white border border-[#1C1A17] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm font-medium shadow-sm max-w-[85%]">
                <p className="text-[10px] font-bold text-[#D14923] uppercase tracking-wider mb-0.5">VoxField AI</p>
                <p>{t.agent_response}</p>
              </div>
            </div>

            <div className="text-center">
              <span className="text-[9px] font-semibold text-gray-400">
                <FormattedDate date={t.created_at} includeTime={true} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
