BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  monthly_price numeric(10,2) NOT NULL,
  scope text NOT NULL CHECK (scope IN ('radius', 'state', 'national')),
  radius_km integer,
  priority_level integer NOT NULL,
  visibility_delay_minutes integer NOT NULL DEFAULT 0,
  max_concurrent_accesses integer,
  response_highlight boolean NOT NULL DEFAULT false,
  fixed_response_top boolean NOT NULL DEFAULT false,
  report_level text NOT NULL DEFAULT 'none' CHECK (report_level IN ('none', 'basic', 'complete')),
  national_access boolean NOT NULL DEFAULT false,
  rare_parts_badge boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope = 'radius' AND radius_km IS NOT NULL) OR (scope <> 'radius' AND radius_km IS NULL))
);

INSERT INTO public.subscription_plans (
  code, name, monthly_price, scope, radius_km, priority_level, visibility_delay_minutes,
  max_concurrent_accesses, response_highlight, fixed_response_top, report_level,
  national_access, rare_parts_badge, featured, sort_order
) VALUES
  ('local', 'Local', 47.00, 'radius', 20, 5, 240, 1, false, false, 'none', false, false, false, 1),
  ('regional', 'Regional', 67.00, 'radius', 50, 4, 180, 1, true, false, 'none', false, false, false, 2),
  ('multiregional', 'Multirregional', 97.00, 'radius', 100, 3, 120, 3, true, false, 'basic', false, false, true, 3),
  ('estadual', 'Estadual', 147.00, 'state', NULL, 2, 60, NULL, true, true, 'complete', false, false, false, 4),
  ('nacional', 'Nacional', 297.00, 'national', NULL, 1, 0, NULL, true, true, 'complete', true, true, false, 5)
ON CONFLICT (code) DO UPDATE SET
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  scope = excluded.scope,
  radius_km = excluded.radius_km,
  priority_level = excluded.priority_level,
  visibility_delay_minutes = excluded.visibility_delay_minutes,
  max_concurrent_accesses = excluded.max_concurrent_accesses,
  response_highlight = excluded.response_highlight,
  fixed_response_top = excluded.fixed_response_top,
  report_level = excluded.report_level,
  national_access = excluded.national_access,
  rare_parts_badge = excluded.rare_parts_badge,
  featured = excluded.featured,
  sort_order = excluded.sort_order,
  updated_at = now();

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_plans_public_read ON public.subscription_plans;
CREATE POLICY subscription_plans_public_read ON public.subscription_plans
  FOR SELECT TO anon, authenticated USING (active);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (key, value)
