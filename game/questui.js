// Quest-Fenster: Szenenbild (Held + Begleiter), Wanderanimation bei Reisen, Wahlmöglichkeiten, Würfelzeilen.
// Gewürfelt und entschieden wird nur auf dem Server (quest_choose); hier wird nur gezeigt.
import { sheetData, SW, SH } from './chars.js?v=3';

const LW = 240, LH = 100, GROUND = 88;
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sheetCanvas = (plan) => { const sh = sheetData(plan), cv = document.createElement('canvas'); cv.width = sh.w; cv.height = sh.h; cv.getContext('2d').putImageData(new ImageData(sh.data, sh.w, sh.h), 0, 0); return cv; };

/* ───────── Hintergründe (einfache Pixel-Formen, schnell genug für jedes Bild) ───────── */
const SKY = { dorf: ['#9cb8c8', '#e8d8b0'], wald: ['#7fa0a8', '#c8d0a8'], mine: ['#8a98a8', '#c8c0a8'], stollen: ['#0c0a0a', '#1a1412'], feuer: ['#0a1020', '#24304a'] };
function grad(c, a, b) { const g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, LW, LH); }
function conifer(c, x, base, h, col) { c.fillStyle = col; for (let i = 0; i < h; i++) { const w = Math.max(1, Math.round((i / h) * h * 0.42)); c.fillRect(Math.round(x - w / 2), base - h + i, w, 1); } }
function treeRow(c, off, seed, base, hMin, hMax, col, gap) {
  const r = rng(seed), list = []; for (let x = 0; x < LW + 400; x += gap) list.push([x + r() * gap * 0.8, hMin + r() * (hMax - hMin)]);
  const span = LW + 400; for (const [x, h] of list) { const xx = ((x - off) % span + span) % span - 40; conifer(c, xx, base, Math.round(h), col); }
}
function hills(c, off, base, amp, col, k) { c.fillStyle = col; for (let x = 0; x < LW; x++) { const y = base - Math.round(amp * (0.5 + 0.5 * Math.sin((x + off) * k) * Math.cos((x + off) * k * 0.37))); c.fillRect(x, y, 1, LH - y); } }
function house(c, x, y, w, h, wall, roof) { c.fillStyle = wall; c.fillRect(x, y - h, w, h); c.fillStyle = roof; for (let i = 0; i < 7; i++) c.fillRect(x + 4 - i, y - h - 7 + i, w - 8 + i * 2, 1); c.fillStyle = '#e8b860'; c.fillRect(x + 3, y - h + 3, 2, 2); }

