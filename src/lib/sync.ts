import {
  getPendingInteractions,
  getRecording,
  deleteRecording,
  markAsSynced,
  markAsFailed,
  QueueItem,
  getQueueStatus,
} from "./indexeddb";

let isSyncing = false;
let syncStatusListener: ((status: { pending: number; syncing: number; synced: number; failed: number }) => void) | null = null;
let networkStatusListener: ((online: boolean) => void) | null = null;
let onlineState = true;

if (typeof window !== "undefined") {
  onlineState = navigator.onLine;
}

export function subscribeToSyncStatus(listener: typeof syncStatusListener) {
  syncStatusListener = listener;
  // Trigger immediate update
  triggerStatusUpdate();
}

export function subscribeToNetworkStatus(listener: typeof networkStatusListener) {
  networkStatusListener = listener;
  listener?.(onlineState);
}

async function triggerStatusUpdate() {
  if (syncStatusListener) {
    const status = await getQueueStatus();
    syncStatusListener(status);
  }
}

export async function checkConnectivity(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const isOk = res.ok;
    setOnlineState(isOk);
    return isOk;
  } catch {
    setOnlineState(false);
    return false;
  }
}

function setOnlineState(online: boolean) {
  if (onlineState !== online) {
    onlineState = online;
    networkStatusListener?.(onlineState);
    if (online) {
      // Trigger sync automatically when reconnected
      syncOfflineQueue();
    }
  }
}

export async function syncOfflineQueue(force = false): Promise<void> {
  if (isSyncing) return;
  
  // Verify online before syncing
  const isOnline = await checkConnectivity();
  if (!isOnline && !force) {
    return;
  }

  isSyncing = true;
  await triggerStatusUpdate();

  try {
    const pendingItems = await getPendingInteractions();
    if (pendingItems.length === 0) {
      isSyncing = false;
      await triggerStatusUpdate();
      return;
    }

    // Process one by one or in small batches
    for (let i = 0; i < pendingItems.length; i += 10) {
      const batch = pendingItems.slice(i, i + 10);
      const readyBatch: any[] = [];

      for (const item of batch) {
        // Implement backoff delays: Attempt 1: 0s, Attempt 2: 1s, Attempt 3: 5s, Attempt 4+: manual
        const delay = item.attempt_count === 1 ? 1000 : item.attempt_count === 2 ? 5000 : 0;
        if (item.attempt_count >= 3 && !force) {
          // Skip auto-retry after 3 failed attempts, requires manual sync trigger
          continue;
        }

        if (delay > 0 && !force) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
          let finalPayload = { ...item.payload };

          // If voice-query has an associated raw recording blob, transcribe it first
          if (item.operation === "voice-query") {
            const recordingBlob = await getRecording(item.id);
            if (recordingBlob) {
              const formData = new FormData();
              formData.append("audio", recordingBlob, "recording.webm");

              const sttRes = await fetch("/api/stt", {
                method: "POST",
                body: formData,
              });

              if (!sttRes.ok) {
                throw new Error("Failed to transcribe offline voice recording");
              }

              const sttData = await sttRes.json();
              if (!sttData.text) {
                throw new Error("Transcribed audio was empty");
              }

              finalPayload.userPrompt = sttData.text;
              // Clear local recording after successful transcription
              await deleteRecording(item.id);
            }
          }

          readyBatch.push({
            id: item.id,
            operation: item.operation,
            payload: finalPayload,
            queuedAt: item.queuedAt,
            // Track item internally to mark it after batch response
            _originalItem: item,
          });
        } catch (err: any) {
          await markAsFailed(item.id, err.message || "STT/Pre-processing failed");
        }
      }

      if (readyBatch.length === 0) continue;

      try {
        const res = await fetch("/api/sync-offline-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: readyBatch.map(b => ({
              id: b.id,
              operation: b.operation,
              payload: b.payload,
              queuedAt: b.queuedAt,
            })),
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned sync error status: ${res.status}`);
        }

        const syncResult = await res.json();
        
        // Mark all processed batch items as synced
        for (const item of readyBatch) {
          const original = item._originalItem;
          // Check if there was an error message mentioning this specific item in the result message
          const serverMessage = syncResult.data?.message || "";
          if (syncResult.data?.failed > 0 && serverMessage.includes(original.id)) {
            await markAsFailed(original.id, "Server failed to process queued item");
          } else {
            await markAsSynced(original.id);
          }
        }
      } catch (err: any) {
        for (const item of readyBatch) {
          await markAsFailed(item._originalItem.id, err.message || "Network batch post failed");
        }
      }
    }
  } finally {
    isSyncing = false;
    await triggerStatusUpdate();
  }
}

// Setup listeners if in the browser
if (typeof window !== "undefined") {
  window.addEventListener("online", () => setOnlineState(true));
  window.addEventListener("offline", () => setOnlineState(false));

  // Run periodic health pings every 30 seconds
  setInterval(() => {
    checkConnectivity();
  }, 30000);

  // Initial sync attempt
  setTimeout(() => {
    syncOfflineQueue();
  }, 3000);
}
