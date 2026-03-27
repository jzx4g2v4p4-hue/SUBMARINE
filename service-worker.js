/* ════════════════════════════════════════════════════════
   SUBLIMINAL FORGE v2 — service-worker.js
   Offline shell caching for GitHub Pages / PWA
   ════════════════════════════════════════════════════════ */

const CACHE = 'sf-v2-shell-2';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

/* ── INSTALL ─────────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH ───────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Don't cache cross-origin (fonts from Google, etc.) or audio files
  if (url.origin !== self.location.origin) return;
  if (/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(url.pathname)) return;

  // Cache-first for shell; network-first for everything else
  const isShell = SHELL.some(s => url.pathname.endsWith(s.replace('./', '')) || url.pathname === '/' + s.replace('./', ''));

  if (isShell) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)).then(res => {
        return res || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined);
      })
    );
  }
});
