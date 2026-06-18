# VoxField Development Seed Dataset

This document describes **exactly** what data the development seed creates, so the team
has one shared, well-understood dataset for testing, demos, mock presentations, and evaluation.

- **Seed script:** [`supabase/seed_dev.sql`](./seed_dev.sql)
- **Voice transcripts are intentionally NOT seeded** — voice history must reflect **real**
  interactions made through the assistant. The `transcripts` table starts empty.

## How to load it

1. Run the app: `npm run dev` → open `http://localhost:3000/login`.
2. **Sign up** two accounts (this auto-creates `public.users` profiles):
   - Technician → `technician@gmail.com`
   - Supervisor → `supervisor@gmail.com`
   - (If you use different emails, the script falls back to the first TECHNICIAN / SUPERVISOR it finds.)
3. In **Supabase Dashboard → SQL Editor**, run `seed_dev.sql`.
4. All records are linked to those two accounts. The script is **idempotent** (`ON CONFLICT DO NOTHING`).

---

## Equipment (7 units)

| Code | Name | Location | Manufacturer | Status |
|------|------|----------|--------------|--------|
| `MTR-102` | Conveyor Belt Motor 102 | Factory Floor A – Line 2 | Siemens | ACTIVE |
| `PUMP-201` | Hydraulic Pump Station 201 | Pump Room B | Grundfos | UNDER_MAINTENANCE |
| `COMP-001` | Air Compressor Unit 001 | Compressor Bay | Atlas Copco | ACTIVE |
| `GEN-B2` | Backup Generator 250kW | Building B – Basement | Caterpillar | ACTIVE |
| `HVAC-F3` | HVAC Floor 3 Central Unit | Building A – Floor 3 Plant | Carrier | ACTIVE |
| `CHI-001` | Industrial Chiller Unit 001 | Chiller Room 1 | York | UNDER_MAINTENANCE |
| `HVAC-R1-01` | Rooftop HVAC Unit 01 | Building A – Roof | Carrier | ACTIVE |

## Repair History (12 entries)

| Equipment | Failures seeded | Notable |
|-----------|-----------------|---------|
| `MTR-102` | 3 | Bearing failure, overheating, electrical fault (repeated-failure flag triggers) |
| `PUMP-201` | 2 | Hydraulic seal leak, cavitation |
| `COMP-001` | 2 | Air filter, pressure valve |
| `GEN-B2` | 1 | Battery replacement |
| `HVAC-F3` | 1 | Refrigerant leak |
| `CHI-001` | 2 | Cooling tower fault, compressor failure (highest cost: $8,500) |
| `HVAC-R1-01` | 1 | Compressor failure |

## Inspection Reports (6)

| Equipment | Title | Severity | Status |
|-----------|-------|----------|--------|
| `MTR-102` | Monthly PM – MTR-102 | MEDIUM | REVIEWED |
| `PUMP-201` | PUMP-201 Critical Seal Inspection | **CRITICAL** | OPEN |
| `COMP-001` | COMP-001 Quarterly Inspection | LOW | CLOSED |
| `HVAC-F3` | HVAC-F3 Cooling Performance Drop | HIGH | OPEN |
| `CHI-001` | CHI-001 Post-Repair Verification | LOW | REVIEWED |
| `HVAC-R1-01` | Quarterly HVAC PM | LOW | CLOSED |

## Work Orders (5)

| WO # | Equipment | Priority | Status | Assigned |
|------|-----------|----------|--------|----------|
| `WO-2025-001` | PUMP-201 | **CRITICAL** | IN_PROGRESS | Technician |
| `WO-2025-002` | MTR-102 | MEDIUM | OPEN | Technician |
| `WO-2025-003` | HVAC-F3 | HIGH | OPEN | Technician |
| `WO-2025-004` | GEN-B2 | MEDIUM | OPEN | Technician |
| `WO-2025-005` | CHI-001 | LOW | CLOSED | Technician |

## Alerts (4)

| Equipment | Severity | Status | Linked inspection |
|-----------|----------|--------|-------------------|
| `PUMP-201` | **CRITICAL** | OPEN | PUMP-201 seal inspection |
| `HVAC-F3` | HIGH | ACKNOWLEDGED | HVAC-F3 cooling drop |
| `MTR-102` | HIGH | OPEN | — (belt elongation) |
| `HVAC-R1-01` | HIGH | ACKNOWLEDGED | — (return air temp) |

> Supervisor "Critical Alerts" filters: severity ∈ {CRITICAL, HIGH}; status ∈ {OPEN, ACKNOWLEDGED, RESOLVED}.
> This dataset exercises 1 CRITICAL/OPEN, 1 HIGH/OPEN, and 2 HIGH/ACKNOWLEDGED.

## Activity Logs (13)
Mix of `QUERY_EQUIPMENT`, `CREATE_INSPECTION`, `CREATE_WORK_ORDER`, `UPDATE_WORK_ORDER`, `CREATE_ALERT`
across both the technician and supervisor accounts (drives the Recent Activity feed).

## Supporting operational data
- **Equipment Documents (3):** manuals/guides for `MTR-102`, `PUMP-201`, `COMP-001`.
- **Quantity Logs (6):** mock inventory movements tied to the work orders above.
- **Error Logs (5):** mock system errors (OpenAI/AssemblyAI/DB/auth) for the Operations Log.

## Transcripts / Voice History — **0 (by design)**
Not seeded. Generate real entries by using the voice assistant during testing/demos.

---

## Quick verification queries

```sql
select 'equipment' t, count(*) from equipment
union all select 'repair_history', count(*) from repair_history
union all select 'inspection_reports', count(*) from inspection_reports
union all select 'work_orders', count(*) from work_orders
union all select 'alerts', count(*) from alerts
union all select 'activity_logs', count(*) from activity_logs
union all select 'transcripts (should be 0 from seed)', count(*) from transcripts;
```

Expected from a fresh seed: equipment 7, repair_history 12, inspection_reports 6,
work_orders 5, alerts 4, activity_logs 13, transcripts 0.
