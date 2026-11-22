// Zusätze an Gebäuden, die Bewohner im Auftrag des Spielers bauen (Tor, Zaun, Bank, Laterne …).
// Werden direkt nach dem jeweiligen Gebäude in die Dorf-Ebene gezeichnet und im Tageslicht eingefärbt.
// status 'bau' = Baustelle (halb fertig, Bretterstapel), 'fertig' = steht.
import * as CORE from './core.js?v=1';

const tone = (hx, k = 0.75) => { const m = CORE.mul(CORE.hex(hx), CORE.add(CORE.AMB, CORE.sc(CORE.LIGHT, k))); return `rgb(${Math.min(255, m[0] * 255) | 0},${Math.min(255, m[1] * 255) | 0},${Math.min(255, m[2] * 255) | 0})`; };

export const EXTRA_NAMES = { tor: 'beschlagenes Tor', zaun: 'Zaun', vogelscheuche: 'Vogelscheuche', bank: 'Holzbank', steinbank: 'Steinbank', blumen: 'Blumenkästen', laterne: 'Laterne', geweih: 'Hirschgeweih', fahne: 'Fahne', holzstapel: 'Brennholzstapel' };

export function drawExtra(c, sprite, plot, zusatz, status) {
  const s = plot.s, x = plot.x, y = plot.y, R = (xx, yy, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(xx), Math.round(yy), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const bau = status === 'bau';
  c.save(); if (bau) c.globalAlpha = 0.5;
  const WOOD = tone('#8a6440'), WOOD_D = tone('#5a3e28'), WOOD_L = tone('#a37a50'), IRON = tone('#3a3d44'), STONE = tone('#8a8e96'), STONE_D = tone('#5f6470');
  switch (zusatz) {
    case 'tor': { // beschlagenes Doppeltor über dem alten Scheunentor
      const dw = Math.round(9 * s), dh = Math.round(15 * s), top = y - 3 - dh;
      R(x - dw, top, dw * 2 + 1, dh, WOOD);
      for (let i = -dw; i <= dw; i += 3) R(x + i, top, 1, dh, WOOD_D);
      R(x, top, 1, dh, IRON);
      for (const k of [3, Math.round(dh / 2), dh - 3]) R(x - dw, top + k, dw * 2 + 1, 1, IRON);
      R(x - 3, top + Math.round(dh / 2) + 2, 1, 2, tone('#c8a050')); R(x + 3, top + Math.round(dh / 2) + 2, 1, 2, tone('#c8a050'));
      break;
    }
    case 'zaun': { // Zaun um das Feld
      const x0 = sprite.x - 2, x1 = sprite.x + sprite.w + 1, y0 = sprite.y - 1, y1 = sprite.y + sprite.h + 1;
      for (let xx = x0; xx <= x1; xx += 6) { R(xx, y1 - 5, 1, 6, WOOD_D); }
      R(x0, y1 - 4, x1 - x0, 1, WOOD_L); R(x0, y1 - 2, x1 - x0, 1, WOOD);
      for (let yy = y0; yy <= y1; yy += 4) { R(x0, yy - 3, 1, 4, WOOD_D); R(x1, yy - 3, 1, 4, WOOD_D); }
      R(x0, y0 - 3, x1 - x0, 1, WOOD_D);
      break;
    }
    case 'vogelscheuche': {
      const cx = sprite.x + Math.round(sprite.w * 0.62), by = sprite.y + Math.round(sprite.h * 0.62);
      R(cx, by - 13, 1, 13, WOOD_D); R(cx - 5, by - 10, 11, 1, WOOD_D);
      R(cx - 2, by - 10, 5, 5, tone('#7a5a8a')); R(cx - 1, by - 14, 3, 3, tone('#d8c890'));
      R(cx - 3, by - 15, 7, 1, tone('#4a3424')); R(cx - 2, by - 17, 5, 2, tone('#4a3424'));
      R(cx - 5, by - 9, 1, 2, tone('#d8b860')); R(cx + 5, by - 9, 1, 2, tone('#d8b860'));
      break;
    }
    case 'bank': case 'steinbank': {
      const bx = x - Math.round(27 * s), by = y + 3, top = zusatz === 'bank' ? WOOD_L : STONE, side = zusatz === 'bank' ? WOOD_D : STONE_D;
      R(bx, by - 3, 11, 2, top); R(bx, by - 1, 11, 1, side); R(bx + 1, by, 1, 2, side); R(bx + 9, by, 1, 2, side);
      if (zusatz === 'bank') R(bx, by - 6, 11, 1, WOOD), R(bx, by - 6, 1, 3, WOOD_D), R(bx + 10, by - 6, 1, 3, WOOD_D);
      break;
    }
    case 'blumen': { // Blumenkasten unter dem Fenster
      const bx = x + Math.round(9 * s), by = y - Math.round(12 * s) + 2, w = Math.round(6 * s);
      R(bx, by, w, 2, WOOD_D);
      const cols = ['#d84a4a', '#f0d040', '#e88ad8', '#ffffff'];
      for (let i = 0; i < w; i++) { R(bx + i, by - 1, 1, 1, tone('#4a7a3a')); if (i % 2 === 0) R(bx + i, by - 2, 1, 1, tone(cols[i % cols.length])); }
      break;
    }
    case 'laterne': {
      const lx = x - Math.round(18 * s), ly = y + 2;
      R(lx, ly - 15, 1, 15, IRON); R(lx, ly - 15, 4, 1, IRON); R(lx + 2, ly - 14, 3, 4, tone('#3a2a1a'));
      R(lx + 3, ly - 13, 1, 2, CORE.T.body === 'moon' ? '#ffcf74' : tone('#d8c070'));
      sprite.info.windows.push([lx + 3, ly - 12]);
      break;
    }
    case 'geweih': { // über der Tür
      const gy = y - 3 - Math.round(11 * s) - 3, B = tone('#e6dcc4');
      R(x - 1, gy, 3, 2, tone('#6b4b2e'));
      for (let k = 0; k < 5; k++) { R(x - 2 - k, gy - k, 1, 1, B); R(x + 2 + k, gy - k, 1, 1, B); }
      R(x - 4, gy - 4, 1, 2, B); R(x + 4, gy - 4, 1, 2, B); R(x - 7, gy - 6, 1, 2, B); R(x + 7, gy - 6, 1, 2, B);
      break;
    }
    case 'fahne': { // auf dem Wachturm
      const peak = y - Math.round(44 * s) - 4 - Math.round(9 * s) - Math.round(22 * s);
      R(x, peak - 11, 1, 12, WOOD_D);
      const wave = [0, 1, 1, 0, 0, 1, 1];
      for (let i = 0; i < 7; i++) R(x + 1 + i, peak - 11 + wave[i], 1, 5, tone(i % 3 === 2 ? '#8a2a22' : '#b83a2a'));
      break;
    }
    case 'holzstapel': {
      const hx = x - Math.round(24 * s), hy = y + 2;
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) { const cx = hx + i * 3 + row * 1.5, cy = hy - row * 3; R(cx, cy - 2, 3, 3, WOOD); R(cx + 1, cy - 1, 1, 1, WOOD_L); }
      break;
    }
  }
  c.restore();
  if (bau) { // Baustelle: Bretterstapel daneben
    const px = x - Math.round(16 * s), py = y + 6;
    for (let k = 0; k < 3; k++) R(px - k, py - k * 2, 10, 2, k % 2 ? WOOD_L : WOOD);
  }
}

