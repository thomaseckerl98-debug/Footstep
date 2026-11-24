// Mossheart Welt: große Landschaft (960×540) je Gegend, Höhenstufen, Bäche, Bauplätze, Wegenetz, Gebäude-Bausätze.
import {
  W, H, K, rng, makeNoise, N1, N2, N3, N4, clamp, mix, mul, add, sc, hex, step, Layer, setMood, lit, fog,
  conifer, blobTree, buildPalette, toImage,
} from './core.js?v=1';
import * as CORE from './core.js?v=1';
import { buildLand, roadPoint, distPoly, LAND_IDS } from './lands.js?v=1';
import { BACKDROP, FRINGE, FRONT, bush, birch, boulder } from './backdrops.js?v=1';
export { W, H, setMood, LAND_IDS };

export const WORLD_VERSION = 5;
const S = () => CORE.S, T = () => CORE.T;
const flat = (base, k = 0.75) => mul(base, add(CORE.AMB, sc(CORE.LIGHT, k)));

/* ======================================================================
   Aktuelle Gegend (live: alle Module sehen nach setLand die neuen Werte)
   ====================================================================== */
export let LAND, PLOTS, ROADS, PLAZA, TREES, LANTERNS, STREAMS, STREAM, BRIDGES, BRIDGE, streamWidth, horizonY, CASCADES;
export function setLand(id) {
  if (LAND && LAND.id === id) return LAND;
  LAND = buildLand(id);
  PLOTS = LAND.PLOTS; ROADS = LAND.ROADS; PLAZA = LAND.PLAZA; TREES = LAND.TREES; LANTERNS = LAND.LANTERNS;
  STREAMS = LAND.STREAMS; STREAM = STREAMS[0].pts; streamWidth = STREAMS[0].w; BRIDGES = LAND.BRIDGES; BRIDGE = BRIDGES[0] || { x: -99, y: -99, w: 0 };
  horizonY = LAND.horizon;
  CASCADES = [];
  for (const st of STREAMS) { const n = st.pts.length - 1; for (let i = 0; i < n; i++) { const [x, y] = st.pts[i], f = LAND.inFace(x, y); if (f && !CASCADES.some((c) => Math.abs(c.x - x) < 8 && Math.abs(c.y0 - f.top) < 6)) CASCADES.push({ x: Math.round(x), y0: Math.round(f.top), y1: Math.round(f.bot), w: st.w(i / n) }); } }
  return LAND;
}
setLand('hochtal');
export const depthScale = (y) => 0.72 + clamp((y - 370) / 170) * 0.55;

/* ======================================================================
   Grund, Stufen, Bäche, Wege
   ====================================================================== */
