# Agent Tooling Review and Redesign
## Voice-First AI Assistant — Field Service Operations

**Document Version**: 1.0  
**Date**: June 2026  
**Scope**: Review of all existing agent tools + recommended architecture  

---

## Table of Contents

1. [Current Tool Assessment](#1-current-tool-assessment)
2. [Gap Analysis](#2-gap-analysis)
3. [SQL Tool Review](#3-sql-tool-review)
4. [Recommended Tool Architecture](#4-recommended-tool-architecture)
5. [Natural Language Understanding Strategy](#5-natural-language-understanding-strategy)
6. [Complex Query Handling](#6-complex-query-handling)
7. [Recommended Agent Decision Flow](#7-recommended-agent-decision-flow)
8. [Future-Proof Architecture](#8-future-proof-architecture)

---

## 1. Current Tool Assessment

### 1.1 `getEquipmentHistory`

**Purpose**: Retrieves maintenance and repair history for a specific piece of equipment using its equipment code.

**Strengths**
- Covers the single most common technician query (what happened to this machine last?)
- Resolves the equipment code to a UUID internally via `resolveEquipmentId`, so the caller does not need to know database IDs
- Accepts an optional `limit` parameter giving the agent some control over result size
- Wraps errors and returns them as JSON, preventing unhandled crashes

**Weaknesses**
- Returns raw database records without summarisation; a TTS agent will struggle to read out an array of objects verbally
- `limit` defaults to 5, which is arbitrary and unexplained — for a technician asking "show me all failures this year" the limit silently truncates
- No date range filter — impossible to answer "what happened last month?"
- No failure-type filter — cannot answer "how many compressor failures has this unit had?"
- No sorting control exposed to the agent

**Missing Functionality**
- Date range parameters (`from`, `to`)
- Failure type filter
- Configurable sort order (most recent first vs. chronological)
- Summary mode: aggregate counts by failure type suitable for spoken response

**Scalability Concerns**
- No pagination beyond `limit`; with high-volume equipment, 5 records is insufficient for analytical questions

**Reliability Concerns**
- If `resolveEquipmentId` returns no match, the error message ("Equipment X not found") is descriptive. However, the LLM receives a JSON error string and must decide how to surface it — no standard error shape is enforced

**Security Concerns**
- No row-level scope enforcement at the tool level — it queries all repair_history for the equipment regardless of which technician is asking. This is likely acceptable since repair history is not personal data, but it should be documented

**Situations Where the Tool May Fail**
- User says "the rooftop HVAC" instead of "HVAC-R1-01" — `ilike` on `equipment_code` won't match a partial description; entity resolution fails
- User asks for history across multiple pieces of equipment ("show me failures for all pumps") — only accepts a single code
- `limit` silently drops records the user expects to see

---

### 1.2 `createInspection`

**Purpose**: Creates an inspection report for a specific piece of equipment. Automatically generates an alert when severity is CRITICAL.

**Strengths**
- Natural fit to the core technician workflow; covers UC-02 directly
- Auto-alert on CRITICAL is a strong safety feature
- Passes all fields through to the service layer cleanly
- Optional `recommendation` field gives the agent flexibility

**Weaknesses**
- `severity` enum covers CRITICAL but the description does not state what happens with HIGH — the auto-alert behaviour is inconsistently documented (alert engine in TRD says HIGH also triggers alerts)
- No `status` field provided at creation — the service layer presumably sets it to OPEN, but this is invisible to the agent
- No idempotency key — offline sync may replay a voice command and create duplicate inspections
- No attachment/photo reference field (future need noted in TRD)

**Missing Functionality**
- Idempotency key to prevent duplicate creation on offline replay
- `location` or `zone` sub-field for large equipment installations
- Ability to reference a prior work order ("this inspection closes WO-0042")
- Confirmation that the alert was or was not created (the return payload should make this explicit)

**Reliability Concerns**
- Duplicate creation risk during offline queue replay is the most serious concern. Without an idempotency mechanism, a technician's dictated inspection could be inserted twice

**Security Concerns**
- The `technician_id` is derived from the `user` parameter passed in at tool-factory time — this is correct. However, the tool must verify the authenticated user's role is TECHNICIAN (or that supervisors cannot call this tool)

**Situations Where the Tool May Fail**
- Technician says "severity medium-high" — LLM must map to enum value; ambiguous mapping may produce an invalid value not caught before the DB insert
- Technician provides a partial equipment name that `resolveEquipmentId` cannot match

---

### 1.3 `createWorkOrder`

**Purpose**: Creates a new work order for a piece of equipment.

**Strengths**
- Auto-generates a work order number, reducing technician burden
- `assignedTo` is optional, defaulting to the current user — sensible default
- Maps directly to UC-03

**Weaknesses**
- `assignedTo` accepts a raw UUID — a technician will never know another user's UUID; the agent must somehow resolve "assign to Dave" to a UUID with no lookup tool available
- No scheduled date or due date field
- No link to a triggering inspection — a work order created after an inspection has no FK to that inspection_report
- Priority enum is identical to inspection severity enum but serves a different semantic purpose — conflating them may confuse the LLM

**Missing Functionality**
- Technician/assignee name resolution (the agent needs a way to look up UUID by name)
- Scheduled date / due date
- Inspection reference (`inspection_report_id`)
- Estimated duration

**Reliability Concerns**
- If `assignedTo` is omitted and the current user is a supervisor (who should not be creating work orders per TRD §3.2), the tool will create a work order attributed to a supervisor

**Security Concerns**
- Supervisor should not be able to call this tool. Role check must be enforced

**Situations Where the Tool May Fail**
- "Assign to the on-call technician" — no lookup capability; agent must either fail or guess
- User provides relative urgency ("this is really urgent") — agent must infer CRITICAL priority, which may not always be correct

---

### 1.4 `updateWorkOrder`

**Purpose**: Updates the status of an existing work order. Technicians can only update their own.

**Strengths**
- Sequential status enforcement (OPEN → IN_PROGRESS → CLOSED) is documented in description
- Auto-sets `completedAt` when status becomes CLOSED — good data integrity
- `resolveWorkOrderId` correctly maps human-readable WO numbers to UUIDs

**Weaknesses**
- The "sequential" constraint is described but not enforced in the tool itself — it is delegated to the service layer. If the service does not enforce this, the agent could jump from OPEN to CLOSED
- No way to add a completion note or resolution description when closing
- No way to partially update (e.g., change priority without changing status)

**Missing Functionality**
- Completion note / resolution description
- Priority update
- Reassignment capability (supervisor only)
- Partial update support

**Situations Where the Tool May Fail**
- Technician tries to close a work order assigned to a colleague — the "own work orders only" restriction is described but error messaging may be opaque
- User says "mark WO-2023-001 as done" — agent must infer "done" = CLOSED; this works if prompt engineering is correct but may fail for unusual phrasing

---

### 1.5 `createAlert`

**Purpose**: Manually creates a HIGH or CRITICAL alert for a piece of equipment.

**Strengths**
- Provides an escape hatch for situations where no inspection exists but an alert is warranted
- Narrow severity enum (HIGH/CRITICAL only) prevents abuse for low-priority alerts

**Weaknesses**
- The description explicitly states "it is preferred to use `createInspection` with CRITICAL severity" — this creates a tool selection ambiguity where the LLM may not always choose correctly
- Direct insert into `alerts` table bypasses the service layer — no `source` field validation, no activity logging, no supervisor notification triggering (unless the database trigger handles it)
- `source` is hardcoded to `"AGENT_MANUAL"` — there is no way for the agent to specify whether this was technician-initiated or system-initiated
- No `inspection_report_id` link — a manual alert is untraceably disconnected from any inspection context

**Missing Functionality**
- Linkage to an inspection or work order for traceability
- Proper service-layer call instead of raw `supabase.from("alerts").insert()`

**Security Concerns**
- This is the only tool with a raw `.insert()` directly on the Supabase client rather than going through a service function. This bypasses any business logic in the service layer (e.g. RLS checks, audit logging, duplicate detection)

**Situations Where the Tool May Fail**
- If the WebSocket supervisor notification is triggered by a database trigger (common with Supabase Realtime), it will fire. But if it requires a service-layer call, it will be silently skipped

---

### 1.6 `executeDatabaseQuery`

Covered in detail in Section 3.

---

## 2. Gap Analysis

### 2.1 User Queries That Cannot Currently Be Handled

| User Query | Why It Fails |
|---|---|
| "Show all pumps that are frequently failing" | No equipment search by type; `executeDatabaseQuery` could attempt it but requires the LLM to know the column name and value format for pump equipment codes |
| "Which technician closed the most work orders this month?" | Requires aggregation across `work_orders` and `users` — only `executeDatabaseQuery` can attempt this; high hallucination risk |
| "What equipment in Building A requires attention?" | No location-based equipment search tool |
| "How many preventive maintenance tasks are overdue?" | No concept of "overdue" in the schema — requires business logic the agent must infer |
| "Which assets have had repeated breakdowns?" | Multi-record aggregation; no tool for this |
| "Show me my open work orders" | `getEquipmentHistory` only takes an equipment code; no tool fetches work orders by technician |
| "What alerts are unresolved right now?" | No alerts query tool |
| "Assign this work order to Sarah" | `createWorkOrder.assignedTo` needs a UUID; no technician name→UUID lookup tool |
| "What did I do last week?" | No activity log query tool |
| "What is the current status of WO-2023-001?" | No work order status lookup tool |
| "Show all inspection reports for this area today" | No inspection query tool |
| "How long has this equipment been under maintenance?" | No derived duration calculation available |

### 2.2 Information the Agent Cannot Retrieve Effectively

- **Technician rosters** — no `listTechnicians` or `findTechnician` tool
- **Alert status and history** — no `getAlerts` or `listAlerts` tool
- **Inspection report listings** — no `listInspections` or `getInspection` tool
- **Work order listings by status** — no `listWorkOrders` tool
- **Equipment catalogue** — no `searchEquipment` tool by name, type, or location
- **KPI / aggregate metrics** — no dedicated analytics tool
- **Activity logs** — no `getActivityLog` tool

### 2.3 Cases Where the LLM Would Struggle to Choose the Correct Tool

- **`createAlert` vs `createInspection` with CRITICAL severity** — both create alerts; description says prefer `createInspection`, but the agent may pick `createAlert` for speed
- **`getEquipmentHistory` vs `executeDatabaseQuery`** — for simple history queries both work; the agent may incorrectly reach for SQL when the structured tool should be preferred
- **`createWorkOrder` vs `updateWorkOrder`** — if the user says "mark this as a work order", the agent must decide whether a WO already exists; without a lookup tool it cannot know

### 2.4 Cases Where Multiple Tools Should Be Combined

- **Investigate and act**: User says "this compressor looks damaged, file a critical inspection and create a work order for repair." → `createInspection` then `createWorkOrder`, in order, referencing the same equipment. No orchestration guidance exists.
- **Lookup before create**: "Create a work order and assign it to John" → must `findTechnician("John")` to get UUID, then `createWorkOrder(..., assignedTo: uuid)`.
- **Alert triage**: Supervisor asks "show me all critical alerts and their equipment history" → `listAlerts` then `getEquipmentHistory` per alert.

### 2.5 Missing Tools That Should Exist

| Missing Tool | Purpose |
|---|---|
| `searchEquipment` | Find equipment by name, type, location, or partial code |
| `findTechnician` | Resolve technician name to UUID |
| `listWorkOrders` | Query work orders by status, technician, equipment, or date range |
| `listInspections` | Query inspection reports by equipment, severity, or date range |
| `listAlerts` | Query open/acknowledged/resolved alerts |
| `getWorkOrder` | Retrieve a single work order by number |
| `getInspection` | Retrieve a single inspection report |
| `getEquipmentStatus` | Current status and specs of a piece of equipment |
| `getDashboardKPIs` | Aggregated supervisor metrics |
| `getActivityLog` | Technician activity history |
| `acknowledgeAlert` | Allow supervisor agent to act on alerts |

---

## 3. SQL Tool Review

### 3.1 `executeDatabaseQuery` — Current State

The tool accepts a raw SQL SELECT string generated by the LLM, runs a lightweight regex guard, and passes it to a Supabase RPC function `execute_read_only_sql`.

### 3.2 Whether SQL Generation Is the Right Approach

SQL generation is a **high-risk last resort**, not a primary retrieval strategy. The structured tools cover the most common actions; `executeDatabaseQuery` is intended for edge cases. However, the tool's description includes a comprehensive schema inline, which will encourage the LLM to reach for it frequently — especially when structured tools are absent (and many are, as shown in Section 2).

**Verdict**: SQL generation is acceptable as a safety valve for queries that cannot be satisfied by structured tools. It must not be the primary mechanism. The current implementation lacks sufficient guards to be safe at scale.

### 3.3 Potential Risks

| Risk | Severity | Notes |
|---|---|---|
| LLM hallucinating column/table names | High | Schema is provided inline, but LLM may confuse column names (e.g., `repair_date` vs `created_at`) |
| LLM generating correct SQL against wrong table | High | "Show me last month's inspections" could produce a valid-syntax query against `repair_history` |
| Data leakage across tenants | Critical | If multi-tenant is added, a SELECT with no tenant filter exposes all tenants' data |
| Returning large result sets | Medium | No LIMIT enforcement; a query returning 100,000 rows could crash the agent's context window |
| RPC bypass of Row-Level Security | High | Supabase's `execute_read_only_sql` RPC may run with service-role privileges, bypassing RLS entirely — this must be verified |
| Regex guard bypassable | High | `INSERT INTO` blocked but `SELECT INTO`, CTEs with side effects, or stored procedure calls may not be |

### 3.4 Hallucination Risks

- The LLM may invent column names not in the schema (e.g. `maintenance_type` instead of `failure_type`)
- The LLM may assume JOIN conditions that are semantically wrong (e.g. joining `inspection_reports` to `repair_history` on `equipment_id` is valid but may not answer the intended question)
- Natural language ambiguity: "last month" could mean calendar month or last 30 days — the LLM may pick either
- The LLM may add filters the user did not request (e.g. `WHERE status = 'OPEN'`) based on probabilistic inference

### 3.5 Security Concerns

1. **Regex guard is insufficient**. The current guard blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `GRANT`, `REVOKE`, `COMMIT`, `ROLLBACK`, `CREATE`, and `REPLACE`. It does not block:
   - `SELECT INTO` (creates a table in some dialects)
   - `COPY` (can write files on some PostgreSQL installations)
   - Calling stored procedures via `SELECT my_dangerous_function()`
   - Time-based blind injection through `pg_sleep()`
   - Information schema queries: `SELECT * FROM information_schema.tables`
2. **RPC execution context**: If `execute_read_only_sql` uses a service-role key, it bypasses RLS, meaning a TECHNICIAN could query another technician's personal records or supervisor-only data.
3. **No rate limiting on this specific tool** — a user could loop the agent to make hundreds of SQL calls.

### 3.6 Performance Concerns

- No `LIMIT` clause enforced — unbounded results
- No query timeout specified in the RPC call
- Complex analytical queries (GROUP BY with multiple JOINs) can be slow without query planning

### 3.7 Access Control Considerations

The tool must enforce:
- The authenticated user's `id` appears in any query filtering user-specific data
- RLS is not bypassed by the RPC function
- Supervisors may query all records; technicians may only query records visible to them

### 3.8 Recommended Improvements

#### A. Add a Dedicated Analytics Tool

Create `getAnalytics(metric, filters)` that pre-defines the 10–15 most common aggregate queries (failures by type, WO count by technician, alert trends, etc.) and executes them as parameterised queries. Reserve SQL generation only for truly ad-hoc queries that cannot be satisfied any other way.

#### B. Enforce Query Guardrails

Replace the regex guard with a proper SQL parser (e.g. `node-sql-parser`). Validate:
- Only one statement
- Statement type is SELECT
- No CTEs with side effects
- No system table access (`information_schema`, `pg_catalog`)
- No function calls except approved allow-list

#### C. Inject Row-Level Filters

Before executing, append ` -- user_id: <uuid>` as metadata and ensure the RPC function or a query rewriter injects `WHERE user_id = $current_user` for tables that are user-scoped. Alternatively, execute under a role-specific Supabase connection that has RLS active.

#### D. Enforce LIMIT

Append `LIMIT 100` (or a configurable cap) to all queries before execution.

#### E. Schema-Aware Query Generation

Provide the LLM with a curated schema description that uses business language rather than raw column names:

```
equipment_history (table: repair_history):
  - equipment_code: text identifier like "HVAC-R1-01"
  - repair_date: when the repair occurred (use for date filters)
  - failure_type: what failed
  - cost: repair cost in dollars
```

#### F. Result Summarisation Layer

Before returning SQL results to the agent, pass them through a summarisation step: "You retrieved 23 repair records. Summarise the key findings for a voice response." This prevents the LLM from attempting to read out raw JSON.

#### G. Query Logging and Auditing

Log every SQL query generated, the user who triggered it, and the result shape (row count, columns). Anomalous queries (full table scans, no WHERE clause) should trigger a review flag.

---

## 4. Recommended Tool Architecture

### 4.1 Design Principles

- **Structured tools first** — every common operation has a typed, parameterised tool. SQL is the last resort.
- **Entity resolution is automatic** — tools accept human-readable identifiers (equipment name, technician name, WO number) and resolve to IDs internally.
- **Response shapes are agent-friendly** — every tool returns a consistent envelope `{ success, data, summary, error }` where `summary` is a pre-formatted sentence suitable for TTS.
- **Role enforcement at the tool layer** — each tool declares its permitted roles and rejects calls from disallowed roles before touching the database.
- **Idempotency keys on mutations** — all write tools accept an optional `idempotency_key` to support offline queue replay.

### 4.2 Standard Response Envelope

Every tool returns:

```typescript
{
  success: boolean;
  data: Record<string, any> | null;
  summary: string;        // Pre-formatted sentence for TTS ("Found 3 repair records for HVAC-R1-01")
  error: string | null;
}
```

---

### Domain-Specific Tools

---

#### Tool: `getEquipmentHistory`

**Purpose**: Retrieve maintenance and repair history for a specific piece of equipment.

**Replaces**: Current `getEquipmentHistory`

**Input Schema**:
```typescript
{
  equipmentIdentifier: string;   // Code (e.g. "AC-101") or partial name (e.g. "rooftop HVAC")
  limit?: number;                // Default: 10
  from?: string;                 // ISO date, e.g. "2026-01-01"
  to?: string;                   // ISO date, e.g. "2026-06-30"
  failureType?: string;          // Optional filter by failure category
  summarise?: boolean;           // If true, return aggregate counts instead of records
}
```

**Output Schema** (envelope):
```typescript
{
  success: true,
  data: {
    equipment: { code, name, location, status },
    records: [{ repair_date, failure_type, description, cost, technician_name, duration_hours }],
    total_count: number,
    aggregate?: { by_failure_type: Record<string, number> }
  },
  summary: "AC-101 has 4 repair records. Most recent: compressor failure on 12 June 2026."
}
```

**When to use**: User asks about equipment maintenance history, repair records, past failures, or failure frequency.

**When NOT to use**: User wants current equipment status (use `getEquipmentStatus`), or wants to search by location across multiple assets (use `searchEquipment`).

**Example invocations**:
- `getEquipmentHistory({ equipmentIdentifier: "AC-101", limit: 5 })`
- `getEquipmentHistory({ equipmentIdentifier: "rooftop HVAC", from: "2026-01-01", summarise: true })`

---

#### Tool: `searchEquipment`

**Purpose**: Find equipment by name, type, location, or partial identifier. Resolves ambiguous natural language references to specific equipment records.

**Input Schema**:
```typescript
{
  query: string;           // Free-text: "pumps in building A", "all HVAC units", "GEN-B1"
  location?: string;       // Optional location filter
  status?: "ACTIVE" | "UNDER_MAINTENANCE" | "RETIRED";
  limit?: number;          // Default: 10
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    results: [{ equipment_code, name, location, status, manufacturer, installation_date }],
    total_count: number
  },
  summary: "Found 3 pumps in Building A. All are ACTIVE."
}
```

**When to use**: User mentions equipment by description, partial name, type, or location rather than an exact code. Use as a pre-step before other equipment tools when the code is unclear.

**When NOT to use**: The exact equipment code is already known.

---

#### Tool: `getEquipmentStatus`

**Purpose**: Retrieve the current operational status and specifications of a single piece of equipment.

**Input Schema**:
```typescript
{
  equipmentIdentifier: string;   // Code or partial name
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    equipment_code, name, location, status, manufacturer,
    installation_date, open_work_orders: number, open_alerts: number
  },
  summary: "PUMP-W-01 (Water Pump) is UNDER_MAINTENANCE with 2 open work orders."
}
```

**When to use**: User asks "what is the status of X", "is X operational", "is X under maintenance".

**When NOT to use**: User wants history (use `getEquipmentHistory`).

---

#### Tool: `createInspection`

**Purpose**: Create an inspection report for a piece of equipment. Automatically generates a HIGH or CRITICAL alert when severity warrants it.

**Input Schema**:
```typescript
{
  equipmentIdentifier: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation?: string;
  idempotency_key?: string;       // UUID; prevents duplicate on offline replay
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    inspection_id, inspection_number, equipment_code,
    severity, status: "OPEN",
    alert_created: boolean, alert_id?: string
  },
  summary: "Inspection INS-0042 created for AC-101 with CRITICAL severity. Alert ALT-0017 has been raised."
}
```

**When to use**: Technician is reporting findings after inspecting a piece of equipment.

**When NOT to use**: User wants to create a work order without an inspection (use `createWorkOrder` directly). Do NOT use to create alerts in isolation (the inspection auto-triggers them).

---

#### Tool: `listInspections`

**Purpose**: Retrieve inspection reports filtered by equipment, severity, status, technician, or date.

**Input Schema**:
```typescript
{
  equipmentIdentifier?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status?: "OPEN" | "REVIEWED" | "CLOSED";
  technicianId?: string;           // Resolved internally from name if provided as string
  from?: string;
  to?: string;
  limit?: number;
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    results: [{ inspection_number, equipment_code, title, severity, status, created_at, technician_name }],
    total_count: number
  },
  summary: "Found 5 CRITICAL inspection reports from the past 7 days."
}
```

**When to use**: Supervisor or technician asks to view inspection reports with any filter.

---

#### Tool: `createWorkOrder`

**Purpose**: Create a new work order for a piece of equipment, with optional assignment to a technician by name.

**Input Schema**:
```typescript
{
  equipmentIdentifier: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assignToName?: string;           // Human name; resolved to UUID internally
  inspectionReference?: string;   // Inspection number to link (e.g. "INS-0042")
  scheduledDate?: string;         // ISO date
  idempotency_key?: string;
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    work_order_number, equipment_code, priority, status: "OPEN",
    assigned_to_name, inspection_linked: boolean
  },
  summary: "Work order WO-0089 created for PUMP-W-01 at HIGH priority, assigned to John Miller."
}
```

**When to use**: Technician or (with future permission expansion) supervisor wants to initiate a maintenance task.

**When NOT to use**: Work order already exists and needs a status change (use `updateWorkOrder`).

---

#### Tool: `listWorkOrders`

**Purpose**: Query work orders by status, technician, equipment, priority, or date range.

**Input Schema**:
```typescript
{
  status?: "OPEN" | "IN_PROGRESS" | "CLOSED";
  equipmentIdentifier?: string;
  technicianName?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  from?: string;
  to?: string;
  limit?: number;
  myOrdersOnly?: boolean;   // Technician asking for their own WOs
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    results: [{ work_order_number, title, equipment_code, status, priority, assigned_to_name, created_at }],
    total_count: number
  },
  summary: "You have 3 open work orders. Highest priority: WO-0089 for PUMP-W-01."
}
```

**When to use**: User asks "show my work orders", "what's open", "list all in-progress tasks".

---

#### Tool: `getWorkOrder`

**Purpose**: Retrieve the full details of a single work order by its number.

**Input Schema**:
```typescript
{
  workOrderNumber: string;   // e.g. "WO-0089"
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    work_order_number, title, description, equipment_code, priority,
    status, assigned_to_name, created_by_name, created_at, completed_at,
    linked_inspection?: string
  },
  summary: "WO-0089 is IN_PROGRESS. Assigned to John Miller. Created 2 days ago for PUMP-W-01."
}
```

**When to use**: User references a specific work order number and wants its current state.

---

#### Tool: `updateWorkOrder`

**Purpose**: Update the status of an existing work order, with an optional resolution note.

**Input Schema**:
```typescript
{
  workOrderNumber: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  resolutionNote?: string;   // Required when status = CLOSED
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: { work_order_number, previous_status, new_status, completed_at?: string },
  summary: "Work order WO-0089 has been marked as CLOSED."
}
```

**When to use**: Technician reports progress or completion on a work order.

**When NOT to use**: Creating a new work order (use `createWorkOrder`). Reassigning a work order (supervisor-only, future tool).

---

#### Tool: `findTechnician`

**Purpose**: Resolve a technician's human name to their system UUID, and retrieve their current workload summary.

**Input Schema**:
```typescript
{
  name: string;   // Partial or full name: "John", "John Miller", "J. Miller"
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    id: string,                    // UUID for use in other tools
    full_name, employee_code, role,
    open_work_orders: number,
    status: "ONLINE" | "OFFLINE"
  },
  summary: "John Miller (EMP-042) has 2 open work orders and was last active 10 minutes ago."
}
```

**When to use**: Before calling `createWorkOrder` or `listWorkOrders` when the user mentions a technician by name. Always call this before passing a UUID to another tool.

**When NOT to use**: UUID is already known.

---

#### Tool: `listAlerts`

**Purpose**: Query open, acknowledged, or resolved alerts, optionally filtered by severity or equipment.

**Input Schema**:
```typescript
{
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  severity?: "HIGH" | "CRITICAL";
  equipmentIdentifier?: string;
  limit?: number;
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    results: [{ alert_id, severity, message, status, equipment_code, created_at, acknowledged_by_name }],
    total_count: number, critical_count: number
  },
  summary: "There are 4 open alerts: 2 CRITICAL, 2 HIGH."
}
```

**When to use**: Supervisor asks for alert overview or technician asks if any alerts exist for their equipment.

---

#### Tool: `acknowledgeAlert`

**Purpose**: Allow a supervisor to acknowledge or resolve an alert.

**Input Schema**:
```typescript
{
  alertId: string;
  action: "ACKNOWLEDGE" | "RESOLVE";
  note?: string;
}
```

**Permitted roles**: SUPERVISOR only.

**Output Schema**:
```typescript
{
  success: true,
  data: { alert_id, previous_status, new_status, timestamp },
  summary: "Alert ALT-0017 has been acknowledged."
}
```

---

#### Tool: `getDashboardKPIs`

**Purpose**: Return supervisor-level KPI metrics: open work orders, critical alert count, technician status, average resolution time.

**Input Schema**:
```typescript
{
  period?: "today" | "this_week" | "this_month";   // Default: today
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    open_work_orders: number,
    critical_alerts: number,
    technicians_online: number,
    technicians_offline: number,
    inspections_today: number,
    avg_work_order_resolution_hours: number
  },
  summary: "Today: 7 open work orders, 2 critical alerts, 12 technicians online."
}
```

**Permitted roles**: SUPERVISOR only.

**When to use**: Supervisor asks for an operational overview or a morning briefing.

---

#### Tool: `getActivityLog`

**Purpose**: Retrieve the activity log for the current technician or (supervisor only) for any technician.

**Input Schema**:
```typescript
{
  technicianName?: string;   // Supervisor only; defaults to current user if omitted
  from?: string;
  to?: string;
  limit?: number;
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    entries: [{ action_type, description, entity_type, entity_id, created_at }],
    total_count: number
  },
  summary: "You completed 6 actions today: 2 inspections, 3 work order updates, 1 history query."
}
```

---

### Generic Tools

---

#### Tool: `executeDatabaseQuery` (Restricted)

**Purpose**: Execute a read-only SQL SELECT query for analytical questions that cannot be satisfied by any structured tool.

**Input Schema**:
```typescript
{
  query: string;          // SELECT only
  context: string;        // The natural language question this query answers (for logging)
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: { rows: Record<string, any>[], row_count: number },
  summary: string   // Generated by a post-query summarisation step
}
```

**When to use**: Only after all relevant structured tools have been considered and found insufficient. For aggregate/analytical queries the structured tools cannot express.

**When NOT to use**: When any structured tool can satisfy the request. Equipment lookups, work order retrieval, inspection queries, alert queries — all have structured tools.

**Guardrails** (improvements over current implementation):
- SQL parsed with `node-sql-parser`; reject if not a single SELECT
- Block access to `information_schema`, `pg_catalog`, `pg_stat_*`
- Inject `LIMIT 100` if no LIMIT clause present
- Execute under a restricted DB role with RLS active (not service role)
- Log query, user, row_count, and latency
- Summarise results before returning to agent

---

#### Tool: `resolveEntity`

**Purpose**: Resolve an ambiguous natural language reference to a typed, identified database entity. Called automatically by other tools; can also be called explicitly by the agent.

**Input Schema**:
```typescript
{
  input: string;             // "the broken pump", "HVAC unit 01", "John", "WO 89"
  entityType: "equipment" | "technician" | "work_order" | "inspection" | "alert";
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    resolved_id: string,
    canonical_name: string,
    entity_type: string,
    confidence: number,        // 0.0–1.0
    alternatives?: [{ id, name }]  // If confidence < 0.9, offer alternatives
  },
  summary: "Resolved 'broken pump' to PUMP-W-01 (Water Pump, Building C)."
}
```

---

## 5. Natural Language Understanding Strategy

### 5.1 Entity Extraction Pipeline

When a user query arrives, the agent must perform entity extraction before tool selection. The system prompt must instruct the agent to identify:

1. **Equipment references** — exact codes ("AC-101"), partial names ("the rooftop HVAC"), type categories ("all pumps"), or location-qualified references ("the generator in Building B")
2. **Personnel references** — names ("John", "the on-call tech"), roles ("a supervisor"), or self-references ("my", "I", "me")
3. **Temporal references** — "last week", "this month", "since June", "in the past 24 hours"
4. **Action intent** — query, create, update, report, assign, acknowledge
5. **Severity/priority signals** — "critical", "urgent", "really bad", "low priority", "when you get a chance"

### 5.2 Ambiguity Handling

| Ambiguity Type | Strategy |
|---|---|
| Equipment name not unique | Call `searchEquipment`; if multiple results, present top 3 and ask for confirmation |
| Technician name ambiguous ("John" matches 3 people) | Call `findTechnician`; return alternatives in `summary`; ask user to clarify |
| Severity described informally ("pretty bad") | Map to MEDIUM; note uncertainty in the summary; confirm with user before writing |
| Time range unclear ("recently") | Default to last 7 days; state assumption in response |
| Action unclear ("do something about this pump") | Infer the most likely next action from context (create inspection if no inspection exists, else create work order) |

### 5.3 Business Language to Database Concept Mapping

The system prompt must include a business language glossary:

```
"breakdown" or "failure" → repair_history.failure_type or inspection severity HIGH/CRITICAL
"under repair" or "down" → equipment.status = 'UNDER_MAINTENANCE'
"open" (work order) → work_orders.status = 'OPEN'
"done" or "complete" or "fixed" → work_orders.status = 'CLOSED'
"urgent" → priority = 'HIGH' or 'CRITICAL' (choose CRITICAL only if user explicitly says critical)
"my tasks" → work_orders WHERE assigned_to = current_user_id
"this area" or "my area" → filter by technician's assigned location (if location is part of user profile)
```

### 5.4 Graceful Recovery

If the agent cannot confidently resolve an entity:

1. State what it understood: "I heard you mention a piece of equipment but couldn't identify it."
2. Offer the closest match: "Did you mean AC-101 (Rooftop Air Conditioner)?"
3. Ask a single clarifying question — never a list of questions
4. If voice-based: keep the clarification to one sentence that can be answered yes/no

### 5.5 Context Carryover

The agent must maintain within-session context:

- If the user just mentioned "the AC unit" and then says "create a work order for it", the agent should resolve "it" to the previously referenced equipment
- Recent tool results should be available to the agent as context, so "now close that work order" can reference the WO number returned a turn ago

---

## 6. Complex Query Handling

### 6.1 Multi-Step Queries

**Pattern**: User expresses a compound intent in a single utterance.

**Example**: "Record a critical inspection for AC-101, bearings worn. Then create a work order to replace them."

**Orchestration**:
1. `createInspection({ equipmentIdentifier: "AC-101", title: "Bearing wear detected", severity: "CRITICAL", description: "Bearings worn" })`
2. Store `inspection_id` from result
3. `createWorkOrder({ equipmentIdentifier: "AC-101", title: "Replace AC-101 bearings", priority: "CRITICAL", inspectionReference: <from step 1> })`
4. Compose a single spoken summary: "Done. Inspection INS-0042 created and alert raised. Work order WO-0089 created at CRITICAL priority."

The agent must be instructed in its system prompt to execute steps sequentially, use outputs of prior steps as inputs to subsequent steps, and aggregate results into a single coherent response.

### 6.2 Analytical Queries

**Example**: "Which technician has closed the most work orders this month?"

**Orchestration**:
1. Attempt with `getDashboardKPIs` — if the metric is available, return it
2. If not available, fall back to `executeDatabaseQuery` with a pre-approved query template:
   ```sql
   SELECT u.full_name, COUNT(*) as closed_count
   FROM work_orders w
   JOIN users u ON u.id = w.assigned_to
   WHERE w.status = 'CLOSED'
     AND w.completed_at >= date_trunc('month', now())
   GROUP BY u.full_name
   ORDER BY closed_count DESC
   LIMIT 5
   ```
3. Return results with spoken summary: "Top performer this month: John Miller with 12 closed work orders."

### 6.3 Comparative Queries

**Example**: "Which pumps fail more — the ones in Building A or Building B?"

**Orchestration**:
1. `searchEquipment({ query: "pumps", location: "Building A" })` → get equipment codes
2. For each code: `getEquipmentHistory({ equipmentIdentifier: code, summarise: true })`
3. Repeat for Building B
4. Compare aggregate failure counts; compose comparison response

If result count would exceed 5 tool calls, fall back to `executeDatabaseQuery` with a JOIN query.

### 6.4 Trend Analysis Queries

**Example**: "Is the number of HVAC failures increasing?"

**Orchestration**:
1. `executeDatabaseQuery` with a month-by-month grouping query
2. Post-process the results in the agent layer: compare month-over-month counts
3. Respond: "HVAC failures increased from 3 in April to 7 in June — a rising trend."

### 6.5 Root-Cause Investigation

**Example**: "Why does HVAC-R1-01 keep breaking down?"

**Orchestration**:
1. `getEquipmentHistory({ equipmentIdentifier: "HVAC-R1-01", summarise: true })` → failure type breakdown
2. `listInspections({ equipmentIdentifier: "HVAC-R1-01", status: "CLOSED" })` → past findings
3. Agent synthesises: "HVAC-R1-01 has had 5 compressor failures and 3 refrigerant leak inspections in the past year. The recurring compressor failures suggest inadequate preventive maintenance intervals."

### 6.6 Supervisor Reporting Queries

**Example**: "Give me a morning briefing."

**Orchestration**:
1. `getDashboardKPIs({ period: "today" })` — open WOs, alerts, technicians online
2. `listAlerts({ status: "OPEN", severity: "CRITICAL" })` — top critical items
3. Compose: "Good morning. You have 7 open work orders and 2 critical alerts. 12 technicians are online. Critical alert: AC failure in Building A, reported by John Miller 2 hours ago."

---

## 7. Recommended Agent Decision Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. USER QUERY RECEIVED                                             │
│     (voice transcript or text)                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. INTENT CLASSIFICATION                                           │
│                                                                     │
│  Categories:                                                        │
│  ├── QUERY    → retrieve information                                │
│  ├── CREATE   → insert a new record                                 │
│  ├── UPDATE   → modify an existing record                           │
│  ├── REPORT   → analytical / aggregate                              │
│  └── AMBIGUOUS → cannot classify with confidence                   │
│                                                                     │
│  If AMBIGUOUS → ask single clarifying question → restart            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. ENTITY EXTRACTION                                               │
│                                                                     │
│  Extract: equipment, technician, work order, alert, time range,    │
│           severity/priority                                         │
│                                                                     │
│  For each entity:                                                   │
│  ├── Exact match (code/number) → use directly                      │
│  ├── Partial/descriptive → queue for resolution (step 4)           │
│  └── Self-reference ("my", "I") → resolve to current user         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. ENTITY RESOLUTION                                               │
│                                                                     │
│  For each unresolved entity:                                        │
│  ├── Call `searchEquipment` or `findTechnician` or `resolveEntity` │
│  ├── Confidence ≥ 0.9 → proceed with resolved entity              │
│  ├── Confidence 0.5–0.9 → proceed but flag for confirmation       │
│  └── Confidence < 0.5 → ask user for clarification               │
│                                                                     │
│  Failure path: "I couldn't find equipment matching 'the big pump'. │
│  Did you mean PUMP-W-01 or PUMP-C-02?"                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. TOOL SELECTION                                                  │
│                                                                     │
│  Decision priority:                                                 │
│  1. Check if intent + entities map to a structured tool            │
│     (getEquipmentHistory, createInspection, listWorkOrders, etc.)  │
│  2. If structured tool exists → select it                          │
│  3. If analytical/aggregate and `getDashboardKPIs` insufficient    │
│     → consider `executeDatabaseQuery` as last resort               │
│  4. If multi-step → plan sequence of tools                         │
│                                                                     │
│  Role check: does the current user's role permit this tool?        │
│  ├── Permitted → proceed                                           │
│  └── Denied → "That action requires supervisor access."            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. TOOL EXECUTION                                                  │
│                                                                     │
│  ├── Call tool with resolved parameters                            │
│  ├── For multi-step: execute sequentially; pass outputs forward    │
│  ├── Catch tool errors:                                            │
│  │   ├── NOT_FOUND → "Equipment AC-202 was not found in the       │
│  │   │               system. Please verify the code."             │
│  │   ├── PERMISSION_DENIED → "You don't have permission…"         │
│  │   ├── DB_ERROR → "A database error occurred. Please try again."│
│  │   └── DUPLICATE → "This record may already exist (offline      │
│  │                    replay detected)."                           │
│  └── On success → proceed to step 7                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. RESULT VALIDATION                                               │
│                                                                     │
│  ├── Verify `success: true` in envelope                            │
│  ├── Verify expected fields are present in `data`                  │
│  ├── For CREATE operations: verify ID returned                     │
│  ├── For QUERY operations: check `total_count` makes sense         │
│  └── Flag anomalies (e.g. 0 results for known equipment)          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  8. RESPONSE GENERATION                                             │
│                                                                     │
│  ├── Use `summary` field from tool response as base                │
│  ├── Expand with key details if query was analytical               │
│  ├── For TTS: keep under 3 sentences; avoid lists of raw data      │
│  ├── For UI text: may be longer; include structured data           │
│  ├── Confirm actions: "Work order WO-0089 has been created."       │
│  └── Offer next step if natural: "Would you like me to create      │
│       a work order for this inspection?"                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Future-Proof Architecture

### 8.1 Multi-Facility Scaling

When the system expands to multiple facilities:

- Add a `facility_id` field to the entity resolution layer and all tools
- Scope all queries by `facility_id` derived from the user's JWT claims
- The `searchEquipment` tool should default to the current user's assigned facility
- `getDashboardKPIs` should support a `facilityId` filter for regional supervisors

### 8.2 Additional Equipment Types

The current schema is equipment-type-agnostic (equipment types are inferred from naming conventions like `HVAC-*`, `PUMP-*`). To scale to additional types:

- Add an `equipment_type` enum column to the `equipment` table
- Update `searchEquipment` to filter by type
- Maintain a business-language alias map in the system prompt: "pump" → `equipment_type = 'PUMP'`

### 8.3 Larger Datasets

- Add pagination (`cursor` or `offset`) to all list tools
- Index `equipment.location`, `work_orders.status`, `inspection_reports.severity`, and `alerts.status` for fast filtered queries
- Introduce a read replica for all SELECT tools; write tools continue against primary
- Add result caching (Redis or Vercel KV) for `getDashboardKPIs` with a 60-second TTL

### 8.4 More Complex Analytics

- Introduce a dedicated analytics service (or Supabase view layer) that pre-aggregates common metrics nightly
- Add a `getAnalytics(metric, filters)` tool that queries these pre-aggregated views rather than running expensive JOINs at query time
- For trend analysis, integrate a time-series store or materialised views with monthly snapshots

### 8.5 Voice-Based Interactions

- All tool `summary` fields must remain TTS-safe: no special characters, no markdown, no lists
- Introduce a `verbosity` parameter in the agent configuration: `brief` (1 sentence for TTS) vs `detailed` (full JSON for dashboard)
- The STT pipeline should include a custom vocabulary list of equipment codes and technical terms to improve transcription accuracy

### 8.6 Mobile Users

- All list tools must support cursor-based pagination (offset pagination is inefficient on mobile with poor connectivity)
- Tools should return a `compact` mode with fewer fields for mobile rendering
- The `idempotency_key` mechanism in write tools is critical for mobile offline scenarios

### 8.7 Future AI Capabilities

- **RAG integration**: When `equipment_documents` is added (per TRD §24), add a `searchKnowledgeBase(query)` tool that performs vector similarity search on maintenance manuals and SOPs
- **Predictive maintenance**: Add a `getPredictedFailureRisk(equipmentIdentifier)` tool backed by an ML model trained on `repair_history`
- **Computer vision**: Add an `analyseEquipmentImage(base64Image, equipmentIdentifier)` tool that uses a vision model to detect damage
- **Agent memory**: Persist within-session entity resolutions to a short-term context store so the agent can reference "it" or "that pump" across multiple turns without re-resolving

---

## Summary of Recommendations

| Priority | Action |
|---|---|
| P0 — Critical | Fix `executeDatabaseQuery` security: replace regex with proper SQL parser; enforce RLS |
| P0 — Critical | Add idempotency keys to all write tools to prevent offline replay duplicates |
| P0 — Critical | Route `createAlert` through the service layer instead of a raw Supabase insert |
| P1 — High | Add missing tools: `searchEquipment`, `findTechnician`, `listWorkOrders`, `listInspections`, `listAlerts`, `getWorkOrder`, `getEquipmentStatus` |
| P1 — High | Standardise all tool responses to the `{ success, data, summary, error }` envelope |
| P1 — High | Add date range and filter parameters to `getEquipmentHistory` |
| P2 — Medium | Add `getDashboardKPIs` and `acknowledgeAlert` for supervisor agent workflows |
| P2 — Medium | Implement NLU entity extraction in the system prompt with business language glossary |
| P2 — Medium | Add SQL result summarisation before returning to agent |
| P3 — Low | Add `getActivityLog` and `getAnalytics` for advanced reporting |
| P3 — Low | Implement multi-facility scoping in entity resolution layer |
