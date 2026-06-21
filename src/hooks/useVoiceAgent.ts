"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";


export type AgentState = "IDLE" | "LISTENING" | "TRANSCRIBING" | "THINKING" | "PROCESSING" | "SPEAKING" | "ERROR";

/** Resolve the browser SpeechRecognition implementation, if available. */
function getSpeechRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useVoiceAgent() {
  const router = useRouter();
  const [agentState, setAgentState] = useState<AgentState>("IDLE");
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [agentResponse, setAgentResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [liveCaptioning, setLiveCaptioning] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const sessionIdRef = useRef<string | undefined>(undefined);

  // ── Realtime Web Speech coordination refs ──
  const recognitionRef = useRef<any>(null);
  const useWebSpeechRef = useRef<boolean>(false);
  const webSpeechFinalRef = useRef<string>("");
  const stopRequestedRef = useRef<boolean>(false);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recorderDoneRef = useRef<boolean>(false);
  const recognitionDoneRef = useRef<boolean>(false);
  const finalizingRef = useRef<boolean>(false);

  const updateSessionId = (id?: string) => {
    sessionIdRef.current = id;
    setSessionId(id);
  };

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
        session_id: sessionIdRef.current || id,
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
  }, [router]);

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
        session_id: sessionIdRef.current || id,
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
  }, [router]);

  /** Shared pipeline: send transcribed/typed text to the agent, then speak the reply. */
  const runAgentPipeline = async (text: string) => {
    try {
      setTranscript(text);
      setInterimTranscript("");

      if (typeof window !== "undefined" && !navigator.onLine) {
        await queueOfflineText(text);
        return;
      }

      setAgentState("THINKING");

      let queryRes;
      try {
        queryRes = await fetch("/api/voice-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userPrompt: text, sessionId: sessionIdRef.current }),
        });
      } catch (err) {
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
        updateSessionId(queryData.data.sessionId);
      }

      const reply = queryData.data.agentResponse;
      setAgentResponse(reply);

      router.refresh();

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
  };

  /** Batch transcription fallback (AssemblyAI) — used when realtime captions are unavailable. */
  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        await queueOfflineVoice(audioBlob);
        return;
      }

      setAgentState("TRANSCRIBING");

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      let sttRes;
      try {
        sttRes = await fetch("/api/stt", {
          method: "POST",
          body: formData,
        });
      } catch (err) {
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

      await runAgentPipeline(text);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setAgentState("ERROR");
    }
  };

  /** Decide what to do once a realtime listening session ends. */
  const finalizeRealtime = async () => {
    const text = webSpeechFinalRef.current.trim();

    if (typeof window !== "undefined" && !navigator.onLine) {
      if (recordedBlobRef.current) await queueOfflineVoice(recordedBlobRef.current);
      else await queueOfflineText(text);
      return;
    }

    if (text) {
      // Use the realtime transcript directly — no backend STT cost.
      await runAgentPipeline(text);
    } else if (recordedBlobRef.current) {
      // Realtime heard nothing — fall back to batch transcription for accuracy.
      await processAudioBlob(recordedBlobRef.current);
    } else {
      setAgentResponse("I didn't hear anything. Please try again.");
      setAgentState("IDLE");
    }
  };

  /** Runs once both the recorder and recognition have fully stopped (realtime mode). */
  const tryFinalizeRealtime = () => {
    if (!useWebSpeechRef.current) return;
    if (!recorderDoneRef.current || !recognitionDoneRef.current) return;
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setLiveCaptioning(false);
    finalizeRealtime();
  };

  const startListening = useCallback(async () => {
    if(isBusy()) return;
    try {
      setError(null);
      setTranscript("");
      setInterimTranscript("");
      setAgentResponse("");

      // Reset coordination state for a fresh session
      stopRequestedRef.current = false;
      recorderDoneRef.current = false;
      recognitionDoneRef.current = false;
      finalizingRef.current = false;
      recordedBlobRef.current = null;
      webSpeechFinalRef.current = "";

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
        recordedBlobRef.current = audioBlob;

        if (useWebSpeechRef.current) {
          // Realtime mode: finalize once recognition also reports done.
          recorderDoneRef.current = true;
          tryFinalizeRealtime();
        } else {
          // Classic batch mode (Web Speech unsupported or failed).
          await processAudioBlob(audioBlob);
        }
      };

      // ── Attempt realtime streaming captions via Web Speech API ──
      const SpeechRecognitionCtor = getSpeechRecognitionCtor();
      if (SpeechRecognitionCtor && navigator.onLine) {
        try {
          const recognition = new SpeechRecognitionCtor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (e: any) => {
            let interim = "";
            let finalText = webSpeechFinalRef.current;
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const res = e.results[i];
              if (res.isFinal) finalText += res[0].transcript;
              else interim += res[0].transcript;
            }
            webSpeechFinalRef.current = finalText;
            setTranscript(finalText.trim());
            setInterimTranscript(interim.trim());
          };

          recognition.onerror = (e: any) => {
            // Fatal permission/capture errors → drop to batch transcription on stop.
            if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
              useWebSpeechRef.current = false;
              setLiveCaptioning(false);
            }
            // 'no-speech' / 'network' are recoverable; onend will restart while listening.
          };

          recognition.onend = () => {
            if (stopRequestedRef.current) {
              recognitionDoneRef.current = true;
              tryFinalizeRealtime();
            } else if (useWebSpeechRef.current) {
              // Browser auto-stopped mid-session — restart to keep capturing.
              try { recognition.start(); } catch { /* already started / cannot restart */ }
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
          useWebSpeechRef.current = true;
          setLiveCaptioning(true);
        } catch {
          // Could not start recognition — fall back to batch transcription.
          useWebSpeechRef.current = false;
          setLiveCaptioning(false);
        }
      } else {
        useWebSpeechRef.current = false;
        setLiveCaptioning(false);
      }

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
    if (agentState !== "LISTENING") return;

    stopRequestedRef.current = true;
    setAgentState("TRANSCRIBING");

    if (recognitionRef.current && useWebSpeechRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, [agentState]);

  const submitTextQuery = useCallback(async (text: string) => {
    if(isBusy()) return;
    try {
      setError(null);
      setInterimTranscript("");
      setAgentResponse("");
      await ensureAudioContext();
      await runAgentPipeline(text);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setAgentState("ERROR");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusy]);

  const getAnalyser = useCallback(() => {
    return analyserRef.current;
  }, []);

  return {
    agentState,
    transcript,
    interimTranscript,
    agentResponse,
    error,
    isBusy,
    liveCaptioning,
    startListening,
    stopListening,
    stopSpeaking,
    submitTextQuery,
    getAnalyser,
  };
}
