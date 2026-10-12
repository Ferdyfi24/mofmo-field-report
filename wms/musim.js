/* Musim jualan WMS Mofmofriends (12 Okt 2026): tab "Musim jualan" di Kontrol.
 *
 * Kalender acara jualan dengan pcs terjual per pekan dari buku besar:
 *  - acara bawaan dihitung di sini: tanggal kembar marketplace (9.9, 10.10,
 *    11.11, 12.12), akhir pekan gajian (Sabtu dan Minggu yang memuat atau
 *    sesudah tanggal 25), Natal, libur sekolah akhir tahun, Tahun Baru, Hari
 *    Anak Nasional; Imlek, Ramadan, dan Idulfitri 2027 ditandai perkiraan
 *    (cek kalender resmi);
 *  - acara tambahan dan centang daftar periksa disimpan di Apps Script
 *    (bacaMusim / simpanMusim), sama untuk semua perangkat;
 *  - "kenaikan" acara yang sudah lewat = pcs pekan acara dibanding rata-rata
 *    4 pekan sebelumnya, hanya kalau riwayatnya cukup (minimal 2 pekan).
 *    Data WMS baru ada sejak Juli 2026, jadi sebagian besar acara belum
 *    punya pembanding dan itu ditulis apa adanya.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !(M().bhs && M().bhs() === 'en'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return W.document ? W.document.getElementById(i) : null; }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function dua(n) { return (n < 10 ? '0' : '') + n; }
  function tglUTC(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
  function geser(s, n) { return new Date(tglUTC(s) + n * 86400000).toISOString().slice(0, 10); }
  function selisih(a, b) { return Math.round((tglUTC(b) - tglUTC(a)) / 86400000); }
  function hariKe(t) { return new Date(tglUTC(t)).getUTCDay(); }
  function senin(t) { return geser(t, -((hariKe(t) + 6) % 7)); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tglTeks(t) { return (+t.slice(8, 10)) + ' ' + BLN[+t.slice(5, 7) - 1]; }
  function toko(l) { return !!(l && (l.toko === 1 || l.toko === '1' || l.toko === true)); }
  function dipegang(l) { return !!l && (l.k === 'HO' || l.k === 'TRANSIT' || l.k === 'GMT' || toko(l)); }

  /* ---------- acara bawaan ---------- */
  var CEK = {
    shopee: [['Stok SKU terlaris dipindah ke lokasi pick', -5], ['Voucher dan harga promo Shopee dipasang', -2], ['Lembar packing Shopee disiapkan lebih awal', -1]],
    gerai: [['Isi ulang gerai dengan SKU terlaris', -10], ['Materi promo dikirim ke mitra', -7], ['Kunjungan Operational PIC ditambah di pekan itu', -7]],
    gajian: [['Stok gerai yang laris dipastikan cukup', -3]]
  };
  function cekBawaan(jenis, mulai) { return (CEK[jenis] || []).map(function (c) { return { teks: c[0], batas: geser(mulai, c[1]), selesai: false }; }); }
  function gajian(b) {
    var t = b + '-25', h = hariKe(t), sab = h === 6 ? t : h === 0 ? geser(t, -1) : geser(t, 6 - h);
    return [sab, geser(sab, 1)];
  }
  function acaraBawaan(hariIni) {
    var y = +hariIni.slice(0, 4), awal = geser(hariIni, -130), akhir = geser(hariIni, 130), o = [];
    var tambah = function (kode, nama, mulai, selesai, kanal, jenis, ket) { if (selesai < awal || mulai > akhir) return; o.push({ id: 'bawaan-' + kode, bawaan: true, nama: nama, mulai: mulai, selesai: selesai, kanal: kanal, ket: ket || '', cek: cekBawaan(jenis, mulai) }); };
    [y - 1, y, y + 1].forEach(function (th) {
      [9, 10, 11, 12].forEach(function (m) { var t = th + '-' + dua(m) + '-' + dua(m); tambah(th + '-' + dua(m) + '-' + dua(m), m + '.' + m, t, t, 'Shopee', 'shopee', id() ? 'Tanggal kembar marketplace' : 'Marketplace double date'); });
      for (var m = 1; m <= 12; m++) { var g = gajian(th + '-' + dua(m)); tambah('gajian-' + th + '-' + dua(m), id() ? 'Akhir pekan gajian' : 'Payday weekend', g[0], g[1], id() ? 'Semua saluran' : 'All channels', 'gajian'); }
      tambah('natal-' + th, id() ? 'Natal' : 'Christmas', th + '-12-24', th + '-12-25', id() ? 'Gerai' : 'Stores', 'gerai');
      tambah('libur-' + th, id() ? 'Libur sekolah akhir tahun (perkiraan)' : 'Year-end school holiday (estimate)', th + '-12-19', (th + 1) + '-01-04', id() ? 'Gerai' : 'Stores', 'gerai', id() ? 'Tanggal pastinya ikut kalender pendidikan daerah.' : 'Exact dates follow the regional school calendar.');
      tambah('anak-' + th, id() ? 'Hari Anak Nasional' : 'National Children\'s Day', th + '-07-23', th + '-07-23', id() ? 'Gerai' : 'Stores', 'gerai');
    });
    [['tahunbaru-2027', id() ? 'Tahun Baru' : 'New Year', '2027-01-01', '2027-01-01', ''], ['imlek-2027', id() ? 'Imlek (perkiraan)' : 'Lunar New Year (estimate)', '2027-02-06', '2027-02-06', id() ? 'Cek kalender libur resmi.' : 'Check the official holiday calendar.'],
      ['ramadan-2027', id() ? 'Ramadan (perkiraan)' : 'Ramadan (estimate)', '2027-02-08', '2027-03-09', id() ? 'Tanggal pastinya menunggu penetapan pemerintah.' : 'Exact dates await the government decision.'], ['idulfitri-2027', id() ? 'Idulfitri (perkiraan)' : 'Eid al-Fitr (estimate)', '2027-03-10', '2027-03-11', id() ? 'Tanggal pastinya menunggu penetapan pemerintah.' : 'Exact dates await the government decision.']]
      .forEach(function (x) { tambah(x[0], x[1], x[2], x[3], id() ? 'Gerai' : 'Stores', 'gerai', x[4]); });
    o.sort(function (a, b) { return a.mulai < b.mulai ? -1 : a.mulai > b.mulai ? 1 : 0; });
    return o;
  }

  /* ---------- hitungan ---------- */
  function hitung(dp, simpanan, hariIni) {
    hariIni = String(hariIni || dp.hariIni || new Date().toISOString()).slice(0, 10);
    var L = dp.lok || [], perPekan = {}, awalData = '';
    (dp.baris || []).forEach(function (b) {
      var t = String(b[0]).slice(0, 10), q = Number(b[2]) || 0, d = L[b[3]], k = L[b[4]];
      if (!d || !k || !q || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return;
      if (!awalData || t < awalData) awalData = t;
      if (t > hariIni || !dipegang(d) || k.k !== 'TERJUAL') return;
      var s = senin(t); perPekan[s] = (perPekan[s] || 0) + q;
    });
    var dari = senin(geser(hariIni, -7 * 15)); if (awalData && senin(awalData) > dari) dari = senin(awalData);
    var sampai = senin(geser(hariIni, 7 * 12)), pekan = [];
    for (var s = dari; s <= sampai; s = geser(s, 7)) pekan.push({ senin: s, pcs: perPekan[s] || 0, masaDepan: s > hariIni, ada: !!awalData && s >= senin(awalData), acara: [] });
    var cekSimpan = {}, tambahan = [];
    (simpanan || []).forEach(function (a) { if (a.bawaan) cekSimpan[a.id] = a.cek; else tambahan.push(a); });
    var acara = acaraBawaan(hariIni).map(function (a) { if (cekSimpan[a.id]) { var c = cekSimpan[a.id]; a.cek = a.cek.map(function (x, i) { var y = c.filter(function (z) { return z.teks === x.teks; })[0]; return y ? { teks: x.teks, batas: x.batas, selesai: !!y.selesai } : x; }); } return a; })
      .concat(tambahan.map(function (a) { return { id: a.id, bawaan: false, nama: a.nama, mulai: a.mulai, selesai: a.selesai, kanal: a.kanal || '', ket: a.ket || '', cek: (a.cek || []).map(function (x) { return { teks: x.teks, batas: x.batas || '', selesai: !!x.selesai }; }) }; }))
      .sort(function (a, b) { return a.mulai < b.mulai ? -1 : a.mulai > b.mulai ? 1 : (a.bawaan === b.bawaan ? 0 : a.bawaan ? 1 : -1); });
    acara.forEach(function (a) {
      pekan.forEach(function (p) { if (a.mulai <= geser(p.senin, 6) && a.selesai >= p.senin) p.acara.push(a.id); });
      a.lewat = a.selesai < hariIni; a.hariLagi = a.mulai > hariIni ? selisih(hariIni, a.mulai) : 0;
      a.kenaikan = null;
      if (a.mulai <= hariIni && awalData) {
        var s0 = senin(a.mulai), pcs = perPekan[s0] || 0, sebelum = [];
        for (var i = 1; i <= 4; i++) { var sp = geser(s0, -7 * i); if (sp >= senin(awalData)) sebelum.push(perPekan[sp] || 0); }
        if (sebelum.length >= 2) { var rata = sebelum.reduce(function (x, y) { return x + y; }, 0) / sebelum.length; a.kenaikan = { pcs: pcs, rata: rata, rasio: rata > 0 ? pcs / rata : null }; }
      }
    });
    var berikut = acara.filter(function (a) { return a.selesai >= hariIni; })[0] || null;
    return { hariIni: hariIni, pekan: pekan, acara: acara, berikut: berikut, awalData: awalData, maks: Math.max.apply(null, [1].concat(pekan.map(function (p) { return p.pcs; }))) };
  }

  /* ---------- tampilan ---------- */
  var TS = {
    id: { sub: 'Kalender acara jualan dan pcs terjual per pekan dari buku besar. Acara tambahan dan centang daftar periksa dibagi ke semua perangkat.', hariIni: 'Hari ini', dari: function (a, b) { return a + ' dari ' + b + ' tugas daftar periksa beres'; },
      berikut: function (n, h) { return 'Acara berikutnya: ' + n + (h ? ' dalam ' + h + ' hari' : ' (berlangsung)'); }, grafik: 'Pcs terjual per pekan, dengan pekan acara', terjual: 'Terjual', pekanAcara: 'Pekan acara', belum: 'Belum terjadi',
      daftar: 'Acara', akanDatang: 'Akan datang', sudahLewat: 'Sudah lewat', naik: function (p, r) { return p + ' pcs di pekan acara, ' + r + ' rata-rata 4 pekan sebelumnya'; }, kurang: 'Belum cukup riwayat untuk dibandingkan (data WMS sejak Juli 2026).',
      cek: 'Daftar periksa sebelum mulai', batas: 'batas', tambah: 'Tambah acara', nama: 'Nama acara', mulai: 'Mulai', selesai: 'Selesai', kanal: 'Saluran', ket: 'Keterangan', simpan: 'Simpan acara', batal: 'Batal', hapus: 'Hapus acara', yaHapus: 'Ya, hapus', konfHapus: 'Hapus acara ini dari kalender semua perangkat?',
      perlu: 'Nama, tanggal mulai, dan tanggal selesai wajib; selesai tidak boleh sebelum mulai.', bentrok: 'Kalender baru saja diubah dari perangkat lain. Isi terbaru sudah dimuat, ulangi perubahannya.', belumDeploy: 'Acara tambahan dan centang tersimpan menyala setelah Apps Script versi baru di-deploy. Acara bawaan dan grafik sudah bisa dipakai.',
      menyimpan: 'Menyimpan…', gagal: 'Belum tersimpan. Coba lagi.', perkiraan: 'perkiraan', tanpaCek: 'Belum ada daftar periksa.', tugasBaru: 'Tugas baru', tambahTugas: 'Tambah tugas', bawaan: 'bawaan', tambahan: 'tambahan', kosong: 'Belum ada penjualan di buku besar.' },
    en: { sub: 'Selling calendar with pcs sold per week from the ledger. Added events and checklist ticks are shared across devices.', hariIni: 'Today', dari: function (a, b) { return a + ' of ' + b + ' checklist items done'; },
      berikut: function (n, h) { return 'Next event: ' + n + (h ? ' in ' + h + ' days' : ' (running)'); }, grafik: 'Pcs sold per week, with event weeks', terjual: 'Sold', pekanAcara: 'Event week', belum: 'Not yet',
      daftar: 'Events', akanDatang: 'Coming up', sudahLewat: 'Past', naik: function (p, r) { return p + ' pcs in the event week, ' + r + ' the 4-week average before'; }, kurang: 'Not enough history to compare yet (WMS data since July 2026).',
      cek: 'Checklist before it starts', batas: 'due', tambah: 'Add event', nama: 'Event name', mulai: 'Start', selesai: 'End', kanal: 'Channel', ket: 'Note', simpan: 'Save event', batal: 'Cancel', hapus: 'Delete event', yaHapus: 'Yes, delete', konfHapus: 'Delete this event from every device?',
      perlu: 'Name, start and end dates are required; the end cannot be before the start.', bentrok: 'The calendar was just changed on another device. The latest is loaded; repeat your change.', belumDeploy: 'Added events and saved ticks turn on after the new Apps Script version is deployed. Built-in events and the chart already work.',
      menyimpan: 'Saving…', gagal: 'Not saved. Try again.', perkiraan: 'estimate', tanpaCek: 'No checklist yet.', tugasBaru: 'New task', tambahTugas: 'Add task', bawaan: 'built-in', tambahan: 'added', kosong: 'No sales in the ledger yet.' }
  };
  function T(k) { var d = TS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TS.en[k]; }
  var S = { dp: null, versi: 0, simpanan: [], muat: false, galat: '', pilih: '', form: false, konf: null, sibuk: false, pesan: '', pasang: false };
  function muat() {
    S.muat = true; S.galat = '';
    return M().jalan('bacaMusim', ['WMS-TIKET']).then(function (h) { if (!h || h.ok === false) throw new Error((h && h.pesan) || 'musim'); S.versi = Number(h.versi) || 0; S.simpanan = h.acara || []; },
      function (e) { S.galat = String(e && e.message || e); }).catch(function (e) { S.galat = String(e && e.message || e); }).then(function () { ulang(); });
  }
  function gambar(w, dp) {
    S.dp = dp; pasangKejadian();
    if (!S.muat) muat();
    var H = hitung(dp, S.simpanan), b = H.berikut;
    if (!S.pilih || !H.acara.some(function (a) { return a.id === S.pilih; })) S.pilih = b ? b.id : (H.acara[H.acara.length - 1] || {}).id || '';
    var pilih = H.acara.filter(function (a) { return a.id === S.pilih; })[0];
    var belumDeploy = S.galat && /tidak dibuka|bacaMusim|deploy/i.test(S.galat);
    var html = '<p class="ket-alat">' + esc(T('sub')) + '</p>' +
      '<div class="ms-atas"><b>' + esc(T('hariIni')) + ' ' + esc(tglTeks(H.hariIni)) + '</b>' + (b ? '<span>' + esc(T('dari')(b.cek.filter(function (c) { return c.selesai; }).length, b.cek.length)) + '</span><span>' + esc(T('berikut')(b.nama, b.hariLagi)) + '</span>' : '') +
      '<button type="button" class="btn dua kn-kecil" data-musim="tambah"' + (belumDeploy ? ' disabled' : '') + '>' + esc(T('tambah')) + '</button></div>' +
      (belumDeploy ? '<p class="ms-catatan">' + esc(T('belumDeploy')) + '</p>' : '') + (S.pesan ? '<p class="ms-catatan" role="status">' + esc(S.pesan) + '</p>' : '');
    if (S.form) html += formAcara();
    html += '<h3 class="kn-bulan">' + esc(T('grafik')) + '</h3><div class="ms-grafik" role="img" aria-label="' + esc(T('grafik')) + '">' + H.pekan.map(function (p) {
      var adaAcara = p.acara.length, tinggi = p.masaDepan ? 6 : Math.max(3, Math.round(p.pcs / H.maks * 100));
      var nm = p.acara.map(function (x) { var a = H.acara.filter(function (y) { return y.id === x; })[0]; return a ? a.nama : ''; }).join(', ');
      return '<div class="ms-kolom' + (p.masaDepan ? ' depan' : '') + (adaAcara ? ' acara' : '') + (p.acara.indexOf(S.pilih) > -1 ? ' pilih' : '') + '" data-musim-pekan="' + p.senin + '" title="' + esc(tglTeks(p.senin) + (p.masaDepan ? '' : ' · ' + p.pcs + ' pcs') + (nm ? ' · ' + nm : '')) + '"><span class="ms-angka">' + (p.masaDepan ? '' : p.pcs) + '</span><i style="height:' + tinggi + '%"></i><small>' + (+p.senin.slice(8, 10)) + '/' + (+p.senin.slice(5, 7)) + '</small></div>';
    }).join('') + '</div><div class="ms-legenda"><span class="l-jual">' + esc(T('terjual')) + '</span><span class="l-acara">' + esc(T('pekanAcara')) + '</span><span class="l-depan">' + esc(T('belum')) + '</span></div>';
    if (!H.awalData) html += '<p class="ket-alat">' + esc(T('kosong')) + '</p>';
    var datang = H.acara.filter(function (a) { return !a.lewat; }), lewat = H.acara.filter(function (a) { return a.lewat; }).reverse();
    var chip = function (a) { return '<button type="button" class="ms-acara' + (a.id === S.pilih ? ' on' : '') + (a.lewat ? ' lewat' : '') + '" data-musim-pilih="' + esc(a.id) + '"><b>' + esc(a.nama) + '</b><small>' + esc(tglTeks(a.mulai) + (a.selesai !== a.mulai ? ' sampai ' + tglTeks(a.selesai) : '') + ' · ' + a.kanal) + '</small>' + (!a.lewat && a.hariLagi ? '<span class="ms-lagi">' + a.hariLagi + (id() ? ' hari' : ' d') + '</span>' : '') + '</button>'; };
    html += '<div class="ms-kisi"><div><h3 class="kn-bulan">' + esc(T('akanDatang')) + '</h3><div class="ms-daftar">' + datang.slice(0, 10).map(chip).join('') + '</div>' +
      (lewat.length ? '<h3 class="kn-bulan">' + esc(T('sudahLewat')) + '</h3><div class="ms-daftar">' + lewat.slice(0, 6).map(chip).join('') + '</div>' : '') + '</div>';
    html += '<div class="ms-rinci">' + (pilih ? rinci(pilih, belumDeploy) : '') + '</div></div>';
    w.innerHTML = html;
  }
  function rinci(a, kunci) {
    var s = '<div class="ms-kartu" data-musim-acara="' + esc(a.id) + '"><b>' + esc(a.nama) + '</b><small>' + esc(tglTeks(a.mulai) + (a.selesai !== a.mulai ? ' sampai ' + tglTeks(a.selesai) : '') + ' · ' + a.kanal + ' · ' + (a.bawaan ? T('bawaan') : T('tambahan'))) + '</small>' + (a.ket ? '<p>' + esc(a.ket) + '</p>' : '');
    if (a.kenaikan) s += '<p class="ms-naik">' + esc(T('naik')(a.kenaikan.pcs, a.kenaikan.rasio == null ? (id() ? 'tanpa pembanding' : 'no baseline') : (Math.round(a.kenaikan.rasio * 10) / 10 + 'x').replace('.', id() ? ',' : '.'))) + '</p>';
    else if (a.mulai <= (S.dp && S.dp.hariIni || '9999')) s += '<p class="ms-catatan">' + esc(T('kurang')) + '</p>';
    s += '<div class="lbl">' + esc(T('cek')) + '</div>' + (a.cek.length ? '<ul class="ms-cek">' + a.cek.map(function (c, i) { return '<li><label><input type="checkbox" data-musim-cek="' + i + '"' + (c.selesai ? ' checked' : '') + (kunci || S.sibuk ? ' disabled' : '') + '><span>' + esc(c.teks) + '</span>' + (c.batas ? '<small>' + esc(T('batas')) + ' ' + esc(tglTeks(c.batas)) + '</small>' : '') + '</label></li>'; }).join('') + '</ul>' : '<p class="ket-alat">' + esc(T('tanpaCek')) + '</p>');
    if (!a.bawaan && !kunci) s += S.konf === a.id ? '<div class="ptk-konfirmasi"><span>' + esc(T('konfHapus')) + '</span><button type="button" class="btn" data-musim="hapusYa">' + esc(T('yaHapus')) + '</button><button type="button" class="btn dua" data-musim="batalHapus">' + esc(T('batal')) + '</button></div>' : '<div class="ptk-tombol"><button type="button" class="btn dua kn-kecil" data-musim="hapus">' + esc(T('hapus')) + '</button></div>';
    return s + '</div>';
  }
  function formAcara() {
    return '<form class="ms-form" id="msForm" autocomplete="off"><label><span>' + esc(T('nama')) + '</span><input id="msNama" maxlength="80" required></label><label><span>' + esc(T('mulai')) + '</span><input id="msMulai" type="date" required></label>' +
      '<label><span>' + esc(T('selesai')) + '</span><input id="msSelesai" type="date" required></label><label><span>' + esc(T('kanal')) + '</span><input id="msKanal" maxlength="40" placeholder="Shopee, Gerai, Semua saluran"></label>' +
      '<label class="lebar"><span>' + esc(T('ket')) + '</span><input id="msKet" maxlength="200"></label><label class="lebar"><span>' + esc(T('cek')) + '</span><textarea id="msCek" rows="3" placeholder="' + esc(id() ? 'Satu tugas per baris' : 'One task per line') + '"></textarea></label>' +
      '<p class="ms-galat" id="msGalat" role="alert"></p><div class="ptk-tombol"><button type="submit" class="btn">' + esc(T('simpan')) + '</button><button type="button" class="btn dua" data-musim="tutupForm">' + esc(T('batal')) + '</button></div></form>';
  }
  function ulang() { var w = el('kontrolIsi'); if (w && S.dp && w.querySelector('.ms-grafik, .ms-atas')) gambar(w, S.dp); }
  function simpan(daftar, sesudah) {
    if (S.sibuk) return; S.sibuk = true; S.pesan = T('menyimpan'); ulang();
    M().jalan('simpanMusim', ['WMS-TIKET', S.versi, daftar]).then(function (h) {
      if (h && h.ok) { S.versi = h.versi; S.simpanan = h.acara; S.pesan = ''; if (sesudah) sesudah(); }
      else if (h && h.sebab === 'versi') { S.versi = h.versi; S.simpanan = h.acara || []; S.pesan = T('bentrok'); }
      else S.pesan = (h && h.pesan) || T('gagal');
    }, function () { S.pesan = T('gagal'); }).then(function () { S.sibuk = false; ulang(); });
  }
  function centang(idA, i, nilai) {
    var H = hitung(S.dp, S.simpanan), a = H.acara.filter(function (x) { return x.id === idA; })[0]; if (!a) return;
    var cek = a.cek.map(function (c, j) { return { teks: c.teks, batas: c.batas, selesai: j === i ? nilai : c.selesai }; });
    var daftar = S.simpanan.filter(function (x) { return x.id !== idA; });
    daftar.push(a.bawaan ? { id: a.id, bawaan: true, cek: cek } : { id: a.id, nama: a.nama, mulai: a.mulai, selesai: a.selesai, kanal: a.kanal, ket: a.ket, cek: cek });
    simpan(daftar);
  }
  function kirimForm() {
    var v = function (i) { var x = el(i); return x ? x.value.trim() : ''; };
    var nama = v('msNama'), mulai = v('msMulai'), selesai = v('msSelesai') || mulai, g = el('msGalat');
    if (!nama || !/^\d{4}-\d{2}-\d{2}$/.test(mulai) || !/^\d{4}-\d{2}-\d{2}$/.test(selesai) || selesai < mulai) { if (g) g.textContent = T('perlu'); bunyi('gagal'); return; }
    var acara = { id: 'acr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nama: nama, mulai: mulai, selesai: selesai, kanal: v('msKanal') || (id() ? 'Semua saluran' : 'All channels'), ket: v('msKet'),
      cek: v('msCek').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 8).map(function (x) { return { teks: x, batas: '', selesai: false }; }) };
    simpan(S.simpanan.concat([acara]), function () { S.form = false; S.pilih = acara.id; });
  }
  function pasangKejadian() {
    if (S.pasang || !W.document) return; S.pasang = true;
    W.document.addEventListener('click', function (e) {
      var x = e.target && e.target.closest ? e.target.closest('#kontrol [data-musim],#kontrol [data-musim-pilih]') : null; if (!x) return;
      if (x.hasAttribute('data-musim-pilih')) { bunyi('klik'); S.pilih = x.getAttribute('data-musim-pilih'); S.konf = null; ulang(); return; }
      var a = x.getAttribute('data-musim');
      if (a === 'tambah') { bunyi('klik'); S.form = !S.form; ulang(); var n = el('msNama'); if (n) n.focus(); }
      else if (a === 'tutupForm') { S.form = false; ulang(); }
      else if (a === 'hapus') { S.konf = S.pilih; ulang(); }
      else if (a === 'batalHapus') { S.konf = null; ulang(); }
      else if (a === 'hapusYa') { var idA = S.konf; S.konf = null; simpan(S.simpanan.filter(function (y) { return y.id !== idA; }), function () { S.pilih = ''; }); }
    });
    W.document.addEventListener('change', function (e) { var c = e.target; if (c && c.hasAttribute && c.hasAttribute('data-musim-cek') && c.closest('#kontrol')) { var k = c.closest('[data-musim-acara]'); centang(k.getAttribute('data-musim-acara'), +c.getAttribute('data-musim-cek'), c.checked); } });
    W.document.addEventListener('submit', function (e) { if (e.target && e.target.id === 'msForm') { e.preventDefault(); kirimForm(); } });
  }

  W.WmsMusim = { gambar: gambar, hitung: hitung, acaraBawaan: acaraBawaan, _gajian: gajian };
})();
