/* Uji kolom Kode Kartu QR di Excel gudang Shopee dan pemasangannya saat setor (wms/lapshopee.js), 16 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Kartu QR paket dicetak kosong; isinya baru ada setelah
 * diikat ke No Pesanan Shopee. Gudang kerja di Excel (mentahan harian yang
 * disetor sore di Laporan > Shopee), jadi jalur hariannya kolom Kode Kartu QR
 * di Excel itu: scanner mengetik isi QR (https://mofmofriends.id/#k=KODE) ke
 * sel di baris pertama pesanan. Saat setor, kartu dipasang ke pesanannya lewat
 * Edge Function kitab (aksi pasangKartu). Cacat yang paling mahal dan diam:
 *  - kolom baru menggeser kolom lain sehingga daftar pilihan jasa kirim,
 *    alasan retur, dan batal menempel di kolom yang salah;
 *  - kartu cuma ditulis di baris pertama pesanan dan tidak terbawa, atau satu
 *    pesanan berisi dua kartu berbeda lalu dua-duanya dikirim;
 *  - pesanan batal tetap dipasangi kartu;
 *  - kode kartu ikut terkirim ke lembar laporan Apps Script (wmsShopeeSetor);
 *  - kartu dipasang padahal laporan gagal tersimpan;
 *  - setor ulang berkas yang sama ditampilkan sebagai galat;
 *  - bentrok (kartu dipakai dua pesanan) tidak disebut, gudang tidak tahu.
 * Edge Function dijawab inti.js yang sama dengan yang dipasang, basis data
 * tiruan, tiket WMS buatan crypto node. Tanpa jaringan, tanpa data nyata.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http'), { execFileSync } = require('child_process'), { createHmac } = require('crypto');
const AKAR = process.env.AKAR || process.env.WMS_AKAR || path.resolve(__dirname, '..');
const SRV = process.env.KITAB_SERVER || '/home/claude/wms-supabase';
const DIHARAPKAN = 12;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const SEMENTARA = fs.mkdtempSync('/tmp/uji-kartu-qr-setor-');

const BEAR = '8991000000011', TIGER = '8991000000028', PANDA = '8991000000035';
const DP = { ok: true, hariIni: '2026-11-05', bulanIni: '2026-11', tarif: 0.1, diperbarui: '5 Nov 2026 03:00',
  lok: [{ k: 'HO', n: 'HO', toko: 0 }, { k: 'SHP', n: 'Paket Shopee', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }],
  prod: [{ b: BEAR, n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250 }, { b: TIGER, n: 'MOFMOFRIENDS key charm - Tiger', s: 'MF-KC-008', hs: 150000, h: 166500 }, { b: PANDA, n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 200000, h: 222000 }],
  baris: [['2026-09-01', 0, 10, 3, 0], ['2026-09-01', 1, 10, 3, 0], ['2026-09-01', 2, 10, 3, 0]], invoiceMitra: [], opname: [] };
const SH = { ok: true, hariIni: '2026-11-05', setoran: [], baris: [] };
const FK = 'https://drive.google.com/file/d/KIRIM1/view', FS = 'https://drive.google.com/file/d/SERAH1/view';
const QR = (k) => 'https://mofmofriends.id/#k=' + k;
/* Excel gudang sesudah kolom baru: Kode Kartu QR menempel di kelompok KEMAS, tepat sesudah Link Foto Kirim */
const KEP = ['No Pesanan', 'Barcode', 'SKU (otomatis)', 'Nama Produk (otomatis)', 'Qty', 'Harga Jual', 'Waktu Pesan', 'Waktu Kemas', 'Lokasi Ambil (rak)', 'Dikemas Oleh', 'Link Foto Kirim', 'Kode Kartu QR',
  'Waktu Serah Kurir', 'Jasa Kirim', 'No Resi', 'Nama Kurir', 'Link Foto Serah', 'Waktu Diterima', 'Retur Bagus', 'Retur Rusak', 'Alasan Retur', 'Waktu Retur', 'Batal', 'Catatan'];
