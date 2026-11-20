// Prototyp 5: Grund-Layer Nr. 1 + Haus-Bausatz. 4 Tageszeiten x 4 Jahreszeiten.
// Stil: gestuftes Licht (keine weichen Verläufe), bläuliche Schatten, warme Lichter, Nebelschichten.
export const W = 640, H = 360;

/* ---------- Werkzeuge ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeNoise(seed) {
  const r = rng(seed), perm = new Uint8Array(512), val = new Float32Array(256), p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) val[i] = r();
  const lat = (x, y) => val[perm[(perm[x & 255] + y) & 255]];
  const noise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); const a = lat(ix, iy), b = lat(ix + 1, iy), c = lat(ix, iy + 1), d = lat(ix + 1, iy + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
  const fbm = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); n += a; f *= 2.03; a *= 0.5; } return s / n; };
  const ridged = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { const v = 1 - Math.abs(noise(x * f, y * f) * 2 - 1); s += a * v * v; n += a; f *= 2.1; a *= 0.5; } return s / n; };
  return { noise, fbm, ridged };
}
const N1 = makeNoise(4), N2 = makeNoise(17), N3 = makeNoise(31), N4 = makeNoise(77);
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const step = (v, n) => Math.round(clamp(v) * n) / n; // Licht in Stufen

class Layer {
  constructor() { this.c = new Float32Array(W * H * 3); this.a = new Uint8Array(W * H); }
  set(x, y, col) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; this.c[i * 3] = col[0]; this.c[i * 3 + 1] = col[1]; this.c[i * 3 + 2] = col[2]; this.a[i] = 1; }
  get(x, y) { const i = y * W + x; return [this.c[i * 3], this.c[i * 3 + 1], this.c[i * 3 + 2]]; }
  has(x, y) { return x >= 0 && y >= 0 && x < W && y < H && this.a[y * W + x] === 1; }
}

/* ---------- Tageszeiten & Jahreszeiten ---------- */
const TIMES = {
  morgen: { sky: ['#6f93bd', '#a9bfd6', '#f2dcc0'], sun: [110, 120], body: 'sun', light: [1.05, 0.92, 0.78], amb: [0.42, 0.48, 0.62], haze: '#c7d2de', rays: 0.14 },
  mittag: { sky: ['#4e86c0', '#8fb9dc', '#d9e8ee'], sun: [520, 26], body: 'sun', light: [1.05, 1.02, 0.94], amb: [0.46, 0.52, 0.64], haze: '#bfd0dc', rays: 0.1 },
  abend: { sky: ['#4b4c7c', '#c9879a', '#ffcf94'], sun: [565, 168], body: 'sun', light: [1.1, 0.74, 0.5], amb: [0.42, 0.38, 0.58], haze: '#c99aa6', rays: 0.16 },
  nacht: { sky: ['#0b1128', '#1d2a50', '#34446e'], sun: [470, 58], body: 'moon', light: [0.42, 0.5, 0.75], amb: [0.16, 0.2, 0.34], haze: '#2c3a5e', rays: 0 },
};
const SEASONS = {
  fruehling: { grass: ['#46703a', '#6a9450', '#9cbc68'], dry: '#b8b26a', leaf: ['#b5617a', '#e49aab', '#f6cdd2'], heather: '#d488b0', snowline: 120, groundSnow: 0, particles: 'petals' },
  sommer: { grass: ['#3b5a35', '#577a43', '#83a058'], dry: '#a8955a', leaf: ['#2f5a34', '#4f7f3c', '#7fa652'], heather: '#8a5a8e', snowline: 85, groundSnow: 0, particles: 'none' },
  herbst: { grass: ['#6a6a35', '#9a8a45', '#c9a95a'], dry: '#c78a45', leaf: ['#8a3a26', '#cf6a35', '#f2a75a'], heather: '#8a4a5a', snowline: 150, groundSnow: 0, particles: 'leaves' },
  winter: { grass: ['#8a9ab5', '#c9d4e6', '#f2f2ee'], dry: '#a39a7a', leaf: null, heather: '#6a5a6a', snowline: 260, groundSnow: 1, particles: 'snow' },
};
let T = TIMES.mittag, S = SEASONS.sommer, LDIR = [0, -1, 0.5], LIGHT, AMB, HAZE;
function setMood(time, season) {
  T = TIMES[time]; S = SEASONS[season];
  LIGHT = T.light; AMB = T.amb; HAZE = hex(T.haze);
  const [sx, sy] = T.sun;
  const v = [(sx - 320) / 320, -0.6 - (1 - sy / 200) * 0.4, 0.55];
  const l = Math.hypot(...v); LDIR = v.map((x) => x / l);
}
// Licht in Stufen: Basisfarbe * (Umgebung + Licht * gestuftes Diffus)
function lit(base, nx, ny, nz, bands = 3, lightScale = 1) {
  const d = step(Math.max(0, nx * LDIR[0] + ny * LDIR[1] + nz * LDIR[2]), bands);
  return mul(base, add(AMB, sc(LIGHT, d * lightScale)));
}
const fog = (col, t) => mix(col, HAZE, step(clamp(t), 6));

