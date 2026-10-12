/* Uji menu Alat di kepala papan (wms/app.js, pasangAlat), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Kepala papan WMS berisi sembilan tombol buatan WMS
 * (Scan, Kitabku, Katalog, Kontrol, Laporan, Jadwal, Tanya, tema, Keluar)
 * ditambah tombol papan sendiri, sampai pecah dua baris di laptop. Ferdy
 * memilih mockup B: satu tombol "Alat" di kepala yang membuka daftar Laporan,
 * Kontrol, Jadwal PIC, Katalog, Kitabku, Tanya WMS (dengan keterangan
 * singkat); menu kiri tidak berubah. Cacat yang paling mahal dan paling diam:
 *  - daftar terbuka terpotong kotak #kopKanan (di HP kotak itu digeser
 *    samping) atau keluar layar;
 *  - daftar tidak menutup sesudah alat dipilih, menutupi panel alat;
 *  - tidak bisa dipakai dengan papan ketik (Esc, panah, Enter);
 *  - halaman papan ikut pindah saat alat diklik.
 */
const fs = require('fs'), path = require('path'), http = require('http');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 9;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const DATA = { ok: true, diperbarui: '12 Oct 2026 11:41', hariIni: '2026-10-12', bulanIni: '2026-10', lok: [{ k: 'HO', toko: 0 }, { k: 'OPENING', toko: 0 }, { k: 'TERJUAL', toko: 0 }], prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', h: 194250, hs: 175000 }], baris: [['2026-10-01', 0, 5, 1, 0]], invoiceMitra: [], opname: [] };
const menu = 'var HAL="ringkasan";function gambarPanel(){var g=[["ringkasan","Ringkasan"],["stok","Persediaan"],["gudang","Gudang"]];' +
  'document.getElementById("panel").innerHTML="<h3>Menu</h3>"+g.map(function(x){return "<a href=\\"#\\" data-hal=\\""+x[0]+"\\""+(x[0]===HAL?" class=\\"on\\"":"")+"><span class=\\"iknKotak\\"></span><span class=\\"pnlNama\\">"+x[1]+"</span></a>";}).join("");}' +
  'document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("#panel a");if(!a)return;e.preventDefault();window.__klikPapan=(window.__klikPapan||0)+1;HAL=a.getAttribute("data-hal")||"?";document.getElementById("isi").textContent="HAL "+HAL;gambarPanel();});';
const papan = denganMenu => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title>' +
  '<style>body{margin:0;font-family:Arial,sans-serif}#layarIsi{display:none}header .bungkus{display:flex;align-items:center;gap:16px;padding:14px 24px}#kopKanan{display:flex;gap:8px;align-items:center}.rangka{display:flex}nav#panel{flex:0 0 240px;display:flex;flex-direction:column}nav#panel a{display:flex;gap:8px;padding:8px 12px}.utama{flex:1;min-width:0}</style></head><body>' +
  '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
  '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div style="flex:1;min-width:0"><h1>Data dashboard</h1><p>last 12 months</p></div><div id="kopKanan"><button>↻</button><button>EN</button><button>♪</button><button>Sign out</button></div></div></header>' +
  '<div class="rangka">' + (denganMenu ? '<nav class="panel" id="panel"></nav>' : '') + '<div class="utama"><div class="isiRail" id="rail"><div id="isi">HAL ringkasan</div></div></div></div></div>' +
  '<script>' + (denganMenu ? menu : '') + 'function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";' + (denganMenu ? 'gambarPanel();' : '') + 'window.__siap=1;}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';
const ALAT = ['laporan', 'kontrol', 'jadwal', 'katalog', 'kitabku', 'tanya'];

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { c('0 playwright', false, e.message); return selesai(); }
  const jenis = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
  const srv = http.createServer((q, s) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(AKAR, p);
    if (!f.startsWith(AKAR) || !fs.existsSync(f)) { s.writeHead(404); return s.end('x'); }
    s.writeHead(200, { 'Content-Type': jenis[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(8790, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [];
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const buka = async (w, h, opsi) => {
    opsi = opsi || {};
    const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h } }, opsi.hp ? { hasTouch: true, isMobile: true } : {}));
    const html = papan(opsi.tanpaMenu ? false : true);
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(API + '**', async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      const h2 = m.nama === 'dataPapan' ? { pintu: 'ok', hasil: DATA } : m.nama === 'permintaanDanPiutang' ? { pintu: 'ok', hasil: { ok: true, tagihan: { ok: true, baris: [] } } } : { pintu: 'galat', pesan: 'Fungsi "' + m.nama + '" tidak dibuka untuk WMS.' };
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h2) });
    });
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h2;
      if (m.fn === 'masuk') h2 = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') { const wk = new Date(Date.now() - 60000).toISOString(); const o = { 'dataPapan|["K"]': DATA, 'klien|papan': { ok: true, versi: 'mb' + (opsi.tanpaMenu ? 'x' : ''), html }, 'klien|versi': { ok: true, versi: 'mb' + (opsi.tanpaMenu ? 'x' : '') } }; const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: wk, data: o[k] }; }); h2 = { ok: true, isi }; }
      else h2 = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h2) });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => galat.push(e.message));
    await p.goto('http://localhost:8790/wms/');
    await p.evaluate(x => { localStorage.setItem('wms_tema', x[1]); localStorage.setItem('wms_bhs', x[0]); localStorage.setItem('wms_maskot', 'off'); }, [opsi.bhs || 'id', opsi.tema || 'light']);
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    let fr = null; const t0 = Date.now();
    while (Date.now() - t0 < 12000) { fr = p.frames().find(x => x !== p.mainFrame()); try { if (fr && await fr.evaluate(() => window.__siap === 1 && document.querySelectorAll('[data-wms=laporan]').length > 0)) break; } catch (e) {} await jeda(100); }
    await jeda(500);
    return { ctx, p, fr };
  };
  const kepala = fr => fr.evaluate(() => {
    const kk = document.getElementById('kopKanan'), bt = document.querySelector('#kopKanan [data-wms=alat]'), d = document.querySelector('[data-wms-menu=alat]');
    const terbuka = !!(d && getComputedStyle(d).display !== 'none' && d.getBoundingClientRect().height > 0);
    const r = d && terbuka ? d.getBoundingClientRect() : null, rb = bt ? bt.getBoundingClientRect() : null;
    const item = d ? [].map.call(d.querySelectorAll('[data-wms]'), x => ({ k: x.getAttribute('data-wms'), n: (x.querySelector('b') || x).textContent.trim(), ket: (x.querySelector('small') || {}).textContent || '' })) : [];
    return { tombol: [].map.call(kk.querySelectorAll(':scope > [data-wms]'), x => x.getAttribute('data-wms')), teks: bt ? bt.textContent.trim() : '', exp: bt ? bt.getAttribute('aria-expanded') : null, pop: bt ? bt.getAttribute('aria-haspopup') : null,
      terbuka, item, dalam: r ? (r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1) : false, bawah: r && rb ? r.top >= rb.bottom - 2 : false,
      fokus: document.activeElement ? (document.activeElement.getAttribute('data-wms') || document.activeElement.tagName) : '', kk: kk.getBoundingClientRect().height, h1: document.querySelector('header h1').getBoundingClientRect().height };
  });
  const klik = (fr, sel) => fr.click(sel, { timeout: 4000 }).catch(() => {});
  try {
    /* ---- laptop ---- */
    let { ctx, p, fr } = await buka(1366, 768);
    const s1 = fr ? await kepala(fr) : {};
    c('1 laptop: di kepala tinggal Scan, Alat, tema, Keluar; daftar Alat tertutup', (s1.tombol || []).join(',') === 'scan,alat,tema,keluar' && s1.teks === 'Alat' && s1.exp === 'false' && s1.pop === 'menu' && !s1.terbuka, JSON.stringify(s1));
    c('2 kepala muat satu baris di laptop 1366 px', s1.kk && s1.kk <= Math.max(60, s1.h1 * 2), JSON.stringify([s1.kk, s1.h1]));
    if (fr) { await klik(fr, '#kopKanan [data-wms=alat]'); await jeda(250); }
    const s3 = fr ? await kepala(fr) : {};
    if (process.env.FOTO) await p.screenshot({ path: path.join(process.env.FOTO, 'alat-laptop.png') });
    c('3 klik Alat: daftar terbuka di bawah tombol, di dalam layar, urut Laporan, Kontrol, Jadwal PIC, Katalog, Kitabku, Tanya WMS, masing-masing berketerangan',
      s3.terbuka && s3.exp === 'true' && s3.dalam && s3.bawah && (s3.item || []).map(x => x.k).join(',') === ALAT.join(',') &&
      (s3.item || []).map(x => x.n).join(',') === 'Laporan,Kontrol,Jadwal PIC,Katalog,Kitabku,Tanya WMS' && (s3.item || []).every(x => x.ket.length > 5), JSON.stringify(s3));
    if (fr) { await klik(fr, '[data-wms-menu=alat] [data-wms=laporan]'); await jeda(300); }
    await p.waitForFunction(() => { const d = document.getElementById('laporan'); return d && d.classList.contains('buka'); }, null, { timeout: 6000 }).catch(() => {});
    const s4 = fr ? await kepala(fr) : {};
    const t4 = { lap: await p.evaluate(() => { const d = document.getElementById('laporan'); return !!(d && d.classList.contains('buka')); }), hal: fr ? await fr.evaluate(() => document.getElementById('isi').textContent + '|' + (window.__klikPapan || 0)) : '' };
    c('4 pilih Laporan: panel Laporan terbuka, daftar menutup, halaman papan tidak ikut pindah', t4.lap && !s4.terbuka && s4.exp === 'false' && t4.hal === 'HAL ringkasan|0', JSON.stringify([t4, s4.terbuka]));
    await p.evaluate(() => { const t = document.querySelector('#laporan [data-laporan=tutup]'); if (t) t.click(); });
    await jeda(250);
    /* papan ketik: Enter membuka dan memfokus butir pertama, panah turun ke butir kedua, Esc menutup dan fokus kembali ke tombol */
    let t5 = {};
    if (fr) {
      await fr.focus('#kopKanan [data-wms=alat]').catch(() => {}); await fr.press('#kopKanan [data-wms=alat]', 'Enter').catch(() => {}); await jeda(200);
      t5.a = (await kepala(fr)).fokus; await p.keyboard.press('ArrowDown'); await jeda(80); t5.b = (await kepala(fr)).fokus;
      await p.keyboard.press('Escape'); await jeda(150); const k = await kepala(fr); t5.c = k.fokus; t5.tutup = !k.terbuka;
      await klik(fr, '#kopKanan [data-wms=alat]'); await jeda(150); await fr.click('#isi', { timeout: 4000 }).catch(() => {}); await jeda(150); t5.luar = !(await kepala(fr)).terbuka;
    }
    c('5 papan ketik dan klik di luar: Enter membuka ke Laporan, panah turun ke Kontrol, Esc menutup dan fokus kembali ke tombol Alat; klik di luar menutup',
      t5.a === 'laporan' && t5.b === 'kontrol' && t5.c === 'alat' && t5.tutup && t5.luar, JSON.stringify(t5));
    await ctx.close();

    /* ---- HP ---- */
    ({ ctx, p, fr } = await buka(360, 780, { hp: true }));
    let t6 = {};
    if (fr) {
      const s = await kepala(fr); t6.tombol = s.tombol.join(',');
      t6.tampak = await fr.evaluate(() => { const b = document.querySelector('#kopKanan [data-wms=alat]'); const r = b && b.getBoundingClientRect(); return !!(r && r.width >= 44 && r.height >= 36 && r.left >= 0 && r.right <= innerWidth); });
      t6.ukur = await fr.evaluate(() => { const r = document.querySelector("#kopKanan [data-wms=alat]").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.width), Math.round(r.height), innerWidth]; });
      await klik(fr, '#kopKanan [data-wms=alat]'); await jeda(250);
      const s2 = await kepala(fr); t6.dalam = s2.dalam; t6.terbuka = s2.terbuka;
      if (process.env.FOTO) await p.screenshot({ path: path.join(process.env.FOTO, 'alat-hp.png') });
      t6.tinggi = await fr.evaluate(() => [].map.call(document.querySelectorAll('[data-wms-menu=alat] [data-wms]'), x => Math.round(x.getBoundingClientRect().height)));
      await klik(fr, '[data-wms-menu=alat] [data-wms=tanya]'); await jeda(450);
      t6.tanya = await p.evaluate(() => { const d = document.getElementById('tanya'); return !!(d && d.classList.contains('buka')); });
    }
    c('6 HP kecil 360 px: tombol Alat tampak dan cukup besar tanpa digeser, daftarnya muat di layar dengan butir setinggi minimal 44 px, Tanya WMS terbuka dari daftar', t6.tombol === 'scan,alat,tema,keluar' && t6.tampak && t6.terbuka && t6.dalam && (t6.tinggi || []).length === 6 && t6.tinggi.every(h => h >= 44) && t6.tanya, JSON.stringify(t6));
    await ctx.close();

    /* ---- bahasa Inggris ---- */
    ({ ctx, p, fr } = await buka(1366, 768, { bhs: 'en' }));
    if (fr) { await klik(fr, '#kopKanan [data-wms=alat]'); await jeda(250); }
    const s7 = fr ? await kepala(fr) : {};
    c('7 bahasa Inggris: tombol Tools, butir Report, Controls, PIC schedule, Catalog, Kitabku, Ask WMS', s7.teks === 'Tools' && (s7.item || []).map(x => x.n).join(',') === 'Report,Controls,PIC schedule,Catalog,Kitabku,Ask WMS', JSON.stringify(s7));
    await ctx.close();

    /* ---- malam ---- */
    ({ ctx, p, fr } = await buka(1366, 768, { tema: 'dark' }));
    if (fr) { await klik(fr, '#kopKanan [data-wms=alat]'); await jeda(250); }
    if (process.env.FOTO) await p.screenshot({ path: path.join(process.env.FOTO, 'alat-malam.png') });
    const t8 = fr ? await fr.evaluate(() => { const d = document.querySelector('[data-wms-menu=alat]'); const a = d && d.querySelector('[data-wms] b'); const lum = s => { const m = (s.match(/\d+(\.\d+)?/g) || []).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      if (!d || !a) return null; const bg = getComputedStyle(d).backgroundColor, fg = getComputedStyle(a).color; const L1 = lum(bg), L2 = lum(fg); return { bg, fg, kontras: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) }; }) : null;
    c('8 mode malam: daftar Alat gelap dengan tulisan terang, kontras minimal 4,5:1', t8 && t8.kontras >= 4.5 && lumaGelap(t8.bg), JSON.stringify(t8));
    await ctx.close();
  } catch (err) { c('MATI di tengah jalan', false, err.stack); }
  c('9 tidak ada galat JavaScript', galat.length === 0, galat.join(' | ').slice(0, 300));
  await b.close(); srv.close();
  selesai();
})();
function lumaGelap(s) { const m = (String(s).match(/\d+/g) || []).map(Number); return m.length >= 3 && (m[0] + m[1] + m[2]) / 3 < 110; }
function selesai() {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
}
