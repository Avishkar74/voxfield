-- DOWN migration

DROP FUNCTION IF EXISTS public.create_inspection_tx;
DROP FUNCTION IF EXISTS public.create_work_order_tx;
DROP FUNCTION IF EXISTS public.update_work_order_tx;
DROP FUNCTION IF EXISTS public.create_voice_transcript_tx;
