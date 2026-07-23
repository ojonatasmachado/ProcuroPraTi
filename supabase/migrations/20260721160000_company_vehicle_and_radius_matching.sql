BEGIN;

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
    FROM public.companies company
    WHERE company.id = auth.uid()::text
      AND (
        EXISTS (
          SELECT 1 FROM public.responses response
          WHERE response.procura_id = p_procura_id AND response.company_id = company.id
        )
        OR (
          EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(coalesce(company.vehicle_types, '["car", "motorcycle", "truck", "bus"]'::jsonb)) vehicle(value)
            WHERE vehicle.value = coalesce(p_vehicle_type, 'car')
          )
          AND (
            coalesce(company.can_respond_anywhere, false)
            OR (
              p_search_latitude IS NOT NULL AND p_search_longitude IS NOT NULL
              AND company.latitude IS NOT NULL AND company.longitude IS NOT NULL
              AND 6371 * acos(least(1, greatest(-1,
                cos(radians(p_search_latitude)) * cos(radians(company.latitude))
                * cos(radians(company.longitude) - radians(p_search_longitude))
                + sin(radians(p_search_latitude)) * sin(radians(company.latitude))
              ))) <= coalesce(p_search_radius_km, 10)
            )
            OR (
              (p_search_latitude IS NULL OR p_search_longitude IS NULL OR company.latitude IS NULL OR company.longitude IS NULL)
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(coalesce(company.serves_locations, '[]'::jsonb)) served(value)
                JOIN jsonb_array_elements(coalesce(p_locations, '[]'::jsonb)) requested
                  ON lower(trim(served.value)) = lower(trim(requested ->> 'value'))
              )
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.company_can_view_procura(text, jsonb, text, double precision, double precision, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_can_view_procura(text, jsonb, text, double precision, double precision, numeric) TO authenticated;

DROP POLICY IF EXISTS procuras_read_relevant ON public.procuras;
CREATE POLICY procuras_read_relevant ON public.procuras FOR SELECT TO authenticated
USING (
  user_id = auth.uid()::text
  OR public.company_can_view_procura(id, locations, vehicle_type, search_latitude, search_longitude, search_radius_km)
);

COMMIT;
