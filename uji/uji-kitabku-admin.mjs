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

/* 18 Okt: default ke repo tempat uji ini berada, bukan salinan lama /home/claude/fieldreport (dulu diam diam menguji kode lama) */
const AKAR = process.env.WMS_AKAR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
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
  /* 17 Okt, Ferdy: pembelian offline tidak dapat kartu, klaim struk dihapus dari web Kitab dan dari WMS.
     Dulu A4 memeriksa lencana tab struk; sekarang tab dan kartu angka "Struk menunggu" harus hilang. */
  const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-kbtab]')].map((x) => x.getAttribute('data-kbtab')));
  c('A4 tab Klaim struk dan kartu Struk menunggu tidak ada lagi', !tabs.includes('struk') && tabs.length === 4 && !/Struk menunggu/.test(t), JSON.stringify(tabs) + ' ' + t.slice(0, 200));
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

await bagian('C. kartu QR umum per paket: kode kosong, cetak A4 sendiri, PNG cadangan', async () => {
  /* 16 Okt 2026, Ferdy: "krtunya jdi kita print senditi aja", alur kartu per paket disetujui.
     Kartu tidak terikat SKU (SKU baru diikat waktu packing), voucher di SEMUA kartu.
     Dulu bagian ini menguji kartu per produk untuk vendor (ZIP PNG, voucher acak); jalur itu
     diganti. Yang diperiksa: lembar A4 yang benar-benar dikirim ke print, isinya kartu umum
     dengan kode dari server, gambar dan huruf sudah siap waktu print, lalu PNG cadangan. */
  await p.click('[data-kbtab=cetak]'); await tunggu(200);
  await p.evaluate(() => { window.__cetak = []; window.print = () => {
    const l = document.getElementById('lembarKitab'), ks = l ? [...l.querySelectorAll('.kartu-kitab')] : [];
    let ukur = null;
    if (l && ks.length) { const lama = l.style.cssText; l.style.cssText = 'display:block;position:absolute;left:0;top:0';
      const k = ks[0], mm = (px) => Math.round(px / 96 * 25.4 * 10) / 10, r = k.getBoundingClientRect(), q = k.querySelector('.kk-qr');
      const pt = [...k.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize) * 0.75);
      /* jumlah baris = tinggi / tinggi satu baris; pita juga harus muat di antara ujung pita yang terpotong miring (3% kiri-kanan) */
      const baris = (e) => Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize)));
      const muat = (sel, maks) => { const e = k.querySelector(sel); if (!e) return false; const r = document.createRange(); r.selectNodeContents(e); const lebar = r.getBoundingClientRect().width, wadah = e.parentElement.getBoundingClientRect().width; return baris(e) <= maks && lebar <= (sel.indexOf('pita') > -1 ? wadah * 0.94 : wadah); };
      ukur = { w: mm(r.width), h: mm(r.height), qr: q ? mm(q.getBoundingClientRect().width) : 0, ptMin: Math.round(Math.min(...pt) * 10) / 10, pitaMuat: muat('.kk-pita .kk-nama', 1), ajakMuat: muat('.kk-p-ajak', 2), kodeBebas: (() => { const kd = k.querySelector('.kk-kode'), vb = k.querySelector('.kk-bawah'); if (!kd || !vb) return false; const a = kd.getBoundingClientRect(), b2 = vb.getBoundingClientRect(); return a.bottom <= b2.top + 0.5; })() }; l.style.cssText = lama; }
    window.__cetak.push({ kelas: document.body.classList.contains('cetak-kitab'), n: ks.length, kode: ks.map((k) => k.getAttribute('data-kode')), teks: l ? l.innerText || l.textContent : '',
      gambar: l ? [...l.querySelectorAll('img')].map((i) => i.complete && i.naturalWidth > 0) : [], huruf: ["900 9pt 'KK Cinzel Deco'", "900 9pt 'KK Cinzel'", "700 9pt 'KK Cinzel'", "700 9pt 'KK Cormorant'", "italic 700 9pt 'KK Cormorant'"].every((f) => [...document.fonts].some((ff) => ff.status === 'loaded' && ff.family.replace(/"/g, '') === f.split("'")[1] && String(ff.weight) === f.match(/\d00/)[0] && ff.style === (f.startsWith('italic') ? 'italic' : 'normal'))), ukur });
    /* 16 Okt: tulisan miring di kartu kosong di PDF karena huruf miringnya belum dimuat saat print. Semua wajah huruf yang dipakai kartu harus SUDAH termuat. */
    setTimeout(() => window.dispatchEvent(new Event('afterprint')), 50); }; });
  const kunci = () => p.evaluate(() => { const b = document.querySelector('[data-kb=buatPaket]'); return !b || b.disabled; });
  const k0 = await kunci(); await p.fill('#kbPJml', '12'); const k1 = await kunci();
  await p.fill('#kbPVKode', 'BONUS10'); await p.fill('#kbPVTeks', 'Potongan Rp10.000, min. belanja Rp150.000'); const k2 = await kunci();
  /* 16 Okt malam, Ferdy: voucher di akun pembeli harus menampilkan masa berlakunya, jadi tanggalnya wajib diisi di sini */
  const SAMPAI = new Date(Date.now() + 30 * 864e5 + 7 * 3600e3).toISOString().slice(0, 10);
  const lbl = await p.evaluate(() => { const i = document.getElementById('kbPVSampai'); return i ? { t: i.type, lbl: i.closest('label').textContent, min: i.min } : null; });
  await p.fill('#kbPVSampai', SAMPAI); const k3 = await kunci();
  c('C1 tombol buat terkunci sampai jumlah, kode voucher, DAN tanggal berlaku diisi', k0 && k1 && k2 && !k3, JSON.stringify([k0, k1, k2, k3]));
  c('C17 kolom tanggal "Berlaku sampai", tidak bisa memilih tanggal yang sudah lewat', lbl && lbl.t === 'date' && /Berlaku sampai/i.test(lbl.lbl) && lbl.min === new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10), JSON.stringify(lbl));
  await p.click('[data-kb=buatPaket]'); await p.waitForFunction(() => window.__cetak.length > 0, null, { timeout: 30000 });
  const kode = Object.entries(db.st.kode).filter(([, r]) => r.jenis === 'paket');
  c('C2 12 kode kosong untuk event aktif, semua bervoucher BONUS10 dengan tanggal berlakunya, tanpa SKU', kode.length === 12 && kode.every(([, r]) => r.acara === db.st.acara.id && r.voucher === 'BONUS10' && r.voucher_sampai === SAMPAI && r.kartu == null), JSON.stringify(kode[0]));
  const ct = await p.evaluate(() => window.__cetak[0]);
  c('C3 yang dikirim ke print: 12 kartu dengan kode persis dari server', ct.kelas && ct.n === 12 && ct.kode.slice().sort().join() === kode.map(([k]) => k).sort().join(), JSON.stringify([ct.kelas, ct.n]));
  const jml = (re) => (ct.teks.match(re) || []).length;
  c('C4 kartu umum: tiap kartu ada "Ada voucher di dalam", kodenya, dan ajakan scan; tidak menyebut produk', jml(/ADA VOUCHER DI DALAM/gi) === 12 && kode.every(([k]) => ct.teks.replace(/\s/g, '').includes(k)) && jml(/SCAN SETELAH PAKET SAMPAI/gi) === 12 && !/Plush|Key Charm|Bab I/.test(ct.teks), ct.teks.slice(0, 300));
  c('C5 logo dan foto karakter sudah termuat dan huruf kartu siap waktu print', ct.gambar.length >= 12 * 7 && ct.gambar.every(Boolean) && ct.huruf, JSON.stringify([ct.gambar.length, ct.gambar.filter((x) => !x).length, ct.huruf]));
  c('C6 kode voucher tidak ikut tercetak di kartu', !ct.teks.includes('BONUS10'));
  /* 16 Okt sore: teks kanan yang jadi dua baris mendorong kode kartu ke bawah sampai tertutup kotak ADA VOUCHER (terlihat di PDF). Kode itu cadangan kalau QR gagal, jadi wajib utuh. */
  c('C16 kode kartu di bawah QR tidak tertutup kotak ADA VOUCHER', ct.ukur && ct.ukur.kodeBebas, JSON.stringify(ct.ukur));
  /* 16 Okt sore, Ferdy pilih opsi 1: Kitabku diganti Mofmo Collection, kalimat kartu fokus hadiah */
  c('C15 kartu pakai nama Mofmo Collection: "Kumpulin kartunya, buka hadiahnya", pita "43 KARTU · MOFMO COLLECTION" satu baris tanpa terpotong, tanpa kata Kitabku',
    jml(/Kumpulin kartunya, buka hadiahnya/g) === 12 && jml(/43 KARTU · MOFMO COLLECTION/g) === 12 && !/kitabku/i.test(ct.teks) && ct.ukur && ct.ukur.pitaMuat && ct.ukur.ajakMuat, JSON.stringify([ct.teks.slice(0, 300), ct.ukur]));
  c('C7 ukuran kartu 140 x 60 mm, QR >= 30 mm, tulisan >= 7 pt', ct.ukur && Math.abs(ct.ukur.w - 140) <= 0.5 && Math.abs(ct.ukur.h - 60) <= 0.5 && ct.ukur.qr >= 30 && ct.ukur.ptMin >= 7, JSON.stringify(ct.ukur));
  await tunggu(400);
  c('C8 sesudah print, lembar cetak dibersihkan', await p.evaluate(() => !document.getElementById('lembarKitab') && !document.body.classList.contains('cetak-kitab')));
  c('C9 ringkasan hasil + tombol cetak A4 lagi dan unduh PNG', /12\s+kode dibuat/.test(await teks()) && !!(await p.$('[data-kb=cetakPaketLagi]')) && !!(await p.$('[data-kb=pngPaket]')), await teks());
  const [unduhan] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }), p.click('[data-kb=pngPaket]')]);
  const zipPath = path.join(os.tmpdir(), 'kartu-paket-' + Date.now() + '.zip'); await unduhan.saveAs(zipPath);
  /* isi ZIP dibaca python: nama, ukuran, dpi, QR (zxing), keragaman piksel di strip foto karakter kiri bawah */
  const py = String.raw`
import sys, json, io, zipfile, zxingcpp
from PIL import Image, ImageStat
z = zipfile.ZipFile(sys.argv[1]); out = []
mm = 300 / 25.4
for n in z.namelist():
    im = Image.open(io.BytesIO(z.read(n))).convert('RGB')
    q = zxingcpp.read_barcodes(im)
    foto = ImageStat.Stat(im.crop((int(6 * mm), int(31 * mm), int(64 * mm), int(42 * mm))).convert('L')).stddev[0]
    out.append({'nama': n, 'ukuran': im.size, 'dpi': [round(x) for x in im.info.get('dpi', (0, 0))], 'qr': q[0].text if q else '', 'foto': foto})
print(json.dumps(out))`;
  const isi = JSON.parse(execFileSync('python3', ['-c', py, zipPath]).toString());
  const kodeDari = (n) => (/_([A-Z0-9]{10})\.png$/.exec(n) || [])[1];
  c('C10 ZIP berisi 12 PNG bernama urut NNN_paket_KODE.png', isi.length === 12 && isi.every((x, i) => new RegExp('^' + String(i + 1).padStart(3, '0') + '_paket_[A-Z0-9]{10}\\.png$').test(x.nama) && db.st.kode[kodeDari(x.nama)]), isi.map((x) => x.nama).join(','));
  c('C11 tiap PNG 140 x 60 mm pada 300 dpi', isi.every((x) => x.ukuran[0] === 1654 && x.ukuran[1] === 709 && x.dpi[0] === 300), JSON.stringify(isi[0] && [isi[0].ukuran, isi[0].dpi]));
  c('C12 QR tiap PNG terbaca dan menunjuk kodenya sendiri', isi.every((x) => x.qr === 'https://mofmofriends.id/#k=' + kodeDari(x.nama)), JSON.stringify(isi.map((x) => [x.nama, x.qr]).slice(0, 2)));
  c('C13 strip foto karakter tampil di tiap PNG', isi.every((x) => x.foto > 10), JSON.stringify(isi.map((x) => Math.round(x.foto))));
  c('C14 ZIP tidak membocorkan kode voucher', !/BONUS10/.test(fs.readFileSync(zipPath).toString('latin1')));
});

await bagian('D. tanpa klaim struk', async () => {
  await p.click('[data-kbtab=ringkas]'); await tunggu(500);
  c('D1 tanpa galat halaman sesudah semua tab dibuka', errs.length === 0, errs.join(' | '));
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/kb-admin-ringkas.png', fullPage: true });
  await p.click('[data-kbtab=cetak]'); await tunggu(300); await p.screenshot({ path: '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/kb-admin-cetak.png' });
});

await b.close(); srv.close();
if (jalan !== DIHARAPKAN) { console.log('\nBAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN + '. Uji mati di tengah jalan.'); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
