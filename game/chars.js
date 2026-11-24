// Mossheart Figuren: EIN Bauplan pro Figur -> kleine Pixelfigur (läuft durchs Dorf) und großer Held (Dorfansicht).
// Beide Größen nutzen dieselben Farben aus dem Bauplan und dieselbe Lichtfunktion shade(), damit sie zusammenpassen.
import { clamp, mul, add, sc, hex, step, rng, makeNoise, N1, N4 } from './core.js?v=1';
import * as CORE from './core.js?v=1';
import { Sprite } from './world.js?v=6';

const C3 = (c) => (typeof c === 'string' ? hex(c) : c);
export function shade(base, nx, ny, nz, rimK = 1) {
  const LD = CORE.LDIR, d = step(Math.max(0, nx * LD[0] + ny * LD[1] + nz * LD[2]), 3);
  let c = mul(base, add(CORE.AMB, sc(CORE.LIGHT, d)));
  if (nx * Math.sign(LD[0] || 1) > 0.75) c = add(c, sc(mul(base, CORE.LIGHT), 0.35 * rimK));
  return c;
}
const flat = (base, k = 0.75) => mul(base, add(CORE.AMB, sc(CORE.LIGHT, k)));
export function toRGBA(sp) {
  const out = new Uint8ClampedArray(sp.w * sp.h * 4);
  for (let i = 0; i < sp.w * sp.h; i++) if (sp.a[i]) { out[i * 4] = clamp(sp.c[i * 3]) * 255; out[i * 4 + 1] = clamp(sp.c[i * 3 + 1]) * 255; out[i * 4 + 2] = clamp(sp.c[i * 3 + 2]) * 255; out[i * 4 + 3] = 255; }
  return out;
}
// farbige Kontur: dunkle Variante des Nachbarpixels (wie bei handgepixelten Figuren)
function outline(sp, k = 0.32) {
  const { w, h, a, c } = sp, add2 = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (a[i]) continue;
    let best = -1, bl = 9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx; if (!a[j]) continue; const l = c[j * 3] * 0.3 + c[j * 3 + 1] * 0.59 + c[j * 3 + 2] * 0.11; if (l < bl) { bl = l; best = j; } }
    if (best >= 0) add2.push([i, [c[best * 3] * k + 0.03, c[best * 3 + 1] * k + 0.03, c[best * 3 + 2] * k + 0.05]]);
  }
  for (const [i, col] of add2) { a[i] = 2; c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2]; }
}

/* ======================================================================
   Bauplan des eigenen Charakters (später aus der Charaktererstellung)
   ====================================================================== */
export const HERO_PLAN = {
  name: 'Waldläufer', beruf: 'Waldläufer',
  skin: '#d9a27a', hair: '#6b4528', hairStyle: 'zopf', beard: 'kurz',
  hat: null, cape: '#3e5a34', hoodDown: true, top: '#6b4a2e', vest: null, apron: null,
  belt: '#3a2618', legs: '#4a3e2c', boots: '#3a2a1e', trim: '#a8843e', robe: false,
  quiver: '#5e3a20', fletch: '#e8e0cc', prop: 'bogen', pipe: '#5e3a20',
};

/* ======================================================================
   Werkzeuge / Gegenstände in der Hand (H = Hand). Gezeichnet für Blick nach rechts / vorne.
   ====================================================================== */
