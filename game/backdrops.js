// Mossheart Hintergründe: für jede Gegend Ferne (Himmel, Berge, Wasser, Riesenbäume …), Waldsaum am Horizont und Vordergrund.
import {
  W, H, K, rng, makeNoise, N1, N2, N3, N4, clamp, mix, mul, add, sc, hex, step, lit, fog,
  drawSky, mountain, conifer, blobTree, mtnTop, PEAK,
} from './core.js?v=1';
import * as CORE from './core.js?v=1';

const S = () => CORE.S, T = () => CORE.T;
const flat = (base, k = 0.75) => mul(base, add(CORE.AMB, sc(CORE.LIGHT, k)));
const HZ = () => CORE.HAZE;

/* ---------- kleine Bausteine ---------- */
export function bush(L, x, y, rx, ry, cols, fogT = 0, snowTop = false) {
  const n = 2 + Math.round(rx / 2.5);
  for (let b = 0; b < n; b++) {
    const bx = x + (n > 1 ? (b / (n - 1) - 0.5) * rx * 1.5 : 0) + (N4.noise(x + b * 7, y) - 0.5) * 3, br = ry * (0.55 + N4.noise(b * 2.3, x * 0.31) * 0.5), by = y - br * 0.75 - N4.noise(b * 3.1, x * 0.2) * ry * 0.35;
    for (let yy = -br; yy <= br * 0.75; yy++) for (let xx = -br * 1.25; xx <= br * 1.25; xx++) {
      const dx = xx / (br * 1.25), dy = yy / br, d = dx * dx + dy * dy; if (d > 1) continue;
      if (d > 0.55 && N3.noise((bx + xx) * 0.7, (by + yy) * 0.7) > 0.78) continue;
      let c = lit(hex(cols[dy < -0.35 ? 2 : dy < 0.25 ? 1 : 0]), dx * 0.85, dy * 0.8 - 0.35, Math.sqrt(1 - d), 3);
      if (snowTop && dy < -0.25 && N3.noise((bx + xx) * 0.5, (by + yy) * 0.9) > 0.35) c = lit(hex('#eef1f4'), dx, -0.8, 0.6, 2);
      L.set(bx + xx, by + yy, fog(c, fogT));
    }
  }
}
export function birch(L, x, by, h, fogT = 0) {
  const lean = (N4.noise(x * 0.1, 3) - 0.5) * 0.25, tw = Math.max(1.5, h * 0.045);
  for (let k = 0; k < h * 0.92; k++) {
    const t = k / h, cx = x + lean * k, w = tw * (1 - t * 0.6);
    for (let i = -w; i <= w; i += 0.5) {
      const u = i / w, mark = N3.noise(x * 0.3 + i * 0.6, k * 0.55) > 0.72;
      L.set(cx + i, by - k, fog(mark ? flat(hex('#2a2622'), 0.7) : lit(hex('#e8e4da'), u, 0, Math.sqrt(1 - u * u * 0.9), 3), fogT));
    }
    if (k > h * 0.45 && k % 7 === 3) { const dir = (k % 14 < 7) ? 1 : -1; for (let j = 0; j < h * 0.12; j++) L.set(cx + dir * j, by - k - j * 0.6, fog(flat(hex('#4a4038'), 0.7), fogT)); }
  }
  const leaf = S().leaf; if (!leaf) return;
  const lc = S().particles === 'leaves' ? ['#b8862a', '#e0b040', '#f2d36a'] : S().particles === 'petals' ? ['#6a9a3a', '#9cc458', '#cfe58a'] : ['#4f7f3c', '#79a84a', '#a8cc6a'];
  const r = rng(Math.round(x * 31 + by));
  for (let i = 0; i < h * 1.6; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * h * 0.32, px = x + lean * h * 0.7 + Math.cos(a) * d * 0.8, py = by - h * 0.7 + Math.sin(a) * d * 0.9;
    const rad = 1 + r() * 1.6;
    for (let yy = -rad; yy <= rad; yy++) for (let xx = -rad; xx <= rad; xx++) if (xx * xx + yy * yy <= rad * rad) {
      const v = clamp(((px + xx - x) * CORE.LDIR[0] + (py + yy - (by - h * 0.7)) * CORE.LDIR[1]) / (h * 0.3) * 0.5 + 0.5);
      L.set(px + xx, py + yy, fog(flat(hex(lc[v > 0.66 ? 2 : v > 0.33 ? 1 : 0]), 0.85), fogT));
    }
  }
}
function boulder(L, cx, cy, rx, ry, base = '#7d8496', fogT = 0, mossK = 0) {
  const nz = makeNoise(Math.round(cx * 7 + cy * 3));
  for (let y = Math.floor(cy - ry); y <= cy + ry * 0.4; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy > 1 - nz.noise(x * 0.2, y * 0.2) * 0.3) continue;
    const f = nz.ridged(x * 0.09, y * 0.11, 3), n = [dx + (nz.noise(x * 0.1, y * 0.1) - 0.5) * 1.2, dy - 0.45 + (f - 0.5) * 0.8, 0.7], l = Math.hypot(...n);
    let col = lit(hex(base), n[0] / l, n[1] / l, n[2] / l, 3);
    if (dy < -0.2 && nz.noise(x * 0.3, y * 0.3) > 0.55 - mossK) col = S().groundSnow ? lit(hex('#eef1f4'), 0, -1, 0.5, 2) : lit(hex(mossK > 0.2 ? '#4f7a34' : S().grass[1]), n[0] / l, -0.8, 0.6, 2);
    L.set(x, y, fog(col, fogT));
  }
}
export { boulder };
function stone(L, x, by, w, h, fogT) {
  for (let k = 0; k < h; k++) { const t = k / h, half = w * (1 - t * t * 0.35) * (k > h - 2 ? 0.8 : 1); for (let i = -half; i <= half; i++) { const u = i / half; L.set(x + i, by - k, fog(lit(hex(N3.noise((x + i) * 0.5, k * 0.4) > 0.66 ? '#6f7568' : '#8c8f86'), u * 0.9, -0.2 - t * 0.3, Math.sqrt(1 - u * u * 0.8), 3), fogT)); } }
}
function fern(L, x, y, s, fogT = 0, col = null) {
  const winter = S().groundSnow, c1 = col || (winter ? '#5a6e60' : '#4f7f3c'), c2 = col || (winter ? '#7a8a80' : '#7fa652');
  for (let f = 0; f < 5; f++) { const a = -Math.PI / 2 + (f - 2) * 0.48, len = (3 + (f % 3)) * s; for (let t = 0; t < len; t++) L.set(x + Math.cos(a) * t * 1.3, y + Math.sin(a) * t + (t * t) / (len * 3), fog(lit(hex(t > len * 0.55 ? c2 : c1), Math.cos(a), -0.5, 0.6, 2), fogT)); }
}
// sanfte Hügelkette
function hills(L, topFn, opts) {
  const { yEnd = H, cols, fogT = 0, seed = 1, heather = 0 } = opts, nz = makeNoise(seed);
  for (let x = 0; x < W; x++) {
    const top = topFn(x), top2 = topFn(x + 2);
    for (let y = Math.max(0, Math.floor(top)); y < yEnd; y++) {
      const slope = (top2 - top) * 0.4, n = [slope, -0.6 - clamp((y - top) / 60) * 0.3, 0.7], l = Math.hypot(...n);
      const v = nz.fbm(x * 0.02, y * 0.05, 4), patch = nz.noise(x * 0.012, y * 0.03);
      let base = cols[v > 0.62 ? 2 : v > 0.42 ? 1 : 0];
      if (heather && patch > 1 - heather && !S().groundSnow) base = N3.noise(x * 0.4, y * 0.5) > 0.5 ? S().heather : '#6a4a5a';
      let col = lit(hex(base), n[0] / l, n[1] / l, n[2] / l, 3);
      if (y - top < 2) col = sc(col, 1.06);
      L.set(x, y, fog(col, fogT + clamp((y - top) / 200) * 0.05));
    }
  }
}
// Spiegelung einer Linie in Wasser: Pixel oberhalb von yLine werden nach unten gespiegelt (gestört, abgedunkelt)
function waterBand(L, y0, y1, xFrom, xTo, opts = {}) {
  const deep = hex(opts.deep || '#2c5468'), shallow = hex(opts.shallow || '#5a8aa0'), [sx] = T().sun.map((v) => v * K);
  const src = (x, y) => (L.has(x, y) ? L.get(x, y) : HZ());
  const rows = [];
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0), row = [];
    for (let x = xFrom; x < xTo; x++) {
      const wob = Math.round(Math.sin(y * 0.9 + x * 0.05) * (0.6 + t * 1.6) + N4.noise(x * 0.15, y * 0.8) * 1.2 - 0.6);
      const my = Math.round(y0 - (y - y0) * 1.05 - 1), refl = src(clamp(x + wob, 0, W - 1), clamp(my, 0, H - 1));
      let c = mix(mul(refl, [0.78, 0.86, 0.95]), mix(shallow, deep, t), 0.32 + t * 0.35);
      if (Math.abs(N4.noise(x * 0.06, y * 0.9) - 0.5) < 0.03) c = mix(c, add(c, sc(CORE.LIGHT, 0.25)), 0.7); // Wellenlinien
      if (T().body === 'sun' && Math.abs(x - sx) < 18 + t * 40 && N3.noise(x * 0.4, y * 1.3) > 0.62) c = add(c, sc(CORE.LIGHT, 0.35)); // Sonnenglitzern
      if (T().body === 'moon' && Math.abs(x - sx) < 10 + t * 20 && N3.noise(x * 0.4, y * 1.3) > 0.7) c = add(c, [0.25, 0.27, 0.32]);
      row.push([x, c]);
    }
    rows.push([y, row]);
  }
  for (const [y, row] of rows) for (const [x, c] of row) L.set(x, y, c);
}
function reflectRegion(L, x0, x1, ySrc0, yLine, yMax, tint = [0.72, 0.8, 0.9]) {
  const out = [];
  for (let y = yLine + 1; y <= yMax; y++) {
    const sy = yLine - (y - yLine); if (sy < ySrc0) break;
    for (let x = x0; x <= x1; x++) if (L.has(x, sy) && L.has(x, y)) { const wob = Math.round(Math.sin(y * 1.1 + x * 0.1) * 0.8); if (L.has(x + wob, sy)) out.push([x, y, mix(mul(L.get(x + wob, sy), tint), L.get(x, y), 0.35)]); }
  }
  for (const [x, y, c] of out) L.set(x, y, c);
}
function hazeBand(L, yA, yB, yMid, half, gain = 0.8) {
  const HZc = HZ();
  for (let y = yA; y < yB; y++) for (let x = 0; x < W; x++) { const n = N1.fbm(x * 0.008, y * 0.033, 4); const t = clamp(1 - Math.abs(y - yMid) / half) * (n > 0.45 ? 1 : 0.55); if (t > 0.35) L.set(x, y, mix(L.has(x, y) ? L.get(x, y) : HZc, HZc, step(t * gain, 3))); }
}
function conBelt(L, r, belts, xFrom = 0, xTo = W, opts = {}) {
  for (const [y0, y1, n, hh, fogT] of belts) {
    const list = []; for (let i = 0; i < n; i++) list.push([xFrom + r() * (xTo - xFrom), y0 + r() * (y1 - y0)]); list.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of list) conifer(L, x, y, hh * (0.7 + r() * 0.6), hh * 0.22 * (0.8 + r() * 0.4), { fogT, ...opts });
  }
}
// Felswand: senkrechte Klüfte, kantige Facetten im gestuften Licht, sanfte Schichtung, vereinzelte Grasbänder
function cliffWall(L, topFn, opts) {
  const { yEnd, faceSign = 1, cols = ['#9a5a3c', '#b4704a', '#8a5038', '#c08a5a'], fogBase = 0.05, fogGain = 0.35, seed = 5, strata = 0.6 } = opts, nz = makeNoise(seed);
  const lx = Math.sign(CORE.LDIR[0] || 1);
  for (let x = 0; x < W; x++) {
    const top = topFn(x); if (top >= yEnd) continue;
    for (let y = Math.max(0, Math.floor(top)); y < yEnd; y++) {
      // Facetten: gestreckt in der Senkrechten (Klüfte), Kanten über Quantisierung
      const u = x * 0.035, v = y * 0.012, f = nz.ridged(u, v, 4), fr = nz.ridged(u + 0.035, v, 4), fd = nz.ridged(u, v + 0.012, 4);
      const gx = (fr - f) * 18, gy = (fd - f) * 10;
      const face = step(clamp(0.55 + faceSign * lx * 0.25 - gx * lx * 0.9 - gy * 0.5), 3);
      const band = Math.floor((y + nz.noise(x * 0.01, y * 0.005) * 22) / 13);
      const base = strata > 0 && nz.noise(band * 1.7, 2) < strata ? cols[Math.abs(band) % cols.length] : cols[0];
      let col = flat(hex(base), 0.38 + face * 0.55);
      if (Math.abs(fr - f) > 0.09) col = sc(col, 0.74); // Klüfte
      const ledge = (y + Math.round(nz.noise(x * 0.01, y * 0.005) * 22)) % 13 === 0 && nz.noise(x * 0.05, band) > 0.58;
      if (ledge) col = S().groundSnow ? flat(hex('#eef1f4'), 0.85) : flat(hex(nz.noise(x * 0.4, y) > 0.5 ? S().grass[1] : S().grass[0]), 0.7);
      if (y - top < 2) col = S().groundSnow ? flat(hex('#eef1f4'), 0.9) : flat(hex(base), 0.95);
      L.set(x, y, fog(col, fogBase + clamp((y - top) / 260) * fogGain));
    }
  }
}
function giantTrunk(L, x, by, w, fogT, mossy = true) {
  const nz = makeNoise(Math.round(x * 13)), lean = (nz.noise(1, 2) - 0.5) * 0.08;
  for (let y = 0; y <= by; y++) {
    const k = by - y, flare = k < w * 0.9 ? 1 + Math.pow(1 - k / (w * 0.9), 2.2) * 1.3 : 1, half = (w / 2) * flare * (1 + nz.noise(y * 0.02, 3) * 0.08), cx = x + lean * (by - y);
    for (let i = -half; i <= half; i++) {
      const u = i / half, bark = nz.noise((cx + i) * 0.35, y * 0.04), ridge = Math.sin((i / (w * 0.08)) + bark * 3) > 0.6;
      let col = lit(hex(ridge ? '#4a3a2e' : '#5e4a3a'), u * 0.95, 0, Math.sqrt(Math.max(0, 1 - u * u)), 3);
      if (mossy && nz.noise((cx + i) * 0.08, y * 0.03) > 0.52 - (u < 0 ? 0.12 : 0)) col = lit(hex(nz.noise((cx + i) * 0.5, y * 0.2) > 0.5 ? '#4f7a34' : '#3d6a2c'), u * 0.9, -0.2, 0.8, 3);
      // Wurzelfüße: Ausläufer am Boden
      if (k < w * 0.5 && Math.abs(u) > 0.55 && nz.noise((cx + i) * 0.2, 9) < 0.3) continue;
      L.set(cx + i, y, fog(col, fogT));
    }
  }
}
function canopy(L, bottomFn, fogT = 0) {
  const leaf = S().leaf ? ['#1f3a22', '#2e5230', '#4b7243'] : ['#3a3a3e', '#4a4a50', '#5a5a62'];
  for (let x = 0; x < W; x++) {
    const b = bottomFn(x);
    for (let y = 0; y < b; y++) {
      const n = N2.fbm(x * 0.03, y * 0.05, 4), hole = N1.fbm(x * 0.012 + 3, y * 0.02, 3) > 0.66 && y < b - 12;
      if (hole) continue;
      const v = clamp(n * 1.2 - (y > b - 8 ? 0.15 : 0));
      L.set(x, y, fog(flat(hex(leaf[v > 0.6 ? 2 : v > 0.42 ? 1 : 0]), 0.8), fogT));
    }
  }
}

