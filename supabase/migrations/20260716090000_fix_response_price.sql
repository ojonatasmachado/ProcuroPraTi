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
    nullif(p_response ->> 'price', '')::numeric, left(coalesce(p_response ->> 'message', ''), 5000),
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
