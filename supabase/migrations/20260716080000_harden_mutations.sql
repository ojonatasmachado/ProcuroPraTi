BEGIN;

REVOKE INSERT, UPDATE, DELETE ON users FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON companies FROM anon, authenticated;
GRANT UPDATE (name, phone, cpf, location, vehicles, terms_accepted_date) ON users TO authenticated;
GRANT UPDATE (name, phone, cnpj, address, serves_locations, vehicle_types, terms_accepted_date) ON companies TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS responses_company_procura_unique ON responses (procura_id, company_id);

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
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  SELECT * INTO company_record FROM companies WHERE id = auth.uid()::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'Apenas empresas podem responder'; END IF;
  IF NOT EXISTS (SELECT 1 FROM procuras WHERE id = p_procura_id AND status = 'active') THEN RAISE EXCEPTION 'A procura não está ativa'; END IF;
  IF response_status NOT IN ('available', 'unavailable') THEN RAISE EXCEPTION 'Status de resposta inválido'; END IF;

  INSERT INTO responses (
    id, procura_id, company_id, company_name, response_date, status, price, message,
    part_condition, part_type, photo_url, cnpj, address, location, is_read_by_user, is_read_by_company
  ) VALUES (
    coalesce(nullif(p_response ->> 'id', ''), gen_random_uuid()::text),
    p_procura_id, auth.uid()::text, company_record.name, now(), response_status,
    nullif(p_response ->> 'price', ''), left(coalesce(p_response ->> 'message', ''), 5000),
    nullif(p_response ->> 'part_condition', ''), nullif(p_response ->> 'part_type', ''),
    nullif(p_response ->> 'photo_url', ''), company_record.cnpj, company_record.address,
    nullif(p_response ->> 'location', ''), false, true
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
    is_read_by_company = true
  RETURNING * INTO saved;
  RETURN saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_response_read(p_response_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  UPDATE responses
  SET is_read_by_user = true
  WHERE id = p_response_id
    AND EXISTS (SELECT 1 FROM procuras WHERE procuras.id = responses.procura_id AND procuras.user_id = auth.uid()::text);
  IF NOT FOUND THEN RAISE EXCEPTION 'Resposta não encontrada'; END IF;
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON responses FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.save_company_response(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_response_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_company_response(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_response_read(text) TO authenticated;

REVOKE UPDATE, DELETE ON messages FROM anon, authenticated;
GRANT UPDATE (is_read) ON messages TO authenticated;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_text_length;
ALTER TABLE messages ADD CONSTRAINT messages_text_length CHECK (length(text) BETWEEN 1 AND 5000);

COMMIT;
