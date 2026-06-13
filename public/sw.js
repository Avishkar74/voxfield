importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

if (self.workbox) {
  // Cache the App Shell and Next.js bundles
  self.workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "font",
    new self.workbox.strategies.CacheFirst({
      cacheName: "static-assets",
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Stale While Revalidate for images and icons
  self.workbox.routing.registerRoute(
    ({ request }) => request.destination === "image",
    new self.workbox.strategies.StaleWhileRevalidate({
      cacheName: "images",
    })
  );

  // Network First for API routes (excluding sync endpoints)
  self.workbox.routing.registerRoute(
    ({ url }) =>
      url.pathname.startsWith("/api/") &&
      !url.pathname.includes("sync-offline-queue") &&
      !url.pathname.includes("stt") &&
      !url.pathname.includes("tts"),
    new self.workbox.strategies.NetworkFirst({
      cacheName: "api-cache",
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 Hours
        }),
      ],
    })
  );

  // Network First for Navigation
  self.workbox.routing.registerRoute(
    ({ request }) => request.mode === "navigate",
    new self.workbox.strategies.NetworkFirst({
      cacheName: "pages",
    })
  );

  // Register Background Sync Event
  self.addEventListener("sync", (event) => {
    if (event.tag === "voiceassistant-sync") {
      event.waitUntil(
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "BACKGROUND_SYNC_TRIGGER" });
          });
        })
      );
    }
  });
}
