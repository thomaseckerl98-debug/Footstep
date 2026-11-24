// Gelände der Weltkarte: reine Funktionen (laufen im Worker, im Browser und in Node).
// Aus den Formen in welt_daten.js entstehen Felder (Küstenabstand, Gebirge, Flüsse, Wälder …),
// daraus Höhe, Wasser und Farbe für jeden Punkt – immer gleich, für alle Spieler.
import { WELT, KUESTE, INSELN, GEBIRGE, FLUESSE, SEEN, WAELDER, MOORE, HEIDEN } from './welt_daten.js?v=1';

/* ---------- Rauschen ---------- */
const P = new Uint8Array(512);
{ let s = 1337; const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
const fade = (t) => t * t * (3 - 2 * t);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
  const a = P[P[X] + Y], b = P[P[X + 1] + Y], c = P[P[X] + Y + 1], d = P[P[X + 1] + Y + 1];
  const u = fade(xf), v = fade(yf);
  return ((a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v) / 127.5 - 1;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += vnoise(x * f + i * 17.3, y * f - i * 9.1) * a; n += a; a *= 0.5; f *= 2.03; } return s / n; }
function ridged(x, y, o = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { const r = 1 - Math.abs(vnoise(x * f + 31 + i * 7, y * f - 13 - i * 5)); s += r * r * a; n += a; a *= 0.5; f *= 2.1; } return s / n; }
export function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------- Geometrie ---------- */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t));
  const qx = ax + dx * t - px, qy = ay + dy * t - py; return [Math.sqrt(qx * qx + qy * qy), t];
}
function inPoly(x, y, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
function polyEdge(x, y, pts) { let m = 1e9; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) m = Math.min(m, segDist(x, y, pts[j][0], pts[j][1], pts[i][0], pts[i][1])[0]); return m; }
// Linie mit Zwischenpunkten (Catmull-Rom), damit Flüsse und Grate weich verlaufen
export function smoothLine(pts, n = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[pts.length - 1]); return out;
}
// Flussläufe mit leichten Mäandern
export const FLUSSLINIEN = FLUESSE.map((f) => {
  const s = smoothLine(f.pts, 10);
  return { ...f, line: s.map(([x, y], i) => { const e = Math.min(1, i / 6, (s.length - 1 - i) / 6), m = e * (fbm(x / 160 + f.b, y / 160) * 46 + fbm(x / 45, y / 45 + f.b) * 9); return [x + m, y - m * 0.55]; }) };
});

