import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=7';
import { Scene, realMood } from './game/scene.js?v=7';
import { openCreator } from './game/creator.js?v=3';
import { buildTalk } from './game/dialog.js?v=2';
import { CHECKS, ATTRS, HERKUNFT, charAttrs, checkOdds, oddsWord } from './game/rules.js?v=1';
import { planFromLook, portraitSprite, RACES, PW, PH } from './game/chars.js?v=3';
import { setMood } from './game/core.js?v=1';
import { CATALOG, KATEGORIEN, STUFEN, summary } from './game/buildings.js?v=2';
import { drawIcon } from './game/icons.js?v=1';
import { PLOTS } from './game/world.js?v=5';
import { SW, SH } from './game/chars.js?v=3';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ───────────── Anmeldung / Registrierung ───────────── */
let mode = 'login';
function setMode(next) {
  mode = next;
  $('tab-login').classList.toggle('active', mode === 'login');
  $('tab-register').classList.toggle('active', mode === 'register');
  $('name-label').hidden = mode !== 'register';
  $('character').required = mode === 'register';
  $('submit-btn').textContent = mode === 'login' ? 'Anmelden' : 'Registrieren';
  $('password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  showMsg('auth-msg', '');
}
function showMsg(id, text, type = '') { const el = $(id); el.textContent = text; el.className = 'msg ' + type; }
$('tab-login').onclick = () => setMode('login');
$('tab-register').onclick = () => setMode('register');
$('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('submit-btn'); btn.disabled = true; showMsg('auth-msg', '…');
  try {
    const email = $('email').value.trim(), password = $('password').value;
    if (mode === 'register') {
      const name = $('character').value.trim();
      const { data: free, error: nameErr } = await db.rpc('character_name_available', { p_name: name });
      if (nameErr) throw nameErr;
      if (!free) { showMsg('auth-msg', 'Dieser Charaktername ist schon vergeben.', 'error'); return; }
      const { data, error } = await db.auth.signUp({ email, password, options: { data: { character_name: name } } });
      if (error) throw error;
      if (!data.session) showMsg('auth-msg', 'Fast geschafft: Bitte bestätige deine E-Mail und melde dich dann an.', 'ok');
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) { showMsg('auth-msg', translateError(err), 'error'); } finally { btn.disabled = false; }
});
function translateError(err) {
  const m = (err && err.message) || String(err);
  if (/invalid login credentials/i.test(m)) return 'E-Mail oder Passwort falsch.';
  if (/already registered/i.test(m)) return 'Diese E-Mail ist schon registriert.';
  if (/password/i.test(m) && /characters/i.test(m)) return 'Passwort zu kurz (mind. 8 Zeichen).';
  if (/email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail.';
  if (/rate limit/i.test(m)) return 'Zu viele Versuche. Warte kurz und probiere es erneut.';
  return 'Fehler: ' + m;
}

/* ───────────── Spiel-Oberfläche ───────────── */
const MENUS = [
  { id: 'dorf', name: 'Dorf', tip: 'Dein Dorf: Gebäude, Bauplätze und Ausbau.' },
  { id: 'bewohner', name: 'Bewohner', tip: 'Deine Dorfbewohner, ihre Berufe und Beziehungen.' },
  { id: 'charakter', name: 'Charakter', tip: 'Dein Held: Aussehen, Fähigkeiten, Erfahrungen.' },
  { id: 'inventar', name: 'Inventar', tip: 'Ausrüstung und Gegenstände.' },
  { id: 'quest', name: 'Tagebuch', tip: 'Gerüchte, Hinweise und Aufträge aus deinen Gesprächen.' },
  { id: 'karte', name: 'Karte', tip: 'Die Weltkarte mit allen Dörfern.' },
  { id: 'diplomatie', name: 'Diplomatie', tip: 'Bündnisse, Kriege und Nachrichten.' },
];
const TIME_NAMES = { morgen: 'Morgen', mittag: 'Mittag', abend: 'Abend', nacht: 'Nacht' };
const SEASON_NAMES = { fruehling: 'Frühling', sommer: 'Sommer', herbst: 'Herbst', winter: 'Winter' };
const WEATHER_NAMES = { klar: 'Klar', wolkig: 'Wolkig', regen: 'Regen', nebel: 'Nebel', schnee: 'Schnee' };
let scene = null, active = 'dorf', village = null, weatherNow = 'klar', me = null;

function buildDock() {
  const dock = $('dock'); dock.innerHTML = '';
  for (const m of MENUS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dock-btn' + (m.locked ? ' locked' : '') + (m.id === active ? ' active' : ''); b.dataset.menu = m.id;
    const cv = document.createElement('canvas'); drawIcon(cv, m.id, m.locked, 3);
    const label = document.createElement('span'); label.textContent = m.name;
    b.append(cv, label);
    b.onmouseenter = () => showTip(`<b>${m.name}</b><br>${m.tip}`, b);
    b.onmouseleave = hideTip;
    b.onclick = () => { if (!m.locked) openMenu(m.id); else showTip(`<b>${m.name}</b><br>${m.tip}`, b); };
    dock.append(b);
  }
}
function showTip(html, anchorOrPoint) {
  const t = $('tooltip'); t.innerHTML = html; t.hidden = false;
  let x, y;
  if (anchorOrPoint instanceof Element) { const r = anchorOrPoint.getBoundingClientRect(); x = r.left + r.width / 2 - t.offsetWidth / 2; y = r.top - t.offsetHeight - 10; }
  else { x = anchorOrPoint.x + 16; y = anchorOrPoint.y + 16; if (x + t.offsetWidth > innerWidth - 8) x = anchorOrPoint.x - t.offsetWidth - 12; if (y + t.offsetHeight > innerHeight - 90) y = anchorOrPoint.y - t.offsetHeight - 12; }
  t.style.left = Math.max(6, Math.min(innerWidth - t.offsetWidth - 6, x)) + 'px'; t.style.top = Math.max(6, y) + 'px';
}
function hideTip() { $('tooltip').hidden = true; }

function openMenu(id) {
  const same = id === active && !$('panel').hidden;
  active = id;
  document.querySelectorAll('.dock-btn').forEach((b) => b.classList.toggle('active', b.dataset.menu === id));
  $('banner-title').textContent = MENUS.find((m) => m.id === id).name;
  if (same) { closePanel(); return; }
  renderPanel(id);
}
function closePanel() { $('panel').hidden = true; if (scene && scene.showPlots) scene.togglePlots(false); }
$('panel-close').onclick = closePanel;

const btn = (label, on, onclick) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'px-btn' + (on ? ' on' : ''); b.textContent = label; b.onclick = onclick; return b; };
const h3 = (t) => { const e = document.createElement('h3'); e.textContent = t; return e; };
const p = (t, cls) => { const e = document.createElement('p'); e.textContent = t; if (cls) e.className = cls; return e; };
const row = (...items) => { const e = document.createElement('div'); e.className = 'row'; e.append(...items); return e; };

function renderPanel(id) {
  const body = $('panel-body'); body.innerHTML = '';
  $('panel-title').textContent = MENUS.find((m) => m.id === id).name;
  if (id === 'dorf') {
    body.append(p(village ? `${village.village_name} · Häuptling ${village.character_name}` : 'Dein Dorf'));
    body.append(p('Testmodus: Bauplätze anzeigen, dann einen freien Bauplatz anklicken, um aus dem Baukatalog zu bauen – oder ein Gebäude anklicken, um es zu verschieben, umzubauen oder abzureißen. Licht, Jahreszeit und Wetter kannst du unten ausprobieren.', 'muted small'));
    if (scene.showPlots && (scene.selPlot != null || scene.selected != null)) renderBuildMenu(body);
    body.append(h3('Ansicht'));
    body.append(row(...[['dorf', 'Dorf'], ['grossdorf', 'Großes Dorf'], ['stadt', 'Stadt']].map(([z, n]) => btn(n, scene.zoom === z, () => { scene.setZoom(z); renderPanel('dorf'); }))));
    body.append(h3('Gebäude umstellen'));
    body.append(row(
      btn(scene.showPlots ? 'Bauplätze ausblenden' : 'Bauplätze anzeigen', scene.showPlots, () => { scene.togglePlots(); renderPanel('dorf'); }),
      btn(scene.showRoads ? 'Geplante Wege ausblenden' : 'Geplante Wege anzeigen', scene.showRoads, () => { scene.toggleRoads(); renderPanel('dorf'); }),
      btn('Anordnung zurücksetzen', false, () => scene.resetLayout()),
      btn(scene.showNames ? 'Namen ausblenden' : 'Namen anzeigen', scene.showNames, () => { scene.toggleNames(); renderPanel('dorf'); }),
    ));
    body.append(p(scene.showPlots
      ? (scene.selected ? `Gebäude auf Bauplatz ${scene.selected} gewählt. Jetzt einen anderen Bauplatz anklicken.` : 'Klicke ein Gebäude oder das Feld an und danach einen Bauplatz (gelbe Ringe). Steht dort schon ein Gebäude, werden beide getauscht.')
      : `Es gibt ${PLOTS.length} vorberechnete Bauplätze. Tipp: Für mehr Bauplätze auf „Großes Dorf“ oder „Stadt“ zoomen.`, 'muted small'));
    body.append(h3('Tageszeit'));
    body.append(row(btn('Echtzeit', scene.auto, () => { const m = realMood(); scene.setMood(m.time, m.season, true); renderPanel('dorf'); }),
      ...Object.entries(TIME_NAMES).map(([k, n]) => btn(n, !scene.auto && scene.mood.time === k, () => { scene.setMood(k, scene.mood.season); renderPanel('dorf'); }))));
    body.append(h3('Jahreszeit'));
    body.append(row(...Object.entries(SEASON_NAMES).map(([k, n]) => btn(n, scene.mood.season === k, () => { scene.setMood(scene.mood.time, k); renderPanel('dorf'); }))));
    body.append(h3('Wetter'));
    body.append(row(btn('Automatisch', !scene.weather.forced, () => { scene.setWeather('auto'); renderPanel('dorf'); }),
      ...Object.entries(WEATHER_NAMES).map(([k, n]) => btn(n, scene.weather.forced && scene.weather.target === k, () => { scene.setWeather(k); renderPanel('dorf'); }))));
    body.append(p('Hinweis: Jede neue Kombination aus Tageszeit und Jahreszeit wird beim ersten Mal ein paar Sekunden gezeichnet und danach im Browser gespeichert.', 'muted small'));
  } else if (id === 'karte' || id === 'diplomatie') {
    body.append(p(id === 'karte' ? 'Die große Weltkarte folgt. Bisher bekannte Dörfer:' : 'Bündnisse, Kriegserklärungen und Nachrichten folgen. Bekannte Häuptlinge:', 'muted'));
    const ul = document.createElement('ul'); ul.className = 'chiefs'; body.append(ul);
    db.rpc('get_world_map').then(({ data, error }) => {
      if (error) { ul.append(p('Konnte die Karte nicht laden.', 'error')); return; }
      for (const v of data || []) {
        const li = document.createElement('li');
        const a = document.createElement('span'); a.textContent = v.character_name + (v.is_me ? ' (du)' : ''); if (v.is_me) a.className = 'me';
        const b = document.createElement('span'); b.className = 'muted'; b.textContent = `${v.village_name} · (${v.x} | ${v.y})`;
        li.append(a, b); ul.append(li);
      }
    });
  } else if (id === 'charakter') {
    if (me && me.look) {
      const cv = document.createElement('canvas'); cv.className = 'portrait'; cv.width = PW; cv.height = PH;
      setMood('mittag', 'sommer'); cv.getContext('2d').putImageData(new ImageData(portraitSprite(planFromLook(me.look, me.name)).data, PW, PH), 0, 0); scene?.restoreMood();
      const r = RACES[me.look.race];
      const wrap = document.createElement('div'); wrap.className = 'charbox'; const t = document.createElement('div');
      const hk = HERKUNFT[me.herkunft || me.look.herkunft || 'waldlaeufer'], at = me.attrs || charAttrs(me.look.race, me.herkunft);
      t.innerHTML = `<b>${esc(me.name)}</b><br>${esc(r.name)} · ${esc(hk.name)}<br><span class="small">${esc(hk.desc)}</span><br><span class="attrs small">${Object.entries(ATTRS).map(([k, n]) => `<span>${n} ${'●'.repeat(at[k])}${'○'.repeat(6 - at[k])}</span>`).join('')}</span>`;
      wrap.append(cv, t); body.append(wrap);
      body.append(p('Eigenschaften entscheiden über Antwortmöglichkeiten und Würfe in Gesprächen. Ausrüstung, Wunden und Narben folgen.', 'muted small'));
    }
    body.append(row(btn('Aussehen ändern', false, () => showCreator(false))));
  } else if (id === 'quest') {
    body.append(p('Was du in Gesprächen erfährst, landet hier. Aus Gerüchten werden später Abenteuer.', 'muted small'));
    const ul = document.createElement('ul'); ul.className = 'journal'; body.append(ul);
    const show = (list) => {
      ul.innerHTML = '';
      if (!list.length) { ul.append(p('Noch keine Einträge. Hör dich im Dorf um – manche wissen mehr, als sie sagen.', 'muted small')); return; }
      for (const j of list) { const li = document.createElement('li'); li.innerHTML = `<b>${esc(j.title)}</b>${j.npc ? ` <span class="muted small">· von ${esc(j.npc)}</span>` : ''}<br><span class="small">${esc(j.text)}</span>`; ul.append(li); }
    };
    show([...journalLocal.values()].reverse());
    db.rpc('get_journal').then(({ data, error }) => { if (!error && Array.isArray(data) && active === 'quest') show(data); });
  } else if (id === 'bewohner') {
    const info = scene ? scene.village.info() : [];
    body.append(p(info.length ? `${info.length} Bewohner leben in deinem Dorf. Was sie von dir halten, zeigt sich an ihrem Verhalten.` : 'Noch wohnt niemand hier.', 'muted small'));
    const ul = document.createElement('ul'); ul.className = 'residents'; body.append(ul);
    for (const r of info) {
      const li = document.createElement('li');
      const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; if (r.cv) cv.getContext('2d').drawImage(r.cv, 4 * SW, 0, SW, SH, 0, 0, SW, SH);
      const t = document.createElement('div');
      t.innerHTML = `<b>${esc(r.name)}</b> <span class="muted">· ${esc(r.job)}</span><br><span class="small">wirkt ${esc(r.stimmung)} · ${esc(r.activity)}</span><br><span class="small muted">${r.erinnerung ? 'Erinnert sich: ' + esc(r.erinnerung) : 'Noch keine gemeinsamen Erlebnisse.'}</span>`;
      li.append(cv, t); ul.append(li);
    }
  } else {
    const texts = { inventar: 'Hier liegen bald deine Ausrüstung und Gegenstände.' };
    body.append(p(texts[id] || '', 'muted'));
  }
  $('panel').hidden = false;
}
const RANK = { S: 1, M: 2, L: 3 };
function renderBuildMenu(body) {
  const plotId = scene.selPlot ?? scene.selected, plot = PLOTS.find((q) => q.id === plotId), cur = scene.typeAt(plotId);
  const box = document.createElement('div'); box.className = 'buildbox'; body.append(box);
  const head = document.createElement('h3'); head.textContent = cur ? `Bauplatz ${plotId}: ${CATALOG[cur]?.name || cur}` : `Bauplatz ${plotId} (Platz bis Größe ${plot.size})`; box.append(head);
  if (cur) {
    for (const line of summary(cur)) box.append(p(line, 'small'));
    for (const f of CATALOG[cur]?.folgen || []) box.append(p('• ' + f, 'small muted'));
    box.append(row(btn('Abreißen', false, () => scene.removeBuilding(plotId)), btn('Abbrechen', false, () => { scene.selected = null; scene.selPlot = null; scene.drawMarks(); renderPanel('dorf'); })));
    box.append(p('Zum Verschieben jetzt einen anderen Bauplatz anklicken – oder unten umbauen:', 'muted small'));
  } else box.append(p('Was soll hier entstehen? (Testmodus: sofort fertig. Im echten Spiel kostet es Rohstoffe und Bauzeit.)', 'muted small'));
  for (const [kat, kname] of Object.entries(KATEGORIEN)) {
    const items = Object.entries(CATALOG).filter(([, c]) => c.kat === kat); if (!items.length) continue;
    const det = document.createElement('details'); det.className = 'kat'; const sum = document.createElement('summary'); sum.textContent = `${kname} (${items.length})`; det.append(sum);
    for (const [id, c] of items) {
      const it = document.createElement('div'); it.className = 'bitem' + (id === cur ? ' cur' : '');
      const fits = RANK[c.size] <= RANK[plot.size];
      const t = document.createElement('div');
      t.innerHTML = `<b>${esc(c.name)}</b> <span class="muted small">· Größe ${c.size} · ${Object.entries(c.kosten).map(([k, v]) => v + ' ' + k).join(', ')} · ${c.bauzeit} h${c.benoetigt ? ' · braucht ' + c.benoetigt.map((b) => CATALOG[b]?.name || b).join(', ') : ''}</span>`;
      for (const line of summary(id)) { const q = document.createElement('div'); q.className = 'small'; q.textContent = line; t.append(q); }
      for (const f of c.folgen) { const q = document.createElement('div'); q.className = 'small muted'; q.textContent = '• ' + f; t.append(q); }
      const b = btn(id === cur ? 'Steht hier' : fits ? (cur ? 'Umbauen' : 'Bauen') : 'Zu groß', false, () => scene.placeBuilding(id, plotId)); b.disabled = !fits || id === cur;
      it.append(t, b); det.append(it);
    }
    box.append(det);
  }
  box.append(p(STUFEN, 'muted small'));
}
function showCreator(first) {
  hideTip();
  openCreator({
    root: $('creator'), name: me?.name || 'Du', look: me?.look, first,
    restoreMood: () => scene?.restoreMood(),
    onSave: async (look) => {
      const { data, error } = await db.rpc('save_character', { p_look: look });
      if (error) throw new Error(error.message);
      me = data && typeof data === 'object' && data.look ? data : { ...(me || {}), look };
      scene.setHeroPlan(planFromLook(me.look, me.name));
      if (!$('panel').hidden && active === 'charakter') renderPanel('charakter');
    },
  });
}
/* ───────────── Auswahl-Karte und Gespräche ───────────── */
const NEUTR = new Set(['wohnhaus', 'langhaus', 'gasthaus', 'feld', 'saegewerk', 'heilerhaus', 'lagerhaus']), MASK = new Set(['stall', 'markt', 'schrein', 'alchemistenturm', 'wachturm']);
const withArticle = (t) => (NEUTR.has(t) ? 'das ' : MASK.has(t) ? 'der ' : 'die ') + (CATALOG[t]?.name || t);
let selTimer = 0;
function portraitCanvas(plan, size = 96) { const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; cv.style.width = cv.style.height = size + 'px'; cv.className = 'portrait'; cv.getContext('2d').putImageData(new ImageData(portraitSprite(plan).data, PW, PH), 0, 0); return cv; }
function showSelCard(obj) {
  const card = $('selcard'); clearInterval(selTimer);
  if (!obj) { card.hidden = true; return; }
  hideTip(); card.hidden = false; card.innerHTML = '';
  const close = document.createElement('button'); close.className = 'px-btn icon sc-close'; close.textContent = '✕'; close.onclick = () => scene.select(null); card.append(close);
  if (obj.kind === 'villager') {
    const p = obj.person, head = document.createElement('div'); head.className = 'sc-head';
    const info = document.createElement('div'); head.append(portraitCanvas(p.plan), info); card.append(head);
    const upd = () => { info.innerHTML = `<b>${esc(p.name)}</b><br>${esc(p.wanderer ? 'Wanderer · ' + p.job : p.job)}<br><span class="small">${p.stimmung ? 'wirkt ' + esc(p.stimmung) : ''}${p.wesen ? ' · ' + esc(p.wesen) : ''}</span><br><span class="small muted">${esc(p.activity || '')}</span>${p.erinnerung ? `<br><span class="small muted">Erinnert sich: ${esc(p.erinnerung)}</span>` : ''}`; };
    upd(); selTimer = setInterval(upd, 1000);
    const quest = btn('Auf Quest mitnehmen', false, () => {}); quest.disabled = true; quest.title = 'Quests werden nach dem Tutorial freigeschaltet';
    card.append(row(btn('Ansprechen', false, () => startTalk(p)), quest, btn('Kamera folgen', false, () => scene.select(obj))));
  } else {
    const s = obj.sprite, c = CATALOG[s.type], plot = PLOTS.find((q) => q.id === s.plotId);
    const h = document.createElement('div'); h.innerHTML = `<b>${esc(c?.name || BUILDINGS_NAME(s.type))}</b><br><span class="small muted">Bauplatz ${plot?.id} · Stufe 1</span>`; card.append(h);
    for (const line of c ? summary(s.type) : []) card.append(p(line, 'small'));
    const workers = scene.village.people.filter((q) => scene.village.spriteOf(scene.village.placeFor(q)) === s), dwellers = scene.village.people.filter((q) => q.home === s);
    if (workers.length) card.append(p('Arbeiten hier: ' + workers.map((q) => q.name).join(', '), 'small'));
    if (dwellers.length) card.append(p('Wohnen hier: ' + dwellers.map((q) => q.name).join(', '), 'small'));
    if (c?.folgen?.[0]) card.append(p('• ' + c.folgen[0], 'small muted'));
    const up = btn('Ausbauen', false, () => {}); up.disabled = true; up.title = 'Echtes Bauen folgt im nächsten Schritt';
    const team = btn('Bewohner ansehen', false, () => openMenu('bewohner')); team.disabled = !workers.length && !dwellers.length;
    card.append(row(up, team));
  }
}
const BUILDINGS_NAME = (t) => t;
function startTalk(p) {
  const box = $('dialog'); p.talking = true; box.hidden = false; box.innerHTML = ''; $('selcard').hidden = true; clearInterval(selTimer);
  const fr = scene.village.people.find((q) => q.id === p.freund);
  const race = me?.race || me?.look?.race || 'mensch', herk = me?.herkunft || me?.look?.herkunft || 'waldlaeufer', attrs = me?.attrs || charAttrs(race, herk);
  const gebaeude = [...new Set(scene.sprites.map((s) => s.type).filter((x) => x !== 'feld'))].map(withArticle);
  const t = buildTalk({ name: p.name, job: p.job, wesen: p.wesen || 'bodenständig', stimmung: p.stimmung || 'fremd', time: scene.mood.time, weather: weatherNow, season: scene.mood.season, freund: fr?.name, gebaeude, du: me?.name || 'du',
    race, herkunft: herk, attrs, CHECKS, ATTRS, HERKUNFT, odds: (id) => oddsWord(checkOdds(id, attrs, herk)) });
  const online = p.id && p.id < 1000, conv = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).slice(0, 36);
  const head = document.createElement('div'); head.className = 'dl-head'; const log = document.createElement('div'); log.className = 'dl-log';
  const nameEl = document.createElement('div'); nameEl.innerHTML = `<b>${esc(p.name)}</b> <span class="muted small">· ${esc(p.job)}</span>`;
  const right = document.createElement('div'); right.className = 'dl-right'; right.append(nameEl, log);
  head.append(portraitCanvas(p.plan, 110), right); box.append(head);
  const opts = document.createElement('ol'); opts.className = 'dl-opts'; box.append(opts);
  let cur = null, left = t.patience, lastReact = 'neutral', busy = false, ideas = [];
  const history = [];
  const say = (who, text, cls) => { const el = document.createElement('p'); el.className = cls || who; el.textContent = text; log.append(el); log.scrollTop = log.scrollHeight; if (who === 'me' || who === 'npc') history.push({ wer: who === 'me' ? 'ich' : 'npc', text }); };
  const note = (html) => { const el = document.createElement('p'); el.className = 'note'; el.innerHTML = html; log.append(el); log.scrollTop = log.scrollHeight; };
  const end = () => { document.removeEventListener('keydown', onKey); p.talking = false; box.hidden = true; box.innerHTML = ''; if (scene.selection?.person === p) showSelCard(scene.selection); };
  const finish = (react) => { opts.innerHTML = ''; setTimeout(() => { say('npc', t.bye(react)); const li = document.createElement('li'); li.append(btn('Gespräch beenden', false, end)); opts.append(li); }, 600); };
  const onKey = (e) => { if (busy || e.target.tagName === 'INPUT') return; const n = Number(e.key); if (n >= 1 && n <= 9) opts.querySelectorAll('button.dl-opt')[n - 1]?.click(); if (e.key === 'Escape') end(); };
  document.addEventListener('keydown', onKey);
  const addJournal = async (j) => {
    if (!j) return; journalLocal.set(j.key, { ...j, npc: p.name, kind: 'geruecht', status: 'offen' });
    if (online) { const { error } = await db.rpc('add_journal', { p_kind: 'geruecht', p_key: j.key, p_title: j.title, p_text: j.text, p_npc: p.id }); if (error) console.warn('Tagebuch:', error.message); }
    note(`Tagebuch: <b>${esc(j.title)}</b>`);
  };
  const rollLine = (r) => `${esc(ATTRS[r.eigenschaft] || r.eigenschaft)}-Probe · Wurf <b>${r.wurf}</b> ${r.mod >= 0 ? '+' : '−'} ${Math.abs(r.mod)}${r.bonus ? ` + ${r.bonus} (${esc(HERKUNFT[herk].name)})` : ''} = ${r.gesamt} gegen ${r.dc} · <b class="${r.erfolg ? 'ok' : 'bad'}">${r.wurf === 20 ? 'Kritischer Erfolg' : r.wurf === 1 ? 'Patzer' : r.erfolg ? 'Erfolg' : 'Misserfolg'}</b>`;
  const tone = async (tn, topic) => {
    if (online) { const { data, error } = await db.rpc('talk_to_npc', { p_npc: p.id, p_tone: tn, p_topic: topic || 'alltag', p_conv: conv }); if (!error && data) return data; if (error) console.warn('Gespräch:', error.message); }
    return { reaktion: { freundlich: 'freundlich', loben: 'erfreut', scherzen: Math.random() < 0.5 ? 'erfreut' : 'kuehl', helfen: 'erfreut', fragen: 'freundlich', kritisieren: 'kuehl' }[tn] };
  };
  const apply = (res) => { if (!res) return; if (res.reaktion) lastReact = p.lastReact = res.reaktion; if (res.stimmung) p.stimmung = res.stimmung; if (res.erinnerung) p.erinnerung = res.erinnerung; };
  const after = () => { left--; busy = false; if (left <= 0 || lastReact === 'veraergert' || lastReact === 'kurz') return finish(lastReact); offer(); };
  const item = (o, i) => {
    const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'dl-opt' + (o.kind === 'check' ? ' check' : o.kind === 'free' || o.kind === 'idea' ? ' free' : '');
    b.innerHTML = `<span class="num">${i + 1}.</span> ${o.tag ? `<span class="tag">${esc(o.tag)}</span> ` : ''}${esc(o.text)}${o.hint ? ` <span class="hint">(${esc(o.hint)})</span>` : ''}`;
    b.onclick = () => { if (!busy) choose(o); }; li.append(b); return li;
  };
  const offer = () => {
    opts.innerHTML = '';
    const list = t.options(cur);
    for (const idea of ideas) list.unshift({ kind: 'idea', tag: '[Idee]', text: idea });
    if (online) list.push({ kind: 'free', tag: '[Eigene Worte]', text: 'Selbst etwas sagen …' });
    list.push({ kind: 'bye', text: 'Verabschieden.' });
    list.forEach((o, i) => opts.append(item(o, i)));
  };
  const freeForm = () => {
    opts.innerHTML = '';
    const li = document.createElement('li'); li.className = 'dl-free';
    const f = document.createElement('form'); const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 300; inp.placeholder = `Was sagst du zu ${p.name}?`; inp.autocomplete = 'off';
    const send = btn('Sagen', true, () => {}); send.type = 'submit'; const back = btn('Zurück', false, () => offer());
    f.append(inp, send, back); li.append(f); opts.append(li); setTimeout(() => inp.focus(), 30);
    f.onsubmit = (e) => { e.preventDefault(); const v = inp.value.trim(); if (v) freeSay(v); };
  };
  const freeSay = async (text) => {
    busy = true; ideas = []; opts.innerHTML = '<li class="muted small">…</li>'; say('me', text);
    let res = null;
    try {
      const { data, error } = await db.functions.invoke('npc-talk', { body: { npc: p.id, conv, text, verlauf: history.slice(-9, -1), gebaeude, umgebung: `${TIME_NAMES[scene.mood.time]}, ${SEASON_NAMES[scene.mood.season]}, ${WEATHER_NAMES[weatherNow] || 'klar'}` } });
      if (error) console.warn('KI:', error.message); else res = data;
    } catch (e) { console.warn('KI:', e); }
    if (!res || res.fallback || !res.antwort) {
      const why = { kein_schluessel: 'KI noch nicht eingerichtet', tageslimit: 'KI-Tageslimit erreicht', zu_schnell: 'kurz warten', gemini_limit: 'KI gerade ausgelastet' }[res?.grund] || 'KI gerade nicht erreichbar';
      note(`<span class="muted">(${esc(why)} – ${esc(p.name)} antwortet aus dem Bauch heraus)</span>`);
      const r = await tone('fragen', cur?.topic); apply(r); say('npc', t.reaction(r.reaktion)); return after();
    }
    if (res.probe) note(rollLine(res.probe));
    apply(res); say('npc', res.antwort);
    if (res.journal) note(`Tagebuch: <b>${esc(res.journal.title)}</b>`);
    ideas = res.vorschlaege || [];
    after();
  };
  const choose = async (o) => {
    if (o.kind === 'bye') { opts.innerHTML = ''; say('me', o.text); say('npc', t.bye(lastReact)); setTimeout(end, 1500); return; }
    if (o.kind === 'free') return freeForm();
    if (o.kind === 'idea') return freeSay(o.text);
    busy = true; ideas = []; opts.innerHTML = '<li class="muted small">…</li>'; say('me', o.text);
    if (o.kind === 'topic') { cur = t.nextTopic(); setTimeout(() => { say('npc', cur.text); busy = false; offer(); }, 500); return; }
    if (o.kind === 'follow') {
      t.markAsked(o.id); apply(await tone('fragen', cur?.topic));
      setTimeout(async () => { say('npc', o.answer); if (o.journal) await addJournal(t.journal(o.journal)); after(); }, 500); return;
    }
    if (o.kind === 'check') {
      t.markChecked(o.check); let r = null;
      if (online) { const { data, error } = await db.rpc('talk_check', { p_npc: p.id, p_check: o.check, p_conv: conv }); if (!error && data) r = data; else if (error) console.warn('Probe:', error.message); }
      if (!r) { const ch = CHECKS[o.check], w = 1 + Math.floor(Math.random() * 20), md = attrs[ch.attr] - 2, bo = herk === ch.fav ? 2 : 0; r = { wurf: w, mod: md, bonus: bo, dc: ch.dc, gesamt: w + md + bo, erfolg: w === 20 || (w !== 1 && w + md + bo >= ch.dc), eigenschaft: ch.attr, reaktion: 'neutral' }; }
      note(rollLine(r)); apply(r);
      setTimeout(async () => { say('npc', t.checkText(o.def, r.erfolg)); if (r.erfolg && o.def.j) await addJournal(t.journal(o.def.j)); after(); }, 700); return;
    }
    const r = await tone(o.tone, cur?.topic); apply(r);
    setTimeout(() => { say('npc', t.reaction(r.reaktion)); if (left > 1 && r.reaktion !== 'veraergert' && r.reaktion !== 'kurz') { cur = t.nextTopic(); setTimeout(() => say('npc', cur.text), 500); setTimeout(after, 550); } else after(); }, 450);
  };
  say('npc', t.opener()); cur = t.nextTopic(); busy = true; setTimeout(() => { say('npc', cur.text); busy = false; offer(); }, 600);
}
const journalLocal = new Map();
function updateChip() { if (!scene) return; $('mood-chip').textContent = `${SEASON_NAMES[scene.mood.season]} · ${TIME_NAMES[scene.mood.time]} · ${WEATHER_NAMES[weatherNow] || 'Klar'}`; }

