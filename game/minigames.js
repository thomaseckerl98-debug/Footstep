// Minispiele für Quests, Tagwerk und Erkundungen. playMinigame(art, { schwer, titel, text, thema }) → Promise<boolean>
// Alles DOM-basiert, bedienbar per Tippen/Klicken und Leertaste bzw. Pfeiltasten.

const THEMEN = {
  schloss: { titel: 'Schloss knacken', hilfe: 'Drücke, wenn der Zeiger im hellen Feld steht – Stift für Stift.', treffer: 'Ein Stift rastet ein.', fehl: 'Der Dietrich rutscht ab.', knopf: 'Drehen' },
  axt: { titel: 'Holz spalten', hilfe: 'Schlag zu, wenn die Axt über der Kerbe steht.', treffer: 'Krach – sauber gespalten.', fehl: 'Die Axt prallt ab.', knopf: 'Zuschlagen' },
  hammer: { titel: 'Am Amboss', hilfe: 'Schlag im richtigen Moment, solange das Eisen glüht.', treffer: 'Der Schlag sitzt.', fehl: 'Daneben – das Eisen kühlt ab.', knopf: 'Schlagen' },
  meissel: { titel: 'Stein behauen', hilfe: 'Setz den Meißel genau an der Ader an.', treffer: 'Ein sauberer Block löst sich.', fehl: 'Der Stein splittert.', knopf: 'Schlagen' },
  nadel: { titel: 'Feine Arbeit', hilfe: 'Stich zu, wenn die Nadel über der Markierung ist.', treffer: 'Ein sauberer Stich.', fehl: 'Verrutscht.', knopf: 'Stechen' },
  spuren: { titel: 'Fährte lesen', hilfe: 'Merk dir die Spuren in der richtigen Reihenfolge.', symbole: ['Reh', 'Fuchs', 'Wolf', 'Hase', 'Dachs', 'Keiler'] },
  bestellung: { titel: 'Bestellungen merken', hilfe: 'Merk dir, wer was bestellt hat – in der richtigen Reihenfolge.', symbole: ['Bier', 'Brot', 'Eintopf', 'Met', 'Käse', 'Most'] },
  runen: { titel: 'Zeichen merken', hilfe: 'Merk dir die Zeichen in der Reihenfolge, in der sie aufleuchten.', symbole: ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ'] },
  lied: { titel: 'Das alte Lied', hilfe: 'Merk dir die Töne in der richtigen Reihenfolge.', symbole: ['tief', 'hell', 'lang', 'kurz', 'hoch', 'leise'] },
  kraeuter: { titel: 'Kräuter erkennen', ding: 'Pflanze', blatt: ['gezahnte Blätter', 'runde Blätter', 'raue Blätter', 'gefiederte Blätter'], farbe: ['weiße Blüten', 'gelbe Blüten', 'blaue Blüten', 'rote Beeren'] },
  pilze: { titel: 'Pilze sammeln', ding: 'Pilz', blatt: ['brauner Hut', 'roter Hut', 'heller Hut', 'flacher Hut'], farbe: ['mit Ring', 'ohne Ring', 'mit Lamellen', 'mit Schwamm'] },
  huehner: { titel: 'Hühner einfangen', hilfe: 'Tippe auf die Hühner, bevor sie wieder verschwinden.', tier: 'Huhn' },
  laemmer: { titel: 'Lämmer zusammentreiben', hilfe: 'Tippe auf die Lämmer, bevor sie davonspringen.', tier: 'Lamm' },
  ratten: { titel: 'Ratten jagen', hilfe: 'Erwisch die Ratten, bevor sie im Loch verschwinden.', tier: 'Ratte' },
  steg: { titel: 'Über den Baumstamm', hilfe: 'Halte das Gleichgewicht: ◀ und ▶ (oder Pfeiltasten) gegen das Schwanken.' },
  eis: { titel: 'Über das Eis', hilfe: 'Halte das Gleichgewicht auf dem glatten Sims: ◀ und ▶.' },
  seil: { titel: 'Am Seil', hilfe: 'Halte dich ruhig am Seil: ◀ und ▶ gegen das Pendeln.' },
};
const ART_THEMA = { timing: 'schloss', merken: 'spuren', finden: 'kraeuter', fangen: 'huehner', balance: 'steg' };
const THEMA_SPIEL = { schloss: 'timing', axt: 'timing', hammer: 'timing', meissel: 'timing', nadel: 'timing', spuren: 'merken', bestellung: 'merken', runen: 'merken', lied: 'merken', kraeuter: 'finden', pilze: 'finden', huehner: 'fangen', laemmer: 'fangen', ratten: 'fangen', steg: 'balance', eis: 'balance', seil: 'balance' };

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function playMinigame(art, opts = {}) {
  const schwer = Math.max(1, Math.min(3, opts.schwer || 2));
  const thema = THEMEN[opts.thema] ? opts.thema : (THEMEN[art] ? art : ART_THEMA[art] || art);
  art = THEMA_SPIEL[art] || art;
  const T = THEMEN[thema] || {};
  return new Promise((resolve) => {
    const ov = el('div', 'mg-overlay ui'); const box = el('div', 'mg-box');
    const h = el('h3', 'mg-title', opts.titel || T.titel || 'Geschick');
    const intro = el('p', 'mg-text', opts.text || ''); if (!opts.text) intro.hidden = true;
    const help = el('p', 'mg-help small', T.hilfe || '');
    const stage = el('div', 'mg-stage'); const status = el('p', 'mg-status', ''); const btns = el('div', 'mg-btns');
    box.append(h, intro, help, stage, status, btns); ov.append(box); document.body.append(ov);
    let done = false; const cleanups = [];
    const finish = (ok, msg) => {
      if (done) return; done = true; cleanups.forEach((f) => f());
      status.textContent = msg || (ok ? 'Geschafft!' : 'Nicht geschafft.'); status.className = 'mg-status ' + (ok ? 'ok' : 'nok');
      btns.innerHTML = ''; const w = el('button', 'px-btn', 'Weiter'); w.onclick = () => { ov.remove(); resolve(ok); }; btns.append(w); w.focus();
    };
    const give = el('button', 'px-btn mg-giveup', 'Aufgeben'); give.onclick = () => finish(false, 'Du lässt es bleiben.');
    const ctx = { stage, status, btns, schwer, T, thema, finish, cleanups, give };
    const games = { timing, bogen, angeln, merken, finden, fangen, wuerfel, balance };
    (games[art] || timing)(ctx);
  });
}

function onKey(ctx, fn) { const k = (e) => fn(e); window.addEventListener('keydown', k); ctx.cleanups.push(() => window.removeEventListener('keydown', k)); }
function loop(ctx, fn) { let id, last = performance.now(); const f = (t) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; if (fn(dt, t) !== false) id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); ctx.cleanups.push(() => cancelAnimationFrame(id)); }

