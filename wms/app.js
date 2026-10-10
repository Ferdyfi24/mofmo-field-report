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
     Beruang orisinal (bukan karakter resmi Mofmofriends). Garis luar selalu
     hitam, bulu krem, telinga dalam oren. Ekspresi: diam (kedip), senang
     (mata lengkung), sedih (mata > <). */
  var BULU = '#F6E8D6', PIPI = '#F4B4A2';
  function bonekaBesar(ekspresi) {
    var mata = ekspresi === 'senang' ? '<path d="M38 66 Q45 56 52 66 M68 66 Q75 56 82 66" fill="none" stroke-width="3.5" stroke-linecap="round"></path>'
      : ekspresi === 'sedih' ? '<path d="M39 58 L49 64 L39 70 M81 58 L71 64 L81 70" fill="none" stroke-width="3.5" stroke-linecap="round"></path>'
      : '<circle class="kedip" cx="45" cy="64" r="5" fill="#121212" stroke="none"></circle><circle class="kedip" cx="75" cy="64" r="5" fill="#121212" stroke="none"></circle>';
    return '<svg viewBox="0 0 120 124" stroke="#121212" stroke-width="3" stroke-linejoin="round" aria-hidden="true">' +
      '<path class="telinga" d="M41.0 30.0Q43.3 35.6 38.1 38.8Q36.7 44.7 30.6 44.3Q26.0 48.2 21.4 44.3Q15.3 44.7 13.9 38.8Q8.7 35.6 11.0 30.0Q8.7 24.4 13.9 21.2Q15.3 15.3 21.4 15.7Q26.0 11.8 30.6 15.7Q36.7 15.3 38.1 21.2Q43.3 24.4 41.0 30.0Z" fill="' + BULU + '"></path>' +
      '<path class="telinga" d="M109.0 30.0Q111.3 35.6 106.1 38.8Q104.7 44.7 98.6 44.3Q94.0 48.2 89.4 44.3Q83.3 44.7 81.9 38.8Q76.7 35.6 79.0 30.0Q76.7 24.4 81.9 21.2Q83.3 15.3 89.4 15.7Q94.0 11.8 98.6 15.7Q104.7 15.3 106.1 21.2Q111.3 24.4 109.0 30.0Z" fill="' + BULU + '"></path>' +
      '<circle cx="26" cy="30" r="7" fill="#F26419" stroke="none"></circle><circle cx="94" cy="30" r="7" fill="#F26419" stroke="none"></circle>' +
      '<path d="M102.0 66.0Q105.9 72.6 100.3 77.8Q102.2 85.3 95.3 88.7Q95.1 96.4 87.5 97.7Q85.1 105.0 77.4 104.2Q73.1 110.5 66.0 107.6Q60.0 112.4 54.0 107.6Q46.9 110.5 42.6 104.2Q34.9 105.0 32.5 97.7Q24.9 96.4 24.7 88.7Q17.8 85.3 19.7 77.8Q14.1 72.6 18.0 66.0Q14.1 59.4 19.7 54.2Q17.8 46.7 24.7 43.3Q24.9 35.6 32.5 34.3Q34.9 27.0 42.6 27.8Q46.9 21.5 54.0 24.4Q60.0 19.6 66.0 24.4Q73.1 21.5 77.4 27.8Q85.1 27.0 87.5 34.3Q95.1 35.6 95.3 43.3Q102.2 46.7 100.3 54.2Q105.9 59.4 102.0 66.0Z" fill="' + BULU + '"></path>' +
      '<ellipse cx="60" cy="82" rx="17" ry="13" fill="#FFFFFF"></ellipse><ellipse cx="60" cy="76" rx="5.5" ry="4" fill="#121212" stroke="none"></ellipse>' +
      '<path d="M60 80 Q60 88 53 88 M60 80 Q60 88 67 88" fill="none" stroke-width="2.5"></path>' +
      '<circle cx="35" cy="80" r="7" fill="' + PIPI + '" stroke="none"></circle><circle cx="85" cy="80" r="7" fill="' + PIPI + '" stroke="none"></circle>' +
      mata +
      '<ellipse cx="40" cy="116" rx="13" ry="9" fill="' + BULU + '"></ellipse><ellipse cx="80" cy="116" rx="13" ry="9" fill="' + BULU + '"></ellipse></svg>';
  }
  function bonekaKecil(kelas, ekspresi) {
    var mata = ekspresi === 'senang' ? '<path d="M27 43 Q31 37 35 43 M45 43 Q49 37 53 43" fill="none" stroke-width="2.5" stroke-linecap="round"></path>'
      : ekspresi === 'tidur' ? '<path d="M27 42 Q31 45 35 42 M45 42 Q49 45 53 42" fill="none" stroke-width="2.5" stroke-linecap="round"></path>'
      : ekspresi === 'sedih' ? '<path d="M27 38 L34 42 L27 46 M53 38 L46 42 L53 46" fill="none" stroke-width="2.5" stroke-linecap="round"></path>'
      : '<circle class="kedip" cx="31" cy="42" r="3" fill="#121212" stroke="none"></circle><circle class="kedip" cx="49" cy="42" r="3" fill="#121212" stroke="none"></circle>';
    return '<svg class="' + (kelas || '') + '" viewBox="0 0 80 74" stroke="#121212" stroke-width="2.5" stroke-linejoin="round" aria-hidden="true">' +
      '<path class="telinga" d="M28.0 20.0Q29.5 24.7 25.1 27.1Q22.7 31.5 18.0 30.0Q13.3 31.5 10.9 27.1Q6.5 24.7 8.0 20.0Q6.5 15.3 10.9 12.9Q13.3 8.5 18.0 10.0Q22.7 8.5 25.1 12.9Q29.5 15.3 28.0 20.0Z" fill="' + BULU + '"></path>' +
      '<path class="telinga" d="M72.0 20.0Q73.5 24.7 69.1 27.1Q66.7 31.5 62.0 30.0Q57.3 31.5 54.9 27.1Q50.5 24.7 52.0 20.0Q50.5 15.3 54.9 12.9Q57.3 8.5 62.0 10.0Q66.7 8.5 69.1 12.9Q73.5 15.3 72.0 20.0Z" fill="' + BULU + '"></path>' +
      '<circle cx="18" cy="20" r="4.5" fill="#F26419" stroke="none"></circle><circle cx="62" cy="20" r="4.5" fill="#F26419" stroke="none"></circle>' +
      '<path d="M66.0 44.0Q68.6 49.7 64.0 53.9Q64.3 60.2 58.4 62.4Q56.2 68.3 49.9 68.0Q45.7 72.6 40.0 70.0Q34.3 72.6 30.1 68.0Q23.8 68.3 21.6 62.4Q15.7 60.2 16.0 53.9Q11.4 49.7 14.0 44.0Q11.4 38.3 16.0 34.1Q15.7 27.8 21.6 25.6Q23.8 19.7 30.1 20.0Q34.3 15.4 40.0 18.0Q45.7 15.4 49.9 20.0Q56.2 19.7 58.4 25.6Q64.3 27.8 64.0 34.1Q68.6 38.3 66.0 44.0Z" fill="' + BULU + '"></path>' +
      '<ellipse cx="40" cy="52" rx="9" ry="7" fill="#FFFFFF"></ellipse>' + mata +
      '<ellipse cx="40" cy="49" rx="3.5" ry="2.5" fill="#121212" stroke="none"></ellipse>' +
      '<circle cx="24" cy="50" r="4" fill="' + PIPI + '" stroke="none"></circle><circle cx="56" cy="50" r="4" fill="' + PIPI + '" stroke="none"></circle></svg>';
  }

  /* ================= halaman: masuk (L4) ================= */
  var putarPapan = null, langkahPapan = 0;
  function tahapGudang() { return bhs() === 'id' ? ['AMBIL', 'KEMAS', 'SIAP KIRIM', 'PERJALANAN', 'TERKIRIM'] : ['PICKING', 'PACKING', 'STAGING', 'IN TRANSIT', 'DELIVERED']; }
  function barisKeping(teks, oren, mulai) {
    var s = (String(teks) + '              ').slice(0, 14).split('');
    return '<div class="papan-baris">' + s.map(function (h, i) { return '<span class="keping' + (oren ? ' oren' : '') + '" style="animation-delay:' + (mulai + i * 45) + 'ms">' + (h === ' ' ? '' : esc(h)) + '</span>'; }).join('') + '</div>';
  }
  function garisTahap(aktif) {
    return tahapGudang().map(function (n, i) { return '<span class="' + (i <= aktif ? 'lewat' : '') + (i === aktif ? ' kini' : '') + '">' + esc(n) + '</span>'; }).join('');
  }
  var KATA_BONEKA = {
    en: { diam: 'MOF! CODE, PLEASE', cek: 'SNIFFING THE CODE…', senang: 'YAY! OPENING THE LEDGER', sedih: 'HMM. TRY THAT CODE AGAIN' },
    id: { diam: 'MOF! KODENYA DONG', cek: 'LAGI DIENDUS…', senang: 'YAY! BUKU BESAR DIBUKA', sedih: 'HMM. COBA KODENYA LAGI' }
  };
  function halMasuk() {
    var id = bhs() === 'id', aktif = langkahPapan % 5, tahap = tahapGudang();
    var kardus = [['DO-0101', 110, ''], ['SHP-9', 96, ' k2'], ['PO-77', 124, ' k3']];
    var roda = ''; for (var i = 0; i < 12; i++) roda += '<g class="roda"><circle cx="' + (30 + i * 130) + '" cy="20" r="11"></circle><path d="M' + (30 + i * 130) + ' 9v22"></path></g>';
    return '<div class="masuk"><div class="masuk-isi">' +
      '<header class="masuk-atas"><div class="merek" style="padding:0"><div class="logo">M</div><div><b>Mofmofriends WMS</b><small>One Logistics Solutions</small></div></div>' +
      '<div class="alat"><button type="button" class="saklar" data-aksi="tema" aria-label="' + esc(temaTerpakai() === 'dark' ? t('day') : t('night')) + '"><span class="rel"><span class="tombol-rel"></span></span>' + esc(temaTerpakai() === 'dark' ? t('night') : t('day')) + '</button>' +
      '<button type="button" class="saklar" data-aksi="bahasa" aria-label="Language">' + (id ? 'ID' : 'EN') + '</button></div></header>' +
      '<div class="masuk-tengah"><div class="masuk-kiri">' +
      '<section class="papan" aria-label="' + (id ? 'Papan dok' : 'Dock board') + '"><div class="papan-kepala"><span>OUTBOUND · DOCK 01</span><span>HO HAERY · KEMANG SELATAN</span></div>' +
      barisKeping('MOFMOFRIENDS', false, 0) + barisKeping('WMS HO HAERY', false, 300) + '<div id="barisTahap">' + barisKeping('> ' + tahap[aktif], true, 0) + '</div></section>' +
      '<p class="slogan">' + (id ? 'Setiap boneka, setiap kardus, satu buku besar.' : 'Every plush, every box, one ledger.') + '</p>' +
      '<div class="tahap-garis" id="garisTahap">' + garisTahap(aktif) + '</div></div>' +
      '<form class="label-masuk" id="formMasuk" autocomplete="on">' +
      '<div class="gelembung" id="gelembung" role="status">' + esc(KATA_BONEKA[bhs()].diam) + '</div>' +
      '<div class="maskot" id="maskot">' + bonekaBesar('diam') + '</div>' +
      '<div class="dari"><div><small>' + (id ? 'DARI' : 'FROM') + '</small>HO HAERY · KEMANG</div><div><small>' + (id ? 'KE' : 'TO') + '</small>MOFMOFRIENDS WMS</div></div>' +
      '<div class="badan"><h1>' + (id ? 'Masuk' : 'Sign in') + '</h1>' +
      '<label for="kode" class="judul">' + (id ? 'KODE AKSES' : 'ACCESS CODE') + '</label>' +
      '<input id="kode" name="kode" type="password" autocomplete="current-password" required>' +
      '<label class="centang"><input type="checkbox" id="ingat">' + (id ? 'TETAP MASUK · 7 HARI' : 'KEEP ME SIGNED IN · 7 DAYS') + '</label>' +
      '<button type="submit" class="btn" id="tMasuk"><span id="tMasukTeks">' + (id ? 'Buka WMS' : 'Open the WMS') + '</span><span aria-hidden="true">→</span></button>' +
      '<div class="galat" id="galatMasuk" role="alert"></div><div id="capMasuk"></div></div>' +
      '<div class="kaki"><span style="color:var(--mut)">' + (id ? 'PETUGAS FIELD OP' : 'FIELD OP STAFF') + '</span><a href="' + APP_LAPANGAN + '" style="font-weight:600">mofmo-lapangan.pages.dev/lapangan</a></div></form>' +
      '</div></div>' +
      '<div class="konveyor" aria-hidden="true"><div class="tiang"></div><div class="kepala-scan"></div><div class="laser"></div><div class="kilat">SCANNED</div>' +
      kardus.map(function (k) { return '<div class="kardus' + k[2] + '" style="width:' + k[1] + 'px">' + bonekaKecil('boneka') + '<div class="badan-kardus"><div class="tutup"></div><div class="label-k"><i style="width:2px"></i><i style="width:4px"></i><i style="width:1px"></i><i style="width:3px"></i><i style="width:2px"></i><i style="width:5px"></i><i style="width:1px"></i></div><div class="kode-k">' + k[0] + '</div></div></div>'; }).join('') +
      '<div class="sabuk"></div><svg class="roda-roda" viewBox="0 0 1500 40" preserveAspectRatio="xMinYMid slice"><g fill="none" stroke="currentColor" stroke-width="3">' + roda + '</g></svg>' +
      '<div class="hazard jalan"></div></div></div>';
  }
  function ekspresiBoneka(e) {
    var m = document.getElementById('maskot'), g = document.getElementById('gelembung'); if (!m) return;
    m.innerHTML = bonekaBesar(e === 'cek' ? 'diam' : e);
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
      b.innerHTML = barisKeping('> ' + tahapGudang()[a], true, 0); if (gt) gt.innerHTML = garisTahap(a);
    }, 2600);
    var inp = document.getElementById('kode');
    inp.addEventListener('input', function () { var g = document.getElementById('galatMasuk'); if (g && g.classList.contains('tolak')) { g.classList.remove('tolak'); g.textContent = ''; ekspresiBoneka('diam'); } });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var id = bhs() === 'id', kode = inp.value, ingat = document.getElementById('ingat').checked;
      var tb = document.getElementById('tMasuk'), tt = document.getElementById('tMasukTeks'), g = document.getElementById('galatMasuk');
      if (!String(kode).trim()) { Suara.scanTolak(); g.className = 'galat tolak'; g.textContent = id ? 'DITOLAK · KODE AKSES KOSONG' : 'REJECTED · ACCESS CODE IS EMPTY'; ekspresiBoneka('sedih'); inp.focus(); return; }
      tb.disabled = true; tt.textContent = t('checking'); g.className = 'galat'; g.textContent = ''; ekspresiBoneka('cek'); Suara.klik();
      masukServer(kode, ingat).then(function (h) {
        buang('wms_tiket'); buang('wms_ingat');
        taruh('wms_tiket', h.tiket, ingat); if (ingat) taruh('wms_ingat', '1', true);
        Suara.scanOk(); setTimeout(Suara.sukses, 120); getar(30);
        ekspresiBoneka('senang'); g.textContent = id ? 'KODE DITERIMA · MEMUAT BUKU BESAR' : 'CODE ACCEPTED · LOADING LEDGER';
        tt.textContent = id ? 'Membuka…' : 'Opening…';
        document.getElementById('capMasuk').innerHTML = '<div class="cap">' + (id ? 'LOLOS' : 'CHECKED') + '</div>';
        setTimeout(function () {
          S.tiket = h.tiket;
          gambar();
        }, gerakBoleh() ? 900 : 0);
      }).catch(function (e) {
        Suara.scanTolak(); getar([60, 60, 60]); ekspresiBoneka('sedih');
        g.className = 'galat tolak'; g.textContent = (id ? 'DITOLAK · ' : 'REJECTED · ') + String(e.message || '');
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
  var LAMA_KOTOR = 15 * 60 * 1000;
  var PAPAN = { mentah: null, tema: '', siap: false, mulai: 0, jaga: null, catat: [] };
  function kotor() { var w = 0; try { w = Number(ss() && ss().getItem('wms_kotor')) || 0; } catch (e) { w = 0; } return Date.now() - w < LAMA_KOTOR; }
  function tandaiKotor() { try { if (ss()) ss().setItem('wms_kotor', String(Date.now())); } catch (e) {} }
  function pesanBelumDeploy(e) {
    var s = String(e && e.message ? e.message : e);
    if (/tidak dibuka untuk WMS|not updated for the new WMS|tidak menjawab dengan benar|did not answer properly/i.test(s))
      return bhs() === 'id' ? 'Fitur ini menyala setelah Apps Script di-deploy versi baru.' : 'This feature turns on after the new Apps Script version is deployed.';
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
    var potret = bisaPotret ? kirimSupa({ fn: 'ambil', tiket: S.tiket, kunci: [kunci] }).then(function (h) {
      var x = h && h.ok && h.isi ? h.isi[kunci] : null; return x ? x.data : undefined;
    }, function () { return undefined; }) : Promise.resolve(undefined);
    return potret.then(function (d) {
      if (d !== undefined) { cat.dari = 'supa'; return d; }
      cat.dari = 'gas';
      if (!BACA_PAPAN[nama] && !BACA_TANPA_KODE[nama]) tandaiKotor();
      return kirim({ aksi: 'wms', fn: 'panggil', tiket: S.tiket, nama: nama, args: args }).then(function (x) {
        if (x && x.perluMasuk) { keluarAkun(true); throw new Error(x.pesan || 'Please sign in again.'); }
        return x;
      }, function (e) { cat.galat = String(e && e.message || e).slice(0, 80); throw new Error(pesanBelumDeploy(e)); });
    }).then(function (x) { return window.KulitPapan ? window.KulitPapan.ubahHasil(x, gelap) : x; });
  }
  function ambilKlien() {
    if (PAPAN.mentah) return Promise.resolve(PAPAN.mentah);
    return kirimSupa({ fn: 'ambil', tiket: S.tiket, kunci: ['klien|papan'] }, 60000).then(function (h) {
      if (h && h.perluMasuk) throw new Error('tiket');
      var x = h && h.ok && h.isi ? h.isi['klien|papan'] : null;
      if (!x || !x.data || !x.data.html) throw new Error('kosong');
      PAPAN.mentah = String(x.data.html); return PAPAN.mentah;
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
            var er = e instanceof Error ? e : new Error(String(e)); if (gagal) gagal(er, obj); else console.error(er);
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
    try {
      var lembar = new CSSStyleSheet(); lembar.replaceSync(C.cssBayang);
      var asli = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (o) { var r = asli.call(this, o); try { r.adoptedStyleSheets = [lembar]; } catch (e) {} return r; };
    } catch (e) {}
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
      if (tampil && !pernahTampil) { pernahTampil = true; H.siap(); pasangAlat(); }
      /* Papan lama keluar sendiri (tombol keluarnya, atau kodenya ditolak):
         layar kodenya muncul lagi. Layar kode itu kita sembunyikan, jadi
         halaman masuk WMS yang ambil alih. */
      var lk = document.getElementById('layarKode');
      hilang = pernahTampil && !tampil && lk && lk.style.display !== 'none' ? hilang + 1 : 0;
      if (hilang >= 3) H.keluar();
    }, 400);
    function tombol(teks, label, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-wms', '1'); b.setAttribute('aria-label', label); b.textContent = teks;
      b.style.cssText = 'font:600 12px/1 "IBM Plex Mono",monospace;text-transform:uppercase;padding:0 10px;margin-left:6px;height:40px;cursor:pointer';
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); });
      return b;
    }
    function pasangAlat() {
      var kanan = document.getElementById('kopKanan'); if (!kanan || kanan.querySelector('[data-wms]')) return;
      kanan.appendChild(tombol(C.gelap ? C.teks.malam : C.teks.siang, C.teks.tema, function () { H.tema(); }));
      kanan.appendChild(tombol(C.teks.keluar, C.teks.keluar, function () { H.keluarAkun(); }));
    }
  }

  function tirai(isi) { return '<div class="tirai-papan" id="tiraiPapan" role="status">' + isi + '</div>'; }
  function tiraiMuat() {
    var id = bhs() === 'id';
    return tirai('<div class="maskot-muat">' + bonekaBesar('diam') + '</div>' +
      '<div class="papan papan-kecil">' + barisKeping(id ? 'MEMUAT' : 'LOADING', false, 0) + barisKeping('> ' + (id ? 'BUKU BESAR' : 'THE LEDGER'), true, 200) + '</div>' +
      '<div class="lbl">' + (id ? 'Papan yang sama persis dengan papan lama, cuma lebih cepat.' : 'The exact same board as before, just faster.') + '</div>' +
      '<div class="garis-muat hazard jalan"></div>');
  }
  function tiraiGagal(teks) {
    var id = bhs() === 'id';
    return tirai('<div class="maskot-muat gelengKepala">' + bonekaBesar('sedih') + '</div><p class="galat tolak">' + esc(teks) + '</p>' +
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
    app.innerHTML = '<div class="wadah-papan">' + tiraiMuat() + '<iframe id="bingkaiPapan" title="WMS" class="bingkai-isi"></iframe></div>';
    PAPAN.bingkai = document.getElementById('bingkaiPapan');
    if (PAPAN.jaga) clearTimeout(PAPAN.jaga);
    PAPAN.jaga = setTimeout(function () {
      if (!PAPAN.siap && halamanSekarang === 'papan') { var tr = document.getElementById('tiraiPapan'); if (tr) tr.outerHTML = tiraiGagal(bhs() === 'id' ? 'Papan belum terbuka setelah 40 detik.' : 'The board did not open within 40 seconds.'); Suara.gagal(); }
    }, 40000);
    ambilKlien().then(function (mentah) {
      if (!PAPAN.bingkai || halamanSekarang !== 'papan') return;
      var gelap = PAPAN.tema === 'dark', K = window.KulitPapan;
      var id = bhs() === 'id';
      var C = { cssBayang: K.cssBayang(), gelap: gelap, teks: { siang: id ? 'Siang' : 'Day', malam: id ? 'Malam' : 'Night', tema: id ? 'Ganti siang atau malam' : 'Switch day or night', keluar: t('logout') } };
      var html = K.ubahHtml(mentah, gelap);
      var kepala = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">' +
        '<script>(' + String(PENGGANTI) + ')(' + JSON.stringify(C) + ');<\/script>';
      var gaya = '<style id="kulitL4">' + K.css(gelap) + '</style>';
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
    bukaTab: function (u) { if (/^https?:/i.test(String(u))) window.open(String(u), '_blank', 'noopener'); },
    tema: function () { var baru = temaTerpakai() === 'dark' ? 'light' : 'dark'; setelan('wms_tema', baru); pasangTema(baru); Suara.klik(); gambar(); }
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
  });
  /* Tema otomatis ikut jam: dicek tiap 5 menit. Di papan, ganti tema
     berarti papan dimuat ulang, jadi cuma dikerjakan di halaman masuk. */
  setInterval(function () { if ((setelan('wms_tema') || 'auto') === 'auto' && halamanSekarang === 'masuk') { var j = new Date().getHours(), mau = j >= 6 && j < 18 ? 'light' : 'dark'; if (mau !== temaTerpakai()) { pasangTema('auto'); gambar(); } } }, 300000);

  window.__wms = { S: S, Suara: Suara, PAPAN: PAPAN };
  gambar();
})();
