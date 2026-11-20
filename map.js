// Weltkarte: 100×100 Felder, gemaltes Gelände + Dörfer aller Spieler.
const SIZE = 100;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Einfaches Wertrauschen für das Gelände (immer gleich, weil fester Startwert)
function noiseField(seed) {
  const r = rng(seed);
  const octave = (cells) => {
    const g = Array.from({ length: cells + 1 }, () => Array.from({ length: cells + 1 }, r));
    return (x, y) => {
      const fx = (x / SIZE) * cells, fy = (y / SIZE) * cells;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const s = (t) => t * t * (3 - 2 * t);
      const a = g[y0][x0] + (g[y0][x0 + 1] - g[y0][x0]) * s(tx);
      const b = g[y0 + 1][x0] + (g[y0 + 1][x0 + 1] - g[y0 + 1][x0]) * s(tx);
      return a + (b - a) * s(ty);
    };
  };
  const o1 = octave(5), o2 = octave(11), o3 = octave(23);
  return (x, y) => o1(x, y) * 0.6 + o2(x, y) * 0.3 + o3(x, y) * 0.1;
}

function terrainImage() {
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE);
  const h = noiseField(42), f = noiseField(1337);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const e = h(x, y), w = f(x, y);
      let col;
      if (e < 0.33) col = [61, 127, 143];          // Wasser
      else if (e < 0.37) col = [196, 186, 140];    // Ufer
      else if (e > 0.72) col = [128, 128, 104];    // Berge
      else if (w > 0.55) col = [47, 90, 56];       // Wald
      else col = [122, 163, 86];                   // Wiese
      const i = (y * SIZE + x) * 4;
      const shade = 0.9 + (e % 0.05) * 2;
      img.data[i] = col[0] * shade; img.data[i + 1] = col[1] * shade; img.data[i + 2] = col[2] * shade; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export class WorldMap {
  constructor(canvas, onSelect) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelect = onSelect;
    this.villages = [];
    this.selected = null;
    this.terrain = terrainImage();
    canvas.addEventListener('click', (e) => this.handleClick(e));
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  setData(villages) {
    this.villages = villages || [];
    if (this.selected) {
      this.selected = this.villages.find((v) => v.x === this.selected.x && v.y === this.selected.y) || null;
    }
    this.draw();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.width * dpr);
    this.draw();
  }

  draw() {
    const { ctx, canvas } = this;
    const px = canvas.width;
    if (!px) return;
    const cell = px / SIZE;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.terrain, 0, 0, px, px);

    // feines Raster
    ctx.strokeStyle = 'rgba(20,30,20,0.12)';
    ctx.lineWidth = 1;
    for (let i = 10; i < SIZE; i += 10) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, px); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(px, i * cell); ctx.stroke();
    }

    const rad = Math.max(cell * 0.9, px * 0.012);
    for (const v of this.villages) {
      const cx = (v.x + 0.5) * cell, cy = (v.y + 0.5) * cell;
      if (v.is_me) {
        ctx.fillStyle = 'rgba(255, 214, 120, 0.35)';
        ctx.beginPath(); ctx.arc(cx, cy, rad * 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = v.is_me ? '#e7bf52' : '#efe6cf';
      ctx.strokeStyle = '#1b2a1f';
      ctx.lineWidth = Math.max(1.5, rad * 0.25);
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (this.selected === v) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(2, rad * 0.3);
        ctx.beginPath(); ctx.arc(cx, cy, rad * 1.7, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * SIZE;
    const my = ((e.clientY - rect.top) / rect.height) * SIZE;
    let best = null, bestD = 4; // max. 4 Felder Abstand
    for (const v of this.villages) {
      const d = Math.hypot(v.x + 0.5 - mx, v.y + 0.5 - my);
      if (d < bestD) { best = v; bestD = d; }
    }
    this.selected = best;
    this.draw();
    this.onSelect(best);
  }
}
