# Implementation Plan

## Voice-First AI Assistant for Field Service Operations

**Project Duration**: 8 weeks  
**Team Size**: 5 students  
**Framework**: Next.js 14 + Node.js + Supabase  
**Deployment**: Vercel + Supabase Cloud

---

## Table of Contents

1. [Phase Overview](#phase-overview)
2. [Phase 1: Foundation (Week 1-2)](#phase-1-foundation-week-1-2)
3. [Phase 2: Backend Core (Week 2-3)](#phase-2-backend-core-week-2-3)
4. [Phase 3: Agent Integration (Week 3-4)](#phase-3-agent-integration-week-3-4)
5. [Phase 4: Frontend Development (Week 4-5)](#phase-4-frontend-development-week-4-5)
6. [Phase 5: Offline & Sync (Week 5-6)](#phase-5-offline--sync-week-5-6)
7. [Phase 6: Testing & Polish (Week 6-7)](#phase-6-testing--polish-week-6-7)
8. [Phase 7: Deployment & Documentation (Week 7-8)](#phase-7-deployment--documentation-week-7-8)
9. [Critical Path](#critical-path)
10. [Resource Allocation](#resource-allocation)

---

## Phase Overview

| Phase | Duration | Focus | Deliverables |
|-------|----------|-------|--------------|
| **Phase 1: Foundation** | Week 1-2 | Project setup, database design | Schema, auth, basic API |
| **Phase 2: Backend Core** | Week 2-3 | Tool layer, API endpoints | 6 tools, 8 endpoints |
| **Phase 3: Agent Integration** | Week 3-4 | OpenAI integration, orchestration | Agent SDK, tool calling |
| **Phase 4: Frontend Development** | Week 4-5 | Voice UI, dashboards | Technician & supervisor UI |
| **Phase 5: Offline & Sync** | Week 5-6 | PWA, Service Worker, offline queue | Offline cache, sync engine |
| **Phase 6: Testing & Polish** | Week 6-7 | Unit, integration, E2E tests | Test coverage ≥90% |
| **Phase 7: Deployment** | Week 7-8 | Vercel/Supabase deployment, docs | Production deployment, README |

---

## Phase 1: Foundation (Week 1-2)

### Objectives
- [ ] Set up Vercel project and Supabase database
- [ ] Implement authentication (Supabase Auth)
- [ ] Create database schema with RLS policies
- [ ] Build basic API structure (Express or Vercel Functions)
- [ ] Set up environment variables and secrets management

### Tasks

#### 1.1 Project Setup
- **Create Next.js project**: `npx create-next-app@14 voice-assistant --typescript --tailwind`
- **Initialize Git repository**: `git init && git remote add origin <repo>`
- **Create development branches**: `develop`, `staging`, `production`
- **Set up .env.local**: Copy from .env.example template
- **Install dependencies**: `npm install`

**Deliverable**: Working Next.js project with build pipeline

#### 1.2 Supabase Setup
- **Create Supabase project**: https://supabase.com/dashboard
- **Enable authentication**: Email/password + OAuth (Google, Microsoft)
- **Create API keys**: Store `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Configure Row-Level Security (RLS)** policy structure (not implemented yet)
- **Set up custom claims** in JWT for role (TECHNICIAN, SUPERVISOR)

**Deliverable**: Supabase project configured, credentials in .env.local

#### 1.3 Authentication Implementation
- **Create auth service** (`lib/auth.ts`):
  - `signUpWithEmail(email, password)`
  - `signInWithEmail(email, password)`
  - `signOut()`
  - `getCurrentUser()`
  - `withAuth(handler)` — middleware for protecting API routes

- **Create auth context** (`context/AuthContext.tsx`):
  - Provide user, isLoading, isAuthenticated to app
  - Handle token refresh on app load
  - Persist JWT in secure storage

- **Create login page** (`pages/login.tsx`):
  - Email/password form
  - OAuth buttons (Google, Microsoft)
  - Password reset flow

**Deliverable**: User can sign up, sign in, sign out; JWT persisted

#### 1.4 Database Schema Design
- **Create migration file**: `supabase/migrations/001_initial_schema.sql`
- **Implement 9 tables**: users, equipment, repair_history, inspection_reports, work_orders, transcripts, activity_logs, alerts, equipment_documents
- **Add indexes**: equipment_code, technician_id, created_at, status columns
- **Configure RLS policies**: (Basic structure; enforcement in Phase 2)
  - Users table: technicians SELECT own row
  - Equipment: all SELECT
  - InspectionReports: technicians INSERT/UPDATE own; supervisors SELECT all
  - WorkOrders: technicians UPDATE own status; supervisors UPDATE all
  - Alerts: supervisors only
  - ActivityLogs: immutable; no DELETE/UPDATE

- **Run migrations**: `supabase db push`

**Deliverable**: Database schema deployed with RLS foundation

#### 1.5 API Structure Setup
- **Create API directory structure**:
  ```
  /pages/api/
    /auth/
      login.ts
      logout.ts
      refresh.ts
    /equipment/
      [id]/history.ts
    /inspections/
      create.ts
    /work-orders/
      create.ts
      [id]/update.ts
    /sync/
      offline-queue.ts
    /dashboard/
      technician.ts
      supervisor.ts
  ```

- **Create base middleware**:
  - `middleware/withAuth.ts` — validates JWT
  - `middleware/withRole.ts` — checks role (TECHNICIAN or SUPERVISOR)
  - `middleware/withErrorHandler.ts` — catches and formats errors
  - `middleware/withRateLimit.ts` — 60 req/min per user

- **Create utility functions**:
  - `lib/supabase.ts` — Supabase client initialization
  - `lib/errors.ts` — Error types and formatting
  - `lib/validation.ts` — Input validation schemas (Zod)

**Deliverable**: API skeleton with middleware and error handling

### Acceptance Criteria (Phase 1)
- ✅ Next.js project builds and runs locally
- ✅ Supabase credentials configured and tested
- ✅ Users can sign up and log in
- ✅ JWT persisted and auto-refreshed
- ✅ Database schema deployed with RLS policies
- ✅ API routes respond to requests with proper auth check

---

## Phase 2: Backend Core (Week 2-3)

### Objectives
- [ ] Implement 6 tool functions with database access
- [ ] Create 8 API endpoints with proper validation
- [ ] Implement activity logging for all mutations
- [ ] Set up error handling and validation
- [ ] Write unit tests for tools and APIs

### Tasks

#### 2.1 Tool Layer Implementation

Create `lib/tools/index.ts`:

```typescript
// Tool 1: getEquipmentHistory
export async function getEquipmentHistory(
  equipmentId: string,
  limit: number = 10
): Promise<RepairRecord[]>

// Tool 2: createInspection
export async function createInspection(
  equipmentId: string,
  title: string,
  description: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  recommendation?: string
): Promise<InspectionReport>

// Tool 3: createWorkOrder
export async function createWorkOrder(
  equipmentId: string,
  title: string,
  description: string,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  assignedTo?: string
): Promise<WorkOrder>

// Tool 4: updateWorkOrder
export async function updateWorkOrder(
  workOrderId: string,
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED',
  notes?: string
): Promise<WorkOrder>

// Tool 5: createAlert
export async function createAlert(
  equipmentId: string,
  severity: 'HIGH' | 'CRITICAL',
  message: string,
  inspectionReportId?: string
): Promise<Alert>

// Tool 6: logActivity
export async function logActivity(
  userId: string,
  actionType: string,
  entityType: string,
  entityId: string,
  description?: string
): Promise<ActivityLog>
```

**For each tool**:
- Validate inputs with Zod schema
- Check user permissions
- Execute SQL query via Supabase
- Call logActivity automatically on success
- Return structured response with timestamps

**Deliverable**: 6 production-ready tool functions with tests

#### 2.2 API Endpoints Implementation

Create endpoints in `pages/api/`:

**POST /api/voice-query**
- Input: { transcript, session_id }
- Output: { agent_response, transcript_id, tools_used, status }
- Note: Agent call happens here (placeholder for Phase 3)

**POST /api/inspections/create**
- Input: { equipment_id, title, description, severity, recommendation }
- Call: createInspection tool
- Output: { inspection_id, status, alert_generated, created_at }

**POST /api/work-orders/create**
- Input: { equipment_id, title, description, priority, assigned_to }
- Call: createWorkOrder tool
- Output: { work_order_id, work_order_number, status, created_at }

**PATCH /api/work-orders/:id**
- Input: { status, notes }
- Call: updateWorkOrder tool
- Output: { work_order_id, status, completed_at }

**GET /api/equipment/:id/history**
- Query: ?limit=10
- Call: getEquipmentHistory tool
- Output: { equipment_id, equipment_code, repairs }

**POST /api/sync-offline-queue**
- Input: { queue_items }
- Process: For each item, call voice-query endpoint
- Output: { processed, failed, results }

**GET /api/dashboard/technician**
- Output: { recent_activities, my_work_orders, my_inspections, offline_pending_count }

**GET /api/dashboard/supervisor**
- Query: ?date_from=&date_to=
- Output: { activity_feed, all_work_orders, alerts, technicians, summary }

**Deliverable**: 8 fully functional endpoints with validation and error handling

#### 2.3 Activity Logging
- Call logActivity after every successful tool execution
- Store: user_id, action_type, entity_type, entity_id, description, created_at
- Make activity_logs immutable: no UPDATE/DELETE permissions

**Deliverable**: Every mutation logged automatically

#### 2.4 Database Transactions
- Wrap tool executions in transactions
- Ensure createInspection → createAlert is atomic
- Rollback on failure; rollback also rolls back activity_log

**Deliverable**: Data consistency guaranteed

### Acceptance Criteria (Phase 2)
- ✅ All 6 tools work correctly with valid and invalid inputs
- ✅ All 8 endpoints return proper JSON responses
- ✅ All mutations logged to activity_logs
- ✅ Errors formatted consistently with error codes
- ✅ Input validation enforced on all endpoints
- ✅ Unit tests pass for all tools and endpoints (coverage ≥90%)

---

## Phase 3: Agent Integration (Week 3-4)

### Objectives
- [ ] Integrate OpenAI Agent SDK
- [ ] Implement tool-calling orchestration
- [ ] Set up system prompt with permissions
- [ ] Implement response generation
- [ ] Test agent with various intents

### Tasks

#### 3.1 OpenAI Agent Setup
- **Install OpenAI SDK**: `npm install openai`
- **Store API key**: `OPENAI_API_KEY` in .env.local
- **Create agent service** (`lib/agent.ts`):
  ```typescript
  export async function processVoiceQuery(
    transcript: string,
    userId: string,
    userRole: 'TECHNICIAN' | 'SUPERVISOR',
    sessionId: string
  ): Promise<AgentResponse>
  ```

#### 3.2 Tool Definitions for Agent
- **Export tool schemas** for OpenAI function calling:
  ```json
  {
    "type": "function",
    "function": {
      "name": "getEquipmentHistory",
      "description": "Retrieve maintenance history for equipment",
      "parameters": {
        "type": "object",
        "properties": {
          "equipment_id": { "type": "string" },
          "limit": { "type": "number" }
        },
        "required": ["equipment_id"]
      }
    }
  }
  ```

- **Map tool calls to implementations**:
  - Agent calls `getEquipmentHistory` → invokes `getEquipmentHistory(...)` function

#### 3.3 System Prompt Design
- **Base prompt**: Role definition + context + permissions
- **Dynamic injection**: Include user role, employee_code, approved tools
- **Constraints**: "Keep responses under 50 words. Avoid markdown. Make responses TTS-safe."
- **Error handling**: "Explain errors in plain terms without technical jargon."

#### 3.4 Agent Workflow
1. Receive transcript + user context
2. Inject system prompt with user role and approved tools
3. Send to OpenAI Agent SDK
4. Agent selects tools and generates responses
5. Validate tool outputs
6. Generate final response
7. Return to frontend

**Deliverable**: Agent successfully processes voice transcripts and calls tools

#### 3.5 Testing Agent
- Test intent classification: "Query", "Create", "Update"
- Test permission enforcement: TECHNICIAN can't call supervisor-only tools
- Test tool calling: Agent correctly invokes tools with right params
- Test error handling: Agent handles tool failures gracefully

**Deliverable**: Agent tested with 20+ intents covering all use cases

### Acceptance Criteria (Phase 3)
- ✅ Agent successfully classifies user intents
- ✅ Agent calls correct tools with valid parameters
- ✅ Agent enforces role-based permissions
- ✅ Agent generates TTS-safe responses (no markdown, < 100 words)
- ✅ Agent handles tool errors without crashing
- ✅ Agent processes queries within latency budget (2-3s)

---

## Phase 4: Frontend Development (Week 4-5)

### Objectives
- [ ] Build voice capture component with real-time waveform
- [ ] Build technician dashboard
- [ ] Build supervisor dashboard
- [ ] Integrate STT (AssemblyAI)
- [ ] Integrate TTS (OpenAI)

### Tasks

#### 4.1 Voice Capture Component
- **Create `components/VoiceInput.tsx`**:
  - Microphone button (64px+, accessible)
  - Real-time waveform visualisation
  - Live transcript display
  - Start/stop recording
  - Visual feedback (recording, processing, responding)

- **Web Audio API integration**:
  - `getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })`
  - AudioContext for waveform data
  - Record to WAV or OGG

#### 4.2 STT Integration (AssemblyAI)
- **Install AssemblyAI SDK**: `npm install assemblyai`
- **Stream audio to AssemblyAI**:
  ```typescript
  const transcript = await client.transcribe({
    audio: audioBlob,
    language_code: 'en'
  })
  ```
- **Handle confidence scores**: If confidence < 60%, show retry prompt
- **Display transcript in real-time** (if streaming API)

**Deliverable**: Voice input successfully transcribed

#### 4.3 TTS Integration (OpenAI)
- **Call /api/voice-query with transcript**
- **Get agent_response text**
- **Send to OpenAI TTS**:
  ```typescript
  const audio = await client.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'nova',
    input: agentResponse
  })
  ```
- **Stream audio to user**
- **Show visual speaking indicator** during playback

**Deliverable**: Responses delivered as synthesised speech

#### 4.4 Technician Dashboard
- **Layout**:
  - Header: user avatar, name, online/offline status
  - Main (60%): Voice interface
  - Bottom (40%): Tab strip (Work Orders | Inspections | Activity)
  - Footer: Offline sync status

- **Components**:
  - `VoiceInput.tsx` — voice interface
  - `WorkOrdersList.tsx` — assigned work orders with status
  - `InspectionsList.tsx` — submitted inspections by severity
  - `ActivityFeed.tsx` — recent voice interactions
  - `SyncStatus.tsx` — offline queue indicator

- **Responsive**: Mobile-first, 375-428px primary breakpoint

**Deliverable**: Technician can perform all voice operations

#### 4.5 Supervisor Dashboard
- **Layout**:
  - Header: KPI cards (open WOs, CRITICAL alerts, online techs)
  - Two-column: Activity Feed | Work Orders
  - Bottom: Transcript log + Inspection reports

- **Components**:
  - `KPICards.tsx` — metrics with real-time updates
  - `ActivityFeed.tsx` — all technician actions
  - `WorkOrdersKanban.tsx` — OPEN | IN_PROGRESS | CLOSED
  - `AlertsList.tsx` — CRITICAL first, with acknowledge/resolve buttons
  - `TranscriptLog.tsx` — searchable transcripts
  - `TechnicianRoster.tsx` — status and workload per tech

- **Real-time**: WebSocket subscriptions for activity feed and metrics

**Deliverable**: Supervisor has full operational visibility

#### 4.6 Navigation & Routing
- **Create `pages/`**:
  - `login.tsx` — login form
  - `dashboard/index.tsx` — auto-route to technician or supervisor based on role
  - `dashboard/technician.tsx` — technician dashboard
  - `dashboard/supervisor.tsx` — supervisor dashboard
  - `_app.tsx` — root layout with auth context

### Acceptance Criteria (Phase 4)
- ✅ Voice input captures audio at 16 kHz
- ✅ Transcripts display in real-time
- ✅ Agent responses returned within 3 seconds
- ✅ TTS audio plays successfully
- ✅ Technician dashboard fully functional (mobile-optimised)
- ✅ Supervisor dashboard shows real-time data
- ✅ All UI components responsive and accessible (WCAG 2.1 AA)

---

## Phase 5: Offline & Sync (Week 5-6)

### Objectives
- [ ] Implement Service Worker with Workbox
- [ ] Set up IndexedDB for offline queue
- [ ] Implement offline detection and sync engine
- [ ] Test offline recording and sync

### Tasks

#### 5.1 Service Worker Setup
- **Create `public/sw.js`** — Service Worker with Workbox
- **Cache strategies**:
  - App shell (HTML/CSS/JS): Cache First
  - API calls: Network First with fallback
  - Static assets: Stale While Revalidate

- **Install Workbox**: `npm install -D workbox-build workbox-window`
- **Build service worker**: `npm run build` generates optimised SW

**Deliverable**: Service Worker caches app assets and handles offline

#### 5.2 IndexedDB Implementation
- **Create database**: `voiceassistant_offline`
- **Object stores**:
  - `offline_queue`: Store pending voice interactions
  - `voice_recordings`: Store raw audio temporarily
  - `sync_metadata`: Track sync state
  - `user_cache`: Cache user/equipment data

- **Schema**:
  ```typescript
  interface QueueItem {
    queue_id: string (UUID)
    transcript: string
    timestamp: ISO8601
    status: 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED'
    attempt_count: number
    session_id: string
  }
  ```

- **Create IndexedDB wrapper** (`lib/indexeddb.ts`):
  ```typescript
  export async function enqueueVoiceInteraction(item: QueueItem)
  export async function getPendingInteractions(): Promise<QueueItem[]>
  export async function markAsSynced(queueId: string)
  export async function getQueueStatus()
  ```

**Deliverable**: Offline queue stores and retrieves data correctly

#### 5.3 Offline Detection
- **Monitor connectivity**:
  - `navigator.onLine` for instant detection
  - Periodic ping to `/api/health` (30s interval) for captive portal detection
  - Display status in UI: green dot (online) | amber dot (offline) | red dot (no connection)

- **Update VoiceInput component**:
  - If offline: queue locally, don't send to server
  - Show: "1 interaction pending synchronisation"
  - User still gets verbal confirmation ("recorded locally")

**Deliverable**: App detects and displays offline status correctly

#### 5.4 Sync Engine
- **Create sync service** (`lib/sync.ts`):
  1. Detect connectivity restoration (`navigator.onLine` change)
  2. Get pending items from IndexedDB (FIFO)
  3. Batch POST to `/api/sync-offline-queue`
  4. Process each item through Agent pipeline
  5. Mark as SYNCED in IndexedDB
  6. Update UI: "Syncing 1 of 5"

- **Retry mechanism**:
  - Attempt 1: immediate (0s)
  - Attempt 2: 1s delay
  - Attempt 3: 5s delay
  - Attempt 4+: manual retry button

- **Error handling**:
  - Failed items: status = FAILED, show retry button
  - User can manually retry failed items

**Deliverable**: Offline items sync automatically and reliably

#### 5.5 Background Sync API
- **Register sync event** (optional, for browser support):
  ```typescript
  navigator.serviceWorker.ready.then(reg => {
    reg.sync.register('voiceassistant-sync')
  })
  ```

- **Handle sync event in Service Worker**:
  ```javascript
  self.addEventListener('sync', event => {
    if (event.tag === 'voiceassistant-sync') {
      event.waitUntil(syncOfflineQueue())
    }
  })
  ```

**Deliverable**: Sync triggered automatically on reconnect

#### 5.6 PWA Installation
- **Create Web App Manifest** (`public/manifest.json`):
  - name: "Voice Assistant"
  - icon: 192x192 and 512x512 PNGs
  - display: "standalone"
  - orientation: "portrait-primary"
  - theme_color: "#1F4E79"

- **Add manifest link to HTML**:
  ```html
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon-192x192.png">
  <meta name="theme-color" content="#1F4E79">
  ```

- **Test installation**: "Add to Home Screen" prompt appears after 2 sessions

**Deliverable**: App installable as PWA on iOS and Android

### Acceptance Criteria (Phase 5)
- ✅ App works offline with cached assets
- ✅ Voice interactions queued when offline
- ✅ Offline queue syncs automatically on reconnect
- ✅ Offline sync maintains data consistency (no duplicates)
- ✅ IndexedDB stores and retrieves queue items correctly
- ✅ Failed sync items retried automatically
- ✅ App installable as PWA

---

## Phase 6: Testing & Polish (Week 6-7)

### Objectives
- [ ] Write unit tests for all tools and API endpoints
- [ ] Write integration tests for critical flows
- [ ] Write E2E tests for main user journeys
- [ ] Fix bugs and optimise performance
- [ ] Improve accessibility and UX

### Tasks

#### 6.1 Unit Testing
- **Test tools** (`lib/__tests__/tools.test.ts`):
  - ✅ getEquipmentHistory returns valid data
  - ✅ createInspection validates inputs
  - ✅ createInspection triggers alert if CRITICAL
  - ✅ createWorkOrder auto-generates WO number
  - ✅ updateWorkOrder sets completed_at when CLOSED
  - ✅ All tools log activity

- **Test API endpoints** (`pages/api/__tests__/`):
  - ✅ /voice-query returns agent response
  - ✅ /inspections/create validates severity
  - ✅ /work-orders/create requires TECHNICIAN role
  - ✅ /sync-offline-queue processes items FIFO
  - ✅ All endpoints check JWT and rate limit

- **Coverage target**: ≥90% of tool and API logic

**Deliverable**: Comprehensive unit tests passing

#### 6.2 Integration Testing
- **Test critical flows**:
  - ✅ Voice query → agent → tool → database → response
  - ✅ Create inspection → auto-create alert → WebSocket push
  - ✅ Offline recording → offline queue → sync → server processing
  - ✅ Technician dashboard loads and displays data
  - ✅ Supervisor dashboard shows real-time updates

- **Use Supertest for API integration tests**:
  ```typescript
  test('POST /api/inspections/create creates inspection', async () => {
    const res = await request(app)
      .post('/api/inspections/create')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ equipment_id, title, description, severity: 'CRITICAL' })
    expect(res.status).toBe(200)
    expect(res.body.alert_generated).toBe(true)
  })
  ```

**Deliverable**: Integration tests passing for all critical paths

#### 6.3 E2E Testing
- **Test with Cypress**:
  1. **Technician flow**:
     - Login → voice query → view response → view dashboard
  2. **Inspection flow**:
     - Create inspection → verify alert → supervisor sees it
  3. **Work order flow**:
     - Create WO → update status → verify in dashboard
  4. **Offline flow**:
     - Go offline → queue interaction → reconnect → verify sync

- **Test mobile responsiveness**:
  - Technician dashboard on 375px viewport
  - Touch interactions (microphone button)

**Deliverable**: 5+ E2E tests passing

#### 6.4 Performance Optimisation
- **Measure**:
  - Lighthouse score (target ≥90)
  - Core Web Vitals (LCP, FID, CLS)
  - API response times (target 200-500ms)
  - Voice-to-response latency (target 6-12s)

- **Optimise**:
  - Code split dashboard components
  - Lazy load supervisor features
  - Minify and compress assets
  - Cache API responses where appropriate
  - Use React.memo for expensive components

**Deliverable**: Lighthouse score ≥90

#### 6.5 Accessibility (WCAG 2.1 AA)
- [ ] All form inputs have associated labels
- [ ] Buttons have aria-label for screen readers
- [ ] Microphone button minimum 44x44px
- [ ] Colour contrast ratio ≥4.5:1 (text)
- [ ] Dark mode supported
- [ ] Keyboard navigation works
- [ ] Focus indicators visible

**Deliverable**: App passes WCAG 2.1 AA audit

#### 6.6 Bug Fixes & Polish
- Test all flows end-to-end
- Fix any crashes or error states
- Improve error messages for clarity
- Polish animations and transitions
- Add loading states and progress indicators
- Improve mobile keyboard handling
- Test with actual devices (iOS Safari, Android Chrome)

**Deliverable**: Bug-free, polished application

### Acceptance Criteria (Phase 6)
- ✅ Unit test coverage ≥90%
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ Lighthouse score ≥90
- ✅ WCAG 2.1 AA compliance verified
- ✅ No critical or high-severity bugs remaining
- ✅ Performance targets met

---

## Phase 7: Deployment & Documentation (Week 7-8)

### Objectives
- [ ] Deploy to Vercel and Supabase
- [ ] Set up monitoring and error tracking
- [ ] Write comprehensive documentation
- [ ] Prepare for code review and presentation

### Tasks

#### 7.1 Deployment Setup
- **Vercel deployment**:
  - Connect GitHub repo to Vercel
  - Set environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, etc.
  - Deploy to staging environment
  - Run smoke tests on staging
  - Deploy to production

- **Supabase database**:
  - Run migrations in production
  - Verify backups enabled (daily)
  - Configure PITR (Point-in-Time Recovery)
  - Set up database alerts

- **Configure production secrets**:
  - Use Vercel environment variables (not .env files)
  - Rotate API keys monthly
  - Use least-privilege service role keys

**Deliverable**: App live at production URL

#### 7.2 Monitoring & Error Tracking
- **Sentry setup**:
  - `npm install @sentry/nextjs`
  - Configure Sentry project
  - Add to Next.js config
  - Set up Slack alerts for P1 errors

- **Vercel Analytics**:
  - Enable Web Vitals tracking
  - Monitor deployment status
  - Set up alerts for downtime

- **Custom logging**:
  - Log all Agent operations to Sentry
  - Log all sync operations
  - Log errors with full context

**Deliverable**: Errors tracked and alerted

#### 7.3 Documentation
- **Create `README.md`**:
  - Project overview
  - Quick start (local development)
  - Deployment instructions
  - Architecture overview (link to TRD.md)
  - API documentation (link to Swagger/OpenAPI)
  - Contributing guidelines

- **Create `DEVELOPMENT.md`**:
  - How to run locally
  - Environment setup
  - Running tests
  - Debugging tips

- **Create `API.md`**:
  - All endpoints with curl examples
  - Error codes and meanings
  - Rate limiting details

- **Create `ARCHITECTURE.md`**:
  - System design overview
  - Component descriptions
  - Data flow diagrams
  - Technology choices and rationale

- **Create `DEPLOYMENT.md`**:
  - How to deploy to Vercel
  - How to manage Supabase
  - How to configure environment variables
  - Rollback procedures

**Deliverable**: Comprehensive documentation

#### 7.4 Code Review Preparation
- **Code quality**:
  - Run linter: `npm run lint`
  - Fix all linting errors
  - Format code: `npm run format`

- **Git history**:
  - Rebase onto main branch
  - Write clear commit messages
  - Squash related commits

- **Pull request**:
  - Link to GitHub issues
  - Write clear PR description
  - Include screenshots of UI changes
  - Link to deployed staging URL

**Deliverable**: Code ready for review

#### 7.5 Presentation Preparation
- **Prepare demo**:
  - Demo voice query → agent → response
  - Demo inspection creation → auto-alert
  - Demo offline recording → sync
  - Demo supervisor dashboard

- **Prepare slides**:
  - Architecture overview
  - Technology choices
  - Demo walkthrough
  - Challenges and solutions
  - Lessons learned

- **Prepare Q&A**:
  - Understand all technical decisions
  - Be ready to explain Agent design
  - Be ready to explain offline sync

**Deliverable**: Polished demo and presentation

### Acceptance Criteria (Phase 7)
- ✅ App deployed to Vercel and Supabase
- ✅ Production environment variables configured
- ✅ Monitoring and error tracking enabled
- ✅ Comprehensive documentation written
- ✅ Code review quality standards met
- ✅ Demo runs smoothly
- ✅ Presentation prepared

---

## Critical Path

**Dependencies**:
- Phase 1 (Foundation) must complete before Phase 2
- Phase 2 (Backend) and Phase 4 (Frontend) can run in parallel
- Phase 3 (Agent) depends on Phase 2 completion
- Phase 5 (Offline) can start midway through Phase 4
- Phase 6 (Testing) can start midway through Phase 5
- Phase 7 (Deployment) is final phase

**Critical tasks** (cannot be delayed):
1. Database schema (Phase 1) — blocks all backend work
2. Authentication (Phase 1) — blocks API security
3. Tool implementations (Phase 2) — blocks Agent integration
4. Agent integration (Phase 3) — blocks voice query feature
5. Voice capture + TTS (Phase 4) — blocks UX
6. Offline sync (Phase 5) — required for requirements
7. Tests (Phase 6) — blocks deployment

---

## Resource Allocation

**Team of 5 students**:

| Role | Week 1-2 | Week 3-4 | Week 5-6 | Week 7-8 |
|------|----------|----------|----------|----------|
| **DB/Backend Lead** | Schema, auth, API setup | Tool implementation | Optimize, tests | Deployment |
| **Agent Engineer** | Setup | Agent integration | Agent testing | Documentation |
| **Frontend Lead** | UI planning | Voice + dashboards | Responsive design | Polish |
| **Offline Engineer** | Plan | Support frontend | Service Worker, sync | Testing |
| **DevOps/QA** | Environments | Testing setup | Test coverage | Deployment, docs |

---

## Milestones & Go/No-Go Criteria

| Milestone | Date | Go Criteria |
|-----------|------|------------|
| **Phase 1 Complete** | End of Week 2 | Auth works, DB schema deployed, API skeleton ready |
| **Phase 2 Complete** | End of Week 3 | All 6 tools working, 8 endpoints tested |
| **Phase 3 Complete** | End of Week 4 | Agent classifies intents, calls tools, 20+ test cases |
| **Phase 4 Complete** | End of Week 5 | Voice input/output working, dashboards functional |
| **Phase 5 Complete** | End of Week 6 | Offline queue syncs, PWA installable |
| **Phase 6 Complete** | End of Week 7 | Tests ≥90%, Lighthouse ≥90, no P1 bugs |
| **Launch Ready** | End of Week 8 | Live on Vercel, docs complete, demo ready |

---

**Document Version**: 1.0  
**Last Updated**: June 12, 2026
