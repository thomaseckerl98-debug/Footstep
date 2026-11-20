import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=5';
import { renderPanorama } from './scene.js?v=5';
import { WorldMap } from './map.js?v=5';

const $ = (id) => document.getElementById(id);

// Hintergrund der Anmeldung sofort zeichnen
renderPanorama($('auth-scene'), { village: true, huts: 4, seed: 11 });

const configured =
  SUPABASE_URL.startsWith('https://') && !SUPABASE_ANON_KEY.startsWith('HIER_');
if (!configured) {
  $('config-warning').hidden = false;
  $('submit-btn').disabled = true;
  throw new Error('Supabase nicht konfiguriert (config.js)');
}

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ───────────── Login / Registrierung ───────────── */
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

function showMsg(id, text, type = '') {
  const el = $(id);
  el.textContent = text;
  el.className = 'msg ' + type;
}

$('tab-login').onclick = () => setMode('login');
$('tab-register').onclick = () => setMode('register');

$('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('submit-btn');
  btn.disabled = true;
  showMsg('auth-msg', '…');
  try {
    const email = $('email').value.trim();
    const password = $('password').value;

    if (mode === 'register') {
      const name = $('character').value.trim();
      const { data: free, error: nameErr } = await db.rpc('character_name_available', { p_name: name });
      if (nameErr) throw nameErr;
      if (!free) return showMsg('auth-msg', 'Dieser Charaktername ist schon vergeben.', 'error');

      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: { data: { character_name: name } },
      });
      if (error) throw error;
      if (!data.session) {
        showMsg('auth-msg', 'Fast geschafft: Bitte bestätige deine E-Mail und melde dich dann an.', 'ok');
      }
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    showMsg('auth-msg', translateError(err), 'error');
  } finally {
    btn.disabled = false;
  }
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

$('logout-btn').onclick = () => db.auth.signOut();

/* ───────────── Menüs ───────────── */
const VIEWS = ['dorf', 'karte', 'diplomatie'];

function showView() {
  const name = location.hash.slice(1);
  const view = VIEWS.includes(name) ? name : 'dorf';
  for (const v of VIEWS) $('view-' + v).hidden = v !== view;
  document.querySelectorAll('.nav a').forEach((a) => {
    const active = a.dataset.view === view;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (view === 'karte') worldMap.resize();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', showView);

/* ───────────── Weltkarte & Diplomatie ───────────── */
const worldMap = new WorldMap($('world-map'), (v) => {
  const info = $('map-info');
  info.textContent = '';
  if (!v) { info.textContent = 'Kein Dorf ausgewählt.'; return; }
  const strong = document.createElement('strong');
  strong.textContent = v.village_name;
  info.append(strong, ` · Häuptling ${v.character_name} · (${v.x} | ${v.y})${v.is_me ? ' · dein Dorf' : ''}`);
});

function renderChiefs(villages) {
  const list = $('chief-list');
  list.textContent = '';
  if (!villages.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'Noch keine anderen Häuptlinge.';
    list.append(li);
    return;
  }
  for (const v of villages) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = v.character_name + (v.is_me ? ' (du)' : '');
    if (v.is_me) name.className = 'me';
    const coords = document.createElement('span');
    coords.className = 'coords';
    coords.textContent = `${v.village_name} · (${v.x} | ${v.y})`;
    li.append(name, coords);
    list.append(li);
  }
}

async function loadWorld() {
  const { data, error } = await db.rpc('get_world_map');
  if (error) return console.warn('Weltkarte:', error.message);
  worldMap.setData(data);
  renderChiefs(data);
}

/* ───────────── Dorf ───────────── */
let village = null;
let serverOffsetMs = 0;    // Serverzeit minus Geräteuhr
let fetchedAtServerMs = 0; // Serverzeit zum Abrufzeitpunkt
let tickTimer = null;
let syncTimer = null;
let sceneDrawn = false;

async function loadVillage() {
  const { data, error } = await db.rpc('get_my_village');
  if (error) return showMsg('game-msg', translateError(error), 'error');
  if (!data) {
    return showMsg('game-msg', 'Kein Dorf gefunden. Bitte melde dich bei Claude.', 'error');
  }
  village = data;
  fetchedAtServerMs = Date.parse(data.server_now);
  serverOffsetMs = fetchedAtServerMs - Date.now();

  $('char-name').textContent = data.character_name;
  $('village-name').textContent = data.village_name;
  $('village-pos').textContent = `(${data.x} | ${data.y})`;
  $('wood-rate').textContent = Number(data.wood_per_hour).toLocaleString('de-DE');
  if (!sceneDrawn) {
    renderPanorama($('village-scene'), { village: true, huts: 3, seed: data.x * 100 + data.y });
    sceneDrawn = true;
  }
  showMsg('game-msg', '');
  tick();
}

function tick() {
  if (!village) return;
  const nowServer = Date.now() + serverOffsetMs;
  const hours = (nowServer - fetchedAtServerMs) / 3_600_000;
  const wood = Number(village.wood) + Number(village.wood_per_hour) * hours;
  $('wood').textContent = Math.floor(wood).toLocaleString('de-DE');
  $('server-time').textContent = new Date(nowServer).toLocaleString('de-DE');
  const diffSec = Math.round(serverOffsetMs / 1000);
  $('clock-diff').textContent = diffSec === 0 ? 'keine' : `${diffSec > 0 ? '+' : ''}${diffSec} s`;
}

function startGame() {
  $('auth-screen').hidden = true;
  $('app').hidden = false;
  showView();
  loadVillage();
  loadWorld();
  clearInterval(tickTimer);
  clearInterval(syncTimer);
  tickTimer = setInterval(tick, 1000);
  syncTimer = setInterval(() => { loadVillage(); loadWorld(); }, 60_000);
}

function stopGame() {
  clearInterval(tickTimer);
  clearInterval(syncTimer);
  village = null;
  sceneDrawn = false;
  $('app').hidden = true;
  $('auth-screen').hidden = false;
  $('password').value = '';
}

db.auth.onAuthStateChange((_event, session) => {
  if (session) {
    if ($('app').hidden) startGame(); // Token-Refresh o. Ä. nicht neu starten
  } else {
    stopGame();
  }
});

setMode('login');
