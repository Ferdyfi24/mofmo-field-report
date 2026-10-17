/* Uji kamera HP di tab Pasang kartu (wms/kitabku.js), 16 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy minta kartu QR bisa discan pakai kamera HP, bukan
 * cuma scanner. HP gudang bisa Android (Chrome punya BarcodeDetector) atau
 * iPhone (Safari tidak punya), jadi QR kartu dibaca BarcodeDetector kalau ada
 * dan jsQR kalau tidak. Yang mahal kalau salah: kamera menyala tapi tidak
 * pernah membaca apa-apa di iPhone; QR lain (misal QR pembayaran) ikut dianggap
 * kartu; kamera tidak benar-benar mati (lampu kamera HP menyala terus, baterai
 * habis); izin kamera ditolak lalu layar diam tanpa penjelasan; dan pustaka
 * 130 KB diunduh setiap kali WMS dibuka padahal kamera tidak dipakai.
 * Kamera palsu Chromium memutar video QR kartu yang dibuat di sini; jalur
 * BarcodeDetector diuji dengan detektor tiruan yang membaca No Pesanan dulu
 * lalu kartu. Edge Function dijawab inti.js asli dengan basis data tiruan.
 */
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const SRV = process.env.KITAB_SERVER || '/home/claude/wms-supabase';
const { tangani } = await import(SRV + '/kitab/inti.js');
const { dbPalsu } = await import(SRV + '/kitab-tiruan.mjs');
const require = createRequire('/home/claude/fieldreport/uji/uji-wms-alat.js');
const { chromium } = require('playwright');

let gagal = 0, jalan = 0; const DIHARAPKAN = 10;
const c = (n, ok, k) => { jalan++; if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '\n   -> ' + String(k).replace(/\s*\n\s*/g, ' | ').slice(0, 500))); };
async function bagian(nama, fn) { console.log('\n=== ' + nama + ' ==='); try { await fn(); } catch (e) { gagal++; console.log('GAGAL ' + nama + ' MATI -> ' + (e && e.stack || e)); } }

/* ---------- fixture ---------- */
const RAHASIA = 'rahasia-uji-kamera-0123456789abcdef0123456', SIDIK = 'sidik-uji-kamera-abcdefghijklm';
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const EXP = Date.now() + 3600e3, TIKET = EXP + '.' + b64url(createHmac('sha256', RAHASIA).update('wms|' + EXP + '|' + SIDIK).digest());
const db = dbPalsu(); db.st.akses = { rahasia: RAHASIA, sidik: SIDIK };
const adm = (isi) => tangani(Object.assign({ fn: 'admin', tiket: TIKET }, isi), db, Date.now(), {});
await adm({ aksi: 'acara', acara: { nama: '11.11 Big Sale', cap: '11.11', mulai: '2026-10-25', selesai: '2026-11-15' } });
const K = (await adm({ aksi: 'cetakPaket', jumlah: 3, voucherSampai: '2030-12-31', voucherKode: 'MOFMO11NOV' })).kode.map((x) => x.kode);
const QR = (k) => 'https://mofmofriends.id/#k=' + k;
const pesananDari = (k) => db.st.kode[k].pesanan || null;

/* video kamera palsu: QR kartu K[0] persis seperti yang dicetak (alamat lengkap) */
const SEM = fs.mkdtempSync(path.join(os.tmpdir(), 'uji-kamera-'));
const PNG = path.join(SEM, 'qr.png'), Y4M = path.join(SEM, 'qr.y4m');
execFileSync('python3', ['-c', 'import qrcode,sys; i=qrcode.make(sys.argv[1], border=4, box_size=8); i.save(sys.argv[2])', QR(K[0]), PNG]);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-loop', '1', '-i', PNG, '-t', '2', '-vf', 'scale=480:480,pad=640:480:80:0:white,format=yuv420p', '-r', '10', Y4M]);

/* 18 Okt: default ke repo tempat uji ini berada, bukan salinan lama /home/claude/fieldreport (dulu diam diam menguji kode lama) */
const AKAR = process.env.WMS_AKAR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/uji.html') { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return s.end('<!doctype html><html lang="id" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wms/app.css"></head><body><script>window.__wms = { S: { tiket: ' + JSON.stringify(TIKET) + ' }, bhs: function () { return "id"; }, Suara: {} };</script><script src="/wms/kitabku.js"></script></body></html>'); }
  const f = path.join(AKAR, u);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css' })[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, ok));
const URL0 = 'http://localhost:' + srv.address().port + '/uji.html';

