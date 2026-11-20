// Prototyp 3: Pixelart-Dorfansicht, großer Charakter vorne, Bauphasen, Filmeffekte.
export const W = 480, H = 270;

/* ---------- kleiner Pixel-Maler ---------- */
const colCache = new Map();
function C(hex, a = 255) {
  const k = hex + a;
  if (!colCache.has(k)) {
    const n = parseInt(hex.slice(1), 16);
    colCache.set(k, ((a << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0);
  }
  return colCache.get(k);
}
class Px {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = c; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, c);
    }
  }
  poly(pts, c) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
      const px = x + 0.5, py = y + 0.5; let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) this.set(x, y, c);
    }
  }
  line(x0, y0, x1, y1, c, t = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
    for (let s = 0; s <= n; s++) {
      const x = x0 + ((x1 - x0) * s) / n, y = y0 + ((y1 - y0) * s) / n;
      if (t === 1) this.set(x, y, c); else this.rect(Math.round(x - t / 2), Math.round(y - t / 2), t, t, c);
    }
  }
  outline(c) {
    const src = this.d.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (src[y * this.w + x] !== 0) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const xx = x + dx, yy = y + dy;
        return xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && src[yy * this.w + xx] !== 0;
      });
      if (n) this.d[y * this.w + x] = c;
    }
  }
  blit(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.d[y * src.w + x]; if (c) this.set(ox + x, oy + y, c); } }
  toCanvas(cv) { cv.width = this.w; cv.height = this.h; cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(this.d.buffer.slice(0)), this.w, this.h), 0, 0); return cv; }
}
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/* ---------- Palette (Tag/Abend) ---------- */
const SKY = {
  day: ['#6fa3c4', '#8fbccf', '#b7d3d4', '#dbe2cc', '#f1e3b9'],
  evening: ['#3b4a78', '#7a5f8a', '#c77a6a', '#ee9f63', '#f7c983'],
};
const P = {
  mtnFar: '#8aa3ad', mtnMid: '#6a8b84', forest: '#3d6849', forestD: '#2f5539',
  grass: '#6c9b48', grassD: '#58873c', grassDD: '#46702f', grassL: '#84b157', grassLL: '#a2c86c',
  dirt: '#a88a5c', dirtD: '#8c6f45', dirtL: '#c4a776',
  leafD: '#23462c', leaf: '#315e39', leafM: '#437844', leafL: '#5e9550', trunk: '#5a3e28', trunkD: '#3e2a1a',
  wood: '#8a6440', woodD: '#6b4b2e', woodDD: '#4e3520', woodL: '#a97f52',
  stone: '#8b8a80', stoneD: '#6d6c63', stoneL: '#a9a89c',
  thatch: '#c4a45f', thatchD: '#9e8143', thatchL: '#ddc27d',
  soil: '#6b4a2f', soilD: '#54391f', sprout: '#7fbf4f', rope: '#d8c9a0',
  door: '#3a2716', glow: '#ffd27a', flower: '#f3efe0', flowerY: '#f0d36a', flowerR: '#d9604a',
  outline: '#241a12',
};

