# VoxField API Flows

## Overview

VoxField exposes a collection of Next.js API Routes that act as the communication layer between the frontend, AI agent, business logic layer, and Supabase database.

The API layer follows a consistent pattern:


```mermaid
flowchart TD
    A[Client Request]
    B[API Route]
    C[Authentication]
    D[Validation]
    E[Service Layer / Agent]
    F[(Supabase Database)]
    G[Response]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
```

Most routes use the shared API infrastructure:

```text
withApiHandler()
parseJsonBody()
apiSuccess()
```

This ensures consistent authentication, error handling, and response formatting.

---

# API Architecture

```mermaid
flowchart TD
    A[Frontend]
    B[Next.js API Routes]
    C[Voice APIs]
    D[Inspection APIs]
    E[Work Order APIs]
    F[Dashboard APIs]
    G[Sync APIs]
    H[Service Layer / Agent Layer]
    I[(Supabase PostgreSQL)]

    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    B --> G
    B --> H
    H --> I
```

---

# Voice Query Flow

## Endpoint

```text
POST /api/voice-query
```

## Purpose

Processes natural language voice requests through the AI agent.

Authentication:

```text
Required
```

---

## Flow

```mermaid
flowchart TD
    A[User Voice]
    B[Speech-to-Text]
    C[Voice Transcript]
    D["POST /api/voice-query"]
    E["processVoiceQuery()"]
    F[Load Conversation Context]
    G[GPT-4o Agent]
    H[Tool Execution]
    I[(Database Operations)]
    J[Agent Response]
    K[Transcript Storage]
    L[Response Returned]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
```

---

## Internal Processing

The route:

1. Creates a Supabase client
2. Parses the request body
3. Validates `userPrompt`
4. Calls `processVoiceQuery()`
5. Returns the AI response

Example request:

```json
{
  "userPrompt": "Show me all open work orders",
  "sessionId": "session-123"
}
```

Example response:

```json
{
  "success": true,
  "data": {
    "agentResponse": "...",
    "transcriptId": "...",
    "sessionId": "...",
    "toolsUsed": [...]
  }
}
```

---

# Inspection Creation Flow

## Endpoint

```text
POST /api/inspections/create
```

## Purpose

Creates inspection reports submitted by technicians.

Authentication:

```text
Required
```

Roles:

```text
TECHNICIAN only
```

---

## Flow

```mermaid
flowchart TD
    A[Technician]
    B[Inspection Form]
    C["POST /api/inspections/create"]
    D[Authentication Check]
    E[Parse Request Body]
    F["createInspection()"]
    G[Validation]
    H[Insert Inspection Report]
    I[Generate Alert if Required]
    J[Create Activity Log]
    K[Response]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
```

---

## Business Logic

The inspection service may:

* Create inspection records
* Classify severity
* Generate alerts
* Update dashboard metrics
* Create activity history

Example outcomes:
```mermaid
flowchart TD
    A[Inspection Submitted]

    A --> B[LOW Severity]
    A --> C[CRITICAL Severity]

    B --> D[Inspection Only]

    C --> E[Inspection Created]
    E --> F[Alert Creation]
```

---

# Work Order Creation Flow

## Endpoint

```text
POST /api/work-orders/create
```

## Purpose

Creates maintenance work orders.

Authentication:

```text
Required
```

Roles:

```text
TECHNICIAN only
```

---

## Flow

```mermaid
flowchart TD
    A[Technician]
    B[Create Work Order]
    C["POST /api/work-orders/create"]
    D[Authentication Check]
    E[Parse Request Body]
    F["createWorkOrder()"]
    G[Validation]
    H[Database Insert]
    I[Assignment Logic]
    J[Activity Log]
    K[Response]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
```

---

## Work Order Lifecycle

```mermaid
flowchart TD
    A[OPEN]
    B[IN_PROGRESS]
    C[CLOSED]

    A --> B
    B --> C
```

---

