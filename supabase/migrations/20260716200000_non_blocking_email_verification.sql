BEGIN;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

UPDATE public.users profile
SET email_verified_at = auth_user.email_confirmed_at
FROM auth.users auth_user
WHERE profile.id = auth_user.id::text
  AND profile.email_verified_at IS NULL
  AND auth_user.email_confirmed_at IS NOT NULL;

UPDATE public.companies profile
SET email_verified_at = auth_user.email_confirmed_at
FROM auth.users auth_user
WHERE profile.id = auth_user.id::text
  AND profile.email_verified_at IS NULL
  AND auth_user.email_confirmed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.confirm_own_email()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confirmed_at timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;

  UPDATE users SET email_verified_at = coalesce(email_verified_at, confirmed_at) WHERE id = auth.uid()::text;
  IF FOUND THEN
    SELECT email_verified_at INTO confirmed_at FROM users WHERE id = auth.uid()::text;
    RETURN confirmed_at;
  END IF;

  UPDATE companies SET email_verified_at = coalesce(email_verified_at, confirmed_at) WHERE id = auth.uid()::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;
  SELECT email_verified_at INTO confirmed_at FROM companies WHERE id = auth.uid()::text;
  RETURN confirmed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_own_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_own_email() TO authenticated;

COMMIT;