/* ---------- Himmel, Wolken, Sterne, Lichtbänder ---------- */
function drawSky(L) {
  const [c0, c1, c2] = T.sky.map(hex), [sx, sy] = T.sun;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = step(y / 250, 9);
    let col = t < 0.5 ? mix(c0, c1, t / 0.5) : mix(c1, c2, clamp((t - 0.5) / 0.5));
    const d = Math.hypot(x - sx, (y - sy) * 1.2);
    if (T.body === 'sun') col = add(col, sc(LIGHT, step(Math.max(0, 1 - d / 110) ** 2, 3) * 0.28));
    // kantige Wolkenballen
    const n = N1.fbm(x * 0.008 + 7, y * 0.026, 5) * (1 - Math.abs(y / 250 - 0.28) * 2.6);
    if (n > 0.34) {
      const top = N1.fbm(x * 0.008 + 7, (y - 4) * 0.026, 5) * (1 - Math.abs((y - 4) / 250 - 0.28) * 2.6);
      const litEdge = top < n - 0.01 ? 1 : 0.45;
      const cl = T.body === 'moon' ? mix(hex('#3a4a72'), hex('#7d8fb8'), litEdge) : mix(mix(c1, hex('#ffffff'), 0.15), mix(hex('#fff6e2'), LIGHT, 0.2), litEdge);
      col = mix(col, cl, step((n - 0.34) * 7, 3));
    }
    if (T.body === 'moon' && N4.noise(x * 0.9, y * 0.9) > 0.93 && y < 200) col = mix(col, [0.95, 0.95, 1], 0.8);
    L.set(x, y, col);
  }
  const rr = T.body === 'sun' ? 9 : 7;
  for (let y = sy - rr; y <= sy + rr; y++) for (let x = sx - rr; x <= sx + rr; x++) if (Math.hypot(x - sx, y - sy) < rr - 0.5) L.set(x, y, T.body === 'sun' ? [1.15, 1.05, 0.85] : [0.92, 0.93, 0.98]);
}
function lightBands(layers) {
  if (!T.rays) return;
  const [sx, sy] = T.sun;
  for (const L of layers) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!L.a[i]) continue;
    const ang = Math.atan2(y - sy, x - sx);
    const band = Math.sin(ang * 11 + 0.9) > 0.86 || Math.sin(ang * 7 + 2.3) > 0.93;
    if (!band) continue;
    const dist = Math.hypot(x - sx, y - sy);
    if (dist < 90 || dist > 520 || y > 330) continue;
    const k = T.rays * Math.min(1, (dist - 90) / 80) * (1 - dist / 520);
    L.c[i * 3] += LIGHT[0] * k; L.c[i * 3 + 1] += LIGHT[1] * k; L.c[i * 3 + 2] += LIGHT[2] * k * 0.85;
  }
}

/* ---------- Berge mit Facetten und Schnee ---------- */
const PEAK = 360;
const mtnTop = (x) => 250 - (Math.pow(Math.max(0, 1 - Math.abs(x - PEAK) / 270), 1.25) * 205 + Math.pow(Math.max(0, 1 - Math.abs(x - 130) / 150), 1.5) * 85 + N2.ridged(x * 0.012, 0.3, 5) * 34);
function mountain(L, topFn, opts) {
  const { seed, fogBase, fogGain, rock, snow, yEnd, faceX } = opts;
  const nz = makeNoise(seed);
  const h = (x, y) => { const u = (x - faceX) * 0.55 + y * 0.8, v = y * 0.5 - (x - faceX) * 0.35 * Math.sign(x - faceX || 1); return nz.ridged(u * 0.018, v * 0.034, 5); };
  for (let x = 0; x < W; x++) {
    const top = topFn(x);
    for (let y = Math.max(0, Math.floor(top)); y < yEnd; y++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 9, dy = (h(x, y + 1) - h(x, y - 1)) * 7;
      const gx = Math.tanh((x - faceX) / 35) * 0.75;
      const n = [-dx + gx, -dy - 0.35, 0.8], l = Math.hypot(...n);
      const ridge = h(x, y);
      const snowLine = S.snowline + (top - 40) * 0.6;
      const isSnow = (y < snowLine + (ridge - 0.45) * 90 && ridge > 0.32) || (S.groundSnow && ridge > 0.42);
      let col = isSnow ? lit(hex(snow), n[0] / l, n[1] / l, n[2] / l, 3) : lit(hex(rock), n[0] / l, n[1] / l, n[2] / l, 3);
      if (!isSnow && (N3.noise(x * 0.3, y * 0.5) > 0.7)) col = sc(col, 0.85); // Felsrisse
      col = fog(col, fogBase + clamp((y - top) / 160) * fogGain);
      L.set(x, y, col);
    }
  }
}

