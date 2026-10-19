/* ==========================================================================
   Dashboard Analitik Arkib HESK — paparan ADMIN sahaja (sub-tab "Dashboard")

   KONTRAK BACKEND  (ARKIB_API_URL, action 'dashboard', data: { token })
   -> { ok:true, data:{ dijana:<ISO>, rows:[ {
        tiket_id, trackid_hesk, tarikh_aduan, kategori_id, lokasi, tajuk,
        kesegeraan, pic_id, pic_hesk, status, tarikh_terima, tarikh_selesai,
        bil_log, dikemaskini, dup } ] } }
   * Tarikh = ISO-8601 (UTC) seperti dalam sheet. Dipaparkan dalam waktu Malaysia (UTC+8).
   * dup = 1 jika kandungan sama (nama+kategori+lokasi+tajuk+keterangan) pada hari yang sama
     dan bukan kejadian pertama. Dikira di backend kerana nama/keterangan tidak dihantar.
   * Backend WAJIB mengesahkan token ADMIN dan TIDAK menghantar data peribadi
     (nama, emel, telefon, no. maktab/gaji, keterangan, balasan). Butiran penuh satu tiket
     diambil melalui action 'search' sedia ada apabila admin membuka rekod.

   Bergantung pada pembolehubah global dalam index.html: $, esc, apiArk, ARK, SESI, INDUK,
   namaKat, toast, lencana, bukaArkib, ARK_ROWS.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Peraturan (disahkan pentadbir) ---------- */
  const PERATURAN = {
    belumDiterimaHari: 3,   // status Baru melebihi N hari  => belum diterima
    tertunggakHari: 30,     // status Baru/Proses melebihi N hari => tertunggak
    lamaHari: 365           // terbuka melebihi N hari => perlu semakan
  };
  // Rekod ujian (percubaan pelancaran 28 Jan 2021 + rekod bertajuk Test/Testing/Ujian). Dikecualikan secara lalai.
  const TIKET_UJIAN = new Set([
    'KBR-2101-0001', 'KBR-2101-0002', 'KBR-2101-0003', 'KBR-2101-0004', 'ELK-2101-0001',
    'BGN-2101-0001', 'BGN-2101-0002', 'ELK-2101-0002', 'BGN-2101-0003',
    'ELK-2305-0024', 'ELK-2305-0025', 'ELK-2305-0026', 'ELK-2401-0009', 'DWS-2403-0003', 'BGN-2509-0006'
  ]);
  const KAT_LALAI = { BGN: 'Bangunan/Awam', ELK: 'Elektrik', ICT: 'ICT', DWS: 'Dewan Selera', KBR: 'Kebersihan', KWL: 'Keselamatan', AWM: 'Aduan Awam' };
  const KES_RANK = { Kecemasan: 4, Tinggi: 3, Sederhana: 2, Rendah: 1 };
  const KHAS = {
    selesai:  { label: 'Selesai', f: r => !r.buka },
    terbuka:  { label: 'Terbuka (Baru + Proses)', f: r => r.buka },
    proses:   { label: 'Dalam proses', f: r => r.status === 'Proses' },
    baru:     { label: 'Baru', f: r => r.status === 'Baru' },
    belum:    { label: 'Belum diterima > ' + PERATURAN.belumDiterimaHari + ' hari', f: r => r.status === 'Baru' && r.umur > PERATURAN.belumDiterimaHari },
    tertunggak: { label: 'Tertunggak > ' + PERATURAN.tertunggakHari + ' hari', f: r => r.buka && r.umur > PERATURAN.tertunggakHari },
    lama:     { label: 'Terbuka > ' + PERATURAN.lamaHari + ' hari', f: r => r.buka && r.umur > PERATURAN.lamaHari },
    segera:   { label: 'Tinggi/Kecemasan masih terbuka', f: r => r.buka && (r.kesegeraan === 'Tinggi' || r.kesegeraan === 'Kecemasan') },
    susulan:  { label: 'Terbuka tanpa log tindakan', f: r => r.buka && r.bil_log === 0 },
    dup:      { label: 'Kemungkinan pendua', f: r => r.dup },
    aktif:    { label: 'Terbuka dalam had ' + PERATURAN.tertunggakHari + ' hari', f: r => r.buka && r.umur <= PERATURAN.tertunggakHari }
  };

  /* ---------- Pembantu tarikh (waktu Malaysia UTC+8) ---------- */
  const HARI = 86400000, TZ = 8 * 3600000;
  const ms = iso => { const t = Date.parse(iso); return isNaN(t) ? null : t; };
  const ymd = t => new Date(t + TZ).toISOString().slice(0, 10);
  const dn = s => Math.floor(Date.parse(s + 'T00:00:00Z') / HARI);
  const shiftDay = (s, n) => new Date(Date.parse(s + 'T00:00:00Z') + n * HARI).toISOString().slice(0, 10);
  const hariIni = () => ymd(Date.now());
  const fmtD = s => s ? new Date(s + 'T00:00:00Z').toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';
  const fmtBulan = k => new Date(k + '-01T00:00:00Z').toLocaleDateString('ms-MY', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const fmtDT = t => t ? new Date(t).toLocaleString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' }) : '-';
  const N = v => Number(v).toLocaleString('ms-MY');
  const P = (v, d = 1) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('ms-MY', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
  const fmtHari = d => d == null ? '-' : d < 1 ? Math.max(1, Math.round(d * 24)) + ' jam' : (Math.round(d * 10) / 10).toLocaleString('ms-MY') + ' hari';
  const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const persen = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]; };
  const $d = id => document.getElementById(id);

  /* ---------- Normalisasi data ---------- */
  const SINGKATAN = new Set(['PSP', 'UPPM', 'RBT', 'ICT', 'MAKMAL KOMP 1', 'MAKMAL KOMP 2']);
  function tajukKes(s) {
    if (SINGKATAN.has(s)) return s;
    return s.toLowerCase().replace(/(^|[\s(\/-])([a-zæøå])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bPsp\b/, 'PSP').replace(/\bKomp\b/, 'Komp').replace(/\bUppm\b/, 'UPPM').replace(/\bRbt\b/, 'RBT').replace(/\bIct\b/, 'ICT');
  }
  function normBlok(lokasi) {
    let b = String(lokasi || '').split(',')[0].trim().toUpperCase().replace(/\*+$/, '');
    if (!b) return 'Tiada lokasi';
    if (b === 'PSP' || b.startsWith('PUSAT SUMBER PEMBELAJARAN')) return 'PSP / Pusat Sumber';
    return tajukKes(b);
  }

  /* ---------- Keadaan ---------- */
  let SEMUA = [];            // semua rekod (dinormalisasi)
  let META = { dijana: null, terkini: null };
  let DIMUAT = false, SEDANG = false, BASI = false;
  let F, T, GRAN = null, CHART = null, PICMAP = {};

  function resetF() { F = { preset: 'semua', dari: '', hingga: '', kat: '', status: '', pic: '', blok: '', ujian: true }; }
  function resetT() { T = { khas: '', q: '', sort: 'd', dir: -1, page: 1, per: 25 }; }
  resetF(); resetT();

  function sediaBaris(raw) {
    const r = Object.assign({}, raw);
    r.bil_log = +raw.bil_log || 0;
    r.ms = ms(raw.tarikh_aduan);
    r.d = r.ms == null ? '' : ymd(r.ms);
    r.msS = raw.tarikh_selesai ? ms(raw.tarikh_selesai) : null;
    r.dS = r.msS == null ? '' : ymd(r.msS);
    r.buka = raw.status !== 'Selesai';
    r.umur = r.buka && r.d ? Math.max(0, dn(hariIni()) - dn(r.d)) : null;
    r.hari = !r.buka && r.ms != null && r.msS != null ? Math.max(0, (r.msS - r.ms) / HARI) : null;
    r.tempoh = r.buka ? r.umur : r.hari;
    r.blok = normBlok(raw.lokasi);
    r.ujian = TIKET_UJIAN.has(raw.tiket_id);
    r.dup = +raw.dup === 1 || raw.dup === true;
    r.cari = [raw.tiket_id, raw.trackid_hesk, raw.tajuk, raw.lokasi].join(' ').toLowerCase();
    return r;
  }
  function sediaSemua(rows) {
    const out = rows.map(sediaBaris).filter(r => r.d);
    // nama pengendali: pic_hesk; jika kosong guna nama paling kerap bagi pic_id yang sama (selain ADMIN)
    const kira = {};
    out.forEach(r => { if (r.pic_hesk && String(r.pic_hesk).toUpperCase() !== 'ADMIN') { (kira[r.pic_id] = kira[r.pic_id] || {})[r.pic_hesk] = ((kira[r.pic_id] || {})[r.pic_hesk] || 0) + 1; } });
    PICMAP = {};
    Object.keys(kira).forEach(id => { PICMAP[id] = Object.entries(kira[id]).sort((a, b) => b[1] - a[1])[0][0]; });
    out.forEach(r => { r.pic = r.pic_hesk ? String(r.pic_hesk) : (PICMAP[r.pic_id] || ('ID ' + (r.pic_id || '?'))); });
    return out;
  }

  const namaKategori = id => {
    try { const k = INDUK && INDUK.kategori && INDUK.kategori.find(x => x.kategori_id === id); if (k) return namaKat(k); } catch (e) {}
    return KAT_LALAI[id] || id;
  };

  /* ---------- Penapisan ---------- */
  function lulus(r, f) {
    if (f.ujian && r.ujian) return false;
    if (f.dari && r.d < f.dari) return false;
    if (f.hingga && r.d > f.hingga) return false;
    if (f.kat && r.kategori_id !== f.kat) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.pic && r.pic !== f.pic) return false;
    if (f.blok && r.blok !== f.blok) return false;
    return true;
  }
  const tapis = (rows, f) => rows.filter(r => lulus(r, f));

  function julatEfektif(rows) {
    const a = F.dari || (rows.length ? rows.reduce((m, r) => r.d < m ? r.d : m, rows[0].d) : '');
    const b = F.hingga || (F.dari ? hariIni() : (rows.length ? rows.reduce((m, r) => r.d > m ? r.d : m, rows[0].d) : ''));
    return { a, b };
  }
  // Tempoh sebelumnya untuk perbandingan. null = tiada perbandingan.
  function tempohLalu() {
    if (!F.dari) return null;
    const dari = F.dari, hingga = F.hingga || hariIni();
    if (hingga < dari) return null;
    const thn = hariIni().slice(0, 4);
    if (F.preset === 'tahun_ini') return { dari: (+thn - 1) + dari.slice(4), hingga: (+thn - 1) + hingga.slice(4) };
    const len = dn(hingga) - dn(dari) + 1;
    return { dari: shiftDay(dari, -len), hingga: shiftDay(dari, -1) };
  }

  /* ---------- Pengiraan KPI ---------- */
  function kira(rows) {
    const n = rows.length, sel = rows.filter(r => !r.buka);
    const hr = sel.map(r => r.hari).filter(v => v != null);
    const buka = rows.filter(r => r.buka);
    return {
      n, sel: sel.length, buka: buka.length,
      selPct: n ? sel.length / n * 100 : null,
      proses: rows.filter(r => r.status === 'Proses').length,
      baru: rows.filter(r => r.status === 'Baru').length,
      baruLewat: rows.filter(KHAS.belum.f).length,
      tertunggak: rows.filter(KHAS.tertunggak.f).length,
      lama: rows.filter(KHAS.lama.f).length,
      med: median(hr), p90: persen(hr, 0.9), nHr: hr.length,
      medUmur: median(buka.map(r => r.umur).filter(v => v != null))
    };
  }
  function ubah(a, b) { return b ? (a - b) / b * 100 : null; }
  function delta(tipe, a, b, baikJikaNaik) {
    // tipe: 'pct' (peratus perubahan), 'pp' (mata peratus), 'hari'
    if (a == null || b == null) return '';
    let v, teks;
    if (tipe === 'pct') { v = ubah(a, b); if (v == null) return ''; teks = (v > 0 ? '▲ ' : v < 0 ? '▼ ' : '● ') + P(Math.abs(v)); }
    else if (tipe === 'pp') { v = a - b; teks = (v > 0 ? '▲ ' : v < 0 ? '▼ ' : '● ') + (Math.round(Math.abs(v) * 10) / 10).toLocaleString('ms-MY') + ' mata %'; }
    else { v = a - b; teks = (v > 0 ? '▲ ' : v < 0 ? '▼ ' : '● ') + fmtHari(Math.abs(v)); }
    let cls = 'neutral';
    if (baikJikaNaik === true) cls = v > 0 ? 'naik-baik' : v < 0 ? 'turun-buruk' : 'neutral';
    if (baikJikaNaik === false) cls = v > 0 ? 'naik-buruk' : v < 0 ? 'turun-baik' : 'neutral';
    return `<span class="dsb-delta ${cls}">${teks}</span>`;
  }

  /* ---------- Rangka UI ---------- */
  function bina() {
    const root = $d('sub-dash');
    if (root.dataset.siap) return;
    root.dataset.siap = '1';
    root.innerHTML = `<div class="dsb">
      <div class="kad">
        <div class="dsb-top">
          <div><h2>Dashboard Analitik Arkib HESK</h2><div class="nota" id="dsb-meta" style="margin:0"></div></div>
          <div class="dsb-aksi">
            <button class="btn sekunder" id="dsb-muat" type="button">↻ Muat semula data</button>
            <button class="btn sekunder" id="dsb-csv" type="button">⬇ Eksport CSV</button>
          </div>
        </div>
        <div class="dsb-filter" id="dsb-filter">
          <div><label for="dsb-preset">Tempoh</label><select id="dsb-preset">
            <option value="semua">Semua tarikh</option><option value="tahun_ini">Tahun ini</option><option value="tahun_lepas">Tahun lepas</option>
            <option value="12bln">12 bulan terakhir</option><option value="30hari">30 hari terakhir</option><option value="khas">Khas…</option></select></div>
          <div><label for="dsb-dari">Dari tarikh</label><input type="date" id="dsb-dari"></div>
          <div><label for="dsb-hingga">Hingga tarikh</label><input type="date" id="dsb-hingga"></div>
          <div><label for="dsb-kat">Kategori</label><select id="dsb-kat"></select></div>
          <div><label for="dsb-status">Status</label><select id="dsb-status"><option value="">Semua</option><option>Baru</option><option>Proses</option><option>Selesai</option></select></div>
          <div><label for="dsb-pic">Pengendali (PIC)</label><select id="dsb-pic"></select></div>
          <div><label for="dsb-blok">Blok / lokasi</label><select id="dsb-blok"></select></div>
          <label class="dsb-chk"><input type="checkbox" id="dsb-ujian"><span id="dsb-ujian-t">Kecualikan rekod ujian</span></label>
          <div><button class="btn sekunder" id="dsb-reset" type="button" style="width:100%;height:42px">Reset penapis</button></div>
        </div>
        <div class="dsb-aktif" id="dsb-aktif" aria-live="polite"></div>
      </div>
      <div id="dsb-isi"></div>
    </div>`;
    $d('dsb-muat').onclick = () => muat(true);
    $d('dsb-csv').onclick = eksportCSV;
    $d('dsb-reset').onclick = () => { resetF(); resetT(); GRAN = null; segerak(); lukis(); };
    $d('dsb-preset').onchange = e => { aturPreset(e.target.value); segerak(); lukis(); };
    $d('dsb-dari').onchange = e => { F.dari = e.target.value; F.preset = 'khas'; T.page = 1; segerak(); lukis(); };
    $d('dsb-hingga').onchange = e => { F.hingga = e.target.value; F.preset = 'khas'; T.page = 1; segerak(); lukis(); };
    [['dsb-kat', 'kat'], ['dsb-status', 'status'], ['dsb-pic', 'pic'], ['dsb-blok', 'blok']].forEach(([id, k]) => { $d(id).onchange = e => { F[k] = e.target.value; T.page = 1; segerak(); lukis(); }; });
    $d('dsb-ujian').onchange = e => { F.ujian = e.target.checked; segerak(); lukis(); };
  }

  function aturPreset(p) {
    const h = hariIni(), thn = +h.slice(0, 4);
    F.preset = p; T.page = 1; GRAN = null;
    if (p === 'semua') { F.dari = ''; F.hingga = ''; }
    else if (p === 'tahun_ini') { F.dari = thn + '-01-01'; F.hingga = h; }
    else if (p === 'tahun_lepas') { F.dari = (thn - 1) + '-01-01'; F.hingga = (thn - 1) + '-12-31'; }
    else if (p === '12bln') { F.dari = shiftDay(h, -364); F.hingga = h; }
    else if (p === '30hari') { F.dari = shiftDay(h, -29); F.hingga = h; }
  }

  function isiPilihan(id, nilai, pilihan) {
    const s = $d(id);
    s.innerHTML = pilihan.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
    s.value = pilihan.some(p => p[0] === nilai) ? nilai : '';
  }
  function segerak() {
    // senarai pilihan daripada data sebenar
    const kc = {}, pc = {}, bc = {};
    SEMUA.forEach(r => { kc[r.kategori_id] = 1; pc[r.pic] = (pc[r.pic] || 0) + 1; bc[r.blok] = (bc[r.blok] || 0) + 1; });
    isiPilihan('dsb-kat', F.kat, [['', 'Semua']].concat(Object.keys(kc).sort().map(k => [k, k + ' · ' + namaKategori(k)])));
    isiPilihan('dsb-pic', F.pic, [['', 'Semua']].concat(Object.keys(pc).sort((a, b) => pc[b] - pc[a]).map(k => [k, k])));
    isiPilihan('dsb-blok', F.blok, [['', 'Semua']].concat(Object.keys(bc).sort((a, b) => bc[b] - bc[a]).map(k => [k, k])));
    $d('dsb-status').value = F.status;
    $d('dsb-preset').value = F.preset;
    $d('dsb-dari').value = F.dari; $d('dsb-hingga').value = F.hingga;
    $d('dsb-ujian').checked = F.ujian;
    $d('dsb-ujian-t').textContent = 'Kecualikan rekod ujian (' + SEMUA.filter(r => r.ujian).length + ')';
  }

  function chipAktif() {
    const c = [];
    const add = (t, fn) => c.push({ t, fn });
    if (F.dari || F.hingga) add('Tempoh: ' + (F.dari ? fmtD(F.dari) : 'awal') + ' – ' + (F.hingga ? fmtD(F.hingga) : 'kini'), () => { F.dari = ''; F.hingga = ''; F.preset = 'semua'; });
    if (F.kat) add('Kategori: ' + namaKategori(F.kat), () => F.kat = '');
    if (F.status) add('Status: ' + F.status, () => F.status = '');
    if (F.pic) add('PIC: ' + F.pic, () => F.pic = '');
    if (F.blok) add('Lokasi: ' + F.blok, () => F.blok = '');
    if (!F.ujian) add('Termasuk rekod ujian', () => F.ujian = true);
    const el = $d('dsb-aktif');
    el.innerHTML = '<span class="lbl">Penapis aktif:</span>' + (c.length ? c.map((x, i) => `<span class="dsb-chip">${esc(x.t)}<button type="button" data-i="${i}" aria-label="Buang penapis ${esc(x.t)}">×</button></span>`).join('') : '<span class="lbl">tiada (semua rekod)</span>');
    el.querySelectorAll('button').forEach(b => b.onclick = () => { c[+b.dataset.i].fn(); T.page = 1; segerak(); lukis(); });
  }

  /* ---------- Pemuatan data ---------- */
  async function muat(paksa) {
    bina();
    if (!SESI || SESI.peranan !== 'ADMIN') { $d('dsb-isi').innerHTML = '<div class="kad dsb-keadaan">Dashboard ini hanya untuk admin.</div>'; return; }
    if (DIMUAT && !paksa && !BASI) { lukis(); return; }
    if (SEDANG) return;
    if (!ARK) {
      $d('dsb-isi').innerHTML = `<div class="kad dsb-keadaan">Akses Arkib HESK tidak tersedia untuk sesi ini.<br>${esc(ARK_ERR || 'Sila log keluar dan log masuk semula.')}</div>`;
      return;
    }
    SEDANG = true;
    $d('dsb-isi').innerHTML = '<div class="dsb-skel"><i></i><i></i><i></i><i style="height:260px"></i></div>';
    $d('dsb-muat').disabled = true;
    try {
      const d = await apiArk('dashboard', { token: ARK.token, segar: !!(paksa || BASI) });
      if (!d || !Array.isArray(d.rows)) throw new Error('Format data dashboard tidak sah.');
      SEMUA = sediaSemua(d.rows);
      const maxKemaskini = SEMUA.reduce((m, r) => { const t = ms(r.dikemaskini); return t && t > m ? t : m; }, 0);
      META = { dijana: d.dijana ? ms(d.dijana) : Date.now(), terkini: maxKemaskini || null };
      DIMUAT = true; BASI = false;
      segerak(); lukis();
    } catch (e) {
      DIMUAT = false;
      $d('dsb-isi').innerHTML = `<div class="kad dsb-keadaan"><div class="ralat" style="display:block;text-align:left">${esc(e.message)}</div><button class="btn" id="dsb-cuba" type="button">Cuba lagi</button></div>`;
      $d('dsb-cuba').onclick = () => muat(true);
    } finally { SEDANG = false; $d('dsb-muat').disabled = false; }
  }

  /* ---------- Lukis semua komponen ---------- */
  function lukis() {
    if (!DIMUAT) return;
    chipAktif();
    $d('dsb-meta').textContent = 'Data dimuatkan: ' + fmtDT(META.dijana) + (META.terkini ? ' · Rekod terakhir dikemas kini: ' + fmtDT(META.terkini) : '') + ' · Rujukan umur tiket: ' + fmtD(hariIni());
    const RF = tapis(SEMUA, F);
    const isi = $d('dsb-isi');
    if (CHART) { CHART.destroy(); CHART = null; }
    if (!RF.length) {
      isi.innerHTML = `<div class="kad dsb-keadaan"><b>Tiada rekod sepadan dengan penapis.</b><br>Longgarkan tempoh atau penapis di atas.<br><button class="btn" id="dsb-r2" type="button">Reset penapis</button></div>`;
      $d('dsb-r2').onclick = () => $d('dsb-reset').click();
      return;
    }
    const K = kira(RF);
    const lalu = tempohLalu();
    let KP = null, laluInfo = '';
    if (lalu) {
      const minD = SEMUA.reduce((m, r) => r.d < m ? r.d : m, '9999');
      if (lalu.dari < minD) laluInfo = 'Data tidak mencukupi untuk perbandingan tempoh';
      else { KP = kira(tapis(SEMUA, Object.assign({}, F, { dari: lalu.dari, hingga: lalu.hingga }))); laluInfo = 'berbanding ' + fmtD(lalu.dari) + ' – ' + fmtD(lalu.hingga); }
    }
    isi.innerHTML = `
      <div class="dsb-kpi" id="dsb-kpi"></div>
      <div class="kad" id="dsb-trend"></div>
      <div class="dsb-grid2"><div class="kad" id="dsb-kat-k"></div><div class="kad" id="dsb-blok-k"></div></div>
      <div class="kad" id="dsb-pic-k"></div>
      <div class="kad" id="dsb-amaran"></div>
      <div class="kad" id="dsb-insight"></div>
      <div class="kad" id="dsb-jadual"></div>`;
    lukisKPI(K, KP, laluInfo, lalu);
    lukisTrend(RF);
    lukisBar('dsb-kat-k', 'Mengikut kategori', 'Klik bar untuk menapis semua paparan.', RF, r => r.kategori_id, namaKategori, 'kat');
    lukisBar('dsb-blok-k', 'Mengikut blok / lokasi', 'Sepuluh teratas. Klik bar untuk menapis.', RF, r => r.blok, x => x, 'blok', 10);
    lukisPIC(RF);
    lukisAmaran(RF, K);
    lukisInsight(RF, K, KP, lalu);
    lukisJadual(RF);
  }

  /* ---------- KPI ---------- */
  function lukisKPI(K, KP, laluInfo, lalu) {
    const nota = laluInfo ? `<br><span style="font-size:11.5px">${esc(laluInfo)}</span>` : '';
    const kad = [
      { k: 'semua', c: '', l: 'Jumlah aduan', v: N(K.n), s: (KP ? delta('pct', K.n, KP.n, null) + ' (' + N(KP.n) + ' sebelum ini)' : (lalu ? '' : 'Dalam penapis semasa')) + nota, khas: '' },
      { k: 'selesai', c: K.selPct >= 85 ? 'k-ok' : 'k-warn', l: 'Kadar penyelesaian', v: K.selPct == null ? '-' : P(K.selPct), s: N(K.sel) + ' daripada ' + N(K.n) + ' selesai' + (KP && KP.selPct != null ? '<br>' + delta('pp', K.selPct, KP.selPct, true) + ' vs sebelum ini' : ''), khas: 'selesai' },
      { k: 'proses', c: '', l: 'Dalam proses', v: N(K.proses), s: P(K.n ? K.proses / K.n * 100 : 0) + ' daripada jumlah', khas: 'proses' },
      { k: 'baru', c: K.baruLewat ? 'k-warn' : '', l: 'Baru (belum diterima)', v: N(K.baru), s: N(K.baruLewat) + ' melebihi ' + PERATURAN.belumDiterimaHari + ' hari', khas: 'baru' },
      { k: 'tertunggak', c: K.tertunggak ? 'k-bad' : 'k-ok', l: 'Tertunggak (> ' + PERATURAN.tertunggakHari + ' hari)', v: N(K.tertunggak), s: (K.buka ? P(K.tertunggak / K.buka * 100) + ' daripada ' + N(K.buka) + ' tiket terbuka' : 'Tiada tiket terbuka'), khas: 'tertunggak' },
      { k: 'median', c: '', l: 'Median masa penyelesaian', v: fmtHari(K.med), s: K.nHr ? ('P90: ' + fmtHari(K.p90) + ' · ' + N(K.nHr) + ' tiket selesai') + (KP && KP.med != null ? '<br>' + delta('hari', K.med, KP.med, false) + ' vs sebelum ini' : '') : 'Data tidak mencukupi', khas: 'selesai' }
    ];
    const box = $d('dsb-kpi');
    box.innerHTML = kad.map((x, i) => `<button type="button" class="${x.c}" data-i="${i}" aria-label="${esc(x.l)}: ${esc(String(x.v).replace(/<[^>]+>/g, ''))}. Klik untuk lihat rekod."><span class="k-label">${esc(x.l)}</span><span class="k-nilai">${x.v}</span><span class="k-sub">${x.s}</span></button>`).join('');
    box.querySelectorAll('button').forEach(b => b.onclick = () => { drill(kad[+b.dataset.i].khas); });
  }
  function drill(khas) {
    T.khas = khas || ''; T.q = ''; T.page = 1;
    lukisJadual(tapis(SEMUA, F));
    const el = $d('dsb-jadual'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Trend ---------- */
  function kunci(d, g) {
    if (g === 'hari') return d;
    if (g === 'bulan') return d.slice(0, 7);
    if (g === 'tahun') return d.slice(0, 4);
    const dow = (new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7; return shiftDay(d, -dow);
  }
  function seterusnya(k, g) {
    if (g === 'hari') return shiftDay(k, 1);
    if (g === 'minggu') return shiftDay(k, 7);
    if (g === 'tahun') return String(+k + 1);
    const y = +k.slice(0, 4), m = +k.slice(5, 7); return m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');
  }
  function labelBucket(k, g) {
    if (g === 'hari') return fmtD(k);
    if (g === 'minggu') return 'Mgg ' + fmtD(k);
    if (g === 'bulan') return fmtBulan(k);
    return k;
  }
  function lukisTrend(RF) {
    const { a, b } = julatEfektif(RF);
    const span = dn(b) - dn(a) + 1;
    const g = GRAN || (span <= 62 ? 'hari' : span <= 190 ? 'minggu' : 'bulan');
    const kunciList = []; for (let k = kunci(a, g), last = kunci(b, g); k <= last; k = seterusnya(k, g)) kunciList.push(k);
    const masuk = {}, tutup = {}; kunciList.forEach(k => { masuk[k] = 0; tutup[k] = 0; });
    RF.forEach(r => {
      masuk[kunci(r.d, g)]++;
      if (r.dS && r.dS >= a && r.dS <= b) { const kk = kunci(r.dS, g); if (kk in tutup) tutup[kk]++; }
    });
    const dM = kunciList.map(k => masuk[k]), dT = kunciList.map(k => tutup[k]);
    // puncak & terendah (bucket separa pertama/terakhir tidak dibandingkan jika ada >= 4 bucket)
    const calon = kunciList.length >= 4 ? kunciList.slice(1, -1) : kunciList;
    let puncak = calon[0], rendah = calon[0];
    calon.forEach(k => { if (masuk[k] > masuk[puncak]) puncak = k; if (masuk[k] < masuk[rendah]) rendah = k; });
    TREND_INFO = { g, puncak, rendah, masukP: masuk[puncak], masukR: masuk[rendah], bil: kunciList.length, labelP: labelBucket(puncak, g), labelR: labelBucket(rendah, g) };

    const el = $d('dsb-trend');
    el.innerHTML = `<div class="dsb-kepala"><div><h2>Trend aduan masuk dan ditutup</h2><div class="sub-tajuk" style="margin:0">${fmtD(a)} – ${fmtD(b)} · Klik titik untuk menapis kepada tempoh tersebut.</div></div>
      <div class="dsb-seg" role="group" aria-label="Pecahan masa">${['hari', 'minggu', 'bulan', 'tahun'].map(x => `<button type="button" data-g="${x}" class="${x === g ? 'aktif' : ''}">${{ hari: 'Harian', minggu: 'Mingguan', bulan: 'Bulanan', tahun: 'Tahunan' }[x]}</button>`).join('')}</div></div>
      <div class="dsb-canvas"><canvas id="dsb-cv" role="img" aria-label="Graf garis aduan masuk dan ditutup mengikut masa"></canvas></div>
      <div class="dsb-nota">Aduan masuk = mengikut tarikh aduan; Ditutup = mengikut tarikh selesai bagi tiket dalam penapis yang sama (hanya yang ditutup dalam tempoh paparan).${kunciList.length > 400 ? ' Pecahan harian dengan banyak titik mungkin padat.' : ''}</div>`;
    el.querySelectorAll('.dsb-seg button').forEach(bt => bt.onclick = () => { GRAN = bt.dataset.g; lukisTrend(tapis(SEMUA, F)); });
    if (typeof Chart === 'undefined') { el.querySelector('.dsb-canvas').innerHTML = '<div class="ralat" style="display:block">Pustaka graf (vendor/chart.umd.js) gagal dimuatkan.</div>'; return; }
    if (CHART) CHART.destroy();
    const css = getComputedStyle(document.documentElement);
    const warnaMasuk = css.getPropertyValue('--navy2').trim() || '#1c4587', warnaTutup = css.getPropertyValue('--ok').trim() || '#15803d';
    CHART = new Chart($d('dsb-cv'), {
      type: 'line',
      data: {
        labels: kunciList.map(k => labelBucket(k, g)),
        datasets: [
          { label: 'Aduan masuk', data: dM, borderColor: warnaMasuk, backgroundColor: warnaMasuk, tension: .25, borderWidth: 2.5, pointRadius: kunciList.length > 45 ? 0 : 3, pointHoverRadius: 6 },
          { label: 'Ditutup (selesai)', data: dT, borderColor: warnaTutup, backgroundColor: warnaTutup, tension: .25, borderWidth: 2.5, borderDash: [], pointRadius: kunciList.length > 45 ? 0 : 3, pointHoverRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { footer: items => 'Klik untuk menapis tempoh ini' } } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Bilangan tiket' }, ticks: { precision: 0 } },
          x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }
        },
        onClick: (ev, els) => {
          if (!els.length) return;
          const k = kunciList[els[0].index];
          if (g === 'tahun') { F.dari = k + '-01-01'; F.hingga = k + '-12-31'; }
          else if (g === 'bulan') { const y = +k.slice(0, 4), m = +k.slice(5, 7); F.dari = k + '-01'; F.hingga = shiftDay(seterusnya(k, 'bulan') + '-01', -1); }
          else if (g === 'minggu') { F.dari = k; F.hingga = shiftDay(k, 6); }
          else { F.dari = k; F.hingga = k; }
          F.preset = 'khas'; GRAN = null; T.page = 1; segerak(); lukis();
        }
      }
    });
  }
  let TREND_INFO = null;

  /* ---------- Bar mendatar kategori / blok ---------- */
  function lukisBar(id, tajuk, sub, RF, fKunci, fLabel, kunciF, had) {
    const c = {}; RF.forEach(r => { const k = fKunci(r); c[k] = (c[k] || 0) + 1; });
    let list = Object.entries(c).sort((a, b) => b[1] - a[1]);
    const jumlah = RF.length, mak = list.length ? list[0][1] : 1;
    let lain = 0;
    if (had && list.length > had) { lain = list.slice(had).reduce((s, x) => s + x[1], 0); list = list.slice(0, had); }
    const el = $d(id);
    el.innerHTML = `<h2>${esc(tajuk)}</h2><div class="sub-tajuk">${esc(sub)}</div><div class="dsb-bar">${list.map(([k, v]) => {
      const pilih = F[kunciF] === k;
      return `<button type="button" data-k="${esc(k)}" class="${pilih ? 'pilih' : (F[kunciF] ? 'redup' : '')}" aria-label="${esc(fLabel(k))}: ${v} tiket">
        <span class="n" title="${esc(fLabel(k))}">${esc(fLabel(k))}</span><span class="t"><i style="width:${(v / mak * 100).toFixed(1)}%"></i></span><span class="v"><b>${N(v)}</b> · ${P(v / jumlah * 100)}</span></button>`;
    }).join('')}${lain ? `<div class="kecil" style="font-size:12px;color:var(--muted);padding:2px 6px">+ lokasi lain: ${N(lain)} tiket (${P(lain / jumlah * 100)})</div>` : ''}</div>`;
    el.querySelectorAll('button').forEach(b => b.onclick = () => { F[kunciF] = F[kunciF] === b.dataset.k ? '' : b.dataset.k; T.page = 1; segerak(); lukis(); });
  }

  /* ---------- Prestasi PIC ---------- */
  function lukisPIC(RF) {
    const g = {};
    RF.forEach(r => { const o = g[r.pic] = g[r.pic] || { n: 0, sel: 0, buka: 0, tert: 0, hr: [] }; o.n++; if (r.buka) { o.buka++; if (r.umur > PERATURAN.tertunggakHari) o.tert++; } else { o.sel++; if (r.hari != null) o.hr.push(r.hari); } });
    const baris = Object.entries(g).sort((a, b) => b[1].n - a[1].n);
    const el = $d('dsb-pic-k');
    el.innerHTML = `<h2>Prestasi mengikut pengendali (PIC)</h2><div class="sub-tajuk">Pengendali = nama dalam HESK (pic_hesk). Klik baris untuk menapis. Nama "ADMIN" ialah akaun pentadbir HESK.</div>
      <div class="dsb-wrap"><table class="dsb-tbl kad-mobile"><thead><tr><th>Pengendali</th><th class="num">Jumlah</th><th class="num">Sumbangan</th><th class="num">Selesai</th><th class="num">Kadar selesai</th><th class="num">Terbuka</th><th class="num">Tertunggak</th><th class="num">Median selesai</th></tr></thead><tbody>
      ${baris.map(([nama, o]) => `<tr class="klik ${F.pic === nama ? 'pilih' : ''}" tabindex="0" role="button" data-p="${esc(nama)}">
        <td class="utama" data-l="Pengendali">${esc(nama)}</td><td class="num" data-l="Jumlah">${N(o.n)}</td><td class="num" data-l="Sumbangan">${P(o.n / RF.length * 100)}</td><td class="num" data-l="Selesai">${N(o.sel)}</td>
        <td class="num" data-l="Kadar selesai">${P(o.n ? o.sel / o.n * 100 : 0)}</td><td class="num" data-l="Terbuka">${N(o.buka)}</td><td class="num ${o.tert ? 'dsb-bad' : ''}" data-l="Tertunggak">${N(o.tert)}</td><td class="num" data-l="Median selesai">${o.hr.length ? fmtHari(median(o.hr)) : '-'}</td></tr>`).join('')}
      </tbody></table></div>`;
    el.querySelectorAll('tr.klik').forEach(tr => {
      const f = () => { F.pic = F.pic === tr.dataset.p ? '' : tr.dataset.p; T.page = 1; segerak(); lukis(); };
      tr.onclick = f; tr.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } };
    });
  }

  /* ---------- Pemantauan & amaran ---------- */
  function lukisAmaran(RF, K) {
    const a = (kod, warna) => ({ kod, n: RF.filter(KHAS[kod].f).length, warna });
    const items = [
      Object.assign(a('belum'), { warna: 'merah', t: 'Belum diterima', s: 'Status Baru > ' + PERATURAN.belumDiterimaHari + ' hari' }),
      Object.assign(a('tertunggak'), { warna: 'merah', t: 'Tertunggak', s: 'Baru/Proses > ' + PERATURAN.tertunggakHari + ' hari' }),
      Object.assign(a('lama'), { warna: 'merah', t: 'Terbuka lebih setahun', s: 'Baru/Proses > ' + PERATURAN.lamaHari + ' hari' }),
      Object.assign(a('segera'), { warna: 'merah', t: 'Tinggi / Kecemasan terbuka', s: 'Kesegeraan Tinggi atau Kecemasan' }),
      Object.assign(a('susulan'), { warna: 'kuning', t: 'Tiada tindakan susulan', s: 'Terbuka dan bil. log = 0' }),
      Object.assign(a('dup'), { warna: 'kuning', t: 'Kemungkinan pendua', s: 'Kandungan sama, hari sama' })
    ];
    items.forEach(i => { if (!i.n) i.warna = 'hijau'; });
    // umur tiket terbuka
    const buka = RF.filter(r => r.buka);
    const jalur = [['≤ ' + PERATURAN.tertunggakHari + ' hari', 0, PERATURAN.tertunggakHari, '#2563eb'], ['31–90 hari', PERATURAN.tertunggakHari + 1, 90, '#e0a030'], ['91–180 hari', 91, 180, '#d97706'], ['181–365 hari', 181, 365, '#c2410c'], ['> 1 tahun', 366, 99999, '#b3261e']];
    const jc = jalur.map(([l, lo, hi, w]) => [l, buka.filter(r => r.umur >= lo && r.umur <= hi).length, w]);
    const mk = Math.max(1, ...jc.map(x => x[1]));
    const prio = buka.filter(KHAS.aktif.f).sort((x, y) => (KES_RANK[y.kesegeraan] || 0) - (KES_RANK[x.kesegeraan] || 0) || y.umur - x.umur).slice(0, 6);
    const el = $d('dsb-amaran');
    el.innerHTML = `<h2>Pemantauan &amp; amaran</h2><div class="sub-tajuk">Berdasarkan tarikh dan status sebenar. Tiada tarikh akhir dalam data, jadi "tertunggak" mengikut peraturan umur tiket di atas. Klik untuk lihat rekod.</div>
      <div class="dsb-amaran">${items.map(i => `<button type="button" class="${i.warna}" data-k="${i.kod}"><span class="a-n">${N(i.n)}</span><span class="a-t"><b>${esc(i.t)}</b><small>${esc(i.s)}</small></span></button>`).join('')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px" class="dsb-grid2" >
        <div><h2 style="font-size:14px">Umur tiket terbuka (${N(buka.length)})</h2>${buka.length ? `<div class="dsb-umur">${jc.map(([l, n, w]) => `<div class="r"><span>${l}</span><span class="t"><i style="width:${(n / mk * 100).toFixed(1)}%;background:${w}"></i></span><span class="v">${N(n)}</span></div>`).join('')}</div>` : '<div class="nota">Tiada tiket terbuka dalam penapis ini.</div>'}</div>
        <div><h2 style="font-size:14px">Keutamaan tindakan</h2><div class="nota" style="margin:0 0 4px">Tiket terbuka dalam had ${PERATURAN.tertunggakHari} hari, kesegeraan tertinggi dan terlama dahulu.</div>
          ${prio.length ? `<div class="dsb-prio">${prio.map(r => `<button type="button" data-id="${esc(r.tiket_id)}"><b>${esc(r.tiket_id)}</b> · ${lencana(r.status)} ${r.kesegeraan === 'Tinggi' || r.kesegeraan === 'Kecemasan' ? `<span class="lencana k-${esc(r.kesegeraan)}">${esc(r.kesegeraan)}</span>` : ''}<small>${esc(r.tajuk || '(tiada tajuk)')} · ${esc(r.blok)} · ${r.umur} hari</small></button>`).join('')}</div>` : '<div class="nota">Tiada tiket terbuka dalam had masa — tiada perkara segera.</div>'}</div>
      </div>`;
    el.querySelectorAll('.dsb-amaran button').forEach(b => b.onclick = () => drill(b.dataset.k));
    el.querySelectorAll('.dsb-prio button').forEach(b => b.onclick = () => lihatButiran(b.dataset.id));
  }

  /* ---------- Analisis & Insight ---------- */
  function lukisInsight(RF, K, KP, lalu) {
    const out = [];
    const add = (jenis, ik, teks, asas) => out.push({ jenis, ik, teks, asas });
    const kurang = 'Data tidak mencukupi untuk analisis ini';
    const el = $d('dsb-insight');
    if (RF.length < 10) {
      el.innerHTML = `<h2>Analisis &amp; Insight</h2><div class="dsb-keadaan" style="padding:14px">${kurang} (hanya ${RF.length} rekod dalam penapis).</div>`;
      return;
    }
    // 1. kategori
    const kc = {}; RF.forEach(r => kc[r.kategori_id] = (kc[r.kategori_id] || 0) + 1);
    const ks = Object.entries(kc).sort((a, b) => b[1] - a[1]);
    if (ks.length) add('info', '📊', `<b>${esc(namaKategori(ks[0][0]))}</b> mencatat aduan tertinggi: <b>${N(ks[0][1])}</b> (${P(ks[0][1] / RF.length * 100)})` + (ks[1] ? `, diikuti ${esc(namaKategori(ks[1][0]))} ${N(ks[1][1])} (${P(ks[1][1] / RF.length * 100)}).` : '.'), `${N(ks[0][1])} ÷ ${N(RF.length)} tiket dalam penapis`);
    // 2. perubahan berbanding tempoh lalu
    if (KP && KP.n >= 10) {
      const v = ubah(K.n, KP.n);
      add(v > 0 ? 'amaran' : 'baik', v > 0 ? '📈' : '📉', `Jumlah aduan ${v >= 0 ? 'meningkat' : 'menurun'} <b>${P(Math.abs(v))}</b> (${N(K.n)} berbanding ${N(KP.n)} pada tempoh sebelumnya).`, `(${N(K.n)} − ${N(KP.n)}) ÷ ${N(KP.n)}; tempoh sebelumnya ${fmtD(lalu.dari)} – ${fmtD(lalu.hingga)}`);
    } else if (lalu) add('kurang', 'ℹ️', kurang + ' — perbandingan dengan tempoh sebelumnya tidak boleh dibuat.', 'Tempoh sebelumnya kurang daripada 10 rekod atau di luar julat data');
    // 3. puncak/terendah
    if (TREND_INFO && TREND_INFO.bil >= 4) {
      const gl = { hari: 'hari', minggu: 'minggu', bulan: 'bulan', tahun: 'tahun' }[TREND_INFO.g];
      add('info', '📅', `Tempoh (${gl}) paling sibuk: <b>${esc(TREND_INFO.labelP)}</b> (${N(TREND_INFO.masukP)} aduan). Paling rendah: <b>${esc(TREND_INFO.labelR)}</b> (${N(TREND_INFO.masukR)}).`, `Bilangan aduan masuk setiap ${gl}; ${gl} separa pertama/terakhir tidak dibandingkan`);
    }
    // 4. kadar penyelesaian
    if (K.selPct != null) {
      const dlt = KP && KP.selPct != null && KP.n >= 10 ? K.selPct - KP.selPct : null;
      add(K.selPct >= 85 ? 'baik' : 'info', '✅', `Kadar penyelesaian <b>${P(K.selPct)}</b> (${N(K.sel)} daripada ${N(K.n)})` + (dlt != null ? `, ${dlt >= 0 ? 'naik' : 'turun'} ${(Math.round(Math.abs(dlt) * 10) / 10).toLocaleString('ms-MY')} mata peratus berbanding tempoh sebelumnya.` : '.') + (K.nHr ? ` Median masa selesai ${fmtHari(K.med)} (P90 ${fmtHari(K.p90)}).` : ''), 'Selesai ÷ jumlah tiket; masa selesai = tarikh selesai − tarikh aduan');
    }
    // 5. tertunggak
    if (K.buka) {
      add(K.tertunggak ? 'amaran' : 'baik', K.tertunggak ? '⚠️' : '👍', K.tertunggak ? `<b>${N(K.tertunggak)}</b> tiket terbuka melebihi ${PERATURAN.tertunggakHari} hari (${P(K.tertunggak / K.buka * 100)} daripada ${N(K.buka)} tiket terbuka); median umur tiket terbuka ${fmtHari(K.medUmur)}.` : `Semua ${N(K.buka)} tiket terbuka masih dalam had ${PERATURAN.tertunggakHari} hari.`, `Peraturan: status Baru/Proses dan umur > ${PERATURAN.tertunggakHari} hari (hari semasa − tarikh aduan)`);
      if (K.lama) add('amaran', '🗂️', `Cadangan: semak dan kemas kini status <b>${N(K.lama)}</b> tiket yang telah terbuka lebih ${PERATURAN.lamaHari} hari.`, `Peraturan: terbuka > ${PERATURAN.lamaHari} hari; klik amaran "Terbuka lebih setahun" untuk senarai`);
      const sus = RF.filter(KHAS.susulan.f).length;
      if (sus) add('amaran', '📝', `<b>${N(sus)}</b> tiket terbuka belum mempunyai sebarang log tindakan.`, 'Tiket terbuka dengan bil. log = 0');
    }
    // 6. PIC dengan beban terbuka tertinggi
    const pb = {}; RF.filter(r => r.buka).forEach(r => pb[r.pic] = (pb[r.pic] || 0) + 1);
    const pl = Object.entries(pb).sort((a, b) => b[1] - a[1]);
    if (K.buka >= 5 && pl.length) add('info', '👤', `Beban tiket terbuka tertinggi: <b>${esc(pl[0][0])}</b> dengan <b>${N(pl[0][1])}</b> tiket (${P(pl[0][1] / K.buka * 100)} daripada semua tiket terbuka).`, `Tiket terbuka mengikut pic_hesk${pl[0][0].toUpperCase() === 'ADMIN' ? '; ADMIN ialah akaun pentadbir HESK' : ''}`);
    // 7. lokasi
    const bl = {}; RF.forEach(r => { if (r.blok !== 'Tiada lokasi') bl[r.blok] = (bl[r.blok] || 0) + 1; });
    const bs = Object.entries(bl).sort((a, b) => b[1] - a[1]);
    if (bs.length) add('info', '📍', `Lokasi dengan aduan terbanyak: <b>${esc(bs[0][0])}</b> (${N(bs[0][1])}, ${P(bs[0][1] / RF.length * 100)}).`, 'Bahagian pertama medan lokasi');
    // 8. kualiti data
    const tl = RF.filter(r => r.blok === 'Tiada lokasi').length, dp = RF.filter(r => r.dup).length;
    const tsTerima = RF.filter(r => !r.buka && !r.tarikh_terima).length;
    const notaQ = [];
    if (tl) notaQ.push(`${N(tl)} tiket tiada lokasi`);
    if (dp) notaQ.push(`${N(dp)} kemungkinan pendua`);
    if (tsTerima) notaQ.push(`${N(tsTerima)} tiket selesai tanpa tarikh terima (masa respons pertama tidak dikira)`);
    if (notaQ.length) add('kurang', '🔎', 'Perhatian kualiti data: ' + notaQ.join('; ') + '.', 'Kiraan terus daripada medan lokasi, penanda pendua dan tarikh_terima');
    el.innerHTML = `<h2>Analisis &amp; Insight</h2><div class="sub-tajuk">Dijana secara automatik daripada data dalam penapis semasa. Setiap dapatan menyatakan asas pengiraan.</div>
      <div class="dsb-insight">${out.map(i => `<div class="i ${i.jenis}"><span class="ik" aria-hidden="true">${i.ik}</span><div>${i.teks}<small>Asas: ${i.asas}</small></div></div>`).join('')}</div>`;
  }

  /* ---------- Jadual terperinci ---------- */
  const LAJUR = [
    ['tiket_id', 'No. tiket', (a, b) => a.tiket_id.localeCompare(b.tiket_id)],
    ['d', 'Tarikh aduan', (a, b) => a.ms - b.ms],
    ['kat', 'Kategori', (a, b) => a.kategori_id.localeCompare(b.kategori_id)],
    ['blok', 'Lokasi', (a, b) => (a.lokasi || '').localeCompare(b.lokasi || '')],
    ['tajuk', 'Tajuk', (a, b) => (a.tajuk || '').localeCompare(b.tajuk || '')],
    ['kes', 'Kesegeraan', (a, b) => (KES_RANK[a.kesegeraan] || 0) - (KES_RANK[b.kesegeraan] || 0)],
    ['pic', 'Pengendali', (a, b) => a.pic.localeCompare(b.pic)],
    ['status', 'Status', (a, b) => a.status.localeCompare(b.status)],
    ['tempoh', 'Tempoh (hari)', (a, b) => (a.tempoh == null ? -1 : a.tempoh) - (b.tempoh == null ? -1 : b.tempoh)]
  ];
  function lajurTapis(RF) {
    let r = T.khas ? RF.filter(KHAS[T.khas].f) : RF;
    if (T.q) { const q = T.q.toLowerCase(); r = r.filter(x => x.cari.includes(q)); }
    const l = LAJUR.find(x => x[0] === T.sort) || LAJUR[1];
    return [...r].sort((a, b) => l[2](a, b) * T.dir || a.ms - b.ms);
  }
  function lukisJadual(RF) {
    const el = $d('dsb-jadual'); if (!el) return;
    const rows = lajurTapis(RF);
    const hal = Math.max(1, Math.ceil(rows.length / T.per)); T.page = Math.min(T.page, hal);
    const mula = (T.page - 1) * T.per, papar = rows.slice(mula, mula + T.per);
    el.innerHTML = `<div class="dsb-kepala"><div><h2>Jadual rekod terperinci</h2><div class="sub-tajuk" style="margin:0">Klik tajuk lajur untuk menyusun. Klik baris untuk butiran penuh (admin).</div></div></div>
      <div class="dsb-aktif" style="margin:0 0 6px">${T.khas ? `<span class="lbl">Paparan jadual:</span><span class="dsb-chip">${esc(KHAS[T.khas].label)}<button type="button" id="dsb-buang-khas" aria-label="Buang paparan khas">×</button></span>` : ''}</div>
      <div class="dsb-bar-tbl"><input type="search" id="dsb-q" placeholder="Cari no. tiket, ID HESK, tajuk, lokasi" value="${esc(T.q)}" aria-label="Carian segera"><span class="nota" style="margin:0">${N(rows.length)} rekod${rows.length !== RF.length ? ' (daripada ' + N(RF.length) + ' dalam penapis)' : ''}</span></div>
      ${papar.length ? `<div class="dsb-wrap"><table class="dsb-tbl kad-mobile"><thead><tr>${LAJUR.map(l => `<th class="sort" data-s="${l[0]}" aria-sort="${T.sort === l[0] ? (T.dir > 0 ? 'ascending' : 'descending') : 'none'}">${l[1]}<span class="ar">${T.sort === l[0] ? (T.dir > 0 ? '▲' : '▼') : ''}</span></th>`).join('')}</tr></thead><tbody>
        ${papar.map(r => `<tr class="klik" tabindex="0" role="button" data-id="${esc(r.tiket_id)}">
          <td class="mono utama" data-l="Tiket">${esc(r.tiket_id)}${r.dup ? ' <span title="Kemungkinan pendua" class="lencana s-PerlukanMasa">pendua?</span>' : ''}</td><td class="mono" data-l="Tarikh">${fmtD(r.d)}</td><td data-l="Kategori">${esc(r.kategori_id)}</td>
          <td data-l="Lokasi">${esc(r.lokasi || '-')}</td><td data-l="Tajuk">${esc(r.tajuk || '(tiada tajuk)')}</td><td data-l="Kesegeraan">${esc(r.kesegeraan)}</td><td data-l="Pengendali">${esc(r.pic)}</td>
          <td data-l="Status">${lencana(r.status)}</td><td class="num" data-l="Tempoh">${r.tempoh == null ? '-' : (r.buka ? `<span class="${r.umur > PERATURAN.tertunggakHari ? 'dsb-bad' : ''}">${r.umur} (terbuka)</span>` : fmtHari(r.hari))}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="dsb-page"><span>Halaman ${T.page} / ${hal} · ${N(mula + 1)}–${N(mula + papar.length)} daripada ${N(rows.length)}</span><span style="display:flex;gap:8px"><button class="btn sekunder" id="dsb-prev" type="button" ${T.page <= 1 ? 'disabled' : ''}>← Sebelum</button><button class="btn sekunder" id="dsb-next" type="button" ${T.page >= hal ? 'disabled' : ''}>Seterusnya →</button></span></div>`
        : '<div class="dsb-keadaan">Tiada rekod sepadan dengan carian atau paparan ini.</div>'}`;
    const q = $d('dsb-q');
    q.oninput = () => { T.q = q.value; T.page = 1; clearTimeout(q._t); q._t = setTimeout(() => { lukisJadual(RF); const n = $d('dsb-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 220); };
    if ($d('dsb-buang-khas')) $d('dsb-buang-khas').onclick = () => { T.khas = ''; T.page = 1; lukisJadual(RF); };
    el.querySelectorAll('th.sort').forEach(th => th.onclick = () => { if (T.sort === th.dataset.s) T.dir *= -1; else { T.sort = th.dataset.s; T.dir = (th.dataset.s === 'd' || th.dataset.s === 'tempoh' || th.dataset.s === 'kes') ? -1 : 1; } T.page = 1; lukisJadual(RF); });
    el.querySelectorAll('tr.klik').forEach(tr => { tr.onclick = () => lihatButiran(tr.dataset.id); tr.onkeydown = e => { if (e.key === 'Enter') lihatButiran(tr.dataset.id); }; });
    if ($d('dsb-prev')) { $d('dsb-prev').onclick = () => { T.page--; lukisJadual(RF); el.scrollIntoView({ block: 'start' }); }; $d('dsb-next').onclick = () => { T.page++; lukisJadual(RF); el.scrollIntoView({ block: 'start' }); }; }
  }

  // Butiran penuh (termasuk data peribadi) diambil melalui action 'search' sedia ada; disahkan backend.
  async function lihatButiran(id) {
    if (!ARK) { toast('Sesi arkib tamat. Sila log masuk semula.'); return; }
    try {
      const r = await apiArk('search', { token: ARK.token, q: id, dari: '', hingga: '', kategori: '', status: '' });
      const i = r.rows.findIndex(x => x.tiket_id === id);
      if (i < 0) { toast('Butiran ' + id + ' tidak dijumpai.'); return; }
      ARK_ROWS = r.rows; bukaArkib(i);
    } catch (e) { toast(e.message); }
  }

  /* ---------- Eksport CSV (tanpa data peribadi) ---------- */
  function eksportCSV() {
    if (!DIMUAT) return;
    const rows = lajurTapis(tapis(SEMUA, F));
    if (!rows.length) { toast('Tiada rekod untuk dieksport.'); return; }
    const kolum = [['tiket_id', r => r.tiket_id], ['id_hesk', r => r.trackid_hesk], ['tarikh_aduan_myt', r => r.d], ['kategori', r => r.kategori_id], ['lokasi', r => r.lokasi], ['blok', r => r.blok], ['tajuk', r => r.tajuk],
      ['kesegeraan', r => r.kesegeraan], ['pengendali', r => r.pic], ['status', r => r.status], ['tarikh_selesai_myt', r => r.dS], ['umur_hari_terbuka', r => r.umur == null ? '' : r.umur], ['masa_selesai_hari', r => r.hari == null ? '' : Math.round(r.hari * 100) / 100], ['bil_log', r => r.bil_log], ['kemungkinan_pendua', r => r.dup ? 1 : 0]];
    const sel = v => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [kolum.map(k => k[0]).join(',')].concat(rows.map(r => kolum.map(k => sel(k[1](r))).join(','))).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'arkib_hesk_' + hariIni().replace(/-/g, '') + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast(N(rows.length) + ' rekod dieksport.');
  }

  /* ---------- API awam untuk index.html ---------- */
  window.DashArkib = {
    muat: () => muat(false),
    tanda_basi: () => { BASI = true; },
    reset: () => { SEMUA = []; DIMUAT = false; BASI = false; resetF(); resetT(); GRAN = null; if (CHART) { CHART.destroy(); CHART = null; } const r = $d('sub-dash'); if (r) { r.innerHTML = ''; delete r.dataset.siap; } },
    // untuk ujian automatik
    _state: () => ({ F, T, rows: SEMUA.length }),
    _tapis: () => tapis(SEMUA, F)
  };
})();