VALUES
  ('plans_launch_at', jsonb_build_object('date', now())),
  ('rare_vehicle_age_years', '{"years":15}'::jsonb),
  ('national_no_positive_delay_days', '{"days":3}'::jsonb),
  ('trial_final_stretch', '{"days":25,"responses":25,"hard_cap_day":80}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_settings FROM anon, authenticated;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS subscription_state text NOT NULL DEFAULT 'trial_active',
  ADD COLUMN IF NOT EXISTS plan_code text REFERENCES public.subscription_plans(code),
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_min_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_hard_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_extended_until timestamptz,
  ADD COLUMN IF NOT EXISTS trial_welcome_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_summary_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_payment_status text NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS manual_plan_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_plan_indefinite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_plan_reason text,
  ADD COLUMN IF NOT EXISTS billing_pause_until timestamptz,
  ADD COLUMN IF NOT EXISTS billing_pause_reason text;

ALTER TABLE public.company_operators
  ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_subscription_state_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_subscription_state_check
  CHECK (subscription_state IN ('trial_active', 'trial_ended', 'subscriber_active', 'past_due', 'canceled'));

CREATE TABLE IF NOT EXISTS public.company_trial_registry (
  cnpj text PRIMARY KEY,
  first_company_id text NOT NULL,
  first_trial_started_at timestamptz NOT NULL,
  trial_consumed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_trial_registry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_trial_registry FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.company_entitlement_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('trial_extension', 'manual_plan', 'billing_pause', 'plan_change', 'subscription_cancel')),
  plan_code text REFERENCES public.subscription_plans(code),
  reason text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  indefinite boolean NOT NULL DEFAULT false,
  no_charge boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_entitlement_adjustments_company_idx
  ON public.company_entitlement_adjustments (company_id, created_at DESC);
ALTER TABLE public.company_entitlement_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_entitlement_adjustments FROM anon, authenticated;

DO $$
DECLARE launch_at timestamptz;
BEGIN
  SELECT (value ->> 'date')::timestamptz INTO launch_at
  FROM public.platform_settings WHERE key = 'plans_launch_at';
  launch_at := coalesce(launch_at, now());

  UPDATE public.companies
  SET trial_started_at = coalesce(trial_started_at, launch_at),
      trial_min_ends_at = coalesce(trial_min_ends_at, launch_at + interval '30 days'),
      trial_hard_ends_at = coalesce(trial_hard_ends_at, launch_at + interval '90 days')
  WHERE deleted_at IS NULL;

  INSERT INTO public.company_trial_registry (cnpj, first_company_id, first_trial_started_at)
  SELECT regexp_replace(upper(cnpj), '[^A-Z0-9]', '', 'g'), id, coalesce(trial_started_at, launch_at)
  FROM public.companies
  WHERE nullif(regexp_replace(upper(coalesce(cnpj, '')), '[^A-Z0-9]', '', 'g'), '') IS NOT NULL
  ON CONFLICT (cnpj) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.initialize_company_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE normalized_cnpj text := regexp_replace(upper(coalesce(NEW.cnpj, '')), '[^A-Z0-9]', '', 'g');
DECLARE trial_used boolean := false;
BEGIN
  IF normalized_cnpj <> '' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.company_trial_registry registry
      WHERE registry.cnpj = normalized_cnpj AND registry.trial_consumed
    ) INTO trial_used;
  END IF;

  NEW.trial_started_at := coalesce(NEW.trial_started_at, now());
  NEW.trial_min_ends_at := coalesce(NEW.trial_min_ends_at, NEW.trial_started_at + interval '30 days');
  NEW.trial_hard_ends_at := coalesce(NEW.trial_hard_ends_at, NEW.trial_started_at + interval '90 days');
  NEW.subscription_state := CASE WHEN trial_used THEN 'trial_ended' ELSE coalesce(NEW.subscription_state, 'trial_active') END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS initialize_company_trial_trigger ON public.companies;
CREATE TRIGGER initialize_company_trial_trigger
BEFORE INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.initialize_company_trial();

CREATE OR REPLACE FUNCTION public.register_company_trial_cnpj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE normalized_cnpj text := regexp_replace(upper(coalesce(NEW.cnpj, '')), '[^A-Z0-9]', '', 'g');
BEGIN
  IF normalized_cnpj <> '' THEN
    INSERT INTO public.company_trial_registry (cnpj, first_company_id, first_trial_started_at)
    VALUES (normalized_cnpj, NEW.id, coalesce(NEW.trial_started_at, now()))
    ON CONFLICT (cnpj) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS register_company_trial_cnpj_trigger ON public.companies;
CREATE TRIGGER register_company_trial_cnpj_trigger
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.register_company_trial_cnpj();

CREATE OR REPLACE FUNCTION public.sync_company_plan_access_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE plan_limit integer;
BEGIN
  IF NEW.plan_code IS NULL THEN
    NEW.max_concurrent_accesses := 1;
    RETURN NEW;
  END IF;
  SELECT max_concurrent_accesses INTO plan_limit
  FROM public.subscription_plans WHERE code = NEW.plan_code;
  NEW.max_concurrent_accesses := least(100, coalesce(plan_limit, 100));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_company_plan_access_limit_trigger ON public.companies;
CREATE TRIGGER sync_company_plan_access_limit_trigger
BEFORE INSERT OR UPDATE OF plan_code ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.sync_company_plan_access_limit();

