// Prototyp 4: "Mann blickt rauchend auf sein Dorf" – Pixelart mit Licht pro Pixel.
export const W = 640, H = 360;

/* ---------- Werkzeuge ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeNoise(seed) {
  const r = rng(seed), perm = new Uint8Array(512), val = new Float32Array(256);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) val[i] = r();
  const lat = (x, y) => val[perm[(perm[x & 255] + y) & 255]];
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = lat(ix, iy), b = lat(ix + 1, iy), c = lat(ix, iy + 1), d = lat(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const fbm = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); n += a; f *= 2.03; a *= 0.5; } return s / n; };
  return { noise, fbm };
}
const N = makeNoise(11), N2 = makeNoise(29), N3 = makeNoise(53);
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/* Ebene: Fließkomma-Farben mit Deckkraft */
class Layer {
  constructor() { this.c = new Float32Array(W * H * 3); this.a = new Uint8Array(W * H); }
  set(x, y, col) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; this.c[i * 3] = col[0]; this.c[i * 3 + 1] = col[1]; this.c[i * 3 + 2] = col[2]; this.a[i] = 1; }
  get(x, y) { const i = y * W + x; return [this.c[i * 3], this.c[i * 3 + 1], this.c[i * 3 + 2]]; }
  has(x, y) { return x >= 0 && y >= 0 && x < W && y < H && this.a[y * W + x] === 1; }
}