/* ---------- Hintergrund (wird weichgezeichnet) ---------- */
export function drawBackground(cv, mode) {
  const px = new Px(W, H), r = rng(3);
  const sky = SKY[mode];
  for (let y = 0; y < 140; y++) {
    const f = (y / 140) * (sky.length - 1), i = Math.floor(f), fr = f - i;
    for (let x = 0; x < W; x++) px.set(x, y, C(fr * 16 > BAYER[y % 4][x % 4] ? sky[Math.min(i + 1, sky.length - 1)] : sky[i]));
  }
  const cloudC = mode === 'day' ? '#f7f2e4' : '#f3b98e';
  const cloud = (cx, cy, w) => { for (let x = -w; x <= w; x++) { const h = Math.round(Math.sqrt(1 - (x / w) ** 2) * 5); px.rect(cx + x, cy - h, 1, h + 3, C(cloudC)); } };
  cloud(90, 30, 30); cloud(118, 27, 16); cloud(330, 20, 38); cloud(420, 44, 18);
  const mtn = mode === 'day' ? [P.mtnFar, P.mtnMid] : ['#7b6a86', '#5d5a72'];
  for (let x = 0; x < W; x++) {
    const h1 = 78 + Math.sin(x * 0.021) * 12 + Math.sin(x * 0.008 + 1) * 14;
    px.rect(x, h1, 1, 140 - h1, C(mtn[0]));
    const h2 = 96 + Math.sin(x * 0.033 + 2) * 8 + Math.sin(x * 0.012) * 9;
    px.rect(x, h2, 1, 140 - h2, C(mtn[1]));
  }
  // ferner Wald aus Baumkronen
  for (let i = 0; i < 160; i++) {
    const x = r() * W, y = 112 + r() * 14, rad = 5 + r() * 7;
    px.ellipse(x, y, rad, rad * 0.9, C(r() < 0.5 ? P.forest : P.forestD));
    px.ellipse(x + rad * 0.3, y - rad * 0.3, rad * 0.5, rad * 0.4, C(P.leafM));
  }
  px.rect(0, 122, W, 18, C(P.forestD));
  return px.toCanvas(cv);
}

/* ---------- Mittelgrund: Gelände, Feld, Hütte im Bau ---------- */
function tree(px, cx, by, s) {
  px.rect(cx - 2, by - s, 4, s, C(P.trunk)); px.rect(cx + 1, by - s, 1, s, C(P.trunkD));
  const blob = (x0, y0, rad) => {
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
      const d = Math.hypot(x, y); if (d > rad + 0.3) continue;
      const l = (x - y) / (rad * 2);
      let c = P.leaf; if (d > rad - 0.9) c = P.leafD; else if (l > 0.35) c = P.leafL; else if (l > 0.05) c = P.leafM; else if (l < -0.45) c = P.leafD;
      px.set(x0 + x, y0 + y, C(c));
    }
  };
  blob(cx - s * 0.4, by - s - 2, Math.round(s * 0.5)); blob(cx + s * 0.4, by - s, Math.round(s * 0.46)); blob(cx, by - s * 1.5, Math.round(s * 0.55));
}

