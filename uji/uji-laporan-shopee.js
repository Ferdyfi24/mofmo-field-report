/* Uji Laporan Shopee WMS (wms/lapshopee.js, tab Laporan > Shopee), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS" (angka di bawah).
 *
 * KENAPA UJI INI ADA. Ferdy minta tiga hal untuk Shopee di WMS: mentahan Excel
 * harian yang diunduh dari WMS, tempat setor tiap sore, dan menu untuk
 * mengambil laporan harian dan bulanan Shopee (Excel berisi pivot). Setoran
 * disimpan di lembar "Laporan Harian Shopee" lewat wmsShopeeSetor
 * (WmsShopeeHarian.gs, diuji terpisah). Cacat paling mahal dan paling diam:
 *  - satu pesanan dua barang terhitung dua pesanan;
 *  - terjual dihitung saat dipesan, bukan saat diserahkan ke kurir
 *    (lain dengan buku besar WMS, jadi laporan dan stok tidak pernah cocok);
 *  - jam yang diketik di Excel (angka seri) terkirim sebagai 46307.54;
 *  - pesanan yang sudah diterima atau batal ikut muncul lagi di mentahan;
 *  - baris saluran Gamotion dari Excel Operasi Stok ikut tersetor ke Shopee;
 *  - baris kosong <row r="5"/> di berkas Excel menelan baris berikutnya;
 *  - pivot di Excel berupa angka mati, bukan rumus ke tab Data;
 *  - membaca wmsShopeeData dianggap tulisan (konfeti tiap buka tab dan seluruh
 *    papan pindah membaca dari Apps Script 15 menit).
 * Semua angka harapan dihitung tangan dari baris di bawah.
 *
 * Urutan kerja jujur: lapshopee.js ditulis lebih dulu, uji ini sesudahnya.
 * Karena itu setiap pemeriksaan dibuktikan dengan uji balik (mutan) sebelum
 * diserahkan.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http'), { execFileSync } = require('child_process');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 22;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const SEMENTARA = fs.mkdtempSync('/tmp/uji-laporan-shopee-');

/* ---------- data, disusun di sini ----------
   Hari ini Senin 12 Okt 2026. Barcode Bear 8991000000011, Tiger 8991000000028, Panda 8991000000035.
   P1 261011BKEGFKHX Bear 1 @250.000: pesan 11 Okt 09:00, kemas 11 Okt 14:00, serah 11 Okt 16:00 (SPX Standard), diterima 12 Okt 10:00.
   P2 261011CCCCCCCC Tiger 2 @120.000 + Panda 1 @300.000: pesan 11 Okt 15:00, kemas 12 Okt 09:00, serah 12 Okt 11:00 (JNE Reguler), belum diterima.
   P3 261012DDDDDDDD Bear 1 @250.000: pesan 12 Okt 08:00, belum dikemas.
   P4 260928EEEEEEEE Panda 1 @300.000: pesan 28 Sep, serah 29 Sep (SPX Standard), diterima 1 Okt, retur bagus 1 pada 5 Okt (Retur pembeli).
   P5 260930FFFFFFFF Tiger 1 @120.000: pesan 30 Sep, Batal.
   Buku besar SHP ke Terjual: 29 Sep 1 (P4), 30 Sep 1 (Tiger, padahal P5 batal), 11 Okt 1, 12 Okt 3. Retur Terjual ke SHP 5 Okt 1.
   12 Okt juga ada Bear 1 terjual langsung dari HO (bukan Shopee): tidak boleh ikut kolom buku besar Shopee.
   Harian 12 Okt: masuk 1 pesanan, 1 pcs, Rp250.000; dikemas 1 (P2 sekali, bukan dua); serah 1 pesanan 3 pcs Rp540.000 (2x120.000 + 300.000);
     diterima 1 (P1); retur 0; buku besar 3, selisih 0.
   Bulan berjalan 1-12 Okt: masuk 3, 5 pcs, Rp1.040.000; serah 2 pesanan 4 pcs Rp790.000; diterima 2 (P1, P4); retur 1 pcs Rp300.000;
     bersih Rp490.000; buku besar 4.
   Antrean akhir 12 Okt: belum dikemas 1 (P3), dikemas 0, di jalan 1 (P2, 0 hari). Akhir 11 Okt: belum dikemas 1 (P2), di jalan 1 (P1).
   September: masuk 2 (P4, P5), 2 pcs, Rp420.000; serah 1 pcs Rp300.000; buku besar 2, selisih -1.
   Rata-rata Okt: pesan ke serah (0 + 1)/2 = 0,5 hari; serah ke diterima (P1 1 hari, P4 2 hari) = 1,5 hari; nilai per pesanan 1.040.000/3; retur 1/4 = 25%.
   Jasa kirim Okt: SPX Standard 1 pesanan 1 pcs, JNE Reguler 1 pesanan 3 pcs. Alasan retur Okt: Retur pembeli 1 pcs Rp300.000.
   Stok gudang (HO + SHP): Bear 10 - 1 - 1 = 8, Tiger 7, Panda 9.
   Mentahan: pesanan terbuka = P2 (2 baris) dan P3; P1 dan P4 sudah diterima, P5 batal. */
