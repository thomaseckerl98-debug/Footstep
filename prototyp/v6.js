// Prototyp 6: Vorlagen-Look + Perspektive "Held blickt auf sein Dorf". Dorf mit sichtbarem Baufortschritt.
import {
  W, H, rng, makeNoise, N1, N2, N3, N4, clamp, mix, mul, add, sc, hex, step, Layer, TIMES, SEASONS, setMood, lit, fog,
  drawSky, lightBands, mountain, conifer, blobTree, buildPalette, toImage, drawGlow as glow5, drawShade, drawGrain,
} from './v5.js?v=2';
import * as V5 from './v5.js?v=2';
export { W, H, drawShade, drawGrain };

const amb = () => V5.AMB, light = () => V5.LIGHT, L5 = () => V5.LDIR, S = () => V5.S, T = () => V5.T;
const flat = (base, k = 0.75) => mul(base, add(amb(), sc(light(), k)));

/* ---------- Felsen mit Facetten (wie in den Vorlagen) ---------- */
function facetRock(L, cx, cy, rx, ry, opts = {}) {
  const nz = makeNoise(Math.round(cx * 13 + cy * 7)), grassTop = opts.grassTop ?? true;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy > 1 - nz.noise(x * 0.12, y * 0.12) * 0.3) continue;
    // Facetten: Normalen aus grobem, gestuftem Rauschen -> flache Felsflächen
    const fx = Math.round(nz.noise(x * 0.07, y * 0.09) * 4) / 4 - 0.5, fy = Math.round(nz.noise(x * 0.07 + 5, y * 0.09) * 4) / 4 - 0.5;
    const n = [dx * 0.8 + fx * 1.4, dy * 0.6 - 0.45 + fy, 0.7], l = Math.hypot(...n);
    let col = lit(hex('#6f788c'), n[0] / l, n[1] / l, n[2] / l, 3);
    if (nz.noise(x * 0.5, y * 0.25) > 0.78) col = sc(col, 0.8); // Risse
    if (grassTop && dy < -0.35 + nz.noise(x * 0.2, 3) * 0.3) col = S().groundSnow ? lit(hex('#eef1f4'), 0, -1, 0.5, 2) : flat(hex(nz.noise(x * 0.4, y * 0.4) > 0.5 ? S().grass[1] : S().dry), 0.85);
    L.set(x, y, col);
  }
}
/* Grasbüschel: Halme in Büscheln, Spitzen im Licht */
function tufts(L, n, area, seed, scale = 1, dim = 1) {
  const r = rng(seed), g = S().grass.map(hex);
  for (let i = 0; i < n; i++) {
    const [x0, y0] = area(r); if (x0 === null) continue;
    const blades = 3 + Math.floor(r() * 5), hgt = (3 + r() * 6) * scale;
    const dry = r() < 0.25 && !S().groundSnow, heather = !dry && r() < 0.1 && !S().groundSnow;
    const base = heather ? hex(S().heather) : dry ? hex(S().dry) : g[1 + Math.floor(r() * 2)];
    for (let b = 0; b < blades; b++) {
      const lean = (r() - 0.5) * 1.6, h = hgt * (0.6 + r() * 0.4);
      for (let k = 0; k < h; k++) {
        const t = k / h;
        let col = flat(base, (t > 0.65 ? 1.0 : t > 0.3 ? 0.7 : 0.45) * dim);
        if (S().groundSnow && t < 0.3) col = flat(hex('#dfe5ee'), 0.8);
        L.set(x0 + b - blades / 2 + lean * t * h * 0.3, y0 - k, col);
      }
    }
  }
}

