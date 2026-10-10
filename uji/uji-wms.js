/* Uji WMS (wms/, 10 Okt 2026 malam, kulit Mofmo Soft). Harapan: "41 pemeriksaan, SEMUA LULUS".
 *
 * MOFMO SOFT (10 Okt malam). Ferdy menolak kulit L4 ("masih kaku", "beruangnya
 * kurang lucu", "pakai karakter asli Mofmo"), lalu menyetujui mockup Mofmo Soft
 * ("gas bangun, bagus soalnya"). Pemeriksaan kulit dan boneka di bawah sudah
 * ditulis ulang untuk Mofmo Soft: krem dan coklat, sudut bulat, foto boneka
 * asli, foto produk di nama SKU, menu "Operational PIC". W40 sampai W45 baru.
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
const DIHARAPKAN = 45;
const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
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
  '.judulCoklat{color:#945200}.kartuMerah{background:#b3261e;color:#fff}h1{font-family:Gloock,Georgia,serif}' +
  /* bayangan gulir tabel papan lama (.gulung) dan tirai putih tembus */
  '.gulung{overflow-x:auto;background:linear-gradient(90deg,#fff 40%,rgba(255,255,255,0)) left center/22px 100% no-repeat,radial-gradient(farthest-side at 0 50%,rgba(60,40,10,.22),rgba(60,40,10,0)) left center/14px 100% no-repeat}.kabut{background:rgba(255,255,255,.8)}</style></head><body>' +
  '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
  /* kepala sama bentuknya dengan papan asli (header > .bungkus), dicek dari klien|papan 10 Okt */
  '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"><img alt=""></div><div style="flex:1;min-width:0"><h1>Papan Data</h1><p id="subJudul">12 bulan</p></div><div id="kopKanan"></div></div></header>' +
  '<nav id="panel"><a class="on" href="#" id="navRingkas">Ringkasan</a><a href="' + API.replace('AKfycbzslW9', 'AKfycbLAMA') + '?harian=1" id="navLuar">Ringkasan Harian</a><a href="' + API + '?lihat=1" id="navDiri">Papan</a><a href="#" id="navField"><span class="iknKotak"></span>Field Op <span class="pnlLcn">1</span></a><a href="#" id="navLap"><span class="iknKotak"><svg class="ikn" viewBox="0 0 24 24"><path d="M4 4h16"/></svg></span><span class="pnlNama">Field</span></a><a href="#" id="navLapId"><span class="pnlNama">Lapangan</span></a><a href="#" id="navGudang"><span class="iknKotak"><svg class="ikn" id="iknKosong" viewBox="0 0 24 24" fill="none" stroke="currentColor"></svg></span><span class="pnlNama">Warehouse</span></a></nav><table><tr><td id="tdField">Field</td></tr></table>' +
  '<div class="isiRail" id="rail"><div class="judulCoklat" id="judulCoklat">Ringkasan</div><div class="kartuMerah" id="kartuMerah">Belum kirim</div><div class="gulung" id="gulung">tabel surat jalan</div><div class="kabut" id="kabut">kabut</div><div id="isi"></div></div><div id="hasil"></div><button id="keluarPapan" onclick="keluarPapan()">Keluar papan</button></div>' +
  '<script>var KODE="";' +
  /* sebelum masuk selesai papan lama sudah meminta Ringkasan dengan kode kosong */
  'google.script.run.withSuccessHandler(function(r){window.__awal=r;}).papanSummary("","12b");' +
  'function buka(){var k=document.getElementById("kode").value;KODE=k;window.__k=k;' +
  'google.script.run.withSuccessHandler(function(r){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";document.getElementById("hasil").textContent="MASUK "+r.prod.length;window.__siap=1;muatHalaman();}).withFailureHandler(function(e){window.__gagal=e.message;}).dataPapan(k);}' +
  'function muatHalaman(){var w=document.createElement("div");w.id="smrKotak";document.getElementById("isi").appendChild(w);var akar=w.attachShadow({mode:"open"});' +
  'google.script.run.withSuccessHandler(function(h){akar.innerHTML=h.html;window.__smr=1;}).papanSummary(KODE,"12b");' +
  'google.script.run.withSuccessHandler(function(s){window.__skrip=s;}).pdgSkripTunda("gudang");' +
  /* pesan memuat papan lama ("The page is not frozen") di shadow root sendiri, dibiarkan tampil */
  'var t=document.createElement("div");t.id="tungguKotak";document.getElementById("isi").appendChild(t);t.attachShadow({mode:"open"}).innerHTML="<p id=\\"pesanMuat\\">Loading the Summary. The page is not frozen.</p>";}' +
  'function gambarUlang(){var akar=document.getElementById("smrKotak").shadowRoot;akar.innerHTML="";google.script.run.withSuccessHandler(function(h){akar.innerHTML=h.html;window.__smr2=1;}).papanSummary(KODE,"12b");}' +
  'function tulisGagal(){google.script.run.withSuccessHandler(function(r){if(r&&r.ok===false)window.__gagal2=r.pesan;}).withFailureHandler(function(e){window.__gagal2=e.message;}).simpanRusak(KODE,{});}' +
  'function bacaLambat(){google.script.run.withSuccessHandler(function(r){window.__lambat=r;}).daftarLambat(KODE);}' +
  'function tulis(){google.script.run.withSuccessHandler(function(r){window.__tulis=r;google.script.run.withSuccessHandler(function(x){window.__baca2=x;}).papanInventory(KODE,"12b");}).withFailureHandler(function(e){window.__gagal=e.message;}).simpanOpname(KODE,{lok:"A-01-1",qty:3});}' +
  'function keluarPapan(){KODE="";document.getElementById("layarIsi").style.display="none";document.getElementById("layarKode").style.display="block";}' +
  '<\/script></body></html>';
