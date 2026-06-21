/**
 * VoiceAgentControls — drop-in UI patch for Tasks 4b, 5, 6
 *
 * Wires up:
 *   - stopSpeaking() button (Task 4b)
 *   - isBusy() disables mic (Task 5)
 *   - Pulsing recording indicator (Task 6)
 *   - State label (Task 4 — shows Listening / Transcribing / Thinking / Speaking)
 *
 * Replace your existing mic button JSX with this component, or copy the
 * relevant pieces into your existing voice UI file.
 */

"use client";

import { useVoiceAgent } from "@/hooks/useVoiceAgent"; // adjust path as needed

// ─── State label map ────────────────────────────────────────────────────────
const STATE_LABELS: Record<string, string> = {
  IDLE: "Tap to speak",
  LISTENING: "Listening...",
  TRANSCRIBING: "Transcribing...",
  THINKING: "Thinking...",
  PROCESSING: "Processing...",
  SPEAKING: "Speaking...",
  ERROR: "Error — tap to retry",
};

// ─── Component ───────────────────────────────────────────────────────────────
export function VoiceAgentControls() {
  const {
    agentState,
    transcript,
    agentResponse,
    error,
    isBusy,
    startListening,
    stopListening,
    stopSpeaking,
    submitTextQuery,
  } = useVoiceAgent();

  const isListening   = agentState === "LISTENING";
  const isSpeaking    = agentState === "SPEAKING";
  const busy          = isBusy();               // Task 5: any in-flight state
  const stateLabel    = STATE_LABELS[agentState] ?? agentState;

  return (
    <div className="flex flex-col items-center gap-4">

      {/* ── State label (Task 4) ─────────────────────────────── */}
      <p className="text-sm text-muted-foreground min-h-[1.25rem]">
        {stateLabel}
      </p>

      {/* ── Recording indicator (Task 6) ─────────────────────── */}
      {isListening && (
        <div className="flex items-center gap-2">
          {/* Pulsing red dot */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-xs text-red-500 font-medium">Recording</span>
        </div>
      )}

      {/* ── Mic button (Task 5: greyed + disabled when busy) ─── */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={busy && !isListening}          // allow stopListening while LISTENING
        aria-label={isListening ? "Stop recording" : "Start recording"}
        className={[
          "rounded-full w-16 h-16 flex items-center justify-center transition-all",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white"              // actively recording
            : busy
            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" // Task 5: greyed
            : "bg-primary hover:bg-primary/90 text-primary-foreground",      // idle
        ].join(" ")}
      >
        {isListening ? (
          /* Stop icon */
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          /* Mic icon */
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
            <path d="M19 10a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V21H9v2h6v-2h-2v-2.06A9 9 0 0 0 21 10h-2z" />
          </svg>
        )}
      </button>

      {/* ── Stop Speaking button (Task 4b) ───────────────────── */}
      {isSpeaking && (
        <button
          onClick={stopSpeaking}
          aria-label="Stop speaking"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border
                     bg-background hover:bg-muted text-sm font-medium transition-colors"
        >
          {/* Stop / square icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
          Stop speaking
        </button>
      )}

      {/* ── Cancel in-flight request button (Task 4b) ────────── */}
      {(agentState === "THINKING" || agentState === "PROCESSING" || agentState === "TRANSCRIBING") && (
        <button
          onClick={() => {
            // Best effort — we can't abort the fetch without AbortController,
            // but we can reset UI state so user can try again.
            // For full abort support, wire an AbortController into processAudioBlob.
            window.location.reload(); // TODO: replace with AbortController signal
          }}
          aria-label="Cancel request"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Cancel
        </button>
      )}

      {/* ── Error message (Task 7) ───────────────────────────── */}
      {error && agentState === "ERROR" && (
        <p className="text-sm text-destructive text-center max-w-xs" role="alert">
          {error}
        </p>
      )}

      {/* ── Transcript + response display ───────────────────── */}
      {transcript && (
        <p className="text-sm text-muted-foreground italic">You: {transcript}</p>
      )}
      {agentResponse && (
        <p className="text-sm text-foreground font-medium text-center max-w-xs">{agentResponse}</p>
      )}

    </div>
  );
}