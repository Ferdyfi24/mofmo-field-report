/* Uji tata letak Mofmo Soft P9 sampai P14 di WMS (wms/tata.js), 11 Okt 2026.
 * Harapan: "27 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy minta tata letak penuh mockup P9 sampai P14 di WMS
 * asli. Papan lama tetap menggambar halamannya sendiri (HAL + gambar()), lapisan
 * ini menempel di atasnya. Yang paling mungkin rusak tanpa ada yang sadar:
 *  - angka di halaman baru beda dengan buku besar (stok per rak, umur modal FIFO,
 *    komisi per retailer), padahal halaman lama yang disembunyikan benar;
 *  - isi lama tidak tersembunyi, jadi dua versi angka tampil berdampingan, atau
 *    sebaliknya tetap tersembunyi waktu pindah ke halaman lain;
 *  - gambar ulang papan (gambarBacaPo memanggil innerHTML lagi) menggandakan
 *    kolom stok HO di tabel PO;
 *  - tombol simpan dan unggah papan berhenti jalan karena elemennya dipindah.
 * Semua angka harapan dihitung tangan dari baris buku besar di bawah.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const AKAR = '/home/claude/fieldreport';
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const KODE_BENAR = 'KODE-PALSU-UJI';
const DIHARAPKAN = 27;
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(AKAR, p);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});

/* ---------- buku besar, disusun di sini ----------
   Hari ini 2026-10-11.
   HO     : Bear 20 - 4 - 2 = 14, Panda 10 - 3 = 7 (lot 1 Agu, 71 hari), Tiger lot 1 Agu 5 dan lot 15 Agu 3,
            2 keluar 1 Sep diambil dari lot TERTUA (FIFO): sisa 3 x 71 hari + 3 x 57 hari = 6 pcs.
            Kalau diambil dari lot termuda (LIFO) sisanya 5 x 71 + 1 x 57, rata-rata HO jadi 70, bukan 69.
   T305   : Bear 4 (tiba 21 Agu, belum laku: oranye, diam 51 hari), Panda 3 - 1 laku = 2 (tiba 21 Agu)
   T390   : Tiger 2 (tiba 2 Sep, belum laku: oranye, diam 39 hari)
   KIY-GI : Bear 2 (tiba 26 Sep, 15 hari: oranye tapi belum 30 hari)
   Rak gerai: 3 gerai, 10 pcs. Kolom urut retailer lalu kode: KIY-GI, T305, T390.
   Nilai rak TGI: modal 4x194.250 + 2x194.250 + 2x166.860 = 1.499.220; rak 4x298.846 + 2x298.846 + 2x249.900 = 2.292.876.
   Modal FIFO (hs): HO 21x175.000 + 6x150.324 = 4.576.944, rata (21x71 + 3x71 + 3x57)/27 = 1.875/27 = 69 hari;
     TGI 6x175.000 + 2x150.324 = 1.350.648, rata (4x51 + 2x51 + 2x39)/8 = 48 hari; KIY 350.000, 15 hari.
     Total 6.277.592: HO 73%, TGI 22%, KIY 6%.
   Invoice bulan tutup = September: 500.000 (T305 300.000, KIY-GI 200.000), komisi 10% = 50.000: TGI 60%, KIY 40%. */
