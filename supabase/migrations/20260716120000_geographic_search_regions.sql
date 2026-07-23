BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.procuras
  ADD COLUMN IF NOT EXISTS search_latitude double precision,
  ADD COLUMN IF NOT EXISTS search_longitude double precision,
  ADD COLUMN IF NOT EXISTS search_radius_km numeric(6,2) NOT NULL DEFAULT 10
    CHECK (search_radius_km >= 1 AND search_radius_km <= 50);

GRANT UPDATE (latitude, longitude) ON public.companies TO authenticated;

DROP VIEW IF EXISTS public.company_directory;
CREATE VIEW public.company_directory
WITH (security_barrier = true)
AS SELECT id, name, phone, cnpj, address, latitude, longitude, serves_locations, validation_status, vehicle_types, created_at
FROM public.companies;
REVOKE ALL ON public.company_directory FROM PUBLIC;
GRANT SELECT ON public.company_directory TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_type text := new.raw_user_meta_data ->> 'account_type';
  accepted_at timestamptz := coalesce((new.raw_user_meta_data ->> 'terms_accepted_date')::timestamptz, now());
BEGIN
  IF account_type = 'user' THEN
    INSERT INTO users (id, name, email, phone, location, cpf, vehicles, created_at, terms_accepted_date, is_demo)
    VALUES (
      new.id::text, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
      new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'location',
      nullif(new.raw_user_meta_data ->> 'cpf', ''), coalesce(new.raw_user_meta_data -> 'vehicles', '[]'::jsonb),
      now(), accepted_at, false
    );
  ELSIF account_type = 'company' THEN
    INSERT INTO companies (
      id, name, email, phone, cnpj, address, latitude, longitude, serves_locations, validation_status,
      validation_reason, vehicle_types, created_at, terms_accepted_date, access_history, is_demo
    )
    VALUES (
      new.id::text, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
      new.raw_user_meta_data ->> 'phone', nullif(new.raw_user_meta_data ->> 'cnpj', ''),
      new.raw_user_meta_data ->> 'address', nullif(new.raw_user_meta_data ->> 'latitude', '')::double precision,
      nullif(new.raw_user_meta_data ->> 'longitude', '')::double precision,
      coalesce(new.raw_user_meta_data -> 'serves_locations', '[]'::jsonb), 'pending', '',
      coalesce(new.raw_user_meta_data -> 'vehicle_types', '["car"]'::jsonb), now(), accepted_at, '[]'::jsonb, false
    );
  ELSE
    RAISE EXCEPTION 'Tipo de conta inválido';
  END IF;
  RETURN new;
END;
$$;

DROP POLICY IF EXISTS procuras_read_relevant ON public.procuras;
DROP FUNCTION IF EXISTS public.company_can_view_procura(text, jsonb, text);

CREATE FUNCTION public.company_can_view_procura(
  p_procura_id text,
  p_locations jsonb,
  p_vehicle_type text,
  p_search_latitude double precision,
  p_search_longitude double precision,
  p_search_radius_km numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM companies company
    WHERE company.id = auth.uid()::text
      AND (
        EXISTS (
          SELECT 1 FROM responses response
          WHERE response.procura_id = p_procura_id AND response.company_id = company.id
        )
        OR (
          EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(coalesce(company.serves_locations, '[]'::jsonb)) served(value)
            JOIN jsonb_array_elements(coalesce(p_locations, '[]'::jsonb)) requested
              ON lower(trim(served.value)) = lower(trim(requested ->> 'value'))
          )
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(coalesce(company.vehicle_types, '["car", "motorcycle", "truck", "bus"]'::jsonb)) vehicle(value)
            WHERE vehicle.value = coalesce(p_vehicle_type, 'car')
          )
          AND (
            p_search_latitude IS NULL OR p_search_longitude IS NULL
            OR company.latitude IS NULL OR company.longitude IS NULL
            OR 6371 * acos(least(1, greatest(-1,
              cos(radians(p_search_latitude)) * cos(radians(company.latitude))
              * cos(radians(company.longitude) - radians(p_search_longitude))
              + sin(radians(p_search_latitude)) * sin(radians(company.latitude))
            ))) <= coalesce(p_search_radius_km, 10)
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.company_can_view_procura(text, jsonb, text, double precision, double precision, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_can_view_procura(text, jsonb, text, double precision, double precision, numeric) TO authenticated;

CREATE POLICY procuras_read_relevant ON public.procuras FOR SELECT TO authenticated
USING (
  user_id = auth.uid()::text
  OR public.company_can_view_procura(id, locations, vehicle_type, search_latitude, search_longitude, search_radius_km)
);

COMMIT;
