-- VoxField Phase 1: Auth sync — auth.users → public.users
-- UP migration

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role public.user_role;
BEGIN
  meta_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::public.user_role,
    'TECHNICIAN'::public.user_role
  );

  INSERT INTO public.users (
    id,
    email,
    full_name,
    employee_code,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'employee_code', ''),
    meta_role
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Allow authenticated users to read their own profile during signup flow
CREATE POLICY "users_insert_service"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
