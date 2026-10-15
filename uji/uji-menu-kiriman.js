/* Uji menu Warehouse dibubarkan ke Inventory dan Shipments (wms/tata.js), 15 Okt 2026.
 * Harapan: "16 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy: "warehouse dan inventory blm nyatu", lalu "laporan
 * outbound offline dan shopee bisa link ke shipment?". Mockup disetujui 15 Okt:
 * menu Warehouse hilang, Outbound Offline dan Shopee masuk Shipments, Rack
 * Replenishment masuk Inventory, dan Shipments dapat kartu jalur offline yang
 * menautkan dokumen outbound ke surat jalannya.
 * Yang paling mungkin rusak tanpa ada yang sadar:
 *  - skrip Gudang papan lama memasang ulang grup "outbound" tiap 700 ms
 *    (pasangMenu di pdgSkripTunda). Kalau lapisan ini membuang grup itu dari
 *    HALAMAN, menu Warehouse muncul lagi atau tergandakan;
 *  - grup yang terbuka salah: buka Outbound Offline tapi yang menyala Inventory;
 *  - subjudul tetap "Warehouse · outbound" padahal menunya sudah Shipments;
 *  - kartu jalur offline ikut menghitung pesanan Shopee;
 *  - halaman Operational PIC (papanKerja) tetap ke Apps Script 10-20 detik
 *    padahal potretnya sudah ada di Supabase.
 * HALAMAN, grupTerbuka, gambarPanel dan pasangMenu di papan palsu disalin dari
 * papan asli (klien|papan dan pdgSkripTunda|["gudang"] di Supabase, 15 Okt).
 * Angka harapan dihitung tangan dari OBD di bawah.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const AKAR = '/home/claude/fieldreport';
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const KODE_BENAR = 'KODE-PALSU-UJI';
const DIHARAPKAN = 16;
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(AKAR, p);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});

/* ---------- dokumen outbound, disusun di sini ----------
   Offline (lajur offline dan sj): PICKING 1 (PLAN-07), STAGING 1 (PLAN-06),
   TRANSIT 1 (PLAN-05, SJ-2610-0004), DELIVERED 1 (SJM-01, SJ-2610-0001).
   Belum sampai gerai: 30 + 12 + 60 = 102 pcs.
   Pesanan Shopee (lajur online, DELIVERED) TIDAK boleh ikut dihitung. */
