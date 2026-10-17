/* Uji kartu "Goods in & out" di halaman Summary (wms/tata.js), 17 Okt 2026.
 * Harapan: "15 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Mockup full Summary 17 Okt disetujui Ferdy ("good, gas"). Kartu lama
 * "Last 3 inbound / Last 3 outbound" diganti tiga kartu: Inbound dari principal (Arrived,
 * Counted, Put away), Outbound offline ke gerai, dan Outbound online Shopee (pesanan plus
 * transfer stok HO ke Shopee), masing-masing dengan langkah per dokumen.
 * Yang mahal kalau salah:
 *  - tahap yang tidak dicatat sistem (hitung per batch) tampil seolah sudah beres;
 *  - put away dinyatakan beres padahal stok HO SKU itu belum punya lokasi di peta gudang;
 *  - surat jalan batal atau pesanan Shopee ikut dihitung sebagai kiriman gerai;
 *  - stok awal (OPENING) dibaca sebagai batch principal;
 *  - kartu Summary server yang lain (KPI, Warehouse condition) ikut tersembunyi waktu kartu
 *    lama disembunyikan, atau kartu lama muncul lagi sesudah Summary digambar ulang;
 *  - peta gudang gagal dibaca lalu put away ditebak;
 *  - bagiannya tidak menempati tempat kartu lama (di bawah KPI), atau hilang kalau kartu lama tidak ada.
 * Papan palsu disalin dari uji-ringkas-stok.js; Summary server ditiru di shadow root yang
 * isinya datang belakangan, seperti papanSummary. Angka harapan dihitung tangan di bawah.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const KODE_BENAR = 'KODE-PALSU-UJI';
const DIHARAPKAN = 18;
/* HTML Summary yang benar-benar digambar server (smrHtml_ di Summary.gs editor, dibuat 17 Okt
   dari fixture uji server). Kartu tiruan di bawah memakai <h3>, padahal server menulis judul
   Last 3 inbound/outbound sebagai div. Selama itu tata.js tidak menemukan kartu lama di papan
   sungguhan: kartu lama tetap tampil dan Goods in & out jatuh ke paling atas. S16 memakai HTML
   asli supaya selisih seperti itu tidak bisa lolos lagi. */
const SMR_ASLI = fs.readFileSync(path.join(__dirname, 'fixture-summary-server.html'), 'utf8');
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(AKAR, p);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});

/* ---------- buku besar, disusun di sini ----------
   Lokasi: 0 HO, 1 T305 (gerai), 2 TERJUAL, 3 OPENING, 4 PRINCIPAL, 5 SHP (stok di Shopee).
   Produk: 0 Bear, 1 Panda, 2 Tiger. Hari ini 15 Okt 2026.
   OPENING -> HO 1 Okt: Bear 20, Panda 10, Tiger 10 (stok awal, BUKAN batch principal). Tanggalnya sengaja di
   bulan berjalan dan lebih baru dari batch 19 Sep: kalau OPENING ikut terbaca sebagai batch, ubin dan daftar langsung berubah.
   PRINCIPAL -> HO: 19 Sep Bear 30 + Tiger 20 (2 SKU, 50 pcs); 3 Okt Panda 16; 14 Okt Bear 12 + Panda 8 (2 SKU, 20 pcs).
   HO -> T305 5 Okt Bear 6. HO -> SHP 10 Okt Tiger 15, 12 Okt Panda 4. SHP -> TERJUAL 13 Okt Tiger 2.
   HO: Bear 20+30+12-6 = 56, Panda 10+16+8-4 = 30, Tiger 10+20-15 = 15.
   SHP: Tiger 15-2 = 13 + Panda 4 = 17.
   Batch bulan ini (Okt): 2, pcs masuk HO bulan ini 16 + 20 = 36. */
const DATA = { ok: true, hariIni: '2026-10-15', bulanIni: '2026-10',
  lok: [{ k: 'HO', n: 'HO', toko: 0 }, { k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', toko: 1 }, { k: 'TERJUAL', n: 'TERJUAL', toko: 0 },
    { k: 'OPENING', n: 'OPENING', toko: 0 }, { k: 'PRINCIPAL', n: 'PRINCIPAL', toko: 0 }, { k: 'SHP', n: 'SHOPEE', toko: 0 }],
  prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 }, { b: '222', n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 175000, h: 194250, r: 298846 },
    { b: '333', n: 'MofmoFriends Key Charm - Tiger', s: 'MF-KC-008', hs: 150324, h: 166860, r: 249900 }],
  baris: [['2026-10-01', 0, 20, 3, 0], ['2026-10-01', 1, 10, 3, 0], ['2026-10-01', 2, 10, 3, 0],
    ['2026-09-19', 0, 30, 4, 0, 0], ['2026-09-19', 2, 20, 4, 0, 0], ['2026-10-03', 1, 16, 4, 0, 1], ['2026-10-14', 0, 12, 4, 0, 2], ['2026-10-14', 1, 8, 4, 0, 3],
    ['2026-10-05', 0, 6, 0, 1], ['2026-10-10', 2, 15, 0, 5], ['2026-10-12', 1, 4, 0, 5], ['2026-10-13', 2, 2, 5, 2]],
  /* Kode batch principal (item 3, 17 Okt): baris PRINCIPAL membawa indeks batch sebagai unsur keenam.
     Dua batch tiba di hari yang sama (14 Okt): dulu digabung jadi satu baris per tanggal.
     EE-2609-01 sudah dihitung 50 = 50 pcs; EE-2610-01 dihitung 15 padahal masuk 16 (selisih);
     EE-2610-02 dan EE-2610-03 belum dihitung. Kolom Waktu Hitung ada (batchHitung). */
  batch: [{ k: 'EE-2609-01', po: '2026-09-01', tiba: '2026-09-19', hitung: '2026-09-19', qh: 50 }, { k: 'EE-2610-01', po: '2026-09-20', tiba: '2026-10-03', hitung: '2026-10-03', qh: 15 },
    { k: 'EE-2610-02', po: '2026-10-01', tiba: '2026-10-14', hitung: '', qh: 0 }, { k: 'EE-2610-03', po: '2026-10-02', tiba: '2026-10-14', hitung: '', qh: 0 }],
  batchHitung: true };
