BEGIN;

CREATE TABLE IF NOT EXISTS public.municipalities (
  id text PRIMARY KEY,
  name text NOT NULL,
  state text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  source text NOT NULL DEFAULT 'municipios-brasileiros',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS municipalities_state_name_idx ON public.municipalities (state, name);
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS municipalities_read ON public.municipalities;
CREATE POLICY municipalities_read ON public.municipalities FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.municipalities FROM PUBLIC;
GRANT SELECT ON public.municipalities TO authenticated;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS location_source text NOT NULL DEFAULT 'cep',
  ADD COLUMN IF NOT EXISTS postal_code text;

ALTER TABLE public.procuras
  ADD COLUMN IF NOT EXISTS search_location_source text NOT NULL DEFAULT 'city_center';

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_location_source_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_location_source_check
  CHECK (location_source IN ('cep', 'gps', 'manual', 'city_center', 'legacy'));

ALTER TABLE public.procuras DROP CONSTRAINT IF EXISTS procuras_search_location_source_check;
ALTER TABLE public.procuras ADD CONSTRAINT procuras_search_location_source_check
  CHECK (search_location_source IN ('gps', 'manual', 'city_center', 'legacy'));

GRANT UPDATE (location_source, postal_code) ON public.companies TO authenticated;

CREATE OR REPLACE VIEW public.company_directory
WITH (security_barrier = true)
AS SELECT id, name, phone, cnpj, address, latitude, longitude, serves_locations, validation_status, vehicle_types, created_at, location_source, postal_code
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
BEGIN
  IF account_type = 'user' THEN
    INSERT INTO users (id, name, email, phone, location, cpf, vehicles, created_at, terms_accepted_date, is_demo)
    VALUES (
      new.id::text, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
      new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'location',
      nullif(new.raw_user_meta_data ->> 'cpf', ''), coalesce(new.raw_user_meta_data -> 'vehicles', '[]'::jsonb),
      now(), NULL, false
    );
  ELSIF account_type = 'company' THEN
    INSERT INTO companies (
      id, name, email, phone, cnpj, address, postal_code, latitude, longitude, location_source,
      serves_locations, validation_status, validation_reason, vehicle_types, created_at,
      terms_accepted_date, access_history, is_demo
    )
    VALUES (
      new.id::text, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
      new.raw_user_meta_data ->> 'phone', nullif(new.raw_user_meta_data ->> 'cnpj', ''),
      new.raw_user_meta_data ->> 'address', nullif(new.raw_user_meta_data ->> 'postal_code', ''),
      nullif(new.raw_user_meta_data ->> 'latitude', '')::double precision,
      nullif(new.raw_user_meta_data ->> 'longitude', '')::double precision,
      coalesce(nullif(new.raw_user_meta_data ->> 'location_source', ''), 'cep'),
      coalesce(new.raw_user_meta_data -> 'serves_locations', '[]'::jsonb), 'pending', '',
      coalesce(new.raw_user_meta_data -> 'vehicle_types', '["car"]'::jsonb), now(), NULL, '[]'::jsonb, false
    );
  ELSE
    RAISE EXCEPTION 'Tipo de conta inválido';
  END IF;
  RETURN new;
END;
$$;

COMMIT;
