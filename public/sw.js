// Service worker intentionally disables the old app-shell cache.
// The previous cache-first strategy served stale index.html after deploys,
// which could point at removed Vite bundles and produce a blank white screen.
const CACHE_PREFIX = 'toabh-talent-';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url))))
  );
});

self.addEventListener('fetch', () => {
  // No-op: let the browser/network handle requests normally.
});
