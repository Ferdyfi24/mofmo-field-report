/* Uji tab Pasang kartu di menu Kitabku WMS (wms/kitabku.js), 16 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Kartu QR paket dicetak kosong dan baru berisi setelah
 * diikat ke No Pesanan Shopee. Jalur harian lewat kolom Kode Kartu QR di Excel
 * gudang; tab ini cadangannya dan tempat membetulkan salah pasang (Ferdy:
 * "dua-duanya"). Dipakai dengan scanner di meja packing: scanner mengetik isi
 * QR (alamat lengkap https://mofmofriends.id/#k=KODE) lalu Enter. Yang mahal
 * kalau salah: Enter dari scanner tidak memasang apa-apa sehingga petugas
 * mengira sudah; kartu dipindah ke pesanan lain tanpa sengaja (satu pembeli
 * kehilangan isinya); pesan tolak tidak menyebut pesanan atau kartu yang
 * bentrok sehingga petugas tidak bisa membetulkan; dan kode voucher terlihat
 * di layar gudang. Lembar dibuka di peramban sungguhan dengan app.css asli;
 * Edge Function dijawab inti.js yang sama dengan yang dipasang, basis data
 * tiruan, tiket WMS buatan crypto node. Tanpa jaringan, tanpa data nyata.
 */
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const SRV = process.env.KITAB_SERVER || '/home/claude/wms-supabase';
const { tangani } = await import(SRV + '/kitab/inti.js');
const { dbPalsu } = await import(SRV + '/kitab-tiruan.mjs');
const require = createRequire('/home/claude/fieldreport/uji/uji-wms-alat.js');
const { chromium } = require('playwright');

let gagal = 0, jalan = 0; const DIHARAPKAN = 15;
const c = (n, ok, k) => { jalan++; if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '\n   -> ' + String(k).replace(/\s*\n\s*/g, ' | ').slice(0, 500))); };
async function bagian(nama, fn) { console.log('\n=== ' + nama + ' ==='); try { await fn(); } catch (e) { gagal++; console.log('GAGAL ' + nama + ' MATI -> ' + (e && e.stack || e)); } }

/* ---------- fixture: event aktif, empat kartu paket, satu kartu per produk ---------- */
const RAHASIA = 'rahasia-uji-pasang-ui-0123456789abcdef0123', SIDIK = 'sidik-uji-pasang-ui-abcdefghijk';
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const tiketWms = (exp) => exp + '.' + b64url(createHmac('sha256', RAHASIA).update('wms|' + exp + '|' + SIDIK).digest());
const TIKET = tiketWms(Date.now() + 3600e3);
const db = dbPalsu();
db.st.akses = { rahasia: RAHASIA, sidik: SIDIK };
const adm = (isi) => tangani(Object.assign({ fn: 'admin', tiket: TIKET }, isi), db, Date.now(), {});
await adm({ aksi: 'acara', acara: { nama: '11.11 Big Sale', cap: '11.11', mulai: '2026-10-25', selesai: '2026-11-15' } });
const K = (await adm({ aksi: 'cetakPaket', jumlah: 4, voucherSampai: '2030-12-31', voucherKode: 'MOFMO11NOV', voucherTeks: 'Potongan Rp15.000' })).kode.map((x) => x.kode);
const LAMA = (await adm({ aksi: 'cetak', item: [{ kartu: '4582586962058', qty: 1 }] })).kode[0].kode;
const QR = (k) => 'https://mofmofriends.id/#k=' + k;
const tampil = (k) => k.slice(0, 4) + ' ' + k.slice(4, 8) + ' ' + k.slice(8);
const pesananDari = (k) => db.st.kode[k].pesanan || null;

/* 18 Okt: default ke repo tempat uji ini berada, bukan salinan lama /home/claude/fieldreport (dulu diam diam menguji kode lama) */
const AKAR = process.env.WMS_AKAR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/uji.html') { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return s.end('<!doctype html><html lang="id" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wms/app.css"></head><body><script>window.__wms = { S: { tiket: ' + JSON.stringify(TIKET) + ' }, bhs: function () { return "id"; }, Suara: {} };</script><script src="/wms/kitabku.js"></script></body></html>'); }
  const f = path.join(AKAR, u);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css' })[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, ok));
