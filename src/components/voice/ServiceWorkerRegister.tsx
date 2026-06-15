"use client";

import { useEffect } from "react";
import { syncOfflineQueue } from "@/lib/sync";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In development, unregister ALL service workers and skip registration.
    // SW caching actively interferes with Turbopack HMR causing stale module errors.
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          reg.unregister().then(() => {
            console.log("Dev mode: Service Worker unregistered to prevent stale cache.");
          });
        });
        // Clear all SW caches in dev
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      });
      return;
    }

    // Production only: register SW and auto-reload on SW update
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("New service worker activated — reloading to clear stale chunks.");
      window.location.reload();
    });

    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered with scope:", registration.scope);

        // Force update check so new SW is detected immediately
        await registration.update();

        // Register Background Sync if supported
        const syncReg = (registration as any).sync;
        if (syncReg) {
          syncReg
            .register("voiceassistant-sync")
            .then(() => console.log("Background sync 'voiceassistant-sync' registered"))
            .catch((err: any) => console.warn("Failed to register background sync:", err));
        }
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    });

    // Listen for Background Sync notification messages from SW
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "BACKGROUND_SYNC_TRIGGER") {
        console.log("Triggering sync via Service Worker message event");
        syncOfflineQueue();
      }
    });
  }, []);

  return null;
}