CREATE OR REPLACE VIEW public.company_directory
WITH (security_barrier = true)
AS SELECT
  id, name, phone, cnpj, address, latitude, longitude, serves_locations,
  validation_status, vehicle_types, created_at, location_source, postal_code,
  whatsapp, address_number, plan_code, subscription_state
FROM public.companies
WHERE deleted_at IS NULL;
REVOKE ALL ON public.company_directory FROM PUBLIC;
GRANT SELECT ON public.company_directory TO authenticated;

DROP FUNCTION IF EXISTS public.list_company_operators();
CREATE FUNCTION public.list_company_operators()
RETURNS TABLE (
  id uuid, name text, username text, contact_email text, active boolean,
  created_at timestamptz, disabled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.company_access_is_owner() THEN RAISE EXCEPTION 'Somente o responsável pode administrar a equipe'; END IF;
  RETURN QUERY
    SELECT operator.id, operator.name, operator.username, operator.contact_email,
      operator.active, operator.created_at, operator.disabled_at
    FROM public.company_operators operator
    WHERE operator.company_id = auth.uid()::text
    ORDER BY operator.active DESC, operator.name;
END;
$$;

DROP FUNCTION IF EXISTS public.save_company_operator(text, text, text, uuid);
CREATE FUNCTION public.save_company_operator(
  p_name text,
  p_username text,
  p_pin text,
  p_contact_email text,
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
  IF trim(p_username) !~ '^[a-z0-9._-]{3,24}$' THEN RAISE EXCEPTION 'O usuário deve ter entre 3 e 24 caracteres, usando letras, números, ponto, hífen ou sublinhado'; END IF;
  IF p_pin !~ '^\d{6}$' THEN RAISE EXCEPTION 'O PIN deve ter 6 números'; END IF;
  IF trim(coalesce(p_contact_email, '')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN RAISE EXCEPTION 'Informe um email válido para enviar os dados de acesso'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.company_operators
    WHERE company_id = auth.uid()::text AND lower(username) = lower(trim(p_username)) AND id IS DISTINCT FROM p_operator_id
  ) THEN RAISE EXCEPTION 'Este nome de usuário já está em uso'; END IF;

  IF p_operator_id IS NULL THEN
    INSERT INTO public.company_operators (company_id, name, username, contact_email, pin_hash)
    VALUES (auth.uid()::text, trim(p_name), lower(trim(p_username)), lower(trim(p_contact_email)), extensions.crypt(p_pin, extensions.gen_salt('bf')))
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.company_operators SET
      name = trim(p_name), username = lower(trim(p_username)), contact_email = lower(trim(p_contact_email)),
      pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
      active = true, disabled_at = NULL, failed_attempts = 0, locked_until = NULL, updated_at = now()
    WHERE id = p_operator_id AND company_id = auth.uid()::text
    RETURNING id INTO saved_id;
    IF saved_id IS NULL THEN RAISE EXCEPTION 'Usuário da equipe não encontrado'; END IF;
  END IF;
  RETURN jsonb_build_object('success', true, 'id', saved_id, 'username', lower(trim(p_username)));
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_company_collaborator_login(
  p_cnpj text,
  p_username text,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE company_record public.companies%ROWTYPE;
DECLARE operator_record public.company_operators%ROWTYPE;
DECLARE normalized_cnpj text := regexp_replace(upper(coalesce(p_cnpj, '')), '[^A-Z0-9]', '', 'g');
DECLARE attempt_count integer;
BEGIN
  SELECT * INTO company_record
  FROM public.companies
  WHERE deleted_at IS NULL
    AND regexp_replace(upper(coalesce(cnpj, '')), '[^A-Z0-9]', '', 'g') = normalized_cnpj
  LIMIT 1;
  IF NOT FOUND OR NOT company_record.access_control_enabled THEN
    RETURN jsonb_build_object('success', false, 'message', 'CNPJ, usuário ou PIN incorreto.');
  END IF;
  SELECT * INTO operator_record
  FROM public.company_operators
  WHERE company_id = company_record.id
    AND lower(username) = lower(trim(p_username))
    AND active = true
  FOR UPDATE;
  IF NOT FOUND OR operator_record.locked_until > now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'CNPJ, usuário ou PIN incorreto.');
  END IF;
  IF p_pin !~ '^\d{6}$' OR extensions.crypt(p_pin, operator_record.pin_hash) <> operator_record.pin_hash THEN
    attempt_count := operator_record.failed_attempts + 1;
    UPDATE public.company_operators SET
      failed_attempts = CASE WHEN attempt_count >= 5 THEN 0 ELSE attempt_count END,
      locked_until = CASE WHEN attempt_count >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
      updated_at = now()
    WHERE id = operator_record.id;
    RETURN jsonb_build_object('success', false, 'message', CASE WHEN attempt_count >= 5 THEN 'Acesso bloqueado por 15 minutos.' ELSE 'CNPJ, usuário ou PIN incorreto.' END);
  END IF;
  UPDATE public.company_operators SET failed_attempts = 0, locked_until = NULL, updated_at = now()
  WHERE id = operator_record.id;
  RETURN jsonb_build_object(
    'success', true,
    'company_id', company_record.id,
    'company_email', company_record.email,
    'operator_id', operator_record.id,
    'operator_name', operator_record.name,
    'username', operator_record.username
  );
END;
$$;

ALTER TABLE public.procuras
  ADD COLUMN IF NOT EXISTS is_rare_part boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS part_catalog_id bigint REFERENCES public.part_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS part_name_original text;

ALTER TABLE public.part_catalog
  ADD COLUMN IF NOT EXISTS primary_category text,
  ADD COLUMN IF NOT EXISTS secondary_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

UPDATE public.part_catalog
SET primary_category = coalesce(primary_category, category_name)
WHERE primary_category IS NULL;

CREATE TABLE IF NOT EXISTS public.part_catalog_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_term text NOT NULL UNIQUE,
  latest_term text NOT NULL,
  sample_terms text[] NOT NULL DEFAULT '{}',
  occurrences integer NOT NULL DEFAULT 1,
  vehicle_types text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'linked', 'ignored', 'blocked')),
  linked_part_id bigint REFERENCES public.part_catalog(id) ON DELETE SET NULL,
  suggested_category text,
  admin_notes text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS part_catalog_submissions_status_idx
  ON public.part_catalog_submissions (status, occurrences DESC, last_seen_at DESC);
