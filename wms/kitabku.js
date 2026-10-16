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
  /* Foto kartu cetak (wms/img/kartu, potongan dari foto Shopee resolusi penuh), dicari dari letak kitabku.js
     supaya jalan di wms.mofmofriends.id maupun di halaman uji. */
  var FOTO_KARTU = { '4582586962058': 'bear', '4582586963260': 'panda', '4582586963291': 'panda', '4582586966605': 'redpanda', '4582586966636': 'redpanda', '4582586966629': 'koala',
    '4582586966612': 'elephant', '4582586966643': 'elephant', '4582586964403': 'reindeer', '4582586962737': 'otter', '4582586962126': 'collie', '4582586962225': 'angora',
    '4582586962133': 'lamb', '4582586950512': 'shiba', '4582586950536': 'shiba', '4582586964434': 'pekingese',
    '4582586966988': 'kc_rabbit', '4582586967015': 'kc_bear', '4582586966971': 'kc_bichon', '4582586966995': 'kc_bsh', '4582586966544': 'kc_shiba', '4582586964311': 'kc_lamb', '4582586964274': 'kc_tiger', '4582586964298': 'kc_cow',
    '4582586966780': 'kr_rabbit', '4582586966810': 'kr_bear', '4582586966773': 'kr_bichon', '4582586966827': 'kr_tiger', '4582586966797': 'kr_bsh',
    '4582586965714': 'mb_tiger', '4582586965721': 'mb_collie', '4582586965738': 'mb_lamb', '4582586965707': 'mb_panda',
    '4589715755918': 'rs_rabbit', '4589715755925': 'rs_bsh', '4582586968333': 'bp_ivory', '4582586968357': 'bp_green', '4582586968364': 'bp_blue', '4582586968340': 'bp_pink',
    '4582586961822': 'cap_rabbit', '4582586964014': 'cap_melon', '4582586964021': 'cap_banana', '4582586966360': 'cap_tomato' };
  var DASAR = (function () { try { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^\/]*$/, '') : ''; } catch (e) { return ''; } })();
  function namaKartu(bc) { var k = PER[bc]; if (!k) return bc; return k[2].replace(' (Key Charm)', '') + ' · ' + k[3]; }
  var KITAB = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/kitab';
  var SITUS = 'https://mofmofriends.id/#k=';
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
    /* 16 Okt malam, Ferdy: hadiah game cuma lewat papan Total (akumulatif), bukan bintang per game */
    { id: 'papanTotal', judul: '', jenis: 'papan', angka: 10, saluran: 'semua', hadiah: 'Voucher Shopee' },
    { id: 'edisi', judul: '', jenis: 'edisi', angka: 3, saluran: 'semua', hadiah: 'Hadiah edisi' }
  ];

  var TEKS = {
    en: {
      judul: 'Kitabku', judulH: 'Title', tabRingkas: 'Event & rewards', tabCetak: 'Print QR cards', tabStruk: 'Receipt claims', tabPasang: 'Link card', tabTemplate: 'Templates', tutup: 'Close', tp_judul: 'Design templates', tp_ket: 'Saved in Google Drive, folder Arsip Template Mofmo Collection, one folder per event. Files stay private to the Drive owner.', tp_acara: 'Event', tp_berkas: 'Files (PNG, JPG, PDF, AI, PSD, SVG, ZIP; max 15 MB each)', tp_catatan: 'Note (optional)', tp_unggah: 'Upload', tp_kirim: 'Uploading…', tp_kosong: 'No templates archived yet.', tp_final: 'FINAL', tp_jadiFinal: 'Mark final', tp_batalFinal: 'Unmark final', tp_buka: 'Open in Drive', tp_besar: function (n) { return n + ' is larger than 15 MB. Shrink it first or save it straight to Drive.'; }, tp_tanpaAcara: 'Fill in the event name first.', tp_tanpaBerkas: 'Choose a file first.', tp_ok: function (n) { return n + ' file(s) uploaded.'; }, tp_gagal: function (n, p) { return n + ' failed: ' + p; },
      muat: 'Loading…', gagal: 'The Kitabku server could not be reached. Check the signal and try again.', ulang: 'Try again', sesiHabis: 'Your WMS session has ended. Sign in again.',
      kKartu: 'Cards unlocked', kPemain: 'Collectors', kStruk: 'Receipts waiting', kKlaim: 'Rewards claimed', kKode: 'Shopee cards printed', kDipakai: 'scanned',
      acara: 'Active event', tanpaAcara: 'No event yet. Create one before printing cards.', acaraBaru: 'New event', nama: 'Name', cap: 'Stamp', mulai: 'Start', selesai: 'End',
      simpanAcara: 'Start this event', ketAcara: 'Starting a new event ends the current one. Leaderboards restart, cards keep their old stamp.',
      hadiah: 'Rewards', ketHadiah: 'Rewards switched on appear in every buyer\'s book. Voucher codes are created by hand in Shopee Seller Centre; paste the code here.',
      jenis: 'Type', angka: 'Target', saluran: 'Counts', semua: 'All cards', online: 'Shopee cards only', isi: 'Reward', nominal: 'Value', minBelanja: 'Min. spend',
      voucher: 'Voucher code', kuota: 'Quota', terpakai: 'claimed', aktif: 'On', simpan: 'Save', tersimpan: 'Saved', usulan: 'Add the mockup rewards (switched off)',
      j_kartu: 'Cards collected', j_bab: 'Chapter complete', j_bintang: 'Game stars', j_edisi: 'Edition cards', j_papan: 'Total leaderboard', pemenang: 'Number of winners', ketPapan: 'Buyers ranked 1 to this number on the Total leaderboard can claim it after the edition ends. Set the quota to the same number. The voucher can be filled in later.', hadiahBaru: 'New reward', idHadiah: 'ID (letters, no spaces)',
      tanpaHadiah: 'No rewards yet.', kosongNominal: 'value not set',
      berlakuSampai: 'Valid until', berlakuUntuk: 'Applies to', semuaProduk: 'All shop products', maksPembeli: 'Max. uses per buyer', syarat: 'Terms shown to the buyer', syaratPh: 'e.g. One use per Shopee account. Cannot be exchanged for cash.',
      cetakJudul: 'QR cards for Shopee parcels', ketCetak: 'One card per item packed. The code works once: the first book that scans it keeps it. Output: a ZIP of 300 dpi PNG files, one per card (140 x 60 mm), ready for the print vendor.',
      jumlah: 'Qty', total: 'Total', maks: 'max 500 per print', vJumlah: 'Cards with a bonus voucher', vKode: 'Voucher code', vTeks: 'Voucher text shown to the buyer',
      ketVoucher: 'Bonus vouchers are mixed randomly into the batch. The buyer only sees it after scanning.', buat: 'Create codes', buatCetak: 'Download PNG', cetakLagi: 'Download PNG again', bikinPng: 'Making PNG', gagalPng: 'Could not make the PNG files: ',
      paketJudul: 'Shopee parcel QR cards (print in-house)', ketPaket: 'One card per parcel. The card is not tied to a product: its contents are linked at packing, in the Kode Kartu QR column of the warehouse Excel or in the Link card tab. Every card carries a voucher. Print on A4, 4 cards per sheet (140 x 60 mm), then cut.',
      pJumlah: 'Number of cards', pVKode: 'Shopee voucher code (required)', pVSampai: 'Valid until (required)', pVSampaiKet: 'Same as the voucher end date on Shopee. Buyers see it with the days left.', pVTeks: 'Voucher text shown to the buyer', pVTeksPh: 'e.g. Rp15,000 off, min. spend Rp150,000', buatPaket: 'Create codes & print A4', cetakA4Lagi: 'Print A4 again', unduhPng: 'Download PNG', siapCetak: 'Preparing the print sheet…',
      dibuat: 'codes created for', dariAcara: 'event', kartuUntuk: 'Collection card for', pindai: 'Scan to unlock your card in the Mofmofriends Book', atauKetik: 'or type the code at mofmofriends.id',
      strukJudul: 'Receipt claims', tanpaStruk: 'No receipts waiting.', lihatFoto: 'Show photo', setujui: 'Approve', tolak: 'Reject', yakinTolak: 'Reject for sure?', kartuDibuka: 'Cards to unlock',
      ketStruk: 'Check the store, date, and items on the photo. Untick items that are not on the receipt.', dibeli: 'bought', diputus: 'Done', pilihKartu: 'Pick at least one card.',
      psJudul: 'Link a parcel card to a Shopee order', psKet: 'Daily work goes through the Kode Kartu QR column in the warehouse Excel. Use this tab as a backup, or to fix a card linked to the wrong order. Scan the order number, then scan the card. A card scanned without an order number is only checked.',
      psPesanan: 'Order number', psKartu: 'Card code (scan the QR)', psTombol: 'Link', psLog: 'Linked on this device', psKosong: 'Nothing linked yet.',
      ps_ok: function (k, p) { return 'Card ' + k + ' is now linked to order ' + p + '.'; }, ps_pindah: function (l) { return ' Released: ' + l + '.'; },
      ps_sudah: function (k, p) { return 'Card ' + k + ' was already linked to order ' + p + '. Nothing changed.'; },
      ps_lain: function (k, l) { return 'Card ' + k + ' is already linked to order ' + l + '. If this card really belongs in this parcel, move it.'; },
      ps_penuh: function (p, l) { return 'Order ' + p + ' already has card ' + l + '. One parcel holds one card. Replace it only if the old card is not in the parcel.'; },
      ps_bukan: 'This is a per-product card (the old kind), not a parcel card. It cannot be linked to an order.',
      ps_tidak: 'Card code not recognised. Scan again or check the letters on the card.', ps_salah: 'The order number or the card code could not be read. Order numbers use only letters and digits.',
      ps_dipakai: 'This card was already opened by a buyer, so it cannot be moved.', ps_terbuka: function (l) { return 'The old card ' + l + ' on this order was already opened by the buyer, so it cannot be replaced.'; },
      psPindah: 'Move card to this order', psGanti: 'Replace with this card', ps_cek: function (k, p) { return p ? 'Card ' + k + ' is linked to order ' + p + '.' : 'Card ' + k + ' is not linked to any order yet.'; },
      ps_cekBuka: ' The buyer has opened it.', ps_cekLama: 'This is a per-product card (the old kind).',
      kamera: 'Camera', kamTutup: 'Close camera', kamArahKartu: 'Point the camera at the card QR.', kamArahPesanan: 'Point the camera at the order number barcode on the label.', kamMuat: 'Opening the camera…',
      kamGagal: 'The camera could not be opened. Allow camera access for this site in the browser settings, or use the scanner or type the code.'
    },
    id: {
      judul: 'Kitabku', judulH: 'Judul', tabRingkas: 'Event & hadiah', tabCetak: 'Cetak kartu QR', tabStruk: 'Klaim struk', tabPasang: 'Pasang kartu', tabTemplate: 'Template', tutup: 'Tutup', tp_judul: 'Template desain', tp_ket: 'Tersimpan di Google Drive, folder Arsip Template Mofmo Collection, satu folder per event. Berkas tetap privat milik pemilik Drive.', tp_acara: 'Event', tp_berkas: 'Berkas (PNG, JPG, PDF, AI, PSD, SVG, ZIP; maks 15 MB per berkas)', tp_catatan: 'Catatan (boleh kosong)', tp_unggah: 'Unggah', tp_kirim: 'Mengunggah…', tp_kosong: 'Belum ada template yang diarsipkan.', tp_final: 'FINAL', tp_jadiFinal: 'Tandai final', tp_batalFinal: 'Batal final', tp_buka: 'Buka di Drive', tp_besar: function (n) { return n + ' lebih dari 15 MB. Kecilkan dulu atau simpan langsung di Drive.'; }, tp_tanpaAcara: 'Isi nama event dulu.', tp_tanpaBerkas: 'Pilih berkasnya dulu.', tp_ok: function (n) { return n + ' berkas terunggah.'; }, tp_gagal: function (n, p) { return n + ' gagal: ' + p; },
      muat: 'Memuat…', gagal: 'Server Kitabku belum bisa dihubungi. Cek sinyal lalu coba lagi.', ulang: 'Coba lagi', sesiHabis: 'Sesi WMS sudah habis. Masuk lagi.',
      kKartu: 'Kartu terbuka', kPemain: 'Kolektor', kStruk: 'Struk menunggu', kKlaim: 'Hadiah diambil', kKode: 'Kartu Shopee dicetak', kDipakai: 'dipindai',
      acara: 'Event aktif', tanpaAcara: 'Belum ada event. Buat dulu sebelum mencetak kartu.', acaraBaru: 'Event baru', nama: 'Nama', cap: 'Cap', mulai: 'Mulai', selesai: 'Selesai',
      simpanAcara: 'Mulai event ini', ketAcara: 'Event baru menutup event yang berjalan. Papan peringkat mulai dari nol, kartu lama tetap bercap event lamanya.',
      hadiah: 'Hadiah', ketHadiah: 'Hadiah yang dinyalakan langsung tampil di buku setiap pembeli. Kode voucher dibuat manual di Shopee Seller Centre, lalu tempel kodenya di sini.',
      jenis: 'Jenis', angka: 'Target', saluran: 'Dihitung', semua: 'Semua kartu', online: 'Kartu Shopee saja', isi: 'Hadiah', nominal: 'Nilai', minBelanja: 'Min. belanja',
      voucher: 'Kode voucher', kuota: 'Kuota', terpakai: 'diambil', aktif: 'Nyala', simpan: 'Simpan', tersimpan: 'Tersimpan', usulan: 'Pasang hadiah dari mockup (nonaktif)',
      j_kartu: 'Jumlah kartu', j_bab: 'Bab lengkap', j_bintang: 'Bintang game', j_edisi: 'Kartu edisi', j_papan: 'Papan Total', pemenang: 'Jumlah pemenang', ketPapan: 'Pembeli peringkat 1 sampai angka ini di papan Total bisa klaim sesudah edisi selesai. Isi kuota sama dengan jumlah pemenang. Voucher boleh diisi belakangan.', hadiahBaru: 'Hadiah baru', idHadiah: 'ID (huruf, tanpa spasi)',
      tanpaHadiah: 'Belum ada hadiah.', kosongNominal: 'nilai belum diisi',
      berlakuSampai: 'Berlaku sampai', berlakuUntuk: 'Berlaku untuk', semuaProduk: 'Semua produk toko', maksPembeli: 'Maks. pakai per pembeli', syarat: 'Syarat dan ketentuan untuk pembeli', syaratPh: 'misal: Satu kali pakai per akun Shopee. Tidak dapat diuangkan.',
      cetakJudul: 'Kartu QR untuk paket Shopee', ketCetak: 'Satu kartu untuk setiap barang yang dikemas. Kode hanya berlaku sekali: buku pertama yang memindai yang memilikinya. Hasilnya ZIP berisi PNG 300 dpi, satu berkas per kartu (14 x 6 cm), siap dikirim ke vendor cetak.',
      jumlah: 'Jml', total: 'Total', maks: 'maks. 500 sekali cetak', vJumlah: 'Kartu dengan bonus voucher', vKode: 'Kode voucher', vTeks: 'Teks voucher untuk pembeli',
      ketVoucher: 'Bonus voucher diselipkan acak di antara kartu. Pembeli baru tahu setelah memindai.', buat: 'Buat kode', buatCetak: 'Unduh PNG', cetakLagi: 'Unduh PNG lagi', bikinPng: 'Membuat PNG', gagalPng: 'PNG gagal dibuat: ',
      paketJudul: 'Kartu QR paket Shopee (cetak sendiri)', ketPaket: 'Satu kartu untuk satu paket. Kartu tidak terikat produk: isinya diikat saat packing, lewat kolom Kode Kartu QR di Excel gudang atau tab Pasang kartu. Semua kartu membawa voucher. Cetak di kertas A4, 4 kartu per lembar (14 x 6 cm), lalu potong.',
      pJumlah: 'Jumlah kartu', pVKode: 'Kode voucher Shopee (wajib)', pVSampai: 'Berlaku sampai (wajib)', pVSampaiKet: 'Samakan dengan tanggal akhir voucher di Shopee. Pembeli melihatnya beserta sisa hari.', pVTeks: 'Teks voucher untuk pembeli', pVTeksPh: 'misal: Potongan Rp15.000, min. belanja Rp150.000', buatPaket: 'Buat kode & cetak A4', cetakA4Lagi: 'Cetak A4 lagi', unduhPng: 'Unduh PNG', siapCetak: 'Menyiapkan lembar cetak…',
      dibuat: 'kode dibuat untuk', dariAcara: 'event', kartuUntuk: 'Kartu koleksi untuk', pindai: 'Pindai untuk membuka kartumu di Kitab Mofmofriends', atauKetik: 'atau ketik kodenya di mofmofriends.id',
      strukJudul: 'Klaim struk', tanpaStruk: 'Tidak ada struk yang menunggu.', lihatFoto: 'Lihat foto', setujui: 'Setujui', tolak: 'Tolak', yakinTolak: 'Yakin tolak?', kartuDibuka: 'Kartu yang dibuka',
      ketStruk: 'Cek gerai, tanggal, dan barang di foto. Hapus centang barang yang tidak ada di struk.', dibeli: 'dibeli', diputus: 'Selesai', pilihKartu: 'Pilih minimal satu kartu.',
      psJudul: 'Pasang kartu paket ke pesanan Shopee', psKet: 'Kerja harian lewat kolom Kode Kartu QR di Excel gudang. Tab ini untuk cadangan, atau membetulkan kartu yang salah pasang. Scan No Pesanan, lalu scan kartunya. Kartu yang discan tanpa No Pesanan hanya dicek.',
      psPesanan: 'No Pesanan', psKartu: 'Kode kartu (scan QR)', psTombol: 'Pasang', psLog: 'Terpasang dari perangkat ini', psKosong: 'Belum ada yang dipasang.',
      ps_ok: function (k, p) { return 'Kartu ' + k + ' terpasang ke pesanan ' + p + '.'; }, ps_pindah: function (l) { return ' Dilepas: ' + l + '.'; },
      ps_sudah: function (k, p) { return 'Kartu ' + k + ' memang sudah terpasang ke pesanan ' + p + '. Tidak ada yang berubah.'; },
      ps_lain: function (k, l) { return 'Kartu ' + k + ' sudah terpasang ke pesanan ' + l + '. Kalau kartu ini memang masuk paket ini, pindahkan.'; },
      ps_penuh: function (p, l) { return 'Pesanan ' + p + ' sudah punya kartu ' + l + '. Satu paket satu kartu. Ganti hanya kalau kartu lama tidak ada di paket.'; },
      ps_bukan: 'Ini kartu per produk (cara lama), bukan kartu paket. Tidak bisa dipasang ke pesanan.',
      ps_tidak: 'Kode kartu tidak dikenal. Scan ulang atau cek huruf di kartunya.', ps_salah: 'No Pesanan atau kode kartu belum terbaca. No Pesanan hanya berisi huruf dan angka.',
      ps_dipakai: 'Kartu ini sudah dibuka pembeli, jadi tidak bisa dipindah.', ps_terbuka: function (l) { return 'Kartu lama ' + l + ' di pesanan ini sudah dibuka pembeli, jadi tidak bisa diganti.'; },
      psPindah: 'Pindahkan ke pesanan ini', psGanti: 'Ganti dengan kartu ini', ps_cek: function (k, p) { return p ? 'Kartu ' + k + ' terpasang ke pesanan ' + p + '.' : 'Kartu ' + k + ' belum terpasang ke pesanan mana pun.'; },
      ps_cekBuka: ' Sudah dibuka pembeli.', ps_cekLama: 'Ini kartu per produk (cara lama).',
      kamera: 'Kamera', kamTutup: 'Tutup kamera', kamArahKartu: 'Arahkan kamera ke QR kartu.', kamArahPesanan: 'Arahkan kamera ke barcode No Pesanan di label.', kamMuat: 'Membuka kamera…',
      kamGagal: 'Kamera tidak bisa dibuka. Beri izin kamera untuk situs ini di pengaturan browser, atau pakai scanner atau ketik kodenya.'
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

  var A = { tab: 'ringkas', ringkas: null, galat: '', sibuk: false, struk: null, foto: {}, pilih: {}, tolakYakin: 0, p: { jumlah: '', kode: '', teks: '', sampai: '' }, hasilPaket: null, mencetak: false, simpanOk: {}, pesan: '', dari: null,
    ps: { pesanan: '', kartu: '', hasil: null, tunda: null, log: [], sibuk: false }, kam: { aliran: null, v: null, t: null, sasaran: '', det: null, gagal: false } };
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
    d.addEventListener('keydown', tombolScan);
    /* scan berikutnya menimpa isi lama, bukan menyambung di belakangnya */
    d.addEventListener('focusin', function (e) { var x = e.target; if (x && (x.id === 'kbPsPesanan' || x.id === 'kbPsKartu') && x.select) x.select(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('buka')) { e.preventDefault(); tutup(); } });
    return d;
  }
  function buka(tab) {
    var d = pastikanDom();
    if (!d.classList.contains('buka')) A.dari = document.activeElement;
    A.tab = tab || A.tab || 'ringkas';
    d.classList.add('buka'); d.setAttribute('aria-hidden', 'false'); document.body.classList.add('alat-terbuka');
    var l = d.querySelector('.lembar'); try { l.focus({ preventScroll: true }); } catch (e) { l.focus(); }
    if (A.tab === 'struk') muatStruk(); else if (A.tab === 'pasang') { A.galat = ''; gambar(); fokusPs(); } else if (A.tab === 'template') muatTemplate(); else muatRingkas();
  }
  function tutup() {
    var d = el('kitabkuAdmin'); if (!d) return;
    matikanKamera();
    d.classList.remove('buka'); d.setAttribute('aria-hidden', 'true'); document.body.classList.remove('alat-terbuka');
    try { if (A.dari && A.dari.focus) A.dari.focus(); } catch (e) {}
  }
  function gambar() {
    var d = el('kitabkuAdmin'); if (!d) return;
    /* menggambar ulang membuang elemen video, jadi kamera yang masih menyala dimatikan dulu */
    if (A.kam && A.kam.aliran) matikanKamera();
    d.querySelector('.tab-alat').innerHTML = ['ringkas', 'cetak', 'pasang', 'struk', 'template'].map(function (m) {
      var on = A.tab === m, n = m === 'struk' && A.ringkas && A.ringkas.angka ? A.ringkas.angka.struk : 0;
      return '<button type="button" role="tab" data-kbtab="' + m + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '">' + esc(t(m === 'ringkas' ? 'tabRingkas' : m === 'cetak' ? 'tabCetak' : m === 'pasang' ? 'tabPasang' : m === 'template' ? 'tabTemplate' : 'tabStruk')) + (n ? ' <b class="kb-lencana">' + n + '</b>' : '') + '</button>';
    }).join('');
    /* tab aktif selalu kelihatan di HP (deretan tab digeser ke samping) */
    var on = d.querySelector('.tab-alat .on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
    var tt = d.querySelector('.tutup-alat'); tt.setAttribute('aria-label', t('tutup')); tt.title = t('tutup');
    tt.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var isi = A.galat ? '<div class="tolak-alat" role="alert">' + esc(A.galat) + '</div><button type="button" class="btn dua" data-kb="ulang">' + esc(t('ulang')) + '</button>' : '';
    if (!A.galat) isi = A.tab === 'cetak' ? htmlCetak() : A.tab === 'struk' ? htmlStruk() : A.tab === 'pasang' ? htmlPasang() : A.tab === 'template' ? htmlTemplate() : htmlRingkas();
    el('kbIsi').innerHTML = isi;
  }

  /* ---------- arsip template desain (16 Okt 2026, Ferdy: simpan di Google Drive) ----------
     Server: ArsipTemplate.gs di Apps Script (arsipTemplateDaftar, arsipTemplateUnggah, arsipTemplateFinal),
     dipanggil lewat jalan WMS dengan kata pengganti WMS-TIKET. Ukuran dicek di HP dulu supaya berkas
     besar tidak terkirim percuma lewat data seluler. */
  var TP_MAKS = 15 * 1024 * 1024;
  A.tp = { data: null, memuat: false, galat: '', acara: '', catatan: '', kirim: false, pesan: '', gagal: [] };
  function gas(nama, args) {
    var m = M(); if (!m.jalan) return Promise.reject(new Error(t('gagal')));
    return Promise.resolve(m.jalan(nama, ['WMS-TIKET'].concat(args || []))).then(function (r) { if (!r || r.ok === false) throw new Error((r && r.pesan) || t('gagal')); return r; });
  }
  function muatTemplate() {
    A.galat = ''; A.tp.memuat = true; gambar();
    if (!A.ringkas) panggil('ringkas').then(function (h) { if (h && h.ok) { A.ringkas = h; if (A.tab === 'template' && !A.tp.acara) gambar(); } }, function () {});
    return gas('arsipTemplateDaftar').then(function (r) { A.tp.memuat = false; A.tp.data = r; gambar(); }, function (e) { A.tp.memuat = false; A.galat = e.message; gambar(); });
  }
  function bacaBase64(f) {
    return new Promise(function (ok, gagal) { var r = new FileReader(); r.onload = function () { ok(String(r.result).replace(/^data:[^,]*,/, '')); }; r.onerror = function () { gagal(new Error(t('gagal'))); }; r.readAsDataURL(f); });
  }
  function unggahTemplate() {
    var inp = el('kbTpBerkas'), files = inp && inp.files ? [].slice.call(inp.files) : [];
    A.tp.acara = (el('kbTpAcara') || {}).value || ''; A.tp.catatan = (el('kbTpCatatan') || {}).value || '';
    A.tp.pesan = ''; A.tp.gagal = [];
    if (!A.tp.acara.trim()) { A.tp.gagal = [t('tp_tanpaAcara')]; bunyi('scanTolak'); gambar(); return; }
    if (!files.length) { A.tp.gagal = [t('tp_tanpaBerkas')]; bunyi('scanTolak'); gambar(); return; }
    var besar = files.filter(function (f) { return f.size > TP_MAKS; });
    if (besar.length) { A.tp.gagal = besar.map(function (f) { return t('tp_besar')(f.name); }); bunyi('scanTolak'); gambar(); return; }
    A.tp.kirim = true; gambar();
    var n = 0, i = 0;
    function lanjut() {
      if (i >= files.length) return Promise.resolve();
      var f = files[i++];
      return bacaBase64(f).then(function (data) { return gas('arsipTemplateUnggah', [{ acara: A.tp.acara, nama: f.name, mime: f.type, data: data, catatan: A.tp.catatan }]); })
        .then(function () { n++; }, function (e) { A.tp.gagal.push(t('tp_gagal')(f.name, e.message)); }).then(lanjut);
    }
    lanjut().then(function () { A.tp.kirim = false; A.tp.pesan = n ? t('tp_ok')(n) : ''; bunyi(A.tp.gagal.length ? 'scanTolak' : 'scanOk'); return muatTemplate(); });
  }
  function finalTemplate(id, final) {
    gas('arsipTemplateFinal', [id, final]).then(function () { bunyi('scanOk'); return muatTemplate(); }, function (e) { A.tp.gagal = [e.message]; gambar(); });
  }
  function ukuranTp(b) { return b >= 1048576 ? (Math.round(b / 104857.6) / 10) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function htmlTemplate() {
    var tp = A.tp, ac = A.ringkas && A.ringkas.acara ? A.ringkas.acara.nama : '';
    if (!tp.acara && ac) tp.acara = ac;
    var form = '<section class="kb-kotak"><h3>' + esc(t('tp_judul')) + '</h3><p class="ket-alat">' + esc(t('tp_ket')) + '</p>' +
      '<div class="kb-form4"><label>' + esc(t('tp_acara')) + '<input id="kbTpAcara" maxlength="60" value="' + esc(tp.acara) + '" placeholder="11.11 Big Sale"></label>' +
      '<label>' + esc(t('tp_catatan')) + '<input id="kbTpCatatan" maxlength="200" value="' + esc(tp.catatan) + '"></label></div>' +
      '<label class="kb-tp-berkas">' + esc(t('tp_berkas')) + '<input id="kbTpBerkas" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.tif,.tiff,.pdf,.ai,.eps,.psd,.zip"></label>' +
      (tp.gagal.length ? '<div class="tolak-alat" role="alert">' + tp.gagal.map(esc).join('<br>') + '</div>' : '') +
      (tp.pesan ? '<p class="ls-hasil">' + esc(tp.pesan) + '</p>' : '') +
      '<button type="button" class="btn" data-kb="tpUnggah"' + (tp.kirim ? ' disabled' : '') + '>' + esc(t(tp.kirim ? 'tp_kirim' : 'tp_unggah')) + '</button></section>';
    var daftar;
    if (tp.memuat && !tp.data) daftar = '<p class="ket-alat">' + esc(t('muat')) + '</p>';
    else if (!tp.data || !tp.data.acara || !tp.data.acara.length) daftar = '<p class="ket-alat">' + esc(t('tp_kosong')) + '</p>';
    else daftar = tp.data.acara.map(function (ev) {
      return '<section class="kb-kotak"><h3>' + esc(ev.nama) + ' <small class="kb-mut">' + ev.file.length + '</small></h3><ul class="kb-tp-daftar">' + ev.file.map(function (f) {
        return '<li data-tp-final="' + (f.final ? 1 : 0) + '"><div><a href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.nama) + '</a>' +
          (f.final ? ' <span class="kb-cap">' + esc(t('tp_final')) + '</span>' : '') + '<small>' + esc(ukuranTp(f.ukuran)) + ' · ' + esc(String(f.dibuat).slice(0, 10)) + (f.catatan ? ' · ' + esc(f.catatan) : '') + '</small></div>' +
          '<button type="button" class="btn dua" data-kb="tpFinal" data-id="' + esc(f.id) + '" data-final="' + (f.final ? 0 : 1) + '">' + esc(t(f.final ? 'tp_batalFinal' : 'tp_jadiFinal')) + '</button></li>';
      }).join('') + '</ul></section>';
    }).join('');
    return form + daftar;
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
      '<label>' + esc(t('jenis')) + sel('jenis', [['kartu', t('j_kartu')], ['bab', t('j_bab')], ['bintang', t('j_bintang')], ['edisi', t('j_edisi')], ['papan', t('j_papan')]], h.jenis) + '</label>' +
      '<label>' + esc(t(h.jenis === 'papan' ? 'pemenang' : 'angka')) + (h.jenis === 'bab' ? sel('angka', BAB.map(function (b, i) { return [i, ROM[i] + ' · ' + b]; }), h.angka) : inp('angka', h.angka, '', 'number')) + '</label>' +
      '<label>' + esc(t('saluran')) + sel('saluran', [['semua', t('semua')], ['online', t('online')]], h.saluran) + '</label>' +
      '<label>' + esc(t('isi')) + inp('hadiah', h.hadiah) + '</label>' +
      '<label>' + esc(t('nominal')) + inp('nominal', h.nominal, 'Rp…') + '</label>' +
      '<label>' + esc(t('minBelanja')) + inp('min_belanja', h.min_belanja, 'Rp…') + '</label>' +
      '<label>' + esc(t('voucher')) + inp('voucher', h.voucher) + '</label>' +
      '<label>' + esc(t('kuota')) + inp('kuota', h.kuota || 0, '', 'number') + (h.baru ? '' : '<small>' + nf(h.terpakai) + ' ' + esc(t('terpakai')) + '</small>') + '</label>' +
      '<label>' + esc(t('berlakuSampai')) + inp('berlaku_sampai', h.berlaku_sampai ? String(h.berlaku_sampai).slice(0, 10) : '', '', 'date') + '</label>' +
      '<label>' + esc(t('berlakuUntuk')) + inp('berlaku_untuk', h.berlaku_untuk || '', t('semuaProduk')) + '</label>' +
      '<label>' + esc(t('maksPembeli')) + inp('maks_per_pembeli', h.maks_per_pembeli || 1, '', 'number') + '</label>' +
      '<label class="kb-syarat">' + esc(t('syarat')) + '<textarea data-f="syarat" rows="2" maxlength="300" placeholder="' + esc(t('syaratPh')) + '">' + esc(h.syarat || '') + '</textarea></label>' +
      '</div>' + (h.jenis === 'papan' ? '<p class="ket-alat">' + esc(t('ketPapan')) + '</p>' : '') + '<div class="kb-hbawah">' + (!h.baru && !h.nominal && h.voucher == null ? '<small class="kb-mut">' + esc(t('kosongNominal')) + '</small>' : '') +
      '<button type="button" class="btn" data-kb="hadiah" data-id="' + esc(k) + '">' + esc(A.simpanOk[k] ? t('tersimpan') : t('simpan')) + '</button></div></div>';
  }
  function judulAdmin(h) {
    if (h.judul) return h.judul;
    var n = h.jenis === 'bab' ? 'Bab ' + ROM[Number(h.angka)] + ' · ' + BAB[Number(h.angka)] : h.jenis === 'bintang' ? '★★★' : h.jenis === 'papan' ? '· top ' + h.angka : h.angka;
    return t('j_' + h.jenis) + ' ' + n;
  }
  function bacaHadiah(k) {
    var box = document.querySelector('[data-hadiah="' + k + '"]'); if (!box) return null;
    var h = { id: k === 'baru' ? '' : k };
    box.querySelectorAll('[data-f]').forEach(function (x) { var f = x.getAttribute('data-f'); h[f] = x.type === 'checkbox' ? x.checked : x.value; });
    h.angka = Number(h.angka || 0); h.kuota = Number(h.kuota || 0);
    if ('maks_per_pembeli' in h) h.maks_per_pembeli = Number(h.maks_per_pembeli);
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
  /* 16 Okt 2026, Ferdy: kartu dicetak sendiri dan tidak terikat SKU ("alurnya gua setuju").
     Satu kartu = satu paket; isinya diikat waktu packing. Voucher di semua kartu, jadi kodenya wajib.
     Kartu per produk untuk vendor (ZIP PNG) tidak lagi ditawarkan di layar ini. */
  /* tanggal hari ini menurut WIB, batas bawah tanggal berlaku voucher */
  function hariIniWib() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); }
  function paketSiap() { var n = Number(A.p.jumlah); return Number.isInteger(n) && n >= 1 && n <= 500 && !!String(A.p.kode || '').trim() && /^\d{4}-\d{2}-\d{2}$/.test(A.p.sampai || '') && A.p.sampai >= hariIniWib() && !A.sibuk; }
  function htmlCetak() {
    var ac = A.ringkas && A.ringkas.acara;
    if (A.ringkas && !ac) return '<div class="tolak-alat">' + esc(t('tanpaAcara')) + '</div>';
    var h = A.hasilPaket;
    var hasil = h ? '<div class="kb-hasil"><b>' + nf(h.kode.length) + '</b> ' + esc(t('dibuat')) + ' ' + esc(t('dariAcara')) + ' <span class="kb-cap">' + esc(h.acara.cap) + '</span> ' +
      (A.mencetak ? '<span class="kb-cap">' + esc(t('siapCetak')) + '</span>' : A.unduh ? '<span class="kb-cap">' + esc(t('bikinPng')) + ' ' + A.unduh + '</span>' :
        '<button type="button" class="btn" data-kb="cetakPaketLagi">' + esc(t('cetakA4Lagi')) + '</button> <button type="button" class="btn dua" data-kb="pngPaket">' + esc(t('unduhPng')) + '</button>') + '</div>' : '';
    return (A.pesan ? '<div class="tolak-alat" role="alert">' + esc(A.pesan) + '</div>' : '') + hasil +
      '<section class="kb-kotak"><h3>' + esc(t('paketJudul')) + (ac ? ' <span class="kb-cap">' + esc(ac.cap) + '</span>' : '') + '</h3><p class="ket-alat">' + esc(t('ketPaket')) + '</p>' +
      '<div class="kb-form4"><label>' + esc(t('pJumlah')) + '<input id="kbPJml" type="number" min="1" max="500" inputmode="numeric" value="' + esc(A.p.jumlah) + '" placeholder="0"><small>' + esc(t('maks')) + '</small></label>' +
      '<label>' + esc(t('pVKode')) + '<input id="kbPVKode" value="' + esc(A.p.kode) + '" autocomplete="off"></label>' +
      '<label>' + esc(t('pVSampai')) + '<input id="kbPVSampai" type="date" min="' + hariIniWib() + '" value="' + esc(A.p.sampai) + '"><small>' + esc(t('pVSampaiKet')) + '</small></label>' +
      '<label class="lebar">' + esc(t('pVTeks')) + '<input id="kbPVTeks" value="' + esc(A.p.teks) + '" placeholder="' + esc(t('pVTeksPh')) + '"></label></div></section>' +
      '<button type="button" class="btn" data-kb="buatPaket"' + (paketSiap() ? '' : ' disabled') + '>' + esc(t('buatPaket')) + '</button>';
  }
  /* Kartu umum 14 x 6 cm: kiri logo, ajakan koleksi, enam foto karakter; kanan QR satu-satunya.
     Kode voucher TIDAK dicetak; pembeli melihatnya setelah memindai. */
  var FOTO_PAKET = ['koala', 'collie', 'redpanda', 'shiba', 'pekingese', 'panda'];
  function htmlKartuPaket(r) {
    return '<div class="kartu-kitab kk-paket" data-kode="' + esc(r.kode) + '">' +
      '<div class="kk-kiri"><img class="kk-p-logo" src="' + DASAR + 'img/logo-mofmo.png" alt=""><span class="kk-p-nama">Mofmofriends</span><span class="kk-p-ajak">Kumpulin kartunya, buka hadiahnya</span>' +
      '<div class="kk-p-foto">' + FOTO_PAKET.map(function (f) { return '<img src="' + DASAR + 'img/kartu/' + f + '.webp" alt="">'; }).join('') + '</div>' +
      '<div class="kk-pita"><span class="kk-nama">' + KARTU.length + ' KARTU · MOFMO COLLECTION</span></div></div>' +
      '<div class="kk-kanan"><div class="kk-p-judul">SCAN SETELAH PAKET SAMPAI</div><div class="kk-qr">' + qrSvg(SITUS + r.kode) + '</div>' +
      '<div class="kk-teks"><span class="kk-ajak"><b>ISI PAKET MASUK BUKU</b>Jadi kartu koleksimu</span><span class="kk-ajak"><b>VOUCHER SHOPEE</b>Langsung muncul, tinggal salin</span><span class="kk-kode">' + esc(kodeTampil(r.kode)) + '</span></div>' +
      '<div class="kk-bawah vou"><b>ADA VOUCHER DI DALAM</b><span>atau ketik kodenya di mofmofriends.id</span></div></div></div>';
  }
  function siapCetak(d) {
    var gb = Array.prototype.map.call(d.querySelectorAll('img'), function (im) { return im.complete && im.naturalWidth ? Promise.resolve() : new Promise(function (ok) { im.addEventListener('load', ok); im.addEventListener('error', ok); }); });
    var hr = document.fonts && document.fonts.load ? ["900 9pt 'KK Cinzel Deco'", "700 9pt 'KK Cinzel'", "900 9pt 'KK Cinzel'", "600 9pt 'KK Cormorant'", "700 9pt 'KK Cormorant'", "italic 700 9pt 'KK Cormorant'"].map(function (f) { return document.fonts.load(f).catch(function () {}); }) : [];
    return Promise.all(gb.concat(hr));
  }
  /* Lembar A4 untuk printer kantor: 4 kartu per halaman (aturan #lembarKitab di app.css). */
  function cetakA4() {
    var h = A.hasilPaket; if (!h || A.mencetak || A.unduh) return;
    A.mencetak = true; A.pesan = ''; gambar();
    var lama = el('lembarKitab'); if (lama) lama.remove();
    var d = document.createElement('div'); d.id = 'lembarKitab';
    d.innerHTML = h.kode.map(htmlKartuPaket).join('');
    document.body.appendChild(d);
    return siapCetak(d).then(function () {
      var bersih = function () { W.removeEventListener('afterprint', bersih); document.body.classList.remove('cetak-kitab'); var x = el('lembarKitab'); if (x) x.remove(); A.mencetak = false; gambar(); };
      W.addEventListener('afterprint', bersih);
      document.body.classList.add('cetak-kitab');
      W.print();
    });
  }
  function buatPaket() {
    if (!paketSiap()) return;
    A.sibuk = true; A.pesan = ''; gambar();
    panggil('cetakPaket', { jumlah: Number(A.p.jumlah), voucherKode: String(A.p.kode).trim(), voucherTeks: A.p.teks, voucherSampai: A.p.sampai }).then(function (r) {
      A.sibuk = false;
      if (!r.ok) { A.pesan = r.pesan; bunyi('scanTolak'); gambar(); return; }
      A.hasilPaket = r; A.p = { jumlah: '', kode: '', teks: '', sampai: '' }; bunyi('scanOk'); gambar(); cetakA4();
    }, function (e) { A.sibuk = false; A.pesan = e.message; gambar(); });
  }
  function pngPaket() {
    var h = A.hasilPaket; if (!h || A.unduh || A.mencetak) return;
    return unduhPng(h.kode, htmlKartuPaket, function (i, r) { return String(i + 1).padStart(3, '0') + '_paket_' + r.kode + '.png'; }, 'kartu-paket-' + String(h.acara.cap || 'event').replace(/[^A-Za-z0-9.]+/g, '-') + '-' + h.kode.length + '.zip');
  }
  /* PNG cadangan (dulu untuk vendor cetak, Ferdy 15 Okt malam: "cetaknya bisa png high reso (cuma png)... vendor yg
     print bukan gua"). Tiap kartu digambar dari HTML dan CSS kartu yang sama ke kanvas 300 dpi
     (140 x 60 mm = 1654 x 709 px) lewat SVG foreignObject. Foto dan huruf ditanam sebagai data URL
     dulu, karena gambar SVG tidak boleh memuat berkas luar dan kanvas jadi tidak bisa diekspor.
     Satu ZIP (JSZip dari vendor/pptxgen.bundle.js), berkas urut per produk, nama memuat kode. */
  var MM = 96 / 25.4, DPI = 300, PNG_W = Math.round(140 * DPI / 25.4), PNG_H = Math.round(60 * DPI / 25.4);
  function muatZip() {
    if (W.JSZip) return Promise.resolve(W.JSZip);
    return new Promise(function (ok, gagal) {
      var s = document.createElement('script'); s.src = DASAR + 'vendor/pptxgen.bundle.js'; s.async = true;
      s.onload = function () { if (W.JSZip) ok(W.JSZip); else gagal(new Error('JSZip')); };
      s.onerror = function () { gagal(new Error('vendor/pptxgen.bundle.js')); };
      document.head.appendChild(s);
    });
  }
  var DATA_URL = {};
  function keDataUrl(url) {
    if (!DATA_URL[url]) DATA_URL[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.blob(); }).then(function (b) {
      return new Promise(function (ok, gagal) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.onerror = function () { gagal(new Error(url)); }; f.readAsDataURL(b); });
    });
    return DATA_URL[url];
  }
  var CSS_KARTU = null;
  function cssKartu() {
    if (CSS_KARTU) return CSS_KARTU;
    var aturan = [], huruf = [];
    Array.prototype.forEach.call(document.styleSheets, function (sh) {
      var rs; try { rs = sh.cssRules; } catch (e) { return; }
      Array.prototype.forEach.call(rs || [], function (r) {
        if (r.type === 5 && /KK /.test(r.cssText)) huruf.push(r);
        else if (r.type === 1 && /#lembarKitab \.(kartu-kitab|kk-)/.test(r.selectorText || '')) aturan.push(r.cssText.replace(/#lembarKitab /g, ''));
      });
    });
    CSS_KARTU = Promise.all(huruf.map(function (r) {
      var m = /url\("?([^")]+)"?\)/.exec(r.cssText); if (!m) return '';
      var abs = new URL(m[1], (r.parentStyleSheet && r.parentStyleSheet.href) || location.href).href;
      return keDataUrl(abs).then(function (d) { return r.cssText.replace(m[0], 'url("' + d + '")'); }, function () { return ''; });
    })).then(function (ff) { return ff.join('\n') + '\n' + aturan.join('\n') + '\n.kartu-kitab{margin:0 !important}'; });
    return CSS_KARTU;
  }
  /* CRC32 dan potongan pHYs supaya PNG tercatat 300 dpi (vendor membaca ukuran cetak dari sini). */
  var TABEL_CRC = null;
  function crc32(b) {
    if (!TABEL_CRC) { TABEL_CRC = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TABEL_CRC[n] = c >>> 0; } }
    var x = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) x = TABEL_CRC[(x ^ b[i]) & 255] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0;
  }
  function pasangDpi(buf) {
    var a = new Uint8Array(buf), ppm = Math.round(DPI / 0.0254), c = new Uint8Array(21), v = new DataView(c.buffer);
    v.setUint32(0, 9); c.set([112, 72, 89, 115], 4); v.setUint32(8, ppm); v.setUint32(12, ppm); c[16] = 1;
    v.setUint32(17, crc32(c.subarray(4, 17)));
    var o = new Uint8Array(a.length + 21); o.set(a.subarray(0, 33)); o.set(c, 33); o.set(a.subarray(33), 54); return o;
  }
  function kartuKePng(html, css) {
    var wadah = document.createElement('div'); wadah.innerHTML = html;
    var imgs = Array.prototype.slice.call(wadah.querySelectorAll('img'));
    return Promise.all(imgs.map(function (im) { return keDataUrl(new URL(im.getAttribute('src'), location.href).href).then(function (d) { im.setAttribute('src', d); }, function () { im.remove(); }); })).then(function () {
      var w = 140 * MM, h = 60 * MM, isi = new XMLSerializer().serializeToString(wadah.firstChild);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + PNG_W + '" height="' + PNG_H + '" viewBox="0 0 ' + w + ' ' + h + '"><foreignObject x="0" y="0" width="' + w + '" height="' + h + '">' +
        '<div xmlns="http://www.w3.org/1999/xhtml"><style>' + css.replace(/<\/style/gi, '') + '</style>' + isi + '</div></foreignObject></svg>';
      return new Promise(function (ok, gagal) {
        var gb = new Image();
        gb.onload = function () {
          /* gambar dua kali: huruf data URL di dalam SVG kadang baru siap sesudah gambar pertama */
          var kv = document.createElement('canvas'); kv.width = PNG_W; kv.height = PNG_H; var cx = kv.getContext('2d');
          cx.drawImage(gb, 0, 0, PNG_W, PNG_H);
          setTimeout(function () {
            cx.clearRect(0, 0, PNG_W, PNG_H); cx.drawImage(gb, 0, 0, PNG_W, PNG_H);
            kv.toBlob(function (b) { if (!b) return gagal(new Error('toBlob')); b.arrayBuffer().then(function (ab) { ok(pasangDpi(ab)); }, gagal); }, 'image/png');
          }, 60);
        };
        gb.onerror = function () { gagal(new Error('SVG kartu')); };
        gb.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
    });
  }
  function unduhPng(urut, buat, nama, berkasZip) {
    var zip, css, i = 0;
    A.unduh = '0/' + urut.length; A.pesan = ''; gambar();
    return Promise.all([muatZip(), cssKartu()]).then(function (x) { zip = new x[0](); css = x[1]; }).then(function lanjut() {
      if (i >= urut.length) return zip.generateAsync({ type: 'blob' });
      var r = urut[i];
      return kartuKePng(buat(r), css).then(function (png) {
        zip.file(nama(i, r), png); i++; A.unduh = i + '/' + urut.length;
        var el = document.querySelector('#kbIsi .kb-hasil .kb-cap:last-child'); if (el) el.textContent = t('bikinPng') + ' ' + A.unduh;
        return lanjut();
      });
    }).then(function (blob) {
      var a = document.createElement('a'), u = URL.createObjectURL(blob);
      a.href = u; a.download = berkasZip;
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
      A.unduh = null; gambar();
    }, function (e) { A.unduh = null; A.pesan = t('gagalPng') + (e && e.message || e); gambar(); });
  }

  /* ---------- pasang kartu ke pesanan (tahap 2, 16 Okt 2026) ----------
     Ferdy: "dua-duanya". Kerja harian lewat kolom Kode Kartu QR di Excel gudang (lapshopee.js);
     tab ini cadangan dan tempat membetulkan salah pasang. Dipakai dengan scanner: scanner mengetik
     isi QR (https://mofmofriends.id/#k=KODE) lalu Enter. Server yang membaca kodenya (kodeDariScan)
     dan memutus aturan satu kartu satu pesanan (SQL kitab_pasang). ganti cuma dikirim lewat tombol
     yang menyebut pesanan atau kartu yang bentrok, jadi tidak pernah terjadi tanpa sengaja. */
  function fokusPs() { setTimeout(function () { var i = el('kbPsPesanan'); if (i && A.tab === 'pasang') i.focus(); }, 0); }
  function kalimatPs(h) {
    /* lama = pesanan lain (lain) atau kartu lain (penuh, terbuka); sesudah ganti, lamaKartu menandai yang mana */
    var k = kodeTampil(h.kode || ''), p = h.pesanan || '', l = h.lama ? (h.status === 'penuh' || h.status === 'terbuka' ? kodeTampil(h.lama) : h.lama) : '';
    if (h.status === 'ok') return t('ps_ok')(k, p) + (h.lama ? t('ps_pindah')(h.lamaKartu ? kodeTampil(h.lama) : h.lama) : '');
    if (h.status === 'sudah') return t('ps_sudah')(k, p);
    if (h.status === 'lain') return t('ps_lain')(k, l);
    if (h.status === 'penuh') return t('ps_penuh')(p, l);
    if (h.status === 'terbuka') return t('ps_terbuka')(l);
    if (h.status === 'cek') return h.jenis === 'kartu' ? t('ps_cekLama') : t('ps_cek')(k, h.pesanan) + (h.dibuka ? t('ps_cekBuka') : '');
    return t('ps_' + h.status) || t('gagal');
  }
  function htmlPasang() {
    var ps = A.ps, h = ps.hasil, baik = h && (h.status === 'ok' || h.status === 'sudah' || h.status === 'cek');
    var tombolGanti = h && (h.status === 'lain' || h.status === 'penuh') ? '<button type="button" class="btn" data-kb="pasangGanti">' + esc(t(h.status === 'lain' ? 'psPindah' : 'psGanti')) + '</button>' : '';
    var hasil = h ? '<div id="kbPsHasil" class="' + (baik ? 'kb-hasil' : 'tolak-alat kb-ps-tolak') + '" role="' + (baik ? 'status' : 'alert') + '" data-ps-status="' + esc(h.status) + '"><span>' + esc(kalimatPs(h)) + '</span>' + tombolGanti + '</div>' : '';
    var log = ps.log.length ? '<ol class="kb-ps-log" id="kbPsLog">' + ps.log.map(function (x) { return '<li><b>' + esc(x.pesanan) + '</b><span>' + esc(kodeTampil(x.kode)) + '</span><small>' + esc(x.jam) + '</small></li>'; }).join('') + '</ol>' : '<p class="ket-alat" id="kbPsLog">' + esc(t('psKosong')) + '</p>';
    return (A.pesan ? '<div class="tolak-alat" role="alert">' + esc(A.pesan) + '</div>' : '') +
      '<section class="kb-kotak"><h3>' + esc(t('psJudul')) + '</h3><p class="ket-alat">' + esc(t('psKet')) + '</p>' +
      '<div class="kb-ps"><label>' + esc(t('psPesanan')) + '<span class="kb-ps-isi"><input id="kbPsPesanan" value="' + esc(ps.pesanan) + '" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next">' +
        (bisaVideo() && adaDetektor() ? tombolKamera('kamPesanan') : '') + '</span></label>' +
      '<label>' + esc(t('psKartu')) + '<span class="kb-ps-isi"><input id="kbPsKartu" value="' + esc(ps.kartu) + '" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done">' +
        (bisaVideo() ? tombolKamera('kamKartu') : '') + '</span></label>' +
      '<button type="button" class="btn" data-kb="pasang"' + (ps.sibuk ? ' disabled aria-busy="true"' : '') + '>' + esc(t('psTombol')) + '</button></div><div id="kbPsKamera" aria-live="polite">' + (A.kam.gagal ? '<p class="tolak-alat">' + esc(t('kamGagal')) + '</p>' : '') + '</div>' + hasil + '</section>' +
      '<section class="kb-kotak"><h3>' + esc(t('psLog')) + '</h3>' + log + '</section>';
  }
  /* ---------- kamera HP (16 Okt 2026, Ferdy minta scan pakai kamera HP) ----------
     QR kartu dibaca BarcodeDetector kalau peramban punya (Chrome Android), kalau tidak jsQR
     (Safari iPhone), yang baru diunduh saat kamera pertama kali dipakai. No Pesanan di label berupa
     barcode garis, jadi kameranya cuma ditawarkan kalau BarcodeDetector ada. QR yang bukan kartu
     Mofmofriends diabaikan, kamera terus mencari. Sesudah No Pesanan terbaca, kamera kartu menyala
     sendiri. Kamera selalu dimatikan sampai track-nya berhenti (lampu kamera HP padam). */
  var IKON_KAMERA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  function bisaVideo() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function adaDetektor() { return typeof W.BarcodeDetector === 'function'; }
  function tombolKamera(a) { return '<button type="button" class="btn dua kb-kam" data-kb="' + a + '" aria-label="' + esc(t('kamera')) + '" title="' + esc(t('kamera')) + '">' + IKON_KAMERA + '</button>'; }
  /* aturan sama dengan kodeDariScan di Edge Function kitab: alamat lengkap QR atau kode 10 huruf */
  function kodeKartuSah(s) {
    var k = String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (k.length > 10 && /MOFMOFRIENDS/.test(k)) k = k.slice(-10);
    return k.length === 10 && k.split('').every(function (x) { return 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'.indexOf(x) > -1; });
  }
  var JSQR = null;
  function muatJsqr() {
    if (W.jsQR) return Promise.resolve(W.jsQR);
    if (JSQR) return JSQR;
    JSQR = new Promise(function (ok, gagal) {
      var sc = document.createElement('script'); sc.src = DASAR + 'vendor/jsQR.min.js'; sc.async = true;
      sc.onload = function () { if (W.jsQR) ok(W.jsQR); else gagal(new Error('jsQR')); };
      sc.onerror = function () { JSQR = null; gagal(new Error('jsQR')); };
      document.head.appendChild(sc);
    });
    return JSQR;
  }
  function nyalakanKamera(sasaran) {
    matikanKamera(); A.kam.gagal = false;
    var kotak = el('kbPsKamera'); if (!kotak || !bisaVideo()) return;
    var token = A.kam.token = {};
    A.kam.sasaran = sasaran;
    kotak.innerHTML = '<p class="ket-alat">' + esc(t('kamMuat')) + '</p>';
    var pakaiDet = adaDetektor();
    var siap = pakaiDet ? Promise.resolve(W.BarcodeDetector.getSupportedFormats ? W.BarcodeDetector.getSupportedFormats() : ['qr_code', 'code_128']).then(function (ada) {
      var mau = sasaran === 'pesanan' ? ['code_128', 'code_39', 'qr_code', 'ean_13'] : ['qr_code'];
      var f = mau.filter(function (x) { return (ada || []).indexOf(x) > -1; });
      if (!f.length) { if (sasaran === 'kartu') { pakaiDet = false; return muatJsqr(); } throw new Error('format'); }
      A.kam.det = new W.BarcodeDetector({ formats: f });
    }) : muatJsqr();
    siap.then(function () { return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); }).then(function (aliran) {
      if (A.kam.token !== token || A.tab !== 'pasang' || !el('kbPsKamera')) { aliran.getTracks().forEach(function (tr) { tr.stop(); }); return; }
      A.kam.aliran = aliran;
      el('kbPsKamera').innerHTML = '<div class="kamera-alat"><video playsinline muted autoplay></video><i class="bidik" aria-hidden="true"></i><p class="kb-kam-arah">' + esc(t(sasaran === 'pesanan' ? 'kamArahPesanan' : 'kamArahKartu')) + '</p><button type="button" class="btn dua" data-kb="kamTutup">' + esc(t('kamTutup')) + '</button></div>';
      var v = el('kbPsKamera').querySelector('video'); v.srcObject = aliran; var pl = v.play && v.play(); if (pl && pl.catch) pl.catch(function () {});
      A.kam.v = v; A.kam.pakaiDet = pakaiDet;
      lingkarKamera(token);
    }).catch(function () {
      if (A.kam.token !== token) return;
      matikanKamera(); A.kam.gagal = true;
      var k = el('kbPsKamera'); if (k) k.innerHTML = '<p class="tolak-alat">' + esc(t('kamGagal')) + '</p>';
      bunyi('scanTolak');
    });
  }
  function bacaBingkai() {
    var v = A.kam.v;
    if (A.kam.pakaiDet) return A.kam.det.detect(v).then(function (r) { return (r || []).map(function (x) { return String(x.rawValue || ''); }); });
    if (!v || !v.videoWidth) return Promise.resolve([]);
    var w = Math.min(640, v.videoWidth), h = Math.round(v.videoHeight * w / v.videoWidth);
    var kv = A.kam.kanvas || (A.kam.kanvas = document.createElement('canvas')); kv.width = w; kv.height = h;
    var cx = kv.getContext('2d', { willReadFrequently: true }); cx.drawImage(v, 0, 0, w, h);
    var g = cx.getImageData(0, 0, w, h), q = W.jsQR(g.data, w, h, { inversionAttempts: 'dontInvert' });
    return Promise.resolve(q && q.data ? [q.data] : []);
  }
  function lingkarKamera(token) {
    if (!A.kam.aliran || A.kam.token !== token) return;
    bacaBingkai().then(function (isi) {
      if (!A.kam.aliran || A.kam.token !== token) return;
      var sasaran = A.kam.sasaran, dapat = null;
      isi.forEach(function (x) {
        if (dapat) return; x = String(x).trim();
        if (sasaran === 'kartu' ? kodeKartuSah(x) : (/^#?\s*[A-Za-z0-9]{6,30}$/.test(x) && !kodeKartuSah(x))) dapat = x;
      });
      if (!dapat) { A.kam.t = setTimeout(function () { lingkarKamera(token); }, 200); return; }
      matikanKamera(); bunyi('scanOk');
      if (sasaran === 'pesanan') { A.ps.pesanan = dapat; var ip = el('kbPsPesanan'); if (ip) ip.value = dapat; nyalakanKamera('kartu'); return; }
      A.ps.kartu = dapat; var ik = el('kbPsKartu'); if (ik) ik.value = dapat; pasangKartu(false);
    }, function () { if (A.kam.aliran && A.kam.token === token) A.kam.t = setTimeout(function () { lingkarKamera(token); }, 400); });
  }
  function matikanKamera() {
    A.kam.token = null;
    if (A.kam.t) { clearTimeout(A.kam.t); A.kam.t = null; }
    if (A.kam.aliran) { try { A.kam.aliran.getTracks().forEach(function (tr) { try { tr.stop(); } catch (e) {} }); } catch (e) {} }
    if (A.kam.v) { try { A.kam.v.srcObject = null; } catch (e) {} }
    A.kam.aliran = null; A.kam.v = null; A.kam.det = null;
    var k = el('kbPsKamera'); if (k && !A.kam.gagal) k.innerHTML = '';
  }
  function tombolScan(e) {
    if (e.key !== 'Enter' || !e.target) return;
    if (e.target.id === 'kbPsPesanan') { e.preventDefault(); A.ps.pesanan = e.target.value; var k = el('kbPsKartu'); if (k) k.focus(); }
    else if (e.target.id === 'kbPsKartu') { e.preventDefault(); A.ps.kartu = e.target.value; pasangKartu(false); }
  }
  function pasangKartu(ganti) {
    var ps = A.ps; if (ps.sibuk) return;
    var tunda = ganti ? ps.tunda : null;
    if (!tunda) { var ip = el('kbPsPesanan'), ik = el('kbPsKartu'); if (ip) ps.pesanan = ip.value; if (ik) ps.kartu = ik.value; }
    var pesanan = tunda ? tunda.pesanan : String(ps.pesanan || '').trim(), kartu = tunda ? tunda.kode : String(ps.kartu || '').trim();
    if (!kartu) { var f = el(pesanan ? 'kbPsKartu' : 'kbPsPesanan'); if (f) f.focus(); return; }
    ps.sibuk = true; A.pesan = ''; gambar();
    var janji = pesanan ? panggil('pasangKartu', ganti ? { item: [{ kode: kartu, pesanan: pesanan }], ganti: true } : { item: [{ kode: kartu, pesanan: pesanan }] })
      : panggil('cekKartu', { kode: kartu });
    janji.then(function (r) {
      ps.sibuk = false;
      if (!pesanan) {
        ps.hasil = r.ok ? { status: 'cek', kode: r.kode, pesanan: r.pesanan, jenis: r.jenis, dibuka: r.dibuka } : { status: 'tidak', kode: kartu };
        bunyi(r.ok ? 'scanOk' : 'scanTolak'); ps.kartu = ''; gambar(); var ik2 = el('kbPsKartu'); if (ik2) ik2.focus(); return;
      }
      if (!r.ok || !r.hasil || !r.hasil[0]) { A.pesan = r.pesan || t('gagal'); bunyi('scanTolak'); gambar(); return; }
      var h = r.hasil[0]; h.lamaKartu = h.status === 'ok' && ganti && tunda && tunda.status === 'penuh';
      ps.hasil = h;
      if (h.status === 'ok' || h.status === 'sudah') {
        bunyi('scanOk'); ps.tunda = null; ps.pesanan = ''; ps.kartu = '';
        /* sesudah pindah/ganti, baris lama pesanan atau kartu itu tidak berlaku lagi */
        if (h.status === 'ok') { ps.log = ps.log.filter(function (x) { return x.pesanan !== h.pesanan && x.kode !== h.kode; }); var j = new Date(); ps.log.unshift({ pesanan: h.pesanan, kode: h.kode, jam: ('0' + j.getHours()).slice(-2) + ':' + ('0' + j.getMinutes()).slice(-2) }); ps.log = ps.log.slice(0, 50); }
        gambar(); fokusPs(); return;
      }
      bunyi('scanTolak'); ps.tunda = (h.status === 'lain' || h.status === 'penuh') ? { kode: h.kode, pesanan: h.pesanan, status: h.status } : null;
      ps.kartu = ''; gambar(); var ik3 = el('kbPsKartu'); if (ik3) ik3.focus();
    }, function (e) { ps.sibuk = false; A.pesan = e.message; bunyi('scanTolak'); gambar(); });
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
    if (x.hasAttribute('data-kbtab')) { matikanKamera(); bunyi('klik'); A.tab = x.getAttribute('data-kbtab'); A.pesan = ''; A.tolakYakin = 0; if (A.tab === 'struk') muatStruk(); else if (A.tab === 'pasang') { A.galat = ''; gambar(); fokusPs(); } else if (A.tab === 'template') muatTemplate(); else if (!A.ringkas) muatRingkas(); else gambar(); return; }
    var a = x.getAttribute('data-kb'), id = Number(x.getAttribute('data-id'));
    if (a !== 'tolak') A.tolakYakin = 0;
    if (a === 'tutup') tutup();
    else if (a === 'ulang') { if (A.tab === 'struk') muatStruk(); else if (A.tab === 'pasang') { A.galat = ''; gambar(); fokusPs(); } else if (A.tab === 'template') muatTemplate(); else muatRingkas(); }
    else if (a === 'tpUnggah') unggahTemplate();
    else if (a === 'tpFinal') finalTemplate(x.getAttribute('data-id'), x.getAttribute('data-final') === '1');
    else if (a === 'pasang') { matikanKamera(); pasangKartu(false); }
    else if (a === 'kamKartu') { bunyi('klik'); A.ps.pesanan = (el('kbPsPesanan') || {}).value || A.ps.pesanan; nyalakanKamera('kartu'); }
    else if (a === 'kamPesanan') { bunyi('klik'); nyalakanKamera('pesanan'); }
    else if (a === 'kamTutup') { bunyi('klik'); matikanKamera(); }
    else if (a === 'pasangGanti') pasangKartu(true);
    else if (a === 'acara') simpanAcara();
    else if (a === 'hadiah') simpanHadiah(x.getAttribute('data-id'));
    else if (a === 'usulan') pasangUsulan();
    else if (a === 'buatPaket') buatPaket();
    else if (a === 'cetakPaketLagi') cetakA4();
    else if (a === 'pngPaket') pngPaket();
    else if (a === 'foto') lihatFoto(id);
    else if (a === 'setujui') putus(id, true);
    else if (a === 'tolak') { if (A.tolakYakin === id) putus(id, false); else { A.tolakYakin = id; gambar(); } }
  }
  function ketik(e) {
    var x = e.target;
    if (x.id === 'kbPJml' || x.id === 'kbPVKode' || x.id === 'kbPVTeks' || x.id === 'kbPVSampai') {
      A.p[{ kbPJml: 'jumlah', kbPVKode: 'kode', kbPVTeks: 'teks', kbPVSampai: 'sampai' }[x.id]] = x.value;
      var bp = document.querySelector('[data-kb=buatPaket]'); if (bp) bp.disabled = !paketSiap();
    }
    if (x.id === 'kbTpAcara') A.tp.acara = x.value;
    if (x.id === 'kbTpCatatan') A.tp.catatan = x.value;
    if (x.id === 'kbPsPesanan') A.ps.pesanan = x.value;
    if (x.id === 'kbPsKartu') A.ps.kartu = x.value;
    if (x.hasAttribute('data-pilih')) { var sid = x.getAttribute('data-pilih'); A.pilih[sid] = A.pilih[sid] || {}; A.pilih[sid][x.value] = x.checked; }
    if (e.type === 'change' && x.getAttribute('data-f') === 'jenis') {
      /* ganti jenis: kolom target berubah antara angka dan pilihan bab */
      var box = x.closest('[data-hadiah]'), k = box.getAttribute('data-hadiah'), h = bacaHadiah(k); h.baru = k === 'baru';
      h.angka = h.jenis === 'bab' ? 0 : h.jenis === 'bintang' ? 3 : h.jenis === 'papan' ? 10 : h.angka || 3; box.outerHTML = htmlHadiah(h);
    }
  }
  W.WmsKitabku = { buka: buka, tutup: tutup, qrMatriks: qrMatriks, qrSvg: qrSvg, panggil: panggil };
})();
