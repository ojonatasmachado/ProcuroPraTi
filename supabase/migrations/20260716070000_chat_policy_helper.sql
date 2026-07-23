CREATE OR REPLACE FUNCTION public.buyer_started_chat(p_chat_id text, p_company_id text, p_buyer_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM messages
    WHERE chat_id = p_chat_id
      AND sender_id = p_buyer_id
      AND receiver_id = p_company_id
  );
$$;

REVOKE ALL ON FUNCTION public.buyer_started_chat(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buyer_started_chat(text, text, text) TO authenticated;

DROP POLICY IF EXISTS messages_insert_participant ON messages;
CREATE POLICY messages_insert_participant ON messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()::text
  AND (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text)
    OR public.buyer_started_chat(messages.chat_id, auth.uid()::text, messages.receiver_id)
  )
);
