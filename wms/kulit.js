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
  /* Warna 6 digit dikenali setelah tanda baca CSS/HTML. Warna 3 digit:
     sesudah titik dua, kutip, koma, atau kurung buka (di dalam gradasi:
     "135deg,#fff 0"); sesudah spasi ("solid #fff") hanya kalau memuat huruf
     a-f atau angka kembar (#333), supaya nomor dokumen seperti "PO #123"
     tidak ikut berubah warna. Dulu "#fff" sesudah koma terlewat: sel
     cadangan di peta gudang malam jadi arsir hitam-putih. */
  var RE6 = /([:\s,("'=])#([0-9a-fA-F]{6})(?![0-9a-zA-Z])/g;
  var RE3 = /([:"',(])#([0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;
  var RE3S = /(\s)#([0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;
  function ubahWarna(teks, gelap) {
    var memo = {};
    var ganti = function (m, pra, h) { var k = h.toLowerCase(); if (!memo[k]) memo[k] = petaWarna('#' + k, gelap); return pra + memo[k]; };
    var gantiSpasi = function (m, pra, h) { return /[a-fA-F]/.test(h) || /^(\d)\1\1$/.test(h) ? ganti(m, pra, h) : m; };
    var hasil = String(teks).replace(RE6, ganti).replace(RE3, ganti).replace(RE3S, gantiSpasi);
    /* putih tembus (rgba(255,255,255,a)) di tema malam jadi hitam tembus:
       dulu tetap putih, jadi kabut dan tepi pudar putih di atas latar gelap */
    return gelap ? hasil.replace(RE_PUTIH, 'rgba(18,18,18,') : hasil;
  }
  var RE_PUTIH = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/g;
  function ubahHuruf(teks) {
    return String(teks).replace(/Gloock,\s*Georgia,\s*serif/g, "'Archivo',Arial,sans-serif").replace(/ISans,/g, "'Archivo',");
  }

  function css(gelap) {
    var t = gelap
      ? { bg: '#121212', kartu: '#181818', lembut: '#1E1E1E', ink: '#F2F2F2', mut: '#A8A8A8', garis: '#3A3A3A', kuat: '#F2F2F2', kuatInk: '#121212' }
      : { bg: '#FFFFFF', kartu: '#FFFFFF', lembut: '#F4F4F4', ink: '#121212', mut: '#5F5F5F', garis: '#D6D6D6', kuat: '#121212', kuatInk: '#FFFFFF' };
    return [
      ':root{--coklat:' + t.kuat + ' !important;--gelap:' + t.kuat + ' !important;--kuning:' + OREN + ' !important;--krem:' + t.lembut + ' !important;--kertas:' + t.bg + ' !important;--garis:' + t.garis + ' !important;--teks:' + t.ink + ' !important;--redup:' + t.mut + ' !important;--sage:' + t.kuat + ' !important;--bata:' + OREN + ' !important;--rad:0px !important;' +
        '--l4-bg:' + t.bg + ';--l4-kartu:' + t.kartu + ';--l4-lembut:' + t.lembut + ';--l4-ink:' + t.ink + ';--l4-mut:' + t.mut + ';--l4-garis:' + t.garis + ';--l4-kuat:' + t.kuat + ';--l4-kuatInk:' + t.kuatInk + ';--l4-arsir:' + (gelap ? '#2A2A2A' : '#ECECEC') + ';color-scheme:' + (gelap ? 'dark' : 'light') + '}',
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
      /* gerak: menu memantul saat dipilih, isi baru naik pelan */
      'nav#panel a{transition:background-color .2s ease,color .2s ease,transform .12s ease}',
      'nav#panel a:active,#kopKanan button:active,#saring button:active{transform:scale(.96)}',
      'nav#panel a.on .iknKotak{animation:l4pantul .55s cubic-bezier(.3,1.7,.5,1) both}',
      '@keyframes l4pantul{0%{transform:scale(.6) rotate(-12deg)}60%{transform:scale(1.15) rotate(4deg)}100%{transform:none}}',
      '.isiRail>*{animation:l4naik .45s cubic-bezier(.2,.8,.2,1) both}',
      '@keyframes l4naik{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
      /* HP: kepala ringkas (logo + judul satu baris, tombol di baris kedua),
         menu dan saringan periode digeser ke samping tanpa batang gulir */
      '@media (max-width:760px){' +
        '.isiRail{zoom:1}' +
        'header .bungkus{display:grid !important;grid-template-columns:36px minmax(0,1fr) !important;gap:4px 10px !important;align-items:center !important;padding:10px 12px !important}' +
        'header .gbrLogo{width:36px !important;height:36px !important}header .gbrLogo::after{font-size:18px !important}' +
        'header .bungkus>div:nth-child(2){min-width:0}' +
        'header h1{font-size:20px !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 !important}' +
        '#subJudul{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px !important;margin:2px 0 0 !important}' +
        '#kopKanan{grid-column:1 / -1;display:flex !important;gap:6px !important;overflow-x:auto;justify-content:flex-start !important;margin:4px 0 0 !important;position:static !important;scrollbar-width:none}' +
        '#kopKanan button,#kopKanan a{height:34px !important;min-width:34px !important;margin:0 !important;flex:none}' +
        'nav#panel h3{display:none !important}' +
        'nav#panel{scrollbar-width:none}nav#panel::-webkit-scrollbar,#saring .grup::-webkit-scrollbar,#kopKanan::-webkit-scrollbar{display:none}' +
        '#saring{flex-wrap:wrap !important;gap:6px !important}' +
        '#saring .grup{flex-wrap:nowrap !important;overflow-x:auto;scrollbar-width:none;max-width:100%}' +
        '#saring .grup>*{flex:none}' +
        '#saring .sisa{width:100%;font-size:12px !important}' +
      '}',
      /* tepi pudar tabel papan lama (.gulung: gradasi putih + bayangan coklat
         di kiri kanan) melanggar L4 dan jadi kabut putih di tema malam */
      '.gulung{background:none !important}',
      /* lebih hidup: ikon menu bergoyang saat disorot, tombol timbul kotak */
      'nav#panel a:hover .iknKotak{animation:l4goyang .5s ease}',
      '@keyframes l4goyang{0%,100%{transform:none}25%{transform:rotate(-12deg) scale(1.08)}75%{transform:rotate(9deg) scale(1.08)}}',
      '#kopKanan button,#saring button,#kopKanan a{transition:transform .12s ease,box-shadow .12s ease}',
      '#kopKanan button:hover,#saring button:hover,#kopKanan a:hover{transform:translate(-2px,-2px);box-shadow:3px 3px 0 ' + OREN + ' !important}',
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
      '.h3{font-family:"Archivo",Arial,sans-serif !important;font-weight:900 !important;font-stretch:125%;text-transform:uppercase;letter-spacing:.01em}',
      /* gerak: kartu, ubin, dan tabel naik bergantian saat halaman digambar;
         kartu terangkat sedikit saat disorot */
      '.kartu,.ubin,.u,table{animation:l4naik .45s cubic-bezier(.2,.8,.2,1) both}',
      '.u:nth-child(2),.ubin:nth-child(2){animation-delay:60ms}.u:nth-child(3),.ubin:nth-child(3){animation-delay:120ms}.u:nth-child(4),.ubin:nth-child(4){animation-delay:180ms}.u:nth-child(5),.ubin:nth-child(5){animation-delay:240ms}',
      '@keyframes l4naik{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
      '.kartu,.ubin{transition:border-color .2s ease,transform .2s ease,box-shadow .2s ease}',
      /* kartu tersorot timbul kotak: geser 2 px, bayangan 4 px tanpa blur */
      '.kartu:hover,.ubin:hover{border-color:#F26419 !important;transform:translate(-2px,-2px);box-shadow:4px 4px 0 var(--l4-ink) !important}',
      'button:not([disabled]){transition:transform .12s ease,box-shadow .12s ease}',
      'button:not([disabled]):hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 #F26419 !important}',
      'button:not([disabled]):active{transform:translate(1px,1px);box-shadow:none !important}',
      '.gulung{background:none !important}',
      'tbody tr{transition:background-color .15s ease}tbody tr:hover{background:var(--krem)}',
      /* sel cadangan di peta gudang dan contohnya di keterangan: arsir lembut
         L4, tulisan tetap terbaca (dua warna asli dipetakan ke warna yang sama) */
      '.c.res{background:repeating-linear-gradient(135deg,var(--l4-kartu) 0 6px,var(--l4-arsir) 6px 12px) !important}',
      '.key .sw[style*="dashed"]{background:repeating-linear-gradient(135deg,var(--l4-kartu) 0 3px,var(--l4-arsir) 3px 6px) !important}',
      '.gbrKosong,.gdgIsiTanpaFoto{background:repeating-linear-gradient(45deg,var(--l4-kartu) 0 5px,var(--l4-arsir) 5px 10px) !important}',
      /* boneka di pesan memuat papan lama */
      '.l4-boneka{display:inline-block;width:46px;height:42px;vertical-align:middle;margin-right:10px;animation:l4intip 1.4s ease-in-out infinite}',
      '@keyframes l4intip{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
      /* HP: angka besar papan lama dihitung dari lebar wadah (cqi) dan jadi
         sekecil 8 px; di HP dikunci 28 px */
      '@media (max-width:760px){.u b.nil,.nil{font-size:28px !important}.stokangka{font-size:24px !important}}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none !important;transition:none !important}}'
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
