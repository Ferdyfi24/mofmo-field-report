/* Uji Katalog WMS (wms/katalog.js), 11 Okt 2026.
 * Harapan: "24 pemeriksaan, SEMUA LULUS".
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
 * Ferdy (11 Okt): "kasih opsi katalog itu pdf dan jpg juga serta excel".
 * K19 sampai K24 memeriksa berkas yang benar benar terunduh: Excel dibuka
 * openpyxl lalu rumusnya dihitung ulang LibreOffice (angka harus sama dengan
 * layar), JPG dibuka Pillow, PDF dibuka pypdf. Semuanya dibuat di browser
 * tanpa pustaka dari luar.
 * Data disusun di sini, papan lama palsu, tanpa jaringan.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const SEMENTARA = fs.mkdtempSync('/tmp/uji-katalog-');
const RECALC = (() => { try { const d = '/root/.claude/skills/synced'; for (const x of fs.readdirSync(d)) { const f = path.join(d, x, 'xlsx/scripts/recalc.py'); if (fs.existsSync(f)) return f; } } catch (e) {} return ''; })();
const py = (kode, ...arg) => { try { return JSON.parse(execFileSync('python3', ['-c', kode, ...arg], { encoding: 'utf8', timeout: 120000 })); } catch (e) { return { galat: String(e.stderr || e.message).slice(-300) }; } };
const simpanUnduhan = async (u, nama) => { if (!u) return ''; const f = await u.path(); if (!f) return ''; const t = path.join(SEMENTARA, nama); fs.copyFileSync(f, t); return t; };
const unduhLewat = async (p, sel) => { if (!(await p.$(sel))) return null; const [u] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.click(sel)]); return u; };
/* Tabel xref PDF harus menunjuk tepat ke awal tiap objek ("n 0 obj"). pypdf memaafkan xref yang meleset
   (ia membangun ulang), tapi tidak semua pembaca PDF begitu, jadi diperiksa langsung dari bitanya. */