/* Muatan server lama (sebelum item 3): tanpa daftar batch dan tanpa unsur keenam. Kartu harus tetap seperti dulu. */
const DATA_LAMA = Object.assign({}, DATA, { baris: DATA.baris.map(b => b.slice(0, 5)) }); delete DATA_LAMA.batch; delete DATA_LAMA.batchHitung;
let DATA_AKTIF = DATA;
/* ---------- peta gudang ----------
   Bear R1-4A 40 + X-01 16 = 56 (semua stok HO Bear berlokasi). Panda R2-1A 22 dari 30 -> 8 pcs belum put away.
   Tiger R1-3B 15 (semua berlokasi). Total belum put away 8.
   8 pcs Panda itu dianggap dari kedatangan Panda TERBARU dulu: batch 14 Okt (Panda 8) belum beres,
   batch 3 Okt (Panda 16) beres, batch 19 Sep beres. */
const GUDANG = { ok: true, lokasi: [
  { kode: 'R1-4A', sku: 'S Bear', barcode: '111', isi: 40, kap: 40, zona: 'RACK', unit: 'R1', level: 4, pos: 'A', peran: 'PICK', persen: 1, rendah: false },
  { kode: 'X-01', sku: 'S Bear', barcode: '111', isi: 16, kap: 40, zona: 'OVERFLOW', unit: 'X', level: 0, pos: '', peran: 'OVERFLOW', persen: 0.4, rendah: false },
  { kode: 'R2-1A', sku: 'S Panda', barcode: '222', isi: 22, kap: 30, zona: 'RACK', unit: 'R2', level: 1, pos: 'A', peran: 'PICK', persen: 22 / 30, rendah: false },
  { kode: 'R1-3B', sku: 'KC Tiger', barcode: '333', isi: 15, kap: 30, zona: 'RACK', unit: 'R1', level: 3, pos: 'B', peran: 'PICK', persen: 0.5, rendah: false }] };
/* ---------- dokumen outbound ----------
   Offline: PLAN-2610-07 PICKING 30 (14 Okt), PLAN-2610-06 STAGING 12 (13 Okt), PLAN-2610-05 TRANSIT 60 (10 Okt),
   SJM-02 DELIVERED 10 (11 Okt), SJM-01 DELIVERED 100 (28 Sep, bulan lalu), SJM-09 BATAL (tidak ikut sama sekali).
   Terbuka 3, pcs bulan ini 30+12+60+10 = 112, di jalan 1.
   Online (Shopee): 261014PACK PACKING 2, 261013ROAD TRANSIT 1, 261011DELIV DELIVERED 3, 260928OLD DELIVERED 5.
   Perlu dikirim 1 (picking s.d. staging), pcs ke pembeli bulan ini 2+1+3 = 6, stok di Shopee 17.
   Daftar online: yang belum sampai dulu (14 Okt, 13 Okt), lalu yang selesai terbaru: transfer 12 Okt (Panda 4). */
const OBD = { ok: true, waktu: '2026-10-15T12:01:55+07:00', daftar: [
  { lajur: 'online', ref: '261011DELIV', tujuan: 'SHOPEE', tanggal: '2026-10-11', tahap: 'DELIVERED', noSj: '', sjBatal: false, pcsPesan: 3 },
  { lajur: 'online', ref: '261014PACK', tujuan: 'SHOPEE', tanggal: '2026-10-14', tahap: 'PACKING', noSj: '', sjBatal: false, pcsPesan: 2 },
  { lajur: 'online', ref: '261013ROAD', tujuan: 'SHOPEE', tanggal: '2026-10-13', tahap: 'TRANSIT', noSj: '', sjBatal: false, pcsPesan: 1 },
  { lajur: 'online', ref: '260928OLD', tujuan: 'SHOPEE', tanggal: '2026-09-28', tahap: 'DELIVERED', noSj: '', sjBatal: false, pcsPesan: 5 },
  { lajur: 'sj', ref: 'SJM-01', tujuan: 'MAA-PIM2', tanggal: '2026-09-28', tahap: 'DELIVERED', noSj: 'SJ-2609-0001', sjBatal: false, pcsPesan: 100 },
  { lajur: 'sj', ref: 'SJM-02', tujuan: 'T305', tanggal: '2026-10-11', tahap: 'DELIVERED', noSj: 'SJ-2610-0003', sjBatal: false, pcsPesan: 10 },
  { lajur: 'sj', ref: 'SJM-09', tujuan: 'T305', tanggal: '2026-10-14', tahap: 'DELIVERED', noSj: 'SJ-2610-0009', sjBatal: true, pcsPesan: 7 },
  { lajur: 'offline', ref: 'PLAN-2610-05', tujuan: 'KIY-GI', tanggal: '2026-10-10', tahap: 'TRANSIT', noSj: 'SJ-2610-0004', sjBatal: false, pcsPesan: 60 },
  { lajur: 'offline', ref: 'PLAN-2610-07', tujuan: 'T305', tanggal: '2026-10-14', tahap: 'PICKING', noSj: '', sjBatal: false, pcsPesan: 30 },
  { lajur: 'offline', ref: 'PLAN-2610-06', tujuan: 'T390', tanggal: '2026-10-13', tahap: 'STAGING', noSj: '', sjBatal: false, pcsPesan: 12 }
] };
const KERJA = { ok: true, html: '<p id="kerjaIsi">Work log</p>' };
const panggilApi = [];
let ADA_GUDANG = true;

