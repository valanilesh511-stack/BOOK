const CACHE_NAME = 'mridu-v1.0.0';
const SHELL_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/192.png',
  '/512.png'
];

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@300;400;500;600;700&family=Noto+Serif+Devanagari:wght@400;600;700&family=Noto+Sans+Gujarati:wght@300;400;500;600;700&family=Noto+Serif+Gujarati:wght@400;600;700&family=Mukta:wght@300;400;500;600;700&family=Hind:wght@300;400;500;600;700&family=Baloo+2:wght@400;500;600;700&family=Kalam:wght@300;400;700&family=Merriweather:wght@300;400;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(SHELL_ASSETS);
      for (const url of FONT_URLS) {
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (res.ok) await cache.put(url, res);
        } catch (e) {}
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request, { mode: 'cors' }).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => cached || new Response('', { status: 503 }));
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