export function drawHouse(px, cx, by, stage) {
  const wl = cx - 34, wr = cx + 34, wh = 32, peak = by - wh - 28;
  // Grundstück
  px.ellipse(cx, by + 3, 48, 7, C(P.dirt));
  for (let i = 0; i < 40; i++) px.set(cx - 44 + ((i * 37) % 88), by + ((i * 13) % 7) - 1, C(P.dirtD));
  if (stage === 0) {
    const pts = [[wl - 6, by - 2], [wr + 6, by - 2], [wr + 10, by + 8], [wl - 10, by + 8]];
    pts.forEach(([x, y], i) => { const [x2, y2] = pts[(i + 1) % 4]; for (let s = 0; s <= 1; s += 0.03) px.set(x + (x2 - x) * s, y + (y2 - y) * s - 5, C(P.rope)); });
    pts.forEach(([x, y]) => { px.rect(x - 1, y - 7, 2, 8, C(P.woodD)); px.set(x - 1, y - 7, C(P.woodL)); });
    return;
  }
  // Holzstapel und Steine neben dem Bauplatz (bis fertig)
  if (stage < 10) {
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
      const x = wr + 14 + i * 7 + row * 3, y = by - 3 - row * 5;
      px.rect(x, y, 6, 5, C(P.wood)); px.rect(x, y, 6, 1, C(P.woodL)); px.ellipse(x + 6, y + 2.5, 1.5, 2.5, C(P.dirtL));
    }
    if (stage < 4) for (let i = 0; i < 6; i++) px.ellipse(wl - 14 + (i % 3) * 5, by - 1 - Math.floor(i / 3) * 3, 3, 2, C(i % 2 ? P.stone : P.stoneD));
  }
  // Fundament
  if (stage >= 2) for (let x = wl - 2; x < wr + 2; x += 6) { px.rect(x, by - 3, 6, 4, C((x / 6) % 2 ? P.stone : P.stoneD)); px.rect(x, by - 3, 6, 1, C(P.stoneL)); }
  // Wände (Bretter)
  const planksTo = stage >= 7 ? by - wh : stage >= 6 ? by - wh / 2 : by;
  for (let x = wl; x < wr; x++) {
    if (planksTo >= by) break;
    const c = x % 5 === 0 ? P.woodDD : x % 5 === 1 ? P.woodL : (x < cx ? P.woodD : P.wood);
    for (let y = planksTo; y < by - 3; y++) px.set(x, y, C(c));
  }
  if (stage >= 7) { // Tür- und Fensteröffnung
    px.rect(cx - 7, by - 22, 14, 19, C(stage >= 10 ? P.wood : P.door));
    if (stage >= 10) { px.rect(cx - 7, by - 22, 14, 1, C(P.woodDD)); for (let y = by - 21; y < by - 3; y += 4) px.rect(cx - 7, y, 14, 1, C(P.woodD)); px.set(cx + 4, by - 12, C(P.flowerY)); }
    px.rect(cx + 14, by - 24, 10, 8, C(stage >= 10 ? P.glow : P.door));
    if (stage >= 10) { px.rect(cx + 18, by - 24, 1, 8, C(P.woodDD)); px.rect(cx + 14, by - 21, 10, 1, C(P.woodDD)); }
  }
  // Pfosten
  if (stage >= 3) [wl, cx - 1, wr - 3].forEach((x) => { px.rect(x, by - wh - 2, 4, wh - 1, C(P.woodD)); px.rect(x + 2, by - wh - 2, 1, wh - 1, C(P.woodL)); });
  // Balken + Streben
  if (stage >= 4) {
    px.rect(wl - 3, by - wh - 4, wr - wl + 6, 4, C(P.woodD)); px.rect(wl - 3, by - wh - 4, wr - wl + 6, 1, C(P.woodL));
    if (stage < 7) { px.line(wl + 3, by - 5, cx - 2, by - wh, C(P.woodD), 2); px.line(wr - 3, by - 5, cx + 2, by - wh, C(P.woodD), 2); }
  }
  // Dachsparren
  if (stage >= 5) {
    for (let k = 0; k < 5; k++) {
      const off = k * 3;
      px.line(wl - 10, by - wh - 4, cx, peak + off * 0.2, C(k === 0 ? P.woodD : P.woodDD), 2);
      px.line(cx, peak + off * 0.2, wr + 10, by - wh - 4, C(k === 0 ? P.wood : P.woodDD), 2);
    }
  }
  // Stroh
  if (stage >= 8) {
    const top = stage >= 9 ? peak : by - wh - 4 - 12;
    for (let y = Math.round(top); y <= by - wh - 2; y++) {
      const t = (y - peak) / (by - wh - 4 - peak);
      const half = 6 + t * 40;
      for (let x = -half; x <= half; x++) {
        let c = (y - Math.round(peak)) % 4 === 0 ? P.thatchD : (x > half - 4 ? P.thatchL : (x < -half + 3 ? P.thatchD : (x < 0 ? P.thatch : P.thatchL)));
        if ((x * 7 + y * 3) % 11 === 0) c = P.thatchD;
        px.set(cx + x, y, C(c));
      }
    }
    for (let x = -46; x <= 46; x += 2) px.set(cx + x, by - wh - 1 + (x % 4 === 0 ? 1 : 0), C(P.thatchD));
  }
  // Gerüst während des Baus
  if (stage >= 5 && stage <= 9) {
    const sx = wr + 4;
    px.rect(sx, by - wh - 14, 2, wh + 12, C(P.woodL)); px.rect(sx + 10, by - wh - 14, 2, wh + 12, C(P.woodL));
    px.rect(sx - 2, by - wh + 2, 16, 2, C(P.wood)); px.rect(sx - 2, by - 14, 16, 2, C(P.wood));
    px.line(sx, by - 2, sx + 11, by - wh + 2, C(P.woodD));
  }
  // Fertig: Schornstein, Blumen
  if (stage >= 10) {
    px.rect(cx + 20, peak + 8, 7, 14, C(P.stoneD)); px.rect(cx + 20, peak + 8, 7, 2, C(P.stoneL));
    for (let i = 0; i < 6; i++) { px.set(wl + 4 + i * 3, by - 4, C(i % 2 ? P.flowerR : P.flowerY)); px.set(wl + 4 + i * 3, by - 3, C(P.grassDD)); }
  }
}

