/* Simpanan halaman pemuat aplikasi kunjungan lapangan (9 Okt 2026).
   Cuma menyimpan berkas kecil di folder ini (pemuat, manifest, ikon), supaya
   aplikasi tetap terbuka saat sinyal mati. Panggilan ke server (POST ke
   script.google.com) tidak pernah lewat sini dan tidak pernah disimpan.

   Ambil dari internet dulu, simpanan cuma cadangan. Kejadian 9 Okt malam:
   perbaikan pemuat baru sampai ke HP sesudah dibuka beberapa kali, karena
   simpanan lama selalu dipakai lebih dulu. Untuk perbaikan darurat itu tidak
   bisa diterima. Pemuatnya 8 KB, jadi mengambilnya tiap buka tidak terasa. */
var SIMPANAN = "lap-pemuat-v2";
var BERKAS = ["./", "./index.html", "./manifest.webmanifest", "./ikon-192.png", "./ikon-512.png"];
var BATAS_JARINGAN = 4000;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(SIMPANAN).then(function (c) { return c.addAll(BERKAS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== SIMPANAN; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  e.respondWith(caches.open(SIMPANAN).then(function (c) {
    /* no-cache: tanya server apakah berkasnya berubah, jangan percaya simpanan
       HTTP GitHub Pages yang bisa basi sampai 10 menit. */
    var jaringan = fetch(r, { cache: "no-cache" }).then(function (res) {
      if (res && res.ok) c.put(r, res.clone());
      return res;
    });
    var cadangan = new Promise(function (ok) {
      setTimeout(function () { c.match(r, { ignoreSearch: true }).then(ok); }, BATAS_JARINGAN);
    });
    return Promise.race([jaringan.catch(function () { return c.match(r, { ignoreSearch: true }); }), cadangan.then(function (ada) { return ada || jaringan; })])
      .then(function (res) { return res || c.match(r, { ignoreSearch: true }); });
  }));
});
