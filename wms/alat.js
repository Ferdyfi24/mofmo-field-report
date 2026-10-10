/* Alat WMS Mofmofriends (10 Okt 2026 malam): Scan rak, Label rak, Paspor SKU.
 *
 * Ferdy: "Label QR rak + scan ... kan barcode bukan qr" dan "Paspor SKU ... gass".
 *  - Scan rak: tembak label rak (kode lokasi MOFMO Location Master, mis. R1-4A)
 *    dengan barcode gun, atau kamera HP lewat BarcodeDetector. Barcode produk
 *    dan nama SKU juga diterima. Data dari potret wmsGudang (peta gudang yang
 *    sama dengan Warehouse condition), tidak dihitung ulang di sini.
 *  - Label rak: Code 128 (set B), dua kolom x lima baris per A4.
 *  - Paspor SKU: dibuka dengan klik foto SKU di papan. Dihitung dari baris
 *    buku besar dataPapan ([tanggal, produk, qty, dari, ke]), baris yang sama
 *    dengan yang dipakai papan sendiri. Lokasi rak dari wmsGudang.
 * Semua tulisan di sini cuma membaca; tidak ada yang menulis ke sistem.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !!(M().bhs && M().bhs() === 'id'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function nf(n) { return Number(n || 0).toLocaleString('en-US'); }
  function el(i) { return document.getElementById(i); }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function getar(p) { try { if (M().getar) M().getar(p); } catch (e) {} }

  var TEKS = {
    en: {
      tabScan: 'Scan & find', tabLabel: 'Rack labels', tutup: 'Close', label: 'Scan a rack label or a product barcode, or type part of a SKU name',
      cari: 'Find', kamera: 'Camera', stopKamera: 'Stop camera', kameraGagal: 'The camera could not be opened. Allow camera access, or use the scanner gun.',
      tanpaKamera: 'Camera scanning needs Chrome on Android. Use the scanner gun or type the code.',
      muat: 'Reading the warehouse map…', gagalData: 'The warehouse map could not be read right now. Check the signal and try again.',
      tidakKetemu: ' not found. Check the label, or type part of the SKU name.', kapasitas: 'pcs', alsoAt: 'This SKU is also at', paspor: 'SKU passport',
      kosong: 'Empty', rendah: 'Below 50%', penuh: 'Full', lebih: 'Over capacity', ok: 'OK', terakhir: 'Last scans', hasilCari: 'Results for',
      sku: 'SKUs', slot: 'Locations', diRak: 'on the racks', lokasiSku: 'Locations for this barcode', belumAdaDiRak: 'Not on any rack in the warehouse map.',
      unit: 'Unit', semuaUnit: 'All units', cetak: 'Print labels', ketLabel: 'A4, 2 x 5 labels per sheet, Code 128. Same codes as MOFMO Location Master, so the scanner gun and Excel SCAN STATION read them too.',
      kembali: 'Back to scan', judulPaspor: 'SKU passport', milik: 'pcs owned', masuk: 'Received at the warehouse', diGudang: 'On warehouse racks now', dikirim: 'Shipped to stores',
      diGerai: 'On store shelves now', laku: 'Sold', koreksi: 'Count corrections', pertama: 'first', diGudangJudul: 'In the warehouse', belumLokasi: 'Not put away yet',
      diGeraiJudul: 'At stores', terima: 'received', terjual: 'sold', stok: 'on shelf', riwayat: 'History', tanpaRiwayat: 'No movement in the ledger yet.',
      ketPaspor: 'Counted from the Mutasi ledger, the same rows the board uses. Rack locations from Warehouse condition.', per: 'Data as of',
      skuTidakKetemu: 'This SKU is not in the product master yet.', semuaRiwayat: 'Show all history',
      r_opening: 'Opening stock received at the warehouse', r_principal: 'Received from the principal', r_koreksiMasuk: 'Count correction', r_koreksiKeluar: 'Count correction',
      r_kirim: 'Left the warehouse on a delivery order', r_kirimLangsung: 'Sent straight to', r_sampai: 'Arrived at', r_laku: 'Sold at', r_lakuHO: 'Sold direct from the warehouse',
      r_gmt: 'Sent to Gamotion', r_lakuGmt: 'Sold through Gamotion', r_retur: 'Returned to the principal', r_rusak: 'Written off as damaged', r_pulang: 'Came back from',
      r_batal: 'Delivery order cancelled, back to the warehouse', r_openingToko: 'Opening stock at'
    },
    id: {
      tabScan: 'Scan & cari', tabLabel: 'Label rak', tutup: 'Tutup', label: 'Tembak label rak atau barcode produk, atau ketik sebagian nama SKU',
      cari: 'Cari', kamera: 'Kamera', stopKamera: 'Matikan kamera', kameraGagal: 'Kamera tidak bisa dibuka. Izinkan akses kamera, atau pakai scanner gun.',
      tanpaKamera: 'Scan lewat kamera butuh Chrome di Android. Pakai scanner gun atau ketik kodenya.',
      muat: 'Membaca peta gudang…', gagalData: 'Peta gudang belum bisa dibaca sekarang. Cek sinyal lalu coba lagi.',
      tidakKetemu: ' tidak ditemukan. Cek labelnya, atau ketik sebagian nama SKU.', kapasitas: 'pcs', alsoAt: 'SKU ini juga ada di', paspor: 'Paspor SKU',
      kosong: 'Kosong', rendah: 'Di bawah 50%', penuh: 'Penuh', lebih: 'Melebihi kapasitas', ok: 'OK', terakhir: 'Scan terakhir', hasilCari: 'Hasil untuk',
      sku: 'SKU', slot: 'Lokasi', diRak: 'di rak', lokasiSku: 'Lokasi barcode ini', belumAdaDiRak: 'Belum ada di rak mana pun di peta gudang.',
      unit: 'Unit', semuaUnit: 'Semua unit', cetak: 'Cetak label', ketLabel: 'A4, 2 x 5 label per lembar, Code 128. Kodenya sama dengan MOFMO Location Master, jadi terbaca juga oleh scanner gun dan SCAN STATION di Excel.',
      kembali: 'Kembali ke scan', judulPaspor: 'Paspor SKU', milik: 'pcs dimiliki', masuk: 'Masuk gudang', diGudang: 'Di rak gudang sekarang', dikirim: 'Dikirim ke gerai',
      diGerai: 'Di rak gerai sekarang', laku: 'Terjual', koreksi: 'Koreksi hitung', pertama: 'pertama', diGudangJudul: 'Di gudang', belumLokasi: 'Belum di-putaway',
      diGeraiJudul: 'Di gerai', terima: 'diterima', terjual: 'terjual', stok: 'di rak', riwayat: 'Riwayat', tanpaRiwayat: 'Belum ada pergerakan di buku besar.',
      ketPaspor: 'Dihitung dari buku besar Mutasi, baris yang sama dengan yang dipakai papan. Lokasi rak dari Warehouse condition.', per: 'Data per',
      skuTidakKetemu: 'SKU ini belum ada di Master Produk.', semuaRiwayat: 'Tampilkan semua riwayat',
      r_opening: 'Stok awal masuk gudang', r_principal: 'Diterima dari principal', r_koreksiMasuk: 'Koreksi hitung', r_koreksiKeluar: 'Koreksi hitung',
      r_kirim: 'Keluar gudang dengan surat jalan', r_kirimLangsung: 'Dikirim langsung ke', r_sampai: 'Sampai di', r_laku: 'Terjual di', r_lakuHO: 'Terjual langsung dari gudang',
      r_gmt: 'Dikirim ke Gamotion', r_lakuGmt: 'Terjual lewat Gamotion', r_retur: 'Diretur ke principal', r_rusak: 'Dihapus karena rusak', r_pulang: 'Kembali dari',
      r_batal: 'Surat jalan dibatalkan, kembali ke gudang', r_openingToko: 'Stok awal di'
    }
  };
  function t(k) { var d = TEKS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : (TEKS.en[k] != null ? TEKS.en[k] : k); }
  var BULAN = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] };
  function tgl(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Number(m[3]) + ' ' + BULAN[id() ? 'id' : 'en'][Number(m[2]) - 1] + ' ' + m[1] : esc(s); }

  /* ---------- data ---------- */
  var D = { janji: null, waktu: 0, gudang: null, data: null };
  var X = { lok: {}, perBc: {}, prodBc: {}, prodNama: {}, pendek: {}, lokIdx: {} };
  function norm(s) { return String(s || '').toLowerCase().replace(/mofmo ?friends/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function muat(paksa) {
    if (D.janji && !paksa && Date.now() - D.waktu < 5 * 60 * 1000) return D.janji;
    D.waktu = Date.now();
    var m = M();
    var pG = m.potret ? m.potret(['wmsGudang|["K"]']).then(function (isi) { var x = isi['wmsGudang|["K"]']; return x && x.data && x.data.lokasi ? x.data : null; }, function () { return null; }) : Promise.resolve(null);
    var pD = m.jalan ? m.jalan('dataPapan', ['WMS-TIKET']).then(function (x) { return x && x.prod ? x : null; }, function () { return null; }) : Promise.resolve(null);
    D.janji = Promise.all([pG, pD]).then(function (r) {
      D.gudang = r[0]; D.data = r[1]; susunIndeks();
      if (!D.gudang && !D.data) { D.janji = null; throw new Error('data'); }
      return D;
    });
    return D.janji;
  }
  function susunIndeks() {
    X = { lok: {}, perBc: {}, prodBc: {}, prodNama: {}, pendek: {}, lokIdx: {} };
    ((D.gudang && D.gudang.lokasi) || []).forEach(function (l) {
      X.lok[String(l.kode).toUpperCase()] = l;
      var bc = String(l.barcode || '');
      if (bc) { (X.perBc[bc] = X.perBc[bc] || []).push(l); if (l.sku) X.pendek[norm(l.sku)] = bc; }
    });
    ((D.data && D.data.prod) || []).forEach(function (p, i) { p.__i = i; if (p.b) X.prodBc[String(p.b)] = p; if (p.n && !X.prodNama[norm(p.n)]) X.prodNama[norm(p.n)] = p; });
    ((D.data && D.data.lok) || []).forEach(function (l, i) { X.lokIdx[l.k] = i; });
  }
  function cariProduk(info) {
    var bc = String((info && info.bc) || '').trim();
    if (bc && X.prodBc[bc]) return X.prodBc[bc];
    var n = norm(info && info.nama);
    if (X.prodNama[n]) return X.prodNama[n];
    if (X.pendek[n] && X.prodBc[X.pendek[n]]) return X.prodBc[X.pendek[n]];
    return null;
  }
  function fotoUrl(nama) {
    var K = W.KulitPapan; if (!K || !K.fotoSku) return '';
    var f = K.fotoSku(nama); if (!f) return '';
    if (W.__IMG && W.__IMG['sku/' + f + '.webp']) return W.__IMG['sku/' + f + '.webp'];
    return K.dasar + 'sku/' + f + '.webp';
  }
  function inisial(nama) { var w = norm(nama).replace(/^(s|m|kc|kr|ball|bp|cap for|cap)\s+/, '').split(' ').filter(Boolean); return ((w[0] || '?')[0] + ((w[1] || '')[0] || '')).toUpperCase(); }
  function fotoHtml(nama, nama2, kelas) {
    var u = fotoUrl(nama) || fotoUrl(nama2 || '');
    return u ? '<img class="foto-sku ' + (kelas || '') + '" src="' + esc(u) + '" alt="" draggable="false">' : '<span class="foto-sku inisial ' + (kelas || '') + '" aria-hidden="true">' + esc(inisial(nama)) + '</span>';
  }

  /* ---------- Code 128 (set B) ---------- */
  var POLA = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];
  function kode128(teks) {
    var nilai = [104];
    for (var i = 0; i < teks.length; i++) { var c = teks.charCodeAt(i); if (c < 32 || c > 126) c = 63; nilai.push(c - 32); }
    var cek = 104; for (var j = 1; j < nilai.length; j++) cek += nilai[j] * j;
    nilai.push(cek % 103); nilai.push(106);
    var tenang = 10, x = tenang, batang = '', ke = 0;
    nilai.forEach(function (v) { POLA[v].split('').forEach(function (d) { var w = Number(d); if (ke % 2 === 0) batang += '<rect x="' + x + '" y="0" width="' + w + '" height="1"/>'; x += w; ke++; }); });
    var total = x + tenang;
    return '<svg class="kode128" viewBox="0 0 ' + total + ' 1" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="' + esc(teks) + '"><rect width="' + total + '" height="1" fill="#fff"/><g fill="#000">' + batang + '</g></svg>';
  }

  /* ---------- kerangka lembar ---------- */
  var A = { mode: 'scan', riwayat: [], unit: null, kam: {}, dari: null };
  function pastikanDom() {
    if (el('alat')) return el('alat');
    var d = document.createElement('div');
    d.id = 'alat'; d.className = 'alat-latar'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="lembar" role="dialog" aria-modal="true" aria-label="WMS" tabindex="-1">' +
      '<div class="kepala-alat"><div class="tab-alat" role="tablist"></div><button type="button" class="tutup-alat" data-alat="tutup"></button></div>' +
      '<div class="isi-alat" id="alatIsi"></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      if (e.target === d) { tutup(); return; }
      var x = e.target.closest ? e.target.closest('[data-alat],[data-tab],[data-slot],[data-paspor-buka],[data-ulang]') : null;
      if (!x) return;
      if (x.hasAttribute('data-tab')) { bunyi('klik'); A.mode = x.getAttribute('data-tab'); gambar(); return; }
      if (x.hasAttribute('data-slot')) { bunyi('klik'); tanganiKode(x.getAttribute('data-slot')); return; }
      if (x.hasAttribute('data-ulang')) { bunyi('klik'); tanganiKode(x.getAttribute('data-ulang')); return; }
      if (x.hasAttribute('data-paspor-buka')) { bunyi('klik'); paspor({ bc: x.getAttribute('data-paspor-buka') }); return; }
      var a = x.getAttribute('data-alat');
      if (a === 'tutup') tutup();
      else if (a === 'kamera') { if (A.kam.aliran) matikanKamera(); else nyalakanKamera(); }
      else if (a === 'kembali') { bunyi('klik'); A.mode = 'scan'; gambar(); }
      else if (a === 'cetak') cetak();
      else if (a === 'semuaRiwayat') { var r = el('alatRiwayatPaspor'); if (r) { r.classList.add('semua'); x.parentNode.removeChild(x); } }
    });
    d.addEventListener('submit', function (e) { if (e.target && e.target.id === 'alatForm') { e.preventDefault(); var k = el('alatKode'); var v = k.value; k.value = ''; tanganiKode(v); k.focus(); } });
    d.addEventListener('change', function (e) { if (e.target && e.target.id === 'alatUnit') { A.unit = e.target.value; gambarLabel(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('buka')) { e.preventDefault(); tutup(); } });
    return d;
  }
  function gambarKepala() {
    var d = el('alat');
    d.querySelector('.tab-alat').innerHTML = ['scan', 'label'].map(function (m) {
      var on = A.mode === m || (A.mode === 'paspor' && m === 'scan');
      return '<button type="button" role="tab" data-tab="' + m + '" aria-selected="' + (on ? 'true' : 'false') + '" class="' + (on ? 'on' : '') + '">' + esc(t(m === 'scan' ? 'tabScan' : 'tabLabel')) + '</button>';
    }).join('');
    var tt = d.querySelector('.tutup-alat'); tt.setAttribute('aria-label', t('tutup')); tt.title = t('tutup');
    tt.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  }
  function buka(mode, arg) {
    var d = pastikanDom();
    A.mode = mode || 'scan';
    if (!d.classList.contains('buka')) A.dari = document.activeElement;
    d.classList.add('buka'); d.setAttribute('aria-hidden', 'false'); document.body.classList.add('alat-terbuka');
    gambar(arg);
    if (A.mode !== 'scan') { var l = d.querySelector('.lembar'); try { l.focus({ preventScroll: true }); } catch (e) { l.focus(); } }
    muat().catch(function () {});
  }
  function tutup() {
    var d = el('alat'); if (!d) return;
    matikanKamera();
    d.classList.remove('buka'); d.setAttribute('aria-hidden', 'true'); document.body.classList.remove('alat-terbuka');
    try { if (A.dari && A.dari.focus) A.dari.focus(); } catch (e) {}
  }
  function gambar(arg) {
    gambarKepala();
    if (A.mode === 'label') return gambarLabelAwal();
    if (A.mode === 'paspor') return;
    gambarScan(arg);
  }

  /* ---------- scan ---------- */
  function bisaKamera() { return 'BarcodeDetector' in W && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  var IKON_KAMERA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  function gambarScan() {
    var kam = bisaKamera();
    el('alatIsi').innerHTML =
      '<form id="alatForm" class="scan-baris" autocomplete="off"><label for="alatKode" class="lbl">' + esc(t('label')) + '</label>' +
      '<div class="scan-input"><input id="alatKode" type="text" inputmode="text" autocapitalize="characters" spellcheck="false" enterkeyhint="search" placeholder="R1-4A · 4582… · bear">' +
      '<button type="submit" class="btn">' + esc(t('cari')) + '</button>' +
      (kam ? '<button type="button" class="btn dua" id="alatKamera" data-alat="kamera">' + IKON_KAMERA + '<span>' + esc(t('kamera')) + '</span></button>' : '') + '</div>' +
      (kam ? '' : '<p class="ket-alat">' + esc(t('tanpaKamera')) + '</p>') + '</form>' +
      '<div id="alatKameraKotak"></div><div id="alatHasil" class="hasil-alat" aria-live="polite"></div><div id="alatRiwayat" class="riwayat-scan"></div>';
    gambarRiwayatScan();
    setTimeout(function () { var k = el('alatKode'); if (k) k.focus(); }, 30);
  }
  function gambarRiwayatScan() {
    var r = el('alatRiwayat'); if (!r) return;
    r.innerHTML = A.riwayat.length ? '<span class="lbl">' + esc(t('terakhir')) + '</span>' + A.riwayat.map(function (k) { return '<button type="button" class="chip-alat" data-ulang="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') : '';
  }
  function catat(k) { A.riwayat = [k].concat(A.riwayat.filter(function (x) { return x !== k; })).slice(0, 6); gambarRiwayatScan(); }
  function hasil(html) { var h = el('alatHasil'); if (h) h.innerHTML = html; }
  function tanganiKode(teks) {
    var q = String(teks == null ? '' : teks).trim(); if (!q) return;
    if (A.mode !== 'scan' || !el('alatHasil')) { A.mode = 'scan'; gambar(); }
    hasil('<p class="ket-alat">' + esc(t('muat')) + '</p>');
    muat().then(function () {
      var k = q.toUpperCase();
      if (X.lok[k]) { tampilSlot(X.lok[k]); bunyi('scanOk'); getar(30); catat(k); return; }
      var angka = q.replace(/\s+/g, '');
      if (/^\d{6,}$/.test(angka) && (X.prodBc[angka] || X.perBc[angka])) { tampilBarcode(angka); bunyi('scanOk'); getar(30); catat(angka); return; }
      if (q.length >= 2) {
        var c = cari(q);
        if (c.prod.length || c.lok.length) { tampilDaftar(q, c); bunyi('scanOk'); return; }
      }
      hasil('<div class="tolak-alat" role="alert"><b>' + esc(q) + '</b>' + esc(t('tidakKetemu')) + '</div>');
      bunyi('scanTolak'); getar([60, 40, 60]);
    }, function () {
      hasil('<div class="tolak-alat" role="alert">' + esc(t('gagalData')) + '</div>'); bunyi('gagal');
    });
  }
  function status(l) {
    var p = l.kap ? l.isi / l.kap : 0;
    if (!l.isi) return { k: 'kosong', t: t('kosong') };
    if (p > 1.0001) return { k: 'lebih', t: t('lebih') };
    if (p >= 0.9999) return { k: 'penuh', t: t('penuh') };
    if (l.rendah || p < 0.5) return { k: 'rendah', t: t('rendah') };
    return { k: 'ok', t: t('ok') };
  }
  function namaSlot(l) { var p = X.prodBc[String(l.barcode || '')]; return p && p.n ? p.n : (l.sku || ''); }
  function metaSlot(l) { return [l.zona, l.unit, l.level != null && l.level !== '' && l.zona !== 'OVERFLOW' ? (id() ? 'Tingkat ' : 'Level ') + l.level : '', l.pos].filter(function (x) { return x !== '' && x != null; }).join(' · '); }
  function tampilSlot(l) {
    var nama = namaSlot(l), st = status(l), persen = l.kap ? Math.round(l.isi / l.kap * 100) : 0;
    var lain = (X.perBc[String(l.barcode || '')] || []).filter(function (x) { return x.kode !== l.kode; });
    hasil('<article class="kartu-slot">' +
      '<div class="slot-kepala"><b class="slot-kode">' + esc(l.kode) + '</b><span class="slot-meta">' + esc(metaSlot(l)) + '</span>' + (l.peran ? '<span class="chip-alat peran">' + esc(l.peran) + '</span>' : '') + '</div>' +
      '<div class="slot-isi">' + fotoHtml(nama, l.sku, 'besar') + '<div class="slot-nama"><b>' + esc(nama) + '</b><small>' + esc(l.sku || '') + (l.barcode ? ' · ' + esc(l.barcode) : '') + '</small></div></div>' +
      '<div class="slot-angka"><b class="angka-besar">' + nf(l.isi) + '</b><span class="dari"> / ' + nf(l.kap) + ' ' + esc(t('kapasitas')) + '</span><span class="status-alat s-' + st.k + '">' + esc(st.t) + '</span></div>' +
      '<div class="batang-alat"><i class="s-' + st.k + '" style="width:' + Math.max(0, Math.min(100, persen)) + '%"></i></div>' +
      (lain.length ? '<div class="lain-alat"><span class="lbl">' + esc(t('alsoAt')) + '</span>' + lain.map(function (x) { return '<button type="button" class="chip-alat" data-slot="' + esc(x.kode) + '">' + esc(x.kode) + ' <b>' + nf(x.isi) + '</b></button>'; }).join('') + '</div>' : '') +
      (l.barcode ? '<button type="button" class="btn dua tombol-paspor" data-paspor-buka="' + esc(l.barcode) + '">' + esc(t('paspor')) + ' →</button>' : '') +
      '</article>');
  }
  function tampilBarcode(bc) {
    var p = X.prodBc[bc], ls = (X.perBc[bc] || []).slice().sort(function (a, b) { return b.isi - a.isi; });
    var nama = p ? p.n : (ls[0] && ls[0].sku) || bc, total = ls.reduce(function (s, l) { return s + (Number(l.isi) || 0); }, 0);
    hasil('<article class="kartu-slot">' +
      '<div class="slot-isi">' + fotoHtml(nama, ls[0] && ls[0].sku, 'besar') + '<div class="slot-nama"><b>' + esc(nama) + '</b><small>' + esc(p && p.s ? p.s + ' · ' : '') + esc(bc) + '</small></div></div>' +
      '<div class="slot-angka"><b class="angka-besar">' + nf(total) + '</b><span class="dari"> pcs ' + esc(t('diRak')) + '</span></div>' +
      '<span class="lbl">' + esc(t('lokasiSku')) + '</span>' +
      (ls.length ? '<div class="daftar-slot">' + ls.map(function (l) { var st = status(l); return '<button type="button" class="baris-slot" data-slot="' + esc(l.kode) + '"><b>' + esc(l.kode) + '</b><span>' + esc(metaSlot(l)) + '</span><span class="num">' + nf(l.isi) + ' / ' + nf(l.kap) + '</span><span class="status-alat s-' + st.k + '">' + esc(st.t) + '</span></button>'; }).join('') + '</div>' : '<p class="ket-alat">' + esc(t('belumAdaDiRak')) + '</p>') +
      (p ? '<button type="button" class="btn dua tombol-paspor" data-paspor-buka="' + esc(bc) + '">' + esc(t('paspor')) + ' →</button>' : '') +
      '</article>');
  }
  function cari(q) {
    var n = norm(q), k = q.toUpperCase(), prod = [], lok = [], lihat = {};
    if (n) ((D.data && D.data.prod) || []).forEach(function (p) {
      if (prod.length >= 12 || !p.n || lihat[p.b]) return;
      if (norm(p.n).indexOf(n) > -1 || String(p.s || '').toLowerCase().indexOf(q.toLowerCase()) > -1) { lihat[p.b] = 1; prod.push(p); }
    });
    ((D.gudang && D.gudang.lokasi) || []).forEach(function (l) { if (lok.length < 40 && String(l.kode).toUpperCase().indexOf(k) === 0) lok.push(l); });
    /* nama pendek gudang ("KC Bear") juga dicari */
    Object.keys(X.pendek).forEach(function (s) { var p = X.prodBc[X.pendek[s]]; if (n && s.indexOf(n) > -1 && p && !lihat[p.b] && prod.length < 12) { lihat[p.b] = 1; prod.push(p); } });
    return { prod: prod, lok: lok };
  }
  function tampilDaftar(q, c) {
    var h = '<p class="lbl">' + esc(t('hasilCari')) + ' “' + esc(q) + '”</p>';
    if (c.prod.length) h += '<div class="daftar-sku">' + c.prod.map(function (p) {
      var ls = X.perBc[String(p.b)] || [], total = ls.reduce(function (s, l) { return s + (Number(l.isi) || 0); }, 0);
      return '<button type="button" class="baris-sku" data-paspor-buka="' + esc(p.b) + '">' + fotoHtml(p.n) + '<span class="nama"><b>' + esc(p.n) + '</b><small>' + esc(p.s || '') + ' · ' + esc(p.b) + '</small></span><span class="num">' + nf(total) + ' pcs ' + esc(t('diRak')) + '</span></button>';
    }).join('') + '</div>';
    if (c.lok.length) h += '<p class="lbl">' + esc(t('slot')) + '</p><div class="lain-alat">' + c.lok.map(function (l) { return '<button type="button" class="chip-alat" data-slot="' + esc(l.kode) + '">' + esc(l.kode) + ' <b>' + nf(l.isi) + '</b></button>'; }).join('') + '</div>';
    hasil(h);
  }

  /* ---------- kamera ---------- */
  function nyalakanKamera() {
    var kotak = el('alatKameraKotak'); if (!kotak || !bisaKamera()) return;
    var mau = ['code_128', 'ean_13', 'qr_code', 'code_39', 'ean_8', 'upc_a'];
    var minta = W.BarcodeDetector.getSupportedFormats ? W.BarcodeDetector.getSupportedFormats() : Promise.resolve(mau);
    Promise.resolve(minta).then(function (ada) {
      var pakai = mau.filter(function (f) { return (ada || []).indexOf(f) > -1; }); if (!pakai.length) pakai = ['code_128'];
      A.kam.det = new W.BarcodeDetector({ formats: pakai });
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    }).then(function (aliran) {
      A.kam.aliran = aliran;
      kotak.innerHTML = '<div class="kamera-alat"><video playsinline muted autoplay></video><i class="bidik" aria-hidden="true"></i><button type="button" class="btn dua" data-alat="kamera">' + esc(t('stopKamera')) + '</button></div>';
      var v = kotak.querySelector('video'); v.srcObject = aliran; var pl = v.play && v.play(); if (pl && pl.catch) pl.catch(function () {});
      A.kam.v = v; var b = el('alatKamera'); if (b) b.classList.add('nyala');
      lingkarKamera();
    }).catch(function () { matikanKamera(); kotak.innerHTML = '<p class="tolak-alat">' + esc(t('kameraGagal')) + '</p>'; });
  }
  function lingkarKamera() {
    if (!A.kam.aliran || !A.kam.det) return;
    A.kam.det.detect(A.kam.v).then(function (r) {
      if (!A.kam.aliran) return;
      if (r && r.length && r[0].rawValue) { var k = String(r[0].rawValue); matikanKamera(); tanganiKode(k); return; }
      A.kam.t = setTimeout(lingkarKamera, 220);
    }, function () { if (A.kam.aliran) A.kam.t = setTimeout(lingkarKamera, 400); });
  }
  function matikanKamera() {
    if (A.kam.t) { clearTimeout(A.kam.t); A.kam.t = null; }
    if (A.kam.aliran) { try { A.kam.aliran.getTracks().forEach(function (tr) { try { tr.stop(); } catch (e) {} }); } catch (e) {} }
    A.kam.aliran = null; A.kam.v = null;
    var k = el('alatKameraKotak'); if (k) k.innerHTML = '';
    var b = el('alatKamera'); if (b) b.classList.remove('nyala');
  }

  /* ---------- label rak ---------- */
  function daftarUnit() { var u = []; ((D.gudang && D.gudang.lokasi) || []).forEach(function (l) { var x = String(l.unit || l.kode.split('-')[0]); if (u.indexOf(x) < 0) u.push(x); }); return u; }
  function gambarLabelAwal() {
    el('alatIsi').innerHTML = '<p class="ket-alat">' + esc(t('muat')) + '</p>';
    muat().then(function () {
      if (A.mode !== 'label') return;
      var u = daftarUnit(); if (A.unit == null || (A.unit && u.indexOf(A.unit) < 0)) A.unit = u[0] || '';
      el('alatIsi').innerHTML = '<div class="label-atur"><label class="lbl" for="alatUnit">' + esc(t('unit')) + '</label>' +
        '<select id="alatUnit"><option value="">' + esc(t('semuaUnit')) + '</option>' + u.map(function (x) { return '<option value="' + esc(x) + '"' + (x === A.unit ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="btn" id="alatCetak" data-alat="cetak">' + esc(t('cetak')) + '</button></div>' +
        '<p class="ket-alat">' + esc(t('ketLabel')) + '</p><div class="lembar-label" id="alatLabel"></div>';
      gambarLabel();
    }, function () { el('alatIsi').innerHTML = '<div class="tolak-alat">' + esc(t('gagalData')) + '</div>'; });
  }
  function labelTerpilih() { return ((D.gudang && D.gudang.lokasi) || []).filter(function (l) { return !A.unit || String(l.unit || l.kode.split('-')[0]) === A.unit; }); }
  function htmlLabel(l) {
    var nama = namaSlot(l);
    return '<div class="label-rak" data-kode="' + esc(l.kode) + '"><div class="label-atas"><b class="label-kode">' + esc(l.kode) + '</b>' + (l.peran ? '<span class="label-peran">' + esc(l.peran) + '</span>' : '') + '</div>' +
      kode128(String(l.kode)) +
      '<div class="label-bawah">' + fotoHtml(nama, l.sku, 'kecil') + '<span class="label-nama"><b>' + esc(l.sku || '') + '</b><small>' + esc(metaSlot(l)) + '</small></span></div></div>';
  }
  function gambarLabel() { var w = el('alatLabel'); if (w) w.innerHTML = labelTerpilih().map(htmlLabel).join(''); }
  function cetak() {
    var ls = labelTerpilih(); if (!ls.length) return;
    var w = document.createElement('div'); w.id = 'lembarCetak'; w.innerHTML = ls.map(htmlLabel).join('');
    document.body.appendChild(w); document.body.classList.add('cetak-label');
    var beres = function () { document.body.classList.remove('cetak-label'); if (w.parentNode) w.parentNode.removeChild(w); };
    try { W.print(); } finally { setTimeout(beres, 0); }
  }

  /* ---------- paspor ---------- */
  function paspor(info) {
    buka('paspor');
    el('alatIsi').innerHTML = '<p class="ket-alat">' + esc(t('muat')) + '</p>';
    muat().then(function () {
      var p = cariProduk(info || {});
      if (!p) { el('alatIsi').innerHTML = '<button type="button" class="balik-alat" data-alat="kembali">← ' + esc(t('kembali')) + '</button><div class="tolak-alat"><b>' + esc((info && (info.nama || info.bc)) || '') + '</b> · ' + esc(t('skuTidakKetemu')) + '</div>'; return; }
      gambarPaspor(p);
    }, function () { el('alatIsi').innerHTML = '<div class="tolak-alat">' + esc(t('gagalData')) + '</div>'; });
  }
  function hitungPaspor(p) {
    var L = (D.data && D.data.lok) || [], i = p.__i;
    var r = { masuk: 0, koreksi: 0, dikirim: 0, laku: 0, stok: {}, toko: {}, riwayat: [], pertama: '' };
    var toko = function (l) { return !!(l && (l.toko === 1 || l.toko === '1' || l.toko === true)); };
    ((D.data && D.data.baris) || []).forEach(function (b, urut) {
      if (b[1] !== i) return;
      var q = Number(b[2]) || 0, dr = L[b[3]] || { k: '?' }, ke = L[b[4]] || { k: '?' }, j = '';
      r.stok[dr.k] = (r.stok[dr.k] || 0) - q; r.stok[ke.k] = (r.stok[ke.k] || 0) + q;
      var T = function (l) { return (r.toko[l.k] = r.toko[l.k] || { lok: l, terima: 0, laku: 0 }); };
      if (ke.k === 'HO') {
        if (dr.k === 'OPENING') { j = 'opening'; r.masuk += q; if (!r.pertama) r.pertama = b[0]; }
        else if (dr.k === 'PRINCIPAL') { j = 'principal'; r.masuk += q; if (!r.pertama) r.pertama = b[0]; }
        else if (dr.k === 'ADJUST') { j = 'koreksiMasuk'; r.koreksi += q; }
        else if (dr.k === 'TRANSIT') j = 'batal';
        else if (toko(dr)) j = 'pulang';
      } else if (dr.k === 'HO') {
        if (ke.k === 'TRANSIT') { j = 'kirim'; r.dikirim += q; }
        else if (toko(ke)) { j = 'kirimLangsung'; r.dikirim += q; T(ke).terima += q; }
        else if (ke.k === 'ADJUST') { j = 'koreksiKeluar'; r.koreksi -= q; }
        else if (ke.k === 'TERJUAL') { j = 'lakuHO'; r.laku += q; }
        else if (ke.k === 'GMT') j = 'gmt';
        else if (ke.k === 'PRINCIPAL') j = 'retur';
        else if (ke.k === 'RUSAK') j = 'rusak';
      } else if (dr.k === 'TRANSIT' && toko(ke)) { j = 'sampai'; T(ke).terima += q; }
      else if (toko(dr) && ke.k === 'TERJUAL') { j = 'laku'; r.laku += q; T(dr).laku += q; }
      else if (dr.k === 'GMT' && ke.k === 'TERJUAL') { j = 'lakuGmt'; r.laku += q; }
      else if (ke.k === 'RUSAK') j = 'rusak';
      else if (dr.k === 'ADJUST') { j = 'koreksiMasuk'; r.koreksi += q; }
      else if (ke.k === 'ADJUST') { j = 'koreksiKeluar'; r.koreksi -= q; }
      else if (dr.k === 'OPENING' && toko(ke)) { j = 'openingToko'; T(ke).terima += q; }
      if (toko(dr)) T(dr); if (toko(ke)) T(ke);
      r.riwayat.push({ tgl: String(b[0] || ''), q: q, dr: dr, ke: ke, j: j, urut: urut });
    });
    r.riwayat.sort(function (a, b) { return a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : b.urut - a.urut; });
    r.gudang = r.stok.HO || 0;
    r.gerai = 0; Object.keys(r.toko).forEach(function (k) { r.toko[k].stok = r.stok[k] || 0; r.gerai += r.toko[k].stok; });
    r.milik = r.gudang + r.gerai + (r.stok.TRANSIT || 0) + (r.stok.GMT || 0);
    return r;
  }
  function labelRiwayat(x) {
    var nm = function (l) { return l.k + (l.n && l.n !== l.k ? ' · ' + l.n : ''); };
    switch (x.j) {
      case 'opening': return t('r_opening');
      case 'principal': return t('r_principal');
      case 'koreksiMasuk': return t('r_koreksiMasuk') + (x.ke.k !== 'HO' ? ' · ' + x.ke.k : '');
      case 'koreksiKeluar': return t('r_koreksiKeluar') + (x.dr.k !== 'HO' ? ' · ' + x.dr.k : '');
      case 'kirim': return t('r_kirim');
      case 'kirimLangsung': return t('r_kirimLangsung') + ' ' + nm(x.ke);
      case 'sampai': return t('r_sampai') + ' ' + nm(x.ke);
      case 'laku': return t('r_laku') + ' ' + nm(x.dr);
      case 'lakuHO': return t('r_lakuHO');
      case 'gmt': return t('r_gmt');
      case 'lakuGmt': return t('r_lakuGmt');
      case 'retur': return t('r_retur');
      case 'rusak': return t('r_rusak') + (x.dr.k !== 'HO' ? ' · ' + x.dr.k : '');
      case 'pulang': return t('r_pulang') + ' ' + nm(x.dr);
      case 'batal': return t('r_batal');
      case 'openingToko': return t('r_openingToko') + ' ' + nm(x.ke);
      default: return x.dr.k + ' → ' + x.ke.k;
    }
  }
  function tandaQty(x) { return (x.j === 'koreksiKeluar' ? '−' : (x.j === 'koreksiMasuk' ? '+' : '')) + nf(x.q); }
  function gambarPaspor(p) {
    var r = hitungPaspor(p), ls = (X.perBc[String(p.b)] || []).slice().sort(function (a, b) { return b.isi - a.isi || (a.kode < b.kode ? -1 : 1); });
    var diRak = ls.reduce(function (s, l) { return s + (Number(l.isi) || 0); }, 0), belum = Math.max(0, r.gudang - diRak);
    var koreksi = (r.koreksi > 0 ? '+' : r.koreksi < 0 ? '−' : '') + nf(Math.abs(r.koreksi));
    var stop = function (kunci, angka, judul, kecil) { return '<li><b class="angka-besar" data-paspor="' + kunci + '">' + angka + '</b><span>' + esc(judul) + '</span>' + (kecil ? '<small>' + kecil + '</small>' : '') + '</li>'; };
    var tokoK = Object.keys(r.toko).sort(function (a, b) { return r.toko[b].stok - r.toko[a].stok || (a < b ? -1 : 1); });
    var h = '<div class="paspor">' +
      '<button type="button" class="balik-alat" data-alat="kembali">← ' + esc(t('kembali')) + '</button>' +
      '<header class="paspor-kepala">' + fotoHtml(p.n, (ls[0] || {}).sku, 'paspor') + '<div class="paspor-nama"><span class="lbl">' + esc(t('judulPaspor')) + '</span><h2 data-paspor="judul">' + esc(p.n) + '</h2><small>' + esc([p.s, p.b].filter(Boolean).join(' · ')) + '</small></div>' +
      '<div class="paspor-total"><b class="angka-besar">' + nf(r.milik) + '</b><span>' + esc(t('milik')) + '</span></div></header>' +
      '<ol class="jalur-paspor">' +
        stop('masuk', nf(r.masuk), t('masuk'), r.pertama ? esc(t('pertama')) + ' ' + tgl(r.pertama) : '') +
        stop('gudang', nf(r.gudang), t('diGudang')) +
        stop('dikirim', nf(r.dikirim), t('dikirim')) +
        stop('gerai', nf(r.gerai), t('diGerai'), tokoK.length ? nf(tokoK.length) + ' ' + (id() ? 'gerai' : (tokoK.length === 1 ? 'store' : 'stores')) : '') +
        stop('laku', nf(r.laku), t('laku')) +
      '</ol>' +
      '<p class="koreksi-paspor">' + esc(t('koreksi')) + ' <b data-paspor="koreksi">' + koreksi + '</b></p>' +
      '<div class="dua-kolom">' +
      '<section class="kotak-paspor"><h3>' + esc(t('diGudangJudul')) + '</h3>' +
        (ls.length ? '<div class="daftar-slot">' + ls.map(function (l) { var st = status(l); return '<button type="button" class="baris-slot" data-slot="' + esc(l.kode) + '" data-paspor-lokasi="' + esc(l.kode) + '" data-isi="' + esc(l.isi) + '"><b>' + esc(l.kode) + '</b><span>' + esc(metaSlot(l)) + '</span><span class="num">' + nf(l.isi) + ' / ' + nf(l.kap) + '</span><span class="status-alat s-' + st.k + '">' + esc(st.t) + '</span></button>'; }).join('') + '</div>' : '<p class="ket-alat">' + esc(t('belumAdaDiRak')) + '</p>') +
        '<p class="belum-paspor">' + esc(t('belumLokasi')) + ' <b data-paspor="belumLokasi">' + nf(belum) + '</b></p></section>' +
      '<section class="kotak-paspor"><h3>' + esc(t('diGeraiJudul')) + '</h3>' +
        (tokoK.length ? '<table class="tabel-paspor"><tbody>' + tokoK.map(function (k) { var x = r.toko[k]; return '<tr data-paspor-toko="' + esc(k) + '" data-stok="' + esc(x.stok) + '"><td><b>' + esc(k) + '</b><small>' + esc(x.lok.n || '') + '</small></td><td class="num">' + nf(x.terima) + '<small>' + esc(t('terima')) + '</small></td><td class="num">' + nf(x.laku) + '<small>' + esc(t('terjual')) + '</small></td><td class="num"><b>' + nf(x.stok) + '</b><small>' + esc(t('stok')) + '</small></td></tr>'; }).join('') + '</tbody></table>' : '<p class="ket-alat">—</p>') +
      '</section></div>' +
      '<section class="kotak-paspor"><h3>' + esc(t('riwayat')) + '</h3>' +
        (r.riwayat.length ? '<ol class="riwayat-paspor" id="alatRiwayatPaspor">' + r.riwayat.map(function (x, n) {
          return '<li data-riwayat="' + esc(x.tgl) + '" class="j-' + esc(x.j || 'lain') + (n >= 12 ? ' lebih' : '') + '"><span class="tgl">' + tgl(x.tgl) + '</span><span class="apa">' + esc(labelRiwayat(x)) + '</span><b class="num">' + tandaQty(x) + '</b></li>';
        }).join('') + '</ol>' + (r.riwayat.length > 12 ? '<button type="button" class="btn dua" data-alat="semuaRiwayat">' + esc(t('semuaRiwayat')) + '</button>' : '') : '<p class="ket-alat">' + esc(t('tanpaRiwayat')) + '</p>') +
      '</section>' +
      '<p class="ket-alat">' + esc(t('ketPaspor')) + (D.data && D.data.diperbarui ? ' ' + esc(t('per')) + ' ' + esc(D.data.diperbarui) + '.' : '') + '</p>' +
      '</div>';
    el('alatIsi').innerHTML = h;
    var isi = el('alatIsi'); if (isi) isi.scrollTop = 0;
  }

  W.WmsAlat = { buka: buka, tutup: tutup, paspor: paspor, kode128: kode128, _hitung: hitungPaspor };
})();
