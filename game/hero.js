// Mossheart großer Held (Dorfansicht unten links): Rückenansicht mit Blick ins Tal.
// Fünf Posen (wechseln täglich), Kleidung und Waffe ergeben sich aus Rolle und Ausrüstung.
import { clamp, mul, add, sc, hex, rng, makeNoise, N1, N4 } from './core.js?v=1';
import * as CORE from './core.js?v=1';
import { Sprite } from './world.js?v=6';
import { shade, toRGBA, HERO_PLAN } from './chars.js?v=4';

export const HERO_W = 480, HERO_H = 270;
export const POSES = ['rast', 'ausblick', 'wache', 'lagerfeuer', 'pflege'];
export const POSE_NAMES = { rast: 'Rast mit Pfeife', ausblick: 'Blick ins Tal', wache: 'Auf Wache', lagerfeuer: 'Am Lagerfeuer', pflege: 'Ausrüstung pflegen' };
const C3 = (c) => (typeof c === 'string' ? hex(c) : c);
const flat = (base, k = 0.75) => mul(base, add(CORE.AMB, sc(CORE.LIGHT, k)));

// Pose des Tages: jeder Spieler hat an einem Tag eine andere
export function poseOfDay(seed = 0, date = new Date()) {
  const day = Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
  let x = ((day + 7) * 2654435761 + (seed | 0) * 40503) >>> 0; x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0;
  return POSES[x % POSES.length];
}

/* ======================================================================
   Rolle + Ausrüstung -> Erscheinung
   ====================================================================== */
export const ROLE_LOOK = {
  waldlaeufer: { weapon: 'bogen', armor: 'leder', back: 'koecher', hood: false, top: '#6b4a2e', cape: null, extra: [] },
  krieger: { weapon: 'schwert', armor: 'kette', back: 'schild', hood: false, top: '#7a3a2a', cape: null, extra: [] },
  haendler: { weapon: 'dolch', armor: 'fein', back: 'tasche', hood: false, top: '#3a5a7a', cape: null, extra: ['beutel'] },
  gelehrter: { weapon: 'stab', armor: 'robe', back: 'tasche', hood: false, top: '#4a4a6a', cape: null, extra: ['buch', 'laterne'] },
  heiler: { weapon: 'stab', armor: 'robe', back: 'tasche', hood: false, top: '#5a6a4a', cape: null, extra: ['kraeuter'] },
  schurke: { weapon: 'dolch', armor: 'leder', back: null, hood: true, top: '#3a3430', cape: '#2a2a30', extra: ['dietrich'] },
};
const WEAPON_PREF = {
  waldlaeufer: ['bogen', 'speer', 'axt', 'dolch', 'schwert', 'saebel'], krieger: ['schwert', 'axt', 'saebel', 'speer', 'dolch', 'bogen'], haendler: ['saebel', 'dolch', 'schwert', 'bogen', 'speer', 'axt'],
  gelehrter: ['dolch', 'schwert', 'speer', 'bogen', 'saebel', 'axt'], heiler: ['dolch', 'speer', 'bogen', 'schwert', 'saebel', 'axt'], schurke: ['dolch', 'saebel', 'bogen', 'schwert', 'speer', 'axt'],
};
// inv: Antwort von get_inventory (items[], ausruestung[]) – ohne Inventar zählt nur die Rolle
export function gearFromInventory(role = 'waldlaeufer', inv = null) {
  const R = ROLE_LOOK[role] || ROLE_LOOK.waldlaeufer, g = { ...R, extra: R.extra.slice(), legendary: false, rare: false };
  if (!inv) return g;
  const items = new Set((inv.items || []).filter((i) => (i.menge ?? 1) > 0).map((i) => i.id));
  const gear = inv.ausruestung || [], gearBases = new Set(gear.map((x) => x.basis));
  const owns = (w) => items.has(w) || gearBases.has(w);
  const pref = WEAPON_PREF[role] || WEAPON_PREF.waldlaeufer, magic = ['stab'].includes(R.weapon);
  const w = pref.find(owns);
  // Gelehrte und Heiler behalten ihren Stab, außer sie besitzen schon eine Waffe aus ihrer Liste und keinen Startgegenstand
  if (w && !(magic && w === 'dolch')) g.weapon = w;
  if (w === 'bogen') g.back = 'koecher';
  else if (g.back === 'koecher') g.back = role === 'krieger' ? 'schild' : null;
  if (owns('kettenhemd')) g.armor = 'kette';
  else if (owns('lederwams') || owns('wams') || owns('gambeson')) g.armor = R.armor === 'robe' ? 'robe' : 'leder';
  else if (owns('feine_kleidung') || owns('gewand')) g.armor = R.armor === 'robe' ? 'robe' : 'fein';
  if (items.has('dunkler_umhang')) { g.hood = true; g.cape = '#2a2a30'; }
  for (const t of ['laterne', 'kraeutertasche', 'alte_chronik', 'dietrich', 'seil']) if (items.has(t)) { const k = { kraeutertasche: 'kraeuter', alte_chronik: 'buch' }[t] || t; if (!g.extra.includes(k)) g.extra.push(k); }
  const wGear = gear.find((x) => x.basis === g.weapon);
  if (wGear) { g.legendary = !!wGear.legendaer || wGear.seltenheit === 'legendaer'; g.rare = ['meister', 'selten', 'episch'].includes(wGear.seltenheit); }
  return g;
}

/* ======================================================================
   Posen: Gelenke relativ zum Bildrand (Figur unten links, Blick nach rechts)
   ====================================================================== */
