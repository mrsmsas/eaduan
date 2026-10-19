/**
 * Dashboard Arkib HESK - TAMBAHAN pada Code.gs arkib (tiada fungsi sedia ada diubah).
 * Tampal fail ini sebagai fail baharu "Dashboard.gs" dalam projek Apps Script arkib,
 * kemudian tambah SATU baris dalam doPost (switch):
 *     case 'dashboard': data = dashboard_(d.token, d); break;
 * Akhir sekali: Deploy > Manage deployments > Edit > Version: New version > Deploy.
 *
 * Keselamatan: hanya peranan ADMIN (disahkan di sini, bukan di UI). Tiada nama, emel, telefon,
 * no. maktab/gaji, keterangan atau balasan dihantar. Menggunakan session_() & TZ dari Code.gs.
 */
const DASH_CACHE_SEC = 600;    // cache 10 minit; frontend menghantar segar:true untuk memintas cache
const DASH_CHUNK = 25000;      // had selamat CacheService (100KB/kunci) walaupun ada aksara bukan ASCII
const DASH_FIELDS = ['tiket_id', 'trackid_hesk', 'tarikh_aduan', 'kategori_id', 'lokasi', 'tajuk', 'kesegeraan',
  'pic_id', 'pic_hesk', 'status', 'tarikh_terima', 'tarikh_selesai', 'bil_log', 'dikemaskini'];

function dashboard_(token, f) {
  const u = session_(token);
  if (u.peranan !== 'ADMIN') throw new Error('Dashboard ini hanya untuk admin.');
  f = f || {};
  const cache = CacheService.getScriptCache();
  if (!f.segar) {
    const dariCache = dashBaca_(cache);
    if (dariCache) return dariCache;
  }
  const values = sheet_().getDataRange().getValues();
  const h = values.shift();
  const c = {}; h.forEach(function (n, i) { c[n] = i; });
  const perlu = DASH_FIELDS.concat(['nama_pengadu', 'keterangan']);
  perlu.forEach(function (n) { if (!(n in c)) throw new Error('Kolum "' + n + '" tiada dalam sheet ARKIB.'); });

  const dilihat = {};
  const rows = [];
  values.forEach(function (r) {
    if (!r[c.tiket_id]) return;
    const o = {};
    DASH_FIELDS.forEach(function (n) { o[n] = dashNilai_(r[c[n]], n); });
    // Penanda pendua: kandungan sama (nama, kategori, lokasi, tajuk, keterangan) pada hari yang sama; kejadian pertama tidak ditanda.
    const hari = o.tarikh_aduan ? myDate_(o.tarikh_aduan) : '';
    const kunci = [r[c.nama_pengadu], r[c.kategori_id], r[c.lokasi], r[c.tajuk], r[c.keterangan], hari].join('\u0001');
    o.dup = dilihat[kunci] ? 1 : 0;
    dilihat[kunci] = true;
    rows.push(o);
  });
  const hasil = { dijana: new Date().toISOString(), rows: rows };
  dashTulis_(cache, hasil);
  return hasil;
}

function dashNilai_(v, n) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
  if (v === null || v === undefined) return '';
  if (n === 'bil_log') return Number(v) || 0;
  return String(v);
}

function dashTulis_(cache, hasil) {
  try {
    const s = JSON.stringify(hasil), n = Math.ceil(s.length / DASH_CHUNK), kv = {};
    for (var i = 0; i < n; i++) kv['dash_' + i] = s.substr(i * DASH_CHUNK, DASH_CHUNK);
    kv['dash_n'] = String(n);
    cache.putAll(kv, DASH_CACHE_SEC);
  } catch (e) { /* cache gagal: abaikan, data tetap dipulangkan */ }
}

function dashBaca_(cache) {
  try {
    const n = Number(cache.get('dash_n') || 0);
    if (!n) return null;
    const keys = []; for (var i = 0; i < n; i++) keys.push('dash_' + i);
    const got = cache.getAll(keys);
    var s = '';
    for (var j = 0; j < n; j++) { if (got['dash_' + j] == null) return null; s += got['dash_' + j]; }
    return JSON.parse(s);
  } catch (e) { return null; }
}
