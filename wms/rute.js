/* Rute kunjungan WMS Mofmofriends (12 Okt 2026): dibuka dari panel Jadwal.
 *
 * Ferdy: rute "keduanyaa".
 *  1. Urutan dari koordinat: tiap hari kerja di pekan terpilih, gerai yang
 *     dijadwalkan diurutkan dari HO ke gerai terdekat berikutnya (jarak
 *     lurus, rumus haversine), lalu dibuka di Google Maps lewat tautan
 *     petunjuk arah (tanpa kunci API).
 *  2. Waktu tempuh nyata: tombol "Hitung waktu tempuh" bertanya ke Apps
 *     Script (hitungRute, layanan Maps), untuk urutan itu atau urutan
 *     tercepat menurut Google. Perkiraan jam tiba memakai jam berangkat dan
 *     lama di gerai yang bisa diubah, dan menandai kedatangan di luar jendela
 *     13.00 sampai 20.00 WIB yang dijanjikan ke mitra.
 * Koordinat dari Master Lokasi (bacaKoordinatGerai), disimpan juga di perangkat.
 * Gerai tanpa koordinat tidak pernah dilewati diam-diam: disebut namanya.
 * Lembar ini cuma membaca.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !(M().bhs && M().bhs() === 'en'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return W.document.getElementById(i); }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function dua(n) { return (n < 10 ? '0' : '') + n; }
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], HARI_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function hariKe(t) { return new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10))).getUTCDay(); }
  function geser(t, n) { return new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10) + n)).toISOString().slice(0, 10); }
  function senin(t) { return geser(t, -((hariKe(t) + 6) % 7)); }
  function tglTeks(t) { return (id() ? HARI : HARI_EN)[hariKe(t)] + ' ' + (+t.slice(8, 10)) + ' ' + BLN[+t.slice(5, 7) - 1]; }
  function hariIni() { var d = new Date(); return d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-' + dua(d.getDate()); }
  function judul(s) { return String(s || '').toLowerCase().split(/\s+/).map(function (w) { return /^(tk|maa|pik|gi|pim|sgi|ho|cp)$/.test(w) ? w.toUpperCase() : (w ? w.charAt(0).toUpperCase() + w.slice(1) : w); }).join(' ').replace(/^Toys Kingdom( Living World)?\s*/, 'TK ').replace(/\bMall\s*/g, '').trim(); }

  /* ---------- hitungan ---------- */
  function jarakKm(a, b) {
    var R = 6371.0088, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  /* Tetangga terdekat dari titik awal. Gerai tanpa koordinat dipisah. */
  function urutkan(awal, kode, titik) {
    var ada = kode.filter(function (k) { return titik[k]; }), tanpa = kode.filter(function (k) { return !titik[k]; }), hasil = [], kini = awal, total = 0;
    var sisa = ada.slice();
    if (!kini && sisa.length) { kini = titik[sisa[0]]; hasil.push({ kode: sisa[0], km: 0 }); sisa.shift(); }
    while (sisa.length) {
      var best = 0, bd = Infinity;
      sisa.forEach(function (k, i) { var d = jarakKm(kini, titik[k]); if (d < bd - 1e-9) { bd = d; best = i; } });
      var k = sisa.splice(best, 1)[0]; hasil.push({ kode: k, km: bd }); total += bd; kini = titik[k];
    }
    return { urutan: hasil, tanpa: tanpa, km: total };
  }
  function tautanMaps(awal, urutan, titik) {
    var pt = function (t) { return t.lat + ',' + t.lng; };
    var semua = urutan.map(function (x) { return titik[x.kode]; });
    if (!semua.length) return '';
    var asal = awal || semua[0], dari = awal ? semua : semua.slice(1);
    if (!dari.length) return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(pt(asal));
    var tujuan = dari[dari.length - 1], singgah = dari.slice(0, -1);
    return 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(pt(asal)) + '&destination=' + encodeURIComponent(pt(tujuan)) +
      (singgah.length ? '&waypoints=' + encodeURIComponent(singgah.map(pt).join('|')) : '') + '&travelmode=driving';
  }
  function menit(teks) { var m = String(teks || '').match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : 720; }
  function jamTeks(mnt) { mnt = Math.round(mnt); return dua(Math.floor(mnt / 60) % 24) + '.' + dua(mnt % 60); }
  /* jam tiba tiap gerai: berangkat + tempuh kaki, ditambah lama di gerai sebelumnya */
  function perkiraanTiba(legs, mulaiMnt, lamaMnt) {
    var t = mulaiMnt, out = [];
    legs.forEach(function (l, i) { t += (Number(l.detik) || 0) / 60; out.push({ kode: l.ke, tiba: t, luar: t < 13 * 60 || t > 20 * 60 }); t += lamaMnt; });
    return out;
  }

  /* ---------- teks ---------- */
  var TS = {
    id: { judul: 'Rute kunjungan', sub: 'Urutan tiap hari dari koordinat gerai, buka di Google Maps, dan waktu tempuh nyata dari Google.', tutup: 'Tutup', pekan: 'Pekan', kosong: 'Tidak ada kunjungan di pekan ini.',
      berangkat: 'Berangkat', lama: 'Lama di gerai (menit)', maps: 'Buka di Google Maps', hitung: 'Hitung waktu tempuh', tercepat: 'Cari urutan tercepat', pakai: 'Pakai urutan ini',
      lurus: function (k) { return '± ' + k + ' km jarak lurus'; }, totalLurus: function (k) { return 'Total ± ' + k + ' km jarak lurus'; }, dariHo: 'dari HO', tanpaKoor: function (x) { return 'Belum berkoordinat di Master Lokasi: ' + x + '. Tidak ikut di rute dan tautan.'; },
      hoKosong: 'HO belum berkoordinat di Master Lokasi, jadi rute dimulai dari gerai pertama. Isi kolom Lat dan Lng baris HO supaya rute dimulai dari HO.',
      tempuh: function (m, k) { return m + ' menit · ' + k + ' km berkendara'; }, total: function (m, k) { return 'Total ' + m + ' menit berkendara, ' + k + ' km'; }, macet: 'termasuk perkiraan lalu lintas', tanpaMacet: 'tanpa perkiraan lalu lintas (tanggal sudah lewat)',
      tiba: 'tiba', luar: 'di luar jendela 13.00 sampai 20.00', google: function (u) { return 'Urutan tercepat menurut Google: ' + u; }, sama: 'Urutan dari jarak lurus sudah sama dengan urutan tercepat Google.',
      muat: 'Membaca koordinat gerai…', gagal: 'Koordinat gerai belum bisa dibaca.', belumDeploy: 'Rute menyala setelah Apps Script versi baru di-deploy.', menghitung: 'Bertanya ke Google Maps…', tanpaJadwal: 'Buka Jadwal dulu, lalu tekan Rute.',
      catatan: 'Jarak lurus hanya untuk mengurutkan. Waktu tempuh dari Google Maps saat tombol ditekan, disimpan 6 jam.', rute: 'Rute', simpanan: 'Koordinat dari simpanan HP ini.' },
    en: { judul: 'Visit route', sub: 'Daily order from store coordinates, open in Google Maps, and real travel time from Google.', tutup: 'Close', pekan: 'Week', kosong: 'No visits this week.',
      berangkat: 'Leave at', lama: 'Time at store (min)', maps: 'Open in Google Maps', hitung: 'Get travel time', tercepat: 'Find fastest order', pakai: 'Use this order',
      lurus: function (k) { return '± ' + k + ' km straight line'; }, totalLurus: function (k) { return 'Total ± ' + k + ' km straight line'; }, dariHo: 'from HO', tanpaKoor: function (x) { return 'No coordinates in the Location Master: ' + x + '. Left out of the route and link.'; },
      hoKosong: 'HO has no coordinates in the Location Master, so the route starts at the first store.',
      tempuh: function (m, k) { return m + ' min · ' + k + ' km driving'; }, total: function (m, k) { return 'Total ' + m + ' min driving, ' + k + ' km'; }, macet: 'with traffic estimate', tanpaMacet: 'without traffic (date has passed)',
      tiba: 'arrive', luar: 'outside the 13.00 to 20.00 window', google: function (u) { return 'Fastest order according to Google: ' + u; }, sama: 'The straight-line order already matches Google\'s fastest order.',
      muat: 'Reading store coordinates…', gagal: 'Store coordinates could not be read.', belumDeploy: 'Routes turn on after the new Apps Script version is deployed.', menghitung: 'Asking Google Maps…', tanpaJadwal: 'Open the Schedule first, then press Route.',
      catatan: 'Straight-line distance only orders the stops. Travel time comes from Google Maps when the button is pressed, cached for 6 hours.', rute: 'Route', simpanan: 'Coordinates from this phone.' }
  };
  function T(k) { var d = TS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TS.en[k]; }

  /* ---------- keadaan ---------- */
  var S = { titik: null, tanpa: [], galat: '', pekan: '', mulai: '12:00', lama: 60, hasil: {}, urutGanti: {}, sibuk: {}, dari: null, simpanan: false };
  var K_SIMPAN = 'wms_rute_titik';
  function jadwal() { var A = W.WmsJadwal && W.WmsJadwal._A; return A && A.D ? A : null; }
  function namaGerai(kode) { var A = jadwal(), g = A ? (A.D.gerai || []).filter(function (x) { return x.kode === kode; })[0] : null; return g ? judul(g.nama) : (S.titik && S.titik[kode] && S.titik[kode].nama ? judul(S.titik[kode].nama) : kode); }
  function muatTitik() {
    var A = jadwal(), kode = ['HO'].concat(((A && A.D.gerai) || []).map(function (g) { return g.kode; }));
    S.galat = '';
    return M().jalan('bacaKoordinatGerai', ['WMS-TIKET', kode]).then(function (h) {
      if (!h || h.ok === false) throw new Error((h && h.pesan) || 'koordinat');
      var t = {}; (h.titik || []).forEach(function (x) { t[x.kode] = x; });
      S.titik = t; S.tanpa = h.tanpa || []; S.simpanan = false;
      try { W.localStorage.setItem(K_SIMPAN, JSON.stringify({ titik: t, tanpa: S.tanpa })); } catch (e) {}
    }).catch(function (e) {
      var c = null; try { c = JSON.parse(W.localStorage.getItem(K_SIMPAN) || 'null'); } catch (e2) { c = null; }
      if (c && c.titik) { S.titik = c.titik; S.tanpa = c.tanpa || []; S.simpanan = true; return; }
      S.galat = String(e && e.message || e);
    });
  }
  function pekanAda(A) {
    var p = {}; Object.keys(A.isi || {}).forEach(function (t) { if ((A.isi[t] || []).length) p[senin(t)] = 1; });
    return Object.keys(p).sort();
  }
  function hariPekan(A, s) { var o = []; for (var i = 0; i < 7; i++) { var t = geser(s, i); if ((A.isi[t] || []).length) o.push(t); } return o; }

  /* ---------- lembar ---------- */
  function pastikanDom() {
    if (el('rute')) return el('rute');
    var d = W.document.createElement('div');
    d.id = 'rute'; d.className = 'alat-latar rute-latar'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="lembar" role="dialog" aria-modal="true" tabindex="-1"><div id="ruteIsi"></div></div>';
    W.document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      if (e.target === d) { tutup(); return; }
      var x = e.target.closest ? e.target.closest('[data-rute],[data-rute-pekan],[data-rute-hitung],[data-rute-pakai]') : null; if (!x) return;
      if (x.hasAttribute('data-rute-pekan')) { bunyi('klik'); S.pekan = x.getAttribute('data-rute-pekan'); gambarIsi(); return; }
      if (x.hasAttribute('data-rute-hitung')) { hitung(x.getAttribute('data-rute-hitung'), x.getAttribute('data-mode') || 'urut'); return; }
      if (x.hasAttribute('data-rute-pakai')) { bunyi('klik'); var t = x.getAttribute('data-rute-pakai'), h = S.hasil[t + '|optimal']; if (h) { S.urutGanti[t] = h.urutan.slice(); S.hasil[t + '|urut'] = h; } gambarIsi(); return; }
      var a = x.getAttribute('data-rute');
      if (a === 'tutup') tutup(); else if (a === 'ulang') { bunyi('klik'); gambar(); }
    });
    d.addEventListener('change', function (e) {
      var g = e.target; if (!g) return;
      if (g.id === 'ruteMulai') { S.mulai = /^\d{2}:\d{2}$/.test(g.value) ? g.value : '12:00'; S.hasil = {}; gambarIsi(); }
      if (g.id === 'ruteLama') { var n = Number(g.value); S.lama = n >= 0 && n <= 480 ? Math.round(n) : 60; gambarIsi(); }
    });
    W.document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('buka')) { e.preventDefault(); e.stopPropagation(); tutup(); } }, true);
    return d;
  }
  function buka() {
    var d = pastikanDom();
    if (!d.classList.contains('buka')) S.dari = W.document.activeElement;
    d.classList.add('buka'); d.setAttribute('aria-hidden', 'false'); W.document.body.classList.add('alat-terbuka');
    d.querySelector('.lembar').setAttribute('aria-label', T('judul'));
    bunyi('klik'); S.hasil = {}; S.urutGanti = {};
    gambar();
  }
  function tutup() {
    var d = el('rute'); if (!d) return;
    d.classList.remove('buka'); d.setAttribute('aria-hidden', 'true');
    if (!W.document.querySelector('.alat-latar.buka')) W.document.body.classList.remove('alat-terbuka');
    try { if (S.dari && S.dari.focus) S.dari.focus(); } catch (e) {}
  }
  var IKON_TUTUP = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function gambar() {
    var isi = el('ruteIsi');
    isi.innerHTML = '<div class="kepala-alat lp-kepala"><div class="lp-judul"><h2>' + esc(T('judul')) + '</h2><small>' + esc(T('sub')) + '</small></div><button type="button" class="tutup-alat" data-rute="tutup" aria-label="' + esc(T('tutup')) + '" title="' + esc(T('tutup')) + '">' + IKON_TUTUP + '</button></div><div id="ruteBadan"><p class="ket-alat">' + esc(T('muat')) + '</p></div>';
    if (!jadwal()) { el('ruteBadan').innerHTML = '<p class="ket-alat">' + esc(T('tanpaJadwal')) + '</p>'; return; }
    muatTitik().then(gambarIsi);
  }
  function gambarIsi() {
    var w = el('ruteBadan'), A = jadwal(); if (!w || !A) return;
    if (!S.titik) { var belum = /tidak dibuka|bacaKoordinatGerai|deploy/i.test(S.galat); w.innerHTML = '<div class="tolak-alat" role="alert">' + esc(belum ? T('belumDeploy') : T('gagal') + ' ' + S.galat) + ' <button type="button" class="btn dua" data-rute="ulang">↻</button></div>'; return; }
    var daftar = pekanAda(A);
    if (!daftar.length) { w.innerHTML = '<p class="ket-alat">' + esc(T('kosong')) + '</p>'; return; }
    if (!S.pekan || daftar.indexOf(S.pekan) < 0) { var s0 = senin(hariIni()); S.pekan = daftar.indexOf(s0) > -1 ? s0 : daftar[0]; }
    var ho = S.titik.HO || null;
    var html = '<div class="rt-atur"><span class="lp-label">' + esc(T('pekan')) + '</span>' + daftar.map(function (s) { return '<button type="button" class="chip-alat' + (s === S.pekan ? ' on' : '') + '" data-rute-pekan="' + s + '" aria-pressed="' + (s === S.pekan) + '">' + (+s.slice(8, 10)) + ' ' + BLN[+s.slice(5, 7) - 1] + '</button>'; }).join('') +
      '<label class="lp-isian" for="ruteMulai"><span>' + esc(T('berangkat')) + '</span><input id="ruteMulai" type="time" value="' + esc(S.mulai) + '"></label><label class="lp-isian" for="ruteLama"><span>' + esc(T('lama')) + '</span><input id="ruteLama" type="number" min="0" max="480" step="15" value="' + S.lama + '"></label></div>' +
      (S.simpanan ? '<p class="alat-simpanan">' + esc(T('simpanan')) + '</p>' : '') + (!ho ? '<p class="rt-catatan awas">' + esc(T('hoKosong')) + '</p>' : '');
    html += '<div class="rt-hari-daftar">' + hariPekan(A, S.pekan).map(function (t) { return kartuHari(A, t, ho); }).join('') + '</div><p class="ket-alat">' + esc(T('catatan')) + '</p>';
    w.innerHTML = html;
  }
  function urutanHari(A, t, ho) {
    var kode = (A.isi[t] || []).slice();
    var u = urutkan(ho, kode, S.titik);
    if (S.urutGanti[t]) { var g = S.urutGanti[t].filter(function (k) { return kode.indexOf(k) > -1 && S.titik[k]; }); if (g.length === u.urutan.length) { var prev = ho, km = 0; u.urutan = g.map(function (k, i) { var d = prev ? jarakKm(prev, S.titik[k]) : 0; prev = S.titik[k]; km += d; return { kode: k, km: d }; }); u.km = km; } }
    return u;
  }
  function kartuHari(A, t, ho) {
    var u = urutanHari(A, t, ho), h = S.hasil[t + '|urut'], o = S.hasil[t + '|optimal'], sib = S.sibuk[t];
    var tiba = h && h.ok ? perkiraanTiba(h.legs, menit(S.mulai), S.lama) : [];
    var tibaDari = {}; tiba.forEach(function (x) { tibaDari[x.kode] = x; });
    var legDari = {}; if (h && h.ok) h.legs.forEach(function (l) { legDari[l.ke] = l; });
    var baris = u.urutan.map(function (x, i) {
      var l = legDari[x.kode], ti = tibaDari[x.kode];
      return '<li class="rt-singgah' + (ti && ti.luar ? ' luar' : '') + '" data-rute-kode="' + esc(x.kode) + '"><span class="rt-no">' + (i + 1) + '</span><div><b>' + esc(namaGerai(x.kode)) + '</b><small>' +
        esc(l ? T('tempuh')(Math.round(l.detik / 60), (Math.round(l.meter / 100) / 10).toString().replace('.', id() ? ',' : '.')) : (i === 0 && !ho ? '' : T('lurus')((Math.round(x.km * 10) / 10).toString().replace('.', id() ? ',' : '.')) + (i === 0 ? ' ' + T('dariHo') : ''))) + '</small></div>' +
        (ti ? '<span class="rt-tiba">' + esc(T('tiba')) + ' ' + jamTeks(ti.tiba) + (ti.luar ? '<small>' + esc(T('luar')) + '</small>' : '') + '</span>' : '') + '</li>';
    }).join('');
    var link = tautanMaps(ho, u.urutan, S.titik);
    var ringkas = h && h.ok ? T('total')(Math.round(h.totalDetik / 60), (Math.round(h.totalMeter / 100) / 10).toString().replace('.', id() ? ',' : '.')) + ' · ' + (h.macet ? T('macet') : T('tanpaMacet')) : T('totalLurus')((Math.round(u.km * 10) / 10).toString().replace('.', id() ? ',' : '.'));
    var saranOpt = '';
    if (o && o.ok) { var samaUrut = o.urutan.join() === u.urutan.map(function (x) { return x.kode; }).join(); saranOpt = '<div class="rt-saran"><span>' + esc(samaUrut ? T('sama') : T('google')(o.urutan.map(namaGerai).join(' > ') + ' (' + Math.round(o.totalDetik / 60) + (id() ? ' menit)' : ' min)'))) + '</span>' + (samaUrut ? '' : '<button type="button" class="btn dua kn-kecil" data-rute-pakai="' + t + '">' + esc(T('pakai')) + '</button>') + '</div>'; }
    var galat = (h && !h.ok ? h.pesan : '') || (o && !o.ok ? o.pesan : '');
    return '<section class="rt-hari" data-rute-hari="' + t + '"><header><h3>' + esc(tglTeks(t)) + '</h3><small>' + esc(ringkas) + '</small></header>' +
      (u.urutan.length ? '<ol class="rt-daftar">' + baris + '</ol>' : '') +
      (u.tanpa.length ? '<p class="rt-catatan awas">' + esc(T('tanpaKoor')(u.tanpa.map(namaGerai).join(', '))) + '</p>' : '') + saranOpt +
      (galat ? '<p class="rt-catatan awas" role="alert">' + esc(galat) + '</p>' : '') +
      (u.urutan.length ? '<div class="rt-tombol">' + (link ? '<a class="btn dua kn-kecil" href="' + esc(link) + '" target="_blank" rel="noopener" data-rute-maps="' + t + '">' + esc(T('maps')) + '</a>' : '') +
        '<button type="button" class="btn dua kn-kecil" data-rute-hitung="' + t + '" data-mode="urut"' + (sib ? ' disabled aria-busy="true"' : '') + '>' + esc(sib === 'urut' ? T('menghitung') : T('hitung')) + '</button>' +
        (u.urutan.length > 1 ? '<button type="button" class="btn dua kn-kecil" data-rute-hitung="' + t + '" data-mode="optimal"' + (sib ? ' disabled' : '') + '>' + esc(sib === 'optimal' ? T('menghitung') : T('tercepat')) + '</button>' : '') + '</div>' : '') + '</section>';
  }
  function hitung(t, mode) {
    var A = jadwal(); if (!A || S.sibuk[t]) return;
    var ho = S.titik.HO || null, u = urutanHari(A, t, ho);
    if (!u.urutan.length) return;
    bunyi('klik'); S.sibuk[t] = mode; gambarIsi();
    M().jalan('hitungRute', ['WMS-TIKET', { urutan: u.urutan.map(function (x) { return x.kode; }), tanggal: t, jam: S.mulai, mode: mode, mulai: 'HO' }]).then(function (h) {
      S.hasil[t + '|' + mode] = h && typeof h === 'object' ? h : { ok: false, pesan: T('gagal') };
    }, function (e) { var m = String(e && e.message || e); S.hasil[t + '|' + mode] = { ok: false, pesan: /tidak dibuka|hitungRute|deploy/i.test(m) ? T('belumDeploy') : m }; })
      .then(function () { delete S.sibuk[t]; gambarIsi(); });
  }

  W.WmsRute = { buka: buka, tutup: tutup, judulTombol: function () { return T('rute'); }, _urutkan: urutkan, _jarakKm: jarakKm, _tautanMaps: tautanMaps, _perkiraanTiba: perkiraanTiba };
  /* tombol Rute di panel Jadwal */
  W.document.addEventListener('click', function (e) { var x = e.target && e.target.closest ? e.target.closest('[data-rute-buka]') : null; if (x) { e.preventDefault(); buka(); } });
})();
