# VoxField Offline Sync Architecture

## Overview

VoxField is designed as an offline-first Progressive Web Application (PWA) that allows field technicians to continue working without network connectivity.

The system ensures that voice interactions, inspections, and operational actions can be captured locally and synchronized automatically when connectivity returns.

The offline architecture consists of four primary components:

1. Service Worker
2. IndexedDB Storage
3. Offline Queue Management
4. Automatic Synchronization Engine

---

# Offline Architecture

```text
User Action
      │
      ▼
Offline Detection
      │
      ▼
IndexedDB Queue
      │
      ▼
Local Persistence
      │
      ▼
Connectivity Restored
      │
      ▼
Sync Engine
      │
      ▼
API Submission
      │
      ▼
Supabase Database
```

The goal is to ensure no operational data is lost during network outages.

---

# Design Principles

VoxField's offline implementation follows the following principles:

### Offline First

Users should be able to continue working even when disconnected.

### Local Persistence

Data must survive:

* Browser refreshes
* Temporary outages
* Application restarts

### Automatic Recovery

Synchronization should occur automatically whenever possible.

### Graceful Degradation

Features unavailable offline should fail safely while preserving user actions.

---

# Service Worker Architecture

## Purpose

The Service Worker provides:

* Application caching
* Asset caching
* Offline navigation support
* Background sync registration

Location:

```text
public/sw.js
```

---

## Registration

The service worker is registered through:

```text
src/components/voice/ServiceWorkerRegister.tsx
```

and mounted globally in:

```text
src/app/layout.tsx
```

---

## Development Behavior

To avoid conflicts with Turbopack hot reload functionality:

```text
npm run dev
```

automatically unregisters the service worker.

PWA features only operate during:

```bash
npm run build
npm run start
```

---

# Runtime Caching

The service worker uses Workbox 7 for runtime caching.

## Next.js Assets

Strategy:

```text
NetworkFirst
```

Used for:

* JavaScript chunks
* CSS bundles

---

## Fonts

Strategy:

```text
CacheFirst
```

Used for:

* Google Fonts
* Static font assets

---

## Images

Strategy:

```text
StaleWhileRevalidate
```

Used for:

* Icons
* Images
* Static media

---

## API Requests

Strategy:

```text
NetworkFirst
```

Used for:

* Dashboard requests
* Data retrieval APIs

Excluded endpoints:

```text
/api/stt
/api/tts
/api/sync-offline-queue
```

These endpoints require live network connectivity.

---

# Offline Navigation Support

## Problem

Without a fallback page:

```text
Offline
 ↓
Navigate to new page
 ↓
Browser error page
```

This creates a poor user experience.

---

## Solution

A dedicated offline shell:

```text
public/offline.html
```

is precached during installation.

If both:

* Network fails
* Cache miss occurs

the offline page is returned automatically.

---

# IndexedDB Architecture

## Database

Database name:

```text
voiceassistant_offline
```

Version:

```text
v1
```

---

## Object Stores

### offline_queue

Stores pending actions awaiting synchronization.

Examples:

* Voice queries
* Work order actions
* Inspection actions

---

### voice_recordings

Stores raw audio blobs.

Purpose:

```text
Offline Voice Recording
           ↓
Store Audio Blob
           ↓
Reconnect
           ↓
Speech-to-Text Processing
```

---

### sync_metadata

Stores synchronization information.

Examples:

* Last sync time
* Sync state
* Retry information

---

### user_cache

Stores cached application data.

Purpose:

```text
Dashboard Data
      ↓
Local Cache
      ↓
Offline Access
```

Current status:

Partially implemented.

The storage layer exists but dashboard hydration is not yet wired into production pages.

---

# Offline Voice Workflow

Voice interactions are fully supported while offline.

## Step 1

User records speech.

```text
Technician
    ↓
Microphone
```

---

## Step 2

Application detects no connectivity.

```text
navigator.onLine === false
```

---

## Step 3

Voice interaction is queued.

Stored data:

