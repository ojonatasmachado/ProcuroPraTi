BEGIN;

-- Suporte para buscas limitadas de procuras e mensagens no cliente (em vez de
-- baixar o histórico inteiro da conta a cada carregamento/poll). Os índices
-- abaixo tornam essas buscas (e as checagens de RLS que rodam por trás delas)
-- eficientes em vez de exigir varredura completa das tabelas.

CREATE INDEX IF NOT EXISTS idx_procuras_user_id ON public.procuras (user_id);
CREATE INDEX IF NOT EXISTS idx_procuras_created_at ON public.procuras (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_procuras_status ON public.procuras (status);
CREATE INDEX IF NOT EXISTS idx_responses_procura_id ON public.responses (procura_id);
CREATE INDEX IF NOT EXISTS idx_responses_company_id ON public.responses (company_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages (chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages ("timestamp" DESC);

-- Retorna só as últimas N mensagens de cada conversa em que o usuário
-- autenticado participa, em vez do histórico completo de todas as conversas
-- desde sempre. Substitui "SELECT * FROM messages" no dataService.
-- Usa (ranked.msg).* (linha inteira como composto) em vez de listar colunas
-- manualmente, para não quebrar se a tabela messages ganhar novas colunas.
CREATE OR REPLACE FUNCTION public.recent_messages(p_limit_per_chat integer DEFAULT 150)
RETURNS SETOF public.messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (ranked.msg).*
  FROM (
    SELECT m AS msg, row_number() OVER (PARTITION BY m.chat_id ORDER BY m.timestamp DESC) AS rn
    FROM public.messages m
    WHERE m.sender_id = auth.uid()::text OR m.receiver_id = auth.uid()::text
  ) ranked
  WHERE ranked.rn <= greatest(1, least(coalesce(p_limit_per_chat, 150), 500))
  ORDER BY (ranked.msg).timestamp ASC;
$$;

REVOKE ALL ON FUNCTION public.recent_messages(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recent_messages(integer) TO authenticated;

COMMIT;