ALTER TABLE public.part_catalog_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.part_catalog_submissions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.capture_procura_part_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE normalized text := public.normalize_catalog_text(NEW.part_name);
DECLARE matched_id bigint;
BEGIN
  NEW.part_name_original := coalesce(NEW.part_name_original, NEW.part_name);

  SELECT catalog.id INTO matched_id
  FROM public.part_catalog catalog
  WHERE catalog.active AND catalog.is_searchable
    AND (
      catalog.normalized_name = normalized
      OR EXISTS (
        SELECT 1 FROM unnest(catalog.aliases) alias_name
        WHERE public.normalize_catalog_text(alias_name) = normalized
      )
    )
  ORDER BY catalog.admin_locked DESC, catalog.id
  LIMIT 1;

  NEW.part_catalog_id := matched_id;
  IF matched_id IS NULL AND normalized <> '' THEN
    INSERT INTO public.part_catalog_submissions (
      normalized_term, latest_term, sample_terms, occurrences, vehicle_types
    ) VALUES (
      normalized, NEW.part_name, ARRAY[NEW.part_name], 1, ARRAY[coalesce(NEW.vehicle_type, 'car')]
    )
    ON CONFLICT (normalized_term) DO UPDATE SET
      latest_term = excluded.latest_term,
      sample_terms = (
        SELECT ARRAY(
          SELECT DISTINCT sample
          FROM unnest(public.part_catalog_submissions.sample_terms || excluded.sample_terms) sample
          LIMIT 10
        )
      ),
      vehicle_types = (
        SELECT ARRAY(
          SELECT DISTINCT vehicle
          FROM unnest(public.part_catalog_submissions.vehicle_types || excluded.vehicle_types) vehicle
        )
      ),
      occurrences = public.part_catalog_submissions.occurrences + 1,
      last_seen_at = now(),
      status = CASE
        WHEN public.part_catalog_submissions.status IN ('ignored', 'blocked') THEN public.part_catalog_submissions.status
        ELSE 'pending'
      END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_procura_part_catalog_trigger ON public.procuras;
