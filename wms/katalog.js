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
      margin: 'Margin', cetak: 'Print', csv: 'Download CSV', muat: 'Reading the product master…', gagal: 'The product master could not be read right now. Check the signal and try again.',
      jual: 'Outright price', inkl: function (p) { return 'incl. ' + p + ' tax'; }, sebelum: 'before tax', modal: 'Wholesale', retail: 'Retail', stokHo: 'HO', stokTotal: 'total', pajak: 'tax',
      tanpaHarga: 'No price yet', kosong: 'No SKU matches.', jumlah: 'SKUs shown', per: 'Data as of',
      rumus: function (m) { return 'Outright price = wholesale ÷ (1 − ' + m + '). The ' + m + ' margin is taken from the selling price, the same rule the system uses for Gamotion. Each SKU then gets its own tax rate from the product master (PPN 11% for most), so the big number already includes tax.'; },
      cetakJudul: 'Mofmofriends outright sale price list', cetakKet: function (m, t) { return 'Margin ' + m + ' from the selling price, tax included. Printed ' + t + '.'; },
      kolom: ['SKU', 'Barcode', 'Name', 'HO stock', 'Total stock', 'Wholesale before tax', 'Outright price before tax', 'Tax %', 'Outright price incl. tax', 'Retail incl. tax']
    },
    id: {
      judul: 'Katalog', sub: 'Semua SKU dengan harga jual putus, sudah termasuk pajak', tutup: 'Tutup', cari: 'Cari SKU, nama, atau barcode',
      semua: 'Semua', ho: 'Ada stok HO', nol: 'Tanpa stok', urut: 'Urutkan', uNama: 'Nama', uHarga: 'Harga tertinggi', uHo: 'Stok HO terbanyak',
      margin: 'Margin', cetak: 'Cetak', csv: 'Unduh CSV', muat: 'Membaca Master Produk…', gagal: 'Master Produk belum bisa dibaca sekarang. Cek sinyal lalu coba lagi.',
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
        '<div class="kt-aksi"><button type="button" class="btn dua" data-katalog="csv">' + esc(t('csv')) + '</button><button type="button" class="btn" data-katalog="cetak">' + esc(t('cetak')) + '</button></div></div>' +
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
  function unduhCsv() {
    if (!D.data) return;
    bunyi('klik');
    var blob = new Blob(['\ufeff' + csvTeks()], { type: 'text/csv;charset=utf-8' });
    var u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = 'katalog-jual-putus-' + tanggal() + '.csv'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); if (a.parentNode) a.parentNode.removeChild(a); }, 1000);
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

  W.WmsKatalog = { buka: buka, tutup: tutup, harga: harga, csv: csvTeks, _susun: susun };
})();
