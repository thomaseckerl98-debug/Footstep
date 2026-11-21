// Gespräche mit Bewohnern: Satzbaukasten. Jede Unterhaltung wird aus Beruf, Wesen, Stimmung, Tageszeit,
// Wetter, Jahreszeit, Freunden und den Gebäuden des Dorfes zusammengesetzt (viele tausend Kombinationen).
// Die Wirkung (Sympathie, Erinnerung) berechnet der Server (talk_to_npc); hier entstehen nur die Worte.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fill = (s, c) => s.replace(/\{(\w+)\}/g, (_, k) => c[k] ?? '');

const GREET = {
  'treu ergeben': ['{du}! Für dich lasse ich alles stehen und liegen.', 'Da bist du ja, {du}. Ich hab gehofft, dass du vorbeikommst.', 'Mein Dorfmeister! Was kann ich für dich tun?', 'Schön, dich zu sehen. Wirklich.'],
  herzlich: ['{du}! Komm her, setz dich einen Moment.', 'Ah, {du}. Du kommst wie gerufen.', 'Hallo {du}! Gut siehst du aus.', 'Na, wenn das nicht {du} ist!'],
  freundlich: ['Hallo {du}.', 'Ah, {du}. Was gibt\'s?', 'Grüß dich, {du}.', 'Oh, hallo. Brauchst du etwas?'],
  zurückhaltend: ['Ja? …', 'Hm. {du}.', 'Was willst du?', 'Ich hab gerade viel zu tun, {du}.'],
  misstrauisch: ['Was willst du schon wieder?', 'Du schon wieder.', 'Sag, was du willst, und dann lass mich arbeiten.', 'Hm. Ich trau dir nicht ganz, {du}.'],
  feindselig: ['Verschwinde, {du}.', 'Mit dir rede ich nicht.', 'Geh mir aus den Augen.', 'Was bildest du dir ein, mich anzusprechen?'],
  fremd: ['Seid gegrüßt, Fremder.', 'Oh – Ihr seid hier der Dorfmeister?', 'Guten Tag. Ich bin nur auf der Durchreise.', 'Hallo. Hübsches Dorf habt Ihr.'],
};
const TIME = { morgen: ['Früh auf heute?', 'Der Tau liegt noch auf dem Gras.', 'Der Morgen ist die beste Zeit.'], mittag: ['Die Sonne steht hoch.', 'Bald gibt\'s Essen.', 'Mitten am Tag, und schon so müde.'], abend: ['Langer Tag gewesen.', 'Das Abendlicht ist schön heute.', 'Gleich ist Feierabend.'], nacht: ['So spät noch unterwegs?', 'Die Sterne sind klar heute.', 'Eigentlich sollte ich längst schlafen.'] };
const WESEN = {
  gesellig: ['Erzähl doch mal, was gibt es Neues?', 'Ich rede ja gern, das weißt du.', 'Komm, plaudern wir ein bisschen.'],
  wortkarg: ['…', 'Mhm.', 'Kurz bitte.'],
  stolz: ['Ich weiß, was ich tue.', 'Mir macht keiner etwas vor.', 'Ich brauche niemanden, der mir sagt, wie es geht.'],
  ängstlich: ['Ist irgendwas passiert?', 'Ich hab heute Nacht schon wieder Geräusche gehört …', 'Hoffentlich bleibt es ruhig.'],
  geschäftstüchtig: ['Zeit ist Geld, {du}.', 'Wenn du etwas brauchst – ich mache dir einen guten Preis.', 'Hast du schon gehört, was Holz gerade wert ist?'],
  fleißig: ['Die Arbeit macht sich nicht von allein.', 'Ich bin fast fertig, dann kann ich reden.', 'Noch ein paar Handgriffe.'],
  gemütlich: ['Kein Grund zur Eile.', 'Erstmal durchatmen.', 'Die Arbeit läuft nicht weg.'],
  treu: ['Auf mich kannst du zählen.', 'Ich steh hinter dir, das weißt du.', 'Was das Dorf braucht, tue ich.'],
  bodenständig: ['Na ja, man tut, was man kann.', 'Ein Tag wie jeder andere.', 'Hauptsache, alle sind satt.'],
};
// Beruf -> Gruppe -> eigene Sätze
const JOBGROUP = {
  schmiede: ['Schmied', 'Waffenschmiedin', 'Rüstmacher', 'Schuster', 'Wagner', 'Pfeilmacher'], feld: ['Bauer', 'Bäuerin', 'Müllerin', 'Imkerin', 'Bäcker'],
  wald: ['Holzfäller', 'Köhler', 'Zimmermann', 'Steinmetz', 'Bergmann'], jagd: ['Jäger', 'Jägerin', 'Falknerin', 'Fallensteller', 'Rattenfänger'],
  wirt: ['Wirt', 'Schankmaid', 'Koch', 'Brauer', 'Barde', 'Metzger'], heil: ['Heilerin', 'Kräuterfrau', 'Alchemist', 'Seherin'],
  glaube: ['Priesterin', 'Mönch', 'Dorfälteste', 'Totengräber'], wache: ['Wache', 'Hauptmann', 'Söldnerin'],
  wissen: ['Schreiber', 'Gelehrter'], handel: ['Händler', 'Fährmann', 'Fischer', 'Wäscherin'],
  vieh: ['Hirte', 'Stallbursche'], handwerk: ['Gerberin', 'Schneiderin', 'Weberin', 'Töpfer', 'Kerzenzieherin'],
};
const GROUP_OF = {}; for (const [g, js] of Object.entries(JOBGROUP)) for (const j of js) GROUP_OF[j] = g;
const WORK = {
  schmiede: ['Die Esse frisst Kohle wie ein Drache. Ohne Köhler bin ich bald am Ende.', 'Ich hab eine neue Klinge im Feuer. Wenn sie gelingt, wird sie die beste im Tal.', 'Mein Hammer ist älter als ich – er gehörte schon meinem Großvater.', 'Wenn wir mehr Eisen hätten, könnte ich Werkzeug für alle machen.', 'Hörst du das? So klingt guter Stahl.'],
  feld: ['Der Boden ist gut dieses Jahr. Wenn das Wetter hält, wird die Ernte reich.', 'Die Krähen holen sich mehr als ihren Anteil.', 'Ein Feld mehr, und wir kämen gut durch den Winter.', 'Meine Hände sind voller Blasen, aber das Korn steht prächtig.', 'Ohne Mühle ist das ganze Korn nur halb so viel wert.'],
  wald: ['Der Wald gibt viel, aber man muss ihn respektieren.', 'Heute bin ich auf eine alte Eiche gestoßen. Die fälle ich nicht – die hat schon zu viel gesehen.', 'Das Holz ist feucht. Das gibt Rauch ohne Ende.', 'Im Wald war es heute merkwürdig still.', 'Für das nächste Haus bräuchten wir mehr Bretter.'],
  jagd: ['Ich hab frische Spuren gesehen – ein großer Hirsch.', 'Die Rehe kommen in der Dämmerung bis an den Waldrand.', 'Ein Fuchs schleicht nachts ums Dorf. Ich krieg ihn noch.', 'Wer zu viel jagt, hat bald nichts mehr zu jagen.', 'Der Wind steht gut heute.'],
  wirt: ['Gestern Abend war die Halle voll – bis der Barde falsch gesungen hat.', 'Ohne Bier keine gute Laune, so einfach ist das.', 'Ich koche heute Eintopf. Du bist eingeladen.', 'Die Leute erzählen viel, wenn der Krug voll ist.', 'Ein Gasthaus würde Reisende anlocken. Und deren Münzen.'],
  heil: ['Die Kräuter am Waldrand blühen früh dieses Jahr.', 'Halt dich warm, es gehen Erkältungen um.', 'Für meine Tränke brauche ich Wurzeln, die nur nachts zu finden sind.', 'Wunden heilen schneller, wenn man daran glaubt.', 'Der Rauch der Köhlerei verdirbt mir die Kräuter.'],
  glaube: ['Die Alten sagen, der Wald hat eine Seele.', 'Ich habe für das Dorf gebetet. Für dich auch.', 'Ein Schrein würde den Leuten Halt geben.', 'Man sollte die Toten ehren, damit die Lebenden ruhig schlafen.', 'Früher war hier nur Wildnis. Vergiss das nie.'],
  wache: ['Ruhig heute. Zu ruhig vielleicht.', 'Vom Turm aus sehe ich bis zu den Bergen.', 'Wenn Fremde kommen, will ich es zuerst wissen.', 'Wir bräuchten mehr Leute für die Wache.', 'Mein Speer ist scharf, meine Augen auch.'],
  wissen: ['Ich schreibe alles auf, was im Dorf geschieht. Auch das über dich.', 'In den alten Schriften steht etwas über diese Berge …', 'Wissen ist mehr wert als Gold. Meistens.', 'Ich bräuchte mehr Pergament.', 'Hast du schon einmal von den Ruinen jenseits des Passes gehört?'],
  handel: ['Die Preise steigen. Alle wollen Holz.', 'Wenn wir einen Markt hätten, kämen Händler aus dem ganzen Tal.', 'Ich habe etwas, das dich interessieren könnte …', 'Am Fluss ist es ruhig heute.', 'Wer verkaufen will, muss reden können.'],
  vieh: ['Die Schafe sind unruhig – vielleicht wittern sie Wölfe.', 'Ein Lamm ist heute Nacht geboren. Alles gut gegangen.', 'Ohne Heu kommen die Tiere nicht durch den Winter.', 'Tiere spüren, wenn das Wetter umschlägt.', 'Der Stall müsste mal ausgebessert werden.'],
  handwerk: ['Ich arbeite gerade an etwas Feinem. Fertig wird es aber erst nächste Woche.', 'Gutes Material ist alles.', 'Die Leute wissen gar nicht, wie viel Arbeit in einem Krug steckt.', 'Mit besserem Werkzeug ginge es schneller.', 'Farbe, Form, Gefühl – darauf kommt es an.'],
};
const WEATHER = {
  klar: ['Herrliches Wetter heute.', 'Kein Wölkchen am Himmel.', 'So ein Tag macht die Arbeit leichter.'],
  wolkig: ['Die Wolken hängen tief.', 'Sieht nach Regen aus, oder?', 'Grau heute, aber wenigstens trocken.'],
  regen: ['Dieser Regen hört gar nicht mehr auf.', 'Gut für die Felder, schlecht für meine Laune.', 'Ich bin bis auf die Knochen nass.'],
  nebel: ['Man sieht kaum die Hand vor Augen.', 'Der Nebel kriecht aus dem Wald.', 'Bei Nebel erzählen die Alten Geistergeschichten.'],
  schnee: ['Der Schnee knirscht so schön.', 'Hoffentlich reicht das Brennholz.', 'Die Kinder würden jetzt Schneeburgen bauen.'],
};
const SEASON = { fruehling: ['Der Frühling riecht nach Neuanfang.', 'Überall blüht es.'], sommer: ['Lange Tage, kurze Nächte.', 'Im Sommer ist das Leben leichter.'], herbst: ['Die Blätter färben sich schon.', 'Bald ist Erntezeit.'], winter: ['Der Winter ist lang hier oben.', 'Die Vorräte müssen reichen.'] };
const VILLAGE = ['Seit {gebaeude} steht, ist hier mehr los.', 'Ich bin froh über {gebaeude}. Das hat uns gefehlt.', 'Das Dorf wächst. Manchmal erkenne ich es kaum wieder.', 'Wir bräuchten mehr Wohnraum, wenn noch Leute kommen.', 'Ich finde, {gebaeude} steht an einer seltsamen Stelle.', 'Die Leute reden über {gebaeude}.'];
const FRIEND = ['{freund} und ich haben gestern lange geredet.', 'Hast du {freund} heute schon gesehen?', '{freund} hat mir geholfen, als es mir schlecht ging.', 'Ohne {freund} wäre ich längst weitergezogen.', '{freund} ist der einzige, der mich versteht.'];
const WORRY = ['Ich weiß nicht, ob wir den Winter schaffen.', 'Ich schlafe schlecht in letzter Zeit.', 'Manchmal frage ich mich, ob es woanders besser wäre.', 'Es wird viel geredet im Dorf. Nicht alles ist gut.', 'Ich habe das Gefühl, keiner sieht, was ich hier leiste.'];
const RUMOR = ['Ein Wanderer hat erzählt, jenseits der Berge brennen Dörfer.', 'Angeblich lebt im Wald ein Hirsch mit silbernem Geweih.', 'Man sagt, in den Bergen gibt es eine verlassene Mine.', 'Im Nachbardorf haben sie angeblich eine Wache aufgestellt. Wovor haben die Angst?', 'Nachts sieht man manchmal kleine Lichter zwischen den Bäumen.', 'Ein Händler meinte, Eisen wird knapp im ganzen Tal.'];

