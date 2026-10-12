/* Uji kepala papan dan pembesaran isi di laptop kecil (wms/kulit.js), 12 Okt 2026.
 * Harapan: "DIHARAPKAN pemeriksaan, SEMUA LULUS".
 *
 * KENAPA UJI INI ADA. Ferdy kirim tangkapan layar papan di laptop lain:
 * judul "Data dashboard" dan "last 12 months · updated ..." pecah jadi satu
 * kata per baris, dan kartu Summary terpotong ("Wareho", "1,86"). Dua sebab:
 *  - kepala papan asli adalah baris flex; kolom judul flex:1;min-width:0 dan
 *    #kopKanan sekarang berisi 12 tombol yang tidak boleh pindah baris, jadi
 *    judul diperas sampai selebar kata terpanjang;
 *  - isi papan diperbesar 122% (permintaan "gedein fontnya") di semua lebar
 *    di atas HP, padahal laptop 1366 px atau 1536 px (skala Windows 125%)
 *    tidak punya ruang untuk itu.
 * Papan lama di sini palsu tapi meniru kepala aslinya: .bungkus flex, kolom
 * judul flex:1;min-width:0, #kopKanan flex. Yang diperiksa hasil akhirnya:
 * tinggi judul sama dengan satu baris, semua tombol di dalam layar, tidak ada
 * geser samping, dan nilai zoom isi per lebar layar.
 */