const PROP_COL = {
  w: '#7a5232', W: '#4a3220', m: '#b4b8c0', M: '#5f6470', g: '#d8b24a', r: '#c9b070', p: '#e8dcc0', b: '#8a3a2a', f: '#9ab0c0',
  l: '#5e8a3a', y: '#ffd27a', o: '#ff9a42', k: '#2e2a2a', c: '#c8b898', v: '#7ab0b8', R: '#b84a4a', B: '#c88a4a', n: '#6a4a30', T: '#b05a3a', s: '#e8e4dc', u: '#a83a3a',
};
export const PROPS = {
  hammer: ['MMM', 'MmM', '.w.', '.H.', '.w.'],
  zange: ['m.m', '.m.', '.m.', '.H.', '.w.'],
  axt: ['.mw', 'mMw', '.mw', '..w', '..H', '..w'],
  heugabel: ['m.m.m', 'mmmmm', '..w..', '..w..', '..w..', '..H..', '..w..', '..w..'],
  bogen: ['.w.', 'w.p', 'w.p', 'H.p', 'w.p', 'w.p', '.w.'],
  speer: ['m', 'm', 'w', 'w', 'w', 'w', 'H', 'w', 'w', 'w'],
  schwert: ['.g.', '.H.', 'mgm', '.m.', '.m.', '.m.'],
  stab: ['W', 'w', 'w', 'w', 'w', 'w', 'H', 'w', 'w', 'w'],
  hirtenstab: ['.ww', 'w.w', 'w..', 'w..', 'w..', 'w..', 'H..', 'w..', 'w..'],
  gehstock: ['ww', 'w.', 'w.', 'H.', 'w.', 'w.', 'w.'],
  buch: ['bbb', 'bpb', 'Hbb'],
  schriftrolle: ['pp', 'pp', 'Hp'],
  korb: ['.rHr.', 'r...r', 'rrrrr', 'rlBlr', '.rrr.'],
  waesche: ['.rHr.', 'r...r', 'rssrr', 'rrsrr', '.rrr.'],
  sack: ['.c.', 'cHc', 'ccc', 'ccc', '.c.'],
  brot: ['.BB', 'BBB', 'HB.'],
  angel: ['.....w', '....w.', '...w..', '..w...', '.H....', 'w.....'],
  fisch: ['H.', 'f.', 'ff', 'f.'],
  kelle: ['.H.', '.w.', '.w.', 'mmm', '.m.'],
  laterne: ['.H.', '.k.', 'kyk', 'kok', '.k.'],
  krug: ['ss.', 'wwH', 'ww.'],
  laute: ['W...', '.w..', '..wH', '.BBB', 'BBkB', '.BB.'],
  schaufel: ['w', 'w', 'H', 'w', 'w', 'm', 'mmm', '.m.'],
  spitzhacke: ['.mmm.', 'm.w.m', '..w..', '..H..', '..w..'],
  saege: ['wH.', 'mmm', 'mmm', 'Mm.'],
  kraeuter: ['l.l', 'lll', '.l.', '.H.'],
  trank: ['.k.', '.v.', 'vRv', 'HRv'],
  netz: ['r.r.r', '.r.r.', 'r.r.r', '..H..'],
  schere: ['m.m', '.m.', '.H.'],
  messer: ['.H.', 'mgm', '.m.', '.m.'],
  eimer: ['.k.', 'kHk', 'MmM', 'MmM', 'MMM'],
  falke: ['.nk', 'nnn', '.H.'],
  beutel: ['.k.', 'gHg', 'ggg'],
  kaefig: ['.H.', 'kkk', 'knk', 'kkk'],
  seil: ['.rr.', 'r..r', 'rHrr', '.rr.'],
  kerze: ['.y.', '.s.', '.s.', '.H.'],
  topf: ['.TTT.', 'TBBBT', 'HBBBT', '.TTT.'],
  rad: ['.www.', 'w.w.w', 'wwHww', 'w.w.w', '.www.'],
  beil: ['mmw', 'mmH'],
  honig: ['.k.', 'ggg', 'gHg'],
  buerste: ['.H.', 'www', 'rrr'],
  ruder: ['.w.', '.H.', '.w.', '.w.', 'WWW', 'WWW', '.W.'],
  pfeile: ['s.u', 'w.w', 'wHw', '.w.'],
  garn: ['.uu.', 'uHuu', '.uu.'],
  fackel: ['.y.', 'yoy', '.W.', '.w.', '.H.', '.w.'],
};
function drawProp(sp, name, hx, hy, skin) {
  const t = PROPS[name]; if (!t) return;
  let ry = 0, rx = 0; t.forEach((row, y) => { const i = row.indexOf('H'); if (i >= 0) { ry = y; rx = i; } });
  t.forEach((row, y) => [...row].forEach((ch, x) => {
    const X = hx + x - rx, Y = hy + y - ry;
    if (ch === 'H') sp.set(X, Y, shade(C3(skin), 0.3, -0.3, 0.9));
    else if (PROP_COL[ch]) sp.set(X, Y, ch === 'y' || ch === 'o' ? hex(PROP_COL[ch]) : shade(hex(PROP_COL[ch]), (x - rx) * 0.4, -0.3, 0.85));
  }));
}

/* ======================================================================
   Kleine Figur: 14×20 Pixel, Richtungen down/up/right/left, Laufen 4 Bilder, Stehen (Atmen) 2 Bilder
   ====================================================================== */
