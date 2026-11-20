// Stil 1: Pixelart. Alles Pixel für Pixel im Code, Licht als Ebene darüber.
const W = 320, H = 180;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// Feste Palette: alle Bausteine nutzen dieselben Farben
const P = {
  sky1: '#7fb0c9', sky2: '#a9cbd3', sky3: '#d9dfc8', sky4: '#f0e2b8',
  mtnFar: '#8ea6ad', mtnMid: '#6c8f86', forestFar: '#3f6a4c',
  grass: '#6f9e4a', grassD: '#5a8a3e', grassL: '#86b45a', grassLL: '#a3c96d',
  dirt: '#a88a5c', dirtD: '#8c6f45', dirtL: '#c2a574',
  leafD: '#244a2e', leaf: '#33603a', leafM: '#447a45', leafL: '#5f9650', trunk: '#5a3e28', trunkD: '#3e2a1a',
  wall: '#8a6440', wallD: '#6e4e31', wallL: '#a37a50', roof: '#c2a35e', roofD: '#9c7f42', roofL: '#dcc07a',
  door: '#3e2a1a', window: '#ffd27a', outline: '#1e1a14',
  soil: '#6b4a2f', soilD: '#54391f', sprout: '#7fbf4f',
  rope: '#d8c9a0', stake: '#7a5a38', flower: '#f3efe0', flowerY: '#f0d36a',
};

const CHAR_PAL = {
  o: '#1e1a14', h: '#3b2a1e', H: '#5e4430', s: '#e8b98f', S: '#c8926a', e: '#2a1a10',
  c: '#4f6b3a', C: '#3a5029', b: '#6b4a2f', p: '#6d5a45', P: '#54443a', f: '#3a2a1e', w: '#7a4e2a',
};
// Charakter sitzend, Blick nach rechts, Pfeife im Mund (16×20)
const CHAR = [
  '.....oooooo.....',
  '....ohhhhhHo....',
  '...ohhhhhhHHo...',
  '...ohhhhhssso...',
  '...ohhhhsseso.oo',
  '...ohhhhsssso.ww',
  '....ohhSssswwwww',
  '.....ohSSso.....',
  '....occccccco...',
  '...occcccCccco..',
  '...occccCCcccso.',
  '...occccCCccso..',
  '...obbbbbbbbo...',
  '...oppppppppppo.',
  '...oPPPPpppppppo',
  '....oooooooppPo.',
  '..........oppPo.',
  '..........oppPo.',
  '.........offffo.',
  '.........oooooo.',
];
const CHICKEN_PAL = { r: '#c8452f', o: '#1e1a14', w: '#f4f0e6', y: '#e0b040' };
const CHICKEN = ['...rr.', '..owwo', 'owwwwo', '.owwo.', '..yy..'];

