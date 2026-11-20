// Mossheart Grafik-Kern: Pixel-Maler, Licht in Stufen, Stimmungen (4 Tageszeiten x 4 Jahreszeiten).
// Stil: gestuftes Licht (keine weichen Verläufe), bläuliche Schatten, warme Lichter, Nebelschichten.
export let W = 960, H = 540;
export const K = 1.5; // Weltmaßstab relativ zum 640er-Entwurf

/* ---------- Werkzeuge ---------- */
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function makeNoise(seed) {
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
export const N1 = makeNoise(4), N2 = makeNoise(17), N3 = makeNoise(31), N4 = makeNoise(77);
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export const step = (v, n) => Math.round(clamp(v) * n) / n; // Licht in Stufen

export class Layer {
  constructor() { this.c = new Float32Array(W * H * 3); this.a = new Uint8Array(W * H); }
  set(x, y, col) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; this.c[i * 3] = col[0]; this.c[i * 3 + 1] = col[1]; this.c[i * 3 + 2] = col[2]; this.a[i] = 1; }
  get(x, y) { const i = y * W + x; return [this.c[i * 3], this.c[i * 3 + 1], this.c[i * 3 + 2]]; }
  has(x, y) { return x >= 0 && y >= 0 && x < W && y < H && this.a[y * W + x] === 1; }
}

/* ---------- Tageszeiten & Jahreszeiten ---------- */
export const TIMES = {
  morgen: { sky: ['#6f93bd', '#a9bfd6', '#f2dcc0'], sun: [110, 120], body: 'sun', light: [1.05, 0.92, 0.78], amb: [0.42, 0.48, 0.62], haze: '#c7d2de', rays: 0.14 },
  mittag: { sky: ['#4e86c0', '#8fb9dc', '#d9e8ee'], sun: [520, 26], body: 'sun', light: [1.05, 1.02, 0.94], amb: [0.46, 0.52, 0.64], haze: '#bfd0dc', rays: 0.1 },
  abend: { sky: ['#4b4c7c', '#c9879a', '#ffcf94'], sun: [565, 168], body: 'sun', light: [1.1, 0.74, 0.5], amb: [0.42, 0.38, 0.58], haze: '#c99aa6', rays: 0.16 },
  nacht: { sky: ['#0b1128', '#1d2a50', '#34446e'], sun: [470, 58], body: 'moon', light: [0.42, 0.5, 0.75], amb: [0.16, 0.2, 0.34], haze: '#2c3a5e', rays: 0 },
};
export const SEASONS = {
  fruehling: { grass: ['#46703a', '#6a9450', '#9cbc68'], dry: '#b8b26a', leaf: ['#b5617a', '#e49aab', '#f6cdd2'], heather: '#d488b0', snowline: 120, groundSnow: 0, particles: 'petals' },
  sommer: { grass: ['#3b5a35', '#577a43', '#83a058'], dry: '#a8955a', leaf: ['#2f5a34', '#4f7f3c', '#7fa652'], heather: '#8a5a8e', snowline: 85, groundSnow: 0, particles: 'none' },
  herbst: { grass: ['#6a6a35', '#9a8a45', '#c9a95a'], dry: '#c78a45', leaf: ['#8a3a26', '#cf6a35', '#f2a75a'], heather: '#8a4a5a', snowline: 150, groundSnow: 0, particles: 'leaves' },
  winter: { grass: ['#8a9ab5', '#c9d4e6', '#f2f2ee'], dry: '#a39a7a', leaf: null, heather: '#6a5a6a', snowline: 260, groundSnow: 1, particles: 'snow' },
};
export let T = TIMES.mittag, S = SEASONS.sommer, LDIR = [0, -1, 0.5], LIGHT, AMB, HAZE;
export function setMood(time, season) {
  T = TIMES[time]; S = SEASONS[season];
  LIGHT = T.light; AMB = T.amb; HAZE = hex(T.haze);
  const [sx, sy] = T.sun;
  const v = [(sx - 320) / 320, -0.6 - (1 - sy / 200) * 0.4, 0.55];
  const l = Math.hypot(...v); LDIR = v.map((x) => x / l);
}
// Licht in Stufen: Basisfarbe * (Umgebung + Licht * gestuftes Diffus)
export function lit(base, nx, ny, nz, bands = 3, lightScale = 1) {
  const d = step(Math.max(0, nx * LDIR[0] + ny * LDIR[1] + nz * LDIR[2]), bands);
  return mul(base, add(AMB, sc(LIGHT, d * lightScale)));
}
export const fog = (col, t) => mix(col, HAZE, step(clamp(t), 6));

