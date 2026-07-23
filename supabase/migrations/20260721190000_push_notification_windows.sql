BEGIN;

CREATE TABLE IF NOT EXISTS public.push_notification_windows (
  recipient_id text NOT NULL,
  channel text NOT NULL,
  context_id text NOT NULL,
  last_sent_at timestamptz,
  pending_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipient_id, channel, context_id)
);

ALTER TABLE public.push_notification_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_notification_windows FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_push_notification_window(
  p_recipient_id text,
  p_channel text,
  p_context_id text,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_sent_at timestamptz;
  v_now timestamptz := clock_timestamp();
BEGIN
  INSERT INTO public.push_notification_windows (recipient_id, channel, context_id)
  VALUES (p_recipient_id, p_channel, p_context_id)
  ON CONFLICT (recipient_id, channel, context_id) DO NOTHING;

  SELECT last_sent_at INTO previous_sent_at
  FROM public.push_notification_windows
  WHERE recipient_id = p_recipient_id AND channel = p_channel AND context_id = p_context_id
  FOR UPDATE;

  IF previous_sent_at IS NULL OR previous_sent_at <= v_now - make_interval(secs => greatest(1, p_window_seconds)) THEN
    UPDATE public.push_notification_windows
    SET last_sent_at = v_now, pending_count = 0, updated_at = v_now
    WHERE recipient_id = p_recipient_id AND channel = p_channel AND context_id = p_context_id;
    RETURN true;
  END IF;

  UPDATE public.push_notification_windows
  SET pending_count = pending_count + 1, updated_at = v_now
  WHERE recipient_id = p_recipient_id AND channel = p_channel AND context_id = p_context_id;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_push_notification_window(text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_notification_window(text, text, text, integer) TO service_role;

COMMIT;
