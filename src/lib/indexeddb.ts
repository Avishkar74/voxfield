export interface QueueItem {
  id: string; // UUID
  operation: "create-inspection" | "create-work-order" | "update-work-order" | "voice-query";
  payload: Record<string, any>;
  queuedAt: string;
  status: "PENDING_SYNC" | "SYNCING" | "SYNCED" | "FAILED";
  attempt_count: number;
  session_id: string;
  error?: string;
}

const DB_NAME = "voiceassistant_offline";
const DB_VERSION = 1;

export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains("offline_queue")) {
        db.createObjectStore("offline_queue", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("voice_recordings")) {
        db.createObjectStore("voice_recordings", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sync_metadata")) {
        db.createObjectStore("sync_metadata", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("user_cache")) {
        db.createObjectStore("user_cache", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueVoiceInteraction(item: QueueItem, recordingBlob?: Blob): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["offline_queue", "voice_recordings"], "readwrite");
    
    tx.objectStore("offline_queue").put(item);
    
    if (recordingBlob) {
      tx.objectStore("voice_recordings").put({ id: item.id, blob: recordingBlob });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingInteractions(): Promise<QueueItem[]> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_queue", "readonly");
    const store = tx.objectStore("offline_queue");
    const request = store.getAll();

    request.onsuccess = () => {
      const allItems = request.result as QueueItem[];
      // Filter items that need syncing
      const pending = allItems
        .filter(item => item.status === "PENDING_SYNC" || item.status === "FAILED")
        .sort((a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime());
      resolve(pending);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function markAsSynced(queueId: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_queue", "readwrite");
    const store = tx.objectStore("offline_queue");
    const getReq = store.get(queueId);

    getReq.onsuccess = () => {
      const item = getReq.result as QueueItem;
      if (item) {
        item.status = "SYNCED";
        store.put(item);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function markAsFailed(queueId: string, errorMsg: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_queue", "readwrite");
    const store = tx.objectStore("offline_queue");
    const getReq = store.get(queueId);

    getReq.onsuccess = () => {
      const item = getReq.result as QueueItem;
      if (item) {
        item.attempt_count += 1;
        item.status = "FAILED";
        item.error = errorMsg;
        store.put(item);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteRecording(queueId: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("voice_recordings", "readwrite");
    tx.objectStore("voice_recordings").delete(queueId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRecording(queueId: string): Promise<Blob | null> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("voice_recordings", "readonly");
    const req = tx.objectStore("voice_recordings").get(queueId);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueueStatus(): Promise<{ pending: number; syncing: number; synced: number; failed: number }> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_queue", "readonly");
    const req = tx.objectStore("offline_queue").getAll();

    req.onsuccess = () => {
      const items = req.result as QueueItem[];
      const status = { pending: 0, syncing: 0, synced: 0, failed: 0 };
      items.forEach(item => {
        if (item.status === "PENDING_SYNC") status.pending++;
        else if (item.status === "SYNCING") status.syncing++;
        else if (item.status === "SYNCED") status.synced++;
        else if (item.status === "FAILED") status.failed++;
      });
      resolve(status);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function cacheData(key: string, data: any): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("user_cache", "readwrite");
    tx.objectStore("user_cache").put({ key, data, cachedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedData(key: string): Promise<any | null> {
  try {
    const db = await initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("user_cache", "readonly");
      const req = tx.objectStore("user_cache").get(key);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
