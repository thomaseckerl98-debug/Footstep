// Die Welt von Mossheart: Geografie (Küste, Gebirge, Flüsse, Seen, Wälder, Moor, Heide), Reiche und Orte.
// Eine Quelle für alles: Die Karte zeichnet daraus das Gelände, tools/welt_sql.mjs erzeugt daraus die Orte in der Datenbank.
// Koordinaten in Welt-Einheiten: 0..4000 (West→Ost) × 0..3000 (Nord→Süd).

export const WELT = { w: 4000, h: 3000, name: 'Das Moosland' };

// Festland (im Uhrzeigersinn); außerhalb liegt Meer. Der Norden geht in ewiges Eis über (Kartenrand).
export const KUESTE = [
  [560, 0], [4000, 0], [4000, 2900], [3800, 2880], [3500, 2950], [3200, 2900], [2900, 2960], [2600, 2920], [2300, 2940], [2050, 2880],
  [1800, 2820], [1600, 2880], [1420, 2850], [1250, 2760], [1000, 2720], [820, 2620], [640, 2520], [420, 2400], [260, 2240], [340, 2080],
  [300, 1900], [400, 1760], [470, 1610], [380, 1500], [420, 1380], [330, 1260], [360, 1120], [280, 1020], [380, 880], [300, 720],
  [430, 560], [330, 420], [470, 260],
];
export const INSELN = [{ x: 170, y: 1340, r: 75 }, { x: 240, y: 2560, r: 55 }, { x: 110, y: 760, r: 45 }];

// Gebirgszüge: Grat als Linie, Breite (Einwirkung) und Höhe; „senken“ = Pässe
export const GEBIRGE = [
  { id: 'graukamm', name: 'Graukamm', pts: [[420, 230], [900, 380], [1300, 420], [1700, 370], [2000, 330], [2400, 380], [2900, 330], [3400, 420], [3800, 290], [4050, 260]], breite: 300, hoehe: 1.0,
    senken: [{ x: 1960, y: 350, r: 150, f: 0.42 }] },
  { id: 'ostkamm', name: 'Ostkamm', pts: [[3400, 420], [3350, 800], [3420, 1200], [3380, 1600], [3450, 2000], [3400, 2320]], breite: 230, hoehe: 0.85,
    senken: [{ x: 3395, y: 1640, r: 130, f: 0.45 }] },
  { id: 'rabenhoehen', name: 'Rabenhöhen', pts: [[980, 720], [1250, 780], [1520, 720]], breite: 190, hoehe: 0.48, senken: [] },
  { id: 'brachhuegel', name: 'Brachhügel', pts: [[1050, 2150], [1300, 2260], [1450, 2200]], breite: 220, hoehe: 0.22, senken: [] },
];

// Flüsse von der Quelle zur Mündung; b = Breite an der Mündung
export const FLUESSE = [
  { id: 'silberlauf', name: 'Silberlauf', b: 30, pts: [[2050, 560], [2000, 800], [2080, 1050], [2020, 1300], [1950, 1650], [1820, 1950], [1720, 2230], [1660, 2380], [1580, 2600], [1500, 2860]] },
  { id: 'eisbach', name: 'Eisbach', b: 16, pts: [[3300, 1080], [3050, 1250], [2860, 1390], [2780, 1480]] },
  { id: 'muehlbach', name: 'Mühlbach', b: 16, pts: [[2390, 1580], [2290, 1780], [2250, 1950], [2080, 2050], [1800, 2010]] },
  { id: 'rotbach', name: 'Rotbach', b: 10, pts: [[2330, 1030], [2230, 1150], [2150, 1260], [2060, 1420]] },
  { id: 'klarbach', name: 'Klarbach', b: 9, pts: [[2470, 640], [2380, 860], [2220, 990], [2085, 1060]] },
  { id: 'rabenwasser', name: 'Rabenwasser', b: 24, pts: [[1450, 520], [1320, 800], [1050, 1080], [820, 1300], [600, 1440], [430, 1540]] },
  { id: 'ostbach', name: 'Ostbach', b: 18, pts: [[3520, 860], [3720, 1250], [3800, 1700], [3900, 2100], [4020, 2350]] },
  { id: 'moorbach', name: 'Unkenbach', b: 12, pts: [[2980, 2180], [3080, 2500], [3180, 2700], [3300, 2920]] },
  { id: 'heidebach', name: 'Ginsterbach', b: 8, pts: [[2650, 2150], [2480, 2350], [2250, 2480], [1990, 2560], [1700, 2560], [1610, 2560]] },
];