const DATA = { ok: true, lok: [{ k: 'HO' }], prod: [{ b: '1' }, { b: '2' }, { b: '3' }], baris: [] };
const SUMMARY = { ok: true, html: '<style>.angkaMerah{color:#b3261e}.kartu{border:1px solid var(--garis);font-size:13px;container-type:inline-size}.cap{font-size:12px}.u b.nil{display:block;font-size:min(28px,2.55cqi)}.c.res{background:repeating-linear-gradient(135deg,#fff 0 6px,#F7F2EE 6px 12px)}.c{border:1px solid #fff}</style><div class="c res" id="selRes">S1-5A</div><div class="kartu" id="kartuSmr"><div class="cap" id="capSmr">Nilai penjualan</div><div class="u"><b class="nil" id="nilSmr">Rp16,700,902</b><b class="nil" id="nilKecil">Rp4.58M</b></div></div><div class="ubin" id="ubinSmr" style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="u" id="uSmr1">Nilai penjualan</div><div class="u">Pcs terjual</div></div><div class="pita"><button class="tp" id="tpUji"><span>PICKING</span><b id="tpAngka">0</b><small>menunggu</small></button></div><div class="daftar" id="daftarUji"><div class="brs">RK-1</div></div><h2 id="judulSmr">Ringkasan</h2><b class="angkaMerah" id="angkaMerah">Rp16.700.902</b> <span>PO #123</span><table><tr><td id="tdSku1">MofmoFriends S - Reindeer</td><td>2</td></tr><tr><td id="tdSku2">MofmoFriends S - netherland dwarf</td><td>1</td></tr><tr><td id="tdBukan">TK Alam Sutera</td><td>3</td></tr></table><div class="c" data-sku="KC Bear" id="selSku"><b>R1-4A</b><span class="s">KC Bear</span></div><img id="fotoRak" alt="rak" src="https://drive.google.com/thumbnail?id=FOTOaaaaaaaaaaaaaaaaaaaaaaaa&sz=w400">' };
const GIF1 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

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
  await ctx.route(/drive\.google\.com/, r => { S.drive = (S.drive || 0) + 1; r.abort(); });
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
      : m.nama === 'daftarSuratJalan' ? { pintu: 'ok', hasil: { ok: true, daftar: [] } }
      : m.nama === 'daftarLambat' ? (await new Promise(x => setTimeout(x, 1500)), { pintu: 'ok', hasil: { ok: true, lambat: 1 } })
      : m.nama === 'simpanRusak' ? { pintu: 'ok', hasil: { ok: false, pesan: 'Baris PO tidak ketemu.' } }
      : m.nama === 'wmsFotoRak' ? { pintu: 'ok', hasil: { ok: true, foto: Object.fromEntries((m.args[1] || []).map(i => [i, GIF1])), gagal: [] } }
      : m.nama === 'fungsiBaru' ? { pintu: 'galat', pesan: 'Fungsi "fungsiBaru" tidak ada.' }
      : { pintu: 'galat', pesan: 'Fungsi "' + m.nama + '" tidak dibuka untuk WMS.' };
    else h = { pintu: 'galat', pesan: 'Fungsi "' + m.fn + '" tidak dibuka untuk WMS.' };
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
  });
  const POTRET = () => {
    const w = new Date(Date.now() - 3 * 60000).toISOString();
    const o = { 'dataPapan|["K"]': DATA, 'papanSummary|["K","12b"]': SUMMARY, 'papanInventory|["K","12b"]': { ok: true, dari: 'supa' }, 'pdgSkripTunda|["gudang"]': 'skrip-dari-supa' };
    if (S.papanAda) { o['klien|papan'] = { ok: true, versi: S.versi || 'uji', html: PAPAN_PALSU }; o['klien|versi'] = { ok: true, versi: S.versi || 'uji' }; }
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
    const papan1 = await p.evaluate(() => ({ tahap: document.getElementById('barisTahap').textContent.trim(), gel: document.getElementById('gelembung').textContent,
      kardus: Array.prototype.filter.call(document.querySelectorAll('.konveyor .kardus img.boneka'), i => /img\/[a-z_]+\.webp$/.test(i.getAttribute('src'))).length,
      maskot: (document.querySelector('#maskot img') || {}).getAttribute ? document.querySelector('#maskot img').getAttribute('src') : '',
      bg: getComputedStyle(document.body).backgroundColor, sudut: getComputedStyle(document.getElementById('formMasuk')).borderTopLeftRadius }));
    await jeda(2750);
    const papan2 = await p.evaluate(() => document.getElementById('barisTahap').textContent.trim());
    c('W2 masuk Mofmo Soft: latar krem, kartu bersudut bulat, tahap dok berputar Picking -> Packing, Shiba asli menyapa, kardus berisi boneka asli',
      papan1.tahap === 'Picking' && papan2 === 'Packing' && papan1.gel === 'Mof! Code, please' && /img\/shiba\.webp$/.test(papan1.maskot) && papan1.kardus >= 3 && papan1.bg === 'rgb(255, 248, 239)' && parseFloat(papan1.sudut) >= 20, JSON.stringify([papan1, papan2]));
    await foto('01-masuk');
    S.serverLama = true;
    await p.fill('#kode', 'apa-saja'); await p.click('#tMasuk');
    await tunggu(() => document.getElementById('galatMasuk').textContent);
    const lama = await p.evaluate(() => document.getElementById('galatMasuk').textContent);
    c('W3 Supabase mati dan server papan versi lama: pesannya "belum diperbarui", bukan "kode salah"', /not updated for the new WMS/.test(lama) && !/not right/.test(lama), lama);
    S.serverLama = false;
    await p.fill('#kode', 'salah'); await nada(); await p.click('#tMasuk');
    await tunggu(() => /not right/.test(document.getElementById('galatMasuk').textContent));
    const salah = await p.evaluate(() => ({ g: document.getElementById('galatMasuk').textContent, ls: JSON.stringify(localStorage), ss: JSON.stringify(sessionStorage), k: document.getElementById('maskot').className, mata: (document.querySelector('#maskot img') || { getAttribute() { return ''; } }).getAttribute('src') }));
    const nSalah = await nada();
    c('W4 kode salah: pesan tampil, Koala malu menggantikan Shiba dan menggeleng, bunyi tolak 220 lalu 185 Hz, tidak ada tiket', /not right/.test(salah.g) && /gelengKepala/.test(salah.k) && /img\/koala\.webp$/.test(salah.mata) && nSalah.indexOf(185) > nSalah.indexOf(220) && nSalah.indexOf(220) > -1 && !/wms_tiket/.test(salah.ls + salah.ss), JSON.stringify(salah) + nSalah);
    S.supa = 'hidup';
    await p.fill('#kode', ' kode-palsu-uji '); await p.click('#tMasuk');
    await tunggu(() => document.querySelector('#capMasuk .cap'));
    const senang = await p.evaluate(() => ({ cap: (document.querySelector('#capMasuk .cap') || {}).textContent, k: (document.getElementById('maskot') || {}).className }));
    c('W5 kode benar: cap Checked dan boneka melompat', senang.cap === 'Checked' && /lompat/.test(senang.k), JSON.stringify(senang));
    await tunggu(() => document.getElementById('tiraiPapan'), null, 4000);
    const tirai = await p.evaluate(() => ({ ada: !!document.getElementById('tiraiPapan'), boneka: !!document.querySelector('#tiraiPapan .maskot-muat img[src$=".webp"]'), teks: (document.getElementById('tiraiPapan') || {}).innerText }));
    c('W6 sesudah masuk: tirai muat Mofmo Soft (boneka asli + "Loading the ledger") tampil sambil papan dimuat', tirai.ada && tirai.boneka && /Loading the ledger/.test(String(tirai.teks || '')), JSON.stringify(tirai));
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
      /* foto rak (wmsFotoRak) memang lewat Apps Script, lihat W35 */
      pg.filter(x => x.nama !== 'wmsFotoRak').length === 0 && awal === 'ada' && (await diBingkai(() => window.__skrip)) === 'skrip-dari-supa' &&
      S.supaBadan.some(x => x.fn === 'ambil' && (x.kunci || [])[0] === 'papanSummary|["K","12b"]'),
      JSON.stringify({ pg: pg.map(x => x.nama), awal, ambil: S.supaBadan.filter(x => x.fn === 'ambil').map(x => x.kunci[0]) }));
    await foto('03-papan');
    /* Ferdy 10 Okt: "ini mana fotonya". Thumbnail Drive butuh login Google
       yang tidak terbawa ke pages.dev; fotonya diambil lewat server. */
    await tungguBingkai(() => { const i = document.getElementById('smrKotak').shadowRoot.getElementById('fotoRak'); return i && /^data:/.test(i.src); }, 6000);
    const fr = await diBingkai(() => document.getElementById('smrKotak').shadowRoot.getElementById('fotoRak').src.slice(0, 30));
    const pFoto = S.badan.filter(x => x.nama === 'wmsFotoRak');
    const kotorFoto = await p.evaluate(() => sessionStorage.getItem('wms_kotor'));
    c('W35 foto rak dari Drive diganti foto lewat server (wmsFotoRak dengan WMS-TIKET, satu panggilan berkelompok), tanpa menandai kotor',
      /^data:image\//.test(fr) && pFoto.length === 1 && pFoto[0].args[0] === 'WMS-TIKET' && JSON.stringify(pFoto[0].args[1]) === '["FOTOaaaaaaaaaaaaaaaaaaaaaaaa"]' && !kotorFoto, JSON.stringify({ fr, pFoto, kotorFoto }));

    /* ---------- kulit ---------- */
    const kulit = await diBingkai(() => {
      const gs = e => getComputedStyle(e);
      const akar = document.getElementById('smrKotak').shadowRoot;
      return { body: gs(document.body).backgroundColor, coklat: gs(document.getElementById('judulCoklat')).color, merah: gs(document.getElementById('kartuMerah')).backgroundColor,
        angka: gs(akar.getElementById('angkaMerah')).color, po: akar.innerHTML.indexOf('PO #123') > -1, adopsi: akar.adoptedStyleSheets.length,
        h1: gs(document.querySelector('h1')).fontFamily, nav: gs(document.getElementById('navRingkas')).backgroundColor, logo: getComputedStyle(document.querySelector('.gbrLogo'), '::after').backgroundImage, navSudut: gs(document.getElementById('navRingkas')).borderTopLeftRadius };
    });
    c('W10 kulit Mofmo Soft: coklat jadi coklat tinta #4A3426, kertas jadi krem #FFF8EF, merah jadi terakota #B4532A, menu aktif peach lembut berbentuk pil, logo foto Shiba', kulit.coklat === 'rgb(74, 52, 38)' && kulit.body === 'rgb(255, 248, 239)' && kulit.merah === 'rgb(180, 83, 42)' && kulit.nav === 'rgb(255, 227, 204)' && parseFloat(kulit.navSudut) >= 20 && /img\/kc_shiba\.webp/.test(kulit.logo), JSON.stringify(kulit));
    c('W11 HTML kiriman server di dalam shadow root ikut diwarnai ulang dan dapat lembar kulit; "PO #123" tidak tersentuh', kulit.angka === 'rgb(180, 83, 42)' && kulit.adopsi === 1 && kulit.po, JSON.stringify(kulit));
    c('W12 huruf judul Baloo 2, bukan Gloock atau Archivo', /Baloo 2/.test(kulit.h1) && !/Gloock|Archivo/.test(kulit.h1), kulit.h1);
    /* Ferdy 10 Okt: "fontnya masih kecil". Isi papan lama memakai px tetap
       (11 sampai 13 px) di dalam shadow root, jadi bidang isi diperbesar
       utuh (zoom), dan kartunya diberi garis tebal L4. */
    const isi = await diBingkai(() => { const akar = document.getElementById('smrKotak').shadowRoot; const k = getComputedStyle(akar.getElementById('kartuSmr')); const cp = getComputedStyle(akar.getElementById('capSmr'));
      return { zoom: getComputedStyle(document.getElementById('rail')).zoom, sudut: k.borderTopLeftRadius, jahit: k.outlineStyle, latar: k.backgroundColor }; });
    /* Papan asli: .ubin ringkasan adalah grid empat sel .u bercelah 12 px. Jahitan di .ubin tertutup sel putih dan cuma
       muncul sepotong-sepotong di celahnya (Ferdy melihat garis putus-putus patah di antara angka). Jahitannya pindah ke tiap sel. */
    const ub = await diBingkai(() => { const akar = document.getElementById('smrKotak').shadowRoot; const g = getComputedStyle(akar.getElementById('ubinSmr')); const u = getComputedStyle(akar.getElementById('uSmr1'));
      return { ubinJahit: g.outlineStyle, ubinLatar: g.backgroundColor, uJahit: u.outlineStyle, uSudut: u.borderTopLeftRadius, uLatar: u.backgroundColor }; });
    c('W44 ubin ringkasan bersel: jahitan dan latar putih pindah ke tiap sel, ubinnya sendiri polos (tanpa potongan jahitan di celah)', ub.ubinJahit === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(ub.ubinLatar) && ub.uJahit === 'dashed' && parseFloat(ub.uSudut) >= 14 && ub.uLatar === 'rgb(255, 255, 255)', JSON.stringify(ub));
    /* Papan asli, Gudang Outbound: ubin tahap (.pita .tp) dan daftar kiriman (.daftar) memakai kelas sendiri, jadi tadinya tetap kotak polos berangka kecil. */
    const ob = await diBingkai(() => { const akar = document.getElementById('smrKotak').shadowRoot; const t = getComputedStyle(akar.getElementById('tpUji')); const a = getComputedStyle(akar.getElementById('tpAngka')); const dft = getComputedStyle(akar.getElementById('daftarUji'));
      return { tpJahit: t.outlineStyle, tpSudut: t.borderTopLeftRadius, angka: a.fontFamily.slice(0, 12), angkaUkuran: a.fontSize, daftarSudut: dft.borderTopLeftRadius }; });
    c('W45 Gudang Outbound: ubin tahap berjahit dan bersudut bulat, angkanya Baloo 2 besar, daftar kiriman bersudut bulat', ob.tpJahit === 'dashed' && parseFloat(ob.tpSudut) >= 14 && /Baloo 2/.test(ob.angka) && parseFloat(ob.angkaUkuran) >= 28 && parseFloat(ob.daftarSudut) >= 14, JSON.stringify(ob));
    c('W26 bidang isi diperbesar lagi (zoom 1.22 di layar lebar, Ferdy: "gedein fontnya"), kartu putih bersudut bulat dengan jahitan putus-putus', isi.zoom === '1.22' && parseFloat(isi.sudut) >= 14 && isi.jahit === 'dashed' && isi.latar === 'rgb(255, 255, 255)', JSON.stringify(isi));
    /* Ferdy 10 Okt: "foto skunya dimasukin jg dong". Nama SKU di tabel dan di
       sel peta gudang diberi foto produk; nama yang belum punya foto dan teks
       yang bukan nama produk dibiarkan. */
    await tungguBingkai(() => !!document.getElementById('smrKotak').shadowRoot.querySelector('#tdSku1 img.l4-sku'), 4000);
    const sku = await diBingkai(() => { const r = document.getElementById('smrKotak').shadowRoot; const s = id => { const i = r.querySelector('#' + id + ' img.l4-sku'); return i ? i.getAttribute('src') : ''; };
      return { reindeer: s('tdSku1'), dwarf: s('tdSku2'), bukan: s('tdBukan'), sel: s('selSku'), teks: r.getElementById('tdSku1').textContent }; });
    c('W40 foto produk di nama SKU: tabel (S - Reindeer) dan sel peta gudang (KC Bear) berfoto, Netherland Dwarf yang belum punya foto dan nama gerai tidak, teks nama tetap',
      /img\/sku\/reindeer\.webp$/.test(sku.reindeer) && /img\/sku\/kc_bear\.webp$/.test(sku.sel) && !sku.dwarf && !sku.bukan && sku.teks === 'MofmoFriends S - Reindeer', JSON.stringify(sku));
    /* Ferdy 10 Okt: "ganti field op dg Operational PIC". */
    const fieldOp = await diBingkai(() => ({ t: document.getElementById('navField').textContent.replace(/\s+/g, ' ').trim(), lencana: !!document.querySelector('#navField .pnlLcn') }));
    c('W41 menu "Field Op" di papan tampil sebagai "Operational PIC", lencananya tetap', fieldOp.t === 'Operational PIC 1' && fieldOp.lencana, JSON.stringify(fieldOp));
    /* Papan asli menulis menunya "Lapangan" (EN: "Field"), bukan "Field Op". Kata "Field" di sel tabel bukan nama menu, jadi tidak boleh ikut berganti. */
    const lap = await diBingkai(() => ({ nav: document.querySelector('#navLap .pnlNama').textContent.trim(), navId: document.querySelector('#navLapId .pnlNama').textContent.trim(), td: document.getElementById('tdField').textContent.trim() }));
    c('W42 menu "Field" dan "Lapangan" (teks mentah sebelum diterjemahkan papan) jadi "Operational PIC", kata "Field" di sel tabel tetap', lap.nav === 'Operational PIC' && lap.navId === 'Operational PIC' && lap.td === 'Field', JSON.stringify(lap));
    /* Papan asli tidak punya ikon untuk Warehouse (svg kosong). Kulit lama tak terlihat bolongnya, kulit lembut memberi lingkaran peach, jadi bolongnya kelihatan. */
    const ikn = await diBingkai(() => { const g = getComputedStyle(document.getElementById('iknKosong')); const m = g.webkitMaskImage || g.maskImage || 'none'; return { mask: m.slice(0, 30), bg: g.backgroundColor, w: document.getElementById('iknKosong').getBoundingClientRect().width }; });
    c('W43 ikon Warehouse yang kosong di papan asli diisi gambar gudang (mask berwarna, tidak bolong)', /url\(/.test(ikn.mask) && !/rgba\(0, 0, 0, 0\)|transparent/.test(ikn.bg) && ikn.w >= 12, JSON.stringify(ikn));

    /* ---------- gerak dan suara di dalam papan ---------- */
    const contoh = [];
    await diBingkai(() => { window.__teks = []; const iv = setInterval(() => { const a = document.getElementById('smrKotak').shadowRoot.getElementById('nilSmr'); if (a) window.__teks.push(a.textContent); }, 40); setTimeout(() => clearInterval(iv), 1500); gambarUlang(); });
    await jeda(1700);
    const hitung = await diBingkai(() => ({ teks: window.__teks, kecil: document.getElementById('smrKotak').shadowRoot.getElementById('nilKecil').textContent }));
    const angkaAntara = hitung.teks.filter(t => /^Rp[\d,]+$/.test(t)).map(t => Number(t.replace(/\D/g, '')));
    c('W27 angka besar menghitung naik dengan format yang sama (Rp16,700,902), berhenti tepat di angka asli; angka berdesimal (Rp4.58M) tidak disentuh',
      angkaAntara.some(v => v > 0 && v < 16700902) && hitung.teks[hitung.teks.length - 1] === 'Rp16,700,902' && hitung.kecil === 'Rp4.58M', JSON.stringify(hitung.teks.slice(0, 6).concat(['...', hitung.teks[hitung.teks.length - 1]])));
    const boneka = await diBingkai(() => { const r = document.getElementById('tungguKotak').shadowRoot; const p = r.getElementById('pesanMuat'); return { svg: !!r.querySelector('img.l4-boneka'), teks: p ? p.textContent : '' }; });
    c('W28 pesan memuat papan lama ("The page is not frozen") ditemani foto boneka asli yang bergoyang', boneka.svg && /not frozen/.test(boneka.teks), JSON.stringify(boneka));
    await diBingkai(() => bacaLambat());
    await jeda(500);
    const garis = await p.evaluate(() => { const g = document.getElementById('garisMuatAtas'); return g ? getComputedStyle(g).opacity : 'tidak ada'; });
    await jeda(1600);
    const garis2 = await p.evaluate(() => { const g = document.getElementById('garisMuatAtas'); return g ? getComputedStyle(g).opacity : 'tidak ada'; });
    const catatW29 = await p.evaluate(() => window.__wms.PAPAN.catat.slice(-4).map(c => c.n + ':' + c.dari + (c.galat || '')));
    c('W29 garis muat oren di atas papan tampil selama ada panggilan yang belum kembali, lalu hilang', garis === '1' && garis2 === '0', JSON.stringify([garis, garis2, catatW29]));
    await nada();
    await diBingkai(() => tulisGagal());
    await tungguBingkai(() => !!window.__gagal2, 4000);
    const nGagal = await nada();
    c('W30 tulisan yang ditolak server ({ok:false}) berbunyi gagal (330 Hz) dan pesannya sampai ke papan', nGagal.indexOf(330) > -1 && /PO tidak ketemu/.test(await diBingkai(() => window.__gagal2)), JSON.stringify(nGagal));
    /* Pesan galat jujur: "tidak dibuka" bukan soal deploy; "tidak ada" baru soal deploy. */
    const pesanDok = await diBingkai(() => new Promise(r => google.script.run.withSuccessHandler(() => r('ok')).withFailureHandler(e => r(e.message)).bukaDokumenGudang(KODE, 'x')));
    const pesanBaru = await diBingkai(() => new Promise(r => google.script.run.withSuccessHandler(() => r('ok')).withFailureHandler(e => r(e.message)).fungsiBaru(KODE)));
    c('W36 pesan galat jujur: fungsi yang belum masuk izin disebut namanya (bukan "deploy"), fungsi yang belum ada di server baru disebut butuh deploy',
      /bukaDokumenGudang/.test(pesanDok) && !/deploy/i.test(pesanDok) && /fungsiBaru/.test(pesanBaru) && /deploy/i.test(pesanBaru), JSON.stringify([pesanDok, pesanBaru]));
    await p.evaluate(() => sessionStorage.removeItem('wms_kotor'));

    /* ---------- bacaan yang tidak dicerminkan tidak menandai kotor ---------- */
    await diBingkai(() => new Promise(r => google.script.run.withSuccessHandler(r).daftarSuratJalan(KODE)));
    const nSupa = S.supaBadan.length, nGas = S.badan.filter(x => x.fn === 'panggil').length;
    await diBingkai(() => new Promise(r => google.script.run.withSuccessHandler(r).papanSummary(KODE, '12b')));
    const kotorKah = await p.evaluate(() => sessionStorage.getItem('wms_kotor'));
    c('W25 bacaan yang tidak dicerminkan (daftarSuratJalan) lewat Apps Script tanpa menandai kotor: Ringkasan berikutnya tetap dari Supabase',
      !kotorKah && S.supaBadan.length > nSupa && S.badan.filter(x => x.fn === 'panggil').length === nGas && S.badan.some(x => x.nama === 'daftarSuratJalan'), JSON.stringify({ kotorKah, nGas }));

    /* ---------- tulis ---------- */
    const nSebelumTulis = S.badan.filter(x => x.fn === 'panggil').length;
    await nada();
    await diBingkai(() => tulis());
    await tungguBingkai(() => !!window.__baca2, 6000);
    const tl = await diBingkai(() => ({ tulis: window.__tulis, baca2: window.__baca2 }));
    const nTulis = await nada();
    c('W31 tulisan yang berhasil berbunyi sukses (784 Hz)', nTulis.indexOf(784) > -1, JSON.stringify(nTulis));
    /* Ferdy: "sekalian ui ux dibkin lebih lucu jga, ini kaku bgt". Boneka di
       pojok ikut bereaksi: mikir saat menunggu, sedih saat gagal, senang +
       konfeti saat tersimpan. */
    const mk = await p.evaluate(() => ({ ada: !!document.querySelector('#maskotPojok .badan-pojok img[src$=".webp"]'), catat: (window.__wms.maskot || {}).catat || [], konfeti: (window.__wms.maskot || {}).konfeti || 0 }));
    const iMikir = mk.catat.indexOf('mikir'), iSedih = mk.catat.indexOf('sedih'), iSenang = mk.catat.lastIndexOf('senang');
    c('W37 boneka pojok bereaksi: mikir saat panggilan lama, sedih saat tulisan ditolak, senang + konfeti saat tersimpan',
      mk.ada && iMikir > -1 && iSedih > iMikir && iSenang > iSedih && mk.konfeti > 0, JSON.stringify(mk));
    const pTulis = S.badan.filter(x => x.fn === 'panggil').slice(nSebelumTulis);
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
    await f1.click('#kopKanan [data-wms=tema]');
    await jeda(300);
    await tungguBingkai(() => window.__siap === 1 && window.__smr === 1 && !!document.querySelector('#kopKanan [data-wms]'), 8000);
    const malam = await diBingkai(() => ({ body: getComputedStyle(document.body).backgroundColor, coklat: getComputedStyle(document.getElementById('judulCoklat')).color, tombol: document.querySelector('#kopKanan [data-wms=tema]').getAttribute('aria-label') }));
    const temaInduk = await p.evaluate(() => ({ t: document.documentElement.getAttribute('data-theme'), s: localStorage.getItem('wms_tema') }));
    c('W15 tombol siang/malam di kepala papan: papan dimuat ulang gelap coklat hangat (latar #2B221C, teks coklat jadi krem #F8ECDF), pilihan diingat',
      malam.body === 'rgb(43, 34, 28)' && malam.coklat === 'rgb(248, 236, 223)' && malam.tombol === 'Switch to day' && temaInduk.t === 'dark' && temaInduk.s === 'dark', JSON.stringify([malam, temaInduk]));
    await foto('04-papan-malam');
    /* Ferdy 10 Okt (peta gudang malam): sel cadangan berarsir hitam-putih
       menutupi tulisannya. Penyebabnya "#fff" sesudah koma di dalam gradasi
       tidak ikut dipetakan, cuma pasangannya yang jadi hitam. */
    const arsir = await diBingkai(() => { const r = document.getElementById('smrKotak').shadowRoot; const e = r.getElementById('selRes'); const cs = getComputedStyle(e); return { bg: cs.backgroundImage, garis: cs.borderTopColor, po: r.innerHTML.indexOf('PO #123') > -1 }; });
    c('W34 malam: arsir sel cadangan gudang lembut (tanpa putih), garis #fff ikut jadi gelap, "PO #123" tetap',
      !/255, 255, 255/.test(arsir.bg) && /repeating-linear-gradient/.test(arsir.bg) && arsir.garis !== 'rgb(255, 255, 255)' && arsir.po, JSON.stringify(arsir));
    c('W16 klik di dalam papan berbunyi klik (1900 Hz)', (await nada()).indexOf(1900) > -1);
    const tepi = await diBingkai(() => ({ gulung: getComputedStyle(document.getElementById('gulung')).backgroundImage, kabut: getComputedStyle(document.getElementById('kabut')).backgroundColor }));
    await bingkai().hover('#kartuSmr'); await jeda(350);
    const timbul = await diBingkai(() => getComputedStyle(document.getElementById('smrKotak').shadowRoot.getElementById('kartuSmr')).boxShadow);
    c('W39 malam: tepi pudar putih tabel (.gulung) hilang, putih tembus jadi coklat gelap tembus, kartu tersorot terangkat dengan bayangan lembut (berblur, bukan kotak)',
      tepi.gulung === 'none' && tepi.kabut === 'rgba(43, 34, 28, 0.8)' && /\d+px \d+px [1-9]\d*px/.test(timbul) && !/4px 4px 0px/.test(timbul), JSON.stringify([tepi, timbul]));
    /* mata boneka mengikuti kursor, juga saat kursor di atas papan */
    await p.mouse.move(40, 450); await jeda(200);
    const mataKiri = await p.evaluate(() => (document.querySelector('#maskotPojok .badan-pojok img') || { style: {} }).style.transform);
    await p.mouse.move(1358, 120); await jeda(200);
    const mataKanan = await p.evaluate(() => (document.querySelector('#maskotPojok .badan-pojok img') || { style: {} }).style.transform);
    const dx = t => Number((String(t).match(/rotate\(([-\d.]+)deg/) || [])[1]);
    await nada();
    await p.click('#maskotPojok .badan-pojok', { force: true }); /* boneka bernapas terus: tidak pernah "stabil" */
    const gel = await p.evaluate(() => (document.querySelector('#maskotPojok .gelembung-pojok') || {}).textContent || '');
    await foto('08-maskot-bicara-malam');
    const nKlik = await nada();
    await p.click('#maskotPojok [data-aksi=sembunyiMaskot]', { force: true });
    const hilangMk = await p.evaluate(() => ({ ada: !!document.querySelector('#maskotPojok'), s: sessionStorage.getItem('wms_maskot') }));
    c('W38 Shiba di pojok menoleh ke arah kursor (miring kiri lalu kanan, juga di atas papan), diklik bicara dan berbunyi, tombol x menyembunyikannya selama sesi',
      dx(mataKiri) < 0 && dx(mataKanan) > 0 && gel.length > 2 && nKlik.indexOf(1900) > -1 && !hilangMk.ada && hilangMk.s === 'off', JSON.stringify({ mataKiri, mataKanan, gel, nKlik, hilangMk }));

    /* ---------- keluar dari papan ---------- */
    await diBingkai(() => keluarPapan());
    await tunggu(() => document.getElementById('formMasuk'), null, 5000);
    const habis1 = await p.evaluate(() => ({ form: !!document.getElementById('formMasuk'), ss: JSON.stringify(sessionStorage) }));
    c('W17 papan lama keluar sendiri (layar kodenya muncul lagi): WMS kembali ke halaman masuk, tiket dibuang', habis1.form && !/TIKET/.test(habis1.ss), JSON.stringify(habis1));

    /* ---------- keluar dari tombol WMS ---------- */
    await p.evaluate(() => localStorage.setItem('wms_tema', 'light'));
    await p.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); });
    const nAmbilSebelum = S.supaBadan.length;
    await p.fill('#kode', 'kode-palsu-uji'); await p.check('#ingat'); await p.click('#tMasuk');
    await tungguBingkai(() => window.__siap === 1 && !!document.querySelector('#kopKanan [data-wms]'), 8000);
    const ingat = await p.evaluate(() => ({ ls: localStorage.getItem('wms_tiket'), ss: sessionStorage.getItem('wms_tiket') }));
    c('W18 "tetap masuk": tiket di localStorage', ingat.ls === 'TIKET.SUPA', JSON.stringify(ingat));
    const ambilUlang = S.supaBadan.slice(nAmbilSebelum).filter(x => x.fn === 'ambil').map(x => (x.kunci || []).join(','));
    c('W32 bukaan kedua memakai papan yang tersimpan di perangkat: cuma versi kecil (klien|versi) yang ditanya, papan 1,3 MB tidak diunduh ulang',
      ambilUlang.some(k => k === 'klien|versi') && !ambilUlang.some(k => /klien\|papan/.test(k)), JSON.stringify(ambilUlang));
    await bingkai().click('#kopKanan [data-wms=keluar]');
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
    await p.evaluate(() => caches.delete('wms-papan'));
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
    await p.fill('#kode', 'kode-palsu-uji'); await p.click('#tMasuk');
    await tungguBingkai(() => window.__smr === 1 && !!document.querySelector('#kopKanan [data-wms]'), 8000);
    await jeda(900);
    await foto('07-hp-papan');
    const hp = await diBingkai(() => { const h1 = document.querySelector('header h1'); const nil = document.getElementById('smrKotak').shadowRoot.getElementById('nilSmr');
      return { h1: getComputedStyle(h1).whiteSpace, tinggiKepala: Math.round(document.querySelector('header').getBoundingClientRect().height), nil: getComputedStyle(nil).fontSize, lebar: document.documentElement.scrollWidth, zoom: getComputedStyle(document.getElementById('rail')).zoom }; });
    c('W33 papan di HP 390: judul satu baris, kepala ringkas (di bawah 140 px), angka besar tetap 28 px (bukan mengecil ikut cqi), tanpa geser samping',
      hp.h1 === 'nowrap' && hp.tinggiKepala < 140 && hp.nil === '28px' && hp.lebar <= 392 && hp.zoom === '1', JSON.stringify(hp));
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
