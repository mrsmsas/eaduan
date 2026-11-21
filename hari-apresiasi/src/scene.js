// Scene Three.js deterministik: renderAt(t) -> satu frame. Tiada state antara frame,
// jadi sesuai untuk Remotion (frame/fps), Hyperframes (GSAP seek) dan preview biasa.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import defaultConfig from './config.js';

export const DURATION = 30;
export const W = 720, H = 1280;
const CX = 360, CY = 640; // pusat layout (px reka bentuk)

// ---------- helper masa / easing ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const sm = (x) => x * x * (3 - 2 * x);
const eo3 = (x) => 1 - Math.pow(1 - x, 3);
const eio3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eob = (x) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
const rad = (d) => (d * Math.PI) / 180;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- palet (disampel daripada video asal) ----------
const C = {
  maroon1: '#8d2a3d', maroon2: '#68122a', maroonDeep: '#450b16',
  cream1: '#fdfaf3', cream2: '#f3ebdc', creamEdge: '#e8dcc6',
  gold1: '#f6dd93', gold2: '#d6ac57', gold3: '#b38836',
  ink: '#6e1226', white: '#fbf6ec',
};

// ---------- tarikh / countdown ----------
const MS = ['JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN', 'JULAI', 'OGOS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER'];
const HARI = ['AHAD', 'ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT', 'SABTU'];
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return { y, m: m - 1, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; }
function daysLeft(cfg) {
  if (cfg.countdown.daysLeft != null) return cfg.countdown.daysLeft;
  const e = parseDate(cfg.event.date); const t = parseDate(cfg.countdown.today);
  return Math.round((Date.UTC(e.y, e.m, e.d) - Date.UTC(t.y, t.m, t.d)) / 864e5);
}

// ---------- font ----------
async function loadFonts(base) {
  const P = 'Playfair Display', J = 'Plus Jakarta Sans';
  const defs = [
    [P, 600, 'normal', 'playfair-display-latin-600-normal'], [P, 700, 'normal', 'playfair-display-latin-700-normal'],
    [P, 800, 'normal', 'playfair-display-latin-800-normal'], [P, 900, 'normal', 'playfair-display-latin-900-normal'],
    [P, 600, 'italic', 'playfair-display-latin-600-italic'], [P, 700, 'italic', 'playfair-display-latin-700-italic'],
    [J, 500, 'normal', 'plus-jakarta-sans-latin-500-normal'], [J, 600, 'normal', 'plus-jakarta-sans-latin-600-normal'],
    [J, 700, 'normal', 'plus-jakarta-sans-latin-700-normal'], [J, 800, 'normal', 'plus-jakarta-sans-latin-800-normal'],
  ];
  await Promise.all(defs.map(async ([fam, weight, style, file]) => {
    const f = new FontFace(fam, `url(${base}/fonts/${file}.woff2)`, { weight: String(weight), style });
    await f.load(); document.fonts.add(f);
  }));
}
const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