const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + Y4M] });
/* setiap track kamera dicatat supaya ketahuan benar-benar dimatikan atau tidak */
const CATAT_TRACK = () => { const asli = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); window.__track = []; navigator.mediaDevices.getUserMedia = (c) => asli(c).then((s) => { s.getTracks().forEach((t) => window.__track.push(t)); return s; }); };
async function halaman(opsi) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
  await ctx.route('**/functions/v1/kitab', async (route) => {
    const m = JSON.parse(route.request().postData() || 'null');
    const h = await tangani(m, db, Date.now(), { ip: '1.1.1.1' });
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|favicon/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(CATAT_TRACK);
  if (opsi && opsi.init) await p.addInitScript(opsi.init.f, opsi.init.a);
  await p.goto(URL0);
  await p.evaluate(() => WmsKitabku.buka('pasang')); await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const kameraMati = (p) => p.evaluate(() => !document.querySelector('#kbPsKamera video') && (window.__track || []).length > 0 && window.__track.every((t) => t.readyState === 'ended'));
const tungguSampai = async (p, fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await p.waitForTimeout(200); } return false; };
let semuaGalat = [];

await bagian('A. HP tanpa BarcodeDetector (seperti iPhone): QR dibaca jsQR', async () => {
  const { ctx, p, errs } = await halaman({ init: { f: () => { try { delete window.BarcodeDetector; } catch (e) {} window.BarcodeDetector = undefined; }, a: null } });
  const awal = await p.evaluate(() => ({ kartu: !!document.querySelector('[data-kb=kamKartu]'), pesanan: !!document.querySelector('[data-kb=kamPesanan]'), jsqr: typeof window.jsQR !== 'undefined' || !![...document.scripts].some((s) => /jsQR/.test(s.src)) }));
  c('A1 tombol kamera kartu tetap ada walau tanpa BarcodeDetector; kamera No Pesanan (barcode garis) tidak ditawarkan', awal.kartu && !awal.pesanan, JSON.stringify(awal));
  c('A2 pustaka jsQR belum diunduh sebelum kamera dipakai', !awal.jsqr, JSON.stringify(awal));
  await p.click('#kbPsPesanan'); await p.keyboard.type('261105KAM001');
  await p.click('[data-kb=kamKartu]');
  const kebaca = await tungguSampai(p, async () => pesananDari(K[0]) === '261105KAM001', 12000);
  const h = await p.evaluate(() => { const x = document.getElementById('kbPsHasil'); return x ? { s: x.getAttribute('data-ps-status'), t: x.innerText } : null; });
  c('A3 QR kartu dari kamera terbaca dan langsung terpasang ke No Pesanan yang sudah diisi', kebaca && h && h.s === 'ok', JSON.stringify([pesananDari(K[0]), h]));
  c('A4 sesudah terbaca kamera benar-benar mati (video hilang, semua track berhenti)', await kameraMati(p), JSON.stringify(await p.evaluate(() => (window.__track || []).map((t) => t.readyState))));
  /* kamera palsu masih memutar QR yang sama; untuk menguji tombol Tutup, pembaca dibuat tidak menemukan apa-apa */
  await p.evaluate(() => { window.jsQR = () => null; });
  await p.click('[data-kb=kamKartu]'); await p.waitForTimeout(600);
  const nyala = await p.evaluate(() => !!document.querySelector('#kbPsKamera video'));
  await p.click('#kbPsKamera [data-kb=kamTutup]'); await p.waitForTimeout(300);
  c('A5 tombol Tutup kamera mematikan kamera tanpa memasang apa-apa', nyala && await kameraMati(p) && pesananDari(K[1]) === null, JSON.stringify({ nyala }));
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/kb-kamera-hp.png' });
  semuaGalat = semuaGalat.concat(errs); await ctx.close();
});

await bagian('B. HP Android: BarcodeDetector baca No Pesanan, lalu kamera kartu menyala sendiri', async () => {
  /* detektor tiruan: barcode garis di label dulu, sesudah itu QR asing (diabaikan), lalu QR kartu */
  const init = { f: (a) => {
    let n = 0;
    window.BarcodeDetector = class { constructor(o) { this.f = (o && o.formats) || []; } static getSupportedFormats() { return Promise.resolve(['qr_code', 'code_128']); }
      detect() { n++; if (n < 3) return Promise.resolve([]); if (n === 3) return Promise.resolve([{ rawValue: a.pesanan, format: 'code_128' }]);
        if (n < 6) return Promise.resolve([{ rawValue: 'https://bayar.example/qris/123', format: 'qr_code' }]); return Promise.resolve([{ rawValue: a.kartu, format: 'qr_code' }]); } };
  }, a: { pesanan: '261105KAM002', kartu: QR(K[1]) } };
  const { ctx, p, errs } = await halaman({ init });
  c('B1 dengan BarcodeDetector, kamera No Pesanan ikut ditawarkan', !!(await p.$('[data-kb=kamPesanan]')));
  await p.click('[data-kb=kamPesanan]');
  const ok = await tungguSampai(p, async () => pesananDari(K[1]) === '261105KAM002', 12000);
  const jsqr = await p.evaluate(() => typeof window.jsQR !== 'undefined');
  c('B2 No Pesanan terbaca, kamera kartu menyala sendiri, QR asing diabaikan, kartu terpasang; jsQR tidak diunduh', ok && !jsqr && pesananDari(K[2]) === null, JSON.stringify([pesananDari(K[1]), jsqr]));
  c('B3 kamera mati sesudah selesai', await kameraMati(p));
  semuaGalat = semuaGalat.concat(errs); await ctx.close();
});

await bagian('C. izin kamera ditolak', async () => {
  const { ctx, p, errs } = await halaman({ init: { f: () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })); }, a: null } });
  await p.click('[data-kb=kamKartu]'); await p.waitForTimeout(800);
  const t = await p.evaluate(() => (document.getElementById('kbPsKamera') || {}).innerText || '');
  c('C1 izin ditolak: dijelaskan cara mengizinkan dan jalan lain (scanner atau ketik), tanpa galat', /izin/i.test(t) && /ketik/i.test(t) && errs.length === 0, t + ' | ' + errs.join(' | '));
  await ctx.close();
});
c('D1 tanpa galat halaman di semua skenario', semuaGalat.length === 0, semuaGalat.join(' | '));

await b.close(); srv.close();
if (jalan !== DIHARAPKAN) { console.log('\nBAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN + '. Uji mati di tengah jalan.'); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