// Zeiger pendelt, im hellen Feld drücken
function timing(ctx) {
  const { stage, status, btns, schwer, T, finish } = ctx;
  const rounds = 2 + schwer, maxMiss = Math.max(1, 4 - schwer);
  let hits = 0, miss = 0, pos = 0, dir = 1, speed = 0.55 + 0.25 * schwer, zone = null;
  const bar = el('div', 'mg-bar'), z = el('div', 'mg-zone'), m = el('div', 'mg-marker'), pins = el('div', 'mg-pins');
  bar.append(z, m); stage.append(bar, pins);
  const newZone = () => { const w = 0.2 - 0.04 * schwer + Math.random() * 0.04; const s = rnd(0.05, 0.95 - w); zone = [s, s + w]; z.style.left = s * 100 + '%'; z.style.width = w * 100 + '%'; };
  const drawPins = () => { pins.textContent = '●'.repeat(hits) + '○'.repeat(rounds - hits) + '   ' + (maxMiss - miss > 0 ? '♥'.repeat(maxMiss - miss) : ''); };
  newZone(); drawPins();
  const act = () => {
    if (pos >= zone[0] && pos <= zone[1]) { hits++; status.textContent = T.treffer || 'Treffer!'; speed *= 1.12; if (hits >= rounds) return finish(true); newZone(); }
    else { miss++; status.textContent = T.fehl || 'Daneben.'; if (miss >= maxMiss) return finish(false); }
    drawPins();
  };
  const b = el('button', 'px-btn mg-main', T.knopf || 'Jetzt!'); b.onclick = act; btns.append(b, ctx.give);
  onKey(ctx, (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); act(); } });
  loop(ctx, (dt) => { pos += dir * speed * dt; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } m.style.left = pos * 100 + '%'; });
}