/* ======================================================================
   Ferne je Gegend (Ebene back)
   ====================================================================== */
export const BACKDROP = {
  hochtal(back, L, r) {
    drawSky(back);
    mountain(back, (x) => 285 - N3.ridged(x * 0.0067, 1.7, 5) * 105, { seed: 9, fogBase: 0.6, fogGain: 0.3, rock: '#76819a', snow: '#e8ecf2', yEnd: 354, faceX: 450 });
    mountain(back, (x) => mtnTop(x / K) * K - 33, { seed: 3, fogBase: 0.2, fogGain: 0.55, rock: '#6a7690', snow: '#f1eee6', yEnd: 372, faceX: PEAK * K });
    hazeBand(back, 285, 376, 339, 36);
    conBelt(back, r, [[327, 348, 900, 19, 0.58], [339, 363, 800, 30, 0.4], [351, 375, 640, 45, 0.22]]);
  },
  seeufer(back, L, r) {
    drawSky(back);
    mountain(back, (x) => 268 - N3.ridged(x * 0.006 + 4, 1.7, 5) * 70 - Math.pow(Math.max(0, 1 - Math.abs(x - 300) / 260), 1.4) * 60, { seed: 21, fogBase: 0.55, fogGain: 0.25, rock: '#7a86a0', snow: '#eef0f4', yEnd: 330, faceX: 320 });
    // bewaldete Uferberge links und rechts
    hills(back, (x) => 300 + Math.min(Math.abs(x - 470) * 0.0, 0) - Math.max(0, 1 - x / 300) * 70 - Math.max(0, (x - 660) / 300) * 80 + N2.fbm(x * 0.02, 3, 3) * 8, { yEnd: 330, cols: ['#2c4632', '#36553a', '#46684a'], fogT: 0.32, seed: 4 });
    conBelt(back, r, [[300, 322, 500, 14, 0.42]], 0, 320); conBelt(back, r, [[296, 322, 520, 15, 0.42]], 640, W);
    conBelt(back, r, [[314, 322, 600, 9, 0.5]]);
    const { y0, y1 } = L.lake;
    waterBand(back, y0, y1 + 30, 0, W, { deep: '#25485e', shallow: '#4f7f98' });
    // kleine Insel mit Nadelbäumen
    const ix = 640, iy = 334;
    for (let y = iy - 6; y <= iy + 1; y++) for (let x = ix - 26; x <= ix + 26; x++) { const dx = (x - ix) / 26, dy = (y - iy) / 7; if (dx * dx + dy * dy > 1 - N3.noise(x * 0.3, y) * 0.3) continue; back.set(x, y, fog(lit(hex('#6f7a6a'), dx, -0.6, 0.7, 3), 0.25)); }
    for (let i = 0; i < 9; i++) conifer(back, ix - 18 + i * 4.4 + r() * 2, iy - 2 + r() * 2, 12 + r() * 12, 3.5, { fogT: 0.25 });
    reflectRegion(back, ix - 30, ix + 30, iy - 40, iy + 1, iy + 26);
    hazeBand(back, 300, 330, 318, 14, 0.7);
  },
  klamm(back, L, r) {
    drawSky(back);
    mountain(back, (x) => 250 - N3.ridged(x * 0.008 + 9, 1.7, 5) * 60 - Math.pow(Math.max(0, 1 - Math.abs(x - 480) / 160), 1.3) * 70, { seed: 33, fogBase: 0.6, fogGain: 0.25, rock: '#7a86a0', snow: '#eef0f4', yEnd: 350, faceX: 480 });
    hazeBand(back, 300, 360, 336, 26);
    conBelt(back, r, [[336, 352, 260, 16, 0.5], [346, 366, 200, 24, 0.36]], 320, 650);
    const lw = (x) => (x > 400 ? 999 : 58 + Math.pow(x / 400, 2.2) * 250 + N2.ridged(x * 0.03, 3, 4) * 34 - Math.max(0, Math.sin(x * 0.07)) * 10);
    const rw = (x) => (x < 570 ? 999 : 64 + Math.pow((W - x) / 390, 2.2) * 245 + N2.ridged(x * 0.03 + 7, 3, 4) * 34);
    cliffWall(back, lw, { yEnd: 392, faceSign: 1, seed: 7, fogBase: 0.04 });
    cliffWall(back, rw, { yEnd: 392, faceSign: -1, seed: 8, fogBase: 0.04 });
    // Kiefern auf den Felsbändern
    for (let i = 0; i < 26; i++) { const left = i % 2 === 0, x = left ? r() * 330 : 600 + r() * 360, top = left ? lw(x) : rw(x); if (top > 360) continue; const y = top + 20 + r() * 140; if (y > 380) continue; conifer(back, x, y, 10 + r() * 12, 3, { fogT: 0.12 + (y - top) / 900 }); }
  },
  heide(back, L, r) {
    drawSky(back);
    const g = S().grass;
    // ferne, blaue Hügelketten statt hoher Berge
    hills(back, (x) => 278 + Math.sin(x * 0.006 + 2) * 12 + Math.sin(x * 0.017) * 5 + N3.fbm(x * 0.01, 3, 3) * 8, { yEnd: 330, cols: ['#5a6a7a', '#64748a', '#6e7e94'], fogT: 0.5, seed: 9 });
    hills(back, (x) => 292 + Math.sin(x * 0.008 + 5) * 10 + N2.fbm(x * 0.012, 3, 3) * 8, { yEnd: 335, cols: ['#4e6058', '#5a6c62', '#66786c'], fogT: 0.4, seed: 10 });
    hills(back, (x) => 304 + Math.sin(x * 0.009 + 1) * 10 + Math.sin(x * 0.003) * 8 + N1.fbm(x * 0.01, 3, 3) * 6, { yEnd: 345, cols: [g[0], g[1], g[2]], fogT: 0.3, seed: 2, heather: 0.35 });
    hills(back, (x) => 318 + Math.sin(x * 0.007 + 3) * 12 + Math.sin(x * 0.013) * 5 + N2.fbm(x * 0.01, 3, 3) * 6, { yEnd: 362, cols: [g[0], g[1], g[2]], fogT: 0.16, seed: 3, heather: 0.5 });
    // Steinkreis auf dem Hügel
    const hx = 300, hy = 322 + Math.sin(300 * 0.007 + 3) * 12 + Math.sin(300 * 0.013) * 5;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, x = hx + Math.cos(a) * 26, y = hy + 6 + Math.sin(a) * 5; stone(back, x, y, 2.2, 8 + (i % 3) * 2.5, 0.14); }
    for (let i = 0; i < 18; i++) { const x = 560 + r() * 360, y = 330 + r() * 16; birch(back, x, y, 12 + r() * 8, 0.32); }
    hills(back, (x) => 334 + Math.sin(x * 0.011) * 8 + N3.fbm(x * 0.012, 3, 3) * 8, { yEnd: 380, cols: [g[0], g[1], g[2]], fogT: 0.12, seed: 5, heather: 0.5 });
    hazeBand(back, 314, 344, 330, 14, 0.45);
  },
  urwald(back, L, r) {
    drawSky(back);
    const GH = mul(hex('#9cb894'), add(CORE.AMB, sc(CORE.LIGHT, 0.8)));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) back.set(x, y, mix(back.get(x, y), GH, step(clamp((y - 40) / 230), 6) * 0.85));
    // ferne Baumriesen im Dunst
    for (let i = 0; i < 12; i++) giantTrunk(back, 30 + i * 82 + r() * 40, 330 + r() * 10, 14 + r() * 10, 0.58);
    hazeBand(back, 250, 360, 320, 50, 0.7);
    conBelt(back, r, [[318, 340, 300, 20, 0.14]], 0, W, { dark: '#1e3a26', mid: '#2c5234', litC: '#4a7444', snow: false });
    for (let i = 0; i < 7; i++) giantTrunk(back, 60 + i * 140 + r() * 60, 352 + r() * 8, 26 + r() * 14, 0.3);
    canopy(back, (x) => 70 + N2.fbm(x * 0.008, 3, 3) * 70 + Math.sin(x * 0.02) * 10, 0.15);
    for (let i = 0; i < 4; i++) giantTrunk(back, [40, 300, 640, 900][i] + r() * 30, 372, 44 + r() * 18, 0.1);
    for (let i = 0; i < 40; i++) bush(back, r() * W, 352 + r() * 22, 6 + r() * 10, 5 + r() * 6, ['#24432a', '#33583a', '#4b7244'], 0.2);
    // Dunst grün färben
    const HZc = CORE.HAZE;
    for (let i = 0; i < W * H; i++) { if (!back.a[i]) continue; const c = [back.c[i * 3], back.c[i * 3 + 1], back.c[i * 3 + 2]], d = Math.hypot(c[0] - HZc[0], c[1] - HZc[1], c[2] - HZc[2]), w = clamp(1 - d * 2.2); if (w > 0) { const m = mix(c, mix(c, GH, 0.7), w); back.c[i * 3] = m[0]; back.c[i * 3 + 1] = m[1]; back.c[i * 3 + 2] = m[2]; } }
  },
  fjord(back, L, r) {
    drawSky(back);
    // Meer bis zum Horizont
    const seaY = 300;
    for (let y = seaY; y < H; y++) for (let x = 0; x < W; x++) back.set(x, y, HZ());
    // ferne Inseln am Horizont
    for (const [ix, iw, ih] of [[180, 60, 7], [520, 40, 5], [760, 90, 9]]) for (let x = ix - iw; x <= ix + iw; x++) { const t = 1 - Math.abs(x - ix) / iw, h = Math.pow(t, 0.6) * ih * (0.8 + N2.noise(x * 0.1, 3) * 0.4); for (let y = seaY - h; y <= seaY; y++) back.set(x, y, fog(hex('#55627a'), 0.7)); }
    waterBand(back, seaY, H, 0, W, { deep: '#1e4660', shallow: '#3f7290' });
    // steile Fjordwände links und rechts, die ins Wasser fallen
    const lw = (x) => (x > 360 ? 999 : 60 + Math.pow(x / 360, 1.8) * 260 + N2.ridged(x * 0.025, 3, 4) * 30);
    const rw = (x) => (x < 640 ? 999 : 50 + Math.pow((W - x) / 320, 1.9) * 280 + N2.ridged(x * 0.025 + 5, 3, 4) * 30);
    mountain(back, (x) => (x > 480 ? 999 : 160 + Math.pow(Math.max(0, x - 120) / 360, 1.6) * 170 - N3.ridged(x * 0.01, 1.7, 4) * 30), { seed: 51, fogBase: 0.5, fogGain: 0.2, rock: '#6a7690', snow: '#eef0f4', yEnd: seaY + 2, faceX: 200 });
    cliffWall(back, lw, { yEnd: 380, faceSign: 1, seed: 11, cols: ['#6a7480', '#7a848e', '#5e6874', '#848c96'], fogBase: 0.1, fogGain: 0.25, strata: 0.25 });
    cliffWall(back, rw, { yEnd: 380, faceSign: -1, seed: 12, cols: ['#6a7480', '#7a848e', '#5e6874', '#848c96'], fogBase: 0.08, fogGain: 0.25, strata: 0.25 });
    for (let i = 0; i < 40; i++) { const left = i % 2 === 0, x = left ? r() * 320 : 650 + r() * 300, top = left ? lw(x) : rw(x); if (top > 330) continue; const y = top + 16 + r() * 160; if (y > 360) continue; conifer(back, x, y, 8 + r() * 10, 2.6, { fogT: 0.18 + (y - top) / 1000 }); }
  },
};

