CREATE TABLE IF NOT EXISTS public.registration_progress (
  email text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  stage text NOT NULL CHECK (stage IN ('personal', 'address', 'vehicle')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.registration_progress FROM anon, authenticated;

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
  IF p_stage NOT IN ('personal', 'address', 'vehicle') THEN
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

REVOKE ALL ON FUNCTION public.save_registration_progress(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_registration_progress(text, text, text, text, jsonb) TO anon, authenticated;
