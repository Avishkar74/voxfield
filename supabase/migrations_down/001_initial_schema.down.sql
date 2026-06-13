-- DOWN migration for 001_initial_schema.sql

DROP TABLE IF EXISTS public.equipment_documents CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.transcripts CASCADE;
DROP TABLE IF EXISTS public.work_orders CASCADE;
DROP TABLE IF EXISTS public.inspection_reports CASCADE;
DROP TABLE IF EXISTS public.repair_history CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

DROP TYPE IF EXISTS public.alert_status;
DROP TYPE IF EXISTS public.alert_severity;
DROP TYPE IF EXISTS public.work_order_status;
DROP TYPE IF EXISTS public.work_order_priority;
DROP TYPE IF EXISTS public.inspection_status;
DROP TYPE IF EXISTS public.inspection_severity;
DROP TYPE IF EXISTS public.equipment_status;
DROP TYPE IF EXISTS public.user_role;
