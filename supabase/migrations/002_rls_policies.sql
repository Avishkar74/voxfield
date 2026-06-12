-- VoxField Phase 1: Row Level Security policies (TRD §8, Rules.md)
-- UP migration

-- ---------------------------------------------------------------------------
-- Helper: resolve role for the authenticated user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_supervisor_all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR');

CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- equipment
-- ---------------------------------------------------------------------------
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_select_authenticated"
  ON public.equipment
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "equipment_insert_supervisor"
  ON public.equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'SUPERVISOR');

CREATE POLICY "equipment_update_supervisor"
  ON public.equipment
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR')
  WITH CHECK (public.current_user_role() = 'SUPERVISOR');

CREATE POLICY "equipment_delete_supervisor"
  ON public.equipment
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR');

-- ---------------------------------------------------------------------------
-- repair_history
-- ---------------------------------------------------------------------------
ALTER TABLE public.repair_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repair_history_select_authenticated"
  ON public.repair_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Inserts/updates via service role / tool layer in later phases

-- ---------------------------------------------------------------------------
-- inspection_reports
-- ---------------------------------------------------------------------------
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspection_reports_select_own"
  ON public.inspection_reports
  FOR SELECT
  TO authenticated
  USING (technician_id = auth.uid());

CREATE POLICY "inspection_reports_select_supervisor"
  ON public.inspection_reports
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR');

CREATE POLICY "inspection_reports_insert_technician"
  ON public.inspection_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'TECHNICIAN'
    AND technician_id = auth.uid()
  );

CREATE POLICY "inspection_reports_update_own"
  ON public.inspection_reports
  FOR UPDATE
  TO authenticated
  USING (technician_id = auth.uid())
  WITH CHECK (technician_id = auth.uid());

-- ---------------------------------------------------------------------------
-- work_orders
-- ---------------------------------------------------------------------------
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_orders_select_own"
  ON public.work_orders
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "work_orders_select_supervisor"
  ON public.work_orders
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR');

CREATE POLICY "work_orders_insert_technician"
  ON public.work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'TECHNICIAN'
    AND created_by = auth.uid()
  );

CREATE POLICY "work_orders_update_own"
  ON public.work_orders
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "work_orders_update_supervisor"
  ON public.work_orders
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR')
  WITH CHECK (public.current_user_role() = 'SUPERVISOR');

-- ---------------------------------------------------------------------------
-- transcripts
-- ---------------------------------------------------------------------------
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcripts_select_own"
  ON public.transcripts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "transcripts_select_supervisor"
  ON public.transcripts
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR');

-- ---------------------------------------------------------------------------
-- activity_logs (immutable)
-- ---------------------------------------------------------------------------
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_select_own"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "activity_logs_select_supervisor"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR');

-- No UPDATE or DELETE policies — immutable audit trail

-- ---------------------------------------------------------------------------
-- alerts (supervisors only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_select_supervisor"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR');

CREATE POLICY "alerts_update_supervisor"
  ON public.alerts
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR')
  WITH CHECK (public.current_user_role() = 'SUPERVISOR');

-- ---------------------------------------------------------------------------
-- equipment_documents
-- ---------------------------------------------------------------------------
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_documents_select_authenticated"
  ON public.equipment_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "equipment_documents_insert_supervisor"
  ON public.equipment_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'SUPERVISOR');

CREATE POLICY "equipment_documents_update_supervisor"
  ON public.equipment_documents
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR')
  WITH CHECK (public.current_user_role() = 'SUPERVISOR');