/* ---------- papan lama palsu: HALAMAN dan gambarPanel asli ---------- */
const SKRIP = function () {
  window.HAL = 'ringkasan';
  var HALAMAN = [
    ['ringkasan', 'Ringkasan', '■', []],
    ['stok', 'Persediaan', '▤', [['bukubesar', 'Buku besar bulanan'], ['kesehatan', 'Kesehatan & umur', [['kesehatan', 'Kesehatan persediaan'], ['umur', 'Umur & retur']]],
      ['opname', 'Stok opname & hitung fisik', [['opname', 'Stok opname'], ['hitung', 'Hitung fisik (pindai)']]], ['gerakstok', 'Pergerakan stok'],
      ['kondisi', 'Kondisi persediaan', [['kondisi', 'Gudang'], ['stokgerai', 'Gerai offline']]]]],
    ['laku', 'Penjualan', '◥', [['bulanan', 'Laporan bulanan'], ['dokumen', 'Dokumen mitra'], ['saluran', 'Penjualan saluran'], ['performasku', 'Performa tiap SKU'], ['mitra2', 'Permintaan & tagihan']]],
    ['rencana', 'Pengiriman', '→', [['pesanan', 'Pesanan'], ['kemas', 'Surat jalan & PO', [['kemas', 'Surat jalan'], ['bacapo', 'Baca PO']]], ['mintagerai', 'Permintaan gerai'],
      ['poharian', 'Cek PO & alokasi', [['poharian', 'Cek PO & pick list'], ['alokasi', 'Alokasi & pengganti']]], ['kembali', 'Barang kembali']]],
    ['kinerja', 'Lapangan', '☺', [['jadwal', 'Jadwal kunjungan'], ['absenlokasi', 'Operational PIC', [['absenlokasi', 'Kerja & tugas lapangan'], ['perbaikan', 'Perbaikan kantor (sampai 30 Sep 2026)']]], ['foto', 'Foto rak (sampai 30 Sep 2026)']]],
    ['sehat', 'Kualitas data', '✚', []]
  ];
  window.HALAMAN = HALAMAN;
  window.grupTerbuka = function (kode) {
    for (var i = 0; i < HALAMAN.length; i++) {
      var g = HALAMAN[i];
      if (g[0] === kode) return g[0];
      for (var j = 0; j < g[3].length; j++) {
        var c = g[3][j];
        if (c[0] === kode) return g[0];
        if (c[2]) for (var k = 0; k < c[2].length; k++) if (c[2][k][0] === kode) return g[0];
      }
    }
    return 'ringkasan';
  };
  var el = function (i) { return document.getElementById(i); };
  window.gambarPanel = function () {
    var HALAMAN = window.HALAMAN;
    var buka = window.grupTerbuka.call(null, HAL);
    var s = '<h3><span>Papan</span></h3>';
    HALAMAN.forEach(function (o) {
      var aktif = (HAL === o[0]);
      var kls = aktif ? 'on' : (buka === o[0] && o[3].length ? 'induk' : '');
      s += '<a tabindex="0" data-hal="' + o[0] + '"' + (kls ? (' class="' + kls + '"') : '') + '><span class="pnlNama">' + o[1] + '</span></a>';
      if (buka === o[0] && o[3].length) {
        s += '<div class="anak">';
        o[3].forEach(function (c) {
          var nyala = (HAL === c[0]);
          if (!nyala && c[2]) for (var q = 0; q < c[2].length; q++) if (c[2][q][0] === HAL) nyala = true;
          s += '<a tabindex="0" data-hal="' + c[0] + '"' + (nyala ? ' class="on"' : '') + '>' + c[1] + '</a>';
        });
        s += '</div>';
      }
    });
    var np = el('panel'); if (np && np.innerHTML !== s) np.innerHTML = s;
  };
  /* grupTerbuka asli juga membaca nama global; samakan */
  var gt = window.grupTerbuka;
  window.grupTerbuka = function (kode) { HALAMAN = window.HALAMAN; return gt(kode); };
  window.pasangSubJudul = function (a, b) { window.__subKali = (window.__subKali || 0) + 1; el('subJudul').innerHTML = '<span>' + a + '</span>\u00a0·\u00a0<span>' + b + '</span>'; };
  window.gambar = function () {
    window.gambarPanel();
    var I = el('isi');
    if (HAL === 'rencana') I.innerHTML = '<div class="k" id="glance">Shipments at a glance</div>';
    else if (HAL === 'kemas') I.innerHTML = '<div class="k" id="sjLama">Delivery orders</div>';
    else if (HAL === 'outbound' || HAL === 'obdShopee' || HAL === 'obdIsiUlang') { I.innerHTML = '<div id="obdKotak"></div>'; el('obdKotak').attachShadow({ mode: 'open' }).innerHTML = '<div class="o"><div class="kep"><div><h2>Warehouse · Outbound</h2></div></div></div>'; }
    else if (HAL === 'absenlokasi') { I.innerHTML = '<div id="krj">memuat</div>'; google.script.run.withSuccessHandler(function (h) { el('krj').innerHTML = h.html; window.__kerjaMs = Date.now() - window.__kerjaMulai; }).papanKerja(KODE, ''); window.__kerjaMulai = Date.now(); }
    else if (HAL === 'ringkasan') {
      /* Summary server digambar di shadow root dan datang belakangan (papanSummary), seperti papan asli */
      I.innerHTML = '<div class="k s12" id="smrKotak"></div>';
      var host = el('smrKotak'), sr = host.attachShadow({ mode: 'open' });
      sr.innerHTML = '<div class="smr"><p>memuat</p></div>';
      setTimeout(function () {
        if (!host.isConnected) return;
        if (window.__smrAsli) { sr.innerHTML = window.__smrAsli; return; }
        sr.innerHTML = '<div class="smr"><div class="kk" id="kpi"><h3>Sales value</h3><b>Rp48,250,000</b></div>' +
          (window.__tanpaLama ? '' : '<div class="baris"><div class="c" id="cIn"><h3>Last 3 inbound</h3><div class="r"><b>BATCH-03</b> Arrived</div></div>' +
          '<div class="c" id="cOut"><h3>Last 3 outbound</h3><div class="r"><b>PLAN-2610-07</b> Picking</div></div></div>') +
          '<div class="c" id="cWh"><h3>Warehouse condition</h3><div class="r">R1 82%</div></div></div>';
      }, 350);
    }
    else I.innerHTML = '<div class="k s12" id="ringkasanLama">Summary</div>';
    if (HAL === 'outbound' || HAL === 'obdShopee' || HAL === 'obdIsiUlang') window.pasangSubGudang();
  };
  /* ---- skrip Gudang yang ditunda: pasangMenu dan subjudul, logika asli ---- */
  var HAL_SHP = 'obdShopee', HAL_IU = 'obdIsiUlang', EN = function () { return document.documentElement.lang !== 'id'; };
  var B = function (i, e) { return EN() ? e : i; };
  function pasangMenu() {
    var H = window.HALAMAN;
    var ada = false, iKirim = -1;
    for (var i = 0; i < H.length; i++) { if (H[i][0] === 'outbound') ada = true; if (H[i][0] === 'rencana') iKirim = i; }
    if (!ada) H.splice(iKirim >= 0 ? iKirim + 1 : H.length, 0, ['outbound', 'Gudang', '', []]);
    var gAnak = false;
    for (var gi = 0; gi < H.length; gi++) {
      var gg = H[gi]; if (gg[0] !== 'outbound') continue; if (!gg[3]) gg[3] = [];
      var punyaIu = false; for (var gj = 0; gj < gg[3].length; gj++) if (gg[3][gj][0] === HAL_IU) punyaIu = true;
      if (!punyaIu) { gg[3] = [['outbound', 'Offline'], [HAL_SHP, 'Shopee'], [HAL_IU, 'Isi ulang rak']]; gAnak = true; }
    }
    var buang = { perbaikan: 1, foto: 1, selfie: 1, kartu: 1, hitung: 1, poharian: 1, petabox: 1 }, LABEL = { opname: 'Stok opname' }, berubah = false;
    H.forEach(function (g) {
      if (!g[3] || !g[3].length) return;
      for (var j = g[3].length - 1; j >= 0; j--) {
        var c = g[3][j];
        if (buang[c[0]] && !(c[2] && c[2].length)) { g[3].splice(j, 1); berubah = true; continue; }
        if (c[2] && c[2].length) {
          for (var k = c[2].length - 1; k >= 0; k--) if (buang[c[2][k][0]]) { c[2].splice(k, 1); berubah = true; }
          if (!c[2].length) { g[3].splice(j, 1); berubah = true; continue; }
          if (c[2].length === 1) { var s0 = c[2][0]; g[3][j] = [s0[0], LABEL[s0[0]] || (s0[0] === c[0] ? c[1] : s0[1])]; berubah = true; }
        }
      }
    });
    if ((berubah || gAnak) && el('isi') && typeof gambarPanel === 'function') { try { gambarPanel(); } catch (eP) {} }
    window.__pasangMenu = (window.__pasangMenu || 0) + 1;
  }
  function subJudulGudang() { return HAL === HAL_SHP ? B('Gudang · Shopee', 'Warehouse · Shopee') : (HAL === HAL_IU ? B('Gudang · Isi ulang rak', 'Warehouse · Rack replenishment') : B('Gudang · outbound', 'Warehouse · outbound')); }
  window.pasangSubGudang = function () { var sj = el('subJudul'); var tj = subJudulGudang(), p = tj.split(' · '); if (sj.textContent.replace(/\u00a0/g, ' ') === tj) return; pasangSubJudul(p[0], p[1]); };
  function jaga() { pasangMenu(); if (HAL === 'outbound' || HAL === HAL_SHP || HAL === HAL_IU) window.pasangSubGudang(); }
  setTimeout(function () { pasangMenu(); setInterval(jaga, 700); }, 400);
};
const PAPAN_PALSU = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title>' +
  '<style>body{margin:0;background:#FBF8F0;font-family:Arial,sans-serif}#layarIsi{display:none}.rangka{display:flex}.panel{flex:0 0 236px}.utama{flex:1;min-width:0;padding:16px}' +
  '.petak{display:grid;gap:16px;grid-template-columns:repeat(12,1fr);min-width:0}.petak>:not(.k){grid-column:span 12;min-width:0}.k{grid-column:span 12;background:#fff;padding:16px;min-width:0}' +
  '.panel a{display:block}.anak{padding-left:12px}@media(max-width:900px){.rangka{display:block}.panel{display:flex;flex-wrap:wrap;overflow-x:auto}}</style></head><body>' +
  '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
  '<div id="layarIsi"><header><h1>Papan Data</h1><div id="subJudul"></div></header>' +
  '<div class="rangka"><nav class="panel" id="panel"></nav>' +
  '<div class="utama"><div id="isi" class="petak"></div></div></div></div>' +
  '<script>var KODE="";(' + SKRIP.toString() + ')();function buka(){KODE=document.getElementById("kode").value;google.script.run.withSuccessHandler(function(r){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";gambar();window.__siap=1;}).dataPapan(KODE);}<\/script></body></html>';

