/* Uji hadiah jenis Papan Total di menu Kitabku WMS (wms/kitabku.js), 16 Okt 2026 malam.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy: "leaderboard tiap game akumulatif ya, jdi buat hadiah cuma di
 * leaderboard akumulatif", lalu bertanya apakah jumlah pemenang dan vouchernya bisa diatur dari
 * WMS (awalnya 10, voucher diisi belakangan). Hadiah jenis Papan Total memakai kolom Target
 * sebagai jumlah pemenang. Yang mahal kalau salah: jenisnya tidak bisa dipilih sehingga hadiah
 * papan cuma bisa dibuat lewat basis data, target tetap angka lama (3) sehingga cuma tiga orang
 * yang menang, atau admin tidak tahu kapan hadiahnya bisa diklaim pembeli.
 * Lembar dibuka di peramban sungguhan dengan app.css asli; Edge Function dijawab inti.js yang
 * sama dengan yang dipasang, basis data tiruan, tiket WMS buatan crypto node.
 */
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const SRV = process.env.KITAB_SERVER || '/home/claude/wms-supabase';
const { tangani } = await import(SRV + '/kitab/inti.js');
const { dbPalsu } = await import(SRV + '/kitab-tiruan.mjs');
const require = createRequire('/home/claude/fieldreport/uji/uji-wms-alat.js');
const { chromium } = require('playwright');

let gagal = 0, jalan = 0; const DIHARAPKAN = 5;
const c = (n, ok, k) => { jalan++; if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '\n   -> ' + String(k).replace(/\s*\n\s*/g, ' | ').slice(0, 500))); };
async function bagian(nama, fn) { console.log('\n=== ' + nama + ' ==='); try { await fn(); } catch (e) { gagal++; console.log('GAGAL ' + nama + ' MATI -> ' + (e && e.stack || e)); } }

/* ---------- fixture: event aktif, satu hadiah lama ---------- */
const RAHASIA = 'rahasia-uji-hadiah-papan-0123456789abcdef01', SIDIK = 'sidik-uji-hadiah-papan-abcdefgh';
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const exp = Date.now() + 3600e3, TIKET = exp + '.' + b64url(createHmac('sha256', RAHASIA).update('wms|' + exp + '|' + SIDIK).digest());
const db = dbPalsu();
db.st.akses = { rahasia: RAHASIA, sidik: SIDIK };
db.st.acara = { id: 'a1', nama: '11.11 Big Sale', cap: '11.11', mulai: '2026-11-01', selesai: '2026-11-15' };
db.st.hadiah = [{ id: 'patok5', judul: '', jenis: 'kartu', angka: 5, saluran: 'online', hadiah: 'Voucher Shopee', nominal: 'Rp10.000', min_belanja: 'Rp150.000', voucher: null, kuota: 12, terpakai: 0, aktif: false }];

const AKAR = process.env.WMS_AKAR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/uji.html') { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return s.end('<!doctype html><html lang="id" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wms/app.css"></head><body><script>window.__wms = { S: { tiket: ' + JSON.stringify(TIKET) + ' }, bhs: function () { return "id"; }, Suara: {} };</script><script src="/wms/kitabku.js"></script></body></html>'); }
  const f = path.join(AKAR, u);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css' })[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, ok));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**/functions/v1/kitab', async (route) => {
  const h = await tangani(JSON.parse(route.request().postData() || 'null'), db, Date.now(), { ip: '1.1.1.1' });
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const B = '[data-hadiah=baru] ';

await bagian('A. hadiah baru jenis Papan Total', async () => {
  await p.goto('http://localhost:' + srv.address().port + '/uji.html');
  await p.evaluate(() => WmsKitabku.buka('ringkas')); await p.waitForTimeout(700);
  await p.click('.kb-det:has([data-hadiah=baru]) summary');
  await p.fill(B + '[data-f=id]', 'papanTotal');
  const opsi = await p.evaluate((B) => [...document.querySelectorAll(B + 'select[data-f=jenis] option')].map((o) => o.value + ':' + o.textContent), B);
  c('A1 jenis Papan Total bisa dipilih', opsi.some((x) => /^papan:.*Papan Total/.test(x)), JSON.stringify(opsi));
  await p.selectOption(B + '[data-f=jenis]', 'papan'); await p.waitForTimeout(150);
  const f = await p.evaluate((B) => { const a = document.querySelector(B + '[data-f=angka]'); return { angka: a && a.value, label: a && a.closest('label').textContent, id: document.querySelector(B + '[data-f=id]').value, ket: document.querySelector('[data-hadiah=baru]').textContent }; }, B);
  /* 18 Okt: kolom "Jumlah pemenang" jadi "Peringkat sampai" karena hadiah papan sekarang per tingkat (uji-kitabku-hadiah-tingkat.mjs) */
  c('A2 target jadi Peringkat sampai, langsung 10, ID tidak hilang', f.angka === '10' && /Peringkat sampai/.test(f.label) && f.id === 'papanTotal', JSON.stringify(f).slice(0, 300));
  c('A3 admin diberi tahu kapan hadiahnya bisa diklaim', /sesudah edisi selesai/i.test(f.ket), f.ket.slice(0, 400));
  await p.fill(B + '[data-f=hadiah]', 'Voucher Shopee'); await p.fill(B + '[data-f=kuota]', '10');
  await p.click(B + '[data-kb=hadiah]'); await p.waitForTimeout(700);
  const h = db.st.hadiah.find((x) => x.id === 'papanTotal');
  c('A4 tersimpan ke server sebagai jenis papan, 10 pemenang, voucher boleh kosong dulu', h && h.jenis === 'papan' && h.angka === 10 && h.kuota === 10 && !h.voucher, JSON.stringify(h));
  const judul = await p.evaluate(() => { const x = document.querySelector('[data-hadiah=papanTotal] .kb-hkepala b'); return x ? x.textContent : ''; });
  c('A5 baris hadiah berjudul Papan Total top 10, tanpa galat', /Papan Total/.test(judul) && /top 10/.test(judul) && errs.length === 0, judul + ' ' + errs.join(' | '));
});

await b.close(); srv.close();
if (jalan !== DIHARAPKAN) { console.log('\nBAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN + '. Uji mati di tengah jalan.'); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
