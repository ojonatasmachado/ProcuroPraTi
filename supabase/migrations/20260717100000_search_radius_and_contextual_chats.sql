BEGIN;

ALTER TABLE public.procuras
  DROP CONSTRAINT IF EXISTS procuras_search_radius_km_check;

ALTER TABLE public.procuras
  ADD CONSTRAINT procuras_search_radius_km_check
  CHECK (search_radius_km >= 1 AND search_radius_km <= 100);

UPDATE public.messages
SET chat_id = least(sender_id, receiver_id) || '::' || greatest(sender_id, receiver_id) || '::' || procura_id
WHERE procura_id IS NOT NULL;

DROP POLICY IF EXISTS messages_insert_participant ON public.messages;
CREATE POLICY messages_insert_participant ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()::text
  AND procura_id IS NOT NULL
  AND chat_id = least(sender_id, receiver_id) || '::' || greatest(sender_id, receiver_id) || '::' || procura_id
  AND (
    (
      EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid()::text)
      AND EXISTS (
        SELECT 1 FROM public.procuras
        WHERE procuras.id = messages.procura_id
          AND procuras.user_id = auth.uid()::text
      )
      AND EXISTS (
        SELECT 1 FROM public.responses
        WHERE responses.procura_id = messages.procura_id
          AND responses.company_id = messages.receiver_id
          AND responses.status = 'available'
      )
    )
    OR (
      EXISTS (SELECT 1 FROM public.companies WHERE companies.id = auth.uid()::text)
      AND public.buyer_started_chat(messages.chat_id, auth.uid()::text, messages.receiver_id)
    )
  )
);

COMMIT;