export function drawMid(cv, stage) {
  const px = new Px(W, H), r = rng(7);
  for (let y = 126; y < H; y++) for (let x = 0; x < W; x++) px.set(x, y, C(y < 134 ? P.grassD : P.grass));
  for (let i = 0; i < 3200; i++) px.set(r() * W, 128 + r() * (H - 128), C(r() < 0.5 ? P.grassD : P.grassL));
  for (let i = 0; i < 160; i++) { const x = r() * W, y = 136 + r() * 130; px.set(x, y, C(P.grassLL)); px.set(x - 1, y + 1, C(P.grassL)); px.set(x + 1, y + 1, C(P.grassL)); }
  for (let i = 0; i < 40; i++) px.set(r() * W, 140 + r() * 120, C(r() < 0.6 ? P.flower : P.flowerY));
  // Weg zur Hütte
  for (let y = 180; y < H; y++) {
    const cx = 340 - (y - 180) * 0.45 + Math.sin(y * 0.05) * 6, w = 7 + (y - 180) * 0.1;
    for (let x = Math.floor(cx - w); x < cx + w; x++) px.set(x, y, C(x < cx - w + 1.5 || x > cx + w - 1.5 ? P.dirtD : (r() < 0.12 ? P.dirtL : P.dirt)));
  }
  // Feld
  for (let row = 0; row < 4; row++) {
    const y = 168 + row * 8;
    px.rect(170, y, 90, 5, C(P.soil)); px.rect(170, y + 4, 90, 1, C(P.soilD));
    for (let x = 174; x < 258; x += 6) { px.set(x, y, C(P.sprout)); px.set(x, y - 1, C(P.sprout)); px.set(x - 1, y - 2, C(P.grassLL)); px.set(x + 1, y - 2, C(P.sprout)); }
  }
  // Baumschatten + Bäume
  [[452, 150, 22], [20, 140, 18], [130, 136, 12]].forEach(([x, y, s]) => { px.ellipse(x - 6, y + 2, s * 0.9, 3, C(P.grassDD)); });
  tree(px, 130, 136, 12); tree(px, 452, 150, 22);
  // Hausschatten (Licht von rechts oben -> nach links unten)
  if (stage >= 3) px.poly([[306 - 34, 176], [306 + 34, 176], [306 + 10, 184], [306 - 62, 184]], C(P.grassDD));
  drawHouse(px, 340, 176, stage);
  return px.toCanvas(cv);
}