const BEAR = '8991000000011', TIGER = '8991000000028', PANDA = '8991000000035';
const L = { HO: 0, SHP: 1, TERJUAL: 2, OPENING: 3 };
const DP = { ok: true, hariIni: '2026-10-12', bulanIni: '2026-10', tarif: 0.1, diperbarui: '12 Oct 2026 03:00',
  lok: [{ k: 'HO', n: 'HO - HAERY OFFICE', toko: 0 }, { k: 'SHP', n: 'Paket Shopee', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 }],
  prod: [{ b: BEAR, n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 }, { b: TIGER, n: 'MOFMOFRIENDS key charm - Tiger', s: 'MF-KC-008', hs: 150000, h: 166500, r: 249900 },
    { b: PANDA, n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 200000, h: 222000, r: 341538 }],
  baris: [
    ['2026-09-01', 0, 10, L.OPENING, L.HO], ['2026-09-01', 1, 10, L.OPENING, L.HO], ['2026-09-01', 2, 10, L.OPENING, L.HO],
    ['2026-09-28', 2, 1, L.HO, L.SHP], ['2026-09-29', 2, 1, L.SHP, L.TERJUAL],
    ['2026-09-30', 1, 1, L.HO, L.SHP], ['2026-09-30', 1, 1, L.SHP, L.TERJUAL],
    ['2026-10-05', 2, 1, L.TERJUAL, L.SHP], ['2026-10-05', 2, 1, L.SHP, L.HO],
    ['2026-10-11', 0, 1, L.HO, L.SHP], ['2026-10-11', 0, 1, L.SHP, L.TERJUAL],
    ['2026-10-12', 1, 2, L.HO, L.SHP], ['2026-10-12', 1, 2, L.SHP, L.TERJUAL], ['2026-10-12', 2, 1, L.HO, L.SHP], ['2026-10-12', 2, 1, L.SHP, L.TERJUAL],
    ['2026-10-12', 0, 1, L.HO, L.TERJUAL]
  ], invoiceMitra: [], opname: [] };
const kosong = { tKemas: '', tSerah: '', jasa: '', resi: '', tTerima: '', tRetur: '', rBagus: 0, rRusak: 0, alasan: '', catatan: '', disetor: '2026-10-12', oleh: 'Rina', diperbarui: '2026-10-12 17:05' };
const SH = { ok: true, hariIni: '2026-10-12',
  baris: [
    Object.assign({}, kosong, { no: '261011BKEGFKHX', barcode: BEAR, qty: 1, harga: 250000, tPesan: '2026-10-11 09:00', tKemas: '2026-10-11 14:00', tSerah: '2026-10-11 16:00', jasa: 'SPX Standard', resi: 'SPXID06567979777A', status: 'Diterima', tTerima: '2026-10-12 10:00' }),
    Object.assign({}, kosong, { no: '261011CCCCCCCC', barcode: TIGER, qty: 2, harga: 120000, tPesan: '2026-10-11 15:00', tKemas: '2026-10-12 09:00', tSerah: '2026-10-12 11:00', jasa: 'JNE Reguler', resi: 'JNE0001', status: 'Diserahkan kurir' }),
    Object.assign({}, kosong, { no: '261011CCCCCCCC', barcode: PANDA, qty: 1, harga: 300000, tPesan: '2026-10-11 15:00', tKemas: '2026-10-12 09:00', tSerah: '2026-10-12 11:00', jasa: 'JNE Reguler', resi: 'JNE0001', status: 'Diserahkan kurir' }),
    Object.assign({}, kosong, { no: '261012DDDDDDDD', barcode: BEAR, qty: 1, harga: 250000, tPesan: '2026-10-12 08:00', status: 'Baru' }),
    Object.assign({}, kosong, { no: '260928EEEEEEEE', barcode: PANDA, qty: 1, harga: 300000, tPesan: '2026-09-28 10:00', tKemas: '2026-09-28 15:00', tSerah: '2026-09-29 10:00', jasa: 'SPX Standard', resi: 'SPXID1', status: 'Retur', tTerima: '2026-10-01 12:00', tRetur: '2026-10-05 13:00', rBagus: 1, alasan: 'Retur pembeli', disetor: '2026-10-05' }),
    Object.assign({}, kosong, { no: '260930FFFFFFFF', barcode: TIGER, qty: 1, harga: 120000, tPesan: '2026-09-30 20:00', status: 'Batal', disetor: '2026-10-01' })
  ],
  setoran: [{ tanggal: '2026-10-12', waktu: '2026-10-12 17:05', oleh: 'Rina', berkas: 'mentahan.xlsx', baris: 3, baru: 1, diperbarui: 2, ditolak: 0 },
    { tanggal: '2026-10-11', waktu: '2026-10-11 17:40', oleh: 'Rina', berkas: 'mentahan.xlsx', baris: 3, baru: 3, diperbarui: 0, ditolak: 0 }] };

/* ================= A. hitungan dan pembaca berkas (Node) ================= */
let LS = null;
try {
  const kotak = { window: {}, console };
  kotak.window.window = kotak.window;
  vm.createContext(kotak);
  vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/lapshopee.js'), 'utf8'), kotak);
  LS = kotak.window.WmsLapShopee;
} catch (e) { c('A0 lapshopee.js termuat tanpa DOM', false, e.message); }
const pilih = (u, k) => k.map(x => x + '=' + u[x]).join(' ');

