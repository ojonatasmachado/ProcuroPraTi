self.addEventListener('message', (event) => {
  if (event.data?.type !== 'APP_VISIBILITY' || !event.source?.id) return;
  self.appVisibilityByClient ||= new Map();
  self.appVisibilityByClient.set(event.source.id, {
    visible: event.data.visible === true,
    updatedAt: Date.now(),
  });
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || 'Você recebeu uma nova atualização.' };
  }

  event.waitUntil((async () => {
    if (payload.kind === 'chat_message') {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const now = Date.now();
      const visibleWindows = windows.filter((client) => {
        const appState = self.appVisibilityByClient?.get(client.id);
        return appState?.visible === true
          && now - appState.updatedAt < 15000
          && client.visibilityState === 'visible'
          && client.focused === true;
      });
      if (visibleWindows.length > 0) {
        visibleWindows.forEach(client => client.postMessage({ type: 'CHAT_MESSAGE_RECEIVED' }));
        return;
      }
    }

    const title = payload.title || 'Nova atualização';
    const options = {
      body: payload.body || 'Há uma nova atualização esperando por você.',
      icon: '/pwa-192x192-v2.png',
      badge: '/pwa-192x192-v2.png',
      tag: payload.tag || 'procuro-pra-ti',
      renotify: Boolean(payload.renotify),
      data: { url: payload.url || '/' },
    };
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        return existing.navigate(targetUrl).then((navigatedClient) => (navigatedClient || existing).focus());
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
