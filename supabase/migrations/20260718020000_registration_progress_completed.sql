ALTER TABLE public.registration_progress
  DROP CONSTRAINT IF EXISTS registration_progress_stage_check;

ALTER TABLE public.registration_progress
  ADD CONSTRAINT registration_progress_stage_check
  CHECK (stage IN ('personal', 'address', 'vehicle', 'completed'));

CREATE OR REPLACE FUNCTION public.save_registration_progress(
  p_email text,
  p_name text,
  p_phone text,
  p_stage text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) > 254 OR trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Email inválido';
  END IF;
  IF p_stage NOT IN ('personal', 'address', 'vehicle', 'completed') THEN
    RAISE EXCEPTION 'Etapa de cadastro inválida';
  END IF;
  IF length(coalesce(p_name, '')) > 160 OR length(coalesce(p_phone, '')) > 40 OR octet_length(coalesce(p_data, '{}'::jsonb)::text) > 10000 THEN
    RAISE EXCEPTION 'Dados de cadastro inválidos';
  END IF;

  INSERT INTO public.registration_progress (email, name, phone, stage, data, updated_at)
  VALUES (lower(trim(p_email)), trim(coalesce(p_name, '')), trim(coalesce(p_phone, '')), p_stage, coalesce(p_data, '{}'::jsonb), now())
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    stage = EXCLUDED.stage,
    data = EXCLUDED.data,
    updated_at = now();
END;
$$;
