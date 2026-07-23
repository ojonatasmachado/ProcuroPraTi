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
  IF p_user_type NOT IN ('user', 'company') THEN
    RAISE EXCEPTION 'Tipo de usuário inválido';
  END IF;
  IF p_type NOT IN ('rating', 'problem', 'suggestion_popup') THEN
    RAISE EXCEPTION 'Tipo de feedback inválido';
  END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Avaliação inválida';
  END IF;
  IF length(coalesce(p_text_content, '')) > 5000 OR length(coalesce(p_contact, '')) > 500 THEN
    RAISE EXCEPTION 'Feedback excede o limite permitido';
  END IF;

  INSERT INTO feedbacks (id, user_id, user_type, user_name, type, text_content, rating, contact, created_at)
  VALUES (p_id, p_user_id, p_user_type, p_user_name, p_type, p_text_content, p_rating, p_contact, p_created_at)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback(text, text, text, text, text, text, integer, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback(text, text, text, text, text, text, integer, text, timestamptz) TO anon, authenticated;
