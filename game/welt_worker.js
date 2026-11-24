// Rechnet Geländebilder und Straßen der Weltkarte im Hintergrund, damit das Spiel flüssig bleibt.
import { zeichneAusschnitt, felder, kosten, punkt } from './welt_gelaende.js?v=1';

const S = 20; // Rastergröße für Straßen
let cost = null, GW = 0, GH = 0;
function kostenRaster(w, h) {
  if (cost) return; GW = Math.ceil(w / S); GH = Math.ceil(h / S); cost = new Float32Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) cost[y * GW + x] = kosten(x * S + S / 2, y * S + S / 2);
}
function astar(ax, ay, bx, by, bonus) {
  const s = Math.floor(ay / S) * GW + Math.floor(ax / S), g = Math.floor(by / S) * GW + Math.floor(bx / S);
  const best = new Float32Array(GW * GH).fill(Infinity), from = new Int32Array(GW * GH).fill(-1), heap = [];
  const gx = g % GW, gy = (g / GW) | 0, hfn = (i) => Math.hypot((i % GW) - gx, ((i / GW) | 0) - gy) * 0.9;
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  best[s] = 0; push(hfn(s), s); let n = 0;
  while (heap.length && n++ < 60000) {
    const [, i] = pop(); if (i === g) break;
    const x = i % GW, y = (i / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const j = ny * GW + nx, c = cost[j]; if (!isFinite(c) && j !== g) continue;
      const nb = best[i] + (dx && dy ? 1.414 : 1) * (isFinite(c) ? c : 3) * (bonus[j] ? 0.45 : 1);
      if (nb < best[j]) { best[j] = nb; from[j] = i; push(nb + hfn(j), j); }
    }
  }
  if (from[g] < 0) return null;
  const out = []; for (let i = g; i >= 0; i = from[i]) { out.push(i); if (i === s) break; }
  return out.reverse();
}
function wege(orte, paare, w, h) {
  kostenRaster(w, h);
  const bonus = new Uint8Array(GW * GH), res = [];
  for (const [a, b] of paare) {
    const A = orte[a], B = orte[b]; if (!A || !B) continue;
    const p = astar(A.x, A.y, B.x, B.y, bonus); if (!p) continue;
    for (const i of p) bonus[i] = 1;
    const pts = p.filter((_, k) => k % 2 === 0 || k === p.length - 1).map((i) => [(i % GW) * S + S / 2, ((i / GW) | 0) * S + S / 2]);
    pts[0] = [A.x, A.y]; pts[pts.length - 1] = [B.x, B.y];
    let sm = pts; for (let it = 0; it < 3; it++) { const o = [sm[0]]; for (let k = 0; k < sm.length - 1; k++) { const [x0, y0] = sm[k], [x1, y1] = sm[k + 1]; o.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]); } o.push(sm[sm.length - 1]); sm = o; }
    pts.length = 0; pts.push(...sm);
    const bruecken = [];
    for (let k = 1; k < pts.length; k++) { const mx = (pts[k][0] + pts[k - 1][0]) / 2, my = (pts[k][1] + pts[k - 1][1]) / 2; if (punkt(mx, my).wasser === 2) bruecken.push([mx, my, Math.atan2(pts[k][1] - pts[k - 1][1], pts[k][0] - pts[k - 1][0])]); }
    res.push({ a: A.id, b: B.id, pts, bruecken });
  }
  return res;
}
self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.typ === 'raster') { felder(); const buf = zeichneAusschnitt(m.x0, m.y0, m.w, m.h, m.u, m.orte); postMessage({ id: m.id, buf }, [buf.buffer]); }
    else if (m.typ === 'wege') postMessage({ id: m.id, wege: wege(m.orte, m.paare, m.w, m.h) });
  } catch (err) { postMessage({ id: m.id, fehler: String(err && err.message || err) }); }
};