/* ---------- Nadelbäume, Laubbäume, Felsen ---------- */
function conifer(L, cx, by, h, w, opts = {}) {
  const { fogT = 0, dark = '#24402f', mid = '#35583b', litC = '#56794a', snow = S.groundSnow } = opts;
  const tiers = Math.max(3, Math.round(h / (h > 120 ? 22 : 8)));
  const top = by - h;
  for (let y = Math.floor(top); y <= by; y++) {
    const t = (y - top) / h, tierT = (t * tiers) % 1;
    const base = w * (0.1 + t * 0.9) * (0.55 + Math.pow(tierT, 1.6) * 0.45);
    const jl = (N4.noise(cx * 0.37 + 3, y * 0.45) - 0.5) * w * 0.5, jr = (N4.noise(cx * 0.37 + 9, y * 0.45) - 0.5) * w * 0.5;
    const hl = Math.max(0.5, base + jl), hr = Math.max(0.5, base + jr);
    for (let x = Math.floor(cx - hl); x <= cx + hr; x++) {
      const half = x < cx ? hl : hr;
      const u = (x - cx) / Math.max(1, half);
      if (Math.abs(u) > 0.7 && N4.noise(x * 0.8, y * 0.8) > 0.72) continue; // ausgefranste Astspitzen
      const facing = u * Math.sign(LDIR[0] || 0.01);
      let col = hex(facing > 0.35 ? litC : facing > -0.3 ? mid : dark);
      if (tierT < 0.07 && Math.abs(u) > 0.45) col = hex(dark);
      col = mul(col, add(AMB, sc(LIGHT, 0.7)));
      if (snow && tierT > 0.82 && Math.abs(u) < 0.95 && N4.noise(x * 0.5, y * 0.5) > 0.35) col = lit(hex('#eef1f4'), u * 0.5, -0.8, 0.5, 2);
      L.set(x, y, fog(col, fogT));
    }
  }
  if (h > 20) for (let k = 0; k < h * 0.12; k++) L.set(cx, by + k, fog(mul(hex('#3a2a1e'), add(AMB, sc(LIGHT, 0.5))), fogT));
}
function blobTree(L, cx, by, s, fogT = 0) {
  // Laubbaum (Frühling Blüte, Sommer grün, Herbst orange, Winter kahl)
  const trunk = hex('#3d2c22');
  const branch = (x0, y0, ang, len, wid, depth) => {
    for (let k = 0; k < len; k++) { const x = x0 + Math.cos(ang) * k, y = y0 + Math.sin(ang) * k; for (let w = -wid / 2; w <= wid / 2; w++) L.set(x + w, y, fog(lit(trunk, w > 0 ? 0.6 : -0.6, 0, 0.6, 2), fogT)); }
    if (depth > 0) { const ex = x0 + Math.cos(ang) * len, ey = y0 + Math.sin(ang) * len; branch(ex, ey, ang - 0.45, len * 0.68, Math.max(1, wid * 0.65), depth - 1); branch(ex, ey, ang + 0.4, len * 0.62, Math.max(1, wid * 0.6), depth - 1); }
  };
  branch(cx, by, -Math.PI / 2 - 0.08, s * 0.5, Math.max(2, s * 0.09), 2);
  if (!S.leaf) return;
  const leaf = S.leaf.map(hex), r = rng(cx * 13 + by);
  for (let i = 0; i < 150; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.6, d = s * (0.2 + r() * 0.7);
    const x0 = cx + Math.cos(a) * d * 0.95, y0 = by - s * 0.68 + Math.sin(a) * d * 0.5, rad = s * (0.035 + r() * 0.05);
    for (let y = Math.floor(y0 - rad); y <= y0 + rad; y++) for (let x = Math.floor(x0 - rad); x <= x0 + rad; x++) {
      const dx = (x - x0) / rad, dy = (y - y0) / rad; if (dx * dx + dy * dy > 1 - N4.noise(x * 0.7, y * 0.7) * 0.5) continue;
      const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
      const outer = clamp(((x - cx) * LDIR[0] + (y - (by - s * 0.7)) * LDIR[1]) / (s * 0.6) * 0.5 + 0.5);
      const v = step(clamp(outer * 0.6 + (dx * LDIR[0] + dy * LDIR[1] + nz * LDIR[2]) * 0.4), 2);
      L.set(x, y, fog(mul(leaf[Math.round(v * 2)], add(AMB, sc(LIGHT, 0.75))), fogT));
    }
  }
}
function rock(L, cx, cy, rx, ry, fogT = 0) {
  const nz = makeNoise(Math.round(cx * 7 + cy));
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy > 1 - nz.noise(x * 0.15, y * 0.15) * 0.35) continue;
    const f = nz.ridged(x * 0.06, y * 0.08, 3);
    const n = [dx + (nz.noise(x * 0.08, y * 0.08) - 0.5) * 1.6, dy - 0.4 + (f - 0.5), 0.7], l = Math.hypot(...n);
    let col = lit(hex('#7d8496'), n[0] / l, n[1] / l, n[2] / l, 3);
    if (dy < -0.3 && nz.noise(x * 0.25, y * 0.25) > 0.45) col = S.groundSnow ? lit(hex('#eef1f4'), 0, -1, 0.5, 2) : lit(hex(S.grass[1]), 0, -1, 0.5, 2);
    L.set(x, y, fog(col, fogT));
  }
}