// ---------- helper canvas ----------
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function T(ctx, s, x, y, o) {
  ctx.save();
  ctx.font = `${o.style || ''} ${o.weight || 400} ${o.size}px "${o.font || 'Plus Jakarta Sans'}"`.trim();
  ctx.fillStyle = o.color; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.shadow) { ctx.shadowColor = o.shadow[0]; ctx.shadowBlur = o.shadow[1]; }
  ctx.fillText(s, x, y); ctx.restore();
}
function goldGrad(ctx, x0, y0, x1, y1) { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, C.gold1); g.addColorStop(0.5, C.gold2); g.addColorStop(1, C.gold3); return g; }
function bgCream(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w * 0.4, h); g.addColorStop(0, C.cream1); g.addColorStop(1, C.cream2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = C.creamEdge; ctx.lineWidth = 1.2; rr(ctx, 3, 3, w - 6, h - 6, 17); ctx.stroke();
}
function bgMaroon(ctx, w, h, lattice = true) {
  const g = ctx.createLinearGradient(0, 0, w * 0.6, h); g.addColorStop(0, C.maroon1); g.addColorStop(1, C.maroon2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (lattice) {
    ctx.save(); ctx.strokeStyle = 'rgba(238,200,140,0.10)'; ctx.lineWidth = 1;
    for (let i = -h; i < w + h; i += 22) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke(); }
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(235,196,120,0.45)'; ctx.lineWidth = 1.2; rr(ctx, 4, 4, w - 8, h - 8, 16); ctx.stroke();
}

// ---------- maskot (kartun warga emas berkaca mata, baju biru) ----------
function drawMascot(pose) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const skin = '#f6dcc8', blue = '#3f74c2', blue2 = '#6da0e6', hair = '#efeae5';
  const arm = (x0, y0, x1, y1) => { g.lineCap = 'round'; g.strokeStyle = blue; g.lineWidth = 22; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.fillStyle = skin; g.beginPath(); g.arc(x1, y1, 12, 0, 7); g.fill(); };
  if (pose === 'jump') { arm(92, 172, 56, 118); arm(164, 172, 200, 118); }
  else if (pose === 'wave') { arm(92, 178, 70, 214); arm(164, 172, 202, 120); }
  else { arm(92, 178, 74, 214); arm(164, 178, 182, 214); }
  // badan
  const bg = g.createLinearGradient(0, 150, 0, 236); bg.addColorStop(0, blue2); bg.addColorStop(1, blue);
  g.fillStyle = bg; g.beginPath(); g.roundRect(84, 150, 88, 84, 26); g.fill();
  g.fillStyle = '#fff'; g.globalAlpha = 0.85; g.beginPath(); g.roundRect(120, 168, 22, 28, 4); g.fill(); g.globalAlpha = 1; // buku/lencana
  // rambut tepi
  g.fillStyle = hair; g.beginPath(); g.arc(78, 100, 20, 0, 7); g.arc(178, 100, 20, 0, 7); g.arc(92, 66, 22, 0, 7); g.arc(164, 66, 22, 0, 7); g.fill();
  // kepala
  g.fillStyle = skin; g.beginPath(); g.arc(128, 102, 54, 0, 7); g.fill();
  g.fillStyle = hair; g.beginPath(); g.ellipse(128, 58, 38, 14, 0, 0, 7); g.fill();
  // pipi
  g.fillStyle = 'rgba(240,150,140,.45)'; g.beginPath(); g.arc(96, 122, 10, 0, 7); g.arc(160, 122, 10, 0, 7); g.fill();
  // cermin mata
  g.lineWidth = 4.5; g.strokeStyle = '#3a3f4a'; g.fillStyle = 'rgba(205,230,255,.55)';
  for (const x of [106, 150]) { g.beginPath(); g.arc(x, 104, 19, 0, 7); g.fill(); g.stroke(); }
  g.beginPath(); g.moveTo(125, 102); g.lineTo(131, 102); g.stroke();
  // mata senyum
  g.lineWidth = 4; g.strokeStyle = '#2b2b33'; g.beginPath(); g.arc(106, 108, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(150, 108, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  // mulut
  g.beginPath(); g.arc(128, 128, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  return c;
}

// ---------- konfigurasi layout (px reka bentuk 720x1280) ----------
const L = {
  header: [76, 76, 568, 168], cal: [68, 258, 282, 250], trophy: [370, 258, 280, 248], logo: [68, 528, 282, 244],
  map: [368, 526, 288, 248], award: [56, 794, 294, 258], pagi: [370, 794, 140, 122], onduty: [520, 794, 140, 122],
  guests: [370, 928, 142, 122], check: [520, 928, 144, 124], banner: [52, 1070, 616, 162],
};

// ---------- kamera ----------
// [t, targetX, targetY (px reka bentuk), D, pitch°, yaw°, roll°, ease]
const CAM = [
  [0.0, 360, 640, 2800, 22, 0, 6, 'io'],
  [2.6, 360, 640, 2350, 20, 0, 5, 'io'],
  [3.6, 360, 640, 2300, 20, 0, 5, 'lin'],
  [5.0, 360, 640, 2000, 26, 0, 4, 'io'],
  [6.2, 209, 383, 720, 44, 0, 18, 'io'],
  [8.8, 200, 390, 680, 46, 0, 16, 'lin'],
  [9.4, 480, 400, 760, 44, 0, -14, 'io'],
  [12.4, 500, 380, 740, 44, 0, -12, 'lin'],
  [13.9, 203, 930, 800, 44, 0, 8, 'io'],
  [17.4, 205, 920, 780, 46, 0, 10, 'lin'],
  [18.5, 512, 650, 760, 44, 0, -19, 'io'],
  [22.5, 500, 660, 720, 44, 0, -17, 'lin'],
  [23.3, 515, 925, 1000, 44, 0, -10, 'io'],
  [24.3, 500, 950, 1100, 40, 0, -8, 'lin'],
  [25.4, 360, 700, 1900, 26, 0, -5, 'io'],
  [26.2, 360, 640, 1800, 8, 0, 0, 'io'],
  [27.0, 360, 640, 1758, 0, 0, 0, 'io'],
  [30.0, 360, 640, 1758, 0, 0, 0, 'lin'],
];
function camAt(t) {
  let i = 0; while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1]; let u = seg(t, a[0], b[0]); u = b[7] === 'io' ? eio3(u) : u;
  return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), D: Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u)), pitch: lerp(a[4], b[4], u), yaw: lerp(a[5], b[5], u), roll: lerp(a[6], b[6], u) };
}

