"use client";

import { MessageSquare, Mic } from "lucide-react";

interface Transcript {
  id: string;
  user_prompt: string;
  agent_response: string;
  created_at: string;
}

import { FormattedDate } from "./FormattedDate";

export function TranscriptLog({ transcripts }: { transcripts: Transcript[] }) {
  if (!transcripts || transcripts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center">
        <MessageSquare className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <h3 className="text-gray-900 dark:text-gray-100 text-sm font-medium">No Voice Interactions</h3>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
          <Mic className="w-4 h-4 text-blue-500" />
          Recent Voice Interactions
        </h2>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/50 max-h-96 overflow-y-auto p-4 space-y-4">
        {transcripts.map((t) => (
          <div key={t.id} className="pt-4 first:pt-0">
            <div className="flex gap-3 mb-2">
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-gray-500">U</span>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-gray-800 dark:text-gray-200 w-fit max-w-[85%]">
                {t.user_prompt}
              </div>
            </div>
            <div className="flex gap-3 flex-row-reverse">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Mic className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="bg-blue-600 dark:bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm w-fit max-w-[85%]">
                {t.agent_response}
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-400">
                <FormattedDate date={t.created_at} includeTime={true} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