CREATE TRIGGER capture_procura_part_catalog_trigger
BEFORE INSERT OR UPDATE OF part_name ON public.procuras
FOR EACH ROW EXECUTE FUNCTION public.capture_procura_part_catalog();

CREATE OR REPLACE FUNCTION public.company_effective_subscription(p_company_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE company_record public.companies%ROWTYPE;
DECLARE plan_record public.subscription_plans%ROWTYPE;
DECLARE responded_count integer := 0;
DECLARE received_count integer := 0;
DECLARE positive_count integer := 0;
DECLARE negative_count integer := 0;
DECLARE local_count integer := 0;
DECLARE regional_count integer := 0;
DECLARE multiregional_count integer := 0;
DECLARE state_count integer := 0;
DECLARE days_elapsed integer := 0;
DECLARE effective_state text;
DECLARE trial_active boolean := false;
DECLARE max_accesses integer := 1;
BEGIN
  SELECT * INTO company_record FROM public.companies
  WHERE id = p_company_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('is_company', false); END IF;

  SELECT count(DISTINCT response.procura_id),
         count(DISTINCT response.procura_id) FILTER (WHERE response.status = 'available'),
         count(DISTINCT response.procura_id) FILTER (WHERE response.status = 'unavailable')
  INTO responded_count, positive_count, negative_count
  FROM public.responses response
  WHERE response.company_id = company_record.id
    AND response.response_date >= coalesce(company_record.trial_started_at, company_record.created_at, now())
    AND response.response_date <= greatest(
      coalesce(company_record.trial_extended_until, '-infinity'::timestamptz),
      coalesce(company_record.trial_hard_ends_at, now())
    );

  days_elapsed := greatest(0, floor(extract(epoch FROM (now() - coalesce(company_record.trial_started_at, now()))) / 86400)::integer);

  WITH trial_searches AS (
    SELECT procura.*,
      CASE
        WHEN procura.search_latitude IS NOT NULL AND procura.search_longitude IS NOT NULL
          AND company_record.latitude IS NOT NULL AND company_record.longitude IS NOT NULL
        THEN 6371 * acos(least(1, greatest(-1,
          cos(radians(procura.search_latitude)) * cos(radians(company_record.latitude))
          * cos(radians(company_record.longitude) - radians(procura.search_longitude))
          + sin(radians(procura.search_latitude)) * sin(radians(company_record.latitude))
        )))
        ELSE NULL
      END AS distance_km,
      upper(coalesce(
        procura.locations -> 0 ->> 'state',
        substring(procura.locations -> 0 ->> 'value' FROM '([A-Za-z]{2})\s*$')
      )) = upper(substring(coalesce(company_record.address, '') FROM '([A-Za-z]{2})\s*$')) AS same_state
    FROM public.procuras procura
    WHERE procura.created_at >= coalesce(company_record.trial_started_at, company_record.created_at, now())
      AND procura.created_at <= least(
        now(),
        greatest(
          coalesce(company_record.trial_extended_until, '-infinity'::timestamptz),
          coalesce(company_record.trial_hard_ends_at, now())
        )
      )
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(coalesce(company_record.vehicle_types, '["car","motorcycle","truck","bus"]'::jsonb)) company_vehicle(value)
        WHERE company_vehicle.value = coalesce(procura.vehicle_type, 'car')
      )
  )
  SELECT
    count(*) FILTER (WHERE same_state),
    count(*) FILTER (WHERE distance_km <= 20),
    count(*) FILTER (WHERE distance_km <= 50),
    count(*) FILTER (WHERE distance_km <= 100),
    count(*) FILTER (WHERE same_state)
  INTO received_count, local_count, regional_count, multiregional_count, state_count
  FROM trial_searches;

  IF company_record.plan_code IS NOT NULL
     AND (
       company_record.billing_pause_until > now()
       OR
       company_record.manual_plan_indefinite
       OR company_record.manual_plan_ends_at > now()
       OR (
         company_record.subscription_state = 'subscriber_active'
         AND (company_record.subscription_current_period_end IS NULL OR company_record.subscription_current_period_end > now())
       )
     )
  THEN
    effective_state := 'subscriber_active';
  ELSE
    trial_active :=
      coalesce(company_record.trial_extended_until > now(), false)
      OR (
        now() < coalesce(company_record.trial_hard_ends_at, now())
        AND (
          now() < coalesce(company_record.trial_min_ends_at, now())
          OR responded_count < 30
        )
      );
    effective_state := CASE WHEN trial_active THEN 'trial_active' ELSE 'trial_ended' END;
  END IF;

  IF effective_state = 'subscriber_active' THEN
    SELECT * INTO plan_record FROM public.subscription_plans WHERE code = company_record.plan_code;
    max_accesses := coalesce(plan_record.max_concurrent_accesses, 100);
  END IF;

  RETURN jsonb_build_object(
    'is_company', true,
    'state', effective_state,
    'can_respond', effective_state IN ('trial_active', 'subscriber_active'),
    'plan_code', company_record.plan_code,
    'plan_name', plan_record.name,
    'scope', CASE WHEN effective_state = 'trial_active' THEN 'state' ELSE plan_record.scope END,
    'radius_km', plan_record.radius_km,
    'days_elapsed', days_elapsed,
    'days_target', 30,
    'responded', responded_count,
    'received', received_count,
    'responses_target', 30,
    'positive', positive_count,
    'negative', negative_count,
    'plan_coverage', jsonb_build_object(
      'local', local_count,
      'regional', regional_count,
      'multiregional', multiregional_count,
      'estadual', state_count,
      'nacional', state_count
    ),
    'hard_cap_day', 90,
    'trial_started_at', company_record.trial_started_at,
    'trial_min_ends_at', company_record.trial_min_ends_at,
    'trial_hard_ends_at', company_record.trial_hard_ends_at,
    'trial_extended_until', company_record.trial_extended_until,
    'welcome_seen', company_record.trial_welcome_seen_at IS NOT NULL,
    'end_summary_seen', company_record.trial_end_summary_seen_at IS NOT NULL,
    'max_concurrent_accesses', max_accesses,
    'payment_available', false,
    'payment_status', company_record.subscription_payment_status,
    'cancel_at_period_end', company_record.subscription_cancel_at_period_end,
    'current_period_end', company_record.subscription_current_period_end
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_company_subscription_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.company_effective_subscription(auth.uid()::text);
$$;

CREATE OR REPLACE FUNCTION public.mark_trial_welcome_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.companies SET trial_welcome_seen_at = coalesce(trial_welcome_seen_at, now())
  WHERE id = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.mark_trial_end_summary_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.companies SET trial_end_summary_seen_at = coalesce(trial_end_summary_seen_at, now())
  WHERE id = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.company_can_view_procura(
  p_procura_id text,
  p_locations jsonb,
  p_vehicle_type text,
  p_search_latitude double precision,
  p_search_longitude double precision,
  p_search_radius_km numeric
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE company_record public.companies%ROWTYPE;
DECLARE procura_record public.procuras%ROWTYPE;
DECLARE context jsonb;
DECLARE plan_record public.subscription_plans%ROWTYPE;
DECLARE company_state text;
DECLARE procura_state text;
DECLARE distance_km double precision;
DECLARE same_state boolean := false;
DECLARE old_vehicle boolean := false;
DECLARE high_value boolean := false;
DECLARE no_positive_in_state boolean := false;
DECLARE allowed_geography boolean := false;
DECLARE delay_minutes integer := 0;
BEGIN
  SELECT * INTO company_record FROM public.companies
  WHERE id = auth.uid()::text AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT * INTO procura_record FROM public.procuras WHERE id = p_procura_id;
  IF NOT FOUND THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM public.responses response
    WHERE response.procura_id = p_procura_id AND response.company_id = company_record.id
  ) THEN RETURN true; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(coalesce(company_record.vehicle_types, '["car","motorcycle","truck","bus"]'::jsonb)) type_item(value)
    WHERE type_item.value = coalesce(p_vehicle_type, 'car')
  ) THEN RETURN false; END IF;

  context := public.company_effective_subscription(company_record.id);
  IF context ->> 'state' = 'subscriber_active' THEN
    SELECT * INTO plan_record FROM public.subscription_plans WHERE code = context ->> 'plan_code';
    delay_minutes := coalesce(plan_record.visibility_delay_minutes, 0);
  END IF;

  company_state := upper(substring(coalesce(company_record.address, '') FROM '([A-Za-z]{2})\s*$'));
  procura_state := upper(coalesce(
    (procura_record.locations -> 0 ->> 'state'),
    substring(procura_record.locations -> 0 ->> 'value' FROM '([A-Za-z]{2})\s*$')
  ));
  same_state := company_state <> '' AND company_state = procura_state;

  IF procura_record.search_latitude IS NOT NULL AND procura_record.search_longitude IS NOT NULL
     AND company_record.latitude IS NOT NULL AND company_record.longitude IS NOT NULL THEN
    distance_km := 6371 * acos(least(1, greatest(-1,
      cos(radians(procura_record.search_latitude)) * cos(radians(company_record.latitude))
      * cos(radians(company_record.longitude) - radians(procura_record.search_longitude))
      + sin(radians(procura_record.search_latitude)) * sin(radians(company_record.latitude))
    )));
  END IF;

  IF coalesce(company_record.can_respond_anywhere, false) THEN
    allowed_geography := true;
  ELSIF context ->> 'state' <> 'subscriber_active' THEN
    allowed_geography := same_state;
  ELSIF plan_record.scope = 'radius' THEN
    allowed_geography := distance_km IS NOT NULL AND distance_km <= plan_record.radius_km;
  ELSIF plan_record.scope = 'state' THEN
    allowed_geography := same_state;
  ELSIF plan_record.scope = 'national' THEN
    old_vehicle := nullif(regexp_replace(coalesce(procura_record.vehicle_year, ''), '\D', '', 'g'), '')::integer
      <= extract(year FROM now())::integer - 15;
    high_value := procura_record.is_rare_part OR EXISTS (
      SELECT 1 FROM public.part_catalog catalog
      WHERE catalog.id = procura_record.part_catalog_id AND catalog.is_high_value
    );
    no_positive_in_state := procura_record.created_at <= now() - interval '3 days'
      AND NOT EXISTS (
        SELECT 1
        FROM public.responses response
        JOIN public.companies responder ON responder.id = response.company_id
        WHERE response.procura_id = procura_record.id
          AND response.status = 'available'
          AND upper(substring(coalesce(responder.address, '') FROM '([A-Za-z]{2})\s*$')) = procura_state
      );
    allowed_geography := same_state OR high_value OR old_vehicle OR no_positive_in_state;
  END IF;

  RETURN allowed_geography
    AND procura_record.created_at + make_interval(mins => delay_minutes) <= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.save_company_response(p_procura_id text, p_response jsonb)
