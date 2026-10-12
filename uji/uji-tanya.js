/* Uji Tanya WMS (wms/tanya.js), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy memilih Tanya WMS tanpa AI: pengurai aturan atas
 * buku besar yang sama dengan papan. Jawaban yang salah lebih berbahaya dari
 * tidak menjawab, karena orang mengirim angkanya ke mitra. Yang diperiksa:
 *  - SKU dan gerai dikenali dari bahasa sehari-hari ("reindeer di kota
 *    wisata"), angka stok sama dengan saldo buku besar;
 *  - periode ("bulan lalu", "sejak september") memotong baris dengan benar;
 *  - gerai yang punya stok tapi tidak laku ditemukan;
 *  - pertanyaan yang berarti menulis (jadwal) TIDAK menulis apa pun, cuma
 *    mengusulkan dan membuka alatnya;
 *  - pertanyaan yang tidak dikenali dijawab jujur dengan contoh, bukan angka
 *    tebakan.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 13;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);

/* Hari ini 12 Okt 2026 (Senin).
   T390 (TK Kota Wisata): Reindeer tiba 17 Sep 3 pcs, laku 1 pada 28 Sep -> sisa 2. Panda 2 tiba 17 Sep, laku 1 pada 5 Okt.
   T311 (TK Margo City): Bear 4 tiba 1 Agu, tidak pernah laku -> stok mati 4 pcs, gerai tanpa penjualan.
   KIY-GI: Bear 2 tiba 3 Okt, laku 1 pada 8 Okt.
   HO: Reindeer 10 - 3 = 7, Bear 20 - 4 - 2 - 1 (HO laku 10 Okt) = 13, Panda 5 - 2 = 3.
   1 pcs Panda HO -> TRANSIT 9 Okt, belum tiba.
   Penjualan September: Reindeer 1 (194.250). Oktober: Panda T390 1 (222.000), Bear KIY 1 (194.250), Bear HO 1 (194.250).
   Terlaris bulan ini: Bear 2 pcs. */
