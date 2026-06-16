"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export type AgentState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR";

export function useVoiceAgent() {
  const router = useRouter();
  const [agentState, setAgentState] = useState<AgentState>("IDLE");
  const [transcript, setTranscript] = useState<string>("");
  const [agentResponse, setAgentResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  /** Ensure AudioContext is created and resumed (must be called from a user gesture) */
  const ensureAudioContext = async (): Promise<AudioContext> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx;
  };

  /** Play raw ArrayBuffer audio via Web Audio API — bypasses autoplay restrictions */
  const playAudioBuffer = async (arrayBuffer: ArrayBuffer): Promise<void> => {
    const ctx = await ensureAudioContext();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    setAgentState("SPEAKING");
    return new Promise((resolve) => {
      source.onended = () => {
        setAgentState("IDLE");
        resolve();
      };
      source.start(0);
    });
  };

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript("");
      setAgentResponse("");

      // Create / resume AudioContext on user gesture so TTS can play later
      await ensureAudioContext();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Wire microphone → analyser for waveform visualisation
      const analyser = audioContextRef.current!.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContextRef.current!.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        analyserRef.current = null; // Stop waveform after recording
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudioBlob(audioBlob);
      };

      mediaRecorder.start(1000);
      setAgentState("LISTENING");
    } catch (err: any) {
      setError(err.message || "Microphone access denied");
      setAgentState("ERROR");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && agentState === "LISTENING") {
      mediaRecorderRef.current.stop();
      setAgentState("PROCESSING");
    }
  }, [agentState]);

  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      // 1. STT — transcribe audio
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const sttRes = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });

      if (!sttRes.ok) throw new Error("Transcription failed");
      const sttData = await sttRes.json();

      const text = sttData.text;
      if (!text) {
        setAgentResponse("I didn't hear anything. Please try again.");
        setAgentState("IDLE");
        return;
      }
      setTranscript(text);

      if (sttData.confidence && sttData.confidence < 0.6) {
        setAgentResponse("I didn't quite catch that. Could you please repeat?");
        setAgentState("IDLE");
        return;
      }

      // 2. Query Agent
      const queryRes = await fetch("/api/voice-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: text }),
      });

      if (!queryRes.ok) throw new Error("Agent processing failed");
      const queryData = await queryRes.json();
      const reply = queryData.data.agentResponse;
      setAgentResponse(reply);

      // Refresh page data immediately
      router.refresh();

      // 3. TTS — synthesize and play
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      });

      if (!ttsRes.ok) throw new Error("Text-to-speech failed");
      const arrayBuffer = await ttsRes.arrayBuffer();
      await playAudioBuffer(arrayBuffer);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setAgentState("ERROR");
    }
  };

  const submitTextQuery = useCallback(async (text: string) => {
    try {
      setError(null);
      setTranscript(text);
      setAgentResponse("");
      setAgentState("PROCESSING");

      // Ensure AudioContext is running — we ARE in a user gesture here
      await ensureAudioContext();

      // 1. Query Agent
      const queryRes = await fetch("/api/voice-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: text }),
      });

      if (!queryRes.ok) throw new Error("Agent processing failed");
      const queryData = await queryRes.json();
      const reply = queryData.data.agentResponse;
      setAgentResponse(reply);

      // Refresh page data immediately
      router.refresh();

      // 2. TTS — synthesize and play
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      });

      if (!ttsRes.ok) throw new Error("Text-to-speech failed");
      const arrayBuffer = await ttsRes.arrayBuffer();
      await playAudioBuffer(arrayBuffer);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setAgentState("ERROR");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const getAnalyser = useCallback(() => {
    return analyserRef.current;
  }, []);

  return {
    agentState,
    transcript,
    agentResponse,
    error,
    startListening,
    stopListening,
    submitTextQuery,
    getAnalyser,
  };
}
