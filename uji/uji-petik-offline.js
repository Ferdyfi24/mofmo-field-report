/* Uji Petik tanpa sinyal WMS (wms/petik.js + alat.js + sw.js), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Sinyal di dalam gudang sering hilang. Picking yang
 * berhenti karena menunggu server berarti orang berdiri di depan rak, dan
 * tembakan yang hilang berarti surat jalan yang tidak sama dengan isi kardus.
 * Yang diperiksa:
 *  - aturan Petik tetap jalan tanpa sinyal dari peta gudang tersimpan:
 *    lokasi dulu, barcode harus cocok, isi rak tidak boleh terlampaui,
 *    tembakan dobel diabaikan;
 *  - angkatan tersimpan di HP dan TIDAK hilang saat halaman dimuat ulang
 *    tanpa sinyal (service worker);
 *  - begitu sinyal kembali, antrean terkirim sendiri; jawaban yang hilang di
 *    jalan membuat HP mengirim ulang NOMOR YANG SAMA (server menolak ganda);
 *  - penolakan server berhenti di angkatan itu, dengan alasannya;
 *  - Scan & cari tetap menemukan lokasi tanpa sinyal.
 */
const fs = require('fs'), path = require('path'), http = require('http');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 11;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);

const DATA = { ok: true, diperbarui: '2026-10-12 08:00', hariIni: '2026-10-12',
  lok: [{ k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'TERJUAL', toko: 0 }],
  prod: [{ b: '4582586967015', n: 'MOFMOFRIENDS key charm - Bear', s: 'MF-KC-001' }, { b: '4582586963000', n: 'MofmoFriends S - Reindeer', s: 'MF-PLU-040' }], baris: [] };
const GUDANG = { ok: true, lokasi: [
  { kode: 'R1-4A', sku: 'KC Bear', barcode: '4582586967015', isi: 74, kap: 120, zona: 'RACK', unit: 'R1', level: 4, pos: 'A', peran: 'PICK' },
  { kode: 'T2-3A', sku: 'S Reindeer', barcode: '4582586963000', isi: 1, kap: 16, zona: 'TABLE', unit: 'T2', level: 3, pos: 'A', peran: 'PICK' }] };