/* ---------- Haus-Bausatz mit 10 Bauphasen und Zusätzen ---------- */
export function house(L, x, y, opts = {}) {
  const { shadow = 0, moss = false, s = 1, stage = 10 } = opts, night = T().body === 'moon', snow = S().groundSnow;
  const ls = 1 - shadow * 0.72;
  const P = (xx, yy, col) => L.set(xx, yy, shadow ? mix(col, mul(col, hex('#7f8fb8')), shadow * 0.35) : col);
  const LT = (h, n, b = 2) => lit(hex(h), n[0], n[1], n[2], b, ls);
  const W2 = Math.round(22 * s), wallH = Math.round(18 * s), roofH = Math.round(30 * s), depth = Math.round(30 * s), dd = 0.42;
  const FRONT = [-0.3, 0, 0.9], SIDE = [0.9, 0, 0.4];
  // Grundstück
  for (let yy = -4; yy <= 6; yy++) for (let xx = -W2 - 8; xx <= W2 + depth + 8; xx++) {
    const e = (xx / (W2 + depth / 2 + 8)) ** 2 + (yy / 6) ** 2; if (e > 1 || N4.noise(xx * 0.3, yy * 0.5) > 0.8) continue;
    P(x + xx + depth * 0.3, y + yy - Math.max(0, xx - W2) * dd * 0.6, flat(hex(snow ? '#d4dae4' : '#8a7354'), 0.7));
  }
  if (stage === 0) {
    const pts = [[x - W2, y + 2], [x + W2, y + 2], [x + W2 + depth, y + 2 - depth * dd], [x - W2 + depth * 0.4, y - depth * dd]];
    pts.forEach(([ax, ay], i) => { const [bx, by] = pts[(i + 1) % 4]; for (let t = 0; t <= 1; t += 0.02) if (Math.floor(t * 50) % 2 === 0) P(ax + (bx - ax) * t, ay + (by - ay) * t - 5, flat(hex('#d8c9a0'), 0.9)); });
    pts.forEach(([ax, ay]) => { for (let k = 0; k < 7; k++) { P(ax, ay - k, LT('#6b4b2e', SIDE)); P(ax + 1, ay - k, LT('#6b4b2e', FRONT)); } });
    return { chimney: null, window: null };
  }
  // Baumaterial
  if (stage < 10) for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
    const lx = x - W2 - 22 + i * 6 + row * 3, ly = y - row * 4;
    for (let k = 0; k < 4; k++) for (let j = 0; j < 6; j++) P(lx + j, ly - k, LT(k === 3 ? '#a37a50' : '#7a5232', [0.2, -0.6, 0.6]));
    P(lx + 6, ly - 2, flat(hex('#c4a776'), 0.9));
  }
  if (stage >= 2) for (let i = -W2 - 2; i <= W2 + depth; i++) for (let k = 0; k < 3; k++) P(x + i, y - k + (i > W2 ? Math.round((i - W2) * -dd) : 0), LT('#7a7d86', [0, -0.3, 0.8]));
  // Wände
  const wallTop = stage >= 7 ? wallH : stage >= 6 ? Math.round(wallH / 2) : 0;
  for (let i = 0; i < depth; i++) for (let k = 0; k < wallTop; k++) {
    const beam = i % 10 < 2 || k < 2 || k > wallH - 3; P(x + W2 + i, y - 3 - k - Math.round(i * dd), LT(beam ? '#4a3424' : '#9b8467', SIDE));
  }
  for (let k = 0; k < wallTop; k++) for (let i = -W2; i <= W2; i++) {
    const beam = Math.abs(i) > W2 - 2 || k < 2 || k > wallH - 3 || Math.abs(i) < 1; P(x + i, y - 3 - k, LT(beam ? '#4a3424' : '#a38c6d', FRONT));
  }
  // Pfosten und Balken im Rohbau
  if (stage >= 3 && stage < 7) for (const [ox, oy] of [[-W2, 0], [0, 0], [W2, 0], [W2 + depth - 1, depth * dd]]) for (let k = 0; k < wallH + 2; k++) { P(x + ox, y - 3 - k - Math.round(oy), LT('#5a3e28', SIDE)); P(x + ox + 1, y - 3 - k - Math.round(oy), LT('#5a3e28', FRONT)); }
  if (stage >= 4 && stage < 8) { for (let i = -W2; i <= W2; i++) P(x + i, y - 3 - wallH, LT('#5a3e28', [0, -1, 0.5])); for (let i = 0; i < depth; i++) P(x + W2 + i, y - 3 - wallH - Math.round(i * dd), LT('#5a3e28', [0.5, -1, 0.5])); }
  if (stage >= 7) { // Tür, Fenster
    for (let k = 0; k < Math.round(11 * s); k++) for (let i = -Math.round(4 * s); i <= Math.round(3 * s); i++) P(x + i, y - 3 - k, LT(stage >= 10 ? '#5a3a22' : '#2a1c12', FRONT));
    const win = night && stage >= 10 ? hex('#ffcf74') : LT('#2a2a36', FRONT, 1);
    for (let k = 0; k < Math.round(4 * s); k++) for (let i = 0; i < Math.round(4 * s); i++) { L.set(x + Math.round(10 * s) + i, y - Math.round(12 * s) - k, win); L.set(x + W2 + Math.round(12 * s) + i, y - Math.round(12 * s) - k - Math.round((12 * s + i) * dd), win); }
  }
  // Giebel + Dach
  const gy = y - 3 - wallH, peakY = gy - roofH;
  if (stage >= 7) for (let k = 0; k < roofH * 0.62; k++) { const half = W2 * (1 - k / (roofH * 0.62)); for (let i = -half; i <= half; i++) P(x + i, gy - k, LT(Math.abs(i) < 1 ? '#4a3424' : '#8d775c', FRONT)); }
  if (stage >= 5) {
    for (let k = 0; k <= roofH + 4; k++) {
      const yy = peakY + k, half = (W2 + 5) * (k / roofH); if (yy > gy + 4) continue;
      const thatchHere = stage >= 9 || (stage === 8 && k > roofH * 0.5);
      for (let side = -1; side <= 1; side += 2) for (let t = 0; t < (thatchHere ? 4 : 2); t++) {
        const xx = x + side * (half - t);
        if (!thatchHere) { P(xx, yy, LT('#5a3e28', side < 0 ? [-0.6, -0.4, 0.6] : [0.7, -0.4, 0.5])); continue; }
        drawThatch(xx, yy, side < 0 ? [-0.7, -0.5, 0.5] : [0.75, -0.55, 0.4], 0);
      }
      for (let i = 0; i < depth + 4; i++) {
        const xx = x + half + i - 1, y2 = yy - Math.round(i * dd);
        if (thatchHere) drawThatch(xx, y2, [0.75, -0.55, 0.4], i);
        else if (i % 6 === 0 || k === roofH) P(xx, y2, LT('#5a3e28', [0.6, -0.5, 0.5]));
      }
    }
  }
  function drawThatch(xx, yy, n, i) {
    const streak = N4.noise(xx * 0.9, yy * 0.18);
    let col = lit(hex(streak > 0.6 ? '#c4a466' : streak > 0.35 ? '#a88850' : '#86683c'), n[0], n[1], n[2], 3, ls);
    if (moss && N3.noise(xx * 0.22, yy * 0.22) > 0.5) col = lit(hex(N3.noise(xx, yy) > 0.5 ? '#5e7a3a' : '#456632'), n[0], n[1], n[2], 2, ls);
    if (snow && (N3.noise(xx * 0.3, yy * 0.4) > 0.3 || i > 2)) col = lit(hex('#f0f2f4'), n[0], n[1], n[2], 2, ls);
    P(xx, yy, col);
  }
  // Gerüst
  if (stage >= 5 && stage <= 9) {
    const sx = x + W2 + depth + 3;
    for (let k = 0; k < wallH + roofH * 0.6; k++) { P(sx, y - k - Math.round(depth * dd), LT('#b08a5a', SIDE)); P(sx - 9, y - k - Math.round((depth - 9) * dd) + 2, LT('#b08a5a', SIDE)); }
    for (const hh of [Math.round(wallH * 0.6), Math.round(wallH + 4)]) for (let i = -11; i <= 2; i++) P(sx + i, y - hh - Math.round((depth + i) * dd), LT('#a07a4a', [0, -1, 0.5]));
  }
  let chimney = null;
  if (stage >= 10) {
    for (let i = -3; i < depth + 4; i++) P(x + i, peakY - Math.round(Math.max(0, i) * dd) - 1, LT('#4a3424', [0, -1, 0.4]));
    for (let k = 0; k < 6 * s; k++) { P(x - 2 - k * 0.6, peakY - 1 - k, LT('#4a3424', [0, -1, 0.5])); P(x + 2 + k * 0.6, peakY - 1 - k, LT('#4a3424', [0, -1, 0.5])); }
    const cx = x + W2 + Math.round(14 * s), cyy = peakY + Math.round(10 * s) - Math.round(14 * s * dd);
    for (let k = 0; k < 9 * s; k++) for (let i = 0; i < 4 * s; i++) P(cx + i, cyy - k, LT('#6f6a66', i > 1 ? SIDE : FRONT));
    chimney = [cx + 2 * s, cyy - 9 * s];
  }
  return { chimney, window: stage >= 10 ? [x + Math.round(12 * s), y - Math.round(14 * s)] : null };
}

