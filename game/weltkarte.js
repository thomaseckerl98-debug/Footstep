// Die große Weltkarte: zoombar, live, für alle Spieler gleich.
// Gelände aus welt_gelaende.js (im Worker gerechnet), Orte als Pixel-Bilder, die mit Häusern, Mauern und Türmen wachsen,
// Straßen, Reiche, Beziehungen, Ereignisse (Feuer, Feste, Fehden, Handelszüge) und Spieler unterwegs.
import { WELT, BESCHRIFTUNG, ORT_ZIEL, WAELDER, MOORE, HEIDEN, GEBIRGE } from './welt_daten.js?v=1';
import { punkt, hash2, zeichneAusschnitt } from './welt_gelaende.js?v=1';

export const ART_NAME = { dorf: 'Dorf', stadt: 'Stadt', grossstadt: 'Großstadt', burg: 'Burg', kloster: 'Kloster' };
const MAUER_NAME = ['keine Mauer', 'eine Palisade', 'eine Steinmauer', 'mächtige Wehrmauern'];
const BEZ_NAME = { handel: 'Handel', buendnis: 'Bündnis', rivalitaet: 'Rivalität', furcht: 'Furcht', nachbar: 'Nachbarn', vasall: 'Untertan' };
const ESC = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hstr = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const inPoly = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

export function ortRadius(o) {
  const h = Math.max(0, o.haeuser || 0);
  return o.art === 'grossstadt' ? 40 + h * 0.55 : o.art === 'stadt' ? 26 + h * 0.72 : o.art === 'burg' ? 24 + h * 0.6 : o.art === 'kloster' ? 24 : 17 + Math.min(h, 30) * 1.1;
}

/* ───────── Worker ───────── */
let worker = null, wid = 0; const wait = new Map();
function startWorker() {
  if (worker !== null) return;
  try {
    worker = new Worker(new URL('./welt_worker.js?v=1', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => { const r = wait.get(e.data.id); wait.delete(e.data.id); r?.(e.data); };
    worker.onerror = () => { worker = false; for (const [, r] of wait) r({ fehler: 'worker' }); wait.clear(); };
  } catch { worker = false; }
}
function job(msg) { return new Promise((res) => { if (!worker) return res({ fehler: 'worker' }); const id = ++wid; wait.set(id, res); worker.postMessage({ ...msg, id }); }); }
async function raster(x0, y0, w, h, u, orte) {
  startWorker();
  if (worker) { const r = await job({ typ: 'raster', x0, y0, w, h, u, orte }); if (r.buf) return r.buf; }
  await new Promise((r) => setTimeout(r, 0));
  return zeichneAusschnitt(x0, y0, w, h, u, orte);
}
const toCanvas = (buf, w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf.buffer || buf), w, h), 0, 0); return cv; };

