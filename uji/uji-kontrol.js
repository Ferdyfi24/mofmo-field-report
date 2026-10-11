/* Uji Kontrol WMS (wms/kontrol.js), 11 Okt 2026.
 * Harapan: "31 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy memilih Tahap 1 dan 2 dari usulan SCM: checklist
 * tutup bulan, rapor mitra, margin per saluran per SKU, draf email ke mitra,
 * deteksi angka janggal (berbasis aturan, tanpa AI), SLA pengiriman,
 * rekonsiliasi otomatis, dan penjaga retur Shopee. Semuanya dihitung dari data
 * yang sama dengan papan (dataPapan, obdSpData, tagihan). Cacat yang paling
 * mahal karena diam:
 *  - rekonsiliasi yang membandingkan unit saja, sehingga invoice yang nilainya
 *    turun 4% (diskon diam-diam, salah harga) lolos sebagai "cocok";
 *  - patokan nilai per retailer yang ikut terseret oleh satu invoice
 *    menyimpang (rata-rata, bukan median), sehingga menyimpangnya tidak pernah
 *    melewati ambang;
 *  - pajak dikali 1,11 rata, padahal tiap SKU membawa tarifnya sendiri
 *    (fixture memuat Panda berpajak 5%);
 *  - barang yang kembali ke HO dari TRANSIT dihitung sebagai kiriman ke gerai,
 *    sehingga SLA terlihat lebih baik dari kenyataan;
 *  - stok di jalan yang belum sampai di akhir bulan tidak menahan tutup bulan;
 *  - draf email memakai tanda pisah panjang atau angka yang beda dengan layar.
 * Semua angka harapan dihitung tangan dari baris buku besar di bawah.
 * Bagian A memuat kontrol.js langsung di Node (vm) untuk hitungannya; bagian B
 * membuka WMS dengan papan palsu di Playwright untuk layarnya.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const AKAR = '/home/claude/fieldreport';
const DIHARAPKAN = 32;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);

/* ---------- buku besar, disusun di sini ----------
   Hari ini 2026-10-11, bulan tutup September 2026 (30 hari).
   Bear  hs 175.000 h 194.250 r 298.846 (pajak 11%): retail tanpa pajak 269.230,63
   Tiger hs 150.000 h 166.500 r 299.700 (pajak 11%): retail tanpa pajak 270.000
   Panda hs 200.000 h 210.000 r 315.000 (pajak 5%):  retail tanpa pajak 300.000
   Lamb  hs 175.000 h 194.250 r 298.846 (pajak 11%)
   20 Agu HO ke TRANSIT: Bear 6, Tiger 4, Lamb 2; tiba T305 22 Agu (2 hari, satu kiriman 12 pcs).
   1 Sep HO ke TRANSIT Panda 5, 4 Sep Panda 2 lagi; 6 Sep 5 pcs tiba KIY-GI. FIFO: yang tiba lot 1 Sep
   (5 hari, lewat SLA 3 hari) dan yang masih di jalan lot 4 Sep 2 pcs (umur 37 hari). Kalau LIFO,
   kirimannya pecah jadi 4 Sep 2 pcs dan 1 Sep 3 pcs, dan yang tersisa lot 1 Sep.
   25 Sep HO ke TRANSIT Bear 3, belum sampai: umur 16 hari. Di jalan pada 30 Sep: 2 + 3 = 5 pcs.
   1 Okt HO ke TRANSIT Tiger 2, 2 Okt kembali ke HO: bukan kiriman.
   9 Okt HO ke TRANSIT Lamb 1, masih di jalan (umur 2 hari, belum lewat SLA). Di jalan hari ini 6 pcs,
   jadi checklist yang salah membaca stok hari ini (bukan 30 Sep) langsung ketahuan.
   Laku T305: Bear 1 (25 Agu), Bear 2 dan Tiger 1 (Sep), Bear 1 (3 Okt). KIY-GI: Panda 1 (Sep).
   T390: Bear 1 laku 18 Sep padahal belum pernah ada stok: saldo minus.
   ADJUST +12 Tiger ke HO 28 Sep. Gamotion: HO ke GMT 2, laku 2 (bukan saluran invoice).
   Stok T305 sekarang: Bear 6-1-2-1 = 2, Tiger 4-1 = 3, Lamb 2 = 7; akhir Sep: 3 + 3 + 2 = 8.
   Lamb di T305 sejak 22 Agu (50 hari) belum pernah laku: stok mati.
   Invoice: Agu T305 1 unit 182.000 (rasio 0,676), KIY-GI 1 unit 150.000 tanpa penjualan di buku.
            Sep T305 3 unit 546.520 (rasio 0,676 dari retail 808.461), KIY-GI 1 unit 150.000 (rasio 0,5), T390 tidak ada.
            Okt T305 1 unit 175.000 (rasio 0,650, menyimpang -3,85% dari median TGI 0,676).
   Dasar rasio TGI: terhadap retail 0,676 / 0,676 / 0,650 jauh lebih tetap daripada terhadap wholesale
   1,040 / 1,093 / 1,000, jadi dasarnya retail. KIY cuma satu bulan-gerai yang sah: seri, retail. */