const PALSU_AWAL = () => {
  function Ctx() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  Ctx.prototype.createOscillator = function () { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; };
  Ctx.prototype.createGain = function () { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  Ctx.prototype.resume = function () {};
  window.AudioContext = Ctx; window.webkitAudioContext = Ctx;
};

(async () => {
  await new Promise(r => srv.listen(8775, r));
  const URL0 = 'http://localhost:8775/wms/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const pasangRute = async ctx => {
    await ctx.addInitScript(PALSU_AWAL);
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      if (m.fn === 'panggil') panggilApi.push(m.nama);
      let h;
      if (m.fn === 'panggil' && m.nama === 'dataPapan') h = { pintu: 'ok', hasil: DATA_AKTIF };
      else if (m.fn === 'panggil' && m.nama === 'obdDaftar') h = { pintu: 'ok', hasil: OBD };
      else if (m.fn === 'panggil' && m.nama === 'papanKerja') h = { pintu: 'ok', hasil: KERJA };
      else h = { pintu: 'galat', pesan: 'Fungsi "' + (m.nama || m.fn) + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = String(m.kode || '').trim().toUpperCase() === KODE_BENAR ? { ok: true, tiket: 'TIKET.SUPA', ingat: true } : { ok: false, pesan: 'no' };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA_AKTIF, 'obdDaftar|["K"]': OBD, 'wmsGudang|["K"]': ADA_GUDANG ? GUDANG : undefined, 'papanKerja|["K",""]': KERJA, 'klien|papan': { ok: true, versi: 'ringkas', html: PAPAN_PALSU }, 'klien|versi': { ok: true, versi: 'ringkas' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
  const galat = [];
  const halaman = async ctx => { const p = await ctx.newPage(); p.on('pageerror', e => galat.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) galat.push(m.text()); }); return p; };
  const bingkai = p => p.frames().find(f => f !== p.mainFrame());
  const tungguBingkai = async (p, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 8000)) { try { const f = bingkai(p); if (f && await f.evaluate(fn, arg)) return true; } catch (e) {} await jeda(80); } return false; };
  const fe = (p, fn, arg) => bingkai(p).evaluate(fn, arg);
  const masuk = async (p, bhs) => {
    await p.goto(URL0);
    await p.evaluate(b => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', b); }, bhs || 'en');
    await p.reload();
    await p.waitForFunction(() => document.getElementById('formMasuk'), null, { timeout: 6000 }).catch(() => {});
    await p.fill('#kode', 'kode-palsu-uji'); await p.click('#tMasuk');
    await tungguBingkai(p, () => window.__siap === 1 && window.__l4Tata === true && window.__pasangMenu >= 1, 10000);
    await jeda(300);
  };
  const ke = async (p, hal, tunggu) => { await fe(p, h => { window.HAL = h; window.gambar(); }, hal); if (tunggu) await tungguBingkai(p, tunggu, 6000); await jeda(200); };
  const bacaMenu = p => fe(p, () => {
    const pn = document.getElementById('panel');
    const atas = Array.from(pn.children).filter(x => x.tagName === 'A').map(a => a.getAttribute('data-hal'));
    const anak = Array.from(pn.querySelectorAll('.anak a')).map(a => a.getAttribute('data-hal') + '=' + a.textContent);
    const induk = pn.querySelector(':scope > a.induk, :scope > a.on'); const nyala = pn.querySelector('.anak a.on');
    return { atas: atas.join(','), anak: anak.join('|'), induk: induk ? induk.getAttribute('data-hal') : '', nyala: nyala ? nyala.getAttribute('data-hal') : '' };
  });
  const teksAngka = s => String(s || '').replace(/[^0-9]/g, '');

  /* baca kartu Goods in & out: angka ubin dan baris (atribut data, bukan teks HTML) */
  /* bagiannya bisa di dalam shadow root Summary (menggantikan kartu lama) atau paling atas #isi */
  const CARI = "window.__cariGio = function () { var h = document.getElementById('smrKotak'), sr = h && h.shadowRoot; return (sr && sr.querySelector('[data-l4t-hal-ini=ringkasan]')) || document.querySelector('#isi > .l4t[data-l4t-hal-ini=ringkasan]'); };" +
    "window.__jumlahGio = function () { var h = document.getElementById('smrKotak'), sr = h && h.shadowRoot; return (sr ? sr.querySelectorAll('[data-l4t-hal-ini=ringkasan]').length : 0) + document.querySelectorAll('#isi > .l4t[data-l4t-hal-ini=ringkasan]').length; };";
  const pasangCari = p => fe(p, c => { (0, eval)(c); }, CARI);
  const bacaGIO = p => fe(p, () => {
    const s = window.__cariGio();
    if (!s) return null;
    const kartu = {};
    s.querySelectorAll('[data-l4t-kartu]').forEach(k => {
      const ubin = {}; k.querySelectorAll('[data-l4t-angka]').forEach(x => { ubin[x.getAttribute('data-l4t-angka')] = x.querySelector('strong').textContent; });
      const baris = Array.from(k.querySelectorAll('[data-l4t-baris]')).map(r => [r.getAttribute('data-l4t-baris'), r.getAttribute('data-pcs'),
        Array.from(r.querySelectorAll('[data-l4t-langkah]')).map(l => l.getAttribute('data-l4t-langkah') + ':' + (l.getAttribute('data-st') || '-')).join(','), r.getAttribute('data-belum') || ''].join('/'));
      kartu[k.getAttribute('data-l4t-kartu')] = { ubin, baris };
    });
    const h = document.getElementById('smrKotak'), diShadow = !!(h && h.shadowRoot && s.getRootNode() === h.shadowRoot);
    const posisi = diShadow ? (s.previousElementSibling ? s.previousElementSibling.id : '') + '>' + (s.nextElementSibling ? s.nextElementSibling.className : '') : (document.getElementById('isi').firstElementChild === s ? 'atas' : 'lain');
    return { posisi, kartu, catatan: (s.querySelector('[data-l4t-catatan]') || {}).textContent || '' };
  });
  const bacaLama = p => fe(p, () => {
    const h = document.getElementById('smrKotak'); const sr = h && h.shadowRoot; if (!sr) return 'tanpa shadow';
    const tampak = id => { const x = sr.getElementById(id); return x ? (x.offsetParent !== null && getComputedStyle(x).display !== 'none') : 'hilang'; };
    return { kpi: tampak('kpi'), masuk: tampak('cIn'), keluar: tampak('cOut'), gudang: tampak('cWh') };
  });
  const tungguGIO = async p => { await pasangCari(p); return tungguBingkai(p, () => { const s = window.__cariGio(); return !!(s && s.querySelector('[data-l4t-kartu=online] [data-l4t-baris]')); }, 8000); };

  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await pasangRute(ctx);
    const p = await halaman(ctx);
    await masuk(p, 'en');
    await tungguGIO(p); await jeda(900);
    const g = await bacaGIO(p);
    c('S1 Summary: bagian Goods in & out menempati tempat kartu lama (sesudah KPI, sebelum baris kartu lama), tiga kartu (inbound, offline, online)',
      g && g.posisi === 'kpi>baris' && Object.keys(g.kartu).join(',') === 'masuk,offline,online', JSON.stringify(g && { posisi: g.posisi, k: Object.keys(g.kartu) }));
    const M = g.kartu.masuk, O = g.kartu.offline, N = g.kartu.online;
    c('S2 ubin inbound: 3 batch bulan ini (dua tiba 14 Okt), 36 pcs masuk HO bulan ini, 8 pcs belum put away (peta gudang vs stok HO)',
      teksAngka(M.ubin.batch) === '3' && teksAngka(M.ubin.pcs) === '36' && teksAngka(M.ubin.belum) === '8', JSON.stringify(M.ubin));
    c('S3 baris inbound per kode batch: EE-2610-03 8 pcs (put away belum, 8 pcs), EE-2610-02 12 pcs, EE-2610-01 16 pcs; stok awal OPENING tidak ikut',
      M.baris.map(x => x.split('/').filter((v, i) => i !== 2).join('/')).join(' | ') === 'EE-2610-03/8/8 | EE-2610-02/12/ | EE-2610-01/16/', M.baris.join(' | '));
    const judulMasuk = await fe(p, () => Array.from(window.__cariGio().querySelectorAll('[data-l4t-kartu=masuk] [data-l4t-baris]')).map(r => r.querySelector('.a b').textContent + ' # ' + r.querySelector('small').textContent));
    c('S4 langkah inbound: Counted beres hanya kalau Waktu Hitung terisi dan jumlahnya cocok; belum dihitung dan selisih jadi langkah aktif, selisihnya ditulis',
      M.baris.map(x => x.split('/')[2]).join(' | ') === 'tiba:ok,hitung:on,putaway:on | tiba:ok,hitung:on,putaway:ok | tiba:ok,hitung:on,putaway:ok' &&
      judulMasuk[0].indexOf('EE-2610-03 # Arrived 14 Oct') === 0 && /counted 15 of 16 pcs/.test(judulMasuk[2]) && !/counted/.test(judulMasuk[0] + judulMasuk[1]), M.baris.join(' | ') + ' || ' + judulMasuk.join(' | '));
    c('S5 ubin offline: 3 terbuka, 112 pcs bulan ini (SJ batal dan bulan lalu tidak ikut), 1 di jalan',
      teksAngka(O.ubin.buka) === '3' && teksAngka(O.ubin.pcs) === '112' && teksAngka(O.ubin.jalan) === '1', JSON.stringify(O.ubin));
    c('S6 baris offline: PLAN-2610-07 picking, PLAN-2610-06 staging = pengiriman, PLAN-2610-05 transit = pengiriman; Shopee dan SJ batal tidak ada',
      O.baris.map(x => x.split('/').slice(0, 3).join('/')).join(' | ') ===
      'PLAN-2610-07/30/picking:on,packing:-,kirim:-,terima:- | PLAN-2610-06/12/picking:ok,packing:ok,kirim:on,terima:- | PLAN-2610-05/60/picking:ok,packing:ok,kirim:on,terima:-', O.baris.join(' | '));
    c('S7 ubin online: 1 pesanan perlu dikirim, 6 pcs ke pembeli bulan ini, 17 pcs stok di Shopee (buku besar SHP)',
      teksAngka(N.ubin.kirim) === '1' && teksAngka(N.ubin.pcs) === '6' && teksAngka(N.ubin.shp) === '17', JSON.stringify(N.ubin));
    c('S8 baris online: 261014PACK packing, 261013ROAD di jalan, lalu transfer stok HO ke Shopee 12 Okt 4 pcs sudah diterima',
      N.baris.map(x => x.split('/').slice(0, 3).join('/')).join(' | ') ===
      '261014PACK/2/picking:ok,packing:on,kirim:-,terima:- | 261013ROAD/1/picking:ok,packing:ok,kirim:on,terima:- | trf@2026-10-12/4/picking:ok,packing:ok,kirim:ok,terima:ok', N.baris.join(' | '));
    const l1 = await bacaLama(p);
    c('S9 kartu server Last 3 inbound dan Last 3 outbound disembunyikan, KPI dan Warehouse condition tetap tampil',
      l1.masuk === false && l1.keluar === false && l1.kpi === true && l1.gudang === true, JSON.stringify(l1));
    /* gambar ulang Summary (pindah menu lalu balik), kartu lama tidak boleh muncul lagi dan bagian tidak dobel */
    await ke(p, 'stok'); await jeda(500);
    await pasangCari(p); const hilang = await fe(p, () => window.__jumlahGio() === 0);
    await ke(p, 'ringkasan'); await tungguGIO(p); await jeda(900);
    await fe(p, () => window.gambar()); await jeda(900);
    const l2 = await bacaLama(p), jml = await fe(p, () => window.__jumlahGio());
    c('S10 pindah halaman membuang bagiannya; kembali ke Summary dan digambar ulang: satu bagian saja, kartu lama tetap tersembunyi',
      hilang && jml === 1 && l2.masuk === false && l2.keluar === false && l2.kpi === true && l2.gudang === true, JSON.stringify({ hilang, jml, l2 }));
    await fe(p, () => window.__cariGio().querySelector('[data-l4t-kartu=offline] [data-l4t-baris="PLAN-2610-07"] [data-l4t-hal]').click()); await jeda(400);
    const keOff = await fe(p, () => window.HAL);
    await ke(p, 'ringkasan'); await tungguGIO(p);
    await fe(p, () => window.__cariGio().querySelector('[data-l4t-kartu=online] [data-l4t-baris="261014PACK"] [data-l4t-hal]').click()); await jeda(400);
    const keShp = await fe(p, () => window.HAL);
    c('S11 nomor dokumen gerai membuka Outbound · Offline, nomor pesanan Shopee membuka Outbound · Shopee', keOff === 'outbound' && keShp === 'obdShopee', keOff + ' ' + keShp);
    /* Summary server tanpa kartu lama (misalnya versi server lain): bagiannya tetap tampil, paling atas */
    await fe(p, () => { window.__tanpaLama = 1; window.HAL = 'ringkasan'; window.gambar(); }); await tungguGIO(p); await jeda(1200);
    const g3 = await bacaGIO(p), l3 = await bacaLama(p);
    c('S15 kartu lama tidak ada: bagian Goods in & out tetap tampil paling atas #isi, KPI server tetap tampil',
      g3 && g3.posisi === 'atas' && l3.kpi === true && Object.keys(g3.kartu).length === 3, JSON.stringify({ posisi: g3 && g3.posisi, l3 }));
    /* Summary server sungguhan: bagian harus berdiri di dalam .smr, persis di tempat blok aktivitas (sesudah kartu kunci),
       blok aktivitas tersembunyi, sedangkan pita, kartu kunci, dan Warehouse condition tetap tampil */
    await fe(p, h => { window.__tanpaLama = 0; window.__smrAsli = h; window.HAL = 'ringkasan'; window.gambar(); }, SMR_ASLI); await tungguGIO(p); await jeda(1500);
    const asli = await fe(p, () => {
      const sr = document.getElementById('smrKotak').shadowRoot, s = window.__cariGio(), akt = sr.querySelector('.akt');
      const tampak = el => !!el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
      const sebelum = s && s.previousElementSibling;
      return { diSmr: !!(s && s.parentNode && s.parentNode.classList && s.parentNode.classList.contains('smr')), sesudah: !!(s && s.nextElementSibling === akt),
        sebelum: sebelum ? sebelum.className : '', aktSembunyi: !!akt && !tampak(akt), ubin: tampak(sr.querySelector('.ubin')), pita: tampak(sr.querySelector('.smrPita')),
        gudang: tampak(Array.from(sr.querySelectorAll('h2')).find(h => /Warehouse condition/.test(h.textContent))), kartu: s ? s.querySelectorAll('[data-l4t-kartu]').length : 0 };
    });
    c('S16 Summary server asli: Goods in & out di dalam Summary tepat di tempat blok Last 3 (sesudah kartu kunci), blok lama tersembunyi, pita, KPI, Warehouse condition tetap tampil',
      asli.diSmr && asli.sesudah && /ubin/.test(asli.sebelum) && asli.aktSembunyi && asli.ubin && asli.pita && asli.gudang && asli.kartu === 3, JSON.stringify(asli));
    /* batch yang Waktu Hitung-nya terisi dan jumlahnya cocok: Counted beres (EE-2609-01, dilihat dengan menyembunyikan batch Oktober) */
    await fe(p, () => { window.__smrAsli = ''; });
    if (process.env.FOTO) await p.screenshot({ path: process.env.FOTO, fullPage: true });
    await fe(p, () => { window.__smrAsli = ''; });
    await ctx.close();

    /* ================= muatan server lama (tanpa kode batch) ================= */
    DATA_AKTIF = DATA_LAMA;
    const ctx3 = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await pasangRute(ctx3);
    const p3 = await halaman(ctx3);
    await masuk(p3, 'en'); await pasangCari(p3); await tungguGIO(p3); await jeda(900);
    const gl = await bacaGIO(p3);
    c('S17 muatan server lama (tanpa batch): kartu Inbound tetap per tanggal tiba dan Counted tetap "belum dicatat sistem"',
      gl && gl.kartu.masuk.baris.join(' | ') === '2026-10-14/20/tiba:ok,hitung:na,putaway:on/8 | 2026-10-03/16/tiba:ok,hitung:na,putaway:ok/ | 2026-09-19/50/tiba:ok,hitung:na,putaway:ok/', JSON.stringify(gl && gl.kartu.masuk.baris));
    /* hanya batch September yang tersisa di buku besar: ia sudah dihitung 50 = 50, jadi Counted beres */
    DATA_AKTIF = Object.assign({}, DATA, { baris: DATA.baris.filter(r => !(r[3] === 4 && r[5] > 0)) });
    const ctx4 = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await pasangRute(ctx4);
    const p4 = await halaman(ctx4);
    await masuk(p4, 'en'); await pasangCari(p4); await tungguGIO(p4); await jeda(900);
    const gs = await bacaGIO(p4);
    c('S18 batch yang Waktu Hitung-nya terisi dan jumlahnya cocok: Counted beres, catatan menyebut kolom Waktu Hitung',
      gs && /^EE-2609-01\/50\/tiba:ok,hitung:ok,/.test(gs.kartu.masuk.baris[0] || '') && /Waktu Hitung/.test(gs.catatan), JSON.stringify(gs && { b: gs.kartu.masuk.baris, c: gs.catatan }));
    await ctx3.close(); await ctx4.close();
    DATA_AKTIF = DATA;

    /* ================= HP, bahasa Indonesia, peta gudang gagal dibaca ================= */
    ADA_GUDANG = false;
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasangRute(ctx2);
    const hp = await halaman(ctx2);
    await masuk(hp, 'id');
    await fe(hp, () => { document.documentElement.lang = 'id'; window.gambar(); });
    await tungguGIO(hp); await jeda(900);
    const g2 = await bacaGIO(hp);
    c('S12 peta gudang tidak terbaca: put away tidak ditebak (belum dicatat), ubin belum put away kosong, ada catatan sebabnya',
      g2 && g2.kartu.masuk.baris.every(x => /putaway:na/.test(x)) && teksAngka(g2.kartu.masuk.ubin.belum) === '' && g2.catatan.length > 10, JSON.stringify(g2 && { b: g2.kartu.masuk.baris, u: g2.kartu.masuk.ubin, c: g2.catatan }));
    const tampil = await fe(hp, () => { const s = window.__cariGio(); return { lebar: document.documentElement.scrollWidth, em: /—/.test(s.innerText), judul: (s.querySelector('h2.l4t-gio') || {}).textContent }; });
    c('S13 HP 390 px bahasa Indonesia: tanpa geser samping, tanpa tanda pisah panjang, judul "Barang masuk & keluar"',
      tampil.lebar <= 392 && !tampil.em && tampil.judul === 'Barang masuk & keluar', JSON.stringify(tampil));
    await ctx2.close();
  } catch (e) {
    c('MATI di tengah jalan', false, e.stack);
  }
  c('S14 tidak ada galat JavaScript selama uji', galat.length === 0, galat.join(' | ').slice(0, 500));

  await b.close(); srv.close();
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 500))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
})();
