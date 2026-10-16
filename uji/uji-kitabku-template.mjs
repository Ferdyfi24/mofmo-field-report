/* Uji tab Template di menu Kitabku WMS (wms/kitabku.js), 16 Okt 2026 malam.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy: arsip template desain per event disimpan di Google Drive, "lu aj
 * bangun". Tab Template mengunggah berkas desain dari WMS ke Apps Script (ArsipTemplate.gs),
 * menampilkan arsip per event, dan menandai versi final. Yang mahal kalau salah: berkas besar
 * dikirim dulu baru ditolak (HP kehabisan kuota), event kosong sehingga berkas jatuh entah ke
 * mana, tanda final tidak terlihat sehingga vendor mencetak versi lama, atau gagal unggah yang
 * diam. Server dijawab ArsipTemplate.gs yang SAMA dengan yang dipasang, di atas Drive tiruan.
 */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const require = createRequire('/home/claude/fieldreport/uji/uji-wms-alat.js');
const { chromium } = require('playwright');
const GS = process.env.ARSIP_GS || '/home/claude/arsip-template/ArsipTemplate.gs';

let gagal = 0, jalan = 0; const DIHARAPKAN = 7;
const c = (n, ok, k) => { jalan++; if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '\n   -> ' + String(k).replace(/\s*\n\s*/g, ' | ').slice(0, 500))); };
async function bagian(nama, fn) { console.log('\n=== ' + nama + ' ==='); try { await fn(); } catch (e) { gagal++; console.log('GAGAL ' + nama + ' MATI -> ' + (e && e.stack || e)); } }

/* ---------- Apps Script tiruan: Drive kecil + ArsipTemplate.gs asli ---------- */
let NID = 1, WAKTU = Date.parse('2026-10-16T10:00:00Z');
const SEMUA = {}, PANGGIL = [];
const iter = (a) => { let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; };
class Folder { constructor(n, ind) { this.id = 'F' + NID++; this.nama = n; this.ind = ind; this.anak = []; this.berkas = []; SEMUA[this.id] = this; }
  getId() { return this.id; } getName() { return this.nama; } getFoldersByName(n) { return iter(this.anak.filter((f) => f.nama === n)); } getFolders() { return iter(this.anak); }
  createFolder(n) { const f = new Folder(n, this); this.anak.push(f); return f; } getFiles() { return iter(this.berkas); } getParents() { return iter(this.ind ? [this.ind] : []); }
  createFile(b) { const f = new Berkas(b, this); this.berkas.push(f); return f; } }
class Berkas { constructor(b, ind) { this.id = 'B' + NID++; this.b = b; this.ind = ind; this.desk = ''; this.t = new Date(WAKTU += 60000); SEMUA[this.id] = this; }
  getId() { return this.id; } getName() { return this.b.nama; } getMimeType() { return this.b.mime; } getSize() { return this.b.bytes.length; } getDateCreated() { return this.t; }
  getDescription() { return this.desk; } setDescription(d) { this.desk = d; } getUrl() { return 'https://drive.google.com/file/d/' + this.id + '/view'; } getParents() { return iter([this.ind]); } }
const AKAR = new Folder('My Drive', null);
const PROP = {};
const ctxGs = vm.createContext({
  DriveApp: { getRootFolder: () => AKAR, getFolderById: (id) => { if (!(SEMUA[id] instanceof Folder)) throw new Error('x'); return SEMUA[id]; }, getFileById: (id) => { if (!(SEMUA[id] instanceof Berkas)) throw new Error('x'); return SEMUA[id]; } },
  Utilities: { base64Decode: (s) => Array.from(Buffer.from(s, 'base64')), newBlob: (bytes, mime, nama) => ({ bytes, mime, nama }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => PROP[k] || null, setProperty: (k, v) => { PROP[k] = v; } }) },
  LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
  /* WMS mengirim kata pengganti WMS-TIKET; app.js menukarnya dengan tiket yang diterima pdgKunciSah_ */
  pdgKunciSah_: (k) => k === 'WMS-TIKET', pdgTolakKunci_: () => ({ ok: false, perluKode: true, pesan: 'Kode akses salah.' }),
  JSON, Math, String, Number, Date, Array, Object
});
vm.runInContext(fs.readFileSync(GS, 'utf8'), ctxGs);
const berkasDrive = () => Object.values(SEMUA).filter((x) => x instanceof Berkas);

