/* Uji halaman Stock overview, Warehouse racks (Inventory) dan Overview (Shipments) di wms/tata.js, 17 Okt 2026.
 * Harapan: "20 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Mockup 15 Okt disetujui Ferdy ("oke good simpan dlu"), lalu 17 Okt
 * "integrasiin dlu" sebelum video WMS baru direkam. Menu Warehouse sudah dibubarkan
 * (uji-menu-kiriman.js); yang ditambah di sini tiga halaman baca-saja:
 *  - Stock overview: stok HO, yang sedang keluar, di jalan, dan di rak gerai dalam satu
 *    layar, plus tabel per SKU dengan lokasi rak HO dan status.
 *  - Warehouse racks: isi tiap lokasi gudang dibanding kapasitasnya.
 *  - Shipments overview: kiriman ke gerai dan pesanan Shopee per tahap.
 * Yang mahal kalau salah: angka HO/gerai beda dari buku besar yang dipakai halaman lain,
 * SKU yang rak pick-nya kosong tidak ketahuan, pesanan Shopee ikut dihitung sebagai
 * kiriman gerai, atau menu grup Warehouse muncul lagi / HALAMAN asli rusak.
 * Papan palsu (HALAMAN, gambarPanel, pasangMenu) disalin dari uji-menu-kiriman.js, yang
 * menyalinnya dari papan asli. Angka harapan dihitung tangan dari fixture di bawah.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const KODE_BENAR = 'KODE-PALSU-UJI';
const DIHARAPKAN = 20;
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(AKAR, p);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});

/* ---------- buku besar, disusun di sini ----------
   Lokasi: 0 HO, 1 T305 (gerai), 2 KIY-GI (gerai), 3 TERJUAL, 4 OPENING.
   Produk: 0 Bear, 1 Panda, 2 Tiger, 3 Lamb.
   OPENING -> HO: Bear 40, Panda 3, Tiger 20, Lamb 12.
   HO -> T305: Bear 10, Tiger 5. HO -> KIY-GI: Bear 6. T305 -> TERJUAL: Bear 2.
   HO: Bear 40-10-6 = 24, Panda 3, Tiger 20-5 = 15, Lamb 12. Total 54.
   Rak gerai: Bear 10-2+6 = 14, Panda 0, Tiger 5, Lamb 0. Total 19.
   Total per SKU: Bear 38, Tiger 20, Lamb 12, Panda 3 (urutan tabel). */
const DATA = { ok: true, hariIni: '2026-10-15', bulanIni: '2026-10',
  lok: [{ k: 'HO', n: 'HO', toko: 0 }, { k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', toko: 1 }, { k: 'KIY-GI', n: 'KINOKUNIYA GRAND INDONESIA', toko: 1 }, { k: 'TERJUAL', n: 'TERJUAL', toko: 0 }, { k: 'OPENING', n: 'OPENING', toko: 0 }],
  prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 }, { b: '222', n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 175000, h: 194250, r: 298846 },
    { b: '333', n: 'MofmoFriends Key Charm - Tiger', s: 'MF-KC-008', hs: 150324, h: 166860, r: 249900 }, { b: '444', n: 'MofmoFriends Mascot Ball - Lamb', s: 'MF-PLU-040', hs: 120000, h: 133200, r: 199900 }],
  baris: [['2026-08-01', 0, 40, 4, 0], ['2026-08-01', 1, 3, 4, 0], ['2026-08-01', 2, 20, 4, 0], ['2026-08-01', 3, 12, 4, 0],
    ['2026-09-01', 0, 10, 0, 1], ['2026-09-01', 2, 5, 0, 1], ['2026-09-02', 0, 6, 0, 2], ['2026-09-20', 0, 2, 1, 3]] };
/* ---------- peta gudang ----------
   Bear: R1-4A 20 (pick, 50%) + X-01 4 (overflow). Tiger: R1-3B 0 (pick kosong). Lamb: T2-1A 5 dari 16 (31%, rendah).
   R1-2A slot pick tanpa SKU, kosong. Panda: tidak punya lokasi.
   Terisi 3 dari 5 lokasi, 29 pcs di lokasi. */