function bagianA() {
  if (!LS || !LS.hitung) { c('A0 WmsLapShopee.hitung ada', false, 'tidak ada'); return; }
  const H = LS.hitung(SH, DP, { mode: 'harian' });
  const K1 = ['masuk', 'pcs', 'nilai', 'kemas', 'serah', 'pcsSerah', 'nilaiSerah', 'terima', 'retur', 'buku', 'selisih'];
  c('A1 hari 12 Okt: 1 pesanan masuk 1 pcs Rp250.000; dikemas 1 (P2 sekali); serah 1 pesanan 3 pcs Rp540.000; diterima 1; buku besar 3, selisih 0',
    H.tanggal === '2026-10-12' && pilih(H.hari, K1) === 'masuk=1 pcs=1 nilai=250000 kemas=1 serah=1 pcsSerah=3 nilaiSerah=' + (2 * 120000 + 300000) + ' terima=1 retur=0 buku=3 selisih=0', pilih(H.hari, K1));
  const K2 = ['masuk', 'pcs', 'nilai', 'serah', 'pcsSerah', 'nilaiSerah', 'terima', 'retur', 'nilaiRetur', 'bersih', 'buku'];
  c('A2 bulan berjalan 1-12 Okt: 3 pesanan 5 pcs Rp1.040.000; serah 2 pesanan 4 pcs Rp790.000; diterima 2; retur 1 pcs Rp300.000; bersih Rp490.000; buku besar 4',
    pilih(H.mtd, K2) === 'masuk=3 pcs=5 nilai=' + (250000 + 540000 + 250000) + ' serah=2 pcsSerah=4 nilaiSerah=790000 terima=2 retur=1 nilaiRetur=300000 bersih=' + (790000 - 300000) + ' buku=4', pilih(H.mtd, K2));
  const H11 = LS.hitung(SH, DP, { mode: 'harian', tanggal: '2026-10-11' });
  const KA = ['belum', 'dikemas', 'jalan', 'tertua'];
  c('A3 antrean akhir 12 Okt: belum dikemas 1, dikemas 0, di jalan 1 (0 hari); akhir 11 Okt: belum dikemas 1 (P2), di jalan 1 (P1); hari 11 Okt 2 pesanan 4 pcs',
    pilih(H.antrean, KA) === 'belum=1 dikemas=0 jalan=1 tertua=0' && pilih(H11.antrean, KA) === 'belum=1 dikemas=0 jalan=1 tertua=0' && H11.hari.masuk === 2 && H11.hari.pcs === 4,
    pilih(H.antrean, KA) + ' / ' + pilih(H11.antrean, KA) + ' / ' + pilih(H11.hari, ['masuk', 'pcs']));
  const B = LS.hitung(SH, DP, { mode: 'bulanan' });
  c('A4 bulanan Oktober (berjalan sampai 12 Okt) lawan September: Sep 2 pesanan Rp420.000, terjual 1 pcs Rp300.000, buku besar 2, selisih -1; rata-rata 0,5 dan 1,5 hari; nama berkas',
    B.bulan === '2026-10' && B.berjalan === true && B.akhir === '2026-10-12' && B.bulanLalu === '2026-09' && B.ini.nilaiSerah === 790000 &&
    pilih(B.lalu, ['masuk', 'nilai', 'pcsSerah', 'nilaiSerah', 'buku', 'selisih']) === 'masuk=2 nilai=420000 pcsSerah=1 nilaiSerah=300000 buku=2 selisih=-1' &&
    B.leadSerah === 0.5 && B.leadTerima === 1.5 && B.berkas === 'laporan-bulanan-shopee-2026-10.xlsx' && H.berkas === 'laporan-harian-shopee-2026-10-12.xlsx',
    JSON.stringify({ b: B.bulan, j: B.berjalan, a: B.akhir, l: B.lalu, ls: B.leadSerah, lt: B.leadTerima, f: [B.berkas, H.berkas] }));
  const Hf = LS.hitung(SH, DP, { mode: 'harian', tanggal: '2026-10-20' });
  c('A5 tanggal di masa depan kembali ke hari ini; pilihan bulan Okt dan Sep', Hf.tanggal === '2026-10-12' && Hf.pilihanBulan.join(',') === '2026-10,2026-09', Hf.tanggal + ' ' + Hf.pilihanBulan);
  const W = LS._waktuSel, seri = (Date.UTC(2026, 9, 12) - Date.UTC(1899, 11, 30)) / 864e5;
  const w = [W(seri + (9 * 60 + 46) / 1440), W(seri), W('2026-10-12T9:05'), W('12/10/2026'), W(''), W('2026-10-12 17:30:59')];
  c('A6 jam dari Excel: angka seri 09:46 jadi "2026-10-12 09:46", seri bulat jadi tanggal, 9:05 jadi 09:05; 12/10/2026 dibiarkan supaya server yang menolak',
    w.join('|') === '2026-10-12 09:46|2026-10-12|2026-10-12 09:05|12/10/2026||2026-10-12 17:30', w.join('|'));
  const xml = '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>5</v></c></row><row r="2" ht="20" customHeight="1"/>' +
    '<row r="3"><c r="A3" t="inlineStr"><is><t>J&amp;T</t></is></c><c r="B3" s="2"/><c r="B3x" t="str"><v>x</v></c></row></sheetData></worksheet>';
  const rows = LS._bacaLembarXml(xml, ['No Pesanan']);
  c('A7 pembaca XLSX: baris kosong <row r="2"/> tidak menelan baris 3; teks berbagi, teks sebaris (J&T), angka di kolom C',
    rows.length === 3 && rows[0][0] === 'No Pesanan' && rows[0][2] === 5 && rows[1].length === 0 && rows[2][0] === 'J&T', JSON.stringify(rows));
  const ops = LS._uraiBuku({
    'Pesanan Online': [['PENCATATAN PESANAN ONLINE'], [], [], [], [],
      ['No Pesanan', 'Saluran', 'Tanggal Pesan', 'Barcode', 'Qty', 'Waktu Picking', 'Waktu Packing', 'Waktu Serah Kurir', 'Kurir', 'Waktu Diterima', 'Catatan', 'Bukti Foto', 'Tanggal (otomatis)', 'SKU (otomatis)', 'Nama Produk (otomatis)', 'Pesanan (otomatis)', 'Urutan Pesanan (otomatis)', 'Dipetik (otomatis)', 'Status Petik (otomatis)', 'Harga Jual', 'Waktu Retur', 'Retur Bagus', 'Retur Rusak', 'Alasan Retur'],
      ['261012HHHHHHHH', 'SHOPEE', '2026-10-12', 8991000000011, 2, '', '', '', '', '', 'catatan', '', '2026-10-12', 'MF-PLU-005', '', 1, 1, 0, '', 250000, '', '', '', ''],
      ['G-0001', 'GAMOTION', '2026-10-12', 8991000000028, 1],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']],
    'Kirim Shopee': [[], [], [], [], [], ['No Pesanan', 'Saluran (otomatis)', 'Tanggal Pesan (otomatis)', 'Jumlah SKU (otomatis)', 'Qty Pesan (otomatis)', 'Qty Dipetik (otomatis)', 'Koli', 'Berat (kg)', 'Lokasi Staging', 'Dipacking Oleh', 'Waktu Packing', 'Link Foto Kirim', 'Jasa Kirim', 'No Resi', 'Nama Kurir Penjemput', 'Diserahkan Oleh', 'Waktu Serah Kurir'],
      ['261012HHHHHHHH', 'SHOPEE', '', 1, 2, 2, 1, 0.4, '', 'Rina', '2026-10-12 13:00', '', 'SPX Standard', 'SPXID9', 'Budi', 'Rina', '2026-10-12 16:00']],
    'Surat Serah Terima': [['No', 'No Pesanan', 'No Resi']] });
  const b0 = (ops.baris || [])[0] || {};
  c('A8 Excel Operasi Stok: baris Gamotion dilewati, barcode angka jadi teks, harga dan qty ikut, jam kemas/serah dan jasa kirim diambil dari tab Kirim Shopee',
    ops.sumber === 'Pesanan Online' && ops.lewat === 1 && ops.baris.length === 1 && b0.no === '261012HHHHHHHH' && b0.barcode === BEAR && b0.qty === 2 && b0.harga === 250000 &&
    b0.tPesan === '2026-10-12' && b0.tKemas === '2026-10-12 13:00' && b0.tSerah === '2026-10-12 16:00' && b0.jasa === 'SPX Standard' && b0.resi === 'SPXID9' && b0.catatan === 'catatan', JSON.stringify(ops));
  const mt = LS._uraiBuku({ Pesanan: [['judul'], ['Tanggal laporan', '2026-10-11'], ['Disetor oleh', 'Rina'], [],
    ['No Pesanan', 'Barcode', 'SKU (otomatis)', 'Nama Produk (otomatis)', 'Qty', 'Harga Jual', 'Waktu Pesan', 'Waktu Kemas', 'Waktu Serah Kurir', 'Jasa Kirim', 'No Resi', 'Status', 'Waktu Diterima', 'Waktu Retur', 'Retur Bagus', 'Retur Rusak', 'Alasan Retur', 'Catatan'],
    ['#261012DDDDDDDD', BEAR + '.0', 'MF-PLU-005', 'Bear', 1, 250000, '2026-10-12 08:00', seri + 13 / 24, '', '', '', 'Dikemas', '', '', '', '', '', ''], ['', '', 'x', 'y']] });
  const tanpa = LS._uraiBuku({ Lain: [['Nama', 'Nilai'], ['a', 1]] });
  c('A9 mentahan: tanggal laporan dan penyetor terbaca dari kepala, tanda # dan ekor .0 barcode (ekspor CSV) dibuang, jam kemas angka seri jadi teks; berkas tanpa tabel pesanan ditolak',
    mt.tanggal === '2026-10-11' && mt.oleh === 'Rina' && mt.baris.length === 1 && mt.baris[0].no === '261012DDDDDDDD' && mt.baris[0].barcode === BEAR && mt.baris[0].tKemas === '2026-10-12 13:00' && mt.baris[0].status === 'Dikemas' && mt.baris[0].rBagus === '' && tanpa.galat === 'kepala',
    JSON.stringify(mt) + ' / ' + JSON.stringify(tanpa));
  const ps = (H.pesanan || []).map(g => g.no.slice(-2) + ':' + g.pcs + ':' + g.status + ':' + g.umur).join(',');
  const sk = (H.sku || []).map(x => x.sku + ':' + x.q).join(',');
  c('A10 tab Pesanan harian: P3, P2, P1, P4 (terbaru dulu, P5 batal September tidak ikut), P2 3 pcs di jalan; SKU urut jumlah lalu kode: Tiger, Bear, Panda',
    ps === 'DD:1:Belum dikemas:0,CC:3:Di jalan:1,HX:1:Diterima:,EE:1:Retur:' && sk === 'MF-KC-008:2,MF-PLU-005:2,MF-PLU-010:2', ps + ' / ' + sk);
  /* Laporan bulanan PPT (laporan.js) juga membaca SHP sejak 12 Okt. Oktober di buku besar: Shopee terjual 1 + 3 = 4 pcs,
     retur 5 Okt -1 pcs = 3 pcs bersih, nilai wholesale 194.250 + 2 x 166.500 + 222.000 - 222.000 = 527.250; Bear 1 dijual langsung
     dari HO. Stok dipegang 1 Okt 30 - 2 (terjual Sep) = 28, akhir 28 - 5 terjual + 1 retur = 24; HO -> SHP bukan keluar lain. */
  let LP = null; try { const k = { window: {}, console }; k.window.window = k.window; vm.createContext(k); vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/laporan.js'), 'utf8'), k); LP = k.window.WmsLaporan; } catch (e) {}
  const P = LP && LP._hitung ? LP._hitung(DP, { bulan: '2026-10' }) : { sales: {}, movement: {} };
  const shp = ((P.sales || {}).mitra || []).find(m => m.k === 'SHP') || {}, ho = ((P.sales || {}).mitra || []).find(m => m.k === 'HO') || {}, mv = P.movement || {};
  c('A11 laporan bulanan PPT Oktober: saluran Shopee 3 pcs bersih Rp527.250 (retur mengurangi), penjualan langsung HO 1 pcs; stok dipegang 28 ke 24, HO ke SHP bukan keluar lain',
    shp.nama === 'Shopee' && shp.pcs === 4 - 1 && shp.nilai === 194250 + 2 * 166500 + 222000 - 222000 && ho.pcs === 1 && P.sales.pcs === 4 &&
    mv.awal === 28 && mv.akhir === 24 && mv.terjual === 5 && mv.masukLain === 1 && mv.keluarLain === 0, JSON.stringify([shp, ho.pcs, P.sales && P.sales.pcs, mv.awal, mv.akhir, mv.terjual, mv.masukLain, mv.keluarLain]));
}
try { bagianA(); } catch (e) { c('A MATI', false, e.stack); }

/* ================= B. layar dan berkas (Playwright + openpyxl + LibreOffice) ================= */
const PY = `
import sys, json, datetime, openpyxl
from openpyxl.worksheet.datavalidation import DataValidation
mode, f = sys.argv[1], sys.argv[2]
def nilai(v):
    if isinstance(v, (datetime.datetime, datetime.date)): return v.isoformat()
    return v
if mode == 'baca':
    wb = openpyxl.load_workbook(f, data_only=True); wf = openpyxl.load_workbook(f)
    o = {}
    for ws in wb:
        rows = [[nilai(c) for c in r] for r in ws.iter_rows(min_row=1, max_row=min(ws.max_row, 80), max_col=min(ws.max_column, 26), values_only=True)]
        dv = [[str(d.sqref), d.formula1, d.type] for d in wf[ws.title].data_validations.dataValidation]
        rumus = [[c.coordinate, c.value] for r in wf[ws.title].iter_rows(min_row=1, max_row=min(ws.max_row, 12)) for c in r if isinstance(c.value, str) and c.value.startswith('=')][:6]
        o[ws.title] = {'rows': rows, 'dv': dv, 'rumus': rumus, 'maks': ws.max_row}
    print(json.dumps({'nama': wb.sheetnames, 'lembar': o}))
elif mode == 'isi':
    wb = openpyxl.load_workbook(f); ws = wb['Pesanan']
    ws['B2'] = '2026-10-11'; ws['B3'] = 'Rina'
    for r in range(6, 12):
        if ws.cell(r, 1).value == '261012DDDDDDDD': ws.cell(r, 8).value = datetime.datetime(2026, 10, 12, 13, 0); ws.cell(r, 8).number_format = 'yyyy-mm-dd hh:mm'
    r = 6
    while ws.cell(r, 1).value: r += 1
    for c, v in zip([1, 2, 5, 6, 7, 13], ['261012GGGGGGGG', '${PANDA}', 2, 300000, '2026-10-12 12:30', 'SPX Standard']): ws.cell(r, c).value = v
    wb.save(sys.argv[3]); print(json.dumps({'baris': r}))
elif mode == 'ops':
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'Pesanan Online'
    ws['A1'] = 'PENCATATAN PESANAN ONLINE - SHOPEE DAN GAMOTION'
    kp = ['No Pesanan', 'Saluran', 'Tanggal Pesan', 'Barcode', 'Qty', 'Waktu Picking', 'Waktu Packing', 'Waktu Serah Kurir', 'Kurir', 'Waktu Diterima', 'Catatan', 'Bukti Foto', 'Tanggal (otomatis)', 'SKU (otomatis)', 'Nama Produk (otomatis)', 'Pesanan (otomatis)', 'Urutan Pesanan (otomatis)', 'Dipetik (otomatis)', 'Status Petik (otomatis)', 'Harga Jual', 'Waktu Retur', 'Retur Bagus', 'Retur Rusak', 'Alasan Retur']
    for i, h in enumerate(kp): ws.cell(6, i + 1).value = h
    for i, v in enumerate(['261012HHHHHHHH', 'SHOPEE', '2026-10-12', '${BEAR}', 1]): ws.cell(7, i + 1).value = v
    ws.cell(7, 20).value = 250000
    for i, v in enumerate(['G-0001', 'GAMOTION', '2026-10-12', '${TIGER}', 1]): ws.cell(8, i + 1).value = v
    ws.cell(9, 13).value = '=IF(C9="","",C9)'
    k = wb.create_sheet('Kirim Shopee')
    for i, h in enumerate(['No Pesanan', 'Saluran (otomatis)', 'Tanggal Pesan (otomatis)', 'Jumlah SKU (otomatis)', 'Qty Pesan (otomatis)', 'Qty Dipetik (otomatis)', 'Koli', 'Berat (kg)', 'Lokasi Staging', 'Dipacking Oleh', 'Waktu Packing', 'Link Foto Kirim', 'Jasa Kirim', 'No Resi']): k.cell(6, i + 1).value = h
    for i, v in enumerate(['261012HHHHHHHH', 'SHOPEE', '', 1, 1, 1, 1, 0.4, '', 'Rina', '2026-10-12 13:00', '', 'SPX Standard', 'SPXID9']): k.cell(7, i + 1).value = v
    wb.save(f); print('{}')
elif mode == 'kosong':
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'Catatan'; ws['A1'] = 'Nama'; ws['B1'] = 'Nilai'; ws['A2'] = 'a'; wb.save(f); print('{}')
`;
const py = (...a) => { try { return JSON.parse(execFileSync('python3', ['-c', PY, ...a], { encoding: 'utf8', timeout: 60000 })); } catch (e) { return { galat: String(e.stderr || e.message).slice(-400) }; } };
const RECALC = (() => { try { const d = '/root/.claude/skills/synced'; for (const x of fs.readdirSync(d)) { const f = path.join(d, x, 'xlsx/scripts/recalc.py'); if (fs.existsSync(f)) return f; } } catch (e) {} return ''; })();
const hitungUlang = f => { if (!RECALC) return { galat: 'recalc.py tidak ada' }; try { return JSON.parse(execFileSync('python3', [RECALC, f, '90'], { encoding: 'utf8', timeout: 150000 })); } catch (e) { return { galat: String(e.stdout || e.stderr || e.message).slice(-300) }; } };
/* baris pertama di lembar yang kolom A-nya diawali label */
const cari = (lb, label) => ((lb && lb.rows) || []).find(r => typeof r[0] === 'string' && r[0].indexOf(label) === 0) || [];

async function bagianB() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { c('B0 playwright tersedia', false, e.message); return; }
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
    '<script>var HAL="ringkasan";function gambar(){document.getElementById("isi").textContent=HAL;}function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";gambar();window.__siap=1;}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
  await new Promise(r => srv.listen(8783, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [], setor = [], panggil = {};
  const pasang = async (ctx, belumDeploy) => {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/cdn\.|unpkg|cdnjs/, r => { galat.push('pustaka luar dimuat: ' + r.request().url()); r.abort(); });
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h; const n = m.nama || m.fn; panggil[n] = (panggil[n] || 0) + 1;
      if (m.fn === 'panggil' && m.nama === 'dataPapan') h = { pintu: 'ok', hasil: DP };
      else if (m.fn === 'panggil' && m.nama === 'permintaanDanPiutang') h = { pintu: 'ok', hasil: { ok: true, tagihan: { ok: true, baris: [] } } };
      else if (m.fn === 'panggil' && m.nama === 'wmsArsipDaftar') h = { pintu: 'ok', hasil: { ok: true, oto: true, arsip: [] } };
      else if (m.fn === 'panggil' && m.nama === 'wmsShopeeData' && !belumDeploy) h = { pintu: 'ok', hasil: SH };
      else if (m.fn === 'panggil' && m.nama === 'wmsShopeeSetor' && !belumDeploy) {
        setor.push(m.args);
        h = { pintu: 'ok', hasil: { ok: true, tanggal: '2026-10-12', baru: 0, diperbarui: 3, ditolak: [{ baris: 4, no: '261012GGGGGGGG', sebab: 'Contoh penolakan dari server' }], setoran: { tanggal: '2026-10-12', waktu: '2026-10-12 17:30', oleh: 'Rina', baris: 4 } } };
      } else h = { pintu: 'galat', pesan: 'Fungsi "' + n + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DP, 'klien|papan': { ok: true, versi: 'mitra', html: PAPAN }, 'klien|versi': { ok: true, versi: 'mitra' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const masuk = async (p, bhs) => {
    p.on('pageerror', e => galat.push(e.message));
    await p.goto('http://localhost:8783/wms/');
    await p.evaluate(x => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', x); localStorage.setItem('wms_maskot', 'off'); localStorage.removeItem('wms_shopee_oleh'); }, bhs);
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) { const f = p.frames().find(x => x !== p.mainFrame()); try { if (f && await f.evaluate(() => !!document.querySelector('[data-wms=laporan]'))) return f; } catch (e) {} await jeda(100); }
    return null;
  };
  const keShopee = async (p, fr, tunggu) => {
    await fr.evaluate(() => document.querySelector('[data-wms=laporan]').click());
    await p.waitForSelector('#laporan [data-laporan-tab=shopee]', { timeout: 8000 }).catch(() => {});
    await p.click('#laporan [data-laporan-tab=shopee]').catch(() => {});
    await p.waitForSelector(tunggu, { timeout: 8000 }).catch(() => {});
    await jeda(250);
  };
  const unduh = async (p, sel, nama) => {
    const [u] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }).catch(() => null), p.click(sel).catch(() => {})]);
    if (!u) return { u: null, f: '' };
    const t = path.join(SEMENTARA, nama); fs.copyFileSync(await u.path(), t); return { u, f: t };
  };
  let teksSemua = '';
  try {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    await pasang(ctx, false);
    const p = await ctx.newPage();
    const fr = await masuk(p, 'id');
    let t1 = {};
    if (fr) {
      await keShopee(p, fr, '#laporan [data-ls-kartu=harian]');
      t1 = await p.evaluate(() => ({ status: (document.querySelector('#laporan .ls-status') || {}).innerText || '', on: [...document.querySelectorAll('#laporan .ls-hari.on')].map(x => x.textContent).join(','),
        harian: (document.querySelector('#laporan [data-ls-kartu=harian]') || {}).innerText || '', bulanan: (document.querySelector('#laporan [data-ls-kartu=bulanan]') || {}).innerText || '',
        bulan: (document.querySelector('#lsBulan') || {}).value, sub: (document.querySelector('#laporan .lp-judul small') || {}).textContent || '', kotor: (() => { try { return sessionStorage.getItem('wms_kotor') || localStorage.getItem('wms_kotor'); } catch (e) { return 'x'; } })() }));
    }
    c('B1 tab Shopee (membaca wmsShopeeData tidak menandai papan kotor): 2 hari sudah setor (11 dan 12 menyala), harian Rp540.000 dan bulan berjalan Rp790.000, antrean 1 belum dikemas 1 di jalan, bulanan Oktober lawan September Rp300.000',
      !!fr && /2 hari sudah setor/.test(t1.status) && /Rina/.test(t1.status) && t1.on === '11,12' && /Rp540\.000/.test(t1.harian) && /Rp790\.000/.test(t1.harian) && /Rp490\.000/.test(t1.harian) &&
      /1 belum dikemas, 0 dikemas, 1 di jalan/.test(t1.harian) && t1.bulan === '2026-10' && /Rp300\.000/.test(t1.bulanan) && /setor tiap sore/.test(t1.sub) && !panggil.wmsShopeeSetor && !t1.kotor, JSON.stringify(t1));

    if (process.env.FOTO) await p.screenshot({ path: path.join(process.env.FOTO, 'shopee-laptop.png') });
    /* ---- mentahan ---- */
    const m = await unduh(p, '#laporan [data-ls=mentahan]', 'mentahan.xlsx');
    const mm = m.f ? py('baca', m.f) : {};
    const pe = ((mm.lembar || {}).Pesanan) || {};
    const isi = (pe.rows || []).slice(5).filter(r => r[0]).map(r => r[0].slice(-2) + ':' + r[1] + ':' + r[4]);
    const dv = (pe.dv || []).map(d => d[0].split(':')[0] + '=' + (d[1] || '').slice(0, 20)).sort().join(',');
    c('B2 mentahan: nama berkas bertanggal, tab Pesanan/Produk/Petunjuk, terisi hanya pesanan terbuka P2 (2 barang) lalu P3, daftar pilihan barcode/jasa/alasan/batal (12 Okt sore: Excel gudang satu lembar, kolom Status diganti Batal), SKU berupa rumus ke tab Produk',
      m.u && m.u.suggestedFilename() === 'mentahan-shopee-harian-2026-10-12.xlsx' && (mm.nama || []).join(',') === 'Pesanan,Produk,Petunjuk' &&
      isi.join(',') === 'CC:' + TIGER + ':2,CC:' + PANDA + ':1,DD:' + BEAR + ':1' && (pe.rows[1] || [])[1] === '2026-10-12' && (pe.rows[4] || [])[0] === 'No Pesanan' &&
      /B6=Produk!\$A\$2:\$A\$4/.test(dv) && /M6="SPX Standard/.test(dv) && /T6="Gagal kirim/.test(dv) && /V6="YA/.test(dv) &&
      (pe.rumus || []).some(x => x[0] === 'C6' && /INDEX\(Produk!\$B\$2:\$B\$4/.test(x[1])) && (((mm.lembar || {}).Produk || {}).rows || []).length === 4,
      JSON.stringify([m.u && m.u.suggestedFilename(), mm.nama, isi, dv, pe.rumus, mm.galat]));

    /* ---- setor: isi mentahan seperti staf di Excel, lalu unggah ---- */
    const terisi = path.join(SEMENTARA, 'mentahan-terisi.xlsx');
    const ii = m.f ? py('isi', m.f, terisi) : { galat: 'mentahan tidak ada' };
    let t3 = {};
    if (!ii.galat) {
      await p.setInputFiles('#lsBerkas', terisi);
      await p.waitForSelector('#lsPrat [data-ls=setor]', { timeout: 10000 }).catch(() => {});
      t3 = await p.evaluate(() => ({ prat: (document.getElementById('lsPrat') || {}).innerText || '', oleh: (document.getElementById('lsOleh') || {}).value, tgl: (document.getElementById('lsSetorTgl') || {}).value }));
      await p.click('#lsPrat [data-ls=setor]').catch(() => {});
      await p.waitForSelector('#lsPrat [data-ls-hasil]', { timeout: 10000 }).catch(() => {});
      await jeda(300);
    }
    const kirim = (setor[0] || [])[1] || {}, bs = kirim.baris || [];
    const p3 = bs.find(x => x.no === '261012DDDDDDDD') || {}, p6 = bs.find(x => x.no === '261012GGGGGGGG') || {}, p2 = bs[0] || {};
    c('B3 setor dari mentahan yang diisi di Excel: pratinjau 3 pesanan 4 baris, tanggal laporan dan penyetor terbaca dari berkas, terkirim ke wmsShopeeSetor dengan jam kemas yang diketik sebagai tanggal Excel jadi "2026-10-12 13:00"',
      /3 pesanan, 4 baris dibaca dari tab Pesanan/.test(t3.prat || '') && t3.oleh === 'Rina' && t3.tgl === '2026-10-11' && setor.length === 1 && (setor[0] || [])[0] === 'WMS-TIKET' &&
      kirim.tanggal === '2026-10-11' && kirim.oleh === 'Rina' && kirim.berkas === 'mentahan-terisi.xlsx' && bs.length === 4 &&
      p2.no === '261011CCCCCCCC' && p2.qty === 2 && p2.harga === 120000 && p2.tKemas === '2026-10-12 09:00' && p2.tSerah === '2026-10-12 11:00' && p2.rBagus === '' &&
      p3.tKemas === '2026-10-12 13:00' && p3.tPesan === '2026-10-12 08:00' && p6.barcode === PANDA && p6.qty === 2 && p6.harga === 300000 && p6.tPesan === '2026-10-12 12:30' && p6.jasa === 'SPX Standard' && p6.tKemas === '',
      JSON.stringify([t3, ii.galat, bs]).slice(0, 900));
    const t4 = await p.evaluate(() => ({ prat: (document.getElementById('lsPrat') || {}).innerText || '', simpan: (() => { try { return localStorage.getItem('wms_shopee_oleh'); } catch (e) { return ''; } })() }));
    c('B4 hasil setoran tampil: 0 baru 3 diperbarui, baris yang ditolak server disebut nomor baris dan alasannya; data dibaca ulang; nama penyetor diingat perangkat',
      /Tersimpan: 0 baris baru, 3 diperbarui\./.test(t4.prat) && /1 baris ditolak/.test(t4.prat) && /Baris 4 · 261012GGGGGGGG: Contoh penolakan dari server/.test(t4.prat) && panggil.wmsShopeeData === 2 && t4.simpan === 'Rina',
      JSON.stringify([t4, panggil]));

    /* ---- Excel Operasi Stok ---- */
    const opsF = path.join(SEMENTARA, 'operasi-stok.xlsx'), kosF = path.join(SEMENTARA, 'lain.xlsx');
    py('ops', opsF); py('kosong', kosF);
    await p.setInputFiles('#lsBerkas', opsF);
    await p.waitForSelector('#lsPrat [data-ls=setor]', { timeout: 10000 }).catch(() => {});
    const t5 = await p.evaluate(() => (document.getElementById('lsPrat') || {}).innerText || '');
    c('B5 Excel Operasi Stok bisa disetor: 1 pesanan dari tab Pesanan Online, baris Gamotion dilewati, tanpa peringatan barcode', /1 pesanan, 1 baris dibaca dari tab Pesanan Online/.test(t5) && /1 baris saluran lain dilewati/.test(t5) && !/tidak ada di Master/.test(t5), t5);
    await p.setInputFiles('#lsBerkas', kosF);
    await p.waitForFunction(() => /tidak punya tabel/.test((document.getElementById('lsPrat') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
    const t6 = await p.evaluate(() => ({ prat: (document.getElementById('lsPrat') || {}).innerText || '', tombol: !!document.querySelector('#lsPrat [data-ls=setor]') }));
    c('B6 berkas tanpa kolom No Pesanan dan Barcode ditolak dengan alasan, tanpa tombol setor', /tidak punya tabel dengan kolom No Pesanan dan Barcode/.test(t6.prat) && !t6.tombol, JSON.stringify(t6));

    /* ---- laporan harian ---- */
    const hr = await unduh(p, '#laporan [data-ls=harian]', 'harian.xlsx');
    const rh = hr.f ? hitungUlang(hr.f) : {};
    const xh = hr.f ? py('baca', hr.f) : {}, Lh = xh.lembar || {};
    const R = Lh.Ringkasan, ph = Lh['Pivot Harian'] || {}, phT = cari(ph, 'Total'), p11 = (ph.rows || []).find(r => r[0] === '2026-10-11T00:00:00') || [];
    const sku = ((Lh['Pivot SKU'] || {}).rows || []).slice(4).filter(r => r[0] && r[0] !== 'Total').map(r => r[0] + ':' + r[3] + ':' + r[4] + ':' + r[6] + ':' + r[7] + ':' + r[8]).join(',');
    c('B7 Excel harian (dihitung ulang LibreOffice, 0 galat): 6 tab; Ringkasan hari/bulan berjalan masuk 1/3, terjual Rp540.000/Rp790.000, bersih Rp490.000, selisih buku besar 0; Pivot Harian 12 hari total Rp790.000; Pivot SKU dengan stok gudang',
      hr.u && hr.u.suggestedFilename() === 'laporan-harian-shopee-2026-10-12.xlsx' && rh.status === 'success' && rh.total_errors === 0 && (xh.nama || []).join(',') === 'Ringkasan,Pivot Harian,Pivot SKU,Pesanan,Data,Catatan' &&
      cari(R, 'Pesanan masuk').slice(1, 3).join('/') === '1/3' && cari(R, 'Nilai terjual').slice(1, 3).join('/') === '540000/790000' && cari(R, 'Penjualan bersih')[2] === 490000 &&
      cari(R, 'Selisih laporan').slice(1, 3).join('/') === '0/0' && cari(R, 'Pesanan dikemas')[1] === 1 &&
      (ph.rows || []).filter(r => /^2026-10-/.test(String(r[0]))).length === 12 && phT[8] === 790000 && phT[10] === 4 && p11[2] === 2 &&
      sku === 'MF-KC-008:0:2:2:0:7,MF-PLU-005:1:2:1:0:8,MF-PLU-010:0:1:1:1:9' && ((Lh.Data || {}).rows || []).filter((r, i) => i >= 4 && r[0]).length === 6,
      JSON.stringify([hr.u && hr.u.suggestedFilename(), rh, xh.nama, R && R.rows.slice(3, 20), phT, p11, sku, xh.galat]).slice(0, 1500));

    /* ---- laporan bulanan ---- */
    const bl = await unduh(p, '#laporan [data-ls=bulanan]', 'bulanan.xlsx');
    const rb = bl.f ? hitungUlang(bl.f) : {};
    const xb = bl.f ? py('baca', bl.f) : {}, Lb = xb.lembar || {}, Rb = Lb.Ringkasan, J = Lb['Jasa Kirim dan Retur'];
    c('B8 Excel bulanan Oktober lawan September (0 galat): terjual 4 lawan 1 pcs, selisih buku besar 0 lawan -1, rata-rata per pesanan, retur 25%, lama serah 0,5 hari dan sampai 1,5 hari; jasa kirim SPX 1 pesanan, JNE 3 pcs; retur pembeli Rp300.000',
      bl.u && bl.u.suggestedFilename() === 'laporan-bulanan-shopee-2026-10.xlsx' && rb.status === 'success' && rb.total_errors === 0 && (xb.nama || []).indexOf('Jasa Kirim dan Retur') === 3 &&
      cari(Rb, 'Pcs terjual').slice(1, 4).join('/') === '4/1/3' && cari(Rb, 'Selisih laporan').slice(1, 3).join('/') === '0/-1' &&
      Math.abs(cari(Rb, 'Rata-rata nilai per pesanan')[1] - 1040000 / 3) < 0.01 && cari(Rb, 'Tingkat retur')[1] === 0.25 &&
      cari(Rb, 'Rata-rata hari dari pesan')[1] === 0.5 && cari(Rb, 'Rata-rata hari dari serah')[1] === 1.5 &&
      cari(J, 'SPX Standard').slice(1, 3).join('/') === '1/1' && cari(J, 'JNE Reguler').slice(1, 3).join('/') === '1/3' && cari(J, 'Retur pembeli').slice(1, 3).join('/') === '1/300000',
      JSON.stringify([bl.u && bl.u.suggestedFilename(), rb, xb.nama, Rb && Rb.rows.slice(3, 26), J && J.rows, xb.galat]).slice(0, 1500));
    teksSemua = await p.evaluate(() => document.getElementById('laporan').innerText);
    if (process.env.FOTO) await p.screenshot({ path: path.join(process.env.FOTO, 'shopee-sesudah-setor.png') });
    await ctx.close();

    /* ---- Apps Script belum di-deploy ---- */
    const ctx3 = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    await pasang(ctx3, true);
    const p3b = await ctx3.newPage();
    const fr3 = await masuk(p3b, 'id');
    let t9 = '';
    if (fr3) { await keShopee(p3b, fr3, '#laporan [data-ls=mentahan]'); await p3b.waitForFunction(() => /deploy/.test((document.getElementById('lsMuat') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {}); t9 = await p3b.evaluate(() => (document.getElementById('lsMuat') || {}).innerText || ''); }
    const m9 = fr3 ? await unduh(p3b, '#laporan [data-ls=mentahan]', 'mentahan-belum.xlsx') : { u: null };
    const mm9 = m9.f ? py('baca', m9.f) : {};
    c('B9 Apps Script belum di-deploy: panel bilang setor dan laporan menyala sesudah deploy, mentahan tetap bisa diunduh (kosong, tanpa pesanan lama)',
      /di-deploy/.test(t9) && m9.u && (((mm9.lembar || {}).Pesanan || {}).rows || []).slice(5).filter(r => r[0]).length === 0, t9 + ' ' + JSON.stringify(mm9.galat || ''));
    await ctx3.close();

    /* ---- HP dan bahasa Inggris ---- */
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasang(ctx2, false);
    const hp = await ctx2.newPage();
    const fr2 = await masuk(hp, 'en');
    let t10 = { lebar: 9999 };
    if (fr2) {
      await keShopee(hp, fr2, '#laporan [data-ls-kartu=bulanan]');
      t10 = await hp.evaluate(() => ({ lebar: Math.max(document.documentElement.scrollWidth, document.getElementById('laporan').scrollWidth), h: (document.querySelector('#laporan [data-ls-kartu=setor] h3') || {}).textContent, n: (document.querySelector('#laporan [data-ls-kartu=harian]') || {}).innerText || '' }));
    }
    if (process.env.FOTO && fr2) await hp.screenshot({ path: path.join(process.env.FOTO, 'shopee-hp.png'), fullPage: true });
    c('B10 HP 390 px tanpa geser samping; bahasa Inggris memakai koma ribuan', t10.lebar <= 392 && t10.h === 'Submit the evening report' && /Rp540,000/.test(t10.n), JSON.stringify(t10).slice(0, 300));
    await ctx2.close();
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('B11 tidak ada galat JavaScript, pustaka dari CDN, atau tanda pisah panjang', galat.length === 0 && teksSemua && !/—/.test(teksSemua), galat.join(' | ').slice(0, 400));
  await b.close(); srv.close();
}

bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 1500))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
