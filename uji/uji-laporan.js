/* Uji Laporan bulanan WMS (wms/laporan.js), 11 Okt 2026.
 * Harapan: "23 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy: "report sales bulanan, report inventory movement,
 * inventory condition, sku performance, channel performance, trus ada opsi
 * gabungin", jadi berkas PPT. PPT ini dikirim ke principal, jadi angka yang
 * salah satu rupiah pun memalukan, dan versi principal tidak boleh membawa
 * komisi OLS atau margin mitra. Cacat yang paling mungkin dan paling diam:
 *  - saldo awal bulan dihitung dari stok hari ini, bukan dari buku besar
 *    sebelum tanggal 1;
 *  - OPENING (saldo pembukaan) atau perpindahan antarlokasi terbaca sebagai
 *    barang masuk dari principal;
 *  - umur stok memakai lot terbaru (LIFO) sehingga stok tua terlihat muda;
 *  - penjualan bulan berikutnya ikut terhitung;
 *  - versi principal masih memuat kata Komisi atau kolom margin;
 *  - opsi "pisah" menghasilkan banyak unduhan, bukan satu zip.
 * Semua angka harapan dihitung tangan dari baris di bawah. Bagian A memuat
 * laporan.js di Node (vm). Bagian B membuka WMS dengan papan palsu, menekan
 * Unduh, lalu membuka berkasnya dengan python-pptx.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http'), { execFileSync } = require('child_process');
const AKAR = '/home/claude/fieldreport';
const DIHARAPKAN = 23;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const SEMENTARA = fs.mkdtempSync('/tmp/uji-laporan-');

/* ---------- buku besar, disusun di sini ----------
   Hari ini 11 Okt 2026, laporan bawaan = September 2026.
   Bear hs 175.000 h 194.250 | Tiger hs 150.000 h 166.500 | Panda hs 200.000 h 210.000 (pajak 5%) | Lamb hs 175.000 h 194.250 | Cap Melon belum berharga.
   1 Agu OPENING ke HO: Bear 20, Tiger 10, Panda 10, Lamb 5 (saldo pembukaan, BUKAN masuk dari principal).
   10 Agu HO ke TRANSIT Bear 6, Lamb 2; 12 Agu tiba T305. 20 Agu T305 laku Bear 1 (Agustus Rp194.250).
   Akhir Agustus: HO 37 (Bear 14, Tiger 10, Panda 10, Lamb 3), T305 7 (Bear 5, Lamb 2), total 44 = saldo awal September.
   September: 2 Sep PRINCIPAL ke HO Tiger 12. 3 Sep HO ke TRANSIT Panda 4, 5 Sep tiba KIY-GI.
     8 Sep HO ke GMT Bear 2, 9 Sep GMT laku Bear 2. 10 Sep T305 laku Bear 2. 15 Sep KIY-GI laku Panda 1.
     20 Sep HO laku Tiger 1 (penjualan langsung). 22 Sep T305 rusak Bear 1. 28 Sep ADJUST +3 Tiger ke HO.
     29 Sep HO ke TRANSIT Lamb 1 (masih di jalan 30 Sep).
   3 Okt T305 laku Bear 1: di luar September, tidak boleh ikut.
   Penjualan Sep: 2x194.250 (GMT) + 2x194.250 (T305) + 210.000 + 166.500 = 1.153.500, 6 pcs.
   Komisi (internal) = 10% x (4x175.000 + 200.000 + 150.000) = 105.000.
   Arus Sep: 44 + 12 principal + 3 penyesuaian - 6 terjual - 1 rusak = 52.
   Per lokasi: HO 37 +15 -8 = 44; TRANSIT 0 +5 -4 = 1; gerai 7 +4 -4 = 7; Gamotion 0 +2 -2 = 0.
   Umur stok gerai 30 Sep (FIFO): T305 Bear 2 dan Lamb 2 dari lot 12 Agu (49 hari), KIY Panda 3 dari lot 5 Sep (25 hari): 0-30 = 3, 31-60 = 4.
   Stok mati: T305 Lamb (49 hari, belum pernah laku di T305) = 1 SKU-gerai, 2 pcs. Hari tutupan gerai = 7 / (3/30) = 70.
   ABC Jul-Sep: Bear 971.250 (72%), Panda 210.000 (16%), Tiger 166.500 (12%) dari 1.347.750; Lamb 0. A 1, B 1, C 2. */
