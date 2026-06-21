"use client";

import { useEffect, useRef } from "react";
import { Mic, Square, Loader2, Volume2, AlertCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import type { EquipmentSuggestion } from "@/services/operations.service";

interface VoiceInputProps {
  /** Dynamic suggestions generated from real DB relationships. May be empty if no data exists. */
  suggestions?: EquipmentSuggestion[];
}

export function VoiceInput({ suggestions = [] }: VoiceInputProps) {
  const {
    agentState,
    transcript,
    interimTranscript,
    agentResponse,
    error,
    liveCaptioning,
    startListening,
    stopListening,
    stopSpeaking,
    submitTextQuery,
    getAnalyser,
  } = useVoiceAgent();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = getAnalyser();

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (agentState === "LISTENING" && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#D14923";
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      } else {
        // Flat idle line
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(209, 73, 35, 0.15)";
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [agentState, getAnalyser]);

  const handleToggle = () => {
    if (agentState === "IDLE" || agentState === "ERROR") startListening();
    else if (agentState === "LISTENING") stopListening();
  };

  const isBusy =
    agentState === "TRANSCRIBING" ||
    agentState === "THINKING" ||
    agentState === "SPEAKING";

  const handleChipClick = (text: string) => {
    if (!isBusy) {
      submitTextQuery(text);
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8 flex flex-col items-center space-y-6 md:space-y-8">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-base font-bold text-gray-900 tracking-tight">
            Voice Assistant Ready
          </h2>
          <span className="bg-[#FAF0ED] text-[#D14923] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-[#FAF0ED]">
            BETA
          </span>
        </div>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">
          System Online
        </p>
      </div>

      {/* Mic + waveform area */}
      <div className="relative flex items-center justify-center w-full max-w-xs h-40">
        {(agentState === "LISTENING" || agentState === "SPEAKING") && (
          <>
            <div className="absolute inset-0 rounded-full bg-[#D14923]/5 animate-ping" />
            <div className="absolute w-40 h-40 rounded-full border-2 border-[#D14923]/10 animate-pulse" />
            <div className="absolute w-48 h-48 rounded-full border border-[#D14923]/5" />
          </>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={isBusy}
          aria-label="Toggle Voice Assistant"
          className={`w-24 h-24 md:w-28 md:h-28 rounded-full flex flex-col items-center justify-center shadow-xl transition-all border duration-300 z-10 ${
            agentState === "LISTENING"
              ? "bg-[#EF4444] border-red-500 text-white"
              : isBusy
                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#D14923] border-[#D14923] hover:bg-[#B73D1C] text-white"
          }`}
        >
          {agentState === "LISTENING" ? (
            <Square className="w-8 h-8 fill-current" />
          ) : agentState === "TRANSCRIBING" || agentState === "THINKING" ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : agentState === "SPEAKING" ? (
            <Volume2 className="w-8 h-8 animate-pulse text-[#D14923]" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </motion.button>
      </div>

      {/* State label */}
      <div className="text-center -mt-2 flex flex-col items-center gap-2">
        {agentState === "LISTENING" ? (
          <>
            <p className="text-sm font-semibold text-red-500">
              Tap to stop recording
            </p>
            {liveCaptioning && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live captions
              </span>
            )}
          </>
        ) : agentState === "TRANSCRIBING" ? (
          <p className="text-sm font-semibold text-gray-500">
            Transcribing your voice…
          </p>
        ) : agentState === "THINKING" ? (
          <p className="text-sm font-semibold text-gray-500">Thinking…</p>
        ) : agentState === "SPEAKING" ? (
          <p className="text-sm font-semibold text-[#D14923]">
            Assistant is responding…
          </p>
        ) : (
          <p className="text-sm font-semibold text-[#D14923]">Tap to speak</p>
        )}
      </div>

      {agentState === "SPEAKING" && (
        <button
          onClick={stopSpeaking}
          aria-label="Stop speaking"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200
               bg-white hover:bg-gray-50 text-sm font-medium transition-colors text-gray-700"
        >
          <Square className="h-4 w-4 fill-current" />
          Stop speaking
        </button>
      )}

      {/* Waveform canvas */}
      <div className="w-full max-w-sm h-12 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center px-4">
        <canvas
          ref={canvasRef}
          className="w-full h-8"
          width={300}
          height={32}
        />
      </div>

      {/* Live realtime caption while listening */}
      {agentState === "LISTENING" && liveCaptioning && (transcript || interimTranscript) && (
        <div className="w-full bg-[#FAF9F5] border border-gray-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Listening…
          </p>
          <p className="text-sm text-gray-800 font-medium leading-relaxed">
            {transcript}{" "}
            <span className="text-gray-400 italic">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Error and result feedback */}
      {(error || transcript || agentResponse) && (
        <div className="w-full border-t border-gray-100 pt-5 space-y-3">
          {error && (
            <div className="flex items-start space-x-3 bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Error</p>
                <p className="font-medium text-red-500">{error}</p>
              </div>
            </div>
          )}

          {transcript && agentState !== "LISTENING" && (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                You
              </p>
              <p className="text-sm text-gray-800 font-medium italic">
                "{transcript}"
              </p>
            </div>
          )}

          {agentResponse && (
            <div className="bg-[#FAF0ED] p-4 rounded-2xl border border-[#FAF0ED]">
              <p className="text-[10px] font-bold text-[#D14923] uppercase tracking-widest mb-1">
                VoxField AI
              </p>
              <p className="text-sm text-gray-900 font-medium leading-relaxed">
                {agentResponse}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Dynamic suggestions — only shown if DB has related records */}
      {suggestions.length > 0 && (
        <div className="w-full border-t border-gray-100 pt-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#D14923]" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Suggested queries
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            {suggestions.map((s) => (
              <button
                key={s.text}
                onClick={() => handleChipClick(s.text)}
                disabled={isBusy}
                className="px-4 py-3 bg-[#FAF9F5] border border-gray-200 hover:border-[#D14923] text-gray-700 hover:text-[#D14923] rounded-2xl text-xs font-semibold transition-all duration-200 text-left leading-tight disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
