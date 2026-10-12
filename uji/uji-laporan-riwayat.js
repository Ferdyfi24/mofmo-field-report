/* Uji Riwayat laporan otomatis WMS (wms/laporan.js, tab "Riwayat"), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Tanggal 1 pukul 06.00 Apps Script membekukan angka
 * bulan lalu (ArsipBulanan.gs). Tab Riwayat di Laporan harus:
 *  - membuat PPT dari ARSIP, bukan dari buku besar sekarang. Kalau laporan
 *    30 Sep baru masuk 2 Okt, PPT September yang diunduh ulang tetap sama
 *    dengan yang terkirim; koreksinya cuma ditandai;
 *  - membekukan ulang hanya sesudah konfirmasi di halaman (tanpa dialog
 *    peramban), sebagai versi baru;
 *  - menyalakan dan mematikan pemicu bulanan;
 *  - jujur sebelum Apps Script versi baru di-deploy.
 * Ringkasan arsip dihitung dua kali (server dan peramban). Bagian A memastikan
 * aturannya sama dengan uji server (uji-arsip-bulanan.js bagian E).
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http'), { execFileSync } = require('child_process');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 11;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const SEMENTARA = fs.mkdtempSync('/tmp/uji-laporan-riwayat-');

/* Buku besar sama dengan uji-laporan-mitra.js, ditambah satu koreksi:
   laporan TK Alam Sutera 30 Sep (Bear 1 pcs) yang baru masuk sesudah arsip dibekukan.
   Arsip September v1: 24 baris sampai 30 Sep, terjual 6 pcs Rp1.193.250
   (T305 4 = 749.250, T390 Panda 222.000, KIY Panda 222.000).
   Buku besar sekarang: 25 baris sampai 30 Sep, 7 pcs Rp1.387.500. */
const L = { T305: 0, T390: 1, KIYGI: 2, HO: 3, PRINCIPAL: 4, TERJUAL: 5, OPENING: 6, TRANSIT: 7 };
const DASAR = [
  ['2026-07-01', 0, 30, L.OPENING, L.HO], ['2026-07-01', 1, 20, L.OPENING, L.HO], ['2026-07-01', 2, 10, L.OPENING, L.HO], ['2026-07-01', 3, 10, L.OPENING, L.HO],
  ['2026-07-10', 0, 5, L.HO, L.TRANSIT], ['2026-07-10', 1, 2, L.HO, L.TRANSIT], ['2026-07-10', 3, 3, L.HO, L.TRANSIT],
  ['2026-07-12', 0, 5, L.TRANSIT, L.T305], ['2026-07-12', 1, 2, L.TRANSIT, L.T305], ['2026-07-12', 3, 3, L.TRANSIT, L.T305],
  ['2026-08-15', 0, 4, L.HO, L.TRANSIT], ['2026-08-15', 2, 3, L.HO, L.TRANSIT], ['2026-08-16', 0, 4, L.TRANSIT, L.T390], ['2026-08-16', 2, 3, L.TRANSIT, L.T390],
  ['2026-08-20', 0, 1, L.T305, L.TERJUAL],
  ['2026-09-01', 2, 2, L.HO, L.TRANSIT], ['2026-09-02', 2, 2, L.TRANSIT, L.KIYGI],
  ['2026-09-05', 0, 2, L.T305, L.TERJUAL], ['2026-09-10', 2, 1, L.T390, L.TERJUAL], ['2026-09-12', 1, 1, L.T305, L.TERJUAL], ['2026-09-15', 2, 1, L.KIYGI, L.TERJUAL],
  ['2026-09-20', 0, 1, L.T305, L.TERJUAL], ['2026-09-25', 0, 3, L.HO, L.TRANSIT], ['2026-09-26', 0, 3, L.TRANSIT, L.T305]];
