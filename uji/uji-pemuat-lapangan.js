/* Uji pemuat aplikasi kunjungan lapangan di GitHub Pages (9 Okt 2026).
 * Harapan: "21 pemeriksaan, SEMUA LULUS". Chromium sungguhan, halaman dilayani
 * dari localhost (service worker butuh konteks aman), server Apps Script palsu.
 *
 * KENAPA UJI INI ADA. Tampilan aplikasi disimpan di HP supaya cepat dibuka, dan
 * google.script.run diganti fetch. Kalau penggantinya salah sedikit saja, petugas
 * berdiri di gerai dengan tombol yang tidak melakukan apa apa. Yang dijaga:
 * panggilan sampai ke fungsi yang benar dengan argumen yang sama, galat sampai
 * ke penangan galat (bukan diam), bukaan kedua tidak menunggu server, versi baru
 * tidak menimpa layar yang sedang diisi, dan tidak ada PIN atau tiket di alamat.
 *
 * 10 Okt 2026 (G17-G21, G14 diubah). Ferdy dari HP: "loading awal sblm muncul
 * nama indra diatas 5 detik". Yang ditambah: daftar nama ikut datang bersama
 * halaman (HP baru tidak lagi menunggu dua panggilan berurutan), pemuat tampil
 * dari simpanan HP walau sinyal lemah (tidak lagi menunggu jaringan sampai 4
 * dtk; perbaikan pemuat sampai di bukaan berikutnya), sambungan ke Google
 * dibuka lebih awal, dan alamat GitHub lama pindah ke Cloudflare
 * (mofmo-lapangan.pages.dev) dengan parameter dan #k ikut terbawa.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const AKAR = '/home/claude/fieldreport';
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
let BEDA = null, LOKAL_MATI = false, TUNDA_LOKAL = 0;
const CF = 'https://mofmo-lapangan.pages.dev';
const srv = http.createServer(async (q, s) => {
  if (LOKAL_MATI) return q.socket.destroy();
  if (TUNDA_LOKAL) await new Promise(x => setTimeout(x, TUNDA_LOKAL));
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (BEDA && /lapangan\/index\.html$/.test(p)) { s.writeHead(200, { 'Content-Type': 'text/html' }); return s.end(BEDA); }
  const f = path.join(AKAR, p.replace('/mofmo-field-report', ''));
  if (!fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});
const klien = v => `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Klien</title><style>#k{padding:8px}</style></head><body><div id="k">KLIEN-${v}</div>
<script>
window.HASIL = [];
google.script.url.getLocation(function (l) { window.LOK = l; });
window.uji = function (fn, args) { var g = google.script.run.withSuccessHandler(function (h) { HASIL.push(['ok', fn, h]); }).withFailureHandler(function (e) { HASIL.push(['gagal', fn, e && e.message]); }); g[fn].apply(g, args || []); };
uji('fapNama', []);
</script></body></html>`;
(async () => {
  await new Promise(r => srv.listen(8765, r));
  const URL0 = 'http://localhost:8765/mofmo-field-report/lapangan/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const ctx = await b.newContext();
  const S = { versi: 'v1', badan: [], urlApi: [], tunda: 0, mati: false, asal: [] };
  const pasangServer = (cx, S) => cx.route(API + '**', async r => {
    const q = r.request(); S.urlApi.push(q.method() + ' ' + q.url()); let m = {}; try { m = JSON.parse(q.postData() || '{}'); } catch (e) {}
    S.badan.push(m); S.asal.push(q.headers()['origin'] || '');
    if (S.mati) return r.abort('internetdisconnected');
    if (m.fn === '__klien' && S.tunda) await new Promise(x => setTimeout(x, S.tunda));
    let h;
    if (m.fn === '__klien') h = { pintu: 'ok', hasil: { versi: S.versi, html: m.versi === S.versi ? '' : klien(S.versi), nama: { ok: true, nama: S.nama || ['Indra'] } } };
    else if (m.fn === 'fapNama') { if (S.tundaNama) await new Promise(x => setTimeout(x, S.tundaNama)); h = { pintu: 'ok', hasil: { ok: true, nama: S.nama || ['Indra'] } }; }
    else if (m.fn === 'fopSimpanSO') h = { pintu: 'ok', hasil: { ok: false, pesan: 'SO sudah tersimpan' } };
    else if (m.fn === 'fopCheckIn') h = { pintu: 'galat', pesan: 'Kunjungan T305 sudah check-in' };
    else if (m.fn === 'putus') return r.abort('connectionreset');
    else h = { pintu: 'galat', pesan: 'tidak dibuka' };
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
  });
  await pasangServer(ctx, S);
  const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
  const p = await ctx.newPage();
  // 1. bukaan pertama
  await p.goto(URL0 + '?mode=atasan');
  await p.waitForFunction(() => window.HASIL && window.HASIL.length >= 1, null, { timeout: 8000 }).catch(() => {});
  const r1 = await p.evaluate(() => ({ teks: document.body.innerText, hasil: window.HASIL, lok: window.LOK, simpan: localStorage.getItem('lap_klien_v1'), manifest: !!document.querySelector('link[rel=manifest]') }));
  c('G1 bukaan pertama mengambil halaman aplikasi dari server lalu menampilkannya', /KLIEN-v1/.test(r1.teks) && S.badan[0] && S.badan[0].fn === '__klien' && S.badan[0].alamat === API, JSON.stringify(S.badan[0]) + ' ' + r1.teks);
  c('G2 halaman aplikasi tersimpan di HP berikut versinya', r1.simpan && JSON.parse(r1.simpan).versi === 'v1' && /KLIEN-v1/.test(JSON.parse(r1.simpan).html), String(r1.simpan).slice(0, 120));
  /* 10 Okt: nama ikut datang bersama halaman, jadi fapNama di bukaan pertama dijawab dari situ tanpa panggilan kedua.
     Argumen dan fungsi yang sampai ke server dijaga G5. */
  c('G3 google.script.run fapNama sampai ke penangan sukses dengan hasil yang sama persis, dari nama yang ikut datang bersama halaman (tanpa panggilan kedua)', JSON.stringify(r1.hasil) === JSON.stringify([['ok', 'fapNama', { ok: true, nama: ['Indra'] }]]) && !S.badan.some(x => x.fn === 'fapNama'), JSON.stringify(r1.hasil) + ' ' + JSON.stringify(S.badan.map(x => x.fn)));
  c('G4 google.script.url.getLocation membaca parameter alamat (mode atasan tetap jalan)', r1.lok && r1.lok.parameter && r1.lok.parameter.mode === 'atasan', JSON.stringify(r1.lok));
  await p.evaluate(() => { HASIL.length = 0; uji('fopSimpanSO', ['TIKET-RAHASIA', { T305: 3 }]); uji('fopCheckIn', ['TIKET-RAHASIA']); uji('putus', []); });
  await p.waitForFunction(() => HASIL.length >= 3, null, { timeout: 8000 }).catch(() => {});
  const r2 = await p.evaluate(() => HASIL.slice().sort((a, b) => a[1] < b[1] ? -1 : 1));
  const so = S.badan.filter(x => x.fn === 'fopSimpanSO')[0] || {};
  c('G5 argumen objek sampai utuh, dan ok:false milik fungsi tetap ke penangan sukses', JSON.stringify(so.args) === JSON.stringify(['TIKET-RAHASIA', { T305: 3 }]) && JSON.stringify(r2.filter(x => x[1] === 'fopSimpanSO')[0]) === JSON.stringify(['ok', 'fopSimpanSO', { ok: false, pesan: 'SO sudah tersimpan' }]), JSON.stringify(r2));
  c('G6 galat server sampai ke penangan galat dengan pesannya', JSON.stringify(r2.filter(x => x[1] === 'fopCheckIn')[0]) === JSON.stringify(['gagal', 'fopCheckIn', 'Kunjungan T305 sudah check-in']), JSON.stringify(r2));
  c('G7 sambungan putus sampai ke penangan galat dengan kalimat yang bisa dipahami', (r2.filter(x => x[1] === 'putus')[0] || [])[0] === 'gagal' && /Sambungan terputus/.test((r2.filter(x => x[1] === 'putus')[0] || [])[2]), JSON.stringify(r2));
  c('G8 tiket dan isi tidak pernah di alamat: semua ke server lewat POST tanpa query', S.urlApi.every(u => u === 'POST ' + API), JSON.stringify(S.urlApi.slice(0, 3)));
  // 2. bukaan kedua: server lambat 4 detik, aplikasi harus tampil sebelum itu
  S.tunda = 4000; S.badan.length = 0;
  const t0 = Date.now();
  await p.goto(URL0);
  await p.waitForFunction(() => /KLIEN-/.test(document.body.innerText), null, { timeout: 8000 }).catch(() => {});
  const lama = Date.now() - t0;
  const tata = await p.evaluate(() => { const k = document.getElementById('k'); const r = k ? k.getBoundingClientRect() : null;
    return { teks: document.body.innerText, sisaPemuat: !!document.getElementById('isi'), judul: document.title, atas: r ? Math.round(r.top) : null, tinggi: innerHeight }; });
  c('G9 bukaan kedua tampil dari simpanan tanpa menunggu server (server sengaja lambat 4 dtk)', lama < 2500 && /KLIEN-v1/.test(tata.teks), lama + ' ms');
  c('G13 bukaan dari simpanan MENGGANTI halaman pemuat: layar putar hilang, judul halaman milik aplikasi, aplikasinya di atas layar (bukan terdorong ke bawah)',
    !tata.sisaPemuat && tata.judul === 'Klien' && tata.atas !== null && tata.atas >= 0 && tata.atas < 100, JSON.stringify(tata).slice(0, 240));
  // versi baru di server: tersimpan, layar sekarang tidak ditimpa
  S.tunda = 0; S.versi = 'v2';
  await p.goto(URL0);
  await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('lap_klien_v1')).versi === 'v2'; } catch (e) { return false; } }, null, { timeout: 8000 }).catch(() => {});
  const r3 = await p.evaluate(() => ({ teks: document.body.innerText, versi: JSON.parse(localStorage.getItem('lap_klien_v1')).versi }));
  const cekVersi = S.badan.filter(x => x.fn === '__klien').pop() || {};
  await p.goto(URL0);
  await p.waitForFunction(() => /KLIEN-/.test(document.body.innerText), null, { timeout: 8000 }).catch(() => {});
  const r4 = await p.evaluate(() => document.body.innerText);
  c('G10 versi baru diunduh di latar, layar yang sedang terbuka tidak ditimpa, berlaku di bukaan berikutnya', cekVersi.versi === 'v1' && r3.versi === 'v2' && /KLIEN-v1/.test(r3.teks) && /KLIEN-v2/.test(r4), JSON.stringify(cekVersi) + ' ' + JSON.stringify(r3) + ' ' + r4);
  // pemuat diperbaiki di server: bukaan berikutnya harus langsung memakai pemuat baru (bukan simpanan lama)
  const asli = fs.readFileSync(path.join(AKAR, 'lapangan/index.html'), 'utf8');
  BEDA = asli.replace('<title>Kunjungan Lapangan</title>', '<title>Kunjungan Lapangan</title><meta name="penanda" content="pemuat-baru">');
  const dapat = await p.evaluate(async () => { await fetch('./'); await new Promise(x => setTimeout(x, 600)); const r = await fetch('./'); return /pemuat-baru/.test(await r.text()); });
  BEDA = null;
  c('G14 pemuat yang diperbaiki di server sampai ke HP paling lambat di bukaan berikutnya (diambil diam-diam di latar)', dapat === true, String(dapat));
  await p.evaluate(async () => { await fetch('./'); await new Promise(x => setTimeout(x, 600)); });
  // sinyal lemah: server halaman lambat 3 dtk, pemuat tetap langsung dari simpanan HP
  TUNDA_LOKAL = 3000;
  const t1 = Date.now();
  await p.goto(URL0, { timeout: 15000 });
  await p.waitForFunction(() => /KLIEN-/.test(document.body.innerText), null, { timeout: 10000 }).catch(() => {});
  const lemah = Date.now() - t1;
  TUNDA_LOKAL = 0;
  const pra = await p.evaluate(() => [...document.querySelectorAll('link[rel=preconnect]')].map(l => l.href + '|' + l.crossOrigin));
  c('G20 sinyal lemah (halaman pemuat lambat 3 dtk dari server): aplikasi tetap tampil dari simpanan HP di bawah 1,5 dtk', lemah < 1500, lemah + ' ms');
  c('G21 sambungan ke server Google dibuka sejak awal (preconnect anonim ke script.google.com dan googleusercontent)', pra.some(x => x === 'https://script.google.com/|anonymous') && pra.some(x => x === 'https://script.googleusercontent.com/|anonymous'), JSON.stringify(pra));
  // daftar nama: bukaan berikutnya langsung dari simpanan HP walau server lambat, lalu diperbarui diam-diam
  S.tundaNama = 5000; S.nama = ['Indra', 'Rafi'];
  await p.goto(URL0);
  await p.waitForFunction(() => window.HASIL && HASIL.length >= 1, null, { timeout: 3000 }).catch(() => {});
  const cepat = await p.evaluate(() => JSON.stringify(window.HASIL || []));
  await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('lap_simpan_fapNama')).nama.length === 2; } catch (e) { return false; } }, null, { timeout: 10000 }).catch(() => {});
  const segar = await p.evaluate(() => localStorage.getItem('lap_simpan_fapNama'));
  const sekali = await p.evaluate(() => (window.HASIL || []).filter(x => x[1] === 'fapNama').length);
  S.tundaNama = 0;
  c('G16 daftar nama petugas langsung tampil dari simpanan HP (server sengaja lambat 5 dtk), lalu diperbarui diam-diam, penangan dipanggil sekali', /\["ok","fapNama",\{"ok":true,"nama":\["Indra"\]\}\]/.test(cepat) && /Rafi/.test(segar || '') && sekali === 1, cepat + ' | ' + segar + ' | ' + sekali);
  // sinyal mati total: pemuat dari simpanan HP, aplikasi tetap tampil
  /* setOffline Playwright tidak berlaku untuk service worker, jadi yang dimatikan
     server GitHub tiruannya (koneksi diputus) dan server Apps Script tiruannya. */
  LOKAL_MATI = true; S.mati = true;
  let lepas = 'ok';
  try { await p.goto(URL0, { timeout: 15000 }); await p.waitForFunction(() => /KLIEN-/.test(document.body.innerText), null, { timeout: 10000 }); } catch (e) { lepas = e.message.slice(0, 80); }
  const offTeks = await p.evaluate(() => document.body.innerText).catch(() => '');
  LOKAL_MATI = false; S.mati = false;
  c('G15 sinyal mati: pemuat dari simpanan HP dan tampilan aplikasi tetap terbuka', lepas === 'ok' && /KLIEN-v2/.test(offTeks), lepas + ' ' + offTeks.slice(0, 80));
  // service worker dan manifest
  const sw = await p.evaluate(async () => { try { const r = await navigator.serviceWorker.getRegistration(); return !!r; } catch (e) { return 'galat ' + e.message; } });
  c('G11 bisa dipasang di layar utama: manifest terpasang dan service worker terdaftar', r1.manifest && sw === true, 'manifest ' + r1.manifest + ' sw ' + sw);
  // bukaan pertama di HP baru saat server mati: pesan jelas + tombol, bukan layar putih
  const p2 = await (await b.newContext()).newPage();
  await p2.context().route(API + '**', r => r.abort('internetdisconnected'));
  await p2.goto(URL0);
  await p2.waitForSelector('#bUlang', { timeout: 15000 }).catch(() => {});
  const r5 = await p2.evaluate(async () => ({ teks: document.body.innerText, tombol: !!document.getElementById('bUlang'), sw: !!(await navigator.serviceWorker.getRegistration()) }));
  c('G12 server tidak terjangkau di bukaan pertama: kalimat sebab dan tombol Coba lagi, bukan layar kosong, dan pemuat sudah tersimpan di HP', r5.tombol && r5.sw && /sambungan ke server gagal 3 kali/.test(r5.teks) && /Tidak ada data yang hilang/.test(r5.teks), JSON.stringify(r5));
  // HP baru: nama petugas datang bersama halaman, tidak menunggu panggilan kedua (fapNama sengaja lambat 5 dtk)
  const S3 = { versi: 'v1', badan: [], urlApi: [], tunda: 0, mati: false, asal: [], tundaNama: 5000, nama: ['Indra', 'Rafi'] };
  const ctx3 = await b.newContext(); await pasangServer(ctx3, S3);
  const p3 = await ctx3.newPage();
  const t3 = Date.now();
  await p3.goto(URL0);
  await p3.waitForFunction(() => window.HASIL && HASIL.length >= 1, null, { timeout: 9000 }).catch(() => {});
  const lama3 = Date.now() - t3;
  const h3 = await p3.evaluate(() => JSON.stringify(window.HASIL || []));
  c('G17 HP baru: daftar nama ikut datang bersama halaman, muncul tanpa menunggu panggilan nama kedua (server nama sengaja lambat 5 dtk)', lama3 < 3000 && /Rafi/.test(h3), lama3 + ' ms ' + h3);
  // alamat GitHub lama pindah ke Cloudflare, parameter dan tanda # ikut, tidak ada panggilan server dari alamat lama
  const S4 = { versi: 'v1', badan: [], urlApi: [], tunda: 0, mati: false, asal: [] };
  const ctx4 = await b.newContext({ serviceWorkers: 'block' }); await pasangServer(ctx4, S4);
  const layani = (awalan) => async r => { const u = new URL(r.request().url()); let f = u.pathname.replace(awalan, ''); if (f.endsWith('/')) f += 'index.html';
    const pth = path.join(AKAR, f); if (!fs.existsSync(pth)) return r.fulfill({ status: 404, body: 'x' });
    return r.fulfill({ status: 200, contentType: jenis[path.extname(pth)] || 'application/octet-stream', body: fs.readFileSync(pth) }); };
  await ctx4.route('https://ferdyfi24.github.io/**', layani('/mofmo-field-report'));
  await ctx4.route(CF + '/**', layani(''));
  const p4 = await ctx4.newPage();
  await p4.goto('https://ferdyfi24.github.io/mofmo-field-report/lapangan/?mode=atasan#uji');
  await p4.waitForURL(u => String(u).indexOf(CF) === 0, { timeout: 8000 }).catch(() => {});
  const u4 = p4.url();
  await p4.goto('https://ferdyfi24.github.io/mofmo-field-report/#k=KJ-20261009-AB12');
  await p4.waitForURL(u => String(u).indexOf(CF) === 0, { timeout: 8000 }).catch(() => {});
  const u5 = p4.url();
  await p4.waitForTimeout(500);
  c('G18 alamat GitHub lama aplikasi lapangan pindah ke Cloudflare dengan parameter dan # utuh, tanpa satu pun panggilan server dari alamat lama', u4 === CF + '/lapangan/?mode=atasan#uji' && !S4.asal.some(a => /github\.io/.test(a)), u4 + ' asal ' + JSON.stringify(S4.asal));
  c('G19 alamat GitHub lama laporan lapangan (tautan kartu Chat lama) pindah ke Cloudflare dengan #k utuh', u5 === CF + '/#k=KJ-20261009-AB12', u5);
  cek.forEach(([n, ok, k]) => console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : ' -> ' + String(k).slice(0, 300))));
  const g = cek.filter(x => !x[1]).length;
  console.log(cek.length + ' pemeriksaan, ' + (g ? g + ' GAGAL' : 'SEMUA LULUS') + (cek.length !== 21 ? ' BAHAYA: harusnya 21' : ''));
  await b.close(); srv.close(); process.exit(g ? 1 : 0);
})().catch(e => { console.log('MATI ' + e.message); process.exit(1); });
