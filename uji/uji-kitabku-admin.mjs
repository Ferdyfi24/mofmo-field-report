/* Uji menu Kitabku di WMS (wms/kitabku.js), 10 Okt 2026.
 * Harapan: "30 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Dari menu ini Ferdy mengganti event, mengisi nominal
 * voucher, mencetak ratusan kartu QR untuk paket Shopee, dan memutus klaim
 * struk pembeli gerai. Kalau kartu cetakan tidak cocok dengan barangnya,
 * QR-nya tidak terbaca, atau persetujuan struk membuka kartu yang salah,
 * kesalahannya sampai ke tangan pembeli. Lembar dibuka di peramban
 * sungguhan dengan kulit WMS asli (app.css); permintaan ke Edge Function
 * dijawab oleh inti.js yang sama dengan yang dipasang, dengan basis data
 * tiruan dan tiket WMS buatan crypto node. Tanpa jaringan, tanpa data nyata.
 */
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
/* Kode Edge Function "kitab" tidak ikut repo ini (dipasang langsung ke Supabase); set KITAB_SERVER kalau letaknya beda. */
const SRV = process.env.KITAB_SERVER || '/home/claude/wms-supabase';
const { tangani, KARTU } = await import(SRV + '/kitab/inti.js');
const { dbPalsu } = await import(SRV + '/kitab-tiruan.mjs');
const require = createRequire('/home/claude/fieldreport/uji/uji-wms-alat.js');
const { chromium } = require('playwright');

let gagal = 0, jalan = 0; const DIHARAPKAN = 30;
const c = (n, ok, k) => { jalan++; if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '\n   -> ' + String(k).replace(/\s*\n\s*/g, ' | ').slice(0, 400))); };
async function bagian(nama, fn) { console.log('\n=== ' + nama + ' ==='); try { await fn(); } catch (e) { gagal++; console.log('GAGAL ' + nama + ' MATI -> ' + (e && e.stack || e)); } }

/* ---------- fixture ---------- */
const RAHASIA = 'rahasia-uji-admin-0123456789abcdef0123456789', SIDIK = 'sidik-uji-admin-abcdefghijklmnop';
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const tiketWms = (exp) => exp + '.' + b64url(createHmac('sha256', RAHASIA).update('wms|' + exp + '|' + SIDIK).digest());
const db = dbPalsu();
db.st.akses = { rahasia: RAHASIA, sidik: SIDIK };
db.st.pemain.push({ id: 'pA', nama: 'Sari', sidik: 'x1' }, { id: 'pB', nama: 'Doni', sidik: 'x2' });
const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
db.st.struk.push({ id: 1, status: 'menunggu', pemain: 'pA', gerai: 'TK Margo City', tanggal: '2026-10-09', produk: [KARTU[0][0], KARTU[16][0]], foto: FOTO, acara: null },
  { id: 2, status: 'menunggu', pemain: 'pB', gerai: 'Kinokuniya PIK', tanggal: '2026-10-08', produk: [KARTU[5][0]], foto: FOTO, acara: null });
const nama = (bc) => { const k = KARTU.find((x) => x[0] === bc); return k[2].replace(' (Key Charm)', '') + ' · ' + k[3]; };

const AKAR = '/home/claude/fieldreport';
let TIKET = tiketWms(Date.now() + 3600e3);
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/uji.html') { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return s.end('<!doctype html><html lang="id" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wms/app.css"></head><body><button id="pemicu">Kitabku</button><script>window.__wms = { S: { tiket: ' + JSON.stringify('TIKETNYA') + ' }, bhs: function () { return "id"; }, Suara: {} };</script><script src="/wms/kitabku.js"></script></body></html>'); }
  const f = path.join(AKAR, u);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css' })[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, ok));
const URL0 = 'http://localhost:' + srv.address().port + '/uji.html';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const panggilan = [];
await ctx.route('**/functions/v1/kitab', async (route) => {
  const m = JSON.parse(route.request().postData() || 'null'); panggilan.push(m.aksi);
  const h = await tangani(m, db, Date.now(), { ip: '1.1.1.1' });
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL/.test(m.text())) errs.push(m.text()); });
const teks = () => p.evaluate(() => document.getElementById('kbIsi').innerText);
const tunggu = (ms) => p.waitForTimeout(ms);
const pasangTiket = (t) => p.evaluate((t) => { window.__wms.S.tiket = t; }, t);

