/* Uji HPP mitra di Kontrol WMS (wms/hpp.js, tab "HPP mitra"), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Tiap bulan Pak Win minta HPP penjualan konsinyasi per
 * mitra. Excel Agustus dan September disusun tangan (buat.py). Sekarang WMS
 * yang menyusunnya dari buku besar, dengan rumus yang sama:
 *   HPP/pcs = wholesale sebelum PPN (hs)
 *   harga rak TGI = hs / (1 - 37,5%) x 1,11; Kinokuniya hs / (1 - 35%) x 1,11;
 *   MAA hs / (1 - 45%) x 1,11 (perkiraan, ganti dengan COC di Excel)
 *   tagihan/pcs = harga rak x (1 - promo) / 1,11 x (1 - komisi mitra)
 *   komisi TGI 35%, Kinokuniya 35%, MAA 45%, flash sale 15%.
 * Yang mahal kalau salah: Excel tanpa rumus (angka mati), rumus yang error di
 * Excel, Gamotion atau penjualan langsung ikut terhitung, promo yang tidak
 * mengurangi tagihan, dan invoice yang dibandingkan dengan angka yang salah.
 * Angka harapan dihitung tangan:
 *   TGI: T305 Bear 3 x 182.000, Tiger 156.000; T390 Panda 208.000 = 910.000, HPP 875.000.
 *   KIY: Panda 200.000 = HPP 200.000.
 *   MAA: Bear promo 175.000 x 0,85 = 148.750 + Lamb 175.000 = 323.750, HPP 350.000.
 *   Total 8 pcs, HPP 1.425.000, tagihan 1.433.750, termasuk PPN 1.591.462,5.
 *   Gamotion (beli putus) 2 pcs dan penjualan langsung HO 1 pcs tidak ikut.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http'), { execFileSync } = require('child_process');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const RECALC = process.env.RECALC || '/root/.claude/skills/synced/df2ff671-b45b-4fc2-a859-dc94f5e86212_34753a48-2c09-4057-8227-7c21e01a8e4f/xlsx/scripts/recalc.py';
const DIHARAPKAN = 15;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const SEMENTARA = fs.mkdtempSync('/tmp/uji-hpp-');

const L = { T305: 0, T390: 1, KIYGI: 2, MAA: 3, HO: 4, TERJUAL: 5, OPENING: 6, TRANSIT: 7, GMT: 8 };
const DATA = { ok: true, hariIni: '2026-10-11', bulanIni: '2026-10', tarif: 0.1, diperbarui: '11 Oct 2026 03:00',
  lok: [{ k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', r: 'TGI', toko: 1 }, { k: 'T390', n: 'TOYS KINGDOM LIVING WORLD KOTA WISATA CIBUBUR', r: 'TGI', toko: 1 },
    { k: 'KIY-GI', n: 'KINOKUNIYA GRAND INDONESIA', r: 'KIY', toko: 1 }, { k: 'MAA-SGI', n: 'MAA SEIBU GRAND INDONESIA', r: 'MAA', toko: 1 },
    { k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }, { k: 'TRANSIT', toko: 0 }, { k: 'GMT', toko: 0 }],
  prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 }, { b: '222', n: 'MofmoFriends Key Ring - Tiger', s: 'MF-KR-008', hs: 150000, h: 166500, r: 256154 },
    { b: '333', n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 200000, h: 222000, r: 341538 }, { b: '444', n: 'MofmoFriends S - Lamb', s: 'MF-PLU-020', hs: 175000, h: 194250, r: 298846 }],
  baris: [
    ['2026-07-01', 0, 30, L.OPENING, L.HO], ['2026-07-01', 1, 20, L.OPENING, L.HO], ['2026-07-01', 2, 10, L.OPENING, L.HO], ['2026-07-01', 3, 10, L.OPENING, L.HO],
    ['2026-07-12', 0, 5, L.HO, L.T305], ['2026-07-12', 1, 2, L.HO, L.T305], ['2026-08-16', 2, 3, L.HO, L.T390], ['2026-09-02', 2, 2, L.HO, L.KIYGI],
    ['2026-09-08', 0, 3, L.HO, L.MAA], ['2026-09-08', 3, 2, L.HO, L.MAA], ['2026-09-08', 0, 2, L.HO, L.GMT],
    ['2026-09-05', 0, 2, L.T305, L.TERJUAL], ['2026-09-20', 0, 1, L.T305, L.TERJUAL], ['2026-09-12', 1, 1, L.T305, L.TERJUAL], ['2026-09-10', 2, 1, L.T390, L.TERJUAL],
    ['2026-09-15', 2, 1, L.KIYGI, L.TERJUAL], ['2026-09-12', 0, 1, L.MAA, L.TERJUAL], ['2026-09-14', 3, 1, L.MAA, L.TERJUAL],
    ['2026-09-09', 0, 2, L.GMT, L.TERJUAL], ['2026-09-20', 1, 1, L.HO, L.TERJUAL], ['2026-10-03', 0, 1, L.T305, L.TERJUAL]
  ],
  invoiceMitra: [{ bulan: '2026-09', unit: 6, nilai: 1110000, gerai: { T305: { unit: 4, nilai: 702000 }, T390: { unit: 1, nilai: 208000 }, 'KIY-GI': { unit: 1, nilai: 200000 } } }]
};
const PROMO = { '2026-09': ['MAA-SGI|0'] };

/* ================= A. hitungan (Node) ================= */
let HP = null;
try {
  const kotak = { window: {}, console }; kotak.window.window = kotak.window; vm.createContext(kotak);
  vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/hpp.js'), 'utf8'), kotak);
  HP = kotak.window.WmsHpp;
} catch (e) { c('A0 hpp.js termuat', false, e.message); }
try {
  const H = HP.hitung(DATA, { bulan: '2026-09', promo: PROMO['2026-09'] });
  const m = (H.mitra || []).map(x => x.r + ':' + x.pcs + ':' + Math.round(x.hpp) + ':' + Math.round(x.tagih)).join(',');
  c('A1 per mitra September: TGI 5 pcs HPP 875.000 tagihan 910.000; KIY 1/200.000/200.000; MAA 2/350.000/323.750 (promo); Gamotion dan HO tidak ikut; 3 Okt tidak ikut',
    m === 'TGI:5:875000:910000,KIY:1:200000:200000,MAA:2:350000:323750' && (H.rinci || []).length === 6 && H.rinci.every(x => ['TGI', 'KIY', 'MAA'].indexOf(x.r) > -1), m + ' rinci ' + (H.rinci || []).map(x => x.k + '/' + x.pi).join(','));
  const t = H.total || {};
  c('A2 total 8 pcs, HPP 1.425.000, tagihan 1.433.750, termasuk PPN 1.591.462,5', t.pcs === 8 && Math.round(t.hpp) === 1425000 && Math.round(t.tagih) === 1433750 && Math.abs(t.tagihPpn - 1591462.5) < 0.6, JSON.stringify(t));
  const r = (H.rinci || []).find(x => x.k === 'MAA-SGI' && x.pi === 0) || {};
  const r2 = (H.rinci || []).find(x => x.k === 'T305' && x.pi === 0) || {};
  c('A3 rincian: MAA Bear harga rak 353.182 promo 15% tagihan/pcs 148.750; T305 Bear harga rak 310.800 komisi 35% tagihan/pcs 182.000 x 3',
    Math.round(r.rak) === 353182 && r.promo === 0.15 && Math.round(r.tagihPcs) === 148750 && Math.round(r2.rak) === 310800 && r2.komisi === 0.35 && Math.round(r2.tagihPcs) === 182000 && r2.qty === 3, JSON.stringify([r, r2]));
  const st = (H.mitra || []).map(x => x.r + ':' + x.status).join(',');
  c('A4 invoice (sebelum PPN) dibandingkan dengan tagihan sebelum PPN: TGI cocok, KIY cocok, MAA belum ada invoice', st === 'TGI:cocok,KIY:cocok,MAA:tanpa', st);
  const H0 = HP.hitung(DATA, { bulan: '2026-09', promo: [] });
  const H1 = HP.hitung(DATA, {});
  c('A5 tanpa promo: tagihan MAA 350.000 (sama dengan HPP); pilihan bulan hanya yang punya penjualan konsinyasi (Okt, Sep); bawaan = bulan tutup September',
    Math.round((H0.mitra.find(x => x.r === 'MAA') || {}).tagih) === 350000 && (H0.pilihanBulan || []).join(',') === '2026-10,2026-09' && H1.bulan === '2026-09', JSON.stringify([H0.mitra, H0.pilihanBulan, H1.bulan]));
} catch (e) { c('A MATI', false, e.stack); }