// ---------- maskot: titik henti ----------
const STOPS = [
  { a: 3.0, d: 5.4, x: 626, y: 80, pose: 'wave' },
  { a: 5.9, d: 8.5, x: 332, y: 270, pose: 'sit' },
  { a: 9.2, d: 10.0, x: 400, y: 262, pose: 'jump' },
  { a: 10.7, d: 13.3, x: 636, y: 492, pose: 'sit' },
  { a: 13.9, d: 17.8, x: 340, y: 960, pose: 'wave' },
  { a: 18.4, d: 22.9, x: 640, y: 548, pose: 'sit' },
  { a: 23.4, d: 26.6, x: 640, y: 548, pose: 'wave' },
  { a: 27.2, d: 28.0, x: 352, y: 1000, pose: 'jump' },
  { a: 28.7, d: 99, x: 640, y: 1214, pose: 'sit' },
];

// =====================================================================
export async function createScene({ canvas, width = W, height = H, assetBase = '.', config = {} } = {}) {
  const cfg = { ...defaultConfig, ...config, header: { ...defaultConfig.header, ...config.header }, event: { ...defaultConfig.event, ...config.event }, stats: { ...defaultConfig.stats, ...config.stats }, countdown: { ...defaultConfig.countdown, ...config.countdown } };
  await loadFonts(assetBase);
  const logoImg = await loadImage(`${assetBase}/${cfg.org.logo}`);
  const ev = parseDate(cfg.event.date), left = daysLeft(cfg);
  const S = 3; // skala tekstur

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;

  // latar (cream + vinjet)
  const bg = document.createElement('canvas'); bg.width = 360; bg.height = 640; { const g = bg.getContext('2d'); const rg = g.createRadialGradient(180, 250, 20, 180, 320, 480); rg.addColorStop(0, '#f4ecdf'); rg.addColorStop(0.55, '#e8dccd'); rg.addColorStop(1, '#bfa99a'); g.fillStyle = rg; g.fillRect(0, 0, 360, 640); }
  const bgTex = new THREE.CanvasTexture(bg); bgTex.colorSpace = THREE.SRGBColorSpace; scene.background = bgTex;

  const camera = new THREE.PerspectiveCamera(40, width / height, 20, 9000);
  const pivot = new THREE.Group(); pivot.rotation.order = 'ZXY'; scene.add(pivot);
  const board = new THREE.Group(); pivot.add(board);

  // lantai penerima bayang
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.ShadowMaterial({ opacity: 0.28, color: 0x3a2a20 }));
  floor.receiveShadow = true; floor.position.z = -0.5; board.add(floor);

  // cahaya
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xcdb9a6, 0.7));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.5); sun.position.set(-520, 760, 1000); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -1000, right: 1000, top: 1100, bottom: -1100, near: 100, far: 3200 });
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.radius = 5; sun.shadow.normalBias = 0.6;
  board.add(sun); board.add(sun.target);

  // ---------- tile ----------
  const DEPTH = 12, BEV = 2.5;
  function roundedShape(w, h, r) { const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2); s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5); return s; }
  function faceGeo(w, h, r) { const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 16); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h); return g; }
  const ghostTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.filter = 'blur(7px)'; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(22, 22, 84, 84, 16); g.fill(); const t = new THREE.CanvasTexture(c); return t; })();

  const tiles = [];
  function addTile(id, kind, [x, y, w, h], appear, draw, anim = [], opts = {}) {
    const cv = document.createElement('canvas'); cv.width = Math.round(w * S); cv.height = Math.round(h * S); const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const sideColor = kind === 'maroon' ? 0x6b1428 : kind === 'gold' ? 0xc8a24f : 0xf1e8d6;
    const side = new THREE.MeshStandardMaterial({ color: sideColor, roughness: kind === 'gold' ? 0.3 : 0.55, metalness: kind === 'gold' ? 0.7 : 0.0 });
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedShape(w, h, 22), { depth: DEPTH, bevelEnabled: true, bevelSize: BEV, bevelThickness: BEV, bevelSegments: 3, curveSegments: 10 }), side);
    body.castShadow = true; body.receiveShadow = true;
    const front = new THREE.Mesh(faceGeo(w - 2 * BEV, h - 2 * BEV, 19.5), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0 }));
    front.position.z = DEPTH + BEV + 0.06; front.receiveShadow = true;
    const g = new THREE.Group(); g.add(body, front);
    const slot = new THREE.Group(); slot.position.set(x + w / 2 - CX, CY - (y + h / 2), 0); slot.add(g); board.add(slot);
    const ghost = new THREE.Mesh(new THREE.PlaneGeometry(w + 70, h + 70), new THREE.MeshBasicMaterial({ map: ghostTex, color: 0x6f6862, transparent: true, opacity: 0, depthWrite: false })); ghost.position.set(0, 0, 1); slot.add(ghost);
    const tile = { id, w, h, x, y, kind, appear, draw, anim, ctx, tex, slot, g, front, ghost, key: null, ...opts };
    tiles.push(tile); return tile;
  }
  const byId = (id) => tiles.find((t) => t.id === id);

  // ===== kandungan setiap tile =====
  const sT = cfg.stats;
  // header
  addTile('header', 'maroon', L.header, 1.0, (g, w, h, t) => {
    bgMaroon(g, w, h);
    const a1 = eo3(seg(t, 3.0, 3.5)), a2 = eo3(seg(t, 3.3, 3.9)), a3 = eo3(seg(t, 3.7, 4.2)), a4 = eo3(seg(t, 4.0, 4.6));
    T(g, cfg.header.pre, w / 2, 40, { font: 'Playfair Display', style: 'italic', weight: 600, size: 29, color: C.gold1, align: 'center', alpha: a1 });
    g.save(); g.globalAlpha = a2; T(g, cfg.header.main, w / 2, 100 + (1 - a2) * 8, { font: 'Playfair Display', weight: 700, size: 56, color: goldGrad(g, 0, 60, 0, 104), align: 'center', ls: 1, shadow: ['rgba(0,0,0,.35)', 4] }); g.restore();
    T(g, cfg.header.sub, w / 2, 132, { weight: 600, size: 13.5, color: 'rgba(250,240,225,.85)', align: 'center', ls: 4.5, alpha: a3 });
    T(g, cfg.header.tagline, w / 2, 153, { font: 'Playfair Display', style: 'italic', weight: 600, size: 14.5, color: 'rgba(245,225,190,.8)', align: 'center', alpha: a4 });
  }, [[3.0, 4.7]]);

  // kalendar
  const firstDow = new Date(Date.UTC(ev.y, ev.m, 1)).getUTCDay(), dim = new Date(Date.UTC(ev.y, ev.m + 1, 0)).getUTCDate();
  addTile('cal', 'maroon', L.cal, 1.3, (g, w, h, t) => {
    bgMaroon(g, w, h);
    T(g, `${MS[ev.m]} ${ev.y}`, 28, 36, { font: 'Playfair Display', weight: 700, size: 17.5, color: goldGrad(g, 0, 20, 0, 40), ls: 2 });
    'AISRKJS'.split('').forEach((c, i) => T(g, c, 42 + i * 33.7, 60, { weight: 700, size: 10, color: 'rgba(250,235,210,.75)', align: 'center' }));
    for (let d = 1; d <= dim; d++) { const idx = firstDow + d - 1, col = idx % 7, row = Math.floor(idx / 7); const x = 42 + col * 33.7, y = 92 + row * 28.5; if (d === ev.d) continue; T(g, String(d), x, y, { weight: 600, size: 13, color: C.white, align: 'center' }); }
    const idx = firstDow + ev.d - 1, cx = 42 + (idx % 7) * 33.7, cy = 88 + Math.floor(idx / 7) * 28.5;
    const ring = eio3(seg(t, 6.5, 7.2)), fill = seg(t, 7.0, 7.3);
    if (fill > 0) { g.save(); g.globalAlpha = fill; g.fillStyle = '#5a0f22'; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.fill(); g.restore(); }
    if (ring > 0) { g.save(); g.strokeStyle = goldGrad(g, cx - 16, cy - 16, cx + 16, cy + 16); g.lineWidth = 2.6; g.lineCap = 'round'; g.shadowColor = 'rgba(255,215,120,.7)'; g.shadowBlur = 5; g.beginPath(); g.arc(cx, cy, 15, -Math.PI * 0.6, -Math.PI * 0.6 + Math.PI * 2 * ring); g.stroke(); g.restore(); }
    T(g, String(ev.d), cx, cy + 5, { weight: 800, size: 13.5, color: ring > 0.6 ? C.gold1 : '#fff', align: 'center' });
    const pp = eo3(seg(t, 7.3, 7.9));
    if (pp > 0) { g.save(); g.globalAlpha = pp; g.translate(0, (1 - pp) * 10); const pg = goldGrad(g, 90, 200, 270, 232); g.fillStyle = pg; rr(g, 96, 201, 170, 31, 15.5); g.fill(); T(g, `${HARI[ev.dow]} · ${cfg.event.time}`, 181, 221.5, { weight: 800, size: 12.5, color: '#4a0d1c', align: 'center', ls: 1 }); g.restore(); }
  }, [[6.5, 7.95]]);

  // trophy / kaunter
  const K = sT.counter, V1 = K.value1, V2 = K.value2;
  const cnt = [[0, 0], [9.2, 0], [9.5, V1 * 0.135], [10.0, V1 * 0.79], [10.5, V1 * 0.985], [11.0, V1], [11.4, V1], [11.55, V2 * 0.656], [12.0, V2 * 0.96], [12.45, V2]];
  const fmtTime = (m) => `${Math.floor(m / 60)}.${String(m % 60).padStart(2, '0')}`;
  const countAt = (t) => { for (let i = 0; i < cnt.length - 1; i++) if (t < cnt[i + 1][0]) return lerp(cnt[i][1], cnt[i + 1][1], sm(seg(t, cnt[i][0], cnt[i + 1][0]))); return cnt[cnt.length - 1][1]; };
  addTile('trophy', 'cream', L.trophy, 0.9, (g, w, h, t) => {
    bgCream(g, w, h); const phase2 = t >= 11.4; const v = Math.round(countAt(t));
    T(g, phase2 ? K.label2 : K.label1, 20, 38, { weight: 800, size: 12.5, color: C.ink, ls: 3 });
    T(g, fmtTime(v), 258, 130, { font: 'Playfair Display', weight: 800, size: 60, color: C.ink, align: 'right' });
    T(g, phase2 ? K.unit2 : K.unit1, 260, 158, { weight: 600, size: 13, color: '#2a1a1a', align: 'right', alpha: phase2 ? eo3(seg(t, 11.4, 11.8)) : eo3(seg(t, 9.6, 10.0)) });
    g.fillStyle = '#e4dccb'; rr(g, 145, 211, 118, 8, 4); g.fill();
    const prog = v / V2; if (prog > 0.003) { g.fillStyle = goldGrad(g, 145, 0, 263, 0); rr(g, 145, 211, 118 * clamp(prog), 8, 4); g.fill(); }
  }, [[9.2, 12.5]]);

  // logo
  addTile('logo', 'cream', L.logo, 0.5, (g, w, h) => {
    bgCream(g, w, h); const r = Math.min(w * 0.76 / logoImg.width, h * 0.74 / logoImg.height); const lw = logoImg.width * r, lh = logoImg.height * r;
    g.drawImage(logoImg, (w - lw) / 2, (h - lh) / 2, lw, lh);
  });

  // peta
  addTile('map', 'maroon', L.map, 1.6, (g, w, h, t) => {
    bgMaroon(g, w, h, false);
    g.save(); g.strokeStyle = 'rgba(232,180,130,.55)'; g.lineWidth = 2.2;
    for (let i = -1; i < 9; i++) { g.beginPath(); for (let y = 0; y <= h; y += 8) { const x = i * 40 + 6 + Math.sin(y * 0.03 + i) * 5 + y * 0.06 * Math.sin(i); y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    for (let j = 0; j < 7; j++) { g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = j * 38 + 14 + Math.sin(x * 0.025 + j * 1.7) * 6 + x * 0.05 * Math.cos(j); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    g.restore();
    g.save(); g.strokeStyle = 'rgba(238,200,140,.10)'; g.lineWidth = 1; for (let i = -h; i < w + h; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); } g.restore();
    const p = eio3(seg(t, 18.4, 20.3));
    const path = new Path2D(); path.moveTo(16, 248); path.bezierCurveTo(60, 150, 100, 160, 120, 108); path.bezierCurveTo(138, 70, 160, 88, 178, 66);
    if (p > 0) { g.save(); g.lineCap = 'round'; g.lineWidth = 3.4; g.strokeStyle = goldGrad(g, 0, 250, 180, 60); g.shadowColor = 'rgba(255,215,120,.9)'; g.shadowBlur = 7; g.setLineDash([320 * p, 1000]); g.stroke(path); g.restore(); }
    const pd = seg(t, 20.2, 20.75);
    if (pd > 0) {
      const py = 54 - (1 - eob(pd)) * 46; g.save(); g.strokeStyle = 'rgba(255,225,150,.55)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(178, 76, 14 + 26 * pd, 6 + 10 * pd, 0, 0, 7); g.globalAlpha = 1 - pd * 0.5; g.stroke(); g.restore();
      g.save(); g.translate(178, py); g.fillStyle = goldGrad(g, -12, -22, 12, 22); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 5; g.beginPath(); g.moveTo(0, 24); g.bezierCurveTo(-20, 2, -14, -22, 0, -22); g.bezierCurveTo(14, -22, 20, 2, 0, 24); g.fill(); g.shadowBlur = 0; g.fillStyle = '#5a0f22'; g.beginPath(); g.arc(0, -6, 6.5, 0, 7); g.fill(); g.restore();
    }
    const ta = eo3(seg(t, 20.0, 20.7)); g.save(); g.translate(0, (1 - ta) * 8);
    T(g, cfg.event.venue, 24, 192, { font: 'Playfair Display', weight: 800, size: 25, color: goldGrad(g, 0, 170, 0, 195), ls: 1.5, alpha: ta, shadow: ['rgba(0,0,0,.4)', 4] });
    T(g, cfg.event.venueSub, 24, 216, { weight: 700, size: 11.5, color: '#fff', ls: 2.2, alpha: ta }); g.restore();
  }, [[18.4, 20.8]]);

  // anugerah (kad krim) -> tokoh murid (kad maroon)
  const FLIP = [15.7, 16.2], SWAP = 15.95;
  const awardKey = (t) => (t < 14.4 ? 0 : t < 14.9 ? 1 : t < 15.4 ? 2 : 3);
  const drawAward = (g, w, h, i, dy, a) => { const it = sT.agenda[i]; g.save(); g.translate(0, dy); g.globalAlpha = a;
    T(g, 'ATUR CARA', 20, 34, { weight: 800, size: 11, color: C.ink, ls: 3 });
    it.lines.forEach((ln, k) => T(g, ln, 24, 76 + k * 24 - (it.lines.length > 1 ? 14 : 0), { font: 'Playfair Display', weight: 700, size: it.lines.length > 1 ? 21 : 23, color: C.ink }));
    g.font = '800 58px "Playfair Display"'; const bw = g.measureText(it.big).width;
    T(g, it.big, 24, 218, { font: 'Playfair Display', weight: 800, size: 58, color: goldGrad(g, 0, 170, 0, 222) });
    T(g, it.unit, 24 + bw + 10, 218, { weight: 600, size: 13, color: '#251818' }); g.restore(); };
  addTile('award', 'cream', L.award, 1.8, (g, w, h, t) => {
    const tokoh = t >= SWAP;
    if (!tokoh) { bgCream(g, w, h); const i = awardKey(t); const sw = [14.4, 14.9, 15.4]; let tr = 1, prev = null; for (let k = 0; k < 3; k++) if (t >= sw[k] && t < sw[k] + 0.28) { tr = seg(t, sw[k], sw[k] + 0.28); prev = k; }
      if (prev !== null) { drawAward(g, w, h, prev, -eo3(tr) * 26, 1 - tr); drawAward(g, w, h, i, (1 - eo3(tr)) * 26, tr); } else drawAward(g, w, h, i, 0, 1); }
    else {
      bgMaroon(g, w, h); const k = sT.highlight;
      T(g, k.label, 24, 38, { weight: 800, size: 12, color: C.gold1, ls: 3 });
      k.title.forEach((ln, j) => T(g, ln, 24, 92 + j * 36, { font: 'Playfair Display', weight: 800, size: 32, color: goldGrad(g, 0, 70, 0, 130), shadow: ['rgba(0,0,0,.4)', 3] }));
      g.save(); g.translate(246, 64); g.rotate(Math.sin(t * 2) * 0.05); g.shadowColor = 'rgba(255,205,110,.85)'; g.shadowBlur = 22 + 8 * Math.sin(t * 3); g.fillStyle = goldGrad(g, -40, -40, 40, 40);
      g.beginPath(); for (let q = 0; q < 10; q++) { const rr2 = q % 2 ? 11 : 27, an = -Math.PI / 2 + q * Math.PI / 5; g.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2); } g.closePath(); g.fill(); g.restore();
      T(g, k.note1, 22, 208, { weight: 600, size: 14, color: C.white }); T(g, k.note2, 22, 230, { weight: 600, size: 14, color: C.white });
      const sh = seg(t, 16.35, 16.95); if (sh > 0 && sh < 1) { g.save(); rr(g, 3, 3, w - 6, h - 6, 17); g.clip(); const x = lerp(-120, w + 80, sh); const gr = g.createLinearGradient(x - 50, 0, x + 50, h * 0.5); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.30)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.restore(); }
    }
  }, [[13.9, 17.0]], { flip: FLIP, swap: SWAP });

  // tile kecil
  const clockIcon = (g, x, y, a) => { g.save(); g.globalAlpha = a; g.strokeStyle = C.gold1; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y, 8.5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x, y); g.lineTo(x + 4, y + 2); g.stroke(); g.restore(); };
  const checkIcon = (g, x, y, a) => { g.save(); g.globalAlpha = a; g.strokeStyle = C.gold1; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 1, y + 3.5); g.lineTo(x + 5, y - 3.5); g.stroke(); g.restore(); };
  addTile('pagi', 'maroon', L.pagi, 1.7, (g, w, h, t) => { bgMaroon(g, w, h); const a = eo3(seg(t, 23.3, 23.8)); clockIcon(g, 24, 24, a);
    T(g, sT.pagi.big, 14, 60, { font: 'Playfair Display', weight: 800, size: 17.5, color: goldGrad(g, 0, 46, 0, 64) }); sT.pagi.label.forEach((ln, i) => T(g, ln, 14, 79 + i * 13.5, { weight: 600, size: 11.2, color: C.white })); }, [[23.3, 23.9]]);
  addTile('onduty', 'cream', L.onduty, 2.0, (g, w, h) => { bgCream(g, w, h); T(g, sT.tile3.n, 16, 50, { font: 'Playfair Display', weight: 800, size: 33, color: C.ink }); sT.tile3.label.forEach((ln, i) => T(g, ln, 16, 76 + i * 14, { weight: 600, size: 11.2, color: '#2a1a1a' })); });
  addTile('guests', 'cream', L.guests, 2.1, (g, w, h) => { bgCream(g, w, h); T(g, sT.tile4.n, 16, 52, { font: 'Playfair Display', weight: 800, size: 27, color: C.ink }); sT.tile4.label.forEach((ln, i) => T(g, ln, 16, 78 + i * 14, { weight: 600, size: 11.2, color: '#2a1a1a' })); });
  addTile('check', 'maroon', L.check, 2.2, (g, w, h, t) => { bgMaroon(g, w, h); checkIcon(g, 24, 24, eo3(seg(t, 23.5, 24.0))); T(g, sT.tile5.title, 16, 72, { font: 'Playfair Display', weight: 800, size: 27, color: goldGrad(g, 0, 50, 0, 76), ls: 0.5 }); sT.tile5.label.forEach((ln, i) => T(g, ln, 16, 92 + i * 13.5, { weight: 600, size: 11, color: C.white })); }, [[23.5, 24.1]]);

  // banner countdown
  const bannerTxt = left > 1 ? `${left} HARI LAGI` : left === 1 ? 'ESOK' : left === 0 ? 'HARI INI' : 'TERIMA KASIH';
  const bannerSub = `${HARI[ev.dow]}, ${ev.d} ${MS[ev.m]} ${ev.y} · ${cfg.event.footerVenue}`;
  const banner = addTile('banner', 'gold', L.banner, 99, (g, w, h, t) => {
    const gr = g.createLinearGradient(0, 0, w * 0.15, h); gr.addColorStop(0, '#f1d58b'); gr.addColorStop(0.3, '#d9b568'); gr.addColorStop(0.55, '#b98f45'); gr.addColorStop(0.8, '#dcbb70'); gr.addColorStop(1, '#a98035'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sh = g.createLinearGradient(0, 0, w, h * 0.4); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,248,220,.28)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,238,190,.7)'; g.lineWidth = 1.5; rr(g, 3, 3, w - 6, h - 6, 17); g.stroke();
    T(g, bannerTxt, w / 2, 98, { font: 'Playfair Display', weight: 800, size: 78, color: '#50091b', align: 'center', ls: 2, shadow: ['rgba(255,235,170,.5)', 2] });
    T(g, bannerSub, w / 2, 134, { weight: 800, size: 17, color: '#50091b', align: 'center', ls: 2.6 });
  });

  // trofi 3D
  const trophyTile = byId('trophy');
  const trophy = new THREE.Group(); { const gold = new THREE.MeshStandardMaterial({ color: 0xe0ad3a, metalness: 1, roughness: 0.22, side: THREE.DoubleSide, envMapIntensity: 2.0 });
    const prof = [[0.01, 0], [5, 0], [5, 8], [10, 11], [5, 14], [4.5, 26], [13, 30], [24, 40], [34, 62], [35, 70], [31, 70], [30, 62], [23, 44], [9, 34], [0.01, 33]].map(([r, y]) => new THREE.Vector2(r, y));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), gold); cup.position.y = 24; cup.castShadow = true;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(34, 38, 24, 8), new THREE.MeshStandardMaterial({ color: 0x6b1428, roughness: 0.5, metalness: 0.1 })); base.position.y = 12; base.castShadow = true;
    const handleL = new THREE.Mesh(new THREE.TorusGeometry(10, 2.2, 8, 20, Math.PI * 1.3), gold), handleR = handleL.clone(); handleL.position.set(-33, 62, 0); handleR.position.set(33, 62, 0); handleR.rotation.y = Math.PI; handleL.rotation.z = Math.PI * 0.5; handleR.rotation.z = Math.PI * 0.5;
    trophy.add(base, cup, handleL, handleR); }
  trophy.scale.setScalar(0.8); const trophyHolder = new THREE.Group(); trophyHolder.add(trophy); trophyHolder.position.set(-92, -62, DEPTH + BEV + 2); trophyHolder.rotation.x = 1.0; trophyTile.g.add(trophyHolder);

  // maskot
  const mats = {}; for (const p of ['sit', 'wave', 'jump']) { const tx = new THREE.CanvasTexture(drawMascot(p)); tx.colorSpace = THREE.SRGBColorSpace; mats[p] = new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }); }
  const mascot = new THREE.Sprite(mats.sit); mascot.scale.set(66, 66, 1); mascot.center.set(0.5, 0.12); board.add(mascot);
  const mShadow = new THREE.Mesh(new THREE.PlaneGeometry(40, 18), new THREE.MeshBasicMaterial({ map: ghostTex, color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); board.add(mShadow);

  // debu emas
  const NP = 140, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffd98a, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false })); board.add(dust);

  // overlay (pudar masuk/keluar)
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x8a8780, transparent: true, opacity: 0, depthTest: false, depthWrite: false })); overlay.renderOrder = 999; overlay.frustumCulled = false;
  overlay.material.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <project_vertex>', 'gl_Position = vec4(position.xy, 0.0, 1.0);'); }; scene.add(overlay);

  const TOP = DEPTH + BEV * 2;

  // ---------- render ----------
  function renderAt(tIn) {
    const t = clamp(tIn, 0, DURATION);
    // kamera
    const c = camAt(t);
    camera.position.set(0, 0, c.D); camera.lookAt(0, 0, 0);
    pivot.rotation.set(-rad(c.pitch), rad(c.yaw), rad(c.roll));
    board.position.set(-(c.x - CX), -(CY - c.y), 0);
    // tile
    for (const tl of tiles) {
      const bannerT = tl === banner;
      const ap = bannerT ? 26.1 : tl.appear; const p = bannerT ? seg(t, 26.1, 26.9) : seg(t, ap, ap + 0.55);
      tl.slot.visible = p > 0;
      if (p > 0) { const e = eo3(p); tl.g.position.z = (1 - e) * (bannerT ? 0 : 320); tl.g.scale.setScalar(lerp(bannerT ? 1 : 0.9, 1, e)); if (bannerT) tl.slot.position.y = (CY - (tl.y + tl.h / 2)) - (1 - eio3(p)) * 330; }
      const gOp = bannerT ? 0 : clamp(seg(t, ap - 0.7, ap - 0.35)) * (1 - clamp(seg(t, ap + 0.1, ap + 0.5))) * 0.28;
      tl.ghost.material.opacity = gOp; tl.ghost.visible = gOp > 0.001;
      // flip kad anugerah
      if (tl.flip) { const f = sm(seg(t, tl.flip[0], tl.flip[1])); let ang = Math.PI * f; if (ang > Math.PI / 2) ang -= Math.PI; tl.g.rotation.x = ang; }
      if (!tl.slot.visible) continue;
      let key; const wi = tl.anim.findIndex(([a, b]) => t >= a && t <= b);
      if (wi >= 0) key = 'a' + Math.round(t * 60); else { let k = -1; tl.anim.forEach(([, b], i) => { if (t > b) k = i; }); key = 'p' + k + (tl.id === 'award' ? awardKey(t) : ''); }
      if (key !== tl.key) { tl.key = key; const g = tl.ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, tl.ctx.canvas.width, tl.ctx.canvas.height); g.scale(S, S); g.save(); rr(g, 0, 0, tl.w, tl.h, 20); g.clip(); tl.draw(g, tl.w, tl.h, t); g.restore(); tl.tex.needsUpdate = true; }
    }
    // trofi
    trophy.rotation.y = t * 0.9 + 0.4; trophyHolder.position.y = -62 + Math.sin(t * 1.6) * 1.5;
    // maskot
    let st = null, prev = null; for (let i = 0; i < STOPS.length; i++) { if (t >= STOPS[i].a) { st = STOPS[i]; prev = STOPS[i - 1] || null; } }
    if (t < 2.7) mascot.visible = mShadow.visible = false; else {
      mascot.visible = mShadow.visible = true;
      const s0 = STOPS[0]; let x, y, z, pose, sq = 1;
      if (t < s0.a) { const u = seg(t, 2.7, s0.a); x = s0.x; y = s0.y; z = TOP + (1 - eo3(u)) * 420; pose = 'jump'; }
      else if (t <= st.d || !STOPS[STOPS.indexOf(st) + 1]) { x = st.x; y = st.y; z = TOP + Math.abs(Math.sin(t * 3.1)) * (st.pose === 'sit' ? 0.5 : 3.5); pose = st.pose; if (t < st.a + 0.15) sq = 1 - 0.15 * Math.sin(seg(t, st.a, st.a + 0.15) * Math.PI); }
      else { const nx = STOPS[STOPS.indexOf(st) + 1]; const u = seg(t, st.d, nx.a); const e = eio3(u); x = lerp(st.x, nx.x, e); y = lerp(st.y, nx.y, e); z = TOP + Math.sin(u * Math.PI) * 60; pose = 'jump'; }
      mascot.material = mats[pose]; mascot.position.set(x - CX, CY - y, z); mascot.scale.set(66 / sq, 66 * sq, 1); mShadow.position.set(x - CX, CY - y - 3, TOP + 0.2); mShadow.material.opacity = 0.35 * (1 - clamp((z - TOP) / 90) * 0.7);
    }
    // debu
    { const a = pg.attributes.position; for (let i = 0; i < NP; i++) { const sx = hash(i), sy = hash(i + 91), sp = 0.4 + hash(i + 17) * 0.8; a.setXYZ(i, (sx - 0.5) * 760 + Math.sin(t * sp + i) * 14, (((sy + t * 0.015 * sp) % 1) - 0.5) * 1380, 40 + hash(i + 5) * 160); } a.needsUpdate = true; dust.material.opacity = 0.55 + 0.25 * Math.sin(t * 2) * 0.5 + (t > 5 ? 0.15 : 0); }
    // pudar
    overlay.material.opacity = clamp(1 - seg(t, 0.05, 0.7)) * 0.62 + seg(t, 29.2, 30.0) * 0.48;
    renderer.render(scene, camera);
  }
  return { renderAt, renderer, scene, camera, tiles, duration: DURATION };
}