const OPT = {
  freundlich: ['Schön, dich zu sehen, {name}.', 'Wie geht es dir, {name}?', 'Ich wollte nur mal Hallo sagen.', 'Lass dich nicht stören – ich freu mich, dass du hier bist.'],
  loben: ['Du machst das wirklich gut, {name}.', 'Ohne dich wäre das Dorf ärmer.', 'Ich sehe, wie viel du arbeitest. Danke.', 'Das ist gute Arbeit.'],
  scherzen: ['Na, heute schon was Vernünftiges gemacht? Ich auch nicht.', 'Wenn das so weitergeht, mache ich dich zum Dorfmeister.', 'Pass auf, sonst holen dich die Waldgeister!', 'Hast du heute in einen Eimer Essig gebissen?'],
  helfen: ['Kann ich dir zur Hand gehen?', 'Brauchst du etwas? Sag es einfach.', 'Lass mich mit anpacken.', 'Wenn dich etwas bedrückt, kannst du es mir sagen.'],
  fragen: ['Was gibt es Neues im Dorf?', 'Erzähl mal, wie läuft deine Arbeit?', 'Was denkst du über unser Dorf?', 'Woher kommst du eigentlich, {name}?'],
  kritisieren: ['Du könntest dich mehr anstrengen.', 'Das geht auch schneller, oder?', 'Ich erwarte mehr von dir.', 'So wird das nichts.'],
};
const TONE_LABEL = { freundlich: 'Freundlich', loben: 'Loben', scherzen: 'Scherzen', helfen: 'Hilfe anbieten', fragen: 'Nachfragen', kritisieren: 'Kritisieren' };
const REACT = {
  erfreut: ['Das bedeutet mir viel, {du}.', 'Ha! Du weißt, wie man jemandem den Tag rettet.', 'Danke, {du}. Wirklich.', 'Wenn alle so wären wie du …'],
  freundlich: ['Das ist nett von dir.', 'Danke. Ja, wirklich.', 'Freut mich, dass du das sagst.', 'Gut zu wissen.'],
  neutral: ['Hm. Na gut.', 'Wenn du meinst.', 'Aha.', 'Ich werd\'s mir merken.'],
  kuehl: ['Hm. Darüber reden wir ein andermal.', 'Das hättest du dir sparen können.', 'Ich weiß nicht, was ich dazu sagen soll.', 'Na, danke auch.'],
  veraergert: ['Wie bitte?! Das sagst ausgerechnet du?', 'Lass mich in Ruhe, {du}.', 'Das merk ich mir.', 'So redest du nicht mit mir.'],
  kurz: ['Wir haben doch gerade erst geredet.', 'Schon gut, {du}. Ich muss weitermachen.', 'Ja, ja. Später.', 'Du schon wieder? Lass mich kurz durchatmen.'],
};
const WESEN_REACT = { wortkarg: { erfreut: ['Hm. Danke.'], freundlich: ['Mhm.'], neutral: ['…'] }, stolz: { freundlich: ['Natürlich.'], erfreut: ['Ich weiß.'] }, ängstlich: { kuehl: ['Bitte nicht so streng …'], veraergert: ['Warum bist du so zu mir?'] }, gesellig: { erfreut: ['Ha, du bist mir einer! Komm heute Abend vorbei!'] } };
const BYE = { gut: ['Bis später, {du}!', 'Pass auf dich auf.', 'Komm bald wieder vorbei.'], mittel: ['Ja. Bis dann.', 'Ich muss weiter.', 'Gut.'], schlecht: ['Geh einfach.', 'Endlich.', '…'] };