const huruf = (i) => { let t = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };

/* ---------- Edge Function kitab: inti.js asli + basis data tiruan ---------- */
const RAHASIA = 'rahasia-uji-setor-kartu-0123456789abcdef01', SIDIK = 'sidik-uji-setor-kartu-abcdefghij';
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const EXP = Date.now() + 3600e3, TIKET = EXP + '.' + b64url(createHmac('sha256', RAHASIA).update('wms|' + EXP + '|' + SIDIK).digest());

async function utama() {
  const { tangani } = await import(SRV + '/kitab/inti.js');
  const { dbPalsu } = await import(SRV + '/kitab-tiruan.mjs');
  const db = dbPalsu(); db.st.akses = { rahasia: RAHASIA, sidik: SIDIK };
  const adm = (isi) => tangani(Object.assign({ fn: 'admin', tiket: TIKET }, isi), db, Date.now(), {});
  await adm({ aksi: 'acara', acara: { nama: '11.11 Big Sale', cap: '11.11', mulai: '2026-10-25', selesai: '2026-11-15' } });
  const K = (await adm({ aksi: 'cetakPaket', jumlah: 4, voucherKode: 'MOFMO11NOV' })).kode.map((x) => x.kode);
  const pesananDari = (k) => db.st.kode[k].pesanan || null;

  /* ================= A. urai (Node) ================= */
  let LS = null;
  try { const k = { window: {}, console }; k.window.window = k.window; vm.createContext(k); vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/lapshopee.js'), 'utf8'), k); LS = k.window.WmsLapShopee; } catch (e) { c('A0 lapshopee.js termuat', false, e.message); }
  const baris = (o) => KEP.map((h) => o[h] == null ? '' : o[h]);
  try {
    const u = LS._uraiBuku({ Pesanan: [['judul'], ['Tanggal laporan', '2026-11-05'], ['Disetor oleh', 'Rina'], ['PESANAN'], KEP,
      baris({ 'No Pesanan': '261105PPPPPPPP', Barcode: BEAR, Qty: 1, 'Waktu Pesan': '2026-11-05 08:00', 'Waktu Kemas': '2026-11-05 10:00', 'Kode Kartu QR': QR(K[0]) }),
      baris({ 'No Pesanan': '261105PPPPPPPP', Barcode: PANDA, Qty: 2, 'Waktu Pesan': '2026-11-05 08:00' })] });
    c('K1 Kode Kartu QR di baris pertama pesanan terbaca dan terbawa ke barang kedua', u.baris && u.baris.length === 2 && u.baris[0].kartu === QR(K[0]) && u.baris[1].kartu === QR(K[0]), JSON.stringify(u).slice(0, 600));
    const ps = LS._pasanganKartu([
      { no: 'A1', kartu: QR(K[0]) }, { no: 'A1', kartu: K[0].slice(0, 4).toLowerCase() + ' ' + K[0].slice(4) },
      { no: 'B2', kartu: QR(K[1]) }, { no: 'B2', kartu: QR(K[2]) },
      { no: 'C3', kartu: QR(K[3]), status: 'Batal' },
      { no: 'D4', kartu: '' }]);
    c('K2 satu kartu per pesanan (scan dan ketikan kode yang sama dianggap sama); pesanan berisi dua kartu berbeda ditahan dan disebut; pesanan batal dan tanpa kartu dilewati',
      JSON.stringify(ps.item) === JSON.stringify([{ kode: QR(K[0]), pesanan: 'A1' }]) && ps.masalah.length === 1 && ps.masalah[0].no === 'B2', JSON.stringify(ps));
    const ip = LS._isiPesananDari([{ no: 'A1', barcode: BEAR, qty: 1 }, { no: 'A1', barcode: BEAR, qty: 2 }, { no: 'A1', barcode: PANDA, qty: 1 }, { no: 'C3', barcode: TIGER, qty: 1, status: 'Batal' }, { no: 'D4', barcode: TIGER, qty: 1 }]);
    c('K11 isi pesanan untuk Mofmo Collection: barcode sama dijumlah, pesanan batal tidak dikirim', JSON.stringify(ip) === JSON.stringify([{ no: 'A1', isi: [{ barcode: BEAR, qty: 3 }, { barcode: PANDA, qty: 1 }] }, { no: 'D4', isi: [{ barcode: TIGER, qty: 1 }] }]), JSON.stringify(ip));
  } catch (e) { c('A MATI', false, e.stack); }

  /* ================= B. layar (Playwright) ================= */
  const PY = `
import sys, json, openpyxl
mode = sys.argv[1]
if mode == 'baca':
    wb = openpyxl.load_workbook(sys.argv[2]); ws = wb['Pesanan']
    print(json.dumps({'kepala': [c.value for c in ws[5]], 'grup': {c.column: c.value for c in ws[4] if c.value}, 'dv': sorted(str(d.sqref).split(':')[0] + '=' + (d.formula1 or '')[:16] for d in ws.data_validations.dataValidation), 'petunjuk': [r[0] for r in wb['Petunjuk'].iter_rows(values_only=True) if r[0]]}, default=str))
elif mode == 'isi':
    wb = openpyxl.load_workbook(sys.argv[2]); ws = wb['Pesanan']; ws['B3'] = 'Rina'
    kol = {c.value: c.column for c in ws[5]}
    isi = json.loads(sys.argv[4]); r = 6
    while ws.cell(r, 1).value: r += 1
    for o in isi:
        for k, v in o.items(): ws.cell(r, kol[k]).value = v
        r += 1
    wb.save(sys.argv[3]); print('{}')
`;
  const py = (...a) => { try { return JSON.parse(execFileSync('python3', ['-c', PY, ...a], { encoding: 'utf8', timeout: 60000 })); } catch (e) { return { galat: String(e.stderr || e.message).slice(-400) }; } };
  const { chromium } = require('module').createRequire('/home/claude/fieldreport/uji/uji-wms-alat.js')('playwright');
  const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
  const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
  const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
  const srv = http.createServer((q, s) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(AKAR, p);
    if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
    s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
  });
  const PAPAN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Papan</title><style>#layarIsi{display:none}</style></head><body><div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
    '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div><h1>Papan Data</h1></div><div id="kopKanan"></div></div></header><nav id="panel"></nav><div id="isi"></div></div>' +
    '<script>function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";window.__siap=1;}).dataPapan(document.getElementById("kode").value);}</script></body></html>';
  await new Promise((r) => srv.listen(0, r));
  const PORT = srv.address().port;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [], panggil = [], kitab = [];
  let setorGagal = false, isiDitolak = false;
  const jeda = (ms) => new Promise((x) => setTimeout(x, ms));
  try {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.route(API + '**', async (r) => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      panggil.push({ nama: m.nama, args: m.args });
      let h;
      if (m.nama === 'dataPapan') h = { pintu: 'ok', hasil: DP };
      else if (m.nama === 'permintaanDanPiutang') h = { pintu: 'ok', hasil: { ok: true, tagihan: { ok: true, baris: [] } } };
      else if (m.nama === 'wmsShopeeData') h = { pintu: 'ok', hasil: SH };
      else if (m.nama === 'wmsShopeeSetor') h = setorGagal ? { pintu: 'ok', hasil: { ok: false, pesan: 'Lembar laporan sedang dikunci, coba lagi.' } } : { pintu: 'ok', hasil: { ok: true, tanggal: '2026-11-05', baru: 3, diperbarui: 0, ditolak: [], setoran: {} } };
      else if (m.nama === 'obdShpPratinjau') h = { pintu: 'ok', hasil: { ok: true, token: 'T', pesan: 'Tidak ada yang baru di berkas ini.', jml: {} } };
      else h = { pintu: 'galat', pesan: 'Fungsi "' + m.nama + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async (r) => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: TIKET, ingat: true };
      else if (m.fn === 'ambil') { const w = new Date(Date.now() - 60000).toISOString(); const o = { 'dataPapan|["K"]': DP, 'klien|papan': { ok: true, versi: 'gs', html: PAPAN }, 'klien|versi': { ok: true, versi: 'gs' } }; const isi = {}; (m.kunci || []).forEach((k) => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; }); h = { ok: true, isi }; }
      else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
    await ctx.route('**/functions/v1/kitab', async (r) => {
      const m = JSON.parse(r.request().postData() || 'null'); kitab.push(m);
      /* server lama (Edge Function sebelum tahap 3) tidak kenal isiPesanan */
      const h = isiDitolak && m.aksi === 'isiPesanan' ? { ok: false, pesan: 'Aksi tidak dikenal.' } : await tangani(m, db, Date.now(), { ip: '1.1.1.1' });
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => galat.push(e.message));
    await p.goto('http://localhost:' + PORT + '/wms/');
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'id'); localStorage.setItem('wms_maskot', 'off'); });
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    let fr = null; const t0 = Date.now();
    while (Date.now() - t0 < 12000) { fr = p.frames().find((x) => x !== p.mainFrame()); try { if (fr && await fr.evaluate(() => !!document.querySelector('[data-wms=laporan]'))) break; } catch (e) {} await jeda(100); }
    await fr.evaluate(() => document.querySelector('[data-wms=laporan]').click());
    await p.waitForSelector('#laporan [data-laporan-tab=shopee]', { timeout: 8000 });
    await p.click('#laporan [data-laporan-tab=shopee]');
    await p.waitForSelector('#laporan [data-ls=mentahan]', { timeout: 8000 });
    const [u] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#laporan [data-ls=mentahan]')]);
    const mf = path.join(SEMENTARA, 'mentahan.xlsx'); fs.copyFileSync(await u.path(), mf);
    const m = py('baca', mf);
    const ix = (h) => (m.kepala || []).indexOf(h);
    const dv = m.dv || [];
    c('K3 Excel gudang: kolom Kode Kartu QR tepat sesudah Link Foto Kirim di kelompok KEMAS; kelompok SERAH KURIR mulai di Waktu Serah Kurir; daftar pilihan jasa, alasan, batal tetap di kolomnya; petunjuk menyebut kartu',
      JSON.stringify(m.kepala) === JSON.stringify(KEP) && /SERAH/.test((m.grup || {})[ix('Waktu Serah Kurir') + 1] || '') && /DITERIMA/.test((m.grup || {})[ix('Waktu Diterima') + 1] || '') &&
      dv.some((x) => x.startsWith(huruf(ix('Jasa Kirim')) + '6="SPX Standard')) && dv.some((x) => x.startsWith(huruf(ix('Alasan Retur')) + '6="Gagal kirim')) && dv.some((x) => x.startsWith(huruf(ix('Batal')) + '6="YA')) &&
      (m.petunjuk || []).some((x) => /Kode Kartu QR/.test(x)), JSON.stringify(m).slice(0, 1500));
    const ISI = [
      { 'No Pesanan': '261105PPPPPPPP', Barcode: BEAR, Qty: 1, 'Waktu Pesan': '2026-11-05 08:00', 'Waktu Kemas': '2026-11-05 10:00', 'Lokasi Ambil (rak)': 'R2-1B-1', 'Dikemas Oleh': 'Armand', 'Link Foto Kirim': FK, 'Kode Kartu QR': QR(K[0]) },
      { 'No Pesanan': '261105PPPPPPPP', Barcode: PANDA, Qty: 2, 'Waktu Pesan': '2026-11-05 08:00' },
      { 'No Pesanan': '261105QQQQQQQQ', Barcode: TIGER, Qty: 1, 'Waktu Pesan': '2026-11-05 09:00', 'Waktu Kemas': '2026-11-05 11:00', 'Lokasi Ambil (rak)': 'R1-4B', 'Dikemas Oleh': 'Armand', 'Link Foto Kirim': FK, 'Kode Kartu QR': QR(K[0]) },
      { 'No Pesanan': '261105SSSSSSSS', Barcode: TIGER, Qty: 1, 'Waktu Pesan': '2026-11-05 09:30', 'Waktu Kemas': '2026-11-05 11:30', 'Lokasi Ambil (rak)': 'R1-4B', 'Dikemas Oleh': 'Armand', 'Link Foto Kirim': FK, 'Kode Kartu QR': QR(K[1]) }];
    const terisi = path.join(SEMENTARA, 'terisi.xlsx'); py('isi', mf, terisi, JSON.stringify(ISI));
    const setor = async () => {
      await p.setInputFiles('#lsBerkas', terisi);
      await p.waitForSelector('#lsPrat [data-ls=setor]', { timeout: 10000 });
      await p.click('#lsPrat [data-ls=setor]');
      await p.waitForFunction(() => !!document.querySelector('#lsPrat [data-ls-kartu-hasil]') || /tersimpan|gagal|dikunci/i.test((document.getElementById('lsPrat') || {}).innerText || ''), null, { timeout: 15000 }).catch(() => {});
      await jeda(600);
      return p.evaluate(() => { const x = document.querySelector('#lsPrat [data-ls-kartu-hasil]'); return { teks: x ? x.innerText : '', semua: (document.getElementById('lsPrat') || {}).innerText || '' }; });
    };
    const h1 = await setor();
    const st = panggil.find((x) => x.nama === 'wmsShopeeSetor') || { args: [] };
    const brs = (st.args[1] && st.args[1].baris) || [];
    const ps = kitab.filter((x) => x.aksi === 'pasangKartu');
    c('K4 setor: laporan Apps Script tidak menerima kode kartu; sesudah laporan tersimpan, kartu dipasang sekali kirim (satu baris per pesanan)',
      brs.length === 4 && brs.every((x) => !('kartu' in x)) && ps.length === 1 && ps[0].item.length === 3 && ps[0].ganti !== true &&
      pesananDari(K[0]) === '261105PPPPPPPP' && pesananDari(K[1]) === '261105SSSSSSSS', JSON.stringify([brs.map(Object.keys), ps, pesananDari(K[0]), pesananDari(K[1])]).slice(0, 900));
    /* tahap 3 (16 Okt): isi pesanan ikut dikirim supaya pembeli yang scan kartu dapat kartu sesuai barangnya */
    const isiK = kitab.filter((x) => x.aksi === 'isiPesanan'), iIsi = kitab.findIndex((x) => x.aksi === 'isiPesanan'), iPas = kitab.findIndex((x) => x.aksi === 'pasangKartu');
    const pp = isiK[0] ? isiK[0].pesanan.find((x) => x.no === '261105PPPPPPPP') : null;
    c('K10 isi semua pesanan di berkas dikirim sekali, sebelum kartu dipasang (P: Bear 1 + Panda 2; Q dan S ikut walau tanpa kartu baru)',
      isiK.length === 1 && iIsi > -1 && iIsi < iPas && isiK[0].pesanan.length === 3 && pp && JSON.stringify(pp.isi.map((x) => x.barcode + ':' + x.qty).sort()) === JSON.stringify([BEAR + ':1', PANDA + ':2'].sort()),
      JSON.stringify(isiK).slice(0, 700));
    c('K5 hasil tampil: jumlah terpasang, dan bentrok disebut dengan pesanannya (kartu yang sama di pesanan lain) beserta arahan membetulkan',
      /2 kartu terpasang/i.test(h1.teks) && h1.teks.includes('261105QQQQQQQQ') && h1.teks.includes('261105PPPPPPPP') && /Kitabku > Pasang kartu/.test(h1.teks), JSON.stringify(h1));
    const h2 = await setor();
    c('K6 setor ulang berkas yang sama: kartu yang sudah terpasang dibilang sudah terpasang sebelumnya, bukan galat; tidak ada yang berubah',
      /2 sudah terpasang sebelumnya/i.test(h2.teks) && !/2 kartu terpasang/i.test(h2.teks) && pesananDari(K[0]) === '261105PPPPPPPP', JSON.stringify(h2));
    setorGagal = true; const nPs = kitab.length;
    const h3 = await setor();
    c('K7 laporan gagal tersimpan: Edge Function kitab tidak dipanggil sama sekali (kartu dan isi pesanan)', kitab.length === nPs && /dikunci/.test(h3.semua), JSON.stringify(h3));
    setorGagal = false;
    const polos = path.join(SEMENTARA, 'polos.xlsx'); py('isi', mf, polos, JSON.stringify([{ 'No Pesanan': '261105TTTTTTTT', Barcode: BEAR, Qty: 1, 'Waktu Pesan': '2026-11-05 12:00' }]));
    const nK = kitab.length;
    await p.setInputFiles('#lsBerkas', polos); await p.waitForSelector('#lsPrat [data-ls=setor]', { timeout: 10000 }); await p.click('#lsPrat [data-ls=setor]'); await jeda(2500);
    c('K8 berkas tanpa kartu: isi pesanan tetap dikirim (cadangan No Pesanan pembeli), tidak ada pasang kartu, tidak ada kotak hasil kartu',
      kitab.slice(nK).length === 1 && kitab[nK].aksi === 'isiPesanan' && kitab[nK].pesanan[0].no === '261105TTTTTTTT' && !(await p.$('#lsPrat [data-ls-kartu-hasil]')), JSON.stringify(kitab.slice(nK)));
    /* WMS bisa ter-merge lebih dulu daripada server tahap 3. Isi pesanan yang ditolak tidak boleh menahan kartu terpasang:
       kartu tetap tersambung (voucher jalan), kartunya menyusul begitu isi dikirim lagi. */
    isiDitolak = true;
    const lama = path.join(SEMENTARA, 'lama.xlsx'); py('isi', mf, lama, JSON.stringify([{ 'No Pesanan': '261105UUUUUUUU', Barcode: BEAR, Qty: 1, 'Waktu Pesan': '2026-11-05 13:00', 'Waktu Kemas': '2026-11-05 14:00', 'Lokasi Ambil (rak)': 'R2-1B-1', 'Dikemas Oleh': 'Armand', 'Link Foto Kirim': FK, 'Kode Kartu QR': QR(K[2]) }]));
    await p.setInputFiles('#lsBerkas', lama); await p.waitForSelector('#lsPrat [data-ls=setor]', { timeout: 10000 }); await p.click('#lsPrat [data-ls=setor]');
    await p.waitForFunction(() => !!document.querySelector('#lsPrat [data-ls-kartu-hasil]'), null, { timeout: 15000 }).catch(() => {}); await jeda(800);
    const h4 = await p.evaluate(() => { const x = document.querySelector('#lsPrat [data-ls-kartu-hasil]'); return x ? x.innerText : ''; });
    c('K12 server menolak isi pesanan: kartu tetap terpasang, kotak hasil bilang isi pesanan belum terkirim',
      pesananDari(K[2]) === '261105UUUUUUUU' && /1 kartu terpasang/i.test(h4) && /isi pesanan belum terkirim/i.test(h4), JSON.stringify([pesananDari(K[2]), h4]));
    isiDitolak = false;
    await ctx.close();
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('K9 tidak ada galat JavaScript', galat.length === 0, galat.join(' | '));
  await b.close(); srv.close();
}

utama().catch((e) => c('MATI', false, e.stack)).then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 1500))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
