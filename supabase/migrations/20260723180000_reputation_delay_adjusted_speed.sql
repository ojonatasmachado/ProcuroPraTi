BEGIN;

-- Ajuste do cálculo de "responde rápido": deve contar a partir do momento em
-- que a procura ficou visível para a empresa (created_at + o atraso de
-- visibilidade do plano dela), não da criação da procura em si — senão
-- empresas em planos com atraso contratado seriam penalizadas por um tempo
-- fora do controle delas. Respostas "indisponível" já contavam para a
-- métrica de velocidade (não há filtro de status aqui) e continuam contando.

CREATE OR REPLACE VIEW public.company_reputation_stats AS
WITH base AS (
  SELECT
    c.id AS company_id,
    AVG(cr.rating) AS raw_avg_rating,
    COUNT(DISTINCT cr.id) AS rating_count,
    AVG(GREATEST(EXTRACT(EPOCH FROM (
      r.response_date - (
        p.created_at + make_interval(mins =>
          CASE WHEN c.subscription_state = 'subscriber_active' THEN coalesce(sp.visibility_delay_minutes, 0) ELSE 0 END
        )
      )
    )) / 3600.0, 0)) AS raw_avg_response_hours,
    COUNT(r.id) AS response_count,
    COUNT(*) FILTER (WHERE r.status = 'available') AS available_count
  FROM public.companies c
  LEFT JOIN public.subscription_plans sp ON sp.code = c.plan_code
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

NOTIFY pgrst, 'reload schema';

COMMIT;
