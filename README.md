# VoxField

> **Voice-First AI Assistant for Field Service Operations**

A Progressive Web Application (PWA) that enables field technicians to interact with operational systems through natural voice commands — creating inspections, querying equipment history, managing work orders, and receiving spoken AI responses — all without typing, even offline.

---

## Features

| Feature | Description |
|---------|-------------|
| 🎤 **Voice Input** | Tap-to-speak microphone with real-time waveform visualisation |
| 🤖 **AI Agent** | GPT-4o with tool-calling — understands intent and executes actions |
| 🔊 **Voice Output** | Responses delivered as spoken audio (OpenAI TTS-1-HD) |
| 📋 **Work Orders** | Create, view, and update work orders by voice or UI |
| 🔍 **Inspections** | Create inspection reports with severity classification |
| ⚡ **Offline Mode** | Full offline operation — interactions queued for automatic sync |
| 🔄 **Auto-Sync** | Offline queue syncs automatically when connectivity returns |
| 👷 **Technician Dashboard** | Mobile-first interface for field operations |
| 📊 **Supervisor Dashboard** | Real-time oversight, alerts, activity feed, transcript monitoring |
| 🔒 **Role-Based Access** | JWT + PostgreSQL RLS enforces data isolation |

---

## Architecture Overview

```
Browser (PWA) ──→ Next.js 16 API Routes ──→ Supabase PostgreSQL
                        │
                   AI Agent (GPT-4o)
                        │
               ┌────────┴────────┐
         AssemblyAI STT    OpenAI TTS
```

For full architecture documentation, see [PROJECT_EXPLANATION.md](./PROJECT_EXPLANATION.md).

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth (JWT) |
| AI Agent | OpenAI GPT-4o |
| Speech-to-Text | AssemblyAI Universal-1 |
| Text-to-Speech | OpenAI TTS-1-HD |
| Offline Storage | IndexedDB |
| PWA | Web App Manifest + Service Worker |

---

## Installation

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project
- OpenAI API key
- AssemblyAI API key

### Clone and Install

```bash
git clone https://github.com/your-org/voxfield.git
cd voxfield
npm install
```

---

## Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# AssemblyAI
ASSEMBLYAI_API_KEY=your-key
```

---

## Database Setup

### 1. Apply Migrations

Run the following SQL files in your Supabase Dashboard (SQL Editor) **in order**:

```
supabase/001_initial_schema.sql
supabase/002_rls_policies.sql
supabase/003_auth_triggers.sql
supabase/004_security_hardening.sql
```

### 2. Load Development Data

To populate the dashboard with realistic industrial data:

```
supabase/seed_dev.sql
```

This creates 6 equipment items, 11 repair history records, 5 inspections, 5 work orders, 12 activity logs, and 11 voice transcripts — all linked with proper relationships.

---

## Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/login`.

---

## Development Accounts

> ⚠️ **For development use only.** Do not use these credentials in production.

| Role | Email | Password |
|------|-------|---------|
| Technician | `technician@gmail.com` | `tech123` |
| Supervisor | `supervisor@gmail.com` | `sup123` |

These accounts must first be created via the application's **Sign Up** interface at `http://localhost:3000/login` to set up their auth identities correctly, then the `supabase/seed_dev.sql` script is executed in Supabase to seed and link operational data to them.

---

## Project Structure

