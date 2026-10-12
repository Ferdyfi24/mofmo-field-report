/* Jadwal Operational PIC dari WMS (12 Okt 2026).
 *
 * Ferdy: "pake template ini nanti untuk bulan selanjutnya, tpi sistem yg
 * generate", tombolnya di WMS, tanggalnya dia susun sendiri, lalu sistem
 * membuat PDF per mitra (template A4 berlogo, 11 Okt), draf email per mitra
 * (MAA satu, ke HO), dan gambar jadwal untuk staf yang dikirim manual lewat WA.
 *  - Susunan dibaca dari server (ambilJadwalPic): draf yang belum terbit, lalu
 *    jadwal yang sudah terbit, lalu baris lembar Jadwal Kunjungan, lalu pola
 *    hari di Master Lokasi. Pengguna mengetuk gerai lalu tanggal untuk menambah
 *    atau membuang; sistem cuma memeriksa, tidak mengubah susunan.
 *  - Terbitkan: PDF tiap penerima dibuat di peramban dengan jsPDF 2.5.1 (MIT,
 *    vendor/jspdf.umd.min.js, dimuat saat dibutuhkan), lalu dikirim ke
 *    terbitkanJadwalPic yang menulis lembar dan membuat draf Gmail. Mengubah
 *    sesudah terbit hanya membuat draf untuk penerima yang tanggalnya berubah.
 *  - Gambar staf (PNG/JPG) digambar di kanvas peramban, tidak dikirim ke mana
 *    pun; diunduh lalu dikirim lewat WA.
 * PDF dan gambar staf selalu berbahasa Indonesia (dibaca mitra dan staf);
 * layar WMS ikut pilihan bahasa WMS.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !(M().bhs && M().bhs() === 'en'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return W.document ? W.document.getElementById(i) : null; }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }

  /* ================= tanggal ================= */
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var HARI_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function dua(n) { return (n < 10 ? '0' : '') + n; }
  function geserBulan(b, n) { var y = +b.slice(0, 4), m = +b.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + dua(m + 1); }
  function jumlahHari(b) { return new Date(Date.UTC(+b.slice(0, 4), +b.slice(5, 7), 0)).getUTCDate(); }
  function hariKe(t) { return new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10))).getUTCDay(); }
  function tglBulan(b, d) { return b + '-' + dua(d); }
  function namaBulan(b, en) { return (en ? BULAN_EN : BULAN)[+b.slice(5, 7) - 1] + ' ' + b.slice(0, 4); }
  function tglPanjang(t) { return (+t.slice(8, 10)) + ' ' + BULAN[+t.slice(5, 7) - 1] + ' ' + t.slice(0, 4); }
  /* Senin pekan tanggal t (pekan Senin sampai Minggu, sama dengan kunci mingguan check-in) */
  function seninDari(t) { var h = hariKe(t), mund = (h + 6) % 7; var d = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10) - mund)); return d.toISOString().slice(0, 10); }
  function bulanIniLokal() { var d = new Date(); return d.getFullYear() + '-' + dua(d.getMonth() + 1); }
  function hariIniLokal() { var d = new Date(); return d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-' + dua(d.getDate()); }
  function daftarTanggal(tgl, b) {
    var d = tgl.slice().sort().map(function (t) { return String(+t.slice(8, 10)); });
    if (!d.length) return '';
    var ekor = ' ' + namaBulan(b);
    if (d.length === 1) return d[0] + ekor;
    if (d.length === 2) return d[0] + ' dan ' + d[1] + ekor;
    return d.slice(0, -1).join(', ') + ', dan ' + d[d.length - 1] + ekor;
  }
  function judul(s) {
    var tetap = { PIK: 1, GI: 1, PIM: 1, MAA: 1, HO: 1 };
    return String(s || '').toLowerCase().split(/\s+/).map(function (w) { var u = w.toUpperCase(); return tetap[u] ? u : (w ? w.charAt(0).toUpperCase() + w.slice(1) : w); }).join(' ').trim();
  }

  /* ================= gerai ================= */
  /* Nama pendek untuk chip kalender (PDF) dan nama staf (gambar WA). Gerai
     baru di luar daftar ini tetap tampil, dengan nama dari Master Lokasi. */
  var PENDEK = { 'KIY-GI': 'Kino GI', 'KIY-PIK': 'Kino PIK', T305: 'Alam Sutera', T311: 'Margo City', T390: 'Kota Wisata', T317: 'Artha Gading', 'MAA-SGI': 'Seibu GI', 'MAA-PIM2': 'PIM 2' };
  var NAMA_STAF = { 'KIY-GI': 'Kinokuniya GI', 'KIY-PIK': 'Kinokuniya PIK', T305: 'TK Alam Sutera', T311: 'TK Margo City', T390: 'TK Kota Wisata', T317: 'TK Artha Gading', 'MAA-SGI': 'Seibu GI', 'MAA-PIM2': 'Seibu PIM 2' };
  var AREA = { 'KIY-GI': 'Grand Indonesia, Jakpus', 'MAA-SGI': 'Grand Indonesia, Jakpus', T305: 'Alam Sutera, Tangsel', 'MAA-PIM2': 'Pondok Indah, Jaksel', T311: 'Depok', T390: 'Cibubur', T317: 'Artha Gading, Jakut', 'KIY-PIK': 'PIK, Jakut' };
  var WARNA_RETAILER = { KIY: ['#D5EFE1', '#2F6B52'], TGI: ['#FFE3CC', '#9A4A1C'], MAA: ['#FBDCDC', '#A2404F'] };
  var WARNA_LAIN = [['#DCEAF7', '#2E5C80'], ['#FBF0CC', '#7A5A12'], ['#E6E0F5', '#5B4A8B']];
  function pendek(g) { if (PENDEK[g.kode]) return PENDEK[g.kode]; var w = judul(g.nama).split(' '); return w.slice(-2).join(' '); }
  function namaStaf(g) { return NAMA_STAF[g.kode] || judul(g.nama); }
  function warnaGerai(g) { return WARNA_RETAILER[g.retailer] || WARNA_LAIN[0]; }

  /* ================= hitungan murni (diuji di Node) ================= */
  function salin(isi) { var o = {}; Object.keys(isi || {}).forEach(function (t) { if ((isi[t] || []).length) o[t] = isi[t].slice(); }); return o; }
  function tanggalGerai(isi, kode) { var o = []; Object.keys(isi || {}).forEach(function (t) { if ((isi[t] || []).indexOf(kode) > -1) o.push(t); }); return o.sort(); }
  function hariTetap(tgl) { if (!tgl.length) return -1; var h = hariKe(tgl[0]); for (var i = 1; i < tgl.length; i++) if (hariKe(tgl[i]) !== h) return -1; return h; }
  function hariUtama(tgl) { var c = {}, best = -1, n = 0; tgl.forEach(function (t) { var h = hariKe(t); c[h] = (c[h] || 0) + 1; if (c[h] > n) { n = c[h]; best = h; } }); return best; }
  /* Pola hari Master Lokasi jadi tanggal satu bulan */
  function dariPola(gerai, b) {
    var o = {}, n = jumlahHari(b);
    for (var d = 1; d <= n; d++) {
      var t = tglBulan(b, d), h = HARI[hariKe(t)].toLowerCase();
      gerai.forEach(function (g) { if (String(g.hari || '').trim().toLowerCase() === h) { o[t] = o[t] || []; o[t].push(g.kode); } });
    }
    return o;
  }
  /* Salin bulan lalu: tiap gerai mengikuti hari yang paling sering dipakainya
     bulan lalu. Pekan pertama yang dikosongkan bulan lalu tidak ikut tersalin. */
  function dariBulanLalu(gerai, jadwalLalu, b) {
    var o = {}, n = jumlahHari(b);
    gerai.forEach(function (g) {
      var h = hariUtama(tanggalGerai(jadwalLalu, g.kode)); if (h < 0) return;
      for (var d = 1; d <= n; d++) { var t = tglBulan(b, d); if (hariKe(t) === h) { o[t] = o[t] || []; o[t].push(g.kode); } }
    });
    return o;
  }
  function periksa(isi, gerai, b, info) {
    info = info || {};
    var hasil = [], n = jumlahHari(b), nama = {}; gerai.forEach(function (g) { nama[g.kode] = namaStaf(g); });
    var total = 0, akhirPekan = [], padat = [];
    Object.keys(isi).forEach(function (t) { var a = isi[t] || []; total += a.length; if (!a.length) return; var h = hariKe(t); if (h === 0 || h === 6) akhirPekan.push(t); if (a.length > 2) padat.push(t); });
    hasil.push(akhirPekan.length ? { ok: false, k: 'akhirPekan', teks: id() ? akhirPekan.length + ' tanggal Sabtu/Minggu terisi (' + akhirPekan.map(function (t) { return +t.slice(8, 10); }).join(', ') + '). Gerai mitra keberatan dikunjungi akhir pekan.' : akhirPekan.length + ' Saturday/Sunday date(s) are filled. Partner stores object to weekend visits.' }
      : { ok: true, k: 'akhirPekan', teks: id() ? 'Tidak ada kunjungan Sabtu dan Minggu.' : 'No Saturday or Sunday visits.' });
    /* pekan yang dihitung: pekan dengan sedikitnya 3 hari kerja di bulan ini */
    var pekan = {};
    for (var d = 1; d <= n; d++) { var t = tglBulan(b, d), h = hariKe(t); if (h >= 1 && h <= 5) { var s = seninDari(t); pekan[s] = (pekan[s] || 0) + 1; } }
    var pekanWajib = Object.keys(pekan).filter(function (s) { return pekan[s] >= 3; }).sort();
    var bolong = [], dobel = [], kosong = [];
    gerai.forEach(function (g) {
      var tg = tanggalGerai(isi, g.kode);
      if (!tg.length) { kosong.push(nama[g.kode]); return; }
      var per = {}; tg.forEach(function (t) { var s = seninDari(t); per[s] = (per[s] || 0) + 1; });
      if (pekanWajib.some(function (s) { return !per[s]; })) bolong.push(nama[g.kode]);
      if (Object.keys(per).some(function (s) { return per[s] > 1; })) dobel.push(nama[g.kode]);
    });
    var daftar = function (a) { return a.slice(0, 3).join(', ') + (a.length > 3 ? (id() ? ', dan ' + (a.length - 3) + ' lainnya' : ' and ' + (a.length - 3) + ' more') : ''); };
    hasil.push(kosong.length ? { ok: false, k: 'kosong', teks: (id() ? 'Tanpa kunjungan sebulan: ' : 'No visit all month: ') + daftar(kosong) + '.' } : { ok: true, k: 'kosong', teks: id() ? 'Semua gerai punya jadwal bulan ini.' : 'Every store has visits this month.' });
    hasil.push(bolong.length ? { ok: false, k: 'bolong', teks: (id() ? 'Ada pekan tanpa kunjungan: ' : 'A week without a visit: ') + daftar(bolong) + '.' } : { ok: true, k: 'bolong', teks: id() ? 'Tiap gerai dikunjungi tiap pekan.' : 'Every store is visited every week.' });
    hasil.push(dobel.length ? { ok: false, k: 'dobel', teks: (id() ? 'Dua kali dalam sepekan: ' : 'Twice in one week: ') + daftar(dobel) + (id() ? '. Check-in kedua di pekan yang sama akan ditolak.' : '. The second check-in that week will be refused.') } : { ok: true, k: 'dobel', teks: id() ? 'Tidak ada gerai yang dikunjungi dua kali dalam sepekan.' : 'No store twice in one week.' });
    hasil.push(padat.length ? { ok: false, k: 'padat', teks: id() ? padat.length + ' hari berisi lebih dari 2 gerai.' : padat.length + ' day(s) with more than 2 stores.' } : { ok: true, k: 'padat', teks: id() ? 'Paling banyak 2 gerai per hari.' : 'At most 2 stores per day.' });
    var libur = (info.libur || []), kenaLibur = libur.filter(function (l) { return (isi[l.tgl] || []).length; });
    if (kenaLibur.length) hasil.push({ ok: false, k: 'libur', teks: (id() ? 'Ada kunjungan di tanggal merah: ' : 'Visits on a public holiday: ') + kenaLibur.map(function (l) { return +l.tgl.slice(8, 10) + ' ' + (l.nama || ''); }).join(', ') + '.' });
    else if (!info.liburTercatat) hasil.push({ ok: false, k: 'libur', teks: id() ? 'Lembar Hari Libur belum memuat tanggal merah ' + b.slice(0, 4) + '. Periksa tanggal merah sendiri.' : 'The Hari Libur sheet has no ' + b.slice(0, 4) + ' holidays yet. Check public holidays yourself.' });
    else hasil.push({ ok: true, k: 'libur', teks: libur.length ? (id() ? 'Tanggal merah bulan ini kosong dari kunjungan: ' : 'Holidays this month are free of visits: ') + libur.map(function (l) { return +l.tgl.slice(8, 10) + ' ' + l.nama; }).join(', ') + '.' : (id() ? 'Tidak ada tanggal merah di ' + namaBulan(b) + '.' : 'No public holiday in ' + namaBulan(b, true) + '.') });
    var tanpa = [];
    if (info.kontak) { var pk = {}; info.kontak.forEach(function (k) { k.gerai.forEach(function (g) { pk[g] = 1; }); }); gerai.forEach(function (g) { if (!pk[g.kode] && tanggalGerai(isi, g.kode).length) tanpa.push(nama[g.kode]); }); }
    if (tanpa.length) hasil.push({ ok: false, k: 'kontak', teks: (id() ? 'Belum ada di Kontak Mitra, tidak dibuatkan draf: ' : 'Not in Partner contacts, no draft: ') + tanpa.join(', ') + '.' });
    (info.geser || []).forEach(function (x) { hasil.push({ ok: false, k: 'geser', teks: (id() ? 'Pergeseran tercatat tetap berlaku di atas jadwal ini: ' : 'A recorded shift still overrides this schedule: ') + (nama[x.gerai] || x.gerai) + ' ' + (+x.lama.slice(8, 10)) + ' ' + (id() ? 'ke' : 'to') + ' ' + (+x.baru.slice(8, 10)) + (x.alasan ? ' (' + x.alasan + ')' : '') + '.' }); });
    return { cek: hasil, total: total, akhirPekan: akhirPekan.length };
  }
  /* Penerima yang dibuatkan PDF: tiap baris Kontak Mitra yang gerainya punya
     kunjungan, dengan gerai di dalamnya diurutkan seperti Master Lokasi. */
  function kelompok(isi, gerai, kontak) {
    var urut = {}; gerai.forEach(function (g, i) { urut[g.kode] = i; });
    var gk = {}; gerai.forEach(function (g) { gk[g.kode] = g; });
    return (kontak || []).map(function (k) {
      var gs = k.gerai.filter(function (g) { return gk[g] && tanggalGerai(isi, g).length; }).sort(function (a, b) { return urut[a] - urut[b]; });
      return { k: k, gerai: gs.map(function (g) { return gk[g]; }) };
    }).filter(function (x) { return x.gerai.length; });
  }
  function berubah(lama, baru, kodeGerai) { return kodeGerai.filter(function (g) { return tanggalGerai(lama, g).join() !== tanggalGerai(baru, g).join(); }); }
  function sama(a, b) {
    var ka = Object.keys(a || {}).filter(function (t) { return (a[t] || []).length; }).sort(), kb = Object.keys(b || {}).filter(function (t) { return (b[t] || []).length; }).sort();
    if (ka.join() !== kb.join()) return false;
    for (var i = 0; i < ka.length; i++) if (a[ka[i]].slice().sort().join() !== b[ka[i]].slice().sort().join()) return false;
    return true;
  }
  function namaBerkas(k, b, pic) { return 'Jadwal_' + (pic.nama || 'Operational PIC') + '_' + BULAN[+b.slice(5, 7) - 1] + '_' + b.slice(0, 4) + '_' + String(k.penerima).replace(/[\\\/:*?"<>|]+/g, ' ').trim() + '.pdf'; }
  /* Keterangan baris tabel PDF: hari bulan ini dibanding bulan lalu */
  function keterangan(kode, isi, lalu) {
    var h = hariTetap(tanggalGerai(isi, kode)), hl = hariUtama(tanggalGerai(lalu || {}, kode));
    if (h < 0) return 'Hari beragam, lihat kalender';
    if (hl < 0) return 'Hari ' + HARI[h];
    return hl === h ? 'Tetap hari ' + HARI[h] : 'Berubah dari ' + HARI[hl] + ' menjadi ' + HARI[h];
  }

  /* ================= pustaka dan gambar ================= */
  var janjiPdf = null;
  function muatJsPdf() {
    if (W.jspdf && W.jspdf.jsPDF) return Promise.resolve(W.jspdf.jsPDF);
    if (janjiPdf) return janjiPdf;
    janjiPdf = new Promise(function (ok, gagal) {
      var s = W.document.createElement('script'); s.src = 'vendor/jspdf.umd.min.js'; s.async = true;
      s.onload = function () { W.jspdf && W.jspdf.jsPDF ? ok(W.jspdf.jsPDF) : gagal(new Error('pustaka')); };
      s.onerror = function () { janjiPdf = null; gagal(new Error('pustaka')); };
      W.document.head.appendChild(s);
    });
    return janjiPdf;
  }
  var gambarSiap = {};
  function muatGambar(src) {
    if (gambarSiap[src]) return gambarSiap[src];
    gambarSiap[src] = new Promise(function (ok) {
      var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src;
    });
    return gambarSiap[src];
  }
  function dataUrl(im, mime) { if (!im) return null; try { var c = W.document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; var x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0); return c.toDataURL(mime || 'image/jpeg', 0.9); } catch (e) { return null; } }

  /* ================= PDF mitra (A4, template 11 Okt) ================= */
  function buatPdf(JsPDF, logo, D, kel, isi, opsi) {
    var b = D.bulan, k = kel.k, gs = kel.gerai, pic = D.pic || {};
    var doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
    var L = 15, R = 195, Wd = R - L;
    var INK = '#3F2C20', MUT = '#7E6656', ACC = '#A9501C', SOFT = '#FCF1E4', LINE = '#E9CBA8', WE = '#F3ECE4', CELL = '#FBF6F0', TUA = '#5C4636';
    var warna = {}; var dipakai = {};
    gs.forEach(function (g, i) { var w = warnaGerai(g); var kunci = w.join(); if (dipakai[kunci]) w = WARNA_LAIN[(dipakai[kunci] - 1) % WARNA_LAIN.length]; dipakai[kunci] = (dipakai[kunci] || 0) + 1; warna[g.kode] = w; });
    var isiDok = {}; gs.forEach(function (g) { tanggalGerai(isi, g.kode).forEach(function (t) { isiDok[t] = isiDok[t] || []; isiDok[t].push(g.kode); }); });
    var fill = function (c) { doc.setFillColor(c); }, teks = function (c) { doc.setTextColor(c); };
    var huruf = function (gaya, uk) { doc.setFont('helvetica', gaya); doc.setFontSize(uk); };
    var lebar = function (s) { return doc.getTextWidth(s); };
    doc.setProperties({ title: 'Jadwal Kunjungan Operational PIC Mofmofriends ' + namaBulan(b) + ', ' + k.namaSurat, author: 'Mofmofriends, Business Operations' });
    /* kop */
    var top = 10, mh = 17, mw = mh * 223 / 250;
    if (logo.mof) doc.addImage(logo.mof, 'JPEG', L, top, mw, mh);
    var tx = L + mw + 3.5;
    huruf('bold', 20); teks(INK); doc.text('Mofmofriends', tx, top + 8.6);
    huruf('bold', 8.5); teks(MUT); doc.text('Business Operations  ·  One Logistics Solutions', tx, top + 13.6);
    var oh = 10, ow = oh * 755 / 285;
    if (logo.ols) doc.addImage(logo.ols, 'JPEG', R - ow, top, ow, oh);
    huruf('bold', 8); teks(MUT);
    doc.text('Diterbitkan ' + tglPanjang(opsi.hariIni), R, top + 14, { align: 'right' });
    doc.text('Periode ' + namaBulan(b) + (opsi.versi > 1 ? '  ·  versi ' + opsi.versi : ''), R, top + 17.8, { align: 'right' });
    var y = top + 20.5; fill(ACC); doc.rect(L, y - 1.1, Wd, 1.1, 'F');
    y += 9; huruf('bold', 17); teks(INK); doc.text('Jadwal Kunjungan Operational PIC', L, y);
    var adaAkhirPekan = Object.keys(isiDok).some(function (t) { var h = hariKe(t); return h === 0 || h === 6; });
    y += 6; huruf('normal', 9.5); teks(TUA);
    var pembuka = 'Untuk ' + k.namaSurat + '.' + (adaAkhirPekan ? '' : ' Seluruh kunjungan dilaksanakan pada hari kerja, Senin sampai Jumat. Tidak ada kunjungan pada hari Sabtu dan Minggu.');
    doc.splitTextToSize(pembuka, Wd).forEach(function (ln) { doc.text(ln, L, y); y += 4.6; });
    /* kotak info */
    y += 1; var jml = 0; Object.keys(isiDok).forEach(function (t) { jml += isiDok[t].length; });
    var info = [['OPERATIONAL PIC', pic.nama || '-'], ['KONTAK', pic.kontak || '-'], ['JENDELA KEDATANGAN', '13.00 hingga 20.00 WIB'], ['PERIODE', namaBulan(b) + '\n' + jml + ' kunjungan']];
    var gw = (Wd - 3 * 2.5) / 4, bh = 15;
    info.forEach(function (x, i) {
      var bx = L + i * (gw + 2.5); fill(SOFT); doc.roundedRect(bx, y, gw, bh, 2.5, 2.5, 'F');
      huruf('bold', 7); teks(MUT); doc.text(x[0], bx + 3, y + 5);
      huruf('bold', 9); teks(INK); var yy = y + 9.6; doc.splitTextToSize(x[1], gw - 6).forEach(function (ln) { doc.text(ln, bx + 3, yy); yy += 4; });
    });
    y += bh + 7;
    /* tabel */
    var kol = [['STORE', 0], ['HARI', 62], ['TANGGAL ' + BULAN[+b.slice(5, 7) - 1].toUpperCase(), 84], ['KETERANGAN', 124]];
    huruf('bold', 7); teks(MUT); kol.forEach(function (c) { doc.text(c[0], L + c[1] + 1.5, y); });
    y += 2.5; doc.setDrawColor(LINE); doc.setLineWidth(0.5); doc.line(L, y, R, y);
    gs.forEach(function (g) {
      var nm = judul(g.nama), w = warna[g.kode], tg = tanggalGerai(isi, g.kode), h = hariTetap(tg);
      huruf('bold', 9); var baris = doc.splitTextToSize(nm, 58);
      var tglTeks = daftarTanggal(tg, b).replace(' ' + namaBulan(b), '');
      var tl = doc.splitTextToSize(tglTeks, 38);
      huruf('normal', 9); var kl = doc.splitTextToSize(keterangan(g.kode, isi, opsi.lalu), Wd - 125);
      var rh = Math.max(baris.length, kl.length, tl.length) * 4.4 + 4;
      huruf('bold', 9); var pw = Math.max.apply(null, baris.map(lebar)) + 4, ph = baris.length * 4.4 + 1.6;
      fill(w[0]); doc.roundedRect(L + 1, y + 1.3, pw, ph, 1.5, 1.5, 'F');
      teks(w[1]); var yy = y + 5; baris.forEach(function (ln) { doc.text(ln, L + 3, yy); yy += 4.4; });
      teks(INK); doc.text(h >= 0 ? HARI[h] : 'Beragam', L + 63.5, y + 5);
      yy = y + 5; tl.forEach(function (ln) { doc.text(ln, L + 85.5, yy); yy += 4.4; });
      huruf('normal', 9); teks(TUA); yy = y + 5; kl.forEach(function (ln) { doc.text(ln, L + 125.5, yy); yy += 4.4; });
      y += rh; doc.setDrawColor('#F1E4D3'); doc.setLineWidth(0.3); doc.line(L, y, R, y);
    });
    /* kalender */
    y += 9; huruf('bold', 13); teks(INK); doc.text('Kalender ' + namaBulan(b), L, y);
    var n = jumlahHari(b), kolom1 = (hariKe(tglBulan(b, 1)) + 6) % 7, barisKal = Math.ceil((kolom1 + n) / 7);
    var cw = (Wd - 6 * 1.5) / 7, ch = barisKal > 5 ? 12 : 14, yh = y + 5.5;
    huruf('bold', 8); teks(MUT);
    ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].forEach(function (hn, i) { doc.text(hn, L + i * (cw + 1.5) + cw / 2, yh, { align: 'center' }); });
    var libur = {}; (D.libur || []).forEach(function (l) { libur[l.tgl] = l.nama; });
    var bawah = yh;
    for (var d = 1; d <= n; d++) {
      var t = tglBulan(b, d), col = (kolom1 + d - 1) % 7, row = Math.floor((kolom1 + d - 1) / 7);
      var cx = L + col * (cw + 1.5), cy = yh + 2 + row * (ch + 1.5);
      var tags = isiDok[t] || [];
      fill(col > 4 || libur[t] ? WE : CELL); doc.roundedRect(cx, cy, cw, ch, 1.5, 1.5, 'F');
      huruf('bold', 10); teks(tags.length ? INK : (col > 4 ? '#BBA898' : '#9C8676')); doc.text(String(d), cx + 2, cy + 4.6);
      if (libur[t] && !tags.length) { huruf('bold', 6); teks('#A2404F'); doc.text('Libur', cx + cw - 2, cy + 4.4, { align: 'right' }); }
      tags.forEach(function (kd, ti) {
        var g = gs.filter(function (x) { return x.kode === kd; })[0], w = warna[kd], lab = pendek(g);
        huruf('bold', 7.5); var tw = Math.min(lebar(lab) + 3, cw - 3);
        var ty = cy + ch - 1.5 - 4 - ti * 4.6;
        fill(w[0]); doc.roundedRect(cx + 1.5, ty, tw, 4, 1, 1, 'F'); teks(w[1]); doc.text(lab, cx + 3, ty + 2.9);
      });
      bawah = Math.max(bawah, cy + ch);
    }
    y = bawah + 6;
    /* legenda */
    var x = L; huruf('bold', 7.5);
    gs.forEach(function (g) {
      var w = warna[g.kode], nm = judul(g.nama);
      fill(w[0]); doc.setDrawColor(w[1]); doc.setLineWidth(0.3); doc.roundedRect(x, y - 2.6, 3, 3, 0.7, 0.7, 'FD');
      teks(TUA); doc.text(nm, x + 4.2, y); x += lebar(nm) + 10;
      if (x > R - 40) { x = L; y += 5; }
    });
    fill(WE); doc.roundedRect(x, y - 2.6, 3, 3, 0.7, 0.7, 'F'); teks(TUA); doc.text(adaAkhirPekan ? 'Sabtu dan Minggu' : 'Sabtu dan Minggu, tanpa kunjungan', x + 4.2, y);
    /* catatan */
    y += 6;
    var depan = String(pic.nama || 'Operational PIC').split(' ')[0];
    var cat = [];
    gs.forEach(function (g) { var ket = keterangan(g.kode, isi, opsi.lalu); if (/^Berubah/.test(ket)) cat.push('Kunjungan ' + judul(g.nama) + ' ' + ket.charAt(0).toLowerCase() + ket.slice(1) + ' mulai ' + namaBulan(b) + '.'); });
    (D.libur || []).forEach(function (l) { var h = hariKe(l.tgl); if (h >= 1 && h <= 5 && !(isiDok[l.tgl] || []).length) cat.push('Tidak ada kunjungan pada ' + tglPanjang(l.tgl) + (l.nama ? ' (' + l.nama + ')' : '') + '.'); });
    cat.push('Jam 13.00 hingga 20.00 WIB adalah jendela kedatangan, bukan durasi kunjungan. Durasi di lokasi menyesuaikan kondisi stok dan penataan display.');
    cat.push('Lingkup pekerjaan: melapor dan berkoordinasi dengan staf atau store manager, menghitung dan mencocokkan stok Mofmofriends, serta merapikan display di rak maupun area simpan.');
    cat.push('Kehadiran dan kepulangan tercatat secara elektronik di sistem kami. Sdr. ' + depan + ' melapor kepada petugas store saat tiba dan sebelum meninggalkan store.');
    cat.push('Apabila terdapat perubahan jadwal atau Operational PIC berhalangan hadir, kami akan menginformasikannya sebelum tanggal kunjungan.');
    huruf('normal', 8.5);
    var bungkus = cat.map(function (c) { return doc.splitTextToSize(c, Wd - 12); });
    var tinggi = bungkus.reduce(function (a, l) { return a + l.length * 4.2 + 1.2; }, 0) + 6;
    fill(SOFT); doc.roundedRect(L, y, Wd, tinggi, 2.5, 2.5, 'F');
    var yy2 = y + 5.5;
    bungkus.forEach(function (ls) { fill('#4A3426'); doc.circle(L + 5, yy2 - 1.1, 0.55, 'F'); teks('#4A3426'); ls.forEach(function (ln) { doc.text(ln, L + 8, yy2); yy2 += 4.2; }); yy2 += 1.2; });
    /* kaki */
    var fy = 285; doc.setDrawColor(LINE); doc.setLineWidth(0.3); doc.line(L, fy - 7, R, fy - 7);
    huruf('bold', 7.5); teks(MUT);
    doc.text((pic.penanda || 'Ferdy Febrian Iskandar') + '  ·  ' + (pic.jabatan || 'Business Operations') + ', Mofmofriends', L, fy - 3);
    if (pic.email) doc.text(pic.email, L, fy + 0.6);
    doc.text('Dokumen ini hanya memuat jadwal store ' + k.penerima + '.', R, fy + 0.6, { align: 'right' });
    return { doc: doc, muat: y + tinggi < fy - 9 };
  }

  /* ================= gambar staf (PNG/JPG untuk WA) ================= */
  function bungkusKanvas(x, s, maks) {
    var kata = String(s).split(' '), out = [], kini = '';
    kata.forEach(function (w) { var t = kini ? kini + ' ' + w : w; if (x.measureText(t).width <= maks || !kini) kini = t; else { out.push(kini); kini = w; } });
    if (kini) out.push(kini);
    return out;
  }
  function kotakBulat(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function gambarStaf(cv, shiba, D, isi) {
    var b = D.bulan, gerai = D.gerai, pic = D.pic || {}, gk = {}; gerai.forEach(function (g) { gk[g.kode] = g; });
    var Wc = 1080, P = 40, x = cv.getContext('2d');
    var FJ = "'Baloo 2', Nunito, Arial, sans-serif", FB = "Nunito, 'Helvetica Neue', Arial, sans-serif";
    var INK = '#4A3426', MUT = '#7E6656', KARTU = '#FFFFFF', JAHIT = '#E9CBA8', SEL = '#FCF1E4', LIBUR = '#F1E6DA';
    var n = jumlahHari(b), kolom1 = (hariKe(tglBulan(b, 1)) + 6) % 7, minggu = [];
    for (var d = 1; d <= n; d++) { var t = tglBulan(b, d), c = (kolom1 + d - 1) % 7, r = Math.floor((kolom1 + d - 1) / 7); minggu[r] = minggu[r] || [null, null, null, null, null, [], []]; if (c < 5) minggu[r][c] = t; else minggu[r][c].push(t); }
    var libur = {}; (D.libur || []).forEach(function (l) { libur[l.tgl] = l.nama; });
    var adaAkhirPekan = Object.keys(isi).some(function (t) { var h = hariKe(t); return (h === 0 || h === 6) && isi[t].length; });
    var gridX = P + 32, gridW = Wc - 2 * P - 64, gap = 10, wkW = 92, dayW = (gridW - wkW - 5 * gap) / 5;
    /* ukur tinggi baris kalender lebih dulu */
    x.font = '800 17px ' + FB;
    var tinggiBaris = minggu.map(function (w) {
      var hmax = 0;
      for (var i = 0; i < 5; i++) { var t2 = w[i]; if (!t2) continue; var h = 48; (isi[t2] || []).forEach(function (kd) { h += bungkusKanvas(x, namaStaf(gk[kd] || { kode: kd, nama: kd }), dayW - 30).length * 21 + 18; }); if (libur[t2]) h += 26; hmax = Math.max(hmax, h); }
      var akhir = (w[5] || []).concat(w[6] || []), hW = 70; akhir.forEach(function (t3) { (isi[t3] || []).forEach(function () { hW += 40; }); });
      return Math.max(hmax, hW, 110);
    });
    var tinggiKal = 70 + 40 + tinggiBaris.reduce(function (a, h) { return a + h + gap; }, 0) + 88;
    /* pola tiap minggu */
    var pola = [1, 2, 3, 4, 5].map(function (h) { return { h: h, g: gerai.filter(function (g) { var tg = tanggalGerai(isi, g.kode); return tg.length && hariTetap(tg) === h; }) }; }).filter(function (p) { return p.g.length; });
    var beragam = gerai.filter(function (g) { var tg = tanggalGerai(isi, g.kode); return tg.length && hariTetap(tg) < 0; });
    var tinggiPola = 70 + 50 + pola.length * 68 + (beragam.length ? 60 : 0) + 20;
    var ingat = ['Datang antara jam 13.00 sampai 20.00 (itu jam datang, bukan lama kunjungan).', 'Lapor ke staf toko waktu datang dan sebelum pulang.', 'Check-in di aplikasi (selfie + lokasi), opname, foto rak, baru check-out.', 'Aplikasi cuma buka check-in di tanggal yang ada di jadwal ini.', 'Berhalangan atau perlu geser hari? Kabari kantor dulu, jangan langsung ke toko.'];
    x.font = '700 21px ' + FB;
    var ingatBaris = ingat.map(function (s) { return bungkusKanvas(x, s, Wc - 2 * P - 110); });
    var tinggiIngat = 70 + 40 + ingatBaris.reduce(function (a, l) { return a + l.length * 31 + 6; }, 0) + 30;
    var H = 210 + tinggiKal + 28 + tinggiPola + 28 + tinggiIngat + 50;
    cv.width = Wc; cv.height = Math.ceil(H);
    x = cv.getContext('2d');
    x.fillStyle = '#FFF8EF'; x.fillRect(0, 0, Wc, H);
    /* kepala */
    x.fillStyle = '#FFE3CC'; x.beginPath(); x.arc(P + 52, 112, 52, 0, Math.PI * 2); x.fill();
    if (shiba) { var sk = Math.min(96 / shiba.naturalWidth, 96 / shiba.naturalHeight); x.drawImage(shiba, P + 52 - shiba.naturalWidth * sk / 2, 112 - shiba.naturalHeight * sk / 2, shiba.naturalWidth * sk, shiba.naturalHeight * sk); }
    x.fillStyle = MUT; x.font = '800 22px ' + FB; x.fillText('Jadwal kunjungan Operational PIC · ' + (pic.nama || ''), P + 126, 66);
    x.fillStyle = INK; x.font = '800 60px ' + FJ; x.fillText(namaBulan(b), P + 126, 128);
    var chip = function (teksC, X, Y, bg, fg) { x.font = '800 22px ' + FB; var w = x.measureText(teksC).width + 28; x.fillStyle = bg; kotakBulat(x, X, Y, w, 38, 19); x.fill(); x.fillStyle = fg; x.fillText(teksC, X + 14, Y + 27); return X + w + 10; };
    var cxp = P + 126;
    if (!adaAkhirPekan) { cxp = chip('Senin sampai Jumat', cxp, 146, '#D5EFE1', '#2F6B52'); chip('Sabtu & Minggu libur', cxp, 146, '#FBDCDC', '#A2404F'); }
    else chip('Ada kunjungan akhir pekan, cek kalender', cxp, 146, '#FBF0CC', '#7A5A12');
    var kartu = function (Y, h, judulK) {
      x.fillStyle = KARTU; kotakBulat(x, P, Y, Wc - 2 * P, h, 28); x.fill();
      x.save(); x.setLineDash([8, 6]); x.strokeStyle = JAHIT; x.lineWidth = 2.5; kotakBulat(x, P + 8, Y + 8, Wc - 2 * P - 16, h - 16, 22); x.stroke(); x.restore();
      x.fillStyle = INK; x.font = '800 32px ' + FJ; x.fillText(judulK, P + 32, Y + 62);
    };
    /* kartu kalender */
    var Y0 = 210; kartu(Y0, tinggiKal, 'Kalender ' + BULAN[+b.slice(5, 7) - 1]);
    x.font = '800 20px ' + FB; x.fillStyle = MUT; x.textAlign = 'center';
    ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].forEach(function (hn, i) { x.fillText(hn, gridX + i * (dayW + gap) + dayW / 2, Y0 + 112); });
    x.fillText('Sab, Min', gridX + 5 * (dayW + gap) + wkW / 2, Y0 + 112); x.textAlign = 'left';
    var yy = Y0 + 130;
    minggu.forEach(function (w, ri) {
      var h = tinggiBaris[ri];
      for (var i = 0; i < 5; i++) {
        var t4 = w[i]; if (!t4) continue;
        var X = gridX + i * (dayW + gap);
        x.fillStyle = libur[t4] ? LIBUR : SEL; kotakBulat(x, X, yy, dayW, h, 16); x.fill();
        x.fillStyle = INK; x.font = '800 30px ' + FJ; x.fillText(String(+t4.slice(8, 10)), X + 12, yy + 38);
        var cy2 = yy + 52;
        if (libur[t4]) { x.fillStyle = '#A2404F'; x.font = '800 15px ' + FB; x.fillText('Libur nasional', X + 12, cy2 + 6); cy2 += 26; }
        (isi[t4] || []).forEach(function (kd) {
          var g = gk[kd] || { kode: kd, nama: kd }, wg = warnaGerai(g); x.font = '800 17px ' + FB;
          var ls = bungkusKanvas(x, namaStaf(g), dayW - 30), ch2 = ls.length * 21 + 10;
          x.fillStyle = wg[0]; kotakBulat(x, X + 9, cy2, dayW - 18, ch2, 9); x.fill(); x.fillStyle = wg[1];
          ls.forEach(function (ln, li) { x.fillText(ln, X + 17, cy2 + 21 + li * 21); }); cy2 += ch2 + 8;
        });
      }
      var akhir = (w[5] || []).concat(w[6] || []);
      if (akhir.length) {
        var XW = gridX + 5 * (dayW + gap), isiAkhir = akhir.filter(function (t5) { return (isi[t5] || []).length; });
        x.fillStyle = isiAkhir.length ? '#FBF0CC' : LIBUR; kotakBulat(x, XW, yy, wkW, h, 16); x.fill();
        x.textAlign = 'center'; x.fillStyle = MUT; x.font = '800 20px ' + FB;
        x.fillText(akhir.map(function (t6) { return +t6.slice(8, 10); }).join(' & '), XW + wkW / 2, yy + h / 2 - (isiAkhir.length ? 10 : 2));
        x.font = '700 15px ' + FB; x.fillText(isiAkhir.length ? 'Ada kunjungan' : 'Libur', XW + wkW / 2, yy + h / 2 + 22); x.textAlign = 'left';
      }
      yy += h + gap;
    });
    var tot = 0; Object.keys(isi).forEach(function (t7) { tot += (isi[t7] || []).length; });
    x.fillStyle = MUT; x.font = '700 19px ' + FB;
    x.fillText('Total ' + tot + ' kunjungan.' + ((D.libur || []).length ? ' Tanggal merah: ' + D.libur.map(function (l) { return +l.tgl.slice(8, 10) + ' ' + l.nama; }).join(', ') + '.' : ''), gridX, yy + 26);
    /* kartu pola */
    var Y1 = Y0 + tinggiKal + 28; kartu(Y1, tinggiPola, 'Pola tiap minggu');
    var py = Y1 + 110;
    pola.forEach(function (p, i) {
      x.fillStyle = INK; x.font = '800 24px ' + FB; x.fillText(HARI[p.h], P + 32, py + 8);
      var X = P + 165, area = [];
      p.g.forEach(function (g) { var wg = warnaGerai(g), lab = namaStaf(g); x.font = '800 21px ' + FB; var w2 = x.measureText(lab).width + 24; x.fillStyle = wg[0]; kotakBulat(x, X, py - 22, w2, 38, 10); x.fill(); x.fillStyle = wg[1]; x.fillText(lab, X + 12, py + 4); X += w2 + 9; if (AREA[g.kode] && area.indexOf(AREA[g.kode]) < 0) area.push(AREA[g.kode]); });
      x.fillStyle = MUT; x.font = '700 18px ' + FB; x.fillText(area.join(' lalu '), X + 6, py + 3);
      if (i < pola.length - 1) { x.fillStyle = '#F1E4D3'; x.fillRect(P + 32, py + 30, Wc - 2 * P - 64, 2); }
      py += 68;
    });
    if (beragam.length) { x.fillStyle = MUT; x.font = '700 19px ' + FB; x.fillText('Hari beragam, lihat kalender: ' + beragam.map(namaStaf).join(', ') + '.', P + 32, py + 6); }
    /* kartu ingat */
    var Y2 = Y1 + tinggiPola + 28; kartu(Y2, tinggiIngat, 'Yang perlu diingat');
    var iy = Y2 + 112;
    x.font = '700 21px ' + FB;
    ingatBaris.forEach(function (ls) { x.fillStyle = INK; x.beginPath(); x.arc(P + 44, iy - 7, 4, 0, Math.PI * 2); x.fill(); ls.forEach(function (ln) { x.fillText(ln, P + 62, iy); iy += 31; }); iy += 6; });
    return cv;
  }

  /* ================= teks layar ================= */
  var T = {
    id: { judul: 'Jadwal Operational PIC', sub: 'Susun tanggal kunjungan di sini. Setelah diterbitkan, sistem menulis lembar Jadwal Kunjungan dan menyiapkan draf email per mitra. Gambar untuk staf diunduh lalu dikirim lewat WhatsApp.', tutup: 'Tutup', muat: 'Membaca jadwal dari sistem...', gagal: 'Jadwal belum bisa dibaca.',
      mulai: 'Mulai dari', pola: 'Pola Master Lokasi', lalu: 'Salin bulan lalu', kosong: 'Kosong', lembar: 'Isi lembar', terbit: 'Versi terbit',
      sDraf: 'Draf, belum terbit', sTerbit: function (v, w) { return 'Terbit versi ' + v + ' · ' + w; }, sUbah: 'Diubah, belum terbit', sLembar: 'Dari lembar, belum lewat WMS', sPola: 'Usulan dari pola, belum terbit',
      gerai: 'Gerai', cek: 'Pemeriksaan', berkas: 'Berkas', petunjuk: 'Pilih gerai di kanan, lalu ketuk tanggal untuk menambah. Ketuk lagi untuk membuang. Sabtu, Minggu, dan tanggal merah diberi warna lain, tapi tetap bisa diisi.',
      simpan: 'Simpan draf', tersimpan: 'Draf tersimpan', terbitkan: function (b) { return 'Terbitkan ' + b; }, terbitUlang: 'Terbitkan perubahan',
      ringkas: function (n, g) { return n + ' kunjungan di ' + g + ' gerai.'; }, staf: 'Gambar staf', pdf: 'PDF', semuaPdf: 'Semua PDF',
      yakinJudul: function (b) { return 'Terbitkan ' + b + '?'; }, yakinBaru: function (n, p) { return 'Lembar Jadwal Kunjungan untuk bulan ini diganti dengan ' + n + ' kunjungan di atas, dan ' + p + ' draf Gmail disiapkan. Tidak ada email yang terkirim sendiri.'; },
      yakinUbah: function (p) { return p ? 'Lembar diganti, dan draf perubahan hanya untuk: ' + p + '. Mitra lain tidak dikabari.' : 'Lembar diganti. Tidak ada tanggal mitra yang berubah, jadi tidak ada draf.'; },
      ya: 'Ya, terbitkan', batal: 'Batal', menyiapkan: 'Menyiapkan PDF...', mengirim: 'Menulis lembar dan membuat draf...', gagalPdf: 'PDF tidak bisa dibuat di peramban ini.',
      hasil: 'Hasil terbit', bukaDraf: 'Buka draf di Gmail', galat: 'Gagal', siap: 'Draf siap', balas: 'Balasan di utas', baru: 'Email baru', ulangDraf: 'Buat ulang draf', tanpaKontak: 'Tanpa kontak, tidak ada draf: ',
      kontak: 'Kontak Mitra', kontakSub: 'Satu baris satu surat. MAA dan Kinokuniya satu baris ke HO, Toys Kingdom satu baris per store.', simpanKontak: 'Simpan kontak', tambahBaris: 'Tambah penerima', hapus: 'Hapus',
      kPenerima: 'Penerima (subjek)', kGerai: 'Gerai (kode)', kKepada: 'Kepada', kCc: 'Cc', kSapaan: 'Sapaan', kNama: 'Nama di surat', belumDeploy: 'Fitur ini menyala setelah Apps Script versi baru di-deploy.', bulanSeb: 'Bulan sebelumnya', bulanBer: 'Bulan berikutnya', pergi: 'Ada perubahan yang belum disimpan. Simpan draf dulu atau buang?', buang: 'Buang perubahan' },
    en: { judul: 'Operational PIC schedule', sub: 'Arrange the dates here. After Publish, the system writes the Jadwal Kunjungan sheet and prepares a Gmail draft per partner. The staff image is downloaded and sent over WhatsApp.', tutup: 'Close', muat: 'Reading the schedule...', gagal: 'The schedule could not be read.',
      mulai: 'Start from', pola: 'Location Master pattern', lalu: 'Copy last month', kosong: 'Empty', lembar: 'Sheet rows', terbit: 'Published version',
      sDraf: 'Draft, not published', sTerbit: function (v, w) { return 'Published v' + v + ' · ' + w; }, sUbah: 'Changed, not published', sLembar: 'From the sheet, not via WMS yet', sPola: 'Suggested from the pattern, not published',
      gerai: 'Stores', cek: 'Checks', berkas: 'Files', petunjuk: 'Pick a store on the right, then tap a date to add it. Tap again to remove. Weekends and public holidays are tinted but can still be filled.',
      simpan: 'Save draft', tersimpan: 'Draft saved', terbitkan: function (b) { return 'Publish ' + b; }, terbitUlang: 'Publish changes',
      ringkas: function (n, g) { return n + ' visits across ' + g + ' stores.'; }, staf: 'Staff image', pdf: 'PDF', semuaPdf: 'All PDFs',
      yakinJudul: function (b) { return 'Publish ' + b + '?'; }, yakinBaru: function (n, p) { return 'This month in the Jadwal Kunjungan sheet is replaced by the ' + n + ' visits above, and ' + p + ' Gmail drafts are prepared. Nothing is sent by itself.'; },
      yakinUbah: function (p) { return p ? 'The sheet is replaced, and change drafts go only to: ' + p + '. Other partners are not told.' : 'The sheet is replaced. No partner date changed, so no draft.'; },
      ya: 'Yes, publish', batal: 'Cancel', menyiapkan: 'Preparing PDFs...', mengirim: 'Writing the sheet and creating drafts...', gagalPdf: 'PDFs cannot be made in this browser.',
      hasil: 'Publish result', bukaDraf: 'Open drafts in Gmail', galat: 'Failed', siap: 'Draft ready', balas: 'Reply in thread', baru: 'New email', ulangDraf: 'Recreate draft', tanpaKontak: 'No contact, no draft: ',
      kontak: 'Partner contacts', kontakSub: 'One row is one email. MAA and Kinokuniya go to their head office in one row; Toys Kingdom one row per store.', simpanKontak: 'Save contacts', tambahBaris: 'Add recipient', hapus: 'Remove',
      kPenerima: 'Recipient (subject)', kGerai: 'Stores (codes)', kKepada: 'To', kCc: 'Cc', kSapaan: 'Greeting', kNama: 'Name in letter', belumDeploy: 'This feature turns on after the new Apps Script version is deployed.', bulanSeb: 'Previous month', bulanBer: 'Next month', pergi: 'There are unsaved changes. Save the draft first or discard?', buang: 'Discard changes' }
  };
  function TK(k) { return T[id() ? 'id' : 'en'][k]; }

  /* ================= keadaan ================= */
  var A = { bulan: '', D: null, isi: {}, asal: '', pilih: '', kotor: false, sibuk: false, yakin: false, hasil: null, kontakBuka: false, kontakEdit: null, status: '', tundaBulan: null, dari: null };
  function bulanBawaan() { return geserBulan(bulanIniLokal(), 1); }
  function muat(b) {
    var m = M();
    if (!m.jalan) return Promise.reject(new Error('jalan'));
    return m.jalan('ambilJadwalPic', ['WMS-TIKET', b]).then(function (x) { if (!x || x.ok === false) throw new Error(x && x.pesan || 'data'); return x; });
  }
  function pasangData(D) {
    A.D = D; A.hasil = null; A.yakin = false; A.kotor = false; A.kontakEdit = null;
    if (D.draf && D.draf.isi) { A.isi = salin(D.draf.isi); A.asal = 'draf'; }
    else if (D.terbit && D.terbit.isi) { A.isi = salin(D.terbit.isi); A.asal = 'terbit'; }
    else if (Object.keys(D.jadwal || {}).length) { A.isi = salin(D.jadwal); A.asal = 'lembar'; }
    else { A.isi = dariPola(D.gerai, D.bulan); A.asal = 'pola'; }
    if (!A.pilih || !D.gerai.some(function (g) { return g.kode === A.pilih; })) A.pilih = D.gerai.length ? D.gerai[0].kode : '';
  }

  /* ================= kerangka lembar ================= */
  var IKON_TUTUP = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var IKON_KIRI = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var IKON_KANAN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  function pastikanDom() {
    if (el('jadwalPic')) return el('jadwalPic');
    var d = W.document.createElement('div');
    d.id = 'jadwalPic'; d.className = 'alat-latar jadwal-latar'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="lembar" role="dialog" aria-modal="true" tabindex="-1"><div id="jadwalIsi"></div></div>';
    W.document.body.appendChild(d);
    d.addEventListener('click', klik);
    d.addEventListener('input', function (e) { var t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-kontak-isian') && A.kontakEdit) { var i = +t.getAttribute('data-baris'), f = t.getAttribute('data-kontak-isian'); A.kontakEdit[i][f] = t.value; } });
    W.document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('buka')) { e.preventDefault(); if (A.yakin) { A.yakin = false; gambarIsi(); } else tutup(); } });
    return d;
  }
  function buka() {
    var d = pastikanDom();
    if (!d.classList.contains('buka')) A.dari = W.document.activeElement;
    d.classList.add('buka'); d.setAttribute('aria-hidden', 'false'); W.document.body.classList.add('alat-terbuka');
    d.querySelector('.lembar').setAttribute('aria-label', TK('judul'));
    bunyi('klik');
    if (!A.bulan) A.bulan = bulanBawaan();
    gambar(A.D && A.D.bulan === A.bulan && !A.kotor ? false : true);
  }
  function tutup() {
    var d = el('jadwalPic'); if (!d) return;
    d.classList.remove('buka'); d.setAttribute('aria-hidden', 'true'); W.document.body.classList.remove('alat-terbuka');
    try { if (A.dari && A.dari.focus) A.dari.focus(); } catch (e) {}
  }
  function gambar(baca) {
    var isi = el('jadwalIsi'); if (!isi) return;
    isi.innerHTML = '<div class="kepala-alat jp-kepala"><div class="lp-judul"><h2>' + esc(TK('judul')) + '</h2><small>' + esc(TK('sub')) + '</small></div>' +
      '<button type="button" class="tutup-alat" data-jadwal="tutup" aria-label="' + esc(TK('tutup')) + '" title="' + esc(TK('tutup')) + '">' + IKON_TUTUP + '</button></div><div id="jadwalBadan"><p class="ket-alat">' + esc(TK('muat')) + '</p></div>';
    if (!baca && A.D) { gambarIsi(); return; }
    var b = A.bulan;
    muat(b).then(function (D) { if (A.bulan !== b) return; pasangData(D); gambarIsi(); }, function (e) {
      var w = el('jadwalBadan'); if (!w) return;
      var s = String(e && e.message || e), belum = /ambilJadwalPic|deploy/i.test(s);
      w.innerHTML = '<div class="tolak-alat" role="alert">' + esc(belum ? TK('belumDeploy') : TK('gagal') + ' ' + s) + ' <button type="button" class="btn dua" data-jadwal="ulang">↻</button></div>';
    });
  }

  /* ================= gambar isi ================= */
  function statusTeks() {
    var D = A.D;
    if (A.kotor) return [TK('sUbah'), 'kuning'];
    if (A.asal === 'draf') return [TK('sDraf'), 'kuning'];
    if (A.asal === 'terbit') return [TK('sTerbit')(D.terbit.versi, D.terbit.waktu), 'mint'];
    if (A.asal === 'lembar') return [TK('sLembar'), 'kuning'];
    return [TK('sPola'), 'kuning'];
  }
  function gambarIsi() {
    var w = el('jadwalBadan'), D = A.D; if (!w || !D) return;
    var b = D.bulan, gerai = D.gerai, gk = {}; gerai.forEach(function (g) { gk[g.kode] = g; });
    var P = periksa(A.isi, gerai, b, { libur: D.libur, liburTercatat: D.liburTercatat, kontak: D.kontak, geser: D.geser });
    var st = statusTeks();
    var html = '<div class="jp-atur"><div class="jp-bulan"><button type="button" class="jp-panah" data-jadwal="bulanSeb" aria-label="' + esc(TK('bulanSeb')) + '">' + IKON_KIRI + '</button><b>' + esc(namaBulan(b, !id())) + '</b><button type="button" class="jp-panah" data-jadwal="bulanBer" aria-label="' + esc(TK('bulanBer')) + '">' + IKON_KANAN + '</button></div>' +
      '<span class="jp-status ' + st[1] + '">' + esc(st[0]) + '</span>' + (W.WmsRute ? '<button type="button" class="btn dua kn-kecil jp-rute" data-rute-buka="1">' + esc(W.WmsRute.judulTombol()) + '</button>' : '') + '<span class="jp-renggang"></span><span class="lp-label">' + esc(TK('mulai')) + '</span>' +
      [['pola', TK('pola')], ['lalu', TK('lalu')], ['kosong', TK('kosong')]].concat(D.terbit ? [['terbit', TK('terbit')]] : []).concat(Object.keys(D.jadwal || {}).length ? [['lembar', TK('lembar')]] : []).map(function (x) {
        return '<button type="button" class="chip-alat" data-jadwal-mulai="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>';
    if (A.tundaBulan) {
      html += '<div class="jp-yakin" role="alertdialog"><b>' + esc(TK('pergi')) + '</b><div class="jp-yakin-tombol"><button type="button" class="btn dua kn-kecil" data-jadwal="simpanLalu">' + esc(TK('simpan')) + '</button><button type="button" class="btn dua kn-kecil" data-jadwal="buangLalu">' + esc(TK('buang')) + '</button><button type="button" class="btn dua kn-kecil" data-jadwal="batalPergi">' + esc(TK('batal')) + '</button></div></div>';
    }
    /* kalender */
    var n = jumlahHari(b), k1 = (hariKe(tglBulan(b, 1)) + 6) % 7, libur = {}; (D.libur || []).forEach(function (l) { libur[l.tgl] = l.nama; });
    var sel = [];
    for (var i = 0; i < k1; i++) sel.push('<span class="jp-sel jp-luar" aria-hidden="true"></span>');
    for (var d = 1; d <= n; d++) {
      var t = tglBulan(b, d), h = hariKe(t), isiT = A.isi[t] || [], kena = isiT.indexOf(A.pilih) > -1;
      var lbl = d + ' ' + namaBulan(b, !id()) + ', ' + (id() ? HARI : HARI_EN)[h] + (isiT.length ? ': ' + isiT.map(function (k) { return gk[k] ? namaStaf(gk[k]) : k; }).join(', ') : '');
      sel.push('<button type="button" class="jp-sel' + (h === 0 || h === 6 ? ' jp-akhir' : '') + (libur[t] ? ' jp-libur' : '') + (kena ? ' jp-kena' : '') + '" data-jadwal-tgl="' + t + '" aria-label="' + esc(lbl) + '" aria-pressed="' + kena + '">' +
        '<span class="jp-no">' + d + '</span>' + (libur[t] ? '<span class="jp-liburnama">' + esc(libur[t]) + '</span>' : '') +
        isiT.map(function (k) { var g = gk[k] || { kode: k, nama: k, retailer: '' }, wg = warnaGerai(g); return '<span class="jp-chip" style="background:' + wg[0] + ';color:' + wg[1] + '">' + esc(namaStaf(g)) + '</span>'; }).join('') + '</button>');
    }
    var hariKepala = (id() ? ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sab', 'Min'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map(function (x) { return '<span class="jp-hk">' + x + '</span>'; }).join('');
    var jml = {}; gerai.forEach(function (g) { jml[g.kode] = tanggalGerai(A.isi, g.kode).length; });
    var kel = kelompok(A.isi, gerai, D.kontak);
    html += '<div class="jp-kisi"><div class="jp-kiri"><div class="jp-kal-gulir"><div class="jp-kal">' + hariKepala + sel.join('') + '</div></div><p class="ket-alat jp-petunjuk">' + esc(TK('petunjuk')) + '</p></div>' +
      '<div class="jp-kanan"><div class="lbl">' + esc(TK('gerai')) + '</div><div class="jp-gerai">' + gerai.map(function (g) {
        var wg = warnaGerai(g), on = A.pilih === g.kode;
        return '<button type="button" class="jp-g' + (on ? ' on' : '') + '" data-jadwal-gerai="' + esc(g.kode) + '" aria-pressed="' + on + '"><i style="background:' + wg[0] + ';border-color:' + wg[1] + '"></i><span><b>' + esc(namaStaf(g)) + '</b><small>' + esc(g.kode) + '</small></span><em class="' + (jml[g.kode] ? '' : 'nol') + '">' + jml[g.kode] + 'x</em></button>';
      }).join('') + '</div>' +
      '<div class="lbl">' + esc(TK('cek')) + '</div><div class="lp-siap jp-cek">' + P.cek.map(function (x) { return '<div><span class="' + (x.ok ? 'ok' : 'awas') + '">' + (x.ok ? '✓' : '!') + '</span>' + esc(x.teks) + '</div>'; }).join('') + '</div>' +
      '<div class="lbl">' + esc(TK('berkas')) + '</div><div class="jp-berkas">' + kel.map(function (x) { return '<button type="button" class="chip-alat" data-jadwal-pdf="' + esc(x.k.kunci) + '" title="' + esc(x.k.namaSurat) + '">' + esc(TK('pdf')) + ' · ' + esc(x.k.penerima) + '</button>'; }).join('') +
      '<button type="button" class="chip-alat" data-jadwal-staf="png">' + esc(TK('staf')) + ' PNG</button><button type="button" class="chip-alat" data-jadwal-staf="jpg">' + esc(TK('staf')) + ' JPG</button></div>' +
      '<button type="button" class="jp-kontak-buka" data-jadwal="kontak" aria-expanded="' + A.kontakBuka + '">' + esc(TK('kontak')) + ' (' + (D.kontak || []).length + ')</button></div></div>';
    if (A.kontakBuka) html += gambarKontak();
    if (A.hasil) html += gambarHasil();
    if (A.yakin) html += gambarYakin(P);
    var ubahan = D.terbit && !sama(D.terbit.isi, A.isi);
    html += '<div class="lp-kaki jp-kaki"><span>' + esc(TK('ringkas')(P.total, gerai.filter(function (g) { return jml[g.kode]; }).length)) + '</span><span class="lp-status" id="jpStatus" role="status" aria-live="polite">' + esc(A.status) + '</span>' +
      '<button type="button" class="btn dua" data-jadwal="simpan"' + (A.sibuk ? ' disabled' : '') + '>' + esc(TK('simpan')) + '</button>' +
      '<button type="button" class="btn" data-jadwal="terbitkan"' + (A.sibuk || !P.total ? ' disabled' : '') + '>' + esc(D.terbit ? (ubahan ? TK('terbitUlang') : TK('terbitkan')(namaBulan(b, !id()))) : TK('terbitkan')(namaBulan(b, !id()))) + '</button></div>';
    w.innerHTML = html;
  }
  function penerimaBerubah() {
    var D = A.D; if (!D.terbit) return null;
    return kelompok(A.isi, D.gerai, D.kontak).concat((D.kontak || []).filter(function (k) { return !k.gerai.some(function (g) { return tanggalGerai(A.isi, g).length; }); }).map(function (k) { return { k: k, gerai: [] }; }))
      .filter(function (x) { return berubah(D.terbit.isi, A.isi, x.k.gerai).length; }).map(function (x) { return x.k.penerima; });
  }
  function gambarYakin(P) {
    var D = A.D, ub = penerimaBerubah();
    var ket = D.terbit ? TK('yakinUbah')(ub.join(', ')) : TK('yakinBaru')(P.total, kelompok(A.isi, D.gerai, D.kontak).length);
    return '<div class="jp-yakin" role="alertdialog" aria-labelledby="jpYakinJudul"><b id="jpYakinJudul">' + esc(TK('yakinJudul')(namaBulan(D.bulan, !id()))) + '</b><p>' + esc(ket) + '</p>' +
      (P.cek.some(function (x) { return !x.ok; }) ? '<p class="jp-yakin-awas">' + esc(P.cek.filter(function (x) { return !x.ok; }).map(function (x) { return x.teks; }).join(' ')) + '</p>' : '') +
      '<div class="jp-yakin-tombol"><button type="button" class="btn" data-jadwal="yakinYa">' + esc(TK('ya')) + '</button><button type="button" class="btn dua" data-jadwal="yakinBatal">' + esc(TK('batal')) + '</button></div></div>';
  }
  function gambarHasil() {
    var r = A.hasil;
    return '<div class="jp-hasil" role="status"><div class="lbl">' + esc(TK('hasil')) + '</div><p><b>' + esc(r.pesan || '') + '</b></p>' +
      (r.draf || []).map(function (x) {
        return '<div class="jp-hasil-baris"><span class="' + (x.galat ? 'awas' : 'ok') + '">' + (x.galat ? '!' : '✓') + '</span><span class="jp-hasil-teks"><b>' + esc(x.penerima) + '</b><small>' + esc(x.galat ? TK('galat') + ': ' + x.galat : (x.balasan ? TK('balas') : TK('baru')) + ' · ' + x.kepada) + '</small></span>' +
          '<button type="button" class="chip-alat" data-jadwal-pdf="' + esc(x.kunci) + '">' + esc(TK('pdf')) + '</button>' + (x.galat ? '<button type="button" class="chip-alat" data-jadwal-ulang="' + esc(x.kunci) + '">' + esc(TK('ulangDraf')) + '</button>' : '') + '</div>';
      }).join('') +
      ((r.tanpaKontak || []).length ? '<p class="ket-alat">' + esc(TK('tanpaKontak') + r.tanpaKontak.join(', ')) + '</p>' : '') +
      ((r.draf || []).length ? '<a class="btn dua kn-kecil" href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noopener">' + esc(TK('bukaDraf')) + '</a>' : '') + '</div>';
  }
  function gambarKontak() {
    if (!A.kontakEdit) A.kontakEdit = (A.D.kontak || []).map(function (k) { return { penerima: k.penerima, gerai: k.gerai.join(', '), kepada: k.kepada, cc: k.cc, sapaan: k.sapaan, namaSurat: k.namaSurat }; });
    var f = [['penerima', TK('kPenerima')], ['gerai', TK('kGerai')], ['kepada', TK('kKepada')], ['cc', TK('kCc')], ['sapaan', TK('kSapaan')], ['namaSurat', TK('kNama')]];
    return '<div class="jp-kontak"><div class="lbl">' + esc(TK('kontak')) + '</div><p class="ket-alat">' + esc(TK('kontakSub')) + '</p>' +
      A.kontakEdit.map(function (k, i) {
        return '<div class="jp-kontak-baris">' + f.map(function (x) { return '<label><span>' + esc(x[1]) + '</span><input type="text" value="' + esc(k[x[0]] || '') + '" data-kontak-isian="' + x[0] + '" data-baris="' + i + '" autocomplete="off"></label>'; }).join('') +
          '<button type="button" class="chip-alat" data-jadwal-hapus-kontak="' + i + '">' + esc(TK('hapus')) + '</button></div>';
      }).join('') +
      '<div class="jp-yakin-tombol"><button type="button" class="btn dua kn-kecil" data-jadwal="tambahKontak">' + esc(TK('tambahBaris')) + '</button><button type="button" class="btn kn-kecil" data-jadwal="simpanKontak">' + esc(TK('simpanKontak')) + '</button></div></div>';
  }

  /* ================= kejadian ================= */
  function setStatus(s) { A.status = s || ''; var x = el('jpStatus'); if (x) x.textContent = A.status; }
  function pindahBulan(n) {
    var tujuan = geserBulan(A.D ? A.D.bulan : A.bulan, n);
    if (tujuan < '2026-10') return;
    if (A.kotor) { A.tundaBulan = tujuan; gambarIsi(); return; }
    A.bulan = tujuan; A.D = null; A.status = ''; gambar(true);
  }
  function klik(e) {
    var d = el('jadwalPic');
    if (e.target === d) { tutup(); return; }
    var x = e.target.closest ? e.target.closest('[data-jadwal],[data-jadwal-tgl],[data-jadwal-gerai],[data-jadwal-mulai],[data-jadwal-pdf],[data-jadwal-staf],[data-jadwal-ulang],[data-jadwal-hapus-kontak]') : null;
    if (!x || A.sibuk && !x.hasAttribute('data-jadwal-pdf') && !x.hasAttribute('data-jadwal-staf')) return;
    var D = A.D;
    if (x.hasAttribute('data-jadwal-tgl')) {
      var t = x.getAttribute('data-jadwal-tgl'), a = (A.isi[t] || []).slice(), i = a.indexOf(A.pilih);
      if (!A.pilih) return;
      if (i > -1) a.splice(i, 1); else a.push(A.pilih);
      if (a.length) A.isi[t] = a; else delete A.isi[t];
      A.kotor = true; A.hasil = null; A.status = ''; bunyi('klik'); gambarIsi();
      var fokus = el('jadwalBadan') && el('jadwalBadan').querySelector('[data-jadwal-tgl="' + t + '"]'); if (fokus) fokus.focus();
      return;
    }
    if (x.hasAttribute('data-jadwal-gerai')) { A.pilih = x.getAttribute('data-jadwal-gerai'); bunyi('klik'); gambarIsi(); return; }
    if (x.hasAttribute('data-jadwal-mulai')) {
      var m = x.getAttribute('data-jadwal-mulai');
      A.isi = m === 'pola' ? dariPola(D.gerai, D.bulan) : m === 'lalu' ? dariBulanLalu(D.gerai, (D.bulanLalu || {}).jadwal || {}, D.bulan) : m === 'terbit' ? salin(D.terbit.isi) : m === 'lembar' ? salin(D.jadwal) : {};
      A.kotor = true; A.hasil = null; A.status = ''; bunyi('klik'); gambarIsi(); return;
    }
    if (x.hasAttribute('data-jadwal-pdf')) { unduhPdf(x.getAttribute('data-jadwal-pdf')); return; }
    if (x.hasAttribute('data-jadwal-staf')) { unduhStaf(x.getAttribute('data-jadwal-staf')); return; }
    if (x.hasAttribute('data-jadwal-ulang')) { terbit([x.getAttribute('data-jadwal-ulang')]); return; }
    if (x.hasAttribute('data-jadwal-hapus-kontak')) { A.kontakEdit.splice(+x.getAttribute('data-jadwal-hapus-kontak'), 1); gambarIsi(); return; }
    var aksi = x.getAttribute('data-jadwal');
    if (aksi === 'tutup') tutup();
    else if (aksi === 'ulang') gambar(true);
    else if (aksi === 'bulanSeb') pindahBulan(-1);
    else if (aksi === 'bulanBer') pindahBulan(1);
    else if (aksi === 'simpan') simpanDraf();
    else if (aksi === 'simpanLalu') { var tj = A.tundaBulan; simpanDraf().then(function (ok) { if (ok) { A.tundaBulan = null; A.bulan = tj; A.D = null; gambar(true); } }); }
    else if (aksi === 'buangLalu') { A.bulan = A.tundaBulan; A.tundaBulan = null; A.kotor = false; A.D = null; A.status = ''; gambar(true); }
    else if (aksi === 'batalPergi') { A.tundaBulan = null; gambarIsi(); }
    else if (aksi === 'terbitkan') { A.yakin = true; bunyi('klik'); gambarIsi(); var y = el('jadwalBadan').querySelector('.jp-yakin [data-jadwal="yakinYa"]'); if (y) y.focus(); }
    else if (aksi === 'yakinBatal') { A.yakin = false; gambarIsi(); }
    else if (aksi === 'yakinYa') { A.yakin = false; terbit(null); }
    else if (aksi === 'kontak') { A.kontakBuka = !A.kontakBuka; A.kontakEdit = null; gambarIsi(); }
    else if (aksi === 'tambahKontak') { A.kontakEdit.push({ penerima: '', gerai: '', kepada: '', cc: '', sapaan: 'Pak/Bu', namaSurat: '' }); gambarIsi(); }
    else if (aksi === 'simpanKontak') simpanKontak();
  }
  function simpanDraf() {
    var D = A.D; A.sibuk = true; setStatus('...');
    return M().jalan('simpanDrafJadwalPic', ['WMS-TIKET', D.bulan, A.isi]).then(function (r) {
      A.sibuk = false;
      if (!r || r.ok === false) { setStatus((r && r.pesan) || TK('gagal')); gambarIsi(); return false; }
      D.draf = { isi: salin(A.isi), waktu: r.waktu }; A.asal = 'draf'; A.kotor = false; A.status = TK('tersimpan') + ' ' + (r.waktu || ''); gambarIsi(); return true;
    }, function (e) { A.sibuk = false; setStatus(String(e && e.message || e)); gambarIsi(); return false; });
  }
  function simpanKontak() {
    var D = A.D; A.sibuk = true; setStatus('...');
    M().jalan('simpanKontakJadwalPic', ['WMS-TIKET', A.kontakEdit]).then(function (r) {
      A.sibuk = false;
      if (!r || r.ok === false) { setStatus((r && r.pesan) || TK('gagal')); gambarIsi(); return; }
      D.kontak = r.kontak; A.kontakEdit = null; A.status = TK('tersimpan'); gambarIsi();
    }, function (e) { A.sibuk = false; setStatus(String(e && e.message || e)); gambarIsi(); });
  }
  function siapkanLogo() {
    return Promise.all([muatGambar('img/logo-mofmo.jpg'), muatGambar('img/logo-ols.jpg')]).then(function (x) { return { mof: dataUrl(x[0]), ols: dataUrl(x[1]) }; });
  }
  function versiBerikut() { var D = A.D; if (!D.terbit) return 1; return sama(D.terbit.isi, A.isi) ? D.terbit.versi : D.terbit.versi + 1; }
  function bangunSemuaPdf() {
    var D = A.D, kel = kelompok(A.isi, D.gerai, D.kontak);
    return Promise.all([muatJsPdf(), siapkanLogo()]).then(function (z) {
      var opsi = { hariIni: hariIniLokal(), versi: versiBerikut(), lalu: (D.bulanLalu || {}).jadwal || {} };
      return kel.map(function (x) { var h = buatPdf(z[0], z[1], D, x, A.isi, opsi); return { kunci: x.k.kunci, nama: namaBerkas(x.k, D.bulan, D.pic || {}), doc: h.doc, muat: h.muat }; });
    });
  }
  function unduhBlob(blob, nama) {
    var u = URL.createObjectURL(blob), a = W.document.createElement('a');
    a.href = u; a.download = nama; a.style.display = 'none'; W.document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
  }
  function unduhPdf(kunci) {
    setStatus(TK('menyiapkan'));
    bangunSemuaPdf().then(function (semua) {
      var f = semua.filter(function (x) { return x.kunci === kunci; })[0];
      if (!f) { setStatus(''); return; }
      unduhBlob(f.doc.output('blob'), f.nama); setStatus('');
    }, function () { setStatus(TK('gagalPdf')); });
  }
  function unduhStaf(jenis) {
    var D = A.D;
    Promise.all([muatGambar('img/shiba.webp'), W.document.fonts && W.document.fonts.load ? Promise.all([W.document.fonts.load("800 40px 'Baloo 2'"), W.document.fonts.load('800 20px Nunito'), W.document.fonts.load('700 20px Nunito')]).catch(function () {}) : null]).then(function (z) {
      var cv = gambarStaf(W.document.createElement('canvas'), z[0], D, A.isi);
      var mime = jenis === 'jpg' ? 'image/jpeg' : 'image/png';
      cv.toBlob(function (bl) { if (bl) unduhBlob(bl, 'Jadwal-' + String((D.pic || {}).nama || 'PIC').split(' ')[0] + '-' + BULAN[+D.bulan.slice(5, 7) - 1] + '-' + D.bulan.slice(0, 4) + '.' + jenis); }, mime, 0.92);
    });
  }
  function b64(blob) { return new Promise(function (ok, gagal) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = gagal; r.readAsDataURL(blob); }); }
  function terbit(ulang) {
    var D = A.D; if (A.sibuk) return;
    A.sibuk = true; setStatus(TK('menyiapkan')); gambarIsi();
    bangunSemuaPdf().then(function (semua) {
      return Promise.all(semua.map(function (f) { return b64(f.doc.output('blob')).then(function (s) { return [f.kunci, { nama: f.nama, b64: s }]; }); }));
    }).then(function (pasang) {
      var berkas = {}; pasang.forEach(function (p) { berkas[p[0]] = p[1]; });
      setStatus(TK('mengirim'));
      var paket = { isi: A.isi, berkas: berkas }; if (ulang) paket.ulang = ulang;
      return M().jalan('terbitkanJadwalPic', ['WMS-TIKET', D.bulan, paket]);
    }).then(function (r) {
      A.sibuk = false;
      if (!r || r.ok === false) { setStatus((r && r.pesan) || TK('gagal')); gambarIsi(); return; }
      var hasil = r;
      return muat(D.bulan).then(function (Dn) { pasangData(Dn); A.hasil = hasil; A.status = ''; gambarIsi(); }, function () { A.hasil = hasil; A.kotor = false; gambarIsi(); });
    }, function (e) { A.sibuk = false; setStatus(/pustaka/.test(String(e && e.message)) ? TK('gagalPdf') : String(e && e.message || e)); gambarIsi(); });
  }

  W.WmsJadwal = { buka: buka, tutup: tutup, _periksa: periksa, _dariPola: dariPola, _dariBulanLalu: dariBulanLalu, _kelompok: kelompok, _keterangan: keterangan, _buatPdf: buatPdf, _gambarStaf: gambarStaf, _namaBerkas: namaBerkas, _daftarTanggal: daftarTanggal, _A: A };
})();
