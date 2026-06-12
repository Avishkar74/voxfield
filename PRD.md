# Product Requirements Document (PRD)

## Voice-First AI Assistant for Field Service Operations

**Version**: 1.0  
**Date**: June 2026  
**Project**: Assignment #11 — Voice AI  
**Group Size**: 5 Students  
**Marks**: 15 + 3 Bonus

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals and Objectives](#goals-and-objectives)
4. [Stakeholders](#stakeholders)
5. [User Personas](#user-personas)
6. [User Stories](#user-stories)
7. [Functional Requirements](#functional-requirements)
8. [Technician Dashboard](#technician-dashboard)
9. [Supervisor Dashboard](#supervisor-dashboard)
10. [Offline Functionality](#offline-functionality)
11. [Non-Functional Requirements](#non-functional-requirements)
12. [Technology Stack](#technology-stack)
13. [Success Metrics](#success-metrics)

---

## Executive Summary

The **Voice-First AI Assistant** is a Progressive Web Application (PWA) designed to help field technicians interact with operational systems through natural voice commands.

The system enables technicians to:
- **Retrieve equipment history** quickly without manual searching
- **Create inspection reports** by dictating findings
- **Generate work orders** through voice commands
- **Update operational records** hands-free
- **Receive spoken responses** for confirmations and queries

All of this is achieved without relying on traditional forms or manual data entry.

### Key Features

✅ **AI-Powered Speech Processing** — Speech-to-Text (STT) converts voice to text  
✅ **Intelligent Agent** — AI Agent with tool-calling capabilities interprets intent and executes actions  
✅ **Text-to-Speech** — Responses delivered as synthesised speech for hands-free operation  
✅ **Offline Support** — Progressive Web App enables offline operation with automatic sync  
✅ **Supervisor Dashboard** — Real-time visibility into technician activity, work orders, alerts, and transcripts  

### Why This Matters

Field technicians operate in demanding environments where:
- Typing on devices is inconvenient or impossible
- Hands are occupied with equipment
- Connectivity may be intermittent
- Speed and efficiency directly impact operations

This solution reduces friction in field workflows and enables operational continuity even during connectivity loss.

---

## Problem Statement

### Current Challenges

Field technicians currently face several operational bottlenecks:

| Challenge | Impact |
|-----------|--------|
| **Manual data search** | Technicians spend time looking up equipment history instead of performing maintenance |
| **Handwritten forms** | Inspection reports are recorded on paper and transcribed later, introducing errors |
| **Delayed work order creation** | Maintenance tasks are initiated only after returning to an office |
| **Connectivity dependency** | Work stops when internet is unavailable; no queuing mechanism exists |
| **Manual reporting** | Supervisors lack real-time visibility into field operations |

### Objective

Provide a voice-first assistant that allows technicians to:
1. Perform operational tasks conversationally (query → create → update)
2. Continue working when offline
3. Maintain full traceability through automatic logging
4. Provide supervisors with real-time operational visibility

---

## Goals and Objectives

### Primary Goals

1. **Enable voice-based interaction** with operational systems
2. **Allow equipment queries** — retrieve history and specifications by voice
3. **Support inspection creation** — dictate findings; system extracts structured data
4. **Support work order creation** — generate maintenance tasks via voice command
5. **Deliver spoken responses** — confirmations and answers returned as audio
6. **Enable offline operation** — continue working when connectivity is unavailable
7. **Auto-sync offline data** — queued interactions synchronise seamlessly on reconnection
8. **Provide supervisor visibility** — real-time monitoring of technician activities

### Secondary Goals

- Reduce manual data entry by ≥80%
- Improve technician productivity (target: 20% more tasks per shift)
- Demonstrate end-to-end AI Agent architecture
- Demonstrate offline-first PWA design patterns
- Demonstrate tool-calling workflows with guardrails

---

## Stakeholders

### 1. Field Technician

**Primary User**

Responsibilities:
- Query operational data (equipment history, repair records)
- Create inspection reports with severity levels
- Create and update work orders
- Continue operating during connectivity loss
- Review personal activity and assigned tasks

**Key Needs:**
- Fast access to information (< 3 seconds)
- Minimal typing (hands-occupied environments)
- Offline capability (remote locations)
- Simple, intuitive interface (high-stress situations)

---

### 2. Supervisor

**Secondary User**

Responsibilities:
- Monitor all technician activities in real time
- Track work order progress and priority
- Review critical alerts and incidents
- Access audit trail (transcripts, activity logs)
- Manage operational quality and compliance

**Key Needs:**
- Real-time visibility into field operations
- Alert escalation for critical incidents
- Compliance audit trail
- Performance metrics and KPIs
- Historical data analysis

---

## User Personas

### Persona 1: John (Field Technician)

- **Role**: Equipment Technician
- **Experience**: 5 years field service
- **Environment**: Manufacturing floor — loud, fast-paced
- **Pain Points**: 
  - Doesn't have time to type on a device
  - Hands are often occupied with equipment
  - Needs to quickly look up repair history
  - Works in areas with intermittent wifi
- **Goals**: Complete inspections and work orders quickly, continue working offline

### Persona 2: Sarah (Supervisor)

- **Role**: Operations Manager
- **Experience**: 8 years field operations
- **Environment**: Office, monitoring field team remotely
- **Pain Points**:
  - Loses visibility when technicians are offline
  - Can't track critical issues until technician returns
  - Manual transcription of reports takes time
  - Needs compliance audit trail
- **Goals**: Real-time operational oversight, rapid incident response, compliance documentation

---

## User Stories

### Story 1: Equipment Query

```
As a technician,
I want to ask: "What was the last repair on MTR-102?"
So that I can quickly retrieve maintenance history without searching manually.

Acceptance Criteria:
✓ System recognises equipment code (MTR-102)
✓ Returns repair date, failure type, and cost
✓ Responds with spoken confirmation within 3 seconds
✓ Works offline (queued for sync)
```

### Story 2: Inspection Creation

```
As a technician,
I want to say: "Create an inspection for MTR-102. Cooling fan damaged. Severity critical."
So that inspection information is recorded automatically with proper classification.

Acceptance Criteria:
✓ Inspection record created with equipment_id, description, severity
✓ Critical inspections auto-generate alerts
✓ Supervisor is notified immediately
✓ Technician receives verbal confirmation (e.g., "Critical inspection created")
```

### Story 3: Work Order Creation

```
As a technician,
I want to say: "Create a work order for cooling fan replacement."
So that maintenance activities can be initiated immediately.

Acceptance Criteria:
✓ Work order created with auto-generated number (WO-XXXX)
✓ Equipment reference and priority captured
✓ Technician receives verbal confirmation
✓ Supervisor dashboard updates in real time
```

### Story 4: Offline Usage

```
As a technician,
I want to continue using the application when internet connectivity is unavailable,
So that my work is not interrupted.

Acceptance Criteria:
✓ App continues to function on stored (cached) assets
✓ Voice recordings are queued locally
✓ User receives verbal feedback ("1 interaction pending sync")
✓ No data loss occurs
```

### Story 5: Automatic Synchronisation

```
As a technician,
I want offline interactions to synchronise automatically when I reconnect,
So that I do not need to manually upload information.

Acceptance Criteria:
✓ Service Worker detects connectivity restoration
✓ Queued items sync in FIFO order
✓ Each sync shows progress (e.g., "Syncing 1 of 3")
✓ Failed items are retried automatically with backoff
```

### Story 6: Activity Monitoring

```
As a supervisor,
I want to view technician activities in real time,
So that I can monitor field operations.

Acceptance Criteria:
✓ Activity feed updates in real time via WebSocket
✓ Each entry shows: technician, action, equipment, timestamp
✓ Filter by technician, action type, or date range
✓ Click entry to view full transcript
```

### Story 7: Alert Monitoring

```
As a supervisor,
I want to view critical incidents,
So that urgent issues can be addressed quickly.

Acceptance Criteria:
✓ CRITICAL and HIGH alerts appear at top of dashboard
✓ Red badge on Alerts section
✓ Browser notification (if enabled)
✓ One-click acknowledge action
```

---

## Functional Requirements

### FR-1: Voice Input

The system shall allow technicians to submit voice commands using the device microphone.

| Aspect | Specification |
|--------|---------------|
| **Input Source** | Mobile browser microphone (Web Audio API) |
| **Sample Rate** | 16 kHz mono (minimum for STT accuracy) |
| **Recording Duration** | Continuous or push-to-talk mode supported |
| **Feedback** | Real-time waveform visualisation; transcript appears during recording |
| **Output** | Raw audio stream sent to AssemblyAI |

---

### FR-2: Speech-to-Text

The system shall convert audio into text using a reliable STT service.

| Aspect | Specification |
|--------|---------------|
| **Technology** | AssemblyAI Universal-1 model |
| **Output** | Transcript with per-word confidence scores |
| **Confidence Threshold** | ≥60% required; lower confidence triggers retry prompt |
| **Latency Target** | 2–5 seconds from audio end to transcript delivery |
| **Fallback** | Local Whisper model (on-device) for offline queuing |

---

### FR-3: AI Agent

The system shall use an AI Agent to process user requests and determine actions.

The Agent shall:
- **Understand intent** — classify user input as a query, creation, update, or other action
- **Decide when tools are required** — recognise if a tool call or SQL query is needed
- **Retrieve information** — query equipment history, repair records, work orders
- **Create records** — generate inspections, work orders, alerts
- **Update records** — modify work order status, inspection status
- **Generate responses** — formulate natural-language responses suitable for TTS

| Aspect | Specification |
|--------|---------------|
| **Technology** | OpenAI Agent SDK + GPT-4o |
| **Temperature** | 0.2 (deterministic for tool calling) |
| **Max Tokens** | 1,000 per response |
| **Latency Target** | 2–3 seconds from transcript to response generation |

---

### FR-4: Tool-Based Database Access

The Agent shall be capable of reading, creating, and updating operational records via predefined tools.

**Reading (SELECT)**
- Equipment history
- Repair history
- Work orders
- Inspection reports
- Equipment specifications

**Creating (INSERT)**
- Work orders
- Inspection reports
- Alerts
- Activity logs

**Updating (UPDATE)**
- Work order status
- Inspection status
- Alert status

| Aspect | Specification |
|--------|---------------|
| **Database** | Supabase PostgreSQL v15+ |
| **Access Method** | Tool functions (Node.js) with parameterised queries |
| **Authorization** | Role-based access control (TECHNICIAN, SUPERVISOR) |
| **Logging** | All mutations logged to activity_logs table |

---

### FR-5: Dynamic Query Generation

When suitable tools are unavailable, the Agent may generate SQL queries to retrieve information from approved tables.

**Restrictions:**
- Read-only access (no INSERT, UPDATE, DELETE, DROP, ALTER)
- Approved tables only: `equipment`, `repair_history`, `work_orders`, `inspection_reports`
- Result limit: 100 rows maximum
- Parameterised queries (no raw string interpolation)

---

### FR-6: Voice Response

The system shall convert generated responses into speech.

| Aspect | Specification |
|--------|---------------|
| **Technology** | OpenAI TTS-1-HD API |
| **Voice** | nova (neutral, professional) |
| **Latency Target** | 1–2 seconds from text to audio stream |
| **Playback** | Streamed to frontend; user can pause/replay |
| **Length** | Keep under 30 seconds of speech (< 100 words) |

---

### FR-7: Transcript Storage

The system shall store voice interaction transcripts for audit and training purposes.

**Stored Data:**
- User transcript (user-provided voice text)
- Agent response (system-generated answer)
- User identifier
- Timestamp
- Session ID (groups multi-turn interactions)
- Tools used (array of tool names invoked)

**Important:** Raw audio files are NOT stored permanently (only in temporary buffers during processing).

---

### FR-8: Activity Logging

Every significant action shall generate an immutable activity log entry.

**Log Events:**
- `QUERY_EQUIPMENT` — User queried equipment history
- `CREATE_INSPECTION` — New inspection created
- `CREATE_WORK_ORDER` — New work order created
- `UPDATE_WORK_ORDER` — Work order status changed
- `CREATE_ALERT` — Alert automatically generated
- `SYNC_OFFLINE` — Offline queue synchronised

Each log entry includes:
- User ID (who took the action)
- Action type
- Entity type (Equipment, InspectionReport, WorkOrder, Alert)
- Entity ID (reference to affected record)
- Timestamp

---

### FR-9: Alert Engine

The system shall automatically generate alerts for predefined conditions.

**Alert Triggers:**
- Inspection created with `severity = CRITICAL`
- Inspection created with `severity = HIGH` on critical equipment
- Work order created with `priority = CRITICAL`

**Alert Lifecycle:**
1. **OPEN** — Alert created; supervisor notified
2. **ACKNOWLEDGED** — Supervisor reviewed; recorded timestamp + supervisor_id
3. **RESOLVED** — Issue addressed; recorded timestamp

**Notification Mechanism:**
- WebSocket push to supervisor dashboard
- Browser notification (if enabled)
- Badge count on Alerts sidebar

---

## Technician Dashboard

### Purpose

Allow technicians to perform all daily operational tasks through a single mobile-optimised interface.

### Features

#### Voice Assistant Interface
- Large microphone button (minimum 64px, gloved-hand friendly)
- Real-time waveform visualisation during recording
- Live transcript display as audio is captured
- Agent response playback with visual speaking indicator
- History of last 10 voice interactions (scrollable)

#### Recent Activities
- Displays recent queries, inspections, and work orders
- Sortable by action type and date
- Links to full transcript view

#### My Work Orders
- Lists all assigned work orders
- Shows status (OPEN, IN_PROGRESS, CLOSED)
- Priority colour-coded (RED=CRITICAL, ORANGE=HIGH, YELLOW=MEDIUM, GREEN=LOW)
- Quick status update: one-tap or voice command

#### My Inspection Reports
- Lists all submitted inspections
- Shows severity (CRITICAL, HIGH, MEDIUM, LOW)
- Status badges: OPEN (red), REVIEWED (amber), CLOSED (green)
- Tap to view full details, recommendations, and auto-generated alerts

#### Offline Sync Status
- Persistent banner at bottom: Online (green dot) or Offline (amber dot)
- Shows "N interactions pending synchronisation"
- Manual sync button available when online
- Progress bar during sync operation
- Toast notification on success/failure

### Design Principles

- **Mobile-first** — Optimised for 375–428px screens
- **Dark mode** — Supported for bright-sunlight visibility
- **Accessibility** — ARIA labels, 44px minimum touch targets (WCAG 2.1 AA)
- **Speed** — App shell cached; loads in < 2 seconds offline
- **Focus** — Voice interaction is primary; UI elements are secondary

---

## Supervisor Dashboard

### Purpose

Provide real-time operational oversight across all technicians, work orders, inspections, and alerts.

### Features

#### Summary Metrics (KPI Cards)
- Open work orders (count)
- CRITICAL alerts (with red badge)
- Technicians online (count)
- Average response time

#### Critical Alerts Section
- Sorted by severity (CRITICAL first)
- One-click ACKNOWLEDGE action
- One-click view full details (inspection, equipment, technician)
- Timeline of alerts (open → acknowledged → resolved)

#### Activity Feed
- Real-time stream of all technician actions via WebSocket
- Filterable by technician, date range, or action type
- Each entry shows: technician, action, equipment reference, timestamp
- Click entry to expand full voice transcript and response

#### Work Order Management
- Table or Kanban view: OPEN | IN_PROGRESS | CLOSED columns
- Filterable by technician, priority, or equipment
- Sortable by age, priority, or status
- Colour-coded: overdue (red), upcoming (yellow), on-track (green)
- Bulk actions: select multiple + change status

#### Transcript Monitoring
- Full-text search across all transcripts
- Filter by technician, equipment, or date range
- Side-by-side view: user prompt (left) + agent response (right)
- Flag transcripts for QA review
- Export to CSV for compliance

#### Technician Status Monitoring
- Roster showing each technician
- Online/offline status with last activity timestamp
- Inspection count (today, this week)
- Work order count (open, in-progress, closed)
- Pending sync count (for offline technicians)

### Design Principles

- **Desktop-first** — Optimised for 1920×1080 and responsive down to tablets
- **Real-time** — WebSocket updates for activities, alerts, and metrics
- **Scannable** — Colour-coded status, clear hierarchy, minimal scrolling
- **Actionable** — One-click acknowledge/resolve, quick filters, bulk actions

---

## Offline Functionality

### Progressive Web App (PWA)

The application shall be installable and functional offline.

**Installation:**
- Web App Manifest defines name, icon, display, and theme colour
- "Add to Home Screen" prompt after 2 successful sessions
- Installable on iOS (Safari 16+) and Android (Chrome 112+)

**Offline Support:**
- Service Worker registered and auto-updated on deployment
- App shell (HTML, CSS, JS) cached for instant load
- Assets cached via Workbox strategies

### Offline Queue

When internet connectivity is unavailable:
- Voice recordings are captured normally
- Requests are queued locally (not sent to server)
- User receives verbal feedback: "1 interaction pending synchronisation"
- No manual intervention required from user

**Storage Technology:** IndexedDB (browser-native NoSQL)

**Queue Item Schema:**
```json
{
  "queue_id": "uuid-v4",
  "transcript": "What was the last repair on MTR-102?",
  "timestamp": "2026-06-12T10:30:00Z",
  "status": "PENDING_SYNC",
  "attempt_count": 0,
  "session_id": "sess-abc-123"
}
```

### Automatic Synchronisation

When connectivity returns:
1. **Detection** — Service Worker detects 'online' event from `navigator.onLine` or successful ping to `/api/health`
2. **Queue Processing** — Background Sync API fires 'voiceassistant-sync' event
3. **FIFO Replay** — Items processed in creation order
4. **Server Processing** — Each item sent through the Agent pipeline as if it were a live request
5. **Confirmation** — Successful items marked SYNCED and stored in local history
6. **Retries** — Failed items retried with exponential backoff (1s, 5s, 30s, then manual)

**User Feedback:**
- "Syncing 3 of 5" progress bar
- "✓ All interactions synced" on completion
- Toast notification with success/failure count

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| Voice-to-response latency | 6–12 seconds | STT (2–5s) + Agent (2–3s) + TTS (1–2s) + UI rendering (< 1s) |
| Equipment history query | < 200ms | Database indexed; simple SELECT |
| Dashboard initial load | < 2 seconds | Cached app shell; lazy-loaded data |
| Work order creation | < 5 seconds | Agent inference + DB insert |
| Offline queue sync (per item) | < 5 seconds | Serial processing for data consistency |
| UI interaction response | < 100ms | Buttons, toggles, form inputs |

### Reliability

- **Offline queue durability** — Zero data loss; IndexedDB persists across sessions
- **Sync resilience** — Automatic retry with exponential backoff
- **Database failover** — Supabase replication and managed failover (< 60s RTO)
- **Error handling** — Graceful degradation; errors logged and reported

### Availability

- **Online mode** — 99.5% uptime during business hours
- **Offline mode** — 100% availability (no backend required)
- **Reconnection** — Automatic detection; no manual intervention

### Security

- **Authentication** — Supabase Auth (JWT with 1-hour expiry)
- **Authorisation** — Row-Level Security at database level; role-checked at API
- **Data Protection** — HTTPS for all API communication (TLS 1.3+)
- **Secrets** — Environment variables; never in source code
- **Audit Trail** — All actions logged immutably

### Scalability

- **Stateless API** — Horizontal scaling via Vercel serverless
- **Target Users** — 1,000+ concurrent technicians
- **Database Connections** — Pooled via Supabase PgBouncer
- **Data Retention** — Transcripts kept for 1 year (configurable)

### Maintainability

- **Code Structure** — Repository pattern; business logic decoupled from DB access
- **Tool Testing** — Each tool independently testable with mocked responses
- **Documentation** — OpenAPI/Swagger for API; README and ADRs in repository
- **Configuration** — Environment-based (development, staging, production)

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | Next.js | 14 LTS | React framework with SSR and PWA support |
| Frontend | React | Latest | UI component library |
| Styling | Tailwind CSS | Latest | Utility-first CSS framework |
| PWA | Workbox | v7 | Service Worker caching and offline support |
| Authentication | Supabase Auth | Latest | JWT-based auth with OAuth2 |
| Database | Supabase PostgreSQL | v15+ | Managed relational database with RLS |
| AI Agent | OpenAI Agent SDK | Latest | Tool-calling and orchestration |
| LLM | GPT-4o | Latest | Language model for agent reasoning |
| Speech-to-Text | AssemblyAI Universal-1 | REST API | Audio transcription |
| Text-to-Speech | OpenAI TTS-1-HD | REST API | Voice synthesis |
| Offline Storage | IndexedDB | Browser standard | Local data persistence |
| Hosting | Vercel | Edge deployment | Next.js-optimised deployment |
| CI/CD | GitHub Actions | Latest | Automated testing and deployment |
| Monitoring | Sentry | Latest | Error tracking and performance monitoring |
| Testing | Jest + Cypress + RTL | Latest | Unit, E2E, and component testing |

---

## Success Metrics

### Functional Success

- ✅ Technicians can successfully query equipment information using voice
- ✅ Inspection reports can be created through voice commands with auto-classification
- ✅ Work orders can be created and updated via voice
- ✅ Offline interactions are successfully queued without data loss
- ✅ Queued interactions synchronise automatically and reliably
- ✅ Critical inspections trigger automatic alerts
- ✅ Supervisor dashboard accurately reflects real-time technician activities
- ✅ Alerts are delivered and acknowledged with proper audit trail

### Performance Success

- ✅ Voice queries complete within 3–12 seconds (99th percentile)
- ✅ Offline queue syncs with 99.9% success rate
- ✅ Dashboard initial load under 2 seconds
- ✅ Mobile app shell loads instantly from cache

### Quality Success

- ✅ Zero data loss in offline mode
- ✅ 100% JWT authentication enforcement
- ✅ All mutations logged to activity_logs
- ✅ Critical alerts tested and verified

### User Success

- ✅ Technician can complete a 5-step workflow (query → inspect → create WO → update → confirm) in < 5 minutes
- ✅ Supervisor can acknowledge a critical alert in < 10 seconds
- ✅ Technician dashboard is usable with one hand (mobile-optimised)

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-12 | Project Team | Initial release |

---

**Generated**: June 12, 2026  
**Project**: Voice-First AI Assistant for Field Service Operations  
**Assignment**: #11 — Voice AI (5 Students, 15 + 3 Bonus Marks)
