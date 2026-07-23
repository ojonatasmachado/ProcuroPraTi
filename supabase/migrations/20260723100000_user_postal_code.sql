BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS postal_code text;

GRANT UPDATE (postal_code) ON public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_type text := new.raw_user_meta_data ->> 'account_type';
BEGIN
  IF account_type = 'user' THEN
    INSERT INTO users (
      id, name, email, phone, location, postal_code, cpf, vehicles,
      created_at, terms_accepted_date, is_demo
    )
    VALUES (
      new.id::text, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
      new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'location',
      nullif(new.raw_user_meta_data ->> 'postal_code', ''),
      nullif(new.raw_user_meta_data ->> 'cpf', ''),
      coalesce(new.raw_user_meta_data -> 'vehicles', '[]'::jsonb),
      now(), NULL, false
    );
  ELSIF account_type = 'company' THEN
    INSERT INTO companies (
      id, name, email, phone, whatsapp, cnpj, address, address_number, postal_code,
      latitude, longitude, location_source, serves_locations, validation_status,
      validation_reason, vehicle_types, created_at, terms_accepted_date, access_history, is_demo
    )
    VALUES (
      new.id::text, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
      new.raw_user_meta_data ->> 'phone', nullif(new.raw_user_meta_data ->> 'whatsapp', ''),
      nullif(new.raw_user_meta_data ->> 'cnpj', ''), new.raw_user_meta_data ->> 'address',
      nullif(new.raw_user_meta_data ->> 'address_number', ''),
      nullif(new.raw_user_meta_data ->> 'postal_code', ''),
      nullif(new.raw_user_meta_data ->> 'latitude', '')::double precision,
      nullif(new.raw_user_meta_data ->> 'longitude', '')::double precision,
      coalesce(nullif(new.raw_user_meta_data ->> 'location_source', ''), 'cep'),
      coalesce(new.raw_user_meta_data -> 'serves_locations', '[]'::jsonb),
      'pending', '', coalesce(new.raw_user_meta_data -> 'vehicle_types', '["car"]'::jsonb),
      now(), NULL, '[]'::jsonb, false
    );
  ELSE
    RAISE EXCEPTION 'Tipo de conta inválido';
  END IF;
  RETURN new;
END;
$$;

COMMIT;