/* ---------- Charakter (groß, 64×96) ---------- */
const CP = {
  skin: '#e6b48c', skinD: '#c48a64', skinDD: '#a06a4a', hair: '#4a3020', hairL: '#6e4a30', hairD: '#2e1d12',
  beard: '#553624', tunic: '#55703d', tunicD: '#3e5530', tunicL: '#6d8a4c', cloak: '#6b4a32', cloakD: '#4e3424', cloakL: '#86603f',
  belt: '#4a3020', buckle: '#d8b04a', pants: '#5d4c3b', pantsD: '#47392c', boot: '#3a2a1e', bootL: '#5a4230',
  scar: '#d98c86', eye: '#1e140c', pipe: '#7a4e2a', pipeD: '#55331a', ember: '#ff9b42', outline: '#26180f',
};
export function drawCharacter(opts = { scar: true }) {
  const px = new Px(64, 96), c = (k) => C(CP[k]);
  // hinteres Bein
  px.poly([[28, 62], [46, 62], [50, 67], [30, 68]], c('pantsD'));
  px.poly([[44, 64], [50, 64], [49, 84], [44, 84]], c('pantsD'));
  px.poly([[42, 83], [51, 83], [53, 88], [42, 88]], c('boot'));
  // Umhang hinten
  px.poly([[19, 33], [30, 31], [29, 70], [15, 68]], c('cloakD'));
  px.poly([[22, 33], [30, 31], [29, 66], [21, 64]], c('cloak'));
  // Oberkörper
  px.poly([[25, 35], [41, 34], [44, 58], [25, 60]], c('tunic'));
  px.poly([[25, 35], [31, 35], [30, 60], [25, 60]], c('tunicD'));
  px.poly([[38, 35], [41, 34], [44, 50], [41, 50]], c('tunicL'));
  px.rect(25, 55, 20, 3, c('belt')); px.rect(36, 55, 3, 3, c('buckle'));
  // Kapuze am Hals
  px.ellipse(29, 34, 7, 3, c('cloak')); px.ellipse(28, 34, 5, 2, c('cloakL'));
  // vorderes Bein (Oberschenkel waagrecht, Schienbein runter)
  px.poly([[26, 58], [45, 58], [56, 60], [56, 66], [27, 66]], c('pants'));
  px.poly([[27, 63], [56, 63], [56, 66], [27, 66]], c('pantsD'));
  px.poly([[50, 63], [57, 63], [56, 85], [51, 85]], c('pants'));
  px.poly([[50, 63], [52, 63], [52, 85], [51, 85]], c('pantsD'));
  px.poly([[48, 84], [57, 84], [61, 89], [61, 91], [48, 91]], c('boot'));
  px.rect(50, 84, 8, 1, c('bootL'));
  // Hals + Kopf
  px.rect(31, 28, 6, 7, c('skinD'));
  px.ellipse(35, 21, 9, 10, c('skin'));
  px.poly([[27, 20], [31, 30], [27, 28]], c('skinD'));
  px.ellipse(31, 22, 2, 3, c('skinD'));
  // Bart
  px.poly([[34, 26], [43, 25], [42, 31], [37, 33], [33, 30]], c('beard'));
  px.set(41, 27, c('skin')); px.set(40, 27, c('skin'));
  // Haare
  px.ellipse(33, 15, 10, 7, c('hair'));
  px.poly([[23, 14], [30, 12], [31, 27], [26, 30], [24, 24]], c('hair'));
  px.poly([[36, 9], [44, 14], [44, 17], [38, 14]], c('hair'));
  px.line(30, 10, 39, 11, c('hairL')); px.line(33, 9, 40, 13, c('hairL'));
  px.line(24, 17, 26, 27, c('hairD'));
  // Gesicht
  px.set(40, 20, c('eye')); px.set(40, 19, c('hairD')); px.set(41, 19, c('hairD'));
  px.set(44, 22, c('skinD')); px.set(44, 23, c('skinD'));
  // Arm: Ärmel oben, Unterarm frei (für Narbe), Hand an der Pfeife
  px.line(38, 37, 45, 49, c('tunicD'), 6);
  px.line(39, 37, 45, 47, c('tunic'), 4);
  px.line(45, 48, 47, 33, c('skin'), 5);
  px.line(44, 47, 46, 34, c('skinD'), 1);
  px.ellipse(47, 31, 3, 3, c('skin'));
  if (opts.scar) { px.line(44, 44, 49, 38, c('scar')); px.set(45, 43, c('skinDD')); }
  // Pfeife
  px.line(42, 28, 48, 30, c('pipe'));
  px.rect(48, 26, 3, 4, c('pipe')); px.rect(48, 29, 3, 1, c('pipeD'));
  px.set(49, 26, c('ember'));
  px.outline(c('outline'));
  return px;
}

/* ---------- Vordergrund: Bank, Charakter, große Gräser ---------- */
export const CHAR_POS = { x: 92, y: 146 };
export function drawFront(cv, opts) {
  const px = new Px(W, H);
  // Bank
  const bx = 78, by = 214;
  px.rect(bx, by, 100, 5, C(P.wood)); px.rect(bx, by, 100, 1, C(P.woodL)); px.rect(bx, by + 4, 100, 1, C(P.woodDD));
  [[bx + 8], [bx + 86]].forEach(([x]) => { px.rect(x, by + 5, 5, 20, C(P.woodD)); px.rect(x + 3, by + 5, 1, 20, C(P.woodDD)); });
  px.blit(drawCharacter(opts), CHAR_POS.x, CHAR_POS.y);
  return px.toCanvas(cv);
}

