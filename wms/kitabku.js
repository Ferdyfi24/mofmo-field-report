/* Kitabku di WMS (10 Okt 2026): event dan hadiah, cetak kartu QR paket Shopee, klaim struk gerai.
 *
 * Ferdy: "admin di WMS (menu baru Kitabku) ... boleh, gaskan", lalu "gas bgs
 * bangett, sekalian sama kitab dan web kitab". Server: Edge Function "kitab"
 * (aksi admin). Pintunya tiket WMS yang sama dengan Edge Function "wms";
 * tanpa tiket sah server menjawab perluMasuk. Kode voucher dibuat manual di
 * Shopee Seller Centre, sistem cuma menyimpan kode, nominal, dan kuota.
 */
(function () {
  /* ---------- QR (mode byte, koreksi M, versi 1 sampai 10) ----------
     Ditulis sendiri supaya WMS tidak memuat pustaka dari luar. Algoritma
     mengikuti ISO/IEC 18004 seperti penjelasan Project Nayuki. Diuji dengan
     dekoder sungguhan (uji/uji-kitabku-qr.js, zxing-cpp). */
  var QR_ECC = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26], QR_BLOK = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  function qrMentah(v) { var r = (16 * v + 128) * v + 64; if (v >= 2) { var na = Math.floor(v / 7) + 2; r -= (25 * na - 10) * na - 55; if (v >= 7) r -= 36; } return r; }
  function qrDataKata(v) { return Math.floor(qrMentah(v) / 8) - QR_ECC[v - 1] * QR_BLOK[v - 1]; }
  function gfKali(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; }
  function rsPembagi(d) { var r = []; for (var i = 0; i < d - 1; i++) r.push(0); r.push(1); var akar = 1; for (i = 0; i < d; i++) { for (var j = 0; j < r.length; j++) { r[j] = gfKali(r[j], akar); if (j + 1 < r.length) r[j] ^= r[j + 1]; } akar = gfKali(akar, 2); } return r; }
  function rsSisa(data, pb) { var r = pb.map(function () { return 0; }); data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); pb.forEach(function (k, i) { r[i] ^= gfKali(k, f); }); }); return r; }
  function utf8(s) { var b = []; var e = unescape(encodeURIComponent(s)); for (var i = 0; i < e.length; i++) b.push(e.charCodeAt(i)); return b; }
  function qrMatriks(teks) {
    var bytes = utf8(String(teks)), v = 0;
    for (var c = 1; c <= 10; c++) { if (4 + (c < 10 ? 8 : 16) + 8 * bytes.length <= qrDataKata(c) * 8) { v = c; break; } }
    if (!v) throw new Error('QR terlalu panjang');
    var bit = [], taruh = function (n, len) { for (var i = len - 1; i >= 0; i--) bit.push((n >>> i) & 1); };
    taruh(4, 4); taruh(bytes.length, v < 10 ? 8 : 16); bytes.forEach(function (b) { taruh(b, 8); });
    var kap = qrDataKata(v) * 8;
    taruh(0, Math.min(4, kap - bit.length)); taruh(0, (8 - bit.length % 8) % 8);
    for (var pad = 0xEC; bit.length < kap; pad ^= 0xEC ^ 0x11) taruh(pad, 8);
    var data = []; for (var i = 0; i < bit.length; i += 8) { var x = 0; for (var j = 0; j < 8; j++) x = (x << 1) | bit[i + j]; data.push(x); }
    /* blok + koreksi, lalu dianyam */
    var nb = QR_BLOK[v - 1], ecc = QR_ECC[v - 1], mentah = Math.floor(qrMentah(v) / 8), nPendek = nb - mentah % nb, pjPendek = Math.floor(mentah / nb);
    var pb = rsPembagi(ecc), blok = [], k = 0;
    for (i = 0; i < nb; i++) { var dat = data.slice(k, k + pjPendek - ecc + (i < nPendek ? 0 : 1)); k += dat.length; var e = rsSisa(dat, pb); if (i < nPendek) dat.push(0); blok.push(dat.concat(e)); }
    var kata = [];
    for (i = 0; i < blok[0].length; i++) for (j = 0; j < blok.length; j++) if (i !== pjPendek - ecc || j >= nPendek) kata.push(blok[j][i]);
    /* modul */
    var n = v * 4 + 17, M = [], F = [];
    for (i = 0; i < n; i++) { M.push([]); F.push([]); for (j = 0; j < n; j++) { M[i].push(false); F[i].push(false); } }
    var set = function (x, y, d) { M[y][x] = !!d; F[y][x] = true; };
    for (i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    [[3, 3], [n - 4, 3], [3, n - 4]].forEach(function (p) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var xx = p[0] + dx, yy = p[1] + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (xx >= 0 && xx < n && yy >= 0 && yy < n) set(xx, yy, d !== 2 && d !== 4); } });
    if (v > 1) {
      var na = Math.floor(v / 7) + 2, langkah = Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2, pos = [6];
      for (var ps = v * 4 + 10; pos.length < na; ps -= langkah) pos.splice(1, 0, ps);
      for (i = 0; i < na; i++) for (j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
        for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++) set(pos[i] + ax, pos[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
      }
    }
    var format = function (mask) {
      var d = mask, r = d; for (var q = 0; q < 10; q++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var b = ((d << 10) | r) ^ 0x5412, g = function (q) { return (b >>> q) & 1; };
      for (q = 0; q <= 5; q++) set(8, q, g(q));
      set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
      for (q = 9; q < 15; q++) set(14 - q, 8, g(q));
      for (q = 0; q < 8; q++) set(n - 1 - q, 8, g(q));
      for (q = 8; q < 15; q++) set(8, n - 15 + q, g(q));
      set(8, n - 8, true);
    };
    format(0);
    if (v >= 7) {
      var r = v; for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      var vb = (v << 12) | r;
      for (i = 0; i < 18; i++) { var bb = (vb >>> i) & 1, a = n - 11 + i % 3, b2 = Math.floor(i / 3); set(a, b2, bb); set(b2, a, bb); }
    }
    var ib = 0, nbit = kata.length * 8;
    for (var kanan = n - 1; kanan >= 1; kanan -= 2) {
      if (kanan === 6) kanan = 5;
      for (var t = 0; t < n; t++) for (j = 0; j < 2; j++) {
        var cx = kanan - j, naik = ((kanan + 1) & 2) === 0, cy = naik ? n - 1 - t : t;
        if (!F[cy][cx] && ib < nbit) { M[cy][cx] = ((kata[ib >>> 3] >>> (7 - (ib & 7))) & 1) === 1; ib++; }
      }
    }
    var topeng = function (m, x, y) { switch (m) { case 0: return (x + y) % 2 === 0; case 1: return y % 2 === 0; case 2: return x % 3 === 0; case 3: return (x + y) % 3 === 0; case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; case 5: return x * y % 2 + x * y % 3 === 0; case 6: return (x * y % 2 + x * y % 3) % 2 === 0; default: return ((x + y) % 2 + x * y % 3) % 2 === 0; } };
    var pakai = function (m) { for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (!F[y][x] && topeng(m, x, y)) M[y][x] = !M[y][x]; };
    var denda = function () {
      var p = 0, y, x, gelap = 0;
      var garis = function (get) {
        for (var a = 0; a < n; a++) {
          var run = 1, s = '';
          for (var b = 0; b < n; b++) { var cur = get(a, b); s += cur ? '1' : '0'; if (b > 0) { if (cur === get(a, b - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
          var re = /(?=(10111010000|00001011101))/g; while (re.exec(s)) { p += 40; re.lastIndex++; }
        }
      };
      garis(function (a, b) { return M[a][b]; }); garis(function (a, b) { return M[b][a]; });
      for (y = 0; y < n - 1; y++) for (x = 0; x < n - 1; x++) { var cc = M[y][x]; if (cc === M[y][x + 1] && cc === M[y + 1][x] && cc === M[y + 1][x + 1]) p += 3; }
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (M[y][x]) gelap++;
      p += Math.floor(Math.abs(gelap * 20 - n * n * 10) / (n * n)) * 10;
      return p;
    };
    var terbaik = 0, dMin = Infinity;
    for (var m = 0; m < 8; m++) { pakai(m); format(m); var dd = denda(); if (dd < dMin) { dMin = dd; terbaik = m; } pakai(m); }
    pakai(terbaik); format(terbaik);
    return M.map(function (row) { return row.map(function (z) { return z ? 1 : 0; }); });
  }
  function qrSvg(teks, kelas) {
    var m = qrMatriks(teks), n = m.length, w = n + 8, d = '';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (m[y][x]) d += 'M' + (x + 4) + ' ' + (y + 4) + 'h1v1h-1z';
    return '<svg' + (kelas ? ' class="' + kelas + '"' : '') + ' viewBox="0 0 ' + w + ' ' + w + '" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="' + w + '" height="' + w + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  /* ---------- katalog kartu: sama dengan KARTU di Edge Function kitab ---------- */
  var KARTU = [
    ['4582586962058', 0, 'Plush Bear', 'S'], ['4582586963260', 0, 'Plush Panda', 'S'], ['4582586963291', 0, 'Plush Panda', 'M'], ['4582586966605', 0, 'Plush Red Panda', 'S'], ['4582586966636', 0, 'Plush Red Panda', 'M'],
    ['4582586966629', 0, 'Plush Koala', 'S'], ['4582586966612', 0, 'Plush Elephant', 'S'], ['4582586966643', 0, 'Plush Elephant', 'M'], ['4582586964403', 0, 'Plush Reindeer', 'S'], ['4582586962737', 0, 'Plush Sea Otter', 'S'],
    ['4582586962126', 1, 'Plush Border Collie', 'S'], ['4582586962225', 1, 'Plush Angora Rabbit', 'S'], ['4582586962133', 1, 'Plush Lamb', 'S'], ['4582586950512', 1, 'Plush Yellow Shiba', 'S'], ['4582586950536', 1, 'Plush Yellow Shiba', 'M'], ['4582586964434', 1, 'Plush Pekingese', 'S'],
    ['4582586966988', 2, 'Key Charm', 'Dwarf Rabbit'], ['4582586967015', 2, 'Key Charm', 'Bear'], ['4582586966971', 2, 'Key Charm', 'Bichon Frize'], ['4582586966995', 2, 'Key Charm', 'British Shorthair'], ['4582586966544', 2, 'Key Charm', 'Shiba Inu'], ['4582586964311', 2, 'Key Charm', 'Lamb'], ['4582586964274', 2, 'Key Charm', 'Tiger'], ['4582586964298', 2, 'Key Charm', 'Cow'],
    ['4582586966780', 3, 'Key Ring', 'Dwarf Rabbit'], ['4582586966810', 3, 'Key Ring', 'Bear'], ['4582586966773', 3, 'Key Ring', 'Bichon Frize'], ['4582586966827', 3, 'Key Ring', 'Tiger'], ['4582586966797', 3, 'Key Ring', 'British Shorthair'],
    ['4582586965714', 4, 'Mascot Ball Key Chain', 'Yellow Tiger'], ['4582586965721', 4, 'Mascot Ball Key Chain', 'Border Collie'], ['4582586965738', 4, 'Mascot Ball Key Chain', 'Lamb'], ['4582586965707', 4, 'Mascot Ball Key Chain', 'Panda'],
    ['4589715755918', 5, 'Mini Rucksack (Key Charm)', 'Dwarf Rabbit'], ['4589715755925', 5, 'Mini Rucksack (Key Charm)', 'British Shorthair'], ['4582586968333', 5, 'Mini Backpack (Key Charm)', 'Ivory'], ['4582586968357', 5, 'Mini Backpack (Key Charm)', 'Green'], ['4582586968364', 5, 'Mini Backpack (Key Charm)', 'Blue'], ['4582586968340', 5, 'Mini Backpack (Key Charm)', 'Pink'],
    ['4582586961822', 6, 'Cap', 'Dwarf Rabbit'], ['4582586964014', 6, 'Cap', 'Watermelon'], ['4582586964021', 6, 'Cap', 'Banana'], ['4582586966360', 6, 'Cap', 'Tomato']
  ];
  var BAB = ['Forest Dwellers', 'Home Friends', 'Key Charm', 'Key Ring', 'Mascot Ball', 'Backpack', 'Cap'];
  var ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  var PER = {}; KARTU.forEach(function (k) { PER[k[0]] = k; });
  function namaKartu(bc) { var k = PER[bc]; if (!k) return bc; return k[2].replace(' (Key Charm)', '') + ' · ' + k[3]; }
  var KITAB = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/kitab';
  var SITUS = 'https://mofmofriends-kitab.pages.dev/#k=';
  /* usulan hadiah dari mockup (Ferdy: "gas keduanya"); dipasang NONAKTIF karena nominal belum ditentukan.
     Judul dikosongkan: web Kitab menulis judulnya sendiri dalam bahasa pembeli. */
  var USULAN = [
    { id: 'patok3', judul: '', jenis: 'kartu', angka: 3, saluran: 'semua', hadiah: 'Gelar Penjelajah' },
    { id: 'patok5', judul: '', jenis: 'kartu', angka: 5, saluran: 'online', hadiah: 'Voucher Shopee' },
    { id: 'patok10', judul: '', jenis: 'kartu', angka: 10, saluran: 'online', hadiah: 'Voucher Shopee' },
    { id: 'patok43', judul: '', jenis: 'kartu', angka: 43, saluran: 'semua', hadiah: 'Kartu emas + Dinding Kolektor' },
    { id: 'bab1', judul: '', jenis: 'bab', angka: 0, saluran: 'online', hadiah: 'Potongan Cap' },
    { id: 'bab2', judul: '', jenis: 'bab', angka: 1, saluran: 'online', hadiah: 'Potongan Mini Backpack' },
    { id: 'bab3', judul: '', jenis: 'bab', angka: 2, saluran: 'online', hadiah: 'Potongan plush S' },
    { id: 'bab5', judul: '', jenis: 'bab', angka: 4, saluran: 'online', hadiah: 'Potongan Key Ring' },
    { id: 'bab7', judul: '', jenis: 'bab', angka: 6, saluran: 'online', hadiah: 'Potongan plush M' },
    { id: 'bintang3', judul: '', jenis: 'bintang', angka: 3, saluran: 'semua', hadiah: 'Voucher Shopee' },
    { id: 'edisi', judul: '', jenis: 'edisi', angka: 3, saluran: 'semua', hadiah: 'Hadiah edisi' }
  ];

  var TEKS = {
    en: {
      judul: 'Kitabku', judulH: 'Title', tabRingkas: 'Event & rewards', tabCetak: 'Print QR cards', tabStruk: 'Receipt claims', tutup: 'Close',
      muat: 'Loading…', gagal: 'The Kitabku server could not be reached. Check the signal and try again.', ulang: 'Try again', sesiHabis: 'Your WMS session has ended. Sign in again.',
      kKartu: 'Cards unlocked', kPemain: 'Collectors', kStruk: 'Receipts waiting', kKlaim: 'Rewards claimed', kKode: 'Shopee cards printed', kDipakai: 'scanned',
      acara: 'Active event', tanpaAcara: 'No event yet. Create one before printing cards.', acaraBaru: 'New event', nama: 'Name', cap: 'Stamp', mulai: 'Start', selesai: 'End',
      simpanAcara: 'Start this event', ketAcara: 'Starting a new event ends the current one. Leaderboards restart, cards keep their old stamp.',
      hadiah: 'Rewards', ketHadiah: 'Rewards switched on appear in every buyer\'s book. Voucher codes are created by hand in Shopee Seller Centre; paste the code here.',
      jenis: 'Type', angka: 'Target', saluran: 'Counts', semua: 'All cards', online: 'Shopee cards only', isi: 'Reward', nominal: 'Value', minBelanja: 'Min. spend',
      voucher: 'Voucher code', kuota: 'Quota', terpakai: 'claimed', aktif: 'On', simpan: 'Save', tersimpan: 'Saved', usulan: 'Add the mockup rewards (switched off)',
      j_kartu: 'Cards collected', j_bab: 'Chapter complete', j_bintang: 'Game stars', j_edisi: 'Edition cards', hadiahBaru: 'New reward', idHadiah: 'ID (letters, no spaces)',
      tanpaHadiah: 'No rewards yet.', kosongNominal: 'value not set',
      cetakJudul: 'QR cards for Shopee parcels', ketCetak: 'One card per item packed. The code works once: the first book that scans it keeps it. Card size 85 x 55 mm, 10 per A4.',
      jumlah: 'Qty', total: 'Total', maks: 'max 500 per print', vJumlah: 'Cards with a bonus voucher', vKode: 'Voucher code', vTeks: 'Voucher text shown to the buyer',
      ketVoucher: 'Bonus vouchers are mixed randomly into the batch. The buyer only sees it after scanning.', buat: 'Create codes', buatCetak: 'Print', cetakLagi: 'Print again',
      dibuat: 'codes created for', dariAcara: 'event', kartuUntuk: 'Collection card for', pindai: 'Scan to unlock your card in the Mofmofriends Book', atauKetik: 'or type the code at mofmofriends-kitab.pages.dev',
      strukJudul: 'Receipt claims', tanpaStruk: 'No receipts waiting.', lihatFoto: 'Show photo', setujui: 'Approve', tolak: 'Reject', yakinTolak: 'Reject for sure?', kartuDibuka: 'Cards to unlock',
      ketStruk: 'Check the store, date, and items on the photo. Untick items that are not on the receipt.', dibeli: 'bought', diputus: 'Done', pilihKartu: 'Pick at least one card.'
    },
    id: {
      judul: 'Kitabku', judulH: 'Judul', tabRingkas: 'Event & hadiah', tabCetak: 'Cetak kartu QR', tabStruk: 'Klaim struk', tutup: 'Tutup',
      muat: 'Memuat…', gagal: 'Server Kitabku belum bisa dihubungi. Cek sinyal lalu coba lagi.', ulang: 'Coba lagi', sesiHabis: 'Sesi WMS sudah habis. Masuk lagi.',
      kKartu: 'Kartu terbuka', kPemain: 'Kolektor', kStruk: 'Struk menunggu', kKlaim: 'Hadiah diambil', kKode: 'Kartu Shopee dicetak', kDipakai: 'dipindai',
      acara: 'Event aktif', tanpaAcara: 'Belum ada event. Buat dulu sebelum mencetak kartu.', acaraBaru: 'Event baru', nama: 'Nama', cap: 'Cap', mulai: 'Mulai', selesai: 'Selesai',
      simpanAcara: 'Mulai event ini', ketAcara: 'Event baru menutup event yang berjalan. Papan peringkat mulai dari nol, kartu lama tetap bercap event lamanya.',
      hadiah: 'Hadiah', ketHadiah: 'Hadiah yang dinyalakan langsung tampil di buku setiap pembeli. Kode voucher dibuat manual di Shopee Seller Centre, lalu tempel kodenya di sini.',
      jenis: 'Jenis', angka: 'Target', saluran: 'Dihitung', semua: 'Semua kartu', online: 'Kartu Shopee saja', isi: 'Hadiah', nominal: 'Nilai', minBelanja: 'Min. belanja',
      voucher: 'Kode voucher', kuota: 'Kuota', terpakai: 'diambil', aktif: 'Nyala', simpan: 'Simpan', tersimpan: 'Tersimpan', usulan: 'Pasang hadiah dari mockup (nonaktif)',
      j_kartu: 'Jumlah kartu', j_bab: 'Bab lengkap', j_bintang: 'Bintang game', j_edisi: 'Kartu edisi', hadiahBaru: 'Hadiah baru', idHadiah: 'ID (huruf, tanpa spasi)',
      tanpaHadiah: 'Belum ada hadiah.', kosongNominal: 'nilai belum diisi',
      cetakJudul: 'Kartu QR untuk paket Shopee', ketCetak: 'Satu kartu untuk setiap barang yang dikemas. Kode hanya berlaku sekali: buku pertama yang memindai yang memilikinya. Ukuran kartu 85 x 55 mm, 10 per A4.',
      jumlah: 'Jml', total: 'Total', maks: 'maks. 500 sekali cetak', vJumlah: 'Kartu dengan bonus voucher', vKode: 'Kode voucher', vTeks: 'Teks voucher untuk pembeli',
      ketVoucher: 'Bonus voucher diselipkan acak di antara kartu. Pembeli baru tahu setelah memindai.', buat: 'Buat kode', buatCetak: 'Cetak', cetakLagi: 'Cetak lagi',
      dibuat: 'kode dibuat untuk', dariAcara: 'event', kartuUntuk: 'Kartu koleksi untuk', pindai: 'Pindai untuk membuka kartumu di Kitab Mofmofriends', atauKetik: 'atau ketik kodenya di mofmofriends-kitab.pages.dev',
      strukJudul: 'Klaim struk', tanpaStruk: 'Tidak ada struk yang menunggu.', lihatFoto: 'Lihat foto', setujui: 'Setujui', tolak: 'Tolak', yakinTolak: 'Yakin tolak?', kartuDibuka: 'Kartu yang dibuka',
      ketStruk: 'Cek gerai, tanggal, dan barang di foto. Hapus centang barang yang tidak ada di struk.', dibeli: 'dibeli', diputus: 'Selesai', pilihKartu: 'Pilih minimal satu kartu.'
    }
  };
  var BULAN = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] };
  var W = window;
  function M() { return W.__wms || {}; }
  function bhs() { return M().bhs && M().bhs() === 'id' ? 'id' : 'en'; }
  function t(k) { var d = TEKS[bhs()]; return d[k] != null ? d[k] : (TEKS.en[k] != null ? TEKS.en[k] : k); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function nf(n) { return Number(n || 0).toLocaleString('en-US'); }
  function el(i) { return document.getElementById(i); }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function tgl(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Number(m[3]) + ' ' + BULAN[bhs()][Number(m[2]) - 1] + ' ' + m[1] : esc(s); }
  function kodeTampil(k) { return String(k).replace(/^(.{4})(.{4})(.*)$/, '$1 $2 $3'); }

  var A = { tab: 'ringkas', ringkas: null, galat: '', sibuk: false, struk: null, foto: {}, pilih: {}, tolakYakin: 0, qty: {}, v: { jumlah: 0, kode: '', teks: '' }, hasilCetak: null, simpanOk: {}, pesan: '', dari: null };
  function panggil(aksi, isi) {
    var badan = Object.assign({ fn: 'admin', aksi: aksi, tiket: (M().S && M().S.tiket) || '' }, isi || {});
    return fetch(KITAB, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(badan), credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (h) { if (h && h.perluMasuk) throw new Error(t('sesiHabis')); return h; }, function () { throw new Error(t('gagal')); });
  }
  function muatRingkas() {
    A.galat = ''; A.sibuk = true; gambar();
    return panggil('ringkas').then(function (h) { A.sibuk = false; if (!h.ok) throw new Error(h.pesan || t('gagal')); A.ringkas = h; gambar(); }, function (e) { A.sibuk = false; A.galat = e.message; gambar(); });
  }
  function muatStruk() {
    A.galat = ''; A.struk = null; gambar();
    return panggil('struk').then(function (h) {
      if (!h.ok) throw new Error(h.pesan || t('gagal'));
      A.struk = h.baris; h.baris.forEach(function (b) { if (!A.pilih[b.id]) { A.pilih[b.id] = {}; (b.produk || []).forEach(function (k) { A.pilih[b.id][k] = true; }); } });
      gambar();
    }, function (e) { A.galat = e.message; gambar(); });
  }

  /* ---------- kerangka lembar (pakai gaya .alat-latar milik alat.js) ---------- */
  function pastikanDom() {
    if (el('kitabkuAdmin')) return el('kitabkuAdmin');
    var d = document.createElement('div');
    d.id = 'kitabkuAdmin'; d.className = 'alat-latar kitabku-latar'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="lembar" role="dialog" aria-modal="true" aria-label="Kitabku" tabindex="-1"><div class="kepala-alat"><div class="tab-alat" role="tablist"></div><button type="button" class="tutup-alat" data-kb="tutup"></button></div><div class="isi-alat" id="kbIsi"></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', klik);
    d.addEventListener('input', ketik);
    d.addEventListener('change', ketik);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('buka')) { e.preventDefault(); tutup(); } });
    return d;
  }
  function buka(tab) {
    var d = pastikanDom();
    if (!d.classList.contains('buka')) A.dari = document.activeElement;
    A.tab = tab || A.tab || 'ringkas';
    d.classList.add('buka'); d.setAttribute('aria-hidden', 'false'); document.body.classList.add('alat-terbuka');
    var l = d.querySelector('.lembar'); try { l.focus({ preventScroll: true }); } catch (e) { l.focus(); }
    if (A.tab === 'struk') muatStruk(); else muatRingkas();
  }
  function tutup() {
    var d = el('kitabkuAdmin'); if (!d) return;
    d.classList.remove('buka'); d.setAttribute('aria-hidden', 'true'); document.body.classList.remove('alat-terbuka');
    try { if (A.dari && A.dari.focus) A.dari.focus(); } catch (e) {}
  }
  function gambar() {
    var d = el('kitabkuAdmin'); if (!d) return;
    d.querySelector('.tab-alat').innerHTML = ['ringkas', 'cetak', 'struk'].map(function (m) {
      var on = A.tab === m, n = m === 'struk' && A.ringkas && A.ringkas.angka ? A.ringkas.angka.struk : 0;
      return '<button type="button" role="tab" data-kbtab="' + m + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '">' + esc(t(m === 'ringkas' ? 'tabRingkas' : m === 'cetak' ? 'tabCetak' : 'tabStruk')) + (n ? ' <b class="kb-lencana">' + n + '</b>' : '') + '</button>';
    }).join('');
    var tt = d.querySelector('.tutup-alat'); tt.setAttribute('aria-label', t('tutup')); tt.title = t('tutup');
    tt.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var isi = A.galat ? '<div class="tolak-alat" role="alert">' + esc(A.galat) + '</div><button type="button" class="btn dua" data-kb="ulang">' + esc(t('ulang')) + '</button>' : '';
    if (!A.galat) isi = A.tab === 'cetak' ? htmlCetak() : A.tab === 'struk' ? htmlStruk() : htmlRingkas();
    el('kbIsi').innerHTML = isi;
  }

  /* ---------- event & hadiah ---------- */
  function htmlRingkas() {
    var r = A.ringkas; if (!r) return '<p class="ket-alat">' + esc(t('muat')) + '</p>';
    var a = r.angka || {}, ac = r.acara;
    var kpi = [['kKartu', a.kartu], ['kPemain', a.pemain], ['kStruk', a.struk], ['kKlaim', a.klaim], ['kKode', a.kode, a.dipakai]].map(function (x) {
      return '<div class="kb-kpi"><span>' + esc(t(x[0])) + '</span><b>' + nf(x[1]) + '</b>' + (x[2] != null ? '<small>' + nf(x[2]) + ' ' + esc(t('kDipakai')) + '</small>' : '') + '</div>';
    }).join('');
    var acara = '<section class="kb-kotak"><h3>' + esc(t('acara')) + '</h3>' + (ac ? '<p class="kb-acara"><b>' + esc(ac.nama) + '</b> <span class="kb-cap">' + esc(ac.cap) + '</span> ' + tgl(ac.mulai) + ' – ' + tgl(ac.selesai) + '</p>' : '<p class="ket-alat">' + esc(t('tanpaAcara')) + '</p>') +
      '<details class="kb-det"' + (ac ? '' : ' open') + '><summary>' + esc(t('acaraBaru')) + '</summary><div class="kb-form4">' +
      '<label>' + esc(t('nama')) + '<input id="kbAcNama" maxlength="60" placeholder="11.11 Big Sale"></label><label>' + esc(t('cap')) + '<input id="kbAcCap" maxlength="12" placeholder="11.11"></label>' +
      '<label>' + esc(t('mulai')) + '<input id="kbAcMulai" type="date"></label><label>' + esc(t('selesai')) + '<input id="kbAcSelesai" type="date"></label></div>' +
      '<p class="ket-alat">' + esc(t('ketAcara')) + '</p><button type="button" class="btn" data-kb="acara">' + esc(t('simpanAcara')) + '</button></details></section>';
    var rows = (r.hadiah || []).map(htmlHadiah).join('');
    var hadiah = '<section class="kb-kotak"><h3>' + esc(t('hadiah')) + '</h3><p class="ket-alat">' + esc(t('ketHadiah')) + '</p>' +
      (rows || '<p class="ket-alat">' + esc(t('tanpaHadiah')) + '</p>') +
      '<details class="kb-det"><summary>' + esc(t('hadiahBaru')) + '</summary>' + htmlHadiah({ id: '', jenis: 'kartu', angka: 3, saluran: 'semua', aktif: false, baru: true }) + '</details>' +
      (rows ? '' : '<button type="button" class="btn dua" data-kb="usulan">' + esc(t('usulan')) + '</button>') + '</section>';
    return (A.pesan ? '<div class="tolak-alat" role="alert">' + esc(A.pesan) + '</div>' : '') + '<div class="kb-kpis">' + kpi + '</div>' + acara + hadiah;
  }
  function htmlHadiah(h) {
    var k = h.baru ? 'baru' : h.id, sel = function (nm, opsi, nilai) { return '<select data-f="' + nm + '">' + opsi.map(function (o) { return '<option value="' + o[0] + '"' + (String(nilai) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
    var inp = function (nm, nilai, ph, tipe) { return '<input data-f="' + nm + '"' + (tipe ? ' type="' + tipe + '"' : '') + ' value="' + esc(nilai == null ? '' : nilai) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>'; };
    return '<div class="kb-hadiah' + (h.aktif ? ' nyala' : '') + '" data-hadiah="' + esc(k) + '">' +
      '<div class="kb-hkepala">' + (h.baru ? '<label class="kb-id">' + esc(t('idHadiah')) + inp('id', h.id || '', 'patok5') + '</label>' : '<b>' + esc(judulAdmin(h)) + '</b><code>' + esc(h.id) + '</code>') +
      '<label class="kb-saklar"><input type="checkbox" data-f="aktif"' + (h.aktif ? ' checked' : '') + '> ' + esc(t('aktif')) + '</label></div>' +
      '<div class="kb-hgrid">' +
      '<label>' + esc(t('judulH')) + inp('judul', h.judul) + '</label>' +
      '<label>' + esc(t('jenis')) + sel('jenis', [['kartu', t('j_kartu')], ['bab', t('j_bab')], ['bintang', t('j_bintang')], ['edisi', t('j_edisi')]], h.jenis) + '</label>' +
      '<label>' + esc(t('angka')) + (h.jenis === 'bab' ? sel('angka', BAB.map(function (b, i) { return [i, ROM[i] + ' · ' + b]; }), h.angka) : inp('angka', h.angka, '', 'number')) + '</label>' +
      '<label>' + esc(t('saluran')) + sel('saluran', [['semua', t('semua')], ['online', t('online')]], h.saluran) + '</label>' +
      '<label>' + esc(t('isi')) + inp('hadiah', h.hadiah) + '</label>' +
      '<label>' + esc(t('nominal')) + inp('nominal', h.nominal, 'Rp…') + '</label>' +
      '<label>' + esc(t('minBelanja')) + inp('min_belanja', h.min_belanja, 'Rp…') + '</label>' +
      '<label>' + esc(t('voucher')) + inp('voucher', h.voucher) + '</label>' +
      '<label>' + esc(t('kuota')) + inp('kuota', h.kuota || 0, '', 'number') + (h.baru ? '' : '<small>' + nf(h.terpakai) + ' ' + esc(t('terpakai')) + '</small>') + '</label>' +
      '</div><div class="kb-hbawah">' + (!h.baru && !h.nominal && h.voucher == null ? '<small class="kb-mut">' + esc(t('kosongNominal')) + '</small>' : '') +
      '<button type="button" class="btn" data-kb="hadiah" data-id="' + esc(k) + '">' + esc(A.simpanOk[k] ? t('tersimpan') : t('simpan')) + '</button></div></div>';
  }
  function judulAdmin(h) {
    if (h.judul) return h.judul;
    var n = h.jenis === 'bab' ? 'Bab ' + ROM[Number(h.angka)] + ' · ' + BAB[Number(h.angka)] : h.jenis === 'bintang' ? '★★★' : h.angka;
    return t('j_' + h.jenis) + ' ' + n;
  }
  function bacaHadiah(k) {
    var box = document.querySelector('[data-hadiah="' + k + '"]'); if (!box) return null;
    var h = { id: k === 'baru' ? '' : k };
    box.querySelectorAll('[data-f]').forEach(function (x) { var f = x.getAttribute('data-f'); h[f] = x.type === 'checkbox' ? x.checked : x.value; });
    h.angka = Number(h.angka || 0); h.kuota = Number(h.kuota || 0);
    if (!h.voucher) h.voucher = null;
    return h;
  }
  function simpanHadiah(k) {
    var h = bacaHadiah(k); if (!h) return;
    A.pesan = '';
    panggil('hadiah', { hadiah: h }).then(function (r) {
      if (!r.ok) { A.pesan = r.pesan; bunyi('scanTolak'); gambar(); return; }
      bunyi('scanOk'); A.simpanOk = {}; A.simpanOk[h.id] = 1; return muatRingkas();
    }, function (e) { A.pesan = e.message; gambar(); });
  }
  function pasangUsulan() {
    var i = 0;
    var lanjut = function () {
      if (i >= USULAN.length) return muatRingkas();
      var u = USULAN[i++];
      return panggil('hadiah', { hadiah: Object.assign({ nominal: '', min_belanja: '', voucher: null, kuota: 0, aktif: false }, u) }).then(lanjut, function (e) { A.pesan = e.message; gambar(); });
    };
    lanjut();
  }
  function simpanAcara() {
    var a = { nama: el('kbAcNama').value, cap: el('kbAcCap').value, mulai: el('kbAcMulai').value, selesai: el('kbAcSelesai').value };
    A.pesan = '';
    panggil('acara', { acara: a }).then(function (r) { if (!r.ok) { A.pesan = r.pesan; bunyi('scanTolak'); gambar(); return; } bunyi('scanOk'); muatRingkas(); }, function (e) { A.pesan = e.message; gambar(); });
  }

  /* ---------- cetak kartu QR ---------- */
  function totalQty() { var n = 0; Object.keys(A.qty).forEach(function (k) { n += Number(A.qty[k]) || 0; }); return n; }
  function htmlCetak() {
    var ac = A.ringkas && A.ringkas.acara;
    if (A.ringkas && !ac) return '<div class="tolak-alat">' + esc(t('tanpaAcara')) + '</div>';
    var grup = BAB.map(function (b, ci) {
      return '<details class="kb-det"' + (KARTU.some(function (k) { return k[1] === ci && A.qty[k[0]]; }) ? ' open' : '') + '><summary>' + ROM[ci] + ' · ' + esc(b) + '</summary><div class="kb-qty">' +
        KARTU.filter(function (k) { return k[1] === ci; }).map(function (k) { return '<label><span>' + esc(namaKartu(k[0])) + '</span><input type="number" min="0" max="500" inputmode="numeric" data-qty="' + k[0] + '" value="' + (A.qty[k[0]] || '') + '" placeholder="0"></label>'; }).join('') + '</div></details>';
    }).join('');
    var n = totalQty();
    var hasil = A.hasilCetak ? '<div class="kb-hasil"><b>' + nf(A.hasilCetak.kode.length) + '</b> ' + esc(t('dibuat')) + ' ' + esc(t('dariAcara')) + ' <span class="kb-cap">' + esc(A.hasilCetak.acara.cap) + '</span> <button type="button" class="btn" data-kb="cetakLagi">' + esc(t('cetakLagi')) + '</button></div>' : '';
    return (A.pesan ? '<div class="tolak-alat" role="alert">' + esc(A.pesan) + '</div>' : '') + hasil +
      '<section class="kb-kotak"><h3>' + esc(t('cetakJudul')) + (ac ? ' <span class="kb-cap">' + esc(ac.cap) + '</span>' : '') + '</h3><p class="ket-alat">' + esc(t('ketCetak')) + '</p>' + grup +
      '<p class="kb-total">' + esc(t('total')) + ' <b id="kbTotal">' + n + '</b> <small>' + esc(t('maks')) + '</small></p></section>' +
      '<section class="kb-kotak"><div class="kb-form4"><label>' + esc(t('vJumlah')) + '<input id="kbVJml" type="number" min="0" value="' + (A.v.jumlah || '') + '" placeholder="0"></label><label>' + esc(t('vKode')) + '<input id="kbVKode" value="' + esc(A.v.kode) + '"></label><label class="lebar">' + esc(t('vTeks')) + '<input id="kbVTeks" value="' + esc(A.v.teks) + '" placeholder="Potongan Rp…"></label></div><p class="ket-alat">' + esc(t('ketVoucher')) + '</p></section>' +
      '<button type="button" class="btn" data-kb="buat"' + (n < 1 || n > 500 || A.sibuk ? ' disabled' : '') + '>' + esc(t('buat')) + ' & ' + esc(t('buatCetak')) + '</button>';
  }
  function htmlKartuCetak(r, cap) {
    return '<div class="kartu-kitab"><div class="kk-qr">' + qrSvg(SITUS + r.kode) + '</div><div class="kk-teks"><small>MOFMOFRIENDS · ' + esc(cap) + '</small><span class="kk-untuk">' + esc(t('kartuUntuk')) + '</span><b class="kk-produk">' + esc(namaKartu(r.kartu)) + '</b>' +
      '<span class="kk-kode">' + esc(kodeTampil(r.kode)) + '</span><span class="kk-ajak">' + esc(t('pindai')) + '</span><span class="kk-situs">' + esc(t('atauKetik')) + '</span></div></div>';
  }
  function cetakKartu() {
    var h = A.hasilCetak; if (!h) return;
    /* urut per produk supaya pengemas tinggal ambil kartu sesuai barang */
    var urut = h.kode.slice().sort(function (a, b) { return KARTU.indexOf(PER[a.kartu]) - KARTU.indexOf(PER[b.kartu]); });
    var w = document.createElement('div'); w.id = 'lembarKitab'; w.innerHTML = urut.map(function (r) { return htmlKartuCetak(r, h.acara.cap); }).join('');
    document.body.appendChild(w); document.body.classList.add('cetak-kitab');
    var beres = function () { document.body.classList.remove('cetak-kitab'); if (w.parentNode) w.parentNode.removeChild(w); };
    try { W.print(); } finally { setTimeout(beres, 0); }
  }
  function buatKode() {
    var item = Object.keys(A.qty).filter(function (k) { return Number(A.qty[k]) > 0; }).map(function (k) { return { kartu: k, qty: Number(A.qty[k]) }; });
    A.sibuk = true; A.pesan = ''; gambar();
    panggil('cetak', { item: item, voucherJumlah: Number(A.v.jumlah) || 0, voucherKode: A.v.kode, voucherTeks: A.v.teks }).then(function (r) {
      A.sibuk = false;
      if (!r.ok) { A.pesan = r.pesan; bunyi('scanTolak'); gambar(); return; }
      A.hasilCetak = r; A.qty = {}; A.v = { jumlah: 0, kode: '', teks: '' }; bunyi('scanOk'); gambar(); cetakKartu();
    }, function (e) { A.sibuk = false; A.pesan = e.message; gambar(); });
  }

  /* ---------- klaim struk ---------- */
  function htmlStruk() {
    if (!A.struk) return '<p class="ket-alat">' + esc(t('muat')) + '</p>';
    if (!A.struk.length) return '<p class="ket-alat">' + esc(t('tanpaStruk')) + '</p>';
    return (A.pesan ? '<div class="tolak-alat" role="alert">' + esc(A.pesan) + '</div>' : '') + '<p class="ket-alat">' + esc(t('ketStruk')) + '</p>' + A.struk.map(function (b) {
      var pil = A.pilih[b.id] || {};
      return '<div class="kb-struk" data-struk="' + b.id + '"><div class="kb-skepala"><b>' + esc(b.nama) + '</b><span>' + esc(b.gerai) + ' · ' + tgl(b.tanggal) + '</span><small>#' + b.id + '</small></div>' +
        (A.foto[b.id] ? '<img class="kb-foto" src="' + esc(A.foto[b.id]) + '" alt="">' : '<button type="button" class="btn dua" data-kb="foto" data-id="' + b.id + '">' + esc(t('lihatFoto')) + '</button>') +
        '<span class="lbl">' + esc(t('kartuDibuka')) + '</span><div class="kb-pilih">' + (b.produk || []).map(function (k) { return '<label class="chip-alat"><input type="checkbox" data-pilih="' + b.id + '" value="' + esc(k) + '"' + (pil[k] ? ' checked' : '') + '> ' + esc(namaKartu(k)) + '</label>'; }).join('') + '</div>' +
        '<div class="kb-hbawah"><button type="button" class="btn dua" data-kb="tolak" data-id="' + b.id + '">' + esc(A.tolakYakin === b.id ? t('yakinTolak') : t('tolak')) + '</button><button type="button" class="btn" data-kb="setujui" data-id="' + b.id + '">' + esc(t('setujui')) + '</button></div></div>';
    }).join('');
  }
  function lihatFoto(id) {
    panggil('fotoStruk', { id: id }).then(function (r) { if (r.ok && /^data:image\//.test(r.foto)) { A.foto[id] = r.foto; } else A.pesan = r.pesan || t('gagal'); gambar(); }, function (e) { A.pesan = e.message; gambar(); });
  }
  function putus(id, setuju) {
    var kartu = Object.keys(A.pilih[id] || {}).filter(function (k) { return A.pilih[id][k]; });
    if (setuju && !kartu.length) { A.pesan = t('pilihKartu'); bunyi('scanTolak'); gambar(); return; }
    A.pesan = '';
    panggil('putusStruk', { id: id, setuju: setuju, kartu: kartu }).then(function (r) {
      if (!r.ok) { A.pesan = r.pesan; gambar(); return; }
      bunyi(setuju ? 'scanOk' : 'klik'); A.tolakYakin = 0; delete A.foto[id];
      A.struk = A.struk.filter(function (b) { return b.id !== id; });
      if (A.ringkas && A.ringkas.angka) A.ringkas.angka.struk = A.struk.length;
      gambar();
    }, function (e) { A.pesan = e.message; gambar(); });
  }

  /* ---------- aksi ---------- */
  function klik(e) {
    var d = el('kitabkuAdmin');
    if (e.target === d) { tutup(); return; }
    var x = e.target.closest ? e.target.closest('[data-kb],[data-kbtab]') : null; if (!x) return;
    if (x.hasAttribute('data-kbtab')) { bunyi('klik'); A.tab = x.getAttribute('data-kbtab'); A.pesan = ''; A.tolakYakin = 0; if (A.tab === 'struk') muatStruk(); else if (!A.ringkas) muatRingkas(); else gambar(); return; }
    var a = x.getAttribute('data-kb'), id = Number(x.getAttribute('data-id'));
    if (a !== 'tolak') A.tolakYakin = 0;
    if (a === 'tutup') tutup();
    else if (a === 'ulang') { if (A.tab === 'struk') muatStruk(); else muatRingkas(); }
    else if (a === 'acara') simpanAcara();
    else if (a === 'hadiah') simpanHadiah(x.getAttribute('data-id'));
    else if (a === 'usulan') pasangUsulan();
    else if (a === 'buat') buatKode();
    else if (a === 'cetakLagi') cetakKartu();
    else if (a === 'foto') lihatFoto(id);
    else if (a === 'setujui') putus(id, true);
    else if (a === 'tolak') { if (A.tolakYakin === id) putus(id, false); else { A.tolakYakin = id; gambar(); } }
  }
  function ketik(e) {
    var x = e.target;
    if (x.hasAttribute('data-qty')) { A.qty[x.getAttribute('data-qty')] = Math.max(0, Math.floor(Number(x.value) || 0)); var n = totalQty(), tt = el('kbTotal'); if (tt) tt.textContent = n; var b = document.querySelector('[data-kb="buat"]'); if (b) b.disabled = n < 1 || n > 500; return; }
    if (x.id === 'kbVJml') A.v.jumlah = Number(x.value) || 0; else if (x.id === 'kbVKode') A.v.kode = x.value; else if (x.id === 'kbVTeks') A.v.teks = x.value;
    if (x.hasAttribute('data-pilih')) { var sid = x.getAttribute('data-pilih'); A.pilih[sid] = A.pilih[sid] || {}; A.pilih[sid][x.value] = x.checked; }
    if (e.type === 'change' && x.getAttribute('data-f') === 'jenis') {
      /* ganti jenis: kolom target berubah antara angka dan pilihan bab */
      var box = x.closest('[data-hadiah]'), k = box.getAttribute('data-hadiah'), h = bacaHadiah(k); h.baru = k === 'baru';
      h.angka = h.jenis === 'bab' ? 0 : (h.jenis === 'bintang' ? 3 : h.angka || 3); box.outerHTML = htmlHadiah(h);
    }
  }
  W.WmsKitabku = { buka: buka, tutup: tutup, qrMatriks: qrMatriks, qrSvg: qrSvg };
})();
