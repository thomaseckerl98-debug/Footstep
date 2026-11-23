// Dorfleben: Wegfindung (Häuser blockieren, Wege werden bevorzugt), Tagesablauf, Berufe, Gespräche, Namen.
import { PLOTS, PLAZA, ROADS, TREES, STREAM, BRIDGE, streamWidth } from './world.js?v=5';
import * as CORE from './core.js?v=1';
import { sheetData, SW, SH, FOOT, DIRS } from './chars.js?v=3';
import { CATALOG, jobsAt } from './buildings.js?v=2';
const FEM = new Set(['huette', 'muehle', 'baeckerei', 'brauerei', 'imkerei', 'jagdhuette', 'holzfaeller', 'steinmetz', 'koehlerei', 'schmiede', 'gerberei', 'weberei', 'toepferei', 'scheune', 'kaserne', 'schreibstube']);
const ORT = (t) => t === 'feld' ? 'auf dem Feld' : t === 'markt' ? 'auf dem Marktplatz' : (FEM.has(t) ? 'in der ' : 'im ') + (CATALOG[t]?.name || t);

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const meadowY = (x) => 357 + Math.sin(x * 0.007) * 4 + CORE.N1.fbm(x * 0.013, 4, 3) * 9;
const rightSlope = (x) => 468 - Math.pow(Math.max(0, x - 700) / 260, 1.1) * 200 + CORE.N2.fbm(x * 0.02, 5, 4) * 16;
function distSeg(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
function hash(n) { let x = (n * 2654435761) >>> 0; x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0; return (x >>> 0) / 4294967296; }

/* ======================================================================
   Wegfindung auf einem Raster (3×3 Weltpixel pro Zelle)
   ====================================================================== */
export class Nav {
  constructor() { this.c = 3; this.x0 = 108; this.y0 = 366; this.cols = Math.ceil((906 - 108) / 3); this.rows = Math.ceil((540 - 366) / 3); this.cost = new Float32Array(this.cols * this.rows); }
  center(cx, cy) { return [this.x0 + (cx + 0.5) * this.c, this.y0 + (cy + 0.5) * this.c]; }
  cell(x, y) { return [Math.floor((x - this.x0) / this.c), Math.floor((y - this.y0) / this.c)]; }
  at(x, y) { const [cx, cy] = this.cell(x, y); if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return Infinity; return this.cost[cy * this.cols + cx]; }
  free(x, y) { return this.at(x, y) < Infinity; }
  build(sprites) {
    const { cols, rows, cost } = this, road = ROADS[0].pts, built = new Set(sprites.map((s) => s.plotId));
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      const [x, y] = this.center(cx, cy); let k = 1;
      if (y < meadowY(x) + 6 || y > 537) k = Infinity;
      // Nadelwald am rechten Hang (außer auf bebauten Bauplätzen)
      if (x > 715 && y > rightSlope(x) + 4 && y < 462 && !PLOTS.some((p) => built.has(p.id) && Math.hypot(p.x - x, (p.y - y) * 1.6) < p.rad + 10)) k = Infinity;
      if (k === 1) {
        let d = 99; for (let i = 0; i < road.length - 1; i++) d = Math.min(d, distSeg(x, y, road[i][0], road[i][1], road[i + 1][0], road[i + 1][1]));
        if (d < 5) k = 0.45;
        if (((x - PLAZA.x) / 30) ** 2 + ((y - PLAZA.y) / 12) ** 2 < 1) k = 0.55;
        if (((x - PLAZA.x) / 10) ** 2 + ((y - PLAZA.y + 2) / 5) ** 2 < 1) k = Infinity; // Brunnen
        for (const [tx, ty] of TREES) if (Math.abs(x - tx) < 5 && y > ty - 4 && y < ty + 3) k = Infinity;
        for (let i = 0; i < STREAM.length - 1; i++) { const [ax, ay] = STREAM[i], [bx, by] = STREAM[i + 1]; if (distSeg(x, y, ax, ay, bx, by) < streamWidth((i + 0.5) / (STREAM.length - 1)) / 2 + 2) k = Math.abs(y - BRIDGE.y) < 4 && Math.abs(x - BRIDGE.x) < BRIDGE.w ? 0.6 : Infinity; }
      }
      cost[cy * cols + cx] = k;
    }
    // Hausgrundflächen sperren (Felder sind begehbar)
    for (const s of sprites) {
      if (s.type === 'feld') { this.fill(s.x, s.y, s.x + s.w, s.y + s.h, 1.25, true); continue; }
      const base = s.y + s.h - 1, fh = clamp(s.w * 0.42, 6, 26);
      this.fill(s.x - 3, base - fh, s.x + s.w + 2, base + 1, Infinity);
    }
  }
  fill(x0, y0, x1, y1, v, onlyFree = false) {
    const [a, b] = this.cell(x0, y0), [c, d] = this.cell(x1, y1);
    for (let cy = Math.max(0, b); cy <= Math.min(this.rows - 1, d); cy++) for (let cx = Math.max(0, a); cx <= Math.min(this.cols - 1, c); cx++) { const i = cy * this.cols + cx; if (onlyFree && this.cost[i] === Infinity) continue; this.cost[i] = v; }
  }
  nearestFree(x, y) {
    if (this.free(x, y)) return [x, y];
    for (let r = 1; r < 40; r++) for (let a = 0; a < 16; a++) { const xx = x + Math.cos(a / 16 * Math.PI * 2) * r * 2, yy = y + Math.sin(a / 16 * Math.PI * 2) * r; if (this.free(xx, yy)) return [xx, yy]; }
    return [PLAZA.x, PLAZA.y + 8];
  }
  los(ax, ay, bx, by) { const n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let i = 1; i < n; i++) { const t = i / n; if (!this.free(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; } return true; }
  path(ax, ay, bx, by) {
    [ax, ay] = this.nearestFree(ax, ay); [bx, by] = this.nearestFree(bx, by);
    const { cols, rows, cost } = this, [sx, sy] = this.cell(ax, ay), [gx, gy] = this.cell(bx, by);
    const start = sy * cols + sx, goal = gy * cols + gx, N = cols * rows;
    const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = [], push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top[1]; };
    const h = (i) => { const x = i % cols, y = (i / cols) | 0, dx = Math.abs(x - gx), dy = Math.abs(y - gy); return 0.45 * (Math.max(dx, dy) + 0.414 * Math.min(dx, dy)); };
    g[start] = 0; push(start, h(start)); let found = false, steps = 0;
    while (heap.length && steps++ < 30000) {
      const i = pop(); if (closed[i]) continue; closed[i] = 1; if (i === goal) { found = true; break; }
      const x = i % cols, y = (i / cols) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const j = ny * cols + nx, c = cost[j]; if (c === Infinity || closed[j]) continue;
        if (dx && dy && (cost[y * cols + nx] === Infinity || cost[ny * cols + x] === Infinity)) continue; // keine Ecken schneiden
        const ng = g[i] + c * (dx && dy ? 1.414 : 1);
        if (ng < g[j]) { g[j] = ng; from[j] = i; push(j, ng + h(j)); }
      }
    }
    if (!found) return [[bx, by]];
    const cells = []; for (let i = goal; i !== -1; i = from[i]) cells.push(i); cells.reverse();
    const pts = cells.map((i) => this.center(i % cols, (i / cols) | 0)); pts[pts.length - 1] = [bx, by];
    // glätten: nur gerade Abkürzungen, die frei sind und den Weg nicht verlassen (Kosten ähnlich)
    const out = [[ax, ay]]; let k = 0;
    while (k < pts.length - 1) { let j = pts.length - 1; for (; j > k + 1; j--) if (this.los(pts[k][0], pts[k][1], pts[j][0], pts[j][1]) && this.sameKind(pts[k], pts[j])) break; out.push(pts[j]); k = j; }
    return out.slice(1);
  }
  sameKind(a, b) { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3); let road = 0; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; if (this.at(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) < 0.9) road++; } return road === 0 || road === n + 1 || n < 6; }
}

