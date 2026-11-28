// Szene: Kamera, Ebenen, Filmeffekte, Leben (Wind, Vögel, Wetter, Rauch, Atmung) und Testmodus.
import { W, H, setMood, PLOTS, ROADS, TREES, PLAZA, BUILDINGS, buildingSprite, WORLD_VERSION, depthScale, LANTERNS, LAND, setLand, LAND_IDS, horizonY } from './world.js?v=6';
import { Nature } from './nature.js?v=3';
import { HERO_PLAN, sheetData, SW, SH, FOOT, DIRS } from './chars.js?v=4';
import { heroSprite, HERO_W, HERO_H, poseOfDay } from './hero.js?v=1';
import { VILLAGERS } from './villagers.js?v=1';
import { Village, fieldSprite } from './life.js?v=9';
import './buildings.js?v=3'; // meldet die zusätzlichen Bausätze an
import * as CORE from './core.js?v=1';
import { drawExtra, drawScaffold } from './extras.js?v=2';
import { zeichneUmfassung } from './umfassung.js?v=1';

const ZOOMS = { dorf: { w: 680, cx: 470, cy: 362 }, grossdorf: { w: 820, cx: 480, cy: 316 }, stadt: { w: 960, cx: 480, cy: 270 } };
const LAYOUT_KEY = 'mossheart_test_layout_v2';
const DEFAULT_LAYOUT = [['langhaus', 1], ['wohnhaus', 3], ['schmiede', 4], ['scheune', 6], ['wachturm', 9], ['feld', 13]];
const MOOD_HOUR = { morgen: 8.5, mittag: 14, abend: 18.5, nacht: 23.5 };

export function realMood(date = new Date()) {
  const h = date.getHours(), m = date.getMonth();
  const time = h >= 5 && h < 10 ? 'morgen' : h >= 10 && h < 17 ? 'mittag' : h >= 17 && h < 21 ? 'abend' : 'nacht';
  const season = m >= 2 && m <= 4 ? 'fruehling' : m >= 5 && m <= 7 ? 'sommer' : m >= 8 && m <= 10 ? 'herbst' : 'winter';
  return { time, season };
}