export function drawNear(cv) {
  const px = new Px(W, H), r = rng(21);
  for (let i = 0; i < 70; i++) {
    const x = r() * W; if (x > 110 && x < 400 && r() < 0.7) continue;
    const base = H - r() * 6, h = 10 + r() * 22, lean = r() * 8 - 4;
    for (let k = 0; k < h; k++) px.set(x + (lean * k) / h, base - k, C(k > h * 0.7 ? P.grassLL : (k > h * 0.3 ? P.grassL : P.grassD)));
  }
  [[18, 262], [460, 258], [440, 266]].forEach(([x, y]) => { px.ellipse(x, y, 3, 3, C(P.flowerR)); px.set(x, y, C(P.flowerY)); });
  return px.toCanvas(cv);
}

/* ---------- Animierte kleine Bewohner ---------- */
function villagerFrame(up) {
  const px = new Px(20, 28);
  px.rect(7, 22, 3, 5, C('#4b3b2c')); px.rect(11, 22, 3, 5, C('#3f3125'));
  px.rect(6, 12, 9, 11, C('#8a5a3c')); px.rect(6, 12, 3, 11, C('#6e452d'));
  px.ellipse(10.5, 8, 4, 4.5, C('#e2ad85')); px.rect(7, 3, 8, 3, C('#2e2018')); px.set(13, 8, C('#1e140c'));
  if (up) { px.line(12, 13, 14, 4, C('#e2ad85'), 2); px.line(14, 4, 15, 1, C('#5a3e28'), 2); px.rect(13, 0, 5, 3, C('#9aa0a6')); }
  else { px.line(12, 14, 16, 20, C('#e2ad85'), 2); px.line(16, 20, 18, 24, C('#5a3e28'), 2); px.rect(16, 24, 4, 3, C('#9aa0a6')); }
  px.outline(C('#26180f'));
  return px;
}
function chickenFrame(peck) {
  const px = new Px(10, 9);
  px.ellipse(4, 5, 3.5, 2.5, C('#f4f0e6')); px.ellipse(peck ? 7.5 : 7, peck ? 6 : 3, 1.8, 1.8, C('#f4f0e6'));
  px.set(peck ? 7 : 7, peck ? 4 : 1, C('#c8452f')); px.set(peck ? 9 : 8.5, peck ? 7 : 3, C('#e0b040'));
  px.set(3, 8, C('#e0b040')); px.set(5, 8, C('#e0b040'));
  px.outline(C('#26180f'));
  return px;
}
const toCv = (p) => p.toCanvas(document.createElement('canvas'));
let FRAMES = null;
export function drawAnim(cv, t, stage) {
  if (!FRAMES) FRAMES = { vUp: toCv(villagerFrame(true)), vDown: toCv(villagerFrame(false)), cA: toCv(chickenFrame(false)), cB: toCv(chickenFrame(true)) };
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // Bewohner hackt Holz (Schatten nach links unten)
  ctx.fillStyle = 'rgba(40,60,30,.45)'; ctx.fillRect(404, 197, 14, 2);
  ctx.drawImage(Math.floor(t / 450) % 2 ? FRAMES.vUp : FRAMES.vDown, 410, 171);
  ctx.fillStyle = '#6b4b2e'; ctx.fillRect(426, 192, 8, 5); ctx.fillStyle = '#c4a776'; ctx.fillRect(426, 192, 8, 1);
  // Hühner
  [[214, 205, 0], [238, 212, 700], [196, 214, 1500]].forEach(([x, y, o]) => {
    ctx.fillStyle = 'rgba(40,60,30,.4)'; ctx.fillRect(x - 1, y + 8, 9, 1);
    ctx.drawImage(Math.floor((t + o) / 600) % 3 === 0 ? FRAMES.cB : FRAMES.cA, x + Math.round(Math.sin((t + o) / 1500) * 3), y);
  });
  // Pfeifenrauch
  const sx = CHAR_POS.x + 49, sy = CHAR_POS.y + 25;
  for (let i = 0; i < 8; i++) {
    const ph = ((t / 1400) + i / 8) % 1;
    const x = sx + Math.sin(ph * 5 + i) * 2.5 + ph * 7, y = sy - ph * 34;
    ctx.fillStyle = `rgba(236,232,222,${(0.85 - ph * 0.8).toFixed(2)})`;
    ctx.fillRect(Math.round(x), Math.round(y), ph > 0.35 ? 2 : 1, ph > 0.35 ? 2 : 1);
  }
  // Blinzeln
  if (t % 4200 < 140) { ctx.fillStyle = CP.skin; ctx.fillRect(CHAR_POS.x + 40, CHAR_POS.y + 20, 1, 1); }
  // Rauch aus dem Schornstein (fertiges Haus)
  if (stage >= 10) for (let i = 0; i < 6; i++) {
    const ph = ((t / 2000) + i / 6) % 1;
    ctx.fillStyle = `rgba(230,226,216,${(0.7 - ph * 0.7).toFixed(2)})`;
    ctx.fillRect(Math.round(363 + ph * 10 + Math.sin(ph * 6) * 2), Math.round(108 - ph * 30), 3, 3);
  }
}

