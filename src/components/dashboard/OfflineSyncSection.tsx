"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  subscribeToNetworkStatus,
  subscribeToSyncStatus,
  syncOfflineQueue,
  checkConnectivity,
} from "@/lib/sync";

/**
 * Offline Sync Status — dedicated dashboard section.
 * Data source: IndexedDB (offline queue) and sync engine.
 * Completely separate from the header OfflineStatus indicator.
 */
export function OfflineSyncSection() {
  const [online, setOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState({
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    subscribeToNetworkStatus((status) => setOnline(status));
    subscribeToSyncStatus((status) => {
      setQueueStatus(status);
      setIsLoading(false);
    });
    checkConnectivity();

    // Read last sync time from localStorage (persisted by sync engine)
    const storedSync = localStorage.getItem("voxfield_last_sync");
    if (storedSync) setLastSyncTime(storedSync);
  }, []);

  // Update last sync time when syncing completes
  useEffect(() => {
    if (queueStatus.syncing > 0) {
      // Syncing in progress — do nothing yet
    } else if (queueStatus.synced > 0) {
      const now = new Date().toISOString();
      localStorage.setItem("voxfield_last_sync", now);
      setLastSyncTime(now);
    }
  }, [queueStatus.syncing, queueStatus.synced]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[220px]">
        <RefreshCw className="w-7 h-7 text-[#D14923] animate-spin mb-3" />
        <h3 className="text-gray-950 font-bold text-sm">Loading Sync Status...</h3>
        <p className="text-gray-400 text-xs mt-1">Reading offline queue from IndexedDB</p>
      </div>
    );
  }

  const handleManualSync = async () => {
    setIsRetrying(true);
    await syncOfflineQueue(true);
    setIsRetrying(false);
    const now = new Date().toISOString();
    localStorage.setItem("voxfield_last_sync", now);
    setLastSyncTime(now);
  };

  const totalPending = queueStatus.pending + queueStatus.syncing;
  const hasFailed = queueStatus.failed > 0;
  const isSyncing = queueStatus.syncing > 0 || isRetrying;

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          {online ? (
            <Wifi className="w-5 h-5 text-emerald-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-500" />
          )}
          Offline Sync Status
        </h2>
        <span
          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border tracking-wider ${
            online
              ? "text-emerald-700 bg-emerald-50 border-emerald-100"
              : "text-amber-700 bg-amber-50 border-amber-100"
          }`}
        >
          {online ? "Online" : "Offline"}
        </span>
      </div>

      {/* Status grid */}
      <div className="p-5 space-y-4">
        {/* Connection status row */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Connection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
            />
            <span className={`text-xs font-semibold ${online ? "text-emerald-600" : "text-amber-600"}`}>
              {online ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Pending queue row */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
            Pending queue
          </div>
          <div className="flex items-center gap-1.5">
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            ) : totalPending > 0 ? (
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span
              className={`text-xs font-semibold ${
                isSyncing
                  ? "text-blue-600"
                  : totalPending > 0
                  ? "text-amber-600"
                  : "text-emerald-600"
              }`}
            >
              {isSyncing
                ? "Syncing…"
                : totalPending > 0
                ? `${totalPending} pending`
                : "All synced"}
            </span>
          </div>
        </div>

        {/* Failed items row — only show if relevant */}
        {hasFailed && (
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              Failed items
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-600">
                {queueStatus.failed} failed
              </span>
            </div>
          </div>
        )}

        {/* Last sync time */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
            Last sync
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {lastSyncTime ? formatTime(lastSyncTime) : "Not yet synced"}
          </span>
        </div>

        {/* Progress bar while syncing */}
        {isSyncing && (
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[#D14923] rounded-full animate-pulse"
              style={{ width: "60%" }}
            />
          </div>
        )}

        {/* Manual sync button — shown when online and there are items to sync or failures */}
        {online && (totalPending > 0 || hasFailed) && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#D14923] hover:bg-[#B73D1C] text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing…" : hasFailed ? "Retry Failed Items" : "Sync Now"}
          </button>
        )}

        {/* All clear state */}
        {!isSyncing && totalPending === 0 && !hasFailed && (
          <div className="flex items-center justify-center gap-2 py-2 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold">All interactions synced</span>
          </div>
        )}
      </div>
    </div>
  );
}