export const SEEN = [
  { id: 'spiegelsee', name: 'Spiegelsee', x: 2590, y: 1520, rx: 230, ry: 120, rot: -0.12 },
  { id: 'unkensee', name: 'Unkensee', x: 1110, y: 1520, rx: 95, ry: 60, rot: 0.4 },
  { id: 'schwarzweiher', name: 'Schwarzweiher', x: 3180, y: 2470, rx: 70, ry: 45, rot: 0.2 },
  { id: 'bergsee', name: 'Grauer Tarn', x: 2700, y: 560, rx: 55, ry: 35, rot: 0 },
];

// Flächen: Wälder (dichte), Moor, Heide
export const WAELDER = [
  { id: 'moderwald', name: 'Moderwald', d: 0.95, laub: 0.7, pts: [[2780, 880], [3200, 840], [3310, 1300], [3260, 1950], [2960, 2060], [2800, 1700], [2860, 1380], [2700, 1100]] },
  { id: 'gruenhag', name: 'Grünhag', d: 0.85, laub: 0.9, pts: [[760, 1160], [1150, 1110], [1380, 1480], [1260, 1960], [900, 2010], [700, 1620]] },
  { id: 'foehrensaum', name: 'Föhrensaum', d: 0.7, laub: 0.1, pts: [[560, 560], [3300, 560], [3300, 760], [2400, 700], [1700, 690], [600, 860]] },
  { id: 'ostforst', name: 'Ostforst', d: 0.75, laub: 0.4, pts: [[3560, 500], [4000, 480], [4000, 1080], [3620, 980]] },
  { id: 'lichtwald', name: 'Lichtwald', d: 0.6, laub: 1.0, pts: [[1250, 2350], [1480, 2380], [1520, 2600], [1300, 2640]] },
];
export const MOORE = [{ id: 'nebelmoor', name: 'Nebelmoor', pts: [[2760, 2360], [3350, 2300], [3560, 2660], [3300, 2880], [2800, 2840], [2650, 2600]] }];
export const HEIDEN = [{ id: 'ginsterheide', name: 'Ginsterheide', pts: [[2260, 2160], [2840, 2160], [2900, 2460], [2600, 2660], [2240, 2560]] }];

