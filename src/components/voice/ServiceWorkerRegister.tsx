"use client";

import { useEffect } from "react";
import { syncOfflineQueue } from "@/lib/sync";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);

            // Register Background Sync if supported
            const syncReg = (registration as any).sync;
            if (syncReg) {
              syncReg
                .register("voiceassistant-sync")
                .then(() => console.log("Background sync 'voiceassistant-sync' registered"))
                .catch((err: any) => console.warn("Failed to register background sync:", err));
            }
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      });

      // Listen for Background Sync notification messages from SW
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "BACKGROUND_SYNC_TRIGGER") {
          console.log("Triggering sync via Service Worker message event");
          syncOfflineQueue();
        }
      });
    }
  }, []);

  return null;
}
