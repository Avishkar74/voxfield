# Technical Requirements Document (TRD)

## Voice-First AI Assistant for Field Service Operations

**Version**: 2.0  
**Date**: June 2026  
**Project**: Assignment #11 — Voice AI  
**Group Size**: 5 Students  
**Marks**: 15 + 3 Bonus

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Actor Definitions](#actor-definitions)
4. [Functional Requirements Mapping](#functional-requirements-mapping)
5. [Use Case Diagram & Descriptions](#use-case-diagram--descriptions)
6. [Architecture Diagrams](#architecture-diagrams)
7. [Domain Model & ERD](#domain-model--erd)
8. [Database Design](#database-design)
9. [Agent Design](#agent-design)
10. [Tool Specifications](#tool-specifications)
11. [API Design](#api-design)
12. [Authentication & Authorization](#authentication--authorization)
13. [Technician Dashboard Design](#technician-dashboard-design)
14. [Supervisor Dashboard Design](#supervisor-dashboard-design)
15. [Speech Processing Pipeline](#speech-processing-pipeline)
16. [Offline Architecture](#offline-architecture)
17. [Sequence Diagrams](#sequence-diagrams)
18. [Activity Logging Design](#activity-logging-design)
19. [Alert Engine Design](#alert-engine-design)
20. [Non-Functional Requirements](#non-functional-requirements)
21. [Deployment Architecture](#deployment-architecture)
22. [Testing Strategy](#testing-strategy)
23. [Risks and Limitations](#risks-and-limitations)
24. [Future Enhancements](#future-enhancements)

---

## Introduction

### Purpose

This Technical Requirements Document (TRD) provides the complete technical specification for the Voice-First AI Assistant for Field Service Operations. It translates every Product Requirement into a concrete implementation decision, covering architecture, database design, agent orchestration, API contracts, offline behaviour, and deployment.

### Scope

The TRD covers:
- ✅ Complete system architecture and component breakdown
- ✅ Database schema with Entity Relationship Diagram
- ✅ AI Agent design and tool specifications
- ✅ REST API contracts with request/response schemas
- ✅ Offline-first PWA architecture and sync engine
- ✅ Speech processing pipeline (STT/TTS) with latency budgets
- ✅ Authentication, authorisation, and row-level security
- ✅ Technician and supervisor dashboard wireframes
- ✅ Testing strategy and deployment architecture

### Key Assumptions

- Users operate modern mobile browsers (Chrome ≥ 112, Safari ≥ 16) with PWA support
- Supabase PostgreSQL v15+ is the primary persistent store
- AssemblyAI Universal-1 is used for Speech-to-Text
- OpenAI GPT-4o is used for agent reasoning
- OpenAI TTS-1-HD is used for voice synthesis
- All users complete an authenticated online session before going offline
- Audio is captured at 16 kHz mono minimum for STT accuracy

---

## System Overview

### System Description

The Voice-First AI Assistant is a Progressive Web Application enabling field technicians to interact with operational systems through natural voice commands. Voice input travels through an STT pipeline, is interpreted by an AI Agent with tool-calling capabilities, and responses are delivered as synthesised speech. The system operates in offline mode by queuing interactions locally and synchronising automatically on reconnection.

### Architecture Pattern

**Layered client-server with offline-first PWA**

The frontend handles voice capture and local queuing; the backend provides agent orchestration, tool execution, and persistence; external services handle STT/TTS/LLM inference.

### Technology Stack at a Glance

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 + React + Tailwind | Voice UI, dashboards, offline manager |
| **Backend** | Vercel Edge Functions + Node.js | Agent orchestration, tool execution, API |
| **Database** | Supabase PostgreSQL 15 | Persistent storage with RLS |
| **Auth** | Supabase Auth | JWT-based identity and session management |
| **STT** | AssemblyAI Universal-1 | Audio → transcript conversion |
| **LLM/Agent** | OpenAI GPT-4o Agent SDK | Intent parsing, tool orchestration |
| **TTS** | OpenAI TTS-1-HD | Text → audio response synthesis |
| **Offline** | IndexedDB + Workbox Service Worker | Local queue, asset caching, sync engine |
| **Deployment** | Vercel | Edge deployment, global CDN, auto-scaling |
| **Monitoring** | Sentry + Vercel Analytics | Error tracking, performance monitoring |

---

## Actor Definitions

### 1. Technician

**Primary field user.**

**Responsibilities:**
- Query equipment history and specifications by voice
- Create inspection reports and record findings
- Generate work orders for maintenance tasks
- Update work order status as tasks progress
- Continue operating when offline; accept automatic sync

**Permissions:**
- SELECT equipment, repair_history, work_orders, inspection_reports
- INSERT own inspection_reports, work_orders, activity_logs
- UPDATE own work_orders (status changes only)
- Offline queue: MANAGE (create, read, mark synced)

**Restrictions:**
- Cannot VIEW other technicians' personal data
- Cannot UPDATE or DELETE records created by others
- Cannot modify database schema or create new tables

---

### 2. Supervisor

**Secondary oversight user.**

**Responsibilities:**
- Monitor all technician activities in real time
- Manage work order progress and escalation
- Acknowledge and resolve critical alerts
- Review transcripts for quality assurance
- Access audit trail and performance metrics

**Permissions:**
- SELECT all tables (full read access)
- UPDATE alerts (status, acknowledgement)
- READ transcripts, activity_logs, inspection_reports (all technicians)

**Restrictions:**
- Cannot INSERT inspections or work orders (created by technicians only)
- Cannot access production data for purposes outside operations
- Cannot modify authentication or authorization settings

---

## Functional Requirements Mapping

| PRD Req | Requirement | Technical Implementation | Component | TRD Section |
|---------|-----------|------------------------|-----------|-------------|
| FR-1 | Voice Input | Web Audio API + getUserMedia() in Next.js | Frontend | §15 |
| FR-2 | Speech-to-Text | AssemblyAI Universal-1 REST API | STT Layer | §15 |
| FR-3 | AI Agent | OpenAI Agent SDK + GPT-4o with tool-calling | Agent Layer | §9 |
| FR-4 | Tool-Based DB Access | Tool functions for CRUD on Supabase PostgreSQL | Tool Layer | §10 |
| FR-5 | Dynamic SQL Generation | Read-only SQL engine with whitelist | Agent Layer | §9.4 |
| FR-6 | Voice Response (TTS) | OpenAI TTS-1-HD API, streamed to frontend | TTS Layer | §15 |
| FR-7 | Transcript Storage | transcripts table in Supabase with session_id | Database | §8 |
| FR-8 | Activity Logging | activity_logs table, auto-updated by tools | Database | §18 |
| FR-9 | Alert Engine | Auto-created on CRITICAL/HIGH severity | Agent Layer | §19 |
| FR-10 | Offline Operation | IndexedDB queue + Workbox Service Worker | Offline | §16 |
| FR-11 | Offline Sync | Background Sync API + /api/sync-offline endpoint | Offline | §16 |
| FR-12 | Technician Dashboard | Next.js voice-first UI, PWA offline cache | Frontend | §13 |
| FR-13 | Supervisor Dashboard | Next.js real-time UI, WebSocket subscriptions | Frontend | §14 |

---

## Use Case Diagram & Descriptions

### Use Cases by Actor

| Use Case | Technician | Supervisor | System |
|----------|:----------:|:----------:|:------:|
| UC-01 Query Equipment History | ✅ | ❌ | — |
| UC-02 Create Inspection Report | ✅ | ❌ | — |
| UC-03 Create Work Order | ✅ | ❌ | — |
| UC-04 Update Work Order Status | ✅ | ❌ | — |
| UC-05 View Technician Dashboard | ✅ | ❌ | — |
| UC-06 Record Offline Interaction | ✅ | ❌ | — |
| UC-07 Synchronise Offline Queue | ✅ | ❌ | — |
| UC-08 View Supervisor Dashboard | ❌ | ✅ | — |
| UC-09 View All Activities | ❌ | ✅ | — |
| UC-10 View All Work Orders | ❌ | ✅ | — |
| UC-11 Generate Alert (automatic) | — | — | ✅ |
| UC-12 Acknowledge / Resolve Alert | ❌ | ✅ | — |

### Use Case Descriptions

**UC-01: Query Equipment History**
- Technician speaks: "What was the last repair on MTR-102?"
- Agent retrieves repair_history for equipment_id=MTR-102
- System responds verbally with repair date, failure type, cost

**UC-02: Create Inspection Report**
- Technician speaks: "Create inspection for MTR-102. Cooling fan damaged. Severity critical."
- Agent extracts: equipment_id, description, severity
- System creates inspection_reports record
- If CRITICAL → automatically calls createAlert tool
- Supervisor notified via WebSocket

**UC-03: Create Work Order**
- Technician speaks: "Create work order for cooling fan replacement"
- Agent calls createWorkOrder with equipment_id, priority
- System auto-generates work_order_number (WO-XXXX)
- Technician receives verbal confirmation

**UC-04: Update Work Order Status**
- Technician speaks: "Mark WO-1001 as in progress"
- Agent calls updateWorkOrder with new status
- System records timestamp and updates status

**UC-05: View Technician Dashboard**
- Technician opens dashboard on mobile device
- Views: voice interface, my work orders, inspections, sync status
- Can scroll through recent activities
- Offline mode: shows cached data

**UC-06: Record Offline Interaction**
- Technician is offline (no network)
- Voice recording captured normally
- Audio stored to IndexedDB with PENDING_SYNC status
- UI shows: "1 interaction pending sync"

**UC-07: Synchronise Offline Queue**
- Connectivity restored (navigator.onLine = true)
- Service Worker Background Sync triggers
- Queue items processed FIFO through Agent pipeline
- Each item response stored in local history
- UI shows progress: "Syncing 1 of 3"

**UC-08: View Supervisor Dashboard**
- Supervisor opens web dashboard
- Sees real-time metrics, activity feed, alerts, work orders
- WebSocket updates refresh metrics in real time

**UC-09: View All Activities**
- Supervisor filters activity feed by technician or date range
- Clicks any activity to expand transcript view
- Full audit trail visible

**UC-10: View All Work Orders**
- Supervisor sees all open/in-progress/closed work orders
- Can filter by priority, technician, equipment
- Sort by age, priority, status
- One-click bulk status changes

**UC-11: Generate Alert**
- System trigger: Inspection created with severity=CRITICAL
- Alert automatically created (status=OPEN)
- WebSocket push sends to all supervisor connections
- Browser notification (if enabled)

**UC-12: Acknowledge / Resolve Alert**
- Supervisor clicks ACKNOWLEDGE button on alert
- Status changed from OPEN → ACKNOWLEDGED
- Supervisor ID and timestamp recorded
- Then status changes to RESOLVED when issue is addressed

---

## Architecture Diagrams

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FIELD DEVICE (PWA)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Voice Input → Audio Capture → Microphone (Web Audio API) │ │
│  │  ↓                                                          │ │
│  │  On-Device ASR (Whisper tiny/small for offline)           │ │
│  │  ↓                                                          │ │
│  │  Offline Queue Manager (IndexedDB)                        │ │
│  │  ↓                                                          │ │
│  │  Service Worker (Workbox) — caching, background sync      │ │
│  │  ↓                                                          │ │
│  │  Next.js Frontend (React) — voice UI, dashboards           │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (online) / IndexedDB (offline)
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Vercel)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  JWT Validation → Role-based Routing                       │ │
│  │  Rate Limiting (60 req/min per user)                      │ │
│  │  Request Deserialisation                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                   AGENT ORCHESTRATION (Node.js)                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  OpenAI Agent SDK (GPT-4o)                                 │ │
│  │  - Intent Classification                                   │ │
│  │  - Tool Selection & Calling                                │ │
│  │  - Context Management                                      │ │
│  │  - Response Generation                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
      ┌────────────────────┼────────────────────┐
      ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ TOOL LAYER   │    │  EXTERNAL    │    │ DATABASE     │
│ ────────────  │    │  SERVICES    │    │ ────────────  │
│ Tool Executor│    │ ────────────  │    │ Supabase     │
│ - getEquip   │    │ AssemblyAI   │    │ PostgreSQL   │
│ - createInsp │    │ (STT)        │    │ - 9 tables   │
│ - createWO   │    │              │    │ - RLS enabled│
│ - updateWO   │    │ OpenAI       │    │              │
│ - createAlert│    │ (TTS, LLM)   │    │ Vector store │
│ - logActivity│    │              │    │ (pgvector)   │
└──────────────┘    └──────────────┘    └──────────────┘
      ↓                    ↓                    ↓
      └────────────────────┼────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                    EVENT BUS / RESPONSE PATH                     │
│  Transcripts → Activity Logs → WebSocket Push → Supervisor      │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                  SUPERVISOR DASHBOARD (Web)                      │
│  Real-time Activity Feed, Work Orders, Alerts, Transcripts      │
└──────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Frontend (Next.js 14 PWA)**
- Voice Capture Component — microphone button, waveform visualiser, transcript display
- Technician Dashboard — work orders, inspections, activity, sync status
- Supervisor Dashboard — activity feed, alerts, work orders, transcripts
- Offline Queue Manager — monitors navigator.onLine, stores to IndexedDB
- Service Worker Integration — Workbox, precaches assets, triggers background sync

**API Gateway / Agent Orchestration Layer**
- Request Router — validates JWT, routes to agent or offline endpoint
- Agent Engine (OpenAI Agent SDK) — receives transcript, selects and executes tools
- SQL Query Engine — restricted read-only SELECT on approved tables
- TTS Bridge — sends response to OpenAI TTS, streams audio to client

**Tool Layer**
- `getEquipmentHistory` — reads repair_history for equipment_id
- `createInspection` — inserts into inspection_reports, triggers alert if CRITICAL
- `createWorkOrder` — inserts into work_orders, auto-assigns work_order_number
- `updateWorkOrder` — updates status, sets completed_at if CLOSED
- `createAlert` — inserts into alerts, pushes to supervisor WebSocket
- `logActivity` — appended automatically by every tool

**Data Access Layer**
- Repository pattern wrapping Supabase client
- Parameterised queries only — no string interpolation
- Row-Level Security policies enforced at DB level

**External Services**
- AssemblyAI Universal-1 — STT with confidence scoring
- OpenAI GPT-4o — agent reasoning, intent classification
- OpenAI TTS-1-HD — high-quality voice synthesis
- Supabase Auth — JWT issuance, OAuth, session management

---

## Domain Model & ERD

### Core Entities

| Entity | Purpose | Key Attributes |
|--------|---------|-----------------|
| **User** | Technicians and supervisors | employee_code, full_name, email, role |
| **Equipment** | Physical machines | equipment_code, location, status, manufacturer |
| **RepairHistory** | Past maintenance records | equipment_id, repair_date, failure_type, cost |
| **InspectionReport** | Field findings | equipment_id, severity, description, status |
| **WorkOrder** | Maintenance tasks | equipment_id, work_order_number, priority, status |
| **Transcript** | Voice interaction audit | user_id, user_prompt, agent_response, session_id |
| **ActivityLog** | Immutable action trail | user_id, action_type, entity_type, entity_id |
| **Alert** | Critical incidents | equipment_id, severity, status, message |
| **EquipmentDocument** | Reference materials | equipment_id, document_text, embedding (future) |

### Entity Relationships

```
User (1) ──────── (N) InspectionReport
  │                      │
  │ creates               │ triggers
  │                       ↓
  │               (1) Alert (N)
  │
  ├─ (1) ──────── (N) WorkOrder
  │
  ├─ (1) ──────── (N) Transcript
  │
  └─ (1) ──────── (N) ActivityLog

Equipment (1) ──────── (N) RepairHistory
Equipment (1) ──────── (N) InspectionReport
Equipment (1) ──────── (N) WorkOrder
Equipment (1) ──────── (N) Alert
Equipment (1) ──────── (N) EquipmentDocument
```

---

## Database Design

### Table: users

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `employee_code` | VARCHAR(20) | UNIQUE NOT NULL | Human-readable ID (TECH001) |
| `full_name` | VARCHAR(100) | NOT NULL | User's full name |
| `email` | VARCHAR(100) | UNIQUE NOT NULL | Login email |
| `role` | ENUM | NOT NULL | TECHNICIAN or SUPERVISOR |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification |

**RLS Policy**: Technicians SELECT own row; Supervisors SELECT all rows.

---

### Table: equipment

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `equipment_code` | VARCHAR(20) | UNIQUE NOT NULL | Human-readable code (MTR-102) |
| `name` | VARCHAR(100) | NOT NULL | Descriptive name |
| `location` | VARCHAR(100) | NOT NULL | Physical location |
| `manufacturer` | VARCHAR(100) | NULL | OEM name |
| `installation_date` | DATE | NULL | Installation date |
| `status` | ENUM | NOT NULL | ACTIVE, UNDER_MAINTENANCE, RETIRED |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |

**RLS Policy**: All authenticated users SELECT; only supervisors INSERT/UPDATE/DELETE.

---

### Table: repair_history

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `equipment_id` | UUID | FK equipment.id NOT NULL | Equipment repaired |
| `repair_date` | DATE | NOT NULL | Date of repair |
| `failure_type` | VARCHAR(100) | NOT NULL | Failure category |
| `description` | TEXT | NULL | Full narrative |
| `performed_by` | UUID | FK users.id NULL | Technician who performed |
| `repair_duration_hours` | DECIMAL(5,2) | NULL | Hours spent |
| `cost` | DECIMAL(10,2) | NULL | Total cost |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |

**RLS Policy**: All users SELECT; inserts via tool layer only.

---

### Table: inspection_reports

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `equipment_id` | UUID | FK equipment.id NOT NULL | Inspected equipment |
| `technician_id` | UUID | FK users.id NOT NULL | Creating technician |
| `title` | VARCHAR(200) | NOT NULL | Inspection title |
| `description` | TEXT | NOT NULL | Detailed findings |
| `recommendation` | TEXT | NULL | Recommended action |
| `severity` | ENUM | NOT NULL | LOW, MEDIUM, HIGH, CRITICAL |
| `status` | ENUM | DEFAULT 'OPEN' | OPEN, REVIEWED, CLOSED |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |

**RLS Policy**: Technicians INSERT/UPDATE own records; supervisors SELECT all.

---

### Table: work_orders

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `work_order_number` | VARCHAR(20) | UNIQUE NOT NULL | Auto-generated (WO-XXXX) |
| `equipment_id` | UUID | FK equipment.id NOT NULL | Target equipment |
| `created_by` | UUID | FK users.id NOT NULL | Creating technician |
| `assigned_to` | UUID | FK users.id NULL | Assigned technician |
| `title` | VARCHAR(200) | NOT NULL | WO title |
| `description` | TEXT | NOT NULL | Task description |
| `priority` | ENUM | NOT NULL | LOW, MEDIUM, HIGH, CRITICAL |
| `status` | ENUM | DEFAULT 'OPEN' | OPEN, IN_PROGRESS, CLOSED |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `completed_at` | TIMESTAMPTZ | NULL | Completion time (set when CLOSED) |

**RLS Policy**: Technicians INSERT/UPDATE own records; supervisors SELECT/UPDATE all.

---

### Table: transcripts

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | FK users.id NOT NULL | Interacting user |
| `user_prompt` | TEXT | NOT NULL | Transcribed voice input |
| `agent_response` | TEXT | NOT NULL | Agent's response |
| `session_id` | VARCHAR(100) | NOT NULL | Groups multi-turn interactions |
| `tools_used` | TEXT[] | NULL | Array of tool names invoked |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Interaction timestamp |

**RLS Policy**: Technicians SELECT own records; supervisors SELECT all.

---

### Table: activity_logs

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | FK users.id NOT NULL | Actor |
| `action_type` | VARCHAR(100) | NOT NULL | QUERY, CREATE_INSPECTION, etc. |
| `entity_type` | VARCHAR(100) | NOT NULL | Equipment, InspectionReport, etc. |
| `entity_id` | UUID | NOT NULL | FK to affected entity |
| `description` | TEXT | NULL | Human-readable summary |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Action timestamp |

**RLS Policy**: No DELETE/UPDATE allowed; technicians SELECT own rows; supervisors SELECT all.

---

### Table: alerts

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `equipment_id` | UUID | FK equipment.id NOT NULL | Source equipment |
| `inspection_report_id` | UUID | FK inspection_reports.id NULL | Triggering inspection |
| `severity` | ENUM | NOT NULL | HIGH, CRITICAL |
| `message` | TEXT | NOT NULL | Alert message |
| `status` | ENUM | DEFAULT 'OPEN' | OPEN, ACKNOWLEDGED, RESOLVED |
| `acknowledged_by` | UUID | FK users.id NULL | Supervisor who acknowledged |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Alert creation |
| `resolved_at` | TIMESTAMPTZ | NULL | Resolution timestamp |

**RLS Policy**: Technicians: no access; supervisors: SELECT/UPDATE all.

---

### Table: equipment_documents

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `equipment_id` | UUID | FK equipment.id NOT NULL | Associated equipment |
| `document_name` | VARCHAR(200) | NOT NULL | Document title |
| `document_type` | VARCHAR(50) | NOT NULL | Manual, SOP, Troubleshooting, Schematic |
| `document_text` | TEXT | NOT NULL | Full text content |
| `embedding` | vector(1536) | NULL | Future: pgvector embedding for RAG |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |

**RLS Policy**: All users SELECT; admins INSERT/UPDATE.

---

## Agent Design

### Agent Responsibilities

- Interpret natural-language voice transcripts into structured intents
- Select the most appropriate tool(s) for the identified intent
- Orchestrate multi-step tool chains (e.g., createInspection → createAlert)
- Validate tool outputs before generating responses
- Generate concise, TTS-safe responses (< 30 seconds of speech)
- Enforce role-based permissions before invoking write tools
- Handle errors gracefully with informative fallback messages

### Agent Workflow

1. **Transcript received** from AssemblyAI with context (user_id, role, session_id)
2. **System prompt injected** — includes role, approved tools, permission boundaries
3. **GPT-4o analyses** transcript; selects tool(s) via function calling
4. **Agent executes** tools in sequence; each returns structured JSON
5. **Validation** — outputs checked for error states
6. **Response generation** — natural-language response (max 50 words for simple queries)
7. **TTS encoding** — response sent to OpenAI TTS
8. **Audio streamed** — to client for playback
9. **Storage** — transcript, response, and tools_used recorded in DB
10. **Activity log** — entry created for audit trail

### Intent → Tool Mapping

| User Intent Pattern | Selected Tool(s) |
|---------------------|------------------|
| "What was…", "Tell me…", "Show history…" | `getEquipmentHistory` |
| "Create inspection…", "Log inspection…" | `createInspection` → `createAlert` (if CRITICAL) |
| "Create work order…", "Schedule maintenance…" | `createWorkOrder` |
| "Update…", "Mark as…", "Close work order…" | `updateWorkOrder` |
| "Query…", "How many…", "List all…" (no tool match) | SQL query engine (read-only) |
| Any tool success (automatic) | `logActivity` |

### SQL Generation Strategy

**Triggered when**: No predefined tool matches the intent

**Restrictions**:
- SELECT statements only (no INSERT, UPDATE, DELETE, DROP, ALTER)
- Approved tables: equipment, repair_history, work_orders, inspection_reports
- Result limit: 100 rows maximum via LIMIT clause
- Parameterised queries only (no string interpolation)
- Whitelist parser validates all generated SQL

### System Prompt Design

The system prompt provided to GPT-4o includes:

```
Role definition: "You are a voice assistant for field technicians."

User context:
- role (TECHNICIAN | SUPERVISOR)
- user_id, employee_code

Tool catalogue with parameter schemas and usage examples

Permission rules: "Do not call write tools if the user role is SUPERVISOR"

Response constraints:
  - Keep responses under 50 words
  - Use plain English
  - Avoid markdown
  - Make responses suitable for TTS playback (no bullet points, no special chars)

Error handling:
  - Explain errors in plain terms without technical jargon
  - Suggest next steps for recovery
```

### Context Management

| Context Field | Source | Purpose |
|---------------|--------|---------|
| `user_id` | JWT claim | Identifies interacting user |
| `role` | JWT claim | Controls which tools agent may invoke |
| `session_id` | Frontend UUID | Groups multi-turn interactions |
| `timestamp` | Server-generated | Accurate ordering of offline synced interactions |
| `conversation_history` | Last 5 turns from transcripts | Enables multi-turn reference ("that equipment I asked about") |

---

## Tool Specifications

### Tool 1: getEquipmentHistory

**Purpose**: Retrieve maintenance and repair history for specific equipment.

**Inputs**:
- `equipment_id` (UUID, required) — equipment's UUID
- `limit` (Integer, optional, default 10, max 100) — max records to return

**Outputs**:
- `repairs` (Array) — list of repair_history records with date, failure_type, description, performed_by, cost

**Validation Rules**:
- equipment_id must match a record in equipment table
- limit must be between 1 and 100

**Failure Cases**:
- Equipment not found → error: "Equipment not found"
- No repair records → returns empty array with message
- DB timeout → error with retry suggestion

---

### Tool 2: createInspection

**Purpose**: Create new inspection report; auto-generate alerts if severity=CRITICAL.

**Inputs**:
- `equipment_id` (UUID, required)
- `title` (String, required, max 200 chars)
- `description` (String, required) — detailed findings
- `recommendation` (String, optional)
- `severity` (Enum, required) — LOW | MEDIUM | HIGH | CRITICAL

**Outputs**:
- `inspection_id` (UUID)
- `status` (String) — always 'OPEN'
- `alert_generated` (Boolean) — true if alert auto-created
- `created_at` (Timestamp)

**Validation Rules**:
- equipment_id must exist in equipment table
- severity must be valid enum value
- Caller must have role=TECHNICIAN
- title and description cannot be empty

**Failure Cases**:
- Invalid equipment_id → validation error
- Permission denied (SUPERVISOR attempted) → permission error
- DB constraint violation → error with details

---

### Tool 3: createWorkOrder

**Purpose**: Create work order; auto-generate WO-XXXX number.

**Inputs**:
- `equipment_id` (UUID, required)
- `title` (String, required, max 200 chars)
- `description` (String, required)
- `priority` (Enum, required) — LOW | MEDIUM | HIGH | CRITICAL
- `assigned_to` (UUID, optional) — defaults to creating user

**Outputs**:
- `work_order_id` (UUID)
- `work_order_number` (String) — auto-generated (WO-XXXX)
- `status` (String) — always 'OPEN'
- `created_at` (Timestamp)

**Validation Rules**:
- equipment_id must exist
- priority must be valid enum
- Caller must have role=TECHNICIAN

**Failure Cases**:
- Invalid equipment_id → validation error
- Invalid assigned_to → "Technician not found"

---

### Tool 4: updateWorkOrder

**Purpose**: Update work order status; set completed_at when status=CLOSED.

**Inputs**:
- `work_order_id` (UUID, required)
- `status` (Enum, required) — OPEN | IN_PROGRESS | CLOSED
- `notes` (String, optional) — update notes

**Outputs**:
- `work_order_id` (UUID)
- `status` (String)
- `completed_at` (Timestamp | null) — set when CLOSED

**Validation Rules**:
- work_order_id must exist
- Caller must own the work order (role=TECHNICIAN) or be SUPERVISOR
- Status transition must be forward-only (OPEN→IN_PROGRESS→CLOSED)

**Failure Cases**:
- Work order not found → error
- Invalid status transition → "Cannot change from CLOSED to OPEN"

---

### Tool 5: createAlert

**Purpose**: Generate critical incident alert; visible to supervisors.

**Inputs**:
- `equipment_id` (UUID, required)
- `inspection_report_id` (UUID, optional)
- `severity` (Enum, required) — HIGH | CRITICAL
- `message` (String, required) — human-readable description

**Outputs**:
- `alert_id` (UUID)
- `status` (String) — always 'OPEN'
- `created_at` (Timestamp)

**Validation Rules**:
- equipment_id must exist
- severity must be HIGH or CRITICAL
- message cannot be empty

**Failure Cases**:
- Invalid equipment_id → validation error
- WebSocket push failure → alert still created; push retried

---

### Tool 6: logActivity

**Purpose**: Record immutable audit log entry; called automatically by all other tools.

**Inputs**:
- `user_id` (UUID, required, from JWT)
- `action_type` (String, required) — QUERY_EQUIPMENT | CREATE_INSPECTION | CREATE_WORK_ORDER | etc.
- `entity_type` (String, required) — Equipment | InspectionReport | WorkOrder | Alert
- `entity_id` (UUID, required) — FK to affected record
- `description` (String, optional)

**Outputs**:
- `log_id` (UUID)

**Validation Rules**:
- All required fields must be present
- action_type must be known event type

**Failure Cases**:
- Logging failure is non-blocking — main operation succeeds; error logged separately

---

## API Design

All endpoints require JWT Bearer token. All request/response bodies are JSON. Rate limit: 60 requests per minute per user.

### Error Envelope (all endpoints)

```json
{
  "error": "string description",
  "code": "ERROR_CODE",
  "timestamp": "ISO8601"
}
```

---

### POST /api/voice-query

**Purpose**: Submit voice transcript for agent processing; returns text response ready for TTS.

**Request**:
```json
{
  "transcript": "string (required)",
  "session_id": "string (required)"
}
```

**Response (200 OK)**:
```json
{
  "agent_response": "string",
  "transcript_id": "uuid",
  "tools_used": ["tool_name"],
  "status": "success"
}
```

**Error Responses**:
- 400: Invalid or empty transcript
- 401: Missing or expired JWT
- 429: Rate limit exceeded
- 500: Agent processing failure

---

### POST /api/inspection

**Purpose**: Create inspection report directly.

**Request**:
```json
{
  "equipment_id": "uuid",
  "title": "string",
  "description": "string",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommendation": "string (optional)"
}
```

**Response (200 OK)**:
```json
{
  "inspection_id": "uuid",
  "status": "OPEN",
  "alert_generated": true|false,
  "created_at": "ISO8601"
}
```

**Error Responses**:
- 400: Validation failure
- 401: Unauthorised
- 403: Role not permitted (SUPERVISOR)

---

### POST /api/work-order

**Purpose**: Create work order from voice or REST.

**Request**:
```json
{
  "equipment_id": "uuid",
  "title": "string",
  "description": "string",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "assigned_to": "uuid (optional)"
}
```

**Response (200 OK)**:
```json
{
  "work_order_id": "uuid",
  "work_order_number": "WO-XXXX",
  "status": "OPEN",
  "created_at": "ISO8601"
}
```

---

### PATCH /api/work-order/:id

**Purpose**: Update work order status.

**Request**:
```json
{
  "status": "OPEN|IN_PROGRESS|CLOSED",
  "notes": "string (optional)"
}
```

**Response (200 OK)**:
```json
{
  "work_order_id": "uuid",
  "status": "string",
  "completed_at": "ISO8601|null"
}
```

---

### GET /api/equipment/:id/history

**Purpose**: Retrieve repair history for equipment.

**Query**: `?limit=10` (default 10, max 100)

**Response (200 OK)**:
```json
{
  "equipment_id": "uuid",
  "equipment_code": "string",
  "repairs": [
    {
      "repair_date": "date",
      "failure_type": "string",
      "description": "string",
      "cost": "decimal",
      "performed_by": "string"
    }
  ]
}
```

---

### POST /api/sync-offline-queue

**Purpose**: Batch process locally queued interactions.

**Request**:
```json
{
  "queue_items": [
    {
      "queue_id": "string",
      "transcript": "string",
      "timestamp": "ISO8601",
      "attempt_count": 0
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "processed": 5,
  "failed": 0,
  "results": [
    {
      "queue_id": "string",
      "status": "SYNCED|FAILED",
      "agent_response": "string"
    }
  ]
}
```

**Error Responses**:
- 400: Empty or malformed queue_items
- 401: Unauthorised
- 413: Queue exceeds 100 items

---

### GET /api/dashboard/technician

**Purpose**: Aggregated dashboard data for authenticated technician.

**Response (200 OK)**:
```json
{
  "recent_activities": [...],
  "my_work_orders": [...],
  "my_inspections": [...],
  "offline_pending_count": 0
}
```

---

### GET /api/dashboard/supervisor

**Purpose**: Aggregated dashboard data for supervisor.

**Query**: `?date_from=ISO8601&date_to=ISO8601` (optional filter)

**Response (200 OK)**:
```json
{
  "activity_feed": [...],
  "all_work_orders": [...],
  "alerts": [...],
  "technicians": [...],
  "summary": {
    "open_work_orders": 0,
    "critical_alerts": 0,
    "activities_today": 0,
    "technicians_online": 0
  }
}
```

---

## Authentication & Authorization

### Authentication (Supabase Auth)

- Email/password authentication with optional OAuth2 (Google, Microsoft)
- JWT issued on login; expires after 1 hour
- JWT payload: user_id, role, employee_code, exp
- Refresh token extends session without re-authentication
- All API requests require: `Authorization: Bearer <jwt>`
- Offline mode caches JWT in secure storage; uses cached token for sync

### Authorization Matrix

| Action | Technician | Supervisor | Mechanism |
|--------|:----------:|:----------:|-----------|
| Query Equipment | ✅ | ❌ | API level + RLS |
| Create Inspection | ✅ | ❌ | Tool validation |
| Create Work Order | ✅ | ❌ | Tool validation |
| Update Own WO | ✅ | ❌ | RLS: WHERE created_by = auth.uid() |
| Update Any WO | ❌ | ✅ | RLS: role = SUPERVISOR |
| View Own Dashboard | ✅ | ❌ | API level |
| View Supervisor Dashboard | ❌ | ✅ | API level |
| View All Activities | ❌ | ✅ | RLS: role = SUPERVISOR |
| View All Alerts | ❌ | ✅ | RLS: role = SUPERVISOR |
| Acknowledge Alert | ❌ | ✅ | Tool validation |

### Multi-Level Enforcement

1. **API level** — JWT validation and role check on every request
2. **Agent level** — System prompt enforces permissions; agent refuses out-of-scope tools
3. **Tool level** — Each write tool validates user role before executing
4. **Database level** — Row-Level Security policies (defence in depth)

### Session Management

- JWT cached in httpOnly cookie or secure browser storage
- Automatic token refresh 5 minutes before expiry
- Offline interactions re-authenticated on sync using cached JWT
- Logout clears JWT, offline cache, and IndexedDB user data

---

## Technician Dashboard Design

### Purpose

Mobile-first interface for daily field operations. Voice interaction is primary; UI elements are secondary.

### Key Features

**Voice Assistant Interface**
- Large push-to-talk button (minimum 64px, accessible with gloved hands)
- Real-time waveform visualisation during recording
- Live transcript display as audio is captured
- Agent response playback with visual speaking indicator
- History of last 10 voice interactions

**My Work Orders**
- Open work orders listed first with priority colour coding
- In-progress work orders with elapsed time indicator
- Quick update: voice command or one-tap status change
- Filter by status and priority

**My Inspection Reports**
- All inspections sorted by severity (CRITICAL first)
- Status badges: OPEN (red), REVIEWED (amber), CLOSED (green)
- Tap to view full details and recommendations

**Offline Sync Status**
- Persistent banner: 'Online' (green dot) or 'Offline — N pending' (amber dot)
- Manual sync button available when online
- Visual progress bar during sync operation
- Success/failure toast notification

### Layout

| Zone | Contents |
|------|----------|
| **Header** | User avatar, employee name, online/offline indicator, settings |
| **Main (top 60%)** | Voice assistant: mic button, waveform, transcript, playback |
| **Main (bottom 40%)** | Tab strip: Work Orders \| Inspections \| Activity |
| **Footer** | Offline sync status bar with pending count and sync button |

### Responsive & Accessibility

- Mobile-first; primary layout for 375–428px screens
- Dark mode supported for bright-sunlight visibility
- ARIA labels on all interactive elements
- Minimum touch target: 44px × 44px (WCAG 2.1 AA)
- All app shell assets cached — app loads in under 2 seconds offline

---

## Supervisor Dashboard Design

### Purpose

Web-based operational control panel giving supervisors real-time visibility into all field activity, work orders, alerts, and transcripts.

### Summary Metrics Bar

| Metric Card | Data Source | Refresh |
|-------------|-------------|---------|
| Open Work Orders | COUNT work_orders WHERE status=OPEN | Real-time (WebSocket) |
| Critical Alerts | COUNT alerts WHERE status=OPEN AND severity=CRITICAL | Real-time (WebSocket) |
| Activities Today | COUNT activity_logs WHERE date=today | Every 30 seconds |
| Technicians Online | Presence via heartbeat API | Every 60 seconds |

### Activity Feed

- Live stream of all technician actions via WebSocket subscription
- Filterable by technician, date range, and action type
- Each entry: technician name, action, equipment reference, timestamp
- Click any entry to expand the full voice transcript and agent response
- Export to CSV for compliance reporting

### Work Order Management

- Kanban view: OPEN \| IN_PROGRESS \| CLOSED columns
- Cards show: WO number, title, assigned technician, priority badge, age
- Overdue work orders (OPEN > 48 hours) highlighted in red
- Bulk status update: select multiple + change status

### Alert Management

- CRITICAL alerts shown with red badge at top of feed
- One-click ACKNOWLEDGE transitions alert status and records supervisor_id
- One-click RESOLVE closes the alert and records resolved_at timestamp
- Alert history view: all resolved alerts with timeline

### Transcript Monitoring

- Full-text search across all voice transcripts (PostgreSQL full-text index)
- Filter by technician, date range, or equipment code
- Side-by-side view: technician prompt left, agent response right
- Flag for review: supervisors can mark transcripts for QA follow-up

### Navigation

| Sidebar Item | View |
|-------------|------|
| Dashboard | Summary metrics + combined feed |
| Work Orders | Kanban and list views with filters |
| Inspections | All inspections by severity and status |
| Alerts | Alert feed with acknowledge/resolve actions |
| Transcripts | Searchable transcript log |
| Technicians | Roster with status, last activity, and workload |

---

## Speech Processing Pipeline

### Audio Capture

- `getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })` for 16 kHz mono
- AudioContext and ScriptProcessorNode for real-time waveform visualisation
- Automatic gain control (AGC) enabled for varying field volumes
- Audio encoded as WAV (PCM 16-bit) or OGG/Opus
- Microphone permission requested on first use
- Audio streamed directly to AssemblyAI — NOT stored on server

### STT Flow (AssemblyAI)

1. Audio stream opened to AssemblyAI Universal-1 via REST or WebSocket
2. Transcript returned with confidence score per word
3. If overall confidence < 60%: frontend prompts "Could you repeat that more clearly?"
4. Transcript passed to /api/voice-query with session_id
5. Transcript stored in transcripts table (text only, no audio)

### TTS Flow (OpenAI TTS-1-HD)

1. Agent response text sent to OpenAI TTS API with voice='nova'
2. API returns MP3 audio stream
3. Frontend receives audio stream and begins playback immediately (streaming mode)
4. Visual speaking indicator shown during playback
5. User can pause; replay available for last 3 responses

### Latency Budget

| Stage | Target | Max | Failure Action |
|-------|--------|-----|-----------------|
| Audio capture → submit | < 0.5s | 1s | Cancel and retry |
| AssemblyAI STT processing | 2–5s | 8s | Prompt user to retry |
| Agent processing (GPT-4o) | 2–3s | 8s | Return error; transcript still stored |
| TTS generation (OpenAI) | 1–2s | 5s | Return text response instead |
| Audio playback start | < 0.2s | 0.5s | Text fallback |
| **Total (voice to response)** | **6–12s** | **25s** | Error with apology message |

---

## Offline Architecture

### PWA Architecture

- Application is installable as PWA on iOS (Safari 16+) and Android (Chrome 112+)
- Web App Manifest defines app name, icon, display: standalone, and theme colour
- Add to Home Screen prompt triggered after 2 successful sessions
- Service Worker registered on first load, updated automatically on new deployment

### Service Worker (Workbox) Strategies

| Resource Type | Cache Strategy | Rationale |
|---|---|---|
| App shell (HTML/CSS/JS) | Cache First | Must load instantly offline |
| API calls (/api/*) | Network First with IndexedDB fallback | Fresh data preferred; stale acceptable offline |
| Static assets (images, fonts) | Stale While Revalidate | Performance vs freshness balance |
| Voice queries | Queue to IndexedDB if offline | No network = queue interaction |
| /api/health ping | Network Only | Connectivity detection |

### IndexedDB Schema

| Object Store | Key | Fields | Purpose |
|---|---|---|---|
| `offline_queue` | queue_id | transcript, timestamp, status, attempt_count | Pending interactions awaiting sync |
| `voice_recordings` | queue_id | audio_blob, timestamp | Temporary raw audio (cleared after sync) |
| `sync_metadata` | key | last_sync, items_synced, last_error | Sync state tracking |
| `user_cache` | user_id | employee_code, role, recent_equipment | Cached user and equipment data |

### Sync Engine

1. `navigator.onLine` event fires → Service Worker receives 'online'
2. Background Sync API fires 'voiceassistant-sync' event
3. Sync engine reads all PENDING_SYNC items from offline_queue (FIFO)
4. Items batched (max 10 per request) and POSTed to /api/sync-offline-queue
5. Server processes each item independently through Agent pipeline
6. On success: item status updated to SYNCED; voice_recordings deleted
7. On failure: attempt_count incremented; exponential backoff applied
8. After 3 failures: status=FAILED; user notified with option to retry manually

### Retry Mechanism

| Attempt | Delay | Status |
|---------|-------|--------|
| 1st (auto) | 0s — immediate on reconnection | SYNCING |
| 2nd (auto) | 1 second backoff | SYNCING |
| 3rd (auto) | 5 seconds backoff | SYNCING |
| 4th+ (manual) | User triggers retry button | PENDING_SYNC → SYNCING |
| After 3 auto failures | No more auto retries | FAILED |

### Connectivity Detection

- **Primary**: `navigator.onLine` API (instant response)
- **Secondary**: Periodic ping to /api/health every 30 seconds (catches captive portals)
- **UI indicator**: Green dot (Online) \| Amber dot with count (N pending) \| Red dot (Offline)
- **Sync trigger**: Automatic when ping or navigator.onLine returns true

### Data Consistency

- Offline mode never writes directly to server — only queues locally
- Server is the single source of truth; no client-side conflict resolution
- Queue items are idempotent — each carries UUID to prevent duplicates
- Local cache invalidated after successful sync
- JWT expiry during offline: user prompted to re-authenticate before sync

---

## Sequence Diagrams

### Sequence 1: Voice Query (Online)

```
Technician        Frontend        AssemblyAI    API Gateway    Agent    DB
    │               │                │              │           │        │
    │── speaks ────>│                │              │           │        │
    │               │── stream audio→│              │           │        │
    │               │<── transcript ─│              │           │        │
    │               │── POST /voice-query ─────────>│           │        │
    │               │                              │ (JWT check)│        │
    │               │                              │─────────>  │        │
    │               │                              │ (inject context)    │
    │               │                              │─ send transcript ──>│
    │               │                              │           │ select tool
    │               │                              │           │── call tool
    │               │                              │           │<── results
    │               │                              │<── response ────────│
    │               │<── response text ────────────│           │        │
    │               │ TTS request ────────────────>OpenAI TTS   │        │
    │               │<── audio stream ────────────<OpenAI      │        │
    │<── plays ─────│                              │           │        │
```

### Sequence 2: Create Inspection (with Alert)

```
Technician    Frontend    AssemblyAI    API    Agent    DB         Supervisor
    │            │           │          │        │       │             │
    │─ dictate──>│            │          │        │       │             │
    │            │─ stream ──>│          │        │       │             │
    │            │<─ text ────│          │        │       │             │
    │            │─ voice-query ────────>│        │       │             │
    │            │            │          │─────>  │       │             │
    │            │            │          │  (parse intent) │            │
    │            │            │          │─ createInspection ───────>│  │
    │            │            │          │        │<──────inspection_id─│
    │            │            │          │        │ (CRITICAL detected)  │
    │            │            │          │─ createAlert ─────────────>│  │
    │            │            │          │        │<──────alert_id──────│
    │            │            │          │        │        (stored)     │
    │            │            │          │─ logActivity ────────────>│  │
    │            │<── response ──────────│        │       │             │
    │            │ TTS request ─────────>OpenAI   │       │             │
    │            │<── audio ────────────<OpenAI   │       │  WebSocket push
    │<── audio ──│                       │        │       │────────────>│
                                                                   (notified)
```

### Sequence 3: Offline Recording & Sync

```
Technician    Frontend(PWA)    IndexedDB    Service Worker    Server    DB
    │            │                │              │              │        │
    │─ offline──>│ (no network)   │              │              │        │
    │            │─ detect offline│              │              │        │
    │            │─ enqueue ─────>│              │              │        │
    │<── "1 pending" ──│           │              │              │        │
    │            │    (store locally)            │              │        │
    │            │                │              │              │        │
    │  [connectivity restored]     │              │              │        │
    │            │                │              │              │        │
    │            │                │              │ (online event)│        │
    │            │                │<─ background sync fires ──>  │        │
    │            │─ read pending ─>│              │              │        │
    │            │<── queue items ─│              │              │        │
    │            │─ POST /sync ───────────────────────────────>│        │
    │            │                │              │              │─ process items
    │            │                │              │              │<── responses
    │            │                │              │              │─ store
    │            │<── results ────────────────────────────────│        │
    │            │─ mark SYNCED ──>│              │              │        │
    │<── "0 pending" ──│           │              │              │        │
```

---

## Activity Logging Design

### Logging Strategy

Every significant action is logged automatically by the `logActivity` tool, called at the end of every other tool's successful execution. Logs are immutable (no UPDATE or DELETE) and serve as the audit trail and supervisor feed data source.

### Log Events

| Event Type | Trigger | Data Captured |
|---|---|---|
| QUERY_EQUIPMENT | getEquipmentHistory called | equipment_id, limit, timestamp |
| CREATE_INSPECTION | createInspection succeeds | equipment_id, severity, inspection_id |
| UPDATE_INSPECTION | Status changed | inspection_id, old_status, new_status |
| CREATE_WORK_ORDER | createWorkOrder succeeds | equipment_id, priority, work_order_id |
| UPDATE_WORK_ORDER | Status changed | work_order_id, old_status, new_status |
| CREATE_ALERT | createAlert succeeds | equipment_id, severity, alert_id |
| ACKNOWLEDGE_ALERT | Supervisor acknowledges | alert_id, supervisor_id |
| RESOLVE_ALERT | Supervisor resolves | alert_id, supervisor_id |
| VOICE_QUERY | Voice interaction processed | transcript_id, tools_used[] |
| SYNC_OFFLINE | Offline queue synced | item_count, sync_duration_ms |

### Dashboard Integration

- Supervisor activity feed reads activity_logs via WebSocket for real-time updates
- Full-text search on description column using PostgreSQL GIN index
- Technician personal feed reads activity_logs WHERE user_id = auth.uid()

---

## Alert Engine Design

### Alert Trigger Conditions

| Condition | Severity Generated | Immediate Action |
|---|---|---|
| Inspection created with severity=CRITICAL | CRITICAL | Alert created + WebSocket push |
| Inspection created with severity=HIGH on critical equipment | HIGH | Alert created + feed entry |
| Work order created with priority=CRITICAL | CRITICAL | Alert created + WebSocket push |
| Equipment status changed to UNDER_MAINTENANCE unexpectedly | HIGH | Alert created + feed entry |

### Alert Lifecycle

```
OPEN
  ↓
ACKNOWLEDGED (supervisor reviewed; recorded timestamp + supervisor_id)
  ↓
RESOLVED (issue addressed; recorded timestamp)
```

Or: Auto-close after 72 hours with no action.

### Supervisor Notification

- WebSocket channel: supervisors subscribe on dashboard load
- Real-time badge count on Alerts sidebar item
- Browser notification (if permission granted) for CRITICAL alerts
- Email notification: configurable per supervisor (future enhancement)

---

## Non-Functional Requirements

### Performance

| Metric | Target | Acceptance Criterion |
|--------|--------|----------------------|
| Total voice-to-response latency | 6–12 seconds | P95 under 15s in 4G |
| STT processing | 2–5 seconds | AssemblyAI SLA |
| Agent inference | 2–3 seconds | P95 under 5s |
| Database query (equipment history) | < 200ms | Indexed query |
| Dashboard initial load | < 2 seconds | Lighthouse ≥ 90 |
| Offline queue sync per item | < 5 seconds | Serial processing |
| UI interaction response | < 100ms | Button click → visual |
| Audio playback start | < 200ms | Streaming TTS |

### Security

- All API communication over HTTPS (TLS 1.3+)
- JWT with 1-hour expiry; refresh tokens in httpOnly cookies
- Row-Level Security enabled on all database tables
- Parameterised queries throughout — no raw SQL
- Audio data never stored server-side
- CORS restricted to approved frontend origin
- API rate limiting: 60 req/min per user, 200 req/min per IP
- Secrets managed via Vercel environment variables

### Availability & Reliability

| Requirement | Target | Mechanism |
|---|---|---|
| System uptime | 99.5% during business hours | Vercel edge + Supabase replication |
| Offline operation | 100% for queuing | PWA + IndexedDB |
| Data durability | No queue data loss | IndexedDB persistence + retry |
| Sync reliability | 100% eventually consistent | Exponential backoff + manual retry |
| Database failover | < 60s RTO | Supabase managed failover |

### Scalability

- Stateless API design — horizontal scaling via Vercel serverless
- Target: 1,000+ concurrent technicians
- Database indexes on: equipment_code, technician_id, created_at, status
- Connection pooling via Supabase PgBouncer
- Rate limiting prevents single-user abuse

### Maintainability

- Repository pattern decouples business logic from Supabase client
- All tools independently testable with mocked DB
- OpenAPI/Swagger documentation auto-generated
- Environment-based configuration
- Target test coverage: > 90% unit, 100% critical path integration

---

## Deployment Architecture

### Infrastructure Overview

| Component | Platform | Configuration |
|---|---|---|
| Frontend (Next.js PWA) | Vercel | Edge deployment, global CDN, auto-scaling |
| API / Agent Layer | Vercel Serverless Functions | Node.js runtime, 30s max execution |
| Database | Supabase | Primary + read replica, daily backups, PITR |
| Authentication | Supabase Auth | JWT, OAuth2, session management |
| STT | AssemblyAI API | External SaaS — no infrastructure management |
| LLM / Agent | OpenAI API | External SaaS — no infrastructure management |
| TTS | OpenAI API | External SaaS — no infrastructure management |
| CDN | Vercel Edge Network | Global, automatic |
| Error Monitoring | Sentry | Slack integration for P1 alerts |
| Performance | Vercel Analytics | Core Web Vitals, function latency |

### CI/CD Pipeline

1. Developer pushes to feature branch → GitHub PR opened
2. GitHub Actions: lint → unit tests → build → type check
3. PR merge to main → deploy to Vercel staging automatically
4. Smoke tests run on staging: voice query, inspection creation, offline sync
5. Manual approval gate before production deploy
6. Deploy to Vercel production → health check endpoint pinged
7. Sentry release created; monitoring alerts activated

---

## Testing Strategy

### Test Coverage by Type

| Test Type | Framework | Scope | Coverage Target |
|---|---|---|---|
| Unit Testing | Jest | Individual tool functions | ≥ 90% |
| Integration Testing | Supertest + Jest | API endpoints (test schema) | All critical paths |
| Agent Testing | Custom suite | Tool selection, permissions | 20+ cases per tool |
| Component Testing | React Testing Library | Voice UI, dashboards | All interactive components |
| Offline Testing | Workbox utilities | IndexedDB, Service Worker | All offline scenarios |
| End-to-End Testing | Cypress | Complete user flows | 5 critical journeys |
| Performance Testing | Lighthouse CI | Core Web Vitals | Score ≥ 90 |
| Security Testing | OWASP ZAP | JWT bypass, SQL injection, XSS | Zero HIGH findings |

### Key Test Scenarios

**Voice Query**:
- Clear speech → correct tool → correct response
- Low confidence → retry prompt triggered
- Unknown equipment → graceful error
- Network interruption → queued to IndexedDB

**Offline Sync**:
- 5 items queued → all sync correctly
- JWT expiry → re-auth prompted
- Server error on 2nd item → retry with backoff
- Duplicate sync → idempotent processing

---

## Risks and Limitations

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| STT inaccuracy with accents/noise | Medium | High | Domain vocabulary + confidence threshold |
| Agent hallucination | Low | High | Temperature=0.2 + output validation |
| OpenAI rate limits | Low | Medium | Request queuing + exponential backoff |
| IndexedDB storage limits | Low | Medium | Queue cap at 100 items; periodic cleanup |
| Service Worker conflicts | Low | Medium | Workbox version management; skipWaiting |
| JWT expiry during offline | Medium | Medium | Detect expiry; prompt re-auth before sync |

### Operational Limitations

- Audio not permanently stored — no playback replay after interaction
- Offline queue capped at 100 items — extended outages may hit limit
- STT requires reasonably clear audio — heavy machinery noise degrades accuracy
- Agent requires structured intent — ambiguous utterances may fail
- TTS latency (6–12s) not suitable for urgent safety instructions
- Initial app setup requires online session — cannot cold-start fully offline

---

## Future Enhancements

### Near-Term (3–6 months)

- Push notifications for CRITICAL alerts on supervisor mobile devices
- Multi-language STT support (Spanish, Hindi, Mandarin)
- Voice command shortcuts: "Show my open work orders"
- Export reports: PDF work orders and inspection summaries

### Mid-Term (6–12 months)

- RAG integration: pgvector embeddings on equipment_documents
- Real-time streaming STT (AssemblyAI streaming API) — < 6 second total latency
- Predictive maintenance: ML model on repair_history
- Computer vision: camera capture for equipment damage detection
- ERP integration: bi-directional sync with SAP / Maximo

### Long-Term Vision

- Native iOS/Android app for deeper offline capability
- IoT sensor integration: automatic alerts from equipment telemetry
- Personalised voice model: fine-tuned STT per technician
- Automated scheduling: AI-driven calendar based on predicted failures

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-05-15 | Project Team | Initial release |
| 2.0 | 2026-06-12 | Project Team | Comprehensive revision with detailed design sections |

---

**Generated**: June 12, 2026  
**Project**: Voice-First AI Assistant for Field Service Operations  
**Assignment**: #11 — Voice AI (5 Students, 15 + 3 Bonus Marks)  
**Status**: Final
