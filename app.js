import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=7';
import { Scene, realMood } from './game/scene.js?v=9';
import { openCreator } from './game/creator.js?v=3';
import { buildTalk } from './game/dialog.js?v=4';
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
  { id: 'diplomatie', name: 'Diplomatie', tip: 'Dein Notizbuch über die Menschen im Tal: Eindrücke, Erlebtes, Gefallen.' },
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
    if (villageState) {
      body.append(p(`Holz im Lager: ${Math.floor(villageState.holz)}`, 'small'));
      if (villageState.auftraege.length) { body.append(h3('Aufträge im Dorf')); for (const a of villageState.auftraege) body.append(p(a.status === 'wartet_holz' ? `${a.npc}: ${a.titel} – wartet auf ${a.holz} Holz` : `${a.npc} arbeitet an: ${a.titel} – fertig ${whenText(a.faellig_at)}`, 'small')); }
    }
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
  } else if (id === 'diplomatie') {
    renderPeople(body);
  } else if (id === 'karte') {
    body.append(p('Die große Weltkarte folgt. Bisher bekannte Dörfer:', 'muted'));
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
    if (villageState?.auftraege?.length) {
      body.append(h3('Abmachungen'));
      const ab = document.createElement('ul'); ab.className = 'journal'; body.append(ab);
      for (const a of villageState.auftraege) { const li = document.createElement('li'); li.innerHTML = `<b>${esc(a.npc)}: ${esc(a.titel)}</b><br><span class="small">${a.status === 'wartet_holz' ? `Wartet darauf, dass ich ${a.holz} Holz bringe.` : `In Arbeit – fertig ${esc(whenText(a.faellig_at))}.`}</span>`; ab.append(li); }
      body.append(h3('Gerüchte und Hinweise'));
    }
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
const withArticleAkk = (t) => (NEUTR.has(t) ? 'das ' : MASK.has(t) ? 'den ' : 'die ') + (CATALOG[t]?.name || t);
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
async function startTalk(p) {
  const box = $('dialog'); p.talking = true; box.hidden = false; box.innerHTML = '<p class="muted small">…</p>'; $('selcard').hidden = true; clearInterval(selTimer);
  const online = p.id && p.id < 1000, conv = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).slice(0, 36);
  // Was diese Figur weiß (nur Schlüssel, keine Geheimnisse) und ob die KI heute noch antworten kann
  let brief = null;
  if (online) {
    const [b1, b2] = await Promise.all([db.rpc('get_npc_brief', { p_npc: p.id }), db.rpc('ai_status')]);
    if (!b1.error) brief = b1.data; if (!b2.error && b2.data) aiState = b2.data;
  }
  box.innerHTML = '';
  const fr = scene.village.people.find((q) => q.id === p.freund);
  const race = me?.race || me?.look?.race || 'mensch', herk = me?.herkunft || me?.look?.herkunft || 'waldlaeufer', attrs = me?.attrs || charAttrs(race, herk);
  const gebaeude = [...new Set(scene.sprites.map((s) => s.type).filter((x) => x !== 'feld'))].map((g) => ({ nom: withArticle(g), akk: withArticleAkk(g) }));
  const t = buildTalk({ name: p.name, job: p.job, wesen: p.wesen || 'bodenständig', stimmung: p.stimmung || 'fremd', time: scene.mood.time, weather: weatherNow, season: scene.mood.season, freund: fr?.name, gebaeude, du: me?.name || 'du',
    race, herkunft: herk, attrs, CHECKS, ATTRS, HERKUNFT, odds: (id) => oddsWord(checkOdds(id, attrs, herk)), wissen: brief?.wissen || null, gefragt: brief?.gefragt || [], deals: brief?.auftrag_optionen || [], abmachung: brief?.abmachung || null, holz: brief?.holz, whenText });
  const head = document.createElement('div'); head.className = 'dl-head'; const log = document.createElement('div'); log.className = 'dl-log';
  const nameEl = document.createElement('div'); nameEl.innerHTML = `<b>${esc(p.name)}</b> <span class="muted small">· ${esc(p.job)}</span>`;
  const right = document.createElement('div'); right.className = 'dl-right'; right.append(nameEl, log);
  head.append(portraitCanvas(p.plan, 110), right); box.append(head);
  const opts = document.createElement('ol'); opts.className = 'dl-opts'; box.append(opts);
  let cur = null, left = t.patience, lastReact = 'neutral', busy = false, ideas = [], spoken = 0, aiUsed = 0, closed = false;
  const history = [], highlights = [];
  const say = (who, text, cls) => { const el = document.createElement('p'); el.className = cls || who; el.textContent = text; log.append(el); log.scrollTop = log.scrollHeight; if (who === 'me' || who === 'npc') history.push({ wer: who === 'me' ? 'ich' : 'npc', text }); if (who === 'me') spoken++; };
  const note = (html) => { const el = document.createElement('p'); el.className = 'note'; el.innerHTML = html; log.append(el); log.scrollTop = log.scrollHeight; };
  const end = () => {
    if (closed) return; closed = true;
    document.removeEventListener('keydown', onKey); p.talking = false; box.hidden = true; box.innerHTML = '';
    if (scene.selection?.person === p) showSelCard(scene.selection);
    if (online && spoken >= 2) writeEncounterNote(p, history, highlights, spoken, aiUsed);
  };
  const finish = (react) => { opts.innerHTML = ''; setTimeout(() => { say('npc', t.bye(react)); const li = document.createElement('li'); li.append(btn('Gespräch beenden', false, end)); opts.append(li); }, 600); };
  const onKey = (e) => { if (busy || e.target.tagName === 'INPUT') return; const n = Number(e.key); if (n >= 1 && n <= 9) opts.querySelectorAll('button.dl-opt:not(:disabled)')[n - 1]?.click(); if (e.key === 'Escape') end(); };
  document.addEventListener('keydown', onKey);
  const addJournal = async (j) => {
    if (!j) return; journalLocal.set(j.key, { ...j, npc: p.name, kind: 'geruecht', status: 'offen' }); highlights.push(`Ich habe etwas erfahren: ${j.title}.`);
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
    const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'dl-opt' + (o.kind === 'check' ? ' check' : o.kind === 'free' || o.kind === 'idea' ? ' free' : '') + (o.off ? ' off' : '');
    b.innerHTML = `<span class="num">${o.off ? '–' : i + 1 + '.'}</span> ${o.tag ? `<span class="tag">${esc(o.tag)}</span> ` : ''}<span class="txt">${esc(o.text)}</span>${o.hint ? ` <span class="hint">(${esc(o.hint)})</span>` : ''}${o.why ? `<span class="why">${esc(o.why)}</span>` : ''}`;
    if (o.off) b.disabled = true; else b.onclick = () => { if (!busy) choose(o); };
    li.append(b); return li;
  };
  const offer = () => {
    opts.innerHTML = '';
    const list = t.options(cur);
    if (aiState.verfuegbar) for (const idea of ideas) list.unshift({ kind: 'idea', tag: '[Idee]', text: idea });
    let n = 0;
    for (const o of list) opts.append(item(o, n++));
    if (online) {
      if (aiState.verfuegbar) opts.append(item({ kind: 'free', tag: '[Eigene Worte]', text: 'Selbst etwas sagen …' }, n++));
      else opts.append(item({ kind: 'free', off: true, tag: '[Eigene Worte]', text: 'Selbst etwas sagen …', why: aiWhy(aiState) }, n));
    }
    opts.append(item({ kind: 'bye', text: 'Verabschieden.' }, n));
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
      const { data, error } = await db.functions.invoke('npc-talk', { body: { npc: p.id, conv, text, verlauf: history.slice(-11, -1), gebaeude: gebaeude.map((g) => g.nom), umgebung: `${TIME_NAMES[scene.mood.time]}, ${SEASON_NAMES[scene.mood.season]}, ${WEATHER_NAMES[weatherNow] || 'klar'}` } });
      if (error) console.warn('KI:', error.message); else res = data;
    } catch (e) { console.warn('KI:', e); }
    if (!res || res.fallback || !res.antwort) {
      if (res && ['gemini_limit', 'tageslimit'].includes(res.grund) && !res.kurz) aiState = { verfuegbar: false, grund: res.grund, bis: res.bis };
      note(`<span class="muted">(${esc(aiWhy(res || {}))} – ${esc(p.name)} antwortet aus dem Bauch heraus)</span>`);
      const r = await tone('fragen', cur?.topic); apply(r); say('npc', t.reaction(r.reaktion)); return after();
    }
    aiUsed++; if (typeof res.rest === 'number') aiState.rest = res.rest;
    if (res.probe) { note(rollLine(res.probe)); highlights.push(res.probe.erfolg ? `Mein Versuch (${CHECKS[res.probe.id]?.name}) gelang.` : `Mein Versuch (${CHECKS[res.probe.id]?.name}) ging daneben.`); }
    apply(res); say('npc', res.antwort);
    if (res.zusage) { note(`Zusage: <b>${esc(res.zusage.text)}</b> <span class="muted">(im Notizbuch unter Diplomatie)</span>`); highlights.push(`${p.name} hat mir etwas zugesagt: ${res.zusage.text}.`); }
    if (res.journal) { note(`Tagebuch: <b>${esc(res.journal.title)}</b>`); highlights.push(`Ich habe etwas erfahren: ${res.journal.title}.`); }
    if (res.auftrag?.ok) { note(`Abmachung: <b>${esc(p.name)} macht ${esc(res.auftrag.titel)}</b>${res.auftrag.holz ? ` · bring ${res.auftrag.holz} Holz` : ` · fertig ${esc(whenText(res.auftrag.faellig_at))}`} <span class="muted">(Tagebuch)</span>`); highlights.push(`Wir haben eine Abmachung: ${p.name} macht ${res.auftrag.titel}.`); const st = await db.rpc('get_npc_brief', { p_npc: p.id }); if (!st.error) { brief = st.data; t.setDeal(brief.abmachung, brief.holz); } loadVillageState(); }
    ideas = res.vorschlaege || [];
    after();
  };
  const personal = async (what) => {
    let r = null;
    if (online) { const { data, error } = await db.rpc('ask_personal', { p_npc: p.id, p_what: what, p_conv: conv }); if (!error) r = data; else console.warn('Persönlich:', error.message); }
    t.markPersonal(what);
    if (r?.ok) { say('npc', r.text); note(`Notizbuch: <b>Neues über ${esc(p.name)}</b>`); highlights.push(what === 'geheimnis' ? `${p.name} hat mir ein Geheimnis anvertraut.` : what === 'ziel' ? `Ich weiß jetzt, was ${p.name} sich vom Leben wünscht.` : what === 'angst' ? `${p.name} hat mir von einer Angst erzählt.` : `Ich weiß jetzt, woher ${p.name} kommt.`); }
    else say('npc', t.refuse());
  };
  const choose = async (o) => {
    if (o.kind === 'bye') { opts.innerHTML = ''; say('me', o.text); say('npc', t.bye(lastReact)); setTimeout(end, 1500); return; }
    if (o.kind === 'free') return freeForm();
    if (o.kind === 'idea') return freeSay(o.text);
    busy = true; ideas = []; opts.innerHTML = '<li class="muted small">…</li>'; say('me', o.text);
    if (o.kind === 'topic') { cur = t.nextTopic(); setTimeout(() => { say('npc', cur.text); busy = false; offer(); }, 500); return; }
    if (o.kind === 'deal' || o.kind === 'deliver') {
      let r = { ok: false, grund: 'offline' };
      if (online) { const { data, error } = o.kind === 'deal' ? await db.rpc('create_deal', { p_npc: p.id, p_vorlage: o.vorlage }) : await db.rpc('deliver_deal', { p_deal: brief.abmachung.id }); if (!error && data) r = data; else if (error) console.warn('Abmachung:', error.message); }
      setTimeout(async () => {
        say('npc', t.dealText(r, o.kind));
        if (r.ok) {
          if (o.kind === 'deal') { const d = brief.auftrag_optionen.find((x) => x.id === o.vorlage); note(`Abmachung: <b>${esc(p.name)} macht ${esc(d?.titel || '')}</b>${r.holz ? ` · bring ${r.holz} Holz` : ''} <span class="muted">(Tagebuch)</span>`); highlights.push(`Wir haben eine Abmachung: ${p.name} macht ${d?.titel}.`); brief.abmachung = { id: null, titel: d?.titel, holz: r.holz, status: r.status, faellig_at: r.faellig_at }; brief.auftrag_optionen = []; }
          else { note(`Holz übergeben · <b>fertig ${esc(whenText(r.faellig_at))}</b>`); highlights.push(`Ich habe ${p.name} das Holz gebracht.`); brief.abmachung.status = 'in_arbeit'; brief.abmachung.faellig_at = r.faellig_at; brief.holz = r.holz; }
          t.setDeal?.(brief.abmachung, brief.holz); await loadVillageState();
          if (o.kind === 'deal' && r.status === 'wartet_holz') { const st = await db.rpc('get_npc_brief', { p_npc: p.id }); if (!st.error) { brief.abmachung = st.data.abmachung; t.setDeal?.(brief.abmachung, st.data.holz); } }
        }
        after();
      }, 600); return;
    }
    if (o.kind === 'personal_topic') { cur = t.personalTopic(); setTimeout(() => { say('npc', cur.text); busy = false; offer(); }, 500); return; }
    if (o.kind === 'personal') { apply(await tone('fragen', 'persoenlich')); setTimeout(async () => { await personal(o.what); after(); }, 500); return; }
    if (o.kind === 'follow') {
      t.markAsked(o.id); apply(await tone('fragen', cur?.topic));
      setTimeout(async () => { say('npc', o.answer); if (o.journal) await addJournal(t.journal(o.journal)); after(); }, 500); return;
    }
    if (o.kind === 'check') {
      t.markChecked(o.check); let r = null;
      if (online) { const { data, error } = await db.rpc('talk_check', { p_npc: p.id, p_check: o.check, p_conv: conv }); if (!error && data) r = data; else if (error) console.warn('Probe:', error.message); }
      if (!r) { const ch = CHECKS[o.check], w = 1 + Math.floor(Math.random() * 20), md = attrs[ch.attr] - 2, bo = herk === ch.fav ? 2 : 0; r = { wurf: w, mod: md, bonus: bo, dc: ch.dc, gesamt: w + md + bo, erfolg: w === 20 || (w !== 1 && w + md + bo >= ch.dc), eigenschaft: ch.attr, reaktion: 'neutral' }; }
      note(rollLine(r)); apply(r); highlights.push(r.erfolg ? `${CHECKS[o.check].name} bei ${p.name}: gelungen.` : `${CHECKS[o.check].name} bei ${p.name}: ging daneben.`);
      setTimeout(async () => {
        if (o.def.personal && r.erfolg) await personal(o.def.personal);
        else { say('npc', t.checkText(o.def, r.erfolg)); if (r.erfolg && o.def.j) await addJournal(t.journal(o.def.j)); }
        after();
      }, 700); return;
    }
    const r = await tone(o.tone, cur?.topic); apply(r);
    setTimeout(() => { say('npc', t.reaction(r.reaktion, o.tone, cur?.topic)); if (left > 1 && r.reaktion !== 'veraergert' && r.reaktion !== 'kurz') { cur = t.nextTopic(); setTimeout(() => say('npc', t.transition(cur.text)), 700); setTimeout(after, 750); } else after(); }, 450);
  };
  say('npc', t.opener());
  // Hat die Figur etwas über dich gehört? Dann spricht sie es vielleicht an.
  const heard = brief?.gehoert?.[0];
  if (heard && Math.random() < 0.6) setTimeout(() => say('npc', `Ich hab da was gehört … ${heard} Stimmt das?`), 300);
  cur = t.nextTopic(); busy = true; setTimeout(() => { say('npc', cur.text); busy = false; offer(); }, heard ? 1100 : 600);
}
let aiState = { verfuegbar: true };
let villageState = null, layoutSynced = false, layoutTimer = 0;
// „Morgen früh“, „heute gegen 18 Uhr“ … aus einem Zeitpunkt
function whenText(iso) {
  if (!iso) return 'bald';
  const d = new Date(iso), now = new Date(), h = d.getHours(), clock = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(), diff = Math.round((day(d) - day(now)) / 86400000);
  if (d <= now) return 'jetzt';
  const part = h < 5 ? 'in der Nacht' : h < 11 ? 'früh' : h < 14 ? 'gegen Mittag' : h < 18 ? 'am Nachmittag' : 'am Abend';
  if (diff === 0) return `heute ${part} (ca. ${clock} Uhr)`;
  if (diff === 1) return `morgen ${part} (ca. ${clock} Uhr)`;
  return `am ${d.toLocaleDateString('de-DE', { weekday: 'long' })} (ca. ${clock} Uhr)`;
}
async function loadVillageState() {
  const { data, error } = await db.rpc('get_village_state');
  if (error || !data) { if (error) console.warn('Dorf:', error.message); return; }
  villageState = data;
  if (Array.isArray(data.layout) && data.layout.length) scene.setLayout(data.layout);
  else await db.rpc('set_layout', { p_layout: scene.layout });
  layoutSynced = true;
  const bau = data.auftraege.filter((a) => a.status === 'in_arbeit').map((a) => ({ plot: a.plot, gebaeude: a.gebaeude, zusatz: a.zusatz, status: 'bau' }));
  scene.setExtras([...data.extras, ...bau]);
  scene.village?.setTasks(data.auftraege.filter((a) => a.status === 'in_arbeit').map((a) => ({ npc_id: a.npc_id, plot: a.plot, text: `arbeitet an: ${a.titel}` })));
  if (!$('panel').hidden && (active === 'dorf' || active === 'quest')) renderPanel(active);
}
const clock = (iso) => { try { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
function aiWhy(st) {
  if (st.grund === 'gemini_limit' && st.bis) return `KI-Kontingent erschöpft – bis ca. ${clock(st.bis)} Uhr nur vorgegebene Antworten`;
  if (st.grund === 'gemini_limit') return 'KI gerade ausgelastet – kurz warten';
  if (st.grund === 'gemini_ueberlastet') return 'Googles KI ist gerade überlastet – gleich nochmal versuchen';
  if (st.grund === 'tageslimit') return `Deine 60 freien Antworten für heute sind verbraucht – ab ca. ${clock(st.bis)} Uhr wieder`;
  if (st.grund === 'kein_schluessel') return 'KI noch nicht eingerichtet';
  if (st.grund === 'zu_schnell') return 'kurz durchatmen';
  return 'KI gerade nicht erreichbar';
}
// Nach jedem Gespräch: eine Notiz ins Notizbuch über diese Person (mit KI persönlich formuliert, sonst aus den Höhepunkten)
async function writeEncounterNote(p, history, highlights, spoken, aiUsed) {
  if (aiState.verfuegbar && (aiUsed > 0 || spoken >= 4)) {
    try {
      const { data } = await db.functions.invoke('npc-talk', { body: { modus: 'abschluss', npc: p.id, verlauf: history.slice(-16) } });
      if (data?.notiz) return;
      if (data?.grund && ['gemini_limit', 'tageslimit'].includes(data.grund) && data.bis) aiState = { verfuegbar: false, grund: data.grund, bis: data.bis };
    } catch (e) { console.warn('Notiz:', e); }
  }
  const mood = { 'treu ergeben': 'Ich spüre, dass ich mich auf ' + p.name + ' verlassen kann.', herzlich: 'Ich hatte ein gutes Gefühl dabei.', freundlich: 'Ein angenehmes Gespräch.', zurückhaltend: p.name + ' blieb mir gegenüber reserviert.', misstrauisch: p.name + ' traut mir nicht über den Weg.', feindselig: p.name + ' war offen feindselig.' }[p.stimmung] || '';
  const topics = history.filter((h) => h.wer === 'ich').slice(0, 2).map((h) => `„${h.text.slice(0, 60)}“`).join(', ');
  const txt = [`Habe mit ${p.name} gesprochen${topics ? ` (u. a. ${topics})` : ''}.`, ...highlights.slice(0, 3), mood].filter(Boolean).join(' ');
  db.rpc('add_note', { p_npc: p.id, p_kind: 'begegnung', p_text: txt }).then(({ error }) => error && console.warn('Notiz:', error.message));
}
const journalLocal = new Map();
// Diplomatie: Notizbuch über Menschen – keine Zahlen, nur Eindrücke, Erlebtes, Gefallen
function renderPeople(body) {
  body.append(p('Was ich über die Menschen im Tal weiß. Ich schreibe auf, was wir erlebt haben – und was ich von ihnen halte.', 'muted small'));
  const rep = document.createElement('div'); rep.className = 'rep'; body.append(rep);
  const list = document.createElement('div'); list.className = 'people'; body.append(list);
  list.append(p('…', 'muted small'));
  db.rpc('get_my_reputation').then(({ data, error }) => {
    if (error || !Array.isArray(data) || !data.length || active !== 'diplomatie') return;
    rep.innerHTML = `<h3>Was man sich über mich erzählt</h3><ul>${data.slice(0, 5).map((r) => `<li>${esc(r.wer)} hat von ${esc(r.quelle)} gehört: „${esc(r.text)}“</li>`).join('')}</ul>`;
  });
  db.rpc('get_people_notes').then(({ data, error }) => {
    if (active !== 'diplomatie') return; list.innerHTML = '';
    if (error || !Array.isArray(data)) { list.append(p('Das Notizbuch ist gerade nicht erreichbar.', 'muted small')); return; }
    const groups = { dorf: 'In meinem Dorf', begegnung: 'Unterwegs getroffen' };
    for (const [g, title] of Object.entries(groups)) {
      const ppl = data.filter((x) => x.gruppe === g); if (!ppl.length) continue;
      const h = document.createElement('h3'); h.textContent = title; list.append(h);
      for (const x of ppl.sort((a, b) => b.erlebt - a.erlebt)) {
        const det = document.createElement('details'); det.className = 'person';
        const sum = document.createElement('summary');
        const person = scene?.village.people.find((q) => q.id === x.id);
        if (person?.plan) sum.append(portraitCanvas(person.plan, 40));
        const t = document.createElement('div'); t.innerHTML = `<b>${esc(x.name)}</b> <span class="muted small">· ${esc(x.beruf)}</span><br><span class="small eindruck">${esc(x.eindruck)}</span>`; sum.append(t); det.append(sum);
        const ul = document.createElement('ul'); ul.className = 'notes';
        for (const f of x.gefallen || []) { const li = document.createElement('li'); li.className = 'gefallen'; li.textContent = 'Offene Zusage: ' + f; ul.append(li); }
        for (const n of x.notizen || []) { const li = document.createElement('li'); li.className = n.art; li.innerHTML = `<span class="muted small">${new Date(n.am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span> ${esc(n.text)}`; ul.append(li); }
        if (!ul.children.length) { const li = document.createElement('li'); li.className = 'muted'; li.textContent = 'Noch nichts aufgeschrieben. Vielleicht sollte ich ' + x.name + ' einmal ansprechen.'; ul.append(li); }
        det.append(ul); list.append(det);
      }
    }
  });
}
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
      onLayout: (layout) => { const k = JSON.stringify(layout); if (!layoutSynced || k === JSON.stringify(villageState?.layout)) return; clearTimeout(layoutTimer); layoutTimer = setTimeout(() => db.rpc('set_layout', { p_layout: layout }).then(({ error }) => { if (error) console.warn('Anordnung:', error.message); else if (villageState) villageState.layout = JSON.parse(k); }), 800); },
    });
    window.mossheart = scene; // für Tests in der Konsole
  }
  db.rpc('get_my_residents').then(({ data, error }) => { if (error) console.warn('Bewohner:', error.message); scene.setResidents(error ? null : data); });
  db.rpc('get_my_character').then(({ data, error }) => {
    if (error) console.warn('Charakter:', error.message);
    me = data && typeof data === 'object' ? data : { name: 'Du', look: null };
    if (me.look) scene.setHeroPlan(planFromLook(me.look, me.name)); else showCreator(true);
  });
  loadVillageState(); clearInterval(window.__villageTimer); window.__villageTimer = setInterval(loadVillageState, 120000);
  const { data } = await db.rpc('get_my_village');
  village = Array.isArray(data) ? data[0] : data;
  $('who').textContent = village ? `Angemeldet als ${village.character_name}` : '';
}
function stopGame() { $('game').hidden = true; $('auth-screen').hidden = false; $('password').value = ''; $('gear-menu').hidden = true; }
db.auth.onAuthStateChange((_e, session) => { if (session) { if ($('game').hidden) startGame(); } else stopGame(); });
setMode('login');