// Ziel wandert, Wind versetzt den Pfeil
function bogen(ctx) {
  const { stage, status, btns, schwer, finish } = ctx;
  const shots = schwer >= 3 ? 4 : 3, need = schwer >= 3 ? 3 : 2;
  let fired = 0, hits = 0, t = 0, wind = 0, target = 0.5;
  const field = el('div', 'mg-field'), tgt = el('div', 'mg-target'), aim = el('div', 'mg-aim'), info = el('div', 'mg-pins');
  field.append(tgt, aim); stage.append(field, info);
  const newWind = () => { wind = rnd(-0.12, 0.12) * schwer / 2; info.textContent = `Wind: ${Math.abs(wind) < 0.02 ? 'still' : (wind < 0 ? '← ' : '→ ') + (Math.abs(wind) > 0.08 ? 'stark' : 'leicht')}   Pfeile: ${'➶'.repeat(shots - fired)}   Treffer: ${'●'.repeat(hits)}`; };
  newWind();
  const shoot = () => {
    if (fired >= shots) return;
    fired++; const impact = 0.5 + wind; const ok = Math.abs(impact - target) < 0.065 - 0.008 * schwer;
    if (ok) hits++; status.textContent = ok ? 'Treffer!' : (impact < target ? 'Zu weit links.' : 'Zu weit rechts.');
    const arrow = el('div', 'mg-arrow ' + (ok ? 'hit' : '')); arrow.style.left = impact * 100 + '%'; field.append(arrow); setTimeout(() => arrow.remove(), 900);
    if (hits >= need) return finish(true, 'Ins Schwarze!');
    if (shots - fired < need - hits) return finish(false, 'Die Pfeile sind aus.');
    newWind();
  };
  const b = el('button', 'px-btn mg-main', 'Schießen'); b.onclick = shoot; btns.append(b, ctx.give);
  onKey(ctx, (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); shoot(); } });
  loop(ctx, (dt) => { t += dt * (0.8 + 0.35 * schwer); target = 0.5 + Math.sin(t) * 0.38 * Math.cos(t * 0.37); tgt.style.left = target * 100 + '%'; });
}