const URL0 = 'http://localhost:' + srv.address().port + '/uji.html';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const kiriman = [];
await ctx.route('**/functions/v1/kitab', async (route) => {
  const m = JSON.parse(route.request().postData() || 'null'); kiriman.push(m);
  const h = await tangani(m, db, Date.now(), { ip: '1.1.1.1' });
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL/.test(m.text())) errs.push(m.text()); });
const tunggu = (ms) => p.waitForTimeout(ms);
const hasil = () => p.evaluate(() => { const h = document.getElementById('kbPsHasil'); return h ? { teks: h.innerText, status: h.getAttribute('data-ps-status') || '' } : { teks: '', status: '' }; });
/* scanner = ketik cepat lalu Enter, persis seperti alat scan USB/Bluetooth */
const scan = async (sel, isi) => { await p.click(sel); await p.keyboard.type(isi, { delay: 2 }); await p.keyboard.press('Enter'); };

await bagian('A. tab dan scan normal', async () => {
  await p.goto(URL0);
  await p.evaluate(() => WmsKitabku.buka('pasang')); await tunggu(500);
  const ada = await p.evaluate(() => ({ tab: !!document.querySelector('[data-kbtab=pasang][aria-selected=true]'), p: !!document.getElementById('kbPsPesanan'), k: !!document.getElementById('kbPsKartu'), fokus: document.activeElement && document.activeElement.id }));
  c('A1 tab Pasang kartu terbuka dengan isian No Pesanan dan Kode kartu, kursor langsung di No Pesanan', ada.tab && ada.p && ada.k && ada.fokus === 'kbPsPesanan', JSON.stringify(ada));
  await scan('#kbPsPesanan', '261105AAAA01');
  const f = await p.evaluate(() => document.activeElement && document.activeElement.id);
  c('A2 Enter dari scanner di No Pesanan memindah kursor ke Kode kartu, belum mengirim apa-apa', f === 'kbPsKartu' && kiriman.filter((m) => m.aksi === 'pasangKartu').length === 0, f);
  await p.keyboard.type(QR(K[0]), { delay: 2 }); await p.keyboard.press('Enter'); await tunggu(500);
  const h = await hasil();
  c('A3 Enter dari scanner di Kode kartu memasang kartu ke pesanan (hasil scan alamat lengkap terbaca)', pesananDari(K[0]) === '261105AAAA01' && h.status === 'ok' && h.teks.includes(tampil(K[0])) && h.teks.includes('261105AAAA01'), JSON.stringify(h));
  const sesudah = await p.evaluate(() => ({ p: document.getElementById('kbPsPesanan').value, k: document.getElementById('kbPsKartu').value, fokus: document.activeElement.id, log: (document.getElementById('kbPsLog') || {}).innerText || '' }));
  c('A4 sesudah terpasang: dua isian kosong lagi, kursor kembali ke No Pesanan, tercatat di daftar tadi', sesudah.p === '' && sesudah.k === '' && sesudah.fokus === 'kbPsPesanan' && sesudah.log.includes('261105AAAA01') && sesudah.log.includes(tampil(K[0])), JSON.stringify(sesudah));
  const kirim = kiriman.filter((m) => m.aksi === 'pasangKartu');
  c('A5 dari layar scan, ganti tidak pernah dikirim tanpa konfirmasi', kirim.length === 1 && kirim[0].ganti !== true, JSON.stringify(kirim));
});

