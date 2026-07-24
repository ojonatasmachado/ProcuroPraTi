BEGIN;

-- Perfil público da empresa: foto/logo (reaproveita o bucket part-photos já
-- existente) e uma bio curta, para o comprador ver ao decidir se responde
-- à procura. "Página pública da empresa" já era uma feature prometida nos
-- planos (src/lib/subscriptionPlans.js) que ainda não existia no produto.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS bio text;

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_bio_length_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_bio_length_check
  CHECK (bio IS NULL OR length(bio) <= 300);

CREATE OR REPLACE VIEW public.company_directory
WITH (security_barrier = true)
AS SELECT
  c.id, c.name, c.phone, c.cnpj, c.address, c.latitude, c.longitude, c.serves_locations,
  c.validation_status, c.vehicle_types, c.created_at, c.location_source, c.postal_code,
  c.whatsapp, c.address_number, c.plan_code, c.subscription_state,
  rep.avg_rating, rep.rating_count, rep.avg_response_hours, rep.available_rate,
  coalesce(rep.badge_well_rated, false) AS badge_well_rated,
  coalesce(rep.badge_fast_responder, false) AS badge_fast_responder,
  c.logo_url, c.bio
FROM public.companies c
LEFT JOIN public.company_reputation_stats rep ON rep.company_id = c.id
WHERE c.deleted_at IS NULL;

REVOKE ALL ON public.company_directory FROM PUBLIC;
GRANT SELECT ON public.company_directory TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