/* ---------- Haus-Bausatz (Strohdach-Langhaus, Fachwerk) ---------- */
export function house(L, x, y, opts = {}) {
  // x,y = Mitte unten der Giebelseite. opts: shadow (0..1), moss, night, snow
  const { shadow = 0, moss = false } = opts, night = T.body === 'moon', snow = S.groundSnow;
  const ls = 1 - shadow * 0.75;
  const P = (xx, yy, col) => L.set(xx, yy, shadow ? mix(col, mul(col, hex('#7f8fb8')), shadow * 0.35) : col);
  const W2 = 22, wallH = 18, roofH = 30, depth = 30, dDrop = 0.42;
  // Fundament
  for (let i = -W2 - 2; i <= W2 + depth; i++) for (let k = 0; k < 3; k++) P(x + i, y - k + (i > W2 ? Math.round((i - W2) * -dDrop) : 0), lit(hex('#7a7d86'), 0, -0.3, 0.8, 2, ls));
  // Seitenwand rechts (zur Sonne bei Abend)
  for (let i = 0; i < depth; i++) for (let k = 0; k < wallH; k++) {
    const xx = x + W2 + i, yy = y - 3 - k - Math.round(i * dDrop);
    const beam = i % 10 < 2 || k < 2 || k > wallH - 3;
    P(xx, yy, lit(hex(beam ? '#4a3424' : '#9b8467'), 0.9, 0, 0.4, 2, ls));
  }
  // Giebelwand vorne
  for (let k = 0; k < wallH; k++) for (let i = -W2; i <= W2; i++) {
    const beam = Math.abs(i) > W2 - 2 || k < 2 || k > wallH - 3 || Math.abs(i) < 1;
    P(x + i, y - 3 - k, lit(hex(beam ? '#4a3424' : '#a38c6d'), -0.3, 0, 0.9, 2, ls));
  }
  // Tür, Fenster
  for (let k = 0; k < 11; k++) for (let i = -4; i <= 3; i++) if (!(k > 9 && (i === -4 || i === 3))) P(x + i, y - 3 - k, lit(hex('#3a2618'), -0.3, 0, 0.9, 2, ls));
  const win = night ? hex('#ffcf74') : lit(hex('#2a2a36'), 0, 0, 1, 1, ls);
  for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) { L.set(x + 10 + i, y - 12 - k, win); L.set(x + W2 + 12 + i, y - 12 - k - Math.round((12 + i) * dDrop), win); }
  // Giebeldreieck vorne mit gekreuzten Balken
  const gy = y - 3 - wallH;
  for (let k = 0; k < roofH * 0.62; k++) { const half = W2 * (1 - k / (roofH * 0.62)); for (let i = -half; i <= half; i++) P(x + i, gy - k, lit(hex(Math.abs(i) < 1 ? '#4a3424' : '#8d775c'), -0.3, 0, 0.9, 2, ls)); }
  // Strohdach: Vorderkante + große Dachfläche nach hinten
  const peakY = gy - roofH;
  const roofPix = [];
  for (let k = 0; k <= roofH + 4; k++) {
    const yy = peakY + k, half = (W2 + 5) * (k / roofH);
    for (let side = -1; side <= 1; side += 2) for (let t = 0; t < 4; t++) roofPix.push([x + side * (half - t), yy, side, 0]); // Strohkante am Giebel
    for (let i = 0; i < depth + 4; i++) roofPix.push([x + (W2 + 5) * (k / roofH) + i - 1, yy - Math.round(i * dDrop), 1, i]);
  }
  for (const [xx, yy, side, i] of roofPix) {
    if (yy > gy + 4) continue;
    const streak = N4.noise(xx * 0.9, yy * 0.18);
    let base = hex(streak > 0.6 ? '#c4a466' : streak > 0.35 ? '#a88850' : '#86683c');
    let n = side < 0 ? [-0.7, -0.5, 0.5] : [0.75, -0.55, 0.4];
    let col = lit(base, ...n, 3, ls);
    if (moss && N3.noise(xx * 0.22, yy * 0.22) > 0.48) col = lit(hex(N3.noise(xx, yy) > 0.5 ? '#5e7a3a' : '#456632'), ...n, 2, ls);
    if (snow && (N3.noise(xx * 0.3, yy * 0.4) > 0.3 || i > 2)) col = lit(hex('#f0f2f4'), ...n, 2, ls);
    P(xx, yy, col);
  }
  // Firstbalken mit gekreuzten Enden
  for (let i = -3; i < depth + 4; i++) P(x + i, peakY - Math.round(Math.max(0, i) * dDrop) - 1, lit(hex('#4a3424'), 0, -1, 0.4, 2, ls));
  for (let k = 0; k < 6; k++) { P(x - 2 - k * 0.6, peakY - 1 - k, lit(hex('#4a3424'), 0, -1, 0.5, 2, ls)); P(x + 2 + k * 0.6, peakY - 1 - k, lit(hex('#4a3424'), 0, -1, 0.5, 2, ls)); }
  // Schornstein
  for (let k = 0; k < 9; k++) for (let i = 0; i < 4; i++) P(x + W2 + 14 + i, peakY + 10 - k - Math.round(14 * dDrop), lit(hex('#6f6a66'), i > 1 ? 0.8 : -0.4, 0, 0.6, 2, ls));
  return { chimney: [x + W2 + 16, peakY + 1 - Math.round(14 * dDrop)], window: [x + 12, y - 14] };
}

