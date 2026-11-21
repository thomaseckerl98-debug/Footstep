// Mossheart Baukatalog: alle Gebäudetypen mit Wirkungen + Pixel-Bausätze für die neuen Typen.
// Wirkungen sind Spieldaten (noch ohne laufende Wirtschaft). Werte gelten für Stufe 1; jede weitere Stufe
// erhöht Wohnraum/Arbeitsplätze/Produktion um ca. 25 % und Nachbarschaftseffekte um ca. 10 % (siehe STUFEN).
import { boxBuilding, thatch, timberFront, timberSide, BUILDINGS, EXTRA_DRAW, KIT_COLORS } from './world.js?v=4';
import { hex, lit, N3, N4 } from './core.js?v=1';

/* ======================================================================
   Katalog
   ====================================================================== */
export const KATEGORIEN = { wohnen: 'Wohnen', nahrung: 'Nahrung', handwerk: 'Handwerk', gemeinschaft: 'Gemeinschaft', schutz: 'Schutz', lager: 'Lager & Verwaltung' };
export const STUFEN = 'Jede Ausbaustufe (bis 10) erhöht Wohnraum, Arbeitsplätze und Produktion um etwa ein Viertel, Stimmung/Ruf/Schutz um etwa ein Zehntel. Ab Stufe 4 und 8 ändert sich das Aussehen (größer, Stein statt Holz).';
// Nachbarschaft wirkt auf Wohnhäuser im Umkreis (ca. 80 Weltpixel): laerm/geruch/rauch senken die Stimmung der Bewohner, schoenheit hebt sie.
export const CATALOG = {
  huette: { name: 'Hütte', kat: 'wohnen', size: 'S', kosten: { Holz: 20 }, bauzeit: 4, wohnraum: 2, stimmung: 0, folgen: ['Billigster Wohnraum für den Anfang.', 'Bewohner in Hütten werden schneller unzufrieden, wenn das Dorf wächst.'] },
  wohnhaus: { name: 'Wohnhaus', kat: 'wohnen', size: 'S', kosten: { Holz: 40, Stein: 10 }, bauzeit: 10, wohnraum: 3, stimmung: 1, ruf: 1, folgen: ['Familien ziehen ein; neue Bewohner kommen nur, wenn Wohnraum frei ist.'] },
  langhaus: { name: 'Langhaus', kat: 'gemeinschaft', size: 'L', kosten: { Holz: 120, Stein: 30 }, bauzeit: 30, wohnraum: 8, arbeit: { Dorfälteste: 1, Schreiber: 1 }, stimmung: 3, loyalitaet: 2, ruf: 3, freischaltet: ['gasthaus', 'kaserne', 'schreibstube'], folgen: ['Sitz des Dorfmeisters – Versammlungen und Urteile finden hier statt.', 'Mittagessen in der Halle stärkt den Zusammenhalt (Bindungen unter Bewohnern wachsen schneller).'] },
  gasthaus: { name: 'Gasthaus', kat: 'gemeinschaft', size: 'M', kosten: { Holz: 80, Stein: 20 }, bauzeit: 20, benoetigt: ['langhaus'], wohnraum: 2, arbeit: { Wirt: 1, Schankmaid: 1, Barde: 1, Koch: 1 }, verbraucht: { Bier: 2, Brot: 2 }, stimmung: 4, ruf: 3, zuzug: 2, nachbarn: { laerm: 2 }, folgen: ['Wanderer kehren ein und übernachten – manche bleiben als neue Bewohner.', 'Abends treffen sich hier Bewohner: Freundschaften (und Streit) entstehen schneller.', 'Gerüchte aus anderen Dörfern landen hier zuerst.'] },
  feld: { name: 'Feld', kat: 'nahrung', size: 'M', kosten: { Holz: 10 }, bauzeit: 3, arbeit: { Bauer: 2, Bäuerin: 2 }, produziert: { Getreide: 6 }, saisonal: true, folgen: ['Ertrag hängt von der Jahreszeit ab: Frühling säen, Sommer wachsen, Herbst ernten, Winter Ruhe.'] },
  scheune: { name: 'Scheune', kat: 'nahrung', size: 'M', kosten: { Holz: 60 }, bauzeit: 12, arbeit: { Stallbursche: 1, Hirte: 1 }, lager: { Getreide: 300, Heu: 200 }, folgen: ['Ohne Scheune verdirbt ein Teil der Ernte im Winter.'] },
  muehle: { name: 'Windmühle', kat: 'nahrung', size: 'M', kosten: { Holz: 70, Stein: 30 }, bauzeit: 24, benoetigt: ['feld'], arbeit: { Müllerin: 1 }, verbraucht: { Getreide: 4 }, produziert: { Mehl: 4 }, ruf: 1, nachbarn: { schoenheit: 1 }, folgen: ['Macht aus Getreide Mehl – Grundlage für die Bäckerei.', 'Dreht sich nur bei Wind; bei Sturm steht sie still.'] },
  baeckerei: { name: 'Bäckerei', kat: 'nahrung', size: 'S', kosten: { Holz: 40, Stein: 30 }, bauzeit: 14, benoetigt: ['muehle'], arbeit: { Bäcker: 1 }, verbraucht: { Mehl: 3, Holz: 1 }, produziert: { Brot: 6 }, stimmung: 2, nachbarn: { schoenheit: 1 }, folgen: ['Frisches Brot hebt die Stimmung im ganzen Dorf.', 'Der Duft lockt morgens Bewohner auf den Dorfplatz.'] },
  brauerei: { name: 'Brauerei', kat: 'nahrung', size: 'M', kosten: { Holz: 60, Stein: 20 }, bauzeit: 18, benoetigt: ['feld'], arbeit: { Brauer: 2 }, verbraucht: { Getreide: 3 }, produziert: { Bier: 3 }, stimmung: 2, nachbarn: { geruch: 1 }, folgen: ['Bier ist Lohn und Trost – ohne Bier sinkt die Laune im Gasthaus.', 'Zu viel Bier macht faul: Fleiß der Bewohner sinkt leicht.'] },
  imkerei: { name: 'Imkerei', kat: 'nahrung', size: 'S', kosten: { Holz: 25 }, bauzeit: 8, arbeit: { Imkerin: 1 }, produziert: { Honig: 1, Wachs: 1 }, nachbarn: { schoenheit: 1 }, folgen: ['Bienen bestäuben die Felder: Feldertrag in der Nähe +10 %.', 'Wachs braucht die Kerzenzieherin.'] },
  stall: { name: 'Viehstall', kat: 'nahrung', size: 'L', kosten: { Holz: 70 }, bauzeit: 16, arbeit: { Hirte: 2, Stallbursche: 1 }, verbraucht: { Heu: 2 }, produziert: { Wolle: 2, Milch: 3, Fleisch: 1 }, nachbarn: { geruch: 2 }, folgen: ['Schafe und Ziegen grasen sichtbar auf der Weide.', 'Wölfe aus dem Wald können Vieh reißen, wenn kein Wachturm in der Nähe ist.'] },
  jagdhuette: { name: 'Jagdhütte', kat: 'nahrung', size: 'S', kosten: { Holz: 35 }, bauzeit: 10, arbeit: { Jäger: 1, Jägerin: 1 }, produziert: { Wild: 3, Felle: 1 }, schutz: 1, folgen: ['Jäger kennen den Wald: frühe Warnung vor Gefahren und Fremden.', 'Zu viel Jagd vertreibt das Wild für eine Weile.'] },
  holzfaeller: { name: 'Holzfällerhütte', kat: 'handwerk', size: 'S', kosten: { Holz: 15 }, bauzeit: 6, arbeit: { Holzfäller: 2 }, produziert: { Holz: 8 }, nachbarn: { laerm: 1 }, folgen: ['Grundlage für fast jedes Gebäude.', 'Rodet langsam den Waldrand – mehr Platz, aber weniger Wild und Kräuter.'] },
  saegewerk: { name: 'Sägewerk', kat: 'handwerk', size: 'M', kosten: { Holz: 50, Eisen: 5 }, bauzeit: 16, benoetigt: ['holzfaeller'], arbeit: { Zimmermann: 2 }, verbraucht: { Holz: 4 }, produziert: { Bretter: 4 }, nachbarn: { laerm: 2 }, folgen: ['Bretter verkürzen die Bauzeit aller Gebäude um 15 %.'] },
  steinmetz: { name: 'Steinmetzhütte', kat: 'handwerk', size: 'S', kosten: { Holz: 30 }, bauzeit: 10, arbeit: { Steinmetz: 1, Bergmann: 1 }, produziert: { Stein: 4 }, nachbarn: { laerm: 2 }, freischaltet: ['schrein'], folgen: ['Ab Stufe 4 können Häuser in Stein ausgebaut werden (sicherer gegen Feuer).'] },
  koehlerei: { name: 'Köhlerei', kat: 'handwerk', size: 'S', kosten: { Holz: 30 }, bauzeit: 8, benoetigt: ['holzfaeller'], arbeit: { Köhler: 1 }, verbraucht: { Holz: 6 }, produziert: { Kohle: 3 }, nachbarn: { rauch: 3 }, folgen: ['Ohne Kohle keine heiße Esse: die Schmiede arbeitet langsamer.', 'Der Rauch stört Nachbarn; die Kräuterfrau mag Köhler deshalb selten.'] },
  schmiede: { name: 'Schmiede', kat: 'handwerk', size: 'M', kosten: { Holz: 40, Stein: 40 }, bauzeit: 20, arbeit: { Schmied: 1, Waffenschmiedin: 1, Rüstmacher: 1 }, verbraucht: { Eisen: 2, Kohle: 2 }, produziert: { Werkzeug: 2, Waffen: 1 }, schutz: 1, nachbarn: { laerm: 3, rauch: 1 }, freischaltet: ['kaserne'], folgen: ['Werkzeug macht alle Handwerker schneller.', 'Waffen und Rüstungen bestimmen, wie gut Kämpfe in Quests ausgehen.'] },
  gerberei: { name: 'Gerberei', kat: 'handwerk', size: 'S', kosten: { Holz: 35 }, bauzeit: 10, benoetigt: ['jagdhuette'], arbeit: { Gerberin: 1 }, verbraucht: { Felle: 2 }, produziert: { Leder: 2 }, nachbarn: { geruch: 3 }, folgen: ['Leder für Rüstungen, Taschen und Schuhe.', 'Stinkt gewaltig – am besten an den Dorfrand bauen.'] },
  weberei: { name: 'Weberei', kat: 'handwerk', size: 'S', kosten: { Holz: 40 }, bauzeit: 12, benoetigt: ['stall'], arbeit: { Weberin: 1, Schneiderin: 1 }, verbraucht: { Wolle: 2 }, produziert: { Stoff: 2 }, stimmung: 1, folgen: ['Kleidung schützt im Winter: weniger Kranke.', 'Farbige Stoffe machen das Dorf ansehnlicher (Ruf +).'] },
  toepferei: { name: 'Töpferei', kat: 'handwerk', size: 'S', kosten: { Holz: 30, Stein: 10 }, bauzeit: 10, arbeit: { Töpfer: 1 }, produziert: { Keramik: 2 }, folgen: ['Krüge und Töpfe: mehr Lagerplatz für Lebensmittel in jedem Haus.'] },
  markt: { name: 'Marktplatz', kat: 'gemeinschaft', size: 'M', kosten: { Holz: 50 }, bauzeit: 12, arbeit: { Händler: 2 }, stimmung: 2, ruf: 2, zuzug: 1, folgen: ['Wandernde Händler kommen öfter vorbei.', 'Handel mit anderen Dörfern (auch mit Freunden) wird möglich.'] },
  heilerhaus: { name: 'Heilerhaus', kat: 'gemeinschaft', size: 'S', kosten: { Holz: 40, Stein: 10 }, bauzeit: 14, arbeit: { Heilerin: 1, Kräuterfrau: 1 }, verbraucht: { Kräuter: 1 }, stimmung: 2, loyalitaet: 1, nachbarn: { schoenheit: 1 }, folgen: ['Wunden heilen doppelt so schnell – auch die deines Helden.', 'Wer gepflegt wurde, vergisst das nicht (Sympathie +).'] },
  schrein: { name: 'Schrein', kat: 'gemeinschaft', size: 'S', kosten: { Stein: 30 }, bauzeit: 8, benoetigt: ['steinmetz'], arbeit: { Priesterin: 1, Mönch: 1 }, stimmung: 2, loyalitaet: 3, nachbarn: { schoenheit: 2 }, folgen: ['Stärkt Loyalität: Bewohner laufen seltener zu anderen Dörfern über.', 'Feste am Schrein lösen Streit zwischen Bewohnern.'] },
  schreibstube: { name: 'Schreibstube', kat: 'gemeinschaft', size: 'M', kosten: { Holz: 40, Stein: 40 }, bauzeit: 20, benoetigt: ['langhaus'], arbeit: { Schreiber: 1, Gelehrter: 1 }, produziert: { Wissen: 1 }, ruf: 2, freischaltet: ['alchemistenturm'], folgen: ['Wissen schaltet neue Ausbaustufen und Rezepte frei.', 'Briefe an andere Dörfer: Diplomatie über größere Entfernung.'] },
  alchemistenturm: { name: 'Alchemistenturm', kat: 'gemeinschaft', size: 'S', kosten: { Stein: 60, Holz: 20 }, bauzeit: 28, benoetigt: ['schreibstube'], arbeit: { Alchemist: 1, Seherin: 1 }, verbraucht: { Kräuter: 2 }, produziert: { Tränke: 1 }, nachbarn: { geruch: 1 }, folgen: ['Heil- und Kampftränke für Quests.', 'Seltsame Dämpfe: abergläubische Bewohner werden misstrauisch.'] },
  wachturm: { name: 'Wachturm', kat: 'schutz', size: 'S', kosten: { Holz: 45 }, bauzeit: 12, arbeit: { Wache: 1 }, schutz: 3, folgen: ['Angriffe werden früher bemerkt; Wölfe meiden das Vieh.', 'Nachts brennt oben ein Licht.'] },
  kaserne: { name: 'Kaserne', kat: 'schutz', size: 'L', kosten: { Holz: 90, Stein: 40, Eisen: 10 }, bauzeit: 36, benoetigt: ['schmiede', 'langhaus'], wohnraum: 4, arbeit: { Wache: 2, Hauptmann: 1, Söldnerin: 1 }, verbraucht: { Brot: 2, Waffen: 1 }, schutz: 6, stimmung: -1, nachbarn: { laerm: 2 }, folgen: ['Ermöglicht Feldzüge gegen andere Dörfer und den Schutz von Verbündeten.', 'Bewaffnete im Dorf beruhigen manche – und machen andere nervös.'] },
  lagerhaus: { name: 'Lagerhaus', kat: 'lager', size: 'L', kosten: { Holz: 80 }, bauzeit: 16, arbeit: { Händler: 1 }, lager: { alles: 600 }, folgen: ['Mehr Vorrat: Engpässe im Winter und bei Belagerung werden abgefedert.', 'Volle Lager ziehen Diebe und neidische Nachbarn an.'] },
};
for (const [id, c] of Object.entries(CATALOG)) BUILDINGS[id] = Object.assign(BUILDINGS[id] || {}, { name: c.name, size: c.size, desc: c.folgen[0] });
export function jobsAt(type) { return Object.keys(CATALOG[type]?.arbeit || {}); }
export function summary(id) {
  const c = CATALOG[id], parts = [];
  if (c.wohnraum) parts.push(`Wohnraum ${c.wohnraum}`);
  if (c.arbeit) parts.push('Arbeit: ' + Object.entries(c.arbeit).map(([j, n]) => `${n}× ${j}`).join(', '));
  if (c.produziert) parts.push('erzeugt ' + Object.entries(c.produziert).map(([r, n]) => `${n} ${r}/h`).join(', '));
  if (c.verbraucht) parts.push('braucht ' + Object.entries(c.verbraucht).map(([r, n]) => `${n} ${r}/h`).join(', '));
  const fx = []; for (const [k, n] of [['stimmung', 'Stimmung'], ['loyalitaet', 'Loyalität'], ['ruf', 'Ruf'], ['schutz', 'Schutz'], ['zuzug', 'Zuzug']]) if (c[k]) fx.push(`${n} ${c[k] > 0 ? '+' : ''}${c[k]}`);
  if (fx.length) parts.push(fx.join(' · '));
  if (c.nachbarn) parts.push('Nachbarn: ' + Object.entries(c.nachbarn).map(([k, n]) => `${{ laerm: 'Lärm', geruch: 'Gestank', rauch: 'Rauch', schoenheit: 'Schönheit' }[k]} ${n}`).join(', '));
  return parts;
}

