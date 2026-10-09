/* WMS Mofmofriends, versi baru (10 Okt 2026).
 *
 * Halaman statis di Cloudflare Pages. Semua data diambil dari Apps Script
 * lewat doPost aksi 'wms' (wmsPintu_ di FieldOp.gs): kode akses dikirim
 * sekali, sesudah itu cuma tiket bertanda tangan yang dipegang perangkat.
 * Tidak ada yang menulis ke spreadsheet dari halaman ini.
 *
 * Hitungan stok dan penjualan memakai baris buku besar yang sama dengan
 * papan lama (dataPapan: [tanggal, produk, qty, dari, ke]), jadi angkanya
 * berasal dari sumber yang sama. */
(function () {
  'use strict';

  var API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
  var APP_LAPANGAN = 'https://mofmo-lapangan.pages.dev/lapangan/';
  var LAPORAN_LAPANGAN = 'https://mofmo-lapangan.pages.dev/';
  var PAPAN_LAMA = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec?lihat=1';
  var QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';

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
    en: {
      summary: 'Summary', inventory: 'Inventory', stock: 'Stock by SKU', map: 'Warehouse map', stores: 'Offline stores', passport: 'SKU passport',
      shipments: 'Shipments', field: 'Field Op', planning: 'Planning', calendar: 'Selling calendar', labels: 'Rack QR labels', quality: 'Data quality',
      search: 'Search or scan SKU, store, DO, rack…', day: 'Day', night: 'Night', auto: 'Auto by clock', soundOn: 'Sound on', soundOff: 'Sound off',
      refresh: 'Refresh', logout: 'Sign out', oldBoard: 'Open the old board', updated: 'Updated', loading: 'Loading…',
      welcome: 'Welcome back', enterCode: 'Enter the board access code to continue.', accessCode: 'Access code', remember: 'Keep me signed in on this device for 7 days',
      open: 'Open the board', fieldHint: 'Field Op staff use the field app', checking: 'Checking…',
      salesMonth: 'Sales · this month', pcsWeeks: 'Pcs sold · 8 weeks', stockPos: 'Stock position', dataQ: 'Data quality',
      needsAction: 'Needs action', soldWeek: 'Sold per week', channels: 'Channel performance', topSku: 'Top SKUs', warehouse: 'Warehouse · HO',
      storesTitle: 'Stores', sku: 'SKU', ho: 'HO', inStores: 'Stores', transit: 'Transit', sold30: 'Sold 30 days', total: 'Total', status: 'Status',
      nothing: 'Nothing waiting. Nice.', all: 'All', online: 'Online', offline: 'Offline', journey: 'Journey', rightNow: 'Right now',
      back: 'Back', print: 'Print', zone: 'Zone', location: 'Location', inside: 'Inside', fill: 'Full',
      verify: 'Scan a barcode to check this rack', scanHere: 'Scan or type barcode',
      openApp: 'Open field app', openReport: 'Open field report', noData: 'No data yet.', events: 'Selling events', checklist: 'Checklist',
      findings: 'Findings', rows: 'ledger rows', products: 'products', stage: 'Stage', ref: 'Document', dest: 'Destination', date: 'Date', pcs: 'Pcs', po: 'PO'
    },
    id: {
      summary: 'Ringkasan', inventory: 'Persediaan', stock: 'Stok per SKU', map: 'Peta gudang', stores: 'Gerai offline', passport: 'Paspor SKU',
      shipments: 'Pengiriman', field: 'Field Op', planning: 'Perencanaan', calendar: 'Kalender penjualan', labels: 'Label QR rak', quality: 'Kualitas data',
      search: 'Cari atau scan SKU, gerai, surat jalan, rak…', day: 'Siang', night: 'Malam', auto: 'Otomatis ikut jam', soundOn: 'Suara nyala', soundOff: 'Suara mati',
      refresh: 'Muat ulang', logout: 'Keluar', oldBoard: 'Buka papan lama', updated: 'Diperbarui', loading: 'Memuat…',
      welcome: 'Selamat datang', enterCode: 'Masukkan kode akses papan untuk melanjutkan.', accessCode: 'Kode akses', remember: 'Tetap masuk di perangkat ini selama 7 hari',
      open: 'Buka papan', fieldHint: 'Petugas Field Op memakai aplikasi lapangan', checking: 'Memeriksa…',
      salesMonth: 'Penjualan · bulan ini', pcsWeeks: 'Pcs terjual · 8 minggu', stockPos: 'Posisi stok', dataQ: 'Kualitas data',
      needsAction: 'Perlu ditindak', soldWeek: 'Terjual per minggu', channels: 'Kinerja saluran', topSku: 'SKU teratas', warehouse: 'Gudang · HO',
      storesTitle: 'Gerai', sku: 'SKU', ho: 'HO', inStores: 'Gerai', transit: 'Perjalanan', sold30: 'Terjual 30 hari', total: 'Total', status: 'Status',
      nothing: 'Tidak ada yang menunggu.', all: 'Semua', online: 'Online', offline: 'Offline', journey: 'Perjalanan', rightNow: 'Saat ini',
      back: 'Kembali', print: 'Cetak', zone: 'Zona', location: 'Lokasi', inside: 'Isi', fill: 'Terisi',
      verify: 'Scan barcode untuk mengecek rak ini', scanHere: 'Scan atau ketik barcode',
      openApp: 'Buka aplikasi lapangan', openReport: 'Buka laporan lapangan', noData: 'Belum ada data.', events: 'Acara penjualan', checklist: 'Daftar persiapan',
      findings: 'Temuan', rows: 'baris buku besar', products: 'produk', stage: 'Tahap', ref: 'Dokumen', dest: 'Tujuan', date: 'Tanggal', pcs: 'Pcs', po: 'PO'
    }
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
  function nf(n) { n = Math.round(Number(n) || 0); return n.toLocaleString(bhs() === 'id' ? 'id-ID' : 'en-US'); }
  function rp(n) {
    n = Number(n) || 0;
    var a = Math.abs(n), dlm = bhs() === 'id';
    if (a >= 1e9) return 'Rp' + (n / 1e9).toFixed(2).replace('.', dlm ? ',' : '.') + (dlm ? ' M' : ' B');
    if (a >= 1e6) return 'Rp' + (n / 1e6).toFixed(2).replace('.', dlm ? ',' : '.') + (dlm ? ' jt' : ' M');
    return 'Rp' + nf(n);
  }
  function hariIni() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function keTanggal(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function selisihHari(a, b) { return Math.round((keTanggal(b) - keTanggal(a)) / 86400000); }
  var BLN = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] };
  function tglPendek(s) { var d = keTanggal(s); return d ? d.getDate() + ' ' + BLN[bhs()][d.getMonth()] : esc(s); }
  function senin(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var g = (x.getDay() + 6) % 7; x.setDate(x.getDate() - g); return x; }
  /* Label minggu pendek: nama bulan hanya saat bulannya berganti ("17 Aug, 24, 31, 7 Sep"). */
  function labelMinggu(daftar) { var lalu = -1; daftar.forEach(function (w) { var d = keTanggal(w.a); w.label = d.getDate() + (d.getMonth() !== lalu ? ' ' + BLN[bhs()][d.getMonth()] : ''); lalu = d.getMonth(); }); }
  function kunciTgl(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function gerakBoleh() { try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } }
  function toast(teks, jenis) {
    var box = document.getElementById('toast'); if (!box) return;
    var d = document.createElement('div'); d.className = 'toast' + (jenis === 'w' ? ' w' : ''); d.textContent = teks; box.appendChild(d);
    setTimeout(function () { d.style.opacity = '0'; d.style.transition = 'opacity .3s'; setTimeout(function () { d.remove(); }, 320); }, 2600);
  }
  var IK = {
    sum: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', inv: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8', shp: 'M3 7h11v10H3zM14 10h4l3 3v4h-7',
    fo: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', plan: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4', dq: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4',
    cari: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5', muat: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5', suara: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12',
    bisu: 'M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6'
  };
  function svg(d, uk) { return '<svg width="' + (uk || 18) + '" height="' + (uk || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"></path></svg>'; }

  /* ================= tema ================= */
  function temaTerpakai() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function pasangTema(p) {
    var j = new Date().getHours();
    var tm = p === 'light' || p === 'dark' ? p : (j >= 6 && j < 18 ? 'light' : 'dark');
    document.body.classList.add('ganti-tema');
    document.documentElement.setAttribute('data-theme', tm);
    setTimeout(function () { document.body.classList.remove('ganti-tema'); }, 450);
    var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', tm === 'dark' ? '#0D1014' : '#8C4A24');
  }

  /* ================= server ================= */
  var S = { tiket: ambil('wms_tiket') || '', data: null, gudang: null, kiriman: null, lapangan: null, model: null, waktu: {}, memuat: {} };
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
  function panggil(fn, extra) {
    var b = { aksi: 'wms', fn: fn, tiket: S.tiket };
    Object.keys(extra || {}).forEach(function (k) { b[k] = extra[k]; });
    return kirim(b).then(function (h) {
      if (h && h.perluMasuk) { keluarAkun(true); throw new Error(h.pesan || 'Please sign in again.'); }
      if (h && h.ok === false) throw new Error(h.pesan || h.sebab || 'Could not load.');
      return h;
    });
  }
  /* Data terakhir disimpan di perangkat (seperti papan lama) supaya bukaan
     berikutnya langsung tampil, lalu diganti angka baru dari server. */
  function bacaSimpan(fn) { try { var x = JSON.parse(ambil('wms_simpan_' + fn) || 'null'); return x && x.isi ? x : null; } catch (e) { return null; } }
  function muat(fn, paksa) {
    var kunciS = fn === 'lapangan' ? 'lapangan' : fn;
    if (!paksa && S[kunciS]) return Promise.resolve(S[kunciS]);
    if (!paksa) { var lama = bacaSimpan(fn); if (lama) { S[kunciS] = lama.isi; S.waktu[fn] = lama.t; if (fn === 'data') S.model = null; setTimeout(function () { muat(fn, true).then(function () { if (rute().hal === halamanSekarang) gambar(); }, function () {}); }, 50); return Promise.resolve(lama.isi); } }
    if (S.memuat[fn]) return S.memuat[fn];
    S.memuat[fn] = panggil(fn, fn === 'lapangan' ? { periode: '' } : null).then(function (h) {
      S[kunciS] = h; S.waktu[fn] = Date.now(); if (fn === 'data') S.model = null;
      try { taruh('wms_simpan_' + fn, JSON.stringify({ t: S.waktu[fn], isi: h }), awet()); } catch (e) {}
      S.memuat[fn] = null; return h;
    }, function (e) { S.memuat[fn] = null; throw e; });
    return S.memuat[fn];
  }
  function keluarAkun(diam) {
    ['wms_tiket', 'wms_ingat', 'wms_simpan_data', 'wms_simpan_gudang', 'wms_simpan_kiriman', 'wms_simpan_lapangan'].forEach(buang);
    S.tiket = ''; S.data = S.gudang = S.kiriman = S.lapangan = S.model = null;
    if (!diam) Suara.klik();
    location.hash = '#/';
    gambar();
  }

  /* ================= model dari buku besar ================= */
  function model() {
    if (S.model) return S.model;
    var d = S.data || {}, lok = d.lok || [], prod = d.prod || [], baris = d.baris || [];
    var idx = {}; lok.forEach(function (l, i) { idx[l.k] = i; });
    var stok = lok.map(function () { var a = []; for (var i = 0; i < prod.length; i++) a.push(0); return a; });
    var jual = [], perProd = prod.map(function () { return []; });
    baris.forEach(function (r) {
      var p = r[1], q = Number(r[2]) || 0, dari = r[3], ke = r[4];
      if (p == null || p < 0 || p >= prod.length) return;
      if (dari >= 0 && stok[dari]) stok[dari][p] -= q;
      if (ke >= 0 && stok[ke]) stok[ke][p] += q;
      perProd[p].push(r);
      if (ke === idx.TERJUAL) jual.push({ t: String(r[0]), p: p, q: q, dari: dari });
    });
    var toko = []; lok.forEach(function (l, i) { if (l.toko) toko.push(i); });
    var ho = idx.HO, tr = idx.TRANSIT;
    var sumL = function (li) { var s = 0; if (li === undefined) return 0; (stok[li] || []).forEach(function (v) { if (v > 0) s += v; }); return s; };
    var totToko = 0; toko.forEach(function (li) { totToko += sumL(li); });
    var hari = d.hariIni || hariIni();
    var kanal = function (j) { var l = lok[j.dari] || {}; if (j.dari === ho) return 'HO / online'; return l.r || l.n || '?'; };
    var online = function (j) { var l = lok[j.dari] || {}; return j.dari === ho || /shopee|online|tokopedia|tiktok/i.test((l.k || '') + ' ' + (l.n || '') + ' ' + (l.s || '')); };
    S.model = { d: d, lok: lok, prod: prod, idx: idx, stok: stok, jual: jual, perProd: perProd, toko: toko, ho: ho, tr: tr,
      stokHO: sumL(ho), stokToko: totToko, stokJalan: sumL(tr), hari: hari, kanal: kanal, online: online };
    return S.model;
  }
  function nilai(m, j) { var p = m.prod[j.p] || {}; return j.q * (Number(p.h) || Number(p.hs) || 0); }
  function jualAntara(m, a, b) { return m.jual.filter(function (j) { return j.t >= a && j.t <= b; }); }
  function jumlah(arr, f) { var s = 0; arr.forEach(function (x) { s += f(x); }); return s; }

  /* ================= kerangka halaman ================= */
  var MENU = [
    { k: 'summary', ik: 'sum', h: '#/summary' },
    { k: 'inventory', ik: 'inv', sub: [['stock', '#/stock'], ['map', '#/map'], ['stores', '#/stores'], ['passport', '#/passport']] },
    { k: 'shipments', ik: 'shp', h: '#/shipments' },
    { k: 'field', ik: 'fo', h: '#/field' },
    { k: 'planning', ik: 'plan', sub: [['calendar', '#/calendar'], ['labels', '#/labels']] },
    { k: 'quality', ik: 'dq', h: '#/quality' }
  ];
  var GRUP_HAL = { summary: 'summary', stock: 'inventory', map: 'inventory', stores: 'inventory', passport: 'inventory', shipments: 'shipments', field: 'field', calendar: 'planning', labels: 'planning', quality: 'quality' };
  function rute() {
    var h = location.hash || '';
    var q = h.match(/^#lokasi=([A-Za-z0-9._-]{1,30})$/); if (q) return { hal: 'map', arg: q[1], cek: true };
    var m = h.match(/^#\/([a-z]+)(?:\/(.*))?$/);
    if (!m) return { hal: 'summary' };
    return { hal: GRUP_HAL[m[1]] ? m[1] : 'summary', arg: m[2] ? decodeURIComponent(m[2]) : '' };
  }
  var halamanSekarang = '', jejakSiap = '';
  function kerangka(isi, hal, judul, kecil, alat) {
    var grupAktif = GRUP_HAL[hal];
    var nav = MENU.map(function (g) {
      var on = g.k === grupAktif;
      var a = '<a class="nv' + (on ? ' on' : '') + '" href="' + (g.h || g.sub[0][1]) + '" data-suara="klik">' + svg(IK[g.ik]) + esc(t(g.k)) + '</a>';
      if (g.sub && on) a += g.sub.map(function (s) { return '<a class="sb' + (s[0] === hal ? ' on' : '') + '" href="' + s[1] + '" data-suara="klik">' + esc(t(s[0])) + '</a>'; }).join('');
      return a;
    }).join('');
    var umur = S.waktu.data ? Math.max(0, Math.round((Date.now() - S.waktu.data) / 60000)) : null;
    return '<div class="app">' +
      '<nav class="side" aria-label="Main menu"><div class="merek"><div class="logo">M</div><div><b>Mofmofriends</b><small>Warehouse &amp; field ops</small></div></div>' +
      '<div class="nav-isi">' + nav + '</div>' +
      '<div class="side-kaki"><a href="' + PAPAN_LAMA + '" target="_blank" rel="noopener">' + esc(t('oldBoard')) + '</a>' +
      '<button type="button" class="btn dua" data-aksi="temaAuto">' + esc(t('auto')) + '</button>' +
      '<button type="button" class="btn dua" data-aksi="keluar">' + esc(t('logout')) + '</button></div></nav>' +
      '<main class="main" id="utama">' +
      '<div class="atas"><button type="button" class="cari" data-aksi="cari">' + svg(IK.cari, 16) + '<span style="flex:1">' + esc(t('search')) + '</span><span class="kbd">Ctrl K</span></button>' +
      '<div class="alat">' +
      (umur !== null ? '<span class="pil n" title="' + esc(t('updated')) + '">' + esc(t('updated')) + ' ' + (umur < 1 ? (bhs() === 'id' ? 'baru saja' : 'just now') : umur + (bhs() === 'id' ? ' mnt lalu' : ' min ago')) + '</span>' : '') +
      '<button type="button" class="ikon" data-aksi="muat" aria-label="' + esc(t('refresh')) + '">' + svg(IK.muat) + '</button>' +
      '<button type="button" class="ikon" data-aksi="suara" aria-label="' + esc(Suara.nyala() ? t('soundOn') : t('soundOff')) + '" aria-pressed="' + (Suara.nyala() ? 'true' : 'false') + '">' + svg(Suara.nyala() ? IK.suara : IK.bisu) + '</button>' +
      '<button type="button" class="saklar" data-aksi="tema" aria-label="' + esc(temaTerpakai() === 'dark' ? t('day') : t('night')) + '"><span class="rel"><span class="tombol-rel"></span></span><span>' + esc(temaTerpakai() === 'dark' ? t('night') : t('day')) + '</span></button>' +
      '<button type="button" class="saklar" data-aksi="bahasa" aria-label="Language">' + (bhs() === 'id' ? 'ID' : 'EN') + '</button>' +
      '</div></div>' +
      '<header class="kepala"><div><small>' + (kecil || '') + '</small><h1>' + esc(judul) + '</h1></div>' + (alat ? '<div class="alat">' + alat + '</div>' : '') + '</header>' +
      isi + '</main></div>';
  }
  function memuatHtml() {
    return '<div class="grid-kpi"><div class="kerangka" style="height:140px"></div><div class="kerangka" style="height:140px"></div><div class="kerangka" style="height:140px"></div><div class="kerangka" style="height:140px"></div></div><div class="kerangka" style="height:320px"></div>';
  }
  function galatHtml(e) { return '<div class="peringatan" role="alert">' + esc(e && e.message ? e.message : e) + ' <button type="button" class="btn dua" data-aksi="muat" style="margin-left:10px">' + esc(t('refresh')) + '</button></div>'; }

  /* ================= halaman: masuk ================= */
  function halMasuk() {
    return '<div class="masuk"><section class="masuk-kiri"><div class="merek" style="padding:0"><div class="logo">M</div><div><b>Mofmofriends WMS</b><small style="color:inherit;opacity:.75">One Logistics Solutions</small></div></div>' +
      '<div style="font-size:44px;line-height:1.08;font-weight:800;letter-spacing:-.03em;max-width:540px">' + (bhs() === 'id' ? 'Stok, gerai, dan kunjungan lapangan dalam satu tempat.' : 'Stock, stores and field visits in one place.') + '</div>' +
      '<div style="font-size:14px;opacity:.75">Haery 1 Building, Kemang Selatan</div></section>' +
      '<section class="masuk-kanan"><div style="position:absolute;top:20px;right:20px;display:flex;gap:8px">' +
      '<button type="button" class="saklar" data-aksi="tema"><span class="rel"><span class="tombol-rel"></span></span>' + esc(temaTerpakai() === 'dark' ? t('night') : t('day')) + '</button>' +
      '<button type="button" class="saklar" data-aksi="bahasa">' + (bhs() === 'id' ? 'ID' : 'EN') + '</button></div>' +
      '<form id="formMasuk" autocomplete="on"><div><h1 style="margin:0;font-size:34px;font-weight:800;letter-spacing:-.02em">' + esc(t('welcome')) + '</h1><p style="margin:8px 0 0;color:var(--mut)">' + esc(t('enterCode')) + '</p></div>' +
      '<label for="kode" style="font-weight:700;font-size:14px">' + esc(t('accessCode')) + '</label>' +
      '<input id="kode" name="kode" type="password" autocomplete="current-password" required>' +
      '<label class="centang"><input type="checkbox" id="ingat">' + esc(t('remember')) + '</label>' +
      '<div class="galat" id="galatMasuk" role="alert"></div>' +
      '<button type="submit" class="btn" style="height:56px;font-size:17px" id="tMasuk">' + esc(t('open')) + '</button>' +
      '<div style="font-size:14px;color:var(--mut)">' + esc(t('fieldHint')) + ': <a href="' + APP_LAPANGAN + '" style="font-weight:700">mofmo-lapangan.pages.dev/lapangan</a></div></form></section></div>';
  }
  function pasangMasuk() {
    var f = document.getElementById('formMasuk'); if (!f) return;
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var kode = document.getElementById('kode').value, ingat = document.getElementById('ingat').checked;
      var tb = document.getElementById('tMasuk'), g = document.getElementById('galatMasuk');
      tb.disabled = true; tb.textContent = t('checking'); g.textContent = '';
      kirim({ aksi: 'wms', fn: 'masuk', kode: kode, ingat: ingat }).then(function (h) {
        if (!h || !h.ok || !h.tiket) throw new Error((h && h.pesan) || 'That access code is not right.');
        buang('wms_tiket'); buang('wms_ingat');
        taruh('wms_tiket', h.tiket, ingat); if (ingat) taruh('wms_ingat', '1', true);
        S.tiket = h.tiket; Suara.sukses();
        if (!location.hash || location.hash === '#/') location.hash = '#/summary';
        gambar();
      }).catch(function (e) {
        Suara.gagal(); getar([60, 60, 60]);
        g.textContent = e.message; tb.disabled = false; tb.textContent = t('open');
        var inp = document.getElementById('kode'); inp.style.animation = 'none'; void inp.offsetWidth; inp.style.animation = 'geleng .45s ease'; inp.focus(); inp.select();
      });
    });
    setTimeout(function () { var k = document.getElementById('kode'); if (k) k.focus(); }, 30);
  }

  /* ================= halaman: ringkasan ================= */
  function halRingkas() {
    var m = model(), hari = m.hari, now = keTanggal(hari) || new Date();
    var awalBln = hari.slice(0, 8) + '01';
    var blnLalu = new Date(now.getFullYear(), now.getMonth() - 1, 1), akhirBandingan = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), 28));
    var jualBln = jualAntara(m, awalBln, hari), jualLalu = jualAntara(m, kunciTgl(blnLalu), kunciTgl(akhirBandingan));
    var vBln = jumlah(jualBln, function (j) { return nilai(m, j); }), vLalu = jumlah(jualLalu, function (j) { return nilai(m, j); });
    var pcsBln = jumlah(jualBln, function (j) { return j.q; });
    /* 8 minggu */
    var mg = []; var s0 = senin(now);
    for (var i = 7; i >= 0; i--) { var a = new Date(s0); a.setDate(a.getDate() - i * 7); var b = new Date(a); b.setDate(b.getDate() + 6); mg.push({ a: kunciTgl(a), b: kunciTgl(b), label: a.getDate() + ' ' + BLN[bhs()][a.getMonth()] }); }
    labelMinggu(mg);
    mg.forEach(function (w) { w.pcs = jumlah(jualAntara(m, w.a, w.b), function (j) { return j.q; }); });
    var maks = Math.max.apply(null, mg.map(function (w) { return w.pcs; }).concat([4]));
    var pcs8 = jumlah(mg, function (w) { return w.pcs; });
    /* saluran 30 hari */
    var d30 = new Date(now); d30.setDate(d30.getDate() - 29);
    var j30 = jualAntara(m, kunciTgl(d30), hari), perK = {};
    j30.forEach(function (j) { var k = m.kanal(j); perK[k] = perK[k] || { pcs: 0, v: 0 }; perK[k].pcs += j.q; perK[k].v += nilai(m, j); });
    var kanal = Object.keys(perK).map(function (k) { return { n: k, pcs: perK[k].pcs, v: perK[k].v }; }).sort(function (x, y) { return y.pcs - x.pcs; });
    var maksK = Math.max.apply(null, kanal.map(function (k) { return k.pcs; }).concat([1]));
    /* SKU teratas 30 hari */
    var perP = {}; j30.forEach(function (j) { perP[j.p] = (perP[j.p] || 0) + j.q; });
    var top = Object.keys(perP).map(function (p) { return { p: +p, q: perP[p] }; }).sort(function (x, y) { return y.q - x.q; }).slice(0, 5);
    /* gerai */
    var lakuToko = {}; j30.forEach(function (j) { lakuToko[j.dari] = (lakuToko[j.dari] || 0) + j.q; });
    var gerai = m.toko.map(function (li) { var s = 0; m.stok[li].forEach(function (v) { if (v > 0) s += v; }); return { li: li, l: m.lok[li], stok: s, laku: lakuToko[li] || 0 }; }).sort(function (x, y) { return y.laku - x.laku || y.stok - x.stok; });
    /* perlu ditindak */
    var tugas = susunTugas(m, gerai);
    var sehat = m.d.sehat || {};
    var wawasan = '';
    if (j30.length) {
      var totPcs = jumlah(j30, function (j) { return j.q; });
      var diam = gerai.filter(function (g) { return g.stok > 0 && !g.laku; }).map(function (g) { return g.l.n; });
      wawasan = (bhs() === 'id'
        ? esc(kanal[0].n) + ' membawa ' + nf(kanal[0].pcs) + ' dari ' + nf(totPcs) + ' pcs terjual dalam 30 hari terakhir.' + (diam.length ? ' ' + esc(diam.slice(0, 3).join(', ')) + ' punya stok di rak tapi belum ada penjualan.' : '')
        : esc(kanal[0].n) + ' brought ' + nf(kanal[0].pcs) + ' of the ' + nf(totPcs) + ' pcs sold in the last 30 days.' + (diam.length ? ' ' + esc(diam.slice(0, 3).join(', ')) + (diam.length === 1 ? ' has' : ' have') + ' stock on the shelf but no sale yet.' : ''));
    }
    var naik = vLalu ? Math.round((vBln - vLalu) / vLalu * 100) : null;
    var kpi = [
      { l: t('salesMonth'), a: vBln, f: 'rp', ket: nf(pcsBln) + ' pcs', pil: naik === null ? '' : '<span class="pil ' + (naik >= 0 ? 'ok' : 'w') + '">' + (naik >= 0 ? '+' : '') + naik + '% ' + (bhs() === 'id' ? 'vs periode sama bulan lalu' : 'vs same days last month') + '</span>', h: '#/stock' },
      { l: t('pcsWeeks'), a: pcs8, f: 'n', ket: (bhs() === 'id' ? 'Minggu ini ' : 'This week ') + nf(mg[7].pcs) + ' pcs', h: '#/calendar' },
      { l: t('stockPos'), a: m.stokHO + m.stokToko + m.stokJalan, f: 'n', ket: 'HO ' + nf(m.stokHO) + ' · ' + t('inStores').toLowerCase() + ' ' + nf(m.stokToko) + ' · ' + t('transit').toLowerCase() + ' ' + nf(m.stokJalan), h: '#/stock' },
      { l: t('dataQ'), a: (sehat.berat || 0) + (sehat.ringan || 0), f: 'n', ket: (bhs() === 'id' ? 'temuan · ' : 'findings · ') + nf(sehat.berat || 0) + (bhs() === 'id' ? ' berat' : ' serious'), pil: (sehat.berat ? '<span class="pil w">' + (bhs() === 'id' ? 'perlu dicek' : 'to check') + '</span>' : '<span class="pil ok">' + (bhs() === 'id' ? 'bersih' : 'clean') + '</span>'), h: '#/quality' }
    ];
    var html = '';
    if (wawasan) html += '<div class="wawasan muncul">' + svg('M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z') + '<span>' + wawasan + '</span></div>';
    html += '<section class="grid-kpi">' + kpi.map(function (k, i) {
      return '<a class="kartu kpi muncul" style="animation-delay:' + (i * 60) + 'ms" href="' + k.h + '" data-suara="klik"><span class="lbl">' + esc(k.l) + '</span><span class="angka" data-hitung="' + Math.round(k.a) + '" data-format="' + k.f + '">' + (k.f === 'rp' ? rp(k.a) : nf(k.a)) + '</span><p>' + k.ket + '</p>' + (k.pil || '') + '</a>';
    }).join('') + '</section>';
    html += '<section class="grid-2"><div class="kartu muncul" style="display:flex;flex-direction:column;gap:10px;animation-delay:200ms"><div class="baris"><h2>' + esc(t('needsAction')) + '</h2><span class="pil s">' + tugas.length + '</span></div>' +
      (tugas.length ? tugas.slice(0, 7).map(function (x) { return '<a class="tugas" href="' + x.h + '" data-suara="klik"><span class="tanda ' + x.w + '">' + esc(x.kode) + '</span><span style="flex:1;min-width:0"><b>' + esc(x.judul) + '</b><span class="ket">' + esc(x.ket) + '</span></span></a>'; }).join('') : '<div class="kosong">' + esc(t('nothing')) + '</div>') + '</div>' +
      '<div class="kartu muncul" style="display:flex;flex-direction:column;gap:14px;animation-delay:260ms"><div class="baris"><h2>' + esc(t('soldWeek')) + '</h2><span class="lbl">pcs</span></div>' +
      '<div class="batang-area">' + mg.map(function (w, i) { return '<div class="batang-kol"><span class="num" style="font-size:13px;font-weight:600">' + w.pcs + '</span><span class="batang' + (i === 7 ? ' terakhir' : '') + '" style="height:' + Math.max(3, Math.round(w.pcs / maks * 170)) + 'px;animation-delay:' + (i * 40) + 'ms"></span></div>'; }).join('') + '</div>' +
      '<div class="label-batang">' + mg.map(function (w) { return '<span>' + esc(w.label) + '</span>'; }).join('') + '</div></div></section>';
    html += '<section class="grid-3"><div class="kartu muncul" style="display:flex;flex-direction:column;gap:12px;animation-delay:300ms"><h2>' + esc(t('channels')) + '</h2><span class="lbl">' + (bhs() === 'id' ? '30 hari terakhir' : 'Last 30 days') + '</span>' +
      (kanal.length ? kanal.slice(0, 6).map(function (k, i) { return '<div style="display:flex;flex-direction:column;gap:6px"><div class="baris" style="font-size:15px"><b>' + esc(k.n) + '</b><span class="num" style="font-size:14px">' + rp(k.v) + ' · ' + nf(k.pcs) + ' pcs</span></div><div class="mendatar"><span style="width:' + Math.round(k.pcs / maksK * 100) + '%;background:' + (i === 0 ? 'var(--strong)' : 'var(--acc)') + ';animation-delay:' + (i * 60) + 'ms"></span></div></div>'; }).join('') : '<div class="kosong">' + esc(t('noData')) + '</div>') + '</div>' +
      '<div class="kartu muncul" style="display:flex;flex-direction:column;gap:8px;animation-delay:340ms"><h2>' + esc(t('topSku')) + '</h2><span class="lbl">' + (bhs() === 'id' ? '30 hari terakhir' : 'Last 30 days') + '</span>' +
      (top.length ? top.map(function (x, i) { var p = m.prod[x.p] || {}; return '<a class="tugas" style="min-height:46px;padding:8px" href="#/passport/' + encodeURIComponent(p.b) + '" data-suara="klik"><span class="num" style="width:24px;color:var(--mut)">' + ('0' + (i + 1)).slice(-2) + '</span><span style="flex:1;font-weight:600">' + esc(p.n) + '</span><span class="num" style="font-weight:600">' + nf(x.q) + ' pcs</span></a>'; }).join('') : '<div class="kosong">' + esc(t('noData')) + '</div>') + '</div>' +
      '<div class="kartu muncul" id="kartuGudang" style="display:flex;flex-direction:column;gap:12px;animation-delay:380ms"><div class="baris"><h2>' + esc(t('warehouse')) + '</h2><a href="#/map" data-suara="klik" style="font-weight:700;font-size:14px">' + esc(t('map')) + '</a></div>' + ringkasGudang() + '</div></section>';
    html += '<section class="kartu muncul" style="padding:20px 0 8px;animation-delay:420ms"><div class="baris" style="padding:0 20px 10px"><h2>' + esc(t('storesTitle')) + '</h2><span style="font-size:14px;color:var(--mut)">' + m.toko.length + (bhs() === 'id' ? ' gerai · ' : ' stores · ') + m.prod.length + ' SKU</span></div><div class="tabel-box"><table style="min-width:640px"><thead><tr><th style="padding-left:20px">' + esc(t('storesTitle')) + '</th><th>Retailer</th><th>' + esc(t('stock').split(' ')[0]) + '</th><th>' + esc(t('sold30')) + '</th><th>' + esc(t('status')) + '</th></tr></thead><tbody>' +
      gerai.map(function (g) { var st = g.laku ? ['ok', bhs() === 'id' ? 'Laku' : 'Selling'] : (g.stok ? ['w', bhs() === 'id' ? 'Belum laku' : 'No sales'] : ['n', bhs() === 'id' ? 'Kosong' : 'Empty']); return '<tr class="klik" data-buka="#/stores"><td style="padding-left:20px;font-weight:700">' + esc(g.l.n) + '</td><td style="color:var(--mut)">' + esc(g.l.r || '') + '</td><td class="num">' + nf(g.stok) + '</td><td class="num">' + nf(g.laku) + '</td><td><span class="pil ' + st[0] + '">' + esc(st[1]) + '</span></td></tr>'; }).join('') +
      '</tbody></table></div></section>';
    return html;
  }
  function susunTugas(m, gerai) {
    var id = bhs() === 'id', out = [];
    var sehat = m.d.sehat || {};
    (sehat.temuan || []).forEach(function (x) { if (/berat|high|serious/i.test(String(x.bobot))) out.push({ w: 'w', kode: 'DQ', judul: x.judul, ket: (x.jml ? nf(x.jml) + ' · ' : '') + (x.ket || ''), h: '#/quality', urut: 0 }); });
    var kd = (S.kiriman && S.kiriman.daftar) || [];
    kd.forEach(function (x) {
      if (x.tahap === 'PICKING' || x.tahap === 'PACKING' || x.tahap === 'STAGING') {
        var umur = x.tanggal ? selisihHari(String(x.tanggal).slice(0, 10), m.hari) : 0;
        if (umur >= 3) out.push({ w: 'w', kode: 'DO', judul: (id ? 'Kiriman ke ' : 'Shipment to ') + (x.tujuan || '?') + (id ? ' tertahan di ' : ' waiting at ') + x.tahap.toLowerCase(), ket: (x.noSj || x.ref || '') + ' · ' + umur + (id ? ' hari' : ' days'), h: '#/shipments/' + encodeURIComponent(x.ref || ''), urut: 1 });
      }
    });
    var g = S.gudang;
    if (g && g.rendah) out.push({ w: 'i', kode: 'RAK', judul: nf(g.rendah) + (id ? ' pick face di bawah 50%' : (g.rendah === 1 ? ' pick face under 50%' : ' pick faces under 50%')), ket: id ? 'Isi ulang dari overflow sebelum packing' : 'Refill from overflow before packing', h: '#/map', urut: 2 });
    if (g && g.belumLokasi) out.push({ w: 'i', kode: 'PUT', judul: nf(g.belumLokasi) + (id ? ' pcs belum ditaruh di rak' : ' pcs not put away yet'), ket: id ? 'Masih di overflow atau kardus' : 'Still in overflow or boxes', h: '#/map', urut: 2 });
    (gerai || []).forEach(function (x) { if (x.stok > 0 && !x.laku) out.push({ w: 'n', kode: 'TK', judul: (id ? 'Belum ada penjualan 30 hari: ' : 'No sale in 30 days: ') + x.l.n, ket: nf(x.stok) + (id ? ' pcs di rak' : ' pcs on the shelf'), h: '#/stores', urut: 3 }); });
    return out.sort(function (a, b) { return a.urut - b.urut; });
  }
  function ringkasGudang() {
    var g = S.gudang, id = bhs() === 'id';
    if (!g) return '<div class="kerangka" style="height:150px"></div>';
    var u = function (l, n, k, w) { return '<div style="background:' + (w ? 'var(--wBg)' : 'var(--soft)') + ';border-radius:12px;padding:12px"><div class="lbl"' + (w ? ' style="color:var(--wInk)"' : '') + '>' + esc(l) + '</div><div class="num" style="font-size:24px;font-weight:600;margin-top:4px' + (w ? ';color:var(--wInk)' : '') + '">' + nf(n) + '</div><div style="font-size:13px;color:' + (w ? 'var(--wInk)' : 'var(--mut)') + '">' + esc(k) + '</div></div>'; };
    return '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">' +
      u(id ? 'Stok di HO' : 'Stock at HO', g.stokHO, nf(g.terisi) + (id ? ' dari ' : ' of ') + nf(g.jml) + (id ? ' lokasi terisi' : ' locations used')) +
      u(id ? 'Di rak' : 'In storage', g.diLokasi, id ? 'Rak, tumpuk, meja' : 'Rack, stack, table') +
      u(id ? 'Belum di rak' : 'Not put away', g.belumLokasi, id ? 'Overflow atau kardus' : 'Overflow or boxes', g.belumLokasi > 0) +
      u(id ? 'Pick face < 50%' : 'Pick faces < 50%', g.rendah, id ? 'Isi ulang sebelum packing' : 'Refill before packing') + '</div>';
  }

  /* ================= halaman: stok per SKU ================= */
  var saringStok = 'all';
  function halStok() {
    var m = model(), id = bhs() === 'id', now = keTanggal(m.hari) || new Date(), d30 = new Date(now); d30.setDate(d30.getDate() - 29);
    var laku30 = {}; jualAntara(m, kunciTgl(d30), m.hari).forEach(function (j) { laku30[j.p] = (laku30[j.p] || 0) + j.q; });
    var lakuPernah = {}; m.jual.forEach(function (j) { lakuPernah[j.p] = 1; });
    var rows = m.prod.map(function (p, i) {
      var ho = m.ho !== undefined ? Math.max(0, m.stok[m.ho][i]) : 0, tk = 0, jl = m.tr !== undefined ? Math.max(0, m.stok[m.tr][i]) : 0;
      m.toko.forEach(function (li) { if (m.stok[li][i] > 0) tk += m.stok[li][i]; });
      return { i: i, p: p, ho: ho, tk: tk, jl: jl, l30: laku30[i] || 0, pernah: !!lakuPernah[i] };
    }).filter(function (r) { return r.ho + r.tk + r.jl > 0 || r.pernah; });
    var F = [['all', t('all') + ' · ' + rows.length], ['low', (id ? 'Tipis di HO' : 'Low at HO') + ' · ' + rows.filter(function (r) { return r.ho > 0 && r.ho < 5; }).length], ['noshelf', (id ? 'Tidak ada di gerai' : 'Not on any shelf') + ' · ' + rows.filter(function (r) { return r.tk === 0; }).length], ['never', (id ? 'Belum pernah laku' : 'Never sold') + ' · ' + rows.filter(function (r) { return !r.pernah; }).length]];
    var pilih = rows.filter(function (r) { return saringStok === 'low' ? r.ho > 0 && r.ho < 5 : saringStok === 'noshelf' ? r.tk === 0 : saringStok === 'never' ? !r.pernah : true; }).sort(function (a, b) { return (b.ho + b.tk) - (a.ho + a.tk); });
    var totHO = jumlah(rows, function (r) { return r.ho; }), totTk = jumlah(rows, function (r) { return r.tk; }), totJl = jumlah(rows, function (r) { return r.jl; });
    var html = '<section class="kartu muncul" style="display:flex;flex-direction:column;gap:12px"><div class="baris"><h2>' + (id ? 'Di mana stok sekarang' : 'Where the stock is right now') + '</h2><span class="num" style="color:var(--mut)">' + nf(totHO + totTk + totJl) + ' pcs</span></div>' +
      '<div class="tumpuk" style="height:18px"><span style="width:' + pct(totHO, totHO + totTk + totJl) + ';background:var(--strong)"></span><span style="width:' + pct(totTk, totHO + totTk + totJl) + ';background:var(--acc)"></span><span style="width:' + pct(totJl, totHO + totTk + totJl) + ';background:var(--mid)"></span></div>' +
      '<div style="display:flex;gap:18px;flex-wrap:wrap;font-size:14px"><span>HO <b class="num">' + nf(totHO) + '</b></span><span>' + esc(t('inStores')) + ' <b class="num">' + nf(totTk) + '</b></span><span>' + esc(t('transit')) + ' <b class="num">' + nf(totJl) + '</b></span></div></section>';
    html += '<section class="kartu muncul" style="padding:20px 0 8px;animation-delay:80ms"><div class="baris" style="padding:0 20px 12px;flex-wrap:wrap"><h2>' + esc(t('stock')) + '</h2><div style="display:flex;gap:6px;flex-wrap:wrap">' +
      F.map(function (f) { return '<button type="button" class="chipbtn' + (saringStok === f[0] ? ' on' : '') + '" data-aksi="saringStok" data-nilai="' + f[0] + '" aria-pressed="' + (saringStok === f[0]) + '">' + esc(f[1]) + '</button>'; }).join('') + '</div></div>' +
      '<div class="tabel-box"><table style="min-width:760px"><thead><tr><th style="padding-left:20px">SKU</th><th>HO</th><th>' + esc(t('inStores')) + '</th><th>' + esc(t('transit')) + '</th><th style="min-width:140px">' + (id ? 'Pembagian' : 'Split') + '</th><th>' + esc(t('sold30')) + '</th></tr></thead><tbody>' +
      (pilih.length ? pilih.map(function (r) { var tot = Math.max(1, r.ho + r.tk + r.jl); return '<tr class="klik" data-buka="#/passport/' + encodeURIComponent(r.p.b) + '"><td style="padding-left:20px"><b>' + esc(r.p.n) + '</b><div class="num" style="font-size:12px;color:var(--mut)">' + esc(r.p.b) + (r.p.s ? ' · ' + esc(r.p.s) : '') + '</div></td><td class="num" style="font-weight:600;color:' + (r.ho > 0 && r.ho < 5 ? 'var(--wInk)' : 'inherit') + '">' + nf(r.ho) + '</td><td class="num">' + nf(r.tk) + '</td><td class="num">' + nf(r.jl) + '</td><td><div class="tumpuk" style="height:10px;background:var(--line2)"><span style="width:' + Math.round(r.ho / tot * 100) + '%;background:var(--strong)"></span><span style="width:' + Math.round(r.tk / tot * 100) + '%;background:var(--acc)"></span></div></td><td class="num">' + nf(r.l30) + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="kosong">' + esc(t('noData')) + '</td></tr>') +
      '</tbody></table></div></section>';
    return html;
  }
  function pct(a, b) { return (b ? Math.round(a / b * 1000) / 10 : 0) + '%'; }

  /* ================= halaman: peta gudang ================= */
  var pilihLokasi = '';
  function halPeta(r) {
    var g = S.gudang, id = bhs() === 'id';
    if (!g) return memuatHtml();
    if (r && r.arg) pilihLokasi = r.arg;
    var zona = {}, urutZ = [];
    (g.lokasi || []).forEach(function (l) { var z = l.zona || l.unit || '?'; if (!zona[z]) { zona[z] = []; urutZ.push(z); } zona[z].push(l); });
    var tingkat = function (l) { var p = Number(l.persen) || 0; if (!(Number(l.isi) > 0)) return 0; return p >= 75 ? 3 : (p >= 50 ? 2 : 1); };
    var dipilih = (g.lokasi || []).filter(function (l) { return String(l.kode) === String(pilihLokasi); })[0] || null;
    var html = '<section class="grid-kpi">' + [
      [id ? 'Stok di HO' : 'Stock at HO', g.stokHO, nf(g.terisi) + (id ? ' dari ' : ' of ') + nf(g.jml) + (id ? ' lokasi' : ' locations')],
      [id ? 'Di rak' : 'In storage', g.diLokasi, ''], [id ? 'Belum di rak' : 'Not put away', g.belumLokasi, ''], [id ? 'Pick face < 50%' : 'Pick faces < 50%', g.rendah, '']
    ].map(function (k, i) { return '<div class="kartu kpi muncul" style="animation-delay:' + i * 50 + 'ms"><span class="lbl">' + esc(k[0]) + '</span><span class="angka" data-hitung="' + Math.round(k[1] || 0) + '" data-format="n">' + nf(k[1]) + '</span><p>' + esc(k[2]) + '</p></div>'; }).join('') + '</section>';
    html += '<section style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start"><div class="kartu muncul" style="flex:3 1 560px;min-width:0;display:flex;flex-direction:column;gap:16px"><div class="baris" style="flex-wrap:wrap"><h2>' + (id ? 'Denah · ketuk lokasi' : 'Floor plan · tap a location') + '</h2>' +
      '<div style="display:flex;gap:12px;font-size:13px;color:var(--mut);flex-wrap:wrap"><span>■ <b style="color:var(--ink)">75-100%</b></span><span style="color:var(--mid)">■</span>50-75%<span style="color:var(--low)">■</span>&lt;50%<span>□ ' + (id ? 'kosong' : 'empty') + '</span></div></div>' +
      (urutZ.length ? urutZ.map(function (z) { return '<div class="zona"><div><b>' + esc(z) + '</b><div class="num" style="font-size:12px;color:var(--mut)">' + zona[z].length + '</div></div><div class="sel-grid">' + zona[z].map(function (l) { var tk = tingkat(l); return '<button type="button" class="sel l' + tk + (String(l.kode) === String(pilihLokasi) ? ' on' : '') + (l.rendah ? ' rendah' : '') + '" data-aksi="lokasi" data-nilai="' + esc(l.kode) + '" aria-label="' + esc(l.kode + ' ' + (l.sku || '') + ' ' + (l.persen || 0) + '%') + '">' + esc(l.kode) + '</button>'; }).join('') + '</div></div>'; }).join('') : '<div class="kosong">' + esc(t('noData')) + '</div>') + '</div>' +
      '<aside class="kartu muncul" style="flex:1 1 320px;display:flex;flex-direction:column;gap:14px;animation-delay:80ms">' + (dipilih ? detailLokasi(dipilih, r && r.cek) : '<div class="kosong">' + (id ? 'Pilih lokasi di denah, atau scan QR rak.' : 'Pick a location on the plan, or scan a rack QR.') + '</div>') + '</aside></section>';
    return html;
  }
  function detailLokasi(l, mulaiCek) {
    var id = bhs() === 'id', m = S.data ? model() : null;
    var p = m ? m.prod.filter(function (x) { return String(x.b) === String(l.barcode); })[0] : null;
    return '<div class="baris"><div><div class="lbl">' + esc(t('location')) + '</div><div class="num" style="font-size:40px;font-weight:600;line-height:1.1">' + esc(l.kode) + '</div><div style="color:var(--mut);font-size:14px">' + esc(l.zona || '') + (l.peran ? ' · ' + esc(l.peran) : '') + '</div></div><span class="pil ' + (l.rendah ? 'w' : 'c') + '">' + nf(l.persen) + '% ' + esc(t('fill').toLowerCase()) + '</span></div>' +
      '<div class="mendatar" style="height:12px"><span style="width:' + Math.min(100, Number(l.persen) || 0) + '%;background:var(--acc)"></span></div>' +
      '<div class="lbl">' + esc(t('inside')) + '</div><div class="baris" style="padding:12px;border-radius:12px;background:var(--soft)"><span><b>' + esc(l.sku || (id ? 'Kosong' : 'Empty')) + '</b><div class="num" style="font-size:12px;color:var(--mut)">' + esc(l.barcode || '') + '</div></span><span class="num" style="font-size:22px;font-weight:600">' + nf(l.isi) + (l.kap ? '<span style="font-size:14px;color:var(--mut)"> / ' + nf(l.kap) + '</span>' : '') + '</span></div>' +
      '<div class="scan-box" id="scanBox"><label class="lbl" for="scanLok" style="color:inherit;opacity:.85">' + esc(t('verify')) + '</label><input id="scanLok" data-cek="' + esc(l.barcode || '') + '" data-nama="' + esc(l.sku || '') + '" placeholder="' + esc(t('scanHere')) + '" autocomplete="off" inputmode="numeric"><div class="scan-pesan" id="scanPesan" aria-live="assertive"></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (p ? '<a class="btn dua" href="#/passport/' + encodeURIComponent(p.b) + '" data-suara="klik">' + esc(t('passport')) + '</a>' : '') + '<a class="btn dua" href="#/labels/' + encodeURIComponent(l.zona || '') + '" data-suara="klik">' + esc(t('labels')) + '</a></div>' +
      (mulaiCek ? '<span hidden id="fokusScan"></span>' : '');
  }
  function cekScanLokasi(inp) {
    var v = String(inp.value || '').trim(); if (!v) return;
    var box = document.getElementById('scanBox'), pesan = document.getElementById('scanPesan'), id = bhs() === 'id';
    var harap = inp.getAttribute('data-cek'), namaHarap = inp.getAttribute('data-nama');
    var m = S.data ? model() : null, p = m ? m.prod.filter(function (x) { return String(x.b) === v || String(x.s || '').toUpperCase() === v.toUpperCase(); })[0] : null;
    box.classList.remove('ok', 'tolak'); void box.offsetWidth;
    if (harap && p && String(p.b) === String(harap)) {
      box.classList.add('ok'); Suara.scanOk(); getar(30);
      pesan.textContent = '✓ ' + (id ? 'Cocok: ' : 'Match: ') + (p.n || namaHarap) + (id ? ' memang di rak ini.' : ' belongs here.');
    } else {
      box.classList.add('tolak'); Suara.scanTolak(); getar([60, 60, 60]);
      pesan.textContent = '✕ ' + (p ? (id ? 'Ditolak: ' + p.n + ' bukan barang rak ini' + (namaHarap ? ' (seharusnya ' + namaHarap + ').' : '.') : 'Rejected: ' + p.n + ' does not belong here' + (namaHarap ? ' (expected ' + namaHarap + ').' : '.'))
        : (id ? 'Ditolak: barcode ' + v + ' tidak ada di katalog.' : 'Rejected: barcode ' + v + ' is not in the catalog.'));
    }
    inp.value = ''; inp.focus();
  }

  /* ================= halaman: gerai offline ================= */
  var saringRitel = '';
  function halGerai() {
    var m = model(), id = bhs() === 'id';
    var ritel = []; m.toko.forEach(function (li) { var r = m.lok[li].r || ''; if (r && ritel.indexOf(r) < 0) ritel.push(r); });
    var kol = m.toko.filter(function (li) { return !saringRitel || m.lok[li].r === saringRitel; });
    var lakuDi = {}; m.jual.forEach(function (j) { lakuDi[j.p + '|' + j.dari] = 1; });
    var rows = m.prod.map(function (p, i) { var tot = 0; var sel = kol.map(function (li) { var v = Math.max(0, m.stok[li][i]); tot += v; return { v: v, diam: v > 0 && !lakuDi[i + '|' + li] }; }); return { p: p, i: i, sel: sel, tot: tot }; }).filter(function (r) { return r.tot > 0; }).sort(function (a, b) { return b.tot - a.tot; });
    var html = '<section class="kartu muncul" style="padding:20px 0 10px"><div class="baris" style="padding:0 20px 12px;flex-wrap:wrap"><h2>' + (id ? 'Stok di tiap rak gerai' : 'Stock on each store shelf') + '</h2><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="chipbtn' + (!saringRitel ? ' on' : '') + '" data-aksi="ritel" data-nilai="">' + esc(t('all')) + '</button>' + ritel.map(function (r) { return '<button type="button" class="chipbtn' + (saringRitel === r ? ' on' : '') + '" data-aksi="ritel" data-nilai="' + esc(r) + '">' + esc(r) + '</button>'; }).join('') + '</div></div>' +
      '<div style="padding:0 20px 10px;font-size:14px;color:var(--mut)">' + (id ? 'Oranye = ada di rak tapi belum pernah laku di gerai itu.' : 'Orange = on the shelf but never sold at that store.') + '</div>' +
      '<div class="tabel-box"><table class="mx" style="min-width:' + (260 + kol.length * 92) + 'px"><thead><tr><th>SKU</th>' + kol.map(function (li) { return '<th title="' + esc(m.lok[li].n) + '">' + esc(singkat(m.lok[li].n)) + '</th>'; }).join('') + '<th>' + esc(t('total')) + '</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) { return '<tr class="klik" data-buka="#/passport/' + encodeURIComponent(r.p.b) + '"><td><b>' + esc(r.p.n) + '</b></td>' + r.sel.map(function (x) { return '<td><span class="v' + (x.v ? '' : ' nol') + '" style="' + (x.diam ? 'background:var(--wBg);color:var(--wInk)' : '') + '">' + (x.v ? nf(x.v) : '·') + '</span></td>'; }).join('') + '<td class="num" style="font-weight:700">' + nf(r.tot) + '</td></tr>'; }).join('') : '<tr><td colspan="' + (kol.length + 2) + '" class="kosong">' + esc(t('noData')) + '</td></tr>') +
      '</tbody></table></div></section>';
    return html;
  }
  function singkat(n) { n = String(n || ''); return n.length > 16 ? n.replace(/^(Toys Kingdom|TK|Kinokuniya|MAA)\s*/i, function (x) { return x.slice(0, 2).toUpperCase() + ' '; }).slice(0, 16) : n; }

  /* ================= halaman: paspor SKU ================= */
  var saringPaspor = 'all';
  function halPaspor(r) {
    var m = model(), id = bhs() === 'id';
    var p = null, pi = -1;
    if (r && r.arg) { m.prod.forEach(function (x, i) { if (pi < 0 && (String(x.b) === r.arg || String(x.s || '') === r.arg)) { p = x; pi = i; } }); }
    if (!p) {
      var urut = m.prod.map(function (x, i) { return { x: x, i: i, n: m.perProd[i].length }; }).filter(function (o) { return o.n; }).sort(function (a, b) { return b.n - a.n; });
      return '<section class="kartu muncul"><h2>' + (id ? 'Pilih SKU' : 'Choose a SKU') + '</h2><p style="color:var(--mut)">' + (id ? 'Atau scan barcode-nya di kotak cari (Ctrl K).' : 'Or scan its barcode in the search box (Ctrl K).') + '</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px">' +
        urut.slice(0, 60).map(function (o) { return '<a class="tugas" href="#/passport/' + encodeURIComponent(o.x.b) + '" data-suara="klik"><span class="tanda n">' + esc(String(o.x.n).slice(0, 2).toUpperCase()) + '</span><span style="flex:1;min-width:0"><b>' + esc(o.x.n) + '</b><span class="ket num">' + o.n + (id ? ' gerakan' : ' moves') + '</span></span></a>'; }).join('') + '</div></section>';
    }
    var L = m.lok, idx = m.idx;
    var jenis = function (row) {
      var dari = row[3], ke = row[4], ld = L[dari] || {}, lk = L[ke] || {};
      if (ke === idx.TERJUAL) return m.online({ dari: dari }) ? ['onl', 'SOLD', id ? 'Terjual online / langsung' : 'Sold online / direct', 'i'] : ['off', 'SOLD', (id ? 'Terjual di ' : 'Sold at ') + (ld.n || '?'), 'ok'];
      if (ke === idx.RUSAK) return ['gud', 'DMG', (id ? 'Rusak atau hilang di ' : 'Damaged or lost at ') + (ld.n || '?'), 'w'];
      if (dari === idx.ADJUST || ke === idx.ADJUST) return ['gud', 'ADJ', (id ? 'Penyesuaian opname di ' : 'Count adjustment at ') + ((dari === idx.ADJUST ? lk.n : ld.n) || '?'), 'w'];
      if (dari === idx.PRINCIPAL || dari === idx.OPENING) return ['gud', 'IN', (id ? 'Masuk ke ' : 'Received into ') + (lk.n || '?') + (dari === idx.OPENING ? (id ? ' (saldo awal)' : ' (opening balance)') : (id ? ' dari principal' : ' from principal')), 's'];
      if (lk.toko) return ['off', 'SHIP', (id ? 'Dikirim ke ' : 'Shipped to ') + lk.n + (ld.n ? (id ? ' dari ' : ' from ') + ld.n : ''), 'c'];
      if (ld.toko) return ['off', 'BACK', (id ? 'Kembali dari ' : 'Returned from ') + ld.n + (lk.n ? (id ? ' ke ' : ' to ') + lk.n : ''), 'n'];
      if (ke === idx.TRANSIT) return ['off', 'TRN', id ? 'Dalam perjalanan ke gerai' : 'On the way to a store', 'c'];
      return ['gud', 'MOVE', (ld.n || '?') + ' → ' + (lk.n || '?'), 'n'];
    };
    var semua = m.perProd[pi].slice().sort(function (a, b) { return String(b[0]).localeCompare(String(a[0])); }).map(function (row) { return { row: row, j: jenis(row) }; });
    var tampil = semua.filter(function (x) { return saringPaspor === 'all' || (saringPaspor === 'offline' && x.j[0] !== 'onl') || (saringPaspor === 'online' && x.j[0] !== 'off'); });
    var hoQ = m.ho !== undefined ? Math.max(0, m.stok[m.ho][pi]) : 0, tkQ = 0, jlQ = m.tr !== undefined ? Math.max(0, m.stok[m.tr][pi]) : 0;
    var perToko = []; m.toko.forEach(function (li) { var v = m.stok[li][pi]; if (v > 0) { tkQ += v; perToko.push({ n: L[li].n, v: v }); } });
    var soldOff = 0, soldOn = 0, rusak = 0;
    semua.forEach(function (x) { var q = Number(x.row[2]) || 0; if (x.j[1] === 'SOLD') { if (x.j[0] === 'onl') soldOn += q; else soldOff += q; } if (x.j[1] === 'DMG') rusak += q; });
    var bag = [[id ? 'Di HO' : 'At HO', hoQ, 'var(--strong)'], [id ? 'Di rak gerai' : 'On store shelves', tkQ, 'var(--acc)'], [id ? 'Perjalanan' : 'On the way', jlQ, 'var(--mid)'], [id ? 'Terjual di gerai' : 'Sold in stores', soldOff, 'var(--okInk)'], [id ? 'Terjual online / langsung' : 'Sold online / direct', soldOn, 'var(--iInk)'], [id ? 'Rusak' : 'Damaged', rusak, 'var(--wInk)']].filter(function (b) { return b[1] > 0; });
    var totBag = jumlah(bag, function (b) { return b[1]; });
    var html = '<section class="kartu muncul" style="display:flex;flex-wrap:wrap;gap:20px;align-items:center"><div style="width:84px;height:84px;border-radius:20px;background:var(--chip);color:var(--chipInk);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;overflow:hidden">' + (p.f ? '<img src="' + esc(p.f) + '" alt="" style="width:100%;height:100%;object-fit:cover">' : esc(String(p.n).slice(0, 2).toUpperCase())) + '</div>' +
      '<div style="flex:1 1 280px"><div class="lbl">' + esc(t('passport')) + '</div><div style="font-size:28px;font-weight:800;letter-spacing:-.02em">' + esc(p.n) + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><span class="pil n num">' + esc(p.b) + '</span>' + (p.s ? '<span class="pil n">' + esc(p.s) + '</span>' : '') + '</div></div>' +
      '<div class="seg" role="group" aria-label="Channel">' + [['all', t('all')], ['offline', t('offline')], ['online', t('online')]].map(function (f) { return '<button type="button" class="' + (saringPaspor === f[0] ? 'on' : '') + '" data-aksi="saringPaspor" data-nilai="' + f[0] + '" aria-pressed="' + (saringPaspor === f[0]) + '">' + esc(f[1]) + '</button>'; }).join('') + '</div></section>';
    html += '<section class="kartu muncul" style="display:flex;flex-direction:column;gap:12px;animation-delay:60ms"><div class="baris"><h2>' + (id ? 'Ke mana saja barang ini pergi' : 'Where this SKU went') + '</h2><span style="font-size:14px;color:var(--mut)">' + (id ? 'Dihitung per jumlah, bukan per unit' : 'Counted by quantity, not by unit') + '</span></div>' +
      (totBag ? '<div class="tumpuk" style="height:40px;border-radius:12px">' + bag.map(function (b) { return '<span title="' + esc(b[0]) + '" style="flex:' + b[1] + ' 1 0;background:' + b[2] + ';color:var(--card);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-weight:700;font-size:14px">' + nf(b[1]) + '</span>'; }).join('') + '</div><div style="display:flex;gap:16px;flex-wrap:wrap;font-size:14px">' + bag.map(function (b) { return '<span><span style="color:' + b[2] + '">■</span> ' + esc(b[0]) + ' <b class="num">' + nf(b[1]) + '</b></span>'; }).join('') + '</div>' : '<div class="kosong">' + esc(t('noData')) + '</div>') + '</section>';
    html += '<section style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start"><div class="kartu muncul" style="flex:3 1 560px;min-width:0;animation-delay:100ms"><div class="baris" style="margin-bottom:10px"><h2>' + esc(t('journey')) + '</h2><span style="font-size:14px;color:var(--mut)">' + tampil.length + (id ? ' kejadian · terbaru di atas' : ' events · newest first') + '</span></div>' +
      (tampil.length ? tampil.slice(0, 120).map(function (x) { var q = Number(x.row[2]) || 0; return '<div class="jejak"><div class="tgl">' + tglPendek(x.row[0]) + '<div style="font-size:12px;color:var(--mut);font-weight:500">' + esc(String(x.row[0]).slice(0, 4)) + '</div></div><div class="tiang"><i></i><span class="bulat" style="background:var(--' + (x.j[3] === 's' ? 'strong' : x.j[3] + 'Bg') + ');color:var(--' + (x.j[3] === 's' ? 'strongInk' : x.j[3] + 'Ink') + ')">' + esc(x.j[1]) + '</span><i></i></div><div class="isi"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b style="font-size:15px">' + esc(x.j[2]) + '</b><span class="pil ' + (x.j[0] === 'onl' ? 'i' : x.j[0] === 'off' ? 'c' : 'n') + '">' + (x.j[0] === 'onl' ? t('online') : x.j[0] === 'off' ? t('offline') : (id ? 'Gudang' : 'Warehouse')) + '</span><span class="num" style="font-weight:700">' + nf(q) + ' pcs</span></div></div></div>'; }).join('') : '<div class="kosong">' + esc(t('noData')) + '</div>') + '</div>' +
      '<aside class="kartu muncul" style="flex:2 1 300px;display:flex;flex-direction:column;gap:10px;animation-delay:140ms"><h2>' + esc(t('rightNow')) + '</h2><div class="baris" style="min-height:34px"><b>HO</b><span class="num" style="font-weight:600">' + nf(hoQ) + '</span></div>' + perToko.sort(function (a, b) { return b.v - a.v; }).map(function (x) { return '<div class="baris" style="min-height:34px"><span>' + esc(x.n) + '</span><span class="num" style="font-weight:600">' + nf(x.v) + '</span></div>'; }).join('') + (jlQ ? '<div class="baris" style="min-height:34px"><span>' + esc(t('transit')) + '</span><span class="num" style="font-weight:600">' + nf(jlQ) + '</span></div>' : '') + '</aside></section>';
    return html;
  }

  /* ================= halaman: pengiriman ================= */
  var saringKirim = 'all';
  var TAHAP = ['PICKING', 'PACKING', 'STAGING', 'TRANSIT', 'DELIVERED'];
  function halKirim(r) {
    var k = S.kiriman, id = bhs() === 'id';
    if (!k) return memuatHtml();
    var d = k.daftar || [];
    var namaT = { PICKING: id ? 'Dipetik' : 'Picking', PACKING: id ? 'Dikemas' : 'Packing', STAGING: id ? 'Siap kirim' : 'Staging', TRANSIT: id ? 'Di jalan' : 'In transit', DELIVERED: id ? 'Sampai' : 'Delivered' };
    var jml = {}; TAHAP.forEach(function (x) { jml[x] = 0; }); d.forEach(function (x) { jml[x.tahap] = (jml[x.tahap] || 0) + 1; });
    var lajur = []; d.forEach(function (x) { if (x.lajur && lajur.indexOf(x.lajur) < 0) lajur.push(x.lajur); });
    var tampil = d.filter(function (x) { return saringKirim === 'all' || x.lajur === saringKirim || x.tahap === saringKirim; });
    var pilih = r && r.arg ? d.filter(function (x) { return String(x.ref) === r.arg || String(x.noSj) === r.arg; })[0] : null;
    var html = '<section class="grid-kpi" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' + TAHAP.map(function (x, i) {
      return '<button type="button" class="kartu muncul" style="text-align:left;animation-delay:' + i * 50 + 'ms;border-color:' + (saringKirim === x ? 'var(--acc)' : 'var(--line)') + '" data-aksi="saringKirim" data-nilai="' + (saringKirim === x ? 'all' : x) + '"><div class="baris"><span style="display:flex;align-items:center;gap:8px"><span class="num" style="width:26px;height:26px;border-radius:50%;background:var(--strong);color:var(--strongInk);display:inline-flex;align-items:center;justify-content:center;font-size:12px">' + (i + 1) + '</span><b>' + esc(namaT[x]) + '</b></span><span class="num" style="font-size:24px;font-weight:600">' + (jml[x] || 0) + '</span></div></button>';
    }).join('') + '</section>';
    html += '<section style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start"><div class="kartu muncul" style="flex:3 1 560px;min-width:0;padding:20px 0 8px;animation-delay:120ms"><div class="baris" style="padding:0 20px 12px;flex-wrap:wrap"><h2>' + (id ? 'Dokumen keluar' : 'Outbound documents') + '</h2><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="chipbtn' + (saringKirim === 'all' ? ' on' : '') + '" data-aksi="saringKirim" data-nilai="all">' + esc(t('all')) + ' · ' + d.length + '</button>' + lajur.map(function (l) { return '<button type="button" class="chipbtn' + (saringKirim === l ? ' on' : '') + '" data-aksi="saringKirim" data-nilai="' + esc(l) + '">' + esc(l) + '</button>'; }).join('') + '</div></div>' +
      '<div class="tabel-box"><table style="min-width:720px"><thead><tr><th style="padding-left:20px">' + esc(t('ref')) + '</th><th>' + esc(t('dest')) + '</th><th>' + esc(t('date')) + '</th><th>' + esc(t('po')) + '</th><th>' + esc(t('pcs')) + '</th><th>' + esc(t('stage')) + '</th></tr></thead><tbody>' +
      (tampil.length ? tampil.map(function (x) { var tw = x.tahap === 'DELIVERED' ? 'ok' : (x.tahap === 'TRANSIT' ? 'i' : 'c'); return '<tr class="klik" data-buka="#/shipments/' + encodeURIComponent(x.ref || '') + '" style="' + (pilih && pilih.ref === x.ref ? 'background:var(--chip)' : '') + '"><td style="padding-left:20px"><b class="num">' + esc(x.noSj || x.ref) + '</b>' + (x.noSj && x.ref !== x.noSj ? '<div class="num" style="font-size:12px;color:var(--mut)">' + esc(x.ref) + '</div>' : '') + '</td><td style="font-weight:600">' + esc(x.tujuan || '') + '</td><td>' + tglPendek(String(x.tanggal || '').slice(0, 10)) + '</td><td class="num" style="color:' + (x.noPo ? 'inherit' : 'var(--mut)') + '">' + esc(x.noPo || '·') + '</td><td class="num">' + nf(x.pcsKemas || x.pcsPetik || x.pcsPesan) + '</td><td><span class="pil ' + tw + '">' + esc(namaT[x.tahap] || x.tahap) + '</span>' + (x.sjBatal ? ' <span class="pil w">' + (id ? 'batal' : 'cancelled') + '</span>' : '') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="kosong">' + esc(t('noData')) + '</td></tr>') +
      '</tbody></table></div></div>' +
      '<aside class="kartu muncul" style="flex:2 1 320px;display:flex;flex-direction:column;gap:12px;animation-delay:160ms">' + (pilih ? detailKirim(pilih, namaT) : '<div class="kosong">' + (id ? 'Pilih dokumen untuk melihat langkahnya.' : 'Pick a document to see its steps.') + '</div>') + '</aside></section>';
    return html;
  }
  function detailKirim(x, namaT) {
    var id = bhs() === 'id', i = TAHAP.indexOf(x.tahap);
    return '<div><div class="num" style="font-size:14px;color:var(--mut)">' + esc(x.noSj || x.ref) + '</div><div style="font-size:22px;font-weight:800">' + esc(x.tujuan || '') + '</div></div>' +
      '<div>' + TAHAP.map(function (s, k) { var lewat = k <= i; return '<div style="display:grid;grid-template-columns:20px 1fr;gap:10px;align-items:center;min-height:38px"><span style="width:12px;height:12px;border-radius:50%;justify-self:center;background:' + (lewat ? 'var(--acc)' : 'var(--line)') + '"></span><span style="color:' + (lewat ? 'var(--ink)' : 'var(--mut)') + ';font-weight:' + (k === i ? 800 : 500) + '">' + esc(namaT[s]) + '</span></div>'; }).join('') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px">' +
      '<div style="background:var(--soft);border-radius:10px;padding:10px"><div class="lbl">' + (id ? 'Dipesan' : 'Ordered') + '</div><b class="num">' + nf(x.pcsPesan) + '</b></div>' +
      '<div style="background:var(--soft);border-radius:10px;padding:10px"><div class="lbl">' + (id ? 'Dipetik' : 'Picked') + '</div><b class="num">' + nf(x.pcsPetik) + '</b></div>' +
      '<div style="background:var(--soft);border-radius:10px;padding:10px"><div class="lbl">' + (id ? 'Dikemas' : 'Packed') + '</div><b class="num">' + nf(x.pcsKemas) + '</b></div>' +
      '<div style="background:var(--soft);border-radius:10px;padding:10px"><div class="lbl">' + (id ? 'Koli' : 'Boxes') + '</div><b class="num">' + nf(x.koli) + '</b></div></div>' +
      (x.kurir || x.resi ? '<div style="font-size:14px">' + esc(x.kurir || '') + (x.resi ? ' · <span class="num">' + esc(x.resi) + '</span>' : '') + '</div>' : '') +
      (x.noPo ? '<div style="font-size:14px">PO <b class="num">' + esc(x.noPo) + '</b></div>' : '');
  }

  /* ================= halaman: Field Op ================= */
  function halLapangan() {
    var id = bhs() === 'id';
    var html = '<section class="grid-3"><a class="kartu muncul tugas" style="padding:20px" href="' + APP_LAPANGAN + '" target="_blank" rel="noopener" data-suara="klik"><span class="tanda ok">APP</span><span style="flex:1"><b>' + esc(t('openApp')) + '</b><span class="ket">mofmo-lapangan.pages.dev/lapangan</span></span></a>' +
      '<a class="kartu muncul tugas" style="padding:20px;animation-delay:60ms" href="' + LAPORAN_LAPANGAN + '" target="_blank" rel="noopener" data-suara="klik"><span class="tanda i">REP</span><span style="flex:1"><b>' + esc(t('openReport')) + '</b><span class="ket">mofmo-lapangan.pages.dev</span></span></a>' +
      '<a class="kartu muncul tugas" style="padding:20px;animation-delay:120ms" href="' + APP_LAPANGAN + '?mode=atasan" target="_blank" rel="noopener" data-suara="klik"><span class="tanda n">MGR</span><span style="flex:1"><b>' + (id ? 'Mode atasan di aplikasi lapangan' : 'Manager view in the field app') + '</b><span class="ket">' + (id ? 'Kode akses papan yang sama' : 'Same board access code') + '</span></span></a></section>';
    html += '<section class="kartu muncul" style="animation-delay:160ms"><div class="baris" style="margin-bottom:12px"><h2>' + (id ? 'Laporan lapangan pekan ini' : 'Field report this week') + '</h2></div><div id="wadahLapangan">' + (S.lapangan ? '' : '<div class="kerangka" style="height:420px"></div>') + '</div></section>';
    return html;
  }
  function pasangLaporanLapangan() {
    var w = document.getElementById('wadahLapangan'); if (!w || !S.lapangan) return;
    var root = w.shadowRoot || w.attachShadow({ mode: 'open' });
    root.innerHTML = String(S.lapangan.html || '<p>' + esc(t('noData')) + '</p>');
    /* Tautan "detail" di laporan menuju laporan lapangan Cloudflare. */
    Array.prototype.forEach.call(root.querySelectorAll('a[href]'), function (a) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); });
  }

  /* ================= halaman: kalender ================= */
  function acaraTahun(th) {
    var id = bhs() === 'id';
    var ev = [];
    for (var b = 0; b < 12; b++) ev.push({ t: th + '-' + ('0' + (b + 1)).slice(-2) + '-25', n: id ? 'Akhir pekan gajian' : 'Payday weekend', k: id ? 'Keduanya' : 'Both', tugas: id ? ['Barang terlaris ada di rak 3 gerai teratas', 'Stok online dicadangkan'] : ['Best sellers on shelf in top 3 stores', 'Online stock reserved'] });
    ev.push({ t: th + '-09-09', n: '9.9 sale', k: 'Shopee', tugas: id ? ['Daftar harga promo', 'Stok online di HO'] : ['Promo price list', 'Online stock at HO'] });
    ev.push({ t: th + '-10-10', n: '10.10 sale', k: 'Shopee', tugas: id ? ['Daftar harga promo', 'Stok online di HO', 'Jadwal jemput kurir'] : ['Promo price list', 'Online stock at HO', 'Courier pickup booked'] });
    ev.push({ t: th + '-11-11', n: '11.11 sale', k: 'Shopee', tugas: id ? ['Daftar harga promo siap 1 minggu sebelum', 'Cadangkan stok online', 'Shift pick & pack tambahan'] : ['Promo price list ready a week before', 'Reserve online stock', 'Extra pick and pack shift'] });
    ev.push({ t: th + '-12-12', n: '12.12 sale', k: 'Shopee', tugas: id ? ['Daftar harga promo', 'Cadangkan stok online', 'Jemput kurir dipesan'] : ['Promo price list', 'Reserve online stock', 'Courier pickups booked'] });
    ev.push({ t: th + '-12-01', n: id ? 'Musim Natal di gerai' : 'Christmas in stores', k: 'Offline', tugas: id ? ['Kiriman ke semua gerai ditandatangani akhir November', 'Foto display tiap gerai', 'Properti display Natal'] : ['Shipments to all stores signed by end of November', 'Display photos per store', 'Christmas display props'] });
    ev.push({ t: th + '-12-19', n: id ? 'Libur sekolah' : 'School holiday', k: 'Offline', tugas: id ? ['Isi ulang kedua untuk terlaris', 'Jadwal kunjungan semua gerai', 'Opname sebelum tutup tahun'] : ['Second refill for best sellers', 'Visits cover all stores', 'Count before closing the year'] });
    return ev;
  }
  function halKalender() {
    var m = model(), id = bhs() === 'id', now = keTanggal(m.hari) || new Date();
    var s0 = senin(now), mg = [];
    for (var i = -11; i <= 14; i++) { var a = new Date(s0); a.setDate(a.getDate() + i * 7); var b = new Date(a); b.setDate(b.getDate() + 6); mg.push({ a: kunciTgl(a), b: kunciTgl(b), lalu: i < 0, kini: i === 0, label: a.getDate() + ' ' + BLN[bhs()][a.getMonth()] }); }
    labelMinggu(mg);
    var ev = acaraTahun(now.getFullYear()).concat(acaraTahun(now.getFullYear() + 1));
    mg.forEach(function (w) { w.pcs = (w.lalu || w.kini) ? jumlah(jualAntara(m, w.a, w.b), function (j) { return j.q; }) : null; w.ev = ev.filter(function (e) { return e.t >= w.a && e.t <= w.b && !/gajian|payday/i.test(e.n); }); });
    var maks = Math.max.apply(null, mg.map(function (w) { return w.pcs || 0; }).concat([4]));
    var nanti = ev.filter(function (e) { return e.t >= m.hari; }).sort(function (a, b) { return a.t < b.t ? -1 : 1; }).slice(0, 8);
    var html = '<section class="kartu muncul" style="display:flex;flex-direction:column;gap:12px"><div class="baris"><h2>' + (id ? 'Terjual per minggu, dengan acara penjualan' : 'Sold per week, with selling events') + '</h2><span class="lbl">pcs</span></div>' +
      '<div class="tabel-box"><div style="min-width:980px"><div class="batang-area" style="gap:6px;height:240px">' + mg.map(function (w, i) {
        return '<div class="batang-kol" style="background:' + (w.ev.length ? 'var(--chip)' : 'transparent') + ';border-radius:8px 8px 0 0;' + (w.kini ? 'box-shadow:inset 0 0 0 2px var(--acc)' : '') + '" title="' + esc(w.label + (w.ev.length ? ' · ' + w.ev.map(function (e) { return e.n; }).join(', ') : '')) + '">' +
          (w.ev.length ? '<span style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:12px;font-weight:800;color:var(--chipInk);margin-bottom:auto;padding-top:8px">' + esc(w.ev[0].n) + '</span>' : '') +
          (w.pcs !== null ? '<span class="num" style="font-size:12px">' + w.pcs + '</span><span class="batang' + (w.kini ? ' terakhir' : '') + '" style="height:' + Math.max(3, Math.round(w.pcs / maks * 160)) + 'px;animation-delay:' + (i * 20) + 'ms;width:70%"></span>' : '<span style="width:70%;height:22px;border:1px dashed var(--line);border-radius:6px 6px 0 0"></span>') + '</div>';
      }).join('') + '</div><div class="label-batang" style="gap:6px">' + mg.map(function (w) { return '<span style="font-size:11px">' + esc(w.label) + '</span>'; }).join('') + '</div></div></div></section>';
    html += '<section class="kartu muncul" style="animation-delay:80ms;display:flex;flex-direction:column;gap:10px"><h2>' + (id ? 'Acara berikutnya' : 'Coming up') + '</h2>' + nanti.map(function (e) { var hari = selisihHari(m.hari, e.t); return '<details style="border:1px solid var(--line2);border-radius:12px;padding:12px 14px"><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:700;list-style:none" data-suara="klik"><span>' + esc(e.n) + ' <span class="pil n">' + esc(e.k) + '</span></span><span class="num" style="color:var(--mut);font-size:14px">' + tglPendek(e.t) + ' · ' + (hari === 0 ? (id ? 'hari ini' : 'today') : hari === 1 ? (id ? 'besok' : 'tomorrow') : (id ? hari + ' hari lagi' : 'in ' + hari + ' days')) + '</span></summary><div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">' + e.tugas.map(function (x) { return '<label class="centang" style="min-height:36px"><input type="checkbox">' + esc(x) + '</label>'; }).join('') + '</div></details>'; }).join('') + '</section>';
    return html;
  }

  /* ================= halaman: label QR ================= */
  function halLabel(r) {
    var g = S.gudang, id = bhs() === 'id';
    if (!g) return memuatHtml();
    var zona = []; (g.lokasi || []).forEach(function (l) { var z = l.zona || l.unit || '?'; if (zona.indexOf(z) < 0) zona.push(z); });
    var z = r && r.arg && zona.indexOf(r.arg) > -1 ? r.arg : zona[0];
    var lok = (g.lokasi || []).filter(function (l) { return (l.zona || l.unit || '?') === z; });
    var html = '<section class="kartu muncul jangan-cetak" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><span class="lbl">' + esc(t('zone')) + '</span>' + zona.map(function (x) { return '<a class="chipbtn' + (x === z ? ' on' : '') + '" style="display:inline-flex;align-items:center;text-decoration:none" href="#/labels/' + encodeURIComponent(x) + '" data-suara="klik">' + esc(x) + '</a>'; }).join('') + '<span style="flex:1"></span><button type="button" class="btn" data-aksi="cetak">' + esc(t('print')) + ' · ' + lok.length + '</button></section>' +
      '<div class="peringatan jangan-cetak">' + (id ? 'Cetak di kertas stiker A4, 2 x 6. Scan QR pakai kamera HP untuk membuka rak itu di WMS.' : 'Print on A4 sticker paper, 2 x 6. Scan a QR with the phone camera to open that rack in the WMS.') + '</div>' +
      '<section class="lembar-label" id="lembarLabel">' + lok.map(function (l) { return '<div class="label-qr"><span class="qr" data-isi="' + esc(location.origin + location.pathname + '#lokasi=' + l.kode) + '"></span><div><div class="kode">' + esc(l.kode) + '</div><div style="font-weight:700;font-size:14px">' + esc(z) + (l.sku ? ' · ' + esc(l.sku) : '') + '</div><div style="font-size:12px;color:#4A433C">' + (id ? 'Scan untuk membuka di WMS' : 'Scan to open in WMS') + '</div></div></div>'; }).join('') + '</section>';
    return html;
  }
  var qrJanji = null;
  function muatQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (qrJanji) return qrJanji;
    qrJanji = new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = QR_LIB; s.onload = function () { ok(window.qrcode); }; s.onerror = function () { qrJanji = null; gagal(new Error('QR library could not load.')); }; document.head.appendChild(s); });
    return qrJanji;
  }
  function gambarQr() {
    var el = document.querySelectorAll('.qr[data-isi]'); if (!el.length) return;
    muatQr().then(function (q) {
      Array.prototype.forEach.call(el, function (e) { try { var qr = q(0, 'M'); qr.addData(e.getAttribute('data-isi')); qr.make(); e.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); e.setAttribute('data-siap', '1'); } catch (x) { e.textContent = 'QR'; } });
    }, function () { Array.prototype.forEach.call(el, function (e) { e.textContent = 'QR'; }); });
  }

  /* ================= halaman: kualitas data ================= */
  function halKualitas() {
    var m = model(), id = bhs() === 'id', s = m.d.sehat || {};
    var tem = (s.temuan || []).slice().sort(function (a, b) { return (/berat/i.test(b.bobot) ? 1 : 0) - (/berat/i.test(a.bobot) ? 1 : 0); });
    return '<section class="grid-kpi">' + [[id ? 'Temuan berat' : 'Serious findings', s.berat || 0, 'w'], [id ? 'Temuan ringan' : 'Minor findings', s.ringan || 0, 'n'], [t('products'), s.jmlProduk || m.prod.length, 'n'], [t('rows'), s.jmlBaris || (m.d.baris || []).length, 'n']].map(function (k, i) { return '<div class="kartu kpi muncul" style="animation-delay:' + i * 50 + 'ms"><span class="lbl">' + esc(k[0]) + '</span><span class="angka" data-hitung="' + k[1] + '" data-format="n" style="color:' + (k[2] === 'w' && k[1] ? 'var(--wInk)' : 'inherit') + '">' + nf(k[1]) + '</span></div>'; }).join('') + '</section>' +
      '<section class="kartu muncul" style="display:flex;flex-direction:column;gap:10px;animation-delay:200ms"><h2>' + esc(t('findings')) + '</h2>' + (tem.length ? tem.map(function (x) { var b = /berat/i.test(x.bobot); return '<div class="tugas" style="cursor:default"><span class="tanda ' + (b ? 'w' : 'n') + '">' + (b ? '!' : 'i') + '</span><span style="flex:1;min-width:0"><b>' + esc(x.judul) + (x.jml ? ' · ' + nf(x.jml) : '') + '</b><span class="ket">' + esc(x.ket || '') + '</span>' + ((x.contoh || []).length ? '<span class="ket num" style="font-size:12px">' + esc((x.contoh || []).join(' · ')).slice(0, 220) + '</span>' : '') + '</span></div>'; }).join('') : '<div class="kosong">' + esc(t('nothing')) + '</div>') + '</section>';
  }

  /* ================= palet cari / scan ================= */
  var palet = { buka: false, q: '', sel: 0 };
  function hasilCari(q) {
    q = String(q || '').trim().toLowerCase(); var out = [], id = bhs() === 'id';
    var m = S.data ? model() : null;
    var hal = [['summary', '#/summary'], ['stock', '#/stock'], ['map', '#/map'], ['stores', '#/stores'], ['passport', '#/passport'], ['shipments', '#/shipments'], ['field', '#/field'], ['calendar', '#/calendar'], ['labels', '#/labels'], ['quality', '#/quality']];
    hal.forEach(function (h) { if (!q || t(h[0]).toLowerCase().indexOf(q) > -1) out.push({ g: id ? 'Halaman' : 'Pages', ik: 'GO', j: t(h[0]), k: '', h: h[1] }); });
    if (q && m) {
      m.prod.forEach(function (p) { var hay = (p.n + ' ' + p.b + ' ' + (p.s || '')).toLowerCase(); if (hay.indexOf(q) > -1) out.push({ g: 'SKU', ik: 'SKU', j: p.n, k: p.b + (p.s ? ' · ' + p.s : ''), h: '#/passport/' + encodeURIComponent(p.b), persis: String(p.b).toLowerCase() === q || String(p.s || '').toLowerCase() === q }); });
      m.toko.forEach(function (li) { var l = m.lok[li]; if ((l.n + ' ' + (l.r || '') + ' ' + l.k).toLowerCase().indexOf(q) > -1) out.push({ g: id ? 'Gerai' : 'Stores', ik: 'TK', j: l.n, k: l.r || '', h: '#/stores' }); });
    }
    if (q && S.kiriman) (S.kiriman.daftar || []).forEach(function (x) { if ((String(x.ref) + ' ' + (x.noSj || '') + ' ' + (x.tujuan || '') + ' ' + (x.noPo || '')).toLowerCase().indexOf(q) > -1) out.push({ g: id ? 'Dokumen' : 'Documents', ik: 'DO', j: (x.noSj || x.ref) + ' · ' + (x.tujuan || ''), k: x.tahap, h: '#/shipments/' + encodeURIComponent(x.ref || '') }); });
    if (q && S.gudang) (S.gudang.lokasi || []).forEach(function (l) { if (String(l.kode).toLowerCase() === q || String(l.kode).toLowerCase().indexOf(q) === 0) out.push({ g: id ? 'Rak' : 'Racks', ik: 'RAK', j: l.kode + (l.sku ? ' · ' + l.sku : ''), k: (l.zona || '') + ' · ' + nf(l.persen) + '%', h: '#/map/' + encodeURIComponent(l.kode) }); });
    return out.slice(0, 40);
  }
  function gambarPalet() {
    var lama = document.getElementById('tiraiCari');
    if (!palet.buka) { if (lama) lama.remove(); return; }
    var h = hasilCari(palet.q), grup = '', isi = '';
    if (palet.sel >= h.length) palet.sel = Math.max(0, h.length - 1);
    h.forEach(function (x, i) { if (x.g !== grup) { grup = x.g; isi += '<div class="palet-grup">' + esc(grup) + '</div>'; } isi += '<button type="button" class="palet-item' + (i === palet.sel ? ' on' : '') + '" data-aksi="paletPilih" data-nilai="' + i + '"><span class="tanda n" style="width:36px;height:36px;font-size:11px">' + esc(x.ik) + '</span><span style="flex:1;min-width:0"><b style="display:block">' + esc(x.j) + '</b><span style="font-size:13px;color:var(--mut)" class="num">' + esc(x.k) + '</span></span></button>'; });
    var html = '<div class="palet" role="dialog" aria-label="Search"><div class="palet-input" id="paletInput">' + svg(IK.cari, 20) + '<label class="sr" for="q">Search</label><input id="q" value="' + esc(palet.q) + '" placeholder="' + esc(t('search')) + '" autocomplete="off"><span class="kbd">Esc</span></div><div class="palet-hasil">' + (isi || '<div class="kosong">' + (bhs() === 'id' ? 'Tidak ketemu.' : 'Nothing found.') + '</div>') + '</div></div>';
    if (!lama) { lama = document.createElement('div'); lama.className = 'tirai'; lama.id = 'tiraiCari'; document.body.appendChild(lama); lama.addEventListener('mousedown', function (e) { if (e.target === lama) tutupPalet(); }); }
    var fokusDi = document.activeElement && document.activeElement.id === 'q', pos = fokusDi ? document.activeElement.selectionStart : null;
    lama.innerHTML = html; lama._hasil = h;
    var inp = document.getElementById('q'); inp.focus(); if (pos !== null) inp.setSelectionRange(pos, pos); else inp.setSelectionRange(inp.value.length, inp.value.length);
  }
  function bukaPalet() { palet.buka = true; palet.q = ''; palet.sel = 0; Suara.klik(); gambarPalet(); }
  function tutupPalet() { palet.buka = false; gambarPalet(); }
  function pilihPalet(i) {
    var t2 = document.getElementById('tiraiCari'), h = (t2 && t2._hasil) || [];
    var x = h[i];
    if (!x) {
      /* Enter tanpa hasil, isian mirip barcode: scan ditolak. */
      if (/^[0-9A-Za-z-]{6,}$/.test(palet.q.trim())) { Suara.scanTolak(); getar([60, 60, 60]); var pi = document.getElementById('paletInput'); if (pi) { pi.style.animation = 'none'; void pi.offsetWidth; pi.style.animation = 'geleng .45s ease'; } toast((bhs() === 'id' ? 'Ditolak: ' : 'Rejected: ') + palet.q.trim() + (bhs() === 'id' ? ' tidak dikenal.' : ' is not known.'), 'w'); }
      return;
    }
    if (x.persis) { Suara.scanOk(); getar(30); } else Suara.klik();
    palet.buka = false; gambarPalet(); location.hash = x.h;
  }

  /* ================= gambar ================= */
  var GAMBAR = {
    summary: { judul: 'summary', fn: halRingkas, butuh: ['data'], lazim: ['gudang', 'kiriman'] },
    stock: { judul: 'stock', fn: halStok, butuh: ['data'] },
    map: { judul: 'map', fn: halPeta, butuh: ['gudang'], lazim: ['data'] },
    stores: { judul: 'stores', fn: halGerai, butuh: ['data'] },
    passport: { judul: 'passport', fn: halPaspor, butuh: ['data'] },
    shipments: { judul: 'shipments', fn: halKirim, butuh: ['kiriman'] },
    field: { judul: 'field', fn: halLapangan, butuh: [], lazim: ['lapangan'] },
    calendar: { judul: 'calendar', fn: halKalender, butuh: ['data'] },
    labels: { judul: 'labels', fn: halLabel, butuh: ['gudang'] },
    quality: { judul: 'quality', fn: halKualitas, butuh: ['data'] }
  };
  function kecilJudul(hal) {
    var id = bhs() === 'id', d = S.data || {};
    var tgl = d.hariIni ? tglPendek(d.hariIni) + ' ' + String(d.hariIni).slice(0, 4) : '';
    var map = { summary: tgl, stock: id ? 'Persediaan · semua lokasi' : 'Inventory · all locations', map: id ? 'Persediaan · HO Haery' : 'Inventory · HO Haery', stores: id ? 'Persediaan · rak gerai' : 'Inventory · store shelves', passport: id ? 'Persediaan · perjalanan satu SKU' : 'Inventory · one SKU journey', shipments: id ? 'Surat jalan dan Shopee' : 'Delivery orders and Shopee', field: id ? 'Operational PIC' : 'Operational PIC', calendar: id ? 'Perencanaan' : 'Planning', labels: id ? 'Perencanaan · cetak' : 'Planning · print', quality: id ? 'Diperiksa terus oleh sistem' : 'Checked continuously by the system' };
    return esc(map[hal] || '');
  }
  function gambar() {
    var app = document.getElementById('app');
    if (!S.tiket) { halamanSekarang = 'masuk'; document.documentElement.lang = bhs(); app.innerHTML = halMasuk(); pasangMasuk(); return; }
    var r = rute(), g = GAMBAR[r.hal] || GAMBAR.summary;
    halamanSekarang = r.hal; document.documentElement.lang = bhs();
    var siap = g.butuh.every(function (k) { return S[k]; });
    var isi = '';
    try { isi = siap ? g.fn(r) : memuatHtml(); } catch (e) { isi = galatHtml(e); console.error(e); }
    /* Gambar ulang di halaman yang sama (data susulan datang, ganti tema atau
       bahasa) tidak memutar ulang gerak masuk dan tidak membuang isian yang
       sedang diketik, misalnya kotak scan rak. */
    var jejak = location.hash + '|' + r.hal, tenang = siap && jejakSiap === jejak;
    var aktif = document.activeElement, idAktif = aktif && aktif.id && aktif.tagName === 'INPUT' ? aktif.id : '', nilaiAktif = idAktif ? aktif.value : '';
    app.innerHTML = kerangka(isi, r.hal, t(g.judul), kecilJudul(r.hal), '');
    document.body.classList.toggle('tenang', !!tenang);
    jejakSiap = siap ? jejak : '';
    document.title = t(g.judul) + ' · WMS Mofmofriends';
    if (idAktif) { var balik = document.getElementById(idAktif); if (balik) { balik.value = nilaiAktif; balik.focus(); } }
    pascaGambar(r, tenang);
    var kurang = g.butuh.filter(function (k) { return !S[k]; });
    var tambahan = (g.lazim || []).filter(function (k) { return !S[k]; });
    kurang.concat(tambahan).forEach(function (k) {
      muat(k).then(function () { if (halamanSekarang === r.hal) { gambar(); if (kurang.indexOf(k) > -1) Suara.isi(); } }, function (e) {
        if (halamanSekarang !== r.hal || kurang.indexOf(k) < 0) return;
        var u = document.getElementById('utama'); if (u && S.tiket) { var box = document.createElement('div'); box.innerHTML = galatHtml(e); u.appendChild(box.firstChild); Suara.gagal(); }
      });
    });
  }
  function pascaGambar(r, tenang) {
    if (gerakBoleh() && !tenang) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-hitung]'), function (el) {
        var akhir = Number(el.getAttribute('data-hitung')) || 0, fmt = el.getAttribute('data-format'); if (!akhir) return;
        var mulai = performance.now(), lama = 700;
        (function langkah(now) { var x = Math.min(1, (now - mulai) / lama), e = 1 - Math.pow(1 - x, 3), v = akhir * e; el.textContent = fmt === 'rp' ? rp(v) : nf(v); if (x < 1) requestAnimationFrame(langkah); else el.textContent = fmt === 'rp' ? rp(akhir) : nf(akhir); })(mulai);
      });
    }
    if (r.hal === 'field') pasangLaporanLapangan();
    if (r.hal === 'labels') gambarQr();
    if (r.hal === 'map' && document.getElementById('fokusScan')) { var s = document.getElementById('scanLok'); if (s) s.focus(); }
  }

  /* ================= kejadian ================= */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-aksi],[data-buka],[data-suara]') : null;
    if (!el) return;
    var a = el.getAttribute('data-aksi'), v = el.getAttribute('data-nilai');
    if (el.hasAttribute('data-buka')) { Suara.klik(); location.hash = el.getAttribute('data-buka'); return; }
    if (!a) { if (el.getAttribute('data-suara') === 'klik') Suara.klik(); return; }
    if (a === 'tema') { var baru = temaTerpakai() === 'dark' ? 'light' : 'dark'; setelan('wms_tema', baru); pasangTema(baru); Suara.klik(); gambar(); return; }
    if (a === 'temaAuto') { setelan('wms_tema', 'auto'); pasangTema('auto'); Suara.klik(); gambar(); toast(t('auto')); return; }
    if (a === 'suara') { setelan('wms_suara', Suara.nyala() ? 'off' : 'on'); Suara.klik(); gambar(); toast(Suara.nyala() ? t('soundOn') : t('soundOff')); return; }
    if (a === 'bahasa') { setelan('wms_bhs', bhs() === 'id' ? 'en' : 'id'); S.model = S.model; Suara.klik(); gambar(); return; }
    if (a === 'keluar') { keluarAkun(false); return; }
    if (a === 'cari') { bukaPalet(); return; }
    if (a === 'paletPilih') { pilihPalet(Number(v)); return; }
    if (a === 'muat') {
      Suara.klik(); var r = rute(), g = GAMBAR[r.hal] || GAMBAR.summary;
      var daftar = g.butuh.concat(g.lazim || []); if (!daftar.length) daftar = ['data'];
      Promise.all(daftar.map(function (k) { return muat(k, true); })).then(function () { Suara.isi(); toast(bhs() === 'id' ? 'Data terbaru dimuat' : 'Latest data loaded'); gambar(); }, function (er) { Suara.gagal(); toast(er.message, 'w'); });
      return;
    }
    if (a === 'saringStok') { saringStok = v; Suara.klik(); gambar(); return; }
    if (a === 'saringPaspor') { saringPaspor = v; Suara.klik(); gambar(); return; }
    if (a === 'saringKirim') { saringKirim = v; Suara.klik(); gambar(); return; }
    if (a === 'ritel') { saringRitel = v; Suara.klik(); gambar(); return; }
    if (a === 'lokasi') { Suara.klik(); location.hash = '#/map/' + encodeURIComponent(v); return; }
    if (a === 'cetak') { Suara.klik(); window.print(); return; }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && S.tiket) { e.preventDefault(); if (palet.buka) tutupPalet(); else bukaPalet(); return; }
    if (palet.buka) {
      if (e.key === 'Escape') { e.preventDefault(); tutupPalet(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palet.sel += e.key === 'ArrowDown' ? 1 : -1; if (palet.sel < 0) palet.sel = 0; gambarPalet(); return; }
      if (e.key === 'Enter') { e.preventDefault(); var h = hasilCari(palet.q); var persis = h.filter(function (x) { return x.persis; }); var idx = persis.length ? h.indexOf(persis[0]) : (palet.q.trim() ? (h.filter(function (x) { return x.g !== 'Pages' && x.g !== 'Halaman'; }).length ? palet.sel : (h.length && palet.q && h[palet.sel] && (h[palet.sel].g === 'Pages' || h[palet.sel].g === 'Halaman') ? palet.sel : -1)) : palet.sel); pilihPalet(idx); return; }
    }
    if (e.key === 'Enter' && e.target && e.target.id === 'scanLok') { e.preventDefault(); cekScanLokasi(e.target); }
  });
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'q') { palet.q = e.target.value; palet.sel = 0; gambarPalet(); } });
  window.addEventListener('hashchange', function () { if (palet.buka) tutupPalet(); gambar(); var u = document.getElementById('utama'); if (u) window.scrollTo(0, 0); });
  /* Tema otomatis ikut jam: dicek tiap 5 menit. */
  setInterval(function () { if ((setelan('wms_tema') || 'auto') === 'auto') { var j = new Date().getHours(), mau = j >= 6 && j < 18 ? 'light' : 'dark'; if (mau !== temaTerpakai()) { pasangTema('auto'); gambar(); } } }, 300000);

  window.__wms = { model: function () { return model(); }, S: S, Suara: Suara };
  gambar();
})();