/* ======================================================================
   Berufe -> Arbeitsort, Tagesablauf
   ====================================================================== */
const JOB_PLACE = {
  schmiede: ['Schmied', 'Waffenschmiedin', 'Rüstmacher', 'Schuster', 'Wagner', 'Pfeilmacher'],
  feld: ['Bauer', 'Bäuerin', 'Müllerin', 'Imkerin'],
  scheune: ['Stallbursche', 'Hirte', 'Zimmermann'],
  wachturm: ['Wache', 'Hauptmann', 'Söldnerin', 'Falknerin'],
  langhaus: ['Wirt', 'Schankmaid', 'Koch', 'Brauer', 'Bäcker', 'Barde', 'Dorfälteste', 'Schreiber', 'Gelehrter', 'Priesterin', 'Mönch', 'Alchemist', 'Heilerin', 'Seherin', 'Kerzenzieherin', 'Schneiderin', 'Weberin', 'Gerberin', 'Töpfer', 'Metzger'],
  wald: ['Holzfäller', 'Köhler', 'Jäger', 'Jägerin', 'Kräuterfrau', 'Bergmann'],
  platz: ['Händler', 'Totengräber', 'Rattenfänger', 'Steinmetz'],
  bach: ['Fischer', 'Fährmann', 'Wäscherin'],
};
const PLACE_OF = {}; for (const [p, jobs] of Object.entries(JOB_PLACE)) for (const j of jobs) PLACE_OF[j] = p;
const WORK_TEXT = { bach: 'arbeitet am Bach', schmiede: 'arbeitet an der Schmiede', feld: 'arbeitet auf dem Feld', scheune: 'arbeitet an der Scheune', wachturm: 'hält Wache am Turm', langhaus: 'arbeitet in der Halle', wald: 'arbeitet am Waldrand', platz: 'arbeitet am Dorfplatz' };
const GO_TEXT = { bach: 'geht zum Bach', schmiede: 'geht zur Schmiede', feld: 'geht aufs Feld', scheune: 'geht zur Scheune', wachturm: 'geht zum Wachturm', langhaus: 'geht zur Halle', wald: 'geht zum Waldrand', platz: 'geht zum Dorfplatz', home: 'geht nach Hause' };
const JOB_TEXT = { Fischer: 'angelt am Bach', Fährmann: 'flickt sein Boot am Bach', Holzfäller: 'fällt Holz am Waldrand', Kräuterfrau: 'sammelt Kräuter', Jäger: 'pirscht am Waldrand', Jägerin: 'pirscht am Waldrand', Köhler: 'schichtet Holz für den Meiler', Wäscherin: 'wäscht Wäsche am Bach', Händler: 'bietet Waren an', Bauer: 'bestellt das Feld', Bäuerin: 'bestellt das Feld', Schmied: 'hämmert an der Esse', Wirt: 'schenkt in der Halle aus' };
const NAME_COL = { 'treu ergeben': '#ffd27a', herzlich: '#ffe3a0', freundlich: '#f1e6cc', zurückhaltend: '#cfc6b4', misstrauisch: '#e0a890', feindselig: '#f07a66', fremd: '#c8d0dc' };
function phaseOf(hour) { hour = ((hour % 24) + 24) % 24; if (hour < 6) return 'schlaf'; if (hour < 7) return 'aufstehen'; if (hour < 12) return 'arbeit'; if (hour < 13) return 'mittag'; if (hour < 17) return 'arbeit'; if (hour < 20.5) return 'feierabend'; if (hour < 22) return 'heim'; return 'schlaf'; }

