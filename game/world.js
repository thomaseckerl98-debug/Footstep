// Mossheart Welt: große Landschaft (960×540), Bauplätze, Wegenetz, Gebäude-Bausätze, Held.
import {
  W, H, K, rng, makeNoise, N1, N2, N3, N4, clamp, mix, mul, add, sc, hex, step, Layer, setMood, lit, fog,
  drawSky, lightBands, mountain, conifer, blobTree, buildPalette, toImage, mtnTop, PEAK,
} from './core.js?v=1';
import * as CORE from './core.js?v=1';
export { W, H, setMood };

export const WORLD_VERSION = 1;
const S = () => CORE.S, T = () => CORE.T;
const flat = (base, k = 0.75) => mul(base, add(CORE.AMB, sc(CORE.LIGHT, k)));

/* ======================================================================
   Bauplätze und Wegenetz (fest, unabhängig von Stimmung und Jahreszeit)
   ====================================================================== */
export const PLAZA = { x: 500, y: 440 };
export const ROADS = [
  { id: 'haupt', pts: [[470, 548], [478, 500], [500, 440]], built: true, w: 1 },
  { id: 'ost', pts: [[500, 440], [640, 430], [780, 424], [930, 418]], built: false, w: 0.9 },
  { id: 'west', pts: [[500, 440], [360, 436], [220, 432], [60, 430]], built: false, w: 0.9 },
  { id: 'nord', pts: [[500, 440], [512, 410], [526, 384]], built: false, w: 0.7 },
  { id: 'suedost', pts: [[640, 430], [700, 480], [770, 548]], built: false, w: 0.8 },
  { id: 'suedwest', pts: [[360, 436], [300, 490], [230, 548]], built: false, w: 0.8 },
];
export const depthScale = (y) => 0.72 + clamp((y - 370) / 170) * 0.55;
function roadPoint(pts, t) {
  const seg = []; let total = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); total += l; }
  let d = t * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const u = d / seg[i], [a, b] = [pts[i], pts[i + 1]]; return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, dx: (b[0] - a[0]) / seg[i], dy: (b[1] - a[1]) / seg[i] }; }
    d -= seg[i];
  }
}
export function generatePlots() {
  const plots = [], r = rng(99);
  const ok = (x, y, rad) => x > 40 && x < 920 && y > 382 && y < 528 && Math.hypot(x - PLAZA.x, y - PLAZA.y) > 34 && plots.every((p) => Math.hypot((p.x - x) * 0.8, (p.y - y) * 1.6) > (p.rad + rad));
  for (const road of ROADS) {
    const n = Math.round(14 * road.w * 1.4);
    for (let i = 1; i <= n; i++) for (const side of [-1, 1]) {
      const p = roadPoint(road.pts, i / (n + 1)); if (!p) continue;
      const s = depthScale(p.y);
      const off = (side < 0 ? 26 : 34) * s;
      const x = p.x - p.dy * off * side + (r() - 0.5) * 6, y = p.y + p.dx * off * side * 0.55 + (side > 0 ? 10 : -4) * s;
      const dist = Math.hypot(x - PLAZA.x, y - PLAZA.y);
      const size = dist < 140 ? 'L' : dist < 300 ? 'M' : 'S';
      const rad = (size === 'L' ? 34 : size === 'M' ? 28 : 24) * s;
      if (!ok(x, y, rad)) continue;
      plots.push({ id: plots.length + 1, x: Math.round(x), y: Math.round(y), s, size, rad, road: road.id, shadow: y < 456 - Math.max(0, 900 - x) * 0.55 - 4 ? 1 : 0 });
    }
  }
  plots.sort((a, b) => Math.hypot(a.x - PLAZA.x, (a.y - PLAZA.y) * 1.5) - Math.hypot(b.x - PLAZA.x, (b.y - PLAZA.y) * 1.5));
  plots.forEach((p, i) => { p.id = i + 1; });
  return plots;
}
export const PLOTS = generatePlots();
export const TREES = [[120, 470, 70], [868, 486, 76], [292, 398, 52], [690, 392, 48], [60, 520, 84]];

