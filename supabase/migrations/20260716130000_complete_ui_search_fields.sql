BEGIN;

ALTER TABLE public.procuras
  ADD COLUMN IF NOT EXISTS reference_photo_url text,
  ADD COLUMN IF NOT EXISTS preferred_condition text NOT NULL DEFAULT 'any'
    CHECK (preferred_condition IN ('any', 'new', 'used'));

DROP POLICY IF EXISTS part_photos_user_insert ON storage.objects;
CREATE POLICY part_photos_user_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'part-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid()::text)
);

COMMIT;
