"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import {
  subscribeToNetworkStatus,
  subscribeToSyncStatus,
  syncOfflineQueue,
  checkConnectivity,
} from "@/lib/sync";

export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [queueStatus, setQueueStatus] = useState({
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
  });
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    subscribeToNetworkStatus((status) => setOnline(status));
    subscribeToSyncStatus((status) => setQueueStatus(status));
    
    // Periodically verify network on mount
    checkConnectivity();
  }, []);

  const handleManualSync = async () => {
    setIsRetrying(true);
    await syncOfflineQueue(true); // force sync failed/skipped items
    setIsRetrying(false);
  };

  const totalOfflineCount = queueStatus.pending + queueStatus.syncing + queueStatus.failed;

  return (
    <div className="flex flex-col md:flex-row items-center gap-3 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm max-w-fit transition-all duration-300">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3.5 w-3.5">
          {online ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </>
          ) : (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
            </>
          )}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {online ? "System Online" : "System Offline"}
        </span>
      </div>

      {totalOfflineCount > 0 && (
        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 pt-2 md:pt-0 md:pl-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
            {queueStatus.failed > 0 ? (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
            )}
            <span>
              {queueStatus.failed > 0
                ? `${queueStatus.failed} sync failed`
                : `${totalOfflineCount} pending synchronization`}
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleManualSync}
            disabled={isRetrying}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            <span>Retry</span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