const L = { T305: 0, T390: 1, KIYGI: 2, HO: 3, TERJUAL: 4, OPENING: 5, TRANSIT: 6, ADJUST: 7, GMT: 8 };
const DATA = { ok: true, hariIni: '2026-10-11', bulanIni: '2026-10', tarif: 0.1, diperbarui: '11 Oct 2026 03:00',
  lok: [{ k: 'T305', n: 'TOYS KINGDOM LIVING WORLD ALAM SUTERA', r: 'TGI', toko: 1 }, { k: 'T390', n: 'TOYS KINGDOM LIVING WORLD KOTA WISATA CIBUBUR', r: 'TGI', toko: 1 },
    { k: 'KIY-GI', n: 'KINOKUNIYA GRAND INDONESIA', r: 'KIY', toko: 1 }, { k: 'HO', n: 'Gudang (HO)', toko: 0 }, { k: 'TERJUAL', toko: 0 }, { k: 'OPENING', toko: 0 },
    { k: 'TRANSIT', toko: 0 }, { k: 'ADJUST', toko: 0 }, { k: 'GMT', toko: 0 }],
  prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', hs: 175000, h: 194250, r: 298846 }, { b: '222', n: 'MOFMOFRIENDS key charm - Tiger', s: 'MF-KC-008', hs: 150000, h: 166500, r: 299700 },
    { b: '333', n: 'MofmoFriends S - Panda', s: 'MF-PLU-010', hs: 200000, h: 210000, r: 315000 }, { b: '444', n: 'MofmoFriends S - Lamb', s: 'MF-PLU-020', hs: 175000, h: 194250, r: 298846 },
    { b: '555', n: 'MofmoFriends Cap - Melon', s: 'MF-CAP-002', hs: 0, h: 0, r: 0 }],
  baris: [
    ['2026-08-01', 0, 20, L.OPENING, L.HO], ['2026-08-01', 1, 30, L.OPENING, L.HO], ['2026-08-01', 2, 10, L.OPENING, L.HO], ['2026-08-01', 3, 5, L.OPENING, L.HO],
    ['2026-08-20', 0, 6, L.HO, L.TRANSIT], ['2026-08-20', 1, 4, L.HO, L.TRANSIT], ['2026-08-20', 3, 2, L.HO, L.TRANSIT],
    ['2026-08-22', 0, 6, L.TRANSIT, L.T305], ['2026-08-22', 1, 4, L.TRANSIT, L.T305], ['2026-08-22', 3, 2, L.TRANSIT, L.T305],
    ['2026-09-18', 0, 1, L.T390, L.TERJUAL],
    ['2026-09-01', 2, 5, L.HO, L.TRANSIT], ['2026-09-04', 2, 2, L.HO, L.TRANSIT], ['2026-09-06', 2, 5, L.TRANSIT, L.KIYGI],
    ['2026-09-08', 0, 2, L.HO, L.GMT], ['2026-09-09', 0, 2, L.GMT, L.TERJUAL],
    ['2026-09-10', 0, 2, L.T305, L.TERJUAL], ['2026-09-12', 1, 1, L.T305, L.TERJUAL], ['2026-09-15', 2, 1, L.KIYGI, L.TERJUAL],
    ['2026-09-25', 0, 3, L.HO, L.TRANSIT], ['2026-09-28', 1, 12, L.ADJUST, L.HO],
    ['2026-10-09', 3, 1, L.HO, L.TRANSIT], ['2026-10-01', 1, 2, L.HO, L.TRANSIT], ['2026-10-02', 1, 2, L.TRANSIT, L.HO], ['2026-10-03', 0, 1, L.T305, L.TERJUAL],
    ['2026-08-25', 0, 1, L.T305, L.TERJUAL]
  ],
  invoiceMitra: [{ bulan: '2026-10', unit: 1, nilai: 175000, gerai: { T305: { unit: 1, nilai: 175000 } } },
    { bulan: '2026-09', unit: 4, nilai: 696520, gerai: { T305: { unit: 3, nilai: 546520 }, 'KIY-GI': { unit: 1, nilai: 150000 } } },
    { bulan: '2026-08', unit: 2, nilai: 332000, gerai: { T305: { unit: 1, nilai: 182000 }, 'KIY-GI': { unit: 1, nilai: 150000 } } }],
  mitraDiam: { ok: true, mitra: [{ kode: 'TGI', telat: false, hariDiam: 3, terakhir: '2026-10-08' }, { kode: 'KIY', telat: true, hariDiam: 12, terakhir: '2026-09-29' }] },
  opname: [{ kode: 'HO', wajib: true, hari: 40 }, { kode: 'T305', wajib: true, hari: 10 }, { kode: 'KIY-GI', wajib: true, hari: null }, { kode: 'T390', wajib: false, hari: null }],
  pemicu: { daftar: [{ fn: 'kirimLaporanBulanan', judul: 'Laporan bulanan', status: 'hijau', terpasang: true }] },
  sehat: { berat: 0, ringan: 1, temuan: [] }
};
const TAGIHAN = { ok: true, baris: [{ no: 'INV-TGI-09', bulan: '2026-09', retailer: 'TGI', nilai: 516100, sisa: 516100, lunas: false, telat: true, hariLewat: 5, tempo: '2026-10-06' }] };
const SP = { ok: true, lewat: 7, pesanan: [
  { ref: 'SP1', tahap: 'TRANSIT', umur: 9, tanggal: '2026-10-01', resi: 'SPX1', retur: null },
  { ref: 'SP2', tahap: 'TRANSIT', umur: null, tanggal: '2026-10-02', resi: 'SPX2', retur: '2026-10-09' },
  { ref: 'SP3', tahap: 'TRANSIT', umur: null, tanggal: '2026-10-04', resi: 'SPX3', retur: true },
  { ref: 'SP4', tahap: 'DELIVERED', umur: null, tanggal: '2026-10-03', resi: 'SPX4', retur: null }] };