// Biss abwarten, dann die Schnur auf Spannung halten
function angeln(ctx) {
  const { stage, status, btns, schwer, finish } = ctx;
  const water = el('div', 'mg-water'), bob = el('div', 'mg-bob'); water.append(bob); stage.append(water);
  status.textContent = 'Du wirfst die Leine aus und wartest …';
  let phase = 'warten', biteAt = performance.now() + rnd(1500, 4200), biteWin = 950 - 180 * schwer, tries = 0;
  const b = el('button', 'px-btn mg-main', 'Anschlagen'); btns.append(b, ctx.give);
  let holding = false, mk = 0.3, mv = 0, fish = 0.5, fv = 0, prog = 0.3;
  const reel = el('div', 'mg-reel'), fz = el('div', 'mg-zone'), mm = el('div', 'mg-marker v'), pg = el('div', 'mg-prog'); const pgi = el('span'); pg.append(pgi);
  const strike = () => {
    if (phase === 'warten') { tries++; status.textContent = 'Zu früh – der Fisch ist weg. Neuer Wurf …'; biteAt = performance.now() + rnd(1500, 4000); if (tries >= 3) finish(false, 'Heute beißt nichts an.'); return; }
    if (phase === 'biss') {
      phase = 'drill'; status.textContent = 'Er hängt! Halte gedrückt, um die Schnur zu straffen – lass los, um nachzugeben.';
      water.remove(); reel.append(fz, mm); stage.append(reel, pg); b.textContent = 'Halten';
    }
  };
  b.onpointerdown = (e) => { e.preventDefault(); if (phase === 'drill') holding = true; else strike(); };
  b.onpointerup = b.onpointerleave = () => { holding = false; };
  onKey(ctx, (e) => { if (e.code === 'Space') { e.preventDefault(); if (phase === 'drill') holding = true; else if (!e.repeat) strike(); } });
  const up = (e) => { if (e.code === 'Space') holding = false; }; window.addEventListener('keyup', up); ctx.cleanups.push(() => window.removeEventListener('keyup', up));
  loop(ctx, (dt, now) => {
    if (phase === 'warten') { bob.style.transform = `translateY(${Math.sin(now / 400) * 2}px)`; if (now > biteAt) { phase = 'biss'; status.textContent = 'Biss!'; bob.classList.add('biss'); biteAt = now; } }
    else if (phase === 'biss') { if (now - biteAt > biteWin) { phase = 'warten'; tries++; bob.classList.remove('biss'); status.textContent = 'Zu spät – er hat den Köder geklaut.'; biteAt = now + rnd(1500, 4000); if (tries >= 3) finish(false, 'Heute beißt nichts an.'); } }
    else if (phase === 'drill') {
      fv += rnd(-1, 1) * (1.2 + 0.6 * schwer) * dt; fv *= 0.98; fish += fv * dt * 2.2; if (fish < 0.1) { fish = 0.1; fv = Math.abs(fv); } if (fish > 0.9) { fish = 0.9; fv = -Math.abs(fv); }
      mv += (holding ? 2.4 : -2.2) * dt; mv *= 0.9; mk += mv * dt * 3; if (mk < 0) { mk = 0; mv = 0; } if (mk > 1) { mk = 1; mv = 0; }
      const zw = 0.24 - 0.04 * schwer; fz.style.bottom = (fish - zw / 2) * 100 + '%'; fz.style.height = zw * 100 + '%'; mm.style.bottom = mk * 100 + '%';
      prog += (Math.abs(mk - fish) < zw / 2 ? 0.22 : -0.16 - 0.03 * schwer) * dt; pgi.style.width = Math.max(0, Math.min(1, prog)) * 100 + '%';
      if (prog >= 1) return finish(true, 'Ein prächtiger Fang!'); if (prog <= 0) return finish(false, 'Die Schnur ist gerissen.');
    }
  });
}

// Reihenfolge merken (Simon)
function merken(ctx) {
  const { stage, status, btns, schwer, T, finish } = ctx;
  const sym = (T.symbole || THEMEN.spuren.symbole).slice(0, 4 + Math.min(2, schwer - 1));
  const len = 3 + schwer; const seq = Array.from({ length: len }, () => pick(sym)); let erlaubt = schwer === 1 ? 1 : 0, idx = 0, zeigen = true;
  const grid = el('div', 'mg-grid'); const cells = sym.map((s) => { const c = el('button', 'mg-cell', s); grid.append(c); return c; }); stage.append(grid);
  btns.append(ctx.give); status.textContent = 'Pass gut auf …';
  const flash = (i) => new Promise((r) => { const c = cells[sym.indexOf(seq[i])]; c.classList.add('lit'); setTimeout(() => { c.classList.remove('lit'); setTimeout(r, 180); }, 620 - 80 * schwer); });
  (async () => { await new Promise((r) => setTimeout(r, 700)); for (let i = 0; i < len; i++) { if (ctx.cleanups.done) return; await flash(i); } zeigen = false; status.textContent = 'Jetzt du – in der richtigen Reihenfolge.'; })();
  cells.forEach((c, i) => { c.onclick = () => {
    if (zeigen) return;
    if (sym[i] === seq[idx]) { c.classList.add('ok'); setTimeout(() => c.classList.remove('ok'), 200); idx++; status.textContent = `${idx} von ${len}`; if (idx >= len) finish(true, 'Alles richtig behalten.'); }
    else if (erlaubt > 0) { erlaubt--; c.classList.add('bad'); setTimeout(() => c.classList.remove('bad'), 300); status.textContent = 'Hm, nicht ganz – versuch es weiter.'; }
    else { c.classList.add('bad'); finish(false, `Falsch. Richtig wäre gewesen: ${seq.join(' · ')}`); }
  }; });
}

