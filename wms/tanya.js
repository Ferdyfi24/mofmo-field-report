/* Tanya WMS Mofmofriends (12 Okt 2026): pertanyaan bahasa sehari-hari,
 * dijawab dari buku besar yang sama dengan papan. Tanpa AI (pilihan Ferdy).
 *
 * Pengurai aturan: kata kunci jenis pertanyaan (stok, terjual, terlaris, belum
 * laku, stok mati, di jalan, opname, jadwal), lalu SKU (nama produk), lokasi
 * (gerai, retailer, gudang), dan periode (hari ini, kemarin, minggu ini,
 * bulan ini, bulan lalu, nama bulan, "sejak <bulan>"). Angkanya dihitung dari
 * baris buku besar dataPapan ([tanggal, produk, qty, dari, ke]) dan peta
 * gudang wmsGudang untuk lokasi rak.
 * Membaca tidak pernah mengubah data. Pertanyaan yang berarti menulis
 * (misalnya "jadwalin Indra ke Margo City minggu depan") dijawab dengan usulan
 * dan tombol yang membuka alatnya; yang menyimpan tetap orangnya.
 * Pertanyaan yang tidak dikenali dijawab jujur dengan contoh yang bisa.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !(M().bhs && M().bhs() === 'en'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return W.document ? W.document.getElementById(i) : null; }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function ribu(n) { return String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rp(n) { return (Number(n) < 0 ? '-' : '') + 'Rp' + ribu(n); }
  function dua(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- tanggal ---------- */
  var BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  var BULAN_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  var BULAN3 = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function tglUTC(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
  function geser(s, n) { return new Date(tglUTC(s) + n * 86400000).toISOString().slice(0, 10); }
  function selisih(a, b) { return Math.round((tglUTC(b) - tglUTC(a)) / 86400000); }
  function akhirBulan(b) { return new Date(Date.UTC(+b.slice(0, 4), +b.slice(5, 7), 0)).toISOString().slice(0, 10); }
  function geserBulan(b, n) { var y = +b.slice(0, 4), m = +b.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + dua(m + 1); }
  function hariKe(t) { return new Date(tglUTC(t)).getUTCDay(); }
  function tglTeks(t) { return t ? (+t.slice(8, 10)) + ' ' + BULAN3[+t.slice(5, 7) - 1].replace(/^./, function (c) { return c.toUpperCase(); }) + (t.slice(0, 4) !== String(new Date().getFullYear()) ? ' ' + t.slice(0, 4) : '') : '-'; }
  function namaBulanT(b) { return BULAN[+b.slice(5, 7) - 1].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + b.slice(0, 4); }

  function norm(s) { return String(s || '').toLowerCase().replace(/mofmo ?friends/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function toko(l) { return !!(l && (l.toko === 1 || l.toko === '1' || l.toko === true)); }
  function dipegang(l) { return !!l && (l.k === 'HO' || l.k === 'TRANSIT' || l.k === 'GMT' || toko(l)); }
  function judulKata(s) { return String(s || '').toLowerCase().split(/\s+/).filter(Boolean).map(function (w) { return /^(tk|maa|pik|gi|pim|sgi|ho|cp)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); }
  function namaGerai(l) { if (!l) return ''; if (l.k === 'HO') return id() ? 'Gudang HO' : 'HO warehouse'; if (l.k === 'GMT') return 'Gamotion'; if (l.k === 'TRANSIT') return id() ? 'Di jalan' : 'In transit'; var n = String(l.n || l.k).toUpperCase().replace(/\s+-\s+.*$/, '').replace(/^TOYS KINGDOM( LIVING WORLD)?\s*/, 'TK ').replace(/\bMALL\b\s*/g, ''); return judulKata(n).trim() || l.k; }
  function namaSku(p) { return String((p && (p.n || p.s)) || '').replace(/\bmofmo ?friends\s+/gi, '').replace(/\s+-\s+/, ' ').trim(); }

  /* ---------- pengenal ---------- */
  var RETAIL = { TGI: ['toys kingdom', 'toyskingdom', 'tk', 'tgi', 'toys'], KIY: ['kinokuniya', 'kino', 'kiy', 'kinokunia'], MAA: ['maa', 'babyz', 'baby station', 'babyz station', 'seibu'], GMT: ['gamotion', 'gmt'] };
  var NAMA_R = { TGI: 'Toys Kingdom', KIY: 'Kinokuniya', MAA: 'MAA', GMT: 'Gamotion' };
  var BUANG = ['stok', 'stock', 'sisa', 'berapa', 'brp', 'ada', 'di', 'yang', 'ga', 'gak', 'nggak', 'tidak', 'belum', 'sudah', 'udah', 'laku', 'terjual', 'jual', 'penjualan', 'sales', 'bulan', 'ini', 'lalu', 'kemarin', 'hari', 'minggu', 'pekan', 'sejak', 'dari', 'ke', 'untuk', 'mana', 'apa', 'aja', 'saja', 'dong', 'ya', 'yg', 'dan', 'atau', 'gerai', 'toko', 'store', 'pcs', 'unit', 'how', 'many', 'much', 'the', 'in', 'at', 'of', 'is', 'are', 'left', 'sold', 'this', 'last', 'month', 'week', 'today', 'kapan', 'terakhir', 'opname', 'paling', 'terlaris', 'sku', 'barang', 'produk', 'semua', 'total', 'jumlah', 'masih', 'rak', 'gudang', 'ho', 'cek', 'lihat', 'tolong', 'bisa', 'kasih', 'tau', 'tahu', 'sama', 'sekali'];
  function cariLokasi(q, L) {
    var n = ' ' + norm(q) + ' ', hasil = { gerai: [], retailer: null, ho: false, nama: '' };
    if (/\b(gudang|ho|warehouse|haery)\b/.test(n)) { hasil.ho = true; }
    var skor = [];
    L.forEach(function (l, li) {
      if (!toko(l)) return;
      var nm = norm(String(l.n || '').replace(/^TOYS KINGDOM( LIVING WORLD)?/i, '').replace(/^(KINOKUNIYA|MAA|BABYZ STATION|SEIBU)\s*/i, '')), kata = nm.split(' ').filter(function (w) { return w.length > 2 && ['mall', 'living', 'world', 'grand'].indexOf(w) < 0; });
      var cocok = kata.filter(function (w) { return n.indexOf(' ' + w + ' ') > -1; }).length;
      if (/\bpik\b/.test(n) && /pantai indah kapuk|\bpik\b/i.test(l.n + ' ' + l.k)) cocok += 2;
      if (/\bgi\b|grand indonesia/.test(n) && /grand indonesia|\bgi\b|-gi\b|sgi/i.test(l.n + ' ' + l.k)) cocok += 1;
      if (/\bpim\b|pondok indah/.test(n) && /pim|pondok indah/i.test(l.n + ' ' + l.k)) cocok += 2;
      if (n.indexOf(' ' + norm(l.k) + ' ') > -1) cocok += 3;
      if (cocok) skor.push({ li: li, s: cocok });
    });
    if (skor.length) { var maks = Math.max.apply(null, skor.map(function (x) { return x.s; })); hasil.gerai = skor.filter(function (x) { return x.s === maks; }).map(function (x) { return x.li; }); }
    for (var r in RETAIL) if (RETAIL[r].some(function (w) { return new RegExp('\\b' + w + '\\b').test(n); })) { hasil.retailer = r; break; }
    if (hasil.gerai.length && hasil.retailer) hasil.gerai = hasil.gerai.filter(function (li) { return L[li].r === hasil.retailer || hasil.retailer === 'MAA' && /seibu|babyz|maa/i.test(L[li].n); });
    return hasil;
  }
  function cariSku(q, P, lok) {
    var n = norm(q), kata = n.split(' ').filter(function (w) { return w.length > 1 && BUANG.indexOf(w) < 0; });
    if (lok) { L_KATA(lok).forEach(function (w) { var i = kata.indexOf(w); if (i > -1) kata.splice(i, 1); }); }
    if (!kata.length) return [];
    var jenis = /key ?charm|\bkc\b/.test(n) ? 'charm' : /key ?ring|\bkr\b/.test(n) ? 'ring' : /mascot|ball/.test(n) ? 'ball' : /\bcap\b|topi/.test(n) ? 'cap' : /backpack|ransel|rucksack/.test(n) ? 'tas' : /\bboneka\b|\bplush\b|\bs\b/.test(n) ? 's' : '';
    var skor = [];
    P.forEach(function (p, pi) {
      var nm = norm(p.n || p.s), w = nm.split(' ');
      var cocok = kata.filter(function (k) { return w.indexOf(k) > -1 || (k.length > 3 && nm.indexOf(k) > -1); }).length;
      if (!cocok) return;
      var jp = /key charm/.test(nm) ? 'charm' : /key ring/.test(nm) ? 'ring' : /mascot ball/.test(nm) ? 'ball' : /\bcap\b/.test(nm) ? 'cap' : /backpack|rucksack/.test(nm) ? 'tas' : /^s\b|\bs\b/.test(nm) ? 's' : '';
      if (jenis && jp === jenis) cocok += 2; else if (jenis && jp !== jenis) cocok -= 1;
      if (!jenis && jp === 's') cocok += 0.5;
      skor.push({ pi: pi, s: cocok });
    });
    if (!skor.length) return [];
    var maks = Math.max.apply(null, skor.map(function (x) { return x.s; }));
    return skor.filter(function (x) { return x.s === maks && maks >= 1; }).map(function (x) { return x.pi; });
  }
  var KATA_LOKASI = [];
  function L_KATA() { return KATA_LOKASI; }
  function cariPeriode(q, hariIni) {
    var n = ' ' + norm(q) + ' ', b = hariIni.slice(0, 7), y = +hariIni.slice(0, 4);
    var bulanDari = function (s) { for (var i = 0; i < 12; i++) { if (new RegExp('\\b(' + BULAN[i] + '|' + BULAN_EN[i] + '|' + BULAN3[i] + ')\\b').test(s)) { var mm = y + '-' + dua(i + 1); if (mm > b) mm = (y - 1) + '-' + dua(i + 1); return mm; } } return null; };
    var sejak = n.match(/\b(sejak|since|dari)\s+([a-z]+)/);
    if (sejak) { var mb = bulanDari(' ' + sejak[2] + ' '); if (mb) return { awal: mb + '-01', akhir: hariIni, teks: (id() ? 'sejak ' : 'since ') + namaBulanT(mb) }; }
    if (/\bhari ini\b|\btoday\b/.test(n)) return { awal: hariIni, akhir: hariIni, teks: id() ? 'hari ini' : 'today' };
    if (/\bkemarin\b|\byesterday\b/.test(n)) { var k = geser(hariIni, -1); return { awal: k, akhir: k, teks: id() ? 'kemarin' : 'yesterday' }; }
    if (/\b(minggu|pekan) lalu\b|\blast week\b/.test(n)) { var s0 = geser(hariIni, -((hariKe(hariIni) + 6) % 7) - 7); return { awal: s0, akhir: geser(s0, 6), teks: id() ? 'minggu lalu' : 'last week' }; }
    if (/\b(minggu|pekan) ini\b|\bthis week\b/.test(n)) { var s1 = geser(hariIni, -((hariKe(hariIni) + 6) % 7)); return { awal: s1, akhir: hariIni, teks: id() ? 'minggu ini' : 'this week' }; }
    if (/\bbulan lalu\b|\blast month\b/.test(n)) { var bl = geserBulan(b, -1); return { awal: bl + '-01', akhir: akhirBulan(bl), teks: namaBulanT(bl) }; }
    if (/\bbulan ini\b|\bthis month\b/.test(n)) return { awal: b + '-01', akhir: hariIni, teks: (id() ? 'bulan ini (' : 'this month (') + namaBulanT(b) + ')' };
    var m = bulanDari(n); if (m) return { awal: m + '-01', akhir: m === b ? hariIni : akhirBulan(m), teks: namaBulanT(m) };
    return null;
  }
  function jenisTanya(q) {
    var n = ' ' + norm(q) + ' ';
    if (/\b(jadwal\w*|kunjung\w*|visit|schedule)\b/.test(n) && /\b(indra|pic|ke|cek|minggu depan|besok|tambah\w*)\b/.test(n)) return 'jadwal';
    if (/\b(belum|tidak|ga|gak|nggak|no)\b.*\b(laku|terjual|jual|sales|sold)\b/.test(n) && /\b(gerai|toko|store|mana|which)\b/.test(n)) return 'sepi';
    if (/\b(stok|stock) mati\b|\bdead stock\b|\b(lambat|diam|slow)\b|\btidak laku\b/.test(n)) return 'mati';
    if (/\bterlaris\b|\bpaling laku\b|\bbest ?sell\w*\b|\btop\b/.test(n)) return 'laris';
    if (/\b(di jalan|transit|perjalanan|in transit)\b/.test(n)) return 'jalan';
    if (/\bopname\b|\bstock ?count\b|\bhitung fisik\b/.test(n)) return 'opname';
    if (/\b(terjual|penjualan|laku|sales|sold|omzet|omset|jual)\b/.test(n)) return 'jual';
    if (/\b(stok|stock|sisa|ada berapa|berapa|left|inventory|persediaan)\b/.test(n)) return 'stok';
    return '';
  }

  /* ---------- buku besar ---------- */
  function siapkan(dp) {
    var L = dp.lok || [];
    return (dp.baris || []).map(function (b, i) { return { t: String(b[0]).slice(0, 10), pi: b[1], q: Number(b[2]) || 0, d: L[b[3]], k: L[b[4]], dl: b[3], kl: b[4], i: i }; })
      .filter(function (x) { return x.d && x.k && x.q && /^\d{4}-\d{2}-\d{2}$/.test(x.t); }).sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : a.i - b.i; });
  }
  function saldo(B, sampai) { var s = {}; B.forEach(function (x) { if (sampai && x.t > sampai) return; if (dipegang(x.d)) { var a = s[x.dl] = s[x.dl] || {}; a[x.pi] = (a[x.pi] || 0) - x.q; } if (dipegang(x.k)) { var c = s[x.kl] = s[x.kl] || {}; c[x.pi] = (c[x.pi] || 0) + x.q; } }); return s; }

  /* jawab(q, dp, gudang) -> { jenis, judul, isi: [teks], baris: [[kiri, kanan]], aksi: [{teks, buka}], sumber } */
  function jawab(q, dp, gudang) {
    var L = dp.lok || [], P = dp.prod || [], hariIni = String(dp.hariIni || new Date().toISOString()).slice(0, 10), ID = id();
    var jenis = jenisTanya(q), lok = cariLokasi(q, L), per = cariPeriode(q, hariIni);
    KATA_LOKASI = []; lok.gerai.forEach(function (li) { norm(L[li].n).split(' ').forEach(function (w) { if (w.length > 2) KATA_LOKASI.push(w); }); });
    if (lok.retailer) RETAIL[lok.retailer].forEach(function (w) { norm(w).split(' ').forEach(function (x) { KATA_LOKASI.push(x); }); });
    var sku = cariSku(q, P, true), B = siapkan(dp);
    var sumber = (ID ? 'Buku besar WMS, data per ' : 'WMS ledger, data as of ') + (dp.diperbarui || hariIni);
    var lokasiDipilih = function (l, li) { if (lok.gerai.length) return lok.gerai.indexOf(li) > -1; if (lok.retailer) return lok.retailer === 'GMT' ? l.k === 'GMT' : toko(l) && l.r === lok.retailer; if (lok.ho) return l.k === 'HO'; return true; };
    var adaFilterLok = !!(lok.gerai.length || lok.retailer || lok.ho);
    var namaFilter = lok.gerai.length ? lok.gerai.map(function (li) { return namaGerai(L[li]); }).join(', ') : lok.retailer ? NAMA_R[lok.retailer] : lok.ho ? namaGerai({ k: 'HO' }) : '';
    if (!jenis && sku.length) jenis = 'stok';
    if (jenis === 'stok') {
      var s = saldo(B), pis = sku.length ? sku : null;
      if (!pis && !adaFilterLok) return bantuan(q);
      var baris = [], total = 0;
      L.forEach(function (l, li) {
        if (!dipegang(l) || !lokasiDipilih(l, li)) return;
        var m = s[li] || {}, n = 0;
        if (pis) pis.forEach(function (pi) { n += m[pi] || 0; }); else for (var pi in m) if (m[pi] > 0) n += m[pi];
        if (n > 0 || (adaFilterLok && toko(l))) { baris.push([namaGerai(l), n + ' pcs']); total += n; }
      });
      var subjek = pis ? pis.map(function (pi) { return namaSku(P[pi]); }).slice(0, 3).join(', ') : (ID ? 'Semua SKU' : 'All SKUs');
      var isi = [subjek + (namaFilter ? (ID ? ' di ' : ' at ') + namaFilter : '') + ': ' + total + (ID ? ' pcs.' : ' pcs.')];
      var aksi = [];
      if (pis && pis.length === 1) {
        var pi0 = pis[0], rak = ((gudang && gudang.lokasi) || []).filter(function (x) { return String(x.barcode) === String(P[pi0].b) && Number(x.isi) > 0; });
        if (rak.length && (!adaFilterLok || lok.ho)) isi.push((ID ? 'Di rak gudang: ' : 'On warehouse racks: ') + rak.map(function (x) { return x.kode + ' ' + x.isi; }).join(', ') + '.');
        if (adaFilterLok && lok.gerai.length === 1) {
          var li0 = lok.gerai[0], tiba = '', laku = '';
          B.forEach(function (x) { if (x.pi !== pi0) return; if (x.kl === li0 && !tiba) tiba = x.t; if (x.dl === li0 && x.k.k === 'TERJUAL') laku = x.t; });
          if (tiba) isi.push((ID ? 'Di rak sejak ' : 'On the shelf since ') + tglTeks(tiba) + ' (' + selisih(tiba, hariIni) + (ID ? ' hari)' : ' days)') + '; ' + (laku ? (ID ? 'terakhir laku ' : 'last sold ') + tglTeks(laku) : (ID ? 'belum pernah laku di sini' : 'never sold here')) + '.');
          var op = (dp.opname || []).filter(function (o) { return o.kode === L[li0].k; })[0];
          if (op) isi.push((ID ? 'Opname terakhir: ' : 'Last count: ') + (op.terakhir ? tglTeks(String(op.terakhir).slice(0, 10)) : (ID ? 'belum pernah' : 'never')) + '.');
        }
        aksi.push({ teks: ID ? 'Buka paspor SKU' : 'Open SKU passport', buka: 'paspor', arg: { bc: P[pi0].b, nama: P[pi0].n } });
      }
      return { jenis: 'stok', judul: isi[0], isi: isi.slice(1), baris: (pis && baris.length > 1) || !pis ? baris.slice(0, 14) : [], aksi: aksi, sumber: sumber };
    }
    if (jenis === 'jual' || jenis === 'laris') {
      var pr = per || { awal: hariIni.slice(0, 7) + '-01', akhir: hariIni, teks: (ID ? 'bulan ini (' : 'this month (') + namaBulanT(hariIni.slice(0, 7)) + ')' };
      var pcs = 0, nilai = 0, perG = {}, perS = {};
      B.forEach(function (x) {
        if (x.t < pr.awal || x.t > pr.akhir || !dipegang(x.d) || x.k.k !== 'TERJUAL' || !lokasiDipilih(x.d, x.dl)) return;
        if (sku.length && jenis === 'jual' && sku.indexOf(x.pi) < 0) return;
        var v = x.q * (Number((P[x.pi] || {}).h) || 0); pcs += x.q; nilai += v;
        var g = perG[x.dl] = perG[x.dl] || { n: namaGerai(x.d), pcs: 0, nilai: 0 }; g.pcs += x.q; g.nilai += v;
        var s2 = perS[x.pi] = perS[x.pi] || { n: namaSku(P[x.pi]), pcs: 0, nilai: 0 }; s2.pcs += x.q; s2.nilai += v;
      });
      var subj = (sku.length && jenis === 'jual' ? sku.map(function (pi) { return namaSku(P[pi]); }).slice(0, 2).join(', ') + ' ' : '') + (namaFilter ? (ID ? 'di ' : 'at ') + namaFilter + ' ' : '');
      if (jenis === 'laris') {
        var top = Object.keys(perS).map(function (k) { return perS[k]; }).sort(function (a, b) { return b.pcs - a.pcs || b.nilai - a.nilai; }).slice(0, 5);
        return { jenis: 'laris', judul: (ID ? 'SKU terlaris ' : 'Best sellers ') + subj + pr.teks + (top.length ? ': ' + top[0].n + ' (' + top[0].pcs + ' pcs).' : (ID ? ': belum ada penjualan.' : ': no sales yet.')), isi: [], baris: top.map(function (x, i) { return [(i + 1) + '. ' + x.n, x.pcs + ' pcs · ' + rp(x.nilai)]; }), aksi: [], sumber: sumber };
      }
      var gr = Object.keys(perG).map(function (k) { return perG[k]; }).sort(function (a, b) { return b.nilai - a.nilai; });
      return { jenis: 'jual', judul: (ID ? 'Terjual ' : 'Sold ') + subj + pr.teks + ': ' + pcs + ' pcs, ' + rp(nilai) + '.', isi: [ID ? 'Nilai = pcs x harga wholesale termasuk PPN.' : 'Value = pcs x wholesale price incl. VAT.'], baris: gr.length > 1 ? gr.slice(0, 12).map(function (x) { return [x.n, x.pcs + ' pcs · ' + rp(x.nilai)]; }) : [], aksi: [], sumber: sumber };
    }
    if (jenis === 'sepi') {
      var dari = per ? per.awal : geser(hariIni, -30), s3 = saldo(B), baris3 = [];
      L.forEach(function (l, li) {
        if (!toko(l) || !lokasiDipilih(l, li)) return;
        var stok = 0, m3 = s3[li] || {}; for (var p3 in m3) if (m3[p3] > 0) stok += m3[p3];
        if (stok <= 0) return;
        var laku = B.some(function (x) { return x.dl === li && x.k.k === 'TERJUAL' && x.t >= dari; }); if (laku) return;
        var ak = ''; B.forEach(function (x) { if (x.dl === li && x.k.k === 'TERJUAL') ak = x.t; });
        var op = (dp.opname || []).filter(function (o) { return o.kode === l.k; })[0];
        baris3.push([namaGerai(l), stok + ' pcs · ' + (ak ? (ID ? 'laku terakhir ' : 'last sale ') + tglTeks(ak) : (ID ? 'belum pernah laku' : 'never sold')) + (op ? ' · ' + (ID ? 'opname ' : 'count ') + (op.terakhir ? tglTeks(String(op.terakhir).slice(0, 10)) : (ID ? 'belum' : 'none')) : '')]);
      });
      return { jenis: 'sepi', judul: baris3.length ? (ID ? baris3.length + ' gerai punya stok di rak tapi tanpa penjualan ' : baris3.length + ' stores have stock but no sales ') + (per ? per.teks : (ID ? 'dalam 30 hari' : 'in 30 days')) + '.' : (ID ? 'Semua gerai yang punya stok sudah laku ' : 'Every store with stock has sold ') + (per ? per.teks : (ID ? 'dalam 30 hari' : 'in 30 days')) + '.', isi: [], baris: baris3, aksi: baris3.length ? [{ teks: ID ? 'Buka rapor mitra' : 'Open partner report cards', buka: 'kontrol', arg: 'rapor' }] : [], sumber: sumber };
    }
    if (jenis === 'mati') {
      var lot = {}, pernah = {}, s4 = [];
      B.forEach(function (x) {
        if (toko(x.k)) { var kk = x.kl + '|' + x.pi; (lot[kk] = lot[kk] || []).push({ t: x.t, q: x.q }); }
        if (toko(x.d)) { var kd = x.dl + '|' + x.pi, a = lot[kd] || [], sisa = x.q; while (sisa > 0 && a.length) { var h = a[0], ambil = Math.min(h.q, sisa); h.q -= ambil; sisa -= ambil; if (!h.q) a.shift(); } if (x.k.k === 'TERJUAL') pernah[kd] = 1; }
      });
      Object.keys(lot).forEach(function (kk) { var a = lot[kk], q4 = a.reduce(function (s, h) { return s + h.q; }, 0), p4 = kk.split('|'), li = +p4[0]; if (!q4 || pernah[kk] || !lokasiDipilih(L[li], li) || selisih(a[0].t, hariIni) <= 30) return; s4.push({ n: namaSku(P[+p4[1]]), g: namaGerai(L[li]), q: q4, hari: selisih(a[0].t, hariIni) }); });
      s4.sort(function (a, b) { return b.hari - a.hari || b.q - a.q; });
      var tq = s4.reduce(function (s, x) { return s + x.q; }, 0);
      return { jenis: 'mati', judul: s4.length ? (ID ? 'Stok mati' + (namaFilter ? ' di ' + namaFilter : '') + ': ' + s4.length + ' SKU-gerai, ' + tq + ' pcs (di rak lebih dari 30 hari, belum pernah laku di gerai itu).' : 'Dead stock: ' + s4.length + ' store SKUs, ' + tq + ' pcs.') : (ID ? 'Tidak ada stok mati' + (namaFilter ? ' di ' + namaFilter : '') + '.' : 'No dead stock.'), isi: [], baris: s4.slice(0, 12).map(function (x) { return [x.n + ' · ' + x.g, x.q + ' pcs · ' + x.hari + (ID ? ' hari' : ' days')]; }), aksi: [], sumber: sumber };
    }
    if (jenis === 'jalan') {
      var lt = [], tr = -1; L.forEach(function (l, i) { if (l.k === 'TRANSIT') tr = i; });
      B.forEach(function (x) { if (x.kl === tr) lt.push({ t: x.t, pi: x.pi, q: x.q }); if (x.dl === tr) { var sisa = x.q; for (var i = 0; i < lt.length && sisa > 0; i++) { if (lt[i].pi !== x.pi || !lt[i].q) continue; var am = Math.min(lt[i].q, sisa); lt[i].q -= am; sisa -= am; } } });
      lt = lt.filter(function (x) { return x.q > 0; });
      var tot = lt.reduce(function (s, x) { return s + x.q; }, 0);
      return { jenis: 'jalan', judul: tot ? (ID ? tot + ' pcs masih di jalan.' : tot + ' pcs still in transit.') : (ID ? 'Tidak ada barang di jalan.' : 'Nothing in transit.'), isi: [], baris: lt.slice(0, 12).map(function (x) { return [namaSku(P[x.pi]), x.q + ' pcs · ' + (ID ? 'berangkat ' : 'left ') + tglTeks(x.t) + ' (' + selisih(x.t, hariIni) + (ID ? ' hari)' : ' days)')]; }), aksi: [], sumber: sumber };
    }
    if (jenis === 'opname') {
      var ops = (dp.opname || []).filter(function (o) { var l = L.filter(function (x) { return x.k === o.kode; })[0], li = L.indexOf(l); return o.wajib !== false && (!adaFilterLok || (l && lokasiDipilih(l, li))); });
      var lewat = ops.filter(function (o) { return !o.terakhir || selisih(String(o.terakhir).slice(0, 10), hariIni) > 30; });
      return { jenis: 'opname', judul: adaFilterLok && ops.length === 1 ? (ID ? 'Opname terakhir ' : 'Last count at ') + namaGerai(L.filter(function (x) { return x.k === ops[0].kode; })[0] || { k: ops[0].kode }) + ': ' + (ops[0].terakhir ? tglTeks(String(ops[0].terakhir).slice(0, 10)) + ' (' + selisih(String(ops[0].terakhir).slice(0, 10), hariIni) + (ID ? ' hari lalu).' : ' days ago).') : (ID ? 'belum pernah.' : 'never.')) : (ID ? lewat.length + ' dari ' + ops.length + ' lokasi wajib belum opname dalam 30 hari.' : lewat.length + ' of ' + ops.length + ' required locations not counted in 30 days.'),
        isi: [], baris: (adaFilterLok && ops.length === 1 ? [] : lewat).map(function (o) { return [namaGerai(L.filter(function (x) { return x.k === o.kode; })[0] || { k: o.kode, n: o.nama }), o.terakhir ? tglTeks(String(o.terakhir).slice(0, 10)) : (ID ? 'belum pernah' : 'never')]; }), aksi: [], sumber: sumber };
    }
    if (jenis === 'jadwal') {
      var g = lok.gerai.length === 1 ? L[lok.gerai[0]] : null, nq = ' ' + norm(q) + ' ';
      var mulai = /\bbesok\b|\btomorrow\b/.test(nq) ? geser(hariIni, 1) : /\bminggu depan\b|\bpekan depan\b|\bnext week\b/.test(nq) ? geser(hariIni, 7 - ((hariKe(hariIni) + 6) % 7)) : geser(hariIni, 1);
      var t = mulai; for (var i = 0; i < 7 && (hariKe(t) === 0 || hariKe(t) === 6); i++) t = geser(t, 1);
      if (/\bminggu depan\b|\bpekan depan\b|\bnext week\b/.test(nq)) t = geser(mulai, 2);
      return { jenis: 'jadwal', perluOk: true, judul: g ? (ID ? 'Perlu persetujuanmu: tambah kunjungan ' + namaGerai(g) + ' hari ' + HARI[hariKe(t)] + ' ' + tglTeks(t) + ' untuk Operational PIC, dengan opname penuh dan foto display.' : 'Needs your OK: add a visit to ' + namaGerai(g) + ' on ' + tglTeks(t) + '.') : (ID ? 'Sebutkan gerainya, misalnya "jadwalin Indra ke Margo City minggu depan".' : 'Name the store, for example "schedule Indra at Margo City next week".'),
        isi: [ID ? 'Tanya WMS tidak menyimpan apa pun. Tombol di bawah membuka Jadwal; tanggalnya kamu yang ketuk lalu simpan.' : 'Ask the WMS never saves anything. The button opens the Schedule; you tap the date and save.'], baris: [], aksi: g ? [{ teks: ID ? 'Buka Jadwal' : 'Open Schedule', buka: 'jadwal', arg: { gerai: g.k, tanggal: t } }] : [], sumber: '', usul: g ? { gerai: g.k, tanggal: t } : null };
    }
    return bantuan(q);
  }
  var CONTOH = { id: ['stok reindeer di kota wisata berapa?', 'gerai mana yang belum laku sejak september?', 'penjualan toys kingdom bulan ini', 'sku terlaris bulan lalu', 'stok mati di kinokuniya', 'barang di jalan', 'kapan opname terakhir margo city', 'jadwalin indra cek margo city minggu depan'],
    en: ['how many reindeer at kota wisata?', 'which stores have not sold since september?', 'toys kingdom sales this month', 'best sellers last month', 'dead stock at kinokuniya', 'goods in transit', 'last stock count at margo city'] };
  function bantuan(q) { var ID = id(); return { jenis: 'bantuan', judul: (ID ? 'Belum paham pertanyaan "' : 'I did not understand "') + String(q || '').slice(0, 80) + (ID ? '". Coba salah satu bentuk ini:' : '". Try one of these:'), isi: [], baris: [], aksi: [], contoh: CONTOH[ID ? 'id' : 'en'], sumber: '' }; }

  /* ---------- lembar ---------- */
  var S = { dp: null, gudang: null, riwayat: [], janji: null, dari: null };
  function muat() {
    if (S.janji) return S.janji;
    var m = M();
    var pD = m.jalan ? m.jalan('dataPapan', ['WMS-TIKET']).then(function (x) { return x && x.baris ? x : null; }, function () { return null; }) : Promise.resolve(null);
    var pG = m.potret ? m.potret(['wmsGudang|["K"]']).then(function (isi) { var x = isi['wmsGudang|["K"]']; return x && x.data && x.data.lokasi ? x.data : null; }, function () { return null; }) : Promise.resolve(null);
    S.janji = Promise.all([pD, pG]).then(function (r) { S.dp = r[0]; S.gudang = r[1]; if (!S.dp) { S.janji = null; throw new Error('data'); } return S; });
    return S.janji;
  }
  var TT = { id: { judul: 'Tanya WMS', sub: 'Jawaban dari buku besar yang sama dengan papan. Membaca tidak pernah mengubah data.', tutup: 'Tutup', label: 'Tanya apa saja soal stok, penjualan, gerai, opname', tanya: 'Tanya', muat: 'Membaca buku besar…', gagal: 'Buku besar belum bisa dibaca. Cek sinyal lalu coba lagi.', kaki: 'Yang menulis (jadwal, kiriman, koreksi) selalu menunggu persetujuanmu di alatnya sendiri.' },
    en: { judul: 'Ask the WMS', sub: 'Answers come from the same ledger as the board. Reading never changes data.', tutup: 'Close', label: 'Ask about stock, sales, stores, stock counts', tanya: 'Ask', muat: 'Reading the ledger…', gagal: 'The ledger could not be read. Check the signal and try again.', kaki: 'Anything that writes (schedule, shipments, corrections) always waits for your OK in its own tool.' } };
  function T(k) { return TT[id() ? 'id' : 'en'][k]; }
  function pastikanDom() {
    if (el('tanya')) return el('tanya');
    var d = W.document.createElement('div');
    d.id = 'tanya'; d.className = 'alat-latar tanya-latar'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="lembar" role="dialog" aria-modal="true" tabindex="-1"><div id="tanyaIsi"></div></div>';
    W.document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      if (e.target === d) { tutup(); return; }
      var x = e.target.closest ? e.target.closest('[data-tanya],[data-tanya-contoh],[data-tanya-aksi]') : null; if (!x) return;
      if (x.hasAttribute('data-tanya-contoh')) { var i = el('tanyaKotak'); if (i) i.value = x.getAttribute('data-tanya-contoh'); kirim(); return; }
      if (x.hasAttribute('data-tanya-aksi')) { aksi(+x.getAttribute('data-tanya-aksi'), +x.getAttribute('data-tanya-n')); return; }
      if (x.getAttribute('data-tanya') === 'tutup') tutup();
    });
    d.addEventListener('submit', function (e) { if (e.target && e.target.id === 'tanyaForm') { e.preventDefault(); kirim(); } });
    W.document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('buka')) { e.preventDefault(); tutup(); } });
    return d;
  }
  var IKON_TUTUP = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function buka() {
    var d = pastikanDom();
    if (!d.classList.contains('buka')) S.dari = W.document.activeElement;
    d.classList.add('buka'); d.setAttribute('aria-hidden', 'false'); W.document.body.classList.add('alat-terbuka');
    d.querySelector('.lembar').setAttribute('aria-label', T('judul'));
    bunyi('klik');
    el('tanyaIsi').innerHTML = '<div class="kepala-alat lp-kepala"><div class="lp-judul"><h2>' + esc(T('judul')) + '</h2><small>' + esc(T('sub')) + '</small></div><button type="button" class="tutup-alat" data-tanya="tutup" aria-label="' + esc(T('tutup')) + '" title="' + esc(T('tutup')) + '">' + IKON_TUTUP + '</button></div>' +
      '<form id="tanyaForm" class="scan-baris" autocomplete="off"><label for="tanyaKotak" class="lbl">' + esc(T('label')) + '</label><div class="scan-input"><input id="tanyaKotak" type="text" enterkeyhint="send" placeholder="' + esc(CONTOH[id() ? 'id' : 'en'][0]) + '"><button type="submit" class="btn">' + esc(T('tanya')) + '</button></div></form>' +
      '<div class="tny-contoh">' + CONTOH[id() ? 'id' : 'en'].map(function (c) { return '<button type="button" class="chip-alat" data-tanya-contoh="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<div id="tanyaJawab" class="tny-jawab" aria-live="polite"></div><p class="ket-alat">' + esc(T('kaki')) + '</p>';
    gambarRiwayat();
    setTimeout(function () { var i = el('tanyaKotak'); if (i) i.focus(); }, 30);
    muat().catch(function () {});
  }
  function tutup() {
    var d = el('tanya'); if (!d) return;
    d.classList.remove('buka'); d.setAttribute('aria-hidden', 'true');
    if (!W.document.querySelector('.alat-latar.buka')) W.document.body.classList.remove('alat-terbuka');
    try { if (S.dari && S.dari.focus) S.dari.focus(); } catch (e) {}
  }
  function kirim() {
    var i = el('tanyaKotak'), q = i ? i.value.trim() : ''; if (!q) return;
    if (i) i.value = '';
    bunyi('klik');
    var item = { q: q, j: null, galat: '' }; S.riwayat.unshift(item); S.riwayat = S.riwayat.slice(0, 8); gambarRiwayat();
    muat().then(function () { item.j = jawab(q, S.dp, S.gudang); }, function () { item.galat = T('gagal'); }).then(gambarRiwayat);
  }
  function aksi(n, k) {
    var it = S.riwayat[n], a = it && it.j && it.j.aksi[k]; if (!a) return;
    bunyi('klik'); tutup();
    var h = W.__wmsPapan || {};
    if (a.buka === 'paspor' && W.WmsAlat) W.WmsAlat.paspor(a.arg);
    else if (a.buka === 'kontrol' && W.WmsKontrol) W.WmsKontrol.buka(a.arg);
    else if (a.buka === 'jadwal' && W.WmsJadwal) W.WmsJadwal.buka();
  }
  function gambarRiwayat() {
    var w = el('tanyaJawab'); if (!w) return;
    w.innerHTML = S.riwayat.map(function (it, n) {
      var j = it.j;
      var badan = it.galat ? '<p class="tolak-alat">' + esc(it.galat) + '</p>' : !j ? '<p class="ket-alat">' + esc(T('muat')) + '</p>' :
        '<div class="tny-kartu j-' + j.jenis + (j.perluOk ? ' perlu-ok' : '') + '"><b>' + esc(j.judul) + '</b>' + j.isi.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') +
        (j.baris.length ? '<table class="tny-tabel"><tbody>' + j.baris.map(function (b) { return '<tr><td>' + esc(b[0]) + '</td><td class="num">' + esc(b[1]) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
        (j.contoh ? '<div class="tny-contoh">' + j.contoh.map(function (c) { return '<button type="button" class="chip-alat" data-tanya-contoh="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' : '') +
        (j.aksi.length ? '<div class="tny-aksi">' + j.aksi.map(function (a, k) { return '<button type="button" class="btn dua kn-kecil" data-tanya-aksi="' + n + '" data-tanya-n="' + k + '">' + esc(a.teks) + '</button>'; }).join('') + '</div>' : '') +
        (j.sumber ? '<small>' + esc(j.sumber) + '</small>' : '') + '</div>';
      return '<div class="tny-item"><p class="tny-q">' + esc(it.q) + '</p>' + badan + '</div>';
    }).join('');
  }

  W.WmsTanya = { buka: buka, tutup: tutup, jawab: jawab, _periode: cariPeriode, _lokasi: cariLokasi, _jenis: jenisTanya };
})();
