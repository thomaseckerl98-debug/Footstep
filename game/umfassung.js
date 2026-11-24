// Palisade und Steinmauer rund ums Dorf: ein Ring um alle Bauplätze, mit Toren dort, wo Wege hinausführen.
// Hinterer Teil wird vor den Gebäuden gezeichnet, vorderer danach – so steht die Mauer räumlich richtig.
import { PLOTS, ROADS, PLAZA, depthScale, W, H } from './world.js?v=6';

function huelle(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function chaikin(p, n = 3) { for (let it = 0; it < n; it++) { const o = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } p = o; } return p; }
function segDist(px, py, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((px - a[0]) * dx + (py - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(a[0] + dx * t - px, a[1] + dy * t - py); }

let cache = null;
export function umfassungPunkte() {
  const key = PLOTS.map((p) => p.x + ',' + p.y).join('|');
  if (cache && cache.key === key) return cache.pts;
  const roh = [];
  for (const p of PLOTS) { const r = p.rad * 1.35 + 12; for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; roh.push([p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.62]); } }
  if (PLAZA) roh.push([PLAZA.x, PLAZA.y]);
  const ring = chaikin(huelle(roh), 3);
  // gleichmäßig verteilen (alle 3 Pixel ein Punkt)
  const pts = []; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 3)); for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  // Tore: wo ein Weg den Ring kreuzt
  for (const p of pts) p.tor = ROADS.some((r) => r.pts.some((q, i) => i > 0 && segDist(p[0], p[1], r.pts[i - 1], q) < 8));
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  for (const p of pts) p.hinten = p[1] < cy;
  cache = { key, pts }; return pts;
}

// art: 'palisade' | 'steinmauer'; teil: 'hinten' | 'vorne'; anteil: 0..1 (Baustelle)
export function zeichneUmfassung(c, art, teil, anteil = 1) {
  const pts = umfassungPunkte(), n = Math.floor(pts.length * Math.max(0, Math.min(1, anteil)));
  const list = pts.slice(0, n).map((p, i) => ({ p, i, prev: pts[(i - 1 + pts.length) % pts.length], next: pts[(i + 1) % pts.length] }))
    .filter((e) => (teil === 'hinten') === e.p.hinten && e.p[0] > -10 && e.p[0] < W + 10 && e.p[1] < H + 10).sort((a, b) => a.p[1] - b.p[1]);
  for (const e of list) {
    const [x, y] = e.p, s = depthScale(y);
    if (e.p.tor) {
      const rand = !e.prev.tor || !e.next.tor;
      if (rand) art === 'steinmauer' ? torTurm(c, x, y, s) : torPfosten(c, x, y, s);
      continue;
    }
    if (art === 'steinmauer') {
      const h = Math.round(12 * s), w = Math.max(2, Math.round(3.4 * s));
      c.fillStyle = 'rgba(20,18,14,.28)'; c.fillRect(Math.round(x), Math.round(y), w + 1, 2);
      c.fillStyle = '#8f897c'; c.fillRect(Math.round(x), Math.round(y - h), w, h);
      c.fillStyle = '#aaa496'; c.fillRect(Math.round(x), Math.round(y - h), w, Math.max(1, Math.round(1.6 * s)));
      if ((e.i % 4) === 0) { c.fillStyle = '#aaa496'; c.fillRect(Math.round(x), Math.round(y - h - 2 * s), w, Math.round(2 * s)); }
      if ((e.i % 3) === 0) { c.fillStyle = '#6f6a5f'; c.fillRect(Math.round(x), Math.round(y - h * 0.5), w, 1); }
    } else {
      const h = Math.round((11 + (e.i % 3)) * s), w = Math.max(2, Math.round(2.2 * s));
      c.fillStyle = 'rgba(20,18,14,.25)'; c.fillRect(Math.round(x + 1), Math.round(y), w + 1, 1);
      c.fillStyle = (e.i % 2) ? '#6e4e30' : '#80603c'; c.fillRect(Math.round(x), Math.round(y - h), w, h);
      c.fillStyle = '#a07a4c'; c.fillRect(Math.round(x), Math.round(y - h - 1), w, 1);
      if ((e.i % 2) === 0) { c.fillStyle = '#4a3420'; c.fillRect(Math.round(x), Math.round(y - h * 0.62), w + 1, 1); }
    }
  }
}
function torPfosten(c, x, y, s) { const h = Math.round(17 * s), w = Math.max(2, Math.round(2.6 * s)); c.fillStyle = '#5a3e26'; c.fillRect(Math.round(x), Math.round(y - h), w, h); c.fillStyle = '#a07a4c'; c.fillRect(Math.round(x), Math.round(y - h - 1), w, 1); }
function torTurm(c, x, y, s) {
  const h = Math.round(20 * s), w = Math.max(4, Math.round(8 * s)), X = Math.round(x - w / 2), Y = Math.round(y - h);
  c.fillStyle = 'rgba(20,18,14,.3)'; c.fillRect(X + 1, Math.round(y), w + 1, 2);
  c.fillStyle = '#958f82'; c.fillRect(X, Y, w, h); c.fillStyle = '#b0aa9c'; c.fillRect(X, Y, Math.max(1, Math.round(w * 0.3)), h);
  for (let k = 0; k < w; k += 2) { c.fillStyle = '#b0aa9c'; c.fillRect(X + k, Y - Math.round(2 * s), 1, Math.round(2 * s)); }
  c.fillStyle = '#2a2420'; c.fillRect(X + Math.round(w / 2) - 1, Y + Math.round(h * 0.35), 2, Math.round(3 * s));
}