/* ================= B. layar, Excel, PDF ================= */
const PYX = `
import sys, json, openpyxl
f = sys.argv[1]
wf = openpyxl.load_workbook(f); wv = openpyxl.load_workbook(f, data_only=True)
out = {'sheet': wf.sheetnames, 'rumus': 0, 'font': set(), 'nilai': {}, 'asumsi': {}}
for ws in wf.worksheets:
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, str) and c.value.startswith('='): out['rumus'] += 1
            if c.value is not None: out['font'].add(c.font.name)
out['font'] = sorted(out['font'])
R = wv['Ringkasan']
for row in R.iter_rows(min_row=5, max_row=12):
    k = row[0].value
    if k: out['nilai'][str(k)] = [row[i].value for i in range(1, 12)]
A = wf['Asumsi']
for r in range(4, 10):
    c = A.cell(r, 2); out['asumsi'][str(A.cell(r, 1).value)] = [c.value, c.font.color.rgb if c.font.color else None, c.fill.fgColor.rgb]
D = wv['Rincian gerai x SKU']
out['rinci'] = [[c.value for c in row[:15]] for row in D.iter_rows(min_row=5, max_row=12)]
out['rumusSel'] = [wf['Rincian gerai x SKU']['M5'].value, wf['Ringkasan']['E5'].value, wf['Per SKU']['G4'].value]
print(json.dumps(out, default=str))
`;
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
  await new Promise(r => srv.listen(8783, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [];
  const pasang = async ctx => {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar: ' + r.request().url()); r.abort(); });
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      const h = m.nama === 'dataPapan' ? { pintu: 'ok', hasil: DATA } : { pintu: 'galat', pesan: 'Fungsi "' + m.nama + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA, 'klien|papan': { ok: true, versi: 'hpp', html: PAPAN }, 'klien|versi': { ok: true, versi: 'hpp' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const masuk = async p => {
    p.on('pageerror', e => galat.push(e.message));
    await p.goto('http://localhost:8783/wms/');
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'id'); localStorage.setItem('wms_maskot', 'off'); localStorage.removeItem('wms_hpp_promo'); });
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) { const f = p.frames().find(x => x !== p.mainFrame()); try { if (f && await f.evaluate(() => !!document.querySelector('[data-wms=kontrol]'))) return f; } catch (e) {} await jeda(100); }
    return null;
  };
  const bukaHpp = async (p, fr) => {
    await fr.evaluate(() => document.querySelector('[data-wms=kontrol]').click());
    await p.waitForSelector('#kontrol [data-kontrol-tab=hpp]', { timeout: 8000 }).catch(() => {});
    await p.click('#kontrol [data-kontrol-tab=hpp]').catch(() => {});
    await p.waitForSelector('#kontrol .hpp-ringkas', { timeout: 8000 }).catch(() => {});
  };
  const unduh = async (p, sel, nama) => {
    const [u] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }).catch(() => null), p.click(sel).catch(() => {})]);
    if (!u) return { u: null, f: '' };
    const t = path.join(SEMENTARA, nama); fs.copyFileSync(await u.path(), t); return { u, f: t };
  };
  const teksRingkas = p => p.evaluate(() => (document.querySelector('#kontrol .hpp-ringkas') || {}).innerText || '');
  try {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    await pasang(ctx);
    const p = await ctx.newPage();
    const fr = await masuk(p);
    let t1 = '', ubin = '';
    if (fr) { await bukaHpp(p, fr); t1 = await teksRingkas(p); ubin = await p.evaluate(() => (document.querySelector('#kontrol .hpp-ubin') || {}).innerText || ''); }
    c('B1 tab HPP mitra: ringkasan TGI Rp910.000 (cocok), KIY Rp200.000, MAA Rp350.000 tanpa promo (belum ada invoice); ubin 8 pcs dan HPP Rp1.425.000',
      /Rp910\.000/.test(t1) && /Rp200\.000/.test(t1) && /Rp350\.000/.test(t1) && /Cocok/.test(t1) && /Belum ada invoice/.test(t1) && /8 pcs/.test(ubin) && /Rp1\.425\.000/.test(ubin), t1 + ' || ' + ubin);
    await p.click('#kontrol [data-hpp-promo="MAA-SGI|0"]').catch(() => {}); await jeda(250);
    const t2 = await teksRingkas(p);
    c('B2 tandai Bear di MAA sebagai promo 15%: tagihan MAA jadi Rp323.750 dan total Rp1.433.750', /Rp323\.750/.test(t2) && /Rp1\.433\.750/.test(t2), t2);
    await p.click('#kontrol [data-kontrol=tutup]').catch(() => {}); await jeda(150);
    await bukaHpp(p, fr);
    const t3 = await teksRingkas(p);
    c('B3 tanda promo tersimpan di perangkat setelah Kontrol ditutup dan dibuka lagi', /Rp323\.750/.test(t3), t3);

    const x = await unduh(p, '#kontrol [data-hpp=xlsx]', 'hpp.xlsx');
    let re = {}, xl = {};
    if (x.f) {
      try { re = JSON.parse(execFileSync('python3', [RECALC, x.f, '60'], { encoding: 'utf8', timeout: 120000 })); } catch (e) { re = { error: String(e.stdout || e.message).slice(-300) }; }
      try { xl = JSON.parse(execFileSync('python3', ['-c', PYX, x.f], { encoding: 'utf8', timeout: 60000 })); } catch (e) { xl = { galat: String(e.stderr || e.message).slice(-300) }; }
    }
    c('B4 Excel hpp-mitra-2026-09.xlsx: tab Ringkasan, Asumsi, Rincian gerai x SKU, Per SKU; berisi rumus; dihitung ulang LibreOffice tanpa galat; semua huruf Arial',
      x.u && x.u.suggestedFilename() === 'hpp-mitra-2026-09.xlsx' && JSON.stringify(xl.sheet) === JSON.stringify(['Ringkasan', 'Asumsi', 'Rincian gerai x SKU', 'Per SKU']) && xl.rumus > 40 && (xl.rumusSel || []).every(v => /^=/.test(String(v))) && re.status === 'success' && re.total_errors === 0 && JSON.stringify(xl.font) === '["Arial"]',
      JSON.stringify([x.u && x.u.suggestedFilename(), xl.sheet, xl.rumus, xl.rumusSel, re, xl.font, xl.galat]).slice(0, 600));
    const n = xl.nilai || {}, tgi = n['Toys Games Indonesia'] || [], maa = n['MAA'] || [], tot = n['Total'] || [];
    c('B5 hasil rumus Excel sama dengan WMS: TGI pcs 5, HPP 875.000, tagihan 910.000; MAA tagihan 323.750 (promo); total tagihan 1.433.750',
      tgi[1] === 5 && Math.round(tgi[2]) === 875000 && Math.round(tgi[3]) === 910000 && Math.round(maa[3]) === 323750 && Math.round(tot[3]) === 1433750, JSON.stringify(n));
    const as = xl.asumsi || {}, ppn = as['PPN'] || [];
    c('B6 Asumsi: PPN 11% di sel input kuning berhuruf biru, komisi TGI 35%, dasar rak TGI 37,5%, flash sale 15%',
      ppn[0] === 0.11 && /0000FF$/.test(ppn[1] || '') && /FFF2CC$/.test(ppn[2] || '') && (as['Komisi TGI aktual'] || [])[0] === 0.35 && (as['Dasar penyusunan harga rak TGI (bukan komisi)'] || [])[0] === 0.375 && (as['Diskon flash sale MAA'] || [])[0] === 0.15,
      JSON.stringify(as));
    const pd = await unduh(p, '#kontrol [data-hpp=pdf]', 'hpp.pdf');
    let tp = ''; if (pd.f) { try { tp = execFileSync('pdftotext', ['-layout', pd.f, '-'], { encoding: 'utf8' }); } catch (e) { tp = 'galat ' + e.message; } }
    c('B7 PDF ringkasan: memuat ketiga mitra, total Rp1.433.750, dan judul HPP September 2026', pd.u && /\.pdf$/.test(pd.u.suggestedFilename()) && /Toys Games Indonesia/.test(tp) && /1\.433\.750/.test(tp) && /September 2026/.test(tp), tp.slice(0, 400));
    c('B8 tanpa tanda pisah panjang di tab HPP dan PDF', !(await p.evaluate(() => /—/.test(document.getElementById('kontrol').innerText))) && !/—/.test(tp), '');
    await ctx.close();
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasang(ctx2);
    const hp = await ctx2.newPage();
    const fr2 = await masuk(hp);
    let lebar = 9999; if (fr2) { await bukaHpp(hp, fr2); await jeda(200); lebar = await hp.evaluate(() => Math.max(document.documentElement.scrollWidth, document.getElementById('kontrol').scrollWidth)); }
    c('B9 HP 390 px: halaman tidak geser samping (tabel lebar menggulung di dalam kotaknya sendiri)', lebar <= 392, String(lebar));
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