const L = { T305: 0, KIYGI: 1, MAA: 2, HO: 3, PRINCIPAL: 4, TERJUAL: 5, RUSAK: 6, ADJUST: 7, OPENING: 8, TRANSIT: 9, GMT: 10 };
const DATA = { ok: true, hariIni: '2026-10-11', bulanIni: '2026-10', tarif: 0.1, diperbarui: '11 Oct 2026 03:00',
  lok: [{ k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', r: 'TGI', toko: 1 }, { k: 'KIY-GI', n: 'KINOKUNIYA GRAND INDONESIA', r: 'KIY', toko: 1 }, { k: 'MAA-SGI', n: 'MAA SENAYAN CITY', r: 'MAA', toko: 1 },
    { k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'PRINCIPAL', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'RUSAK', toko: 0 }, { k: 'ADJUST', toko: 0 }, { k: 'OPENING', toko: 0 }, { k: 'TRANSIT', toko: 0 }, { k: 'GMT', toko: 0 }],
  prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 }, { b: '222', n: 'MOFMOFRIENDS key charm - Tiger', s: 'MF-KC-008', hs: 150000, h: 166500, r: 249900 },
    { b: '333', n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 200000, h: 210000, r: 315000 }, { b: '444', n: 'MofmoFriends S - Lamb', s: 'MF-PLU-020', hs: 175000, h: 194250, r: 298846 },
    { b: '555', n: 'MofmoFriends Cap - Melon', s: 'MF-CAP-002', hs: 0, h: 0, r: 0 }],
  baris: [
    ['2026-08-01', 0, 20, L.OPENING, L.HO], ['2026-08-01', 1, 10, L.OPENING, L.HO], ['2026-08-01', 2, 10, L.OPENING, L.HO], ['2026-08-01', 3, 5, L.OPENING, L.HO],
    ['2026-08-10', 0, 6, L.HO, L.TRANSIT], ['2026-08-10', 3, 2, L.HO, L.TRANSIT], ['2026-08-12', 0, 6, L.TRANSIT, L.T305], ['2026-08-12', 3, 2, L.TRANSIT, L.T305],
    ['2026-08-20', 0, 1, L.T305, L.TERJUAL],
    ['2026-09-02', 1, 12, L.PRINCIPAL, L.HO], ['2026-09-03', 2, 4, L.HO, L.TRANSIT], ['2026-09-05', 2, 4, L.TRANSIT, L.KIYGI],
    ['2026-09-08', 0, 2, L.HO, L.GMT], ['2026-09-09', 0, 2, L.GMT, L.TERJUAL], ['2026-09-10', 0, 2, L.T305, L.TERJUAL], ['2026-09-15', 2, 1, L.KIYGI, L.TERJUAL],
    ['2026-09-20', 1, 1, L.HO, L.TERJUAL], ['2026-09-22', 0, 1, L.T305, L.RUSAK], ['2026-09-28', 1, 3, L.ADJUST, L.HO], ['2026-09-29', 3, 1, L.HO, L.TRANSIT],
    ['2026-10-03', 0, 1, L.T305, L.TERJUAL]
  ],
  opname: [{ kode: 'HO', wajib: true, terakhir: '2026-09-20' }, { kode: 'T305', wajib: true, terakhir: '' }, { kode: 'KIY-GI', wajib: true, hari: 57 }, { kode: 'MAA-SGI', wajib: false, terakhir: '' }]
};

/* ================= A. hitungan (Node) ================= */
let LP = null;
try {
  const kotak = { window: {}, console };
  kotak.window.window = kotak.window;
  vm.createContext(kotak);
  vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/laporan.js'), 'utf8'), kotak);
  LP = kotak.window.WmsLaporan;
} catch (e) { c('A0 laporan.js termuat tanpa DOM', false, e.message); }