await bagian('A. pintu: tiket WMS', async () => {
  await p.goto(URL0); await pasangTiket('123.palsu');
  await p.evaluate(() => WmsKitabku.buka()); await tunggu(400);
  c('A1 tiket palsu: diminta masuk lagi, tanpa data', /Sesi WMS sudah habis/.test(await teks()) && !/Kolektor/.test(await teks()), await teks());
  await pasangTiket(tiketWms(Date.now() - 1000)); await p.click('[data-kb=ulang]'); await tunggu(300);
  c('A2 tiket kedaluwarsa juga ditolak', /Sesi WMS sudah habis/.test(await teks()));
  await pasangTiket(TIKET); await p.click('[data-kb=ulang]'); await tunggu(400);
  const t = await teks();
  c('A3 tiket sah: angka ringkas tampil', /Kolektor/.test(t) && /Kartu Shopee dicetak/.test(t), t.slice(0, 300));
  c('A4 lencana tab struk = 2 menunggu', await p.evaluate(() => document.querySelector('[data-kbtab=struk] .kb-lencana').textContent) === '2');
});

await bagian('B. event dan hadiah', async () => {
  await p.click('[data-kbtab=cetak]'); await tunggu(200);
  c('B1 cetak dikunci sebelum ada event', /Belum ada event/.test(await teks()));
  await p.click('[data-kbtab=ringkas]'); await tunggu(200);
  await p.fill('#kbAcNama', '11.11 Big Sale'); await p.fill('#kbAcCap', '11.11'); await p.fill('#kbAcMulai', '2026-10-25'); await p.fill('#kbAcSelesai', '2026-11-12');
  await p.click('[data-kb=acara]'); await tunggu(500);
  c('B2 event tersimpan dan tampil', db.st.acara && db.st.acara.cap === '11.11' && /11\.11 Big Sale/.test(await teks()) && /25 Okt 2026/.test(await teks()), JSON.stringify(db.st.acara));
  await p.click('[data-kb=usulan]'); await tunggu(1500);
  c('B3 hadiah usulan mockup terpasang semua dalam keadaan MATI', db.st.hadiah.length === 11 && db.st.hadiah.every((h) => !h.aktif), db.st.hadiah.map((h) => h.id + ':' + h.aktif).join(','));
  c('B4 hadiah tanpa nominal ditandai', (await teks()).match(/nilai belum diisi/g).length >= 5);
  const box = '[data-hadiah=patok5] ';
  await p.fill(box + '[data-f=nominal]', 'Rp15.000'); await p.fill(box + '[data-f=min_belanja]', 'Rp150.000'); await p.fill(box + '[data-f=voucher]', 'MOF15OKT'); await p.fill(box + '[data-f=kuota]', '50');
  await p.check(box + '[data-f=aktif]'); await p.click(box + '[data-kb=hadiah]'); await tunggu(600);
  const h5 = db.st.hadiah.find((h) => h.id === 'patok5');
  c('B5 nominal, voucher, kuota, nyala tersimpan', h5.nominal === 'Rp15.000' && h5.min_belanja === 'Rp150.000' && h5.voucher === 'MOF15OKT' && h5.kuota === 50 && h5.aktif === true && h5.saluran === 'online', JSON.stringify(h5));
  c('B6 hadiah lain tidak ikut berubah', db.st.hadiah.filter((h) => h.aktif).length === 1);
  await p.click('.kb-det:has([data-hadiah=baru]) summary');
  await p.fill('[data-hadiah=baru] [data-f=id]', 'bab4'); await p.selectOption('[data-hadiah=baru] [data-f=jenis]', 'bab'); await tunggu(150);
  c('B7 jenis bab: target jadi pilihan bab, ID yang diketik tidak hilang', await p.evaluate(() => document.querySelector('[data-hadiah=baru] select[data-f=angka]') && document.querySelector('[data-hadiah=baru] [data-f=id]').value === 'bab4'));
  await p.selectOption('[data-hadiah=baru] [data-f=angka]', '3'); await p.fill('[data-hadiah=baru] [data-f=hadiah]', 'Potongan Mascot Ball');
  await p.click('[data-hadiah=baru] [data-kb=hadiah]'); await tunggu(600);
  const h4 = db.st.hadiah.find((h) => h.id === 'bab4');
  c('B8 hadiah baru per bab tersimpan (Bab IV = angka 3)', h4 && h4.jenis === 'bab' && h4.angka === 3 && h4.hadiah === 'Potongan Mascot Ball', JSON.stringify(h4));
});