// Beschriftungen der Landschaft (Atlas-Namen). gr = Größe, rot = Drehung, z = ab/bis Zoom
export const BESCHRIFTUNG = [
  { t: 'Graukamm', x: 1520, y: 300, gr: 30, sp: 14, art: 'berg' },
  { t: 'Graukamm', x: 2900, y: 300, gr: 26, sp: 12, art: 'berg' },
  { t: 'Ostkamm', x: 3450, y: 1250, gr: 24, sp: 10, art: 'berg', rot: 1.48 },
  { t: 'Rabenhöhen', x: 1250, y: 690, gr: 15, sp: 4, art: 'berg' },
  { t: 'Weißer Pass', x: 1960, y: 410, gr: 13, art: 'pass' },
  { t: 'Kammpass', x: 3300, y: 1700, gr: 12, art: 'pass' },
  { t: 'Moderwald', x: 3030, y: 1600, gr: 24, sp: 8, art: 'wald' },
  { t: 'Grünhag', x: 1000, y: 1700, gr: 20, sp: 6, art: 'wald' },
  { t: 'Föhrensaum', x: 2650, y: 650, gr: 14, sp: 5, art: 'wald' },
  { t: 'Ostforst', x: 3800, y: 760, gr: 15, sp: 5, art: 'wald' },
  { t: 'Bleiche See', x: 150, y: 2000, gr: 30, sp: 10, art: 'meer', rot: -1.3 },
  { t: 'Bucht von Moosherz', x: 1700, y: 2950, gr: 18, sp: 6, art: 'meer' },
  { t: 'Sturmküste', x: 3200, y: 2975, gr: 16, sp: 6, art: 'meer' },
  { t: 'Spiegelsee', x: 2590, y: 1525, gr: 15, art: 'see' },
  { t: 'Unkensee', x: 1110, y: 1525, gr: 11, art: 'see' },
  { t: 'Silberlauf', x: 1900, y: 1790, gr: 13, art: 'fluss', rot: -1.1 },
  { t: 'Silberlauf', x: 2045, y: 900, gr: 12, art: 'fluss', rot: 1.35 },
  { t: 'Rabenwasser', x: 930, y: 1170, gr: 12, art: 'fluss', rot: -0.75 },
  { t: 'Eisbach', x: 3000, y: 1300, gr: 11, art: 'fluss', rot: -0.6 },
  { t: 'Mühlbach', x: 2160, y: 2030, gr: 10, art: 'fluss', rot: 0.4 },
  { t: 'Nebelmoor', x: 3100, y: 2620, gr: 22, sp: 7, art: 'moor' },
  { t: 'Ginsterheide', x: 2560, y: 2420, gr: 17, sp: 5, art: 'heide' },
  { t: 'Ostmark', x: 3780, y: 1500, gr: 26, sp: 12, art: 'land' },
  { t: 'Hügelland', x: 2300, y: 1350, gr: 14, sp: 6, art: 'land' },
  { t: 'Ewiges Eis', x: 2200, y: 70, gr: 18, sp: 14, art: 'land' },
];

export const REICHE = {
  moosherz: { name: 'Königreich Moosherz', kurz: 'Moosherz', herrscher: 'König Ottokar', farbe: '#d9a531', wappen: 'Goldener Hirsch auf Grün' },
  rabenfels: { name: 'Grafschaft Rabenfels', kurz: 'Rabenfels', herrscher: 'Graf Wulfhard der Graue', farbe: '#5b7fa8', wappen: 'Schwarzer Rabe auf Grau' },
  salzbund: { name: 'Salzbund der Küstenstädte', kurz: 'Salzbund', herrscher: 'Der Rat der Reeder', farbe: '#3a9a96', wappen: 'Weißes Schiff auf Blau' },
  ostmark: { name: 'Mark Ostmark', kurz: 'Ostmark', herrscher: 'Markgräfin Ysolde', farbe: '#b0453b', wappen: 'Rote Traube auf Gold' },
  nebelmoor: { name: 'Stämme des Nebelmoors', kurz: 'Moorstämme', herrscher: 'Die Alte vom Moor', farbe: '#7a8a3a', wappen: 'Unke im Schilf' },
  frei: { name: 'Freie Orte', kurz: 'frei', herrscher: 'niemandem untertan', farbe: '#9a8f80', wappen: '' },
};

