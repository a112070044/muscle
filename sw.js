/* 肌肉教練：離線快取。網頁本身每次先上網拿最新版（沒網路才用快取），其他檔案先用快取、背景再更新。 */
const VERSION = 'muscle-v2';
const CORE = ['./', './vendor/three.min.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.anthropic.com') return;           /* AI 教練一定要連網，不快取 */

  if (req.mode === 'navigate') {                               /* 網頁本身：網路優先 */
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put('./', res.clone());
        return res;
      } catch (e) {
        return (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {                             /* 其他：快取優先，背景更新 */
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    const update = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }).catch(() => hit || Response.error());
    return hit || update;
  })());
});
