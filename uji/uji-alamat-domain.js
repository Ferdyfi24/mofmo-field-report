/* Uji alamat domain mofmofriends.id (15 Okt 2026).
 * Harapan: "7 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Repo pindah ke org mofmofriends-id, dan project Pages
 * lama (mofmo-wms, mofmo-lapangan) berhenti menerima versi baru karena
 * Cloudflare tidak bisa memindahkan sambungan Git ke repo yang dipindah.
 * WMS dan aplikasi lapangan sekarang hidup di wms.mofmofriends.id dan
 * lapangan.mofmofriends.id, Kitab di mofmofriends.id. Alamat pages.dev lama
 * tetap bisa dibuka tapi isinya beku di versi 13 Okt. Yang paling mahal kalau
 * terlewat:
 *  - QR kartu Kitabku masih menunjuk alamat lama. Kartu sudah tercetak dan
 *    terselip di paket, tidak bisa ditarik lagi (cetak kartu 19 Okt).
 *  - Tautan aplikasi lapangan di halaman masuk WMS membawa Operational PIC ke
 *    aplikasi beku, jadi perbaikan berikutnya tidak pernah sampai ke HP-nya.
 *  - Pengalih dari alamat GitHub lama mengirim orang ke alamat beku.
 * QR dibaca dengan dekoder sungguhan (zxing-cpp), bukan dibandingkan string.
 */
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const REPO = path.join(__dirname, '..');
const baca = f => fs.readFileSync(path.join(REPO, f), 'utf8');

let gagal = 0, jalan = 0; const DIHARAPKAN = 7;
const c = (n, ok, k) => { jalan++; if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + k)); };

function bacaQr(m) {
  const f = path.join(os.tmpdir(), 'qr-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(f, JSON.stringify(m));
  const py = 'import sys,json,zxingcpp\nfrom PIL import Image\nm=json.load(open(sys.argv[1]));n=len(m);s=8;q=4;w=(n+2*q)*s\nim=Image.new("L",(w,w),255)\npx=im.load()\nfor y in range(n):\n  for x in range(n):\n    if m[y][x]:\n      for dy in range(s):\n        for dx in range(s): px[(x+q)*s+dx,(y+q)*s+dy]=0\nr=zxingcpp.read_barcodes(im)\nprint(r[0].text if r else "")';
  try { return execFileSync('python3', ['-c', py, f]).toString().replace(/\n$/, ''); } finally { fs.unlinkSync(f); }
}

/* ---------- Kitabku: QR di kartu cetak ---------- */
const srcKitab = baca('wms/kitabku.js');
global.window = {};
eval(srcKitab);
const K = window.WmsKitabku;
/* alamat yang benar-benar dipakai htmlKartuCetak: qrSvg(SITUS + r.kode) */
const situs = (srcKitab.match(/var SITUS = '([^']+)'/) || [])[1] || '';
const m = K.qrMatriks(situs + 'ABCDEFGHJK');
const hasil = bacaQr(m);
c('A1 QR kartu Kitabku terbaca sebagai https://mofmofriends.id/#k=KODE', hasil === 'https://mofmofriends.id/#k=ABCDEFGHJK', hasil);
/* Alamat baru lebih pendek, jadi QR turun ke versi 3 (29 x 29): modulnya lebih besar
   di kotak yang sama, lebih mudah dipindai. Syaratnya cuma tidak lebih besar dari versi 4. */
c('A2 QR muat paling besar versi 4 (33 x 33) untuk kartu 85 x 55 mm', m.length >= 21 && m.length <= 33, m.length);
const ketik = (srcKitab.match(/atauKetik: '([^']+)'/g) || []);
c('A3 tulisan "ketik kodenya di" (en dan id) menyebut mofmofriends.id, bukan pages.dev',
  ketik.length === 2 && ketik.every(s => /mofmofriends\.id'$/.test(s) && !/pages\.dev/.test(s)), ketik.join(' | '));

/* ---------- WMS: tautan aplikasi lapangan di halaman masuk ---------- */
const srcApp = baca('wms/app.js');
const lap = (srcApp.match(/var APP_LAPANGAN = '([^']+)'/) || [])[1] || '';
c('B1 tautan aplikasi lapangan di halaman masuk WMS ke https://lapangan.mofmofriends.id/lapangan/', lap === 'https://lapangan.mofmofriends.id/lapangan/', lap);
const tampil = (srcApp.match(/'<a href="' \+ APP_LAPANGAN \+ '">([^<]+)<\/a>/) || [])[1] || '';
c('B2 teks tautan yang dibaca orang sama dengan tujuannya', tampil === 'lapangan.mofmofriends.id/lapangan', tampil);

/* ---------- Pengalih alamat GitHub lama ---------- */
const tujuan = f => (baca(f).match(/l\.replace\("([^"]+)"/) || [])[1] || '';
c('C1 pengalih GitHub lama di halaman laporan (index.html) ke lapangan.mofmofriends.id', tujuan('index.html') === 'https://lapangan.mofmofriends.id', tujuan('index.html'));
c('C2 pengalih GitHub lama di aplikasi lapangan (lapangan/index.html) ke lapangan.mofmofriends.id', tujuan('lapangan/index.html') === 'https://lapangan.mofmofriends.id', tujuan('lapangan/index.html'));

if (jalan !== DIHARAPKAN) { console.log('BAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