const fs = require('fs'), path = require('path'), http = require('http');
const AKAR = process.env.AKAR || path.resolve(__dirname, '..');
const DIHARAPKAN = 7;
const cek = []; const c = (n, ok, k) => cek.push([n, !!ok, k]);
const API = 'https://script.google.com/macros/s/AKfycbzslW9akcAS2EINjrdcllgpGpuQzz_I2jHtNyEWixS-yl2HSsqE5kfTDjDGR8H_Zcq9xA/exec';
const SUPA = 'https://oloxoxmfbfxxibksxeug.supabase.co/functions/v1/wms';
const DATA = { ok: true, diperbarui: '12 Oct 2026 11:41', hariIni: '2026-10-12', lok: [{ k: 'HO', toko: 0 }, { k: 'OPENING', toko: 0 }], prod: [{ b: '111', n: 'MofmoFriends S - Bear', s: 'MF-PLU-005', h: 194250 }], baris: [['2026-10-01', 0, 5, 1, 0]] };
const PAPAN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Papan</title>' +
  '<style>body{margin:0;font-family:Arial,sans-serif}#layarIsi{display:none}header .bungkus{display:flex;align-items:center;gap:16px;padding:14px 24px}#kopKanan{display:flex;gap:8px;align-items:center}' +
  '.rangka{display:flex}.panel{flex:0 0 260px}.utama{flex:1;min-width:0;overflow:hidden}.ubin{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.u{padding:16px;overflow:hidden;white-space:nowrap}</style></head><body>' +
  '<div id="layarKode"><input id="kode"><button onclick="buka()">Masuk</button></div>' +
  '<div id="layarIsi"><header><div class="bungkus"><div class="gbrLogo"></div><div style="flex:1;min-width:0"><h1 id="judulUji">Data dashboard</h1><p id="subJudul">last 12 months · updated 12 Oct 2026 11:41</p></div><div id="kopKanan"><button>↻</button><button>EN</button><button>♪</button><button>Sign out</button></div></div></header>' +
  '<div class="rangka"><nav class="panel" id="panel"><a>Summary</a></nav><div class="utama"><div class="isiRail" id="rail"><div class="ubin"><div class="u">SALES VALUE Rp16,700,902</div><div class="u">PCS SOLD 89</div><div class="u">STOCK POSITION 2,572</div><div class="u">OLS COMMISSION Rp1,211,000</div></div></div></div></div></div>' +
  '<script>function buka(){google.script.run.withSuccessHandler(function(){document.getElementById("layarKode").style.display="none";document.getElementById("layarIsi").style.display="block";window.__siap=1;}).dataPapan(document.getElementById("kode").value);}<\/script></body></html>';

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
  await new Promise(r => srv.listen(8786, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const galat = [];
  const jeda = ms => new Promise(x => setTimeout(x, ms));
  const ukur = async (w, h, mobil) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h } }, mobil ? { hasTouch: true, isMobile: true } : {}));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(API + '**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pintu: 'ok', hasil: DATA }) }));
    await ctx.route(SUPA, async r => {
      let m = {}; try { m = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      let h2;
      if (m.fn === 'masuk') h2 = { ok: true, tiket: 'TIKET.SUPA', ingat: true };
      else if (m.fn === 'ambil') { const wk = new Date(Date.now() - 60000).toISOString(); const o = { 'dataPapan|["K"]': DATA, 'klien|papan': { ok: true, versi: 'kp', html: PAPAN }, 'klien|versi': { ok: true, versi: 'kp' } }; const isi = {}; (m.kunci || []).forEach(k => { if (o[k]) isi[k] = { waktu: wk, data: o[k] }; }); h2 = { ok: true, isi }; }
      else h2 = { ok: false };
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(h2) });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => galat.push(e.message));
    await p.goto('http://localhost:8786/wms/');
    await p.evaluate(() => { localStorage.setItem('wms_tema', 'dark'); localStorage.setItem('wms_bhs', 'en'); localStorage.setItem('wms_maskot', 'off'); });
    await p.reload();
    await p.waitForSelector('#kode', { timeout: 8000 });
    await p.fill('#kode', 'kode-palsu'); await p.click('#tMasuk');
    let fr = null; const t0 = Date.now();
    while (Date.now() - t0 < 12000) { fr = p.frames().find(x => x !== p.mainFrame()); try { if (fr && await fr.evaluate(() => window.__siap === 1 && document.querySelectorAll('#kopKanan [data-wms]').length >= 6)) break; } catch (e) {} await jeda(100); }
    await jeda(600);
    const r = fr ? await fr.evaluate(() => {
      const h1 = document.getElementById('judulUji'), sub = document.getElementById('subJudul'), kk = document.getElementById('kopKanan'), bk = document.querySelector('header .bungkus');
      const lh = el => { const cs = getComputedStyle(el); const v = parseFloat(cs.lineHeight); return isFinite(v) ? v : parseFloat(cs.fontSize) * 1.25; };
      const tombol = [].slice.call(kk.querySelectorAll('button,a')).filter(t => getComputedStyle(t).display !== 'none');
      const luar = tombol.filter(t => { const q = t.getBoundingClientRect(); return q.right > innerWidth + 1 || q.left < -1; }).map(t => t.textContent.trim().slice(0, 12));
      const sesak = tombol.filter(t => t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().width < 30).map(t => t.textContent.trim().slice(0, 12));
      const kj = h1.parentElement.getBoundingClientRect(), kq = kk.getBoundingClientRect();
      const tabrak = !(kq.left >= kj.right - 1 || kq.top >= kj.bottom - 1);
      const sel = document.querySelectorAll('.u'), potong = [].filter.call(sel, u => u.scrollWidth > u.clientWidth + 1).length;
      return { h1: Math.round(h1.getBoundingClientRect().height), h1Baris: Math.round(lh(h1)), sub: Math.round(sub.getBoundingClientRect().height), subBaris: Math.round(lh(sub)),
        tombol: tombol.length, luar: luar, sesak: sesak, tabrak: tabrak, geser: Math.max(document.documentElement.scrollWidth - innerWidth, bk.scrollWidth - bk.clientWidth),
        zoom: getComputedStyle(document.getElementById('rail')).zoom, potong: potong, satuBaris: kk.getBoundingClientRect().top < h1.getBoundingClientRect().bottom };
    }) : {};
    await ctx.close();
    return r;
  };
  const satu = x => x.h1 && x.h1 <= x.h1Baris * 1.4 && x.sub <= x.subBaris * 1.4 && !(x.sesak || []).length && !x.tabrak;
  try {
    const a = await ukur(1366, 768);
    c('1 laptop 1366 px: judul dan subjudul satu baris, semua tombol kepala utuh (teks tidak terpotong, tidak menabrak judul) di dalam layar, tanpa geser samping, isi tidak diperbesar (zoom 1), kartu tidak terpotong',
      satu(a) && a.tombol >= 10 && !a.luar.length && a.geser <= 1 && String(a.zoom) === '1' && a.potong === 0, JSON.stringify(a));
    const b2 = await ukur(1536, 864);
    c('2 laptop 1536 px (skala 125%): judul satu baris, tombol di dalam layar, zoom 1, kartu utuh', satu(b2) && !b2.luar.length && b2.geser <= 1 && String(b2.zoom) === '1' && b2.potong === 0, JSON.stringify(b2));
    const d = await ukur(1700, 950);
    c('3 layar 1700 px: zoom isi 1.1, judul satu baris', satu(d) && String(d.zoom) === '1.1' && !d.luar.length, JSON.stringify(d));
    const e = await ukur(1920, 1080);
    c('4 layar 1920 px (laptop Ferdy): zoom tetap 1.22, kepala satu baris (tombol sejajar judul)', satu(e) && String(e.zoom) === '1.22' && e.satuBaris && !e.luar.length, JSON.stringify(e));
    const t = await ukur(1024, 768);
    c('4b tablet atau jendela 1024 px: judul satu baris, 12 tombol pindah baris di samping judul tanpa keluar layar', satu(t) && !t.luar.length && t.geser <= 1, JSON.stringify(t));
    const hp = await ukur(390, 844, true);
    c('5 HP 390 px tetap seperti sebelumnya: judul satu baris (dipotong titik-titik), tanpa geser halaman, zoom 1', hp.h1 && hp.h1 <= hp.h1Baris * 1.4 && hp.geser <= 1 && String(hp.zoom) === '1', JSON.stringify(hp));
  } catch (err) { c('MATI di tengah jalan', false, err.stack); }
  c('6 tidak ada galat JavaScript', galat.length === 0, galat.join(' | ').slice(0, 300));
  await b.close(); srv.close();
  selesai();
})();
function selesai() {
  let gagal = 0;
  cek.forEach(([n, ok, k]) => { if (!ok) gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  -> ' + String(k).slice(0, 700))); });
  if (cek.length !== DIHARAPKAN) { console.log('BAHAYA: ' + cek.length + ' pemeriksaan berjalan, seharusnya ' + DIHARAPKAN); gagal++; }
  console.log('\n' + cek.length + ' pemeriksaan, ' + (gagal ? gagal + ' GAGAL' : 'SEMUA LULUS'));
  process.exit(gagal ? 1 : 0);
}
