/* Simpanan halaman pemuat aplikasi kunjungan lapangan (9 Okt 2026).
   Cuma menyimpan berkas kecil di folder ini (pemuat, manifest, ikon), supaya
   aplikasi terbuka tanpa menunggu jaringan. Panggilan ke server (POST ke
   script.google.com) tidak pernah lewat sini dan tidak pernah disimpan. */
var SIMPANAN = "lap-pemuat-v1";
var BERKAS = ["./", "./index.html", "./manifest.webmanifest", "./ikon-192.png", "./ikon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(SIMPANAN).then(function (c) { return c.addAll(BERKAS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== SIMPANAN; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Ambil dari simpanan dulu supaya cepat, lalu perbarui simpanan di belakang.
   Versi pemuat yang baru berlaku di bukaan berikutnya. */
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  e.respondWith(caches.open(SIMPANAN).then(function (c) {
    return c.match(r, { ignoreSearch: true }).then(function (ada) {
      var baru = fetch(r).then(function (res) {
        if (res && res.ok) c.put(r, res.clone());
        return res;
      }).catch(function () { return ada; });
      return ada || baru;
    });
  }));
});
