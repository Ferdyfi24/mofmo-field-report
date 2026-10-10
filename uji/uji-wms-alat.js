/* Uji alat WMS (wms/alat.js + rapihan papan), 10 Okt 2026 malam.
 * Harapan: "14 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Sesudah Mofmo Soft disetujui, Ferdy minta empat
 * rapihan dan dua alat baru ("gass", "gaskeun"):
 *  - angka ubin Gudang Outbound masih hitam pekat, harusnya coklat tinta;
 *  - bola Tiger dobel kalau menu dan submenunya aktif barengan;
 *  - tombol Day/Night menulis mode yang AKTIF, orang ragu mau klik: jadi ikon
 *    matahari/bulan yang menunjuk mode TUJUAN;
 *  - di HP menu papan pindah ke atas (aturan papan lama <= 900 px). Ferdy:
 *    "menu task di kiri bukan di atas", jadi laci dari kiri;
 *  - scan rak: tembak label rak (kode lokasi seperti R1-4A dari Location
 *    Master), langsung kelihatan isinya. Barcode gun di laptop, kamera HP
 *    kalau peramban punya BarcodeDetector. Plus cetak label Code 128;
 *  - Paspor SKU: klik foto SKU di papan, kelihatan perjalanannya dari masuk
 *    gudang, rak, surat jalan, gerai, sampai laku. Dihitung dari baris
 *    buku besar dataPapan (baris = [tanggal, produk, qty, dari, ke]), sama
 *    dengan yang dipakai papan sendiri ("Semua angka dihitung dari sheet
 *    Mutasi"), jadi tidak ada versi angka kedua.
 * Label dicek dengan dekoder barcode sungguhan (zxing-cpp), bukan dengan
 * tabel pola yang sama dengan yang dipakai pembuatnya.
 * Papan lama di sini palsu: meniru header .bungkus, nav#panel dengan anak,
 * aturan HP papan asli (@media max-width 900px), dan isi di shadow root.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const AKAR = '/home/claude/fieldreport';
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const KODE_BENAR = 'KODE-PALSU-UJI';
const DIHARAPKAN = 14;
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(AKAR, p);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});

/* ---------- data, disusun di sini ----------
   S - Reindeer (produk 2): opening 10 ke HO, koreksi hitung +2, 4 dikirim
   (HO -> TRANSIT), 4 sampai T305, 1 laku di T305.
   Jadi HO = 10 + 2 - 4 = 8, T305 = 4 - 1 = 3, total 11.
   Di rak: T2-3A 6 + X-02 1 = 7, berarti 1 pcs belum berlokasi. */