async function main() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { c('B0 playwright', false, e.message); return; }
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
    '<script>function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
  await new Promise(r => srv.listen(8784, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [], DIALOG = [], KIRIM = [], TERTULIS = {}, PERCOBAAN = [];
  let MODE = 'ok', LURING = false;
  /* Rute tiruan Playwright tidak ikut setOffline, jadi tiruan server sendiri yang memutus saat luring. */
  const luring = async v => { LURING = v; await ctx.setOffline(v); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'allow' });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar: ' + r.request().url()); r.abort(); });
  await ctx.route(API + '**', async r => {
    let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    if (m.nama === 'wmsAntrePetik') PERCOBAAN.push(LURING ? 'luring' : 'daring');
    if (LURING) return r.abort('internetdisconnected');
    let h;
    if (m.nama === 'dataPapan') h = { pintu: 'ok', hasil: DATA };
    else if (m.nama === 'wmsAntrePetik') {
      const a = (m.args || [])[1] || {}; KIRIM.push(a);
      /* server tiruan berlaku seperti AntreanGudang.gs: nomor yang sudah tertulis tidak ditulis lagi */
      if (MODE === 'tolak') h = { pintu: 'ok', hasil: { ok: false, sebab: 'lebih', pesan: 'Lokasi T2-3A isinya 1 pcs dan 1 pcs sudah diangkat dari situ.', id: a.id } };
      else { const ulang = !!TERTULIS[a.id]; TERTULIS[a.id] = (TERTULIS[a.id] || 0) + (ulang ? 0 : 1); h = { pintu: 'ok', hasil: { ok: true, ulang, id: a.id, pesan: ulang ? 'sudah tercatat' : 'tersimpan' } }; }
      if (MODE === 'putus') { MODE = 'ok'; return r.abort('connectionreset'); }
    } else h = { pintu: 'galat', pesan: 'Fungsi "' + m.nama + '" tidak dibuka untuk WMS.' };
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
  });
  await ctx.route(SUPA, async r => {
    if (LURING) return r.abort('internetdisconnected');
    let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    let h;
    if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
    else if (m.fn === 'ambil') {
      const w = new Date(Date.now() - 60000).toISOString();
      const o = { 'dataPapan|["K"]': DATA, 'wmsGudang|["K"]': GUDANG, 'klien|papan': { ok: true, versi: 'ptk', html: PAPAN }, 'klien|versi': { ok: true, versi: 'ptk' } };
      const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
      h = { ok: true, isi };
    } else h = { ok: false };
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
  });
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const p = await ctx.newPage();
  p.on('pageerror', e => galat.push(e.message)); p.on('dialog', d => { DIALOG.push(d.message()); d.dismiss().catch(() => {}); });
  const tembak = async kode => { await p.fill('#ptkKode', kode); await p.press('#ptkKode', 'Enter'); await jeda(30); return p.evaluate(() => (document.getElementById('ptkPesan') || {}).textContent || ''); };
  const bukaPetik = async () => {
    await p.evaluate(() => window.WmsAlat.buka('petik'));
    await p.waitForSelector('#ptkForm', { timeout: 8000 }).catch(() => {});
    await jeda(300);
  };
  try {
    await p.goto('http://localhost:8784/wms/');
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'id'); localStorage.setItem('wms_maskot', 'off'); localStorage.removeItem('wms_petik_antre'); localStorage.removeItem('wms_petik_kini'); localStorage.removeItem('wms_alat_simpan'); });
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    await p.waitForFunction(() => !!(window.__wms && window.__wms.S && window.__wms.S.tiket), null, { timeout: 10000 }).catch(() => {});
    await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready).catch(() => {});
    await bukaPetik();
    const t1 = await p.evaluate(() => ({ tab: !!document.querySelector('#alat [data-tab=petik][aria-selected=true]'), simpan: JSON.parse(localStorage.getItem('wms_alat_simpan') || '{}'), sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller) }));
    c('B1 tab Petik di alat Scan; peta gudang (2 lokasi) dan Master Produk tersimpan di HP saat ada sinyal; service worker aktif',
      t1.tab && ((t1.simpan.gudang || {}).lokasi || []).length === 2 && ((t1.simpan.data || {}).prod || []).length === 2 && t1.sw, JSON.stringify({ tab: t1.tab, n: ((t1.simpan.gudang || {}).lokasi || []).length, sw: t1.sw }));

    await luring(true); await jeda(200);
    await p.fill('#ptkRef', 'RK-20261012-01'); await p.fill('#ptkOleh', 'Rudi');
    const m0 = await tembak('4582586967015');
    const m1 = await tembak('R1-4A');
    const m2 = await tembak('4582586967015'); await jeda(450);
    const m3 = await tembak('4582586967015'); const m4 = await tembak('4582586967015'); await jeda(450);
    const m5 = await tembak('4582586963000');
    c('B2 tanpa sinyal: barang sebelum lokasi ditolak; R1-4A dikenali dari peta tersimpan; 2 tembakan KC Bear tercatat, tembakan dobel dalam 400 ms diabaikan; barcode lain di R1-4A ditolak menyebut isi terdaftarnya',
      /lokasinya dulu/.test(m0) && /R1-4A : KC Bear/.test(m1) && /1 pcs KC Bear/.test(m2) && /2 pcs KC Bear/.test(m3) && /dobel/.test(m4) && /terdaftar berisi KC Bear/.test(m5), JSON.stringify([m0, m1, m2, m3, m4, m5]));
    await tembak('T2-3A'); await jeda(450);
    const m6 = await tembak('4582586963000'); await jeda(450);
    const m7 = await tembak('4582586963000');
    c('B3 isi rak dijaga: T2-3A isinya 1 pcs, tembakan kedua ditolak', /1 pcs S Reindeer/.test(m6) && /isinya 1 pcs/.test(m7), JSON.stringify([m6, m7]));
    await p.click('#alat [data-ptk=simpan]'); await jeda(300);
    const t4 = await p.evaluate(() => ({ antre: JSON.parse(localStorage.getItem('wms_petik_antre') || '[]'), status: (document.querySelector('#alat .ptk-status') || {}).innerText || '', chip: (document.querySelector('#alat .ptk-antre-baris .ptk-chip') || {}).innerText || '' }));
    const a0 = t4.antre[0] || {};
    c('B4 Simpan angkatan tanpa sinyal: 1 angkatan di antrean HP (R1-4A 2 pcs, T2-3A 1 pcs) berstatus "Tersimpan di HP"; tidak ada kiriman ke server',
      t4.antre.length === 1 && a0.ref === 'RK-20261012-01' && a0.oleh === 'Rudi' && JSON.stringify(a0.baris.map(x => x.lokasi + ':' + x.qty)) === '["R1-4A:2","T2-3A:1"]' && /^ptk-/.test(a0.id) && /Tersimpan di HP/.test(t4.chip) && /Tanpa sinyal/.test(t4.status) && KIRIM.length === 0 && PERCOBAAN.length === 0,
      JSON.stringify([t4, KIRIM.length, PERCOBAAN]));

    await p.reload().catch(() => {});
    await p.waitForFunction(() => !!window.WmsAlat, null, { timeout: 10000 }).catch(() => {});
    let t5 = { alat: false };
    try { await bukaPetik(); t5 = await p.evaluate(() => ({ alat: !!window.WmsPetik, antre: JSON.parse(localStorage.getItem('wms_petik_antre') || '[]').length, peta: (document.querySelector('#alat .alat-simpanan') || {}).innerText || '' })); } catch (e) { t5.err = e.message; }
    const m8 = t5.alat ? await tembak('R1-4A') : '';
    c('B5 halaman dimuat ulang TANPA sinyal: WMS tetap terbuka (service worker), antrean masih ada, Petik memakai peta tersimpan dan mengenali R1-4A',
      t5.alat && t5.antre === 1 && /tersimpan di HP/.test(t5.peta) && /R1-4A : KC Bear/.test(m8), JSON.stringify([t5, m8]));

    MODE = 'putus';
    await luring(false);
    await p.evaluate(() => window.dispatchEvent(new Event('online')));
    await jeda(800);
    await p.evaluate(() => window.WmsPetik._kirim()); await jeda(800);
    const t6 = await p.evaluate(() => JSON.parse(localStorage.getItem('wms_petik_antre') || '[]').map(x => x.status));
    const ids = KIRIM.map(x => x.id);
    c('B6 sinyal kembali: antrean terkirim sendiri; jawaban pertama putus di jalan, HP mengirim ulang NOMOR YANG SAMA, server cuma menulis sekali; status jadi Terkirim',
      KIRIM.length >= 2 && ids.every(x => x === ids[0]) && TERTULIS[ids[0]] === 1 && t6.join(',') === 'terkirim' && KIRIM[0].baris.length === 2 && KIRIM[0].baris[0].barcode === '4582586967015', JSON.stringify([ids, TERTULIS, t6]));

    MODE = 'tolak';
    await p.fill('#ptkRef', 'RK-20261012-02');
    await tembak('T2-3A'); await jeda(450); await tembak('4582586963000');
    await p.click('#alat [data-ptk=simpan]');
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('wms_petik_antre') || '[]').some(x => x.status === 'ditolak'), null, { timeout: 8000 }).catch(() => {});
    const n7 = KIRIM.length; await jeda(400); await p.evaluate(() => window.WmsPetik._kirim()); await jeda(400);
    const t7 = await p.evaluate(() => (document.querySelector('#alat .s-ditolak') || {}).innerText || '');
    c('B7 penolakan server: angkatan kedua berstatus "Ditolak server" dengan alasannya, dan tidak dikirim ulang sendiri', /Ditolak server/.test(t7) && /isinya 1 pcs/.test(t7) && KIRIM.length === n7, t7 + ' ' + KIRIM.length + '/' + n7);
    const idTolak = await p.evaluate(() => (JSON.parse(localStorage.getItem('wms_petik_antre') || '[]').find(x => x.status === 'ditolak') || {}).id);
    await p.click('#alat .s-ditolak [data-ptk=hapus]'); await jeda(150);
    const konf = await p.evaluate(() => (document.querySelector('#alat .ptk-konfirmasi') || {}).innerText || '');
    await p.click('#alat [data-ptk=hapusYa]'); await jeda(150);
    const sisa = await p.evaluate(() => JSON.parse(localStorage.getItem('wms_petik_antre') || '[]').map(x => x.id));
    c('B8 Hapus angkatan yang ditolak meminta konfirmasi di halaman dulu, lalu hilang dari HP', /dikembalikan/.test(konf) && sisa.indexOf(idTolak) < 0 && sisa.length === 1, JSON.stringify([konf, sisa]));

    await luring(true);
    await p.click('#alat [data-tab=scan]'); await jeda(100);
    await p.evaluate(() => { window.WmsAlat.tutup(); });
    await p.evaluate(() => window.WmsAlat.buka('scan')); await jeda(150);
    await p.fill('#alatKode', 'T2-3A'); await p.press('#alatKode', 'Enter'); await jeda(500);
    const t9 = await p.evaluate(() => (document.getElementById('alatHasil') || {}).innerText || '');
    await luring(false);
    c('B9 Scan & cari tanpa sinyal tetap menemukan T2-3A (S Reindeer) dari peta tersimpan, dengan keterangan bahwa datanya simpanan HP', /T2-3A/.test(t9) && /S Reindeer/.test(t9) && /tersimpan di HP/.test(t9), t9.slice(0, 300));
    const lebar = await (async () => { await p.setViewportSize({ width: 390, height: 844 }); await p.click('#alat [data-tab=petik]'); await jeda(200); return p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.getElementById('alat').scrollWidth)); })();
    c('B10 HP 390 px tanpa geser samping; tanpa dialog peramban; tanpa tanda pisah panjang', lebar <= 392 && DIALOG.length === 0 && !(await p.evaluate(() => /—/.test(document.getElementById('alat').innerText))), lebar + ' ' + DIALOG.join('|'));
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('B11 tidak ada galat JavaScript dan tidak ada pustaka dari CDN', galat.length === 0, galat.join(' | ').slice(0, 400));
  await b.close(); srv.close();
}
main().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
