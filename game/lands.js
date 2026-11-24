// Mossheart Landschaften: jedes Dorf liegt in einer eigenen Gegend mit Höhenstufen (Terrassen), Wegen und Bächen.
// Nur Geometrie (keine Pixel): wird vom Zeichner (Worker) und vom Dorfleben (Seite) gleich berechnet.
// Bauplätze: immer 23 Stück mit festen Größen je Nummer (1–8 groß, 9–19 mittel, 20–23 klein), passend zum Server.
import { N1, N2, N3, clamp } from './core.js?v=1';

export const LAND_IDS = ['hochtal', 'seeufer', 'klamm', 'heide', 'urwald', 'fjord'];
export const LAND_NAMES = { hochtal: 'Hochtal', seeufer: 'Seeufer', klamm: 'Felsklamm', heide: 'Heidehügel', urwald: 'Moosurwald', fjord: 'Fjordküste' };
export const LAND_DESC = {
  hochtal: 'Unter einem verschneiten Gipfel, das Dorf steigt nach rechts zu einem Felsrücken an.',
  seeufer: 'Am Ufer eines stillen Bergsees mit kleiner Insel, Terrassen fallen zum Wasser ab.',
  klamm: 'Zwischen roten Felswänden, Häuser auf steinernen Stufen über dem Wildbach.',
  heide: 'Sanfte Hügel voller Heidekraut, Trockenmauern und ein alter Steinkreis in der Ferne.',
  urwald: 'Tief im Moosurwald zwischen riesigen alten Bäumen und bemoosten Felsen.',
  fjord: 'Hoch über einem Fjord, steile Klippen fallen zum Meer ab.',
};
export const PLOT_SIZES = (id) => (id <= 8 ? 'L' : id <= 19 ? 'M' : 'S');
const PLOT_RAD = { L: 34, M: 28, S: 24 };

