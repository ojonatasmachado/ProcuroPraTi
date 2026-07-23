BEGIN;

-- Reputação pública das empresas: nota do comprador (1-5) por resposta recebida,
-- combinada com métricas automáticas de comportamento (velocidade de resposta e
-- % de respostas com peça disponível). Os selos exibidos ao comprador dizem o
-- motivo ("Responde rápido", "Bem avaliada") em vez de um nível opaco.

CREATE TABLE IF NOT EXISTS public.company_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  procura_id text NOT NULL REFERENCES public.procuras(id) ON DELETE CASCADE,
  response_id text NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_ratings_response_unique ON public.company_ratings (response_id);
CREATE INDEX IF NOT EXISTS company_ratings_company_idx ON public.company_ratings (company_id);

ALTER TABLE public.company_ratings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_ratings FROM anon, authenticated;

DROP POLICY IF EXISTS company_ratings_read_own_as_buyer ON public.company_ratings;
CREATE POLICY company_ratings_read_own_as_buyer ON public.company_ratings FOR SELECT TO authenticated
USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS company_ratings_read_own_as_company ON public.company_ratings;
CREATE POLICY company_ratings_read_own_as_company ON public.company_ratings FOR SELECT TO authenticated
USING (company_id = auth.uid()::text AND public.company_access_is_active());

GRANT SELECT ON public.company_ratings TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_company_rating(
  p_response_id text,
  p_rating smallint,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response_record public.responses%ROWTYPE;
  procura_record public.procuras%ROWTYPE;
  saved_id uuid;
BEGIN
  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'A nota deve ser de 1 a 5';
  END IF;

  SELECT * INTO response_record FROM public.responses WHERE id = p_response_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resposta não encontrada'; END IF;
  IF response_record.company_id IS NULL THEN RAISE EXCEPTION 'Esta empresa não está mais disponível'; END IF;

  SELECT * INTO procura_record FROM public.procuras WHERE id = response_record.procura_id;
  IF NOT FOUND OR procura_record.user_id <> auth.uid()::text THEN
    RAISE EXCEPTION 'Você só pode avaliar respostas às suas próprias procuras';
  END IF;

  INSERT INTO public.company_ratings (company_id, user_id, procura_id, response_id, rating, comment)
  VALUES (
    response_record.company_id, auth.uid()::text, response_record.procura_id, p_response_id,
    p_rating, nullif(trim(coalesce(p_comment, '')), '')
  )
  ON CONFLICT (response_id) DO UPDATE SET
    rating = excluded.rating, comment = excluded.comment, updated_at = now()
  RETURNING id INTO saved_id;

  RETURN jsonb_build_object('success', true, 'id', saved_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_company_rating(text, smallint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_company_rating(text, smallint, text) TO authenticated;

CREATE OR REPLACE VIEW public.company_reputation_stats AS
WITH base AS (
  SELECT
    c.id AS company_id,
    AVG(cr.rating) AS raw_avg_rating,
    COUNT(DISTINCT cr.id) AS rating_count,
    AVG(EXTRACT(EPOCH FROM (r.response_date - p.created_at)) / 3600.0) AS raw_avg_response_hours,
    COUNT(r.id) AS response_count,
    COUNT(*) FILTER (WHERE r.status = 'available') AS available_count
  FROM public.companies c
  LEFT JOIN public.responses r ON r.company_id = c.id
  LEFT JOIN public.procuras p ON p.id = r.procura_id
  LEFT JOIN public.company_ratings cr ON cr.company_id = c.id
  GROUP BY c.id
)
SELECT
  company_id,
  ROUND(raw_avg_rating::numeric, 1) AS avg_rating,
  rating_count,
  ROUND(raw_avg_response_hours::numeric, 1) AS avg_response_hours,
  response_count,
  CASE WHEN response_count > 0 THEN ROUND((available_count::numeric / response_count) * 100) END AS available_rate,
  (rating_count >= 3 AND raw_avg_rating >= 4.5) AS badge_well_rated,
  (response_count >= 5 AND raw_avg_response_hours <= 6) AS badge_fast_responder
FROM base;

REVOKE ALL ON public.company_reputation_stats FROM PUBLIC;
GRANT SELECT ON public.company_reputation_stats TO authenticated;

CREATE OR REPLACE VIEW public.company_directory
WITH (security_barrier = true)
AS SELECT
  c.id, c.name, c.phone, c.cnpj, c.address, c.latitude, c.longitude, c.serves_locations,
  c.validation_status, c.vehicle_types, c.created_at, c.location_source, c.postal_code,
  c.whatsapp, c.address_number, c.plan_code, c.subscription_state,
  rep.avg_rating, rep.rating_count, rep.avg_response_hours, rep.available_rate,
  coalesce(rep.badge_well_rated, false) AS badge_well_rated,
  coalesce(rep.badge_fast_responder, false) AS badge_fast_responder
FROM public.companies c
LEFT JOIN public.company_reputation_stats rep ON rep.company_id = c.id
WHERE c.deleted_at IS NULL;

REVOKE ALL ON public.company_directory FROM PUBLIC;
GRANT SELECT ON public.company_directory TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