export function buildTalk(ctx) {
  // ctx: { name, job, wesen, stimmung, time, weather, season, freund, gebaeude[], du }
  const c = { ...ctx, gebaeude: ctx.gebaeude?.length ? pick(ctx.gebaeude) : 'das Langhaus' };
  const topics = ['arbeit', 'arbeit', 'wetter', 'dorf', 'geruechte'];
  if (ctx.freund) topics.push('freunde');
  if (['zurückhaltend', 'misstrauisch', 'feindselig'].includes(ctx.stimmung) || Math.random() < 0.15) topics.push('sorgen');
  const used = new Set();
  const topicLine = () => {
    let tp = pick(topics.filter((t) => !used.has(t))) || 'wetter'; used.add(tp);
    const g = GROUP_OF[ctx.job] || 'handwerk';
    const line = tp === 'arbeit' ? pick(WORK[g]) : tp === 'wetter' ? `${pick(WEATHER[ctx.weather] || WEATHER.klar)} ${pick(SEASON[ctx.season] || SEASON.sommer)}` : tp === 'dorf' ? pick(VILLAGE) : tp === 'freunde' ? pick(FRIEND) : tp === 'sorgen' ? pick(WORRY) : pick(RUMOR);
    return { topic: tp, text: fill(line, c) };
  };
  const opener = () => {
    const parts = [pick(GREET[ctx.stimmung] || GREET.freundlich)];
    if (!['feindselig'].includes(ctx.stimmung)) { if (Math.random() < 0.5) parts.push(pick(TIME[ctx.time] || TIME.mittag)); if (Math.random() < 0.45) parts.push(pick(WESEN[ctx.wesen] || WESEN.bodenständig)); }
    return fill(parts.join(' '), c);
  };
  const options = () => {
    const tones = ['freundlich', 'loben', 'scherzen', 'helfen', 'fragen', 'kritisieren'].sort(() => Math.random() - 0.5).slice(0, 4);
    if (!tones.includes('freundlich') && !tones.includes('fragen')) tones[0] = 'fragen';
    return tones.map((t) => ({ tone: t, label: TONE_LABEL[t], text: fill(pick(OPT[t]), c) }));
  };
  const reaction = (react) => fill(pick((WESEN_REACT[ctx.wesen] || {})[react] || REACT[react] || REACT.neutral), c);
  const bye = (react) => fill(pick(BYE[react === 'erfreut' || react === 'freundlich' ? 'gut' : react === 'veraergert' || react === 'kuehl' ? 'schlecht' : 'mittel']), c);
  return { opener, topicLine, options, reaction, bye };
}
