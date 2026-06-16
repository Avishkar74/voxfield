-- UP migration

-- ---------------------------------------------------------------------------
-- Recreate constraints with ON DELETE CASCADE to allow technician deletion
-- ---------------------------------------------------------------------------

ALTER TABLE public.inspection_reports 
  DROP CONSTRAINT IF EXISTS inspection_reports_technician_id_fkey,
  ADD CONSTRAINT inspection_reports_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.work_orders 
  DROP CONSTRAINT IF EXISTS work_orders_created_by_fkey,
  ADD CONSTRAINT work_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.transcripts 
  DROP CONSTRAINT IF EXISTS transcripts_user_id_fkey,
  ADD CONSTRAINT transcripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.activity_logs 
  DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey,
  ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- quantity_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quantity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_item VARCHAR(255) NOT NULL,
  previous_quantity INTEGER NOT NULL,
  updated_quantity INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_action VARCHAR(255) NOT NULL
);

ALTER TABLE public.quantity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quantity_logs_select_supervisor"
  ON public.quantity_logs
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR');

CREATE POLICY "quantity_logs_insert_all"
  ON public.quantity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- error_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  component_service VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity VARCHAR(50) NOT NULL
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "error_logs_select_supervisor"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'SUPERVISOR');

CREATE POLICY "error_logs_insert_all"
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
