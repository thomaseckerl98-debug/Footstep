import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=7';
import { Scene, realMood } from './game/scene.js?v=15';
import { openCreator } from './game/creator.js?v=4';
import { buildTalk } from './game/dialog.js?v=8';
import { CHECKS, ATTRS, HERKUNFT, charAttrs, checkOdds, oddsWord } from './game/rules.js?v=1';
import { planFromLook, portraitSprite, RACES, PW, PH } from './game/chars.js?v=4';
import { gearFromInventory } from './game/hero.js?v=1';
import { landFor, LAND_IDS, LAND_NAMES } from './game/lands.js?v=1';
import { POSES, POSE_NAMES } from './game/hero.js?v=1';
import { setMood } from './game/core.js?v=1';
import { CATALOG, KATEGORIEN, STUFEN, summary } from './game/buildings.js?v=3';
import { drawIcon } from './game/icons.js?v=2';
import { SW, SH } from './game/chars.js?v=4';
import { openQuest, ortBildCanvas, dauerText } from './game/questui.js?v=14';
import { Weltkarte, reiseDaten, reiseZeichner } from './game/weltkarte.js?v=3';
let weltkarte = null;
import { playMinigame } from './game/minigames.js?v=2';
import { playBattle } from './game/horde.js?v=7';
import { iconURL } from './game/kampf_icons.js?v=3';
const KAMPF = () => `<img class="q-kicon" src="${iconURL('kampf')}" alt="">`;

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
  $('forgot-btn').hidden = mode !== 'login';
  $('password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  showMsg('auth-msg', '');
}
function showMsg(id, text, type = '') { const el = $(id); el.textContent = text; el.className = 'msg ' + type; }
$('tab-login').onclick = () => setMode('login');
function setPwVisible(b, show) { const i = $(b.dataset.for); i.type = show ? 'text' : 'password'; b.textContent = show ? 'Verbergen' : 'Zeigen'; b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen'); b.title = b.getAttribute('aria-label'); }
document.querySelectorAll('.pw-toggle').forEach((b) => { b.onclick = () => { setPwVisible(b, $(b.dataset.for).type === 'password'); $(b.dataset.for).focus(); }; });
// Passwort vergessen: Mail mit Link zurück ins Spiel (?reset=1), dort neues Passwort festlegen
let recovering = /[?&]reset=1/.test(location.search);
$('forgot-btn').onclick = async () => {
  const email = $('email').value.trim();
  if (!email || !$('email').checkValidity()) { showMsg('auth-msg', 'Gib oben zuerst deine E-Mail-Adresse ein.', 'error'); $('email').focus(); return; }
  $('forgot-btn').disabled = true; showMsg('auth-msg', '…');
  try {
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '?reset=1' });
    if (error) throw error;
    showMsg('auth-msg', 'Falls es ein Konto mit dieser Adresse gibt, ist jetzt eine Mail mit einem Link unterwegs. Schau auch im Spam-Ordner nach.', 'ok');
  } catch (err) { showMsg('auth-msg', translateError(err), 'error'); } finally { $('forgot-btn').disabled = false; }
};
function showRecover() { db.auth.getUser?.().then(({ data }) => { if (data?.user?.email) $('recover-user').value = data.user.email; }).catch(() => {}); $('auth-screen').hidden = false; $('game').hidden = true; $('auth-form').hidden = true; document.querySelector('.tabs').hidden = true; $('recover-form').hidden = false; setTimeout(() => $('new-password').focus(), 50); }
$('recover-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $('new-password').value; $('recover-btn').disabled = true; showMsg('recover-msg', '…');
  try {
    const { error } = await db.auth.updateUser({ password: pw });
    if (error) throw error;
    showMsg('recover-msg', 'Gespeichert. Du wirst angemeldet …', 'ok');
    recovering = false; history.replaceState(null, '', location.pathname);
    $('new-password').value = ''; setPwVisible(document.querySelector('[data-for=new-password]'), false);
    setTimeout(() => { $('recover-form').hidden = true; $('auth-form').hidden = false; document.querySelector('.tabs').hidden = false; showMsg('recover-msg', ''); startGame(); }, 700);
  } catch (err) { showMsg('recover-msg', /session|jwt|expired/i.test(err?.message || '') ? 'Der Link ist abgelaufen. Fordere bitte einen neuen an.' : translateError(err), 'error'); } finally { $('recover-btn').disabled = false; }
});
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
  { id: 'dorf', name: 'Dorf', tip: 'Wie es dem Dorf geht, was gerade gebaut wird und was es bei uns gibt.' },
  { id: 'bewohner', name: 'Bewohner', tip: 'Deine Dorfbewohner, ihre Berufe und Beziehungen.' },
  { id: 'charakter', name: 'Charakter', tip: 'Dein Held: Aussehen, Fähigkeiten, Erfahrungen.' },
  { id: 'inventar', name: 'Inventar', tip: 'Ausrüstung und Gegenstände.' },
  { id: 'quests', name: 'Quests', tip: 'Abenteuer: täglich Leicht, Mittel, Schwer – und dein eigenes, von der KI erzähltes Abenteuer.' },
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
  if (id === 'karte') { closePanel(); weltkarte ||= new Weltkarte({ db, aktion: karteAktion, onClose: () => document.querySelectorAll('.dock-btn').forEach((b) => b.classList.toggle('active', b.dataset.menu === active)) }); weltkarte.oeffnen(); document.querySelectorAll('.dock-btn').forEach((b) => b.classList.toggle('active', b.dataset.menu === 'karte')); return; }
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
const p_ = p;
const row = (...items) => { const e = document.createElement('div'); e.className = 'row'; e.append(...items); return e; };

