importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

// CACHE VERSION - bump this to force SW update and clear old caches
const CACHE_VERSION = "v4";

// Force immediate activation — don't wait for existing tabs to close
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

if (self.workbox) {
  // On activation, claim clients immediately and clear old caches
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.endsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      ).then(() => self.clients.claim())
    );
  });

  // ─── Next.js JS/CSS chunks → NetworkFirst (MUST be fresh, never cache-first)
  // This prevents the "stale module factory" error in Turbopack dev
  self.workbox.routing.registerRoute(
    ({ request, url }) =>
      request.destination === "script" ||
      request.destination === "style" ||
      url.pathname.startsWith("/_next/"),
    new self.workbox.strategies.NetworkFirst({
      cacheName: `nextjs-chunks-${CACHE_VERSION}`,
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60, // 1 hour max - revalidates on each load
        }),
        new self.workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // ─── Fonts → CacheFirst (safe to cache long-term)
  self.workbox.routing.registerRoute(
    ({ request }) => request.destination === "font",
    new self.workbox.strategies.CacheFirst({
      cacheName: `fonts-${CACHE_VERSION}`,
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );

  // ─── Images → StaleWhileRevalidate
  self.workbox.routing.registerRoute(
    ({ request }) => request.destination === "image",
    new self.workbox.strategies.StaleWhileRevalidate({
      cacheName: `images-${CACHE_VERSION}`,
    })
  );

  // ─── API routes → NetworkFirst (excluding offline sync + binary routes)
  self.workbox.routing.registerRoute(
    ({ url }) =>
      url.pathname.startsWith("/api/") &&
      !url.pathname.includes("sync-offline-queue") &&
      !url.pathname.includes("stt") &&
      !url.pathname.includes("tts"),
    new self.workbox.strategies.NetworkFirst({
      cacheName: `api-cache-${CACHE_VERSION}`,
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    })
  );

  // ─── Navigation → NetworkFirst
  self.workbox.routing.registerRoute(
    ({ request }) => request.mode === "navigate",
    new self.workbox.strategies.NetworkFirst({
      cacheName: `pages-${CACHE_VERSION}`,
    })
  );

  // ─── Background Sync Event
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
