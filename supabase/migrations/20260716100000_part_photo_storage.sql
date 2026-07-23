INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('part-photos', 'part-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS part_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS part_photos_company_insert ON storage.objects;
DROP POLICY IF EXISTS part_photos_company_update ON storage.objects;
DROP POLICY IF EXISTS part_photos_company_delete ON storage.objects;

CREATE POLICY part_photos_public_read ON storage.objects FOR SELECT TO public
USING (bucket_id = 'part-photos');

CREATE POLICY part_photos_company_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'part-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.companies WHERE companies.id = auth.uid()::text)
);

CREATE POLICY part_photos_company_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'part-photos' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'part-photos' AND owner_id = auth.uid()::text);

CREATE POLICY part_photos_company_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'part-photos' AND owner_id = auth.uid()::text);