/* --- kleiner IndexedDB-Zwischenspeicher für die gezeichnete Welt --- */
function idb() { return new Promise((res) => { try { const r = indexedDB.open('mossheart', 1); r.onupgradeneeded = () => r.result.createObjectStore('worlds'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }); }
async function cacheGet(key) { const db = await idb(); if (!db) return null; return new Promise((res) => { try { const t = db.transaction('worlds').objectStore('worlds').get(key); t.onsuccess = () => res(t.result || null); t.onerror = () => res(null); } catch { res(null); } }); }
async function cachePut(key, val) { const db = await idb(); if (!db) return; try { db.transaction('worlds', 'readwrite').objectStore('worlds').put(val, key); } catch { /* egal */ } }

export class Scene {
  constructor(root, hooks = {}) {
    this.root = root; this.hooks = hooks;
    this.mood = realMood(); this.auto = true;
    this.zoom = 'dorf'; this.mouse = [0, 0]; this.smooth = [0, 0];
    this.weather = { kind: 'klar', target: 'klar', mix: 0, next: performance.now() + 120000 + Math.random() * 120000, forced: false };
    this.showPlots = false; this.showRoads = false; this.selected = null;
    this.layout = this.loadLayout();
    this.sprites = []; this.hero = null; this.heroFrames = null; this.extras = []; this.baustelle = null;
    this.particles = []; this.birds = null; this.nextBirds = performance.now() + 15000;
    this.pal = null; this.ready = false;
    { let l0 = 'hochtal'; try { l0 = localStorage.getItem('mossheart_land') || l0; } catch { /* */ } this.land = LAND_IDS.includes(l0) ? l0 : 'hochtal'; setLand(this.land); }
    this.village = new Village(); this.nature = new Nature(); this.showNames = false; this.residentsSet = false; this.selection = null; this.camTarget = null;
    this.build();
    this.worker = new Worker(new URL('./worker.js?v=3', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => this.onWorld(e.data);
    this.loadMood(this.mood.time, this.mood.season);
    window.addEventListener('resize', () => this.applyCamera(true));
    root.addEventListener('pointermove', (e) => this.onMove(e));
    root.addEventListener('pointerleave', () => { this.mouse = [0, 0]; this.hooks.onHover?.(null); });
    root.addEventListener('click', (e) => this.onClick(e));
    // Rechtsklick bzw. langes Drücken: Optionen für Bewohner, Gebäude und das Brett
    root.addEventListener('contextmenu', (e) => { if (e.target.closest('.ui')) return; e.preventDefault(); this.kontext(e.clientX, e.clientY); });
    { let lt = null, lp = null; const stop = () => { clearTimeout(lt); lt = null; };
      root.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch' || e.target.closest('.ui')) return; lp = [e.clientX, e.clientY]; stop(); lt = setTimeout(() => { lt = null; this.dragMoved = true; this.kontext(lp[0], lp[1]); }, 550); });
      root.addEventListener('pointermove', (e) => { if (lt && lp && Math.hypot(e.clientX - lp[0], e.clientY - lp[1]) > 10) stop(); });
      root.addEventListener('pointerup', stop); root.addEventListener('pointercancel', stop); }
    this.initGestures();
    window.addEventListener('deviceorientation', (e) => { if (e.gamma != null) this.mouse = [Math.max(-1, Math.min(1, e.gamma / 25)), Math.max(-1, Math.min(1, (e.beta - 40) / 25))]; });
    requestAnimationFrame((t) => this.loop(t));
    setInterval(() => { if (this.auto) { const m = realMood(); if (m.time !== this.mood.time || m.season !== this.mood.season) this.setMood(m.time, m.season, true); } }, 60000);
  }
  loadLayout() { try { const v = JSON.parse(localStorage.getItem(LAYOUT_KEY)); if (Array.isArray(v) && v.length) return v; } catch { /* */ } return DEFAULT_LAYOUT.map((x) => x.slice()); }
  saveLayout() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(this.layout)); } catch { /* */ } }
  // Anordnung aus der Datenbank übernehmen (ohne erneut zu speichern)
  setLayout(layout) { if (!Array.isArray(layout) || !layout.length || JSON.stringify(layout) === JSON.stringify(this.layout)) return; this.layout = layout.map((x) => x.slice()); this.saveLayout(); this.rebuildSprites(); }
  setBaustelle(b) { const k = JSON.stringify(b); if (k === this._bauKey) return; this._bauKey = k; this.baustelle = b; this.rebuildSprites(); }
  setExtras(list) { const k = JSON.stringify(list || []); if (k === this._extrasKey) return; this._extrasKey = k; this.extras = list || []; this.rebuildSprites(); }
  resetLayout() { this.layout = DEFAULT_LAYOUT.map((x) => x.slice()); this.saveLayout(); this.rebuildSprites(); }

  build() {
    const mk = (cls, parent, w, h) => { const c = document.createElement('canvas'); c.className = cls; if (w) { c.width = w; c.height = h; } parent.appendChild(c); return c; };
    this.root.innerHTML = '';
    this.world = document.createElement('div'); this.world.className = 'world'; this.root.appendChild(this.world);
    this.cv = {
      back: mk('lyr back', this.world, W, H), mid: mk('lyr mid', this.world, W, H), roads: mk('lyr roads', this.world, W, H),
      village: mk('lyr village', this.world, W, H), anim: mk('lyr anim', this.world, W, H), front: mk('lyr front', this.world, W, H),
      glow: mk('lyr glow', this.world, W * 2, H * 2), marks: mk('lyr marks', this.world, W * 2, H * 2), lbl: mk('lyr marks', this.world, W * 2, H * 2),
    };
    this.cv.roads.style.opacity = 0;
    this.heroWrap = document.createElement('div'); this.heroWrap.className = 'herowrap'; this.root.appendChild(this.heroWrap);
    this.cv.hero = mk('hero', this.heroWrap, HERO_W, HERO_H); this.cv.heroFx = mk('hero', this.heroWrap, HERO_W, HERO_H);
    this.cv.weather = mk('screen weather', this.root, 480, 270);
    this.fogEl = document.createElement('div'); this.fogEl.className = 'screen fog'; this.root.appendChild(this.fogEl);
    this.cv.shade = mk('screen shade', this.root, 320, 180); this.cv.grain = mk('screen grain', this.root, 320, 180);
    this.loader = document.createElement('div'); this.loader.className = 'loader'; this.loader.textContent = 'Die Welt wird gezeichnet …'; this.root.appendChild(this.loader);
    this.applyCamera(true);
  }

  /* ---------- Welt laden ---------- */
  setMood(time, season, auto = false) { this.auto = auto; this.loadMood(time, season); }
  // Gegend des Dorfes (jedes Dorf hat eine eigene Landschaft)
  setLand(id, persist = true) {
    if (!LAND_IDS.includes(id) || id === this.land) return;
    this.land = id; setLand(id); if (persist) try { localStorage.setItem('mossheart_land', id); } catch { /* */ }
    this.selection = null; this.camTarget = null; this.nature = new Nature();
    this.loadMood(this.mood.time, this.mood.season);
  }
  async loadMood(time, season) {
    this.mood = { time, season };
    this.hooks.onMood?.(this.mood, this.auto);
    const land = this.land, key = `${WORLD_VERSION}|${land}|${time}|${season}`;
    this.loader.style.display = 'grid';
    const cached = await cacheGet(key);
    if (cached && this.mood.time === time && this.mood.season === season && this.land === land) { this.applyWorld(cached, time, season); return; }
    this.reqId = (this.reqId || 0) + 1;
    this.worker.postMessage({ time, season, land, id: this.reqId, key });
    this.pendingKey = key;
  }
  onWorld(d) {
    if (!d.ok) { this.loader.textContent = 'Fehler beim Zeichnen: ' + d.error; console.error(d.error); return; }
    if (d.id !== this.reqId) return;
    const val = { pal: d.pal, back: d.back, mid: d.mid, roads: d.roads, front: d.front };
    cachePut(this.pendingKey, val);
    this.applyWorld(val, this.mood.time, this.mood.season);
  }
  applyWorld(v, time, season) {
    setMood(time, season);
    this.pal = v.pal;
    const put = (cv, data) => cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), W, H), 0, 0);
    { const d = v.back; this.root.style.background = `rgb(${d[0]},${d[1]},${d[2]})`; }
    put(this.cv.back, v.back); put(this.cv.mid, v.mid); put(this.cv.roads, v.roads); put(this.cv.front, v.front);
    this.rebuildSprites();
    this.makeHeroFrames();
    if (!this.residentsSet) this.setResidents(null); else this.village.refreshSheets();
    this.drawHero(0, true);
    this.makeGrass();
    this.drawShade();
    this.loader.style.display = 'none';
    this.ready = true;
    this.hooks.onReady?.();
  }
  rebuildSprites() {
    if (!this.pal) return;
    setMood(this.mood.time, this.mood.season);
    this.mauer = this.layout.some((l) => l[0] === 'steinmauer') ? 'steinmauer' : this.layout.some((l) => l[0] === 'palisade') ? 'palisade' : null;
    this.sprites = this.layout.filter(([, plotId]) => plotId < 90).map(([type, plotId]) => { const plot = PLOTS.find((p) => p.id === plotId); return type === 'feld' ? fieldSprite(plot) : buildingSprite(type, plot, this.pal); }).sort((a, b) => (a.type === 'feld' ? -1 : 0) - (b.type === 'feld' ? -1 : 0) || (a.y + a.h) - (b.y + b.h));
    const c = this.cv.village.getContext('2d'); c.clearRect(0, 0, W, H);
    // Baustelle eines neuen Gebäudes: wächst mit dem Fortschritt von unten nach oben (kein echtes Gebäude, nur Bild)
    const B = this.baustelle, bplot = B && PLOTS.find((p) => p.id === B.plot);
    let bau = null;
    if (B && bplot && B.art === 'neu' && !this.layout.some((l) => l[1] === B.plot)) {
      try { bau = B.gebaeude === 'feld' ? fieldSprite(bplot) : buildingSprite(B.gebaeude, bplot, this.pal); bau.isBau = true; } catch { bau = null; }
    }
    this.bauSprite = bau;
    const order = bau ? [...this.sprites, bau].sort((a, b) => (a.y + a.h) - (b.y + b.h)) : this.sprites;
    const wallBau = B && B.art === 'neu' && B.plot >= 90 ? B : null;
    const mauern = (teil) => {
      if (this.mauer) zeichneUmfassung(c, this.mauer, teil, 1);
      if (wallBau && wallBau.gebaeude !== this.mauer) zeichneUmfassung(c, wallBau.gebaeude, teil, 0.08 + 0.92 * Math.max(0, Math.min(1, wallBau.fortschritt || 0)));
    };
    mauern('hinten');
    this.brett = zeichneBrett(c);
    for (const s of order) {
      const tmp = document.createElement('canvas'); tmp.width = s.w; tmp.height = s.h;
      tmp.getContext('2d').putImageData(new ImageData(s.data, s.w, s.h), 0, 0);
      s.canvas = tmp;
      if (s.isBau) {
        const f = 0.2 + 0.8 * Math.max(0, Math.min(1, B.fortschritt || 0)), vh = Math.max(4, Math.round(s.h * f));
        c.save(); c.globalAlpha = 0.9; c.drawImage(tmp, 0, s.h - vh, s.w, vh, s.x, s.y + s.h - vh, s.w, vh); c.restore();
        drawScaffold(c, s, bplot, 'neu', f);
        continue;
      }
      c.drawImage(tmp, s.x, s.y);
      // Zusätze, die Bewohner gebaut haben (oder gerade bauen)
      const plot = PLOTS.find((p) => p.id === s.plotId);
      for (const e of this.extras) if (e.plot === s.plotId && e.gebaeude === s.type && plot) drawExtra(c, s, plot, e.zusatz, e.status);
      if (B && B.art === 'ausbau' && B.plot === s.plotId && plot) drawScaffold(c, s, plot, 'ausbau', 1);
    }
    mauern('vorne');
    this.village.setSprites(this.sprites);
    this.filterGrass();
    this.drawMarks();
    this.hooks.onLayout?.(this.layout);
  }

  /* ---------- Kamera ---------- */
  setZoom(z) { const p = ZOOMS[z]; this.zoom = z; this.view = { w: p.w, cx: p.cx, cy: p.cy }; this.applyCamera(); }
  computeCam() {
    const rw = this.root.clientWidth || window.innerWidth, rh = this.root.clientHeight || window.innerHeight, portrait = rw < rh * 0.9;
    if (!this.view) { const p = ZOOMS[this.zoom || 'dorf']; this.view = { w: p.w, cx: p.cx, cy: p.cy }; }
    const v = this.view; let scale, vx, vy;
    if (portrait) {
      // Hochformat (Handy): mehr Breite zeigen, Welt unten ausrichten, darüber geht der Himmel weiter
      const pw = v.w * 0.46; scale = rw / pw;
      vx = Math.max(0, Math.min(W - pw, v.cx - pw / 2));
      vy = Math.min(H - rh / scale + 40 / scale, Math.max(0, v.cy - rh / scale / 2));
      v.cx = vx + pw / 2;
    } else {
      scale = Math.max(rw / v.w, rh / (v.w * 9 / 16));
      const vw = rw / scale, vh = rh / scale;
      vx = Math.max(0, Math.min(W - vw, v.cx - vw / 2)); vy = Math.max(0, Math.min(H - vh, v.cy - vh / 2));
      v.cx = vx + vw / 2; v.cy = vy + vh / 2;
    }
    return { scale, vx, vy, rw, rh, portrait };
  }
  applyCamera(instant = false) {
    const { scale, vx, vy, rw, rh } = this.computeCam();
    this.cam = { scale, vx, vy };
    const ease = 'cubic-bezier(.45,.05,.25,1)';
    this.world.style.transition = instant ? 'none' : `transform 3.2s ${ease}`;
    this.world.style.transform = `translate(${-vx * scale}px, ${-vy * scale}px) scale(${scale})`;
    // Held im selben Pixelmaßstab wie die Welt (ein Heldenpixel = ein Weltpixel); beim starken Hineinzoomen gedeckelt
    const hs = Math.min(scale, Math.max(rw / HERO_W, rh / HERO_H));
    this.heroWrap.style.transition = instant ? 'none' : `width 3.2s ${ease}, height 3.2s ${ease}, left 3.2s ${ease}, top 3.2s ${ease}`;
    this.heroWrap.style.width = `${HERO_W * hs}px`; this.heroWrap.style.height = `${HERO_H * hs}px`;
    // Held gehört zum Vordergrund unten links in der Welt: wandert beim Verschieben/Zoomen mit
    this.heroWrap.style.left = `${Math.round((120 - vx) * scale)}px`; this.heroWrap.style.top = `${Math.round((H - vy) * scale - HERO_H * hs)}px`;
    // Tiefenunschärfe: Berge weich, Vordergrund am Weltrand leicht weich
    this.cv.back.style.filter = `blur(${(0.9 / scale) * (this.view.w > 900 ? 1.2 : 1.6)}px)`;
    this.cv.front.style.filter = `blur(${0.8 / scale}px)`;
  }
  // Zoomen um einen Bildschirmpunkt (Mausrad, zwei Finger)
  zoomAt(clientX, clientY, newW) {
    const r = this.root.getBoundingClientRect(), sx = clientX - r.left, sy = clientY - r.top, c = this.cam;
    const wx = c.vx + sx / c.scale, wy = c.vy + sy / c.scale;
    this.view.w = Math.max(360, Math.min(960, newW));
    const n = this.computeCam();
    this.view.cx = wx - (sx - n.rw / 2) / n.scale + (n.portrait ? 0 : 0); this.view.cy = wy - (sy - n.rh / 2) / n.scale;
    this.zoom = null; this.applyCamera(true); this.hooks.onZoom?.();
  }
  panBy(dx, dy) { if (this.camTarget?.person) this.camTarget = null; this.view.cx -= dx / this.cam.scale; this.view.cy -= dy / this.cam.scale; this.zoom = null; this.applyCamera(true); }
  initGestures() {
    const root = this.root, ptrs = new Map();
    root.addEventListener('wheel', (e) => { e.preventDefault(); this.camTarget = null; this.zoomAt(e.clientX, e.clientY, this.view.w * Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0015))); }, { passive: false });
    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) this.drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, w: this.view.w, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; if (this.drag) this.drag.moved = true; }
    });
    root.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        this.panBy(mx - this.pinch.mx, my - this.pinch.my); this.pinch.mx = mx; this.pinch.my = my;
        this.zoomAt(mx, my, this.pinch.w * this.pinch.d / d);
      } else if (this.drag) {
        if (Math.abs(e.clientX - this.drag.x) + Math.abs(e.clientY - this.drag.y) > 6) this.drag.moved = true;
        if (this.drag.moved) { this.panBy(e.clientX - this.drag.lx, e.clientY - this.drag.ly); this.root.style.cursor = 'grabbing'; }
        this.drag.lx = e.clientX; this.drag.ly = e.clientY;
      }
    });
    const end = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) this.pinch = null; if (ptrs.size === 0 && this.drag) { this.dragMoved = this.drag.moved; this.drag = null; this.root.style.cursor = 'default'; } };
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
  }
  toScreen(wx, wy) { const m = this.world.getBoundingClientRect(); return [m.left + wx * m.width / W, m.top + wy * m.height / H]; }
  toWorld(clientX, clientY) {
    const r = this.root.getBoundingClientRect(), m = this.world.getBoundingClientRect();
    return [(clientX - m.left) / (m.width / W), (clientY - m.top) / (m.height / H), clientX - r.left, clientY - r.top];
  }

  /* ---------- Interaktion ---------- */
  spriteAt(wx, wy) {
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const s = this.sprites[i], x = Math.floor(wx - s.x), y = Math.floor(wy - s.y);
      if (x >= 0 && y >= 0 && x < s.w && y < s.h && s.data[(y * s.w + x) * 4 + 3]) return s;
    }
    return null;
  }
  plotAt(wx, wy) { return PLOTS.find((p) => Math.hypot((wx - p.x) / (p.rad * 0.7), (wy - p.y) / (p.rad * 0.35)) < 1) || null; }
  onMove(e) {
    if (this.drag && this.drag.moved) return;
    const r = this.root.getBoundingClientRect();
    this.mouse = [((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1];
    if (!this.ready) return;
    const [wx, wy, sx, sy] = this.toWorld(e.clientX, e.clientY);
    const v = this.village.hit(wx, wy);
    if (v) { this.hooks.onHover?.({ kind: 'villager', person: v, x: sx, y: sy }); this.root.style.cursor = 'pointer'; return; }
    const s = this.spriteAt(wx, wy);
    const bs = this.bauSprite, onBau = !s && bs && wx >= bs.x && wx < bs.x + bs.w && wy >= bs.y + bs.h * 0.4 && wy < bs.y + bs.h + 4;
    if (onBau) { this.hooks.onHover?.({ kind: 'baustelle', baustelle: this.baustelle, x: sx, y: sy }); this.root.style.cursor = 'default'; return; }
    const p = !s && this.showPlots ? this.plotAt(wx, wy) : null;
    this.hooks.onHover?.(s ? { kind: 'building', sprite: s, building: BUILDINGS[s.type], plot: PLOTS.find((q) => q.id === s.plotId), x: sx, y: sy } : p ? { kind: 'plot', plot: p, x: sx, y: sy } : null);
    this.root.style.cursor = s || p ? 'pointer' : 'default';
  }
  onClick(e) {
    if (this.dragMoved) { this.dragMoved = false; return; }
    if (!this.ready || e.target.closest('.ui')) return;
    const [wx, wy] = this.toWorld(e.clientX, e.clientY);
    const s = this.spriteAt(wx, wy);
    if (!this.showPlots) {
      const bt = this.brett;
      if (bt && wx > bt.x - 4 && wx < bt.x + bt.w + 4 && wy > bt.y - 4 && wy < bt.y + bt.h + 2) { this.hooks.onBrett?.(); return; }
      const v = this.village.hit(wx, wy);
      if (v) return this.select({ kind: 'villager', person: v });
      if (s) return this.select({ kind: 'building', sprite: s });
      return this.select(null);
    }
    if (this.showPlots) {
      if (s) { this.selected = s.plotId === this.selected ? null : s.plotId; this.selPlot = null; this.drawMarks(); this.hooks.onSelect?.(this.selected); return; }
      const p = this.plotAt(wx, wy);
      if (p && this.selected != null) {
        const from = this.layout.find((l) => l[1] === this.selected), occupant = this.layout.find((l) => l[1] === p.id);
        if (from) { if (occupant) occupant[1] = this.selected; from[1] = p.id; }
        this.selected = null; this.saveLayout(); this.rebuildSprites(); this.hooks.onSelect?.(null);
      } else if (p) { this.selPlot = this.selPlot === p.id ? null : p.id; this.drawMarks(); this.hooks.onSelect?.(null); }
    }
  }
  kontext(cx, cy) {
    if (!this.ready || this.showPlots) return;
    const [wx, wy] = this.toWorld(cx, cy), bt = this.brett;
    if (bt && wx > bt.x - 4 && wx < bt.x + bt.w + 4 && wy > bt.y - 4 && wy < bt.y + bt.h + 2) return this.hooks.onKontext?.({ kind: 'brett', x: cx, y: cy });
    const v = this.village.hit(wx, wy); if (v) return this.hooks.onKontext?.({ kind: 'villager', person: v, x: cx, y: cy });
    const s = this.spriteAt(wx, wy); if (s) return this.hooks.onKontext?.({ kind: 'building', sprite: s, x: cx, y: cy });
  }
  togglePlots(v) { this.showPlots = v ?? !this.showPlots; this.selected = null; this.selPlot = null; this.drawMarks(); this.hooks.onPlots?.(this.showPlots); }
  toggleRoads(v) { this.showRoads = v ?? !this.showRoads; this.cv.roads.style.opacity = this.showRoads ? 1 : 0; }
  drawMarks() {
    const c = this.cv.marks.getContext('2d'); c.clearRect(0, 0, W * 2, H * 2);
    if (!this.showPlots) return;
    c.imageSmoothingEnabled = false;
    for (const p of PLOTS) {
      const used = this.layout.find((l) => l[1] === p.id), sel = this.selected === p.id || this.selPlot === p.id;
      c.strokeStyle = sel ? '#ffe08a' : used ? 'rgba(255,255,255,.35)' : 'rgba(255,224,138,.85)';
      c.lineWidth = sel ? 4 : 3; c.setLineDash(used ? [3, 3] : [6, 4]);
      c.beginPath(); c.ellipse(p.x * 2, p.y * 2, p.rad * 1.3, p.rad * 0.6, 0, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]); c.fillStyle = 'rgba(20,16,12,.8)'; c.fillRect(p.x * 2 - 13, p.y * 2 - 10, 26, 20);
      c.fillStyle = sel ? '#ffe08a' : '#efe6cf'; c.font = '800 17px "Alegreya Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(p.id), p.x * 2, p.y * 2 + 1);
    }
  }
  // Testmodus: Gebäude setzen / abreißen
  placeBuilding(type, plotId) { const cur = this.layout.find((l) => l[1] === plotId); if (cur) cur[0] = type; else this.layout.push([type, plotId]); this.selPlot = null; this.selected = null; this.saveLayout(); this.rebuildSprites(); this.hooks.onSelect?.(null); }
  removeBuilding(plotId) { this.layout = this.layout.filter((l) => l[1] !== plotId); this.selPlot = null; this.selected = null; this.saveLayout(); this.rebuildSprites(); this.hooks.onSelect?.(null); }
  typeAt(plotId) { return this.layout.find((l) => l[1] === plotId)?.[0] || null; }
  setWeather(kind) { this.weather.target = kind; this.weather.forced = kind !== 'auto'; if (kind === 'auto') { this.weather.forced = false; this.weather.target = 'klar'; } this.hooks.onWeather?.(this.weather.target); }

  /* ---------- Auswahl: hineinzoomen, folgen, Ring ---------- */
  select(obj) {
    if (this.selection?.person) this.selection.person.talking = false;
    this.selection = obj;
    if (obj) {
      const plot = obj.sprite && PLOTS.find((p) => p.id === obj.sprite.plotId);
      this.camTarget = obj.kind === 'villager' ? { w: 400, person: obj.person } : { w: 470, cx: plot ? plot.x : obj.sprite.x + obj.sprite.w / 2, cy: (plot ? plot.y : obj.sprite.y + obj.sprite.h) - 30 };
    } else this.camTarget = null;
    this.hooks.onSelectObject?.(obj);
  }
  stepCamera(dt) {
    const tg = this.camTarget; if (!tg || (this.drag && this.drag.moved) || this.pinch) return;
    if (tg.person) { tg.cx = tg.person.x; tg.cy = tg.person.y - 14; }
    const v = this.view, k = 1 - Math.exp(-dt * 2.6);
    v.w += (tg.w - v.w) * k; v.cx += (tg.cx - v.cx) * k; v.cy += (tg.cy - v.cy) * k; this.zoom = null;
    this.applyCamera(true);
    if (!tg.person && Math.abs(tg.w - v.w) < 1 && Math.abs(tg.cx - v.cx) < 1) this.camTarget = null;
  }
  drawSelection(c, t) {
    const sel = this.selection; if (!sel) return;
    const pulse = 0.55 + Math.sin(t / 300) * 0.25;
    c.strokeStyle = `rgba(255,214,120,${pulse.toFixed(2)})`; c.lineWidth = 1;
    if (sel.kind === 'villager') { const p = sel.person; if (p.state === 'inside') return; c.beginPath(); c.ellipse(Math.round(p.x) + 0.5, Math.round(p.y) + 1.5, 7, 2.5, 0, 0, Math.PI * 2); c.stroke(); }
    else { const plot = PLOTS.find((q) => q.id === sel.sprite.plotId); if (!plot) return; c.beginPath(); c.ellipse(plot.x, plot.y + 2, plot.rad * 0.95, plot.rad * 0.32, 0, 0, Math.PI * 2); c.stroke(); }
  }

  /* ---------- Dorfbewohner ---------- */
  setResidents(data) {
    // data aus get_my_residents(); ohne Daten (lokaler Test) acht Beispiel-Bewohner
    this.residentsSet = true;
    let list = data && Array.isArray(data.residents) && data.residents.length ? data.residents : null, wand = (data && data.wanderer) || [];
    if (!list) { const pick = VILLAGERS.slice(0, 16).filter((_, i) => i % 2 === 0); list = pick.map((v, i) => ({ id: 1000 + i, name: v.name, job: v.beruf, look: v, stimmung: ['freundlich', 'herzlich', 'zurückhaltend'][i % 3], freund: null, erinnerung: null })); wand = VILLAGERS.slice(30, 34).map((v, i) => ({ id: 2000 + i, name: v.name, job: v.beruf, look: v })); }
    setMood(this.mood.time, this.mood.season);
    this.village.setPeople(list, wand);
    if (this.sprites.length) this.village.setSprites(this.sprites);
  }
  sceneHour() { if (this.auto) { const d = new Date(); return d.getHours() + d.getMinutes() / 60; } return MOOD_HOUR[this.mood.time]; }
  toggleNames(v) { this.showNames = v ?? !this.showNames; }

  /* ---------- Held ---------- */
  setAway(on) { this.away = !!on; if (this.heroWrap) this.heroWrap.style.display = on ? 'none' : ''; }
  setBusy(text) { if (!this.heroWrap) return; let t = this.heroWrap.querySelector('.hero-busy'); if (!text) { t?.remove(); return; } if (!t) { t = document.createElement('div'); t.className = 'hero-busy'; this.heroWrap.append(t); } t.textContent = text; }
  setHeroPlan(plan) { this.heroPlan = plan; if (!this.pal) return; setMood(this.mood.time, this.mood.season); this.makeHeroFrames(); this.drawHero(this.heroFrame || 0, true); }
  // Pose des Tages (wechselt um Mitternacht); im Testmodus fest einstellbar
  heroPose() { const p = this.heroPlan || HERO_PLAN; if (this.forcedPose) return this.forcedPose; let h = 0; for (const ch of String(p.name || '')) h = (h * 31 + ch.charCodeAt(0)) | 0; return poseOfDay(h); }
  setPose(pose) { this.forcedPose = pose || null; if (this.pal) { setMood(this.mood.time, this.mood.season); this.makeHeroFrames(); this.drawHero(this.heroFrame || 0, true); } }
  makeHeroFrames() { const plan = this.heroPlan || HERO_PLAN, pose = this.heroPose(); this.poseDay = new Date().toDateString(); this.heroFrames = [heroSprite(plan, 0, pose), heroSprite(plan, 1, pose)]; }
  restoreMood() { setMood(this.mood.time, this.mood.season); }
  drawHero(frame, force = false) {
    if (!this.heroFrames || (!force && frame === this.heroFrame)) return;
    this.heroFrame = frame;
    this.cv.hero.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(this.heroFrames[frame].data), HERO_W, HERO_H), 0, 0);
  }

  /* ---------- Gras im Wind: vorgezeichnete Büschel in 5 Neigungen ---------- */
  makeGrass() {
    setMood(this.mood.time, this.mood.season);
    const S = CORE.S, flat = (h, k) => { const c = CORE.mul(CORE.hex(h), CORE.add(CORE.AMB, CORE.sc(CORE.LIGHT, k))); return `rgb(${Math.min(255, c[0] * 255) | 0},${Math.min(255, c[1] * 255) | 0},${Math.min(255, c[2] * 255) | 0})`; };
    const colors = [S.grass[1], S.grass[2], S.dry, S.grass[1]];
    this.grassVariants = [];
    for (let v = 0; v < 12; v++) {
      const blades = 2 + (v % 3), hgt = 3 + (v % 4), base = colors[v % (S.groundSnow ? 2 : colors.length)];
      const frames = [];
      for (let f = 0; f < 5; f++) {
        const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16; const c = cv.getContext('2d');
        const lean = (f - 2) * 0.55;
        for (let b = 0; b < blades; b++) for (let k = 0; k < hgt - (b % 2); k++) {
          const t = k / hgt; c.fillStyle = flat(S.groundSnow && t < 0.35 ? '#dfe5ee' : base, t > 0.6 ? 1 : t > 0.3 ? 0.7 : 0.45);
          c.fillRect(Math.round(8 + b - blades / 2 + lean * t * t * 4 + (b - blades / 2) * t * 0.6), 15 - k, 1, 1);
        }
        frames.push(cv);
      }
      this.grassVariants.push(frames);
    }
    const rnd = CORE.rng(5); this.grass = [];
    for (let i = 0; i < 700; i++) {
      const x = rnd() * W, y = 300 + rnd() * 240;
      if (PLOTS.some((p) => Math.hypot((p.x - x) / (p.rad * 0.9), (p.y - y) / (p.rad * 0.45)) < 1)) continue;
      if (Math.hypot(x - PLAZA.x, (y - PLAZA.y) * 2) < 34) continue;
      if (y < horizonY(x) + 8 || LAND.inFace(x, y, 2) || LAND.onStream(x, y, 3)) continue;
      this.grass.push({ x, y, v: Math.floor(rnd() * 12), ph: rnd() * 6.28 });
    }
    this.grass.sort((a, b) => a.y - b.y);
    this.filterGrass();
  }

  filterGrass() {
    if (!this.grass) return;
    const hidden = (g) => this.sprites.some((s) => { if (s.type === 'feld') return g.x > s.x && g.x < s.x + s.w && g.y > s.y && g.y < s.y + s.h + 2; if (g.x < s.x || g.x >= s.x + s.w || g.y < s.y || g.y > s.y + s.h + 3) return false; for (let dy = 0; dy < 16; dy++) { const yy = Math.floor(g.y - dy - s.y), xx = Math.floor(g.x - s.x); if (yy >= 0 && yy < s.h && s.data[(yy * s.w + xx) * 4 + 3]) return true; } return false; });
    this.grassVis = this.grass.filter((g) => !hidden(g));
  }
  /* ---------- Licht, Vignette, Korn ---------- */
  drawShade() {
    const c = this.cv.shade.getContext('2d'), w = 320, h = 180;
    const tint = { morgen: 'rgb(255,246,236)', mittag: '#fff', abend: 'rgb(255,232,222)', nacht: 'rgb(214,222,255)' }[this.mood.time];
    c.fillStyle = tint; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w * 0.55, h * 0.5, h * 0.32, w * 0.55, h * 0.5, h * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, this.mood.time === 'nacht' ? 'rgba(5,8,25,.62)' : 'rgba(30,22,36,.48)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  drawGrain() {
    const c = this.cv.grain.getContext('2d'), img = c.createImageData(320, 180);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    c.putImageData(img, 0, 0);
  }

  /* ---------- Hauptschleife ---------- */
  loop(t) {
    requestAnimationFrame((tt) => this.loop(tt));
    if (!this.ready) return;
    const dt = Math.min(0.05, (t - (this.lastT || t)) / 1000); this.lastT = t;
    // sanfte Parallaxe
    this.smooth[0] += (this.mouse[0] - this.smooth[0]) * 0.03; this.smooth[1] += (this.mouse[1] - this.smooth[1]) * 0.03;
    this.stepCamera(dt);
    const [mx, my] = this.smooth;
    const off = (k) => `translate(${(-mx * k).toFixed(2)}px, ${(-my * k * 0.5).toFixed(2)}px)`;
    this.cv.back.style.transform = off(1.2); this.cv.mid.style.transform = this.cv.roads.style.transform = this.cv.village.style.transform = this.cv.anim.style.transform = this.cv.glow.style.transform = this.cv.marks.style.transform = this.cv.lbl.style.transform = off(2.6); this.cv.front.style.transform = off(4.5);
    this.heroWrap.style.transform = `translate(${(-mx * 14).toFixed(1)}px, ${(-my * 6).toFixed(1)}px)`;
    this.updateWeather(t, dt);
    this.drawAnim(t, dt);
    this.drawGlow(t);
    this.drawHeroFx(t);
    if (t - (this.lastGrain || 0) > 110) { this.drawGrain(); this.lastGrain = t; }
  }
  updateWeather(t, dt) {
    const w = this.weather;
    if (!w.forced && t > w.next) {
      const opts = this.mood.season === 'winter' ? ['klar', 'klar', 'wolkig', 'schnee', 'nebel'] : ['klar', 'klar', 'klar', 'wolkig', 'regen', 'nebel'];
      w.target = opts[Math.floor(Math.random() * opts.length)]; w.next = t + 180000 + Math.random() * 240000; this.hooks.onWeather?.(w.target);
    }
    if (w.kind !== w.target) { w.mix -= dt / 12; if (w.mix <= 0) { w.mix = 0; w.kind = w.target; } } else w.mix = Math.min(1, w.mix + dt / 12);
    const k = w.kind, m = w.mix;
    const dim = { klar: 0, wolkig: 0.1, regen: 0.2, nebel: 0.08, schnee: 0.12 }[k] * m;
    this.world.style.filter = dim ? `brightness(${(1 - dim).toFixed(3)}) saturate(${(1 - dim * 0.8).toFixed(3)})` : '';
    this.fogEl.style.opacity = (k === 'nebel' ? 0.55 : k === 'regen' ? 0.18 : 0) * m;
    this.wind = 1 + (k === 'regen' ? 1.4 : k === 'wolkig' ? 0.5 : k === 'schnee' ? 0.3 : 0) * m;
    // Regen/Schnee auf dem Bildschirm
    const c = this.cv.weather.getContext('2d'); c.clearRect(0, 0, 480, 270);
    if ((k === 'regen' || k === 'schnee') && m > 0.02) {
      const n = Math.round((k === 'regen' ? 260 : 160) * m);
      for (let i = 0; i < n; i++) {
        const sp = k === 'regen' ? 900 + (i % 7) * 60 : 9000 + (i % 11) * 900, ph = ((t / sp) + i * 0.6180339) % 1;
        const x = (i * 97.3 + ph * (k === 'regen' ? 90 : 30) + Math.sin(t / 1300 + i) * (k === 'schnee' ? 6 : 0)) % 480, y = ph * 290 - 10;
        if (k === 'regen') { c.fillStyle = 'rgba(190,210,235,.38)'; c.fillRect(x | 0, y | 0, 1, 4); c.fillRect((x + 1) | 0, (y + 4) | 0, 1, 2); }
        else { c.fillStyle = 'rgba(245,248,255,.85)'; c.fillRect(x | 0, y | 0, i % 3 ? 1 : 2, 1); }
      }
    }
  }
  drawAnim(t, dt) {
    const c = this.cv.anim.getContext('2d'); c.clearRect(0, 0, W, H);
    // Wolkenschatten bei bewölktem Himmel
    if (this.weather.kind === 'wolkig' || this.weather.kind === 'regen') {
      c.fillStyle = `rgba(20,25,40,${(0.12 * this.weather.mix).toFixed(3)})`;
      for (let i = 0; i < 4; i++) { const x = ((t / 900 + i * 260) % (W + 400)) - 200, y = 400 + i * 30; c.beginPath(); c.ellipse(x, y, 140, 26, 0, 0, Math.PI * 2); c.fill(); }
    }
    // Gras im Wind (ruhig)
    const wind = this.wind || 1;
    for (const g of this.grassVis || this.grass) {
      const s = Math.sin(t / (3200 / wind) + g.x * 0.018 + g.ph * 0.15) * 0.5 + Math.sin(t / 7100 + g.x * 0.004) * 0.5;
      const f = Math.max(0, Math.min(4, Math.round(2 + s * 1.6 * Math.min(1.4, wind))));
      c.drawImage(this.grassVariants[g.v][f], Math.round(g.x - 8), Math.round(g.y - 15));
    }
    // Ökosystem (Pfützen, Spuren, Wasser, Tiere), Dorfbewohner (Tagesablauf, Wege, Verdeckung), Namensschilder
    const hour = this.sceneHour();
    this.nature.drawGround(c, t);
    this.drawSelection(c, t);
    this.nature.update(dt, t, { hour, weather: this.weather.kind, season: this.mood.season, people: this.village.visible(), sprites: this.sprites });
    this.nature.drawAnimals(c, t);
    this.village.update(dt, hour, t, this.weather.kind);
    const vis = this.village.draw(c, t);
    for (const sp of this.sprites) if (sp.info.sails) this.drawSails(c, sp.info.sails, t);
    const lc = this.cv.lbl.getContext('2d'); lc.clearRect(0, 0, W * 2, H * 2);
    if (this.showNames) this.village.drawNames(lc, vis, 2);
    else if (this.selection?.kind === 'villager' && vis.includes(this.selection.person)) this.village.drawNames(lc, [this.selection.person], 2);
    // Rauch aus Schornsteinen und Esse
    const night = this.mood.time === 'nacht';
    for (const s of this.sprites) for (const ch of s.info.chimneys) for (let i = 0; i < 7; i++) {
      const ph = ((t / 5200) + i / 7 + ch[0] * 0.013) % 1;
      c.fillStyle = night ? `rgba(150,160,190,${(0.55 * (1 - ph)).toFixed(2)})` : `rgba(232,230,224,${(0.6 * (1 - ph)).toFixed(2)})`;
      const sz = ph > 0.45 ? 2 : 1; c.fillRect(Math.round(ch[0] + ph * 12 * wind + Math.sin(ph * 5 + i) * 1.5), Math.round(ch[1] - ph * 34), sz, sz);
    }
    // fallende Blätter / Blüten
    const kind = this.mood.season === 'herbst' ? 'laub' : this.mood.season === 'fruehling' ? 'bluete' : this.mood.season === 'sommer' ? 'blatt' : null;
    const rate = kind === 'laub' ? 0.9 : kind === 'bluete' ? 0.6 : kind === 'blatt' ? 0.12 : 0;
    if (Math.random() < rate * dt * 4) { const [tx, ty, ts] = TREES[Math.floor(Math.random() * TREES.length)]; this.particles.push({ x: tx + (Math.random() - 0.5) * ts * 0.9, y: ty - ts * (0.5 + Math.random() * 0.4), vy: 4 + Math.random() * 4, ph: Math.random() * 6, life: 0, ground: ty + Math.random() * 6, col: kind === 'laub' ? (Math.random() < 0.5 ? '#d9743a' : '#e8a24a') : kind === 'bluete' ? '#f3c3cc' : '#7fa652' }); }
    this.particles = this.particles.filter((p) => p.life < 14);
    for (const p of this.particles) {
      p.life += dt;
      if (p.y < p.ground) { p.y += p.vy * dt; p.x += (Math.sin(t / 900 + p.ph) * 6 + 3 * wind) * dt; }
      c.globalAlpha = p.life > 11 ? Math.max(0, (14 - p.life) / 3) : 1; c.fillStyle = p.col; c.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); c.globalAlpha = 1;
    }
    // Vögel ab und zu
    if (!this.birds && t > this.nextBirds && !night && this.weather.kind !== 'regen') { this.birds = { t0: t, y: 110 + Math.random() * 120, n: 3 + Math.floor(Math.random() * 4), dir: Math.random() < 0.5 ? 1 : -1, dur: 32000 + Math.random() * 14000 }; }
    if (this.birds) {
      const b = this.birds, ph = (t - b.t0) / b.dur;
      if (ph > 1) { this.birds = null; this.nextBirds = t + 40000 + Math.random() * 80000; }
      else for (let i = 0; i < b.n; i++) {
        const x = b.dir > 0 ? -30 + ph * (W + 60) - i * 9 : W + 30 - ph * (W + 60) + i * 9, y = b.y + (i % 2) * 5 + Math.sin(ph * 14 + i) * 2, f = Math.floor(t / 420 + i) % 2;
        c.fillStyle = 'rgba(35,35,48,.75)'; c.fillRect(x | 0, y | 0, 1, 1); c.fillRect((x - 1) | 0, (y - f) | 0, 1, 1); c.fillRect((x + 1) | 0, (y - f) | 0, 1, 1); c.fillRect((x - 2) | 0, (y - 1 + f) | 0, 1, 1); c.fillRect((x + 2) | 0, (y - 1 + f) | 0, 1, 1);
      }
    }
  }
  drawSails(c, [hx, hy, len], t) {
    const wind = this.weather.kind === 'regen' ? 1.8 : this.weather.kind === 'klar' ? 0.8 : 1.2, a0 = (t / 5200) * wind;
    const tone = (hx) => { const m = CORE.mul(CORE.hex(hx), CORE.add(CORE.AMB, CORE.sc(CORE.LIGHT, 0.75))); return `rgb(${Math.min(255, m[0] * 255) | 0},${Math.min(255, m[1] * 255) | 0},${Math.min(255, m[2] * 255) | 0})`; };
    const C1 = tone('#4a3424'), C2 = tone('#6b5038'), C3 = tone('#d8d0bc'), C4 = tone('#ece6d6');
    for (let b = 0; b < 4; b++) {
      const a = a0 + b * Math.PI / 2, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
      for (let k = 2; k <= len; k++) {
        const x = hx + dx * k, y = hy + dy * k * 0.9;
        c.fillStyle = C1; c.fillRect(Math.round(x), Math.round(y), 1, 1);
        if (k > len * 0.3) for (let w = 1; w <= 4; w++) { c.fillStyle = (k + w) % 5 === 0 ? C2 : (w > 2 ? C3 : C4); c.fillRect(Math.round(x + px * w), Math.round(y + py * w * 0.9), 1, 1); }
      }
    }
  }
  drawGlow(t) {
    const c = this.cv.glow.getContext('2d'), S2 = 2; c.clearRect(0, 0, W * 2, H * 2);
    const glow = (x, y, r, col, a) => { const g = c.createRadialGradient(x * S2, y * S2, 0, x * S2, y * S2, r * S2); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect((x - r) * S2, (y - r) * S2, r * 2 * S2, r * 2 * S2); };
    const T = CORE.TIMES[this.mood.time], [sx, sy] = T.sun.map((v) => v * CORE.K);
    const wf = 1 - ({ klar: 0, wolkig: 0.5, regen: 0.85, nebel: 0.6, schnee: 0.6 }[this.weather.kind] || 0) * this.weather.mix;
    if (T.body === 'sun') { glow(sx, sy, 230, this.mood.time === 'abend' ? '255,190,130' : '255,240,210', (this.mood.time === 'mittag' ? 0.22 : 0.42) * wf);
      // Staub im Licht
      for (let i = 0; i < 26; i++) { const ph = ((t / 16000) + i / 26) % 1; const x = 260 + ((i * 53) % 520) - ph * 40, y = 220 + ((i * 97) % 250) - ph * 25; c.fillStyle = `rgba(255,240,200,${(0.4 * wf * Math.sin(ph * Math.PI)).toFixed(2)})`; c.fillRect(x * S2, y * S2, S2, S2); }
    } else glow(sx, sy, 80, '190,205,255', 0.35 * wf);
    if (this.mood.time === 'nacht' || this.mood.time === 'abend') for (const [lx, ly] of LANTERNS) glow(lx + 2, ly - 12, 16, '255,200,120', (this.mood.time === 'nacht' ? 0.6 : 0.3) + Math.sin(t / 700 + lx) * 0.04);
    if (this.mood.time === 'nacht' || this.mood.time === 'abend') for (const s of this.sprites) { for (const w of s.info.windows) glow(w[0], w[1], 12, '255,190,100', this.mood.time === 'nacht' ? 0.55 : 0.25); }
    for (const s of this.sprites) if (s.info.forge) glow(s.info.forge[0], s.info.forge[1], 14, '255,140,60', (this.mood.time === 'nacht' ? 0.7 : 0.35) + Math.sin(t / 380) * 0.08);
    if (this.mood.time === 'nacht' && this.mood.season !== 'winter') for (let i = 0; i < 16; i++) { const ph = ((t / 9000) + i / 16) % 1, a = Math.sin(ph * Math.PI); c.fillStyle = `rgba(210,255,150,${(a * 0.9).toFixed(2)})`; c.fillRect((300 + ((i * 71) % 420) + Math.sin(ph * 6 + i) * 6) * S2, (420 + ((i * 37) % 90) - a * 8) * S2, S2, S2); }
  }
  drawHeroFx(t) {
    // ruhiges Atmen: 6,4 s pro Atemzug (2,6 s ein, Rest aus)
    const cyc = 6400, ph = (t % cyc) / cyc, frame = ph > 0.08 && ph < 0.45 ? 1 : 0;
    if (this.poseDay && this.poseDay !== new Date().toDateString() && this.pal) { setMood(this.mood.time, this.mood.season); this.makeHeroFrames(); this.drawHero(frame, true); }
    this.drawHero(frame);
    const c = this.cv.heroFx.getContext('2d'); c.clearRect(0, 0, HERO_W, HERO_H);
    if (!this.heroFrames) return;
    const F = this.heroFrames[frame];
    if (F.pipe) {
      // Pfeife: Glut, dünner Rauchfaden, alle ~3 Atemzüge ein Zug mit Rauchwolke
      const [px, py] = F.pipe, breath = Math.floor(t / cyc), puff = breath % 3 === 0, inhale = puff && ph > 0.08 && ph < 0.45;
      c.fillStyle = inhale ? 'rgba(255,170,80,.95)' : 'rgba(255,120,50,.7)'; c.fillRect(Math.round(px), Math.round(py), 1, 1);
      for (let i = 0; i < 6; i++) { const q = ((t / 4200) + i / 6) % 1; c.fillStyle = `rgba(232,230,226,${(0.45 * (1 - q)).toFixed(2)})`; c.fillRect(Math.round(px + q * 6 + Math.sin(q * 5 + i) * 1.2), Math.round(py - 2 - q * 22), 1, 1); }
      if (puff && ph > 0.5) { const q = (ph - 0.5) / 0.5; for (let i = 0; i < 9; i++) { const k = q * (0.6 + i * 0.05); c.fillStyle = `rgba(236,234,230,${(0.6 * (1 - q)).toFixed(2)})`; const sz = k > 0.3 ? 2 : 1; c.fillRect(Math.round(px - 4 + k * 16 + Math.sin(i * 2 + k * 4) * 2), Math.round(py - 4 - k * 18 - i * 0.6), sz, sz); } }
    }
    if (F.fire) {
      // Lagerfeuer: Glut, flackernde Flammen, Funken, Rauch und warmes Licht
      const [fx, fy] = F.fire, night = this.mood.time === 'nacht' || this.mood.time === 'abend';
      const g = c.createRadialGradient(fx, fy - 6, 1, fx, fy - 6, night ? 60 : 34); g.addColorStop(0, `rgba(255,170,80,${night ? 0.32 : 0.16})`); g.addColorStop(1, 'rgba(255,140,60,0)'); c.fillStyle = g; c.fillRect(fx - 70, fy - 70, 140, 100);
      const cols = ['#fff2b0', '#ffd060', '#ff9a30', '#e05a20'];
      for (let i = 0; i < 26; i++) {
        const lane = (i % 7) - 3, life = ((t / (380 + (i % 5) * 70)) + i * 0.37) % 1, hgt = (1 - Math.abs(lane) / 4) * 15;
        const x = fx + lane * 1.6 + Math.sin(t / 120 + i) * (1 + life * 1.5), y = fy - 2 - life * hgt;
        c.fillStyle = cols[Math.min(3, Math.floor(life * 4 + Math.abs(lane) * 0.3))]; c.globalAlpha = 1 - life * 0.6; c.fillRect(Math.round(x), Math.round(y), life < 0.4 ? 2 : 1, life < 0.5 ? 2 : 1);
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 5; i++) { const q = ((t / 1700) + i / 5) % 1; c.fillStyle = `rgba(255,${200 - q * 80 | 0},90,${(1 - q).toFixed(2)})`; c.fillRect(Math.round(fx + Math.sin(i * 3 + q * 6) * 5), Math.round(fy - 10 - q * 34), 1, 1); }
      for (let i = 0; i < 7; i++) { const q = ((t / 5200) + i / 7) % 1; c.fillStyle = `rgba(200,200,205,${(0.35 * (1 - q)).toFixed(2)})`; c.fillRect(Math.round(fx + q * 10 + Math.sin(q * 6 + i) * 2), Math.round(fy - 16 - q * 40), q > 0.4 ? 2 : 1, q > 0.4 ? 2 : 1); }
    }
  }
}

