/* Kulit Mofmo Soft untuk papan lama (10 Okt 2026 malam).
 *
 * Isi WMS = papan lama itu sendiri (kode, hitungan, dan semua halamannya);
 * yang diganti cuma kulitnya. Sebelumnya kulit L4 (hitam, putih, oren, sudut
 * tajam). Ferdy: "masih kaku", "beruangnya kurang lucu", "pakai karakter asli
 * Mofmo", lalu menyetujui mockup Mofmo Soft: "gas bangun, bagus soalnya".
 *  - warna: setiap warna tetap (#rrggbb / #rgb) di HTML papan dan di HTML
 *    yang dikirim server dipetakan ke palet Mofmo Soft, terang atau gelap
 *    (krem dan coklat untuk netral, terakota untuk peringatan, mint untuk
 *    hijau, biru lembut untuk biru);
 *  - variabel warna papan (--coklat, --kertas, ...) ditimpa;
 *  - huruf: Baloo 2 (judul, angka besar) dan Nunito (teks, label);
 *  - sudut bulat, bayangan lembut, kartu berjahitan, logo foto Shiba.
 * Angkanya tidak disentuh sama sekali. */
(function (W) {
  'use strict';
  var T = {
    terang: { bg: '#FFF8EF', kartu: '#FFFFFF', lembut: '#FCF1E4', ink: '#4A3426', mut: '#7E6656', garis: '#EFE1CF', jahit: '#E9CBA8', aksen: '#F6A26B', aksenTeks: '#A9501C', peach: '#FFE3CC', mint: '#D5EFE1', mintTeks: '#2F6B52', pink: '#FBDCDC', pinkTeks: '#A2404F', bayang: 'rgba(140,96,60,.13)', arsir: '#F3E6D6', diAksen: '#4A3426' },
    gelap: { bg: '#2B221C', kartu: '#352A22', lembut: '#3C2F26', ink: '#F8ECDF', mut: '#C9B4A2', garis: '#4B3C31', jahit: '#6A5444', aksen: '#F6A26B', aksenTeks: '#F7B386', peach: '#5A3F2E', mint: '#2F4A3D', mintTeks: '#BFE8D2', pink: '#5A3138', pinkTeks: '#F7C6CC', bayang: 'rgba(0,0,0,.30)', arsir: '#43352B', diAksen: '#4A3426' }
  };

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
  /* Satu warna papan lama -> satu warna Mofmo Soft. Coklat, krem, dan abu jadi
     tangga coklat (gelap jadi tinta, terang jadi permukaan; putih murni tetap
     kartu putih, kertas jadi krem); merah, oren, dan kuning jadi peach lembut
     (terang) atau terakota (peringatan); hijau jadi mint; biru jadi biru
     lembut. Di tema malam tangganya dibalik ke coklat hangat, bukan hitam. */
  function petaWarna(hex, gelap) {
    var c = keHsl(hex), hangat = c.h < 70 || c.h > 330;
    var coklat = c.h >= 18 && c.h <= 55 && c.l < 0.5;
    var krem = c.h >= 25 && c.h <= 65 && c.l > 0.76;
    if (c.s < 0.35 || coklat || krem) {
      if (gelap) return c.l > 0.985 ? '#352A22' : c.l > 0.93 ? '#2B221C' : c.l > 0.84 ? '#3C2F26' : c.l > 0.7 ? '#4B3C31' : c.l > 0.36 ? '#C9B4A2' : '#F8ECDF';
      return c.l > 0.985 ? '#FFFFFF' : c.l > 0.93 ? '#FFF8EF' : c.l > 0.84 ? '#FCF1E4' : c.l > 0.7 ? '#EFE1CF' : c.l > 0.36 ? '#7E6656' : '#4A3426';
    }
    if (hangat) {
      if (c.l > 0.86) return gelap ? '#5A3F2E' : '#FFE3CC';
      if (c.l > 0.72) return gelap ? '#6E4A34' : '#F9C9A4';
      return gelap ? '#E8935F' : '#B4532A';
    }
    var hijau = c.h >= 70 && c.h < 170;
    if (hijau) return c.l > 0.86 ? (gelap ? '#2F4A3D' : '#D5EFE1') : c.l > 0.7 ? (gelap ? '#3B5A4B' : '#BFE3CF') : (gelap ? '#BFE8D2' : '#2F6B52');
    return c.l > 0.86 ? (gelap ? '#2C3E4F' : '#DCEAF7') : c.l > 0.7 ? (gelap ? '#3A5168' : '#C6DDF2') : (gelap ? '#C6DDF2' : '#2E5C80');
  }
  /* Warna 6 digit dikenali setelah tanda baca CSS/HTML. Warna 3 digit:
     sesudah titik dua, kutip, koma, atau kurung buka (di dalam gradasi:
     "135deg,#fff 0"); sesudah spasi ("solid #fff") hanya kalau memuat huruf
     a-f atau angka kembar (#333), supaya nomor dokumen seperti "PO #123"
     tidak ikut berubah warna. */
  var RE6 = /([:\s,("'=])#([0-9a-fA-F]{6})(?![0-9a-zA-Z])/g;
  var RE3 = /([:"',(])#([0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;
  var RE3S = /(\s)#([0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;
  var RE_PUTIH = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/g;
  function ubahWarna(teks, gelap) {
    var memo = {};
    var ganti = function (m, pra, h) { var k = h.toLowerCase(); if (!memo[k]) memo[k] = petaWarna('#' + k, gelap); return pra + memo[k]; };
    var gantiSpasi = function (m, pra, h) { return /[a-fA-F]/.test(h) || /^(\d)\1\1$/.test(h) ? ganti(m, pra, h) : m; };
    var hasil = String(teks).replace(RE6, ganti).replace(RE3, ganti).replace(RE3S, gantiSpasi);
    /* putih tembus (rgba(255,255,255,a)) di tema malam jadi coklat gelap tembus */
    return gelap ? hasil.replace(RE_PUTIH, 'rgba(43,34,28,') : hasil;
  }
  var HURUF = "'Nunito','Helvetica Neue',Arial,sans-serif", JUDUL = "'Baloo 2','Nunito',Arial,sans-serif";
  function ubahHuruf(teks) {
    return String(teks).replace(/Gloock,\s*Georgia,\s*serif/g, JUDUL).replace(/ISans,/g, "'Nunito',");
  }

  /* Alamat gambar (foto boneka dan produk) di folder WMS. Bingkai srcdoc dan
     shadow root memakai alamat dokumen induk, jadi alamatnya dibuat penuh. */
  var DASAR = (function () { try { return new URL('img/', W.location.href).href; } catch (e) { return 'img/'; } })();

  function css(gelap, dasar) {
    var t = gelap ? T.gelap : T.terang, img = dasar || DASAR;
    return [
      ':root{--coklat:' + t.ink + ' !important;--gelap:' + t.ink + ' !important;--kuning:' + t.aksen + ' !important;--krem:' + t.lembut + ' !important;--kertas:' + t.bg + ' !important;--garis:' + t.garis + ' !important;--teks:' + t.ink + ' !important;--redup:' + t.mut + ' !important;--sage:' + t.mintTeks + ' !important;--bata:' + t.aksenTeks + ' !important;--rad:16px !important;' +
        '--l4-bg:' + t.bg + ';--l4-kartu:' + t.kartu + ';--l4-lembut:' + t.lembut + ';--l4-ink:' + t.ink + ';--l4-mut:' + t.mut + ';--l4-garis:' + t.garis + ';--l4-jahit:' + t.jahit + ';--l4-aksen:' + t.aksen + ';--l4-aksenTeks:' + t.aksenTeks + ';--l4-peach:' + t.peach + ';--l4-mint:' + t.mint + ';--l4-mintTeks:' + t.mintTeks + ';--l4-pink:' + t.pink + ';--l4-pinkTeks:' + t.pinkTeks + ';--l4-bayang:' + t.bayang + ';--l4-arsir:' + t.arsir + ';--l4-diAksen:' + t.diAksen + ';color-scheme:' + (gelap ? 'dark' : 'light') + '}',
      'html,body{background:var(--l4-bg) !important;color:var(--l4-ink)}',
      'body,button,input,select,textarea{font-family:' + HURUF + ' !important}',
      'h1,h2,h3,h4{font-family:' + JUDUL + ' !important;font-weight:800 !important;letter-spacing:-.005em;text-transform:none !important}',
      'th{font-family:' + HURUF + ';font-weight:800 !important;font-size:12px !important;letter-spacing:.02em;text-transform:none}',
      'button,input,select,textarea{border-radius:12px}',
      '#layarKode{display:none !important}',
      /* kepala: kartu krem, garis jahitan, logo foto Shiba dalam lingkaran peach */
      'header{background:var(--l4-kartu) !important;background-image:none !important;color:var(--l4-ink) !important;border-bottom:2px dashed var(--l4-jahit);box-shadow:0 6px 18px var(--l4-bayang)}',
      'header::before,header::after{display:none !important}',
      'header h1{color:var(--l4-ink) !important;font-size:32px !important;line-height:1 !important}',
      'header p,#subJudul{color:var(--l4-mut) !important;font-family:' + HURUF + ' !important;font-weight:700;font-size:13px !important;letter-spacing:.01em}',
      'header .gbrLogo{background:var(--l4-peach) !important;background-image:none !important;width:52px !important;height:52px !important;border-radius:50% !important;overflow:hidden;display:flex !important;align-items:flex-end;justify-content:center;flex:none}',
      'header .gbrLogo>*{display:none !important}',
      'header .gbrLogo::after{content:"";display:block !important;width:44px;height:44px;margin-bottom:-4px;background:url("' + img + 'kc_shiba.webp") center bottom/contain no-repeat}',
      '#kopKanan button,#kopKanan a{background:var(--l4-kartu) !important;color:var(--l4-ink) !important;border:0 !important;border-radius:999px !important;box-shadow:0 4px 14px var(--l4-bayang) !important;min-width:40px;height:42px;padding:0 16px !important;font-weight:800 !important}',
      /* menu samping: kartu putih, tombol pil, menu aktif peach lembut + bola Tiger */
      'nav#panel{background:var(--l4-kartu) !important;border-right:0 !important;box-shadow:6px 0 22px var(--l4-bayang)}',
      'nav#panel h3{font-family:' + HURUF + ' !important;font-weight:800 !important;font-size:12px !important;letter-spacing:.04em;color:var(--l4-mut) !important}',
      'nav#panel a{color:var(--l4-ink) !important;font-weight:800;border-radius:999px !important}',
      'nav#panel a:hover{background:var(--l4-lembut) !important}',
      'nav#panel a.on{background:var(--l4-peach) !important;color:var(--l4-ink) !important}',
      'nav#panel a.on *{color:var(--l4-ink) !important}',
      /* papan asli tidak punya ikon untuk Warehouse (svg kosong); di lingkaran peach bolongnya kelihatan, jadi diisi gambar gudang */
      'nav#panel .iknKotak svg.ikn:empty{background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.8%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M3 21V9l9-6 9 6v12%27/%3E%3Cpath d=%27M7 21v-8h10v8%27/%3E%3Cpath d=%27M7 17h10%27/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.8%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M3 21V9l9-6 9 6v12%27/%3E%3Cpath d=%27M7 21v-8h10v8%27/%3E%3Cpath d=%27M7 17h10%27/%3E%3C/svg%3E") center/contain no-repeat}',
      'nav#panel a.on::after{content:"";display:inline-block;width:26px;height:26px;margin-left:auto;vertical-align:middle;flex:none;background:url("' + img + 'mb_tiger.webp") center/contain no-repeat}',
      'nav#panel .pnlLcn{background:var(--l4-pink) !important;color:var(--l4-pinkTeks) !important;font-family:' + HURUF + ' !important;font-weight:800;border:0 !important;border-radius:999px !important}',
      'nav#panel .pnlLcn.awas{background:var(--l4-aksen) !important;color:var(--l4-diAksen) !important}',
      'nav#panel a.on .pnlLcn{background:var(--l4-kartu) !important;color:var(--l4-ink) !important}',
      'nav#panel .iknKotak{border-radius:12px !important}',
      'nav#panel a.on .iknKotak{background:rgba(255,255,255,.55) !important}',
      /* saringan periode: pil, yang aktif peach */
      '#kotakSaring{background:var(--l4-bg) !important;border-bottom:2px dashed var(--l4-jahit)}',
      '#saring button,#saring a{font-family:' + HURUF + ' !important;font-size:13px !important;font-weight:800 !important;border:1.5px solid var(--l4-garis) !important;border-radius:999px !important;background:var(--l4-kartu)}',
      '#saring .on,#saring [aria-pressed="true"]{background:var(--l4-aksen) !important;color:var(--l4-diAksen) !important;border-color:var(--l4-aksen) !important}',
      /* bidang isi: papan lama menulis isinya dengan px tetap 11 sampai 13 px
         di dalam shadow root, jadi bidangnya diperbesar utuh (Ferdy: "gedein
         fontnya"); di HP sedikit saja supaya tidak meluber */
      '.isiRail{zoom:1.22}',
      'nav#panel a{transition:background-color .2s ease,color .2s ease,transform .15s ease}',
      'nav#panel a:hover{transform:translateX(2px)}',
      'nav#panel a:active,#kopKanan button:active,#saring button:active{transform:scale(.96)}',
      'nav#panel a.on .iknKotak{animation:l4pantul .55s cubic-bezier(.3,1.7,.5,1) both}',
      '@keyframes l4pantul{0%{transform:scale(.6) rotate(-12deg)}60%{transform:scale(1.15) rotate(4deg)}100%{transform:none}}',
      'nav#panel a:hover .iknKotak{animation:l4goyang .5s ease}',
      '@keyframes l4goyang{0%,100%{transform:none}25%{transform:rotate(-12deg) scale(1.08)}75%{transform:rotate(9deg) scale(1.08)}}',
      '.isiRail>*{animation:l4naik .45s cubic-bezier(.2,.8,.2,1) both}',
      '@keyframes l4naik{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
      /* bola Tiger cukup di submenu yang aktif; induknya ikut ber-kelas on di papan asli */
      'nav#panel a.on:has(+ .anak a.on)::after{display:none !important}',
      /* Ferdy: "menu task di kiri bukan di atas". Papan asli memindah menu ke pita atas di <= 900 px;
         di sini jadi laci dari kiri yang dibuka tombol menu di kepala. */
      '.l4-burger{display:none;width:40px;height:40px;border-radius:999px;align-items:center;justify-content:center;border:1.5px solid var(--l4-garis);background:var(--l4-kartu);color:var(--l4-ink);cursor:pointer;flex:none;padding:0;margin-right:4px}',
      '.l4-burger svg{width:20px;height:20px}',
      '.l4-tirai-laci{display:none}',
      '@media (max-width:900px){' +
        '.l4-burger{display:inline-flex !important}' +
        '.rangka{display:block !important}' +
        'nav#panel{position:fixed !important;top:0 !important;left:0 !important;bottom:0 !important;z-index:60 !important;width:min(84vw,300px) !important;min-height:0 !important;height:100% !important;display:block !important;overflow-x:hidden !important;overflow-y:auto !important;padding:18px 12px 24px !important;border-right:1.5px solid var(--l4-garis) !important;border-bottom:0 !important;border-radius:0 22px 22px 0;background:var(--l4-kartu) !important;transform:translateX(-105%);transition:transform .26s cubic-bezier(.2,.8,.2,1),box-shadow .26s ease;box-shadow:none}' +
        'body.l4-laci nav#panel{transform:none;box-shadow:14px 0 40px var(--l4-bayang)}' +
        'nav#panel a{display:flex !important;width:100%;box-sizing:border-box;white-space:normal !important;margin:0 0 3px !important;padding:11px 12px !important;font-size:16px !important}' +
        'nav#panel .anak{display:block !important;margin:2px 0 8px 18px !important;padding-left:10px !important;border-left:2px dashed var(--l4-jahit) !important;border-top:0 !important}' +
        'nav#panel .anak a{padding:9px 12px !important;font-size:15px !important}' +
        'nav#panel h3{display:block !important;margin:4px 0 12px 6px !important}' +
        'nav#panel .pisah,nav#panel p{display:block !important}' +
        '.l4-tirai-laci{display:block;position:fixed;inset:0;z-index:59;background:rgba(43,34,28,.32);opacity:0;pointer-events:none;transition:opacity .22s ease}' +
        'body.l4-laci .l4-tirai-laci{opacity:1;pointer-events:auto}' +
        'body.l4-laci{overflow:hidden}' +
      '}',
      '@media (max-width:760px){' +
        '.isiRail{zoom:1}' +
        'header .bungkus{display:grid !important;grid-template-columns:auto 40px minmax(0,1fr) !important;gap:4px 10px !important;align-items:center !important;padding:10px 12px !important}' +
        'header .gbrLogo{width:40px !important;height:40px !important}header .gbrLogo::after{width:34px;height:34px}' +
        'header .bungkus>div:not(.gbrLogo):not(#kopKanan){min-width:0}' +
        'header h1{font-size:21px !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 !important}' +
        '#subJudul{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px !important;margin:2px 0 0 !important}' +
        '#kopKanan{grid-column:1 / -1;display:flex !important;gap:6px !important;overflow-x:auto;justify-content:flex-start !important;margin:4px 0 0 !important;position:static !important;scrollbar-width:none}' +
        '#kopKanan button,#kopKanan a{height:36px !important;min-width:36px !important;margin:0 !important;flex:none;padding:0 12px !important}' +
        'nav#panel{scrollbar-width:none}nav#panel::-webkit-scrollbar,#saring .grup::-webkit-scrollbar,#kopKanan::-webkit-scrollbar{display:none}' +
        'nav#panel a.on::after{width:20px;height:20px}' +
        '#saring{flex-wrap:wrap !important;gap:6px !important}' +
        '#saring .grup{flex-wrap:nowrap !important;overflow-x:auto;scrollbar-width:none;max-width:100%}' +
        '#saring .grup>*{flex:none}' +
        '#saring .sisa{width:100%;font-size:12px !important}' +
      '}',
      '.gulung{background:none !important}',
      '#kopKanan button,#saring button,#kopKanan a{transition:transform .15s ease,box-shadow .15s ease}',
      '#kopKanan button:hover,#saring button:hover,#kopKanan a:hover{transform:translateY(-2px);box-shadow:0 8px 20px var(--l4-bayang) !important}',
      'button{cursor:pointer}',
      ':focus-visible{outline:3px solid var(--l4-aksen) !important;outline-offset:2px}',
      'a{text-decoration-color:var(--l4-aksen)}',
      cssFotoSku(),
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms !important;transition-duration:.001ms !important}}'
    ].join('\n');
  }
  /* Foto produk kecil di depan nama SKU (dipakai di dokumen dan shadow root). */
  function cssFotoSku() {
    return 'img.l4-sku{width:30px;height:30px;object-fit:contain;vertical-align:middle;margin:-4px 8px -4px 0;border-radius:9px;background:var(--l4-lembut);padding:1px;transition:transform .2s ease;position:relative;z-index:1;cursor:zoom-in}' +
      'img.l4-sku:focus-visible{outline:3px solid var(--l4-aksen);outline-offset:2px}' +
      'img.l4-sku:hover{transform:scale(2.2);z-index:5;box-shadow:0 8px 20px var(--l4-bayang)}' +
      '.c[data-sku] img.l4-sku{width:24px;height:24px;float:right;margin:0 0 0 4px;border-radius:7px}';
  }
  /* Untuk shadow root (halaman Summary dan lain-lain digambar di dalamnya):
     variabel ikut turun dari dokumen, jadi cukup huruf, sudut, kartu, tabel. */
  function cssBayang() {
    return [
      ':host,*{font-family:' + HURUF + '}',
      'h1,h2,h3,h4{font-family:' + JUDUL + ' !important;font-weight:800 !important;text-transform:none !important}',
      'th{font-family:' + HURUF + ';font-weight:800 !important;font-size:12px !important;letter-spacing:.02em;text-transform:none !important;color:var(--l4-mut)}',
      'code,kbd,.num,.angka{font-family:' + HURUF + ';font-variant-numeric:tabular-nums;font-weight:700}',
      /* kartu dan ubin ringkasan: putih, bersudut bulat, berjahitan seperti boneka */
      '.kartu,.ubin{border:1.5px solid var(--l4-garis) !important;background:var(--l4-kartu) !important;border-radius:18px !important;outline:2px dashed var(--l4-jahit);outline-offset:-7px;box-shadow:0 6px 18px var(--l4-bayang)}',
      /* ubin ringkasan papan asli = grid sel .u bercelah: jahitan di ubin tertutup sel putih dan cuma tampak sepotong di celah, jadi jahitannya pindah ke tiap sel */
      '.ubin:has(>.u),.ubin:has(>.u):hover{background:transparent !important;border:0 !important;outline:none;box-shadow:none !important}',
      /* Gudang Outbound: ubin tahap dan daftar kiriman punya kelas sendiri */
      '.pita .tp{color:var(--l4-ink) !important;border:1.5px solid var(--l4-garis) !important;border-radius:18px !important;outline:2px dashed var(--l4-jahit);outline-offset:-7px;box-shadow:0 6px 18px var(--l4-bayang);padding:14px 18px !important}',
      '.pita .tp b{font-family:' + JUDUL + ' !important;font-weight:800 !important;font-size:30px !important;line-height:1.1}',
      '.daftar{border:1.5px solid var(--l4-garis) !important;border-radius:18px !important;box-shadow:0 6px 18px var(--l4-bayang);overflow:hidden}',
      '.daftar .b{border-radius:999px !important;padding-left:16px;padding-right:16px}',
      '.ubin>.u{border:1.5px solid var(--l4-garis) !important;background:var(--l4-kartu) !important;border-radius:18px !important;outline:2px dashed var(--l4-jahit);outline-offset:-7px;box-shadow:0 6px 18px var(--l4-bayang)}',
      '.nil,.stokangka{font-family:' + JUDUL + ' !important;font-weight:800 !important;letter-spacing:-.01em}',
      '.h3{font-family:' + JUDUL + ' !important;font-weight:800 !important;text-transform:none !important;letter-spacing:0}',
      'table{border-collapse:separate;border-spacing:0}',
      'button,input,select,textarea{border-radius:12px}',
      '.kartu,.ubin,.u,table{animation:l4naik .45s cubic-bezier(.2,.8,.2,1) both}',
      '.u:nth-child(2),.ubin:nth-child(2){animation-delay:60ms}.u:nth-child(3),.ubin:nth-child(3){animation-delay:120ms}.u:nth-child(4),.ubin:nth-child(4){animation-delay:180ms}.u:nth-child(5),.ubin:nth-child(5){animation-delay:240ms}',
      '@keyframes l4naik{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
      '.kartu,.ubin{transition:transform .2s ease,box-shadow .2s ease}',
      /* kartu tersorot terangkat dengan bayangan lembut */
      '.kartu:hover,.ubin:hover{transform:translateY(-3px);box-shadow:0 14px 30px var(--l4-bayang) !important}',
      'button:not([disabled]){transition:transform .15s ease,box-shadow .15s ease}',
      'button:not([disabled]):hover{transform:translateY(-1px);box-shadow:0 6px 16px var(--l4-bayang) !important}',
      'button:not([disabled]):active{transform:scale(.97);box-shadow:none !important}',
      '.gulung{background:none !important}',
      'tbody tr{transition:background-color .15s ease}tbody tr:hover{background:var(--l4-lembut)}',
      /* peta gudang: sel lokasi bersudut bulat */
      '.c{border-radius:12px !important}',
      '.c.res{background:repeating-linear-gradient(135deg,var(--l4-kartu) 0 6px,var(--l4-arsir) 6px 12px) !important}',
      '.key .sw[style*="dashed"]{background:repeating-linear-gradient(135deg,var(--l4-kartu) 0 3px,var(--l4-arsir) 3px 6px) !important}',
      '.gbrKosong,.gdgIsiTanpaFoto{background:repeating-linear-gradient(45deg,var(--l4-kartu) 0 5px,var(--l4-arsir) 5px 10px) !important;border-radius:12px}',
      /* boneka di pesan memuat papan lama */
      '.l4-boneka{display:inline-block;width:46px;height:auto;vertical-align:middle;margin-right:10px;animation:l4intip 1.4s ease-in-out infinite}',
      '@keyframes l4intip{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
      cssFotoSku(),
      '@media (max-width:760px){.u b.nil,.nil{font-size:28px !important}.stokangka{font-size:24px !important}}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none !important;transition:none !important}}'
    ].join('\n');
  }

  /* Foto produk per nama SKU. Nama panjang ("MofmoFriends Key Ring - Tiger")
     dan nama pendek gudang ("KR Tiger", "Ruck NDR") sama-sama dikenali.
     S Netherland Dwarf belum punya foto: dibiarkan tanpa gambar. */
  var FOTO = [
    ['(backpack|\\bbp\\b) ivory', 'bp_ivory'], ['(backpack|\\bbp\\b) pink', 'bp_pink'], ['(backpack|\\bbp\\b) green', 'bp_green'], ['(backpack|\\bbp\\b) blue', 'bp_blue'],
    ['ruck.*(dwarf|rabbit|ndr)', 'rs_rabbit'], ['ruck.*(british|bsh)', 'rs_bsh'], ['cap.*banana', 'cap_banana'], ['cap.*melon', 'cap_melon'], ['cap.*tomato', 'cap_tomato'], ['cap.*(dwarf|rabbit|ndr)', 'cap_rabbit'],
    ['(charm|\\bkc\\b).*bear', 'kc_bear'], ['(charm|\\bkc\\b).*bichon', 'kc_bichon'], ['(charm|\\bkc\\b).*(british|bsh)', 'kc_bsh'], ['(charm|\\bkc\\b).*cow', 'kc_cow'], ['(charm|\\bkc\\b).*lamb', 'kc_lamb'], ['(charm|\\bkc\\b).*(dwarf|rabbit|ndr)', 'kc_rabbit'], ['(charm|\\bkc\\b).*shiba', 'kc_shiba'], ['(charm|\\bkc\\b).*tiger', 'kc_tiger'],
    ['(ring|\\bkr\\b).*bear', 'kr_bear'], ['(ring|\\bkr\\b).*bichon', 'kr_bichon'], ['(ring|\\bkr\\b).*(british|bsh)', 'kr_bsh'], ['(ring|\\bkr\\b).*(dwarf|rabbit|ndr)', 'kr_rabbit'], ['(ring|\\bkr\\b).*tiger', 'kr_tiger'],
    ['ball.*panda', 'mb_panda'], ['ball.*tiger', 'mb_tiger'], ['ball.*collie', 'mb_collie'], ['ball.*lamb', 'mb_lamb'],
    ['angora', 'angora'], ['reindeer', 'reindeer'], ['red panda', 'redpanda'], ['rac+oon', 'racoon'], ['panda', 'panda'], ['elephant', 'elephant'], ['koala', 'koala'], ['otter', 'otter'], ['pekingese', 'pekingese_s'], ['bi[cs]h?on', 'bichon_s'], ['collie', 'collie'], ['lamb', 'lamb'], ['shiba', 'shiba'], ['\\bbear\\b', 'bear']
  ];
  /* Teks yang memang nama produk: memuat kata merek/kategori, atau nama
     pendek gudang (S, M, KC, KR, Ball, BP, Ruck, Cap di depan). */
  var RE_PRODUK = /mofmo|key ?charm|key ?ring|mascot ball|backpack|rucks?a?ck|cap for|^(S|M|KC|KR|Ball|BP|Ruck|Cap) [A-Z]/i;
  function fotoSku(nama) {
    var n = String(nama || '').trim();
    if (!n || n.length > 90 || !RE_PRODUK.test(n)) return '';
    for (var i = 0; i < FOTO.length; i++) if (new RegExp(FOTO[i][0], 'i').test(n)) return FOTO[i][1];
    return '';
  }

  /* Hasil google.script.run: setiap teks yang berisi HTML ikut diwarnai
     ulang (halaman papan dikirim server sebagai HTML jadi). */
  function ubahHasil(x, gelap, dl) {
    dl = dl || 0;
    if (dl > 6 || x == null) return x;
    if (typeof x === 'string') return x.indexOf('#') > -1 || x.indexOf('Gloock') > -1 || x.indexOf('ISans') > -1 ? ubahHuruf(ubahWarna(x, gelap)) : x;
    if (Array.isArray(x)) { for (var i = 0; i < x.length; i++) x[i] = ubahHasil(x[i], gelap, dl + 1); return x; }
    if (typeof x === 'object') { Object.keys(x).forEach(function (k) { x[k] = ubahHasil(x[k], gelap, dl + 1); }); return x; }
    return x;
  }

  function ubahHtml(html, gelap) { return ubahHuruf(ubahWarna(html, gelap)); }

  W.KulitPapan = { petaWarna: petaWarna, ubahWarna: ubahWarna, ubahHtml: ubahHtml, ubahHasil: ubahHasil, css: css, cssBayang: cssBayang, fotoSku: fotoSku, FOTO: FOTO, RE_PRODUK: RE_PRODUK.source, dasar: DASAR, warna: T };
})(typeof window !== 'undefined' ? window : globalThis);