/* ---------- Licht-Stimmungen ---------- */
const MOODS = {
  golden: {
    skyTop: hex('#4a5d8c'), skyMid: hex('#d79a7c'), skyLow: hex('#ffd59a'), sun: [560, 168],
    light: [1.05, 0.8, 0.52], amb: [0.36, 0.38, 0.52], haze: hex('#f0c79a'), rim: [1.0, 0.72, 0.4], cloud: hex('#ffe2c0'), cloudShade: hex('#9b7a8c'),
  },
  day: {
    skyTop: hex('#4f86b8'), skyMid: hex('#9cc4d8'), skyLow: hex('#e6ecd8'), sun: [540, 40],
    light: [1.0, 0.97, 0.88], amb: [0.42, 0.47, 0.58], haze: hex('#c6d6d8'), rim: [0.55, 0.52, 0.4], cloud: hex('#ffffff'), cloudShade: hex('#a9b6c4'),
  },
};
let M = MOODS.golden;
const LDIR = (() => { const v = [0.75, -0.45, 0.5]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
function shade(base, nx, ny, nz, extraRim = 0) {
  const d = Math.max(0, nx * LDIR[0] + ny * LDIR[1] + nz * LDIR[2]);
  let col = mul(base, add(M.amb, sc(M.light, d)));
  if (extraRim > 0) col = add(col, sc(mul(base, M.rim), extraRim));
  return col;
}
const fog = (col, t) => mix(col, M.haze, clamp(t));

/* ---------- Himmel, Wolken, Berge ---------- */
function drawSky(L) {
  const [sx, sy] = M.sun;
  for (let y = 0; y < 240; y++) for (let x = 0; x < W; x++) {
    const t = y / 230;
    let col = t < 0.55 ? mix(M.skyTop, M.skyMid, t / 0.55) : mix(M.skyMid, M.skyLow, (t - 0.55) / 0.45);
    const d = Math.hypot(x - sx, (y - sy) * 1.3);
    col = add(col, sc(M.light, Math.max(0, 1 - d / 260) ** 2 * 0.55));
    // Wolken: Rauschen, oben beleuchtet
    const cy = y / 240;
    const n = N.fbm(x * 0.006 + 3, y * 0.022, 5) * (1 - Math.abs(cy - 0.32) * 2.2);
    if (n > 0.36) {
      const lit = clamp((N.fbm(x * 0.006 + 3.04, (y - 3) * 0.022, 5) - n) * 9 + 0.5);
      const cc = mix(M.cloudShade, M.cloud, clamp(lit * 0.8 + (1 - d / 600) * 0.4));
      col = mix(col, cc, clamp((n - 0.36) * 9));
    }
    L.set(x, y, col);
  }
  if (M === MOODS.golden) for (let y = sy - 9; y <= sy + 9; y++) for (let x = sx - 9; x <= sx + 9; x++) if (Math.hypot(x - sx, y - sy) < 8.5) L.set(x, y, [1.2, 1.05, 0.8]);
}
function ridged(nz, x) { let v = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < 6; i++) { v += a * (1 - Math.abs(nz.noise(x * f, 0.7 + i) * 2 - 1)); n += a; a *= 0.5; f *= 2.1; } return v / n; }
function ridge(L, base, amp, freq, seed, rockCol, fogT, treeline = false) {
  const nz = makeNoise(seed);
  const tops = [];
  for (let x = 0; x < W; x++) {
    const top = base - Math.pow(ridged(nz, x * freq), 2.2) * amp;
    tops.push(top);
    for (let y = Math.floor(top); y < 260; y++) {
      // Hangneigung aus Rauschen für Licht
      const h = (xx, yy) => nz.fbm(xx * freq * 2.5, yy * freq * 3, 5);
      const dx = (h(x + 1, y) - h(x - 1, y)) * 14, dy = (h(x, y + 1) - h(x, y - 1)) * 10;
      const len = Math.hypot(dx, dy, 1);
      let col = shade(rockCol, -dx / len, -dy / len - 0.25, 1 / len);
      if (treeline) col = shade(mix(hex('#34552f'), hex('#4d6b34'), nz.noise(x * 0.05, y * 0.1)), -dx / len, -dy / len, 1 / len);
      L.set(x, y, fog(col, fogT + (y - top) * -0.002));
    }
  }
  if (treeline) { // Baumkronen entlang des Kamms und am Hang
    const r = rng(seed * 7);
    for (let i = 0; i < 1400; i++) {
      const x = r() * W, top = tops[Math.max(0, Math.min(W - 1, Math.floor(x)))];
      const y = top + r() * (250 - top) * 0.6, rad = 1.6 + r() * 2.4 * (amp / 40);
      const tmp = new Layer();
      treeBlob(tmp, x, y, rad, mix(hex('#30502c'), hex('#4f7036'), r()), 0.5);
      for (let yy = Math.floor(y - rad); yy <= y + rad; yy++) for (let xx = Math.floor(x - rad); xx <= x + rad; xx++) if (tmp.has(xx, yy)) L.set(xx, yy, fog(tmp.get(xx, yy), fogT));
    }
  }
}
export function renderBack(L) {
  drawSky(L);
  ridge(L, 188, 120, 0.0045, 3, hex('#7a8494'), 0.52);
  ridge(L, 200, 52, 0.007, 7, hex('#647060'), 0.42, true);
  ridge(L, 214, 24, 0.012, 9, hex('#4c6a3c'), 0.3, true);
}

/* ---------- Tal: Gelände, Fluss, Felder, Wald, Dorf ---------- */
const riverX = (y) => 70 + (y - 205) * 1.9 + Math.sin(y * 0.045) * 38;
const riverW = (y) => 0.8 + (y - 205) * 0.075;
function terrainH(x, y) { return N2.fbm(x * 0.012, y * 0.03, 5) * 1.0 + N3.fbm(x * 0.05, y * 0.1, 3) * 0.12; }
const FIELDS = [
  { pts: [[330, 247], [392, 241], [396, 259], [333, 266]], kind: 'wheat' },
  { pts: [[399, 244], [450, 239], [455, 257], [402, 263]], kind: 'green' },
  { pts: [[336, 271], [402, 263], [411, 287], [340, 295]], kind: 'soil' },
  { pts: [[466, 233], [515, 229], [520, 244], [470, 248]], kind: 'wheat' },
  { pts: [[296, 257], [326, 254], [329, 270], [298, 274]], kind: 'green' },
];
function inPoly(pts, px, py) { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside; } return inside; }
function fieldAt(x, y) {
  for (const f of FIELDS) if (inPoly(f.pts, x + 0.5, y + 0.5)) {
    const [a, b] = f.pts; const ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey);
    const v = ((x - a[0]) * -ey + (y - a[1]) * ex) / el; // Abstand quer zu den Reihen
    return { f, v };
  }
  return null;
}
const startY = (x) => 212 + N2.fbm(x * 0.008, 5.5, 3) * 18;
function treeBlob(L, cx, cy, r, base, rimK) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d2 = dx * dx + dy * dy;
    const leaf = N3.noise(x * 0.9, y * 0.9) * 0.45;
    if (d2 > 1 - leaf * 0.6) continue;
    const nz = Math.sqrt(Math.max(0, 1 - d2));
    let col = shade(base, dx, dy, nz, Math.max(0, dx) ** 3 * rimK);
    col = sc(col, 0.82 + N3.noise(x * 1.7, y * 1.7) * 0.35);
    L.set(x, y, col);
  }
}
function tree(L, x, y, s, fogT) {
  const trunkC = hex('#4a3626');
  for (let k = 0; k < s * 1.2; k++) L.set(x, y - k, fog(shade(trunkC, 0.3, 0, 0.9), fogT));
  const base = mix(hex('#3d6236'), hex('#557a3a'), N2.noise(x * 0.3, y * 0.3));
  const blobs = [[0, -s * 1.6, s * 0.9], [-s * 0.6, -s * 1.1, s * 0.7], [s * 0.6, -s * 1.15, s * 0.72], [0, -s * 0.9, s * 0.65]];
  const tmp = new Layer();
  for (const [dx, dy, r] of blobs) treeBlob(tmp, x + dx, y + dy, Math.max(1.2, r), base, 0.6);
  for (let yy = Math.floor(y - s * 3); yy <= y; yy++) for (let xx = Math.floor(x - s * 2); xx <= x + s * 2; xx++) if (tmp.has(xx, yy)) L.set(xx, yy, fog(tmp.get(xx, yy), fogT));
}
function house(L, x, y, w, stage, fogT) {
  // x,y = vordere linke untere Ecke; Ansicht leicht von links, rechte Seite im Licht
  const h = Math.round(w * 0.55), d = Math.round(w * 0.45), roofH = Math.round(w * 0.55);
  const wall = hex('#9c7a55'), wallS = hex('#7d5f42'), thatch = hex('#c9a463'), stone = hex('#8d8a80');
  const P = (xx, yy, col) => L.set(xx, yy, fog(col, fogT));
  if (stage >= 2) for (let i = -1; i <= w + d; i++) { P(x + i, y + 1, shade(stone, 0, -0.3, 0.9)); }
  // Front (zum Betrachter)
  if (stage >= 7) for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    let c = shade(wall, -0.2, 0, 0.95); if (xx % 3 === 0) c = sc(c, 0.85);
    P(x + xx, y - yy, c);
  } else if (stage >= 6) for (let yy = 0; yy < h / 2; yy++) for (let xx = 0; xx < w; xx++) P(x + xx, y - yy, sc(shade(wall, -0.2, 0, 0.95), xx % 3 === 0 ? 0.85 : 1));
  // rechte Seite (im Licht)
  if (stage >= 7) for (let xx = 0; xx < d; xx++) for (let yy = 0; yy < h; yy++) P(x + w + xx, y - yy - Math.round(xx * 0.5), shade(wallS, 0.9, 0, 0.4));
  // Pfosten
  if (stage >= 3 && stage < 7) [[0, 0], [w - 1, 0], [w + d - 1, Math.round(d * 0.5)]].forEach(([ox, oy]) => { for (let k = 0; k < h; k++) P(x + ox, y - k - oy, shade(hex('#6b4b2e'), 0.6, 0, 0.6)); });
  if (stage >= 4 && stage < 9) { for (let i = 0; i <= w; i++) P(x + i, y - h, shade(hex('#6b4b2e'), 0, -1, 0.5)); for (let i = 0; i < d; i++) P(x + w + i, y - h - Math.round(i * 0.5), shade(hex('#6b4b2e'), 0.5, -1, 0.5)); }
  // Dach: Giebel vorne + Dachfläche rechts
  if (stage >= 5) {
    const peakX = x + w / 2, peakY = y - h - roofH;
    for (let yy = Math.floor(peakY); yy <= y - h; yy++) {
      const t = (yy - peakY) / roofH, half = t * (w / 2 + 2);
      for (let xx = Math.floor(peakX - half); xx <= peakX + half; xx++) {
        if (stage < 8 && !((xx - x) % 4 === 0 || yy === Math.floor(peakY + t * roofH))) continue;
        const filled = stage >= 9 || (stage === 8 && t > 0.5);
        if (!filled && stage >= 8 && (xx - x) % 4 !== 0) continue;
        const c = filled ? sc(shade(thatch, -0.2, 0, 0.9), 0.8 + ((yy % 3 === 0) ? -0.1 : 0.05)) : shade(hex('#6b4b2e'), 0, 0, 1);
        P(xx, yy, c);
      }
      // Dachfläche nach rechts hinten
      for (let k = 0; k < d; k++) {
        const xx = Math.round(peakX + half) + k, ystart = yy - Math.round(k * 0.5);
        if (xx > peakX + half + d) break;
        if (yy < peakY + 1) continue;
        const filled = stage >= 9 || (stage === 8 && t > 0.5);
        if (!filled && k % 4 !== 0) continue;
        const c = filled ? sc(shade(thatch, 0.75, -0.6, 0.5), 0.9 + ((ystart % 3 === 0) ? -0.12 : 0.05)) : shade(hex('#6b4b2e'), 0.5, 0, 0.8);
        P(xx, ystart, c);
      }
    }
  }
  if (stage >= 10) { // Tür, Fenster
    for (let yy = 0; yy < Math.round(h * 0.6); yy++) for (let xx = 0; xx < Math.max(2, Math.round(w * 0.2)); xx++) P(x + Math.round(w * 0.4) + xx, y - yy, hex('#3a2716'));
    for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) P(x + Math.round(w * 0.75) + xx, y - Math.round(h * 0.6) + yy, hex('#ffcf7a'));
  }
  if (stage >= 5 && stage <= 9) { for (let k = 0; k < h + 4; k++) { P(x - 2, y - k, hex('#b08a5a')); P(x + 3, y - k, hex('#b08a5a')); } for (let i = -3; i < 5; i++) P(x + i, y - Math.round(h * 0.6), hex('#a07a4a')); }
}
export const VILLAGE = [
  { x: 360, y: 238, w: 16, stage: 10 }, { x: 390, y: 236, w: 18, stage: 10 }, { x: 424, y: 241, w: 15, stage: 10 },
  { x: 452, y: 234, w: 14, stage: 10 }, { x: 405, y: 252, w: 20, stage: 6 },
];
export function renderMid(L) {
  for (let x = 0; x < W; x++) for (let y = Math.floor(startY(x)); y < H; y++) {
    const h = terrainH(x, y);
    const dx = (terrainH(x + 1, y) - terrainH(x - 1, y)) * 18, dy = (terrainH(x, y + 1) - terrainH(x, y - 1)) * 12;
    const len = Math.hypot(dx, dy, 1);
    const patch = N.fbm(x * 0.02 + 9, y * 0.05, 4);
    let base = mix(hex('#4f7a34'), hex('#8c9a44'), clamp((patch - 0.45) * 3));
    base = mix(base, hex('#3c6430'), clamp((0.4 - patch) * 4));
    base = sc(base, 0.9 + N3.noise(x * 0.8, y * 1.6) * 0.18);
    let col = shade(base, -dx / len, -dy / len - 0.2, 1 / len);
    const f = fieldAt(x, y);
    if (f) {
      const row = 0.9 + Math.sin(f.v * 1.9) * 0.1;
      const fb = f.f.kind === 'wheat' ? hex('#bfa05c') : f.f.kind === 'green' ? hex('#68873c') : hex('#7a5a40');
      col = shade(sc(fb, row * (0.94 + N3.noise(x * 0.6, y * 0.6) * 0.12)), -dx / len, -dy / len - 0.2, 1 / len);
    }
    const rx = riverX(y), rw = riverW(y);
    if (y > 205 && Math.abs(x - rx) < rw) {
      const t = Math.abs(x - rx) / rw;
      col = mix(hex('#2c4a58'), hex('#8aa4a8'), 0.22 + (1 - t) * 0.22);
      if (N3.noise(x * 0.3, y * 2.2) > 0.76) col = mix(col, M.skyLow, 0.5);
    } else if (y > 205 && Math.abs(x - rx) < rw + 1.2) col = sc(col, 0.62);
    // Weg vom Dorf nach vorne
    const px = 420 + (y - 258) * 0.9 + Math.sin(y * 0.07) * 8;
    if (y > 258 && Math.abs(x - px) < 1.2 + (y - 258) * 0.05) col = shade(hex('#a68558'), -dx / len, -dy / len, 1 / len);
    const inRiver = y > 205 && Math.abs(x - rx) < rw;
    L.set(x, y, inRiver ? fog(col, 0.08) : fog(col, clamp(0.4 - (y - 206) * 0.006)));
  }
  const r = rng(77), trees = [];
  for (let i = 0; i < 900; i++) { // dichter Waldrand
    const x = r() * W, y = startY(x) + r() * 6 - 1, rad = 1.8 + r() * 2.6;
    const tmp = new Layer(); treeBlob(tmp, x, y, rad, mix(hex('#30502c'), hex('#4f7036'), r()), 0.5);
    for (let yy = Math.floor(y - rad); yy <= y + rad; yy++) for (let xx = Math.floor(x - rad); xx <= x + rad; xx++) if (tmp.has(xx, yy)) L.set(xx, yy, fog(tmp.get(xx, yy), 0.3));
  }
  for (const f of FIELDS) for (let i = 0; i < 4; i++) { // Hecken an den Feldrändern
    const [a, b] = [f.pts[i], f.pts[(i + 1) % 4]]; const n = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s2 = 0; s2 < n; s2 += 1.6) { if (r() < 0.35) continue; const x = a[0] + (b[0] - a[0]) * s2 / n, y = a[1] + (b[1] - a[1]) * s2 / n; const rad = 0.9 + r() * 1.1;
      const tmp = new Layer(); treeBlob(tmp, x, y - rad * 0.5, rad, mix(hex('#2f4e2a'), hex('#4a6a32'), r()), 0.6);
      for (let yy = Math.floor(y - rad * 2); yy <= y + rad; yy++) for (let xx = Math.floor(x - rad - 1); xx <= x + rad + 1; xx++) if (tmp.has(xx, yy)) L.set(xx, yy, fog(tmp.get(xx, yy), 0.15)); }
  }
  // Bäume (Wäldchen), von hinten nach vorne
  for (let i = 0; i < 520; i++) {
    const x = r() * W, y = 214 + r() * 104;
    if (N.fbm(x * 0.01, y * 0.03, 3) < 0.5) continue;
    if (Math.abs(x - riverX(y)) < riverW(y) + 2) continue; if (y < startY(x) + 3) continue;
    if (x > 340 && x < 480 && y > 225 && y < 295) continue;
    if (fieldAt(x, y)) continue;
    trees.push([x, y]);
  }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y] of trees) tree(L, x, y, 1.2 + (y - 206) * 0.035, clamp(0.38 - (y - 206) * 0.006));
  for (let i = 0; i < 2600; i++) { // kleine Büsche, Steine, Grasbüschel
    const x = r() * W, y = 226 + r() * 134; if (y < startY(x) + 4 || fieldAt(x, y) || Math.abs(x - riverX(y)) < riverW(y) + 1) continue;
    const depth = clamp((y - 220) / 140), fogT = clamp(0.3 - (y - 220) * 0.004);
    if (r() < 0.12) { const rad = 0.8 + depth * 2.2; const tmp = new Layer(); treeBlob(tmp, x, y, rad, mix(hex('#3d5f2e'), hex('#5e7f38'), r()), 0.6); for (let yy = Math.floor(y - rad); yy <= y + rad; yy++) for (let xx = Math.floor(x - rad); xx <= x + rad; xx++) if (tmp.has(xx, yy)) L.set(xx, yy, fog(tmp.get(xx, yy), fogT)); }
    else { const h = 1 + Math.round(depth * 3); const c = L.has(x | 0, y | 0) ? L.get(x | 0, y | 0) : [0.3, 0.4, 0.2]; for (let k = 0; k < h; k++) L.set(x + (k > 1 ? 1 : 0), y - k, sc(c, k === h - 1 ? 1.25 : 0.82)); }
  }
  // Zäune
  for (let x = 335; x < 400; x += 3) { const y = 263 + (x - 335) * -0.12; L.set(x, y, shade(hex('#6b4b2e'), 0, 0, 1)); L.set(x, y - 1, shade(hex('#6b4b2e'), 0, 0, 1)); }
  for (const hs of [...VILLAGE].sort((a, b) => a.y - b.y)) house(L, hs.x, hs.y, hs.w, hs.stage, 0.12);
}

