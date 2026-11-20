// Mossheart Figuren: EIN Bauplan pro Figur -> kleine Pixelfigur (läuft durchs Dorf) und großer Held (Dorfansicht).
// Beide Größen nutzen dieselben Farben aus dem Bauplan und dieselbe Lichtfunktion shade(), damit sie zusammenpassen.
import { clamp, mul, add, sc, hex, step, rng, makeNoise, N1, N4 } from './core.js?v=1';
import * as CORE from './core.js?v=1';
import { Sprite } from './world.js?v=2';

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
  const head = () => {
    const y0 = 2 + hy, y1 = 8 + hy;
    P(6, 8 + hy + 1, K.skin); P(7, 8 + hy + 1, K.skin); // Hals
    if (!side) {
      for (let y = y0; y <= y1; y++) for (let x = 3; x <= 10; x++) { if ((y === y0 || y === y1) && (x === 3 || x === 10)) continue; P(x, y, back ? K.hair || K.skin : K.skin); }
      if (back && (style === 'glatze' || !K.hair)) for (let y = y0; y <= y1; y++) for (let x = 3; x <= 10; x++) { if ((y === y0 || y === y1) && (x === 3 || x === 10)) continue; P(x, y, K.skin); }
      if (!back) { sp.set(5, 6 + hy, [0.1, 0.08, 0.08]); sp.set(8, 6 + hy, [0.1, 0.08, 0.08]); P(4, 7 + hy, sc(K.skin, 1.08)); P(9, 7 + hy, sc(K.skin, 1.08)); }
    } else {
      for (let y = y0; y <= y1; y++) for (let x = 4; x <= 10; x++) { if ((y === y0 || y === y1) && (x === 4 || x === 10)) continue; P(x, y, K.skin); }
      P(11, 6 + hy, K.skin); // Nase
      sp.set(9, 6 + hy, [0.1, 0.08, 0.08]);
    }
  };
  const hair = () => {
    const H = K.hair; if (!H) return; const y0 = 2 + hy;
    if (style === 'glatze') { if (side) R(4, 5, y0 + 3, y0 + 4, H); else if (!back) { P(3, y0 + 3, H); P(10, y0 + 3, H); P(3, y0 + 4, H); P(10, y0 + 4, H); } else R(3, 10, y0 + 3, y0 + 5, H); return; }
    if (back) {
      if (style === 'lang' || style === 'wild') R(3, 10, y0 + 6, y0 + 9, H);
      if (style === 'zopf') { R(6, 7, y0 + 7, y0 + 10, H); P(6, y0 + 11, H); }
      if (style === 'dutt') R(5, 8, y0 - 2, y0 - 1, H);
      if (style === 'wild') { P(4, y0 - 1, H); P(7, y0 - 1, H); P(9, y0 - 1, H); }
      return;
    }
    if (!side) {
      R(4, 9, y0, y0, H); R(3, 10, y0 + 1, y0 + 1, H);
      P(4, y0 + 2, H); P(5, y0 + 2, H); P(8, y0 + 2, H); P(9, y0 + 2, H); P(3, y0 + 2, H); P(10, y0 + 2, H);
      const sideBot = { kurz: y0 + 3, zopf: y0 + 4, dutt: y0 + 3, lang: y0 + 9, wild: y0 + 9 }[style] ?? y0 + 3;
      R(3, 3, y0 + 2, sideBot, H); R(10, 10, y0 + 2, sideBot, H);
      if (style === 'dutt') R(5, 8, y0 - 2, y0 - 1, H);
      if (style === 'wild') { P(4, y0 - 1, H); P(7, y0 - 1, H); P(9, y0 - 1, H); }
      if (style === 'zopf') { P(11, y0 + 5, H); P(11, y0 + 6, H); P(11, y0 + 7, sc(H, 0.9)); }
    } else {
      R(5, 9, y0, y0, H); R(4, 10, y0 + 1, y0 + 1, H); P(10, y0 + 2, H);
      const bot = { kurz: y0 + 4, zopf: y0 + 5, dutt: y0 + 4, lang: y0 + 9, wild: y0 + 9 }[style] ?? y0 + 4;
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
    const bot = b === 'lang' ? y + 4 : y + 1;
    if (side) { R(8, 10, y, Math.min(bot, y + 2), B); if (b === 'lang') R(8, 9, y + 3, bot, B); P(7, y, B); }
    else { R(4, 9, y, y + 1, B); if (b === 'lang') R(5, 8, y + 2, bot, B); P(3, y - 1, B); P(10, y - 1, B); sp.set(5, y, sc(B, 0.6)); }
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
    legs(); torso(); arms(swing); capeBack(); hoodDown(); quiverBack(); head(); hair(); hatDraw();
  } else if (side) {
    capeBehind(); legs(); torso(); quiverSide(); hoodDown(); head(); hair(); beard(); hatDraw();
    const [[hx, hy2]] = arms(swing); if (plan.prop) drawProp(sp, plan.prop, hx, hy2, plan.skin);
  } else {
    capeBehind(); legs(); torso(); const hands = arms(swing);
    if (plan.prop) drawProp(sp, plan.prop, hands[0][0], hands[0][1], plan.skin);
    quiverFront(); hoodDown(); head(); hair(); beard(); hatDraw();
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

/* ======================================================================
   Großer Held: sitzt auf dem Felsen, Rückansicht, ruhige Atmung (2 Phasen) – aus demselben Bauplan
   ====================================================================== */
export const HERO_W = 480, HERO_H = 270, HERO = { x: 92, y: 228 };
function facetRock(L, cx, cy, rx, ry) {
  const nz = makeNoise(Math.round(cx * 13 + cy * 7)), S = CORE.S;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy > 1 - nz.noise(x * 0.12, y * 0.12) * 0.3) continue;
    const fx = Math.round(nz.noise(x * 0.07, y * 0.09) * 4) / 4 - 0.5, fy = Math.round(nz.noise(x * 0.07 + 5, y * 0.09) * 4) / 4 - 0.5;
    const n = [dx * 0.8 + fx * 1.4, dy * 0.6 - 0.45 + fy, 0.7], l = Math.hypot(...n);
    let col = CORE.lit(hex('#6f788c'), n[0] / l, n[1] / l, n[2] / l, 3);
    if (nz.noise(x * 0.5, y * 0.25) > 0.78) col = sc(col, 0.8);
    if (dy < -0.4 + nz.noise(x * 0.2, 3) * 0.3) col = S.groundSnow ? CORE.lit(hex('#eef1f4'), 0, -1, 0.5, 2) : flat(hex(nz.noise(x * 0.4, y * 0.4) > 0.5 ? S.grass[1] : S.dry), 0.8);
    L.set(x, y, col);
  }
}
export function heroSprite(plan = HERO_PLAN, breath = 0) {
  const L = new Sprite(HERO_W, HERO_H, 0, 0), { x: fx, y: fy } = HERO, LD = CORE.LDIR, b = breath, S = CORE.S;
  const shadeN = shade;
  const ell = (cx, cy, rx, ry, base, tex) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d2 = dx * dx + dy * dy; if (d2 > 1) continue; let c = shadeN(base, dx, dy, Math.sqrt(1 - d2)); if (tex) c = sc(c, tex(x, y)); L.set(x, y, c); } };
  const limb = (x0, y0, x1, y1, r0, r1, base, tex) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2); const ax = -(y1 - y0), ay = x1 - x0, al = Math.hypot(ax, ay) || 1; for (let s2 = 0; s2 <= n; s2++) { const t = s2 / n, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, r = r0 + (r1 - r0) * t; for (let k = -r; k <= r; k += 0.5) { const u = k / r; let c = shadeN(base, (ax / al) * u, (ay / al) * u, Math.sqrt(Math.max(0, 1 - u * u))); if (tex) c = sc(c, tex(cx + (ax / al) * k, cy + (ay / al) * k, t)); L.set(cx + (ax / al) * k, cy + (ay / al) * k, c); } } };
  const poly = (pts, fn) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) ins = !ins; } if (ins) { const c = fn(x, y); if (c) L.set(x, y, c); } } };
  const C = {
    cloak: C3(plan.cape), cloakD: sc(C3(plan.cape), 0.72), trim: C3(plan.trim), top: C3(plan.top), pants: C3(plan.legs), boot: C3(plan.boots),
    hair: C3(plan.hair), skin: C3(plan.skin), bow: hex('#7a5232'), pipe: C3(plan.pipe || '#5e3a20'), quiver: C3(plan.quiver || '#5e3a20'), fletch: C3(plan.fletch || '#e8e0cc'), beard: C3(plan.beardColor || plan.hair),
  };
  // Fels und Gras (Sitzplatz) am Bildschirmrand
  facetRock(L, fx - 10, fy + 30, 104, 34); facetRock(L, fx + 90, fy + 46, 40, 18);
  const r = rng(7), g = S.grass.map(hex);
  for (let i = 0; i < 160; i++) { const x = r() * 220 - 20, y = HERO_H - r() * 26, hh = 5 + r() * 9, base = r() < 0.4 && !S.groundSnow ? hex(S.dry) : g[1]; for (let k = 0; k < hh; k++) L.set(x + (k / hh) * (r() * 3 - 1.5), y - k, flat(S.groundSnow && k < hh * 0.4 ? hex('#dfe5ee') : base, k > hh * 0.6 ? 0.85 : 0.5)); }
  // Langbogen an den Fels gelehnt (gespannt, Sehne gerade)
  const bx0 = fx - 46, by0 = fy + 24, bx1 = fx - 30, by1 = fy - 92;
  for (let k = 0; k <= 120; k++) { const t = k / 120, x = bx0 + (bx1 - bx0) * t - Math.sin(t * Math.PI) * 9, y = by0 + (by1 - by0) * t; const c = shadeN(C.bow, -0.4, -0.3, 0.85); L.set(x, y, c); L.set(x + 1, y, shadeN(C.bow, 0.5, -0.3, 0.8)); if (t > 0.46 && t < 0.54) { L.set(x, y, flat(hex('#3a2618'), 0.8)); L.set(x + 1, y, flat(hex('#3a2618'), 0.9)); } }
  for (let k = 0; k <= 116; k++) { const t = k / 116; L.set(bx0 + 1 + (bx1 - bx0) * t, by0 + (by1 - by0) * t, flat(hex('#a8a090'), 0.65)); }
  // Bein (sitzend, Blick nach rechts ins Tal): Oberschenkel waagrecht, Schienbein nach unten
  limb(fx + 6, fy - 2, fx + 30, fy - 4, 4.6, 4, C.pants);
  ell(fx + 30, fy - 3, 4.4, 4.2, C.pants);
  limb(fx + 31, fy - 2, fx + 35, fy + 16, 3.6, 3, C.pants);
  limb(fx + 35, fy + 12, fx + 36, fy + 20, 3.4, 3.2, C.boot, (x, y) => (Math.floor(y) === Math.floor(fy + 12) ? 1.2 : 1));
  ell(fx + 39, fy + 22, 5.5, 3, C.boot);
  // Umhang über Rücken und Fels
  const top = fy - 58 - b;
  poly([[fx - 13, top], [fx + 12, top - 1], [fx + 17, fy - 30], [fx + 20, fy + 2], [fx + 6, fy + 10], [fx - 20, fy + 12], [fx - 22, fy - 20]], (x, y) => {
    const u = clamp((x - fx) / 20, -1, 1), spread = 1 + Math.max(0, y - top) * 0.025;
    const fold = Math.sin(((x - fx) / spread) * 0.6 + N1.noise(x * 0.07, y * 0.04) * 3) * 0.5 + 0.5;
    let c = shadeN(C.cloak, u * 0.95, -0.1, Math.sqrt(Math.max(0, 1 - u * u * 0.85)));
    c = sc(c, fold > 0.62 ? 1.1 : fold < 0.22 ? 0.82 : 1);
    if (y > fy + 7 - (x - fx) * 0.05) c = flat(sc(C.cloak, 0.6), 0.8); // ausgefranster, dunkler Saum
    if (y > fy + 9 - (x - fx) * 0.05 && N4.noise(x * 0.8, 3) > 0.55) return null;
    return c;
  });
  // Köcher schräg über dem Rücken, Pfeile ragen über die linke Schulter
  for (let k = 0; k <= 34; k++) { const t = k / 34, qx = fx - 15 + t * 15, qy = top - 4 + t * 30; for (let w = -2.5; w <= 2.5; w += 0.5) L.set(qx + w, qy + w * 0.3, shadeN(C.quiver, w / 2.5, -0.2, Math.sqrt(1 - (w / 2.6) ** 2))); if (k % 9 === 4) for (let w = -2.5; w <= 2.5; w += 0.5) L.set(qx + w, qy + w * 0.3, flat(sc(C.quiver, 0.6), 0.8)); }
  for (let a = 0; a < 5; a++) { const ax = fx - 17 + a * 1.6, ay = top - 6 - (a % 2) * 2; for (let k = 0; k < 4; k++) { L.set(ax - k * 0.4, ay - k, flat(a % 2 ? C.fletch : hex('#a83a3a'), 0.95)); L.set(ax - k * 0.4 + 1, ay - k, flat(sc(a % 2 ? C.fletch : hex('#a83a3a'), 0.8), 0.9)); } L.set(ax - 1.8, ay - 5, flat(hex('#8a6a4a'), 0.9)); }
  // zurückgeschlagene Kapuze im Nacken
  for (let y = top - 6; y <= top + 9; y++) for (let x = fx - 15; x <= fx + 14; x++) { const dx = (x - fx + 0.5) / 15, dy = (y - top - 1) / 8; if (dx * dx + dy * dy > 1) continue; const fold = Math.sin(dx * 7 + N4.noise(x * 0.3, y * 0.3) * 2); L.set(x, y, sc(shadeN(C.cloak, dx, dy - 0.7, 0.6), fold > 0.5 ? 1.08 : fold < -0.6 ? 0.8 : 1)); }
  for (let x = fx - 3; x <= fx + 2; x++) L.set(x, top + 7, flat(C.trim, 0.95)); // Umhangspange
  // Arm zur Pfeife (Lederwams-Ärmel)
  limb(fx + 13, top + 2, fx + 21, top + 17, 3.6, 3.2, C.cloakD);
  limb(fx + 21, top + 17, fx + 13, top - 1, 2.9, 2.6, C.cloak);
  limb(fx + 13.6, top - 1, fx + 12, top - 5, 2.6, 2.5, C.top); // Lederarmschiene
  ell(fx + 11, top - 7, 2.7, 2.5, C.skin);
  // Kopf
  ell(fx + 2, top - 17, 8.5, 10, C.skin);
  ell(fx + 8, top - 12, 4, 5.2, C.beard, (x, y) => 0.8 + N4.noise(x * 1.4, y * 0.5) * 0.4); // kurzer Bart
  for (let y = top - 28; y <= top - 7; y++) for (let x = fx - 8; x <= fx + 10; x++) { const dx = (x + 0.5 - (fx + 1)) / 9, dy = (y + 0.5 - (top - 18)) / 10.5; if (dx * dx + dy * dy > 1) continue; if (x > fx + 3 && y > top - 21) continue; const c = shadeN(C.hair, dx, dy, Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)), 1.4); L.set(x, y, sc(c, 0.75 + N4.noise(x * 1.2, y * 0.14) * 0.5)); }
  ell(fx + 7, top - 17, 1.4, 2.3, sc(C.skin, 0.95));
  // Pferdeschwanz, mit Lederband gebunden
  limb(fx - 3, top - 12, fx - 5, top + 4, 2.2, 1.2, C.hair, (x, y) => 0.7 + N4.noise(x * 1.5, y * 0.5) * 0.6);
  for (let k = 0; k < 3; k++) { L.set(fx - 4, top - 10 + k, flat(hex('#3a2618'), 0.9)); L.set(fx - 3, top - 10 + k, flat(hex('#3a2618'), 0.9)); }
  // Pfeife
  for (let k = 0; k < 6; k++) L.set(fx + 9 + k, top - 10 + k * 0.2, shadeN(C.pipe, 0.3, -0.5, 0.7));
  ell(fx + 15.5, top - 11, 1.8, 2.3, C.pipe);
  L.set(fx + 15, top - 14, [1.3, 0.6, 0.2]); L.set(fx + 16, top - 14, [1.1, 0.5, 0.15]);
  // Kontur auf der Schattenseite der Figur
  const out = [], dir = Math.sign(LD[0] || 1);
  for (let y = top - 34; y < fy + 26; y++) for (let x = fx - 52; x < fx + 46; x++) { const i = y * HERO_W + x; if (L.a[i] && !L.a[i - dir] && y < fy + 8) out.push([x - dir, y]); }
  for (const [x, y] of out) L.set(x, y, [0.1, 0.1, 0.14]);
  return { data: toRGBA(L), pipe: [fx + 15.5, top - 14] };
}