for (let k = 1; k < FLUSSLINIEN.length; k++) {
  const L = FLUSSLINIEN[k].line, [ex, ey] = L[L.length - 1]; let best = null, bd = 160;
  for (let j = 0; j < FLUSSLINIEN.length; j++) { if (j === k) continue; for (const q of FLUSSLINIEN[j].line) { const d = Math.hypot(q[0] - ex, q[1] - ey); if (d < bd) { bd = d; best = q; } } }
  if (best) { L.push([(ex + best[0]) / 2, (ey + best[1]) / 2], [best[0], best[1]]); }
}
/* ---------- Felder (einmal vorberechnet) ---------- */
const G = 8, GW = Math.ceil(WELT.w / G) + 1, GH = Math.ceil(WELT.h / G) + 1;
const RG = 4, RW = Math.ceil(WELT.w / RG) + 1, RH = Math.ceil(WELT.h / RG) + 1;
let F = null;
export function felder() {
  if (F) return F;
  const coast = new Float32Array(GW * GH), ridge = new Float32Array(GW * GH), forest = new Float32Array(GW * GH), laub = new Float32Array(GW * GH), moor = new Float32Array(GW * GH), heide = new Float32Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const x = gx * G, y = gy * G, i = gy * GW + gx;
    let d = polyEdge(x, y, KUESTE) * (inPoly(x, y, KUESTE) ? 1 : -1);
    for (const is of INSELN) d = Math.max(d, is.r - Math.hypot(x - is.x, y - is.y));
    coast[i] = d;
    for (const w of WAELDER) if (inPoly(x, y, w.pts)) { const e = sstep(0, 90, polyEdge(x, y, w.pts)) * w.d; if (e > forest[i]) { forest[i] = e; laub[i] = w.laub; } }
    for (const m of MOORE) if (inPoly(x, y, m.pts)) moor[i] = Math.max(moor[i], sstep(0, 120, polyEdge(x, y, m.pts)));
    for (const h of HEIDEN) if (inPoly(x, y, h.pts)) heide[i] = Math.max(heide[i], sstep(0, 100, polyEdge(x, y, h.pts)));
  }
  for (const g of GEBIRGE) {
    const line = smoothLine(g.pts, 6), R = g.breite * 1.4;
    for (let k = 0; k < line.length - 1; k++) {
      const [ax, ay] = line[k], [bx, by] = line[k + 1];
      const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - R) / G)), x1 = Math.min(GW - 1, Math.ceil((Math.max(ax, bx) + R) / G));
      const y0 = Math.max(0, Math.floor((Math.min(ay, by) - R) / G)), y1 = Math.min(GH - 1, Math.ceil((Math.max(ay, by) + R) / G));
      for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
        const x = gx * G, y = gy * G, [d] = segDist(x, y, ax, ay, bx, by); if (d > R) continue;
        let v = Math.pow(Math.max(0, 1 - d / g.breite), 1.6) * g.hoehe;
        for (const s of g.senken) { const ds = Math.hypot(x - s.x, y - s.y); if (ds < s.r * 2) v *= 1 - (1 - s.f) * (1 - sstep(s.r * 0.6, s.r * 2, ds)); }
        const i = gy * GW + gx; if (v > ridge[i]) ridge[i] = v;
      }
    }
  }
  const river = new Float32Array(RW * RH).fill(999);
  for (const f of FLUSSLINIEN) {
    const L = f.line, n = L.length - 1;
    for (let k = 0; k < n; k++) {
      const [ax, ay] = L[k], [bx, by] = L[k + 1], w0 = f.b * (0.3 + 0.7 * (k / n)) / 2, w1 = f.b * (0.3 + 0.7 * ((k + 1) / n)) / 2, R = 175;
      const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - R) / RG)), x1 = Math.min(RW - 1, Math.ceil((Math.max(ax, bx) + R) / RG));
      const y0 = Math.max(0, Math.floor((Math.min(ay, by) - R) / RG)), y1 = Math.min(RH - 1, Math.ceil((Math.max(ay, by) + R) / RG));
      for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
        const [d, t] = segDist(gx * RG, gy * RG, ax, ay, bx, by), v = d - (w0 + (w1 - w0) * t), i = gy * RW + gx;
        if (v < river[i]) river[i] = v;
      }
    }
  }
  F = { coast, ridge, forest, laub, moor, heide, river };
  return F;
}
function samp(a, w, h, g, x, y) {
  const fx = Math.max(0, Math.min(w - 1.001, x / g)), fy = Math.max(0, Math.min(h - 1.001, y / g)), ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, i = iy * w + ix;
  return (a[i] * (1 - tx) + a[i + 1] * tx) * (1 - ty) + (a[i + w] * (1 - tx) + a[i + w + 1] * tx) * ty;
}
function seeSD(x, y) {
  let m = -1e9;
  for (const s of SEEN) {
    const dx = x - s.x, dy = y - s.y, c = Math.cos(s.rot), sn = Math.sin(s.rot), u = (dx * c + dy * sn) / s.rx, v = (-dx * sn + dy * c) / s.ry;
    const q = Math.sqrt(u * u + v * v); if (q > 2) continue;
    m = Math.max(m, (1 - q) * Math.min(s.rx, s.ry) + fbm(x / 60, y / 60, 2) * 14);
  }
  return m;
}