/* ---------- Held: Rückansicht, stehend, Umhang mit Fellkragen, Bogen, Stab, Pfeife ---------- */
export const HERO = { x: 104, y: 288 };
function heroLayer() {
  const L = new Layer(), { x: fx, y: fy } = HERO;
  const LD = () => L5();
  const shadeN = (base, nx, ny, nz, rimK = 1) => {
    const d = step(Math.max(0, nx * LD()[0] + ny * LD()[1] + nz * LD()[2]), 3);
    let col = mul(base, add(amb(), sc(light(), d)));
    const rim = nx * Math.sign(LD()[0]) > 0.75 ? 1 : 0;
    if (rim) col = add(col, sc(mul(base, light()), 0.35 * rimK));
    return col;
  };
  const ell = (cx, cy, rx, ry, base, tex) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d2 = dx * dx + dy * dy; if (d2 > 1) continue; let c = shadeN(base, dx, dy, Math.sqrt(1 - d2)); if (tex) c = sc(c, tex(x, y)); L.set(x, y, c); } };
  const limb = (x0, y0, x1, y1, r0, r1, base, tex) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2); const ax = -(y1 - y0), ay = x1 - x0, al = Math.hypot(ax, ay) || 1; for (let s2 = 0; s2 <= n; s2++) { const t = s2 / n, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, r = r0 + (r1 - r0) * t; for (let k = -r; k <= r; k += 0.5) { const u = k / r; let c = shadeN(base, (ax / al) * u, (ay / al) * u, Math.sqrt(Math.max(0, 1 - u * u))); if (tex) c = sc(c, tex(cx + (ax / al) * k, cy + (ay / al) * k, t)); L.set(cx + (ax / al) * k, cy + (ay / al) * k, c); } } };
  const poly = (pts, fn) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) ins = !ins; } if (ins) L.set(x, y, fn(x, y)); } };
  const C = { cloak: hex('#34495c'), cloakD: hex('#253545'), trim: hex('#b88a3e'), fur: hex('#c9b48c'), furD: hex('#8f7a58'), pants: hex('#4a3a2c'), wrap: hex('#9a8464'), boot: hex('#3a2a1e'), hair: hex('#3d2a1c'), skin: hex('#d49a72'), wood: hex('#6b4a2e'), bow: hex('#7a5232'), pipe: hex('#5e3a20') };
  // Stab links (in der linken Hand, auf dem Boden aufgesetzt)
  limb(fx - 24, fy - 2, fx - 19, fy - 122, 1.2, 1.2, C.wood);
  // Beine (schlank), Wickelungen, Stiefel
  limb(fx - 5, fy - 46, fx - 8, fy - 6, 4.2, 3.2, C.pants, (x, y, t) => (t > 0.45 && Math.floor(y) % 4 === 0 ? 1.25 : 1));
  limb(fx + 6, fy - 46, fx + 9, fy - 6, 4.2, 3.2, C.pants, (x, y, t) => (t > 0.45 && Math.floor(y) % 4 === 0 ? 1.25 : 1));
  ell(fx - 9, fy - 2, 5, 3, C.boot); ell(fx + 10, fy - 2, 5, 3, C.boot);
  // Umhang: von den Schultern bis über die Knie, im Wind leicht nach links
  const cloakTop = fy - 98;
  poly([[fx - 16, cloakTop], [fx + 15, cloakTop - 1], [fx + 22, fy - 52], [fx + 19, fy - 34], [fx - 6, fy - 30], [fx - 26, fy - 36], [fx - 24, fy - 60]], (x, y) => {
    const u = clamp((x - fx) / 22, -1, 1);
    const spread = 1 + Math.max(0, y - cloakTop) * 0.02;
    const fold = Math.sin(((x - fx) / spread) * 0.55 + N1.noise(x * 0.07, y * 0.04) * 3) * 0.5 + 0.5;
    let c = shadeN(C.cloak, u * 0.95, -0.1, Math.sqrt(Math.max(0, 1 - u * u * 0.85)));
    c = sc(c, fold > 0.62 ? 1.1 : fold < 0.22 ? 0.82 : 1);
    const hem = fy - 34 - (x - fx) * 0.05 + (x < fx - 6 ? (fx - 6 - x) * 0.3 : 0);
    if (y > hem - 5) c = (Math.floor(x / 2) + Math.floor(y)) % 3 === 0 ? flat(C.trim, 0.9) : flat(sc(C.trim, 0.7), 0.85); // gemusterte Borte
    return c;
  });
  // Bogen quer über den Rücken
  for (let k = 0; k <= 60; k++) { const t = k / 60, bx = fx - 14 + t * 30, by = cloakTop - 6 + t * 52 - Math.sin(t * Math.PI) * 9; L.set(bx, by, shadeN(C.bow, 0.4, -0.5, 0.7)); L.set(bx + 1, by, shadeN(C.bow, 0.6, -0.5, 0.6)); }
  for (let k = 0; k <= 50; k++) { const t = k / 50; L.set(fx - 14 + t * 30, cloakTop - 6 + t * 52, hex('#d8d0b8')); }
  // Fellkragen mit ausgefranstem Rand
  for (let y = cloakTop - 8; y <= cloakTop + 9; y++) for (let x = fx - 21; x <= fx + 20; x++) {
    const dx = (x - fx + 0.5) / 21, dy = (y - cloakTop) / 8.5; if (dx * dx + dy * dy > 1) continue;
    if (y > cloakTop + 2 && N4.noise(x * 0.9, 7) > 0.5 && dy > 0.4) continue;
    const c = shadeN(N4.noise(x * 1.1, y * 0.6) > 0.55 ? C.fur : C.furD, dx, dy - 0.6, 0.6);
    L.set(x, y, c);
  }
  // Rechter Arm zur Pfeife (Ellbogen nach außen), Hand am Kinn
  limb(fx + 15, cloakTop + 2, fx + 25, cloakTop + 20, 4.2, 3.6, C.cloakD);
  limb(fx + 25, cloakTop + 20, fx + 14, cloakTop - 6, 3.3, 2.8, C.cloak);
  ell(fx + 13, cloakTop - 8, 3, 2.8, C.skin);
  // Linker Arm am Stab
  limb(fx - 15, cloakTop + 2, fx - 21, cloakTop + 30, 4, 3.4, C.cloakD);
  ell(fx - 20, cloakTop + 32, 2.8, 2.6, C.skin);
  // Kopf: leicht nach rechts gedreht (Wange und Bart sichtbar), Haare zum Zopf gebunden
  ell(fx + 2, cloakTop - 20, 10, 12, C.skin);
  ell(fx + 9, cloakTop - 14, 4.5, 6, hex('#3a2a20'), (x, y) => 0.8 + N4.noise(x * 1.4, y * 0.5) * 0.4); // Bart-Rand
  for (let y = cloakTop - 33; y <= cloakTop - 9; y++) for (let x = fx - 9; x <= fx + 12; x++) {
    const dx = (x + 0.5 - (fx + 1)) / 10.5, dy = (y + 0.5 - (cloakTop - 21)) / 12; if (dx * dx + dy * dy > 1) continue;
    if (x > fx + 4 && y > cloakTop - 25) continue; // Wange frei
    let c = shadeN(C.hair, dx, dy, Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)), 1.4);
    c = sc(c, 0.75 + N4.noise(x * 1.2, y * 0.14) * 0.5);
    L.set(x, y, c);
  }
  ell(fx + 8, cloakTop - 20, 1.6, 2.6, sc(C.skin, 0.95)); // Ohr
  limb(fx - 2, cloakTop - 12, fx - 4, cloakTop + 6, 2, 1.4, C.hair, (x, y) => 0.7 + N4.noise(x * 1.5, y * 0.5) * 0.6); // Zopf
  for (let k = 0; k < 3; k++) L.set(fx - 3, cloakTop - 6 + k, flat(C.trim, 1)); // Lederband
  for (let k = 0; k < 7; k++) L.set(fx - 7 + k * 0.2, cloakTop - 33 - k, flat(k > 4 ? hex('#e8e0cc') : hex('#8a6a4a'), 1)); // Feder
  // Pfeife
  for (let k = 0; k < 7; k++) L.set(fx + 11 + k, cloakTop - 12 + k * 0.2, shadeN(C.pipe, 0.3, -0.5, 0.7));
  ell(fx + 18.5, cloakTop - 13, 2, 2.6, C.pipe);
  L.set(fx + 18, cloakTop - 16, [1.3, 0.6, 0.2]); L.set(fx + 19, cloakTop - 16, [1.1, 0.5, 0.15]);
  // Schattenseiten-Kontur
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 1; x < W - 1; x++) if (L.a[y * W + x] && !L.a[y * W + x - Math.sign(L5()[0] || 1)]) out.push([x - Math.sign(L5()[0] || 1), y]);
  for (const [x, y] of out) L.set(x, y, [0.1, 0.1, 0.14]);
  return L;
}

