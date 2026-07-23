BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS access_control_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_pin_hash text,
  ADD COLUMN IF NOT EXISTS owner_pin_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_pin_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS max_concurrent_accesses integer NOT NULL DEFAULT 1;

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_max_concurrent_accesses_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_max_concurrent_accesses_check
  CHECK (max_concurrent_accesses BETWEEN 1 AND 100);

CREATE TABLE IF NOT EXISTS public.company_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text NOT NULL,
  pin_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  CONSTRAINT company_operators_name_check CHECK (length(trim(name)) BETWEEN 2 AND 100),
  CONSTRAINT company_operators_username_check CHECK (username ~ '^[A-Za-z0-9._-]{3,24}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS company_operators_company_username_unique
  ON public.company_operators (company_id, lower(username));

CREATE TABLE IF NOT EXISTS public.company_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  auth_session_id uuid NOT NULL UNIQUE,
  operator_id uuid REFERENCES public.company_operators(id) ON DELETE SET NULL,
  access_role text NOT NULL CHECK (access_role IN ('owner', 'operator')),
  device_id text NOT NULL,
  device_name text NOT NULL DEFAULT 'Dispositivo',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS company_access_sessions_active_idx
  ON public.company_access_sessions (company_id, last_seen_at DESC)
  WHERE revoked_at IS NULL;

ALTER TABLE public.company_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_access_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_operators, public.company_access_sessions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_auth_session_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(auth.jwt() ->> 'session_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.company_access_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies company
    WHERE company.id = auth.uid()::text
      AND company.deleted_at IS NULL
      AND (
        NOT company.access_control_enabled
        OR EXISTS (
          SELECT 1
          FROM public.company_access_sessions access_session
          WHERE access_session.company_id = company.id
            AND access_session.auth_session_id = public.current_auth_session_id()
            AND access_session.revoked_at IS NULL
            AND access_session.last_seen_at > now() - interval '10 minutes'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.company_access_is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies company
    WHERE company.id = auth.uid()::text
      AND company.deleted_at IS NULL
      AND (
        NOT company.access_control_enabled
        OR EXISTS (
          SELECT 1
          FROM public.company_access_sessions access_session
          WHERE access_session.company_id = company.id
            AND access_session.auth_session_id = public.current_auth_session_id()
            AND access_session.access_role = 'owner'
            AND access_session.revoked_at IS NULL
            AND access_session.last_seen_at > now() - interval '10 minutes'
        )
      )
  );
$$;

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
    'owner_pin_configured', company_record.owner_pin_hash IS NOT NULL,
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

CREATE OR REPLACE FUNCTION public.enable_company_team_access(
  p_owner_pin text,
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
  IF p_owner_pin !~ '^\d{6}$' THEN RAISE EXCEPTION 'O PIN do responsável deve ter 6 números'; END IF;
  IF jwt_session_id IS NULL THEN RAISE EXCEPTION 'Não foi possível identificar esta sessão'; END IF;

  UPDATE public.companies SET
    owner_pin_hash = extensions.crypt(p_owner_pin, extensions.gen_salt('bf')),
    owner_pin_failed_attempts = 0,
    owner_pin_locked_until = NULL,
    access_control_enabled = true
  WHERE id = company_record.id;

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
  IF p_pin !~ '^\d{6}$' THEN RETURN jsonb_build_object('success', false, 'message', 'Informe um PIN com 6 números.'); END IF;

  UPDATE public.company_access_sessions SET revoked_at = coalesce(revoked_at, now())
  WHERE company_id = company_record.id AND revoked_at IS NULL AND last_seen_at <= now() - interval '10 minutes';

  IF p_mode = 'owner' THEN
    IF company_record.owner_pin_locked_until IS NOT NULL AND company_record.owner_pin_locked_until > now() THEN
      RETURN jsonb_build_object('success', false, 'message', 'Acesso temporariamente bloqueado. Aguarde 15 minutos.');
    END IF;
    IF company_record.owner_pin_hash IS NULL OR extensions.crypt(p_pin, company_record.owner_pin_hash) <> company_record.owner_pin_hash THEN
      attempt_count := company_record.owner_pin_failed_attempts + 1;
      UPDATE public.companies SET
        owner_pin_failed_attempts = CASE WHEN attempt_count >= 5 THEN 0 ELSE attempt_count END,
        owner_pin_locked_until = CASE WHEN attempt_count >= 5 THEN now() + interval '15 minutes' ELSE NULL END
      WHERE id = company_record.id;
      RETURN jsonb_build_object('success', false, 'message', CASE WHEN attempt_count >= 5 THEN 'Acesso bloqueado por 15 minutos após várias tentativas.' ELSE 'PIN do responsável incorreto.' END);
    END IF;
    UPDATE public.companies SET owner_pin_failed_attempts = 0, owner_pin_locked_until = NULL WHERE id = company_record.id;
    selected_role := 'owner';
  ELSIF p_mode = 'operator' THEN
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

CREATE OR REPLACE FUNCTION public.heartbeat_company_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_access_sessions SET last_seen_at = now()
  WHERE company_id = auth.uid()::text
    AND auth_session_id = public.current_auth_session_id()
    AND revoked_at IS NULL
    AND last_seen_at > now() - interval '10 minutes';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_company_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE session_uuid uuid := public.current_auth_session_id();
BEGIN
  UPDATE public.company_access_sessions SET revoked_at = coalesce(revoked_at, now())
  WHERE company_id = auth.uid()::text AND auth_session_id = session_uuid;
  DELETE FROM public.push_subscriptions WHERE user_id = auth.uid()::text AND auth_session_id = session_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_company_operators()
RETURNS TABLE (
  id uuid, name text, username text, active boolean, created_at timestamptz, disabled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.company_access_is_owner() THEN RAISE EXCEPTION 'Somente o responsável pode administrar a equipe'; END IF;
  RETURN QUERY SELECT operator.id, operator.name, operator.username, operator.active, operator.created_at, operator.disabled_at
  FROM public.company_operators operator WHERE operator.company_id = auth.uid()::text ORDER BY operator.active DESC, operator.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_company_operator(
  p_name text,
  p_username text,
  p_pin text,
  p_operator_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE saved_id uuid;
BEGIN
  IF NOT public.company_access_is_owner() THEN RAISE EXCEPTION 'Somente o responsável pode administrar a equipe'; END IF;
  IF length(trim(p_name)) < 2 THEN RAISE EXCEPTION 'Informe o nome da pessoa'; END IF;
  IF trim(p_username) !~ '^[A-Za-z0-9._-]{3,24}$' THEN RAISE EXCEPTION 'O usuário deve ter entre 3 e 24 caracteres, usando letras, números, ponto, hífen ou sublinhado'; END IF;
  IF p_pin !~ '^\d{6}$' THEN RAISE EXCEPTION 'O PIN deve ter 6 números'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.company_operators
    WHERE company_id = auth.uid()::text AND lower(username) = lower(trim(p_username)) AND id IS DISTINCT FROM p_operator_id
  ) THEN RAISE EXCEPTION 'Este nome de usuário já está em uso'; END IF;

  IF p_operator_id IS NULL THEN
    INSERT INTO public.company_operators (company_id, name, username, pin_hash)
    VALUES (auth.uid()::text, trim(p_name), upper(trim(p_username)), extensions.crypt(p_pin, extensions.gen_salt('bf')))
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.company_operators SET
      name = trim(p_name), username = upper(trim(p_username)),
      pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
      active = true, disabled_at = NULL, failed_attempts = 0, locked_until = NULL, updated_at = now()
    WHERE id = p_operator_id AND company_id = auth.uid()::text
    RETURNING id INTO saved_id;
    IF saved_id IS NULL THEN RAISE EXCEPTION 'Usuário da equipe não encontrado'; END IF;
  END IF;
  RETURN jsonb_build_object('success', true, 'id', saved_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.disable_company_operator(p_operator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.company_access_is_owner() THEN RAISE EXCEPTION 'Somente o responsável pode administrar a equipe'; END IF;
  UPDATE public.company_operators SET active = false, disabled_at = now(), updated_at = now()
  WHERE id = p_operator_id AND company_id = auth.uid()::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuário da equipe não encontrado'; END IF;
  DELETE FROM public.push_subscriptions subscription
  USING public.company_access_sessions access_session
  WHERE access_session.operator_id = p_operator_id AND subscription.auth_session_id = access_session.auth_session_id;
  UPDATE public.company_access_sessions SET revoked_at = coalesce(revoked_at, now())
  WHERE operator_id = p_operator_id AND company_id = auth.uid()::text AND revoked_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_company_access_sessions()
RETURNS TABLE (
  id uuid, access_role text, operator_name text, device_name text, created_at timestamptz, last_seen_at timestamptz, current_session boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.company_access_is_owner() THEN RAISE EXCEPTION 'Somente o responsável pode administrar os acessos'; END IF;
  UPDATE public.company_access_sessions SET revoked_at = coalesce(revoked_at, now())
  WHERE company_id = auth.uid()::text AND revoked_at IS NULL AND last_seen_at <= now() - interval '10 minutes';
  RETURN QUERY
  SELECT access_session.id, access_session.access_role, operator.name, access_session.device_name,
    access_session.created_at, access_session.last_seen_at,
    access_session.auth_session_id = public.current_auth_session_id()
  FROM public.company_access_sessions access_session
  LEFT JOIN public.company_operators operator ON operator.id = access_session.operator_id
  WHERE access_session.company_id = auth.uid()::text AND access_session.revoked_at IS NULL
  ORDER BY access_session.last_seen_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_company_access_session(p_access_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target_auth_session uuid;
BEGIN
  IF NOT public.company_access_is_owner() THEN RAISE EXCEPTION 'Somente o responsável pode encerrar acessos'; END IF;
  UPDATE public.company_access_sessions SET revoked_at = coalesce(revoked_at, now())
  WHERE id = p_access_session_id AND company_id = auth.uid()::text
  RETURNING auth_session_id INTO target_auth_session;
  IF target_auth_session IS NULL THEN RAISE EXCEPTION 'Acesso não encontrado'; END IF;
  DELETE FROM public.push_subscriptions WHERE user_id = auth.uid()::text AND auth_session_id = target_auth_session;
END;
$$;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS auth_session_id uuid,
  ADD COLUMN IF NOT EXISTS company_operator_id uuid REFERENCES public.company_operators(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.assign_push_access_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE access_record public.company_access_sessions%ROWTYPE;
BEGIN
  NEW.auth_session_id := public.current_auth_session_id();
  IF EXISTS (SELECT 1 FROM public.companies WHERE id = auth.uid()::text) THEN
    SELECT * INTO access_record FROM public.company_access_sessions
    WHERE company_id = auth.uid()::text AND auth_session_id = public.current_auth_session_id()
      AND revoked_at IS NULL AND last_seen_at > now() - interval '10 minutes';
    NEW.company_operator_id := access_record.operator_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_push_access_context_trigger ON public.push_subscriptions;
CREATE TRIGGER assign_push_access_context_trigger
BEFORE INSERT OR UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.assign_push_access_context();

DROP POLICY IF EXISTS companies_update_own ON public.companies;
CREATE POLICY companies_update_own ON public.companies FOR UPDATE TO authenticated
USING (id = auth.uid()::text AND public.company_access_is_owner())
WITH CHECK (id = auth.uid()::text AND public.company_access_is_owner());

ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS handled_by_operator_id uuid REFERENCES public.company_operators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handled_by_operator_name text;

CREATE OR REPLACE FUNCTION public.save_company_response(p_procura_id text, p_response jsonb)
RETURNS responses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_record companies%ROWTYPE;
  saved responses%ROWTYPE;
  response_status text := p_response ->> 'status';
  operator_record public.company_operators%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  SELECT * INTO company_record FROM companies WHERE id = auth.uid()::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'Apenas empresas podem responder'; END IF;
  IF NOT public.company_access_is_active() THEN RAISE EXCEPTION 'Este acesso não está mais ativo'; END IF;
  SELECT operator.* INTO operator_record
  FROM public.company_access_sessions access_session
  JOIN public.company_operators operator ON operator.id = access_session.operator_id
  WHERE access_session.company_id = company_record.id AND access_session.auth_session_id = public.current_auth_session_id()
    AND access_session.revoked_at IS NULL AND access_session.last_seen_at > now() - interval '10 minutes';
  IF NOT EXISTS (SELECT 1 FROM procuras WHERE id = p_procura_id AND status = 'active') THEN RAISE EXCEPTION 'A procura não está ativa'; END IF;
  IF response_status NOT IN ('available', 'unavailable') THEN RAISE EXCEPTION 'Status de resposta inválido'; END IF;

  INSERT INTO responses (
    id, procura_id, company_id, company_name, response_date, status, price, message,
    part_condition, part_type, photo_url, cnpj, address, location, is_read_by_user, is_read_by_company,
    handled_by_operator_id, handled_by_operator_name
  ) VALUES (
    coalesce(nullif(p_response ->> 'id', ''), gen_random_uuid()::text), p_procura_id, auth.uid()::text,
    company_record.name, now(), response_status, nullif(p_response ->> 'price', '')::numeric,
    left(coalesce(p_response ->> 'message', ''), 5000), nullif(p_response ->> 'part_condition', ''),
    nullif(p_response ->> 'part_type', ''), nullif(p_response ->> 'photo_url', ''), company_record.cnpj,
    company_record.address, nullif(p_response ->> 'location', ''), false, true,
    operator_record.id, operator_record.name
  )
  ON CONFLICT (procura_id, company_id) DO UPDATE SET
    company_name = excluded.company_name, response_date = excluded.response_date, status = excluded.status,
    price = excluded.price, message = excluded.message, part_condition = excluded.part_condition,
    part_type = excluded.part_type, photo_url = excluded.photo_url, cnpj = excluded.cnpj,
    address = excluded.address, location = excluded.location, is_read_by_user = false,
    is_read_by_company = true, handled_by_operator_id = excluded.handled_by_operator_id,
    handled_by_operator_name = excluded.handled_by_operator_name
  RETURNING * INTO saved;
  RETURN saved;
END;
$$;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_operator_id uuid REFERENCES public.company_operators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_operator_name text;

CREATE OR REPLACE FUNCTION public.assign_message_operator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.companies WHERE id = auth.uid()::text) THEN
    SELECT operator.id, operator.name INTO NEW.sender_operator_id, NEW.sender_operator_name
    FROM public.company_access_sessions access_session
    JOIN public.company_operators operator ON operator.id = access_session.operator_id
    WHERE access_session.company_id = auth.uid()::text
      AND access_session.auth_session_id = public.current_auth_session_id()
      AND access_session.revoked_at IS NULL AND access_session.last_seen_at > now() - interval '10 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_message_operator_trigger ON public.messages;
CREATE TRIGGER assign_message_operator_trigger BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.assign_message_operator();

DROP POLICY IF EXISTS responses_read_relevant ON public.responses;
CREATE POLICY responses_read_relevant ON public.responses FOR SELECT TO authenticated
USING (
  (company_id = auth.uid()::text AND public.company_access_is_active())
  OR EXISTS (SELECT 1 FROM public.procuras WHERE procuras.id = responses.procura_id AND procuras.user_id = auth.uid()::text)
);
DROP POLICY IF EXISTS responses_update_company ON public.responses;
CREATE POLICY responses_update_company ON public.responses FOR UPDATE TO authenticated
USING (company_id = auth.uid()::text AND public.company_access_is_active())
WITH CHECK (company_id = auth.uid()::text AND public.company_access_is_active());

DROP POLICY IF EXISTS procuras_read_relevant ON public.procuras;
CREATE POLICY procuras_read_relevant ON public.procuras FOR SELECT TO authenticated
USING (
  user_id = auth.uid()::text
  OR (
    public.company_access_is_active()
    AND public.company_can_view_procura(id, locations, vehicle_type, search_latitude, search_longitude, search_radius_km)
  )
);

DROP POLICY IF EXISTS part_photos_company_insert ON storage.objects;
CREATE POLICY part_photos_company_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'part-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.companies WHERE companies.id = auth.uid()::text)
  AND public.company_access_is_active()
);

DROP POLICY IF EXISTS part_photos_company_update ON storage.objects;
CREATE POLICY part_photos_company_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'part-photos' AND owner_id = auth.uid()::text AND public.company_access_is_active())
WITH CHECK (bucket_id = 'part-photos' AND owner_id = auth.uid()::text AND public.company_access_is_active());

DROP POLICY IF EXISTS part_photos_company_delete ON storage.objects;
CREATE POLICY part_photos_company_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'part-photos' AND owner_id = auth.uid()::text AND public.company_access_is_active());

DROP POLICY IF EXISTS chat_images_insert_own ON storage.objects;
CREATE POLICY chat_images_insert_own ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    NOT EXISTS (SELECT 1 FROM public.companies WHERE companies.id = auth.uid()::text)
    OR public.company_access_is_active()
  )
);

DROP POLICY IF EXISTS chat_images_read_participant ON storage.objects;
CREATE POLICY chat_images_read_participant ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (NOT EXISTS (SELECT 1 FROM public.companies WHERE companies.id = auth.uid()::text) OR public.company_access_is_active())
  AND EXISTS (
    SELECT 1 FROM public.messages
    WHERE messages.image_path = storage.objects.name
      AND (messages.sender_id = auth.uid()::text OR messages.receiver_id = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS chat_images_delete_own ON storage.objects;
CREATE POLICY chat_images_delete_own ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-images' AND owner_id = auth.uid()::text
  AND (NOT EXISTS (SELECT 1 FROM public.companies WHERE companies.id = auth.uid()::text) OR public.company_access_is_active())
);

DROP POLICY IF EXISTS messages_read_participant ON public.messages;
CREATE POLICY messages_read_participant ON public.messages FOR SELECT TO authenticated
USING (
  (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text)
  AND (NOT EXISTS (SELECT 1 FROM public.companies WHERE id = auth.uid()::text) OR public.company_access_is_active())
);
DROP POLICY IF EXISTS messages_insert_participant ON public.messages;
CREATE POLICY messages_insert_participant ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()::text
  AND procura_id IS NOT NULL
  AND chat_id = least(sender_id, receiver_id) || '::' || greatest(sender_id, receiver_id) || '::' || procura_id
  AND (
    (
      EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid()::text)
      AND EXISTS (SELECT 1 FROM public.procuras WHERE id = messages.procura_id AND user_id = auth.uid()::text)
      AND EXISTS (SELECT 1 FROM public.responses WHERE procura_id = messages.procura_id AND company_id = messages.receiver_id AND status = 'available')
    )
    OR (
      EXISTS (SELECT 1 FROM public.companies WHERE id = auth.uid()::text)
      AND public.company_access_is_active()
      AND public.buyer_started_chat(messages.chat_id, auth.uid()::text, messages.receiver_id)
    )
  )
);
DROP POLICY IF EXISTS messages_mark_received ON public.messages;
CREATE POLICY messages_mark_received ON public.messages FOR UPDATE TO authenticated
USING (
  receiver_id = auth.uid()::text
  AND (NOT EXISTS (SELECT 1 FROM public.companies WHERE id = auth.uid()::text) OR public.company_access_is_active())
)
WITH CHECK (
  receiver_id = auth.uid()::text
  AND (NOT EXISTS (SELECT 1 FROM public.companies WHERE id = auth.uid()::text) OR public.company_access_is_active())
);

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
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF NOT public.company_access_is_owner() THEN RAISE EXCEPTION 'Somente o responsável pode excluir a empresa'; END IF;
  UPDATE public.companies SET
    deleted_at = now(), email = 'deleted+' || caller_id::text || '@deleted.procuroprati.invalid',
    phone = NULL, whatsapp = NULL, cnpj = NULL, address = NULL, address_number = NULL,
    postal_code = NULL, latitude = NULL, longitude = NULL, serves_locations = '[]'::jsonb,
    access_history = '[]'::jsonb, validation_status = 'deleted', validation_reason = 'Conta excluída pelo titular'
  WHERE id = caller_id::text AND deleted_at IS NULL RETURNING id INTO deleted_company_id;
  IF deleted_company_id IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada ou já excluída'; END IF;
  DELETE FROM public.push_subscriptions WHERE user_id = caller_id::text;
  DELETE FROM auth.users WHERE id = caller_id;
  RETURN jsonb_build_object('success', true, 'company_id', deleted_company_id);
END;
$$;

REVOKE ALL ON FUNCTION public.current_auth_session_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.company_access_is_active() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.company_access_is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_auth_session_id(), public.company_access_is_active(), public.company_access_is_owner() TO authenticated;
REVOKE ALL ON FUNCTION public.get_company_access_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enable_company_team_access(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_company_access(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.heartbeat_company_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_company_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_company_operators() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_company_operator(text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.disable_company_operator(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_company_access_sessions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_company_access_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_access_context(), public.enable_company_team_access(text, text, text),
  public.claim_company_access(text, text, text, text, text), public.heartbeat_company_access(),
  public.release_company_access(), public.list_company_operators(), public.save_company_operator(text, text, text, uuid),
  public.disable_company_operator(uuid), public.list_company_access_sessions(), public.revoke_company_access_session(uuid)
TO authenticated;

COMMIT;
