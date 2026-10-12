/* HPP mitra WMS Mofmofriends (12 Okt 2026): tab "HPP mitra" di Kontrol,
 * Excel HPP, dan PDF ringkasan.
 *
 * Antrean S4 ("semuanyaa"): HPP penjualan konsinyasi per mitra per bulan
 * untuk Pak Win, susunannya sama dengan Excel HPP Agustus dan September yang
 * dulu disusun tangan. Rumusnya:
 *  - HPP/pcs = wholesale sebelum PPN (hs di Master Produk), sama untuk semua
 *    mitra.
 *  - Harga rak termasuk PPN: TGI = hs / (1 - 37,5%) x 1,11 (dasar penyusunan
 *    harga rak, bukan komisi); Kinokuniya = hs / (1 - 35%) x 1,11; MAA = hs /
 *    (1 - 45%) x 1,11 sebagai perkiraan, di Excel bisa diganti harga COC.
 *  - Tagihan/pcs sebelum PPN = harga rak x (1 - promo) / (1 + PPN) x
 *    (1 - komisi mitra). Komisi TGI 35%, Kinokuniya 35%, MAA 45%.
 *  - Promo (flash sale 15%) ditandai per baris gerai x SKU, disimpan di
 *    perangkat ini, dan ikut ke Excel.
 *  - Invoice mitra di WMS dicatat sebelum PPN (TGI 1 boneka = 182.000,
 *    Kinokuniya = wholesale), jadi dibandingkan dengan tagihan sebelum PPN.
 * Gamotion (beli putus) dan penjualan langsung tidak ikut.
 * Excel ditulis sendiri sebagai SpreadsheetML (JSZip dari pustaka PptxGenJS
 * yang sudah ada di situs): semua angka turunan berupa rumus, sel input biru
 * di latar kuning, huruf Arial. Lembar ini cuma membaca.
 */
