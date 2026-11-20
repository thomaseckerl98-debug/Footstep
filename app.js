import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=3';

const $ = (id) => document.getElementById(id);

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

/* ───────────── Spielansicht ───────────── */
let village = null;
let serverOffsetMs = 0;   // Serverzeit minus Geräteuhr
let fetchedAtServerMs = 0; // Serverzeit zum Abrufzeitpunkt
let tickTimer = null;
let syncTimer = null;

async function loadVillage() {
  const { data, error } = await db.rpc('get_my_village');
  if (error) return showMsg('game-msg', translateError(error), 'error');
  if (!data) {
    return showMsg('game-msg',
      'Kein Dorf gefunden. Wurde schema.sql vor der Registrierung ausgeführt?', 'error');
  }
  village = data;
  fetchedAtServerMs = Date.parse(data.server_now);
  serverOffsetMs = fetchedAtServerMs - Date.now();

  $('char-name').textContent = data.character_name;
  $('village-name').textContent = data.village_name;
  $('village-pos').textContent = `(${data.x} | ${data.y})`;
  $('wood-rate').textContent = Number(data.wood_per_hour).toLocaleString('de-DE');
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
  $('auth-view').hidden = true;
  $('game-view').hidden = false;
  loadVillage();
  clearInterval(tickTimer);
  clearInterval(syncTimer);
  tickTimer = setInterval(tick, 1000);
  syncTimer = setInterval(loadVillage, 60_000); // regelmäßig mit dem Server abgleichen
}

function stopGame() {
  clearInterval(tickTimer);
  clearInterval(syncTimer);
  village = null;
  $('game-view').hidden = true;
  $('auth-view').hidden = false;
  $('password').value = '';
}

db.auth.onAuthStateChange((_event, session) => {
  if (session) {
    if ($('game-view').hidden) startGame(); // Token-Refresh o. Ä. nicht neu starten
  } else {
    stopGame();
  }
});

setMode('login');