const L = { T305: 0, T390: 1, KIYGI: 2, HO: 3, TERJUAL: 4, OPENING: 5, TRANSIT: 6 };
const DATA = { ok: true, hariIni: '2026-10-11', bulanIni: '2026-10', tarif: 0.1, diperbarui: '11 Oct 2026 03:00',
  lok: [{ k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', r: 'TGI', toko: 1 }, { k: 'T390', n: 'TOYS KINGDOM LIVING WORLD KOTA WISATA CIBUBUR', r: 'TGI', toko: 1 }, { k: 'KIY-GI', n: 'KINOKUNIYA GRAND INDONESIA', r: 'KIY', toko: 1 },
    { k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }, { k: 'TRANSIT', toko: 0 }],
  prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 }, { b: '222', n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 175000, h: 194250, r: 298846 }, { b: '333', n: 'MofmoFriends Key Charm - Tiger', s: 'MF-KC-008', hs: 150324, h: 166860, r: 249900 }],
  baris: [
    ['2026-08-01', 0, 20, L.OPENING, L.HO], ['2026-08-01', 1, 10, L.OPENING, L.HO], ['2026-08-01', 2, 5, L.OPENING, L.HO], ['2026-08-15', 2, 3, L.OPENING, L.HO],
    ['2026-08-20', 0, 4, L.HO, L.TRANSIT], ['2026-08-21', 0, 4, L.TRANSIT, L.T305],
    ['2026-08-20', 1, 3, L.HO, L.TRANSIT], ['2026-08-21', 1, 3, L.TRANSIT, L.T305], ['2026-09-10', 1, 1, L.T305, L.TERJUAL],
    ['2026-09-25', 0, 2, L.HO, L.TRANSIT], ['2026-09-26', 0, 2, L.TRANSIT, L.KIYGI],
    ['2026-09-01', 2, 2, L.HO, L.TRANSIT], ['2026-09-02', 2, 2, L.TRANSIT, L.T390]
  ],
  invoiceMitra: [{ bulan: '2026-10', unit: 1, nilai: 182000, gerai: { T305: { unit: 1, nilai: 182000 } } }, { bulan: '2026-09', unit: 3, nilai: 500000, gerai: { T305: { unit: 2, nilai: 300000 }, 'KIY-GI': { unit: 1, nilai: 200000 } } }],
  sehat: { berat: 0, ringan: 1, temuan: [{ jml: 96, judul: 'SKU belum pernah ada barangnya', ket: 'Terdaftar di Master Produk tapi belum pernah masuk mutasi.', bobot: 'ringan', contoh: ['S - Tiger', 'S - Cow', 'S - Seal', 'S - Sea Lion'] }] },
  pemicu: { merah: 0, daftar: [{ fn: 'panaskanSimpanan', judul: 'Pemuatan awal data', jadwal: 'tiap 10 menit', status: 'hijau', terpasang: true, ket: 'Terakhir berjalan 12 menit lalu.' },
    { fn: 'kirimPantauChat', judul: 'Kabar Chat harian', jadwal: '22.15', status: 'kuning', terpasang: true, ket: 'Terakhir berjalan 30 jam lalu.' },
    { fn: 'kirimRekapMingguan', judul: 'Rekap mingguan', jadwal: 'Senin', status: 'abu', terpasang: false, ket: '' }] },
  mitraDiam: { ok: true, mitra: [{ kode: 'MAA', telat: true, hariDiam: 18, terakhir: '2026-09-23' }, { kode: 'TGI', telat: false, hariDiam: 2, terakhir: '2026-10-09' }] },
  aktivitas: [{ waktu: '2026-10-11 02:10', subjek: 'SJ-2610-0001', aksi: 'Kiriman dikonfirmasi diterima', ketData: 'dari kantor' }, { waktu: '2026-10-09 14:30', subjek: 'Indra', aksi: 'Check-out di KIY-PIK' }]
};
const TAGIHAN_ADA = { ok: true, tagihan: { ok: true, total: 750000, dibayar: 250000, belum: 500000, lewat: 200000, baris: [
  { no: 'INV-KIY-08', retailer: 'KIY', tempo: '2026-09-30', nilai: 200000, sisa: 200000, lunas: false, telat: true, hariLewat: 11 },
  { no: 'INV-TGI-09', retailer: 'TGI', tempo: '2026-10-30', nilai: 300000, sisa: 300000, lunas: false, telat: false, hariLewat: 0 },
  { no: 'INV-TGI-08', retailer: 'TGI', tempo: '2026-09-30', nilai: 250000, sisa: 0, lunas: true, telat: false, hariLewat: 0 }] } };
const TAGIHAN_BELUM = { ok: true, tagihan: { ok: false, baris: [], total: 0, dibayar: 0, belum: 0, lewat: 0, pesan: 'Sheet "Tagihan Mitra" belum ada. Jalankan menu "Siapkan PO mitra & tagihan" sekali.' } };
let PIUTANG = TAGIHAN_ADA, LAMBAT = 0;

