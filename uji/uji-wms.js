/* Uji WMS (wms/, 10 Okt 2026 siang). Harapan: "24 pemeriksaan, SEMUA LULUS".
 * Chromium sungguhan, halaman dilayani dari localhost, Apps Script palsu
 * (aksi 'wms'), Supabase palsu (mati, kosong, hidup), AudioContext palsu.
 *
 * KENAPA UJI INI ADA. Versi pagi WMS baru menghitung angka sendiri dari baris
 * buku besar. Ferdy membandingkannya dengan papan lama: "datanya ko ga
 * mirip, fiturnya blm semua jga". Sekarang isi WMS = papan lama itu sendiri
 * yang dijalankan di bingkai dengan kulit L4. Yang dijaga di sini:
 *  - masuk L4 (papan dok, boneka, kode tidak pernah tersimpan);
 *  - papan lama benar-benar jalan, masuk sendiri dengan kata pengganti, dan
 *    membaca dari potret Supabase dengan kunci yang sama dengan cermin;
 *  - tulisan lewat Apps Script dengan tiket, bacaan sesudahnya tidak dari
 *    potret lama;
 *  - kulit: warna papan dan warna HTML kiriman server dipetakan ke L4, juga
 *    di dalam shadow root;
 *  - tautan keluar tidak menimpa WMS;
 *  - keluar (dari WMS atau dari papan) kembali ke halaman masuk.
 * Papan lama di sini palsu, dibuat meniru bagian yang dipakai saja:
 * #layarKode, #layarIsi, header, nav#panel, buka() yang membaca #kode.
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const AKAR = '/home/claude/fieldreport';
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const KODE_BENAR = 'KODE-PALSU-UJI';
const DIHARAPKAN = 24;
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(AKAR, p);
  if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
  s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
});

/* ---------- papan lama palsu ----------
   Warna tetapnya warna papan lama asli: #945200 coklat (jadi hitam),
   #FBF8F0 kertas (jadi putih), #b3261e merah (jadi oren). */
const PAPAN_PALSU = '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Papan</title>' +
  '<style>:root{--coklat:#945200;--kertas:#FBF8F0}body{background:var(--kertas);font-family:ISans,Arial,sans-serif}#layarIsi{display:none}' +
  '.judulCoklat{color:#945200}.kartuMerah{background:#b3261e;color:#fff}h1{font-family:Gloock,Georgia,serif}</style></head><body>' +
  '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
  '<div id="layarIsi"><header><div class="gbrLogo"><img alt=""></div><div><h1>Papan Data</h1><p id="subJudul">12 bulan</p></div><div id="kopKanan"></div></header>' +
  '<nav id="panel"><a class="on" href="#" id="navRingkas">Ringkasan</a><a href="' + API.replace('AKfycbzslW9', 'AKfycbLAMA') + '?harian=1" id="navLuar">Ringkasan Harian</a><a href="' + API + '?lihat=1" id="navDiri">Papan</a></nav>' +
  '<div class="judulCoklat" id="judulCoklat">Ringkasan</div><div class="kartuMerah" id="kartuMerah">Belum kirim</div><div id="isi"></div><div id="hasil"></div><button id="keluarPapan" onclick="keluarPapan()">Keluar papan</button></div>' +
  '<script>var KODE="";' +
  /* sebelum masuk selesai papan lama sudah meminta Ringkasan dengan kode kosong */
  'google.script.run.withSuccessHandler(function(r){window.__awal=r;}).papanSummary("","12b");' +
  'function buka(){var k=document.getElementById("kode").value;KODE=k;window.__k=k;' +
  'google.script.run.withSuccessHandler(function(r){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";document.getElementById("hasil").textContent="MASUK "+r.prod.length;window.__siap=1;muatHalaman();}).withFailureHandler(function(e){window.__gagal=e.message;}).dataPapan(k);}' +
  'function muatHalaman(){var w=document.createElement("div");w.id="smrKotak";document.getElementById("isi").appendChild(w);var akar=w.attachShadow({mode:"open"});' +
  'google.script.run.withSuccessHandler(function(h){akar.innerHTML=h.html;window.__smr=1;}).papanSummary(KODE,"12b");' +
  'google.script.run.withSuccessHandler(function(s){window.__skrip=s;}).pdgSkripTunda("gudang");}' +
  'function tulis(){google.script.run.withSuccessHandler(function(r){window.__tulis=r;google.script.run.withSuccessHandler(function(x){window.__baca2=x;}).papanInventory(KODE,"12b");}).withFailureHandler(function(e){window.__gagal=e.message;}).simpanOpname(KODE,{lok:"A-01-1",qty:3});}' +
  'function keluarPapan(){KODE="";document.getElementById("layarIsi").style.display="none";document.getElementById("layarKode").style.display="block";}' +
  '<\/script></body></html>';
