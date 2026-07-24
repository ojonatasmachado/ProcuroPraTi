BEGIN;

-- Flag por empresa que faz company_can_view_procura() enxergar todas as
-- procuras existentes, ignorando tipo de veículo, geografia/plano e atraso
-- de visibilidade. Serve para contas de teste usadas para validar o app em
-- produção, sem alterar o comportamento de nenhuma outra empresa (default
-- false, ninguém mais é afetado).

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS sees_all_procuras boolean NOT NULL DEFAULT false;

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

  IF coalesce(company_record.sees_all_procuras, false) THEN RETURN true; END IF;

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

COMMIT;
