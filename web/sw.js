// sw.js – Macht Halmhauer installierbar und offline spielbar.
// Strategie: erst das Netz fragen (damit Änderungen sofort ankommen), nur ohne Netz aus dem Speicher.
// Bei neuen Dateien die Liste unten ergänzen und STAND hochzählen.

const STAND = 'halmhauer-14';
const DATEIEN = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/main.js', 'js/config.js', 'js/hilfe.js', 'js/grafik.js', 'js/welt.js', 'js/spiel.js',
  'js/eingabe.js', 'js/ui.js', 'js/ton.js', 'js/musik.js', 'js/hoehle.js', 'js/hoehlengrafik.js', 'js/begleiter.js', 'js/stube.js',
  'audio/wald.mp3',
  'icons/icon-32.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STAND).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n.startsWith('halmhauer-') && n !== STAND).map(n => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(antw => {
        if (antw.ok) { const kopie = antw.clone(); caches.open(STAND).then(c => c.put(req, kopie)); }
        return antw;
      })
      // ?geld=… & Co. sollen offline trotzdem die Seite finden
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
