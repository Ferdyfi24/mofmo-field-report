/* Uji Jadwal Operational PIC di WMS (wms/jadwal.js), 12 Okt 2026.
 * Harapan: "N pemeriksaan, SEMUA LULUS" (N = DIHARAPKAN).
 *
 * KENAPA UJI INI ADA. Ferdy: "pake template ini nanti untuk bulan
 * selanjutnya, tpi sistem yg generate", tanggalnya dia susun sendiri, lalu
 * PDF per mitra, draf email (MAA satu ke HO), dan gambar untuk staf (dikirim
 * manual lewat WA). Yang paling mahal kalau salah:
 *  - PDF satu mitra memuat gerai mitra lain (ritme kunjungan bocor ke
 *    pesaing);
 *  - pemeriksaan diam saat ada kunjungan Sabtu/Minggu, gerai bolong sepekan,
 *    atau gerai dua kali sepekan (check-in kedua di pekan yang sama ditolak);
 *  - PDF tidak muat satu halaman di bulan yang kalendernya enam baris;
 *  - tombol Terbitkan langsung menulis tanpa konfirmasi, atau mengirim
 *    susunan yang berbeda dengan yang terlihat di layar;
 *  - jsPDF dimuat dari CDN (WMS tidak memuat pustaka luar).
 * Bagian A menjalankan hitungan dan PDF di Node (jsPDF yang sama, lalu
 * pdftotext). Bagian B membuka WMS dengan papan dan server palsu.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http'), { execFileSync } = require('child_process');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 25;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const SEMENTARA = fs.mkdtempSync('/tmp/uji-jadwal-');

/* ---------- fixture, disusun di sini ---------- */
const GERAI = [
  { kode: 'T305', nama: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', retailer: 'TGI', hari: 'Selasa' }, { kode: 'T311', nama: 'TOYS KINGDOM MARGO CITY DEPOK', retailer: 'TGI', hari: 'Kamis' },
  { kode: 'T317', nama: 'TOYS KINGDOM MALL ARTHA GADING', retailer: 'TGI', hari: 'Jumat' }, { kode: 'T390', nama: 'TOYS KINGDOM LIVING WORLD KOTA WISATA CIBUBUR', retailer: 'TGI', hari: 'Kamis' },
  { kode: 'KIY-GI', nama: 'KINOKUNIYA GRAND INDONESIA', retailer: 'KIY', hari: 'Senin' }, { kode: 'KIY-PIK', nama: 'KINOKUNIYA PANTAI INDAH KAPUK', retailer: 'KIY', hari: 'Jumat' },
  { kode: 'MAA-SGI', nama: 'BABYZ STATION SEIBU GRAND INDONESIA', retailer: 'MAA', hari: 'Senin' }, { kode: 'MAA-PIM2', nama: 'BABYZ STATION SEIBU PIM 2', retailer: 'MAA', hari: 'Rabu' }
];
const KONTAK = [
  { kunci: 'KIY', penerima: 'Kinokuniya GI dan PIK', gerai: ['KIY-GI', 'KIY-PIK'], kepada: 'ops@contoh-kiy.test', cc: 'atasan@contoh-ols.test', sapaan: 'Pak Contoh', namaSurat: 'Kinokuniya Grand Indonesia dan Kinokuniya Pantai Indah Kapuk' },
  { kunci: 'MAA', penerima: 'Babyz Station Seibu Grand Indonesia dan Seibu PIM 2', gerai: ['MAA-SGI', 'MAA-PIM2'], kepada: 'a@contoh-maa.test, b@contoh-maa.test', cc: 'atasan@contoh-ols.test', sapaan: 'Ibu A dan Ibu B', namaSurat: 'Babyz Station Seibu Grand Indonesia dan Babyz Station Seibu PIM 2' },
  { kunci: 'T305', penerima: 'Living World Alam Sutera', gerai: ['T305'], kepada: 'sm1@contoh-tk.test', cc: 'atasan@contoh-ols.test', sapaan: 'Pak/Bu', namaSurat: 'Toys Kingdom Living World Alam Sutera' },
  { kunci: 'T311', penerima: 'Margo City Depok', gerai: ['T311'], kepada: 'sm2@contoh-tk.test', cc: 'atasan@contoh-ols.test', sapaan: 'Pak/Bu', namaSurat: 'Toys Kingdom Margo City Depok' },
  { kunci: 'T390', penerima: 'Living World Kota Wisata Cibubur', gerai: ['T390'], kepada: 'sm3@contoh-tk.test', cc: 'atasan@contoh-ols.test', sapaan: 'Pak/Bu', namaSurat: 'Toys Kingdom Living World Kota Wisata Cibubur' },
  { kunci: 'T317', penerima: 'Mall Artha Gading', gerai: ['T317'], kepada: 'sm4@contoh-tk.test', cc: 'atasan@contoh-ols.test', sapaan: 'Pak/Bu', namaSurat: 'Toys Kingdom Mall Artha Gading' }
];
/* Oktober: pekan 1 pola lama (Kamis 1 Okt), mulai 12 Okt pola Senin sampai Jumat. T305 punya satu Minggu lama (4 Okt) dan tiga Selasa. */
const OKT = { '2026-10-01': ['T311', 'T390'], '2026-10-04': ['T305'], '2026-10-12': ['KIY-GI', 'MAA-SGI'], '2026-10-13': ['T305'], '2026-10-14': ['MAA-PIM2'], '2026-10-15': ['T311', 'T390'], '2026-10-16': ['T317', 'KIY-PIK'],
  '2026-10-19': ['KIY-GI', 'MAA-SGI'], '2026-10-20': ['T305'], '2026-10-21': ['MAA-PIM2'], '2026-10-22': ['T311', 'T390'], '2026-10-23': ['T317', 'KIY-PIK'], '2026-10-26': ['KIY-GI', 'MAA-SGI'], '2026-10-27': ['T305'], '2026-10-28': ['MAA-PIM2'], '2026-10-29': ['T311', 'T390'], '2026-10-30': ['T317', 'KIY-PIK'] };
const PIC = { nama: 'Indra Jaya', kontak: '080000000000', penanda: 'Ferdy Febrian Iskandar', jabatan: 'Business Operations', email: 'penanda@contoh-ols.test' };
function dataBulan(b, ekstra) { return Object.assign({ ok: true, bulan: b, gerai: GERAI, jadwal: {}, bulanLalu: { bulan: '2026-10', jadwal: OKT }, terbit: null, draf: null, libur: [], liburTercatat: true, geser: [], kontak: KONTAK, pic: PIC }, ekstra || {}); }

/* ================= A. hitungan dan PDF (Node) ================= */
let J = null;
try {
  const kotak = { window: {}, console };
  kotak.window.window = kotak.window;
  vm.createContext(kotak);
  vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/jadwal.js'), 'utf8'), kotak);
  J = kotak.window.WmsJadwal;
} catch (e) { c('A0 jadwal.js termuat tanpa DOM', false, e.message); }
const jum = isi => Object.keys(isi).reduce((a, t) => a + isi[t].length, 0);
function bagianA() {
  if (!J) { c('A0 WmsJadwal ada', false, 'tidak ada'); return; }
  const nov = J._dariPola(GERAI, '2026-11');
  c('A1 pola Master Lokasi jadi November: 34 kunjungan, Senin 2 = Kinokuniya GI + Seibu GI, Sabtu dan Minggu kosong',
    jum(nov) === 34 && (nov['2026-11-02'] || []).join() === 'KIY-GI,MAA-SGI' && !nov['2026-11-01'] && !nov['2026-11-07'] && (nov['2026-11-30'] || []).join() === 'KIY-GI,MAA-SGI', JSON.stringify(nov).slice(0, 300));
  const salin = J._dariBulanLalu(GERAI, OKT, '2026-11');
  c('A2 salin bulan lalu: tiap gerai ikut hari yang paling sering dipakainya di Oktober (T305 Selasa, bukan Minggu lama), hasil sama dengan pola baru',
    (salin['2026-11-03'] || []).indexOf('T305') > -1 && !salin['2026-11-01'] && jum(salin) === 34, JSON.stringify(salin).slice(0, 300));
  const p0 = J._periksa(nov, GERAI, '2026-11', { libur: [], liburTercatat: true, kontak: KONTAK, geser: [] });
  c('A3 November pola bersih: semua pemeriksaan hijau, total 34', p0.cek.every(x => x.ok) && p0.total === 34, JSON.stringify(p0.cek.filter(x => !x.ok)));
  const salah = JSON.parse(JSON.stringify(nov));
  salah['2026-11-07'] = ['T311'];                             /* Sabtu */
  delete salah['2026-11-10'];                                /* T305 bolong pekan 9 Nov */
  salah['2026-11-12'] = ['T311', 'T390', 'MAA-PIM2'];          /* PIM 2 dua kali pekan 9 Nov, hari isi 3 gerai */
  salah['2026-11-25'] = ['MAA-PIM2'];
  const p1 = J._periksa(salah, GERAI, '2026-11', { libur: [{ tgl: '2026-11-25', nama: 'Libur Contoh' }], liburTercatat: true, kontak: KONTAK.slice(0, 5), geser: [{ gerai: 'T305', lama: '2026-11-17', baru: '2026-11-18', alasan: 'cuti' }] });
  const k = p1.cek.filter(x => !x.ok).map(x => x.k).sort().join(',');
  c('A4 pemeriksaan menangkap Sabtu, pekan bolong, dua kali sepekan, 3 gerai sehari, kunjungan di tanggal merah, gerai tanpa kontak, dan pergeseran tercatat',
    k === 'akhirPekan,bolong,dobel,geser,kontak,libur,padat' && /Seibu PIM 2/.test(p1.cek.find(x => x.k === 'dobel').teks) && /TK Alam Sutera/.test(p1.cek.find(x => x.k === 'bolong').teks) && /TK Artha Gading/.test(p1.cek.find(x => x.k === 'kontak').teks), k + ' ' + JSON.stringify(p1.cek.filter(x => !x.ok).map(x => x.teks)));
  const p2 = J._periksa(nov, GERAI, '2027-01', { libur: [], liburTercatat: false, kontak: KONTAK });
  c('A5 lembar Hari Libur belum memuat tahunnya: diberi tanda, bukan dianggap tidak ada tanggal merah', p2.cek.some(x => x.k === 'libur' && !x.ok && /Hari Libur/.test(x.teks)), JSON.stringify(p2.cek.find(x => x.k === 'libur')));
  const kel = J._kelompok(nov, GERAI, KONTAK);
  c('A6 penerima PDF: 6 penerima, Kinokuniya satu PDF berisi GI lalu PIK, MAA satu PDF berisi Seibu GI lalu PIM 2',
    kel.length === 6 && kel[0].gerai.map(g => g.kode).join() === 'KIY-GI,KIY-PIK' && kel[1].gerai.map(g => g.kode).join() === 'MAA-SGI,MAA-PIM2', JSON.stringify(kel.map(x => [x.k.kunci, x.gerai.map(g => g.kode)])));
  const tanpaPim = JSON.parse(JSON.stringify(nov)); ['04', '11', '18', '25'].forEach(d => delete tanpaPim['2026-11-' + d]);
  c('A7 gerai tanpa kunjungan tidak ikut PDF mitranya', J._kelompok(tanpaPim, GERAI, KONTAK)[1].gerai.map(g => g.kode).join() === 'MAA-SGI', '');
  const ubah = JSON.parse(JSON.stringify(nov)); ['02', '09', '16', '23', '30'].forEach(d => { ubah['2026-11-' + d] = ['KIY-GI']; }); ['03', '10', '17', '24'].forEach(d => { ubah['2026-11-' + d] = ['T305', 'MAA-SGI']; });
  const campur = JSON.parse(JSON.stringify(nov)); campur['2026-11-04'] = ['MAA-PIM2', 'T305']; delete campur['2026-11-03'];
  c('A8 keterangan tabel PDF: tetap, berubah dari hari bulan lalu, atau hari beragam',
    J._keterangan('MAA-SGI', nov, OKT) === 'Tetap hari Senin' && J._keterangan('MAA-SGI', ubah, OKT) === 'Berubah dari Senin menjadi Selasa' && J._keterangan('T305', campur, OKT) === 'Hari beragam, lihat kalender',
    [J._keterangan('MAA-SGI', nov, OKT), J._keterangan('MAA-SGI', ubah, OKT), J._keterangan('T305', campur, OKT)].join(' | '));
  c('A9 nama berkas mengikuti pola yang sudah dikirim ke mitra', J._namaBerkas(KONTAK[1], '2026-11', PIC) === 'Jadwal_Indra Jaya_November_2026_Babyz Station Seibu Grand Indonesia dan Seibu PIM 2.pdf', J._namaBerkas(KONTAK[1], '2026-11', PIC));

  /* PDF dengan jsPDF yang sama (berkas vendor di situs) */
  let jsPDF = null;
  try { jsPDF = require(path.join(AKAR, 'wms/vendor/jspdf.umd.min.js')).jsPDF; } catch (e) { c('A10 jsPDF vendor termuat', false, e.message); return; }
  const logo = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(AKAR, 'wms/img', f)).toString('base64');
  const LOGO = { mof: logo('logo-mofmo.jpg'), ols: logo('logo-ols.jpg') };
  const D = dataBulan('2026-11');
  const pdf = (kelX, isi, opsi, Dx) => { const h = J._buatPdf(jsPDF, LOGO, Dx || D, kelX, isi, Object.assign({ hariIni: '2026-10-25', versi: 1, lalu: OKT }, opsi || {})); const f = path.join(SEMENTARA, 'x' + Math.random().toString(36).slice(2) + '.pdf'); fs.writeFileSync(f, Buffer.from(h.doc.output('arraybuffer'))); return { f, muat: h.muat, teks: execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }), hal: Number((execFileSync('pdfinfo', [f], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/) || [])[1]) }; };
  const maa = pdf(kel[1], nov);
  c('A10 PDF MAA: satu halaman, memuat Seibu GI (2, 9, 16, 23, dan 30) dan PIM 2 (4, 11, 18, dan 25), Operational PIC dan kontaknya, tanpa gerai mitra lain',
    maa.hal === 1 && maa.muat && /Babyz Station Seibu Grand Indonesia/.test(maa.teks) && /2, 9, 16, 23, dan 30/.test(maa.teks) && /4, 11, 18, dan 25/.test(maa.teks) && /Indra Jaya/.test(maa.teks) && /080000000000/.test(maa.teks) &&
    !/Kinokuniya|Toys Kingdom|Alam Sutera|Kino GI/.test(maa.teks) && /hanya memuat jadwal store Babyz Station/.test(maa.teks) && /Kalender November 2026/.test(maa.teks), maa.teks.slice(0, 900));
  const kiy = pdf(kel[0], ubah, { versi: 2 });
  c('A11 PDF Kinokuniya versi 2: menyebut versi di kop dan memuat dua gerainya saja', kiy.hal === 1 && /versi 2/.test(kiy.teks) && /Kinokuniya Pantai Indah Kapuk/.test(kiy.teks) && !/Seibu|Toys Kingdom/.test(kiy.teks), kiy.teks.slice(0, 600));
  const sel = pdf(kel[1], ubah);
  c('A12 perubahan hari tertulis di keterangan dan catatan PDF', /Berubah dari Senin menjadi Selasa/.test(sel.teks.replace(/\s+/g, ' ')) && /Kunjungan Babyz Station Seibu Grand Indonesia berubah dari Senin menjadi Selasa mulai November 2026/.test(sel.teks.replace(/\s+/g, ' ')), sel.teks.replace(/\s+/g, ' ').slice(0, 1400));
  /* Mei 2027 mulai Sabtu dan 31 hari: kalender enam baris. Libur di hari kerja ikut ditulis. */
  const mei = J._dariPola(GERAI, '2027-05');
  const D5 = dataBulan('2027-05', { libur: [{ tgl: '2027-05-13', nama: 'Kenaikan Contoh' }], bulanLalu: { bulan: '2027-04', jadwal: {} } });
  delete mei['2027-05-13'];
  const m5 = pdf(J._kelompok(mei, GERAI, KONTAK)[0], mei, { lalu: {} }, D5);
  c('A13 bulan dengan kalender enam baris tetap muat satu halaman, tanggal merah di hari kerja disebut di catatan', m5.hal === 1 && m5.muat && /Tidak ada kunjungan pada 13 Mei 2027 \(Kenaikan Contoh\)/.test(m5.teks.replace(/\s+/g, ' ')), m5.muat + ' ' + m5.teks.replace(/\s+/g, ' ').slice(-700));
  fs.copyFileSync(maa.f, path.join(SEMENTARA, 'contoh-maa.pdf'));
  const src = fs.readFileSync(path.join(AKAR, 'wms/jadwal.js'), 'utf8');
  c('A14 tidak ada tanda pisah panjang di jadwal.js maupun di teks PDF', src.indexOf('\u2014') < 0 && [maa, kiy, sel, m5].every(x => x.teks.indexOf('\u2014') < 0), '');
}
try { bagianA(); } catch (e) { c('A MATI di tengah jalan', false, e.stack); }