/* ======================================================================
   Zeichen-Werkzeuge
   ====================================================================== */
KIT_COLORS.push('#d8d0bc', '#ccc4b0', '#2e3440', '#4f5866', '#434b58', '#7a5634', '#c43a2a', '#ece6d6', '#2a5a8a', '#e0b030', '#3a6a3a', '#7aa04a', '#b07ad0', '#7ad0a0', '#a0522d', '#c8b89a', '#b07a4a', '#e8e4dc', '#6b8a3a', '#d8c060', '#a8442e', '#3a7aa8', '#e0d8c0', '#8a6a4a');
const MAT = {
  shingle: (xx, yy) => (Math.floor(yy) % 3 === 0 ? '#4a3424' : N4.noise(Math.floor(xx / 3), Math.floor(yy / 3)) > 0.5 ? '#7a5a3a' : '#6b4b2e'),
  slate: (xx, yy) => (Math.floor(yy) % 3 === 0 ? '#2e3440' : N4.noise(xx * 0.5, yy) > 0.5 ? '#4f5866' : '#434b58'),
  logs: (i, k) => (k % 3 === 0 ? '#3a2618' : N4.noise(i * 0.2, Math.floor(k / 3)) > 0.5 ? '#7a5634' : '#6b4a2e'),
  stone: (i, k) => { const row = Math.floor(k / 3), b = Math.floor((i + (row % 2) * 3) / 6); return (k % 3 === 0 || (i + (row % 2) * 3) % 6 === 0) ? '#4f535c' : (N4.noise(b, row) > 0.5 ? '#868a92' : '#767a84'); },
  plasterF: (i, k, W2, wallH) => (Math.abs(i) > W2 - 2 || k < 2 || k > wallH - 3 ? '#4a3424' : '#d8d0bc'),
  plasterS: (i, k, wallH) => (i % 12 < 2 || k < 2 || k > wallH - 3 ? '#4a3424' : '#ccc4b0'),
  plank: (a, b, c) => (i) => (Math.floor(i) % 4 === 0 ? c : N4.noise(Math.floor(i / 4) + 40, 3) > 0.5 ? a : b),
};
const gableOf = (wall) => (i, k) => wall(i + 40, k + 20, 99, 99);
function house(L, x, y, o, c) {
  const s = o.s * (c.scale || 1);
  const g = boxBuilding(L, x, y, { s, shadow: o.shadow, moss: o.moss, front: c.front, wallH: c.wallH, roofH: c.roofH, depth: c.depth, base: c.base, ridge: c.ridge, wallFront: c.wallF, wallSide: c.wallS, roof: c.roof || thatch, gable: c.gable });
  g.s = s; g.x = x; g.y = y;
  if (c.door !== false) { const dw = Math.round((c.doorW || 4) * s), dh = Math.round((c.doorH || 11) * s); for (let k = 0; k < dh; k++) for (let i = -dw; i < dw; i++) g.P(x + i + Math.round((c.doorX || 0) * s), y - 3 - k, g.LT(c.doorCol || '#5a3a22', g.FRONT)); }
  for (const [dx, dy] of c.winF || []) o.win(g, x + Math.round(dx * s), y - Math.round(dy * s), Math.round(4 * s), Math.round(4 * s));
  for (const row of c.winS || []) for (let j = 0; j < row.n; j++) { const off = Math.round((10 + j * (row.gap || 14)) * s); o.win(g, x + g.W2 + off, y - Math.round(row.y * s) - Math.round(off * g.dd), Math.round(4 * s), Math.round(4 * s)); }
  for (const off of c.chim || []) o.chimney(g, x + g.W2 + Math.round(off * s), g.peakY + Math.round(10 * s) - Math.round(off * s * g.dd), Math.round(9 * s), c.chimCol);
  return g;
}
const side = (g, off, h) => [g.x + g.W2 + Math.round(off * g.s), g.y - 3 - Math.round(h * g.s) - Math.round(off * g.s * g.dd)];
function dome(g, cx, cy, rx, ry, colFn) {
  for (let yy = -ry; yy <= 0; yy++) for (let xx = -rx; xx <= rx; xx++) { const dx = xx / rx, dy = yy / ry, d = dx * dx + dy * dy; if (d > 1) continue; g.P(cx + xx, cy + yy, lit(hex(colFn(xx, yy)), dx * 0.9, dy * 0.8 - 0.2, Math.sqrt(Math.max(0, 1 - d)) * 0.8 + 0.2, 3, g.ls)); }
}
function box(g, x0, yb, w, h, col, top) { for (let k = 0; k < h; k++) for (let i = 0; i < w; i++) g.P(x0 + i, yb - k, g.LT(k === h - 1 && top ? top : col, i > w * 0.6 ? g.SIDE : g.FRONT)); }
function pole(g, x0, yb, h, col = '#5a3e28') { for (let k = 0; k < h; k++) g.P(x0, yb - k, g.LT(col, g.FRONT)); }
function tower(L, x, y, o, c) {
  const s = o.s, ls = 1 - o.shadow * 0.72, P = (xx, yy, col) => L.set(xx, yy, col);
  const h = Math.round(c.h * s), r0 = c.r * s, r1 = (c.rTop || c.r) * s, roofH = Math.round(c.roofH * s);
  for (let yy = -3; yy <= 4; yy++) for (let xx = -r0 - 6; xx <= r0 + 6; xx++) if ((xx / (r0 + 6)) ** 2 + (yy / 4) ** 2 < 1) P(x + xx, y + yy, lit(hex(N3.noise(xx, yy) > 0.5 ? '#7d6a50' : '#6f5e46'), 0, -1, 0.5, 2, ls));
  for (let k = 0; k < h; k++) { const r = r0 + (r1 - r0) * (k / h); for (let i = -Math.floor(r); i <= Math.floor(r); i++) { const nx = i / r, bulge = Math.sqrt(Math.max(0, 1 - nx * nx)) * r * 0.25; P(x + i, y - k + Math.round(bulge) - Math.round(r * 0.25), lit(hex(c.wall(i, k)), nx * 0.95, 0, Math.sqrt(Math.max(0, 1 - nx * nx)) * 0.9 + 0.1, 3, ls)); } }
  const top = y - h - roofH, base = y - h;
  for (let yy = top; yy <= base + 2; yy++) { const half = (r1 + 4 * s) * Math.min(1, (yy - top) / roofH); for (let i = -Math.floor(half); i <= Math.floor(half); i++) { const nx = half ? i / half : 0; P(x + i, yy, lit(hex(c.roof(x + i, yy)), nx * 0.9, -0.5, 0.5, 3, ls)); } }
  return { s, ls, P, top, base, r1, h, LT: (hx, n) => lit(hex(hx), n[0], n[1], n[2], 2, ls) };
}

