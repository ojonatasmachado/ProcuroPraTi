const PUSH_DESTINATIONS = new Set(['mensagem', 'respostas', 'procuras']);

export const parsePushDestination = (search = '') => {
  const params = new URLSearchParams(search);
  const type = params.get('destino');
  if (!PUSH_DESTINATIONS.has(type)) return null;

  return {
    type,
    procuraId: params.get('procura') || null,
    userId: params.get('usuario') || null,
    messageId: params.get('mensagem') || null,
  };
};

export const getCurrentPushDestination = () => (
  typeof window === 'undefined' ? null : parsePushDestination(window.location.search)
);

export const clearPushDestinationFromUrl = () => {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, '', window.location.pathname || '/');
};
