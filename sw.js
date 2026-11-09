/* ZELDO: фото на телефоне (09.11.2026, владелец: «картинки не сразу прогружаются»).
   Фото каталога (img/L, img/M, img/P, img/A) после первой загрузки лежат в кэше телефона и при следующем показе берутся оттуда сразу, без сети.
   Имя файла — id снимка, содержимое под одним именем не меняется, поэтому кэш не устаревает.
   Страницы, данные и всё остальное этот файл не трогает: они всегда идут из сети, свежие. */
const CACHE = 'zeldo-img-v1';
const IMG = /\/img\/[A-Z]\/[\w.-]+\.(webp|jpg)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('zeldo-img') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin || !IMG.test(u.pathname)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(r, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(r);
    if (res.ok) c.put(r, res.clone());
    return res;
  })());
});