/* ======================================================================
   Bausätze der neuen Gebäude
   ====================================================================== */
EXTRA_DRAW.huette = (L, x, y, o) => {
  const g = house(L, x, y, o, { scale: 0.85, front: 15, wallH: 11, roofH: 24, depth: 18, wallF: MAT.logs, wallS: MAT.logs, gable: (i, k) => MAT.logs(i, k), doorW: 3, doorH: 9, winS: [{ y: 7, n: 1 }] });
  o.info.chimneys.push([x + Math.round(g.W2 * 0.3), g.peakY + 2]);
};
EXTRA_DRAW.gasthaus = (L, x, y, o) => {
  const g = house(L, x, y, o, { front: 24, wallH: 30, roofH: 28, depth: 40, wallF: timberFront, wallS: timberSide, roof: MAT.shingle, gable: (i) => (Math.abs(i) < 1 ? '#4a3424' : '#8d775c'), winF: [[-15, 24], [11, 24], [11, 13]], winS: [{ y: 13, n: 2, gap: 16 }, { y: 24, n: 2, gap: 16 }], chim: [8, 34] });
  const s = g.s, ax = x - g.W2, ay = y - Math.round(24 * s);
  for (let i = 0; i < 9 * s; i++) g.P(ax - i, ay, g.LT('#3a2618', [0, -1, 0.5]));
  for (let k = 1; k < 3; k++) g.P(ax - 7 * s, ay + k, g.LT('#2a2018', g.FRONT));
  box(g, Math.round(ax - 10 * s), Math.round(ay + 9 * s), Math.round(7 * s), Math.round(6 * s), '#7a5634');
  for (let k = 0; k < 3; k++) for (let i = 0; i < 2; i++) g.P(ax - 7 * s + i, ay + 7 * s - k, g.LT('#e0b030', g.FRONT));
  o.info.windows.push([x - 6 * s, y - 10 * s], [x + 6 * s, y - 10 * s]);
  for (const dx of [-6, 6]) { g.P(x + dx * s, y - 11 * s, o.night ? hex('#ffcf74') : g.LT('#3a2618', g.FRONT)); g.P(x + dx * s, y - 10 * s, o.night ? hex('#ffcf74') : g.LT('#e0b030', g.FRONT)); }
};
EXTRA_DRAW.muehle = (L, x, y, o) => {
  const t = tower(L, x, y, o, { r: 13, rTop: 8, h: 44, roofH: 14, wall: (i, k) => (k % 6 === 0 ? '#8a7258' : N4.noise(i * 0.4, Math.floor(k / 6)) > 0.5 ? '#c8b89a' : '#b8a888'), roof: (xx, yy) => thatch(xx, yy) });
  const s = t.s;
  for (let k = 0; k < 10 * s; k++) for (let i = -3 * s; i < 3 * s; i++) t.P(x + i, y - 3 - k, t.LT('#4a3220', [0, 0, 1]));
  for (const [dx, dy] of [[0, 26], [-5, 16]]) for (let k = 0; k < 4 * s; k++) for (let i = 0; i < 3 * s; i++) t.P(x + dx * s + i, y - dy * s - k, o.night ? hex('#ffcf74') : t.LT('#2a2a36', [0, 0, 1]));
  o.info.windows.push([x, y - 28 * s]);
  const hx = x + 2 * s, hy = t.base - 2 * s;
  for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= 5) t.P(hx + xx, hy + yy, t.LT('#4a3424', [0.3, -0.3, 0.9]));
  o.info.sails = [hx, hy, Math.round(30 * s)];
};
EXTRA_DRAW.baeckerei = (L, x, y, o) => {
  const g = house(L, x, y, o, { front: 19, wallH: 16, roofH: 24, depth: 26, wallF: MAT.plasterF, wallS: MAT.plasterS, gable: (i) => (Math.abs(i) < 1 ? '#4a3424' : '#c8bca4'), winF: [[9, 12]], winS: [{ y: 12, n: 1 }], chim: [18], doorCol: '#6a4a2e' });
  const s = g.s, ox = x - g.W2 - 9 * s;
  dome(g, ox, y - 1, Math.round(9 * s), Math.round(8 * s), (xx, yy) => ((xx + 20 + (Math.floor(yy / 2) % 2) * 2) % 4 === 0 || yy % 2 === 0 ? '#7a3a22' : '#a0522d'));
  for (let k = 0; k < 3 * s; k++) for (let i = -2 * s; i <= 2 * s; i++) g.P(ox + i, y - 1 - k, hex(o.night ? '#ff9a42' : '#d9703a'));
  o.info.windows.push([ox, y - 3]);
  box(g, Math.round(x + 4 * s), Math.round(y - 20 * s), Math.round(8 * s), Math.round(4 * s), '#7a5634');
  for (let i = 1; i < 7 * s; i++) g.P(x + 4 * s + i, y - 21 * s - 1, g.LT('#d8a050', g.FRONT));
};
EXTRA_DRAW.brauerei = (L, x, y, o) => {
  const wall = (i, k, W2, wallH) => (k < 7 ? MAT.stone(i, k) : timberFront(i, k, W2, wallH));
  const g = house(L, x, y, o, { front: 21, wallH: 18, roofH: 24, depth: 30, wallF: wall, wallS: (i, k, wallH) => (k < 7 ? MAT.stone(i, k) : timberSide(i, k, wallH)), roof: MAT.shingle, gable: (i) => (Math.abs(i) < 1 ? '#4a3424' : '#8d775c'), winF: [[10, 14]], winS: [{ y: 14, n: 2 }], chim: [10, 24] });
  const s = g.s, bx = x - g.W2 - 14 * s;
  const barrel = (cx, yb) => { for (let k = 0; k < 6 * s; k++) for (let i = -2.5 * s; i <= 2.5 * s; i++) g.P(cx + i, yb - k, g.LT(k % Math.round(3 * s) === 0 ? '#4a4a4a' : '#8a5a32', i > 0 ? g.SIDE : g.FRONT)); };
  barrel(bx, y); barrel(bx + 6 * s, y); barrel(bx + 3 * s, y - 6 * s);
};
EXTRA_DRAW.imkerei = (L, x, y, o) => {
  const g = house(L, x, y, o, { scale: 0.75, front: 15, wallH: 12, roofH: 20, depth: 16, wallF: timberFront, wallS: timberSide, doorW: 3, doorH: 9 });
  const s = o.s;
  for (let j = 0; j < 3; j++) { const cx = x - g.W2 - (6 + j * 8) * s, cy = y + (j % 2) * 2; dome(g, cx, cy, Math.round(3.5 * s), Math.round(5 * s), (xx, yy) => (yy % 2 === 0 ? '#a88850' : '#d8c060')); g.P(cx, cy - 1, g.LT('#2a1810', g.FRONT)); }
};
EXTRA_DRAW.stall = (L, x, y, o) => {
  const pl = MAT.plank('#8a6a4a', '#7a5a3a', '#4a3220');
  const g = house(L, x, y, o, { front: 18, wallH: 12, roofH: 18, depth: 44, wallF: (i, k) => pl(i + 30, k), wallS: pl, roof: MAT.shingle, gable: (i, k) => pl(i + 30, k), doorW: 6, doorH: 10, doorCol: '#3a2618', winS: [{ y: 8, n: 3 }] });
  const s = g.s, fx0 = x - g.W2 - 34 * s, fx1 = x - g.W2 - 3 * s;
  for (let xx = fx0; xx <= fx1; xx++) { g.P(xx, y - 3, g.LT('#6b4a2e', [0, -0.5, 0.8])); g.P(xx, y - 6, g.LT('#6b4a2e', [0, -0.5, 0.8])); if (Math.round(xx - fx0) % Math.round(6 * s) === 0) pole(g, xx, y, 8, '#4a3220'); }
  for (let k = 0; k < 10 * s; k++) { g.P(fx0, y - k * 0.6 - 2 - k, g.LT('#6b4a2e', [0, -0.5, 0.8])); }
  for (const [dx, dy] of [[-10, -6], [-20, -9], [-27, -4]]) { const cx = x - g.W2 + dx * s, cy = y + dy * s * 0.3 - 6 * s; for (let yy = -2; yy <= 2; yy++) for (let xx = -3; xx <= 3; xx++) if ((xx / 3.4) ** 2 + (yy / 2.4) ** 2 < 1) g.P(cx + xx, cy + yy, lit(hex('#ece6d6'), xx / 4, yy / 3 - 0.3, 0.7, 2, g.ls)); g.P(cx + 3, cy - 1, g.LT('#3a3030', g.FRONT)); g.P(cx + 4, cy - 1, g.LT('#3a3030', g.FRONT)); g.P(cx - 2, cy + 3, g.LT('#3a3030', g.FRONT)); g.P(cx + 2, cy + 3, g.LT('#3a3030', g.FRONT)); }
};
EXTRA_DRAW.jagdhuette = (L, x, y, o) => {
  const g = house(L, x, y, o, { scale: 0.9, front: 17, wallH: 13, roofH: 22, depth: 22, wallF: MAT.logs, wallS: MAT.logs, roof: MAT.shingle, gable: (i, k) => MAT.logs(i, k), winS: [{ y: 9, n: 1 }] });
  const s = g.s, ay = y - 3 - Math.round(12 * s);
  for (let k = 0; k < 5; k++) { g.P(x - 2 - k, ay - k, g.LT('#e0d8c0', [0, -1, 0.5])); g.P(x + 2 + k, ay - k, g.LT('#e0d8c0', [0, -1, 0.5])); if (k === 2) { g.P(x - 5, ay - 4, g.LT('#e0d8c0', g.FRONT)); g.P(x + 5, ay - 4, g.LT('#e0d8c0', g.FRONT)); } }
  const fx = x + g.W2 + 26 * s;
  pole(g, Math.round(fx), y + 2, Math.round(14 * s)); pole(g, Math.round(fx + 10 * s), y, Math.round(14 * s));
  for (let k = 2; k < 12 * s; k++) for (let i = 1; i < 10 * s; i++) if (N3.noise(i * 0.3, k * 0.3) > 0.25) g.P(fx + i, y - k - i * 0.2, g.LT('#b07a4a', g.FRONT));
};
EXTRA_DRAW.holzfaeller = (L, x, y, o) => {
  const g = house(L, x, y, o, { scale: 0.85, front: 15, wallH: 12, roofH: 20, depth: 20, wallF: MAT.logs, wallS: MAT.logs, roof: MAT.shingle, gable: (i, k) => MAT.logs(i, k), winS: [{ y: 8, n: 1 }] });
  const s = o.s, px = x - g.W2 - 16 * s;
  for (let row = 0; row < 3; row++) for (let j = 0; j < 4 - row; j++) { const cx = px + (j * 5 + row * 2.5) * s, cy = y - 2 - row * 4 * s; for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= 5) g.P(cx + xx, cy + yy, g.LT(xx * xx + yy * yy <= 1 ? '#a8804a' : '#d8b878', g.FRONT)); }
  box(g, Math.round(x + g.W2 + 22 * s), y + 2, Math.round(5 * s), Math.round(4 * s), '#7a5634', '#c9a26a');
};
EXTRA_DRAW.saegewerk = (L, x, y, o) => {
  const post = (i, k, W2) => (Math.abs(i) > W2 - 2 || Math.abs(i) < 1 || k > 13 ? '#7a5634' : '#241a12');
  const g = house(L, x, y, o, { front: 22, wallH: 16, roofH: 18, depth: 34, wallF: post, wallS: (i, k) => (i % 12 < 2 || k > 13 ? '#7a5634' : '#2a2016'), roof: MAT.shingle, gable: () => '#6b4b2e', door: false });
  const s = g.s;
  for (let i = -12 * s; i <= 12 * s; i++) for (let k = 0; k < 3; k++) g.P(x + i, y - 5 - k, g.LT(k === 1 ? '#c9a26a' : '#8a6a3a', [0, -0.3, 0.9]));
  const bx = x - g.W2 - 14 * s; for (let k = 0; k < 7; k++) for (let i = 0; i < 12 * s; i++) g.P(bx + i, y - k, g.LT(k % 2 ? '#d8b878' : '#b8945a', [0, -0.4, 0.9]));
};
EXTRA_DRAW.steinmetz = (L, x, y, o) => {
  const g = house(L, x, y, o, { scale: 0.9, front: 16, wallH: 13, roofH: 18, depth: 22, base: '#5f6470', wallF: (i, k) => MAT.stone(i + 40, k), wallS: MAT.stone, roof: MAT.slate, gable: gableOf(MAT.stone), ridge: '#2e333c', winS: [{ y: 9, n: 1 }] });
  const s = o.s, bx = x - g.W2 - 18 * s;
  for (const [dx, dy, w, h] of [[0, 0, 6, 5], [7, 0, 6, 5], [3, 5, 6, 4], [14, 0, 4, 7]]) box(g, Math.round(bx + dx * s), Math.round(y - dy * s), Math.round(w * s), Math.round(h * s), '#8a8e96', '#a8acb4');
};
EXTRA_DRAW.koehlerei = (L, x, y, o) => {
  const s = o.s, g = house(L, x + 24 * s, y - 4 * s, o, { scale: 0.55, front: 14, wallH: 10, roofH: 14, depth: 14, wallF: MAT.logs, wallS: MAT.logs, roof: MAT.shingle, door: false });
  dome(g, x - 6 * s, y, Math.round(19 * s), Math.round(11 * s), (xx, yy) => (N3.noise(xx * 0.3, yy * 0.4) > 0.6 ? '#5e5040' : N3.noise(xx * 0.7, yy) > 0.45 ? '#3a3028' : '#2e2620'));
  for (let i = -6; i <= 6; i += 6) { g.P(x - 6 * s + i, y - 11 * s + Math.abs(i) * 0.3, hex(o.night ? '#ff9a42' : '#d9703a')); o.info.chimneys.push([x - 6 * s + i, y - 11 * s]); }
};
EXTRA_DRAW.gerberei = (L, x, y, o) => {
  const g = house(L, x, y, o, { scale: 0.9, front: 17, wallH: 14, roofH: 22, depth: 24, wallF: timberFront, wallS: timberSide, winS: [{ y: 10, n: 1 }] });
  const s = g.s;
  for (let j = 0; j < 2; j++) { const fx = x - g.W2 - (24 - j * 12) * s; pole(g, Math.round(fx), y, Math.round(13 * s)); pole(g, Math.round(fx + 9 * s), y, Math.round(13 * s)); for (let i = 0; i < 9 * s; i++) g.P(fx + i, y - 13 * s, g.LT('#4a3220', [0, -1, 0.5])); for (let k = 1; k < 10 * s; k++) for (let i = 1; i < 9 * s; i++) if (N3.noise(i * 0.4 + j * 5, k * 0.4) > 0.3) g.P(fx + i, y - 13 * s + k, g.LT(j ? '#b07a4a' : '#8a5a32', g.FRONT)); }
};
EXTRA_DRAW.weberei = (L, x, y, o) => {
  const g = house(L, x, y, o, { scale: 0.95, front: 18, wallH: 15, roofH: 22, depth: 24, wallF: MAT.plasterF, wallS: MAT.plasterS, gable: (i) => (Math.abs(i) < 1 ? '#4a3424' : '#c8bca4'), winF: [[9, 11]], winS: [{ y: 11, n: 1 }] });
  const s = g.s, x0 = x - g.W2 - 30 * s, x1 = x - g.W2 - 4 * s, ly = y - 14 * s;
  pole(g, Math.round(x0), y, Math.round(15 * s)); pole(g, Math.round(x1), y, Math.round(15 * s));
  for (let xx = x0; xx <= x1; xx++) g.P(xx, ly + Math.sin((xx - x0) / (x1 - x0) * Math.PI) * 2, g.LT('#c9b070', g.FRONT));
  ['#c43a2a', '#3a7aa8', '#d8c060'].forEach((col, j) => { const cx = x0 + (5 + j * 8) * s; for (let k = 1; k < 8 * s; k++) for (let i = 0; i < 5 * s; i++) g.P(cx + i, ly + 2 + k, g.LT(col, g.FRONT)); });
};
EXTRA_DRAW.toepferei = (L, x, y, o) => {
  const g = house(L, x, y, o, { scale: 0.85, front: 16, wallH: 12, roofH: 20, depth: 20, wallF: MAT.plasterF, wallS: MAT.plasterS, gable: (i) => (Math.abs(i) < 1 ? '#4a3424' : '#c8bca4'), winS: [{ y: 8, n: 1 }] });
  const s = o.s, kx = x - g.W2 - 9 * s;
  dome(g, kx, y, Math.round(7 * s), Math.round(8 * s), (xx, yy) => ((xx + 20) % 4 === 0 || yy % 3 === 0 ? '#7a3a22' : '#a0522d'));
  g.P(kx, y - 2, hex(o.night ? '#ff9a42' : '#d9703a')); g.P(kx + 1, y - 2, hex(o.night ? '#ff9a42' : '#d9703a')); o.info.windows.push([kx, y - 2]);
  for (let j = 0; j < 3; j++) { const cx = x + g.W2 + (24 + j * 5) * s; for (let k = 0; k < 4; k++) for (let i = -1 - (k > 0 && k < 3 ? 1 : 0); i <= 1 + (k > 0 && k < 3 ? 1 : 0); i++) g.P(cx + i, y - k, g.LT('#b06a3a', i > 0 ? g.SIDE : g.FRONT)); }
};
EXTRA_DRAW.markt = (L, x, y, o) => {
  const s = o.s, g = { P: (xx, yy, col) => L.set(xx, yy, col), LT: (hx, n) => lit(hex(hx), n[0], n[1], n[2], 2, 1 - o.shadow * 0.72), FRONT: [-0.3, 0, 0.9], SIDE: [0.9, 0, 0.4], ls: 1 - o.shadow * 0.72 };
  for (let yy = -6; yy <= 6; yy++) for (let xx = -40 * s; xx <= 40 * s; xx++) if ((xx / (40 * s)) ** 2 + (yy / 7) ** 2 < 1) g.P(x + xx, y + yy - 2, lit(hex(N4.noise((x + xx) * 0.35, (y + yy) * 0.6) > 0.6 ? '#9a968c' : '#86827a'), 0, -0.6, 0.6, 2, g.ls));
  [[-24, '#c43a2a'], [0, '#3a7aa8'], [24, '#3a6a3a']].forEach(([dx, col], j) => {
    const cx = x + dx * s, yb = y - 2 + (j === 1 ? -3 : 0), w = Math.round(9 * s);
    for (let i = -w; i <= w; i++) for (let k = 0; k < 4; k++) g.P(cx + i, yb - k, g.LT(k === 3 ? '#a37a50' : '#6b4b2e', k === 3 ? [0, -1, 0.4] : g.FRONT));
    for (let i = -w + 1; i < w; i += 2) g.P(cx + i, yb - 4, g.LT(['#e0b030', '#c43a2a', '#7aa04a', '#d8a050'][(i + 20 + j) % 4], [0, -1, 0.5]));
    pole(g, cx - w, yb, Math.round(13 * s)); pole(g, cx + w, yb, Math.round(13 * s));
    for (let k = 0; k < 5 * s; k++) for (let i = -w - 2; i <= w + 2; i++) g.P(cx + i, yb - 13 * s - k + Math.round(k * 0.4), g.LT(Math.floor((i + 40) / 3) % 2 ? col : '#ece6d6', [0, -0.7, 0.6]));
  });
};
EXTRA_DRAW.heilerhaus = (L, x, y, o) => {
  const g = house(L, x, y, o, { front: 18, wallH: 15, roofH: 24, depth: 26, wallF: MAT.plasterF, wallS: MAT.plasterS, gable: (i) => (Math.abs(i) < 1 ? '#4a3424' : '#c8bca4'), winF: [[9, 11]], winS: [{ y: 11, n: 2 }], chim: [16], doorCol: '#3a6a3a' });
  const s = g.s, bx = x + g.W2 + 22 * s;
  for (let r = 0; r < 3; r++) for (let i = 0; i < 16 * s; i++) { g.P(bx + i - r * 3, y - r * 3, g.LT('#4e3420', [0, -1, 0.5])); if (N3.noise(i * 0.7, r * 3) > 0.3) g.P(bx + i - r * 3, y - r * 3 - 1, g.LT(N3.noise(i, r) > 0.75 ? (r % 2 ? '#b07ad0' : '#e0b030') : '#6b8a3a', [0, -1, 0.5])); }
  for (let j = 0; j < 3; j++) { const hx = x - g.W2 + (4 + j * 5) * s; for (let k = 0; k < 4; k++) g.P(hx, g.gy + 4 + k, g.LT(k < 1 ? '#c9b070' : '#6b8a3a', g.FRONT)); }
};
EXTRA_DRAW.schrein = (L, x, y, o) => {
  const g = house(L, x, y, o, { scale: 0.65, front: 12, wallH: 12, roofH: 14, depth: 12, base: '#5f6470', wallF: (i, k) => MAT.stone(i + 40, k), wallS: MAT.stone, roof: MAT.slate, gable: gableOf(MAT.stone), ridge: '#2e333c', doorW: 3, doorH: 8, doorCol: '#1e1c22' });
  const s = o.s;
  for (const dx of [-20, 20]) { const cx = x + dx * s; for (let k = 0; k < 14 * s; k++) for (let i = -2 * s; i <= 2 * s; i++) g.P(cx + i - (k > 12 * s ? Math.sign(i) : 0), y + 2 - k, g.LT(N4.noise(i, k * 0.5) > 0.5 ? '#8a8e96' : '#767a84', i > 0 ? g.SIDE : g.FRONT)); for (let k = 3; k < 9; k += 3) g.P(cx, y - k * s, g.LT('#7ad0a0', g.FRONT)); }
  for (const dx of [-5, -2, 3]) { g.P(x + dx * s, y + 1, g.LT('#ece6d6', g.FRONT)); g.P(x + dx * s, y, hex('#ffcf74')); o.info.windows.push([x + dx * s, y]); }
};
EXTRA_DRAW.schreibstube = (L, x, y, o) => {
  const g = house(L, x, y, o, { front: 19, wallH: 22, roofH: 20, depth: 30, base: '#5f6470', wallF: (i, k) => MAT.stone(i + 40, k), wallS: MAT.stone, roof: MAT.slate, gable: gableOf(MAT.stone), ridge: '#2e333c', doorCol: '#4a3220', chim: [22], chimCol: '#767a84' });
  const s = g.s;
  for (const dx of [-12, 10]) for (let k = 0; k < 9 * s; k++) for (let i = 0; i < 3 * s; i++) { if (k === Math.round(9 * s) - 1 && (i === 0 || i === Math.round(3 * s) - 1)) continue; g.P(x + dx * s + i, y - 9 * s - k, o.night ? hex('#ffcf74') : g.LT('#2a3a4a', g.FRONT)); }
  o.info.windows.push([x - 11 * s, y - 13 * s], [x + 11 * s, y - 13 * s]);
  for (let j = 0; j < 2; j++) { const [sx, sy] = side(g, 10 + j * 14, 14); for (let k = 0; k < 8 * s; k++) for (let i = 0; i < 3 * s; i++) g.P(sx + i, sy - k + 4 * s - Math.round(i * g.dd), o.night ? hex('#ffcf74') : g.LT('#2a3a4a', g.SIDE)); }
};
EXTRA_DRAW.alchemistenturm = (L, x, y, o) => {
  const t = tower(L, x, y, o, { r: 10, rTop: 9, h: 50, roofH: 24, wall: (i, k) => MAT.stone(i + 30, k), roof: MAT.slate });
  const s = t.s;
  for (let k = 0; k < 10 * s; k++) for (let i = -3 * s; i < 3 * s; i++) t.P(x + i, y - 3 - k, t.LT('#3a2a40', [0, 0, 1]));
  for (const [dx, dy] of [[-3, 24], [3, 38]]) for (let k = 0; k < 5 * s; k++) for (let i = 0; i < 3 * s; i++) t.P(x + dx * s + i, y - dy * s - k, hex(o.night ? '#7ad0a0' : '#4a8a6a'));
  o.info.windows.push([x, y - 26 * s], [x + 4 * s, y - 40 * s]);
  for (let k = 0; k < 10 * s; k++) for (let i = 0; i < 3 * s; i++) t.P(x + 6 * s + i, t.top + 10 * s - k, t.LT('#5f6470', [0.6, 0, 0.7]));
  o.info.chimneys.push([x + 7 * s, t.top - 1]);
};
EXTRA_DRAW.kaserne = (L, x, y, o) => {
  const g = house(L, x, y, o, { front: 21, wallH: 16, roofH: 22, depth: 54, wallF: timberFront, wallS: timberSide, roof: MAT.shingle, gable: (i) => (Math.abs(i) < 1 ? '#4a3424' : '#8d775c'), winS: [{ y: 11, n: 3, gap: 15 }], chim: [32], doorW: 5 });
  const s = g.s;
  for (const [dx, col] of [[-13, '#a8442e'], [12, '#2a5a8a']]) for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= 10) g.P(x + dx * s + xx, y - 12 * s + yy, g.LT(xx * xx + yy * yy <= 1 ? '#d8c060' : col, g.FRONT));
  const px = x - g.W2 - 10 * s; pole(g, Math.round(px), y, Math.round(36 * s), '#4a3220');
  for (let k = 0; k < 9 * s; k++) for (let i = 1; i < 12 * s; i++) g.P(px + i, y - 35 * s + k + Math.round(Math.sin(i * 0.5) * 1), g.LT(k > 3 * s && k < 5 * s ? '#d8c060' : '#a8442e', g.FRONT));
  for (let j = 0; j < 3; j++) { const rx = x - g.W2 - 20 * s + j * 3; for (let k = 0; k < 13 * s; k++) g.P(rx, y - k, g.LT(k > 10 * s ? '#b4b8c0' : '#6b4b2e', g.FRONT)); }
};
EXTRA_DRAW.lagerhaus = (L, x, y, o) => {
  const pl = MAT.plank('#8a6a4a', '#7a5a3a', '#4a3220');
  const g = house(L, x, y, o, { front: 24, wallH: 20, roofH: 22, depth: 46, wallF: (i, k) => pl(i + 30, k), wallS: pl, roof: MAT.shingle, gable: (i, k) => pl(i + 30, k), doorW: 8, doorH: 14, doorCol: '#3a2618', winS: [{ y: 16, n: 2, gap: 20 }] });
  const s = g.s, cx = x - g.W2 - 16 * s;
  for (const [dx, dy] of [[0, 0], [6, 0], [3, 5]]) { box(g, Math.round(cx + dx * s), Math.round(y - dy * s), Math.round(5 * s), Math.round(5 * s), '#a07a4a', '#c09a5a'); }
  for (let j = 0; j < 2; j++) dome(g, x + g.W2 + (22 + j * 6) * s, y + 1, Math.round(3 * s), Math.round(4 * s), () => '#c8b898');
};