/* ======================================================================
   Waldsaum / Horizontkante je Gegend (Ebene mid, liegt über dem Grund)
   ====================================================================== */
export const FRINGE = {
  hochtal(mid, L, r) { forestFringe(mid, L, r, 'nadel'); },
  seeufer(mid, L, r) {
    const sea = S(), winter = sea.groundSnow;
    for (let x = 0; x < W; x++) { const hy = L.horizon(x); for (let k = 0; k < 3; k++) mid.set(x, hy + k, flat(hex(winter ? '#d8dde6' : k === 0 ? '#b8a87a' : '#9a8a60'), 0.8)); }
    const items = [];
    for (let x = -6; x < W + 6; x += 3 + r() * 7) { const hy = L.horizon(x), k = r(); if (k < 0.3) items.push(['reed', x, hy + 3 + r() * 4]); else if (k < 0.5) items.push(['bush', x, hy + 4 + r() * 4]); else if (k < 0.58) items.push(['tree', x, hy + 6 + r() * 4]); }
    items.sort((a, b) => a[2] - b[2]);
    for (const [kind, x, y] of items) {
      if (kind === 'reed') for (let b = 0; b < 4; b++) { const hh = 4 + r() * 6; for (let k = 0; k < hh; k++) mid.set(x + b - 2 + (k / hh) * (b - 1.5) * 0.6, y - k, flat(hex(winter ? '#a89878' : k > hh - 2 ? '#c9a95a' : '#6a8a42'), k > hh * 0.6 ? 0.9 : 0.6)); }
      else if (kind === 'bush') bush(mid, x, y, 3 + r() * 4, 2.5 + r() * 3, winter ? ['#24382c', '#34503e', '#4a6650'] : ['#2f5a34', '#4f7f3c', '#7fa652'], 0.06, !!winter);
      else birchOr(mid, L, x, y, 14 + r() * 14);
    }
    grassHalme(mid, L, r);
  },
  klamm(mid, L, r) {
    const items = [];
    for (let x = -6; x < W + 6; x += 4 + r() * 8) { const hy = L.horizon(x), k = r(); if (k < 0.35) items.push(['rock', x, hy + 3 + r() * 5]); else if (k < 0.6) items.push(['bush', x, hy + 3 + r() * 4]); else if (k < 0.72) items.push(['tree', x, hy + 4 + r() * 5]); }
    items.sort((a, b) => a[2] - b[2]);
    for (const [kind, x, y] of items) {
      if (kind === 'rock') boulder(mid, x, y, 4 + r() * 7, 3 + r() * 4, '#8a6a58', 0.08);
      else if (kind === 'bush') bush(mid, x, y, 3 + r() * 3, 2 + r() * 3, S().groundSnow ? ['#24382c', '#34503e', '#4a6650'] : ['#3a5030', '#56703e', '#7a9050'], 0.06, !!S().groundSnow);
      else conifer(mid, x, y, 14 + r() * 18, 4 + r() * 2, { fogT: 0.05, dark: '#1f3a26', mid: '#2e5232', litC: '#4b7243' });
    }
    grassHalme(mid, L, r);
  },
  heide(mid, L, r) {
    const items = [];
    for (let x = -6; x < W + 6; x += 3 + r() * 6) { const hy = L.horizon(x), k = r(); if (k < 0.45) items.push(['heather', x, hy + 3 + r() * 5]); else if (k < 0.6) items.push(['birch', x, hy + 5 + r() * 5]); else if (k < 0.75) items.push(['gorse', x, hy + 3 + r() * 4]); }
    items.sort((a, b) => a[2] - b[2]);
    const winter = S().groundSnow, spring = S().particles === 'petals';
    for (const [kind, x, y] of items) {
      if (kind === 'heather') bush(mid, x, y, 3 + r() * 4, 2 + r() * 2.5, winter ? ['#5a4a5a', '#6a5a6a', '#8a7a8a'] : ['#5a3a4a', '#7a4a6a', S().heather], 0.05, !!winter);
      else if (kind === 'gorse') bush(mid, x, y, 3 + r() * 3, 2.5 + r() * 2, winter ? ['#2c3a2c', '#3a4a3a', '#4a5a4a'] : spring ? ['#4a5a2a', '#c8b030', '#f0d84a'] : ['#2f4a2a', '#4a6a34', '#6a8a44'], 0.05, !!winter);
      else birch(mid, x, y, 16 + r() * 16, 0.04);
    }
    grassHalme(mid, L, r);
  },
  urwald(mid, L, r) {
    const items = [];
    for (let x = -6; x < W + 6; x += 3 + r() * 6) { const hy = L.horizon(x), k = r(); if (k < 0.35) items.push(['fern', x, hy + 3 + r() * 6]); else if (k < 0.6) items.push(['bush', x, hy + 3 + r() * 5]); else if (k < 0.7) items.push(['rock', x, hy + 4 + r() * 5]); else if (k < 0.8) items.push(['tree', x, hy + 5 + r() * 5]); }
    items.sort((a, b) => a[2] - b[2]);
    for (const [kind, x, y] of items) {
      if (kind === 'fern') fern(mid, x, y, 1.3, 0.04);
      else if (kind === 'bush') bush(mid, x, y, 4 + r() * 5, 3 + r() * 4, ['#1f3a24', '#2e5230', '#4b7243'], 0.06, !!S().groundSnow);
      else if (kind === 'rock') boulder(mid, x, y, 5 + r() * 6, 3 + r() * 4, '#6f7a70', 0.06, 0.35);
      else conifer(mid, x, y, 18 + r() * 22, 5 + r() * 2, { fogT: 0.06, dark: '#1a3222', mid: '#26452e', litC: '#3e6440' });
    }
    grassHalme(mid, L, r);
  },
  fjord(mid, L, r) {
    const items = [];
    for (let x = -6; x < W + 6; x += 4 + r() * 8) { const hy = L.horizon(x), k = r(); if (k < 0.4) items.push(['rock', x, hy + 2 + r() * 4]); else if (k < 0.55) items.push(['tree', x, hy + 4 + r() * 5]); else if (k < 0.8) items.push(['bush', x, hy + 3 + r() * 3]); }
    items.sort((a, b) => a[2] - b[2]);
    for (const [kind, x, y] of items) {
      if (kind === 'rock') boulder(mid, x, y, 4 + r() * 8, 3 + r() * 4, '#7a8290', 0.06);
      else if (kind === 'bush') bush(mid, x, y, 3 + r() * 3, 2 + r() * 2, S().groundSnow ? ['#24382c', '#34503e', '#4a6650'] : ['#35503a', '#4f6e44', '#6f8e54'], 0.05, !!S().groundSnow);
      else conifer(mid, x, y, 12 + r() * 16, 5 + r() * 3, { fogT: 0.05, dark: '#1f3a26', mid: '#2e5232', litC: '#4b7243' });
    }
    grassHalme(mid, L, r);
  },
};
function birchOr(mid, L, x, y, h) { if (S().leaf) blobTree(mid, x, y, h * 0.9, 0.04); else birch(mid, x, y, h, 0.04); }
function grassHalme(mid, L, r) {
  const g = S().grass.map(hex);
  for (let x = 0; x < W; x++) if (r() < 0.55) { const my = Math.floor(L.horizon(x)), hgt = 1 + Math.floor(r() * 3); for (let k = 1; k <= hgt; k++) mid.set(x, my - k + 1, flat(g[k === hgt ? 2 : 1], 0.8)); }
}
function forestFringe(L, land, r) {
  const sea = S(), winter = sea.groundSnow, spring = sea.particles === 'petals';
  const cols = winter ? ['#24382c', '#34503e', '#4a6650'] : spring ? ['#335a30', '#4f7c3c', '#7ea64e'] : sea.leaf.slice();
  const dark = winter ? ['#22362a', '#2f4a36', '#3e5a44'] : ['#26432a', '#33583a', '#4b7244'];
  const items = [];
  for (let x = -6; x < W + 6; x += 2 + r() * 5) {
    const my = land.horizon(x), k = r();
    if (k < 0.3) items.push(['tree', x, my + 3 + r() * 7, 14 + r() * 24]);
    else if (k < 0.75) items.push(['bush', x, my + 2 + r() * 5, 3 + r() * 5, 2.5 + r() * 4, r() < 0.35 ? cols : dark]);
    else if (k < 0.9) items.push(['fern', x, my + 3 + r() * 6]);
  }
  items.sort((a, b) => a[2] - b[2]);
  for (const it of items) {
    const [kind, x, y] = it, fogT = clamp(0.12 - (y - 357) * 0.004);
    if (kind === 'tree') conifer(L, x, y, it[3], it[3] * 0.24, { fogT, dark: '#1f3a26', mid: '#2e5232', litC: '#4b7243' });
    else if (kind === 'bush') bush(L, x, y, it[3], it[4], it[5], fogT, !!winter);
    else fern(L, x, y, 1, fogT);
  }
  grassHalme(L, land, r);
}