const AKARWMS = process.env.WMS_AKAR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/uji.html') { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return s.end('<!doctype html><html lang="id" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wms/app.css"></head><body><script>window.__wms = { S: { tiket: "t" }, bhs: function () { return "id"; }, Suara: {}, jalan: function (n, a) { return window.gasJalan(n, a); } };</script><script src="/wms/kitabku.js"></script></body></html>'); }
  const f = path.join(AKARWMS, u);
  if (!f.startsWith(AKARWMS) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css' })[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, ok));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route('**/functions/v1/kitab', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, acara: { id: 'a1', nama: '11.11 Big Sale', cap: '11.11', mulai: '2026-11-01', selesai: '2026-11-15' }, angka: {}, hadiah: [] }) }));
const p = await ctx.newPage();
await p.exposeFunction('gasJalan', (nama, args) => { PANGGIL.push({ nama, n: (JSON.stringify(args) || '').length }); const fn = ctxGs[nama]; if (typeof fn !== 'function') throw new Error('Fungsi ' + nama + ' tidak ada'); return JSON.parse(JSON.stringify(fn.apply(null, args))); });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const isi = () => p.evaluate(() => (document.getElementById('kbIsi') || {}).innerText || '');
const SAMPEL = '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/uji-template-berkas/';
fs.mkdirSync(SAMPEL, { recursive: true });
fs.writeFileSync(SAMPEL + 'kartu-qr-depan.png', Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'));
fs.writeFileSync(SAMPEL + 'poster.pdf', Buffer.from('%PDF-1.4 poster 11.11'));
fs.writeFileSync(SAMPEL + 'raksasa.png', Buffer.alloc(16 * 1024 * 1024, 1));

await bagian('A. unggah dan daftar', async () => {
  await p.goto('http://localhost:' + srv.address().port + '/uji.html');
  await p.evaluate(() => WmsKitabku.buka('template')); await p.waitForTimeout(700);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.tab-alat [data-kbtab]')].map((x) => x.getAttribute('data-kbtab') + ':' + x.textContent.trim()));
  const ev = await p.evaluate(() => (document.getElementById('kbTpAcara') || {}).value);
  c('A1 tab Template ada, nama event terisi dari event aktif, arsip kosong disebut', tabs.some((x) => /^template:Template/.test(x)) && ev === '11.11 Big Sale' && /belum ada template/i.test(await isi()), JSON.stringify([tabs, ev, (await isi()).slice(0, 200)]));
  await p.setInputFiles('#kbTpBerkas', [SAMPEL + 'kartu-qr-depan.png', SAMPEL + 'poster.pdf']);
  await p.fill('#kbTpCatatan', 'kirim ke vendor');
  await p.click('[data-kb=tpUnggah]'); await p.waitForTimeout(1500);
  const bd = berkasDrive();
  c('A2 dua berkas terunggah utuh ke folder event, catatan ikut', bd.length === 2 && bd.every((x) => x.ind.nama === '11.11 Big Sale') && Buffer.from(bd[0].b.bytes).toString('hex') === '89504e470d0a1a0a0000000d49484452' && bd.every((x) => /kirim ke vendor/.test(x.desk)), JSON.stringify(bd.map((x) => [x.b.nama, x.ind.nama, x.desk])));
  const t = await isi();
  c('A3 daftar menampilkan event dan kedua berkas, tautan Drive terbuka di tab baru', /11\.11 Big Sale/.test(t) && /kartu-qr-depan\.png/.test(t) && /poster\.pdf/.test(t) && await p.evaluate(() => [...document.querySelectorAll('#kbIsi a[href*="drive.google.com"]')].every((a) => a.target === '_blank' && /noopener/.test(a.rel)) && document.querySelectorAll('#kbIsi a[href*="drive.google.com"]').length === 2), t.slice(0, 400));
});

await bagian('B. final', async () => {
  await p.click('[data-kb=tpFinal]'); await p.waitForTimeout(800);
  const final = berkasDrive().filter((x) => JSON.parse(x.desk).final === true);
  const tanda = await p.evaluate(() => [...document.querySelectorAll('#kbIsi [data-tp-final]')].map((x) => x.getAttribute('data-tp-final')));
  await p.screenshot({ path: SAMPEL + '../template-wms-hp.png', fullPage: true });
  c('B1 tandai final tersimpan di Drive dan terlihat di daftar', final.length === 1 && tanda.filter((x) => x === '1').length === 1 && /FINAL/.test(await isi()), JSON.stringify([final.map((x) => x.b.nama), tanda]));
});

await bagian('C. tolak', async () => {
  const n0 = PANGGIL.length;
  await p.setInputFiles('#kbTpBerkas', [SAMPEL + 'raksasa.png']);
  await p.click('[data-kb=tpUnggah]'); await p.waitForTimeout(600);
  c('C1 berkas di atas 15 MB ditolak di HP, tidak dikirim ke server', /15 MB/.test(await isi()) && !PANGGIL.slice(n0).some((x) => x.nama === 'arsipTemplateUnggah'), JSON.stringify(PANGGIL.slice(n0)));
  await p.fill('#kbTpAcara', ''); await p.setInputFiles('#kbTpBerkas', [SAMPEL + 'poster.pdf']);
  await p.click('[data-kb=tpUnggah]'); await p.waitForTimeout(600);
  c('C2 event kosong: diminta isi dulu, tidak ada berkas baru', /nama event/i.test(await isi()) && berkasDrive().length === 2, (await isi()).slice(0, 300));
  /* server lama (sebelum Apps Script dideploy): fungsinya belum ada, alasannya harus kelihatan */
  await p.evaluate(() => { window.__wms.jalan = () => Promise.reject(new Error('Fungsi arsipTemplateDaftar belum masuk daftar izin WMS')); WmsKitabku.buka('template'); }); await p.waitForTimeout(500);
  c('C3 server belum siap: alasannya tampil, tidak diam, tanpa geser samping di HP', /arsipTemplateDaftar/.test(await isi()) && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && errs.length === 0, (await isi()).slice(0, 300) + ' ' + errs.join(' | '));
});

await b.close(); srv.close();
if (jalan !== DIHARAPKAN) { console.log('\nBAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN + '. Uji mati di tengah jalan.'); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