export function drawPixelScene(base, light, t = 0) {
  const ctx = base.getContext('2d');
  base.width = W; base.height = H;
  const r = rng(5);
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); };
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };
  const sprite = (grid, pal, x0, y0, flip = false) => {
    grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.' && pal[ch]) px(flip ? x0 + row.length - 1 - x : x0 + x, y0 + y, pal[ch]);
    }));
  };

  // Himmel mit geordnetem Dithering
  const skyCols = [P.sky1, P.sky2, P.sky3, P.sky4];
  for (let y = 0; y < 80; y++) {
    const f = (y / 80) * (skyCols.length - 1);
    const i = Math.floor(f), frac = f - i;
    for (let x = 0; x < W; x++) {
      const c = frac * 16 > BAYER[y % 4][x % 4] ? skyCols[Math.min(i + 1, 3)] : skyCols[i];
      px(x, y, c);
    }
  }
  // Wolken
  const cloud = (cx, cy, w) => {
    for (let x = -w; x <= w; x++) {
      const hgt = Math.round(Math.sqrt(1 - (x / w) ** 2) * 4);
      rect(cx + x, cy - hgt, 1, hgt + 2, '#f6f1e2');
      if (hgt > 1) px(cx + x, cy - hgt, '#ffffff');
    }
  };
  cloud(60, 22, 22); cloud(80, 20, 12); cloud(230, 14, 28);

  // Berge (zwei Ebenen)
  for (let x = 0; x < W; x++) {
    const h1 = 52 + Math.sin(x * 0.03) * 8 + Math.sin(x * 0.011 + 1) * 10;
    rect(x, h1, 1, 90 - h1, P.mtnFar);
    const h2 = 64 + Math.sin(x * 0.045 + 2) * 6 + Math.sin(x * 0.017) * 7;
    rect(x, h2, 1, 90 - h2, P.mtnMid);
  }
  // ferner Waldrand
  for (let x = 0; x < W; x++) {
    const h = 76 + Math.round(Math.sin(x * 0.4) * 1.5 + Math.sin(x * 0.13) * 2 + r() * 1.5);
    rect(x, h, 1, 96 - h, P.forestFar);
  }

  // Wiese mit Sprenkeln
  rect(0, 90, W, H - 90, P.grass);
  for (let i = 0; i < 1400; i++) {
    const x = r() * W, y = 90 + r() * (H - 90);
    px(x, y, r() < 0.5 ? P.grassD : P.grassL);
  }
  for (let i = 0; i < 90; i++) { // Grasbüschel
    const x = r() * W, y = 100 + r() * 78;
    px(x, y, P.grassLL); px(x + 1, y - 1, P.grassL); px(x - 1, y - 1, P.grassL);
  }
  for (let i = 0; i < 26; i++) px(r() * W, 105 + r() * 70, r() < 0.7 ? P.flower : P.flowerY);

  // Weg
  for (let y = 120; y < H; y++) {
    const cx = 168 + Math.sin(y * 0.06) * 14 + (y - 120) * 0.55;
    const w = 8 + (y - 120) * 0.12;
    for (let x = Math.floor(cx - w); x < cx + w; x++) {
      const edge = x < cx - w + 1.5 || x > cx + w - 1.5;
      px(x, y, edge ? P.dirtD : (r() < 0.12 ? P.dirtL : P.dirt));
    }
  }

  // Bäume
  const tree = (cx, by, size) => {
    rect(cx - 1, by - size, 3, size, P.trunk); rect(cx + 1, by - size, 1, size, P.trunkD);
    const blob = (x0, y0, rad) => {
      for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
        const d = Math.hypot(x, y);
        if (d > rad + 0.3) continue;
        const lightness = (x - y) / (rad * 2); // Licht von oben rechts
        let c = P.leaf;
        if (d > rad - 0.8) c = P.leafD;
        else if (lightness > 0.35) c = P.leafL;
        else if (lightness > 0.05) c = P.leafM;
        else if (lightness < -0.45) c = P.leafD;
        px(x0 + x, y0 + y, c);
      }
    };
    blob(cx - size * 0.35, by - size - 2, Math.round(size * 0.45));
    blob(cx + size * 0.35, by - size - 1, Math.round(size * 0.42));
    blob(cx, by - size * 1.45, Math.round(size * 0.5));
  };
  // Schatten unter Bäumen
  const shadow = (cx, cy, w) => { for (let x = -w; x <= w; x++) { const h = Math.round(Math.sqrt(1 - (x / w) ** 2) * 2); rect(cx + x, cy - h, 1, h * 2 + 1, P.grassD); } };
  shadow(28, 118, 16); shadow(292, 126, 18); shadow(250, 104, 10);
  tree(250, 104, 12); tree(28, 118, 18); tree(292, 126, 20);

  // Feld (links)
  for (let row = 0; row < 4; row++) {
    const y = 132 + row * 6;
    rect(40, y, 52, 4, P.soil); rect(40, y + 3, 52, 1, P.soilD);
    for (let x = 43; x < 90; x += 5) { px(x, y, P.sprout); px(x, y - 1, P.sprout); px(x + 1, y - 1, P.grassLL); }
  }

  // Bauplatz mit Pflöcken und Seil
  const plot = [[200, 104], [246, 104], [252, 124], [194, 124]];
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = plot[i], [x2, y2] = plot[(i + 1) % 4];
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let s = 0; s <= n; s += 2) px(x1 + ((x2 - x1) * s) / n, y1 + ((y2 - y1) * s) / n - 3, P.rope);
  }
  plot.forEach(([x, y]) => { rect(x, y - 5, 2, 6, P.stake); px(x, y - 5, P.dirtL); });

  // Hütte
  const hx = 118, hy = 120; // Mitte unten
  rect(hx - 22, hy, 46, 2, P.grassD); // Schatten
  for (let x = -18; x < 18; x++) rect(hx + x, hy - 16, 1, 16, x % 4 === 0 ? P.wallD : (x % 4 === 1 ? P.wallL : P.wall));
  rect(hx - 18, hy - 16, 36, 1, P.wallD);
  rect(hx - 4, hy - 11, 8, 11, P.door); px(hx + 2, hy - 6, P.dirtL);
  rect(hx + 9, hy - 12, 5, 4, P.window); rect(hx + 9, hy - 10, 5, 1, '#d8a850');
  for (let y = 0; y < 18; y++) { // Strohdach
    const half = 24 - y * 1.25;
    for (let x = -half; x < half; x++) {
      const c = (y % 3 === 0) ? P.roofD : (x > half - 3 ? P.roofL : (x < -half + 2 ? P.roofD : P.roof));
      px(hx + x, hy - 16 - y + (y === 0 ? 1 : 0), c);
    }
  }
  for (let x = -24; x < 24; x += 3) px(hx + x, hy - 15, P.roofD);

  // Baumstamm + Charakter
  const lx = 196, ly = 142;
  rect(lx, ly, 22, 6, P.trunk); rect(lx, ly + 4, 22, 2, P.trunkD); rect(lx, ly, 22, 1, P.wallL);
  rect(lx + 21, ly, 3, 6, P.dirtL); px(lx + 22, ly + 2, P.dirtD);
  rect(lx - 2, ly + 6, 28, 1, P.grassD);
  sprite(CHAR, CHAR_PAL, lx + 1, ly - 13);

  // Pfeifenrauch (animiert)
  for (let i = 0; i < 6; i++) {
    const phase = ((t / 900) + i / 6) % 1;
    const sx = lx + 17 + Math.sin(phase * 6 + i) * 2 + phase * 4;
    const sy = ly - 9 - phase * 22;
    if (phase < 0.9) { px(sx, sy, '#e9e4d8'); if (phase > 0.3) px(sx + 1, sy, '#d6d0c2'); }
  }

  // Hühner
  sprite(CHICKEN, CHICKEN_PAL, 100 + Math.round(Math.sin(t / 700) * 2), 150);
  sprite(CHICKEN, CHICKEN_PAL, 76, 156, true);

  drawLight(light, t);
}

