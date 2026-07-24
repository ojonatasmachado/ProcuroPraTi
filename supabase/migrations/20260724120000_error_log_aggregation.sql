BEGIN;

-- Evolui ui_error_events (que hoje só recebe crashes fatais do AppErrorBoundary,
-- e ninguém consegue ver) para: (1) aceitar mais tipos de erro (toast de erro,
-- promise rejeitada sem tratamento, erro global de script) e (2) agregar por
-- "assinatura" do erro em vez de crescer uma linha por ocorrência. Assim o
-- volume de linhas fica limitado a "quantos erros DIFERENTES existem", não a
-- "quantas vezes cada erro aconteceu" — controla custo de armazenamento mesmo
-- se um bug específico disparar milhares de vezes.

ALTER TABLE public.ui_error_events
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'crash',
  ADD COLUMN IF NOT EXISTS occurrences integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS fingerprint text;

ALTER TABLE public.ui_error_events DROP CONSTRAINT IF EXISTS ui_error_events_source_check;
ALTER TABLE public.ui_error_events ADD CONSTRAINT ui_error_events_source_check
  CHECK (source IN ('crash', 'error_toast', 'unhandled_rejection', 'window_error'));

UPDATE public.ui_error_events
SET fingerprint = md5(coalesce(source, '') || '|' || coalesce(page_path, '') || '|' || left(coalesce(message, ''), 300))
WHERE fingerprint IS NULL;
ALTER TABLE public.ui_error_events ALTER COLUMN fingerprint SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ui_error_events_fingerprint_idx ON public.ui_error_events (fingerprint);
CREATE INDEX IF NOT EXISTS ui_error_events_last_seen_idx ON public.ui_error_events (last_seen_at DESC);

DROP FUNCTION IF EXISTS public.log_ui_error(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.log_ui_error(
  p_message text,
  p_component_stack text DEFAULT NULL,
  p_page_path text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_app_version text DEFAULT NULL,
  p_source text DEFAULT 'crash'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message text := left(coalesce(nullif(trim(p_message), ''), 'Erro de interface sem mensagem'), 2000);
  v_page text := left(coalesce(p_page_path, ''), 1000);
  v_source text := CASE WHEN p_source IN ('crash', 'error_toast', 'unhandled_rejection', 'window_error') THEN p_source ELSE 'crash' END;
  v_fingerprint text := md5(v_source || '|' || v_page || '|' || left(v_message, 300));
BEGIN
  INSERT INTO public.ui_error_events (
    fingerprint, user_id, message, component_stack, page_path, user_agent, app_version, source, occurrences, last_seen_at
  ) VALUES (
    v_fingerprint, auth.uid()::text, v_message, left(p_component_stack, 12000), v_page, left(p_user_agent, 2000), left(p_app_version, 200), v_source, 1, now()
  )
  ON CONFLICT (fingerprint) DO UPDATE SET
    occurrences = public.ui_error_events.occurrences + 1,
    last_seen_at = now(),
    message = excluded.message,
    user_id = excluded.user_id,
    component_stack = excluded.component_stack,
    user_agent = excluded.user_agent,
    app_version = excluded.app_version;
END;
$$;

REVOKE ALL ON FUNCTION public.log_ui_error(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_ui_error(text, text, text, text, text, text) TO anon, authenticated;

COMMIT;
