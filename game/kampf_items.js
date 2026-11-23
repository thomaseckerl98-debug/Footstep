// Kampf-Items für Scharmützel und Schlachten (Horde-Kämpfe). 28 Waffen + 22 Gaben = 50 Items, je Stufe 1–10.
// Jedes Item hat Merkmale (Sets), eine Prägung (die es an seine Kombi-Partner weitergibt) und 3–5 Kombi-Partner.
// Kombi aktiv: beide Items ab Stufe 2 → die Waffe erhält die Prägung des Partners (Stärke wächst mit dessen Stufe).
// Verschmolzen: beide ab Stufe 8 → Prägung doppelt so stark, Waffe +50 % Schaden, neuer Name.
// Legenden: drei bestimmte Items ab Stufe 6 → eine zusätzliche, sehr starke Legendenwaffe.

export const MERKMALE = {
  stahl: { name: 'Stahl', farbe: '#c8ccd4', sets: { 3: ['krit', 0.06, '+6 % kritische Treffer'], 5: ['schaden', 0.15, '+15 % Schaden'], 8: ['krit', 0.12, '+12 % kritische Treffer, Kritische ×2,5'] } },
  wurf: { name: 'Wurf', farbe: '#b89a6a', sets: { 3: ['anzahl', 1, '+1 Geschoss'], 5: ['tempo', 0.12, '12 % schneller'], 8: ['anzahl', 2, '+2 Geschosse'] } },
  fern: { name: 'Fernkampf', farbe: '#a8c070', sets: { 3: ['reichweite', 0.2, 'Geschosse fliegen 20 % schneller'], 5: ['durch', 1, 'Geschosse durchbohren 1 weiteren Gegner'], 8: ['schaden', 0.25, '+25 % Schaden'] } },
  feuer: { name: 'Feuer', farbe: '#f08a3a', sets: { 3: ['brand', 0.5, 'Brand +50 %'], 5: ['flaeche', 0.15, '+15 % Fläche'], 8: ['brandexplo', 1, 'Brennende Gegner explodieren beim Tod'] } },
  eis: { name: 'Eis', farbe: '#9ad8f0', sets: { 3: ['frost', 0.3, 'Verlangsamung +30 %'], 5: ['eisschaden', 0.4, '+40 % Schaden gegen Verlangsamte'], 8: ['zerspringen', 1, 'Gefrorene zerspringen und treffen Nachbarn'] } },
  blitz: { name: 'Blitz', farbe: '#f0e070', sets: { 3: ['kette', 1, 'Ketten springen 1× weiter'], 5: ['tempo', 0.1, '10 % schneller'], 8: ['kette', 3, 'Ketten springen 3× weiter'] } },
  gift: { name: 'Gift', farbe: '#8ad04a', sets: { 3: ['giftdmg', 0.5, 'Gift +50 %'], 5: ['giftsprung', 1, 'Gift springt beim Tod über'], 8: ['giftdmg', 1.5, 'Gift +150 %'] } },
  natur: { name: 'Natur', farbe: '#5aa84a', sets: { 3: ['regen', 0.5, '+0,5 Leben pro Sekunde'], 5: ['flaeche', 0.15, '+15 % Fläche'], 8: ['regen', 2, '+2 Leben pro Sekunde, +20 % Leben'] } },
  geist: { name: 'Geist', farbe: '#b8a0f0', sets: { 3: ['dauer', 0.2, 'Wirkungen halten 20 % länger'], 5: ['geisterbonus', 1, 'Jeder 20. Kill ruft einen Geist'], 8: ['schaden', 0.3, '+30 % Schaden'] } },
  tier: { name: 'Tier', farbe: '#c08a5a', sets: { 3: ['ruf', 0.25, 'Tiere +25 % Schaden'], 5: ['anzahl', 1, '+1 Tier/Geschoss'], 8: ['ruf', 0.75, 'Tiere +75 % Schaden'] } },
  erde: { name: 'Erde', farbe: '#9a7a52', sets: { 3: ['ruestung', 2, '+2 Rüstung'], 5: ['flaeche', 0.2, '+20 % Fläche'], 8: ['beben', 1, 'Alle 6 s bebt die Erde um dich'] } },
  licht: { name: 'Licht', farbe: '#fff0b0', sets: { 3: ['xp', 0.15, '+15 % Erfahrung'], 5: ['schaden', 0.15, '+15 % Schaden'], 8: ['heilung', 1, 'Jeder Levelaufstieg heilt dich ganz'] } },
  aura: { name: 'Aura', farbe: '#e0b0d0', sets: { 3: ['flaeche', 0.15, '+15 % Fläche'], 5: ['ruestung', 2, '+2 Rüstung'], 8: ['flaeche', 0.3, '+30 % Fläche'] } },
};