/* ---------- Vordergrund: Hang, Fels, Mann ---------- */
const hillY = (x) => 268 + Math.pow(Math.max(0, x) / 470, 1.7) * 100 + N.noise(x * 0.04, 3) * 6;
const C = {
  cloak: hex('#53643f'), cloakD: hex('#36442c'), tunic: hex('#6a5a3e'), hair: hex('#3b2a1e'), skin: hex('#d9a27a'),
  beard: hex('#4a3322'), pipe: hex('#6e4426'), rock: hex('#9a9284'), boot: hex('#3a2a1e'), pants: hex('#64553f'),
};
function ellipseShade(L, cx, cy, rx, ry, base, opts = {}) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d2 = dx * dx + dy * dy;
    const edge = opts.rough ? N3.noise(x * opts.rough, y * opts.rough) * 0.25 : 0;
    if (d2 > 1 - edge) continue;
    const nz = Math.sqrt(Math.max(0, 1 - d2));
    let col = shade(opts.moss && dy < -0.25 && N3.noise(x * 0.3, y * 0.3) > 0.4 ? hex('#5d7a3a') : base, dx, dy, nz, Math.max(0, dx) ** 4 * (opts.rim ?? 0.8));
    if (opts.tex) col = sc(col, opts.tex(x, y));
    L.set(x, y, col);
  }
}
function polyFill(L, pts, fn) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(x0); x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5; let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside; }
    if (inside) L.set(x, y, fn(x, y, (x - x0) / (x1 - x0)));
  }
}
function limb(L, x0, y0, x1, y1, r0, r1, base) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
  const ax = -(y1 - y0), ay = x1 - x0, al = Math.hypot(ax, ay);
  for (let s = 0; s <= n; s++) {
    const t = s / n, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, r = r0 + (r1 - r0) * t;
    for (let k = -r; k <= r; k += 0.5) {
      const u = k / r, nx = (ax / al) * u, ny = (ay / al) * u;
      L.set(cx + (ax / al) * k, cy + (ay / al) * k, shade(base, nx, ny, Math.sqrt(Math.max(0, 1 - u * u)), Math.max(0, nx) ** 3 * 0.9));
    }
  }
}
export const MAN = { x: 178, y: 300 };
export function renderFront(L) {
  // Hang mit Gras-Textur
  for (let x = 0; x < W; x++) for (let y = Math.floor(hillY(x)); y < H; y++) {
    const t = (y - hillY(x));
    const n = N2.fbm(x * 0.08, y * 0.12, 4);
    let base = mix(hex('#4c7232'), hex('#7e9a3e'), clamp((n - 0.4) * 2.5));
    let col = shade(base, 0.25, -0.6 + clamp(t / 60) * 0.4, 0.7);
    if (t < 1) col = add(col, sc(M.rim, 0.07));
    L.set(x, y, col);
  }
  // Fels
  const rk = MAN.x, ry = MAN.y + 18;
  ellipseShade(L, rk - 4, ry + 4, 46, 22, C.rock, { moss: true, rough: 0.15, rim: 0.6, tex: (x, y) => 0.82 + N3.fbm(x * 0.25, y * 0.4, 3) * 0.35 });
  ellipseShade(L, rk + 26, ry + 12, 24, 14, sc(C.rock, 0.9), { rough: 0.2, rim: 0.6, tex: (x, y) => 0.8 + N3.fbm(x * 0.3, y * 0.4, 3) * 0.35 });
  for (let i = 0; i < 40; i++) { const x = rk - 40 + i * 2, y = ry - 6 + Math.round(N.noise(i * 0.4, 1) * 8); if (L.has(x, y)) L.set(x, y, sc(L.get(x, y), 0.7)); } // Risse/Moos
  // Wanderstab und Beutel
  for (let k = 0; k < 92; k++) L.set(rk - 58 + k * 0.12, ry - 78 + k, shade(hex('#6b4a2e'), 0.6, 0, 0.7, k < 4 ? 0.5 : 0));
  ellipseShade(L, rk - 52, ry + 4, 11, 9, hex('#7a6040'), { tex: (x, y) => 0.85 + N3.noise(x * 0.8, y * 0.8) * 0.25 });
  const cx = MAN.x - 2, Y = MAN.y;
  const area = (x0, y0, x1, y1, inside, color) => { for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) if (inside(x + 0.5, y + 0.5)) L.set(x, y, color(x, y)); };
  const inE = (x, y, ex, ey, rx, ry) => ((x - ex) / rx) ** 2 + ((y - ey) / ry) ** 2 <= 1;
  // Beine (sitzend, nach rechts), Stiefel
  limb(L, cx + 14, Y - 2, cx + 42, Y + 3, 7.5, 6, C.pants);
  ellipseShade(L, cx + 42, Y + 3, 6.5, 6, C.pants, { rim: 0.8 });
  limb(L, cx + 43, Y + 4, cx + 46, Y + 30, 5.5, 4.4, C.pants);
  ellipseShade(L, cx + 50, Y + 33, 8.5, 4.5, C.boot, { rim: 0.7 });
  ellipseShade(L, cx + 46, Y + 28, 5, 4, C.boot, { rim: 0.7 });
  // Umhang: weiche Silhouette aus Schultern + Rumpf, Falten fächern nach unten auf
  const inCloak = (x, y) => (inE(x, y, cx, Y - 49, 23, 10) || (inE(x, y, cx - 1, Y - 12, 31, 42) && y > Y - 50)) && y < Y + 7 + Math.sin(x * 0.35) * 1.5;
  area(cx - 34, Y - 60, cx + 32, Y + 10, inCloak, (x, y) => {
    const u = clamp((x - cx) / 30, -1, 1);
    const spread = 1 + Math.max(0, y - (Y - 52)) * 0.014;
    const fold = Math.pow(Math.sin(((x - cx) / spread) * 0.48 + N.noise(x * 0.08, y * 0.04) * 3) * 0.5 + 0.5, 1.5);
    const top = inE(x, y, cx, Y - 49, 23, 10) ? -0.55 : -0.1;
    let col = shade(C.cloak, u * 0.9, top, Math.sqrt(1 - u * u * 0.85), Math.max(0, u) ** 3 * 1.5);
    col = sc(col, (0.66 + fold * 0.46) * (0.94 + N3.noise(x * 0.4, y * 0.25) * 0.12));
    if (y > Y + 2) col = sc(col, 0.86);
    return col;
  });
  // Taschengurt
  for (let k = 0; k < 62; k++) { const x = cx - 19 + k * 0.6, y = Y - 49 + k * 0.82; for (let w = 0; w < 3; w++) if (inCloak(x + w + 0.5, y + 0.5)) L.set(x + w, y, shade(hex('#6e4a2e'), 0.3 + w * 0.2, -0.2, 0.8, w === 2 ? 0.4 : 0)); }
  // Kapuze im Nacken
  ellipseShade(L, cx - 1, Y - 55, 15, 6, C.cloakD, { rim: 1, tex: (x, y) => 0.78 + Math.sin(x * 0.8 + y * 0.6) * 0.14 });
  // Arm: Ärmel bis Mitte Unterarm, dann Haut mit Narbe, Hand hält den Pfeifenkopf
  limb(L, cx + 22, Y - 46, cx + 28, Y - 30, 6, 5.5, C.cloak);
  limb(L, cx + 28, Y - 30, cx + 21, Y - 49, 4.4, 4, C.tunic);
  limb(L, cx + 21, Y - 49, cx + 17, Y - 58, 3.4, 3, C.skin);
  L.set(cx + 18, Y - 53, hex('#f2c4b4')); L.set(cx + 19, Y - 54, hex('#f2c4b4')); L.set(cx + 20, Y - 55, hex('#f2c4b4')); L.set(cx + 18, Y - 52, sc(C.skin, 0.75)); // Narbe
  // Kopf: Hals, Gesicht im Profil (rechts), Ohr, Bart, Haare mit Knoten
  ellipseShade(L, cx + 1, Y - 61, 7, 5, sc(C.skin, 0.8));
  ellipseShade(L, cx + 3, Y - 74, 12, 14, C.skin, { rim: 1.3 });
  ellipseShade(L, cx + 14.5, Y - 74, 2, 2.2, C.skin, { rim: 1.6 }); // Nasenspitze
  area(cx + 2, Y - 73, cx + 17, Y - 58, (x, y) => inE(x, y, cx + 10, Y - 66, 6.5, 8) && x > cx + 4, (x, y) => {
    let col = shade(C.beard, (x - cx - 10) / 6.5, (y - Y + 66) / 8, 0.6, Math.max(0, (x - cx - 10) / 6.5) ** 2 * 1.2);
    return sc(col, 0.75 + N3.noise(x * 1.4, y * 0.5) * 0.45);
  });
  area(cx - 12, Y - 90, cx + 15, Y - 58, (x, y) => {
    if (!inE(x, y, cx + 2, Y - 77, 13.5, 13.5)) return false;
    if (x > cx + 6 && y > Y - 79) return false; // Gesicht frei
    return y < Y - 62 + N3.noise(x * 0.6, 7) * 4; // Strähnen am unteren Rand
  }, (x, y) => {
    const dx = (x - cx - 2) / 13.5, dy = (y - Y + 77) / 13.5, nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
    let col = shade(C.hair, dx, dy, nz, Math.max(0, dx) ** 3 * 1.8);
    return sc(col, 0.72 + N3.noise(x * 1.1, y * 0.13) * 0.55);
  });
  ellipseShade(L, cx - 3, Y - 89, 4.5, 3.8, C.hair, { rim: 1.4, tex: (x, y) => 0.75 + N3.noise(x * 1.2, y * 0.8) * 0.4 }); // Haarknoten
  ellipseShade(L, cx + 8.5, Y - 74, 2.2, 3.2, sc(C.skin, 0.92), { rim: 1.6 }); // Ohr
  // Hand und Pfeife
  ellipseShade(L, cx + 16, Y - 61, 3.8, 3.4, C.skin, { rim: 1.2 });
  limb(L, cx + 13, Y - 68, cx + 19, Y - 65, 0.8, 0.8, C.pipe);
  ellipseShade(L, cx + 20, Y - 65, 2.4, 2.8, C.pipe, { rim: 1 });
  L.set(cx + 20, Y - 68, [1.3, 0.6, 0.2]); L.set(cx + 21, Y - 68, [1.1, 0.5, 0.15]);
  // dunkle Kontur nur an der Schattenseite (links) der Figur
  const out = [];
  for (let y = MAN.y - 100; y < MAN.y + 45; y++) for (let x = MAN.x - 70; x < MAN.x + 70; x++) {
    if (L.has(x, y) && !L.has(x - 1, y) && y < hillY(x)) out.push([x - 1, y]);
  }
  for (const [x, y] of out) L.set(x, y, [0.12, 0.1, 0.12]);
}
export function renderGrass(L, near) {
  const r = rng(near ? 91 : 93);
  const n = near ? 900 : 5200;
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const y0 = hillY(x);
    const y = near ? H - r() * 10 : y0 + r() * (H - y0);
    if (!near && y > H - 6) continue;
    const depth = clamp((y - 260) / 100);
    const h = (near ? 18 + r() * 26 : 3 + depth * 11 + r() * 5);
    const lean = (r() * 2 - 1) * h * 0.25 + h * 0.15;
    const base = mix(hex('#3a5a2a'), hex('#6f9440'), r());
    for (let k = 0; k < h; k++) {
      const t = k / h;
      const xx = x + lean * t * t, yy = y - k;
      let col = shade(base, 0.3 + t * 0.4, -0.5, 0.7);
      col = sc(col, 0.55 + t * 0.6);
      if (t > 0.7) col = add(col, sc(M.rim, (t - 0.7) * 1.4 * (near ? 0.6 : 1)));
      L.set(xx, yy, col);
    }
    if (!near && r() < 0.03) { const fc = r() < 0.5 ? hex('#f4efe0') : hex('#e8c25a'); L.set(x + lean, y - h, fc); L.set(x + lean + 1, y - h, fc); }
  }
}