// Orte zum Reset. art: dorf · stadt · grossstadt · burg · kloster. stil = Dachart/Bauweise.
// spezial: Dinge, die man auf der Karte sieht und die dem Ort seine Daseinsberechtigung geben.
export const ORTE = [
  { id: 'moosherz', name: 'Moosherz', art: 'grossstadt', reich: 'moosherz', x: 1720, y: 2392, haeuser: 72, mauer: 3, tuerme: 9, stil: 'ziegel', spezial: ['hof', 'markt', 'dom', 'hafen'],
    text: 'Die Königsstadt am Silberlauf. Hier sitzt König Ottokar, hier werden Gesetze gemacht und Münzen geprägt.', existenz: 'Sitz des Königs, größter Markt des Mooslands.' },
  { id: 'furtenau', name: 'Furtenau', art: 'stadt', reich: 'moosherz', x: 1995, y: 1648, haeuser: 31, mauer: 1, tuerme: 2, stil: 'stroh', spezial: ['furt', 'markt', 'fest'],
    text: 'Wo die Furt über den Silberlauf führt, rastet jeder Händler. Berühmt für das Herbstfest und laute Wettkämpfer.', existenz: 'Die einzige Furt weit und breit – wer den Fluss quert, kommt durch Furtenau.' },
  { id: 'hollerbrueck', name: 'Hollerbrück', art: 'dorf', reich: 'moosherz', x: 2295, y: 1945, haeuser: 12, mauer: 0, tuerme: 0, stil: 'stroh', spezial: ['bruecke', 'muehle'],
    text: 'Ein Dorf an der alten Steinbrücke über den Mühlbach, umgeben von Holunderhecken.', existenz: 'Die Brücke und die Mühle versorgen das ganze Hügelland mit Mehl.' },
  { id: 'butterau', name: 'Butterau', art: 'dorf', reich: 'moosherz', x: 1360, y: 2010, haeuser: 10, mauer: 0, tuerme: 0, stil: 'stroh', spezial: ['kuehe', 'kaese'],
    text: 'Grüne Weiden, schwarz-weiße Kühe, der beste Käse des Königreichs.', existenz: 'Butterau liefert Milch, Käse und Fleisch nach Moosherz. Wer Butterau angreift, hungert die Hauptstadt aus – der König schützt es.' },
  { id: 'goldacker', name: 'Goldacker', art: 'dorf', reich: 'moosherz', x: 1930, y: 2170, haeuser: 14, mauer: 0, tuerme: 0, stil: 'stroh', spezial: ['korn', 'muehle'],
    text: 'Weizenfelder bis zum Horizont, drei Windmühlen auf dem Hügel.', existenz: 'Die Kornkammer der Hauptstadt.' },
  { id: 'kalkgrube', name: 'Kalkgrube', art: 'dorf', reich: 'moosherz', x: 2620, y: 760, haeuser: 8, mauer: 0, tuerme: 1, stil: 'schiefer', spezial: ['steinbruch'],
    text: 'Ein staubiges Dorf am Steinbruch unter dem Graukamm.', existenz: 'Fast jeder Stein in Moosherz kommt aus der Kalkgrube.' },
  { id: 'ginsterhof', name: 'Ginsterhof', art: 'dorf', reich: 'moosherz', x: 2560, y: 2300, haeuser: 7, mauer: 0, tuerme: 0, stil: 'stroh', spezial: ['schafe', 'wolle'],
    text: 'Verstreute Höfe auf der Heide, Schafe zwischen gelbem Ginster.', existenz: 'Wolle für die Webstühle von Furtenau.' },
  { id: 'rabenfels', name: 'Rabenfels', art: 'burg', reich: 'rabenfels', x: 1290, y: 800, haeuser: 24, mauer: 3, tuerme: 6, stil: 'schiefer', spezial: ['burg', 'fels'],
    text: 'Eine düstere Burg auf einem Felsen über dem Rabenwasser. Sitz von Graf Wulfhard dem Grauen.', existenz: 'Seit dreihundert Jahren nie erobert – der Fels ist steiler als jede Leiter.' },
  { id: 'eisgrund', name: 'Eisgrund', art: 'stadt', reich: 'rabenfels', x: 1700, y: 660, haeuser: 21, mauer: 2, tuerme: 2, stil: 'schiefer', spezial: ['mine', 'silber'],
    text: 'Eine Bergbaustadt in den Ausläufern des Graukamms. Tag und Nacht klingen die Hämmer.', existenz: 'Silber aus Eisgrund prägt die Münzen beider Reiche – keiner kann es sich leisten, die Minen zu zerstören.' },
  { id: 'weisswacht', name: 'Weißwacht', art: 'burg', reich: 'rabenfels', x: 1955, y: 470, haeuser: 6, mauer: 3, tuerme: 3, stil: 'schiefer', spezial: ['pass', 'zoll'],
    text: 'Eine kleine Feste, die den Weißen Pass bewacht.', existenz: 'Wer über den Pass will, zahlt hier Zoll.' },
  { id: 'foehrenbach', name: 'Föhrenbach', art: 'dorf', reich: 'rabenfels', x: 880, y: 1000, haeuser: 9, mauer: 0, tuerme: 0, stil: 'holz', spezial: ['holz', 'harz'],
    text: 'Holzfäller und Harzsammler zwischen hohen Föhren.', existenz: 'Die Werften von Salzwacht brauchen Föhrenbachs Stämme.' },
  { id: 'wolfsheim', name: 'Wolfsheim', art: 'dorf', reich: 'rabenfels', x: 1520, y: 1080, haeuser: 9, mauer: 1, tuerme: 1, stil: 'holz', spezial: ['jagd', 'pelz'],
    text: 'Jäger und Fallensteller am Rand der Rabenhöhen.', existenz: 'Pelze für den Winter – die Grafschaft lebt im Frost davon.' },
  { id: 'salzwacht', name: 'Salzwacht', art: 'grossstadt', reich: 'salzbund', x: 560, y: 1590, haeuser: 60, mauer: 2, tuerme: 7, stil: 'ziegelrot', spezial: ['hafen', 'salz', 'werft', 'markt'],
    text: 'Die große Hafenstadt an der Mündung des Rabenwassers. Möwen, Teer und Salz, Schiffe aus fernen Ländern.', existenz: 'Salz, Fisch und Schiffe – ohne Salzwacht verdirbt im Winter das Fleisch des halben Landes.' },
  { id: 'moewenkap', name: 'Möwenkap', art: 'dorf', reich: 'salzbund', x: 440, y: 1150, haeuser: 9, mauer: 0, tuerme: 1, stil: 'ziegelrot', spezial: ['fischerei', 'leuchtturm'],
    text: 'Fischerhütten unter einem Leuchtturm auf dem Kap.', existenz: 'Der Leuchtturm bringt jedes Schiff sicher nach Salzwacht.' },
  { id: 'tangfurt', name: 'Tangfurt', art: 'dorf', reich: 'salzbund', x: 900, y: 2580, haeuser: 8, mauer: 0, tuerme: 0, stil: 'ziegelrot', spezial: ['fischerei', 'salzgarten'],
    text: 'Salzgärten und Tangfelder an der Südküste.', existenz: 'Die Salzgärten von Tangfurt gehören dem Salzbund – und der schützt sein Salz.' },
  { id: 'brandenstein', name: 'Brandenstein', art: 'stadt', reich: 'ostmark', x: 3720, y: 1400, haeuser: 34, mauer: 2, tuerme: 4, stil: 'ziegel', spezial: ['burg', 'wein', 'markt'],
    text: 'Die Hauptstadt der Ostmark, umgeben von Rebhängen. Sitz der Markgräfin Ysolde.', existenz: 'Die Mark hält den Kammpass – und ihr Wein ist am Königshof begehrt.' },
  { id: 'traubenhang', name: 'Traubenhang', art: 'dorf', reich: 'ostmark', x: 3760, y: 1930, haeuser: 9, mauer: 0, tuerme: 0, stil: 'ziegel', spezial: ['wein'],
    text: 'Winzerhäuser zwischen Rebstöcken in der Sonne.', existenz: 'Der beste Rote der Welt, sagen die Winzer. Niemand widerspricht laut.' },
  { id: 'kammwacht', name: 'Kammwacht', art: 'burg', reich: 'ostmark', x: 3450, y: 1660, haeuser: 5, mauer: 3, tuerme: 4, stil: 'schiefer', spezial: ['pass', 'zoll'],
    text: 'Die Grenzfeste am Kammpass zwischen Moderwald und Ostmark.', existenz: 'Der einzige Weg durch den Ostkamm.' },
  { id: 'unkenpfuhl', name: 'Unkenpfuhl', art: 'dorf', reich: 'nebelmoor', x: 3020, y: 2500, haeuser: 10, mauer: 1, tuerme: 0, stil: 'schilf', spezial: ['moor', 'stelzen', 'torf'],
    text: 'Pfahlhäuser über dem Wasser, verbunden durch Bohlenwege. Die Moorleute sind misstrauisch gegen Fremde.', existenz: 'Im Moor findet sich kein Heer zurecht. Und Torf heizt im Winter ganze Städte.' },
  { id: 'kraehenstieg', name: 'Krähenstieg', art: 'dorf', reich: 'frei', x: 3270, y: 2700, haeuser: 11, mauer: 1, tuerme: 1, stil: 'schilf', spezial: ['gilde', 'moor'],
    text: 'Ein stilles Dorf am Rand des Moors. Hier haben die Graumäntel ihr Haus – eine Gilde, über die man nur flüstert.', existenz: 'Niemand rührt Krähenstieg an. Wer es versucht, wacht nicht mehr auf – sagt man über die Graumäntel. Selbst der König zahlt lieber, als sie sich zum Feind zu machen.' },
  { id: 'moorhain', name: 'Moorhain', art: 'dorf', reich: 'nebelmoor', x: 2860, y: 2740, haeuser: 7, mauer: 0, tuerme: 0, stil: 'schilf', spezial: ['kraeuter', 'pilze'],
    text: 'Kräuterweiber und Pilzsammler auf einer Insel im Moor.', existenz: 'Heilkräuter, die nur hier wachsen – jeder Heiler im Land kauft in Moorhain.' },
  { id: 'morgenstern', name: 'Kloster Morgenstern', art: 'kloster', reich: 'frei', x: 2090, y: 2560, haeuser: 6, mauer: 1, tuerme: 1, stil: 'ziegel', spezial: ['kloster', 'heiler', 'bier'],
    text: 'Ein Kloster mit Glockenturm, Kräutergarten und Brauhaus.', existenz: 'Die Mönche heilen jeden, gleich welches Banner er trägt. Wer das Kloster angreift, verliert jeden Segen.' },
  { id: 'russgrund', name: 'Rußgrund', art: 'dorf', reich: 'frei', x: 2930, y: 1580, haeuser: 7, mauer: 0, tuerme: 0, stil: 'holz', spezial: ['kohle', 'holz'],
    text: 'Köhler im tiefen Moderwald. Rauch steigt aus den Meilern, Tag und Nacht.', existenz: 'Ohne die Holzkohle aus Rußgrund steht jede Schmiede still.' },
];