(function () {
  var W = window;
  function M() { return W.__wms || {}; }
  function id() { return !!(M().bhs && M().bhs() === 'id'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function el(i) { return W.document ? W.document.getElementById(i) : null; }
  function bunyi(n) { try { var S = M().Suara; if (S && S[n]) S[n](); } catch (e) {} }
  function ribu(n, p) { return String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, p); }
  function rp(n) { return (Number(n) < -0.5 ? '-' : '') + 'Rp' + ribu(n, id() ? '.' : ','); }
  function rpId(n) { return (Number(n) < -0.5 ? '-' : '') + 'Rp' + ribu(n, '.'); }
  function pc(x) { return Math.round(x * 1000) / 10 + '%'; }
  var BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function namaBulan(b, pakaiId) { return ((pakaiId == null ? id() : pakaiId) ? BULAN_ID : BULAN_EN)[+String(b).slice(5, 7) - 1] + ' ' + String(b).slice(0, 4); }
  function akhirBulan(b) { var y = +b.slice(0, 4), m = +b.slice(5, 7); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
  function toko(l) { return !!(l && (l.toko === 1 || l.toko === '1' || l.toko === true)); }
  function judulKata(s) { return String(s || '').toLowerCase().split(/\s+/).filter(Boolean).map(function (w) { return /^(tk|maa|pik|gi|pim|sgi|ho)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); }
  function namaGerai(l) { var n = String((l && l.n) || (l && l.k) || '').toUpperCase().replace(/\s+-\s+.*$/, ''); n = n.replace(/^TOYS KINGDOM( LIVING WORLD)?\s*/, 'TK ').replace(/\bMALL\b\s*/g, ''); return judulKata(n).trim() || (l && l.k) || ''; }
  function kategori(n) {
    n = String(n || '');
    var K = [[/mini\s*backpack/i, 'Mini Backpack'], [/mini\s*ruck/i, 'Mini Rucksack'], [/key\s*ring/i, 'Key Ring'], [/key\s*charm/i, 'Key Charm'], [/mascot\s*ball/i, 'Mascot Ball'], [/\bcap\b/i, 'Cap'], [/\bM\s*-/, 'Plush M'], [/\bS\s*-/, 'Plush S']];
    for (var i = 0; i < K.length; i++) if (K[i][0].test(n)) return K[i][1];
    return '';
  }

  var MITRA = ['TGI', 'KIY', 'MAA'];
  var NAMA_PT = { TGI: 'Toys Games Indonesia', KIY: 'Kinokuniya Bukindo', MAA: 'MAA' };
  var BAWAAN = { ppn: 0.11, kTGI: 0.35, dasarTGI: 0.375, kKIY: 0.35, mMAA: 0.45, flash: 0.15 };
  function opsiSah(o) { var x = {}; for (var k in BAWAAN) { var n = o && o[k] != null ? Number(o[k]) : NaN; x[k] = n >= 0 && n < 0.95 ? n : BAWAAN[k]; } return x; }
  function rakDari(r, hs, o) { var d = r === 'TGI' ? o.dasarTGI : r === 'KIY' ? o.kKIY : o.mMAA; return hs / (1 - d) * (1 + o.ppn); }
  function komisiDari(r, o) { return r === 'TGI' ? o.kTGI : r === 'KIY' ? o.kKIY : o.mMAA; }

  /* ================= hitungan ================= */
  function hitung(dp, opsi) {
    opsi = opsi || {};
    var o = opsiSah(opsi.opsi), L = dp.lok || [], P = dp.prod || [];
    var promo = {}; (opsi.promo || []).forEach(function (k) { promo[k] = 1; });
    var bulanSet = {}, grup = {}, sisa = {};
    var B = (dp.baris || []).map(function (b, i) { return { t: String(b[0]).slice(0, 10), pi: b[1], q: Number(b[2]) || 0, d: L[b[3]], k: L[b[4]], dl: b[3], kl: b[4], i: i }; })
      .filter(function (x) { return x.d && x.k && x.q && /^\d{4}-\d{2}-\d{2}$/.test(x.t); });
    B.forEach(function (x) { if (toko(x.d) && MITRA.indexOf(x.d.r) > -1 && x.k.k === 'TERJUAL') bulanSet[x.t.slice(0, 7)] = 1; });
    var pilihanBulan = Object.keys(bulanSet).sort().reverse();
    /* bawaan: bulan tutup (bulan sebelum hari ini) kalau ada penjualannya */
    var hi = String(dp.hariIni || new Date().toISOString()).slice(0, 7), y0 = +hi.slice(0, 4), m0 = +hi.slice(5, 7) - 1; if (m0 < 1) { m0 = 12; y0--; }
    var bulanTutup = y0 + '-' + (m0 < 10 ? '0' : '') + m0;
    var bulan = opsi.bulan && /^\d{4}-\d{2}$/.test(opsi.bulan) ? opsi.bulan : (pilihanBulan.indexOf(bulanTutup) > -1 ? bulanTutup : (pilihanBulan[0] || bulanTutup));
    var akhir = akhirBulan(bulan);
    B.forEach(function (x) {
      if (x.t > akhir) return;
      if (toko(x.k)) { var a = x.kl + '|' + x.pi; sisa[a] = (sisa[a] || 0) + x.q; }
      if (toko(x.d)) { var b = x.dl + '|' + x.pi; sisa[b] = (sisa[b] || 0) - x.q; }
      if (x.t.slice(0, 7) !== bulan || !toko(x.d) || MITRA.indexOf(x.d.r) < 0 || x.k.k !== 'TERJUAL') return;
      var kk = x.dl + '|' + x.pi, g = grup[kk] = grup[kk] || { li: x.dl, pi: x.pi, qty: 0 };
      g.qty += x.q;
    });
    var rinci = Object.keys(grup).map(function (kk) {
      var g = grup[kk], l = L[g.li], p = P[g.pi] || {}, r = l.r, hs = Number(p.hs) || 0;
      var rak = rakDari(r, hs, o), d = promo[l.k + '|' + g.pi] ? o.flash : 0, km = komisiDari(r, o);
      var tPcs = rak * (1 - d) / (1 + o.ppn) * (1 - km);
      return { r: r, k: l.k, gerai: namaGerai(l), pi: g.pi, sku: p.n || p.s || '', kode: p.s || '', kat: kategori(p.n), qty: g.qty, hppPcs: hs, hpp: g.qty * hs, rak: rak, promo: d, rakJual: rak * (1 - d), komisi: km,
        tagihPcs: tPcs, tagih: tPcs * g.qty, selisih: tPcs * g.qty - g.qty * hs, sisa: Math.max(0, sisa[g.li + '|' + g.pi] || 0), sumber: r === 'TGI' ? 'Harga rak Master Produk (dasar 37,5%)' : r === 'KIY' ? 'Harga rak tier T2 (35%)' : 'Perkiraan dari margin 45%; ganti dengan harga COC' };
    }).sort(function (a, b) { return MITRA.indexOf(a.r) - MITRA.indexOf(b.r) || (a.gerai < b.gerai ? -1 : a.gerai > b.gerai ? 1 : 0) || b.qty - a.qty || (a.sku < b.sku ? -1 : 1); });
    var inv = {}; (dp.invoiceMitra || []).forEach(function (im) { if (im.bulan !== bulan) return; for (var g in (im.gerai || {})) inv[g] = im.gerai[g]; });
    var mitra = MITRA.map(function (r) {
      var rr = rinci.filter(function (x) { return x.r === r; }), m = { r: r, nama: NAMA_PT[r], komisi: komisiDari(r, o), pcs: 0, hpp: 0, tagih: 0, invoice: null, gerai: [] };
      rr.forEach(function (x) { m.pcs += x.qty; m.hpp += x.hpp; m.tagih += x.tagih; var g = m.gerai.filter(function (y) { return y.k === x.k; })[0]; if (!g) { g = { k: x.k, nama: x.gerai, pcs: 0, hpp: 0, tagih: 0 }; m.gerai.push(g); } g.pcs += x.qty; g.hpp += x.hpp; g.tagih += x.tagih; });
      L.forEach(function (l) { if (toko(l) && l.r === r && inv[l.k]) m.invoice = (m.invoice || 0) + (Number(inv[l.k].nilai) || 0); });
      m.tagihPpn = m.tagih * (1 + o.ppn); m.selisih = m.tagih - m.hpp;
      m.selInv = m.invoice == null ? null : m.invoice - m.tagih;
      m.status = m.invoice == null ? (m.pcs ? 'tanpa' : 'kosong') : Math.abs(m.selInv) <= Math.max(1000, m.tagih * 0.01) ? 'cocok' : 'selisih';
      return m;
    }).filter(function (m) { return m.pcs > 0 || m.invoice != null; });
    var total = { pcs: 0, hpp: 0, tagih: 0 }; mitra.forEach(function (m) { total.pcs += m.pcs; total.hpp += m.hpp; total.tagih += m.tagih; });
    total.tagihPpn = total.tagih * (1 + o.ppn); total.selisih = total.tagih - total.hpp;
    var geraiN = {}; rinci.forEach(function (x) { geraiN[x.k] = 1; });
    return { bulan: bulan, pilihanBulan: pilihanBulan, opsi: o, rinci: rinci, mitra: mitra, total: total, nGerai: Object.keys(geraiN).length, hariIni: String(dp.hariIni || '').slice(0, 10), terakhir: B.length ? B.map(function (x) { return x.t; }).sort().pop() : '' };
  }

  /* ================= promo di perangkat ================= */
  var KUNCI_PROMO = 'wms_hpp_promo';
  function bacaPromo(b) { try { var a = JSON.parse(W.localStorage.getItem(KUNCI_PROMO) || '{}') || {}; return Array.isArray(a[b]) ? a[b] : []; } catch (e) { return []; } }
  function gantiPromo(b, k) {
    var a = {}; try { a = JSON.parse(W.localStorage.getItem(KUNCI_PROMO) || '{}') || {}; } catch (e) { a = {}; }
    var x = Array.isArray(a[b]) ? a[b] : [], i = x.indexOf(k); if (i > -1) x.splice(i, 1); else x.push(k); a[b] = x;
    try { W.localStorage.setItem(KUNCI_PROMO, JSON.stringify(a)); } catch (e) {}
  }

  /* ================= penulis XLSX kecil ================= */
  function xe(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function kol(n) { var s = ''; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function Gaya() { this.daftar = ['0|0|0|0|0']; this.peta = { '0|0|0|0|0': 0 }; }
  /* kunci gaya: huruf|isi|garis|format|bungkus */
  Gaya.prototype.id = function (f, i, g, n, w) { var k = [f || 0, i || 0, g || 0, n || 0, w ? 1 : 0].join('|'); if (this.peta[k] == null) { this.peta[k] = this.daftar.length; this.daftar.push(k); } return this.peta[k]; };
  var HURUF = ['<font><sz val="10"/><color rgb="FF000000"/><name val="Arial"/></font>', '<font><b/><sz val="10"/><color rgb="FF000000"/><name val="Arial"/></font>', '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>',
    '<font><sz val="10"/><color rgb="FF0000FF"/><name val="Arial"/></font>', '<font><sz val="10"/><color rgb="FF008000"/><name val="Arial"/></font>', '<font><b/><sz val="13"/><color rgb="FF000000"/><name val="Arial"/></font>', '<font><i/><sz val="10"/><color rgb="FF595959"/><name val="Arial"/></font>'];
  var F = { biasa: 0, tebal: 1, putih: 2, biru: 3, hijau: 4, judul: 5, catatan: 6 };
  var ISI = { kosong: 0, kepala: 2, promo: 3, input: 4, total: 5, ulang: 6 };
  var WARNA_ISI = [null, null, 'FF1F3A5F', 'FFFCE4D6', 'FFFFF2CC', 'FFF2F2F2', 'FFDDEBF7'];
  var FMT = { rp: 164, pct: 165, bulat: 1 };
  function gayaXml(G) {
    var isi = '<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' + WARNA_ISI.slice(2).map(function (w) { return '<fill><patternFill patternType="solid"><fgColor rgb="' + w + '"/><bgColor indexed="64"/></patternFill></fill>'; }).join('') + '</fills>';
    var xf = G.daftar.map(function (k) {
      var p = k.split('|').map(Number);
      return '<xf numFmtId="' + p[3] + '" fontId="' + p[0] + '" fillId="' + p[1] + '" borderId="' + p[2] + '" xfId="0"' + (p[3] ? ' applyNumberFormat="1"' : '') + ' applyFont="1"' + (p[1] ? ' applyFill="1"' : '') + (p[2] ? ' applyBorder="1"' : '') + (p[4] ? ' applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>' : '/>');
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0;(#,##0);&quot;-&quot;"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>' +
      '<fonts count="' + HURUF.length + '">' + HURUF.join('') + '</fonts>' + isi +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + G.daftar.length + '">' + xf + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }
  function Lembar(nama) { this.nama = nama; this.sel = {}; this.lebar = []; this.tinggi = {}; this.beku = null; this.saring = null; }
  /* v: angka, teks, atau {f: 'rumus'}; s: id gaya */
  Lembar.prototype.isi = function (r, c, v, s) { this.sel[r + ':' + c] = { v: v, s: s || 0 }; };
  Lembar.prototype.xml = function () {
    var baris = {}, maks = 0;
    for (var k in this.sel) { var p = k.split(':'), r = +p[0]; (baris[r] = baris[r] || []).push(+p[1]); if (r > maks) maks = r; }
    var self = this, rows = Object.keys(baris).map(Number).sort(function (a, b) { return a - b; }).map(function (r) {
      var cs = baris[r].sort(function (a, b) { return a - b; }).map(function (c) {
        var x = self.sel[r + ':' + c], ref = kol(c - 1) + r, v = x.v;
        if (v && typeof v === 'object' && v.f) return '<c r="' + ref + '" s="' + x.s + '"><f>' + xe(v.f) + '</f></c>';
        if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '" s="' + x.s + '"><v>' + v + '</v></c>';
        if (v == null || v === '') return '<c r="' + ref + '" s="' + x.s + '"/>';
        return '<c r="' + ref + '" s="' + x.s + '" t="inlineStr"><is><t xml:space="preserve">' + xe(v) + '</t></is></c>';
      }).join('');
      return '<row r="' + r + '"' + (self.tinggi[r] ? ' ht="' + self.tinggi[r] + '" customHeight="1"' : '') + '>' + cs + '</row>';
    }).join('');
    var pane = this.beku ? '<sheetViews><sheetView workbookViewId="0"><pane' + (this.beku.c > 1 ? ' xSplit="' + (this.beku.c - 1) + '"' : '') + (this.beku.r > 1 ? ' ySplit="' + (this.beku.r - 1) + '"' : '') + ' topLeftCell="' + kol(this.beku.c - 1) + this.beku.r + '" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>' : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    var cols = this.lebar.length ? '<cols>' + this.lebar.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>' : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      pane + '<sheetFormatPr defaultRowHeight="15"/>' + cols + '<sheetData>' + rows + '</sheetData>' + (this.saring ? '<autoFilter ref="' + this.saring + '"/>' : '') + '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/></worksheet>';
  };
  function rakitXlsx(lembar, G) {
    var z = new W.JSZip();
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      lembar.map(function (l, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
    z.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>HPP mitra</dc:title><dc:creator>One Logistics Solutions</dc:creator></cp:coreProperties>');
    z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      lembar.map(function (l, i) { return '<sheet name="' + xe(l.nama) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
    z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      lembar.map(function (l, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (lembar.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    lembar.forEach(function (l, i) { z.file('xl/worksheets/sheet' + (i + 1) + '.xml', l.xml()); });
    z.file('xl/styles.xml', gayaXml(G));
    return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* Excel dengan susunan yang sama dengan berkas HPP Agustus dan September. */
  function susunXlsx(H) {
    var G = new Gaya(), o = H.opsi, nb = namaBulan(H.bulan, true);
    var s = { judul: G.id(F.judul), catatan: G.id(F.catatan), kepala: G.id(F.putih, ISI.kepala, 1, 0, true), teks: G.id(F.biasa, 0, 1), biruRp: G.id(F.biru, 0, 1, FMT.rp), biruAngka: G.id(F.biru, 0, 1, FMT.bulat),
      rp: G.id(F.biasa, 0, 1, FMT.rp), hijauRp: G.id(F.hijau, 0, 1, FMT.rp), hijauPct: G.id(F.hijau, 0, 1, FMT.pct), inputPct: G.id(F.biru, ISI.input, 1, FMT.pct), inputRp: G.id(F.biru, ISI.input, 1, FMT.rp),
      totTeks: G.id(F.tebal, ISI.total, 1), totRp: G.id(F.tebal, ISI.total, 1, FMT.rp), totAngka: G.id(F.tebal, ISI.total, 1, FMT.bulat), tebal: G.id(F.tebal), pct: G.id(F.biasa, 0, 1, FMT.pct), angka: G.id(F.biasa, 0, 1, FMT.bulat), hijauAngka: G.id(F.hijau, 0, 1, FMT.bulat) };
    var isiG = function (base, isi) { var p = G.daftar[base].split('|').map(Number); return G.id(p[0], isi, p[2], p[3], p[4]); };

    /* ---- Asumsi ---- */
    var A = new Lembar('Asumsi');
    A.isi(1, 1, 'Asumsi dan parameter', s.judul);
    A.isi(2, 1, 'Sel kuning berhuruf biru = input. Ubah di sini, seluruh perhitungan ikut berubah.', s.catatan);
    var as = [['PPN', o.ppn, 'Tarif PPN pada harga rak dan tagihan'], ['Komisi TGI aktual', o.kTGI, 'Komisi yang dipotong Toys Kingdom (MCR TGI)'],
      ['Dasar penyusunan harga rak TGI (bukan komisi)', o.dasarTGI, 'Hanya untuk membentuk harga rak TGI di Master Produk (boneka S Rp310.800). Komisi yang dipotong tetap baris di atas.'],
      ['Komisi Kinokuniya', o.kKIY, 'Tier T2, konsinyasi 35% PKP'], ['Margin MAA', o.mMAA, 'Tier T4; harga rak MAA mengikuti COC'], ['Diskon flash sale MAA', o.flash, 'Dipakai di baris yang ditandai promo']];
    as.forEach(function (x, i) { A.isi(4 + i, 1, x[0], s.teks); A.isi(4 + i, 2, x[1], s.inputPct); A.isi(4 + i, 3, x[2], s.catatan); });
    A.lebar = [42, 10, 95];
    var PPN = 'Asumsi!$B$4', KTGI = 'Asumsi!$B$5', DTGI = 'Asumsi!$B$6', KKIY = 'Asumsi!$B$7', MMAA = 'Asumsi!$B$8', FLASH = 'Asumsi!$B$9';

    /* ---- Rincian ---- */
    var D = new Lembar('Rincian gerai x SKU'), R = H.rinci;
    D.isi(1, 1, 'Penjualan konsinyasi ' + nb + ' per gerai dan SKU', s.judul);
    D.isi(2, 1, 'Oranye = SKU promo. Biru muda = SKU yang laku lebih dari 1 pcs bulan ini (gabungan semua gerai).', s.catatan);
    ['Mitra', 'Gerai', 'SKU', 'Kategori', 'Qty (pcs)', 'HPP/pcs = wholesale (Rp)', 'HPP total (Rp)', 'Harga rak normal incl PPN (Rp)', 'Diskon promo', 'Harga rak terjual incl PPN (Rp)', 'Komisi / margin mitra', 'Tagihan/pcs sebelum PPN (Rp)', 'Tagihan sebelum PPN (Rp)', 'Tagihan incl PPN (Rp)', 'Selisih tagihan vs HPP (Rp)', 'Promo', 'Laku berulang', 'Sisa di rak (pcs)', 'Sumber harga']
      .forEach(function (h, j) { D.isi(4, j + 1, h, s.kepala); });
    D.tinggi[4] = 44;
    var awal = 5, akhir = Math.max(awal, awal + R.length - 1), qtySku = {};
    R.forEach(function (x) { qtySku[x.sku] = (qtySku[x.sku] || 0) + x.qty; });
    R.forEach(function (x, i) {
      var n = awal + i, isi = x.promo ? ISI.promo : qtySku[x.sku] > 1 ? ISI.ulang : 0, g = function (b) { return isi ? isiG(b, isi) : b; };
      D.isi(n, 1, NAMA_PT[x.r], g(s.teks)); D.isi(n, 2, x.gerai, g(s.teks)); D.isi(n, 3, x.sku, g(s.teks)); D.isi(n, 4, x.kat, g(s.teks));
      D.isi(n, 5, x.qty, g(s.biruAngka)); D.isi(n, 6, x.hppPcs, g(s.biruRp)); D.isi(n, 7, { f: 'E' + n + '*F' + n }, g(s.rp));
      if (x.r === 'MAA') D.isi(n, 8, { f: 'F' + n + '/(1-' + MMAA + ')*(1+' + PPN + ')' }, g(s.biruRp));
      else D.isi(n, 8, { f: 'F' + n + '/(1-' + (x.r === 'TGI' ? DTGI : KKIY) + ')*(1+' + PPN + ')' }, g(s.hijauRp));
      D.isi(n, 9, x.promo ? { f: FLASH } : 0, g(x.promo ? s.hijauPct : s.inputPct));
      D.isi(n, 10, { f: 'H' + n + '*(1-I' + n + ')' }, g(s.rp));
      D.isi(n, 11, { f: x.r === 'TGI' ? KTGI : x.r === 'KIY' ? KKIY : MMAA }, g(s.hijauPct));
      D.isi(n, 12, { f: 'J' + n + '/(1+' + PPN + ')*(1-K' + n + ')' }, g(s.rp));
      D.isi(n, 13, { f: 'L' + n + '*E' + n }, g(s.rp)); D.isi(n, 14, { f: 'M' + n + '*(1+' + PPN + ')' }, g(s.rp)); D.isi(n, 15, { f: 'M' + n + '-G' + n }, g(s.rp));
      D.isi(n, 16, { f: 'IF(I' + n + '>0,"Ya","")' }, g(s.teks));
      D.isi(n, 17, { f: 'IF(SUMIF($C$' + awal + ':$C$' + akhir + ',C' + n + ',$E$' + awal + ':$E$' + akhir + ')>1,"Ya","")' }, g(s.teks));
      D.isi(n, 18, x.sisa, g(s.biruAngka)); D.isi(n, 19, x.sumber, g(s.catatan));
    });
    var t = akhir + 1;
    D.isi(t, 1, 'Total', s.totTeks);
    for (var j = 2; j <= 19; j++) D.isi(t, j, '', s.totTeks);
    [[5, 'E', s.totAngka], [7, 'G', s.totRp], [13, 'M', s.totRp], [14, 'N', s.totRp], [15, 'O', s.totRp]].forEach(function (x) { D.isi(t, x[0], R.length ? { f: 'SUM(' + x[1] + awal + ':' + x[1] + akhir + ')' } : 0, x[2]); });
    D.isi(t + 2, 1, 'HPP = harga wholesale per SKU di Master Produk, sebelum PPN. Belum termasuk freight, bea masuk, dan biaya gudang.', s.catatan);
    D.isi(t + 3, 1, 'Harga rak MAA adalah perkiraan dari margin 45%; ketik harga COC di kolom H (huruf biru) kalau berbeda.', s.catatan);
    D.lebar = [24, 26, 52, 14, 9, 13, 14, 16, 10, 16, 12, 15, 15, 15, 15, 8, 10, 10, 40];
    D.beku = { r: 5, c: 4 }; if (R.length) D.saring = 'A4:S' + akhir;

    /* ---- Per SKU ---- */
    var S = new Lembar('Per SKU'), rd = "'Rincian gerai x SKU'!";
    S.isi(1, 1, 'Rekap per SKU, ' + nb + ' (urut qty terbanyak)', s.judul);
    ['SKU', 'Kategori', 'Qty (pcs)', 'Jumlah gerai', 'Gerai', 'HPP total (Rp)', 'Tagihan sebelum PPN (Rp)', 'Selisih vs HPP (Rp)', 'Promo', 'Laku berulang'].forEach(function (h, j) { S.isi(3, j + 1, h, s.kepala); });
    S.tinggi[3] = 32;
    var sk = {}; R.forEach(function (x) { var d = sk[x.sku] = sk[x.sku] || { kat: x.kat, q: 0, g: [], p: false }; d.q += x.qty; d.g.push(x.gerai); d.p = d.p || !!x.promo; });
    var urut = Object.keys(sk).sort(function (a, b) { return sk[b].q - sk[a].q || (a < b ? -1 : 1); });
    var rng = function (c2) { return rd + '$' + c2 + '$' + awal + ':$' + c2 + '$' + akhir; };
    urut.forEach(function (nm, i) {
      var n = 4 + i, d = sk[nm], isi = d.p ? ISI.promo : d.q > 1 ? ISI.ulang : 0, g = function (b) { return isi ? isiG(b, isi) : b; };
      S.isi(n, 1, nm, g(s.teks)); S.isi(n, 2, d.kat, g(s.teks));
      S.isi(n, 3, { f: 'SUMIF(' + rng('C') + ',A' + n + ',' + rng('E') + ')' }, g(s.hijauAngka));
      S.isi(n, 4, { f: 'COUNTIF(' + rng('C') + ',A' + n + ')' }, g(s.hijauAngka));
      S.isi(n, 5, d.g.join(', '), g(s.teks));
      S.isi(n, 6, { f: 'SUMIF(' + rng('C') + ',A' + n + ',' + rng('G') + ')' }, g(s.hijauRp));
      S.isi(n, 7, { f: 'SUMIF(' + rng('C') + ',A' + n + ',' + rng('M') + ')' }, g(s.hijauRp));
      S.isi(n, 8, { f: 'G' + n + '-F' + n }, g(s.rp));
      S.isi(n, 9, { f: 'IF(COUNTIFS(' + rng('C') + ',A' + n + ',' + rng('P') + ',"Ya")>0,"Ya","")' }, g(s.teks));
      S.isi(n, 10, { f: 'IF(C' + n + '>1,"Ya","")' }, g(s.teks));
    });
    var st = 4 + urut.length;
    S.isi(st, 1, 'Total', s.totTeks); for (var j2 = 2; j2 <= 10; j2++) S.isi(st, j2, '', s.totTeks);
    [[3, 'C', s.totAngka], [6, 'F', s.totRp], [7, 'G', s.totRp], [8, 'H', s.totRp]].forEach(function (x) { S.isi(st, x[0], urut.length ? { f: 'SUM(' + x[1] + '4:' + x[1] + (st - 1) + ')' } : 0, x[2]); });
    S.lebar = [56, 14, 9, 10, 52, 14, 16, 14, 8, 10]; S.beku = { r: 4, c: 2 };

    /* ---- Ringkasan ---- */
    var Rg = new Lembar('Ringkasan');
    Rg.isi(1, 1, 'HPP penjualan konsinyasi ' + nb + ' per mitra', s.judul);
    Rg.isi(2, 1, 'Untuk: Pak Win · Disusun ' + (H.hariIni ? (+H.hariIni.slice(8, 10)) + ' ' + BULAN_ID[+H.hariIni.slice(5, 7) - 1] + ' ' + H.hariIni.slice(0, 4) : '') + ' dari WMS (buku besar sampai ' + (+akhirBulan(H.bulan).slice(8, 10)) + ' ' + BULAN_ID[+H.bulan.slice(5, 7) - 1] + ')', s.catatan);
    ['Mitra', 'Komisi / margin', 'Pcs', 'HPP (Rp)', 'Tagihan sebelum PPN (Rp)', 'Tagihan incl PPN (Rp)', 'Selisih tagihan vs HPP (Rp)', 'Invoice mitra sebelum PPN, dari WMS (Rp)', 'Selisih invoice vs tagihan (Rp)', 'Angka dari Pak Win incl PPN (Rp)', 'Selisih vs angka Pak Win (Rp)', 'Status']
      .forEach(function (h, j) { Rg.isi(4, j + 1, h, s.kepala); });
    Rg.tinggi[4] = 44;
    var ra = function (c2) { return rd + '$' + c2 + '$' + awal + ':$' + c2 + '$' + akhir; };
    var ket = { TGI: 'Komisi 35%; harga rak disusun 37,5%', KIY: 'Komisi 35%; harga rak disusun 35%', MAA: 'Margin 45%; harga rak dari COC' };
    H.mitra.forEach(function (m, i) {
      var n = 5 + i;
      Rg.isi(n, 1, m.nama, s.teks); Rg.isi(n, 2, ket[m.r], s.teks);
      Rg.isi(n, 3, R.length ? { f: 'SUMIF(' + ra('A') + ',A' + n + ',' + ra('E') + ')' } : 0, s.hijauAngka);
      Rg.isi(n, 4, R.length ? { f: 'SUMIF(' + ra('A') + ',A' + n + ',' + ra('G') + ')' } : 0, s.hijauRp);
      Rg.isi(n, 5, R.length ? { f: 'SUMIF(' + ra('A') + ',A' + n + ',' + ra('M') + ')' } : 0, s.hijauRp);
      Rg.isi(n, 6, R.length ? { f: 'SUMIF(' + ra('A') + ',A' + n + ',' + ra('N') + ')' } : 0, s.hijauRp);
      Rg.isi(n, 7, { f: 'E' + n + '-D' + n }, s.rp);
      Rg.isi(n, 8, m.invoice == null ? '' : m.invoice, s.inputRp);
      Rg.isi(n, 9, { f: 'IF(H' + n + '="","",H' + n + '-E' + n + ')' }, s.rp);
      Rg.isi(n, 10, '', s.inputRp);
      Rg.isi(n, 11, { f: 'IF(J' + n + '="","",J' + n + '-F' + n + ')' }, s.rp);
      Rg.isi(n, 12, { f: 'IF(H' + n + '="","Belum ada invoice",IF(ABS(I' + n + ')<=MAX(1000,E' + n + '*0.01),"Cocok","Selisih"))' }, s.teks);
    });
    var tr = 5 + H.mitra.length, tAkhir = tr - 1;
    Rg.isi(tr, 1, 'Total', s.totTeks); Rg.isi(tr, 2, '', s.totTeks); Rg.isi(tr, 12, '', s.totTeks);
    [[3, 'C', s.totAngka], [4, 'D', s.totRp], [5, 'E', s.totRp], [6, 'F', s.totRp], [7, 'G', s.totRp], [8, 'H', s.totRp], [9, 'I', s.totRp], [10, 'J', s.totRp], [11, 'K', s.totRp]]
      .forEach(function (x) { Rg.isi(tr, x[0], H.mitra.length ? { f: 'SUM(' + x[1] + '5:' + x[1] + tAkhir + ')' } : 0, x[2]); });
    var cat = ['Cara baca',
      'HPP = harga wholesale per SKU di Master Produk, sebelum PPN, sama untuk semua mitra.',
      'Yang berbeda antar mitra adalah tagihannya: harga rak dibuka PPN-nya lalu dikurangi komisi atau margin mitra. Persentase ada di tab Asumsi.',
      'Promo ditandai per baris di WMS (Kontrol, HPP mitra) dan mengurangi harga rak sebesar diskon flash sale.',
      'Invoice mitra di WMS dicatat sebelum PPN, jadi dibandingkan dengan tagihan sebelum PPN. Kolom angka dari Pak Win diisi tangan.',
      'Rincian per baris di tab Rincian gerai x SKU; rekap per SKU di tab Per SKU.'];
    cat.forEach(function (x, i) { Rg.isi(tr + 2 + i, 1, x, i ? s.catatan : s.tebal); });
    Rg.lebar = [26, 32, 7, 13, 16, 15, 16, 18, 16, 17, 16, 18];
    return { lembar: [Rg, A, D, S], G: G };
  }
  function muatZip() {
    if (W.JSZip) return Promise.resolve();
    return new Promise(function (ok, gagal) { var s = W.document.createElement('script'); s.src = 'vendor/pptxgen.bundle.js'; s.async = true; s.onload = function () { W.JSZip ? ok() : gagal(new Error('pustaka')); }; s.onerror = function () { gagal(new Error('pustaka')); }; W.document.head.appendChild(s); });
  }
  function muatPdf() {
    if (W.jspdf && W.jspdf.jsPDF) return Promise.resolve(W.jspdf.jsPDF);
    return new Promise(function (ok, gagal) { var s = W.document.createElement('script'); s.src = 'vendor/jspdf.umd.min.js'; s.async = true; s.onload = function () { W.jspdf && W.jspdf.jsPDF ? ok(W.jspdf.jsPDF) : gagal(new Error('pustaka')); }; s.onerror = function () { gagal(new Error('pustaka')); }; W.document.head.appendChild(s); });
  }
  /* dp + bulan -> Blob .xlsx. Promo diambil dari perangkat kalau tidak diberi. */
  function xlsx(dp, bulan, promo) {
    var H = hitung(dp, { bulan: bulan, promo: promo || bacaPromo(bulan) });
    return muatZip().then(function () { var x = susunXlsx(H); return rakitXlsx(x.lembar, x.G); });
  }
  function pdf(dp, bulan, promo) {
    var H = hitung(dp, { bulan: bulan, promo: promo || bacaPromo(bulan) });
    return muatPdf().then(function (JsPDF) {
      var d = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }), x = 14, y = 18;
      d.setFont('helvetica', 'bold'); d.setFontSize(15); d.text('HPP penjualan konsinyasi ' + namaBulan(H.bulan, true), x, y);
      d.setFont('helvetica', 'normal'); d.setFontSize(9); d.setTextColor(110); d.text('Untuk Pak Win. Disusun dari WMS Mofmofriends (buku besar sampai ' + (+akhirBulan(H.bulan).slice(8, 10)) + ' ' + BULAN_ID[+H.bulan.slice(5, 7) - 1] + ' ' + H.bulan.slice(0, 4) + '). HPP = wholesale sebelum PPN.', x, y + 6);
      var kol2 = [['Mitra', 52], ['Komisi', 18], ['Pcs', 14], ['HPP', 32], ['Tagihan sblm PPN', 34], ['Tagihan incl PPN', 34], ['Selisih vs HPP', 30], ['Invoice sblm PPN', 32], ['Status', 24]];
      y += 16; d.setFillColor(31, 58, 95); d.rect(x, y - 5, 270, 8, 'F'); d.setTextColor(255); d.setFont('helvetica', 'bold');
      var cx = x; kol2.forEach(function (k, i) { d.text(k[0], i > 1 && i < 8 ? cx + k[1] - 2 : cx + 2, y, { align: i > 1 && i < 8 ? 'right' : 'left' }); cx += k[1]; });
      d.setFont('helvetica', 'normal'); d.setTextColor(40);
      var baris = H.mitra.map(function (m) { return [m.nama, pc(m.komisi), String(m.pcs), rpId(m.hpp), rpId(m.tagih), rpId(m.tagihPpn), rpId(m.selisih), m.invoice == null ? '-' : rpId(m.invoice), m.status === 'cocok' ? 'Cocok' : m.status === 'selisih' ? 'Selisih' : 'Belum ada invoice']; });
      baris.push(['Total', '', String(H.total.pcs), rpId(H.total.hpp), rpId(H.total.tagih), rpId(H.total.tagihPpn), rpId(H.total.selisih), '', '']);
      baris.forEach(function (r, bi) {
        y += 8; if (bi === baris.length - 1) { d.setFillColor(242, 242, 242); d.rect(x, y - 5, 270, 8, 'F'); d.setFont('helvetica', 'bold'); }
        var c2 = x; r.forEach(function (v, i) { d.text(String(v), i > 1 && i < 8 ? c2 + kol2[i][1] - 2 : c2 + 2, y, { align: i > 1 && i < 8 ? 'right' : 'left' }); c2 += kol2[i][1]; });
        d.setDrawColor(200); d.line(x, y + 3, x + 270, y + 3);
      });
      d.setFont('helvetica', 'normal'); d.setFontSize(8.5); d.setTextColor(110); y += 14;
      ['Tagihan/pcs = harga rak x (1 - promo) / ' + (1 + H.opsi.ppn).toFixed(2) + ' x (1 - komisi). Harga rak TGI disusun ' + pc(H.opsi.dasarTGI) + ', Kinokuniya ' + pc(H.opsi.kKIY) + ', MAA perkiraan dari margin ' + pc(H.opsi.mMAA) + '.',
        'Promo flash sale ' + pc(H.opsi.flash) + ' dipakai di ' + H.rinci.filter(function (r) { return r.promo; }).length + ' baris. Rincian gerai x SKU ada di Excel HPP.'].forEach(function (s2) { d.text(s2, x, y); y += 5; });
      return d.output('blob');
    });
  }

  /* ================= tab di Kontrol ================= */
  var TS = {
    id: { judul: 'HPP penjualan konsinyasi per mitra per bulan untuk Pak Win, susunannya sama dengan Excel HPP Agustus dan September.', bulan: 'Bulan', dasar: 'HPP = wholesale sebelum PPN (harga transfer principal)',
      u1: 'Terjual konsinyasi', u2: 'HPP (wholesale sebelum PPN)', u3: 'Tagihan sebelum PPN', u4: 'Selisih tagihan vs HPP', mitraGerai: function (a, b) { return a + ' mitra · ' + b + ' gerai'; }, transfer: 'harga transfer principal', inclPpn: 'termasuk PPN',
      ringkas: 'Ringkasan per mitra', rinci: 'Rincian gerai x SKU', kol: ['Mitra / gerai', 'Komisi / margin', 'Pcs', 'HPP', 'Tagihan sebelum PPN', 'Tagihan incl PPN', 'Selisih vs HPP', 'Invoice sebelum PPN', 'Selisih vs invoice', 'Status'],
      kol2: ['Gerai', 'SKU', 'Qty', 'HPP/pcs', 'Harga rak incl PPN', 'Promo', 'Komisi', 'Tagihan/pcs', 'Tagihan', 'Selisih vs HPP'], st: { cocok: 'Cocok', selisih: 'Selisih', tanpa: 'Belum ada invoice', kosong: '-' },
      promoKet: 'Ketuk tombol Promo di baris yang ikut flash sale. Tandanya tersimpan di perangkat ini dan ikut ke Excel.', catatan: 'Tagihan/pcs = harga rak terjual / 1,11 x (1 - komisi mitra). Harga rak TGI disusun 37,5%, Kinokuniya 35%, MAA perkiraan dari margin 45% (ganti dengan COC di Excel). Gamotion dan penjualan langsung di luar tabel. Excel berisi tab Ringkasan, Asumsi (PPN, komisi, promo di sel kuning), Rincian gerai x SKU, dan Per SKU, semuanya rumus. Kolom angka dari Pak Win disediakan kosong.',
      xlsx: 'Unduh Excel HPP', pdf: 'PDF ringkasan', kosong: 'Belum ada penjualan konsinyasi di buku besar.', menyiapkan: 'Menyusun berkas…', gagal: 'Berkas belum bisa dibuat. Coba lagi.', total: 'Total' },
    en: { judul: 'Consignment COGS per partner per month for Pak Win, laid out like the August and September COGS workbooks.', bulan: 'Month', dasar: 'COGS = wholesale before VAT (principal transfer price)',
      u1: 'Consignment sold', u2: 'COGS (wholesale before VAT)', u3: 'Billing before VAT', u4: 'Billing minus COGS', mitraGerai: function (a, b) { return a + ' partners · ' + b + ' stores'; }, transfer: 'principal transfer price', inclPpn: 'incl. VAT',
      ringkas: 'Summary by partner', rinci: 'Store x SKU detail', kol: ['Partner / store', 'Commission / margin', 'Pcs', 'COGS', 'Billing before VAT', 'Billing incl VAT', 'Billing minus COGS', 'Invoice before VAT', 'Invoice difference', 'Status'],
      kol2: ['Store', 'SKU', 'Qty', 'COGS/pcs', 'Shelf price incl VAT', 'Promo', 'Commission', 'Billing/pcs', 'Billing', 'Minus COGS'], st: { cocok: 'Matches', selisih: 'Differs', tanpa: 'No invoice yet', kosong: '-' },
      promoKet: 'Tap Promo on rows sold in the flash sale. The marks stay on this device and go into the Excel file.', catatan: 'Billing/pcs = shelf price sold / 1.11 x (1 - partner commission). TGI shelf price built at 37.5%, Kinokuniya 35%, MAA estimated from the 45% margin (replace with the COC price in Excel). Gamotion and direct sales are left out.',
      xlsx: 'Download COGS Excel', pdf: 'Summary PDF', kosong: 'No consignment sales in the ledger yet.', menyiapkan: 'Building the file…', gagal: 'The file could not be made. Try again.', total: 'Total' }
  };
  function T(k) { var d = TS[id() ? 'id' : 'en']; return d[k] != null ? d[k] : TS.en[k]; }
  var S = { dp: null, bulan: '', buka: {}, sibuk: false, pasang: false };
  function gambar(w, dp) {
    S.dp = dp; pasangKejadian();
    var H0 = hitung(dp, { bulan: S.bulan || null, promo: [] });
    if (!H0.pilihanBulan.length) { w.innerHTML = '<p class="ket-alat">' + esc(T('kosong')) + '</p>'; return; }
    if (!S.bulan || H0.pilihanBulan.indexOf(S.bulan) < 0) S.bulan = H0.pilihanBulan.indexOf(H0.bulan) > -1 ? H0.bulan : H0.pilihanBulan[0];
    var H = hitung(dp, { bulan: S.bulan, promo: bacaPromo(S.bulan) });
    var opsi = H.pilihanBulan.map(function (b) { return '<option value="' + b + '"' + (b === H.bulan ? ' selected' : '') + '>' + esc(namaBulan(b)) + '</option>'; }).join('');
    var ubin = '<div class="hpp-ubin">' + [[T('u1'), H.total.pcs + ' pcs', T('mitraGerai')(H.mitra.filter(function (m) { return m.pcs; }).length, H.nGerai), ''], [T('u2'), rp(H.total.hpp), T('transfer'), 'aksen'], [T('u3'), rp(H.total.tagih), rp(H.total.tagihPpn) + ' ' + T('inclPpn'), ''], [T('u4'), rp(H.total.selisih), '', '']]
      .map(function (u) { return '<div class="kn-kpi ' + u[3] + '"><span>' + esc(u[0]) + '</span><b>' + esc(u[1]) + '</b>' + (u[2] ? '<small>' + esc(u[2]) + '</small>' : '') + '</div>'; }).join('') + '</div>';
    var kol = T('kol'), baris = '';
    H.mitra.forEach(function (m) {
      var on = !!S.buka[m.r];
      baris += '<tr class="hpp-mitra"><td><button type="button" class="hpp-panah" data-hpp-buka="' + m.r + '" aria-expanded="' + on + '">' + (on ? '▾' : '▸') + '</button> <b>' + esc(m.nama) + '</b></td><td>' + pc(m.komisi) + '</td><td class="num">' + m.pcs + '</td><td class="num">' + esc(rp(m.hpp)) + '</td><td class="num">' + esc(rp(m.tagih)) + '</td><td class="num">' + esc(rp(m.tagihPpn)) + '</td>' +
        '<td class="num' + (m.selisih < -0.5 ? ' merah' : '') + '">' + esc(rp(m.selisih)) + '</td><td class="num">' + (m.invoice == null ? '-' : esc(rp(m.invoice))) + '</td><td class="num">' + (m.selInv == null ? '-' : esc(rp(m.selInv))) + '</td><td><span class="kn-chip ' + (m.status === 'cocok' ? 'ok' : m.status === 'selisih' ? 'awas' : '') + '">' + esc(T('st')[m.status]) + '</span></td></tr>';
      if (on) m.gerai.forEach(function (g) { baris += '<tr class="hpp-gerai"><td>' + esc(g.nama) + '</td><td></td><td class="num">' + g.pcs + '</td><td class="num">' + esc(rp(g.hpp)) + '</td><td class="num">' + esc(rp(g.tagih)) + '</td><td class="num">' + esc(rp(g.tagih * (1 + H.opsi.ppn))) + '</td><td class="num">' + esc(rp(g.tagih - g.hpp)) + '</td><td></td><td></td><td></td></tr>'; });
    });
    baris += '<tr class="hpp-total"><td>' + esc(T('total')) + '</td><td></td><td class="num">' + H.total.pcs + '</td><td class="num">' + esc(rp(H.total.hpp)) + '</td><td class="num">' + esc(rp(H.total.tagih)) + '</td><td class="num">' + esc(rp(H.total.tagihPpn)) + '</td><td class="num">' + esc(rp(H.total.selisih)) + '</td><td></td><td></td><td></td></tr>';
    var k2 = T('kol2'), rinci = H.rinci.map(function (r) {
      var key = r.k + '|' + r.pi;
      return '<tr class="' + (r.promo ? 'hpp-promo' : '') + '"><td>' + esc(r.gerai) + '</td><td>' + esc(String(r.sku).replace(/\bmofmo ?friends\s+/i, '')) + '</td><td class="num">' + r.qty + '</td><td class="num">' + esc(rp(r.hppPcs)) + '</td><td class="num">' + esc(rp(r.rak)) + '</td>' +
        '<td><button type="button" class="chip-alat hpp-promo-btn' + (r.promo ? ' on' : '') + '" data-hpp-promo="' + esc(key) + '" aria-pressed="' + !!r.promo + '">' + (r.promo ? pc(r.promo) : 'Promo') + '</button></td><td class="num">' + pc(r.komisi) + '</td><td class="num">' + esc(rp(r.tagihPcs)) + '</td><td class="num">' + esc(rp(r.tagih)) + '</td><td class="num' + (r.selisih < -0.5 ? ' merah' : '') + '">' + esc(rp(r.selisih)) + '</td></tr>';
    }).join('');
    w.innerHTML = '<p class="ket-alat">' + esc(T('judul')) + '</p><div class="hpp-atur"><label class="lp-isian" for="hppBulan"><span>' + esc(T('bulan')) + '</span><select id="hppBulan">' + opsi + '</select></label><span class="kn-chip">' + esc(T('dasar')) + '</span></div>' + ubin +
      '<h3 class="kn-bulan">' + esc(T('ringkas')) + '</h3><div class="hpp-gulung"><table class="hpp-tabel hpp-ringkas"><thead><tr>' + kol.map(function (h, i) { return '<th' + (i > 1 && i < 9 ? ' class="num"' : '') + '>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + baris + '</tbody></table></div>' +
      '<h3 class="kn-bulan">' + esc(T('rinci')) + '</h3><p class="ket-alat">' + esc(T('promoKet')) + '</p><div class="hpp-gulung"><table class="hpp-tabel hpp-rinci"><thead><tr>' + k2.map(function (h, i) { return '<th' + ([2, 3, 4, 6, 7, 8, 9].indexOf(i) > -1 ? ' class="num"' : '') + '>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rinci + '</tbody></table></div>' +
      '<p class="ket-alat">' + esc(T('catatan')) + '</p><div class="hpp-kaki"><span class="lp-status" id="hppStatus" role="status" aria-live="polite"></span><button type="button" class="btn dua" data-hpp="pdf">' + esc(T('pdf')) + '</button><button type="button" class="btn" data-hpp="xlsx">' + esc(T('xlsx')) + '</button></div>';
  }
  function ulang() { var w = el('kontrolIsi'); if (w && S.dp) gambar(w, S.dp); }
  function unduhBlob(blob, nama) {
    var u = URL.createObjectURL(blob), a = W.document.createElement('a');
    a.href = u; a.download = nama; a.style.display = 'none'; W.document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
  }
  function berkas(jenis, tombol) {
    if (S.sibuk || !S.dp) return; S.sibuk = true; bunyi('klik');
    var st = el('hppStatus'); if (st) st.textContent = T('menyiapkan'); if (tombol) tombol.disabled = true;
    var jadi = jenis === 'pdf' ? pdf(S.dp, S.bulan) : xlsx(S.dp, S.bulan);
    jadi.then(function (b) { unduhBlob(b, 'hpp-mitra-' + S.bulan + (jenis === 'pdf' ? '-ringkasan.pdf' : '.xlsx')); return ''; }, function () { return T('gagal'); })
      .then(function (pesan) { S.sibuk = false; if (tombol) tombol.disabled = false; var s2 = el('hppStatus'); if (s2) s2.textContent = pesan; });
  }
  function pasangKejadian() {
    if (S.pasang || !W.document) return; S.pasang = true;
    W.document.addEventListener('click', function (e) {
      var x = e.target && e.target.closest ? e.target.closest('#kontrol [data-hpp],#kontrol [data-hpp-promo],#kontrol [data-hpp-buka]') : null;
      if (!x) return;
      if (x.hasAttribute('data-hpp-promo')) { bunyi('klik'); gantiPromo(S.bulan, x.getAttribute('data-hpp-promo')); ulang(); return; }
      if (x.hasAttribute('data-hpp-buka')) { bunyi('klik'); var r = x.getAttribute('data-hpp-buka'); S.buka[r] = !S.buka[r]; ulang(); return; }
      berkas(x.getAttribute('data-hpp'), x);
    });
    W.document.addEventListener('change', function (e) { if (e.target && e.target.id === 'hppBulan') { S.bulan = e.target.value; ulang(); } });
  }

  W.WmsHpp = { hitung: hitung, xlsx: xlsx, pdf: pdf, gambar: gambar, _bacaPromo: bacaPromo };
})();