const P = {
  rast: { seat: 'fels', hip: [96, 226], neck: [99, 172], head: [101, 157], tilt: 0,
    legF: [[96, 226], [122, 224], [127, 246]], legB: [[92, 228], [112, 232], [114, 248]],
    armB: [[86, 178], [80, 198], [88, 214]], armF: [[110, 177], [119, 193], [110, 170]], prop: 'pfeife', weaponAt: 'lehnt' },
  ausblick: { seat: 'stand', hip: [96, 196], neck: [106, 147], head: [110, 133], tilt: 0.1,
    legB: [[94, 198], [92, 219], [90, 240]], legF: [[100, 196], [121, 194], [125, 215]],
    armF: [[115, 153], [124, 176], [124, 190]], armB: [[93, 154], [84, 174], [80, 191]], weaponAt: 'hand_hinten' },
  wache: { seat: 'stand', hip: [96, 194], neck: [98, 144], head: [99, 130], tilt: 0,
    legB: [[92, 196], [90, 217], [88, 240]], legF: [[101, 196], [104, 217], [108, 240]],
    armB: [[88, 151], [101, 172], [114, 183]], armF: [[108, 151], [120, 170], [117, 185]], weaponAt: 'vorne' },
  lagerfeuer: { seat: 'stamm', hip: [92, 232], neck: [101, 184], head: [105, 171], tilt: 0.15,
    legF: [[96, 232], [117, 225], [127, 241]], legB: [[92, 234], [109, 232], [119, 243]],
    armB: [[92, 191], [105, 208], [132, 214]], armF: [[110, 189], [125, 204], [139, 210]], weaponAt: 'lehnt', fire: [158, 238] },
  pflege: { seat: 'fels', hip: [96, 226], neck: [103, 175], head: [107, 163], tilt: 0.35,
    legF: [[96, 226], [122, 221], [126, 246]], legB: [[92, 228], [112, 228], [114, 248]],
    armB: [[88, 181], [96, 202], [106, 214]], armF: [[112, 181], [124, 199], [127, 212]], prop: 'pflege', weaponAt: 'schoss' },
};

