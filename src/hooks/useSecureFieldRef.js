import { useEffect, useRef } from 'react';

/**
 * Password/PIN fields toggle both `type` and an inline `-webkit-text-security`
 * style to mask/reveal content. Safari on iOS has a long-standing bug where it
 * doesn't repaint `-webkit-text-security` after a style-only change, so the
 * field keeps showing dots even though the DOM says otherwise. Forcing a
 * remount (via a `key` tied to `visible`) fixes the repaint, but the new node
 * loses focus. This hook refocuses it (skipping the very first mount) so the
 * remount stays invisible to the user.
 */
export const useSecureFieldRef = (visible) => {
  const ref = useRef(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const end = el.value.length;
    try { el.setSelectionRange(end, end); } catch { /* selection not supported for this input type */ }
  }, [visible]);

  return ref;
};