/* ---------- Punkt: Höhe, Wasser, Bewuchs ---------- */
export function punkt(x, y) {
  const f = felder();
  const n1 = fbm(x / 520, y / 520, 4);
  // Verwirbelung, damit Wälder, Heide und Moor natürliche Ränder bekommen
  const wx = x + fbm(x / 310 + 7, y / 310, 3) * 130, wy = y + fbm(x / 310, y / 310 - 9, 3) * 130;
  const coast = samp(f.coast, GW, GH, G, x, y) + n1 * 55 + fbm(x / 70, y / 70, 3) * 16;
  const ridge = samp(f.ridge, GW, GH, G, x, y);
  const land = sstep(0, 200, coast);
  const hills = fbm(x / 680 + 3, y / 680 - 7, 4) * 0.5 + 0.5;
  const roll = fbm(x / 240 + 40, y / 240 - 20, 3) * 0.5 + 0.5;
  const rn = ridge > 0.0005 ? ridged(x / 230, y / 230, 5) : 0;
  let h = sstep(-20, 340, coast) * 0.13 + hills * 0.12 * land + roll * 0.07 * land * (1 - Math.min(1, ridge * 2)) + ridge * (0.48 + 0.7 * rn) + fbm(x / 90, y / 90, 2) * 0.012;
  const rsd = samp(f.river, RW, RH, RG, x, y) + fbm(x / 34, y / 34, 2) * 2.5;
  h -= 0.08 * sstep(140, -10, rsd) * (1 - Math.min(1, ridge * 1.5));
  const lsd = seeSD(x, y);
  const moor = samp(f.moor, GW, GH, G, wx, wy), heide = samp(f.heide, GW, GH, G, wx, wy);
  let wasser = 0; // 0 Land · 1 Meer · 2 Fluss · 3 See · 4 Tümpel
  if (coast <= 0) wasser = 1; else if (lsd > 0) wasser = 3; else if (rsd < 0) wasser = 2; else if (moor > 0.25 && fbm(x / 26 + 5, y / 26, 2) > 0.3 - moor * 0.12) wasser = 4;
  let wald = samp(f.forest, GW, GH, G, wx, wy) * (0.55 + 0.75 * (fbm(x / 120, y / 120, 3) * 0.5 + 0.5));
  wald = Math.max(wald, Math.max(0, fbm(x / 300 - 11, y / 300 + 4, 4) - 0.18) * 1.4 * (1 - heide) * sstep(40, 200, coast));
  if (h > 0.46) wald *= Math.max(0, 1 - (h - 0.46) * 7);
  if (moor > 0.2) wald *= 0.4;
  const frost = sstep(470, 90, y + fbm(x / 200, 3, 2) * 70);
  if (frost > 0) wald *= 1 - frost * 0.9;
  return { h, coast, wasser, tiefe: wasser === 1 ? -coast : wasser === 3 ? lsd : 0, ridge, wald: Math.max(0, Math.min(1, wald)), laub: samp(f.laub, GW, GH, G, wx, wy) * (1 - frost), moor, heide, rsd, frost };
}