/* ---------- Gemeinsamer Farbvorrat (k-means) + Dithering ---------- */
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export function buildPalette(layers, k = 72) {
  const r = rng(5), samples = [];
  for (const L of layers) for (let i = 0; i < 9000; i++) { const p = Math.floor(r() * W * H); if (L.a[p]) samples.push([clamp(L.c[p * 3]), clamp(L.c[p * 3 + 1]), clamp(L.c[p * 3 + 2])]); }
  let cent = Array.from({ length: k }, (_, i) => samples[Math.floor((i / k) * samples.length)].slice());
  const assign = new Int32Array(samples.length);
  for (let it = 0; it < 8; it++) {
    for (let s = 0; s < samples.length; s++) { let best = 0, bd = 9; const c = samples[s]; for (let j = 0; j < k; j++) { const q = cent[j], d = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 + (c[2] - q[2]) ** 2; if (d < bd) { bd = d; best = j; } } assign[s] = best; }
    const sum = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let s = 0; s < samples.length; s++) { const a = sum[assign[s]]; a[0] += samples[s][0]; a[1] += samples[s][1]; a[2] += samples[s][2]; a[3]++; }
    cent = cent.map((c, j) => (sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c));
  }
  for (const h of ['#2a2420', '#4a4540', '#6b6660', '#8d877e', '#aba496', '#c9a07c', '#e0b18a', '#f2c4b4']) cent.push(hex(h));
  return cent;
}
export function toCanvas(L, pal, cv, dither = 0.045) {
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!L.a[i]) continue;
    const off = (BAYER[y % 4][x % 4] / 16 - 0.5) * dither;
    const c = [L.c[i * 3] + off, L.c[i * 3 + 1] + off, L.c[i * 3 + 2] + off];
    let best = pal[0], bd = 9;
    for (const q of pal) { const dd = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 + (c[2] - q[2]) ** 2; if (dd < bd) { bd = dd; best = q; } }
    d[i * 4] = clamp(best[0]) * 255; d[i * 4 + 1] = clamp(best[1]) * 255; d[i * 4 + 2] = clamp(best[2]) * 255; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function renderAll(mood, cvs) {
  M = MOODS[mood];
  const back = new Layer(), mid = new Layer(), front = new Layer(), near = new Layer();
  renderBack(back); renderMid(mid); renderGrass(front, false); renderFront(front); renderGrass(near, true);
  const pal = buildPalette([back, mid, front, near]);
  toCanvas(back, pal, cvs.back); toCanvas(mid, pal, cvs.mid); toCanvas(front, pal, cvs.front); toCanvas(near, pal, cvs.near);
  return pal.length;
}