/* ================= B. layar (Playwright) ================= */
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
    '<script>function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";window.__siap=1;}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
  await new Promise(r => srv.listen(8776, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [], PANGGIL = [];
  let TERBIT = null;
  const pasang = async ctx => {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar dimuat: ' + r.request().url()); r.abort(); });
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'panggil') PANGGIL.push({ nama: m.nama, args: m.args });
      if (m.fn === 'panggil' && m.nama === 'dataPapan') h = { pintu: 'ok', hasil: { ok: true, lok: [], prod: [], baris: [], hariIni: '2026-10-12' } };
      else if (m.fn === 'panggil' && m.nama === 'ambilJadwalPic') h = { pintu: 'ok', hasil: TERBIT ? dataBulan(m.args[1], { terbit: { versi: 1, waktu: '2026-10-25 10:12', isi: TERBIT.isi, utas: {} }, jadwal: TERBIT.isi }) : dataBulan(m.args[1]) };
      else if (m.fn === 'panggil' && m.nama === 'simpanDrafJadwalPic') h = { pintu: 'ok', hasil: { ok: true, waktu: '2026-10-25 10:00' } };
      else if (m.fn === 'panggil' && m.nama === 'terbitkanJadwalPic') { TERBIT = m.args[2]; h = { pintu: 'ok', hasil: { ok: true, versi: 1, kunjungan: jum(m.args[2].isi), pesan: 'November 2026 versi 1 terbit', tanpaKontak: [], draf: KONTAK.map(k => ({ kunci: k.kunci, penerima: k.penerima, kepada: k.kepada, mode: 'baru', draftId: 'r-' + k.kunci })) } }; }
      else h = { pintu: 'galat', pesan: 'Fungsi "' + (m.nama || m.fn) + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') { const w = new Date(Date.now() - 60000).toISOString(); const o = { 'klien|papan': { ok: true, versi: 'jadwal', html: PAPAN }, 'klien|versi': { ok: true, versi: 'jadwal' } }; const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; }); h = { ok: true, isi }; }
      else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const masuk = async p => {
    p.on('pageerror', e => galat.push(e.message));
    await p.goto('http://localhost:8776/wms/');
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'id'); localStorage.setItem('wms_maskot', 'off'); });
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) { const f = p.frames().find(x => x !== p.mainFrame()); try { if (f && await f.evaluate(() => !!document.querySelector('[data-wms=jadwal]'))) return f; } catch (e) {} await jeda(100); }
    return null;
  };
  try {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    await ctx.addInitScript(() => { const D = Date; const tetap = new D('2026-10-25T10:00:00+07:00').getTime(); window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [tetap])); } static now() { return tetap; } }; });
    await pasang(ctx);
    const p = await ctx.newPage();
    const fr = await masuk(p);
    let t1 = {};
    if (fr) {
      await fr.evaluate(() => document.querySelector('[data-wms=jadwal]').click());
      await p.waitForFunction(() => document.querySelectorAll('#jadwalPic [data-jadwal-tgl]').length === 30, null, { timeout: 8000 }).catch(() => {});
      t1 = await p.evaluate(() => ({ bulan: (document.querySelector('#jadwalPic .jp-bulan b') || {}).textContent, sel: document.querySelectorAll('#jadwalPic [data-jadwal-tgl]').length, chip: document.querySelectorAll('#jadwalPic .jp-chip').length, status: (document.querySelector('#jadwalPic .jp-status') || {}).textContent, cekMerah: document.querySelectorAll('#jadwalPic .jp-cek .awas').length, gerai: document.querySelectorAll('#jadwalPic [data-jadwal-gerai]').length }));
    }
    c('B1 tombol Jadwal di kepala papan membuka November 2026 (bulan depan), 30 tanggal, usulan dari pola berisi 34 chip, 8 gerai, pemeriksaan hijau',
      !!fr && t1.bulan === 'November 2026' && t1.sel === 30 && t1.chip === 34 && t1.gerai === 8 && t1.cekMerah === 0 && /pola/i.test(t1.status || ''), JSON.stringify(t1));
    await p.click('#jadwalPic [data-jadwal-gerai="MAA-SGI"]');
    for (const d of ['02', '09', '16', '23', '30']) await p.click('#jadwalPic [data-jadwal-tgl="2026-11-' + d + '"]');
    for (const d of ['03', '10', '17', '24']) await p.click('#jadwalPic [data-jadwal-tgl="2026-11-' + d + '"]');
    await p.click('#jadwalPic [data-jadwal-tgl="2026-11-07"]');
    const t2 = await p.evaluate(() => ({ senin: document.querySelector('#jadwalPic [data-jadwal-tgl="2026-11-02"]').innerText, selasa: document.querySelector('#jadwalPic [data-jadwal-tgl="2026-11-03"]').innerText, status: document.querySelector('#jadwalPic .jp-status').textContent, awas: [...document.querySelectorAll('#jadwalPic .jp-cek div')].filter(d => d.querySelector('.awas')).map(d => d.textContent).join(' | ') }));
    c('B2 ketuk gerai lalu tanggal: Seibu GI pindah dari Senin ke Selasa, status jadi "Diubah", Sabtu 7 yang diisi langsung ditandai pemeriksaan',
      !/Seibu GI/.test(t2.senin) && /Seibu GI/.test(t2.selasa) && /Diubah/.test(t2.status) && /Sabtu\/Minggu terisi \(7\)/.test(t2.awas) && /dua kali|Dua kali/.test(t2.awas), JSON.stringify(t2));
    await p.click('#jadwalPic [data-jadwal-tgl="2026-11-07"]');
    await p.click('#jadwalPic [data-jadwal="simpan"]');
    await p.waitForFunction(() => /Draf tersimpan/.test((document.getElementById('jpStatus') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
    const dr = PANGGIL.filter(x => x.nama === 'simpanDrafJadwalPic').pop();
    c('B3 Simpan draf mengirim susunan yang terlihat (Seibu GI di Selasa, Sabtu kosong) dan tidak menerbitkan apa pun',
      dr && dr.args[1] === '2026-11' && (dr.args[2]['2026-11-03'] || []).indexOf('MAA-SGI') > -1 && !dr.args[2]['2026-11-07'] && !PANGGIL.some(x => x.nama === 'terbitkanJadwalPic'), JSON.stringify(dr && dr.args[2]).slice(0, 300));
    await p.click('#jadwalPic [data-jadwal="terbitkan"]');
    const t3 = await p.evaluate(() => ({ yakin: !!document.querySelector('#jadwalPic .jp-yakin'), teks: (document.querySelector('#jadwalPic .jp-yakin') || {}).innerText || '' }));
    c('B4 Terbitkan meminta konfirmasi di halaman (bukan dialog peramban), menyebut 6 draf dan bahwa tidak ada yang terkirim sendiri, belum memanggil server',
      t3.yakin && /6 draf/.test(t3.teks) && /tidak ada email yang terkirim sendiri/i.test(t3.teks) && !PANGGIL.some(x => x.nama === 'terbitkanJadwalPic'), JSON.stringify(t3));
    await p.click('#jadwalPic [data-jadwal="yakinYa"]');
    await p.waitForFunction(() => !!document.querySelector('#jadwalPic .jp-hasil'), null, { timeout: 20000 }).catch(() => {});
    const tb = PANGGIL.filter(x => x.nama === 'terbitkanJadwalPic').pop();
    const berkas = tb ? tb.args[2].berkas : {};
    const kunci = Object.keys(berkas).sort().join(',');
    let teksMaa = '';
    if (berkas.MAA) { const f = path.join(SEMENTARA, 'terbit-maa.pdf'); fs.writeFileSync(f, Buffer.from(berkas.MAA.b64, 'base64')); teksMaa = execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }); }
    c('B5 yang dikirim ke terbitkanJadwalPic: susunan di layar (34 dikurangi 5 Senin ditambah 4 Selasa) dan 6 PDF (satu per penerima); PDF MAA hanya Seibu, Seibu GI di hari Selasa, diterbitkan 25 Oktober 2026',
      tb && tb.args[1] === '2026-11' && jum(tb.args[2].isi) === 34 - 5 + 4 && /November 2026\s+8 kunjungan/.test(teksMaa.replace(/\s+/g, " ")) && kunci === 'KIY,MAA,T305,T311,T317,T390' && /Babyz Station Seibu Grand Indonesia/.test(teksMaa) && /3, 10, 17, dan 24/.test(teksMaa) && !/Kinokuniya/.test(teksMaa) && /Diterbitkan 25 Oktober 2026/.test(teksMaa) &&
      /^Jadwal_Indra Jaya_November_2026_/.test(berkas.MAA.nama), kunci + ' ' + teksMaa.slice(0, 500));
    const t4 = await p.evaluate(() => ({ baris: document.querySelectorAll('#jadwalPic .jp-hasil-baris').length, status: document.querySelector('#jadwalPic .jp-status').textContent, gmail: !!document.querySelector('#jadwalPic .jp-hasil a[href*="mail.google.com"]') }));
    c('B6 sesudah terbit: 6 baris hasil dengan tautan ke draf Gmail, status "Terbit versi 1"', t4.baris === 6 && /Terbit versi 1/.test(t4.status) && t4.gmail, JSON.stringify(t4));
    const [u] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.click('#jadwalPic [data-jadwal-staf="png"]')]);
    let ukur = null;
    if (u) { const f = path.join(SEMENTARA, 'staf.png'); fs.copyFileSync(await u.path(), f); ukur = execFileSync('python3', ['-c', 'import sys;from PIL import Image;i=Image.open(sys.argv[1]);print(i.size[0],i.size[1],i.format)', f], { encoding: 'utf8' }).trim(); fs.copyFileSync(f, path.join(SEMENTARA, 'contoh-staf.png')); }
    c('B7 gambar staf PNG terunduh: lebar 1080, bernama Jadwal-Indra-November-2026.png', u && u.suggestedFilename() === 'Jadwal-Indra-November-2026.png' && /^1080 \d+ PNG$/.test(ukur || '') && +ukur.split(' ')[1] > 1400, (u && u.suggestedFilename()) + ' ' + ukur);
    const [u2] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.click('#jadwalPic [data-jadwal-staf="jpg"]')]);
    c('B8 gambar staf JPG juga tersedia', u2 && /\.jpg$/.test(u2.suggestedFilename()), u2 && u2.suggestedFilename());
    await p.screenshot({ path: path.join(SEMENTARA, 'layar.png'), fullPage: true });
    c('B9 tidak ada tanda pisah panjang di layar', !(await p.evaluate(() => /\u2014/.test(document.getElementById('jadwalPic').innerText))), '');
    await ctx.close();
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasang(ctx2);
    const hp = await ctx2.newPage();
    const fr2 = await masuk(hp);
    let lebar = 9999;
    if (fr2) {
      await fr2.evaluate(() => document.querySelector('[data-wms=jadwal]').click());
      await hp.waitForFunction(() => document.querySelectorAll('#jadwalPic [data-jadwal-tgl]').length > 27, null, { timeout: 8000 }).catch(() => {});
      await jeda(200);
      lebar = await hp.evaluate(() => Math.max(document.documentElement.scrollWidth, document.getElementById('jadwalPic').scrollWidth));
      await hp.screenshot({ path: path.join(SEMENTARA, 'layar-hp.png'), fullPage: false });
    }
    c('B10 HP 390 px: halaman tidak bergeser ke samping (kalender boleh digeser di dalam kotaknya)', lebar <= 392, String(lebar));
    await ctx2.close();
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('B11 tidak ada galat JavaScript dan jsPDF dimuat dari situs sendiri, bukan CDN', galat.length === 0, galat.join(' | ').slice(0, 400));
  await b.close(); srv.close();
}

bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\nberkas contoh: ' + SEMENTARA);
  console.log(cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