let kodeCetak = [];
await bagian('C. cetak kartu QR paket Shopee', async () => {
  await p.click('[data-kbtab=cetak]'); await tunggu(200);
  await p.click('.kb-det >> nth=0'); await tunggu(100);
  await p.fill('[data-qty="' + KARTU[0][0] + '"]', '7');
  await p.click('.kb-det >> nth=2'); await tunggu(100);
  await p.fill('[data-qty="' + KARTU[17][0] + '"]', '5');
  c('C1 total terhitung saat mengetik', (await p.textContent('#kbTotal')) === '12' && await p.evaluate(() => !document.querySelector('[data-kb=buat]').disabled));
  await p.fill('#kbVJml', '3'); await p.fill('#kbVKode', 'BONUS10'); await p.fill('#kbVTeks', 'Potongan Rp10.000');
  await p.evaluate(() => { window.print = () => { const w = document.getElementById('lembarKitab'); window.__lembar = w ? w.outerHTML : ''; window.__kelas = document.body.className; }; });
  await p.click('[data-kb=buat]'); await tunggu(800);
  const kode = Object.entries(db.st.kode).filter(([, r]) => r.saluran === 'shopee');
  kodeCetak = kode;
  c('C2 12 kode dibuat di server untuk event aktif', kode.length === 12 && kode.every(([, r]) => r.acara === db.st.acara.id), kode.length);
  c('C3 tepat 3 kartu membawa voucher BONUS10', kode.filter(([, r]) => r.voucher === 'BONUS10').length === 3 && kode.filter(([, r]) => r.voucher_teks === 'Potongan Rp10.000').length === 3);
  const lembar = await p.evaluate(() => window.__lembar), kelas = await p.evaluate(() => window.__kelas);
  c('C4 lembar cetak dibuat saat print, 12 kartu', /cetak-kitab/.test(kelas) && (lembar.match(/class="kartu-kitab"/g) || []).length === 12, kelas + ' ' + lembar.length);
  const produk = [...lembar.matchAll(/class="kk-produk">([^<]+)</g)].map((m) => m[1].replace(/&amp;/g, '&'));
  c('C5 kartu urut per produk (7 Bear dulu, lalu 5 Key Charm Bear)', produk.slice(0, 7).every((x) => x === nama(KARTU[0][0])) && produk.slice(7).every((x) => x === nama(KARTU[17][0])), produk.join(','));
  c('C6 lembar tidak membocorkan voucher ke pengemas', !/BONUS10/.test(lembar));
  c('C7 lembar dibersihkan setelah print', await p.evaluate(() => !document.getElementById('lembarKitab') && !document.body.classList.contains('cetak-kitab')));
  /* tampilkan lembar dengan media cetak, potret, baca QR kartu pertama dengan zxing */
  await p.evaluate((h) => { document.body.insertAdjacentHTML('beforeend', h); document.body.classList.add('cetak-kitab'); }, lembar);
  await p.emulateMedia({ media: 'print' });
  const png = path.join(os.tmpdir(), 'kartu-kitab-' + Date.now() + '.png');
  await p.locator('#lembarKitab .kartu-kitab').first().screenshot({ path: png, scale: 'device' });
  const terbaca = execFileSync('python3', ['-c', 'import sys,zxingcpp\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("L")\nim=im.resize((im.width*3,im.height*3))\nr=zxingcpp.read_barcodes(im)\nprint(r[0].text if r else "")', png]).toString().trim();
  const kodeAda = kode.map(([k]) => k);
  const m = /^https:\/\/mofmofriends-kitab\.pages\.dev\/#k=([A-Z0-9]{10})$/.exec(terbaca);
  c('C8 QR kartu tercetak terbaca kamera dan menunjuk kode Bear yang sah', m && kodeAda.includes(m[1]) && db.st.kode[m[1]].kartu === KARTU[0][0], terbaca);
  const ukuran = await p.evaluate(() => { const r = document.querySelector('#lembarKitab .kartu-kitab').getBoundingClientRect(); return [Math.round(r.width / 96 * 25.4), Math.round(r.height / 96 * 25.4)]; });
  c('C9 ukuran kartu 85 x 55 mm', ukuran[0] === 85 && ukuran[1] === 55, JSON.stringify(ukuran));
  const pdf = await p.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const halaman = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  c('C10 12 kartu = 2 lembar A4 (10 per lembar)', halaman === 2, halaman);
  await p.emulateMedia({ media: 'screen' });
  await p.evaluate(() => { document.getElementById('lembarKitab').remove(); document.body.classList.remove('cetak-kitab'); });
  c('C11 ringkasan hasil cetak + tombol cetak lagi', /12\s+kode dibuat/.test(await teks()) && !!(await p.$('[data-kb=cetakLagi]')));
});