/* ---------- papan lama palsu: HAL + gambar(), isi #isi diganti tiap halaman ---------- */
const SKRIP = function () {
  window.HAL = 'ringkasan'; window.PO_ADA = 0;
  var el = function (i) { return document.getElementById(i); };
  window.gambar = function () {
    var I = el('isi');
    if (HAL === 'stokgerai') I.innerHTML = '<div class="halKepala"><h1>Gerai offline lama</h1></div><div class="k s12" id="lamaGerai">Kartu per gerai versi lama</div>';
    else if (HAL === 'mitra2') I.innerHTML = '<div class="halKepala"><h1>Orders lama</h1></div><div class="k s12" id="lamaMitra">Store readiness</div>';
    else if (HAL === 'sehat') I.innerHTML = '<div class="halKepala"><h1>Data quality lama</h1></div><div class="k s12" id="lamaSehat">Temuan lama</div>';
    else if (HAL === 'dokumen') I.innerHTML = '<div class="k"><h2>Partner sales documents</h2><div class="sub">For files that do not come by email.</div><div class="dokAmbil"><label class="dokBerkas" for="dokFile">Choose file</label><input id="dokFile" type="file" style="display:none"><span id="dokNama">No file chosen yet</span></div><textarea id="dokTeks"></textarea><div class="sjAksi"><button id="dokBaca" onclick="window.__baca=(window.__baca||0)+1">Read document</button></div><div id="dokHasil"></div></div>';
    else if (HAL === 'bacapo') window.gambarBacaPo();
    else if (HAL === 'outbound') { I.innerHTML = '<div id="obdKotak"></div>'; el('obdKotak').attachShadow({ mode: 'open' }).innerHTML = '<div class="o"><div class="kep"><div><h2 id="obdJudul">Warehouse · Outbound</h2><small id="obdWaktu">Updated 03:40.</small></div><div class="alat"><button>Reload</button></div></div></div>'; }
    else I.innerHTML = '<div class="k s12" id="ringkasanLama">Summary</div>';
  };
  window.gambarBacaPo = function () {
    var s = '<div class="halTab"><button class="halTabB">Delivery order</button><button class="halTabB on">Read a PO</button></div><div class="k s12"><h2>Read a PO document</h2><div class="sub"><span>Upload the partner PO.</span></div>' +
      '<div class="poAmbil"><label class="dokBerkas" for="poFile">Choose file</label><input type="file" id="poFile" style="position:absolute;left:-9999px"><span id="poNama">No file chosen yet</span></div>' +
      '<textarea id="poTeks" class="poTeks"></textarea><div class="poTbl"><button class="poBacaTbl" id="poBaca" onclick="window.__poBaca=(window.__poBaca||0)+1">Read document</button></div>';
    if (window.PO_ADA) s += '<div class="poHasil"><div class="poKop"><label class="poKopSatu"><span>PO number</span><input id="poNo" value="PO-1"></label></div>' +
      '<table class="poTab"><tr class="tbk"><td>Item</td><td>Barcode</td><td class="ka">Ordered</td></tr><tr><td>Bear</td><td class="poBc">111</td><td class="ka"><b>3</b></td></tr><tr><td>Tiger</td><td class="poBc">333</td><td class="ka"><b>7</b></td></tr></table>' +
      '<div class="poTbl"><button class="poSimpan" id="poSimpan" onclick="window.__poSimpan=(window.__poSimpan||0)+1">Save as order</button></div></div>';
    el('isi').innerHTML = s + '</div>';
  };
};
const PAPAN_PALSU = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title>' +
  '<style>body{margin:0;background:#FBF8F0;font-family:Arial,sans-serif}#layarIsi{display:none}.rangka{display:flex}.panel{flex:0 0 236px}.utama{flex:1;min-width:0;padding:16px}' +
  '.petak{display:grid;gap:16px;grid-template-columns:repeat(12,1fr);min-width:0}.petak>:not(.k){grid-column:span 12;min-width:0}.k{grid-column:span 12;background:#fff;padding:16px;min-width:0}' +
  '@media(max-width:900px){.rangka{display:block}.panel{display:flex;overflow-x:auto}}</style></head><body>' +
  '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
  '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div style="flex:1;min-width:0"><h1>Papan Data</h1></div><div id="kopKanan"></div></div></header>' +
  '<div class="rangka"><nav class="panel" id="panel"><h3>Dashboard</h3><a class="on" data-hal="ringkasan"><span class="pnlNama">Summary</span></a></nav>' +
  '<div class="utama"><div id="isi" class="petak"></div></div></div></div>' +
  '<script>(' + SKRIP.toString() + ')();var KODE="";function buka(){KODE=document.getElementById("kode").value;google.script.run.withSuccessHandler(function(r){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";gambar();window.__siap=1;}).dataPapan(KODE);}<\/script></body></html>';

