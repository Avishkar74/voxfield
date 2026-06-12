-- UP migration

CREATE OR REPLACE FUNCTION public.create_inspection_tx(
  p_equipment_id UUID,
  p_technician_id UUID,
  p_title VARCHAR,
  p_description TEXT,
  p_severity public.inspection_severity,
  p_recommendation TEXT
) RETURNS jsonb AS $$
DECLARE
  v_inspection RECORD;
  v_alert_created BOOLEAN := false;
BEGIN
  -- Insert the inspection
  INSERT INTO public.inspection_reports (
    equipment_id, technician_id, title, description, recommendation, severity
  ) VALUES (
    p_equipment_id, p_technician_id, p_title, p_description, p_recommendation, p_severity
  ) RETURNING * INTO v_inspection;

  -- Create alert if critical
  IF p_severity = 'CRITICAL' THEN
    INSERT INTO public.alerts (
      equipment_id, inspection_report_id, severity, message
    ) VALUES (
      p_equipment_id, v_inspection.id, 'CRITICAL', 'Critical inspection reported: ' || p_title
    );
    v_alert_created := true;
  END IF;

  -- Log the activity
  INSERT INTO public.activity_logs (
    user_id, action_type, entity_type, entity_id, description
  ) VALUES (
    p_technician_id, 'CREATE_INSPECTION', 'inspection_reports', v_inspection.id, p_severity || ' inspection created'
  );

  RETURN jsonb_build_object(
    'inspection', row_to_json(v_inspection),
    'alertCreated', v_alert_created
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.create_work_order_tx(
  p_equipment_id UUID,
  p_created_by UUID,
  p_assigned_to UUID,
  p_title VARCHAR,
  p_description TEXT,
  p_priority public.work_order_priority
) RETURNS jsonb AS $$
DECLARE
  v_work_order RECORD;
  v_wo_number VARCHAR;
  v_current_max VARCHAR;
  v_next_val INT;
BEGIN
  -- Generate WO number
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

  -- Insert the work order
  INSERT INTO public.work_orders (
    work_order_number, equipment_id, created_by, assigned_to, title, description, priority
  ) VALUES (
    v_wo_number, p_equipment_id, p_created_by, p_assigned_to, p_title, p_description, p_priority
  ) RETURNING * INTO v_work_order;

  -- Log the activity
  INSERT INTO public.activity_logs (
    user_id, action_type, entity_type, entity_id, description
  ) VALUES (
    p_created_by, 'CREATE_WORK_ORDER', 'work_orders', v_work_order.id, v_wo_number || ' created'
  );

  RETURN jsonb_build_object(
    'workOrder', row_to_json(v_work_order)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.update_work_order_tx(
  p_work_order_id UUID,
  p_user_id UUID,
  p_next_status public.work_order_status,
  p_completed_at TIMESTAMPTZ,
  p_current_status public.work_order_status
) RETURNS jsonb AS $$
DECLARE
  v_work_order RECORD;
BEGIN
  -- Update the work order
  UPDATE public.work_orders
  SET 
    status = p_next_status,
    completed_at = p_completed_at
  WHERE id = p_work_order_id
  RETURNING * INTO v_work_order;

  -- Log the activity
  INSERT INTO public.activity_logs (
    user_id, action_type, entity_type, entity_id, description
  ) VALUES (
    p_user_id, 'UPDATE_WORK_ORDER', 'work_orders', p_work_order_id, 'Status changed from ' || p_current_status || ' to ' || p_next_status
  );

  RETURN jsonb_build_object(
    'workOrder', row_to_json(v_work_order),
    'previousStatus', p_current_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.create_voice_transcript_tx(
  p_user_id UUID,
  p_user_prompt TEXT,
  p_session_id VARCHAR,
  p_tools_used TEXT[]
) RETURNS jsonb AS $$
DECLARE
  v_transcript RECORD;
  v_agent_response TEXT := 'Voice agent is not available yet. Your request was recorded and will be handled once Phase 3 is enabled.';
BEGIN
  -- Insert the transcript
  INSERT INTO public.transcripts (
    user_id, user_prompt, agent_response, session_id, tools_used
  ) VALUES (
    p_user_id, p_user_prompt, v_agent_response, p_session_id, p_tools_used
  ) RETURNING * INTO v_transcript;

  -- Log the activity
  INSERT INTO public.activity_logs (
    user_id, action_type, entity_type, entity_id, description
  ) VALUES (
    p_user_id, 'VOICE_QUERY', 'transcripts', v_transcript.id, 'Stored a placeholder voice query response'
  );

  RETURN jsonb_build_object(
    'placeholder', true,
    'agentResponse', v_agent_response,
    'transcriptId', v_transcript.id,
    'sessionId', p_session_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