/* ---------- Szene ---------- */
const hillTop = (x) => 266 + Math.pow(Math.max(0, x) / 235, 2) * 120 + N2.fbm(x * 0.05, 8, 4) * 8;
const meadowY = (x) => 238 + Math.sin(x * 0.01) * 3 + N1.fbm(x * 0.02, 4, 3) * 6;
export const PLOTS = [
  { x: 300, y: 278, s: 1.25, stage: 10 },
  { x: 410, y: 262, s: 1.05, stage: 10, moss: true, shadow: 1 },
  { x: 506, y: 286, s: 1.3, stage: 6 },
  { x: 380, y: 300, s: 1.2, stage: 0 },
];
const pathX = (y) => 330 + (y - 240) * -0.9 + Math.sin(y * 0.05) * 10;

export function renderScene(time, season) {
  setMood(time, season);
  const back = new Layer(), mid = new Layer(), village = new Layer(), front = new Layer();
  drawSky(back);
  mountain(back, (x) => 190 - N3.ridged(x * 0.01, 1.7, 5) * 70, { seed: 9, fogBase: 0.6, fogGain: 0.3, rock: '#76819a', snow: '#e8ecf2', yEnd: 236, faceX: 300 });
  mountain(back, V5.mtnTop ? (x) => V5.mtnTop(x) - 22 : null, { seed: 3, fogBase: 0.2, fogGain: 0.55, rock: '#6a7690', snow: '#f1eee6', yEnd: 248, faceX: V5.PEAK });
  // Nebelband
  const HZ = V5.HAZE;
  for (let y = 190; y < 250; y++) for (let x = 0; x < W; x++) { const n = N1.fbm(x * 0.012, y * 0.05, 4); const t = clamp(1 - Math.abs(y - 226) / 24) * (n > 0.45 ? 1 : 0.55); if (t > 0.35) back.set(x, y, mix(back.has(x, y) ? back.get(x, y) : HZ, HZ, step(t * 0.8, 3))); }
  // Waldschichten hinter dem Dorf
  const r = rng(12);
  for (const [y0, y1, n, hh, fogT] of [[218, 232, 420, 13, 0.58], [226, 242, 380, 20, 0.4], [234, 250, 300, 30, 0.22]]) {
    const list = []; for (let i = 0; i < n; i++) list.push([r() * W, y0 + r() * (y1 - y0)]); list.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of list) conifer(back, x, y, hh * (0.7 + r() * 0.6), hh * 0.22 * (0.8 + r() * 0.4), { fogT });
  }
  // Wiese im Tal mit Feld, Weg, Bergschatten
  const g = S().grass.map(hex);
  for (let x = 0; x < W; x++) for (let y = Math.floor(meadowY(x)); y < H; y++) {
    const n = N2.fbm(x * 0.05, y * 0.12, 4), cl = N3.noise(x * 0.35, y * 0.7);
    const v = n * 0.6 + cl * 0.4;
    let col = flat(g[v > 0.6 ? 2 : v > 0.42 ? 1 : 0], 0.75);
    if (!S().groundSnow && cl > 0.8) col = flat(hex(S().dry), 0.8);
    // Feld links vom Dorf
    if (x > 205 && x < 268 && y > 252 && y < 282 && !S().groundSnow) { const row = Math.floor((y - 252 + (x - 205) * 0.15) / 3) % 2; col = flat(hex(season === 'herbst' ? (row ? '#c9a95a' : '#a8884a') : season === 'fruehling' ? (row ? '#7a5a40' : '#6a8a40') : (row ? '#6a8a3c' : '#577534')), 0.8); }
    if (T().body === 'sun' && x > 380 && x < 470 && y < 274 && (x - 380) * 0.5 + (274 - y) + N1.noise(x * 0.1, y * 0.2) * 12 > 26) col = sc(mix(col, mul(col, hex('#8090c0')), 0.5), 0.8);
    const px = pathX(y), pw = 3 + (y - 240) * 0.06;
    if (y > 270 && Math.abs(x - px) < pw) { const cell = N4.noise(x * 0.32, y * 0.5); col = Math.abs(cell - 0.5) < 0.05 ? flat(hex('#3e4048'), 0.4) : lit(hex(S().groundSnow ? '#d8dde6' : '#8a8a8a'), 0, -0.6, 0.6, 2); }
    mid.set(x, y, fog(col, clamp(0.16 - (y - 238) * 0.004)));
  }
  tufts(mid, 500, (rr) => { const x = rr() * W, y = meadowY(x) + 6 + rr() * 80; return [x, y]; }, 41, 0.7);
  // Zaun am Feld
  for (let x = 204; x < 270; x += 4) for (let k = 0; k < 5; k++) mid.set(x, 283 - k, lit(hex('#6b4b2e'), 0.6, 0, 0.6, 2));
  for (let x = 204; x < 270; x++) mid.set(x, 280, lit(hex('#7a5a3a'), 0, -1, 0.5, 2));
  // Dorf (Bausätze)
  const info = [];
  for (const p of [...PLOTS].sort((a, b) => a.y - b.y)) info.push(house(village, p.x, p.y, { s: p.s, stage: p.stage, moss: p.moss, shadow: T().body === 'sun' ? (p.shadow || 0) : 0 }));
  // Vordergrund: Hang links, Felsen, Gras, Nadelbaum rechts
  for (let x = 0; x < W; x++) for (let y = Math.floor(hillTop(x)); y < H; y++) {
    const n = N2.fbm(x * 0.06, y * 0.1, 4), cl = N3.noise(x * 0.3, y * 0.55);
    const depthIn = y - hillTop(x);
    let col = flat(g[n * 0.6 + cl * 0.4 > 0.55 ? 1 : 0], 0.42);
    if (!S().groundSnow && cl > 0.8) col = flat(hex(S().dry), 0.5);
    col = mix(col, mul(col, hex('#8a9ccc')), 0.35);
    if (depthIn < 4) col = lit(hex('#5d6577'), 0.2, -0.8, 0.5, 2); // Felskante
    else if (depthIn < 7) col = lit(hex('#4a5162'), 0.2, 0.3, 0.6, 2);
    front.set(x, y, col);
  }
  facetRock(front, HERO.x + 2, HERO.y + 18, 58, 24); facetRock(front, 22, 300, 40, 34); facetRock(front, 190, 350, 52, 26);
  tufts(front, 380, (rr) => { const x = rr() * 280, y = hillTop(x) + 6 + rr() * 90; return y < H ? [x, y] : [null]; }, 43, 1.5, 0.62);
  conifer(front, 628, 380, 330, 50, { dark: '#18301f', mid: '#25412b', litC: '#3a5c3a' });
  const hero = heroLayer();
  lightBands([back, mid]);
  const pal = buildPalette([back, mid, village, front, hero], 52);
  return {
    pal, info,
    imgs: { back: toImage(back, pal), mid: toImage(mid, pal), village: toImage(village, pal, 0), front: toImage(front, pal, 1), hero: toImage(hero, pal, 0) },
  };
}