/* ───────── Orts-Bilder (1 Pixel = 1 Welteinheit) ───────── */
const DACH = { stroh: ['#c9a45a', '#a8853e', '#e0c27a'], holz: ['#6e4a2e', '#563822', '#8a6240'], schiefer: ['#5a6676', '#434d5a', '#7a8696'], ziegel: ['#a8573c', '#86412c', '#c8704e'], ziegelrot: ['#b9623f', '#954a30', '#d8805a'], schilf: ['#8a7a4a', '#6c5e36', '#a8975e'] };
const WAND = { stroh: '#d9ccae', holz: '#8f7252', schiefer: '#a8a294', ziegel: '#dccdb2', ziegelrot: '#e0d2b8', schilf: '#7e6c4c' };
function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
function haus(c, x, y, w, hh, stil, r, gross = false) {
  const d = DACH[stil] || DACH.stroh, wand = WAND[stil] || WAND.stroh, rh = Math.max(2, Math.round(w / 2));
  px(c, x + 1, y + 1, w, hh + rh, 'rgba(20,24,16,.35)');
  px(c, x, y + rh, w, hh, wand); px(c, x, y + rh + hh - 1, w, 1, 'rgba(0,0,0,.25)');
  for (let i = 0; i < rh; i++) { const ww = Math.max(1, w - Math.round((rh - 1 - i) * (w / rh) * 0.5)); px(c, x + (w - ww) / 2, y + i, ww, 1, i === 0 ? d[2] : d[0]); }
  px(c, x, y + rh - 1, Math.ceil(w / 2), 1, d[2]); px(c, x + Math.ceil(w / 2), y + rh - 1, Math.floor(w / 2), 1, d[1]);
  if (w >= 5) px(c, x + Math.floor(w / 2) - (r < 0.5 ? 1 : 0), y + rh + hh - 2, 1, 2, '#3a2a1c');
  if (gross && w >= 6) px(c, x + 1, y + rh + 1, 1, 1, '#f0d890');
}
function turm(c, x, y, stil, farbe) {
  px(c, x + 1, y + 2, 5, 9, 'rgba(20,24,16,.35)'); px(c, x, y + 3, 4, 8, '#9a958a'); px(c, x, y + 3, 1, 8, '#b8b3a8'); px(c, x + 3, y + 3, 1, 8, '#7a756a');
  for (let i = 0; i < 4; i++) px(c, x + 2 - Math.floor(i / 2), y + i - 1, 1 + Math.floor(i / 2) * 2, 1, farbe || (DACH[stil] || DACH.schiefer)[0]);
  px(c, x + 1, y + 6, 1, 1, '#2a2420');
}
function kirche(c, x, y, stil) {
  haus(c, x, y + 4, 10, 6, stil, 0.3, true);
  px(c, x + 7, y - 3, 4, 13, '#c8c0ae'); px(c, x + 7, y - 3, 1, 13, '#e0d8c6');
  for (let i = 0; i < 5; i++) px(c, x + 9 - Math.floor(i / 2), y - 8 + i, 1 + Math.floor(i / 2) * 2 > 4 ? 4 : 1 + Math.floor(i / 2) * 2, 1, '#5a6676');
  px(c, x + 9, y - 10, 1, 2, '#e8c25a');
}
function burg(c, x, y, farbe) {
  px(c, x - 1, y + 1, 18, 14, 'rgba(20,24,16,.4)');
  px(c, x, y + 3, 16, 11, '#a39d90'); px(c, x, y + 3, 16, 1, '#c4beb2'); for (let i = 0; i < 16; i += 2) px(c, x + i, y + 2, 1, 1, '#c4beb2');
  turm(c, x - 2, y - 2, 'schiefer'); turm(c, x + 14, y - 2, 'schiefer');
  px(c, x + 5, y - 4, 6, 8, '#b4aea2'); px(c, x + 5, y - 4, 6, 1, '#d0cabe'); for (let i = 0; i < 6; i += 2) px(c, x + 5 + i, y - 5, 1, 1, '#d0cabe');
  px(c, x + 7, y + 9, 2, 5, '#3a2a1c'); px(c, x + 8, y - 11, 1, 7, '#4a3a2a'); px(c, x + 9, y - 11, 4, 3, farbe || '#c04030');
}
function ortBild(o, reiche) {
  const r = ortRadius(o), S = Math.ceil(r * 2.6), c0 = document.createElement('canvas'); c0.width = S; c0.height = S;
  const c = c0.getContext('2d'), R = rng(hstr(o.id)), cx = S / 2, cy = S / 2, stil = o.stil || 'stroh', sp = new Set(o.spezial || []);
  const farbe = reiche?.[o.reich]?.farbe || '#c04030', gross = o.art === 'stadt' || o.art === 'grossstadt';
  const vis = o.art === 'grossstadt' ? 2.6 : o.art === 'stadt' ? 1.8 : o.art === 'burg' ? 1.3 : 1, n = Math.max(3, Math.min(260, Math.round((o.haeuser || 0) * vis)));
  // Platz und Wege in der Mitte
  c.fillStyle = gross ? 'rgba(190,170,130,.55)' : 'rgba(160,140,100,.35)'; c.beginPath(); c.ellipse(cx, cy, r * (gross ? 0.32 : 0.22), r * (gross ? 0.24 : 0.16), 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(150,125,85,.6)'; c.lineWidth = gross ? 2 : 1;
  for (let k = 0; k < (gross ? 4 : 2); k++) { const a = R() * 6.28; c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(cx + Math.cos(a + 0.4) * r * 0.5, cy + Math.sin(a + 0.4) * r * 0.4, cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 0.9); c.stroke(); }
  // Sonderflächen hinter den Häusern
  const seite = R() < 0.5 ? 1 : -1;
  if (sp.has('kuehe') || sp.has('weide')) {
    const fx = cx + seite * r * 0.95 - 11, fy = cy + r * 0.2; px(c, fx, fy, 22, 13, 'rgba(120,170,70,.6)'); c.strokeStyle = '#7a5a36'; c.lineWidth = 1; c.strokeRect(fx + 0.5, fy + 0.5, 21, 12);
    for (let k = 0; k < (sp.has('kuehe') ? 6 : 3); k++) { const kx = fx + 3 + R() * 15, ky = fy + 3 + R() * 7; px(c, kx, ky, 3, 2, '#f0ede4'); px(c, kx + (R() < 0.5 ? 0 : 2), ky, 1, 1, '#2a2620'); px(c, kx + 3, ky, 1, 1, '#2a2620'); }
  }
  if (sp.has('schafe')) for (let k = 0; k < 9; k++) { const a = R() * 6.28, d = r * (0.8 + R() * 0.5); px(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 2, 2, '#ece8dc'); }
  if (sp.has('wein')) { const fx = cx - seite * r * 1.0 - 10, fy = cy - r * 0.5; for (let row = 0; row < 6; row++) for (let k = 0; k < 18; k += 2) px(c, fx + k + (row % 2), fy + row * 3, 1, 2, row % 2 ? '#4a6a2a' : '#3a5a22'); }
  if (sp.has('steinbruch')) { c.fillStyle = '#c8c2b4'; c.beginPath(); c.ellipse(cx + seite * r * 0.9, cy - r * 0.6, 12, 7, 0, 0, 7); c.fill(); px(c, cx + seite * r * 0.9 - 8, cy - r * 0.6 - 1, 16, 1, '#8f897c'); px(c, cx + seite * r * 0.9 - 5, cy - r * 0.6 + 3, 10, 1, '#8f897c'); }
  if (sp.has('mine') || sp.has('silber')) { const mx = cx - seite * r * 0.9, my = cy - r * 0.55; c.fillStyle = '#7f786c'; c.beginPath(); c.ellipse(mx, my + 3, 10, 6, 0, 0, 7); c.fill(); px(c, mx - 3, my - 1, 6, 5, '#2a2420'); px(c, mx - 4, my - 2, 8, 1, '#5a4a36'); px(c, mx + 6, my + 4, 3, 2, '#5a4a36'); }
  if (sp.has('kohle')) for (let k = 0; k < 4; k++) { const mx = cx + (R() - 0.5) * r * 1.6, my = cy + r * 0.6 + R() * 6; c.fillStyle = '#3e342a'; c.beginPath(); c.ellipse(mx, my, 4, 2.5, 0, 0, 7); c.fill(); }
  if (sp.has('holz') || sp.has('harz')) for (let k = 0; k < 3; k++) { const mx = cx + (R() - 0.5) * r * 1.4, my = cy + r * 0.55; for (let j = 0; j < 3; j++) px(c, mx, my - j * 2, 6 - j, 2, j % 2 ? '#8a6238' : '#a07448'); }
  if (sp.has('salzgarten') || sp.has('salz')) for (let k = 0; k < 6; k++) px(c, cx - r * 0.9 + k * 6, cy + r * 0.75, 5, 4, k % 2 ? '#e8e8e0' : '#d0dcd8');
  if (sp.has('kraeuter') || sp.has('pilze') || sp.has('heiler')) for (let k = 0; k < 10; k++) px(c, cx + seite * r * 0.7 + (k % 5) * 3, cy + r * 0.45 + Math.floor(k / 5) * 3, 2, 2, k % 3 ? '#6a9a4a' : '#c8a0d0');
  // Häuser
  const list = [], inner = gross ? r * 0.3 : r * 0.18;
  for (let k = 0; k < n; k++) {
    const a = k * 2.39996 + R() * 0.5, d = inner + (r * 0.92 - inner) * Math.sqrt((k + 0.5) / n) * (0.88 + R() * 0.2);
    const w = gross && k < n * 0.3 ? 6 + Math.round(R() * 3) : 5 + Math.round(R() * 2);
    const hx = cx + Math.cos(a) * d, hy = cy + Math.sin(a) * d * 0.78;
    if (!sp.has('stelzen') && punkt(o.x + hx - cx, o.y + hy - cy).wasser) continue;
    list.push({ x: hx - w / 2, y: hy - 4, w, h: gross && k < n * 0.25 ? 4 : 3, r: R() });
  }
  list.sort((a, b) => a.y - b.y);
  const stelzen = sp.has('stelzen');
  for (const hs of list) { if (stelzen) { px(c, hs.x + 1, hs.y + 6, 1, 3, '#4a3a26'); px(c, hs.x + hs.w - 2, hs.y + 6, 1, 3, '#4a3a26'); } haus(c, hs.x, hs.y - (stelzen ? 2 : 0), hs.w, hs.h, stil, hs.r, gross); }
  // Bauten in der Mitte
  if (sp.has('hof') || o.art === 'burg' || sp.has('burg')) {
    if (sp.has('fels')) { c.fillStyle = '#7a7366'; c.beginPath(); c.ellipse(cx, cy + 6, 16, 9, 0, 0, 7); c.fill(); px(c, cx - 14, cy + 6, 28, 2, '#5f594e'); }
    burg(c, cx - 8, cy - 10, farbe);
  }
  if (sp.has('dom') || sp.has('kloster')) kirche(c, cx + (sp.has('hof') ? 14 : -5), cy - 12, stil === 'stroh' ? 'ziegel' : stil);
  if (sp.has('gilde')) { px(c, cx - 3, cy - 14, 7, 16, '#3a3434'); px(c, cx - 3, cy - 14, 1, 16, '#4e4646'); for (let i = 0; i < 7; i += 2) px(c, cx - 3 + i, cy - 15, 1, 1, '#4e4646'); px(c, cx, cy - 22, 1, 8, '#2a2420'); px(c, cx + 1, cy - 22, 5, 3, '#1a1616'); px(c, cx - 1, cy - 8, 2, 2, '#c84a2a'); }
  if (sp.has('markt')) for (let k = 0; k < 7; k++) { const a = k * 0.9, d = r * 0.16; px(c, cx + Math.cos(a) * d * 1.3 - 1, cy + Math.sin(a) * d, 3, 2, ['#c84a3a', '#e8c25a', '#4a7ac8', '#f0ece0'][k % 4]); }
  if (sp.has('muehle') || sp.has('korn')) for (let k = 0; k < (sp.has('korn') ? 3 : 1); k++) { const mx = cx + seite * (r * 0.85 + k * 9), my = cy - r * 0.35 + k * 6; px(c, mx, my, 4, 7, '#e0d8c6'); px(c, mx, my, 4, 1, '#8a6a4a'); px(c, mx + 1, my - 4, 2, 4, '#5a4a36'); px(c, mx - 2, my - 3, 8, 1, '#5a4a36'); }
  if (sp.has('leuchtturm')) { const lx = cx - r * 0.9, ly = cy - r * 0.2; for (let i = 0; i < 12; i++) px(c, lx, ly + i, 3, 1, Math.floor(i / 3) % 2 ? '#c84a3a' : '#f0ece0'); px(c, lx - 1, ly - 2, 5, 2, '#3a3434'); px(c, lx, ly - 4, 3, 2, '#ffe890'); }
  if (sp.has('zoll') || sp.has('pass')) { px(c, cx - r * 0.9, cy + 6, r * 1.8, 1, '#c84a3a'); px(c, cx - r * 0.9, cy + 6, 2, 1, '#f0ece0'); }
  // Mauern
  if (o.mauer > 0) {
    const mr = r * 0.98;
    c.save(); c.translate(cx, cy + 2); c.scale(1, 0.8);
    if (o.mauer === 1) { for (let a = 0; a < 6.28; a += 2.2 / mr) { const x = Math.cos(a) * mr, y = Math.sin(a) * mr; c.fillStyle = '#6e4e2e'; c.fillRect(Math.round(x), Math.round(y) - 2, 1, 3); c.fillStyle = '#9a7448'; c.fillRect(Math.round(x), Math.round(y) - 3, 1, 1); } }
    else { c.strokeStyle = 'rgba(30,26,20,.45)'; c.lineWidth = o.mauer === 3 ? 5 : 4; c.beginPath(); c.arc(1, 2, mr, 0, 7); c.stroke(); c.strokeStyle = o.mauer === 3 ? '#b8b2a4' : '#a39d90'; c.lineWidth = o.mauer === 3 ? 3.2 : 2.2; c.beginPath(); c.arc(0, 0, mr, 0, 7); c.stroke();
      c.fillStyle = '#d0cabe'; for (let a = 0; a < 6.28; a += 3 / mr) c.fillRect(Math.round(Math.cos(a) * mr), Math.round(Math.sin(a) * mr) - 2, 1, 1); }
    c.restore();
    const gate = [0.4, 3.6].map((a) => [cx + Math.cos(a) * mr, cy + 2 + Math.sin(a) * mr * 0.8]);
    if (o.mauer >= 2) for (const [gx, gy] of gate) { px(c, gx - 3, gy - 6, 7, 7, '#a39d90'); px(c, gx - 1, gy - 3, 3, 4, '#2a2420'); }
  }
  // Türme
  const tz = Math.min(12, o.tuerme || 0);
  for (let k = 0; k < tz; k++) { const a = (k / Math.max(1, tz)) * 6.28 + 0.8, mr = r * (o.mauer ? 0.98 : 0.85); turm(c, cx + Math.cos(a) * mr - 2, cy + 2 + Math.sin(a) * mr * 0.8 - 10, o.mauer >= 2 ? 'schiefer' : stil, farbe); }
  return { cv: c0, S, r };
}

/* ───────── Position eines Spielers unterwegs ───────── */
const lerp = (a, b, t) => a + (b - a) * t;
export function spielerPos(sp, orte) {
  const home = orte.find((o) => o.id === sp.ort); if (!home) return null;
  const u = sp.unterwegs; if (!u) return { x: home.x, y: home.y, home, unterwegs: false };
  const seed = u.seed || 0.5, a = seed * Math.PI * 2, dist = u.dist || 150;
  let tx = home.x + Math.cos(a) * dist, ty = home.y + Math.sin(a) * dist * 0.85;
  const want = ORT_ZIEL[u.ziel_art] || 'wald';
  if (want === 'ort') {
    const n = orte.filter((o) => o.id !== home.id && !o.spieler).sort((p, q) => Math.hypot(p.x - tx, p.y - ty) - Math.hypot(q.x - tx, q.y - ty))[0];
    if (n && dist > 60) { const d = Math.hypot(n.x - home.x, n.y - home.y), rr = ortRadius(n) * 1.1; tx = n.x - (n.x - home.x) / d * rr; ty = n.y - (n.y - home.y) / d * rr; }
  } else {
    let best = null, bs = -1e9;
    for (let k = 0; k < 28; k++) {
      const aa = k * 2.39996, dd = 18 + Math.sqrt(k / 28) * 170, x = Math.max(40, Math.min(WELT.w - 40, tx + Math.cos(aa) * dd)), y = Math.max(40, Math.min(WELT.h - 40, ty + Math.sin(aa) * dd));
      const p = punkt(x, y); if (p.wasser) continue;
      let sc = -dd / 400;
      if (want === 'wald') sc += p.wald * 2; else if (want === 'berg') sc += (p.h > 0.32 && p.h < 0.62 ? 1.5 : 0) + p.h; else if (want === 'wasser') sc += Math.max(0, 1 - Math.abs(p.rsd) / 60); else sc += 1 - p.wald;
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    if (best) [tx, ty] = best;
  }
  const t = Math.max(0, Math.min(1, u.t ?? 1)), mx = (home.x + tx) / 2 + (ty - home.y) * 0.18 * (seed - 0.5) * 2, my = (home.y + ty) / 2 - (tx - home.x) * 0.18 * (seed - 0.5) * 2;
  const bez = (tt) => [lerp(lerp(home.x, mx, tt), lerp(mx, tx, tt), tt), lerp(lerp(home.y, my, tt), lerp(my, ty, tt), tt)];
  const [x, y] = bez(t), pfad = []; for (let k = 0; k <= 24; k++) pfad.push(bez((k / 24) * t));
  return { x, y, home, ziel: [tx, ty], t, pfad, unterwegs: true, gegend: gegend(x, y, orte) };
}
export function gegend(x, y, orte) {
  for (const w of WAELDER) if (inPoly(x, y, w.pts)) return 'im ' + w.name;
  for (const m of MOORE) if (inPoly(x, y, m.pts)) return 'im ' + m.name;
  for (const h of HEIDEN) if (inPoly(x, y, h.pts)) return 'auf der ' + h.name;
  const p = punkt(x, y);
  if (p.h > 0.36) { let g = null, bd = 1e9; for (const m of GEBIRGE) for (const [gx, gy] of m.pts) { const d = Math.hypot(gx - x, gy - y); if (d < bd) { bd = d; g = m; } } if (g && bd < 500) return 'in den Bergen des ' + g.name + (g.name.endsWith('e') ? 'n' : 's'); }
  if (p.wald > 0.4) return 'in einem Wald';
  const n = orte.slice().sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  if (n.length > 1) return Math.hypot(n[0].x - x, n[0].y - y) < ortRadius(n[0]) * 1.4 ? 'in ' + n[0].name : 'zwischen ' + n[0].name + ' und ' + n[1].name;
  return 'unterwegs';
}

/* ───────── Kleine Pixel-Figur ───────── */
function figur(c, x, y, t, farbe) {
  const b = Math.round(Math.sin(t / 180) * 1);
  px(c, x - 2, y + 4, 5, 1, 'rgba(0,0,0,.35)'); px(c, x - 1, y - 4 + b, 3, 3, '#f0c8a0'); px(c, x - 2, y - 1 + b, 5, 4, farbe || '#3f6a3a'); px(c, x - 1, y + 3, 1, 2, '#3a2a1e'); px(c, x + 1, y + 3, 1, 2, '#3a2a1e'); px(c, x + 3, y - 3 + b, 1, 7, '#7a5a36');
}

/* ───────── Die Karte ───────── */
export class Weltkarte {
  constructor({ db, onClose }) {
    this.db = db; this.onClose = onClose; this.daten = null; this.bilder = new Map(); this.kacheln = new Map(); this.queue = []; this.busy = 0;
    this.zeige = { reiche: false, handel: false, spannung: true, ereignisse: true, spieler: true, wege: true };
    try { Object.assign(this.zeige, JSON.parse(localStorage.getItem('mh_karte_zeige') || '{}')); } catch { /* egal */ }
    this.cx = WELT.w / 2; this.cy = WELT.h / 2; this.s = 0.3; this.sel = null; this.offen = false; this.pointers = new Map();
    globalThis.__weltkarte = this;
  }
  baue() {
    if (this.el) return;
    const el = document.createElement('div'); el.className = 'wk ui'; el.hidden = true;
    el.innerHTML = `<canvas class="wk-cv"></canvas>
      <div class="wk-top"><div class="wk-titel"><b>${ESC(WELT.name)}</b><span class="small">Die Weltkarte – für alle gleich, und sie lebt</span></div>
        <div class="wk-chips"></div>
        <div class="wk-zoom"><button class="px-btn icon" data-z="in" title="Näher">+</button><button class="px-btn icon" data-z="out" title="Weiter weg">−</button><button class="px-btn icon" data-z="home" title="Zu meinem Dorf">⌂</button><button class="px-btn icon" data-z="all" title="Ganze Karte">◎</button><button class="px-btn icon wk-close" title="Schließen">✕</button></div></div>
      <div class="wk-karte" hidden></div><div class="wk-chronik" hidden></div><div class="wk-laden small">Die Karte wird gezeichnet …</div><div class="wk-tip" hidden></div>`;
    document.body.append(el); this.el = el; this.cv = el.querySelector('.wk-cv'); this.c = this.cv.getContext('2d');
    el.querySelector('.wk-close').onclick = () => this.schliessen();
    el.querySelector('.wk-zoom').onclick = (e) => { const z = e.target.closest('[data-z]')?.dataset.z; if (!z) return; if (z === 'in') this.zoomUm(1.6); else if (z === 'out') this.zoomUm(1 / 1.6); else if (z === 'home') this.zuMeinemDorf(); else this.alles(); };
    const chips = el.querySelector('.wk-chips');
    const CH = [['reiche', 'Reiche'], ['handel', 'Handel & Bündnisse'], ['spannung', 'Spannungen'], ['ereignisse', 'Ereignisse'], ['spieler', 'Spieler'], ['wege', 'Straßen']];
    for (const [k, n] of CH) { const b = document.createElement('button'); b.type = 'button'; b.className = 'wk-chip' + (this.zeige[k] ? ' on' : ''); b.textContent = n; b.onclick = () => { this.zeige[k] = !this.zeige[k]; b.classList.toggle('on', this.zeige[k]); try { localStorage.setItem('mh_karte_zeige', JSON.stringify(this.zeige)); } catch { /* egal */ } }; chips.append(b); }
    const ch = document.createElement('button'); ch.type = 'button'; ch.className = 'wk-chip'; ch.textContent = 'Weltgeschehen'; ch.onclick = () => { const p = el.querySelector('.wk-chronik'); p.hidden = !p.hidden; ch.classList.toggle('on', !p.hidden); if (!p.hidden) this.chronik(); }; chips.append(ch);
    // Bedienung: ziehen, Mausrad, zwei Finger, tippen
    const cv = this.cv;
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomUm(Math.exp(-e.deltaY * 0.0016), e.offsetX, e.offsetY); }, { passive: false });
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY, x0: e.offsetX, y0: e.offsetY, t0: performance.now() }); });
    cv.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) { this.hover(e.offsetX, e.offsetY); return; }
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y); p.x = e.offsetX; p.y = e.offsetY;
        const [a2, b2] = [...this.pointers.values()], d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y); if (d0 > 0) this.zoomUm(d1 / d0, (a2.x + b2.x) / 2, (a2.y + b2.y) / 2);
      } else { this.cx -= (e.offsetX - p.x) / this.s; this.cy -= (e.offsetY - p.y) / this.s; p.x = e.offsetX; p.y = e.offsetY; this.klemmen(); }
    });
    const up = (e) => { const p = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId); if (p && Math.hypot(e.offsetX - p.x0, e.offsetY - p.y0) < 6 && performance.now() - p.t0 < 500) this.tippen(e.offsetX, e.offsetY); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', (e) => this.pointers.delete(e.pointerId));
    cv.addEventListener('dblclick', (e) => this.zoomUm(2, e.offsetX, e.offsetY));
    this.keys = (e) => { if (!this.offen) return; if (e.key === 'Escape') this.schliessen(); if (e.key === '+') this.zoomUm(1.4); if (e.key === '-') this.zoomUm(1 / 1.4); };
    window.addEventListener('keydown', this.keys);
    window.addEventListener('resize', () => this.offen && this.groesse());
  }
  groesse() { const d = Math.min(2, window.devicePixelRatio || 1); this.dpr = d; this.W = this.cv.clientWidth; this.H = this.cv.clientHeight; this.cv.width = Math.round(this.W * d); this.cv.height = Math.round(this.H * d); this.klemmen(); }
  minS() { return Math.min(this.W / WELT.w, this.H / WELT.h) * 0.92; }
  klemmen() { this.s = Math.max(this.minS(), Math.min(3.6, this.s)); const hw = this.W / 2 / this.s, hh = this.H / 2 / this.s; this.cx = Math.max(Math.min(hw - 150, WELT.w / 2), Math.min(Math.max(WELT.w - hw + 150, WELT.w / 2), this.cx)); this.cy = Math.max(Math.min(hh - 150, WELT.h / 2), Math.min(Math.max(WELT.h - hh + 150, WELT.h / 2), this.cy)); }
  zoomUm(f, sx = this.W / 2, sy = this.H / 2) { const wx = this.cx + (sx - this.W / 2) / this.s, wy = this.cy + (sy - this.H / 2) / this.s; this.s *= f; this.klemmen(); this.cx = wx - (sx - this.W / 2) / this.s; this.cy = wy - (sy - this.H / 2) / this.s; this.klemmen(); }
  flieg(x, y, s) { this.ziel = { x, y, s: s ?? this.s, t0: performance.now(), x0: this.cx, y0: this.cy, s0: this.s }; }
  alles() { this.flieg(WELT.w / 2, WELT.h / 2, this.minS()); }
  meinOrt() { return this.daten?.orte.find((o) => o.spieler?.ich); }
  zuMeinemDorf() { const o = this.meinOrt(); const p = this.daten?.spieler.find((x) => x.ich); const pos = p && spielerPos(p, this.daten.orte); if (pos) this.flieg(pos.x, pos.y, Math.max(this.s, 1.4)); else if (o) this.flieg(o.x, o.y, Math.max(this.s, 1.4)); }
  sx(x) { return (x - this.cx) * this.s + this.W / 2; } sy(y) { return (y - this.cy) * this.s + this.H / 2; }

  async oeffnen() {
    this.baue(); this.el.hidden = false; this.offen = true; this.groesse();
    if (!this.daten) { this.s = this.minS(); this.cx = WELT.w / 2; this.cy = WELT.h / 2; }
    await this.laden();
    if (!this.base) this.grundbild();
    clearInterval(this.timer); this.timer = setInterval(() => this.laden(), 60000);
    cancelAnimationFrame(this.raf); const loop = (t) => { if (!this.offen) return; this.raf = requestAnimationFrame(loop); try { this.zeichne(t); } catch (e) { if (!this.fehlerGemeldet) { this.fehlerGemeldet = true; console.warn('Weltkarte:', e); } } }; this.raf = requestAnimationFrame(loop);
  }
  schliessen() { this.offen = false; clearInterval(this.timer); cancelAnimationFrame(this.raf); if (this.el) this.el.hidden = true; this.onClose?.(); }
  async laden() {
    const { data, error } = await this.db.rpc('welt_karte');
    if (error || !data) { this.el.querySelector('.wk-laden').textContent = 'Die Karte konnte nicht geladen werden.'; return; }
    const alt = this.daten; this.daten = data; this.zeit = Date.parse(data.jetzt) - Date.now();
    this.byId = new Map(data.orte.map((o) => [o.id, o]));
    for (const o of data.orte) { const k = [o.haeuser, o.mauer, o.tuerme, o.art, (o.spezial || []).join()].join('|'); if (this.bilder.get(o.id)?.k !== k) this.bilder.set(o.id, { k, ...ortBild(o, data.reiche) }); }
    this.posCache = new Map(data.spieler.map((p) => [p.name, spielerPos(p, data.orte)]));
    if (!alt) { this.reicheBild(); this.berechneWege(); const o = this.meinOrt(); if (o && this.s < 0.5) { /* zuerst die ganze Karte */ } }
    if (this.sel) { const o = this.byId.get(this.sel); if (o) this.karte(o); }
    if (!this.el.querySelector('.wk-chronik').hidden) this.chronik();
  }
  ortListe() { return this.daten.orte.map((o) => ({ x: o.x, y: o.y, r: ortRadius(o) })); }
  async grundbild() {
    const W = 1000, H = 750, buf = await raster(0, 0, W, H, 4, this.ortListe());
    this.base = toCanvas(buf, W, H); this.el.querySelector('.wk-laden').hidden = true;
  }
  kachel(tx, ty) {
    const k = tx + ',' + ty; let e = this.kacheln.get(k); if (e) { e.t = performance.now(); return e.cv; }
    if (!this.queue.includes(k)) this.queue.push(k);
    this.pump(); return null;
  }
  pump() {
    while (this.busy < 2 && this.queue.length) {
      const k = this.queue.pop(), [tx, ty] = k.split(',').map(Number); this.busy++;
      raster(tx * 256, ty * 256, 256, 256, 1, this.ortListe()).then((buf) => {
        this.busy--; this.kacheln.set(k, { cv: toCanvas(buf, 256, 256), t: performance.now() });
        if (this.kacheln.size > 140) { const old = [...this.kacheln.entries()].sort((a, b) => a[1].t - b[1].t).slice(0, 30); for (const [kk] of old) this.kacheln.delete(kk); }
        this.pump();
      });
    }
  }
  reicheBild() {
    const S = 20, W = WELT.w / S, H = WELT.h / S, img = new ImageData(W, H), R = this.daten.reiche, own = new Int16Array(W * H).fill(-1), keys = Object.keys(R);
    const orte = this.daten.orte.map((o) => ({ ...o, w: o.art === 'grossstadt' ? 3 : o.art === 'stadt' ? 2 : o.art === 'burg' ? 1.6 : o.art === 'kloster' ? 0.5 : 1 }));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wx = x * S + S / 2, wy = y * S + S / 2, p = punkt(wx, wy); if (p.wasser === 1 || p.h > 0.62) continue;
      let best = null, bv = 0; for (const o of orte) { const d = Math.hypot(o.x - wx, o.y - wy), rng = 260 + o.w * 160; if (d > rng) continue; const v = o.w / (d + 60) * (1 - d / rng); if (v > bv) { bv = v; best = o; } }
      if (best) own[y * W + x] = keys.indexOf(best.reich);
    }
    const sum = {};
    for (let i = 0; i < W * H; i++) {
      const k = own[i]; if (k < 0) continue; const col = R[keys[k]].farbe, r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
      const x = i % W, y = (i / W) | 0, rand = [own[i - 1], own[i + 1], own[i - W], own[i + W]].some((n) => n !== undefined && n !== k);
      img.data.set([r, g, b, rand ? 230 : 90], i * 4);
      (sum[keys[k]] ||= [0, 0, 0])[0] += x * S; sum[keys[k]][1] += y * S; sum[keys[k]][2]++;
    }
    this.reicheCv = document.createElement('canvas'); this.reicheCv.width = W; this.reicheCv.height = H; this.reicheCv.getContext('2d').putImageData(img, 0, 0);
    this.reichMitte = Object.entries(sum).filter(([k, v]) => k !== 'frei' && v[2] > 40).map(([k, v]) => ({ k, x: v[0] / v[2], y: v[1] / v[2], n: v[2] }));
  }
  async berechneWege() {
    const orte = this.daten.orte, paare = new Set(), idx = new Map(orte.map((o, i) => [o.id, i]));
    orte.forEach((o, i) => { orte.map((q, j) => [j, Math.hypot(q.x - o.x, q.y - o.y)]).filter(([j, d]) => j !== i && d < 950).sort((a, b) => a[1] - b[1]).slice(0, 2).forEach(([j]) => paare.add([Math.min(i, j), Math.max(i, j)].join(','))); });
    for (const b of this.daten.beziehungen) if (['handel', 'buendnis'].includes(b.art) && idx.has(b.a) && idx.has(b.b)) { const i = idx.get(b.a), j = idx.get(b.b); if (Math.hypot(orte[i].x - orte[j].x, orte[i].y - orte[j].y) < 1700) paare.add([Math.min(i, j), Math.max(i, j)].join(',')); }
    const list = [...paare].map((s) => s.split(',').map(Number)).sort((a, b) => Math.hypot(orte[a[0]].x - orte[a[1]].x, orte[a[0]].y - orte[a[1]].y) - Math.hypot(orte[b[0]].x - orte[b[1]].x, orte[b[0]].y - orte[b[1]].y));
    startWorker();
    if (!worker) return;
    const r = await job({ typ: 'wege', orte: orte.map((o) => ({ id: o.id, x: o.x, y: o.y })), paare: list, w: WELT.w, h: WELT.h });
    if (r.fehler) console.warn('Wege:', r.fehler);
    if (r.wege) { this.wege = r.wege; this.wegIndex = new Map(); for (const w of r.wege) { this.wegIndex.set(w.a + '>' + w.b, w.pts); this.wegIndex.set(w.b + '>' + w.a, w.pts.slice().reverse()); } }
  }

  /* ───────── Zeichnen ───────── */
  zeichne(t) {
    const c = this.c, d = this.dpr; c.setTransform(d, 0, 0, d, 0, 0); c.imageSmoothingEnabled = false;
    if (this.ziel) { const k = Math.min(1, (t - this.ziel.t0) / 700), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; this.cx = lerp(this.ziel.x0, this.ziel.x, e); this.cy = lerp(this.ziel.y0, this.ziel.y, e); this.s = Math.exp(lerp(Math.log(this.ziel.s0), Math.log(this.ziel.s), e)); this.klemmen(); if (k >= 1) this.ziel = null; }
    const s = this.s, W = this.W, H = this.H;
    // Pergament rundherum
    c.fillStyle = '#d9c79c'; c.fillRect(0, 0, W, H);
    const X0 = this.sx(0), Y0 = this.sy(0), WW = WELT.w * s, HH = WELT.h * s;
    c.fillStyle = 'rgba(120,90,50,.18)'; for (let i = 0; i < 6; i++) c.fillRect(X0 - 18 + i * 3, Y0 - 18 + i * 3, WW + 36 - i * 6, HH + 36 - i * 6);
    if (this.base) c.drawImage(this.base, X0, Y0, WW, HH); else { c.fillStyle = '#5f8b3b'; c.fillRect(X0, Y0, WW, HH); }
    // Detail-Kacheln beim Hineinzoomen
    if (s >= 0.55 && this.base) {
      const x0 = Math.max(0, Math.floor((this.cx - W / 2 / s) / 256)), x1 = Math.min(Math.ceil(WELT.w / 256) - 1, Math.floor((this.cx + W / 2 / s) / 256));
      const y0 = Math.max(0, Math.floor((this.cy - H / 2 / s) / 256)), y1 = Math.min(Math.ceil(WELT.h / 256) - 1, Math.floor((this.cy + H / 2 / s) / 256));
      const a = Math.min(1, (s - 0.55) / 0.25); c.globalAlpha = a;
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const cv = this.kachel(tx, ty); if (cv) c.drawImage(cv, Math.floor(this.sx(tx * 256)), Math.floor(this.sy(ty * 256)), Math.ceil(256 * s) + 1, Math.ceil(256 * s) + 1); }
      c.globalAlpha = 1;
    }
    c.strokeStyle = '#4a3420'; c.lineWidth = 3; c.strokeRect(X0 - 1.5, Y0 - 1.5, WW + 3, HH + 3); c.strokeStyle = 'rgba(74,52,32,.5)'; c.lineWidth = 1; c.strokeRect(X0 - 7.5, Y0 - 7.5, WW + 15, HH + 15);
    if (!this.daten) return;
    const now = Date.now() + (this.zeit || 0);
    if (this.zeige.reiche && this.reicheCv) { c.imageSmoothingEnabled = true; c.globalAlpha = 0.5; c.drawImage(this.reicheCv, X0, Y0, WW, HH); c.globalAlpha = 1; c.imageSmoothingEnabled = false; }
    if (this.zeige.wege && this.wege) this.zeichneWege(c, s);
    this.zeichneBeziehungen(c, s, t);
    this.zeichneOrte(c, s, t, now);
    if (this.zeige.ereignisse) this.zeichneEreignisse(c, s, t, now);
    if (this.zeige.spieler) this.zeichneSpieler(c, s, t);
    this.zeichneNamen(c, s);
    this.zeichneRose(c);
  }
  zeichneWege(c, s) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const w of this.wege) {
      c.beginPath(); w.pts.forEach(([x, y], i) => i ? c.lineTo(this.sx(x), this.sy(y)) : c.moveTo(this.sx(x), this.sy(y)));
      c.strokeStyle = 'rgba(60,40,20,.35)'; c.lineWidth = Math.max(1.4, 4.2 * s); c.setLineDash([]); c.stroke();
      c.strokeStyle = 'rgba(205,175,120,.9)'; c.lineWidth = Math.max(0.8, 2.4 * s); c.setLineDash(s < 0.6 ? [3, 3] : []); c.stroke();
      if (s > 0.6) for (const [bx, by, a] of w.bruecken) { c.save(); c.translate(this.sx(bx), this.sy(by)); c.rotate(a); c.fillStyle = '#7a5a36'; c.fillRect(-7 * s, -3 * s, 14 * s, 6 * s); c.fillStyle = '#a07a4a'; c.fillRect(-7 * s, -2 * s, 14 * s, 4 * s); c.restore(); }
    }
    c.setLineDash([]);
  }
  kurve(a, b) { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y; return [mx - dy * 0.12, my + dx * 0.12]; }
  zeichneBeziehungen(c, s, t) {
    const B = this.daten.beziehungen, aktiv = this.daten.ereignisse.filter((e) => e.art === 'fehde');
    const linie = (a, b, col, w, dash, off = 0) => { const [qx, qy] = this.kurve(a, b); c.beginPath(); c.moveTo(this.sx(a.x), this.sy(a.y)); c.quadraticCurveTo(this.sx(qx), this.sy(qy), this.sx(b.x), this.sy(b.y)); c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash); c.lineDashOffset = off; c.stroke(); };
    for (const r of B) {
      const a = this.byId.get(r.a), b = this.byId.get(r.b); if (!a || !b) continue;
      if (this.zeige.handel && r.art === 'handel') linie(a, b, 'rgba(90,190,90,.85)', 2, [2, 6], -t / 60);
      else if (this.zeige.handel && r.art === 'buendnis') linie(a, b, 'rgba(90,150,230,.9)', 2.5, []);
      else if (this.zeige.handel && r.art === 'vasall') linie(a, b, 'rgba(230,190,80,.6)', 1.2, [6, 4]);
      else if (this.zeige.spannung && r.art === 'rivalitaet') linie(a, b, 'rgba(240,140,50,.8)', 2, [8, 5]);
      else if (this.zeige.spannung && r.art === 'furcht') linie(a, b, 'rgba(120,100,140,.8)', 1.6, [1, 4]);
    }
    if (this.zeige.spannung || this.zeige.ereignisse) for (const e of aktiv) {
      const a = this.byId.get(e.ort), b = this.byId.get(e.ziel); if (!a || !b) continue;
      linie(a, b, `rgba(220,40,30,${0.6 + 0.3 * Math.sin(t / 250)})`, 3.2, [10, 6], -t / 40);
      const [qx, qy] = this.kurve(a, b), mx = this.sx((a.x + b.x) / 2 * 0.5 + qx * 0.5), my = this.sy((a.y + b.y) / 2 * 0.5 + qy * 0.5);
      this.schwerter(c, mx, my, 1 + 0.1 * Math.sin(t / 200));
    }
    c.setLineDash([]);
  }
  schwerter(c, x, y, k = 1) {
    c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = 'rgba(20,10,8,.6)'; c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill();
    for (const sgn of [1, -1]) { c.save(); c.rotate(sgn * 0.78); c.fillStyle = '#e8e4dc'; c.fillRect(-1, -8, 2, 12); c.fillStyle = '#c8a040'; c.fillRect(-3, 3, 6, 1.5); c.fillStyle = '#5a3a22'; c.fillRect(-0.8, 4.5, 1.6, 3); c.restore(); }
    c.restore();
  }
  zeichneOrte(c, s, t, now) {
    const list = this.daten.orte.slice().sort((a, b) => a.y - b.y);
    for (const o of list) {
      const b = this.bilder.get(o.id); if (!b) continue;
      const x = this.sx(o.x), y = this.sy(o.y), sz = b.S * s; if (x + sz < 0 || y + sz < 0 || x - sz > this.W || y - sz > this.H) continue;
      if (o.spieler?.ich) { c.fillStyle = `rgba(255,214,90,${0.18 + 0.1 * Math.sin(t / 400)})`; c.beginPath(); c.arc(x, y, Math.max(10, b.r * s * 1.35), 0, 7); c.fill(); }
      if (s < 0.42) {
        // aus der Ferne: Symbol statt Häuser
        const k = o.art === 'grossstadt' ? 7 : o.art === 'stadt' ? 5.5 : o.art === 'burg' ? 5 : 3.5;
        c.fillStyle = 'rgba(30,20,10,.55)'; c.beginPath(); c.arc(x + 1, y + 1, k + 1.5, 0, 7); c.fill();
        c.fillStyle = this.daten.reiche[o.reich]?.farbe || '#ccc'; c.beginPath(); c.arc(x, y, k, 0, 7); c.fill();
        c.fillStyle = '#f4ecd8'; if (o.art === 'grossstadt' || o.art === 'stadt' || o.art === 'burg') c.fillRect(x - k * 0.45, y - k * 0.45, k * 0.9, k * 0.9); else { c.beginPath(); c.arc(x, y, k * 0.42, 0, 7); c.fill(); }
        if (o.mauer > 0) { c.strokeStyle = '#3a2a1c'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, k + 2.5, 0, 7); c.stroke(); }
        continue;
      }
      c.drawImage(b.cv, Math.round(x - sz / 2), Math.round(y - sz / 2), Math.round(sz), Math.round(sz));
      // Rauch aus Schornsteinen
      if (s > 0.9) { const n = Math.min(6, 1 + Math.floor((o.haeuser || 0) / 10)), R = rng(hstr(o.id) + 3); for (let k = 0; k < n; k++) { const ox = (R() - 0.5) * b.r * 1.2, oy = (R() - 0.5) * b.r; for (let j = 0; j < 4; j++) { const ph = ((t / 2600 + j / 4 + R()) % 1); c.fillStyle = `rgba(230,230,225,${0.35 * (1 - ph)})`; c.beginPath(); c.arc(x + (ox + ph * 6 + Math.sin(ph * 6 + k) * 2) * s, y + (oy - 6 - ph * 16) * s, (1 + ph * 2.5) * s, 0, 7); c.fill(); } } }
      if ((o.spezial || []).includes('leuchtturm') && s > 0.5) { const a = (Math.sin(t / 500) + 1) / 2; c.fillStyle = `rgba(255,230,140,${0.2 + 0.4 * a})`; c.beginPath(); c.arc(x - b.r * 0.9 * s + 1.5 * s, y - b.r * 0.2 * s - 3 * s, 8 * s, 0, 7); c.fill(); }
    }
  }
  zeichneEreignisse(c, s, t, now) {
    for (const e of this.daten.ereignisse) {
      const o = this.byId.get(e.ort); if (!o) continue;
      const x = this.sx(o.x), y = this.sy(o.y), r = Math.max(8, ortRadius(o) * s);
      if (e.art === 'brand') {
        for (let k = 0; k < 7; k++) { const ph = (t / 900 + k / 7) % 1, fx = x + Math.sin(k * 2.1) * r * 0.4; c.fillStyle = `rgba(90,80,75,${0.55 * (1 - ph)})`; c.beginPath(); c.arc(fx + ph * 10, y - r * 0.2 - ph * 40 * Math.max(0.6, s), (3 + ph * 9) * Math.max(0.6, s), 0, 7); c.fill(); }
        for (let k = 0; k < 4; k++) { const f = Math.sin(t / 90 + k * 1.7) * 0.5 + 0.5, fx = x + (k - 1.5) * 3 * Math.max(0.7, s) + Math.sin(k * 2.1) * r * 0.3; c.fillStyle = k % 2 ? '#ffb030' : '#e8501e'; c.beginPath(); c.moveTo(fx - 3, y); c.lineTo(fx, y - 6 - f * 6); c.lineTo(fx + 3, y); c.fill(); }
      } else if (e.art === 'seuche') { c.fillStyle = `rgba(150,170,70,${0.18 + 0.08 * Math.sin(t / 500)})`; c.beginPath(); c.arc(x, y, r * 1.25, 0, 7); c.fill(); c.strokeStyle = 'rgba(120,140,40,.55)'; c.setLineDash([3, 4]); c.beginPath(); c.arc(x, y, r * 1.3, 0, 7); c.stroke(); c.setLineDash([]); }
      else if (e.art === 'fest') { for (let k = 0; k < 10; k++) { const a = k * 0.63 + t / 1500, ph = (Math.sin(t / 300 + k) + 1) / 2; c.fillStyle = ['#ffd860', '#ff7a5a', '#7ad0ff', '#c890ff'][k % 4]; c.globalAlpha = 0.4 + 0.6 * ph; c.fillRect(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.6 - 4, 2, 2); } c.globalAlpha = 1; }
      else if (e.art === 'ueberfall') { this.schwerter(c, x + r * 0.7, y - r * 0.6, 0.8); }
      else if (e.art === 'bau' && s > 0.5) { const bx = x + r * 0.55, by = y - r * 0.35; c.strokeStyle = '#8a6236'; c.lineWidth = 1; for (let k = 0; k < 3; k++) { c.strokeRect(bx + k * 3, by, 3, 6); } c.beginPath(); c.moveTo(bx, by + 6); c.lineTo(bx + 9, by); c.stroke(); }
      else if (['mauer', 'turm', 'aufstieg', 'abkommen', 'frieden'].includes(e.art)) { for (let k = 0; k < 6; k++) { const a = k * 1.05 + t / 700; c.fillStyle = e.art === 'frieden' ? '#f4f4f0' : '#ffe080'; c.globalAlpha = 0.5 + 0.5 * Math.sin(t / 200 + k); c.fillRect(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 0.8, 2, 2); } c.globalAlpha = 1; }
      else if (e.art === 'trauer') { c.fillStyle = '#1a1414'; c.fillRect(x - r * 0.7, y - r * 0.9, 1.5, 9); c.fillRect(x - r * 0.7 + 1.5, y - r * 0.9, 5, 3.5); }
      else if (e.art === 'sturm') { c.strokeStyle = 'rgba(200,210,220,.7)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + (k - 1) * 6, y - r * 0.6, 4 + k, t / 200 + k, t / 200 + k + 3.5); c.stroke(); } }
      else if (e.art === 'handelszug' && (this.zeige.handel || this.zeige.ereignisse)) {
        const pfad = this.wegIndex?.get(e.ort + '>' + e.ziel), z = this.byId.get(e.ziel); if (!z) continue;
        const k = Math.max(0, Math.min(1, (now - Date.parse(e.von)) / (Date.parse(e.bis) - Date.parse(e.von))));
        let px0, py0; if (pfad && pfad.length > 1) { const f = k * (pfad.length - 1), i = Math.min(pfad.length - 2, Math.floor(f)), u = f - i; px0 = lerp(pfad[i][0], pfad[i + 1][0], u); py0 = lerp(pfad[i][1], pfad[i + 1][1], u); } else { px0 = lerp(o.x, z.x, k); py0 = lerp(o.y, z.y, k); }
        if (s > 0.45) { const qx = this.sx(px0), qy = this.sy(py0), m = Math.max(1, s * 1.2); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(qx - 5 * m, qy + 2 * m, 12 * m, 2 * m); c.fillStyle = '#8a5a30'; c.fillRect(qx - 4 * m, qy - 3 * m, 7 * m, 4 * m); c.fillStyle = '#e8dcc0'; c.fillRect(qx - 4 * m, qy - 5 * m, 7 * m, 2 * m); c.fillStyle = '#3a2a1c'; c.fillRect(qx - 3 * m, qy + 1 * m, 2 * m, 2 * m); c.fillRect(qx + 1 * m, qy + 1 * m, 2 * m, 2 * m); c.fillStyle = '#6a4a2a'; c.fillRect(qx + 4 * m, qy - 2 * m, 4 * m, 3 * m); }
        else { c.fillStyle = '#f0d890'; c.beginPath(); c.arc(this.sx(px0), this.sy(py0), 2, 0, 7); c.fill(); }
      }
    }
  }
  zeichneSpieler(c, s, t) {
    if (s < 0.75) return;
    for (const p of this.daten.spieler) {
      const pos = this.posCache.get(p.name); if (!pos || !pos.unterwegs) continue;
      if (pos.pfad) { c.beginPath(); pos.pfad.forEach(([x, y], i) => i ? c.lineTo(this.sx(x), this.sy(y)) : c.moveTo(this.sx(x), this.sy(y))); c.strokeStyle = p.ich ? 'rgba(255,220,120,.9)' : 'rgba(220,220,240,.8)'; c.lineWidth = 2; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]); }
      const x = this.sx(pos.x), y = this.sy(pos.y), k = Math.max(3, Math.round(s * 2.4));
      if (p.ich) { c.strokeStyle = `rgba(255,214,90,${0.5 + 0.4 * Math.sin(t / 300)})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 9 * k / 2 + 3, 0, 7); c.stroke(); }
      c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(k / 2, k / 2); figur(c, 0, -2, t, p.ich ? '#3f6a3a' : '#4a5a8a'); c.restore();
      this.schild(c, p.name + (p.ich ? ' (du)' : ''), x, y - 12 * k / 2 - 6, 12, p.ich ? '#ffe9a8' : '#e8ecf8');
    }
  }
  schild(c, text, x, y, gr, col = '#f4ecd8', fett = true) {
    c.font = `${fett ? '800' : '600'} ${gr}px "Alegreya Sans", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = 3.5; c.strokeStyle = 'rgba(28,20,12,.85)'; c.strokeText(text, x, y); c.fillStyle = col; c.fillText(text, x, y);
  }
  sperrtext(c, text, x, y, gr, sp, col, rot = 0, kursiv = false, halo = 'rgba(244,236,216,.75)') {
    c.save(); c.translate(x, y); c.rotate(rot); c.font = `${kursiv ? 'italic ' : ''}700 ${gr}px "Alegreya Sans", serif`; c.textBaseline = 'middle'; c.textAlign = 'left';
    const chars = [...text], ws = chars.map((ch) => c.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1); let cx = -total / 2;
    for (let i = 0; i < chars.length; i++) { c.lineWidth = 3; c.strokeStyle = halo; c.strokeText(chars[i], cx, 0); c.fillStyle = col; c.fillText(chars[i], cx, 0); cx += ws[i] + sp; }
    c.restore();
  }
  zeichneNamen(c, s) {
    // Landschaft
    for (const b of BESCHRIFTUNG) {
      const gr = b.gr * Math.min(1.6, Math.max(0.55, s * 2.2)), sicht = b.art === 'fluss' ? s > 0.5 && s < 2.4 : b.art === 'pass' || b.art === 'see' ? s > 0.35 && s < 3 : s < 1.6;
      if (!sicht) continue;
      const col = b.art === 'meer' || b.art === 'see' || b.art === 'fluss' ? '#1e3e58' : b.art === 'berg' ? '#3a3026' : b.art === 'wald' ? '#1e3a1c' : '#4a3420';
      this.sperrtext(c, b.t, this.sx(b.x), this.sy(b.y), gr, (b.sp || 1) * Math.min(1.4, Math.max(0.4, s * 2)), col, b.rot || 0, b.art !== 'land' && b.art !== 'berg', b.art === 'meer' ? 'rgba(170,205,215,.55)' : 'rgba(244,236,216,.7)');
    }
    if (this.zeige.reiche && this.reichMitte && s < 0.75) for (const m of this.reichMitte) { const R = this.daten.reiche[m.k]; this.sperrtext(c, R.kurz.toUpperCase(), this.sx(m.x), this.sy(m.y) - 40 * s, Math.max(16, 44 * s), 10 * s + 3, R.farbe, 0, false, 'rgba(30,20,10,.55)'); }
    // Orte mit Vorrang: große zuerst
    const rang = { grossstadt: 0, stadt: 1, burg: 2, kloster: 3, dorf: 4 }, placed = [];
    for (const o of this.daten.orte.slice().sort((a, b) => (o2(a) - o2(b)))) {
      const minS = o.spieler ? 0.2 : { grossstadt: 0, stadt: 0.2, burg: 0.26, kloster: 0.4, dorf: 0.34 }[o.art];
      if (s < minS) continue;
      const r = ortRadius(o), y = this.sy(o.y) + (s < 0.42 ? 12 : r * s * 0.95 + 9), x = this.sx(o.x), gr = o.art === 'grossstadt' ? 17 : o.art === 'stadt' || o.art === 'burg' ? 14.5 : 13;
      const w = (o.name.length * gr * 0.52) + 8; if (placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 && Math.abs(p.y - y) < gr + 2)) continue;
      placed.push({ x, y, w });
      this.schild(c, o.name, x, y, gr, o.spieler?.ich ? '#ffe08a' : o.spieler ? '#d8e8ff' : '#f4ecd8');
    }
    function o2(o) { return (o.spieler?.ich ? -1 : rang[o.art]); }
  }
  zeichneRose(c) {
    const x = 54, y = this.H - 64; c.save(); c.translate(x, y); c.globalAlpha = 0.85;
    c.fillStyle = 'rgba(244,236,216,.65)'; c.beginPath(); c.arc(0, 0, 30, 0, 7); c.fill(); c.strokeStyle = '#4a3420'; c.lineWidth = 1; c.stroke();
    for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.fillStyle = k === 3 ? '#a8301e' : '#4a3420'; c.beginPath(); c.moveTo(0, -26); c.lineTo(5, 0); c.lineTo(-5, 0); c.fill(); }
    c.globalAlpha = 1; c.restore(); this.sperrtext(c, 'N', x, y - 38, 12, 0, '#4a3420');
    // Maßstab: ein Tagesmarsch ≈ 220 Einheiten
    const L = 220 * this.s, bx = x + 50, by = this.H - 20; c.fillStyle = '#4a3420'; c.fillRect(bx, by, L, 3); c.fillStyle = '#f4ecd8'; c.fillRect(bx + L / 2, by, L / 2, 3);
    c.font = '700 12px "Alegreya Sans", sans-serif'; c.textAlign = 'left'; c.fillStyle = '#3a2614'; c.fillText('ein Tagesmarsch', bx, by - 9);
  }

  /* ───────── Bedienung ───────── */
  treffer(sx, sy) {
    const wx = this.cx + (sx - this.W / 2) / this.s, wy = this.cy + (sy - this.H / 2) / this.s;
    if (this.zeige.spieler && this.s >= 0.75) for (const p of this.daten?.spieler || []) { const pos = this.posCache.get(p.name); if (pos?.unterwegs && Math.hypot(pos.x - wx, pos.y - wy) * this.s < 14) return { spieler: p, pos }; }
    let best = null, bd = 1e9; for (const o of this.daten?.orte || []) { const d = Math.hypot(o.x - wx, o.y - wy), rr = Math.max(ortRadius(o), 12 / this.s); if (d < rr && d < bd) { bd = d; best = o; } }
    return best ? { ort: best } : null;
  }
  hover(sx, sy) {
    const tip = this.el.querySelector('.wk-tip'), h = this.treffer(sx, sy);
    this.cv.style.cursor = h ? 'pointer' : 'grab';
    if (!h) { tip.hidden = true; return; }
    tip.hidden = false; tip.style.left = sx + 14 + 'px'; tip.style.top = sy + 10 + 'px';
    if (h.ort) { const o = h.ort; tip.innerHTML = `<b>${ESC(o.name)}</b> <span class="small">· ${ART_NAME[o.art]}${o.spieler ? ' von ' + ESC(o.spieler.name) : ''}</span>`; }
    else tip.innerHTML = `<b>${ESC(h.spieler.name)}</b> <span class="small">unterwegs ${ESC(h.pos.gegend)}</span>`;
  }
  tippen(sx, sy) {
    const h = this.treffer(sx, sy);
    if (h?.ort) { this.sel = h.ort.id; this.karte(h.ort); }
    else if (h?.spieler) { this.sel = null; this.karteSpieler(h.spieler, h.pos); }
    else { this.sel = null; this.el.querySelector('.wk-karte').hidden = true; }
  }
  karte(o) {
    const box = this.el.querySelector('.wk-karte'), R = this.daten.reiche[o.reich] || {}, now = Date.now() + (this.zeit || 0);
    const bez = this.daten.beziehungen.filter((b) => b.a === o.id || b.b === o.id).map((b) => {
      const anderer = this.byId.get(b.a === o.id ? b.b : b.a); if (!anderer) return '';
      const txt = b.art === 'handel' ? (b.a === o.id ? `liefert ${ESC(b.grund)} nach ${ESC(anderer.name)}` : `bekommt ${ESC(b.grund)} aus ${ESC(anderer.name)}`)
        : b.art === 'furcht' ? (b.a === o.id ? `wird von ${ESC(anderer.name)} gefürchtet` : `fürchtet ${ESC(anderer.name)}`)
        : b.art === 'vasall' ? (b.a === o.id ? `untertan von ${ESC(anderer.name)}` : `${ESC(anderer.name)} ist untertan`) : `${BEZ_NAME[b.art]} mit ${ESC(anderer.name)}${b.grund ? ' – ' + ESC(b.grund) : ''}`;
      return `<li class="bz-${b.art}" data-ort="${ESC(anderer.id)}">${txt}</li>`;
    }).join('');
    const ev = this.daten.ereignisse.filter((e) => e.ort === o.id || e.ziel === o.id).map((e) => `<li>${ESC(e.text)} <span class="muted">· ${zeitText(now - Date.parse(e.von))}</span></li>`).join('');
    const gr = o.spieler ? `${o.haeuser} Gebäude, ${o.einwohner} Bewohner` : `rund ${o.haeuser} Häuser, etwa ${Math.round(o.einwohner / 10) * 10} Einwohner`;
    box.innerHTML = `<button class="px-btn icon wk-x" title="Schließen">✕</button>
      <span class="wk-art">${ART_NAME[o.art]}${o.spieler ? ' · Spielerdorf' : ''}</span><h3>${ESC(o.name)}</h3>
      <p class="small"><span class="wk-dot" style="background:${R.farbe || '#999'}"></span>${ESC(R.name || '')}${R.herrscher ? ' · ' + ESC(R.herrscher) : ''}</p>
      ${o.spieler ? `<p class="small"><b>${ESC(o.spieler.name)}</b>${o.spieler.ich ? ' (du)' : ''} · geführt von ${ESC(o.spieler.fuehrung || '')}</p>` : ''}
      <p class="small">${gr} · ${MAUER_NAME[o.mauer] || ''}${o.tuerme ? ` · ${o.tuerme} ${o.tuerme === 1 ? 'Turm' : 'Türme'}` : ''} · ${ESC(o.wohlstand)}</p>
      <p>${ESC(o.text || '')}</p>${o.existenz ? `<p class="small wk-ex"><b>Warum es besteht:</b> ${ESC(o.existenz)}</p>` : ''}
      ${bez ? `<h4>Beziehungen</h4><ul class="small wk-bez">${bez}</ul>` : ''}${ev ? `<h4>Gerade jetzt</h4><ul class="small">${ev}</ul>` : ''}`;
    box.hidden = false; box.querySelector('.wk-x').onclick = () => { box.hidden = true; this.sel = null; };
    box.querySelectorAll('[data-ort]').forEach((li) => { li.onclick = () => { const z = this.byId.get(li.dataset.ort); if (z) { this.sel = z.id; this.flieg(z.x, z.y, Math.max(this.s, 0.9)); this.karte(z); } }; });
  }
  karteSpieler(p, pos) {
    const box = this.el.querySelector('.wk-karte'), u = p.unterwegs;
    box.innerHTML = `<button class="px-btn icon wk-x">✕</button><span class="wk-art">Unterwegs</span><h3>${ESC(p.name)}${p.ich ? ' (du)' : ''}</h3>
      <p>${ESC(pos.gegend.charAt(0).toUpperCase() + pos.gegend.slice(1))}${u?.titel ? ` – ${ESC(u.titel)}` : ''}.</p>
      <p class="small muted">${u?.reist ? 'Auf dem Weg' : 'Am Ziel angekommen'}${pos.home ? ` · Heimat: ${ESC(pos.home.name)}` : ''}</p>`;
    box.hidden = false; box.querySelector('.wk-x').onclick = () => { box.hidden = true; };
  }
  chronik() {
    const box = this.el.querySelector('.wk-chronik'), now = Date.now() + (this.zeit || 0);
    box.innerHTML = '<h4>Weltgeschehen</h4><ul>' + this.daten.chronik.map((e) => `<li data-ort="${ESC(e.ort || '')}"><span class="wk-ev wk-ev-${ESC(e.art)}"></span>${ESC(e.text)} <span class="muted small">· ${zeitText(now - Date.parse(e.von))}</span></li>`).join('') + '</ul>';
    box.querySelectorAll('[data-ort]').forEach((li) => { li.onclick = () => { const o = this.byId.get(li.dataset.ort); if (o) { this.sel = o.id; this.flieg(o.x, o.y, Math.max(this.s, 1)); this.karte(o); } }; });
  }
}
function zeitText(ms) { const m = Math.round(ms / 60000); if (m < 2) return 'gerade eben'; if (m < 60) return `vor ${m} Min.`; const h = Math.round(m / 60); if (h < 24) return `vor ${h} Std.`; const d = Math.round(h / 24); return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`; }

/* ───────── Reise im Questfenster: Kartenausschnitt statt Waldweg ───────── */
let reiseCache = null;
export async function reiseDaten(db, frisch = false) {
  if (!frisch && reiseCache && Date.now() - reiseCache.t < 45000) return reiseCache.d;
  const { data } = await db.rpc('welt_karte'); if (!data) return null;
  reiseCache = { t: Date.now(), d: data }; return data;
}
export function reiseZeichner(daten) {
  const me = daten?.spieler?.find((p) => p.ich); if (!me) return null;
  const pos = spielerPos(me, daten.orte); if (!pos || !pos.unterwegs) return null;
  const bilder = new Map(daten.orte.map((o) => [o.id, ortBild(o, daten.reiche)])), U = 1.6;
  let crop = null, cx = 0, cy = 0;
  return (c, W, H, t) => {
    if (!crop || Math.hypot(pos.x - cx, pos.y - cy) > 30) {
      cx = pos.x; cy = pos.y;
      const x0 = cx - (W / 2) * U, y0 = cy - (H / 2) * U, buf = zeichneAusschnitt(x0, y0, W, H, U, daten.orte.map((o) => ({ x: o.x, y: o.y, r: ortRadius(o) })));
      crop = { cv: toCanvas(buf, W, H), x0, y0 };
    }
    c.imageSmoothingEnabled = false; c.drawImage(crop.cv, 0, 0);
    const X = (x) => (x - crop.x0) / U, Y = (y) => (y - crop.y0) / U;
    for (const o of daten.orte) { const b = bilder.get(o.id), x = X(o.x), y = Y(o.y), sz = b.S / U; if (x + sz < 0 || y + sz < 0 || x - sz > W || y - sz > H) continue; c.drawImage(b.cv, Math.round(x - sz / 2), Math.round(y - sz / 2), Math.round(sz), Math.round(sz)); c.font = '700 8px "Alegreya Sans", sans-serif'; c.textAlign = 'center'; c.lineWidth = 2; c.strokeStyle = 'rgba(20,14,8,.8)'; c.strokeText(o.name, x, y + b.r / U + 6); c.fillStyle = '#f4ecd8'; c.fillText(o.name, x, y + b.r / U + 6); }
    if (pos.pfad) { c.beginPath(); pos.pfad.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.strokeStyle = 'rgba(255,220,120,.9)'; c.lineWidth = 1; c.setLineDash([2, 2]); c.stroke(); c.setLineDash([]); }
    const hx = Math.round(X(pos.x)), hy = Math.round(Y(pos.y));
    c.strokeStyle = `rgba(255,214,90,${0.5 + 0.4 * Math.sin(t / 300)})`; c.lineWidth = 1; c.beginPath(); c.arc(hx, hy - 1, 7, 0, 7); c.stroke();
    figur(c, hx, hy - 1, t, '#3f6a3a');
    c.font = '700 8px "Alegreya Sans", sans-serif'; c.textAlign = 'left'; c.fillStyle = 'rgba(20,14,8,.65)'; c.fillRect(2, H - 12, Math.min(W - 4, c.measureText(pos.gegend).width + 8), 10);
    c.fillStyle = '#f4ecd8'; c.fillText(pos.gegend.charAt(0).toUpperCase() + pos.gegend.slice(1), 6, H - 4);
    return true;
  };
}
