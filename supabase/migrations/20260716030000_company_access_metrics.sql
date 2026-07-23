ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS access_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.record_company_access(
  p_company_id text,
  p_accessed_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE companies
  SET access_history = coalesce(access_history, '[]'::jsonb) || jsonb_build_array(p_accessed_at)
  WHERE id = p_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_company_access(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_company_access(text, timestamptz) TO anon, authenticated;
