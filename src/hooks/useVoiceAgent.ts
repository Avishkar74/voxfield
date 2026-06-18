"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";


export type AgentState = "IDLE" | "LISTENING" | "TRANSCRIBING" | "THINKING" | "PROCESSING" | "SPEAKING" | "ERROR";

export function useVoiceAgent() {
  const router = useRouter();
  const [agentState, setAgentState] = useState<AgentState>("IDLE");
  const [transcript, setTranscript] = useState<string>("");
  const [agentResponse, setAgentResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);

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
    ttsSourceRef.current = source;
    setAgentState("SPEAKING");
    return new Promise((resolve) => {
      source.onended = () => {
        setAgentState("IDLE");
        resolve();
      };
      source.start(0);
    });
  };

  const stopSpeaking = useCallback(() => {
    if(ttsSourceRef.current){
      try {
        ttsSourceRef.current.stop()
      } catch (error) {
        
      }
      ttsSourceRef.current = null;
    }
    setAgentState("IDLE")

  },[])

  const isBusy = useCallback(()=> agentState !== "IDLE" && agentState !== "ERROR", [agentState])

  const startListening = useCallback(async () => {

    if(isBusy()) return;
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

      let options = {};
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options = { mimeType: "audio/webm;codecs=opus" };
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          options = { mimeType: "audio/webm" };
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
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

      mediaRecorder.start();
      setAgentState("LISTENING");
    } catch (err: any) {
      const msg = err.message || "Microphone access denied";
      setError(msg);
      setAgentState("ERROR");
      showErrorToast(msg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusy]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && agentState === "LISTENING") {
      mediaRecorderRef.current.stop();
      setAgentState("TRANSCRIBING");
    }
  }, [agentState]);

  const showErrorToast = (message:string) => {
    console.log("[VoiceAgent Error]",message);
    toast.error(message);
  }

  const queueOfflineVoice = useCallback(async (audioBlob: Blob) => {
    try {
      const { enqueueVoiceInteraction } = await import("@/lib/indexeddb");
      const { triggerSyncStatusUpdate } = await import("@/lib/sync");
      const id = typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      await enqueueVoiceInteraction({
        id,
        operation: "voice-query",
        payload: {},
        queuedAt: new Date().toISOString(),
        status: "PENDING_SYNC",
        attempt_count: 0,
        session_id: sessionId || id,
      }, audioBlob);

      await triggerSyncStatusUpdate();

      setAgentResponse("You are offline. Your voice recording has been saved to the queue and will sync automatically when online.");
      setAgentState("IDLE");
      router.refresh();
    } catch (dbErr: any) {
      console.error("Failed to save voice recording offline:", dbErr);
      setError("Failed to save voice recording offline");
      setAgentState("ERROR");
    }
  }, [sessionId, router]);

  const queueOfflineText = useCallback(async (text: string) => {
    try {
      const { enqueueVoiceInteraction } = await import("@/lib/indexeddb");
      const { triggerSyncStatusUpdate } = await import("@/lib/sync");
      const id = typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      await enqueueVoiceInteraction({
        id,
        operation: "voice-query",
        payload: { userPrompt: text },
        queuedAt: new Date().toISOString(),
        status: "PENDING_SYNC",
        attempt_count: 0,
        session_id: sessionId || id,
      });

      await triggerSyncStatusUpdate();

      setAgentResponse("You are offline. Your query has been saved to the queue and will sync automatically when online.");
      setAgentState("IDLE");
      router.refresh();
    } catch (dbErr: any) {
      console.error("Failed to save text query offline:", dbErr);
      setError("Failed to save text query offline");
      setAgentState("ERROR");
    }
  }, [sessionId, router]);

  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      // If we know we are offline, don't even try to fetch
      if (typeof window !== "undefined" && !navigator.onLine) {
        await queueOfflineVoice(audioBlob);
        return;
      }

      // 1. STT — transcribe audio
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      let sttRes;
      try {
        sttRes = await fetch("/api/stt", {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        // Fetch failed due to network error
        await queueOfflineVoice(audioBlob);
        return;
      }

      if(!sttRes.ok){
        const msg = `Transcription failed (${sttRes.status})`;
        setError(msg)
        setAgentState("ERROR");
        showErrorToast(msg);
        return;
      }
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

      // If network dropped after STT succeeded
      if (typeof window !== "undefined" && !navigator.onLine) {
        await queueOfflineText(text);
        return;
      }
      setAgentState("THINKING");

      // 2. Query Agent
      let queryRes;
      try {
        queryRes = await fetch("/api/voice-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userPrompt: text, sessionId }),
        });
      } catch (err) {
        // Fetch failed due to network error (STT worked but query failed)
        await queueOfflineText(text);
        return;
      }

      if (!queryRes.ok) {
        const msg = `Agent processing failed (${queryRes.status})`;
        setError(msg);
        setAgentState("ERROR");
        showErrorToast(msg);
        return;
      }
      const queryData = await queryRes.json();
      
      if (queryData?.data?.sessionId) {
        setSessionId(queryData.data.sessionId);
      }

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

      if (!ttsRes.ok) {
        const msg = `Text-to-speech failed (${ttsRes.status})`;
        showErrorToast(msg);
        setAgentState("IDLE");
        return;
      }
      const arrayBuffer = await ttsRes.arrayBuffer();
      await playAudioBuffer(arrayBuffer);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setAgentState("ERROR");
    }
  };

  const submitTextQuery = useCallback(async (text: string) => {
    if(isBusy()) return;
    try {
      setError(null);
      setTranscript(text);
      setAgentResponse("");
      setAgentState("THINKING");

      
      await ensureAudioContext();

      if (typeof window !== "undefined" && !navigator.onLine) {
        await queueOfflineText(text);
        return;
      }

      // 1. Query Agent
      let queryRes;
      try {
        queryRes = await fetch("/api/voice-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userPrompt: text, sessionId }),
        });
      } catch (err) {
        // Fetch failed due to network error
        await queueOfflineText(text);
        return;
      }

      if (!queryRes.ok) {
        const msg = `Agent processing failed (${queryRes.status})`;
        setError(msg);
        setAgentState("ERROR");
        showErrorToast(msg);
        return;
      }
      const queryData = await queryRes.json();
      
      if (queryData?.data?.sessionId) {
        setSessionId(queryData.data.sessionId);
      }

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

      if (!ttsRes.ok) {
        showErrorToast(`Text-to-speech failed (${ttsRes.status})`);
        setAgentState("IDLE");
        return;
      }
      const arrayBuffer = await ttsRes.arrayBuffer();
      await playAudioBuffer(arrayBuffer);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setAgentState("ERROR");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sessionId, queueOfflineText]);

  const getAnalyser = useCallback(() => {
    return analyserRef.current;
  }, []);

  return {
    agentState,
    transcript,
    agentResponse,
    error,
    isBusy,
    startListening,
    stopListening,
    stopSpeaking,
    submitTextQuery,
    getAnalyser,
  };
}
