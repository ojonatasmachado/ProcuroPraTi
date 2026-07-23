BEGIN;

-- Remove every record previously identified as demonstration data.
DELETE FROM messages
WHERE sender_id IN (SELECT id FROM users WHERE is_demo)
   OR sender_id IN (SELECT id FROM companies WHERE is_demo)
   OR receiver_id IN (SELECT id FROM users WHERE is_demo)
   OR receiver_id IN (SELECT id FROM companies WHERE is_demo);

DELETE FROM responses
WHERE procura_id IN (SELECT id FROM procuras WHERE is_demo)
   OR company_id IN (SELECT id FROM companies WHERE is_demo);

DELETE FROM feedbacks WHERE is_demo;
DELETE FROM procuras WHERE is_demo;
DELETE FROM companies WHERE is_demo;
DELETE FROM users WHERE is_demo;

-- Passwords belong exclusively to Supabase Auth and must never be stored in public tables.
ALTER TABLE users DROP COLUMN IF EXISTS password;
ALTER TABLE companies DROP COLUMN IF EXISTS password;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_ci ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS companies_email_unique_ci ON companies (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS companies_cnpj_unique ON companies (cnpj) WHERE cnpj IS NOT NULL AND cnpj <> '';

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE procuras ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_years ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'companies', 'procuras', 'responses', 'messages', 'feedbacks', 'vehicle_brands', 'vehicle_models', 'vehicle_years')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END $$;

CREATE POLICY users_read_own ON users FOR SELECT TO authenticated
USING (id = auth.uid()::text);
CREATE POLICY users_update_own ON users FOR UPDATE TO authenticated
USING (id = auth.uid()::text) WITH CHECK (id = auth.uid()::text);

CREATE POLICY companies_read_own ON companies FOR SELECT TO authenticated
USING (id = auth.uid()::text);
CREATE POLICY companies_update_own ON companies FOR UPDATE TO authenticated
USING (id = auth.uid()::text) WITH CHECK (id = auth.uid()::text);

CREATE POLICY procuras_read_relevant ON procuras FOR SELECT TO authenticated
USING (
  user_id = auth.uid()::text
  OR EXISTS (SELECT 1 FROM companies WHERE companies.id = auth.uid()::text)
);
CREATE POLICY procuras_insert_own ON procuras FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid()::text AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text));
CREATE POLICY procuras_update_own ON procuras FOR UPDATE TO authenticated
USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY responses_read_relevant ON responses FOR SELECT TO authenticated
USING (
  company_id = auth.uid()::text
  OR EXISTS (SELECT 1 FROM procuras WHERE procuras.id = responses.procura_id AND procuras.user_id = auth.uid()::text)
);
CREATE POLICY responses_insert_company ON responses FOR INSERT TO authenticated
WITH CHECK (
  company_id = auth.uid()::text
  AND EXISTS (SELECT 1 FROM companies WHERE companies.id = auth.uid()::text)
  AND EXISTS (SELECT 1 FROM procuras WHERE procuras.id = responses.procura_id AND procuras.status = 'active')
);
CREATE POLICY responses_update_company ON responses FOR UPDATE TO authenticated
USING (company_id = auth.uid()::text) WITH CHECK (company_id = auth.uid()::text);
CREATE POLICY responses_update_buyer_read_state ON responses FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM procuras WHERE procuras.id = responses.procura_id AND procuras.user_id = auth.uid()::text))
WITH CHECK (EXISTS (SELECT 1 FROM procuras WHERE procuras.id = responses.procura_id AND procuras.user_id = auth.uid()::text));

CREATE POLICY messages_read_participant ON messages FOR SELECT TO authenticated
USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text);
CREATE POLICY messages_insert_participant ON messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()::text
  AND (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM messages previous
      WHERE previous.chat_id = messages.chat_id
        AND previous.sender_id = messages.receiver_id
        AND previous.receiver_id = auth.uid()::text
    )
  )
);
CREATE POLICY messages_mark_received ON messages FOR UPDATE TO authenticated
USING (receiver_id = auth.uid()::text) WITH CHECK (receiver_id = auth.uid()::text);

