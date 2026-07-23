BEGIN;

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
      id, name, email, phone, cnpj, address, latitude, longitude, serves_locations, validation_status,
      validation_reason, vehicle_types, created_at, terms_accepted_date, access_history, is_demo
    )
    VALUES (
      new.id::text, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
      new.raw_user_meta_data ->> 'phone', nullif(new.raw_user_meta_data ->> 'cnpj', ''),
      new.raw_user_meta_data ->> 'address', nullif(new.raw_user_meta_data ->> 'latitude', '')::double precision,
      nullif(new.raw_user_meta_data ->> 'longitude', '')::double precision,
      coalesce(new.raw_user_meta_data -> 'serves_locations', '[]'::jsonb), 'pending', '',
      coalesce(new.raw_user_meta_data -> 'vehicle_types', '["car"]'::jsonb), now(), NULL, '[]'::jsonb, false
    );
  ELSE
    RAISE EXCEPTION 'Tipo de conta inválido';
  END IF;
  RETURN new;
END;
$$;

-- Contas reais criadas antes desta correção não possuíam um aceite explícito.
-- Elas deverão assinar os termos no próximo acesso.
UPDATE public.users
SET terms_accepted_date = NULL
WHERE coalesce(is_demo, false) = false;

UPDATE public.companies
SET terms_accepted_date = NULL
WHERE coalesce(is_demo, false) = false;

COMMIT;
