/* Uji Laporan per mitra WMS (wms/laporan.js, tab "Per mitra"), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS" (angka di bawah).
 *
 * KENAPA UJI INI ADA. Ferdy minta rapor tiap mitra retail dalam PowerPoint
 * (antrean S1/S2): penjualan per gerai, stok di rak, SKU laku dan diam,
 * kepatuhan, tagihan, tindak lanjut. Versi untuk mitra dikirim KE mitra itu.
 * Cacat paling mahal dan paling diam:
 *  - berkas untuk Toys Kingdom memuat gerai atau angka Kinokuniya (data
 *    mitra lain bocor ke mitra);
 *  - versi mitra masih membawa komisi OLS atau skor rapor internal;
 *  - versi mitra bisa digabung jadi satu berkas berisi semua mitra;
 *  - sell-through dihitung dari stok hari ini, bukan stok akhir bulan;
 *  - umur stok memakai lot terbaru (LIFO);
 *  - penjualan bulan berikutnya ikut terhitung.
 * Semua angka harapan dihitung tangan dari baris di bawah.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http'), { execFileSync } = require('child_process');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 21;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const SEMENTARA = fs.mkdtempSync('/tmp/uji-laporan-mitra-');

/* ---------- buku besar, disusun di sini ----------
   Hari ini 11 Okt 2026, bulan laporan September 2026 (bulan tutup).
   Bear hs 175.000 h 194.250 | Tiger hs 150.000 h 166.500 | Panda hs 200.000 h 222.000 | Lamb hs 175.000 h 194.250.
   1 Jul OPENING ke HO: Bear 30, Tiger 20, Panda 10, Lamb 10.
   12 Jul tiba T305 (TK Alam Sutera): Bear 5, Tiger 2, Lamb 3.  16 Agu tiba T390 (TK Kota Wisata): Bear 4, Panda 3.
   20 Agu T305 laku Bear 1 (Agustus).
   September: T305 laku Bear 2 (5 Sep), Tiger 1 (12 Sep), Bear 1 (20 Sep); 26 Sep tiba T305 Bear 3.
     T390 laku Panda 1 (10 Sep). 2 Sep tiba KIY-GI Panda 2, 15 Sep KIY-GI laku Panda 1.
   3 Okt T305 laku Bear 1: di luar September.
   TGI September: T305 4 pcs Rp749.250 (3x194.250 + 166.500), sisa 30 Sep: Bear 4, Tiger 1, Lamb 3 = 8, ST 4/12 = 33,3%.
                  T390 1 pcs Rp222.000, sisa Bear 4 + Panda 2 = 6, ST 1/7 = 14,3%.
                  Total 5 pcs Rp971.250, sisa 14, ST 5/19 = 26,3%. Agustus 1 pcs Rp194.250.
   Umur FIFO 30 Sep: T305 Bear lot 12 Jul tinggal 1 (80 hari), lot 26 Sep 3 (4 hari), Tiger 1 dan Lamb 3 (80 hari): [3,0,5,0].
                     T390 lot 16 Agu (45 hari): Bear 4, Panda 2: [0,6,0,0].
   Diam (di rak, tidak laku September): T305 Lamb 3 pcs 80 hari; T390 Bear 4 pcs 45 hari. Dua-duanya stok mati.
   Hari tutupan = 14 / (5/30) = 84. Komisi = 10% x (3x175.000 + 150.000 + 200.000) = 87.500.
   Invoice September: T305 4 pcs, T390 2 pcs = 6 lawan catatan 5: tidak cocok.
   Piutang TGI Agustus Rp194.250, lewat tempo.
   Skor September: 100 - 30 piutang lewat - 10 (ST < 35%) - 20 (2 stok mati) - 20 (invoice selisih) = 20, nilai C.
   Skor Agustus: ST 1/17 < 20% -20, stok mati 30 Agu (T305 Tiger dan Lamb) -20, penjualan tanpa invoice -20 = 40, C.
   Tindak lanjut: rotasi T390 Bear ke T305; isi ulang Tiger di T305 (sisa 1 <= laku 1, HO masih 18);
     opname T390 (belum pernah); invoice 6 lawan 5; tagih piutang (internal saja). */