/* ======================================================================
   Landschaft
   ====================================================================== */
const meadowY = (x) => 357 + Math.sin(x * 0.007) * 4 + N1.fbm(x * 0.013, 4, 3) * 9;
const rightSlope = (x) => 468 - Math.pow(Math.max(0, x - 700) / 260, 1.1) * 200 + N2.fbm(x * 0.02, 5, 4) * 16;
const shadowLine = (x) => 456 - Math.max(0, 900 - x) * 0.55;
function drawRoad(L, road, alpha = 1) {
  const n = 400;
  for (let i = 0; i <= n; i++) {
    const p = roadPoint(road.pts, i / n), s = depthScale(p.y), w = (5 + 4 * s) * road.w;
    for (let k = -w; k <= w; k++) {
      const x = Math.round(p.x - p.dy * k), y = Math.round(p.y + p.dx * k * 0.6);
      const cell = N4.noise(x * 0.3 / s, y * 0.5 / s);
      const edge = Math.abs(k) > w - 1.5;
      let col = Math.abs(cell - 0.5) < 0.05 || edge ? flat(hex(S().groundSnow ? '#9aa3b4' : '#4a4a50'), 0.5) : lit(hex(S().groundSnow ? '#d8dde6' : cell > 0.6 ? '#9a968c' : '#86827a'), 0, -0.6, 0.6, 2);
      if (alpha < 1) col = mix(L.has(x, y) ? L.get(x, y) : col, col, alpha);
      L.set(x, y, col);
    }
  }
}
export function renderWorld(time, season) {
  setMood(time, season);
  const back = new Layer(), mid = new Layer(), roads = new Layer(), front = new Layer();
  drawSky(back);
  mountain(back, (x) => 285 - N3.ridged(x * 0.0067, 1.7, 5) * 105, { seed: 9, fogBase: 0.6, fogGain: 0.3, rock: '#76819a', snow: '#e8ecf2', yEnd: 354, faceX: 450 });
  mountain(back, (x) => mtnTop(x / K) * K - 33, { seed: 3, fogBase: 0.2, fogGain: 0.55, rock: '#6a7690', snow: '#f1eee6', yEnd: 372, faceX: PEAK * K });
  const HZ = CORE.HAZE;
  for (let y = 285; y < 376; y++) for (let x = 0; x < W; x++) { const n = N1.fbm(x * 0.008, y * 0.033, 4); const t = clamp(1 - Math.abs(y - 339) / 36) * (n > 0.45 ? 1 : 0.55); if (t > 0.35) back.set(x, y, mix(back.has(x, y) ? back.get(x, y) : HZ, HZ, step(t * 0.8, 3))); }
  const r = rng(12);
  for (const [y0, y1, n, hh, fogT] of [[327, 348, 900, 19, 0.58], [339, 363, 800, 30, 0.4], [351, 375, 640, 45, 0.22]]) {
    const list = []; for (let i = 0; i < n; i++) list.push([r() * W, y0 + r() * (y1 - y0)]); list.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of list) conifer(back, x, y, hh * (0.7 + r() * 0.6), hh * 0.22 * (0.8 + r() * 0.4), { fogT });
  }
  // rechter Waldhang (wirft Schatten auf die Bauplätze rechts hinten)
  // Wiese
  const g = S().grass.map(hex);
  for (let x = 0; x < W; x++) for (let y = Math.floor(meadowY(x)); y < H; y++) {
    const n = N2.fbm(x * 0.035, y * 0.08, 4), cl = N3.noise(x * 0.3, y * 0.6), v = n * 0.6 + cl * 0.4;
    let col = flat(g[v > 0.6 ? 2 : v > 0.42 ? 1 : 0], 0.75);
    if (!S().groundSnow && cl > 0.82) col = flat(hex(S().dry), 0.8);
    if (T().body === 'sun' && y < shadowLine(x) + N1.noise(x * 0.07, y * 0.15) * 14 - 7) col = sc(mix(col, mul(col, hex('#8090c0')), 0.5), 0.8);
    mid.set(x, y, fog(col, clamp(0.16 - (y - 357) * 0.003)));
  }
  { const list = []; for (let i = 0; i < 300; i++) { const x = 715 + r() * 250, y = rightSlope(x) + 4 + r() * 90; if (y < 462 && y > meadowY(x) + 2) list.push([x, y]); } list.sort((a, b) => a[1] - b[1]); for (const [x, y] of list) conifer(mid, x, y, 22 + r() * 30, 6 + r() * 4, { fogT: 0.08 }); }
  // kleine Felsen und Büsche als Detail (nicht auf Bauplätzen/Wegen)
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = 380 + r() * 160;
    if (PLOTS.some((p) => Math.hypot(p.x - x, (p.y - y) * 1.6) < p.rad + 6)) continue;
    const s = depthScale(y);
    if (r() < 0.5) { const tmp = 2 + r() * 3 * s; for (let yy = -tmp; yy <= tmp * 0.6; yy++) for (let xx = -tmp * 1.4; xx <= tmp * 1.4; xx++) if ((xx / (tmp * 1.4)) ** 2 + (yy / tmp) ** 2 < 1) mid.set(x + xx, y + yy, lit(hex('#6f788c'), xx / tmp * 0.6, yy / tmp - 0.4, 0.6, 2)); }
    else conifer(mid, x, y, (10 + r() * 8) * s, 3 * s, { dark: '#2c4a2a', mid: '#3d5f35', litC: '#577a43' });
  }
  for (const [x, y, s] of TREES) blobTree(mid, x, y, s);
  // Hauptweg + Dorfplatz immer, weitere Wege als eigene Ebene
  drawRoad(mid, ROADS[0]);
  for (let yy = -10; yy <= 10; yy++) for (let xx = -26; xx <= 26; xx++) { if ((xx / 26) ** 2 + (yy / 10) ** 2 > 1) continue; const x = PLAZA.x + xx, y = PLAZA.y + yy, cell = N4.noise(x * 0.35, y * 0.6); mid.set(x, y, Math.abs(cell - 0.5) < 0.05 ? flat(hex('#4a4a50'), 0.5) : lit(hex(S().groundSnow ? '#d8dde6' : '#908c84'), 0, -0.6, 0.6, 2)); }
  // Brunnen auf dem Dorfplatz
  for (let a = 0; a < Math.PI * 2; a += 0.05) for (let rr = 6; rr <= 8; rr++) mid.set(PLAZA.x + Math.cos(a) * rr, PLAZA.y - 2 + Math.sin(a) * rr * 0.45, lit(hex('#7a7d86'), Math.cos(a), Math.sin(a) - 0.3, 0.6, 2));
  for (let k = 0; k < 10; k++) { mid.set(PLAZA.x - 6, PLAZA.y - 4 - k, lit(hex('#5a3e28'), -0.5, 0, 0.7, 2)); mid.set(PLAZA.x + 6, PLAZA.y - 4 - k, lit(hex('#5a3e28'), 0.6, 0, 0.7, 2)); }
  for (let xx = -8; xx <= 8; xx++) mid.set(PLAZA.x + xx, PLAZA.y - 14 - Math.round((8 - Math.abs(xx)) * 0.5), lit(hex('#6b4b2e'), xx / 8, -0.8, 0.5, 2));
  for (const road of ROADS.slice(1)) drawRoad(roads, road);
  // Vordergrund am Weltrand: Felsen, großer Nadelbaum rechts
  conifer(front, 944, 560, 430, 70, { dark: '#18301f', mid: '#25412b', litC: '#3a5c3a' });
  CORE.rock(front, 880, 548, 70, 26); CORE.rock(front, 30, 548, 60, 24);
  lightBands([back, mid]);
  const pal = buildPalette([back, mid, front], 48);
  // feste Zusatzfarben für Bausätze und Held
  for (const h of ['#c4a466', '#a88850', '#86683c', '#4a3424', '#9b8467', '#a38c6d', '#5e7a3a', '#456632', '#f0f2f4', '#3a2618', '#7a7d86', '#5f6470', '#8a3a2a', '#b05a3a', '#34495c', '#253545', '#b88a3e', '#c9b48c', '#d49a72', '#3d2a1c', '#6b4a2e', '#4a3a2c']) pal.push(lit(hex(h), 0.4, -0.5, 0.6, 3), lit(hex(h), -0.4, 0, 0.8, 3), lit(hex(h), 0.9, -0.3, 0.4, 3));
  pal.push(hex('#ffcf74'), hex('#ff9a42'), [0.1, 0.1, 0.14]);
  return { pal, back: toImage(back, pal), mid: toImage(mid, pal), roads: toImage(roads, pal, 0), front: toImage(front, pal, 1) };
}

