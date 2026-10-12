/* Uji Musim jualan WMS (wms/musim.js, tab di Kontrol), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Kalender jualan memberi tanggal acara, pcs per pekan,
 * dan daftar periksa sebelum acara. Kesalahan yang mahal: akhir pekan gajian
 * jatuh di tanggal yang salah, "kenaikan" dihitung tanpa riwayat yang cukup
 * (angka besar yang menyesatkan), centang dari satu HP menimpa centang dari
 * HP lain, dan acara tanpa tanggal masuk kalender.
 * Hari ini 12 Okt 2026. Penjualan per pekan (Senin): 31 Agu 2, 7 Sep 2, 14 Sep 4, 21 Sep 2, 28 Sep 2, 5 Okt 9 (pekan 10.10).
 * 10.10: 9 pcs lawan rata-rata 4 pekan sebelumnya (2+4+2+2)/4 = 2,5 -> 3,6x.
 * Gajian Oktober: 25 Okt hari Minggu -> Sabtu 24 dan Minggu 25 (12 hari lagi).
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 16;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const L = { T305: 0, HO: 1, TERJUAL: 2, OPENING: 3 };
const jual = (t, q) => [t, 0, q, L.T305, L.TERJUAL];
const DATA = { ok: true, hariIni: '2026-10-12', diperbarui: '12 Oct 2026 07:00', lok: [{ k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', r: 'TGI', toko: 1 }, { k: 'HO', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }],
  prod: [{ b: '1', n: 'MofmoFriends S - Bear', h: 194250, hs: 175000 }],
  baris: [['2026-08-03', 0, 50, L.OPENING, L.T305], jual('2026-09-01', 2), jual('2026-09-08', 2), jual('2026-09-15', 4), jual('2026-09-22', 2), jual('2026-09-29', 2), jual('2026-10-10', 9)] };
let MS = null;
try { const kotak = { window: { __wms: { bhs: () => 'id' } }, console }; kotak.window.window = kotak.window; vm.createContext(kotak); vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/musim.js'), 'utf8'), kotak); MS = kotak.window.WmsMusim; } catch (e) { c('A0 musim.js termuat', false, e.message); }
try {
  c('A1 akhir pekan gajian: Okt 2026 (25 = Minggu) 24-25 Okt; Sep 2026 (25 = Jumat) 26-27 Sep; Jul 2026 (25 = Sabtu) 25-26 Jul',
    MS._gajian('2026-10').join() === '2026-10-24,2026-10-25' && MS._gajian('2026-09').join() === '2026-09-26,2026-09-27' && MS._gajian('2026-07').join() === '2026-07-25,2026-07-26', [MS._gajian('2026-10'), MS._gajian('2026-09'), MS._gajian('2026-07')].join(' | '));
  const B = MS.acaraBawaan('2026-10-12'), t10 = B.find(a => a.id === 'bawaan-2026-10-10') || {}, im = B.find(a => /imlek/.test(a.id)) || {};
  c('A2 acara bawaan: 10.10 Shopee dengan 3 tugas (batas 5, 8, 9 Okt); Imlek 2027 ditandai perkiraan; 11.11 dan 12.12 ada',
    t10.mulai === '2026-10-10' && t10.kanal === 'Shopee' && (t10.cek || []).map(x => x.batas).join() === '2026-10-05,2026-10-08,2026-10-09' && /perkiraan/.test(im.nama || '') && B.some(a => a.id === 'bawaan-2026-11-11') && B.some(a => a.id === 'bawaan-2026-12-12'), JSON.stringify([t10, im.nama]));
  const H = MS.hitung(DATA, [], '2026-10-12');
  const p5 = H.pekan.find(p => p.senin === '2026-10-05') || {};
  c('A3 pekan mulai dari awal data 3 Agu (bukan 15 pekan sebelum hari ini); pekan 5 Okt 9 pcs berisi 10.10; pekan sesudah hari ini ditandai belum terjadi',
    H.pekan[0].senin === '2026-08-03' && p5.pcs === 9 && p5.acara.indexOf('bawaan-2026-10-10') > -1 && H.pekan.find(p => p.senin === '2026-10-19').masaDepan === true && p5.masaDepan === false, JSON.stringify([H.pekan[0], p5]));
  const a10 = H.acara.find(a => a.id === 'bawaan-2026-10-10') || {}, anak = H.acara.find(a => /anak/.test(a.id)) || {};
  c('A4 kenaikan 10.10: 9 pcs lawan rata-rata 2,5 = 3,6x; Hari Anak (sebelum ada data) tanpa angka kenaikan', a10.kenaikan && a10.kenaikan.pcs === 9 && a10.kenaikan.rata === 2.5 && Math.abs(a10.kenaikan.rasio - 3.6) < 1e-9 && anak.kenaikan === null, JSON.stringify([a10.kenaikan, anak.kenaikan]));
  c('A5 acara berikutnya dari 12 Okt: Akhir pekan gajian 24 Okt, 12 hari lagi', H.berikut && H.berikut.id === 'bawaan-gajian-2026-10' && H.berikut.hariLagi === 12, JSON.stringify(H.berikut));
  const H2 = MS.hitung(DATA, [{ id: 'bawaan-gajian-2026-10', bawaan: true, cek: [{ teks: 'Stok gerai yang laris dipastikan cukup', selesai: true }] }, { id: 'acr-x', nama: 'Bazar sekolah', mulai: '2026-10-20', selesai: '2026-10-21', kanal: 'Gerai', cek: [] }], '2026-10-12');
  c('A6 centang tersimpan menempel ke acara bawaan; acara tambahan 20 Okt jadi acara berikutnya', H2.acara.find(a => a.id === 'bawaan-gajian-2026-10').cek[0].selesai === true && H2.berikut.id === 'acr-x' && H2.berikut.hariLagi === 8, JSON.stringify(H2.berikut));
} catch (e) { c('A MATI', false, e.stack); }

async function bagianB() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { c('B0 playwright', false, e.message); return; }
  const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
  const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
  const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
  const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(AKAR, p); if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); } s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f)); });
  const PAPAN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title><style>#layarIsi{display:none}</style></head><body><div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div><div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div><h1>Papan Data</h1></div><div id="kopKanan"></div></div></header><nav id="panel"></nav><div id="isi"></div></div><script>function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
  await new Promise(r => srv.listen(8787, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [], DIALOG = [], SIMPAN = [];
  let SERVER = { deploy: true, versi: 0, acara: [], bentrok: false };
  const pasang = async ctx => {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar: ' + r.request().url()); r.abort(); });
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {} const n = m.nama, a = m.args || []; let h;
      if (n === 'dataPapan') h = { pintu: 'ok', hasil: DATA };
      else if (!SERVER.deploy) h = { pintu: 'galat', pesan: 'Fungsi "' + n + '" tidak dibuka untuk WMS.' };
      else if (n === 'bacaMusim') h = { pintu: 'ok', hasil: { ok: true, versi: SERVER.versi, acara: SERVER.acara } };
      else if (n === 'simpanMusim') { SIMPAN.push(a); if (SERVER.bentrok || a[1] !== SERVER.versi) { SERVER.bentrok = false; SERVER.versi += 1; h = { pintu: 'ok', hasil: { ok: false, sebab: 'versi', versi: SERVER.versi, acara: SERVER.acara } }; } else { SERVER.versi += 1; SERVER.acara = a[2]; h = { pintu: 'ok', hasil: { ok: true, versi: SERVER.versi, acara: SERVER.acara } }; } }
      else h = { pintu: 'galat', pesan: 'x' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => { let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {} let h; if (m.fn === 'masuk') h = { ok: true, tiket: 'T', ingat: true }; else if (m.fn === 'ambil') { const w = new Date(Date.now() - 60000).toISOString(); const o = { 'dataPapan|["K"]': DATA, 'klien|papan': { ok: true, versi: 'ms', html: PAPAN }, 'klien|versi': { ok: true, versi: 'ms' } }; const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; }); h = { ok: true, isi }; } else h = { ok: false }; await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) }); });
  };
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const masuk = async p => {
    p.on('pageerror', e => galat.push(e.message)); p.on('dialog', d => { DIALOG.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8787/wms/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'id'); localStorage.setItem('wms_maskot', 'off'); });
    await p.reload(); await p.waitForSelector('#kode', { timeout: 8000 }); await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    const t0 = Date.now(); while (Date.now() - t0 < 12000) { const f = p.frames().find(x => x !== p.mainFrame()); try { if (f && await f.evaluate(() => !!document.querySelector('[data-wms=kontrol]'))) return f; } catch (e) {} await jeda(100); } return null;
  };
  const bukaMusim = async (p, fr) => { await fr.evaluate(() => document.querySelector('[data-wms=kontrol]').click()); await p.waitForSelector('#kontrol [data-kontrol-tab=musim]', { timeout: 8000 }).catch(() => {}); await p.click('#kontrol [data-kontrol-tab=musim]').catch(() => {}); await p.waitForSelector('#kontrol .ms-grafik', { timeout: 8000 }).catch(() => {}); await jeda(400); };
  const atas = p => p.evaluate(() => (document.querySelector('#kontrol .ms-atas') || {}).innerText || '');
  try {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } }); await pasang(ctx);
    const p = await ctx.newPage(); const fr = await masuk(p); if (fr) await bukaMusim(p, fr);
    const t1 = await atas(p), kol = await p.evaluate(() => { const k = document.querySelector('#kontrol [data-musim-pekan="2026-10-05"]'); return k ? { kelas: k.className, judul: k.title } : null; });
    c('B1 tab Musim jualan: "Hari ini 12 Okt", acara berikutnya Akhir pekan gajian dalam 12 hari (0 dari 1 tugas); kolom pekan 5 Okt berwarna acara dengan 9 pcs dan nama 10.10',
      /Hari ini 12 Okt/.test(t1) && /Akhir pekan gajian dalam 12 hari/.test(t1) && /0 dari 1 tugas/.test(t1) && kol && /acara/.test(kol.kelas) && /9 pcs/.test(kol.judul) && /10\.10/.test(kol.judul), JSON.stringify([t1, kol]));
    await p.click('#kontrol [data-musim-pilih="bawaan-2026-10-10"]').catch(() => {}); await jeda(150);
    const r1 = await p.evaluate(() => (document.querySelector('#kontrol .ms-kartu') || {}).innerText || '');
    c('B2 kartu 10.10: 9 pcs di pekan acara, 3,6x rata-rata 4 pekan sebelumnya; daftar periksa 3 tugas', /9 pcs di pekan acara, 3,6x/.test(r1) && (r1.match(/batas/g) || []).length === 3, r1);
    await p.click('#kontrol [data-musim-pilih="bawaan-gajian-2026-10"]').catch(() => {}); await jeda(150);
    await p.check('#kontrol [data-musim-acara="bawaan-gajian-2026-10"] [data-musim-cek="0"]').catch(() => {});
    await p.waitForFunction(() => /1 dari 1 tugas/.test((document.querySelector('#kontrol .ms-atas') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    const s1 = SIMPAN[0] || [];
    c('B3 centang tugas gajian: simpanMusim(versi 0, acara bawaan dengan centang saja), lalu "1 dari 1 tugas"', s1[1] === 0 && JSON.stringify(s1[2]) === JSON.stringify([{ id: 'bawaan-gajian-2026-10', bawaan: true, cek: [{ teks: 'Stok gerai yang laris dipastikan cukup', batas: '2026-10-21', selesai: true }] }]) && /1 dari 1 tugas/.test(await atas(p)), JSON.stringify(s1));
    await p.click('#kontrol [data-musim=tambah]'); await p.fill('#msNama', 'Bazar sekolah'); await p.fill('#msMulai', '2026-10-21'); await p.fill('#msSelesai', '2026-10-20'); await p.click('#msForm [type=submit]'); await jeda(150);
    const g1 = await p.evaluate(() => (document.getElementById('msGalat') || {}).textContent || '');
    c('B4 acara dengan tanggal selesai sebelum mulai ditolak di halaman, tidak dikirim ke server', /wajib/.test(g1) && SIMPAN.length === 1, g1 + ' ' + SIMPAN.length);
    await p.fill('#msSelesai', '2026-10-22'); await p.fill('#msKanal', 'Gerai'); await p.fill('#msCek', 'Kirim display\nCek stok'); await p.click('#msForm [type=submit]');
    await p.waitForFunction(() => /Bazar sekolah dalam 9 hari/.test((document.querySelector('#kontrol .ms-atas') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    const s2 = SIMPAN[1] || [], baru = ((s2[2] || []).find(x => x.nama === 'Bazar sekolah')) || {};
    c('B5 acara tambahan tersimpan (versi 1, centang gajian tetap ikut) dan jadi acara berikutnya dalam 9 hari, dengan 2 tugas', s2[1] === 1 && (s2[2] || []).length === 2 && baru.mulai === '2026-10-21' && baru.cek.length === 2 && /Bazar sekolah dalam 9 hari/.test(await atas(p)), JSON.stringify(s2));
    SERVER.bentrok = true;
    /* klik sekali (bukan check(): check() mengklik ulang kalau centangnya dibatalkan, padahal batalnya memang yang diuji) */
    await p.click('#kontrol [data-musim-acara] [data-musim-cek="1"]').catch(() => {}); await jeda(400);
    const b1 = await p.evaluate(() => (document.querySelector('#kontrol .ms-catatan[role=status]') || {}).innerText || '');
    if (process.env.DEBUG) console.log('DBG', SIMPAN.length, JSON.stringify(SIMPAN.slice(-1)).slice(0, 300), await p.evaluate(() => (document.querySelector('#kontrol .ms-rinci') || {}).innerHTML.slice(0, 600)));
    c('B6 simpanan bertabrakan dengan perangkat lain: ditolak server, isi terbaru dimuat, pesan meminta mengulang', /perangkat lain/.test(b1), b1);
    await p.click('#kontrol [data-musim-pilih="' + baru.id + '"]').catch(() => {}); await jeda(150);
    await p.click('#kontrol [data-musim=hapus]').catch(() => {}); await jeda(100);
    const kf = await p.evaluate(() => (document.querySelector('#kontrol .ptk-konfirmasi') || {}).innerText || ''); const n0 = SIMPAN.length;
    await p.click('#kontrol [data-musim=hapusYa]').catch(() => {}); await jeda(400);
    const s3 = SIMPAN[SIMPAN.length - 1] || [];
    c('B7 hapus acara tambahan meminta konfirmasi di halaman dulu, lalu dikirim tanpa acara itu', /semua perangkat/.test(kf) && SIMPAN.length === n0 + 1 && !(s3[2] || []).some(x => x.id === baru.id), JSON.stringify([kf, s3]));
    c('B8 tanpa dialog peramban dan tanpa tanda pisah panjang', DIALOG.length === 0 && !(await p.evaluate(() => /—/.test(document.getElementById('kontrol').innerText))), DIALOG.join('|'));
    await ctx.close();
    SERVER.deploy = false;
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); await pasang(ctx2);
    const hp = await ctx2.newPage(); const fr2 = await masuk(hp); let t9 = {};
    if (fr2) { await bukaMusim(hp, fr2); t9 = await hp.evaluate(() => ({ cat: (document.querySelector('#kontrol .ms-catatan') || {}).innerText || '', grafik: document.querySelectorAll('#kontrol .ms-kolom').length, tambah: !!(document.querySelector('#kontrol [data-musim=tambah]') || {}).disabled, lebar: Math.max(document.documentElement.scrollWidth, document.getElementById('kontrol').scrollWidth) })); }
    c('B9 sebelum Apps Script di-deploy: grafik dan acara bawaan tetap tampil, tombol Tambah terkunci dengan keterangan jujur; HP 390 px tanpa geser samping', /deploy/.test(t9.cat || '') && t9.grafik > 10 && t9.tambah && t9.lebar <= 392, JSON.stringify(t9));
    await ctx2.close();
  } catch (e) { c('B MATI', false, e.stack); }
  c('B10 tanpa galat JavaScript dan tanpa pustaka dari CDN', galat.length === 0, galat.join(' | ').slice(0, 400));
  await b.close(); srv.close();
}
bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
