BEGIN;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

UPDATE public.messages
SET delivered_at = coalesce(delivered_at, timestamp),
    read_at = coalesce(read_at, timestamp)
WHERE is_read = true;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_text_length;
ALTER TABLE public.messages ADD CONSTRAINT messages_content_required CHECK (
  (length(coalesce(text, '')) BETWEEN 1 AND 5000)
  OR (nullif(image_path, '') IS NOT NULL AND length(coalesce(text, '')) <= 5000)
);

CREATE OR REPLACE FUNCTION public.mark_messages_delivered()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  UPDATE public.messages
  SET delivered_at = now()
  WHERE receiver_id = auth.uid()::text
    AND delivered_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  UPDATE public.messages
  SET is_read = true,
      delivered_at = coalesce(delivered_at, now()),
      read_at = coalesce(read_at, now())
  WHERE id = p_message_id
    AND receiver_id = auth.uid()::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mensagem não encontrada'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_messages_delivered() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_message_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_messages_delivered() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_message_read(text) TO authenticated;

REVOKE UPDATE ON public.messages FROM authenticated;
REVOKE UPDATE (is_read) ON public.messages FROM authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-images', 'chat-images', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS chat_images_insert_own ON storage.objects;
CREATE POLICY chat_images_insert_own ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS chat_images_read_participant ON storage.objects;
CREATE POLICY chat_images_read_participant ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images'
  AND EXISTS (
    SELECT 1 FROM public.messages
    WHERE messages.image_path = storage.objects.name
      AND (messages.sender_id = auth.uid()::text OR messages.receiver_id = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS chat_images_delete_own ON storage.objects;
CREATE POLICY chat_images_delete_own ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-images'
  AND owner_id = auth.uid()::text
);

COMMIT;