const DATA = { ok: true, lok: [{ k: 'HO' }], prod: [{ b: '1' }, { b: '2' }, { b: '3' }], baris: [] };
const SUMMARY = { ok: true, html: '<style>.angkaMerah{color:#b3261e}</style><h2 id="judulSmr">Ringkasan</h2><b class="angkaMerah" id="angkaMerah">Rp16.700.902</b> <span>PO #123</span>' };

const AUDIO_PALSU = () => {
  window.__nada = []; window.__getar = []; window.__buka = [];
  function Osc() { this.type = 'sine'; var self = this; this.frequency = { setValueAtTime: function (f) { self.f = f; }, exponentialRampToValueAtTime: function () {} }; }
  Osc.prototype.connect = function () {}; Osc.prototype.start = function () { window.__nada.push(this.f); }; Osc.prototype.stop = function () {};
  function Ctx() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  Ctx.prototype.createOscillator = function () { return new Osc(); };
  Ctx.prototype.createGain = function () { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  Ctx.prototype.resume = function () {};
  window.AudioContext = Ctx; window.webkitAudioContext = Ctx;
  try { Object.defineProperty(navigator, 'vibrate', { value: function (p) { window.__getar.push(p); return true; }, configurable: true }); } catch (e) {}
  window.open = function (u) { window.__buka.push(String(u)); return null; };
};

(async () => {
  await new Promise(r => srv.listen(8766, r));
  const URL0 = 'http://localhost:8766/wms/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const S = { badan: [], supaBadan: [], supa: 'mati', serverLama: false, perluMasuk: false, papanAda: true };
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(AUDIO_PALSU);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(API + '**', async r => {
    let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    S.badan.push(m);
    let h;
    if (S.serverLama) h = { ok: false, pesan: 'Kunci pintu salah.' };
    else if (m.aksi !== 'wms') h = { pintu: 'galat', pesan: 'bukan wms' };
    else if (m.fn === 'masuk') h = { pintu: 'ok', hasil: String(m.kode || '').trim().toUpperCase() === KODE_BENAR ? { ok: true, tiket: 'TIKET.' + (m.ingat ? 'INGAT' : 'SESI'), ingat: !!m.ingat } : { ok: false, pesan: 'That access code is not right.' } };
    else if (!/^TIKET\./.test(m.tiket || '') || S.perluMasuk) h = { pintu: 'ok', hasil: { ok: false, perluMasuk: true } };
    else if (m.fn === 'panggil') h = m.nama === 'simpanOpname' ? { pintu: 'ok', hasil: { ok: true, tersimpan: 1 } }
      : m.nama === 'papanInventory' ? { pintu: 'ok', hasil: { ok: true, dari: 'gas' } }
      : m.nama === 'dataPapan' ? { pintu: 'ok', hasil: DATA }
      : m.nama === 'papanSummary' ? { pintu: 'ok', hasil: SUMMARY }
      : m.nama === 'pdgSkripTunda' ? { pintu: 'ok', hasil: 'skrip-dari-gas' }
      : { pintu: 'galat', pesan: 'Fungsi "' + m.nama + '" tidak dibuka untuk WMS.' };
    else h = { pintu: 'galat', pesan: 'Fungsi "' + m.fn + '" tidak dibuka untuk WMS.' };
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
  });
  const POTRET = () => {
    const w = new Date(Date.now() - 3 * 60000).toISOString();
    const o = { 'dataPapan|["K"]': DATA, 'papanSummary|["K","12b"]': SUMMARY, 'papanInventory|["K","12b"]': { ok: true, dari: 'supa' }, 'pdgSkripTunda|["gudang"]': 'skrip-dari-supa' };
    if (S.papanAda) o['klien|papan'] = { ok: true, versi: 'uji', html: PAPAN_PALSU };
    const r = {}; Object.keys(o).forEach(k => { r[k] = { waktu: w, data: o[k] }; }); return r;
  };
  await ctx.route(SUPA, async r => {
    let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    S.supaBadan.push(m);
    if (S.supa === 'mati') return r.abort();
    let h;
    if (S.supa === 'kosong') h = m.fn === 'masuk' ? { ok: false, pesan: 'The new WMS is not connected to the board yet.' } : { ok: false, perluMasuk: true };
    else if (m.fn === 'masuk') h = String(m.kode || '').trim().toUpperCase() === KODE_BENAR ? { ok: true, tiket: 'TIKET.SUPA', ingat: !!m.ingat } : { ok: false, pesan: 'That access code is not right.' };
    else if (m.fn === 'ambil') {
      if (!/^TIKET\./.test(m.tiket || '')) h = { ok: false, perluMasuk: true };
      else { const P = POTRET(), isi = {}; (m.kunci || []).forEach(k => { if (P[k]) isi[k] = P[k]; }); h = { ok: true, isi }; }
    } else h = { ok: false, pesan: 'Unknown request.' };
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h) });
  });
  const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
  const galatHalaman = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => galatHalaman.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) galatHalaman.push(m.text()); });
  const tunggu = (fn, arg, ms) => p.waitForFunction(fn, arg, { timeout: ms || 6000 }).catch(() => {});
  const nada = () => p.evaluate(() => window.__nada.splice(0));
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const bingkai = () => p.frames().find(f => f !== p.mainFrame());
  const diBingkai = async (fn, arg) => { const f = bingkai(); return f ? f.evaluate(fn, arg) : null; };
  const tungguBingkai = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 8000)) { try { const f = bingkai(); if (f && await f.evaluate(fn)) return true; } catch (e) {} await jeda(100); } return false; };
  const foto = async n => { if (process.env.FOTO) { await jeda(800); await p.screenshot({ path: path.join(process.env.FOTO, n + '.png') }); } };

  try {
    /* ---------- masuk ---------- */
    await p.goto(URL0);
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'light'); localStorage.setItem('wms_bhs', 'en'); });
    await p.reload();
    await tunggu(() => document.getElementById('formMasuk'));
    c('W1 tanpa tiket yang tampil halaman masuk, dan belum ada bacaan apa pun', await p.$('#formMasuk') && !S.supaBadan.some(x => x.fn === 'ambil') && !S.badan.some(x => x.fn === 'panggil'), JSON.stringify(S.badan.map(x => x.fn)));
    const papan1 = await p.evaluate(() => ({ baris: Array.prototype.map.call(document.querySelectorAll('.papan .papan-baris'), b => ({ n: b.querySelectorAll('.keping').length, t: b.innerText.replace(/\s+/g, '') })),
      gel: document.getElementById('gelembung').textContent, kardus: document.querySelectorAll('.konveyor .kardus svg.boneka').length, maskot: !!document.querySelector('#maskot svg .kedip') }));
    await jeda(2750);
    const papan2 = await p.evaluate(() => document.querySelector('#barisTahap').innerText.replace(/\s+/g, ''));
    c('W2 papan dok 3 x 14 keping berputar PICKING -> PACKING, boneka berkedip menyapa, 3 kardus berboneka',
      papan1.baris.length === 3 && papan1.baris.every(x => x.n === 14) && papan1.baris[2].t === '>PICKING' && papan2 === '>PACKING' && papan1.gel === 'MOF! CODE, PLEASE' && papan1.maskot && papan1.kardus === 3, JSON.stringify([papan1, papan2]));
    await foto('01-masuk');
    S.serverLama = true;
    await p.fill('#kode', 'apa-saja'); await p.click('#tMasuk');
    await tunggu(() => document.getElementById('galatMasuk').textContent);
    const lama = await p.evaluate(() => document.getElementById('galatMasuk').textContent);
    c('W3 Supabase mati dan server papan versi lama: pesannya "belum diperbarui", bukan "kode salah"', /not updated for the new WMS/.test(lama) && !/not right/.test(lama), lama);
    S.serverLama = false;
    await p.fill('#kode', 'salah'); await nada(); await p.click('#tMasuk');
    await tunggu(() => /not right/.test(document.getElementById('galatMasuk').textContent));
    const salah = await p.evaluate(() => ({ g: document.getElementById('galatMasuk').textContent, ls: JSON.stringify(localStorage), ss: JSON.stringify(sessionStorage), k: document.getElementById('maskot').className, mata: !!document.querySelector('#maskot path[d^="M39 58"]') }));
    const nSalah = await nada();
    c('W4 kode salah: pesan tampil, boneka geleng dengan mata > <, bunyi tolak 220 lalu 185 Hz, tidak ada tiket', /not right/.test(salah.g) && /gelengKepala/.test(salah.k) && salah.mata && nSalah.indexOf(185) > nSalah.indexOf(220) && nSalah.indexOf(220) > -1 && !/wms_tiket/.test(salah.ls + salah.ss), JSON.stringify(salah) + nSalah);
    S.supa = 'hidup';
    await p.fill('#kode', ' kode-palsu-uji '); await p.click('#tMasuk');
    await tunggu(() => document.querySelector('#capMasuk .cap'));
    const senang = await p.evaluate(() => ({ cap: (document.querySelector('#capMasuk .cap') || {}).textContent, k: (document.getElementById('maskot') || {}).className }));
    c('W5 kode benar: cap CHECKED dan boneka melompat', senang.cap === 'CHECKED' && /lompat/.test(senang.k), JSON.stringify(senang));
    await tunggu(() => document.getElementById('tiraiPapan'), null, 4000);
    const tirai = await p.evaluate(() => ({ ada: !!document.getElementById('tiraiPapan'), boneka: !!document.querySelector('#tiraiPapan .maskot-muat svg'), teks: (document.getElementById('tiraiPapan') || {}).innerText }));
    c('W6 sesudah masuk: tirai muat L4 (boneka + papan dok kecil) tampil sambil papan dimuat', tirai.ada && tirai.boneka && /LOADING>THELEDGER/.test(String(tirai.teks || '').replace(/\s+/g, '')), JSON.stringify(tirai));
    await foto('02-tirai-muat');
    const masukOk = await tungguBingkai(() => window.__siap === 1 && window.__smr === 1, 8000);
    await tunggu(() => !document.getElementById('tiraiPapan'), null, 4000);
    const st = await p.evaluate(() => ({ ss: JSON.stringify(sessionStorage), ls: JSON.stringify(localStorage), href: location.href, tirai: !!document.getElementById('tiraiPapan') }));
    const k1 = await diBingkai(() => ({ k: window.__k, hasil: document.getElementById('hasil').textContent, layarKode: getComputedStyle(document.getElementById('layarKode')).display }));
    c('W7 papan lama jalan di bingkai, masuk sendiri dengan kata pengganti WMS-TIKET, layar kodenya tersembunyi, tirai pergi',
      masukOk && k1.k === 'WMS-TIKET' && k1.hasil === 'MASUK 3' && k1.layarKode === 'none' && !st.tirai, JSON.stringify(k1));
    c('W8 kode akses tidak pernah ada di alamat, localStorage, atau sessionStorage; tiket sesi saja', !/kode-palsu/i.test(st.href + st.ls + st.ss) && /TIKET\.SUPA/.test(st.ss) && !/TIKET/.test(st.ls), st.href);
    const pg = S.badan.filter(x => x.fn === 'panggil');
    const awal = await diBingkai(() => window.__awal && window.__awal.html ? 'ada' : String(window.__awal));
    c('W9 bacaan dari potret Supabase (dataPapan, papanSummary, pdgSkripTunda), termasuk Ringkasan yang diminta dengan kode kosong; nol panggilan Apps Script',
      pg.length === 0 && awal === 'ada' && (await diBingkai(() => window.__skrip)) === 'skrip-dari-supa' &&
      S.supaBadan.some(x => x.fn === 'ambil' && (x.kunci || [])[0] === 'papanSummary|["K","12b"]'),
      JSON.stringify({ pg: pg.map(x => x.nama), awal, ambil: S.supaBadan.filter(x => x.fn === 'ambil').map(x => x.kunci[0]) }));
    await foto('03-papan');

    /* ---------- kulit ---------- */
    const kulit = await diBingkai(() => {
      const gs = e => getComputedStyle(e);
      const akar = document.getElementById('smrKotak').shadowRoot;
      return { body: gs(document.body).backgroundColor, coklat: gs(document.getElementById('judulCoklat')).color, merah: gs(document.getElementById('kartuMerah')).backgroundColor,
        angka: gs(akar.getElementById('angkaMerah')).color, po: akar.innerHTML.indexOf('PO #123') > -1, adopsi: akar.adoptedStyleSheets.length,
        h1: gs(document.querySelector('h1')).fontFamily, nav: gs(document.getElementById('navRingkas')).backgroundColor, logo: getComputedStyle(document.querySelector('.gbrLogo'), '::after').content };
    });
    c('W10 kulit L4: coklat jadi hitam, kertas jadi putih, merah jadi oren, menu aktif oren, logo M', kulit.coklat === 'rgb(18, 18, 18)' && kulit.body === 'rgb(255, 255, 255)' && kulit.merah === 'rgb(242, 100, 25)' && kulit.nav === 'rgb(242, 100, 25)' && kulit.logo === '"M"', JSON.stringify(kulit));
    c('W11 HTML kiriman server di dalam shadow root ikut diwarnai ulang dan dapat lembar kulit; "PO #123" tidak tersentuh', kulit.angka === 'rgb(242, 100, 25)' && kulit.adopsi === 1 && kulit.po, JSON.stringify(kulit));
    c('W12 huruf judul Archivo, bukan Gloock', /Archivo/.test(kulit.h1) && !/Gloock/.test(kulit.h1), kulit.h1);

    /* ---------- tulis ---------- */
    await diBingkai(() => tulis());
    await tungguBingkai(() => !!window.__baca2, 6000);
    const tl = await diBingkai(() => ({ tulis: window.__tulis, baca2: window.__baca2 }));
    const pTulis = S.badan.filter(x => x.fn === 'panggil');
    c('W13 tulisan lewat Apps Script dengan tiket + WMS-TIKET (bukan kode), dan bacaan sesudahnya dari Apps Script, bukan potret lama',
      tl.tulis && tl.tulis.tersimpan === 1 && tl.baca2 && tl.baca2.dari === 'gas' && pTulis.length === 2 && pTulis[0].nama === 'simpanOpname' && pTulis[0].args[0] === 'WMS-TIKET' && pTulis[0].tiket === 'TIKET.SUPA' && !('kode' in pTulis[0]),
      JSON.stringify({ tl, p: pTulis.map(x => x.nama) }));

    /* ---------- tautan ---------- */
    const f1 = bingkai();
    await f1.click('#navLuar'); await jeda(200);
    await f1.click('#navDiri'); await jeda(200);
    const buka = await p.evaluate(() => ({ b: window.__buka.slice(0), href: location.href }));
    const masihAda = await diBingkai(() => !!document.getElementById('layarIsi'));
    c('W14 tautan keluar dari papan dibuka di tab baru, tautan ke papan sendiri diabaikan, WMS tetap terbuka',
      buka.b.length === 1 && /harian=1/.test(buka.b[0]) && /localhost:8766\/wms\//.test(buka.href) && masihAda, JSON.stringify(buka));

    /* ---------- tema malam ---------- */
    await nada();
    await f1.click('#kopKanan [data-wms]');
    await jeda(300);
    await tungguBingkai(() => window.__siap === 1 && window.__smr === 1 && !!document.querySelector('#kopKanan [data-wms]'), 8000);
    const malam = await diBingkai(() => ({ body: getComputedStyle(document.body).backgroundColor, coklat: getComputedStyle(document.getElementById('judulCoklat')).color, tombol: document.querySelector('#kopKanan [data-wms]').textContent }));
    const temaInduk = await p.evaluate(() => ({ t: document.documentElement.getAttribute('data-theme'), s: localStorage.getItem('wms_tema') }));
    c('W15 tombol siang/malam di kepala papan: papan dimuat ulang gelap (latar #121212, teks coklat jadi terang), pilihan diingat',
      malam.body === 'rgb(18, 18, 18)' && malam.coklat === 'rgb(242, 242, 242)' && malam.tombol === 'Night' && temaInduk.t === 'dark' && temaInduk.s === 'dark', JSON.stringify([malam, temaInduk]));
    await foto('04-papan-malam');
    c('W16 klik di dalam papan berbunyi klik (1900 Hz)', (await nada()).indexOf(1900) > -1);

    /* ---------- keluar dari papan ---------- */
    await diBingkai(() => keluarPapan());
    await tunggu(() => document.getElementById('formMasuk'), null, 5000);
    const habis1 = await p.evaluate(() => ({ form: !!document.getElementById('formMasuk'), ss: JSON.stringify(sessionStorage) }));
    c('W17 papan lama keluar sendiri (layar kodenya muncul lagi): WMS kembali ke halaman masuk, tiket dibuang', habis1.form && !/TIKET/.test(habis1.ss), JSON.stringify(habis1));

    /* ---------- keluar dari tombol WMS ---------- */
    await p.evaluate(() => localStorage.setItem('wms_tema', 'light'));
    await p.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); });
    await p.fill('#kode', 'kode-palsu-uji'); await p.check('#ingat'); await p.click('#tMasuk');
    await tungguBingkai(() => window.__siap === 1 && !!document.querySelector('#kopKanan [data-wms]'), 8000);
    const ingat = await p.evaluate(() => ({ ls: localStorage.getItem('wms_tiket'), ss: sessionStorage.getItem('wms_tiket') }));
    c('W18 "tetap masuk": tiket di localStorage', ingat.ls === 'TIKET.SUPA', JSON.stringify(ingat));
    await bingkai().click('#kopKanan [data-wms]:nth-of-type(2)');
    await tunggu(() => document.getElementById('formMasuk'), null, 5000);
    const habis2 = await p.evaluate(() => ({ form: !!document.getElementById('formMasuk'), ls: JSON.stringify(localStorage), ss: JSON.stringify(sessionStorage) }));
    c('W19 tombol Keluar di kepala papan: kembali ke halaman masuk, tiket di mana pun dibuang', habis2.form && !/TIKET/.test(habis2.ls + habis2.ss), JSON.stringify(habis2).slice(0, 200));

    /* ---------- tiket ditolak ---------- */
    await p.fill('#kode', 'kode-palsu-uji'); await p.click('#tMasuk');
    await tungguBingkai(() => window.__siap === 1, 8000);
    S.perluMasuk = true;
    await p.evaluate(() => sessionStorage.setItem('wms_kotor', String(Date.now())));
    await diBingkai(() => { google.script.run.papanInventory(KODE, '12b'); });
    await tunggu(() => document.getElementById('formMasuk'), null, 5000);
    c('W20 tiket ditolak Apps Script: kembali ke halaman masuk', !!(await p.$('#formMasuk')));
    S.perluMasuk = false;

    /* ---------- salinan papan belum ada ---------- */
    S.papanAda = false;
    await p.fill('#kode', 'kode-palsu-uji'); await p.click('#tMasuk');
    await tunggu(() => /not sent the board copy/.test((document.getElementById('tiraiPapan') || {}).innerText || ''), null, 6000);
    const blm = await p.evaluate(() => ({ t: (document.getElementById('tiraiPapan') || {}).innerText || '', lama: !!document.querySelector('#tiraiPapan a[href$="?lihat=1"]'), ulang: !!document.querySelector('[data-aksi=ulangPapan]') }));
    c('W21 salinan papan belum dicerminkan: boneka sedih, pesan jelas, tombol coba lagi dan tautan papan lama', /not sent the board copy/.test(blm.t) && blm.lama && blm.ulang, JSON.stringify(blm));
    await foto('05-belum-ada');
    S.papanAda = true;
    await p.click('[data-aksi=ulangPapan]');
    c('W22 coba lagi sesudah salinan tersedia: papan terbuka', await tungguBingkai(() => window.__siap === 1, 8000));

    /* ---------- HP ---------- */
    await p.click('[data-aksi=keluar]').catch(() => {});
    await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('wms_bhs', 'en'); });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(URL0); await tunggu(() => document.getElementById('formMasuk'));
    await foto('06-hp-masuk');
    const lebar = await p.evaluate(() => document.documentElement.scrollWidth);
    c('W23 lebar HP 390: halaman masuk tanpa geser samping', lebar <= 392, String(lebar));
  } catch (e) {
    c('MATI di tengah jalan', false, e.stack);
  }
  c('W24 tidak ada galat JavaScript selama seluruh uji', galatHalaman.length === 0, galatHalaman.join(' | ').slice(0, 400));

  await b.close(); srv.close();
  let gagal = 0;
  cek.forEach(x => { if (!x[1]) gagal++; console.log((x[1] ? 'LULUS ' : 'GAGAL ') + x[0] + (x[1] ? '' : '\n      -> ' + String(x[2]).slice(0, 600))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
})();
