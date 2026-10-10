/* Kulit L4 untuk papan lama (10 Okt 2026).
 *
 * Ferdy: "datanya ko ga mirip, fiturnya blm semua jga". WMS baru sebelumnya
 * menghitung angkanya sendiri dari baris buku besar, jadi bedanya ke papan
 * lama tidak terhindarkan. Sekarang isi WMS baru = papan lama itu sendiri
 * (kode, hitungan, dan semua halamannya), cuma kulitnya diganti:
 *  - warna: setiap warna tetap (#rrggbb / #rgb) di HTML papan dan di HTML
 *    yang dikirim server dipetakan ke lima warna L4, terang atau gelap;
 *  - variabel warna papan (--coklat, --kertas, ...) ditimpa;
 *  - huruf: Archivo (judul lebar) dan IBM Plex Mono (angka, label);
 *  - sudut tajam, tanpa bayangan dan foto kepala.
 * Angkanya tidak disentuh sama sekali. */
(function (W) {
  'use strict';
  var OREN = '#F26419';

  function keHsl(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = 0, hu = 0, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      hu = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
      hu *= 60;
    }
    return { h: hu, s: s, l: l };
  }
  /* Satu warna papan lama -> satu warna L4. Coklat dan abu jadi tangga abu
     (gelap jadi teks, terang jadi permukaan); merah, oren, dan kuning jadi
     oren (peringatan dan sorotan); hijau dan biru jadi hitam (status beres).
     Di tema malam tangganya dibalik. */
  function petaWarna(hex, gelap) {
    var c = keHsl(hex), hangat = c.h < 70 || c.h > 330;
    /* coklat (merek lama), krem dan kertas (latar), abu kusam: semuanya netral */
    var coklat = c.h >= 18 && c.h <= 55 && c.l < 0.5;
    var krem = c.h >= 25 && c.h <= 65 && c.l > 0.76;
    if (c.s < 0.35 || coklat || krem) {
      if (gelap) return c.l > 0.93 ? '#181818' : c.l > 0.84 ? '#1E1E1E' : c.l > 0.7 ? '#3A3A3A' : c.l > 0.36 ? '#A8A8A8' : '#F2F2F2';
      return c.l > 0.93 ? '#FFFFFF' : c.l > 0.84 ? '#F4F4F4' : c.l > 0.7 ? '#D6D6D6' : c.l > 0.36 ? '#5F5F5F' : '#121212';
    }
    if (hangat) {
      if (c.l > 0.86) return gelap ? '#2A1B12' : '#FFF1E8';
      return OREN;
    }
    if (c.l > 0.86) return gelap ? '#1E1E1E' : '#F4F4F4';
    if (c.l > 0.7) return gelap ? '#3A3A3A' : '#D6D6D6';
    return gelap ? '#F2F2F2' : '#121212';
  }
  /* Warna 6 digit dikenali setelah tanda baca CSS/HTML; 3 digit cuma sesudah
     titik dua atau tanda kutip, supaya nomor dokumen seperti "PO #123" tidak
     ikut berubah warna. */
  var RE6 = /([:\s,("'=])#([0-9a-fA-F]{6})(?![0-9a-zA-Z])/g;
  var RE3 = /([:"'])#([0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;
  function ubahWarna(teks, gelap) {
    var memo = {};
    var ganti = function (m, pra, h) { var k = h.toLowerCase(); if (!memo[k]) memo[k] = petaWarna('#' + k, gelap); return pra + memo[k]; };
    return String(teks).replace(RE6, ganti).replace(RE3, ganti);
  }
  function ubahHuruf(teks) {
    return String(teks).replace(/Gloock,\s*Georgia,\s*serif/g, "'Archivo',Arial,sans-serif").replace(/ISans,/g, "'Archivo',");
  }

  function css(gelap) {
    var t = gelap
      ? { bg: '#121212', kartu: '#181818', lembut: '#1E1E1E', ink: '#F2F2F2', mut: '#A8A8A8', garis: '#3A3A3A', kuat: '#F2F2F2', kuatInk: '#121212' }
      : { bg: '#FFFFFF', kartu: '#FFFFFF', lembut: '#F4F4F4', ink: '#121212', mut: '#5F5F5F', garis: '#D6D6D6', kuat: '#121212', kuatInk: '#FFFFFF' };
    return [
      ':root{--coklat:' + t.kuat + ' !important;--gelap:' + t.kuat + ' !important;--kuning:' + OREN + ' !important;--krem:' + t.lembut + ' !important;--kertas:' + t.bg + ' !important;--garis:' + t.garis + ' !important;--teks:' + t.ink + ' !important;--redup:' + t.mut + ' !important;--sage:' + t.kuat + ' !important;--bata:' + OREN + ' !important;--rad:0px !important;' +
        '--l4-bg:' + t.bg + ';--l4-kartu:' + t.kartu + ';--l4-lembut:' + t.lembut + ';--l4-ink:' + t.ink + ';--l4-mut:' + t.mut + ';--l4-garis:' + t.garis + ';--l4-kuat:' + t.kuat + ';--l4-kuatInk:' + t.kuatInk + ';color-scheme:' + (gelap ? 'dark' : 'light') + '}',
      'html,body{background:var(--l4-bg) !important;color:var(--l4-ink)}',
      'body,button,input,select,textarea{font-family:"Archivo","Helvetica Neue",Arial,sans-serif !important}',
      '*,*::before,*::after{border-radius:0 !important;box-shadow:none !important;text-shadow:none !important}',
      'h1,h2,h3,h4{font-family:"Archivo",Arial,sans-serif !important;font-stretch:125%;font-weight:900 !important;letter-spacing:.005em}',
      'h1,h2{text-transform:uppercase}',
      'code,kbd,.mono,.num,.angka,td.n,th{font-family:"IBM Plex Mono",ui-monospace,monospace}',
      'th{font-size:11px !important;letter-spacing:.06em;text-transform:uppercase}',
      '#layarKode{display:none !important}',
      /* kepala: tanpa foto, putih/hitam dengan garis tebal */
      'header{background:var(--l4-bg) !important;background-image:none !important;color:var(--l4-ink) !important;border-bottom:2px solid var(--l4-ink)}',
      'header::before,header::after{display:none !important}',
      'header h1{color:var(--l4-ink) !important;font-size:30px !important;line-height:1 !important}',
      'header p,#subJudul{color:var(--l4-mut) !important;font-family:"IBM Plex Mono",monospace !important;font-size:12px !important;text-transform:uppercase;letter-spacing:.04em}',
      'header .gbrLogo{background:' + OREN + ' !important;background-image:none !important;width:44px !important;height:44px !important;display:flex !important;align-items:center;justify-content:center}',
      'header .gbrLogo>*{display:none !important}',
      'header .gbrLogo::after{content:"M";display:block !important;color:#121212;font:900 22px/1 "Archivo",Arial,sans-serif;font-stretch:125%}',
      '#kopKanan button,#kopKanan a{background:transparent !important;color:var(--l4-ink) !important;border:2px solid var(--l4-ink) !important;min-width:40px;height:40px}',
      /* menu samping */
      'nav#panel{background:var(--l4-bg) !important;border-right:2px solid var(--l4-ink)}',
      'nav#panel h3{font-family:"IBM Plex Mono",monospace !important;font-size:12px !important;letter-spacing:.08em;color:var(--l4-mut) !important}',
      'nav#panel a{color:var(--l4-ink) !important;font-weight:700}',
      'nav#panel a:hover{background:var(--l4-lembut) !important}',
      'nav#panel a.on{background:' + OREN + ' !important;color:#121212 !important}',
      'nav#panel a.on *{color:#121212 !important}',
      /* lencana jumlah di menu: biasa hitam di atas abu, "awas" oren, di menu aktif hitam */
      'nav#panel .pnlLcn{background:var(--l4-lembut) !important;color:var(--l4-ink) !important;font-family:"IBM Plex Mono",monospace !important;border:1.5px solid var(--l4-ink)}',
      'nav#panel .pnlLcn.awas{background:' + OREN + ' !important;color:#121212 !important;border-color:' + OREN + '}',
      'nav#panel a.on .pnlLcn{background:#121212 !important;color:#FFFFFF !important;border-color:#121212}',
      'nav#panel a.on .iknKotak{background:rgba(18,18,18,.12) !important}',
      /* saringan periode */
      '#kotakSaring{background:var(--l4-bg) !important;border-bottom:2px solid var(--l4-ink)}',
      '#saring button,#saring a{font-family:"IBM Plex Mono",monospace !important;font-size:12px !important;font-weight:600 !important;text-transform:uppercase;border:2px solid var(--l4-ink) !important}',
      '#saring .on,#saring [aria-pressed="true"]{background:' + OREN + ' !important;color:#121212 !important;border-color:' + OREN + ' !important}',
      /* bidang isi: papan lama menulis isinya dengan px tetap 11 sampai 13 px
         di dalam shadow root ("fontnya masih kecil"), jadi bidangnya
         diperbesar utuh; di HP sedikit saja supaya tidak meluber */
      '.isiRail{zoom:1.16}',
      '@media (max-width:760px){.isiRail{zoom:1.04}}',
      /* tombol umum */
      'button{cursor:pointer}',
      ':focus-visible{outline:3px solid ' + OREN + ' !important;outline-offset:2px}',
      'a{text-decoration-color:' + OREN + '}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms !important;transition-duration:.001ms !important}}'
    ].join('\n');
  }
  /* Untuk shadow root (halaman Summary dan lain-lain digambar di dalamnya):
     variabel ikut turun dari dokumen, jadi cukup huruf, sudut, dan tabel. */
  function cssBayang() {
    return [
      ':host,*{font-family:"Archivo","Helvetica Neue",Arial,sans-serif}',
      '*,*::before,*::after{border-radius:0 !important;box-shadow:none !important}',
      'h1,h2,h3,h4{font-family:"Archivo",Arial,sans-serif !important;font-stretch:125%;font-weight:900 !important}',
      'h2{text-transform:uppercase}',
      'th{font-family:"IBM Plex Mono",monospace;font-size:11px !important;letter-spacing:.06em;text-transform:uppercase}',
      'code,kbd,.num,.angka{font-family:"IBM Plex Mono",ui-monospace,monospace}',
      /* kartu dan ubin ringkasan: garis tebal L4, angka besar lebar (label .cap
         dibiarkan: kelasnya juga dipakai untuk catatan kaki yang panjang) */
      '.kartu,.ubin{border:2px solid var(--teks) !important;background:var(--kertas)}',
      '.nil,.stokangka{font-family:"Archivo",Arial,sans-serif !important;font-weight:900 !important;font-stretch:110%}',
      '.h3{font-family:"Archivo",Arial,sans-serif !important;font-weight:900 !important;font-stretch:125%;text-transform:uppercase;letter-spacing:.01em}'
    ].join('\n');
  }

  /* Hasil google.script.run: setiap teks yang berisi HTML ikut diwarnai
     ulang (halaman papan dikirim server sebagai HTML jadi). */
  function ubahHasil(x, gelap, dl) {
    dl = dl || 0;
    if (dl > 6 || x == null) return x;
    /* Semua teks yang memuat warna tetap ikut dipetakan, termasuk skrip
       halaman yang ditunda (pdgSkripTunda) yang tidak berisi tag HTML. */
    if (typeof x === 'string') return x.indexOf('#') > -1 || x.indexOf('Gloock') > -1 || x.indexOf('ISans') > -1 ? ubahHuruf(ubahWarna(x, gelap)) : x;
    if (Array.isArray(x)) { for (var i = 0; i < x.length; i++) x[i] = ubahHasil(x[i], gelap, dl + 1); return x; }
    if (typeof x === 'object') { Object.keys(x).forEach(function (k) { x[k] = ubahHasil(x[k], gelap, dl + 1); }); return x; }
    return x;
  }

  function ubahHtml(html, gelap) { return ubahHuruf(ubahWarna(html, gelap)); }

  W.KulitPapan = { petaWarna: petaWarna, ubahWarna: ubahWarna, ubahHtml: ubahHtml, ubahHasil: ubahHasil, css: css, cssBayang: cssBayang };
})(typeof window !== 'undefined' ? window : globalThis);