// Lage der bestehenden Spielerdörfer (nach Landschaft) und freie Plätze für neue Dörfer
export const SPIELERPLAETZE = [
  { id: 'p_hochtal', name: 'Tannhöhe', landschaft: 'hochtal', x: 2445, y: 905, belegt: true },
  { id: 'p_seeufer', name: 'Seewinkel', landschaft: 'seeufer', x: 2440, y: 1640, belegt: true },
  { id: 'p_klamm', name: 'Rotklamm', landschaft: 'klamm', x: 2245, y: 1235, belegt: true },
  { id: 'p_heide', name: 'Heidrun', landschaft: 'heide', x: 2420, y: 2470 },
  { id: 'p_urwald', name: 'Moosgrund', landschaft: 'urwald', x: 3090, y: 1170 },
  { id: 'p_fjord', name: 'Nebelfjord', landschaft: 'fjord', x: 520, y: 900 },
  { id: 'p_hochtal2', name: 'Firnhang', landschaft: 'hochtal', x: 2880, y: 780 },
  { id: 'p_seeufer2', name: 'Unkenried', landschaft: 'seeufer', x: 1200, y: 1450 },
  { id: 'p_klamm2', name: 'Wolfsschlucht', landschaft: 'klamm', x: 1620, y: 1350 },
  { id: 'p_heide2', name: 'Ginsterau', landschaft: 'heide', x: 2780, y: 2250 },
  { id: 'p_urwald2', name: 'Farnwinkel', landschaft: 'urwald', x: 1000, y: 1800 },
  { id: 'p_fjord2', name: 'Kliffhafen', landschaft: 'fjord', x: 420, y: 2150 },
];

