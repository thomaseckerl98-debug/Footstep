// Charaktererstellung: Auswahl von Volk, Gesicht, Haut, Haaren, Bart, Augen und Umhang mit Live-Vorschau.
import { setMood } from './core.js?v=1';
import { RACES, FACES, SKINS, HAIRS, HAIR_STYLES, BEARDS, EYES, CLOAKS, DEFAULT_LOOK, randomLook, planFromLook, portraitSprite, sheetData, heroSprite, SW, SH, PW, PH, HERO_W } from './chars.js?v=2';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let raf = 0;

export function openCreator({ root, name, look, first, onSave, onCancel, restoreMood }) {
  let L = { ...DEFAULT_LOOK, ...(look || {}) };
  root.hidden = false;
  root.innerHTML = `
    <div class="cr-wrap">
      <header class="cr-head"><h1>${first ? 'Erschaffe deinen Charakter' : 'Aussehen ändern'}</h1><p class="muted">${esc(name)}${first ? ' – so wirst du im Dorf gesehen. Du kannst es später noch ändern.' : ''}</p></header>
      <div class="cr-body">
        <section class="cr-preview px-frame">
          <div class="cr-row"><canvas id="cr-portrait" width="${PW}" height="${PH}"></canvas><canvas id="cr-small" width="${SW}" height="${SH}"></canvas></div>
          <canvas id="cr-hero" width="170" height="120"></canvas>
          <p id="cr-race" class="small"></p>
        </section>
        <section class="cr-options px-frame" id="cr-options"></section>
      </div>
      <footer class="cr-foot">
        <button type="button" class="px-btn" id="cr-random">Zufall</button>
        ${first ? '' : '<button type="button" class="px-btn" id="cr-cancel">Abbrechen</button>'}
        <button type="button" class="px-btn primary" id="cr-save">${first ? 'Charakter erschaffen' : 'Speichern'}</button>
        <p class="msg" id="cr-msg"></p>
      </footer>
    </div>`;
  const opts = root.querySelector('#cr-options');
  const group = (title, key, entries, swatch) => {
    const g = document.createElement('div'); g.className = 'cr-group';
    const h = document.createElement('h3'); h.textContent = title; g.append(h);
    const row = document.createElement('div'); row.className = 'row';
    for (const [val, label, col] of entries) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'px-btn' + (swatch ? ' swatch' : '');
      b.dataset.key = key; b.dataset.val = String(val); b.title = label;
      if (swatch) b.style.background = col; else b.textContent = label;
      b.onclick = () => { L[key] = key === 'skin' ? Number(val) : val; if (key === 'race' && val === 'elf' && !['keiner', 'stoppel'].includes(L.beard)) L.beard = 'keiner'; refresh(); };
      row.append(b);
    }
    g.append(row); opts.append(g);
  };
  group('Volk', 'race', Object.entries(RACES).map(([k, r]) => [k, r.name]));
  group('Gesicht', 'face', Object.entries(FACES).map(([k, n]) => [k, n]));
  group('Hautfarbe', 'skin', SKINS.map((c, i) => [i, `Ton ${i + 1}`, c]), true);
  group('Haarfarbe', 'hair', Object.entries(HAIRS).map(([k, c]) => [k, k, c]), true);
  group('Frisur', 'hairStyle', Object.entries(HAIR_STYLES).map(([k, n]) => [k, n]));
  group('Bart', 'beard', Object.entries(BEARDS).map(([k, n]) => [k, n]));
  group('Augen', 'eyes', Object.entries(EYES).map(([k, c]) => [k, k, c]), true);
  group('Umhang', 'cloak', Object.entries(CLOAKS).map(([k, c]) => [k, k, c]), true);

  const pc = root.querySelector('#cr-portrait'), sc = root.querySelector('#cr-small'), hc = root.querySelector('#cr-hero');
  let sheet = null;
  function refresh() {
    setMood('mittag', 'sommer');
    const plan = planFromLook(L, name);
    pc.getContext('2d').putImageData(new ImageData(portraitSprite(plan).data, PW, PH), 0, 0);
    const sh = sheetData(plan); sheet = document.createElement('canvas'); sheet.width = sh.w; sheet.height = sh.h; sheet.getContext('2d').putImageData(new ImageData(sh.data, sh.w, sh.h), 0, 0);
    const hero = heroSprite(plan, 0), tmp = document.createElement('canvas'); tmp.width = HERO_W; tmp.height = 270; tmp.getContext('2d').putImageData(new ImageData(hero.data, HERO_W, 270), 0, 0);
    const hx = hc.getContext('2d'); hx.clearRect(0, 0, 170, 120); hx.drawImage(tmp, 0, 150, 170, 120, 0, 0, 170, 120);
    restoreMood?.();
    root.querySelectorAll('.cr-options .px-btn').forEach((b) => b.classList.toggle('on', String(L[b.dataset.key]) === b.dataset.val));
    root.querySelector('#cr-race').innerHTML = `<b>${esc(RACES[L.race].name)}</b>: ${esc(RACES[L.race].desc)}<br><span class="muted">Neigung (verdeckt): ${esc(RACES[L.race].neigung)}</span>`;
  }
  const dirs = [0, 2, 1, 3];
  const loop = (t) => { raf = requestAnimationFrame(loop); if (!sheet) return; const c = sc.getContext('2d'); c.clearRect(0, 0, SW, SH); const d = dirs[Math.floor(t / 2400) % 4], f = Math.floor(t / 220) % 4; c.drawImage(sheet, f * SW, d * SH, SW, SH, 0, 0, SW, SH); };
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  refresh();
  root.querySelector('#cr-random').onclick = () => { L = randomLook(); refresh(); };
  const close = () => { cancelAnimationFrame(raf); root.hidden = true; root.innerHTML = ''; };
  if (!first) root.querySelector('#cr-cancel').onclick = () => { close(); onCancel?.(); };
  root.querySelector('#cr-save').onclick = async () => {
    const btn = root.querySelector('#cr-save'), msg = root.querySelector('#cr-msg'); btn.disabled = true; msg.textContent = 'Speichere …'; msg.className = 'msg';
    try { await onSave({ ...L }); close(); } catch (e) { msg.textContent = 'Fehler: ' + (e.message || e); msg.className = 'msg error'; btn.disabled = false; }
  };
}
