"use client";

import { useState, useEffect } from "react";
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
  const [pendingTranscripts, setPendingTranscripts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const { getPendingInteractions } = await import("@/lib/indexeddb");
        const items = await getPendingInteractions();
        const pending = items
          .filter((item) => item.operation === "voice-query")
          .map((item) => ({
            id: item.id,
            user_id: "",
            user_prompt: item.payload.userPrompt || "Voice Recording",
            agent_response:
              item.status === "PENDING_SYNC"
                ? "Waiting for connection to process query..."
                : item.status === "SYNCING"
                ? "Synchronizing query with AI..."
                : item.status === "FAILED"
                ? `Failed to sync: ${item.error || "Unknown error"}`
                : "Processing response...",
            session_id: item.session_id,
            tools_used: null,
            created_at: item.queuedAt,
            updated_at: item.queuedAt,
            isPending: true,
            status: item.status,
            is_offline: true,
          }));
        setPendingTranscripts(pending);
      } catch (err) {
        console.error("Failed to load pending voice queries:", err);
      }
    };

    fetchPending();

    // Subscribe to sync status updates to keep the list reactively updated
    let unsubscribeSync: (() => void) | null = null;
    import("@/lib/sync").then(({ subscribeToSyncStatus }) => {
      unsubscribeSync = subscribeToSyncStatus(() => {
        fetchPending();
      });
    });

    return () => {
      if (unsubscribeSync) unsubscribeSync();
    };
  }, []);

  // Combine server transcripts and pending offline items
  const combinedTranscripts = [
    ...pendingTranscripts,
    ...transcripts.map((t) => ({ ...t, isPending: false })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (combinedTranscripts.length === 0) {
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
          {combinedTranscripts.length} session{combinedTranscripts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Conversation entries */}
      <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
        {combinedTranscripts.map((t) => (
          <div key={t.id} className="p-4 space-y-3 hover:bg-[#FAF9F5] transition-colors">
            {/* Timestamp and Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                <FormattedDate date={t.created_at} includeTime={true} />
              </p>
              
              <div className="flex items-center gap-1.5">
                {t.is_offline && (
                  <span className="text-[9px] font-extrabold text-[#D14923] bg-[#FAF0ED] border border-[#FAF0ED] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Offline Query
                  </span>
                )}
                {t.isPending ? (
                  <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    t.status === "PENDING_SYNC"
                      ? "text-amber-700 bg-amber-50 border-amber-100"
                      : t.status === "SYNCING"
                      ? "text-blue-700 bg-blue-50 border-blue-100 animate-pulse"
                      : "text-red-700 bg-red-50 border-red-100"
                  }`}>
                    {t.status === "PENDING_SYNC" ? "Pending Sync" : t.status === "SYNCING" ? "Syncing..." : "Sync Failed"}
                  </span>
                ) : t.is_offline ? (
                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Synced
                  </span>
                ) : null}
              </div>
            </div>

            {/* Offline sync details if synced */}
            {t.is_offline && !t.isPending && t.captured_at && t.synced_at && (
              <div className="text-[10px] text-gray-500 font-medium bg-[#FAF9F5] border border-gray-100 rounded-xl p-2.5 space-y-1">
                <div className="flex justify-between">
                  <span>Captured:</span>
                  <span className="font-semibold"><FormattedDate date={t.captured_at} includeTime={true} /></span>
                </div>
                <div className="flex justify-between">
                  <span>Synced:</span>
                  <span className="font-semibold"><FormattedDate date={t.synced_at} includeTime={true} /></span>
                </div>
                {t.queue_duration !== undefined && t.queue_duration !== null && (
                  <div className="flex justify-between">
                    <span>Queue Duration:</span>
                    <span className="font-semibold">{t.queue_duration} seconds</span>
                  </div>
                )}
              </div>
            )}

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
                {t.tools_used.map((tool: string, idx: number) => (
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