const GUDANG = { ok: true, lokasi: [
  { kode: 'R1-4A', sku: 'S Bear', barcode: '111', isi: 20, kap: 40, zona: 'RACK', unit: 'R1', level: 4, pos: 'A', peran: 'PICK', persen: 0.5, rendah: false },
  { kode: 'R1-3B', sku: 'KC Tiger', barcode: '333', isi: 0, kap: 30, zona: 'RACK', unit: 'R1', level: 3, pos: 'B', peran: 'PICK', persen: 0, rendah: true },
  { kode: 'R1-2A', sku: '', barcode: '', isi: 0, kap: 30, zona: 'RACK', unit: 'R1', level: 2, pos: 'A', peran: 'PICK', persen: 0, rendah: true },
  { kode: 'T2-1A', sku: 'Ball Lamb', barcode: '444', isi: 5, kap: 16, zona: 'TABLE', unit: 'T2', level: 1, pos: 'A', peran: 'PICK', persen: 5 / 16, rendah: true },
  { kode: 'X-01', sku: 'S Bear', barcode: '111', isi: 4, kap: 40, zona: 'OVERFLOW', unit: 'X', level: 0, pos: '', peran: 'OVERFLOW', persen: 0.1, rendah: false }] };
/* ---------- dokumen outbound ----------
   Offline: PICKING PLAN-07 30, STAGING PLAN-06 12, TRANSIT PLAN-05 60, DELIVERED SJM-01 (8 hari lalu, tidak masuk 7 hari) dan SJM-02 (4 hari lalu).
   Shopee (lajur online): PACKING 2 pcs, TRANSIT 1, DELIVERED 1 (3 hari lalu).
   Sedang keluar (picking s.d. staging, semua lajur): 30 + 12 + 2 = 44. Di jalan: 60 + 1 = 61.
   Alur: Picking 30, Packing 2, Staging 12, Transit 61. */
