/* Laporan Shopee di WMS (12 Okt 2026): mentahan harian, setoran sore, laporan harian dan bulanan.
 *
 * Ferdy: "ada mentahan excel harian yang di-download di WMS untuk Shopee, tempat
 * input setiap sore untuk laporan, menu untuk klaim laporan harian Shopee dan
 * laporan bulanan Shopee". Pilihannya: mentahan per pesanan, menu untuk setor
 * dan unduh, setoran disimpan di lembar baru di sistem.
 *  - Mentahan (Excel): satu baris per pesanan per barcode. Pesanan yang belum
 *    selesai dari setoran sebelumnya sudah terisi, jadi staf cukup memperbarui
 *    jam kemas, serah kurir, diterima, atau retur. Daftar pilihan untuk barcode,
 *    jasa kirim, status, dan alasan retur; SKU dan nama produk terisi rumus.
 *  - Setor: berkas dibaca di peramban (mentahan ini, atau Excel Operasi Stok
 *    dengan tab Pesanan Online dan Kirim Shopee), diperiksa, lalu dikirim ke
 *    wmsShopeeSetor (WmsShopeeHarian.gs) yang memperbarui lembar
 *    "Laporan Harian Shopee" tanpa menggandakan pesanan.
 *  - Laporan harian dan bulanan (Excel): tab Data satu baris per barang,
 *    Ringkasan dan pivot berupa rumus COUNTIFS/SUMIFS ke tab Data. Terjual =
 *    diserahkan ke kurir (aturan WMS sejak 4 Okt). Dibandingkan dengan penjualan
 *    SHP di buku besar WMS supaya selisihnya kelihatan.
 * Penulis XLSX milik hpp.js (JSZip dari vendor/pptxgen.bundle.js).
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !!(M().bhs && M().bhs() === 'id'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return W.document ? W.document.getElementById(i) : null; }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function ribu(n, p) { return String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, p); }
  function rp(n) { return (Number(n) < -0.5 ? '-' : '') + 'Rp' + ribu(n, id() ? '.' : ','); }
  function angka(n) { return (Number(n) < 0 ? '-' : '') + ribu(n, id() ? '.' : ','); }

  /* ================= tanggal ================= */
  function tglUTC(s) { var p = String(s).slice(0, 10).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function geserHari(s, n) { return new Date(tglUTC(s) + n * 86400000).toISOString().slice(0, 10); }
  function geserBulan(b, n) { var y = +b.slice(0, 4), m = +b.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + (m < 9 ? '0' : '') + (m + 1); }
  function akhirBulan(b) { var y = +b.slice(0, 4), m = +b.slice(5, 7); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
  function selisihHari(a, b) { return Math.round((tglUTC(b) - tglUTC(a)) / 86400000); }
  function serial(t) { return Math.round((tglUTC(t) - Date.UTC(1899, 11, 30)) / 86400000); }
  var BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var HARI_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function hariKe(s) { return new Date(tglUTC(s)).getUTCDay(); }
  function namaBulan(b, I) { I = I == null ? id() : I; return (I ? BULAN_ID : BULAN_EN)[+String(b).slice(5, 7) - 1] + ' ' + String(b).slice(0, 4); }
  function tglPanjang(s, I) { I = I == null ? id() : I; return (I ? HARI_ID : HARI_EN)[hariKe(s)] + ', ' + (+s.slice(8, 10)) + ' ' + namaBulan(s.slice(0, 7), I); }
  function tglValid(s) { return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(s || '')); }
  function tglDari(w) { return w ? String(w).slice(0, 10) : ''; }

  /* ================= nilai sel Excel ================= */
  /* angka seri Excel atau teks -> 'yyyy-mm-dd' / 'yyyy-mm-dd hh:mm'; bentuk lain dikembalikan apa adanya
     supaya server yang menolaknya dengan alasan */
  function waktuSel(v) {
    if (v === '' || v == null) return '';
    if (typeof v === 'number' && isFinite(v) && v > 20000 && v < 80000) {
      var ms = Math.round((v - 25569) * 86400000 / 60000) * 60000, d = new Date(ms).toISOString();
      return v % 1 ? d.slice(0, 10) + ' ' + d.slice(11, 16) : d.slice(0, 10);
    }
    var s = String(v).trim(), m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3] + (m[4] ? ' ' + (m[4].length < 2 ? '0' : '') + m[4] + ':' + m[5] : '');
    return s;
  }
  function teksSel(v) { if (v == null) return ''; if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v); return String(v).trim(); }
  function angkaSel(v) { if (v === '' || v == null) return ''; if (typeof v === 'number') return v; var n = Number(String(v).replace(/[^\d.\-]/g, '')); return String(v).trim() === '' ? '' : (isFinite(n) ? n : String(v)); }

  /* ================= pembaca XLSX kecil (regex, tanpa DOM) ================= */
  function dekode(s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); }).replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); }).replace(/&amp;/g, '&'); }
  function kolomKe(ref) { var m = String(ref).match(/^([A-Z]+)/), n = 0; if (!m) return 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + m[1].charCodeAt(i) - 64; return n - 1; }
  function bacaBerbagi(xml) { var o = []; (String(xml || '').match(/<si>[\s\S]*?<\/si>/g) || []).forEach(function (si) { var t = ''; (si.match(/<t(?:\s[^>]*)?>[\s\S]*?<\/t>|<t\/>/g) || []).forEach(function (x) { t += dekode(x.replace(/^<t[^>]*>|<\/t>$/g, '').replace(/^<t\/>$/, '')); }); o.push(t); }); return o; }
  function bacaLembarXml(xml, berbagi) {
    var rows = [];
    /* baris kosong bisa berbentuk <row r="5"/>; pola malas biasa akan menelan baris berikutnya */
    (String(xml).match(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g) || []).forEach(function (rx) {
      var rn = +(rx.match(/<row[^>]*\sr="(\d+)"/) || [])[1] || rows.length + 1, row = [];
      (rx.match(/<c\s[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).forEach(function (cx) {
        var ref = (cx.match(/\sr="([A-Z]+\d+)"/) || [])[1], t = (cx.match(/\st="([^"]+)"/) || [])[1] || '', v = (cx.match(/<v>([\s\S]*?)<\/v>/) || [])[1], val = '';
        if (t === 's') val = v != null ? berbagi[+v] : '';
        else if (t === 'inlineStr') { val = ''; (cx.match(/<t(?:\s[^>]*)?>[\s\S]*?<\/t>/g) || []).forEach(function (x) { val += dekode(x.replace(/^<t[^>]*>|<\/t>$/g, '')); }); }
        else if (t === 'str' || t === 'e') val = v != null ? dekode(v) : '';
        else if (t === 'b') val = v === '1';
        else val = v != null && v !== '' ? Number(v) : '';
        if (ref) row[kolomKe(ref)] = val;
      });
      rows[rn - 1] = row;
    });
    for (var i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    return rows;
  }
  /* ambil(path) -> Promise<string|null>; hasil {namaLembar: rows} */
  function bacaBuku(ambil) {
    return Promise.all([ambil('xl/workbook.xml'), ambil('xl/_rels/workbook.xml.rels'), ambil('xl/sharedStrings.xml')]).then(function (x) {
      var wb = x[0] || '', rels = x[1] || '', berbagi = bacaBerbagi(x[2] || ''), target = {};
      (rels.match(/<Relationship\s[^>]*>/g) || []).forEach(function (r) { var i = (r.match(/\sId="([^"]+)"/) || [])[1], t = (r.match(/\sTarget="([^"]+)"/) || [])[1]; if (i && t) target[i] = t.replace(/^\/?xl\//, '').replace(/^\//, ''); });
      var daftar = (wb.match(/<sheet\s[^>]*>/g) || []).map(function (s) { return { nama: dekode((s.match(/\sname="([^"]*)"/) || [])[1] || ''), rid: (s.match(/\sr:id="([^"]+)"/) || [])[1] }; });
      return Promise.all(daftar.map(function (d) { return ambil('xl/' + (target[d.rid] || '')); })).then(function (isi) {
        var o = {}; daftar.forEach(function (d, i) { if (isi[i]) o[d.nama] = bacaLembarXml(isi[i], berbagi); }); return o;
      });
    });
  }
  function bacaBerkas(buf) {
    var K = W.WmsHpp && W.WmsHpp._kit;
    return (K ? K.muatZip() : Promise.reject(new Error('pustaka'))).then(function () { return W.JSZip.loadAsync(buf); }).then(function (z) {
      return bacaBuku(function (p) { var f = z.file(p); return f ? f.async('string') : Promise.resolve(null); });
    });
  }

  /* ================= urai berkas jadi baris setoran ================= */
  var PETA = { no: ['no pesanan'], barcode: ['barcode'], qty: ['qty', 'qty (pcs)'], harga: ['harga jual', 'harga jual (rp)'], tPesan: ['waktu pesan', 'tanggal pesan'], tKemas: ['waktu kemas', 'waktu packing'],
    tSerah: ['waktu serah kurir'], jasa: ['jasa kirim', 'kurir'], resi: ['no resi'], status: ['status'], tTerima: ['waktu diterima'], tRetur: ['waktu retur'], rBagus: ['retur bagus'], rRusak: ['retur rusak'],
    alasan: ['alasan retur'], catatan: ['catatan'], saluran: ['saluran'] };
  function cariKepala(rows) {
    for (var i = 0; i < Math.min(rows.length, 15); i++) {
      var r = (rows[i] || []).map(function (v) { return String(v == null ? '' : v).trim().toLowerCase(); });
      if (r.indexOf('no pesanan') > -1 && (r.indexOf('barcode') > -1 || r.indexOf('waktu packing') > -1 || r.indexOf('jasa kirim') > -1)) {
        var k = {}; Object.keys(PETA).forEach(function (f) { for (var j = 0; j < r.length; j++) if (PETA[f].indexOf(r[j]) > -1 && k[f] == null) k[f] = j; }); return { baris: i, kol: k };
      }
    }
    return null;
  }
  function uraiBuku(buku) {
    var hasil = { baris: [], tanggal: '', oleh: '', sumber: '', lewat: 0 }, utama = null, kirim = null;
    Object.keys(buku).forEach(function (n) {
      var rows = buku[n], kp = cariKepala(rows); if (!kp) return;
      if (kp.kol.barcode != null && kp.kol.qty != null && !utama) utama = { nama: n, rows: rows, kp: kp };
      else if (kp.kol.barcode == null && !kirim) kirim = { nama: n, rows: rows, kp: kp };
    });
    if (!utama) return { galat: 'kepala' };
    hasil.sumber = utama.nama;
    for (var i = 0; i < utama.kp.baris; i++) {
      var r = utama.rows[i] || [], lab = String(r[0] || '').trim().toLowerCase();
      if (/^tanggal laporan/.test(lab)) hasil.tanggal = waktuSel(r[1]).slice(0, 10);
      if (/^disetor oleh/.test(lab)) hasil.oleh = teksSel(r[1]);
    }
    var K = utama.kp.kol, pk = {};
    if (kirim) {
      var KK = kirim.kp.kol;
      kirim.rows.slice(kirim.kp.baris + 1).forEach(function (r) { var no = teksSel(r[KK.no]).replace(/^#\s*/, ''); if (!no) return; pk[no] = { tKemas: waktuSel(r[KK.tKemas]), tSerah: waktuSel(r[KK.tSerah]), jasa: teksSel(r[KK.jasa]), resi: teksSel(r[KK.resi]), tTerima: waktuSel(r[KK.tTerima]) }; });
    }
    utama.rows.slice(utama.kp.baris + 1).forEach(function (r) {
      var no = teksSel(r[K.no]).replace(/^#\s*/, ''); if (!no) return;
      if (K.saluran != null && String(r[K.saluran] || '').trim().toUpperCase() !== 'SHOPEE') { hasil.lewat++; return; }
      var b = { no: no, barcode: teksSel(r[K.barcode]).replace(/\.0+$/, ''), qty: angkaSel(r[K.qty]), harga: K.harga != null ? angkaSel(r[K.harga]) : '' };
      ['tPesan', 'tKemas', 'tSerah', 'tTerima', 'tRetur'].forEach(function (f) { b[f] = K[f] != null ? waktuSel(r[K[f]]) : ''; });
      ['jasa', 'resi', 'status', 'alasan', 'catatan'].forEach(function (f) { b[f] = K[f] != null ? teksSel(r[K[f]]) : ''; });
      b.rBagus = K.rBagus != null ? angkaSel(r[K.rBagus]) : ''; b.rRusak = K.rRusak != null ? angkaSel(r[K.rRusak]) : '';
      var x = pk[no]; if (x) ['tKemas', 'tSerah', 'jasa', 'resi', 'tTerima'].forEach(function (f) { if (x[f] && !b[f]) b[f] = x[f]; });
      hasil.baris.push(b);
    });
    return hasil;
  }

  /* ================= hitungan laporan ================= */
  function toko(l) { return !!(l && (l.toko === 1 || l.toko === '1' || l.toko === true)); }
  function produk(dp) { var o = {}; (dp.prod || []).forEach(function (p, i) { if (p && p.b) o[String(p.b)] = { pi: i, sku: p.s || p.b, nama: p.n || '', h: Number(p.h) || 0 }; }); return o; }
  function buku(dp) {
    var L = dp.lok || [], jual = {}, retur = {}, stok = {};
    (dp.baris || []).forEach(function (b) {
      var t = String(b[0]).slice(0, 10), d = L[b[3]], k = L[b[4]], q = Number(b[2]) || 0, p = (dp.prod || [])[b[1]] || {}; if (!d || !k || !q || !tglValid(t)) return;
      if (d.k === 'SHP' && k.k === 'TERJUAL') jual[t] = (jual[t] || 0) + q;
      if (d.k === 'TERJUAL' && k.k === 'SHP') retur[t] = (retur[t] || 0) + q;
      var bc = String(p.b || ''); if (!bc) return;
      if (d.k === 'HO' || d.k === 'SHP') stok[bc] = (stok[bc] || 0) - q;
      if (k.k === 'HO' || k.k === 'SHP') stok[bc] = (stok[bc] || 0) + q;
    });
    return { jual: jual, retur: retur, stok: stok };
  }
  function jumlahRentang(o, a, b) { var n = 0; for (var t in o) if (t >= a && t <= b) n += o[t]; return n; }
  /* status satu barang pada akhir tanggal T */
  function statusPada(x, T) {
    if (x.status === 'Batal') return 'Batal';
    if (tglDari(x.tRetur) && tglDari(x.tRetur) <= T) return 'Retur';
    if (tglDari(x.tTerima) && tglDari(x.tTerima) <= T) return 'Diterima';
    if (tglDari(x.tSerah) && tglDari(x.tSerah) <= T) return 'Di jalan';
    if (tglDari(x.tKemas) && tglDari(x.tKemas) <= T) return 'Dikemas';
    return 'Belum dikemas';
  }
  function hitung(data, dp, o) {
    o = o || {};
    var P = produk(dp || {}), B = buku(dp || {}), hariIni = String((data && data.hariIni) || (dp && dp.hariIni) || new Date().toISOString().slice(0, 10)).slice(0, 10);
    var rows = ((data && data.baris) || []).map(function (r) {
      var p = P[String(r.barcode)] || {};
      return { no: String(r.no), barcode: String(r.barcode), sku: p.sku || '', nama: p.nama || '(barcode tidak dikenal)', qty: Number(r.qty) || 0, harga: Number(r.harga) || 0,
        tPesan: r.tPesan || '', tKemas: r.tKemas || '', tSerah: r.tSerah || '', tTerima: r.tTerima || '', tRetur: r.tRetur || '', jasa: r.jasa || '', resi: r.resi || '', status: r.status || '',
        rBagus: Number(r.rBagus) || 0, rRusak: Number(r.rRusak) || 0, alasan: r.alasan || '', disetor: r.disetor || '', oleh: r.oleh || '' };
    }).sort(function (a, b) { return a.tPesan < b.tPesan ? -1 : a.tPesan > b.tPesan ? 1 : a.no < b.no ? -1 : a.no > b.no ? 1 : 0; });
    var pertama = {}; rows.forEach(function (r) { r.satu = pertama[r.no] ? 0 : 1; pertama[r.no] = 1; });
    var awalData = rows.reduce(function (a, r) { var t = tglDari(r.tPesan); return t && (!a || t < a) ? t : a; }, '') || hariIni;
    var pilihanBulan = []; for (var bb = hariIni.slice(0, 7); bb >= awalData.slice(0, 7) && pilihanBulan.length < 36; bb = geserBulan(bb, -1)) pilihanBulan.push(bb);
    var ukur = function (a, b) {
      var u = { masuk: 0, pcs: 0, nilai: 0, kemas: 0, serah: 0, pcsSerah: 0, nilaiSerah: 0, terima: 0, retur: 0, nilaiRetur: 0 };
      var dalam = function (w) { var t = tglDari(w); return t && t >= a && t <= b; };
      rows.forEach(function (r) {
        var v = r.qty * r.harga, rq = r.rBagus + r.rRusak;
        if (dalam(r.tPesan)) { u.masuk += r.satu; u.pcs += r.qty; u.nilai += v; }
        if (dalam(r.tKemas)) u.kemas += r.satu;
        if (dalam(r.tSerah)) { u.serah += r.satu; u.pcsSerah += r.qty; u.nilaiSerah += v; }
        if (dalam(r.tTerima)) u.terima += r.satu;
        if (dalam(r.tRetur)) { u.retur += rq; u.nilaiRetur += rq * r.harga; }
      });
      u.bersih = u.nilaiSerah - u.nilaiRetur; u.buku = jumlahRentang(B.jual, a, b); u.bukuRetur = jumlahRentang(B.retur, a, b); u.selisih = u.pcsSerah - u.buku;
      return u;
    };
    var antrean = function (T) {
      var per = {}; rows.forEach(function (r) { if (!tglDari(r.tPesan) || tglDari(r.tPesan) > T) return; var s = statusPada(r, T); var x = per[r.no] = per[r.no] || { s: s, serah: tglDari(r.tSerah) }; if (s === 'Belum dikemas' || (s === 'Dikemas' && x.s !== 'Belum dikemas')) x.s = s; });
      var a = { belum: 0, dikemas: 0, jalan: 0, terima: 0, retur: 0, tertua: 0 };
      Object.keys(per).forEach(function (k) { var x = per[k]; if (x.s === 'Belum dikemas') a.belum++; else if (x.s === 'Dikemas') a.dikemas++; else if (x.s === 'Di jalan') { a.jalan++; a.tertua = Math.max(a.tertua, selisihHari(x.serah, T)); } else if (x.s === 'Diterima') a.terima++; else if (x.s === 'Retur') a.retur++; });
      return a;
    };
    var H = { mode: o.mode === 'bulanan' ? 'bulanan' : 'harian', hariIni: hariIni, awalData: awalData, pilihanBulan: pilihanBulan, rows: rows, setoran: (data && data.setoran) || [], stok: B.stok, bukuJual: B.jual };
    if (H.mode === 'harian') {
      var T = tglValid(o.tanggal) && o.tanggal <= hariIni ? o.tanggal : hariIni, awal = T.slice(0, 7) + '-01';
      H.tanggal = T; H.bulan = T.slice(0, 7); H.awal = awal; H.akhir = T; H.hari = ukur(T, T); H.mtd = ukur(awal, T); H.antrean = antrean(T);
      H.berkas = 'laporan-harian-shopee-' + T + '.xlsx';
    } else {
      var bl = /^\d{4}-\d{2}$/.test(String(o.bulan || '')) ? o.bulan : hariIni.slice(0, 7), aw = bl + '-01', ak = akhirBulan(bl);
      H.berjalan = ak > hariIni && hariIni >= aw; if (H.berjalan) ak = hariIni;
      var lalu = geserBulan(bl, -1);
      H.bulan = bl; H.awal = aw; H.akhir = ak; H.bulanLalu = lalu; H.ini = ukur(aw, ak); H.lalu = ukur(lalu + '-01', akhirBulan(lalu)); H.antrean = antrean(ak);
      var lead = [], sampai = [];
      rows.forEach(function (r) { if (!r.satu) return; var s = tglDari(r.tSerah); if (s && s >= aw && s <= ak && r.tPesan) lead.push(selisihHari(tglDari(r.tPesan), s)); var t = tglDari(r.tTerima); if (t && t >= aw && t <= ak && s) sampai.push(selisihHari(s, t)); });
      H.leadSerah = lead.length ? lead.reduce(function (a, x) { return a + x; }, 0) / lead.length : null;
      H.leadTerima = sampai.length ? sampai.reduce(function (a, x) { return a + x; }, 0) / sampai.length : null;
      H.berkas = 'laporan-bulanan-shopee-' + bl + '.xlsx';
    }
    var hari = []; for (var t2 = H.awal; t2 <= H.akhir; t2 = geserHari(t2, 1)) hari.push(t2); H.daftarHari = hari;
    /* pesanan yang tampil di tab Pesanan: ada kejadian di periode, atau masih terbuka di akhir periode */
    var grup = {}; rows.forEach(function (r) { var g = grup[r.no] = grup[r.no] || { no: r.no, tPesan: r.tPesan, pcs: 0, nilai: 0, tKemas: r.tKemas, tSerah: r.tSerah, tTerima: r.tTerima, jasa: r.jasa, resi: r.resi, retur: 0, baris: [] }; g.pcs += r.qty; g.nilai += r.qty * r.harga; g.retur += r.rBagus + r.rRusak; g.baris.push(r); ['tKemas', 'tSerah', 'tTerima', 'jasa', 'resi'].forEach(function (f) { if (!g[f] && r[f]) g[f] = r[f]; }); });
    H.pesanan = Object.keys(grup).map(function (k) { var g = grup[k]; g.status = statusPada(g.baris[0], H.akhir); g.umur = g.tPesan && (g.status === 'Belum dikemas' || g.status === 'Dikemas' || g.status === 'Di jalan') ? selisihHari(tglDari(g.tPesan), H.akhir) : ''; return g; })
      .filter(function (g) { var ada = ['tPesan', 'tKemas', 'tSerah', 'tTerima'].some(function (f) { var t = tglDari(g[f]); return t && t >= H.awal && t <= H.akhir; }); var buka = tglDari(g.tPesan) && tglDari(g.tPesan) <= H.akhir && ['Belum dikemas', 'Dikemas', 'Di jalan'].indexOf(g.status) > -1; return ada || buka || g.baris.some(function (r) { var t = tglDari(r.tRetur); return t && t >= H.awal && t <= H.akhir; }); })
      .sort(function (a, b) { return a.tPesan < b.tPesan ? 1 : a.tPesan > b.tPesan ? -1 : 0; });
    var skuLihat = {}; H.sku = [];
    rows.forEach(function (r) { var t = [r.tPesan, r.tSerah, r.tRetur].map(tglDari).some(function (x) { return x && x >= H.awal && x <= H.akhir; }); if (!t) return; if (!skuLihat[r.barcode]) { skuLihat[r.barcode] = { barcode: r.barcode, sku: r.sku, nama: r.nama, q: 0 }; H.sku.push(skuLihat[r.barcode]); } skuLihat[r.barcode].q += r.qty; });
    H.sku.sort(function (a, b) { return b.q - a.q || (a.sku < b.sku ? -1 : 1); });
    return H;
  }

  /* ================= berkas Excel ================= */
  var JASA = ['SPX Standard', 'SPX Hemat', 'SPX Express', 'J&T Express', 'JNE Reguler', 'JNE Trucking', 'POS Reguler', 'SiCepat', 'AnterAja', 'Lainnya'];
  var STATUS = ['Baru', 'Dikemas', 'Diserahkan kurir', 'Diterima', 'Batal', 'Retur'];
  var ALASAN = ['Gagal kirim', 'Dibatalkan pembeli', 'Retur pembeli', 'Lainnya'];
  function gaya(K) {
    var G = new K.Gaya(), F = K.F, I = K.ISI, FM = K.FMT;
    var s = { G: G, judul: G.id(F.judul), catatan: G.id(F.catatan), kepala: G.id(F.putih, I.kepala, 1, 0, true), teks: G.id(F.biasa, 0, 1), tebal: G.id(F.tebal), sub: G.id(F.tebal, I.ulang, 1),
      angka: G.id(F.biasa, 0, 1, FM.bulat), rp: G.id(F.biasa, 0, 1, FM.rp), pct: G.id(F.biasa, 0, 1, FM.pct), des: G.id(F.biasa, 0, 1, FM.des1), tgl: G.id(F.biasa, 0, 1, FM.tgl),
      hAngka: G.id(F.hijau, 0, 1, FM.bulat), hRp: G.id(F.hijau, 0, 1, FM.rp), hPct: G.id(F.hijau, 0, 1, FM.pct), bAngka: G.id(F.biru, 0, 1, FM.bulat), bRp: G.id(F.biru, 0, 1, FM.rp), bTgl: G.id(F.biru, 0, 1, FM.tgl), bTeks: G.id(F.biru, 0, 1),
      totTeks: G.id(F.tebal, I.total, 1), totAngka: G.id(F.tebal, I.total, 1, FM.bulat), totRp: G.id(F.tebal, I.total, 1, FM.rp),
      isian: G.id(F.biru, I.input, 1, 49), isianAngka: G.id(F.biru, I.input, 1, FM.bulat), isianRp: G.id(F.biru, I.input, 1, FM.rp), ulang: G.id(F.biru, I.ulang, 1, 49), ulangAngka: G.id(F.biru, I.ulang, 1, FM.bulat), ulangRp: G.id(F.biru, I.ulang, 1, FM.rp),
      otomatis: G.id(F.hijau, I.total, 1) };
    return s;
  }
  function kolomHuruf(n) { var t = ''; n++; while (n > 0) { var m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; }
  function xe(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* daftar pilihan Excel: ditempel ke XML lembar sebelum pageMargins */
  function pasangPilihan(L, daftar) {
    var asli = L.xml;
    L.xml = function () {
      var dv = '<dataValidations count="' + daftar.length + '">' + daftar.map(function (d) { return '<dataValidation type="list" allowBlank="1" showErrorMessage="' + (d.keras ? 1 : 0) + '" errorStyle="' + (d.keras ? 'stop' : 'warning') + '" sqref="' + d.ref + '"><formula1>' + xe(d.f) + '</formula1></dataValidation>'; }).join('') + '</dataValidations>';
      return asli.call(L).replace('<pageMargins', dv + '<pageMargins');
    };
  }
  var BARIS_KOSONG = 150;
  function susunMentahan(dp, data, tanggal, oleh) {
    var K = W.WmsHpp._kit, s = gaya(K), P = produk(dp), daftarP = (dp.prod || []).filter(function (p) { return p && p.b; });
    var L = new K.Lembar('Pesanan');
    L.isi(1, 1, 'Laporan harian Shopee · isi tiap sore, lalu setor di WMS (Laporan > Shopee)', s.judul);
    L.isi(2, 1, 'Tanggal laporan', s.tebal); L.isi(2, 2, tanggal, s.isian);
    L.isi(3, 1, 'Disetor oleh', s.tebal); L.isi(3, 2, oleh || '', s.isian);
    L.isi(2, 4, 'Satu baris per pesanan per barcode. Kuning = diisi. Hijau = otomatis. Biru muda = pesanan dari setoran sebelumnya yang belum selesai: perbarui jam kemas, serah kurir, diterima, atau retur. Waktu ditulis 2026-10-12 09:46.', s.catatan);
    var KP = ['No Pesanan', 'Barcode', 'SKU (otomatis)', 'Nama Produk (otomatis)', 'Qty', 'Harga Jual', 'Waktu Pesan', 'Waktu Kemas', 'Waktu Serah Kurir', 'Jasa Kirim', 'No Resi', 'Status', 'Waktu Diterima', 'Waktu Retur', 'Retur Bagus', 'Retur Rusak', 'Alasan Retur', 'Catatan'];
    KP.forEach(function (h, j) { L.isi(5, j + 1, h, s.kepala); }); L.tinggi[5] = 32;
    var buka = []; ((data && data.baris) || []).forEach(function (r) { var st = String(r.status || ''); if (r.tTerima || st === 'Diterima' || st === 'Batal' || st === 'Retur') return; buka.push(r); });
    buka.sort(function (a, b) { var x = String(a.tPesan), y = String(b.tPesan); return x < y ? -1 : x > y ? 1 : 0; });
    var nP = daftarP.length + 1, n = 6;
    var rumusSku = function (r) { return { f: 'IF(B' + r + '="","",IFERROR(INDEX(Produk!$B$2:$B$' + nP + ',MATCH(B' + r + '&"",Produk!$A$2:$A$' + nP + ',0)),"BARCODE TIDAK DIKENAL"))' }; };
    var rumusNama = function (r) { return { f: 'IF(B' + r + '="","",IFERROR(INDEX(Produk!$C$2:$C$' + nP + ',MATCH(B' + r + '&"",Produk!$A$2:$A$' + nP + ',0)),""))' }; };
    buka.forEach(function (r) {
      var v = [r.no, String(r.barcode), null, null, Number(r.qty) || '', r.harga === '' ? '' : Number(r.harga) || 0, r.tPesan, r.tKemas, r.tSerah, r.jasa, r.resi, r.status, r.tTerima, r.tRetur, Number(r.rBagus) || '', Number(r.rRusak) || '', r.alasan, r.catatan];
      v.forEach(function (x, j) { if (j === 2) L.isi(n, 3, rumusSku(n), s.otomatis); else if (j === 3) L.isi(n, 4, rumusNama(n), s.otomatis); else L.isi(n, j + 1, x == null ? '' : x, j === 4 || j >= 14 && j <= 15 ? s.ulangAngka : j === 5 ? s.ulangRp : s.ulang); });
      n++;
    });
    for (var i = 0; i < BARIS_KOSONG; i++, n++) {
      KP.forEach(function (h, j) { if (j === 2) L.isi(n, 3, rumusSku(n), s.otomatis); else if (j === 3) L.isi(n, 4, rumusNama(n), s.otomatis); else L.isi(n, j + 1, '', j === 4 || j === 14 || j === 15 ? s.isianAngka : j === 5 ? s.isianRp : s.isian); });
    }
    var akhir = n - 1;
    L.lebar = [18, 16, 13, 34, 7, 12, 17, 17, 17, 15, 20, 16, 17, 17, 9, 9, 17, 28]; L.beku = { r: 6, c: 3 };
    pasangPilihan(L, [{ ref: 'B6:B' + akhir, f: 'Produk!$A$2:$A$' + nP }, { ref: 'J6:J' + akhir, f: '"' + JASA.join(',') + '"' }, { ref: 'L6:L' + akhir, f: '"' + STATUS.join(',') + '"', keras: true }, { ref: 'Q6:Q' + akhir, f: '"' + ALASAN.join(',') + '"' }]);
    var PR = new K.Lembar('Produk');
    ['Barcode', 'SKU', 'Nama Produk', 'Harga wholesale incl PPN (Rp)'].forEach(function (h, j) { PR.isi(1, j + 1, h, s.kepala); });
    daftarP.forEach(function (p, i) { PR.isi(i + 2, 1, String(p.b), s.teks); PR.isi(i + 2, 2, p.s || '', s.teks); PR.isi(i + 2, 3, p.n || '', s.teks); PR.isi(i + 2, 4, Number(p.h) || 0, s.rp); });
    PR.lebar = [16, 13, 44, 16]; PR.beku = { r: 2, c: 1 };
    var PT = new K.Lembar('Petunjuk');
    ['Cara mengisi laporan harian Shopee',
      '1. Isi Tanggal laporan dan Disetor oleh di atas tab Pesanan.',
      '2. Pesanan baru hari ini: satu baris per barcode. No Pesanan dari Seller Centre (contoh 261011BKEGFKHX), bukan nomor resi SPXID.',
      '3. Pilih Barcode dari daftar; SKU dan nama produk terisi sendiri. Kalau muncul BARCODE TIDAK DIKENAL, cek barcode di tab Produk.',
      '4. Waktu ditulis 2026-10-12 atau 2026-10-12 09:46. Jangan 12/10/2026, bisa terbaca bulan yang salah.',
      '5. Baris biru muda = pesanan dari setoran sebelumnya yang belum selesai. Cukup isi yang berubah: jam kemas, jam serah kurir, jasa kirim, resi, jam diterima, atau retur. Sel yang dikosongkan tidak menghapus isi lama.',
      '6. Barang dianggap terjual saat diserahkan ke kurir. Retur diisi per barcode: jumlah bagus, jumlah rusak, alasan, dan jam retur. Pesanan yang sudah diterima tidak muncul lagi di mentahan; kalau ternyata diretur, tulis satu baris dengan No Pesanan, Barcode, dan Qty yang sama lalu isi kolom retur.',
      '7. Simpan, lalu di WMS buka Laporan > Shopee > Setor laporan sore, pilih berkas ini, cek pratinjau, tekan Setor.',
      'Satu pesanan tidak pernah setengah masuk: kalau satu barangnya salah, seluruh pesanan itu ditolak dengan alasannya. Perbaiki lalu setor ulang; pesanan yang sudah masuk tidak tergandakan.'].forEach(function (x, i) { PT.isi(1 + i, 1, x, i ? s.teks : s.judul); });
    PT.lebar = [140];
    return { lembar: [L, PR, PT], G: s.G, judul: 'Mentahan laporan harian Shopee ' + tanggal };
  }
  function mentahan(dp, data, tanggal, oleh) {
    if (!W.WmsHpp || !W.WmsHpp._kit) return Promise.reject(new Error('penulis xlsx'));
    return W.WmsHpp._kit.muatZip().then(function () { var x = susunMentahan(dp, data, tanggal, oleh); return W.WmsHpp._kit.rakit(x.lembar, x.G, x.judul); });
  }

  function susunLaporan(H) {
    var K = W.WmsHpp._kit, s = gaya(K), harian = H.mode === 'harian';
    var D = new K.Lembar('Data');
    D.isi(1, 1, 'Data laporan harian Shopee (semua setoran)', s.judul);
    D.isi(2, 1, 'Satu baris per pesanan per barcode dari lembar Laporan Harian Shopee. Tanggal berupa tanggal Excel; jam lengkap di kolom teks paling kanan.', s.catatan);
    var KD = ['No Pesanan', 'Pesanan (1 = baris pertama)', 'Tanggal pesan', 'Barcode', 'SKU', 'Nama produk', 'Qty', 'Harga jual (Rp)', 'Nilai (Rp)', 'Tanggal kemas', 'Tanggal serah kurir', 'Jasa kirim', 'No resi', 'Tanggal diterima', 'Tanggal retur', 'Retur bagus', 'Retur rusak', 'Retur pcs', 'Nilai retur (Rp)', 'Alasan retur', 'Status per ' + H.akhir, 'Waktu pesan', 'Waktu serah kurir', 'Disetor'];
    KD.forEach(function (h, j) { D.isi(4, j + 1, h, s.kepala); }); D.tinggi[4] = 32;
    var tglAtau = function (w) { var t = tglDari(w); return tglValid(t) ? serial(t) : ''; };
    H.rows.forEach(function (r, i) {
      var n = 5 + i;
      D.isi(n, 1, r.no, s.teks); D.isi(n, 2, r.satu, s.bAngka); D.isi(n, 3, tglAtau(r.tPesan), s.bTgl); D.isi(n, 4, r.barcode, s.teks); D.isi(n, 5, r.sku, s.teks); D.isi(n, 6, r.nama, s.teks);
      D.isi(n, 7, r.qty, s.bAngka); D.isi(n, 8, r.harga, s.bRp); D.isi(n, 9, { f: 'G' + n + '*H' + n }, s.rp);
      D.isi(n, 10, tglAtau(r.tKemas), s.bTgl); D.isi(n, 11, tglAtau(r.tSerah), s.bTgl); D.isi(n, 12, r.jasa, s.teks); D.isi(n, 13, r.resi, s.teks); D.isi(n, 14, tglAtau(r.tTerima), s.bTgl); D.isi(n, 15, tglAtau(r.tRetur), s.bTgl);
      D.isi(n, 16, r.rBagus, s.bAngka); D.isi(n, 17, r.rRusak, s.bAngka); D.isi(n, 18, { f: 'P' + n + '+Q' + n }, s.angka); D.isi(n, 19, { f: 'R' + n + '*H' + n }, s.rp);
      D.isi(n, 20, r.alasan, s.teks); D.isi(n, 21, statusPada(r, H.akhir), s.teks); D.isi(n, 22, r.tPesan, s.teks); D.isi(n, 23, r.tSerah, s.teks); D.isi(n, 24, r.disetor + (r.oleh ? ' · ' + r.oleh : ''), s.teks);
    });
    var akhirD = Math.max(5, 4 + H.rows.length);
    D.lebar = [18, 9, 12, 15, 12, 36, 6, 12, 13, 12, 12, 14, 20, 12, 12, 8, 8, 8, 13, 16, 15, 17, 17, 22]; D.beku = { r: 5, c: 2 }; D.saring = 'A4:X' + akhirD;
    var rg = function (c) { return 'Data!$' + c + '$5:$' + c + '$' + akhirD; };
    var S1 = rg('B'), TP = rg('C'), BC = rg('D'), Q = rg('G'), V = rg('I'), TK = rg('J'), TS = rg('K'), JS = rg('L'), TT = rg('N'), TR = rg('O'), RQ = rg('R'), RV = rg('S'), AL = rg('T');
    var antara = function (a, b) { return a === b ? [String(serial(a))] : ['">="&' + serial(a), '"<="&' + serial(b)]; };
    var krit = function (kol, a, b) { return antara(a, b).map(function (c) { return kol + ',' + c; }).join(','); };
    /* rumus satu ukuran untuk rentang tanggal a..b */
    var RUMUS = {
      masuk: function (a, b) { return 'COUNTIFS(' + S1 + ',1,' + krit(TP, a, b) + ')'; }, pcs: function (a, b) { return 'SUMIFS(' + Q + ',' + krit(TP, a, b) + ')'; }, nilai: function (a, b) { return 'SUMIFS(' + V + ',' + krit(TP, a, b) + ')'; },
      kemas: function (a, b) { return 'COUNTIFS(' + S1 + ',1,' + krit(TK, a, b) + ')'; }, serah: function (a, b) { return 'COUNTIFS(' + S1 + ',1,' + krit(TS, a, b) + ')'; },
      pcsSerah: function (a, b) { return 'SUMIFS(' + Q + ',' + krit(TS, a, b) + ')'; }, nilaiSerah: function (a, b) { return 'SUMIFS(' + V + ',' + krit(TS, a, b) + ')'; },
      terima: function (a, b) { return 'COUNTIFS(' + S1 + ',1,' + krit(TT, a, b) + ')'; }, retur: function (a, b) { return 'SUMIFS(' + RQ + ',' + krit(TR, a, b) + ')'; }, nilaiRetur: function (a, b) { return 'SUMIFS(' + RV + ',' + krit(TR, a, b) + ')'; } };
    var UKURAN = [['masuk', 'Pesanan masuk', 'n'], ['pcs', 'Pcs dipesan', 'n'], ['nilai', 'Nilai pesanan (Rp)', 'r'], ['kemas', 'Pesanan dikemas', 'n'], ['serah', 'Pesanan diserahkan ke kurir', 'n'],
      ['pcsSerah', 'Pcs terjual (diserahkan ke kurir)', 'n'], ['nilaiSerah', 'Nilai terjual (Rp)', 'r'], ['terima', 'Pesanan diterima pembeli', 'n'], ['retur', 'Retur (pcs)', 'n'], ['nilaiRetur', 'Nilai retur (Rp)', 'r']];
    var sumber = 'Sumber: lembar Laporan Harian Shopee (' + H.setoran.length + ' setoran terbaru tercatat) dan buku besar WMS. Terjual = diserahkan ke kurir.';

    /* ---- Ringkasan ---- */
    var R = new K.Lembar('Ringkasan');
    var kolom = harian ? [[H.tanggal, H.tanggal, 'Hari ini', H.hari], [H.awal, H.tanggal, 'Bulan berjalan', H.mtd]] : [[H.awal, H.akhir, namaBulan(H.bulan, true) + (H.berjalan ? ' (berjalan)' : ''), H.ini], [H.bulanLalu + '-01', akhirBulan(H.bulanLalu), namaBulan(H.bulanLalu, true), H.lalu]];
    R.isi(1, 1, harian ? 'Laporan harian Shopee · ' + tglPanjang(H.tanggal, true) : 'Laporan bulanan Shopee · ' + namaBulan(H.bulan, true) + (H.berjalan ? ' (sampai ' + (+H.akhir.slice(8, 10)) + ' ' + BULAN_ID[+H.akhir.slice(5, 7) - 1] + ')' : ''), s.judul);
    R.isi(2, 1, sumber, s.catatan);
    ['Ukuran', kolom[0][2], kolom[1][2]].concat(harian ? [] : ['Selisih']).forEach(function (h, j) { R.isi(4, j + 1, h, s.kepala); });
    var r = 5, baris = {};
    UKURAN.forEach(function (u) {
      R.isi(r, 1, u[1], s.teks); baris[u[0]] = r;
      kolom.forEach(function (k, j) { R.isi(r, 2 + j, { f: RUMUS[u[0]](k[0], k[1]) }, u[2] === 'r' ? s.hRp : s.hAngka); });
      if (!harian) R.isi(r, 4, { f: 'B' + r + '-C' + r }, u[2] === 'r' ? s.rp : s.angka);
      r++;
    });
    R.isi(r, 1, 'Penjualan bersih (Rp) = nilai terjual - nilai retur', s.totTeks);
    kolom.forEach(function (k, j) { var c = kolomHuruf(1 + j); R.isi(r, 2 + j, { f: c + baris.nilaiSerah + '-' + c + baris.nilaiRetur }, s.totRp); });
    if (!harian) R.isi(r, 4, { f: 'B' + r + '-C' + r }, s.totRp);
    baris.bersih = r; r++;
    R.isi(r, 1, 'Terjual di buku besar WMS (pcs, SHP ke Terjual)', s.teks); kolom.forEach(function (k, j) { R.isi(r, 2 + j, k[3].buku, s.bAngka); }); baris.buku = r; r++;
    R.isi(r, 1, 'Selisih laporan vs buku besar (pcs)', s.teks); kolom.forEach(function (k, j) { var c = kolomHuruf(1 + j); R.isi(r, 2 + j, { f: c + baris.pcsSerah + '-' + c + baris.buku }, s.angka); }); r++;
    if (!harian) {
      R.isi(r, 1, 'Rata-rata nilai per pesanan (Rp)', s.teks); kolom.forEach(function (k, j) { var c = kolomHuruf(1 + j); R.isi(r, 2 + j, { f: 'IF(' + c + baris.masuk + '=0,"",' + c + baris.nilai + '/' + c + baris.masuk + ')' }, s.rp); }); r++;
      R.isi(r, 1, 'Tingkat retur (retur pcs / pcs terjual)', s.teks); kolom.forEach(function (k, j) { var c = kolomHuruf(1 + j); R.isi(r, 2 + j, { f: 'IF(' + c + baris.pcsSerah + '=0,"",' + c + baris.retur + '/' + c + baris.pcsSerah + ')' }, s.pct); }); r++;
      R.isi(r, 1, 'Rata-rata hari dari pesan sampai serah kurir', s.teks); R.isi(r, 2, H.leadSerah == null ? '' : Math.round(H.leadSerah * 10) / 10, s.des); r++;
      R.isi(r, 1, 'Rata-rata hari dari serah kurir sampai diterima', s.teks); R.isi(r, 2, H.leadTerima == null ? '' : Math.round(H.leadTerima * 10) / 10, s.des); r++;
    }
    r++;
    R.isi(r, 1, 'Antrean pesanan per akhir ' + (+H.akhir.slice(8, 10)) + ' ' + BULAN_ID[+H.akhir.slice(5, 7) - 1], s.tebal); r++;
    [['Belum dikemas', H.antrean.belum], ['Dikemas, belum diserahkan ke kurir', H.antrean.dikemas], ['Di jalan (diserahkan, belum diterima)', H.antrean.jalan], ['Paling lama di jalan (hari)', H.antrean.tertua]].forEach(function (x) { R.isi(r, 1, x[0], s.teks); R.isi(r, 2, x[1], s.bAngka); r++; });
    r++;
    var st = H.setoran.filter(function (x) { return x.tanggal >= H.awal && x.tanggal <= H.akhir; });
    var hariLapor = {}; st.forEach(function (x) { hariLapor[x.tanggal] = 1; });
    R.isi(r, 1, 'Setoran laporan di periode ini', s.tebal); R.isi(r, 2, Object.keys(hariLapor).length + ' dari ' + H.daftarHari.length + ' hari', s.teks); r++;
    R.lebar = [52, 18, 18, 14];

    /* ---- Pivot Harian ---- */
    var PH = new K.Lembar('Pivot Harian');
    PH.isi(1, 1, 'Shopee per tanggal, ' + namaBulan(H.bulan, true) + (H.akhir < akhirBulan(H.bulan) ? ' sampai ' + (+H.akhir.slice(8, 10)) : ''), s.judul);
    PH.isi(2, 1, 'Rumus COUNTIFS/SUMIFS ke tab Data. Kolom buku besar dari WMS.', s.catatan);
    var kh = ['Tanggal', 'Hari', 'Pesanan masuk', 'Pcs dipesan', 'Nilai pesanan (Rp)', 'Dikemas', 'Diserahkan ke kurir', 'Pcs terjual', 'Nilai terjual (Rp)', 'Retur pcs', 'Terjual di buku besar WMS'];
    kh.forEach(function (h, j) { PH.isi(4, j + 1, h, s.kepala); }); PH.tinggi[4] = 32;
    var uk = ['masuk', 'pcs', 'nilai', 'kemas', 'serah', 'pcsSerah', 'nilaiSerah', 'retur'];
    H.daftarHari.forEach(function (t, i) {
      var n = 5 + i;
      PH.isi(n, 1, serial(t), s.tgl); PH.isi(n, 2, HARI_ID[hariKe(t)], s.teks);
      uk.forEach(function (u, j) { PH.isi(n, 3 + j, { f: RUMUS[u](t, t) }, u.indexOf('nilai') === 0 ? s.hRp : s.hAngka); });
      PH.isi(n, 11, H.bukuJual[t] || 0, s.bAngka);
    });
    var tPH = 5 + H.daftarHari.length;
    PH.isi(tPH, 1, 'Total', s.totTeks); PH.isi(tPH, 2, '', s.totTeks);
    for (var j1 = 3; j1 <= 11; j1++) PH.isi(tPH, j1, { f: 'SUM(' + kolomHuruf(j1 - 1) + '5:' + kolomHuruf(j1 - 1) + (tPH - 1) + ')' }, j1 === 5 || j1 === 9 ? s.totRp : s.totAngka);
    PH.lebar = [12, 9, 10, 10, 15, 9, 11, 10, 15, 9, 12]; PH.beku = { r: 5, c: 3 };

    /* ---- Pivot SKU ---- */
    var PS = new K.Lembar('Pivot SKU');
    PS.isi(1, 1, 'Shopee per SKU, ' + (harian ? tglPanjang(H.tanggal, true) + ' dan bulan berjalan' : namaBulan(H.bulan, true)), s.judul);
    PS.isi(2, 1, 'Rumus SUMIFS ke tab Data. Stok gudang dari buku besar WMS (HO dan paket Shopee belum diserahkan).', s.catatan);
    var kp = ['SKU', 'Nama produk', 'Barcode'].concat(harian ? ['Dipesan hari ini (pcs)'] : [], ['Dipesan (pcs)', 'Nilai pesanan (Rp)', 'Terjual (pcs)', 'Retur (pcs)', 'Stok gudang sekarang']);
    kp.forEach(function (h, j) { PS.isi(4, j + 1, h, s.kepala); }); PS.tinggi[4] = 32;
    var c0 = harian ? 5 : 4;
    H.sku.forEach(function (x, i) {
      var n = 5 + i, a = H.awal, b = H.akhir, kb = BC + ',$C' + n;
      PS.isi(n, 1, x.sku, s.teks); PS.isi(n, 2, x.nama, s.teks); PS.isi(n, 3, x.barcode, s.teks);
      if (harian) PS.isi(n, 4, { f: 'SUMIFS(' + Q + ',' + kb + ',' + krit(TP, H.tanggal, H.tanggal) + ')' }, s.hAngka);
      PS.isi(n, c0, { f: 'SUMIFS(' + Q + ',' + kb + ',' + krit(TP, a, b) + ')' }, s.hAngka);
      PS.isi(n, c0 + 1, { f: 'SUMIFS(' + V + ',' + kb + ',' + krit(TP, a, b) + ')' }, s.hRp);
      PS.isi(n, c0 + 2, { f: 'SUMIFS(' + Q + ',' + kb + ',' + krit(TS, a, b) + ')' }, s.hAngka);
      PS.isi(n, c0 + 3, { f: 'SUMIFS(' + RQ + ',' + kb + ',' + krit(TR, a, b) + ')' }, s.hAngka);
      PS.isi(n, c0 + 4, H.stok[x.barcode] != null ? H.stok[x.barcode] : '', s.bAngka);
    });
    var tPS = 5 + H.sku.length;
    PS.isi(tPS, 1, 'Total', s.totTeks); PS.isi(tPS, 2, '', s.totTeks); PS.isi(tPS, 3, '', s.totTeks);
    for (var j2 = 4; j2 <= c0 + 3; j2++) PS.isi(tPS, j2, H.sku.length ? { f: 'SUM(' + kolomHuruf(j2 - 1) + '5:' + kolomHuruf(j2 - 1) + (tPS - 1) + ')' } : 0, j2 === c0 + 1 ? s.totRp : s.totAngka);
    PS.isi(tPS, c0 + 4, '', s.totTeks);
    PS.lebar = [13, 38, 15].concat(harian ? [11] : [], [11, 15, 11, 9, 12]); PS.beku = { r: 5, c: 3 };

    var lembar = [R, PH, PS];
    /* ---- Jasa kirim dan retur (bulanan) ---- */
    if (!harian) {
      var JR = new K.Lembar('Jasa Kirim dan Retur');
      JR.isi(1, 1, 'Jasa kirim dan retur Shopee, ' + namaBulan(H.bulan, true), s.judul);
      ['Jasa kirim', 'Pesanan diserahkan', 'Pcs diserahkan'].forEach(function (h, j) { JR.isi(3, j + 1, h, s.kepala); });
      JASA.forEach(function (j, i) { var n = 4 + i; JR.isi(n, 1, j, s.teks); JR.isi(n, 2, { f: 'COUNTIFS(' + S1 + ',1,' + JS + ',$A' + n + ',' + krit(TS, H.awal, H.akhir) + ')' }, s.hAngka); JR.isi(n, 3, { f: 'SUMIFS(' + Q + ',' + JS + ',$A' + n + ',' + krit(TS, H.awal, H.akhir) + ')' }, s.hAngka); });
      var tj = 4 + JASA.length; JR.isi(tj, 1, 'Total', s.totTeks); JR.isi(tj, 2, { f: 'SUM(B4:B' + (tj - 1) + ')' }, s.totAngka); JR.isi(tj, 3, { f: 'SUM(C4:C' + (tj - 1) + ')' }, s.totAngka);
      var ar = tj + 2;
      ['Alasan retur', 'Retur (pcs)', 'Nilai retur (Rp)'].forEach(function (h, j) { JR.isi(ar, j + 1, h, s.kepala); });
      ALASAN.forEach(function (a, i) { var n = ar + 1 + i; JR.isi(n, 1, a, s.teks); JR.isi(n, 2, { f: 'SUMIFS(' + RQ + ',' + AL + ',$A' + n + ',' + krit(TR, H.awal, H.akhir) + ')' }, s.hAngka); JR.isi(n, 3, { f: 'SUMIFS(' + RV + ',' + AL + ',$A' + n + ',' + krit(TR, H.awal, H.akhir) + ')' }, s.hRp); });
      var ta = ar + 1 + ALASAN.length; JR.isi(ta, 1, 'Total', s.totTeks); JR.isi(ta, 2, { f: 'SUM(B' + (ar + 1) + ':B' + (ta - 1) + ')' }, s.totAngka); JR.isi(ta, 3, { f: 'SUM(C' + (ar + 1) + ':C' + (ta - 1) + ')' }, s.totRp);
      JR.lebar = [26, 18, 18];
      lembar.push(JR);
    }
    /* ---- Pesanan ---- */
    var PP = new K.Lembar('Pesanan');
    PP.isi(1, 1, 'Pesanan Shopee ' + (harian ? 'aktif per ' + tglPanjang(H.tanggal, true) : namaBulan(H.bulan, true)), s.judul);
    PP.isi(2, 1, 'Pesanan yang punya kejadian di periode ini atau masih terbuka di akhir periode. Umur = hari sejak dipesan untuk pesanan yang belum selesai.', s.catatan);
    ['No Pesanan', 'Waktu pesan', 'Pcs', 'Nilai (Rp)', 'Waktu kemas', 'Waktu serah kurir', 'Jasa kirim', 'No resi', 'Waktu diterima', 'Retur (pcs)', 'Status per ' + H.akhir, 'Umur (hari)'].forEach(function (h, j) { PP.isi(4, j + 1, h, s.kepala); }); PP.tinggi[4] = 32;
    H.pesanan.forEach(function (g, i) { var n = 5 + i; [g.no, g.tPesan, g.pcs, g.nilai, g.tKemas, g.tSerah, g.jasa, g.resi, g.tTerima, g.retur, g.status, g.umur].forEach(function (v, j) { PP.isi(n, j + 1, v, j === 2 || j === 9 || j === 11 ? s.angka : j === 3 ? s.rp : s.teks); }); });
    PP.lebar = [18, 17, 6, 12, 17, 17, 14, 20, 17, 9, 15, 9]; PP.beku = { r: 5, c: 2 }; if (H.pesanan.length) PP.saring = 'A4:L' + (4 + H.pesanan.length);
    lembar.push(PP, D);
    var C = new K.Lembar('Catatan');
    ['Cara baca',
      'Sumber angka: lembar Laporan Harian Shopee di sistem, diisi lewat setoran sore (mentahan Excel dari WMS). Pesanan dihitung sekali per No Pesanan, pcs dan nilai per barang.',
      'Terjual = diserahkan ke kurir, sama dengan aturan buku besar WMS. Nilai = qty x harga jual Shopee yang ditulis di setoran.',
      'Retur ditulis pada tanggal barang kembali. Penjualan bersih = nilai terjual - nilai retur.',
      'Kolom buku besar WMS membaca gerakan SHP ke Terjual. Selisih berarti setoran laporan dan pencatatan stok (Gudang Shopee atau Unggah Excel Shopee) belum sama.',
      'Huruf hijau = rumus ke tab Data. Huruf biru = angka dari sistem. Untuk pivot sendiri: tab Data dari baris 4, lalu Insert > PivotTable.',
      sumber].forEach(function (x, i) { C.isi(1 + i, 1, x, i ? s.catatan : s.judul); });
    C.lebar = [130];
    lembar.push(C);
    return { lembar: lembar, G: s.G, judul: harian ? 'Laporan harian Shopee ' + H.tanggal : 'Laporan bulanan Shopee ' + H.bulan };
  }
  function laporan(data, dp, o) {
    var H = hitung(data, dp, o);
    if (!W.WmsHpp || !W.WmsHpp._kit) return Promise.reject(new Error('penulis xlsx'));
    return W.WmsHpp._kit.muatZip().then(function () { var x = susunLaporan(H); return W.WmsHpp._kit.rakit(x.lembar, x.G, x.judul); });
  }

  /* ================= tab Shopee di Laporan ================= */
  var TS = {
    id: { setorJudul: 'Setor laporan sore', mentahan: 'Unduh mentahan hari ini', mentahanKet: 'Excel per pesanan. Pesanan yang belum selesai dari setoran sebelumnya sudah terisi.', pilih: 'Pilih Excel yang sudah diisi', tanggal: 'Tanggal laporan', oleh: 'Disetor oleh',
      harian: 'Laporan harian', bulanan: 'Laporan bulanan', bulan: 'Bulan', unduhH: 'Unduh Excel harian', unduhB: 'Unduh Excel bulanan', ukuran: 'Ukuran', hari: 'Hari ini', mtd: 'Bulan berjalan', ini: 'Bulan ini', lalu: 'Bulan lalu',
      masuk: 'Pesanan masuk', pcs: 'Pcs dipesan', nilai: 'Nilai pesanan', serah: 'Terjual (serah kurir)', nilaiSerah: 'Nilai terjual', retur: 'Retur', bersih: 'Penjualan bersih', buku: 'Buku besar WMS', antrean: 'Antrean sekarang', belum: 'belum dikemas', dikemas: 'dikemas', jalan: 'di jalan',
      setor: function (n, p) { return 'Setor ' + n + ' pesanan (' + p + ' baris)'; }, prat: function (n, p, s) { return n + ' pesanan, ' + p + ' baris dibaca dari tab ' + s + '.'; }, lewat: function (n) { return n + ' baris saluran lain dilewati.'; },
      tidakDikenal: function (n) { return n + ' barcode tidak ada di Master Produk WMS.'; }, hasil: function (b, u) { return 'Tersimpan: ' + b + ' baris baru, ' + u + ' diperbarui.'; }, ditolak: function (n) { return n + ' baris ditolak:'; },
      sudah: function (n, t) { return n + ' hari sudah setor bulan ini' + (t ? ' · terakhir ' + t : ''); }, kepalaGagal: 'Berkas ini tidak punya tabel dengan kolom No Pesanan dan Barcode.', bacaGagal: 'Berkas tidak bisa dibaca. Pastikan .xlsx.',
      isiOleh: 'Isi nama penyetor dulu.', menyiapkan: 'Menyusun Excel…', menyetor: 'Menyetor…', gagal: 'Berkas belum bisa dibuat. Coba lagi.', muat: 'Membaca setoran…',
      deploy: 'Setor dan laporan Shopee menyala setelah Apps Script versi baru di-deploy. Mentahan sudah bisa diunduh.', galatData: 'Setoran belum bisa dibaca sekarang.', ulang: 'Muat ulang', kosong: 'Belum ada setoran.',
      ket: 'Terjual dihitung saat diserahkan ke kurir. Excel laporan berisi Ringkasan, Pivot Harian, Pivot SKU, Pesanan, Data, dan Catatan (bulanan ditambah Jasa Kirim dan Retur); semua pivot berupa rumus ke tab Data.' },
    en: { setorJudul: 'Submit the evening report', mentahan: 'Download today\'s template', mentahanKet: 'Excel, one row per order. Unfinished orders from earlier submissions are already filled in.', pilih: 'Choose the filled Excel', tanggal: 'Report date', oleh: 'Submitted by',
      harian: 'Daily report', bulanan: 'Monthly report', bulan: 'Month', unduhH: 'Download daily Excel', unduhB: 'Download monthly Excel', ukuran: 'Measure', hari: 'Today', mtd: 'Month to date', ini: 'This month', lalu: 'Last month',
      masuk: 'Orders in', pcs: 'Pcs ordered', nilai: 'Order value', serah: 'Sold (handed to courier)', nilaiSerah: 'Sold value', retur: 'Returns', bersih: 'Net sales', buku: 'WMS ledger', antrean: 'Queue now', belum: 'not packed', dikemas: 'packed', jalan: 'in transit',
      setor: function (n, p) { return 'Submit ' + n + ' orders (' + p + ' rows)'; }, prat: function (n, p, s) { return n + ' orders, ' + p + ' rows read from the ' + s + ' tab.'; }, lewat: function (n) { return n + ' rows from other channels skipped.'; },
      tidakDikenal: function (n) { return n + ' barcodes are not in the WMS product master.'; }, hasil: function (b, u) { return 'Saved: ' + b + ' new rows, ' + u + ' updated.'; }, ditolak: function (n) { return n + ' rows rejected:'; },
      sudah: function (n, t) { return n + ' days submitted this month' + (t ? ' · last ' + t : ''); }, kepalaGagal: 'This file has no table with No Pesanan and Barcode columns.', bacaGagal: 'The file could not be read. Make sure it is .xlsx.',
      isiOleh: 'Fill in who is submitting first.', menyiapkan: 'Building the Excel file…', menyetor: 'Submitting…', gagal: 'The file could not be made. Try again.', muat: 'Reading submissions…',
      deploy: 'Shopee submissions and reports switch on after the new Apps Script version is deployed. The template can already be downloaded.', galatData: 'Submissions could not be read right now.', ulang: 'Reload', kosong: 'No submissions yet.',
      ket: 'Sold counts when handed to the courier. The report Excel has Summary, Daily pivot, SKU pivot, Orders, Data and Notes (monthly adds Couriers and Returns); every pivot is a formula over the Data tab. Workbook text is in Indonesian.' }
  };
  function T(k) { var d = TS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TS.en[k]; }
  var KUNCI_OLEH = 'wms_shopee_oleh';
  var S = { dp: null, data: null, galat: '', deploy: true, janji: null, tanggal: '', bulan: '', setorTgl: '', oleh: '', berkas: null, sibuk: false, hasil: null, pasang: false };
  function bacaOleh() { try { return W.localStorage.getItem(KUNCI_OLEH) || ''; } catch (e) { return ''; } }
  function simpanOleh(v) { try { W.localStorage.setItem(KUNCI_OLEH, v); } catch (e) {} }
  function muat(paksa) {
    if (S.data && !paksa) return Promise.resolve(S.data);
    if (S.janji) return S.janji;
    var m = M(); if (!m.jalan) return Promise.reject(new Error('jalan'));
    S.janji = m.jalan('wmsShopeeData', ['WMS-TIKET']).then(function (x) {
      S.janji = null; if (!x || x.ok === false) throw new Error((x && x.pesan) || 'data'); S.data = x; S.galat = ''; S.deploy = true; return x;
    }, function (e) { S.janji = null; throw e; });
    return S.janji;
  }
  function tabelUkur(kepala, kol, nilai) {
    return '<div class="ls-gulung"><table class="ls-tabel"><thead><tr><th>' + esc(T('ukuran')) + '</th>' + kepala.map(function (h) { return '<th class="num">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      kol.map(function (k) { return '<tr><td>' + esc(T(k[0])) + '</td>' + nilai.map(function (u) { var v = u[k[1]]; return '<td class="num">' + esc(k[2] === 'r' ? rp(v) : angka(v)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  var KOL = [['masuk', 'masuk', 'n'], ['pcs', 'pcs', 'n'], ['nilai', 'nilai', 'r'], ['serah', 'pcsSerah', 'n'], ['nilaiSerah', 'nilaiSerah', 'r'], ['retur', 'retur', 'n'], ['bersih', 'bersih', 'r'], ['buku', 'buku', 'n']];
  function gambar(w, dp) {
    S.dp = dp; pasangKejadian();
    if (!S.oleh) S.oleh = bacaOleh();
    var hariIni = String((S.data && S.data.hariIni) || dp.hariIni || new Date().toISOString().slice(0, 10)).slice(0, 10);
    if (!S.setorTgl) S.setorTgl = hariIni;
    var kartuSetor = '<section class="ls-kartu" data-ls-kartu="setor"><h3>' + esc(T('setorJudul')) + '</h3>' +
      '<div class="ls-baris"><button type="button" class="btn dua" data-ls="mentahan">' + esc(T('mentahan')) + '</button><small class="ket-alat">' + esc(T('mentahanKet')) + '</small></div>' +
      '<div class="ls-isian"><label class="lp-isian" for="lsSetorTgl"><span>' + esc(T('tanggal')) + '</span><input type="date" id="lsSetorTgl" value="' + esc(S.setorTgl) + '" max="' + esc(hariIni) + '"></label>' +
      '<label class="lp-isian" for="lsOleh"><span>' + esc(T('oleh')) + '</span><input type="text" id="lsOleh" maxlength="60" value="' + esc(S.oleh) + '" autocomplete="name"></label></div>' +
      '<label class="ls-berkas" for="lsBerkas"><span>' + esc(T('pilih')) + '</span><input type="file" id="lsBerkas" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label>' +
      '<div id="lsPrat" class="ls-prat" aria-live="polite">' + pratinjau() + '</div></section>';
    var badan;
    if (!S.data) {
      badan = '<p class="ket-alat" id="lsMuat">' + esc(S.galat ? (S.deploy ? T('galatData') : T('deploy')) : T('muat')) + (S.galat ? ' <button type="button" class="btn dua" data-ls="ulang">' + esc(T('ulang')) + '</button>' : '') + '</p>';
      if (!S.galat && !S.janji) muat().then(function () { ulang(); }, function (e) { var t = String(e && e.message || e); S.galat = t; S.deploy = !/tidak dibuka|not open|deploy|daftar izin|allow list/i.test(t); ulang(); });
    } else {
      var Hh = hitung(S.data, dp, { mode: 'harian', tanggal: S.tanggal }); S.tanggal = Hh.tanggal;
      var Hb = hitung(S.data, dp, { mode: 'bulanan', bulan: S.bulan || Hh.bulan }); S.bulan = Hb.bulan;
      var st = (S.data.setoran || []).filter(function (x) { return x.tanggal.slice(0, 7) === hariIni.slice(0, 7); }), hr = {}; st.forEach(function (x) { hr[x.tanggal] = 1; });
      var terakhir = (S.data.setoran || [])[0];
      var chip = ''; for (var t = hariIni.slice(0, 7) + '-01'; t <= hariIni; t = geserHari(t, 1)) chip += '<span class="ls-hari' + (hr[t] ? ' on' : '') + '" title="' + esc(t) + '">' + (+t.slice(8, 10)) + '</span>';
      var opsiB = Hb.pilihanBulan.map(function (b) { return '<option value="' + b + '"' + (b === Hb.bulan ? ' selected' : '') + '>' + esc(namaBulan(b)) + '</option>'; }).join('');
      badan = '<div class="ls-status"><span>' + esc(T('sudah')(Object.keys(hr).length, terakhir ? terakhir.tanggal + ' ' + String(terakhir.waktu).slice(11, 16) + ' · ' + terakhir.oleh : '')) + '</span><div class="ls-hari-kisi">' + chip + '</div></div>' +
        '<div class="ls-kisi2"><section class="ls-kartu" data-ls-kartu="harian"><h3>' + esc(T('harian')) + '</h3><label class="lp-isian" for="lsTanggal"><span>' + esc(T('tanggal')) + '</span><input type="date" id="lsTanggal" value="' + esc(Hh.tanggal) + '" max="' + esc(hariIni) + '"></label>' +
        tabelUkur([T('hari'), T('mtd')], KOL, [Hh.hari, Hh.mtd]) +
        '<p class="ket-alat">' + esc(T('antrean')) + ': ' + Hh.antrean.belum + ' ' + esc(T('belum')) + ', ' + Hh.antrean.dikemas + ' ' + esc(T('dikemas')) + ', ' + Hh.antrean.jalan + ' ' + esc(T('jalan')) + '</p>' +
        '<button type="button" class="btn" data-ls="harian">' + esc(T('unduhH')) + '</button></section>' +
        '<section class="ls-kartu" data-ls-kartu="bulanan"><h3>' + esc(T('bulanan')) + '</h3><label class="lp-isian" for="lsBulan"><span>' + esc(T('bulan')) + '</span><select id="lsBulan">' + opsiB + '</select></label>' +
        tabelUkur([T('ini'), T('lalu')], KOL, [Hb.ini, Hb.lalu]) +
        '<button type="button" class="btn" data-ls="bulanan">' + esc(T('unduhB')) + '</button></section></div>';
    }
    w.innerHTML = '<div class="ls-kisi">' + kartuSetor + '<div class="ls-kanan">' + badan + '</div></div><p class="ket-alat ls-ket">' + esc(T('ket')) + '</p><div class="lp-kaki"><span class="lp-status" id="lsStatus" role="status" aria-live="polite"></span></div>';
  }
  function pratinjau() {
    var o = '';
    if (S.berkas && S.berkas.galat) o += '<div class="tolak-alat" role="alert">' + esc(S.berkas.galat) + '</div>';
    else if (S.berkas) {
      var b = S.berkas.isi, P = produk(S.dp || {}), no = {}; b.baris.forEach(function (x) { no[x.no] = 1; });
      var asing = {}; b.baris.forEach(function (x) { if (!P[x.barcode]) asing[x.barcode] = 1; });
      o += '<p class="ls-prat-baris"><b>' + esc(S.berkas.nama) + '</b> · ' + esc(T('prat')(Object.keys(no).length, b.baris.length, b.sumber)) + (b.lewat ? ' ' + esc(T('lewat')(b.lewat)) : '') + '</p>';
      if (Object.keys(asing).length) o += '<p class="ls-awas">' + esc(T('tidakDikenal')(Object.keys(asing).length)) + ' ' + esc(Object.keys(asing).slice(0, 4).join(', ')) + '</p>';
      o += '<button type="button" class="btn" data-ls="setor"' + (b.baris.length && !S.deploy ? ' disabled' : '') + '>' + esc(T('setor')(Object.keys(no).length, b.baris.length)) + '</button>';
    }
    if (S.hasil) {
      var h = S.hasil;
      if (h.ok === false) o += '<div class="tolak-alat" role="alert">' + esc(h.pesan || T('gagal')) + '</div>';
      else {
        o += '<p class="ls-hasil" data-ls-hasil="1">' + esc(T('hasil')(h.baru, h.diperbarui)) + '</p>';
        if (h.ditolak && h.ditolak.length) o += '<div class="ls-tolak"><b>' + esc(T('ditolak')(h.ditolak.length)) + '</b><ul>' + h.ditolak.slice(0, 20).map(function (d) { return '<li>' + esc((id() ? 'Baris ' : 'Row ') + d.baris + ' · ' + d.no + ': ' + d.sebab) + '</li>'; }).join('') + '</ul></div>';
      }
    }
    return o;
  }
  function ulang() { var w = el('laporanBadan'); var aktif = W.document && W.document.querySelector('#laporan [data-ls-kartu]'); if (w && S.dp && aktif) gambar(w, S.dp); }
  function ulangPrat() { var p = el('lsPrat'); if (p) p.innerHTML = pratinjau(); }
  function unduhBlob(blob, nama) {
    var u = URL.createObjectURL(blob), a = W.document.createElement('a');
    a.href = u; a.download = nama; a.style.display = 'none'; W.document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
  }
  function status(t) { var s = el('lsStatus'); if (s) s.textContent = t || ''; }
  function tombol(x, on) { if (!x) return; x.disabled = !!on; if (on) x.setAttribute('aria-busy', 'true'); else x.removeAttribute('aria-busy'); }
  function aksi(a, x) {
    if (a === 'ulang') { bunyi('klik'); S.galat = ''; S.data = null; ulang(); return; }
    if (S.sibuk) return;
    if (a === 'mentahan') {
      S.sibuk = true; bunyi('klik'); status(T('menyiapkan')); tombol(x, true);
      var tg = S.setorTgl || String(S.dp.hariIni || '').slice(0, 10);
      mentahan(S.dp, S.data, tg, S.oleh).then(function (b) { unduhBlob(b, 'mentahan-shopee-harian-' + tg + '.xlsx'); status(''); }, function () { status(T('gagal')); }).then(function () { S.sibuk = false; tombol(x, false); });
      return;
    }
    if (a === 'harian' || a === 'bulanan') {
      if (!S.data) return; S.sibuk = true; bunyi('klik'); status(T('menyiapkan')); tombol(x, true);
      var o = a === 'harian' ? { mode: 'harian', tanggal: S.tanggal } : { mode: 'bulanan', bulan: S.bulan };
      laporan(S.data, S.dp, o).then(function (b) { unduhBlob(b, hitung(S.data, S.dp, o).berkas); status(''); }, function () { status(T('gagal')); }).then(function () { S.sibuk = false; tombol(x, false); });
      return;
    }
    if (a === 'setor') {
      if (!S.berkas || !S.berkas.isi) return;
      var oleh = (el('lsOleh') && el('lsOleh').value.trim()) || S.oleh;
      if (!oleh) { status(T('isiOleh')); var i0 = el('lsOleh'); if (i0) i0.focus(); return; }
      S.oleh = oleh; simpanOleh(oleh);
      var tgl = (el('lsSetorTgl') && el('lsSetorTgl').value) || S.setorTgl;
      S.sibuk = true; bunyi('klik'); status(T('menyetor')); tombol(x, true);
      M().jalan('wmsShopeeSetor', ['WMS-TIKET', { tanggal: tgl, oleh: oleh, berkas: S.berkas.nama, baris: S.berkas.isi.baris }]).then(function (h) {
        S.hasil = h || { ok: false };
        if (h && h.ok !== false) { S.berkas = null; S.data = null; var f = el('lsBerkas'); if (f) f.value = ''; return muat(true).then(function () {}, function () {}); }
      }, function (e) { S.hasil = { ok: false, pesan: String(e && e.message || e) }; }).then(function () { S.sibuk = false; status(''); var keep = S.hasil; gambarUlangDenganHasil(keep); });
    }
  }
  function gambarUlangDenganHasil(h) { S.hasil = h; ulang(); ulangPrat(); }
  function pasangKejadian() {
    if (S.pasang || !W.document) return; S.pasang = true;
    W.document.addEventListener('click', function (e) { var x = e.target && e.target.closest ? e.target.closest('#laporan [data-ls]') : null; if (x && !x.disabled) aksi(x.getAttribute('data-ls'), x); });
    W.document.addEventListener('change', function (e) {
      var t = e.target; if (!t) return;
      if (t.id === 'lsTanggal' && tglValid(t.value)) { S.tanggal = t.value; ulang(); }
      else if (t.id === 'lsBulan') { S.bulan = t.value; ulang(); }
      else if (t.id === 'lsSetorTgl' && tglValid(t.value)) { S.setorTgl = t.value; }
      else if (t.id === 'lsOleh') { S.oleh = t.value.trim(); simpanOleh(S.oleh); }
      else if (t.id === 'lsBerkas' && t.files && t.files[0]) {
        var f = t.files[0]; S.hasil = null; S.berkas = { nama: f.name, isi: null }; status(T('muat'));
        f.arrayBuffer().then(bacaBerkas).then(function (bk) {
          var u = uraiBuku(bk);
          if (u.galat) S.berkas = { nama: f.name, galat: T('kepalaGagal') };
          else { S.berkas = { nama: f.name, isi: u }; if (u.tanggal && tglValid(u.tanggal)) { S.setorTgl = u.tanggal; var i1 = el('lsSetorTgl'); if (i1) i1.value = u.tanggal; } if (u.oleh) { S.oleh = u.oleh; var i2 = el('lsOleh'); if (i2) i2.value = u.oleh; } }
        }, function () { S.berkas = { nama: f.name, galat: T('bacaGagal') }; }).then(function () { status(''); ulangPrat(); });
      }
    });
  }

  W.WmsLapShopee = { hitung: hitung, laporan: laporan, mentahan: mentahan, gambar: gambar, _uraiBuku: uraiBuku, _bacaBuku: bacaBuku, _bacaLembarXml: bacaLembarXml, _waktuSel: waktuSel, _susunLaporan: susunLaporan };
})();