export function drawAnim(cv, t, time, season, info) {
  V5.drawAnim(cv, t, time, season, info.filter((i) => i.chimney));
  const c = cv.getContext('2d');
  const sx = HERO.x + 18, sy = HERO.y - 98 - 18;
  for (let i = 0; i < 12; i++) { const ph = ((t / 1600) + i / 12) % 1; c.fillStyle = `rgba(236,232,224,${(0.8 * (1 - ph)).toFixed(2)})`; const s2 = ph > 0.4 ? 2 : 1; c.fillRect(Math.round(sx + ph * 10 + Math.sin(ph * 6 + i) * 2), Math.round(sy - ph * 46), s2, s2); }
  // Bewohner, die zur Baustelle laufen
  const ph = (t / 26000) % 1, vy = 290 - ph * 18, vx = 450 + ph * 40;
  c.fillStyle = '#5a3a2a'; c.fillRect(Math.round(vx), Math.round(vy) - 4, 2, 4); c.fillStyle = '#d9a27a'; c.fillRect(Math.round(vx), Math.round(vy) - 6, 2, 2); c.fillStyle = '#a07a4a'; c.fillRect(Math.round(vx) - 2, Math.round(vy) - 6, 6, 1);
}
export function drawGlow(cv, t, time, info) {
  glow5(cv, t, time, info.filter((i) => i.window));
  const c = cv.getContext('2d'), Sx = 2, x = HERO.x + 18.5, y = HERO.y - 98 - 16;
  const g = c.createRadialGradient(x * Sx, y * Sx, 0, x * Sx, y * Sx, 7 * Sx); g.addColorStop(0, `rgba(255,140,60,${(0.6 + Math.sin(t / 160) * 0.2).toFixed(2)})`); g.addColorStop(1, 'rgba(255,140,60,0)');
  c.fillStyle = g; c.fillRect((x - 7) * Sx, (y - 7) * Sx, 14 * Sx, 14 * Sx);
}
