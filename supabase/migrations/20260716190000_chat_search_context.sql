BEGIN;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS procura_id text REFERENCES public.procuras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_procura_id_idx ON public.messages(procura_id);

COMMIT;
