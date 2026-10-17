/* Uji hadiah Papan Total per tingkat peringkat di menu Kitabku WMS (wms/kitabku.js), 18 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy: voucher leaderboard games beda tiap peringkat ("per peringkat").
 * Tiap hadiah papan sekarang satu tingkat: Peringkat dari sampai Peringkat sampai (misal #1,
 * #2-3, #4-10), masing-masing dengan voucher sendiri. Yang mahal kalau salah, dan diam:
 *  - admin tidak bisa mengisi peringkat awal, jadi semua tingkat mulai dari #1 dan juara 1
 *    mendapat tiga voucher sekaligus;
 *  - rentang yang tumpang tindih (misal hadiah lama top 10 masih aktif di samping tingkat baru)
 *    tidak terlihat sampai pembeli komplain dapat dua voucher atau kuota habis;
 *  - rentang terbalik tersimpan tanpa peringatan, atau ditolak tanpa pesan yang terbaca;
 *  - judul baris di WMS tetap "top 10" sehingga tiga tingkat terlihat sama.
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

let gagal = 0, jalan = 0; const DIHARAPKAN = 10;
const c = (n, ok, k) => { jalan++; if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '\n   -> ' + String(k).replace(/\s*\n\s*/g, ' | ').slice(0, 500))); };
async function bagian(nama, fn) { console.log('\n=== ' + nama + ' ==='); try { await fn(); } catch (e) { gagal++; console.log('GAGAL ' + nama + ' MATI -> ' + (e && e.stack || e)); } }

/* ---------- fixture: dua tingkat baru dan satu hadiah papan lama (1 sampai 10) yang masih aktif ---------- */
const RAHASIA = 'rahasia-uji-hadiah-tingkat-0123456789abcdef', SIDIK = 'sidik-uji-hadiah-tingkat-abcdefg';
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const exp = Date.now() + 3600e3, TIKET = exp + '.' + b64url(createHmac('sha256', RAHASIA).update('wms|' + exp + '|' + SIDIK).digest());
const db = dbPalsu();
db.st.akses = { rahasia: RAHASIA, sidik: SIDIK };
db.st.acara = { id: 'a1', nama: '11.11 Big Sale', cap: '11.11', mulai: '2026-11-06', selesai: '2026-11-14' };
const papan = (id, dari, sampai, nominal, aktif) => ({ id, judul: '', jenis: 'papan', peringkat_dari: dari, angka: sampai, saluran: 'semua', hadiah: 'Voucher Shopee', nominal, min_belanja: '', voucher: null, kuota: sampai - dari + 1, terpakai: 0, aktif });
db.st.hadiah = [papan('juara1', 1, 1, 'Rp100.000', true), papan('juara410', 4, 10, 'Rp25.000', true), papan('papanTotal', 1, 10, '', true)];

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
const buka = async () => { await p.evaluate(() => WmsKitabku.buka('ringkas')); await p.waitForTimeout(700); };
const judul = (id) => p.evaluate((id) => { const x = document.querySelector('[data-hadiah=' + id + '] .kb-hkepala b'); return x ? x.textContent : ''; }, id);
const peringatan = () => p.evaluate(() => { const x = document.querySelector('.kb-tumpang'); return x ? x.textContent : ''; });

