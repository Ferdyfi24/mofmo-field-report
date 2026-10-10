/* WMS Mofmofriends (10 Okt 2026).
 *
 * Halaman masuk L4 (papan dok, konveyor, boneka), lalu ISI WMS = papan lama
 * itu sendiri, berkulit L4 (kulit.js). Sebelumnya WMS baru menghitung angka
 * sendiri dari baris buku besar dan cuma punya 10 halaman; Ferdy: "datanya
 * ko ga mirip, fiturnya blm semua jga". Sekarang angka dan fiturnya persis
 * papan lama karena yang jalan memang kode papan lama.
 *
 * Masuk: kode akses diperiksa Supabase dulu (0,2 detik), kalau belum bisa
 * Apps Script yang memutuskan. Sesudah itu cuma tiket bertanda tangan yang
 * dipegang perangkat; tiket yang sama sah di kedua server. */
(function () {
  'use strict';

  var API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
  var APP_LAPANGAN = 'https://mofmo-lapangan.pages.dev/lapangan/';
  var PAPAN_LAMA = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec?lihat=1';
  var SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';

  /* ================= penyimpanan ================= */
  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function ss() { try { return window.sessionStorage; } catch (e) { return null; } }
  function ambil(k) { var a = null; try { a = (ls() && ls().getItem(k)); if (a === null && ss()) a = ss().getItem(k); } catch (e) { a = null; } return a; }
  function taruh(k, v, awet) { try { var s = awet ? ls() : ss(); if (s) s.setItem(k, v); } catch (e) {} }
  function buang(k) { try { if (ls()) ls().removeItem(k); if (ss()) ss().removeItem(k); } catch (e) {} }
  function setelan(k, v) { if (v === undefined) { try { return ls() ? ls().getItem(k) : null; } catch (e) { return null; } } try { if (ls()) ls().setItem(k, v); } catch (e) {} }
  var awet = function () { return ambil('wms_ingat') === '1'; };

  /* ================= bahasa ================= */
  var KAMUS = {
    en: { day: 'Day', night: 'Night', checking: 'Checking…', logout: 'Sign out' },
    id: { day: 'Siang', night: 'Malam', checking: 'Memeriksa…', logout: 'Keluar' }
  };
  function bhs() { return setelan('wms_bhs') === 'id' ? 'id' : 'en'; }
  function t(k) { var d = KAMUS[bhs()]; return (d && d[k]) || KAMUS.en[k] || k; }

  /* ================= suara =================
     Dibuat langsung dengan Web Audio, tanpa berkas suara. Mati kalau
     setelan suara dimatikan. Getar HP ikut untuk scan. */
  var Suara = (function () {
    var ctx = null;
    function nyala() { return setelan('wms_suara') !== 'off'; }
    function c() {
      if (!ctx) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; try { ctx = new A(); } catch (e) { return null; } }
      try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
      return ctx;
    }
    function nada(f, mulai, lama, tipe, vol, f2) {
      var a = c(); if (!a) return;
      try {
        var t0 = a.currentTime + mulai, o = a.createOscillator(), g = a.createGain();
        o.type = tipe || 'sine'; o.frequency.setValueAtTime(f, t0);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + lama);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.06, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + lama);
        o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + lama + 0.03);
      } catch (e) {}
    }
    function main(fn) { return function () { if (nyala()) fn(); window.__wmsSuaraTerakhir = fn.nama; }; }
    var api = {
      klik: function () { nada(1900, 0, 0.03, 'square', 0.02); },
      isi: function () { nada(620, 0, 0.08, 'sine', 0.05, 930); },
      sukses: function () { nada(784, 0, 0.12, 'triangle', 0.07); nada(1175, 0.1, 0.2, 'triangle', 0.07); },
      gagal: function () { nada(330, 0, 0.18, 'sawtooth', 0.035, 240); },
      scanOk: function () { nada(2350, 0, 0.09, 'square', 0.05); },
      scanTolak: function () { nada(220, 0, 0.12, 'square', 0.06); nada(185, 0.16, 0.14, 'square', 0.06); }
    };
    var keluar = { nyala: nyala };
    Object.keys(api).forEach(function (k) { api[k].nama = k; keluar[k] = main(api[k]); });
    return keluar;
  })();
  function getar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* ================= alat kecil ================= */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function gerakBoleh() { try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } }

  /* ================= tema ================= */
  function temaTerpakai() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function pasangTema(p) {
    var j = new Date().getHours();
    var tm = p === 'light' || p === 'dark' ? p : (j >= 6 && j < 18 ? 'light' : 'dark');
    document.body.classList.add('ganti-tema');
    document.documentElement.setAttribute('data-theme', tm);
    setTimeout(function () { document.body.classList.remove('ganti-tema'); }, 450);
    var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', tm === 'dark' ? '#121212' : '#FFFFFF');
  }

  /* ================= server ================= */
  var S = { tiket: ambil('wms_tiket') || '' };
  function kirim(badan, batas) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var tm = ctl ? setTimeout(function () { ctl.abort(); }, batas || 90000) : null;
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(badan), credentials: 'omit', redirect: 'follow', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.text(); })
      .then(function (s) {
        if (tm) clearTimeout(tm);
        var h = null; try { h = JSON.parse(s); } catch (e) { h = null; }
        if (!h || typeof h !== 'object') throw new Error(bhs() === 'id' ? 'Server papan tidak menjawab dengan benar. Kalau WMS baru ini baru dipasang, server papan mungkin belum diperbarui (deploy versi baru).' : 'The board server did not answer properly. If the new WMS was just set up, the board server may not be updated yet (deploy the new version).');
        /* Server papan versi lama tidak mengenal aksi 'wms' dan menjawab tanpa 'pintu'.
           Tanpa pemeriksaan ini jawabannya terbaca sebagai "kode salah". */
        if (!h.pintu) throw new Error(bhs() === 'id' ? 'Server papan belum diperbarui untuk WMS baru. Minta deploy versi baru Apps Script dulu.' : 'The board server is not updated for the new WMS yet. Deploy the new Apps Script version first.');
        if (h.pintu === 'galat') throw new Error(h.pesan || 'Server error.');
        return h.hasil;
      }, function (e) { if (tm) clearTimeout(tm); throw new Error(e && e.name === 'AbortError' ? 'The server took too long. Try again.' : 'Connection lost. Try again when the signal is back.'); });
  }
  /* ---------- Supabase: potret baca cepat ---------- */
  function kirimSupa(badan, batas) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var tm = ctl ? setTimeout(function () { ctl.abort(); }, batas || 20000) : null;
    return fetch(SUPA, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(badan), credentials: 'omit', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (h) { if (tm) clearTimeout(tm); return h; }, function (e) { if (tm) clearTimeout(tm); throw e; });
  }
  function keluarAkun(diam) {
    ['wms_tiket', 'wms_ingat', 'wms_kotor', 'wms_simpan_data', 'wms_simpan_gudang', 'wms_simpan_kiriman', 'wms_simpan_lapangan'].forEach(buang);
    S.tiket = ''; PAPAN.mentah = null; PAPAN.bingkai = null;
    if (!diam) Suara.klik();
    gambar();
  }

  /* ================= boneka mofmof =================
     Foto boneka Mofmofriends asli (dipotong dari foto katalog), bukan
     gambar karangan. Ferdy: "beruangnya kurang lucu", "pakai karakter asli
     Mofmo". Peran: Shiba menyapa dan bersorak, Koala malu saat ada yang
     salah, Bichon menunggu papan dimuat, Angora menemani pesan memuat. */
  function img(n) { return 'img/' + n + '.webp'; }
  function foto(n, kelas, alt) { return '<img class="' + (kelas || '') + '" src="' + img(n) + '" alt="' + esc(alt || '') + '" draggable="false">'; }
  var WAJAH = { diam: 'shiba', cek: 'shiba', senang: 'shiba', sedih: 'koala', mikir: 'shiba' };

  /* ================= halaman: masuk (Mofmo Soft) ================= */
  var putarPapan = null, langkahPapan = 0;
  function tahapGudang() { return bhs() === 'id' ? ['Ambil', 'Kemas', 'Siap kirim', 'Perjalanan', 'Terkirim'] : ['Picking', 'Packing', 'Staging', 'In transit', 'Delivered']; }
  function garisTahap(aktif) {
    return tahapGudang().map(function (n, i) { return '<span class="' + (i < aktif ? 'lewat' : '') + (i === aktif ? ' kini' : '') + '"><i></i>' + esc(n) + '</span>'; }).join('');
  }
  var KATA_BONEKA = {
    en: { diam: 'Mof! Code, please', cek: 'Sniffing the code…', senang: 'Yay! Opening the ledger', sedih: 'Hmm, try that code again' },
    id: { diam: 'Mof! Kodenya dong', cek: 'Lagi diendus…', senang: 'Yay! Buku besar dibuka', sedih: 'Hmm, coba kodenya lagi' }
  };
  var KARDUS = [['bear', 'DO-2610-01', 92], ['lamb', 'SHP-09', 84], ['kr_tiger', 'PO-8800', 96], ['redpanda', 'KIY-PIK', 88], ['mb_collie', 'TGI-305', 80], ['elephant', 'MAA-SGI', 90]];
  function halMasuk() {
    var id = bhs() === 'id', aktif = langkahPapan % 5, tahap = tahapGudang();
    var dus = KARDUS.concat(KARDUS).map(function (k, i) {
      return '<div class="kardus" style="animation-delay:' + (-(i * 0.4) % 2.4).toFixed(2) + 's">' + foto(k[0], 'boneka') + '<div class="badan-kardus" style="width:' + k[2] + 'px"><span class="kode-k">' + k[1] + '</span></div></div>';
    }).join('');
    return '<div class="masuk"><div class="masuk-isi">' +
      '<header class="masuk-atas"><div class="merek"><div class="logo">' + foto('kc_shiba', '', 'Mofmofriends') + '</div><div><b>mofmofriends</b><small>WMS · One Logistics Solutions</small></div></div>' +
      '<div class="alat"><button type="button" class="saklar" data-aksi="tema" aria-label="' + esc(temaTerpakai() === 'dark' ? t('day') : t('night')) + '"><span class="rel"><span class="tombol-rel"></span></span>' + esc(temaTerpakai() === 'dark' ? t('night') : t('day')) + '</button>' +
      '<button type="button" class="saklar" data-aksi="bahasa" aria-label="Language">' + (id ? 'ID' : 'EN') + '</button></div></header>' +
      '<div class="masuk-tengah"><div class="masuk-kiri">' +
      '<span class="lbl">' + (id ? 'Keluar · Dok 01 · HO Haery, Kemang Selatan' : 'Outbound · Dock 01 · HO Haery, Kemang Selatan') + '</span>' +
      '<p class="slogan">' + (id ? 'Setiap boneka, setiap kardus,<br>satu buku besar.' : 'Every plush, every box,<br>one ledger.') + '</p>' +
      '<section class="papan" aria-label="' + (id ? 'Papan dok' : 'Dock board') + '"><div class="papan-kepala"><span class="lbl">' + (id ? 'Hari ini di dok' : 'Today at the dock') + '</span><span class="hidup"><i></i>Live</span></div>' +
      '<div class="papan-kini"><span>' + (id ? 'Sekarang' : 'Now') + '</span><b id="barisTahap">' + esc(tahap[aktif]) + '</b></div>' +
      '<div class="tahap-garis" id="garisTahap">' + garisTahap(aktif) + '</div></section>' +
      '<div class="konveyor" aria-hidden="true"><div class="jalur">' + dus + '</div><div class="rak-kayu"></div></div>' +
      '<span class="lbl">' + (id ? 'Dari HO Haery, Kemang · ke semua gerai dan saluran' : 'From HO Haery, Kemang · to every store and channel') + '</span></div>' +
      '<form class="label-masuk" id="formMasuk" autocomplete="on">' +
      '<div class="gelembung" id="gelembung" role="status">' + esc(KATA_BONEKA[bhs()].diam) + '</div>' +
      '<div class="maskot" id="maskot" data-ekspresi="diam">' + foto(WAJAH.diam, '', '') + '</div>' +
      '<div class="badan"><h1>' + (id ? 'Masuk' : 'Sign in') + '</h1>' +
      '<p class="ket">' + (id ? 'Pakai kode akses dari atasanmu. Kodenya tidak pernah masuk ke alamat.' : 'Use the access code from your manager. It never goes into the address bar.') + '</p>' +
      '<label for="kode" class="judul">' + (id ? 'Kode akses' : 'Access code') + '</label>' +
      '<input id="kode" name="kode" type="password" autocomplete="current-password" placeholder="' + (id ? 'Ketik kodemu' : 'Type your code') + '" required>' +
      '<label class="centang"><input type="checkbox" id="ingat">' + (id ? 'Tetap masuk 7 hari' : 'Keep me signed in for 7 days') + '</label>' +
      '<button type="submit" class="btn" id="tMasuk"><span id="tMasukTeks">' + (id ? 'Buka WMS' : 'Open the WMS') + '</span><span aria-hidden="true">→</span></button>' +
      '<div class="galat" id="galatMasuk" role="alert"></div><div id="capMasuk"></div></div>' +
      '<div class="kaki">' + foto('kr_bear', 'kaki-boneka', '') + '<span>' + (id ? 'Operational PIC? Buka aplikasi lapangan di ' : 'Operational PIC? Open the field app at ') + '<a href="' + APP_LAPANGAN + '">mofmo-lapangan.pages.dev/lapangan</a></span></div></form>' +
      '</div></div>' +
      '</div>';
  }
  function ekspresiBoneka(e) {
    var m = document.getElementById('maskot'), g = document.getElementById('gelembung'); if (!m) return;
    var i = m.querySelector('img'); if (i) i.setAttribute('src', img(WAJAH[e] || 'shiba'));
    m.setAttribute('data-ekspresi', e);
    m.classList.remove('lompat', 'gelengKepala'); void m.offsetWidth;
    if (e === 'senang') m.classList.add('lompat'); if (e === 'sedih') m.classList.add('gelengKepala');
    if (g) { g.textContent = KATA_BONEKA[bhs()][e] || ''; g.style.animation = 'none'; void g.offsetWidth; g.style.animation = ''; }
  }
  /* Kode diperiksa Supabase lebih dulu (0,2 detik). Kalau Supabase belum
     tersambung, menolak, atau tidak terjangkau, Apps Script yang memutuskan:
     sidik kode di Supabase bisa tertinggal beberapa menit setelah kode diganti. */
  function masukServer(kode, ingat) {
    var h1 = null;
    return kirimSupa({ fn: 'masuk', kode: kode, ingat: ingat }, 8000).then(function (h) { h1 = h; }, function () { h1 = null; }).then(function () {
      if (h1 && h1.ok && h1.tiket) return h1;
      if (h1 && /too many/i.test(String(h1.pesan || ''))) throw new Error(h1.pesan);
      return kirim({ aksi: 'wms', fn: 'masuk', kode: kode, ingat: ingat }).then(function (h) {
        if (!h || !h.ok || !h.tiket) throw new Error((h && h.pesan) || 'That access code is not right.');
        return h;
      }, function (e) {
        if (h1 && /not right/i.test(String(h1.pesan || ''))) throw new Error(h1.pesan);
        throw e;
      });
    });
  }
  function pasangMasuk() {
    var f = document.getElementById('formMasuk'); if (!f) return;
    if (putarPapan) clearInterval(putarPapan);
    if (gerakBoleh()) putarPapan = setInterval(function () {
      var b = document.getElementById('barisTahap'), gt = document.getElementById('garisTahap');
      if (!b) { clearInterval(putarPapan); putarPapan = null; return; }
      langkahPapan++; var a = langkahPapan % 5;
      b.textContent = tahapGudang()[a]; b.classList.remove('balik'); void b.offsetWidth; b.classList.add('balik'); if (gt) gt.innerHTML = garisTahap(a);
    }, 2600);
    var inp = document.getElementById('kode');
    inp.addEventListener('input', function () { var g = document.getElementById('galatMasuk'); if (g && g.classList.contains('tolak')) { g.classList.remove('tolak'); g.textContent = ''; ekspresiBoneka('diam'); } });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var id = bhs() === 'id', kode = inp.value, ingat = document.getElementById('ingat').checked;
      var tb = document.getElementById('tMasuk'), tt = document.getElementById('tMasukTeks'), g = document.getElementById('galatMasuk');
      if (!String(kode).trim()) { Suara.scanTolak(); g.className = 'galat tolak'; g.textContent = id ? 'Kode aksesnya masih kosong.' : 'The access code is empty.'; ekspresiBoneka('sedih'); inp.focus(); return; }
      tb.disabled = true; tt.textContent = t('checking'); g.className = 'galat'; g.textContent = ''; ekspresiBoneka('cek'); Suara.klik();
      masukServer(kode, ingat).then(function (h) {
        buang('wms_tiket'); buang('wms_ingat');
        taruh('wms_tiket', h.tiket, ingat); if (ingat) taruh('wms_ingat', '1', true);
        Suara.scanOk(); setTimeout(Suara.sukses, 120); getar(30);
        ekspresiBoneka('senang'); g.className = 'galat ok'; g.textContent = id ? 'Kode diterima. Memuat buku besar.' : 'Code accepted. Loading the ledger.';
        tt.textContent = id ? 'Membuka…' : 'Opening…';
        document.getElementById('capMasuk').innerHTML = '<div class="cap">' + (id ? 'Lolos' : 'Checked') + '</div>' + hujanTapak();
        setTimeout(function () {
          S.tiket = h.tiket;
          gambar();
        }, gerakBoleh() ? 900 : 0);
      }).catch(function (e) {
        Suara.scanTolak(); getar([60, 60, 60]); ekspresiBoneka('sedih');
        g.className = 'galat tolak'; g.textContent = String(e.message || '');
        tb.disabled = false; tt.textContent = id ? 'Buka WMS' : 'Open the WMS';
        inp.style.animation = 'none'; void inp.offsetWidth; inp.style.animation = 'geleng .45s ease'; inp.focus(); inp.select();
      });
    });
    setTimeout(function () { var k = document.getElementById('kode'); if (k) k.focus(); }, 30);
  }

  /* ================= isi WMS: papan lama berkulit L4 =================
     HTML papan lama (halamanPapan_) dicerminkan Apps Script ke Supabase
     dengan kunci 'klien|papan'. Ia dijalankan di bingkai srcdoc (asal yang
     sama dengan halaman ini) dengan pengganti google.script.run:
      - bacaan yang potretnya ada di Supabase dibaca dari sana, kecuali 15
        menit sesudah ada tulisan dari perangkat ini;
      - selain itu, termasuk semua tulisan, lewat Apps Script fn 'panggil'
        (tiket + kata pengganti 'WMS-TIKET'; kode asli dipasang di server);
      - semua HTML (papan dan kiriman server) diwarnai ulang oleh kulit.js.
     Bingkai, bukan document.write: menulis ulang dokumen 1,2 MB di halaman
     induk membekukan Chrome (dicoba 10 Okt pagi), di bingkai tidak. */
  var BACA_PAPAN = { dataPapan: 1, papanSummary: 1, papanInventory: 1, papanPenjualan: 1, papanKiriman: 1, papanKirimanUtama: 1, papanGerakStok: 1,
    obdDaftar: 1, obdSpData: 1, obdIuData: 1, papanGudang: 1, kesehatanPersediaan: 1, papanPerformaSku: 1, dataAlokasi: 1, fapLaporanAtasan: 1 };
  /* Bacaan yang argumen pertamanya bukan kode akses (dicerminkan dengan
     kunci nama|[argumen apa adanya]), misalnya skrip halaman yang ditunda. */
  var BACA_TANPA_KODE = { pdgSkripTunda: 1 };
  /* Nama fungsi papan yang cuma membaca. Sesudah ada panggilan lain (yang
     mungkin menulis), bacaan 15 menit ke depan diambil dari Apps Script
     supaya tidak melihat potret lama. Bacaan yang tidak dicerminkan
     (daftarSuratJalan, pesananTerbuka, persediaanBulanan, ...) tidak boleh
     ikut menandai: pagi 10 Okt satu klik Persediaan membuat seluruh papan
     membaca dari Apps Script. */
  var POLA_BACA = /^(papan|daftar|data|kesehatan|persediaan|permintaan|pesanan|rencana|obd(Daftar|SpData|IuData)$|fap|laporan|baca|ambil|cari|lihat|pdg|hitung|cek|ringkas|riwayat|status|info|muat|wmsFoto)/;
  var LAMA_KOTOR = 15 * 60 * 1000;
  var PAPAN = { mentah: null, tema: '', siap: false, mulai: 0, jaga: null, catat: [] };
  function kotor() { var w = 0; try { w = Number(ss() && ss().getItem('wms_kotor')) || 0; } catch (e) { w = 0; } return Date.now() - w < LAMA_KOTOR; }
  function tandaiKotor() { try { if (ss()) ss().setItem('wms_kotor', String(Date.now())); } catch (e) {} }
  /* Pesan galat yang jujur. Dulu setiap "tidak dibuka untuk WMS" disebut
     "menyala setelah deploy", padahal penyebabnya daftar izin (dokumen gudang
     10 Okt). Sekarang: server lama = deploy; fungsi belum ada di versi yang
     jalan = deploy; fungsi belum masuk izin = disebut namanya. */
  function pesanBelumDeploy(e) {
    var s = String(e && e.message ? e.message : e), id = bhs() === 'id', m;
    if (/not updated for the new WMS|tidak menjawab dengan benar|did not answer properly/i.test(s))
      return id ? 'Fitur ini menyala setelah Apps Script di-deploy versi baru.' : 'This feature turns on after the new Apps Script version is deployed.';
    if ((m = s.match(/Fungsi "(\w+)" tidak ada/)))
      return id ? 'Fitur ini (' + m[1] + ') baru ada di kode Apps Script terbaru, jadi menyala setelah di-deploy versi baru.' : 'This feature (' + m[1] + ') is only in the newest Apps Script code, so it turns on after a new version is deployed.';
    if ((m = s.match(/Fungsi "(\w+)" tidak dibuka untuk WMS/)))
      return id ? 'Fungsi ' + m[1] + ' belum masuk daftar izin WMS. Daftarnya diperbarui otomatis tiap 10 menit; coba lagi sebentar lagi, atau pakai papan lama dulu.' : 'The function ' + m[1] + ' is not on the WMS allow list yet. The list refreshes itself every 10 minutes; try again shortly, or use the old board for now.';
    return s;
  }
  function jalanPapan(nama, args) {
    var gelap = PAPAN.tema === 'dark';
    /* Papan lama kadang memanggil bacaan sebelum masuk selesai, dengan kode
       kosong. Di WMS perangkat ini sudah masuk, jadi kosong = kata pengganti. */
    if (BACA_PAPAN[nama] && args[0] === '') args[0] = 'WMS-TIKET';
    var pakaiKode = args.length && args[0] === 'WMS-TIKET';
    var bisaPotret = (BACA_PAPAN[nama] && pakaiKode || BACA_TANPA_KODE[nama]) && !kotor();
    var kunci = pakaiKode ? nama + '|' + JSON.stringify(['K'].concat(args.slice(1))) : nama + '|' + JSON.stringify(args);
    var cat = { n: nama, t: Date.now(), dari: '' }; PAPAN.catat.push(cat); if (PAPAN.catat.length > 200) PAPAN.catat.shift();
    var tulisan = !BACA_PAPAN[nama] && !BACA_TANPA_KODE[nama] && !POLA_BACA.test(nama);
    garisMuat(1);
    var potret = bisaPotret ? kirimSupa({ fn: 'ambil', tiket: S.tiket, kunci: [kunci] }).then(function (h) {
      var x = h && h.ok && h.isi ? h.isi[kunci] : null; return x ? x.data : undefined;
    }, function () { return undefined; }) : Promise.resolve(undefined);
    return potret.then(function (d) {
      if (d !== undefined) { cat.dari = 'supa'; return d; }
      cat.dari = 'gas';
      if (!BACA_PAPAN[nama] && !BACA_TANPA_KODE[nama] && !POLA_BACA.test(nama)) tandaiKotor();
      return kirim({ aksi: 'wms', fn: 'panggil', tiket: S.tiket, nama: nama, args: args }).then(function (x) {
        if (x && x.perluMasuk) { keluarAkun(true); throw new Error(x.pesan || 'Please sign in again.'); }
        return x;
      }, function (e) { cat.galat = String(e && e.message || e).slice(0, 80); throw new Error(pesanBelumDeploy(e)); });
    }).then(function (x) {
      garisMuat(-1);
      /* bunyi untuk tulisan saja: bacaan terjadi terus di latar dan akan berisik */
      if (tulisan) { if (x && x.ok === false) { Suara.gagal(); maskot('sedih'); } else { Suara.sukses(); maskot('senang'); konfeti(); } }
      return window.KulitPapan ? window.KulitPapan.ubahHasil(x, gelap) : x;
    }, function (e) { garisMuat(-1); if (tulisan) { Suara.gagal(); maskot('sedih'); } throw e; });
  }
  /* Garis muat oren di atas papan: tampil kalau ada panggilan yang belum
     kembali lebih dari 150 ms (supaya bacaan cepat dari Supabase tidak
     membuatnya berkedip). */
  var tundaMuat = 0, waktuGaris = null;
  function garisMuat(d) {
    tundaMuat = Math.max(0, tundaMuat + d);
    var el = document.getElementById('garisMuatAtas'); if (!el) return;
    if (tundaMuat > 0) { if (!waktuGaris) waktuGaris = setTimeout(function () { if (tundaMuat > 0) { el.classList.add('nyala'); if (MK.ekspresi === 'diam') maskot('mikir'); } }, 150); }
    else { clearTimeout(waktuGaris); waktuGaris = null; el.classList.remove('nyala'); if (MK.ekspresi === 'mikir') maskot('diam', ''); }
  }
  /* Papan lama 1,3 MB disimpan di perangkat (Cache Storage) bersama
     versinya. Bukaan berikutnya cuma menanyakan versi (klien|versi, beberapa
     byte); papan diunduh ulang hanya kalau versinya berubah. */
  var SIMPAN_PAPAN = 'wms-papan', ALAMAT_SIMPAN = '/__wms/klien-papan';
  function bacaSimpanPapan() {
    try { if (!window.caches) return Promise.resolve(null); } catch (e) { return Promise.resolve(null); }
    return caches.open(SIMPAN_PAPAN).then(function (c) { return c.match(ALAMAT_SIMPAN); })
      .then(function (r) { return r ? r.json() : null; }).then(function (x) { return x && x.html ? x : null; }, function () { return null; });
  }
  function tulisSimpanPapan(versi, html) {
    try { if (!window.caches) return; } catch (e) { return; }
    caches.open(SIMPAN_PAPAN).then(function (c) { return c.put(ALAMAT_SIMPAN, new Response(JSON.stringify({ versi: versi, html: html, t: Date.now() }), { headers: { 'Content-Type': 'application/json' } })); }).catch(function () {});
  }
  function unduhKlien() {
    return kirimSupa({ fn: 'ambil', tiket: S.tiket, kunci: ['klien|papan'] }, 60000).then(function (h) {
      if (h && h.perluMasuk) throw new Error('tiket');
      var x = h && h.ok && h.isi ? h.isi['klien|papan'] : null;
      if (!x || !x.data || !x.data.html) throw new Error('kosong');
      tulisSimpanPapan(x.data.versi || '', String(x.data.html));
      return String(x.data.html);
    });
  }
  function ambilKlien() {
    if (PAPAN.mentah) return Promise.resolve(PAPAN.mentah);
    return bacaSimpanPapan().then(function (lama) {
      if (!lama) return unduhKlien().then(function (html) { PAPAN.mentah = html; return html; });
      /* versi dicek dulu (cepat); kalau beda atau belum ada, unduh baru */
      return kirimSupa({ fn: 'ambil', tiket: S.tiket, kunci: ['klien|versi'] }, 8000).then(function (h) {
        if (h && h.perluMasuk) throw new Error('tiket');
        var x = h && h.ok && h.isi ? h.isi['klien|versi'] : null;
        if (x && x.data && x.data.versi && x.data.versi === lama.versi) return lama.html;
        return unduhKlien().catch(function (e) { if (e && e.message === 'tiket') throw e; return lama.html; });
      }, function () { return lama.html; }).then(function (html) { PAPAN.mentah = html; return html; });
    });
  }

  /* Dijalankan DI DALAM bingkai papan, sebelum skrip papan mana pun. */
  function PENGGANTI(C) {
    var P = window.parent, H = P.__wmsPapan;
    function pelari(sukses, gagal, obj) {
      var dasar = {
        withSuccessHandler: function (f) { return pelari(f, gagal, obj); },
        withFailureHandler: function (f) { return pelari(sukses, f, obj); },
        withUserObject: function (o) { return pelari(sukses, gagal, o); }
      };
      return new Proxy(dasar, { get: function (t, nama) {
        if (nama in t) return t[nama];
        if (typeof nama !== 'string' || nama === 'then') return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          H.jalan(nama, args).then(function (r) { if (sukses) sukses(r, obj); }, function (e) {
            var er = e instanceof Error ? e : new Error(e && e.message ? e.message : String(e)); if (gagal) gagal(er, obj); else console.error(er);
          });
        };
      } });
    }
    window.google = { script: {
      run: pelari(null, null, undefined),
      url: { getLocation: function (cb) { cb({ hash: '', parameter: {}, parameters: {} }); } },
      host: { origin: location.origin, close: function () {}, setHeight: function () {}, setWidth: function () {}, editor: { focus: function () {} } },
      history: { push: function () {}, replace: function () {}, setChangeHandler: function () {} }
    } };
    /* Halaman papan banyak digambar di shadow root: kulitnya ikut dipasang
       lewat adoptedStyleSheets supaya tidak hilang saat isinya diganti. */
    var gerak = true; try { gerak = !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    /* Angka besar menghitung naik dengan format aslinya ("Rp16,700,902",
       "1,860", "93"); angka berdesimal ("Rp4.58M", "67.87") dibiarkan.
       Teks aslinya dipasang lagi persis di akhir. */
    function hitungNaik(el) {
      if (!gerak || el.__l4) return; el.__l4 = 1;
      var asli = el.textContent.trim(), m = asli.match(/^([^\d-]*)(\d[\d.,]*)([^\d]*)$/);
      if (!m) return;
      var a = m[2], ribu = /\d[.,]\d{3}(?:[.,]|$)/.test(a) ? a.match(/[.,]/)[0] : '';
      if (/[.,]\d{1,2}$/.test(a) || (ribu && a.replace(new RegExp('\\' + ribu, 'g'), '').search(/[.,]/) > -1)) return;
      var nilai = Number(a.replace(/[.,]/g, '')); if (!isFinite(nilai) || nilai < 10) return;
      var bentuk = function (v) { var t = String(Math.round(v)); return ribu ? t.replace(/\B(?=(\d{3})+(?!\d))/g, ribu) : t; };
      var mulai = performance.now(), lama = 750;
      (function langkah(now) { var x = Math.min(1, (now - mulai) / lama), e = 1 - Math.pow(1 - x, 3); if (x < 1) { el.textContent = m[1] + bentuk(nilai * e) + m[3]; requestAnimationFrame(langkah); } else el.textContent = asli; })(mulai);
    }
    var POLA_MUAT = /(not frozen|belum beku|Memuat|Loading)/i;
    /* Foto rak (Ferdy: "ini mana fotonya"). Thumbnail Drive cuma tampil kalau
       login Google ikut terkirim, dan itu tidak terjadi dari pages.dev. Foto
       yang alamatnya Drive diminta lewat server (wmsFotoRak), berkelompok,
       paling banyak 24 sekali minta, dan diingat selama papan terbuka. */
    var FOTO = {}, antreFoto = {}, waktuFoto = null;
    var RE_FOTO = /^https:\/\/drive\.google\.com\/(?:thumbnail\?(?:[^#]*&)?id=|uc\?(?:[^#]*&)?id=|file\/d\/)([A-Za-z0-9_-]{20,80})/;
    function pasangFoto(img, url) { img.setAttribute('data-l4foto', '1'); img.src = url; }
    function cariFoto(n) {
      if (!n || n.nodeType !== 1) return;
      var imgs = n.tagName === 'IMG' ? [n] : Array.prototype.slice.call(n.querySelectorAll ? n.querySelectorAll('img') : []);
      imgs.forEach(function (img) {
        if (img.getAttribute('data-l4foto')) return;
        var m = String(img.getAttribute('src') || '').match(RE_FOTO); if (!m) return;
        if (FOTO[m[1]]) { pasangFoto(img, FOTO[m[1]]); return; }
        img.setAttribute('data-l4foto', 'antre');
        (antreFoto[m[1]] = antreFoto[m[1]] || []).push(img);
      });
      if (!waktuFoto && Object.keys(antreFoto).length) waktuFoto = setTimeout(kirimFoto, 120);
    }
    function kirimFoto() {
      waktuFoto = null;
      var ids = Object.keys(antreFoto).slice(0, 24), tunggu = {};
      ids.forEach(function (id) { tunggu[id] = antreFoto[id]; delete antreFoto[id]; });
      if (!ids.length) return;
      var tandai = function (id, x) { tunggu[id].forEach(function (img) { if (x) pasangFoto(img, x); else img.setAttribute('data-l4foto', 'gagal'); }); };
      H.jalan('wmsFotoRak', ['WMS-TIKET', ids]).then(function (h) {
        var f = (h && h.foto) || {};
        ids.forEach(function (id) { if (f[id]) FOTO[id] = f[id]; tandai(id, f[id]); });
      }, function () { ids.forEach(function (id) { tandai(id, null); }); });
      if (Object.keys(antreFoto).length) waktuFoto = setTimeout(kirimFoto, 120);
    }
    function amati(akar) {
      try { new MutationObserver(function (ms) { ms.forEach(function (mu) {
        if (mu.type === 'attributes') { cariFoto(mu.target); return; }
        Array.prototype.forEach.call(mu.addedNodes, function (n) { periksaBaru(akar, n); });
      }); }).observe(akar, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] }); } catch (e) {}
    }
    /* mata boneka di pojok WMS mengikuti kursor, juga saat kursor di atas papan */
    var mataTunda = false;
    document.addEventListener('mousemove', function (e) {
      if (mataTunda) return; mataTunda = true;
      requestAnimationFrame(function () { mataTunda = false; try { H.mata(e.clientX, e.clientY, true); } catch (er) {} });
    }, { passive: true });
    /* Foto produk di depan nama SKU (Ferdy: "foto skunya dimasukin jg dong"):
       sel tabel yang isinya nama produk, dan sel peta gudang (data-sku). */
    var K = P.KulitPapan || {};
    function pasangSku(n) {
      if (!K.fotoSku || !n.querySelectorAll) return;
      var el = n.matches && n.matches('td,.c[data-sku]') ? [n] : [];
      el = el.concat(Array.prototype.slice.call(n.querySelectorAll('td,.c[data-sku]')));
      el.forEach(function (e) {
        if (e.__l4sku) return; e.__l4sku = 1;
        if (e.querySelector('img.l4-sku')) return;
        var f = K.fotoSku(e.getAttribute('data-sku') || (e.querySelector('table') ? '' : e.textContent));
        if (!f) return;
        var nama = (e.getAttribute('data-sku') || e.textContent || '').trim(), bc = e.getAttribute('data-bc') || '';
        var im = document.createElement('img'); im.className = 'l4-sku'; im.alt = ''; im.loading = 'lazy'; im.setAttribute('src', K.dasar + 'sku/' + f + '.webp');
        /* Paspor SKU (Ferdy: "klik satu SKU, kelihatan perjalanannya"): klik fotonya,
           bukan selnya, supaya klik sel papan yang sudah ada tetap jalan seperti biasa */
        im.title = C.teks.paspor; im.tabIndex = 0; im.setAttribute('role', 'button'); im.setAttribute('aria-label', C.teks.paspor + ': ' + nama);
        var bukaPaspor = function (ev) { ev.preventDefault(); ev.stopPropagation(); H.paspor({ nama: nama, bc: bc }); };
        im.addEventListener('click', bukaPaspor);
        im.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') bukaPaspor(ev); });
        e.insertBefore(im, e.firstChild);
      });
    }
    /* Ferdy: "ganti field op dg Operational PIC". Cuma teks menu, judul,
       tombol, dan kepala tabel; isi data tidak disentuh. */
    var RE_FO = /\bField Op\b/g, RE_FOB = /\bFIELD OP\b/g;
    function gantiNama(n) {
      if (!n) return;
      var tn = [];
      if (n.nodeType === 3) tn = [n];
      else if (n.nodeType === 1) { var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, null); var x; while ((x = w.nextNode())) tn.push(x); }
      tn.forEach(function (t) {
        var v = t.nodeValue, p = t.parentElement; if (!p) return;
        /* papan asli menamai menunya "Lapangan" (EN "Field"); dua duanya jadi "Operational PIC" seperti istilah Ferdy di halaman masuk. Diganti hanya kalau itu seluruh isi teks di menu atau judul, bukan kata "Field" di sel tabel */
        var utuh = v.trim();
        if ((utuh === 'Field' || utuh === 'Lapangan') && p.closest('nav,h1,h2,h3,h4,.h3,header,[role=tab],summary')) { t.nodeValue = v.replace(utuh, 'Operational PIC'); return; }
        if (!/Field Op|FIELD OP/.test(v)) return;
        if (!p.closest('nav,h1,h2,h3,h4,.h3,button,th,header,[role=tab],summary,label')) return;
        t.nodeValue = v.replace(RE_FO, 'Operational PIC').replace(RE_FOB, 'OPERATIONAL PIC');
      });
    }
    function periksaBaru(akar, n) {
      if (n && n.nodeType === 3) { gantiNama(n); return; }
      if (!n || n.nodeType !== 1) return;
      cariFoto(n);
      pasangSku(n);
      gantiNama(n);
      if (n.matches && n.matches('.nil,.stokangka')) hitungNaik(n);
      if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('.nil,.stokangka'), hitungNaik);
      /* pesan memuat papan lama: teks pendek tanpa boneka -> diberi boneka */
      var kandidat = [n].concat(Array.prototype.slice.call(n.querySelectorAll ? n.querySelectorAll('p,div') : []));
      kandidat.forEach(function (el) {
        if (el.querySelector('.l4-boneka') || el.children.length > 2) return;
        var t = el.textContent || ''; if (t.length > 160 || !POLA_MUAT.test(t)) return;
        el.insertAdjacentHTML('afterbegin', C.boneka);
      });
    }
    try {
      var lembar = new CSSStyleSheet(); lembar.replaceSync(C.cssBayang);
      var asli = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (o) {
        var r = asli.call(this, o); try { r.adoptedStyleSheets = [lembar]; } catch (e) {}
        amati(r);
        return r;
      };
    } catch (e) {}
    amati(document.documentElement);
    var coba = 0;
    (function masukOtomatis() {
      var k = document.getElementById('kode');
      if (k && typeof window.buka === 'function') { k.value = 'WMS-TIKET'; try { window.buka(); } catch (e) { console.error(e); } return; }
      if (++coba < 300) setTimeout(masukOtomatis, 50);
    })();
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('a,button,[role=button],summary') : null;
      if (el && !el.hasAttribute('data-wms')) H.klik();
      /* Tautan keluar dari papan (alamat Apps Script, aplikasi lapangan,
         Drive) dibuka di tab baru, supaya WMS tidak tertimpa. Tautan ke
         papan itu sendiri (?lihat=1) diabaikan: papannya sudah terbuka. */
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!/^https?:/i.test(href)) return;
      e.preventDefault();
      if (/script\.google\.com\/.*\/exec\?lihat=1$/.test(href)) return;
      H.bukaTab(href);
    }, true);
    var pernahTampil = false, hilang = 0;
    setInterval(function () {
      var isi = document.getElementById('layarIsi');
      var tampil = !!(isi && isi.getBoundingClientRect().height > 50 && getComputedStyle(isi).display !== 'none');
      if (tampil && !pernahTampil) { pernahTampil = true; H.siap(); pasangAlat(); gantiNama(document.body); if (H.tata) H.tata(window); }
      /* Papan lama keluar sendiri (tombol keluarnya, atau kodenya ditolak):
         layar kodenya muncul lagi. Layar kode itu kita sembunyikan, jadi
         halaman masuk WMS yang ambil alih. */
      var lk = document.getElementById('layarKode');
      hilang = pernahTampil && !tampil && lk && lk.style.display !== 'none' ? hilang + 1 : 0;
      if (hilang >= 3) H.keluar();
    }, 400);
    var IKON = {
      bulan: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
      matahari: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
      scan: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M16.5 8v8"/></svg>',
      menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h11"/></svg>',
      katalog: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-7.1 7.1a1.4 1.4 0 0 1-2 0z"/><circle cx="8.3" cy="8.3" r="1.6"/></svg>',
      kontrol: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5h6v2.5H9zM8.5 12.5l2 2 4.5-4.5M8.5 17.5h7"/></svg>',
      buku: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10.2 5 7.6 4.5 4 4.8v13c3.6-.3 6.2.2 8 1.7 1.8-1.5 4.4-2 8-1.7v-13c-3.6-.3-6.2.2-8 1.7z"/><path d="M12 6.5v13"/></svg>'
    };
    function tombol(teks, label, fn, jenis) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-wms', jenis || '1'); b.setAttribute('aria-label', label); b.title = label; b.textContent = teks;
      b.style.cssText = 'font:800 14px/1 Nunito,"Helvetica Neue",Arial,sans-serif;padding:0 ' + (teks ? 16 : 11) + 'px;margin-left:6px;height:42px;cursor:pointer;display:inline-flex;align-items:center;gap:7px';
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); });
      return b;
    }
    function pasangAlat() {
      var kanan = document.getElementById('kopKanan'); if (!kanan || kanan.querySelector('[data-wms]')) return;
      var sc = tombol('', C.teks.scan, function () { H.alat('scan'); }, 'scan'); sc.innerHTML = IKON.scan + '<span>' + C.teks.scanPendek + '</span>'; sc.style.paddingRight = '15px';
      kanan.appendChild(sc);
      /* Kitabku (10 Okt): event, hadiah, cetak kartu QR paket Shopee, klaim struk gerai */
      var kb = tombol('', C.teks.kitabku, function () { H.kitabku(); }, 'kitabku'); kb.innerHTML = IKON.buku + '<span>Kitabku</span>'; kb.style.paddingRight = '15px';
      kanan.appendChild(kb);
      /* Katalog (11 Okt): semua SKU dan harga jual putus termasuk pajak */
      var kt = tombol('', C.teks.katalog, function () { H.katalog(); }, 'katalog'); kt.innerHTML = IKON.katalog + '<span>' + C.teks.katalogPendek + '</span>'; kt.style.paddingRight = '15px';
      kanan.appendChild(kt);
      /* Kontrol (11 Okt): tutup bulan, rapor mitra, margin, rekonsiliasi, angka janggal, SLA, retur Shopee */
      var kn = tombol('', C.teks.kontrol, function () { H.kontrol(); }, 'kontrol'); kn.innerHTML = IKON.kontrol + '<span>' + C.teks.kontrolPendek + '</span>'; kn.style.paddingRight = '15px';
      kanan.appendChild(kn);
      /* Ikon menunjuk mode TUJUAN (Ferdy: tulisan Day/Night bikin ragu mau klik) */
      var tm = tombol('', C.gelap ? C.teks.keSiang : C.teks.keMalam, function () { H.tema(); }, 'tema'); tm.innerHTML = C.gelap ? IKON.matahari : IKON.bulan;
      kanan.appendChild(tm);
      kanan.appendChild(tombol(C.teks.keluar, C.teks.keluar, function () { H.keluarAkun(); }, 'keluar'));
      pasangLaci();
      pasangSeret();
    }
    /* Dokumen mitra: berkas yang ditarik ke kotak .dokAmbil diteruskan ke input file papan, lalu event change papan sendiri yang membaca */
    function pasangSeret() {
      if (document.__l4Seret) return; document.__l4Seret = true;
      var kotak = function (e) { return e.target && e.target.closest ? e.target.closest('.dokAmbil') : null; };
      ['dragenter', 'dragover'].forEach(function (n) { document.addEventListener(n, function (e) { var z = kotak(e); if (!z) return; e.preventDefault(); z.classList.add('l4-seret'); }); });
      document.addEventListener('dragleave', function (e) { var z = kotak(e); if (z && !z.contains(e.relatedTarget)) z.classList.remove('l4-seret'); });
      document.addEventListener('drop', function (e) {
        var z = kotak(e); if (!z) return; e.preventDefault(); z.classList.remove('l4-seret');
        var inp = z.querySelector('input[type=file]'), f = e.dataTransfer && e.dataTransfer.files;
        if (!inp || !f || !f.length) return;
        try { inp.files = f; } catch (er) { return; }
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    /* Laci menu di HP (aturan HP papan asli memindah menu ke pita atas) */
    function pasangLaci() {
      var nav = document.getElementById('panel'), kepala = document.querySelector('header .bungkus') || document.querySelector('header');
      if (!nav || !kepala || document.querySelector('.l4-burger')) return;
      var bg = document.createElement('button'); bg.type = 'button'; bg.className = 'l4-burger'; bg.setAttribute('data-wms', 'menu'); bg.setAttribute('aria-label', C.teks.menu); bg.setAttribute('aria-expanded', 'false'); bg.setAttribute('aria-controls', 'panel'); bg.innerHTML = IKON.menu;
      kepala.insertBefore(bg, kepala.firstChild);
      var tirai = document.createElement('div'); tirai.className = 'l4-tirai-laci'; document.body.appendChild(tirai);
      var setel = function (b) { document.body.classList.toggle('l4-laci', b); bg.setAttribute('aria-expanded', b ? 'true' : 'false'); };
      bg.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); H.klik(); setel(!document.body.classList.contains('l4-laci')); });
      tirai.addEventListener('click', function () { setel(false); });
      nav.addEventListener('click', function (e) { var a = e.target && e.target.closest ? e.target.closest('a') : null; if (a && document.body.classList.contains('l4-laci')) setTimeout(function () { setel(false); }, 120); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setel(false); });
    }
  }

  /* ================= boneka pojok =================
     Ferdy: "sekalian ui ux dibkin lebih lucu jga", lalu Mofmo Soft: Shiba asli
     di pojok kanan bawah. Bernapas, menoleh ke arah kursor, mikir saat
     menunggu server, Koala yang malu saat gagal, melompat dan menebar cap
     tapak saat tersimpan, bicara kalau diklik. Tombol x menyembunyikannya
     sampai tab ditutup. Tanpa gerak kalau perangkat minta gerak dikurangi. */
  var MK = { catat: [], konfeti: 0, ekspresi: 'diam', waktu: null, waktuKata: null };
  var KATA_POJOK = {
    id: { mikir: ['Sebentar, lagi ngambil data…', 'Lagi ngitung kardus…', 'Hmm, sabar ya…'], senang: ['Tersimpan! Mantap.', 'Beres, sudah dicatat!', 'Yay! Masuk buku besar.'], sedih: ['Yah, gagal. Cek pesannya ya.', 'Hmm, server nolak. Baca pesannya dulu.'],
      klik: ['Mof!', 'Halo! Aku jaga gudang.', 'Semangat opname hari ini!', 'Jangan lupa minum ya.', 'Klik menu di kiri buat pindah halaman.', 'Mof mof!'] },
    en: { mikir: ['One sec, fetching…', 'Counting boxes…', 'Hmm, hang on…'], senang: ['Saved! Nice.', 'Done, it is in the ledger!', 'Yay! Recorded.'], sedih: ['Oops, that failed. Check the message.', 'Hmm, the server said no. Read the message.'],
      klik: ['Mof!', 'Hi! I am on warehouse duty.', 'Good luck with the count today!', 'Remember to drink some water.', 'Use the menu on the left to switch pages.', 'Mof mof!'] }
  };
  function pilihKata(e) { var d = (KATA_POJOK[bhs()] || KATA_POJOK.en)[e] || []; return d.length ? d[Math.floor(Math.random() * d.length)] : ''; }
  function htmlMaskot() {
    var mati = false; try { mati = !!(ss() && ss().getItem('wms_maskot') === 'off'); } catch (e) {}
    if (mati) return '';
    var id = bhs() === 'id';
    return '<div class="maskot-pojok" id="maskotPojok" data-ekspresi="diam">' +
      '<div class="gelembung-pojok" role="status" aria-live="polite"></div>' +
      '<button type="button" class="badan-pojok" data-aksi="sapaMaskot" data-wms="1" aria-label="' + (id ? 'Sapa Shiba' : 'Say hi to Shiba') + '">' + foto('shiba', '', '') + '</button>' +
      '<button type="button" class="tutup-pojok" data-aksi="sembunyiMaskot" data-wms="1" aria-label="' + (id ? 'Sembunyikan boneka' : 'Hide the plush') + '">×</button>' +
      '<div class="konfeti-wadah" aria-hidden="true"></div></div>';
  }
  function bicara(kata) {
    var el = document.getElementById('maskotPojok'); if (!el) return;
    var g = el.querySelector('.gelembung-pojok'); clearTimeout(MK.waktuKata);
    if (!kata) { g.classList.remove('tampil'); return; }
    g.textContent = kata; g.classList.remove('tampil'); void g.offsetWidth; g.classList.add('tampil');
    MK.waktuKata = setTimeout(function () { g.classList.remove('tampil'); }, 2600);
  }
  function maskot(e, kata) {
    MK.catat.push(e); if (MK.catat.length > 60) MK.catat.shift();
    var el = document.getElementById('maskotPojok');
    if (el) {
      var i = el.querySelector('.badan-pojok img'); if (i) i.setAttribute('src', img(WAJAH[e] || 'shiba'));
      el.setAttribute('data-ekspresi', e);
      el.classList.remove('lompat', 'geleng'); void el.offsetWidth;
      if (e === 'senang') el.classList.add('lompat'); if (e === 'sedih') el.classList.add('geleng');
      bicara(kata === undefined ? pilihKata(e) : kata);
    }
    MK.ekspresi = e;
    clearTimeout(MK.waktu);
    if (e !== 'diam') MK.waktu = setTimeout(function () { maskot('diam', ''); }, e === 'mikir' ? 9000 : 2600);
  }
  /* cap tapak berwarna lembut menyembur dari boneka saat tersimpan */
  var TAPAK = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"></ellipse><circle cx="5.5" cy="9.5" r="2.2"></circle><circle cx="9.5" cy="5.5" r="2.2"></circle><circle cx="14.5" cy="5.5" r="2.2"></circle><circle cx="18.5" cy="9.5" r="2.2"></circle></svg>';
  function konfeti() {
    var el = document.getElementById('maskotPojok'); if (!el || !gerakBoleh()) return;
    var w = el.querySelector('.konfeti-wadah'), warna = ['peach', 'karamel', 'pink', 'mint'];
    for (var i = 0; i < 18; i++) {
      var k = document.createElement('i');
      k.className = 'konfeti ' + warna[i % 4];
      k.innerHTML = TAPAK;
      k.style.setProperty('--dx', Math.round(-150 + Math.random() * 170) + 'px');
      k.style.setProperty('--dy', Math.round(-170 + Math.random() * 90) + 'px');
      k.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
      k.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
      w.appendChild(k);
    }
    MK.konfeti += 18;
    setTimeout(function () { w.innerHTML = ''; }, 1400);
  }
  /* hujan cap tapak di halaman masuk saat kode diterima */
  function hujanTapak() {
    if (!gerakBoleh()) return '';
    var warna = ['peach', 'karamel', 'pink', 'mint'], s = '';
    for (var i = 0; i < 16; i++) s += '<i class="tapak ' + warna[i % 4] + '" style="left:' + Math.round(4 + Math.random() * 90) + '%;animation-delay:' + Math.round(Math.random() * 500) + 'ms;width:' + Math.round(18 + Math.random() * 14) + 'px">' + TAPAK + '</i>';
    return '<div class="hujan-tapak" aria-hidden="true">' + s + '</div>';
  }
  /* Shiba menoleh ke arah kursor: miring paling banyak 8 derajat. */
  function mataMaskot(x, y, dariBingkai) {
    if (MK.ekspresi !== 'diam' && MK.ekspresi !== 'mikir') return;
    var el = document.getElementById('maskotPojok'); if (!el) return;
    var b = el.querySelector('.badan-pojok'), i = b && b.querySelector('img'); if (!i) return;
    if (dariBingkai && PAPAN.bingkai) { var rb = PAPAN.bingkai.getBoundingClientRect(); x += rb.left; y += rb.top; }
    var r = b.getBoundingClientRect(), cx = r.left + r.width / 2;
    var d = Math.max(-1, Math.min(1, (x - cx) / 420)) * 8;
    i.style.transform = 'rotate(' + d.toFixed(2) + 'deg)';
  }

  function tirai(isi) { return '<div class="tirai-papan" id="tiraiPapan" role="status">' + isi + '</div>'; }
  function tiraiMuat() {
    var id = bhs() === 'id';
    return tirai('<div class="maskot-muat">' + foto('kr_bichon', '', '') + '</div>' +
      '<h2 class="muat-judul">' + (id ? 'Memuat buku besar' : 'Loading the ledger') + '</h2>' +
      '<div class="lbl">' + (id ? 'Papan yang sama persis dengan papan lama, cuma lebih cepat.' : 'The exact same board as before, just faster.') + '</div>' +
      '<div class="garis-muat"><i></i></div>');
  }
  function tiraiGagal(teks) {
    var id = bhs() === 'id';
    return tirai('<div class="maskot-muat gelengKepala">' + foto('koala', '', '') + '</div><p class="galat tolak">' + esc(teks) + '</p>' +
      '<div class="alat"><button type="button" class="btn" data-aksi="ulangPapan">' + (id ? 'Coba lagi' : 'Try again') + '</button>' +
      '<a class="btn dua" href="' + PAPAN_LAMA + '" rel="noopener">' + (id ? 'Buka papan lama' : 'Open the old board') + '</a>' +
      '<button type="button" class="btn dua" data-aksi="keluar">' + esc(t('logout')) + '</button></div>');
  }
  function bukaPapan() {
    var app = document.getElementById('app');
    var temaKini = temaTerpakai();
    if (PAPAN.bingkai && document.body.contains(PAPAN.bingkai) && PAPAN.tema === temaKini) return;
    halamanSekarang = 'papan'; document.title = 'WMS Mofmofriends';
    PAPAN.siap = false; PAPAN.tema = temaKini; PAPAN.mulai = Date.now();
    app.innerHTML = '<div class="wadah-papan">' + tiraiMuat() + '<iframe id="bingkaiPapan" title="WMS" class="bingkai-isi"></iframe><div id="garisMuatAtas" class="garis-muat-atas" aria-hidden="true"></div>' + htmlMaskot() + '</div>';
    MK.ekspresi = 'diam';
    tundaMuat = 0;
    PAPAN.bingkai = document.getElementById('bingkaiPapan');
    if (PAPAN.jaga) clearTimeout(PAPAN.jaga);
    PAPAN.jaga = setTimeout(function () {
      if (!PAPAN.siap && halamanSekarang === 'papan') { var tr = document.getElementById('tiraiPapan'); if (tr) tr.outerHTML = tiraiGagal(bhs() === 'id' ? 'Papan belum terbuka setelah 40 detik.' : 'The board did not open within 40 seconds.'); Suara.gagal(); }
    }, 40000);
    ambilKlien().then(function (mentah) {
      if (!PAPAN.bingkai || halamanSekarang !== 'papan') return;
      var gelap = PAPAN.tema === 'dark', K = window.KulitPapan;
      var id = bhs() === 'id';
      var C = { cssBayang: K.cssBayang(), gelap: gelap, boneka: '<img class="l4-boneka" src="' + K.dasar + 'angora.webp" alt="">', teks: { keMalam: id ? 'Ganti ke malam' : 'Switch to night', keSiang: id ? 'Ganti ke siang' : 'Switch to day', keluar: t('logout'),
        scan: id ? 'Scan rak atau cari SKU' : 'Scan a rack or find a SKU', scanPendek: 'Scan', kitabku: id ? 'Kitabku: event, hadiah, kartu QR, klaim struk' : 'Kitabku: events, rewards, QR cards, receipt claims', katalog: id ? 'Katalog: semua SKU dan harga jual putus' : 'Catalog: every SKU with its outright sale price', katalogPendek: id ? 'Katalog' : 'Catalog', kontrol: id ? 'Kontrol: tutup bulan, rapor mitra, margin, rekonsiliasi' : 'Controls: month-end close, partner report cards, margins, reconciliation', kontrolPendek: id ? 'Kontrol' : 'Controls', menu: 'Menu', paspor: id ? 'Buka paspor SKU' : 'Open the SKU passport' } };
      var html = K.ubahHtml(mentah, gelap);
      var kepala = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;600;700;800;900&display=swap" rel="stylesheet">' +
        '<script>(' + String(PENGGANTI) + ')(' + JSON.stringify(C) + ');<\/script>';
      var gaya = '<style id="kulitL4">' + K.css(gelap, K.dasar) + '</style>';
      var i = html.search(/<head[^>]*>/i);
      if (i > -1) { var j = html.indexOf('>', i) + 1; html = html.slice(0, j) + kepala + html.slice(j); } else html = kepala + html;
      var a = html.search(/<\/head>/i);
      html = a > -1 ? html.slice(0, a) + gaya + html.slice(a) : html + gaya;
      PAPAN.bingkai.srcdoc = html;
    }, function (e) {
      var tr = document.getElementById('tiraiPapan'); if (!tr) return;
      var id = bhs() === 'id';
      if (e && e.message === 'tiket') { keluarAkun(true); return; }
      tr.outerHTML = tiraiGagal(e && e.message === 'kosong'
        ? (id ? 'Salinan papan belum dikirim Apps Script ke Supabase. Tunggu sampai 10 menit, atau buka papan lama dulu.' : 'Apps Script has not sent the board copy yet. Give it up to 10 minutes, or use the old board for now.')
        : (id ? 'Server cermin tidak terjangkau. Cek sinyal lalu coba lagi.' : 'The mirror server could not be reached. Check the signal and try again.'));
      Suara.gagal();
    });
  }
  window.__wmsPapan = {
    jalan: jalanPapan,
    klik: function () { Suara.klik(); },
    siap: function () {
      PAPAN.siap = true; Suara.isi();
      var tr = document.getElementById('tiraiPapan'); if (tr) { tr.classList.add('pergi'); setTimeout(function () { if (tr.parentNode) tr.parentNode.removeChild(tr); }, gerakBoleh() ? 450 : 0); }
    },
    keluar: function () { if (S.tiket) keluarAkun(true); },
    keluarAkun: function () { keluarAkun(false); },
    mata: function (x, y, dariBingkai) { mataMaskot(x, y, dariBingkai); },
    bukaTab: function (u) { if (/^https?:/i.test(String(u))) window.open(String(u), '_blank', 'noopener'); },
    tema: function () { var baru = temaTerpakai() === 'dark' ? 'light' : 'dark'; setelan('wms_tema', baru); pasangTema(baru); Suara.klik(); gambar(); },
    alat: function (mode, arg) { if (window.WmsAlat) window.WmsAlat.buka(mode, arg); },
    paspor: function (info) { if (window.WmsAlat) window.WmsAlat.paspor(info); },
    kitabku: function (tab) { if (window.WmsKitabku) window.WmsKitabku.buka(tab); },
    katalog: function () { if (window.WmsKatalog) window.WmsKatalog.buka(); },
    kontrol: function (tab) { if (window.WmsKontrol) window.WmsKontrol.buka(tab); },
    /* Tata letak Mofmo Soft P9 sampai P14 (tata.js), dipasang ke bingkai papan */
    tata: function (fw) { if (window.WmsTata) window.WmsTata.pasang(fw); }
  };

  /* ================= gambar dan kejadian ================= */
  var halamanSekarang = '';
  function gambar() {
    var app = document.getElementById('app');
    if (S.tiket && putarPapan) { clearInterval(putarPapan); putarPapan = null; }
    document.documentElement.lang = bhs();
    if (!S.tiket) { halamanSekarang = 'masuk'; PAPAN.bingkai = null; app.innerHTML = halMasuk(); pasangMasuk(); document.title = 'WMS Mofmofriends'; return; }
    bukaPapan();
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-aksi]') : null;
    if (!el) return;
    var a = el.getAttribute('data-aksi');
    if (a === 'tema') { var baru = temaTerpakai() === 'dark' ? 'light' : 'dark'; setelan('wms_tema', baru); pasangTema(baru); Suara.klik(); gambar(); return; }
    if (a === 'bahasa') { setelan('wms_bhs', bhs() === 'id' ? 'en' : 'id'); Suara.klik(); gambar(); return; }
    if (a === 'keluar') { keluarAkun(false); return; }
    if (a === 'ulangPapan') { Suara.klik(); PAPAN.mentah = null; PAPAN.bingkai = null; gambar(); return; }
    if (a === 'sembunyiMaskot') { Suara.klik(); try { if (ss()) ss().setItem('wms_maskot', 'off'); } catch (er) {} var m = document.getElementById('maskotPojok'); if (m) m.parentNode.removeChild(m); return; }
    if (a === 'sapaMaskot') { Suara.klik(); maskot('senang', pilihKata('klik')); return; }
  });
  document.addEventListener('mousemove', function (e) { mataMaskot(e.clientX, e.clientY, false); }, { passive: true });
  /* Tema otomatis ikut jam: dicek tiap 5 menit. Di papan, ganti tema
     berarti papan dimuat ulang, jadi cuma dikerjakan di halaman masuk. */
  setInterval(function () { if ((setelan('wms_tema') || 'auto') === 'auto' && halamanSekarang === 'masuk') { var j = new Date().getHours(), mau = j >= 6 && j < 18 ? 'light' : 'dark'; if (mau !== temaTerpakai()) { pasangTema('auto'); gambar(); } } }, 300000);

  window.__wms = { S: S, Suara: Suara, PAPAN: PAPAN, maskot: MK, bhs: bhs, esc: esc, getar: getar, gerakBoleh: gerakBoleh, jalan: jalanPapan,
    /* potret Supabase apa adanya (tanpa jatuh ke Apps Script), untuk alat.js */
    potret: function (kunci) { return kirimSupa({ fn: 'ambil', tiket: S.tiket, kunci: kunci }).then(function (h) { return h && h.ok && h.isi ? h.isi : {}; }); } };
  gambar();
})();