// Prägungen: Wirkung, die ein Item an seine Kombi-Partner-Waffen weitergibt. k = Stufe des gebenden Items (1–10).
export const PRAEG = {
  krit: { adj: 'Scharfe', text: (k) => `+${5 + k * 2} % kritische Treffer` },
  rueckstoss: { adj: 'Wuchtige', text: (k) => `Stößt Gegner ${20 + k * 6}px zurück` },
  durchbohren: { adj: 'Durchbohrende', text: (k) => `Durchbohrt ${1 + Math.floor(k / 3)} weitere Gegner` },
  heimsuchen: { adj: 'Suchende', text: () => 'Geschosse suchen sich ihr Ziel' },
  wucht: { adj: 'Schwere', text: (k) => `+${10 + k * 4} % Schaden` },
  abprall: { adj: 'Springende', text: (k) => `Prallt ${1 + Math.floor(k / 4)}× zum nächsten Gegner ab` },
  vervielfachen: { adj: 'Doppelte', text: (k) => `+${1 + Math.floor(k / 5)} Geschoss/Treffer` },
  lebensraub: { adj: 'Durstige', text: (k) => `Heilt dich um ${(0.5 + k * 0.25).toFixed(1).replace('.', ',')} % des Schadens` },
  brennen: { adj: 'Brennende', text: (k) => `Setzt in Brand (${3 + k * 2} Schaden/s)` },
  explodieren: { adj: 'Berstende', text: (k) => `${15 + k * 3} % Chance auf Explosion` },
  frost: { adj: 'Frostige', text: (k) => `Verlangsamt um ${25 + k * 3} %, ${k * 2} % Chance zu erstarren` },
  splitter: { adj: 'Splitternde', text: (k) => `Zerbricht beim Treffer in ${2 + Math.floor(k / 4)} Splitter` },
  kette: { adj: 'Donnernde', text: (k) => `Blitz springt auf ${1 + Math.floor(k / 3)} Gegner über` },
  betaeuben: { adj: 'Betäubende', text: (k) => `${8 + k * 2} % Chance zu betäuben` },
  gift: { adj: 'Giftige', text: (k) => `Vergiftet (${String(2 + k * 1.5).replace('.', ',')} Schaden/s, stapelt sich)` },
  dornen: { adj: 'Dornige', text: (k) => `Getötete Gegner verschießen ${3 + Math.floor(k / 2)} Dornen` },
  groesse: { adj: 'Riesige', text: (k) => `+${10 + k * 4} % Fläche und Größe` },
  geister: { adj: 'Spukende', text: (k) => `${8 + k * 2} % Chance, beim Kill einen Geist zu rufen` },
  blutung: { adj: 'Reißende', text: (k) => `Blutung (${4 + k * 2} Schaden/s, stapelt sich bis 5)` },
  tempo: { adj: 'Flinke', text: (k) => `${8 + k * 3} % schneller` },
  fluch: { adj: 'Verfluchte', text: (k) => `Getroffene nehmen ${8 + k * 2} % mehr Schaden` },
  schild: { adj: 'Schützende', text: (k) => `${4 + k} % Chance auf einen Schutzschild` },
};