const L = { T390: 0, T311: 1, KIYGI: 2, HO: 3, TERJUAL: 4, OPENING: 5, TRANSIT: 6 };
const DATA = { ok: true, hariIni: '2026-10-12', diperbarui: '12 Oct 2026 07:00',
  lok: [{ k: 'T390', n: 'TOYS KINGDOM LIVING WORLD KOTA WISATA CIBUBUR', r: 'TGI', toko: 1 }, { k: 'T311', n: 'TOYS KINGDOM MARGO CITY DEPOK', r: 'TGI', toko: 1 }, { k: 'KIY-GI', n: 'KINOKUNIYA GRAND INDONESIA', r: 'KIY', toko: 1 },
    { k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }, { k: 'TRANSIT', toko: 0 }],
  prod: [{ b: '4582586963000', n: 'MofmoFriends S - Reindeer', s: 'MF-PLU-040', h: 194250, hs: 175000 }, { b: '4582586962058', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', h: 194250, hs: 175000 },
    { b: '4582586962999', n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', h: 222000, hs: 200000 }, { b: '4582586967015', n: 'MOFMOFRIENDS key charm - Bear', s: 'MF-KC-001', h: 166500, hs: 150000 }],
  baris: [['2026-07-20', 0, 10, L.OPENING, L.HO], ['2026-07-20', 1, 20, L.OPENING, L.HO], ['2026-07-20', 2, 5, L.OPENING, L.HO],
    ['2026-08-01', 1, 4, L.HO, L.T311], ['2026-09-17', 0, 3, L.HO, L.T390], ['2026-09-17', 2, 2, L.HO, L.T390], ['2026-09-28', 0, 1, L.T390, L.TERJUAL],
    ['2026-10-03', 1, 2, L.HO, L.KIYGI], ['2026-10-05', 2, 1, L.T390, L.TERJUAL], ['2026-10-08', 1, 1, L.KIYGI, L.TERJUAL], ['2026-10-09', 2, 1, L.HO, L.TRANSIT], ['2026-10-10', 1, 1, L.HO, L.TERJUAL],
    /* baris janggal: OPENING langsung ke TERJUAL, bukan penjualan dari lokasi yang dipegang, tidak boleh ikut */
    ['2026-10-06', 1, 5, L.OPENING, L.TERJUAL]],
  opname: [{ kode: 'T390', wajib: true, terakhir: '2026-10-08' }, { kode: 'T311', wajib: true, terakhir: '' }, { kode: 'KIY-GI', wajib: true, terakhir: '2026-09-01' }, { kode: 'HO', wajib: true, terakhir: '2026-10-01' }] };
const GUDANG = { ok: true, lokasi: [{ kode: 'T2-3A', sku: 'S Reindeer', barcode: '4582586963000', isi: 6, kap: 16 }, { kode: 'X-02', sku: 'S Reindeer', barcode: '4582586963000', isi: 1, kap: 40 }] };

let TY = null;
try {
  const kotak = { window: { __wms: { bhs: () => 'id' } }, console }; kotak.window.window = kotak.window; vm.createContext(kotak);
  vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/tanya.js'), 'utf8'), kotak);
  TY = kotak.window.WmsTanya;
} catch (e) { c('A0 tanya.js termuat', false, e.message); }
const J = q => TY.jawab(q, DATA, GUDANG);
const teks = j => [j.judul].concat(j.isi || []).concat((j.baris || []).map(b => b.join(' '))).join(' | ');
try {
  const a1 = J('stok reindeer di kota wisata berapa?');
  c('A1 "stok reindeer di kota wisata berapa?": S Reindeer di TK Kota Wisata Cibubur 2 pcs; di rak sejak 17 Sep, terakhir laku 28 Sep; opname terakhir 8 Okt; tombol paspor SKU',
    a1.jenis === 'stok' && /S Reindeer di TK Kota Wisata Cibubur: 2 pcs/.test(a1.judul) && /sejak 17 Sep/.test(teks(a1)) && /terakhir laku 28 Sep/.test(teks(a1)) && /Opname terakhir: 8 Okt/.test(teks(a1)) && a1.aksi[0] && a1.aksi[0].buka === 'paspor', teks(a1));
  const a2 = J('reindeer berapa');
  c('A2 "reindeer berapa" tanpa lokasi: total 9 pcs (gudang HO 7, TK Kota Wisata 2) dan lokasi rak T2-3A 6, X-02 1', /S Reindeer: 9 pcs/.test(a2.judul) && /Gudang HO 7 pcs/.test(teks(a2)) && /TK Kota Wisata Cibubur 2 pcs/.test(teks(a2)) && /T2-3A 6, X-02 1/.test(teks(a2)), teks(a2));
  const a3 = J('stok key charm bear di gudang');
  c('A3 "key charm bear" dibedakan dari boneka S Bear: key charm Bear di gudang 0 pcs', /key charm Bear di Gudang HO: 0 pcs/.test(a3.judul), teks(a3));
  const a4 = J('gerai mana yang belum laku sama sekali sejak september?');
  c('A4 "gerai mana yang belum laku sejak september": TK Margo City Depok, 4 pcs, belum pernah laku, belum opname (T390 dan KIY laku, tidak disebut)',
    a4.jenis === 'sepi' && /1 gerai/.test(a4.judul) && a4.baris.length === 1 && a4.baris[0][0] === 'TK Margo City Depok' && /4 pcs · belum pernah laku · opname belum/.test(a4.baris[0][1]), teks(a4));
  const a5 = J('penjualan bulan lalu'), a6 = J('penjualan toys kingdom bulan ini'), a7 = J('berapa terjual hari ini');
  c('A5 penjualan bulan lalu (September 2026): 1 pcs Rp194.250; Toys Kingdom bulan ini: 1 pcs Rp222.000 (KIY dan HO tidak ikut); hari ini: 0 pcs',
    /September 2026: 1 pcs, Rp194\.250/.test(a5.judul) && /di Toys Kingdom bulan ini \(Oktober 2026\): 1 pcs, Rp222\.000/.test(a6.judul) && /hari ini: 0 pcs, Rp0/.test(a7.judul), [a5.judul, a6.judul, a7.judul].join(' || '));
  const a8 = J('sku terlaris bulan ini');
  c('A8 SKU terlaris bulan ini: S Bear 2 pcs, lalu S Panda 1 pcs', a8.jenis === 'laris' && /S Bear \(2 pcs\)/.test(a8.judul) && a8.baris[1] && /S Panda/.test(a8.baris[1][0]), teks(a8));
  const a9 = J('stok mati'), a10 = J('stok mati di kinokuniya');
  c('A9 stok mati: 1 SKU-gerai 4 pcs (S Bear di TK Margo City Depok, 72 hari); di Kinokuniya tidak ada', /1 SKU-gerai, 4 pcs/.test(a9.judul) && /S Bear · TK Margo City Depok/.test(teks(a9)) && /72 hari/.test(teks(a9)) && /Tidak ada stok mati di Kinokuniya/.test(a10.judul), teks(a9) + ' || ' + a10.judul);
  const a11 = J('barang di jalan');
  c('A10 barang di jalan: 1 pcs S Panda berangkat 9 Okt (3 hari)', /1 pcs masih di jalan/.test(a11.judul) && /S Panda/.test(teks(a11)) && /9 Okt \(3 hari\)/.test(teks(a11)), teks(a11));
  const a12 = J('kapan opname terakhir margo city'), a13 = J('gerai mana belum opname');
  c('A11 opname: Margo City belum pernah; daftar yang lewat 30 hari: TK Margo City Depok dan Kinokuniya Grand Indonesia', /TK Margo City Depok: belum pernah/.test(a12.judul) && /2 dari 4 lokasi/.test(a13.judul), a12.judul + ' || ' + teks(a13));
  const a14 = J('jadwalin indra cek margo city minggu depan');
  c('A12 permintaan menulis (jadwal) hanya usulan yang butuh persetujuan: TK Margo City Depok Rabu 21 Okt, tombol membuka Jadwal, tidak ada yang disimpan',
    a14.jenis === 'jadwal' && a14.perluOk && /Perlu persetujuanmu/.test(a14.judul) && /TK Margo City Depok hari Rabu 21 Okt/.test(a14.judul) && a14.aksi.length === 1 && a14.aksi[0].buka === 'jadwal' && /tidak menyimpan/.test(teks(a14)), teks(a14));
  const a15 = J('cuaca besok gimana');
  c('A13 pertanyaan tidak dikenali dijawab jujur dengan contoh, tanpa angka tebakan', a15.jenis === 'bantuan' && /Belum paham/.test(a15.judul) && a15.contoh.length >= 5 && !(a15.baris || []).length, teks(a15));
} catch (e) { c('A MATI', false, e.stack); }

/* ================= B. layar (Playwright) ================= */
async function bagianB() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { c('B0 playwright', false, e.message); return; }
  const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
  const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
  const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
  const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(AKAR, p); if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); } s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f)); });
  const PAPAN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title><style>#layarIsi{display:none}</style></head><body><div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div><div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div><h1>Papan Data</h1></div><div id="kopKanan"></div></div></header><nav id="panel"></nav><div id="isi"></div></div><script>function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
  await new Promise(r => srv.listen(8786, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [], DIALOG = [], TULIS = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar: ' + r.request().url()); r.abort(); });
  await ctx.route(API + '**', async r => { let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {} if (m.nama !== 'dataPapan') TULIS.push(m.nama); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(m.nama === 'dataPapan' ? { pintu: 'ok', hasil: DATA } : { pintu: 'galat', pesan: 'x' }) }); });
  await ctx.route(SUPA, async r => { let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {} let h; if (m.fn === 'masuk') h = { ok: true, tiket: 'T', ingat: true }; else if (m.fn === 'ambil') { const w = new Date(Date.now() - 60000).toISOString(); const o = { 'dataPapan|["K"]': DATA, 'wmsGudang|["K"]': GUDANG, 'klien|papan': { ok: true, versi: 'ty', html: PAPAN }, 'klien|versi': { ok: true, versi: 'ty' } }; const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; }); h = { ok: true, isi }; } else h = { ok: false }; await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) }); });
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  try {
    const p = await ctx.newPage();
    p.on('pageerror', e => galat.push(e.message)); p.on('dialog', d => { DIALOG.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8786/wms/');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'id'); localStorage.setItem('wms_maskot', 'off'); });
    await p.reload(); await p.waitForSelector('#kode', { timeout: 8000 }); await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    let fr = null; const t0 = Date.now();
    while (Date.now() - t0 < 12000 && !fr) { const f = p.frames().find(x => x !== p.mainFrame()); try { if (f && await f.evaluate(() => !!document.querySelector('[data-wms=tanya]'))) fr = f; } catch (e) {} if (!fr) await jeda(100); }
    if (fr) await fr.evaluate(() => document.querySelector('[data-wms=tanya]').click());
    await p.waitForSelector('#tanyaKotak', { timeout: 8000 }).catch(() => {});
    await p.fill('#tanyaKotak', 'stok reindeer di kota wisata berapa?'); await p.press('#tanyaKotak', 'Enter');
    await p.waitForFunction(() => /2 pcs/.test((document.querySelector('#tanya .tny-kartu') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    const k1 = await p.evaluate(() => (document.querySelector('#tanya .tny-kartu') || {}).innerText || '');
    await p.click('#tanya [data-tanya-contoh="jadwalin indra cek margo city minggu depan"]').catch(() => {});
    await p.waitForFunction(() => /persetujuan/.test((document.querySelector('#tanya .tny-kartu') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    const k2 = await p.evaluate(() => (document.querySelector('#tanya .tny-kartu.perlu-ok') || {}).innerText || '');
    const lebar = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.getElementById('tanya').scrollWidth));
    c('B1 tombol Tanya di kepala papan: jawaban stok tampil (2 pcs) dari buku besar, usulan jadwal butuh persetujuan; tidak ada satu pun panggilan tulis ke server; HP 390 px tanpa geser samping',
      !!fr && /S Reindeer di TK Kota Wisata Cibubur: 2 pcs/.test(k1) && /Perlu persetujuanmu/.test(k2) && TULIS.length === 0 && lebar <= 392, JSON.stringify([!!fr, k1.slice(0, 200), k2.slice(0, 160), TULIS, lebar]));
  } catch (e) { c('B MATI', false, e.stack); }
  c('B2 tanpa galat JavaScript, tanpa dialog, tanpa tanda pisah panjang di jawaban', galat.length === 0 && DIALOG.length === 0, galat.concat(DIALOG).join(' | ').slice(0, 300));
  await b.close(); srv.close();
}
bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
