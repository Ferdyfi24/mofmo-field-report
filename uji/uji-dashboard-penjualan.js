/* Uji dashboard penjualan yang "kayak error" (Ferdy, 12 Okt 2026 malam).
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Tiga hal yang membuat halaman penjualan terlihat rusak
 * padahal angkanya benar:
 *  - legenda grafik "Sold per month": server memberi lima warna berbeda (TGI
 *    #A0562C, Gamotion #00897B, MAA #B8860B, KIY #C2185B, Direct HO #3867D6),
 *    tapi peta warna Mofmo Soft melipat TGI dan MAA jadi satu coklat, Gamotion
 *    dan Direct HO jadi satu biru, jadi batangnya tidak bisa dibedakan;
 *  - SKU Performance di dalam shadow root #pdgSkuKotak membawa palet hitam
 *    papan lama (--kertas #181818), jadi kotak hitam di tengah tema coklat;
 *  - kartu Top SKU cuma menulis kode ("MF-KEY-019 with 10 pcs").
 * Yang diuji: hasil peta warna (lima warna seri tetap lima warna berbeda di
 * dua tema, tanpa mengubah warna netral dan peringatan yang sudah ada), aturan
 * CSS yang menang di shadow root SKU Performance, dan teks kartu Top SKU.
 */
const path = require('path');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
global.window = global; require(path.join(AKAR, 'wms/kulit.js'));
const K = global.KulitPapan;
let jalan = 0, gagal = 0; const DIHARAPKAN = 8;
const c = (n, ok, k) => { jalan++; if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + k)); };
function bagian(n, f) { try { f(); } catch (e) { gagal++; console.log('GAGAL ' + n + ' MATI -> ' + e.message); } }

const SERI = { TGI: '#A0562C', Gamotion: '#00897B', MAA: '#B8860B', KIY: '#C2185B', 'Direct HO': '#3867D6' };
bagian('A', () => {
  ['terang', 'gelap'].forEach((tema, i) => {
    const hasil = Object.keys(SERI).map(k => K.petaWarna(SERI[k], tema === 'gelap').toUpperCase());
    c('A' + (i + 1) + ' tema ' + tema + ': lima warna seri grafik tetap lima warna berbeda', new Set(hasil).size === 5, Object.keys(SERI).map((k, j) => k + '=' + hasil[j]).join(' '));
  });
  /* yang sudah benar tidak boleh ikut berubah: netral, coklat tinta, peringatan merah, hijau */
  const tetap = [['#FFFFFF', false, '#FFFFFF'], ['#2A2522', false, '#4A3426'], ['#E3DDD6', false, '#FCF1E4'], ['#C0392B', false, '#B4532A'], ['#1E6B4F', false, '#2F6B52'], ['#FFFFFF', true, '#352A22']];
  const salah = tetap.filter(([h, g, harap]) => K.petaWarna(h, g).toUpperCase() !== harap);
  c('A3 warna netral, tinta, peringatan merah, dan hijau tetap seperti sebelumnya', salah.length === 0, JSON.stringify(salah.map(([h, g]) => [h, g, K.petaWarna(h, g)])));
});

/* B. kaskade di shadow root SKU Performance: aturan terakhir yang mengenai pemilih menang */
function menang(css, pemilih, prop) {
  const re = /([^{}]+)\{([^{}]*)\}/g; let a, hasil = null;
  while ((a = re.exec(css))) { if (a[1].split(',').some(p => p.trim() === pemilih)) { const m = new RegExp('(?:^|;)\\s*' + prop.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+)').exec(a[2]); if (m) hasil = m[1].trim(); } }
  return hasil;
}
bagian('B', () => {
  /* gaya asli server (dipotong) lalu lembar kulit yang diadopsi sesudahnya */
  const server = ':host{display:block;--tua:#F2F2F2;--pasir:#1E1E1E;--garis:#3A3A3A;--kertas:#181818}.kartu .kk{background:#181818;border:1px solid var(--line)}';
  const css = server + K.cssBayang();
  const v = ['--tua', '--pasir', '--garis', '--kertas'].map(p => [p, menang(css, ':host(#pdgSkuKotak)', p)]);
  c('B1 :host(#pdgSkuKotak) menimpa empat variabel palet hitam dengan token Mofmo Soft (!important)', v.every(([, x]) => x && /var\(--l4-/.test(x) && /!important/.test(x)), JSON.stringify(v));
  const kk = menang(css, ':host(#pdgSkuKotak) .kk', 'background');
  const isi = menang(css, ':host(#pdgSkuKotak) .batangIsi', 'background');
  c('B2 kartu angka dan batang tidak lagi hitam/putih: .kk memakai kartu, .batangIsi memakai aksen', /var\(--l4-kartu\)/.test(kk || '') && /var\(--l4-aksen\)/.test(isi || ''), JSON.stringify({ kk, isi }));
  const lain = menang(css, ':host', '--kertas');
  c('B3 shadow root lain tidak ikut (tidak ada :host polos yang menimpa --kertas)', lain === '#181818', String(lain));
});

bagian('C', () => {
  const prod = [{ s: 'MF-KEY-019', n: 'MofmoFriends Key Ring - Tiger' }, { s: 'MF-PLU-010', n: 'MofmoFriends S - Netherland Dwarf' }];
  c('C1 Top SKU: kode diganti nama pendek dengan kodenya di kurung, sisa kalimat utuh', K.namaTopSku('MF-KEY-019 with 10 pcs, 28 SKU sold at least once', prod) === 'Key Ring - Tiger (MF-KEY-019) with 10 pcs, 28 SKU sold at least once', K.namaTopSku('MF-KEY-019 with 10 pcs, 28 SKU sold at least once', prod));
  c('C2 bahasa Indonesia ikut, kode tak dikenal dan teks lain dibiarkan', K.namaTopSku('MF-PLU-010 dengan 9 pcs', prod) === 'S - Netherland Dwarf (MF-PLU-010) dengan 9 pcs' && K.namaTopSku('MF-ZZZ-999 with 1 pcs', prod) === 'MF-ZZZ-999 with 1 pcs' && K.namaTopSku('TGI leads with 60% of value', prod) === 'TGI leads with 60% of value', 'gagal');
});
if (jalan !== DIHARAPKAN) { console.log('BAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
