/* Uji WMS baru (wms/, 10 Okt 2026). Harapan: "30 pemeriksaan, SEMUA LULUS".
 * Chromium sungguhan, halaman dilayani dari localhost, server Apps Script
 * palsu (aksi 'wms'), pustaka QR palsu, AudioContext palsu yang mencatat nada.
 *
 * KENAPA UJI INI ADA. WMS baru menghitung stok dan penjualan sendiri dari
 * baris buku besar dataPapan, seperti papan lama. Kalau hitungannya meleset,
 * Ferdy melihat angka penjualan yang salah di halaman pertama dan tidak tahu.
 * Kalau scan rak salah membedakan cocok dan ditolak, orang gudang menaruh
 * barang di rak yang salah dengan bunyi "berhasil". Kalau kode akses bocor ke
 * alamat atau tersimpan di HP, papan bisa dibuka orang lain.
 *
 * Semua angka harapan dihitung tangan dari fixture di bawah (lihat komentar
 * per angka), bukan disalin dari layar.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const AKAR = '/home/claude/fieldreport';
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const KODE_BENAR = 'KODE-PALSU-UJI';
const DIHARAPKAN = 30;
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(AKAR, p);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});

/* ---------- fixture: bentuk persis keluaran dataPapan ---------- */
const L = ['HO', 'PRINCIPAL', 'TERJUAL', 'RUSAK', 'ADJUST', 'OPENING', 'TRANSIT', 'T305', 'K01', 'K02'];
const lok = [
  { k: 'HO', n: 'HO Haery' }, { k: 'PRINCIPAL', n: 'Principal' }, { k: 'TERJUAL', n: 'Terjual' }, { k: 'RUSAK', n: 'Rusak' }, { k: 'ADJUST', n: 'Adjust' }, { k: 'OPENING', n: 'Opening' }, { k: 'TRANSIT', n: 'Transit' },
  { k: 'T305', n: 'Toys Kingdom PIM', r: 'Toys Kingdom', toko: 1 }, { k: 'K01', n: 'Kinokuniya Senayan', r: 'Kinokuniya', toko: 1 }, { k: 'K02', n: 'Kinokuniya GI', r: 'Kinokuniya', toko: 1 }
];
const i = k => L.indexOf(k);
const prod = [
  { b: '8991000000011', n: 'Koala Plush 20cm', s: 'MF-KOA20', h: 150000 },
  { b: '8991000000028', n: 'Bear Keychain', s: 'MF-BRK', h: 50000 },
  { b: '8991000000035', n: 'Bunny Pouch', s: 'MF-BNP', h: 100000 }
];
const baris = [
  ['2026-08-01', 0, 30, i('OPENING'), i('HO')],
  ['2026-08-01', 1, 40, i('OPENING'), i('HO')],
  ['2026-08-01', 2, 10, i('OPENING'), i('HO')],
  ['2026-09-01', 0, 10, i('HO'), i('T305')],
  ['2026-09-01', 1, 10, i('HO'), i('K01')],
  ['2026-09-02', 2, 4, i('HO'), i('T305')],
  ['2026-09-03', 2, 2, i('HO'), i('K02')],
  ['2026-09-10', 1, 1, i('K01'), i('RUSAK')],
  ['2026-10-02', 0, 3, i('T305'), i('TERJUAL')],   // jual gerai, minggu 28 Sep
  ['2026-10-06', 0, 2, i('HO'), i('TERJUAL')],     // jual online dari HO, minggu ini
  ['2026-10-07', 1, 5, i('K01'), i('TERJUAL')],    // jual gerai, minggu ini
  ['2026-10-08', 0, 2, i('HO'), i('TRANSIT')]
];
/* Stok: HO koala 30-10-2-2=16, bear 40-10=30, bunny 10-4-2=4 -> 50.
   Gerai: T305 koala 7 + bunny 4, K01 bear 4, K02 bunny 2 -> 17. Transit 2. Total 69.
   Penjualan Okt: 3*150000 + 2*150000 + 5*50000 = 1.000.000. Pcs: 10. Minggu ini (5-11 Okt): 7. */