const bulat3 = x => Math.round(x * 1000) / 1000;
const RB = 298846 / 1.11; /* retail Bear tanpa pajak */

/* ================= A. hitungan (Node) ================= */
let K = null;
try {
  const kotak = { window: {}, console };
  kotak.window.window = kotak.window;
  vm.createContext(kotak);
  vm.runInContext(fs.readFileSync(path.join(AKAR, 'wms/kontrol.js'), 'utf8'), kotak);
  K = kotak.window.WmsKontrol;
} catch (e) { c('A0 kontrol.js termuat tanpa DOM', false, e.message); }

function bagianA() {
  if (!K || !K._hitung) { c('A0 WmsKontrol._hitung ada', false, 'tidak ada'); return; }
  const H = K._hitung(DATA, { sp: SP, tg: TAGIHAN });
  const H0 = K._hitung(DATA, { sp: null, tg: null });

  c('A1 bulan tutup = bulan sebelum hari ini', H.bulanTutup === '2026-09', H.bulanTutup);

  const rk = H.rekon.map(r => r.bulan + '|' + r.gerai + '|' + r.status).join(',');
  c('A2 rekonsiliasi per gerai per bulan: urut bulan terbaru, gerai sesuai urutan lokasi, status cocok/nilai menyimpang/tanpa invoice/tanpa buku',
    rk === '2026-10|T305|nilaiMenyimpang,2026-09|T305|cocok,2026-09|T390|tanpaInvoice,2026-09|KIY-GI|cocok,2026-08|T305|cocok,2026-08|KIY-GI|tanpaBuku', rk);
  const okt = H.rekon[0];
  c('A3 rasio nilai memakai pajak tiap SKU dan patokan MEDIAN retailer: Okt T305 0,650 lawan 0,676, menyimpang -3,8%',
    bulat3(okt.rasio) === 0.65 && bulat3(okt.norma) === 0.676 && Math.round(okt.deviasi * 1000) === -38, JSON.stringify(okt));

  /* Margin saluran (Ferdy 11 Okt: persennya = margin mitra, semua termasuk PPN).
     Konsinyasi: harga rak = retail r, bersih ke principal = r x (1 - margin mitra). TGI dan KIY 35%, MAA 45%.
     Gamotion 20%: harga = wholesale termasuk PPN / 0,8. Jual putus perorangan 10% seperti direct sales: harga
     = aturan Katalog (hs / 0,9 lalu pajak SKU). Shopee: harga r, biaya 25% (perkiraan).
     Bear: r 298.846 x 0,65 = 194.250 (= wholesale termasuk PPN). Gamotion 194.250 / 0,8 = 242.813.
     Putus 175.000 / 0,9 = 194.444, x 1,11 = 215.833, bersih 215.833 x 0,9 = 194.250. Shopee 298.846 x 0,75 = 224.135. */
  const m = H.margin;
  const bear = m.baris.find(b => b.s === 'MF-PLU-005'), panda = m.baris.find(b => b.s === 'MF-PLU-010');
  const sel = (x, k) => x && x.saluran[k] ? x.saluran[k].harga + '/' + x.saluran[k].net : '-';
  c('A4 saluran dan margin mitra: Toys Kingdom 35%, Kinokuniya 35% (MAA tidak ada gerainya), Gamotion 20%, jual putus 10%, Shopee 25%; wholesale termasuk PPN',
    (m.saluran || []).map(x => x.k + ':' + Math.round(x.m * 100)).join(',') === 'TGI:35,KIY:35,gamotion:20,putus:10,shopee:25' && m.baris.length === 4 && !!bear && bear.wholesale === 194250,
    JSON.stringify(m.saluran) + ' baris ' + m.baris.length + ' wholesale ' + (bear && bear.wholesale));
  c('A5 Bear per saluran (harga/bersih ke principal, termasuk PPN): TGI dan KIY 298.846/194.250, Gamotion 242.813/194.250, jual putus 215.833/194.250, Shopee 298.846/224.135',
    sel(bear, 'TGI') === '298846/194250' && sel(bear, 'KIY') === '298846/194250' && sel(bear, 'gamotion') === '242813/194250' && sel(bear, 'putus') === '215833/194250' && sel(bear, 'shopee') === '298846/224135',
    ['TGI', 'KIY', 'gamotion', 'putus', 'shopee'].map(k => k + ' ' + sel(bear, k)).join(' | '));
  c('A6 pajak per SKU: Panda (5%) jual putus 233.333 (bukan dikali 1,11), Gamotion 262.500, TGI 315.000 x 0,65 = 204.750',
    sel(panda, 'putus') === '233333/210000' && sel(panda, 'gamotion') === '262500/210000' && sel(panda, 'TGI') === '315000/204750', ['TGI', 'gamotion', 'putus'].map(k => k + ' ' + sel(panda, k)).join(' | '));
  const Hp = K._hitung(DATA, { sp: SP, tg: TAGIHAN, opsi: { marginMitra: { TGI: 0.4 }, feeShopee: 0.3, marginPutus: 0.2 } });
  const bp = Hp.margin.baris.find(b => b.s === 'MF-PLU-005');
  c('A7 persen bisa diubah: TGI 40% (bersih 179.308), Shopee 30% (209.192), jual putus 20% (harga 242.813), KIY tetap 35%',
    sel(bp, 'TGI') === '298846/179308' && sel(bp, 'shopee') === '298846/209192' && sel(bp, 'putus') === '242813/194250' && sel(bp, 'KIY') === '298846/194250',
    ['TGI', 'KIY', 'putus', 'shopee'].map(k => k + ' ' + sel(bp, k)).join(' | '));

  const jg = H.janggal.map(j => j.kode + ':' + j.bobot + ':' + j.jml).join(',');
  c('A8 angka janggal berbasis aturan, berat dulu: saldo minus T390, unit invoice lawan buku, nilai menyimpang, ADJUST besar, barang di jalan lewat SLA',
    jg === 'minus:berat:1,unit:berat:2,nilai:sedang:1,adjust:sedang:1,transit:sedang:2', jg);
  const minus = H.janggal[0];
  c('A9 rincian saldo minus menyebut gerai, SKU pendek, dan tanggal pertama', /T390/.test(minus.rincian.join(' ')) && /S Bear/.test(minus.rincian.join(' ')) && /2026-09-18/.test(minus.rincian.join(' ')), minus.rincian.join(' | '));

  const s = H.sla;
  const ks = s.kiriman.map(k => k.kirim + '>' + k.ke + ':' + k.pcs + ':' + k.hari + ':' + (k.lewat ? 'lewat' : 'tepat')).join(',');
  c('A10 SLA kiriman dari pasangan HO ke TRANSIT ke gerai (FIFO per SKU), barang yang kembali ke HO tidak dihitung',
    ks === '2026-09-01>KIY-GI:5:5:lewat,2026-08-20>T305:12:2:tepat' && s.kembali.length === 1 && s.kembali[0].pcs === 2, ks + ' kembali ' + JSON.stringify(s.kembali));
  c('A11 SLA ringkas: rata 3,5 hari, tepat 50%, masih di jalan lot 4 Sep 2 pcs (37 hari), 25 Sep 3 pcs (16 hari), 9 Okt 1 pcs (2 hari)',
    s.rata === 3.5 && s.tepat === 0.5 && s.terbuka.map(x => x.kirim + ':' + x.pcs + ':' + x.umur + ':' + (x.lewat ? 'L' : 'A')).join(',') === '2026-09-04:2:37:L,2026-09-25:3:16:L,2026-10-09:1:2:A', JSON.stringify({ rata: s.rata, tepat: s.tepat, terbuka: s.terbuka }));

  const tb = H.tutup.map(t => t.kode + ':' + t.status + ':' + (t.jml == null ? '' : t.jml)).join(',');
  c('A12 checklist tutup September: laporan T390 belum ada, 1 rekon selisih, 5 pcs masih di jalan 30 Sep, 2 opname lewat, tagihan KIY belum dibuat, laporan bulanan otomatis jalan, kualitas bersih, 2 temuan berat',
    tb === 'laporan:tindak:1,rekon:tindak:1,transit:tindak:5,opname:tindak:2,tagihan:tindak:1,otomatis:beres:,kualitas:beres:,janggalBerat:tindak:2', tb);
  const tLap = H.tutup[0], tTag = H.tutup[4];
  c('A13 rincian checklist menyebut yang kurang (T390, KIY), dan tanpa data tagihan statusnya "belum bisa diperiksa", bukan beres',
    tLap.rincian.join(' ').indexOf('T390') > -1 && tTag.rincian.join(' ').indexOf('KIY') > -1 && H0.tutup[4].status === 'belum', JSON.stringify([tLap.rincian, tTag.rincian, H0.tutup[4].status]));

  const rp = H.rapor.map(r => [r.r, r.gerai, r.unit, r.nilai, r.rakAkhir, r.rak, Math.round(r.sellThrough * 1000), r.tutupan, r.mati, r.skor, r.nilaiRapor].join(':')).join(',');
  c('A14 rapor mitra September: TGI 2 gerai 4 pcs Rp546.520 rak 8 lalu 7, sell-through 33%, tutupan 53 hari, 1 stok mati, skor 30 C; KIY 1 gerai 1 pcs, sell-through 20%, 120 hari, laporan telat, skor 60 B',
    rp === 'TGI:2:4:546520:8:7:333:53:1:30:C,KIY:1:1:150000:4:4:200:120:0:60:B', rp);
  c('A15 rapor membawa piutang dari tagihan (TGI belum 516.100, lewat tempo 516.100) dan laporan mitra (KIY telat 12 hari)',
    H.rapor[0].piutang.belum === 516100 && H.rapor[0].piutang.lewat === 516100 && H.rapor[1].laporan.telat === true && H.rapor[1].laporan.hariDiam === 12, JSON.stringify([H.rapor[0].piutang, H.rapor[1].laporan]));

  const rt = H.retur;
  c('A16 penjaga retur Shopee: retur tertua dulu, SP3 7 hari lewat batas 3 hari, SP2 2 hari; SP1 9 hari di jalan tanpa kabar',
    rt.daftar.map(x => x.ref + ':' + x.umur + ':' + (x.lewat ? 'lewat' : 'aman')).join(',') === 'SP3:7:lewat,SP2:2:aman' && rt.jalanLama.map(x => x.ref).join(',') === 'SP1', JSON.stringify(rt));
  const H00 = K._hitung(DATA, { sp: null, tg: null });
  c('A17 tanpa data gudang Shopee: retur kosong dan ditandai belum terbaca, bukan nol yang tampak bersih', H00.retur.ada === false && H.retur.ada === true, JSON.stringify(H00.retur));

  const d1 = K._draf('laporan', 'KIY', H), d2 = K._draf('rekon', 'TGI', H), d3 = K._draf('tagihan', 'TGI', H), d4 = K._draf('isiUlang', 'TGI', H);
  const semua = [d1, d2, d3, d4].map(d => d.subjek + '\n' + d.isi).join('\n');
  c('A18 draf permintaan laporan ke Kinokuniya menyebut periode September 2026 dan gerainya', /Kinokuniya/.test(d1.subjek) && /September 2026/.test(d1.isi) && /Grand Indonesia/.test(d1.isi), d1.subjek + ' / ' + d1.isi.slice(0, 200));
  c('A19 draf rekonsiliasi ke Toys Kingdom memuat angka yang sama dengan layar: T305 3 pcs Rp546.520, T390 belum ada laporan padahal buku mencatat 1 pcs',
    /T305[^\n]*3 pcs[^\n]*Rp546\.520/.test(d2.isi) && /T390[^\n]*1 pcs/.test(d2.isi), d2.isi);
  c('A20 draf pengingat tagihan menyebut nomor invoice, sisa, dan hari lewat tempo', /INV-TGI-09/.test(d3.isi) && /Rp516\.100/.test(d3.isi) && /5 hari/.test(d3.isi), d3.isi.slice(0, 300));
  c('A21 draf usulan isi ulang: SKU yang laku September dan raknya tinggal sedikit (S Bear 2 pcs ke T305, 1 pcs ke T390)', /S Bear[^\n]*2 pcs/.test(d4.isi) && /T390[^\n]*1 pcs|1 pcs[^\n]*T390/.test(d4.isi), d4.isi);
  /* Dasar wholesale: mitra yang membayar tepat harga wholesale (seperti Kinokuniya di data asli).
     Dua bulan, SKU berbeda: terhadap wholesale 1,000 dan 1,000 (tetap), terhadap retail 0,667 dan 0,650. */
  const D2 = JSON.parse(JSON.stringify(DATA));
  D2.baris.push(['2026-10-05', 0, 1, L.KIYGI, L.TERJUAL]);
  D2.baris.push(['2026-09-30', 0, 1, L.HO, L.KIYGI]);
  D2.invoiceMitra[1].gerai['KIY-GI'] = { unit: 1, nilai: 200000 };
  D2.invoiceMitra[0].gerai['KIY-GI'] = { unit: 1, nilai: 175000 };
  const H2 = K._hitung(D2, { sp: SP, tg: TAGIHAN });
  const r2 = H2.rekon.filter(r => r.gerai === 'KIY-GI' && r.unitBuku).map(r => r.bulan + ':' + r.dasar + ':' + bulat3(r.rasio) + ':' + r.status).join(',');
  c('A23 rekonsiliasi: mitra yang membayar wholesale dibaca dari wholesale (rasio 1,000 cocok di dua bulan), TGI tetap dari retail',
    H2.rekonDasar.KIY === 'modal' && H2.rekonDasar.TGI === 'retail' && r2 === '2026-10:modal:1:cocok,2026-09:modal:1:cocok', JSON.stringify({ d: H2.rekonDasar, r2 }));
  /* Retail tanpa pajak dibaca per SKU di rekonsiliasi: Panda (5%) 315.000 / 1,05 = 300.000, jadi invoice 150.000 = rasio 0,500.
     Dengan 1,11 rata nilainya 283.784 dan rasio 0,529. */
  const kiySep = H.rekon.find(r => r.gerai === 'KIY-GI' && r.bulan === '2026-09');
  c('A24 rekonsiliasi KIY-GI September: retail tanpa pajak Panda 300.000 (pajak 5% per SKU), rasio 0,500',
    !!kiySep && Math.round(kiySep.retail) === 300000 && bulat3(kiySep.rasio) === 0.5, JSON.stringify(kiySep && { retail: kiySep.retail, rasio: kiySep.rasio }));
  c('A22 semua draf tanpa tanda pisah panjang dan berakhir dengan nama pengirim', semua.indexOf(String.fromCharCode(8212)) === -1 && [d1, d2, d3, d4].every(d => /Ferdy/.test(d.isi)), '');
}
bagianA();

