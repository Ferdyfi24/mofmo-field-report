/* Uji Rute kunjungan WMS (wms/rute.js, tombol Rute di panel Jadwal), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy minta rute "keduanyaa": urutan dari koordinat +
 * tautan Google Maps, dan waktu tempuh nyata. Indra memakai urutan ini untuk
 * berangkat; jam tiba dijanjikan ke mitra 13.00 sampai 20.00. Kesalahan yang
 * mahal: jarak dihitung dengan rumus datar (urutan salah), gerai tanpa
 * koordinat diam-diam hilang dari rute, tautan Maps tujuan/singgahnya
 * tertukar, jam tiba tidak menghitung lama di gerai, kedatangan sebelum 13.00
 * tidak ditandai, dan menutup Rute ikut menutup Jadwal yang belum disimpan.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 13;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);

const TITIK = { HO: { kode: 'HO', nama: 'HO - HAERY OFFICE', lat: -6.2, lng: 106.8 }, T305: { kode: 'T305', nama: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', lat: -6.243889, lng: 106.65445 },
  T311: { kode: 'T311', nama: 'TOYS KINGDOM MARGO CITY DEPOK', lat: -6.372972, lng: 106.834806 }, T317: { kode: 'T317', nama: 'TOYS KINGDOM MALL ARTHA GADING', lat: -6.145576, lng: 106.892239 },
  T390: { kode: 'T390', nama: 'TOYS KINGDOM LIVING WORLD KOTA WISATA CIBUBUR', lat: -6.36921, lng: 106.95919 }, 'MAA-SGI': { kode: 'MAA-SGI', nama: 'MAA SEIBU', lat: -6.1956278, lng: 106.821875 },
  'MAA-PIM2': { kode: 'MAA-PIM2', nama: 'MAA PIM 2', lat: -6.2657083, lng: 106.7842972 } };

/* ================= A. hitungan (Node) ================= */
let R = null;
try {
  const kotak = { window: {}, console }; kotak.window.window = kotak.window; kotak.window.document = { addEventListener() {} }; vm.createContext(kotak);
  vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/rute.js'), 'utf8'), kotak);
  R = kotak.window.WmsRute;
} catch (e) { c('A0 rute.js termuat', false, e.message); }
try {
  const d1 = R._jarakKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }), d2 = R._jarakKm({ lat: -6, lng: 106 }, { lat: -6, lng: 107 });
  c('A1 jarak haversine: 1 derajat lintang 111,19 km, 1 derajat bujur di lintang -6 110,58 km (bukan rumus datar)', Math.abs(d1 - 111.195) < 0.02 && Math.abs(d2 - 110.585) < 0.05, d1 + ' ' + d2);
  const u = R._urutkan(TITIK.HO, ['T305', 'KIY-PIK', 'T311', 'T317'], TITIK);
  c('A2 urutan tetangga terdekat dari HO: T317 (11,9 km), T311, lalu T305; KIY-PIK tanpa koordinat dipisah, tidak hilang',
    u.urutan.map(x => x.kode).join() === 'T317,T311,T305' && Math.abs(u.urutan[0].km - 11.9) < 0.2 && u.tanpa.join() === 'KIY-PIK', JSON.stringify(u));
  const l = R._tautanMaps(TITIK.HO, u.urutan, TITIK);
  c('A3 tautan Google Maps: asal HO, tujuan gerai terakhir (T305), singgah T317 lalu T311, berkendara',
    /origin=-6\.2%2C106\.8&/.test(l) && /destination=-6\.243889%2C106\.65445&/.test(l) && /waypoints=-6\.145576%2C106\.892239%7C-6\.372972%2C106\.834806&/.test(l) && /travelmode=driving$/.test(l), l);
  const t = R._perkiraanTiba([{ ke: 'A', detik: 900 }, { ke: 'B', detik: 1800 }, { ke: 'C', detik: 2700 }], 720, 60);
  c('A4 jam tiba memakai lama di gerai: berangkat 12.00, tiba A 12.15 (sebelum 13.00, ditandai), B 13.45, C 15.30', t.map(x => x.kode + ':' + x.tiba + ':' + x.luar).join() === 'A:735:true,B:825:false,C:930:false', JSON.stringify(t));
} catch (e) { c('A MATI', false, e.stack); }