/* ======================================================================
   Sprite-Werkzeug: kleine Ebene, die auf Weltkoordinaten zeichnet
   ====================================================================== */
export class Sprite {
  constructor(w, h, ox, oy) { this.w = w; this.h = h; this.ox = ox; this.oy = oy; this.c = new Float32Array(w * h * 3); this.a = new Uint8Array(w * h); }
  set(x, y, col) { x = Math.round(x) - this.ox; y = Math.round(y) - this.oy; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; this.c[i * 3] = col[0]; this.c[i * 3 + 1] = col[1]; this.c[i * 3 + 2] = col[2]; this.a[i] = 1; }
  has(x, y) { x = Math.round(x) - this.ox; y = Math.round(y) - this.oy; return x >= 0 && y >= 0 && x < this.w && y < this.h && this.a[y * this.w + x] === 1; }
  get(x, y) { x = Math.round(x) - this.ox; y = Math.round(y) - this.oy; const i = y * this.w + x; return [this.c[i * 3], this.c[i * 3 + 1], this.c[i * 3 + 2]]; }
}
export function quantize(sp, pal) {
  const out = new Uint8ClampedArray(sp.w * sp.h * 4);
  for (let i = 0; i < sp.w * sp.h; i++) {
    if (!sp.a[i]) continue;
    const c = [sp.c[i * 3], sp.c[i * 3 + 1], sp.c[i * 3 + 2]];
    let best = pal[0], bd = 9;
    for (const q of pal) { const d = 0.3 * (c[0] - q[0]) ** 2 + 0.59 * (c[1] - q[1]) ** 2 + 0.11 * (c[2] - q[2]) ** 2 + 0.2 * (((c[0] - c[1]) - (q[0] - q[1])) ** 2 + ((c[1] - c[2]) - (q[1] - q[2])) ** 2); if (d < bd) { bd = d; best = q; } }
    out[i * 4] = clamp(best[0]) * 255; out[i * 4 + 1] = clamp(best[1]) * 255; out[i * 4 + 2] = clamp(best[2]) * 255; out[i * 4 + 3] = 255;
  }
  return out;
}

