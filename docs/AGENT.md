# VoxField Agent Architecture

## Overview

The VoxField AI Agent is a GPT-4o powered orchestration layer that enables technicians and supervisors to interact with operational systems using natural language voice commands.

Instead of directly querying the database, users communicate with the AI agent, which determines intent, selects the appropriate tool, executes actions, and returns a spoken response.

The agent is designed to be:

* Voice-first
* Tool-driven
* Role-aware
* Context-aware
* Offline-compatible

---

## High-Level Flow

```text
User Speech
     │
     ▼
Speech-to-Text (AssemblyAI)
     │
     ▼
Voice Transcript
     │
     ▼
GPT-4o Agent
     │
     ▼
Tool Selection
     │
     ▼
Tool Execution
     │
     ▼
Database Operations
     │
     ▼
Agent Response
     │
     ▼
Text-to-Speech (OpenAI)
     │
     ▼
Spoken Response
```

---

## Core Components

### agent.ts

Location:

```text
src/lib/agent.ts
```

Responsibilities:

* Creates OpenAI client
* Loads conversation history
* Builds prompt context
* Registers tools
* Executes tool calls
* Handles multi-step reasoning
* Persists transcripts

This file acts as the central orchestration engine for every voice interaction.

---

### agent-prompt.ts

Location:

```text
src/lib/agent-prompt.ts
```

Responsibilities:

* Defines system instructions
* Injects user context
* Applies role restrictions
* Defines tool selection strategy
* Controls response formatting

The prompt acts as the operational policy layer for the AI system.

---

### agent-tools.ts

Location:

```text
src/lib/agent-tools.ts
```

Responsibilities:

* Exposes business operations as callable tools
* Queries operational data
* Creates inspections
* Creates work orders
* Resolves alerts
* Retrieves KPIs

The model never directly accesses the database. All actions are performed through tools.

---

## Query Processing Flow

Every user interaction follows the same lifecycle.

### Step 1: User Request

Example:

```text
Create a high-priority work order for the rooftop HVAC unit.
```

The request arrives from:

```text
/api/voice-query
```

---

### Step 2: Load Context

The agent loads:

* Current user
* User role
* Current session
* Previous transcript history

Up to 20 previous conversation turns are loaded to support follow-up questions and context resolution.

Example:

```text
User:
Show me HVAC history.

User:
What about the one in Building B?
```

The second request can be resolved using prior context.

---

### Step 3: Build Prompt

The system prompt contains:

* User name
* User role
* Permissions
* Tool usage rules
* Response rules

Example:

```text
Supervisor:
Can access KPIs and resolve alerts

Technician:
Can create inspections and work orders
```

The final prompt includes:

1. System prompt
2. Historical messages
3. Current user message

---

### Step 4: Tool Selection

GPT-4o determines whether a tool is required.

Examples:

```text
Equipment lookup
↓
searchEquipment

Create work order
↓
createWorkOrder

View inspections
↓
listInspections
```

The agent follows a strict priority order:

1. Structured tools
2. Search tools
3. Database query tools

Direct SQL access is considered a last resort.

---

### Step 5: Tool Execution

If GPT requests a tool:

```text
GPT
 ↓
Tool Call
 ↓
agent-tools.ts
 ↓
Supabase
 ↓
Result
```

Tool responses are returned back into the model conversation.

The model can then decide:

* Finish response
* Execute another tool
* Continue reasoning

---

### Step 6: Multi-Step Reasoning

The agent supports chained operations.

Example:

```text
Create an inspection and generate a work order.
```

Execution:

```text
Create Inspection
      │
      ▼
Inspection Result
      │
      ▼
Create Work Order
      │
      ▼
Generate Summary
```

The agent may execute multiple tools before producing a final response.

---

### Step 7: Response Generation

The final response is generated after all required tools complete.

Example:

```text
Inspection created successfully. A high-priority work order has also been assigned.
```

The response is intentionally concise because it will be spoken to the user.

---

### Step 8: Transcript Storage

Every interaction is stored.

Captured fields include:

* User prompt
* Agent response
* Session ID
* Tools used
* Offline metadata

Stored in:

```text
transcripts
```

This enables:

* Audit history
* Session continuity
* Analytics
* Follow-up conversations

---

## Role-Based Behavior

### Technician

Allowed actions:

* Create inspections
* Create work orders
* Update assigned work orders
* Query equipment
* View records

Restricted actions:

* KPI access
* Alert resolution
* Supervisor-only operations

---

### Supervisor

Allowed actions:

* View all records
* Access KPIs
* Acknowledge alerts
* Resolve alerts
* Monitor operations

Supervisors have broader access to operational data.

---

## Conversation Context Management

The agent maintains rolling session memory.

For every session:

```text
Latest 20 Turns
       │
       ▼
Conversation Context
       │
       ▼
Current Query
```

Benefits:

* Pronoun resolution
* Follow-up support
* Reduced repetition
* Better user experience

---

## Ambiguity Handling

The agent attempts to resolve ambiguity before asking questions.

Examples:

```text
"John"
```

↓

```text
Find technician records
```

If multiple matches exist:

```text
Which John did you mean?
```

Only one clarification question is asked at a time.

---

## Response Rules

The AI agent follows strict response guidelines.

### Brevity

Responses should remain under 50 words whenever possible.

### Voice Friendly

Responses contain:

* No markdown
* No code blocks
* No bullet lists

### Action Confirmation

Every successful operation confirms what happened.

Example:

```text
Work order WO-0091 has been created.
```

### Error Handling

Technical errors are simplified into human-readable explanations.

---

## Design Principles

The VoxField agent is built around the following principles:

1. Voice-first interaction
2. Structured tool usage
3. Role-based security
4. Minimal clarification requests
5. Multi-step task execution
6. Context-aware conversations
7. Operational reliability
8. Human-friendly responses