const tap = (x, a, b, t = 28) => clamp(Math.min(x - a, b - x) / t); // weiches Auslaufen an den Enden einer Stufe
// Catmull-Rom: weiche Kurve durch Stützpunkte, dicht abgetastet
export function spline(pts, per = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

/* ======================================================================
   Die sechs Gegenden. Koordinaten in Weltpixeln (960×540), Blick schräg von vorn.
   steps: Geländestufen. Oberhalb der Kante (edge) liegt die höhere Ebene, darunter die Stirnseite (h Pixel hoch).
   kind: mauer (Trockenmauer), fels (Felsabbruch), gras (steile Böschung).
   ====================================================================== */
const sm = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const DEFS = {
  hochtal: {
    // Talboden links mit Bach, das Dorf steigt nach rechts über eine Mauerterrasse zu einem Felsrücken an
    horizon: (x) => 357 + Math.sin(x * 0.007) * 4 + N1.fbm(x * 0.013, 4, 3) * 9 - sm((x - 520) / 380) * 62,
    plaza: [452, 432],
    steps: [
      { x0: 170, x1: 600, kind: 'mauer', edge: (x) => 458 + Math.sin(x * 0.02) * 2, h: (x) => 22 * tap(x, 170, 1600, 26) * (1 - sm((x - 560) / 40)) },
      { x0: 545, x1: 965, kind: 'fels', edge: (x) => 456 - sm((x - 545) / 420) * 92 + N2.fbm(x * 0.03, 3, 2) * 4, h: (x) => 22 * sm((x - 545) / 50) + sm((x - 600) / 300) * 26 + N3.noise(x * 0.05, 2) * 4 },
      { x0: 640, x1: 965, kind: 'mauer', edge: (x) => 394 - sm((x - 640) / 320) * 62, h: (x) => 18 * tap(x, 640, 1600, 30) },
      { x0: 0, x1: 260, kind: 'gras', edge: (x) => 404 - (260 - x) * 0.05, h: (x) => 14 * tap(x, -400, 260, 50) },
    ],
    streams: [{ pts: [[300, 360], [312, 380], [292, 404], [306, 430], [286, 452], [262, 476], [272, 506], [248, 548]], w0: 3, w1: 9 }],
    roads: [
      { id: 'haupt', pts: [[444, 548], [446, 500], [450, 466], [452, 432]], built: true, w: 1 },
      { id: 'ost', pts: [[452, 432], [540, 428], [610, 418], [680, 400], [760, 372], [840, 346], [940, 322]], w: 0.9 },
      { id: 'west', pts: [[452, 432], [380, 430], [300, 428], [200, 424], [60, 414]], w: 0.9 },
      { id: 'nord', pts: [[452, 432], [458, 408], [462, 384], [466, 366]], w: 0.7 },
      { id: 'suedost', pts: [[446, 500], [560, 498], [680, 520], [760, 548]], w: 0.8 },
      { id: 'suedwest', pts: [[446, 500], [370, 506], [310, 548]], w: 0.8 },
    ],
    forests: [{ x0: 800, x1: 965, top: (x) => 0, bottom: (x) => 394 - sm((x - 640) / 320) * 62 - 20, dense: 1 }],
    trees: [[118, 474, 70], [870, 470, 56], [212, 396, 48], [610, 370, 44], [58, 522, 84]],
    lanterns: [[456, 532], [436, 506], [460, 478], [436, 446], [500, 430], [470, 404]],
  },
  seeufer: {
    // offenes Ufer in der Mitte, links und rechts steigen Hänge mit Terrassen an
    horizon: (x) => 368 + Math.sin(x * 0.006 + 1) * 3 + N2.fbm(x * 0.015, 4, 3) * 5 - sm((260 - x) / 260) * 46 - sm((x - 700) / 260) * 52,
    plaza: [488, 466],
    steps: [
      { x0: 0, x1: 380, kind: 'gras', edge: (x) => 470 - sm((380 - x) / 380) * 60, h: (x) => 24 * tap(x, -600, 380, 70) },
      { x0: 0, x1: 300, kind: 'mauer', edge: (x) => 404 - sm((300 - x) / 300) * 44, h: (x) => 16 * tap(x, -600, 300, 50) },
      { x0: 600, x1: 965, kind: 'gras', edge: (x) => 474 - sm((x - 600) / 365) * 66, h: (x) => 26 * tap(x, 600, 1600, 70) },
      { x0: 680, x1: 965, kind: 'mauer', edge: (x) => 410 - sm((x - 680) / 285) * 46, h: (x) => 16 * tap(x, 680, 1600, 50) },
    ],
    streams: [{ pts: [[560, 548], [574, 516], [552, 488], [570, 460], [548, 432], [562, 404], [546, 382], [552, 370]], w0: 9, w1: 4, toLake: true }],
    roads: [
      { id: 'haupt', pts: [[480, 548], [484, 506], [488, 466]], built: true, w: 1 },
      { id: 'ost', pts: [[488, 466], [600, 460], [680, 446], [760, 420], [850, 392], [940, 372]], w: 0.9 },
      { id: 'west', pts: [[488, 466], [400, 462], [320, 452], [240, 424], [150, 400], [60, 384]], w: 0.9 },
      { id: 'nord', pts: [[488, 466], [480, 436], [472, 410], [464, 390]], w: 0.7 },
      { id: 'suedost', pts: [[600, 460], [660, 500], [720, 548]], w: 0.8 },
      { id: 'suedwest', pts: [[400, 462], [350, 504], [300, 548]], w: 0.8 },
    ],
    forests: [],
    trees: [[96, 486, 62], [890, 500, 60], [380, 404, 40], [640, 400, 42], [40, 530, 80]],
    lanterns: [[492, 532], [470, 508], [496, 484], [468, 470], [536, 466], [480, 434]],
    lake: { y0: 318, y1: 370 },
  },
  klamm: {
    // Wildbach in der Mitte, links und rechts hohe Felsstufen mit Häusern darauf
    horizon: (x) => 362 + N3.fbm(x * 0.02, 4, 3) * 6 - sm((360 - x) / 360) * 52 - sm((x - 600) / 360) * 52,
    plaza: [486, 474],
    steps: [
      { x0: 0, x1: 420, kind: 'fels', edge: (x) => 452 - sm((420 - x) / 420) * 58 + N2.fbm(x * 0.04, 3, 2) * 4, h: (x) => 36 * tap(x, -600, 420, 60) },
      { x0: 580, x1: 965, kind: 'fels', edge: (x) => 452 - sm((x - 580) / 385) * 60 + N2.fbm(x * 0.04 + 5, 3, 2) * 4, h: (x) => 36 * tap(x, 580, 1600, 60) },
      { x0: 0, x1: 330, kind: 'mauer', edge: (x) => 378 - sm((330 - x) / 330) * 40, h: (x) => 16 * tap(x, -600, 330, 40) },
      { x0: 650, x1: 965, kind: 'mauer', edge: (x) => 380 - sm((x - 650) / 315) * 42, h: (x) => 16 * tap(x, 650, 1600, 40) },
    ],
    streams: [{ pts: [[484, 372], [498, 396], [476, 420], [458, 442], [430, 464], [404, 488], [418, 516], [396, 548]], w0: 5, w1: 12 }],
    roads: [
      { id: 'haupt', pts: [[520, 548], [516, 510], [486, 474]], built: true, w: 1 },
      { id: 'ost', pts: [[486, 474], [560, 466], [640, 444], [720, 414], [820, 390], [940, 376]], w: 0.9 },
      { id: 'west', pts: [[486, 474], [420, 462], [340, 436], [260, 410], [160, 392], [60, 380]], w: 0.9 },
      { id: 'nord', pts: [[486, 474], [520, 446], [534, 418], [544, 392]], w: 0.7 },
      { id: 'suedost', pts: [[560, 466], [640, 506], [700, 548]], w: 0.8 },
      { id: 'suedwest', pts: [[420, 462], [360, 506], [300, 548]], w: 0.8 },
    ],
    forests: [],
    trees: [[110, 500, 54], [860, 500, 56], [210, 372, 34], [760, 370, 36], [52, 532, 70]],
    lanterns: [[516, 532], [512, 506], [496, 488], [474, 480], [540, 470], [524, 440]],
  },
  heide: {
    // sanft gewellte Hügel: Böschungen und eine Trockenmauer, die sich um den Hügel zieht
    horizon: (x) => 350 + Math.sin(x * 0.011) * 7 + Math.sin(x * 0.004 + 2) * 5 + N1.fbm(x * 0.012, 4, 3) * 6 - sm((x - 560) / 400) * 30,
    plaza: [470, 468],
    steps: [
      { x0: 160, x1: 820, kind: 'gras', edge: (x) => 452 - Math.sin(clamp((x - 160) / 660) * Math.PI) * 26, h: (x) => 22 * tap(x, 160, 820, 90) },
      { x0: 300, x1: 700, kind: 'mauer', edge: (x) => 402 - Math.sin(clamp((x - 300) / 400) * Math.PI) * 18, h: (x) => 14 * tap(x, 300, 700, 50) },
      { x0: 700, x1: 965, kind: 'gras', edge: (x) => 490 - sm((x - 700) / 265) * 46, h: (x) => 22 * tap(x, 700, 1600, 70) },
    ],
    streams: [{ pts: [[132, 352], [150, 376], [130, 402], [158, 430], [140, 460], [176, 492], [158, 520], [186, 548]], w0: 3, w1: 8 }],
    roads: [
      { id: 'haupt', pts: [[464, 548], [466, 506], [470, 468]], built: true, w: 1 },
      { id: 'ost', pts: [[470, 468], [570, 462], [670, 446], [770, 420], [860, 400], [940, 384]], w: 0.9 },
      { id: 'west', pts: [[470, 468], [380, 462], [290, 456], [190, 450], [60, 440]], w: 0.9 },
      { id: 'nord', pts: [[470, 468], [474, 436], [478, 404], [482, 374]], w: 0.7 },
      { id: 'suedost', pts: [[570, 462], [640, 504], [700, 548]], w: 0.8 },
      { id: 'suedwest', pts: [[290, 456], [262, 500], [240, 548]], w: 0.8 },
    ],
    forests: [],
    trees: [[90, 486, 56], [900, 500, 54], [250, 400, 40], [700, 386, 42], [40, 530, 70]],
    lanterns: [[468, 532], [450, 508], [474, 486], [448, 472], [516, 468], [478, 438]],
    birch: true,
  },
  urwald: {
    // bemooste Felsstufen zwischen Baumriesen, oben ein zweites Plateau
    horizon: (x) => 368 + Math.sin(x * 0.009) * 5 + N2.fbm(x * 0.016, 4, 3) * 8 - sm((x - 560) / 400) * 40,
    plaza: [472, 474],
    steps: [
      { x0: 220, x1: 760, kind: 'fels', edge: (x) => 444 + Math.sin(x * 0.015) * 4, h: (x) => 24 * tap(x, 220, 760, 40) },
      { x0: 620, x1: 965, kind: 'fels', edge: (x) => 490 - sm((x - 620) / 345) * 72, h: (x) => 30 * tap(x, 620, 1600, 70) },
      { x0: 330, x1: 640, kind: 'fels', edge: (x) => 394 + Math.sin(x * 0.02) * 3, h: (x) => 16 * tap(x, 330, 640, 36) },
      { x0: 0, x1: 225, kind: 'gras', edge: (x) => 446 - (225 - x) * 0.12, h: (x) => 16 * tap(x, -400, 225, 50) },
    ],
    streams: [{ pts: [[600, 372], [612, 392], [594, 414], [610, 440], [588, 466], [566, 490], [580, 516], [560, 548]], w0: 3, w1: 9 }],
    roads: [
      { id: 'haupt', pts: [[466, 548], [468, 510], [472, 474]], built: true, w: 1 },
      { id: 'ost', pts: [[472, 474], [560, 470], [660, 456], [760, 428], [860, 404], [940, 388]], w: 0.9 },
      { id: 'west', pts: [[472, 474], [390, 470], [290, 460], [180, 444], [60, 430]], w: 0.9 },
      { id: 'nord', pts: [[472, 474], [462, 440], [454, 410], [450, 384]], w: 0.7 },
      { id: 'suedost', pts: [[660, 456], [700, 502], [740, 548]], w: 0.8 },
      { id: 'suedwest', pts: [[290, 460], [262, 504], [236, 548]], w: 0.8 },
    ],
    forests: [],
    trees: [[110, 490, 74], [880, 500, 70], [240, 404, 50], [720, 392, 50], [44, 530, 86]],
    lanterns: [[470, 532], [452, 508], [476, 488], [450, 478], [516, 474], [466, 446]],
    giant: true,
  },
  fjord: {
    // Terrassen über der Klippe, links ein hoher Felsabsatz, rechts Mauerstufen zum Klippenrand
    horizon: (x) => 360 + Math.sin(x * 0.008) * 4 + N3.fbm(x * 0.014, 4, 3) * 6 - sm((300 - x) / 300) * 40,
    plaza: [470, 470],
    steps: [
      { x0: 0, x1: 380, kind: 'fels', edge: (x) => 456 - sm((380 - x) / 380) * 56 + N2.fbm(x * 0.04, 3, 2) * 3, h: (x) => 34 * tap(x, -600, 380, 70) },
      { x0: 300, x1: 840, kind: 'fels', edge: (x) => 418 + Math.sin(x * 0.012) * 3, h: (x) => 22 * tap(x, 300, 840, 40) },
      { x0: 620, x1: 965, kind: 'mauer', edge: (x) => 486 - sm((x - 620) / 345) * 30, h: (x) => 16 * tap(x, 620, 1600, 40) },
    ],
    streams: [{ pts: [[230, 330], [246, 352], [224, 376], [242, 400], [220, 426], [196, 452], [212, 486], [188, 520], [200, 548]], w0: 3, w1: 8 }],
    roads: [
      { id: 'haupt', pts: [[462, 548], [466, 508], [470, 470]], built: true, w: 1 },
      { id: 'ost', pts: [[470, 470], [570, 464], [670, 456], [780, 446], [940, 430]], w: 0.9 },
      { id: 'west', pts: [[470, 470], [380, 462], [300, 440], [220, 410], [130, 388], [40, 376]], w: 0.9 },
      { id: 'nord', pts: [[470, 470], [482, 442], [492, 416], [500, 392]], w: 0.7 },
      { id: 'suedost', pts: [[670, 456], [710, 502], [750, 548]], w: 0.8 },
      { id: 'suedwest', pts: [[380, 462], [350, 504], [320, 548]], w: 0.8 },
    ],
    forests: [],
    trees: [[110, 500, 58], [890, 506, 60], [620, 398, 40], [760, 400, 40], [46, 532, 76]],
    lanterns: [[468, 532], [450, 508], [476, 488], [446, 476], [512, 470], [490, 440]],
    sea: true,
  },
};

/* ======================================================================
   Abgeleitete Geometrie (Bauplätze, Brücken, Höhen)
   ====================================================================== */
function roadPointAt(pts, t) {
  const seg = []; let total = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); total += l; }
  let d = t * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const u = d / seg[i], a = pts[i], b = pts[i + 1]; return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, dx: (b[0] - a[0]) / seg[i], dy: (b[1] - a[1]) / seg[i] }; }
    d -= seg[i];
  }
  return null;
}
export const roadPoint = roadPointAt;
export function distSeg(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
export function distPoly(x, y, pts) { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; }

export function buildLand(id) {
  const D = DEFS[id] || DEFS.hochtal;
  const L = { id: DEFS[id] ? id : 'hochtal', ...D };
  L.PLAZA = { x: D.plaza[0], y: D.plaza[1] };
  L.ROADS = D.roads.map((r) => ({ ...r, built: !!r.built }));
  L.STEPS = D.steps;
  // Stirnseite einer Stufe an Stelle x: [oben, unten] oder null
  L.face = (x) => { const out = []; for (const s of D.steps) { if (x < s.x0 || x > s.x1) continue; const h = s.h(x); if (h < 0.8) continue; const e = s.edge(x); out.push({ s, top: e, bot: e + h, h }); } return out; };
  L.inFace = (x, y, pad = 0) => { for (const f of L.face(x)) if (y >= f.top - pad && y <= f.bot + pad) return f; return null; };
  // Höhe über dem Talgrund (Summe aller Stufen, über deren Kante man steht) – für Größe/Perspektive
  L.lift = (x, y) => { let k = 0; for (const f of L.face(x)) if (y < f.top) k += f.h; return k; };
  // Bäche (dicht abgetastet) mit Breite
  L.STREAMS = D.streams.map((s) => { const pts = spline(s.pts, 8); return { pts, ctrl: s.pts, w: (t) => s.w0 + (s.w1 - s.w0) * t, toLake: !!s.toLake }; });
  // Brücken: wo ein Weg einen Bach kreuzt
  L.BRIDGES = [];
  for (const st of L.STREAMS) for (const r of L.ROADS) {
    for (let i = 0; i < st.pts.length - 1; i++) {
      const [ax, ay] = st.pts[i], [bx, by] = st.pts[i + 1];
      for (let k = 0; k < r.pts.length - 1; k++) {
        const [cx, cy] = r.pts[k], [dx, dy] = r.pts[k + 1];
        const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx); if (Math.abs(den) < 1e-6) continue;
        const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
          const x = ax + (bx - ax) * u, y = ay + (by - ay) * u, t = (i + u) / (st.pts.length - 1);
          if (!L.BRIDGES.some((b) => Math.hypot(b.x - x, b.y - y) < 12)) L.BRIDGES.push({ x: Math.round(x), y: Math.round(y), w: Math.round(st.w(t) + 6), road: r.id, ang: Math.atan2(dy - cy, dx - cx) });
        }
      }
    }
  }
  L.TREES = D.trees;
  L.LANTERNS = D.lanterns;
  L.FORESTS = D.forests || [];
  L.inForest = (x, y) => L.FORESTS.some((f) => x >= f.x0 && x <= f.x1 && y >= f.top(x) && y <= f.bottom(x));
  L.onStream = (x, y, pad = 2) => { for (const st of L.STREAMS) { const n = st.pts.length - 1; for (let i = 0; i < n; i++) { const [ax, ay] = st.pts[i], [bx, by] = st.pts[i + 1]; if (Math.abs(ay - y) > 14 && Math.abs(by - y) > 14) continue; if (distSeg(x, y, ax, ay, bx, by) < st.w(i / n) / 2 + pad) return true; } } return false; };
  L.depthScale = (y) => 0.72 + clamp((y - 370) / 170) * 0.55;
  L.PLOTS = makePlots(L);
  return L;
}

