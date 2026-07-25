BEGIN;

-- The owner-PIN flow was already removed from claim_company_access and
-- enable_company_team_access by 20260723160000_owner_access_without_pin.sql
-- (the responsible person now enters with their own login, no PIN check).
-- These columns and the owner_pin_configured field are the only leftovers.

CREATE OR REPLACE FUNCTION public.get_company_access_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_record public.companies%ROWTYPE;
  session_record public.company_access_sessions%ROWTYPE;
  operator_name text;
  active_count integer := 0;
BEGIN
  SELECT * INTO company_record FROM public.companies WHERE id = auth.uid()::text AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('is_company', false); END IF;

  UPDATE public.company_access_sessions
  SET revoked_at = coalesce(revoked_at, now())
  WHERE company_id = company_record.id AND revoked_at IS NULL AND last_seen_at <= now() - interval '10 minutes';

  SELECT * INTO session_record
  FROM public.company_access_sessions
  WHERE company_id = company_record.id
    AND auth_session_id = public.current_auth_session_id()
    AND revoked_at IS NULL
    AND last_seen_at > now() - interval '10 minutes';

  IF session_record.operator_id IS NOT NULL THEN
    SELECT name INTO operator_name FROM public.company_operators WHERE id = session_record.operator_id;
  END IF;
  SELECT count(*) INTO active_count FROM public.company_access_sessions
  WHERE company_id = company_record.id AND revoked_at IS NULL AND last_seen_at > now() - interval '10 minutes';

  RETURN jsonb_build_object(
    'is_company', true,
    'enabled', company_record.access_control_enabled,
    'max_concurrent_accesses', company_record.max_concurrent_accesses,
    'active_accesses', active_count,
    'authorized', NOT company_record.access_control_enabled OR session_record.id IS NOT NULL,
    'role', CASE WHEN NOT company_record.access_control_enabled THEN 'owner' ELSE session_record.access_role END,
    'operator_id', session_record.operator_id,
    'operator_name', operator_name,
    'session_id', session_record.id
  );
END;
$$;

ALTER TABLE public.companies
  DROP COLUMN IF EXISTS owner_pin_hash,
  DROP COLUMN IF EXISTS owner_pin_failed_attempts,
  DROP COLUMN IF EXISTS owner_pin_locked_until;

DROP FUNCTION IF EXISTS public.handle_new_auth_user();

NOTIFY pgrst, 'reload schema';

COMMIT;