export const SW = 14, SH = 20, FOOT = 17;
export const DIRS = ['down', 'up', 'right', 'left'];
export function smallSprite(plan, dir, frame, mode = 'walk') {
  const sp = new Sprite(SW, SH, 0, 0), side = dir === 'right' || dir === 'left', back = dir === 'up';
  const ub = mode === 'walk' ? (frame % 2 ? -1 : 0) : (frame ? -1 : 0);
  const K = {}; for (const k of ['skin', 'hair', 'cape', 'top', 'vest', 'apron', 'belt', 'legs', 'boots', 'trim', 'quiver', 'fletch', 'hatColor']) K[k] = plan[k] ? C3(plan[k]) : null;
  K.beard = plan.beardColor ? C3(plan.beardColor) : K.hair;
  const cx = 7, hw = side ? 3.5 : 4.5;
  const P = (x, y, c, nxOff = 0) => { if (!c) return; const nx = clamp((x + 0.5 - cx) / hw + nxOff, -1, 1); sp.set(x, y, shade(c, nx, -0.25, Math.sqrt(1 - nx * nx) * 0.95)); };
  const R = (x0, x1, y0, y1, c, o) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P(x, y, c, o); };
  const hy = ub; // Kopf/Oberkörper-Versatz
  const style = plan.hairStyle || 'kurz', hat = plan.hat;
  const hatC = K.hatColor || K.cape || hex('#5a4a3a');

  // ---------- Beine ----------
  const legs = () => {
    if (!side) {
      let lb = FOOT, rb = FOOT;
      if (mode === 'walk') { if (frame === 0) rb = FOOT - 1; if (frame === 2) lb = FOOT - 1; }
      for (const [x0, bot] of [[4, lb], [8, rb]]) for (let y = 14 + ub; y <= bot; y++) R(x0, x0 + 1, y, y, y >= bot - 1 ? K.boots : (plan.robe ? null : K.legs));
    } else {
      // Scherenschritt
      const pos = mode !== 'walk' ? [[5, 0], [7, 0]] : frame === 0 ? [[4, 0], [8, 0]] : frame === 2 ? [[8, 0], [4, 0]] : [[6, -1], [6, 0]];
      pos.forEach(([x0, lift], i) => { const dark = i === 0 ? 0.8 : 1; for (let y = 14 + ub; y <= FOOT + lift; y++) { const c = y >= FOOT + lift - 1 ? K.boots : (plan.robe ? null : K.legs); if (c) R(x0, x0 + 1, y, y, sc(c, dark)); } P(x0 + 2, FOOT + lift, sc(K.boots, dark)); });
    }
  };
  // ---------- Rumpf ----------
  const torso = () => {
    const x0 = side ? 5 : 4, x1 = side ? 8 : 9, bot = plan.robe ? 16 : 13;
    R(x0, x1, 9 + hy, bot, K.top);
    if (plan.robe) R(x0 - 1, x1 + 1, 15, 16, K.top);
    if (K.belt) R(x0, x1, 12 + hy, 12 + hy, K.belt);
    if (K.vest && !back) { if (side) R(5, 8, 9 + hy, 11 + hy, K.vest); else { R(4, 4, 9 + hy, 12 + hy, K.vest); R(9, 9, 9 + hy, 12 + hy, K.vest); R(5, 8, 10 + hy, 11 + hy, K.vest); } }
    if (back && K.vest) R(4, 9, 9 + hy, 11 + hy, K.vest);
    if (K.apron && !back) { if (side) R(8, 9, 10 + hy, 15, K.apron); else R(5, 8, 10 + hy, 15, K.apron); }
  };
  const sleeve = K.vest && plan.sleeves ? C3(plan.sleeves) : K.top;
  const arms = (swing) => {
    if (!side) {
      const lh = 13 + hy - (swing === 1 ? 1 : 0), rh = 13 + hy - (swing === 2 ? 1 : 0);
      R(3, 3, 9 + hy, lh - 1, sleeve); P(3, lh, K.skin);
      R(10, 10, 9 + hy, rh - 1, sleeve); P(10, rh, K.skin);
      return [[3, lh], [10, rh]];
    }
    const hx = mode !== 'walk' ? 7 : frame === 0 ? 8 : frame === 2 ? 5 : 6;
    R(6, 7, 9 + hy, 11 + hy, sleeve, 0.3);
    if (hx >= 7) { P(8, 12 + hy, sleeve, 0.3); } else if (hx <= 5) { P(5, 12 + hy, sleeve, 0.3); } else P(6, 12 + hy, sleeve, 0.3);
    P(hx, 13 + hy, K.skin, 0.3);
    return [[hx, 13 + hy]];
  };
  const capeBehind = () => {
    if (!K.cape) return;
    if (side) R(3, 4, 9 + hy, 15, sc(K.cape, 0.9));
    else if (!back) { R(2, 2, 10 + hy, 15, K.cape); R(11, 11, 10 + hy, 15, K.cape); }
  };
  const capeBack = () => { if (K.cape) { R(3, 10, 9 + hy, 15, K.cape); R(2, 11, 14, 15, K.cape); if (plan.trim) R(2, 11, 15, 15, C3(plan.trim)); } };
  const hoodDown = () => {
    if (!K.cape || !plan.hoodDown) return;
    if (back) R(4, 9, 7 + hy, 9 + hy, sc(K.cape, 0.85));
    else if (side) R(3, 6, 8 + hy, 9 + hy, sc(K.cape, 0.85));
    else { R(3, 4, 8 + hy, 9 + hy, K.cape); R(9, 10, 8 + hy, 9 + hy, K.cape); }
  };
  const quiverBack = () => { if (!K.quiver) return; for (let k = 0; k < 6; k++) { P(8 - Math.round(k * 0.5) + 1, 8 + hy + k, K.quiver); P(9 - Math.round(k * 0.5) + 1, 8 + hy + k, K.quiver); } P(10, 6 + hy, K.fletch); P(11, 7 + hy, K.fletch); P(9, 6 + hy, sc(K.fletch, 0.85)); };
  const quiverSide = () => { if (!K.quiver) return; R(3, 4, 8 + hy, 12 + hy, K.quiver); P(3, 7 + hy, K.fletch); P(2, 6 + hy, K.fletch); };
  const quiverFront = () => { if (!K.quiver) return; P(10, 7 + hy, K.fletch); P(11, 6 + hy, K.fletch); };

  // ---------- Kopf ----------
  const face = plan.face || 'rund';
  const skipF = (x, y, y0, y1, a, b) => {
    if (y === y0 && (x === a || x === b)) return true;
    if (y === y1) { if (face === 'kantig') return false; if (face === 'schmal') return x <= a + 1 || x >= b - 1; return x === a || x === b; }
    if (y === y1 - 1 && face === 'schmal') return x === a || x === b;
    return false;
  };
  const ears = () => {
    if (plan.race !== 'elf') return; const y0 = 2 + hy;
    if (side) { P(6, y0 + 4, K.skin); P(6, y0 + 3, K.skin); P(5, y0 + 2, K.skin); return; }
    for (const [a, o] of [[2, 1], [11, 12]]) { P(a, y0 + 4, K.skin); P(a, y0 + 3, K.skin); P(o, y0 + 2, K.skin); }
  };
  const head = () => {
    const y0 = 2 + hy, y1 = 8 + hy;
    P(6, 8 + hy + 1, K.skin); P(7, 8 + hy + 1, K.skin); // Hals
    if (!side) {
      for (let y = y0; y <= y1; y++) for (let x = 3; x <= 10; x++) { if (skipF(x, y, y0, y1, 3, 10)) continue; P(x, y, back ? K.hair || K.skin : K.skin); }
      if (back && (style === 'glatze' || !K.hair)) for (let y = y0; y <= y1; y++) for (let x = 3; x <= 10; x++) { if (skipF(x, y, y0, y1, 3, 10)) continue; P(x, y, K.skin); }
      if (!back) { sp.set(5, 6 + hy, [0.1, 0.08, 0.08]); sp.set(8, 6 + hy, [0.1, 0.08, 0.08]); P(4, 7 + hy, sc(K.skin, 1.08)); P(9, 7 + hy, sc(K.skin, 1.08)); }
    } else {
      for (let y = y0; y <= y1; y++) for (let x = 4; x <= 10; x++) { if (skipF(x, y, y0, y1, 4, 10)) continue; P(x, y, K.skin); }
      P(11, 6 + hy, K.skin); // Nase
      sp.set(9, 6 + hy, [0.1, 0.08, 0.08]);
    }
  };
  const hair = () => {
    const H = K.hair; if (!H) return; const y0 = 2 + hy;
    if (style === 'glatze') { if (side) R(4, 5, y0 + 3, y0 + 4, H); else if (!back) { P(3, y0 + 3, H); P(10, y0 + 3, H); P(3, y0 + 4, H); P(10, y0 + 4, H); } else R(3, 10, y0 + 3, y0 + 5, H); return; }
    if (back) {
      if (style === 'lang' || style === 'wild') R(3, 10, y0 + 6, y0 + 9, H);
      if (style === 'locken') { P(3, y0 + 6, H); P(10, y0 + 6, H); P(5, y0 - 1, H); P(8, y0 - 1, H); }
      if (style === 'zopf') { R(6, 7, y0 + 7, y0 + 10, H); P(6, y0 + 11, H); }
      if (style === 'dutt') R(5, 8, y0 - 2, y0 - 1, H);
      if (style === 'wild') { P(4, y0 - 1, H); P(7, y0 - 1, H); P(9, y0 - 1, H); }
      return;
    }
    if (!side) {
      R(4, 9, y0, y0, H); R(3, 10, y0 + 1, y0 + 1, H);
      P(4, y0 + 2, H); P(5, y0 + 2, H); P(8, y0 + 2, H); P(9, y0 + 2, H); P(3, y0 + 2, H); P(10, y0 + 2, H);
      const sideBot = { kurz: y0 + 3, zopf: y0 + 4, dutt: y0 + 3, lang: y0 + 9, wild: y0 + 9, locken: y0 + 4 }[style] ?? y0 + 3;
      if (style === 'locken') { P(4, y0 - 1, H); P(6, y0 - 1, H); P(9, y0 - 1, H); P(2, y0 + 3, H); P(11, y0 + 3, H); }
      R(3, 3, y0 + 2, sideBot, H); R(10, 10, y0 + 2, sideBot, H);
      if (style === 'dutt') R(5, 8, y0 - 2, y0 - 1, H);
      if (style === 'wild') { P(4, y0 - 1, H); P(7, y0 - 1, H); P(9, y0 - 1, H); }
      if (style === 'zopf') { P(11, y0 + 5, H); P(11, y0 + 6, H); P(11, y0 + 7, sc(H, 0.9)); }
    } else {
      R(5, 9, y0, y0, H); R(4, 10, y0 + 1, y0 + 1, H); P(10, y0 + 2, H);
      const bot = { kurz: y0 + 4, zopf: y0 + 5, dutt: y0 + 4, lang: y0 + 9, wild: y0 + 9, locken: y0 + 5 }[style] ?? y0 + 4;
      if (style === 'locken') { P(5, y0 - 1, H); P(8, y0 - 1, H); P(3, y0 + 3, H); }
      R(4, 6, y0 + 2, bot, H); P(7, y0 + 2, H);
      if (style === 'zopf') { P(3, y0 + 5, H); P(3, y0 + 6, H); P(3, y0 + 7, H); P(3, y0 + 8, sc(H, 0.9)); }
      if (style === 'dutt') R(4, 6, y0 - 1, y0 - 1, H);
      if (style === 'wild') { P(5, y0 - 1, H); P(8, y0 - 1, H); }
    }
  };
  const beard = () => {
    const b = plan.beard; if (!b || back) return; const y = 7 + hy, B = K.beard;
    if (b === 'stoppel') { if (side) { P(8, y, sc(K.skin, 0.8)); P(10, y + 1, sc(K.skin, 0.8)); } else for (let x = 4; x <= 9; x += 2) P(x, y + 1, sc(K.skin, 0.8)); return; }
    if (b === 'schnurr') { if (side) R(9, 11, y, y, B); else R(5, 8, y, y, B); return; }
    const bot = b === 'lang' || b === 'zopfbart' ? y + 4 : y + 1;
    const longB = b === 'lang' || b === 'zopfbart';
    if (side) { R(8, 10, y, Math.min(bot, y + 2), B); if (longB) R(8, 9, y + 3, bot, B); P(7, y, B); }
    else { R(4, 9, y, y + 1, B); if (longB) R(5, 8, y + 2, bot, B); if (b === 'zopfbart') { P(6, bot + 1, B); P(7, bot + 1, C3('#b88a3e')); } P(3, y - 1, B); P(10, y - 1, B); sp.set(5, y, sc(B, 0.6)); }
  };
  const hatDraw = () => {
    if (!hat) return; const y0 = 2 + hy, c = hatC;
    if (hat === 'kapuze') {
      if (back) { R(3, 10, y0 - 1, y0 + 7, c); R(2, 11, y0 + 1, y0 + 7, c); }
      else if (side) { R(4, 10, y0 - 1, y0 + 1, c); R(3, 7, y0 + 2, y0 + 7, c); P(8, y0 + 2, c); P(2, y0 + 4, c); }
      else { R(4, 9, y0 - 1, y0 - 1, c); R(3, 10, y0, y0 + 1, c); R(2, 3, y0 + 1, y0 + 7, c); R(10, 11, y0 + 1, y0 + 7, c); P(4, y0 + 2, sc(c, 0.7)); P(9, y0 + 2, sc(c, 0.7)); }
      return;
    }
    if (hat === 'hut') { if (side) { R(5, 9, y0 - 2, y0 - 1, c); R(3, 12, y0, y0, c); } else { R(4, 9, y0 - 2, y0 - 1, c); R(1, 12, y0, y0, c); R(4, 9, y0 - 1, y0 - 1, sc(c, 0.75)); } return; }
    if (hat === 'kappe') { if (side) { R(4, 10, y0 - 1, y0, c); P(11, y0 + 1, c); } else { R(4, 9, y0 - 1, y0 - 1, c); R(3, 10, y0, y0, c); } return; }
    if (hat === 'helm') { const m = hex('#9aa0aa'); if (side) { R(5, 9, y0 - 1, y0 - 1, m); R(4, 10, y0, y0 + 2, m); P(10, y0 + 3, m); P(10, y0 + 4, m); } else { R(4, 9, y0 - 1, y0 - 1, m); R(3, 10, y0, y0 + 2, m); if (!back) { P(6, y0 + 3, m); P(7, y0 + 3, m); } else R(3, 10, y0 + 3, y0 + 4, m); } return; }
    if (hat === 'haube') { const w = c; if (back) R(2, 11, y0 - 1, y0 + 7, w); else if (side) { R(4, 9, y0 - 1, y0 + 1, w); R(3, 6, y0 + 2, y0 + 7, w); } else { R(3, 10, y0 - 1, y0 + 1, w); R(2, 3, y0 + 1, y0 + 6, w); R(10, 11, y0 + 1, y0 + 6, w); } return; }
    if (hat === 'kopftuch') { if (back) { R(3, 10, y0 - 1, y0 + 4, c); R(6, 7, y0 + 5, y0 + 6, c); } else if (side) { R(4, 10, y0 - 1, y0, c); R(4, 6, y0 + 1, y0 + 4, c); P(3, y0 + 4, c); P(3, y0 + 5, c); } else { R(4, 9, y0 - 1, y0 - 1, c); R(3, 10, y0, y0 + 1, c); P(3, y0 + 2, c); P(10, y0 + 2, c); } return; }
    if (hat === 'barett') { if (side) { R(3, 10, y0 - 1, y0, c); P(3, y0 + 1, c); } else { R(2, 9, y0 - 1, y0, c); P(9, y0 - 2, c); } return; }
    if (hat === 'kochmuetze') { const w = c; R(4, 9, y0 - 2, y0 - 2, w); R(3, 10, y0 - 1, y0, w); R(4, 9, y0 + 1, y0 + 1, sc(w, 0.85)); return; }
    if (hat === 'fellmuetze') { for (let y = y0 - 1; y <= y0 + 1; y++) for (let x = 3; x <= 10; x++) P(x, y, sc(c, ((x + y) % 2) ? 1 : 0.85)); if (!side && !back) { P(3, y0 + 2, c); P(10, y0 + 2, c); P(3, y0 + 3, c); P(10, y0 + 3, c); } return; }
    if (hat === 'stirnreif') { const g = hex('#d8b24a'); if (side) R(4, 10, y0 + 2, y0 + 2, g); else R(3, 10, y0 + 2, y0 + 2, g); }
  };

  // ---------- Reihenfolge je Richtung ----------
  const swing = mode === 'walk' ? (frame === 0 ? 1 : frame === 2 ? 2 : 0) : 0;
  if (back) {
    if (plan.prop) drawProp(sp, plan.prop, 10, 13 + hy, plan.skin);
    legs(); torso(); arms(swing); capeBack(); hoodDown(); quiverBack(); head(); hair(); ears(); hatDraw();
  } else if (side) {
    capeBehind(); legs(); torso(); quiverSide(); hoodDown(); head(); hair(); ears(); beard(); hatDraw();
    const [[hx, hy2]] = arms(swing); if (plan.prop) drawProp(sp, plan.prop, hx, hy2, plan.skin);
  } else {
    capeBehind(); legs(); torso(); const hands = arms(swing);
    if (plan.prop) drawProp(sp, plan.prop, hands[0][0], hands[0][1], plan.skin);
    quiverFront(); hoodDown(); head(); hair(); ears(); beard(); hatDraw();
  }
  if (plan.race === 'zwerg' || plan.race === 'halbling') {
    for (let y = 15; y >= 2; y--) for (let x = 0; x < SW; x++) { const i = y * SW + x, j = (y - 2) * SW + x; sp.a[i] = sp.a[j]; sp.c[i * 3] = sp.c[j * 3]; sp.c[i * 3 + 1] = sp.c[j * 3 + 1]; sp.c[i * 3 + 2] = sp.c[j * 3 + 2]; }
    for (let i = 0; i < SW * 2; i++) sp.a[i] = 0;
  }
  outline(sp);
  const data = toRGBA(sp);
  if (dir === 'left') { // spiegeln
    const m = new Uint8ClampedArray(data.length);
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) m.set(data.subarray((y * SW + x) * 4, (y * SW + x) * 4 + 4), (y * SW + (SW - 1 - x)) * 4);
    return m;
  }
  return data;
}
// komplettes Blatt: Zeilen = Richtungen (down, up, right, left), Spalten = Laufen 0–3, Stehen 0–1
export function sheetData(plan) {
  const cols = 6, out = new Uint8ClampedArray(SW * cols * SH * 4 * 4);
  DIRS.forEach((d, r) => { for (let c = 0; c < cols; c++) { const data = c < 4 ? smallSprite(plan, d, c, 'walk') : smallSprite(plan, d, c - 4, 'idle'); for (let y = 0; y < SH; y++) out.set(data.subarray(y * SW * 4, (y + 1) * SW * 4), ((r * SH + y) * SW * cols + c * SW) * 4); } });
  return { w: SW * cols, h: SH * 4, data: out };
}