const xrefSah = f => { try { const b = fs.readFileSync(f).toString('latin1'); const sx = Number((b.match(/startxref\s+(\d+)/) || [])[1]); if (b.slice(sx, sx + 4) !== 'xref') return 'startxref'; const m = b.slice(sx).match(/^xref\s+0 (\d+)\s+/); const n = Number(m[1]); let p0 = sx + m[0].length; for (let k = 0; k < n; k++) { const e = b.slice(p0 + k * 20, p0 + k * 20 + 20); if (k === 0) continue; const o = Number(e.slice(0, 10)); if (b.slice(o, o + String(k).length + 6) !== k + ' 0 obj') return 'objek ' + k; } return 'ok'; } catch (e) { return 'galat ' + e.message; } };
const PY_XLSX = `
import sys, json, openpyxl
f = sys.argv[1]
wf = openpyxl.load_workbook(f); wv = openpyxl.load_workbook(f, data_only=True)
sf, sv = wf.active, wv.active
kepala = None
for r in range(1, 12):
    if sv.cell(r, 1).value == 'SKU': kepala = r; break
out = {'judul': sv.title, 'kepala': kepala, 'margin': sv['B2'].value, 'baris': {}}
if kepala:
    out['kolom'] = [sv.cell(kepala, c).value for c in range(1, 11)]
    r = kepala + 1
    while sv.cell(r, 1).value:
        s = sv.cell(r, 1).value
        out['baris'][s] = {'barcode': sv.cell(r, 2).value, 'pajak': sv.cell(r, 8).value, 'fmtPajak': sv.cell(r, 8).number_format,
            'sebelum': sv.cell(r, 7).value, 'termasuk': sv.cell(r, 9).value, 'rumus': str(sf.cell(r, 9).value or ''), 'rumusG': str(sf.cell(r, 7).value or ''), 'fmtHarga': sv.cell(r, 9).number_format}
        r += 1
    out['beku'] = sf.freeze_panes
print(json.dumps(out, default=str))
`;
const PY_JPG = `
import sys, json
from PIL import Image, ImageStat
im = Image.open(sys.argv[1]); st = ImageStat.Stat(im.convert('L'))
print(json.dumps({'fmt': im.format, 'w': im.size[0], 'h': im.size[1], 'sd': st.stddev[0]}))
`;
const PY_PDF = `
import sys, json
from pypdf import PdfReader
r = PdfReader(sys.argv[1], strict=True); hal = []
for p in r.pages:
    xo = p['/Resources']['/XObject']; im = [xo[k].get_object() for k in xo]
    hal.append({'w': float(p.mediabox.width), 'h': float(p.mediabox.height), 'img': [[int(i['/Width']), int(i['/Height']), str(i['/Filter'])] for i in im]})
print(json.dumps({'hal': hal, 'judul': (r.metadata or {}).get('/Title')}))
`;
const AKAR = '/home/claude/fieldreport';
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const KODE_BENAR = 'KODE-PALSU-UJI';
const DIHARAPKAN = 24;
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

    /* ---------- Excel, JPG, PDF (margin masih 20%) ----------
       Harapan dihitung sendiri: Bear 175.000 / 0,8 = 218.750, x 1,11 = 242.812,5 -> 242.813.
       Pekingese 200.000 / 0,8 = 250.000, x 1,05 = 262.500. Cap Melon tanpa harga: sel kosong. */
    const ux = await unduhLewat(p, '#katalog [data-katalog=xlsx]');
    const fx = await simpanUnduhan(ux, 'katalog.xlsx');
    const xa = fx ? py(PY_XLSX, fx) : {};
    const xb = xa.baris || {}, xbear = xb['MF-PLU-005'] || {}, xpek = xb['MF-PLU-061'] || {}, xcap = xb['MF-CAP-002'] || {};
    c('K19 Unduh Excel: berkas .xlsx terbuka di openpyxl, 6 SKU di bawah kepala kolom, margin 20% di B2, Bear 242.813 dan Pekingese 262.500 (angka, bukan teks), barcode tetap teks, pajak 11% berformat persen',
      ux && /^katalog-jual-putus-\d{4}-\d{2}-\d{2}\.xlsx$/.test(ux.suggestedFilename()) && Object.keys(xb).length === 6 && xa.margin === 0.2 &&
      xbear.termasuk === 242813 && xpek.termasuk === 262500 && xbear.barcode === '4582586962058' && xbear.pajak === 0.11 && /%/.test(xbear.fmtPajak) && xcap.termasuk == null && xa.beku,
      JSON.stringify([ux && ux.suggestedFilename(), xa]).slice(0, 500));
    let xr = {};
    if (fx && RECALC) { fs.copyFileSync(fx, fx + '.ulang.xlsx'); try { execFileSync('python3', [RECALC, fx + '.ulang.xlsx', '90'], { encoding: 'utf8', timeout: 150000 }); } catch (e) {} xr = py(PY_XLSX, fx + '.ulang.xlsx'); }
    const rb = (xr.baris || {})['MF-PLU-005'] || {}, rp2 = (xr.baris || {})['MF-PLU-061'] || {};
    c('K20 harga di Excel berupa rumus dari sel margin; dihitung ulang LibreOffice hasilnya tetap 242.813 dan 262.500 (sama dengan layar)',
      /^=ROUND\(G\d+\*\(1\+H\d+\)/.test(xbear.rumus) && /^=ROUND\(F\d+\/\(1-\$B\$2\)/.test(xbear.rumusG) && rb.termasuk === 242813 && rp2.termasuk === 262500 && rb.sebelum === 218750, JSON.stringify([xbear.rumusG, xbear.rumus, RECALC ? 'recalc' : 'TANPA RECALC', rb, rp2]).slice(0, 400));

    const uj = await unduhLewat(p, '#katalog [data-katalog=jpg]');
    const fj = await simpanUnduhan(uj, 'katalog-6.jpg');
    const ja = fj ? py(PY_JPG, fj) : {};
    await p.click('#katalog [data-saring=ho]'); await jeda(150);
    const uj3 = await unduhLewat(p, '#katalog [data-katalog=jpg]');
    const jb = uj3 ? py(PY_JPG, await simpanUnduhan(uj3, 'katalog-3.jpg')) : {};
    await p.click('#katalog [data-saring=semua]'); await jeda(150);
    c('K21 Unduh JPG: gambar JPEG lebar 1240 px berisi kartu SKU (tidak polos); ikut saringan, 3 SKU lebih pendek dari 6 SKU',
      uj && /^katalog-jual-putus-\d{4}-\d{2}-\d{2}\.jpg$/.test(uj.suggestedFilename()) && ja.fmt === 'JPEG' && ja.w === 1240 && ja.sd > 12 && jb.w === 1240 && jb.h < ja.h && jb.h > 400,
      JSON.stringify([uj && uj.suggestedFilename(), ja, jb]));

    const up = await unduhLewat(p, '#katalog [data-katalog=pdf]');
    const fp = await simpanUnduhan(up, 'katalog.pdf');
    const pa = fp ? py(PY_PDF, fp) : {};
    const h0 = (pa.hal || [])[0] || {}, xs = fp ? xrefSah(fp) : '-';
    c('K22 Unduh PDF: terbuka di pypdf (ketat) dan tabel xref tepat, 1 halaman A4 (595 x 842 pt) berisi gambar JPEG 1240 px, berjudul daftar harga',
      up && /^katalog-jual-putus-\d{4}-\d{2}-\d{2}\.pdf$/.test(up.suggestedFilename()) && (pa.hal || []).length === 1 && Math.round(h0.w) === 595 && Math.round(h0.h) === 842 &&
      h0.img && h0.img[0] && h0.img[0][0] === 1240 && /DCTDecode/.test(h0.img[0][2]) && /Mofmofriends/.test(pa.judul || '') && xs === 'ok', JSON.stringify([up && up.suggestedFilename(), xs, pa]).slice(0, 400));

    /* Penulis PDF untuk katalog panjang: 3 halaman JPEG berukuran beda, semua harus jadi halaman sendiri. */
    const b64 = await p.evaluate(async () => {
      const K = window.WmsKatalog; if (!K || !K._pdf) return '';
      const hal = [];
      for (const [w, h] of [[120, 170], [240, 340], [60, 85]]) {
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.fillStyle = '#A9501C'; g.fillRect(0, 0, w, h);
        const bl = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.8)); hal.push({ bytes: new Uint8Array(await bl.arrayBuffer()), w, h });
      }
      const u8 = K._pdf(hal, 'Uji'); let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s);
    });
    let pb = {};
    if (b64) { fs.writeFileSync(path.join(SEMENTARA, 'tiga.pdf'), Buffer.from(b64, 'base64')); pb = py(PY_PDF, path.join(SEMENTARA, 'tiga.pdf')); }
    const xs3 = b64 ? xrefSah(path.join(SEMENTARA, 'tiga.pdf')) : '-';
    c('K23 penulis PDF: tiga halaman JPEG jadi tiga halaman A4, ukuran gambar asli terjaga (120, 240, 60 px), tabel xref tepat',
      xs3 === 'ok' && (pb.hal || []).length === 3 && pb.hal.map(x => x.img[0][0]).join(',') === '120,240,60' && pb.hal.every(x => Math.round(x.w) === 595), JSON.stringify([xs3, pb]).slice(0, 300));
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
    const tbU = await hp.evaluate(() => ['pdf', 'jpg', 'xlsx', 'csv'].map(k => { const b = document.querySelector('#katalog [data-katalog=' + k + ']'); if (!b) return k + ':-'; const r = b.getBoundingClientRect(); return k + ':' + b.textContent.trim() + ':' + b.getAttribute('aria-label') + ':' + (r.right <= innerWidth + 1 && r.width > 0 ? 'ok' : 'luber'); }).join('|'));
    c('K24 HP Indonesia: tombol PDF, JPG, Excel, CSV terlihat utuh, label lengkapnya "Unduh ..."', /^pdf:PDF:Unduh PDF:ok\|jpg:JPG:Unduh JPG:ok\|xlsx:Excel:Unduh Excel:ok\|csv:CSV:Unduh CSV:ok$/.test(tbU), tbU);
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