function makePlots(L) {
  const cands = [];
  const ok0 = (x, y, rad) => {
    if (x < 40 || x > 920 || y > 530 || y < L.horizon(x) + 18) return false;
    if (Math.hypot(x - L.PLAZA.x, (y - L.PLAZA.y) * 1.3) < 40) return false;
    // nicht auf einer Stirnseite, Grundfläche nicht über eine Kante hinweg
    for (const xx of [x - rad * 0.9, x - rad * 0.4, x, x + rad * 0.5, x + rad * 1.2]) {
      for (const f of L.face(xx)) { if (y > f.top - 6 && y - rad * 0.32 < f.bot + 4) return false; if (y <= f.top - 6 && y > f.top - 10) return false; }
    }
    if (L.inForest(x, y) || L.inForest(x, y - 20)) return false;
    for (const st of L.STREAMS) if (distPoly(x, y, st.pts) < rad * 0.8 + 6 || distPoly(x + rad * 0.5, y - 8, st.pts) < rad * 0.6) return false;
    for (const [tx, ty, ts] of L.TREES) if (Math.hypot(x - tx, (y - ty) * 1.5) < rad + ts * 0.25) return false;
    for (const r of L.ROADS) if (distPoly(x, y, r.pts) < rad * 0.45 + 4) return false;
    return true;
  };
  for (const road of L.ROADS) {
    const n = Math.round(30 * road.w);
    for (let i = 1; i <= n; i++) for (const side of [-1, 1]) {
      const p = roadPointAt(road.pts, i / (n + 1)); if (!p) continue;
      const s = L.depthScale(p.y + L.lift(p.x, p.y) * 0.5);
      for (const off of [30, 40]) {
        const o = (side < 0 ? off - 4 : off + 4) * s;
        cands.push({ x: Math.round(p.x - p.dy * o * side), y: Math.round(p.y + p.dx * o * side * 0.55 + (side > 0 ? 10 : -4) * s), road: road.id });
      }
    }
  }
  // freie Plätze zwischen den Wegen
  for (let y = 380; y < 530; y += 9) for (let x = 60; x < 910; x += 11) cands.push({ x, y, road: null });
  const dist = (c) => Math.hypot(c.x - L.PLAZA.x, (c.y - L.PLAZA.y) * 1.6) + (c.road ? 0 : 60);
  cands.sort((a, b) => dist(a) - dist(b));
  const plots = [];
  for (const c of cands) {
    if (plots.length >= 23) break;
    const id = plots.length + 1, size = PLOT_SIZES(id), s = L.depthScale(c.y + L.lift(c.x, c.y) * 0.5), rad = PLOT_RAD[size] * s;
    if (!ok0(c.x, c.y, rad)) continue;
    if (!plots.every((p) => Math.hypot((p.x - c.x) * 0.8, (p.y - c.y) * 1.6) > (p.rad + rad))) continue;
    plots.push({ id, x: c.x, y: c.y, s, size, rad, road: c.road || 'feld', shadow: 0 });
  }
  return plots;
}

// welche Gegend gehört zu welchem Dorf (Server legt es fest; ohne Angabe nach Dorfnummer)
export function landFor(village) {
  if (village && LAND_IDS.includes(village.landschaft)) return village.landschaft;
  const n = Number(village?.id) || 1;
  return LAND_IDS[(n - 1) % LAND_IDS.length];
}
