/* Uji Katalog WMS (wms/katalog.js), 11 Okt 2026.
 * Harapan: "18 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy: "buat juga fitur catalog yang menampilkan semua
 * SKU yang ada dan harga jual putus, ... kayaknya 10%, di WMS sudah include
 * pajak". Harga ini akan dikutip ke pembeli putus, jadi salah satu rupiah pun
 * berarti salah tagih. Tiga cacat yang paling mungkin dan paling diam:
 *  - margin ditambahkan di atas modal (175.000 x 1,1) padahal aturan beli putus
 *    yang sudah dipakai sistem ini (Gamotion) mengambil margin DARI harga jual
 *    (175.000 / 0,9). Selisihnya kecil, tidak berbunyi, tapi beda di tiap baris;
 *  - pajak dikalikan 1,11 rata untuk semua SKU, padahal pajak tiap SKU ada di
 *    datanya sendiri. Fixture memuat satu SKU berpajak 5% supaya pengali rata
 *    langsung ketahuan;
 *  - SKU tanpa stok hilang dari daftar, padahal Ferdy minta SEMUA SKU.
 * Data disusun di sini, papan lama palsu, tanpa jaringan.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const AKAR = '/home/claude/fieldreport';
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const KODE_BENAR = 'KODE-PALSU-UJI';
const DIHARAPKAN = 18;
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(AKAR, p);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});

/* ---------- data, disusun di sini ----------
   Bear       modal 175.000, pajak 11% (194.250), stok HO 10.
   KC Bear    modal 150.324, pajak 11% (166.860), stok HO 74.
   Reindeer   modal 175.000, 10 masuk HO, 4 ke TRANSIT, 4 sampai T305, 1 laku:
              HO 6, T305 3, total 9.
   Pekingese  modal 200.000, pajak 5% (210.000), 5 stok awal langsung di T305:
              HO 0, total 5.
   Elephant   modal 175.000, tanpa pergerakan sama sekali (stok 0 di mana pun).
   Cap Melon  belum punya harga (hs 0), tanpa stok. */
