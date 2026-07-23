BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS can_respond_anywhere boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.company_can_view_procura(
  p_procura_id text,
  p_locations jsonb,
  p_vehicle_type text,
  p_search_latitude double precision,
  p_search_longitude double precision,
  p_search_radius_km numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM companies company
    WHERE company.id = auth.uid()::text
      AND (
        company.can_respond_anywhere = true
        OR EXISTS (
          SELECT 1 FROM responses response
          WHERE response.procura_id = p_procura_id AND response.company_id = company.id
        )
        OR (
          EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(coalesce(company.serves_locations, '[]'::jsonb)) served(value)
            JOIN jsonb_array_elements(coalesce(p_locations, '[]'::jsonb)) requested
              ON lower(trim(served.value)) = lower(trim(requested ->> 'value'))
          )
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(coalesce(company.vehicle_types, '["car", "motorcycle", "truck", "bus"]'::jsonb)) vehicle(value)
            WHERE vehicle.value = coalesce(p_vehicle_type, 'car')
          )
          AND (
            p_search_latitude IS NULL OR p_search_longitude IS NULL
            OR company.latitude IS NULL OR company.longitude IS NULL
            OR 6371 * acos(least(1, greatest(-1,
              cos(radians(p_search_latitude)) * cos(radians(company.latitude))
              * cos(radians(company.longitude) - radians(p_search_longitude))
              + sin(radians(p_search_latitude)) * sin(radians(company.latitude))
            ))) <= coalesce(p_search_radius_km, 10)
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.company_can_view_procura(text, jsonb, text, double precision, double precision, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_can_view_procura(text, jsonb, text, double precision, double precision, numeric) TO authenticated;

UPDATE storage.buckets
SET file_size_limit = 1572864,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('part-photos', 'chat-images');

COMMIT;
