const CACHE_NAME = 'fashionops-shell-v8';
const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/styles.css',
  '/ux.css',
  '/global-ux.css?v=6',
  '/favicon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

function canCacheNavigation(url) {
  return !url.search
    && !url.pathname.startsWith('/community')
    && !url.pathname.startsWith('/api/');
}

async function navigationResponse(event, request, url) {
  try {
    const response = await event.preloadResponse || await fetch(request);
    if (response.ok && canCacheNavigation(url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    if (canCacheNavigation(url)) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    return caches.match('/offline.html');
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(event, request, url));
    return;
  }

  if (/\.(?:css|js|svg|png|jpg|jpeg|webp|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const refreshed = fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()))
              .catch(() => {});
          }
          return response;
        }).catch(() => cached);
        return cached || refreshed;
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