export class Village {
  constructor() { this.nav = new Nav(); this.people = []; this.fx = []; this.sprites = []; this.wanderPool = []; this.wanderer = null; this.nextWanderer = performance.now() + 60000; this.tasks = new Map(); this.crowd = []; }
  // Aufträge: Bewohner arbeiten tagsüber am Gebäude, für das sie etwas bauen
  setTasks(list) { this.tasks = new Map((list || []).map((t) => [t.npc_id, t])); for (const p of this.people) p.goalKey = null; }
  setPeople(list, wanderers = []) {
    // list: [{id, name, job, look, stimmung, freund, erinnerung}]
    this.people = list.map((r, i) => ({ ...r, plan: { ...r.look, name: r.name, beruf: r.job }, x: PLAZA.x, y: PLAZA.y + 8, path: [], state: 'new', goal: null, wait: 0, dir: 'down', dist: 0, ph: hash(r.id) * 10, shift: (hash(r.id + 7) - 0.5) * 0.9, alpha: 1, idx: i, activity: '' }));
    this.wanderPool = wanderers.map((r) => ({ ...r, plan: { ...r.look, name: r.name, beruf: r.job } }));
    this.assignHomes(); this.refreshSheets();
  }
  refreshSheets() { for (const p of [...this.people, ...(this.wanderer ? [this.wanderer] : []), ...this.crowd]) { const sh = sheetData(p.plan), cv = document.createElement('canvas'); cv.width = sh.w; cv.height = sh.h; cv.getContext('2d').putImageData(new ImageData(sh.data, sh.w, sh.h), 0, 0); p.cv = cv; } }
  setSprites(sprites) {
    this.sprites = sprites; this.nav.build(sprites); this.assignHomes(); this.makeCrowd();
    for (const p of this.people) { p.path = []; p.goal = null; p.goalKey = null; p.socialSpot = null; if (p.state !== 'inside') { [p.x, p.y] = this.nav.nearestFree(p.x, p.y); } }
  }
  byType(t) { return this.sprites.filter((s) => s.type === t); }
  // Namenlose Dorfleute: laufen herum, gehen in Häuser, sind nicht anklickbar (machen das Dorf lebendig)
  makeCrowd() {
    const room = this.sprites.reduce((n, s) => n + (CATALOG[s.type]?.wohnraum || 0), 0);
    const want = Math.max(3, Math.min(14, Math.round(room * 0.8 + this.sprites.length * 0.4)));
    while (this.crowd.length > want) this.crowd.pop();
    const SK = ['#f0c8a0', '#e4b48c', '#d49a72', '#b8805a', '#8f5e3c', '#6a4028'], HA = ['#2a2018', '#3d2a1c', '#6b4528', '#8a4a2a', '#c8a860', '#a89a80', '#8e8c88', '#dcd8d0'];
    const TOP = ['#6b5a44', '#5a6a4a', '#7a5a3a', '#4e5a6a', '#8a7a5a', '#6a4a4a', '#5a5040', '#7a6a50', '#4a5a50'], HAT = [null, null, null, 'kapuze', 'hut', 'kopftuch', 'haube', 'kappe'];
    const r = Math.random, pk = (a) => a[Math.floor(r() * a.length)];
    while (this.crowd.length < want) {
      const w = r() < 0.5, plan = { name: '', beruf: '', w, skin: pk(SK), hair: pk(HA), hairStyle: w ? pk(['lang', 'zopf', 'dutt']) : pk(['kurz', 'kurz', 'wild', 'glatze']), beard: !w && r() < 0.45 ? pk(['kurz', 'stoppel', 'lang', 'schnurr']) : null,
        top: pk(TOP), legs: w ? '#5a4a3a' : '#4a3e30', boots: '#3a2a1e', belt: '#3a2618', apron: r() < 0.25 ? pk(['#d8ccb0', '#6b4a2e', '#8a7a60']) : null, hat: pk(HAT), hatColor: pk(['#5a4a3a', '#6b5a44', '#8a3a2a', '#3e5a34', '#d8ccb0']) };
      const [x, y] = this.workSpot('platz'), sh = sheetData(plan), cv = document.createElement('canvas'); cv.width = sh.w; cv.height = sh.h; cv.getContext('2d').putImageData(new ImageData(sh.data, sh.w, sh.h), 0, 0);
      this.crowd.push({ crowd: true, plan, cv, x, y, path: [], wait: r() * 8, dir: 'down', dist: 0, ph: r() * 10, alpha: 1, state: 'idle', activity: '', inside: 0 });
    }
    for (const p of this.crowd) { p.path = []; [p.x, p.y] = this.nav.nearestFree(p.x, p.y); }
  }
  crowdTarget(hour) {
    const r = Math.random(), houses = this.sprites.filter((s) => s.type !== 'feld'), fields = this.byType('feld');
    if ((hour >= 21.5 || hour < 6) || this.weather === 'regen') return houses.length ? { door: houses[Math.floor(r * houses.length)] } : { spot: this.workSpot('platz') };
    if (r < 0.35) return { spot: this.workSpot('platz') };
    if (r < 0.65 && houses.length) { const h = houses[Math.floor(Math.random() * houses.length)]; return Math.random() < 0.3 ? { door: h } : { spot: this.door(h) }; }
    if (r < 0.78 && fields.length) return { spot: this.workSpot('b:' + fields[Math.floor(Math.random() * fields.length)].plotId) };
    if (r < 0.9) return { spot: this.workSpot('bach') };
    return { spot: this.workSpot('wald') };
  }
  stepCrowd(p, dt, hour) {
    if (p.inside > 0) { p.inside -= dt; if (p.inside <= 0) { p.alpha = 0; p.fadeIn = true; } return; }
    if (p.fadeIn) { p.alpha = Math.min(1, p.alpha + dt * 1.5); if (p.alpha >= 1) p.fadeIn = false; }
    if (p.leaving) { p.alpha -= dt * 1.5; if (p.alpha <= 0) { p.alpha = 0; p.leaving = false; p.inside = 20 + Math.random() * 60 + ((hour >= 21.5 || hour < 6) ? 400 : 0); } return; }
    if (p.path.length) { this.walk(p, dt); if (!p.path.length) { if (p.goDoor) { p.goDoor = false; p.leaving = true; p.dir = 'up'; } else { p.wait = 4 + Math.random() * 14; if (Math.random() < 0.5) p.dir = Math.random() < 0.5 ? 'left' : 'right'; } } return; }
    p.wait -= dt; if (p.wait > 0) return;
    const tg = this.crowdTarget(hour), [tx, ty] = tg.door ? this.door(tg.door) : tg.spot;
    p.path = this.nav.path(p.x, p.y, tx, ty); p.goDoor = !!tg.door; if (!p.path.length) p.wait = 3;
  }
  assignHomes() {
    if (!this.sprites.length) return;
    const homes = []; for (const s of this.sprites) for (let k = 0; k < (CATALOG[s.type]?.wohnraum || 0); k++) homes.push(s);
    if (!homes.length) for (const s of this.sprites.filter((q) => q.type !== 'feld')) homes.push(s);
    this.people.forEach((p, i) => { p.home = homes[i % Math.max(1, homes.length)] || null; });
  }
  door(s) { const base = s.y + s.h - 1; return this.nav.nearestFree(PLOTS.find((q) => q.id === s.plotId)?.x ?? s.x + s.w / 2, base + 4); }
  workSpot(place, p) {
    const r = Math.random;
    if (place === 'bach') { const i = 2 + Math.floor(r() * (STREAM.length - 3)), t = r(), [ax, ay] = STREAM[i], [bx, by] = STREAM[i + 1]; return this.nav.nearestFree(ax + (bx - ax) * t + 7, ay + (by - ay) * t); }
    if (place === 'platz') { const a = r() * Math.PI * 2; return this.nav.nearestFree(PLAZA.x + Math.cos(a) * 22, PLAZA.y + 3 + Math.sin(a) * 7); }
    if (place === 'wald') { if (r() < 0.6) { const x = 740 + r() * 130; return this.nav.nearestFree(x, 466 + r() * 4); } const x = 330 + r() * 360; return this.nav.nearestFree(x, meadowY(x) + 8 + r() * 3); }
    const s = this.spriteOf(place) || this.byType(place)[0];
    if (!s) return this.workSpot('platz', p);
    if (s.type === 'feld') return this.nav.nearestFree(s.x + 5 + r() * (s.w - 10), s.y + 4 + r() * (s.h - 7));
    if (place === 'feld') return this.nav.nearestFree(s.x + 5 + r() * (s.w - 10), s.y + 4 + r() * (s.h - 7));
    const base = s.y + s.h - 1, opts = [[s.x + 3, base + 5], [s.x + s.w - 4, base + 4], [s.x + s.w * 0.5 + (r() - 0.5) * 14, base + 8]];
    const o = opts[Math.floor(r() * opts.length)]; return this.nav.nearestFree(o[0], o[1]);
  }
  placeFor(p) { const s = this.sprites.find((q) => jobsAt(q.type).includes(p.job)); if (s) return 'b:' + s.plotId; const pl = PLACE_OF[p.job] || 'platz'; if (pl === 'wald' || pl === 'platz' || pl === 'bach') return pl; return this.byType(pl).length ? pl : 'platz'; }
  spriteOf(place) { return place && place.startsWith('b:') ? this.sprites.find((q) => q.plotId === +place.slice(2)) : null; }
  desire(p, hour) {
    const ph = phaseOf(hour - p.shift);
    if (this.weather === 'regen' && (ph === 'arbeit' || ph === 'feierabend' || ph === 'mittag')) {
      const pl = ph === 'arbeit' ? this.placeFor(p) : 'platz', ws = this.spriteOf(pl), outdoor = !ws || ['feld', 'markt'].includes(ws.type);
      if (outdoor && p.job !== 'Wache') { const where = p.home || this.byType('langhaus')[0] || this.byType('gasthaus')[0]; if (where) return { kind: 'inside', where, text: 'wartet den Regen ab' }; }
    }
    if (p.job === 'Wache' && (ph === 'schlaf' || ph === 'heim')) return { kind: 'work', place: this.placeFor(p) };
    if (ph === 'schlaf' || ph === 'heim') return { kind: 'home' };
    const hall = this.byType('langhaus')[0] || this.byType('gasthaus')[0], inn = this.byType('gasthaus')[0];
    if (ph === 'mittag') return hall ? { kind: 'inside', where: hall, text: 'isst ' + ORT(hall.type) } : { kind: 'platz', text: 'macht Mittagspause' };
    if (ph === 'feierabend') { const r = hash(p.id + Math.floor(hour)); if (inn && r < 0.3) return { kind: 'inside', where: inn, text: 'sitzt im Gasthaus' }; return r < 0.7 ? { kind: 'social' } : { kind: 'home' }; }
    const tk = this.tasks.get(p.id); if (tk && this.sprites.some((q) => q.plotId === tk.plot)) return { kind: 'work', place: 'b:' + tk.plot, task: tk.text };
    return { kind: 'work', place: this.placeFor(p) };
  }
  key(d) { return d.kind + (d.place || '') + (d.where ? d.where.plotId : ''); }
  pairs() {
    const social = this.people.filter((p) => p.goal && p.goal.kind === 'social'), used = new Set(), out = [];
    for (const p of social) { if (used.has(p.id)) continue; let q = social.find((o) => o.id === p.freund && !used.has(o.id)) || social.find((o) => o.id !== p.id && !used.has(o.id)); used.add(p.id); if (q) { used.add(q.id); out.push([p, q]); } else out.push([p]); }
    return out;
  }
  update(dt, hour, t, weather) {
    this.weather = weather;
    let regroup = false;
    for (const p of this.people) {
      const d = this.desire(p, hour), k = this.key(d);
      if (p.goalKey !== k) { p.goalKey = k; p.goal = d; p.path = []; p.arrived = false; p.wait = p.state === 'new' ? 0 : Math.random() * 6; if (d.kind === 'social') regroup = true; if (p.state === 'new') this.placeNow(p, d); }
    }
    if (regroup) { this.pairs().forEach((pair, n) => { const a = n * 1.7 + 0.4, cx = PLAZA.x + Math.cos(a) * 21, cy = PLAZA.y + 4 + Math.sin(a) * 7; pair.forEach((p, i) => { const [x, y] = this.nav.nearestFree(cx + (i ? 4 : -4), cy); p.socialSpot = [x, y]; p.partner = pair[1 - i] || null; p.faceDir = i ? 'left' : 'right'; p.path = []; p.arrived = false; }); }); }
    for (const p of this.people) this.step(p, dt, t, hour);
    for (const p of this.crowd) this.stepCrowd(p, dt, hour);
    // Wanderer
    if (!this.wanderer && t > this.nextWanderer && this.wanderPool.length && phaseOf(hour) !== 'schlaf') {
      const w = this.wanderPool[Math.floor(Math.random() * this.wanderPool.length)], west = Math.random() < 0.5;
      const from = this.nav.nearestFree(west ? 112 : 902, west ? 432 : 470), to = this.nav.nearestFree(west ? 902 : 112, west ? 470 : 432);
      this.wanderer = { ...w, x: from[0], y: from[1], path: this.nav.path(from[0], from[1], PLAZA.x + 12, PLAZA.y + 6), dest: to, dir: 'right', dist: 0, ph: 0, alpha: 0, rest: 18, state: 'walk', activity: 'zieht durchs Dorf', wanderer: true };
      this.refreshSheets();
    }
    if (this.wanderer && this.wanderer.talking) { this.wanderer.dir = 'down'; this.wanderer.activity = 'spricht mit dir'; }
    else if (this.wanderer) {
      const w = this.wanderer; w.alpha = Math.min(1, w.alpha + dt);
      if (!w.path.length) { if (w.rest > 0) { w.rest -= dt; w.activity = 'rastet am Brunnen'; w.dir = 'down'; } else if (w.dest) { w.path = this.nav.path(w.x, w.y, w.dest[0], w.dest[1]); w.dest = null; w.activity = 'zieht weiter über die Berge'; } else { this.wanderer = null; this.nextWanderer = t + 180000 + Math.random() * 240000; } }
      else this.walk(w, dt);
    }
    // Arbeitsfunken / Späne
    for (const p of this.people) if (p.state === 'work' && Math.random() < dt * 1.6) {
      const ws = this.spriteOf(p.goal.place), col = { schmiede: '#ffb35a', wald: '#c9a26a', feld: '#7a5a38', scheune: '#d8c070', holzfaeller: '#c9a26a', saegewerk: '#d8b878', steinmetz: '#b4b8c0', toepferei: '#b06a3a', baeckerei: '#f0e0b0' }[ws ? ws.type : p.goal.place]; if (!col) continue;
      this.fx.push({ x: p.x + (p.dir === 'left' ? -5 : 5), y: p.y - 4, vx: (Math.random() - 0.5) * 14, vy: -8 - Math.random() * 10, life: 0, col });
    }
    this.fx = this.fx.filter((f) => (f.life += dt) < 0.7); for (const f of this.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 30 * dt; }
  }
  placeNow(p, d) {
    // beim Laden sofort an einen passenden Ort setzen, statt alle am Dorfplatz starten zu lassen
    if (d.kind === 'home' && p.home) { p.state = 'inside'; p.alpha = 0; [p.x, p.y] = this.door(p.home); p.arrived = true; return; }
    if (d.kind === 'inside') { p.state = 'inside'; p.alpha = 0; [p.x, p.y] = this.door(d.where); p.arrived = true; return; }
    const s = d.kind === 'work' ? this.workSpot(d.place, p) : this.workSpot('platz', p); p.x = s[0]; p.y = s[1]; p.state = 'idle'; p.arrived = true; p.wait = 5 + Math.random() * 20;
  }
  target(p) {
    const d = p.goal;
    if (d.kind === 'home') return p.home ? this.door(p.home) : this.workSpot('platz', p);
    if (d.kind === 'inside') return this.door(d.where);
    if (d.kind === 'social') return p.socialSpot || this.workSpot('platz', p);
    if (d.kind === 'platz') return this.workSpot('platz', p);
    return this.workSpot(d.place, p);
  }
  step(p, dt, t, hour) {
    const d = p.goal; if (!d) return;
    if (p.talking) { if (p.state === 'inside') { p.state = 'idle'; p.alpha = 1; } p.path = []; p.dir = 'down'; p.activity = 'spricht mit dir'; return; }
    if (p.state === 'inside') {
      if (d.kind === 'home' || d.kind === 'inside') { p.activity = d.kind === 'home' ? (phaseOf(hour - p.shift) === 'schlaf' ? 'schläft' : 'ist zu Hause') : d.text; return; }
      p.wait -= dt; if (p.wait > 0) return; p.state = 'idle'; p.alpha = 0; p.arrived = false; // kommt aus der Tür
    }
    if (p.alpha < 1 && p.state !== 'leaving') p.alpha = Math.min(1, p.alpha + dt * 1.5);
    if (p.path.length) { this.walk(p, dt); if (!p.path.length) this.arrive(p); return; }
    if (!p.arrived) { p.wait -= dt; if (p.wait > 0) { p.state = 'idle'; return; } const [tx, ty] = this.target(p); p.path = this.nav.path(p.x, p.y, tx, ty); p.state = 'walk'; p.activity = d.kind === 'social' ? 'geht zum Dorfplatz' : d.kind === 'inside' ? 'geht ' + (d.where.type === 'gasthaus' ? 'ins Gasthaus' : 'zum Essen') : (d.kind === 'work' && this.spriteOf(d.place) ? 'geht zur Arbeit' : GO_TEXT[d.kind === 'work' ? d.place : d.kind === 'home' ? 'home' : 'platz']); return; }
    if (p.state === 'leaving') { p.alpha -= dt * 1.5; if (p.alpha <= 0) { p.alpha = 0; p.state = 'inside'; } return; }
    // angekommen: arbeiten / plaudern / kurz verweilen, dann neuen Platz am selben Ort suchen
    if (d.kind === 'social') { if (p.partner && p.partner.arrived && p.partner.goal?.kind === 'social') { p.dir = p.faceDir; p.activity = `plaudert mit ${p.partner.name}`; } else p.activity = 'wartet am Dorfplatz'; return; }
    p.wait -= dt;
    if (p.wait <= 0 && (d.kind === 'work' || d.kind === 'platz')) { p.arrived = false; p.wait = 0; }
  }
  arrive(p) {
    const d = p.goal; p.arrived = true;
    if (d.kind === 'home' || d.kind === 'inside') { p.state = 'leaving'; p.dir = 'up'; return; }
    p.state = d.kind === 'work' ? 'work' : 'idle'; p.wait = 18 + Math.random() * 35;
    const ws = this.spriteOf(d.place);
    p.activity = d.task ? d.task : d.kind === 'work' ? (JOB_TEXT[p.job] || (ws ? 'arbeitet ' + ORT(ws.type) : WORK_TEXT[d.place])) : d.text || 'steht am Dorfplatz';
    if (Math.random() < 0.6) p.dir = d.kind === 'work' && ws && ws.type !== 'feld' && ws.type !== 'markt' ? 'up' : 'down';
  }
  walk(p, dt) {
    const [tx, ty] = p.path[0], dx = tx - p.x, dy = ty - p.y, dd = Math.hypot(dx, dy), sp = (p.wanderer ? 7.5 : 6.5) * dt;
    if (dd <= sp) { p.x = tx; p.y = ty; p.path.shift(); return; }
    p.x += (dx / dd) * sp; p.y += (dy / dd) * sp; p.dist += sp;
    p.dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx > 0 ? 'right' : 'left') : dy < 0 ? 'up' : 'down';
  }
  visible() { return [...this.people.filter((p) => p.state !== 'inside' && p.alpha > 0.01), ...(this.wanderer ? [this.wanderer] : [])]; }
  hit(wx, wy) { for (const p of this.visible()) if (Math.abs(wx - p.x) <= 6 && wy <= p.y + 1 && wy >= p.y - 16) return p; return null; }
  draw(c, t) {
    const list = [...this.visible(), ...this.crowd.filter((p) => p.alpha > 0.01 && !(p.inside > 0))].sort((a, b) => a.y - b.y);
    for (const p of list) {
      if (!p.cv) continue;
      c.globalAlpha = p.alpha * 0.28; c.fillStyle = 'rgb(15,18,28)'; c.fillRect(Math.round(p.x) - 4, Math.round(p.y), 8, 1); c.fillRect(Math.round(p.x) - 3, Math.round(p.y) + 1, 6, 1);
      c.globalAlpha = p.alpha;
      const moving = p.path.length > 0;
      let col = moving ? Math.floor(p.dist / 2.6) % 4 : 4 + ((((t / 1000) + p.ph) % 5.2) > 3.2 ? 1 : 0);
      if (!moving && p.state === 'work' && ((t / 1000 + p.ph) % 2.4) < 0.35) col = 1; // kurze Arbeitsbewegung
      c.drawImage(p.cv, col * SW, DIRS.indexOf(p.dir) * SH, SW, SH, Math.round(p.x) - 7, Math.round(p.y) - FOOT, SW, SH);
      if (p.activity && p.activity.startsWith('plaudert') && ((t / 1000 + p.ph) % 4) < 1.6) { c.fillStyle = '#f4efe2'; c.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 22, 5, 3); c.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 19, 1, 1); c.fillStyle = '#5a5048'; c.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 21, 1, 1); c.fillRect(Math.round(p.x) + 1, Math.round(p.y) - 21, 1, 1); }
    }
    c.globalAlpha = 1;
    for (const f of this.fx) { c.fillStyle = f.col; c.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); }
    // Häuser vor Figuren, die dahinter stehen, wieder darüberlegen (Felder nicht)
    for (const s of this.sprites) {
      if (s.type === 'feld' || !s.canvas) continue; const base = s.y + s.h - 3;
      if (list.some((p) => p.y < base && p.x + 7 > s.x && p.x - 7 < s.x + s.w && p.y > s.y && p.y - FOOT < s.y + s.h)) c.drawImage(s.canvas, s.x, s.y);
    }
    return list;
  }
  drawNames(c, list, scale2) {
    c.font = '800 15px "Alegreya Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.lineJoin = 'round';
    const placed = [];
    for (const p of list.slice().sort((a, b) => b.y - a.y)) {
      const x = p.x * scale2, wdt = c.measureText(p.name).width + 4; let y = (p.y - 18) * scale2;
      for (let k = 0; k < 4; k++) { const hitR = placed.find((r) => Math.abs(r.x - x) < (r.w + wdt) / 2 && Math.abs(r.y - y) < 13); if (!hitR) break; y = hitR.y - 13; }
      placed.push({ x, y, w: wdt }); c.globalAlpha = p.alpha;
      c.lineWidth = 3; c.strokeStyle = 'rgba(18,14,10,.85)'; c.strokeText(p.name, x, y);
      c.fillStyle = p.wanderer ? '#c8d8e8' : NAME_COL[p.stimmung] || '#f1e6cc'; c.fillText(p.name, x, y);
    }
    c.globalAlpha = 1;
  }
  info() { return this.people.map((p) => ({ id: p.id, name: p.name, job: p.job, stimmung: p.stimmung, wesen: p.wesen, activity: p.activity || '…', erinnerung: p.erinnerung, cv: p.cv, person: p })); }
}

