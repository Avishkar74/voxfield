-- Technician soft-deactivate + optional alert link on work orders

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users (is_active);

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS alert_id UUID REFERENCES public.alerts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_alert_id ON public.work_orders (alert_id);

-- Supervisors may create work orders (RPC is SECURITY DEFINER; policy for direct inserts)
DROP POLICY IF EXISTS "work_orders_insert_supervisor" ON public.work_orders;
CREATE POLICY "work_orders_insert_supervisor"
  ON public.work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'SUPERVISOR'
    )
    AND created_by = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.create_work_order_tx(
  p_equipment_id UUID,
  p_created_by UUID,
  p_assigned_to UUID,
  p_title VARCHAR,
  p_description TEXT,
  p_priority public.work_order_priority,
  p_alert_id UUID DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_work_order RECORD;
  v_wo_number VARCHAR;
  v_current_max VARCHAR;
  v_next_val INT;
BEGIN
  SELECT work_order_number INTO v_current_max
  FROM public.work_orders
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_current_max IS NULL THEN
    v_wo_number := 'WO-0001';
  ELSE
    v_next_val := CAST(SUBSTRING(v_current_max FROM 4) AS INT) + 1;
    v_wo_number := 'WO-' || LPAD(CAST(v_next_val AS VARCHAR), 4, '0');
  END IF;

  INSERT INTO public.work_orders (
    work_order_number, equipment_id, created_by, assigned_to, title, description, priority, alert_id
  ) VALUES (
    v_wo_number, p_equipment_id, p_created_by, p_assigned_to, p_title, p_description, p_priority, p_alert_id
  ) RETURNING * INTO v_work_order;

  INSERT INTO public.activity_logs (
    user_id, action_type, entity_type, entity_id, description
  ) VALUES (
    p_created_by, 'CREATE_WORK_ORDER', 'work_orders', v_work_order.id, v_wo_number || ' created'
  );

  IF p_alert_id IS NOT NULL THEN
    UPDATE public.alerts
    SET
      status = 'ACKNOWLEDGED',
      acknowledged_by = p_created_by,
      updated_at = NOW()
    WHERE id = p_alert_id AND status = 'OPEN';
  END IF;

  RETURN jsonb_build_object(
    'workOrder', row_to_json(v_work_order)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
