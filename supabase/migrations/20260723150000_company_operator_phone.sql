BEGIN;

ALTER TABLE public.company_operators
  ADD COLUMN IF NOT EXISTS contact_phone text;

DROP FUNCTION IF EXISTS public.list_company_operators();
CREATE FUNCTION public.list_company_operators()
RETURNS TABLE (
  id uuid,
  name text,
  username text,
  contact_email text,
  contact_phone text,
  active boolean,
  created_at timestamptz,
  disabled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.company_access_is_owner() THEN
    RAISE EXCEPTION 'Somente o responsável pode administrar a equipe';
  END IF;

  RETURN QUERY
    SELECT
      operator.id,
      operator.name,
      operator.username,
      operator.contact_email,
      operator.contact_phone,
      operator.active,
      operator.created_at,
      operator.disabled_at
    FROM public.company_operators operator
    WHERE operator.company_id = auth.uid()::text
    ORDER BY operator.active DESC, operator.name;
END;
$$;

DROP FUNCTION IF EXISTS public.save_company_operator(text, text, text, text, uuid);
CREATE FUNCTION public.save_company_operator(
  p_name text,
  p_username text,
  p_pin text,
  p_contact_email text,
  p_contact_phone text,
  p_operator_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  saved_id uuid;
  normalized_phone text := regexp_replace(coalesce(p_contact_phone, ''), '\D', '', 'g');
BEGIN
  IF NOT public.company_access_is_owner() THEN
    RAISE EXCEPTION 'Somente o responsável pode administrar a equipe';
  END IF;
  IF length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Informe o nome completo da pessoa';
  END IF;
  IF trim(p_username) !~ '^[a-z0-9._-]{3,24}$' THEN
    RAISE EXCEPTION 'O usuário deve ter entre 3 e 24 caracteres, usando letras, números, ponto, hífen ou sublinhado';
  END IF;
  IF p_pin !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'O PIN deve ter 6 números';
  END IF;
  IF trim(coalesce(p_contact_email, '')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Informe um email válido para enviar os dados de acesso';
  END IF;
  IF length(normalized_phone) NOT BETWEEN 10 AND 15 THEN
    RAISE EXCEPTION 'Informe um telefone válido com DDD';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.company_operators
    WHERE company_id = auth.uid()::text
      AND lower(username) = lower(trim(p_username))
      AND id IS DISTINCT FROM p_operator_id
  ) THEN
    RAISE EXCEPTION 'Este nome de usuário já está em uso';
  END IF;

  IF p_operator_id IS NULL THEN
    INSERT INTO public.company_operators (
      company_id, name, username, contact_email, contact_phone, pin_hash
    )
    VALUES (
      auth.uid()::text,
      trim(p_name),
      lower(trim(p_username)),
      lower(trim(p_contact_email)),
      normalized_phone,
      extensions.crypt(p_pin, extensions.gen_salt('bf'))
    )
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.company_operators
    SET
      name = trim(p_name),
      username = lower(trim(p_username)),
      contact_email = lower(trim(p_contact_email)),
      contact_phone = normalized_phone,
      pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
      active = true,
      disabled_at = NULL,
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = now()
    WHERE id = p_operator_id
      AND company_id = auth.uid()::text
    RETURNING id INTO saved_id;

    IF saved_id IS NULL THEN
      RAISE EXCEPTION 'Usuário da equipe não encontrado';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', saved_id,
    'username', lower(trim(p_username))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_company_operators() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_company_operator(text, text, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_company_operators() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_company_operator(text, text, text, text, text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