// Die richtigen Pflanzen/Pilze anhand der Beschreibung finden
function finden(ctx) {
  const { stage, status, btns, schwer, T, finish } = ctx;
  const A = T.blatt || THEMEN.kraeuter.blatt, B = T.farbe || THEMEN.kraeuter.farbe;
  const ga = pick(A), gb = pick(B), n = 9 + 3 * Math.min(1, schwer - 1), richtig = 2 + (schwer >= 2 ? 1 : 0);
  const cards = [];
  for (let i = 0; i < richtig; i++) cards.push({ a: ga, b: gb, ok: true });
  while (cards.length < n) { const a = Math.random() < 0.5 ? ga : pick(A.filter((x) => x !== ga)); const b = a === ga ? pick(B.filter((x) => x !== gb)) : (Math.random() < 0.5 ? gb : pick(B)); cards.push({ a, b, ok: false }); }
  status.textContent = `Gesucht: ${richtig}× ${T.ding || 'Pflanze'} mit ${ga} und ${gb}.`;
  let found = 0, fehler = 0; const maxF = schwer === 1 ? 2 : 1;
  const grid = el('div', 'mg-grid cards');
  shuffle(cards).forEach((c) => { const b = el('button', 'mg-cell card', `${c.a}\n${c.b}`); b.onclick = () => {
    if (b.disabled) return; b.disabled = true;
    if (c.ok) { b.classList.add('ok'); found++; if (found >= richtig) finish(true, 'Alle gefunden – und nichts Giftiges dabei.'); }
    else { b.classList.add('bad'); fehler++; if (fehler >= maxF) finish(false, 'Das war das Falsche. Lieber nichts mitnehmen.'); else status.textContent = `Vorsicht – das passt nicht. Gesucht: ${ga}, ${gb}.`; }
  }; grid.append(b); });
  stage.append(grid); btns.append(ctx.give);
}

// Tiere tauchen auf – rechtzeitig antippen
function fangen(ctx) {
  const { stage, status, btns, schwer, T, finish } = ctx;
  const need = 5 + 2 * schwer, zeit = 16; let got = 0, left = zeit;
  const grid = el('div', 'mg-grid holes'); const holes = Array.from({ length: 9 }, () => { const b = el('button', 'mg-cell hole', ''); grid.append(b); return b; });
  stage.append(grid); btns.append(ctx.give);
  let next = 0;
  holes.forEach((h) => { h.onclick = () => { if (h.classList.contains('up')) { h.classList.remove('up'); h.textContent = ''; got++; if (got >= need) finish(true, 'Alle beisammen!'); } }; });
  loop(ctx, (dt, now) => {
    left -= dt; status.textContent = `${T.tier || 'Tier'}: ${got} von ${need} · noch ${Math.ceil(left)} Sek.`;
    if (left <= 0) return finish(false, 'Die Zeit ist um.');
    if (now > next) {
      const free = holes.filter((h) => !h.classList.contains('up')); const h = pick(free);
      if (h) { h.classList.add('up'); h.textContent = T.tier || '!'; const stay = 1100 - 180 * schwer + rnd(0, 300); setTimeout(() => { h.classList.remove('up'); h.textContent = ''; }, stay); }
      next = now + 520 - 70 * schwer + rnd(0, 250);
    }
  });
}