await bagian('D. klaim struk', async () => {
  await p.click('[data-kbtab=struk]'); await tunggu(500);
  let t = await teks();
  c('D1 dua struk menunggu dengan nama, gerai, produk', /Sari/.test(t) && /TK Margo City/.test(t) && /Doni/.test(t) && t.includes(nama(KARTU[16][0])), t.slice(0, 400));
  c('D2 foto tidak ikut dimuat di daftar (hemat kuota)', !(await p.$('.kb-foto')) && !panggilan.includes('fotoStruk'));
  await p.click('[data-struk="1"] [data-kb=foto]'); await tunggu(400);
  c('D3 foto dimuat saat diminta', await p.evaluate(() => (document.querySelector('[data-struk="1"] .kb-foto') || {}).src || '').then((s) => /^data:image\/png/.test(s)));
  await p.uncheck('[data-struk="1"] input[value="' + KARTU[16][0] + '"]');
  await p.click('[data-struk="1"] [data-kb=setujui]'); await tunggu(500);
  const kol = db.st.koleksi.filter((k) => k.pemain === 'pA');
  c('D4 disetujui: hanya kartu yang dicentang masuk, saluran struk, cap event aktif', kol.length === 1 && kol[0].kartu === KARTU[0][0] && kol[0].saluran === 'struk' && kol[0].acara === db.st.acara.id && db.st.struk[0].status === 'disetujui', JSON.stringify(kol));
  await p.click('[data-struk="2"] [data-kb=tolak]'); await tunggu(200);
  c('D5 tolak butuh klik kedua', db.st.struk[1].status === 'menunggu' && /Yakin tolak/.test(await teks()));
  await p.click('[data-struk="2"] [data-kb=tolak]'); await tunggu(400);
  t = await teks();
  c('D6 ditolak: tanpa kartu, antrean kosong, lencana hilang', db.st.struk[1].status === 'ditolak' && !db.st.koleksi.some((k) => k.pemain === 'pB') && /Tidak ada struk/.test(t) && !(await p.$('.kb-lencana')), t);
  c('D7 tanpa galat halaman', errs.length === 0, errs.join(' | '));
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/kb-admin-struk.png' });
  await p.click('[data-kbtab=ringkas]'); await tunggu(500); await p.screenshot({ path: '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/kb-admin-ringkas.png', fullPage: true });
  await p.click('[data-kbtab=cetak]'); await tunggu(300); await p.screenshot({ path: '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/kb-admin-cetak.png' });
});

await b.close(); srv.close();
if (jalan !== DIHARAPKAN) { console.log('\nBAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN + '. Uji mati di tengah jalan.'); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
