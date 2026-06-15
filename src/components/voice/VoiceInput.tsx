"use client";

import { useEffect, useRef } from "react";
import { Mic, Square, Loader2, Volume2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useAuth } from "@/hooks/use-auth";

export function VoiceInput() {
  const { user } = useAuth();
  const {
    agentState,
    transcript,
    agentResponse,
    error,
    startListening,
    stopListening,
    submitTextQuery,
    getAnalyser,
  } = useVoiceAgent();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isTechnician = user?.role === "TECHNICIAN";

  // Prompt chips matching the visual layout reference
  const promptChips = isTechnician
    ? [
        "Show my open work orders",
        "What inspections are due today?",
        "Show repair history of an equipment",
        "Update work order status",
      ]
    : [
        "Show all open work orders",
        "Show high priority alerts",
        "Work order summary this week",
        "Equipment with issues",
      ];

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

        ctx.lineWidth = 3;
        ctx.strokeStyle = "#D14923"; // Terracotta orange-red wave
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      } else {
        // Draw flat line when idle
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(209, 73, 35, 0.15)";
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [agentState, getAnalyser]);

  const handleToggle = () => {
    if (agentState === "IDLE" || agentState === "ERROR") {
      startListening();
    } else if (agentState === "LISTENING") {
      stopListening();
    }
  };

  const handleChipClick = (chipText: string) => {
    if (agentState !== "PROCESSING" && agentState !== "SPEAKING") {
      submitTextQuery(chipText);
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8 flex flex-col items-center space-y-6 md:space-y-8">
      {/* Header Info */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center space-x-2">
          <h3 className="text-lg font-bold text-gray-900">AI Voice Assistant</h3>
          <span className="bg-[#FAF0ED] text-[#D14923] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-[#FAF0ED]">
            BETA
          </span>
        </div>
        <p className="text-sm text-gray-500">Speak naturally. I'll handle the rest.</p>
      </div>

      {/* Mic/Visual Area */}
      <div className="relative flex items-center justify-center w-full max-w-xs h-40">
        
        {/* Pulsing ring waves under the button when listening/speaking */}
        {(agentState === "LISTENING" || agentState === "SPEAKING") && (
          <>
            <div className="absolute inset-0 rounded-full bg-[#D14923]/5 animate-ping" />
            <div className="absolute w-40 h-40 rounded-full border-2 border-[#D14923]/10 animate-pulse" />
            <div className="absolute w-48 h-48 rounded-full border border-[#D14923]/5" />
          </>
        )}

        {/* Big recording button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={agentState === "PROCESSING" || agentState === "SPEAKING"}
          aria-label="Toggle Voice Assistant"
          className={`w-24 h-24 md:w-28 md:h-28 rounded-full flex flex-col items-center justify-center shadow-xl transition-all border duration-300 z-10 ${
            agentState === "LISTENING"
              ? "bg-[#EF4444] border-red-500 text-white"
              : agentState === "PROCESSING" || agentState === "SPEAKING"
              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-[#D14923] border-[#D14923] hover:bg-[#B73D1C] text-white"
          }`}
        >
          {agentState === "LISTENING" ? (
            <Square className="w-8 h-8 fill-current" />
          ) : agentState === "PROCESSING" ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : agentState === "SPEAKING" ? (
            <Volume2 className="w-8 h-8 animate-pulse text-[#D14923]" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </motion.button>
      </div>

      {/* Button Helper State Text */}
      <div className="text-center">
        {agentState === "LISTENING" ? (
          <p className="text-sm font-semibold text-red-500">Tap to stop</p>
        ) : agentState === "PROCESSING" ? (
          <p className="text-sm font-semibold text-gray-500">Processing request...</p>
        ) : agentState === "SPEAKING" ? (
          <p className="text-sm font-semibold text-[#D14923]">Assistant is speaking...</p>
        ) : (
          <p className="text-sm font-semibold text-[#D14923]">Tap to speak</p>
        )}
      </div>

      {/* Real-time Oscilloscope Waveform Canvas */}
      <div className="w-full max-w-sm h-12 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center px-4">
        <canvas ref={canvasRef} className="w-full h-8" width={300} height={32} />
      </div>

      {/* Error and Result Feedback Section */}
      {(error || transcript || agentResponse) && (
        <div className="w-full border-t border-gray-100 pt-6 space-y-4">
          {error && (
            <div className="flex items-start space-x-3 bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Playback/Audio Notice</p>
                <p className="font-medium text-red-500">{error}</p>
              </div>
            </div>
          )}

          {transcript && (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">You said</p>
              <p className="text-sm text-gray-800 font-semibold italic">"{transcript}"</p>
            </div>
          )}

          {agentResponse && (
            <div className="bg-[#FAF0ED] p-4 rounded-2xl border border-[#FAF0ED]">
              <p className="text-xs font-semibold text-[#D14923] uppercase tracking-wider mb-1">VoxField AI</p>
              <p className="text-sm text-gray-900 font-medium leading-relaxed">{agentResponse}</p>
            </div>
          )}
        </div>
      )}

      {/* Prompt chips section from the visual design */}
      <div className="w-full border-t border-gray-100 pt-6 space-y-3">
        <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-wider">Try saying:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          {promptChips.map((chipText) => (
            <button
              key={chipText}
              onClick={() => handleChipClick(chipText)}
              disabled={agentState === "PROCESSING" || agentState === "SPEAKING"}
              className="px-4 py-3 bg-[#FAF9F5] border border-gray-200 hover:border-[#D14923] text-gray-700 hover:text-[#D14923] rounded-2xl text-xs font-semibold transition-all duration-200 text-left line-clamp-2 leading-tight disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chipText}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
