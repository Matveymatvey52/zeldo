/* ZELDO: работа как у приложения на телефоне.
   09.11.2026, владелец: «картинки не сразу прогружаются» — фото каталога (img/L, img/M, img/P, img/A) после первой загрузки лежат
   в памяти телефона и показываются сразу, без сети. Имя файла — id снимка, содержимое под одним именем не меняется.
   10.11.2026, Максим (голосовое 08.11): «даже если нет интернета, он может зайти… увидеть календарь свой… как реальное мобильное приложение».
   Поэтому страница приложения и последние данные (/api/state рабочей версии) тоже запоминаются: сначала сеть, без сети — сохранённое.
   Всё остальное (вход, отправка, файлы переписки) этот файл не трогает: оно всегда идёт в сеть. При выходе данные стираются (zeldo-data). */
const IMG = 'zeldo-img-v1', APP = 'zeldo-app-v1', DATA = 'zeldo-data-v1';
const IMG_RE = /\/img\/[A-Z]\/[\w.-]+\.(webp|jpg)$/;
const SHELL = ['./', 'index.html', 'customer.html', 'executor.html', 'cust.webmanifest', 'exec.webmanifest', 'zeldo.webmanifest', 'app.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(APP);
  /* что есть на этом сервере, то и запоминаем: на сайте одни страницы, в рабочей версии — другие */
  await Promise.all(SHELL.map(u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? c.put(u, r) : null).catch(() => null)));
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (/^zeldo-/.test(k) && ![IMG, APP, DATA].includes(k)) await caches.delete(k);
  await self.clients.claim();
})()));
/* сначала сеть; ответ запоминаем; нет сети — отдаём сохранённое */
async function netFirst(req, name) {
  const c = await caches.open(name);
  try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
  catch (e) { const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('./') : null); if (hit) return hit; throw e; }
}
self.addEventListener('fetch', e => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  if (IMG_RE.test(u.pathname)) {
    e.respondWith((async () => { const c = await caches.open(IMG); const hit = await c.match(r, { ignoreSearch: true }); if (hit) return hit; const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; })());
    return;
  }
  if (u.pathname.endsWith('/api/state')) { e.respondWith(netFirst(r, DATA)); return; }
  if (r.mode === 'navigate' || /\.(html|webmanifest)$/.test(u.pathname) || /\/$/.test(u.pathname)) { e.respondWith(netFirst(r, APP)); return; }
});
/* выход из аккаунта — сохранённые данные стираются */
self.addEventListener('message', e => { if (e.data === 'zeldo-logout') e.waitUntil(caches.delete(DATA)); });