function bagianA() {
  if (!LP || !LP._hitung) { c('A0 WmsLaporan._hitung ada', false, 'tidak ada'); return; }
  const H = LP._hitung(DATA, { bulan: '2026-09' });
  const s = H.sales || {};
  c('A1 sales September: Rp1.153.500 dari 6 pcs (penjualan 3 Okt tidak ikut), Agustus Rp194.250; tren Apr-Sep 0,0,0,0,194.250,1.153.500',
    s.nilai === 1153500 && s.pcs === 6 && s.nilaiLalu === 194250 && (s.tren || []).map(t => t.bulan + ':' + t.nilai).join(',') === '2026-04:0,2026-05:0,2026-06:0,2026-07:0,2026-08:194250,2026-09:1153500',
    JSON.stringify({ n: s.nilai, p: s.pcs, l: s.nilaiLalu, t: s.tren }));
  const m = (s.mitra || []).map(x => x.k + ':' + x.pcs + ':' + x.nilai + ':' + x.sisa).join(',');
  c('A2 per mitra: TGI 2 pcs Rp388.500 sisa 4, KIY 1/210.000 sisa 3, MAA 0, Gamotion 2/388.500 sisa 0, penjualan langsung HO 1/166.500',
    m === 'TGI:2:388500:4,KIY:1:210000:3,MAA:0:0:0,GMT:2:388500:0,HO:1:166500:-', m);
  const v = H.movement || {};
  c('A3 arus stok: saldo awal 44 (dari buku besar sebelum 1 Sep), masuk principal 12, penyesuaian +3, terjual 6, rusak 1, saldo akhir 52; OPENING bukan masuk principal',
    v.awal === 44 && v.principal === 12 && v.pembukaan === 0 && v.adjust === 3 && v.terjual === 6 && v.rusak === 1 && v.akhir === 52, JSON.stringify(v && { a: v.awal, p: v.principal, o: v.pembukaan, j: v.adjust, t: v.terjual, r: v.rusak, z: v.akhir }));
  const lk = (v.lokasi || []).map(x => x.k + ':' + x.awal + '/' + x.masuk + '/' + x.keluar + '/' + x.akhir).join(',');
  c('A4 per lokasi: HO 37/15/8/44, TRANSIT 0/5/4/1, gerai 7/4/4/7, Gamotion 0/2/2/0', lk === 'HO:37/15/8/44,TRANSIT:0/5/4/1,GERAI:7/4/4/7,GMT:0/2/2/0', lk);
  const k = H.condition || {};
  c('A5 umur stok gerai 30 Sep pakai FIFO: 0-30 hari 3, 31-60 hari 4, 61-90 0, >90 0; stok mati 1 SKU-gerai 2 pcs; hari tutupan 70',
    (k.umur || []).join(',') === '3,4,0,0' && k.mati && k.mati.skuGerai === 1 && k.mati.pcs === 2 && k.tutupan === 70, JSON.stringify(k && { u: k.umur, m: k.mati, t: k.tutupan }));
  const o = k.opname || {};
  c('A6 opname dalam 30 hari per 30 Sep: 1 dari 3 lokasi wajib (HO); belum: T305 (belum pernah) dan KIY-GI (15 Agu, dari hari=57)',
    o.dalam === 1 && o.wajib === 3 && (o.belum || []).map(x => x.k + ':' + (x.terakhir || '-')).join(',') === 'T305:-,KIY-GI:2026-08-15', JSON.stringify(o));
  const sk = H.sku || {};
  c('A7 SKU terlaris: Bear 4 pcs Rp777.000 di 2 saluran, lalu Panda, Tiger; SKU lambat: Lamb 2 pcs di rak, 49 hari',
    (sk.top || []).map(x => x.s + ':' + x.pcs + ':' + x.nilai + ':' + x.saluran).join(',') === 'MF-PLU-005:4:777000:2,MF-PLU-010:1:210000:1,MF-KC-008:1:166500:1' &&
    (sk.lambat || []).map(x => x.s + ':' + x.sisa + ':' + x.hari).join(',') === 'MF-PLU-020:2:49', JSON.stringify({ t: sk.top, l: sk.lambat }));
  const abc = sk.abc || {};
  c('A8 ABC Jul-Sep: A 1 SKU 72%, B 1 SKU 16%, C 2 SKU 12% (SKU tanpa harga tidak dihitung)',
    ['A', 'B', 'C'].map(x => x + (abc[x] ? abc[x].n + ':' + abc[x].porsi : '-')).join(',') === 'A1:72,B1:16,C2:12', JSON.stringify(abc));
  const ch = (H.channel || []).map(x => x.k + ':' + x.porsi + ':' + (x.st == null ? '-' : Math.round(x.st * 1000) / 10)).join(',');
  c('A9 saluran: porsi TGI 34, KIY 18, MAA 0, Gamotion 34, langsung 14; sell-through TGI 28,6%, KIY 25%, MAA -, Gamotion 100%; komisi OLS Rp105.000',
    ch === 'TGI:34:28.6,KIY:18:25,MAA:0:-,GMT:34:100,HO:14:-' && H.komisi === 105000, ch + ' komisi ' + H.komisi);
  const td = (H.tindak || []).map(x => x.k).join(',');
  c('A10 tindak lanjut berbasis aturan: opname 2 lokasi, stok mati 1 SKU-gerai, 1 pcs masih di jalan', td === 'opname,mati,transit' && /2/.test((H.tindak[0] || {}).teks || ''), JSON.stringify(H.tindak));
  const B = LP._hitung(DATA, {});
  c('A11 periode bawaan = bulan sebelum hari ini (2026-09); pilihan bulan Agu sampai Okt 2026', B.bulan === '2026-09' && (B.pilihanBulan || []).join(',') === '2026-10,2026-09,2026-08', B.bulan + ' ' + JSON.stringify(B.pilihanBulan));
  const sl = LP._susunSlide ? LP._susunSlide({ gabung: true, pilih: ['sales', 'movement', 'condition', 'sku', 'channel'] }) : [];
  const sl2 = LP._susunSlide ? LP._susunSlide({ gabung: true, pilih: ['sales', 'channel'] }) : [];
  const sl3 = LP._susunSlide ? LP._susunSlide({ gabung: false, pilih: ['sales', 'channel'] }) : [];
  c('A12 susunan slide: gabung semua 12 slide (sampul, ringkasan, 10 isi, tindak lanjut); gabung sales+channel 6; pisah sales+channel = 2 berkas (3 dan 2 slide)',
    sl.length === 1 && sl[0].slide.length === 12 && sl2[0].slide.length === 6 && sl3.length === 2 && sl3[0].slide.length === 3 && sl3[1].slide.length === 2,
    JSON.stringify([sl.map(f => f.slide.length), sl2.map(f => f.slide.length), sl3.map(f => f.slide.length)]));
  /* Agustus memuat OPENING: saldo pembukaan 45 pcs, bukan masuk dari principal. Saldo awal 0, terjual 1, akhir 44. */
  const Ag = (LP._hitung(DATA, { bulan: '2026-08' }) || {}).movement || {};
  c('A13 Agustus: OPENING 45 pcs tercatat sebagai saldo pembukaan (masuk principal 0), saldo awal 0, terjual 1, saldo akhir 44',
    Ag.awal === 0 && Ag.pembukaan === 45 && Ag.principal === 0 && Ag.terjual === 1 && Ag.akhir === 44, JSON.stringify(Ag && { a: Ag.awal, o: Ag.pembukaan, p: Ag.principal, t: Ag.terjual, z: Ag.akhir }));
  /* FIFO lawan LIFO: T305 Bear punya lot 1 Jul (3 pcs, OPENING) dan lot 20 Sep (3 pcs); laku 3 pada 25 Sep.
     FIFO menghabiskan lot Juli, sisa 3 pcs berumur 10 hari. LIFO menyisakan lot Juli (91 hari). */
  const D2 = { hariIni: '2026-10-11', tarif: 0.1, lok: DATA.lok, prod: DATA.prod, opname: [], baris: [
    ['2026-07-01', 0, 3, L.OPENING, L.T305], ['2026-09-18', 0, 3, L.HO, L.TRANSIT], ['2026-09-20', 0, 3, L.TRANSIT, L.T305], ['2026-09-25', 0, 3, L.T305, L.TERJUAL]] };
  const F = ((LP._hitung(D2, { bulan: '2026-09' }) || {}).condition || {}).umur || [];
  c('A14 umur stok memakai FIFO: setelah laku 3 pcs, sisa 3 pcs dari lot 20 Sep (0-30 hari), bukan lot 1 Jul (> 90 hari)', F.join(',') === '3,0,0,0', F.join(','));
}
bagianA();