// Bauernknobeln gegen einen Bewohner: würfeln, bei einer 1 ist alles weg – oder behalten
function wuerfel(ctx) {
  const { stage, status, btns, schwer, finish } = ctx;
  const ziel = 20; let me = 0, du = 0, topf = 0, amZug = 'me';
  const board = el('div', 'mg-dice'); stage.append(board);
  const draw = (wurf) => { board.innerHTML = `<div>Du: <b>${me}</b> · Gegenüber: <b>${du}</b> · Ziel: ${ziel}</div><div class="mg-die">${wurf ? '⚀⚁⚂⚃⚄⚅'[wurf - 1] : '🎲'}</div><div>Im Topf: <b>${topf}</b></div>`; };
  draw();
  const rollB = el('button', 'px-btn mg-main', 'Würfeln'), keepB = el('button', 'px-btn', 'Behalten'); btns.append(rollB, keepB, ctx.give);
  const enable = (on) => { rollB.disabled = keepB.disabled = !on; };
  const gegner = async () => {
    enable(false); topf = 0; const grenze = schwer === 1 ? 8 : schwer === 2 ? 12 : 15;
    status.textContent = 'Dein Gegenüber würfelt …';
    while (true) {
      await new Promise((r) => setTimeout(r, 650)); const w = 1 + Math.floor(Math.random() * 6); draw(w);
      if (w === 1) { status.textContent = 'Eine Eins! Alles weg für dein Gegenüber.'; topf = 0; break; }
      topf += w; draw(w);
      const eile = me >= ziel - 6 ? 4 : 0;   // liegt man hinten, riskiert man mehr
      if (du + topf >= ziel || topf >= grenze + eile) { du += topf; status.textContent = `Behält ${topf}.`; topf = 0; break; }
    }
    draw(); if (du >= ziel) return finish(false, 'Verloren – aber es war knapp.');
    await new Promise((r) => setTimeout(r, 500)); amZug = 'me'; status.textContent = 'Du bist dran.'; enable(true);
  };
  rollB.onclick = () => { if (amZug !== 'me') return; const w = 1 + Math.floor(Math.random() * 6); if (w === 1) { topf = 0; draw(w); status.textContent = 'Eine Eins! Dein Topf ist weg.'; amZug = 'du'; gegner(); return; } topf += w; draw(w); status.textContent = `${w} – weiter oder behalten?`; if (me + topf >= ziel) { me += topf; topf = 0; draw(); finish(true, 'Gewonnen! Die Runde geht auf dich.'); } };
  keepB.onclick = () => { if (amZug !== 'me' || topf === 0) return; me += topf; topf = 0; draw(); if (me >= ziel) return finish(true, 'Gewonnen!'); amZug = 'du'; gegner(); };
  status.textContent = 'Du fängst an. Wer zuerst 20 hat, gewinnt – eine Eins nimmt dir den Topf.';
}

// Gleichgewicht halten
function balance(ctx) {
  const { stage, status, btns, schwer, finish } = ctx;
  const dauer = 6 + 2 * schwer; let x = 0, v = 0, t = 0, left = false, right = false;
  const bar = el('div', 'mg-bar balance'), safe = el('div', 'mg-zone'), m = el('div', 'mg-marker'); safe.style.left = '20%'; safe.style.width = '60%'; bar.append(safe, m);
  const pg = el('div', 'mg-prog'); const pgi = el('span'); pg.append(pgi); stage.append(bar, pg);
  const lb = el('button', 'px-btn mg-main', '◀'), rb = el('button', 'px-btn mg-main', '▶');
  const bind = (b, set) => { b.onpointerdown = (e) => { e.preventDefault(); set(true); }; b.onpointerup = b.onpointerleave = () => set(false); };
  bind(lb, (s) => { left = s; }); bind(rb, (s) => { right = s; }); btns.append(lb, rb, ctx.give);
  onKey(ctx, (e) => { if (e.code === 'ArrowLeft') { left = true; e.preventDefault(); } if (e.code === 'ArrowRight') { right = true; e.preventDefault(); } });
  const up = (e) => { if (e.code === 'ArrowLeft') left = false; if (e.code === 'ArrowRight') right = false; }; window.addEventListener('keyup', up); ctx.cleanups.push(() => window.removeEventListener('keyup', up));
  status.textContent = 'Los geht’s – ruhig bleiben.';
  loop(ctx, (dt) => {
    t += dt; const sturm = 0.6 + 0.35 * schwer + t * 0.05;
    v += (rnd(-1, 1) * sturm + x * (0.9 + 0.3 * schwer)) * dt; v += ((right ? 1.6 : 0) - (left ? 1.6 : 0)) * dt; v *= 0.985; x += v * dt;
    m.style.left = (0.5 + x / 2) * 100 + '%'; pgi.style.width = Math.min(1, t / dauer) * 100 + '%';
    if (Math.abs(x) > 0.6) safe.classList.add('warn'); else safe.classList.remove('warn');
    if (Math.abs(x) >= 1) return finish(false, 'Du verlierst den Halt!');
    if (t >= dauer) return finish(true, 'Sicher drüben.');
  });
}