function drawBackground(c, ort, t, travel) {
  const sky = SKY[ort] || SKY.wald; grad(c, sky[0], sky[1]);
  const off = travel ? t * 0.018 : 0;
  if (ort === 'stollen') {
    const r = rng(9); c.fillStyle = '#2a2420'; for (let i = 0; i < 70; i++) { const x = r() * LW, y = r() * LH, s = 3 + r() * 9; c.fillRect(x, y, s, s * 0.7); }
    c.fillStyle = '#5a3c22'; for (const x of [30, 120, 210]) { c.fillRect(x, 20, 4, GROUND - 20); c.fillRect(x - 10, 18, 24, 4); }
    c.fillStyle = '#1e1814'; c.fillRect(0, GROUND, LW, LH - GROUND);
    return;
  }
  if (ort === 'feuer') {
    const r = rng(3); c.fillStyle = '#d8dcf0'; for (let i = 0; i < 40; i++) { const x = Math.floor(r() * LW), y = Math.floor(r() * 55); if (Math.sin(t * 0.002 + i * 1.7) < 0.7) c.fillRect(x, y, 1, 1); }
    hills(c, 0, 70, 10, '#141c28', 0.03); treeRow(c, 0, 5, 82, 14, 30, '#0c1410', 9);
    c.fillStyle = '#1c2418'; c.fillRect(0, GROUND, LW, LH - GROUND);
    return;
  }
  if (ort === 'mine') {
    hills(c, 0, 40, 14, '#8a8c94', 0.02);
    c.fillStyle = '#6a6c72'; c.beginPath(); c.moveTo(70, GROUND); c.lineTo(110, 22); c.lineTo(150, 30); c.lineTo(200, GROUND); c.fill();
    c.fillStyle = '#0a0808'; c.fillRect(124, 52, 26, GROUND - 52); c.fillStyle = '#6a4626'; c.fillRect(120, 48, 34, 5); c.fillRect(120, 48, 5, GROUND - 48); c.fillRect(149, 48, 5, GROUND - 48);
    treeRow(c, 0, 11, GROUND, 12, 24, '#3a5232', 26);
    c.fillStyle = '#6a6250'; c.fillRect(0, GROUND, LW, LH - GROUND);
    return;
  }
  // wald / dorf
  hills(c, off * 0.2, 46, 12, '#8aa0a0', 0.02);
  treeRow(c, off * 0.35, 21, 70, 10, 20, '#5a7a62', 11);
  if (ort === 'dorf') { house(c, 150, 80, 16, 10, '#a08a6a', '#5a3a2a'); house(c, 178, 82, 20, 12, '#9a8060', '#4a3024'); house(c, 128, 84, 12, 9, '#a89070', '#5a3a2a'); }
  treeRow(c, off * 0.6, 33, 84, 16, 30, '#3a5a3c', 17);
  c.fillStyle = ort === 'dorf' ? '#6a8a44' : '#4a6a34'; c.fillRect(0, GROUND - 2, LW, LH - GROUND + 2);
  c.fillStyle = '#8a7650'; c.fillRect(0, GROUND + 3, LW, 4);
  if (travel) treeRow(c, off * 1.4, 47, LH + 6, 26, 40, '#1e3220', 60);
}

function drawFire(c, x, y, t) {
  c.fillStyle = '#4a3020'; c.fillRect(x - 6, y - 1, 12, 2);
  const f = (t * 0.012) | 0, r = rng(f);
  for (let i = 0; i < 14; i++) { const h = 3 + r() * 9, xx = x - 4 + r() * 8; c.fillStyle = h > 8 ? '#ffe08a' : h > 5 ? '#f0a040' : '#c04a20'; c.fillRect(Math.round(xx), Math.round(y - h), 1, Math.round(h * 0.6)); }
  const g = c.createRadialGradient(x, y - 4, 2, x, y - 4, 60); g.addColorStop(0, 'rgba(255,170,80,.35)'); g.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = g; c.fillRect(0, 0, LW, LH);
}