/* ======================================================================
   Vordergrund am Bildrand (Ebene front)
   ====================================================================== */
export const FRONT = {
  hochtal(front) { conifer(front, 944, 560, 430, 70, { dark: '#18301f', mid: '#25412b', litC: '#3a5c3a' }); CORE.rock(front, 880, 548, 70, 26); CORE.rock(front, 30, 548, 60, 24); },
  seeufer(front, L, r) { CORE.rock(front, 900, 552, 64, 22); for (let i = 0; i < 40; i++) { const x = 820 + r() * 140, hh = 20 + r() * 40; for (let k = 0; k < hh; k++) front.set(x + (k / hh) * (r() * 2 - 1) * 4, 548 - k, flat(hex(S().groundSnow ? '#a89878' : k > hh - 4 ? '#c9a95a' : '#5a7a3a'), k > hh * 0.6 ? 0.9 : 0.55)); } CORE.rock(front, 30, 548, 56, 22); },
  klamm(front, L, r) { boulder(front, 905, 556, 80, 40, '#8a6a58'); boulder(front, 24, 552, 60, 28, '#7c5a48'); conifer(front, 950, 560, 260, 46, { dark: '#18301f', mid: '#25412b', litC: '#3a5c3a' }); },
  heide(front, L, r) { birch(front, 930, 560, 300); CORE.rock(front, 870, 550, 60, 22); CORE.rock(front, 30, 548, 56, 22); },
  urwald(front, L, r) { giantTrunk(front, 948, 560, 90, 0); boulder(front, 860, 556, 60, 26, '#6f7a70', 0, 0.45); boulder(front, 26, 552, 56, 26, '#6f7a70', 0, 0.45); for (let i = 0; i < 6; i++) fern(front, 820 + r() * 80, 548 - r() * 6, 3); },
  fjord(front, L, r) { boulder(front, 900, 556, 76, 32, '#7a8290'); conifer(front, 950, 560, 220, 56, { dark: '#18301f', mid: '#25412b', litC: '#3a5c3a' }); boulder(front, 26, 552, 60, 26, '#7a8290'); },
};
