// Horde-Kämpfe (Scharmützel und Schlachten) im Stil der „Survivors“-Spiele.
// playBattle(opts) → Promise<{ sieg, aufgegeben, kills, stufe, zeit, boss }>
// opts: { titel, text, dauer (Sekunden, 0 = endlos), schwer (1–3), gegner ('wald'|'banditen'|'gruft'|'berg'|'tiere'), ort, heroPlan, helfer: [{name, beruf, look}], meta }
import { ITEMS, ITEM, PRAEG, MERKMALE, LEGENDEN, partnerVon } from './kampf_items.js?v=1';
import { sheetData, SW, SH } from './chars.js?v=3';
import { iconURL } from './kampf_icons.js?v=1';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const sheetCanvas = (plan) => { const sh = sheetData(plan), cv = document.createElement('canvas'); cv.width = sh.w; cv.height = sh.h; cv.getContext('2d').putImageData(new ImageData(sh.data, sh.w, sh.h), 0, 0); return cv; };
const fmtZeit = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ───────────────────────── Gegner ───────────────────────── */
const ARCH = {
  laeufer: { hp: 14, spd: 30, dmg: 8, r: 6, xp: 1 },
  schnell: { hp: 9, spd: 56, dmg: 6, r: 5, xp: 1 },
  tank: { hp: 70, spd: 21, dmg: 15, r: 9, xp: 4, charge: true },
  schuetze: { hp: 18, spd: 26, dmg: 7, r: 6, xp: 2, shoot: true },
  schwarm: { hp: 5, spd: 48, dmg: 4, r: 4, xp: 1, wobble: true },
};
const H = (o) => ({ skin: '#d49a72', hair: '#2a2018', hairStyle: 'kurz', belt: '#3a2618', boots: '#2a2018', legs: '#3a3028', ...o });
const GEGNER = {
  wald: { name: 'Wald', laeufer: ['Moderling', 'blob', '#5a6a3a', '#c8e070'], schnell: ['Wolf', 'vier', '#7a7068', '#e8d070'], tank: ['Keiler', 'vier', '#5a4030', '#f0e0c0'], schuetze: ['Dornspucker', 'blob', '#4a7a3a', '#f08080'], schwarm: ['Krähe', 'vogel', '#2a2a32', '#e0c040'], boss: ['Der Moderkeiler', 'vier', '#4a3a28', '#a0f070'] },
  banditen: { name: 'Söldner', laeufer: ['Söldner', H({ top: '#5a4a48', cape: '#3a2a2a', hat: 'helm', prop: 'schwert' })], schnell: ['Plünderer', H({ top: '#6a3a30', hairStyle: 'wild', prop: 'messer' })], tank: ['Schildträger', H({ top: '#4a4a52', hat: 'helm', vest: '#7a7a82', prop: 'axt' })], schuetze: ['Armbrustschütze', H({ top: '#4a5038', hat: 'kapuze', cape: '#3a4030', prop: 'bogen' })], schwarm: ['Kampfhund', 'vier', '#5a4030', '#e0e0e0'], boss: ['Vogt Kuno', H({ top: '#8a2020', cape: '#a02828', hat: 'helm', prop: 'schwert', beard: 'kurz' })] },
  gruft: { name: 'Gruft', laeufer: ['Knochenmann', H({ skin: '#e0dccc', hair: '#e0dccc', top: '#cfc8b8', legs: '#bfb8a8', boots: '#a8a090', belt: '#8a8070', prop: 'schwert' })], schnell: ['Schatten', 'geist', '#3a3048', '#ff4060'], tank: ['Grabwächter', H({ skin: '#a8a8a0', top: '#6a6a70', hat: 'helm', vest: '#8a8a90', prop: 'axt' })], schuetze: ['Irrlicht', 'geist', '#6a8ad0', '#ffffff'], schwarm: ['Fledermaus', 'vogel', '#3a2a3a', '#ff6060'], boss: ['Die Gruftwächterin', H({ skin: '#c8c8d8', hair: '#e8e8f0', hairStyle: 'lang', top: '#4a3a6a', cape: '#2a2048', prop: 'stab' })] },
  berg: { name: 'Berg', laeufer: ['Eiswicht', 'blob', '#8ab0c8', '#ffffff'], schnell: ['Bergwolf', 'vier', '#c8c8d0', '#80c0ff'], tank: ['Schneebär', 'vier', '#e0e0e8', '#303040'], schuetze: ['Steinwerfer', H({ skin: '#b89878', top: '#6a5a4a', hairStyle: 'wild', beard: 'lang' })], schwarm: ['Eiskrähe', 'vogel', '#6a7a90', '#c0f0ff'], boss: ['Der weiße Bär', 'vier', '#f0f0f8', '#ff4040'] },
  wildnis: { name: 'Wildnis', laeufer: ['Frischling', 'vier', '#6a5040', '#f0e0c0'], schnell: ['Wolf', 'vier', '#7a7068', '#e8d070'], tank: ['Bär', 'vier', '#5a3a28', '#f0d0a0'], schuetze: ['Dornspucker', 'blob', '#4a7a3a', '#f08080'], schwarm: ['Wespe', 'vogel', '#d8b030', '#202020'], boss: ['Der Höhlenbär', 'vier', '#4a3020', '#ffa040'] },
  tiere: { name: 'Tiere', laeufer: ['Riesenratte', 'vier', '#6a5a50', '#ff6060'], schnell: ['Wiesel', 'vier', '#a07040', '#202020'], tank: ['Dachs', 'vier', '#505050', '#f0f0f0'], schuetze: ['Speikröte', 'blob', '#6a7a3a', '#f0c040'], schwarm: ['Ratte', 'vier', '#5a4a40', '#ff8080'], boss: ['Der Rattenkönig', 'vier', '#4a3a30', '#ffd040'] },
};

function monsterSprite(form, c1, c2, size) {
  // 2 Frames nebeneinander, gezeichnet für Blick nach rechts
  const s = size, cv = document.createElement('canvas'); cv.width = s * 2; cv.height = s; const g = cv.getContext('2d');
  const dark = (h, k) => { const n = parseInt(h.slice(1), 16); const r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255; return `rgb(${r * k | 0},${gg * k | 0},${b * k | 0})`; };
  for (let f = 0; f < 2; f++) {
    const ox = f * s, P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(ox + Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const u = s / 16;
    if (form === 'blob') {
      const sq = f ? 1 : 0;
      P(3 * u, (6 + sq) * u, 10 * u, (9 - sq) * u, dark(c1, 0.55)); P(4 * u, (5 + sq) * u, 8 * u, (9 - sq) * u, c1); P(5 * u, (6 + sq) * u, 3 * u, 2 * u, dark(c1, 1.25));
      P(6 * u, (8 + sq) * u, 1.5 * u, 1.5 * u, c2); P(9 * u, (8 + sq) * u, 1.5 * u, 1.5 * u, c2); P(5 * u, 14 * u, 2 * u, 2 * u, dark(c1, 0.5)); P(9 * u, 14 * u, 2 * u, 2 * u, dark(c1, 0.5));
    } else if (form === 'vier') {
      const lg = f ? 1 : -1;
      P(2 * u, 6 * u, 11 * u, 6 * u, dark(c1, 0.6)); P(3 * u, 5 * u, 10 * u, 6 * u, c1); P(4 * u, 5 * u, 7 * u, 2 * u, dark(c1, 1.2));
      P(11 * u, 4 * u, 4 * u, 4 * u, c1); P(14 * u, 6 * u, 2 * u, 2 * u, dark(c1, 0.7)); P(13 * u, 5 * u, 1 * u, 1 * u, c2); P(11 * u, 3 * u, 1.5 * u, 1.5 * u, dark(c1, 0.8));
      P((4 + lg) * u, 11 * u, 2 * u, 4 * u, dark(c1, 0.5)); P((10 - lg) * u, 11 * u, 2 * u, 4 * u, dark(c1, 0.5)); P((6 - lg) * u, 11 * u, 2 * u, 4 * u, dark(c1, 0.7)); P((12 + lg) * u, 11 * u, 2 * u, 4 * u, dark(c1, 0.7));
      P(1 * u, 5 * u, 2 * u, 2 * u, dark(c1, 0.8));
    } else if (form === 'vogel') {
      const wy = f ? 3 : 8;
      P(5 * u, 7 * u, 6 * u, 4 * u, c1); P(10 * u, 6 * u, 3 * u, 3 * u, c1); P(13 * u, 7 * u, 2 * u, 1 * u, c2); P(11 * u, 7 * u, 1 * u, 1 * u, c2);
      P(2 * u, wy * u, 6 * u, 2 * u, dark(c1, 0.7)); P(8 * u, (wy - 1) * u, 3 * u, 2 * u, dark(c1, 0.8)); P(3 * u, 9 * u, 2 * u, 2 * u, dark(c1, 0.6));
    } else { // geist
      const wv = f ? 1 : 0;
      P(4 * u, 3 * u, 8 * u, 9 * u, c1); P(3 * u, 5 * u, 10 * u, 6 * u, c1); P(5 * u, 4 * u, 3 * u, 2 * u, dark(c1, 1.4));
      for (let i = 0; i < 4; i++) P((4 + i * 2) * u, (12 + ((i + wv) % 2)) * u, 2 * u, 2 * u, c1);
      P(6 * u, 6 * u, 1.5 * u, 2 * u, c2); P(9 * u, 6 * u, 1.5 * u, 2 * u, c2);
    }
  }
  return cv;
}

/* ───────────────────────── Boden ───────────────────────── */
const BODEN = {
  wald: { g: ['#3e5a2e', '#466636', '#365028', '#52703c'], deko: ['baum', 'busch', 'stein', 'pilz'], dichte: 0.22 },
  fluss: { g: ['#4a6a3a', '#527240', '#42603a', '#5a7a46'], deko: ['schilf', 'stein', 'busch'], dichte: 0.15 },
  berg: { g: ['#d8dde4', '#cdd3dc', '#e4e8ee', '#bfc6d0'], deko: ['fels', 'tanne', 'stein'], dichte: 0.14 },
  ruine: { g: ['#6a6a5a', '#5e5e50', '#76766a', '#585848'], deko: ['mauer', 'stein', 'busch'], dichte: 0.16 },
  hoehle: { g: ['#3a3432', '#423a36', '#34302e', '#4a403a'], deko: ['fels', 'knochen', 'stein'], dichte: 0.12 },
  dorf: { g: ['#5a6a3a', '#627240', '#52623a', '#6a7a46'], deko: ['busch', 'stein', 'zaun'], dichte: 0.1 },
  feuer: { g: ['#3e5a2e', '#466636', '#365028', '#52703c'], deko: ['baum', 'busch', 'stein'], dichte: 0.2 },
};
function groundTile(ort) {
  const B = BODEN[ort] || BODEN.wald, cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = B.g[0]; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { g.fillStyle = B.g[1 + (i % 3)]; const x = Math.random() * 128 | 0, y = Math.random() * 128 | 0; g.fillRect(x, y, Math.random() < 0.3 ? 2 : 1, 1); }
  for (let i = 0; i < 26; i++) { g.fillStyle = B.g[3]; const x = Math.random() * 124 | 0, y = Math.random() * 124 | 0; g.fillRect(x, y, 1, 3); g.fillRect(x + 2, y + 1, 1, 2); }
  return cv;
}
function dekoSprite(k) {
  const cv = document.createElement('canvas'); cv.width = 24; cv.height = 28; const g = cv.getContext('2d'); const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  if (k === 'baum') { P(10, 18, 4, 9, '#4a3420'); P(4, 4, 16, 14, '#2e4a24'); P(6, 2, 12, 4, '#3a5a2c'); P(6, 6, 6, 4, '#4a6a34'); P(3, 10, 18, 6, '#2a4220'); }
  else if (k === 'tanne') { P(11, 20, 2, 7, '#4a3420'); for (let i = 0; i < 5; i++) P(12 - i * 2 - 1, 4 + i * 3, i * 4 + 2, 4, i % 2 ? '#2e4a3a' : '#3a5a44'); P(9, 8, 6, 1, '#e8eef4'); P(7, 14, 10, 1, '#e8eef4'); }
  else if (k === 'busch') { P(5, 16, 14, 9, '#2e4a24'); P(7, 14, 10, 4, '#3a5a2c'); P(8, 17, 3, 2, '#4a6a34'); }
  else if (k === 'stein') { P(8, 20, 9, 6, '#6a6a6a'); P(9, 19, 6, 2, '#8a8a8a'); P(8, 25, 9, 1, '#3a3a3a'); }
  else if (k === 'fels') { P(4, 12, 16, 14, '#6a6870'); P(6, 10, 10, 4, '#88868e'); P(4, 25, 16, 2, '#3a383e'); P(13, 14, 2, 8, '#55535a'); }
  else if (k === 'pilz') { P(11, 22, 2, 4, '#e8dcc0'); P(8, 19, 8, 3, '#b83a2a'); P(10, 19, 1, 1, '#ffffff'); }
  else if (k === 'schilf') { for (let i = 0; i < 4; i++) { P(8 + i * 3, 10 + (i % 2) * 3, 1, 16 - (i % 2) * 3, '#6a8a3a'); P(8 + i * 3, 9 + (i % 2) * 3, 1, 3, '#7a5a30'); } }
  else if (k === 'mauer') { P(2, 14, 20, 12, '#7a7668'); for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) P(3 + x * 7 + (y % 2) * 3, 15 + y * 4, 5, 3, '#8a8676'); P(2, 25, 20, 1, '#3a3830'); }
  else if (k === 'knochen') { P(6, 22, 12, 2, '#e0dccc'); P(5, 21, 2, 4, '#e0dccc'); P(17, 21, 2, 4, '#e0dccc'); P(14, 18, 4, 3, '#d8d4c4'); }
  else if (k === 'zaun') { P(2, 16, 20, 2, '#7a5a3a'); P(2, 21, 20, 2, '#7a5a3a'); for (let i = 0; i < 4; i++) P(3 + i * 6, 13, 2, 13, '#6a4a2a'); }
  return cv;
}

/* ───────────────────────── Berufe der Helfer ───────────────────────── */
const HELFER_ART = (beruf = '') => {
  if (/Jäger|Falkner|Pfeil/.test(beruf)) return ['pfeile', 'lässt Pfeile regnen'];
  if (/Schmied|Rüst|Steinmetz|Bergmann|Wache|Söldner|Hauptmann|Metzger/.test(beruf)) return ['schlag', 'schlägt mit voller Wucht zu'];
  if (/Heiler|Kräuter|Alchem|Priester|Mönch|Seher/.test(beruf)) return ['heilen', 'heilt deine Wunden'];
  if (/Holzfäller|Zimmer|Köhler|Wagner/.test(beruf)) return ['aexte', 'wirbelt mit der Axt'];
  if (/Barde|Wirt|Schank|Brauer/.test(beruf)) return ['lied', 'stimmt ein Kampflied an'];
  return ['ruf', 'brüllt einen Schlachtruf'];
};