const DATA = { lok, prod, baris, hariIni: '2026-10-09', bulanIni: '2026-10', diperbarui: '2026-10-09 07:00',
  sehat: { temuan: [{ bobot: 'berat', judul: 'Stok minus di gerai', jml: 1, ket: 'Cek opname', contoh: ['T305'] }, { bobot: 'ringan', judul: 'Harga kosong', jml: 2, ket: '' }], berat: 1, ringan: 1, jmlProduk: 3, jmlBaris: 12 } };
const GUDANG = { ok: true, stokHO: 50, diLokasi: 28, terisi: 2, jml: 3, rendah: 1, belumLokasi: 22, lokasi: [
  { kode: 'A-01-1', zona: 'Rack A', peran: 'pick face', sku: 'Koala Plush 20cm', barcode: '8991000000011', kap: 20, isi: 16, persen: 80, rendah: false },
  { kode: 'A-01-2', zona: 'Rack A', peran: 'pick face', sku: 'Bear Keychain', barcode: '8991000000028', kap: 40, isi: 12, persen: 30, rendah: true },
  { kode: 'B-01-1', zona: 'Overflow B', peran: 'overflow', sku: '', barcode: '', kap: 0, isi: 0, persen: 0, rendah: false }] };
const KIRIMAN = { ok: true, jml: 2, daftar: [
  { lajur: 'Retail', ref: 'DO-0101', tujuan: 'Toys Kingdom PIM', tanggal: '2026-10-03', noPo: 'PO-77', tahap: 'PACKING', noSj: 'SJ-0101', pcsPesan: 12, pcsPetik: 12, pcsKemas: 10, koli: 1 },
  { lajur: 'Shopee', ref: 'SHP-9', tujuan: 'Pembeli Shopee', tanggal: '2026-10-08', noPo: '', tahap: 'DELIVERED', noSj: '', pcsPesan: 1, pcsPetik: 1, pcsKemas: 1, koli: 1, kurir: 'SPX', resi: 'SPX123' }] };
const LAPANGAN = { ok: true, html: '<div class="lap"><h3>LAPORAN-LAPANGAN-UJI</h3><a href="https://mofmo-lapangan.pages.dev/?pekan=1">detail</a></div>' };

