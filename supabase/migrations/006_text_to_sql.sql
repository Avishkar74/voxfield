-- VoxField Phase 6: Text-to-SQL Read-only DB Query RPC function with regex guardrails

CREATE OR REPLACE FUNCTION execute_read_only_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Strict Guardrail: Reject any query containing data modifying or schema modifying keywords
  IF query ~* '\y(insert|update|delete|drop|truncate|alter|grant|revoke|commit|rollback|create|replace)\y' THEN
    RAISE EXCEPTION 'SECURITY ERROR: Only SELECT queries are allowed.';
  END IF;

  -- Execute the query dynamically and package results as JSON
  EXECUTE 'SELECT jsonb_agg(t) FROM (' || query || ') t' INTO result;
  
  RETURN coalesce(result, '[]'::jsonb);
END;
$$;