const PALSU_AWAL = () => {
  function Ctx() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  Ctx.prototype.createOscillator = function () { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; };
  Ctx.prototype.createGain = function () { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  Ctx.prototype.resume = function () {};
  window.AudioContext = Ctx; window.webkitAudioContext = Ctx;
};

(async () => {
  await new Promise(r => srv.listen(8772, r));
  const URL0 = 'http://localhost:8772/wms/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const pasangRute = async ctx => {
    await ctx.addInitScript(PALSU_AWAL);
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'panggil' && m.nama === 'dataPapan') h = { pintu: 'ok', hasil: DATA };
      else if (m.fn === 'panggil' && m.nama === 'permintaanDanPiutang') h = { pintu: 'ok', hasil: PIUTANG };
      else h = { pintu: 'galat', pesan: 'Fungsi "' + (m.nama || m.fn) + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = String(m.kode || '').trim().toUpperCase() === KODE_BENAR ? { ok: true, tiket: 'TIKET.SUPA', ingat: true } : { ok: false, pesan: 'no' };
      else if (m.fn === 'ambil') {
        if (LAMBAT && (m.kunci || []).indexOf('dataPapan|["K"]') > -1) await jeda(LAMBAT);
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA, 'klien|papan': { ok: true, versi: 'tata', html: PAPAN_PALSU }, 'klien|versi': { ok: true, versi: 'tata' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
  const galat = [];
  const jeda = ms => new Promise(x => setTimeout(x, ms));
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
    await tungguBingkai(p, () => window.__siap === 1 && window.__l4Tata === true, 10000);
    await jeda(300);
  };
  const ke = async (p, hal, tunggu) => { await fe(p, h => { window.HAL = h; window.gambar(); }, hal); if (tunggu) await tungguBingkai(p, tunggu, 6000); await jeda(150); };
  const terlihat = (p, sel) => fe(p, s => { const e = document.querySelector(s); return !!(e && e.offsetParent !== null); }, sel);

  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await pasangRute(ctx);
    const p = await halaman(ctx);
    await masuk(p, 'en');

    /* ================= P9 Gerai offline ================= */
    await ke(p, 'stokgerai', () => !!document.querySelector('.l4t-matriks'));
    const g = await fe(p, () => {
      const kol = Array.from(document.querySelectorAll('.l4t-matriks thead th')).map(x => x.textContent);
      const sel = (sku, gr) => { const td = document.querySelector('[data-l4t-sku="' + sku + '"] [data-l4t-gerai="' + gr + '"]'); return td ? (td.textContent + (td.querySelector('.oranye') ? '*' : '')) : null; };
      const tot = sku => { const tr = document.querySelector('[data-l4t-sku="' + sku + '"]'); return tr ? tr.lastElementChild.textContent : null; };
      return { alis: (document.querySelector('.l4t-alis') || {}).textContent, judul: (document.querySelector('.l4t-hal h1') || {}).textContent, kol: kol.join(','),
        bear305: sel('MF-PLU-005', 'T305'), bearGI: sel('MF-PLU-005', 'KIY-GI'), panda305: sel('MF-PLU-010', 'T305'), tiger390: sel('MF-KC-008', 'T390'), bear390: sel('MF-PLU-005', 'T390'),
        totBear: tot('MF-PLU-005'), totPanda: tot('MF-PLU-010'), urut: Array.from(document.querySelectorAll('[data-l4t-sku]')).map(x => x.getAttribute('data-l4t-sku')).join(',') };
    });
    c('T1 P9: kepala "Inventory · 3 stores · 10 pcs on shelves", judul Offline stores, kolom KIY-GI, T305, T390 lalu Total',
      g.alis === 'Inventory · 3 stores · 10 pcs on shelves' && g.judul === 'Offline stores' && g.kol === 'SKU,KIY-GI,T305,T390,Total', JSON.stringify(g));
    c('T2 P9: isi sel dari buku besar, oranye = di rak tapi belum pernah laku di gerai itu (Bear T305 4*, Panda T305 2 tanpa oranye, Tiger T390 2*), sel kosong untuk SKU yang tidak ada di rak',
      g.bear305 === '4*' && g.bearGI === '2*' && g.panda305 === '2' && g.tiger390 === '2*' && g.bear390 === '', JSON.stringify(g));
    c('T3 P9: total per SKU dan urutan terbanyak dulu (Bear 6, lalu Panda dan Tiger 2)', g.totBear === '6' && g.totPanda === '2' && /^MF-PLU-005,/.test(g.urut), JSON.stringify(g));
    const diam = await fe(p, () => Array.from(document.querySelectorAll('[data-l4t-diam]')).map(x => x.getAttribute('data-l4t-diam') + '=' + x.querySelector('.l4t-aksen').textContent).join('|'));
    c('T4 P9: "On shelf, not selling" cuma yang tiba lebih dari 30 hari dan belum laku: Bear di T305 51 hari, Tiger di T390 39 hari (Bear KIY-GI baru 15 hari tidak masuk)',
      diam === 'MF-PLU-005@T305=51 days|MF-KC-008@T390=39 days', diam);
    const nilai = await fe(p, () => Array.from(document.querySelectorAll('[data-l4t-ret]')).map(x => x.getAttribute('data-l4t-ret') + ':' + x.getAttribute('data-modal') + '/' + x.getAttribute('data-rak')).join('|'));
    c('T5 P9: nilai rak dibanding modal per retailer (termasuk pajak): TGI 1.499.220 / 2.292.876, KIY 388.500 / 597.692', nilai === 'TGI:1499220/2292876|KIY:388500/597692', nilai);
    const lamaTersembunyi = !(await terlihat(p, '#lamaGerai'));
    await fe(p, () => document.querySelector('[data-l4t=lama]').click()); await jeda(100);
    const lamaTerbuka = await terlihat(p, '#lamaGerai'), kartuSembunyi = !(await terlihat(p, '.l4t-matriks'));
    await fe(p, () => document.querySelector('[data-l4t=lama]').click()); await jeda(100);
    const balik = !(await terlihat(p, '#lamaGerai')) && await terlihat(p, '.l4t-matriks');
    c('T6 P9: isi lama disembunyikan; tombol Old view menampilkannya (kartu baru minggir) dan tombol yang sama mengembalikan', lamaTersembunyi && lamaTerbuka && kartuSembunyi && balik, JSON.stringify({ lamaTersembunyi, lamaTerbuka, kartuSembunyi, balik }));
    await fe(p, () => { const s = document.querySelector('[data-l4t-pilih=retailer]'); s.value = 'TGI'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await jeda(150);
    const f1 = await fe(p, () => ({ kol: Array.from(document.querySelectorAll('.l4t-matriks thead th')).map(x => x.textContent).join(','), tot: (document.querySelector('[data-l4t-sku="MF-PLU-005"]') || {}).lastElementChild.textContent, alis: document.querySelector('.l4t-alis').textContent }));
    await fe(p, () => { const s = document.querySelector('[data-l4t-pilih=retailer]'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); }); await jeda(100);
    c('T7 P9: saring Toys Kingdom: kolom tinggal T305 dan T390, total Bear jadi 4, kepala 2 gerai 8 pcs', f1.kol === 'SKU,T305,T390,Total' && f1.tot === '4' && /2 stores · 8 pcs/.test(f1.alis), JSON.stringify(f1));
    await p.evaluate(() => { window.WmsTata._batas.baris = 2; });
    await fe(p, () => { const s = document.querySelector('[data-l4t-pilih=retailer]'); s.dispatchEvent(new Event('change', { bubbles: true })); }); await jeda(120);
    const bt1 = await fe(p, () => ({ n: document.querySelectorAll('[data-l4t-sku]').length, tombol: (document.querySelector('[data-l4t-semua]') || {}).textContent, nama: (document.querySelector('[data-l4t-sku="MF-PLU-005"] td.nm') || {}).textContent }));
    await fe(p, () => document.querySelector('[data-l4t-semua]').click()); await jeda(120);
    const bt2 = await fe(p, () => ({ n: document.querySelectorAll('[data-l4t-sku]').length, tombol: (document.querySelector('[data-l4t-semua]') || {}).textContent }));
    await fe(p, () => document.querySelector('[data-l4t-semua]').click()); await jeda(80);
    const juta = await p.evaluate(() => { window.WmsTata._batas.baris = 12; const f = window.WmsTata._rpPendek; return [f(309004000), f(68610000), f(3758843), f(500000)].join('|'); });
    c('T26 P9: matriks dibatasi (di sini 2 baris) dengan tombol "Show all 3 SKUs" yang membuka dan menutup lagi; nama pendek "S Bear"; angka juta Rp309M, Rp68.6M, Rp3.76M, di bawah sejuta ditulis penuh',
      bt1.n === 2 && bt1.tombol === 'Show all 3 SKUs' && bt1.nama === 'S Bear' && bt2.n === 3 && bt2.tombol === 'Show fewer' && juta === 'Rp309M|Rp68.6M|Rp3.76M|Rp500,000', JSON.stringify({ bt1, bt2, juta }));
    await fe(p, () => { document.getElementById('isi').className = 'petak'; }); await jeda(150);
    const kelasPulih = !(await terlihat(p, '#lamaGerai'));
    await ke(p, 'ringkasan');
    const pindah = await fe(p, () => ({ l4: document.querySelectorAll('#isi > .l4t').length, kelas: document.getElementById('isi').className, ringkas: document.getElementById('ringkasanLama').offsetParent !== null }));
    c('T8 kelas #isi yang ditimpa papan dipulihkan sendiri; pindah ke halaman lain membuang lapisan baru dan halaman lama tampil normal',
      kelasPulih && pindah.l4 === 0 && !/l4t/.test(pindah.kelas) && pindah.ringkas, JSON.stringify({ kelasPulih, pindah }));

    /* ================= P11 Keuangan ================= */
    await ke(p, 'mitra2', () => !!document.querySelector('[data-l4t-invoice]'));
    const k = await fe(p, () => { const v = n => { const e = document.querySelector('[data-l4t-kpi=' + n + ']'); return e ? e.innerText.replace(/\s+/g, ' ') : null; };
      return { bersih: v('bersih'), komisi: v('komisi'), piutang: v('piutang'), lewat: v('lewat'), awas: document.querySelector('[data-l4t-kpi=lewat]').classList.contains('awas'), alis: document.querySelector('.l4t-alis').textContent }; });
    c('T9 P11: KPI dari bulan tutup September: tagihan bersih Rp500,000 (3 pcs), komisi OLS Rp50,000 (10%), piutang Rp500,000 dari 2 tagihan, 1 lewat tempo Rp200,000 Kinokuniya',
      /Rp500,000/.test(k.bersih) && /September 2026, 3 pcs/.test(k.bersih) && /Rp50,000/.test(k.komisi) && /10%/.test(k.komisi) && /Rp500,000/.test(k.piutang) && /2 invoices/.test(k.piutang) && /1 invoices/.test(k.lewat) && /Rp200,000/.test(k.lewat) && /Kinokuniya/.test(k.lewat) && k.awas && k.alis === 'Finance · September 2026', JSON.stringify(k));
    const inv = await fe(p, () => Array.from(document.querySelectorAll('[data-l4t-invoice]')).map(x => x.getAttribute('data-l4t-invoice') + ':' + x.querySelector('.l4t-cip').textContent + ':' + x.children[2].textContent).join('|'));
    c('T10 P11: tabel tagihan mitra dengan status Overdue 11 days / Open / Paid dan sisa yang benar', inv === 'INV-KIY-08:Overdue 11 days:Rp200,000|INV-TGI-09:Open:Rp300,000|INV-TGI-08:Paid:Rp250,000', inv);
    const kom = await fe(p, () => Array.from(document.querySelectorAll('[data-l4t-komisi]')).map(x => x.getAttribute('data-l4t-komisi') + ':' + x.getAttribute('data-nilai') + ':' + x.querySelector('.atas').lastElementChild.textContent).join('|'));
    c('T11 P11: komisi OLS per retailer September: TGI 30.000 (60%), KIY 20.000 (40%)', kom === 'TGI:30000:60%|KIY:20000:40%', kom);
    const md = await fe(p, () => Array.from(document.querySelectorAll('[data-l4t-modal]')).map(x => x.getAttribute('data-l4t-modal') + ':' + x.getAttribute('data-persen') + '%:' + x.getAttribute('data-rata')).join('|'));
    c('T12 P11: modal tertahan FIFO: HO 73% rata 69 hari (bukan 70 seperti LIFO), Toys Kingdom 22% rata 48 hari, Kinokuniya 6% rata 15 hari', md === 'HO:73%:69|TGI:22%:48|KIY:6%:15', md);
    PIUTANG = TAGIHAN_BELUM;
    await ke(p, 'ringkasan');

    /* ================= P14 Kualitas data ================= */
    await ke(p, 'sehat', () => !!document.querySelector('[data-l4t-skor]'));
    const q = await fe(p, () => ({ skor: document.querySelector('[data-l4t-skor]').getAttribute('data-l4t-skor'), teks: document.querySelector('.l4t-skor p').textContent,
      temuan: Array.from(document.querySelectorAll('[data-l4t-temuan]')).map(x => x.getAttribute('data-l4t-temuan') + ':' + x.querySelector('b').textContent).join('|'), lama: document.getElementById('lamaSehat').offsetParent !== null }));
    c('T13 P14: skor 79 (100 - 10 laporan MAA telat - 3 temuan ringan - 8 satu tugas telat), "2 findings to fix. 1 of 2 automatic jobs ran on time.", temuan berat di atas, isi lama tersembunyi',
      q.skor === '79' && q.teks === '2 findings to fix. 1 of 2 automatic jobs ran on time.' && q.temuan === 'berat:Partner report late: MAA|ringan:SKU belum pernah ada barangnya (96)' && !q.lama, JSON.stringify(q));
    const tg = await fe(p, () => ({ tugas: Array.from(document.querySelectorAll('[data-l4t-tugas]')).map(x => x.getAttribute('data-status')).join(','), log: Array.from(document.querySelectorAll('[data-l4t-log] time')).map(x => x.textContent).join(',') }));
    c('T14 P14: tugas otomatis hijau/kuning/mati sesuai status, catatan aktivitas menulis jam untuk hari ini dan tanggal untuk hari lain', tg.tugas === 'hijau,kuning,mati' && tg.log === '02:10,9 Oct', JSON.stringify(tg));
    await fe(p, () => document.querySelector('[data-l4t-hal=dokumen]').click());
    await tungguBingkai(p, () => window.HAL === 'dokumen' && !!document.querySelector('.l4t-langkah'), 4000);
    c('T15 P14: tombol "Open documents" di temuan MAA membuka halaman Dokumen mitra', await fe(p, () => window.HAL === 'dokumen' && !!document.getElementById('dokTeks')), 'HAL tidak pindah');

    /* ================= P10 Dokumen mitra ================= */
    await tungguBingkai(p, () => !!document.querySelector('[data-l4t-lapor]'), 5000);
    const l1 = await fe(p, () => ({ a: document.querySelector('.l4t-langkah').getAttribute('data-l4t-langkah'), judul: (document.querySelector('.l4t-hal h1') || {}).textContent }));
    await fe(p, () => { const t = document.getElementById('dokTeks'); t.value = 'tanggal\tqty'; t.dispatchEvent(new Event('input', { bubbles: true })); }); await jeda(80);
    const l2 = await fe(p, () => document.querySelector('.l4t-langkah').getAttribute('data-l4t-langkah') + '|' + ((document.querySelector('.l4t-langkah .beres') || {}).textContent || 'tanpa centang'));
    await fe(p, () => { document.getElementById('dokHasil').innerHTML = '<table><tr><td>row</td></tr></table>'; }); await jeda(120);
    const l2b = await fe(p, () => document.querySelector('.l4t-langkah').getAttribute('data-l4t-langkah'));
    await fe(p, () => { document.getElementById('dokHasil').insertAdjacentHTML('beforeend', '<input type="password" id="dokPin">'); }); await jeda(120);
    const l3 = await fe(p, () => document.querySelector('.l4t-langkah').getAttribute('data-l4t-langkah'));
    await fe(p, () => document.getElementById('dokBaca').click());
    const baca = await fe(p, () => window.__baca || 0);
    c('T16 P10: kepala Partner documents, langkah menyala sesuai keadaan (1 kosong, 2 sesudah isi ada dengan langkah 1 dicentang, 3 waktu PIN diminta), tombol Read papan tetap jalan',
      l1.a === '1' && l1.judul === 'Partner documents' && /^2\|/.test(l2) && l2b === '2' && l3 === '3' && baca === 1, JSON.stringify({ l1, l2, l2b, l3, baca }));
    const lap = await fe(p, () => ({ r: Array.from(document.querySelectorAll('[data-l4t-lapor]')).map(x => x.getAttribute('data-l4t-lapor') + ':' + x.getAttribute('data-nilai') + ':' + x.querySelector('small').textContent).join('|'),
      mitra: Array.from(document.querySelectorAll('[data-l4t-mitra]')).map(x => x.getAttribute('data-l4t-mitra') + ':' + x.querySelector('.l4t-cip').textContent).join('|'), judul: Array.from(document.querySelectorAll('.l4t-kkepala h2 span')).map(x => x.textContent).join('|') }));
    c('T17 P10: laporan bulanan September per retailer (TGI 300.000 · 2 pcs · 1 store, KIY 200.000 · 1 pcs · 1 store) dan laporan mitra (MAA telat 18 hari di atas)',
      lap.r === 'TGI:300000:2 pcs · 1 store|KIY:200000:1 pcs · 1 store' && lap.mitra === 'MAA:Late · 18 days|TGI:On time' && /Monthly report · September 2026/.test(lap.judul), JSON.stringify(lap));

    /* ================= P12 Baca PO ================= */
    await ke(p, 'bacapo', () => !!document.querySelector('.l4t-hal'));
    const po0 = await fe(p, () => ({ kiri: !!document.querySelector('.l4t-poKiri'), judul: document.querySelector('.l4t-hal h1').textContent, kelas: document.getElementById('isi').classList.contains('l4t-po') }));
    await fe(p, () => { window.PO_ADA = 1; window.gambarBacaPo(); });
    await tungguBingkai(p, () => !!document.querySelector('[data-l4t-kurang]'), 4000);
    const po1 = await fe(p, () => { const k = document.querySelector('.l4t-poKiri'), h = document.querySelector('.poHasil'); const a = k && k.getBoundingClientRect(), b2 = h && h.getBoundingClientRect();
      return { kiriKanan: a && b2 ? (a.right <= b2.left + 1 && Math.abs(a.top - b2.top) < 40) : false, ho: Array.from(document.querySelectorAll('.poTab tr[data-l4t-ho]')).map(x => x.getAttribute('data-l4t-ho') + ':' + x.lastElementChild.textContent).join('|'), kurang: document.querySelector('[data-l4t-kurang]').textContent, berkas: !!(k && k.querySelector('#poFile')) }; });
    c('T18 P12: sebelum dibaca satu kolom; sesudah ada hasil, berkas di kiri dan hasil di kanan sebaris, tiap baris diberi stok HO (Bear 14 untuk 3 cukup, Tiger 6 untuk 7 kurang), tanda "1 short at HO"',
      !po0.kiri && po0.kelas && po0.judul === 'Read PO' && po1.kiriKanan && po1.ho === '14:In stock|6:Short' && po1.kurang === '1 short at HO' && po1.berkas, JSON.stringify({ po0, po1 }));
    await fe(p, () => window.gambarBacaPo());
    await tungguBingkai(p, () => !!document.querySelector('[data-l4t-kurang]'), 4000); await jeda(200);
    const po2 = await fe(p, () => ({ cip: document.querySelectorAll('[data-l4t-kurang]').length, kol: document.querySelector('.poTab tr.tbk').children.length, hal: document.querySelectorAll('#isi > .l4t').length }));
    await fe(p, () => document.getElementById('poSimpan').click());
    const simpan = await fe(p, () => window.__poSimpan || 0);
    c('T19 P12: gambar ulang papan tidak menggandakan kolom HO, tanda, atau kepala halaman; tombol simpan papan tetap jalan', po2.cip === 1 && po2.kol === 5 && po2.hal === 1 && simpan === 1, JSON.stringify({ po2, simpan }));

    /* ================= P13 Gudang ================= */
    await ke(p, 'outbound', () => !!document.querySelector('.l4t-hal'));
    const w = await fe(p, () => ({ n: document.querySelectorAll('#isi > .l4t').length, judul: document.querySelector('.l4t-hal h1').textContent, obd: !!document.getElementById('obdKotak').shadowRoot }));
    c('T20 P13: kepala Warehouse ops sekali, aplikasi gudang di shadow root tetap ada', w.n === 1 && w.judul === 'Warehouse ops' && w.obd, JSON.stringify(w));
    await jeda(400);
    const w2 = await fe(p, () => { const sr = document.getElementById('obdKotak').shadowRoot; return { judul: getComputedStyle(sr.getElementById('obdJudul')).display, waktu: getComputedStyle(sr.getElementById('obdWaktu')).display }; });
    c('T27 P13: judul ganda aplikasi gudang ("Warehouse · Outbound") disembunyikan, baris waktu diperbarui tetap tampil', w2.judul === 'none' && w2.waktu !== 'none', JSON.stringify(w2));

    /* ================= P12 pertama dibuka, data masih di jalan ================= */
    await p.reload();
    await tungguBingkai(p, () => window.__siap === 1 && window.__l4Tata === true, 10000);
    LAMBAT = 700;
    await fe(p, () => { window.PO_ADA = 1; window.HAL = 'bacapo'; window.gambar(); });
    await jeda(60);
    await fe(p, () => { window.gambar(); });
    await tungguBingkai(p, () => !!document.querySelector('[data-l4t-kurang]'), 5000); await jeda(900);
    LAMBAT = 0;
    const po3 = await fe(p, () => ({ cip: document.querySelectorAll('[data-l4t-kurang]').length, kol: Array.from(document.querySelectorAll('.poTab tr.tbk')).map(x => x.children.length).join(',') }));
    c('T25 P12 dibuka pertama kali dengan data lambat dan papan menggambar ulang di tengah jalan: kolom HO dan tanda tetap satu', po3.cip === 1 && po3.kol === '5', JSON.stringify(po3));

    /* ================= P11 tanpa sheet tagihan ================= */
    await ke(p, 'mitra2', () => !!document.querySelector('[data-l4t-tagihan=belum]'));
    const kb = await fe(p, () => ({ pesan: (document.querySelector('[data-l4t-tagihan=belum]') || {}).textContent || '', piutang: document.querySelector('[data-l4t-kpi=piutang]').innerText.replace(/\s+/g, ' '), modal: document.querySelectorAll('[data-l4t-modal]').length }));
    c('T21 P11 tanpa sheet Tagihan Mitra: pesan menyuruh menjalankan menu, KPI piutang tanpa angka palsu, kartu lain tetap terisi', /Siapkan PO mitra/.test(kb.pesan) && /Open receivables -/.test(kb.piutang) && kb.modal === 3, JSON.stringify(kb));
    await ctx.close();

    /* ================= HP dan bahasa Indonesia ================= */
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasangRute(ctx2);
    const hp = await halaman(ctx2);
    await masuk(hp, 'id');
    const lebar = {};
    for (const h of ['stokgerai', 'mitra2', 'sehat', 'dokumen']) {
      await ke(hp, h, () => !!document.querySelector('.l4t-kartu,.l4t-langkah')); await jeda(250);
      lebar[h] = await fe(hp, () => document.documentElement.scrollWidth);
    }
    c('T22 HP 390 px: P9, P11, P14, P10 tanpa geser samping (matriks bergulir di dalam kartunya sendiri)', Object.keys(lebar).every(k => lebar[k] <= 392), JSON.stringify(lebar));
    await ke(hp, 'stokgerai', () => !!document.querySelector('.l4t-matriks'));
    const idn = await fe(hp, () => ({ judul: document.querySelector('.l4t-hal h1').textContent, alis: document.querySelector('.l4t-alis').textContent, lama: document.querySelector('[data-l4t=lama]').textContent, em: /\u2014/.test(document.getElementById('isi').innerText) }));
    c('T23 bahasa Indonesia: "Gerai offline", "Persediaan · 3 gerai · 10 pcs di rak", tombol "Tampilan lama", tanpa tanda pisah panjang',
      idn.judul === 'Gerai offline' && idn.alis === 'Persediaan · 3 gerai · 10 pcs di rak' && idn.lama === 'Tampilan lama' && !idn.em, JSON.stringify(idn));
    await ctx2.close();
  } catch (e) {
    c('MATI di tengah jalan', false, e.stack);
  }
  c('T24 tidak ada galat JavaScript selama uji tata letak', galat.length === 0, galat.join(' | ').slice(0, 500));

  await b.close(); srv.close();
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 500))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
})();
