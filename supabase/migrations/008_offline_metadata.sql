-- UP migration

-- ---------------------------------------------------------------------------
-- Alter public.transcripts to support offline query metadata
-- ---------------------------------------------------------------------------
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS queue_duration INTEGER; -- Duration in seconds in local queue

-- ---------------------------------------------------------------------------
-- Recreate public.create_voice_transcript_tx to support offline fields
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_voice_transcript_tx(
  p_user_id UUID,
  p_user_prompt TEXT,
  p_session_id VARCHAR,
  p_tools_used TEXT[],
  p_is_offline BOOLEAN DEFAULT FALSE,
  p_captured_at TIMESTAMPTZ DEFAULT NULL,
  p_synced_at TIMESTAMPTZ DEFAULT NULL,
  p_queue_duration INTEGER DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_transcript RECORD;
  v_agent_response TEXT := 'Voice agent is not available yet. Your request was recorded and will be handled once Phase 3 is enabled.';
BEGIN
  -- Insert the transcript with offline query metadata
  INSERT INTO public.transcripts (
    user_id,
    user_prompt,
    agent_response,
    session_id,
    tools_used,
    is_offline,
    captured_at,
    synced_at,
    queue_duration
  ) VALUES (
    p_user_id,
    p_user_prompt,
    v_agent_response,
    p_session_id,
    p_tools_used,
    p_is_offline,
    COALESCE(p_captured_at, NOW()),
    p_synced_at,
    p_queue_duration
  ) RETURNING * INTO v_transcript;

  -- Log the activity
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    description
  ) VALUES (
    p_user_id,
    'VOICE_QUERY',
    'transcripts',
    v_transcript.id,
    CASE 
      WHEN p_is_offline THEN 'Stored an offline placeholder voice query response'
      ELSE 'Stored a placeholder voice query response'
    END
  );

  RETURN jsonb_build_object(
    'placeholder', true,
    'agentResponse', v_agent_response,
    'transcriptId', v_transcript.id,
    'sessionId', p_session_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