const L = { T305: 0, HO: 1, TERJUAL: 2, OPENING: 3, TRANSIT: 4 };
const DATA = { ok: true, diperbarui: '2026-10-11 03:00', tarif: 0.1,
  lok: [{ k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', r: 'TGI', s: 'INVOICE MITRA', toko: 1 }, { k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }, { k: 'TRANSIT', toko: 0 }],
  prod: [
    { b: '4582586962058', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 },
    { b: '4582586967015', n: 'MOFMOFRIENDS key charm - Bear', s: 'MF-KC-001', hs: 150324, h: 166860, r: 249900 },
    { b: '4582586963000', n: 'MofmoFriends S - Reindeer', s: 'MF-PLU-040', hs: 175000, h: 194250, r: 298846 },
    { b: '4582586964110', n: 'MofmoFriends M - Pekingese', s: 'MF-PLU-061', hs: 200000, h: 210000, r: 330000 },
    { b: '4582586969999', n: 'MofmoFriends S - Elephant', s: 'MF-PLU-099', hs: 175000, h: 194250, r: 298846 },
    { b: '4582586968888', n: 'MofmoFriends Cap - Melon', s: 'MF-CAP-002', hs: 0, h: 0, r: 0 }
  ],
  baris: [
    ['2026-08-05', 0, 10, L.OPENING, L.HO],
    ['2026-08-05', 1, 74, L.OPENING, L.HO],
    ['2026-08-05', 2, 10, L.OPENING, L.HO],
    ['2026-08-05', 3, 5, L.OPENING, L.T305],
    ['2026-09-04', 2, 4, L.HO, L.TRANSIT],
    ['2026-09-05', 2, 4, L.TRANSIT, L.T305],
    ['2026-09-20', 2, 1, L.T305, L.TERJUAL]
  ] };

/* ---------- papan lama palsu (kop kanan tempat tombol alat dipasang) ---------- */
const PAPAN_PALSU = '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title>' +
  '<style>body{margin:0;background:#FBF8F0;font-family:Arial,sans-serif}#layarIsi{display:none}.rangka{display:flex}.panel{flex:0 0 236px}.utama{flex:1;min-width:0}' +
  '@media(max-width:900px){.rangka{display:block}.panel{display:flex;overflow-x:auto}}</style></head><body>' +
  '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
  '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div style="flex:1;min-width:0"><h1>Papan Data</h1><p id="subJudul">Gudang</p></div><div id="kopKanan"></div></div></header>' +
  '<div class="rangka"><nav class="panel" id="panel"><h3>Dashboard</h3><a class="on" id="navRingkas"><span class="pnlNama">Summary</span></a></nav>' +
  '<div class="utama"><div id="isi"><div class="halKepala"><h1>Summary</h1></div></div></div></div></div>' +
  '<script>var KODE="";function buka(){KODE=document.getElementById("kode").value;google.script.run.withSuccessHandler(function(r){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";window.__siap=1;}).dataPapan(KODE);}<\/script></body></html>';

const PALSU_AWAL = () => {
  function Ctx() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  Ctx.prototype.createOscillator = function () { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; };
  Ctx.prototype.createGain = function () { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  Ctx.prototype.resume = function () {};
  window.AudioContext = Ctx; window.webkitAudioContext = Ctx;
  window.print = function () { window.__cetak = { kelas: document.body.classList.contains('cetak-katalog'), baris: document.querySelectorAll('#lembarKatalog [data-cetak-sku]').length, teks: (document.getElementById('lembarKatalog') || {}).innerText || '' }; };
};

(async () => {
  await new Promise(r => srv.listen(8771, r));
  const URL0 = 'http://localhost:8771/wms/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const pasangRute = async ctx => {
    await ctx.addInitScript(PALSU_AWAL);
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      const h = m.fn === 'panggil' && m.nama === 'dataPapan' ? { pintu: 'ok', hasil: DATA } : { pintu: 'galat', pesan: 'Fungsi "' + (m.nama || m.fn) + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = String(m.kode || '').trim().toUpperCase() === KODE_BENAR ? { ok: true, tiket: 'TIKET.SUPA', ingat: true } : { ok: false, pesan: 'That access code is not right.' };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA, 'klien|papan': { ok: true, versi: 'katalog', html: PAPAN_PALSU }, 'klien|versi': { ok: true, versi: 'katalog' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false, pesan: 'Unknown request.' };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
  const galat = [];
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const halaman = async ctx => {
    const p = await ctx.newPage();
    p.on('pageerror', e => galat.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) galat.push(m.text()); });
    return p;
  };
  const bingkai = p => p.frames().find(f => f !== p.mainFrame());
  const tungguBingkai = async (p, fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 8000)) { try { const f = bingkai(p); if (f && await f.evaluate(fn)) return true; } catch (e) {} await jeda(100); } return false; };
  const tunggu = (p, fn, ms) => p.waitForFunction(fn, null, { timeout: ms || 6000 }).catch(() => {});
  const siapPapan = p => tungguBingkai(p, () => window.__siap === 1 && !!document.querySelector('#kopKanan [data-wms=katalog]'), 10000);
  const masuk = async (p, bhs) => {
    await p.goto(URL0);
    await p.evaluate(b => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', b); }, bhs || 'en');
    await p.reload();
    await tunggu(p, () => document.getElementById('formMasuk'));
    await p.fill('#kode', 'kode-palsu-uji'); await p.click('#tMasuk');
    await siapPapan(p);
    await jeda(500);
  };
  const bukaKatalog = async p => {
    await bingkai(p).click('#kopKanan [data-wms=katalog]');
    await tunggu(p, () => { const d = document.getElementById('katalog'); return d && d.classList.contains('buka') && d.querySelectorAll('[data-sku]').length > 0; });
  };
  const baris = p => p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('#katalog [data-sku]'), e => ({
    s: e.getAttribute('data-sku'), harga: e.getAttribute('data-harga'), ho: e.getAttribute('data-ho'), total: e.getAttribute('data-total'),
    kosong: e.classList.contains('kt-redup'), tampil: e.offsetParent !== null, teks: e.innerText.replace(/\s+/g, ' ') })));
  const tampil = async p => (await baris(p)).filter(x => x.tampil).map(x => x.s).sort().join(',');

  try {
    /* ================= laptop, Inggris ================= */
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    await pasangRute(ctx);
    const p = await halaman(ctx);
    await masuk(p, 'en');

    const h = await p.evaluate(() => {
      const K = window.WmsKatalog; if (!K || !K.harga) return null;
      return { a: K.harga(175000, 194250, 0.2), b: K.harga(150324, 166860, 0.2), c: K.harga(175000, 194250, 0.1), d: K.harga(200000, 210000, 0.1), e: K.harga(0, 0, 0.1) };
    });
    c('K1 aturan beli putus, margin 20% dari harga jual: modal 175.000 jadi 218.750, termasuk pajak 242.813 (cocok dengan harga Gamotion)',
      h && h.a && h.a.sebelum === 218750 && h.a.termasuk === 242813, JSON.stringify(h && h.a));
    c('K2 key charm 150.324 margin 20%: 187.905, termasuk pajak 208.575', h && h.b && h.b.sebelum === 187905 && h.b.termasuk === 208575, JSON.stringify(h && h.b));
    c('K3 margin bawaan 10%: modal 175.000 jadi 194.444, termasuk PPN 11% jadi 215.833 (bukan 175.000 x 1,1)', h && h.c && h.c.sebelum === 194444 && h.c.termasuk === 215833, JSON.stringify(h && h.c));
    c('K4 pajak dibaca per SKU: Pekingese berpajak 5% jadi 222.222 lalu 233.333, bukan dikali 1,11; SKU tanpa harga mengembalikan null, bukan Rp0',
      h && h.d && h.d.sebelum === 222222 && h.d.termasuk === 233333 && h.e === null, JSON.stringify([h && h.d, h && h.e]));

    const tb = await bingkai(p).evaluate(() => { const t = document.querySelector('#kopKanan [data-wms=katalog]'); return t ? { svg: !!t.querySelector('svg'), teks: t.textContent.trim(), label: t.getAttribute('aria-label') } : null; });
    await bukaKatalog(p);
    const r1 = await baris(p);
    c('K5 tombol Catalog di kop papan (ikon + tulisan) membuka lembar katalog', tb && tb.svg && tb.teks === 'Catalog' && /catalog/i.test(tb.label) && r1.length > 0, JSON.stringify(tb));
    c('K6 SEMUA SKU tampil, termasuk yang stoknya nol (Elephant) dan yang belum berharga (Cap Melon), keduanya diredupkan',
      r1.length === 6 && r1.find(x => x.s === 'MF-PLU-099' && x.kosong) && r1.find(x => x.s === 'MF-CAP-002' && x.kosong) && !r1.find(x => x.s === 'MF-PLU-005').kosong, JSON.stringify(r1.map(x => x.s + (x.kosong ? '(redup)' : ''))));
    const bear = r1.find(x => x.s === 'MF-PLU-005') || {};
    const cap = r1.find(x => x.s === 'MF-CAP-002') || {};
    c('K7 harga jual putus termasuk pajak di baris Bear: 215,833 (margin 10%); Cap Melon menulis "No price yet", bukan Rp0 atau NaN',
      bear.harga === '215833' && /Rp215,833/.test(bear.teks) && cap.harga === '' && /No price yet/i.test(cap.teks) && !/NaN|Rp0\b/.test(cap.teks), JSON.stringify([bear.teks, cap.teks]));
    const rein = r1.find(x => x.s === 'MF-PLU-040') || {}, pek = r1.find(x => x.s === 'MF-PLU-061') || {};
    c('K8 stok dari buku besar: Reindeer HO 6 dari total 9, Pekingese HO 0 dari total 5', rein.ho === '6' && rein.total === '9' && pek.ho === '0' && pek.total === '5', JSON.stringify([rein.ho, rein.total, pek.ho, pek.total]));

    await p.fill('#katalogCari', 'rein'); await jeda(150);
    const c1 = await tampil(p);
    await p.fill('#katalogCari', '4582586964110'); await jeda(150);
    const c2 = await tampil(p);
    await p.fill('#katalogCari', ''); await jeda(150);
    c('K9 cari nama ("rein") dan barcode (Pekingese) menyaring daftar', c1 === 'MF-PLU-040' && c2 === 'MF-PLU-061', JSON.stringify([c1, c2]));

    await p.click('#katalog [data-saring=ho]'); await jeda(150);
    const f1 = await tampil(p);
    await p.click('#katalog [data-saring=nol]'); await jeda(150);
    const f2 = await tampil(p);
    await p.click('#katalog [data-saring=semua]'); await jeda(150);
    c('K10 saring: "In stock at HO" = Bear, KC Bear, Reindeer; "No stock" = Elephant, Cap Melon', f1 === 'MF-KC-001,MF-PLU-005,MF-PLU-040' && f2 === 'MF-CAP-002,MF-PLU-099', JSON.stringify([f1, f2]));

    await p.fill('#katalogMargin', '20'); await p.dispatchEvent('#katalogMargin', 'change'); await jeda(200);
    const m20 = (await baris(p)).find(x => x.s === 'MF-PLU-005') || {};
    const rumus = await p.evaluate(() => (document.getElementById('katalogRumus') || {}).innerText || '');
    await p.keyboard.press('Escape');
    await tunggu(p, () => !document.getElementById('katalog').classList.contains('buka'));
    await p.reload();
    await siapPapan(p); await jeda(300);
    await bukaKatalog(p);
    const sesudah = await p.evaluate(() => ({ m: document.getElementById('katalogMargin').value, harga: (document.querySelector('#katalog [data-sku="MF-PLU-005"]') || {}).getAttribute('data-harga') }));
    c('K11 margin diubah ke 20%: harga Bear jadi 242,813, dan tetap 20% sesudah halaman dimuat ulang', m20.harga === '242813' && sesudah.m === '20' && sesudah.harga === '242813', JSON.stringify([m20.harga, sesudah]));
    c('K12 rumus ditulis di bawah tabel dengan margin yang sedang dipakai', /20%/.test(rumus) && /tax/i.test(rumus) && !/\u2014/.test(rumus), rumus.slice(0, 200));

    const [unduh] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('#katalog [data-katalog=csv]')]);
    let csv = '';
    if (unduh) { const f = await unduh.path(); csv = f ? fs.readFileSync(f, 'utf8') : ''; }
    const lines = csv.trim().split(/\r?\n/);
    c('K13 Unduh CSV: kepala kolom, 6 baris SKU, Bear 242813 termasuk pajak, Elephant ikut', unduh && /\.csv$/.test(unduh.suggestedFilename()) && lines.length === 7 && /SKU/.test(lines[0]) && lines.some(l => /MF-PLU-005/.test(l) && /242813/.test(l)) && lines.some(l => /MF-PLU-099/.test(l)),
      JSON.stringify([unduh && unduh.suggestedFilename(), lines.slice(0, 3)]));

    await p.click('#katalog [data-katalog=cetak]'); await jeda(200);
    const ct = await p.evaluate(() => ({ c: window.__cetak, sisa: document.body.classList.contains('cetak-katalog') }));
    c('K14 Cetak memakai lembar cetak khusus berisi 6 SKU, margin 20% tertulis di kepala, kelas cetak dilepas lagi', ct.c && ct.c.kelas && ct.c.baris === 6 && /20%/.test(ct.c.teks) && !ct.sisa, JSON.stringify(ct).slice(0, 300));
    await ctx.close();

    /* ================= HP, Indonesia ================= */
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasangRute(ctx2);
    const hp = await halaman(ctx2);
    await masuk(hp, 'id');
    const tb2 = await bingkai(hp).evaluate(() => { const t = document.querySelector('#kopKanan [data-wms=katalog]'); return t ? { teks: t.textContent.trim(), label: t.getAttribute('aria-label') } : null; });
    await bukaKatalog(hp);
    await jeda(300);
    const hpL = await hp.evaluate(() => { const l = document.querySelector('#katalog .lembar'); return { gulir: document.documentElement.scrollWidth, lebar: Math.round(l.getBoundingClientRect().width), dalam: l.scrollWidth - l.clientWidth }; });
    c('K15 HP 390 px: lembar katalog selebar layar tanpa geser samping', hpL.gulir <= 392 && hpL.lebar >= 370 && hpL.dalam <= 1, JSON.stringify(hpL));
    const id = await hp.evaluate(() => ({ chip: (document.querySelector('#katalog [data-saring=ho]') || {}).textContent, harga: ((document.querySelector('#katalog [data-sku="MF-PLU-005"]') || {}).innerText || '').replace(/\s+/g, ' '), tanpa: ((document.querySelector('#katalog [data-sku="MF-CAP-002"]') || {}).innerText || '') }));
    c('K16 bahasa Indonesia: tombol Katalog, saring "Ada stok HO", rupiah bertitik (Rp215.833), "Belum ada harga"',
      tb2 && tb2.teks === 'Katalog' && /Ada stok HO/.test(id.chip) && /Rp215\.833/.test(id.harga) && /Belum ada harga/.test(id.tanpa), JSON.stringify([tb2, id]));
    const em = await hp.evaluate(() => /\u2014/.test(document.getElementById('katalog').innerText));
    c('K17 tidak ada tanda pisah panjang di lembar katalog', !em, String(em));
    await ctx2.close();
  } catch (e) {
    c('MATI di tengah jalan', false, e.stack);
  }
  c('K18 tidak ada galat JavaScript selama uji katalog', galat.length === 0, galat.join(' | ').slice(0, 400));

  await b.close(); srv.close();
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 400))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
})();
