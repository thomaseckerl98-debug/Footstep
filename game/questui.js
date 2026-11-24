// Quest-Fenster: Szenenbild (Held + Begleiter), bei Reisen ein Ausschnitt der Weltkarte mit deiner Position, Wahlmöglichkeiten, Würfelzeilen.
// Gewürfelt und entschieden wird nur auf dem Server (quest_choose); hier wird nur gezeigt.
import { sheetData, SW, SH } from './chars.js?v=4';
import { playMinigame } from './minigames.js?v=2';
import { playBattle } from './horde.js?v=6';
import { iconURL } from './kampf_icons.js?v=3';

const LW = 240, LH = 100, GROUND = 88;
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sheetCanvas = (plan) => { const sh = sheetData(plan), cv = document.createElement('canvas'); cv.width = sh.w; cv.height = sh.h; cv.getContext('2d').putImageData(new ImageData(sh.data, sh.w, sh.h), 0, 0); return cv; };

/* ───────── Hintergründe (einfache Pixel-Formen, schnell genug für jedes Bild) ───────── */
const SKY = { dorf: ['#9cb8c8', '#e8d8b0'], wald: ['#7fa0a8', '#c8d0a8'], mine: ['#8a98a8', '#c8c0a8'], stollen: ['#0c0a0a', '#1a1412'], feuer: ['#0a1020', '#24304a'], berg: ['#a8b8c8', '#e8eef0'], fluss: ['#8cb0c0', '#d8e0c8'], ruine: ['#8a94a0', '#c8c4b0'], hoehle: ['#0c0a0a', '#1a1412'], stadt: ['#9ab4c8', '#e8dcc0'], burg: ['#1c1814', '#2e2620'] };
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
  if (ort === 'burg') {
    // Thronsaal: Steinwände, Säulen, Banner mit dem goldenen Hirsch, Fackeln
    const r = rng(5); for (let y = 0; y < GROUND; y += 6) for (let x = (y / 6) % 2 ? -6 : 0; x < LW; x += 12) { c.fillStyle = r() < 0.5 ? '#3a3228' : '#433a2e'; c.fillRect(x, y, 11, 5); }
    for (const x of [20, 70, 170, 220]) { c.fillStyle = '#5a5044'; c.fillRect(x - 5, 8, 10, GROUND - 8); c.fillStyle = '#6e6456'; c.fillRect(x - 5, 8, 3, GROUND - 8); c.fillStyle = '#4a4034'; c.fillRect(x - 7, 6, 14, 4); }
    for (const x of [45, 195]) { c.fillStyle = '#2e5a2a'; c.fillRect(x - 7, 10, 14, 34); c.fillStyle = '#d8a531'; c.fillRect(x - 2, 18, 4, 9); c.fillRect(x - 5, 16, 2, 4); c.fillRect(x + 3, 16, 2, 4); c.beginPath(); c.moveTo(x - 7, 44); c.lineTo(x, 50); c.lineTo(x + 7, 44); c.fill(); }
    for (const x of [95, 145]) { const f = 0.6 + 0.4 * Math.sin(t * 0.012 + x); c.fillStyle = `rgba(255,170,70,${0.18 * f})`; c.beginPath(); c.arc(x, 30, 22, 0, 7); c.fill(); c.fillStyle = '#5a3a22'; c.fillRect(x - 1, 30, 2, 8); c.fillStyle = f > 0.7 ? '#ffd060' : '#ff8a30'; c.fillRect(x - 2, 25, 4, 5); }
    c.fillStyle = '#6a1e1a'; c.fillRect(100, GROUND - 2, 40, LH - GROUND + 2); c.fillStyle = '#2a221a'; c.fillRect(0, GROUND, 100, LH - GROUND); c.fillRect(140, GROUND, LW - 140, LH - GROUND);
    c.fillStyle = '#8a6a2a'; c.fillRect(112, 40, 16, 22); c.fillStyle = '#d8a531'; c.fillRect(110, 36, 20, 5); c.fillRect(112, 62, 16, 4);
    return;
  }
  if (ort === 'stadt') {
    // Stadtgasse: Fachwerkhäuser mit roten Dächern, Domturm, Markt
    hills(c, off * 0.3, 50, 6, '#8aa0a8', 0.03);
    c.fillStyle = '#9a9488'; c.fillRect(150, 6, 16, 50); for (let i = 0; i < 9; i++) c.fillRect(158 - i, -3 + i, i * 2 + 1, 1); c.fillStyle = '#d8a531'; c.fillRect(157, -4, 2, 3);
    const r = rng(11); let x = -((off * 2) % 34);
    while (x < LW + 30) { const w = 24 + Math.floor(r() * 10), h = 26 + Math.floor(r() * 16), top = GROUND - h;
      c.fillStyle = r() < 0.5 ? '#dccdb2' : '#e6d8bc'; c.fillRect(x, top, w, h); c.fillStyle = '#4a3424'; c.fillRect(x, top, w, 2); c.fillRect(x, top + Math.floor(h / 2), w, 1); c.fillRect(x + Math.floor(w / 2), top, 1, h);
      c.fillStyle = r() < 0.6 ? '#a8573c' : '#86412c'; for (let i = 0; i < 9; i++) c.fillRect(x - 2 + i, top - 9 + i, w + 4 - i * 2, 1);
      c.fillStyle = '#3a2a1c'; c.fillRect(x + 4, top + 6, 4, 5); c.fillRect(x + w - 8, top + 6, 4, 5); c.fillRect(x + Math.floor(w / 2) - 3, GROUND - 9, 6, 9);
      x += w + 4; }
    c.fillStyle = '#8a8070'; c.fillRect(0, GROUND, LW, LH - GROUND); c.fillStyle = '#9a9080'; for (let i = 0; i < LW; i += 6) c.fillRect(i + ((off * 2) % 6), GROUND + 2 + (i % 12 ? 0 : 3), 4, 2);
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
  if (ort === 'hoehle') return drawBackground(c, 'stollen', t, travel);
  if (ort === 'berg') {
    hills(c, off * 0.15, 30, 22, '#c8d0d8', 0.015); hills(c, off * 0.3, 52, 16, '#9aa4ac', 0.025);
    c.fillStyle = '#f4f6f8'; for (let x = 0; x < LW; x++) { const y = 30 - Math.round(22 * (0.5 + 0.5 * Math.sin((x + off * 0.15) * 0.015) * Math.cos((x + off * 0.15) * 0.015 * 0.37))); c.fillRect(x, y, 1, 4); }
    treeRow(c, off * 0.6, 61, 84, 12, 22, '#3a4a40', 23);
    c.fillStyle = '#e8ecef'; c.fillRect(0, GROUND - 2, LW, LH - GROUND + 2);
    return;
  }
  if (ort === 'ruine') {
    hills(c, 0, 50, 10, '#8a9690', 0.02); treeRow(c, 0, 71, 74, 10, 18, '#4a6250', 15);
    c.fillStyle = '#7a766c'; for (const [x, w, h] of [[120, 14, 34], [140, 8, 20], [176, 16, 44], [200, 6, 14]]) c.fillRect(x, GROUND - h, w, h);
    c.fillStyle = '#5a564e'; c.fillRect(176, GROUND - 44, 16, 3); c.fillRect(120, GROUND - 34, 14, 2);
    c.fillStyle = '#5a6a3c'; c.fillRect(0, GROUND - 2, LW, LH - GROUND + 2);
    return;
  }
  if (ort === 'fluss') {
    hills(c, off * 0.2, 46, 12, '#8aa0a0', 0.02); treeRow(c, off * 0.35, 81, 70, 10, 20, '#5a7a62', 11);
    c.fillStyle = '#4a6a34'; c.fillRect(0, GROUND - 10, LW, LH - GROUND + 10);
    c.fillStyle = '#3e6a88'; c.fillRect(0, GROUND - 4, LW, 8); c.fillStyle = '#9cc4dc'; for (let x = 0; x < LW; x += 9) c.fillRect((x + Math.floor(t / 90)) % LW, GROUND - 2, 4, 1);
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
export function openQuest({ db, box, view, heroPlan, companionCv, CHECKS, ATTRS, onClose, reiseKarte }) {
  let mapDraw = null, mapReq = false;
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
    if (travel && reiseKarte && !mapReq) { mapReq = true; reiseKarte().then((f) => { mapDraw = f; }).catch(() => {}); }
    if (travel && mapDraw && mapDraw(c, LW, LH, t)) { if (v.gefahr && !v.ende) { c.fillStyle = `rgba(160,30,20,${0.1 + 0.06 * Math.sin(t * 0.006)})`; c.fillRect(0, 0, LW, LH); } raf = requestAnimationFrame(frame); return; }
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

  const leftText = () => {
    const ms = new Date(v.reise.bis) - Date.now(); if (ms <= 0) return null; const s = Math.ceil(ms / 1000);
    if (s >= 5400) { const h = Math.round(s / 3600); return `etwa ${h} Stunden (Ankunft ${new Date(v.reise.bis).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} Uhr)`; }
    if (s >= 600) return `etwa ${Math.round(s / 60)} Minuten`;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  function render(first) {
    title.textContent = v.quest; if (v.kampf_quest) { const kb = document.createElement('span'); kb.className = 'q-kampfbadge'; kb.innerHTML = `<img class="q-kicon" src="${iconURL('kampf')}" alt="">Kampf · ca. ${v.kampf_quest} Min.`; kb.title = 'In diesem Abenteuer kommt es zu einem Kampf.'; title.append(' ', kb); }
    if (!first && v.letztes) {
      const l = v.letztes;
      if (l.wahl) add('me', esc(l.wahl));
      if (l.minispiel) add('note', l.minispiel.erfolg ? '<b class="ok">Geschafft!</b>' : '<b class="bad">Nicht geschafft.</b>');
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
        if (lt) { st.textContent = `${v.reise.text ? v.reise.text + ' ' : ''}Unterwegs … noch ${lt}. Du kannst das Fenster schließen – die Reise läuft weiter.`; return; }
        clearInterval(tickTimer); st.textContent = 'Ihr seid angekommen.'; autoTimer = setTimeout(() => choose(0), 700);
      };
      tick(); tickTimer = setInterval(tick, 500); return;
    }
    // Eigenes Abenteuer: Die Erzählerin schreibt noch – kurz warten und dann von selbst weitermachen
    if (v.szene === '__ki_start' && v.quest === 'Eigenes Abenteuer') {
      const st = document.createElement('p'); st.className = 'small q-travel'; st.textContent = 'Die Geschichte nimmt Gestalt an …'; foot.append(st);
      const poll = async () => {
        if (closed) return;
        const { data } = await db.rpc('quest_view', { p_run: v.run });
        if (closed) return;
        if (data && (data.quest !== 'Eigenes Abenteuer' || data.szene !== '__ki_start')) { v = data; v.letztes = data.letztes && data.letztes.text ? data.letztes : null; render(!v.letztes); return; }
        autoTimer = setTimeout(poll, 4000);
      };
      autoTimer = setTimeout(poll, 3000);
      return;
    }
    if (v.minispiel) {
      const mg = v.minispiel, li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'dl-opt check';
      const kampf = mg.art === 'kampf';
      if (kampf) b.classList.add('kampf');
      b.innerHTML = kampf ? `<img class="q-kampficon" src="${iconURL('kampf')}" alt=""> <span class="txt"><b>${esc(mg.titel || 'Kämpfen')}</b><br><span class="small">Kampf · ca. ${Math.round((mg.dauer || 600) / 60)} Minuten · jederzeit pausierbar</span></span>` : `<span class="tag">[Geschick]</span> <span class="txt">${esc(mg.titel || 'Versuchen')}</span>`;
      b.onclick = async () => {
        if (busy) return; busy = true;
        let ok;
        if (kampf) {
          const { data: kw } = await db.rpc('kampf_werte');
          const helfer = [...(v.begleiter || []).filter((x) => x.look), ...((kw && kw.helfer) || [])].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
          const res = await playBattle({ titel: mg.titel, text: mg.text || v.text, dauer: mg.dauer || 180, schwer: mg.schwer || 2, gegner: mg.gegner, ort: mg.kampfort || v.ort, boss: mg.boss, modus: mg.modus, heroPlan, helfer, meta: kw || {} });
          ok = res.sieg;
        } else ok = await playMinigame(mg.art, { schwer: mg.schwer, titel: mg.titel, text: mg.text });
        busy = false; send('quest_minigame', { p_run: v.run, p_erfolg: ok });
      };
      li.append(b); opts.append(li);
    }
    if (v.raetsel) {
      const rz = v.raetsel, wrap = document.createElement('div'); wrap.className = 'q-raetsel';
      wrap.innerHTML = `<p class="q-frage">${esc(rz.frage)}</p>${(rz.hinweise || []).map((h) => `<p class="small muted">Hinweis: ${esc(h)}</p>`).join('')}<p class="small muted">Noch ${rz.uebrig} ${rz.uebrig === 1 ? 'Versuch' : 'Versuche'}.</p>`;
      const f = document.createElement('form'); f.className = 'q-answer'; const inp = document.createElement('input'); inp.maxLength = 60; inp.placeholder = 'Deine Antwort …'; inp.autocomplete = 'off';
      const sb = document.createElement('button'); sb.type = 'submit'; sb.className = 'px-btn'; sb.textContent = 'Antworten';
      f.append(inp, sb); f.onsubmit = (e) => { e.preventDefault(); const t = inp.value.trim(); if (t) send('quest_answer', { p_run: v.run, p_text: t }); };
      wrap.append(f); opts.append(wrap); setTimeout(() => inp.focus(), 50);
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

  async function send(fn, args) {
    if (busy || closed) return; busy = true; opts.querySelectorAll('button,input').forEach((b) => (b.disabled = true));
    const { data, error } = await db.rpc(fn, args);
    busy = false; if (closed) return;
    if (error) { add('note', `<b class="bad">Fehler:</b> ${esc(error.message)}`); opts.querySelectorAll('button,input').forEach((b) => (b.disabled = false)); return; }
    v = data; render(false);
  }
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
