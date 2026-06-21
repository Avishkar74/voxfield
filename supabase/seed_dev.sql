-- =============================================================
-- VoxField Development Seed Data
-- =============================================================
-- IMPORTANT: For development use only.
-- Run this in Supabase Dashboard > SQL Editor
--
-- BEFORE running this script:
-- 1. Run the local Next.js dev server: npm run dev
-- 2. Open http://localhost:3000/login
-- 3. Click "Sign up" and register a Technician account with email:
--      technician@gmail.com
-- 4. Click "Sign up" and register a Supervisor account with email:
--      supervisor@gmail.com
-- 5. Once registered, they are automatically synced to public.users profiles.
-- 6. Execute this script in the SQL editor to link all equipment, work orders,
--    inspections, alerts, logs, and transcripts to these accounts.
-- =============================================================

DO $$
DECLARE
  tech_id uuid;
  sup_id uuid;
BEGIN
  -- Retrieve the user IDs from public.users
  SELECT id INTO tech_id FROM public.users WHERE email = 'technician@gmail.com';
  SELECT id INTO sup_id FROM public.users WHERE email = 'supervisor@gmail.com';

  -- Fallbacks: if they signed up with different emails but have the matching roles, use them
  IF tech_id IS NULL THEN
    SELECT id INTO tech_id FROM public.users WHERE role = 'TECHNICIAN' LIMIT 1;
  END IF;
  IF sup_id IS NULL THEN
    SELECT id INTO sup_id FROM public.users WHERE role = 'SUPERVISOR' LIMIT 1;
  END IF;

  -- Raise exception if no accounts are found
  IF tech_id IS NULL OR sup_id IS NULL THEN
    RAISE EXCEPTION E'Developer accounts not found in public.users.\n\nTo seed development data:\n1. Open http://localhost:3000/login\n2. Click "Sign up" and create a Technician account with email: technician@gmail.com\n3. Click "Sign up" and create a Supervisor account with email: supervisor@gmail.com\n4. Re-run this SQL script in the SQL Editor.';
  END IF;

  -- Step 1: Realistic Industrial Equipment (7 units)
  INSERT INTO public.equipment (id, equipment_code, name, location, manufacturer, installation_date, status)
  VALUES
    ('e1000001-0000-0000-0000-000000000001', 'MTR-102',  'Conveyor Belt Motor 102',      'Factory Floor A - Line 2',   'Siemens',    '2019-03-15', 'ACTIVE'),
    ('e1000001-0000-0000-0000-000000000002', 'PUMP-201', 'Hydraulic Pump Station 201',   'Pump Room B',                'Grundfos',   '2020-07-22', 'UNDER_MAINTENANCE'),
    ('e1000001-0000-0000-0000-000000000003', 'COMP-001', 'Air Compressor Unit 001',       'Compressor Bay',             'Atlas Copco','2018-11-10', 'ACTIVE'),
    ('e1000001-0000-0000-0000-000000000004', 'GEN-B2',   'Backup Generator 250kW',        'Building B - Basement',      'Caterpillar','2016-05-30', 'ACTIVE'),
    ('e1000001-0000-0000-0000-000000000005', 'HVAC-F3',  'HVAC Floor 3 Central Unit',     'Building A - Floor 3 Plant', 'Carrier',    '2021-01-18', 'ACTIVE'),
    ('e1000001-0000-0000-0000-000000000006', 'CHI-001',  'Industrial Chiller Unit 001',   'Chiller Room 1',             'York',       '2017-09-05', 'UNDER_MAINTENANCE'),
    ('e1000001-0000-0000-0000-000000000007', 'HVAC-R1-01', 'Rooftop HVAC Unit 01',        'Building A - Roof',          'Carrier',    '2018-05-12', 'ACTIVE')
  ON CONFLICT (id) DO NOTHING;

  -- Step 2: Repair History (11 entries, linked to equipment)
  INSERT INTO public.repair_history (equipment_id, repair_date, failure_type, description, performed_by, repair_duration_hours, cost)
  VALUES
    ('e1000001-0000-0000-0000-000000000001', '2025-01-10', 'Bearing Failure',       'Replaced worn bearings on main shaft. Vibration levels returned to normal.', tech_id, 3.5, 850.00),
    ('e1000001-0000-0000-0000-000000000001', '2025-04-22', 'Overheating',           'Cleaned cooling vents and replaced thermal paste. Motor temp reduced by 15°C.', tech_id, 2.0, 320.00),
    ('e1000001-0000-0000-0000-000000000001', '2025-09-05', 'Electrical Fault',      'Replaced faulty capacitor bank. Power factor corrected to 0.95.', tech_id, 4.0, 1100.00),
    ('e1000001-0000-0000-0000-000000000002', '2024-11-30', 'Hydraulic Seal Leak',   'Replaced primary shaft seal. System pressure stabilized at 200 bar.', tech_id, 6.0, 2400.00),
    ('e1000001-0000-0000-0000-000000000002', '2025-05-14', 'Pump Cavitation',       'Cleared air pockets, adjusted inlet valve. Flow restored to 450 L/min.', tech_id, 2.5, 180.00),
    ('e1000001-0000-0000-0000-000000000003', '2025-02-08', 'Air Filter Clogged',    'Replaced primary and secondary air filters. Compression ratio improved.', tech_id, 1.5, 95.00),
    ('e1000001-0000-0000-0000-000000000003', '2025-06-17', 'Pressure Valve Fault',  'Replaced faulty pressure relief valve. Set pressure adjusted to 8.5 bar.', tech_id, 3.0, 560.00),
    ('e1000001-0000-0000-0000-000000000004', '2025-03-01', 'Battery Replacement',   'Replaced starting batteries (24V system). Load test passed at 100% rated output.', tech_id, 2.0, 680.00),
    ('e1000001-0000-0000-0000-000000000005', '2025-07-20', 'Refrigerant Leak',      'Located and sealed refrigerant leak in evaporator coil. Recharged with R410A.', tech_id, 5.0, 1750.00),
    ('e1000001-0000-0000-0000-000000000006', '2025-08-11', 'Cooling Tower Fault',   'Replaced cooling tower fan motor. COP improved from 2.1 to 3.4.', tech_id, 7.0, 3200.00),
    ('e1000001-0000-0000-0000-000000000006', '2025-10-02', 'Compressor Failure',    'Replaced scroll compressor. Chiller output restored to 500 kW.', tech_id, 12.0, 8500.00),
    ('e1000001-0000-0000-0000-000000000007', '2022-06-15', 'Compressor Failure',    'Replaced faulty compressor and recharged refrigerant.', tech_id, 4.5, 1250.00)
  ON CONFLICT DO NOTHING;

  -- Step 3: Inspection Reports (5+ entries)
  INSERT INTO public.inspection_reports (id, equipment_id, technician_id, title, description, recommendation, severity, status)
  VALUES
    ('a1000001-0000-0000-0000-000000000001', 'e1000001-0000-0000-0000-000000000001', tech_id,
      'Monthly PM - MTR-102',
      'Lubricated all bearings. Belt tension checked and adjusted. Motor draws 18A under full load (rated 20A).',
      'Schedule belt replacement within 30 days. Current elongation is 3mm beyond tolerance.',
      'MEDIUM', 'REVIEWED'),
    ('a1000001-0000-0000-0000-000000000002', 'e1000001-0000-0000-0000-000000000002', tech_id,
      'PUMP-201 Critical Seal Inspection',
      'Discovered active mechanical seal leak. Oil visible on pump housing. Estimated loss 0.5L/hr.',
      'Immediate shutdown and seal replacement required. Continued operation risks catastrophic pump failure.',
      'CRITICAL', 'OPEN'),
    ('a1000001-0000-0000-0000-000000000003', 'e1000001-0000-0000-0000-000000000003', tech_id,
      'COMP-001 Quarterly Inspection',
      'Air delivery pressure stable at 8.5 bar. Vibration within limits. Oil level topped up.',
      'No immediate action required. Next full service due in 500 operating hours.',
      'LOW', 'CLOSED'),
    ('a1000001-0000-0000-0000-000000000004', 'e1000001-0000-0000-0000-000000000005', tech_id,
      'HVAC-F3 Cooling Performance Drop',
      'Supply air temperature 4°C above setpoint. Evaporator coils showing ice formation on lower fins.',
      'Inspect refrigerant charge level. Possible low charge condition or blocked expansion valve.',
      'HIGH', 'OPEN'),
    ('a1000001-0000-0000-0000-000000000005', 'e1000001-0000-0000-0000-000000000006', tech_id,
      'CHI-001 Post-Repair Verification',
      'New scroll compressor installed and tested. Chiller output verified at 480 kW. COP = 3.2.',
      'Monitor chiller performance for 72 hours post-repair. Log data every 4 hours.',
      'LOW', 'REVIEWED'),
    ('a1000001-0000-0000-0000-000000000006', 'e1000001-0000-0000-0000-000000000007', tech_id,
      'Quarterly HVAC PM',
      'Filters replaced, belts inspected. Found slight vibration in fan motor.',
      'Monitor fan motor vibration; consider bearing replacement next quarter.',
      'LOW', 'CLOSED')
  ON CONFLICT (id) DO NOTHING;

  -- Step 4: Work Orders (5+ entries, linked to equipment + users)
  INSERT INTO public.work_orders (id, work_order_number, equipment_id, created_by, assigned_to, title, description, priority, status)
  VALUES
    ('d1000001-0000-0000-0000-000000000001', 'WO-2025-001', 'e1000001-0000-0000-0000-000000000002',
      sup_id, tech_id,
      'Replace Mechanical Seal on PUMP-201',
      'Critical seal failure detected during inspection. Isolate pump, LOTO, replace Type-B mechanical seal. Pressure test to 250 bar before reinstatement.',
      'CRITICAL', 'IN_PROGRESS'),
    ('d1000001-0000-0000-0000-000000000002', 'WO-2025-002', 'e1000001-0000-0000-0000-000000000001',
      sup_id, tech_id,
      'Belt Replacement on MTR-102',
      'Drive belt showing elongation beyond tolerance (3mm). Replace with OEM part #SIE-B-22X. Check alignment post-installation.',
      'MEDIUM', 'OPEN'),
    ('d1000001-0000-0000-0000-000000000003', 'WO-2025-003', 'e1000001-0000-0000-0000-000000000005',
      tech_id, tech_id,
      'HVAC-F3 Refrigerant Charge Inspection',
      'Investigate cooling performance drop. Check refrigerant pressures at service ports, inspect expansion valve, check for blockages.',
      'HIGH', 'OPEN'),
    ('d1000001-0000-0000-0000-000000000004', 'WO-2025-004', 'e1000001-0000-0000-0000-000000000004',
      sup_id, tech_id,
      'GEN-B2 Annual Load Bank Test',
      'Perform 4-hour load bank test at 80% and 100% rated capacity. Sample oil for analysis. Test automatic transfer switch.',
      'MEDIUM', 'OPEN'),
    ('d1000001-0000-0000-0000-000000000005', 'WO-2025-005', 'e1000001-0000-0000-0000-000000000006',
      tech_id, tech_id,
      'CHI-001 72-Hour Post-Repair Monitoring',
      'Log chiller performance data every 4 hours. Record supply/return temperatures, COP, and compressor current. Report anomalies immediately.',
      'LOW', 'CLOSED')
  ON CONFLICT (id) DO NOTHING;

  -- Step 5: Alerts (linked to inspections)
  INSERT INTO public.alerts (equipment_id, inspection_report_id, severity, message, status)
  VALUES
    ('e1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002',
      'CRITICAL', 'PUMP-201: Active mechanical seal failure. Immediate shutdown and replacement required.', 'OPEN'),
    ('e1000001-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000004',
      'HIGH', 'HVAC-F3: Supply air temperature exceeding setpoint by 4°C. Evaporator icing detected.', 'ACKNOWLEDGED'),
    ('e1000001-0000-0000-0000-000000000001', NULL,
      'HIGH', 'MTR-102: Drive belt elongation detected. Replacement required within 30 days.', 'OPEN'),
    ('e1000001-0000-0000-0000-000000000007', NULL,
      'HIGH', 'HVAC-R1-01 return air temperature exceeding threshold.', 'ACKNOWLEDGED')
  ON CONFLICT DO NOTHING;

  -- Step 6: Activity Logs (12 entries)
  INSERT INTO public.activity_logs (user_id, action_type, entity_type, entity_id, description)
  VALUES
    (tech_id, 'QUERY_EQUIPMENT', 'equipment', 'e1000001-0000-0000-0000-000000000001', 'Queried repair history for MTR-102'),
    (tech_id, 'CREATE_INSPECTION', 'inspection_report', 'a1000001-0000-0000-0000-000000000001', 'Created monthly PM inspection for MTR-102'),
    (tech_id, 'QUERY_EQUIPMENT', 'equipment', 'e1000001-0000-0000-0000-000000000002', 'Queried pump status for PUMP-201'),
    (tech_id, 'CREATE_INSPECTION', 'inspection_report', 'a1000001-0000-0000-0000-000000000002', 'Created critical inspection for PUMP-201 seal leak'),
    (tech_id, 'CREATE_ALERT', 'alert', 'e1000001-0000-0000-0000-000000000002', 'Auto-alert generated for CRITICAL inspection on PUMP-201'),
    (tech_id, 'QUERY_EQUIPMENT', 'equipment', 'e1000001-0000-0000-0000-000000000003', 'Queried compression history for COMP-001'),
    (tech_id, 'CREATE_INSPECTION', 'inspection_report', 'a1000001-0000-0000-0000-000000000003', 'Completed quarterly inspection for COMP-001'),
    (tech_id, 'CREATE_WORK_ORDER', 'work_order', 'd1000001-0000-0000-0000-000000000003', 'Created work order WO-2025-003 for HVAC-F3 refrigerant check'),
    (tech_id, 'UPDATE_WORK_ORDER', 'work_order', 'd1000001-0000-0000-0000-000000000005', 'Closed work order WO-2025-005 for CHI-001 monitoring'),
    (tech_id, 'QUERY_EQUIPMENT', 'equipment', 'e1000001-0000-0000-0000-000000000005', 'Queried HVAC-F3 maintenance history'),
    (tech_id, 'CREATE_INSPECTION', 'inspection_report', 'a1000001-0000-0000-0000-000000000004', 'Created HIGH severity inspection for HVAC-F3 cooling drop'),
    (sup_id, 'CREATE_WORK_ORDER', 'work_order', 'd1000001-0000-0000-0000-000000000001', 'Supervisor created CRITICAL work order WO-2025-001 for PUMP-201'),
    (tech_id, 'QUERY_EQUIPMENT', 'equipment', 'e1000001-0000-0000-0000-000000000007', 'Queried repair history for HVAC-R1-01')
  ON CONFLICT DO NOTHING;

  -- Step 7: Transcripts (voice history) — INTENTIONALLY NOT SEEDED.
  -- Per project requirement, voice history must reflect REAL user interactions
  -- captured through the voice assistant. Do NOT insert mock transcripts here.
  -- The transcripts table is left empty so the Voice History views start clean
  -- and only fill with genuine queries made during testing/demos.

  -- Step 8: Equipment Documents (linked)
  INSERT INTO public.equipment_documents (equipment_id, document_name, document_type, document_text)
  VALUES
    ('e1000001-0000-0000-0000-000000000001', 'MTR-102 Operation Manual', 'MANUAL',
      'Siemens Conveyor Motor MTR-102 Operation Manual. Rated voltage: 415V 3-phase. Rated current: 20A. Speed: 1480 RPM. To reset thermal overload, press the blue reset button for 3 seconds after motor has cooled. Bearing replacement interval: 8000 hours.'),
    ('e1000001-0000-0000-0000-000000000002', 'PUMP-201 Maintenance Schedule', 'MAINTENANCE_GUIDE',
      'Grundfos Hydraulic Pump PUMP-201 Maintenance Schedule. Seal replacement interval: 2 years or 6000 hours. Oil change: every 2000 hours. Alignment check: every 6 months. Recommended seal type: Type-B mechanical seal. System operating pressure: 200 bar.'),
    ('e1000001-0000-0000-0000-000000000003', 'COMP-001 Service Guide', 'MAINTENANCE_GUIDE',
      'Atlas Copco Air Compressor COMP-001 Service Guide. Operating pressure: 8.5 bar. Air filter replacement: every 2000 hours or 6 months. Oil change: every 4000 hours. Belt inspection: every 1000 hours. To reset alarm: hold ALT button for 5 seconds.')
  ON CONFLICT DO NOTHING;

  -- Step 9: Quantity Logs (mock inventory logs)
  INSERT INTO public.quantity_logs (asset_item, previous_quantity, updated_quantity, user_id, source_action)
  VALUES
    ('SIE-B-22X Drive Belt', 15, 14, tech_id, 'WO-2025-002: Belt Replacement on MTR-102'),
    ('Type-B Mechanical Seal', 4, 3, tech_id, 'WO-2025-001: Replace Mechanical Seal on PUMP-201'),
    ('R410A Refrigerant Cylinders', 8, 6, tech_id, 'WO-2025-003: HVAC-F3 Refrigerant Charge'),
    ('24V Starting Battery', 3, 2, tech_id, 'WO-2025-004: GEN-B2 battery replacement'),
    ('15W-40 Engine Oil (L)', 200, 180, tech_id, 'WO-2025-004: GEN-B2 Annual Service'),
    ('Scroll Compressor Unit', 2, 1, tech_id, 'CHI-001 Post-Repair Compressor swap')
  ON CONFLICT DO NOTHING;

  -- Step 10: Error Logs (mock system errors)
  INSERT INTO public.error_logs (error_type, error_message, component_service, severity)
  VALUES
    ('OpenAI API Timeout', 'Request to gpt-4o timed out after 10000ms. Retrying connection.', 'agent.ts', 'MEDIUM'),
    ('AssemblyAI Processing Error', 'Transcription job failed due to noisy input signal.', 'stt/route.ts', 'LOW'),
    ('Database Timeout', 'RPC create_work_order_tx locked by transaction concurrency.', 'operations.service.ts', 'HIGH'),
    ('Supabase Auth Connection Refused', 'Auth service returned 502 Bad Gateway during session verification.', 'middleware.ts', 'CRITICAL'),
    ('OpenAI Rate Limit Exceeded', 'Rate limit for gpt-4o tier reached. Falling back to exponential backoff.', 'agent.ts', 'LOW')
  ON CONFLICT DO NOTHING;

END $$;