/* ================= B. layar ================= */
const GERAI = [
  { kode: 'T305', nama: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', retailer: 'TGI', hari: 'Selasa' }, { kode: 'T311', nama: 'TOYS KINGDOM MARGO CITY DEPOK', retailer: 'TGI', hari: 'Kamis' },
  { kode: 'T317', nama: 'TOYS KINGDOM MALL ARTHA GADING', retailer: 'TGI', hari: 'Jumat' }, { kode: 'T390', nama: 'TOYS KINGDOM LIVING WORLD KOTA WISATA CIBUBUR', retailer: 'TGI', hari: 'Kamis' },
  { kode: 'KIY-GI', nama: 'KINOKUNIYA GRAND INDONESIA', retailer: 'KIY', hari: 'Senin' }, { kode: 'KIY-PIK', nama: 'KINOKUNIYA PANTAI INDAH KAPUK', retailer: 'KIY', hari: 'Jumat' },
  { kode: 'MAA-SGI', nama: 'BABYZ STATION SEIBU GRAND INDONESIA', retailer: 'MAA', hari: 'Senin' }, { kode: 'MAA-PIM2', nama: 'BABYZ STATION SEIBU PIM 2', retailer: 'MAA', hari: 'Rabu' }];
const KONTAK = [{ kunci: 'T305', penerima: 'Living World Alam Sutera', gerai: ['T305'], kepada: 'sm1@contoh-tk.test', cc: '', sapaan: 'Pak/Bu', namaSurat: 'Toys Kingdom Living World Alam Sutera' }];
const PIC = { nama: 'Indra', telepon: '0800-0000-0000' };
const dataBulan = b => ({ ok: true, bulan: b, gerai: GERAI, jadwal: {}, bulanLalu: { bulan: '2026-10', jadwal: {} }, terbit: null, draf: null, libur: [], liburTercatat: true, geser: [], kontak: KONTAK, pic: PIC });

async function bagianB() {
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
  await new Promise(r => srv.listen(8785, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [], DIALOG = [], PANGGIL = [];
  let DEPLOY = true;
  const pasang = async ctx => {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar: ' + r.request().url()); r.abort(); });
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      const n = m.nama, a = m.args || []; if (m.fn === 'panggil') PANGGIL.push([n].concat(a));
      let h;
      if (n === 'dataPapan') h = { pintu: 'ok', hasil: { ok: true, lok: [], prod: [], baris: [], hariIni: '2026-10-12' } };
      else if (n === 'ambilJadwalPic') h = { pintu: 'ok', hasil: dataBulan(a[1]) };
      else if (!DEPLOY) h = { pintu: 'galat', pesan: 'Fungsi "' + n + '" tidak dibuka untuk WMS.' };
      else if (n === 'bacaKoordinatGerai') { const kode = a[1] || []; h = { pintu: 'ok', hasil: { ok: true, titik: kode.filter(k => TITIK[k]).map(k => TITIK[k]), tanpa: kode.filter(k => !TITIK[k]) } }; }
      else if (n === 'hitungRute') {
        const q = a[1] || {}, jalur = q.mode === 'optimal' ? q.urutan.slice().reverse() : q.urutan;
        const legs = jalur.map((k, i) => ({ dari: i ? jalur[i - 1] : 'HO', ke: k, detik: i === 0 ? 2700 : 1800, meter: i === 0 ? 25000 : 15000 }));
        h = { pintu: 'ok', hasil: { ok: true, mode: q.mode, mulai: 'HO', urutan: jalur, legs, totalDetik: legs.reduce((s, x) => s + x.detik, 0) - (q.mode === 'optimal' ? 600 : 0), totalMeter: legs.reduce((s, x) => s + x.meter, 0), macet: true } };
      } else h = { pintu: 'galat', pesan: 'Fungsi "' + n + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') { const w = new Date(Date.now() - 60000).toISOString(); const o = { 'klien|papan': { ok: true, versi: 'rute', html: PAPAN }, 'klien|versi': { ok: true, versi: 'rute' } }; const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; }); h = { ok: true, isi }; }
      else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const masuk = async p => {
    p.on('pageerror', e => galat.push(e.message)); p.on('dialog', d => { DIALOG.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8785/wms/');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'id'); localStorage.setItem('wms_maskot', 'off'); });
    await p.reload(); await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) { const f = p.frames().find(x => x !== p.mainFrame()); try { if (f && await f.evaluate(() => !!document.querySelector('[data-wms=jadwal]'))) return f; } catch (e) {} await jeda(100); }
    return null;
  };
  const bukaRute = async (p, fr) => {
    await fr.evaluate(() => document.querySelector('[data-wms=jadwal]').click());
    await p.waitForSelector('#jadwalPic [data-rute-buka]', { timeout: 8000 }).catch(() => {});
    await p.click('#jadwalPic [data-rute-buka]').catch(() => {});
    await p.waitForFunction(() => !!document.querySelector('#rute.buka [data-rute-hari], #rute.buka .tolak-alat'), null, { timeout: 8000 }).catch(() => {});
    await jeda(150);
  };
  const kartu = (p, t) => p.evaluate(t => { const k = document.querySelector('#rute [data-rute-hari="' + t + '"]'); return k ? { teks: k.innerText, urut: [...k.querySelectorAll('[data-rute-kode]')].map(x => x.getAttribute('data-rute-kode')), maps: (k.querySelector('[data-rute-maps]') || {}).href || '' } : null; }, t);
  try {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
    await pasang(ctx);
    const p = await ctx.newPage();
    const fr = await masuk(p);
    if (fr) await bukaRute(p, fr);
    if (process.env.DEBUG) console.log('DBG', !!fr, await p.evaluate(() => ((document.getElementById('rute') || {}).innerText || '-').slice(0, 400) + ' || J:' + ((document.getElementById('jadwalPic') || {}).innerText || '-').slice(0, 400)));
    const pekan = await p.evaluate(() => [...document.querySelectorAll('#rute [data-rute-pekan]')].map(x => x.textContent + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(','));
    const kam = await kartu(p, '2026-11-05') || {};
    c('B1 tombol Rute di Jadwal membuka Rute November: pekan 2*, 9, 16, 23, 30 Nov; Kamis 5 Nov diurutkan T311 lalu T390; tautan Maps HO ke T390 singgah T311',
      pekan === '2 Nov*,9 Nov,16 Nov,23 Nov,30 Nov' && (kam.urut || []).join() === 'T311,T390' && /origin=-6\.2%2C106\.8&/.test(kam.maps) && /destination=-6\.36921%2C106\.95919/.test(kam.maps) && /waypoints=-6\.372972%2C106\.834806&/.test(kam.maps),
      JSON.stringify([pekan, kam]));
    const jum = await kartu(p, '2026-11-06') || {}, sen = await kartu(p, '2026-11-02') || {};
    c('B2 gerai tanpa koordinat disebut di kartunya (Jumat: Kinokuniya PIK, Senin: Kinokuniya GI), gerai lain tetap dirutekan', /Belum berkoordinat/.test(jum.teks || '') && /Kinokuniya Pantai Indah Kapuk/.test(jum.teks || '') && (jum.urut || []).join() === 'T317' && /Kinokuniya Grand Indonesia/.test(sen.teks || '') && (sen.urut || []).join() === 'MAA-SGI', JSON.stringify([jum, sen]));
    await p.click('#rute [data-rute-hitung="2026-11-05"][data-mode=urut]').catch(() => {});
    await p.waitForFunction(() => /tiba/.test((document.querySelector('#rute [data-rute-hari="2026-11-05"]') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    const k3 = await kartu(p, '2026-11-05') || {}, q3 = (PANGGIL.filter(x => x[0] === 'hitungRute').pop() || [])[2] || {};
    c('B3 Hitung waktu tempuh: hitungRute(urutan T311,T390, 5 Nov, 12:00, urut); tiba T311 12.45 ditandai di luar jendela, T390 14.15; total 75 menit, 40 km',
      (q3.urutan || []).join() === 'T311,T390' && q3.tanggal === '2026-11-05' && q3.jam === '12:00' && q3.mode === 'urut' && /tiba 12\.45/.test(k3.teks || '') && /di luar jendela/.test(k3.teks || '') && /tiba 14\.15/.test(k3.teks || '') && /75 menit/.test(k3.teks || '') && /40 km/.test(k3.teks || ''),
      JSON.stringify([q3, k3.teks]));
    await p.fill('#ruteMulai', '12:30'); await p.dispatchEvent('#ruteMulai', 'change'); await jeda(150);
    await p.click('#rute [data-rute-hitung="2026-11-05"][data-mode=urut]').catch(() => {});
    await p.waitForFunction(() => /tiba 13\.15/.test((document.querySelector('#rute [data-rute-hari="2026-11-05"]') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    const k4 = await kartu(p, '2026-11-05') || {};
    c('B4 berangkat 12.30: dihitung ulang dengan jam 12:30, tiba 13.15 dan 14.45, tidak ada yang di luar jendela', /tiba 13\.15/.test(k4.teks || '') && /tiba 14\.45/.test(k4.teks || '') && !/di luar jendela/.test(k4.teks || '') && ((PANGGIL.filter(x => x[0] === 'hitungRute').pop() || [])[2] || {}).jam === '12:30', k4.teks);
    await p.click('#rute [data-rute-hitung="2026-11-05"][data-mode=optimal]').catch(() => {});
    await p.waitForSelector('#rute [data-rute-pakai="2026-11-05"]', { timeout: 8000 }).catch(() => {});
    const saran = await p.evaluate(() => (document.querySelector('#rute [data-rute-hari="2026-11-05"] .rt-saran') || {}).innerText || '');
    await p.click('#rute [data-rute-pakai="2026-11-05"]').catch(() => {}); await jeda(150);
    const k5 = await kartu(p, '2026-11-05') || {};
    c('B5 Cari urutan tercepat: saran Google (TK Kota Wisata Cibubur > TK Margo City Depok, 65 menit); Pakai urutan ini membalik urutan dan tautan Maps berakhir di T311',
      /urutan tercepat menurut Google/i.test(saran) && /65 menit/.test(saran) && (k5.urut || []).join() === 'T390,T311' && /destination=-6\.372972%2C106\.834806/.test(k5.maps), JSON.stringify([saran, k5]));
    await p.click('#rute [data-rute=tutup]').catch(() => {}); await jeda(150);
    const t6 = await p.evaluate(() => ({ rute: document.getElementById('rute').classList.contains('buka'), jadwal: (document.getElementById('jadwalPic') || { classList: { contains: () => false } }).classList.contains('buka'), body: document.body.classList.contains('alat-terbuka') }));
    c('B6 menutup Rute kembali ke Jadwal yang masih terbuka', !t6.rute && t6.jadwal && t6.body, JSON.stringify(t6));
    c('B7 tanpa dialog peramban dan tanpa tanda pisah panjang', DIALOG.length === 0 && !(await p.evaluate(() => /—/.test(document.getElementById('rute').innerText + document.getElementById('jadwalPic').innerText))), DIALOG.join('|'));
    await ctx.close();
    DEPLOY = false;
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasang(ctx2);
    const hp = await ctx2.newPage();
    const fr2 = await masuk(hp);
    let t8 = {};
    if (fr2) { await bukaRute(hp, fr2); t8 = await hp.evaluate(() => ({ teks: (document.querySelector('#rute .tolak-alat') || {}).innerText || '' })); }
    DEPLOY = true;
    if (fr2) { await hp.click('#rute [data-rute=ulang]').catch(() => {}); await hp.waitForSelector('#rute [data-rute-hari]', { timeout: 8000 }).catch(() => {}); await jeda(200); t8.lebar = await hp.evaluate(() => Math.max(document.documentElement.scrollWidth, document.getElementById('rute').scrollWidth)); }
    c('B8 sebelum Apps Script di-deploy: pesan jujur; setelah ada, tombol ulang memuat rute; HP 390 px tanpa geser samping', /deploy/.test(t8.teks || '') && t8.lebar <= 392, JSON.stringify(t8));
    await ctx2.close();
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('B9 tidak ada galat JavaScript dan tidak ada pustaka dari CDN', galat.length === 0, galat.join(' | ').slice(0, 400));
  await b.close(); srv.close();
}
bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