const OBD = { ok: true, waktu: '2026-10-15T12:01:55+07:00', daftar: [
  { lajur: 'online', ref: '261012DELIV', tujuan: 'SHOPEE', tanggal: '2026-10-12', tahap: 'DELIVERED', noSj: '', sjBatal: false, pcsPesan: 1 },
  { lajur: 'online', ref: '261014PACK', tujuan: 'SHOPEE', tanggal: '2026-10-14', tahap: 'PACKING', noSj: '', sjBatal: false, pcsPesan: 2 },
  { lajur: 'online', ref: '261013ROAD', tujuan: 'SHOPEE', tanggal: '2026-10-13', tahap: 'TRANSIT', noSj: '', sjBatal: false, pcsPesan: 1 },
  { lajur: 'sj', ref: 'SJM-01', tujuan: 'MAA-PIM2', tanggal: '2026-10-07', tahap: 'DELIVERED', noSj: 'SJ-2610-0001', sjBatal: false, pcsPesan: 100 },
  { lajur: 'sj', ref: 'SJM-02', tujuan: 'T305', tanggal: '2026-10-11', tahap: 'DELIVERED', noSj: 'SJ-2610-0003', sjBatal: false, pcsPesan: 10 },
  { lajur: 'offline', ref: 'PLAN-2610-05', tujuan: 'KIY-GI', tanggal: '2026-10-10', tahap: 'TRANSIT', noSj: 'SJ-2610-0004', sjBatal: false, pcsPesan: 60 },
  { lajur: 'offline', ref: 'PLAN-2610-07', tujuan: 'T305', tanggal: '2026-10-14', tahap: 'PICKING', noSj: '', sjBatal: false, pcsPesan: 30 },
  { lajur: 'offline', ref: 'PLAN-2610-06', tujuan: 'T390', tanggal: '2026-10-13', tahap: 'STAGING', noSj: '', sjBatal: false, pcsPesan: 12 }
] };
const KERJA = { ok: true, html: '<p id="kerjaIsi">Work log</p>' };
const panggilApi = [];

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
  await new Promise(r => srv.listen(8774, r));
  const URL0 = 'http://localhost:8774/wms/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const pasangRute = async ctx => {
    await ctx.addInitScript(PALSU_AWAL);
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      if (m.fn === 'panggil') panggilApi.push(m.nama);
      let h;
      if (m.fn === 'panggil' && m.nama === 'dataPapan') h = { pintu: 'ok', hasil: DATA };
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
        const o = { 'dataPapan|["K"]': DATA, 'obdDaftar|["K"]': OBD, 'wmsGudang|["K"]': GUDANG, 'papanKerja|["K",""]': KERJA, 'klien|papan': { ok: true, versi: 'ringkas', html: PAPAN_PALSU }, 'klien|versi': { ok: true, versi: 'ringkas' } };
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

  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await pasangRute(ctx);
    const p = await halaman(ctx);
    await masuk(p, 'en');
    await jeda(1600);

    /* ================= menu ================= */
    await ke(p, 'stok'); await jeda(800);
    const m1 = await bacaMenu(p);
    c('A1 Inventory terbuka: Stock overview dan Warehouse racks paling atas, anak lama tetap, Rack replenishment tetap terakhir',
      /^l4stok=Stock overview\|l4rak=Warehouse racks\|bukubesar=/.test(m1.anak) && /\|obdIsiUlang=Isi ulang rak$/.test(m1.anak) && m1.atas === 'ringkasan,stok,laku,rencana,kinerja,sehat', JSON.stringify(m1));
    await ke(p, 'rencana'); await jeda(800);
    const m2 = await bacaMenu(p);
    c('A2 Shipments terbuka: Overview paling atas, lalu Outbound · Offline, Outbound · Shopee, lalu anak lama',
      /^l4kirim=Overview\|outbound=Outbound · Offline\|obdShopee=Outbound · Shopee\|pesanan=/.test(m2.anak), JSON.stringify(m2));
    const asli = await fe(p, () => window.HALAMAN.length + '/' + window.HALAMAN.filter(g => g[0] === 'outbound').length + '/' + JSON.stringify(window.HALAMAN).indexOf('l4'));
    c('A3 HALAMAN asli tidak dirusak: 7 grup, outbound satu, tanpa kode l4 halaman baru', asli === '7/1/-1', asli);

    /* ================= Stock overview ================= */
    await ke(p, 'l4stok', () => !!document.querySelector('[data-l4t-hal-ini=l4stok] [data-l4t-sku]'));
    const m3 = await bacaMenu(p);
    const lama = await fe(p, () => { const x = document.getElementById('ringkasanLama'); return x ? getComputedStyle(x).display : 'tidak ada'; });
    c('A4 buka Stock overview: grup Inventory terbuka, Stock overview menyala, isi papan lama di bawahnya disembunyikan',
      m3.induk === 'stok' && m3.nyala === 'l4stok' && lama === 'none', JSON.stringify(m3) + ' ' + lama);
    const so = await fe(p, () => {
      const s = document.querySelector('[data-l4t-hal-ini=l4stok]');
      const kartu = {}; s.querySelectorAll('[data-l4t-angka]').forEach(x => { kartu[x.getAttribute('data-l4t-angka')] = x.querySelector('strong').textContent; });
      const alur = Array.from(s.querySelectorAll('[data-l4t-alur]')).map(x => x.getAttribute('data-l4t-alur') + '=' + x.querySelector('strong').textContent).join(',');
      const baris = Array.from(s.querySelectorAll('tr[data-l4t-sku]')).map(tr => [tr.getAttribute('data-l4t-sku'), tr.querySelector('[data-k=ho]').textContent, tr.querySelector('[data-k=gerai]').textContent, tr.querySelector('[data-k=total]').textContent,
        Array.from(tr.querySelectorAll('[data-l4t-lok]')).map(x => x.getAttribute('data-l4t-lok') + ':' + x.getAttribute('data-isi') + (x.classList.contains('kosong') ? '!' : '')).join('+'),
        Array.from(tr.querySelectorAll('[data-l4t-status]')).map(x => x.getAttribute('data-l4t-status')).join('+')].join('/')).join(' | ');
      return { kartu, alur, baris };
    });
    c('B1 kartu: HO 54, sedang keluar 44 (picking s.d. staging semua lajur), di jalan 61, rak gerai 19',
      teksAngka(so.kartu.ho) === '54' && teksAngka(so.kartu.keluar) === '44' && teksAngka(so.kartu.jalan) === '61' && teksAngka(so.kartu.gerai) === '19', JSON.stringify(so.kartu));
    c('B2 alur "di mana stok sekarang": HO 54 › Picking 30 › Packing 2 › Staging 12 › Transit 61 › Gerai 19',
      so.alur === 'HO=54,PICKING=30,PACKING=2,STAGING=12,TRANSIT=61,GERAI=19', so.alur);
    const br = so.baris.split(' | ');
    c('B3 tabel per SKU urut total: Bear 24/14/38, Tiger 15/5/20, Lamb 12/0/12, Panda 3/0/3 (sama dengan buku besar)',
      br.map(x => x.split('/').slice(0, 4).join('/')).join(' | ') === 'MF-PLU-005/24/14/38 | MF-KC-008/15/5/20 | MF-PLU-040/12/0/12 | MF-PLU-010/3/0/3', so.baris);
    c('B4 lokasi rak HO per SKU dari peta gudang: Bear R1-4A 20 + X-01 4, Tiger R1-3B 0 ditandai kosong, Lamb T2-1A 5, Panda tanpa lokasi',
      br.map(x => x.split('/')[4]).join(' | ') === 'R1-4A:20+X-01:4 | R1-3B:0! | T2-1A:5 | ', so.baris);
    c('B5 status: Bear ok, Tiger rak pick kosong, Lamb tidak ada di gerai mana pun, Panda tidak di gerai dan HO tipis (di bawah 6 pcs)',
      br.map(x => x.split('/')[5]).join(' | ') === 'ok | rakkosong | tanpagerai | tanpagerai+tipis', so.baris);
    const saring = {};
    for (const s of ['rakkosong', 'tanpagerai', 'tipis', 'semua']) {
      await fe(p, k => document.querySelector('[data-l4t-hal-ini=l4stok] [data-l4t-saring="' + k + '"]').click(), s); await jeda(150);
      saring[s] = await fe(p, () => Array.from(document.querySelectorAll('[data-l4t-hal-ini=l4stok] tr[data-l4t-sku]')).filter(tr => tr.offsetParent !== null).map(tr => tr.getAttribute('data-l4t-sku')).join(','));
    }
    c('B6 saringan: Rak kosong = Tiger; Tidak di gerai = Lamb, Panda; HO tipis = Panda; Semua kembali 4 SKU',
      saring.rakkosong === 'MF-KC-008' && saring.tanpagerai === 'MF-PLU-040,MF-PLU-010' && saring.tipis === 'MF-PLU-010' && saring.semua.split(',').length === 4, JSON.stringify(saring));
    const perhatian = await fe(p, () => { const o = {}; document.querySelectorAll('[data-l4t-hal-ini=l4stok] [data-l4t-perhatian]').forEach(x => { o[x.getAttribute('data-l4t-perhatian')] = Array.from(x.querySelectorAll('[data-l4t-item]')).map(i => i.getAttribute('data-l4t-item')).join(','); }); return o; });
    c('B7 kartu perlu perhatian: HO tipis Panda; rak pick kosong Tiger di R1-3B; cuma ada di HO Lamb dan Panda',
      perhatian.tipis === 'MF-PLU-010' && perhatian.rakkosong === 'MF-KC-008@R1-3B' && perhatian.tanpagerai === 'MF-PLU-040,MF-PLU-010', JSON.stringify(perhatian));
    await fe(p, () => document.querySelector('[data-l4t-hal-ini=l4stok] [data-l4t-alur=TRANSIT]').click()); await jeda(400);
    c('B8 tahap Transit di alur membuka Shipments · Overview', (await fe(p, () => window.HAL)) === 'l4kirim', '');

    /* ================= Warehouse racks ================= */
    await ke(p, 'l4rak', () => !!document.querySelector('[data-l4t-hal-ini=l4rak] [data-l4t-slot]'));
    const rk = await fe(p, () => {
      const s = document.querySelector('[data-l4t-hal-ini=l4rak]');
      const grup = Array.from(s.querySelectorAll('[data-l4t-unit]')).map(g => g.getAttribute('data-l4t-unit') + ':' + Array.from(g.querySelectorAll('[data-l4t-slot]')).map(x => x.getAttribute('data-l4t-slot') + (x.classList.contains('kosong') ? '!' : x.classList.contains('rendah') ? '~' : '')).join(',')).join(' | ');
      const angka = {}; s.querySelectorAll('[data-l4t-angka]').forEach(x => { angka[x.getAttribute('data-l4t-angka')] = x.querySelector('strong').textContent; });
      return { grup, angka };
    });
    c('C1 lokasi dikelompokkan per unit: R1 (R1-4A, R1-3B kosong, R1-2A kosong), T2 (T2-1A di bawah 50%), X overflow (X-01)',
      rk.grup === 'R1:R1-4A,R1-3B!,R1-2A! | T2:T2-1A~ | X:X-01', rk.grup);
    c('C2 ringkasan: 3 dari 5 lokasi terisi, 29 pcs di lokasi, 2 lokasi kosong',
      teksAngka(rk.angka.terisi) === '35' && teksAngka(rk.angka.pcs) === '29' && teksAngka(rk.angka.kosong) === '2', JSON.stringify(rk.angka));

    /* ================= Shipments overview ================= */
    await ke(p, 'l4kirim', () => !!document.querySelector('[data-l4t-hal-ini=l4kirim] [data-l4t-kolom=offline] [data-l4t-tahap]'));
    const ko = await fe(p, () => {
      const s = document.querySelector('[data-l4t-hal-ini=l4kirim]');
      const tahap = k => Array.from(s.querySelectorAll('[data-l4t-kolom=' + k + '] [data-l4t-tahap]')).map(x => x.getAttribute('data-l4t-tahap') + '=' + x.querySelector('strong').textContent).join(',');
      return { off: tahap('offline'), shp: tahap('shopee'), refOff: Array.from(s.querySelectorAll('[data-l4t-kolom=offline] [data-l4t-ref]')).map(x => x.getAttribute('data-l4t-ref')).join(','), refShp: Array.from(s.querySelectorAll('[data-l4t-kolom=shopee] [data-l4t-ref]')).map(x => x.getAttribute('data-l4t-ref')).join(',') };
    });
    c('D1 kolom kiriman ke gerai: Picking 1, Packing 0, Staging 1, Transit 1, Delivered 7 hari 1 (SJM-01 sudah 8 hari, tidak ikut; Shopee tidak ikut)',
      ko.off === 'PICKING=1,PACKING=0,STAGING=1,TRANSIT=1,DELIVERED=1', JSON.stringify(ko));
    c('D2 kolom Shopee: Picking 0, Packing 1, Ke kurir 0, Di jalan 1, Delivered 7 hari 1; dokumen terbaru yang belum sampai di atas',
      ko.shp === 'PICKING=0,PACKING=1,STAGING=0,TRANSIT=1,DELIVERED=1' && ko.refShp.split(',')[0] === '261014PACK' && /^PLAN-2610-07,PLAN-2610-06,PLAN-2610-05/.test(ko.refOff), JSON.stringify(ko));
    await fe(p, () => document.querySelector('[data-l4t-hal-ini=l4kirim] [data-l4t-kolom=offline] [data-l4t-ref="PLAN-2610-07"]').click()); await jeda(400);
    const keOff = await fe(p, () => window.HAL);
    await ke(p, 'l4kirim', () => !!document.querySelector('[data-l4t-hal-ini=l4kirim] [data-l4t-kolom=shopee] [data-l4t-ref]'));
    await fe(p, () => document.querySelector('[data-l4t-hal-ini=l4kirim] [data-l4t-kolom=shopee] [data-l4t-ref]').click()); await jeda(400);
    const keShp = await fe(p, () => window.HAL);
    c('D3 nomor dokumen gerai membuka Outbound · Offline, nomor pesanan Shopee membuka Outbound · Shopee', keOff === 'outbound' && keShp === 'obdShopee', keOff + ' ' + keShp);
    await ctx.close();

    /* ================= HP, bahasa Indonesia ================= */
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasangRute(ctx2);
    const hp = await halaman(ctx2);
    await masuk(hp, 'id');
    await fe(hp, () => { document.documentElement.lang = 'id'; });
    const hasil = [];
    for (const [h, sel] of [['l4stok', '[data-l4t-sku]'], ['l4rak', '[data-l4t-slot]'], ['l4kirim', '[data-l4t-tahap]']]) {
      await ke(hp, h, s => !!document.querySelector('[data-l4t-hal-ini] ' + s), );
      await tungguBingkai(hp, s => !!document.querySelector(s), 6000, '[data-l4t-hal-ini=' + h + '] ' + sel);
      hasil.push(await fe(hp, h => ({ h, lebar: document.documentElement.scrollWidth, em: /\u2014/.test(document.getElementById('isi').innerText), judul: (document.querySelector('[data-l4t-hal-ini=' + h + '] h1') || {}).textContent }), h));
    }
    c('E1 HP 390 px: tiga halaman tanpa geser samping dan tanpa tanda pisah panjang', hasil.every(x => x.lebar <= 392 && !x.em), JSON.stringify(hasil));
    await ke(hp, 'stok'); await jeda(600);
    const mId = await bacaMenu(hp);
    c('E2 bahasa Indonesia: judul Ringkasan stok, Rak gudang, Ringkasan pengiriman; menu ikut',
      hasil.map(x => x.judul).join('|') === 'Ringkasan stok|Rak gudang|Ringkasan pengiriman' && /^l4stok=Ringkasan stok\|l4rak=Rak gudang\|/.test(mId.anak), JSON.stringify(hasil.map(x => x.judul)) + ' ' + mId.anak);
    await ctx2.close();
  } catch (e) {
    c('MATI di tengah jalan', false, e.stack);
  }
  c('E3 tidak ada galat JavaScript selama uji', galat.length === 0, galat.join(' | ').slice(0, 500));

  await b.close(); srv.close();
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 500))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
})();