* Audio blob
* Timestamp
* User metadata
* Queue information

---

## Step 4

Interaction receives:

```text
PENDING_SYNC
```

status.

---

## Step 5

When connectivity returns:

```text
online event
```

triggers synchronization.

---

## Step 6

Stored audio is transcribed.

```text
Audio Blob
      ↓
/api/stt
      ↓
Transcript
```

---

## Step 7

Transcript is processed through the normal AI workflow.

```text
/api/voice-query
```

---

## Step 8

Transcript and operational actions are committed to the database.

---

# Synchronization Engine

Location:

```text
src/lib/sync.ts
```

Responsibilities:

* Connectivity monitoring
* Queue processing
* Retry management
* Sync status tracking

---

## Connectivity Monitoring

Connectivity is determined through:

### Browser Events

```text
online
offline
```

---

### Health Checks

Periodic requests:

```text
/api/health
```

are executed every 30 seconds.

This prevents false-positive online states.

---

# Background Sync

## Purpose

Automatically synchronize queued items without requiring user interaction.

Flow:

```text
Queued Action
      ↓
Background Sync
      ↓
Sync Trigger
      ↓
Queue Processing
```

---

## Sync Tag

Registered tag:

```text
voiceassistant-sync
```

---

## Browser Support

### Supported

* Chrome
* Edge
* Chromium browsers

### Not Supported

* iOS Safari

---

## iOS Fallback

When Background Sync is unavailable:

```text
Reconnect
     ↓
online event
     ↓
syncOfflineQueue()
```

This ensures queued items still synchronize while the application is open.

---

# Queue Status Lifecycle

Every queued item follows a state machine.

```text
PENDING_SYNC
      │
      ▼
SYNCING
      │
      ▼
SYNCED
```

If synchronization fails:

```text
SYNCING
      │
      ▼
FAILED
```

---

# Retry Strategy

The synchronization engine implements controlled retries.

| Attempt | Delay                 |
| ------- | --------------------- |
| 1       | Immediate             |
| 2       | 1 second              |
| 3       | 5 seconds             |
| 4+      | Manual retry required |

This prevents excessive server requests during unstable connectivity.

---

# Offline Metadata

The synchronization process enriches submissions with offline context.

Stored metadata includes:

| Field         | Description                           |
| ------------- | ------------------------------------- |
| isOffline     | Whether the action originated offline |
| capturedAt    | Original capture time                 |
| syncedAt      | Synchronization completion time       |
| queueDuration | Time spent waiting in queue           |

This information is persisted in transcript records.

---

# Current Limitations

## Dashboard Data Caching

Current status:

```text
Partially Implemented
```

The caching infrastructure exists but dashboard pages do not yet restore previously cached data when fully offline.

Recommended improvement:

```text
cacheData()
       ↓
Store dashboard payload
       ↓
getCachedData()
       ↓
Hydrate UI while offline
```

---

## iOS Background Sync

Safari does not support the Background Sync API.

Current workaround:

```text
online event
```

based synchronization.

---

# Testing Offline Functionality

## Production Build Required

PWA functionality must be tested using:

```bash
npm run build
npm run start
```

Testing under:

```bash
npm run dev
```

is not supported because the service worker is disabled.

---

## Validation Checklist

### Desktop

* Install application
* Verify service worker activation
* Disable network
* Create voice interaction
* Confirm IndexedDB queue entry
* Re-enable network
* Verify automatic synchronization

### Android

* Install via Add to Home Screen
* Queue offline interaction
* Reconnect
* Verify sync

### iOS

* Add to Home Screen
* Queue offline interaction
* Reconnect while application remains open
* Verify sync

---

# Future Improvements

Planned enhancements include:

1. Offline dashboard hydration
2. Enhanced cache invalidation
3. Improved iOS install guidance
4. Additional background synchronization metrics
5. Offline analytics and monitoring

The current architecture provides reliable offline voice interaction and synchronization while maintaining a clear path toward a fully offline-capable operational dashboard.

```
```
