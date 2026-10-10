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
    var v = (Math.round(n / 1e4) / 100).toFixed(2);
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
      g_matriks: 'Stock on each shelf', g_matriksKet: 'Empty cell = SKU not on that shelf · orange = on shelf, never sold there', g_total: 'Total', g_kosong: 'No stock on any store shelf.',
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
      w_alis: 'Warehouse ops · USB scanner or phone camera', w_judul: 'Warehouse ops'
    },
    id: {
      lama: 'Tampilan lama', baru: 'Kembali ke tampilan baru', muat: 'Membaca data…', gagal: 'Data belum bisa dibaca sekarang. Cek sinyal lalu muat ulang halaman.',
      g_alis: function (n, p) { return 'Persediaan · ' + n + ' gerai · ' + p + ' pcs di rak'; }, g_judul: 'Gerai offline', g_semua: 'Semua retailer',
      g_matriks: 'Stok di tiap rak', g_matriksKet: 'Sel kosong = SKU tidak ada di rak itu · oranye = ada di rak, belum pernah laku di gerai itu', g_total: 'Total', g_kosong: 'Tidak ada stok di rak gerai mana pun.',
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
      w_alis: 'Operasi gudang · scanner USB atau kamera HP', w_judul: 'Operasi gudang'
    }
  };
  function t(k) { var d = TEKS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TEKS.en[k]; }
  var RETAILER = { TGI: 'Toys Kingdom', KIY: 'Kinokuniya', MAA: 'MAA', GMT: 'Gamotion' };
  function namaRetailer(r) { return RETAILER[r] || r || '?'; }
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
    '.l4t-tabel th{font-size:13px;font-weight:800;color:var(--l4-mut);text-align:left;padding:8px 10px;border-bottom:1.5px solid var(--l4-garis);white-space:nowrap}',
    '.l4t-tabel td{padding:9px 10px;border-bottom:1px solid var(--l4-garis);white-space:nowrap}',
    '.l4t-tabel .ka{text-align:right}.l4t-tabel .te{text-align:center}',
    '.l4t-tabel td.nm{font-weight:800;white-space:normal;min-width:150px}',
    '.l4t-sel{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:32px;padding:0 8px;border-radius:12px;background:var(--l4-lembut);font-weight:800}',
    '.l4t-sel.oranye{background:var(--l4-peach);color:var(--l4-aksenTeks);box-shadow:inset 0 0 0 1.5px var(--l4-aksen)}',
    '.l4t-daftar{display:flex;flex-direction:column;gap:8px}',
    '.l4t-baris{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;border-radius:16px;background:var(--l4-lembut);font-size:15px}',
    '.l4t-baris b{font-weight:800}.l4t-baris small{color:var(--l4-mut);font-size:13px}',
    '.l4t-aksen{color:var(--l4-aksenTeks);font-weight:900;white-space:nowrap}',
    '.l4t-batang{height:10px;border-radius:999px;background:var(--l4-garis);overflow:hidden;display:flex;margin:6px 0 2px}',
    '.l4t-batang i{display:block;height:100%}.l4t-batang .gelap{background:var(--l4-ink);opacity:.55}.l4t-batang .terang{background:var(--l4-aksen)}',
    '.l4t-ret{display:flex;flex-direction:column;gap:2px;margin-bottom:12px}',
    '.l4t-ret .atas{display:flex;justify-content:space-between;gap:10px;font-weight:800}',
    '.l4t-ret small{font-size:12.5px;color:var(--l4-mut)}',
    '.l4t-kpi{display:flex;flex-direction:column;gap:6px;padding:18px 20px;border-radius:22px;background:var(--l4-kartu);border:1.5px solid var(--l4-garis);min-width:0}',
    '.l4t-kpi span{font-size:13.5px;font-weight:800;color:var(--l4-mut)}',
    '.l4t-kpi b{font-family:"Baloo 2",Nunito,sans-serif;font-size:32px;line-height:1.05;color:var(--l4-ink);overflow-wrap:anywhere}',
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
    '.l4t-lapor b{font-size:16px}.l4t-lapor strong{font-family:"Baloo 2",Nunito,sans-serif;font-size:26px;line-height:1.1}.l4t-lapor small{color:var(--l4-mut);font-size:13.5px}',
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
    '@media (max-width:720px){.l4t-dua,.l4t-tugas,.l4t-langkah{grid-template-columns:1fr}.l4t-hal h1{font-size:32px}.l4t-kartu{padding:16px 14px 18px;border-radius:22px}.l4t-kpi b{font-size:26px}}',
    '@media (max-width:460px){.l4t-empat{grid-template-columns:1fr}}'
  ].join('\n');

  /* ---------- P9 Gerai offline ---------- */
  var A = { retailer: '' };
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
      baris.map(function (b) {
        return '<tr data-l4t-sku="' + esc(b.p.s || b.p.b) + '"><td class="nm">' + esc(b.p.n) + '</td>' + b.sel.map(function (q, j) {
          var li = gerai[j], belum = q > 0 && !H.laku[li + '|' + b.pi];
          return '<td class="te" data-l4t-gerai="' + esc(L[li].k) + '">' + (q > 0 ? '<span class="l4t-sel' + (belum ? ' oranye' : '') + '">' + nf(q) + '</span>' : '') + '</td>';
        }).join('') + '<td class="ka"><b>' + nf(b.total) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>';
    h += kartu(t('g_matriks'), 2, mat, esc(t('g_matriksKet')));
    var diam = [];
    gerai.forEach(function (li) { P.forEach(function (p, pi) {
      var q = stokDi(H, li, pi), tb = H.tiba[li + '|' + pi];
      if (q > 0 && tb && !H.laku[li + '|' + pi]) { var d = hari(tb, H.hariIni); if (d > 30) diam.push({ p: p, li: li, d: d }); }
    }); });
    diam.sort(function (a, b) { return b.d - a.d || (a.p.n < b.p.n ? -1 : 1); });
    var kiri = kartu(t('g_diam'), 0, '<p class="l4t-ket">' + esc(t('g_diamKet')) + '</p>' + (diam.length ? '<div class="l4t-daftar">' + diam.slice(0, 8).map(function (x) {
      return '<div class="l4t-baris" data-l4t-diam="' + esc(x.p.s + '@' + L[x.li].k) + '"><span><b>' + esc(x.p.n) + '</b> <small>· ' + esc(pendekGerai(L[x.li])) + '</small></span><span class="l4t-aksen">' + nf(x.d) + ' ' + esc(t('hari')) + '</span></div>';
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
      return '<div class="l4t-baris" data-l4t-modal="' + esc(k) + '" data-persen="' + (semua > 0 ? Math.round(x3.nilai / semua * 100) : 0) + '" data-rata="' + rata + '"><span><b>' + esc(k === 'HO' ? t('k_gudang') : t('k_rak')(namaRetailer(k))) + '</b> <small>· ' + rpPendek(x3.nilai) + '</small></span><span>' + (semua > 0 ? persen(x3.nilai / semua) : '0%') + ' <span class="l4t-cip ' + (rata > 45 ? 'awas' : 'info') + '">' + esc(t('k_rata')(nf(rata))) + '</span></span></div>';
    }).join('') + '</div>');
    h += '<div class="l4t-tujuhlima">' + kiri + '<div class="l4t">' + komisi + modal + '</div></div>';
    sek.innerHTML = h;
  }

  /* ---------- P14 Kualitas data ---------- */
  function gambarKualitas(sek) {
    var x = D.data, sehat = x.sehat || {}, temuan = sehat.temuan || [], pem = (x.pemicu && x.pemicu.daftar) || [];
    var telatMitra = ((x.mitraDiam && x.mitraDiam.mitra) || []).filter(function (m) { return m.telat; });
    var berat = temuan.filter(function (z) { return z.bobot === 'berat'; }).length + telatMitra.length;
    var ringan = temuan.length - temuan.filter(function (z) { return z.bobot === 'berat'; }).length;
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
      .concat(temuan.map(function (z) { return { berat: z.bobot === 'berat', judul: z.judul + (z.jml ? ' (' + nf(z.jml) + ')' : ''), ket: (z.ket || '') + (z.contoh && z.contoh.length ? ' ' + z.contoh.slice(0, 3).join(', ') + (z.contoh.length > 3 ? ', …' : '') : ''), aksi: 'lama', label: t('q_lihat') }; }));
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
  }

  /* ---------- pemasangan ---------- */
  var GANTI = { stokgerai: gambarGerai, mitra2: gambarKeuangan, sehat: gambarKualitas };
  var TAMBAH = { dokumen: tataDokumen, bacapo: tataBacaPo, outbound: tataGudang };
  function gambarGanti(fw, isi, hal) {
    var sek = fw.document.createElement('div');
    sek.className = 'l4t'; sek.setAttribute('data-l4t-hal-ini', hal);
    sek.innerHTML = '<p class="l4t-ket">' + esc(t('muat')) + '</p>';
    isi.insertBefore(sek, isi.firstChild);
    isi.classList.add('l4t-ganti'); isi.classList.remove('l4t-lihatlama');
    var isiUlang = function () { if (!sek.isConnected || fw.HAL !== hal) return; try { GANTI[hal](sek); } catch (e) { sek.innerHTML = '<p class="l4t-ket">' + esc(t('gagal')) + '</p>'; if (W.console) W.console.warn('tata ' + hal, e); } };
    muat().then(function () { isiUlang(); if (hal === 'mitra2') muatPiutang().then(isiUlang, isiUlang); }, function () { if (sek.isConnected) sek.innerHTML = '<p class="l4t-ket">' + esc(t('gagal')) + '</p>'; });
  }
  function terapkan(fw) {
    var d = fw.document, isi = d.getElementById('isi'); if (!isi) return;
    var hal = String(fw.HAL || '');
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
      var x = e.target.closest ? e.target.closest('[data-l4t],[data-l4t-hal]') : null; if (!x) return;
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
  W.WmsTata = { pasang: pasang, _hitung: hitung, _terapkan: terapkan };
})();
