-- DOWN migration for 002_rls_policies.sql

DROP POLICY IF EXISTS "equipment_documents_update_supervisor" ON public.equipment_documents;
DROP POLICY IF EXISTS "equipment_documents_insert_supervisor" ON public.equipment_documents;
DROP POLICY IF EXISTS "equipment_documents_select_authenticated" ON public.equipment_documents;

DROP POLICY IF EXISTS "alerts_update_supervisor" ON public.alerts;
DROP POLICY IF EXISTS "alerts_select_supervisor" ON public.alerts;

DROP POLICY IF EXISTS "activity_logs_select_supervisor" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_own" ON public.activity_logs;

DROP POLICY IF EXISTS "transcripts_select_supervisor" ON public.transcripts;
DROP POLICY IF EXISTS "transcripts_select_own" ON public.transcripts;

DROP POLICY IF EXISTS "work_orders_update_supervisor" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_update_own" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_insert_technician" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_select_supervisor" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_select_own" ON public.work_orders;

DROP POLICY IF EXISTS "inspection_reports_update_own" ON public.inspection_reports;
DROP POLICY IF EXISTS "inspection_reports_insert_technician" ON public.inspection_reports;
DROP POLICY IF EXISTS "inspection_reports_select_supervisor" ON public.inspection_reports;
DROP POLICY IF EXISTS "inspection_reports_select_own" ON public.inspection_reports;

DROP POLICY IF EXISTS "repair_history_select_authenticated" ON public.repair_history;

DROP POLICY IF EXISTS "equipment_delete_supervisor" ON public.equipment;
DROP POLICY IF EXISTS "equipment_update_supervisor" ON public.equipment;
DROP POLICY IF EXISTS "equipment_insert_supervisor" ON public.equipment;
DROP POLICY IF EXISTS "equipment_select_authenticated" ON public.equipment;

DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_select_supervisor_all" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;

ALTER TABLE IF EXISTS public.equipment_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transcripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inspection_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.repair_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.current_user_role();