/* ======================================================================
   Gebäude-Bausätze (Textur-Vertrag: Typ, Größenklasse, Anker unten Mitte)
   ====================================================================== */
export const BUILDINGS = {
  wohnhaus: { name: 'Wohnhaus', size: 'S', desc: 'Strohdach-Fachwerkhaus' },
  langhaus: { name: 'Langhaus', size: 'L', desc: 'Große Halle mit geschnitztem Giebel' },
  schmiede: { name: 'Schmiede', size: 'M', desc: 'Steinbau mit Esse' },
  scheune: { name: 'Scheune', size: 'M', desc: 'Holzscheune mit Heuboden' },
  wachturm: { name: 'Wachturm', size: 'S', desc: 'Hölzerner Ausguck' },
  feld: { name: 'Feld', size: 'M', desc: 'Acker – wächst mit den Jahreszeiten' },
};
function boxBuilding(L, x, y, c) {
  // c: s, wallH, roofH, front (half width), depth, wallFront(i,k), wallSide(i,k), roof(xx,yy,n,i), shadow, moss
  const { s, shadow = 0, moss = false } = c, snow = S().groundSnow;
  const ls = 1 - shadow * 0.72;
  const P = (xx, yy, col) => L.set(xx, yy, shadow ? mix(col, mul(col, hex('#7f8fb8')), shadow * 0.35) : col);
  const LT = (h, n, b = 2) => lit(hex(h), n[0], n[1], n[2], b, ls);
  const W2 = Math.round(c.front * s), wallH = Math.round(c.wallH * s), roofH = Math.round(c.roofH * s), depth = Math.round(c.depth * s), dd = 0.42;
  const FRONT = [-0.3, 0, 0.9], SIDE = [0.9, 0, 0.4];
  // Fundament / Grundstück
  for (let yy = -3; yy <= 5; yy++) for (let xx = -W2 - 6; xx <= W2 + depth + 6; xx++) { if ((xx / (W2 + depth / 2 + 6)) ** 2 + (yy / 5) ** 2 > 1) continue; P(x + xx + depth * 0.3, y + yy - Math.max(0, xx - W2) * dd * 0.6, flat(hex(snow ? '#d4dae4' : '#7d6a50'), 0.7)); }
  for (let i = -W2 - 2; i <= W2 + depth; i++) for (let k = 0; k < 3; k++) P(x + i, y - k + (i > W2 ? Math.round((i - W2) * -dd) : 0), LT(c.base || '#7a7d86', [0, -0.3, 0.8]));
  for (let i = 0; i < depth; i++) for (let k = 0; k < wallH; k++) P(x + W2 + i, y - 3 - k - Math.round(i * dd), LT(c.wallSide(i, k, wallH, depth), SIDE));
  for (let k = 0; k < wallH; k++) for (let i = -W2; i <= W2; i++) P(x + i, y - 3 - k, LT(c.wallFront(i, k, W2, wallH), FRONT));
  const gy = y - 3 - wallH, peakY = gy - roofH;
  if (c.gable) for (let k = 0; k < roofH * 0.62; k++) { const half = W2 * (1 - k / (roofH * 0.62)); for (let i = -half; i <= half; i++) P(x + i, gy - k, LT(c.gable(i, k), FRONT)); }
  const roofCol = (xx, yy, n, i) => {
    let col = lit(hex(c.roof(xx, yy, i)), n[0], n[1], n[2], 3, ls);
    if (moss && N3.noise(xx * 0.22, yy * 0.22) > 0.5) col = lit(hex(N3.noise(xx, yy) > 0.5 ? '#5e7a3a' : '#456632'), n[0], n[1], n[2], 2, ls);
    if (snow && (N3.noise(xx * 0.3, yy * 0.4) > 0.3 || i > 2)) col = lit(hex('#f0f2f4'), n[0], n[1], n[2], 2, ls);
    return col;
  };
  for (let k = 0; k <= roofH + 4; k++) {
    const yy = peakY + k, half = (W2 + 5) * (k / roofH); if (yy > gy + 4) continue;
    for (let side = -1; side <= 1; side += 2) for (let t = 0; t < 4; t++) P(x + side * (half - t), yy, roofCol(x + side * (half - t), yy, side < 0 ? [-0.7, -0.5, 0.5] : [0.75, -0.55, 0.4], 0));
    for (let i = 0; i < depth + 4; i++) P(x + half + i - 1, yy - Math.round(i * dd), roofCol(x + half + i - 1, yy - Math.round(i * dd), [0.75, -0.55, 0.4], i));
  }
  for (let i = -3; i < depth + 4; i++) P(x + i, peakY - Math.round(Math.max(0, i) * dd) - 1, LT(c.ridge || '#4a3424', [0, -1, 0.4]));
  return { W2, wallH, roofH, depth, dd, gy, peakY, P, LT, FRONT, SIDE, ls };
}
const thatch = (xx, yy) => { const s2 = N4.noise(xx * 0.9, yy * 0.18); return s2 > 0.6 ? '#c4a466' : s2 > 0.35 ? '#a88850' : '#86683c'; };
const timberFront = (i, k, W2, wallH) => (Math.abs(i) > W2 - 2 || k < 2 || k > wallH - 3 || Math.abs(i) < 1 ? '#4a3424' : '#a38c6d');
const timberSide = (i, k, wallH) => (i % 10 < 2 || k < 2 || k > wallH - 3 ? '#4a3424' : '#9b8467');