// Lichtebene: weiches Licht in höherer Auflösung über den Pixeln
function drawLight(canvas, t) {
  const c = canvas.getContext('2d');
  const w = canvas.width = 1280, h = canvas.height = 720;
  c.clearRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
  let g = c.createRadialGradient(w * 0.82, h * 0.05, 10, w * 0.82, h * 0.05, w * 0.7);
  g.addColorStop(0, 'rgba(255,236,180,0.55)'); g.addColorStop(1, 'rgba(255,236,180,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // Lichtstrahlen
  c.fillStyle = 'rgba(255,245,210,0.12)';
  [[860, 980, 520, 300], [1020, 1080, 820, 700]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, 0); c.lineTo(b, 0); c.lineTo(d, h); c.lineTo(e, h); c.fill(); });
  // warmes Glühen an Fenster und Pfeife
  const glow = (x, y, rad, a) => { const gg = c.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, `rgba(255,200,110,${a})`); gg.addColorStop(1, 'rgba(255,200,110,0)'); c.fillStyle = gg; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
  glow(127 * 4, 110 * 4, 60, 0.35);
  glow(213 * 4, 129 * 4, 22, 0.45 + Math.sin(t / 180) * 0.15);
  // Vignette
  g = c.createRadialGradient(w / 2, h * 0.55, h * 0.35, w / 2, h * 0.55, h * 0.95);
  g.addColorStop(0, 'rgba(20,16,8,0)'); g.addColorStop(1, 'rgba(20,16,8,0.45)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
