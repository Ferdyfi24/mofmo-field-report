/* Laporan bulanan WMS Mofmofriends (11 Okt 2026): PPT dari buku besar.
 *
 * Ferdy: "report sales bulanan, report inventory movement, inventory
 * condition, sku performance, channel performance, trus ada opsi gabungin".
 *  - Semua angka dihitung dari baris buku besar dataPapan (sama dengan papan),
 *    untuk satu bulan kalender. Nilai = qty x wholesale termasuk PPN SKU itu.
 *  - Saldo awal bulan = saldo buku besar sebelum tanggal 1, bukan stok hari ini.
 *    OPENING (saldo pembukaan) dan perpindahan antarlokasi tidak dihitung
 *    sebagai barang masuk dari principal.
 *  - Umur stok di gerai memakai lot FIFO, sama dengan SLA kiriman di Kontrol.
 *  - Versi principal tanpa komisi OLS dan tanpa margin mitra.
 *  - Berkas dibuat di browser dengan PptxGenJS 3.12.0 (MIT) yang disimpan di
 *    situs ini sendiri (vendor/pptxgen.bundle.js), dimuat saat Unduh ditekan.
 *    Grafik dan tabelnya asli PowerPoint, jadi bisa diedit. Mode pisah
 *    menghasilkan satu .zip berisi satu PPT per laporan.
 * Lembar ini cuma membaca; tidak ada yang ditulis ke sistem.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !!(M().bhs && M().bhs() === 'id'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return W.document ? W.document.getElementById(i) : null; }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function ribu(n, pemisah) { var s = String(Math.round(Math.abs(Number(n) || 0))); return s.replace(/\B(?=(\d{3})+(?!\d))/g, pemisah); }
  function angka(n) { return (Number(n) < 0 ? '-' : '') + ribu(n, id() ? '.' : ','); }
  function rp(n) { return (Number(n) < 0 ? '-' : '') + 'Rp' + ribu(n, id() ? '.' : ','); }
  function persen(x, des) { if (x == null || !isFinite(x)) return '-'; var v = (Math.round(x * (des ? 1000 : 100)) / (des ? 10 : 1)); var s = des ? v.toFixed(1) : String(v); if (des && /\.0$/.test(s)) s = s.slice(0, -2); return (id() ? s.replace('.', ',') : s) + '%'; }
  function bertanda(n) { return (n > 0 ? '+' : n < 0 ? '-' : '') + ribu(n, id() ? '.' : ','); }

  /* ================= tanggal ================= */
  function tglUTC(s) { var p = String(s).slice(0, 10).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function selisihHari(a, b) { return Math.round((tglUTC(b) - tglUTC(a)) / 86400000); }
  function geserHari(s, n) { var d = new Date(tglUTC(s) + n * 86400000); return d.toISOString().slice(0, 10); }
  function geserBulan(b, n) { var y = +b.slice(0, 4), m = +b.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + (m < 9 ? '0' : '') + (m + 1); }
  function akhirBulan(b) { var y = +b.slice(0, 4), m = +b.slice(5, 7); var d = new Date(Date.UTC(y, m, 0)); return d.toISOString().slice(0, 10); }
  var BULAN = { id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
  var BLN3 = { id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  function namaBulan(b, pendek) { var i = +String(b).slice(5, 7) - 1; return pendek ? BLN3[id() ? 'id' : 'en'][i] : BULAN[id() ? 'id' : 'en'][i] + ' ' + String(b).slice(0, 4); }
  function tglPendek(s) { if (!s) return '-'; var d = +s.slice(8, 10), i = +s.slice(5, 7) - 1; return d + ' ' + BLN3[id() ? 'id' : 'en'][i]; }

  /* ================= hitungan ================= */
  var MARGIN_MITRA = { TGI: 0.35, KIY: 0.35, MAA: 0.45, GMT: 0.20 };
  var NAMA_RETAILER = { TGI: 'Toys Kingdom', KIY: 'Kinokuniya', MAA: 'MAA', GMT: 'Gamotion' };
  function toko(l) { return !!(l && (l.toko === 1 || l.toko === '1' || l.toko === true)); }
  function dipegang(l) { return !!l && (l.k === 'HO' || l.k === 'TRANSIT' || l.k === 'GMT' || toko(l)); }
  function grupLokasi(l) { return l.k === 'HO' ? 'HO' : l.k === 'TRANSIT' ? 'TRANSIT' : l.k === 'GMT' ? 'GMT' : 'GERAI'; }
  function grupJual(l) { return toko(l) ? (l.r || l.k) : l.k === 'GMT' ? 'GMT' : 'HO'; }

  function hitung(dp, opsi) {
    opsi = opsi || {};
    var L = dp.lok || [], P = dp.prod || [];
    var B = (dp.baris || []).map(function (b, i) { return { t: String(b[0]).slice(0, 10), pi: b[1], q: Number(b[2]) || 0, d: L[b[3]], k: L[b[4]], dl: b[3], kl: b[4], i: i }; })
      .filter(function (r) { return r.d && r.k && r.q && /^\d{4}-\d{2}-\d{2}$/.test(r.t); })
      .sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : a.i - b.i; });
    var hariIni = String(dp.hariIni || new Date().toISOString().slice(0, 10)).slice(0, 10);
    var bulanIni = hariIni.slice(0, 7);
    var awalData = B.length ? B[0].t.slice(0, 7) : bulanIni;
    var pilihanBulan = []; for (var bb = bulanIni; bb >= awalData && pilihanBulan.length < 36; bb = geserBulan(bb, -1)) pilihanBulan.push(bb);
    var bulan = opsi.bulan && /^\d{4}-\d{2}$/.test(opsi.bulan) ? opsi.bulan : geserBulan(bulanIni, -1);
    var awal = bulan + '-01', akhir = akhirBulan(bulan), bulanLalu = geserBulan(bulan, -1);
    var harga = function (pi) { return Number((P[pi] || {}).h) || 0; };
    var modal = function (pi) { return Number((P[pi] || {}).hs) || 0; };
    var jual = function (r) { return dipegang(r.d) && r.k.k === 'TERJUAL'; };

    /* ---------- sales ---------- */
    var nilaiBulan = function (mm) { var n = 0, p = 0; B.forEach(function (r) { if (jual(r) && r.t.slice(0, 7) === mm) { n += r.q * harga(r.pi); p += r.q; } }); return { nilai: n, pcs: p }; };
    var tren = []; for (var j = 5; j >= 0; j--) { var mm = geserBulan(bulan, -j), x = nilaiBulan(mm); tren.push({ bulan: mm, nilai: x.nilai, pcs: x.pcs }); }
    var ini = tren[5], lalu = tren[4];
    var saldo = function (batas) { /* saldo per lokasi per SKU untuk baris dengan tanggal < batas */
      var s = {}; B.forEach(function (r) { if (r.t >= batas) return; if (dipegang(r.d)) { var a = s[r.dl] = s[r.dl] || {}; a[r.pi] = (a[r.pi] || 0) - r.q; } if (dipegang(r.k)) { var c = s[r.kl] = s[r.kl] || {}; c[r.pi] = (c[r.pi] || 0) + r.q; } });
      return s;
    };
    var jumlah = function (o) { var n = 0; for (var k in o) n += o[k]; return n; };
    var sAwal = saldo(awal), sAkhir = saldo(geserHari(akhir, 1));
    var urutRet = []; L.forEach(function (l) { if (toko(l) && l.r && urutRet.indexOf(l.r) < 0) urutRet.push(l.r); });
    var grupUrut = urutRet.concat(['GMT', 'HO']);
    var stokGrup = function (g, s) { var n = 0; L.forEach(function (l, li) { if (!dipegang(l)) return; if ((g === 'GMT' && l.k === 'GMT') || (toko(l) && (l.r || l.k) === g)) n += jumlah(s[li] || {}); }); return n; };
    var mitra = grupUrut.map(function (g) {
      var o = { k: g, nama: g === 'HO' ? null : (NAMA_RETAILER[g] || g), pcs: 0, nilai: 0, nilaiLalu: 0, sisa: g === 'HO' ? '-' : stokGrup(g, sAkhir), gerai: [] };
      L.forEach(function (l, li) { if (toko(l) && (l.r || l.k) === g) o.gerai.push({ li: li, k: l.k, nama: l.n || l.k, pcs: 0, nilai: 0, sisa: jumlah(sAkhir[li] || {}) }); });
      return o;
    });
    var cariMitra = function (g) { for (var i = 0; i < mitra.length; i++) if (mitra[i].k === g) return mitra[i]; return null; };
    B.forEach(function (r) {
      if (!jual(r)) return;
      var m = cariMitra(grupJual(r.d)); if (!m) return;
      var mm = r.t.slice(0, 7), v = r.q * harga(r.pi);
      if (mm === bulan) { m.pcs += r.q; m.nilai += v; m.gerai.forEach(function (g) { if (g.li === r.dl) { g.pcs += r.q; g.nilai += v; } }); }
      else if (mm === bulanLalu) m.nilaiLalu += v;
    });

    /* ---------- movement ---------- */
    var mov = { awal: 0, principal: 0, pembukaan: 0, adjust: 0, masukLain: 0, terjual: 0, rusak: 0, returPrincipal: 0, keluarLain: 0, akhir: 0 };
    var lok = {}; ['HO', 'TRANSIT', 'GERAI', 'GMT'].forEach(function (g) { lok[g] = { k: g, awal: 0, masuk: 0, keluar: 0, akhir: 0, jual: 0 }; });
    L.forEach(function (l, li) { if (dipegang(l)) { var n = jumlah(sAwal[li] || {}); lok[grupLokasi(l)].awal += n; mov.awal += n; } });
    B.forEach(function (r) {
      if (r.t < awal || r.t > akhir) return;
      var dH = dipegang(r.d), kH = dipegang(r.k);
      if (dH) lok[grupLokasi(r.d)].keluar += r.q;
      if (kH) lok[grupLokasi(r.k)].masuk += r.q;
      if (dH && r.k.k === 'TERJUAL') lok[grupLokasi(r.d)].jual += r.q;
      if (!dH && kH) { var a = r.d.k; if (a === 'PRINCIPAL') mov.principal += r.q; else if (a === 'OPENING') mov.pembukaan += r.q; else if (a === 'ADJUST') mov.adjust += r.q; else mov.masukLain += r.q; }
      else if (dH && !kH) { var z = r.k.k; if (z === 'TERJUAL') mov.terjual += r.q; else if (z === 'RUSAK') mov.rusak += r.q; else if (z === 'ADJUST') mov.adjust -= r.q; else if (z === 'PRINCIPAL') mov.returPrincipal += r.q; else mov.keluarLain += r.q; }
    });
    mov.akhir = mov.awal + mov.principal + mov.pembukaan + mov.adjust + mov.masukLain - mov.terjual - mov.rusak - mov.returPrincipal - mov.keluarLain;
    mov.lokasi = ['HO', 'TRANSIT', 'GERAI', 'GMT'].map(function (g) { var o = lok[g]; o.akhir = o.awal + o.masuk - o.keluar; return o; });

    /* ---------- condition: lot FIFO di gerai ---------- */
    var lot = {}, pernahLaku = {}, lakuTerakhir = {}, lakuBulan = {};
    var jual30 = 0, mulai30 = geserHari(akhir, -29);
    B.forEach(function (r) {
      if (r.t > akhir) return;
      if (toko(r.k)) { var kk = r.kl + '|' + r.pi; (lot[kk] = lot[kk] || []).push({ t: r.t, q: r.q }); }
      if (toko(r.d)) {
        var kd = r.dl + '|' + r.pi, a = lot[kd] || [], sisa = r.q;
        while (sisa > 0 && a.length) { var h = a[0], ambil = Math.min(h.q, sisa); h.q -= ambil; sisa -= ambil; if (!h.q) a.shift(); }
        if (r.k.k === 'TERJUAL') { pernahLaku[kd] = 1; lakuTerakhir[kd] = r.t; if (r.t >= awal) lakuBulan[kd] = 1; if (r.t >= mulai30) jual30 += r.q; }
      }
    });
    var umur = [0, 0, 0, 0], mati = { skuGerai: 0, pcs: 0 }, stokGerai = 0, lambatPer = {};
    Object.keys(lot).forEach(function (k) {
      var a = lot[k], q = 0; a.forEach(function (h) { q += h.q; var u = selisihHari(h.t, akhir); umur[u <= 30 ? 0 : u <= 60 ? 1 : u <= 90 ? 2 : 3] += h.q; });
      if (!q) return;
      stokGerai += q;
      var tertua = selisihHari(a[0].t, akhir);
      if (!pernahLaku[k] && tertua > 30) { mati.skuGerai++; mati.pcs += q; }
      if (!lakuBulan[k]) {
        var pi = +k.split('|')[1], acuan = lakuTerakhir[k] || a[0].t, hr = selisihHari(acuan, akhir);
        var o = lambatPer[pi] = lambatPer[pi] || { pi: pi, sisa: 0, hari: 0 }; o.sisa += q; if (hr > o.hari) o.hari = hr;
      }
    });
    var tutupan = jual30 > 0 ? Math.round(stokGerai / (jual30 / 30)) : null;
    var opn = { dalam: 0, wajib: 0, belum: [] };
    (dp.opname || []).forEach(function (o) {
      if (!o || !o.wajib) return;
      opn.wajib++;
      var t = o.terakhir ? String(o.terakhir).slice(0, 10) : (o.hari != null && isFinite(o.hari) ? geserHari(hariIni, -Number(o.hari)) : '');
      var namaL = o.nama || ((L.filter(function (l) { return l.k === o.kode; })[0] || {}).n) || o.kode;
      if (t && t <= akhir && selisihHari(t, akhir) <= 30) opn.dalam++; else opn.belum.push({ k: o.kode, nama: namaL, terakhir: t && t <= akhir ? t : '' });
    });
    var transitAkhir = 0; L.forEach(function (l, li) { if (l.k === 'TRANSIT') transitAkhir += jumlah(sAkhir[li] || {}); });

    /* ---------- SKU ---------- */
    var perSku = {};
    B.forEach(function (r) {
      if (!jual(r) || r.t.slice(0, 7) !== bulan) return;
      var o = perSku[r.pi] = perSku[r.pi] || { pi: r.pi, pcs: 0, nilai: 0, saluran: {} };
      o.pcs += r.q; o.nilai += r.q * harga(r.pi); o.saluran[grupJual(r.d)] = 1;
    });
    var info = function (pi) { var p = P[pi] || {}; return { s: p.s || p.b || '', n: p.n || p.s || '', b: p.b || '' }; };
    var top = Object.keys(perSku).map(function (k) { return perSku[k]; })
      .sort(function (a, b) { return b.nilai - a.nilai || b.pcs - a.pcs || (info(a.pi).n < info(b.pi).n ? -1 : 1); }).slice(0, 6)
      .map(function (o) { var f = info(o.pi); return { pi: o.pi, s: f.s, n: f.n, pcs: o.pcs, nilai: o.nilai, saluran: Object.keys(o.saluran).length }; });
    var lambat = Object.keys(lambatPer).map(function (k) { return lambatPer[k]; })
      .sort(function (a, b) { return b.sisa - a.sisa || b.hari - a.hari; }).slice(0, 6)
      .map(function (o) { var f = info(o.pi); return { pi: o.pi, s: f.s, n: f.n, sisa: o.sisa, hari: o.hari }; });
    var mulaiAbc = geserBulan(bulan, -2), nilaiAbc = {};
    B.forEach(function (r) { var mm = r.t.slice(0, 7); if (jual(r) && mm >= mulaiAbc && mm <= bulan) nilaiAbc[r.pi] = (nilaiAbc[r.pi] || 0) + r.q * harga(r.pi); });
    var daftarAbc = []; P.forEach(function (p, pi) { if (Number(p.hs) > 0) daftarAbc.push({ pi: pi, v: nilaiAbc[pi] || 0 }); });
    daftarAbc.sort(function (a, b) { return b.v - a.v; });
    var totalAbc = daftarAbc.reduce(function (a, x) { return a + x.v; }, 0), kum = 0;
    var abc = { A: { n: 0, v: 0 }, B: { n: 0, v: 0 }, C: { n: 0, v: 0 } };
    daftarAbc.forEach(function (x, i) {
      var kelas = 'C';
      if (x.v > 0 && totalAbc > 0) { kum += x.v; var f = kum / totalAbc; kelas = (i === 0 || f <= 0.8 + 1e-9) ? 'A' : f <= 0.95 + 1e-9 ? 'B' : 'C'; }
      abc[kelas].n++; abc[kelas].v += x.v;
    });
    ['A', 'B', 'C'].forEach(function (k) { abc[k].porsi = totalAbc > 0 ? Math.round(abc[k].v / totalAbc * 100) : 0; });

    /* ---------- channel ---------- */
    var total = ini.nilai;
    var channel = mitra.map(function (m) {
      var tersedia = 0, terjual = 0;
      if (m.k !== 'HO') {
        L.forEach(function (l, li) {
          if (!((m.k === 'GMT' && l.k === 'GMT') || (toko(l) && (l.r || l.k) === m.k))) return;
          tersedia += jumlah(sAwal[li] || {});
          B.forEach(function (r) { if (r.t >= awal && r.t <= akhir) { if (r.kl === li && dipegang(r.k)) tersedia += r.q; if (r.dl === li && r.k.k === 'TERJUAL') terjual += r.q; } });
        });
      }
      return { k: m.k, nama: m.nama, tersedia: tersedia, terjual: terjual, pcs: m.pcs, nilai: m.nilai, porsi: total > 0 ? Math.round(m.nilai / total * 100) : 0, st: m.k !== 'HO' && tersedia > 0 ? terjual / tersedia : null, margin: MARGIN_MITRA[m.k] != null ? MARGIN_MITRA[m.k] : null };
    });
    var komisi = 0; B.forEach(function (r) { if (jual(r) && r.t.slice(0, 7) === bulan) komisi += r.q * modal(r.pi); });
    komisi = Math.round(komisi * (Number(dp.tarif) > 0 ? Number(dp.tarif) : 0.1));
    var geraiTersedia = 0, geraiJual = 0; channel.forEach(function (x) { if (x.k !== 'HO' && x.k !== 'GMT') { geraiJual += x.terjual; geraiTersedia += x.tersedia; } });

    /* ---------- tindak lanjut (aturan tetap) ---------- */
    var tindak = [];
    if (opn.belum.length) tindak.push({ k: 'opname', teks: TK('tdOpname')(opn.belum.length, opn.belum.map(function (o) { return o.nama; }).slice(0, 3).join(', ')), pemilik: 'GUDANG' });
    if (mati.skuGerai) tindak.push({ k: 'mati', teks: TK('tdMati')(mati.skuGerai, mati.pcs), pemilik: 'SALES' });
    if (transitAkhir > 0) tindak.push({ k: 'transit', teks: TK('tdTransit')(transitAkhir, akhir), pemilik: 'OPS' });
    var sepi = []; mitra.forEach(function (m) { m.gerai.forEach(function (g) { if (!g.pcs && g.sisa > 0) sepi.push(g.nama); }); });
    if (sepi.length) tindak.push({ k: 'gerai', teks: TK('tdSepi')(sepi.length, sepi.slice(0, 3).join(', ')), pemilik: 'OPS' });
    var terakhirData = B.length ? B[B.length - 1].t : '';

    return { bulan: bulan, bulanLalu: bulanLalu, awal: awal, akhir: akhir, pilihanBulan: pilihanBulan, hariIni: hariIni, diperbarui: dp.diperbarui || '',
      sales: { nilai: ini.nilai, pcs: ini.pcs, nilaiLalu: lalu.nilai, pcsLalu: lalu.pcs, tren: tren, mitra: mitra },
      movement: mov, condition: { umur: umur, mati: mati, tutupan: tutupan, stokGerai: stokGerai, opname: opn, transit: transitAkhir },
      sku: { top: top, lambat: lambat, abc: abc }, channel: channel, komisi: komisi, stGerai: geraiTersedia > 0 ? geraiJual / geraiTersedia : null,
      tindak: tindak, terakhirData: terakhirData };
  }

  /* ================= teks ================= */
  var TEKS = {
    en: {
      judul: 'Monthly report', sub: 'Pick the reports, merge them into one PowerPoint or download them one by one. Every number comes from the WMS ledger.', tutup: 'Close',
      periode: 'Period', untuk: 'For', internal: 'Internal OLS', principal: 'Principal E&E', isi: 'Reports', gabung: 'Merge into one PowerPoint',
      gabungYa: 'One file: cover, summary, the chosen reports and follow-ups.', gabungTidak: 'One file per report, each with its own cover, in one .zip.',
      untukKetI: 'The internal version includes OLS commission and partner margins.', untukKetP: 'The principal version leaves out OLS commission and partner margins.',
      jubelio: 'Online sales (Jubelio)', jubelioKet: 'Uploading a Jubelio export comes next. Send one sample export file and it will be added to Sales, SKU and Channel.',
      siap: 'Data readiness', pratinjau: 'Preview', muat: 'Reading the ledger…', gagal: 'The ledger could not be read right now. Check the signal and try again.',
      unduh1: 'Download 1 PPT', unduhN: function (n) { return 'Download ' + n + ' PPT'; }, berkas1: function (n) { return '1 PowerPoint file · ' + n + ' slides'; }, berkasN: function (f, n) { return f + ' PowerPoint files in one .zip · ' + n + ' slides in total'; },
      pilihMin: 'Pick at least one report.', menyiapkan: 'Building the PowerPoint…', gagalBerkas: 'The file could not be made. Try again.', slide: 'slides',
      siapBuku: function (t) { return 'Ledger read up to ' + t; }, siapOpname: function (a, b) { return a + ' of ' + b + ' required locations counted within 30 days'; },
      siapTransit: function (n) { return n + ' pcs still in transit at month end'; }, siapSepi: function (n) { return n + ' stores with stock but no sales this month'; },
      lap: { sales: ['Monthly sales', 'Value and pcs, 6-month trend, by partner and store'], movement: ['Inventory movement', 'Opening, inflow, outflow by reason, closing by location'], condition: ['Inventory condition', 'Stock age, dead stock, days of cover, stock counts'], sku: ['SKU performance', 'Best sellers with photos, slow movers, ABC class'], channel: ['Channel performance', 'Partners, Gamotion, direct: value, share, sell-through'] },
      sl: { sampul: 'Cover', ringkas: 'Summary', sales1: 'Sales this month', sales2: 'By partner and store', mov1: 'Stock flow', mov2: 'By location', con1: 'Stock age and dead stock', con2: 'Stock counts', sku1: 'Best sellers', sku2: 'Slow movers and ABC', ch1: 'Channel performance', tindak: 'Follow-ups' },
      tdOpname: function (n, x) { return 'Schedule a stock count at ' + n + (n === 1 ? ' location' : ' locations') + ' past 30 days: ' + x; }, tdMati: function (n, q) { return 'Review ' + n + ' dead-stock store SKUs (' + q + ' pcs): move them to stores that sell, or promote'; },
      tdTransit: function (q, t) { return 'Confirm the ' + q + ' pcs still in transit on ' + tglPendek(t) + ' reached the stores'; }, tdSepi: function (n, x) { return 'Confirm the sales report of ' + n + (n === 1 ? ' store' : ' stores') + ' with stock but no sales: ' + x; },
      langsung: 'Direct sales (HO)', gerai: 'Partner stores', gudang: 'HO warehouse', transit: 'In transit', gamotion: 'Gamotion'
    },
    id: {
      judul: 'Laporan bulanan', sub: 'Pilih laporan, gabungkan jadi satu PowerPoint atau unduh satu per satu. Semua angka dihitung dari buku besar WMS.', tutup: 'Tutup',
      periode: 'Periode', untuk: 'Untuk', internal: 'Internal OLS', principal: 'Principal E&E', isi: 'Isi laporan', gabung: 'Gabungkan jadi satu PowerPoint',
      gabungYa: 'Satu berkas: sampul, ringkasan, laporan terpilih, dan tindak lanjut.', gabungTidak: 'Satu berkas per laporan, masing-masing bersampul, dalam satu .zip.',
      untukKetI: 'Versi internal memuat komisi OLS dan margin mitra per saluran.', untukKetP: 'Versi principal tanpa komisi OLS dan tanpa margin mitra.',
      jubelio: 'Penjualan online (Jubelio)', jubelioKet: 'Unggah ekspor Jubelio menyusul. Kirim satu contoh berkas ekspornya, nanti masuk ke Sales, SKU, dan Channel.',
      siap: 'Kesiapan data', pratinjau: 'Pratinjau', muat: 'Membaca buku besar…', gagal: 'Buku besar belum bisa dibaca sekarang. Cek sinyal lalu coba lagi.',
      unduh1: 'Unduh 1 PPT', unduhN: function (n) { return 'Unduh ' + n + ' PPT'; }, berkas1: function (n) { return '1 berkas PowerPoint · ' + n + ' slide'; }, berkasN: function (f, n) { return f + ' berkas PowerPoint dalam satu .zip · total ' + n + ' slide'; },
      pilihMin: 'Pilih minimal satu laporan.', menyiapkan: 'Menyusun PowerPoint…', gagalBerkas: 'Berkas belum bisa dibuat. Coba lagi.', slide: 'slide',
      siapBuku: function (t) { return 'Buku besar terbaca sampai ' + t; }, siapOpname: function (a, b) { return a + ' dari ' + b + ' lokasi wajib sudah opname dalam 30 hari'; },
      siapTransit: function (n) { return n + ' pcs masih di jalan per akhir bulan'; }, siapSepi: function (n) { return n + ' gerai punya stok tapi tanpa penjualan bulan ini'; },
      lap: { sales: ['Sales bulanan', 'Nilai dan pcs, tren 6 bulan, per mitra dan gerai'], movement: ['Inventory movement', 'Saldo awal, masuk, keluar per sebab, saldo akhir per lokasi'], condition: ['Inventory condition', 'Umur stok, stok mati, hari tutupan, opname'], sku: ['SKU performance', 'SKU terlaris dengan foto, SKU lambat, kelas ABC'], channel: ['Channel performance', 'Mitra, Gamotion, penjualan langsung: nilai, porsi, sell-through'] },
      sl: { sampul: 'Sampul', ringkas: 'Ringkasan', sales1: 'Penjualan bulan ini', sales2: 'Per mitra dan gerai', mov1: 'Arus stok', mov2: 'Per lokasi', con1: 'Umur stok dan stok mati', con2: 'Opname', sku1: 'SKU terlaris', sku2: 'SKU lambat dan ABC', ch1: 'Kinerja saluran', tindak: 'Tindak lanjut' },
      tdOpname: function (n, x) { return 'Jadwalkan opname di ' + n + ' lokasi yang lewat 30 hari: ' + x; }, tdMati: function (n, q) { return 'Tinjau ' + n + ' SKU-gerai stok mati (' + q + ' pcs): rotasi ke gerai yang laku atau promosi'; },
      tdTransit: function (q, t) { return 'Pastikan ' + q + ' pcs yang masih di jalan per ' + tglPendek(t) + ' sudah diterima gerai'; }, tdSepi: function (n, x) { return 'Konfirmasi laporan penjualan ' + n + ' gerai yang punya stok tapi tanpa penjualan: ' + x; },
      langsung: 'Penjualan langsung (HO)', gerai: 'Gerai mitra', gudang: 'Gudang HO', transit: 'Di jalan', gamotion: 'Gamotion'
    }
  };
  function TK(k) { var d = TEKS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TEKS.en[k]; }

  /* ================= susunan berkas ================= */
  var LAP = ['sales', 'movement', 'condition', 'sku', 'channel'];
  var SLIDE = { sales: ['sales1', 'sales2'], movement: ['mov1', 'mov2'], condition: ['con1', 'con2'], sku: ['sku1', 'sku2'], channel: ['ch1'] };
  var SLUG = { sales: 'sales-bulanan', movement: 'inventory-movement', condition: 'inventory-condition', sku: 'sku-performance', channel: 'channel-performance' };
  function susunSlide(o) {
    var pilih = LAP.filter(function (k) { return (o.pilih || []).indexOf(k) > -1; }), b = o.bulan || '';
    if (!pilih.length) return [];
    if (o.gabung) {
      var s = ['sampul', 'ringkas']; pilih.forEach(function (k) { s = s.concat(SLIDE[k]); }); s.push('tindak');
      return [{ berkas: 'laporan-bulanan-' + b + '.pptx', lap: 'semua', slide: s }];
    }
    return pilih.map(function (k) { return { berkas: SLUG[k] + '-' + b + '.pptx', lap: k, slide: ['sampul'].concat(SLIDE[k]) }; });
  }

  /* ================= PowerPoint ================= */
  var WR = { tinta: '4A3426', redup: '7E6656', aksen: 'F6A26B', aksenTeks: 'A9501C', lembut: 'FCF1E4', peach: 'FFE3CC', krem: 'FFF8EF', garis: 'EFE1CF', seri: 'D7B697', mint: '2F6B52', merah: 'A2404F' };
  var FJ = 'Trebuchet MS', FB = 'Arial';
  function muatPustaka() {
    if (W.PptxGenJS) return Promise.resolve();
    return new Promise(function (ok, gagal) {
      var s = W.document.createElement('script'); s.src = 'vendor/pptxgen.bundle.js'; s.async = true;
      s.onload = function () { W.PptxGenJS ? ok() : gagal(new Error('pustaka')); }; s.onerror = function () { gagal(new Error('pustaka')); };
      W.document.head.appendChild(s);
    });
  }
  function fotoPng(nama) {
    var K = W.KulitPapan; if (!K || !K.fotoSku) return Promise.resolve(null);
    var f = K.fotoSku(nama); if (!f) return Promise.resolve(null);
    var u = (W.__IMG && W.__IMG['sku/' + f + '.webp']) || (K.dasar + 'sku/' + f + '.webp');
    return new Promise(function (ok) {
      var im = new Image(), beres = false, akhir = function (v) { if (!beres) { beres = true; ok(v); } };
      im.onload = function () { try { var cv = W.document.createElement('canvas'); cv.width = im.naturalWidth || 160; cv.height = im.naturalHeight || 160; cv.getContext('2d').drawImage(im, 0, 0); akhir(cv.toDataURL('image/png')); } catch (e) { akhir(null); } };
      im.onerror = function () { akhir(null); }; setTimeout(function () { akhir(null); }, 5000); im.src = u;
    });
  }
  function bangunPptx(H, berkas, o, foto) {
    var pp = new W.PptxGenJS(), I = o.untuk !== 'principal';
    pp.layout = 'LAYOUT_WIDE'; pp.author = 'One Logistics Solutions'; pp.company = 'One Logistics Solutions';
    var judulBerkas = berkas.lap === 'semua' ? (id() ? 'Laporan Bulanan Mofmofriends' : 'Mofmofriends Monthly Report') : TK('lap')[berkas.lap][0];
    pp.title = judulBerkas + ' ' + namaBulan(H.bulan);
    var kaki = 'Mofmofriends · ' + judulBerkas + ' · ' + namaBulan(H.bulan);
    pp.defineSlideMaster({ title: 'ISI', background: { color: 'FFFFFF' }, objects: [
      { line: { x: 0.6, y: 6.95, w: 12.13, h: 0, line: { color: WR.garis, width: 1 } } },
      { text: { text: kaki, options: { x: 0.6, y: 7.0, w: 10, h: 0.32, fontFace: FB, fontSize: 9, color: WR.redup } } }
    ], slideNumber: { x: 12.2, y: 7.0, w: 0.55, h: 0.32, fontFace: FB, fontSize: 9, color: WR.redup, align: 'right' } });
    var nomor = 0;
    var kepala = function (s, tag, judul, sumber) {
      s.addText(tag.toUpperCase(), { shape: pp.ShapeType.roundRect, rectRadius: 0.12, x: 0.6, y: 0.42, w: Math.min(4.6, 0.32 + tag.length * 0.105), h: 0.32, fill: { color: WR.peach }, color: WR.aksenTeks, fontFace: FB, fontSize: 10, bold: true, align: 'center', charSpacing: 1 });
      s.addText(judul, { x: 0.6, y: 0.8, w: 12.1, h: 0.75, fontFace: FJ, fontSize: 26, bold: true, color: WR.tinta, valign: 'top' });
      if (sumber) s.addText(sumber, { x: 0.6, y: 6.55, w: 12.1, h: 0.3, fontFace: FB, fontSize: 9, color: WR.redup, italic: true });
    };
    var ubin = function (s, x, y, w, label, nilai, ket, warna) {
      s.addShape(pp.ShapeType.roundRect, { x: x, y: y, w: w, h: 1.25, rectRadius: 0.12, fill: { color: warna || WR.lembut }, line: { color: warna || WR.lembut } });
      s.addText([{ text: label, options: { fontSize: 11, color: WR.redup, bold: true, breakLine: true } }, { text: nilai, options: { fontSize: 24, color: WR.tinta, bold: true, fontFace: FJ, breakLine: true } }, { text: ket || '', options: { fontSize: 10, color: WR.redup } }],
        { x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 1.1, fontFace: FB, valign: 'top', margin: 0 });
    };
    var tabel = function (s, kepalaKol, baris, opsi) {
      var rows = [kepalaKol.map(function (h, i) { return { text: h, options: { bold: true, color: WR.redup, fontSize: 10, fill: { color: WR.lembut }, align: opsi.kanan && opsi.kanan[i] ? 'right' : 'left' } }; })];
      baris.forEach(function (r) { rows.push(r.sel.map(function (v, i) { return { text: String(v), options: { bold: !!r.tebal, color: r.redup ? WR.redup : WR.tinta, fontSize: opsi.font || 11, align: opsi.kanan && opsi.kanan[i] ? 'right' : 'left', fill: r.isi ? { color: r.isi } : undefined } }; })); });
      s.addTable(rows, { x: opsi.x, y: opsi.y, w: opsi.w, colW: opsi.colW, fontFace: FB, border: { type: 'solid', pt: 0.5, color: WR.garis }, rowH: opsi.rowH || 0.32, margin: 0.05 });
    };
    var nama = function (m) { return m.k === 'HO' ? TK('langsung') : m.nama; };
    var S = H.sales, V = H.movement, C = H.condition, K = H.sku;
    var sl = TK('sl'), ID = id();
    var bikin = {
      sampul: function () {
        var s = pp.addSlide(); s.background = { color: WR.krem };
        s.addShape(pp.ShapeType.ellipse, { x: 8.6, y: 2.2, w: 6.2, h: 6.2, fill: { color: WR.peach }, line: { color: WR.peach } });
        s.addText(berkas.lap === 'semua' ? (ID ? 'LAPORAN BULANAN' : 'MONTHLY REPORT') : TK('lap')[berkas.lap][0].toUpperCase(), { shape: pp.ShapeType.roundRect, rectRadius: 0.12, x: 0.8, y: 0.9, w: 3.2, h: 0.36, fill: { color: WR.peach }, color: WR.aksenTeks, fontFace: FB, fontSize: 11, bold: true, align: 'center' });
        s.addText(judulBerkas, { x: 0.8, y: 1.6, w: 7.6, h: 1.9, fontFace: FJ, fontSize: 44, bold: true, color: WR.tinta, valign: 'top' });
        s.addText(namaBulan(H.bulan), { x: 0.8, y: 3.55, w: 7, h: 0.6, fontFace: FB, fontSize: 22, bold: true, color: WR.aksenTeks });
        s.addText((ID ? 'Disusun oleh One Logistics Solutions untuk ' : 'Prepared by One Logistics Solutions for ') + (I ? (ID ? 'tim internal OLS' : 'the OLS internal team') : 'E&E (principal)') + (ID ? '. Sumber: buku besar WMS, data per ' : '. Source: WMS ledger, data as of ') + (H.terakhirData ? tglPendek(H.terakhirData) + ' ' + H.terakhirData.slice(0, 4) : '-') + '.',
          { x: 0.8, y: 6.0, w: 7, h: 0.8, fontFace: FB, fontSize: 12, color: WR.redup, valign: 'top' });
        var fx = foto.filter(Boolean).slice(0, 2);
        fx.forEach(function (d, i) { s.addImage({ data: d, x: 9.4 + i * 1.9, y: 3.9 - i * 0.5, w: i ? 1.7 : 2.4, h: i ? 1.7 : 2.4 }); });
      },
      ringkas: function () {
        var s = pp.addSlide({ masterName: 'ISI' }), d = S.nilaiLalu ? (S.nilai - S.nilaiLalu) / S.nilaiLalu : null;
        var judul = ID ? ('Penjualan ' + (d == null ? rp(S.nilai) : (d >= 0 ? 'naik ' : 'turun ') + persen(Math.abs(d))) + ', stok ' + (V.akhir >= V.awal ? 'bertambah ' : 'berkurang ') + angka(Math.abs(V.akhir - V.awal)) + ' pcs')
          : ('Sales ' + (d == null ? rp(S.nilai) : (d >= 0 ? 'up ' : 'down ') + persen(Math.abs(d))) + ', stock ' + (V.akhir >= V.awal ? 'up ' : 'down ') + angka(Math.abs(V.akhir - V.awal)) + ' pcs');
        kepala(s, sl.ringkas, judul);
        ubin(s, 0.6, 1.75, 2.9, ID ? 'Penjualan' : 'Sales', rp(S.nilai), d == null ? '' : (d >= 0 ? '+' : '') + persen(d) + (ID ? ' dari ' : ' vs ') + namaBulan(H.bulanLalu).split(' ')[0]);
        ubin(s, 3.67, 1.75, 2.9, ID ? 'Terjual' : 'Units sold', angka(S.pcs) + ' pcs', bertanda(S.pcs - S.pcsLalu) + ' pcs');
        ubin(s, 6.74, 1.75, 2.9, ID ? 'Stok akhir' : 'Closing stock', angka(V.akhir) + ' pcs', 'HO ' + angka(V.lokasi[0].akhir) + ' · ' + (ID ? 'gerai ' : 'stores ') + angka(V.lokasi[2].akhir));
        if (I) ubin(s, 9.81, 1.75, 2.9, ID ? 'Komisi OLS' : 'OLS commission', rp(H.komisi), ID ? '10% dari wholesale' : '10% of wholesale');
        else ubin(s, 9.81, 1.75, 2.9, ID ? 'Sell-through gerai' : 'Store sell-through', persen(H.stGerai, true), ID ? 'terjual dibanding tersedia' : 'sold vs available');
        var tc = H.channel.slice().sort(function (a, b) { return b.nilai - a.nilai; })[0] || {};
        var poin = [];
        if (tc.nilai) poin.push(ID ? (nama(tc) + ' saluran terbesar bulan ini (' + tc.porsi + '% nilai).') : (nama(tc) + ' was the largest channel this month (' + tc.porsi + '% of value).'));
        poin.push(ID ? (angka(V.principal) + ' pcs masuk dari principal; stok mati di gerai ' + angka(C.mati.pcs) + ' pcs (' + C.mati.skuGerai + ' SKU-gerai).') : (angka(V.principal) + ' pcs received from the principal; dead stock in stores ' + angka(C.mati.pcs) + ' pcs (' + C.mati.skuGerai + ' store SKUs).'));
        if (H.tindak.length) poin.push((ID ? 'Tindak lanjut utama: ' : 'Main follow-up: ') + H.tindak[0].teks + '.');
        s.addText(poin.map(function (p) { return { text: p, options: { bullet: true, breakLine: true } }; }), { x: 0.6, y: 3.35, w: 12.1, h: 2.6, fontFace: FB, fontSize: 15, color: WR.tinta, valign: 'top', paraSpaceAfter: 8 });
      },
      sales1: function () {
        var s = pp.addSlide({ masterName: 'ISI' });
        kepala(s, TK('lap').sales[0], (ID ? 'Penjualan ' : 'Sales in ') + namaBulan(H.bulan) + ' ' + rp(S.nilai) + (ID ? ' dari ' : ' from ') + angka(S.pcs) + ' pcs', ID ? 'Nilai = qty x harga wholesale termasuk PPN · sumber buku besar WMS' : 'Value = qty x wholesale price incl. VAT · source WMS ledger');
        s.addChart(pp.ChartType.bar, [{ name: ID ? 'Nilai' : 'Value', labels: S.tren.map(function (t) { return namaBulan(t.bulan, true); }), values: S.tren.map(function (t) { return t.nilai; }) }],
          { x: 0.6, y: 1.7, w: 7.6, h: 4.7, barDir: 'col', chartColors: [WR.aksen], showValue: true, dataLabelFormatCode: '#,##0', dataLabelFontSize: 10, valAxisLabelFormatCode: '#,##0', valAxisLabelFontSize: 9, catAxisLabelFontSize: 11, showLegend: false, valGridLine: { color: WR.garis, size: 0.5 }, catAxisLabelColor: WR.redup, valAxisLabelColor: WR.redup });
        var d = S.nilaiLalu ? (S.nilai - S.nilaiLalu) / S.nilaiLalu : null;
        ubin(s, 8.6, 1.9, 4.1, ID ? 'Nilai (wholesale termasuk PPN)' : 'Value (wholesale incl. VAT)', rp(S.nilai), d == null ? '' : bertanda(S.nilai - S.nilaiLalu).replace(/^([+-])/, '$1Rp') + ' (' + (d >= 0 ? '+' : '') + persen(d) + ')');
        ubin(s, 8.6, 3.35, 4.1, ID ? 'Terjual' : 'Units sold', angka(S.pcs) + ' pcs', S.pcs ? (ID ? 'rata-rata ' : 'average ') + rp(S.nilai / S.pcs) + ' / pcs' : '');
      },
      sales2: function () {
        var s = pp.addSlide({ masterName: 'ISI' }), rows = [];
        kepala(s, TK('lap').sales[0], sl.sales2, ID ? 'Sisa di rak = stok per akhir bulan' : 'On shelf = stock at month end');
        S.mitra.forEach(function (m) {
          var vs = m.nilaiLalu ? persen((m.nilai - m.nilaiLalu) / m.nilaiLalu) : '-'; if (vs !== '-' && m.nilai >= m.nilaiLalu) vs = '+' + vs;
          rows.push({ sel: [nama(m), angka(m.pcs), rp(m.nilai), vs, m.sisa === '-' ? '-' : angka(m.sisa)], tebal: true });
          if (m.gerai.length > 1) m.gerai.forEach(function (g) { rows.push({ sel: ['   ' + g.nama, angka(g.pcs), rp(g.nilai), '', angka(g.sisa)], redup: true }); });
        });
        rows.push({ sel: ['Total', angka(S.pcs), rp(S.nilai), S.nilaiLalu ? (S.nilai >= S.nilaiLalu ? '+' : '') + persen((S.nilai - S.nilaiLalu) / S.nilaiLalu) : '-', ''], tebal: true, isi: WR.lembut });
        tabel(s, [ID ? 'Mitra / gerai' : 'Partner / store', 'Pcs', ID ? 'Nilai' : 'Value', ID ? 'vs bulan lalu' : 'vs last month', ID ? 'Sisa di rak' : 'On shelf'], rows, { x: 0.6, y: 1.7, w: 12.1, colW: [5.3, 1.3, 2.3, 1.6, 1.6], kanan: [0, 1, 1, 1, 1], font: rows.length > 12 ? 9 : 11, rowH: rows.length > 12 ? 0.26 : 0.32 });
      },
      mov1: function () {
        var s = pp.addSlide({ masterName: 'ISI' });
        kepala(s, TK('lap').movement[0], (ID ? 'Arus stok: ' : 'Stock flow: ') + angka(V.awal) + (ID ? ' pcs jadi ' : ' pcs to ') + angka(V.akhir) + ' pcs', ID ? 'Semua lokasi yang dipegang: HO, di jalan, gerai mitra, Gamotion. Perpindahan antarlokasi saling hapus.' : 'All held locations: HO, in transit, partner stores, Gamotion. Transfers between locations cancel out.');
        var r = [[ID ? 'Saldo awal ' + tglPendek(H.awal) : 'Opening ' + tglPendek(H.awal), angka(V.awal)], [ID ? 'Masuk dari principal' : 'Received from principal', bertanda(V.principal)], [ID ? 'Saldo pembukaan (OPENING)' : 'Opening balance entries', bertanda(V.pembukaan)], [ID ? 'Penyesuaian opname' : 'Stock count adjustment', bertanda(V.adjust)],
          [ID ? 'Terjual' : 'Sold', bertanda(-V.terjual)], [ID ? 'Rusak' : 'Damaged', bertanda(-V.rusak)]];
        if (V.returPrincipal) r.push([ID ? 'Retur ke principal' : 'Returned to principal', bertanda(-V.returPrincipal)]);
        if (V.masukLain || V.keluarLain) r.push([ID ? 'Lainnya' : 'Other', bertanda(V.masukLain - V.keluarLain)]);
        r.push([ID ? 'Saldo akhir ' + tglPendek(H.akhir) : 'Closing ' + tglPendek(H.akhir), angka(V.akhir)]);
        tabel(s, [ID ? 'Komponen' : 'Component', 'Pcs'], r.map(function (x, i) { return { sel: x, tebal: i === 0 || i === r.length - 1, isi: i === r.length - 1 ? WR.lembut : undefined }; }), { x: 0.6, y: 1.75, w: 6.6, colW: [5, 1.6], kanan: [0, 1], rowH: 0.4, font: 13 });
        ubin(s, 7.7, 1.75, 5.0, ID ? 'Perubahan stok' : 'Stock change', bertanda(V.akhir - V.awal) + ' pcs', ID ? 'saldo akhir dikurangi saldo awal' : 'closing minus opening');
        ubin(s, 7.7, 3.2, 5.0, ID ? 'Keluar karena terjual' : 'Out through sales', angka(V.terjual) + ' pcs', (ID ? 'rusak ' : 'damaged ') + angka(V.rusak) + ' pcs');
      },
      mov2: function () {
        var s = pp.addSlide({ masterName: 'ISI' });
        kepala(s, TK('lap').movement[0], sl.mov2, ID ? 'Masuk dan keluar termasuk perpindahan antarlokasi' : 'Inflow and outflow include transfers between locations');
        var nm = { HO: TK('gudang'), TRANSIT: TK('transit'), GERAI: TK('gerai'), GMT: TK('gamotion') };
        var ket = { HO: ID ? 'kirim ke gerai, Gamotion, terjual langsung' : 'to stores, Gamotion, direct sales', TRANSIT: ID ? 'tiba di gerai' : 'arrived at stores', GERAI: ID ? 'terjual, rusak' : 'sold, damaged', GMT: ID ? 'terjual' : 'sold' };
        var rows = V.lokasi.map(function (l) { return { sel: [nm[l.k], angka(l.awal), bertanda(l.masuk), bertanda(-l.keluar), angka(l.akhir), ket[l.k]] }; });
        var tm = 0, tk = 0; V.lokasi.forEach(function (l) { tm += l.masuk; tk += l.keluar; });
        rows.push({ sel: ['Total', angka(V.awal), bertanda(tm), bertanda(-tk), angka(V.akhir), ''], tebal: true, isi: WR.lembut });
        tabel(s, [ID ? 'Lokasi' : 'Location', ID ? 'Awal' : 'Opening', ID ? 'Masuk' : 'In', ID ? 'Keluar' : 'Out', ID ? 'Akhir' : 'Closing', ID ? 'Keterangan keluar' : 'Out by'], rows, { x: 0.6, y: 1.75, w: 12.1, colW: [2.8, 1.4, 1.4, 1.4, 1.4, 3.7], kanan: [0, 1, 1, 1, 1, 0], rowH: 0.42, font: 13 });
      },
      con1: function () {
        var s = pp.addSlide({ masterName: 'ISI' });
        kepala(s, TK('lap').condition[0], sl.con1, ID ? 'Umur dihitung dari tanggal tiba di gerai (FIFO). Stok mati = di rak lebih dari 30 hari dan belum pernah laku di gerai itu.' : 'Age counts from arrival at the store (FIFO). Dead stock = on shelf over 30 days and never sold at that store.');
        s.addChart(pp.ChartType.bar, [{ name: 'Pcs', labels: ID ? ['0-30 hari', '31-60 hari', '61-90 hari', '> 90 hari'] : ['0-30 days', '31-60 days', '61-90 days', '> 90 days'], values: C.umur }],
          { x: 0.6, y: 1.7, w: 6.8, h: 4.6, barDir: 'bar', chartColors: [WR.seri], showValue: true, dataLabelFontSize: 11, catAxisLabelFontSize: 11, valAxisHidden: true, valGridLine: { style: 'none' }, showLegend: false, catAxisLabelColor: WR.redup });
        ubin(s, 7.8, 1.85, 4.9, ID ? 'Stok mati' : 'Dead stock', angka(C.mati.pcs) + ' pcs', C.mati.skuGerai + (ID ? ' SKU-gerai' : ' store SKUs'), 'FBDCDC');
        ubin(s, 7.8, 3.3, 4.9, ID ? 'Hari tutupan stok gerai' : 'Store days of cover', C.tutupan == null ? '-' : angka(C.tutupan) + (ID ? ' hari' : ' days'), (ID ? 'stok gerai ' : 'store stock ') + angka(C.stokGerai) + ' pcs');
        ubin(s, 7.8, 4.75, 4.9, ID ? 'Masih di jalan' : 'In transit', angka(C.transit) + ' pcs', (ID ? 'per ' : 'on ') + tglPendek(H.akhir));
      },
      con2: function () {
        var s = pp.addSlide({ masterName: 'ISI' }), o = C.opname;
        kepala(s, TK('lap').condition[0], (ID ? 'Opname: ' : 'Stock counts: ') + o.dalam + (ID ? ' dari ' : ' of ') + o.wajib + (ID ? ' lokasi wajib dalam 30 hari' : ' required locations within 30 days'), ID ? 'Jadwal opname wajib: tiap lokasi minimal sekali dalam 30 hari' : 'Every required location is counted at least once every 30 days');
        ubin(s, 0.6, 1.75, 3.8, ID ? 'Sudah opname' : 'Counted', o.dalam + (ID ? ' lokasi' : ' locations'), ID ? 'dalam 30 hari terakhir' : 'in the last 30 days');
        ubin(s, 4.6, 1.75, 3.8, ID ? 'Belum' : 'Not yet', o.belum.length + (ID ? ' lokasi' : ' locations'), ID ? 'perlu dijadwalkan' : 'to schedule', o.belum.length ? WR.peach : WR.lembut);
        if (o.belum.length) tabel(s, [ID ? 'Lokasi belum opname' : 'Not counted', ID ? 'Opname terakhir' : 'Last count'], o.belum.map(function (x) { return { sel: [x.nama, x.terakhir ? tglPendek(x.terakhir) + ' ' + x.terakhir.slice(0, 4) : (ID ? 'belum pernah' : 'never')] }; }), { x: 0.6, y: 3.3, w: 8.0, colW: [5.6, 2.4], kanan: [0, 1], rowH: 0.36, font: 12 });
      },
      sku1: function () {
        var s = pp.addSlide({ masterName: 'ISI' });
        kepala(s, TK('lap').sku[0], sl.sku1 + ' ' + namaBulan(H.bulan), ID ? 'Nilai wholesale termasuk PPN · urut menurut nilai' : 'Wholesale value incl. VAT · ranked by value');
        K.top.forEach(function (x, i) {
          var cx = 0.6 + (i % 3) * 4.07, cy = 1.75 + Math.floor(i / 3) * 2.2;
          s.addShape(pp.ShapeType.roundRect, { x: cx, y: cy, w: 3.9, h: 2.0, rectRadius: 0.14, fill: { color: WR.lembut }, line: { color: WR.lembut } });
          s.addText(String(i + 1), { x: cx + 0.15, y: cy + 0.15, w: 0.5, h: 0.5, fontFace: FJ, fontSize: 22, bold: true, color: WR.aksenTeks });
          if (foto[i]) s.addImage({ data: foto[i], x: cx + 0.55, y: cy + 0.25, w: 1.3, h: 1.3 });
          s.addText([{ text: x.n, options: { bold: true, fontSize: 12, breakLine: true } }, { text: x.s, options: { fontSize: 9, color: WR.redup, breakLine: true } }, { text: rp(x.nilai), options: { fontSize: 16, bold: true, color: WR.aksenTeks, breakLine: true } }, { text: angka(x.pcs) + ' pcs · ' + x.saluran + (ID ? ' saluran' : (x.saluran === 1 ? ' channel' : ' channels')), options: { fontSize: 10, color: WR.redup } }],
            { x: cx + 1.95, y: cy + 0.15, w: 1.85, h: 1.7, fontFace: FB, color: WR.tinta, valign: 'top', margin: 0 });
        });
        if (!K.top.length) s.addText(ID ? 'Belum ada penjualan bulan ini.' : 'No sales this month yet.', { x: 0.6, y: 2, w: 12, h: 0.6, fontFace: FB, fontSize: 16, color: WR.redup });
      },
      sku2: function () {
        var s = pp.addSlide({ masterName: 'ISI' }), A = K.abc;
        kepala(s, TK('lap').sku[0], sl.sku2, ID ? 'Lambat = ada di rak gerai tapi tidak laku bulan ini · ABC dari nilai 3 bulan terakhir' : 'Slow = on a store shelf with no sales this month · ABC from 3-month value');
        if (K.lambat.length) tabel(s, [ID ? 'SKU lambat' : 'Slow mover', ID ? 'Di rak' : 'On shelf', ID ? 'Hari tanpa laku' : 'Days unsold'], K.lambat.map(function (x) { return { sel: [x.n, angka(x.sisa), angka(x.hari)] }; }), { x: 0.6, y: 1.75, w: 6.6, colW: [4.0, 1.2, 1.4], kanan: [0, 1, 1], rowH: 0.36, font: 12 });
        else s.addText(ID ? 'Semua SKU di gerai laku bulan ini.' : 'Every store SKU sold this month.', { x: 0.6, y: 1.8, w: 6.6, h: 0.5, fontFace: FB, fontSize: 14, color: WR.redup });
        [['A', ID ? 'penyumbang utama, jaga stok' : 'main contributors, keep in stock', WR.peach], ['B', ID ? 'pantau laju jual' : 'watch the sell rate', WR.lembut], ['C', ID ? 'kandidat rotasi atau promo' : 'candidates to rotate or promote', WR.lembut]].forEach(function (k, i) {
          var y = 1.75 + i * 1.35;
          s.addShape(pp.ShapeType.roundRect, { x: 7.6, y: y, w: 5.1, h: 1.2, rectRadius: 0.12, fill: { color: k[2] }, line: { color: k[2] } });
          s.addText(k[0], { x: 7.75, y: y + 0.15, w: 0.7, h: 0.9, fontFace: FJ, fontSize: 32, bold: true, color: WR.aksenTeks });
          s.addText([{ text: A[k[0]].n + ' SKU', options: { bold: true, fontSize: 14, breakLine: true } }, { text: k[1], options: { fontSize: 11, color: WR.redup } }], { x: 8.5, y: y + 0.15, w: 2.9, h: 0.9, fontFace: FB, color: WR.tinta, margin: 0 });
          s.addText(A[k[0]].porsi + '%', { x: 11.3, y: y + 0.25, w: 1.3, h: 0.7, fontFace: FJ, fontSize: 22, bold: true, color: WR.tinta, align: 'right' });
        });
      },
      ch1: function () {
        var s = pp.addSlide({ masterName: 'ISI' });
        kepala(s, TK('lap').channel[0], sl.ch1 + ' ' + namaBulan(H.bulan), ID ? 'Sell-through = terjual dibanding (stok awal + masuk) di lokasi saluran itu' : 'Sell-through = sold vs (opening stock + inflow) at that channel');
        var kol = [ID ? 'Saluran' : 'Channel', 'Pcs', ID ? 'Nilai' : 'Value', ID ? 'Porsi' : 'Share', 'Sell-through'], lebar = [3.6, 1.0, 2.1, 1.1, 1.6], kanan = [0, 1, 1, 1, 1];
        if (I) { kol.push(ID ? 'Margin mitra' : 'Partner margin'); lebar.push(1.5); kanan.push(1); }
        var rows = H.channel.map(function (x) { var r = [nama(x), angka(x.pcs), rp(x.nilai), x.porsi + '%', persen(x.st, true)]; if (I) r.push(x.margin == null ? '-' : persen(x.margin)); return { sel: r }; });
        tabel(s, kol, rows, { x: 0.6, y: 1.75, w: lebar.reduce(function (a, b) { return a + b; }, 0), colW: lebar, kanan: kanan, rowH: 0.42, font: 12 });
        var ada = H.channel.filter(function (x) { return x.nilai > 0; });
        if (ada.length) s.addChart(pp.ChartType.doughnut, [{ name: ID ? 'Porsi' : 'Share', labels: ada.map(nama), values: ada.map(function (x) { return x.nilai; }) }],
          { x: 9.9, y: 4.25, w: 2.8, h: 2.25, holeSize: 55, chartColors: [WR.aksen, WR.seri, 'E9CBA8', '9ED4B5', 'A9C8E8', 'C6DDF2'], showLegend: false, showPercent: false, showValue: false });
      },
      tindak: function () {
        var s = pp.addSlide({ masterName: 'ISI' });
        kepala(s, sl.tindak, ID ? 'Yang perlu dikerjakan bulan berikutnya' : 'What to do next month', ID ? 'Dari aturan tetap: opname, stok mati, barang di jalan, gerai tanpa penjualan' : 'From fixed rules: stock counts, dead stock, goods in transit, stores without sales');
        if (!H.tindak.length) { s.addText(ID ? 'Tidak ada tindak lanjut. Semua bersih.' : 'Nothing to follow up. All clear.', { x: 0.6, y: 1.9, w: 12, h: 0.6, fontFace: FB, fontSize: 16, color: WR.redup }); return; }
        H.tindak.forEach(function (t, i) {
          var y = 1.8 + i * 1.0;
          s.addShape(pp.ShapeType.roundRect, { x: 0.6, y: y, w: 12.1, h: 0.8, rectRadius: 0.12, fill: { color: WR.lembut }, line: { color: WR.lembut } });
          s.addText(t.pemilik, { shape: pp.ShapeType.roundRect, rectRadius: 0.08, x: 0.8, y: y + 0.2, w: 1.3, h: 0.4, fill: { color: WR.peach }, color: WR.aksenTeks, fontFace: FB, fontSize: 10, bold: true, align: 'center' });
          s.addText(t.teks, { x: 2.3, y: y + 0.1, w: 10.2, h: 0.6, fontFace: FB, fontSize: 14, color: WR.tinta, valign: 'middle' });
        });
      }
    };
    berkas.slide.forEach(function (k) { nomor++; bikin[k](); });
    return pp;
  }

  /* ================= setelan ================= */
  var KUNCI = 'wms_laporan_atur';
  function bacaAtur() {
    var a = {}; try { a = JSON.parse(W.localStorage.getItem(KUNCI) || '{}') || {}; } catch (e) { a = {}; }
    return { pilih: Array.isArray(a.pilih) ? a.pilih.filter(function (k) { return LAP.indexOf(k) > -1; }) : LAP.slice(), gabung: a.gabung !== false, untuk: a.untuk === 'principal' ? 'principal' : 'internal' };
  }
  function simpanAtur() { try { W.localStorage.setItem(KUNCI, JSON.stringify({ pilih: A.pilih, gabung: A.gabung, untuk: A.untuk })); } catch (e) {} }

  /* ================= data ================= */
  var D = { dp: null, janji: null, waktu: 0 };
  function muat(paksa) {
    if (D.janji && !paksa && Date.now() - D.waktu < 5 * 60 * 1000) return D.janji;
    D.waktu = Date.now();
    var m = M();
    D.janji = (m.jalan ? m.jalan('dataPapan', ['WMS-TIKET']) : Promise.reject(new Error('jalan'))).then(function (x) {
      if (!x || !x.baris) throw new Error('data'); D.dp = x; return x;
    }).catch(function (e) { D.janji = null; throw e; });
    return D.janji;
  }

  /* ================= lembar ================= */
  var A = { bulan: '', pilih: LAP.slice(), gabung: true, untuk: 'internal', sibuk: false, dari: null };
  function H() { return hitung(D.dp, { bulan: A.bulan }); }
  function pastikanDom() {
    if (el('laporan')) return el('laporan');
    var d = W.document.createElement('div');
    d.id = 'laporan'; d.className = 'alat-latar laporan-latar'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="lembar" role="dialog" aria-modal="true" tabindex="-1"><div id="laporanIsi"></div></div>';
    W.document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      if (e.target === d) { tutup(); return; }
      var x = e.target.closest ? e.target.closest('[data-laporan],[data-laporan-pilih],[data-laporan-untuk]') : null;
      if (!x) return;
      if (x.hasAttribute('data-laporan-pilih')) { bunyi('klik'); var k = x.getAttribute('data-laporan-pilih'), i = A.pilih.indexOf(k); if (i > -1) A.pilih.splice(i, 1); else A.pilih.push(k); simpanAtur(); gambarIsi(); return; }
      if (x.hasAttribute('data-laporan-untuk')) { bunyi('klik'); A.untuk = x.getAttribute('data-laporan-untuk'); simpanAtur(); gambarIsi(); return; }
      var a = x.getAttribute('data-laporan');
      if (a === 'tutup') tutup();
      else if (a === 'gabung') { bunyi('klik'); A.gabung = !A.gabung; simpanAtur(); gambarIsi(); }
      else if (a === 'unduh') unduh(x);
      else if (a === 'ulang') { bunyi('klik'); gambar(true); }
    });
    d.addEventListener('change', function (e) { if (e.target && e.target.id === 'lpBulan') { A.bulan = e.target.value; gambarIsi(); } });
    W.document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('buka')) { e.preventDefault(); tutup(); } });
    return d;
  }
  function buka() {
    var d = pastikanDom(), s = bacaAtur();
    A.pilih = s.pilih; A.gabung = s.gabung; A.untuk = s.untuk;
    if (!d.classList.contains('buka')) A.dari = W.document.activeElement;
    d.classList.add('buka'); d.setAttribute('aria-hidden', 'false'); W.document.body.classList.add('alat-terbuka');
    d.querySelector('.lembar').setAttribute('aria-label', TK('judul'));
    bunyi('klik'); gambar(false);
  }
  function tutup() {
    var d = el('laporan'); if (!d) return;
    d.classList.remove('buka'); d.setAttribute('aria-hidden', 'true'); W.document.body.classList.remove('alat-terbuka');
    try { if (A.dari && A.dari.focus) A.dari.focus(); } catch (e) {}
  }
  var IKON_TUTUP = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function gambar(paksa) {
    var isi = el('laporanIsi');
    isi.innerHTML = '<div class="kepala-alat lp-kepala"><div class="lp-judul"><h2>' + esc(TK('judul')) + '</h2><small>' + esc(TK('sub')) + '</small></div>' +
      '<button type="button" class="tutup-alat" data-laporan="tutup" aria-label="' + esc(TK('tutup')) + '" title="' + esc(TK('tutup')) + '">' + IKON_TUTUP + '</button></div><div id="laporanBadan"><p class="ket-alat">' + esc(TK('muat')) + '</p></div>';
    muat(paksa).then(function () { if (!A.bulan || hitung(D.dp, {}).pilihanBulan.indexOf(A.bulan) < 0) A.bulan = hitung(D.dp, {}).bulan; gambarIsi(); }, function () {
      var w = el('laporanBadan'); if (w) w.innerHTML = '<div class="tolak-alat" role="alert">' + esc(TK('gagal')) + ' <button type="button" class="btn dua" data-laporan="ulang">↻</button></div>';
    });
  }
  function gambarIsi() {
    var w = el('laporanBadan'); if (!w || !D.dp) return;
    var h = H(), berkas = susunSlide({ gabung: A.gabung, pilih: A.pilih, bulan: h.bulan });
    var nSlide = berkas.reduce(function (a, f) { return a + f.slide.length; }, 0), sl = TK('sl');
    var opsiBulan = h.pilihanBulan.map(function (b) { return '<option value="' + b + '"' + (b === h.bulan ? ' selected' : '') + '>' + esc(namaBulan(b)) + '</option>'; }).join('');
    var kartu = LAP.map(function (k) {
      var on = A.pilih.indexOf(k) > -1, t = TK('lap')[k];
      return '<button type="button" class="lp-kartu' + (on ? ' on' : '') + '" data-laporan-pilih="' + k + '" aria-pressed="' + on + '"><span class="lp-centang" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>' +
        '<span class="lp-kartu-teks"><b>' + esc(t[0]) + '</b><small>' + esc(t[1]) + '</small></span><span class="lp-kartu-ekor"><span class="lp-sumber">WMS</span><small>' + SLIDE[k].length + ' ' + esc(TK('slide')) + '</small></span></button>';
    }).join('');
    var siap = [], C = h.condition;
    siap.push([true, TK('siapBuku')(h.terakhirData ? tglPendek(h.terakhirData) + ' ' + h.terakhirData.slice(0, 4) : '-')]);
    siap.push([C.opname.dalam >= C.opname.wajib, TK('siapOpname')(C.opname.dalam, C.opname.wajib)]);
    if (C.transit > 0) siap.push([false, TK('siapTransit')(C.transit)]);
    var sepi = 0; h.sales.mitra.forEach(function (m) { m.gerai.forEach(function (g) { if (!g.pcs && g.sisa > 0) sepi++; }); });
    if (sepi) siap.push([false, TK('siapSepi')(sepi)]);
    var prat = [];
    berkas.forEach(function (f) { f.slide.forEach(function (k, i) { prat.push('<div class="lp-prat' + (k === 'sampul' ? ' sampul' : '') + '" data-laporan-pratinjau="' + k + '"><span>' + esc(k === 'sampul' ? (f.lap === 'semua' ? TK('judul') : TK('lap')[f.lap][0]) + ' · ' + namaBulan(h.bulan, true) : sl[k]) + '</span><i></i></div>'); }); });
    var tombolTeks = !berkas.length ? TK('unduh1') : berkas.length === 1 ? TK('unduh1') : TK('unduhN')(berkas.length);
    var ringkas = !berkas.length ? TK('pilihMin') : berkas.length === 1 ? TK('berkas1')(nSlide) : TK('berkasN')(berkas.length, nSlide);
    w.innerHTML = '<div class="lp-atur"><label class="lp-isian" for="lpBulan"><span>' + esc(TK('periode')) + '</span><select id="lpBulan">' + opsiBulan + '</select></label>' +
      '<span class="lp-label">' + esc(TK('untuk')) + '</span>' + ['internal', 'principal'].map(function (u) { return '<button type="button" class="chip-alat' + (A.untuk === u ? ' on' : '') + '" data-laporan-untuk="' + u + '" aria-pressed="' + (A.untuk === u) + '">' + esc(TK(u)) + '</button>'; }).join('') + '</div>' +
      '<p class="ket-alat lp-untuk-ket">' + esc(TK(A.untuk === 'internal' ? 'untukKetI' : 'untukKetP')) + '</p>' +
      '<div class="lp-kisi"><div class="lp-kiri"><div class="lbl">' + esc(TK('isi')) + '</div>' + kartu +
        '<button type="button" class="lp-saklar" data-laporan="gabung" role="switch" aria-checked="' + A.gabung + '"><span class="lp-tuas' + (A.gabung ? ' on' : '') + '"><i></i></span><span><b>' + esc(TK('gabung')) + '</b><small>' + esc(TK(A.gabung ? 'gabungYa' : 'gabungTidak')) + '</small></span></button></div>' +
        '<div class="lp-kanan"><div class="lbl">' + esc(TK('jubelio')) + '</div><div class="lp-jubelio">' + esc(TK('jubelioKet')) + '</div>' +
        '<div class="lbl">' + esc(TK('siap')) + ' · ' + esc(namaBulan(h.bulan)) + '</div><div class="lp-siap">' + siap.map(function (x) { return '<div><span class="' + (x[0] ? 'ok' : 'awas') + '">' + (x[0] ? '✓' : '!') + '</span>' + esc(x[1]) + '</div>'; }).join('') + '</div>' +
        '<div class="lbl">' + esc(TK('pratinjau')) + '</div><div class="lp-prat-kisi">' + prat.join('') + '</div></div></div>' +
      '<div class="lp-kaki"><span data-laporan="jumlah">' + esc(ringkas) + '</span><span class="lp-status" id="lpStatus" role="status" aria-live="polite"></span><button type="button" class="btn" data-laporan="unduh"' + (berkas.length ? '' : ' disabled') + '>' + esc(tombolTeks) + '</button></div>';
  }
  function unduhBlob(blob, nama) {
    var u = URL.createObjectURL(blob), a = W.document.createElement('a');
    a.href = u; a.download = nama; a.style.display = 'none'; W.document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
  }
  function unduh(tombol) {
    if (!D.dp || A.sibuk) return;
    var h = H(), berkas = susunSlide({ gabung: A.gabung, pilih: A.pilih, bulan: h.bulan }); if (!berkas.length) return;
    A.sibuk = true; bunyi('klik');
    var st = el('lpStatus'); if (st) st.textContent = TK('menyiapkan');
    if (tombol) { tombol.disabled = true; tombol.setAttribute('aria-busy', 'true'); }
    var akhiri = function (galat) { A.sibuk = false; if (tombol) { tombol.disabled = false; tombol.removeAttribute('aria-busy'); } if (st) st.textContent = galat ? TK('gagalBerkas') : ''; };
    muatPustaka().then(function () { return Promise.all(h.sku.top.map(function (x) { return fotoPng(x.n); })); }).then(function (foto) {
      var opsi = { untuk: A.untuk };
      var jadi = berkas.map(function (f) { return bangunPptx(h, f, opsi, foto).write({ outputType: 'blob' }); });
      return Promise.all(jadi).then(function (blob) {
        if (berkas.length === 1) { unduhBlob(blob[0], berkas[0].berkas); return; }
        var z = new W.JSZip(); blob.forEach(function (b, i) { z.file(berkas[i].berkas, b); });
        return z.generateAsync({ type: 'blob' }).then(function (zb) { unduhBlob(zb, 'laporan-bulanan-' + h.bulan + '-terpisah.zip'); });
      });
    }).then(function () { akhiri(false); }, function () { akhiri(true); });
  }

  W.WmsLaporan = { buka: buka, tutup: tutup, _hitung: hitung, _susunSlide: susunSlide };
})();