/* ---------- Licht, Bloom, Vignette, Abendstimmung ---------- */
export function drawGlow(cv, t, mode, stage) {
  const S = 3, w = cv.width = W * S, h = cv.height = H * S, c = cv.getContext('2d');
  const glow = (x, y, rad, col, a) => { const g = c.createRadialGradient(x * S, y * S, 0, x * S, y * S, rad * S); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect((x - rad) * S, (y - rad) * S, rad * 2 * S, rad * 2 * S); };
  if (mode === 'day') {
    glow(420, 0, 260, '255,236,190', 0.45);
    c.fillStyle = 'rgba(255,246,214,0.10)';
    [[380, 430, 220, 140], [455, 480, 330, 285]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a * S, 0); c.lineTo(b * S, 0); c.lineTo(d * S, h); c.lineTo(e * S, h); c.fill(); });
    // Staub im Licht
    for (let i = 0; i < 26; i++) {
      const ph = ((t / 9000) + i / 26) % 1;
      const x = 300 + ((i * 53) % 140) - ph * 60, y = 30 + ((i * 97) % 200) - ph * 20;
      c.fillStyle = `rgba(255,248,220,${(0.5 * Math.sin(ph * Math.PI)).toFixed(2)})`;
      c.fillRect(x * S, y * S, S, S);
    }
  } else {
    glow(60, 120, 240, '255,150,80', 0.30);
    for (let i = 0; i < 14; i++) { // Glühwürmchen
      const ph = ((t / 6000) + i / 14) % 1;
      const x = 40 + ((i * 71) % 420) + Math.sin(ph * 8 + i) * 6, y = 150 + ((i * 37) % 90) - Math.sin(ph * Math.PI) * 10;
      glow(x, y, 4, '220,255,140', 0.8 * Math.sin(ph * Math.PI));
    }
  }
  if (stage >= 10) glow(359, 156, mode === 'day' ? 16 : 34, '255,200,110', mode === 'day' ? 0.35 : 0.75);
  glow(CHAR_POS.x + 49, CHAR_POS.y + 26, mode === 'day' ? 5 : 12, '255,150,60', (mode === 'day' ? 0.5 : 0.9) + Math.sin(t / 170) * 0.15);
}
export function drawShade(cv, mode) {
  const w = cv.width = W * 2, h = cv.height = H * 2, c = cv.getContext('2d');
  if (mode === 'evening') { c.fillStyle = 'rgb(214,170,190)'; c.fillRect(0, 0, w, h); }
  else { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); }
  const g = c.createRadialGradient(w / 2, h * 0.55, h * 0.3, w / 2, h * 0.55, h * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, mode === 'evening' ? 'rgba(40,20,40,0.55)' : 'rgba(30,22,10,0.4)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
export function drawGrain(cv) {
  const w = cv.width = 240, h = cv.height = 135, c = cv.getContext('2d'), img = c.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  c.putImageData(img, 0, 0);
}
