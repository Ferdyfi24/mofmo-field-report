/* Uji setoran Shopee yang sekalian menggerakkan stok (wms/lapshopee.js), 12 Okt 2026 sore.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy: jam serah terima, barang di jalan, diterima, dan
 * retur harus terlihat di WMS (Gudang > Shopee, Ringkasan, Penjualan), dan
 * setoran sore harus sekalian menggerakkan stok, dengan Excel gudang yang
 * lebih simpel. WMS sudah punya jalur stok Shopee yang teruji (Unggah Excel
 * Shopee: obdShpPratinjau lalu obdShpSimpan, Gudang.gs) yang menulis Pesanan
 * Online, kardus packing, buku besar saat serah kurir, diterima, dan retur,
 * serta mencegah satu pesanan tertulis dua kali. Setoran sore merakit berkas
 * berbentuk Excel Operasi Stok (tab Pesanan Online, Kirim Shopee, PACKING
 * SHOPEE) dari baris setoran, lalu memanggil jalur itu. Foto kirim, foto
 * serah, dan lokasi tetap wajib (keputusan Ferdy).
 * Cacat yang paling mahal dan paling diam:
 *  - judul kolom berkas rakitan beda satu huruf dari Excel Operasi Stok, jadi
 *    server tidak menemukan kolomnya dan tidak ada yang bergerak;
 *  - isian kemas/serah yang cuma ditulis di baris pertama pesanan tidak
 *    terbawa ke barang kedua, jadi barang kedua tidak ikut dikemas;
 *  - Ferdy mau sekali jalan: satu kali Setor, stok ikut bergerak, tanpa klik
 *    kedua. Jalur Gudang Shopee mengingat tahap tiap pesanan (sudah dikemas,
 *    diserahkan, diterima, diretur), jadi setoran ulang tidak menulis dua
 *    kali; klien cukup tidak memanggil obdShpSimpan saat pratinjau bilang
 *    tidak ada yang baru;
 *  - pesanan yang belum dikemas ikut masuk PACKING SHOPEE.
 * Judul kolom di bawah disalin dari Mofmo_Shopee_NEW_PLUS_v8.1.xlsx (berkas
 * yang selama ini diunggah gudang): itulah kontraknya.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http'), { execFileSync } = require('child_process');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 14;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const SEMENTARA = fs.mkdtempSync('/tmp/uji-shopee-gerak-');

const KEPALA_PESANAN = ['No Pesanan', 'Saluran', 'Tanggal Pesan', 'Barcode', 'Qty', 'Waktu Picking', 'Waktu Packing', 'Waktu Serah Kurir', 'Kurir', 'Waktu Diterima', 'Catatan', 'Bukti Foto', 'Tanggal (otomatis)', 'SKU (otomatis)', 'Nama Produk (otomatis)', 'Pesanan (otomatis)', 'Urutan Pesanan (otomatis)', 'Dipetik (otomatis)', 'Status Petik (otomatis)', 'Harga Jual', 'Waktu Retur', 'Retur Bagus', 'Retur Rusak', 'Alasan Retur', 'Kumulatif Barcode (otomatis)'];
const KEPALA_KIRIM = ['No Pesanan', 'Saluran (otomatis)', 'Tanggal Pesan (otomatis)', 'Jumlah SKU (otomatis)', 'Qty Pesan (otomatis)', 'Qty Dipetik (otomatis)', 'Koli', 'Berat (kg)', 'Lokasi Staging', 'Dipacking Oleh', 'Waktu Packing', 'Link Foto Kirim', 'Jasa Kirim', 'No Resi', 'Nama Kurir Penjemput', 'Diserahkan Oleh', 'Waktu Serah Kurir', 'Link Foto Serah Kurir', 'No Serah Terima', 'Catatan', 'Sudah Diserap', 'Status (otomatis)', 'Daftar Pesanan (otomatis)', 'Urut Surat (otomatis)', 'Waktu Diterima'];
const KEPALA_PACKING = ['No Pesanan', 'Saluran', 'Tanggal Pesan', 'Barcode', 'SKU', 'Nama Produk', 'Qty Pesan', 'Lokasi', 'Qty Petik', 'Qty Kemas', 'Link Foto Kirim', 'Link Foto Serah Kurir', 'Jasa Kirim', 'No Resi', 'Koli', 'Berat (kg)', 'Dipacking Oleh', 'Waktu Packing', 'Diserahkan Oleh', 'Nama Kurir Penjemput', 'Waktu Serah Kurir', 'No Serah Terima', 'Baris Kirim (otomatis)', 'Siap (otomatis)', 'Urut Shopee (otomatis)'];

const BEAR = '8991000000011', TIGER = '8991000000028', PANDA = '8991000000035';
const DP = { ok: true, hariIni: '2026-10-12', bulanIni: '2026-10', tarif: 0.1, diperbarui: '12 Oct 2026 03:00',
  lok: [{ k: 'HO', n: 'HO', toko: 0 }, { k: 'SHP', n: 'Paket Shopee', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }],
  prod: [{ b: BEAR, n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250 }, { b: TIGER, n: 'MOFMOFRIENDS key charm - Tiger', s: 'MF-KC-008', hs: 150000, h: 166500 }, { b: PANDA, n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 200000, h: 222000 }],
  baris: [['2026-09-01', 0, 10, 3, 0], ['2026-09-01', 1, 10, 3, 0], ['2026-09-01', 2, 10, 3, 0]], invoiceMitra: [], opname: [] };
const FK = 'https://drive.google.com/file/d/KIRIM1/view', FS = 'https://drive.google.com/file/d/SERAH1/view';
/* setoran: P2 dua barang, isian kemas/serah cuma di baris pertama; P3 belum dikemas; P4 batal; P1 diterima dan retur */
const SH = { ok: true, hariIni: '2026-10-12', setoran: [], baris: [
  { no: '261011CCCCCCCC', barcode: TIGER, qty: 2, harga: 120000, tPesan: '2026-10-11 15:00', tKemas: '2026-10-12 09:00', tSerah: '', jasa: '', resi: '', status: '', tTerima: '', tRetur: '', rBagus: 0, rRusak: 0, alasan: '', catatan: '', lokasi: 'R1-4B', pengemas: 'Armand', fotoKirim: FK, namaKurir: '', fotoSerah: '', disetor: '2026-10-12', oleh: 'Rina' }] };

