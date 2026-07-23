BEGIN;

-- O responsável (dono da empresa) passa a ocupar uma vaga de acesso simultâneo
-- sem precisar criar/confirmar um PIN: quem já entrou com o login principal da
-- empresa é, por definição, o responsável. O PIN continua obrigatório apenas
-- para colaboradores, que não têm o login principal.

DROP FUNCTION IF EXISTS public.enable_company_team_access(text, text, text);
CREATE FUNCTION public.enable_company_team_access(
  p_device_id text,
  p_device_name text DEFAULT 'Dispositivo do responsável'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  company_record public.companies%ROWTYPE;
  jwt_session_id uuid := public.current_auth_session_id();
BEGIN
  SELECT * INTO company_record FROM public.companies WHERE id = auth.uid()::text AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Apenas empresas podem configurar uma equipe'; END IF;
  IF company_record.access_control_enabled AND NOT public.company_access_is_owner() THEN
    RAISE EXCEPTION 'Somente o responsável pode alterar os acessos';
  END IF;
  IF jwt_session_id IS NULL THEN RAISE EXCEPTION 'Não foi possível identificar esta sessão'; END IF;

  UPDATE public.companies SET access_control_enabled = true WHERE id = company_record.id;

  INSERT INTO public.company_access_sessions (
    company_id, auth_session_id, operator_id, access_role, device_id, device_name, last_seen_at, revoked_at
  ) VALUES (
    company_record.id, jwt_session_id, NULL, 'owner', left(p_device_id, 200), left(coalesce(nullif(p_device_name, ''), 'Dispositivo do responsável'), 200), now(), NULL
  )
  ON CONFLICT (auth_session_id) DO UPDATE SET
    company_id = excluded.company_id, operator_id = NULL, access_role = 'owner',
    device_id = excluded.device_id, device_name = excluded.device_name, last_seen_at = now(), revoked_at = NULL;

  RETURN jsonb_build_object('success', true, 'role', 'owner');
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_company_access(
  p_mode text,
  p_username text,
  p_pin text,
  p_device_id text,
  p_device_name text DEFAULT 'Dispositivo'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  company_record public.companies%ROWTYPE;
  operator_record public.company_operators%ROWTYPE;
  jwt_session_id uuid := public.current_auth_session_id();
  selected_operator_id uuid;
  selected_role text;
  active_count integer;
  attempt_count integer;
BEGIN
  SELECT * INTO company_record FROM public.companies WHERE id = auth.uid()::text AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Empresa não encontrada.'); END IF;
  IF NOT company_record.access_control_enabled THEN RETURN jsonb_build_object('success', true, 'role', 'owner', 'legacy', true); END IF;
  IF jwt_session_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Não foi possível identificar esta sessão.'); END IF;

  UPDATE public.company_access_sessions SET revoked_at = coalesce(revoked_at, now())
  WHERE company_id = company_record.id AND revoked_at IS NULL AND last_seen_at <= now() - interval '10 minutes';

  IF p_mode = 'owner' THEN
    -- Quem chegou até aqui autenticado como esta empresa já é o responsável:
    -- não pedimos PIN, só carimbamos a sessão como 'owner'.
    selected_role := 'owner';
  ELSIF p_mode = 'operator' THEN
    IF p_pin !~ '^\d{6}$' THEN RETURN jsonb_build_object('success', false, 'message', 'Informe um PIN com 6 números.'); END IF;
    SELECT * INTO operator_record FROM public.company_operators
    WHERE company_id = company_record.id AND lower(username) = lower(trim(p_username)) AND active = true FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Usuário ou PIN incorreto.'); END IF;
    IF operator_record.locked_until IS NOT NULL AND operator_record.locked_until > now() THEN
      RETURN jsonb_build_object('success', false, 'message', 'Acesso temporariamente bloqueado. Aguarde 15 minutos.');
    END IF;
    IF extensions.crypt(p_pin, operator_record.pin_hash) <> operator_record.pin_hash THEN
      attempt_count := operator_record.failed_attempts + 1;
      UPDATE public.company_operators SET
        failed_attempts = CASE WHEN attempt_count >= 5 THEN 0 ELSE attempt_count END,
        locked_until = CASE WHEN attempt_count >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
        updated_at = now()
      WHERE id = operator_record.id;
      RETURN jsonb_build_object('success', false, 'message', CASE WHEN attempt_count >= 5 THEN 'Acesso bloqueado por 15 minutos após várias tentativas.' ELSE 'Usuário ou PIN incorreto.' END);
    END IF;
    UPDATE public.company_operators SET failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = operator_record.id;
    selected_role := 'operator';
    selected_operator_id := operator_record.id;
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Tipo de acesso inválido.');
  END IF;

  SELECT count(*) INTO active_count
  FROM public.company_access_sessions
  WHERE company_id = company_record.id
    AND revoked_at IS NULL
    AND last_seen_at > now() - interval '10 minutes'
    AND auth_session_id <> jwt_session_id;
  IF active_count >= company_record.max_concurrent_accesses THEN
    RETURN jsonb_build_object(
      'success', false,
      'limit_reached', true,
      'message', 'O limite de acessos simultâneos do plano foi atingido.',
      'max_concurrent_accesses', company_record.max_concurrent_accesses
    );
  END IF;

  INSERT INTO public.company_access_sessions (
    company_id, auth_session_id, operator_id, access_role, device_id, device_name, last_seen_at, revoked_at
  ) VALUES (
    company_record.id, jwt_session_id, selected_operator_id, selected_role,
    left(p_device_id, 200), left(coalesce(nullif(p_device_name, ''), 'Dispositivo'), 200), now(), NULL
  )
  ON CONFLICT (auth_session_id) DO UPDATE SET
    company_id = excluded.company_id, operator_id = excluded.operator_id, access_role = excluded.access_role,
    device_id = excluded.device_id, device_name = excluded.device_name, last_seen_at = now(), revoked_at = NULL;

  RETURN jsonb_build_object(
    'success', true, 'role', selected_role, 'operator_id', selected_operator_id,
    'operator_name', operator_record.name, 'max_concurrent_accesses', company_record.max_concurrent_accesses
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enable_company_team_access(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enable_company_team_access(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
