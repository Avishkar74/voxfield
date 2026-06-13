-- seed.sql: Realistic mock data for VoxField

-- 1. Create a mock user in auth.users (Supabase requires this for the foreign key)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech@voxfield.com', 'hashed_pwd_mock', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"John Doe"}', now(), now(), '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'supervisor@voxfield.com', 'hashed_pwd_mock', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Jane Smith"}', now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert into public.users
INSERT INTO public.users (id, employee_code, full_name, email, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'TECH-001', 'John Doe', 'tech@voxfield.com', 'TECHNICIAN'),
  ('22222222-2222-2222-2222-222222222222', 'SUP-001', 'Jane Smith', 'supervisor@voxfield.com', 'SUPERVISOR')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert realistic Equipment
INSERT INTO public.equipment (id, equipment_code, name, location, manufacturer, installation_date, status)
VALUES
  ('33333333-3333-3333-3333-333333333331', 'HVAC-R1-01', 'Rooftop HVAC Unit 01', 'Building A - Roof', 'Carrier', '2018-05-12', 'ACTIVE'),
  ('33333333-3333-3333-3333-333333333332', 'GEN-B1-01', 'Backup Generator 500kW', 'Building A - Basement', 'Caterpillar', '2015-11-20', 'ACTIVE'),
  ('33333333-3333-3333-3333-333333333333', 'PUMP-W-01', 'Main Water Pump', 'Pump Room 1', 'Grundfos', '2020-02-15', 'UNDER_MAINTENANCE'),
  ('33333333-3333-3333-3333-333333333334', 'HVAC-R1-02', 'Rooftop HVAC Unit 02', 'Building B - Roof', 'Trane', '2019-08-10', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Repair History
INSERT INTO public.repair_history (equipment_id, repair_date, failure_type, description, performed_by, repair_duration_hours, cost)
VALUES
  ('33333333-3333-3333-3333-333333333331', '2022-06-15', 'Compressor Failure', 'Replaced faulty compressor and recharged refrigerant.', '11111111-1111-1111-1111-111111111111', 4.5, 1250.00),
  ('33333333-3333-3333-3333-333333333332', '2023-01-10', 'Battery Dead', 'Replaced starting batteries and tested automatic transfer switch.', '11111111-1111-1111-1111-111111111111', 2.0, 450.00)
ON CONFLICT DO NOTHING;

-- 5. Insert Inspection Reports
INSERT INTO public.inspection_reports (id, equipment_id, technician_id, title, description, recommendation, severity, status)
VALUES
  ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Quarterly HVAC PM', 'Filters replaced, belts inspected. Found slight vibration in fan motor.', 'Monitor fan motor vibration; consider bearing replacement next quarter.', 'LOW', 'CLOSED'),
  ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Pump Seal Leak', 'Discovered severe mechanical seal leak during routine rounds.', 'Immediate seal replacement required to prevent motor damage.', 'CRITICAL', 'OPEN')
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Work Orders
INSERT INTO public.work_orders (id, work_order_number, equipment_id, created_by, assigned_to, title, description, priority, status)
VALUES
  ('55555555-5555-5555-5555-555555555551', 'WO-2023-001', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Replace Pump Mechanical Seal', 'Replace leaking mechanical seal on Main Water Pump. Lock out/tag out required.', 'CRITICAL', 'IN_PROGRESS'),
  ('55555555-5555-5555-5555-555555555552', 'WO-2023-002', '33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Annual Generator Load Test', 'Perform 4-hour load bank test and oil analysis.', 'MEDIUM', 'OPEN')
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Alerts
INSERT INTO public.alerts (equipment_id, inspection_report_id, severity, message, status)
VALUES
  ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444442', 'CRITICAL', 'Water Pump seal failure detected. Immediate maintenance required.', 'OPEN'),
  ('33333333-3333-3333-3333-333333333331', NULL, 'HIGH', 'HVAC-R1-01 return air temperature exceeding threshold.', 'ACKNOWLEDGED')
ON CONFLICT DO NOTHING;

-- 8. Insert Equipment Documents
INSERT INTO public.equipment_documents (equipment_id, document_name, document_type, document_text)
VALUES
  ('33333333-3333-3333-3333-333333333331', 'HVAC Operation Manual', 'MANUAL', 'Carrier Rooftop Unit Operation Manual. To reset alarms, press the red reset button for 5 seconds. Optimal refrigerant pressure is 120 PSI...'),
  ('33333333-3333-3333-3333-333333333332', 'Generator Maintenance Schedule', 'MAINTENANCE_GUIDE', 'Perform oil changes every 500 running hours or annually. Start battery should maintain 24V under load. Use API CJ-4 15W-40 oil.')
ON CONFLICT DO NOTHING;