await bagian('A. baris tingkat yang sudah ada', async () => {
  await p.goto('http://localhost:' + srv.address().port + '/uji.html'); await buka();
  const j = [await judul('juara1'), await judul('juara410'), await judul('papanTotal')];
  c('A1 judul baris menyebut rentangnya: #1, #4-10, dan hadiah lama tetap top 10', /Papan Total #1$/.test(j[0]) && /Papan Total #4-10$/.test(j[1]) && /top 10/.test(j[2]), JSON.stringify(j));
  const v = await p.evaluate(() => { const x = document.querySelector('[data-hadiah=juara410] [data-f=peringkat_dari]'), a = document.querySelector('[data-hadiah=juara410] [data-f=angka]'); return x ? x.value + '|' + x.closest('label').textContent + '|' + a.closest('label').textContent : ''; });
  c('A2 form tingkat #4-10 punya kolom Peringkat dari (4) dan Peringkat sampai', /^4\|Peringkat dari/.test(v) && /Peringkat sampai/.test(v), v);
  const w = await peringatan();
  c('A3 rentang aktif yang tumpang tindih diperingatkan, menyebut hadiahnya dan akibatnya', /papanTotal/.test(w) && /juara1/.test(w) && /dua voucher/i.test(w), w || '(tidak ada peringatan)');
});

await bagian('B. tingkat baru #2-3', async () => {
  await p.click('.kb-det:has([data-hadiah=baru]) summary');
  await p.fill(B + '[data-f=id]', 'juara23');
  await p.selectOption(B + '[data-f=jenis]', 'papan'); await p.waitForTimeout(150);
  const f = await p.evaluate((B) => { const d = document.querySelector(B + '[data-f=peringkat_dari]'); return { dari: d && d.value, id: document.querySelector(B + '[data-f=id]').value, ket: document.querySelector('[data-hadiah=baru]').textContent }; }, B);
  c('B1 jenis Papan Total: Peringkat dari langsung 1, ID tidak hilang, cara pakai tingkat dijelaskan', f.dari === '1' && f.id === 'juara23' && /satu tingkat/i.test(f.ket) && /sesudah edisi selesai/i.test(f.ket), JSON.stringify(f).slice(0, 400));
  await p.fill(B + '[data-f=peringkat_dari]', '4'); await p.fill(B + '[data-f=angka]', '3');
  await p.fill(B + '[data-f=hadiah]', 'Voucher Shopee'); await p.fill(B + '[data-f=kuota]', '2');
  await p.click(B + '[data-kb=hadiah]'); await p.waitForTimeout(700);
  const pesan = await p.evaluate(() => { const x = document.querySelector('.tolak-alat'); return x ? x.textContent : ''; });
  /* yang diketik admin tidak boleh hilang karena ditolak: dulu form hadiah baru kembali kosong dan tertutup */
  const sisa = await p.evaluate((B) => { const q = (f) => { const x = document.querySelector(B + '[data-f=' + f + ']'); return x ? x.value : null; }; return [q('id'), q('jenis'), q('peringkat_dari'), q('angka'), q('kuota'), !!document.querySelector('.kb-det:has([data-hadiah=baru])[open]')].join('|'); }, B);
  c('B2 rentang terbalik (4 sampai 3) ditolak dengan pesan terbaca, tidak tersimpan, isian form tetap', /peringkat/i.test(pesan) && !db.st.hadiah.some((x) => x.id === 'juara23') && sisa === 'juara23|papan|4|3|2|true', pesan + ' | ' + sisa);
  await p.fill(B + '[data-f=peringkat_dari]', '2');
  await p.click(B + '[data-kb=hadiah]'); await p.waitForTimeout(700);
  const h = db.st.hadiah.find((x) => x.id === 'juara23');
  c('B3 tersimpan sebagai peringkat 2 sampai 3, kuota 2', h && h.peringkat_dari === 2 && h.angka === 3 && h.kuota === 2, JSON.stringify(h));
  c('B4 baris baru berjudul Papan Total #2-3', /Papan Total #2-3$/.test(await judul('juara23')), await judul('juara23'));
});

await bagian('C. rapikan tumpang tindih', async () => {
  await p.fill('[data-hadiah=juara410] [data-f=peringkat_dari]', '11'); await p.fill('[data-hadiah=juara410] [data-f=nominal]', 'Rp30.000');
  await p.click('[data-hadiah=juara410] [data-kb=hadiah]'); await p.waitForTimeout(700);
  const isi = await p.evaluate(() => ['peringkat_dari', 'nominal'].map((f) => document.querySelector('[data-hadiah=juara410] [data-f=' + f + ']').value).join('|'));
  c('C0 baris lama yang ditolak (11 sampai 10) tetap memegang isian admin, server tidak berubah', isi === '11|Rp30.000' && db.st.hadiah.find((x) => x.id === 'juara410').peringkat_dari === 4, isi);
  await p.fill('[data-hadiah=juara410] [data-f=peringkat_dari]', '4'); await p.fill('[data-hadiah=juara410] [data-f=nominal]', 'Rp25.000');
  await p.uncheck('[data-hadiah=papanTotal] [data-f=aktif]');
  await p.click('[data-hadiah=papanTotal] [data-kb=hadiah]'); await p.waitForTimeout(700);
  const lama = db.st.hadiah.find((x) => x.id === 'papanTotal');
  c('C1 hadiah lama dimatikan tanpa mengubah rentangnya; peringatan hilang', lama.aktif === false && lama.peringkat_dari === 1 && (await peringatan()) === '', JSON.stringify(lama) + ' | ' + (await peringatan()));
  c('C2 tanpa galat JavaScript', errs.length === 0, errs.join(' | '));
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/wms-hadiah-tingkat.png', fullPage: true });
});

await b.close(); srv.close();
if (jalan !== DIHARAPKAN) { console.log('\nBAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN + '. Uji mati di tengah jalan.'); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
