import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=7';
import { Scene, realMood } from './game/scene.js?v=3';
import { drawIcon } from './game/icons.js?v=1';
import { PLOTS } from './game/world.js?v=2';
import { SW, SH } from './game/chars.js?v=1';

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
let scene = null, active = 'dorf', village = null, weatherNow = 'klar';

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
    body.append(p('Testmodus: Hier stellst du die fünf Gebäude und das Feld um und probierst Licht, Jahreszeit und Wetter aus. Im fertigen Spiel wird hier gebaut.', 'muted small'));
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
    const texts = { charakter: 'Hier gestaltest du bald deinen Helden: Aussehen, Fähigkeiten und alles, was er erlebt hat.', inventar: 'Hier liegen bald deine Ausrüstung und Gegenstände.' };
    body.append(p(texts[id] || '', 'muted'));
  }
  $('panel').hidden = false;
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
        if (h.kind === 'building') showTip(`<b>${h.building.name}</b><br>${h.building.desc}<br><span class="muted">Gebäudegröße ${h.building.size} · Bauplatz ${h.plot.id} (Platz bis ${h.plot.size})${h.plot.shadow ? ' · im Bergschatten' : ''}</span><div class="tt-actions">Stufe 1 · fertig<br>Ausbauen · Bewohner zuweisen (bald)</div>`, { x: h.x, y: h.y });
        else showTip(`<b>Bauplatz ${h.plot.id}</b><br>Platz bis Größe ${h.plot.size}${h.plot.shadow ? ' · im Bergschatten' : ''}<div class="tt-actions">frei</div>`, { x: h.x, y: h.y });
      },
      onReady: () => updateChip(),
      onPlots: (on) => $('game').classList.toggle('placing', on),
      onSelect: () => { if (!$('panel').hidden && active === 'dorf') renderPanel('dorf'); },
    });
    window.mossheart = scene; // für Tests in der Konsole
  }
  db.rpc('get_my_residents').then(({ data, error }) => { if (error) console.warn('Bewohner:', error.message); scene.setResidents(error ? null : data); });
  const { data } = await db.rpc('get_my_village');
  village = Array.isArray(data) ? data[0] : data;
  $('who').textContent = village ? `Angemeldet als ${village.character_name}` : '';
}
function stopGame() { $('game').hidden = true; $('auth-screen').hidden = false; $('password').value = ''; $('gear-menu').hidden = true; }
db.auth.onAuthStateChange((_e, session) => { if (session) { if ($('game').hidden) startGame(); } else stopGame(); });
setMode('login');
