import { describe, it, expect, beforeAll, afterAll } from "vitest";
import "fake-indexeddb/auto";
import {
  initDb,
  enqueueVoiceInteraction,
  getPendingInteractions,
  markAsSynced,
  markAsFailed,
  getRecording,
  deleteRecording,
  getQueueStatus,
  cacheData,
  getCachedData,
  type QueueItem,
} from "../indexeddb";

describe("IndexedDB Wrapper", () => {
  beforeAll(() => {
    // Mock window to pass the browser detection check in indexeddb.ts
    global.window = global as any;
  });

  afterAll(() => {
    delete (global as any).window;
  });

  it("should initialize database and object stores", async () => {
    const db = await initDb();
    expect(db).toBeDefined();
    expect(db.objectStoreNames.contains("offline_queue")).toBe(true);
    expect(db.objectStoreNames.contains("voice_recordings")).toBe(true);
    expect(db.objectStoreNames.contains("sync_metadata")).toBe(true);
    expect(db.objectStoreNames.contains("user_cache")).toBe(true);
  });

  it("should enqueue and retrieve pending interactions", async () => {
    const item: QueueItem = {
      id: "test-uuid-1",
      operation: "create-work-order",
      payload: { title: "Repair AC", priority: "HIGH" },
      queuedAt: new Date().toISOString(),
      status: "PENDING_SYNC",
      attempt_count: 0,
      session_id: "session-1",
    };

    const recordingBlob = new Blob(["test audio"], { type: "audio/webm" });

    await enqueueVoiceInteraction(item, recordingBlob);

    const pending = await getPendingInteractions();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe("test-uuid-1");
    expect(pending[0].status).toBe("PENDING_SYNC");

    const blob = await getRecording("test-uuid-1");
    expect(blob).toBeDefined();
    expect(blob?.size).toBe(recordingBlob.size);
  });

  it("should mark item as synced and check status counters", async () => {
    await markAsSynced("test-uuid-1");

    const pending = await getPendingInteractions();
    expect(pending.length).toBe(0); // No longer pending

    const status = await getQueueStatus();
    expect(status.synced).toBe(1);
    expect(status.pending).toBe(0);
  });

  it("should mark item as failed and record error message", async () => {
    const item: QueueItem = {
      id: "test-uuid-2",
      operation: "voice-query",
      payload: { userPrompt: "Test query" },
      queuedAt: new Date().toISOString(),
      status: "PENDING_SYNC",
      attempt_count: 0,
      session_id: "session-2",
    };

    await enqueueVoiceInteraction(item);

    await markAsFailed("test-uuid-2", "Network error 500");

    const pending = await getPendingInteractions();
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe("FAILED");
    expect(pending[0].error).toBe("Network error 500");
    expect(pending[0].attempt_count).toBe(1);
  });

  it("should delete voice recording when requested", async () => {
    await deleteRecording("test-uuid-1");
    const blob = await getRecording("test-uuid-1");
    expect(blob).toBeNull();
  });

  it("should cache and retrieve user/dashboard data", async () => {
    await cacheData("dashboard-tech-1", { testData: "value" });
    const cached = await getCachedData("dashboard-tech-1");
    expect(cached).toEqual({ testData: "value" });
  });
});
