/* global clients */

self.addEventListener('push', (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  payload = payload || {};

  const title = payload.title || 'MedWatch';
  const options = {
    body: payload.body || 'You have a new alert.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: {
      url: payload.url || '/',
      ...payload,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          const maybeNavigate = 'navigate' in client ? client.navigate(targetUrl) : Promise.resolve();
          return Promise.resolve(maybeNavigate).then(() => client.focus());
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
