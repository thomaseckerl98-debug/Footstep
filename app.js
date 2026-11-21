import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=7';
import { Scene, realMood } from './game/scene.js?v=7';
import { openCreator } from './game/creator.js?v=2';
import { buildTalk } from './game/dialog.js?v=1';
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
  { id: 'quest', name: 'Quest', tip: 'Gesperrt: wird nach dem Tutorial freigeschaltet.', locked: true },
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
      t.innerHTML = `<b>${esc(me.name)}</b><br>${esc(r.name)} · ${esc(r.desc)}<br><span class="small muted">Neigung: ${esc(r.neigung)}</span>`;
      wrap.append(cv, t); body.append(wrap);
      body.append(p('Fähigkeiten, Ausrüstung, Wunden und Narben folgen. Werte bleiben verdeckt.', 'muted small'));
    }
    body.append(row(btn('Aussehen ändern', false, () => showCreator(false))));
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
  const t = buildTalk({ name: p.name, job: p.job, wesen: p.wesen || 'bodenständig', stimmung: p.stimmung || 'fremd', time: scene.mood.time, weather: weatherNow, season: scene.mood.season, freund: fr?.name, gebaeude: [...new Set(scene.sprites.map((s) => s.type).filter((x) => x !== 'feld'))].map(withArticle), du: me?.name || 'du' });
  const head = document.createElement('div'); head.className = 'dl-head'; const log = document.createElement('div'); log.className = 'dl-log';
  const nameEl = document.createElement('div'); nameEl.innerHTML = `<b>${esc(p.name)}</b> <span class="muted small">· ${esc(p.job)}</span>`;
  const right = document.createElement('div'); right.className = 'dl-right'; right.append(nameEl, log);
  head.append(portraitCanvas(p.plan, 110), right); box.append(head);
  const opts = document.createElement('div'); opts.className = 'dl-opts'; box.append(opts);
  let round = 0, topic = 'alltag';
  const say = (who, text) => { const el = document.createElement('p'); el.className = who; el.textContent = text; log.append(el); log.scrollTop = log.scrollHeight; };
  const end = () => { p.talking = false; box.hidden = true; box.innerHTML = ''; if (scene.selection?.person === p) showSelCard(scene.selection); };
  const offer = () => {
    opts.innerHTML = '';
    for (const o of t.options()) { const b = document.createElement('button'); b.type = 'button'; b.className = 'px-btn dl-opt'; b.innerHTML = `<span class="small muted">${esc(o.label)}</span><br>${esc(o.text)}`; b.onclick = () => choose(o); opts.append(b); }
    const bye = btn('Verabschieden', false, () => { opts.innerHTML = ''; say('npc', t.bye(p.lastReact || 'neutral')); setTimeout(end, 1400); }); bye.classList.add('dl-bye'); opts.append(bye);
  };
  const choose = async (o) => {
    opts.innerHTML = '<p class="muted small">…</p>'; say('me', o.text);
    let res = null;
    if (p.id && p.id < 1000) { const { data, error } = await db.rpc('talk_to_npc', { p_npc: p.id, p_tone: o.tone, p_topic: topic }); if (!error && data && typeof data === 'object') res = data; else if (error) console.warn('Gespräch:', error.message); }
    if (!res) res = { reaktion: { freundlich: 'freundlich', loben: 'erfreut', scherzen: Math.random() < 0.5 ? 'erfreut' : 'kuehl', helfen: 'erfreut', fragen: 'freundlich', kritisieren: 'kuehl' }[o.tone] };
    p.lastReact = res.reaktion; if (res.stimmung) p.stimmung = res.stimmung; if (res.erinnerung) p.erinnerung = res.erinnerung;
    setTimeout(() => {
      say('npc', t.reaction(res.reaktion)); round++;
      if (round >= 3 || res.reaktion === 'veraergert' || res.reaktion === 'kurz') { opts.innerHTML = ''; setTimeout(() => { say('npc', t.bye(res.reaktion)); opts.append(btn('Gespräch beenden', false, end)); }, 700); return; }
      setTimeout(() => { const tl = t.topicLine(); topic = tl.topic; say('npc', tl.text); offer(); }, 800);
    }, 450);
  };
  say('npc', t.opener()); const tl = t.topicLine(); topic = tl.topic; setTimeout(() => { say('npc', tl.text); offer(); }, 600);
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