/* ───────────────────────── Dauerhafte Boni ───────────────────────── */
export function metaBoni(meta = {}) {
  const b = { dmg: 0, cd: 0, speed: 0, crit: 0, magnet: 0, luck: 0, rerolls: 0, xp: 0, hp: 0, regen: 0, armor: 0, projSpd: 0, area: 0, start: {}, quellen: [] };
  const a = meta.attrs || {}, n = (k) => Number(a[k]) || 0;
  b.dmg += n('staerke') * 0.03; b.cd += n('geschick') * 0.02; b.speed += n('geschick') * 0.01; b.crit += n('sinne') * 0.01; b.magnet += n('sinne') * 0.05;
  b.luck += n('charme') * 0.05; b.rerolls += Math.floor(n('charme') / 2); b.xp += n('wissen') * 0.04; b.hp += n('wille') * 6; b.regen += n('wille') * 0.05;
  const AUS = { schwert: ['kurzschwert', 2], dolch: ['wurfmesser', 1], bogen: ['bogen', 2], laterne: ['geisterlaterne', 1], kraeutertasche: ['kraeuterbeutel', 1] };
  for (const it of meta.ausruestung || []) {
    if (AUS[it]) { const [id, lv] = AUS[it]; b.start[id] = Math.max(b.start[id] || 0, lv); b.quellen.push(`${ITEM[id].name} von Anfang an (Stufe ${lv})`); }
    if (it === 'kettenhemd') { b.armor += 3; b.quellen.push('Kettenhemd: +3 Rüstung'); }
    if (it === 'lederwams') { b.armor += 1; b.hp += 10; b.quellen.push('Lederwams: +1 Rüstung, mehr Leben'); }
    if (it === 'dunkler_umhang') { b.speed += 0.06; b.quellen.push('Dunkler Umhang: schneller'); }
    if (it === 'feine_kleidung') { b.luck += 0.2; b.quellen.push('Feine Kleidung: mehr Glück'); }
    if (it === 'seil') { b.magnet += 0.2; }
    if (it === 'dietrich') { b.rerolls += 1; }
    if (it === 'alte_chronik') { b.xp += 0.1; b.quellen.push('Alte Chronik: +10 % Erfahrung'); }
  }
  const GEAR = { gewoehnlich: 0.005, gut: 0.01, selten: 0.02, meister: 0.035, legendaer: 0.06 };
  const gd = Math.min(0.3, (meta.gear || []).reduce((s2, g) => s2 + (GEAR[g] || 0), 0));
  if (gd > 0) { b.dmg += gd; b.quellen.push(`Deine Ausrüstung: +${Math.round(gd * 100)} % Schaden`); }
  for (const [bau, lv0] of Object.entries(meta.bauten || {})) {
    const lv = Number(lv0) || 1;
    if (bau === 'schmiede') { b.dmg += 0.04 * lv; b.quellen.push(`Schmiede: +${4 * lv} % Schaden`); }
    if (bau === 'wachturm') { b.projSpd += 0.05 * lv; b.crit += 0.01 * lv; b.quellen.push('Wachturm: schärfere Augen'); }
    if (bau === 'langhaus') { b.hp += 5 * lv; }
    if (bau === 'heilerhaus' || bau === 'alchemistenturm') { b.regen += 0.15 * lv; b.quellen.push('Heilkundige im Dorf: Leben regeneriert'); }
    if (bau === 'jagdhuette') { b.projSpd += 0.04 * lv; b.speed += 0.01 * lv; }
    if (bau === 'kaserne') { b.armor += lv; b.quellen.push('Waffenkammer: +Rüstung'); }
    if (bau === 'schrein') { b.luck += 0.1 * lv; b.quellen.push('Schrein: mehr Glück'); }
    if (bau === 'schreibstube') { b.xp += 0.05 * lv; b.quellen.push('Schreibstube: mehr Erfahrung'); }
    if (bau === 'gasthaus') { b.hp += 4 * lv; }
  }
  return b;
}

