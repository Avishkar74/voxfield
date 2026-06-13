-- DOWN migration for 003_auth_triggers.sql

DROP POLICY IF EXISTS "users_insert_service" ON public.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
