# VoxField PWA — Status Report

_Last reviewed: validation pass on the offline-first requirement._

This report covers every PWA feature, its status (**Implemented** / **Partially Implemented** / **Missing**), where it lives in code, and what was changed during this validation pass.

> **Important dev-mode note:** The service worker is **intentionally unregistered in development** (`src/components/voice/ServiceWorkerRegister.tsx`) because SW caching breaks Turbopack HMR. **All PWA behavior below only runs in a production build** (`npm run build && npm run start`). Test PWA features against a production build, not `npm run dev`.

---

## Summary table

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Installable PWA | **Implemented** (fixed) | Manifest now ships real PNG icons (192/512 + maskable); was previously `next.svg` which fails Chrome installability. |
| 2 | Service Worker registration | **Implemented** | Workbox 7, registers in prod, auto-reload on update, unregisters in dev. |
| 3 | Offline caching (runtime) | **Implemented** (improved) | Chunks/fonts/images/API/nav strategies + new offline fallback shell. |
| 4 | Offline caching (app data) | **Partially Implemented** | `cacheData`/`getCachedData` exist + tested but **not wired** into dashboards. See gaps. |
| 5 | Offline navigation fallback | **Implemented** (new) | Added `public/offline.html` precached + served on offline nav miss. |
| 6 | Background sync | **Implemented** | `voiceassistant-sync` tag + message bridge; graceful fallback for iOS. |
| 7 | Offline voice queue processing | **Implemented** | Audio blob stored in IndexedDB, transcribed via `/api/stt` on sync. |
| 8 | IndexedDB persistence | **Implemented** | 4 stores: `offline_queue`, `voice_recordings`, `sync_metadata`, `user_cache`. |
| 9 | Sync recovery after reconnect | **Implemented** | `online` event + 30s health ping → auto `syncOfflineQueue()`. |

---

## Detail by feature

### 1. Installable PWA — Implemented (fixed this pass)
- **Was:** `public/manifest.json` pointed icons at `/next.svg` (SVG). Chrome's install criteria require raster (PNG) icons ≥192px and 512px → **install prompt would not fire**.
- **Now:** generated `public/icons/icon-192.png`, `icon-512.png`, and `icon-maskable-512.png`; manifest updated with `id`, `scope`, `display_override`, `categories`, `lang`, and the PNG icon set. `layout.tsx` adds `apple-touch-icon` + iOS standalone meta tags.
- **Verify:** Chrome/Edge DevTools → Application → Manifest (no errors, "Installability" passes) → install icon in address bar.

### 2. Service Worker registration — Implemented
- `src/components/voice/ServiceWorkerRegister.tsx`, mounted in `src/app/layout.tsx`.
- Registers `/sw.js` on `load`, calls `registration.update()`, reloads on `controllerchange`.
- **Verify:** Application → Service Workers shows `sw.js` activated (prod build only).

### 3. Offline caching (runtime assets) — Implemented (improved)
- `public/sw.js` (Workbox 7, bumped to `v5`):
  - Next chunks/CSS → NetworkFirst, fonts → CacheFirst, images → StaleWhileRevalidate, API → NetworkFirst (excludes `stt`/`tts`/`sync-offline-queue`), navigation → NetworkFirst.
  - **New:** precaches the offline shell on `install`; old caches purged on `activate`.

### 4. Offline caching (app/dashboard data) — Partially Implemented ⚠️ (known gap)
- `cacheData()` / `getCachedData()` (`src/lib/indexeddb.ts`) and `user_cache` store exist and are unit-tested (`src/lib/__tests__/indexeddb.test.ts`) but are **not called anywhere in the app**.
- **Impact:** When fully offline, dashboard pages have no persisted data to render (they fall back to the offline shell instead of last-known data).
- **Recommendation (next step):** on each successful dashboard load, call `cacheData("dashboard-<role>-<userId>", data)`; in the dashboard container, hydrate from `getCachedData(...)` when `navigator.onLine === false` or a fetch fails.

### 5. Offline navigation fallback — Implemented (new this pass)
- **Was:** navigation used NetworkFirst with **no fallback** → offline nav to an unvisited page showed the browser's "no internet" error.
- **Now:** `public/offline.html` (branded "You're offline" screen) is precached and returned when both network and page cache miss. Auto-reloads when connectivity returns. Excluded from auth proxy in `src/proxy.ts`.

### 6. Background sync — Implemented
- SW listens for `sync` tag `voiceassistant-sync` → posts `BACKGROUND_SYNC_TRIGGER` to clients → `syncOfflineQueue()`.
- Registered in `ServiceWorkerRegister.tsx`.
- **Caveat:** Background Sync API is **not supported on iOS Safari**; covered by the `online`-event + periodic health-ping fallback (#9), so iOS still syncs on reconnect while the app is open.

### 7. Offline voice queue processing — Implemented
- `useVoiceAgent.ts` enqueues a `voice-query` item + raw audio blob when offline (`enqueueVoiceInteraction`).
- `src/lib/sync.ts` re-runs `/api/stt` on the stored blob, enriches with offline metadata (`isOffline`, `capturedAt`, `syncedAt`, `queueDuration`), then POSTs to `/api/sync-offline-queue`.
- Retry/backoff: attempt 2 → 1s, attempt 3 → 5s, ≥3 → manual only.

### 8. IndexedDB persistence — Implemented
- DB `voiceassistant_offline` v1, stores: `offline_queue`, `voice_recordings`, `sync_metadata`, `user_cache`.
- Status tracking: `PENDING_SYNC | SYNCING | SYNCED | FAILED` with `attempt_count` and `error`.

### 9. Sync recovery after reconnect — Implemented
- `window 'online'/'offline'` listeners + 30s `/api/health` ping in `sync.ts`; transition to online auto-triggers `syncOfflineQueue()`.

---

## Testing checklist (run on a production build)

```bash
npm run build && npm run start   # SW is disabled under `npm run dev`
```

**Desktop — Chrome & Edge**
- [ ] DevTools → Application → Manifest: no errors, icons render, "Installable".
- [ ] Install the app; launches standalone (own window).
- [ ] Application → Service Workers: `sw.js` activated.
- [ ] DevTools → Network → Offline → reload a previously visited page (served from cache); navigate to an unvisited page → branded offline screen.
- [ ] Offline → record a voice note / create a work order → item appears in offline queue (IndexedDB → `offline_queue`).
- [ ] Go back online → queue auto-syncs; `synced` count rises; transcript appears.

**Mobile — Android Chrome**
- [ ] "Add to Home screen" / install banner appears; opens standalone.
- [ ] Airplane mode → queue voice note → reconnect → syncs.

**Mobile — iPhone Safari**
- [ ] Share → "Add to Home Screen"; launches standalone with correct icon/title.
- [ ] Note: Background Sync API unsupported → confirm sync happens on reconnect **while app is open** (fallback path).

---

## Remaining gaps / recommended follow-ups
1. **Wire offline dashboard data cache** (#4) — highest-value remaining item for true offline-first read.
2. **Maskable icon polish** — current maskable icon uses a solid safe-zone background; verify in Chrome's "maskable" preview.
3. **iOS install UX** — consider an in-app "Add to Home Screen" hint for Safari (no native prompt).