const UMUM = { ok: true, tarif: 0.1, diperbarui: '11 Oct 2026 03:00',
  lok: [{ k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', r: 'TGI', toko: 1 }, { k: 'T390', n: 'TOYS KINGDOM LIVING WORLD KOTA WISATA CIBUBUR', r: 'TGI', toko: 1 },
    { k: 'KIY-GI', n: 'KINOKUNIYA GRAND INDONESIA', r: 'KIY', toko: 1 },
    { k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'PRINCIPAL', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }, { k: 'TRANSIT', toko: 0 }],
  prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 }, { b: '222', n: 'MOFMOFRIENDS key charm - Tiger', s: 'MF-KC-008', hs: 150000, h: 166500, r: 249900 },
    { b: '333', n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 200000, h: 222000, r: 341538 }, { b: '444', n: 'MofmoFriends S - Lamb', s: 'MF-PLU-020', hs: 175000, h: 194250, r: 298846 }],
  invoiceMitra: [{ bulan: '2026-09', unit: 7, nilai: 1100000, gerai: { T305: { unit: 4, nilai: 700000 }, T390: { unit: 2, nilai: 200000 }, 'KIY-GI': { unit: 1, nilai: 200000 } } }],
  opname: [{ kode: 'T305', wajib: true, terakhir: '2026-09-20' }, { kode: 'T390', wajib: true, terakhir: '' }, { kode: 'KIY-GI', wajib: true, terakhir: '2026-09-25' }] };
const TG = { ok: true, baris: [{ retailer: 'TGI', bulan: '2026-08', nilai: 194250, sisa: 194250, lunas: false, telat: true, jatuhTempo: '2026-09-30' }] };
const DATA = Object.assign({}, UMUM, { hariIni: '2026-10-11', bulanIni: '2026-10', baris: DASAR.concat([['2026-09-30', 0, 1, L.T305, L.TERJUAL], ['2026-10-03', 0, 1, L.T305, L.TERJUAL]]) });
const ARSIP = Object.assign({}, UMUM, { hariIni: '2026-10-01', bulanIni: '2026-10', baris: DASAR.slice(), tg: TG, arsip: { bulan: '2026-09', versi: 1, waktu: '2026-10-01T06:00', sebab: 'otomatis', akhirBuku: '2026-09-30' } });
const ENTRI1 = { bulan: '2026-09', versi: 1, id: 'F1', waktu: '2026-10-01T06:00', sebab: 'otomatis', baris: 24, pcs: 6, nilai: 1193250, ukuran: 9000 };

/* ================= A. ringkasan arsip (Node) ================= */
let LP = null;
try {
  const kotak = { window: {}, console }; kotak.window.window = kotak.window; vm.createContext(kotak);
  vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/laporan.js'), 'utf8'), kotak);
  LP = kotak.window.WmsLaporan;
} catch (e) { c('A0 laporan.js termuat', false, e.message); }
try {
  const R = LP && LP._ringkasArsip;
  const dp = { lok: [{ k: 'T305', r: 'TGI', toko: 1 }, { k: 'HO', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }], prod: [{ n: 'Bear', h: 194250, hs: 175000 }],
    baris: [['2026-08-01', 0, 10, 3, 1], ['2026-08-05', 0, 6, 1, 0], ['2026-08-20', 0, 1, 0, 2], ['2026-09-03', 0, 2, 0, 2], ['2026-09-30', 0, 1, 0, 2], ['2026-10-01', 0, 1, 0, 2],
      ['2026-09-10', 0, 2, 1, 2], ['2026-09-11', 0, 0, 0, 2], ['2026-09-12', 0, 1, 9, 2], ['2026-09-13', 0, 4, 3, 2]] };
  const r = R ? R(dp, '2026-09') : {};
  const r2 = R ? R(ARSIP, '2026-09') : {}, r3 = R ? R(DATA, '2026-09') : {};
  c('A1 ringkasan arsip di peramban sama dengan aturan server: 7 baris, 5 pcs; fixture arsip 24 baris 6 pcs Rp1.193.250, buku besar sekarang 25 baris 7 pcs',
    r.baris === 7 && r.pcs === 5 && r.nilai === 5 * 194250 && r2.baris === 24 && r2.pcs === 6 && r2.nilai === 1193250 && r3.baris === 25 && r3.pcs === 7, JSON.stringify([r, r2, r3]));
} catch (e) { c('A1 MATI', false, e.stack); }