export function heroSprite(plan = HERO_PLAN, breath = 0, poseName = null) {
  const pose = P[poseName || plan.pose || 'rast'] || P.rast;
  const L = new Sprite(HERO_W, HERO_H, 0, 0), S = CORE.S, b = breath;
  const role = plan.herkunft || 'waldlaeufer', G = plan.gear || gearFromInventory(role, null), race = plan.race || 'mensch';
  // Gelenke an das Volk anpassen (Zwerge: kurze Beine, breit; Halblinge: klein)
  const legK = race === 'zwerg' ? 0.72 : race === 'halbling' ? 0.78 : race === 'elf' ? 1.06 : 1, bodyK = race === 'halbling' ? 0.86 : race === 'zwerg' ? 0.9 : race === 'elf' ? 1.02 : 1, wide = race === 'zwerg' ? 1.25 : race === 'elf' ? 0.9 : race === 'halbling' ? 1.02 : 1;
  const [hx, hy] = pose.hip, standing = pose.seat === 'stand';
  const leg = (pts) => pts.map(([x, y], i) => (i === 0 ? [x, y] : [hx + (x - hx) * legK, hy + (y - hy) * legK]));
  const legF = leg(pose.legF), legB = leg(pose.legB);
  // stehende Figuren: kurze Beine heben die Füße an -> Figur absenken, damit sie auf dem Fels steht
  const drop = standing ? Math.max(legF[2][1], legB[2][1]) < 240 ? 240 - Math.max(legF[2][1], legB[2][1]) : 0 : 0;
  const up = (p) => [hx + (p[0] - hx) * bodyK, hy + (p[1] - hy) * bodyK - b + drop];
  const shift = (pts) => pts.map(([x, y]) => [x, y + drop]);
  const LF = shift(legF), LB = shift(legB), HIP = [hx, hy + drop];
  const NECK = up(pose.neck), HEAD = up(pose.head);
  const armF = pose.armF.map(up), armB = pose.armB.map(up);
  const shoulderW = 11 * wide;

  const ell = (cx, cy, rx, ry, base, tex) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d2 = dx * dx + dy * dy; if (d2 > 1) continue; let c = shade(base, dx, dy, Math.sqrt(1 - d2)); if (tex) c = sc(c, tex(x, y)); L.set(x, y, c); } };
  const limb = (a, bb, r0, r1, base, tex) => { const [x0, y0] = a, [x1, y1] = bb, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2); const ax = -(y1 - y0), ay = x1 - x0, al = Math.hypot(ax, ay) || 1; for (let s2 = 0; s2 <= n; s2++) { const t = s2 / n, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, r = r0 + (r1 - r0) * t; for (let k = -r; k <= r; k += 0.5) { const u = k / r; let c = shade(base, (ax / al) * u, (ay / al) * u, Math.sqrt(Math.max(0, 1 - u * u))); if (tex) c = sc(c, tex(cx + (ax / al) * k, cy + (ay / al) * k, t)); L.set(cx + (ax / al) * k, cy + (ay / al) * k, c); } } };
  const poly = (pts, fn) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) ins = !ins; } if (ins) { const c = fn(x, y); if (c) L.set(x, y, c); } } };
  const line = (a, bb, col, w = 1) => { const n = Math.ceil(Math.hypot(bb[0] - a[0], bb[1] - a[1]) * 2); for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (bb[0] - a[0]) * t, y = a[1] + (bb[1] - a[1]) * t; for (let k = 0; k < w; k++) L.set(x + k, y, typeof col === 'function' ? col(t, k) : col); } };

  const skin = C3(plan.skin), hair = C3(plan.hair || '#3d2a1c'), beardC = C3(plan.beardColor || plan.hair || '#3d2a1c');
  const capeC = C3(G.cape || plan.cape || '#3e5a34'), topC = C3(G.top || plan.top || '#6b4a2e'), trim = C3(G.armor === 'fein' ? '#c8a050' : plan.trim || '#a8843e');
  const legsC = C3(plan.legs || '#4a3e2c'), bootC = C3(plan.boots || '#3a2a1e'), beltC = C3(plan.belt || '#3a2618');
  const wood = hex('#7a5232'), woodD = hex('#4a3220'), steel = hex('#b8bcc6'), steelD = hex('#6a707c'), gold = hex('#d8b24a');
  const glint = G.legendary ? hex('#ffd76a') : G.rare ? hex('#d8e8ff') : null;

  /* ---------- Umgebung: Fels, Stamm, Lagerfeuer, Gras ---------- */
  const facetRock = (cx, cy, rx, ry) => {
    const nz = makeNoise(Math.round(cx * 13 + cy * 7));
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy > 1 - nz.noise(x * 0.12, y * 0.12) * 0.3) continue;
      const fx = Math.round(nz.noise(x * 0.07, y * 0.09) * 4) / 4 - 0.5, fy = Math.round(nz.noise(x * 0.07 + 5, y * 0.09) * 4) / 4 - 0.5;
      const n = [dx * 0.8 + fx * 1.4, dy * 0.6 - 0.45 + fy, 0.7], l = Math.hypot(...n);
      let col = CORE.lit(hex('#6f788c'), n[0] / l, n[1] / l, n[2] / l, 3);
      if (nz.noise(x * 0.5, y * 0.25) > 0.78) col = sc(col, 0.8);
      if (dy < -0.4 + nz.noise(x * 0.2, 3) * 0.3) col = S.groundSnow ? CORE.lit(hex('#eef1f4'), 0, -1, 0.5, 2) : flat(hex(nz.noise(x * 0.4, y * 0.4) > 0.5 ? S.grass[1] : S.dry), 0.8);
      L.set(x, y, col);
    }
  };
  const LF0x = () => LF[2][0] + 2;
  if (pose.seat === 'fels') { facetRock(86, 258, 104, 34); facetRock(186, 274, 40, 18); }
  else if (pose.seat === 'stand') { if (pose === P.ausblick) facetRock(LF0x(), 236, 20, 18); facetRock(92, 268, 110, 32); facetRock(190, 280, 46, 20); }
  else {
    facetRock(70, 272, 90, 22);
    // umgestürzter Stamm als Sitz
    for (let x = 40; x <= 130; x++) for (let y = -7; y <= 7; y++) { const u = y / 7; if (Math.abs(u) > 1) continue; const ring = x < 44; L.set(x, 240 + y + (x - 40) * 0.02, ring ? flat(hex(Math.abs(u) < 0.5 ? '#c8a878' : '#8a6a44'), 0.9) : shade(hex(N4.noise(x * 0.4, y * 0.6) > 0.6 ? '#5a4030' : '#6a4a34'), 0, u, Math.sqrt(1 - u * u))); }
    // Feuerstelle mit Steinring und Holzscheiten (Flammen kommen animiert dazu)
    const [fxp, fyp] = pose.fire;
    for (let a = 0; a < Math.PI * 2; a += 0.55) { const sx = fxp + Math.cos(a) * 15, sy = fyp + Math.sin(a) * 5; ell(sx, sy, 3.2, 2.4, hex('#7d8496')); }
    for (let k = -1; k <= 1; k++) limb([fxp - 10, fyp + 1 + k], [fxp + 10, fyp - 1 - k], 1.6, 1.6, hex('#5a3e28'));
    limb([fxp - 6, fyp + 3], [fxp + 4, fyp - 6], 1.5, 1.5, hex('#4a3220'));
    for (let x = fxp - 8; x <= fxp + 8; x++) L.set(x, fyp, flat(hex('#2a2420'), 0.8));
  }
  { const r = rng(7), g = S.grass.map(hex);
    for (let i = 0; i < 170; i++) { const x = r() * 230 - 20, y = HERO_H - r() * 26, hh = 5 + r() * 9, base = r() < 0.4 && !S.groundSnow ? hex(S.dry) : g[1]; for (let k = 0; k < hh; k++) L.set(x + (k / hh) * (r() * 3 - 1.5), y - k, flat(S.groundSnow && k < hh * 0.4 ? hex('#dfe5ee') : base, k > hh * 0.6 ? 0.85 : 0.5)); } }

  /* ---------- Waffen ---------- */
  const W = {
    bogen(a, bb, bend = 9) { const n = 140; for (let k = 0; k <= n; k++) { const t = k / n, x = a[0] + (bb[0] - a[0]) * t - Math.sin(t * Math.PI) * bend, y = a[1] + (bb[1] - a[1]) * t; L.set(x, y, shade(wood, -0.4, -0.3, 0.85)); L.set(x + 1, y, shade(wood, 0.5, -0.3, 0.8)); if (t > 0.46 && t < 0.54) { L.set(x, y, flat(hex('#3a2618'), 0.8)); L.set(x + 1, y, flat(hex('#3a2618'), 0.9)); } if (glint && (k % 23 === 0)) L.set(x + 1, y, glint); } line(a, bb, flat(hex('#b0a898'), 0.7)); },
    schwert(tip, hilt) { const dx = hilt[0] - tip[0], dy = hilt[1] - tip[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, px = -uy, py = ux; for (let s = 0; s <= l; s += 0.5) { const w = s < 6 ? (s / 6) * 1.6 : 1.6; for (let k = -w; k <= w; k += 0.5) L.set(tip[0] + ux * s + px * k, tip[1] + uy * s + py * k, k < 0 ? shade(steel, -0.6, -0.2, 0.8) : k > 0.6 ? shade(steelD, 0.6, 0, 0.7) : flat(hex('#eef2f6'), 0.95)); } if (glint) for (let s = 4; s < l; s += 9) L.set(tip[0] + ux * s, tip[1] + uy * s, glint); for (let k = -5; k <= 5; k += 0.5) { L.set(hilt[0] + px * k, hilt[1] + py * k, shade(trim, px, -0.4, 0.8)); L.set(hilt[0] + px * k + ux, hilt[1] + py * k + uy, shade(sc(trim, 0.7), px, 0, 0.8)); } for (let s = 1; s <= 7; s++) for (let k = -1; k <= 1; k += 0.5) L.set(hilt[0] + ux * s + px * k, hilt[1] + uy * s + py * k, shade(hex('#4a3020'), k, 0, 0.8)); ell(hilt[0] + ux * 9, hilt[1] + uy * 9, 2, 2, trim); },
    saebel(tip, hilt) { const dx = hilt[0] - tip[0], dy = hilt[1] - tip[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, px = -uy, py = ux; for (let s = 0; s <= l; s += 0.5) { const cur = Math.sin((s / l) * Math.PI) * 4, w = s < 5 ? (s / 5) * 1.8 : 1.8; for (let k = -w; k <= w; k += 0.5) L.set(tip[0] + ux * s + px * (k + cur), tip[1] + uy * s + py * (k + cur), k < 0 ? shade(steel, -0.6, -0.2, 0.8) : flat(hex('#eef2f6'), 0.95)); } for (let a = 0; a < Math.PI; a += 0.1) L.set(hilt[0] + ux * 3 + px * Math.cos(a) * 4, hilt[1] + uy * 3 + py * Math.cos(a) * 4 + Math.sin(a) * 2, shade(trim, 0.3, -0.3, 0.8)); for (let s = 1; s <= 6; s++) L.set(hilt[0] + ux * s, hilt[1] + uy * s, shade(hex('#4a3020'), 0, 0, 0.8)); },
    dolch(tip, hilt) { const dx = hilt[0] - tip[0], dy = hilt[1] - tip[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, px = -uy, py = ux; for (let s = 0; s <= l; s += 0.5) { const w = (s / l) * 1.4 + 0.3; for (let k = -w; k <= w; k += 0.5) L.set(tip[0] + ux * s + px * k, tip[1] + uy * s + py * k, k < 0 ? shade(steel, -0.6, -0.2, 0.8) : flat(hex('#eef2f6'), 0.95)); } for (let k = -3; k <= 3; k += 0.5) L.set(hilt[0] + px * k, hilt[1] + py * k, shade(trim, 0, -0.4, 0.8)); for (let s = 1; s <= 4; s++) L.set(hilt[0] + ux * s, hilt[1] + uy * s, shade(hex('#4a3020'), 0, 0, 0.8)); },
    axt(bottom, top) { limb(bottom, top, 1.3, 1.5, wood); const dx = top[0] - bottom[0], dy = top[1] - bottom[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, px = -uy, py = ux; for (let s = -7; s <= 3; s++) for (let k = 1; k <= 8; k++) { const edge = k > 6 - Math.abs(s + 2) * 0.3; L.set(top[0] + ux * s + px * k, top[1] + uy * s + py * k, edge ? flat(hex('#eef2f6'), 0.95) : shade(steel, 0.3, -0.3, 0.8)); } for (let s = -3; s <= 1; s++) for (let k = -3; k <= 0; k++) L.set(top[0] + ux * s + px * k, top[1] + uy * s + py * k, shade(steelD, -0.4, 0, 0.8)); },
    speer(butt, tip) { limb(butt, tip, 1.1, 1.1, wood); const dx = tip[0] - butt[0], dy = tip[1] - butt[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, px = -uy, py = ux; for (let s = 0; s <= 11; s += 0.5) { const w = Math.sin((s / 11) * Math.PI) * 2.6; for (let k = -w; k <= w; k += 0.5) L.set(tip[0] + ux * s + px * k, tip[1] + uy * s + py * k, k < 0 ? shade(steel, -0.5, -0.2, 0.8) : flat(hex('#eef2f6'), 0.95)); } if (glint) L.set(tip[0] + ux * 5, tip[1] + uy * 5, glint); for (let k = -1.5; k <= 1.5; k += 0.5) L.set(tip[0] - ux + px * k, tip[1] - uy + py * k, shade(hex('#3a2618'), 0, 0, 0.8)); },
    stab(bottom, top) { limb(bottom, top, 1.4, 1.7, wood, (x, y) => 0.85 + N4.noise(x * 0.5, y * 0.4) * 0.3); const dx = top[0] - bottom[0], dy = top[1] - bottom[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l; ell(top[0] + ux * 3, top[1] + uy * 3, 3.2, 3.6, woodD); if (role === 'gelehrter') ell(top[0] + ux * 6, top[1] + uy * 6, 2, 2, hex('#9ad8f0')); else for (let k = 0; k < 5; k++) L.set(top[0] + ux * (2 + k) + (k % 2 ? 2 : -2), top[1] + uy * (2 + k), flat(hex('#6a9a3a'), 0.9)); },
  };
  const drawWeapon = (kind, a, bb) => { if (!kind || !W[kind]) return; if (kind === 'bogen') W.bogen(a, bb); else if (kind === 'axt' || kind === 'stab' || kind === 'speer') W[kind](a, bb); else W[kind](a, bb); };
  // lange Waffen: Endpunkte je nach Haltung
  const longLen = { bogen: 118, speer: 132, stab: 118, axt: 62, schwert: 58, saebel: 54, dolch: 22 }[G.weapon] || 0;

  /* ---------- Waffe hinter der Figur (lehnt am Fels / Stamm) ---------- */
  if (pose.weaponAt === 'lehnt' && G.weapon) {
    const base = pose.seat === 'stamm' ? [36, 246] : [48, 250], top = [base[0] + 18, base[1] - Math.max(30, longLen * 0.95)];
    if (['schwert', 'saebel', 'dolch'].includes(G.weapon)) drawWeapon(G.weapon, base, [base[0] + 6, base[1] - longLen * 0.82]);
    else if (G.weapon === 'axt') drawWeapon('axt', base, [base[0] + 10, base[1] - longLen]);
    else drawWeapon(G.weapon, base, top);
  }

  /* ---------- hinteres Bein, hinterer Arm ---------- */
  const robe = G.armor === 'robe';
  limb(LB[0], LB[1], 4.4, 3.8, sc(legsC, 0.82)); limb(LB[1], LB[2], 3.6, 3, sc(legsC, 0.82));
  ell(LB[2][0] + 3, LB[2][1] + 2, 5, 2.8, sc(bootC, 0.8));
  const sleeve = G.armor === 'kette' ? hex('#8a8e98') : G.armor === 'fein' ? topC : G.armor === 'robe' ? topC : sc(capeC, 0.85);
  limb(armB[0], armB[1], 3.4, 3, sc(sleeve, 0.78)); limb(armB[1], armB[2], 3, 2.6, sc(sleeve, 0.78)); ell(armB[2][0], armB[2][1], 2.6, 2.4, sc(skin, 0.85));

  /* ---------- Rumpf (Rücken) ---------- */
  const sx = NECK[0], sy = NECK[1] + 5, hipX = HIP[0], hipY = HIP[1] - 4;
  const torso = [[sx - shoulderW, sy], [sx + shoulderW, sy - 1], [hipX + 9 * wide, hipY], [hipX - 10 * wide, hipY + 1]];
  poly(torso, (x, y) => {
    const u = clamp((x - (sx + hipX) / 2) / 12, -1, 1);
    let c = shade(topC, u * 0.9, -0.1, Math.sqrt(Math.max(0, 1 - u * u * 0.8)));
    if (G.armor === 'kette') c = shade(((x + y) % 3 === 0 || (x - y) % 3 === 0) ? hex('#6a707c') : hex('#9aa0aa'), u * 0.9, -0.1, 0.8);
    if (G.armor === 'leder' && (Math.abs(x - (sx + hipX) / 2) < 0.7 || (y % 7 === 0))) c = sc(c, 0.75);
    return c;
  });
  // Gürtel
  for (let x = hipX - 11 * wide; x <= hipX + 10 * wide; x++) for (let k = 0; k < 3; k++) L.set(x, hipY - 2 + k, shade(beltC, (x - hipX) / 12, 0, 0.8));
  L.set(hipX + 2, hipY - 1, flat(trim, 1)); L.set(hipX + 3, hipY - 1, flat(trim, 1));
  // Gürtelzeug: Beutel, Buch, Laterne, Kräuter, Dietrich
  let beltX = hipX + 9 * wide;
  for (const e of G.extra) {
    if (e === 'beutel') { ell(beltX, hipY + 4, 3, 3.6, hex('#8a6a3a')); L.set(beltX, hipY, flat(gold, 1)); beltX -= 6; }
    else if (e === 'buch') { for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) L.set(beltX - 3 + x, hipY + 1 + y, shade(hex(x === 0 ? '#c8b898' : '#6a2a2a'), (x - 3) / 3, 0, 0.8)); beltX -= 7; }
    else if (e === 'laterne' && pose.seat !== 'stand') { const lx = pose.seat === 'stamm' ? 70 : 32, ly = 238; for (let y = 0; y < 9; y++) for (let x = -3; x <= 3; x++) L.set(lx + x, ly - y, (Math.abs(x) < 2 && y > 1 && y < 7) ? hex('#ffd27a') : shade(hex('#2e2a2a'), x / 3, 0, 0.8)); L.set(lx, ly - 10, shade(hex('#2e2a2a'), 0, -1, 0.5)); }
    else if (e === 'laterne') { ell(beltX - 1, hipY + 5, 2.4, 3.4, hex('#2e2a2a')); L.set(beltX - 1, hipY + 5, hex('#ffd27a')); beltX -= 6; }
    else if (e === 'kraeuter') { ell(beltX, hipY + 4, 3.4, 3.4, hex('#7a6a4a')); for (let k = 0; k < 4; k++) L.set(beltX - 1 + k, hipY - k % 2, flat(hex('#6a9a3a'), 0.9)); beltX -= 7; }
    else if (e === 'dietrich') { for (let k = 0; k < 4; k++) L.set(beltX, hipY + 2 + k, flat(hex('#b8bcc6'), 0.9)); beltX -= 3; }
  }

  /* ---------- Rückenteil: Köcher, Schild, Tasche ---------- */
  const backItem = (G.weapon === 'bogen' && pose.weaponAt !== 'lehnt') || G.back === 'koecher' ? 'koecher' : G.back;
  if (backItem === 'koecher') {
    const qx0 = sx - 12, qy0 = sy - 6;
    for (let k = 0; k <= 34; k++) { const t = k / 34, qx = qx0 + t * 16, qy = qy0 + t * 30; for (let w = -2.5; w <= 2.5; w += 0.5) L.set(qx + w, qy + w * 0.3, shade(hex('#5e3a20'), w / 2.5, -0.2, Math.sqrt(1 - (w / 2.6) ** 2))); if (k % 9 === 4) for (let w = -2.5; w <= 2.5; w += 0.5) L.set(qx + w, qy + w * 0.3, flat(hex('#3a2414'), 0.8)); }
    for (let a = 0; a < 5; a++) { const ax = qx0 - 2 + a * 1.6, ay = qy0 - 2 - (a % 2) * 2; for (let k = 0; k < 4; k++) { L.set(ax - k * 0.4, ay - k, flat(a % 2 ? hex('#e8e0cc') : hex('#a83a3a'), 0.95)); L.set(ax - k * 0.4 + 1, ay - k, flat(sc(a % 2 ? hex('#e8e0cc') : hex('#a83a3a'), 0.8), 0.9)); } }
  }

  /* ---------- Umhang (oder Robe) über dem Rücken ---------- */
  const capeTop = sy - 3, capeBot = robe ? Math.max(LB[2][1], LF[1][1]) - 2 : HIP[1] + (pose.seat === 'stand' ? 12 : 10);
  const capeL = Math.min(sx, hipX) - 15 * wide, capeR = Math.max(sx, hipX) + 14 * wide;
  const capeCol = robe ? sc(topC, 0.92) : capeC;
  poly([[sx - shoulderW - 2, capeTop], [sx + shoulderW + 1, capeTop - 1], [capeR + 2, (capeTop + capeBot) / 2], [capeR + 5, capeBot], [hipX + 4, capeBot + 3], [capeL - 3, capeBot + 2], [capeL - 1, (capeTop + capeBot) / 2]], (x, y) => {
    const u = clamp((x - (sx + hipX) / 2) / 18, -1, 1), spread = 1 + Math.max(0, y - capeTop) * 0.025;
    const fold = Math.sin(((x - hipX) / spread) * 0.6 + N1.noise(x * 0.07, y * 0.04) * 3) * 0.5 + 0.5;
    let c = shade(capeCol, u * 0.95, -0.1, Math.sqrt(Math.max(0, 1 - u * u * 0.85)));
    c = sc(c, fold > 0.62 ? 1.1 : fold < 0.22 ? 0.82 : 1);
    if (y > capeBot - 3) c = flat(sc(capeCol, 0.6), 0.8);
    if (y > capeBot && N4.noise(x * 0.8, 3) > 0.55) return null;
    if (robe && Math.abs(x - hipX - 1) < 0.6 && y > hipY) c = sc(c, 0.8);
    return c;
  });
  // Lichtkante am Umhang und tiefe Falte unter dem vorderen Arm
  { const lx = Math.sign(CORE.LDIR[0] || 1), rim = [];
    for (let y = capeTop + 2; y < capeBot - 1; y++) { let edge = -1; if (lx > 0) { for (let x = Math.round(capeR + 6); x > capeL; x--) if (L.a[y * HERO_W + x]) { edge = x; break; } } else { for (let x = Math.round(capeL - 4); x < capeR; x++) if (L.a[y * HERO_W + x]) { edge = x; break; } } if (edge > 0) rim.push([edge, y]); }
    for (const [x, y] of rim) L.set(x, y, flat(sc(capeCol, 1.35), 0.95));
    for (let y = capeTop + 8; y < capeBot - 4; y++) L.set(Math.round(sx + shoulderW * 0.55 + (y - capeTop) * 0.12), y, flat(sc(capeCol, 0.6), 0.8)); }
  if (G.armor === 'fein') for (let y = capeTop + 2; y < capeBot; y++) { L.set(capeL + (y - capeTop) * -0.05 - 1, y, flat(trim, 0.95)); }
  if (backItem === 'schild') { const cx = (sx + hipX) / 2 - 2, cy = (capeTop + capeBot) / 2 - 2; for (let y = -15; y <= 15; y++) for (let x = -14; x <= 14; x++) { const d = (x / 14) ** 2 + (y / 15) ** 2; if (d > 1) continue; const rim = d > 0.78, boss = d < 0.06; L.set(cx + x, cy + y, rim ? shade(steelD, x / 14, y / 15, 0.6) : boss ? shade(steel, x / 3, y / 3, 0.8) : shade(hex((Math.floor((x + 20) / 7) % 2) ? '#7a2a22' : '#c8a050'), x / 16, y / 16, Math.sqrt(1 - d * 0.8))); } }
  if (backItem === 'tasche') { const cx = capeR - 4, cy = hipY + 2; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (Math.abs(x) + Math.abs(y) * 0.6 < 7) L.set(cx + x, cy + y, shade(hex('#7a5a3a'), x / 7, y / 7, 0.8)); line([cx - 5, cy - 6], [sx - shoulderW + 2, capeTop + 2], shade(hex('#4a3220'), 0, -0.5, 0.8)); }
  if (G.weapon === 'bogen' && backItem !== 'koecher' && pose.weaponAt !== 'lehnt') { /* Bogen wird gehalten */ }

  /* ---------- vorderes Bein (sitzend sieht man es vor dem Umhang) ---------- */
  if (!robe || pose.seat !== 'stand') {
    limb(LF[0], LF[1], 4.6, 4, robe ? topC : legsC); ell(LF[1][0], LF[1][1] + 1, 4.4, 4.2, robe ? topC : legsC);
    limb(LF[1], LF[2], 3.6, 3, robe && pose.seat !== 'stand' ? sc(topC, 0.9) : legsC);
  }
  limb([LF[2][0], LF[2][1] - 8], LF[2], 3.4, 3.2, bootC, (x, y) => (Math.abs(y - (LF[2][1] - 8)) < 1 ? 1.25 : 1));
  ell(LF[2][0] + 3, LF[2][1] + 2, 5.5, 3, bootC);
  if (standing && !robe) { /* hinterer Stiefel schon gezeichnet */ }

  /* ---------- Kopf ---------- */
  const [kx, ky] = HEAD, style = plan.hairStyle || 'zopf', beard = plan.beard || null, tilt = pose.tilt || 0;
  const hood = G.hood;
  if (!hood && (style === 'lang' || style === 'wild')) limb([kx - 2, ky + 3], [kx - 4, ky + (style === 'lang' ? 32 : 20)], style === 'lang' ? 6 : 7, style === 'lang' ? 4 : 5, hair, (x, y) => 0.7 + N4.noise(x * 1.3, y * 0.35) * 0.6);
  ell(kx, ky, 8.5, 10, skin);
  if (race === 'elf' && !hood) for (let k = 0; k < 7; k++) { L.set(kx + 7 + k * 0.45, ky - 2 - k, shade(skin, 0.8, -0.3, 0.5)); L.set(kx + 6 + k * 0.45, ky - 1 - k, shade(skin, 0.3, -0.3, 0.9)); }
  else if (!hood) ell(kx + 7, ky + 1, 1.6, 2.4, sc(skin, 0.95));
  // Profilkante: Wange und Nasenspitze rechts (Blick ins Tal), bei geneigtem Kopf tiefer
  L.set(kx + 9, ky + 2 + tilt * 6, shade(skin, 0.9, 0, 0.5)); L.set(kx + 9, ky + 3 + tilt * 6, shade(skin, 0.8, 0.2, 0.5));
  if (beard === 'kurz' || beard === 'lang' || beard === 'zopfbart') {
    const len = beard === 'kurz' ? 5.2 : 9;
    ell(kx + 6, ky + 5 + (len - 5.2) * 0.6 + tilt * 3, 4.2, len, beardC, (x, y) => 0.8 + N4.noise(x * 1.4, y * 0.5) * 0.4);
    if (beard === 'zopfbart') for (let k = 0; k < 3; k++) L.set(kx + 7, ky + 14 + k * 2, flat(hex('#b88a3e'), 0.95));
  } else if (beard === 'stoppel') { for (let y = ky + 2; y < ky + 9; y++) for (let x = kx + 3; x < kx + 9; x++) if ((x + y) % 2 === 0) L.set(x, y, sc(shade(skin, 0.6, 0, 0.7), 0.75)); }
  else if (beard === 'schnurr') { for (let x = kx + 5; x <= kx + 9; x++) L.set(x, ky + 3 + tilt * 4, shade(beardC, 0.5, 0, 0.8)); }
  if (hood) {
    // Kapuze auf: deckt den Kopf, Gesicht im Schatten
    for (let y = ky - 13; y <= ky + 12; y++) for (let x = kx - 11; x <= kx + 10; x++) { const dx = (x + 0.5 - kx + 0.5) / 11, dy = (y + 0.5 - ky + 1) / 12.5; if (dx * dx + dy * dy > 1) continue; if (x > kx + 4 && y > ky - 4 && dx > 0.45) { L.set(x, y, flat(sc(skin, 0.35), 0.6)); continue; } const fold = Math.sin(dx * 6 + N4.noise(x * 0.3, y * 0.3) * 2); L.set(x, y, sc(shade(capeC, dx, dy - 0.3, Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy))), fold > 0.6 ? 1.08 : fold < -0.6 ? 0.82 : 1)); }
    for (let k = 0; k < 6; k++) L.set(kx - 2 - k, ky - 12 - k * 0.6, shade(capeC, -0.3, -0.8, 0.5)); // Zipfel
  } else if (style !== 'glatze') {
    const bump = style === 'locken' || style === 'wild';
    for (let y = ky - 12; y <= ky + 10; y++) for (let x = kx - 10; x <= kx + 9; x++) {
      const dx = (x + 0.5 - (kx - 1)) / 9, dy = (y + 0.5 - (ky - 1)) / 10.5; let rr = dx * dx + dy * dy;
      if (bump) rr -= N4.noise(x * 0.6, y * 0.6) * 0.25;
      if (rr > 1) continue; if (x > kx + 1 && y > ky - 4 + tilt * 3) continue;
      if (style === 'kurz' && y > ky + 5) continue;
      const c = shade(hair, dx, dy, Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)), 1.4);
      L.set(x, y, sc(c, bump ? 0.7 + N4.noise(x * 0.9, y * 0.9) * 0.6 : 0.75 + N4.noise(x * 1.2, y * 0.14) * 0.5));
    }
  } else for (let x = kx - 9; x <= kx + 1; x++) for (let y = ky + 2; y <= ky + 6; y++) if (N4.noise(x, y) > 0.4) L.set(x, y, shade(hair, -0.3, 0, 0.8));
  if (!hood && style === 'zopf') { limb([kx - 5, ky + 5], [kx - 7, ky + 21], 2.2, 1.2, hair, (x, y) => 0.7 + N4.noise(x * 1.5, y * 0.5) * 0.6); for (let k = 0; k < 3; k++) { L.set(kx - 6, ky + 7 + k, flat(hex('#3a2618'), 0.9)); L.set(kx - 5, ky + 7 + k, flat(hex('#3a2618'), 0.9)); } }
  if (!hood && style === 'dutt') ell(kx - 4, ky - 10, 4, 3.6, hair, (x, y) => 0.75 + N4.noise(x * 1.1, y * 0.4) * 0.5);
  // Kapuze zurückgeschlagen im Nacken (ohne Kapuze auf dem Kopf)
  if (!hood && !robe) for (let y = capeTop - 6; y <= capeTop + 7; y++) for (let x = sx - 14 * wide; x <= sx + 13 * wide; x++) { const dx = (x - sx + 0.5) / (14 * wide), dy = (y - capeTop - 1) / 7; if (dx * dx + dy * dy > 1) continue; const fold = Math.sin(dx * 7 + N4.noise(x * 0.3, y * 0.3) * 2); L.set(x, y, sc(shade(capeC, dx, dy - 0.7, 0.6), fold > 0.5 ? 1.08 : fold < -0.6 ? 0.8 : 1)); }
  if (!robe) for (let x = sx - 3; x <= sx + 2; x++) L.set(x, capeTop + 6, flat(trim, 0.95)); // Umhangspange

  /* ---------- Waffe in der Hand / vorn / auf dem Schoß ---------- */
  const hB = armB[2], hF = armF[2];
  if (pose.weaponAt === 'hand_hinten' && G.weapon) {
    // aufgestützt neben sich: unten am Boden, Griff in der hinteren Hand
    const ground = [hB[0] - 4, 241];
    if (G.weapon === 'bogen') drawWeapon('bogen', [hB[0] - 2, hB[1] + 48], [hB[0] + 2, hB[1] - 64]);
    else if (['schwert', 'saebel'].includes(G.weapon)) drawWeapon(G.weapon, ground, [hB[0], hB[1] - 2]);
    else if (G.weapon === 'dolch') drawWeapon('dolch', [hB[0] + 1, hB[1] + 16], [hB[0], hB[1] + 2]);
    else drawWeapon(G.weapon, ground, [ground[0] + 4, ground[1] - longLen]);
  }
  if (pose.weaponAt === 'vorne' && G.weapon) {
    const pom = [(hB[0] + hF[0]) / 2 + 1, (hB[1] + hF[1]) / 2], ground = [pom[0] + 4, 241];
    if (G.weapon === 'bogen') drawWeapon('bogen', [hF[0] + 2, hF[1] + 52], [hF[0] - 2, hF[1] - 62]);
    else if (['schwert', 'saebel'].includes(G.weapon)) drawWeapon(G.weapon, ground, pom);
    else if (G.weapon === 'dolch') drawWeapon('dolch', [pom[0] + 1, pom[1] + 18], pom);
    else drawWeapon(G.weapon, ground, [ground[0] - 2, ground[1] - longLen]);
  }
  if (pose.weaponAt === 'schoss') {
    // Pflege je Rolle: Klinge schärfen, Sehne prüfen, Buch lesen, Kräuter sortieren, Münzen zählen
    const lap = [(hB[0] + hF[0]) / 2, Math.max(hB[1], hF[1]) + 2], k = b ? 2 : 0;
    if (role === 'gelehrter' || (!G.weapon && G.extra.includes('buch'))) {
      for (let y = -3; y <= 3; y++) for (let x = -11; x <= 11; x++) { const page = Math.abs(x) > 0.5; L.set(lap[0] + x, lap[1] + y - Math.abs(x) * 0.18, page ? flat(hex(Math.abs(x) > 10 ? '#6a2a2a' : (x + y) % 4 === 0 ? '#b8a888' : '#efe6cf'), 0.95) : flat(hex('#4a3a2a'), 0.8)); }
      if (b) for (let y = -6; y <= 0; y++) L.set(lap[0] + 4 + y * -0.3, lap[1] + y - 1, flat(hex('#efe6cf'), 1)); // Seite blättert
    } else if (role === 'heiler' && (!G.weapon || G.weapon === 'stab')) {
      ell(lap[0] - 4, lap[1] + 1, 6, 3.4, hex('#8a7a5a'));
      for (let i = 0; i < 9; i++) L.set(lap[0] - 8 + i, lap[1] - 2 - (i % 3), flat(hex(i % 2 ? '#7aaa4a' : '#5a8a3a'), 0.95));
      for (let i = 0; i < 4; i++) L.set(hF[0] + 1, hF[1] - 3 - i + k, flat(hex('#8aba5a'), 0.95));
    } else if (role === 'haendler' && G.weapon === 'dolch') {
      ell(lap[0] - 3, lap[1], 4, 3.6, hex('#8a6a3a'));
      for (let i = 0; i < 3; i++) ell(hF[0] + 1, hF[1] - 2 - i * 1.4 - k, 1.6, 0.8, gold);
    } else if (G.weapon === 'bogen') {
      drawWeapon('bogen', [lap[0] - 26, lap[1] - 6], [lap[0] + 30, lap[1] + 2]);
    } else if (G.weapon === 'stab') {
      drawWeapon('stab', [lap[0] - 30, lap[1] + 4], [lap[0] + 34, lap[1] - 6]);
    } else if (G.weapon) {
      const len = Math.min(56, longLen), dir = [1, -0.06];
      const tip = [lap[0] + len * 0.6, lap[1] - 2], hilt = [lap[0] - len * 0.4, lap[1] + 1];
      if (G.weapon === 'axt') drawWeapon('axt', [lap[0] - 24, lap[1] + 2], [lap[0] + 22, lap[1] - 4]);
      else if (G.weapon === 'speer') drawWeapon('speer', [lap[0] - 50, lap[1] + 3], [lap[0] + 60, lap[1] - 5]);
      else drawWeapon(G.weapon, tip, hilt);
      // Wetzstein in der vorderen Hand
      for (let y = 0; y < 2; y++) for (let x = -3; x <= 3; x++) L.set(hF[0] + x - 2 + k * 2, hF[1] - 2 + y, shade(hex('#7a7d86'), x / 3, -0.4, 0.8));
      void dir;
    }
  }

  /* ---------- vorderer Arm ---------- */
  const sleeveF = G.armor === 'kette' ? hex('#9aa0aa') : G.armor === 'fein' || robe ? topC : capeC;
  const hFx = pose.weaponAt === 'schoss' ? [hF[0] + (b ? 2 : 0), hF[1]] : hF;
  limb(armF[0], armF[1], 3.6, 3.2, sc(sleeveF, 0.85));
  limb(armF[1], hFx, 2.9, 2.6, sleeveF);
  if (G.armor === 'leder' || G.armor === 'kette') limb([armF[1][0] + (hFx[0] - armF[1][0]) * 0.55, armF[1][1] + (hFx[1] - armF[1][1]) * 0.55], [armF[1][0] + (hFx[0] - armF[1][0]) * 0.9, armF[1][1] + (hFx[1] - armF[1][1]) * 0.9], 2.7, 2.6, G.armor === 'kette' ? steelD : hex('#5a3a22'));
  ell(hFx[0], hFx[1], 2.7, 2.5, skin);
  // Pfeife (Rast)
  let pipe = null;
  if (pose.prop === 'pfeife') {
    const px0 = kx + 7, py0 = ky + 5;
    for (let k = 0; k < 6; k++) L.set(px0 + k, py0 + k * 0.2, shade(hex('#5e3a20'), 0.3, -0.5, 0.7));
    ell(px0 + 6.5, py0 - 1, 1.8, 2.3, hex('#5e3a20'));
    pipe = [px0 + 6.5, py0 - 3]; L.set(pipe[0], pipe[1], [1.3, 0.6, 0.2]);
  }
  // Kontur auf der Schattenseite der Figur
  const out = [], dir = Math.sign(CORE.LDIR[0] || 1);
  for (let y = 100; y < 252; y++) for (let x = 20; x < 200; x++) { const i = y * HERO_W + x; if (L.a[i] && !L.a[i - dir] && y < 246) out.push([x - dir, y]); }
  for (const [x, y] of out) L.set(x, y, [0.1, 0.1, 0.14]);
  return { data: toRGBA(L), pipe, fire: pose.fire ? [pose.fire[0], pose.fire[1]] : null, pose: Object.keys(P).find((k) => P[k] === pose) };
}
