/* Tata letak Mofmo Soft untuk halaman papan lama di WMS (11 Okt 2026).
 *
 * Ferdy: "tata letak penuh mockup P9 sampai P14" (kanvas WMS Mofmofriends Pro Max).
 * Papan lama tetap jalan apa adanya di dalam bingkai; lapisan ini cuma menempel
 * di WMS, jadi papan lama yang dibuka lewat Apps Script dan aplikasi lapangan
 * tidak berubah sedikit pun.
 *  - P9 Gerai offline (HAL stokgerai), P11 Keuangan (mitra2), P14 Kualitas data
 *    (sehat): digambar ulang penuh dari data yang sama (dataPapan, dan
 *    permintaanDanPiutang untuk tagihan). Tampilan lama tetap ada di bawahnya,
 *    disembunyikan, dan bisa dibuka lewat tombol "Tampilan lama".
 *  - P10 Dokumen mitra (dokumen): alur unggahnya tetap milik papan; ditambah
 *    kepala halaman, tiga langkah yang menyala sesuai keadaan, kartu laporan
 *    bulanan per retailer, dan kartu laporan mitra yang telat.
 *  - P12 Baca PO (bacapo): berkas di kiri, hasil baca di kanan; tiap baris PO
 *    diberi stok HO dan tanda cukup/kurang. Tombol simpan tetap milik papan.
 *  - P13 Gudang (outbound): kepala halaman; aplikasi gudangnya sendiri tidak
 *    dibongkar.
 * Semua yang di sini cuma membaca. Tidak ada yang ditulis ke sistem.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !!(M().bhs && M().bhs() === 'id'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function nf(n) { return Math.round(Number(n || 0)).toLocaleString(id() ? 'id-ID' : 'en-US'); }
  function rp(n) { return 'Rp' + nf(n); }
  function rpPendek(n) {
    n = Number(n || 0);
    if (Math.abs(n) < 1e6) return rp(n);
    var j = n / 1e6, v = j.toFixed(Math.abs(j) >= 100 ? 0 : Math.abs(j) >= 10 ? 1 : 2);
    return id() ? 'Rp' + v.replace('.', ',') + ' jt' : 'Rp' + v + 'M';
  }
  function persen(x) { return Math.round((Number(x) || 0) * 100) + '%'; }
  var BULAN = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] };
  var BLN = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] };
  function namaBulan(ym) { var m = String(ym || '').match(/^(\d{4})-(\d{2})/); return m ? BULAN[id() ? 'id' : 'en'][Number(m[2]) - 1] + ' ' + m[1] : String(ym || ''); }
  function tglPendek(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Number(m[3]) + ' ' + BLN[id() ? 'id' : 'en'][Number(m[2]) - 1] : String(s || ''); }
  function hari(a, b) { var x = Date.parse(String(a).slice(0, 10) + 'T00:00:00Z'), y = Date.parse(String(b).slice(0, 10) + 'T00:00:00Z'); return isFinite(x) && isFinite(y) ? Math.round((y - x) / 864e5) : 0; }

  var TEKS = {
    en: {
      lama: 'Old view', baru: 'Back to the new view', muat: 'Reading the data…', gagal: 'The data could not be read right now. Check the signal and reload the page.',
      g_alis: function (n, p) { return 'Inventory · ' + n + ' stores · ' + p + ' pcs on shelves'; }, g_judul: 'Offline stores', g_semua: 'All retailers',
      g_matriks: 'Stock on each shelf', g_matriksKet: 'Empty cell = SKU not on that shelf · orange = on shelf, never sold there', g_total: 'Total', g_kosong: 'No stock on any store shelf.', g_semuaBaris: function (n) { return 'Show all ' + n + ' SKUs'; }, g_ringkas: 'Show fewer',
      g_diam: 'On shelf, not selling', g_diamKet: 'SKUs that reached the shelf more than 30 days ago with no sale at that store.', g_diamKosong: 'Every SKU on the shelves has sold at least once, or arrived less than 30 days ago.', hari: 'days',
      g_nilai: 'Shelf value vs cost', g_nilaiKet: 'What each retailer is holding, at cost and at shelf price (both incl. tax).', g_pcs: 'pcs on shelf', g_modal: 'at cost', g_rak: 'at shelf price', g_legend: 'Dark: cost · Accent: margin at shelf price',
      k_alis: function (b) { return 'Finance · ' + b; }, k_judul: 'Finance', k_bersih: 'Partner invoices, net', k_komisi: 'OLS commission', k_komisiKet: function (p) { return p + ' of the month\'s partner invoices'; },
      k_piutang: 'Open receivables', k_lewat: 'Overdue', k_tagihan: 'invoices', k_tagihanJudul: 'Partner invoices', k_tagihanKet: 'Receivables', k_kolom: ['Invoice', 'Retailer', 'Amount', 'Due', 'Status'],
      k_lunas: 'Paid', k_buka: 'Open', k_telat: function (n) { return 'Overdue ' + n + ' days'; }, k_tagihanKosong: 'No partner invoices recorded yet.', k_muatTagihan: 'Reading partner invoices from the server…',
      k_perRetailer: 'OLS commission by retailer', k_perRetailerKet: function (b) { return 'Share of ' + b + ' commission.'; }, k_modalJudul: 'Capital held, and for how long', k_modalKet: 'Stock at cost by who holds it, with the average days since it arrived there (first in, first out).',
      k_rata: function (n) { return 'avg ' + n + ' days'; }, k_gudang: 'HO warehouse', k_rak: function (r) { return r + ' shelves'; }, k_tanpaInvoice: 'No partner invoice rows yet.', k_tidak: 'none',
      k_lamaTombol: 'Store readiness and partner PO',
      q_alis: 'Data quality · checked every 10 minutes', q_judul: 'Data quality', q_skorKet: function (f, j, n) { return f + (f === 1 ? ' finding' : ' findings') + ' to fix. ' + j + ' of ' + n + ' automatic jobs ran on time.'; },
      q_skorRumus: 'Score: 100, minus 10 per serious finding, 3 per minor finding, 8 per late automatic job.', q_temuan: 'Findings', q_bersih: 'Nothing to fix right now.',
      q_telatJudul: function (m) { return 'Partner report late: ' + m; }, q_telatKet: function (t, h) { return 'Last row dated ' + t + ', ' + h + ' days ago.'; }, q_bukaDok: 'Open documents', q_lihat: 'See details',
      q_tugas: 'Automatic jobs', q_tugasKosong: 'No automatic jobs registered.', q_log: 'Activity log', q_logKosong: 'No activity yet.', q_mati: 'off',
      d_alis: 'Sales · partner invoices, sales reports, LP', d_judul: 'Partner documents', d_l1: 'Upload file', d_l2: 'Check rows', d_l3: 'Confirm with PIN',
      d_laporan: function (b) { return 'Monthly report · ' + b; }, d_untuk: 'For Bu Ratih', d_ada: 'Rows in', d_belum: 'No rows yet', d_gerai: function (n) { return n + (n === 1 ? ' store' : ' stores'); },
      d_buka: 'Open monthly report', d_mitra: 'Partner reports', d_mitraKet: 'When each partner last sent sales rows.', d_telat: 'Late', d_aman: 'On time', d_terakhir: 'last row',
      p_alis: 'Shipments · PDF or photo of a partner PO', p_judul: 'Read PO', p_diHo: 'At HO', p_cek: 'Check', p_cukup: 'In stock', p_kurang: 'Short', p_kurangN: function (n) { return n + ' short at HO'; }, p_semua: 'All in stock at HO',
      w_alis: 'Shipments · outbound · USB scanner or phone camera', w_judul: 'Outbound · Offline',
      m_obdOff: 'Outbound · Offline', m_obdShp: 'Outbound · Shopee', m_kirim: 'Shipments', m_stok: 'Inventory',
      m_ringkasStok: 'Stock overview', m_rak: 'Warehouse racks', m_ringkasKirim: 'Overview',
      s_alis: function (n) { return 'Inventory · ' + n + ' SKUs with stock'; }, s_judul: 'Stock overview',
      s_ho: 'HO warehouse', s_hoKet: 'pcs in our warehouse', s_keluar: 'Outbound', s_keluarKet: 'picking to staging', s_jalan: 'In transit', s_jalanKet: 'on the way to stores and buyers', s_gerai: 'Store shelves', s_geraiKet: function (n) { return 'pcs across ' + n + ' stores'; },
      s_alur: 'Where the stock is right now', s_alurKet: 'Every pcs in one line. Outbound stages open Shipments.', s_tahap: { HO: 'HO racks', PICKING: 'Picking', PACKING: 'Packing', STAGING: 'Staging', TRANSIT: 'In transit', GERAI: 'Store shelves' },
      s_tabel: 'Stock per SKU', s_tabelKet: 'HO and store stock from the same ledger as the other pages; rack locations from Warehouse condition. Outbound is counted per document, not per SKU.',
      s_kolom: ['SKU', 'HO rack locations', 'HO', 'Stores', 'Total', 'Status'], s_tanpaLok: 'no location yet',
      s_saring: { semua: 'All', tipis: 'HO thin', rakkosong: 'Rack empty', tanpagerai: 'Not in any store' }, s_st: { ok: 'OK', rakkosong: 'Rack empty', tanpagerai: 'Not in stores', tipis: 'HO thin' },
      s_perhatian: 'Needs attention', s_pTipis: function (n) { return 'Thin at HO (below ' + n + ' pcs)'; }, s_pTipisKet: 'Reorder candidates.', s_pRak: 'Empty pick faces', s_pRakKet: 'Stock is at HO but the pick face is empty. Refill from overflow.', s_pGerai: 'Only at HO', s_pGeraiKet: 'Not on any store shelf yet. Candidates for a store transfer.', s_pKosong: 'Nothing here.',
      s_bukaRak: 'Open Rack replenishment', s_tanpaGudang: 'Warehouse map not available right now; rack locations are hidden.', s_tanpaObd: 'Outbound documents not available right now; outbound and transit show 0.',
      r_alis: 'Inventory · from Warehouse condition', r_judul: 'Warehouse racks', r_terisi: 'Locations filled', r_pcs: 'pcs in locations', r_kosong: 'Empty locations', r_kosongKet: 'pick faces and slots at 0', r_rendah: 'Pick faces under 50%',
      r_unit: function (u) { return u === 'X' ? 'Overflow' : 'Unit ' + u; }, r_tanpa: 'empty slot', r_legenda: 'Red: empty · yellow: pick face under 50% · grey: overflow', r_tidakAda: 'The warehouse map could not be read right now.',
      o_alis: 'Shipments · offline stores and Shopee', o_judul: 'Shipments overview', o_offline: 'Offline to stores', o_offlineKet: 'Delivery plans and delivery orders.', o_shopee: 'Shopee to buyers', o_shopeeKet: 'Marketplace orders from the warehouse app.',
      o_tahapOff: { PICKING: 'Picking', PACKING: 'Packing', STAGING: 'Staging', TRANSIT: 'In transit', DELIVERED: 'Delivered, 7 days' }, o_tahapShp: { PICKING: 'Picking', PACKING: 'Packing', STAGING: 'To courier', TRANSIT: 'On the road', DELIVERED: 'Delivered, 7 days' },
      o_terbaru: 'Latest', o_diterima: 'Delivered', o_kosong: 'No documents yet.', o_bukaOff: 'Open Outbound · Offline', o_bukaShp: 'Open Outbound · Shopee', o_bukaSj: 'Open Delivery orders', o_tidakAda: 'Outbound documents could not be read right now.',
      j_judul: 'Outbound to stores', j_ket: 'Partner stores and manual delivery orders. Shopee orders are under Outbound · Shopee.',
      j_tahap: { PICKING: 'Picking', PACKING: 'Packing', STAGING: 'Staging', TRANSIT: 'In transit', DELIVERED: 'Delivered' },
      j_belum: function (n) { return n + ' pcs not yet at stores'; }, j_kolom: ['Document', 'Store', 'Date', 'Pcs', 'Stage', 'Delivery order'],
      j_kosong: 'No shipments to stores yet. A new one shows up here as soon as a delivery plan is made.', j_buka: 'Open Outbound · Offline', j_bukaSj: 'Open delivery orders',
      g2_judul: 'Goods in & out', g2_semua: 'See Shipments overview', g2_masuk: 'Inbound', g2_masukKanal: 'From principal', g2_keluar: 'Outbound', g2_offKanal: 'Offline · to stores', g2_onKanal: 'Online · Shopee',
      g2_uBatch: 'batches this month', g2_uPcsMasuk: 'pcs into HO this month', g2_uBelum: 'pcs not put away', g2_uBuka: 'open now', g2_uPcsOff: 'pcs this month', g2_uJalan: 'in transit',
      g2_uKirim: 'orders to ship', g2_uPcsOn: 'pcs to buyers this month', g2_uShp: 'pcs at Shopee',
      g2_lMasuk: ['Arrived', 'Counted', 'Put away'], g2_lKeluar: ['Picking', 'Packing', 'Delivery', 'Received'],
      g2_tiba: function (tg, n) { return 'Arrived ' + tg + ' · ' + n + (n === 1 ? ' SKU' : ' SKUs'); }, g2_awal: 'Opening stock', g2_belum: function (n) { return n + ' pcs not put away'; },
      g2_trf: 'Stock transfer HO → Shopee', g2_pesanan: 'Shopee order',
      g2_catatan: 'Counted: per-batch counts are not recorded in the system yet.', g2_catatanTanpaPeta: 'Put away is not shown because the rack map could not be read right now. Counted: per-batch counts are not recorded in the system yet.',
      g2_kosongMasuk: 'No inbound from the principal in the ledger yet.', g2_tanpaBuku: 'The stock ledger could not be read right now.',
      g2_bukaMasuk: 'See stock movement', g2_bukaOff: 'Open Outbound · Offline', g2_bukaOn: 'Open Outbound · Shopee',
      j_batal: 'cancelled', j_tanpaSj: 'not issued yet', j_lebih: function (n) { return n + ' older documents in Outbound · Offline'; },
      b_judul: 'Picking and packing', b_ket: function (n) { return n === 0 ? 'Every outbound document has reached its store.' : n + (n === 1 ? ' outbound document is' : ' outbound documents are') + ' still on the way to stores.'; }, b_buka: 'Open Outbound · Offline'
    },
    id: {
      lama: 'Tampilan lama', baru: 'Kembali ke tampilan baru', muat: 'Membaca data…', gagal: 'Data belum bisa dibaca sekarang. Cek sinyal lalu muat ulang halaman.',
      g_alis: function (n, p) { return 'Persediaan · ' + n + ' gerai · ' + p + ' pcs di rak'; }, g_judul: 'Gerai offline', g_semua: 'Semua retailer',
      g_matriks: 'Stok di tiap rak', g_matriksKet: 'Sel kosong = SKU tidak ada di rak itu · oranye = ada di rak, belum pernah laku di gerai itu', g_total: 'Total', g_kosong: 'Tidak ada stok di rak gerai mana pun.', g_semuaBaris: function (n) { return 'Tampilkan semua ' + n + ' SKU'; }, g_ringkas: 'Tampilkan lebih sedikit',
      g_diam: 'Di rak, belum laku', g_diamKet: 'SKU yang sudah sampai rak lebih dari 30 hari dan belum pernah laku di gerai itu.', g_diamKosong: 'Semua SKU di rak sudah pernah laku, atau baru tiba kurang dari 30 hari.', hari: 'hari',
      g_nilai: 'Nilai rak dibanding modal', g_nilaiKet: 'Yang dipegang tiap retailer, dengan harga modal dan harga rak (keduanya termasuk pajak).', g_pcs: 'pcs di rak', g_modal: 'harga modal', g_rak: 'harga rak', g_legend: 'Gelap: modal · Aksen: margin di harga rak',
      k_alis: function (b) { return 'Keuangan · ' + b; }, k_judul: 'Keuangan', k_bersih: 'Tagihan mitra bersih', k_komisi: 'Komisi OLS', k_komisiKet: function (p) { return p + ' dari tagihan mitra bulan itu'; },
      k_piutang: 'Piutang terbuka', k_lewat: 'Lewat jatuh tempo', k_tagihan: 'tagihan', k_tagihanJudul: 'Tagihan mitra', k_tagihanKet: 'Piutang', k_kolom: ['Nomor', 'Retailer', 'Nilai', 'Jatuh tempo', 'Status'],
      k_lunas: 'Lunas', k_buka: 'Terbuka', k_telat: function (n) { return 'Lewat ' + n + ' hari'; }, k_tagihanKosong: 'Belum ada tagihan mitra yang tercatat.', k_muatTagihan: 'Membaca tagihan mitra dari server…',
      k_perRetailer: 'Komisi OLS per retailer', k_perRetailerKet: function (b) { return 'Bagian dari komisi ' + b + '.'; }, k_modalJudul: 'Modal yang tertahan, dan berapa lama', k_modalKet: 'Stok dengan harga modal menurut siapa yang memegangnya, dengan rata-rata hari sejak tiba di sana (FIFO).',
      k_rata: function (n) { return 'rata-rata ' + n + ' hari'; }, k_gudang: 'Gudang HO', k_rak: function (r) { return 'Rak ' + r; }, k_tanpaInvoice: 'Belum ada baris tagihan mitra.', k_tidak: 'tidak ada',
      k_lamaTombol: 'Kesiapan gerai dan PO mitra',
      q_alis: 'Kualitas data · diperiksa tiap 10 menit', q_judul: 'Kualitas data', q_skorKet: function (f, j, n) { return f + ' temuan perlu dibereskan. ' + j + ' dari ' + n + ' tugas otomatis berjalan tepat waktu.'; },
      q_skorRumus: 'Skor: 100, dikurangi 10 per temuan berat, 3 per temuan ringan, 8 per tugas otomatis yang telat.', q_temuan: 'Temuan', q_bersih: 'Tidak ada yang perlu dibereskan sekarang.',
      q_telatJudul: function (m) { return 'Laporan mitra telat: ' + m; }, q_telatKet: function (t, h) { return 'Baris terakhir bertanggal ' + t + ', ' + h + ' hari lalu.'; }, q_bukaDok: 'Buka dokumen', q_lihat: 'Lihat rincian',
      q_tugas: 'Tugas otomatis', q_tugasKosong: 'Belum ada tugas otomatis terpasang.', q_log: 'Catatan aktivitas', q_logKosong: 'Belum ada aktivitas.', q_mati: 'mati',
      d_alis: 'Penjualan · invoice mitra, laporan jual, LP', d_judul: 'Dokumen mitra', d_l1: 'Unggah berkas', d_l2: 'Periksa baris', d_l3: 'Konfirmasi dengan PIN',
      d_laporan: function (b) { return 'Laporan bulanan · ' + b; }, d_untuk: 'Untuk Bu Ratih', d_ada: 'Baris masuk', d_belum: 'Belum ada baris', d_gerai: function (n) { return n + ' gerai'; },
      d_buka: 'Buka laporan bulanan', d_mitra: 'Laporan mitra', d_mitraKet: 'Kapan tiap mitra terakhir mengirim baris penjualan.', d_telat: 'Telat', d_aman: 'Tepat waktu', d_terakhir: 'baris terakhir',
      p_alis: 'Pengiriman · PDF atau foto PO mitra', p_judul: 'Baca PO', p_diHo: 'Di HO', p_cek: 'Cek', p_cukup: 'Cukup', p_kurang: 'Kurang', p_kurangN: function (n) { return n + ' kurang di HO'; }, p_semua: 'Semua cukup di HO',
      w_alis: 'Pengiriman · outbound · scanner USB atau kamera HP', w_judul: 'Outbound · Offline',
      m_obdOff: 'Outbound · Offline', m_obdShp: 'Outbound · Shopee', m_kirim: 'Pengiriman', m_stok: 'Persediaan',
      m_ringkasStok: 'Ringkasan stok', m_rak: 'Rak gudang', m_ringkasKirim: 'Ringkasan',
      s_alis: function (n) { return 'Persediaan · ' + n + ' SKU berstok'; }, s_judul: 'Ringkasan stok',
      s_ho: 'Gudang HO', s_hoKet: 'pcs di gudang kita', s_keluar: 'Outbound', s_keluarKet: 'picking sampai staging', s_jalan: 'Dalam perjalanan', s_jalanKet: 'menuju gerai dan pembeli', s_gerai: 'Rak gerai', s_geraiKet: function (n) { return 'pcs di ' + n + ' gerai'; },
      s_alur: 'Posisi stok saat ini', s_alurKet: 'Semua pcs dalam satu alur. Tahap outbound membuka Pengiriman.', s_tahap: { HO: 'Rak HO', PICKING: 'Picking', PACKING: 'Packing', STAGING: 'Staging', TRANSIT: 'Dalam perjalanan', GERAI: 'Rak gerai' },
      s_tabel: 'Stok per SKU', s_tabelKet: 'Stok HO dan gerai dari buku besar yang sama dengan halaman lain; lokasi rak dari Kondisi gudang. Outbound dihitung per dokumen, belum per SKU.',
      s_kolom: ['SKU', 'Lokasi rak HO', 'HO', 'Gerai', 'Total', 'Status'], s_tanpaLok: 'belum ada lokasi',
      s_saring: { semua: 'Semua', tipis: 'HO menipis', rakkosong: 'Rak kosong', tanpagerai: 'Belum di gerai' }, s_st: { ok: 'Aman', rakkosong: 'Rak kosong', tanpagerai: 'Belum di gerai', tipis: 'HO menipis' },
      s_perhatian: 'Perlu perhatian', s_pTipis: function (n) { return 'Menipis di HO (di bawah ' + n + ' pcs)'; }, s_pTipisKet: 'Kandidat pesan ulang.', s_pRak: 'Pick face kosong', s_pRakKet: 'Stok ada di HO tetapi pick face kosong. Isi ulang dari overflow.', s_pGerai: 'Hanya ada di HO', s_pGeraiKet: 'Belum ada di rak gerai mana pun. Kandidat transfer ke gerai.', s_pKosong: 'Tidak ada.',
      s_bukaRak: 'Buka Isi ulang rak', s_tanpaGudang: 'Peta gudang belum terbaca; lokasi rak disembunyikan.', s_tanpaObd: 'Dokumen outbound belum terbaca; outbound dan perjalanan tertulis 0.',
      r_alis: 'Persediaan · dari Kondisi gudang', r_judul: 'Rak gudang', r_terisi: 'Lokasi terisi', r_pcs: 'pcs di lokasi', r_kosong: 'Lokasi kosong', r_kosongKet: 'pick face dan slot berisi 0', r_rendah: 'Pick face di bawah 50%',
      r_unit: function (u) { return u === 'X' ? 'Overflow' : 'Unit ' + u; }, r_tanpa: 'slot kosong', r_legenda: 'Merah: kosong · kuning: pick face di bawah 50% · abu: overflow', r_tidakAda: 'Peta gudang belum bisa dibaca saat ini.',
      o_alis: 'Pengiriman · gerai offline dan Shopee', o_judul: 'Ringkasan pengiriman', o_offline: 'Offline ke gerai', o_offlineKet: 'Rencana kirim dan surat jalan.', o_shopee: 'Shopee ke pembeli', o_shopeeKet: 'Pesanan marketplace dari aplikasi gudang.',
      o_tahapOff: { PICKING: 'Picking', PACKING: 'Packing', STAGING: 'Staging', TRANSIT: 'Dalam perjalanan', DELIVERED: 'Diterima, 7 hari' }, o_tahapShp: { PICKING: 'Picking', PACKING: 'Packing', STAGING: 'Ke kurir', TRANSIT: 'Di jalan', DELIVERED: 'Diterima, 7 hari' },
      o_terbaru: 'Terbaru', o_diterima: 'Diterima', o_kosong: 'Belum ada dokumen.', o_bukaOff: 'Buka Outbound · Offline', o_bukaShp: 'Buka Outbound · Shopee', o_bukaSj: 'Buka Surat jalan', o_tidakAda: 'Dokumen outbound belum bisa dibaca saat ini.',
      j_judul: 'Kiriman ke gerai', j_ket: 'Gerai mitra dan surat jalan manual. Pesanan Shopee ada di Outbound · Shopee.',
      j_tahap: { PICKING: 'Picking', PACKING: 'Packing', STAGING: 'Staging', TRANSIT: 'Di jalan', DELIVERED: 'Diterima' },
      j_belum: function (n) { return n + ' pcs belum sampai gerai'; }, j_kolom: ['Dokumen', 'Gerai', 'Tanggal', 'Pcs', 'Tahap', 'Surat jalan'],
      j_kosong: 'Belum ada kiriman ke gerai. Kiriman baru muncul di sini begitu rencana kirim dibuat.', j_buka: 'Buka Outbound · Offline', j_bukaSj: 'Buka surat jalan',
      g2_judul: 'Barang masuk & keluar', g2_semua: 'Lihat ringkasan pengiriman', g2_masuk: 'Inbound', g2_masukKanal: 'Dari principal', g2_keluar: 'Outbound', g2_offKanal: 'Offline · ke gerai', g2_onKanal: 'Online · Shopee',
      g2_uBatch: 'batch bulan ini', g2_uPcsMasuk: 'pcs masuk HO bulan ini', g2_uBelum: 'pcs belum put away', g2_uBuka: 'terbuka', g2_uPcsOff: 'pcs bulan ini', g2_uJalan: 'dalam perjalanan',
      g2_uKirim: 'pesanan perlu dikirim', g2_uPcsOn: 'pcs ke pembeli bulan ini', g2_uShp: 'pcs di Shopee',
      g2_lMasuk: ['Tiba', 'Dihitung', 'Put away'], g2_lKeluar: ['Picking', 'Packing', 'Pengiriman', 'Diterima'],
      g2_tiba: function (tg, n) { return 'Tiba ' + tg + ' · ' + n + ' SKU'; }, g2_awal: 'Stok awal', g2_belum: function (n) { return n + ' pcs belum put away'; },
      g2_trf: 'Transfer stok HO → Shopee', g2_pesanan: 'Pesanan Shopee',
      g2_catatan: 'Dihitung: hitung per batch belum dicatat sistem.', g2_catatanTanpaPeta: 'Put away tidak ditampilkan karena peta rak belum terbaca saat ini. Dihitung: hitung per batch belum dicatat sistem.',
      g2_kosongMasuk: 'Belum ada inbound dari principal di buku besar.', g2_tanpaBuku: 'Buku besar stok belum bisa dibaca saat ini.',
      g2_bukaMasuk: 'Lihat pergerakan stok', g2_bukaOff: 'Buka Outbound · Offline', g2_bukaOn: 'Buka Outbound · Shopee',
      j_batal: 'batal', j_tanpaSj: 'belum terbit', j_lebih: function (n) { return n + ' dokumen lebih lama ada di Outbound · Offline'; },
      b_judul: 'Picking dan packing', b_ket: function (n) { return n === 0 ? 'Semua dokumen outbound sudah sampai gerai.' : n + ' dokumen outbound masih dalam perjalanan ke gerai.'; }, b_buka: 'Buka Outbound · Offline'
    }
  };
  function t(k) { var d = TEKS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TEKS.en[k]; }
  var RETAILER = { TGI: 'Toys Kingdom', KIY: 'Kinokuniya', MAA: 'MAA', GMT: 'Gamotion' };
  function namaRetailer(r) { return RETAILER[r] || r || '?'; }
  /* "MofmoFriends S - Border Collie" jadi "S Border Collie" seperti di mockup; foto SKU WMS tetap mengenalinya */
  function namaPendek(n) { return String(n || '').replace(/\bmofmo ?friends\s+/gi, '').replace(/\s+-\s+/, ' ').trim() || String(n || ''); }
  function judulKata(s) { return String(s || '').toLowerCase().split(/\s+/).filter(Boolean).map(function (w) { return w.length <= 3 && /^(tk|maa|pik|gi|cp|pim|sgi)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); }
  function pendekGerai(l) {
    var n = String((l && l.n) || (l && l.k) || '').toUpperCase().replace(/\s+-\s+.*$/, '');
    n = n.replace(/^TOYS KINGDOM( LIVING WORLD)?\s*/, 'TK ').replace(/^KINOKUNIYA\s*/, 'Kinokuniya ').replace(/\bMALL\b\s*/g, '');
    return judulKata(n).replace(/^Tk /, 'TK ').trim() || (l && l.k) || '';
  }

  /* ---------- data dan hitungan ---------- */
  var D = { janji: null, waktu: 0, data: null, H: null, piutang: null, janjiPiutang: null, waktuPiutang: 0 };
  function muat() {
    if (D.janji && Date.now() - D.waktu < 2 * 60 * 1000) return D.janji;
    D.waktu = Date.now();
    var m = M();
    D.janji = (m.jalan ? m.jalan('dataPapan', ['WMS-TIKET']) : Promise.reject(new Error('jalan'))).then(function (x) {
      if (!x || !x.prod || !x.lok) throw new Error('data');
      D.data = x; D.H = hitung(x); return D;
    }).catch(function (e) { D.janji = null; throw e; });
    return D.janji;
  }
  function muatPiutang() {
    if (D.janjiPiutang && Date.now() - D.waktuPiutang < 2 * 60 * 1000) return D.janjiPiutang;
    D.waktuPiutang = Date.now();
    var m = M();
    D.janjiPiutang = (m.jalan ? m.jalan('permintaanDanPiutang', ['WMS-TIKET']) : Promise.reject(new Error('jalan'))).then(function (x) {
      D.piutang = x || null; return x;
    }).catch(function (e) { D.janjiPiutang = null; throw e; });
    return D.janjiPiutang;
  }
  function toko(l) { return !!(l && (l.toko === 1 || l.toko === '1' || l.toko === true)); }
  /* Satu kali jalan buku besar: stok per lokasi, tiba pertama dan laku per
     gerai-SKU, dan lot FIFO untuk umur modal (umur = sejak tiba di pemegangnya). */
  function hitung(x) {
    var L = x.lok || [], P = x.prod || [], hariIni = x.hariIni || new Date().toISOString().slice(0, 10);
    var urut = (x.baris || []).map(function (b, i) { return { b: b, i: i }; });
    urut.sort(function (a, c) { var p = String(a.b[0]), q = String(c.b[0]); return p < q ? -1 : p > q ? 1 : a.i - c.i; });
    var stok = {}, tiba = {}, laku = {}, lot = {};
    var dipegang = function (l) { return l && (l.k === 'HO' || l.k === 'TRANSIT' || l.k === 'GMT' || toko(l)); };
    var tambah = function (li, pi, q) { var m = stok[li] = stok[li] || {}; m[pi] = (m[pi] || 0) + q; };
    var ambil = function (kunci, q) { var a = lot[kunci] || []; while (q > 0 && a.length) { var h = a[0]; if (h.q <= q) { q -= h.q; a.shift(); } else { h.q -= q; q = 0; } } };
    urut.forEach(function (o) {
      var b = o.b, tg = String(b[0] || '').slice(0, 10), pi = b[1], q = Number(b[2]) || 0, di = b[3], ki = b[4], dr = L[di] || {}, ke = L[ki] || {};
      if (!q) return;
      tambah(di, pi, -q); tambah(ki, pi, q);
      if (toko(ke)) { var k1 = ki + '|' + pi; if (!tiba[k1]) tiba[k1] = tg; }
      if (toko(dr) && ke.k === 'TERJUAL') { var k2 = di + '|' + pi; laku[k2] = (laku[k2] || 0) + q; }
      if (dipegang(dr)) ambil(di + '|' + pi, q);
      if (dipegang(ke)) (lot[ki + '|' + pi] = lot[ki + '|' + pi] || []).push({ tgl: tg, q: q });
    });
    return { L: L, P: P, stok: stok, tiba: tiba, laku: laku, lot: lot, hariIni: hariIni,
      iHO: L.reduce(function (a, l, i) { return l.k === 'HO' ? i : a; }, -1),
      geraiIdx: L.map(function (l, i) { return toko(l) ? i : -1; }).filter(function (i) { return i >= 0; }),
      pajak: function (p) { return p && p.hs > 0 && p.h > 0 ? p.h / p.hs : 1; } };
  }
  function stokDi(H, li, pi) { return ((H.stok[li] || {})[pi]) || 0; }

  /* ---------- kerangka bersama ---------- */
  var KEPALA_BONEKA = ['bear', 'panda', 'shiba', 'koala', 'lamb', 'redpanda', 'otter', 'reindeer'];
  function dasar() { var K = W.KulitPapan; return (K && K.dasar) || 'img/'; }
  function boneka(i) { return '<img class="l4t-kepala" src="' + esc(dasar() + KEPALA_BONEKA[i % KEPALA_BONEKA.length] + '.webp') + '" alt="">'; }
  function kartu(judul, i, isi, kanan, kelas) {
    return '<section class="l4t-kartu ' + (kelas || '') + '"><header class="l4t-kkepala"><h2>' + boneka(i) + '<span>' + esc(judul) + '</span></h2>' + (kanan ? '<span class="l4t-kkanan">' + kanan + '</span>' : '') + '</header>' + isi + '</section>';
  }
  function kepalaHal(alis, judul, kanan) {
    return '<div class="l4t-hal"><div class="l4t-halkiri"><span class="l4t-alis">' + esc(alis) + '</span><h1>' + esc(judul) + '</h1></div>' + (kanan ? '<div class="l4t-halkanan">' + kanan + '</div>' : '') + '</div>';
  }
  function tombolLama(label) { return '<button type="button" class="l4t-tombol dua" data-l4t="lama">' + esc(label || t('lama')) + '</button>'; }

  var GAYA = [
    '.l4t{display:flex;flex-direction:column;gap:18px;margin:0 0 20px;min-width:0}',
    '.l4t-hal{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:4px 0 2px}',
    '.l4t-halkiri{display:flex;flex-direction:column;gap:4px;min-width:0}',
    '.l4t-alis{font-size:15px;font-weight:800;color:var(--l4-mut)}',
    '.l4t-hal h1{margin:0;font-family:"Baloo 2",Nunito,sans-serif;font-size:44px;line-height:1.05;letter-spacing:-.01em;color:var(--l4-ink)}',
    '.l4t-halkanan{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.l4t-tombol{height:42px;padding:0 18px;border-radius:999px;border:0;background:var(--l4-aksen);color:#4A3426;font:800 14.5px Nunito,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:8px}',
    '.l4t-tombol.dua{background:var(--l4-kartu);color:var(--l4-ink);border:1.5px solid var(--l4-garis)}',
    '.l4t-pilih{height:42px;padding:0 14px;border-radius:999px;border:1.5px solid var(--l4-garis);background:var(--l4-kartu);color:var(--l4-ink);font:800 14.5px Nunito,sans-serif}',
    '.l4t-kartu{background:var(--l4-kartu);color:var(--l4-ink);border:1.5px solid var(--l4-garis);border-radius:26px;outline:2px dashed var(--l4-jahit);outline-offset:-9px;padding:20px 22px 22px;min-width:0;box-shadow:0 10px 28px var(--l4-bayang)}',
    '.l4t-kkepala{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px}',
    '.l4t-kkepala h2{margin:0;display:flex;align-items:center;gap:10px;font-family:"Baloo 2",Nunito,sans-serif;font-size:23px;line-height:1.15;color:var(--l4-ink)}',
    '.l4t-kepala{width:34px;height:34px;object-fit:contain;flex:none}',
    '.l4t-kkanan{font-size:13.5px;font-weight:700;color:var(--l4-mut)}',
    '.l4t-ket{margin:-4px 0 12px;font-size:14px;color:var(--l4-mut);line-height:1.45}',
    '.l4t-dua{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}',
    '.l4t-tujuhlima{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:18px;align-items:start}',
    '.l4t-empat{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
    '.l4t-gulir{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -6px;padding:0 6px}',
    '.l4t-tabel{width:100%;border-collapse:collapse;font-size:15px}',
    /* aturan HP papan lama menumpuk semua tabel jadi kartu berlabel; tabel lapisan ini tetap tabel yang digeser di kartunya */
    '.l4t .l4t-tabel{display:table !important}.l4t .l4t-tabel thead{display:table-header-group !important}.l4t .l4t-tabel tbody{display:table-row-group !important}',
    '.l4t .l4t-tabel tr{display:table-row !important}.l4t .l4t-tabel th,.l4t .l4t-tabel td{display:table-cell !important}',
    '.l4t .l4t-tabel td::before,.l4t .l4t-tabel th::before{content:none !important;display:none !important}',
    '.l4t-tabel th{font-size:13px;font-weight:800;color:var(--l4-mut);text-align:left;padding:8px 10px;border-bottom:1.5px solid var(--l4-garis);white-space:nowrap}',
    '.l4t-tabel td{padding:9px 10px;border-bottom:1px solid var(--l4-garis);white-space:nowrap}',
    '.l4t-tabel .ka{text-align:right}.l4t-tabel .te{text-align:center}',
    '.l4t-tabel td.nm{font-weight:800;white-space:normal;min-width:150px}',
    '.l4t-matriks th:first-child,.l4t-matriks td.nm{position:sticky;left:0;z-index:1;background:var(--l4-kartu)}',
    '.l4t-sel{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:32px;padding:0 8px;border-radius:12px;background:var(--l4-lembut);font-weight:800}',
    '.l4t-sel.oranye{background:var(--l4-peach);color:var(--l4-aksenTeks);box-shadow:inset 0 0 0 1.5px var(--l4-aksen)}',
    '.l4t-daftar{display:flex;flex-direction:column;gap:8px}',
    '.l4t-baris{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;border-radius:16px;background:var(--l4-lembut);font-size:15px}',
    '.l4t-baris b{font-weight:800}.l4t-baris small{color:var(--l4-mut);font-size:13px}',
    '.l4t-aksen{color:var(--l4-aksenTeks);font-weight:900;white-space:nowrap}',
    '.l4t-dua-baris{display:flex;flex-direction:column;gap:1px;min-width:0}.l4t-kanan{display:flex;align-items:center;gap:8px;flex:none}',
    '.l4t-semua{margin-top:12px}',
    '.l4t-batang{height:10px;border-radius:999px;background:var(--l4-garis);overflow:hidden;display:flex;margin:6px 0 2px}',
    '.l4t-batang i{display:block;height:100%}.l4t-batang .gelap{background:var(--l4-ink);opacity:.55}.l4t-batang .terang{background:var(--l4-aksen)}',
    '.l4t-ret{display:flex;flex-direction:column;gap:2px;margin-bottom:12px}',
    '.l4t-ret .atas{display:flex;justify-content:space-between;gap:10px;font-weight:800}',
    '.l4t-ret small{font-size:12.5px;color:var(--l4-mut)}',
    '.l4t-kpi{display:flex;flex-direction:column;gap:6px;padding:18px 20px;border-radius:22px;background:var(--l4-kartu);border:1.5px solid var(--l4-garis);min-width:0}',
    '.l4t-kpi span{font-size:13.5px;font-weight:800;color:var(--l4-mut)}',
    '.l4t-kpi b,.l4t-kpi strong{font-family:"Baloo 2",Nunito,sans-serif;font-size:32px;line-height:1.05;color:var(--l4-ink);overflow-wrap:anywhere}',
    '.l4t-kpi small{font-size:13.5px;color:var(--l4-mut)}',
    '.l4t-kpi.awas{background:var(--l4-peach);border-color:var(--l4-aksen)}.l4t-kpi.awas b,.l4t-kpi.awas span{color:var(--l4-aksenTeks)}',
    '.l4t-cip{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;font-size:12.5px;font-weight:900;white-space:nowrap}',
    '.l4t-cip.ok{background:var(--l4-mint);color:var(--l4-mintTeks)}.l4t-cip.awas{background:var(--l4-peach);color:var(--l4-aksenTeks)}.l4t-cip.info{background:var(--l4-lembut);color:var(--l4-ink)}.l4t-cip.merah{background:var(--l4-pink);color:var(--l4-pinkTeks)}',
    '.l4t-skor{display:flex;align-items:center;gap:16px}',
    '.l4t-cincin{width:92px;height:92px;flex:none}.l4t-cincin text{font:900 24px Nunito,sans-serif;fill:var(--l4-ink)}',
    '.l4t-skor p{margin:0;max-width:260px;font-size:15px;color:var(--l4-mut);line-height:1.4}',
    '.l4t-temuan{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:18px;border:1.5px solid var(--l4-garis)}',
    '.l4t-temuan.berat{background:var(--l4-peach);border-color:transparent}',
    '.l4t-tanda{width:38px;height:38px;border-radius:12px;flex:none;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;background:var(--l4-lembut);color:var(--l4-ink)}',
    '.l4t-temuan.berat .l4t-tanda{background:var(--l4-aksen);color:#4A3426}',
    '.l4t-temuan .isi{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.l4t-temuan .isi b{font-size:16px}.l4t-temuan .isi small{font-size:13.5px;color:var(--l4-mut);overflow-wrap:anywhere}',
    '.l4t-tugas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
    '.l4t-tugas>div{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:var(--l4-lembut);min-width:0}',
    '.l4t-tugas .titik{width:10px;height:10px;border-radius:50%;flex:none;background:var(--l4-mintTeks)}.l4t-tugas .titik.kuning{background:var(--l4-aksen)}.l4t-tugas .titik.merah{background:var(--l4-pinkTeks)}.l4t-tugas .titik.mati{background:var(--l4-mut)}',
    '.l4t-tugas .isi{flex:1;min-width:0;display:flex;flex-direction:column}.l4t-tugas .isi b{font-size:15px}.l4t-tugas .isi small{font-size:12.5px;color:var(--l4-mut);overflow-wrap:anywhere}',
    '.l4t-log{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}',
    '.l4t-log li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:10px;font-size:14.5px;line-height:1.35}.l4t-log time{color:var(--l4-mut);font-weight:800;font-size:13px}',
    '.l4t-langkah{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 16px}',
    '.l4t-langkah div{display:flex;align-items:center;gap:10px;min-height:48px;padding:6px 14px;border-radius:999px;border:1.5px solid var(--l4-garis);font-weight:800;font-size:15px;color:var(--l4-mut)}',
    '.l4t-langkah i{font-style:normal;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--l4-lembut);color:var(--l4-ink);font-size:13px;flex:none}',
    '.l4t-langkah .on{background:var(--l4-peach);border-color:var(--l4-aksen);color:var(--l4-aksenTeks)}.l4t-langkah .on i{background:var(--l4-aksen);color:#4A3426}',
    '.l4t-langkah .beres i{background:var(--l4-mint);color:var(--l4-mintTeks)}',
    '.l4t-lapor{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:12px}',
    '.l4t-lapor>div{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:18px;background:var(--l4-lembut)}',
    '.l4t-tautan{background:none;border:0;padding:0;font:inherit;font-weight:800;color:var(--l4-aksenTeks);text-decoration:underline;text-underline-offset:3px;cursor:pointer}',
    '.l4t-jalur .l4t-lapor{grid-template-columns:repeat(5,minmax(0,1fr))}.l4t-jalur .l4t-lapor>div{padding:10px 12px}',
    '@media (max-width:700px){.l4t-jalur .l4t-lapor{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '.l4t-jalur .l4t-bawah{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}',
    '.l4t-lapor b{font-size:16px}.l4t-lapor strong{font-family:"Baloo 2",Nunito,sans-serif;font-size:26px;line-height:1.1}.l4t-lapor small{color:var(--l4-mut);font-size:13.5px}',
    '.l4t-alur{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap}',
    '.l4t-alurb{flex:1 1 120px;display:flex;flex-direction:column;gap:2px;align-items:flex-start;padding:12px 14px;border-radius:18px;border:1.5px solid var(--l4-garis);background:var(--l4-lembut);color:var(--l4-ink);font:inherit;text-align:left;cursor:pointer;min-width:0}',
    '.l4t-alurb b{font-size:13.5px;color:var(--l4-mut)}.l4t-alurb strong{font-family:"Baloo 2",Nunito,sans-serif;font-size:26px;line-height:1.1}.l4t-alurb small{font-size:12px;color:var(--l4-mut)}',
    '.l4t-panah{align-self:center;font-style:normal;font-weight:900;color:var(--l4-mut)}',
    '.l4t-saring{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}',
    '.l4t-cipb{height:34px;padding:0 14px;border-radius:999px;border:1.5px solid var(--l4-garis);background:var(--l4-kartu);color:var(--l4-ink);font:800 13.5px Nunito,sans-serif;cursor:pointer}.l4t-cipb.on{background:var(--l4-peach);border-color:var(--l4-aksen);color:var(--l4-aksenTeks)}.l4t-cipb small{opacity:.75}',
    '.l4t-tabel td.lk{white-space:normal;min-width:150px}',
    /* aturan HP papan memaksa tr tampil (!important); saringan butuh aturan yang lebih spesifik */
    '.l4t .l4t-tabel tr[data-l4t-sembunyi]{display:none !important}',
    '.l4t-lok{display:inline-flex;gap:4px;align-items:center;height:24px;padding:0 9px;margin:2px 4px 2px 0;border-radius:999px;background:var(--l4-lembut);font-size:12.5px;font-weight:800}.l4t-lok.kosong{background:var(--l4-pink);color:var(--l4-pinkTeks)}',
    '.l4t-redup{color:var(--l4-mut)}',
    '.l4t-komp{display:block;height:6px;margin-top:5px;border-radius:999px;background:var(--l4-lembut);overflow:hidden;min-width:60px}.l4t-komp i{display:block;height:100%;background:var(--l4-aksen)}',
    '.l4t-tiga{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.l4t-tiga h3,.l4t-unit h3,.l4t-sub{margin:0 0 6px;font-size:16px;font-weight:900}',
    '.l4t-daftar{list-style:none;margin:0 0 10px;padding:0;display:flex;flex-direction:column;gap:6px}.l4t-daftar li{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:8px 12px;border-radius:14px;background:var(--l4-lembut);font-size:14px}',
    '.l4t-daftar .l4t-cip.info{background:var(--l4-kartu)}',
    '.l4t-unit{margin:0 0 16px}.l4t-slotgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}',
    '.l4t-slot{display:flex;flex-direction:column;gap:5px;padding:12px;border-radius:16px;border:1.5px solid var(--l4-garis);background:var(--l4-kartu);min-width:0}.l4t-slot .atas{display:flex;justify-content:space-between;gap:6px}.l4t-slot .nm{font-size:13px;font-weight:800;overflow-wrap:anywhere}.l4t-slot small{font-size:12px;color:var(--l4-mut)}',
    '.l4t-slot.kosong{background:var(--l4-pink);border-color:var(--l4-pinkTeks)}.l4t-slot.rendah{background:var(--l4-peach);border-color:var(--l4-aksen)}.l4t-slot.over{background:var(--l4-lembut)}',

    /* Summary: Goods in & out (17 Okt 2026) */
    '.l4t-giokepala{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:2px 0 -4px}',
    '.l4t-gio{margin:0;font-family:"Baloo 2",Nunito,sans-serif;font-size:26px;line-height:1.1;color:var(--l4-ink)}',
    '.l4t-kanal{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;font-size:12.5px;font-weight:900;background:var(--l4-peach);color:var(--l4-aksenTeks);white-space:nowrap}',
    '.l4t-gubin{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 10px}',
    '.l4t-gubin>div{display:flex;flex-direction:column;padding:8px 10px;border-radius:14px;background:var(--l4-lembut);min-width:0}',
    '.l4t-gubin strong{font-family:"Baloo 2",Nunito,sans-serif;font-size:24px;line-height:1.05;color:var(--l4-ink)}.l4t-gubin small{font-size:12px;font-weight:800;color:var(--l4-mut)}',
    '.l4t-gubin>div.awas{background:var(--l4-peach)}.l4t-gubin>div.awas strong,.l4t-gubin>div.awas small{color:var(--l4-aksenTeks)}',
    '.l4t-glist{list-style:none;margin:0 0 10px;padding:0;display:flex;flex-direction:column;gap:8px}',
    '.l4t-grow{padding:10px 12px;border-radius:16px;background:var(--l4-lembut);display:flex;flex-direction:column;gap:2px;min-width:0}',
    '.l4t-grow .a{display:flex;justify-content:space-between;align-items:baseline;gap:10px;min-width:0}.l4t-grow .a b,.l4t-grow .a .l4t-tautan{font-size:14.5px;font-weight:900;overflow-wrap:anywhere;text-align:left}',
    '.l4t-grow .pcs{font-family:"Baloo 2",Nunito,sans-serif;font-weight:800;font-size:18px;white-space:nowrap;color:var(--l4-ink)}',
    '.l4t-grow small{font-size:12.5px;color:var(--l4-mut);font-weight:700;overflow-wrap:anywhere}.l4t-grow em{font-style:normal;color:var(--l4-pinkTeks);font-weight:900}',
    '.l4t-lk{list-style:none;display:flex;margin:7px 0 0;padding:0}',
    '.l4t-lk li{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;position:relative;font-size:11px;font-weight:800;color:var(--l4-mut);text-align:center;min-width:0}',
    '.l4t-lk li i{width:14px;height:14px;box-sizing:border-box;border-radius:50%;background:var(--l4-garis);border:2px solid var(--l4-lembut);position:relative;z-index:1}',
    '.l4t-lk li:not(:first-child)::before{content:"";position:absolute;top:6px;right:50%;width:100%;height:3px;background:var(--l4-garis)}',
    '.l4t-lk li.ok i{background:var(--l4-mintTeks)}.l4t-lk li.ok+li::before{background:var(--l4-mintTeks)}',
    '.l4t-lk li.on i{background:var(--l4-aksen);box-shadow:0 0 0 4px var(--l4-peach)}.l4t-lk li.on{color:var(--l4-ink)}',
    '.l4t-lk li.na i{background:transparent;border:2px dashed var(--l4-mut)}.l4t-lk li.na span{font-style:italic}',
    '.l4t-gio-kartu{display:flex;min-width:0}.l4t-gio-kartu>.l4t-kartu{flex:1;display:flex;flex-direction:column}.l4t-gio-kartu .l4t-bawah{margin-top:auto}',
    '@media (max-width:980px){.l4t-tiga{grid-template-columns:1fr}}',
    /* halaman yang digambar ulang penuh: isi lama disembunyikan, bisa dibuka lagi */
    '#isi.l4t-ganti:not(.l4t-lihatlama)>:not(.l4t){display:none !important}',
    '#isi.l4t-ganti.l4t-lihatlama>.l4t>:not(.l4t-hal){display:none !important}',
    /* Baca PO: berkas di kiri, hasil di kanan */
    '#isi.l4t-po .k.s12:has(>.l4t-poKiri){display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);column-gap:22px;align-items:start}',
    '#isi.l4t-po .k.s12:has(>.l4t-poKiri)>*{grid-column:1/-1}',
    '#isi.l4t-po .k.s12>.l4t-poKiri{grid-column:1;display:flex;flex-direction:column;gap:10px;min-width:0;padding:14px;border-radius:20px;background:var(--l4-lembut)}',
    '#isi.l4t-po .k.s12>.l4t-poKiri+.poHasil{grid-column:2;min-width:0}',
    '#isi.l4t-po .poHasil .l4t-cip{margin:6px 0 10px}',
    '@media (max-width:980px){.l4t-tujuhlima{grid-template-columns:1fr}.l4t-empat{grid-template-columns:repeat(2,minmax(0,1fr))}#isi.l4t-po .k.s12:has(>.l4t-poKiri){display:block}}',
    '@media (max-width:720px){.l4t-dua,.l4t-tugas,.l4t-langkah{grid-template-columns:1fr}.l4t-hal h1{font-size:32px}.l4t-kartu{padding:16px 14px 18px;border-radius:22px}.l4t-kpi b,.l4t-kpi strong{font-size:26px}}',
    '@media (max-width:460px){.l4t-kpi{padding:14px}.l4t-kpi b,.l4t-kpi strong{font-size:22px}.l4t-kpi small{font-size:12.5px}.l4t-tabel td.nm{min-width:118px}}'
  ].join('\n');

  /* ---------- P9 Gerai offline ---------- */
  var A = { retailer: '', semuaBaris: false }, BATAS = { baris: 12 };
  function gambarGerai(sek) {
    var H = D.H, L = H.L, P = H.P;
    var semuaGerai = H.geraiIdx.filter(function (li) { return P.some(function (p, pi) { return stokDi(H, li, pi) > 0 || H.tiba[li + '|' + pi]; }); });
    var retailers = []; semuaGerai.forEach(function (li) { var r = L[li].r || '?'; if (retailers.indexOf(r) < 0) retailers.push(r); });
    var gerai = semuaGerai.filter(function (li) { return !A.retailer || L[li].r === A.retailer; });
    gerai.sort(function (a, b) { var x = (L[a].r || '') + L[a].k, y = (L[b].r || '') + L[b].k; return x < y ? -1 : x > y ? 1 : 0; });
    var baris = [];
    P.forEach(function (p, pi) {
      var total = 0, sel = gerai.map(function (li) { var q = Math.max(0, stokDi(H, li, pi)); total += q; return q; });
      if (total > 0) baris.push({ p: p, pi: pi, sel: sel, total: total });
    });
    baris.sort(function (a, b) { return b.total - a.total || (a.p.n < b.p.n ? -1 : 1); });
    var pcs = baris.reduce(function (s, b) { return s + b.total; }, 0);
    var aktif = gerai.filter(function (li) { return P.some(function (p, pi) { return stokDi(H, li, pi) > 0; }); });
    var pilih = '<select class="l4t-pilih" data-l4t-pilih="retailer" aria-label="' + esc(t('g_semua')) + '"><option value="">' + esc(t('g_semua')) + '</option>' +
      retailers.map(function (r) { return '<option value="' + esc(r) + '"' + (A.retailer === r ? ' selected' : '') + '>' + esc(namaRetailer(r)) + '</option>'; }).join('') + '</select>';
    var h = kepalaHal(t('g_alis')(nf(aktif.length), nf(pcs)), t('g_judul'), pilih + tombolLama());
    var mat = !baris.length ? '<p class="l4t-ket">' + esc(t('g_kosong')) + '</p>' :
      '<div class="l4t-gulir"><table class="l4t-tabel l4t-matriks"><thead><tr><th>SKU</th>' + gerai.map(function (li) { return '<th class="te" title="' + esc(L[li].n || L[li].k) + '">' + esc(L[li].k) + '</th>'; }).join('') + '<th class="ka">' + esc(t('g_total')) + '</th></tr></thead><tbody>' +
      baris.slice(0, A.semuaBaris ? baris.length : BATAS.baris).map(function (b) {
        return '<tr data-l4t-sku="' + esc(b.p.s || b.p.b) + '"><td class="nm" title="' + esc(b.p.n) + '">' + esc(namaPendek(b.p.n)) + '</td>' + b.sel.map(function (q, j) {
          var li = gerai[j], belum = q > 0 && !H.laku[li + '|' + b.pi];
          return '<td class="te" data-l4t-gerai="' + esc(L[li].k) + '">' + (q > 0 ? '<span class="l4t-sel' + (belum ? ' oranye' : '') + '">' + nf(q) + '</span>' : '') + '</td>';
        }).join('') + '<td class="ka"><b>' + nf(b.total) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>' +
      (baris.length > BATAS.baris ? '<button type="button" class="l4t-tombol dua l4t-semua" data-l4t-semua="1">' + esc(A.semuaBaris ? t('g_ringkas') : t('g_semuaBaris')(nf(baris.length))) + '</button>' : '');
    h += kartu(t('g_matriks'), 2, mat, esc(t('g_matriksKet')));
    var diam = [];
    gerai.forEach(function (li) { P.forEach(function (p, pi) {
      var q = stokDi(H, li, pi), tb = H.tiba[li + '|' + pi];
      if (q > 0 && tb && !H.laku[li + '|' + pi]) { var d = hari(tb, H.hariIni); if (d > 30) diam.push({ p: p, li: li, d: d }); }
    }); });
    diam.sort(function (a, b) { return b.d - a.d || (a.p.n < b.p.n ? -1 : 1); });
    var kiri = kartu(t('g_diam'), 0, '<p class="l4t-ket">' + esc(t('g_diamKet')) + '</p>' + (diam.length ? '<div class="l4t-daftar">' + diam.slice(0, 8).map(function (x) {
      return '<div class="l4t-baris" data-l4t-diam="' + esc(x.p.s + '@' + L[x.li].k) + '"><span><b>' + esc(namaPendek(x.p.n)) + '</b> <small>· ' + esc(pendekGerai(L[x.li])) + '</small></span><span class="l4t-aksen">' + nf(x.d) + ' ' + esc(t('hari')) + '</span></div>';
    }).join('') + '</div>' : '<p class="l4t-ket">' + esc(t('g_diamKosong')) + '</p>'));
    var per = {};
    gerai.forEach(function (li) { var r = L[li].r || '?'; P.forEach(function (p, pi) { var q = Math.max(0, stokDi(H, li, pi)); if (!q) return; var x = per[r] = per[r] || { pcs: 0, modal: 0, rak: 0 }; x.pcs += q; x.modal += q * (p.h || p.hs || 0); x.rak += q * (p.r || 0); }); });
    var rs = Object.keys(per).sort(function (a, b) { return per[b].pcs - per[a].pcs; });
    var kanan = kartu(t('g_nilai'), 3, '<p class="l4t-ket">' + esc(t('g_nilaiKet')) + '</p>' + rs.map(function (r) {
      var x = per[r], bagi = x.rak > 0 ? Math.min(1, x.modal / x.rak) : 1;
      return '<div class="l4t-ret" data-l4t-ret="' + esc(r) + '" data-modal="' + Math.round(x.modal) + '" data-rak="' + Math.round(x.rak) + '"><div class="atas"><span>' + esc(namaRetailer(r)) + '</span><span>' + nf(x.pcs) + ' ' + esc(t('g_pcs')) + '</span></div>' +
        '<div class="l4t-batang"><i class="gelap" style="width:' + (bagi * 100).toFixed(1) + '%"></i><i class="terang" style="width:' + ((1 - bagi) * 100).toFixed(1) + '%"></i></div>' +
        '<small>' + rp(x.modal) + ' ' + esc(t('g_modal')) + ' · ' + rp(x.rak) + ' ' + esc(t('g_rak')) + '</small></div>';
    }).join('') + '<p class="l4t-ket">' + esc(t('g_legend')) + '</p>');
    h += '<div class="l4t-dua">' + kiri + kanan + '</div>';
    sek.innerHTML = h;
  }

  /* ---------- P11 Keuangan ---------- */
  function bulanTutup(x) {
    var ls = (x.invoiceMitra || []).slice().sort(function (a, b) { return a.bulan < b.bulan ? 1 : -1; });
    var tutup = ls.filter(function (m) { return m.bulan < (x.bulanIni || ''); });
    return tutup[0] || ls[0] || null;
  }
  function gambarKeuangan(sek) {
    var H = D.H, x = D.data, L = H.L, tarif = Number(x.tarif) || 0.1;
    var b = bulanTutup(x), nb = b ? namaBulan(b.bulan) : '';
    var pi = D.piutang, tg = pi && pi.tagihan;
    var kpi = '<div class="l4t-empat">' +
      '<div class="l4t-kpi" data-l4t-kpi="bersih"><span>' + esc(t('k_bersih')) + '</span><b>' + (b ? rpPendek(b.nilai) : '-') + '</b><small>' + esc(b ? nb + ', ' + nf(b.unit) + ' pcs' : t('k_tanpaInvoice')) + '</small></div>' +
      '<div class="l4t-kpi" data-l4t-kpi="komisi"><span>' + esc(t('k_komisi')) + '</span><b>' + (b ? rpPendek(b.nilai * tarif) : '-') + '</b><small>' + esc(t('k_komisiKet')(persen(tarif))) + '</small></div>' +
      '<div class="l4t-kpi" data-l4t-kpi="piutang"><span>' + esc(t('k_piutang')) + '</span><b>' + (tg ? (tg.ok ? rpPendek(tg.belum) : '-') : '…') + '</b><small>' + esc(tg ? (tg.ok ? nf((tg.baris || []).filter(function (r) { return !r.lunas; }).length) + ' ' + t('k_tagihan') : (tg.pesan || '')) : t('k_muatTagihan')) + '</small></div>';
    var telat = tg && tg.ok ? (tg.baris || []).filter(function (r) { return r.telat; }) : [];
    kpi += '<div class="l4t-kpi' + (telat.length ? ' awas' : '') + '" data-l4t-kpi="lewat"><span>' + esc(t('k_lewat')) + '</span><b>' + (tg ? (tg.ok ? nf(telat.length) + ' ' + esc(t('k_tagihan')) : '-') : '…') + '</b><small>' + esc(telat.length ? rp(tg.lewat) + ' · ' + namaRetailer(telat[0].retailer) : (tg && tg.ok ? t('k_tidak') : '')) + '</small></div></div>';
    var h = kepalaHal(t('k_alis')(nb), t('k_judul'), tombolLama(t('k_lamaTombol'))) + kpi;
    var tab;
    if (!tg) tab = '<p class="l4t-ket">' + esc(t('k_muatTagihan')) + '</p>';
    else if (!tg.ok) tab = '<p class="l4t-ket" data-l4t-tagihan="belum">' + esc(tg.pesan || t('k_tagihanKosong')) + '</p>';
    else if (!(tg.baris || []).length) tab = '<p class="l4t-ket">' + esc(t('k_tagihanKosong')) + '</p>';
    else tab = '<div class="l4t-gulir"><table class="l4t-tabel"><thead><tr>' + t('k_kolom').map(function (k, i) { return '<th' + (i === 2 ? ' class="ka"' : '') + '>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      tg.baris.map(function (r) {
        var st = r.lunas ? '<span class="l4t-cip ok">' + esc(t('k_lunas')) + '</span>' : r.telat ? '<span class="l4t-cip awas">' + esc(t('k_telat')(nf(r.hariLewat))) + '</span>' : '<span class="l4t-cip info">' + esc(t('k_buka')) + '</span>';
        return '<tr data-l4t-invoice="' + esc(r.no) + '"><td><b>' + esc(r.no) + '</b></td><td>' + esc(namaRetailer(r.retailer)) + '</td><td class="ka">' + rp(r.lunas ? r.nilai : (r.sisa != null ? r.sisa : r.nilai)) + '</td><td>' + esc(tglPendek(r.tempo)) + '</td><td>' + st + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var kiri = kartu(t('k_tagihanJudul'), 1, tab, esc(t('k_tagihanKet')));
    var kom = {}, total = 0;
    if (b) Object.keys(b.gerai || {}).forEach(function (k) { var l = L.filter(function (z) { return z.k === k; })[0], r = (l && l.r) || k, v = (Number(b.gerai[k].nilai) || 0) * tarif; kom[r] = (kom[r] || 0) + v; total += v; });
    var ks = Object.keys(kom).sort(function (a, c) { return kom[c] - kom[a]; });
    var komisi = kartu(t('k_perRetailer'), 4, (ks.length ? '<p class="l4t-ket">' + esc(t('k_perRetailerKet')(nb)) + '</p>' + ks.map(function (r) {
      var s = total > 0 ? kom[r] / total : 0;
      return '<div class="l4t-ret" data-l4t-komisi="' + esc(r) + '" data-nilai="' + Math.round(kom[r]) + '"><div class="atas"><span>' + esc(namaRetailer(r)) + '</span><span>' + persen(s) + '</span></div><div class="l4t-batang"><i class="terang" style="width:' + (s * 100).toFixed(1) + '%"></i></div><small>' + rp(kom[r]) + '</small></div>';
    }).join('') : '<p class="l4t-ket">' + esc(t('k_tanpaInvoice')) + '</p>'));
    var pegang = {};
    Object.keys(H.lot).forEach(function (kunci) {
      var bag = kunci.split('|'), li = Number(bag[0]), p = H.P[Number(bag[1])], l = L[li]; if (!l || !p) return;
      var siapa = l.k === 'HO' ? 'HO' : toko(l) ? (l.r || '?') : null; if (!siapa) return;
      (H.lot[kunci] || []).forEach(function (o) { var x2 = pegang[siapa] = pegang[siapa] || { nilai: 0, pcs: 0, umur: 0 }; x2.nilai += o.q * (p.hs || 0); x2.pcs += o.q; x2.umur += o.q * hari(o.tgl, H.hariIni); });
    });
    var semua = Object.keys(pegang).reduce(function (s, k) { return s + pegang[k].nilai; }, 0);
    var ps = Object.keys(pegang).filter(function (k) { return pegang[k].pcs > 0; }).sort(function (a, c) { return pegang[c].nilai - pegang[a].nilai; });
    var modal = kartu(t('k_modalJudul'), 5, '<p class="l4t-ket">' + esc(t('k_modalKet')) + '</p><div class="l4t-daftar">' + ps.map(function (k) {
      var x3 = pegang[k], rata = Math.round(x3.umur / x3.pcs);
      return '<div class="l4t-baris" data-l4t-modal="' + esc(k) + '" data-persen="' + (semua > 0 ? Math.round(x3.nilai / semua * 100) : 0) + '" data-rata="' + rata + '"><span class="l4t-dua-baris"><b>' + esc(k === 'HO' ? t('k_gudang') : t('k_rak')(namaRetailer(k))) + '</b><small>' + rpPendek(x3.nilai) + '</small></span><span class="l4t-kanan"><b>' + (semua > 0 ? persen(x3.nilai / semua) : '0%') + '</b><span class="l4t-cip ' + (rata > 45 ? 'awas' : 'info') + '">' + esc(t('k_rata')(nf(rata))) + '</span></span></div>';
    }).join('') + '</div>');
    h += '<div class="l4t-tujuhlima">' + kiri + '<div class="l4t">' + komisi + modal + '</div></div>';
    sek.innerHTML = h;
  }

  /* ---------- P14 Kualitas data ---------- */
  /* teks HTML kecil dari papan (ketData) jadi teks biasa; baris <br> dipisah titik koma */
  function polos(h) {
    return String(h == null ? '' : h).replace(/<br\s*\/?>/gi, '; ').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ').trim();
  }
  /* temuan papan berbidang sehat (temuanLainSehat di papan): yang dihitung lencana menu Kualitas data */
  function temuanPapanSehat(fw) {
    var tp = [];
    try { if (fw && typeof fw.temuanLainSehat === 'function') tp = fw.temuanLainSehat() || []; } catch (e) { tp = []; }
    return tp.filter(function (z) { return z && z.judul; }).map(function (z) {
      var isi = [String(z.ket || '').trim(), polos(z.ketData)].filter(Boolean).join(' ');
      var ket = [polos(z.subjek), isi].filter(Boolean).join(' · ') + (z.aksi ? '. ' + polos(z.aksi) : '');
      return { berat: z.bobot === 'berat', judul: polos(z.judul), ket: ket, aksi: 'lama', label: t('q_lihat') };
    });
  }
  function gambarKualitas(sek, fw) {
    var x = D.data, sehat = x.sehat || {}, temuan = sehat.temuan || [], pem = (x.pemicu && x.pemicu.daftar) || [];
    var telatMitra = ((x.mitraDiam && x.mitraDiam.mitra) || []).filter(function (m) { return m.telat; });
    var dariPapan = temuanPapanSehat(fw), beratPapan = dariPapan.filter(function (z) { return z.berat; }).length;
    var berat = temuan.filter(function (z) { return z.bobot === 'berat'; }).length + telatMitra.length + beratPapan;
    var ringan = temuan.length - temuan.filter(function (z) { return z.bobot === 'berat'; }).length + dariPapan.length - beratPapan;
    var aktif = pem.filter(function (p) { return p.terpasang !== false; });
    var tepat = aktif.filter(function (p) { return p.status === 'hijau'; }).length;
    var skor = Math.max(0, Math.min(100, 100 - 10 * berat - 3 * ringan - 8 * (aktif.length - tepat)));
    var r = 40, kel = 2 * Math.PI * r;
    var cincin = '<svg class="l4t-cincin" viewBox="0 0 100 100" role="img" aria-label="' + skor + '%"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--l4-garis)" stroke-width="10"/>' +
      '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--l4-aksen)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (kel * skor / 100).toFixed(1) + ' ' + kel.toFixed(1) + '" transform="rotate(-90 50 50)"/>' +
      '<text x="50" y="58" text-anchor="middle">' + skor + '%</text></svg>';
    var kanan = '<div class="l4t-skor" data-l4t-skor="' + skor + '" title="' + esc(t('q_skorRumus')) + '">' + cincin + '<p>' + esc(t('q_skorKet')(berat + ringan, tepat, aktif.length)) + '</p></div>' + tombolLama();
    var h = kepalaHal(t('q_alis'), t('q_judul'), kanan);
    var tm = telatMitra.map(function (m) { return { berat: true, judul: t('q_telatJudul')(namaRetailer(m.kode)), ket: t('q_telatKet')(tglPendek(m.terakhir), nf(m.hariDiam)), aksi: 'dokumen', label: t('q_bukaDok') }; })
      .concat(temuan.map(function (z) { return { berat: z.bobot === 'berat', judul: z.judul + (z.jml ? ' (' + nf(z.jml) + ')' : ''), ket: (z.ket || '') + (z.contoh && z.contoh.length ? ' ' + z.contoh.slice(0, 3).join(', ') + (z.contoh.length > 3 ? ', …' : '') : ''), aksi: 'lama', label: t('q_lihat') }; }))
      .concat(dariPapan);
    var temuanHtml = tm.length ? '<div class="l4t-daftar">' + tm.map(function (z) {
      return '<div class="l4t-temuan' + (z.berat ? ' berat' : '') + '" data-l4t-temuan="' + (z.berat ? 'berat' : 'ringan') + '"><span class="l4t-tanda">' + (z.berat ? '!' : 'i') + '</span><div class="isi"><b>' + esc(z.judul) + '</b><small>' + esc(z.ket) + '</small></div>' +
        '<button type="button" class="l4t-tombol dua" ' + (z.aksi === 'lama' ? 'data-l4t="lama"' : 'data-l4t-hal="' + esc(z.aksi) + '"') + '>' + esc(z.label) + '</button></div>';
    }).join('') + '</div>' : '<p class="l4t-ket">' + esc(t('q_bersih')) + '</p>';
    h += kartu(t('q_temuan'), 2, temuanHtml);
    var tugas = pem.length ? '<div class="l4t-tugas">' + pem.map(function (p) {
      var st = p.terpasang === false ? 'mati' : p.status === 'hijau' ? '' : p.status === 'merah' ? 'merah' : 'kuning';
      return '<div data-l4t-tugas="' + esc(p.fn || p.judul) + '" data-status="' + esc(st || 'hijau') + '"><i class="titik ' + st + '"></i><span class="isi"><b>' + esc(p.judul || p.fn) + '</b><small>' + esc(p.jadwal || '') + (p.ket ? ' · ' + esc(p.ket) : '') + '</small></span>' + (st === 'mati' ? '<small>' + esc(t('q_mati')) + '</small>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="l4t-ket">' + esc(t('q_tugasKosong')) + '</p>';
    var akt = (x.aktivitas || []).slice(0, 8);
    var log = akt.length ? '<ol class="l4t-log">' + akt.map(function (a) {
      var w = String(a.waktu || ''), hariSama = w.slice(0, 10) === (x.hariIni || ''), jam = w.slice(11, 16) || w;
      var teks = [a.subjek, a.aksi, a.objek].filter(Boolean).join(' · ') + (a.ketData ? ' (' + a.ketData + ')' : '');
      return '<li data-l4t-log="' + esc(w) + '"><time>' + esc(hariSama ? jam : tglPendek(w)) + '</time><span>' + esc(teks) + '</span></li>';
    }).join('') + '</ol>' : '<p class="l4t-ket">' + esc(t('q_logKosong')) + '</p>';
    h += '<div class="l4t-tujuhlima">' + kartu(t('q_tugas'), 3, tugas) + kartu(t('q_log'), 4, log) + '</div>';
    sek.innerHTML = h;
  }

  /* ---------- P10 Dokumen mitra (tambahan) ---------- */
  function langkahDokumen(d) {
    var hasil = d.getElementById('dokHasil'), f = d.getElementById('dokFile'), tx = d.getElementById('dokTeks');
    var adaPin = hasil && hasil.querySelector('input[type=password],input[inputmode=numeric][maxlength],[data-dokpin],[id*=Pin],[id*=pin]');
    var adaBaris = hasil && hasil.querySelector('table,tr,.dokBaris');
    var adaBerkas = (f && f.files && f.files.length) || (tx && String(tx.value || '').trim());
    return adaPin ? 3 : adaBaris ? 2 : adaBerkas ? 1.5 : 1;
  }
  function gambarLangkah(d) {
    var w = d.querySelector('.l4t-langkah'); if (!w) return;
    var s = langkahDokumen(d), aktif = s >= 3 ? 3 : s > 1 ? 2 : 1;
    if (w.getAttribute('data-l4t-langkah') === String(aktif) && w.firstChild) return;
    w.setAttribute('data-l4t-langkah', String(aktif));
    w.innerHTML = [t('d_l1'), t('d_l2'), t('d_l3')].map(function (n, i) { var no = i + 1, k = no === aktif ? 'on' : no < aktif ? 'beres' : ''; return '<div class="' + k + '"><i>' + (k === 'beres' ? '\u2713' : no) + '</i>' + esc(n) + '</div>'; }).join('');
  }
  function tataDokumen(fw, isi) {
    var d = fw.document, k = isi.querySelector(':scope > .k');
    if (!k || isi.querySelector(':scope > .l4t')) return;
    var atas = d.createElement('div'); atas.className = 'l4t'; atas.setAttribute('data-l4t-hal-ini', 'dokumen');
    atas.innerHTML = kepalaHal(t('d_alis'), t('d_judul'), '');
    isi.insertBefore(atas, isi.firstChild);
    var lk = d.createElement('div'); lk.className = 'l4t-langkah'; k.insertBefore(lk, k.firstChild);
    gambarLangkah(d);
    var bawah = d.createElement('div'); bawah.className = 'l4t l4t-bawah';
    bawah.innerHTML = '<p class="l4t-ket">' + esc(t('muat')) + '</p>';
    isi.appendChild(bawah);
    var segar = function () { gambarLangkah(d); };
    k.addEventListener('change', segar); k.addEventListener('input', segar);
    var hs = d.getElementById('dokHasil'); if (hs) new fw.MutationObserver(segar).observe(hs, { childList: true, subtree: true });
    muat().then(function () {
      if (!bawah.isConnected) return;
      var x = D.data, L = D.H.L, b = bulanTutup(x), nb = b ? namaBulan(b.bulan) : '';
      var per = {};
      L.forEach(function (l) { if (toko(l) && l.r && !per[l.r]) per[l.r] = { nilai: 0, unit: 0, gerai: [] }; });
      if (b) Object.keys(b.gerai || {}).forEach(function (kd) { var l = L.filter(function (q) { return q.k === kd; })[0], r = (l && l.r) || kd, z = per[r] = per[r] || { nilai: 0, unit: 0, gerai: [] }; z.nilai += Number(b.gerai[kd].nilai) || 0; z.unit += Number(b.gerai[kd].unit) || 0; if (z.gerai.indexOf(kd) < 0) z.gerai.push(kd); });
      var rs = Object.keys(per).sort(function (a, c) { return per[c].nilai - per[a].nilai || (a < c ? -1 : 1); });
      var lapor = '<div class="l4t-lapor">' + rs.map(function (r) {
        var z = per[r];
        return '<div data-l4t-lapor="' + esc(r) + '" data-nilai="' + Math.round(z.nilai) + '"><b>' + esc(namaRetailer(r)) + '</b><strong>' + rpPendek(z.nilai) + '</strong><small>' + nf(z.unit) + ' pcs · ' + esc(t('d_gerai')(z.gerai.length)) + '</small>' +
          '<span><span class="l4t-cip ' + (z.unit > 0 ? 'ok' : 'awas') + '">' + esc(z.unit > 0 ? t('d_ada') : t('d_belum')) + '</span></span></div>';
      }).join('') + '</div><button type="button" class="l4t-tombol" data-l4t-hal="bulanan">' + esc(t('d_buka')) + '</button>';
      var md = ((x.mitraDiam && x.mitraDiam.mitra) || []).slice().sort(function (a, c) { return (c.hariDiam || 0) - (a.hariDiam || 0); });
      var mitra = '<p class="l4t-ket">' + esc(t('d_mitraKet')) + '</p><div class="l4t-daftar">' + md.map(function (m) {
        return '<div class="l4t-baris" data-l4t-mitra="' + esc(m.kode) + '"><span><b>' + esc(namaRetailer(m.kode)) + '</b> <small>· ' + esc(t('d_terakhir')) + ' ' + esc(tglPendek(m.terakhir)) + '</small></span><span class="l4t-cip ' + (m.telat ? 'awas' : 'ok') + '">' + esc(m.telat ? t('d_telat') + ' · ' + nf(m.hariDiam) + ' ' + t('hari') : t('d_aman')) + '</span></div>';
      }).join('') + '</div>';
      bawah.innerHTML = '<div class="l4t-tujuhlima">' + kartu(t('d_laporan')(nb), 1, lapor, esc(t('d_untuk'))) + kartu(t('d_mitra'), 0, mitra) + '</div>';
    }, function () { if (bawah.isConnected) bawah.innerHTML = '<p class="l4t-ket">' + esc(t('gagal')) + '</p>'; });
  }

  /* ---------- P12 Baca PO (tambahan) ---------- */
  function tataBacaPo(fw, isi) {
    var d = fw.document;
    isi.classList.add('l4t-po');
    if (!isi.querySelector(':scope > .l4t')) {
      var atas = d.createElement('div'); atas.className = 'l4t'; atas.setAttribute('data-l4t-hal-ini', 'bacapo');
      atas.innerHTML = kepalaHal(t('p_alis'), t('p_judul'), '');
      var tab = isi.querySelector(':scope > .halTab');
      isi.insertBefore(atas, tab ? tab.nextSibling : isi.firstChild);
    }
    var kartuPo = isi.querySelector(':scope > .k.s12'), hasil = kartuPo && kartuPo.querySelector(':scope > .poHasil');
    if (hasil && !kartuPo.querySelector(':scope > .l4t-poKiri')) {
      var kiri = d.createElement('div'); kiri.className = 'l4t-poKiri';
      var ambil = kartuPo.querySelector(':scope > .poAmbil');
      kartuPo.insertBefore(kiri, ambil || hasil);
      Array.prototype.slice.call(kartuPo.children).forEach(function (c) { if (c.matches('.poAmbil,textarea,.poTbl')) kiri.appendChild(c); });
    }
    var tabel = isi.querySelector('.poHasil table.poTab');
    if (!tabel || tabel.getAttribute('data-l4t-ho')) return;
    muat().then(function () {
      if (!tabel.isConnected || tabel.getAttribute('data-l4t-ho')) return;
      tabel.setAttribute('data-l4t-ho', '1');
      var H = D.H, peta = {}; H.P.forEach(function (p, pi) { if (p.b) peta[String(p.b)] = pi; });
      var kurang = 0, baris = 0;
      Array.prototype.forEach.call(tabel.rows, function (tr) {
        if (tr.classList.contains('tbk')) { tr.insertAdjacentHTML('beforeend', '<td class="ka">' + esc(t('p_diHo')) + '</td><td>' + esc(t('p_cek')) + '</td>'); return; }
        var bc = tr.querySelector('.poBc'), qtyEl = tr.querySelector('td.ka b');
        if (!bc || !qtyEl) return;
        var pi = peta[String(bc.textContent || '').trim()], ho = pi == null ? 0 : Math.max(0, stokDi(H, H.iHO, pi)), q = Number(String(qtyEl.textContent).replace(/[^\d]/g, '')) || 0;
        var ok = ho >= q; baris++; if (!ok) kurang++;
        tr.setAttribute('data-l4t-ho', String(ho));
        tr.insertAdjacentHTML('beforeend', '<td class="ka">' + nf(ho) + '</td><td><span class="l4t-cip ' + (ok ? 'ok' : 'awas') + '">' + esc(ok ? t('p_cukup') : t('p_kurang')) + '</span></td>');
      });
      if (baris) tabel.insertAdjacentHTML('beforebegin', '<span class="l4t-cip ' + (kurang ? 'awas' : 'ok') + '" data-l4t-kurang="' + kurang + '">' + esc(kurang ? t('p_kurangN')(kurang) : t('p_semua')) + '</span>');
    }, function () {});
  }

  /* ---------- P13 Gudang (kepala) ---------- */
  function tataGudang(fw, isi) {
    if (isi.querySelector(':scope > .l4t')) return;
    var atas = fw.document.createElement('div'); atas.className = 'l4t'; atas.setAttribute('data-l4t-hal-ini', 'outbound');
    atas.innerHTML = kepalaHal(t('w_alis'), t('w_judul'), '');
    isi.insertBefore(atas, isi.firstChild);
    var coba = 0, rapikan = function () {
      var k = isi.querySelector('#obdKotak'), sr = k && k.shadowRoot;
      if (!sr) { if (++coba < 20 && atas.isConnected) fw.setTimeout(rapikan, 300); return; }
      if (sr.__l4t) return; sr.__l4t = true;
      try { var lb = new fw.CSSStyleSheet(); lb.replaceSync('.kep>div:first-child>:first-child{display:none !important}'); sr.adoptedStyleSheets = sr.adoptedStyleSheets.concat([lb]); } catch (e) {}
    };
    rapikan();
  }


  /* ---------- Menu: Warehouse dibubarkan ke Inventory dan Shipments (15 Okt 2026) ----------
     Ferdy: "warehouse dan inventory blm nyatu" dan "outbound offline dan shopee
     bisa link ke shipment?". Skrip Gudang papan lama (pasangMenu, tiap 700 ms)
     menyisipkan ulang grup "outbound" kalau grup itu hilang dari HALAMAN, jadi
     HALAMAN asli TIDAK diubah. Yang diubah cuma salinan yang dipakai gambarPanel
     selama menggambar: Outbound Offline dan Shopee jadi anak pertama Shipments,
     Isi ulang rak jadi anak terakhir Inventory, grup Warehouse tidak digambar. */
  function susunMenu(H) {
    if (!H || !H.length) return H;
    var iO = -1, iK = -1, iS = -1;
    for (var i = 0; i < H.length; i++) { if (H[i][0] === 'outbound') iO = i; if (H[i][0] === 'rencana') iK = i; if (H[i][0] === 'stok') iS = i; }
    if (iK < 0 || iS < 0) return H;
    var anakO = iO >= 0 ? (H[iO][3] || []) : [], cari = function (k) { for (var j = 0; j < anakO.length; j++) if (anakO[j][0] === k) return anakO[j]; return null; };
    var off = cari('outbound'), shp = cari('obdShopee'), iu = cari('obdIsiUlang');
    var baru = [];
    for (var g = 0; g < H.length; g++) if (g !== iO) baru.push([H[g][0], H[g][1], H[g][2], (H[g][3] || []).slice()]);
    var K = null, S = null;
    baru.forEach(function (x) { if (x[0] === 'rencana') K = x; if (x[0] === 'stok') S = x; });
    /* 17 Okt 2026: halaman ringkasan baru (baca saja) paling atas di grupnya */
    var depan = [['l4kirim', t('m_ringkasKirim')]];
    if (off) depan.push(['outbound', t('m_obdOff')]);
    if (shp) depan.push([shp[0], t('m_obdShp')]);
    K[3] = depan.concat(K[3].filter(function (c) { return c[0] !== 'outbound' && c[0] !== 'obdShopee' && c[0] !== 'l4kirim'; }));
    S[3] = [['l4stok', t('m_ringkasStok')], ['l4rak', t('m_rak')]].concat(S[3].filter(function (c) { return c[0] !== 'l4stok' && c[0] !== 'l4rak'; }));
    if (iu && !S[3].some(function (c) { return c[0] === iu[0]; })) S[3].push([iu[0], iu[1]]);
    return baru;
  }
  function pasangMenuBaru(fw) {
    var asli = fw.gambarPanel;
    if (typeof asli === 'function' && !asli.__l4t) {
      var bungkus = function () {
        var H = fw.HALAMAN, B = H;
        try { B = susunMenu(H); } catch (e) { B = H; }
        if (B === H) return asli.apply(this, arguments);
        fw.HALAMAN = B;
        try { return asli.apply(this, arguments); } finally { fw.HALAMAN = H; }
      };
      bungkus.__l4t = true; fw.gambarPanel = bungkus;
      try { bungkus(); } catch (e) {}
    }
    /* Subjudul "Warehouse · ..." dari skrip Gudang ikut nama menu barunya. Skrip
       itu memanggil ulang tiap 700 ms selama teksnya beda dari versinya sendiri,
       jadi kalau teks yang benar sudah terpasang, tidak ditulis ulang. */
    var sj = fw.pasangSubJudul;
    if (typeof sj === 'function' && !sj.__l4t) {
      var sub = function (a, b) {
        if (/^(Warehouse|Gudang)$/.test(String(a))) {
          a = String(fw.HAL || '') === 'obdIsiUlang' ? t('m_stok') : t('m_kirim');
          var el = fw.document.getElementById('subJudul');
          if (el && el.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() === a + ' · ' + b) return;
        }
        return sj.apply(this, [a, b].concat(Array.prototype.slice.call(arguments, 2)));
      };
      sub.__l4t = true; fw.pasangSubJudul = sub;
    }
  }

  /* ---------- Shipments: jalur offline, dan tautan balik di surat jalan ---------- */
  var OBD = { janji: null, waktu: 0, data: null };
  var TAHAP = ['PICKING', 'PACKING', 'STAGING', 'TRANSIT', 'DELIVERED'];
  function muatObd() {
    if (OBD.janji && Date.now() - OBD.waktu < 60 * 1000) return OBD.janji;
    OBD.waktu = Date.now();
    var m = M();
    OBD.janji = (m.jalan ? m.jalan('obdDaftar', ['WMS-TIKET']) : Promise.reject(new Error('jalan'))).then(function (x) {
      if (!x || x.ok === false || !Array.isArray(x.daftar)) throw new Error('obd');
      OBD.data = x; return x;
    }).catch(function (e) { OBD.janji = null; OBD.data = null; throw e; });
    return OBD.janji;
  }
  /* pesanan marketplace (lajur online) punya jalurnya sendiri di Outbound · Shopee */
  function dokOffline(x) { return (x.daftar || []).filter(function (d) { return d && d.lajur !== 'online'; }); }
  function kartuJalur(x) {
    var L = dokOffline(x), jml = {};
    TAHAP.forEach(function (k) { jml[k] = 0; });
    L.forEach(function (d) { if (jml[d.tahap] != null) jml[d.tahap]++; });
    var nama = t('j_tahap');
    var isi = '<p class="l4t-ket">' + esc(t('j_ket')) + '</p><div class="l4t-lapor">' + TAHAP.map(function (k) {
      return '<div data-l4t-tahap="' + k + '"><b>' + esc(nama[k]) + '</b><strong>' + nf(jml[k]) + '</strong></div>';
    }).join('') + '</div>';
    if (!L.length) {
      isi += '<p class="l4t-ket" data-l4t-kosong>' + esc(t('j_kosong')) + '</p>';
    } else {
      var belum = 0; L.forEach(function (d) { if (d.tahap !== 'DELIVERED') belum += Number(d.pcsPesan) || 0; });
      var urut = L.slice().sort(function (p, q) {
        var a = p.tahap === 'DELIVERED' ? 1 : 0, b = q.tahap === 'DELIVERED' ? 1 : 0;
        if (a !== b) return a - b;
        return String(q.tanggal || '') < String(p.tanggal || '') ? -1 : String(q.tanggal || '') > String(p.tanggal || '') ? 1 : 0;
      });
      var tampil = urut.slice(0, 8), kol = t('j_kolom');
      isi += '<p class="l4t-ket" data-l4t-belum>' + esc(t('j_belum')(nf(belum))) + '</p>';
      isi += '<div class="l4t-gulir"><table class="l4t-tabel"><thead><tr><th>' + esc(kol[0]) + '</th><th>' + esc(kol[1]) + '</th><th>' + esc(kol[2]) + '</th><th class="ka">' + esc(kol[3]) + '</th><th>' + esc(kol[4]) + '</th><th>' + esc(kol[5]) + '</th></tr></thead><tbody>' +
        tampil.map(function (d) {
          var sj = d.noSj ? '<button type="button" class="l4t-tautan" data-l4t-hal="kemas">' + esc(d.noSj) + '</button>' + (d.sjBatal ? ' <small>' + esc(t('j_batal')) + '</small>' : '') : '<small>' + esc(t('j_tanpaSj')) + '</small>';
          return '<tr data-l4t-ref="' + esc(d.ref) + '"><td><button type="button" class="l4t-tautan" data-l4t-hal="outbound">' + esc(d.ref) + '</button></td><td>' + esc(d.tujuan || '') + '</td><td>' + esc(tglPendek(d.tanggal)) + '</td><td class="ka">' + nf(d.pcsPesan) + '</td>' +
            '<td><span class="l4t-cip' + (d.tahap === 'DELIVERED' ? ' ok' : '') + '">' + esc(nama[d.tahap] || d.tahap || '') + '</span></td><td>' + sj + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      if (urut.length > tampil.length) isi += '<p class="l4t-ket">' + esc(t('j_lebih')(urut.length - tampil.length)) + '</p>';
    }
    isi += '<div class="l4t-bawah"><button type="button" class="l4t-tombol dua" data-l4t-hal="outbound">' + esc(t('j_buka')) + '</button><button type="button" class="l4t-tombol dua" data-l4t-hal="kemas">' + esc(t('j_bukaSj')) + '</button></div>';
    return '<div class="l4t-jalur" data-l4t-jalur="offline">' + kartu(t('j_judul'), 2, isi) + '</div>';
  }
  function tataKiriman(fw, isi) {
    if (isi.querySelector(':scope > .l4t[data-l4t-hal-ini=rencana]')) return;
    var sek = fw.document.createElement('div'); sek.className = 'l4t'; sek.setAttribute('data-l4t-hal-ini', 'rencana');
    sek.innerHTML = '<p class="l4t-ket">' + esc(t('muat')) + '</p>';
    isi.insertBefore(sek, isi.firstChild);
    muatObd().then(function (x) { if (sek.isConnected && fw.HAL === 'rencana') sek.innerHTML = kartuJalur(x); },
      function () { if (sek.isConnected) sek.innerHTML = '<p class="l4t-ket">' + esc(t('gagal')) + '</p>'; });
  }
  function tataSuratJalan(fw, isi) {
    if (isi.querySelector(':scope > .l4t[data-l4t-hal-ini=kemas]')) return;
    var sek = fw.document.createElement('div'); sek.className = 'l4t'; sek.setAttribute('data-l4t-hal-ini', 'kemas');
    isi.insertBefore(sek, isi.firstChild);
    muatObd().then(function (x) {
      if (!sek.isConnected || fw.HAL !== 'kemas') return;
      var n = dokOffline(x).filter(function (d) { return d.tahap !== 'DELIVERED'; }).length;
      sek.innerHTML = '<div class="l4t-baris"><span class="l4t-dua-baris"><b>' + esc(t('b_judul')) + '</b><small>' + esc(t('b_ket')(n)) + '</small></span>' +
        '<span class="l4t-kanan"><button type="button" class="l4t-tombol dua" data-l4t-hal="outbound" data-l4t-balik="outbound">' + esc(t('b_buka')) + '</button></span></div>';
    }, function () { if (sek.parentNode) sek.parentNode.removeChild(sek); });
  }


  /* ---------- Ringkasan stok, Rak gudang, Ringkasan pengiriman (17 Okt 2026) ----------
     Mockup 15 Okt (disetujui), dibangun 17 Okt: "integrasiin dlu". Baca saja.
     Sumber: dataPapan (buku besar, sama dengan halaman lain), wmsGudang (peta gudang,
     potret Supabase) dan obdDaftar (dokumen outbound). Outbound dan perjalanan dihitung
     per dokumen (pcsPesan), karena dokumen outbound belum memuat rincian per SKU. */
  var TIPIS = 6;
  var GUD = { janji: null, waktu: 0, data: null };
  function muatGudang() {
    if (GUD.janji && Date.now() - GUD.waktu < 60 * 1000) return GUD.janji;
    GUD.waktu = Date.now();
    var m = M();
    GUD.janji = (m.potret ? m.potret(['wmsGudang|["K"]']) : Promise.reject(new Error('potret'))).then(function (isi) {
      var x = isi && isi['wmsGudang|["K"]']; x = x && x.data;
      if (!x || !Array.isArray(x.lokasi)) throw new Error('gudang');
      GUD.data = x; return x;
    }).catch(function (e) { GUD.janji = null; GUD.data = null; throw e; });
    return GUD.janji;
  }
  var TAHAP_KELUAR = ['PICKING', 'PACKING', 'STAGING'];
  function pcsTahap(daftar, tahap) { var n = 0; (daftar || []).forEach(function (d) { if (d && d.tahap === tahap) n += Number(d.pcsPesan) || 0; }); return n; }
  function hitungRingkasStok(H, G) {
    var lok = (G && G.lokasi) || [], baris = [];
    H.P.forEach(function (p, pi) {
      var ho = H.iHO >= 0 ? stokDi(H, H.iHO, pi) : 0, gerai = 0;
      H.geraiIdx.forEach(function (li) { var q = stokDi(H, li, pi); if (q > 0) gerai += q; });
      if (ho <= 0 && gerai <= 0) return;
      var di = lok.filter(function (l) { return l && String(l.barcode || '') !== '' && String(l.barcode) === String(p.b); });
      var pick = di.filter(function (l) { return l.peran === 'PICK'; });
      var isiPick = pick.reduce(function (a, l) { return a + (Number(l.isi) || 0); }, 0);
      var st = [];
      if (ho > 0 && pick.length && isiPick <= 0) st.push('rakkosong');
      if (ho > 0 && gerai <= 0) st.push('tanpagerai');
      if (ho > 0 && ho < TIPIS) st.push('tipis');
      if (!st.length) st.push('ok');
      baris.push({ p: p, ho: Math.max(ho, 0), gerai: gerai, total: Math.max(ho, 0) + gerai, lok: di, pickKosong: pick.filter(function (l) { return !(Number(l.isi) > 0); }), st: st });
    });
    baris.sort(function (a, b) { return b.total - a.total || (a.p.n < b.p.n ? -1 : 1); });
    return baris;
  }
  function gambarRingkasStok(sek) {
    var H = D.H, G = GUD.data, O = OBD.data, daftar = (O && O.daftar) || [];
    var baris = hitungRingkasStok(H, G);
    var ho = 0, gerai = 0; baris.forEach(function (b) { ho += b.ho; gerai += b.gerai; });
    var nGerai = H.geraiIdx.filter(function (li) { return H.P.some(function (p, pi) { return stokDi(H, li, pi) > 0; }); }).length;
    var keluar = 0; TAHAP_KELUAR.forEach(function (k) { keluar += pcsTahap(daftar, k); });
    var jalan = pcsTahap(daftar, 'TRANSIT');
    var kpi = '<div class="l4t-empat">' +
      '<div class="l4t-kpi" data-l4t-angka="ho"><span>' + esc(t('s_ho')) + '</span><strong>' + nf(ho) + '</strong><small>' + esc(t('s_hoKet')) + '</small></div>' +
      '<div class="l4t-kpi" data-l4t-angka="keluar"><span>' + esc(t('s_keluar')) + '</span><strong>' + nf(keluar) + '</strong><small>' + esc(t('s_keluarKet')) + '</small></div>' +
      '<div class="l4t-kpi" data-l4t-angka="jalan"><span>' + esc(t('s_jalan')) + '</span><strong>' + nf(jalan) + '</strong><small>' + esc(t('s_jalanKet')) + '</small></div>' +
      '<div class="l4t-kpi" data-l4t-angka="gerai"><span>' + esc(t('s_gerai')) + '</span><strong>' + nf(gerai) + '</strong><small>' + esc(t('s_geraiKet')(nGerai)) + '</small></div></div>';
    var nama = t('s_tahap'), langkah = [['HO', ho, 'l4rak'], ['PICKING', pcsTahap(daftar, 'PICKING'), 'l4kirim'], ['PACKING', pcsTahap(daftar, 'PACKING'), 'l4kirim'], ['STAGING', pcsTahap(daftar, 'STAGING'), 'l4kirim'], ['TRANSIT', jalan, 'l4kirim'], ['GERAI', gerai, 'stokgerai']];
    var alur = '<p class="l4t-ket">' + esc(t('s_alurKet')) + '</p><div class="l4t-alur">' + langkah.map(function (x, i) {
      return (i ? '<i class="l4t-panah" aria-hidden="true">›</i>' : '') + '<button type="button" class="l4t-alurb" data-l4t-alur="' + x[0] + '" data-l4t-hal="' + x[2] + '"><b>' + esc(nama[x[0]]) + '</b><strong>' + nf(x[1]) + '</strong><small>pcs</small></button>';
    }).join('') + '</div>' + (O ? '' : '<p class="l4t-ket">' + esc(t('s_tanpaObd')) + '</p>');
    var ST = t('s_st'), kelasSt = { ok: 'ok', rakkosong: 'merah', tanpagerai: 'awas', tipis: 'info' };
    var kol = t('s_kolom'), SR = t('s_saring');
    var saring = '<div class="l4t-saring" role="group">' + ['semua', 'tipis', 'rakkosong', 'tanpagerai'].map(function (k) {
      var n = k === 'semua' ? baris.length : baris.filter(function (b) { return b.st.indexOf(k) >= 0; }).length;
      return '<button type="button" class="l4t-cipb' + (k === 'semua' ? ' on' : '') + '" data-l4t-saring="' + k + '">' + esc(SR[k]) + ' <small>' + nf(n) + '</small></button>';
    }).join('') + '</div>';
    var tabel = '<p class="l4t-ket">' + esc(t('s_tabelKet')) + '</p>' + (G ? '' : '<p class="l4t-ket">' + esc(t('s_tanpaGudang')) + '</p>') + saring +
      '<div class="l4t-gulir"><table class="l4t-tabel"><thead><tr><th>' + esc(kol[0]) + '</th><th>' + esc(kol[1]) + '</th><th class="ka">' + esc(kol[2]) + '</th><th class="ka">' + esc(kol[3]) + '</th><th class="ka">' + esc(kol[4]) + '</th><th>' + esc(kol[5]) + '</th></tr></thead><tbody>' +
      baris.map(function (b) {
        var lokasi = b.lok.length ? b.lok.map(function (l) { var ksg = !(Number(l.isi) > 0) && l.peran === 'PICK'; return '<span class="l4t-lok' + (ksg ? ' kosong' : '') + '" data-l4t-lok="' + esc(l.kode) + '" data-isi="' + (Number(l.isi) || 0) + '">' + esc(l.kode) + ' <b>' + nf(l.isi) + '</b></span>'; }).join('') : '<small class="l4t-redup">' + esc(t('s_tanpaLok')) + '</small>';
        var pHo = b.total > 0 ? b.ho / b.total * 100 : 0;
        return '<tr data-l4t-sku="' + esc(b.p.s || b.p.b) + '" data-l4t-st="' + esc(b.st.join(' ')) + '"><td class="nm" title="' + esc(b.p.n) + '">' + esc(namaPendek(b.p.n)) + '</td><td class="lk">' + lokasi + '</td>' +
          '<td class="ka" data-k="ho">' + nf(b.ho) + '</td><td class="ka" data-k="gerai">' + nf(b.gerai) + '</td><td class="ka"><span data-k="total">' + nf(b.total) + '</span><span class="l4t-komp"><i style="width:' + pHo.toFixed(1) + '%"></i></span></td>' +
          '<td>' + b.st.map(function (k) { return '<span class="l4t-cip ' + kelasSt[k] + '" data-l4t-status="' + k + '">' + esc(ST[k]) + '</span>'; }).join(' ') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var daftarItem = function (arr, isi) { return arr.length ? '<ul class="l4t-daftar">' + arr.join('') + '</ul>' : '<p class="l4t-ket">' + esc(t('s_pKosong')) + '</p>'; };
    var tipis = baris.filter(function (b) { return b.st.indexOf('tipis') >= 0; }).map(function (b) { return '<li data-l4t-item="' + esc(b.p.s || b.p.b) + '"><b>' + esc(namaPendek(b.p.n)) + '</b><span>' + nf(b.ho) + ' pcs</span></li>'; });
    var rak = []; baris.forEach(function (b) { if (b.st.indexOf('rakkosong') >= 0) b.pickKosong.forEach(function (l) { rak.push('<li data-l4t-item="' + esc((b.p.s || b.p.b) + '@' + l.kode) + '"><b>' + esc(namaPendek(b.p.n)) + '</b><span>' + esc(l.kode) + '</span></li>'); }); });
    var hoSaja = baris.filter(function (b) { return b.st.indexOf('tanpagerai') >= 0; }).map(function (b) { return '<li data-l4t-item="' + esc(b.p.s || b.p.b) + '"><b>' + esc(namaPendek(b.p.n)) + '</b><span>' + nf(b.ho) + ' pcs HO</span></li>'; });
    var perhatian = '<div class="l4t-tiga">' +
      '<div data-l4t-perhatian="tipis"><h3>' + esc(t('s_pTipis')(TIPIS)) + '</h3><p class="l4t-ket">' + esc(t('s_pTipisKet')) + '</p>' + daftarItem(tipis) + '</div>' +
      '<div data-l4t-perhatian="rakkosong"><h3>' + esc(t('s_pRak')) + '</h3><p class="l4t-ket">' + esc(t('s_pRakKet')) + '</p>' + daftarItem(rak) + (rak.length ? '<button type="button" class="l4t-tombol dua" data-l4t-hal="obdIsiUlang">' + esc(t('s_bukaRak')) + '</button>' : '') + '</div>' +
      '<div data-l4t-perhatian="tanpagerai"><h3>' + esc(t('s_pGerai')) + '</h3><p class="l4t-ket">' + esc(t('s_pGeraiKet')) + '</p>' + daftarItem(hoSaja) + '</div></div>';
    sek.innerHTML = kepalaHal(t('s_alis')(baris.length), t('s_judul'), '') + kpi + kartu(t('s_alur'), 0, alur) + kartu(t('s_tabel'), 3, tabel) + kartu(t('s_perhatian'), 4, perhatian);
  }
  function saringRingkas(isi, k) {
    var sek = isi.querySelector(':scope > .l4t[data-l4t-hal-ini=l4stok]'); if (!sek) return;
    Array.prototype.forEach.call(sek.querySelectorAll('[data-l4t-saring]'), function (b) { b.classList.toggle('on', b.getAttribute('data-l4t-saring') === k); });
    Array.prototype.forEach.call(sek.querySelectorAll('tr[data-l4t-sku]'), function (tr) {
      var st = (tr.getAttribute('data-l4t-st') || '').split(' ');
      if (k === 'semua' || st.indexOf(k) >= 0) tr.removeAttribute('data-l4t-sembunyi'); else tr.setAttribute('data-l4t-sembunyi', '');
    });
  }
  function gambarRak(sek) {
    var G = GUD.data;
    if (!G) { sek.innerHTML = kepalaHal(t('r_alis'), t('r_judul'), '') + '<p class="l4t-ket">' + esc(t('r_tidakAda')) + '</p>'; return; }
    var lok = G.lokasi.filter(Boolean), grup = [], peta = {};
    var over = function (l) { return l.peran === 'OVERFLOW' || l.zona === 'OVERFLOW'; };
    lok.forEach(function (l) { var u = over(l) ? 'X' : String(l.unit || '?'); if (!peta[u]) { peta[u] = []; grup.push(u); } peta[u].push(l); });
    grup.sort(function (a, b) { return (a === 'X' ? 1 : 0) - (b === 'X' ? 1 : 0); });
    var terisi = lok.filter(function (l) { return Number(l.isi) > 0; }).length, pcs = lok.reduce(function (a, l) { return a + (Number(l.isi) || 0); }, 0);
    var kosong = lok.filter(function (l) { return !over(l) && !(Number(l.isi) > 0); }).length;
    var rendah = lok.filter(function (l) { return !over(l) && Number(l.isi) > 0 && l.peran === 'PICK' && (l.rendah || Number(l.persen) < 0.5); }).length;
    var kpi = '<div class="l4t-empat">' +
      '<div class="l4t-kpi" data-l4t-angka="terisi"><span>' + esc(t('r_terisi')) + '</span><strong>' + nf(terisi) + ' / ' + nf(lok.length) + '</strong></div>' +
      '<div class="l4t-kpi" data-l4t-angka="pcs"><span>' + esc(t('r_pcs')) + '</span><strong>' + nf(pcs) + '</strong></div>' +
      '<div class="l4t-kpi' + (kosong ? ' awas' : '') + '" data-l4t-angka="kosong"><span>' + esc(t('r_kosong')) + '</span><strong>' + nf(kosong) + '</strong><small>' + esc(t('r_kosongKet')) + '</small></div>' +
      '<div class="l4t-kpi" data-l4t-angka="rendah"><span>' + esc(t('r_rendah')) + '</span><strong>' + nf(rendah) + '</strong></div></div>';
    var isi = '<p class="l4t-ket">' + esc(t('r_legenda')) + '</p>' + grup.map(function (u) {
      return '<div class="l4t-unit" data-l4t-unit="' + esc(u) + '"><h3>' + esc(t('r_unit')(u)) + '</h3><div class="l4t-slotgrid">' + peta[u].map(function (l) {
        var q = Number(l.isi) || 0, k = Number(l.kap) || 0, ps = k > 0 ? Math.min(q / k, 1) : 0;
        var kls = q <= 0 && !over(l) ? ' kosong' : (!over(l) && l.peran === 'PICK' && (l.rendah || Number(l.persen) < 0.5) ? ' rendah' : (over(l) ? ' over' : ''));
        return '<div class="l4t-slot' + kls + '" data-l4t-slot="' + esc(l.kode) + '"><div class="atas"><b>' + esc(l.kode) + '</b><small>' + esc(l.peran === 'PICK' ? 'pick' : String(l.peran || '').toLowerCase()) + '</small></div>' +
          '<span class="nm">' + esc(l.sku || t('r_tanpa')) + '</span><div class="l4t-batang"><i class="terang" style="width:' + (ps * 100).toFixed(1) + '%"></i></div><small>' + nf(q) + (k ? ' / ' + nf(k) : '') + ' pcs</small></div>';
      }).join('') + '</div></div>';
    }).join('');
    sek.innerHTML = kepalaHal(t('r_alis'), t('r_judul'), '<button type="button" class="l4t-tombol dua" data-l4t-hal="obdIsiUlang">' + esc(t('s_bukaRak')) + '</button>') + kpi + kartu(t('r_judul'), 1, isi);
  }
  function gambarRingkasKirim(sek) {
    var O = OBD.data, hariIni = (D.data && D.data.hariIni) || new Date().toISOString().slice(0, 10);
    if (!O) { sek.innerHTML = kepalaHal(t('o_alis'), t('o_judul'), '') + '<p class="l4t-ket">' + esc(t('o_tidakAda')) + '</p>'; return; }
    var semua = O.daftar || [];
    var kolom = function (kode, judul, ket, daftar, nama, halBuka, labelBuka) {
      var jml = {}; TAHAP.forEach(function (k) { jml[k] = 0; });
      daftar.forEach(function (d) { if (d.tahap === 'DELIVERED') { if (hari(d.tanggal, hariIni) <= 7) jml.DELIVERED++; } else if (jml[d.tahap] != null) jml[d.tahap]++; });
      var urut = daftar.slice().sort(function (p, q) {
        var a = p.tahap === 'DELIVERED' ? 1 : 0, b = q.tahap === 'DELIVERED' ? 1 : 0;
        if (a !== b) return a - b;
        return String(q.tanggal || '') < String(p.tanggal || '') ? -1 : String(q.tanggal || '') > String(p.tanggal || '') ? 1 : 0;
      }).slice(0, 6);
      var h = '<p class="l4t-ket">' + esc(ket) + '</p><div class="l4t-lapor">' + TAHAP.map(function (k) { return '<div data-l4t-tahap="' + k + '"><b>' + esc(nama[k]) + '</b><strong>' + nf(jml[k]) + '</strong></div>'; }).join('') + '</div>';
      h += '<h3 class="l4t-sub">' + esc(t('o_terbaru')) + '</h3>' + (urut.length ? '<ul class="l4t-daftar">' + urut.map(function (d) {
        return '<li><button type="button" class="l4t-tautan" data-l4t-ref="' + esc(d.ref) + '" data-l4t-hal="' + halBuka + '">' + esc(d.ref) + '</button><span>' + esc(kode === 'shopee' ? tglPendek(d.tanggal) : (d.tujuan || '') + ' · ' + tglPendek(d.tanggal)) + '</span><span class="l4t-cip' + (d.tahap === 'DELIVERED' ? ' ok' : ' info') + '">' + esc(d.tahap === 'DELIVERED' ? t('o_diterima') : (nama[d.tahap] || d.tahap || '')) + '</span></li>';
      }).join('') + '</ul>' : '<p class="l4t-ket">' + esc(t('o_kosong')) + '</p>');
      h += '<div class="l4t-bawah"><button type="button" class="l4t-tombol dua" data-l4t-hal="' + halBuka + '">' + esc(labelBuka) + '</button>' + (kode === 'offline' ? '<button type="button" class="l4t-tombol dua" data-l4t-hal="kemas">' + esc(t('o_bukaSj')) + '</button>' : '') + '</div>';
      return '<div class="l4t-jalur" data-l4t-kolom="' + kode + '">' + kartu(judul, kode === 'offline' ? 2 : 5, h) + '</div>';
    };
    var off = semua.filter(function (d) { return d && d.lajur !== 'online'; }), shp = semua.filter(function (d) { return d && d.lajur === 'online'; });
    sek.innerHTML = kepalaHal(t('o_alis'), t('o_judul'), '') + '<div class="l4t-dua">' + kolom('offline', t('o_offline'), t('o_offlineKet'), off, t('o_tahapOff'), 'outbound', t('o_bukaOff')) + kolom('shopee', t('o_shopee'), t('o_shopeeKet'), shp, t('o_tahapShp'), 'obdShopee', t('o_bukaShp')) + '</div>';
  }

  /* ---------- Summary: Goods in & out (17 Okt 2026) ----------
     Mockup full Summary disetujui Ferdy ("good, gas"). Tiga kartu menggantikan kartu server
     "Last 3 inbound / Last 3 outbound". Sumbernya sama dengan halaman lain:
      - inbound: baris buku besar PRINCIPAL -> HO, dikelompokkan per tanggal tiba (buku besar
        tidak membawa kode batch); stok awal OPENING hanya dipakai kalau belum ada PRINCIPAL;
      - put away: stok HO per SKU dibanding isi lokasinya di peta gudang (wmsGudang). Kekurangan
        dibebankan ke kedatangan SKU itu yang paling baru dulu;
      - hitung per batch belum dicatat sistem, jadi langkah Counted selalu "belum dicatat";
      - outbound offline dan Shopee: obdDaftar (sama dengan Shipments overview), SJ batal tidak ikut;
      - transfer stok ke Shopee: baris buku besar HO -> SHP, sudah diterima begitu tercatat. */
  var POSISI_TAHAP = { PICKING: 0, PACKING: 1, STAGING: 2, TRANSIT: 2, DELIVERED: 4 };
  function langkahKeluar(tahap) { var p = POSISI_TAHAP[tahap]; if (p == null) p = 0; return [0, 1, 2, 3].map(function (i) { return i < p ? 'ok' : i === p ? 'on' : ''; }); }
  function urutTglTurun(a, b) { var p = String(a.tanggal || ''), q = String(b.tanggal || ''); return q < p ? -1 : q > p ? 1 : 0; }
  function hitungGio(x, H, G, O) {
    var L = H.L, iHO = H.iHO, bulan = String(H.hariIni).slice(0, 7), baris = (x && x.baris) || [];
    var idx = function (re) { return L.map(function (l, i) { return re.test(String((l && l.k) || '')) ? i : -1; }).filter(function (i) { return i >= 0; }); };
    var iPrc = idx(/^PRINCIPAL/i), iAwal = idx(/^OPENING/i), iShp = idx(/^SHP/i);
    var ambil = function (asal) { return baris.filter(function (b) { return b[4] === iHO && asal.indexOf(b[3]) >= 0 && (Number(b[2]) || 0) > 0; }); };
    var dariPrc = ambil(iPrc), awal = !dariPrc.length, rows = awal ? ambil(iAwal) : dariPrc;
    var grup = {};
    rows.forEach(function (b) { var tg = String(b[0] || '').slice(0, 10), g = grup[tg] = grup[tg] || { tanggal: tg, pcs: 0, sku: {} }; g.pcs += Number(b[2]) || 0; g.sku[b[1]] = (g.sku[b[1]] || 0) + (Number(b[2]) || 0); });
    var batch = Object.keys(grup).map(function (k) { return grup[k]; }).sort(urutTglTurun);
    var masuk = { awal: awal, peta: !!G, belum: null, batchBulan: 0, pcsBulan: 0, baris: [] };
    batch.forEach(function (g) { if (!awal && g.tanggal.slice(0, 7) === bulan) { masuk.batchBulan++; masuk.pcsBulan += g.pcs; } });
    var kurang = {};
    if (G) {
      var isi = {};
      (G.lokasi || []).forEach(function (l) { if (l && String(l.barcode || '') !== '') isi[String(l.barcode)] = (isi[String(l.barcode)] || 0) + (Number(l.isi) || 0); });
      masuk.belum = 0;
      H.P.forEach(function (p, pi) { var ho = iHO >= 0 ? stokDi(H, iHO, pi) : 0; var k = Math.max(0, ho - (isi[String(p.b)] || 0)); if (ho > 0 && k > 0) { kurang[pi] = k; masuk.belum += k; } });
    }
    batch.forEach(function (g, i) {
      var belum = 0;
      if (G) Object.keys(g.sku).forEach(function (pi) { var a = Math.min(kurang[pi] || 0, g.sku[pi]); if (a > 0) { belum += a; kurang[pi] -= a; } });
      if (i < 3) masuk.baris.push({ ref: g.tanggal, tanggal: g.tanggal, pcs: g.pcs, nSku: Object.keys(g.sku).length, belum: belum, langkah: ['ok', 'na', G ? (belum > 0 ? 'on' : 'ok') : 'na'] });
    });
    var off = null, on = null;
    if (O) {
      var semua = (O.daftar || []).filter(function (d) { return d && !d.sjBatal; });
      var dOff = semua.filter(function (d) { return d.lajur !== 'online'; }), dOn = semua.filter(function (d) { return d.lajur === 'online'; });
      var pcsBulan = function (a) { var n = 0; a.forEach(function (d) { if (String(d.tanggal || '').slice(0, 7) === bulan) n += Number(d.pcsPesan) || 0; }); return n; };
      var susun = function (a) { var buka = a.filter(function (d) { return d.tahap !== 'DELIVERED'; }).sort(urutTglTurun), tutup = a.filter(function (d) { return d.tahap === 'DELIVERED'; }).sort(urutTglTurun); return buka.concat(tutup).slice(0, 3); };
      var namaTujuan = function (k) { for (var i = 0; i < L.length; i++) if (L[i] && L[i].k === k) return L[i].n || k; return k || ''; };
      off = { buka: dOff.filter(function (d) { return d.tahap !== 'DELIVERED'; }).length, pcs: pcsBulan(dOff), jalan: dOff.filter(function (d) { return d.tahap === 'TRANSIT'; }).length,
        baris: susun(dOff).map(function (d) { return { ref: d.ref, tanggal: d.tanggal, pcs: Number(d.pcsPesan) || 0, ket: namaTujuan(d.tujuan), hal: 'outbound', langkah: langkahKeluar(d.tahap) }; }) };
      var trf = {};
      if (iShp.length) baris.forEach(function (b) { if (b[3] === iHO && iShp.indexOf(b[4]) >= 0 && (Number(b[2]) || 0) > 0) { var tg = String(b[0] || '').slice(0, 10); trf[tg] = (trf[tg] || 0) + (Number(b[2]) || 0); } });
      var calon = dOn.map(function (d) { return { ref: d.ref, tanggal: d.tanggal, pcs: Number(d.pcsPesan) || 0, tahap: d.tahap, hal: 'obdShopee' }; })
        .concat(Object.keys(trf).map(function (tg) { return { ref: 'trf@' + tg, tanggal: tg, pcs: trf[tg], tahap: 'DELIVERED', trf: true }; }));
      var stokShp = null;
      if (iShp.length) { stokShp = 0; iShp.forEach(function (li) { H.P.forEach(function (p, pi) { var q = stokDi(H, li, pi); if (q > 0) stokShp += q; }); }); }
      on = { kirim: dOn.filter(function (d) { return TAHAP_KELUAR.indexOf(d.tahap) >= 0; }).length, pcs: pcsBulan(dOn), shp: stokShp,
        baris: susun(calon).map(function (d) { return { ref: d.ref, tanggal: d.tanggal, pcs: d.pcs, trf: !!d.trf, hal: d.hal || '', langkah: langkahKeluar(d.tahap) }; }) };
    }
    return { masuk: masuk, off: off, on: on };
  }
  function gambarGio(sek) {
    var x = D.data, H = D.H || (x ? (D.H = hitung(x)) : null);
    var ubin = function (a) { return '<div class="l4t-gubin">' + a.map(function (u) { return '<div data-l4t-angka="' + u[0] + '"' + (u[3] ? ' class="awas"' : '') + '><strong>' + (u[1] == null ? '–' : nf(u[1])) + '</strong><small>' + esc(u[2]) + '</small></div>'; }).join('') + '</div>'; };
    var langkah = function (kode, label, st) { return '<ol class="l4t-lk">' + kode.map(function (k, i) { return '<li data-l4t-langkah="' + k + '"' + (st[i] ? ' data-st="' + st[i] + '" class="' + st[i] + '"' : '') + '><i></i><span>' + esc(label[i]) + '</span></li>'; }).join('') + '</ol>'; };
    var baris = function (r, judul, ket, kode, label) {
      return '<li class="l4t-grow" data-l4t-baris="' + esc(r.ref) + '" data-pcs="' + r.pcs + '"' + (r.belum > 0 ? ' data-belum="' + r.belum + '"' : '') + '><div class="a">' + judul + '<span class="pcs">' + nf(r.pcs) + ' pcs</span></div><small>' + ket + '</small>' + langkah(kode, label, r.langkah) + '</li>';
    };
    var tombol = function (hal, label) { return '<div class="l4t-bawah"><button type="button" class="l4t-tombol dua" data-l4t-hal="' + hal + '">' + esc(label) + '</button></div>'; };
    var kartuGio = function (kode, judul, i, kanal, isi) { return '<div class="l4t-gio-kartu" data-l4t-kartu="' + kode + '">' + kartu(judul, i, isi, '<span class="l4t-kanal">' + esc(kanal) + '</span>') + '</div>'; };
    var G = GUD.data, O = OBD.data, R = H ? hitungGio(x, H, G, O) : null;
    var LM = ['tiba', 'hitung', 'putaway'], LK = ['picking', 'packing', 'kirim', 'terima'];
    var isiMasuk;
    if (!R) isiMasuk = '<p class="l4t-ket">' + esc(t('g2_tanpaBuku')) + '</p>';
    else {
      var m = R.masuk;
      isiMasuk = ubin([['batch', m.awal ? null : m.batchBulan, t('g2_uBatch')], ['pcs', m.awal ? null : m.pcsBulan, t('g2_uPcsMasuk')], ['belum', m.belum, t('g2_uBelum'), m.belum > 0]]) +
        (m.baris.length ? '<ul class="l4t-glist">' + m.baris.map(function (r) {
          return baris(r, '<b>' + esc(m.awal ? t('g2_awal') : t('g2_tiba')(tglPendek(r.tanggal), r.nSku)) + '</b>', (m.awal ? esc(tglPendek(r.tanggal)) + ' · ' + r.nSku + ' SKU' : '') + (r.belum > 0 ? (m.awal ? ' · ' : '') + '<em>' + esc(t('g2_belum')(nf(r.belum))) + '</em>' : ''), LM, t('g2_lMasuk'));
        }).join('') + '</ul>' : '<p class="l4t-ket">' + esc(t('g2_kosongMasuk')) + '</p>') +
        '<p class="l4t-ket" data-l4t-catatan>' + esc(m.peta ? t('g2_catatan') : t('g2_catatanTanpaPeta')) + '</p>' + tombol('gerakstok', t('g2_bukaMasuk'));
    }
    var tidakAda = '<p class="l4t-ket">' + esc(t('o_tidakAda')) + '</p>';
    var isiOff = !R || !R.off ? tidakAda : ubin([['buka', R.off.buka, t('g2_uBuka')], ['pcs', R.off.pcs, t('g2_uPcsOff')], ['jalan', R.off.jalan, t('g2_uJalan')]]) +
      (R.off.baris.length ? '<ul class="l4t-glist">' + R.off.baris.map(function (r) {
        return baris(r, '<button type="button" class="l4t-tautan" data-l4t-hal="outbound">' + esc(r.ref) + '</button>', esc((r.ket ? r.ket + ' · ' : '') + tglPendek(r.tanggal)), LK, t('g2_lKeluar'));
      }).join('') + '</ul>' : '<p class="l4t-ket">' + esc(t('o_kosong')) + '</p>') + tombol('outbound', t('g2_bukaOff'));
    var isiOn = !R || !R.on ? tidakAda : ubin([['kirim', R.on.kirim, t('g2_uKirim')], ['pcs', R.on.pcs, t('g2_uPcsOn')], ['shp', R.on.shp, t('g2_uShp')]]) +
      (R.on.baris.length ? '<ul class="l4t-glist">' + R.on.baris.map(function (r) {
        var judul = r.trf ? '<b>' + esc(t('g2_trf')) + '</b>' : '<button type="button" class="l4t-tautan" data-l4t-hal="obdShopee">' + esc(r.ref) + '</button>';
        return baris(r, judul, esc((r.trf ? '' : t('g2_pesanan') + ' · ') + tglPendek(r.tanggal)), LK, t('g2_lKeluar'));
      }).join('') + '</ul>' : '<p class="l4t-ket">' + esc(t('o_kosong')) + '</p>') + tombol('obdShopee', t('g2_bukaOn'));
    sek.innerHTML = '<div class="l4t-giokepala"><h2 class="l4t-gio">' + esc(t('g2_judul')) + '</h2><button type="button" class="l4t-tautan" data-l4t-hal="l4kirim">' + esc(t('g2_semua')) + '</button></div>' +
      '<div class="l4t-tiga">' + kartuGio('masuk', t('g2_masuk'), 0, t('g2_masukKanal'), isiMasuk) + kartuGio('offline', t('g2_keluar'), 2, t('g2_offKanal'), isiOff) + kartuGio('online', t('g2_keluar'), 1, t('g2_onKanal'), isiOn) + '</div>';
  }
  /* Kartu server "Last 3 inbound / outbound" disembunyikan dan bagian Goods in & out dipindah
     ke tempatnya (di bawah KPI, seperti mockup). Summary server digambar di shadow root dan
     isinya bisa datang belakangan (simpanan perangkat lalu angka server), jadi shadow root
     diamati. Dari judulnya naik ke pembungkus terluas yang tidak memuat judul kartu lain
     setingkat. Kalau tidak ketemu, tidak ada yang disembunyikan dan bagiannya tetap paling atas. */
  var RE_LAMA = /^(last\s*3\s*(inbound|outbound)|3\s*(inbound|outbound)\s*terakhir|(inbound|outbound)\s*terakhir)/i;
  function levelJudul(h) { var m = /^H([1-6])$/.exec(h.tagName); return m ? Number(m[1]) : Number(h.getAttribute('aria-level')) || 2; }
  function teksJudul(h) { return String(h.textContent || '').replace(/\s+/g, ' ').trim(); }
  function adaJudulLain(el, lv) { return Array.prototype.some.call(el.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]'), function (h) { return levelJudul(h) <= lv && !RE_LAMA.test(teksJudul(h)) && !h.closest('.l4t'); }); }
  function sembunyikanLama(fw, isi) {
    if (String(fw.HAL || '') !== 'ringkasan' || !isi.isConnected) return;
    var akar = [isi]; Array.prototype.forEach.call(isi.querySelectorAll('*'), function (el) { if (el.shadowRoot) akar.push(el.shadowRoot); });
    var tujuan = null, akarTujuan = null;
    akar.forEach(function (a) {
      if (a !== isi && !a.__l4tAmati) {
        a.__l4tAmati = true; var tunda = null;
        new fw.MutationObserver(function () { if (tunda) return; tunda = fw.setTimeout(function () { tunda = null; sembunyikanLama(fw, isi); }, 0); }).observe(a, { childList: true, subtree: true });
      }
      Array.prototype.forEach.call(a.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]'), function (h) {
        var s = teksJudul(h); if (s.length > 60 || !RE_LAMA.test(s) || h.closest('.l4t')) return;
        var lv = levelJudul(h), n = h;
        while (n.parentNode && n.parentNode !== a && n.parentNode !== isi && n.parentNode.nodeType === 1 && !adaJudulLain(n.parentNode, lv)) n = n.parentNode;
        if (n.getAttribute('data-l4t-lama') !== '1') { n.setAttribute('data-l4t-lama', '1'); n.style.setProperty('display', 'none', 'important'); }
        if (!tujuan) { tujuan = n; akarTujuan = a; }
      });
    });
    var sek = fw.__l4tGio;
    if (!sek || !tujuan || !tujuan.parentNode) return;
    if (akarTujuan !== isi && !akarTujuan.querySelector('style[data-l4t-gaya]')) {
      var st = fw.document.createElement('style'); st.setAttribute('data-l4t-gaya', ''); st.textContent = GAYA; akarTujuan.appendChild(st);
    }
    if (sek.parentNode !== tujuan.parentNode || sek.nextElementSibling !== tujuan) tujuan.parentNode.insertBefore(sek, tujuan);
  }
  function tataSummary(fw, isi) {
    var sek = fw.__l4tGio;
    if (!sek || !sek.isConnected) {
      sek = fw.document.createElement('div'); sek.className = 'l4t'; sek.setAttribute('data-l4t-hal-ini', 'ringkasan'); sek.setAttribute('data-smr-diam', '');
      sek.innerHTML = '<p class="l4t-ket">' + esc(t('muat')) + '</p>';
      fw.__l4tGio = sek;
      isi.insertBefore(sek, isi.firstChild);
      /* klik ditangani di bagiannya sendiri: di dalam shadow root Summary, klik tidak sampai ke #isi
         dengan target aslinya, dan kartu server di sekitarnya punya klik "pintu" sendiri */
      sek.addEventListener('click', function (e) {
        var x = e.target.closest ? e.target.closest('[data-l4t-hal]') : null; if (!x) return;
        e.preventDefault(); e.stopPropagation();
        fw.HAL = x.getAttribute('data-l4t-hal'); try { fw.gambar(); } catch (er) {} try { fw.scrollTo(0, 0); } catch (er) {}
      });
      var gambarIni = function () { if (fw.__l4tGio !== sek || fw.HAL !== 'ringkasan') return; try { gambarGio(sek); } catch (e) { sek.innerHTML = '<p class="l4t-ket">' + esc(t('gagal')) + '</p>'; if (W.console) W.console.warn('tata ringkasan', e); } };
      var sisi = [muatGudang, muatObd].map(function (f) { return f().then(function () { return 1; }, function () { return 0; }); });
      muat().catch(function () { return null; }).then(function () { return Promise.all(sisi); }).then(gambarIni);
    }
    var jalan = function () { try { sembunyikanLama(fw, isi); } catch (e) {} };
    jalan(); [300, 1000, 2500, 6000].forEach(function (ms) { fw.setTimeout(jalan, ms); });
  }

  /* ---------- pemasangan ---------- */
  var GANTI = { stokgerai: gambarGerai, mitra2: gambarKeuangan, sehat: gambarKualitas, l4stok: gambarRingkasStok, l4rak: gambarRak, l4kirim: gambarRingkasKirim };
  var TAMBAH_MUAT = { l4stok: [muatGudang, muatObd], l4rak: [muatGudang], l4kirim: [muatObd] };
  var TAMBAH = { ringkasan: tataSummary, dokumen: tataDokumen, bacapo: tataBacaPo, outbound: tataGudang, rencana: tataKiriman, kemas: tataSuratJalan };
  function gambarGanti(fw, isi, hal) {
    var sek = fw.document.createElement('div');
    sek.className = 'l4t'; sek.setAttribute('data-l4t-hal-ini', hal);
    sek.innerHTML = '<p class="l4t-ket">' + esc(t('muat')) + '</p>';
    isi.insertBefore(sek, isi.firstChild);
    isi.classList.add('l4t-ganti'); isi.classList.remove('l4t-lihatlama');
    var isiUlang = function () { if (!sek.isConnected || fw.HAL !== hal) return; try { GANTI[hal](sek, fw); } catch (e) { sek.innerHTML = '<p class="l4t-ket">' + esc(t('gagal')) + '</p>'; if (W.console) W.console.warn('tata ' + hal, e); } };
    if (TAMBAH_MUAT[hal]) {
      /* halaman ringkasan: tampil dengan apa yang terbaca; sumber yang gagal disebut di halamannya */
      var sisi = TAMBAH_MUAT[hal].map(function (f) { return f().then(function () { return 1; }, function () { return 0; }); });
      var utama = hal === 'l4stok' ? muat() : muat().catch(function () { return null; });
      utama.then(function () { return Promise.all(sisi); }).then(isiUlang, function () { if (sek.isConnected) sek.innerHTML = '<p class="l4t-ket">' + esc(t('gagal')) + '</p>'; });
      return;
    }
    muat().then(function () { isiUlang(); if (hal === 'mitra2') muatPiutang().then(isiUlang, isiUlang); }, function () { if (sek.isConnected) sek.innerHTML = '<p class="l4t-ket">' + esc(t('gagal')) + '</p>'; });
  }
  function terapkan(fw) {
    var d = fw.document, isi = d.getElementById('isi'); if (!isi) return;
    try { pasangMenuBaru(fw); } catch (e) { if (W.console) W.console.warn('tata menu', e); }
    var hal = String(fw.HAL || '');
    var ks = d.getElementById('kotakSaring'); if (ks && /^l4/.test(hal)) ks.style.display = 'none';
    var lama = isi.querySelector(':scope > .l4t[data-l4t-hal-ini]');
    if (lama && lama.getAttribute('data-l4t-hal-ini') !== hal) {
      Array.prototype.forEach.call(isi.querySelectorAll(':scope > .l4t'), function (n) { n.parentNode.removeChild(n); });
      lama = null;
    }
    if (!GANTI[hal]) isi.classList.remove('l4t-ganti', 'l4t-lihatlama');
    if (hal !== 'bacapo') isi.classList.remove('l4t-po');
    if (GANTI[hal]) { if (!lama) gambarGanti(fw, isi, hal); else if (!isi.classList.contains('l4t-ganti')) isi.classList.add('l4t-ganti'); return; }
    if (TAMBAH[hal]) TAMBAH[hal](fw, isi);
  }
  function pasang(fw) {
    if (!fw || fw.__l4Tata) return; fw.__l4Tata = true;
    var d = fw.document;
    if (!d.getElementById('l4TataGaya')) { var g = d.createElement('style'); g.id = 'l4TataGaya'; g.textContent = GAYA; d.head.appendChild(g); }
    var isi = d.getElementById('isi'); if (!isi) return;
    var jadwal = null;
    var lihat = function () { if (jadwal) return; jadwal = fw.setTimeout(function () { jadwal = null; try { terapkan(fw); } catch (e) { if (W.console) W.console.warn('tata', e); } }, 0); };
    new fw.MutationObserver(lihat).observe(isi, { childList: true, attributes: true, attributeFilter: ['class'] });
    /* poHasil muncul lewat gambar ulang seluruh #isi (gambarBacaPo), jadi childList cukup */
    isi.addEventListener('click', function (e) {
      var x = e.target.closest ? e.target.closest('[data-l4t],[data-l4t-hal],[data-l4t-semua],[data-l4t-saring]') : null; if (!x) return;
      e.preventDefault(); e.stopPropagation();
      if (x.getAttribute('data-l4t') === 'lama') {
        var buka = !isi.classList.contains('l4t-lihatlama');
        isi.classList.toggle('l4t-lihatlama', buka);
        Array.prototype.forEach.call(isi.querySelectorAll('[data-l4t=lama]'), function (b) {
          if (!b.hasAttribute('data-label')) b.setAttribute('data-label', b.textContent);
          b.textContent = buka ? t('baru') : b.getAttribute('data-label');
        });
        return;
      }
      if (x.hasAttribute('data-l4t-saring')) { saringRingkas(isi, x.getAttribute('data-l4t-saring')); return; }
      if (x.hasAttribute('data-l4t-semua')) { A.semuaBaris = !A.semuaBaris; var sg = isi.querySelector(':scope > .l4t[data-l4t-hal-ini=stokgerai]'); if (sg && D.H) gambarGerai(sg); return; }
      var hal = x.getAttribute('data-l4t-hal');
      if (hal) { fw.HAL = hal; try { fw.gambar(); } catch (er) {} try { fw.scrollTo(0, 0); } catch (er) {} }
    });
    isi.addEventListener('change', function (e) {
      var s = e.target; if (!s || s.getAttribute('data-l4t-pilih') !== 'retailer') return;
      A.retailer = s.value || '';
      var sek = isi.querySelector(':scope > .l4t[data-l4t-hal-ini=stokgerai]'); if (sek && D.H) gambarGerai(sek);
    });
    terapkan(fw);
  }
  W.WmsTata = { pasang: pasang, _hitung: hitung, _terapkan: terapkan, _rpPendek: rpPendek, _batas: BATAS };
})();