/* ═════════════════════════ Hauptfunktion ═════════════════════════ */
export function playBattle(opts = {}) {
  return new Promise((resolve) => {
    const dauer = opts.dauer ?? 180, endlos = !dauer, schwer = opts.schwer || 2;
    const GS = GEGNER[opts.gegner] || GEGNER.wald, ort = opts.ort || 'wald';
    const meta = metaBoni(opts.meta);

    // ── DOM ──
    const root = el('div', 'hb-root'), cv = el('canvas', 'hb-canvas'), hud = el('div', 'hb-hud');
    const hTop = el('div', 'hb-top'), hZeit = el('span', 'hb-zeit'), hKills = el('span', 'hb-kills'), hLv = el('span', 'hb-lv'), btnPause = el('button', 'hb-pause', 'Ⅱ');
    const xpBar = el('div', 'hb-xp'), xpFill = el('div', 'hb-xpfill'); xpBar.append(xpFill);
    const banner = el('div', 'hb-banner'), ticker = el('div', 'hb-ticker'), bar = el('div', 'hb-bar');
    hTop.append(hLv, hZeit, hKills, btnPause); hud.append(xpBar, hTop, banner, ticker, bar);
    const joy = el('div', 'hb-joy'), joyKnob = el('div', 'hb-joyknob'); joy.append(joyKnob); joy.hidden = true;
    const modal = el('div', 'hb-modal'); modal.hidden = true;
    root.append(cv, hud, joy, modal); document.body.append(root);
    const g = cv.getContext('2d');
    let VW = 300, VH = 300, S = 2;
    function resize() {
      const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
      S = Math.max(1, Math.min(w, h) / 250); VW = Math.ceil(w / S); VH = Math.ceil(h / S);
      cv.width = VW; cv.height = VH; cv.style.width = w + 'px'; cv.style.height = h + 'px'; g.imageSmoothingEnabled = false;
    }
    resize(); addEventListener('resize', resize);

    // ── Grafiken ──
    const ground = g.createPattern(groundTile(ort), 'repeat');
    const B = BODEN[ort] || BODEN.wald, deko = Object.fromEntries(B.deko.map((k) => [k, dekoSprite(k)]));
    const heroCv = sheetCanvas(opts.heroPlan || { skin: '#d9a27a', hair: '#6b4528', hairStyle: 'zopf', top: '#6b4a2e', legs: '#4a3e2c', boots: '#3a2a1e', cape: '#3e5a34', belt: '#3a2618', prop: 'bogen' });
    const SPR = {};
    function sprFor(art, boss) {
      const k = art + (boss ? '_b' : ''); if (SPR[k]) return SPR[k];
      const d = GS[art], big = boss ? 30 : art === 'tank' ? 20 : art === 'schwarm' ? 10 : 14;
      if (typeof d[1] === 'object') SPR[k] = { kind: 'mensch', cv: sheetCanvas(d[1]), scale: boss ? 1.6 : art === 'tank' ? 1.25 : 1 };
      else SPR[k] = { kind: 'mon', cv: monsterSprite(d[1], d[2], d[3], big), size: big };
      return SPR[k];
    }

    // ── Zustand ──
    const P = { x: 0, y: 0, fx: 1, fy: 0, hp: 100, maxhp: 100, inv: 0, shield: 0, walk: 0, dir: 2, moving: false, revive: 0 };
    let t = 0, kills = 0, lvl = 1, xp = 0, xpNeed = 5, paused = false, over = false, rerolls = 2 + meta.rerolls, bossKilled = false, bossOut = false;
    let nextId = 1, spawnAcc = 0, waveAt = 60, eliteAt = 120, bossAt = dauer ? dauer * 0.8 : 300, quakeT = 6, ghostKills = 0;
    const enemies = [], shots = [], zones = [], summons = [], gems = [], fx = [], texts = [], pickups = [];
    const owned = new Map(); // id → { id, lv, t, st }
    const legends = new Map(); // id → { id, t, st }
    let ST = null; // berechnete Spielerwerte
    const grid = new Map(), CELL = 32;

    /* ───────── Werte berechnen ───────── */
    function setCounts() { const c = {}; for (const [id] of owned) for (const tg of ITEM[id].tags) c[tg] = (c[tg] || 0) + 1; return c; }
    function setBoni(c) {
      const o = {};
      for (const [tg, n] of Object.entries(c)) { const M = MERKMALE[tg]; if (!M) continue; for (const [th, [k, v]] of Object.entries(M.sets)) if (n >= +th) o[k] = (o[k] || 0) + v; }
      return o;
    }
    function bundFaktor(id) { // Gabe ↔ Gabe: Werte verstärken sich gegenseitig
      const me = owned.get(id); if (!me || me.lv < 2) return 1; let f = 1;
      for (const p of partnerVon(id)) { const o = owned.get(p); if (o && ITEM[p].typ === 'gabe' && o.lv >= 2) f += (me.lv >= 8 && o.lv >= 8) ? 0.6 : 0.25; }
      return f;
    }
    function recompute() {
      const sc = setCounts(), sb = setBoni(sc), m = { hpMul: 0, armor: 0, projSpd: 0, crit: 0, speed: 0, luck: 0, regen: 0, xp: 0, dmg: 0, burn: 0, frost: 0, coldDmg: 0, chain: 0, cd: 0, poison: 0, beast: 0, area: 0, amount: 0, magnet: 0, dur: 0, thorns: 0, critMul: 0, lvlHeal: 0, revive: 0 };
      for (const [id, o] of owned) { const it = ITEM[id]; if (it.typ !== 'gabe') continue; const f = bundFaktor(id); for (const [k, v] of Object.entries(it.mod(o.lv))) m[k] = (m[k] || 0) + (k === 'revive' ? v : v * f); }
      const old = ST;
      ST = {
        maxhp: Math.round((100 + meta.hp) * (1 + m.hpMul + (sb.heilung ? 0 : 0) + ((sc.natur || 0) >= 8 ? 0.2 : 0))),
        armor: m.armor + meta.armor + (sb.ruestung || 0), regen: m.regen + meta.regen + (sb.regen || 0),
        speed: 74 * (1 + m.speed + meta.speed), magnet: 52 * (1 + m.magnet + meta.magnet),
        dmg: 1 + m.dmg + meta.dmg + (sb.schaden || 0), cd: m.cd + meta.cd + (sb.tempo || 0), area: 1 + m.area + meta.area + (sb.flaeche || 0),
        projSpd: 1 + m.projSpd + meta.projSpd + (sb.reichweite || 0), dur: 1 + m.dur + (sb.dauer || 0), amount: m.amount + (sb.anzahl || 0),
        luck: m.luck + meta.luck, crit: 0.05 + m.crit + meta.crit + (sb.krit || 0), critMul: 2 + m.critMul + ((sc.stahl || 0) >= 8 ? 0.5 : 0),
        xp: 1 + m.xp + meta.xp + (sb.xp || 0), burn: 1 + m.burn + (sb.brand || 0), poison: 1 + m.poison + (sb.giftdmg || 0), frost: m.frost + (sb.frost || 0),
        coldDmg: m.coldDmg + (sb.eisschaden || 0), chain: m.chain + (sb.kette || 0), beast: 1 + m.beast + (sb.ruf || 0), pierce: sb.durch || 0,
        thorns: m.thorns, lvlHeal: m.lvlHeal, heilVoll: !!sb.heilung, brandexplo: !!sb.brandexplo, zerspringen: !!sb.zerspringen, giftsprung: !!sb.giftsprung,
        geisterbonus: !!sb.geisterbonus, beben: !!sb.beben, revive: m.revive, sets: sc,
      };
      if (old) P.hp = Math.min(ST.maxhp, P.hp + Math.max(0, ST.maxhp - old.maxhp)); else P.hp = ST.maxhp;
      P.maxhp = ST.maxhp; if (ST.revive && !P.reviveUsed) P.revive = 1;
      for (const [id, o] of owned) if (ITEM[id].typ === 'waffe') o.st = waffenWerte(id, o.lv);
      for (const l of LEGENDEN) {
        const ok = l.braucht.every((b) => (owned.get(b)?.lv || 0) >= 6);
        if (ok && !legends.has(l.id)) { legends.set(l.id, { id: l.id, t: 0.5, st: null, state: {} }); meldung(`Legende erwacht: ${l.name}!`, l.farbe, true); }
        if (legends.has(l.id)) legends.get(l.id).st = legendenWerte(l);
      }
    }
    function praegungen(id) { // aktive Prägungen auf Waffe id: [{typ, k, von, fused}]
      const me = owned.get(id); if (!me || me.lv < 2) return [];
      const out = [];
      for (const p of partnerVon(id)) { const o = owned.get(p); if (!o || o.lv < 2) continue; const fused = me.lv >= 8 && o.lv >= 8; out.push({ typ: ITEM[p].praeg, k: o.lv * (fused ? 2 : 1), von: p, fused }); }
      return out;
    }
    function modsAus(list) {
      const m = {};
      for (const { typ, k } of list) {
        if (typ === 'krit') m.krit = (m.krit || 0) + 0.05 + k * 0.02;
        else if (typ === 'rueckstoss') m.knock = (m.knock || 0) + 20 + k * 6;
        else if (typ === 'durchbohren') m.pierce = (m.pierce || 0) + 1 + Math.floor(k / 3);
        else if (typ === 'heimsuchen') m.homing = Math.max(m.homing || 0, 2 + k * 0.4);
        else if (typ === 'wucht') m.wucht = (m.wucht || 0) + 0.1 + k * 0.04;
        else if (typ === 'abprall') m.bounce = (m.bounce || 0) + 1 + Math.floor(k / 4);
        else if (typ === 'vervielfachen') m.mehr = (m.mehr || 0) + 1 + Math.floor(k / 5);
        else if (typ === 'lebensraub') m.leech = (m.leech || 0) + 0.005 + k * 0.0025;
        else if (typ === 'brennen') m.burn = (m.burn || 0) + 3 + k * 2;
        else if (typ === 'explodieren') m.explode = Math.min(0.9, (m.explode || 0) + 0.15 + k * 0.03);
        else if (typ === 'frost') { m.frost = Math.min(0.85, (m.frost || 0) + 0.25 + k * 0.03); m.freeze = (m.freeze || 0) + k * 0.02; }
        else if (typ === 'splitter') m.split = (m.split || 0) + 2 + Math.floor(k / 4);
        else if (typ === 'kette') m.chain = (m.chain || 0) + 1 + Math.floor(k / 3);
        else if (typ === 'betaeuben') m.stun = Math.min(0.8, (m.stun || 0) + 0.08 + k * 0.02);
        else if (typ === 'gift') m.poison = (m.poison || 0) + 2 + k * 1.5;
        else if (typ === 'dornen') m.thorns = (m.thorns || 0) + 3 + Math.floor(k / 2);
        else if (typ === 'groesse') m.groesse = (m.groesse || 0) + 0.1 + k * 0.04;
        else if (typ === 'geister') m.spirit = Math.min(0.9, (m.spirit || 0) + 0.08 + k * 0.02);
        else if (typ === 'blutung') m.bleed = (m.bleed || 0) + 4 + k * 2;
        else if (typ === 'tempo') m.tempo = (m.tempo || 0) + 0.08 + k * 0.03;
        else if (typ === 'fluch') m.curse = Math.max(m.curse || 0, 0.08 + k * 0.02);
        else if (typ === 'schild') m.shield = (m.shield || 0) + 0.04 + k * 0.01;
      }
      return m;
    }
    const EIGEN = { fackel: { burn: 6 }, eiszapfen: { frost: 0.3 }, frostkranz: { frost: 0.25 }, sturmglocke: { knock: 26 }, moorkrug: { poison: 4 }, wurzelschlag: { stun: 0.6 }, kriegshorn: { knock: 60, curse: 0.15 }, kriegshammer: { stun: 0.2 }, kraeuterbeutel: { curse: 0.08 }, wolfsgeist: { bleed: 4 } };
    function waffenWerte(id, lv) {
      const it = ITEM[id], b = it.st(lv), pr = praegungen(id), m = modsAus(pr), fused = pr.some((p) => p.fused);
      for (const [k, v] of Object.entries(EIGEN[id] || {})) m[k] = (m[k] || 0) + v;
      const tier = it.tags.includes('tier') ? ST.beast : 1;
      const proj = !['kurzschwert', 'kraeuterbeutel', 'sturmglocke', 'kriegshorn', 'kriegshammer', 'sonnenspiegel', 'morgenstern', 'fackel'].includes(id);
      return {
        dmg: b.dmg * ST.dmg * (1 + (m.wucht || 0)) * (fused ? 1.5 : 1) * tier,
        cd: Math.max(0.08, (b.cd || 0.5) / (1 + ST.cd + (m.tempo || 0))),
        n: (b.n || 1) + (proj ? ST.amount : 0) + (m.mehr || 0),
        area: (b.area || 10) * ST.area * (1 + (m.groesse || 0)),
        spd: (b.spd || 200) * (typeof b.spd === 'number' && b.spd < 10 ? 1 : ST.projSpd),
        dur: (b.dur || 1) * ST.dur, pierce: (b.pierce || 0) + (m.pierce || 0) + ST.pierce, bounce: (b.bounce || 0) + (m.bounce || 0),
        m: { ...m, chain: m.chain ? m.chain + ST.chain : 0 }, fused, pr,
      };
    }
    function legendenWerte(l) {
      const sum = l.braucht.reduce((s, b) => s + (owned.get(b)?.lv || 0), 0), k = 1 + (sum - 18) * 0.12;
      const m = modsAus(l.braucht.map((b) => ({ typ: ITEM[b].praeg, k: owned.get(b)?.lv || 1 })));
      return { k, dmg: 30 * k * ST.dmg, m: { ...m, chain: m.chain ? m.chain + ST.chain : 0 }, area: ST.area };
    }

    /* ───────── Hilfen ───────── */
    function rebuildGrid() { grid.clear(); for (const e of enemies) { const k = ((e.x / CELL) | 0) + ',' + ((e.y / CELL) | 0); let c = grid.get(k); if (!c) grid.set(k, (c = [])); c.push(e); } }
    function near(x, y, r) {
      const out = [], x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
      for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) { const c = grid.get(gx + ',' + gy); if (!c) continue; for (const e of c) { if (e.dead) continue; const dx = e.x - x, dy = e.y - y, rr = r + e.r; if (dx * dx + dy * dy <= rr * rr) out.push(e); } }
      return out;
    }
    function nearest(x, y, maxR = 400, skip) {
      let best = null, bd = maxR * maxR;
      for (const e of enemies) { if (e.dead || (skip && skip.has(e))) continue; const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = e; } }
      return best;
    }
    function randomEnemy(r = 200) { const c = enemies.filter((e) => !e.dead && Math.abs(e.x - P.x) < r && Math.abs(e.y - P.y) < r); return c.length ? pick(c) : null; }
    function onScreen(x, y, pad = 20) { return Math.abs(x - P.x) < VW / 2 + pad && Math.abs(y - P.y) < VH / 2 + pad; }
    function meldung(txt, col = '#f0c870', gross = false) { const d = el('div', 'hb-msg' + (gross ? ' gross' : ''), txt); d.style.color = col; ticker.prepend(d); setTimeout(() => d.remove(), gross ? 4200 : 2600); while (ticker.children.length > 5) ticker.lastChild.remove(); }
    function zahl(x, y, v, col, big) { if (texts.length > 70) texts.shift(); texts.push({ x: x + rnd(-3, 3), y, v: Math.round(v), col, big, t: 0 }); }
    function heal(v) { if (v <= 0) return; P.hp = Math.min(P.maxhp, P.hp + v); }

    /* ───────── Treffer ───────── */
    function hit(e, dmg, m = {}, sx = P.x, sy = P.y, sec = false) {
      if (e.dead) return;
      let d = dmg, crit = false;
      if (Math.random() < ST.crit + (m.krit || 0)) { d *= ST.critMul; crit = true; }
      if (e.curse > 0) d *= 1 + e.curse;
      if (e.slowT > 0 || e.freezeT > 0) d *= 1 + ST.coldDmg;
      if (e.boss) d *= 0.85;
      e.hp -= d; e.flash = 0.08;
      if (crit || d >= 30 || texts.length < 22) zahl(e.x, e.y - e.r - 2, d, crit ? '#ffe060' : '#ffffff', crit);
      if (m.leech) heal(d * m.leech);
      if (m.knock && !e.boss) { const dx = e.x - sx, dy = e.y - sy, l = Math.hypot(dx, dy) || 1, f = m.knock / (e.arch === 'tank' ? 2.5 : 1); e.kx += (dx / l) * f * 4; e.ky += (dy / l) * f * 4; }
      if (m.frost) { e.slow = Math.max(e.slow, Math.min(0.9, m.frost + ST.frost)); e.slowT = 2.2; if (m.freeze && Math.random() < m.freeze && !e.boss) e.freezeT = 1.2; }
      if (m.stun && Math.random() < m.stun) e.stunT = Math.max(e.stunT, e.boss ? 0.25 : 0.9);
      if (m.burn) { e.burnDps = Math.max(e.burnDps, m.burn * ST.burn); e.burnT = 3; }
      if (m.poison) { e.poisonN = Math.min(10, e.poisonN + 1); e.poisonDps = Math.max(e.poisonDps, m.poison * ST.poison); e.poisonT = 4.5; }
      if (m.bleed) { e.bleedN = Math.min(5, e.bleedN + 1); e.bleedDps = Math.max(e.bleedDps, m.bleed); e.bleedT = 3; }
      if (m.curse) { e.curse = Math.max(e.curse, m.curse); e.curseT = 4; }
      if (m.shield && Math.random() < m.shield) P.shield = Math.min(3, P.shield + 1);
      if (!sec) {
        if (m.explode && Math.random() < m.explode) blast(e.x, e.y, 26 * ST.area, d * 0.6, { col: '#ffb050', sec: true, m: { burn: m.burn } });
        if (m.chain) kette(e, d * 0.7, m.chain, m);
      }
      if (e.hp <= 0) tod(e, m);
    }
    function kette(start, dmg, n, m) {
      let cur = start; const seen = new Set([start]);
      for (let i = 0; i < n; i++) {
        let best = null, bd = 90 * 90;
        for (const e of near(cur.x, cur.y, 90)) { if (seen.has(e)) continue; const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2; if (d < bd) { bd = d; best = e; } }
        if (!best) break; seen.add(best); fx.push({ k: 'blitz', x: cur.x, y: cur.y, x2: best.x, y2: best.y, t: 0, life: 0.18 });
        hit(best, dmg, { ...m, chain: 0, explode: 0 }, cur.x, cur.y, true); cur = best;
      }
    }
    function blast(x, y, r, dmg, o = {}) {
      for (const e of near(x, y, r)) hit(e, dmg, o.m || {}, x, y, !!o.sec);
      if (!o.quiet) fx.push({ k: o.kind || 'ring', x, y, r, t: 0, life: o.life || 0.3, col: o.col || '#ffffff' });
    }
    function tod(e, m = {}) {
      if (e.dead) return; e.dead = true; kills++;
      gems.push({ x: e.x, y: e.y, v: e.xp });
      if (e.elite || e.boss) pickups.push({ x: e.x, y: e.y, k: 'truhe', n: e.boss ? 6 : 3 });
      else if (Math.random() < 0.006) pickups.push({ x: e.x, y: e.y, k: 'brot' });
      else if (Math.random() < 0.002) pickups.push({ x: e.x, y: e.y, k: 'magnet' });
      if (e.boss) { bossKilled = true; meldung(`${e.name} ist besiegt!`, '#ffe070', true); }
      fx.push({ k: 'puff', x: e.x, y: e.y, t: 0, life: 0.35, col: e.col || '#aaaaaa', r: e.r });
      if (m.thorns) for (let i = 0; i < m.thorns; i++) { const a = (i / m.thorns) * TAU; shots.push(mkShot({ x: e.x, y: e.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, r: 2, dmg: 8 + m.thorns * 2, life: 0.5, shape: 'dorn', col: '#8ac050', m: {}, sec: true })); }
      if (m.spirit && Math.random() < m.spirit) geist(e.x, e.y, 14 * ST.dmg);
      if (ST.geisterbonus && ++ghostKills % 20 === 0) geist(e.x, e.y, 20 * ST.dmg);
      if (ST.brandexplo && e.burnT > 0) blast(e.x, e.y, 28 * ST.area, 12 + e.burnDps * 2, { col: '#ff7030', sec: true });
      if (ST.zerspringen && e.freezeT > 0) blast(e.x, e.y, 30 * ST.area, 20 * ST.dmg, { col: '#c0f0ff', sec: true, m: { frost: 0.4 } });
      if (ST.giftsprung && e.poisonN > 0) for (const o of near(e.x, e.y, 50).slice(0, 3)) { o.poisonN = Math.min(10, o.poisonN + Math.ceil(e.poisonN / 2)); o.poisonDps = Math.max(o.poisonDps, e.poisonDps); o.poisonT = 4.5; }
    }
    function geist(x, y, dmg) { shots.push(mkShot({ x, y, vx: rnd(-40, 40), vy: -60, r: 3, dmg, life: 3, shape: 'geist', col: '#c8b0ff', homing: 6, m: {}, sec: true })); }

    /* ───────── Geschosse, Zonen, Beschwörungen ───────── */
    function mkShot(o) { return { id: nextId++, hit: new Map(), rehit: 99, pierce: 0, bounce: 0, rot: 0, t: 0, ...o }; }
    function schuss(st, x, y, ang, spd, o = {}) {
      const s = mkShot({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 3, dmg: st.dmg, life: 1.6, pierce: st.pierce, bounce: st.bounce, m: st.m, homing: st.m.homing || 0, split: st.m.split || 0, ...o });
      shots.push(s); return s;
    }
    function bogenHit(st, ang, r, spread, dmg, col) { // Hieb im Bogen
      for (const e of near(P.x, P.y, r)) { let a = Math.atan2(e.y - P.y, e.x - P.x) - ang; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) <= spread) hit(e, dmg, st.m, P.x, P.y); }
      fx.push({ k: 'hieb', x: P.x, y: P.y, r, a: ang, s: spread, t: 0, life: 0.18, col });
    }
    function linie(st, x, y, ang, len, w, dmg, col, kind = 'stoss') {
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, dx = ex - x, dy = ey - y, L2 = dx * dx + dy * dy;
      for (const e of near((x + ex) / 2, (y + ey) / 2, len / 2 + w)) { const tt = clamp(((e.x - x) * dx + (e.y - y) * dy) / L2, 0, 1), px = x + dx * tt, py = y + dy * tt; if ((e.x - px) ** 2 + (e.y - py) ** 2 <= (w + e.r) ** 2) hit(e, dmg, st.m, x, y); }
      fx.push({ k: kind, x, y, x2: ex, y2: ey, w, t: 0, life: kind === 'strahl' ? 0.08 : 0.16, col });
    }
    const facing = () => Math.atan2(P.fy, P.fx);

    /* ───────── Waffen ───────── */
    const FIRE = {
      kurzschwert(st) { const a = facing(); bogenHit(st, a, st.area, 1.1, st.dmg, '#e8ecf4'); if (st.n >= 2) setTimeout(() => !over && bogenHit(st, a + Math.PI, st.area, 1.1, st.dmg, '#e8ecf4'), 90); for (let i = 2; i < st.n; i++) bogenHit(st, a + (i % 2 ? 1.57 : -1.57), st.area, 0.9, st.dmg, '#e8ecf4'); },
      wurfaxt(st) { for (let i = 0; i < st.n; i++) schuss(st, P.x, P.y, 0, 0, { vx: P.fx * 40 + rnd(-70, 70), vy: -190 - rnd(0, 50), grav: 330, r: st.area, life: 2.4, pierce: 99, shape: 'axt', col: '#c8c0b0', rehit: 99 }); },
      speer(st) { const a = facing(); for (let i = 0; i < st.n; i++) linie(st, P.x, P.y, a + (i - (st.n - 1) / 2) * 0.22, st.area, 6, st.dmg, '#d8c090', 'stoss'); },
      bogen(st) { const skip = new Set(); for (let i = 0; i < st.n; i++) { const e = nearest(P.x, P.y, 260, skip); if (e) skip.add(e); const a = e ? Math.atan2(e.y - P.y, e.x - P.x) : facing() + rnd(-0.3, 0.3); schuss(st, P.x, P.y, a, st.spd, { shape: 'pfeil', col: '#e8e0c8', life: 1.4 }); } },
      armbrust(st) { const a = facing(); for (let i = 0; i < st.n; i++) schuss(st, P.x, P.y, a + (i - (st.n - 1) / 2) * 0.12, st.spd, { shape: 'bolzen', col: '#a89060', r: 3, life: 1.5 }); },
      schleuder(st) { const skip = new Set(); for (let i = 0; i < st.n; i++) { const e = nearest(P.x, P.y, 240, skip); if (e) skip.add(e); const a = e ? Math.atan2(e.y - P.y, e.x - P.x) : rnd(0, TAU); schuss(st, P.x, P.y, a, st.spd, { shape: 'stein', col: '#b0b0b0', bounce: st.bounce, life: 1.6 }); } },
      wurfmesser(st) { const a = facing(); for (let i = 0; i < st.n; i++) schuss(st, P.x + rnd(-2, 2), P.y + rnd(-2, 2), a + (i - (st.n - 1) / 2) * 0.13, st.spd * rnd(0.92, 1.08), { shape: 'messer', col: '#f0f4f8', life: 0.9 }); },
      kraeuterbeutel(st) { let any = false; for (const e of near(P.x, P.y, st.area)) { hit(e, st.dmg, st.m, P.x, P.y, true); any = true; } if (any) heal(0.05 * owned.get('kraeuterbeutel').lv); },
      fackel(st) { const a = facing(), n = 7 + Math.round(owned.get('fackel').lv * 1.2); for (let i = 0; i < n; i++) schuss(st, P.x, P.y, a + rnd(-0.45, 0.45), rnd(110, 170) * (st.area / 60), { shape: 'flamme', col: '#ff9a3a', r: 4, life: 0.42 * st.dur, pierce: 99, rehit: 99, fade: true }); },
      glutstein(st) { for (let i = 0; i < st.n; i++) { const e = randomEnemy(180); const a = e ? Math.atan2(e.y - P.y, e.x - P.x) : rnd(0, TAU); schuss(st, P.x, P.y, a, st.spd, { shape: 'glut', col: '#ff6a2a', r: 4, life: 1.3, boom: st.area }); } },
      eiszapfen(st) { for (let i = 0; i < st.n; i++) { const e = randomEnemy(170); const x = e ? e.x : P.x + rnd(-120, 120), y = e ? e.y : P.y + rnd(-90, 90); fx.push({ k: 'zapfen', x, y, t: 0, life: 0.35 }); setTimeout(() => { if (!over) blast(x, y, st.area, st.dmg, { m: st.m, col: '#c8f0ff', kind: 'eis' }); }, 350); } },
      frostkranz(st, w) { for (let i = 0; i < st.n; i++) shots.push(mkShot({ x: P.x, y: P.y, orbit: { a: (i / st.n) * TAU, r: st.area, w: st.spd }, r: 5, dmg: st.dmg, life: st.dur, pierce: 99, rehit: 0.5, shape: 'kristall', col: '#c8f0ff', m: st.m, split: st.m.split || 0 })); w.t = st.cd + st.dur * 0.3; },
      donnerkeil(st) { for (let i = 0; i < st.n; i++) { const e = randomEnemy(180); if (!e) break; fx.push({ k: 'einschlag', x: e.x, y: e.y, t: 0, life: 0.22 }); blast(e.x, e.y, st.area, st.dmg, { m: st.m, col: '#fff27a', quiet: true }); } },
      sturmglocke(st) { blast(P.x, P.y, st.area, st.dmg, { m: st.m, col: '#f0e090', kind: 'welle', life: 0.45 }); },
      moorkrug(st) { for (let i = 0; i < st.n; i++) { const e = randomEnemy(160); const tx = e ? e.x : P.x + rnd(-100, 100), ty = e ? e.y : P.y + rnd(-80, 80); const s = schuss(st, P.x, P.y, Math.atan2(ty - P.y, tx - P.x), Math.min(260, Math.hypot(tx - P.x, ty - P.y) / 0.45), { shape: 'krug', col: '#8ab04a', life: 0.45, pierce: 99, rehit: 99, dmg: 0, pool: { r: st.area, dmg: st.dmg, life: st.dur, m: st.m } }); s.noHit = true; } },
      dornenranke(st) { const L = st.area; for (let i = 0; i < st.n; i++) linie(st, P.x, P.y, (i / st.n) * TAU + t * 0.3, L, 7, st.dmg, '#7ab04a', 'dornen'); },
      wurzelschlag(st) { const c = enemies.filter((e) => !e.dead && Math.abs(e.x - P.x) < 150 && Math.abs(e.y - P.y) < 120); for (let i = 0; i < st.n && c.length; i++) { const e = c.splice(Math.floor(Math.random() * c.length), 1)[0]; blast(e.x, e.y, st.area, st.dmg, { m: st.m, col: '#a07a40', kind: 'wurzel', life: 0.5 }); } },
      geisterlaterne(st) { for (let i = 0; i < st.n; i++) schuss(st, P.x, P.y, rnd(0, TAU), st.spd, { shape: 'geist', col: '#c8b0ff', homing: Math.max(5, st.m.homing || 0), life: 2.4, r: 3 }); },
      rabenschwarm(st) { syncSummons('rabe', st.n, st); },
      wolfsgeist(st) { syncSummons('wolf', st.n, st); },
      bienenkorb(st) { const alive = summons.filter((s) => s.kind === 'biene').length; if (alive < st.n * 6) summons.push({ kind: 'biene', x: P.x, y: P.y, life: st.dur, st, cd: 0, a: rnd(0, TAU) }); },
      kriegshorn(st) { bogenHit(st, facing(), st.area, 0.8, st.dmg, '#f0d8a0'); fx.push({ k: 'welle', x: P.x, y: P.y, r: st.area * 0.6, t: 0, life: 0.35, col: '#f0d8a0' }); },
      bumerang(st) { const skip = new Set(); for (let i = 0; i < st.n; i++) { const e = nearest(P.x, P.y, 220, skip); if (e) skip.add(e); const a = e ? Math.atan2(e.y - P.y, e.x - P.x) : facing() + i * 0.5; schuss(st, P.x, P.y, a, st.spd, { shape: 'bumerang', col: '#d0a070', r: 5, life: 2.2, pierce: 99, boomer: 0.55, rehit: 99 }); } },
      morgenstern(st, w) { const have = shots.filter((s) => s.morgen).length; if (have !== st.n) { for (const s of shots) if (s.morgen) s.life = 0; for (let i = 0; i < st.n; i++) shots.push(mkShot({ x: P.x, y: P.y, morgen: true, orbit: { a: (i / st.n) * TAU, r: st.area, w: st.spd }, r: 6, dmg: st.dmg, life: 1e9, pierce: 99, rehit: 0.45, shape: 'kugel', col: '#9aa0a8', m: st.m })); } else for (const s of shots) if (s.morgen) { s.dmg = st.dmg; s.orbit.r = st.area; s.orbit.w = st.spd; s.m = st.m; } w.t = 0.5; },
      kriegshammer(st) { blast(P.x, P.y, st.area, st.dmg, { m: st.m, col: '#c8a878', kind: 'beben', life: 0.4 }); shake = Math.max(shake, 3); },
      runenstein(st) { for (let i = 0; i < st.n; i++) zones.push({ x: P.x + rnd(-12, 12), y: P.y + rnd(-12, 12), r: 10, kind: 'rune', life: st.dur, t: 0, trig: st.area, dmg: st.dmg, m: st.m }); },
      sonnenspiegel(st, w) { w.state.a = (w.state.a || 0) + st.spd * st.cd; for (let i = 0; i < st.n; i++) linie(st, P.x, P.y, w.state.a + (i / st.n) * TAU, st.area, 5, st.dmg * st.cd * 2.5, '#fff4b0', 'strahl'); },
      mondsichel(st) { for (let i = 0; i < st.n; i++) shots.push(mkShot({ x: P.x, y: P.y, spiral: { a: (i / st.n) * TAU + t, r: 4, w: 3.2, v: st.spd * 0.35 }, r: 5, dmg: st.dmg, life: 2.4, pierce: 99, rehit: 99, shape: 'sichel', col: '#e0d8ff', m: st.m, split: st.m.split || 0 })); },
    };
    function syncSummons(kind, n, st) {
      const mine = summons.filter((s) => s.kind === kind);
      for (let i = mine.length; i < n; i++) summons.push({ kind, x: P.x + rnd(-20, 20), y: P.y + rnd(-20, 20), st, cd: 0, a: (i / n) * TAU, life: 1e9 });
      for (const s of mine) s.st = st;
    }

    /* ───────── Legenden ───────── */
    const LFIRE = {
      feuersturm(L, w) { const n = 8, have = shots.filter((s) => s.leg === 'feuersturm'); if (have.length < n) for (let i = have.length; i < n; i++) shots.push(mkShot({ x: P.x, y: P.y, leg: 'feuersturm', orbit: { a: (i / n) * TAU, r: 78 * L.area, w: 3.4 }, r: 6, dmg: L.dmg, life: 1e9, pierce: 99, rehit: 0.3, shape: 'glut', col: '#ff7a2a', m: { ...L.m, burn: (L.m.burn || 0) + 12 * L.k } })); for (const s of have) { s.dmg = L.dmg; s.orbit.r = 78 * L.area; } w.t = 1; },
      ewigerwinter(L, w) { blast(P.x, P.y, 230 * L.area, L.dmg * 1.5, { m: { ...L.m, frost: 0.8, freeze: 1 }, col: '#d8f8ff', kind: 'welle', life: 0.7 }); w.t = 6; },
      gewitterzorn(L, w) { for (let i = 0; i < 3; i++) { const e = randomEnemy(200); if (!e) break; fx.push({ k: 'einschlag', x: e.x, y: e.y, t: 0, life: 0.2 }); blast(e.x, e.y, 22, L.dmg, { m: { ...L.m, chain: (L.m.chain || 0) + 2 }, quiet: true }); } w.t = 0.18; },
      wildejagd(L, w) { const st = { dmg: L.dmg * 0.9, spd: 300, m: L.m, area: 20 }; const mine = summons.filter((s) => s.kind === 'jagdwolf'); for (let i = mine.length; i < 4; i++) summons.push({ kind: 'jagdwolf', x: P.x, y: P.y, st, cd: 0, a: 0, life: 1e9 }); for (const s of mine) s.st = st; w.t = 1; },
      weltenwurzel(L, w) { for (let i = 0; i < 5; i++) { const e = randomEnemy(180); if (!e) break; blast(e.x, e.y, 30 * L.area, L.dmg, { m: { ...L.m, stun: 0.8 }, col: '#6acf4a', kind: 'wurzel', life: 0.5 }); } heal(1.6 * L.k); w.t = 0.8; },
      klingentanz(L, w) { const have = shots.filter((s) => s.leg === 'klingen'); if (have.length < 6) for (let i = have.length; i < 6; i++) shots.push(mkShot({ x: P.x, y: P.y, leg: 'klingen', orbit: { a: (i / 6) * TAU, r: 42 * L.area, w: 6 }, r: 5, dmg: L.dmg * 0.6, life: 1e9, pierce: 99, rehit: 0.25, shape: 'messer', col: '#ffffff', m: L.m })); for (const s of have) s.dmg = L.dmg * 0.6; for (let i = 0; i < 8; i++) schuss({ dmg: L.dmg * 0.5, pierce: 2, bounce: 0, m: L.m }, P.x, P.y, (i / 8) * TAU + t, 420, { shape: 'messer', col: '#ffffff', life: 0.6 }); w.t = 0.45; },
      seuchenwind(L, w) { blast(P.x, P.y, 120 * L.area, L.dmg * 0.25, { m: { ...L.m, poison: (L.m.poison || 0) + 10 * L.k }, quiet: true }); w.t = 0.4; },
      totentanz(L, w) { geist(P.x + rnd(-20, 20), P.y + rnd(-20, 20), L.dmg * 0.7); w.t = 0.22; },
      ahnenhammer(L, w) { blast(P.x, P.y, 260 * L.area, L.dmg * 3, { m: { ...L.m, stun: 1 }, col: '#f0d8a0', kind: 'beben', life: 0.6 }); shake = 8; w.t = 4; },
      sonnenrad(L, w) { w.state.a = (w.state.a || 0) + 0.1 * 2.2; for (let i = 0; i < 4; i++) linie({ m: L.m }, P.x, P.y, w.state.a + (i / 4) * TAU, 170 * L.area, 6, L.dmg * 0.35, '#fff4c0', 'strahl'); w.t = 0.1; },
      pfeilregen(L, w) { for (let i = 0; i < 3; i++) { const x = P.x + P.fx * 60 + rnd(-90, 90), y = P.y + P.fy * 60 + rnd(-70, 70); fx.push({ k: 'pfeilfall', x, y, t: 0, life: 0.15 }); setTimeout(() => !over && blast(x, y, 12, L.dmg * 0.6, { m: L.m, quiet: true }), 150); } w.t = 0.1; },
      sturmwirbel(L, w) { const have = shots.filter((s) => s.leg === 'wirbel'); if (have.length < 6) for (let i = have.length; i < 6; i++) shots.push(mkShot({ x: P.x, y: P.y, leg: 'wirbel', orbit: { a: (i / 6) * TAU, r: 95 * L.area, w: 2.6 }, r: 8, dmg: L.dmg, life: 1e9, pierce: 99, rehit: 0.35, shape: i % 2 ? 'axt' : 'bumerang', col: '#e0c8a0', m: L.m })); for (const s of have) { s.dmg = L.dmg; s.orbit.r = 95 * L.area; } w.t = 1; },
    };

    /* ───────── Helfer aus dem Dorf / Begleiter ───────── */
    const helferListe = (opts.helfer || []).filter((h) => h && h.name).slice(0, 4).map((h) => ({ ...h, cv: h.look ? sheetCanvas({ ...h.look }) : null, art: HELFER_ART(h.beruf) }));
    let helferT = 18, helferIdx = 0, aktiv = null;
    function helferKommt() {
      const h = helferListe[helferIdx++ % helferListe.length];
      aktiv = { ...h, x: P.x - 30, y: P.y - 10, t: 0, life: 12, cd: 0 };
      meldung(`${h.name} ${h.art[1]}!`, '#9fd8ff', true);
      if (h.art[0] === 'heilen') heal(P.maxhp * 0.35);
    }
    function helferTick(dt) {
      const a = aktiv; a.t += dt; a.cd -= dt;
      const tx = P.x - P.fx * 26 + Math.cos(t * 2) * 6, ty = P.y - P.fy * 26 - 6; a.x += (tx - a.x) * Math.min(1, dt * 4); a.y += (ty - a.y) * Math.min(1, dt * 4);
      const D = 22 * ST.dmg * (1 + lvl * 0.04);
      if (a.cd <= 0) {
        const k = a.art[0];
        if (k === 'pfeile') { for (let i = 0; i < 10; i++) schuss({ dmg: D, pierce: 1, bounce: 0, m: {} }, a.x, a.y, (i / 10) * TAU + t, 320, { shape: 'pfeil', col: '#e8e0c8', life: 1 }); a.cd = 0.8; }
        else if (k === 'schlag') { blast(a.x, a.y, 70, D * 2.2, { m: { stun: 0.5, knock: 40 }, col: '#d8b888', kind: 'beben', life: 0.4 }); shake = Math.max(shake, 2); a.cd = 1.1; }
        else if (k === 'heilen') { heal(P.maxhp * 0.04); blast(a.x, a.y, 60, D * 0.6, { m: { curse: 0.2 }, col: '#9ff0a0', kind: 'welle', life: 0.4 }); a.cd = 1; }
        else if (k === 'aexte') { for (let i = 0; i < 3; i++) shots.push(mkShot({ x: a.x, y: a.y, orbit: { a: (i / 3) * TAU, r: 40, w: 5, um: a }, r: 6, dmg: D, life: 1.2, pierce: 99, rehit: 0.3, shape: 'axt', col: '#c8c0b0', m: {} })); a.cd = 1.2; }
        else if (k === 'lied') { a.cd = 99; buffT = a.life; meldung('Alle Waffen 40 % schneller!', '#9fd8ff'); }
        else { blast(a.x, a.y, 120, D, { m: { knock: 80, curse: 0.25 }, col: '#ffd8a0', kind: 'welle', life: 0.5 }); a.cd = 2; }
      }
      if (a.t >= a.life) aktiv = null;
    }
    let buffT = 0, shake = 0;

    /* ───────── Gegner erzeugen ───────── */
    function scale() { const f = t / 60, diff = [0.75, 0.75, 1, 1.35][schwer] || 1; const erwartet = 1 + f * 10, vor = Math.max(0, (lvl - erwartet) / 15); return (1 + 0.3 * f + 0.045 * f * f) * diff * (1 + Math.min(1.2, vor) * 0.5); }
    function spawn(art, opt = {}) {
      const A = ARCH[art], d = GS[art], ang = opt.ang ?? rnd(0, TAU), extra = rnd(14, 40);
      const k = scale(), elite = !!opt.elite, boss = !!opt.boss;
      const hp = A.hp * k * (elite ? 14 : 1) * (boss ? 120 + t * 0.25 : 1);
      const e = { id: nextId++, arch: art, name: boss ? d[0] : (elite ? 'Anführer: ' : '') + d[0], x: P.x + Math.cos(ang) * (VW / 2 + extra), y: P.y + Math.sin(ang) * (VH / 2 + extra), r: A.r * (elite ? 1.6 : 1) * (boss ? 2.6 : 1), hp, maxhp: hp, spd: A.spd * (1 + Math.min(0.5, t / 600)) * (boss ? 0.9 : 1), dmg: A.dmg * (1 + t / 240) * (boss ? 2 : elite ? 1.5 : 1) * ([1, 0.8, 1, 1.25][schwer] || 1), xp: A.xp * (elite ? 25 : 1) * (boss ? 80 : 1), elite, boss, kx: 0, ky: 0, slow: 0, slowT: 0, freezeT: 0, stunT: 0, burnDps: 0, burnT: 0, poisonN: 0, poisonDps: 0, poisonT: 0, bleedN: 0, bleedDps: 0, bleedT: 0, curse: 0, curseT: 0, flash: 0, anim: rnd(0, 2), shootT: rnd(1.5, 3), chargeT: rnd(3, 6), col: typeof d[1] === 'string' ? d[2] : (d[1].top || '#888'), spr: sprFor(art, boss), wob: rnd(0, TAU) };
      enemies.push(e); return e;
    }
    function mix() {
      const f = t / 60, r = Math.random();
      if (f < 0.6) return r < 0.7 ? 'laeufer' : 'schwarm';
      if (f < 1.5) return r < 0.5 ? 'laeufer' : r < 0.75 ? 'schnell' : 'schwarm';
      return r < 0.36 ? 'laeufer' : r < 0.58 ? 'schnell' : r < 0.74 ? 'schwarm' : r < 0.88 ? 'tank' : 'schuetze';
    }
    function spawnTick(dt) {
      if (enemies.length > 480) return;
      const f = t / 60, rate = Math.min(36, (1.3 + f * 0.95 + f * f * 0.12) * ([0, 0.8, 1, 1.2][schwer] || 1));
      spawnAcc += rate * dt;
      while (spawnAcc >= 1) { spawnAcc--; const a = mix(); if (a === 'schwarm') { const ang = rnd(0, TAU); for (let i = 0; i < 4; i++) spawn('schwarm', { ang: ang + rnd(-0.2, 0.2) }); } else spawn(a); }
      if (t >= waveAt) { const gross = Math.round(waveAt / 60) % 5 === 0; waveAt += 60; meldung(gross ? 'Eine gewaltige Welle rollt heran!' : 'Eine Welle rollt heran!', '#ff9a7a', gross); const n = Math.round((24 + Math.floor(f * 8)) * (gross ? 2.5 : 1)); for (let i = 0; i < n; i++) spawn(f > 2 ? pick(['laeufer', 'schnell', 'tank']) : 'laeufer', { ang: (i / n) * TAU }); }
      if (t >= eliteAt) { eliteAt += 120; const e = spawn(pick(['laeufer', 'tank']), { elite: true }); meldung(`${e.name} taucht auf!`, '#ffb070'); }
      if (!bossOut && t >= bossAt) { bossOut = true; const e = spawn('tank', { boss: true }); e.spr = sprFor('boss', true); e.name = opts.boss || GS.boss[0]; e.col = typeof GS.boss[1] === 'string' ? GS.boss[2] : '#a02828'; meldung(`${e.name} erscheint!`, '#ff6060', true); if (endlos) { bossOut = false; bossAt += 300; } }
    }

    /* ───────── Level-Ups ───────── */
    function gewicht(it) {
      const o = owned.get(it.id); let w = 1;
      if (o) w = 3 + (it.typ === 'waffe' ? 0.6 : 0);
      else {
        const partner = partnerVon(it.id).some((p) => owned.has(p)); if (partner) w = 2.6;
        else if (it.tags.some((tg) => (ST.sets[tg] || 0) > 0)) w = 1.4;
        if (owned.size < 3 && it.typ === 'waffe') w *= 1.8;
      }
      for (const l of LEGENDEN) if (l.braucht.includes(it.id) && l.braucht.filter((b) => owned.has(b)).length >= 2) w *= 1.8;
      return w * (1 + ST.luck * 0.15);
    }
    function angebote() {
      const pool = ITEMS.filter((it) => (owned.get(it.id)?.lv || 0) < 10), n = 3 + (ST.luck >= 0.5 ? 1 : 0) + (ST.luck >= 1.2 ? 1 : 0), out = [];
      while (out.length < n && pool.length) { const ws = pool.map(gewicht), sum = ws.reduce((a, b) => a + b, 0); let r = Math.random() * sum, i = 0; while (r > ws[i] && i < ws.length - 1) { r -= ws[i]; i++; } out.push(pool.splice(i, 1)[0]); }
      return out;
    }
    function kombiInfo(it) {
      const hin = [];
      for (const p of partnerVon(it.id)) if (owned.has(p)) hin.push(ITEM[p].name);
      const leg = LEGENDEN.filter((l) => l.braucht.includes(it.id)).map((l) => ({ l, hat: l.braucht.filter((b) => owned.has(b) || b === it.id).length }));
      return { hin, leg: leg.filter((x) => x.hat >= 2) };
    }
    function nimm(id, still = false) {
      if (opts.trace) (globalThis.__nimm ||= []).push([id, still, lvl, levelQueue, Math.round(t), Math.round(xp), xpNeed]);
      const o = owned.get(id);
      if (o) o.lv = Math.min(10, o.lv + 1); else owned.set(id, { id, lv: 1, t: 0.2, st: null, state: {} });
      const vorher = new Set(aktiveKombis().map((k) => k.key));
      recompute();
      for (const k of aktiveKombis()) if (!vorher.has(k.key) && !still) meldung(k.fused ? `Verschmolzen: ${k.name}!` : `Kombi: ${k.name}`, k.fused ? '#ffd070' : '#a8f0a0', k.fused);
      if (ST.lvlHeal) heal(P.maxhp * ST.lvlHeal);
      if (ST.heilVoll) P.hp = P.maxhp;
      renderBar();
    }
    function aktiveKombis() {
      const out = [];
      for (const [id, o] of owned) {
        const it = ITEM[id]; if (o.lv < 2) continue;
        if (it.typ === 'waffe') for (const p of praegungen(id)) out.push({ key: id + '>' + p.von + (p.fused ? '!' : ''), name: kombiName(p.typ, it), waffe: id, von: p.von, typ: p.typ, k: p.k, fused: p.fused });
        else for (const p of partnerVon(id)) { const q = owned.get(p); if (q && ITEM[p].typ === 'gabe' && q.lv >= 2 && id < p) { const fused = o.lv >= 8 && q.lv >= 8; out.push({ key: id + '+' + p + (fused ? '!' : ''), name: `Bund: ${it.name} und ${ITEM[p].name}`, bund: true, a: id, b: p, fused }); } }
      }
      return out;
    }
    function kombiName(typ, it) { const a = PRAEG[typ].adj, st0 = a.slice(0, -1), g2 = it.gen || 'm'; return `${g2 === 'm' ? st0 + 'er' : g2 === 'n' ? st0 + 'es' : a} ${it.name}`; }
    let levelQueue = 0, curOffers = null;
    function levelUp() {
      lvl++; levelQueue++; xp -= xpNeed; xpNeed = Math.round(4 + lvl * 1.7 + Math.max(0, lvl - 30) * 1.2);
      if (!modal.hidden) return; zeigeAuswahl();
    }
    function itemIcon(it, big) {
      const d = el('div', 'hb-icon' + (big ? ' big' : '') + (it.typ === 'gabe' ? ' gabe' : '')); d.style.borderColor = it.farbe || '#8a6a40';
      const u = iconURL(it.id); if (u) { const im = new Image(); im.src = u; im.alt = ''; d.append(im); } else d.textContent = it.name.slice(0, 2);
      return d;
    }
    function renderBar() {
      bar.innerHTML = '';
      const list = [...owned.values()].sort((a, b) => (ITEM[a.id].typ === ITEM[b.id].typ ? b.lv - a.lv : ITEM[a.id].typ === 'waffe' ? -1 : 1));
      for (const o of list) { const it = ITEM[o.id], c = el('div', 'hb-bslot'); c.append(itemIcon(it), el('span', 'hb-blv' + (o.lv >= 10 ? ' max' : ''), o.lv >= 10 ? 'M' : String(o.lv))); if (aktiveKombis().some((k) => k.waffe === o.id || k.a === o.id || k.b === o.id)) c.classList.add('kombi'); bar.append(c); }
      for (const id of legends.keys()) { const l = LEGENDEN.find((x) => x.id === id), c = el('div', 'hb-bslot leg'); c.append(itemIcon({ id, farbe: l.farbe, name: l.name }), el('span', 'hb-blv max', '★')); bar.append(c); }
    }
    function zeigeAuswahl(neu = true) {
      paused = true; modal.hidden = false; modal.innerHTML = '';
      const box = el('div', 'hb-box'); box.append(el('h3', 'hb-h', `Stufe ${lvl}!`), el('p', 'hb-sub', levelQueue > 1 ? `Noch ${levelQueue} Aufstiege – wähle eine Verbesserung.` : 'Wähle eine Verbesserung.'));
      const list = el('div', 'hb-cards'), opts2 = neu || !curOffers ? (curOffers = angebote()) : curOffers;
      if (!opts2.length) { list.append(karteSonder('Kräftigender Trank', 'Alle Items sind ausgebaut. Du wirst vollständig geheilt.', () => { P.hp = P.maxhp; })); }
      for (const it of opts2) {
        const o = owned.get(it.id), lvN = (o?.lv || 0) + 1, c = el('button', 'hb-card'), info = kombiInfo(it);
        const kopf = el('div', 'hb-ckopf'); kopf.append(itemIcon(it), el('b', null, it.name), el('span', 'hb-clv', o ? `Stufe ${o.lv} → ${lvN}` : 'Neu'));
        c.append(kopf, el('div', 'hb-ctext', o ? naechste(it, o.lv) : it.text));
        const tags = el('div', 'hb-tags'); for (const tg of it.tags) { const s = el('span', 'hb-tag', MERKMALE[tg].name + (ST.sets[tg] ? ` ${ST.sets[tg] + (o ? 0 : 1)}` : '')); s.style.borderColor = MERKMALE[tg].farbe; s.style.color = MERKMALE[tg].farbe; tags.append(s); } c.append(tags);
        if (info.hin.length) c.append(el('div', 'hb-combo', `⟷ Kombi mit ${info.hin.join(', ')}`));
        for (const { l, hat } of info.leg) c.append(el('div', 'hb-leg', hat >= 3 ? `★ ${l.name}: alle Teile – je Stufe 6 weckt die Legende` : `★ ${l.name}: ${hat}/3 Teile`));
        c.addEventListener('click', () => { if (modal.hidden || c.dataset.done) return; c.dataset.done = 1; nimm(it.id); weiter(); });
        list.append(c);
      }
      box.append(list);
      const unten = el('div', 'hb-row');
      if (rerolls > 0 && opts2.length) { const b = el('button', 'hb-btn', `Neu würfeln (${rerolls})`); b.onclick = () => { rerolls--; zeigeAuswahl(); }; unten.append(b); }
      const bb = el('button', 'hb-btn ghost', 'Aufbau ansehen'); bb.onclick = () => zeigeAufbau(true); unten.append(bb);
      box.append(unten); modal.append(box);
    }
    function karteSonder(name, text, fn) { const c = el('button', 'hb-card'); c.append(el('b', null, name), el('div', 'hb-ctext', text)); c.onclick = () => { fn(); weiter(); }; return c; }
    function naechste(it, lv) {
      if (it.typ === 'gabe') return it.text;
      const a = it.st(lv), b = it.st(lv + 1), d = [];
      if (b.dmg > a.dmg) d.push(`Schaden +${Math.round(((b.dmg - a.dmg) / a.dmg) * 100)} %`);
      if ((b.n || 1) > (a.n || 1)) d.push(`+${b.n - (a.n || 1)} ${it.id === 'rabenschwarm' ? 'Rabe' : it.id === 'wolfsgeist' ? 'Wolf' : 'Geschoss'}`);
      if (b.cd < a.cd) d.push('schneller');
      if ((b.area || 0) > (a.area || 0)) d.push('größer');
      if ((b.pierce || 0) > (a.pierce || 0) && (b.pierce || 0) < 90) d.push('durchbohrt mehr');
      if ((b.bounce || 0) > (a.bounce || 0)) d.push('springt öfter');
      if (lv + 1 === 8) d.push('ab jetzt verschmelzbar');
      return d.join(', ') || 'stärker';
    }
    function weiter() { levelQueue = Math.max(0, levelQueue - 1); if (levelQueue > 0) zeigeAuswahl(); else { modal.hidden = true; modal.innerHTML = ''; paused = false; last = performance.now(); } }
    function zeigeAufbau(ausAuswahl = false) {
      paused = true; modal.hidden = false; modal.innerHTML = '';
      const box = el('div', 'hb-box wide'); box.append(el('h3', 'hb-h', ausAuswahl ? 'Dein Aufbau' : 'Pause'));
      const w = el('div', 'hb-build');
      const items = [...owned.values()].sort((a, b) => (ITEM[a.id].typ > ITEM[b.id].typ ? -1 : 1));
      if (!items.length) w.append(el('p', 'hb-sub', 'Noch nichts gesammelt.'));
      for (const o of items) { const it = ITEM[o.id], r = el('div', 'hb-bitem'); r.append(itemIcon(it), el('span', null, `${it.name} · ${o.lv}`)); w.append(r); }
      box.append(w);
      const ks = aktiveKombis();
      if (ks.length) { box.append(el('h4', 'hb-h4', 'Aktive Kombis')); const ul = el('ul', 'hb-list'); for (const k of ks) ul.append(el('li', k.fused ? 'fused' : null, k.bund ? `${k.name}${k.fused ? ' (verschmolzen)' : ''}: Werte beider Gaben verstärkt` : `${k.name}${k.fused ? ' (verschmolzen)' : ''} – durch ${ITEM[k.von].name}: ${PRAEG[k.typ].text(k.k)}`)); box.append(ul); }
      const sets = Object.entries(ST.sets).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
      if (sets.length) { box.append(el('h4', 'hb-h4', 'Merkmale')); const ul = el('ul', 'hb-list'); for (const [tg, n] of sets) { const M = MERKMALE[tg], aktivS = Object.entries(M.sets).filter(([th]) => n >= +th).map(([, v]) => v[2]), naechst = Object.keys(M.sets).find((th) => n < +th); ul.append(el('li', null, `${M.name} ${n}: ${aktivS.join(', ') || '–'}${naechst ? ` (ab ${naechst}: ${M.sets[naechst][2]})` : ''}`)); } box.append(ul); }
      const legs = LEGENDEN.map((l) => ({ l, n: l.braucht.filter((b) => owned.has(b)).length })).filter((x) => x.n >= 1 && !legends.has(x.l.id)).sort((a, b) => b.n - a.n).slice(0, 4);
      if (legends.size || legs.length) { box.append(el('h4', 'hb-h4', 'Legenden')); const ul = el('ul', 'hb-list'); for (const id of legends.keys()) { const l = LEGENDEN.find((x) => x.id === id), li = el('li', 'fused hb-legli'); li.append(itemIcon({ id, farbe: l.farbe, name: l.name }), el('span', null, `${l.name}: ${l.text}`)); ul.append(li); } for (const { l } of legs) ul.append(el('li', null, `${l.name}: ${l.braucht.map((b) => `${ITEM[b].name} ${owned.get(b)?.lv || 0}/6`).join(' · ')}`)); box.append(ul); }
      if (meta.quellen.length && !ausAuswahl) { box.append(el('h4', 'hb-h4', 'Dauerhafte Stärken')); box.append(el('p', 'hb-sub', meta.quellen.slice(0, 6).join(' · '))); }
      const row = el('div', 'hb-row');
      const b1 = el('button', 'hb-btn', ausAuswahl ? 'Zurück zur Auswahl' : 'Weiterkämpfen'); b1.onclick = () => { if (ausAuswahl) zeigeAuswahl(false); else { modal.hidden = true; paused = false; last = performance.now(); } };
      row.append(b1);
      if (!ausAuswahl) { const b2 = el('button', 'hb-btn ghost', 'Aufgeben'); b2.onclick = () => ende(false, true); row.append(b2); }
      box.append(row); modal.append(box);
    }

    /* ───────── Steuerung ───────── */
    const keys = new Set(); let joyV = null;
    const kd = (e) => { const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); e.preventDefault(); } if (k === 'escape' || k === 'p') { if (modal.hidden) zeigeAufbau(); } };
    const ku = (e) => keys.delete(e.key.toLowerCase());
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    let joyId = null, jx = 0, jy = 0;
    cv.addEventListener('pointerdown', (e) => { if (joyId !== null) return; joyId = e.pointerId; jx = e.clientX; jy = e.clientY; joy.hidden = false; joy.style.left = jx + 'px'; joy.style.top = jy + 'px'; joyKnob.style.transform = 'translate(-50%,-50%)'; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (e.pointerId !== joyId) return; let dx = e.clientX - jx, dy = e.clientY - jy; const l = Math.hypot(dx, dy), mx = 44; if (l > mx) { dx = (dx / l) * mx; dy = (dy / l) * mx; } joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; joyV = l > 6 ? [dx / mx, dy / mx] : null; });
    const up = (e) => { if (e.pointerId !== joyId) return; joyId = null; joyV = null; joy.hidden = true; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    btnPause.onclick = () => { if (modal.hidden) zeigeAufbau(); };
    const vis = () => { if (document.hidden && modal.hidden && !over) zeigeAufbau(); };
    document.addEventListener('visibilitychange', vis);

    /* ───────── Update ───────── */
    function update(dt) {
      t += dt;
      // Bewegung
      let mx = 0, my = 0;
      if (keys.has('a') || keys.has('arrowleft')) mx--; if (keys.has('d') || keys.has('arrowright')) mx++; if (keys.has('w') || keys.has('arrowup')) my--; if (keys.has('s') || keys.has('arrowdown')) my++;
      if (joyV) { mx = joyV[0]; my = joyV[1]; }
      if (opts.autopilot) [mx, my] = opts.autopilot({ P, enemies, gems, t });
      const ml = Math.hypot(mx, my);
      P.moving = ml > 0.05;
      if (P.moving) { const k = Math.min(1, ml); P.x += (mx / ml) * ST.speed * k * dt; P.y += (my / ml) * ST.speed * k * dt; P.fx = mx / ml; P.fy = my / ml; P.walk += dt * 8; P.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 2 : 3) : my > 0 ? 0 : 1; }
      P.inv -= dt; heal(ST.regen * dt); if (buffT > 0) buffT -= dt; if (shake > 0) shake = Math.max(0, shake - dt * 12);
      spawnTick(dt);
      rebuildGrid();
      // Waffen
      const buff = buffT > 0 ? 1.4 : 1;
      for (const [id, w] of owned) { if (ITEM[id].typ !== 'waffe') continue; w.t -= dt * buff; if (w.t <= 0) { w.t = w.st.cd; FIRE[id](w.st, w); } }
      for (const [id, w] of legends) { w.t -= dt * buff; if (w.t <= 0) { w.t = 1; LFIRE[id](w.st, w); } }
      if (ST.beben) { quakeT -= dt; if (quakeT <= 0) { quakeT = 6; blast(P.x, P.y, 140 * ST.area, 40 * ST.dmg * (1 + lvl * 0.03), { m: { stun: 0.5 }, col: '#c8a878', kind: 'beben', life: 0.5 }); shake = 4; } }
      // Helfer
      if (helferListe.length) { if (aktiv) helferTick(dt); else if ((helferT -= dt) <= 0) { helferT = 38; helferKommt(); } }
      // Geschosse
      for (const s of shots) {
        s.t += dt; s.life -= dt;
        if (s.orbit) { const c = s.orbit.um || P; s.orbit.a += s.orbit.w * dt; s.x = c.x + Math.cos(s.orbit.a) * s.orbit.r; s.y = c.y + Math.sin(s.orbit.a) * s.orbit.r; s.rot = s.orbit.a; }
        else if (s.spiral) { s.spiral.a += s.spiral.w * dt; s.spiral.r += s.spiral.v * dt; s.x = P.x + Math.cos(s.spiral.a) * s.spiral.r; s.y = P.y + Math.sin(s.spiral.a) * s.spiral.r; s.rot += dt * 10; }
        else {
          if (s.homing) { const e = s.target && !s.target.dead ? s.target : (s.target = nearest(s.x, s.y, 220)); if (e) { const a = Math.atan2(e.y - s.y, e.x - s.x), sp = Math.hypot(s.vx, s.vy) || 200, cur = Math.atan2(s.vy, s.vx); let da = Math.atan2(Math.sin(a - cur), Math.cos(a - cur)); const na = cur + clamp(da, -s.homing * dt, s.homing * dt); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; } }
          if (s.grav) s.vy += s.grav * dt;
          if (s.boomer != null && s.t >= s.boomer && !s.back) { s.back = true; s.hit.clear(); }
          if (s.back) { const a = Math.atan2(P.y - s.y, P.x - s.x), sp = Math.max(180, Math.hypot(s.vx, s.vy)); s.vx += (Math.cos(a) * sp - s.vx) * Math.min(1, dt * 6); s.vy += (Math.sin(a) * sp - s.vy) * Math.min(1, dt * 6); if (Math.hypot(P.x - s.x, P.y - s.y) < 8) s.life = 0; }
          s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * (s.shape === 'axt' || s.shape === 'bumerang' ? 14 : 0);
        }
        if (s.noHit || s.life <= 0) continue;
        for (const e of near(s.x, s.y, s.r)) {
          const last2 = s.hit.get(e.id); if (last2 != null && (s.rehit >= 99 || s.t - last2 < s.rehit)) continue;
          s.hit.set(e.id, s.t); hit(e, s.dmg, s.m, s.x, s.y, !!s.sec);
          if (s.boom) { blast(s.x, s.y, s.boom, s.dmg * 0.8, { m: s.m, col: '#ff8a3a', sec: true }); s.life = 0; break; }
          if (s.split && !s.splitDone) { s.splitDone = true; for (let i = 0; i < s.split; i++) { const a = Math.atan2(s.vy, s.vx) + rnd(-1.2, 1.2); shots.push(mkShot({ x: s.x, y: s.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, r: 2, dmg: s.dmg * 0.4, life: 0.4, shape: 'splitter', col: s.col, m: {}, sec: true, hit: new Map([[e.id, 0]]) })); } }
          if (s.bounce > 0) { s.bounce--; const skip = new Set([...s.hit.keys()].map((id) => enemies.find((x) => x.id === id)).filter(Boolean)); const n2 = nearest(s.x, s.y, 140, skip); if (n2) { const a = Math.atan2(n2.y - s.y, n2.x - s.x), sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.life = Math.max(s.life, 0.6); } continue; }
          if (s.pierce < 99 && s.pierce-- <= 0) { s.life = 0; break; }
        }
      }
      for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; if (s.life <= 0 || (!s.orbit && !s.spiral && !s.back && (Math.abs(s.x - P.x) > VW || Math.abs(s.y - P.y) > VH))) { if (s.pool && s.life <= 0) zones.push({ x: s.x, y: s.y, r: s.pool.r, kind: 'gift', life: s.pool.life, t: 0, tick: 0, dmg: s.pool.dmg, m: s.pool.m }); shots.splice(i, 1); } }
      // Zonen
      for (const z of zones) {
        z.t += dt; z.life -= dt;
        if (z.kind === 'gift') { z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; for (const e of near(z.x, z.y, z.r)) hit(e, z.dmg, z.m, z.x, z.y, true); } }
        else if (z.kind === 'rune') { if (near(z.x, z.y, 8).length) { blast(z.x, z.y, z.trig, z.dmg, { m: z.m, col: '#b8a0f0', kind: 'rune' }); z.life = 0; } }
      }
      for (let i = zones.length - 1; i >= 0; i--) if (zones[i].life <= 0) zones.splice(i, 1);
      // Beschwörungen
      for (const s of summons) {
        s.life -= dt; s.cd -= dt;
        if (s.kind === 'rabe') {
          if (!s.dive) { s.a += dt * 2.2; s.x += (P.x + Math.cos(s.a) * 26 - s.x) * Math.min(1, dt * 6); s.y += (P.y - 8 + Math.sin(s.a) * 14 - s.y) * Math.min(1, dt * 6); if (s.cd <= 0) { const e = nearest(P.x, P.y, s.st.area); if (e) { s.dive = e; s.cd = s.st.cd; } } }
          else { const e = s.dive, a = Math.atan2(e.y - s.y, e.x - s.x); s.x += Math.cos(a) * s.st.spd * dt; s.y += Math.sin(a) * s.st.spd * dt; if (e.dead || Math.hypot(e.x - s.x, e.y - s.y) < e.r + 3) { if (!e.dead) hit(e, s.st.dmg, s.st.m, s.x, s.y); s.dive = null; } }
        } else if (s.kind === 'wolf' || s.kind === 'jagdwolf') {
          const e = s.tgt && !s.tgt.dead ? s.tgt : (s.tgt = nearest(s.x, s.y, 200));
          const tx = e ? e.x : P.x + Math.cos(s.a + t) * 24, ty = e ? e.y : P.y + Math.sin(s.a + t) * 18, a = Math.atan2(ty - s.y, tx - s.x), d = Math.hypot(tx - s.x, ty - s.y);
          if (d > 4) { s.x += Math.cos(a) * s.st.spd * dt; s.y += Math.sin(a) * s.st.spd * dt; s.fx = Math.cos(a); }
          if (Math.hypot(P.x - s.x, P.y - s.y) > 260) { s.x = P.x; s.y = P.y; }
          if (e && d < e.r + 6 && s.cd <= 0) { hit(e, s.st.dmg, s.st.m, s.x, s.y); s.cd = s.kind === 'jagdwolf' ? 0.35 : 0.6; }
        } else if (s.kind === 'biene') {
          const e = s.tgt && !s.tgt.dead ? s.tgt : (s.tgt = nearest(s.x, s.y, 180)); s.a += dt * 9;
          const tx = (e ? e.x : P.x) + Math.cos(s.a) * 5, ty = (e ? e.y : P.y) + Math.sin(s.a * 1.3) * 5, a = Math.atan2(ty - s.y, tx - s.x);
          s.x += Math.cos(a) * s.st.spd * dt; s.y += Math.sin(a) * s.st.spd * dt;
          if (e && Math.hypot(e.x - s.x, e.y - s.y) < e.r + 3 && s.cd <= 0) { hit(e, s.st.dmg, s.st.m, s.x, s.y, true); s.cd = 0.4; }
        }
      }
      for (let i = summons.length - 1; i >= 0; i--) if (summons[i].life <= 0) summons.splice(i, 1);
      // Gegner
      for (const e of enemies) {
        if (e.dead) continue;
        e.anim += dt * 5; e.flash -= dt;
        // Wirkungen über Zeit
        if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burnDps * dt; if (Math.random() < dt * 4) fx.push({ k: 'funke', x: e.x + rnd(-e.r, e.r), y: e.y - e.r, t: 0, life: 0.4, col: '#ff8a3a' }); }
        if (e.poisonT > 0) { e.poisonT -= dt; e.hp -= e.poisonDps * e.poisonN * dt; } else e.poisonN = 0;
        if (e.bleedT > 0) { e.bleedT -= dt; e.hp -= e.bleedDps * e.bleedN * dt; } else e.bleedN = 0;
        if (e.curseT > 0) e.curseT -= dt; else e.curse = 0;
        if (e.slowT > 0) e.slowT -= dt; else e.slow = 0;
        if (e.hp <= 0) { tod(e); continue; }
        if (e.freezeT > 0) { e.freezeT -= dt; continue; }
        if (e.stunT > 0) { e.stunT -= dt; e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.85; e.ky *= 0.85; continue; }
        const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
        let sp = e.spd * (1 - e.slow);
        let vx = (dx / d) * sp, vy = (dy / d) * sp;
        if (ARCH[e.arch].wobble) { e.wob += dt * 6; vx += Math.cos(e.wob) * 25; vy += Math.sin(e.wob * 1.3) * 25; }
        if (ARCH[e.arch].shoot && !e.boss) { if (d < 110) { vx = -vx * 0.6; vy = -vy * 0.6; } else if (d < 150) { vx *= 0.1; vy *= 0.1; } e.shootT -= dt; if (e.shootT <= 0 && d < 220) { e.shootT = 2.6; enemyShots.push({ x: e.x, y: e.y, vx: (dx / d) * 110, vy: (dy / d) * 110, life: 2.5, dmg: e.dmg }); } }
        if ((ARCH[e.arch].charge || e.boss) && !e.dashing) { e.chargeT -= dt; if (e.chargeT <= 0 && d < 180) { e.dashing = 0.55; e.dvx = (dx / d) * sp * 4.2; e.dvy = (dy / d) * sp * 4.2; e.chargeT = e.boss ? 3.5 : rnd(4, 7); } }
        if (e.dashing) { vx = e.dvx; vy = e.dvy; e.dashing -= dt; if (e.dashing <= 0) e.dashing = 0; }
        if (e.boss && Math.random() < dt * 0.25) { for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; enemyShots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 3, dmg: e.dmg * 0.5 }); } }
        e.x += (vx + e.kx) * dt; e.y += (vy + e.ky) * dt; e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
        e.face = vx >= 0 ? 1 : -1;
        // Gegner nicht übereinander
        if (Math.random() < 0.5) for (const o of near(e.x, e.y, e.r)) { if (o === e) continue; const ox = e.x - o.x, oy = e.y - o.y, ol = Math.hypot(ox, oy) || 0.01, push = (e.r + o.r - ol) * 0.5; if (push > 0) { e.x += (ox / ol) * push * 0.5; e.y += (oy / ol) * push * 0.5; } }
        // Berührung
        if (d < e.r + 5 && P.inv <= 0) treffer(e.dmg, e);
        // zu weit weg → neu platzieren
        if (d > Math.hypot(VW, VH) * 0.9 && !e.boss) { const a = Math.atan2(P.fy, P.fx) + rnd(-0.8, 0.8), dist = Math.hypot(VW, VH) / 2 + 20; e.x = P.x + Math.cos(a) * dist; e.y = P.y + Math.sin(a) * dist; }
      }
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
      for (const s of enemyShots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (Math.hypot(s.x - P.x, s.y - P.y) < 6 && P.inv <= 0) { treffer(s.dmg); s.life = 0; } }
      for (let i = enemyShots.length - 1; i >= 0; i--) if (enemyShots[i].life <= 0) enemyShots.splice(i, 1);
      // Erfahrung
      const mg = ST.magnet;
      for (const gm of gems) { const dx = P.x - gm.x, dy = P.y - gm.y, d = Math.hypot(dx, dy); if (gm.pull || d < mg) { gm.pull = true; const sp = 160 + (gm.sp = (gm.sp || 0) + dt * 400); gm.x += (dx / (d || 1)) * Math.min(d, sp * dt); gm.y += (dy / (d || 1)) * Math.min(d, sp * dt); } if (d < 7) { gm.got = true; xp += gm.v * ST.xp; } }
      for (let i = gems.length - 1; i >= 0; i--) if (gems[i].got) gems.splice(i, 1);
      if (gems.length > 350) { let big = 0; for (let i = gems.length - 1; i >= 0 && gems.length > 250; i--) { const gm = gems[i]; if (Math.hypot(gm.x - P.x, gm.y - P.y) > 150) { big += gm.v; gems.splice(i, 1); } } if (big) gems.push({ x: P.x + rnd(-100, 100), y: P.y + rnd(-80, 80), v: big }); }
      for (const pu of pickups) { if (Math.hypot(pu.x - P.x, pu.y - P.y) < 12) { pu.got = true; aufheben(pu); } }
      for (let i = pickups.length - 1; i >= 0; i--) if (pickups[i].got) pickups.splice(i, 1);
      while (xp >= xpNeed && !over) levelUp();
      // Effekte
      for (const f of fx) f.t += dt; for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t >= fx[i].life) fx.splice(i, 1);
      for (const tx of texts) tx.t += dt; for (let i = texts.length - 1; i >= 0; i--) if (texts[i].t > 0.7) texts.splice(i, 1);
      // Ende?
      if (!endlos && t >= dauer && !over) { if (bossOut && !bossKilled) { const b = enemies.find((e) => e.boss); if (b) meldung(`${b.name} zieht sich zurück!`, '#ffd070', true); } ende(true); }
    }
    const enemyShots = [];
    function treffer(dmg, von) {
      if (P.shield > 0) { P.shield--; P.inv = 0.5; fx.push({ k: 'ring', x: P.x, y: P.y, r: 14, t: 0, life: 0.25, col: '#9fd8ff' }); return; }
      const d = Math.max(1, dmg - ST.armor); P.hp -= d; P.inv = 0.45; zahl(P.x, P.y - 14, d, '#ff6050'); shake = Math.max(shake, 2);
      if (von && ST.thorns) hit(von, ST.thorns, {}, P.x, P.y, true);
      if (P.hp <= 0) {
        if (P.revive > 0) { P.revive = 0; P.reviveUsed = true; P.hp = P.maxhp * 0.5; P.inv = 2; blast(P.x, P.y, 200, 200 * ST.dmg, { m: { knock: 120 }, col: '#9ff0a0', kind: 'welle', life: 0.6 }); meldung('Trollblut! Du stehst wieder auf.', '#9ff0a0', true); }
        else ende(false);
      }
    }
    function aufheben(pu) {
      if (pu.k === 'brot') { heal(30); meldung('Brot: +30 Leben', '#f0d090'); }
      else if (pu.k === 'magnet') { for (const gm of gems) gm.pull = true; meldung('Alle Erfahrung fliegt zu dir!', '#c8b0ff'); }
      else if (pu.k === 'truhe') {
        const got = [];
        for (let i = 0; i < pu.n; i++) { const pool = ITEMS.filter((it) => owned.has(it.id) && owned.get(it.id).lv < 10); const cand = pool.length ? pool : ITEMS.filter((it) => !owned.has(it.id)); if (!cand.length) break; const ws = cand.map(gewicht), sum = ws.reduce((a, b) => a + b, 0); let r = Math.random() * sum, j = 0; while (r > ws[j] && j < ws.length - 1) { r -= ws[j]; j++; } nimm(cand[j].id, true); got.push(cand[j].name); }
        meldung(`Truhe: ${got.join(', ')} verbessert!`, '#ffd070', true);
        recompute();
      }
    }

    /* ───────── Zeichnen ───────── */
    function draw() {
      const cx = Math.round(P.x - VW / 2 + (shake ? rnd(-shake, shake) : 0)), cy = Math.round(P.y - VH / 2 + (shake ? rnd(-shake, shake) : 0));
      g.save(); g.translate(-cx, -cy);
      g.fillStyle = ground; g.fillRect(cx, cy, VW, VH);
      // Deko
      const C = 64, gx0 = Math.floor(cx / C) - 1, gy0 = Math.floor(cy / C) - 1, gx1 = Math.ceil((cx + VW) / C), gy1 = Math.ceil((cy + VH) / C);
      for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
        let h = (gx * 73856093) ^ (gy * 19349663); h = (h ^ (h >>> 13)) * 1274126177; const r = ((h >>> 0) % 1000) / 1000;
        if (r < B.dichte && Math.abs(gx * C - P.x0) + Math.abs(gy * C - P.y0) > 90) { const k = B.deko[(h >>> 4) % B.deko.length], ox = (h >>> 8) % 40, oy = (h >>> 16) % 40; g.drawImage(deko[k], gx * C + ox, gy * C + oy); }
      }
      // Zonen
      for (const z of zones) {
        if (z.kind === 'gift') { g.globalAlpha = 0.35 * Math.min(1, z.life); g.fillStyle = '#7ab83a'; g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
        else if (z.kind === 'rune') { g.fillStyle = (Math.floor(z.t * 4) % 2) ? '#c8b0ff' : '#8a70d0'; g.fillRect(z.x - 3, z.y - 3, 6, 6); g.fillStyle = '#2a2048'; g.fillRect(z.x - 1, z.y - 2, 2, 4); }
      }
      if (owned.has('kraeuterbeutel')) { const r = owned.get('kraeuterbeutel').st.area; g.globalAlpha = 0.13 + Math.sin(t * 3) * 0.03; g.fillStyle = '#9ad070'; g.beginPath(); g.ellipse(P.x, P.y, r, r * 0.7, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
      if (legends.has('seuchenwind')) { g.globalAlpha = 0.18; g.fillStyle = '#9ae04a'; g.beginPath(); g.ellipse(P.x, P.y, 120 * ST.area, 84 * ST.area, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
      // Erfahrung & Fundstücke
      for (const gm of gems) { if (!onScreen(gm.x, gm.y)) continue; g.fillStyle = gm.v >= 20 ? '#ff70d0' : gm.v >= 3 ? '#60e0ff' : '#70a0ff'; const s = gm.v >= 20 ? 3 : 2; g.fillRect(gm.x - s / 2, gm.y - s, s, s * 2); g.fillStyle = '#ffffff'; g.fillRect(gm.x - s / 2, gm.y - s, 1, 1); }
      for (const pu of pickups) { const bob = Math.sin(t * 4) * 1.5; if (pu.k === 'truhe') { g.fillStyle = '#7a4a20'; g.fillRect(pu.x - 6, pu.y - 5 + bob, 12, 8); g.fillStyle = '#e0b040'; g.fillRect(pu.x - 6, pu.y - 2 + bob, 12, 2); g.fillRect(pu.x - 1, pu.y - 3 + bob, 2, 4); } else if (pu.k === 'brot') { g.fillStyle = '#c88a40'; g.fillRect(pu.x - 4, pu.y - 3 + bob, 8, 5); g.fillStyle = '#e8b060'; g.fillRect(pu.x - 3, pu.y - 3 + bob, 6, 1); } else { g.fillStyle = '#c8b0ff'; g.fillRect(pu.x - 3, pu.y - 3 + bob, 6, 6); } }
      // Gegner
      enemies.sort((a, b) => a.y - b.y);
      for (const e of enemies) {
        if (!onScreen(e.x, e.y, 30)) continue;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(e.x - e.r, e.y + e.r * 0.6, e.r * 2, 2);
        const fr = Math.floor(e.anim) % 2, sp = e.spr;
        if (e.flash > 0) g.filter = 'brightness(3)'; else if (e.freezeT > 0) g.filter = 'saturate(0.2) brightness(1.4) hue-rotate(160deg)'; else if (e.poisonN > 0) g.filter = 'hue-rotate(60deg)';
        if (sp.kind === 'mon') { const s = sp.size * (e.elite ? 1.5 : 1); g.save(); g.translate(e.x, e.y); if (e.face < 0) g.scale(-1, 1); g.drawImage(sp.cv, fr * sp.size, 0, sp.size, sp.size, -s / 2, -s / 2 - s * 0.15, s, s); g.restore(); }
        else { const sc2 = sp.scale * (e.elite ? 1.5 : 1), row = e.face < 0 ? 3 : 2, w2 = SW * sc2, h2 = SH * sc2; g.drawImage(sp.cv, (e.stunT > 0 ? 0 : Math.floor(e.anim) % 4) * SW, row * SH, SW, SH, Math.round(e.x - w2 / 2), Math.round(e.y - h2 + 4), w2, h2); }
        g.filter = 'none';
        if (e.elite || e.boss) { const w = e.boss ? 40 : 20; g.fillStyle = '#300'; g.fillRect(e.x - w / 2, e.y - e.r - 10, w, 2); g.fillStyle = e.boss ? '#ff4040' : '#ffa040'; g.fillRect(e.x - w / 2, e.y - e.r - 10, w * Math.max(0, e.hp / e.maxhp), 2); }
        if (e.burnT > 0) { g.fillStyle = '#ff8a3a'; g.fillRect(e.x - 1, e.y - e.r - 4, 2, 2); }
      }
      // Beschwörungen
      for (const s of summons) {
        if (s.kind === 'rabe') { g.fillStyle = '#2a2830'; const wy = Math.sin(t * 20) > 0 ? -2 : 1; g.fillRect(s.x - 2, s.y - 1, 4, 3); g.fillRect(s.x - 4, s.y + wy, 2, 1); g.fillRect(s.x + 2, s.y + wy, 2, 1); g.fillStyle = '#e0c040'; g.fillRect(s.x + 2, s.y, 1, 1); }
        else if (s.kind === 'wolf' || s.kind === 'jagdwolf') { g.globalAlpha = 0.85; g.fillStyle = s.kind === 'jagdwolf' ? '#c0d0ff' : '#a8b8d0'; const f = s.fx < 0 ? -1 : 1; g.fillRect(s.x - 5, s.y - 3, 10, 4); g.fillRect(s.x + 3 * f - 1, s.y - 5, 4, 3); g.fillRect(s.x - 4, s.y + 1, 2, 3); g.fillRect(s.x + 2, s.y + 1, 2, 3); g.fillStyle = '#ffffff'; g.fillRect(s.x + 4 * f, s.y - 4, 1, 1); g.globalAlpha = 1; }
        else if (s.kind === 'biene') { g.fillStyle = '#f0c030'; g.fillRect(s.x - 1, s.y - 1, 2, 2); g.fillStyle = '#202020'; g.fillRect(s.x, s.y - 1, 1, 2); }
      }
      // Helfer
      if (aktiv) { const a = aktiv; g.globalAlpha = a.life - a.t < 1 ? (a.life - a.t) : 1; if (a.cv) g.drawImage(a.cv, (Math.floor(t * 8) % 4) * SW, 2 * SH, SW, SH, Math.round(a.x - SW / 2), Math.round(a.y - SH + 4), SW, SH); else { g.fillStyle = '#9fd8ff'; g.fillRect(a.x - 3, a.y - 10, 6, 10); } g.fillStyle = '#9fd8ff'; g.fillRect(a.x - 1, a.y - SH - 1, 2, 2); g.globalAlpha = 1; }
      // Spieler
      const fr = P.moving ? Math.floor(P.walk) % 4 : 4 + (Math.floor(t * 2) % 2), row = P.dir;
      if (P.inv > 0 && Math.floor(t * 20) % 2) g.globalAlpha = 0.5;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(P.x - 5, P.y + 3, 10, 2);
      g.drawImage(heroCv, fr * SW, row * SH, SW, SH, Math.round(P.x - SW / 2), Math.round(P.y - SH + 4), SW, SH);
      g.globalAlpha = 1;
      if (P.shield > 0) { g.strokeStyle = '#9fd8ff'; g.globalAlpha = 0.6; g.beginPath(); g.arc(P.x, P.y - 6, 11, 0, TAU); g.stroke(); g.globalAlpha = 1; }
      // Leben unter der Figur
      g.fillStyle = '#300'; g.fillRect(P.x - 9, P.y + 6, 18, 2); g.fillStyle = P.hp / P.maxhp < 0.3 ? '#ff5040' : '#60d060'; g.fillRect(P.x - 9, P.y + 6, 18 * Math.max(0, P.hp / P.maxhp), 2);
      // Geschosse
      for (const s of shots) {
        if (!onScreen(s.x, s.y, 10)) continue;
        const a = s.orbit || s.spiral ? s.rot : Math.atan2(s.vy, s.vx);
        g.save(); g.translate(s.x, s.y);
        if (s.fade) g.globalAlpha = Math.max(0, s.life / 0.4);
        g.fillStyle = s.col;
        switch (s.shape) {
          case 'pfeil': g.rotate(a); g.fillRect(-5, 0, 8, 1); g.fillStyle = '#c0c0c8'; g.fillRect(3, -1, 2, 3); g.fillStyle = '#e8e0cc'; g.fillRect(-6, -1, 2, 3); break;
          case 'bolzen': g.rotate(a); g.fillRect(-5, -1, 10, 2); g.fillStyle = '#d0d0d8'; g.fillRect(4, -1, 3, 2); break;
          case 'messer': g.rotate(a); g.fillRect(-3, 0, 6, 1); g.fillStyle = '#6a4a30'; g.fillRect(-5, 0, 2, 1); break;
          case 'axt': g.rotate(s.rot); g.fillStyle = '#7a5232'; g.fillRect(-1, -5, 2, 10); g.fillStyle = s.col; g.fillRect(1, -5, 4, 5); break;
          case 'bumerang': g.rotate(s.rot); g.fillRect(-5, -1, 6, 2); g.fillRect(-1, -1, 2, 6); break;
          case 'stein': g.fillRect(-2, -2, 4, 4); g.fillStyle = '#e0e0e0'; g.fillRect(-2, -2, 1, 1); break;
          case 'flamme': { const s2 = 2 + (1 - s.life / 0.4) * 4; g.fillStyle = s.life > 0.25 ? '#ffe070' : '#ff7a2a'; g.fillRect(-s2 / 2, -s2 / 2, s2, s2); break; }
          case 'glut': g.fillStyle = '#ff4a1a'; g.fillRect(-3, -3, 6, 6); g.fillStyle = '#ffd060'; g.fillRect(-1, -2, 2, 2); break;
          case 'kristall': g.rotate(t * 3); g.fillRect(-1, -4, 2, 8); g.fillRect(-3, -1, 6, 2); break;
          case 'kugel': g.fillStyle = '#5a5a60'; g.fillRect(-4, -4, 8, 8); g.fillStyle = '#c0c4cc'; g.fillRect(-3, -3, 2, 2); g.fillStyle = '#8a8a90'; g.fillRect(-6, -1, 2, 2); g.fillRect(4, -1, 2, 2); g.fillRect(-1, -6, 2, 2); g.fillRect(-1, 4, 2, 2); break;
          case 'geist': g.globalAlpha = 0.85; g.fillRect(-2, -2, 4, 4); g.fillStyle = '#ffffff'; g.fillRect(-1, -1, 1, 1); g.globalAlpha = 0.4; g.fillRect(-1 - Math.cos(a) * 4, -1 - Math.sin(a) * 4, 2, 2); break;
          case 'sichel': g.rotate(s.rot); g.fillRect(-4, -4, 2, 8); g.fillRect(-2, -5, 4, 2); g.fillRect(-2, 3, 4, 2); break;
          case 'krug': g.fillStyle = '#6a8a3a'; g.fillRect(-2, -3, 4, 5); g.fillStyle = '#c8b090'; g.fillRect(-1, -4, 2, 1); break;
          default: g.fillRect(-1, -1, 2, 2);
        }
        g.restore();
      }
      for (const s of enemyShots) { g.fillStyle = '#ff5050'; g.fillRect(s.x - 2, s.y - 2, 4, 4); g.fillStyle = '#ffd0d0'; g.fillRect(s.x - 1, s.y - 1, 2, 2); }
      // Effekte
      for (const f of fx) {
        const k = f.t / f.life;
        g.globalAlpha = Math.max(0, 1 - k);
        if (f.k === 'ring' || f.k === 'welle' || f.k === 'rune' || f.k === 'eis') { g.strokeStyle = f.col; g.lineWidth = f.k === 'welle' ? 3 : 1.5; g.beginPath(); g.ellipse(f.x, f.y, f.r * (f.k === 'welle' ? k : 0.6 + k * 0.4), f.r * 0.7 * (f.k === 'welle' ? k : 0.6 + k * 0.4), 0, 0, TAU); g.stroke(); g.lineWidth = 1; }
        else if (f.k === 'beben') { g.fillStyle = f.col; g.globalAlpha *= 0.35; g.beginPath(); g.ellipse(f.x, f.y, f.r * (0.4 + k * 0.6), f.r * 0.6 * (0.4 + k * 0.6), 0, 0, TAU); g.fill(); }
        else if (f.k === 'wurzel') { g.fillStyle = '#7a5a2a'; for (let i = 0; i < 5; i++) { const a = i * 1.26, l = f.r * (0.3 + 0.7 * Math.min(1, k * 3)); g.fillRect(f.x + Math.cos(a) * l * 0.5 - 1, f.y + Math.sin(a) * l * 0.35 - 4, 2, 6); } }
        else if (f.k === 'hieb') { g.strokeStyle = f.col; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y - 4, f.r * 0.85, f.a - f.s * (1 - k * 0.3), f.a + f.s * (k * 1.6 - 0.6)); g.stroke(); g.lineWidth = 1; }
        else if (f.k === 'stoss' || f.k === 'strahl' || f.k === 'dornen') { g.strokeStyle = f.col; g.lineWidth = f.k === 'strahl' ? 3 : 2; g.beginPath(); g.moveTo(f.x, f.y - 4); g.lineTo(f.x2, f.y2 - 4); g.stroke(); if (f.k === 'dornen') { g.fillStyle = f.col; for (let i = 1; i < 6; i++) { const px = f.x + (f.x2 - f.x) * i / 6, py = f.y + (f.y2 - f.y) * i / 6; g.fillRect(px - 1, py - 6, 2, 5); } } g.lineWidth = 1; }
        else if (f.k === 'blitz') { g.strokeStyle = '#fff6a0'; g.beginPath(); g.moveTo(f.x, f.y); const mx2 = (f.x + f.x2) / 2 + rnd(-5, 5), my2 = (f.y + f.y2) / 2 + rnd(-5, 5); g.lineTo(mx2, my2); g.lineTo(f.x2, f.y2); g.stroke(); }
        else if (f.k === 'einschlag') { g.strokeStyle = '#fff6a0'; g.lineWidth = 2; g.beginPath(); g.moveTo(f.x + rnd(-6, 6), f.y - 120); g.lineTo(f.x + rnd(-6, 6), f.y - 60); g.lineTo(f.x + rnd(-4, 4), f.y - 30); g.lineTo(f.x, f.y); g.stroke(); g.lineWidth = 1; g.fillStyle = '#ffffa0'; g.fillRect(f.x - 3, f.y - 2, 6, 3); }
        else if (f.k === 'zapfen') { g.fillStyle = '#c8f0ff'; const y = f.y - 80 * (1 - k); g.fillRect(f.x - 1, y - 8, 3, 8); g.fillRect(f.x, y, 1, 2); }
        else if (f.k === 'pfeilfall') { g.fillStyle = '#e8e0c8'; const y = f.y - 50 * (1 - k); g.fillRect(f.x, y - 6, 1, 6); }
        else if (f.k === 'puff') { g.fillStyle = f.col; const r = f.r * (0.5 + k); g.fillRect(f.x - r, f.y - 1, 2, 2); g.fillRect(f.x + r - 2, f.y - 1, 2, 2); g.fillRect(f.x - 1, f.y - r, 2, 2); g.fillRect(f.x - 1, f.y + r - 2, 2, 2); }
        else if (f.k === 'funke') { g.fillStyle = f.col; g.fillRect(f.x, f.y - k * 6, 1, 1); }
      }
      g.globalAlpha = 1;
      // Zahlen
      g.font = 'bold 8px monospace'; g.textAlign = 'center';
      for (const tx of texts) { g.globalAlpha = 1 - tx.t / 0.7; g.fillStyle = '#000'; const y = tx.y - tx.t * 18; g.fillText(tx.v, tx.x + 1, y + 1); g.fillStyle = tx.col; if (tx.big) g.font = 'bold 10px monospace'; g.fillText(tx.v, tx.x, y); if (tx.big) g.font = 'bold 8px monospace'; }
      g.globalAlpha = 1;
      g.restore();
      // Rand rot bei wenig Leben
      if (P.hp / P.maxhp < 0.3) { g.fillStyle = `rgba(200,0,0,${0.12 + Math.sin(t * 6) * 0.06})`; g.fillRect(0, 0, VW, 3); g.fillRect(0, VH - 3, VW, 3); g.fillRect(0, 0, 3, VH); g.fillRect(VW - 3, 0, 3, VH); }
      // HUD
      hZeit.textContent = endlos ? fmtZeit(t) : fmtZeit(Math.max(0, dauer - t));
      hKills.textContent = `☠ ${kills}`; hLv.textContent = `Stufe ${lvl}`;
      xpFill.style.width = `${Math.min(100, (xp / xpNeed) * 100)}%`;
    }

    /* ───────── Start / Schleife / Ende ───────── */
    let last = performance.now(), raf = 0;
    function loop(now) {
      if (over) return;
      raf = requestAnimationFrame(loop);
      let dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (opts.speedup) dt *= opts.speedup;
      if (!paused) { const steps = dt > 0.034 ? 2 : 1; for (let i = 0; i < steps && !over && !paused; i++) update(dt / steps); }
      draw();
    }
    function ende(sieg, aufgegeben = false) {
      if (over) return; over = true; cancelAnimationFrame(raf);
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis);
      draw();
      const res = { sieg, aufgegeben, kills, stufe: lvl, zeit: Math.round(t), boss: bossKilled, items: [...owned.values()].map((o) => [o.id, o.lv]), legenden: [...legends.keys()] };
      modal.hidden = false; modal.innerHTML = '';
      const box = el('div', 'hb-box'); box.append(el('h3', 'hb-h', endlos ? 'Die Übung ist vorbei' : sieg ? 'Sieg!' : aufgegeben ? 'Rückzug' : 'Du bist gefallen'));
      box.append(el('p', 'hb-sub', `${fmtZeit(t)} überstanden · ${kills} Gegner besiegt · Stufe ${lvl}${bossKilled ? ' · Anführer besiegt' : ''}`));
      if (opts.rekord != null) box.append(el('p', 'hb-sub', t > opts.rekord ? 'Neuer Rekord!' : `Dein Rekord: ${fmtZeit(opts.rekord)}`));
      const ks = aktiveKombis(); if (ks.length || legends.size) box.append(el('p', 'hb-sub', `${ks.length} Kombis${legends.size ? `, ${legends.size} Legende${legends.size > 1 ? 'n' : ''}` : ''}`));
      const w = el('div', 'hb-build'); for (const o of [...owned.values()].sort((a, b) => b.lv - a.lv).slice(0, 18)) { const r = el('div', 'hb-bitem'); r.append(itemIcon(ITEM[o.id]), el('span', null, `${ITEM[o.id].name} · ${o.lv}`)); w.append(r); } box.append(w);
      const b = el('button', 'hb-btn', 'Weiter'); b.onclick = () => { root.remove(); resolve(res); };
      box.append(el('div', 'hb-row')); box.lastChild.append(b); modal.append(box);
      if (opts.autoclose) setTimeout(() => b.click(), 50);
    }

    // Startausrüstung
    recompute();
    for (const [id, lv] of Object.entries(meta.start)) { for (let i = 0; i < lv; i++) nimm(id, true); }
    if (!owned.size) nimm(pick(['kurzschwert', 'bogen', 'wurfmesser', 'wurfaxt']), true);
    P.x0 = 0; P.y0 = 0; P.hp = ST.maxhp;
    // Einleitung
    paused = true; modal.hidden = false;
    const intro = el('div', 'hb-box');
    intro.append(el('h3', 'hb-h', opts.titel || 'Kampf'));
    if (opts.text) intro.append(el('p', 'hb-sub', opts.text));
    intro.append(el('p', 'hb-sub', `${endlos ? 'Halte so lange durch, wie du kannst.' : `Überstehe ${fmtZeit(dauer)}.`} Du greifst von selbst an – du bestimmst nur, wohin du läufst (WASD/Pfeiltasten oder mit dem Finger ziehen). Gegner hinterlassen Erfahrung; bei jedem Aufstieg wählst du ein Item. Viele Items verstärken sich gegenseitig.`));
    const start = [...owned.values()].map((o) => `${ITEM[o.id].name} ${o.lv}`).join(', ');
    intro.append(el('p', 'hb-sub', `Zu Beginn: ${start}.${helferListe.length ? ` Unterstützung: ${helferListe.map((h) => h.name).join(', ')}.` : ''}`));
    if (meta.quellen.length) intro.append(el('p', 'hb-sub small', meta.quellen.slice(0, 5).join(' · ')));
    const go = el('button', 'hb-btn', 'Los!'); go.onclick = () => { modal.hidden = true; paused = false; last = performance.now(); };
    const row0 = el('div', 'hb-row'); row0.append(go); intro.append(row0); modal.append(intro);
    if (opts.autostart) go.click();
    raf = requestAnimationFrame(loop);
    if (opts.debug) opts.debug({ P, enemies, owned, nimm, get ST() { return ST; }, get t() { return t; }, get lvl() { return lvl; }, get kills() { return kills; }, aktiveKombis, legends, modal, zeigeAuswahl, ende });
  });
}
