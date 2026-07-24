import { supabase } from '@/lib/supabaseClient';

// Evita disparar a mesma assinatura de erro repetidamente num curto espaço de
// tempo (ex: um loop de render quebrado). A agregação por ocorrência já
// acontece no banco (log_ui_error faz upsert), isto aqui só evita bater no
// banco a cada milissegundo enquanto o mesmo erro se repete.
const COOLDOWN_MS = 5000;
const recentlyLogged = new Map();

const appVersion = () => document.querySelector('script[type="module"][src]')?.getAttribute('src') || 'desconhecida';

export function logClientError({ message, componentStack = null, source = 'crash', pagePath = null }) {
  if (!supabase) return;
  const resolvedMessage = String(message || '').trim();
  if (!resolvedMessage) return;
  const resolvedPage = pagePath || window.location.pathname;
  const key = `${source}|${resolvedPage}|${resolvedMessage.slice(0, 300)}`;
  const now = Date.now();
  const last = recentlyLogged.get(key);
  if (last && now - last < COOLDOWN_MS) return;
  recentlyLogged.set(key, now);
  if (recentlyLogged.size > 200) {
    const oldestKey = recentlyLogged.keys().next().value;
    recentlyLogged.delete(oldestKey);
  }

  (async () => {
    try {
      await supabase.rpc('log_ui_error', {
        p_message: resolvedMessage,
        p_component_stack: componentStack,
        p_page_path: resolvedPage,
        p_user_agent: navigator.userAgent,
        p_app_version: appVersion(),
        p_source: source,
      });
    } catch {
      // O registro de telemetria nunca deve interromper o fluxo do usuário.
    }
  })();
}