export { HERO_W, HERO_H, heroSprite } from './hero.js?v=1';

/* ======================================================================
   Charaktererstellung: Auswahl -> Bauplan; Portrait (Vorderansicht) für Erstellung und spätere Gespräche
   ====================================================================== */
export const RACES = {
  mensch: { name: 'Mensch', desc: 'Anpassungsfähig, kommt mit allen gut aus.', neigung: 'Ansehen +, lernt Berufe schneller' },
  elf: { name: 'Elf', desc: 'Schlank, spitze Ohren, scharfe Augen.', neigung: 'Bogen und Wahrnehmung +, Fremde sind anfangs zurückhaltend' },
  zwerg: { name: 'Zwerg', desc: 'Klein, kräftig, stolz auf seinen Bart.', neigung: 'Handwerk, Bergbau und Ausdauer +' },
  halbling: { name: 'Halbling', desc: 'Klein, flink, gesellig – und barfuß.', neigung: 'Glück und Geselligkeit +, Sympathie wächst schneller' },
};
export const FACES = { kantig: 'Kantig', rund: 'Weich', schmal: 'Schmal' };
export const SKINS = ['#f4d4b0', '#f0c8a0', '#e4b48c', '#d49a72', '#b8805a', '#8f5e3c', '#6a4028', '#4a2c1c'];
export const HAIRS = { schwarz: '#2a2018', dunkel: '#3d2a1c', braun: '#6b4528', kupfer: '#8a4a2a', rot: '#a8482a', blond: '#c8a860', hellblond: '#e4d8a4', asch: '#a89a80', grau: '#8e8c88', weiss: '#dcd8d0' };
export const HAIR_STYLES = { kurz: 'Kurz', lang: 'Lang', zopf: 'Zopf', dutt: 'Dutt', locken: 'Locken', wild: 'Wild', glatze: 'Glatze' };
export const BEARDS = { keiner: 'Kein Bart', stoppel: 'Stoppeln', kurz: 'Kurz', lang: 'Lang', schnurr: 'Schnurrbart', zopfbart: 'Zopfbart' };
export const EYES = { braun: '#5a3a22', hasel: '#7a5a2a', gruen: '#4a7a3a', blau: '#3a6aa8', grau: '#7a8088', bernstein: '#c08a2a' };
export const CLOAKS = { wald: '#3e5a34', nacht: '#2a3a5a', wein: '#6a2a2a', erde: '#5a4430', stein: '#4a4a4e', ocker: '#8a6a2a' };
export const DEFAULT_LOOK = { race: 'mensch', face: 'kantig', skin: 3, hair: 'braun', hairStyle: 'zopf', beard: 'kurz', eyes: 'braun', cloak: 'wald' };
export function randomLook() {
  const pick = (o) => { const k = Array.isArray(o) ? o.map((_, i) => i) : Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
  const race = pick(RACES);
  return { race, face: pick(FACES), skin: pick(SKINS), hair: pick(HAIRS), hairStyle: pick(HAIR_STYLES), beard: race === 'elf' ? 'keiner' : pick(BEARDS), eyes: pick(EYES), cloak: pick(CLOAKS) };
}
export function planFromLook(look = DEFAULT_LOOK, name = 'Du') {
  const l = { ...DEFAULT_LOOK, ...look }, skin = SKINS[l.skin] || SKINS[3];
  return {
    ...HERO_PLAN, name, beruf: RACES[l.race]?.name || 'Mensch', race: l.race, face: l.face, eyes: EYES[l.eyes], herkunft: l.herkunft || 'waldlaeufer',
    skin, hair: HAIRS[l.hair], hairStyle: l.hairStyle, beard: l.beard === 'keiner' ? null : l.beard, cape: CLOAKS[l.cloak],
    boots: l.race === 'halbling' ? skin : HERO_PLAN.boots,
  };
}
export const PW = 48, PH = 48;
export function portraitSprite(plan) {
  const L = new Sprite(PW, PH, 0, 0), race = plan.race || 'mensch', face = plan.face || 'rund';
  const skin = C3(plan.skin), hair = plan.hair ? C3(plan.hair) : null, beardC = C3(plan.beardColor || plan.hair || '#3d2a1c'), cape = C3(plan.cape || '#3e5a34'), eye = C3(plan.eyes || '#5a3a22');
  const style = plan.hairStyle || 'kurz', beard = plan.beard;
  let rx = { kantig: 11, rund: 11.5, schmal: 9.5 }[face], ry = { kantig: 12.5, rund: 12, schmal: 13.5 }[face];
  if (race === 'elf') { rx -= 0.8; ry += 0.6; } if (race === 'zwerg') { rx += 1.6; ry -= 1; } if (race === 'halbling') { rx += 0.6; ry -= 1; }
  const cx = 24, cy = 21 + (race === 'zwerg' || race === 'halbling' ? 1 : 0);
  const jaw = (dy) => face === 'kantig' ? Math.sqrt(Math.max(0, 1 - dy ** 6)) * 0.98 : face === 'schmal' ? Math.sqrt(Math.max(0, 1 - dy * dy)) * (1 - 0.32 * dy) : Math.sqrt(Math.max(0, 1 - dy * dy));
  const inHead = (x, y) => { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dy < -1 || dy > 1) return false; return dy < 0.15 ? dx * dx + dy * dy <= 1 : Math.abs(dx) <= jaw(dy); };
  const S = (c, x, y) => { const dx = (x + 0.5 - cx) / (rx + 2), dy = (y + 0.5 - cy) / (ry + 2); return shade(c, dx, dy * 0.7 - 0.1, Math.sqrt(Math.max(0.05, 1 - dx * dx - dy * dy)) + 0.15); };
  // langes Haar hinter dem Kopf
  if (hair && (style === 'lang' || style === 'wild' || style === 'locken')) {
    const bot = style === 'lang' ? 44 : style === 'wild' ? 36 : 31;
    for (let y = cy - ry - 2; y <= bot; y++) for (let x = cx - rx - 3; x <= cx + rx + 3; x++) { const t = (y - cy) / (bot - cy); if (y <= cy && ((x - cx) / (rx + 3)) ** 2 + ((y - cy) / (ry + 2)) ** 2 > 1) continue; if (y > cy && Math.abs(x - cx) > rx + 3 - t * 2 - (y > bot - 3 ? (y - bot + 3) * 1.5 : 0)) continue; L.set(x, y, sc(S(hair, x, y), 0.75 + N4.noise(x * 0.9, y * 0.25) * 0.4)); }
  }
  // Schultern / Umhang
  for (let y = 35; y < PH; y++) { const half = 15 + (y - 35) * 0.75 + (race === 'zwerg' ? 2 : 0); for (let x = Math.round(cx - half); x <= cx + half; x++) { const nx = (x - cx) / half; let c = shade(cape, nx * 0.9, -0.2, Math.sqrt(Math.max(0, 1 - nx * nx * 0.8))); if (Math.abs(x - cx) < 6 - (y - 35) * 0.3 && y > 38) c = shade(C3(plan.top || '#6b4a2e'), nx, 0, 0.9); L.set(x, y, c); } }
  for (let x = cx - 13; x <= cx + 13; x++) for (let y = 33; y <= 37; y++) if (Math.abs(x - cx) > 4 || y > 36) L.set(x, y, sc(shade(cape, (x - cx) / 14, -0.6, 0.6), 0.85 + N4.noise(x * 0.5, y) * 0.2));
  L.set(cx - 1, 38, flat(C3(plan.trim || '#a8843e'), 1)); L.set(cx, 38, flat(C3(plan.trim || '#a8843e'), 1));
  // Hals
  for (let y = cy + ry - 4; y <= 36; y++) for (let x = cx - 4; x <= cx + 3; x++) L.set(x, y, sc(shade(skin, (x - cx) / 5, 0.3, 0.8), 0.85));
  // Ohren
  if (race === 'elf') for (const sgn of [-1, 1]) for (let k = 0; k < 9; k++) for (let w = 0; w < 3 - k / 4; w++) L.set(cx + sgn * (rx - 1 + k * 0.55 + w * 0.3), cy + 2 - k + w, shade(skin, sgn * 0.7, -0.2, 0.6));
  else for (const sgn of [-1, 1]) for (let y = -3; y <= 3; y++) for (let x = 0; x <= 2; x++) if ((x / 2.4) ** 2 + (y / 3.4) ** 2 < 1) L.set(cx + sgn * (rx + x - 0.5), cy + 1 + y, shade(skin, sgn * 0.8, y / 4, 0.5));
  // Gesicht
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (inHead(x, y)) L.set(x, y, S(skin, x, y));
  const ey = cy + (face === 'schmal' ? 0 : 1), ex = face === 'schmal' ? 4 : 4.5, dark = [0.12, 0.09, 0.08], white = shade(hex('#ece6dc'), 0, 0, 1);
  for (const sgn of [-1, 1]) {
    const x0 = Math.round(cx + sgn * ex - (sgn < 0 ? 1 : 0));
    L.set(x0 - 1, ey - 1, dark); L.set(x0, ey - 1, dark); L.set(x0 + 1, ey - 1, dark);
    L.set(x0 - sgn, ey, white); L.set(x0, ey, eye); L.set(x0 + sgn, ey, sc(eye, 0.6));
    if (race === 'elf') L.set(x0 + sgn * 2, ey - 1, dark);
    // Augenbrauen je Gesicht
    const bc = hair ? sc(hair, 0.7) : sc(skin, 0.6), by = ey - 3;
    if (face === 'kantig') for (let k = -1; k <= 2; k++) { L.set(x0 + sgn * k - (sgn < 0 ? 0 : 0), by, bc); if (k > -1) L.set(x0 + sgn * k, by - 1, bc); }
    else if (face === 'rund') { L.set(x0 - 1, by, bc); L.set(x0, by - 1, bc); L.set(x0 + 1, by, bc); }
    else for (let k = -1; k <= 2; k++) L.set(x0 + sgn * k, by - (k > 0 ? 1 : 0) * (sgn > 0 ? 1 : 1), bc);
  }
  // Nase
  const nb = ey + (race === 'zwerg' ? 5 : 4), nside = Math.sign(CORE.LDIR[0] || 1) > 0 ? -1 : 1;
  for (let y = ey + 1; y <= nb; y++) L.set(cx + nside, y, sc(S(skin, cx, y), 0.85));
  if (race === 'zwerg') { for (let x = -1; x <= 1; x++) L.set(cx + x, nb, sc(S(skin, cx, nb), 1.08)); L.set(cx + nside * 2, nb, sc(S(skin, cx, nb), 0.8)); }
  L.set(cx - 1, nb + 1, sc(S(skin, cx, nb), 0.7)); L.set(cx + 1, nb + 1, sc(S(skin, cx, nb), 0.7));
  if (race === 'halbling') { L.set(cx - 6, ey + 3, sc(S(skin, cx - 6, ey + 3), 1.12)); L.set(cx + 6, ey + 3, sc(S(skin, cx + 6, ey + 3), 1.12)); }
  // Mund
  const my = nb + 3, mw = face === 'schmal' ? 2 : 3;
  for (let x = -mw; x <= mw - 1; x++) L.set(cx + x, my + (face === 'rund' && Math.abs(x + 0.5) > mw - 1 ? -1 : 0), sc(S(skin, cx, my), 0.62));
  for (let x = -mw + 1; x <= mw - 2; x++) L.set(cx + x, my + 1, sc(S(skin, cx, my), 1.06));
  // Bart
  if (beard && beard !== 'keiner') {
    if (beard === 'stoppel') { for (let y = my - 2; y < cy + ry; y++) for (let x = 0; x < PW; x++) if (inHead(x, y) && (x + y) % 2 === 0 && Math.abs(y - my) > 0) L.set(x, y, sc(L.get(x, y), 0.78)); }
    else if (beard === 'schnurr') { for (let x = -mw - 1; x <= mw; x++) L.set(cx + x, my - 1 + (Math.abs(x + 0.5) > mw ? 1 : 0), S(beardC, cx + x, my)); }
    else {
      const bot = beard === 'kurz' ? cy + ry + 1 : cy + ry + 9;
      for (let y = my - 2; y <= bot; y++) for (let x = cx - rx; x <= cx + rx; x++) {
        const inside = inHead(x, y) && y >= my - 2 + Math.max(0, (Math.abs(x - cx) - mw - 1) * -0.5), below = y > cy + ry - 3 && Math.abs(x - cx) < (rx - 2) * (1 - (y - (cy + ry - 3)) / (bot - cy - ry + 4));
        if (!(inside || below)) continue; if (y >= my && y <= my + 1 && Math.abs(x - cx) < mw) continue;
        L.set(x, y, sc(S(beardC, x, y), 0.78 + N4.noise(x * 1.3, y * 0.4) * 0.4));
      }
      if (beard === 'zopfbart') for (let y = bot - 3; y <= bot; y++) L.set(cx, y, flat(hex('#b88a3e'), 1));
    }
  }
  // Haare vorne
  if (hair && style !== 'glatze') {
    const sideBot = { kurz: cy - 2, zopf: cy, dutt: cy - 2, lang: cy + 8, wild: cy + 6, locken: cy + 3 }[style] ?? cy - 2;
    for (let y = cy - ry - 3; y <= sideBot; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
      const dx = (x + 0.5 - cx) / (rx + 1.5), dy = (y + 0.5 - cy) / (ry + 1.5);
      let out = dx * dx + dy * dy; if (style === 'locken' || style === 'wild') out -= N4.noise(x * 0.7, y * 0.7) * 0.18;
      if (out > 1) continue;
      const fringe = cy - ry * (face === 'schmal' ? 0.45 : 0.5) + (style === 'wild' ? 2 : 0) + Math.sin(x * 0.9) * (style === 'locken' ? 1.5 : 0.8);
      if (y > fringe && Math.abs(x - cx) < rx - 2.5) continue;
      L.set(x, y, sc(S(hair, x, y), (style === 'locken' ? 0.7 + N4.noise(x * 0.8, y * 0.8) * 0.6 : 0.75 + N4.noise(x * 1.1, y * 0.2) * 0.5)));
    }
    if (style === 'dutt') for (let y = -4; y <= 3; y++) for (let x = -4; x <= 4; x++) if ((x / 4.5) ** 2 + (y / 4) ** 2 < 1) L.set(cx + x, cy - ry - 4 + y, S(hair, cx + x, cy - ry - 4 + y));
    if (style === 'zopf') for (let y = cy; y <= 40; y++) { const xx = cx + rx + 1 - (y - cy) * 0.15; L.set(xx, y, sc(S(hair, xx, y), (y % 3) ? 0.95 : 0.7)); L.set(xx + 1, y, sc(S(hair, xx, y), (y % 3) ? 0.8 : 0.6)); }
  } else if (hair) for (const sgn of [-1, 1]) for (let y = cy - 3; y <= cy + 1; y++) L.set(cx + sgn * (rx - 1), y, S(hair, cx + sgn * rx, y));
  outline(L, 0.35);
  return { w: PW, h: PH, data: toRGBA(L) };
}