const GROUND = {
  hochtal: { dryK: 0.82 }, seeufer: { dryK: 0.86, lush: 0.1 }, klamm: { dryK: 0.7, gravel: 0.18 }, heide: { dryK: 0.8, heather: 0.18 }, urwald: { dryK: 0.92, moss: 0.35 }, fjord: { dryK: 0.78, gravel: 0.1 },
};
const ROCK = { hochtal: '#7d8496', seeufer: '#80868e', klamm: '#9a6a52', heide: '#8a8a80', urwald: '#6f7a70', fjord: '#7a8290' };
const WALL = { hochtal: ['#8c877c', '#a49e90', '#6e6a62'], seeufer: ['#90908a', '#aaa89e', '#72726c'], klamm: ['#a07a62', '#b8907a', '#7c5c4a'], heide: ['#8e8c80', '#a8a698', '#6e6c62'], urwald: ['#7a7e74', '#92968a', '#5e6258'], fjord: ['#868c94', '#a0a6ae', '#666c74'] };
function groundCol(L, x, y) {
  const g = S().grass.map(hex), GP = GROUND[L.id] || {};
  const n = N2.fbm(x * 0.035, y * 0.08, 4), cl = N3.noise(x * 0.3, y * 0.6), v = n * 0.6 + cl * 0.4;
  let col = flat(g[v > 0.6 ? 2 : v > 0.42 ? 1 : 0], 0.75);
  const snow = S().groundSnow;
  if (!snow && cl > GP.dryK) col = flat(hex(S().dry), 0.8);
  if (!snow && GP.moss && N1.fbm(x * 0.02, y * 0.05, 3) > 1 - GP.moss) col = flat(hex(N4.noise(x * 0.5, y * 0.7) > 0.5 ? '#4a7a34' : '#3a6a2c'), 0.8);
  if (!snow && GP.heather && N1.fbm(x * 0.018 + 4, y * 0.05, 3) > 1 - GP.heather) col = flat(hex(N4.noise(x * 0.6, y * 0.8) > 0.55 ? S().heather : '#6a4a5a'), 0.8);
  if (GP.gravel && N2.fbm(x * 0.03 + 9, y * 0.07, 3) > 1 - GP.gravel) col = flat(hex(snow ? '#c8ced8' : N4.noise(x * 0.8, y) > 0.5 ? '#8a8478' : '#6e6a62'), 0.8);
  if (GP.lush && !snow && n > 0.62) col = sc(col, 1.05);
  return col;
}
function drawGround(mid, L) {
  for (let x = 0; x < W; x++) {
    const hz = L.horizon(x);
    for (let y = Math.floor(hz); y < H; y++) {
      let col = groundCol(L, x, y);
      const e = y - hz; if (e < 12) col = sc(col, 0.74 + (e / 12) * 0.26 + (N3.noise(x * 0.4, y * 0.5) > 0.7 ? 0.04 : 0));
      mid.set(x, y, fog(col, clamp(0.16 - (y - hz) * 0.003)));
    }
  }
}
// Stirnseiten der Stufen: Trockenmauer, Felsabbruch oder steile Böschung; dazu Kantenlicht und Kontaktschatten
function drawFaces(mid, L) {
  const snow = S().groundSnow, rockC = ROCK[L.id], wallC = WALL[L.id];
  const steps = L.STEPS.slice().sort((a, b) => a.edge((a.x0 + a.x1) / 2) - b.edge((b.x0 + b.x1) / 2));
  for (const s of steps) {
    const nz = makeNoise(Math.round(s.x0 * 7 + s.x1));
    for (let x = Math.max(0, Math.floor(s.x0)); x <= Math.min(W - 1, s.x1); x++) {
      const h = s.h(x); if (h < 0.8) continue;
      const e = s.edge(x), slope = (s.edge(x + 2) - s.edge(x - 2)) * 0.25;
      const top = Math.round(e), bot = Math.round(e + h);
      // Lichtkante auf der oberen Ebene
      for (let y = top - 2; y < top; y++) if (mid.has(x, y)) mid.set(x, y, sc(mid.get(x, y), 1.07));
      for (let y = top; y <= bot; y++) {
        const v = (y - e) / h; let col;
        const ao = v > 0.8 ? -0.12 * (v - 0.8) / 0.2 : 0;
        if (s.kind === 'mauer') {
          // Trockenmauer: unregelmäßige Steinreihen, oben eine Reihe Decksteine, Moos in den Fugen
          const cap = y - e < 3.2, row = cap ? -1 : Math.floor((y - e - 3.2) / 3.6), off = nz.noise(row * 3.1, 1) * 9, xs = x + off;
          const sw = cap ? 7 : 4.5 + nz.noise(row, Math.floor(xs / 6)) * 3.5, cellX = Math.floor(xs / sw);
          const inX = xs - cellX * sw, inY = cap ? y - e : (y - e - 3.2) - row * 3.6, gap = inX < 0.9 || (!cap && inY < 0.8);
          const tone = nz.noise(cellX * 1.7, row * 2.3 + 5), base = wallC[tone > 0.62 ? 1 : tone > 0.3 ? 0 : 2];
          const bevel = inY < 1.4 ? 0.2 : inY > (cap ? 2.4 : 2.8) ? -0.12 : 0, side = (inX / sw - 0.5) * 0.12 * Math.sign(CORE.LDIR[0] || 1);
          col = gap ? flat(hex('#3a3430'), 0.5) : flat(hex(cap ? wallC[1] : base), 0.62 + bevel + side + slope * 0.2 + ao);
          if (!gap && !cap && nz.noise(xs * 0.2, y * 0.3) > 0.74 && !snow) col = flat(hex(nz.noise(xs, y) > 0.5 ? '#5e7a3a' : '#4a6a30'), 0.7);
          if (cap && snow && nz.noise(xs * 0.4, 3) > 0.25) col = flat(hex('#eef1f4'), 0.85);
        } else if (s.kind === 'fels') {
          // Felsabbruch: kantige Facetten im Licht, Risse, Grasbüschel auf Absätzen
          const f = nz.ridged(x * 0.05 + y * 0.012, y * 0.08, 4), fx = (nz.ridged((x + 1) * 0.05 + y * 0.012, y * 0.08, 4) - f) * 10, fy = (nz.ridged(x * 0.05 + y * 0.012, (y + 1) * 0.08, 4) - f) * 8;
          const facet = step(clamp(0.5 + (-fx) * Math.sign(CORE.LDIR[0] || 1) * 0.9 - fy * 0.6 + slope * 0.6), 3);
          col = flat(hex(rockC), 0.42 + facet * 0.5 + ao);
          if (nz.noise(x * 0.6, y * 0.12) > 0.8) col = sc(col, 0.72);
          if (nz.noise(x * 0.22, y * 0.3) > 0.76 && v > 0.12 && v < 0.85) col = snow ? flat(hex('#eef1f4'), 0.85) : flat(hex(nz.noise(x, y) > 0.5 ? S().grass[1] : S().grass[0]), 0.72);
        } else {
          // steile Grasböschung mit freiliegender Erde und Steinen
          const g = S().grass.map(hex), nn = N2.fbm(x * 0.05, y * 0.12, 3);
          col = flat(g[nn > 0.62 ? 1 : 0], 0.4 + (1 - v) * 0.14 + ao);
          if (v < 0.25) col = flat(g[1], 0.62);
          if (v > 0.4 && N3.noise(x * 0.4, y * 0.5) > 0.56) col = flat(hex(N4.noise(x, y) > 0.5 ? '#6a5a44' : '#80868e'), 0.62);
          if (snow && N3.noise(x * 0.3, y * 0.4) > 0.35) col = flat(hex('#e4e8ee'), 0.75);
        }
        // überhängendes Gras an der Kante
        if (y - top < 2.5 && N4.noise(x * 0.9, y) > 0.35) col = snow ? lit(hex('#eef1f4'), 0, -1, 0.5, 2) : flat(hex(S().grass[1]), 0.85);
        mid.set(x, y, col);
      }
      // Kontaktschatten unten
      for (let k = 1; k <= 4; k++) { const y = bot + k; if (mid.has(x, y)) mid.set(x, y, sc(mid.get(x, y), 0.76 + k * 0.05)); }
      if (s.kind !== 'gras' && nz.noise(x * 0.3, 7) > 0.7) { const y = bot + 1 + Math.round(nz.noise(x, 3) * 2); mid.set(x, y, flat(hex(s.kind === 'mauer' ? wallC[0] : rockC), 0.7)); mid.set(x + 1, y, flat(hex(s.kind === 'mauer' ? wallC[2] : rockC), 0.5)); }
    }
  }
}
function drawStreams(mid, L, r) {
  const winter = S().groundSnow;
  for (const st of L.STREAMS) {
    const pts = st.pts, n = pts.length - 1, samples = [];
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay), m = Math.max(2, Math.ceil(len * 1.5));
      for (let s = 0; s < m; s++) { const u = s / m, t = (i + u) / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, dx = (bx - ax) / len, dy = (by - ay) / len; samples.push({ x, y, t, nx: -dy, ny: dx, w: st.w(t), face: L.inFace(x, y) }); }
    }
    // Ufer: Kies, Erde, Steine, Schilf
    for (const p of samples) {
      const half = p.w / 2 + (p.face ? 1 : 0);
      for (let k = -half - 2.5; k <= half + 2.5; k += 0.5) {
        if (Math.abs(k) <= half) continue;
        const x = p.x + p.nx * k, y = p.y + p.ny * k * 0.6, cell = N4.noise(x * 0.7, y * 0.7);
        const col = winter ? lit(hex('#e4e8ee'), k > 0 ? 0.5 : -0.5, -0.6, 0.6, 2) : lit(hex(cell > 0.62 ? '#7a7d86' : cell > 0.35 ? '#5a4a36' : '#4a3a28'), k > 0 ? 0.5 : -0.5, -0.5, 0.7, 2);
        mid.set(x, y, col);
      }
    }
    // Wasser: tief in der Mitte, hell am Rand, Strömungslinien; an Stufen schäumende Kaskaden
    for (const p of samples) {
      const half = p.w / 2;
      for (let k = -half; k <= half; k += 0.5) {
        const x = p.x + p.nx * k, y = p.y + p.ny * k * 0.6, d = Math.abs(k) / Math.max(0.5, half);
        let col;
        if (p.face) {
          const streak = N3.noise(x * 0.9, y * 0.15) > 0.5;
          col = lit(hex(streak ? '#eef4f6' : d > 0.6 ? '#9cc0cc' : '#c8dde4'), k / half * 0.4, -0.2, 0.9, 3);
        } else {
          col = lit(hex(d > 0.78 ? '#7fb0c2' : d > 0.42 ? '#4a82a0' : '#336684'), 0, -0.8, 0.6, 3);
          col = mix(col, CORE.HAZE, 0.12);
          const flow = N3.noise(p.t * 90 + k * 0.4, k * 0.7);
          if (flow > 0.8 && d < 0.8) col = mix(col, flat(hex('#d8ecf2'), 0.95), 0.7);
          if (winter && d > 0.7 && N4.noise(x * 0.5, y * 0.5) > 0.4) col = lit(hex('#dfe8ee'), 0, -0.6, 0.6, 2); // Eisrand
        }
        mid.set(x, y, col);
      }
      // Steine im Bach mit Schaum
      if (!p.face && N4.noise(p.t * 37, 3.3) > 0.86 && N1.noise(p.t * 53, 1) > 0.5) {
        const k = (N2.noise(p.t * 20, 2) - 0.5) * p.w * 0.6, x = p.x + p.nx * k, y = p.y + p.ny * k * 0.6;
        for (let yy = -1; yy <= 1; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx / 4 + yy * yy < 1.2) mid.set(x + xx, y + yy, lit(hex('#7d8496'), xx / 2, yy - 0.5, 0.7, 2));
        mid.set(x - 3, y, flat(hex('#e8f0f2'), 0.95)); mid.set(x + 3, y + 1, flat(hex('#e8f0f2'), 0.95));
      }
    }
    // Becken unter den Kaskaden
    for (const c of CASCADES) {
      for (let yy = -2; yy <= 3; yy++) for (let xx = -c.w; xx <= c.w; xx++) { const d = (xx / c.w) ** 2 + (yy / 3) ** 2; if (d > 1) continue; mid.set(c.x + xx, c.y1 + 2 + yy, d > 0.55 ? flat(hex('#e8f0f2'), 0.95) : lit(hex('#3a6a8a'), 0, -0.8, 0.6, 3)); }
    }
    // Schilf und Gräser am Ufer
    if (!winter) for (let i = 0; i < samples.length; i += 9) {
      const p = samples[i]; if (p.face || r() > 0.45) continue;
      const side = r() < 0.5 ? -1 : 1, k = side * (p.w / 2 + 2 + r() * 2), x = p.x + p.nx * k, y = p.y + p.ny * k * 0.6, hh = 3 + Math.floor(r() * 4);
      for (let b = 0; b < 3; b++) for (let kk = 0; kk < hh - (b % 2); kk++) mid.set(x + b - 1 + (kk / hh) * (b - 1) * 0.6, y - kk, flat(hex(kk > hh - 2 ? '#a8b860' : '#4f7f3c'), kk > hh * 0.5 ? 0.9 : 0.6));
    }
  }
  // Holzbrücken über den Bach (entlang der Wegrichtung)
  for (const b of L.BRIDGES) {
    const ca = Math.cos(b.ang), sa = Math.sin(b.ang), len = b.w / 2 + 4;
    for (let u = -len; u <= len; u += 0.5) for (let v = -5; v <= 4; v += 0.5) {
      const x = b.x + ca * u - sa * v * 0.6, y = b.y + sa * u + ca * v * 0.6, plank = Math.floor(u + 40) % 3 === 0;
      mid.set(x, y, lit(hex(plank ? '#4a3220' : '#8a6a44'), 0, -0.8, 0.6, 2));
    }
    for (const v of [-6, 5]) for (let u = -len; u <= len; u += 0.5) { const x = b.x + ca * u - sa * v * 0.6, y = b.y + sa * u + ca * v * 0.6; mid.set(x, y - 3, lit(hex('#6b4b2e'), 0, -0.8, 0.6, 2)); if (Math.abs(Math.round(u)) % 5 === 0) for (let k = 0; k < 4; k++) mid.set(x, y - k, lit(hex('#5a3e28'), 0.5, 0, 0.8, 2)); }
  }
}
function drawRoad(Ly, L, road, alpha = 1, path = false) {
  const n = 500;
  for (let i = 0; i <= n; i++) {
    const p = roadPoint(road.pts, i / n), s = depthScale(p.y), w = (path ? 2.5 + 2 * s : 5 + 4 * s) * road.w, face = L.inFace(p.x, p.y, 1);
    for (let k = -w; k <= w; k++) {
      const x = Math.round(p.x - p.dy * k), y = Math.round(p.y + p.dx * k * 0.6);
      const cell = N4.noise(x * 0.3 / s, y * 0.5 / s), edge = Math.abs(k) > w - 1.5;
      let col;
      if (face) {
        // Treppe/Rampe durch die Stufe: Steinplatten mit Stufenkanten und Seitenmauern
        const stepLine = (Math.round(y) - Math.round(face.top)) % 3 === 0;
        col = edge ? lit(hex(WALL[L.id][2]), k > 0 ? 0.5 : -0.5, 0, 0.8, 2) : stepLine ? flat(hex('#4a4a50'), 0.55) : lit(hex(S().groundSnow ? '#d8dde6' : '#a29e94'), 0, -0.7, 0.6, 2);
      } else if (path) {
        // Trampelpfad: Erde mit Grasrand
        if (edge && N3.noise(x * 0.8, y * 0.8) > 0.55) continue;
        col = edge ? flat(hex(S().groundSnow ? '#9aa3b4' : '#5a4e40'), 0.55) : lit(hex(S().groundSnow ? (cell > 0.5 ? '#c8ced8' : '#b4bcc8') : cell > 0.66 ? '#a09684' : cell > 0.3 ? '#8a8070' : '#786e60'), 0, -0.6, 0.6, 2);
      } else col = Math.abs(cell - 0.5) < 0.05 || edge ? flat(hex(S().groundSnow ? '#9aa3b4' : '#4a4a50'), 0.5) : lit(hex(S().groundSnow ? '#d8dde6' : cell > 0.6 ? '#9a968c' : '#86827a'), 0, -0.6, 0.6, 2);
      if (alpha < 1) col = mix(Ly.has(x, y) ? Ly.get(x, y) : col, col, alpha);
      Ly.set(x, y, col);
    }
  }
}
function okDetail(L, x, y, pad = 6) {
  if (y < L.horizon(x) + 6) return false;
  if (PLOTS.some((p) => Math.hypot(p.x - x, (p.y - y) * 1.6) < p.rad + pad)) return false;
  if (L.inFace(x, y, 3)) return false;
  if (L.onStream(x, y, 4)) return false;
  if (ROADS.some((r) => distPoly(x, y, r.pts) < 12)) return false;
  if (Math.hypot(x - PLAZA.x, (y - PLAZA.y) * 2) < 40) return false;
  return true;
}
export function renderWorld(time, season, landId) {
  if (landId) setLand(landId);
  setMood(time, season);
  const L = LAND, back = new Layer(), mid = new Layer(), roads = new Layer(), front = new Layer();
  const r = rng(12);
  (BACKDROP[L.id] || BACKDROP.hochtal)(back, L, r);
  drawGround(mid, L);
  (FRINGE[L.id] || FRINGE.hochtal)(mid, L, r);
  drawFaces(mid, L);
  // Waldflächen (nicht begehbar)
  for (const f of L.FORESTS) { const list = []; for (let i = 0; i < 420 * f.dense; i++) { const x = f.x0 + r() * (f.x1 - f.x0), y = Math.max(f.top(x), L.horizon(x) + 2) + r() * 90; if (y < f.bottom(x) - 2) list.push([x, y]); } list.sort((a, b) => a[1] - b[1]); for (const [x, y] of list) conifer(mid, x, y, 22 + r() * 30, 6 + r() * 4, { fogT: 0.06 }); }
  drawStreams(mid, L, r);
  for (const [lx, ly] of L.LANTERNS) { for (let k = 0; k < 11; k++) mid.set(lx, ly - k, lit(hex('#3a2a1e'), 0.5, 0, 0.8, 2)); mid.set(lx + 1, ly - 10, lit(hex('#3a2a1e'), 0.5, -0.5, 0.7, 2)); for (let yy = -13; yy <= -11; yy++) for (let xx = 1; xx <= 3; xx++) mid.set(lx + xx, ly + yy, xx === 2 && yy === -12 ? hex('#e8c87a') : lit(hex('#2a2420'), 0.4, 0, 0.8, 2)); }
  // kleine Felsen, Büsche, junge Bäume als Detail
  const details = [];
  for (let i = 0; i < 110; i++) { const x = r() * W, y = 370 + r() * 170; if (!okDetail(L, x, y)) continue; details.push([x, y, r()]); }
  details.sort((a, b) => a[1] - b[1]);
  for (const [x, y, k] of details) {
    const s = depthScale(y);
    if (k < 0.4) boulder(mid, x, y, (2.5 + r() * 3.5) * s, (2 + r() * 2.5) * s, ROCK[L.id], 0, L.id === 'urwald' ? 0.35 : 0);
    else if (k < 0.7) bush(mid, x, y, (3 + r() * 3) * s, (2 + r() * 2.5) * s, S().groundSnow ? ['#24382c', '#34503e', '#4a6650'] : ['#2f5a34', '#4f7f3c', '#7fa652'], 0, !!S().groundSnow);
    else if (L.birch) birch(mid, x, y, (16 + r() * 10) * s);
    else conifer(mid, x, y, (10 + r() * 8) * s, 3 * s, { dark: '#2c4a2a', mid: '#3d5f35', litC: '#577a43' });
  }
  for (const [x, y, s] of L.TREES) { if (L.birch) birch(mid, x, y, s * 1.1); else blobTree(mid, x, y, s); }
  // Trampelpfade zu allen Bauplätzen, darüber Hauptweg + Dorfplatz
  for (const road of ROADS.slice(1)) drawRoad(mid, L, road, 1, true);
  drawRoad(mid, L, ROADS[0]);
  for (let yy = -10; yy <= 10; yy++) for (let xx = -26; xx <= 26; xx++) { if ((xx / 26) ** 2 + (yy / 10) ** 2 > 1) continue; const x = PLAZA.x + xx, y = PLAZA.y + yy, cell = N4.noise(x * 0.35, y * 0.6); mid.set(x, y, Math.abs(cell - 0.5) < 0.05 ? flat(hex('#4a4a50'), 0.5) : lit(hex(S().groundSnow ? '#d8dde6' : '#908c84'), 0, -0.6, 0.6, 2)); }
  for (let a = 0; a < Math.PI * 2; a += 0.05) for (let rr = 6; rr <= 8; rr++) mid.set(PLAZA.x + Math.cos(a) * rr, PLAZA.y - 2 + Math.sin(a) * rr * 0.45, lit(hex('#7a7d86'), Math.cos(a), Math.sin(a) - 0.3, 0.6, 2));
  for (let k = 0; k < 10; k++) { mid.set(PLAZA.x - 6, PLAZA.y - 4 - k, lit(hex('#5a3e28'), -0.5, 0, 0.7, 2)); mid.set(PLAZA.x + 6, PLAZA.y - 4 - k, lit(hex('#5a3e28'), 0.6, 0, 0.7, 2)); }
  for (let xx = -8; xx <= 8; xx++) mid.set(PLAZA.x + xx, PLAZA.y - 14 - Math.round((8 - Math.abs(xx)) * 0.5), lit(hex('#6b4b2e'), xx / 8, -0.8, 0.5, 2));
  for (const road of ROADS.slice(1)) drawRoad(roads, L, road);
  (FRONT[L.id] || FRONT.hochtal)(front, L, r);
  CORE.lightBands([back, mid]);
  const pal = buildPalette([back, mid, front], 52);
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
export const EXTRA_DRAW = {};   // weitere Bausätze (game/buildings.js) melden sich hier an
export const KIT_COLORS = [];   // Zusatzfarben dieser Bausätze (werden pro Stimmung beleuchtet)
export function boxBuilding(L, x, y, c) {
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
  // Giebelfeld füllt das ganze Dreieck unter den Dachkanten (keine Durchsicht zum Hintergrund)
  for (let yy = peakY + 1; yy <= gy; yy++) { const k = gy - yy, half = Math.floor(Math.max(0, (W2 + 5) * ((yy - peakY) / roofH) - 2)); for (let i = -half; i <= half; i++) P(x + i, yy, LT(c.gable ? c.gable(i, k) : (Math.abs(i) % 4 === 0 ? '#3a2a1e' : '#5a4430'), FRONT)); }
  for (let i = -W2 - 1; i <= W2 + 1; i++) P(x + i, gy + 1, LT('#2e2218', FRONT)); // Schattenfuge unter der Traufe
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
export const thatch = (xx, yy) => { const s2 = N4.noise(xx * 0.9, yy * 0.18); return s2 > 0.6 ? '#c4a466' : s2 > 0.35 ? '#a88850' : '#86683c'; };
export const timberFront = (i, k, W2, wallH) => (Math.abs(i) > W2 - 2 || k < 2 || k > wallH - 3 || Math.abs(i) < 1 ? '#4a3424' : '#a38c6d');
export const timberSide = (i, k, wallH) => (i % 10 < 2 || k < 2 || k > wallH - 3 ? '#4a3424' : '#9b8467');

export function drawBuilding(L, type, x, y, opts = {}) {
  const s = opts.s || 1, shadow = opts.shadow || 0, moss = opts.moss || false, night = T().body === 'moon';
  const info = { chimneys: [], windows: [], forge: null };
  const win = (g, xx, yy, w, h) => { for (let k = 0; k < h; k++) for (let i = 0; i < w; i++) L.set(xx + i, yy - k, night ? hex('#ffcf74') : g.LT('#2a2a36', g.FRONT, 1)); info.windows.push([xx + w / 2, yy - h / 2]); };
  const chimney = (g, cx, cy, h, col = '#6f6a66') => { for (let k = 0; k < h; k++) for (let i = 0; i < 4 * s; i++) g.P(cx + i, cy - k, g.LT(col, i > 1 ? g.SIDE : g.FRONT)); info.chimneys.push([cx + 2 * s, cy - h]); };
  if (EXTRA_DRAW[type]) { EXTRA_DRAW[type](L, x, y, { s, shadow, moss, night, info, win, chimney }); return info; }
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
  const s = plot.s, w = Math.round(170 * s), h = Math.round(175 * s);
  const sp = new Sprite(w, h, plot.x - Math.round(70 * s), plot.y - Math.round(155 * s));
  const info = drawBuilding(sp, type, plot.x, plot.y, { s, shadow: T().body === 'sun' ? plot.shadow : 0, moss: plot.shadow ? true : false });
  // auf genutzten Bereich zuschneiden
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sp.a[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const kit = KIT_COLORS.flatMap((hx) => [lit(hex(hx), 0.4, -0.5, 0.6, 3), lit(hex(hx), -0.4, 0, 0.8, 3), lit(hex(hx), 0.9, -0.3, 0.4, 3)]);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, full = quantize(sp, kit.length ? pal.concat(kit) : pal), data = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) data.set(full.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1 + 1) * 4), y * cw * 4);
  return { type, plotId: plot.id, x: sp.ox + x0, y: sp.oy + y0, w: cw, h: ch, data, info };
}