/* ================= B. layar (Playwright + python-pptx) ================= */
const PY = `
import sys, json, zipfile, io
from pptx import Presentation
def baca(f):
    pr = Presentation(f); out = []
    for s in pr.slides:
        teks = []
        for sh in s.shapes:
            if sh.has_text_frame: teks.append(sh.text_frame.text)
            if getattr(sh, 'has_table', False) and sh.has_table:
                for r in sh.table.rows: teks.append(' | '.join(c.text for c in r.cells))
        out.append({'teks': '\\n'.join(teks)})
    return {'slide': out}
f = sys.argv[1]
if f.endswith('.zip'):
    z = zipfile.ZipFile(f); print(json.dumps({'zip': [{'nama': n, 'isi': baca(io.BytesIO(z.read(n)))} for n in sorted(z.namelist())]}))
else: print(json.dumps(baca(f)))
`;
const py = f => { try { return JSON.parse(execFileSync('python3', ['-c', PY, f], { encoding: 'utf8', timeout: 60000 })); } catch (e) { return { galat: String(e.stderr || e.message).slice(-300) }; } };
const semua = x => (x.slide || []).map(s => s.teks).join('\n');

async function bagianB() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { c('B0 playwright', false, e.message); return; }
  const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
  const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
  const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
  const srv = http.createServer((q, s) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(AKAR, p);
    if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
    s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
  });
  const PAPAN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title><style>#layarIsi{display:none}</style></head><body>' +
    '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
    '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div><h1>Papan Data</h1></div><div id="kopKanan"></div></div></header><nav id="panel"></nav><div id="isi"></div></div>' +
    '<script>function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
  await new Promise(r => srv.listen(8782, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [], PANGGIL = [], DIALOG = [];
  let SERVER = { deploy: true, oto: true, arsip: [ENTRI1] };
  const pasang = async ctx => {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar: ' + r.request().url()); r.abort(); });
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h; const n = m.nama, a = m.args || [];
      if (m.fn === 'panggil') PANGGIL.push([n].concat(a));
      const kh = () => ({ ok: true, oto: SERVER.oto, terpasang: SERVER.oto, berikut: '2026-11-01', bulanTutup: '2026-09', arsip: SERVER.arsip.slice() });
      if (n === 'dataPapan') h = { pintu: 'ok', hasil: DATA };
      else if (n === 'permintaanDanPiutang') h = { pintu: 'ok', hasil: { ok: true, tagihan: TG } };
      else if (!SERVER.deploy) h = { pintu: 'galat', pesan: 'Fungsi "' + n + '" tidak dibuka untuk WMS.' };
      else if (n === 'riwayatArsip') h = { pintu: 'ok', hasil: kh() };
      else if (n === 'ambilArsip') h = { pintu: 'ok', hasil: a[1] === '2026-09' ? { ok: true, entri: ENTRI1, data: ARSIP } : { ok: false, pesan: 'tidak ada' } };
      else if (n === 'wmsArsipBekukan') { const v = SERVER.arsip.filter(x => x.bulan === a[1]).length + 1; const e = { bulan: a[1], versi: v, id: 'F' + (SERVER.arsip.length + 1), waktu: '2026-10-12T09:00', sebab: 'manual', baris: 25, pcs: 7, nilai: 1387500 }; SERVER.arsip.unshift(e); SERVER.arsip.sort((x, y) => x.bulan < y.bulan ? 1 : x.bulan > y.bulan ? -1 : y.versi - x.versi); const k = kh(); k.baru = e; h = { pintu: 'ok', hasil: k }; }
      else if (n === 'wmsArsipSetel') { SERVER.oto = a[1] === true; h = { pintu: 'ok', hasil: kh() }; }
      else h = { pintu: 'galat', pesan: 'Fungsi "' + n + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA, 'klien|papan': { ok: true, versi: 'riw', html: PAPAN }, 'klien|versi': { ok: true, versi: 'riw' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const masuk = async p => {
    p.on('pageerror', e => galat.push(e.message)); p.on('dialog', d => { DIALOG.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8782/wms/');
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'id'); localStorage.setItem('wms_maskot', 'off'); });
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) { const f = p.frames().find(x => x !== p.mainFrame()); try { if (f && await f.evaluate(() => !!document.querySelector('[data-wms=laporan]'))) return f; } catch (e) {} await jeda(100); }
    return null;
  };
  const bukaRiwayat = async (p, fr) => {
    await fr.evaluate(() => document.querySelector('[data-wms=laporan]').click());
    await p.waitForSelector('#laporan [data-laporan-tab=riwayat]', { timeout: 8000 }).catch(() => {});
    await p.click('#laporan [data-laporan-tab=riwayat]').catch(() => {});
    await p.waitForFunction(() => !!document.querySelector('#laporan [data-riwayat-bulan], #laporan .tolak-alat'), null, { timeout: 8000 }).catch(() => {});
    await jeda(200);
  };
  const unduh = async (p, sel, nama) => {
    const [u] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }).catch(() => null), p.click(sel).catch(() => {})]);
    if (!u) return { u: null, f: '' };
    const t = path.join(SEMENTARA, nama); fs.copyFileSync(await u.path(), t); return { u, f: t };
  };
  try {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    await pasang(ctx);
    const p = await ctx.newPage();
    const fr = await masuk(p);
    let t1 = {};
    if (fr) {
      await bukaRiwayat(p, fr);
      t1 = await p.evaluate(() => {
        const q = s => document.querySelector(s), kartu = b => q('#laporan [data-riwayat-bulan="' + b + '"]');
        return { oto: (q('#laporan [data-riwayat=oto]') || {}).getAttribute && q('#laporan [data-riwayat=oto]').getAttribute('aria-checked'), otoKet: (q('#laporan .lpr-oto') || {}).innerText || '',
          sep: (kartu('2026-09') || {}).innerText || '', agu: (kartu('2026-08') || {}).innerText || '', okt: !!kartu('2026-10'), bekuAgu: !!q('#laporan [data-riwayat-beku="2026-08"]') };
      });
    }
    c('B1 Riwayat: otomatis nyala (berikutnya 1 Nov 2026); September v1 dibekukan 1 Okt 06.00 otomatis, 6 pcs; ada koreksi +1 pcs; Agustus belum dibekukan dengan tombol Bekukan; Oktober (belum selesai) tidak ada',
      !!fr && t1.oto === 'true' && /1 Nov 2026/.test(t1.otoKet) && /v1/.test(t1.sep) && /1 Okt/.test(t1.sep) && /06\.00/.test(t1.sep) && /6 pcs/.test(t1.sep) && /koreksi/i.test(t1.sep) && /\+1 pcs/.test(t1.sep) &&
      /Belum dibekukan/.test(t1.agu) && t1.bekuAgu && !t1.okt, JSON.stringify(t1));

    const g = await unduh(p, '#laporan [data-riwayat-unduh="gabung"][data-bulan="2026-09"]', 'arsip-gabung.pptx');
    const tg = semua(g.f ? py(g.f) : {});
    c('B2 unduh Gabungan dari arsip: berkas laporan-bulanan-2026-09-arsip-v1.pptx berisi angka ARSIP Rp1.193.250, bukan buku besar sekarang Rp1.387.500',
      g.u && g.u.suggestedFilename() === 'laporan-bulanan-2026-09-arsip-v1.pptx' && /Rp1\.193\.250/.test(tg) && !/Rp1\.387\.500/.test(tg) && PANGGIL.some(x => x[0] === 'ambilArsip' && x[2] === '2026-09'),
      JSON.stringify([g.u && g.u.suggestedFilename(), tg.slice(0, 300), PANGGIL.filter(x => x[0] === 'ambilArsip')]));
    const z = await unduh(p, '#laporan [data-riwayat-unduh="mitra"][data-bulan="2026-09"]', 'arsip-mitra.zip');
    const zz = z.f ? py(z.f) : {};
    const tk = semua((((zz.zip || []).find(e => /toys-kingdom/.test(e.nama)) || {}).isi) || {});
    c('B3 rapor mitra dari arsip: zip berisi rapor Toys Kingdom dengan TK Alam Sutera 4 pcs Rp749.250 (arsip) dan piutang dari tagihan yang ikut dibekukan',
      z.u && /rapor-mitra-2026-09-arsip-v1\.zip/.test(z.u.suggestedFilename()) && /TK Alam Sutera \| 4 \| Rp749\.250/.test(tk) && /Rp194\.250/.test(tk), JSON.stringify([z.u && z.u.suggestedFilename(), tk.slice(0, 400), zz.galat]));
    const pr = await unduh(p, '#laporan [data-riwayat-unduh="principal"][data-bulan="2026-09"]', 'arsip-principal.pptx');
    const tp = semua(pr.f ? py(pr.f) : {});
    c('B4 versi principal dari arsip: tanpa komisi, angka arsip', pr.u && /principal/.test(pr.u.suggestedFilename()) && !/komisi|margin/i.test(tp) && /Rp1\.193\.250/.test(tp), (pr.u && pr.u.suggestedFilename()) + tp.slice(0, 200));

    await p.click('#laporan [data-riwayat-ulang="2026-09"]').catch(() => {}); await jeda(200);
    const t2 = await p.evaluate(() => ({ konf: (document.querySelector('#laporan .lpr-konfirmasi') || {}).innerText || '' }));
    const sebelum = PANGGIL.filter(x => x[0] === 'wmsArsipBekukan').length;
    await p.click('#laporan [data-riwayat-ya="2026-09"]').catch(() => {});
    await p.waitForFunction(() => /v2/.test((document.querySelector('#laporan [data-riwayat-bulan="2026-09"]') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    const t3 = await p.evaluate(() => (document.querySelector('#laporan [data-riwayat-bulan="2026-09"]') || {}).innerText || '');
    c('B5 Bekukan ulang meminta konfirmasi di halaman dulu (belum memanggil server), lalu jadi v2; versi lama v1 tetap bisa diunduh',
      /v2/.test(t2.konf) && sebelum === 0 && PANGGIL.some(x => x[0] === 'wmsArsipBekukan' && x[1] === 'WMS-TIKET' && x[2] === '2026-09') && /v2/.test(t3) && /v1/.test(t3),
      JSON.stringify([t2, sebelum, t3]));
    await p.click('#laporan [data-riwayat-beku="2026-08"]').catch(() => {}); await jeda(150);
    await p.click('#laporan [data-riwayat-ya="2026-08"]').catch(() => {});
    await p.waitForFunction(() => /v1/.test((document.querySelector('#laporan [data-riwayat-bulan="2026-08"]') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    c('B6 Bekukan Agustus memanggil wmsArsipBekukan(2026-08) dan kartunya jadi v1', PANGGIL.some(x => x[0] === 'wmsArsipBekukan' && x[2] === '2026-08') && /v1/.test(await p.evaluate(() => (document.querySelector('#laporan [data-riwayat-bulan="2026-08"]') || {}).innerText || '')), JSON.stringify(PANGGIL.slice(-3)));
    await p.click('#laporan [data-riwayat=oto]').catch(() => {});
    await p.waitForFunction(() => (document.querySelector('#laporan [data-riwayat=oto]') || {}).getAttribute && document.querySelector('#laporan [data-riwayat=oto]').getAttribute('aria-checked') === 'false', null, { timeout: 8000 }).catch(() => {});
    const t4 = await p.evaluate(() => (document.querySelector('#laporan .lpr-oto') || {}).innerText || '');
    c('B7 saklar otomatis dimatikan: wmsArsipSetel(false) dipanggil, keterangannya "Mati"', PANGGIL.some(x => x[0] === 'wmsArsipSetel' && x[2] === false) && /Mati/.test(t4), t4 + JSON.stringify(PANGGIL.slice(-2)));
    c('B8 tanpa dialog peramban dan tanpa tanda pisah panjang', DIALOG.length === 0 && !(await p.evaluate(() => /—/.test(document.getElementById('laporan').innerText))) && !/—/.test(tg + tk + tp), DIALOG.join('|'));
    await ctx.close();

    SERVER.deploy = false;
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasang(ctx2);
    const hp = await ctx2.newPage();
    const fr2 = await masuk(hp);
    let t5 = {};
    if (fr2) { await bukaRiwayat(hp, fr2); t5 = await hp.evaluate(() => ({ teks: (document.querySelector('#laporan .tolak-alat') || {}).innerText || '', lebar: Math.max(document.documentElement.scrollWidth, document.getElementById('laporan').scrollWidth) })); }
    c('B9 sebelum Apps Script di-deploy: pesan jujur "menyala setelah ... di-deploy"; HP 390 px tanpa geser samping', /deploy/.test(t5.teks) && t5.lebar <= 392, JSON.stringify(t5));
    await ctx2.close();
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('B10 tidak ada galat JavaScript dan tidak ada pustaka dari CDN', galat.length === 0, galat.join(' | ').slice(0, 400));
  await b.close(); srv.close();
}

bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