const OBD = { ok: true, waktu: '2026-10-15T12:01:55+07:00', jml: { PICKING: 1, PACKING: 0, STAGING: 1, TRANSIT: 1, DELIVERED: 2 }, daftar: [
  { lajur: 'online', ref: '261011BKEGFKHX', tujuan: 'SHOPEE', tanggal: '2026-10-12', tahap: 'DELIVERED', noSj: '', sjBatal: false, pcsPesan: 1 },
  { lajur: 'sj', ref: 'SJM-01', tujuan: 'MAA-PIM2', tanggal: '2026-10-07', tahap: 'DELIVERED', noSj: 'SJ-2610-0001', sjBatal: false, pcsPesan: 100 },
  { lajur: 'offline', ref: 'PLAN-2610-05', tujuan: 'KIY-GI', tanggal: '2026-10-10', tahap: 'TRANSIT', noSj: 'SJ-2610-0004', sjBatal: false, pcsPesan: 60 },
  { lajur: 'offline', ref: 'PLAN-2610-07', tujuan: 'T305', tanggal: '2026-10-14', tahap: 'PICKING', noSj: '', sjBatal: false, pcsPesan: 30 },
  { lajur: 'offline', ref: 'PLAN-2610-06', tujuan: 'T390', tanggal: '2026-10-13', tahap: 'STAGING', noSj: '', sjBatal: false, pcsPesan: 12 }
] };
const OBD_SHOPEE_SAJA = { ok: true, waktu: '2026-10-15T12:01:55+07:00', daftar: [OBD.daftar[0]] };
const KERJA = { ok: true, html: '<p id="kerjaIsi">Work log</p>' };
const DATA = { ok: true, hariIni: '2026-10-15', bulanIni: '2026-10', lok: [{ k: 'HO', n: 'HO', toko: 0 }], prod: [], baris: [] };
let obdSekarang = OBD;
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
  await new Promise(r => srv.listen(8773, r));
  const URL0 = 'http://localhost:8773/wms/';
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
      /* Apps Script asli 10-20 detik untuk papanKerja; di sini 2,5 detik sudah cukup membedakan */
      else if (m.fn === 'panggil' && m.nama === 'papanKerja') { await jeda(2500); h = { pintu: 'ok', hasil: KERJA }; }
      else if (m.fn === 'panggil' && m.nama === 'obdDaftar') h = { pintu: 'ok', hasil: obdSekarang };
      else h = { pintu: 'galat', pesan: 'Fungsi "' + (m.nama || m.fn) + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = String(m.kode || '').trim().toUpperCase() === KODE_BENAR ? { ok: true, tiket: 'TIKET.SUPA', ingat: true } : { ok: false, pesan: 'no' };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA, 'obdDaftar|["K"]': obdSekarang, 'papanKerja|["K",""]': KERJA, 'klien|papan': { ok: true, versi: 'menu', html: PAPAN_PALSU }, 'klien|versi': { ok: true, versi: 'menu' } };
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
  const ke = async (p, hal, tunggu) => { await fe(p, h => { window.HAL = h; window.gambar(); }, hal); if (tunggu) await tungguBingkai(p, tunggu, 6000); await jeda(150); };
  /* menu kiri dibaca apa adanya: grup atas, dan anak grup yang terbuka */
  const bacaMenu = p => fe(p, () => {
    const pn = document.getElementById('panel');
    const atas = Array.from(pn.children).filter(x => x.tagName === 'A').map(a => a.getAttribute('data-hal'));
    const anak = Array.from(pn.querySelectorAll('.anak a')).map(a => a.getAttribute('data-hal') + '=' + a.textContent);
    const induk = (pn.querySelector(':scope > a.induk, :scope > a.on') || {}).getAttribute ? pn.querySelector(':scope > a.induk, :scope > a.on').getAttribute('data-hal') : '';
    const nyala = (pn.querySelector('.anak a.on') || { getAttribute: () => '' }).getAttribute('data-hal');
    return { atas: atas.join(','), anak: anak.join('|'), induk, nyala, nOutbound: pn.querySelectorAll('[data-hal=outbound]').length };
  });

  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await pasangRute(ctx);
    const p = await halaman(ctx);
    await masuk(p, 'en');

    /* ================= menu ================= */
    await jeda(1600); /* pasangMenu sudah jalan beberapa kali */
    const m0 = await bacaMenu(p);
    c('M1 grup atas: Summary, Inventory, Sales, Shipments, Field, Data quality; Warehouse (outbound) tidak tampil walau pasangMenu jalan tiap 700 ms',
      m0.atas === 'ringkasan,stok,laku,rencana,kinerja,sehat', JSON.stringify(m0));
    const asli = await fe(p, () => window.HALAMAN.filter(g => g[0] === 'outbound').length + '/' + window.HALAMAN.length);
    c('M2 HALAMAN asli tidak dirusak: grup outbound tetap satu di sana (pasangMenu tidak menyisipkan ulang, tidak ganda)', asli === '1/7', asli);

    await ke(p, 'rencana'); await jeda(800);
    const m1 = await bacaMenu(p);
    c('M3 Shipments terbuka: Outbound · Offline dan Outbound · Shopee paling atas, lalu anak lama (Pesanan, Surat jalan, Permintaan gerai, Alokasi, Barang kembali)',
      m1.anak === 'outbound=Outbound · Offline|obdShopee=Outbound · Shopee|pesanan=Pesanan|kemas=Surat jalan & PO|mintagerai=Permintaan gerai|alokasi=Alokasi & pengganti|kembali=Barang kembali', JSON.stringify(m1));

    await ke(p, 'outbound'); await jeda(900);
    const m2 = await bacaMenu(p);
    const sub2 = await fe(p, () => document.getElementById('subJudul').textContent.replace(/\u00a0/g, ' '));
    c('M4 buka Outbound Offline: grup Shipments yang terbuka, Outbound · Offline menyala, menu link outbound cuma satu',
      m2.induk === 'rencana' && m2.nyala === 'outbound' && m2.nOutbound === 1, JSON.stringify(m2));
    c('M5 subjudul halaman outbound "Shipments · outbound", bukan Warehouse', sub2 === 'Shipments · outbound', sub2);
    const k0 = await fe(p, () => window.__subKali || 0); await jeda(1500); const k1 = await fe(p, () => window.__subKali || 0);
    c('M6 subjudul tidak ditulis ulang ke DOM tiap 700 ms walau skrip Gudang memanggil terus (tidak berkedip)', k1 - k0 <= 1, k0 + ' -> ' + k1);

    await ke(p, 'obdIsiUlang'); await jeda(900);
    const m3 = await bacaMenu(p);
    const sub3 = await fe(p, () => document.getElementById('subJudul').textContent.replace(/\u00a0/g, ' '));
    c('M7 Rack replenishment ada di Inventory (anak terakhir), grup Inventory yang terbuka, subjudul "Inventory · Rack replenishment"',
      m3.induk === 'stok' && /\|obdIsiUlang=Isi ulang rak$/.test(m3.anak) && m3.nyala === 'obdIsiUlang' && sub3 === 'Inventory · Rack replenishment', JSON.stringify(m3) + ' ' + sub3);

    /* ================= kartu jalur offline di Shipments ================= */
    await ke(p, 'rencana', () => !!document.querySelector('[data-l4t-jalur=offline] [data-l4t-tahap]'));
    const j = await fe(p, () => {
      const kartu = document.querySelector('[data-l4t-jalur=offline]');
      if (!kartu) return { tahap: 'TIDAK ADA KARTU', baris: '', glance: !!document.getElementById('glance') };
      const tahap = Array.from(kartu.querySelectorAll('[data-l4t-tahap]')).map(x => x.getAttribute('data-l4t-tahap') + '=' + x.querySelector('strong').textContent).join(',');
      const baris = Array.from(kartu.querySelectorAll('tbody tr')).map(tr => tr.getAttribute('data-l4t-ref')).join(',');
      return { tahap, baris, belum: (kartu.querySelector('[data-l4t-belum]') || {}).textContent, glance: !!document.getElementById('glance'), urutan: document.getElementById('isi').firstElementChild.className };
    });
    c('M8 kartu offline: Picking 1, Packing 0, Staging 1, Transit 1, Delivered 1 (pesanan Shopee tidak ikut)',
      j.tahap === 'PICKING=1,PACKING=0,STAGING=1,TRANSIT=1,DELIVERED=1', JSON.stringify(j));
    c('M9 dokumen yang belum sampai di atas, terbaru dulu, yang sudah sampai di bawah; 102 pcs belum sampai gerai; kartu Shipments lama tetap ada',
      j.baris === 'PLAN-2610-07,PLAN-2610-06,PLAN-2610-05,SJM-01' && /102 pcs/.test(j.belum || '') && j.glance, JSON.stringify(j));
    await fe(p, () => (document.querySelector('[data-l4t-jalur=offline] tr[data-l4t-ref="PLAN-2610-05"] [data-l4t-hal=kemas]') || { click() {} }).click());
    await jeda(400);
    const keSj = await fe(p, () => window.HAL + ':' + !!document.getElementById('sjLama'));
    c('M10 nomor SJ-2610-0004 di baris PLAN-2610-05 membuka Delivery orders (kemas)', keSj === 'kemas:true', keSj);
    const balik = await tungguBingkai(p, () => !!document.querySelector('[data-l4t-balik=outbound]'), 4000);
    const balikTeks = balik ? await fe(p, () => document.querySelector('[data-l4t-balik]').closest('[data-l4t-hal-ini]').innerText) : '';
    await fe(p, () => document.querySelector('[data-l4t-balik=outbound]').click()).catch(() => {});
    await jeda(400);
    const keObd = await fe(p, () => window.HAL);
    c('M11 Delivery orders punya tautan balik ke Outbound · Offline (3 dokumen masih jalan) dan tautannya membuka outbound',
      balik && /3/.test(balikTeks) && keObd === 'outbound', balikTeks + ' -> ' + keObd);
    await ke(p, 'rencana', () => !!document.querySelector('[data-l4t-jalur=offline] [data-l4t-tahap]'));
    await fe(p, () => (document.querySelector('[data-l4t-jalur=offline] tr[data-l4t-ref="PLAN-2610-07"] [data-l4t-hal=outbound]') || { click() {} }).click());
    await jeda(400);
    c('M12 nomor dokumen PLAN-2610-07 membuka Outbound · Offline', (await fe(p, () => window.HAL)) === 'outbound', '');

    /* ================= Operational PIC dari potret ================= */
    const sebelum = panggilApi.filter(n => n === 'papanKerja').length;
    await ke(p, 'absenlokasi', () => !!document.getElementById('kerjaIsi'));
    const ms = await fe(p, () => window.__kerjaMs);
    const sesudah = panggilApi.filter(n => n === 'papanKerja').length;
    c('M13 Operational PIC (papanKerja bulan berjalan) dibaca dari potret Supabase: tidak memanggil Apps Script, tampil di bawah 1,5 detik',
      sesudah === sebelum && ms < 1500, 'api ' + sebelum + '->' + sesudah + ', ' + ms + ' ms');
    await ctx.close();

    /* ================= kosong, HP, bahasa Indonesia ================= */
    obdSekarang = OBD_SHOPEE_SAJA;
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasangRute(ctx2);
    const hp = await halaman(ctx2);
    await masuk(hp, 'id');
    await fe(hp, () => { document.documentElement.lang = 'id'; });
    await ke(hp, 'rencana', () => !!document.querySelector('[data-l4t-jalur=offline] [data-l4t-kosong]'));
    const ks = await fe(hp, () => ({ teks: (document.querySelector('[data-l4t-jalur=offline]') || {}).innerText || '', lebar: document.documentElement.scrollWidth, em: /—/.test(document.getElementById('isi').innerText) }));
    c('M14 tanpa dokumen offline: kartu bilang belum ada kiriman ke gerai (bukan tabel kosong), HP 390 px tanpa geser samping, tanpa tanda pisah panjang',
      /Belum ada kiriman ke gerai/.test(ks.teks) && ks.lebar <= 392 && !ks.em, JSON.stringify(ks).slice(0, 300));
    await ke(hp, 'outbound'); await jeda(900);
    const subId = await fe(hp, () => document.getElementById('subJudul').textContent.replace(/\u00a0/g, ' '));
    c('M15 bahasa Indonesia: subjudul "Pengiriman · outbound"', subId === 'Pengiriman · outbound', subId);
    await ctx2.close();
  } catch (e) {
    c('MATI di tengah jalan', false, e.stack);
  }
  c('M16 tidak ada galat JavaScript selama uji menu', galat.length === 0, galat.join(' | ').slice(0, 500));

  await b.close(); srv.close();
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 500))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
})();