/* ---------- Szene ---------- */
const leftCliff = (x) => 118 + Math.pow(x / 230, 1.5) * 170 + N2.fbm(x * 0.03, 2, 4) * 18;
const rightSlope = (x) => 300 - Math.pow(Math.max(0, x - 470) / 170, 1.2) * 150 + N2.fbm(x * 0.03, 5, 4) * 14;
const groundY = (x) => 282 + Math.sin(x * 0.012) * 4 + N1.fbm(x * 0.02, 9, 3) * 8;
export const PLOTS = [{ x: 292, y: 300, shadow: 0 }, { x: 452, y: 292, shadow: 1, moss: true }];

export function renderBase() {
  const back = new Layer(), mid = new Layer(), front = new Layer();
  drawSky(back);
  // ferne Bergkette, dann Hauptmassiv
  mountain(back, (x) => 205 - N3.ridged(x * 0.01, 1.7, 5) * 70, { seed: 9, fogBase: 0.62, fogGain: 0.3, rock: '#76819a', snow: '#e8ecf2', yEnd: 250, faceX: 300 });
  mountain(back, mtnTop, { seed: 3, fogBase: 0.22, fogGain: 0.55, rock: '#6a7690', snow: '#f1eee6', yEnd: 262, faceX: PEAK });
  // Nebelband
  for (let y = 205; y < 265; y++) for (let x = 0; x < W; x++) { const n = N1.fbm(x * 0.012, y * 0.05, 4); const t = clamp(1 - Math.abs(y - 240) / 26) * (n > 0.45 ? 1 : 0.55); if (t > 0.35) back.set(x, y, mix(back.has(x, y) ? back.get(x, y) : HAZE, HAZE, step(t * 0.8, 3))); }
  // Wälder im Tal, drei Tiefen
  const r = rng(12);
  for (const [y0, y1, n, hh, fogT] of [[236, 252, 420, 14, 0.58], [246, 266, 360, 22, 0.4], [258, 282, 280, 34, 0.22]]) {
    const list = []; for (let i = 0; i < n; i++) list.push([r() * W, y0 + r() * (y1 - y0)]);
    list.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of list) conifer(back, x, y, hh * (0.7 + r() * 0.6), hh * 0.22 * (0.8 + r() * 0.4), { fogT });
  }
  // linke Felswand, rechter Hang (Schatten auf Bauplatz 2)
  mountain(mid, leftCliff, { seed: 21, fogBase: 0.08, fogGain: 0.2, rock: '#5c6578', snow: '#e9edf2', yEnd: 300, faceX: -100 });
  mountain(mid, (x) => (x > 470 ? rightSlope(x) : 999), { seed: 23, fogBase: 0.06, fogGain: 0.15, rock: '#596274', snow: '#e9edf2', yEnd: 300, faceX: 900 });
  for (let i = 0; i < 70; i++) { const x = r() * 220, y = leftCliff(x) + 8 + r() * 60; if (y < 290) conifer(mid, x, y, 16 + r() * 22, 4 + r() * 3, { fogT: 0.1 }); }
  for (let i = 0; i < 50; i++) { const x = 480 + r() * 160, y = rightSlope(x) + 6 + r() * 50; if (y < 292) conifer(mid, x, y, 18 + r() * 24, 4 + r() * 3, { fogT: 0.08 }); }
  // Wiese / Lichtung
  const g = S.grass.map(hex);
  for (let x = 0; x < W; x++) for (let y = Math.floor(groundY(x)); y < H; y++) {
    const n = N2.fbm(x * 0.05, y * 0.11, 4), clump = N3.noise(x * 0.35, y * 0.6);
    let v = n * 0.6 + clump * 0.4 + (y - 280) * 0.002;
    let col = mul(g[v > 0.62 ? 2 : v > 0.42 ? 1 : 0], add(AMB, sc(LIGHT, 0.75)));
    if (!S.groundSnow && clump > 0.78) col = mul(hex(S.dry), add(AMB, sc(LIGHT, 0.8)));
    // Bergschatten über dem rechten Bauplatz
    if (T.body === 'sun' && x > 380 && y < 322 && (x - 380) * 0.6 + (322 - y) + N1.noise(x * 0.1, y * 0.2) * 14 > 36) col = sc(mix(col, mul(col, hex('#8090c0')), 0.5), 0.8);
    // Steinplattenweg zum Dorf
    const px = 300 + (y - 300) * 0.35 + Math.sin(y * 0.06) * 6, pw = 4 + (y - 290) * 0.12;
    if (y > 296 && Math.abs(x - px) < pw) {
      const cell = N4.noise(x * 0.32, y * 0.5);
      col = Math.abs(cell - 0.5) < 0.05 ? mul(hex('#3e4048'), add(AMB, sc(LIGHT, 0.4))) : lit(hex(S.groundSnow ? '#d8dde6' : '#8a8a8a'), 0, -0.6, 0.6, 2);
    }
    mid.set(x, y, fog(col, clamp(0.18 - (y - 282) * 0.004)));
  }
  // Grasbüschel und Heide auf der Lichtung
  for (let i = 0; i < 1600; i++) {
    const x = r() * W, y = groundY(x) + 4 + r() * (H - groundY(x)); const hgt = 2 + (y - 280) * 0.08 + r() * 3;
    if (Math.abs(x - (300 + (y - 300) * 0.35)) < 8 && y > 296) continue;
    const isHeather = r() < 0.12 && !S.groundSnow;
    const c = isHeather ? hex(S.heather) : (r() < 0.5 ? hex(S.dry) : g[2]);
    for (let k = 0; k < hgt; k++) mid.set(x + (k > hgt * 0.6 ? (r() < 0.5 ? 1 : -1) : 0), y - k, mul(c, add(AMB, sc(LIGHT, k > hgt * 0.5 ? 0.95 : 0.55))));
  }
  // Vordergrund: großer Nadelbaum links, Laubbaum rechts, Felsen
  conifer(front, 26, 372, 300, 46, { dark: '#18301f', mid: '#25412b', litC: '#3a5c3a' });
  rock(front, 560, 352, 64, 30); rock(front, 610, 330, 38, 22); rock(front, 70, 356, 46, 18);
  blobTree(front, 590, 330, 150);
  for (let i = 0; i < 260; i++) { const x = r() * W, y = H - r() * 26, hgt = 6 + r() * 12; const c = S.groundSnow ? hex('#c9d4e6') : (r() < 0.55 ? hex(S.dry) : g[1]); for (let k = 0; k < hgt; k++) front.set(x + (k / hgt) * (r() * 4 - 2), y - k, mul(c, add(AMB, sc(LIGHT, k > hgt * 0.6 ? 0.95 : 0.5)))); }
  return { back, mid, front };
}