export function drawBuilding(L, type, x, y, opts = {}) {
  const s = opts.s || 1, shadow = opts.shadow || 0, moss = opts.moss || false, night = T().body === 'moon';
  const info = { chimneys: [], windows: [], forge: null };
  const win = (g, xx, yy, w, h) => { for (let k = 0; k < h; k++) for (let i = 0; i < w; i++) L.set(xx + i, yy - k, night ? hex('#ffcf74') : g.LT('#2a2a36', g.FRONT, 1)); info.windows.push([xx + w / 2, yy - h / 2]); };
  const chimney = (g, cx, cy, h, col = '#6f6a66') => { for (let k = 0; k < h; k++) for (let i = 0; i < 4 * s; i++) g.P(cx + i, cy - k, g.LT(col, i > 1 ? g.SIDE : g.FRONT)); info.chimneys.push([cx + 2 * s, cy - h]); };
  if (type === 'wohnhaus' || type === 'langhaus') {
    const long = type === 'langhaus';
    const g = boxBuilding(L, x, y, { s: s * (long ? 1.2 : 1), shadow, moss, front: 22, wallH: 18, roofH: 30, depth: long ? 54 : 30, wallFront: timberFront, wallSide: timberSide, roof: thatch, gable: (i) => (Math.abs(i) < 1 ? '#4a3424' : '#8d775c') });
    for (let k = 0; k < Math.round(11 * s); k++) for (let i = -Math.round(4 * s); i <= Math.round(3 * s); i++) g.P(x + i, y - 3 - k, g.LT('#5a3a22', g.FRONT));
    win(g, x + Math.round(10 * s), y - Math.round(12 * s), Math.round(4 * s), Math.round(4 * s));
    for (let j = 0; j < (long ? 3 : 1); j++) { const off = Math.round((12 + j * 16) * s); win(g, x + g.W2 + off, y - Math.round(12 * s) - Math.round(off * g.dd), Math.round(4 * s), Math.round(4 * s)); }
    // gekreuzte Firstbalken (beim Langhaus mit Schnitzerei)
    for (let k = 0; k < (long ? 10 : 6) * s; k++) { g.P(x - 2 - k * 0.6, g.peakY - 1 - k, g.LT('#4a3424', [0, -1, 0.5])); g.P(x + 2 + k * 0.6, g.peakY - 1 - k, g.LT('#4a3424', [0, -1, 0.5])); }
    if (long) { for (let k = 0; k < 4; k++) g.P(x - 8 * s, g.peakY - 9 * s + k, g.LT('#b88a3e', [0, -1, 0.5])); for (let k = 0; k < 4; k++) g.P(x + 8 * s, g.peakY - 9 * s + k, g.LT('#b88a3e', [0, -1, 0.5])); }
    chimney(g, x + g.W2 + Math.round(14 * s), g.peakY + Math.round(10 * s) - Math.round(14 * s * g.dd), Math.round(9 * s));
    if (long) chimney(g, x + g.W2 + Math.round(40 * s), g.peakY + Math.round(10 * s) - Math.round(40 * s * g.dd), Math.round(9 * s));
  } else if (type === 'schmiede') {
    const stone = (i, k) => { const row = Math.floor(k / 3), brick = Math.floor((i + (row % 2) * 3) / 6); return (k % 3 === 0 || (i + (row % 2) * 3) % 6 === 0) ? '#4f535c' : (N4.noise(brick, row) > 0.5 ? '#868a92' : '#767a84'); };
    const g = boxBuilding(L, x, y, { s, shadow, moss, front: 20, wallH: 16, roofH: 18, depth: 26, base: '#5f6470', wallFront: (i, k) => stone(i + 40, k), wallSide: (i, k) => stone(i, k), roof: (xx, yy) => (Math.floor(yy) % 3 === 0 ? '#3e4654' : N4.noise(xx * 0.5, yy) > 0.5 ? '#5a6372' : '#4c5563'), gable: (i, k) => stone(i + 40, k + 20), ridge: '#2e333c' });
    // offene Esse vorne mit Glut
    for (let k = 0; k < Math.round(9 * s); k++) for (let i = -Math.round(6 * s); i <= Math.round(6 * s); i++) g.P(x + i, y - 3 - k, k < 3 * s ? hex(night ? '#ff9a42' : '#d9703a') : g.LT('#1e1c1e', g.FRONT));
    info.forge = [x, y - 6 * s];
    // großer Steinschornstein
    for (let k = 0; k < 26 * s; k++) for (let i = 0; i < 7 * s; i++) g.P(x + g.W2 + Math.round(6 * s) + i, g.peakY + Math.round(14 * s) - k - Math.round(6 * s * g.dd), g.LT(stone(i, k), i > 3 * s ? g.SIDE : g.FRONT));
    info.chimneys.push([x + g.W2 + Math.round(9 * s), g.peakY + Math.round(14 * s) - 26 * s - Math.round(6 * s * g.dd)]);
    // Amboss
    for (let i = -3; i <= 3; i++) g.P(x - g.W2 - 8 * s + i, y - 4, g.LT('#3a3d44', [0, -1, 0.5])); for (let k = 0; k < 3; k++) g.P(x - g.W2 - 8 * s, y - 1 - k, g.LT('#3a3d44', g.FRONT));
  } else if (type === 'scheune') {
    const plank = (i, k) => (Math.floor(i) % 4 === 0 ? '#5a2e22' : N4.noise(Math.floor(i / 4), 3) > 0.5 ? '#8a3a2a' : '#7a3426');
    const g = boxBuilding(L, x, y, { s, shadow, moss, front: 24, wallH: 20, roofH: 28, depth: 34, base: '#6b5a48', wallFront: (i, k) => plank(i + 30, k), wallSide: (i, k) => plank(i, k), roof: (xx, yy) => (Math.floor(yy) % 4 === 0 ? '#4a3424' : N4.noise(xx * 0.4, Math.floor(yy / 4)) > 0.5 ? '#7a5a3a' : '#6b4b2e'), gable: (i, k) => plank(i + 30, k + 9) });
    // Doppeltor mit Kreuzstreben
    const dw = Math.round(9 * s), dh = Math.round(15 * s);
    for (let k = 0; k < dh; k++) for (let i = -dw; i <= dw; i++) g.P(x + i, y - 3 - k, g.LT(Math.abs(i) < 1 || Math.abs(Math.abs(i) - (k / dh) * dw) < 1 ? '#3a2018' : '#5a2e22', g.FRONT));
    // Heuluke + Heuhaufen
    for (let k = 0; k < 5 * s; k++) for (let i = -3 * s; i <= 3 * s; i++) g.P(x + i, g.gy - 6 * s - k, g.LT('#2a1810', g.FRONT));
    for (let yy = -6 * s; yy <= 0; yy++) for (let xx = -9 * s; xx <= 9 * s; xx++) if ((xx / (9 * s)) ** 2 + (yy / (6 * s)) ** 2 < 1) g.P(x - g.W2 - 10 * s + xx, y + yy, lit(hex(N4.noise(xx, yy) > 0.5 ? '#d8b860' : '#b89848'), xx / (9 * s), yy / (6 * s) - 0.3, 0.6, 2, g.ls));
  } else if (type === 'wachturm') {
    const ls = 1 - shadow * 0.72, P = (xx, yy, col) => L.set(xx, yy, col);
    const LT = (h, n) => lit(hex(h), n[0], n[1], n[2], 2, ls);
    const legH = Math.round(44 * s), w = Math.round(12 * s), top = y - legH;
    for (let yy = -2; yy <= 3; yy++) for (let xx = -w - 6; xx <= w + 6; xx++) P(x + xx, y + yy, flat(hex(S().groundSnow ? '#d4dae4' : '#7d6a50'), 0.7));
    for (const [lx, n] of [[-w, [-0.6, 0, 0.7]], [w, [0.8, 0, 0.5]], [-w + 4 * s, [-0.6, 0, 0.7]], [w + 4 * s, [0.8, 0, 0.5]]]) for (let k = 0; k < legH; k++) { const xx = x + lx * (0.75 + 0.25 * k / legH); P(xx, y - k, LT('#5a3e28', n)); P(xx + 1, y - k, LT('#6b4b2e', n)); }
    for (let k = 6; k < legH; k += 12 * s) for (let t = 0; t <= 1; t += 0.02) { P(x - w + t * 2 * w, y - k - t * 10 * s, LT('#5a3e28', [0, 0, 1])); P(x + w - t * 2 * w, y - k - t * 10 * s, LT('#4a3424', [0, 0, 1])); }
    for (let k = 0; k < legH; k++) if (k % 4 === 0) for (let i = 0; i < 5; i++) P(x - 2 + i, y - k, LT('#8a6440', [0, -1, 0.6])); // Leiter
    for (let k = 0; k < 4; k++) for (let i = -w - 4; i <= w + 4; i++) P(x + i, top - k, LT(k === 3 ? '#a37a50' : '#6b4b2e', [0, -0.6, 0.7]));
    for (let k = 0; k < 9 * s; k++) for (let i = -w - 4; i <= w + 4; i++) if (k === 0 || Math.abs(i) % 5 === 0 || Math.abs(i) === w + 4) P(x + i, top - 4 - k, LT('#5a3e28', i > 0 ? [0.7, 0, 0.6] : [-0.5, 0, 0.8]));
    const peak = top - 4 - 9 * s - 22 * s;
    for (let yy = peak; yy <= top - 4 - 8 * s; yy++) { const half = (w + 7) * ((yy - peak) / (22 * s)); for (let i = -half; i <= half; i++) { let col = lit(hex(thatch(x + i, yy)), i < 0 ? -0.7 : 0.75, -0.5, 0.5, 3, ls); if (S().groundSnow && N3.noise((x + i) * 0.3, yy * 0.4) > 0.25) col = lit(hex('#f0f2f4'), i < 0 ? -0.7 : 0.75, -0.5, 0.5, 2, ls); if (moss && N3.noise((x + i) * 0.22, yy * 0.22) > 0.55) col = lit(hex('#5e7a3a'), i < 0 ? -0.7 : 0.75, -0.5, 0.5, 2, ls); P(x + i, yy, col); } }
    if (night) { info.windows.push([x, top - 8 * s]); }
  }
  return info;
}
export function buildingSprite(type, plot, pal) {
  const s = plot.s, w = Math.round(160 * s), h = Math.round(150 * s);
  const sp = new Sprite(w, h, plot.x - Math.round(60 * s), plot.y - Math.round(130 * s));
  const info = drawBuilding(sp, type, plot.x, plot.y, { s, shadow: T().body === 'sun' ? plot.shadow : 0, moss: plot.shadow ? true : false });
  // auf genutzten Bereich zuschneiden
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sp.a[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, full = quantize(sp, pal), data = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) data.set(full.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1 + 1) * 4), y * cw * 4);
  return { type, plotId: plot.id, x: sp.ox + x0, y: sp.oy + y0, w: cw, h: ch, data, info };
}
