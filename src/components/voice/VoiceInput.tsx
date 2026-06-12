"use client";

import { useEffect, useRef } from "react";
import { Mic, Square, Loader2, Volume2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";

export function VoiceInput() {
  const {
    agentState,
    transcript,
    agentResponse,
    error,
    startListening,
    stopListening,
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

        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgb(59, 130, 246)"; // blue-500
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
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(156, 163, 175, 0.5)"; // gray-400
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

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col items-center space-y-6">
      <div className="w-full h-24 bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-700">
        <canvas ref={canvasRef} className="w-full h-full" width={400} height={96} />
      </div>

      <div className="flex flex-col items-center text-center space-y-2 min-h-[4rem]">
        {error ? (
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {agentState}
            </p>
            {transcript && (
              <p className="text-base text-gray-900 dark:text-gray-100 font-medium italic">
                "{transcript}"
              </p>
            )}
            {agentResponse && (
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                {agentResponse}
              </p>
            )}
          </>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        disabled={agentState === "PROCESSING" || agentState === "SPEAKING"}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          agentState === "LISTENING"
            ? "bg-red-500 hover:bg-red-600 text-white"
            : agentState === "PROCESSING" || agentState === "SPEAKING"
            ? "bg-gray-400 text-white cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {agentState === "LISTENING" ? (
          <Square className="w-6 h-6 fill-current" />
        ) : agentState === "PROCESSING" ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : agentState === "SPEAKING" ? (
          <Volume2 className="w-6 h-6 animate-pulse" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </motion.button>
    </div>
  );
}
