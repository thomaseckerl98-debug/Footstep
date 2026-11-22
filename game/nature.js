// Ökosystem: Tiere mit eigenem Verhalten, Pfützen, Fußspuren im Schnee, Wasser in Bewegung.
// Alles reagiert aufeinander: Tiere fliehen vor Bewohnern, Krähen gehen aufs Feld, Wetter verändert Wege.
import * as CORE from './core.js?v=1';
import { PLAZA, STREAM, WATERFALL, streamWidth } from './world.js?v=5';
import { meadowY } from './life.js?v=5';

const R = Math.random;
const near = (a, list, d) => list.some((p) => Math.hypot(p.x - a.x, (p.y - a.y) * 1.4) < d);
function tone(hx) { const m = CORE.mul(CORE.hex(hx), CORE.add(CORE.AMB, CORE.sc(CORE.LIGHT, 0.75))); return `rgb(${Math.min(255, m[0] * 255) | 0},${Math.min(255, m[1] * 255) | 0},${Math.min(255, m[2] * 255) | 0})`; }
// kleine Pixel-Vorlagen (Blick nach rechts), Zeichen -> Farbe
const SPR = {
  reh: [['....h.', '...hhe', '.bbbh.', 'bbbbb.', 'l.l.l.'], ['......', '......', '.bbbb.', 'bbbbbh', 'l.l.lh']], // Kopf oben / grasend
  fuchs: [['.....e', 'tbbbbh', 't.l.l.'], ['.....e', 'tbbbbh', '.l.l..']],
  hase: [['..e.', '.bbh', 'bbb.'], ['.e..', 'bbh.', 'b.b.']],
  kraehe: [['.kk', 'kkk'], ['k.k', '.kk']],
};
const COL = { reh: { b: '#8a5a32', h: '#7a4e2a', e: '#3a2618', l: '#5a3a22' }, fuchs: { b: '#c8642a', h: '#d8743a', e: '#2a1a10', t: '#f0e8dc', l: '#3a2418' }, hase: { b: '#9a8a72', h: '#8a7a62', e: '#3a3028' }, kraehe: { k: '#1e1e26' } };