$('gear-btn').onclick = () => { $('gear-menu').hidden = !$('gear-menu').hidden; };
$('logout-btn').onclick = () => db.auth.signOut();

async function startGame() {
  $('auth-screen').hidden = true; $('game').hidden = false;
  buildDock();
  if (!scene) {
    scene = new Scene($('stage'), {
      onMood: () => setTimeout(updateChip),
      onWeather: (w) => { weatherNow = w; updateChip(); },
      onHover: (h) => {
        if (!h) return hideTip();
        if (h.kind === 'villager') { const p = h.person; return showTip(p.wanderer ? `<b>${esc(p.name)}</b><br>Wanderer · ${esc(p.job)}<div class="tt-actions">${esc(p.activity)}</div>` : `<b>${esc(p.name)}</b><br>${esc(p.job)} · wirkt ${esc(p.stimmung)}<div class="tt-actions">${esc(p.activity || '')}${p.erinnerung ? '<br>Erinnert sich: ' + esc(p.erinnerung) : ''}</div>`, { x: h.x, y: h.y }); }
        if (h.kind === 'building') showTip(`<b>${h.building.name}</b><br>${CATALOG[h.sprite.type] ? summary(h.sprite.type).map(esc).join('<br>') : h.building.desc}<br><span class="muted">Gebäudegröße ${h.building.size} · Bauplatz ${h.plot.id} (Platz bis ${h.plot.size})${h.plot.shadow ? ' · im Bergschatten' : ''}</span><div class="tt-actions">Stufe 1 · fertig<br>Ausbauen · Bewohner zuweisen (bald)</div>`, { x: h.x, y: h.y });
        else showTip(`<b>Bauplatz ${h.plot.id}</b><br>Platz bis Größe ${h.plot.size}${h.plot.shadow ? ' · im Bergschatten' : ''}<div class="tt-actions">frei</div>`, { x: h.x, y: h.y });
      },
      onReady: () => updateChip(),
      onSelectObject: (obj) => showSelCard(obj),
      onPlots: (on) => $('game').classList.toggle('placing', on),
      onSelect: () => { if (!$('panel').hidden && active === 'dorf') renderPanel('dorf'); },
    });
    window.mossheart = scene; // für Tests in der Konsole
  }
  db.rpc('get_my_residents').then(({ data, error }) => { if (error) console.warn('Bewohner:', error.message); scene.setResidents(error ? null : data); });
  db.rpc('get_my_character').then(({ data, error }) => {
    if (error) console.warn('Charakter:', error.message);
    me = data && typeof data === 'object' ? data : { name: 'Du', look: null };
    if (me.look) scene.setHeroPlan(planFromLook(me.look, me.name)); else showCreator(true);
  });
  const { data } = await db.rpc('get_my_village');
  village = Array.isArray(data) ? data[0] : data;
  $('who').textContent = village ? `Angemeldet als ${village.character_name}` : '';
}
function stopGame() { $('game').hidden = true; $('auth-screen').hidden = false; $('password').value = ''; $('gear-menu').hidden = true; }
db.auth.onAuthStateChange((_e, session) => { if (session) { if ($('game').hidden) startGame(); } else stopGame(); });
setMode('login');