/* ───────── Fenster ───────── */
export function openQuest({ db, box, view, heroPlan, companionCv, CHECKS, ATTRS, onClose }) {
  let v = view, busy = false, raf = 0, closed = false, autoTimer = 0, tickTimer = 0;
  const hero = sheetCanvas(heroPlan);
  box.innerHTML = ''; box.hidden = false;
  const head = document.createElement('div'); head.className = 'q-head';
  const title = document.createElement('b'); const pause = document.createElement('button'); pause.type = 'button'; pause.className = 'px-btn icon'; pause.title = 'Später weiterspielen'; pause.textContent = '✕';
  head.append(title, pause);
  const cv = document.createElement('canvas'); cv.width = LW; cv.height = LH; cv.className = 'q-scene'; const c = cv.getContext('2d');
  const log = document.createElement('div'); log.className = 'dl-log q-log';
  const opts = document.createElement('ol'); opts.className = 'dl-opts';
  const foot = document.createElement('div'); foot.className = 'q-foot';
  box.append(head, cv, log, opts, foot);

  const add = (cls, html) => { const el = document.createElement('p'); el.className = cls; el.innerHTML = html; log.append(el); log.scrollTop = log.scrollHeight; };
  const probeLine = (pr) => {
    const name = CHECKS[pr.id]?.name || pr.id, parts = [`${ATTRS[pr.eigenschaft] || pr.eigenschaft} ${pr.mod >= 0 ? '+' : '−'}${Math.abs(pr.mod)}`];
    if (pr.herkunft) parts.push(`Herkunft +${pr.herkunft}`); if (pr.items) parts.push(`Ausrüstung ${pr.items > 0 ? '+' : '−'}${Math.abs(pr.items)}`);
    if (pr.begleiter) parts.push(`Begleiter +${pr.begleiter}`); if (pr.wunde) parts.push(`Wunde ${pr.wunde}`);
    const res = pr.wurf === 20 ? 'Kritischer Erfolg' : pr.wurf === 1 ? 'Patzer' : pr.erfolg ? 'Erfolg' : 'Misserfolg';
    return `${esc(name)} · Wurf <b>${pr.wurf}</b> (${esc(parts.join(', '))}) = ${pr.gesamt} gegen ${pr.dc} · <b class="${pr.erfolg ? 'ok' : 'bad'}">${res}</b>${pr.hilfe ? `<br><span class="muted">${esc(pr.hilfe)}</span>` : ''}`;
  };
  const SPEZ = { neuwurf: 'Glücksbringer: einmal pro Abenteuer neu würfeln', unverwuestlich: 'nutzt sich nicht ab', erster_sicher_flink: 'erster Versuch (Flink) gelingt sicher' };
  const lootCard = (g) => {
    const eff = [Object.entries(g.bonus || {}).map(([k, n]) => `${CHECKS[k]?.name || k} ${n > 0 ? '+' : '−'}${Math.abs(n)}`).join(', '), g.schutz ? `Schutz ${g.schutz}` : '', ...(g.spezial || []).map((x) => SPEZ[x] || x)].filter(Boolean).join(' · ');
    return `<span class="loot r-${esc(g.seltenheit)}"><span class="loot-r">${esc(g.stufe)}</span> <b>${esc(g.name)}</b>${eff ? `<br><span class="small">${esc(eff)}</span>` : ''}${g.legendaer ? `<br><i class="small">${esc(g.beschreibung)}</i>` : ''}</span>`;
  };
  const own = new Map();
  const compCv = (b) => companionCv(b.id) || own.get(b.id) || (b.look ? (own.set(b.id, sheetCanvas({ ...b.look, name: b.name, beruf: b.beruf })), own.get(b.id)) : null);
  const party = () => [hero, ...(v.begleiter || []).map(compCv).filter(Boolean)];

  function frame(t) {
    if (closed) return;
    const travel = !!v.reise && !v.reise.bereit, ort = v.ort || 'wald';
    drawBackground(c, ort, t, travel);
    const ps = party(), fire = ort === 'feuer';
    if (fire) drawFire(c, 150, GROUND, t);
    ps.forEach((s, i) => {
      const x = fire ? [118, 168, 186][i] : 70 + i * 17 - (ps.length - 1) * 4, row = fire ? (i === 0 ? 2 : 3) : 2;
      const col = travel ? Math.floor(t / 160 + i) % 4 : 4 + (Math.floor(t / 700 + i) % 2);
      c.drawImage(s, col * SW, row * SH, SW, SH, Math.round(x), GROUND - SH + 3, SW, SH);
    });
    if (ort === 'stollen') { const g = c.createRadialGradient(80, 70, 10, 80, 70, 120); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)'); c.fillStyle = g; c.fillRect(0, 0, LW, LH); }
    if (v.gefahr && !v.ende) { c.fillStyle = `rgba(160,30,20,${0.12 + 0.08 * Math.sin(t * 0.006)})`; c.fillRect(0, 0, LW, LH); }
    raf = requestAnimationFrame(frame);
  }

  const leftText = () => { const ms = new Date(v.reise.bis) - Date.now(); if (ms <= 0) return null; const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function render(first) {
    title.textContent = v.quest;
    if (!first && v.letztes) {
      const l = v.letztes;
      if (l.wahl) add('me', esc(l.wahl));
      if (l.probe) add('note', probeLine(l.probe));
      if (l.text) add('npc', esc(l.text));
      if (l.extra) add('note', esc(l.extra.replace(/ ?Gefunden: [^.]*\([^)]*\)\./g, '')));
      if (l.beute) add('note', lootCard(l.beute));
    }
    add('scene', esc(v.text));
    opts.innerHTML = ''; foot.innerHTML = ''; clearInterval(tickTimer); clearTimeout(autoTimer);
    if (v.ende) {
      const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'px-btn'; b.textContent = 'Abenteuer abschließen'; b.onclick = () => close(true); li.append(b); opts.append(li); return;
    }
    if (v.reise) {
      const st = document.createElement('p'); st.className = 'small q-travel'; foot.append(st);
      const tick = () => {
        const lt = leftText();
        if (lt) { st.textContent = `Unterwegs … noch ${lt}. Du kannst das Fenster schließen – die Reise läuft weiter.`; return; }
        clearInterval(tickTimer); st.textContent = 'Ihr seid angekommen.'; autoTimer = setTimeout(() => choose(0), 700);
      };
      tick(); tickTimer = setInterval(tick, 500); return;
    }
    v.optionen.forEach((o, i) => {
      const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'dl-opt' + (o.probe ? ' check' : '');
      b.innerHTML = `<span class="num">${i + 1}.</span> ${o.tag ? `<span class="tag">${esc(o.tag)}</span> ` : ''}<span class="txt">${esc(o.text)}</span>${o.hint ? ` <span class="hint">(${esc(o.hint)})</span>` : ''}`;
      b.onclick = () => choose(o.nr); li.append(b); opts.append(li);
    });
    const ab = document.createElement('button'); ab.type = 'button'; ab.className = 'px-btn small q-abort'; ab.textContent = 'Abenteuer abbrechen';
    ab.onclick = async () => { if (!confirmAbort(ab)) return; await db.rpc('quest_abort', { p_run: v.run }); close(true); };
    foot.append(ab);
  }
  // zweistufig statt Browser-Dialog: erster Klick fragt, zweiter bestätigt
  function confirmAbort(b) { if (b.dataset.sure) return true; b.dataset.sure = '1'; b.textContent = 'Wirklich abbrechen? Nochmal klicken.'; setTimeout(() => { if (!closed) { delete b.dataset.sure; b.textContent = 'Abenteuer abbrechen'; } }, 4000); return false; }

  async function choose(nr) {
    if (busy || closed) return; busy = true; opts.querySelectorAll('button').forEach((b) => (b.disabled = true));
    const { data, error } = await db.rpc('quest_choose', { p_run: v.run, p_nr: nr });
    busy = false;
    if (closed) return;
    if (error) {
      if (/unterwegs/i.test(error.message)) { autoTimer = setTimeout(() => choose(0), 3000); return; } // Uhr des Geräts geht etwas vor
      add('note', `<b class="bad">Fehler:</b> ${esc(error.message)}`); opts.querySelectorAll('button').forEach((b) => (b.disabled = false)); return;
    }
    v = data; render(false);
  }
  const onKey = (e) => { if (busy || e.target.tagName === 'INPUT') return; const n = Number(e.key); if (n >= 1 && n <= 9) opts.querySelectorAll('button.dl-opt')[n - 1]?.click(); if (e.key === 'Escape') close(false); };
  function close(changed) { if (closed) return; closed = true; cancelAnimationFrame(raf); clearInterval(tickTimer); clearTimeout(autoTimer); document.removeEventListener('keydown', onKey); box.hidden = true; box.innerHTML = ''; onClose?.(changed); }
  pause.onclick = () => close(false);
  document.addEventListener('keydown', onKey);
  if (v.letztes && v.letztes.text) render(false); else render(true);
  raf = requestAnimationFrame(frame);
  return { close };
}
