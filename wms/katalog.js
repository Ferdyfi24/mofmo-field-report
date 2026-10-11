/* Katalog WMS Mofmofriends (11 Okt 2026): semua SKU dan harga jual putus.
 *
 * Ferdy: "fitur catalog yang menampilkan semua SKU yang ada dan harga jual
 * putus, ... kayaknya 10%, di WMS sudah include pajak".
 *  - Harga jual putus memakai aturan beli putus yang sudah dipakai sistem ini
 *    untuk Gamotion: margin diambil DARI harga jual, bukan ditambahkan di atas
 *    modal. jualSebelumPajak = modal / (1 - margin), lalu ditambah pajak SKU itu
 *    sendiri (dibaca dari pasangan harga sebelum/sesudah pajak di Master Produk),
 *    bukan pengali 1,11 rata untuk semua SKU.
 *  - Margin bisa diubah di layar (bawaan 10%) dan diingat per perangkat.
 *  - Stok dihitung dari baris buku besar dataPapan, sama dengan Paspor SKU.
 *  - Unduhan (Ferdy, 11 Okt: "kasih opsi katalog itu pdf dan jpg juga serta
 *    excel"): PDF, JPG, Excel, CSV, dan Cetak. Semuanya dibuat di browser tanpa
 *    pustaka dari luar. JPG dan PDF digambar di kanvas (foto SKU dari situs ini
 *    sendiri), PDF berisi halaman JPEG A4. Excel berupa .xlsx sungguhan dengan
 *    sel margin di B2 dan rumus harga yang ikut berubah kalau margin diganti.
 * Lembar ini cuma membaca; tidak ada yang ditulis ke sistem.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !!(M().bhs && M().bhs() === 'id'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return document.getElementById(i); }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function nf(n) { return Number(n || 0).toLocaleString(id() ? 'id-ID' : 'en-US'); }
  function rp(n) { return 'Rp' + nf(n); }
  function persen(x) { var v = Math.round(x * 1000) / 10; return String(v).replace('.', id() ? ',' : '.') + '%'; }

  var TEKS = {
    en: {
      judul: 'Catalog', sub: 'All SKUs with the outright sale price, tax included', tutup: 'Close', cari: 'Find a SKU, name or barcode',
      semua: 'All', ho: 'In stock at HO', nol: 'No stock', urut: 'Sort', uNama: 'Name', uHarga: 'Price, highest first', uHo: 'HO stock, highest first',
      margin: 'Margin', cetak: 'Print', csv: 'Download CSV', unduh: 'Download', siapkan: 'Preparing the file…', gagalBerkas: 'The file could not be made. Try again.',
      halaman: function (i, n) { return 'Page ' + i + ' of ' + n; },
      xlsxCatatan: 'Change the margin in B2 and both outright price columns recalculate. Each SKU keeps its own tax rate from the product master.', muat: 'Reading the product master…', gagal: 'The product master could not be read right now. Check the signal and try again.',
      jual: 'Outright price', inkl: function (p) { return 'incl. ' + p + ' tax'; }, sebelum: 'before tax', modal: 'Wholesale', retail: 'Retail', stokHo: 'HO', stokTotal: 'total', pajak: 'tax',
      tanpaHarga: 'No price yet', kosong: 'No SKU matches.', jumlah: 'SKUs shown', per: 'Data as of',
      rumus: function (m) { return 'Outright price = wholesale ÷ (1 − ' + m + '). The ' + m + ' margin is taken from the selling price, the same rule the system uses for Gamotion. Each SKU then gets its own tax rate from the product master (PPN 11% for most), so the big number already includes tax.'; },
      cetakJudul: 'Mofmofriends outright sale price list', cetakKet: function (m, t) { return 'Margin ' + m + ' from the selling price, tax included. Printed ' + t + '.'; },
      kolom: ['SKU', 'Barcode', 'Name', 'HO stock', 'Total stock', 'Wholesale before tax', 'Outright price before tax', 'Tax %', 'Outright price incl. tax', 'Retail incl. tax']
    },
    id: {
      judul: 'Katalog', sub: 'Semua SKU dengan harga jual putus, sudah termasuk pajak', tutup: 'Tutup', cari: 'Cari SKU, nama, atau barcode',
      semua: 'Semua', ho: 'Ada stok HO', nol: 'Tanpa stok', urut: 'Urutkan', uNama: 'Nama', uHarga: 'Harga tertinggi', uHo: 'Stok HO terbanyak',
      margin: 'Margin', cetak: 'Cetak', csv: 'Unduh CSV', unduh: 'Unduh', siapkan: 'Menyiapkan berkas…', gagalBerkas: 'Berkas belum bisa dibuat. Coba lagi.',
      halaman: function (i, n) { return 'Halaman ' + i + ' dari ' + n; },
      xlsxCatatan: 'Ubah margin di B2, kedua kolom harga jual putus ikut terhitung ulang. Tarif pajak tiap SKU tetap dari Master Produk.', muat: 'Membaca Master Produk…', gagal: 'Master Produk belum bisa dibaca sekarang. Cek sinyal lalu coba lagi.',
      jual: 'Harga jual putus', inkl: function (p) { return 'termasuk pajak ' + p; }, sebelum: 'sebelum pajak', modal: 'Wholesale', retail: 'Retail', stokHo: 'HO', stokTotal: 'total', pajak: 'pajak',
      tanpaHarga: 'Belum ada harga', kosong: 'Tidak ada SKU yang cocok.', jumlah: 'SKU tampil', per: 'Data per',
      rumus: function (m) { return 'Harga jual putus = wholesale ÷ (1 − ' + m + '). Margin ' + m + ' diambil dari harga jual, aturan yang sama dengan Gamotion. Sesudah itu ditambah tarif pajak masing-masing SKU dari Master Produk (umumnya PPN 11%), jadi angka besar sudah termasuk pajak.'; },
      cetakJudul: 'Daftar harga jual putus Mofmofriends', cetakKet: function (m, t) { return 'Margin ' + m + ' dari harga jual, sudah termasuk pajak. Dicetak ' + t + '.'; },
      kolom: ['SKU', 'Barcode', 'Nama', 'Stok HO', 'Stok total', 'Wholesale sebelum pajak', 'Harga jual putus sebelum pajak', 'Pajak %', 'Harga jual putus termasuk pajak', 'Retail termasuk pajak']
    }
  };
  function t(k) { var d = TEKS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TEKS.en[k]; }

  /* ---------- harga ---------- */
  var MARGIN_BAWAAN = 0.1, KUNCI_MARGIN = 'wms_katalog_margin';
  /* Tarif pajak SKU dari pasangannya sendiri, dibulatkan ke 0,1% supaya harga
     sesudah pajak yang sudah dibulatkan di Master Produk tidak menggeser rupiah. */
  function tarifPajak(hs, h) { hs = Number(hs) || 0; h = Number(h) || 0; return hs > 0 && h > 0 ? Math.round((h / hs - 1) * 1000) / 1000 : 0; }
  function harga(hs, h, margin) {
    hs = Number(hs) || 0; if (!(hs > 0)) return null;
    var m = Number(margin); if (!(m >= 0 && m < 0.95)) m = MARGIN_BAWAAN;
    var pajak = tarifPajak(hs, h), sebelum = Math.round(hs / (1 - m));
    return { sebelum: sebelum, termasuk: Math.round(sebelum * (1 + pajak)), pajak: pajak, margin: m };
  }
  function bacaMargin() {
    var v = null; try { v = W.localStorage.getItem(KUNCI_MARGIN); } catch (e) { v = null; }
    var n = Number(v); return v != null && v !== '' && n >= 0 && n < 95 ? n / 100 : MARGIN_BAWAAN;
  }
  function simpanMargin(m) { try { W.localStorage.setItem(KUNCI_MARGIN, String(Math.round(m * 1000) / 10)); } catch (e) {} }

  /* ---------- data ---------- */
  var D = { janji: null, waktu: 0, data: null, daftar: [] };
  function muat(paksa) {
    if (D.janji && !paksa && Date.now() - D.waktu < 5 * 60 * 1000) return D.janji;
    D.waktu = Date.now();
    var m = M();
    D.janji = (m.jalan ? m.jalan('dataPapan', ['WMS-TIKET']) : Promise.reject(new Error('jalan'))).then(function (x) {
      if (!x || !x.prod) throw new Error('data');
      D.data = x; D.daftar = susun(x); return D;
    }).catch(function (e) { D.janji = null; throw e; });
    return D.janji;
  }
  /* Stok per SKU dari buku besar: HO, gerai (lokasi bertanda toko), TRANSIT, GMT. */
  function susun(x) {
    var L = x.lok || [], stok = {};
    var toko = function (l) { return !!(l && (l.toko === 1 || l.toko === '1' || l.toko === true)); };
    (x.baris || []).forEach(function (b) {
      var i = b[1], q = Number(b[2]) || 0, dr = L[b[3]] || {}, ke = L[b[4]] || {};
      var s = stok[i] = stok[i] || { ho: 0, total: 0 };
      [[dr, -q], [ke, q]].forEach(function (p) {
        var l = p[0], k = l.k;
        if (k === 'HO') s.ho += p[1];
        if (k === 'HO' || k === 'TRANSIT' || k === 'GMT' || toko(l)) s.total += p[1];
      });
    });
    return (x.prod || []).map(function (p, i) {
      var s = stok[i] || { ho: 0, total: 0 };
      return { p: p, ho: s.ho, total: s.total };
    });
  }

  /* ---------- foto ---------- */
  function norm(s) { return String(s || '').toLowerCase().replace(/mofmo ?friends/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function fotoUrl(nama) {
    var K = W.KulitPapan; if (!K || !K.fotoSku) return '';
    var f = K.fotoSku(nama); if (!f) return '';
    if (W.__IMG && W.__IMG['sku/' + f + '.webp']) return W.__IMG['sku/' + f + '.webp'];
    return K.dasar + 'sku/' + f + '.webp';
  }
  function inisial(nama) { var w = norm(nama).replace(/^(s|m|kc|kr|ball|bp|cap for|cap)\s+/, '').split(' ').filter(Boolean); return ((w[0] || '?')[0] + ((w[1] || '')[0] || '')).toUpperCase(); }
  function fotoHtml(nama) {
    var u = fotoUrl(nama);
    return u ? '<img class="foto-sku" src="' + esc(u) + '" alt="" draggable="false" loading="lazy">' : '<span class="foto-sku inisial" aria-hidden="true">' + esc(inisial(nama)) + '</span>';
  }

  /* ---------- lembar ---------- */
  var A = { saring: 'semua', urut: 'nama', cari: '', margin: MARGIN_BAWAAN, dari: null };
  function pastikanDom() {
    if (el('katalog')) return el('katalog');
    var d = document.createElement('div');
    d.id = 'katalog'; d.className = 'alat-latar katalog-latar'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="lembar" role="dialog" aria-modal="true" tabindex="-1"><div id="katalogIsi"></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      if (e.target === d) { tutup(); return; }
      var x = e.target.closest ? e.target.closest('[data-katalog],[data-saring]') : null;
      if (!x) return;
      if (x.hasAttribute('data-saring')) { bunyi('klik'); A.saring = x.getAttribute('data-saring'); gambarDaftar(); gambarSaring(); return; }
      var a = x.getAttribute('data-katalog');
      if (a === 'tutup') tutup();
      else if (a === 'cetak') cetak();
      else if (a === 'csv') unduhCsv();
      else if (a === 'pdf' || a === 'jpg' || a === 'xlsx') buatBerkas(a, x);
      else if (a === 'ulang') { bunyi('klik'); gambar(true); }
    });
    d.addEventListener('input', function (e) { if (e.target && e.target.id === 'katalogCari') { A.cari = e.target.value; gambarDaftar(); } });
    d.addEventListener('change', function (e) {
      var g = e.target; if (!g) return;
      if (g.id === 'katalogUrut') { A.urut = g.value; gambarDaftar(); }
      if (g.id === 'katalogMargin') {
        var n = Number(String(g.value).replace(',', '.'));
        if (!(n >= 0 && n < 95)) { g.value = String(Math.round(A.margin * 1000) / 10); return; }
        A.margin = n / 100; simpanMargin(A.margin); gambarDaftar(); gambarRumus();
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('buka')) { e.preventDefault(); tutup(); } });
    return d;
  }
  function buka() {
    var d = pastikanDom();
    A.margin = bacaMargin();
    if (!d.classList.contains('buka')) A.dari = document.activeElement;
    d.classList.add('buka'); d.setAttribute('aria-hidden', 'false'); document.body.classList.add('alat-terbuka');
    d.querySelector('.lembar').setAttribute('aria-label', t('judul'));
    bunyi('klik');
    gambar(false);
  }
  function tutup() {
    var d = el('katalog'); if (!d) return;
    d.classList.remove('buka'); d.setAttribute('aria-hidden', 'true'); document.body.classList.remove('alat-terbuka');
    try { if (A.dari && A.dari.focus) A.dari.focus(); } catch (e) {}
  }
  var IKON_TUTUP = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function gambar(paksa) {
    var isi = el('katalogIsi');
    isi.innerHTML = '<div class="kepala-alat kt-kepala"><div class="kt-judul"><h2>' + esc(t('judul')) + '</h2><small>' + esc(t('sub')) + '</small></div>' +
      '<button type="button" class="tutup-alat" data-katalog="tutup" aria-label="' + esc(t('tutup')) + '" title="' + esc(t('tutup')) + '">' + IKON_TUTUP + '</button></div>' +
      '<div class="kt-atur">' +
        '<input id="katalogCari" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t('cari')) + '" aria-label="' + esc(t('cari')) + '" value="' + esc(A.cari) + '">' +
        '<label class="kt-margin" for="katalogMargin"><span>' + esc(t('margin')) + '</span><input id="katalogMargin" type="number" inputmode="decimal" min="0" max="90" step="0.5" value="' + esc(Math.round(A.margin * 1000) / 10) + '"><b>%</b></label>' +
        '<label class="kt-urut"><span>' + esc(t('urut')) + '</span><select id="katalogUrut">' + ['nama', 'harga', 'ho'].map(function (u) { return '<option value="' + u + '"' + (A.urut === u ? ' selected' : '') + '>' + esc(t(u === 'nama' ? 'uNama' : u === 'harga' ? 'uHarga' : 'uHo')) + '</option>'; }).join('') + '</select></label>' +
      '</div>' +
      '<div class="kt-baris2"><div class="kt-saring" id="katalogSaring" role="group"></div>' +
        '<div class="kt-aksi"><span class="kt-unduh">' + esc(t('unduh')) + '</span>' + [['pdf', 'PDF'], ['jpg', 'JPG'], ['xlsx', 'Excel'], ['csv', 'CSV']].map(function (k) {
          return '<button type="button" class="btn dua" data-katalog="' + k[0] + '" aria-label="' + esc(t('unduh') + ' ' + k[1]) + '" title="' + esc(t('unduh') + ' ' + k[1]) + '">' + k[1] + '</button>';
        }).join('') + '<button type="button" class="btn" data-katalog="cetak">' + esc(t('cetak')) + '</button><span class="kt-status" id="katalogStatus" role="status" aria-live="polite"></span></div></div>' +
      '<div id="katalogDaftar" class="kt-daftar" aria-live="polite"><p class="ket-alat">' + esc(t('muat')) + '</p></div>' +
      '<p class="ket-alat kt-rumus" id="katalogRumus"></p>';
    gambarSaring(); gambarRumus();
    muat(paksa).then(function () { gambarDaftar(); gambarRumus(); }, function () {
      var w = el('katalogDaftar'); if (w) w.innerHTML = '<div class="tolak-alat" role="alert">' + esc(t('gagal')) + ' <button type="button" class="btn dua" data-katalog="ulang">↻</button></div>';
    });
  }
  function gambarSaring() {
    var w = el('katalogSaring'); if (!w) return;
    w.innerHTML = ['semua', 'ho', 'nol'].map(function (s) { return '<button type="button" class="chip-alat' + (A.saring === s ? ' on' : '') + '" data-saring="' + s + '" aria-pressed="' + (A.saring === s) + '">' + esc(t(s)) + '</button>'; }).join('');
  }
  function gambarRumus() {
    var w = el('katalogRumus'); if (!w) return;
    w.textContent = t('rumus')(persen(A.margin)) + (D.data && D.data.diperbarui ? ' ' + t('per') + ' ' + D.data.diperbarui + '.' : '');
  }
  function cocok(x) {
    var q = String(A.cari || '').trim().toLowerCase();
    if (q) {
      var n = norm(q), p = x.p;
      var kena = (n && norm(p.n).indexOf(n) > -1) || String(p.s || '').toLowerCase().indexOf(q) > -1 || String(p.b || '').indexOf(q.replace(/\s+/g, '')) > -1;
      if (!kena) return false;
    }
    if (A.saring === 'ho') return x.ho > 0;
    if (A.saring === 'nol') return x.total <= 0;
    return true;
  }
  function terpilih() {
    var ls = D.daftar.filter(cocok).map(function (x) { x.h = harga(x.p.hs, x.p.h, A.margin); return x; });
    var nama = function (a, b) { var x = String(a.p.n || '').toLowerCase(), y = String(b.p.n || '').toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; };
    ls.sort(function (a, b) {
      if (A.urut === 'harga') return ((b.h && b.h.termasuk) || 0) - ((a.h && a.h.termasuk) || 0) || nama(a, b);
      if (A.urut === 'ho') return b.ho - a.ho || nama(a, b);
      return nama(a, b);
    });
    return ls;
  }
  function gambarDaftar() {
    var w = el('katalogDaftar'); if (!w || !D.data) return;
    var ls = terpilih();
    if (!ls.length) { w.innerHTML = '<p class="ket-alat">' + esc(t('kosong')) + '</p>'; return; }
    w.innerHTML = '<p class="lbl kt-jumlah">' + nf(ls.length) + ' ' + esc(t('jumlah')) + '</p>' + ls.map(function (x) {
      var p = x.p, h = x.h, redup = x.total <= 0 || !h;
      return '<article class="kt-sku' + (redup ? ' kt-redup' : '') + '" data-sku="' + esc(p.s || p.b) + '" data-harga="' + (h ? h.termasuk : '') + '" data-ho="' + x.ho + '" data-total="' + x.total + '">' +
        fotoHtml(p.n) +
        '<div class="kt-nama"><b>' + esc(p.n || p.s) + '</b><small>' + esc([p.s, p.b].filter(Boolean).join(' · ')) + '</small>' +
          '<span class="kt-stok"><b>' + nf(x.ho) + '</b> ' + esc(t('stokHo')) + ' · <b>' + nf(x.total) + '</b> ' + esc(t('stokTotal')) + '</span>' +
          (h ? '<small class="kt-rinci">' + rp(h.sebelum) + ' ' + esc(t('sebelum')) + ' · ' + esc(t('modal')) + ' ' + rp(p.hs) + (p.r ? ' · ' + esc(t('retail')) + ' ' + rp(p.r) : '') + '</small>' : '') + '</div>' +
        '<div class="kt-harga">' + (h
          ? '<span class="lbl">' + esc(t('jual')) + '</span><b class="kt-besar">' + rp(h.termasuk) + '</b><small>' + esc(t('inkl')(persen(h.pajak))) + '</small>'
          : '<b class="kt-tanpa">' + esc(t('tanpaHarga')) + '</b>') + '</div></article>';
    }).join('');
  }

  /* ---------- CSV dan cetak ---------- */
  function tanggal() { var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function csvTeks() {
    var sel = function (v) { var s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var baris = [t('kolom').map(sel).join(',')];
    terpilih().forEach(function (x) {
      var p = x.p, h = x.h;
      baris.push([p.s, p.b, p.n, x.ho, x.total, p.hs || '', h ? h.sebelum : '', h ? Math.round(h.pajak * 1000) / 10 : '', h ? h.termasuk : '', p.r || ''].map(sel).join(','));
    });
    return baris.join('\r\n') + '\r\n';
  }
  function unduhBlob(blob, ekor) {
    var u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = 'katalog-jual-putus-' + tanggal() + '.' + ekor; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
  }
  function unduhCsv() {
    if (!D.data) return;
    bunyi('klik');
    unduhBlob(new Blob(['\ufeff' + csvTeks()], { type: 'text/csv;charset=utf-8' }), 'csv');
  }
  function cetak() {
    if (!D.data) return;
    var ls = terpilih(); if (!ls.length) return;
    var w = document.createElement('div'); w.id = 'lembarKatalog';
    w.innerHTML = '<header class="kc-kepala"><h1>' + esc(t('cetakJudul')) + '</h1><p>' + esc(t('cetakKet')(persen(A.margin), tanggal())) + '</p></header>' +
      '<div class="kc-grid">' + ls.map(function (x) {
        var p = x.p, h = x.h;
        return '<div class="kc-sku" data-cetak-sku="' + esc(p.s || p.b) + '">' + fotoHtml(p.n) + '<div class="kc-teks"><b>' + esc(p.n || p.s) + '</b><small>' + esc([p.s, p.b].filter(Boolean).join(' · ')) + '</small></div>' +
          '<div class="kc-harga">' + (h ? rp(h.termasuk) : esc(t('tanpaHarga'))) + '</div></div>';
      }).join('') + '</div>';
    document.body.appendChild(w); document.body.classList.add('cetak-katalog');
    var beres = function () { document.body.classList.remove('cetak-katalog'); if (w.parentNode) w.parentNode.removeChild(w); };
    try { W.print(); } finally { setTimeout(beres, 0); }
  }

  /* ---------- PDF, JPG, Excel (dibuat di browser, tanpa pustaka luar) ---------- */
  function utf8(s) { return new TextEncoder().encode(s); }
  function latin(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
  function gabung(parts, len) { var u = new Uint8Array(len), o = 0; parts.forEach(function (p) { u.set(p, o); o += p.length; }); return u; }

  /* Zip tanpa kompresi (STORE): cukup untuk .xlsx dan dibaca Excel, LibreOffice, Google Sheets. */
  var CRC_T = null;
  function crc32(u8) {
    if (!CRC_T) { CRC_T = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; } }
    var x = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) x = CRC_T[(x ^ u8[i]) & 255] ^ (x >>> 8);
    return (x ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(berkas) {
    var d = new Date(), waktu = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), tgl = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var parts = [], len = 0, pusat = [], plen = 0;
    berkas.forEach(function (f) {
      var nama = utf8(f.nama), isi = f.isi, crc = crc32(isi), off = len;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, waktu, true); h.setUint16(12, tgl, true);
      h.setUint32(14, crc, true); h.setUint32(18, isi.length, true); h.setUint32(22, isi.length, true); h.setUint16(26, nama.length, true); h.setUint16(28, 0, true);
      [new Uint8Array(h.buffer), nama, isi].forEach(function (p) { parts.push(p); len += p.length; });
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, waktu, true); c.setUint16(14, tgl, true);
      c.setUint32(16, crc, true); c.setUint32(20, isi.length, true); c.setUint32(24, isi.length, true); c.setUint16(28, nama.length, true);
      c.setUint32(42, off, true);
      [new Uint8Array(c.buffer), nama].forEach(function (p) { pusat.push(p); plen += p.length; });
    });
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, berkas.length, true); e.setUint16(10, berkas.length, true); e.setUint32(12, plen, true); e.setUint32(16, len, true);
    return gabung(parts.concat(pusat, [new Uint8Array(e.buffer)]), len + plen + 22);
  }

  /* ---------- Excel ----------
     Baris 1 judul, B2 margin (sel isian), baris 3 catatan, baris 4 tanggal data,
     baris 5 kepala kolom (sama dengan CSV), data mulai baris 6. Harga sebelum dan
     termasuk pajak berupa rumus dari $B$2 dan pajak SKU, dengan nilai tersimpan
     yang sama dengan layar supaya langsung terbaca walau belum dihitung ulang. */
  function xe(s) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function xlsxDari(ls, margin, info) {
    info = info || {};
    var m = Math.round(Number(margin) * 1000) / 1000;
    var kol = 'ABCDEFGHIJ', baris = [];
    var teks = function (r, c, v, st) { return '<c r="' + kol[c] + r + '" s="' + st + '" t="inlineStr"><is><t>' + xe(v) + '</t></is></c>'; };
    var angka = function (r, c, v, st) { return '<c r="' + kol[c] + r + '" s="' + st + '"><v>' + v + '</v></c>'; };
    var rumus = function (r, c, f, v, st) { return '<c r="' + kol[c] + r + '" s="' + st + '"><f>' + xe(f) + '</f><v>' + v + '</v></c>'; };
    baris.push('<row r="1" ht="22" customHeight="1">' + teks(1, 0, info.judul || '', 2) + '</row>');
    baris.push('<row r="2">' + teks(2, 0, t('margin'), 3) + angka(2, 1, m, 4) + '</row>');
    baris.push('<row r="3">' + teks(3, 0, t('xlsxCatatan'), 5) + '</row>');
    baris.push('<row r="4">' + teks(4, 0, (info.per ? t('per') + ' ' + info.per : ''), 5) + '</row>');
    baris.push('<row r="5" ht="32" customHeight="1">' + t('kolom').map(function (k, c) { return teks(5, c, k, 1); }).join('') + '</row>');
    ls.forEach(function (x, i) {
      var r = 6 + i, p = x.p, h = harga(p.hs, p.h, m), sel = [teks(r, 0, p.s || '', 6), teks(r, 1, p.b || '', 6), teks(r, 2, p.n || '', 0), angka(r, 3, x.ho, 7), angka(r, 4, x.total, 7)];
      if (h) {
        sel.push(angka(r, 5, Number(p.hs), 7));
        sel.push(rumus(r, 6, 'ROUND(F' + r + '/(1-$B$2),0)', h.sebelum, 7));
        sel.push(angka(r, 7, h.pajak, 8));
        sel.push(rumus(r, 8, 'ROUND(G' + r + '*(1+H' + r + '),0)', h.termasuk, 9));
      }
      if (Number(p.r) > 0) sel.push(angka(r, 9, Number(p.r), 7));
      baris.push('<row r="' + r + '">' + sel.join('') + '</row>');
    });
    var akhir = 5 + Math.max(ls.length, 1), nama = xe(String(t('judul')).slice(0, 31));
    var lebar = [16, 17, 46, 10, 11, 16, 18, 9, 18, 16];
    var sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="B2" sqref="B2"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/><cols>' + lebar.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>' +
      '<sheetData>' + baris.join('') + '</sheetData><autoFilter ref="A5:J' + akhir + '"/></worksheet>';
    var gaya = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts>' +
      '<fonts count="5"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font>' +
      '<font><b/><sz val="10"/><color rgb="FF0000FF"/><name val="Arial"/></font><font><i/><sz val="9"/><color rgb="FF7E6656"/><name val="Arial"/></font></fonts>' +
      '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFCF1E4"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD7B697"/></bottom><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="164" fontId="3" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>' +
      '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    var buku = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' + nama + '" sheetId="1" r:id="rId1"/></sheets>' +
      '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'' + nama + '\'!$A$5:$J$' + akhir + '</definedName></definedNames><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>';
    var tipe = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
    var rel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var relBuku = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    return zip([{ nama: '[Content_Types].xml', isi: utf8(tipe) }, { nama: '_rels/.rels', isi: utf8(rel) }, { nama: 'xl/workbook.xml', isi: utf8(buku) },
      { nama: 'xl/_rels/workbook.xml.rels', isi: utf8(relBuku) }, { nama: 'xl/styles.xml', isi: utf8(gaya) }, { nama: 'xl/worksheets/sheet1.xml', isi: utf8(sheet) }]);
  }

  /* ---------- PDF: tiap halaman satu gambar JPEG selebar A4 ---------- */
  function pdfDariJpeg(hal, judul) {
    var A4W = 595.28, A4H = 841.89, parts = [], len = 0, off = [];
    var tulis = function (x) { var u = typeof x === 'string' ? latin(x) : x; parts.push(u); len += u.length; };
    var obj = function (n) { off[n] = len; tulis(n + ' 0 obj\n'); for (var i = 1; i < arguments.length; i++) tulis(arguments[i]); tulis('\nendobj\n'); };
    var f2 = function (v) { return (Math.round(v * 100) / 100).toString(); };
    var hex16 = function (s) { var o = 'FEFF'; for (var i = 0; i < s.length; i++) o += ('000' + s.charCodeAt(i).toString(16).toUpperCase()).slice(-4); return '<' + o + '>'; };
    var n = hal.length, info = 3 + n * 3;
    tulis('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + hal.map(function (h, i) { return (3 + i * 3) + ' 0 R'; }).join(' ') + '] /Count ' + n + ' >>');
    hal.forEach(function (h, i) {
      var pg = 3 + i * 3, tg = Math.min(A4H, A4W * h.h / h.w), lb = tg < A4H ? A4W : A4H * h.w / h.h;
      var cs = 'q ' + f2(lb) + ' 0 0 ' + f2(tg) + ' 0 ' + f2(A4H - tg) + ' cm /Im0 Do Q';
      obj(pg, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4W + ' ' + A4H + '] /Resources << /XObject << /Im0 ' + (pg + 2) + ' 0 R >> >> /Contents ' + (pg + 1) + ' 0 R >>');
      obj(pg + 1, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
      obj(pg + 2, '<< /Type /XObject /Subtype /Image /Width ' + h.w + ' /Height ' + h.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + h.bytes.length + ' >>\nstream\n', h.bytes, '\nendstream');
    });
    obj(info, '<< /Title ' + hex16(String(judul || '')) + ' /Producer (WMS Mofmofriends) >>');
    var x = len, xref = 'xref\n0 ' + (info + 1) + '\n0000000000 65535 f \n';
    for (var k = 1; k <= info; k++) xref += ('000000000' + off[k]).slice(-10) + ' 00000 n \n';
    tulis(xref + 'trailer\n<< /Size ' + (info + 1) + ' /Root 1 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + x + '\n%%EOF\n');
    return gabung(parts, len);
  }

  /* ---------- kanvas: lembar harga untuk JPG dan halaman PDF ---------- */
  var KV = { lebar: 1240, tepi: 48, kolom: 3, celah: 18, kartu: 168, kepala: 176, kaki: 104, tinggiA4: 1754 };
  var WARNA = { latar: '#FFFFFF', pita: '#FFF8EF', garis: '#EFE1CF', aksen: '#F6A26B', tinta: '#4A3426', redup: '#7E6656', lembut: '#FCF1E4', harga: '#A9501C' };
  var HURUF_JUDUL = '"Baloo 2", Nunito, Arial, sans-serif', HURUF = 'Nunito, Arial, sans-serif';
  function tungguHuruf() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var j = Promise.all(['800 38px "Baloo 2"', '800 28px "Baloo 2"', '700 19px Nunito', '700 14px Nunito'].map(function (f) { return document.fonts.load(f).catch(function () {}); }));
    return Promise.race([j, new Promise(function (r) { setTimeout(r, 2500); })]);
  }
  var FOTO = {};
  function muatFoto(nama) {
    var u = fotoUrl(nama); if (!u) return Promise.resolve(null);
    if (FOTO[u]) return FOTO[u];
    FOTO[u] = new Promise(function (ok) {
      var im = new Image(), beres = false, akhir = function (v) { if (!beres) { beres = true; ok(v); } };
      im.onload = function () { akhir(im.naturalWidth > 0 ? im : null); }; im.onerror = function () { akhir(null); };
      setTimeout(function () { akhir(null); }, 6000); im.src = u;
    });
    return FOTO[u];
  }
  function kotakBulat(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function baris2(g, s, lebar, maks) {
    var kata = String(s || '').split(/\s+/).filter(Boolean), out = [], kini = '';
    kata.forEach(function (k) { var c = kini ? kini + ' ' + k : k; if (g.measureText(c).width <= lebar || !kini) kini = c; else { out.push(kini); kini = k; } });
    if (kini) out.push(kini);
    if (out.length > maks) { out = out.slice(0, maks); var a = out[maks - 1]; while (a.length > 1 && g.measureText(a + '…').width > lebar) a = a.slice(0, -1); out[maks - 1] = a + '…'; }
    return out.map(function (b) { if (g.measureText(b).width <= lebar) return b; var a = b; while (a.length > 1 && g.measureText(a + '…').width > lebar) a = a.slice(0, -1); return a + '…'; });
  }
  function langkah() { return KV.kartu + KV.celah; }
  function perHalaman() { return KV.kolom * Math.floor((KV.tinggiA4 - KV.kepala - 24 - KV.kaki + KV.celah) / langkah()); }
  function gambarLembar(ls, foto, opsi) {
    var nBaris = Math.max(1, Math.ceil(ls.length / KV.kolom));
    var tinggi = opsi.tinggi || (KV.kepala + nBaris * langkah() - KV.celah + 24 + KV.kaki);
    var cv = document.createElement('canvas'); cv.width = KV.lebar; cv.height = tinggi;
    var g = cv.getContext('2d'), isiL = KV.lebar - 2 * KV.tepi, kartuL = Math.floor((isiL - (KV.kolom - 1) * KV.celah) / KV.kolom);
    g.fillStyle = WARNA.latar; g.fillRect(0, 0, KV.lebar, tinggi);
    g.fillStyle = WARNA.pita; g.fillRect(0, 0, KV.lebar, KV.kepala - 28);
    g.fillStyle = WARNA.aksen; g.fillRect(0, KV.kepala - 30, KV.lebar, 4);
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = WARNA.tinta; g.font = '800 38px ' + HURUF_JUDUL; g.fillText(t('cetakJudul'), KV.tepi, 76);
    g.fillStyle = WARNA.redup; g.font = '700 19px ' + HURUF; g.fillText(t('cetakKet')(persen(A.margin), tanggal()), KV.tepi, 112);
    g.textAlign = 'right'; g.font = '700 16px ' + HURUF;
    if (opsi.per) g.fillText(t('per') + ' ' + opsi.per, KV.lebar - KV.tepi, 76);
    if (opsi.dari > 1) g.fillText(t('halaman')(opsi.ke, opsi.dari), KV.lebar - KV.tepi, 112);
    g.textAlign = 'left';
    ls.forEach(function (x, i) {
      var kx = KV.tepi + (i % KV.kolom) * (kartuL + KV.celah), ky = KV.kepala + Math.floor(i / KV.kolom) * langkah(), p = x.p, h = harga(p.hs, p.h, A.margin);
      g.fillStyle = '#FFFFFF'; kotakBulat(g, kx, ky, kartuL, KV.kartu, 22); g.fill();
      g.lineWidth = 2; g.strokeStyle = WARNA.garis; g.stroke();
      var fx = kx + 16, fy = ky + 16, fs = 104;
      g.fillStyle = WARNA.lembut; kotakBulat(g, fx, fy, fs, fs, 18); g.fill();
      var im = foto[i];
      if (im) { var sk = Math.min((fs - 8) / im.naturalWidth, (fs - 8) / im.naturalHeight), iw = im.naturalWidth * sk, ih = im.naturalHeight * sk; g.drawImage(im, fx + (fs - iw) / 2, fy + (fs - ih) / 2, iw, ih); }
      else { g.fillStyle = WARNA.harga; g.font = '800 30px ' + HURUF; g.textAlign = 'center'; g.fillText(inisial(p.n), fx + fs / 2, fy + fs / 2 + 11); g.textAlign = 'left'; }
      var tx = kx + 136, tl = kartuL - 136 - 16;
      g.fillStyle = WARNA.tinta; g.font = '700 19px ' + HURUF;
      baris2(g, p.n || p.s, tl, 2).forEach(function (b, j) { g.fillText(b, tx, ky + 38 + j * 23); });
      g.fillStyle = WARNA.redup; g.font = '700 14px ' + HURUF;
      baris2(g, [p.s, p.b].filter(Boolean).join(' · '), tl, 1).forEach(function (b) { g.fillText(b, tx, ky + 92); });
      if (h) {
        g.fillStyle = WARNA.harga; g.font = '800 28px ' + HURUF_JUDUL; g.fillText(rp(h.termasuk), tx, ky + 130);
        g.fillStyle = WARNA.redup; g.font = '700 13px ' + HURUF; g.fillText(t('inkl')(persen(h.pajak)), tx, ky + 151);
      } else { g.fillStyle = WARNA.redup; g.font = '700 17px ' + HURUF; g.fillText(t('tanpaHarga'), tx, ky + 130); }
    });
    g.fillStyle = WARNA.redup; g.font = '600 14px ' + HURUF;
    var ket = baris2(g, t('rumus')(persen(A.margin)), isiL, 4), y0 = tinggi - KV.kaki + 22;
    ket.forEach(function (b, j) { g.fillText(b, KV.tepi, y0 + j * 19); });
    return cv;
  }
  function keJpeg(cv) {
    return new Promise(function (ok, gagal) {
      try { cv.toBlob(function (b) { if (b) ok(b); else gagal(new Error('jpeg')); }, 'image/jpeg', 0.9); } catch (e) { gagal(e); }
    });
  }
  var sibuk = false;
  function buatBerkas(jenis, tombol) {
    if (!D.data || sibuk) return;
    var ls = terpilih(); if (!ls.length) return;
    bunyi('klik');
    var st = el('katalogStatus'), per = D.data.diperbarui || '';
    var akhir = function (galat) {
      sibuk = false;
      if (tombol) { tombol.disabled = false; tombol.removeAttribute('aria-busy'); }
      if (st) st.textContent = galat ? t('gagalBerkas') : '';
    };
    if (jenis === 'xlsx') {
      try { unduhBlob(new Blob([xlsxDari(ls, A.margin, { judul: t('cetakJudul'), per: per })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'xlsx'); akhir(false); }
      catch (e) { akhir(true); }
      return;
    }
    sibuk = true;
    if (tombol) { tombol.disabled = true; tombol.setAttribute('aria-busy', 'true'); }
    if (st) st.textContent = t('siapkan');
    Promise.all([tungguHuruf(), Promise.all(ls.map(function (x) { return muatFoto(x.p.n); }))]).then(function (r) {
      var foto = r[1];
      if (jenis === 'jpg') return keJpeg(gambarLembar(ls, foto, { per: per })).then(function (b) { unduhBlob(b, 'jpg'); });
      var n = perHalaman(), hal = [];
      for (var i = 0; i < ls.length; i += n) hal.push({ ls: ls.slice(i, i + n), foto: foto.slice(i, i + n) });
      return hal.reduce(function (janji, hl, k) {
        return janji.then(function (acc) {
          var cv = gambarLembar(hl.ls, hl.foto, { per: per, tinggi: KV.tinggiA4, ke: k + 1, dari: hal.length });
          return keJpeg(cv).then(function (b) { return b.arrayBuffer(); }).then(function (ab) { acc.push({ bytes: new Uint8Array(ab), w: cv.width, h: cv.height }); return acc; });
        });
      }, Promise.resolve([])).then(function (jp) { unduhBlob(new Blob([pdfDariJpeg(jp, t('cetakJudul'))], { type: 'application/pdf' }), 'pdf'); });
    }).then(function () { akhir(false); }, function () { akhir(true); });
  }

  W.WmsKatalog = { buka: buka, tutup: tutup, harga: harga, csv: csvTeks, _susun: susun, _pdf: pdfDariJpeg, _xlsx: xlsxDari };
})();
