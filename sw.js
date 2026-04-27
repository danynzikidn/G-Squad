// ATHLETE — Service Worker v1
const CACHE = 'athlete-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Réception d'une notification push (depuis serveur ou schedulée)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'ATHLETE';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-72.png',
    tag: data.tag || 'athlete-notif',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification → ouvre l'app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Message depuis l'app (ex: programmer un rappel inactivité)
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_REMINDER') {
    const delay = e.data.delay || 0;
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification('💪 ATHLETE', {
          body: e.data.body || 'Tu n\'as pas fait de séance depuis 2 jours. C\'est parti !',
          icon: '/icon-192.png',
          tag: 'inactivity-reminder',
          vibrate: [100, 50, 100, 50, 200]
        });
      }, delay);
    }
  }
});