const L = { T305: 0, HO: 1, TERJUAL: 2, OPENING: 3, TRANSIT: 4, ADJUST: 5 };
const DATA = { ok: true, diperbarui: '2026-10-10 18:00',
  lok: [{ k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', r: 'TGI', s: 'INVOICE MITRA', toko: 1 }, { k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }, { k: 'TRANSIT', toko: 0 }, { k: 'ADJUST', toko: 0 }],
  prod: [{ b: '4582586962058', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005' }, { b: '4582586967015', n: 'MOFMOFRIENDS key charm - Bear', s: 'MF-KC-001' }, { b: '4582586963000', n: 'MofmoFriends S - Reindeer', s: 'MF-PLU-040' }],
  baris: [
    ['2026-08-05', 2, 10, L.OPENING, L.HO],
    ['2026-08-05', 1, 74, L.OPENING, L.HO],
    ['2026-09-04', 2, 4, L.HO, L.TRANSIT],
    ['2026-09-05', 2, 4, L.TRANSIT, L.T305],
    ['2026-09-07', 2, 2, L.ADJUST, L.HO],
    ['2026-09-20', 2, 1, L.T305, L.TERJUAL]
  ] };
const GUDANG = { ok: true, lokasi: [
  { kode: 'R1-4A', sku: 'KC Bear', barcode: '4582586967015', isi: 74, kap: 120, zona: 'RACK', unit: 'R1', level: 4, pos: 'A', peran: 'PICK', persen: 74 / 120, rendah: false },
  { kode: 'T2-3A', sku: 'S Reindeer', barcode: '4582586963000', isi: 6, kap: 16, zona: 'TABLE', unit: 'T2', level: 3, pos: 'A', peran: 'PICK', persen: 6 / 16, rendah: true },
  { kode: 'X-02', sku: 'S Reindeer', barcode: '4582586963000', isi: 1, kap: 40, zona: 'OVERFLOW', unit: 'X', level: 0, pos: '', peran: 'OVERFLOW', persen: 1 / 40, rendah: false }
] };

/* ---------- papan lama palsu ---------- */
const HAL = '<div class="pita"><button class="tp" id="tpUji"><span>PICKING</span><b id="tpAngka">0</b><small>waiting</small></button></div>' +
  '<table><tr><td id="tdRein" onclick="window.__tdKlik=1">MofmoFriends S - Reindeer</td><td>6</td></tr><tr><td id="tdPendek">KC Bear</td><td>74</td></tr></table>' +
  '<div class="c" id="selBear" data-kode="R1-4A" data-sku="KC Bear" data-bc="4582586967015" onclick="window.__selKlik=1"><b>R1-4A</b><span class="s">KC Bear</span></div>';
const PAPAN_PALSU = '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title>' +
  '<style>body{margin:0;background:#FBF8F0;font-family:Arial,sans-serif}#layarIsi{display:none}' +
  '.rangka{display:flex;align-items:flex-start}.panel{flex:0 0 236px;position:sticky;top:0;min-height:100vh;border-right:1px solid #E5DAC4;background:#fff;padding:16px 12px}' +
  '.panel a{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:10px;font-size:16.5px;color:#3A2A14;text-decoration:none;cursor:pointer}' +
  '.panel .anak{margin:2px 0 6px 24px;padding-left:12px}.utama{flex:1;min-width:0}' +
  /* tautan menu papan asli tanpa href (dibuat skrip, cursor:pointer); href="#" di srcdoc malah membawa bingkai ke alamat induk */
  /* aturan HP papan asli: menu jadi pita di atas */
  '@media(max-width:900px){.rangka{display:block}.panel{position:static;min-height:0;border-right:0;border-bottom:1px solid #E5DAC4;display:flex;gap:6px;overflow-x:auto;padding:10px 16px}' +
  '.panel h3{display:none}.panel a{flex:none;margin-bottom:0;padding:9px 13px;white-space:nowrap}.panel .anak{display:flex;gap:6px;margin:0;padding-left:6px}}</style></head><body>' +
  '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
  '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div style="flex:1;min-width:0"><h1>Papan Data</h1><p id="subJudul">Gudang</p></div><div id="kopKanan"></div></div></header>' +
  '<div class="rangka"><nav class="panel" id="panel"><h3>Dashboard</h3>' +
  '<a class="on" id="navGudang"><span class="iknKotak"><svg class="ikn" viewBox="0 0 24 24"><path d="M3 3h18"/></svg></span><span class="pnlNama">Warehouse</span></a>' +
  '<div class="anak"><a class="on" id="navOffline">Offline</a><a id="navShopee" onclick="window.__shopee=1">Shopee</a></div>' +
  '<a id="navRingkas"><span class="pnlNama">Summary</span></a></nav>' +
  '<div class="utama"><div class="isiRail" id="rail"><div id="isi"></div></div></div></div></div>' +
  '<script>var KODE="";' +
  'function buka(){KODE=document.getElementById("kode").value;google.script.run.withSuccessHandler(function(r){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";muat();window.__siap=1;}).dataPapan(KODE);}' +
  'function muat(){var w=document.createElement("div");w.id="halKotak";document.getElementById("isi").appendChild(w);w.attachShadow({mode:"open"}).innerHTML=' + JSON.stringify(HAL) + ';window.__hal=1;}' +
  '<\/script></body></html>';

const AUDIO_PALSU = () => {
  window.__nada = [];
  function Osc() { var self = this; this.frequency = { setValueAtTime: function (f) { self.f = f; }, exponentialRampToValueAtTime: function () {} }; }
  Osc.prototype.connect = function () {}; Osc.prototype.start = function () { window.__nada.push(this.f); }; Osc.prototype.stop = function () {};
  function Ctx() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  Ctx.prototype.createOscillator = function () { return new Osc(); };
  Ctx.prototype.createGain = function () { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  Ctx.prototype.resume = function () {};
  window.AudioContext = Ctx; window.webkitAudioContext = Ctx;
};
/* Kamera palsu: BarcodeDetector yang "melihat" T2-3A pada panggilan kedua,
   getUserMedia yang memberi aliran dari kanvas. Mencatat stop() trek. */
const KAMERA_PALSU = () => {
  window.__stop = 0; window.__deteksi = 0;
  window.BarcodeDetector = class { constructor(o) { window.__format = o && o.formats; } static getSupportedFormats() { return Promise.resolve(['code_128', 'ean_13', 'qr_code']); }
    detect() { window.__deteksi++; return Promise.resolve(window.__deteksi >= 2 ? [{ rawValue: 'T2-3A', format: 'code_128' }] : []); } };
  const md = { getUserMedia: function () { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const s = c.captureStream(5); s.getTracks().forEach(t => { const st = t.stop.bind(t); t.stop = function () { window.__stop++; st(); }; }); return Promise.resolve(s); } };
  try { Object.defineProperty(navigator, 'mediaDevices', { value: md, configurable: true }); } catch (e) {}
  window.print = function () { window.__cetak = document.body.classList.contains('cetak-label') ? 'kelas' : 'tanpa'; };
};

(async () => {
  await new Promise(r => srv.listen(8767, r));
  const URL0 = 'http://localhost:8767/wms/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const pasangRute = async ctx => {
    await ctx.addInitScript(AUDIO_PALSU);
    await ctx.addInitScript(KAMERA_PALSU);
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      const h = m.fn === 'panggil' && m.nama === 'dataPapan' ? { pintu: 'ok', hasil: DATA } : { pintu: 'galat', pesan: 'Fungsi "' + (m.nama || m.fn) + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = String(m.kode || '').trim().toUpperCase() === KODE_BENAR ? { ok: true, tiket: 'TIKET.SUPA', ingat: false } : { ok: false, pesan: 'That access code is not right.' };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA, 'wmsGudang|["K"]': GUDANG, 'klien|papan': { ok: true, versi: 'alat', html: PAPAN_PALSU }, 'klien|versi': { ok: true, versi: 'alat' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false, pesan: 'Unknown request.' };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
  const galat = [];
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const halaman = async (ctx) => {
    const p = await ctx.newPage();
    p.on('pageerror', e => galat.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) galat.push(m.text()); });
    return p;
  };
  const bingkai = p => p.frames().find(f => f !== p.mainFrame());
  const diBingkai = async (p, fn, arg) => { const f = bingkai(p); return f ? f.evaluate(fn, arg) : null; };
  const tungguBingkai = async (p, fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 8000)) { try { const f = bingkai(p); if (f && await f.evaluate(fn)) return true; } catch (e) {} await jeda(100); } return false; };
  const tunggu = (p, fn, ms) => p.waitForFunction(fn, null, { timeout: ms || 6000 }).catch(() => {});
  const masuk = async p => {
    await p.goto(URL0);
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'en'); });
    await p.reload();
    await tunggu(p, () => document.getElementById('formMasuk'));
    await p.fill('#kode', 'kode-palsu-uji'); await p.click('#tMasuk');
    await tungguBingkai(p, () => window.__siap === 1 && window.__hal === 1 && !!document.querySelector('#kopKanan [data-wms]'), 10000);
    await jeda(700);
  };
  const teksAlat = p => p.evaluate(() => { const a = document.getElementById('alatHasil'); return a ? a.innerText.replace(/\s+/g, ' ') : ''; });
  const tembak = async (p, kode) => { await p.fill('#alatKode', kode); await p.press('#alatKode', 'Enter'); await jeda(250); };

  try {
    /* ================= laptop ================= */
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
    await pasangRute(ctx);
    const p = await halaman(ctx);
    await masuk(p);

    const ob = await diBingkai(p, () => getComputedStyle(document.getElementById('halKotak').shadowRoot.getElementById('tpAngka')).color);
    c('W46 angka ubin Gudang Outbound coklat tinta #4A3426, bukan hitam bawaan tombol', ob === 'rgb(74, 52, 38)', ob);

    const tiger = await diBingkai(p, () => ({ induk: getComputedStyle(document.getElementById('navGudang'), '::after'), anak: getComputedStyle(document.getElementById('navOffline'), '::after') }))
      .then(x => x && ({ induk: x.induk.display + '|' + x.induk.backgroundImage.slice(0, 40), anak: x.anak.display + '|' + x.anak.backgroundImage.slice(0, 60) }));
    const tiger2 = await diBingkai(p, () => { const i = getComputedStyle(document.getElementById('navGudang'), '::after'), a = getComputedStyle(document.getElementById('navOffline'), '::after'); return { induk: i.display === 'none' || i.content === 'none', anak: a.display !== 'none' && /mb_tiger/.test(a.backgroundImage) }; });
    c('W47 bola Tiger cuma di submenu aktif (Offline), tidak dobel di menu induknya (Warehouse)', tiger2 && tiger2.induk && tiger2.anak, JSON.stringify(tiger));

    const tema = await diBingkai(p, () => { const t = document.querySelector('#kopKanan [data-wms=tema]'); return t ? { svg: !!t.querySelector('svg'), teks: t.textContent.trim(), label: t.getAttribute('aria-label') } : null; });
    c('W48 tombol tema berupa ikon yang menunjuk mode tujuan: siang -> ikon bulan, label "Switch to night", tanpa tulisan Day', tema && tema.svg && tema.teks === '' && /night/i.test(tema.label), JSON.stringify(tema));

    /* ---- scan rak ---- */
    await bingkai(p).click('#kopKanan [data-wms=scan]');
    await tunggu(p, () => document.getElementById('alatKode') && document.activeElement === document.getElementById('alatKode'));
    await p.evaluate(() => window.__nada.splice(0));
    await tembak(p, 'r1-4a');
    const s1 = await teksAlat(p);
    const s1f = await p.evaluate(() => { const i = document.querySelector('#alatHasil img.foto-sku'); return { src: i ? i.getAttribute('src') : '', suara: window.__wms && window.__wms.Suara ? window.__wmsSuaraTerakhir : '' }; });
    c('W50 scan label rak R1-4A (huruf kecil juga): isi slot tampil (key charm Bear, 74 dari 120, foto SKU), bunyi scan ok',
      /R1-4A/.test(s1) && /key charm - Bear/i.test(s1) && /\b74\b/.test(s1) && /\b120\b/.test(s1) && /img\/sku\/kc_bear\.webp$/.test(s1f.src) && s1f.suara === 'scanOk', JSON.stringify([s1.slice(0, 200), s1f]));

    await tembak(p, '4582586963000');
    const s2 = await teksAlat(p);
    await tembak(p, 'rein');
    const s3 = await teksAlat(p);
    const s3t = await p.evaluate(() => document.querySelectorAll('#alatHasil [data-paspor-buka]').length);
    await tembak(p, 'ZZ-99');
    const s4 = await teksAlat(p);
    const s4s = await p.evaluate(() => window.__wmsSuaraTerakhir);
    c('W51 scan barcode SKU menyebut semua lokasinya (T2-3A, X-02); ketik nama "rein" memberi daftar SKU yang bisa dibuka paspornya; kode asing ditolak dengan bunyi tolak',
      /T2-3A/.test(s2) && /X-02/.test(s2) && /Reindeer/.test(s2) && /Reindeer/.test(s3) && s3t >= 1 && /not found/i.test(s4) && s4s === 'scanTolak', JSON.stringify([s2.slice(0, 160), s3.slice(0, 120), s3t, s4.slice(0, 120), s4s]));

    const adaKamera = await p.evaluate(() => !!document.getElementById('alatKamera'));
    if (adaKamera) await p.click('#alatKamera');
    await tunggu(p, () => /T2-3A/.test((document.getElementById('alatHasil') || {}).innerText || '') && !document.querySelector('#alat video'), 5000);
    const kam = await p.evaluate(() => ({ hasil: (document.getElementById('alatHasil') || {}).innerText || '', stop: window.__stop, video: !!document.querySelector('#alat video'), format: window.__format }));
    c('W52 kamera HP: BarcodeDetector melihat label T2-3A, slotnya tampil, kamera dimatikan (trek berhenti, video hilang)',
      adaKamera && /T2-3A/.test(kam.hasil) && /Reindeer/.test(kam.hasil) && kam.stop >= 1 && !kam.video && Array.isArray(kam.format) && kam.format.indexOf('code_128') > -1, JSON.stringify(kam).slice(0, 300));

    /* ---- cetak label ---- */
    await p.click('#alat [data-tab=label]');
    await tunggu(p, () => document.getElementById('alatUnit'));
    await p.selectOption('#alatUnit', 'R1');
    await jeda(200);
    const label = await p.$('#alat .label-rak[data-kode="R1-4A"] svg.kode128');
    let terbaca = '';
    if (label) {
      const png = path.join(os.tmpdir(), 'label-r1-4a.png');
      await label.screenshot({ path: png });
      try { terbaca = execFileSync('python3', ['-c', 'import sys,zxingcpp\nfrom PIL import Image\nr=zxingcpp.read_barcodes(Image.open(sys.argv[1]))\nprint(r[0].text if r else "")', png]).toString().trim(); } catch (e) { terbaca = 'galat ' + e.message.slice(0, 80); }
    }
    const lainUnit = await p.evaluate(() => document.querySelectorAll('#alat .label-rak[data-kode^="T2"]').length);
    await p.click('#alatCetak');
    await jeda(150);
    const cetak = await p.evaluate(() => ({ c: window.__cetak, sisa: document.body.classList.contains('cetak-label') }));
    c('W53 cetak label: label R1-4A berbarcode Code 128 yang terbaca dekoder sungguhan sebagai "R1-4A", cuma unit yang dipilih, tombol cetak memakai lembar cetak khusus',
      terbaca === 'R1-4A' && lainUnit === 0 && cetak.c === 'kelas' && !cetak.sisa, JSON.stringify({ terbaca, lainUnit, cetak }));
    await p.keyboard.press('Escape');
    await tunggu(p, () => !document.querySelector('#alat.buka'));

    /* ---- paspor ---- */
    await bingkai(p).click('#tdRein img.l4-sku');
    await tunggu(p, () => document.querySelector('#alat.buka [data-paspor=masuk]'));
    const pas = await p.evaluate(() => { const v = n => { const e = document.querySelector('#alat [data-paspor=' + n + ']'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      return { judul: v('judul'), masuk: v('masuk'), koreksi: v('koreksi'), dikirim: v('dikirim'), gerai: v('gerai'), laku: v('laku'), gudang: v('gudang'), belum: v('belumLokasi'),
        lokasi: Array.prototype.map.call(document.querySelectorAll('#alat [data-paspor-lokasi]'), e => e.getAttribute('data-paspor-lokasi') + '=' + e.getAttribute('data-isi')).join(','),
        toko: Array.prototype.map.call(document.querySelectorAll('#alat [data-paspor-toko]'), e => e.getAttribute('data-paspor-toko') + '=' + e.getAttribute('data-stok')).join(',') }; });
    const tdKlik = await diBingkai(p, () => window.__tdKlik || 0);
    c('W54 klik foto SKU di tabel papan membuka Paspor S - Reindeer: masuk 10, koreksi +2, dikirim 4, di gerai 3 (T305), laku 1, di gudang 8 (T2-3A 6, X-02 1, belum berlokasi 1); klik sel aslinya tidak ikut jalan',
      pas.judul === 'MofmoFriends S - Reindeer' && pas.masuk === '10' && pas.koreksi === '+2' && pas.dikirim === '4' && pas.gerai === '3' && pas.laku === '1' && pas.gudang === '8' && pas.belum === '1' &&
      pas.lokasi === 'T2-3A=6,X-02=1' && pas.toko === 'T305=3' && tdKlik === 0, JSON.stringify([pas, tdKlik]));

    const riw = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('#alat [data-riwayat]'), e => e.getAttribute('data-riwayat') + '|' + e.innerText.replace(/\s+/g, ' ').trim()));
    c('W55 riwayat paspor terbaru di atas, tiap baris berlabel jelas: laku di T305 paling atas, opening masuk gudang paling bawah, koreksi +2 tercatat',
      riw.length === 5 && /^2026-09-20\|.*Sold.*T305/i.test(riw[0]) && /^2026-08-05\|.*(Opening|Received)/i.test(riw[4]) && riw.some(x => /^2026-09-07\|.*\+2/.test(x)), JSON.stringify(riw));

    await p.keyboard.press('Escape');
    await tunggu(p, () => !document.querySelector('#alat.buka'));
    await bingkai(p).click('#selBear img.l4-sku');
    await tunggu(p, () => document.querySelector('#alat.buka [data-paspor=judul]'));
    const pas2 = await p.evaluate(() => ({ judul: (document.querySelector('#alat [data-paspor=judul]') || {}).textContent, gudang: (document.querySelector('#alat [data-paspor=gudang]') || {}).textContent,
      lokasi: Array.prototype.map.call(document.querySelectorAll('#alat [data-paspor-lokasi]'), e => e.getAttribute('data-paspor-lokasi') + '=' + e.getAttribute('data-isi')).join(',') }));
    const selKlik = await diBingkai(p, () => window.__selKlik || 0);
    await p.keyboard.press('Escape');
    await tunggu(p, () => !document.querySelector('#alat.buka'));
    /* nama pendek gudang tanpa data-bc (tabel "Where each SKU sits" dsb.): dicocokkan lewat peta nama pendek -> barcode */
    await bingkai(p).click('#tdPendek img.l4-sku');
    await tunggu(p, () => document.querySelector('#alat.buka [data-paspor=judul]'));
    const pas3 = await p.evaluate(() => ((document.querySelector('#alat [data-paspor=judul]') || {}).textContent || '') + '|' + ((document.querySelector('#alat [data-paspor=gudang]') || {}).textContent || ''));
    await p.keyboard.press('Escape');

    c('W56 klik foto di sel peta gudang membuka paspor lewat barcodenya (key charm Bear, 74 di R1-4A); nama pendek "KC Bear" tanpa barcode di tabel juga ketemu lewat peta gudang',
      pas2.judul === 'MOFMOFRIENDS key charm - Bear' && pas2.gudang === '74' && pas2.lokasi === 'R1-4A=74' && selKlik === 0 && pas3 === 'MOFMOFRIENDS key charm - Bear|74', JSON.stringify([pas2, selKlik, pas3]));

    /* ---- malam ---- */
    await bingkai(p).click('#kopKanan [data-wms=tema]');
    await tungguBingkai(p, () => window.__siap === 1 && window.__hal === 1 && !!document.querySelector('#kopKanan [data-wms=scan]'), 10000);
    await jeda(500);
    const temaMalam = await diBingkai(p, () => { const t = document.querySelector('#kopKanan [data-wms=tema]'); return { label: t.getAttribute('aria-label'), svg: !!t.querySelector('svg') }; });
    await bingkai(p).click('#kopKanan [data-wms=scan]');
    await tunggu(p, () => document.querySelector('#alat.buka .lembar'));
    const malam = await p.evaluate(() => ({ bg: getComputedStyle(document.querySelector('#alat .lembar')).backgroundColor, teks: getComputedStyle(document.querySelector('#alat .lembar')).color }));
    c('W57 malam: tombol tema jadi ikon matahari berlabel "Switch to day", lembar alat coklat gelap #352A22 dengan teks terang',
      /day/i.test(temaMalam.label) && temaMalam.svg && malam.bg === 'rgb(53, 42, 34)' && malam.teks === 'rgb(248, 236, 223)', JSON.stringify([temaMalam, malam]));
    await ctx.close();

    /* ================= HP ================= */
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasangRute(ctx2);
    const h = await halaman(ctx2);
    await masuk(h);
    const laci0 = await diBingkai(h, () => { const n = document.getElementById('panel').getBoundingClientRect(), bg = document.querySelector('.l4-burger'); const r = bg ? bg.getBoundingClientRect() : null; return { navKanan: Math.round(n.right), burger: r ? Math.round(r.width) : 0, lebar: document.documentElement.scrollWidth, kepala: Math.round(document.querySelector('header').getBoundingClientRect().height) }; });
    await bingkai(h).click('.l4-burger', { timeout: 3000 }).catch(() => {});
    await jeda(450);
    const laci1 = await diBingkai(h, () => { const n = document.getElementById('panel').getBoundingClientRect(); return { kiri: Math.round(n.left), lebar: Math.round(n.width), tinggi: Math.round(n.height), kelas: document.body.classList.contains('l4-laci'), arah: getComputedStyle(document.querySelector('#panel a')).display }; });
    await bingkai(h).click('#navShopee', { timeout: 3000 }).catch(() => {});
    await jeda(450);
    const laci2 = await diBingkai(h, () => ({ kelas: document.body.classList.contains('l4-laci'), shopee: window.__shopee || 0, kanan: Math.round(document.getElementById('panel').getBoundingClientRect().right), lebar: document.documentElement.scrollWidth }));
    c('W49 HP: menu papan jadi laci dari kiri (tersembunyi dulu, tombol menu di kepala yang tetap di bawah 140 px), dibuka menempel di kiri setinggi layar, klik menu jalan lalu laci menutup, tanpa geser samping',
      laci0.navKanan <= 0 && laci0.burger >= 36 && laci0.lebar <= 392 && laci0.kepala < 140 && laci1.kiri === 0 && laci1.lebar >= 240 && laci1.tinggi >= 800 && laci1.kelas && !laci2.kelas && laci2.shopee === 1 && laci2.kanan <= 0 && laci2.lebar <= 392,
      JSON.stringify([laci0, laci1, laci2]));
    await bingkai(h).click('#kopKanan [data-wms=scan]');
    await tunggu(h, () => document.querySelector('#alat.buka .lembar'));
    await jeda(300);
    const hpAlat = await h.evaluate(() => ({ lebar: Math.round(document.querySelector('#alat .lembar').getBoundingClientRect().width), gulir: document.documentElement.scrollWidth, kode: Math.round(document.getElementById('alatKode').getBoundingClientRect().height) }));
    c('W58 HP: lembar scan memenuhi layar (lebar >= 370), kolom kode cukup besar untuk jari (>= 44 px), tanpa geser samping', hpAlat.lebar >= 370 && hpAlat.kode >= 44 && hpAlat.gulir <= 392, JSON.stringify(hpAlat));
    await ctx2.close();
  } catch (e) {
    c('MATI di tengah jalan', false, e.stack);
  }
  c('W59 tidak ada galat JavaScript selama uji alat', galat.length === 0, galat.join(' | ').slice(0, 400));

  await b.close(); srv.close();
  let gagal = 0;
  cek.forEach(x => { if (!x[1]) gagal++; console.log((x[1] ? 'LULUS ' : 'GAGAL ') + x[0] + (x[1] ? '' : '\n      -> ' + String(x[2]).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
})();
