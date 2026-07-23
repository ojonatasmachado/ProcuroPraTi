CREATE OR REPLACE FUNCTION public.company_can_view_procura(
  p_procura_id text,
  p_locations jsonb,
  p_vehicle_type text
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
        EXISTS (
          SELECT 1 FROM responses response
          WHERE response.procura_id = p_procura_id
            AND response.company_id = company.id
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
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.company_can_view_procura(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_can_view_procura(text, jsonb, text) TO authenticated;

DROP POLICY IF EXISTS procuras_read_relevant ON procuras;
CREATE POLICY procuras_read_relevant ON procuras FOR SELECT TO authenticated
USING (
  user_id = auth.uid()::text
  OR public.company_can_view_procura(id, locations, vehicle_type)
);
