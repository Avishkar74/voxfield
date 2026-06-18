importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

// CACHE VERSION - bump this to force SW update and clear old caches
const CACHE_VERSION = "v5";

// App-shell assets to precache so the app can boot fully offline
const OFFLINE_URL = "/offline.html";
const PRECACHE_NAME = `precache-${CACHE_VERSION}`;
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json"];

// Force immediate activation — don't wait for existing tabs to close,
// and precache the offline fallback shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
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

  // ─── Navigation → NetworkFirst, with offline.html fallback when both
  // the network and the page cache miss (true offline, page never visited).
  const navigationHandler = new self.workbox.strategies.NetworkFirst({
    cacheName: `pages-${CACHE_VERSION}`,
    networkTimeoutSeconds: 5,
  });
  self.workbox.routing.registerRoute(
    ({ request }) => request.mode === "navigate",
    async (args) => {
      try {
        const response = await navigationHandler.handle(args);
        if (response) return response;
      } catch (err) {
        // fall through to offline shell
      }
      const cache = await caches.open(PRECACHE_NAME);
      return (await cache.match(OFFLINE_URL)) || Response.error();
    }
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