/* ---------- Himmel, Wolken, Sterne, Lichtbänder ---------- */
export function drawSky(L) {
  const [c0, c1, c2] = T.sky.map(hex), [sx, sy] = T.sun.map((v) => v * K);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = step(y / (250 * K), 9);
    let col = t < 0.5 ? mix(c0, c1, t / 0.5) : mix(c1, c2, clamp((t - 0.5) / 0.5));
    const d = Math.hypot(x - sx, (y - sy) * 1.2);
    if (T.body === 'sun') col = add(col, sc(LIGHT, step(Math.max(0, 1 - d / (110 * K)) ** 2, 3) * 0.28));
    // kantige Wolkenballen
    const n = N1.fbm(x * 0.008 / K + 7, y * 0.026 / K, 5) * (1 - Math.abs(y / (250 * K) - 0.28) * 2.6);
    if (n > 0.34) {
      const top = N1.fbm(x * 0.008 / K + 7, (y - 4) * 0.026 / K, 5) * (1 - Math.abs((y - 4) / (250 * K) - 0.28) * 2.6);
      const litEdge = top < n - 0.01 ? 1 : 0.45;
      const cl = T.body === 'moon' ? mix(hex('#3a4a72'), hex('#7d8fb8'), litEdge) : mix(mix(c1, hex('#ffffff'), 0.15), mix(hex('#fff6e2'), LIGHT, 0.2), litEdge);
      col = mix(col, cl, step((n - 0.34) * 7, 3));
    }
    if (T.body === 'moon' && N4.noise(x * 0.9, y * 0.9) > 0.93 && y < 200 * K) col = mix(col, [0.95, 0.95, 1], 0.8);
    L.set(x, y, col);
  }
  const rr = (T.body === 'sun' ? 9 : 7) * K;
  for (let y = sy - rr; y <= sy + rr; y++) for (let x = sx - rr; x <= sx + rr; x++) if (Math.hypot(x - sx, y - sy) < rr - 0.5) L.set(x, y, T.body === 'sun' ? [1.15, 1.05, 0.85] : [0.92, 0.93, 0.98]);
}
export function lightBands(layers) {
  if (!T.rays) return;
  const [sx, sy] = T.sun.map((v) => v * K);
  for (const L of layers) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!L.a[i]) continue;
    const ang = Math.atan2(y - sy, x - sx);
    const band = Math.sin(ang * 11 + 0.9) > 0.86 || Math.sin(ang * 7 + 2.3) > 0.93;
    if (!band) continue;
    const dist = Math.hypot(x - sx, y - sy);
    if (dist < 90 * K || dist > 520 * K || y > 330 * K) continue;
    const k = T.rays * Math.min(1, (dist - 90 * K) / (80 * K)) * (1 - dist / (520 * K));
    L.c[i * 3] += LIGHT[0] * k; L.c[i * 3 + 1] += LIGHT[1] * k; L.c[i * 3 + 2] += LIGHT[2] * k * 0.85;
  }
}

/* ---------- Berge mit Facetten und Schnee ---------- */
export const PEAK = 360;
export const mtnTop = (x) => 250 - (Math.pow(Math.max(0, 1 - Math.abs(x - PEAK) / 270), 1.25) * 205 + Math.pow(Math.max(0, 1 - Math.abs(x - 130) / 150), 1.5) * 85 + N2.ridged(x * 0.012, 0.3, 5) * 34);
export function mountain(L, topFn, opts) {
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
      const snowLine = S.snowline * K + (top - 40 * K) * 0.6;
      const isSnow = (y < snowLine + (ridge - 0.45) * 90 && ridge > 0.32) || (S.groundSnow && ridge > 0.42);
      let col = isSnow ? lit(hex(snow), n[0] / l, n[1] / l, n[2] / l, 3) : lit(hex(rock), n[0] / l, n[1] / l, n[2] / l, 3);
      if (!isSnow && (N3.noise(x * 0.3, y * 0.5) > 0.7)) col = sc(col, 0.85); // Felsrisse
      col = fog(col, fogBase + clamp((y - top) / 160) * fogGain);
      L.set(x, y, col);
    }
  }
}

/* ---------- Nadelbäume, Laubbäume, Felsen ---------- */
export function conifer(L, cx, by, h, w, opts = {}) {
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
export function blobTree(L, cx, by, s, fogT = 0) {
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
export function rock(L, cx, cy, rx, ry, fogT = 0) {
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

/* ---------- Farbvorrat (aus dem Grund-Layer, damit Bausätze ihn nicht verschieben) ---------- */
export function buildPalette(layers, k = 44, size = W * H) {
  const r = rng(5), samples = [];
  for (const L of layers) for (let i = 0; i < 12000; i++) { const p = Math.floor(r() * L.a.length); if (L.a[p]) samples.push([clamp(L.c[p * 3]), clamp(L.c[p * 3 + 1]), clamp(L.c[p * 3 + 2])]); }
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