await bagian('B. bentrok dan pembetulan', async () => {
  await scan('#kbPsPesanan', '261105AAAA02'); await p.keyboard.type(QR(K[0]), { delay: 2 }); await p.keyboard.press('Enter'); await tunggu(500);
  let h = await hasil();
  c('B1 kartu yang sudah di pesanan lain: ditolak, menyebut pesanan lamanya, tidak ada yang berubah', h.status === 'lain' && h.teks.includes('261105AAAA01') && pesananDari(K[0]) === '261105AAAA01', JSON.stringify(h));
  await p.click('#kbPsHasil [data-kb=pasangGanti]'); await tunggu(500);
  h = await hasil();
  c('B2 tombol pindah (setelah dikonfirmasi petugas): kartu pindah ke pesanan yang benar', pesananDari(K[0]) === '261105AAAA02' && h.status === 'ok' && kiriman.filter((m) => m.aksi === 'pasangKartu').pop().ganti === true, JSON.stringify([h, pesananDari(K[0])]));
  await scan('#kbPsPesanan', '261105AAAA02'); await p.keyboard.type(K[1].toLowerCase(), { delay: 2 }); await p.keyboard.press('Enter'); await tunggu(500);
  h = await hasil();
  c('B3 pesanan yang sudah punya kartu: kartu kedua ditolak, menyebut kartu lamanya', h.status === 'penuh' && h.teks.includes(tampil(K[0])) && !pesananDari(K[1]), JSON.stringify(h));
  await p.click('#kbPsHasil [data-kb=pasangGanti]'); await tunggu(500);
  c('B4 tombol ganti: kartu baru masuk, kartu lama lepas dan bisa dipakai lagi', pesananDari(K[1]) === '261105AAAA02' && !pesananDari(K[0]), JSON.stringify([pesananDari(K[0]), pesananDari(K[1])]));
  await scan('#kbPsPesanan', '261105AAAA03'); await p.keyboard.type(QR(LAMA), { delay: 2 }); await p.keyboard.press('Enter'); await tunggu(500);
  const hLama = await hasil();
  await scan('#kbPsPesanan', '261105AAAA03'); await p.keyboard.type(QR('ZZZZZZZZZZ'), { delay: 2 }); await p.keyboard.press('Enter'); await tunggu(500);
  const hAsing = await hasil();
  const terakhir = kiriman.filter((m) => m.aksi === 'pasangKartu').pop().item[0];
  c('B5 kartu per produk dan kode asing ditolak dengan kalimat yang bisa dimengerti petugas, tanpa tombol pindah; scan berikutnya menimpa isi lama, tidak menyambung', hLama.status === 'bukan' && /per produk/i.test(hLama.teks) && hAsing.status === 'tidak' && /tidak dikenal/i.test(hAsing.teks) &&
    !(await p.$('#kbPsHasil [data-kb=pasangGanti]')) && terakhir.pesanan === '261105AAAA03' && terakhir.kode === QR('ZZZZZZZZZZ'), JSON.stringify([hLama, hAsing, terakhir]));
});

await bagian('C. cek kartu tanpa No Pesanan', async () => {
  await p.fill('#kbPsPesanan', ''); await scan('#kbPsKartu', QR(K[1])); await tunggu(500);
  const h = await hasil();
  c('C1 kartu discan tanpa No Pesanan: cuma dicek, menyebut pesanannya, tidak memasang apa-apa', h.status === 'cek' && h.teks.includes('261105AAAA02') && kiriman.slice(-1)[0].aksi === 'cekKartu', JSON.stringify(h));
  await scan('#kbPsKartu', QR(K[2])); await tunggu(500);
  const h2 = await hasil();
  c('C2 kartu kosong: dibilang belum terpasang', h2.status === 'cek' && /belum terpasang/i.test(h2.teks), JSON.stringify(h2));
});

await bagian('D. layar HP dan kebersihan', async () => {
  const semua = await p.evaluate(() => document.getElementById('kitabkuAdmin').innerText);
  c('D1 kode voucher tidak pernah tampil di layar gudang', !semua.includes('MOFMO11NOV'));
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => { WmsKitabku.tutup(); WmsKitabku.buka('pasang'); }); await tunggu(400);
  const hp = await p.evaluate(() => {
    const l = document.querySelector('#kitabkuAdmin .lembar'), a = document.getElementById('kbPsPesanan').getBoundingClientRect(), k = document.getElementById('kbPsKartu').getBoundingClientRect();
    const t = document.querySelector('[data-kbtab=pasang]').getBoundingClientRect();
    return { lebar: l.scrollWidth <= l.clientWidth + 1, tinggi: Math.min(a.height, k.height), dalam: a.right <= innerWidth && k.right <= innerWidth, tab: t.left >= 0 && t.right <= innerWidth };
  });
  c('D2 HP 390 px: tanpa geser samping, isian setinggi jari (minimal 40 px), tab yang aktif kelihatan', hp.lebar && hp.tinggi >= 40 && hp.dalam && hp.tab, JSON.stringify(hp));
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/kb-pasang-hp.png' });
  await p.setViewportSize({ width: 1280, height: 900 }); await tunggu(200);
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/734637d7-4ef4-5392-8862-4843ea5b65c8/scratchpad/kb-pasang-laptop.png' });
  c('D3 tanpa galat halaman', errs.length === 0, errs.join(' | '));
});

await b.close(); srv.close();
if (jalan !== DIHARAPKAN) { console.log('\nBAHAYA: ' + jalan + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN + '. Uji mati di tengah jalan.'); gagal++; }
console.log('\n' + jalan + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
process.exit(gagal ? 1 : 0);