function renderPanel(id) {
  const body = $('panel-body'); body.innerHTML = '';
  $('panel-title').textContent = MENUS.find((m) => m.id === id).name;
  if (id === 'dorf') {
    renderDorf(body);
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
      const fb = document.createElement('div'); body.append(fb);
      db.rpc('beschaeftigung_status').then(({ data }) => { if (data) fb.append(fertigkeitenListe(data.fertigkeiten || {})); });
    }
    body.append(row(btn('Aussehen ändern', false, () => showCreator(false))));
  } else if (id === 'quests') {
    renderQuests(body);
  } else if (id === 'quest') {
    body.append(h3('Tagebuch'));
    body.append(p('Was du in Gesprächen erfährst, landet hier. Aus manchen Gerüchten werden Abenteuer.', 'muted small'));
    if (villageState?.auftraege?.length) {
      body.append(h3('Abmachungen'));
      const ab = document.createElement('ul'); ab.className = 'journal'; body.append(ab);
      for (const a of villageState.auftraege) { const li = document.createElement('li'); li.innerHTML = `<b>${esc(a.npc)}: ${esc(a.titel)}</b><br><span class="small">${a.status === 'wartet_holz' ? 'Wartet darauf, dass ich Holz aus dem Dorflager bringe.' : `In Arbeit – fertig ${esc(whenText(a.faellig_at))}.`}</span>`; ab.append(li); }
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
    const all = scene ? scene.village.info() : [], info = all.filter((r) => !r.person?.namenlos), viele = all.filter((r) => r.person?.namenlos);
    body.append(p(all.length ? `${all.length} Leute leben in deinem Dorf. ${info.length === 1 ? 'Eine Person kennst' : info.length + ' kennst'} du mit Namen – mit ihnen kannst du reden, Freundschaft schließen und auf Reisen gehen.` : 'Noch wohnt niemand hier.', 'muted small'));
    const ul = document.createElement('ul'); ul.className = 'residents'; body.append(ul);
    if (viele.length) {
      const jobs = {}; for (const r of viele) jobs[r.job] = (jobs[r.job] || 0) + 1;
      const krank = viele.filter((r) => r.person?.zustand && r.person.zustand !== 'gesund').length;
      body.append(h3('Die Leute im Dorf'), p(Object.entries(jobs).map(([j, n]) => n > 1 ? `${n}× ${j}` : j).join(', ') + '.' + (krank ? ` ${krank === 1 ? 'Eine Person ist' : krank + ' sind'} gerade krank oder verletzt.` : ''), 'small'));
    }
    for (const r of info) {
      const li = document.createElement('li');
      const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; if (r.cv) cv.getContext('2d').drawImage(r.cv, 4 * SW, 0, SW, SH, 0, 0, SW, SH);
      const t = document.createElement('div');
      t.innerHTML = `<b>${esc(r.name)}</b> <span class="muted">· ${esc(r.job)}</span><br><span class="small">wirkt ${esc(r.stimmung)} · ${esc(r.activity)}</span><br><span class="small muted">${r.erinnerung ? 'Erinnert sich: ' + esc(r.erinnerung) : 'Noch keine gemeinsamen Erlebnisse.'}</span>`;
      li.append(cv, t); ul.append(li);
    }
  } else if (id === 'inventar') {
    renderInventory(body);
  }
  $('panel').hidden = false;
}
/* ───────────── Dorf: Ampeln statt Zahlen ───────────── */
const SEASON_DE = { fruehling: 'Frühling', sommer: 'Sommer', herbst: 'Herbst', winter: 'Winter' };
const stufeWort = (l) => (l >= 6 ? 'prächtig ausgebaut' : l >= 4 ? 'aus Stein' : l === 3 ? 'gut ausgebaut' : l === 2 ? 'ausgebaut' : 'einfach');
const groß = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');
const nom = (dat) => (dat || '').replace(/^einen /, 'ein ');
const liste = (a) => (a && a.length ? (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]) : '');
function agoText(iso) {
  const d = new Date(iso), now = new Date(), day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(), diff = Math.round((day(now) - day(d)) / 86400000);
  if (now - d < 3600000) return 'gerade eben';
  if (diff === 0) return 'heute'; if (diff === 1) return 'gestern'; if (diff === 2) return 'vorgestern';
  return 'am ' + d.toLocaleDateString('de-DE', { weekday: 'long' });
}
function toast(html, ms = 6000) {
  let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast ui'; document.body.append(t); t.onclick = () => { t.hidden = true; }; }
  t.innerHTML = html; t.hidden = false; clearTimeout(t._tm); t._tm = setTimeout(() => { t.hidden = true; }, ms);
}
async function mithelfen() {
  if (!imDorf()) return;
  const { data, error } = await db.rpc('dorf_mithelfen');
  if (error) return toast('Das hat nicht geklappt: ' + esc(error.message));
  if (!data.ok) return toast(data.grund === 'muede' ? `Du hast vorhin schon mit angepackt. Wieder ${esc(whenText(data.ab))}.` : 'Gerade gibt es keine Baustelle.');
  toast(esc(data.text)); await loadVillageState();
}
async function showVorschlaege(box) {
  if (!imDorf()) return;
  box.innerHTML = '<p class="muted small">Der Dorfrat überlegt …</p>';
  const { data, error } = await db.rpc('dorf_vorschlaege');
  if (error) { box.innerHTML = `<p class="error">${esc(error.message)}</p>`; return; }
  box.innerHTML = '';
  box.append(p(amt?.amt?.ich ? 'Was soll als Nächstes gebaut werden? Als Dorfmeister bestimmst du es – einmal am Tag.' : 'Was sollte als Nächstes entstehen? Einmal am Tag kannst du etwas vorschlagen – gehört wirst du erst, wenn man dich schätzt.', 'small muted'));
  for (const v of data || []) {
    const it = document.createElement('div'); it.className = 'bitem';
    const t = document.createElement('div'); t.innerHTML = `<b>${esc(v.art === 'ausbau' ? v.name + ' ausbauen' : v.name)}</b><br><span class="small muted">${esc(v.grund)}</span>`;
    const b = btn(amt?.amt?.ich ? 'Anordnen' : 'Vorschlagen', false, async () => {
      const r = await db.rpc('dorf_vorschlagen', { p_gebaeude: v.gebaeude });
      if (r.error) return toast(esc(r.error.message));
      toast(r.data.ok ? esc(r.data.text) : r.data.grund === 'schon_heute' ? 'Du hast heute schon etwas vorgeschlagen.' : 'Das geht gerade nicht.');
      await loadVillageState();
    });
    it.append(t, b); box.append(it);
  }
  if (!(data || []).length) box.append(p('Gerade gibt es nichts, was der Dorfrat bauen könnte.', 'small muted'));
}
const FOKUS = { ausgewogen: ['Ausgewogen', 'Kein besonderer Schwerpunkt.'], nahrung: ['Nahrung', 'Felder, Jagd und Vorräte zuerst (+25 %).'], baustoffe: ['Holz & Stein', 'Mehr Baumaterial für schnellere Bauten (+20 %).'], handwerk: ['Handwerk', 'Werkstätten arbeiten mehr Waren (+30 %).'], wachstum: ['Wachstum', 'Mehr Bittsteller und Zuzug.'] };
function renderFuehrung(body) {
  const A = amt; if (!A) return;
  const box = document.createElement('div'); box.className = 'fuehrung';
  if (A.amt.ich) {
    box.innerHTML = `<div class="fh-kopf"><span class="amt-label">Dorfmeister</span><b>Du führst das Dorf</b><span class="small">Volle Kraft · ${esc(A.amt.gunst)}</span></div>`;
    box.append(h3('Schwerpunkt der Ratssitzung'));
    const r = document.createElement('div'); r.className = 'row fokus-row';
    for (const [k, [n, d]] of Object.entries(FOKUS)) { const b = btn(n, A.amt.fokus === k, async () => { const { data, error } = await db.rpc('amt_fokus', { p_fokus: k }); if (error || !data?.ok) return toast(esc(error?.message || data?.grund)); await loadAmt(false); renderPanel('dorf'); }); b.title = d; r.append(b); }
    box.append(r, p(FOKUS[A.amt.fokus]?.[1] || '', 'small muted'));
    if (A.offen.length) box.append(p(`Am Brett ${A.offen.length === 1 ? 'wartet ein Aushang' : `warten ${A.offen.length} Aushänge`} auf deine Entscheidung.`, 'small fh-warn'), row(btn('Zum Brett', true, () => openMenu('quests'))));
    const rt = btn('Amt niederlegen', false, () => {
      rt.remove(); const msg = p('Wirklich? Dann führt der Vorsteher das Dorf wieder – nur mit halber Kraft. Erneut antreten kannst du frühestens in drei Tagen.', 'small');
      box.append(msg, row(btn('Ja, niederlegen', false, async () => { await db.rpc('amt_ruecktritt'); await loadAmt(false); renderPanel('dorf'); }), btn('Doch nicht', true, () => renderPanel('dorf'))));
    });
    box.append(row(rt));
  } else {
    box.innerHTML = `<div class="fh-kopf"><span class="amt-label">Vorsteher</span><b>${esc(A.amt.vorsteher || 'Ein Bewohner')} führt das Dorf</b><span class="small">Nur halbe Kraft, bis ein Dorfmeister gewählt ist.</span></div>`;
    box.append(ansehenBar(A.ansehen));
    box.append(p(A.chronik ? `Hauptquest: Kapitel ${A.chronik.kapitel} – ${A.chronik.titel}` : '', 'small'), row(btn('Zum Brett', false, () => openMenu('quests'))));
  }
  body.append(box);
}
function renderDorf(body) {
  const D = villageState?.dorf;
  body.append(p(village ? village.village_name : 'Dein Dorf'));
  renderFuehrung(body);
  if (!D) { body.append(p('Einen Moment – das Dorf wird gerade erfasst …', 'muted small')); return; }
  body.append(p(`${SEASON_DE[D.jahreszeit] || ''} · Die Stimmung ist ${D.stimmung}.`, 'small muted'));
  // Baustelle
  body.append(h3('Gerade im Bau'));
  if (D.bau) {
    const b = D.bau, box = document.createElement('div'); box.className = 'bau-box';
    box.innerHTML = `<b>${esc(b.art === 'ausbau' ? b.name + ' wird ausgebaut' : groß(nom(b.dat)) + ' entsteht')}</b>
      <div class="bar"><span style="width:${Math.round(b.fortschritt * 100)}%"></span></div>
      <span class="small">${esc(b.baumeister || 'Die Bewohner')} ${b.baumeister && b.baumeister.includes(' und ') ? 'bauen' : 'baut'} daran. Fertig vermutlich ${esc(whenText(b.fertig_etwa))}.</span><br>
      <span class="small muted">${esc(b.grund || '')}</span>`;
    const hb = btn(D.hilfe_ab ? `Wieder mithelfen ${whenText(D.hilfe_ab)}` : 'Mit anpacken', false, mithelfen); hb.disabled = !!D.hilfe_ab;
    box.append(row(hb)); body.append(box);
  } else body.append(p(D.plan ? 'Die Baustelle ruht – es fehlt noch Material.' : 'Gerade wird nichts gebaut.', 'small'));
  // Plan
  if (D.plan) {
    body.append(h3('Als Nächstes geplant'));
    const pl = D.plan;
    body.append(p(pl.art === 'ausbau' ? `${pl.name} ausbauen` : groß(nom(pl.dat)), ''));
    body.append(p(pl.grund || '', 'small muted'));
    body.append(p(pl.fehlt?.length ? `Es fehlt noch an ${liste(pl.fehlt)}.` : 'Das Material liegt bereit – es geht los, sobald die Baustelle frei ist.', 'small'));
  }
  const vbox = document.createElement('div');
  const vb = btn(D.vorschlag_ab ? `Nächster ${amt?.amt?.ich ? 'Bauauftrag' : 'Vorschlag'} ${whenText(D.vorschlag_ab)}` : amt?.amt?.ich ? 'Bauauftrag erteilen' : 'Im Dorfrat etwas vorschlagen', false, () => showVorschlaege(vbox)); vb.disabled = !!D.vorschlag_ab;
  body.append(row(vb), vbox);
  // Ampeln
  body.append(h3('Wie es dem Dorf geht'));
  const ul = document.createElement('ul'); ul.className = 'ampel-list'; body.append(ul);
  for (const a of D.ampeln || []) { const li = document.createElement('li'); li.innerHTML = `<div><b>${esc(a.name)}:</b> ${esc(a.menge || '')}<br><span class="small">${esc(a.text)}</span></div>`; ul.append(li); }
  // Güter
  body.append(h3('Was es bei uns gibt'));
  for (const [kat, name] of [['essen', 'Essen und Vorräte'], ['bau', 'Baumaterial'], ['handwerk', 'Handwerk']]) {
    const items = (D.gueter || []).filter((g) => g.kat === kat); if (!items.length) continue;
    const det = document.createElement('details'); det.className = 'kat'; if (kat === 'essen') det.open = true;
    const sum = document.createElement('summary'); sum.textContent = name; det.append(sum);
    for (const g of items) { const it = document.createElement('div'); it.className = 'gut'; it.innerHTML = `<div><b>${esc(g.name)}:</b> ${esc(g.menge || '')}<br><span class="small">${esc(g.text)}</span></div>`; det.append(it); }
    body.append(det);
  }
  // Chronik
  body.append(h3('Dorfchronik'));
  const cl = document.createElement('ul'); cl.className = 'journal'; body.append(cl);
  for (const e of D.chronik || []) { const li = document.createElement('li'); li.innerHTML = `<span class="small muted">${esc(agoText(e.at))}</span><br><span class="small">${esc(e.text)}</span>`; cl.append(li); }
  // Ansicht und Testwerkzeuge
  const det = document.createElement('details'); det.className = 'kat'; const sum = document.createElement('summary'); sum.textContent = 'Ansicht und Testwerkzeuge'; det.append(sum); body.append(det);
  det.append(h3('Ansicht'));
  det.append(row(...[['dorf', 'Dorf'], ['grossdorf', 'Großes Dorf'], ['stadt', 'Stadt']].map(([z, n]) => btn(n, scene.zoom === z, () => { scene.setZoom(z); renderPanel('dorf'); })),
    btn(scene.showNames ? 'Namen ausblenden' : 'Namen anzeigen', scene.showNames, () => { scene.toggleNames(); renderPanel('dorf'); })));
  det.append(h3('Tageszeit'));
  det.append(row(btn('Echtzeit', scene.auto, () => { const m = realMood(); scene.setMood(m.time, m.season, true); renderPanel('dorf'); }),
    ...Object.entries(TIME_NAMES).map(([k, n]) => btn(n, !scene.auto && scene.mood.time === k, () => { scene.setMood(k, scene.mood.season); renderPanel('dorf'); }))));
  det.append(h3('Jahreszeit (nur Ansicht)'));
  det.append(row(...Object.entries(SEASON_NAMES).map(([k, n]) => btn(n, scene.mood.season === k, () => { scene.setMood(scene.mood.time, k); renderPanel('dorf'); }))));
  det.append(h3('Wetter'));
  det.append(row(btn('Automatisch', !scene.weather.forced, () => { scene.setWeather('auto'); renderPanel('dorf'); }),
    ...Object.entries(WEATHER_NAMES).map(([k, n]) => btn(n, scene.weather.forced && scene.weather.target === k, () => { scene.setWeather(k); renderPanel('dorf'); }))));
}
// Gebäude in Worten: Stufe, wer dort arbeitet, was es bewirkt
function buildingInfo(s) {
  const c = CATALOG[s.type], lvl = villageState?.dorf?.stufen?.[String(s.plotId)] || 1;
  const workers = scene.village.people.filter((q) => !q.wanderer && scene.village.spriteOf(scene.village.placeFor(q)) === s).map((q) => q.name);
  const bau = villageState?.baustelle && villageState.baustelle.plot === s.plotId && villageState.baustelle.art === 'ausbau';
  return { name: c?.name || s.type, lvl, stufe: stufeWort(lvl), workers, folge: c?.folgen?.[0] || '', bau };
}
// Held: Aussehen aus der Erstellung, Kleidung und Waffe aus Rolle + Inventar
let heroInv = null;
function heroPlan() { const plan = planFromLook(me?.look, me?.name); plan.herkunft = me?.herkunft || me?.look?.herkunft || 'waldlaeufer'; plan.gear = gearFromInventory(plan.herkunft, heroInv); return plan; }
function refreshHero(reloadInv = false) {
  if (!scene || !me?.look) return;
  if (!reloadInv) { scene.setHeroPlan(heroPlan()); return; }
  db.rpc('get_inventory').then(({ data, error }) => { if (!error && data) heroInv = data; scene.setHeroPlan(heroPlan()); });
}
function showCreator(first, roleFocus = false) {
  hideTip();
  openCreator({
    root: $('creator'), name: me?.name || 'Du', look: me?.look ? { ...me.look, herkunft: me.rolle_gewaehlt === false ? (me.look.herkunft || 'waldlaeufer') : (me.herkunft || me.look.herkunft) } : null, first, roleFocus,
    restoreMood: () => scene?.restoreMood(),
    onSave: async (look) => {
      const { data, error } = await db.rpc('save_character', { p_look: look });
      if (error) throw new Error(error.message);
      me = data && typeof data === 'object' && data.look ? data : { ...(me || {}), look };
      refreshHero(true);
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
    if (p.namenlos) {
      info.innerHTML = `<b>${esc(p.job)}</b><br><span class="small">Eine der vielen Leute im Dorf${p.zustand !== 'gesund' && p.zustand ? (p.zustand === 'krank' ? ' – liegt krank im Bett' : ' – ist verletzt') : ''}.</span><br><span class="small muted">${esc(p.activity || '')}</span>`;
      card.append(row(btn('Kamera folgen', false, () => scene.select(obj))), p_(`Ihren Namen kennst du nicht. Was du für das Dorf tust, spricht sich aber auch bei ihnen herum.`, 'small muted'));
      return;
    }
    const upd = () => { info.innerHTML = `<b>${esc(p.name)}</b>${p.zustand === 'krank' ? ' <span class="small">· krank</span>' : p.zustand === 'verletzt' ? ' <span class="small">· verletzt</span>' : ''}<br>${esc(p.wanderer ? 'Wanderer · ' + p.job : p.job)}<br><span class="small">${p.stimmung ? 'wirkt ' + esc(p.stimmung) : ''}${p.wesen ? ' · ' + esc(p.wesen) : ''}</span><br><span class="small muted">${esc(p.activity || '')}</span>${p.erinnerung ? `<br><span class="small muted">Erinnert sich: ${esc(p.erinnerung)}</span>` : ''}`; };
    upd(); selTimer = setInterval(upd, 1000);
    const quest = btn('Auf Quest mitnehmen', false, () => {}); quest.disabled = true; quest.title = 'Quests werden nach dem Tutorial freigeschaltet';
    card.append(row(btn('Ansprechen', false, () => startTalk(p)), quest, btn('Kamera folgen', false, () => scene.select(obj))));
    if (amt?.amt?.ich && !p.wanderer && Number.isFinite(+p.id) && +p.id !== +amt.amt.vorsteher_id) {
      const person = p, para = (t, c) => { const e = document.createElement('p'); e.textContent = t; e.className = c; return e; };
      const vb = btn('Aus dem Dorf weisen', false, () => {
        vb.remove(); card.append(para(`${person.name} wirklich fortschicken? Die anderen werden es dir übel nehmen, und die Stimmung sinkt.`, 'small'), row(btn('Ja, fortschicken', false, async () => {
          const { data, error } = await db.rpc('amt_verbannen', { p_npc: +person.id });
          if (error || !data?.ok) return toast(esc(error?.message || data?.grund));
          toast(esc(data.text), 8000); scene.select(null);
          const r = await db.rpc('get_my_residents'); if (!r.error) scene.setResidents(imDorfFilter(r.data));
          loadVillageState(); loadAmt(false);
        }), btn('Nein', true, () => showSelCard(obj))));
      });
      card.append(row(vb));
    }
  } else {
    const s = obj.sprite, bi = buildingInfo(s);
    const h = document.createElement('div'); h.innerHTML = `<b>${esc(bi.name)}</b><br><span class="small muted">${esc(groß(bi.stufe))}${bi.bau ? ' · wird gerade ausgebaut' : ''}</span>`; card.append(h);
    const dwellers = scene.village.people.filter((q) => q.home === s);
    if (bi.workers.length) card.append(p('Arbeiten hier: ' + bi.workers.join(', '), 'small'));
    if (dwellers.length) card.append(p('Wohnen hier: ' + dwellers.map((q) => q.name).join(', '), 'small'));
    if (bi.folge) card.append(p('• ' + bi.folge, 'small muted'));
    const D = villageState?.dorf;
    const up = bi.bau ? btn(D?.hilfe_ab ? 'Heute schon mitgeholfen' : 'Mit anpacken', false, mithelfen)
      : btn('Ausbau vorschlagen', false, async () => {
        if (!imDorf()) return;
        const r = await db.rpc('dorf_vorschlagen', { p_gebaeude: s.type });
        if (r.error) return toast(esc(r.error.message));
        toast(r.data.ok ? esc(r.data.text) : r.data.grund === 'schon_heute' ? 'Du hast heute schon etwas im Dorfrat vorgeschlagen.' : 'Der Dorfrat sieht dafür gerade keinen Grund – oder das Lager ist zu klein dafür.');
        loadVillageState();
      });
    if (bi.bau && D?.hilfe_ab) up.disabled = true;
    if (!bi.bau && D?.vorschlag_ab) { up.disabled = true; up.title = 'Du hast heute schon etwas vorgeschlagen'; }
    const team = btn('Bewohner ansehen', false, () => openMenu('diplomatie')); team.disabled = !bi.workers.length && !dwellers.length;
    card.append(row(up, team));
  }
}
const BUILDINGS_NAME = (t) => t;
async function startTalk(p) {
  if (questWin || !imDorf(p)) return;
  const box = $('dialog'); p.talking = true; box.hidden = false; box.innerHTML = '<p class="muted small">…</p>'; $('selcard').hidden = true; clearInterval(selTimer); document.body.classList.add('im-dialog');
  const online = p.id && p.id < 1000, conv = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).slice(0, 36);
  // Was diese Figur weiß (nur Schlüssel, keine Geheimnisse) und ob die KI heute noch antworten kann
  let brief = null;
  if (online) {
    const [b1, b2] = await Promise.all([db.rpc('get_npc_brief', { p_npc: p.id }), db.rpc('ai_status')]);
    if (!b1.error) brief = b1.data; if (!b2.error && b2.data) aiState = b2.data;
  }
  box.innerHTML = '';
  const fr = p.fremd ? null : scene.village.people.find((q) => q.id === p.freund);
  const race = me?.race || me?.look?.race || 'mensch', herk = me?.herkunft || me?.look?.herkunft || 'waldlaeufer', attrs = me?.attrs || charAttrs(race, herk);
  const gebaeude = p.fremd ? [] : [...new Set(scene.sprites.map((s) => s.type).filter((x) => x !== 'feld'))].map((g) => ({ nom: withArticle(g), akk: withArticleAkk(g) }));
  const t = buildTalk({ name: p.name, job: p.job, wesen: p.wesen || 'bodenständig', stimmung: p.stimmung || 'fremd', time: scene.mood.time, weather: weatherNow, season: scene.mood.season, freund: fr?.name, gebaeude, du: me?.name || 'du',
    race, herkunft: herk, attrs, CHECKS, ATTRS, HERKUNFT, odds: (id) => oddsWord(checkOdds(id, attrs, herk)), wissen: brief?.wissen || null, gefragt: brief?.gefragt || [], deals: brief?.auftrag_optionen || [], neuigkeiten: brief?.neuigkeiten || [], abmachung: brief?.abmachung || null, holz: brief?.holz, rivale: brief?.rivale || null, dorf: brief?.dorf || null, whenText });
  const head = document.createElement('div'); head.className = 'dl-head'; const log = document.createElement('div'); log.className = 'dl-log';
  const nameEl = document.createElement('div'); nameEl.innerHTML = `<b>${esc(p.name)}</b> <span class="muted small">· ${esc(p.job)}</span>`;
  const right = document.createElement('div'); right.className = 'dl-right'; right.append(nameEl, log);
  head.append(portraitCanvas(p.plan, 110), right); box.append(head);
  const opts = document.createElement('ol'); opts.className = 'dl-opts'; box.append(opts);
  let cur = null, left = t.patience + 6, lastReact = 'neutral', busy = false, ideas = [], spoken = 0, aiUsed = 0, closed = false;
  const history = [], highlights = [];
  const say = (who, text, cls) => { const el = document.createElement('p'); el.className = cls || who; el.textContent = text; log.append(el); log.scrollTop = log.scrollHeight; if (who === 'me' || who === 'npc') history.push({ wer: who === 'me' ? 'ich' : 'npc', text }); if (who === 'me') spoken++; };
  const note = (html) => { const el = document.createElement('p'); el.className = 'note'; el.innerHTML = html; log.append(el); log.scrollTop = log.scrollHeight; };
  const end = () => {
    if (closed) return; closed = true;
    document.removeEventListener('keydown', onKey); p.talking = false; box.hidden = true; box.innerHTML = ''; document.body.classList.remove('im-dialog'); if (p.fremd) p.onEnde?.();
    if (scene.selection?.person === p) showSelCard(scene.selection);
    if (online && spoken >= 2) writeEncounterNote(p, history, highlights, spoken, aiUsed);
  };
  const finish = (react) => { opts.innerHTML = ''; setTimeout(() => { say('npc', t.bye(react)); const li = document.createElement('li'); li.append(btn('Gespräch beenden', false, end)); opts.append(li); }, 600); };
  const onKey = (e) => { if (busy || e.target.tagName === 'INPUT') return; const n = Number(e.key); if (n >= 1 && n <= 9) opts.querySelectorAll('button.dl-topic, button.dl-opt:not(:disabled)')[n - 1]?.click(); if (e.key === 'Escape') end(); };
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
  const after = () => {
    left--; busy = false; if (left <= 0 || lastReact === 'veraergert' || lastReact === 'kurz') return finish(lastReact);
    // Ist ein Thema ausgeschöpft, rundet die Figur es ab und es geht zurück zur Themen-Übersicht
    if (cur && t.exhausted(cur)) { busy = true; setTimeout(() => { say('npc', t.wrap()); cur = null; busy = false; offer(); }, 650); return; }
    offer();
  };
  const item = (o, i) => {
    const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'dl-opt' + (o.kind === 'check' ? ' check' : o.kind === 'free' || o.kind === 'idea' ? ' free' : '') + (o.kind === 'hub' ? ' back' : '') + (o.kind === 'bye' ? ' bye' : '') + (o.deeper ? ' deeper' : '') + (o.off ? ' off' : '');
    b.innerHTML = `<span class="num">${o.off ? '–' : i + 1 + '.'}</span> ${o.deeper ? '<span class="arrow">↳</span> ' : ''}${o.tag ? `<span class="tag">${esc(o.tag)}</span> ` : ''}<span class="txt">${esc(o.text)}</span>${o.hint ? ` <span class="hint">(${esc(o.hint)})</span>` : ''}${o.why ? `<span class="why">${esc(o.why)}</span>` : ''}`;
    if (o.off) b.disabled = true; else b.onclick = () => { if (!busy) choose(o); };
    li.append(b); return li;
  };
  const topicCard = (o, i) => {
    const li = document.createElement('li'); li.className = 'dl-topic-li'; const b = document.createElement('button'); b.type = 'button'; b.className = 'dl-topic' + (o.visited ? ' visited' : '');
    b.innerHTML = `<span class="num">${i + 1}</span><span class="tl">${esc(o.label)}</span><span class="tq">${esc(o.text)}</span>${o.visited ? '<span class="tv">besprochen</span>' : ''}`;
    b.onclick = () => { if (!busy) choose(o); }; li.append(b); return li;
  };
  const offer = () => {
    opts.innerHTML = '';
    const list = t.options(cur);
    if (aiState.verfuegbar) for (const idea of ideas) list.unshift({ kind: 'idea', tag: '[Idee · 1 Inspiration]', text: idea });
    let n = 0;
    const head = document.createElement('li'); head.className = 'dl-section';
    if (!cur) {
      head.textContent = 'Worüber möchtest du reden?'; opts.append(head);
      const grid = document.createElement('li'); grid.className = 'dl-topics'; const ul = document.createElement('ul'); grid.append(ul); opts.append(grid);
      for (const o of list.filter((x) => x.kind === 'enter')) ul.append(topicCard(o, n++));
      for (const o of list.filter((x) => x.kind !== 'enter')) opts.append(item(o, n++));
    } else {
      head.innerHTML = `Thema: <b>${esc(t.hubTopics().find((h) => h.topic === cur.topic)?.label || '')}</b>`; opts.append(head);
      for (const o of list) opts.append(item(o, n++));
      opts.append(item({ kind: 'hub', text: 'Über etwas anderes reden …' }, n++));
    }
    if (online) {
      const insp = typeof aiState.rest === 'number' ? ` · Inspiration ${aiState.rest}/${aiState.max || 10}` : '';
      if (aiState.verfuegbar) opts.append(item({ kind: 'free', tag: `[Eigene Worte${insp}]`, text: 'Selbst etwas sagen …' }, n++));
      else opts.append(item({ kind: 'free', off: true, tag: `[Eigene Worte${insp}]`, text: 'Selbst etwas sagen …', why: aiWhy(aiState) }, n));
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
      if (res && ['gemini_limit', 'tageslimit', 'inspiration'].includes(res.grund) && !res.kurz) aiState = { ...aiState, verfuegbar: false, ki: res.grund === 'inspiration', grund: res.grund, bis: res.bis, rest: res.grund === 'inspiration' ? 0 : aiState.rest };
      note(`<span class="muted">(${esc(aiWhy(res || {}))} – ${esc(p.name)} antwortet aus dem Bauch heraus)</span>`);
      const r = await tone('fragen', cur?.topic); apply(r); say('npc', t.reaction(r.reaktion)); return after();
    }
    aiUsed++; if (typeof res.rest === 'number') { aiState.rest = res.rest; if (res.rest <= 0) aiState = { ...aiState, verfuegbar: false, ki: true, grund: 'inspiration', bis: null }; }
    if (res.probe) { note(rollLine(res.probe)); highlights.push(res.probe.erfolg ? `Mein Versuch (${CHECKS[res.probe.id]?.name}) gelang.` : `Mein Versuch (${CHECKS[res.probe.id]?.name}) ging daneben.`); }
    apply(res); say('npc', res.antwort);
    if (res.zusage) { note(`Zusage: <b>${esc(res.zusage.text)}</b> <span class="muted">(im Notizbuch unter Diplomatie)</span>`); highlights.push(`${p.name} hat mir etwas zugesagt: ${res.zusage.text}.`); }
    if (res.journal) { note(`Tagebuch: <b>${esc(res.journal.title)}</b>`); highlights.push(`Ich habe etwas erfahren: ${res.journal.title}.`); }
    if (res.auftrag?.ok) { note(`Abmachung: <b>${esc(p.name)} macht ${esc(res.auftrag.titel)}</b>${res.auftrag.holz ? ' · braucht Holz aus dem Dorflager' : ` · fertig ${esc(whenText(res.auftrag.faellig_at))}`} <span class="muted">(Tagebuch)</span>`); highlights.push(`Wir haben eine Abmachung: ${p.name} macht ${res.auftrag.titel}.`); const st = await db.rpc('get_npc_brief', { p_npc: p.id }); if (!st.error) { brief = st.data; t.setDeal(brief.abmachung, brief.holz); } loadVillageState(); }
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
    if (o.kind === 'hub') { cur = null; setTimeout(() => { busy = false; offer(); }, 250); return; }
    if (o.kind === 'enter') {
      cur = t.enterTopic(o.topic); t.resetThread();
      setTimeout(() => { say('npc', cur.text); busy = false; if (t.exhausted(cur) && cur.topic === 'geruechte') { cur = null; } offer(); }, 500); return;
    }
    if (o.kind === 'deal' || o.kind === 'deliver') {
      let r = { ok: false, grund: 'offline' };
      if (online) { const { data, error } = o.kind === 'deal' ? await db.rpc('create_deal', { p_npc: p.id, p_vorlage: o.vorlage }) : await db.rpc('deliver_deal', { p_deal: brief.abmachung.id }); if (!error && data) r = data; else if (error) console.warn('Abmachung:', error.message); }
      setTimeout(async () => {
        say('npc', t.dealText(r, o.kind));
        if (r.ok) {
          if (o.kind === 'deal') { const d = brief.auftrag_optionen.find((x) => x.id === o.vorlage); note(`Abmachung: <b>${esc(p.name)} macht ${esc(d?.titel || '')}</b>${r.holz ? ' · braucht Holz aus dem Dorflager' : ''} <span class="muted">(Tagebuch)</span>`); highlights.push(`Wir haben eine Abmachung: ${p.name} macht ${d?.titel}.`); brief.abmachung = { id: null, titel: d?.titel, holz: r.holz, status: r.status, faellig_at: r.faellig_at }; brief.auftrag_optionen = []; }
          else { note(`Holz aus dem Lager geholt · <b>fertig ${esc(whenText(r.faellig_at))}</b>`); highlights.push(`Ich habe ${p.name} Holz aus dem Lager gebracht.`); brief.abmachung.status = 'in_arbeit'; brief.abmachung.faellig_at = r.faellig_at; brief.holz = r.holz; }
          t.setDeal?.(brief.abmachung, brief.holz); await loadVillageState();
          if (o.kind === 'deal' && r.status === 'wartet_holz') { const st = await db.rpc('get_npc_brief', { p_npc: p.id }); if (!st.error) { brief.abmachung = st.data.abmachung; t.setDeal?.(brief.abmachung, st.data.holz); } }
        }
        after();
      }, 600); return;
    }
    if (o.kind === 'personal') { apply(await tone('fragen', 'persoenlich')); setTimeout(async () => { await personal(o.what); after(); }, 500); return; }
    if (o.kind === 'follow') {
      t.markAsked(o.id); t.unlock(o.nach); apply(await tone('fragen', cur?.topic));
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
    t.useTone(); const r = await tone(o.tone, cur?.topic); apply(r);
    setTimeout(() => { say('npc', t.reaction(r.reaktion, o.tone, cur?.topic)); after(); }, 450);
  };
  say('npc', t.opener());
  // Hat die Figur etwas über dich gehört? Dann spricht sie es vielleicht an.
  const heard = brief?.gehoert?.[0];
  const frisch = (brief?.neuigkeiten || []).find((n) => n.frisch);
  if (heard && Math.random() < 0.6) setTimeout(() => say('npc', `Ich hab da was gehört … ${heard} Stimmt das?`), 300);
  else if (frisch && Math.random() < 0.7) setTimeout(() => say('npc', `Hast du schon gehört? ${frisch.text}`), 300);
  cur = null; busy = true; setTimeout(() => { busy = false; offer(); }, heard ? 900 : 400);
}
if (location.hostname === 'localhost') window.__dev = { startTalk: (i = 0) => startTalk(scene.village.people.filter((q) => q.id)[i]), scene: () => scene };
let aiState = { verfuegbar: true };
let villageState = null, layoutSynced = false, newsShown = false;
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
  scene.setBaustelle?.(data.baustelle || null);
  layoutSynced = true;
  // Neuigkeiten seit dem letzten Besuch (einmal pro Sitzung)
  if (!newsShown) setTimeout(heuteHinweis, data.dorf?.neu?.length ? 15000 : 2500);
  if (!newsShown && data.dorf?.neu?.length) {
    newsShown = true;
    toast(`<b>Seit deinem letzten Besuch:</b><br>${data.dorf.neu.map((e) => '• ' + esc(e.text)).join('<br>')}`, 14000);
    db.rpc('dorf_gesehen');
  } else if (!newsShown) { newsShown = true; db.rpc('dorf_gesehen'); }
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
  if (st.grund === 'inspiration') return 'Deine 10 Inspirationen für heute sind verbraucht – ab Mitternacht wieder';
  if (st.grund === 'tageslimit') return 'Für heute genug KI genutzt – ab Mitternacht wieder';
  if (st.grund === 'kein_schluessel') return 'KI noch nicht eingerichtet';
  if (st.grund === 'zu_schnell') return 'kurz durchatmen';
  return 'KI gerade nicht erreichbar';
}
// Nach jedem Gespräch: eine Notiz ins Notizbuch über diese Person (mit KI persönlich formuliert, sonst aus den Höhepunkten)
async function writeEncounterNote(p, history, highlights, spoken, aiUsed) {
  if (aiState.ki !== false && (aiUsed > 0 || spoken >= 4)) {
    try {
      const { data } = await db.functions.invoke('npc-talk', { body: { modus: 'abschluss', npc: p.id, verlauf: history.slice(-16) } });
      if (data?.notiz) return;
      if (data?.grund && ['gemini_limit', 'tageslimit'].includes(data.grund) && data.bis) aiState = { ...aiState, verfuegbar: false, ki: false, grund: data.grund, bis: data.bis };
    } catch (e) { console.warn('Notiz:', e); }
  }
  const mood = { 'treu ergeben': 'Ich spüre, dass ich mich auf ' + p.name + ' verlassen kann.', herzlich: 'Ich hatte ein gutes Gefühl dabei.', freundlich: 'Ein angenehmes Gespräch.', zurückhaltend: p.name + ' blieb mir gegenüber reserviert.', misstrauisch: p.name + ' traut mir nicht über den Weg.', feindselig: p.name + ' war offen feindselig.' }[p.stimmung] || '';
  const topics = history.filter((h) => h.wer === 'ich').slice(0, 2).map((h) => `„${h.text.slice(0, 60)}“`).join(', ');
  const txt = [`Habe mit ${p.name} gesprochen${topics ? ` (u. a. ${topics})` : ''}.`, ...highlights.slice(0, 3), mood].filter(Boolean).join(' ');
  db.rpc('add_note', { p_npc: p.id, p_kind: 'begegnung', p_text: txt }).then(({ error }) => error && console.warn('Notiz:', error.message));
}
const journalLocal = new Map();
// Diplomatie: Notizbuch über Menschen – keine Zahlen, nur Eindrücke, Erlebtes, Gefallen
/* ───────────── Abenteuer (Quests) und Inventar ───────────── */
const bonusText = (b) => Object.entries(b || {}).map(([k, n]) => `${CHECKS[k]?.name || k} ${n > 0 ? '+' : '−'}${Math.abs(n)}`).join(', ');
const companionCv = (id) => scene?.village.people.find((q) => q.id === id)?.cv || null;
let questWin = null;
function launchQuest(view) {
  closePanel(); $('dialog').hidden = true; $('selcard').hidden = true;
  setTimeout(() => { loadAmt(false); db.rpc('get_my_residents').then(({ data, error }) => { if (!error) scene.setResidents(imDorfFilter(data)); }); }, 600);
  questWin = openQuest({ db, box: $('questbox'), view, heroPlan: heroPlan(), companionCv, CHECKS, ATTRS, reiseKarte: async () => reiseZeichner(await reiseDaten(db, true)),
    onClose: (changed, extra) => { questWin = null; if (changed) { loadVillageState(); refreshHero(true); } checkAmtPopups(); if (extra?.abschluss) showAbschluss(extra); db.rpc('get_my_residents').then(({ data, error }) => { if (!error) scene.setResidents(imDorfFilter(data)); }); if (['quest', 'quests', 'inventar'].includes(active) && !$('panel').hidden) renderPanel(active); } });
}
async function resumeQuest(run) {
  const { data, error } = await db.rpc('quest_view', { p_run: run });
  if (error) { console.warn('Quest:', error.message); return; }
  launchQuest(data);
}
// Begleiter-Auswahl (höchstens zwei, wer eine Rolle spielt, kann nicht mit)
function companionPicker(list, blocked = new Set()) {
  const pick = document.createElement('div'); pick.className = 'pick'; const chosen = new Set();
  pick.append(p('Wer kommt mit? (höchstens zwei – passende Berufe helfen bei Proben)', 'muted small'));
  for (const b of list) {
    const ok = b.bereit && !blocked.has(b.id);
    const l = document.createElement('label'); l.className = 'pick-row' + (ok ? '' : ' off');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.disabled = !ok;
    cb.onchange = () => { if (cb.checked) { if (chosen.size >= 2) { cb.checked = false; return; } chosen.add(b.id); } else chosen.delete(b.id); };
    const t = document.createElement('span'); t.innerHTML = `${esc(b.name)} <span class="muted">· ${esc(b.beruf)} · ${esc(b.stimmung)}</span>${blocked.has(b.id) ? ' <span class="muted">(spielt in der Geschichte mit)</span>' : b.bereit ? '' : ' <span class="muted">(will nicht mit)</span>'}`;
    l.append(cb, t); pick.append(l);
  }
  return { el: pick, chosen };
}
// Einmal am Tag: wer im Dorf heute um Hilfe bittet
async function heuteHinweis() {
  const key = 'mh_heute_' + new Date().toLocaleDateString('de-DE');
  try { if (localStorage.getItem(key)) return; } catch { /* egal */ }
  const { data, error } = await db.rpc('heute'); if (error || !data) return;
  const offen = (data.tagwerk || []).filter((t) => t.status === 'offen');
  if (!offen.length) return;
  const namen = offen.map((t) => esc(t.npc)); const liste = namen.length > 1 ? namen.slice(0, -1).join(', ') + ' und ' + namen.at(-1) : namen[0];
  toast(`<b>Heute im Dorf:</b> ${liste} ${offen.length > 1 ? 'könnten' : 'könnte'} deine Hilfe gebrauchen. Schau unter <b>Quests</b> vorbei.`, 9000);
  try { localStorage.setItem(key, '1'); } catch { /* egal */ }
}
/* ───────────── Weltgeschichte: gemeinsame Ereignisse und Nachrichten ───────────── */
let newsOffen = false;
function showNachrichten(liste) {
  if (newsOffen || questWin) return; newsOffen = true;
  const { box, close } = amtOverlay(); box.classList.add('abschluss', 'nachrichten');
  box.innerHTML = `<span class="amt-label">Neuigkeiten erreichen dich</span><h2>Was man sich erzählt</h2>
    <ul class="abs-ertrag">${liste.map((n) => `<li><b>${esc(n.titel)}</b>${n.von ? ` <span class="small muted">· aus ${esc(n.von)}</span>` : ''}<br>${esc(n.text)}${n.ich ? '<br><span class="small ok">Das warst du.</span>' : ''}</li>`).join('')}</ul>
    <p class="small muted">Nachrichten reisen mit Boten und Händlern – ferne Orte erfahren es später, und manchmal verzerrt.</p>`;
  box.append(row(btn('Verstanden', true, () => { close(); newsOffen = false; db.rpc('nachrichten_gesehen'); })));
}
function renderWelt(wrap, list) {
  wrap.append(schild('Was im Land geschieht'));
  wrap.append(p('Weltereignisse gibt es nur einmal. Wer sie zuerst zu Ende bringt, schreibt Geschichte – für alle Spieler. Die anderen erfahren davon, sobald die Nachricht bei ihnen ankommt.', 'brett-hinweis small'));
  const g = document.createElement('div'); g.className = 'zettel-grid'; wrap.append(g);
  list.welt.forEach((w, i) => {
    const z = zettel('weltquest' + (w.geschehen ? ' erledigt' : ''), ROT[(i + 3) % ROT.length]);
    z.innerHTML = `<span class="q-slot">Weltereignis</span>${w.dauer?.kampf ? ` <span class="q-kampfbadge">${KAMPF()}Kampf</span>` : ''}<b class="auf-titel">${esc(w.titel)}</b><p class="small">${esc(w.kurz)}</p>`;
    if (w.geschehen) z.append(p(`Geschehen: ${w.geschehen.titel} – ${w.geschehen.ich ? 'durch dich' : 'durch ' + (w.geschehen.wer || 'jemanden')}, ${new Date(w.geschehen.seit).toLocaleDateString('de-DE')}.`, 'small welt-geschehen'));
    else if (w.laeuft) z.append(row(btn('Weiterspielen', true, () => { const r = list.laufend?.run; if (r) resumeQuest(r); })));
    else if (!w.hier) z.append(p(`Beginnt in ${w.fundort_name}. Reise dorthin (Karte → ${w.fundort_name} → Hinreisen).`, 'muted small'));
    else if (list.laufend) z.append(p('Erst die laufende Reise beenden.', 'muted small'));
    else {
      const msg = p('', 'small error');
      const go = async (beg) => {
        if (!(await aufbruchOk(w.id, w.titel))) return;
        const { data: r, error: e } = await db.rpc('quest_start', { p_quest: w.id, p_begleiter: beg });
        if (e) { msg.textContent = e.message; return; } if (!r.ok) { msg.textContent = r.grund; return; }
        launchQuest(r.view);
      };
      if (w.fundort) z.append(row(btn('Darauf einlassen', true, () => go([]))), msg);
      else {
        const open = btn('Ansehen', false, () => { open.remove(); const pk = companionPicker(list.begleiter); z.append(pk.el, row(btn('Aufbrechen', true, () => go([...pk.chosen]))), msg); });
        z.append(row(open));
      }
    }
    g.append(z);
  });
}
/* ───────────── Reisen, fremde Orte, Beschäftigung, Abschluss ───────────── */
const ORT_ART = { grossstadt: 'Großstadt', stadt: 'Stadt', dorf: 'Dorf', burg: 'Burg' };
const FERT_IDS = ['anpacken', 'flink', 'spuren', 'heilkunde', 'ueberreden', 'einschuechtern', 'beruhigen', 'feilschen', 'menschenkenntnis', 'altes_wissen', 'kampf'];
const FERT_STUFE = ['Ungeübt', 'Anfänger', 'Geübt', 'Erfahren', 'Gewandt', 'Meister', 'Großmeister'];
const FERT_NAME = (id) => (id === 'kampf' ? 'Waffenübung' : CHECKS[id]?.name || id);
function bestaetige({ titel, text, ja = 'Ja', nein = 'Abbrechen' }) {
  return new Promise((res) => {
    const { box, close } = amtOverlay(); box.classList.add('frage');
    box.innerHTML = `<h2>${esc(titel)}</h2><p>${esc(text)}</p>`;
    box.append(row(btn(ja, true, () => { close(); res(true); }), btn(nein, false, () => { close(); res(false); })));
  });
}
// Vor langen Entscheidungen: wie lange bin ich weg?
async function aufbruchOk(id, titel) {
  const { data: d, error } = await db.rpc('quest_dauer', { p_quest: id });
  if (error || !d || (d.max || 0) < 20) return true;
  const weg = d.min === d.max ? `ca. ${dauerText(d.max)}` : `je nach Weg ${dauerText(d.min)} bis ${dauerText(d.max)}`;
  return bestaetige({ titel: `Aufbrechen: ${titel}`, text: `Die Wege dauern ${weg}${d.heimweg ? `, dazu kommt der Rückweg (ca. ${dauerText(d.heimweg)})` : ''}.${d.kampf ? ` Unterwegs wartet ein Kampf (ca. ${d.kampf} Min.).` : ''} Solange du fort bist, kannst du im Dorf nichts tun und dein Platz dort bleibt leer.`, ja: 'Aufbrechen' });
}
let zieleCache = null, zieleAt = 0;
async function reiseZiele(neu = false) {
  if (!neu && zieleCache && Date.now() - zieleAt < 20000) return zieleCache;
  const { data, error } = await db.rpc('reise_ziele'); if (error) { console.warn('Reiseziele:', error.message); return null; }
  zieleCache = data; zieleAt = Date.now(); return data;
}
async function reisen(ziel, z) {
  const an = new Date(Date.now() + ziel.minuten * 60000).toISOString();
  const ok = await bestaetige({ titel: ziel.heim ? `Heim nach ${ziel.name}` : `Reise nach ${ziel.name}`,
    text: `Von ${z.von_name || 'hier'} aus bist du ca. ${dauerText(ziel.minuten)} zu Fuß unterwegs – Ankunft gegen ${clock(an)} Uhr.${ziel.heim ? '' : ' Solange du fort bist, kannst du daheim nichts tun und dein Platz im Dorf bleibt leer.'}`, ja: 'Aufbrechen' });
  if (!ok) return;
  const { data, error } = await db.rpc('reise_start', { p_ziel: ziel.heim ? 'heim' : ziel.id });
  if (error) { toast(esc(error.message)); return; }
  zieleCache = null; document.querySelector('.ort-overlay')?.remove();
  toast(`<b>Du brichst auf nach ${esc(data.ziel_name)}.</b> Ankunft gegen ${clock(data.ankunft)} Uhr.`, 8000);
  loadAmt(false);
}
// Info-Karte der Weltkarte: Reise-Knopf für die Orte, die man besuchen kann
function karteAktion(o, box) {
  const slot = document.createElement('div'); slot.className = 'wk-reise'; box.append(slot);
  reiseZiele().then((z) => {
    if (!z || !slot.isConnected) return; const ziel = (z.ziele || []).find((x) => x.id === o.id); if (!ziel) return;
    if (ziel.hier) {
      slot.append(p(z.zustand === 'ort' ? 'Hier bist du gerade.' : 'Hier ist dein Zuhause.', 'small muted'));
      if (z.zustand === 'ort') slot.append(row(btn('Ort ansehen', true, () => { weltkarte?.schliessen?.(); openOrt(); })));
      return;
    }
    if (!['daheim', 'ort'].includes(z.zustand)) { slot.append(p('Reisen kannst du, sobald du nicht mehr unterwegs bist.', 'small muted')); return; }
    slot.append(row(btn(`${ziel.heim ? 'Heimreisen' : 'Hinreisen'} · ca. ${dauerText(ziel.minuten)}`, true, () => reisen(ziel, z))));
  });
}
// Ein fremder Ort: Leute, Spieler, Aufgaben, Weiterreise
async function openOrt() {
  const { data: o, error } = await db.rpc('ort_besuch');
  if (error || !o) { toast(error ? esc(error.message) : 'Du bist gerade nicht in einem fremden Ort.'); return; }
  document.querySelector('.ort-overlay')?.remove();
  const { ov, box, close } = amtOverlay(); ov.classList.add('ort-overlay'); box.classList.add('ort-box');
  box.append(ortBildCanvas(o.bild));
  const kopf = document.createElement('div');
  kopf.innerHTML = `<span class="amt-label">${esc(ORT_ART[o.art] || 'Ort')}${o.reich?.name ? ' · ' + esc(o.reich.name) : ''}</span><h2>${esc(o.name)}</h2><p>${esc(o.text || '')}</p>${o.existenz ? `<p class="small muted">${esc(o.existenz)}</p>` : ''}`;
  box.append(kopf, h3('Leute hier'));
  const grid = document.createElement('div'); grid.className = 'ort-leute'; box.append(grid);
  const karte = (look, name, html, cls) => { const d = document.createElement('div'); d.className = 'ort-person ' + (cls || ''); d.append(portraitCanvas(planFromLook(look, name), 56)); const t = document.createElement('div'); t.innerHTML = html; d.append(t); grid.append(d); return t; };
  for (const sp of o.spieler || []) karte(sp.look, sp.name, `<b>${esc(sp.name)}</b> <span class="tag-spieler">Spieler</span><br><span class="small">${sp.hausherr ? 'wohnt hier' : 'zu Gast aus ' + esc(sp.heimat || 'der Fremde')}</span>`, 'spieler');
  for (const n of o.bewohner || []) {
    if (n.namenlos) { karte(n.look, n.name, `<span>${esc(n.beruf)}</span><br><span class="small">kennt dich nicht</span>`, 'grau'); continue; }
    const t = karte(n.look, n.name, `<b>${esc(n.name)}</b> · <span class="small">${esc(n.beruf)}</span><br><span class="small muted">${esc(n.kennt ? n.stimmung : 'fremd')}${n.zustand !== 'gesund' ? ' · ' + esc(n.zustand) : ''}</span>`);
    t.append(btn('Ansprechen', false, () => {
      close();
      startTalk({ id: n.id, name: n.name, job: n.beruf, plan: planFromLook(n.look, n.name), wesen: n.wesen, stimmung: n.kennt ? n.stimmung : 'fremd', fremd: true, onEnde: () => setTimeout(openOrt, 250) });
    }));
  }
  if (!(o.spieler || []).length && !(o.bewohner || []).length) grid.append(p('Niemand zu sehen.', 'muted small'));
  if ((o.neuigkeiten || []).length) {
    box.append(h3('Was man sich hier erzählt'));
    const ul = document.createElement('ul'); ul.className = 'ort-news';
    ul.innerHTML = o.neuigkeiten.map((n) => `<li>${esc(n.text)} <span class="small muted">· ${esc(n.quelle)}</span></li>`).join('');
    box.append(ul);
  }
  if ((o.quests || []).length) {
    box.append(h3('Was es hier zu tun gibt'));
    for (const q of o.quests) {
      const z = document.createElement('div'); z.className = 'ort-quest';
      z.innerHTML = `<b>${esc(q.titel)}</b>${q.erledigt ? ' <span class="muted small">· schon erlebt</span>' : ''}<p class="small">${esc(q.kurz || q.beschreibung || '')}</p>${q.dauer?.kampf ? `<p class="small q-kampfhint">${KAMPF()}Mit Kampf (ca. ${q.dauer.kampf} Min.)</p>` : ''}`;
      const msg = p('', 'small error');
      z.append(row(btn(q.erledigt ? 'Nochmal erleben (Testphase)' : 'Darauf einlassen', true, async () => {
        if (!(await aufbruchOk(q.id, q.titel))) return;
        const { data: r, error: e } = await db.rpc('quest_start', { p_quest: q.id, p_begleiter: [] });
        if (e) { msg.textContent = e.message; return; } if (!r.ok) { msg.textContent = r.grund; return; }
        close(); launchQuest(r.view);
      })), msg);
      box.append(z);
    }
  }
  box.append(h3('Weiterreisen'));
  const wl = document.createElement('div'); wl.className = 'ort-weiter'; box.append(wl);
  reiseZiele(true).then((z) => {
    for (const ziel of (z?.ziele || []).filter((x) => !x.hier)) wl.append(btn(`${ziel.heim ? 'Heim nach ' : ''}${ziel.name} · ca. ${dauerText(ziel.minuten)}`, !!ziel.heim, () => { close(); reisen(ziel, z); }));
  });
  box.append(row(btn('Schließen', false, close)));
}
// Zusammenfassung nach einem Abenteuer
function showAbschluss({ abschluss: a, weg }) {
  if (!a) return;
  const { box, close } = amtOverlay(); box.classList.add('abschluss');
  const ert = (a.ertrag || []).filter(Boolean);
  const wege = (a.wege || []).slice().reverse();
  const wegTxt = !weg ? '' : weg.daheim ? (weg.minuten ? `Du machst dich auf den Heimweg. <b>Zurück im Dorf gegen ${clock(weg.ankunft)} Uhr</b> (ca. ${dauerText(weg.minuten)}). Bis dahin ist dein Platz im Dorf leer.` : 'Du bist wieder daheim.')
    : weg.minuten ? `Du ziehst weiter nach <b>${esc(weg.ziel_name)}</b> – Ankunft gegen ${clock(weg.ankunft)} Uhr (ca. ${dauerText(weg.minuten)}).` : `Du bleibst in <b>${esc(weg.ziel_name)}</b> und siehst dich um.`;
  box.innerHTML = `<span class="amt-label">Abenteuer abgeschlossen</span><h2>${esc(a.titel)}</h2>
    <p class="small muted">${[a.minuten >= 2 ? `${dauerText(a.minuten)} seit dem Aufbruch` : '', a.gelaufen >= 1 ? `${dauerText(a.gelaufen)} auf Wegen` : '', a.begleiter?.length ? `mit ${esc(liste(a.begleiter))}` : ''].filter(Boolean).join(' · ')}</p>
    ${wege.length ? `<h4>Deine Entscheidungen</h4><ol class="abs-wege">${wege.map((w) => `<li>${esc(w)}</li>`).join('')}</ol>` : ''}
    ${ert.length ? `<h4>Was es dir eingebracht hat</h4><ul class="abs-ertrag">${ert.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="small muted">Diesmal bleibt dir vor allem die Erinnerung.</p>'}
    ${wegTxt ? `<p class="abs-weg">${wegTxt}</p>` : ''}`;
  box.append(row(btn('Weiter', true, () => { close(); if (weg && !weg.daheim && !weg.minuten) openOrt(); })));
  loadAmt(false);
}
// Beschäftigung (1–12 Stunden) und Fertigkeiten
function fertigkeitenListe(f) {
  const d = document.createElement('div'); d.className = 'fert-liste';
  d.innerHTML = `<h4>Deine Fertigkeiten</h4><p class="small muted">Steigen durch Übung und ein wenig durch Proben in Abenteuern. Ab „Anfänger“ +1 auf Proben, ab „Erfahren“ +2, ab „Meister“ +3. Waffenübung macht dich im Kampf stärker.</p>
    <ul>${FERT_IDS.map((id) => { const x = f[id] || { xp: 0, stufe: 0 }; const prev = 3 * x.stufe * (x.stufe + 1), nxt = 3 * (x.stufe + 1) * (x.stufe + 2); const t = x.stufe >= 6 ? 1 : (x.xp - prev) / (nxt - prev);
      return `<li><span>${esc(FERT_NAME(id))}</span><span class="fert-stufe">${esc(FERT_STUFE[x.stufe] || '')}</span><span class="fert-bar"><i style="width:${Math.round(Math.max(0, Math.min(1, t)) * 100)}%"></i></span></li>`; }).join('')}</ul>`;
  return d;
}
function showFeierabend(r) {
  if (!r) return;
  const { box, close } = amtOverlay(); box.classList.add('abschluss');
  box.innerHTML = `<span class="amt-label">${r.abbruch ? 'Früher aufgehört' : 'Feierabend'}</span><h2>${esc(r.name)}</h2>
    <p>${esc(dauerText(r.stunden * 60))} gearbeitet${r.mit ? ` – zusammen mit ${esc(r.mit)}` : ''}.</p>${r.ertrag ? `<p>${esc(r.ertrag)}</p>` : ''}
    <h4>Geübt</h4><ul class="abs-ertrag">${(r.fertigkeiten || []).map((f) => `<li>${esc(FERT_NAME(f.id))}: ${esc(FERT_STUFE[f.nachher] || '')}${f.nachher > f.vorher ? ' <b class="ok">– du bist besser geworden!</b>' : ''}</li>`).join('')}</ul>`;
  box.append(row(btn('Gut', true, close)));
  setBesch(null);
}
// Hinweis oben rechts, solange der Charakter beschäftigt ist
function setBesch(a) {
  let b = $('besch-banner');
  if (!a) { b?.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'besch-banner'; b.className = 'ui'; document.body.append(b); }
  b.innerHTML = `<span class="ub-label">Beschäftigt</span><b>${esc(a.name)}</b><span class="small">Du ${esc(a.taetigkeit)} – bis gegen ${clock(a.bis)} Uhr.</span>`;
  b.append(btn('Ansehen', false, () => { openMenu('quests'); setTimeout(() => document.querySelector('.besch')?.scrollIntoView({ behavior: 'smooth' }), 1200); }));
}
async function beschCheck() {
  const { data, error } = await db.rpc('beschaeftigung_status'); if (error || !data) return;
  setBesch(data.aktiv);
  if (data.fertig) showFeierabend(data.fertig);
  return data;
}
function renderBeschaeftigung(wrap) {
  wrap.append(schild('Den Tag verbringen'));
  const box = document.createElement('div'); box.className = 'besch'; box.append(p('…', 'small muted')); wrap.append(box);
  db.rpc('beschaeftigung_status').then(({ data: b, error }) => {
    box.innerHTML = ''; if (error || !b) { box.append(p('Konnte nicht geladen werden.', 'error')); return; }
    if (b.fertig) showFeierabend(b.fertig);
    setBesch(b.aktiv);
    box.append(p('Keine Lust auf Geschichten? Dann pack im Dorf mit an oder übe etwas – 1 bis 12 Stunden lang. Dein Charakter ist in der Zeit beschäftigt und im Dorf zu sehen. Du kannst jederzeit aufhören und bekommst, was du bis dahin geschafft hast. Wer etwas oft tut, wird darin besser.', 'brett-hinweis small'));
    if (b.aktiv) {
      const z = zettel('besch-aktiv', -0.4), ab = new Date(b.aktiv.start).getTime(), bis = new Date(b.aktiv.bis).getTime();
      z.innerHTML = `<b>${esc(b.aktiv.name)}</b><p class="small">Du ${esc(b.aktiv.taetigkeit)} – bis gegen ${clock(b.aktiv.bis)} Uhr.</p><div class="besch-bar"><span></span></div><p class="small muted besch-rest"></p>`;
      const upd = () => {
        const bar = z.querySelector('.besch-bar span'); if (!bar || !bar.isConnected) return clearInterval(window.__beschTimer);
        bar.style.width = (Math.min(1, (Date.now() - ab) / (bis - ab)) * 100).toFixed(1) + '%';
        const ms = bis - Date.now(); z.querySelector('.besch-rest').textContent = ms > 0 ? `noch ${dauerText(ms / 60000)}` : 'Feierabend!';
        if (ms <= 0) { clearInterval(window.__beschTimer); beschCheck().then(() => { if (active === 'quests' && !$('panel').hidden) renderPanel('quests'); }); }
      };
      z.append(row(btn('Aufhören (anteilig)', false, async () => {
        const { data, error: e } = await db.rpc('beschaeftigung_abbrechen'); if (e) { toast(esc(e.message)); return; }
        if (data?.ergebnis) showFeierabend(data.ergebnis); setBesch(null); renderPanel('quests');
      })));
      box.append(z); upd(); clearInterval(window.__beschTimer); window.__beschTimer = setInterval(upd, 15000);
    } else if (!b.frei) box.append(p('Gerade bist du nicht im Dorf. Beschäftigen kannst du dich, wenn du daheim bist.', 'muted small'));
    const g = document.createElement('div'); g.className = 'zettel-grid besch-grid'; box.append(g);
    b.arten.forEach((a, i) => {
      const z = zettel('besch-art', ROT[(i + 1) % ROT.length]);
      z.innerHTML = `<b>${esc(a.name)}</b><p class="small">${esc(a.text)}</p><p class="small muted">Übt: ${a.fert.map((f) => `${esc(FERT_NAME(f))} (${esc(FERT_STUFE[b.fertigkeiten[f]?.stufe || 0])})`).join(', ')}</p>`;
      if (!b.aktiv && b.frei) {
        const sel = document.createElement('select'); sel.className = 'besch-std';
        for (const h of [1, 2, 3, 4, 6, 8, 10, 12]) { const op = document.createElement('option'); op.value = h; op.textContent = h + (h === 1 ? ' Stunde' : ' Stunden'); if (h === 3) op.selected = true; sel.append(op); }
        const msg = p('', 'small error');
        z.append(row(sel, btn('Loslegen', true, async () => {
          if (!imDorf()) return;
          const { error: e } = await db.rpc('beschaeftigung_start', { p_art: a.id, p_stunden: +sel.value });
          if (e) { msg.textContent = e.message; return; }
          toast(`<b>${esc(a.name)}</b> – bis gegen ${clock(new Date(Date.now() + sel.value * 3600e3).toISOString())} Uhr.`); beschCheck(); renderPanel('quests');
        })), msg);
      }
      g.append(z);
    });
    box.append(fertigkeitenListe(b.fertigkeiten || {}));
  });
}
// Neue Geschichten, wenn nur noch wenige ungespielt sind (die KI schreibt nach festem Bauplan)
let nachschubLaeuft = false, nachschubVersucht = false;
function nachschub(n) {
  if (!n?.noetig || n.schreibt || nachschubLaeuft || nachschubVersucht) return;
  nachschubVersucht = true; nachschubLaeuft = true;
  db.functions.invoke('quest-weaver', { body: { nachschub: true } }).then(({ data, error }) => {
    nachschubLaeuft = false;
    if (error || !data?.ok) { console.warn('Nachschub:', error?.message || data?.grund); return; }
    toast(`<b>Eine neue Geschichte ist da:</b> „${esc(data.titel)}“. Du findest sie unter Quests bei den Geschichten.`, 9000);
    if (active === 'quests' && !$('panel').hidden) renderPanel('quests');
  });
}

/* ───────────── Schwarzes Brett: Hauptquest, Aushänge, Bitten, Aufträge ───────────── */
let amt = null, unterwegs = null;
function imDorf(p) {
  if (p?.fremd) return true;
  if (!unterwegs) return true;
  if (p && (unterwegs.begleiter || []).map(Number).includes(Number(p.id))) return true;
  const u = unterwegs;
  toast(u.zustand === 'ort' ? `<b>Du bist in ${esc(u.ort_name)}.</b> Daheim kannst du erst wieder etwas tun, wenn du zurückgereist bist.`
    : u.zustand === 'weg' ? `<b>Du bist auf dem Weg nach ${esc(u.nach_name)}</b> (Ankunft gegen ${clock(u.bis)} Uhr).`
    : u.zustand === 'wahl' ? '<b>Dein Abenteuer ist vorbei.</b> Wähle erst deinen Weg: heimkehren, bleiben oder weiterziehen.'
    : `<b>Du bist unterwegs</b> („${esc(u.titel)}“). Im Dorf kannst du erst wieder etwas tun, wenn du zurück bist.`, 6000);
  return false;
}
function setUnterwegs(neu) {
  unterwegs = neu || null;
  document.body.classList.toggle('unterwegs', !!unterwegs);
  scene?.setAway?.(!!unterwegs);
  let b = $('unterwegs-banner');
  if (!unterwegs) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'unterwegs-banner'; b.className = 'ui'; document.body.append(b); }
  const u = unterwegs;
  if (u.zustand === 'weg') {
    b.innerHTML = `<span class="ub-label">Unterwegs</span><b>Nach ${esc(u.nach_name)}</b><span class="small">Ankunft gegen ${clock(u.bis)} Uhr · noch <span class="ub-rest"></span></span>`;
    const tick = () => { const el = b.querySelector('.ub-rest'); if (!el || !el.isConnected) return clearInterval(window.__ubTimer); const ms = new Date(u.bis) - Date.now(); if (ms <= 0) { clearInterval(window.__ubTimer); el.textContent = 'gleich da'; setTimeout(() => loadAmt(false), 1500); return; } el.textContent = dauerText(ms / 60000); };
    clearInterval(window.__ubTimer); tick(); window.__ubTimer = setInterval(tick, 20000);
    b.append(btn('Karte', false, () => openMenu('karte')));
  } else if (u.zustand === 'ort') {
    b.innerHTML = `<span class="ub-label">In der Fremde</span><b>${esc(u.ort_name)}</b><span class="small">Dein Platz im Dorf ist leer, bis du zurückkehrst.</span>`;
    b.append(btn('Ort ansehen', true, () => openOrt()));
  } else if (u.zustand === 'wahl') {
    b.innerHTML = `<span class="ub-label">Reise zu Ende</span><b>${esc(u.titel)}</b><span class="small">Wohin jetzt? Heim, bleiben oder weiterziehen.</span>`;
    b.append(btn('Weg wählen', true, () => resumeQuest(u.run)));
  } else {
    b.innerHTML = `<span class="ub-label">Unterwegs</span><b>${esc(u.titel)}</b><span class="small">Dein Platz im Dorf ist leer, bis du zurückkehrst.</span>`;
    b.append(btn(u.reist ? 'Zur Reise' : 'Weiterspielen', true, () => resumeQuest(u.run)));
  }
}
const imDorfFilter = (d) => d && Array.isArray(d.residents) ? { ...d, residents: d.residents.filter((r) => !r.unterwegs) } : d;
const ART_NAME = { rechtsfall: 'Rechtsfall', krise: 'Krise', koenig: 'Brief des Königs', bittsteller: 'Bittsteller', handel: 'Handel', nachbarn: 'Nachbarn', dorfleben: 'Dorfleben', bau: 'Bauen & Schützen' };
async function loadAmt(showChange = true) {
  const { data, error } = await db.rpc('amt_status');
  if (error || !data?.ansehen) { if (error) console.warn('Amt:', error.message); return amt; }
  const before = amt;
  amt = data;
  setUnterwegs(data.unterwegs);
  if (data.nachrichten?.length) showNachrichten(data.nachrichten);
  if (showChange && before && data.ansehen.stufe > before.ansehen.stufe) toast(`<b>Im Dorf sagt man jetzt über dich:</b> „${esc(data.ansehen.wort)}“${data.ansehen.kandidat && !before.ansehen.kandidat ? '<br>Man nennt deinen Namen, wenn von der Versammlung die Rede ist.' : ''}`, 9000);
  return amt;
}
async function checkAmtPopups() {
  await loadAmt();
  const w = amt?.wahl;
  if (w && !w.gesehen && (w.status === 'gewaehlt' || w.status === 'verloren')) showWahl(w);
  else if (amt?.lagerfeuer?.neu && !unterwegs && !document.querySelector('.amt-overlay')) showLagerfeuer(amt.lagerfeuer);
}
function showLagerfeuer(lf) {
  const { box, close } = amtOverlay(); box.classList.add('lagerfeuer');
  const me = village?.character_name || 'du', r = lf.redner || { name: 'Jemand', beruf: '' };
  const grund = lf.krisen?.length ? `uns durch „${lf.krisen[0]}“ gebracht` : lf.taten?.length ? `„${lf.taten[0]}“ bestanden` : 'sich um jeden von uns gekümmert';
  const cv = document.createElement('canvas'); cv.width = 240; cv.height = 90; cv.className = 'lf-szene';
  box.append(cv);
  const h = document.createElement('div');
  h.innerHTML = `<span class="amt-label">Am Lagerfeuer</span><h2>„Wie wäre es mit ${esc(me)}?“</h2>`;
  box.append(h);
  const port = r.look ? portraitCanvas({ ...r.look, name: r.name, beruf: r.beruf }) : null; if (port) { port.className = 'lf-port'; box.append(port); }
  box.append(p(`Der Abend ist kalt, das Feuer knistert. ${r.name}${r.beruf ? ', ' + (r.beruf) : ''}, steht auf und räuspert sich: „Ich sag’s, wie es ist. ${me} hat ${grund}. Ich finde, ${me} wäre ein guter Anführer – jemand, der bei uns die wichtigen Entscheidungen trifft.“`, ''),
    p(`${lf.zweiter ? lf.zweiter + ' nickt sofort. ' : ''}${lf.volk?.ja ? 'Von den Bänken kommt zustimmendes Gemurmel.' : 'Ein paar Leute sehen sich unsicher an – aber niemand widerspricht.'} ${lf.vorsteher ? lf.vorsteher + ' schweigt und stochert im Feuer.' : ''}`, 'small'),
    p('Nimmst du an, kommt es zur Bürgerversammlung (Hauptquest, Kapitel 3). Lehnst du ab, bleibst du einer von allen – das Dorf wächst trotzdem weiter. Das Angebot steht.', 'small muted'));
  const msg = p('', 'small error');
  box.append(row(btn('Ich stelle mich zur Wahl', true, async () => { if (!imDorf()) return; const { data, error } = await db.rpc('amt_lagerfeuer', { p_ja: true }); if (error) { msg.textContent = error.message; return; } close(); toast(esc(data.text), 7000); await loadAmt(false); if (!$('panel').hidden && active === 'quests') renderPanel('quests'); }),
    btn('Noch nicht', false, async () => { await db.rpc('amt_lagerfeuer', { p_ja: false }); close(); await loadAmt(false); })), msg);
  // kleine Szene: Nacht, Feuer, Silhouetten
  const c = cv.getContext('2d'); let raf = 0; const t0 = performance.now();
  const draw = (t) => {
    if (!cv.isConnected) return cancelAnimationFrame(raf);
    const k = (t - t0) / 1000; const g = c.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#1e2436'); c.fillStyle = g; c.fillRect(0, 0, 240, 90);
    for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(255,255,230,${0.3 + 0.3 * Math.sin(k * 2 + i)})`; c.fillRect((i * 53) % 240, (i * 29) % 40, 1, 1); }
    c.fillStyle = '#141a14'; c.fillRect(0, 70, 240, 20);
    const fl = 0.7 + 0.3 * Math.sin(k * 9) * Math.sin(k * 5.3); const rg = c.createRadialGradient(120, 70, 2, 120, 70, 70); rg.addColorStop(0, `rgba(255,170,70,${0.45 * fl})`); rg.addColorStop(1, 'rgba(255,170,70,0)'); c.fillStyle = rg; c.fillRect(0, 0, 240, 90);
    for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#ffb040' : '#e85a20'; const hh = 8 + 6 * Math.abs(Math.sin(k * 7 + i)); c.beginPath(); c.moveTo(114 + i * 3, 72); c.lineTo(116 + i * 3, 72 - hh); c.lineTo(118 + i * 3, 72); c.fill(); }
    c.fillStyle = '#4a3020'; c.fillRect(110, 72, 20, 3);
    const sil = [[60, 0], [82, 1], [158, 1], [180, 0], [140, 2]]; for (const [x, st] of sil) { const up = st === 2 ? 6 : 0; c.fillStyle = '#05070a'; c.fillRect(x - 4, 56 - up, 8, 16 + up); c.beginPath(); c.arc(x, 52 - up, 4, 0, 7); c.fill(); }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
}
function zettel(cls = '', rot = 0) { const z = document.createElement('div'); z.className = 'zettel ' + cls; z.style.setProperty('--rot', rot + 'deg'); return z; }
function schild(text) { const s = document.createElement('div'); s.className = 'brett-schild'; s.textContent = text; return s; }
const ROT = [-1.4, 0.9, -0.6, 1.3, -1.1, 0.5, 1.6, -0.8];
function ansehenBar(a, meister = false) {
  const d = document.createElement('div'); d.className = 'ans';
  const steps = ['Neu im Dorf', 'Man kennt dich', 'Man schätzt dich', 'Man hört auf dich', 'Man vertraut dir'];
  d.innerHTML = `<div class="ans-head"><span>Ansehen im Dorf</span><b>${esc(a.wort)}</b></div><div class="ans-bar">${steps.map((s, i) => `<span class="${i <= a.stufe ? 'on' : ''}${i === 3 ? ' wahl' : ''}" title="${esc(s)}"></span>`).join('')}</div>
    <div class="ans-legend small">${meister ? 'Hältst du dein Ansehen hoch, folgt dir das Dorf auch in schweren Zeiten.' : 'Ansehen öffnet dir die Türen im Dorfrat. Zur Wahl schlagen dich aber die Leute selbst vor – wenn du dir ihr Vertrauen verdient hast.'}</div>`;
  if (a.zuletzt?.length) { const z = document.createElement('div'); z.className = 'ans-last small'; z.innerHTML = a.zuletzt.slice(0, 3).map((x) => `<span>${x.delta > 0 ? '+' : '−'} ${esc(x.grund)}</span>`).join(''); d.append(z); }
  return d;
}
function wegBox(w) {
  const d = document.createElement('div'); d.className = 'weg';
  const fz = w.fuersprecher.map((f) => `<span class="${f.ja ? 'ja' : ''}">${f.ja ? '✓ ' : ''}${esc(f.name)} <i>(${esc(f.wort)})</i></span>`);
  if (w.volk) fz.push(`<span class="${w.volk.ja ? 'ja' : ''}">${w.volk.ja ? '✓ ' : ''}die Leute im Dorf <i>(${esc(w.volk.wort)})</i></span>`);
  const wege = ['drei Fürsprecher und eine große Tat', 'zwei Fürsprecher und eine abgewendete Krise', 'fast alle mögen dich sehr'];
  d.innerHTML = `<b>Weg zur Versammlung</b>
    <div class="small"><u>Wer hinter dir steht:</u> ${fz.join(', ') || 'noch niemand'}</div>
    <div class="small"><u>Große Taten:</u> ${w.taten.length ? w.taten.map((t) => '✓ ' + esc(t)).join(', ') : 'noch keine <i>(eine schwere Reise oder eine große Geschichte bestehen)</i>'}</div>
    <div class="small"><u>Abgewendete Krisen:</u> ${w.krisen.length ? w.krisen.map((t) => '✓ ' + esc(t)).join(', ') : 'noch keine <i>(hilf, wenn am Brett „Hilfe gesucht“ hängt)</i>'}</div>
    ${w.zeit_ok === false ? `<div class="small weg-zeit">Du lebst noch nicht lange hier: Frühestens ab <b>${esc(new Date(w.ab).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }))}</b> kann man dich vorschlagen.</div>` : ''}
    <div class="small weg-wege">Einer dieser Wege genügt: ${wege.map((t, i) => `<span class="${w.wege[i] ? 'ja' : ''}">${w.wege[i] ? '✓ ' : ''}${t}</span>`).join(' · ')}</div>`;
  return d;
}
function renderHaupt(wrap, list) {
  const A = amt; if (!A) return;
  const z = zettel('haupt', -0.4);
  const c = A.chronik;
  const amtTxt = A.amt.ich ? `Du bist Dorfmeister von ${esc(village?.village_name || 'deinem Dorf')}.` : `${esc(A.amt.vorsteher || 'Der Vorsteher')} führt das Dorf als Vorsteher – mit halber Kraft.`;
  z.innerHTML = `<div class="haupt-kopf"><span class="haupt-label">Hauptquest · Chronik des Dorfes</span>${c ? `<h3>Kapitel ${c.kapitel}: ${esc(c.titel)}</h3>` : '<h3>Fortsetzung folgt</h3>'}</div>
    <p class="small">${c ? esc(c.kurz) : A.amt.ich ? 'Als Dorfmeister wartet bald der König auf dich. Die nächsten Kapitel der Chronik sind in Arbeit.' : 'Die Chronik geht bald weiter.'}</p>
    <p class="small haupt-amt">${amtTxt}</p>`;
  z.append(ansehenBar(A.ansehen, A.amt.ich));
  if (!A.amt.ich && A.weg && A.kapitel <= 3) z.append(wegBox(A.weg));
  if (A.lagerfeuer && !A.amt.ich) z.append(row(btn('Zum Lagerfeuer', true, () => showLagerfeuer(A.lagerfeuer))));
  if (c) {
    if (c.run) z.append(row(btn('Weiterspielen', true, () => resumeQuest(c.run))));
    else if (c.frei) {
      const open = btn(c.erledigt ? 'Erneut antreten' : 'Aufbrechen', true, () => {
        open.remove(); const pk = companionPicker(list.begleiter); const msg = p('', 'small error');
        z.append(pk.el, row(btn('Los geht’s', true, async () => {
          if (!(await aufbruchOk('chronik_' + c.kapitel, c.titel))) return;
          const { data: r, error: e } = await db.rpc('chronik_start', { p_begleiter: [...pk.chosen] });
          if (e) { msg.textContent = e.message; return; } if (!r.ok) { msg.textContent = r.grund; return; }
          launchQuest(r.view);
        })), msg);
      });
      z.append(row(open));
    } else z.append(p(c.grund || '', 'small haupt-grund'));
  }
  wrap.append(z);
}
function renderAushaenge(wrap) {
  const A = amt; if (!A) return;
  const kr = A.krisen || [], tr = A.trauer || [];
  if (A.amt.ich && !A.offen.length && A.naechster) {
    wrap.append(schild('Dein Tisch als Dorfmeister'));
    const zz = zettel('aushang', -0.6); zz.innerHTML = `<span class="aus-art">Für heute erledigt</span><p class="small">Alles entschieden. Die nächste Sache liegt ${esc(whenText(A.naechster))} auf deinem Tisch – jeden Tag genau eine.</p>`; wrap.append(zz);
  }
  if (!A.offen.length && !A.aushaenge.length && !kr.length && !tr.length) return;
  wrap.append(schild(A.offen.length ? 'Aushänge · Entscheidung nötig' : kr.length ? 'Aushänge · Hilfe gesucht' : 'Aushänge'));
  const g = document.createElement('div'); g.className = 'zettel-grid'; wrap.append(g);
  kr.forEach((e, i) => {
    const z = zettel('aushang offen krise', ROT[(i + 1) % ROT.length]);
    z.innerHTML = `<span class="aus-art">Krise · Hilfe gesucht</span><b>${esc(e.titel)}</b><p class="small">${esc(e.text)}</p><p class="small muted">Wenn niemand hilft, entscheidet ${esc(A.amt.vorsteher || 'der Vorsteher')} ${esc(whenText(e.frist))} allein – mit allen Folgen.</p>`;
    if (e.geholfen) z.append(p('Du hast schon mit angepackt.', 'small'));
    else z.append(row(btn(e.hilfe.text, true, async () => {
      if (!imDorf()) return;
      const ok = await playMinigame(e.hilfe.spiel, { schwer: 2, titel: e.titel, text: e.hilfe.text });
      const { data: r, error: er } = await db.rpc('krise_helfen', { p_ereignis: e.id, p_erfolg: ok });
      if (er || !r?.ok) { toast(esc(er?.message || r?.grund || 'Das hat nicht geklappt.')); return; }
      const { box, close } = amtOverlay(); box.classList.add('aushang-rolle');
      box.innerHTML = `<span class="amt-label">${r.erfolg ? 'Krise abgewendet' : 'Krise'}</span><h2>${esc(e.titel)}</h2>`;
      box.append(p(r.text, 'ent-ergebnis'), p(r.erfolg ? 'Das wird man dir im Dorf nicht vergessen.' : 'Trotzdem: Man hat gesehen, dass du da warst.', 'small muted'), row(btn('Schließen', true, async () => { close(); await loadAmt(); loadVillageState(); if (!$('panel').hidden && active === 'quests') renderPanel('quests'); })));
    })));
    g.append(z);
  });
  tr.forEach((e, i) => { const z = zettel('aushang trauer', ROT[(i + 4) % ROT.length]); z.innerHTML = `<span class="aus-art">In Erinnerung</span><p class="small">${esc(e.text)}</p>`; g.append(z); });
  A.offen.forEach((e, i) => {
    const z = zettel('aushang offen', ROT[i % ROT.length]);
    z.innerHTML = `<span class="aus-art">${esc(ART_NAME[e.art] || 'Aushang')} · Heute auf deinem Tisch</span><b>${esc(e.titel)}</b><p class="small">${esc(e.text)}</p><p class="small muted">${e.frist ? `Entscheide bis ${esc(whenText(e.frist))}, sonst entscheidet ${esc(A.amt.vorsteher || 'der Vorsteher')}.` : 'Niemand entscheidet für dich – die Sache bleibt liegen, bis du dich festlegst. Erst danach kommt die nächste.'}</p>`;
    z.append(row(btn('Entscheiden', true, () => showEntscheidung(e))));
    g.append(z);
  });
  if (!A.offen.length) A.aushaenge.slice(0, 3).forEach((e, i) => {
    const z = zettel('aushang', ROT[(i + 3) % ROT.length]);
    z.innerHTML = `<span class="aus-art">${esc(ART_NAME[e.art] || 'Bekanntmachung')}</span><b>${esc(e.titel)}</b><p class="small">${esc(e.ergebnis || '')}</p><p class="small muted">${e.von === 'spieler' ? 'Deine Entscheidung' : 'Entschieden von ' + esc(A.amt.vorsteher || 'dem Vorsteher')}: „${esc(e.wahl || '')}“</p>`;
    g.append(z);
  });
}
function renderHeute(wrap, h) {
  wrap.append(schild('Heute im Dorf'));
  const g = document.createElement('div'); g.className = 'zettel-grid'; wrap.append(g);
  const tw = h.tagwerk || [];
  if (!tw.length) { const z = zettel('klein', 0.7); z.append(p('Heute bittet dich niemand um etwas. Genieß den Tag.', 'small')); g.append(z); }
  tw.forEach((t, i) => {
    const z = zettel('klein' + (t.status !== 'offen' ? ' erledigt' : ''), ROT[i % ROT.length]);
    z.innerHTML = `<b>${esc(t.titel)}</b><span class="small muted"> · ${esc(t.npc)}${t.namenlos ? '' : ` (${esc(t.beruf)})`}</span><p class="small">„${esc(t.bitte)}“</p>`;
    if (t.status === 'offen') {
      z.append(row(btn('Helfen', true, async () => {
        if (!imDorf()) return;
        const ok = await playMinigame(t.art, { schwer: t.schwer, titel: t.titel, text: t.npc + ': „' + t.bitte + '“' });
        const { data: r, error: e } = await db.rpc('tagwerk_fertig', { p_id: t.id, p_erfolg: ok });
        if (e) { toast('Das hat nicht geklappt: ' + esc(e.message)); return; }
        if (r.ok) toast(`<b>${esc(t.npc)}:</b> „${esc(r.text)}“${r.extra ? '<br>' + esc(r.extra) : ''}`, 9000);
        await loadAmt();
        if (!$('panel').hidden && active === 'quests') renderPanel('quests');
      })));
    } else z.append(p((t.status === 'erledigt' ? '✓ ' : '✗ ') + (t.ergebnis || ''), 'muted small'));
    g.append(z);
  });
}
function renderUnterwegs(wrap, h) {
  wrap.append(schild('Hinaus vor das Dorf'));
  const g = document.createElement('div'); g.className = 'zettel-grid'; wrap.append(g);
  const e = h.erkunden || {};
  const ec = zettel('', -0.9);
  ec.innerHTML = `<b>Umgebung erkunden</b><p class="small">Kurze Streifzüge rund ums Dorf: Bachläufe, Ruinen, Fremde am Weg. Du bist gleich wieder zurück.</p><p class="small q-kampfhint">${KAMPF()}Manche enden in einem Kampf (ca. 10 Min.).</p>`;
  if (e.lauf) ec.append(row(btn('Weiter erkunden', true, () => resumeQuest(e.lauf))));
  else if (e.rest > 0) {
    const msg = p('', 'small error');
    ec.append(row(btn(`Losziehen (heute noch ${e.rest}×)`, true, async () => {
      if (!imDorf()) return;
      const { data: r, error: er } = await db.rpc('erkunden_start');
      if (er) { msg.textContent = er.message; return; }
      if (!r.ok) { msg.textContent = r.grund === 'muede' ? 'Für heute bist du genug herumgestreift.' : 'Gerade gibt es nichts zu entdecken.'; return; }
      resumeQuest(r.run);
    })), msg);
  } else ec.append(p('Für heute bist du genug herumgestreift. Morgen gibt es Neues.', 'muted small'));
  g.append(ec);
}
const SLOT = { einfach: ['Leicht', 'q-leicht'], mittel: ['Mittel', 'q-mittel'], schwer: ['Schwer', 'q-schwer'], individuell: ['Individuell', 'q-indiv'] };
function renderQuests(body) {
  const wrap = document.createElement('div'); wrap.className = 'brett'; wrap.append(p('…', 'small')); body.append(wrap);
  Promise.all([db.rpc('quest_board'), db.rpc('quest_list'), db.rpc('heute'), loadAmt(false)]).then(([b, l, hh]) => {
    wrap.innerHTML = '';
    if (b.error || l.error) { wrap.append(p('Konnte die Quests nicht laden.', 'error')); return; }
    const board = b.data, list = l.data;
    renderHaupt(wrap, list);
    if (list.welt?.length) renderWelt(wrap, list);
    if (list.laufend) {
      const run = (board.angebote || []).find((o) => o.run === list.laufend.run);
      const q = list.quests.find((x) => x.id === list.laufend.quest);
      const z = zettel('laufend', 0.6);
      z.innerHTML = `<b>Unterwegs: ${esc(list.laufend.titel || run?.titel || q?.titel || 'ein Abenteuer')}</b>`;
      z.append(row(btn('Weiterspielen', true, () => resumeQuest(list.laufend.run)), btn('Abbrechen', false, async () => { await db.rpc('quest_abort', { p_run: list.laufend.run }); renderPanel('quests'); })));
      wrap.append(z);
    }
    renderAushaenge(wrap);
    if (hh.data) renderHeute(wrap, hh.data); else if (hh.error) console.warn('Heute:', hh.error.message);
    renderBeschaeftigung(wrap);
    wrap.append(schild('Aufträge am Brett'));
    wrap.append(p('Jeden Tag neu (ab Mitternacht). Die Geschichten spielen mit echten Bewohnern deines Dorfes – was du tust, merken sie sich.', 'brett-hinweis small'));
    const g = document.createElement('div'); g.className = 'zettel-grid'; wrap.append(g);
    board.angebote.filter((x) => x.slot !== 'individuell').forEach((o, i) => {
      const [lab, cls] = SLOT[o.slot];
      const z = zettel('auftrag ' + cls + (o.status === 'erledigt' ? ' erledigt' : ''), ROT[(i + 2) % ROT.length]);
      z.innerHTML = `<span class="q-slot">${lab}</span>${o.kampf ? ` <span class="q-kampfbadge" title="In diesem Abenteuer kommt es zu einem Kampf.">${KAMPF()}ca. ${o.kampf} Min.</span>` : ''}<b class="auf-titel">${esc(o.titel)}</b>${o.status === 'erledigt' ? ' <span class="muted small">· erledigt</span>' : o.status === 'angenommen' ? ' <span class="muted small">· läuft</span>' : ''}<p class="small">${esc(o.kurz)}</p><p class="muted small">Beteiligt: ${o.rollen.map((r) => `${esc(r.name)} (${esc(r.beruf)})`).join(', ')}</p>`;
      if (o.status === 'offen' && list.laufend) z.append(p('Erst die laufende Reise beenden – du kannst nur auf einer gleichzeitig sein.', 'muted small'));
      if (o.status === 'offen' && !list.laufend) {
        const open = btn('Ansehen', false, () => {
          open.remove();
          const pk = companionPicker(list.begleiter, new Set(o.rollen.map((r) => r.id))); const msg = p('', 'small error');
          z.append(pk.el, row(btn('Aufbrechen', true, async () => {
            if (o.template && !(await aufbruchOk(o.template, o.titel))) return;
            const { data: r, error: e } = await db.rpc('quest_take', { p_angebot: o.id, p_begleiter: [...pk.chosen] });
            if (e) { msg.textContent = e.message; return; } if (!r.ok) { msg.textContent = r.grund; return; }
            launchQuest(r.view);
          })), msg);
        });
        z.append(row(open));
      }
      g.append(z);
    });
    if (hh.data) renderUnterwegs(wrap, hh.data);
    // Eigenes Abenteuer (KI)
    const ind = board.angebote.find((x) => x.slot === 'individuell');
    wrap.append(schild('Dein eigenes Abenteuer'));
    const ic = zettel('indiv', -0.5);
    if (ind && ind.status !== 'fehlgeschlagen') {
      ic.innerHTML = `<span class="q-slot">Individuell</span> <b>${esc(ind.titel)}</b><p class="small">Ziel: ${esc(ind.ziel || '')}</p><p class="muted small">${ind.status === 'erledigt' ? 'Heute schon erlebt. Morgen kannst du ein neues Ziel setzen.' : ind.status === 'wird_geschrieben' ? 'Die Geschichte wird gerade geschrieben …' : 'Läuft.'}</p>`;
    } else {
      ic.innerHTML = `<span class="q-slot">Individuell</span> <b>Ein Ziel, eine Geschichte</b><p class="small">Setz dir ein Ziel – die KI baut daraus eine Geschichte mit Wendungen, Entscheidungen und Folgen. Einmal pro Tag.</p>`;
      const ta = document.createElement('textarea'); ta.className = 'q-goal'; ta.maxLength = 200; ta.rows = 2; ta.placeholder = 'z. B. „Ein Bündnis mit dem Dorf am Fluss schließen“';
      ic.append(ta);
      if (list.laufend) ic.append(p('Erst das laufende Abenteuer beenden.', 'muted small'));
      else {
        const pk = companionPicker(list.begleiter); const msg = p('', 'small error');
        ic.append(pk.el, row(btn('Abenteuer erschaffen', true, async () => {
          const ziel = ta.value.trim(); if (ziel.length < 8) { msg.textContent = 'Beschreib dein Ziel in ein paar Worten.'; return; }
          msg.textContent = '';
          const { data: r, error: e } = await db.rpc('quest_custom_start', { p_ziel: ziel, p_begleiter: [...pk.chosen] });
          if (e) { msg.textContent = e.message; return; } if (!r.ok) { msg.textContent = r.grund; return; }
          launchQuest(r.view);
          db.functions.invoke('quest-weaver', { body: { run: r.view.run } }).then(({ data: w, error: we }) => { if (we || !w?.ok) console.warn('Quest-Weber:', we?.message || w?.grund); });
        })), msg);
      }
    }
    wrap.append(ic);
    // Größere Geschichten (Nebenquests, freigeschaltet durch Wissen)
    if (list.nachschub) nachschub(list.nachschub);
    if (list.quests.length) {
      wrap.append(schild('Geschichten'));
      if (list.nachschub?.schreibt || nachschubLaeuft) wrap.append(p('Eine neue Geschichte wird gerade für dich geschrieben … sie erscheint hier in ein paar Minuten.', 'brett-hinweis small'));
      const g2 = document.createElement('div'); g2.className = 'zettel-grid'; wrap.append(g2);
      list.quests.forEach((q, i) => {
        const z = zettel('geschichte' + (q.offen ? '' : ' gesperrt'), ROT[(i + 5) % ROT.length]);
        z.innerHTML = `<b>${esc(q.titel)}</b>${q.erledigt ? ' <span class="muted small">· schon erlebt</span>' : ''}<p class="small">${esc(q.beschreibung)}</p>`;
        if (!q.offen) { z.append(p(q.hinweis ? `Du weißt noch zu wenig darüber. Vielleicht erzählen dir ${q.hinweis} mehr.` : 'Du weißt noch zu wenig darüber.', 'muted small')); g2.append(z); return; }
        if (list.laufend) z.append(p('Erst die laufende Reise beenden.', 'muted small'));
        if (!list.laufend) {
          const open = btn('Ansehen', false, () => {
            open.remove(); const pk = companionPicker(list.begleiter); const msg = p('', 'small error');
            z.append(pk.el, row(btn(q.erledigt ? 'Nochmal erleben (Testphase)' : 'Aufbrechen', true, async () => {
              if (!(await aufbruchOk(q.id, q.titel))) return;
              const { data: r, error: e } = await db.rpc('quest_start', { p_quest: q.id, p_begleiter: [...pk.chosen] });
              if (e) { msg.textContent = e.message; return; } if (!r.ok) { msg.textContent = r.grund; return; }
              launchQuest(r.view);
            })), msg);
          });
          z.append(row(open));
        }
        g2.append(z);
      });
    }
  });
}
/* ───────────── Pop-ups: Bürgerversammlung, Entscheidungen ───────────── */
function amtOverlay() { const ov = document.createElement('div'); ov.className = 'amt-overlay ui'; const box = document.createElement('div'); box.className = 'amt-rolle'; ov.append(box); document.body.append(ov); requestAnimationFrame(() => ov.classList.add('auf')); return { ov, box, close: () => { ov.classList.remove('auf'); setTimeout(() => ov.remove(), 250); } }; }
function bohnen(ja, nein) {
  const d = document.createElement('div'); d.className = 'bohnen';
  const krug = (n, cls, label) => `<div class="krug"><div class="krug-bohnen">${Array.from({ length: n }, (_, i) => `<i class="bohne ${cls}" style="--d:${(i * 0.09).toFixed(2)}s"></i>`).join('')}</div><span class="small">${label}: <b>${n}</b></span></div>`;
  d.innerHTML = krug(ja, 'weiss', 'Für dich') + krug(nein, 'schwarz', 'Dagegen');
  return d;
}
function showWahl(w) {
  const { box, close } = amtOverlay();
  const gew = w.status === 'gewaehlt';
  box.innerHTML = `<div class="amt-siegel"></div><span class="amt-label">Bürgerversammlung</span><h2>${gew ? 'Das Dorf hat dich gewählt' : esc(w.gegner || 'Der Vorsteher') + ' bleibt Vorsteher'}</h2>`;
  box.append(bohnen(w.ja, w.nein));
  if (gew) {
    box.append(p(`Mit ${w.ja} zu ${w.nein} Stimmen hat dich die Versammlung zum Dorfmeister gewählt. ${w.gegner || 'Der Vorsteher'} reicht dir die Hand. Alle warten auf deine Antwort.`, ''));
    const wahl = document.createElement('div'); wahl.className = 'amt-wahl';
    const ja = document.createElement('div'); ja.className = 'amt-opt ja';
    ja.innerHTML = '<b>Den Amtseid leisten</b><ul class="small"><li>Du erteilst Bauaufträge und legst den Schwerpunkt des Dorfes fest.</li><li>Du entscheidest, wer einziehen darf – und wer gehen muss.</li><li>Du sprichst Recht, führst durch Krisen und antwortest dem König als seine rechte Hand.</li><li>Das Dorf entwickelt sich mit <b>voller Kraft</b>.</li></ul>';
    const nein = document.createElement('div'); nein.className = 'amt-opt nein';
    nein.innerHTML = `<b>Ablehnen</b><ul class="small"><li>Du bleibst Bewohner und kümmerst dich um deine eigenen Wege.</li><li>${esc(w.gegner || 'Der Vorsteher')} führt das Dorf weiter – automatisch, aber nur mit <b>halber Kraft</b>.</li><li>In ein paar Tagen kannst du erneut antreten.</li></ul>`;
    const msg = p('', 'small error');
    const antworten = async (j) => {
      const { data: r, error: e } = await db.rpc('amt_antwort', { p_ja: j });
      if (e || !r?.ok) { msg.textContent = e?.message || r?.grund || 'Das hat nicht geklappt.'; return; }
      box.innerHTML = `<div class="amt-siegel ${j ? 'gold' : ''}"></div><span class="amt-label">${j ? 'Amtseid' : 'Entscheidung'}</span><h2>${j ? 'Dorfmeister von ' + esc(village?.village_name || 'deinem Dorf') : 'Du bleibst Bewohner'}</h2>`;
      box.append(p(r.text, ''), row(btn('Weiter', true, async () => { close(); await loadAmt(false); loadVillageState(); if (!$('panel').hidden && ['quests', 'dorf'].includes(active)) renderPanel(active); })));
    };
    ja.append(row(btn('Den Eid leisten', true, () => antworten(true)))); nein.append(row(btn('Ablehnen', false, () => antworten(false))));
    wahl.append(ja, nein); box.append(wahl, msg);
  } else {
    box.append(p(`Die Versammlung stimmte ${w.nein} zu ${w.ja}. Knapp oder nicht – ${w.gegner || 'der Vorsteher'} führt das Dorf weiter. Sammle weiter Ansehen; in vier Tagen kannst du erneut antreten.`, ''));
    box.append(row(btn('Verstanden', true, async () => { await db.rpc('amt_gesehen', { p_wahl: w.id }); close(); loadAmt(false); })));
  }
}
function showEntscheidung(e) {
  if (!imDorf()) return;
  const { box, close } = amtOverlay();
  box.classList.add('aushang-rolle');
  box.innerHTML = `<span class="amt-label">${esc(ART_NAME[e.art] || 'Aushang')}</span><h2>${esc(e.titel)}</h2>`;
  box.append(p(e.text, ''));
  const opts = document.createElement('div'); opts.className = 'ent-opts';
  e.optionen.forEach((t, i) => opts.append(btn(t, false, async () => {
    opts.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const { data: r, error: er } = await db.rpc('amt_entscheiden', { p_ereignis: e.id, p_wahl: i });
    if (er || !r?.ok) { opts.append(p(er?.message || r?.grund || 'Das hat nicht geklappt.', 'small error')); return; }
    opts.remove(); spaeter.remove(); box.append(p('„' + t + '“', 'small muted'), p(r.text, 'ent-ergebnis'));
    box.append(row(btn('Schließen', true, async () => { close(); await loadAmt(false); loadVillageState(); if (!$('panel').hidden && ['quests', 'dorf'].includes(active)) renderPanel(active); })));
  })));
  const spaeter = row(btn('Später entscheiden', false, close));
  box.append(opts, spaeter);
}
function renderAdventures(body) {
  body.append(h3('Abenteuer'));
  const wrap = document.createElement('div'); wrap.className = 'adventures'; wrap.append(p('…', 'muted small')); body.append(wrap);
  db.rpc('quest_list').then(({ data, error }) => {
    wrap.innerHTML = '';
    if (error) { wrap.append(p('Konnte die Abenteuer nicht laden.', 'error')); return; }
    if (data.laufend) {
      const q = data.quests.find((x) => x.id === data.laufend.quest);
      wrap.append(p(`Du bist mitten in „${q?.titel || 'einem Abenteuer'}“.`, 'small'), row(btn('Weiterspielen', true, () => resumeQuest(data.laufend.run))));
      return;
    }
    for (const q of data.quests) {
      const card = document.createElement('div'); card.className = 'adv';
      card.innerHTML = `<b>${esc(q.titel)}</b>${q.erledigt ? ' <span class="muted small">· schon erlebt</span>' : ''}<br><span class="small">${esc(q.beschreibung)}</span>`;
      if (!q.offen) { card.append(p(q.hinweis ? `Du weißt noch zu wenig darüber. Vielleicht erzählen dir ${q.hinweis} mehr.` : 'Du weißt noch zu wenig darüber.', 'muted small')); wrap.append(card); continue; }
      const pick = document.createElement('div'); pick.className = 'pick';
      pick.append(p('Wer kommt mit? (höchstens zwei – passende Berufe helfen bei Proben)', 'muted small'));
      const chosen = new Set();
      for (const b of data.begleiter) {
        const l = document.createElement('label'); l.className = 'pick-row' + (b.bereit ? '' : ' off');
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.disabled = !b.bereit;
        cb.onchange = () => { if (cb.checked) { if (chosen.size >= 2) { cb.checked = false; return; } chosen.add(b.id); } else chosen.delete(b.id); };
        const t = document.createElement('span'); t.innerHTML = `${esc(b.name)} <span class="muted">· ${esc(b.beruf)} · ${esc(b.stimmung)}</span>${b.bereit ? '' : ' <span class="muted">(will nicht mit)</span>'}`;
        l.append(cb, t); pick.append(l);
      }
      const msg = p('', 'small error');
      pick.append(row(btn(q.erledigt ? 'Nochmal erleben (Testphase)' : 'Aufbrechen', true, async () => {
        const { data: r, error: e } = await db.rpc('quest_start', { p_quest: q.id, p_begleiter: [...chosen] });
        if (e) { msg.textContent = e.message; return; }
        if (!r.ok) { msg.textContent = r.grund; return; }
        launchQuest(r.view);
      })), msg);
      card.append(pick); wrap.append(card);
    }
  });
}
function renderInventory(body) {
  const wrap = document.createElement('div'); wrap.append(p('…', 'muted small')); body.append(wrap);
  db.rpc('get_inventory').then(({ data, error }) => {
    wrap.innerHTML = '';
    if (error) { wrap.append(p('Konnte das Inventar nicht laden.', 'error')); return; }
    if (JSON.stringify(heroInv) !== JSON.stringify(data)) { heroInv = data; refreshHero(); }
    const z = data.zustand;
    wrap.append(p(z?.zustand === 'verletzt' ? `Du bist verletzt (Proben −2) – heilt bis ${clock(z.bis)} Uhr.` : 'Du bist gesund.', z?.zustand === 'verletzt' ? 'error small' : 'small'));
    const SPEZ = { neuwurf: 'Glücksbringer: einmal pro Abenteuer neu würfeln', unverwuestlich: 'nutzt sich nicht ab', erster_sicher_flink: 'erster Versuch (Flink) jedes Abenteuers gelingt' };
    const gear = data.ausruestung || [];
    if (gear.length) {
      body.append(h3('Ausrüstung'));
      body.append(p('Pro Art (Waffe, Rüstung, Kleidung, Talisman, Werkzeug) zählt automatisch dein bestes passendes Stück. Ausrüstung bringt höchstens +5 auf eine Probe.', 'muted small'));
      const ul = document.createElement('ul'); ul.className = 'journal gear'; body.append(ul);
      const ARTN = { waffe: 'Waffe', ruestung: 'Rüstung', kleidung: 'Kleidung', talisman: 'Talisman' };
      for (const g of gear) {
        const eff = [bonusText(g.bonus), g.schutz_basis ? `Schutz ${g.schutz}${g.zustand < 100 ? ` (Zustand ${g.zustand} %)` : ''}` : '', ...(g.spezial || []).map((x) => SPEZ[x] || x)].filter(Boolean).join(' · ');
        const li = document.createElement('li'); li.className = 'loot r-' + g.seltenheit;
        li.innerHTML = `<span class="loot-r">${esc(g.stufe)} · ${esc(ARTN[g.art] || g.art)}</span><br><b>${esc(g.name)}</b>${eff ? `<br><span class="small item-eff">${esc(eff)}</span>` : ''}<br><span class="small muted">${esc(g.beschreibung)}${(g.eigenschaften || []).map((e) => ' ' + esc(e.text)).join('')}${g.herkunft ? ` – gefunden: ${esc(g.herkunft)}` : ''}</span>`;
        const drop = document.createElement('button'); drop.type = 'button'; drop.className = 'link-btn small gear-drop'; drop.textContent = 'Ablegen';
        drop.onclick = async () => {
          if (drop.dataset.sure !== '1') { drop.dataset.sure = '1'; drop.textContent = g.legendaer ? 'Wirklich? Es kehrt in die Welt zurück' : 'Wirklich ablegen?'; setTimeout(() => { drop.dataset.sure = ''; drop.textContent = 'Ablegen'; }, 4000); return; }
          const { data: r } = await db.rpc('gear_discard', { p_id: g.id }); if (r?.ok) li.remove();
        };
        li.append(drop); ul.append(li);
      }
    }
    const ART = { waffe: 'Waffen', ruestung: 'Rüstung', werkzeug: 'Werkzeug', kleidung: 'Kleidung', fund: 'Funde' };
    for (const [art, name] of Object.entries(ART)) {
      const list = data.items.filter((i) => i.art === art); if (!list.length) continue;
      body.append(h3(gear.length ? name + ' (Grundausstattung)' : name)); const ul = document.createElement('ul'); ul.className = 'journal'; body.append(ul);
      for (const i of list) {
        const eff = [bonusText(i.bonus), i.schutz ? `Schutz ${i.schutz}` : ''].filter(Boolean).join(' · ');
        const li = document.createElement('li'); li.innerHTML = `<b>${esc(i.name)}</b>${i.menge > 1 ? ` ×${i.menge}` : ''}${eff ? ` <span class="small item-eff">${esc(eff)}</span>` : ''}<br><span class="small muted">${esc(i.beschreibung)}</span>`; ul.append(li);
      }
    }
    if (data.chronik.length) {
      body.append(h3('Chronik')); const ul = document.createElement('ul'); ul.className = 'journal'; body.append(ul);
      for (const c of data.chronik) { const li = document.createElement('li'); li.className = 'small'; li.textContent = c.text; ul.append(li); }
    }
    body.append(p('Rüstung fängt Verletzungen ab. Waffen und Werkzeug erleichtern passende Proben und öffnen eigene Wahlmöglichkeiten in Abenteuern.', 'muted small'));
  });
}

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
        if (h.kind === 'villager') { const p = h.person; if (p.namenlos) return showTip(`<b>${esc(p.job)}</b><br><span class="small">${p.zustand === 'krank' ? 'liegt krank' : p.zustand === 'verletzt' ? 'ist verletzt' : 'wohnt im Dorf'}</span><div class="tt-actions">${esc(p.activity || '')}</div>`, { x: h.x, y: h.y }); return showTip(p.wanderer ? `<b>${esc(p.name)}</b><br>Wanderer · ${esc(p.job)}<div class="tt-actions">${esc(p.activity)}</div>` : `<b>${esc(p.name)}</b><br>${esc(p.job)} · wirkt ${esc(p.stimmung)}<div class="tt-actions">${esc(p.activity || '')}${p.erinnerung ? '<br>Erinnert sich: ' + esc(p.erinnerung) : ''}</div>`, { x: h.x, y: h.y }); }
        if (h.kind === 'building') { const bi = buildingInfo(h.sprite); return showTip(`<b>${esc(bi.name)}</b> <span class="muted">· ${esc(bi.stufe)}</span><br>${bi.workers.length ? 'Hier arbeiten: ' + esc(bi.workers.join(', ')) + '<br>' : ''}<span class="small">${esc(bi.folge)}</span>${bi.bau ? '<div class="tt-actions">Wird gerade ausgebaut</div>' : ''}`, { x: h.x, y: h.y }); }
        if (h.kind === 'baustelle') return showTip(`<b>Baustelle</b><br>Hier entsteht ${esc(CATALOG[h.baustelle.gebaeude]?.name || '')}.<div class="tt-actions">${esc(villageState?.dorf?.bau?.baumeister || 'Die Bewohner')} bauen daran.</div>`, { x: h.x, y: h.y });
        else showTip(`<b>Bauplatz ${h.plot.id}</b><br>Platz bis Größe ${h.plot.size}${h.plot.shadow ? ' · im Bergschatten' : ''}<div class="tt-actions">frei</div>`, { x: h.x, y: h.y });
      },
      onReady: () => updateChip(),
      onSelectObject: (obj) => showSelCard(obj),
      onPlots: (on) => $('game').classList.toggle('placing', on),
      onSelect: () => { if (!$('panel').hidden && active === 'dorf') renderPanel('dorf'); },
      onLayout: () => {},
    });
    window.mossheart = scene; // für Tests in der Konsole
  }
  db.rpc('get_my_residents').then(({ data, error }) => { if (error) console.warn('Bewohner:', error.message); scene.setResidents(error ? null : imDorfFilter(data)); });
  db.rpc('get_my_character').then(({ data, error }) => {
    if (error) console.warn('Charakter:', error.message);
    me = data && typeof data === 'object' ? data : { name: 'Du', look: null };
    if (me.look) { refreshHero(true); if (!me.startpaket) setTimeout(() => showCreator(false, true), 800); } else showCreator(true);
  });
  loadVillageState(); clearInterval(window.__villageTimer); window.__villageTimer = setInterval(() => { loadVillageState(); loadAmt(); beschCheck(); }, 120000); beschCheck();
  setTimeout(async () => { await checkAmtPopups(); if (amt?.offen?.length && !document.querySelector('.amt-overlay')) toast(`<b>Am Brett:</b> ${amt.offen.length === 1 ? 'Ein Aushang wartet' : amt.offen.length + ' Aushänge warten'} auf deine Entscheidung als Dorfmeister.`, 9000); }, 3000);
  const { data } = await db.rpc('get_my_village');
  village = Array.isArray(data) ? data[0] : data;
  $('who').textContent = village ? `Angemeldet als ${village.character_name}` : '';
  if (village) scene.setLand(landFor(village));
  // Vorschau im Zahnrad-Menü: andere Gegenden und Haltungen nur ansehen (wird nicht gespeichert)
  { const own = village ? landFor(village) : 'hochtal', ls = $('land-preview'), ps = $('pose-preview');
    if (ls && !ls.options.length) {
      ls.innerHTML = LAND_IDS.map((id) => `<option value="${id}">${esc(LAND_NAMES[id])}${id === own ? ' (dein Dorf)' : ''}</option>`).join('');
      ls.onchange = () => scene.setLand(ls.value, false);
      ps.innerHTML = `<option value="">Wechselt täglich</option>` + POSES.map((p) => `<option value="${p}">${esc(POSE_NAMES[p])}</option>`).join('');
      ps.onchange = () => scene.setPose(ps.value || null);
    }
    if (ls) ls.value = own; }
}
function stopGame() { $('game').hidden = true; $('auth-screen').hidden = false; $('password').value = ''; setPwVisible($('pw-toggle'), false); $('gear-menu').hidden = true; }
db.auth.onAuthStateChange((ev, session) => {
  if (ev === 'PASSWORD_RECOVERY') recovering = true;
  if (recovering) { if (session) showRecover(); return; }
  if (session) { if ($('game').hidden) startGame(); } else stopGame();
});
setMode('login');