// Schwarzes Brett am Dorfplatz (klickbar: Neuigkeiten oder Quests)
function zeichneBrett(c) {
  const s = depthScale(PLAZA.y), x0 = Math.round(PLAZA.x + 44 * s), y1 = Math.round(PLAZA.y + 4 * s);
  const w = Math.round(22 * s), h = Math.round(15 * s), post = Math.round(13 * s), x = x0, y = y1 - post - h;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - 1, y1 - 1, w + 4, 3);
  c.fillStyle = '#3a2618'; c.fillRect(x + 2, y + h - 2, 3, post + 2); c.fillRect(x + w - 5, y + h - 2, 3, post + 2);
  c.fillStyle = '#2a1a10'; c.fillRect(x - 1, y - 1, w + 2, h + 2);
  c.fillStyle = '#6b4a2e'; c.fillRect(x, y, w, h);
  c.fillStyle = '#5a3c24'; for (let i = 3; i < h; i += 4) c.fillRect(x, y + i, w, 1);
  c.fillStyle = '#3a2618'; c.fillRect(x - 2, y - 3, w + 4, 2);
  const zet = [[2, 2, 6, 6, '#efe3c2'], [9, 3, 5, 7, '#e6d6ae'], [15, 2, 5, 5, '#f2e8cc'], [4, 9, 7, 4, '#e9dcb8'], [13, 8, 6, 5, '#efe3c2']];
  for (const [zx, zy, zw, zh, col] of zet) { c.fillStyle = col; c.fillRect(x + Math.round(zx * s), y + Math.round(zy * s), Math.max(2, Math.round(zw * s)), Math.max(2, Math.round(zh * s))); c.fillStyle = '#b04a32'; c.fillRect(x + Math.round((zx + zw / 2) * s), y + Math.round(zy * s), 1, 1); }
  return { x, y: y - 3, w, h: h + post + 3 };
}