/* ---------- Farbvorrat (aus dem Grund-Layer, damit Bausätze ihn nicht verschieben) ---------- */
export function buildPalette(layers, k = 44) {
  const r = rng(5), samples = [];
  for (const L of layers) for (let i = 0; i < 9000; i++) { const p = Math.floor(r() * W * H); if (L.a[p]) samples.push([clamp(L.c[p * 3]), clamp(L.c[p * 3 + 1]), clamp(L.c[p * 3 + 2])]); }
  let cent = Array.from({ length: k }, (_, i) => samples[Math.floor((i / k) * samples.length)].slice());
  const as = new Int32Array(samples.length);
  for (let it = 0; it < 8; it++) {
    for (let s = 0; s < samples.length; s++) { let b = 0, bd = 9; const c = samples[s]; for (let j = 0; j < k; j++) { const q = cent[j], d = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 + (c[2] - q[2]) ** 2; if (d < bd) { bd = d; b = j; } } as[s] = b; }
    const sum = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let s = 0; s < samples.length; s++) { const a = sum[as[s]]; a[0] += samples[s][0]; a[1] += samples[s][1]; a[2] += samples[s][2]; a[3]++; }
    cent = cent.map((c, j) => (sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c));
  }
  // feste Zusatzfarben für Bausätze (Stroh, Holz, Moos, Fensterlicht, Schnee)
  for (const h of ['#c4a466', '#a88850', '#86683c', '#4a3424', '#9b8467', '#5e7a3a', '#456632', '#ffcf74', '#f0f2f4', '#3a2618']) cent.push(lit(hex(h), 0.3, -0.5, 0.6, 3));
  cent.push(hex('#ffcf74'));
  return cent;
}
export function toImage(L, pal, passes = 2) {
  let idx = new Int16Array(W * H).fill(-1);
  for (let i = 0; i < W * H; i++) {
    if (!L.a[i]) continue;
    const c = [L.c[i * 3], L.c[i * 3 + 1], L.c[i * 3 + 2]];
    let best = 0, bd = 9;
    for (let j = 0; j < pal.length; j++) { const q = pal[j], d = 0.3 * (c[0] - q[0]) ** 2 + 0.59 * (c[1] - q[1]) ** 2 + 0.11 * (c[2] - q[2]) ** 2 + 0.2 * (((c[0] - c[1]) - (q[0] - q[1])) ** 2 + ((c[1] - c[2]) - (q[1] - q[2])) ** 2); if (d < bd) { bd = d; best = j; } }
    idx[i] = best;
  }
  for (let p = 0; p < passes; p++) {
    const nx = idx.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, me = idx[i]; if (me < 0) continue;
      const cnt = new Map(); let same = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const v = idx[i + dy * W + dx]; if (v < 0) continue; if (v === me) same++; cnt.set(v, (cnt.get(v) || 0) + 1); }
      if (same <= 1) { let bv = me, bc = 0; for (const [v, c] of cnt) if (c > bc) { bc = c; bv = v; } if (bc >= 4) nx[i] = bv; }
    }
    idx = nx;
  }
  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { const j = idx[i]; if (j < 0) continue; const q = pal[j]; out[i * 4] = clamp(q[0]) * 255; out[i * 4 + 1] = clamp(q[1]) * 255; out[i * 4 + 2] = clamp(q[2]) * 255; out[i * 4 + 3] = 255; }
  return out;
}