export class Nature {
  constructor() { this.animals = []; this.puddle = 0; this.prints = []; this.next = { reh: 0, fuchs: 0, hase: 0, kraehe: 0, falter: 0 }; this.lastPrint = new Map(); }
  spawn(kind, x, y, extra = {}) { this.animals.push({ kind, x, y, dir: R() < 0.5 ? 1 : -1, state: 'idle', t: 0, life: 120 + R() * 120, tx: x, ty: y, a: 0, ...extra }); }
  update(dt, t, { hour, weather, season, people, sprites }) {
    const day = hour >= 7 && hour < 18, dusk = (hour >= 5 && hour < 8.5) || (hour >= 17.5 && hour < 21.5), night = hour >= 21 || hour < 5;
    const count = (k) => this.animals.filter((a) => a.kind === k).length, rain = weather === 'regen';
    // Rehe in der Dämmerung am Waldrand
    if (dusk && !rain && count('reh') < 3 && t > this.next.reh) { const x = 260 + R() * 460; this.spawn('reh', x, meadowY(x) + 4, { a: 0 }); this.next.reh = t + 25000 + R() * 40000; }
    // Fuchs nachts
    if (night && count('fuchs') < 1 && t > this.next.fuchs) { const west = R() < 0.5; this.spawn('fuchs', west ? 120 : 890, 470 + R() * 50, { dir: west ? 1 : -1, tx: west ? 890 : 120 }); this.next.fuchs = t + 60000 + R() * 90000; }
    // Hasen tagsüber
    if (day && !rain && season !== 'winter' && count('hase') < 2 && t > this.next.hase) { const x = 220 + R() * 560; this.spawn('hase', x, meadowY(x) + 12 + R() * 30); this.next.hase = t + 20000 + R() * 30000; }
    // Krähen auf dem Feld
    const field = sprites.find((s) => s.type === 'feld');
    if (day && field && !rain && count('kraehe') < 4 && t > this.next.kraehe) { for (let i = 0; i < 2 + Math.floor(R() * 3); i++) { const x = field.x + 4 + R() * (field.w - 8), y = field.y + 3 + R() * (field.h - 5); this.spawn('kraehe', x, y - 60, { tx: x, ty: y, state: 'land', life: 50 + R() * 40 }); } this.next.kraehe = t + 70000 + R() * 60000; }
    // Schmetterlinge im Frühling/Sommer
    if (day && !rain && (season === 'sommer' || season === 'fruehling') && count('falter') < 5 && t > this.next.falter) { this.spawn('falter', 250 + R() * 500, 420 + R() * 100, { col: ['#f4f0e0', '#f0d060', '#e8904a', '#c8d8f0'][Math.floor(R() * 4)], life: 90 }); this.next.falter = t + 8000; }

    for (const a of this.animals) {
      a.t += dt; a.life -= dt;
      const scared = a.kind !== 'falter' && near(a, people, a.kind === 'reh' ? 60 : a.kind === 'kraehe' ? 26 : 40);
      if (a.kind === 'reh') {
        a.a = Math.min(1, a.a + dt * 0.5);
        if (scared && a.state !== 'flee') { a.state = 'flee'; a.dir = R() < 0.5 ? -1 : 1; }
        if (a.state === 'flee' || a.life < 0) { a.x += a.dir * 24 * dt; a.y -= 10 * dt; a.a -= dt * 0.8; a.frame = Math.floor(a.t * 8) % 2; }
        else { if (a.t > 3 + R() * 4) { a.t = 0; a.state = R() < 0.6 ? 'graze' : 'walk'; if (a.state === 'walk') a.dir = R() < 0.5 ? -1 : 1; } if (a.state === 'walk') a.x += a.dir * 3 * dt; a.frame = a.state === 'graze' ? 1 : 0; }
      } else if (a.kind === 'fuchs') {
        if (scared) a.state = 'flee';
        const sp = a.state === 'flee' ? 30 : (Math.floor(a.t / 3) % 3 === 2 ? 0 : 9); a.x += a.dir * sp * dt; a.y += Math.sin(a.t * 0.7) * 2 * dt; a.frame = sp ? Math.floor(a.t * 7) % 2 : 0;
        if (a.x < 100 || a.x > 910) a.life = -1;
      } else if (a.kind === 'hase') {
        if (scared) { a.state = 'flee'; a.dir = Math.sign(a.x - PLAZA.x) || 1; }
        if (a.state === 'flee') { a.x += a.dir * 30 * dt; a.hop = Math.abs(Math.sin(a.t * 12)) * 2; if (a.life > 4) a.life = 4; }
        else if (Math.floor(a.t * 1.3) % 4 === 0) { a.x += a.dir * 8 * dt; a.hop = Math.abs(Math.sin(a.t * 10)) * 1.5; } else a.hop = 0;
        a.frame = a.hop > 0.5 ? 1 : 0;
      } else if (a.kind === 'kraehe') {
        if (scared && a.state !== 'fly') { a.state = 'fly'; a.dir = R() < 0.5 ? -1 : 1; }
        if (a.state === 'land') { a.y += (a.ty - a.y) * Math.min(1, dt * 2); if (Math.abs(a.ty - a.y) < 0.5) a.state = 'peck'; a.frame = Math.floor(a.t * 10) % 2; }
        else if (a.state === 'peck') { a.frame = 0; a.bob = (Math.floor(a.t * 3) % 3 === 0) ? 1 : 0; if (a.life < 0) a.state = 'fly'; }
        else { a.x += a.dir * 30 * dt; a.y -= 22 * dt; a.frame = Math.floor(a.t * 10) % 2; if (a.y < 250) a.life = -99; }
      } else if (a.kind === 'falter') {
        a.x += Math.sin(a.t * 1.3 + a.y) * 8 * dt + (R() - 0.5) * 6 * dt; a.y += Math.cos(a.t * 1.7) * 6 * dt; a.frame = Math.floor(a.t * 9) % 2;
      }
    }
    this.animals = this.animals.filter((a) => a.life > -6 && a.a > -0.5 && !(a.kind === 'reh' && a.a <= 0 && a.state === 'flee'));
    // Pfützen: füllen sich bei Regen, trocknen langsam
    this.puddle = Math.max(0, Math.min(1, this.puddle + (rain ? dt / 50 : -dt / 200)));
    // Fußspuren im Schnee
    if (season === 'winter') for (const p of people) { if (!p.path || !p.path.length) continue; const last = this.lastPrint.get(p) || 0; if (p.dist - last > 3) { this.lastPrint.set(p, p.dist); this.prints.push({ x: p.x + ((Math.floor(p.dist / 3) % 2) ? 1 : -1), y: p.y, t: 0 }); } }
    this.prints = this.prints.filter((f) => (f.t += dt) < 120); if (this.prints.length > 600) this.prints.splice(0, this.prints.length - 600);
  }
  drawGround(c, t) {
    // Pfützen auf Weg und Dorfplatz
    if (this.puddle > 0.02) {
      const spots = [[488, 532, 7], [482, 505, 6], [493, 474, 5], [508, 446, 9], [486, 438, 6], [520, 434, 5], [470, 520, 4]];
      for (const [x, y, rr] of spots) { c.globalAlpha = 0.55 * this.puddle; c.fillStyle = tone('#5a7088'); c.beginPath(); c.ellipse(x, y, rr * this.puddle + 1, (rr * this.puddle + 1) * 0.35, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 0.5 * this.puddle; c.fillStyle = tone('#b8cad8'); c.fillRect(x - 2, Math.round(y - 1), 3, 1); }
      c.globalAlpha = 1;
    }
    for (const f of this.prints) { c.globalAlpha = Math.max(0, 0.45 * (1 - f.t / 120)); c.fillStyle = '#6a7488'; c.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); }
    c.globalAlpha = 1;
    // fließendes Wasser: Glitzer wandert den Bach hinab, Wasserfall rauscht
    const n = STREAM.length - 1;
    for (let k = 0; k < 26; k++) { const u = ((t / 9000) + k / 26) % 1, seg = Math.min(n - 1, Math.floor(u * n)), tt = u * n - seg, [ax, ay] = STREAM[seg], [bx, by] = STREAM[seg + 1], w = streamWidth(u); c.fillStyle = k % 3 ? 'rgba(220,235,245,.55)' : 'rgba(255,255,255,.75)'; c.fillRect(Math.round(ax + (bx - ax) * tt + Math.sin(k * 2.3) * w * 0.3), Math.round(ay + (by - ay) * tt), k % 4 ? 1 : 2, 1); }
    const { x: wx, y0, y1 } = WATERFALL;
    for (let k = 0; k < 14; k++) { const u = ((t / 1600) + k / 14) % 1; c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(wx + ((k % 3) - 1), Math.round(y0 + (y1 - y0) * u), 1, 2); }
  }
  drawAnimals(c, t) {
    for (const a of this.animals.slice().sort((p, q) => p.y - q.y)) {
      if (a.kind === 'falter') { c.fillStyle = a.col; c.fillRect(Math.round(a.x), Math.round(a.y), 1, 1); if (a.frame) { c.fillRect(Math.round(a.x) - 1, Math.round(a.y) - 1, 1, 1); c.fillRect(Math.round(a.x) + 1, Math.round(a.y) - 1, 1, 1); } continue; }
      const grid = SPR[a.kind][a.frame || 0], col = COL[a.kind], w = grid[0].length, h = grid.length;
      const ox = Math.round(a.x - w / 2), oy = Math.round(a.y - h - (a.hop || 0) + (a.bob || 0));
      c.globalAlpha = a.kind === 'reh' ? Math.max(0, a.a) : 1;
      if (a.kind !== 'kraehe' || a.state === 'peck') { c.fillStyle = 'rgba(15,18,28,.22)'; c.fillRect(ox, Math.round(a.y), w, 1); }
      grid.forEach((row, y) => [...row].forEach((ch, x) => { if (!col[ch]) return; c.fillStyle = tone(col[ch]); c.fillRect(a.dir > 0 ? ox + x : ox + w - 1 - x, oy + y, 1, 1); }));
      c.globalAlpha = 1;
    }
  }
}