# Dashboard Data Flow

## Technician Dashboard

Endpoint:

```text
GET /api/dashboard/technician
```

Flow:

```mermaid
flowchart TD
    A[Dashboard Load]
    B[API Request]
    C[Authentication]
    D["getTechnicianDashboard()"]
    E[Supabase Queries]
    F[Aggregated Data]
    G[Dashboard Response]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
```

Returned data includes:

* Assigned work orders
* Inspection history
* Voice transcripts
* Activity logs
* Offline sync status

---

## Supervisor Dashboard

Endpoint:

```text
GET /api/dashboard/supervisor
```

Flow:

```mermaid
flowchart TD
    A[Supervisor Dashboard]
    B[API Request]
    C[Authentication]
    D["getSupervisorDashboard()"]
    E[Aggregate Queries]
    F[KPI Calculations]
    G[Response]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
```

Returned data includes:

* KPI metrics
* Alerts
* Work orders
* Inspections
* Equipment data
* Technician activity
* Repair history

---

# Equipment History Flow

## Endpoint

```text
GET /api/equipment/[id]/history
```

Purpose:

Retrieve maintenance history for a specific equipment asset.

Flow:

```mermaid
flowchart TD
    A[Equipment Selection]
    B[Equipment API]
    C[Repair History Query]
    D[Equipment Records]
    E[Response]

    A --> B
    B --> C
    C --> D
    D --> E
```

Returned data:

* Equipment details
* Historical repairs
* Failure records
* Maintenance information

---

# Speech-to-Text Flow

## Endpoint

```text
POST /api/stt
```

Purpose:

Convert recorded speech into text.

Flow:

```mermaid
flowchart TD
    A[Audio Recording]
    B[Upload Audio]
    C[AssemblyAI]
    D[Transcript]
    E[Response]

    A --> B
    B --> C
    C --> D
    D --> E
```

Output:

```json
{
  "text": "Create a work order for the HVAC unit"
}
```

---

# Text-to-Speech Flow

## Endpoint

```text
POST /api/tts
```

Purpose:

Convert AI-generated text responses into audio.

Flow:

```mermaid
flowchart TD
    A[Agent Response]
    B["POST /api/tts"]
    C[OpenAI TTS]
    D[Audio Output]

    A --> B
    B --> C
    C --> D
```

Output:

```text
Audio Stream
```

---

# Offline Synchronization Flow

## Endpoint

```text
POST /api/sync-offline-queue
```

Purpose:

Synchronize offline actions after connectivity is restored.

Flow:

```mermaid
flowchart TD
    A[Offline Action]
    B[IndexedDB Queue]
    C[Connectivity Restored]
    D["syncOfflineQueue()"]
    E["POST /api/sync-offline-queue"]
    F[(Database Operations)]
    G[Queue Updated]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
```

---

# Authentication Flow

Most protected endpoints use:

```text
withApiHandler()
```

with:

```text
auth: true
```

or:

```text
roles: ["TECHNICIAN"]
roles: ["SUPERVISOR"]
```

Flow:

```mermaid
flowchart TD
    A[Incoming Request]
    B[JWT Validation]
    C[Role Verification]
    D[Route Execution]

    A --> B
    B --> C
    C --> D
```

Unauthorized users receive an authentication error before business logic executes.

---

# Common API Pattern

Most routes follow this structure:

```mermaid
flowchart TD
    A[Request]
    B["withApiHandler()"]
    C["parseJsonBody()"]
    D[Service Function]
    E[(Supabase)]
    F["apiSuccess()"]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
```

Benefits:

* Consistent error handling
* Reusable authentication
* Centralized validation
* Predictable responses
* Easier testing

---

# Design Principles

The VoxField API layer is designed around:

1. Thin route handlers
2. Service-layer business logic
3. Consistent authentication
4. Role-based authorization
5. Structured responses
6. AI-assisted workflows
7. Offline-first support
8. Scalable architecture