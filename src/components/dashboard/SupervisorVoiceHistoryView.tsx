"use client";

import { useMemo, useState } from "react";
import { Search, X, MessageSquare } from "lucide-react";
import type { Transcript, User } from "@/types/database";
import { FormattedDate } from "./FormattedDate";

interface Props {
  transcripts: Transcript[];
  technicians: User[];
}

export function SupervisorVoiceHistoryView({ transcripts, technicians }: Props) {
  const [search, setSearch] = useState("");
  const [tech, setTech] = useState("all");
  const [period, setPeriod] = useState<"all" | "today" | "week">("all");

  const techMap = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians]);

  const filtered = useMemo(() => {
    return transcripts.filter((t) => {
      if (tech !== "all" && t.user_id !== tech) return false;
      if (period === "today" && new Date(t.created_at).toDateString() !== new Date().toDateString()) return false;
      if (period === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (new Date(t.created_at) < weekAgo) return false;
      }
      const term = search.toLowerCase();
      if (term && !(t.user_prompt?.toLowerCase().includes(term) || t.agent_response?.toLowerCase().includes(term))) {
        return false;
      }
      return true;
    });
  }, [transcripts, tech, period, search]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-3xl p-4 md:p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts and responses…"
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D14923]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-900">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-gray-600">
            {(["all", "today", "week"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-2.5 py-1.5 rounded-md transition capitalize ${period === p ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"}`}>
                {p}
              </button>
            ))}
          </div>
          <select value={tech} onChange={(e) => setTech(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none">
            <option value="all">All techs</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#D14923]" /> Voice Interaction History
          </h2>
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{filtered.length} shown</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No voice interactions match the filters.</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[640px] overflow-y-auto p-5 space-y-4">
            {filtered.map((t, i) => {
              const techUser = techMap.get(t.user_id);
              return (
                <div key={t.id} className={`pt-4 ${i === 0 ? "pt-0" : ""} space-y-2.5`}>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    <span>Technician: <strong className="text-gray-800">{techUser?.full_name ?? "Unknown"}</strong></span>
                    <span><FormattedDate date={t.created_at} includeTime /></span>
                  </div>
                  <div className="bg-[#FAF9F5] border border-gray-100 p-3 rounded-2xl flex gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-12 flex-shrink-0">Prompt</span>
                    <p className="text-sm font-bold text-gray-900">{t.user_prompt}</p>
                  </div>
                  <div className="bg-[#D14923]/5 border border-[#D14923]/10 p-3 rounded-2xl flex gap-2">
                    <span className="text-[10px] font-black text-[#D14923]/60 uppercase tracking-widest w-12 flex-shrink-0">Agent</span>
                    <p className="text-sm text-gray-700 font-medium">{t.agent_response}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
