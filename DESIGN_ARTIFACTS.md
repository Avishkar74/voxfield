# Design Artifacts & Visual Specifications

## Voice-First AI Assistant for Field Service Operations

---

## Table of Contents

1. [Use Case Diagram](#1-use-case-diagram)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [System Component Diagram](#3-system-component-diagram)
4. [Deployment Architecture](#4-deployment-architecture)
5. [Entity Relationship Diagram (ERD)](#5-entity-relationship-diagram-erd)
6. [Sequence Diagram - Voice Query](#6-sequence-diagram---voice-query)
7. [Sequence Diagram - Create Inspection](#7-sequence-diagram---create-inspection)
8. [Sequence Diagram - Offline Sync](#8-sequence-diagram---offline-sync)
9. [Agent Architecture Diagram](#9-agent-architecture-diagram)
10. [Offline State Machine](#10-offline-state-machine)
11. [Authentication Flow](#11-authentication-flow)
12. [Technician Dashboard Wireframe](#12-technician-dashboard-wireframe)
13. [Supervisor Dashboard Wireframe](#13-supervisor-dashboard-wireframe)

---

## 1. Use Case Diagram

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000', 'fontFamily': 'arial'}}}%%
graph TB
    subgraph System ["Voice-First AI Assistant System"]
        Query["Query Equipment<br/>History"]
        CreateInspection["Create Inspection<br/>Report"]
        CreateWO["Create Work<br/>Order"]
        UpdateWO["Update Work<br/>Order Status"]
        ViewDash["View<br/>Dashboard"]
        ViewAllAct["View All<br/>Activities"]
        OfflineRec["Offline<br/>Recording"]
        OfflineSync["Offline<br/>Sync Queue"]
        ViewAlerts["View &<br/>Acknowledge<br/>Alerts"]
    end
    
    Tech["👤 Technician"]
    Super["👤 Supervisor"]
    
    Tech -->|uses| Query
    Tech -->|uses| CreateInspection
    Tech -->|uses| CreateWO
    Tech -->|uses| UpdateWO
    Tech -->|uses| ViewDash
    Tech -->|uses| OfflineRec
    Tech -->|uses| OfflineSync
    
    Super -->|uses| ViewAllAct
    Super -->|uses| ViewAlerts
    Super -->|uses| ViewDash
    
    style System fill:#e1f5ff,stroke:#000000,stroke-width:2px,color:#000000
    style Tech fill:#fff3e0,stroke:#000000,stroke-width:2px,color:#000000
    style Super fill:#f3e5f5,stroke:#000000,stroke-width:2px,color:#000000
    style Query fill:#ffffff,stroke:#000000,color:#000000
    style CreateInspection fill:#ffffff,stroke:#000000,color:#000000
    style CreateWO fill:#ffffff,stroke:#000000,color:#000000
    style UpdateWO fill:#ffffff,stroke:#000000,color:#000000
    style ViewDash fill:#ffffff,stroke:#000000,color:#000000
    style ViewAllAct fill:#ffffff,stroke:#000000,color:#000000
    style OfflineRec fill:#ffffff,stroke:#000000,color:#000000
    style OfflineSync fill:#ffffff,stroke:#000000,color:#000000
    style ViewAlerts fill:#ffffff,stroke:#000000,color:#000000
```

**Key Use Cases:**
- **Query Equipment History**: Retrieve repair and maintenance records
- **Create Inspection Report**: Document field findings with severity levels
- **Create Work Order**: Generate maintenance tasks
- **Update Work Order**: Change status (OPEN → IN_PROGRESS → CLOSED)
- **View Dashboards**: Personal (Tech) or Company-wide (Supervisor)
- **Offline Recording**: Queue interactions when offline
- **View All Activities**: Supervisor monitoring and analytics

---

## 2. High-Level Architecture Diagram

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
graph TD
    A["📱 User Device<br/>(Phone/Tablet)"]
    
    subgraph Client["CLIENT LAYER"]
        B["Next.js PWA<br/>(React Frontend)<br/>- Voice Input<br/>- Dashboards<br/>- Service Worker<br/>- IndexedDB Cache"]
    end
    
    A -->|Voice Input| B
    B -->|HTTPS JSON| C
    
    subgraph Agent["AGENT LAYER"]
        C["OpenAI Agent SDK<br/>(GPT-4o)<br/>- Intent Analysis<br/>- Tool Selection<br/>- Context Management<br/>- Response Generation"]
    end
    
    C -->|Tool Calls| D
    
    subgraph Tools["TOOL LAYER"]
        D["Tool Executor<br/>- getEquipmentHistory<br/>- createInspection<br/>- createWorkOrder<br/>- updateWorkOrder<br/>- createAlert<br/>- logActivity"]
    end
    
    D -->|SQL Queries| E
    
    subgraph Database["DATABASE LAYER"]
        E["Supabase PostgreSQL<br/>- users<br/>- equipment<br/>- repair_history<br/>- inspection_reports<br/>- work_orders<br/>- transcripts<br/>- activity_logs<br/>- alerts<br/>- equipment_documents"]
    end
    
    E -->|Data| F["Response<br/>to Agent"]
    F -->|Response Text| G
    
    subgraph External["EXTERNAL SERVICES"]
        H["AssemblyAI<br/>Speech-to-Text"]
        I["OpenAI TTS<br/>Text-to-Speech"]
        J["OpenAI LLM<br/>GPT-4o Agent"]
        K["IndexedDB<br/>Offline Storage"]
    end
    
    B -->|Audio| H
    H -->|Transcript| B
    G -->|Text| I
    I -->|Audio| B
    C -.->|LLM Calls| J
    B -->|Offline Queue| K
    
    subgraph Response["RESPONSE GENERATION"]
        G["Generate<br/>Natural Language<br/>Response"]
    end
    
    style Client fill:#bbdefb,stroke:#000000,stroke-width:2px,color:#000000
    style Agent fill:#c8e6c9,stroke:#000000,stroke-width:2px,color:#000000
    style Tools fill:#fff9c4,stroke:#000000,stroke-width:2px,color:#000000
    style Database fill:#ffccbc,stroke:#000000,stroke-width:2px,color:#000000
    style External fill:#f8bbd0,stroke:#000000,stroke-width:2px,color:#000000
    style Response fill:#d1c4e9,stroke:#000000,stroke-width:2px,color:#000000
    style A fill:#ffffff,stroke:#000000,color:#000000
    style B fill:#ffffff,stroke:#000000,color:#000000
    style C fill:#ffffff,stroke:#000000,color:#000000
    style D fill:#ffffff,stroke:#000000,color:#000000
    style E fill:#ffffff,stroke:#000000,color:#000000
    style F fill:#ffffff,stroke:#000000,color:#000000
    style G fill:#ffffff,stroke:#000000,color:#000000
    style H fill:#ffffff,stroke:#000000,color:#000000
    style I fill:#ffffff,stroke:#000000,color:#000000
    style J fill:#ffffff,stroke:#000000,color:#000000
    style K fill:#ffffff,stroke:#000000,color:#000000
```

---

## 3. System Component Diagram

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
graph LR
    subgraph Frontend["🎨 FRONTEND"]
        FE1["Voice Capture<br/>Component"]
        FE2["Dashboard<br/>Components"]
        FE3["Offline Queue<br/>Manager"]
        FE4["Service Worker<br/>Integration"]
    end
    
    subgraph Agent["🧠 AGENT"]
        AG1["Intent<br/>Interpreter"]
        AG2["Tool<br/>Selector"]
        AG3["Response<br/>Generator"]
        AG4["Permission<br/>Validator"]
    end
    
    subgraph Tools["🔧 TOOLS"]
        T1["getEquipmentHistory"]
        T2["createInspection"]
        T3["createWorkOrder"]
        T4["updateWorkOrder"]
        T5["createAlert"]
        T6["logActivity"]
    end
    
    subgraph Data["💾 DATA"]
        D1["Supabase<br/>PostgreSQL"]
        D2["IndexedDB<br/>Cache"]
    end
    
    subgraph Speech["🎤 SPEECH"]
        S1["AssemblyAI<br/>STT"]
        S2["OpenAI<br/>TTS"]
    end
    
    FE1 ---|Audio| S1
    S1 ---|Transcript| AG1
    AG1 ---|Intent| AG2
    AG2 ---|Selected Tools| T1 & T2 & T3 & T4 & T5 & T6
    T1 & T2 & T3 & T4 & T5 & T6 ---|Queries| D1
    D1 ---|Data| AG3
    AG3 ---|Response Text| S2
    S2 ---|Audio| FE2
    FE3 ---|Queue| D2
    FE4 ---|Sync| FE3
    
    style Frontend fill:#e3f2fd,stroke:#000000,stroke-width:2px,color:#000000
    style Agent fill:#f3e5f5,stroke:#000000,stroke-width:2px,color:#000000
    style Tools fill:#fce4ec,stroke:#000000,stroke-width:2px,color:#000000
    style Data fill:#f1f8e9,stroke:#000000,stroke-width:2px,color:#000000
    style Speech fill:#fff3e0,stroke:#000000,stroke-width:2px,color:#000000
    style FE1 fill:#ffffff,stroke:#000000,color:#000000
    style FE2 fill:#ffffff,stroke:#000000,color:#000000
    style FE3 fill:#ffffff,stroke:#000000,color:#000000
    style FE4 fill:#ffffff,stroke:#000000,color:#000000
    style AG1 fill:#ffffff,stroke:#000000,color:#000000
    style AG2 fill:#ffffff,stroke:#000000,color:#000000
    style AG3 fill:#ffffff,stroke:#000000,color:#000000
    style AG4 fill:#ffffff,stroke:#000000,color:#000000
    style T1 fill:#ffffff,stroke:#000000,color:#000000
    style T2 fill:#ffffff,stroke:#000000,color:#000000
    style T3 fill:#ffffff,stroke:#000000,color:#000000
    style T4 fill:#ffffff,stroke:#000000,color:#000000
    style T5 fill:#ffffff,stroke:#000000,color:#000000
    style T6 fill:#ffffff,stroke:#000000,color:#000000
    style D1 fill:#ffffff,stroke:#000000,color:#000000
    style D2 fill:#ffffff,stroke:#000000,color:#000000
    style S1 fill:#ffffff,stroke:#000000,color:#000000
    style S2 fill:#ffffff,stroke:#000000,color:#000000
```

---

## 4. Deployment Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
graph TB
    Users["👥 Users<br/>(Field Technicians<br/>& Supervisors)"]
    
    subgraph CDN["🌍 VERCEL EDGE NETWORK<br/>(CDN & Caching)"]
        Edge["Global Edge<br/>Locations"]
    end
    
    subgraph Backend["⚙️ VERCEL BACKEND"]
        FrontendDeploy["Next.js Frontend<br/>- Static Assets<br/>- API Routes<br/>- Server Functions"]
    end
    
    subgraph Services["🔌 EXTERNAL SERVICES"]
        OpenAI["OpenAI API<br/>- LLM Agent<br/>- TTS"]
        AssemblyAI["AssemblyAI<br/>- Speech-to-Text"]
        Supabase["Supabase<br/>- PostgreSQL DB<br/>- Authentication<br/>- Real-time"]
    end
    
    subgraph Offline["📱 OFFLINE SUPPORT"]
        SW["Service Worker<br/>- Asset Caching<br/>- Request Routing"]
        IDB["IndexedDB<br/>- Queue Storage<br/>- Data Cache"]
    end
    
    Users -->|HTTPS| Edge
    Edge -->|Route| FrontendDeploy
    FrontendDeploy ---|API Calls| OpenAI
    FrontendDeploy ---|API Calls| AssemblyAI
    FrontendDeploy ---|Database| Supabase
    FrontendDeploy ---|Offline| SW
    SW ---|Local Storage| IDB
    
    style CDN fill:#c8e6c9,stroke:#000000,stroke-width:2px,color:#000000
    style Backend fill:#bbdefb,stroke:#000000,stroke-width:2px,color:#000000
    style Services fill:#ffccbc,stroke:#000000,stroke-width:2px,color:#000000
    style Offline fill:#fff9c4,stroke:#000000,stroke-width:2px,color:#000000
    style Users fill:#f8bbd0,stroke:#000000,stroke-width:2px,color:#000000
    style Edge fill:#ffffff,stroke:#000000,color:#000000
    style FrontendDeploy fill:#ffffff,stroke:#000000,color:#000000
    style OpenAI fill:#ffffff,stroke:#000000,color:#000000
    style AssemblyAI fill:#ffffff,stroke:#000000,color:#000000
    style Supabase fill:#ffffff,stroke:#000000,color:#000000
    style SW fill:#ffffff,stroke:#000000,color:#000000
    style IDB fill:#ffffff,stroke:#000000,color:#000000
```

---

## 5. Entity Relationship Diagram (ERD)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
erDiagram
    USERS ||--o{ INSPECTION_REPORTS : creates
    USERS ||--o{ WORK_ORDERS : "creates/assigned_to"
    USERS ||--o{ TRANSCRIPTS : generates
    USERS ||--o{ ACTIVITY_LOGS : performs
    
    EQUIPMENT ||--o{ REPAIR_HISTORY : has
    EQUIPMENT ||--o{ INSPECTION_REPORTS : "subject_of"
    EQUIPMENT ||--o{ WORK_ORDERS : "requires"
    EQUIPMENT ||--o{ ALERTS : triggers
    EQUIPMENT ||--o{ EQUIPMENT_DOCUMENTS : "documented_by"
    
    INSPECTION_REPORTS ||--o{ ALERTS : generates
    
    USERS {
        string id PK
        string employee_code UK
        string full_name
        string email UK
        enum role "TECHNICIAN|SUPERVISOR"
        timestamp created_at
        timestamp updated_at
    }
    
    EQUIPMENT {
        string id PK
        string equipment_code UK
        string name
        string location
        string manufacturer
        date installation_date
        enum status "ACTIVE|UNDER_MAINTENANCE|RETIRED"
        timestamp created_at
        timestamp updated_at
    }
    
    REPAIR_HISTORY {
        string id PK
        string equipment_id FK
        date repair_date
        string failure_type
        text description
        string performed_by FK
        decimal repair_duration_hours
        decimal cost
        timestamp created_at
    }
    
    INSPECTION_REPORTS {
        string id PK
        string equipment_id FK
        string technician_id FK
        string title
        text description
        text recommendation
        enum severity "LOW|MEDIUM|HIGH|CRITICAL"
        enum status "OPEN|REVIEWED|CLOSED"
        timestamp created_at
    }
    
    WORK_ORDERS {
        string id PK
        string work_order_number UK
        string equipment_id FK
        string created_by FK
        string assigned_to FK
        string title
        text description
        enum priority "LOW|MEDIUM|HIGH|CRITICAL"
        enum status "OPEN|IN_PROGRESS|CLOSED"
        timestamp created_at
        timestamp completed_at
    }
    
    TRANSCRIPTS {
        string id PK
        string user_id FK
        text user_prompt
        text agent_response
        string session_id
        timestamp created_at
    }
    
    ACTIVITY_LOGS {
        string id PK
        string user_id FK
        string action_type
        string entity_type
        string entity_id
        text description
        timestamp created_at
    }
    
    ALERTS {
        string id PK
        string equipment_id FK
        string inspection_report_id FK
        enum severity "HIGH|CRITICAL"
        text message
        enum status "OPEN|ACKNOWLEDGED|RESOLVED"
        timestamp created_at
    }
    
    EQUIPMENT_DOCUMENTS {
        string id PK
        string equipment_id FK
        string document_name
        string document_type
        text document_text
        timestamp created_at
    }
```

---

## 6. Sequence Diagram - Voice Query

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
sequenceDiagram
    participant User as 👤 Technician
    participant Frontend as 📱 Frontend
    participant STT as 🎤 AssemblyAI<br/>STT
    participant Agent as 🧠 OpenAI<br/>Agent
    participant Tool as 🔧 Tool<br/>Executor
    participant DB as 💾 Database<br/>Supabase
    participant TTS as 🔊 OpenAI<br/>TTS
    
    User->>Frontend: Speaks: "What was the<br/>last repair on MTR-102?"
    Frontend->>Frontend: Capture audio via<br/>Web Audio API
    Frontend->>STT: Send audio stream
    Note over STT: Process audio<br/>(3-5 seconds)
    STT-->>Frontend: Return transcript
    Frontend->>Frontend: Display transcript
    
    Frontend->>Agent: Send transcript<br/>+ JWT + User Context
    Note over Agent: Analyze intent<br/>(2-3 seconds)
    Agent->>Agent: Determine: need<br/>getEquipmentHistory tool
    
    Agent->>Tool: Call getEquipmentHistory<br/>(equipment_id=MTR-102)
    Tool->>Tool: Validate permissions<br/>Check JWT role
    Tool->>DB: SELECT * FROM<br/>repair_history WHERE<br/>equipment_id=MTR-102
    Note over DB: Query<br/>(<200ms)
    DB-->>Tool: Return repair records
    Tool-->>Agent: [repair_1, repair_2, ...]
    
    Agent->>Agent: Generate response:<br/>"The last repair was<br/>bearing replacement<br/>on April 15"
    Agent-->>Frontend: Return response text
    
    Frontend->>TTS: Send response text
    Note over TTS: Convert to audio<br/>(1-2 seconds)
    TTS-->>Frontend: Return audio stream
    
    Frontend->>Frontend: Play audio
    Frontend-->>User: Hears response audio
    
    Frontend->>DB: Log activity:<br/>INSERT activity_log
    Frontend->>DB: Store transcript
    
    Note over User: Total time: 6-12<br/>seconds end-to-end
```

---

## 7. Sequence Diagram - Create Inspection

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
sequenceDiagram
    participant User as 👤 Technician
    participant Frontend as 📱 Frontend
    participant STT as 🎤 STT
    participant Agent as 🧠 Agent
    participant Tool as 🔧 Tool
    participant DB as 💾 Database
    participant TTS as 🔊 TTS
    
    User->>Frontend: Speaks: "Create inspection<br/>for MTR-102. Critical<br/>cooling fan damage"
    
    Frontend->>STT: Send audio
    STT-->>Frontend: Transcript returned
    
    Frontend->>Agent: Send transcript<br/>+ User context
    Agent->>Agent: Extract parameters:<br/>- equipment: MTR-102<br/>- severity: CRITICAL<br/>- description: cooling fan
    
    Agent->>Tool: Call createInspection
    Tool->>Tool: Validate user is<br/>TECHNICIAN (✓)
    
    Tool->>DB: INSERT INTO<br/>inspection_reports
    DB-->>Tool: Record created
    
    Tool->>Tool: Check severity
    alt Severity is CRITICAL
        Tool->>DB: INSERT INTO alerts
        DB-->>Tool: Alert created
    end
    
    Tool->>DB: INSERT INTO<br/>activity_logs
    Tool-->>Agent: Success: inspection_id,<br/>alert_generated=true
    
    Agent->>Agent: Generate response:<br/>"Critical inspection<br/>created for MTR-102.<br/>Alert generated"
    
    Agent-->>Frontend: Response text
    Frontend->>TTS: Send response
    TTS-->>Frontend: Audio
    Frontend->>User: Play audio response
    
    Note over User: Inspection stored<br/>Alert generated<br/>Activity logged
```

---

## 8. Sequence Diagram - Offline Sync

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
sequenceDiagram
    participant User as 👤 Technician
    participant Frontend as 📱 Frontend<br/>PWA
    participant IDB as 💾 IndexedDB<br/>Local
    participant Network as 🌐 Network
    participant API as ⚙️ API<br/>Backend
    participant Agent as 🧠 Agent
    participant DB as 💾 Database
    
    Note over Frontend,IDB: OFFLINE MODE
    User->>Frontend: Speaks query
    Frontend->>Frontend: Detect offline
    Frontend->>IDB: Queue interaction<br/>status=PENDING
    Frontend->>User: Show "Pending sync"
    
    Note over User,IDB: User regains<br/>connectivity
    Frontend->>Network: Detect online
    Frontend->>Frontend: Trigger sync
    
    Note over Frontend,IDB: SYNCHRONIZATION
    Frontend->>IDB: Retrieve queued<br/>items (FIFO)
    IDB-->>Frontend: [item1, item2, ...]
    
    loop For each queued item
        Frontend->>API: POST /api/sync<br/>{ queue_item }
        API->>Agent: Process interaction
        Agent->>Agent: Analyze intent
        Agent->>DB: Execute tools
        DB-->>Agent: Return results
        Agent-->>API: Generate response
        API-->>Frontend: Response
        Frontend->>IDB: Update status<br/>= SYNCED
        Frontend->>Frontend: Show progress
    end
    
    Note over Frontend,IDB: SYNC COMPLETE
    Frontend->>IDB: Clear queue
    Frontend->>User: "All synced!<br/>0 pending items"
    
    Note over User: All offline<br/>interactions now<br/>on server
```

---

## 9. Agent Architecture Diagram

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
graph TD
    Input["User Input<br/>(Transcript)"]
    
    subgraph Analysis["1️⃣ INPUT ANALYSIS"]
        A1["Extract Context:<br/>- User ID<br/>- Role<br/>- Permissions"]
        A2["Analyze Intent:<br/>- Query type<br/>- Parameters<br/>- Context"]
    end
    
    subgraph Selection["2️⃣ TOOL SELECTION"]
        S1["Match Intent to<br/>Available Tools"]
        S2["Validate User<br/>Permissions"]
        S3["Select Tool(s)<br/>in Order"]
    end
    
    subgraph Execution["3️⃣ EXECUTION"]
        E1["Execute Tool 1"]
        E2["Execute Tool 2"]
        E3["Aggregate Results<br/>Handle Errors"]
    end
    
    subgraph Generation["4️⃣ RESPONSE GENERATION"]
        G1["Synthesize Results"]
        G2["Create Natural<br/>Language Response"]
        G3["Validate Output"]
    end
    
    Output["Final Response<br/>(Text)"]
    
    Input --> A1 & A2
    A1 & A2 --> S1 & S2
    S1 & S2 --> S3
    S3 --> E1
    E1 -.->|if_needed| E2
    E2 --> E3
    E1 & E3 --> G1
    G1 --> G2
    G2 --> G3
    G3 --> Output
    
    style Analysis fill:#c8e6c9,stroke:#000000,stroke-width:2px,color:#000000
    style Selection fill:#bbdefb,stroke:#000000,stroke-width:2px,color:#000000
    style Execution fill:#fff9c4,stroke:#000000,stroke-width:2px,color:#000000
    style Generation fill:#f8bbd0,stroke:#000000,stroke-width:2px,color:#000000
    style Input fill:#e0f2f1,stroke:#000000,stroke-width:2px,color:#000000
    style Output fill:#ede7f6,stroke:#000000,stroke-width:2px,color:#000000
    style A1 fill:#ffffff,stroke:#000000,color:#000000
    style A2 fill:#ffffff,stroke:#000000,color:#000000
    style S1 fill:#ffffff,stroke:#000000,color:#000000
    style S2 fill:#ffffff,stroke:#000000,color:#000000
    style S3 fill:#ffffff,stroke:#000000,color:#000000
    style E1 fill:#ffffff,stroke:#000000,color:#000000
    style E2 fill:#ffffff,stroke:#000000,color:#000000
    style E3 fill:#ffffff,stroke:#000000,color:#000000
    style G1 fill:#ffffff,stroke:#000000,color:#000000
    style G2 fill:#ffffff,stroke:#000000,color:#000000
    style G3 fill:#ffffff,stroke:#000000,color:#000000
```

---

## 10. Offline State Machine

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
stateDiagram-v2
    [*] --> ONLINE
    
    ONLINE --> OFFLINE: Network lost
    ONLINE --> ONLINE: Normal operation
    
    OFFLINE --> OFFLINE: Recording & Queuing
    OFFLINE --> PENDING_SYNC: Queue items created
    
    PENDING_SYNC --> PENDING_SYNC: Wait for network
    PENDING_SYNC --> SYNCING: Network restored
    
    SYNCING --> SYNCING: Processing queue
    SYNCING --> ONLINE: Sync complete
    SYNCING --> PENDING_SYNC: Sync failed<br/>Retry later
    
    note right of ONLINE
        ✓ Real-time sync
        ✓ All features available
        ✓ Direct API calls
    end note
    
    note right of OFFLINE
        ✓ Local recording
        ✓ Queue storage
        ✓ Dashboard works
        ✗ No server sync
    end note
    
    note right of PENDING_SYNC
        ⏳ Waiting
        📦 Items queued
        🔄 Retry ready
    end note
    
    note right of SYNCING
        🔄 Active sync
        ✓ FIFO processing
        🔁 Retries enabled
    end note
```

---

## 11. Authentication Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor':'#ffffff', 'primaryTextColor':'#000000', 'primaryBorderColor':'#000000', 'lineColor':'#000000', 'textColor':'#000000'}}}%%
sequenceDiagram
    participant User as 👤 User
    participant Browser as 🌐 Browser
    participant Frontend as 📱 Frontend
    participant Supabase as 🔐 Supabase<br/>Auth
    participant API as ⚙️ API
    
    User->>Browser: Click Login
    Browser->>Frontend: Navigate to /login
    Frontend->>Browser: Show login form
    
    User->>Browser: Enter email & password
    Browser->>Frontend: Submit credentials
    Frontend->>Supabase: POST /auth/signin<br/>{ email, password }
    
    Note over Supabase: Validate credentials
    Supabase-->>Frontend: JWT token<br/>+ Refresh token
    
    Frontend->>Frontend: Store JWT in<br/>secure storage
    Frontend->>Browser: Redirect to /dashboard
    
    Note over User,Frontend: Dashboard accessed
    
    User->>Frontend: Use voice query
    Frontend->>Frontend: Retrieve JWT
    Frontend->>API: POST /api/voice-query<br/>Authorization: Bearer JWT
    
    API->>Supabase: Verify JWT
    alt JWT valid
        Supabase-->>API: ✓ Valid<br/>user_id, role
        API->>API: Process request
        API-->>Frontend: Response
    else JWT invalid/expired
        Supabase-->>API: ✗ Invalid
        API-->>Frontend: 401 Unauthorized
        Frontend->>Frontend: Refresh JWT or<br/>redirect to login
    end
    
    Note over Frontend: JWT auto-refreshes<br/>before expiry
```

---

## 12. Technician Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│              TECHNICIAN DASHBOARD (Mobile)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Profile] [⚙️ Settings] [●Online | 0 pending sync]        │
│  John Carter (TECH001)                                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║                                                       ║ │
│  ║            🎤 TAP TO SPEAK                           ║ │
│  ║                                                       ║ │
│  ║   (Large microphone button - glove-friendly)        ║ │
│  ║   Recording indicator when active                    ║ │
│  ║                                                       ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
│                                                             │
│  TRANSCRIPT:                                                │
│  "Create an inspection for MTR-102, critical damage"       │
│                                                             │
│  AGENT RESPONSE (Playing):                                  │
│  "Critical inspection created for cooling pump..."         │
│  [⏸ Stop] [🔄 Replay]                                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ RECENT ACTIVITIES                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ▼ Equipment Query [10:45 AM]                                │
│   "What was the last repair on MTR-102?"                   │
│   → Bearing replacement - April 15, 2026                   │
│                                                             │
│ ▼ Inspection Created [10:30 AM]                             │
│   MTR-102: Cooling Pump - CRITICAL                         │
│   Cooling Fan Damage → Alert Generated                     │
│                                                             │
│ ▼ Work Order Created [10:15 AM]                             │
│   WO-1001: Replace cooling fan assembly - HIGH             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ MY WORK ORDERS (3 open)                      [View All ⟶]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [WO-1001] Replace cooling fan                              │
│ Equipment: MTR-102 | Priority: 🔴 HIGH | Status: OPEN    │
│ Assigned: Today, 10:30 AM | [Details] [Update Status]    │
│                                                             │
│ [WO-1002] Bearing maintenance                              │
│ Equipment: MTR-101 | Priority: 🟡 MEDIUM | Status: OPEN  │
│                                                             │
│ [WO-1003] Alignment check                                  │
│ Equipment: MTR-103 | Priority: 🟢 LOW | Status: OPEN     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ MY INSPECTIONS (2 open)                      [View All ⟶]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [⚠️ CRITICAL] Cooling Fan Wear                              │
│ Equipment: MTR-102 | Status: OPEN | Alert Generated ✓    │
│ Created: Today, 10:30 AM                                   │
│                                                             │
│ [⚠️ HIGH] Motor Temperature Elevated                         │
│ Equipment: MTR-104 | Status: OPEN                          │
│ Created: Today, 9:45 AM                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Large microphone button optimized for field use (gloved hands)
- Real-time transcript display
- Voice response audio playback
- Recent activities feed
- Quick access to own work orders
- Inspection reports with severity indicators
- Offline sync status always visible
- Mobile-first, responsive design

---

## 13. Supervisor Dashboard Wireframe

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SUPERVISOR DASHBOARD (Desktop)                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ [Profile] [🔔 Notifications: 3] [Reports ▼] [⚙️ Settings]          │
│ Sarah Smith (SUPER001) | Last Activity: 2 minutes ago              │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┬──────────────┬──────────────┬──────────────┐      │
│  │ 12 Open     │ 3 CRITICAL   │ 8 Tech       │ 2.5h Avg     │      │
│  │ Work Orders │ ALERTS [🔴]  │ Online       │ Response     │      │
│  │             │              │              │ Time         │      │
│  └─────────────┴──────────────┴──────────────┴──────────────┘      │
│                                                                      │
├──────────────────────┬─────────────────────────────────────────────┤
│ CRITICAL ALERTS (3)  │ ACTIVITY FEED                              │
├──────────────────────┼─────────────────────────────────────────────┤
│                      │                                             │
│ 🔴 [CRITICAL]        │ 10:45 John Carter                          │
│ Overheating          │ Equipment Query: MTR-102                   │
│ Equipment: MTR-102   │                                             │
│ Inspection: Cooling  │ 10:30 Sarah Smith                          │
│ Fan Damage           │ Created Inspection: CRITICAL               │
│ [Acknowledge]        │ MTR-102 - Cooling Fan                      │
│ [View Details]       │                                             │
│                      │ 10:15 Mike Johnson                         │
│ 🔴 [CRITICAL]        │ Created WO-1001                            │
│ Bearing Misalignment │ Equipment: MTR-102                         │
│ Equipment: MTR-104   │                                             │
│ [Acknowledge]        │ 10:00 John Carter                          │
│                      │ Updated WO-1003: IN_PROGRESS              │
│ 🟡 [HIGH]            │                                             │
│ Motor Temperature    │ 9:30 Sarah Smith                           │
│ Equipment: MTR-105   │ Created WO-1002                            │
│                      │ Equipment: MTR-101                         │
├──────────────────────┴─────────────────────────────────────────────┤
│ WORK ORDERS STATUS                                                 │
│ Filter: [All] [Open] [In Progress] [Closed] | Sort: [Priority]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ WO-1001 │Replace cooling fan          │HIGH    │OPEN │John     │  │
│ WO-1002 │Bearing replacement          │CRITICAL│PROG │Sarah    │  │
│ WO-1003 │Alignment check             │MEDIUM  │OPEN │Mike     │  │
│ WO-1004 │Preventive maintenance      │LOW     │DONE │John     │  │
│ WO-1005 │Compressor service          │CRITICAL│OPEN │Sarah    │  │
│ WO-1006 │Motor coil inspection       │MEDIUM  │PROG │Mike     │  │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ TECHNICIAN STATUS                                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ● John Carter (TECH001)                                             │
│   Online | Last: 5m ago | Inspections: 2 | WO: 3 (1O, 2P)        │
│                                                                      │
│ ● Sarah Smith (TECH002)                                             │
│   Online | Last: 2m ago | Inspections: 3 | WO: 2 (1O, 1P)        │
│                                                                      │
│ ● Mike Johnson (TECH003)                                            │
│   Online | Last: 12m ago | Inspections: 1 | WO: 2 (All O)        │
│                                                                      │
│ ○ Lisa Rodriguez (TECH004)                                          │
│   Offline | Last: 45m ago | Inspections: 1 | Pending Sync: 2    │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ RECENT TRANSCRIPTS                            │ INSPECTION REPORTS  │
│ [🔍 Search: ____________]                    │ [🔍 Search: ____] │
├──────────────────────────────────────────────┼──────────────────────┤
│                                              │                      │
│ "What was last repair MTR-102?"              │ [⚠️ CRITICAL] Cool. │
│ User: John | Time: 10:40 AM                  │ Equipment: MTR-102   │
│ Response: "Bearing replacement..."           │ Technician: Sarah    │
│                                              │ Created: Today       │
│ "Create WO for cooling fan"                  │ Recommendation:      │
│ User: Sarah | Time: 10:25 AM                 │ Replace assembly     │
│ Response: "WO-1001 created..."               │                      │
│                                              │ [⚠️ HIGH] Motor Temp │
│ "Show open work orders"                      │ Equipment: MTR-104    │
│ User: Mike | Time: 10:10 AM                  │ Technician: John     │
│ Response: "3 open WOs assigned..."           │ Created: Today       │
│                                              │ Recommendation:      │
│                                              │ Check cooling system │
│                                                                      │
└──────────────────────────────────────────────┴──────────────────────┘
```

**Key Features:**
- KPI cards at top (Open WOs, Alerts, Tech Status, Avg Response Time)
- Critical alerts prominently displayed
- Real-time activity feed
- Work orders with filtering/sorting
- Technician status monitoring (online/offline)
- Transcript QA for compliance
- Inspection tracking
- Responsive design for desktop/tablet

---

## Summary

This Design Artifacts document provides comprehensive visual specifications for the Voice-First AI Assistant system, including:

✅ **Use Case Diagram** - All major use cases and actor interactions  
✅ **Architecture Diagram** - Complete system layering  
✅ **Component Diagram** - How components interact  
✅ **Deployment Architecture** - Infrastructure and services  
✅ **Entity Relationship Diagram** - Complete database schema  
✅ **Sequence Diagrams** - Detailed interaction flows (3 scenarios)  
✅ **Agent Architecture** - AI processing pipeline  
✅ **Offline State Machine** - Offline/online transitions  
✅ **Authentication Flow** - Security and token management  
✅ **Technician Dashboard** - Mobile-first field interface  
✅ **Supervisor Dashboard** - Desktop operational oversight  

All diagrams are rendered using Mermaid syntax and can be displayed in any Markdown viewer that supports Mermaid (GitHub, GitLab, Notion, etc.).

---

**Generated**: June 12, 2026  
**Project**: Voice-First AI Assistant for Field Service Operations  
**Version**: 1.0
