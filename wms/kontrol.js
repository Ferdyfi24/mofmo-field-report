/* Kontrol WMS Mofmofriends (11 Okt 2026): tutup bulan, rapor mitra, margin
 * saluran, rekonsiliasi, angka janggal, SLA kiriman, dan penjaga retur Shopee.
 *
 * Ferdy memilih Tahap 1 dan 2 dari usulan SCM ("klw gitu tahap 1 dan 2 aja"):
 * semuanya berbasis aturan, tanpa AI. Datanya sama dengan papan:
 *  - dataPapan: buku besar (lok, prod, baris), invoice mitra, laporan mitra
 *    yang diam, opname, tugas otomatis, kualitas data;
 *  - obdSpData: pesanan Shopee di aplikasi Gudang (retur dan di jalan);
 *  - permintaanDanPiutang: sheet Tagihan Mitra (kalau sudah disiapkan).
 * Lembar ini cuma membaca. Draf email tidak pernah dikirim: tombolnya menyalin
 * teks atau membuka aplikasi surel dengan penerima kosong.
 *
 * Aturan yang dipakai, supaya angkanya bisa dicek tangan:
 *  - Rasio nilai invoice = nilai invoice / dasar harga unit yang terjual di buku
 *    besar. Dasarnya per retailer: retail tanpa pajak ATAU wholesale (hs),
 *    dipilih yang rasionya paling tetap antar bulan-gerai (koefisien variasi
 *    terkecil; seri = retail). Data asli: Toys Kingdom membayar persentase
 *    retail, Kinokuniya membayar tepat wholesale (rasio 1,000 di kedua gerai),
 *    jadi satu dasar untuk semua akan menuduh campuran SKU sebagai "nilai
 *    menyimpang". Pajak dibaca per SKU (h / hs), bukan 1,11 rata.
 *    Patokan per retailer = MEDIAN rasio bulan-gerai yang unitnya sama, supaya
 *    satu invoice yang menyimpang tidak ikut menggeser patokannya.
 *  - Margin saluran (Ferdy 11 Okt) = margin mitra, semua rupiah termasuk PPN.
 *    Konsinyasi: harga rak = retail r, bersih ke principal = r x (1 - margin
 *    mitra): Toys Kingdom 35%, Kinokuniya 35%, MAA 45%. Gamotion 20%: harga =
 *    wholesale termasuk PPN / 0,8. Jual putus perorangan 10% seperti direct
 *    sales: harga sama dengan aturan Katalog (hs / (1 - margin) lalu pajak per
 *    SKU). Shopee: harga r, biaya 25% (perkiraan). Semua persen bisa diubah.
 *  - SLA kiriman dari pasangan HO ke TRANSIT lalu TRANSIT ke gerai (FIFO per
 *    SKU). TRANSIT yang kembali ke HO bukan kiriman.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !!(M().bhs && M().bhs() === 'id'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return document.getElementById(i); }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function ribu(n, pemisah) { var s = String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, pemisah); return (Number(n) < 0 ? '-' : '') + s; }
  function nf(n) { return ribu(n, id() ? '.' : ','); }
  function rp(n) { return (Number(n) < 0 ? '-' : '') + 'Rp' + ribu(n, id() ? '.' : ','); }
  function rpId(n) { return (Number(n) < 0 ? '-' : '') + 'Rp' + ribu(n, '.'); }
  function persen1(x) { if (x == null || !isFinite(x)) return '-'; var v = (Math.round(x * 1000) / 10).toFixed(1); return (id() ? v.replace('.', ',') : v) + '%'; }
  function persen0(x) { if (x == null || !isFinite(x)) return '-'; return Math.round(x * 100) + '%'; }

  /* ---------- tanggal ---------- */
  function tgl(s) { return String(s || '').slice(0, 10); }
  function ms(s) { var p = tgl(s).split('-'); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function hariAntara(a, b) { return Math.round((ms(b) - ms(a)) / 86400000); }
  function bulanSebelum(b) { var y = +b.slice(0, 4), m = +b.slice(5, 7) - 1; if (m < 1) { m = 12; y--; } return y + '-' + (m < 10 ? '0' : '') + m; }
  function hariDalamBulan(b) { var y = +b.slice(0, 4), m = +b.slice(5, 7); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  var BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function namaBulan(b, pakaiId) { var i = +String(b).slice(5, 7) - 1; return (pakaiId ? BULAN_ID : BULAN_EN)[i] + ' ' + String(b).slice(0, 4); }
  function tglId(s) { var t = tgl(s); return t ? (+t.slice(8, 10)) + ' ' + BULAN_ID[+t.slice(5, 7) - 1] + ' ' + t.slice(0, 4) : ''; }
  function tglPendek(s) { var t = tgl(s); if (!t) return '-'; return (+t.slice(8, 10)) + ' ' + (id() ? BULAN_ID : BULAN_EN)[+t.slice(5, 7) - 1].slice(0, 3); }

  /* ---------- nama ---------- */
  var RETAILER = { TGI: 'Toys Kingdom', KIY: 'Kinokuniya', MAA: 'MAA', GMT: 'Gamotion' };
  function namaRetailer(r) { return RETAILER[r] || r || '?'; }
  function namaPendek(n) { return String(n || '').replace(/\bmofmo ?friends\s+/gi, '').replace(/\s+-\s+/, ' ').trim() || String(n || ''); }
  function judulKata(s) { return String(s || '').toLowerCase().split(/\s+/).filter(Boolean).map(function (w) { return /^(tk|maa|pik|gi|pim|sgi|ho)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); }
  function namaGerai(l) {
    var n = String((l && l.n) || (l && l.k) || '').toUpperCase().replace(/\s+-\s+.*$/, '');
    n = n.replace(/^TOYS KINGDOM( LIVING WORLD)?\s*/, 'TK ').replace(/\bMALL\b\s*/g, '');
    return judulKata(n).trim() || (l && l.k) || '';
  }
  function toko(l) { return !!(l && (l.toko === 1 || l.toko === '1' || l.toko === true)); }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }), n = b.length; if (!n) return null; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function pajakR(p) { return p && p.hs > 0 && p.h > 0 ? p.h / p.hs : 1; }
  function retailExcl(p) { return p && p.r > 0 ? p.r / pajakR(p) : 0; }

  var OPSI_BAWAAN = { feeShopee: 0.25, marginPutus: 0.10, slaKirim: 3, slaRetur: 3, ambangNilai: 0.015, hariMati: 30, batasAdjust: 10, batasOpname: 30 };
  /* Margin mitra (tier), dikonfirmasi Ferdy 11 Okt 2026. */
  var MARGIN_MITRA = { TGI: 0.35, KIY: 0.35, MAA: 0.45, gamotion: 0.20 };
  function persenSah(x, cadangan) { var n = Number(x); return n >= 0 && n < 0.95 ? n : cadangan; }
  function tarifPajak(p) { return p && p.hs > 0 && p.h > 0 ? Math.round((p.h / p.hs - 1) * 1000) / 1000 : 0; }

  /* ================= hitungan ================= */
  function hitung(dp, ext) {
    ext = ext || {};
    var o = {}, k;
    for (k in OPSI_BAWAAN) o[k] = OPSI_BAWAAN[k];
    if (ext.opsi) for (k in ext.opsi) if (ext.opsi[k] != null) o[k] = ext.opsi[k];
    var L = dp.lok || [], P = dp.prod || [];
    var hariIni = tgl(dp.hariIni) || new Date().toISOString().slice(0, 10);
    var bulanTutup = bulanSebelum(hariIni.slice(0, 7)), awalTutup = bulanTutup + '-01', akhirTutup = bulanTutup + '-31';
    var iTR = -1; L.forEach(function (l, i) { if (l.k === 'TRANSIT') iTR = i; });
    var dipegang = function (l) { return !!l && (l.k === 'HO' || l.k === 'TRANSIT' || l.k === 'GMT' || toko(l)); };

    var urut = (dp.baris || []).map(function (b, i) { return { b: b, i: i }; });
    urut.sort(function (a, c) { var p = tgl(a.b[0]), q = tgl(c.b[0]); return p < q ? -1 : p > q ? 1 : a.i - c.i; });

    var stok = {}, stokAwal = null, stokAkhir = null, negatif = [], sudahMinus = {}, jual = {}, laku = {}, tiba = {}, gerakBulan = {}, lot = {}, kaki = [], adjust = [];
    var salin = function () { var x = {}; for (var a in stok) { x[a] = {}; for (var b in stok[a]) x[a][b] = stok[a][b]; } return x; };
    var tambah = function (li, pi, q) { var m = stok[li] = stok[li] || {}; m[pi] = (m[pi] || 0) + q; return m[pi]; };
    urut.forEach(function (u) {
      var b = u.b, t = tgl(b[0]), pi = b[1], q = Number(b[2]) || 0, di = b[3], ki = b[4], dr = L[di] || {}, ke = L[ki] || {};
      if (!q) return;
      if (!stokAwal && t >= awalTutup) stokAwal = salin();
      if (!stokAkhir && t > akhirTutup) stokAkhir = salin();
      var sDr = tambah(di, pi, -q); tambah(ki, pi, q);
      if (dipegang(dr) && sDr < 0 && !sudahMinus[di + '|' + pi]) { sudahMinus[di + '|' + pi] = 1; negatif.push({ li: di, pi: pi, tgl: t, saldo: sDr }); }
      var bln = t.slice(0, 7);
      if (toko(dr) || toko(ke)) { var gb = gerakBulan[bln] = gerakBulan[bln] || {}; if (toko(dr)) gb[di] = 1; if (toko(ke)) gb[ki] = 1; }
      if (toko(ke)) { var k1 = ki + '|' + pi; if (!tiba[k1]) tiba[k1] = t; }
      if (toko(dr) && ke.k === 'TERJUAL') {
        laku[di + '|' + pi] = (laku[di + '|' + pi] || 0) + q;
        var jb = jual[bln] = jual[bln] || {}, j = jb[di] = jb[di] || { unit: 0, retail: 0, modal: 0, sku: {} };
        j.unit += q; j.retail += q * retailExcl(P[pi]); j.modal += q * (Number((P[pi] || {}).hs) || 0); j.sku[pi] = (j.sku[pi] || 0) + q;
      }
      if (ke.k === 'TRANSIT') (lot[pi] = lot[pi] || []).push({ tgl: t, q: q, dari: dr.k });
      if (dr.k === 'TRANSIT') {
        var sisa = q, a = lot[pi] || [];
        while (sisa > 0 && a.length) { var h = a[0], ambil = Math.min(sisa, h.q); kaki.push({ kirim: h.tgl, tiba: t, ki: ki, ke: ke.k, toko: toko(ke), q: ambil, pi: pi }); h.q -= ambil; sisa -= ambil; if (!h.q) a.shift(); }
      }
      if ((dr.k === 'ADJUST' || ke.k === 'ADJUST') && q >= o.batasAdjust) adjust.push({ tgl: t, pi: pi, q: dr.k === 'ADJUST' ? q : -q, lok: dr.k === 'ADJUST' ? ke.k : dr.k });
    });
    if (!stokAwal) stokAwal = salin();
    if (!stokAkhir) stokAkhir = salin();
    var stokDi = function (S, li, pi) { return ((S[li] || {})[pi]) || 0; };
    var jumlahPositif = function (S, li) { var m = S[li] || {}, n = 0; for (var pi in m) if (m[pi] > 0) n += m[pi]; return n; };

    /* ---------- rekonsiliasi ---------- */
    var inv = {}, bulanSet = {};
    (dp.invoiceMitra || []).forEach(function (im) { bulanSet[im.bulan] = 1; for (var g in (im.gerai || {})) inv[im.bulan + '|' + g] = im.gerai[g]; });
    for (var bj in jual) bulanSet[bj] = 1;
    var bulanList = Object.keys(bulanSet).sort().reverse();
    var rekon = [];
    bulanList.forEach(function (bln) {
      L.forEach(function (l, li) {
        if (!toko(l) || !l.r) return;
        var v = inv[bln + '|' + l.k], j = (jual[bln] || {})[li];
        var uI = v ? Number(v.unit) || 0 : 0, nI = v ? Number(v.nilai) || 0 : 0, uB = j ? j.unit : 0;
        if (!v && !uB) return;
        var baris = { bulan: bln, gerai: l.k, li: li, retailer: l.r, unitInv: uI, unitBuku: uB, nilai: nI, retail: j ? j.retail : 0, modal: j ? j.modal : 0, rasio: null, norma: null, deviasi: null, dasar: '', status: '' };
        if (!v || (!uI && uB)) baris.status = 'tanpaInvoice';
        else if (!uB) baris.status = 'tanpaBuku';
        else if (uI !== uB) baris.status = 'selisihUnit';
        rekon.push(baris);
      });
    });
    /* dasar per retailer: retail atau wholesale, yang rasionya paling tetap */
    var kv = function (a) { if (a.length < 2) return 0; var m = a.reduce(function (x, y) { return x + y; }, 0) / a.length; if (!(m > 0)) return Infinity; var v = a.reduce(function (x, y) { return x + (y - m) * (y - m); }, 0) / a.length; return Math.sqrt(v) / m; };
    var calon = {};
    rekon.forEach(function (r) { if (r.status || !(r.nilai > 0)) return; var c = calon[r.retailer] = calon[r.retailer] || { retail: [], modal: [], okR: true, okM: true }; if (r.retail > 0) c.retail.push(r.nilai / r.retail); else c.okR = false; if (r.modal > 0) c.modal.push(r.nilai / r.modal); else c.okM = false; });
    var dasarRet = {};
    for (var cr in calon) { var cc = calon[cr]; dasarRet[cr] = !cc.okR ? 'modal' : (cc.okM && cc.modal.length && kv(cc.modal) < kv(cc.retail) ? 'modal' : 'retail'); }
    rekon.forEach(function (r) { var d = dasarRet[r.retailer] || 'retail', pembagi = d === 'modal' ? r.modal : r.retail; r.dasar = d; if (pembagi > 0 && r.nilai > 0) r.rasio = r.nilai / pembagi; });
    var rasioPer = {};
    rekon.forEach(function (r) { if (!r.status && r.rasio != null) (rasioPer[r.retailer] = rasioPer[r.retailer] || []).push(r.rasio); });
    var norma = {}; for (var rr in rasioPer) norma[rr] = median(rasioPer[rr]);
    rekon.forEach(function (r) {
      if (r.status) return;
      r.norma = norma[r.retailer]; r.deviasi = r.norma ? r.rasio / r.norma - 1 : 0;
      r.status = Math.abs(r.deviasi) > o.ambangNilai ? 'nilaiMenyimpang' : 'cocok';
    });

    /* ---------- margin per saluran (margin mitra, termasuk PPN) ---------- */
    var retailers = []; L.forEach(function (l) { if (toko(l) && l.r && retailers.indexOf(l.r) < 0) retailers.push(l.r); });
    var mm = o.marginMitra || {}, saluran = [];
    retailers.forEach(function (r) { if (r !== 'GMT' && MARGIN_MITRA[r] != null) saluran.push({ k: r, jenis: 'konsinyasi', m: persenSah(mm[r], MARGIN_MITRA[r]) }); });
    saluran.push({ k: 'gamotion', jenis: 'grosir', m: persenSah(mm.gamotion, MARGIN_MITRA.gamotion) });
    saluran.push({ k: 'putus', jenis: 'putus', m: persenSah(o.marginPutus, OPSI_BAWAAN.marginPutus) });
    saluran.push({ k: 'shopee', jenis: 'shopee', m: persenSah(o.feeShopee, OPSI_BAWAAN.feeShopee) });
    var marginBaris = [];
    P.forEach(function (p, pi) {
      if (!(p.hs > 0)) return;
      var ws = p.h > 0 ? p.h : 0, sal = {};
      saluran.forEach(function (x) {
        var hj = 0;
        if (x.jenis === 'konsinyasi' || x.jenis === 'shopee') hj = p.r > 0 ? p.r : 0;
        else if (x.jenis === 'grosir') hj = ws > 0 ? Math.round(ws / (1 - x.m)) : 0;
        else hj = Math.round(Math.round(p.hs / (1 - x.m)) * (1 + tarifPajak(p)));
        sal[x.k] = hj > 0 ? { harga: hj, net: Math.round(hj * (1 - x.m)), margin: x.m } : null;
      });
      marginBaris.push({ pi: pi, s: p.s || p.b, b: p.b, n: p.n, hs: p.hs, wholesale: ws, retail: p.r || 0, saluran: sal });
    });

    /* ---------- SLA kiriman ---------- */
    var grup = {}, kembali = {};
    kaki.forEach(function (x) {
      var kunci = x.kirim + '|' + x.ke;
      if (x.toko) { var g = grup[kunci] = grup[kunci] || { kirim: x.kirim, tiba: x.tiba, ke: x.ke, pcs: 0 }; g.pcs += x.q; if (x.tiba > g.tiba) g.tiba = x.tiba; }
      else { var kb = kembali[kunci] = kembali[kunci] || { kirim: x.kirim, ke: x.ke, pcs: 0 }; kb.pcs += x.q; }
    });
    var kiriman = Object.keys(grup).map(function (kk) { var g = grup[kk]; g.hari = hariAntara(g.kirim, g.tiba); g.lewat = g.hari > o.slaKirim; return g; });
    kiriman.sort(function (a, c) { return a.kirim < c.kirim ? 1 : a.kirim > c.kirim ? -1 : (a.ke < c.ke ? -1 : 1); });
    var terbukaG = {};
    for (var pk in lot) lot[pk].forEach(function (h) { if (h.q > 0) { var tb = terbukaG[h.tgl] = terbukaG[h.tgl] || { kirim: h.tgl, pcs: 0, sku: 0 }; tb.pcs += h.q; tb.sku++; } });
    var terbuka = Object.keys(terbukaG).sort().map(function (kk) { var x = terbukaG[kk]; x.umur = hariAntara(x.kirim, hariIni); x.lewat = x.umur > o.slaKirim; return x; });
    var sla = { kiriman: kiriman, kembali: Object.keys(kembali).sort().map(function (kk) { return kembali[kk]; }), terbuka: terbuka,
      rata: kiriman.length ? Math.round(kiriman.reduce(function (a, x) { return a + x.hari; }, 0) / kiriman.length * 10) / 10 : null,
      tepat: kiriman.length ? kiriman.filter(function (x) { return !x.lewat; }).length / kiriman.length : null, batas: o.slaKirim };

    /* ---------- angka janggal ---------- */
    var janggal = [];
    var temuan = function (kode, bobot, jml, rincian) { if (jml > 0) janggal.push({ kode: kode, bobot: bobot, jml: jml, rincian: rincian }); };
    temuan('minus', 'berat', negatif.length, negatif.map(function (x) { return L[x.li].k + ' · ' + namaPendek((P[x.pi] || {}).n) + ' · ' + x.tgl + ' (' + x.saldo + ')'; }));
    var rekonUnit = rekon.filter(function (r) { return r.status === 'tanpaInvoice' || r.status === 'tanpaBuku' || r.status === 'selisihUnit'; });
    temuan('unit', 'berat', rekonUnit.length, rekonUnit.map(function (r) { return r.bulan + ' · ' + r.gerai + ' · ' + r.unitInv + ' / ' + r.unitBuku; }));
    var rekonNilai = rekon.filter(function (r) { return r.status === 'nilaiMenyimpang'; });
    temuan('nilai', 'sedang', rekonNilai.length, rekonNilai.map(function (r) { return r.bulan + ' · ' + r.gerai + ' · ' + (Math.round(r.deviasi * 1000) / 10) + '%'; }));
    temuan('adjust', 'sedang', adjust.length, adjust.map(function (x) { return x.tgl + ' · ' + x.lok + ' · ' + namaPendek((P[x.pi] || {}).n) + ' · ' + (x.q > 0 ? '+' : '') + x.q; }));
    var tLewat = terbuka.filter(function (x) { return x.lewat; });
    temuan('transit', 'sedang', tLewat.length, tLewat.map(function (x) { return x.kirim + ' · ' + x.pcs + ' pcs · ' + x.umur + ' d'; }));
    var tanpaHarga = [];
    P.forEach(function (p, pi) { if (p.hs > 0) return; var ada = 0; L.forEach(function (l, li) { if (dipegang(l) && stokDi(stok, li, pi) > 0) ada += stokDi(stok, li, pi); }); if (ada > 0) tanpaHarga.push(namaPendek(p.n) + ' · ' + ada + ' pcs'); });
    temuan('tanpaHarga', 'ringan', tanpaHarga.length, tanpaHarga);

    /* ---------- tagihan ---------- */
    var tg = ext.tg && ext.tg.ok ? ext.tg : null;
    var barisTg = tg ? (tg.baris || []) : [];

    /* ---------- tutup bulan ---------- */
    var tutup = [];
    var butir = function (kode, status, jml, rincian, ke) { tutup.push({ kode: kode, status: status, jml: status === 'tindak' ? jml : null, rincian: rincian || [], ke: ke || '' }); };
    var aktif = L.map(function (l, li) { return li; }).filter(function (li) { var l = L[li]; return toko(l) && l.r && (((gerakBulan[bulanTutup] || {})[li]) || jumlahPositif(stokAwal, li) > 0); });
    var tanpaLap = aktif.filter(function (li) { return !inv[bulanTutup + '|' + L[li].k]; }).map(function (li) { return L[li].k; });
    butir('laporan', tanpaLap.length ? 'tindak' : 'beres', tanpaLap.length, tanpaLap, 'hal:dokumen');
    var rkT = rekon.filter(function (r) { return r.bulan === bulanTutup && r.status !== 'cocok'; });
    butir('rekon', rkT.length ? 'tindak' : 'beres', rkT.length, rkT.map(function (r) { return r.gerai + ':' + r.status; }), 'tab:rekon');
    var diJalan = 0; if (iTR > -1) { var mt = stokAkhir[iTR] || {}; for (var x1 in mt) if (mt[x1] > 0) diJalan += mt[x1]; }
    butir('transit', diJalan > 0 ? 'tindak' : 'beres', diJalan, [], 'tab:sla');
    if (dp.opname && dp.opname.length) {
      var opLewat = dp.opname.filter(function (x) { return x.wajib && (x.hari == null || x.hari > o.batasOpname); }).map(function (x) { return x.kode; });
      butir('opname', opLewat.length ? 'tindak' : 'beres', opLewat.length, opLewat, '');
    } else butir('opname', 'belum', null, [], '');
    if (tg) {
      var retJual = {}; for (var kk2 in inv) if (kk2.indexOf(bulanTutup + '|') === 0) { var g2 = kk2.slice(8), lg = L.filter(function (l) { return l.k === g2; })[0]; if (lg && lg.r) retJual[lg.r] = 1; }
      var tanpaTg = Object.keys(retJual).filter(function (r) { return !barisTg.some(function (b) { return String(b.retailer) === r && String(b.bulan || '').slice(0, 7) === bulanTutup; }); });
      tanpaTg.sort(function (a, c) { return retailers.indexOf(a) - retailers.indexOf(c); });
      butir('tagihan', tanpaTg.length ? 'tindak' : 'beres', tanpaTg.length, tanpaTg, 'hal:mitra2');
    } else butir('tagihan', 'belum', null, [], 'hal:mitra2');
    var pb = ((dp.pemicu && dp.pemicu.daftar) || []).filter(function (x) { return x.fn === 'kirimLaporanBulanan'; })[0];
    butir('otomatis', !pb ? 'belum' : (pb.status === 'hijau' ? 'beres' : 'tindak'), 1, pb ? [pb.ket || pb.status] : [], 'hal:sehat');
    if (dp.sehat) butir('kualitas', (dp.sehat.berat || 0) > 0 ? 'tindak' : 'beres', dp.sehat.berat, [], 'hal:sehat');
    else butir('kualitas', 'belum', null, [], 'hal:sehat');
    var jb2 = janggal.filter(function (x) { return x.bobot === 'berat'; });
    butir('janggalBerat', jb2.length ? 'tindak' : 'beres', jb2.length, jb2.map(function (x) { return x.kode; }), 'tab:janggal');

    /* ---------- rapor mitra ---------- */
    var hb = hariDalamBulan(bulanTutup), iHO = -1; L.forEach(function (l, i) { if (l.k === 'HO') iHO = i; });
    var sisaHO = {}; P.forEach(function (p, pi) { sisaHO[pi] = Math.max(0, stokDi(stok, iHO, pi)); });
    var rapor = retailers.map(function (r) {
      var gerai = [], unit = 0, nilai = 0, rakAkhir = 0, rak = 0, mati = 0, usul = [];
      L.forEach(function (l, li) {
        if (!toko(l) || l.r !== r) return;
        var j = (jual[bulanTutup] || {})[li], v = inv[bulanTutup + '|' + l.k];
        var g = { k: l.k, n: namaGerai(l), unit: j ? j.unit : 0, nilai: v ? Number(v.nilai) || 0 : 0, rak: jumlahPositif(stok, li), ada: !!v };
        gerai.push(g); unit += g.unit; nilai += g.nilai; rakAkhir += jumlahPositif(stokAkhir, li); rak += g.rak;
        for (var pi in (stok[li] || {})) { var s = stok[li][pi]; if (s > 0 && tiba[li + '|' + pi] && hariAntara(tiba[li + '|' + pi], hariIni) > o.hariMati && !laku[li + '|' + pi]) mati++; }
        var isi = [];
        if (j) Object.keys(j.sku).forEach(function (pi2) { var terjual = j.sku[pi2], ada = Math.max(0, stokDi(stok, li, pi2)); if (ada <= terjual) { var q = Math.min(terjual, sisaHO[pi2] || 0); if (q > 0) { sisaHO[pi2] -= q; isi.push({ pi: +pi2, n: namaPendek((P[pi2] || {}).n), q: q }); } } });
        if (isi.length) usul.push({ k: l.k, n: g.n, isi: isi });
      });
      var md = ((dp.mitraDiam && dp.mitraDiam.mitra) || []).filter(function (m) { return m.kode === r; })[0];
      var laporan = md ? { telat: !!md.telat, hariDiam: md.hariDiam, terakhir: md.terakhir || '' } : null;
      var piutang = null;
      if (tg) { piutang = { belum: 0, lewat: 0, baris: [] }; barisTg.forEach(function (b) { if (String(b.retailer) !== r || b.lunas) return; var s = Number(b.sisa != null ? b.sisa : b.nilai) || 0; piutang.belum += s; if (b.telat) piutang.lewat += s; piutang.baris.push(b); }); }
      var selisih = rekon.filter(function (x) { return x.bulan === bulanTutup && x.retailer === r && x.status !== 'cocok'; }).length;
      var st = unit + rakAkhir > 0 ? unit / (unit + rakAkhir) : null;
      var skor = 100;
      if (laporan && laporan.telat) skor -= 30;
      if (piutang && piutang.lewat > 0) skor -= 30;
      if (st != null) skor -= st < 0.2 ? 20 : st < 0.35 ? 10 : 0;
      skor -= Math.min(20, mati * 10);
      if (selisih > 0) skor -= 20;
      return { r: r, gerai: gerai.length, daftarGerai: gerai, unit: unit, nilai: nilai, rakAkhir: rakAkhir, rak: rak, sellThrough: st,
        tutupan: unit > 0 ? Math.round(rak / (unit / hb)) : null, mati: mati, laporan: laporan, piutang: piutang, selisih: selisih,
        skor: skor, nilaiRapor: skor >= 80 ? 'A' : skor >= 60 ? 'B' : 'C', usul: usul };
    });

    /* ---------- retur Shopee ---------- */
    var retur = { ada: false, daftar: [], jalanLama: [], batas: o.slaRetur, lewatJalan: 7 };
    var sp = ext.sp;
    if (sp && sp.pesanan) {
      var lw = Number(sp.lewat) || 7;
      retur.ada = true; retur.lewatJalan = lw;
      sp.pesanan.forEach(function (x) {
        if (x.retur) {
          var dasarTgl = typeof x.retur === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x.retur) ? tgl(x.retur) : tgl(x.tanggal);
          var umur = dasarTgl ? hariAntara(dasarTgl, hariIni) : null;
          retur.daftar.push({ ref: x.ref, resi: x.resi || '', tanggal: tgl(x.tanggal), umur: umur, lewat: umur != null && umur > o.slaRetur, pcs: x.pcsKemas || x.pcsPesan || null });
        } else if (x.tahap === 'TRANSIT' && x.umur != null && x.umur > lw) retur.jalanLama.push({ ref: x.ref, resi: x.resi || '', umur: x.umur, jasa: x.jasa || '' });
      });
      retur.daftar.sort(function (a, c) { return (c.umur || 0) - (a.umur || 0); });
      retur.jalanLama.sort(function (a, c) { return (c.umur || 0) - (a.umur || 0); });
    }

    return { hariIni: hariIni, bulanTutup: bulanTutup, opsi: o, L: L, P: P, retailers: retailers, tutup: tutup, rekon: rekon,
      margin: { saluran: saluran, baris: marginBaris }, rekonDasar: dasarRet, janggal: janggal, sla: sla, rapor: rapor, retur: retur, tg: tg, diperbarui: dp.diperbarui || '' };
  }

  /* ================= draf email (selalu bahasa Indonesia resmi) ================= */
  var TTD = '\n\nSalam,\nFerdy Febrian\nOne Logistics Solutions';
  function draf(jenis, r, H) {
    var R = (H.rapor || []).filter(function (x) { return x.r === r; })[0] || { daftarGerai: [], usul: [] };
    var nama = namaRetailer(r), per = namaBulan(H.bulanTutup, true);
    var sapa = 'Yth. Bapak/Ibu [Nama PIC] di ' + nama + ',\n\n';
    var subjek, isi;
    if (jenis === 'laporan') {
      var kurang = R.daftarGerai.filter(function (g) { return !g.ada; });
      var daftar = (kurang.length ? kurang : R.daftarGerai).map(function (g) { return '- ' + g.n + ' (' + g.k + ')'; }).join('\n');
      subjek = 'Permohonan laporan penjualan Mofmofriends ' + per + ' (' + nama + ')';
      isi = sapa + 'Semoga dalam keadaan baik. ' + (kurang.length ? 'Kami belum menerima laporan penjualan Mofmofriends periode ' + per + ' untuk gerai berikut:' : 'Mohon bantuannya untuk mengirimkan laporan penjualan Mofmofriends terbaru, termasuk periode ' + per + ', untuk gerai berikut:') + '\n' + daftar + '\n\n' +
        (R.laporan && R.laporan.terakhir ? 'Laporan terakhir yang kami terima bertanggal ' + tglId(R.laporan.terakhir) + (R.laporan.hariDiam != null ? ', ' + R.laporan.hariDiam + ' hari yang lalu' : '') + '. ' : '') +
        'Mohon laporan penjualan (tanggal, SKU atau barcode, jumlah, dan nilai) dapat dikirimkan paling lambat [tanggal], agar invoice periode ini dapat kami proses tepat waktu.\n\nTerima kasih atas kerja samanya.' + TTD;
    } else if (jenis === 'rekon') {
      var rows = (H.rekon || []).filter(function (x) { return x.bulan === H.bulanTutup && x.retailer === r; }), tU = 0, tN = 0;
      var garis = rows.map(function (x) {
        var g = R.daftarGerai.filter(function (y) { return y.k === x.gerai; })[0] || { n: x.gerai }, kepala = '- ' + g.n + ' (' + x.gerai + '): ';
        tU += x.unitInv; tN += x.nilai;
        if (x.status === 'tanpaInvoice') return kepala + 'belum ada laporan penjualan, sedangkan catatan stok kami menunjukkan ' + x.unitBuku + ' pcs terjual';
        if (x.status === 'tanpaBuku') return kepala + x.unitInv + ' pcs, ' + rpId(x.nilai) + ', tetapi catatan stok kami belum mencatat penjualan tersebut';
        if (x.status === 'selisihUnit') return kepala + 'laporan ' + x.unitInv + ' pcs (' + rpId(x.nilai) + '), catatan stok kami ' + x.unitBuku + ' pcs';
        if (x.status === 'nilaiMenyimpang') return kepala + x.unitInv + ' pcs, ' + rpId(x.nilai) + ', nilainya ' + Math.abs(Math.round(x.deviasi * 1000) / 10).toString().replace('.', ',') + '% ' + (x.deviasi < 0 ? 'lebih rendah' : 'lebih tinggi') + ' dari pola bulan lain';
        return kepala + x.unitInv + ' pcs, ' + rpId(x.nilai);
      }).join('\n');
      subjek = 'Konfirmasi rekonsiliasi penjualan Mofmofriends ' + per + ' (' + nama + ')';
      isi = sapa + 'Berikut ringkasan penjualan Mofmofriends periode ' + per + ' menurut catatan kami, untuk dicocokkan dengan catatan Bapak/Ibu:\n' + (garis || '- Belum ada penjualan yang tercatat.') + '\n\nTotal sesuai laporan: ' + tU + ' pcs, ' + rpId(tN) + '.\n\n' +
        'Mohon konfirmasi apakah angka di atas sudah sesuai. Apabila ada perbedaan, mohon lampirkan rincian per SKU agar dapat kami telusuri bersama.' + TTD;
    } else if (jenis === 'tagihan') {
      var bt = (R.piutang && R.piutang.baris) || [];
      var gt = bt.map(function (b) { return '- ' + b.no + (b.bulan ? ' (' + namaBulan(String(b.bulan).slice(0, 7), true) + ')' : '') + ': sisa ' + rpId(b.sisa != null ? b.sisa : b.nilai) + (b.tempo ? ', jatuh tempo ' + tglId(b.tempo) : '') + (b.telat && b.hariLewat ? ', lewat ' + b.hariLewat + ' hari' : ''); }).join('\n');
      subjek = 'Pengingat pembayaran invoice Mofmofriends (' + nama + ')';
      isi = sapa + (bt.length ? 'Bersama ini kami sampaikan invoice Mofmofriends yang masih terbuka:\n' + gt + '\n\nTotal yang belum dibayar ' + rpId(R.piutang.belum) + (R.piutang.lewat ? ', di antaranya ' + rpId(R.piutang.lewat) + ' sudah lewat jatuh tempo' : '') + '. Mohon informasi jadwal pembayarannya. Apabila pembayaran sudah dilakukan, mohon kirimkan bukti transfernya agar dapat kami catat.' :
        'Menurut catatan kami saat ini tidak ada invoice Mofmofriends yang masih terbuka. Mohon abaikan surel ini apabila semua sudah sesuai.') + '\n\nTerima kasih atas kerja samanya.' + TTD;
    } else {
      var gu = (R.usul || []).map(function (u) { return '- ' + u.n + ' (' + u.k + '): ' + u.isi.map(function (s) { return s.n + ' ' + s.q + ' pcs'; }).join(', '); }).join('\n');
      subjek = 'Usulan isi ulang stok Mofmofriends (' + nama + ')';
      isi = sapa + (gu ? 'Berdasarkan penjualan ' + per + ' dan stok di rak saat ini, kami mengusulkan pengiriman isi ulang berikut:\n' + gu + '\n\nMohon konfirmasi atau terbitkan PO agar barangnya dapat kami siapkan dari gudang.' :
        'Berdasarkan penjualan ' + per + ', stok di rak gerai masih mencukupi sehingga belum ada SKU yang perlu diisi ulang. Kami akan menginformasikan kembali bila ada SKU yang mulai menipis.') + '\n\nTerima kasih atas kerja samanya.' + TTD;
    }
    return { subjek: subjek, isi: isi };
  }

  /* ================= teks layar ================= */
  var TEKS = {
    en: {
      judul: 'Controls', sub: 'Month-end close, partner report cards, margins, reconciliation and number checks. Read only.', tutup: 'Close',
      muat: 'Reading the ledger…', gagal: 'The data could not be read right now. Check the signal and try again.',
      tab: { tutup: 'Month-end close', rapor: 'Partner report card', margin: 'Channel margin', rekon: 'Reconciliation', janggal: 'Odd numbers', sla: 'Delivery SLA', retur: 'Shopee returns' },
      tutupJudul: 'Month-end close', dari: function (a, b) { return a + ' of ' + b + ' done'; }, buka: 'Open',
      butir: { laporan: 'Sales reports in from every active store', rekon: 'Partner invoices match the ledger', transit: 'Nothing left in transit at month end', opname: 'Every required location counted in the last 30 days',
        tagihan: 'An invoice raised for every partner that sold', otomatis: 'Monthly report job ran', kualitas: 'No serious data quality findings', janggalBerat: 'No serious odd numbers' },
      st: { beres: 'Done', tindak: 'Needs action', belum: 'Cannot check yet' },
      rinci: {
        laporan: function (x) { return 'No sales report yet for ' + x.join(', ') + '. If a store sold nothing, ask the partner to confirm zero.'; }, rekon: function (n) { return n + ' store-month line(s) do not match. See Reconciliation.'; },
        transit: function (n, b) { return n + ' pcs were still in transit at the end of ' + b + '.'; }, opname: function (x) { return 'Overdue or never counted: ' + x.join(', ') + '.'; },
        tagihan: function (x) { return 'No invoice raised yet for ' + x.join(', ') + '.'; }, otomatis: function (x) { return 'Status: ' + x.join(' ') + '.'; },
        kualitas: function (n) { return n + ' serious finding(s) on the Data quality page.'; }, janggalBerat: function (n) { return n + ' serious rule(s) tripped. See Odd numbers.'; },
        belumTagihan: 'The Tagihan Mitra sheet is not set up yet. Run the menu "Siapkan PO mitra & tagihan" once.', belumOpname: 'No stock count schedule was read.', belumUmum: 'This data was not read.'
      },
      grade: 'Grade', skor: 'score', terjual: 'Sold', nilaiInv: 'Invoiced', st2: 'Sell-through', tutupan: 'Days of cover', mati: 'Dead stock', laporan: 'Reports', piutang: 'Receivables',
      tepatWaktu: 'On time', telat: function (n) { return 'Late, ' + n + ' days quiet'; }, hari: 'days', tanpaData: 'No data', belumTagih: 'Sheet not set up', lewatTempo: 'overdue',
      gerai: 'Store', jmlGerai: function (n) { return n + (n === 1 ? ' store' : ' stores'); }, rak: 'On shelf', drafJudul: 'Email draft', draf: { laporan: 'Draft: report request', rekon: 'Draft: reconciliation', tagihan: 'Draft: payment reminder', isiUlang: 'Draft: restock' },
      subjek: 'Subject', isi: 'Message', salin: 'Copy', disalin: 'Copied', surel: 'Open in email app', drafKet: 'Nothing is sent from here. Copy the text or open it in your email app, add the recipient, and send it yourself.',
      aturMargin: 'Partner margins', cariSku: 'Find a SKU', modal: 'Wholesale incl. VAT', putus: 'Outright sale (individual)', shopee: 'Shopee fee (estimate)', gamotion: 'Gamotion',
      hargaJual: 'Selling price', bersih: 'Net to principal',
      dasarMargin: 'Percentages are partner margins. All amounts include VAT. Consignment (Toys Kingdom, Kinokuniya, MAA): selling price is the shelf retail price, net to principal = retail x (1 - partner margin). Gamotion: price = wholesale incl. VAT / (1 - margin), so the principal receives wholesale. Outright sale to an individual follows direct sales at 10%, priced the same way as the Catalog. Shopee: retail price minus the platform fee. Every percentage can be changed above; the outright margin is shared with the Catalog.',
      rk: { bulan: 'Month', unitInv: 'Invoice pcs', unitBuku: 'Ledger pcs', nilai: 'Value', rasio: 'Ratio / norm', status: 'Status' },
      stRekon: { cocok: 'Match', nilaiMenyimpang: 'Value off', tanpaInvoice: 'No invoice', tanpaBuku: 'Not in ledger', selisihUnit: 'Units differ' },
      semua: 'All', masalah: 'Problems only', rekonKet: function (a) { return 'A line is "value off" when its invoice ratio is more than ' + a + ' away from the partner median. The ratio is against retail before tax or against wholesale, whichever has been steadier for that partner.'; },
      bobot: { berat: 'Serious', sedang: 'Check', ringan: 'Minor' },
      jg: { minus: 'Stock went below zero', unit: 'Invoice units do not match the ledger', nilai: 'Invoice value off the partner pattern', adjust: 'Large stock count adjustment', transit: 'In transit longer than the SLA', tanpaHarga: 'Stock without a wholesale price' },
      jgKet: 'Fixed rules, no guessing. Nothing is corrected automatically.', bersih: 'No odd numbers found.', lagi: function (n) { return '+' + n + ' more'; },
      slaBatas: 'SLA', rata: 'Average', tepat: 'On time', diJalan: 'Still in transit', kirim: 'Sent', tiba: 'Arrived', ke: 'To', pcs: 'pcs', lama: 'Days', lewat: 'Late', aman: 'On time',
      kembaliKet: function (n, p) { return n + ' movement(s), ' + p + ' pcs, went back to HO from transit and are not counted as deliveries.'; }, tanpaKiriman: 'No deliveries found in the ledger.', umur: 'Age',
      returBatas: 'Return check-in limit', returKet: 'Returned parcels should be received back and checked within the limit. Parcels on the road too long have no delivery or return news yet.',
      returJudul: 'Returned parcels', jalanJudul: 'On the road too long', returBelum: 'The Shopee warehouse data was not read yet.', returKosong: 'No returned parcels.', jalanKosong: 'Nothing on the road too long.',
      per: 'Data as of'
    },
    id: {
      judul: 'Kontrol', sub: 'Tutup bulan, rapor mitra, margin, rekonsiliasi, dan pemeriksaan angka. Cuma membaca.', tutup: 'Tutup',
      muat: 'Membaca buku besar…', gagal: 'Data belum bisa dibaca sekarang. Cek sinyal lalu coba lagi.',
      tab: { tutup: 'Tutup bulan', rapor: 'Rapor mitra', margin: 'Margin saluran', rekon: 'Rekonsiliasi', janggal: 'Angka janggal', sla: 'SLA kiriman', retur: 'Retur Shopee' },
      tutupJudul: 'Tutup bulan', dari: function (a, b) { return a + ' dari ' + b + ' beres'; }, buka: 'Buka',
      butir: { laporan: 'Laporan penjualan masuk dari semua gerai aktif', rekon: 'Invoice mitra cocok dengan buku besar', transit: 'Tidak ada barang tertahan di jalan pada akhir bulan', opname: 'Semua lokasi wajib sudah opname dalam 30 hari',
        tagihan: 'Tagihan dibuat untuk setiap mitra yang berjualan', otomatis: 'Laporan bulanan otomatis berjalan', kualitas: 'Tidak ada temuan kualitas data yang berat', janggalBerat: 'Tidak ada angka janggal yang berat' },
      st: { beres: 'Beres', tindak: 'Perlu tindakan', belum: 'Belum bisa diperiksa' },
      rinci: {
        laporan: function (x) { return 'Belum ada laporan penjualan dari ' + x.join(', ') + '. Kalau gerainya memang tidak berjualan, minta mitra mengonfirmasi nol.'; }, rekon: function (n) { return n + ' baris gerai-bulan tidak cocok. Lihat Rekonsiliasi.'; },
        transit: function (n, b) { return n + ' pcs masih di jalan pada akhir ' + b + '.'; }, opname: function (x) { return 'Lewat batas atau belum pernah opname: ' + x.join(', ') + '.'; },
        tagihan: function (x) { return 'Tagihan belum dibuat untuk ' + x.join(', ') + '.'; }, otomatis: function (x) { return 'Status: ' + x.join(' ') + '.'; },
        kualitas: function (n) { return n + ' temuan berat di halaman Kualitas data.'; }, janggalBerat: function (n) { return n + ' aturan berat terpicu. Lihat Angka janggal.'; },
        belumTagihan: 'Sheet Tagihan Mitra belum disiapkan. Jalankan menu "Siapkan PO mitra & tagihan" sekali.', belumOpname: 'Jadwal opname belum terbaca.', belumUmum: 'Data ini belum terbaca.'
      },
      grade: 'Nilai', skor: 'skor', terjual: 'Terjual', nilaiInv: 'Nilai invoice', st2: 'Sell-through', tutupan: 'Hari tutupan', mati: 'Stok mati', laporan: 'Laporan', piutang: 'Piutang',
      tepatWaktu: 'Tepat waktu', telat: function (n) { return 'Telat, diam ' + n + ' hari'; }, hari: 'hari', tanpaData: 'Tanpa data', belumTagih: 'Sheet belum disiapkan', lewatTempo: 'lewat tempo',
      gerai: 'Gerai', jmlGerai: function (n) { return n + ' gerai'; }, rak: 'Di rak', drafJudul: 'Draf email', draf: { laporan: 'Draf: minta laporan', rekon: 'Draf: rekonsiliasi', tagihan: 'Draf: pengingat bayar', isiUlang: 'Draf: isi ulang' },
      subjek: 'Subjek', isi: 'Isi', salin: 'Salin', disalin: 'Tersalin', surel: 'Buka di aplikasi surel', drafKet: 'Tidak ada yang terkirim dari sini. Salin teksnya atau buka di aplikasi surel, isi penerimanya, lalu kirim sendiri.',
      aturMargin: 'Margin mitra', cariSku: 'Cari SKU', modal: 'Wholesale termasuk PPN', putus: 'Jual putus (perorangan)', shopee: 'Biaya Shopee (perkiraan)', gamotion: 'Gamotion',
      hargaJual: 'Harga jual', bersih: 'Bersih ke principal',
      dasarMargin: 'Persentase adalah margin mitra. Seluruh nilai termasuk PPN. Konsinyasi (Toys Kingdom, Kinokuniya, MAA): harga jual adalah harga retail di rak, bersih ke principal = retail x (1 - margin mitra). Gamotion: harga = wholesale termasuk PPN / (1 - margin), sehingga principal menerima wholesale. Jual putus kepada perorangan mengikuti direct sales 10%, dengan cara hitung yang sama dengan Katalog. Shopee: harga retail dikurangi biaya platform. Setiap persentase dapat diubah di atas; margin jual putus sama dengan Katalog.',
      rk: { bulan: 'Bulan', unitInv: 'Pcs invoice', unitBuku: 'Pcs buku', nilai: 'Nilai', rasio: 'Rasio / patokan', status: 'Status' },
      stRekon: { cocok: 'Cocok', nilaiMenyimpang: 'Nilai menyimpang', tanpaInvoice: 'Belum ada invoice', tanpaBuku: 'Tidak ada di buku', selisihUnit: 'Unit beda' },
      semua: 'Semua', masalah: 'Yang bermasalah', rekonKet: function (a) { return 'Baris disebut "nilai menyimpang" kalau rasio invoicenya berbeda lebih dari ' + a + ' dari median mitranya. Rasionya terhadap retail tanpa pajak atau terhadap wholesale, mana yang paling tetap untuk mitra itu.'; },
      bobot: { berat: 'Berat', sedang: 'Periksa', ringan: 'Ringan' },
      jg: { minus: 'Stok sempat minus', unit: 'Unit invoice tidak sama dengan buku besar', nilai: 'Nilai invoice menyimpang dari pola mitra', adjust: 'Penyesuaian opname besar', transit: 'Di jalan lebih lama dari SLA', tanpaHarga: 'Ada stok tanpa harga wholesale' },
      jgKet: 'Aturan tetap, tanpa tebakan. Tidak ada yang dibetulkan otomatis.', bersih: 'Tidak ada angka janggal.', lagi: function (n) { return '+' + n + ' lagi'; },
      slaBatas: 'SLA', rata: 'Rata-rata', tepat: 'Tepat waktu', diJalan: 'Masih di jalan', kirim: 'Kirim', tiba: 'Tiba', ke: 'Ke', pcs: 'pcs', lama: 'Hari', lewat: 'Lewat', aman: 'Tepat',
      kembaliKet: function (n, p) { return n + ' gerakan, ' + p + ' pcs, kembali ke HO dari jalan dan tidak dihitung sebagai kiriman.'; }, tanpaKiriman: 'Belum ada kiriman di buku besar.', umur: 'Umur',
      returBatas: 'Batas terima retur', returKet: 'Paket retur harus diterima kembali dan diperiksa dalam batas ini. Paket yang terlalu lama di jalan belum punya kabar diterima atau retur.',
      returJudul: 'Paket retur', jalanJudul: 'Terlalu lama di jalan', returBelum: 'Data gudang Shopee belum terbaca.', returKosong: 'Tidak ada paket retur.', jalanKosong: 'Tidak ada yang terlalu lama di jalan.',
      per: 'Data per'
    }
  };
  function t(k) { var d = TEKS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TEKS.en[k]; }

  /* ================= setelan ================= */
  var KUNCI = 'wms_kontrol_atur', KUNCI_MARGIN = 'wms_katalog_margin';
  function bacaAtur() {
    var a = {}; try { a = JSON.parse(W.localStorage.getItem(KUNCI) || '{}') || {}; } catch (e) { a = {}; }
    var o = { feeShopee: a.feeShopee, slaKirim: a.slaKirim, slaRetur: a.slaRetur, marginMitra: a.marginMitra && typeof a.marginMitra === 'object' ? a.marginMitra : {} };
    try { var m = W.localStorage.getItem(KUNCI_MARGIN), n = Number(m); if (m != null && m !== '' && n >= 0 && n < 95) o.marginPutus = n / 100; } catch (e) {}
    return o;
  }
  function simpanAtur(o) {
    try { W.localStorage.setItem(KUNCI, JSON.stringify({ feeShopee: o.feeShopee, slaKirim: o.slaKirim, slaRetur: o.slaRetur, marginMitra: o.marginMitra || {} })); } catch (e) {}
    try { if (o.marginPutus != null) W.localStorage.setItem(KUNCI_MARGIN, String(Math.round(o.marginPutus * 1000) / 10)); } catch (e) {}
  }

  /* ================= data ================= */
  var D = { dp: null, sp: null, tg: null, tgSelesai: false, janji: null, waktu: 0 };
  function muat(paksa) {
    if (D.janji && !paksa && Date.now() - D.waktu < 5 * 60 * 1000) return D.janji;
    D.waktu = Date.now(); D.tgSelesai = false;
    var m = M();
    var pDp = m.jalan ? m.jalan('dataPapan', ['WMS-TIKET']) : Promise.reject(new Error('jalan'));
    var pSp = m.potret ? m.potret(['obdSpData|["K"]']).then(function (isi) { var x = isi['obdSpData|["K"]']; return x && x.data ? x.data : null; }, function () { return null; }) : Promise.resolve(null);
    D.janji = Promise.all([pDp, pSp]).then(function (h) {
      if (!h[0] || !h[0].lok) throw new Error('data');
      D.dp = h[0]; D.sp = h[1]; return D;
    }).catch(function (e) { D.janji = null; throw e; });
    if (m.jalan) m.jalan('permintaanDanPiutang', ['WMS-TIKET']).then(function (x) { D.tg = x && x.tagihan ? x.tagihan : null; }, function () { D.tg = null; }).then(function () { D.tgSelesai = true; if (D.dp && A.terbuka) gambarIsi(); });
    else D.tgSelesai = true;
    return D.janji;
  }
  function H() { var o = bacaAtur(); return hitung(D.dp, { sp: D.sp, tg: D.tg, opsi: o }); }

  /* ================= lembar ================= */
  var A = { tab: 'tutup', terbuka: false, dari: null, rekonSaring: 'semua', cari: '', draf: null };
  var TAB = ['tutup', 'rapor', 'margin', 'rekon', 'janggal', 'sla', 'retur'];
  var IKON_TUTUP = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var IKON_ST = {
    beres: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
    tindak: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 6v7M12 17.5v.5"/></svg>',
    belum: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M7 12h10"/></svg>'
  };
  function pastikanDom() {
    if (el('kontrol')) return el('kontrol');
    var d = document.createElement('div');
    d.id = 'kontrol'; d.className = 'alat-latar kontrol-latar'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="lembar" role="dialog" aria-modal="true" tabindex="-1"><div id="kontrolKepala"></div><div id="kontrolIsi" class="kn-isi"></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      if (e.target === d) { tutup(); return; }
      var x = e.target.closest ? e.target.closest('[data-kontrol],[data-kontrol-tab],[data-kontrol-ke],[data-draf],[data-draf-tutup],[data-draf-salin],[data-rekon-saring]') : null;
      if (!x) return;
      if (x.hasAttribute('data-kontrol-tab')) { bunyi('klik'); A.tab = x.getAttribute('data-kontrol-tab'); A.draf = null; gambarKepala(); gambarIsi(); return; }
      if (x.hasAttribute('data-rekon-saring')) { bunyi('klik'); A.rekonSaring = x.getAttribute('data-rekon-saring'); gambarIsi(); return; }
      if (x.hasAttribute('data-kontrol-ke')) { pergi(x.getAttribute('data-kontrol-ke')); return; }
      if (x.hasAttribute('data-draf')) { bunyi('klik'); var w = x.closest('[data-rapor]'); A.draf = { jenis: x.getAttribute('data-draf'), r: w ? w.getAttribute('data-rapor') : '' }; gambarIsi(); var ta = el('knDrafIsi'); if (ta) try { ta.focus(); } catch (er) {} return; }
      if (x.hasAttribute('data-draf-tutup')) { bunyi('klik'); A.draf = null; gambarIsi(); return; }
      if (x.hasAttribute('data-draf-salin')) { salinDraf(x); return; }
      var a = x.getAttribute('data-kontrol');
      if (a === 'tutup') tutup(); else if (a === 'ulang') { bunyi('klik'); gambar(true); }
    });
    d.addEventListener('input', function (e) {
      var g = e.target; if (!g) return;
      if (g.id === 'knCariSku') { A.cari = g.value; gambarMarginTabel(); }
      if (g.id === 'knDrafIsi' || g.id === 'knDrafSubjek') perbaruiSurel();
    });
    d.addEventListener('change', function (e) {
      var g = e.target; if (!g) return;
      var o = bacaAtur(), n = Number(String(g.value).replace(',', '.'));
      var km = g.getAttribute && g.getAttribute('data-margin-input');
      if (km) {
        if (!(n >= 0 && n < 95)) { gambarIsi(); return; }
        if (km === 'shopee') o.feeShopee = n / 100; else if (km === 'putus') o.marginPutus = n / 100; else { o.marginMitra = o.marginMitra || {}; o.marginMitra[km] = n / 100; }
      }
      else if (g.id === 'knSlaKirim') { if (n >= 0 && n <= 60) o.slaKirim = Math.round(n); }
      else if (g.id === 'knSlaRetur') { if (n >= 0 && n <= 60) o.slaRetur = Math.round(n); }
      else return;
      simpanAtur(o); gambarIsi();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('buka')) { e.preventDefault(); if (A.draf) { A.draf = null; gambarIsi(); } else tutup(); } });
    return d;
  }
  function buka(tab) {
    var d = pastikanDom();
    if (tab && TAB.indexOf(tab) > -1) A.tab = tab;
    if (!d.classList.contains('buka')) A.dari = document.activeElement;
    A.terbuka = true; A.draf = null;
    d.classList.add('buka'); d.setAttribute('aria-hidden', 'false'); document.body.classList.add('alat-terbuka');
    d.querySelector('.lembar').setAttribute('aria-label', t('judul'));
    bunyi('klik');
    gambar(false);
  }
  function tutup() {
    var d = el('kontrol'); if (!d) return;
    A.terbuka = false; A.draf = null;
    d.classList.remove('buka'); d.setAttribute('aria-hidden', 'true'); document.body.classList.remove('alat-terbuka');
    try { if (A.dari && A.dari.focus) A.dari.focus(); } catch (e) {}
  }
  function pergi(ke) {
    var p = String(ke || '').split(':');
    if (p[0] === 'tab' && TAB.indexOf(p[1]) > -1) { bunyi('klik'); A.tab = p[1]; A.draf = null; gambarKepala(); gambarIsi(); return; }
    if (p[0] === 'hal') {
      var fw = null; try { fw = M().PAPAN && M().PAPAN.bingkai && M().PAPAN.bingkai.contentWindow; } catch (e) { fw = null; }
      tutup();
      try { if (fw && typeof fw.gambar === 'function') { fw.HAL = p[1]; fw.gambar(); fw.scrollTo(0, 0); } } catch (e) {}
    }
  }
  function gambar(paksa) {
    gambarKepala();
    var isi = el('kontrolIsi');
    isi.innerHTML = '<p class="ket-alat">' + esc(t('muat')) + '</p>';
    muat(paksa).then(function () { gambarIsi(); }, function () {
      var w = el('kontrolIsi'); if (w) w.innerHTML = '<div class="tolak-alat" role="alert">' + esc(t('gagal')) + ' <button type="button" class="btn dua" data-kontrol="ulang">↻</button></div>';
    });
  }
  function gambarKepala() {
    var k = el('kontrolKepala'); if (!k) return;
    k.innerHTML = '<div class="kepala-alat kn-kepala"><div class="kn-judul"><h2>' + esc(t('judul')) + '</h2><small>' + esc(t('sub')) + '</small></div>' +
      '<button type="button" class="tutup-alat" data-kontrol="tutup" aria-label="' + esc(t('tutup')) + '" title="' + esc(t('tutup')) + '">' + IKON_TUTUP + '</button></div>' +
      '<div class="tab-alat kn-tab" role="tablist">' + TAB.map(function (x) { return '<button type="button" role="tab" data-kontrol-tab="' + x + '" aria-selected="' + (A.tab === x) + '" class="' + (A.tab === x ? 'on' : '') + '">' + esc(t('tab')[x]) + '</button>'; }).join('') + '</div>';
  }
  function gambarIsi() {
    var w = el('kontrolIsi'); if (!w || !D.dp) return;
    var h = H(), s = '';
    if (A.tab === 'tutup') s = halTutup(h);
    else if (A.tab === 'rapor') s = halRapor(h);
    else if (A.tab === 'margin') s = halMargin(h);
    else if (A.tab === 'rekon') s = halRekon(h);
    else if (A.tab === 'janggal') s = halJanggal(h);
    else if (A.tab === 'sla') s = halSla(h);
    else s = halRetur(h);
    w.innerHTML = s + (h.diperbarui ? '<p class="ket-alat kn-per">' + esc(t('per')) + ' ' + esc(h.diperbarui) + '.</p>' : '');
    if (A.tab === 'margin') gambarMarginTabel(h);
  }
  function chip(teks, jenis) { return '<span class="kn-chip ' + (jenis || '') + '">' + esc(teks) + '</span>'; }
  function kpi(label, nilai, ket, kelas) { return '<div class="kn-kpi ' + (kelas || '') + '"><span>' + esc(label) + '</span><b>' + nilai + '</b>' + (ket ? '<small>' + esc(ket) + '</small>' : '') + '</div>'; }
  function namaKode(h, k) { var l = h.L.filter(function (x) { return x.k === k; })[0]; return l && toko(l) ? namaGerai(l) + ' (' + k + ')' : k; }

  /* ---------- tutup bulan ---------- */
  function halTutup(h) {
    var R = t('rinci'), beres = h.tutup.filter(function (x) { return x.status === 'beres'; }).length, n = h.tutup.length;
    var per = namaBulan(h.bulanTutup, id());
    var s = '<div class="kn-baris-judul"><h3 class="kn-bulan">' + esc(t('tutupJudul')) + ' · ' + esc(per) + '</h3><span class="kn-progres"><span class="kn-progres-isi" style="width:' + Math.round(beres / n * 100) + '%"></span></span><b class="kn-progres-teks">' + esc(t('dari')(beres, n)) + '</b></div><ol class="kn-daftar">';
    h.tutup.forEach(function (x) {
      var rinci = '';
      if (x.status === 'belum') rinci = x.kode === 'tagihan' ? R.belumTagihan : x.kode === 'opname' ? R.belumOpname : R.belumUmum;
      else if (x.status === 'tindak') {
        if (x.kode === 'laporan') rinci = R.laporan(x.rincian.map(function (k) { return namaKode(h, k); }));
        else if (x.kode === 'rekon') rinci = R.rekon(x.jml);
        else if (x.kode === 'transit') rinci = R.transit(x.jml, per);
        else if (x.kode === 'opname') rinci = R.opname(x.rincian);
        else if (x.kode === 'tagihan') rinci = R.tagihan(x.rincian.map(namaRetailer));
        else if (x.kode === 'otomatis') rinci = R.otomatis(x.rincian);
        else if (x.kode === 'kualitas') rinci = R.kualitas(x.jml);
        else if (x.kode === 'janggalBerat') rinci = R.janggalBerat(x.jml);
      }
      s += '<li class="kn-butir st-' + x.status + '" data-kontrol-item="' + x.kode + '" data-status="' + x.status + '"><span class="kn-tanda" aria-hidden="true">' + IKON_ST[x.status] + '</span>' +
        '<div class="kn-butir-teks"><b>' + esc(t('butir')[x.kode]) + '</b>' + (rinci ? '<small>' + esc(rinci) + '</small>' : '') + '</div>' +
        '<span class="kn-butir-kanan">' + chip(t('st')[x.status], 'st-' + x.status) + (x.status !== 'beres' && x.ke ? '<button type="button" class="btn dua kn-kecil" data-kontrol-ke="' + esc(x.ke) + '">' + esc(t('buka')) + '</button>' : '') + '</span></li>';
    });
    return s + '</ol>';
  }

  /* ---------- rapor ---------- */
  function halRapor(h) {
    var per = namaBulan(h.bulanTutup, id()), s = '<div class="kn-rapor-grid">';
    h.rapor.forEach(function (r) {
      var lap = r.laporan ? (r.laporan.telat ? t('telat')(r.laporan.hariDiam) : t('tepatWaktu')) : t('tanpaData');
      var piu = r.piutang ? rp(r.piutang.belum) : t('belumTagih');
      s += '<section class="kn-rapor" data-rapor="' + esc(r.r) + '"><header class="kn-rapor-kepala"><div><h3>' + esc(namaRetailer(r.r)) + '</h3><small>' + esc(per) + ' · ' + esc(t('jmlGerai')(r.gerai)) + '</small></div>' +
        '<span class="kn-nilai-bungkus nilai-' + r.nilaiRapor + '"><span class="kn-nilai">' + r.nilaiRapor + '</span><small>' + esc(t('skor')) + ' ' + r.skor + '</small></span></header>' +
        '<div class="kn-kpi-grid">' +
          kpi(t('terjual'), nf(r.unit) + ' pcs', rp(r.nilai)) +
          kpi(t('st2'), persen0(r.sellThrough), nf(r.rakAkhir) + ' pcs ' + t('rak').toLowerCase(), r.sellThrough != null && r.sellThrough < 0.35 ? 'awas' : '') +
          kpi(t('tutupan'), r.tutupan == null ? '-' : nf(r.tutupan), t('hari')) +
          kpi(t('mati'), nf(r.mati), 'SKU', r.mati ? 'awas' : '') +
          kpi(t('laporan'), esc(lap), '', 'teks' + (r.laporan && r.laporan.telat ? ' awas' : '')) +
          kpi(t('piutang'), esc(piu), r.piutang && r.piutang.lewat ? rp(r.piutang.lewat) + ' ' + t('lewatTempo') : '', (r.piutang ? '' : 'teks') + (r.piutang && r.piutang.lewat ? ' awas' : '')) +
        '</div>' +
        '<div class="kn-gulir"><table class="kn-tabel"><thead><tr><th>' + esc(t('gerai')) + '</th><th class="ka">' + esc(t('terjual')) + '</th><th class="ka">' + esc(t('nilaiInv')) + '</th><th class="ka">' + esc(t('rak')) + '</th></tr></thead><tbody>' +
        r.daftarGerai.map(function (g) { return '<tr><td>' + esc(g.n) + ' <small>' + esc(g.k) + '</small></td><td class="ka">' + nf(g.unit) + '</td><td class="ka">' + (g.ada ? rp(g.nilai) : '<span class="kn-mut">-</span>') + '</td><td class="ka">' + nf(g.rak) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' +
        '<div class="kn-draf-tombol">' + ['laporan', 'rekon', 'tagihan', 'isiUlang'].map(function (j) { return '<button type="button" class="btn dua kn-kecil" data-draf="' + j + '">' + esc(t('draf')[j]) + '</button>'; }).join('') + '</div>' +
        (A.draf && A.draf.r === r.r ? panelDraf(h) : '') + '</section>';
    });
    return s + '</div>';
  }
  function panelDraf(h) {
    var d = draf(A.draf.jenis, A.draf.r, h);
    return '<div class="kn-draf" id="knDraf"><div class="kn-draf-kepala"><b>' + esc(t('drafJudul')) + ' · ' + esc(t('draf')[A.draf.jenis].replace(/^[^:]*:\s*/, '')) + '</b><button type="button" class="tutup-alat" data-draf-tutup="1" aria-label="' + esc(t('tutup')) + '">' + IKON_TUTUP + '</button></div>' +
      '<label class="kn-lbl" for="knDrafSubjek">' + esc(t('subjek')) + '</label><input id="knDrafSubjek" type="text" value="' + esc(d.subjek) + '">' +
      '<label class="kn-lbl" for="knDrafIsi">' + esc(t('isi')) + '</label><textarea id="knDrafIsi" rows="12" spellcheck="false">' + esc(d.isi) + '</textarea>' +
      '<div class="kn-draf-aksi"><button type="button" class="btn" data-draf-salin="1">' + esc(t('salin')) + '</button><a class="btn dua" data-draf-surel="1" href="' + esc(alamatSurel(d.subjek, d.isi)) + '">' + esc(t('surel')) + '</a></div>' +
      '<p class="ket-alat">' + esc(t('drafKet')) + '</p></div>';
  }
  function alamatSurel(subjek, isi) { return 'mailto:?subject=' + encodeURIComponent(subjek) + '&body=' + encodeURIComponent(isi); }
  function perbaruiSurel() { var a = document.querySelector('#kontrol [data-draf-surel]'), s = el('knDrafSubjek'), i = el('knDrafIsi'); if (a && s && i) a.setAttribute('href', alamatSurel(s.value, i.value)); }
  function salinDraf(tombol) {
    var s = el('knDrafSubjek'), i = el('knDrafIsi'); if (!i) return;
    var teks = (s ? s.value + '\n\n' : '') + i.value;
    var jadi = function () { bunyi('sukses'); tombol.textContent = t('disalin'); setTimeout(function () { if (tombol.isConnected) tombol.textContent = t('salin'); }, 1600); };
    var cadangan = function () { try { i.focus(); i.select(); if (document.execCommand && document.execCommand('copy')) jadi(); } catch (e) {} };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(jadi, cadangan); else cadangan(); } catch (e) { cadangan(); }
  }

  /* ---------- margin ---------- */
  function persenRingkas(x) { var v = Math.round(x * 1000) / 10; return (v % 1 === 0 ? String(v) : (id() ? String(v).replace('.', ',') : String(v))) + '%'; }
  function judulSaluran(k) { return k === 'putus' || k === 'shopee' || k === 'gamotion' ? t(k) : namaRetailer(k); }
  function halMargin(h) {
    return '<div class="kn-atur"><span class="kn-atur-judul">' + esc(t('aturMargin')) + '</span>' +
      h.margin.saluran.map(function (x) {
        return '<label class="kn-isian"><span>' + esc(judulSaluran(x.k)) + '</span><input data-margin-input="' + esc(x.k) + '" type="number" inputmode="decimal" min="0" max="90" step="0.5" value="' + esc(Math.round(x.m * 1000) / 10) + '"><b>%</b></label>';
      }).join('') +
      '<input id="knCariSku" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t('cariSku')) + '" aria-label="' + esc(t('cariSku')) + '" value="' + esc(A.cari) + '">' +
      '</div><div id="knMarginTabel"></div><p class="ket-alat kn-dasar">' + esc(t('dasarMargin')) + '</p>';
  }
  function gambarMarginTabel(h) {
    var w = el('knMarginTabel'); if (!w || !D.dp) return;
    h = h || H();
    var q = String(A.cari || '').trim().toLowerCase();
    var baris = h.margin.baris.filter(function (b) { return !q || String(b.n || '').toLowerCase().indexOf(q) > -1 || String(b.s || '').toLowerCase().indexOf(q) > -1 || String(b.b || '').indexOf(q) > -1; });
    var kol = h.margin.saluran;
    var sel = function (x) { if (!x) return '<span class="kn-mut">-</span>'; return '<span class="kn-harga" title="' + esc(t('hargaJual')) + '">' + rp(x.harga) + '</span><span class="kn-net" title="' + esc(t('bersih')) + '">' + rp(x.net) + '</span>'; };
    w.innerHTML = '<div class="kn-gulir"><table class="kn-tabel kn-margin"><thead><tr><th>SKU</th><th class="ka">' + esc(t('modal')) + '</th>' +
      kol.map(function (x) { return '<th class="ka">' + esc(judulSaluran(x.k)) + '<span class="kn-m pos">' + persenRingkas(x.m) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      baris.map(function (b) { return '<tr data-margin-sku="' + esc(b.s) + '"><td class="kn-sku"><b>' + esc(namaPendek(b.n)) + '</b><small>' + esc(b.s) + '</small></td><td class="ka">' + (b.wholesale > 0 ? rp(b.wholesale) : '-') + '</td>' + kol.map(function (x) { return '<td class="ka" data-saluran="' + esc(x.k) + '">' + sel(b.saluran[x.k]) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div><p class="kn-legenda"><span class="kn-harga">' + esc(t('hargaJual')) + '</span> <span class="kn-net">' + esc(t('bersih')) + '</span></p>';
  }

  /* ---------- rekonsiliasi ---------- */
  function halRekon(h) {
    var S = t('stRekon'), K = t('rk');
    var rows = h.rekon.filter(function (r) { return A.rekonSaring === 'semua' || r.status !== 'cocok'; });
    var jenis = function (st) { return st === 'cocok' ? 'st-beres' : st === 'nilaiMenyimpang' ? 'st-belum' : 'st-tindak'; };
    return '<div class="kn-saring" role="group">' + ['semua', 'masalah'].map(function (x) { return '<button type="button" class="chip-alat' + (A.rekonSaring === x ? ' on' : '') + '" data-rekon-saring="' + x + '" aria-pressed="' + (A.rekonSaring === x) + '">' + esc(t(x)) + '</button>'; }).join('') + '</div>' +
      '<div class="kn-gulir"><table class="kn-tabel"><thead><tr><th>' + esc(K.bulan) + '</th><th>' + esc(t('gerai')) + '</th><th class="ka">' + esc(K.unitInv) + '</th><th class="ka">' + esc(K.unitBuku) + '</th><th class="ka">' + esc(K.nilai) + '</th><th class="ka">' + esc(K.rasio) + '</th><th>' + esc(K.status) + '</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr data-rekon="' + esc(r.bulan + '|' + r.gerai) + '" data-status="' + r.status + '"><td>' + esc(namaBulan(r.bulan, id())) + '</td><td>' + esc(namaKode(h, r.gerai)) + '</td><td class="ka">' + nf(r.unitInv) + '</td><td class="ka">' + nf(r.unitBuku) + '</td><td class="ka">' + (r.nilai ? rp(r.nilai) : '-') + '</td>' +
          '<td class="ka">' + (r.rasio != null ? persen1(r.rasio) + (r.norma != null ? ' / ' + persen1(r.norma) : '') : '-') + '</td><td>' + chip(S[r.status], jenis(r.status)) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="ket-alat">' + esc(t('rekonKet')(persen1(h.opsi.ambangNilai))) + '</p>';
  }

  /* ---------- angka janggal ---------- */
  function halJanggal(h) {
    if (!h.janggal.length) return '<div class="kn-kosong">' + esc(t('bersih')) + '</div><p class="ket-alat">' + esc(t('jgKet')) + '</p>';
    return '<div class="kn-janggal">' + h.janggal.map(function (j) {
      var tampil = j.rincian.slice(0, 6);
      return '<article class="kn-temuan bobot-' + j.bobot + '" data-janggal="' + j.kode + '"><div class="kn-temuan-kepala">' + chip(t('bobot')[j.bobot], j.bobot === 'berat' ? 'st-tindak' : j.bobot === 'sedang' ? 'st-belum' : '') + '<b>' + esc(t('jg')[j.kode]) + '</b><span class="kn-jml">' + nf(j.jml) + '</span></div>' +
        '<ul>' + tampil.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + (j.rincian.length > 6 ? '<li class="kn-mut">' + esc(t('lagi')(j.rincian.length - 6)) + '</li>' : '') + '</ul></article>';
    }).join('') + '</div><p class="ket-alat">' + esc(t('jgKet')) + '</p>';
  }

  /* ---------- SLA ---------- */
  function halSla(h) {
    var s = h.sla, o = h.opsi;
    var hasil = '<div class="kn-atur"><label class="kn-isian" for="knSlaKirim"><span>' + esc(t('slaBatas')) + '</span><input id="knSlaKirim" type="number" inputmode="numeric" min="0" max="60" step="1" value="' + esc(o.slaKirim) + '"><b>' + esc(t('hari')) + '</b></label></div>' +
      '<div class="kn-kpi-grid">' + kpi(t('rata'), s.rata == null ? '-' : String(s.rata).replace('.', id() ? ',' : '.'), t('hari')) + kpi(t('tepat'), persen0(s.tepat), s.kiriman.length + ' ' + (id() ? 'kiriman' : 'deliveries'), s.tepat != null && s.tepat < 0.9 ? 'awas' : '') +
      kpi(t('diJalan'), nf(s.terbuka.reduce(function (a, x) { return a + x.pcs; }, 0)) + ' pcs', s.terbuka.length ? t('umur') + ' ' + Math.max.apply(null, s.terbuka.map(function (x) { return x.umur; })) + ' ' + t('hari') : '', s.terbuka.some(function (x) { return x.lewat; }) ? 'awas' : '') + '</div>';
    if (s.terbuka.length) hasil += '<div class="kn-gulir"><table class="kn-tabel"><thead><tr><th>' + esc(t('diJalan')) + '</th><th class="ka">' + esc(t('pcs')) + '</th><th class="ka">' + esc(t('umur')) + '</th><th></th></tr></thead><tbody>' +
      s.terbuka.map(function (x) { return '<tr data-sla-terbuka="' + esc(x.kirim) + '"><td>' + esc(tglPendek(x.kirim)) + '</td><td class="ka">' + nf(x.pcs) + '</td><td class="ka">' + nf(x.umur) + ' ' + esc(t('hari')) + '</td><td>' + chip(x.lewat ? t('lewat') : t('aman'), x.lewat ? 'st-tindak' : 'st-beres') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    hasil += s.kiriman.length ? '<div class="kn-gulir"><table class="kn-tabel"><thead><tr><th>' + esc(t('kirim')) + '</th><th>' + esc(t('tiba')) + '</th><th>' + esc(t('ke')) + '</th><th class="ka">' + esc(t('pcs')) + '</th><th class="ka">' + esc(t('lama')) + '</th><th></th></tr></thead><tbody>' +
      s.kiriman.map(function (x) { return '<tr data-sla="' + esc(x.kirim + '>' + x.ke) + '"><td>' + esc(tglPendek(x.kirim)) + '</td><td>' + esc(tglPendek(x.tiba)) + '</td><td>' + esc(namaKode(h, x.ke)) + '</td><td class="ka">' + nf(x.pcs) + '</td><td class="ka">' + nf(x.hari) + '</td><td>' + chip(x.lewat ? t('lewat') : t('aman'), x.lewat ? 'st-tindak' : 'st-beres') + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<div class="kn-kosong">' + esc(t('tanpaKiriman')) + '</div>';
    if (s.kembali.length) hasil += '<p class="ket-alat">' + esc(t('kembaliKet')(s.kembali.length, s.kembali.reduce(function (a, x) { return a + x.pcs; }, 0))) + '</p>';
    return hasil;
  }

  /* ---------- retur Shopee ---------- */
  function halRetur(h) {
    var r = h.retur;
    var s = '<div class="kn-atur"><label class="kn-isian" for="knSlaRetur"><span>' + esc(t('returBatas')) + '</span><input id="knSlaRetur" type="number" inputmode="numeric" min="0" max="60" step="1" value="' + esc(h.opsi.slaRetur) + '"><b>' + esc(t('hari')) + '</b></label></div><p class="ket-alat">' + esc(t('returKet')) + '</p>';
    if (!r.ada) return s + '<div class="kn-kosong">' + esc(t('returBelum')) + '</div>';
    s += '<h3 class="kn-subjudul">' + esc(t('returJudul')) + '</h3>';
    s += r.daftar.length ? '<div class="kn-gulir"><table class="kn-tabel"><thead><tr><th>No</th><th>Resi</th><th class="ka">' + esc(t('umur')) + '</th><th></th></tr></thead><tbody>' +
      r.daftar.map(function (x) { return '<tr data-retur="' + esc(x.ref) + '"><td><b>' + esc(x.ref) + '</b></td><td>' + esc(x.resi || '-') + '</td><td class="ka">' + (x.umur == null ? '-' : nf(x.umur) + ' ' + esc(t('hari'))) + '</td><td>' + chip(x.lewat ? t('lewat') : t('aman'), x.lewat ? 'st-tindak' : 'st-beres') + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<div class="kn-kosong">' + esc(t('returKosong')) + '</div>';
    s += '<h3 class="kn-subjudul">' + esc(t('jalanJudul')) + ' (&gt; ' + r.lewatJalan + ' ' + esc(t('hari')) + ')</h3>';
    s += r.jalanLama.length ? '<div class="kn-gulir"><table class="kn-tabel"><thead><tr><th>No</th><th>Resi</th><th class="ka">' + esc(t('umur')) + '</th></tr></thead><tbody>' +
      r.jalanLama.map(function (x) { return '<tr data-jalan="' + esc(x.ref) + '"><td><b>' + esc(x.ref) + '</b></td><td>' + esc(x.resi || '-') + (x.jasa ? ' <small>' + esc(x.jasa) + '</small>' : '') + '</td><td class="ka">' + nf(x.umur) + ' ' + esc(t('hari')) + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<div class="kn-kosong">' + esc(t('jalanKosong')) + '</div>';
    return s;
  }

  W.WmsKontrol = { buka: buka, tutup: tutup, _hitung: hitung, _draf: draf };
})();