/* ================= B. layar (Playwright) ================= */
async function bagianB() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { c('B0 playwright tersedia', false, e.message); return; }
  const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
  const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
  const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
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
  await new Promise(r => srv.listen(8774, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [];
  const pasang = async ctx => {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'panggil' && m.nama === 'dataPapan') h = { pintu: 'ok', hasil: DATA };
      else if (m.fn === 'panggil' && m.nama === 'permintaanDanPiutang') h = { pintu: 'ok', hasil: { ok: true, tagihan: TAGIHAN } };
      else h = { pintu: 'galat', pesan: 'Fungsi "' + (m.nama || m.fn) + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h;
      if (m.fn === 'masuk') h = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') {
        const w = new Date(Date.now() - 60000).toISOString();
        const o = { 'dataPapan|["K"]': DATA, 'obdSpData|["K"]': SP, 'klien|papan': { ok: true, versi: 'kontrol', html: PAPAN }, 'klien|versi': { ok: true, versi: 'kontrol' } };
        const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: w, data: o[k] }; });
        h = { ok: true, isi };
      } else h = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
    });
  };
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const masuk = async (p, bhs) => {
    p.on('pageerror', e => galat.push(e.message));
    await p.goto('http://localhost:8774/wms/');
    await p.evaluate(x => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', x); localStorage.setItem('wms_maskot', 'off'); localStorage.removeItem('wms_kontrol_atur'); }, bhs);
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) { const f = p.frames().find(x => x !== p.mainFrame()); try { if (f && await f.evaluate(() => !!document.querySelector('[data-wms=kontrol]'))) return f; } catch (e) {} await jeda(100); }
    return null;
  };
  try {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    await pasang(ctx);
    const p = await ctx.newPage();
    const fr = await masuk(p, 'en');
    c('B1 tombol Controls ada di kepala papan', !!fr, 'tombol tidak muncul');
    if (fr) {
      await fr.evaluate(() => document.querySelector('[data-wms=kontrol]').click());
      await p.waitForFunction(() => document.querySelectorAll('#kontrol [data-kontrol-item]').length > 0, null, { timeout: 8000 }).catch(() => {});
      const t1 = await p.evaluate(() => ({ tab: document.querySelectorAll('#kontrol [data-kontrol-tab]').length, item: document.querySelectorAll('#kontrol [data-kontrol-item]').length,
        beres: document.querySelectorAll('#kontrol [data-kontrol-item][data-status=beres]').length, judul: (document.querySelector('#kontrol .kn-bulan') || {}).textContent || '' }));
      c('B2 lembar Controls terbuka di Month-end close: 7 tab, 8 butir, 2 beres, periode September 2026', t1.tab === 7 && t1.item === 8 && t1.beres === 2 && /September 2026/.test(t1.judul), JSON.stringify(t1));
      await p.evaluate(() => document.querySelector('#kontrol [data-kontrol-tab=rekon]').click()); await jeda(150);
      const t2 = await p.evaluate(() => Array.from(document.querySelectorAll('#kontrol [data-rekon]')).map(x => x.getAttribute('data-rekon') + '=' + x.getAttribute('data-status')).join(','));
      c('B3 tab Reconciliation: 6 baris dengan status yang sama dengan hitungan', t2 === '2026-10|T305=nilaiMenyimpang,2026-09|T305=cocok,2026-09|T390=tanpaInvoice,2026-09|KIY-GI=cocok,2026-08|T305=cocok,2026-08|KIY-GI=tanpaBuku', t2);
      await p.evaluate(() => document.querySelector('#kontrol [data-kontrol-tab=rapor]').click()); await jeda(150);
      await p.evaluate(() => document.querySelector('#kontrol [data-rapor=TGI] [data-draf=rekon]').click()); await jeda(150);
      const t3 = await p.evaluate(() => { const ta = document.querySelector('#kontrol #knDrafIsi'), a = document.querySelector('#kontrol [data-draf-surel]'); return { nilai: ta ? ta.value : '', href: a ? a.getAttribute('href') : '', nilaiRapor: (document.querySelector('#kontrol [data-rapor=TGI] .kn-nilai') || {}).textContent }; });
      c('B4 rapor TGI bernilai C; tombol draf rekonsiliasi membuka draf yang bisa diubah dan tautan surel tanpa penerima (tidak terkirim sendiri)',
        t3.nilaiRapor === 'C' && /Rp546\.520/.test(t3.nilai) && /^mailto:\?subject=/.test(t3.href), JSON.stringify({ r: t3.nilaiRapor, href: t3.href.slice(0, 40), n: t3.nilai.slice(0, 80) }));
      await p.evaluate(() => { const x = document.querySelector('#kontrol [data-draf-tutup]'); if (x) x.click(); document.querySelector('#kontrol [data-kontrol-tab=margin]').click(); }); await jeda(150);
      const baca = () => p.evaluate(() => ({ kepala: Array.from(document.querySelectorAll('#kontrol .kn-margin thead th')).map(x => x.textContent).join('|'), shopee: (document.querySelector('#kontrol [data-margin-sku="MF-PLU-005"] [data-saluran=shopee] .kn-net') || {}).textContent, tgi: (document.querySelector('#kontrol [data-margin-sku="MF-PLU-005"] [data-saluran=TGI] .kn-net') || {}).textContent }));
      const sebelum = await baca();
      await p.evaluate(() => { const i = document.querySelector('#kontrol [data-margin-input=shopee]'); i.value = '30'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await jeda(150);
      const sesudah = await baca();
      c('B5 kepala kolom menulis margin mitra (Toys Kingdom 35%), Bear bersih Rp194,250 di TGI; Shopee Rp224,135 lalu Rp209,192 setelah biaya diganti 30%',
        /Toys Kingdom[^|]*35%/.test(sebelum.kepala) && /Shopee[^|]*25%/.test(sebelum.kepala) && sebelum.tgi === 'Rp194,250' && sebelum.shopee === 'Rp224,135' && sesudah.shopee === 'Rp209,192' && /Shopee[^|]*30%/.test(sesudah.kepala), JSON.stringify({ sebelum, sesudah }));
      await p.keyboard.press('Escape'); await jeda(150);
      c('B6 Escape menutup lembar', await p.evaluate(() => !document.getElementById('kontrol').classList.contains('buka')), 'masih terbuka');
    }
    await ctx.close();

    const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await pasang(ctx2);
    const hp = await ctx2.newPage();
    const fr2 = await masuk(hp, 'id');
    if (fr2) {
      await fr2.evaluate(() => document.querySelector('[data-wms=kontrol]').click());
      await hp.waitForFunction(() => document.querySelectorAll('#kontrol [data-kontrol-item]').length > 0, null, { timeout: 8000 }).catch(() => {});
      const lebar = {}, label = await hp.evaluate(() => (document.querySelector('#kontrol [data-kontrol-tab=tutup]') || {}).textContent);
      for (const tb of ['tutup', 'rapor', 'margin', 'rekon', 'janggal', 'sla', 'retur']) {
        await hp.evaluate(x => document.querySelector('#kontrol [data-kontrol-tab=' + x + ']').click(), tb); await jeda(120);
        lebar[tb] = await hp.evaluate(() => Math.max(document.documentElement.scrollWidth, document.getElementById('kontrol').scrollWidth));
      }
      c('B7 HP 390 px berbahasa Indonesia ("Tutup bulan"): ketujuh tab tanpa geser samping', /Tutup bulan/.test(label) && Object.keys(lebar).every(k => lebar[k] <= 392), label + ' ' + JSON.stringify(lebar));
    } else c('B7 HP 390 px', false, 'tombol tidak muncul');
    await ctx2.close();
  } catch (e) { c('B MATI di tengah jalan', false, e.stack); }
  c('B8 tidak ada galat JavaScript di layar Controls', galat.length === 0, galat.join(' | ').slice(0, 400));
  await b.close(); srv.close();
}

bagianB().then(() => {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 600))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
});