// Beziehungen zum Start (gerichtet bei Handel/Furcht: a liefert an b bzw. a wird gefürchtet von b)
export const BEZIEHUNGEN = [
  ['butterau', 'moosherz', 'handel', 'Milch, Käse und Fleisch für die Hauptstadt'],
  ['goldacker', 'moosherz', 'handel', 'Korn'],
  ['eisgrund', 'moosherz', 'handel', 'Silber für die Münze – trotz aller Spannungen'],
  ['eisgrund', 'rabenfels', 'handel', 'Silber und Eisen'],
  ['salzwacht', 'moosherz', 'handel', 'Salz und Fisch'],
  ['salzwacht', 'furtenau', 'handel', 'Salz'],
  ['salzwacht', 'rabenfels', 'handel', 'Salz gegen Pelze'],
  ['moewenkap', 'salzwacht', 'handel', 'Fisch'],
  ['tangfurt', 'salzwacht', 'handel', 'Salz aus den Gärten'],
  ['foehrenbach', 'salzwacht', 'handel', 'Stämme für die Werft'],
  ['russgrund', 'furtenau', 'handel', 'Holzkohle für die Schmieden'],
  ['ginsterhof', 'furtenau', 'handel', 'Wolle'],
  ['traubenhang', 'brandenstein', 'handel', 'Wein'],
  ['brandenstein', 'furtenau', 'handel', 'Wein über den Kammpass'],
  ['unkenpfuhl', 'morgenstern', 'handel', 'Torf und Moorkräuter'],
  ['moorhain', 'morgenstern', 'handel', 'Heilpilze'],
  ['kalkgrube', 'moosherz', 'handel', 'Stein für Mauern und Dom'],
  ['hollerbrueck', 'furtenau', 'handel', 'Mehl'],
  ['wolfsheim', 'rabenfels', 'handel', 'Pelze'],
  ['unkenpfuhl', 'brandenstein', 'handel', 'Torf für den Winter'],
  ['moosherz', 'salzwacht', 'buendnis', 'Handelsbund seit dem Großen Winter'],
  ['brandenstein', 'salzwacht', 'buendnis', 'Wein gegen Salz, Schiffe gegen Wagen'],
  ['moosherz', 'rabenfels', 'rivalitaet', 'Streit um das Silber von Eisgrund'],
  ['rabenfels', 'salzwacht', 'rivalitaet', 'Fischrechte am Rabenwasser'],
  ['brandenstein', 'moosherz', 'rivalitaet', 'Zölle am Kammpass'],
  ['unkenpfuhl', 'ginsterhof', 'rivalitaet', 'Weidestreit am Moorrand'],
  ['kraehenstieg', 'moorhain', 'furcht', 'Man zahlt, man schweigt'],
  ['kraehenstieg', 'moosherz', 'furcht', 'Der König zahlt lieber, als sich die Graumäntel zum Feind zu machen'],
  ['kraehenstieg', 'unkenpfuhl', 'furcht', 'Alte Abmachungen im Nebel'],
];

// Wie Orte mit Quest-Orten zusammenpassen (für die Position unterwegs)
export const ORT_ZIEL = { wald: 'wald', feld: 'offen', berg: 'berg', hoehle: 'berg', stollen: 'berg', mine: 'berg', ruine: 'offen', fluss: 'wasser', feuer: 'wald', dorf: 'ort' };