```
voxfield/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/login/       # Login page
│   │   ├── (dashboard)/        # Protected dashboard pages
│   │   │   ├── technician/     # Technician dashboard
│   │   │   └── supervisor/     # Supervisor dashboard
│   │   └── api/                # API route handlers
│   │       ├── voice-query/    # AI agent endpoint
│   │       ├── stt/            # Speech-to-text
│   │       ├── tts/            # Text-to-speech
│   │       ├── inspections/    # Inspection CRUD
│   │       ├── work-orders/    # Work order CRUD
│   │       ├── equipment/      # Equipment history
│   │       ├── dashboard/      # Dashboard data APIs
│   │       └── sync-offline-queue/
│   ├── components/
│   │   ├── layout/             # AppLayout (sidebar, header)
│   │   ├── voice/              # VoiceInput, ServiceWorkerRegister
│   │   └── dashboard/          # All dashboard cards and sections
│   ├── services/
│   │   └── operations.service.ts # Core service layer
│   ├── lib/
│   │   ├── agent.ts            # OpenAI agent integration
│   │   ├── indexeddb.ts        # Offline storage
│   │   ├── sync.ts             # Sync engine
│   │   └── supabase/           # Supabase clients
│   ├── hooks/
│   │   └── useVoiceAgent.ts    # Voice pipeline hook
│   ├── context/
│   │   └── AuthContext.tsx     # Auth state
│   └── types/
│       └── database.ts         # TypeScript DB types
├── supabase/
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   ├── 003_auth_triggers.sql
│   ├── 004_security_hardening.sql
│   ├── seed.sql                # Basic seed data
│   └── seed_dev.sql            # Development seed (full dataset)
├── public/
│   ├── sw.js                   # Service Worker
│   └── manifest.json           # PWA manifest
├── PRD.md                      # Product Requirements
├── TRD.md                      # Technical Requirements
├── Rules.md                    # Development Rules & Standards
├── Tracker.md                  # Task Tracker
├── DESIGN_ARTIFACTS.md         # UI Design Reference
└── PROJECT_EXPLANATION.md      # Full Architecture Documentation
```

---

## API Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | None | Server health check |
| `/api/stt` | POST | Any | Speech-to-text |
| `/api/tts` | POST | Any | Text-to-speech |
| `/api/voice-query` | POST | Any | AI agent query |
| `/api/inspections/create` | POST | TECHNICIAN | Create inspection |
| `/api/work-orders/create` | POST | TECHNICIAN | Create work order |
| `/api/work-orders/[id]` | PATCH | TECHNICIAN | Update work order |
| `/api/equipment/[id]/history` | GET | Any | Equipment history |
| `/api/sync-offline-queue` | POST | Any | Sync offline queue |
| `/api/dashboard/technician` | GET | TECHNICIAN | Dashboard data |
| `/api/dashboard/supervisor` | GET | SUPERVISOR | Dashboard data |

---

## Offline Support

VoxField is built offline-first:

1. **Service Worker** caches the app shell for instant offline loads
2. **IndexedDB** stores pending voice interactions locally
3. **Sync Engine** (`lib/sync.ts`) auto-syncs when connectivity returns
4. **Retry Logic** — exponential backoff: 0s → 1s → 5s → manual

When offline, users see a dedicated **Offline Sync Status** card on the dashboard showing pending count, last sync time, and a manual sync button.

---

## Troubleshooting

### "Authentication required" error in console

The session cookie has expired or wasn't set. Sign out and sign back in. If using the dev accounts, make sure `seed_dev.sql` was run successfully.

### Voice input not working

Browser requires HTTPS or localhost for microphone access. Make sure you're on `http://localhost:3000` (not a remote IP).

### Dashboard shows empty sections

Run `supabase/seed_dev.sql` in the Supabase SQL Editor to populate development data.

### Stale JS module errors in browser

Hard-refresh the browser (Ctrl+Shift+R) to clear cached JavaScript chunks.

### Dev server fails to start

Ensure `.env.local` exists with all required variables from `.env.example`.

---

## Future Roadmap

- [ ] AssemblyAI real-time streaming STT (current: file upload)
- [ ] WebSocket supervisor dashboard (current: server-render on load)
- [ ] Equipment document RAG search (schema ready in `equipment_documents`)
- [ ] Sentry error tracking integration
- [ ] Vercel deployment with CI/CD
- [ ] Mobile push notifications for critical alerts
- [ ] Multi-language voice support

---

*Built with Next.js 16, Supabase, OpenAI GPT-4o, AssemblyAI*
