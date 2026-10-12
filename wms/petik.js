/* Petik tanpa sinyal WMS Mofmofriends (12 Okt 2026): tab "Petik" di alat Scan.
 *
 * Antrean "scan tanpa sinyal". Sinyal di dalam gudang sering hilang, dan
 * tembakan picking yang menunggu server berarti orang berdiri diam di depan
 * rak. Di sini:
 *  - Peta gudang (Location Master) dan Master Produk terakhir disimpan di
 *    perangkat oleh alat.js, jadi aturan Petik tetap jalan tanpa sinyal:
 *    lokasi dulu baru barang, barcode harus cocok dengan isi lokasi, jumlah
 *    tidak boleh melebihi isi rak dikurangi yang sudah diangkat di HP ini,
 *    tembakan dobel dalam 400 ms diabaikan (sama dengan Petik.gs).
 *  - Tiap tembakan langsung tersimpan di HP. "Simpan angkatan" memindahkan
 *    angkatan ke antrean dengan nomor unik.
 *  - Antrean dikirim berurutan begitu ada sinyal (kejadian online, tiap
 *    30 detik, dan saat angkatan disimpan) ke wmsAntrePetik di Apps Script,
 *    yang menolak nomor yang sudah pernah ditulis, lalu memanggil
 *    ptkSimpanDaftar (aturan dan lembar Gudang Petik yang sama).
 *  - Jawaban server "ditolak" (misalnya isi rak sudah habis diangkat orang
 *    lain) menghentikan angkatan itu dan menyebut alasannya; tidak dikirim
 *    ulang sendiri. Gagal jaringan dan server belum siap dicoba lagi.
 * Stok tidak dipotong di sini, sama dengan Petik.gs.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !!(M().bhs && M().bhs() === 'id'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return W.document.getElementById(i); }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function getar(p) { try { if (M().getar) M().getar(p); } catch (e) {} }
  function kodeLok(v) { return String(v == null ? '' : v).replace(/\s+/g, '').toUpperCase(); }
  function barcode(v) { var s = String(v == null ? '' : v).replace(/\s+/g, ''); return /^\d+\.0+$/.test(s) ? s.replace(/\.0+$/, '') : s; }
  function jam(iso) { var d = new Date(iso); if (isNaN(d)) return ''; var p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getHours()) + '.' + p(d.getMinutes()); }

  var TS = {
    id: { tab: 'Petik', ref: 'No. rencana kirim', oleh: 'Nama pencatat', tembak: 'Tembak label rak dulu, lalu barcode tiap barang', simpan: 'Simpan angkatan ini', kosongkan: 'Kosongkan',
      daring: 'Ada sinyal', luring: 'Tanpa sinyal', menunggu: function (n) { return n + ' angkatan menunggu dikirim'; }, semuaTerkirim: 'Semua angkatan sudah terkirim', kirim: 'Kirim sekarang',
      lokasi: 'Lokasi', isi: 'isi', sudah: 'sudah diangkat di HP ini', angkatan: 'Angkatan ini', kosong: 'Belum ada barang yang ditembak.', antrean: 'Di HP ini',
      st: { menunggu: 'Tersimpan di HP', mengirim: 'Mengirim…', terkirim: 'Terkirim', ditolak: 'Ditolak server' }, kirimUlang: 'Kirim ulang', hapus: 'Hapus', yaHapus: 'Ya, hapus', batal: 'Batal',
      konfHapus: 'Hapus angkatan ini dari HP? Barang yang sudah diangkat harus dikembalikan ke raknya.', konfKosong: 'Kosongkan angkatan yang belum disimpan?',
      pcs: 'pcs', petaSimpanan: function (w) { return 'Tanpa sinyal: memakai peta gudang tersimpan di HP ini (' + w + ').'; }, petaKosong: 'Peta gudang belum pernah tersimpan di HP ini. Buka tab ini sekali saat ada sinyal.',
      perluRef: 'Isi dulu nomor rencana kirimnya.', perluLokasi: 'Tembak lokasinya dulu, baru SKU-nya.', lokasiTak: function (k) { return 'Lokasi ' + k + ' tidak ada di Location Master. Periksa labelnya, atau taruh barangnya di X-IN dulu.'; },
      lokasiKosong: function (k) { return 'Lokasi ' + k + ' belum punya SKU terdaftar.'; }, beda: function (k, s) { return 'Lokasi ' + k + ' terdaftar berisi ' + s + '. Yang ditembak bukan itu, jadi tidak ada yang tercatat. Kembalikan barangnya lalu tembak lagi.'; },
      lebih: function (k, i, s) { return 'Lokasi ' + k + ' isinya ' + i + ' pcs dan ' + s + ' pcs sudah diangkat di HP ini, jadi tidak bisa ditambah lagi. Hitung ulang raknya, atau ambil dari lokasi lain.'; },
      siapLokasi: function (k, s, i, a) { return k + ' : ' + s + ', sisa ' + Math.max(0, i - a) + ' pcs dari ' + i; }, diangkat: function (q, s, k) { return q + ' pcs ' + s + ' dari ' + k + ' (tersimpan di HP)'; },
      dobel: 'Tembakan dobel diabaikan.', tersimpan: function (n) { return 'Angkatan ' + n + ' pcs tersimpan di HP. Dikirim begitu ada sinyal.'; }, belumSiap: 'Server belum menerima antrean (Apps Script versi baru belum di-deploy). Angkatan tetap aman di HP.',
      terakhirGagal: 'Pengiriman terakhir gagal, dicoba lagi otomatis.', ulangKet: 'Kirim ulang sesudah raknya diperiksa.' },
    en: { tab: 'Pick', ref: 'Delivery plan no.', oleh: 'Picker name', tembak: 'Scan the rack label first, then each item barcode', simpan: 'Save this batch', kosongkan: 'Clear',
      daring: 'Online', luring: 'No signal', menunggu: function (n) { return n + (n === 1 ? ' batch waiting' : ' batches waiting'); }, semuaTerkirim: 'Every batch has been sent', kirim: 'Send now',
      lokasi: 'Location', isi: 'holds', sudah: 'picked on this phone', angkatan: 'This batch', kosong: 'Nothing scanned yet.', antrean: 'On this phone',
      st: { menunggu: 'Saved on phone', mengirim: 'Sending…', terkirim: 'Sent', ditolak: 'Rejected by server' }, kirimUlang: 'Send again', hapus: 'Delete', yaHapus: 'Yes, delete', batal: 'Cancel',
      konfHapus: 'Delete this batch from the phone? Picked items must go back to their rack.', konfKosong: 'Clear the unsaved batch?',
      pcs: 'pcs', petaSimpanan: function (w) { return 'No signal: using the warehouse map saved on this phone (' + w + ').'; }, petaKosong: 'The warehouse map has never been saved on this phone. Open this tab once with signal.',
      perluRef: 'Fill in the delivery plan number first.', perluLokasi: 'Scan the location first, then the SKU.', lokasiTak: function (k) { return 'Location ' + k + ' is not in the Location Master.'; },
      lokasiKosong: function (k) { return 'Location ' + k + ' has no SKU registered.'; }, beda: function (k, s) { return 'Location ' + k + ' is registered for ' + s + '. That is not it, nothing was recorded.'; },
      lebih: function (k, i, s) { return 'Location ' + k + ' holds ' + i + ' pcs and ' + s + ' pcs were already picked on this phone.'; },
      siapLokasi: function (k, s, i, a) { return k + ' : ' + s + ', ' + Math.max(0, i - a) + ' of ' + i + ' pcs left'; }, diangkat: function (q, s, k) { return q + ' pcs ' + s + ' from ' + k + ' (saved on phone)'; },
      dobel: 'Double scan ignored.', tersimpan: function (n) { return 'Batch of ' + n + ' pcs saved on the phone. It is sent when there is signal.'; }, belumSiap: 'The server does not take the queue yet (new Apps Script version not deployed). The batch stays safe on the phone.',
      terakhirGagal: 'The last send failed; it retries on its own.', ulangKet: 'Send again after checking the rack.' }
  };
  function T(k) { var d = TS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TS.en[k]; }

  /* ---------- simpanan di HP ---------- */
  var K_ANTRE = 'wms_petik_antre', K_KINI = 'wms_petik_kini';
  function baca(k, cad) { try { var x = JSON.parse(W.localStorage.getItem(k) || 'null'); return x == null ? cad : x; } catch (e) { return cad; } }
  function tulis(k, v) { try { W.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function antre() { var a = baca(K_ANTRE, []); return Array.isArray(a) ? a : []; }
  function kini() { var k = baca(K_KINI, null); return k && Array.isArray(k.baris) ? k : { ref: '', oleh: '', lokasi: '', baris: [] }; }
  function nomorUnik() { var a = ''; try { var b = new Uint8Array(12); W.crypto.getRandomValues(b); for (var i = 0; i < b.length; i++) a += (b[i] < 16 ? '0' : '') + b[i].toString(16); } catch (e) { a = String(Date.now()) + Math.random().toString(16).slice(2, 10); } return 'ptk-' + a; }

  var S = { pesan: '', jenisPesan: '', konf: null, kirimJalan: false, galatKirim: '', terakhir: { kode: '', t: 0 } };
  function peta() {
    var d = W.WmsAlat && W.WmsAlat._data ? W.WmsAlat._data() : {}, x = {};
    ((d.gudang && d.gudang.lokasi) || []).forEach(function (l) { x[kodeLok(l.kode)] = l; });
    return { lok: x, dariSimpanan: d.dariSimpanan || '', ada: !!(d.gudang && d.gudang.lokasi) };
  }
  /* pcs yang sudah diangkat di HP ini dari satu lokasi: angkatan berjalan +
     antrean yang belum terkirim (yang sudah terkirim sudah tercatat server) */
  function sudahDiHp(kode, bc) {
    var n = 0;
    kini().baris.forEach(function (b) { if (b.lokasi === kode && b.barcode === bc) n += b.qty; });
    antre().forEach(function (a) { if (a.status === 'terkirim') return; (a.baris || []).forEach(function (b) { if (b.lokasi === kode && b.barcode === bc) n += b.qty; }); });
    return n;
  }
  function judulTab() { return T('tab'); }
  function teksSimpanan(w) { var d = new Date(w); return T('petaSimpanan')(isNaN(d) ? String(w) : d.toLocaleString(id() ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })); }

  function tembak(teks) {
    var q = String(teks == null ? '' : teks).trim(); if (!q) return;
    var now = Date.now();
    if (S.terakhir.kode === q && now - S.terakhir.t < 400) { S.terakhir.t = now; pesan(T('dobel'), 'info'); return; }
    S.terakhir = { kode: q, t: now };
    var k = kini(), P = peta(), refEl = el('ptkRef'), olehEl = el('ptkOleh');
    if (refEl) k.ref = refEl.value.trim(); if (olehEl) k.oleh = olehEl.value.trim();
    if (!k.ref) { tulis(K_KINI, k); tolak(T('perluRef')); return; }
    var kode = kodeLok(q);
    if (P.lok[kode]) { k.lokasi = kode; tulis(K_KINI, k); var l = P.lok[kode]; pesan(T('siapLokasi')(kode, l.sku || l.barcode, Number(l.isi) || 0, sudahDiHp(kode, String(l.barcode || ''))), 'ok'); bunyi('klik'); gambarUlang(); return; }
    if (/^[A-Z]{1,3}\d*-\w+$/.test(kode) && !/^\d+$/.test(kode)) { tolak(T('lokasiTak')(kode)); return; }
    if (!k.lokasi) { tolak(T('perluLokasi')); return; }
    var lok = P.lok[k.lokasi];
    if (!lok) { tolak(T('lokasiTak')(k.lokasi)); return; }
    var bcL = String(lok.barcode || ''), bc = barcode(q);
    if (!bcL) { tolak(T('lokasiKosong')(k.lokasi)); return; }
    if (bc !== bcL) { tolak(T('beda')(k.lokasi, lok.sku || bcL)); return; }
    var isi = Number(lok.isi) || 0, s = sudahDiHp(k.lokasi, bcL);
    if (s + 1 > isi) { tolak(T('lebih')(k.lokasi, isi, s)); return; }
    var b = k.baris.filter(function (x) { return x.lokasi === k.lokasi && x.barcode === bcL; })[0];
    if (!b) { b = { lokasi: k.lokasi, barcode: bcL, sku: lok.sku || '', qty: 0 }; k.baris.push(b); }
    b.qty++;
    tulis(K_KINI, k);
    bunyi('isi'); getar(15);
    pesan(T('diangkat')(b.qty, lok.sku || bcL, k.lokasi), 'ok');
    gambarUlang();
  }
  function tolak(p) { pesan(p, 'tolak'); bunyi('gagal'); getar([40, 60, 40]); }
  function pesan(p, j) { S.pesan = p; S.jenisPesan = j || ''; var x = el('ptkPesan'); if (x) { x.textContent = p; x.className = 'ptk-pesan ' + S.jenisPesan; } }
  function simpanAngkatan() {
    var k = kini(); var refEl = el('ptkRef'), olehEl = el('ptkOleh');
    if (refEl) k.ref = refEl.value.trim(); if (olehEl) k.oleh = olehEl.value.trim();
    var baris = k.baris.filter(function (b) { return b.qty > 0; });
    if (!k.ref) { tolak(T('perluRef')); return; }
    if (!baris.length) { tolak(T('kosong')); return; }
    var a = antre(), total = baris.reduce(function (x, b) { return x + b.qty; }, 0);
    a.push({ id: nomorUnik(), ref: k.ref, oleh: k.oleh, waktu: new Date().toISOString(), baris: baris.map(function (b) { return { lokasi: b.lokasi, barcode: b.barcode, sku: b.sku, qty: b.qty }; }), status: 'menunggu', pesan: '' });
    tulis(K_ANTRE, a);
    tulis(K_KINI, { ref: k.ref, oleh: k.oleh, lokasi: '', baris: [] });
    bunyi('isi'); pesan(T('tersimpan')(total), 'ok');
    gambarUlang();
    kirimAntre();
  }
  /* Kirim berurutan. Gagal jaringan / server belum siap: berhenti, tetap
     "menunggu". Jawaban ok:false dari server: "ditolak", lanjut ke berikutnya. */
  function kirimAntre() {
    if (S.kirimJalan) return;
    if (W.navigator && W.navigator.onLine === false) { gambarUlang(); return; }
    var a = antre(), i = -1; for (var j = 0; j < a.length; j++) if (a[j].status === 'menunggu' || a[j].status === 'mengirim') { i = j; break; }
    if (i < 0 || !M().jalan) return;
    S.kirimJalan = true; a[i].status = 'mengirim'; tulis(K_ANTRE, a); gambarUlang();
    var x = a[i], badan = { id: x.id, ref: x.ref, oleh: x.oleh, waktu: x.waktu, baris: x.baris.map(function (b) { return { lokasi: b.lokasi, barcode: String(b.barcode), qty: b.qty }; }) };
    M().jalan('wmsAntrePetik', ['WMS-TIKET', badan]).then(function (h) {
      var b = antre(), y = b.filter(function (z) { return z.id === x.id; })[0]; if (!y) return true;
      if (h && h.ok) { y.status = 'terkirim'; y.pesan = h.pesan || ''; y.dikirim = new Date().toISOString(); S.galatKirim = ''; }
      else { y.status = 'ditolak'; y.pesan = (h && h.pesan) || 'Ditolak'; }
      tulis(K_ANTRE, b.slice(-60)); return true;
    }, function (e) {
      var b = antre(), y = b.filter(function (z) { return z.id === x.id; })[0]; if (y) { y.status = 'menunggu'; tulis(K_ANTRE, b); }
      var m = String(e && e.message || e); S.galatKirim = /tidak dibuka|wmsAntrePetik|deploy/i.test(m) ? T('belumSiap') : T('terakhirGagal');
      return false;
    }).then(function (lanjut) { S.kirimJalan = false; gambarUlang(); if (lanjut) setTimeout(kirimAntre, 50); });
  }
  function hapusAntre(nomor) { tulis(K_ANTRE, antre().filter(function (a) { return a.id !== nomor; })); S.konf = null; gambarUlang(); }
  function ulangAntre(nomor) { var a = antre(); a.forEach(function (x) { if (x.id === nomor) { x.status = 'menunggu'; x.pesan = ''; } }); tulis(K_ANTRE, a); gambarUlang(); kirimAntre(); }

  /* ---------- tampilan ---------- */
  var WADAH = null;
  function gambar(w) {
    WADAH = w; pasangKejadian();
    var m = W.WmsAlat && W.WmsAlat._muat ? W.WmsAlat._muat() : Promise.reject(new Error('alat'));
    gambarUlang();
    m.then(function () { gambarUlang(); }, function () { gambarUlang(); });
    setTimeout(function () { var r = el('ptkRef'), k = el('ptkKode'); if (r && !r.value) r.focus(); else if (k) k.focus(); }, 30);
    kirimAntre();
  }
  function gambarUlang() {
    var w = WADAH; if (!w || !W.document.body.contains(w)) return;
    /* hanya kalau tab Petik yang sedang terbuka di alat */
    var tab = W.document.querySelector('#alat.buka [data-tab=petik]'); if (!tab || tab.getAttribute('aria-selected') !== 'true') return;
    var aktif = W.document.activeElement && W.document.activeElement.id;
    var k = kini(), a = antre(), P = peta(), on = !(W.navigator && W.navigator.onLine === false);
    var tunggu = a.filter(function (x) { return x.status === 'menunggu' || x.status === 'mengirim'; }).length;
    var lok = k.lokasi ? P.lok[k.lokasi] : null;
    var total = k.baris.reduce(function (x, b) { return x + b.qty; }, 0);
    var html = '<div class="ptk-status ' + (on ? 'on' : 'off') + '" role="status"><span class="ptk-titik"></span><b>' + esc(on ? T('daring') : T('luring')) + '</b><span>' + esc(tunggu ? T('menunggu')(tunggu) : T('semuaTerkirim')) + '</span>' +
      (tunggu && on ? '<button type="button" class="btn dua ptk-kecil" data-ptk="kirim">' + esc(T('kirim')) + '</button>' : '') + '</div>' +
      (S.galatKirim && tunggu ? '<p class="ptk-pesan info">' + esc(S.galatKirim) + '</p>' : '') +
      (P.dariSimpanan ? '<p class="alat-simpanan" role="status">' + esc(teksSimpanan(P.dariSimpanan)) + '</p>' : !P.ada ? '<p class="ptk-pesan info">' + esc(T('petaKosong')) + '</p>' : '') +
      '<div class="ptk-isian"><label><span>' + esc(T('ref')) + '</span><input id="ptkRef" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="RK-20261012-01" value="' + esc(k.ref) + '"></label>' +
      '<label><span>' + esc(T('oleh')) + '</span><input id="ptkOleh" type="text" autocomplete="off" placeholder="Rudi" value="' + esc(k.oleh) + '"></label></div>' +
      '<form id="ptkForm" class="scan-baris" autocomplete="off"><label for="ptkKode" class="lbl">' + esc(T('tembak')) + '</label><div class="scan-input"><input id="ptkKode" type="text" inputmode="text" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="R1-4A · 4582…"><button type="submit" class="btn">OK</button></div></form>' +
      '<p id="ptkPesan" class="ptk-pesan ' + S.jenisPesan + '" aria-live="polite">' + esc(S.pesan) + '</p>' +
      (lok ? '<div class="ptk-lokasi"><b>' + esc(k.lokasi) + '</b><span>' + esc(lok.sku || lok.barcode || '') + '</span><small>' + esc(T('isi')) + ' ' + (Number(lok.isi) || 0) + ' ' + esc(T('pcs')) + ' · ' + sudahDiHp(k.lokasi, String(lok.barcode || '')) + ' ' + esc(T('sudah')) + '</small></div>' : '') +
      '<div class="ptk-blok"><div class="lbl">' + esc(T('angkatan')) + (total ? ' · ' + total + ' ' + esc(T('pcs')) : '') + '</div>' +
      (k.baris.length ? '<div class="ptk-daftar">' + k.baris.map(function (b) { return '<div class="ptk-baris"><b>' + esc(b.lokasi) + '</b><span>' + esc(b.sku || b.barcode) + '</span><span class="num">' + b.qty + ' ' + esc(T('pcs')) + '</span></div>'; }).join('') + '</div>' : '<p class="ket-alat">' + esc(T('kosong')) + '</p>') +
      (S.konf === 'kosong' ? konfirmasi(T('konfKosong'), 'kosongkanYa') : '<div class="ptk-tombol"><button type="button" class="btn" data-ptk="simpan"' + (total ? '' : ' disabled') + '>' + esc(T('simpan')) + '</button>' + (total ? '<button type="button" class="btn dua" data-ptk="kosongkan">' + esc(T('kosongkan')) + '</button>' : '') + '</div>') + '</div>' +
      (a.length ? '<div class="ptk-blok"><div class="lbl">' + esc(T('antrean')) + '</div><div class="ptk-antre">' + a.slice().reverse().map(function (x) {
        var pcs = x.baris.reduce(function (s, b) { return s + b.qty; }, 0);
        return '<div class="ptk-antre-baris s-' + x.status + '" data-ptk-antre="' + esc(x.id) + '"><div><b>' + esc(x.ref) + '</b><small>' + pcs + ' ' + esc(T('pcs')) + ' · ' + x.baris.length + ' ' + esc(T('lokasi').toLowerCase()) + ' · ' + esc(jam(x.waktu)) + (x.oleh ? ' · ' + esc(x.oleh) : '') + '</small>' +
          (x.status === 'ditolak' ? '<small class="ptk-alasan">' + esc(x.pesan) + ' ' + esc(T('ulangKet')) + '</small>' : '') + '</div><span class="ptk-chip">' + esc(T('st')[x.status] || x.status) + '</span>' +
          (x.status === 'ditolak' ? (S.konf === x.id ? konfirmasi(T('konfHapus'), 'hapusYa', x.id) : '<div class="ptk-tombol"><button type="button" class="btn dua ptk-kecil" data-ptk="ulang" data-id="' + esc(x.id) + '">' + esc(T('kirimUlang')) + '</button><button type="button" class="btn dua ptk-kecil" data-ptk="hapus" data-id="' + esc(x.id) + '">' + esc(T('hapus')) + '</button></div>') : '') + '</div>';
      }).join('') + '</div></div>' : '');
    w.innerHTML = html;
    if (aktif) { var f = el(aktif); if (f && f.focus) try { f.focus(); } catch (e) {} }
  }
  function konfirmasi(teks, aksi, nomor) { return '<div class="ptk-konfirmasi" role="group"><span>' + esc(teks) + '</span><button type="button" class="btn" data-ptk="' + aksi + '"' + (nomor ? ' data-id="' + esc(nomor) + '"' : '') + '>' + esc(aksi === 'hapusYa' ? T('yaHapus') : T('kosongkan')) + '</button><button type="button" class="btn dua" data-ptk="batal">' + esc(T('batal')) + '</button></div>'; }
  var terpasang = false;
  function pasangKejadian() {
    if (terpasang) return; terpasang = true;
    W.document.addEventListener('submit', function (e) { if (e.target && e.target.id === 'ptkForm') { e.preventDefault(); var k = el('ptkKode'); var v = k.value; k.value = ''; tembak(v); var k2 = el('ptkKode'); if (k2) k2.focus(); } });
    W.document.addEventListener('change', function (e) { if (e.target && (e.target.id === 'ptkRef' || e.target.id === 'ptkOleh')) { var k = kini(); k[e.target.id === 'ptkRef' ? 'ref' : 'oleh'] = e.target.value.trim(); tulis(K_KINI, k); } });
    W.document.addEventListener('click', function (e) {
      var x = e.target && e.target.closest ? e.target.closest('[data-ptk]') : null; if (!x || x.tagName === 'DIV') return;
      var a = x.getAttribute('data-ptk'), nomor = x.getAttribute('data-id');
      if (a === 'simpan') simpanAngkatan();
      else if (a === 'kirim') { bunyi('klik'); kirimAntre(); }
      else if (a === 'kosongkan') { S.konf = 'kosong'; gambarUlang(); }
      else if (a === 'kosongkanYa') { var k = kini(); tulis(K_KINI, { ref: k.ref, oleh: k.oleh, lokasi: '', baris: [] }); S.konf = null; pesan('', ''); gambarUlang(); }
      else if (a === 'hapus') { S.konf = nomor; gambarUlang(); }
      else if (a === 'hapusYa') hapusAntre(nomor);
      else if (a === 'ulang') { bunyi('klik'); ulangAntre(nomor); }
      else if (a === 'batal') { S.konf = null; gambarUlang(); }
    });
  }
  W.addEventListener('online', function () { kirimAntre(); gambarUlang(); });
  W.addEventListener('offline', function () { gambarUlang(); });
  setInterval(function () { if (antre().some(function (x) { return x.status === 'menunggu' || x.status === 'mengirim'; })) kirimAntre(); }, 30000);
  /* Antrean yang tertinggal dari bukaan sebelumnya ikut dikirim begitu WMS siap. */
  setTimeout(function () { var a = antre(); if (a.some(function (x) { return x.status === 'mengirim'; })) { a.forEach(function (x) { if (x.status === 'mengirim') x.status = 'menunggu'; }); tulis(K_ANTRE, a); } if (M().S && M().S.tiket) kirimAntre(); }, 3000);

  W.WmsPetik = { gambar: gambar, judulTab: judulTab, teksSimpanan: teksSimpanan, _tembak: tembak, _kirim: kirimAntre };
})();