/* ---------- Animation & Licht ---------- */
export function drawAnim(cv, t, mood) {
  if (cv.width !== W) { cv.width = W; cv.height = H; }
  const c = cv.getContext('2d'); c.clearRect(0, 0, W, H);
  const smoke = (x, y, n, speed, rise, size, alpha) => { for (let i = 0; i < n; i++) { const ph = ((t / speed) + i / n) % 1; c.fillStyle = `rgba(238,232,222,${(alpha * (1 - ph)).toFixed(2)})`; const s = ph > 0.4 ? size : 1; c.fillRect(Math.round(x + ph * 9 + Math.sin(ph * 6 + i) * 2), Math.round(y - ph * rise), s, s); } };
  smoke(MAN.x + 18, MAN.y - 70, 12, 1600, 50, 2, 0.8);
  for (const h of VILLAGE) if (h.stage >= 10) smoke(h.x + h.w * 0.7, h.y - h.w * 1.1, 6, 2600 + h.x * 3, 26, 2, 0.55);
  // Vögel
  for (let i = 0; i < 3; i++) { const ph = ((t / 26000) + i * 0.13) % 1; const x = 640 - ph * 760 + i * 14, y = 70 + i * 6 + Math.sin(ph * 20 + i) * 3; const f = Math.floor(t / 250 + i) % 2; c.fillStyle = 'rgba(40,30,40,.75)'; c.fillRect(x, y, 1, 1); c.fillRect(x - 1, y - f, 1, 1); c.fillRect(x + 1, y - f, 1, 1); c.fillRect(x - 2, y - 1 + f, 1, 1); c.fillRect(x + 2, y - 1 + f, 1, 1); }
  // kleiner Bewohner auf dem Weg
  const ph = (t / 30000) % 1, vy = 262 + ph * 30, vx = 420 + (vy - 258) * 0.9 + Math.sin(vy * 0.07) * 8;
  c.fillStyle = '#5a3a2a'; c.fillRect(Math.round(vx), Math.round(vy) - 3, 1, 3); c.fillStyle = '#d9a27a'; c.fillRect(Math.round(vx), Math.round(vy) - 4, 1, 1);
  // Flussglitzern
  for (let i = 0; i < 16; i++) { const yy = 212 + ((i * 37) % 120); const on = Math.sin(t / 300 + i * 2.1) > 0.7; if (on) { c.fillStyle = mood === 'golden' ? 'rgba(255,230,180,.9)' : 'rgba(255,255,255,.8)'; c.fillRect(Math.round(riverX(yy) + Math.sin(i) * riverW(yy) * 0.5), yy, 1, 1); } }
}
export function drawGlow(cv, t, mood) {
  const S = 2, w = cv.width = W * S, h = cv.height = H * S, c = cv.getContext('2d');
  const glow = (x, y, rad, col, a) => { const g = c.createRadialGradient(x * S, y * S, 0, x * S, y * S, rad * S); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect((x - rad) * S, (y - rad) * S, rad * 2 * S, rad * 2 * S); };
  const [sx, sy] = MOODS[mood].sun;
  if (mood === 'golden') {
    glow(sx, sy, 200, '255,200,130', 0.55); glow(sx, sy, 40, '255,240,200', 0.7);
    c.save(); c.globalAlpha = 0.09; c.fillStyle = 'rgb(255,215,160)';
    for (let i = 0; i < 6; i++) { const a = Math.PI * 0.62 + i * 0.09 + Math.sin(t / 7000 + i) * 0.01; c.beginPath(); c.moveTo(sx * S, sy * S); c.lineTo((sx + Math.cos(a) * 900) * S, (sy + Math.sin(a) * 900) * S); c.lineTo((sx + Math.cos(a + 0.035) * 900) * S, (sy + Math.sin(a + 0.035) * 900) * S); c.fill(); }
    c.restore();
    for (const hs of VILLAGE) if (hs.stage >= 10) glow(hs.x + hs.w * 0.75, hs.y - hs.w * 0.33, 6, '255,190,100', 0.5);
  } else glow(sx, sy, 220, '255,250,230', 0.35);
  for (let i = 0; i < 30; i++) { const ph = ((t / 11000) + i / 30) % 1; const x = 120 + ((i * 53) % 420) - ph * 40, y = 140 + ((i * 97) % 190) - ph * 25; c.fillStyle = `rgba(255,240,200,${(0.45 * Math.sin(ph * Math.PI)).toFixed(2)})`; c.fillRect(x * S, y * S, S, S); }
  glow(MAN.x + 18, MAN.y - 68, 6, '255,140,60', 0.6 + Math.sin(t / 160) * 0.2);
}
export function drawShade(cv, mood) {
  const w = cv.width = W, h = cv.height = H, c = cv.getContext('2d');
  c.fillStyle = mood === 'golden' ? 'rgb(255,236,220)' : '#fff'; c.fillRect(0, 0, w, h);
  const g = c.createRadialGradient(w * 0.55, h * 0.5, h * 0.3, w * 0.55, h * 0.5, h * 1.0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(25,15,25,0.55)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
export function drawGrain(cv) {
  const w = cv.width = 320, h = cv.height = 180, c = cv.getContext('2d'), img = c.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  c.putImageData(img, 0, 0);
}