CREATE POLICY vehicle_brands_public_read ON vehicle_brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY vehicle_models_public_read ON vehicle_models FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY vehicle_years_public_read ON vehicle_years FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE VIEW public.user_directory
WITH (security_barrier = true)
AS SELECT id, name FROM public.users;

CREATE OR REPLACE VIEW public.company_directory
WITH (security_barrier = true)
AS SELECT id, name, phone, cnpj, address, serves_locations, validation_status, vehicle_types, created_at
FROM public.companies;

REVOKE ALL ON public.user_directory FROM PUBLIC;
REVOKE ALL ON public.company_directory FROM PUBLIC;
GRANT SELECT ON public.user_directory TO authenticated;
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
    WHEN EXISTS (SELECT 1 FROM companies WHERE lower(email) = lower(trim(p_email))) THEN 'company'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.account_type_for_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_type_for_email(text) TO anon, authenticated;

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
      new.id::text,
      coalesce(new.raw_user_meta_data ->> 'name', ''),
      new.email,
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'location',
      nullif(new.raw_user_meta_data ->> 'cpf', ''),
      coalesce(new.raw_user_meta_data -> 'vehicles', '[]'::jsonb),
      now(), accepted_at, false
    );
  ELSIF account_type = 'company' THEN
    INSERT INTO companies (
      id, name, email, phone, cnpj, address, serves_locations, validation_status,
      validation_reason, vehicle_types, created_at, terms_accepted_date, access_history, is_demo
    )
    VALUES (
      new.id::text,
      coalesce(new.raw_user_meta_data ->> 'name', ''),
      new.email,
      new.raw_user_meta_data ->> 'phone',
      nullif(new.raw_user_meta_data ->> 'cnpj', ''),
      new.raw_user_meta_data ->> 'address',
      coalesce(new.raw_user_meta_data -> 'serves_locations', '[]'::jsonb),
      'pending', '',
      coalesce(new.raw_user_meta_data -> 'vehicle_types', '["car"]'::jsonb),
      now(), accepted_at, '[]'::jsonb, false
    );
  ELSE
    RAISE EXCEPTION 'Tipo de conta inválido';
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_account();

-- Feedback is accepted only for the authenticated account making the submission.
CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_id text,
  p_user_id text,
  p_user_type text,
  p_user_name text,
  p_type text,
  p_text_content text,
  p_rating integer DEFAULT NULL,
  p_contact text DEFAULT NULL,
  p_created_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid()::text THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF p_user_type NOT IN ('user', 'company') THEN RAISE EXCEPTION 'Tipo de usuário inválido'; END IF;
  IF p_type NOT IN ('rating', 'problem', 'suggestion_popup') THEN RAISE EXCEPTION 'Tipo de feedback inválido'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Avaliação inválida'; END IF;
  IF length(coalesce(p_text_content, '')) > 5000 OR length(coalesce(p_contact, '')) > 500 THEN RAISE EXCEPTION 'Feedback excede o limite permitido'; END IF;

  INSERT INTO feedbacks (id, user_id, user_type, user_name, type, text_content, rating, contact, created_at, is_demo)
  VALUES (p_id, p_user_id, p_user_type, p_user_name, p_type, p_text_content, p_rating, p_contact, p_created_at, false)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback(text, text, text, text, text, text, integer, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback(text, text, text, text, text, text, integer, text, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_company_access(p_company_id text, p_accessed_at timestamptz DEFAULT now())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_company_id <> auth.uid()::text THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  UPDATE companies SET access_history = coalesce(access_history, '[]'::jsonb) || jsonb_build_array(p_accessed_at)
  WHERE id = p_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_company_access(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_company_access(text, timestamptz) TO authenticated;

COMMIT;