/* ================= A. urai dan rakit (Node) ================= */
let LS = null;
try { const k = { window: {}, console }; k.window.window = k.window; vm.createContext(k); vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/lapshopee.js'), 'utf8'), k); LS = k.window.WmsLapShopee; } catch (e) { c('A0 lapshopee.js termuat', false, e.message); }
/* 16 Okt 2026: kolom Kode Kartu QR (kartu QR paket diikat ke pesanan, uji-kartu-qr-setor.js) masuk sesudah Link Foto Kirim,
   jadi daftar pilihan jasa, alasan, dan batal bergeser satu kolom (N, U, W). */
const KEP_BARU = ['No Pesanan', 'Barcode', 'SKU (otomatis)', 'Nama Produk (otomatis)', 'Qty', 'Harga Jual', 'Waktu Pesan', 'Waktu Kemas', 'Lokasi Ambil (rak)', 'Dikemas Oleh', 'Link Foto Kirim', 'Kode Kartu QR', 'Waktu Serah Kurir', 'Jasa Kirim', 'No Resi', 'Nama Kurir', 'Link Foto Serah', 'Waktu Diterima', 'Retur Bagus', 'Retur Rusak', 'Alasan Retur', 'Waktu Retur', 'Batal', 'Catatan'];
const baris = o => KEP_BARU.map(h => o[h] == null ? '' : o[h]);
function bagianA() {
  if (!LS || !LS._uraiBuku || !LS._opsTabel) { c('A0 _uraiBuku dan _opsTabel ada', false, Object.keys(LS || {}).join(',')); return; }
  const u = LS._uraiBuku({ Pesanan: [['judul'], ['Tanggal laporan', '2026-10-12'], ['Disetor oleh', 'Rina'], ['PESANAN'], KEP_BARU,
    baris({ 'No Pesanan': '261012PPPPPPPP', Barcode: BEAR, Qty: 1, 'Harga Jual': 250000, 'Waktu Pesan': '2026-10-12 08:00', 'Waktu Kemas': '2026-10-12 10:00', 'Lokasi Ambil (rak)': 'R2-1B-1', 'Dikemas Oleh': 'Armand', 'Link Foto Kirim': FK, 'Waktu Serah Kurir': '2026-10-12 16:00', 'Jasa Kirim': 'SPX Standard', 'No Resi': 'SPXID9', 'Nama Kurir': 'Budi', 'Link Foto Serah': FS }),
    baris({ 'No Pesanan': '261012PPPPPPPP', Barcode: PANDA, Qty: 2, 'Harga Jual': 300000, 'Waktu Pesan': '2026-10-12 08:00' }),
    baris({ 'No Pesanan': '261012QQQQQQQQ', Barcode: TIGER, Qty: 1, 'Harga Jual': 120000, 'Waktu Pesan': '2026-10-12 11:00' }),
    baris({ 'No Pesanan': '261012BBBBBBBB', Barcode: TIGER, Qty: 1, 'Waktu Pesan': '2026-10-12 07:00', Batal: 'YA' })] });
  const p2 = (u.baris || [])[1] || {};
  c('A1 Excel baru: isian kemas dan serah dari baris pertama pesanan terbawa ke barang kedua; lokasi, pengemas, foto, kurir ikut; Batal YA jadi status Batal',
    u.baris && u.baris.length === 4 && p2.barcode === PANDA && p2.tKemas === '2026-10-12 10:00' && p2.lokasi === 'R2-1B-1' && p2.pengemas === 'Armand' && p2.fotoKirim === FK && p2.tSerah === '2026-10-12 16:00' && p2.jasa === 'SPX Standard' && p2.resi === 'SPXID9' && p2.namaKurir === 'Budi' && p2.fotoSerah === FS &&
    u.baris[2].tKemas === '' && u.baris[3].status === 'Batal' && u.oleh === 'Rina', JSON.stringify(u).slice(0, 900));
  const T = LS._opsTabel(u.baris, DP, 'Rina');
  const nama = Object.keys(T || {});
  const PO = (T || {})['Pesanan Online'] || [], KS = (T || {})['Kirim Shopee'] || [], PK = (T || {})['PACKING SHOPEE'] || [];
  c('A2 berkas rakitan bertab Pesanan Online, Kirim Shopee, PACKING SHOPEE dengan judul kolom persis Excel Operasi Stok (baris 6, 6, dan 1)',
    nama.join(',') === 'Pesanan Online,Kirim Shopee,PACKING SHOPEE' && JSON.stringify(PO[5]) === JSON.stringify(KEPALA_PESANAN) && JSON.stringify(KS[5]) === JSON.stringify(KEPALA_KIRIM) && JSON.stringify(PK[0]) === JSON.stringify(KEPALA_PACKING),
    JSON.stringify([nama, PO[5], KS[5], PK[0]]).slice(0, 900));
  const ix = (h, n) => h.indexOf(n);
  const po = PO.slice(6).map(r => [r[0], r[1], r[2], r[3], r[4], r[ix(KEPALA_PESANAN, 'Tanggal (otomatis)')], r[ix(KEPALA_PESANAN, 'SKU (otomatis)')], r[ix(KEPALA_PESANAN, 'Harga Jual')]].join('|'));
  c('A3 Pesanan Online berisi semua barang (saluran SHOPEE, tanggal pesan, barcode teks, qty, SKU, harga), pesanan batal tidak dikirim ke jalur stok',
    po.join(';') === ['261012PPPPPPPP|SHOPEE|2026-10-12|' + BEAR + '|1|2026-10-12|MF-PLU-005|250000', '261012PPPPPPPP|SHOPEE|2026-10-12|' + PANDA + '|2|2026-10-12|MF-PLU-010|300000', '261012QQQQQQQQ|SHOPEE|2026-10-12|' + TIGER + '|1|2026-10-12|MF-KC-008|120000'].join(';'), po.join(';'));
  const pk = PK.slice(1).map(r => [r[0], r[3], r[ix(KEPALA_PACKING, 'Lokasi')], r[ix(KEPALA_PACKING, 'Qty Petik')], r[ix(KEPALA_PACKING, 'Qty Kemas')], r[ix(KEPALA_PACKING, 'Link Foto Kirim')] === FK, r[ix(KEPALA_PACKING, 'Link Foto Serah Kurir')] === FS, r[ix(KEPALA_PACKING, 'Waktu Packing')], r[ix(KEPALA_PACKING, 'Waktu Serah Kurir')], r[ix(KEPALA_PACKING, 'Jasa Kirim')], r[ix(KEPALA_PACKING, 'Dipacking Oleh')], r[ix(KEPALA_PACKING, 'Diserahkan Oleh')]].join('|'));
  c('A4 PACKING SHOPEE cuma barang yang sudah dikemas (P2 dua barang, P3 tidak): lokasi, qty petik = qty kemas = qty, dua foto, jam kemas dan serah, jasa, pengemas, penyerah',
    pk.join(';') === ['261012PPPPPPPP|' + BEAR + '|R2-1B-1|1|1|true|true|2026-10-12 10:00|2026-10-12 16:00|SPX Standard|Armand|Rina', '261012PPPPPPPP|' + PANDA + '|R2-1B-1|2|2|true|true|2026-10-12 10:00|2026-10-12 16:00|SPX Standard|Armand|Rina'].join(';'), pk.join(';'));
  const ks = KS.slice(6).map(r => [r[0], r[ix(KEPALA_KIRIM, 'Jumlah SKU (otomatis)')], r[ix(KEPALA_KIRIM, 'Qty Pesan (otomatis)')], r[ix(KEPALA_KIRIM, 'Lokasi Staging')], r[ix(KEPALA_KIRIM, 'No Resi')], r[ix(KEPALA_KIRIM, 'Nama Kurir Penjemput')], r[ix(KEPALA_KIRIM, 'Koli')]].join('|'));
  c('A5 Kirim Shopee satu baris per pesanan yang dikemas: 2 SKU, 3 pcs, lokasi, resi, kurir, 1 koli', ks.join(';') === '261012PPPPPPPP|2|3|R2-1B-1|SPXID9|Budi|1', ks.join(';'));
  /* jalur Gudang Shopee mewajibkan foto serah di baris packing: yang baru dikemas menunggu sampai diserahkan */
  const T2 = LS._opsTabel([{ no: '261012RRRRRRRR', barcode: BEAR, qty: 1, harga: 250000, tPesan: '2026-10-12 08:00', tKemas: '2026-10-12 10:00', lokasi: 'R2-1B-1', pengemas: 'Armand', fotoKirim: FK, tSerah: '', fotoSerah: '', jasa: '', resi: '', namaKurir: '', tTerima: '', tRetur: '', rBagus: '', rRusak: '', alasan: '', catatan: '' }], DP, 'Rina');
  c('A6 pesanan yang baru dikemas (belum serah, belum ada foto serah) tetap tercatat di Pesanan Online tapi belum masuk PACKING dan Kirim Shopee', T2['Pesanan Online'].length === 7 && T2['PACKING SHOPEE'].length === 1 && T2['Kirim Shopee'].length === 6, JSON.stringify([T2['Pesanan Online'].length, T2['PACKING SHOPEE'].length, T2['Kirim Shopee'].length]));
}
try { bagianA(); } catch (e) { c('A MATI', false, e.stack); }

/* ================= B. layar (Playwright) ================= */
const PY = `
import sys, json, base64, io, openpyxl
mode = sys.argv[1]
if mode == 'b64':
    wb = openpyxl.load_workbook(io.BytesIO(base64.b64decode(open(sys.argv[2]).read())), data_only=True)
    print(json.dumps({'nama': wb.sheetnames, 'po6': [c for c in next(wb['Pesanan Online'].iter_rows(min_row=6, max_row=6, values_only=True))], 'pk': [list(r) for r in wb['PACKING SHOPEE'].iter_rows(min_row=1, max_row=4, values_only=True)]}, default=str))
elif mode == 'baca':
    wb = openpyxl.load_workbook(sys.argv[2])
    ws = wb['Pesanan']
    print(json.dumps({'nama': wb.sheetnames, 'kepala': [c.value for c in ws[5]], 'grup': [c.value for c in ws[4]], 'dv': sorted(str(d.sqref).split(':')[0] + '=' + (d.formula1 or '')[:16] for d in ws.data_validations.dataValidation), 'baris': [[c for c in r] for r in ws.iter_rows(min_row=6, max_row=8, max_col=23, values_only=True)], 'petunjuk': [r[0] for r in wb['Petunjuk'].iter_rows(values_only=True) if r[0]]}, default=str))
elif mode == 'isi':
    wb = openpyxl.load_workbook(sys.argv[2]); ws = wb['Pesanan']; ws['B3'] = 'Rina'
    kol = {c.value: c.column for c in ws[5]}
    r = 6
    while ws.cell(r, 1).value: r += 1
    isi = [{'No Pesanan': '261012PPPPPPPP', 'Barcode': '${BEAR}', 'Qty': 1, 'Harga Jual': 250000, 'Waktu Pesan': '2026-10-12 08:00', 'Waktu Kemas': '2026-10-12 10:00', 'Lokasi Ambil (rak)': 'R2-1B-1', 'Dikemas Oleh': 'Armand', 'Link Foto Kirim': '${FK}', 'Waktu Serah Kurir': '2026-10-12 16:00', 'Jasa Kirim': 'SPX Standard', 'No Resi': 'SPXID9', 'Nama Kurir': 'Budi', 'Link Foto Serah': '${FS}'},
           {'No Pesanan': '261012PPPPPPPP', 'Barcode': '${PANDA}', 'Qty': 2, 'Harga Jual': 300000, 'Waktu Pesan': '2026-10-12 08:00'}]
    for o in isi:
        for k, v in o.items(): ws.cell(r, kol[k]).value = v
        r += 1
    wb.save(sys.argv[3]); print('{}')
`;
const py = (...a) => { try { return JSON.parse(execFileSync('python3', ['-c', PY, ...a], { encoding: 'utf8', timeout: 60000 })); } catch (e) { return { galat: String(e.stderr || e.message).slice(-400) }; } };

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
  const PAPAN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Papan</title><style>#layarIsi{display:none}</style></head><body><div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
    '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div><h1>Papan Data</h1></div><div id="kopKanan"></div></div></header><nav id="panel"></nav><div id="isi"></div></div>' +
    '<script>function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";window.__siap=1;}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
  await new Promise(r => srv.listen(8791, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [], panggil = [];
  let pratJawab = null;
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  try {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      panggil.push({ nama: m.nama, args: m.args });
      let h;
      if (m.nama === 'dataPapan') h = { pintu: 'ok', hasil: DP };
      else if (m.nama === 'permintaanDanPiutang') h = { pintu: 'ok', hasil: { ok: true, tagihan: { ok: true, baris: [] } } };
      else if (m.nama === 'wmsShopeeData') h = { pintu: 'ok', hasil: SH };
      else if (m.nama === 'wmsShopeeSetor') h = { pintu: 'ok', hasil: { ok: true, tanggal: '2026-10-12', baru: 2, diperbarui: 0, ditolak: [], setoran: {} } };
      else if (m.nama === 'obdShpPratinjau') h = { pintu: 'ok', hasil: pratJawab };
      else if (m.nama === 'obdShpSimpan') h = { pintu: 'ok', hasil: { ok: true, pesan: 'Tersimpan: 1 pesanan baru, 1 dipacking, 1 diserahkan ke kurir, 3 pcs penjualan Shopee ke Inventory.' } };
      else h = { pintu: 'galat', pesan: 'Fungsi "' + m.nama + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') { const w = new Date(Date.now() - 60000).toISOString(); const o = { 'dataPapan|["K"]': DP, 'klien|papan': { ok: true, versi: 'gs', html: PAPAN }, 'klien|versi': { ok: true, versi: 'gs' } }; const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; }); h = { ok: true, isi }; }
      else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => galat.push(e.message));
    await p.goto('http://localhost:8791/wms/');
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'id'); localStorage.setItem('wms_maskot', 'off'); });
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    let fr = null; const t0 = Date.now();
    while (Date.now() - t0 < 12000) { fr = p.frames().find(x => x !== p.mainFrame()); try { if (fr && await fr.evaluate(() => !!document.querySelector('[data-wms=laporan]'))) break; } catch (e) {} await jeda(100); }
    await fr.evaluate(() => document.querySelector('[data-wms=laporan]').click());
    await p.waitForSelector('#laporan [data-laporan-tab=shopee]', { timeout: 8000 });
    await p.click('#laporan [data-laporan-tab=shopee]');
    await p.waitForSelector('#laporan [data-ls-kartu=harian]', { timeout: 8000 }).catch(() => {});
    /* mentahan baru */
    const [u] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#laporan [data-ls=mentahan]')]);
    const mf = path.join(SEMENTARA, 'mentahan.xlsx'); fs.copyFileSync(await u.path(), mf);
    const m = py('baca', mf);
    const kosongDulu = (m.baris || [])[0] || [];
    c('B1 Excel gudang satu lembar: kepala kolom baru (lokasi, pengemas, dua foto, kurir, batal), baris pengelompokan PESANAN/KEMAS/SERAH KURIR/DITERIMA DAN RETUR, daftar pilihan jasa, alasan, batal; pesanan terbuka terisi lokasi dan foto lamanya',
      JSON.stringify(m.kepala) === JSON.stringify(KEP_BARU) && /PESANAN/.test((m.grup || []).join('|')) && /KEMAS/.test((m.grup || []).join('|')) && /SERAH/.test((m.grup || []).join('|')) && /RETUR/.test((m.grup || []).join('|')) &&
      (m.dv || []).some(x => /^N6="SPX Standard/.test(x)) && (m.dv || []).some(x => /^U6="Gagal kirim/.test(x)) && (m.dv || []).some(x => /^W6="YA/.test(x)) && (m.dv || []).some(x => /^B6=Produk!\$A\$2/.test(x)) &&
      kosongDulu[0] === '261011CCCCCCCC' && kosongDulu[8] === 'R1-4B' && kosongDulu[9] === 'Armand' && kosongDulu[10] === FK && (m.petunjuk || []).length <= 9,
      JSON.stringify(m).slice(0, 1200));
    /* isi dan setor */
    const terisi = path.join(SEMENTARA, 'terisi.xlsx'); py('isi', mf, terisi);
    pratJawab = { ok: true, token: 'TOKEN-1', nama: 'x', pesan: 'Siap disimpan: 1 pesanan baru, 1 dipacking, 1 diserahkan ke kurir, 3 pcs penjualan Shopee ke Inventory, 0 diterima pembeli, 0 retur. Pesanan bermasalah: 1, dilewati sampai dibetulkan.',
      jml: { impor: 1, kemas: 1, serah: 1, salah: 1, tunda: 0, susul: 0, terima: 0, retur: 0, harga: 1, pcsJual: 3 }, salah: [{ no: '261011CCCCCCCC', alasan: 'Link Foto Serah Kurir belum diisi.' }] };
    await p.setInputFiles('#lsBerkas', terisi);
    await p.waitForSelector('#lsPrat [data-ls=setor]', { timeout: 10000 });
    await p.click('#lsPrat [data-ls=setor]');
    await p.waitForFunction(() => /Tersimpan: 1 pesanan baru/.test((document.getElementById('lsPrat') || {}).innerText || ''), null, { timeout: 10000 }).catch(() => {});
    await jeda(300);
    const pr = panggil.find(x => x.nama === 'obdShpPratinjau') || { args: [] };
    const b64f = path.join(SEMENTARA, 'b64.txt'); fs.writeFileSync(b64f, String(pr.args[1] || ''));
    const isiB = pr.args[1] ? py('b64', b64f) : {};
    const t2 = await p.evaluate(() => (document.getElementById('lsPrat') || {}).innerText || '');
    const urut = n => panggil.findIndex(x => x.nama === n);
    c('B2 sesudah Setor: laporan tersimpan, pratinjau gerak stok dipanggil dengan berkas rakitan (tab dan judul kolom Excel Operasi Stok) atas nama tiket WMS (PACKING berisi dua barang P; pesanan kemarin yang baru dikemas menunggu diserahkan)',
      urut('wmsShopeeSetor') > -1 && urut('wmsShopeeSetor') < urut('obdShpPratinjau') && pr.args[0] === 'WMS-TIKET' && /^setoran-shopee-2026-10-12/.test(pr.args[2] || '') &&
      (isiB.nama || []).join(',') === 'Pesanan Online,Kirim Shopee,PACKING SHOPEE' && JSON.stringify(isiB.po6) === JSON.stringify(KEPALA_PESANAN) && (isiB.pk || []).slice(1).map(r => r[0]).filter(Boolean).join(',') === '261012PPPPPPPP,261012PPPPPPPP',
      JSON.stringify([panggil.map(x => x.nama), pr.args[0], pr.args[2], isiB]).slice(0, 900));
    const sm = panggil.find(x => x.nama === 'obdShpSimpan') || { args: [] };
    c('B3 sekali jalan: tanpa klik kedua, stok langsung digerakkan sesudah pratinjau (obdShpSimpan sekali, token dan berkas yang sama persis, penyetor tercatat), data Shopee dibaca ulang',
      urut('obdShpPratinjau') > -1 && urut('obdShpPratinjau') < urut('obdShpSimpan') && panggil.filter(x => x.nama === 'obdShpSimpan').length === 1 &&
      sm.args[0] === 'WMS-TIKET' && sm.args[1] === 'TOKEN-1' && sm.args[2] === pr.args[1] && sm.args[3] === pr.args[2] && sm.args[4] === 'Rina' && panggil.filter(x => x.nama === 'wmsShopeeData').length >= 2,
      JSON.stringify([panggil.map(x => x.nama), sm.args.slice(0, 2), sm.args[3], sm.args[4]]).slice(0, 600));
    const tb4 = await p.evaluate(() => !!document.querySelector('#lsPrat [data-ls=gerak]'));
    c('B4 hasil tampil: pesan simpan server, pesanan bermasalah tetap disebut dengan alasannya, tanpa tombol kedua', /Tersimpan: 1 pesanan baru/.test(t2) && /261011CCCCCCCC/.test(t2) && /Link Foto Serah Kurir belum diisi/.test(t2) && !tb4, t2);
    /* pratinjau tanpa kerja: tidak ada tombol */
    pratJawab = { ok: true, token: 'TOKEN-2', pesan: 'Belum ada yang bisa disimpan. Pesanan bermasalah: 1.', jml: { impor: 0, kemas: 0, serah: 0, salah: 1, tunda: 0, susul: 0, terima: 0, retur: 0, harga: 0, pcsJual: 0 }, salah: [{ no: '261012PPPPPPPP', alasan: 'Link Foto Kirim belum diisi.' }] };
    await p.setInputFiles('#lsBerkas', terisi);
    await p.waitForSelector('#lsPrat [data-ls=setor]', { timeout: 10000 });
    await p.click('#lsPrat [data-ls=setor]');
    await p.waitForFunction(() => /Belum ada yang bisa disimpan/.test((document.getElementById('lsPrat') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    await jeda(400);
    const t5 = await p.evaluate(() => ({ teks: (document.getElementById('lsPrat') || {}).innerText || '', tombol: !!document.querySelector('#lsPrat [data-ls=gerak]') }));
    c('B5 pratinjau tanpa ada yang bisa digerakkan: alasannya tampil, stok tidak disentuh (obdShpSimpan tidak dipanggil lagi)', /Belum ada yang bisa disimpan/.test(t5.teks) && /Link Foto Kirim belum diisi/.test(t5.teks) && !t5.tombol && panggil.filter(x => x.nama === 'obdShpSimpan').length === 1, JSON.stringify([t5, panggil.filter(x => x.nama === 'obdShpSimpan').length]));
    /* setor ulang berkas yang sama: server bilang tidak ada yang baru, jadi tidak ada tulisan kedua */
    pratJawab = { ok: true, token: 'TOKEN-3', pesan: 'Tidak ada yang baru di berkas ini.', jml: { impor: 0, kemas: 0, serah: 0, salah: 0, tunda: 0, susul: 0, terima: 0, retur: 0, harga: 0, pcsJual: 0 } };
    const nPrat = panggil.filter(x => x.nama === 'obdShpPratinjau').length;
    await p.setInputFiles('#lsBerkas', terisi);
    await p.waitForSelector('#lsPrat [data-ls=setor]', { timeout: 10000 });
    await p.click('#lsPrat [data-ls=setor]');
    await p.waitForFunction(() => /Tidak ada yang baru/.test((document.getElementById('lsPrat') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    await jeda(400);
    const t8 = await p.evaluate(() => (document.getElementById('lsPrat') || {}).innerText || '');
    c('B8 setor ulang berkas yang sama: pratinjau jalan, server bilang tidak ada yang baru, stok tidak ditulis dua kali', panggil.filter(x => x.nama === 'obdShpPratinjau').length === nPrat + 1 && panggil.filter(x => x.nama === 'obdShpSimpan').length === 1 && /Tidak ada yang baru/.test(t8), t8);
    /* jalur stok belum dibuka (deploy) */
    pratJawab = null;
    await ctx.unroute(API + '**');
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.nama === 'wmsShopeeData') h = { pintu: 'ok', hasil: SH };
      else if (m.nama === 'wmsShopeeSetor') h = { pintu: 'ok', hasil: { ok: true, tanggal: '2026-10-12', baru: 0, diperbarui: 2, ditolak: [], setoran: {} } };
      else h = { pintu: 'galat', pesan: 'Fungsi "' + m.nama + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await p.setInputFiles('#lsBerkas', terisi);
    await p.waitForSelector('#lsPrat [data-ls=setor]', { timeout: 10000 });
    await p.click('#lsPrat [data-ls=setor]');
    await jeda(1500);
    const t6 = await p.evaluate(() => (document.getElementById('lsPrat') || {}).innerText || '');
    c('B6 jalur stok tidak bisa dipanggil: laporan tetap tersimpan, lalu disebut bahwa stok belum digerakkan beserta alasannya', /Tersimpan: 0 baris baru, 2 diperbarui/.test(t6) && /stok belum digerakkan/i.test(t6), t6);
    await ctx.close();
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('B7 tidak ada galat JavaScript', galat.length === 0, galat.join(' | '));
  await b.close(); srv.close();
}

bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 1200))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
