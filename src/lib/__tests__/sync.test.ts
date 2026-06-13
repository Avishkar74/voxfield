import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { syncOfflineQueue, checkConnectivity } from "../sync";
import * as db from "../indexeddb";

// Mock indexeddb.ts wrapper functions
vi.mock("../indexeddb", () => {
  return {
    getPendingInteractions: vi.fn().mockResolvedValue([]),
    getRecording: vi.fn(),
    deleteRecording: vi.fn(),
    markAsSynced: vi.fn(),
    markAsFailed: vi.fn(),
    getQueueStatus: vi.fn().mockResolvedValue({ pending: 0, syncing: 0, synced: 0, failed: 0 }),
  };
});

describe("Sync Engine", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
    });
    vi.clearAllMocks();
    // Default mock implementation
    vi.mocked(db.getPendingInteractions).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should check connectivity via health endpoint", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const isOnline = await checkConnectivity();
    expect(isOnline).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("/api/health", { cache: "no-store" });
  });

  it("should skip syncing if disconnected", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: false } as Response); // health check offline

    await syncOfflineQueue();

    expect(db.getPendingInteractions).not.toHaveBeenCalled();
  });

  it("should sync pending items sequentially, calling STT for voice queries", async () => {
    const mockFetch = vi.mocked(fetch);
    
    // Conditional implementation for fetch to avoid order alignment issues
    mockFetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true } as Response;
      }
      if (url === "/api/stt") {
        return {
          ok: true,
          json: async () => ({ text: "Translated Prompt text" }),
        } as Response;
      }
      if (url === "/api/sync-offline-queue") {
        return {
          ok: true,
          json: async () => ({ data: { success: 1, failed: 0 } }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    const pendingItem: db.QueueItem = {
      id: "voice-1",
      operation: "voice-query",
      payload: {},
      queuedAt: new Date().toISOString(),
      status: "PENDING_SYNC",
      attempt_count: 0,
      session_id: "s-1",
    };

    vi.mocked(db.getPendingInteractions).mockResolvedValueOnce([pendingItem]);
    
    // mock voice recording blob exists
    const mockBlob = new Blob(["audio"], { type: "audio/webm" });
    vi.mocked(db.getRecording).mockResolvedValueOnce(mockBlob);

    await syncOfflineQueue();

    // Verify STT call
    expect(mockFetch).toHaveBeenCalledWith("/api/stt", expect.any(Object));
    // Verify sync submit call
    expect(mockFetch).toHaveBeenCalledWith("/api/sync-offline-queue", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("Translated Prompt text"),
    }));

    expect(db.markAsSynced).toHaveBeenCalledWith("voice-1");
    expect(db.deleteRecording).toHaveBeenCalledWith("voice-1");
  });

  it("should mark item as failed if sync endpoint returns error", async () => {
    const mockFetch = vi.mocked(fetch);
    
    mockFetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true } as Response;
      }
      if (url === "/api/sync-offline-queue") {
        return { ok: false, status: 500 } as Response;
      }
      return { ok: false } as Response;
    });

    const pendingItem: db.QueueItem = {
      id: "wo-1",
      operation: "create-work-order",
      payload: { title: "Work order" },
      queuedAt: new Date().toISOString(),
      status: "PENDING_SYNC",
      attempt_count: 0,
      session_id: "s-2",
    };

    vi.mocked(db.getPendingInteractions).mockResolvedValueOnce([pendingItem]);

    await syncOfflineQueue();

    expect(db.markAsFailed).toHaveBeenCalledWith("wo-1", expect.stringContaining("500"));
    expect(db.markAsSynced).not.toHaveBeenCalled();
  });
});