export function renderScene(time, season) {
  setMood(time, season);
  const { back, mid, front } = renderBase();
  lightBands([back, mid]);
  const pal = buildPalette([back, mid, front]);
  // Bausätze auf die Bauplätze
  const houses = new Layer(), info = [];
  for (const p of PLOTS) info.push(house(houses, p.x, p.y, { shadow: T.body === 'sun' ? p.shadow : 0, moss: p.moss }));
  return { pal, imgs: { back: toImage(back, pal), mid: toImage(mid, pal), houses: toImage(houses, pal, 0), front: toImage(front, pal, 1) }, info };
}

/* ---------- Animation ---------- */
export function drawAnim(cv, t, time, season, info) {
  if (cv.width !== W) { cv.width = W; cv.height = H; }
  const c = cv.getContext('2d'); c.clearRect(0, 0, W, H);
  const night = time === 'nacht';
  for (const h of info || []) for (let i = 0; i < 7; i++) { const ph = ((t / 2400) + i / 7 + h.chimney[0] * 0.01) % 1; c.fillStyle = night ? `rgba(150,160,190,${(0.6 * (1 - ph)).toFixed(2)})` : `rgba(235,232,226,${(0.7 * (1 - ph)).toFixed(2)})`; const s = ph > 0.4 ? 2 : 1; c.fillRect(Math.round(h.chimney[0] + ph * 10 + Math.sin(ph * 6 + i) * 2), Math.round(h.chimney[1] - ph * 30), s, s); }
  const r = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const kind = SEASONS[season].particles;
  const n = kind === 'snow' ? 140 : kind === 'none' ? 0 : 40;
  for (let i = 0; i < n; i++) {
    const sp = kind === 'snow' ? 9000 + r(i, 1) * 6000 : 14000 + r(i, 1) * 8000;
    const ph = ((t / sp) + r(i, 2)) % 1;
    const x = (r(i, 3) * W + ph * (kind === 'snow' ? 40 : 180) + Math.sin(t / 900 + i) * 6) % W, y = ph * H;
    c.fillStyle = kind === 'snow' ? 'rgba(240,244,250,.9)' : kind === 'petals' ? '#f3c3cc' : (i % 2 ? '#d9743a' : '#e8a24a');
    c.fillRect(Math.round(x), Math.round(y), kind === 'snow' && i % 3 === 0 ? 2 : 1, 1);
  }
  if (!night) for (let i = 0; i < 3; i++) { const ph = ((t / 30000) + i * 0.12) % 1; const x = 660 - ph * 720 + i * 12, y = 60 + i * 5 + Math.sin(ph * 18 + i) * 3, f = Math.floor(t / 260 + i) % 2; c.fillStyle = 'rgba(40,40,55,.8)'; c.fillRect(x, y, 1, 1); c.fillRect(x - 1, y - f, 1, 1); c.fillRect(x + 1, y - f, 1, 1); c.fillRect(x - 2, y - 1 + f, 1, 1); c.fillRect(x + 2, y - 1 + f, 1, 1); }
  if (night && season !== 'winter') for (let i = 0; i < 18; i++) { const ph = ((t / 7000) + r(i, 5)) % 1, a = Math.sin(ph * Math.PI); c.fillStyle = `rgba(210,255,150,${(a * 0.9).toFixed(2)})`; c.fillRect(Math.round(200 + r(i, 6) * 360 + Math.sin(ph * 7 + i) * 5), Math.round(285 + r(i, 7) * 50 - a * 6), 1, 1); }
}
export function drawGlow(cv, t, time, info) {
  const Sx = 2, w = cv.width = W * Sx, h = cv.height = H * Sx, c = cv.getContext('2d');
  const glow = (x, y, rad, col, a) => { const g = c.createRadialGradient(x * Sx, y * Sx, 0, x * Sx, y * Sx, rad * Sx); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect((x - rad) * Sx, (y - rad) * Sx, rad * 2 * Sx, rad * 2 * Sx); };
  const tm = TIMES[time];
  if (tm.body === 'sun') glow(tm.sun[0], tm.sun[1], 150, time === 'abend' ? '255,190,130' : '255,240,210', time === 'mittag' ? 0.25 : 0.4);
  else { glow(tm.sun[0], tm.sun[1], 60, '190,205,255', 0.35); for (const hh of info || []) glow(hh.window[0], hh.window[1], 16, '255,190,100', 0.55 + Math.sin(t / 300 + hh.window[0]) * 0.08); }
}
export function drawShade(cv, time) {
  const w = cv.width = W, h = cv.height = H, c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  const g = c.createRadialGradient(w * 0.5, h * 0.55, h * 0.35, w * 0.5, h * 0.55, h * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, time === 'nacht' ? 'rgba(5,8,25,0.6)' : 'rgba(30,25,40,0.45)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
export function drawGrain(cv) {
  const w = cv.width = 320, h = cv.height = 180, c = cv.getContext('2d'), img = c.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  c.putImageData(img, 0, 0);
}
