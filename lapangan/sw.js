/* Simpanan halaman pemuat aplikasi kunjungan lapangan (9 Okt 2026).
   Cuma menyimpan berkas kecil di folder ini (pemuat, manifest, ikon), supaya
   aplikasi tetap terbuka saat sinyal mati. Panggilan ke server (POST ke
   script.google.com) tidak pernah lewat sini dan tidak pernah disimpan.

   10 Okt 2026: simpanan dulu, jaringan di latar. Sebelumnya jaringan dulu
   dengan batas 4 detik, dan di gerai bersinyal lemah itu berarti petugas
   menatap layar kosong sampai 4 detik sebelum aplikasinya muncul. Sekarang
   pemuat dari HP langsung dipakai, versi terbarunya diambil diam-diam dan
   berlaku di bukaan berikutnya (uji G14 dan G20). Kunci simpanan tanpa
   ?parameter supaya ?mode=atasan dan alamat polos memakai salinan yang sama. */
var SIMPANAN = "lap-pemuat-v3";
var BERKAS = ["./", "./index.html", "./manifest.webmanifest", "./ikon-192.png", "./ikon-512.png"];

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
  var kunci = u.origin + u.pathname;
  e.respondWith(caches.open(SIMPANAN).then(function (c) {
    return c.match(kunci).then(function (ada) {
      /* no-cache: tanya server apakah berkasnya berubah, jangan percaya
         simpanan HTTP yang bisa basi sampai 10 menit. */
      var jaringan = fetch(r, { cache: "no-cache" }).then(function (res) {
        if (res && res.ok) return c.put(kunci, res.clone()).then(function () { return res; });
        return res;
      });
      if (ada) { e.waitUntil(jaringan.catch(function () {})); return ada; }
      return jaringan.catch(function () { return c.match(kunci); });
    });
  }));
});
