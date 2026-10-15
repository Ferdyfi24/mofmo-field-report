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

let gagal = 0, jalan = 0; const DIHARAPKAN = 32;
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
  /* 15 Okt malam, Ferdy: "cetaknya bisa png high reso (cuma png)... soalnya vendor yg print bukan gua".
     Hasil cetak = satu ZIP berisi PNG 300 dpi per kartu (14 x 6 cm = 1654 x 709 px), bukan print browser. */
  const [unduhan] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('[data-kb=buat]')]);
  const zipPath = path.join(os.tmpdir(), 'kartu-kitab-' + Date.now() + '.zip'); await unduhan.saveAs(zipPath);
  const kode = Object.entries(db.st.kode).filter(([, r]) => r.saluran === 'shopee');
  kodeCetak = kode;
  c('C2 12 kode dibuat di server untuk event aktif', kode.length === 12 && kode.every(([, r]) => r.acara === db.st.acara.id), kode.length);
  c('C3 tepat 3 kartu membawa voucher BONUS10', kode.filter(([, r]) => r.voucher === 'BONUS10').length === 3 && kode.filter(([, r]) => r.voucher_teks === 'Potongan Rp10.000').length === 3);
  /* isi ZIP dibaca python: nama, ukuran, QR (zxing), warna kotak bawah kanan, keragaman piksel di area foto */
  const py = String.raw`
import sys, json, io, zipfile, zxingcpp
from PIL import Image, ImageStat
z = zipfile.ZipFile(sys.argv[1]); out = []
mm = 300 / 25.4
for n in z.namelist():
    im = Image.open(io.BytesIO(z.read(n))).convert('RGB')
    q = zxingcpp.read_barcodes(im)
    kotak = im.getpixel((int((70 + 6) * mm), int(50.6 * mm)))
    foto = ImageStat.Stat(im.crop((int(18 * mm), int(14 * mm), int(52 * mm), int(40 * mm))).convert('L')).stddev[0]
    out.append({'nama': n, 'ukuran': im.size, 'dpi': [round(x) for x in im.info.get('dpi', (0, 0))], 'qr': q[0].text if q else '', 'kotak': sum(kotak) / 3, 'foto': foto})
print(json.dumps(out))`;
  const isi = JSON.parse(execFileSync('python3', ['-c', py, zipPath]).toString());
  const kodeDari = (n) => (/_([A-Z0-9]{10})\.png$/.exec(n) || [])[1];
  c('C4 ZIP berisi 12 PNG, satu per kartu, tanpa berkas lain', isi.length === 12 && isi.every((x) => /\.png$/.test(x.nama) && kodeDari(x.nama)), isi.map((x) => x.nama).join(','));
  const produk = isi.map((x) => (db.st.kode[kodeDari(x.nama)] || {}).kartu);
  c('C5 berkas urut per produk (7 Bear dulu, lalu 5 Key Charm Bear) dan bernomor urut', produk.slice(0, 7).every((x) => x === KARTU[0][0]) && produk.slice(7).every((x) => x === KARTU[17][0]) && isi.every((x, i) => x.nama.startsWith(String(i + 1).padStart(3, '0') + '_')), isi.map((x) => x.nama).join(','));
  c('C6 ZIP tidak membocorkan kode voucher', !isi.some((x) => /BONUS10/.test(x.nama)) && !/BONUS10/.test(fs.readFileSync(zipPath).toString('latin1')));
  c('C9 tiap PNG 140 x 60 mm pada 300 dpi (1654 x 709 px, dpi tercatat 300)', isi.every((x) => x.ukuran[0] === 1654 && x.ukuran[1] === 709 && x.dpi[0] === 300), JSON.stringify(isi.map((x) => [x.ukuran, x.dpi])[0]));
  c('C8 QR tiap PNG terbaca dan menunjuk kode di nama berkasnya sendiri', isi.every((x) => x.qr === 'https://mofmofriends.id/#k=' + kodeDari(x.nama)), JSON.stringify(isi.map((x) => [x.nama, x.qr]).slice(0, 2)));
  const kodeVou = kode.filter(([, r]) => r.voucher).map(([k]) => k).sort().join();
  c('C12 tepat 3 kartu berkotak krem "Ada voucher di dalam", dan itu kartu yang kodenya membawa voucher', isi.filter((x) => x.kotak > 180).map((x) => kodeDari(x.nama)).sort().join() === kodeVou && isi.filter((x) => x.kotak < 100).length === 9, JSON.stringify(isi.map((x) => Math.round(x.kotak))));
  c('C13 tiap PNG memuat foto produk (area foto tidak polos; kartu tanpa foto sekitar 3)', isi.every((x) => x.foto > 10), JSON.stringify(isi.map((x) => Math.round(x.foto))));
  c('C10 tidak ada sisa lembar cetak di halaman', await p.evaluate(() => !document.getElementById('lembarKitab') && !document.body.classList.contains('cetak-kitab')));
  /* Ferdy 15 Okt malam: "qr card voucher buat lebih hd ya termasuk tulisan di kanannya".
     Aturan ukuran dibaca dari CSS kartu yang sama yang dipakai PNG. */
  await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="lembarKitab" style="display:block;position:absolute;left:-9999px"><div class="kartu-kitab"><div class="kk-kanan"><div class="kk-qr"></div><div class="kk-teks"><span class="kk-kode">X</span><span class="kk-ajak"><b>X</b>x</span></div><div class="kk-bawah"><b>X</b><span>x</span></div></div></div></div>'); });
  const kanan = await p.evaluate(() => { const k = document.querySelector('#lembarKitab .kartu-kitab'); const pt = (s) => Math.round(parseFloat(getComputedStyle(k.querySelector(s)).fontSize) * 0.75 * 10) / 10;
    const r = { kode: pt('.kk-kode'), ajak: pt('.kk-ajak'), judulAjak: pt('.kk-ajak b'), bawah: pt('.kk-bawah span'), judulBawah: pt('.kk-bawah b'), qr: Math.round(k.querySelector('.kk-qr').getBoundingClientRect().width / 96 * 25.4) }; document.getElementById('lembarKitab').remove(); return r; });
  c('C15 sisi kanan kartu terbaca: tulisan >= 7 pt, kode >= 9 pt, QR >= 32 mm', kanan.kode >= 9 && kanan.ajak >= 7 && kanan.judulAjak >= 7 && kanan.bawah >= 7 && kanan.judulBawah >= 7 && kanan.qr >= 32, JSON.stringify(kanan));
  c('C11 ringkasan hasil + tombol unduh PNG lagi', /12\s+kode dibuat/.test(await teks()) && /Unduh PNG lagi/.test(await teks()) && !!(await p.$('[data-kb=cetakLagi]')));
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
