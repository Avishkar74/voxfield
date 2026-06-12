-- VoxField Phase 1: Security hardening migration
-- UP migration

-- This migration tightens RLS policies introduced in 002_rls_policies.sql
-- and removes an unsafe client INSERT policy from 003_auth_triggers.sql.
-- It is safe to apply after:
--   001_initial_schema.sql
--   002_rls_policies.sql
--   003_auth_triggers.sql

-- ---------------------------------------------------------------------------
-- 1) Prevent clients from changing sensitive fields on public.users
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Allow authenticated users to update their profile but disallow
-- client-side changes to sensitive columns (role, employee_code, email).
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role IS NOT DISTINCT FROM (
      SELECT role FROM public.users WHERE id = auth.uid()
    )
    AND employee_code IS NOT DISTINCT FROM (
      SELECT employee_code FROM public.users WHERE id = auth.uid()
    )
    AND email IS NOT DISTINCT FROM (
      SELECT email FROM public.users WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Remove client INSERT path into public.users (leave auth trigger as source)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_insert_service" ON public.users;

-- The `public.handle_new_user()` trigger (defined in 003_auth_triggers.sql)
-- will continue to populate `public.users` from `auth.users`. Removing the
-- client INSERT policy prevents clients from creating or duplicating rows.

-- ---------------------------------------------------------------------------
-- 3) Replace broad technician UPDATE on work_orders with a narrow policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "work_orders_update_own" ON public.work_orders;

-- Technicians are allowed to update status and completion timestamp only.
-- Enforce that all other columns remain unchanged by comparing to the
-- current row values using IS NOT DISTINCT FROM (safe for NULLs).
CREATE POLICY "work_orders_update_status_technician"
  ON public.work_orders
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (
    created_by = auth.uid()
    AND work_order_number IS NOT DISTINCT FROM (
      SELECT work_order_number FROM public.work_orders WHERE id = public.work_orders.id
    )
    AND equipment_id IS NOT DISTINCT FROM (
      SELECT equipment_id FROM public.work_orders WHERE id = public.work_orders.id
    )
    AND assigned_to IS NOT DISTINCT FROM (
      SELECT assigned_to FROM public.work_orders WHERE id = public.work_orders.id
    )
    AND title IS NOT DISTINCT FROM (
      SELECT title FROM public.work_orders WHERE id = public.work_orders.id
    )
    AND description IS NOT DISTINCT FROM (
      SELECT description FROM public.work_orders WHERE id = public.work_orders.id
    )
    AND priority IS NOT DISTINCT FROM (
      SELECT priority FROM public.work_orders WHERE id = public.work_orders.id
    )
    AND created_at IS NOT DISTINCT FROM (
      SELECT created_at FROM public.work_orders WHERE id = public.work_orders.id
    )
    AND created_by IS NOT DISTINCT FROM (
      SELECT created_by FROM public.work_orders WHERE id = public.work_orders.id
    )
    -- `status`, `completed_at`, and `updated_at` are intentionally NOT checked
    -- above so technicians may change status and set completion time.
  );

-- End of migration