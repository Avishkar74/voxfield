"use client";

import { useState, useRef, useCallback } from "react";

export type AgentState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR";

export function useVoiceAgent() {
  const [agentState, setAgentState] = useState<AgentState>("IDLE");
  const [transcript, setTranscript] = useState<string>("");
  const [agentResponse, setAgentResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript("");
      setAgentResponse("");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
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
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudioBlob(audioBlob);
      };

      mediaRecorder.start(1000);
      setAgentState("LISTENING");
    } catch (err: any) {
      setError(err.message || "Microphone access denied");
      setAgentState("ERROR");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && agentState === "LISTENING") {
      mediaRecorderRef.current.stop();
      setAgentState("PROCESSING");
    }
  }, [agentState]);

  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      // 1. STT (Speech to Text)
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const sttRes = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });

      if (!sttRes.ok) throw new Error("Transcription failed");
      const sttData = await sttRes.json();
      
      const text = sttData.text;
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

      // 3. TTS (Text to Speech)
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      });

      if (!ttsRes.ok) throw new Error("Text-to-speech failed");
      
      const audioBlobRes = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlobRes);
      
      const audio = new Audio(audioUrl);
      playbackAudioRef.current = audio;
      
      audio.onplay = () => setAgentState("SPEAKING");
      audio.onended = () => setAgentState("IDLE");
      audio.onerror = () => {
        setError("Audio playback failed");
        setAgentState("ERROR");
      };
      
      await audio.play();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setAgentState("ERROR");
    }
  };

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
    getAnalyser,
  };
}