/* ---------- Farben ---------- */
const C = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PAL = {
  tief: C('#1f4357'), meer: C('#2c5c71'), flach: C('#3f7f8a'), schaum: C('#a9cdc6'), see: C('#3a7486'), fluss: C('#4a8c9a'),
  sand: C('#cdbd8c'), fels_k: C('#6f6a5d'), gras: C('#6e9a45'), gras2: C('#5f8b3b'), wiese: C('#8db35a'), huegel: C('#7f9148'), oliv: C('#8b8b52'),
  fels: C('#7b7366'), fels2: C('#958c7d'), schnee: C('#e9edf0'), schnee2: C('#c9d3dc'), moor: C('#4f5b37'), tuempel: C('#3e5449'), heide: C('#8a6c6c'), ginster: C('#c9b04a'),
  baum: C('#2f5a2c'), baum2: C('#3f6c33'), baumhell: C('#5d8d3f'), tanne: C('#24452c'), tanne2: C('#2f5636'), stamm: C('#4a3424'),
  tundra: C('#a3ab90'),
  feld: [C('#c9b45a'), C('#a9b852'), C('#b89a52'), C('#93a84c'), C('#d1c06a')],
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function grund(p, x, y) {
  if (p.wasser === 1) { const t = Math.min(1, p.tiefe / 260); let c = t < 0.15 ? mix(PAL.flach, PAL.meer, t / 0.15) : mix(PAL.meer, PAL.tief, (t - 0.15) / 0.85); if (p.tiefe < 7 && fbm(x / 8, y / 8, 1) > -0.2) c = mix(c, PAL.schaum, 0.6); return c; }
  if (p.wasser === 3) return p.tiefe < 6 ? mix(PAL.see, PAL.schaum, 0.35) : mix(PAL.see, PAL.tief, Math.min(0.5, p.tiefe / 200));
  if (p.wasser === 2) return p.rsd > -2 ? mix(PAL.fluss, PAL.schaum, 0.3) : PAL.fluss;
  if (p.wasser === 4) return PAL.tuempel;
  const h = p.h, n = fbm(x / 45, y / 45, 2);
  let c;
  if (p.coast < 22 && h < 0.2) c = x < 900 && y < 2300 ? PAL.fels_k : PAL.sand;
  else if (h > 0.74 + n * 0.06) c = mix(PAL.schnee2, PAL.schnee, sstep(0.74, 0.95, h));
  else if (h > 0.47 + n * 0.04) { c = mix(PAL.fels, PAL.fels2, sstep(0.47, 0.74, h) + n * 0.3); if (fbm(x / 14, y / 40, 2) > 0.35) c = mix(c, PAL.fels_k, 0.4); }
  else if (h > 0.34) c = mix(PAL.huegel, PAL.fels, sstep(0.34, 0.47, h));
  else c = mix(mix(PAL.gras2, PAL.gras, n * 0.5 + 0.5), PAL.wiese, Math.max(0, fbm(x / 220, y / 220, 2)) * 0.8);
  if (h > 0.26 && h <= 0.48) c = mix(c, PAL.oliv, sstep(0.26, 0.4, h) * 0.4);
  const n2 = fbm(x / 13, y / 13, 2), hs = hash2(Math.floor(x / 2), Math.floor(y / 2));
  c = [c[0] * (1 + n2 * 0.07), c[1] * (1 + n2 * 0.08), c[2] * (1 + n2 * 0.05)];
  if (h < 0.32 && p.wald < 0.2 && p.moor < 0.1 && p.heide < 0.1 && p.coast > 30) { if (hs < 0.003) c = [236, 232, 214]; else if (hs < 0.005) c = [226, 196, 72]; else if (hs < 0.0065) c = [168, 120, 176]; }
  if (h > 0.3 && h < 0.55 && hs > 0.992) c = [150, 144, 132];
  if (p.frost > 0) { c = mix(c, PAL.tundra, Math.min(1, p.frost * 1.2)); if (p.frost > 0.6) c = mix(c, PAL.schnee, sstep(0.6, 1, p.frost) * 0.9); }
  if (p.heide > 0.1) { c = mix(c, PAL.heide, p.heide * 0.75); if (hash2(x | 0, y | 0) < 0.06 * p.heide) c = PAL.ginster; }
  if (p.moor > 0.1) c = mix(c, PAL.moor, p.moor * 0.85);
  return c;
}

/* ---------- Ausschnitt zeichnen ---------- */
// x0,y0: Welt-Ecke · w,h: Pixel · u: Welteinheiten pro Pixel · orte: [{x,y,r}] für Lichtungen und Felder
export function zeichneAusschnitt(x0, y0, w, h, u, orte = []) {
  const buf = new Uint8ClampedArray(w * h * 4), H = new Float32Array((w + 2) * (h + 2)), Pt = new Array(w * h);
  const near = orte.filter((o) => o.x + o.r * 2 > x0 && o.x - o.r * 2 < x0 + w * u && o.y + o.r * 2 > y0 && o.y - o.r * 2 < y0 + h * u);
  for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
    const x = x0 + (i + 0.5) * u, y = y0 + (j + 0.5) * u;
    if (i >= 0 && j >= 0 && i < w && j < h) { const p = punkt(x, y); Pt[j * w + i] = p; H[(j + 1) * (w + 2) + i + 1] = p.wasser ? Math.min(p.h, 0.1) : p.h; }
    else { const p = punkt(x, y); H[(j + 1) * (w + 2) + i + 1] = p.wasser ? Math.min(p.h, 0.1) : p.h; }
  }
  const k = 95 / u;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = Pt[j * w + i], x = x0 + (i + 0.5) * u, y = y0 + (j + 0.5) * u;
    let c = grund(p, x, y);
    // Felder rund um Siedlungen
    if (!p.wasser && p.h < 0.42 && p.moor < 0.12) for (const o of near) {
      const d = Math.hypot(x - o.x, y - o.y);
      if (d < o.r * 1.75 && d > o.r * 0.55) {
        const a = (o.x * 0.013) % 1.5, cx = (x - o.x) * Math.cos(a) - (y - o.y) * Math.sin(a), cy = (x - o.x) * Math.sin(a) + (y - o.y) * Math.cos(a);
        const fx = Math.floor(cx / 16), fy = Math.floor(cy / 11), r = hash2(fx + o.x | 0, fy + o.y | 0);
        if (r < 0.78 * (1 - sstep(o.r * 1.2, o.r * 1.75, d))) { c = mix(c, PAL.feld[(r * 37 | 0) % 5], 0.85); if (((cx % 16) + 16) % 16 < u || ((cy % 11) + 11) % 11 < u * 0.7) c = mix(c, [90, 80, 50], 0.35); }
        break;
      }
    }
    // Licht von Nordwest
    const hi = (j + 1) * (w + 2) + i + 1, dh = (H[hi - (w + 2) - 1] - H[hi + (w + 2) + 1]);
    const sl = p.wasser ? 0 : Math.max(-0.34, Math.min(0.3, dh * k));
    let s = 1 + sl;
    if (sl < 0) c = mix(c, [44, 62, 88], -sl * 0.45); else c = mix(c, [246, 232, 170], sl * 0.25);
    if (!p.wasser && p.wald > 0.22 && u > 1.8) {
      const t = Math.min(1, (p.wald - 0.22) * 1.7), cn = fbm(x / 9, y / 9, 2);
      c = mix(c, p.laub > 0.5 ? (cn > 0.15 ? PAL.baum2 : PAL.baum) : (cn > 0.15 ? PAL.tanne2 : PAL.tanne), t);
      if (cn > 0.42) c = mix(c, PAL.baumhell, 0.35 * t);
      if (cn < -0.45) c = mix(c, [24, 38, 22], 0.4 * t);
    }
    const o4 = (j * w + i) * 4; buf[o4] = c[0] * s; buf[o4 + 1] = c[1] * s; buf[o4 + 2] = c[2] * s; buf[o4 + 3] = 255;
  }
  // einzelne Bäume, wenn nah genug
  if (u <= 1.8) {
    const cell = 5, cx0 = Math.floor(x0 / cell) - 1, cy0 = Math.floor(y0 / cell) - 1, cx1 = Math.ceil((x0 + w * u) / cell) + 1, cy1 = Math.ceil((y0 + h * u) / cell) + 1;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const r = hash2(cx, cy), tx = (cx + hash2(cx, cy + 99)) * cell, ty = (cy + hash2(cx + 77, cy)) * cell;
      const pi = Math.floor((tx - x0) / u), pj = Math.floor((ty - y0) / u); if (pi < -4 || pj < -6 || pi >= w + 4 || pj >= h + 4) continue;
      const p = Pt[Math.max(0, Math.min(h - 1, pj)) * w + Math.max(0, Math.min(w - 1, pi))]; if (!p || p.wasser) continue;
      let dens = p.wald; for (const o of near) if (Math.hypot(tx - o.x, ty - o.y) < o.r * 1.9) dens *= 0.1;
      if (r > dens * 0.9) {
        if (r < 0.06 + p.wald * 0.3 && p.h < 0.42 && !p.frost) { const b = Math.max(1, Math.round(1.6 / u)); for (let jj = -b; jj <= 0; jj++) for (let ii = -b; ii <= b; ii++) if (ii * ii + (jj + b / 2) * (jj + b / 2) * 2 <= b * b + 1) put(buf, w, h, pi + ii, pj + jj, r < 0.03 ? PAL.baumhell : PAL.baum2, 0.9); }
        continue;
      }
      const tanne = p.laub < hash2(cx + 5, cy - 3), sz = Math.max(1, Math.round((tanne ? 3.2 : 2.6) / u));
      stampTree(buf, w, h, pi, pj, sz, tanne, r);
    }
  }
  return buf;
}
function put(buf, w, h, x, y, c, a = 1) { if (x < 0 || y < 0 || x >= w || y >= h) return; const o = (y * w + x) * 4; buf[o] = buf[o] * (1 - a) + c[0] * a; buf[o + 1] = buf[o + 1] * (1 - a) + c[1] * a; buf[o + 2] = buf[o + 2] * (1 - a) + c[2] * a; }
function stampTree(buf, w, h, x, y, s, tanne, r) {
  // Schatten nach Südost
  for (let j = 0; j <= s; j++) for (let i = -s; i <= s; i++) if (i * i + j * j * 2 <= s * s) put(buf, w, h, x + i + 1, y + j + 1, [20, 30, 18], 0.35);
  if (tanne) {
    for (let j = -s * 2; j <= 0; j++) { const ww = Math.round((j + s * 2) / 2); for (let i = -ww; i <= ww; i++) put(buf, w, h, x + i, y + j, i < 0 ? PAL.tanne2 : PAL.tanne); }
  } else {
    const c = r < 0.3 ? PAL.baum2 : PAL.baum;
    for (let j = -s * 2; j <= 0; j++) for (let i = -s; i <= s; i++) { const dy = j + s; if (i * i + dy * dy <= s * s + 1) put(buf, w, h, x + i, y + j, (i < 0 && dy < 0) ? PAL.baumhell : c); }
    put(buf, w, h, x, y + 1, PAL.stamm);
  }
}

/* ---------- Hilfen für Wege und Ziele ---------- */
export function kosten(x, y) {
  const p = punkt(x, y);
  if (p.wasser === 1 || p.wasser === 3) return Infinity;
  return 1 + (p.wasser === 2 ? 14 : 0) + (p.wasser === 4 ? 4 : 0) + Math.max(0, p.h - 0.28) * 26 + p.wald * 1.6 + p.moor * 3;
}
