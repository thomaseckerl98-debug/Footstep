import fs from 'fs';
const npcs = JSON.parse(fs.readFileSync('npcs.json'));
let seed = 1; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ORTE = ['aus einem Fischerdorf an der Küste, drei Wochen Fußmarsch von hier', 'aus dem Tal jenseits des Ostkamms', 'aus einer Stadt im Süden, die ich nie wiedersehen will', 'von einem Hof oben am Pass', 'aus den Sümpfen im Westen', 'aus einem Kloster – ich bin dort als Waise aufgewachsen', 'aus einer Familie von Wanderhändlern, wir waren nie lange an einem Ort', 'von hier, aus dem Tal – meine Familie lebt seit Generationen hier', 'aus einem Bergdorf im Norden, das es heute nicht mehr gibt', 'aus der Flussniederung, wo jeden Frühling das Wasser kommt'];
const EREIGNIS = ['Als das Hochwasser kam, haben wir alles verloren.', 'Mein Vater hat mir das Handwerk beigebracht, kurz bevor er starb.', 'Mit sechzehn bin ich davongelaufen und nie zurückgekehrt.', 'Nach einem Streit mit meinem Bruder musste ich gehen.', 'Ich habe lange als Tagelöhner geschuftet, bis ich hier Ruhe fand.', 'Ein Wanderprediger hat mir gesagt, hier würde ich gebraucht.', 'Ich kam wegen der Liebe. Die ist fort – geblieben bin ich wegen des Tals.', 'Den harten Winter vor zehn Jahren haben nur wenige überstanden. Ich war einer davon.', 'Ich habe als Kind einen Brand überlebt. Seitdem fange ich lieber neu an, als zurückzuschauen.', 'Ich war Soldat, bevor ich das hier gelernt habe. Darüber rede ich nicht gern.'];
const ZIEL = {
  gier: ['Ich will genug Silber sparen, um mir ein Haus aus Stein zu bauen.', 'Eines Tages will ich einen eigenen Stand auf einem großen Markt haben.', 'Ich will so viel besitzen, dass ich nie wieder hungern muss.'],
  treue: ['Ich will, dass dieses Dorf nie wieder leer steht. Dafür würde ich viel tun.', 'Ich will meine Schwester finden. Sie ist im Krieg jenseits der Berge verschwunden.', 'Ich will, dass meine Kinder es einmal besser haben als ich.'],
  mut: ['Ich will einmal über die Berge ziehen und sehen, was dahinter liegt.', 'Ich will die verlassene Mine mit eigenen Augen sehen.', 'Ich will etwas tun, über das man noch in hundert Jahren redet.'],
  geselligkeit: ['Ich träume davon, einmal ein Fest für das ganze Tal auszurichten.', 'Ich möchte jemanden finden, mit dem ich alt werden kann.'],
  fleiss: ['Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Ich will etwas schaffen, das mich überdauert.'],
  sonst: ['Ich will einfach in Ruhe leben und meinen Frieden haben.', 'Ich möchte lesen lernen. Heimlich übe ich schon.'],
};
const ANGST_FEIGE = ['Die Dunkelheit im Wald. Seit ich ein Kind war, gehe ich nachts nicht hinein.', 'Die Reiter mit dem schwarzen Banner. Ich träume von ihnen.', 'Feuer. Ich habe gesehen, was es anrichtet.', 'Dass man mich auslacht, wenn ich etwas falsch mache.'];
const ANGST = ['Allein zu sein, wenn ich alt bin.', 'Dass ich versage, wenn es wirklich darauf ankommt.', 'Krankheit. Ich habe zu viele daran sterben sehen.', 'Dass man mich vergisst, wenn ich nicht mehr bin.', 'Dass das Dorf zerfällt, wenn sich keiner kümmert.'];
const GEHEIM = ['Ich habe einmal Geld aus der Dorfkasse genommen, als es mir schlecht ging. Zurückgezahlt habe ich es nie.', 'Ich kann gar nicht richtig lesen. Ich tue nur so.', 'Mein richtiger Name ist ein anderer. Ich habe ihn abgelegt, als ich hierher kam.', 'Ich besuche heimlich jemanden im Dorf hinter dem Ostkamm.', 'Als junger Mensch habe ich gestohlen, um zu überleben.', 'Ich trage einen Brief meiner Mutter bei mir, den ich nie geöffnet habe.', 'Ich habe auf den Silberhirsch geschossen. Seitdem verfolgt mich das Pech.', 'Ich besitze ein Stück einer alten Karte. Ich zeige es niemandem.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'Ich habe einmal jemanden im Stich gelassen, der mich gebraucht hätte.'];
const EIGEN = ['summt beim Arbeiten alte Lieder', 'kaut ständig auf einem Grashalm', 'sammelt glatte Flusskiesel', 'redet bei der Arbeit mit dem Werkzeug', 'erzählt gern dieselben Geschichten', 'spricht nie über die Vergangenheit', 'glaubt fest an Vorzeichen', 'lacht laut und ansteckend', 'schnitzt in jeder Pause kleine Figuren', 'misstraut allem, was neu ist', 'flucht leise vor sich hin', 'riecht immer ein wenig nach Rauch'];
const GROUP = { mine: ['Bergmann', 'Steinmetz', 'Schmied', 'Waffenschmiedin', 'Rüstmacher', 'Händler', 'Köhler'], wild: ['Jäger', 'Jägerin', 'Falknerin', 'Hirte', 'Rattenfänger', 'Holzfäller', 'Imkerin'], krieg: ['Wache', 'Hauptmann', 'Söldnerin', 'Fährmann', 'Wagner', 'Pfeilmacher'], alt: ['Priesterin', 'Mönch', 'Seherin', 'Dorfälteste', 'Gelehrter', 'Schreiber', 'Alchemist', 'Kräuterfrau', 'Heilerin', 'Totengräber'], schank: ['Wirt', 'Schankmaid', 'Barde', 'Brauer', 'Koch'] };
const PREF = { mine: ['mine', 'eisen'], wild: ['hirsch', 'lichter'], krieg: ['feuer', 'wache'], alt: ['lichter', 'hirsch', 'mine'], schank: ['feuer', 'wache', 'eisen', 'mine', 'hirsch'] };
const DEEP = { mine: ['mine_silber', 'mine_chronik', 'mine_pfad'], hirsch: ['hirsch_faehrte', 'hirsch_bote'], feuer: ['feuer_echt'], wache: ['nachbar_kontakt'], lichter: ['lichter_eiche', 'lichter_zeit'], eisen: ['eisen_haendler'] };
const ALL = Object.keys(DEEP);
const groupOf = (j) => Object.entries(GROUP).find(([, js]) => js.includes(j))?.[0];
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const rows = [];
for (const n of npcs) {
  seed = n.id * 7919 + 17; const t = n.t;
  const top = Object.entries({ gier: t.gier, treue: t.treue, mut: t.mut, geselligkeit: t.geselligkeit, fleiss: t.fleiss }).sort((a, b) => b[1] - a[1])[0];
  const ziel = (top[1] >= 60 ? pick(ZIEL[top[0]]) : pick(ZIEL.sonst)).replace('{job}', n.j);
  const angst = t.mut < 35 ? pick(ANGST_FEIGE) : pick(ANGST);
  const st = [], sw = [];
  if (t.fleiss >= 70) st.push('unermüdlich bei der Arbeit'); if (t.treue >= 70) st.push('treu, hält Wort'); if (t.mut >= 75) st.push('mutig, packt zu, wenn andere zögern'); if (t.geselligkeit >= 75) st.push('bringt Leute zusammen und zum Lachen'); if (t.gier <= 25) st.push('großzügig');
  if (t.fleiss <= 25) sw.push('bequem, schiebt Arbeit gern auf'); if (t.gier >= 75) sw.push('denkt zuerst an den eigenen Vorteil'); if (t.treue <= 25) sw.push('wechselt schnell die Seiten, wenn es sich lohnt'); if (t.mut <= 25) sw.push('ängstlich, meidet Streit'); if (t.geselligkeit <= 20) sw.push('verschlossen, vertraut kaum jemandem'); if (t.mut >= 80 && t.geselligkeit <= 40) sw.push('stur und stolz');
  if (!st.length) st.push('verlässlich im Handwerk'); if (!sw.length) sw.push('nachtragend, wenn man gekränkt hat');
  // Sturheit: positiv = schwerer zu überreden
  const stur = Math.max(-3, Math.min(3, Math.round((t.mut - 50) / 25 - (t.geselligkeit - 50) / 30 + (t.treue >= 80 ? 1 : 0))));
  const g = groupOf(n.j); let base = g ? PREF[g].filter(() => rnd() < 0.75) : []; if (!base.length) base = [pick(ALL)];
  if (g === 'schank') base = PREF.schank.filter(() => rnd() < 0.6); if (!base.length) base = [pick(ALL)];
  if (n.n === 'Ulf' && !base.includes('mine')) base.push('mine');
  const deep = []; for (const k of base) for (const d of DEEP[k]) if (rnd() < (g && PREF[g][0] === k ? 0.6 : 0.3)) deep.push(d);
  if (n.n === 'Kunz') deep.push('mine_silber', 'mine_pfad');
  const wissen = [...new Set([...base, ...deep])];
  const herkunft = `Ich komme ${pick(ORTE)}. ${pick(EREIGNIS)}`;
  rows.push(`(${n.id}, ${q(herkunft)}, ${q(ziel)}, ${q(angst)}, ${q(pick(GEHEIM))}, ${q(st.join(', '))}, ${q(sw.join(', '))}, ${q(pick(EIGEN))}, ${stur}, array[${wissen.map(q).join(',')}]::text[])`);
}
fs.writeFileSync('profiles.sql', 'insert into public.npc_profiles (npc_id, herkunft, ziel, angst, geheimnis, staerken, schwaechen, eigenart, sturheit, wissen) values\n' + rows.join(',\n') + '\non conflict (npc_id) do update set herkunft = excluded.herkunft, ziel = excluded.ziel, angst = excluded.angst, geheimnis = excluded.geheimnis, staerken = excluded.staerken, schwaechen = excluded.schwaechen, eigenart = excluded.eigenart, sturheit = excluded.sturheit, wissen = excluded.wissen;\n');
console.log(rows.slice(4, 9).join('\n'));
