CREATE OR REPLACE FUNCTION public.identifier_registered(p_kind text, p_value text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_kind
    WHEN 'cpf' THEN EXISTS (
      SELECT 1 FROM users WHERE regexp_replace(coalesce(cpf, ''), '[^0-9]', '', 'g') = regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g')
    )
    WHEN 'cnpj' THEN EXISTS (
      SELECT 1 FROM companies WHERE upper(regexp_replace(coalesce(cnpj, ''), '[^A-Z0-9]', '', 'g')) = upper(regexp_replace(coalesce(p_value, ''), '[^A-Z0-9]', '', 'g'))
    )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.identifier_registered(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.identifier_registered(text, text) TO anon, authenticated;
