BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS companies_active_idx ON public.companies (id) WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.company_directory
WITH (security_barrier = true)
AS SELECT id, name, phone, cnpj, address, latitude, longitude, serves_locations, validation_status, vehicle_types, created_at, location_source, postal_code, whatsapp, address_number
FROM public.companies
WHERE deleted_at IS NULL;
REVOKE ALL ON public.company_directory FROM PUBLIC;
GRANT SELECT ON public.company_directory TO authenticated;

CREATE OR REPLACE FUNCTION public.account_type_for_email(p_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(trim(p_email))) THEN 'user'
    WHEN EXISTS (SELECT 1 FROM companies WHERE deleted_at IS NULL AND lower(email) = lower(trim(p_email))) THEN 'company'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_company_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_id uuid := auth.uid();
  deleted_company_id text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;

  UPDATE public.companies
  SET deleted_at = now(),
      email = 'deleted+' || caller_id::text || '@deleted.procuroprati.invalid',
      phone = NULL,
      whatsapp = NULL,
      cnpj = NULL,
      address = NULL,
      address_number = NULL,
      postal_code = NULL,
      latitude = NULL,
      longitude = NULL,
      serves_locations = '[]'::jsonb,
      access_history = '[]'::jsonb,
      validation_status = 'deleted',
      validation_reason = 'Conta excluída pelo titular'
  WHERE id = caller_id::text AND deleted_at IS NULL
  RETURNING id INTO deleted_company_id;

  IF deleted_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada ou já excluída';
  END IF;

  DELETE FROM public.push_subscriptions WHERE user_id = caller_id::text;
  DELETE FROM auth.users WHERE id = caller_id;

  RETURN jsonb_build_object('success', true, 'company_id', deleted_company_id);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_company_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_company_account() TO authenticated;

COMMIT;