/* ================= B. layar dan berkas (Playwright + python-pptx) ================= */
const PY = `
import sys, json, zipfile, io
from pptx import Presentation
def baca(f):
    pr = Presentation(f); out = []
    for s in pr.slides:
        teks = []; grafik = []
        for sh in s.shapes:
            if sh.has_text_frame: teks.append(sh.text_frame.text)
            if getattr(sh, 'has_table', False) and sh.has_table:
                for r in sh.table.rows: teks.append(' | '.join(c.text for c in r.cells))
            if getattr(sh, 'has_chart', False) and sh.has_chart:
                ch = sh.chart
                grafik.append({'kat': [str(x) for x in ch.plots[0].categories], 'nilai': [list(sr.values) for sr in ch.plots[0].series]})
        out.append({'teks': '\\n'.join(teks), 'grafik': grafik})
    return {'w': pr.slide_width, 'h': pr.slide_height, 'slide': out}
f = sys.argv[1]
if f.endswith('.zip'):
    z = zipfile.ZipFile(f); print(json.dumps({'zip': [{'nama': n, 'isi': baca(io.BytesIO(z.read(n)))} for n in sorted(z.namelist())]}))
else: print(json.dumps(baca(f)))
`;
const py = f => { try { return JSON.parse(execFileSync('python3', ['-c', PY, f], { encoding: 'utf8', timeout: 60000 })); } catch (e) { return { galat: String(e.stderr || e.message).slice(-300) }; } };

