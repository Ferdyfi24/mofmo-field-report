/* Service worker WMS (12 Okt 2026): kerangka situs tetap terbuka tanpa sinyal.
 * Jaringan dulu, simpanan perangkat cuma cadangan saat tidak ada sinyal, jadi
 * versi baru selalu terpakai begitu ada sinyal. Hanya GET di situs ini
 * sendiri; Apps Script dan Supabase tidak pernah disimpan di sini. */
var SIMPAN = 'wms-kerangka-1';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n.indexOf('wms-kerangka-') === 0 && n !== SIMPAN; }).map(function (n) { return caches.delete(n); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var q = e.request, u;
  try { u = new URL(q.url); } catch (er) { return; }
  if (q.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(fetch(q).then(function (r) {
    if (r && r.ok && r.type === 'basic') { var salin = r.clone(); caches.open(SIMPAN).then(function (c) { return c.put(q, salin); }); }
    return r;
  }, function () {
    return caches.match(q, { ignoreSearch: true }).then(function (r) { return r || (q.mode === 'navigate' ? caches.match('./', { ignoreSearch: true }) : undefined) || Response.error(); });
  }));
});