// Baustelle: Gerüst aus Stangen und Laufbrettern, Bretterstapel davor. f = wie weit der Bau ist (0..1).
export function drawScaffold(c, sprite, plot, art, f) {
  const s = plot.s, R = (xx, yy, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(xx), Math.round(yy), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const POLE = tone('#6b4a2e'), PLANK = tone('#a37a50'), PLANK_D = tone('#7a5634'), ROPE = tone('#c8b08a');
  const x0 = sprite.x + 2, x1 = sprite.x + sprite.w - 3, bottom = sprite.y + sprite.h - 2;
  const top = art === 'ausbau' ? sprite.y + sprite.h * 0.15 : sprite.y + sprite.h * (1 - Math.max(0.25, f)) - 4 * s;
  const n = Math.max(2, Math.round((x1 - x0) / (12 * s)));
  for (let i = 0; i <= n; i++) { const xx = x0 + ((x1 - x0) * i) / n; R(xx, top, 1, bottom - top, POLE); }
  for (let yy = bottom - 8 * s; yy > top + 2; yy -= 9 * s) { R(x0 - 1, yy, x1 - x0 + 3, 2, PLANK); R(x0 - 1, yy + 2, x1 - x0 + 3, 1, PLANK_D); }
  // Diagonale Streben und ein Seil
  for (let k = 0; k < (bottom - top) * 0.8; k += 2) R(x0 + (k * (x1 - x0)) / ((bottom - top) * 1.6), bottom - k, 1, 1, POLE);
  R(x1 - 1, top - 3 * s, 1, 3 * s, ROPE);
  // Bretterstapel neben der Baustelle
  const sx = sprite.x + sprite.w + 2, sy = plot.y + 2;
  for (let k = 0; k < 3; k++) { R(sx, sy - k * 2, 12 * s, 2, k % 2 ? PLANK : PLANK_D); }
}