const QR_PALSU = 'window.qrcode=function(){var d="";return{addData:function(x){d=x},make:function(){},createSvgTag:function(){return "<svg data-qr=\\""+d.replace(/"/g,"")+"\\"></svg>"}}};';
const AUDIO_PALSU = () => {
  window.__nada = []; window.__getar = [];
  function Osc() { this.type = 'sine'; var self = this; this.frequency = { setValueAtTime: function (f) { self.f = f; }, exponentialRampToValueAtTime: function () {} }; }
  Osc.prototype.connect = function () {}; Osc.prototype.start = function () { window.__nada.push(this.f); }; Osc.prototype.stop = function () {};
  function Ctx() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  Ctx.prototype.createOscillator = function () { return new Osc(); };
  Ctx.prototype.createGain = function () { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  Ctx.prototype.resume = function () {};
  window.AudioContext = Ctx; window.webkitAudioContext = Ctx;
  try { Object.defineProperty(navigator, 'vibrate', { value: function (p) { window.__getar.push(p); return true; }, configurable: true }); } catch (e) {}
};

(async () => {
  await new Promise(r => srv.listen(8766, r));
  const URL0 = 'http://localhost:8766/wms/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const S = { badan: [], perluMasuk: false, galatData: false };
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(AUDIO_PALSU);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/cdnjs\.cloudflare\.com/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: QR_PALSU }));
  await ctx.route(API + '**', async r => {
    let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    S.badan.push(m);
    let h;
    if (m.aksi !== 'wms') h = { pintu: 'galat', pesan: 'bukan wms' };
    else if (m.fn === 'masuk') h = { pintu: 'ok', hasil: String(m.kode || '').trim().toUpperCase() === KODE_BENAR ? { ok: true, tiket: 'TIKET.' + (m.ingat ? 'INGAT' : 'SESI'), ingat: !!m.ingat } : { ok: false, pesan: 'That access code is not right.' } };
    else if (!/^TIKET\./.test(m.tiket || '') || S.perluMasuk) h = { pintu: 'ok', hasil: { ok: false, perluMasuk: true } };
    else if (m.fn === 'data') h = S.galatData ? { pintu: 'galat', pesan: 'Server sibuk' } : { pintu: 'ok', hasil: DATA };
    else if (m.fn === 'gudang') h = { pintu: 'ok', hasil: GUDANG };
    else if (m.fn === 'kiriman') h = { pintu: 'ok', hasil: KIRIMAN };
    else if (m.fn === 'lapangan') h = { pintu: 'ok', hasil: LAPANGAN };
    else h = { pintu: 'ok', hasil: { ok: false, pesan: 'fn tidak dikenal' } };
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
  });
  const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
  const galatHalaman = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => galatHalaman.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) galatHalaman.push(m.text()); });
  const tunggu = (fn, arg, ms) => p.waitForFunction(fn, arg, { timeout: ms || 6000 }).catch(() => {});
  const teks = () => p.evaluate(() => document.body.innerText);
  const nada = () => p.evaluate(() => window.__nada.splice(0));
  const getar = () => p.evaluate(() => window.__getar.splice(0));
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  /* FOTO=/folder node uji/uji-wms.js menyimpan tangkapan layar tiap halaman untuk dilihat mata. */
  const foto = async n => { if (process.env.FOTO) { await jeda(800); await p.screenshot({ path: path.join(process.env.FOTO, n + '.png'), fullPage: true }); } };

  try {
    /* ---------- masuk ---------- */
    await p.goto(URL0);
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'en'); });
    await p.reload();
    await tunggu(() => document.getElementById('formMasuk'));
    c('W1 tanpa tiket yang tampil halaman masuk, dan tidak ada panggilan data sebelum masuk', await p.$('#formMasuk') && !S.badan.some(x => x.fn === 'data'), JSON.stringify(S.badan.map(x => x.fn)));
    await foto('01-masuk');
    await p.fill('#kode', 'salah');
    await nada();
    await p.click('#tMasuk');
    await tunggu(() => /not right/.test(document.getElementById('galatMasuk').textContent));
    const salah = await p.evaluate(() => ({ g: document.getElementById('galatMasuk').textContent, ls: JSON.stringify(localStorage), ss: JSON.stringify(sessionStorage), anim: document.getElementById('kode').style.animation }));
    const nSalah = await nada();
    c('W2 kode salah: pesan tampil, input bergeleng, bunyi gagal, tidak ada tiket tersimpan', /not right/.test(salah.g) && /geleng/.test(salah.anim) && nSalah.indexOf(330) > -1 && !/wms_tiket/.test(salah.ls + salah.ss), JSON.stringify(salah) + ' ' + nSalah);
    await p.fill('#kode', ' kode-palsu-uji ');
    await p.click('#tMasuk');
    await tunggu(() => document.querySelector('.grid-kpi .kpi'), null, 8000);
    const masuk = await p.evaluate(() => ({ h: location.hash, href: location.href, ls: JSON.stringify(localStorage), ss: JSON.stringify(sessionStorage) }));
    const kirimMasuk = S.badan.filter(x => x.fn === 'masuk').pop() || {};
    c('W3 kode benar: masuk ke ringkasan, tiket di sessionStorage saja (tidak "ingat"), bunyi sukses', /#\/summary/.test(masuk.h) && /TIKET\.SESI/.test(masuk.ss) && !/TIKET/.test(masuk.ls) && (await nada()).indexOf(784) > -1 && kirimMasuk.ingat === false, JSON.stringify(masuk));
    c('W4 kode akses tidak pernah ada di alamat, localStorage, atau sessionStorage', !/kode-palsu|KODE-PALSU/i.test(masuk.href + masuk.ls + masuk.ss), masuk.href);
    await tunggu(() => window.__wms && window.__wms.S.gudang && window.__wms.S.kiriman, null, 8000);
    const panggilData = S.badan.filter(x => x.fn !== 'masuk');
    c('W5 panggilan sesudah masuk membawa tiket, tidak membawa kode', panggilData.length >= 3 && panggilData.every(x => x.tiket === 'TIKET.SESI' && !('kode' in x)), JSON.stringify(panggilData.map(x => Object.keys(x).join('+'))));

    /* ---------- ringkasan ---------- */
    await jeda(900);
    const kpi = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.grid-kpi .kpi .angka'), e => e.textContent));
    c('W6 penjualan bulan ini = Rp1.000.000 (3x150rb + 2x150rb + 5x50rb)', kpi[0] === 'Rp1.00 M', JSON.stringify(kpi));
    c('W7 pcs terjual 8 minggu = 10, posisi stok = 69 (HO 50 + gerai 17 + jalan 2)', kpi[1] === '10' && kpi[2] === '69', JSON.stringify(kpi));
    const ket = await p.evaluate(() => document.querySelectorAll('.grid-kpi .kpi p')[2].textContent);
    c('W8 rincian posisi stok HO 50, gerai 17, perjalanan 2', /HO 50/.test(ket) && /stores 17/.test(ket) && /transit 2/.test(ket), ket);
    const batang = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.batang-area .batang-kol .num'), e => e.textContent));
    c('W9 grafik mingguan: minggu ini 7, minggu lalu 3, enam minggu sebelumnya 0', JSON.stringify(batang) === JSON.stringify(['0', '0', '0', '0', '0', '0', '3', '7']), JSON.stringify(batang));
    const tugas = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.tugas .tanda'), e => e.textContent).slice(0, 10));
    const tugasTeks = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.kartu .tugas b'), e => e.textContent).join(' | '));
    c('W10 perlu ditindak: temuan berat, DO tertahan 6 hari di packing, pick face rendah, belum di rak; K02 punya stok tanpa jual', ['DQ', 'DO', 'RAK', 'PUT', 'TK'].every(k => tugas.indexOf(k) > -1) && /Shipment to Toys Kingdom PIM waiting at packing/.test(tugasTeks) && /No sale in 30 days: Kinokuniya GI/.test(tugasTeks) && !/No sale in 30 days: (Toys Kingdom PIM|Kinokuniya Senayan)/.test(tugasTeks), JSON.stringify(tugas) + ' ' + tugasTeks);

    await foto('02-ringkasan');
    /* ---------- stok per SKU ---------- */
    await p.evaluate(() => { location.hash = '#/stock'; });
    await tunggu(() => document.querySelector('[data-aksi=saringStok]'));
    await p.click('[data-aksi=saringStok][data-nilai=low]');
    const rendah = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('tbody tr b'), e => e.textContent));
    await p.click('[data-aksi=saringStok][data-nilai=never]');
    const takLaku = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('tbody tr b'), e => e.textContent));
    c('W11 saring stok: tipis di HO = Bunny (4), belum pernah laku = Bunny', JSON.stringify(rendah) === '["Bunny Pouch"]' && JSON.stringify(takLaku) === '["Bunny Pouch"]', JSON.stringify([rendah, takLaku]));
    await p.click('[data-aksi=saringStok][data-nilai=all]');
    await foto('03-stok');

    /* ---------- paspor ---------- */
    await p.evaluate(() => { location.hash = '#/passport/8991000000011'; });
    await tunggu(() => document.querySelector('.jejak'));
    const semua = await p.evaluate(() => document.querySelectorAll('.jejak').length);
    await p.click('[data-aksi=saringPaspor][data-nilai=offline]');
    const off = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.jejak .isi b'), e => e.textContent));
    await p.click('[data-aksi=saringPaspor][data-nilai=online]');
    const on = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.jejak .isi b'), e => e.textContent));
    c('W12 paspor koala: 5 kejadian; offline 4 tanpa jual online; online 2 (jual online + saldo awal gudang), tanpa jual atau kirim ke gerai', semua === 5 && off.length === 4 && !off.some(x => /online/i.test(x)) && on.length === 2 && on.some(x => /Sold online/.test(x)) && !on.some(x => /Sold at/.test(x)), JSON.stringify({ semua, off, on }));
    const bagi = await p.evaluate(() => document.querySelector('.tumpuk').innerText.replace(/\s+/g, ' '));
    c('W13 sebaran koala: HO 16, gerai 7, jalan 2, terjual gerai 3, online 2', bagi === '16 7 2 3 2', bagi);
    await p.click('[data-aksi=saringPaspor][data-nilai=all]');
    await foto('04-paspor');

    /* ---------- peta dan scan rak ---------- */
    await p.evaluate(() => { location.hash = '#/map'; });
    await tunggu(() => document.querySelector('.sel'));
    await p.click('.sel[data-nilai="A-01-1"]');
    await tunggu(() => document.getElementById('scanLok'));
    await nada(); await getar();
    await p.fill('#scanLok', '8991000000011'); await p.press('#scanLok', 'Enter');
    const ok1 = await p.evaluate(() => ({ k: document.getElementById('scanBox').className, t: document.getElementById('scanPesan').textContent, f: document.activeElement.id }));
    const nOk = await nada(), gOk = await getar();
    c('W14 scan barang yang benar: kotak hijau (ok), bunyi scanner sukses 2350 Hz, getar pendek, fokus tetap di kotak scan', /\bok\b/.test(ok1.k) && !/tolak/.test(ok1.k) && JSON.stringify(nOk) === '[2350]' && JSON.stringify(gOk) === '[30]' && ok1.f === 'scanLok' && /✓ Match: Koala/.test(ok1.t), JSON.stringify([ok1, nOk, gOk]));
    await p.fill('#scanLok', '8991000000028'); await p.press('#scanLok', 'Enter');
    const tol = await p.evaluate(() => ({ k: document.getElementById('scanBox').className, t: document.getElementById('scanPesan').textContent }));
    const nTol = await nada(), gTol = await getar();
    c('W15 scan barang rak lain: ditolak (merah + geleng), dua bunyi rendah, getar tiga kali, menyebut barang yang seharusnya', /tolak/.test(tol.k) && !/\bok\b/.test(tol.k) && JSON.stringify(nTol) === '[220,185]' && JSON.stringify(gTol) === '[[60,60,60]]' && /Bear Keychain does not belong here \(expected Koala Plush 20cm\)/.test(tol.t), JSON.stringify([tol, nTol, gTol]));
    await p.fill('#scanLok', '0000000000000'); await p.press('#scanLok', 'Enter');
    const asing = await p.evaluate(() => ({ k: document.getElementById('scanBox').className, t: document.getElementById('scanPesan').textContent }));
    c('W16 barcode asing ditolak dengan pesan "tidak ada di katalog"', /tolak/.test(asing.k) && /not in the catalog/.test(asing.t) && JSON.stringify(await nada()) === '[220,185]', JSON.stringify(asing));

    await foto('05-peta-scan');
    /* ---------- palet cari / scan ---------- */
    await p.keyboard.press('Control+k');
    await tunggu(() => document.getElementById('q'));
    await nada();
    await p.keyboard.type('8991000000028'); await p.keyboard.press('Enter');
    await tunggu(() => /passport\/8991000000028/.test(location.hash));
    c('W17 scan barcode tepat di kotak cari membuka paspornya dengan bunyi scanner sukses', /passport\/8991000000028/.test(await p.evaluate(() => location.hash)) && (await nada()).indexOf(2350) > -1 && !(await p.$('#tiraiCari')), await p.evaluate(() => location.hash));
    await jeda(200); /* biarkan hashchange dari W17 selesai dulu */
    await p.keyboard.press('Control+k');
    await tunggu(() => document.getElementById('q'));
    await nada();
    await p.keyboard.type('7770001112223'); await p.keyboard.press('Enter');
    await jeda(150);
    await foto('06-palet');
    const palTol = await p.evaluate(() => ({ masih: !!document.getElementById('tiraiCari'), anim: (document.getElementById('paletInput') || {}).style ? document.getElementById('paletInput').style.animation : '', toast: document.getElementById('toast').innerText, h: location.hash }));
    c('W18 barcode tak dikenal di kotak cari: ditolak (bunyi rendah, geleng, pesan), tidak pindah halaman', palTol.masih && /geleng/.test(palTol.anim) && /Rejected: 7770001112223/.test(palTol.toast) && /8991000000028/.test(palTol.h) && JSON.stringify(await nada()) === '[220,185]', JSON.stringify(palTol));
    await p.keyboard.press('Escape');

    /* ---------- gerai ---------- */
    await p.evaluate(() => { location.hash = '#/stores'; });
    await tunggu(() => document.querySelector('table.mx'));
    const mx = await p.evaluate(() => { const hd = Array.prototype.map.call(document.querySelectorAll('table.mx th'), e => e.textContent); const bn = Array.prototype.find.call(document.querySelectorAll('table.mx tbody tr'), tr => /Bunny/.test(tr.textContent)); const sel = Array.prototype.map.call(bn.querySelectorAll('td .v'), e => ({ v: e.textContent, oranye: /wBg/.test(e.getAttribute('style') || '') })); return { hd, sel }; });
    /* kolom: T305, K01, K02. Bunny: T305 4 (tak pernah laku di sana), K01 0, K02 2 (tak pernah laku) */
    c('W19 matriks gerai: Bunny 4 di T305 dan 2 di K02, keduanya oranye karena belum pernah laku di situ', JSON.stringify(mx.sel) === JSON.stringify([{ v: '4', oranye: true }, { v: '·', oranye: false }, { v: '2', oranye: true }]), JSON.stringify(mx));

    await foto('07-gerai');
    /* ---------- pengiriman ---------- */
    await p.evaluate(() => { location.hash = '#/shipments/DO-0101'; });
    await tunggu(() => document.querySelector('aside .num'));
    const kr = await p.evaluate(() => ({ baris: document.querySelectorAll('tbody tr').length, aside: document.querySelector('aside').innerText }));
    c('W20 pengiriman: 2 dokumen, detail DO-0101 menampilkan tujuan, PO, dan pcs dikemas 10', kr.baris === 2 && /SJ-0101/.test(kr.aside) && /Toys Kingdom PIM/.test(kr.aside) && /PO-77/.test(kr.aside) && /Packed\s*10/i.test(kr.aside), kr.aside);

    await foto('08-kirim');
    /* ---------- label QR dan alamat dari QR ---------- */
    await p.evaluate(() => { location.hash = '#/labels'; });
    await tunggu(() => document.querySelectorAll('.qr[data-siap]').length === 2);
    const qr = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.qr svg'), e => e.getAttribute('data-qr')));
    c('W21 label QR zona pertama: satu per lokasi, isinya alamat WMS #lokasi=KODE', qr.length === 2 && /\/wms\/#lokasi=A-01-1$/.test(qr[0]) && /#lokasi=A-01-2$/.test(qr[1]), JSON.stringify(qr));
    await foto('09-label');
    await p.evaluate(() => { location.hash = '#lokasi=A-01-2'; });
    await tunggu(() => document.activeElement && document.activeElement.id === 'scanLok');
    const dariQr = await p.evaluate(() => ({ f: document.activeElement.id, cek: document.getElementById('scanLok').getAttribute('data-cek') }));
    c('W22 membuka alamat dari QR rak langsung menampilkan rak itu dan kotak scan siap', dariQr.f === 'scanLok' && dariQr.cek === '8991000000028', JSON.stringify(dariQr));

    /* ---------- Field Op ---------- */
    await p.evaluate(() => { location.hash = '#/field'; });
    await tunggu(() => { const w = document.getElementById('wadahLapangan'); return w && w.shadowRoot && /LAPORAN-LAPANGAN-UJI/.test(w.shadowRoot.innerHTML); }, null, 8000);
    const fo = await p.evaluate(() => ({ isi: document.getElementById('wadahLapangan').shadowRoot.innerHTML, tautan: Array.prototype.map.call(document.querySelectorAll('#utama a[href^="http"]'), a => a.href) }));
    c('W23 Field Op: laporan tampil di shadow root, semua tautan lapangan menuju mofmo-lapangan.pages.dev', /LAPORAN-LAPANGAN-UJI/.test(fo.isi) && fo.tautan.length === 3 && fo.tautan.every(h => /^https:\/\/mofmo-lapangan\.pages\.dev\//.test(h)) && !/exec\?fop/.test(fo.isi + fo.tautan.join()), JSON.stringify(fo.tautan));

    await foto('10-lapangan');
    /* ---------- kalender ---------- */
    await p.evaluate(() => { location.hash = '#/calendar'; });
    await tunggu(() => document.querySelector('details'));
    const kal = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('details summary'), e => e.innerText.replace(/\s+/g, ' ')).slice(0, 3));
    c('W24 kalender: acara berikutnya dimulai 10.10 besok, lalu gajian 25 Okt', /10\.10 sale.*10 Oct · tomorrow/.test(kal[0]) && /Payday.*25 Oct/.test(kal[1]), JSON.stringify(kal));

    await foto('11-kalender');
    /* ---------- tema, suara, bahasa ---------- */
    await p.evaluate(() => { location.hash = '#/summary'; });
    await tunggu(() => document.querySelector('.grid-kpi .kpi'));
    await p.click('.atas [data-aksi=tema]');
    const tema = await p.evaluate(() => ({ t: document.documentElement.getAttribute('data-theme'), s: localStorage.getItem('wms_tema'), bg: getComputedStyle(document.body).backgroundColor }));
    await foto('12-ringkasan-malam');
    await p.click('.atas [data-aksi=tema]');
    const tema2 = await p.evaluate(() => ({ t: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor }));
    c('W25 saklar siang/malam mengganti tema, warna latar ikut berubah, dan pilihannya diingat', tema.t === 'dark' && tema.s === 'dark' && tema2.t === 'light' && tema.bg !== tema2.bg, JSON.stringify([tema, tema2]));
    await p.click('.atas [data-aksi=suara]');
    await nada();
    await p.evaluate(() => { location.hash = '#/map/A-01-1'; });
    await tunggu(() => document.getElementById('scanLok'));
    await p.fill('#scanLok', '8991000000028'); await p.press('#scanLok', 'Enter');
    const bisu = await nada(), bisuK = await p.evaluate(() => document.getElementById('scanBox').className);
    await p.click('.atas [data-aksi=suara]');
    c('W26 suara dimatikan: tidak ada nada sama sekali, tapi gerak tolak tetap jalan', bisu.length === 0 && /tolak/.test(bisuK) && (await p.evaluate(() => localStorage.getItem('wms_suara'))) === 'on', JSON.stringify([bisu, bisuK]));
    await p.click('.atas [data-aksi=bahasa]');
    const id = await p.evaluate(() => ({ nav: Array.prototype.map.call(document.querySelectorAll('.nv'), e => e.textContent), lang: document.documentElement.lang }));
    await p.click('.atas [data-aksi=bahasa]');
    c('W27 bahasa Indonesia mengganti menu', id.lang === 'id' && id.nav.indexOf('Ringkasan') > -1 && id.nav.indexOf('Persediaan') > -1, JSON.stringify(id));

    /* ---------- HP ---------- */
    await p.setViewportSize({ width: 390, height: 844 });
    for (const h of ['#/summary', '#/stock', '#/map', '#/passport/8991000000011', '#/shipments', '#/calendar']) {
      await p.evaluate(x => { location.hash = x; }, h); await jeda(250);
      await foto('13-hp-' + h.replace(/[^a-z]/g, ''));
      const lebar = await p.evaluate(() => document.documentElement.scrollWidth);
      if (lebar > 392) { const lebarnya = await p.evaluate(() => Array.prototype.filter.call(document.querySelectorAll('#app *'), e => e.getBoundingClientRect().right > 392 && !e.closest('.tabel-box')).slice(0, 6).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right))); c('W28 lebar HP 390: tidak ada geser samping', false, h + ' ' + lebar + ' ' + JSON.stringify(lebarnya)); break; }
    }
    if (!cek.some(x => /^W28/.test(x[0]))) c('W28 lebar HP 390: tidak ada geser samping di 6 halaman utama', true);
    await p.setViewportSize({ width: 1360, height: 900 });

    /* ---------- tiket kedaluwarsa, lalu keluar ---------- */
    S.perluMasuk = true;
    await p.evaluate(() => { location.hash = '#/summary'; });
    await p.click('.atas [data-aksi=muat]');
    await tunggu(() => document.getElementById('formMasuk'));
    const habis = await p.evaluate(() => ({ form: !!document.getElementById('formMasuk'), ss: JSON.stringify(sessionStorage), ls: JSON.stringify(localStorage) }));
    c('W29 tiket ditolak server: kembali ke halaman masuk dan tiket serta data simpanan dibuang', habis.form && !/TIKET|wms_simpan/.test(habis.ss + habis.ls), JSON.stringify(habis).slice(0, 200));
    S.perluMasuk = false;
  } catch (e) {
    c('MATI di tengah jalan', false, e.stack);
  }
  c('W30 tidak ada galat JavaScript di halaman selama seluruh uji', galatHalaman.length === 0, galatHalaman.join(' | ').slice(0, 400));

  await b.close(); srv.close();
  let gagal = 0;
  cek.forEach(x => { if (!x[1]) gagal++; console.log((x[1] ? 'LULUS ' : 'GAGAL ') + x[0] + (x[1] ? '' : '\n      -> ' + String(x[2]).slice(0, 600))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
})();