async function bagianB() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { c('B0 playwright tersedia', false, e.message); return; }
  const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
  const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
  const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
  const srv = http.createServer((q, s) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(AKAR, p);
    if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
    s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
  });
  const PAPAN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title><style>#layarIsi{display:none}</style></head><body>' +
    '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
    '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div><h1>Papan Data</h1></div><div id="kopKanan"></div></div></header><nav id="panel"></nav><div id="isi"></div></div>' +
    '<script>var HAL="ringkasan";function gambar(){document.getElementById("isi").textContent=HAL;}function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";gambar();window.__siap=1;}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
  await new Promise(r => srv.listen(8775, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [];
  const pasang = async ctx => {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar dimuat: ' + r.request().url()); r.abort(); });
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      const h = m.fn === 'panggil' && m.nama === 'dataPapan' ? { pintu: 'ok', hasil: DATA } : { pintu: 'galat', pesan: 'Fungsi "' + (m.nama || m.fn) + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA, 'klien|papan': { ok: true, versi: 'laporan', html: PAPAN }, 'klien|versi': { ok: true, versi: 'laporan' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const masuk = async (p, bhs) => {
    p.on('pageerror', e => galat.push(e.message));
    await p.goto('http://localhost:8775/wms/');
    await p.evaluate(x => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', x); localStorage.setItem('wms_maskot', 'off'); localStorage.removeItem('wms_laporan_atur'); }, bhs);
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) { const f = p.frames().find(x => x !== p.mainFrame()); try { if (f && await f.evaluate(() => !!document.querySelector('[data-wms=laporan]'))) return f; } catch (e) {} await jeda(100); }
    return null;
  };
  const unduh = async (p, nama) => {
    const [u] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }).catch(() => null), p.click('#laporan [data-laporan=unduh]').catch(() => {})]);
    if (!u) return { u: null, f: '' };
    const t = path.join(SEMENTARA, nama); fs.copyFileSync(await u.path(), t); return { u, f: t };
  };
  const semua = x => (x.slide || []).map(s => s.teks).join('\n');
  try {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    await pasang(ctx);
    const p = await ctx.newPage();
    const fr = await masuk(p, 'id');
    let t1 = {};
    if (fr) {
      await fr.evaluate(() => document.querySelector('[data-wms=laporan]').click());
      await p.waitForFunction(() => document.querySelectorAll('#laporan [data-laporan-pilih]').length === 5 && /12/.test((document.querySelector('#laporan [data-laporan=jumlah]') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
      t1 = await p.evaluate(() => ({ kartu: document.querySelectorAll('#laporan [data-laporan-pilih][aria-pressed=true]').length, jumlah: (document.querySelector('#laporan [data-laporan=jumlah]') || {}).textContent, tombol: (document.querySelector('#laporan [data-laporan=unduh]') || {}).textContent, bulan: (document.querySelector('#laporan #lpBulan') || {}).value }));
    }
    c('B1 tombol Laporan di kepala papan membuka panel: 5 laporan tercentang, periode bawaan 2026-09, 12 slide, tombol "Unduh 1 PPT"',
      !!fr && t1.kartu === 5 && t1.bulan === '2026-09' && /12 slide/.test(t1.jumlah || '') && /Unduh 1 PPT/.test(t1.tombol || ''), JSON.stringify(t1));

    const g = await unduh(p, 'gabung.pptx');
    const x = g.f ? py(g.f) : {};
    const ts = semua(x), sl = x.slide || [];
    const tren = (sl[2] && sl[2].grafik[0]) || {};
    c('B2 Unduh: satu .pptx 16:9 berisi 12 slide; ringkasan menulis Rp1.153.500 dan komisi Rp105.000; grafik tren slide 3 bernilai 0,0,0,0,194.250,1.153.500 (bisa diedit di PowerPoint)',
      g.u && /^laporan-bulanan-2026-09\.pptx$/.test(g.u.suggestedFilename()) && sl.length === 12 && x.w && Math.abs(x.w / x.h - 16 / 9) < 0.01 &&
      /Rp1\.153\.500/.test(sl[1] ? sl[1].teks : '') && /Komisi/.test(sl[1] ? sl[1].teks : '') && /Rp105\.000/.test(sl[1] ? sl[1].teks : '') &&
      JSON.stringify((tren.nilai || [])[0]) === JSON.stringify([0, 0, 0, 0, 194250, 1153500]),
      JSON.stringify([g.u && g.u.suggestedFilename(), sl.length, x.w, x.h, (sl[1] || {}).teks, tren, x.galat]).slice(0, 600));
    c('B3 isi berkas mengikuti hitungan: arus 44 lalu 52, per lokasi HO 37/44, umur 3 dan 4, stok mati 2 pcs, Bear Rp777.000, sell-through TGI 28,6%, margin mitra 35%',
      /44/.test((sl[4] || {}).teks || '') && /52/.test((sl[4] || {}).teks || '') && /Gudang HO \| 37 \| \+15 \| -8 \| 44/.test((sl[5] || {}).teks || '') &&
      /Rp777\.000/.test((sl[8] || {}).teks || '') && /28,6%/.test((sl[10] || {}).teks || '') && /35%/.test((sl[10] || {}).teks || '') && /2 pcs/.test((sl[6] || {}).teks || ''),
      sl.slice(4, 11).map(s => s.teks.replace(/\n/g, ' / ').slice(0, 160)).join(' || '));

    await p.click('#laporan [data-laporan-untuk=principal]'); await jeda(150);
    const pr = await unduh(p, 'principal.pptx');
    const y = pr.f ? py(pr.f) : {}, ty = semua(y);
    c('B4 versi principal: tanpa kata Komisi dan tanpa kolom margin mitra, sampul menyebut E&E, angka penjualan tetap sama',
      (y.slide || []).length === 12 && !/komisi|commission|margin/i.test(ty) && /E&E/.test(((y.slide || [])[0] || {}).teks || '') && /Rp1\.153\.500/.test(ty),
      ty.slice(0, 400) + (y.galat || ''));
    await p.click('#laporan [data-laporan-untuk=internal]'); await jeda(150);

    await p.click('#laporan [data-laporan=gabung]'); await jeda(150);
    const t2 = await p.evaluate(() => ({ jumlah: (document.querySelector('#laporan [data-laporan=jumlah]') || {}).textContent, tombol: (document.querySelector('#laporan [data-laporan=unduh]') || {}).textContent }));
    const z = await unduh(p, 'pisah.zip');
    const zz = z.f ? py(z.f) : {};
    const nm = (zz.zip || []).map(e => e.nama + ':' + e.isi.slide.length).join(',');
    c('B5 gabung dimatikan: tombol "Unduh 5 PPT" jadi SATU unduhan .zip berisi 5 berkas PPT (sales 3, movement 3, condition 3, SKU 3, channel 2 slide, masing-masing bersampul)',
      /Unduh 5 PPT/.test(t2.tombol || '') && z.u && /\.zip$/.test(z.u.suggestedFilename()) &&
      nm === 'channel-performance-2026-09.pptx:2,inventory-condition-2026-09.pptx:3,inventory-movement-2026-09.pptx:3,sales-bulanan-2026-09.pptx:3,sku-performance-2026-09.pptx:3',
      JSON.stringify([t2, z.u && z.u.suggestedFilename(), nm, zz.galat]));
    await p.click('#laporan [data-laporan=gabung]'); await jeda(150);

    for (const k of ['movement', 'condition', 'sku']) { await p.click('#laporan [data-laporan-pilih=' + k + ']'); await jeda(80); }
    const t3 = await p.evaluate(() => ({ jumlah: (document.querySelector('#laporan [data-laporan=jumlah]') || {}).textContent, pratinjau: document.querySelectorAll('#laporan [data-laporan-pratinjau]').length }));
    const s2 = await unduh(p, 'dua.pptx');
    const w2 = s2.f ? py(s2.f) : {};
    c('B6 cuma Sales dan Channel dicentang: pratinjau dan berkas 6 slide (sampul, ringkasan, 2 sales, 1 channel, tindak lanjut)',
      /6 slide/.test(t3.jumlah || '') && t3.pratinjau === 6 && (w2.slide || []).length === 6, JSON.stringify([t3, (w2.slide || []).length]));
    c('B7 tidak ada tanda pisah panjang di panel maupun di isi PPT', !/—/.test(ts + ty) && !(await p.evaluate(() => /—/.test(document.getElementById('laporan').innerText))), '');
    await ctx.close();

    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasang(ctx2);
    const hp = await ctx2.newPage();
    const fr2 = await masuk(hp, 'id');
    let lebar = 9999;
    if (fr2) {
      await fr2.evaluate(() => document.querySelector('[data-wms=laporan]').click());
      await hp.waitForFunction(() => document.querySelectorAll('#laporan [data-laporan-pilih]').length === 5, null, { timeout: 8000 }).catch(() => {});
      await jeda(200);
      lebar = await hp.evaluate(() => Math.max(document.documentElement.scrollWidth, document.getElementById('laporan').scrollWidth));
    }
    c('B8 HP 390 px: panel Laporan tanpa geser samping', lebar <= 392, String(lebar));
    await ctx2.close();
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('B9 tidak ada galat JavaScript dan tidak ada pustaka dari CDN (PptxGenJS disimpan di situs sendiri)', galat.length === 0, galat.join(' | ').slice(0, 400));
  await b.close(); srv.close();
}

bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 600))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