const W = 'waffe', G = 'gabe';
// st(L): Grundwerte je Stufe. dmg, cd (Sekunden), n (Anzahl), area (Radius/Größe), spd (Tempo), dur (Dauer), pierce
export const ITEMS = [
  // ───────────── Waffen ─────────────
  { id: 'kurzschwert', gen: 'n', typ: W, name: 'Kurzschwert', farbe: '#d8dce4', tags: ['stahl'], praeg: 'krit', partner: ['schleifstein', 'gluecksklee', 'wurfmesser', 'kriegsbemalung'],
    text: 'Hiebe vor dir, bei höheren Stufen auch hinter dir.', st: (L) => ({ dmg: 14 + L * 5, cd: 1.15 - L * 0.04, n: L >= 4 ? 2 : 1, area: 34 + L * 3 }) },
  { id: 'wurfaxt', gen: 'f', typ: W, name: 'Wurfaxt', farbe: '#b0a090', tags: ['stahl', 'wurf'], praeg: 'rueckstoss', partner: ['eisenwille', 'kriegshammer', 'zunderbuechse', 'riesenring'],
    text: 'Fliegt im hohen Bogen und fällt durch alles hindurch.', st: (L) => ({ dmg: 20 + L * 7, cd: 1.6 - L * 0.05, n: 1 + Math.floor(L / 3), area: 9 + L * 0.6, pierce: 99 }) },
  { id: 'speer', gen: 'm', typ: W, name: 'Speer', farbe: '#c0a070', tags: ['stahl', 'fern'], praeg: 'durchbohren', partner: ['falkenauge', 'kriegshorn', 'blitzbernstein', 'armbrust'],
    text: 'Ein Stoß in Blickrichtung, durchbohrt ganze Reihen.', st: (L) => ({ dmg: 18 + L * 6, cd: 1.3 - L * 0.04, n: 1 + Math.floor(L / 4), area: 70 + L * 6, pierce: 99 }) },
  { id: 'bogen', gen: 'm', typ: W, name: 'Jagdbogen', farbe: '#a8c070', tags: ['fern', 'natur'], praeg: 'heimsuchen', partner: ['doppelsehne', 'falkenauge', 'wolfsgeist', 'schlangenzahn', 'zunderbuechse'],
    text: 'Pfeile auf den nächsten Gegner.', st: (L) => ({ dmg: 11 + L * 4, cd: 0.9 - L * 0.035, n: 1 + Math.floor((L + 1) / 3), spd: 340, pierce: Math.floor(L / 5) }) },
  { id: 'armbrust', gen: 'f', typ: W, name: 'Armbrust', farbe: '#8a7a5a', tags: ['fern', 'stahl'], praeg: 'wucht', partner: ['speer', 'schleifstein', 'frostzahn', 'sanduhr'],
    text: 'Langsame, schwere Bolzen in Blickrichtung, die alles durchschlagen.', st: (L) => ({ dmg: 40 + L * 14, cd: 2.0 - L * 0.07, n: 1 + Math.floor(L / 5), spd: 420, pierce: 3 + L }) },
  { id: 'schleuder', gen: 'f', typ: W, name: 'Schleuder', farbe: '#9a9a9a', tags: ['fern', 'wurf'], praeg: 'abprall', partner: ['magnetstein', 'gluecksklee', 'eiszapfen'],
    text: 'Steine, die von Gegner zu Gegner springen.', st: (L) => ({ dmg: 12 + L * 4, cd: 1.1 - L * 0.04, n: 1 + Math.floor(L / 4), spd: 300, bounce: 2 + Math.floor(L / 2) }) },
  { id: 'wurfmesser', gen: 'pl', typ: W, name: 'Wurfmesser', farbe: '#e0e4ea', tags: ['stahl', 'wurf'], praeg: 'vervielfachen', partner: ['kurzschwert', 'doppelsehne', 'schlangenzahn', 'hasenpfote', 'kriegsbemalung'],
    text: 'Schnelle Messerfächer in Laufrichtung.', st: (L) => ({ dmg: 7 + L * 3, cd: 0.55 - L * 0.02, n: 1 + Math.floor((L + 1) / 2), spd: 480 }) },
  { id: 'kraeuterbeutel', gen: 'm', typ: W, name: 'Kräuterbeutel', farbe: '#7ac060', tags: ['natur', 'aura'], praeg: 'lebensraub', partner: ['moosherz', 'schlangenzahn', 'riesenring', 'bienenkorb'],
    text: 'Bitterer Dunst um dich, der Gegner schwächt und dich stärkt.', st: (L) => ({ dmg: 5 + L * 2.2, cd: 0.5, area: 46 + L * 6 }) },
  { id: 'fackel', gen: 'f', typ: W, name: 'Fackel', farbe: '#f0a040', tags: ['feuer'], praeg: 'brennen', partner: ['zunderbuechse', 'riesenring', 'glutstein', 'sturmglocke'],
    text: 'Ein Flammenstoß in Blickrichtung.', st: (L) => ({ dmg: 6 + L * 2.5, cd: 1.4 - L * 0.05, area: 60 + L * 6, dur: 0.6 + L * 0.05 }) },
  { id: 'glutstein', gen: 'm', typ: W, name: 'Glutstein', farbe: '#e0602a', tags: ['feuer', 'wurf'], praeg: 'explodieren', partner: ['fackel', 'ahnenstein', 'riesenring', 'schleuder'],
    text: 'Glühende Steine, die beim Aufprall bersten.', st: (L) => ({ dmg: 22 + L * 8, cd: 1.7 - L * 0.06, n: 1 + Math.floor(L / 3), spd: 220, area: 32 + L * 3 }) },
  { id: 'eiszapfen', gen: 'pl', typ: W, name: 'Eiszapfen', farbe: '#a8e0f8', tags: ['eis'], praeg: 'frost', partner: ['frostzahn', 'frostkranz', 'sanduhr', 'schleuder'],
    text: 'Zapfen fallen vom Himmel auf zufällige Gegner.', st: (L) => ({ dmg: 18 + L * 6, cd: 1.3 - L * 0.05, n: 2 + Math.floor(L / 2), area: 18 + L * 1.5 }) },
  { id: 'frostkranz', gen: 'm', typ: W, name: 'Frostkranz', farbe: '#c8f0ff', tags: ['eis', 'aura'], praeg: 'splitter', partner: ['eiszapfen', 'mondsichel', 'kraehenfeder', 'eisenwille'],
    text: 'Eissplitter kreisen um dich.', st: (L) => ({ dmg: 9 + L * 3.5, cd: 4.5, n: 2 + Math.floor(L / 2), area: 52 + L * 3, dur: 2.6 + L * 0.2, spd: 3.2 }) },
  { id: 'donnerkeil', gen: 'm', typ: W, name: 'Donnerkeil', farbe: '#f0e070', tags: ['blitz'], praeg: 'kette', partner: ['blitzbernstein', 'sturmglocke', 'sanduhr', 'speer', 'eulenfeder'],
    text: 'Blitze schlagen in zufällige Gegner ein.', st: (L) => ({ dmg: 20 + L * 7, cd: 1.5 - L * 0.06, n: 1 + Math.floor((L + 1) / 3), area: 20 + L }) },
  { id: 'sturmglocke', gen: 'f', typ: W, name: 'Sturmglocke', farbe: '#e8d890', tags: ['blitz', 'aura'], praeg: 'betaeuben', partner: ['donnerkeil', 'fackel', 'kriegshorn', 'eisenwille'],
    text: 'Ein Glockenschlag sendet eine Druckwelle um dich herum.', st: (L) => ({ dmg: 16 + L * 6, cd: 3.2 - L * 0.12, area: 80 + L * 8 }) },
  { id: 'moorkrug', gen: 'm', typ: W, name: 'Moorkrug', farbe: '#7aa040', tags: ['gift', 'wurf'], praeg: 'gift', partner: ['schlangenzahn', 'riesenring', 'kraehenfeder', 'bienenkorb'],
    text: 'Zerplatzt und hinterlässt giftige Pfützen.', st: (L) => ({ dmg: 5 + L * 2, cd: 2.4 - L * 0.08, n: 1 + Math.floor(L / 3), area: 30 + L * 3, dur: 3 + L * 0.25 }) },
  { id: 'dornenranke', gen: 'f', typ: W, name: 'Dornenranke', farbe: '#6a9a3a', tags: ['natur'], praeg: 'dornen', partner: ['dornenpanzer', 'wurzelschlag', 'moosherz', 'schlangenzahn'],
    text: 'Dornen wachsen in vier Richtungen aus dem Boden.', st: (L) => ({ dmg: 13 + L * 4.5, cd: 2.0 - L * 0.07, n: L >= 6 ? 8 : 4, area: 100 + L * 10 }) },
  { id: 'wurzelschlag', gen: 'm', typ: W, name: 'Wurzelschlag', farbe: '#8a6a3a', tags: ['natur', 'erde'], praeg: 'groesse', partner: ['dornenranke', 'kriegshammer', 'trollblut', 'frostzahn'],
    text: 'Wurzeln brechen unter Gegnern in deiner Nähe hervor und halten sie fest.', st: (L) => ({ dmg: 16 + L * 5, cd: 2.2 - L * 0.08, n: 2 + Math.floor(L / 2), area: 26 + L * 2 }) },
  { id: 'geisterlaterne', gen: 'f', typ: W, name: 'Geisterlaterne', farbe: '#b8a0f0', tags: ['geist', 'licht'], praeg: 'geister', partner: ['kraehenfeder', 'eulenfeder', 'runenstein', 'rabenschwarm'],
    text: 'Irrlichter suchen sich ihre Opfer.', st: (L) => ({ dmg: 10 + L * 3.5, cd: 1.0 - L * 0.03, n: 1 + Math.floor((L + 1) / 3), spd: 200 }) },
  { id: 'rabenschwarm', gen: 'm', typ: W, name: 'Rabenschwarm', farbe: '#504a60', tags: ['geist', 'tier'], praeg: 'heimsuchen', partner: ['geisterlaterne', 'wolfsfell', 'kraehenfeder', 'falkenauge'],
    text: 'Raben kreisen und stürzen sich auf Gegner.', st: (L) => ({ dmg: 9 + L * 3, cd: 0.8, n: 2 + Math.floor(L / 2), area: 140 + L * 8, spd: 260 }) },
  { id: 'wolfsgeist', gen: 'm', typ: W, name: 'Wolfsgeist', farbe: '#a0b0c8', tags: ['tier', 'geist'], praeg: 'blutung', partner: ['wolfsfell', 'bogen', 'hasenpfote', 'kriegsbemalung'],
    text: 'Geisterwölfe jagen an deiner Seite.', st: (L) => ({ dmg: 14 + L * 5, cd: 0.6, n: 1 + Math.floor(L / 3), spd: 210 + L * 6 }) },
  { id: 'bienenkorb', gen: 'm', typ: W, name: 'Bienenkorb', farbe: '#e8c040', tags: ['tier', 'gift', 'natur'], praeg: 'gift', partner: ['kraeuterbeutel', 'moorkrug', 'wolfsfell', 'moosherz'],
    text: 'Bienenschwärme stürzen sich auf die nächsten Gegner.', st: (L) => ({ dmg: 4 + L * 1.6, cd: 0.25, n: 1 + Math.floor((L + 1) / 2), spd: 170, dur: 6 }) },
  { id: 'kriegshorn', gen: 'n', typ: W, name: 'Kriegshorn', farbe: '#d0b080', tags: ['stahl', 'aura'], praeg: 'tempo', partner: ['speer', 'sturmglocke', 'kriegsbemalung'],
    text: 'Ein Hornstoß wirft alle Gegner vor dir zurück und schwächt sie.', st: (L) => ({ dmg: 10 + L * 4, cd: 3.5 - L * 0.12, area: 110 + L * 8 }) },
  { id: 'bumerang', gen: 'm', typ: W, name: 'Bumerang', farbe: '#c89060', tags: ['wurf'], praeg: 'vervielfachen', partner: ['hasenpfote', 'magnetstein', 'wurfaxt'],
    text: 'Fliegt hinaus und kehrt zurück – trifft doppelt.', st: (L) => ({ dmg: 13 + L * 4.5, cd: 1.5 - L * 0.05, n: 1 + Math.floor(L / 3), spd: 320, pierce: 99 }) },
  { id: 'morgenstern', gen: 'm', typ: W, name: 'Morgenstern', farbe: '#9098a0', tags: ['stahl', 'aura'], praeg: 'wucht', partner: ['eisenwille', 'trollblut', 'kriegshammer'],
    text: 'Eine schwere Kugel an der Kette wirbelt um dich.', st: (L) => ({ dmg: 22 + L * 7, cd: 0, n: 1 + Math.floor(L / 4), area: 64 + L * 3, spd: 2.6 + L * 0.12 }) },
  { id: 'kriegshammer', gen: 'm', typ: W, name: 'Kriegshammer', farbe: '#a08a70', tags: ['stahl', 'erde'], praeg: 'betaeuben', partner: ['wurfaxt', 'morgenstern', 'wurzelschlag', 'ahnenstein'],
    text: 'Schmettert auf den Boden – alles in der Nähe wird getroffen.', st: (L) => ({ dmg: 34 + L * 11, cd: 2.6 - L * 0.09, area: 60 + L * 6 }) },
  { id: 'runenstein', gen: 'm', typ: W, name: 'Runenstein', farbe: '#a090d0', tags: ['geist', 'erde'], praeg: 'fluch', partner: ['geisterlaterne', 'ahnenstein', 'eulenfeder', 'gluecksklee'],
    text: 'Hinterlässt Runen, die explodieren, wenn Gegner sie berühren.', st: (L) => ({ dmg: 30 + L * 10, cd: 1.6 - L * 0.06, n: 1 + Math.floor(L / 4), area: 34 + L * 3, dur: 8 }) },
  { id: 'sonnenspiegel', gen: 'm', typ: W, name: 'Sonnenspiegel', farbe: '#fff0a0', tags: ['licht', 'feuer'], praeg: 'groesse', partner: ['mondsichel', 'zunderbuechse', 'ahnenstein', 'gluecksklee'],
    text: 'Ein Lichtstrahl kreist um dich.', st: (L) => ({ dmg: 18 + L * 6, cd: 0.25, n: 1 + Math.floor(L / 5), area: 110 + L * 9, spd: 1.4 + L * 0.06 }) },
  { id: 'mondsichel', gen: 'f', typ: W, name: 'Mondsichel', farbe: '#d8d0ff', tags: ['licht', 'geist'], praeg: 'splitter', partner: ['sonnenspiegel', 'frostkranz', 'kraehenfeder', 'doppelsehne'],
    text: 'Sicheln drehen sich spiralförmig nach außen.', st: (L) => ({ dmg: 15 + L * 5, cd: 1.8 - L * 0.06, n: 2 + Math.floor(L / 2), spd: 150, pierce: 99 }) },
  // ───────────── Gaben ─────────────
  { id: 'eisenwille', typ: G, name: 'Eisenwille', farbe: '#8a8a90', tags: ['erde'], praeg: 'rueckstoss', partner: ['wurfaxt', 'frostkranz', 'sturmglocke', 'morgenstern'],
    text: '+12 % Leben, +1 Rüstung je zwei Stufen.', mod: (L) => ({ hpMul: 0.12 * L, armor: Math.floor(L / 2) }) },
  { id: 'falkenauge', typ: G, name: 'Falkenauge', farbe: '#d0b060', tags: ['fern'], praeg: 'heimsuchen', partner: ['speer', 'bogen', 'rabenschwarm', 'doppelsehne'],
    text: 'Geschosse +10 % schneller, +4 % kritische Treffer.', mod: (L) => ({ projSpd: 0.1 * L, crit: 0.04 * L }) },
  { id: 'hasenpfote', typ: G, name: 'Hasenpfote', farbe: '#e0d0b0', tags: ['tier'], praeg: 'tempo', partner: ['wurfmesser', 'wolfsgeist', 'bumerang', 'magnetstein'],
    text: '+7 % Laufgeschwindigkeit.', mod: (L) => ({ speed: 0.07 * L }) },
  { id: 'gluecksklee', typ: G, name: 'Glücksklee', farbe: '#60c060', tags: ['natur'], praeg: 'krit', partner: ['kurzschwert', 'schleuder', 'runenstein', 'sonnenspiegel'],
    text: 'Mehr Glück: bessere Angebote, +3 % kritische Treffer.', mod: (L) => ({ luck: 0.1 * L, crit: 0.03 * L }) },
  { id: 'moosherz', typ: G, name: 'Moosherz', farbe: '#4a9a50', tags: ['natur'], praeg: 'lebensraub', partner: ['kraeuterbeutel', 'dornenranke', 'bienenkorb', 'trollblut'],
    text: '+0,4 Leben pro Sekunde.', mod: (L) => ({ regen: 0.4 * L }) },
  { id: 'eulenfeder', typ: G, name: 'Eulenfeder', farbe: '#c8b090', tags: ['licht'], praeg: 'fluch', partner: ['geisterlaterne', 'donnerkeil', 'runenstein', 'magnetstein'],
    text: '+10 % Erfahrung.', mod: (L) => ({ xp: 0.1 * L }) },
  { id: 'schleifstein', typ: G, name: 'Schleifstein', farbe: '#b0b0b8', tags: ['stahl'], praeg: 'wucht', partner: ['kurzschwert', 'armbrust', 'kriegsbemalung', 'ahnenstein'],
    text: '+8 % Schaden.', mod: (L) => ({ dmg: 0.08 * L }) },
  { id: 'zunderbuechse', typ: G, name: 'Zunderbüchse', farbe: '#e07030', tags: ['feuer'], praeg: 'brennen', partner: ['fackel', 'wurfaxt', 'bogen', 'sonnenspiegel'],
    text: 'Brand +15 %, +3 % Schaden.', mod: (L) => ({ burn: 0.15 * L, dmg: 0.03 * L }) },
  { id: 'frostzahn', typ: G, name: 'Frostzahn', farbe: '#a0d8f0', tags: ['eis'], praeg: 'frost', partner: ['eiszapfen', 'armbrust', 'wurzelschlag', 'trollblut'],
    text: 'Verlangsamung +6 %, +4 % Schaden gegen Verlangsamte.', mod: (L) => ({ frost: 0.06 * L, coldDmg: 0.04 * L }) },
  { id: 'blitzbernstein', typ: G, name: 'Blitzbernstein', farbe: '#f0c040', tags: ['blitz'], praeg: 'kette', partner: ['donnerkeil', 'speer', 'sanduhr', 'magnetstein'],
    text: 'Ketten springen weiter, +3 % Tempo.', mod: (L) => ({ chain: Math.floor(L / 3), cd: 0.03 * L }) },
  { id: 'schlangenzahn', typ: G, name: 'Schlangenzahn', farbe: '#90c050', tags: ['gift'], praeg: 'gift', partner: ['bogen', 'wurfmesser', 'kraeuterbeutel', 'moorkrug', 'dornenranke'],
    text: 'Gift +20 %, Gift hält länger.', mod: (L) => ({ poison: 0.2 * L }) },
  { id: 'wolfsfell', typ: G, name: 'Wolfsfell', farbe: '#a09080', tags: ['tier'], praeg: 'blutung', partner: ['wolfsgeist', 'rabenschwarm', 'bienenkorb', 'dornenpanzer'],
    text: 'Tiere +12 % Schaden, +3 % Laufgeschwindigkeit.', mod: (L) => ({ beast: 0.12 * L, speed: 0.03 * L }) },
  { id: 'riesenring', typ: G, name: 'Riesenring', farbe: '#c0a0e0', tags: ['aura'], praeg: 'groesse', partner: ['wurfaxt', 'kraeuterbeutel', 'fackel', 'glutstein', 'moorkrug'],
    text: '+9 % Fläche und Größe.', mod: (L) => ({ area: 0.09 * L }) },
  { id: 'sanduhr', typ: G, name: 'Sanduhr', farbe: '#e0c890', tags: ['licht'], praeg: 'tempo', partner: ['armbrust', 'eiszapfen', 'donnerkeil', 'blitzbernstein'],
    text: 'Alle Waffen 5 % schneller.', mod: (L) => ({ cd: 0.05 * L }) },
  { id: 'doppelsehne', typ: G, name: 'Doppelsehne', farbe: '#d0c0a0', tags: ['fern', 'wurf'], praeg: 'vervielfachen', partner: ['bogen', 'wurfmesser', 'falkenauge', 'mondsichel'],
    text: '+1 Geschoss auf Stufe 3, 6 und 9.', mod: (L) => ({ amount: Math.floor(L / 3) }) },
  { id: 'magnetstein', typ: G, name: 'Magnetstein', farbe: '#806878', tags: ['erde'], praeg: 'abprall', partner: ['schleuder', 'bumerang', 'hasenpfote', 'eulenfeder', 'blitzbernstein'],
    text: 'Erfahrung aus größerer Entfernung einsammeln.', mod: (L) => ({ magnet: 0.3 * L }) },
  { id: 'kraehenfeder', typ: G, name: 'Krähenfeder', farbe: '#403848', tags: ['geist'], praeg: 'geister', partner: ['frostkranz', 'moorkrug', 'geisterlaterne', 'rabenschwarm', 'mondsichel'],
    text: 'Wirkungen halten 10 % länger.', mod: (L) => ({ dur: 0.1 * L }) },
  { id: 'dornenpanzer', typ: G, name: 'Dornenpanzer', farbe: '#6a7a40', tags: ['natur', 'erde'], praeg: 'dornen', partner: ['dornenranke', 'wolfsfell', 'trollblut'],
    text: '+1 Rüstung, wer dich trifft, nimmt Schaden.', mod: (L) => ({ armor: Math.ceil(L / 2), thorns: 6 * L }) },
  { id: 'kriegsbemalung', typ: G, name: 'Kriegsbemalung', farbe: '#c04a3a', tags: ['stahl'], praeg: 'blutung', partner: ['kurzschwert', 'wurfmesser', 'wolfsgeist', 'kriegshorn', 'schleifstein'],
    text: 'Kritische Treffer +15 % stärker.', mod: (L) => ({ critMul: 0.15 * L }) },
  { id: 'wegzehrung', typ: G, name: 'Wegzehrung', farbe: '#d0a060', tags: ['natur'], praeg: 'schild', partner: ['moosherz', 'eisenwille', 'kraeuterbeutel'],
    text: '+8 % Leben, jeder Levelaufstieg heilt.', mod: (L) => ({ hpMul: 0.08 * L, lvlHeal: 0.05 * L }) },
  { id: 'ahnenstein', typ: G, name: 'Ahnenstein', farbe: '#a89070', tags: ['erde', 'licht'], praeg: 'explodieren', partner: ['glutstein', 'kriegshammer', 'runenstein', 'sonnenspiegel', 'schleifstein'],
    text: '+4 % Schaden und +4 % Erfahrung.', mod: (L) => ({ dmg: 0.04 * L, xp: 0.04 * L }) },
  { id: 'trollblut', typ: G, name: 'Trollblut', farbe: '#5a8a6a', tags: ['natur'], praeg: 'betaeuben', partner: ['wurzelschlag', 'morgenstern', 'moosherz', 'frostzahn', 'dornenpanzer'],
    text: '+0,25 Leben pro Sekunde, +5 % Leben. Auf Stufe 10: einmal wiederaufstehen.', mod: (L) => ({ regen: 0.25 * L, hpMul: 0.05 * L, revive: L >= 10 ? 1 : 0 }) },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Legenden: drei Items ab Stufe 6 → zusätzliche Legendenwaffe
export const LEGENDEN = [
  { id: 'feuersturm', name: 'Feuersturm', braucht: ['fackel', 'glutstein', 'zunderbuechse'], farbe: '#ff7a2a', text: 'Ein Ring aus Feuerbällen kreist unaufhörlich um dich.' },
  { id: 'ewigerwinter', name: 'Ewiger Winter', braucht: ['eiszapfen', 'frostkranz', 'frostzahn'], farbe: '#bfefff', text: 'Alle 6 Sekunden gefriert alles um dich herum.' },
  { id: 'gewitterzorn', name: 'Gewitterzorn', braucht: ['donnerkeil', 'sturmglocke', 'blitzbernstein'], farbe: '#fff27a', text: 'Ein Dauergewitter folgt dir.' },
  { id: 'wildejagd', name: 'Die Wilde Jagd', braucht: ['wolfsgeist', 'bogen', 'wolfsfell'], farbe: '#c0d0ff', text: 'Ein Rudel Geisterwölfe stürmt mit dir.' },
  { id: 'weltenwurzel', name: 'Weltenwurzel', braucht: ['dornenranke', 'wurzelschlag', 'moosherz'], farbe: '#6acf4a', text: 'Wurzeln brechen überall um dich hervor und heilen dich.' },
  { id: 'klingentanz', name: 'Klingentanz', braucht: ['kurzschwert', 'wurfmesser', 'kriegsbemalung'], farbe: '#ffffff', text: 'Klingen wirbeln um dich und schießen in alle Richtungen.' },
  { id: 'seuchenwind', name: 'Seuchenwind', braucht: ['moorkrug', 'bienenkorb', 'schlangenzahn'], farbe: '#9ae04a', text: 'Eine riesige Giftwolke zieht mit dir.' },
  { id: 'totentanz', name: 'Totentanz', braucht: ['geisterlaterne', 'rabenschwarm', 'kraehenfeder'], farbe: '#c8a8ff', text: 'Unzählige Geister fallen über deine Feinde her.' },
  { id: 'ahnenhammer', name: 'Hammer der Ahnen', braucht: ['kriegshammer', 'eisenwille', 'ahnenstein'], farbe: '#e0c090', text: 'Ein gewaltiger Schlag erschüttert den ganzen Kampfplatz.' },
  { id: 'sonnenrad', name: 'Sonnenrad', braucht: ['sonnenspiegel', 'mondsichel', 'sanduhr'], farbe: '#fff4c0', text: 'Vier Strahlen drehen sich um dich wie ein Rad.' },
  { id: 'pfeilregen', name: 'Pfeilregen', braucht: ['bogen', 'armbrust', 'falkenauge'], farbe: '#d8f0a0', text: 'Pfeile regnen ununterbrochen auf alles vor dir.' },
  { id: 'sturmwirbel', name: 'Sturmwirbel', braucht: ['bumerang', 'wurfaxt', 'riesenring'], farbe: '#e0c8a0', text: 'Ein Wirbel aus Äxten und Bumerangs dreht sich um dich.' },
];

// Kombi-Paare (beidseitig): Waffe ↔ Partner
export function paare() {
  const out = new Map();
  for (const it of ITEMS) for (const p of it.partner) {
    const k = [it.id, p].sort().join('|');
    if (ITEM[p]) out.set(k, [it.id, p]);
  }
  return [...out.values()];
}
export function partnerVon(id) {
  const s = new Set(ITEM[id].partner);
  for (const it of ITEMS) if (it.partner.includes(id)) s.add(it.id);
  return [...s].filter((x) => ITEM[x]);
}
