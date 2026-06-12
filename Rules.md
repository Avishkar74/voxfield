# Development Rules & Standards

## Voice-First AI Assistant for Field Service Operations

**Purpose**: Establish clear rules, constraints, and standards to guide implementation and ensure consistency across the codebase.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Architecture Rules](#architecture-rules)
3. [Code Standards](#code-standards)
4. [Database Rules](#database-rules)
5. [API Rules](#api-rules)
6. [Frontend Rules](#frontend-rules)
7. [Offline Rules](#offline-rules)
8. [Agent Rules](#agent-rules)
9. [Testing Rules](#testing-rules)
10. [Security Rules](#security-rules)
11. [Performance Rules](#performance-rules)
12. [Accessibility Rules](#accessibility-rules)

---

## Core Principles

### 1. Security by Default
- **All API endpoints require authentication** — Every `/api/*` route must validate JWT
- **No credentials in source code** — All secrets via environment variables only
- **Parameterised queries only** — Never interpolate user input into SQL
- **Principle of least privilege** — Users see only their own data except supervisors (role-based)

### 2. Reliability First
- **No data loss in offline mode** — Offline queue is durable (IndexedDB persists across sessions)
- **All mutations logged** — Every change recorded immutably for audit trail
- **Graceful degradation** — Feature failures don't crash the app
- **Retry with backoff** — Failed network requests retry automatically with exponential backoff

### 3. User-Focused Design
- **Voice is primary input** — UI elements are secondary; keyboard not required
- **Mobile-first** — Design for 375px width first, scale up
- **Accessibility standard** — WCAG 2.1 AA minimum (not optional)
- **Offline works** — App must function fully offline after initial load

### 4. Transparency
- **Clear error messages** — Users understand what went wrong and how to fix it
- **Activity trail** — Every action logged; supervisors see all activity
- **Status feedback** — Users always know online/offline status and sync progress

---

## Architecture Rules

### 1. Separation of Concerns

| Layer | Responsibility | Never Do |
|-------|-----------------|----------|
| **Frontend** | UI, user interaction, local caching | Access database directly |
| **API Layer** | JWT validation, routing, rate limiting | Business logic |
| **Agent Layer** | Intent classification, tool orchestration | Database access (via tools only) |
| **Tool Layer** | Database CRUD, validation, logging | Call other tools directly |
| **Database Layer** | Storage, RLS enforcement, indexes | Any application logic |

**Rule**: Each layer has a single responsibility. If a function touches multiple layers, break it up.

### 2. No Cross-Layer Shortcuts

```typescript
// ❌ WRONG: Frontend directly queries Supabase
const { data } = await supabase.from('equipment').select('*')

// ✅ RIGHT: Frontend calls API endpoint
const { data } = await fetch('/api/equipment').then(r => r.json())
```

### 3. Error Handling Layers

```typescript
// All errors propagate upward with context
Tool Layer:
  Validate input → throws ValidationError
    ↓
API Layer:
  Catches and formats → returns { error, code, timestamp }
    ↓
Frontend:
  Displays user-friendly message or retries
```

### 4. Dependency Injection

```typescript
// ✅ RIGHT: Pass dependencies as parameters
function createInspection(db: Database, alert: AlertService, log: Logger)

// ❌ WRONG: Import globally
import { db } from './db'
function createInspection()
```

---

## Code Standards

### 1. File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Component | PascalCase.tsx | `VoiceInput.tsx`, `WorkOrdersList.tsx` |
| Page | lowercase/index.tsx | `pages/dashboard/index.tsx` |
| Hook | camelCase.ts | `useVoiceInput.ts`, `useSyncEngine.ts` |
| Utility | camelCase.ts | `lib/validation.ts`, `lib/auth.ts` |
| Type | PascalCase.ts | `types/equipment.ts`, `types/agent.ts` |
| Test | *.test.ts | `tools.test.ts`, `api.test.ts` |

### 2. Directory Structure

```
/src
  /pages                      # Next.js pages
    /api                      # API endpoints
      /auth
      /equipment
      /inspections
      /work-orders
      /sync
      /dashboard
    /dashboard
    /login
  /components                 # Reusable React components
    /voice
    /dashboard
    /ui
  /lib                        # Utility functions
    /auth.ts
    /tools/
    /agent.ts
    /sync.ts
    /indexeddb.ts
  /context                    # React context
  /hooks                      # Custom hooks
  /types                      # TypeScript types & interfaces
  /styles                     # CSS modules or Tailwind
  /__tests__                  # Tests
  /public                     # Static assets

/supabase
  /migrations                 # Database migrations
    001_initial_schema.sql
    002_indexes.sql
```

### 3. TypeScript Rules

**Always use types**, never `any`:

```typescript
// ❌ WRONG
function processData(data: any) { }

// ✅ RIGHT
function processData(data: Equipment[]) { }

// ✅ RIGHT if truly polymorphic
function processData<T extends BaseEntity>(data: T[]) { }
```

**Use strict null checks**:

```typescript
// ✅ RIGHT: Explicitly handle null
const name = user?.name ?? 'Unknown'

// ❌ WRONG: Assume user exists
const name = user.name  // Could crash if user is null
```

### 4. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Variables | camelCase | `equipmentId`, `repairHistory` |
| Constants | UPPER_SNAKE_CASE | `MAX_QUEUE_SIZE`, `DEFAULT_TIMEOUT` |
| Classes/Types | PascalCase | `Equipment`, `InspectionReport` |
| Private members | _leadingUnderscore | `_validateInput()` |
| Booleans | isPrefixed/hasPrefixed | `isOnline`, `hasError` |

### 5. Import Order

```typescript
// 1. Third-party packages
import React from 'react'
import { Supabase } from '@supabase/supabase-js'

// 2. Internal absolute imports
import { useAuth } from '@/context/AuthContext'
import { getEquipmentHistory } from '@/lib/tools'

// 3. Internal relative imports
import { VoiceInput } from './components/VoiceInput'

// 4. Style imports (last)
import styles from './Dashboard.module.css'
```

### 6. Comment Standards

**Good comments explain WHY, not WHAT**:

```typescript
// ✅ GOOD: Explains business logic
// Critical inspections must auto-generate alerts immediately
// so supervisors can respond within 5 minutes
if (severity === 'CRITICAL') {
  await createAlert(...)
}

// ❌ BAD: Just restates the code
// Check if severity is CRITICAL
if (severity === 'CRITICAL') {
```

**Use JSDoc for public functions**:

```typescript
/**
 * Retrieve repair history for equipment
 * @param equipmentId - Equipment UUID
 * @param limit - Max records to return (1-100)
 * @returns Array of repair records sorted by date DESC
 * @throws ValidationError if equipmentId is invalid
 */
export async function getEquipmentHistory(
  equipmentId: string,
  limit: number = 10
): Promise<RepairRecord[]>
```

---

## Database Rules

### 1. Schema Design

**Always use UUIDs for primary keys**:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**Index columns used in WHERE or JOIN**:
```sql
CREATE INDEX idx_equipment_code ON equipment(equipment_code);
CREATE INDEX idx_inspection_severity ON inspection_reports(severity);
```

**Use ENUM types for fixed values**:
```sql
CREATE TYPE work_order_status AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');
status work_order_status NOT NULL DEFAULT 'OPEN'
```

### 2. Migration Rules

**Every schema change requires a migration file**:
- Name: `001_initial_schema.sql`, `002_add_indexes.sql`, etc.
- Increment number
- Include both UP and DOWN migrations for rollback
- Test locally before pushing

### 3. Row-Level Security (RLS)

**Enable RLS on all sensitive tables**:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
```

**Write policies that enforce Authorisation Matrix**:
```sql
-- Technicians can only SELECT their own records
CREATE POLICY "Technicians see own inspections"
  ON inspection_reports FOR SELECT
  USING (technician_id = auth.uid());

-- Supervisors can see all
CREATE POLICY "Supervisors see all inspections"
  ON inspection_reports FOR SELECT
  USING (auth.jwt() ->> 'role' = 'SUPERVISOR');
```

### 4. Never Break These Rules

- ✅ **Immutability**: activity_logs and transcripts should never be updated or deleted
- ✅ **Uniqueness**: equipment_code, work_order_number are unique
- ✅ **Foreign keys**: Always define FK constraints
- ✅ **Timestamps**: Every table has `created_at` (immutable) and `updated_at` (on change)
- ❌ **No direct SELECT ***
- ❌ **No missing WHERE clauses** (prevents accidental full-table updates)

### 5. Indexing Strategy

**Create indexes for**:
- Columns used in WHERE clauses (single-column or composite)
- Foreign keys (for JOIN performance)
- Columns used in ORDER BY
- Columns used in GROUP BY

**Don't index**:
- Columns with very low cardinality (boolean, status)
- Columns rarely queried
- Text columns (unless using full-text search with GIN index)

---

## API Rules

### 1. Endpoint Structure

**Resources, not actions**:
```typescript
// ✅ RIGHT: Resource-based
POST /api/inspections/create
GET /api/equipment/:id/history
PATCH /api/work-orders/:id

// ❌ WRONG: Action-based verbs
POST /api/createInspection
POST /api/getHistory
```

### 2. Request/Response Format

**All requests must include JWT in Authorization header**:
```typescript
headers: { Authorization: `Bearer ${jwt}` }
```

**All responses are JSON with consistent structure**:

Success (200):
```json
{
  "data": { /* payload */ },
  "status": "success",
  "timestamp": "ISO8601"
}
```

Error (4xx/5xx):
```json
{
  "error": "string description",
  "code": "ERROR_CODE",
  "timestamp": "ISO8601"
}
```

### 3. Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200** | Success | API call succeeded |
| **400** | Bad request | Invalid input, failed validation |
| **401** | Unauthorized | Missing or expired JWT |
| **403** | Forbidden | User lacks permission (RLS denied) |
| **404** | Not found | Equipment doesn't exist |
| **409** | Conflict | Unique constraint violation |
| **429** | Too many requests | Rate limit exceeded |
| **500** | Server error | Unexpected error, log to Sentry |

### 4. Validation Rules

**Validate at API entry point**:

```typescript
// pages/api/inspections/create.ts
const schema = z.object({
  equipment_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
})

const parsed = schema.parse(req.body)  // Throws if invalid
```

**Validate again in tools** (defence in depth):
```typescript
// lib/tools/createInspection.ts
if (!equipmentId.match(/^[0-9a-f-]+$/)) {
  throw new ValidationError('Invalid equipment_id')
}
```

### 5. Error Codes

Create a centralized error code enum:

```typescript
enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  AGENT_ERROR = 'AGENT_ERROR',
  OFFLINE_ERROR = 'OFFLINE_ERROR',
}
```

---

## Frontend Rules

### 1. Component Structure

**Components must have single responsibility**:

```typescript
// ✅ RIGHT: Focused component
export function VoiceInput() {
  return <button>Record</button>
}

// ❌ WRONG: Too many concerns
export function Dashboard() {
  // Includes: voice input, work orders, inspections, settings, etc.
}
```

**Use composition for complex UIs**:

```typescript
// ✅ RIGHT: Break into components
<Dashboard>
  <VoiceInput />
  <WorkOrdersList />
  <InspectionsList />
  <SyncStatus />
</Dashboard>
```

### 2. State Management

**Use React Context for global state (auth, online/offline)**:
```typescript
// ❌ WRONG: useState scattered across components
const [isOnline, setIsOnline] = useState(true)

// ✅ RIGHT: Context provider
<OfflineContext.Provider value={{ isOnline }}>
  <App />
</OfflineContext.Provider>
```

**Use local useState for component-level state**:
```typescript
export function VoiceInput() {
  const [isRecording, setIsRecording] = useState(false)
  // ...
}
```

### 3. Side Effects

**Use `useEffect` for side effects, not render logic**:

```typescript
// ✅ RIGHT: Effect handles side effect
useEffect(() => {
  navigator.onLine ? syncOfflineQueue() : null
}, [isOnline])

// ❌ WRONG: Logic in render
function MyComponent() {
  if (isOnline) syncOfflineQueue()  // Runs on every render!
}
```

### 4. Styling Rules

**Use Tailwind CSS utility classes**:
```typescript
// ✅ RIGHT: Utility classes
<div className="flex gap-4 p-6 bg-white rounded-lg shadow">

// ❌ WRONG: Custom CSS without reason
<div className={styles.container}>
```

**Only use CSS modules for complex component styles**:
```typescript
// ✅ RIGHT: CSS module for complex animations
<div className={styles.waveformAnimation}>

// ❌ WRONG: CSS module for simple styling
<div className={styles.button}>  // Just use Tailwind
```

### 5. Mobile-First Responsive Design

**Start with mobile styles, scale up**:

```typescript
// ✅ RIGHT: Mobile first
<div className="flex flex-col md:flex-row lg:gap-8">

// ❌ WRONG: Desktop first
<div className="flex flex-row md:flex-col lg:gap-8">
```

**Touch targets minimum 44x44px on mobile**:
```typescript
// ✅ RIGHT: Microphone button is large
<button className="w-16 h-16">🎤</button>

// ❌ WRONG: Too small for thumb
<button className="w-8 h-8">🎤</button>
```

### 6. Accessibility (WCAG 2.1 AA)

**Form inputs must have associated labels**:
```typescript
// ✅ RIGHT
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ❌ WRONG: No label
<input type="email" placeholder="email" />
```

**Icon-only buttons need aria-label**:
```typescript
// ✅ RIGHT
<button aria-label="Record voice">🎤</button>

// ❌ WRONG: No label
<button>🎤</button>
```

**Colour contrast ≥ 4.5:1 for text**:
- Use tool like WebAIM to verify
- Test both light and dark mode

### 7. Performance Rules

**Code split large components**:
```typescript
// ✅ RIGHT: Lazy load supervisor dashboard
const SupervisorDashboard = lazy(() => 
  import('./SupervisorDashboard')
)

// ❌ WRONG: Load everything upfront
import SupervisorDashboard from './SupervisorDashboard'
```

**Memoize expensive computations**:
```typescript
// ✅ RIGHT: Cache result
const technicians = useMemo(() => 
  filterAndSort(allTechs), [allTechs]
)

// ❌ WRONG: Recalculate on every render
const technicians = filterAndSort(allTechs)
```

---

## Offline Rules

### 1. Queue Management

**All offline items must have**:
- Unique `queue_id` (UUID)
- `timestamp` (ISO8601, immutable)
- `status` (PENDING_SYNC | SYNCING | SYNCED | FAILED)
- `attempt_count` (incremented on retry)

### 2. Idempotency

**Every offline action must be idempotent** (safe to replay):
```typescript
// ✅ RIGHT: Idempotent create (UUIDs prevent duplicates)
INSERT INTO work_orders (id, work_order_number, ...)
VALUES (?, ?, ...)
ON CONFLICT(id) DO NOTHING

// ❌ WRONG: Non-idempotent (creates duplicate if retried)
INSERT INTO work_orders (work_order_number, ...)
VALUES (?)
```

### 3. Sync Order

**Items sync in FIFO order** (oldest first):
```typescript
SELECT * FROM offline_queue 
WHERE status = 'PENDING_SYNC' 
ORDER BY timestamp ASC
```

### 4. No Partial Syncs

**Either all items sync or none**:
- Process one at a time
- If any fails, don't skip to next (retry same item)
- Only move to FAILED after 3 retries

### 5. Cache Invalidation

**Invalidate local cache after successful sync**:
```typescript
// After sync completes
await indexeddb.deleteStore('user_cache')
// Refetch from server on next load
```

---

## Agent Rules

### 1. Tool Restrictions

**Tools are the only way to access database**:
```typescript
// ❌ WRONG: Direct database access in agent
const user = await supabase.from('users').select()

// ✅ RIGHT: Call tool via function calling
const user = await tools.getCurrentUser()
```

### 2. Permission Enforcement

**Agent must respect role permissions**:

In system prompt:
```
"You are an assistant for {role} users.
Approved tools: {tool_list_for_role}
Do not call tools outside this list."
```

In tool functions:
```typescript
if (userRole !== 'TECHNICIAN') {
  throw new PermissionError('Only technicians can create inspections')
}
```

### 3. Response Format

**All responses must be TTS-safe**:
- No markdown (no `**bold**`, `- bullets`, etc.)
- No special characters except punctuation
- Plain English only
- Target < 50 words for queries, < 100 for confirmations

### 4. Error Handling

**Agent must handle tool errors gracefully**:
```typescript
// ✅ RIGHT: Catch and explain
try {
  equipment = await getEquipmentHistory(id)
} catch (error) {
  return "I couldn't find that equipment. Can you check the code?"
}

// ❌ WRONG: Let error crash
return await getEquipmentHistory(id)
```

### 5. Tool Calling Temperature

**Always use temperature = 0.2 for deterministic tool selection**:
```typescript
const response = await openai.createChatCompletion({
  model: 'gpt-4o',
  temperature: 0.2,  // ← Fixed. Never increase!
  functions: toolDefinitions,
})
```

---

## Testing Rules

### 1. Test Coverage

- **Unit tests**: ≥ 90% for tools and API layer
- **Integration tests**: All critical flows (voice → tool → response)
- **E2E tests**: 5+ main user journeys
- **No test for trivial code** (getters, simple passthrough)

### 2. Test Organization

```typescript
// ✅ RIGHT: Organized by concern
describe('getEquipmentHistory', () => {
  it('returns repairs for valid equipment', () => {})
  it('throws error if equipment not found', () => {})
  it('respects limit parameter', () => {})
})

// ❌ WRONG: Unorganized
it('test 1', () => {})
it('test 2', () => {})
```

### 3. Mocking

**Mock external dependencies**:
```typescript
// ✅ RIGHT: Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: jest.fn() })
}))

// ❌ WRONG: Call real Supabase in tests
const { data } = await supabase.from('equipment').select()
```

### 4. Assertions

**One assertion per test** (or use describe blocks):
```typescript
// ✅ RIGHT: One concept per test
it('returns equipment with repair_history', () => {
  const result = getEquipment(id)
  expect(result.name).toBe('Pump')
})

// ❌ WRONG: Multiple unrelated assertions
it('test equipment', () => {
  expect(equipment.name).toBe('Pump')
  expect(equipment.location).toBe('Building A')
  expect(equipment.status).toBe('ACTIVE')
})
```

---

## Security Rules

### 1. JWT Validation

**Every API endpoint must validate JWT**:
```typescript
// ✅ RIGHT: Middleware validates JWT
app.use(withAuth)

export default withAuth(async (req, res) => {
  // req.user is guaranteed to exist
})

// ❌ WRONG: No validation
export default async (req, res) => {
  const userId = req.headers.authorization  // Unsafe!
}
```

### 2. Environment Variables

**Never commit secrets to git**:
```bash
# ✅ RIGHT: .env.local (in .gitignore)
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=...

# ❌ WRONG: In source code
const API_KEY = 'sk-...'

# ❌ WRONG: In .env (committed to git)
```

### 3. SQL Injection Prevention

**Always use parameterised queries**:
```typescript
// ✅ RIGHT: Parameters
const { data } = await supabase
  .from('equipment')
  .select()
  .eq('code', equipmentCode)

// ❌ WRONG: String interpolation
const query = `SELECT * FROM equipment WHERE code = '${equipmentCode}'`
```

### 4. CORS

**Restrict to frontend origin only**:
```typescript
// ✅ RIGHT: Specific origin
cors: {
  origin: 'https://voiceassistant.vercel.app',
  credentials: true
}

// ❌ WRONG: Allow all
cors: {
  origin: '*'
}
```

### 5. Rate Limiting

**Enforce 60 requests/min per user**:
```typescript
// ✅ RIGHT: Rate limit middleware
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user.id
}))

// ❌ WRONG: No rate limiting
```

---

## Performance Rules

### 1. Latency Budgets

**Must stay within these targets**:

| Operation | Target | Max |
|-----------|--------|-----|
| STT processing | 2–5s | 8s |
| Agent inference | 2–3s | 8s |
| TTS generation | 1–2s | 5s |
| Database query | < 200ms | 500ms |
| Voice-to-response | 6–12s | 25s |
| Dashboard load | < 2s | 5s |

### 2. Lighthouse Score

**Target ≥ 90** on all metrics:
- Performance ≥ 90
- Accessibility ≥ 90
- Best Practices ≥ 90
- SEO ≥ 90

Run locally: `npm run lighthouse`

### 3. Bundle Size

**Keep main bundle < 200 KB** (gzipped):
- Code split dashboards
- Lazy load components
- Tree-shake unused code
- Use lighter alternatives (e.g., date-fns vs moment)

### 4. Database Queries

**Every query must have an index**:
```sql
-- ✅ RIGHT: Indexed column
SELECT * FROM equipment WHERE equipment_code = ?
-- Index: CREATE INDEX idx_equipment_code ON equipment(code)

-- ❌ WRONG: No index (full table scan)
SELECT * FROM equipment WHERE name LIKE ?
```

### 5. Caching Strategy

**Cache these, never these**:

Cacheable (Cache First):
- App shell (HTML/CSS/JS)
- Icons and logos
- Fonts

Revalidate (Stale-While-Revalidate):
- API responses (user data)
- Equipment list

Don't cache:
- JWT tokens (no caching in Service Worker)
- Real-time data (activity feed, alerts)

---

## Accessibility Rules

### WCAG 2.1 AA Minimum

### 1. Keyboard Navigation

**All functionality must be accessible via keyboard**:
- No elements hidden from tab order
- Logical tab sequence (left-to-right, top-to-bottom)
- Focus trap in modals
- Keyboard shortcut (Alt+key) for major functions

### 2. Screen Reader Support

**Use semantic HTML**:
```html
<!-- ✅ RIGHT: Semantic -->
<button aria-label="Record">🎤</button>
<form>
  <label for="email">Email</label>
  <input id="email" type="email" />
</form>

<!-- ❌ WRONG: Non-semantic -->
<div onClick={...}>Record</div>
<div>
  <span>Email</span>
  <input type="text" />
</div>
```

### 3. Colour Contrast

**Text contrast ≥ 4.5:1 (AAA: ≥ 7:1)**:
- Test with WebAIM tool
- Test both light and dark mode
- Include users with colour blindness

### 4. Font Size & Spacing

**Minimum 16px font** on mobile:
- Mobile: 16px base
- Tablet: 14px base
- Desktop: 14px base

**Line-height ≥ 1.5**:
```css
line-height: 1.5;  /* ✅ Readable */
line-height: 1.2;  /* ❌ Too tight */
```

### 5. Images & Icons

**All images need alt text**:
```html
<!-- ✅ RIGHT -->
<img src="pump.png" alt="Centrifugal pump MTR-102" />

<!-- ❌ WRONG -->
<img src="pump.png" />
<img src="icon.png" alt="icon" />  <!-- Not descriptive -->
```

**Icon-only buttons need aria-label**:
```html
<!-- ✅ RIGHT -->
<button aria-label="Record voice">🎤</button>

<!-- ❌ WRONG -->
<button>🎤</button>
```

---

## Summary Checklist

Before committing code, verify:

- [ ] All endpoints require JWT auth
- [ ] All database changes have migrations
- [ ] TypeScript strict mode enabled
- [ ] Components have single responsibility
- [ ] All secrets in .env (not source code)
- [ ] Parameterised SQL queries only
- [ ] Tests written for new code
- [ ] No console.log left in production
- [ ] Lighthouse score ≥ 90
- [ ] WCAG 2.1 AA accessibility
- [ ] Error handling for all async ops
- [ ] Rate limiting on API
- [ ] Comments explain WHY, not WHAT
- [ ] No data loss scenarios

---

**Rules Version**: 1.0  
**Last Updated**: June 12, 2026