/* ======================================================================
   Feld als baubares Objekt auf einem Bauplatz (flach, begehbar)
   ====================================================================== */
export function fieldSprite(plot) {
  const S = CORE.S, w = { L: 70, M: 54, S: 38 }[plot.size] || 54, h = Math.round(w * 0.34), x0 = Math.round(plot.x - w / 2), y0 = Math.round(plot.y - h + 2);
  const data = new Uint8ClampedArray(w * h * 4), lit = (hx, k) => { const c = CORE.mul(CORE.hex(hx), CORE.add(CORE.AMB, CORE.sc(CORE.LIGHT, k))); return c.map((v) => clamp(v, 0, 1) * 255); };
  const set = (x, y, c) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255; };
  const season = S.groundSnow ? 'winter' : S.particles === 'petals' ? 'fruehling' : S.particles === 'leaves' ? 'herbst' : 'sommer';
  const crop = { fruehling: ['#6f9a48', '#8fbc5a'], sommer: ['#c9a14a', '#e8c66a'], herbst: ['#a8905a', '#c8ad6a'], winter: ['#e4e8ee', '#f4f6f8'] }[season];
  const inside = (x, y) => { const inset = Math.round((h - 1 - y) * 0.35) + (CORE.N3.noise((x0 + x) * 0.2, y * 0.3) > 0.8 ? 1 : 0); return x >= inset && x < w - inset; };
  // Ackerboden
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) {
    const n = CORE.N4.noise((x0 + x) * 0.7, (y0 + y) * 1.1), furrow = (y % 3) === 0;
    set(x, y, season === 'winter' ? lit(furrow && n > 0.5 ? '#6a5040' : '#e6eaf0', furrow ? 0.7 : 0.9) : lit(furrow ? '#4e3420' : n > 0.6 ? '#7a5634' : '#6a4a2e', furrow ? 0.55 : 0.75));
  }
  // Pflanzen als kleine senkrechte Halme in Reihen (hinten kleiner)
  if (season !== 'winter') for (let y = 2; y < h - 1; y += 3) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue; const n = CORE.N4.noise((x0 + x) * 1.7, (y0 + y) * 2.3);
    const tall = season === 'sommer' ? (y > h * 0.5 ? 4 : 3) : season === 'herbst' ? 1 : (n > 0.5 ? 2 : 1);
    if (season === 'fruehling' && n < 0.35) continue; if (season === 'herbst' && n < 0.3) continue;
    for (let k = 0; k < tall; k++) set(x, y - k, lit(k === tall - 1 ? crop[1] : crop[0], k === tall - 1 ? 1 : 0.7 + k * 0.1));
    if (season === 'sommer' && n > 0.75) set(x, y - tall, lit('#f4dc8a', 1));
  }
  if (season === 'herbst') for (let k = 0; k < 3; k++) { const bx = Math.round(w * (0.25 + k * 0.25)), by = Math.round(h * 0.6); for (let yy = -3; yy <= 1; yy++) for (let xx = -3; xx <= 3; xx++) if ((xx / 3.2) ** 2 + (yy / 2.6) ** 2 < 1) set(bx + xx, by + yy, lit(yy < -1 ? '#e8cc7a' : '#c9a85a', xx > 0 ? 0.7 : 1)); }
  // niedriger Zaun vorne
  for (let x = 0; x < w; x++) { if (x % 6 === 0) { set(x, h - 1, lit('#5a3e28', 0.8)); set(x, h - 2, lit('#6b4a2e', 0.9)); set(x, h - 3, lit('#7a5a38', 1)); } else set(x, h - 2, lit('#6b4a2e', 0.85)); }
  return { type: 'feld', plotId: plot.id, x: x0, y: y0, w, h, data, info: { chimneys: [], windows: [], forge: null } };
}