RETURNS public.responses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE company_record public.companies%ROWTYPE;
DECLARE saved public.responses%ROWTYPE;
DECLARE response_status text := p_response ->> 'status';
DECLARE operator_record public.company_operators%ROWTYPE;
DECLARE subscription_context jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  SELECT * INTO company_record FROM public.companies WHERE id = auth.uid()::text AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Apenas empresas podem responder'; END IF;
  IF NOT public.company_access_is_active() THEN RAISE EXCEPTION 'Este acesso não está mais ativo'; END IF;

  subscription_context := public.company_effective_subscription(company_record.id);
  IF NOT coalesce((subscription_context ->> 'can_respond')::boolean, false) THEN
    RAISE EXCEPTION 'Assine um plano para responder a esta procura';
  END IF;
  IF NOT public.company_can_view_procura(
    p_procura_id,
    (SELECT locations FROM public.procuras WHERE id = p_procura_id),
    (SELECT vehicle_type FROM public.procuras WHERE id = p_procura_id),
    (SELECT search_latitude FROM public.procuras WHERE id = p_procura_id),
    (SELECT search_longitude FROM public.procuras WHERE id = p_procura_id),
    (SELECT search_radius_km FROM public.procuras WHERE id = p_procura_id)
  ) THEN RAISE EXCEPTION 'Esta procura ainda não está disponível para o alcance da sua empresa'; END IF;

  SELECT operator.* INTO operator_record
  FROM public.company_access_sessions access_session
  JOIN public.company_operators operator ON operator.id = access_session.operator_id
  WHERE access_session.company_id = company_record.id
    AND access_session.auth_session_id = public.current_auth_session_id()
    AND access_session.revoked_at IS NULL;

  IF NOT EXISTS (SELECT 1 FROM public.procuras WHERE id = p_procura_id AND status = 'active') THEN
    RAISE EXCEPTION 'A procura não está ativa';
  END IF;
  IF response_status NOT IN ('available', 'unavailable') THEN RAISE EXCEPTION 'Status de resposta inválido'; END IF;

  INSERT INTO public.responses (
    id, procura_id, company_id, company_name, response_date, status, price, message,
    part_condition, part_type, photo_url, cnpj, address, location, is_read_by_user, is_read_by_company,
    handled_by_operator_id, handled_by_operator_name
  ) VALUES (
    coalesce(nullif(p_response ->> 'id', ''), gen_random_uuid()::text), p_procura_id, company_record.id,
    company_record.name, now(), response_status, nullif(p_response ->> 'price', '')::numeric,
    left(coalesce(p_response ->> 'message', ''), 5000), nullif(p_response ->> 'part_condition', ''),
    nullif(p_response ->> 'part_type', ''), nullif(p_response ->> 'photo_url', ''), company_record.cnpj,
    company_record.address, nullif(p_response ->> 'location', ''), false, true,
    operator_record.id, operator_record.name
  )
  ON CONFLICT (procura_id, company_id) DO UPDATE SET
    company_name = excluded.company_name,
    response_date = excluded.response_date,
    status = excluded.status,
    price = excluded.price,
    message = excluded.message,
    part_condition = excluded.part_condition,
    part_type = excluded.part_type,
    photo_url = excluded.photo_url,
    cnpj = excluded.cnpj,
    address = excluded.address,
    location = excluded.location,
    is_read_by_user = false,
    is_read_by_company = true,
    handled_by_operator_id = excluded.handled_by_operator_id,
    handled_by_operator_name = excluded.handled_by_operator_name
  RETURNING * INTO saved;
  RETURN saved;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_subscription_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_trial_welcome_seen() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_trial_end_summary_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_subscription_context(),
  public.mark_trial_welcome_seen(), public.mark_trial_end_summary_seen()
TO authenticated;
REVOKE ALL ON FUNCTION public.list_company_operators() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_company_operator(text, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_company_operators(),
  public.save_company_operator(text, text, text, text, uuid)
TO authenticated;
REVOKE ALL ON FUNCTION public.verify_company_collaborator_login(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_company_collaborator_login(text, text, text) TO service_role;

COMMIT;