const L = { T305: 0, T390: 1, KIYGI: 2, HO: 3, PRINCIPAL: 4, TERJUAL: 5, OPENING: 6, TRANSIT: 7 };
const DATA = { ok: true, hariIni: '2026-10-11', bulanIni: '2026-10', tarif: 0.1, diperbarui: '11 Oct 2026 03:00',
  lok: [{ k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', r: 'TGI', toko: 1 }, { k: 'T390', n: 'TOYS KINGDOM LIVING WORLD KOTA WISATA CIBUBUR', r: 'TGI', toko: 1 },
    { k: 'KIY-GI', n: 'KINOKUNIYA GRAND INDONESIA', r: 'KIY', toko: 1 },
    { k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'PRINCIPAL', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }, { k: 'TRANSIT', toko: 0 }],
  prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 }, { b: '222', n: 'MOFMOFRIENDS key charm - Tiger', s: 'MF-KC-008', hs: 150000, h: 166500, r: 249900 },
    { b: '333', n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 200000, h: 222000, r: 341538 }, { b: '444', n: 'MofmoFriends S - Lamb', s: 'MF-PLU-020', hs: 175000, h: 194250, r: 298846 }],
  baris: [
    ['2026-07-01', 0, 30, L.OPENING, L.HO], ['2026-07-01', 1, 20, L.OPENING, L.HO], ['2026-07-01', 2, 10, L.OPENING, L.HO], ['2026-07-01', 3, 10, L.OPENING, L.HO],
    ['2026-07-10', 0, 5, L.HO, L.TRANSIT], ['2026-07-10', 1, 2, L.HO, L.TRANSIT], ['2026-07-10', 3, 3, L.HO, L.TRANSIT],
    ['2026-07-12', 0, 5, L.TRANSIT, L.T305], ['2026-07-12', 1, 2, L.TRANSIT, L.T305], ['2026-07-12', 3, 3, L.TRANSIT, L.T305],
    ['2026-08-15', 0, 4, L.HO, L.TRANSIT], ['2026-08-15', 2, 3, L.HO, L.TRANSIT], ['2026-08-16', 0, 4, L.TRANSIT, L.T390], ['2026-08-16', 2, 3, L.TRANSIT, L.T390],
    ['2026-08-20', 0, 1, L.T305, L.TERJUAL],
    ['2026-09-01', 2, 2, L.HO, L.TRANSIT], ['2026-09-02', 2, 2, L.TRANSIT, L.KIYGI],
    ['2026-09-05', 0, 2, L.T305, L.TERJUAL], ['2026-09-10', 2, 1, L.T390, L.TERJUAL], ['2026-09-12', 1, 1, L.T305, L.TERJUAL], ['2026-09-15', 2, 1, L.KIYGI, L.TERJUAL],
    ['2026-09-20', 0, 1, L.T305, L.TERJUAL], ['2026-09-25', 0, 3, L.HO, L.TRANSIT], ['2026-09-26', 0, 3, L.TRANSIT, L.T305],
    ['2026-10-03', 0, 1, L.T305, L.TERJUAL]
  ],
  invoiceMitra: [{ bulan: '2026-09', unit: 7, nilai: 1100000, gerai: { T305: { unit: 4, nilai: 700000 }, T390: { unit: 2, nilai: 200000 }, 'KIY-GI': { unit: 1, nilai: 200000 } } }],
  mitraDiam: { ok: true, mitra: [{ kode: 'TGI', telat: false, terakhir: '2026-10-04', hariDiam: 7 }, { kode: 'KIY', telat: false, terakhir: '2026-10-04', hariDiam: 7 }] },
  opname: [{ kode: 'T305', wajib: true, terakhir: '2026-09-20' }, { kode: 'T390', wajib: true, terakhir: '' }, { kode: 'KIY-GI', wajib: true, terakhir: '2026-09-25' }]
};
const TG = { ok: true, baris: [{ retailer: 'TGI', bulan: '2026-08', nilai: 194250, sisa: 194250, lunas: false, telat: true, jatuhTempo: '2026-09-30' }] };

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
  if (!LP || !LP._hitungMitra) { c('A0 WmsLaporan._hitungMitra ada', false, 'tidak ada'); return; }
  const H = LP._hitungMitra(DATA, { bulan: '2026-09', r: 'TGI', tg: TG });
  const g = (H.gerai || []).map(x => x.k + ':' + x.n + ':' + x.pcs + ':' + x.nilai + ':' + x.sisa + ':' + Math.round(x.st * 1000) + ':' + x.hariJual + ':' + x.terakhirJual).join(',');
  c('A1 per gerai TGI September: T305 4 pcs Rp749.250 sisa 8 ST 33,3%, 3 hari jual, terakhir 20 Sep; T390 1 pcs Rp222.000 sisa 6 ST 14,3% (penjualan 3 Okt tidak ikut, KIY tidak ikut)',
    g === 'T305:TK Alam Sutera:4:749250:8:333:3:2026-09-20,T390:TK Kota Wisata Cibubur:1:222000:6:143:1:2026-09-10', g);
  const t = H.total || {};
  c('A2 total TGI 5 pcs Rp971.250, sisa 14, ST 26,3%; Agustus 1 pcs Rp194.250; komisi Rp87.500; hari tutupan 84',
    t.pcs === 5 && t.nilai === 971250 && t.sisa === 14 && Math.round(t.st * 1000) === 263 && H.lalu && H.lalu.pcs === 1 && H.lalu.nilai === 194250 && H.komisi === 87500 && H.tutupan === 84,
    JSON.stringify({ t, l: H.lalu, k: H.komisi, tp: H.tutupan }));
  const u = (H.gerai || []).map(x => (x.umur || []).join('/')).join(',');
  c('A3 umur stok per gerai memakai FIFO: T305 3/0/5/0, T390 0/6/0/0', u === '3/0/5/0,0/6/0/0', u);
  const d = (H.diam || []).map(x => x.s + '@' + x.k + ':' + x.pcs + ':' + x.hari).join(',');
  c('A4 SKU diam: Lamb di T305 3 pcs 80 hari, lalu Bear di T390 4 pcs 45 hari; stok mati 2 SKU-gerai 7 pcs',
    d === 'MF-PLU-020@T305:3:80,MF-PLU-005@T390:4:45' && H.mati && H.mati.n === 2 && H.mati.pcs === 7, d + ' ' + JSON.stringify(H.mati));
  const lr = (H.laris || []).map(x => x.s + ':' + x.pcs + ':' + (x.per || []).map(p => p.k + '=' + p.pcs).join('+')).join(',');
  c('A5 SKU terlaris TGI: Bear 3 (T305), Panda 1 (T390, nilai lebih besar), Tiger 1 (T305)', lr === 'MF-PLU-005:3:T305=3,MF-PLU-010:1:T390=1,MF-KC-008:1:T305=1', lr);
  const iv = H.invoice || {};
  c('A6 invoice September 6 pcs lawan catatan 5: tidak cocok, selisih di T390 (2 lawan 1); piutang Rp194.250 lewat tempo',
    iv.ada && iv.unit === 6 && iv.cocok === false && (iv.selisih || []).map(x => x.k + ':' + x.inv + '/' + x.buku).join(',') === 'T390:2/1' &&
    H.piutang && H.piutang.belum === 194250 && H.piutang.lewat === 194250, JSON.stringify({ iv, p: H.piutang }));
  const op = (H.gerai || []).map(x => x.k + ':' + (x.opname || '-')).join(',');
  c('A7 opname per gerai: T305 20 Sep, T390 belum pernah', op === 'T305:2026-09-20,T390:-', op);
  const R = H.rapor || {};
  c('A8 skor rapor September 20 (C), Agustus 40 (C), aturannya sama dengan Kontrol', R.skor === 20 && R.nilai === 'C' && R.skorLalu === 40 && R.nilaiLalu === 'C', JSON.stringify(R));
  const td = (H.tindak || []).map(x => x.k).join(',');
  const tdM = (LP._hitungMitra(DATA, { bulan: '2026-09', r: 'TGI', tg: TG, untuk: 'mitra' }).tindak || []).map(x => x.k).join(',');
  const teks = (H.tindak || []).map(x => x.teks).join(' | ');
  c('A9 tindak lanjut berbasis aturan: rotasi Bear dari TK Kota Wisata ke TK Alam Sutera, isi ulang Tiger, opname TK Kota Wisata, invoice, piutang; versi mitra tanpa piutang',
    td === 'rotasi,isiUlang,opname,invoice,piutang' && tdM === 'rotasi,isiUlang,opname,invoice' && (H.tindak[0] || {}).teks === 'Move S Bear from TK Kota Wisata Cibubur to TK Alam Sutera.' && /Tiger/.test(teks), td + ' / ' + tdM + ' / ' + teks);
  const K = LP._hitungMitra(DATA, { bulan: '2026-09', r: 'KIY', tg: TG });
  c('A10 Kinokuniya terpisah: 1 gerai, 1 pcs Rp222.000, sisa 1, ST 50%, tanpa piutang TGI',
    (K.gerai || []).length === 1 && K.total.pcs === 1 && K.total.nilai === 222000 && K.total.sisa === 1 && Math.round(K.total.st * 100) === 50 && K.piutang && K.piutang.belum === 0, JSON.stringify(K.total) + JSON.stringify(K.piutang));
  /* FIFO lawan LIFO dan batas 30 hari stok mati: T305 Bear lot 1 Jul (3) dan lot 20 Sep (3), laku 3 pada 25 Sep;
     Lamb tiba 28 Sep, belum laku. FIFO: sisa Bear dari lot 20 Sep (10 hari) + Lamb 2 hari = 0-30 hari 5 pcs.
     LIFO menyisakan lot 1 Jul (91 hari). Lamb baru 2 hari, jadi BUKAN stok mati. */
  const D2 = { hariIni: '2026-10-11', tarif: 0.1, lok: DATA.lok, prod: DATA.prod, opname: [], baris: [
    ['2026-07-01', 0, 3, L.OPENING, L.T305], ['2026-09-18', 0, 3, L.HO, L.TRANSIT], ['2026-09-20', 0, 3, L.TRANSIT, L.T305], ['2026-09-25', 0, 3, L.T305, L.TERJUAL], ['2026-09-28', 3, 2, L.TRANSIT, L.T305]] };
  const H2 = LP._hitungMitra(D2, { bulan: '2026-09', r: 'TGI' });
  const u2 = ((H2.gerai || [])[0] || {}).umur || [];
  c('A12 umur FIFO (sisa lot 20 Sep, bukan 1 Jul): T305 5/0/0/0; Lamb yang baru tiba 2 hari bukan stok mati', u2.join('/') === '5/0/0/0' && H2.mati && H2.mati.n === 0, u2.join('/') + ' ' + JSON.stringify(H2.mati));
  const S = LP._susunMitra || (() => []);
  const BAG = ['ringkas', 'gerai', 'sku', 'stok', 'patuh', 'tindak'];
  const s1 = S({ mitra: ['TGI', 'KIY'], bagian: BAG, gabung: false, untuk: 'internal', bulan: '2026-09' });
  const s2 = S({ mitra: ['TGI', 'KIY'], bagian: BAG, gabung: true, untuk: 'internal', bulan: '2026-09' });
  const s3 = S({ mitra: ['TGI', 'KIY'], bagian: BAG, gabung: true, untuk: 'mitra', bulan: '2026-09' });
  const s4 = S({ mitra: ['TGI'], bagian: ['ringkas', 'tindak'], gabung: false, untuk: 'internal', bulan: '2026-09' });
  const f = x => x.map(b => b.berkas + ':' + b.slide.length).join(',');
  c('A11 susunan berkas: pisah = satu PPT per mitra (7 slide); gabung internal = 1 PPT 14 slide (sampul, perbandingan, 6 x 2); versi mitra TIDAK bisa digabung; 2 bagian = 3 slide',
    f(s1) === 'rapor-toys-kingdom-2026-09.pptx:7,rapor-kinokuniya-2026-09.pptx:7' && f(s2) === 'rapor-mitra-2026-09.pptx:14' && f(s3) === f(s1) && f(s4) === 'rapor-toys-kingdom-2026-09.pptx:3',
    [f(s1), f(s2), f(s3), f(s4)].join(' || '));
}
try { bagianA(); } catch (e) { c('A MATI', false, e.stack); }

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
    '<script>var HAL="ringkasan";function gambar(){document.getElementById("isi").textContent=HAL;}function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";gambar();window.__siap=1;}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
  await new Promise(r => srv.listen(8781, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [];
  const pasang = async ctx => {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar dimuat: ' + r.request().url()); r.abort(); });
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'panggil' && m.nama === 'dataPapan') h = { pintu: 'ok', hasil: DATA };
      else if (m.fn === 'panggil' && m.nama === 'permintaanDanPiutang') h = { pintu: 'ok', hasil: { ok: true, tagihan: TG } };
      else if (m.fn === 'panggil' && m.nama === 'wmsArsipDaftar') h = { pintu: 'ok', hasil: { ok: true, oto: true, arsip: [] } };
      else h = { pintu: 'galat', pesan: 'Fungsi "' + (m.nama || m.fn) + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA, 'klien|papan': { ok: true, versi: 'mitra', html: PAPAN }, 'klien|versi': { ok: true, versi: 'mitra' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const masuk = async (p, bhs) => {
    p.on('pageerror', e => galat.push(e.message));
    await p.goto('http://localhost:8781/wms/');
    await p.evaluate(x => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', x); localStorage.setItem('wms_maskot', 'off'); localStorage.removeItem('wms_laporan_atur'); localStorage.removeItem('wms_laporan_mitra'); }, bhs);
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
      await p.waitForSelector('#laporan [data-laporan-tab=mitra]', { timeout: 8000 }).catch(() => {});
      await p.click('#laporan [data-laporan-tab=mitra]').catch(() => {});
      await p.waitForFunction(() => document.querySelectorAll('#laporan [data-mitra-pilih]').length >= 2, null, { timeout: 8000 }).catch(() => {});
      await jeda(300);
      t1 = await p.evaluate(() => ({ mitra: [...document.querySelectorAll('#laporan [data-mitra-pilih]')].map(x => x.getAttribute('data-mitra-pilih') + (x.getAttribute('aria-pressed') === 'true' ? '+' : '-')).join(','),
        bagian: document.querySelectorAll('#laporan [data-mitra-bagian][aria-pressed=true]').length, jumlah: (document.querySelector('#laporan [data-laporan=jumlah]') || {}).textContent,
        sekilas: (document.querySelector('#laporan .lpm-sekilas') || {}).innerText || '', tombol: (document.querySelector('#laporan [data-laporan=unduh]') || {}).textContent }));
    }
    c('B1 tab Per mitra: TGI dan KIY tercentang, 6 bagian, 2 berkas x 7 slide, sekilas menulis TGI Rp971.250 dan ST 26,3%',
      !!fr && t1.mitra === 'TGI+,KIY+' && t1.bagian === 6 && /2 berkas/.test(t1.jumlah || '') && /Rp971\.250/.test(t1.sekilas) && /26,3%/.test(t1.sekilas) && /Unduh 2 PPT/.test(t1.tombol || ''), JSON.stringify(t1));

    const z = await unduh(p, 'mitra-internal.zip');
    const zz = z.f ? py(z.f) : {};
    const tk = ((zz.zip || []).find(e => /toys-kingdom/.test(e.nama)) || {}).isi || {};
    const kiy = ((zz.zip || []).find(e => /kinokuniya/.test(e.nama)) || {}).isi || {};
    const tTk = semua(tk), tKiy = semua(kiy);
    c('B2 versi internal: satu .zip berisi rapor Toys Kingdom dan Kinokuniya, masing-masing 7 slide 16:9; TGI memuat Rp971.250, kedua gerai, skor 20 nilai C, komisi Rp87.500',
      z.u && /\.zip$/.test(z.u.suggestedFilename()) && (tk.slide || []).length === 7 && (kiy.slide || []).length === 7 && Math.abs(tk.w / tk.h - 16 / 9) < 0.01 &&
      /Rp971\.250/.test(tTk) && /TK Alam Sutera/.test(tTk) && /TK Kota Wisata Cibubur/.test(tTk) && /\b20\b/.test(tTk) && /Rp87\.500/.test(tTk),
      JSON.stringify([z.u && z.u.suggestedFilename(), (zz.zip || []).map(e => e.nama), zz.galat, tTk.slice(0, 500)]));
    c('B3 rapor Toys Kingdom tidak memuat gerai atau angka mitra lain, dan rapor Kinokuniya tidak memuat gerai Toys Kingdom',
      tTk && tKiy && !/Kinokuniya|KIY-GI/i.test(tTk) && !/TK Alam|TK Kota|Toys Kingdom/i.test(tKiy), tKiy.slice(0, 300));
    c('B4 isi per gerai dan stok sesuai hitungan: tabel per gerai T305 4 | Rp749.250, SKU diam Lamb 80 hari, tindak lanjut menyebut rotasi dan opname',
      /TK Alam Sutera \| 4 \| Rp749\.250/.test(tTk) && /Lamb/.test(tTk) && /80/.test(tTk) && /opname/i.test(tTk), tTk.slice(0, 1200));

    await p.click('#laporan [data-mitra-untuk=mitra]'); await jeda(200);
    const t2 = await p.evaluate(() => ({ gabungMati: !!(document.querySelector('#laporan [data-mitra=gabung]') || {}).disabled, jumlah: (document.querySelector('#laporan [data-laporan=jumlah]') || {}).textContent }));
    const zm = await unduh(p, 'mitra-luar.zip');
    const zmm = zm.f ? py(zm.f) : {};
    const tkm = semua((((zmm.zip || []).find(e => /toys-kingdom/.test(e.nama)) || {}).isi) || {});
    c('B5 versi untuk mitra: saklar gabung terkunci, tetap 2 berkas; tanpa komisi, tanpa skor rapor, tanpa piutang lewat tempo; angka penjualan sama',
      t2.gabungMati && /2 berkas/.test(t2.jumlah || '') && tkm && !/komisi|commission|skor|score|nilai rapor|piutang/i.test(tkm) && /Rp971\.250/.test(tkm) && /Toys Kingdom/.test(tkm),
      JSON.stringify(t2) + tkm.slice(0, 500) + (zmm.galat || ''));
    await p.click('#laporan [data-mitra-untuk=internal]'); await jeda(150);
    await p.click('#laporan [data-mitra=gabung]'); await jeda(150);
    const gb = await unduh(p, 'gabung.pptx');
    const gg = gb.f ? py(gb.f) : {};
    c('B6 gabung (internal): satu .pptx 14 slide, slide 2 membandingkan Toys Kingdom dan Kinokuniya berdampingan',
      gb.u && /^rapor-mitra-2026-09\.pptx$/.test(gb.u.suggestedFilename()) && (gg.slide || []).length === 14 && /Toys Kingdom/.test(((gg.slide || [])[1] || {}).teks || '') && /Kinokuniya/.test(((gg.slide || [])[1] || {}).teks || ''),
      JSON.stringify([gb.u && gb.u.suggestedFilename(), (gg.slide || []).length, ((gg.slide || [])[1] || {}).teks, gg.galat]));
    c('B7 tidak ada tanda pisah panjang di panel maupun di PPT', !/—/.test(tTk + tKiy + tkm) && !(await p.evaluate(() => /—/.test(document.getElementById('laporan').innerText))), '');
    await ctx.close();

    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasang(ctx2);
    const hp = await ctx2.newPage();
    const fr2 = await masuk(hp, 'id');
    let lebar = 9999;
    if (fr2) {
      await fr2.evaluate(() => document.querySelector('[data-wms=laporan]').click());
      await hp.waitForSelector('#laporan [data-laporan-tab=mitra]', { timeout: 8000 }).catch(() => {});
      await hp.click('#laporan [data-laporan-tab=mitra]').catch(() => {});
      await hp.waitForFunction(() => document.querySelectorAll('#laporan [data-mitra-pilih]').length >= 2, null, { timeout: 8000 }).catch(() => {});
      await jeda(200);
      lebar = await hp.evaluate(() => Math.max(document.documentElement.scrollWidth, document.getElementById('laporan').scrollWidth));
    }
    c('B8 HP 390 px: tab Per mitra tanpa geser samping', lebar <= 392, String(lebar));
    await ctx2.close();
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('B9 tidak ada galat JavaScript dan tidak ada pustaka dari CDN', galat.length === 0, galat.join(' | ').slice(0, 400));
  await b.close(); srv.close();
}

bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
