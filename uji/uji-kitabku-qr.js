/* Uji QR kartu Kitabku (wms/kitabku.js), 10 Okt 2026.
 * Harapan: "10 pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Kartu QR diselipkan di paket Shopee dan dipindai
 * pembeli dengan kamera HP. Kalau QR-nya cacat satu modul saja, pembeli
 * yang sudah bayar tidak bisa membuka kartunya, dan kita baru tahu setelah
 * ratusan kartu dicetak. Pembuat QR ditulis sendiri (tanpa pustaka luar),
 * jadi diperiksa dengan dekoder sungguhan (zxing-cpp), bukan dengan tabel
 * yang sama dengan yang dipakai pembuatnya.
 */
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
global.window = {};
eval(fs.readFileSync('/home/claude/fieldreport/wms/kitabku.js', 'utf8'));
const K = window.WmsKitabku;

let gagal = 0, jalan = 0; const DIHARAPKAN = 10;
const c = (n, ok, k) => { jalan++; if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + k)); };

function baca(m) {
  /* matriks -> PNG 8 px per modul dengan zona tenang 4 modul, lalu zxing */
  const n = m.length, s = 8, q = 4, w = (n + 2 * q) * s;
  const f = path.join(os.tmpdir(), 'qr-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(f, JSON.stringify(m));
  const py = 'import sys,json,zxingcpp\nfrom PIL import Image\nm=json.load(open(sys.argv[1]));n=len(m);s=8;q=4;w=(n+2*q)*s\nim=Image.new("L",(w,w),255)\npx=im.load()\nfor y in range(n):\n  for x in range(n):\n    if m[y][x]:\n      for dy in range(s):\n        for dx in range(s): px[(x+q)*s+dx,(y+q)*s+dy]=0\nr=zxingcpp.read_barcodes(im)\nprint(r[0].text if r else "")';
  try { return execFileSync('python3', ['-c', py, f]).toString().replace(/\n$/, ''); } finally { fs.unlinkSync(f); }
}

const URL0 = 'https://mofmofriends-kitab.pages.dev/#k=';
const kode = ['ABCDEFGHJK', 'QRSTUVWXYZ', '2345678923', 'MNPQRSTABC'];
kode.forEach((k, i) => {
  const m = K.qrMatriks(URL0 + k);
  c('Q' + (i + 1) + ' alamat kartu ' + k + ' terbaca zxing persis', baca(m) === URL0 + k, baca(m));
});
const m1 = K.qrMatriks(URL0 + 'ABCDEFGHJK');
c('Q5 alamat kartu muat di versi 4 (33 x 33), cukup besar di kartu 85 x 55 mm', m1.length === 33, m1.length);
const pendek = K.qrMatriks('MOF');
c('Q6 teks pendek terbaca (versi 1)', pendek.length === 21 && baca(pendek) === 'MOF', pendek.length + ' ' + baca(pendek));
const panjang = 'https://mofmofriends-kitab.pages.dev/?utm_source=paket&utm_medium=kartu#k=ABCDEFGHJK';
const mp = K.qrMatriks(panjang);
c('Q7 teks lebih panjang naik versi dan tetap terbaca', mp.length > 33 && baca(mp) === panjang, mp.length + ' ' + baca(mp));
const svg = K.qrSvg(URL0 + 'ABCDEFGHJK');
c('Q8 SVG memakai jalur tunggal, latar putih, zona tenang 4 modul', /^<svg[^>]+viewBox="0 0 41 41"/.test(svg) && (svg.match(/<path/g) || []).length === 1 && /fill="#fff"/.test(svg), svg.slice(0, 120));

/* zxing memaafkan banyak cacat (bit format tanpa topeng, pola pencari tertimpa), kamera HP
   murah tidak. Dua pemeriksaan bentuk ini memakai tabel dari standar, bukan dari pembuatnya. */
const FORMAT_M = ['101010000010010', '101000100100101', '101111001111100', '101101101001011', '100010111111001', '100000011001110', '100111110010111', '100101010100000'];
{
  const n = m1.length; let b = '';
  for (let i = 14; i >= 0; i--) b += i < 8 ? m1[8][n - 1 - i] : m1[n - 15 + i][8];
  let b2 = '';
  const atas = (i) => (i <= 5 ? m1[i][8] : i === 6 ? m1[7][8] : i === 7 ? m1[8][8] : i === 8 ? m1[8][7] : m1[8][14 - i]);
  for (let i = 14; i >= 0; i--) b2 += atas(i);
  c('Q9 bit format = salah satu baris tabel koreksi M dari standar, dua salinannya sama', FORMAT_M.includes(b) && b === b2, b + ' / ' + b2);
}
{
  const n = m1.length, pola = (x0, y0) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const d = Math.max(Math.abs(x - 3), Math.abs(y - 3)); if (m1[y0 + y][x0 + x] !== (d === 2 ? 0 : 1)) return false; } return true; };
  let al = true; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (m1[26 + y][26 + x] !== (Math.max(Math.abs(x), Math.abs(y)) === 1 ? 0 : 1)) al = false;
  const sepi = [0, 1, 2, 3, 4, 5, 6, 7].every((i) => m1[7][i] === 0 && m1[i][7] === 0 && m1[7][n - 1 - i] === 0 && m1[n - 8][i] === 0);
  c('Q10 tiga pola pencari utuh dengan pemisah putih, pola penjajar versi 4 di (26,26)', pola(0, 0) && pola(n - 7, 0) && pola(0, n - 7) && sepi && al, [pola(0, 0), pola(n - 7, 0), pola(0, n - 7), sepi, al].join(','));
}
if (jalan !== DIHARAPKAN) { console.log('BAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
