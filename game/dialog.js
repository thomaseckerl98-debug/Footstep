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


/* ───────────── Themen mit Folgefragen und Proben (BG3-Stil) ───────────── */
// Jede Folgefrage und jede Probe gibt es pro Gespräch nur einmal. Proben würfelt der Server (talk_check).
// j = Tagebucheintrag (Schlüssel, Titel, Text) – Grundlage für spätere Quests.
const RUMORS = [
  { key: 'mine', line: 'Man sagt, in den Bergen gibt es eine verlassene Mine.',
    j: ['mine', 'Die verlassene Mine', '{name} erzählt von einer verlassenen Eisenmine oben am alten Pass, hinter dem Wasserfall. Die Bergleute sollen zu tief gegraben haben.'],
    follow: [
      ['Eine Mine? Wo genau?', ['Oben am alten Pass, hinter dem Wasserfall. Früher haben sie dort Eisen geholt – lange vor meiner Zeit.', 'Irgendwo über dem Wasserfall. Von unten sieht man nur noch die alten Holzstützen.']],
      ['Warum hat man sie aufgegeben?', ['Die Alten sagen, die Bergleute hätten zu tief gegraben. Was das heißen soll, sagt keiner.', 'Ein Einsturz, heißt es. Drei Männer kamen nicht mehr heraus.']],
      ['Wer hat dir davon erzählt?', ['Ein Wanderer, letzten Herbst. Er wollte hinauf. Hier vorbeigekommen ist er danach nicht mehr.']],
    ],
    checks: [
      { id: 'menschenkenntnis', q: 'Du weißt mehr darüber, als du sagst.', ok: 'Na gut … Mein Vater hat dort gearbeitet. Er sagte, im tiefsten Stollen glänzt es nicht nach Eisen, sondern nach Silber. Hinauf wollte er nie wieder.', fail: 'Was soll ich denn wissen? Das ist nur Gerede.', j: ['mine_silber', 'Silber in der Mine?', 'Der Vater von {name} hat in der Mine gearbeitet. Im tiefsten Stollen soll es nach Silber glänzen. Er wollte nie zurück.'] },
      { id: 'altes_wissen', q: 'In alten Chroniken ist von einer Zwergenmine am Pass die Rede …', zwerg: 'Ich bin ein Zwerg. Erzähl mir vom Gestein dort oben – ich erkenne eine alte Zwergenmine.', ok: 'Ja! Die Leute nennen den Pass „Hammerkerbe“. Das passt doch. Vielleicht ist es dieselbe.', fail: 'Chroniken? Davon verstehe ich nichts.', j: ['mine_chronik', 'Die Hammerkerbe', 'Der alte Pass heißt im Volksmund „Hammerkerbe“ – vielleicht die Zwergenmine aus den alten Chroniken.'] },
      { id: 'spuren', q: 'Wenn dort oben jemand war, finde ich seine Spuren. Wo beginnt der Pfad?', ok: 'Hinter der zweiten Biegung des Bachs, wo die Steine moosig sind. Da führt ein Wildwechsel hinauf.', fail: 'Der Pfad? Den findet keiner mehr. Zugewachsen, alles.', j: ['mine_pfad', 'Der Pfad zur Mine', 'Der Weg zur Mine beginnt hinter der zweiten Bachbiegung, wo die Steine moosig sind – ein Wildwechsel führt hinauf.'] },
    ] },
  { key: 'hirsch', line: 'Angeblich lebt im Wald ein Hirsch mit silbernem Geweih.',
    j: ['hirsch', 'Der Silberhirsch', '{name} erzählt von einem Hirsch mit silbernem Geweih, der im Nebel am Waldrand erscheint und über den Wald wachen soll.'],
    follow: [
      ['Hast du ihn selbst gesehen?', ['Einmal, glaube ich. Im Nebel, am Waldrand. Dann war er weg, als hätte es ihn nie gegeben.', 'Nein. Aber der Hirte schwört, er hat ihn gesehen.']],
      ['Was bedeutet so ein Hirsch?', ['Die Alten sagen, er wacht über den Wald. Wer ihn jagt, dem bringt der Winter Unglück.']],
    ],
    checks: [
      { id: 'spuren', q: 'Wo hat man ihn zuletzt gesehen? Ich lese die Fährte.', ok: 'An der Lichtung im Osten. Abgeknickte Zweige, ganz hoch oben – so groß ist kein gewöhnlicher Hirsch.', fail: 'Fährten? Im Nebel verschwinden auch Spuren.', j: ['hirsch_faehrte', 'Fährte des Silberhirschs', 'An der Lichtung im Osten sind hoch oben Zweige abgeknickt – der Silberhirsch könnte dort entlanggezogen sein.'] },
      { id: 'altes_wissen', q: 'Silberne Hirsche kommen in alten Liedern vor – als Boten.', ok: 'Boten? … Meine Großmutter sagte, er erscheint, bevor sich etwas Großes ändert.', fail: 'Lieder. Hm. Ich kenne nur Trinklieder.', j: ['hirsch_bote', 'Ein Bote des Wandels', 'Der Silberhirsch soll erscheinen, bevor sich etwas Großes ändert.'] },
    ] },
  { key: 'feuer', line: 'Ein Wanderer hat erzählt, jenseits der Berge brennen Dörfer.',
    j: ['feuer', 'Feuer jenseits der Berge', 'Ein Wanderer berichtete {name} von brennenden Dörfern jenseits der Berge. Reiter unter schwarzem Banner sollen dahinterstecken.'],
    follow: [
      ['Wer steckt dahinter?', ['Er sprach von Reitern unter einem schwarzen Banner. Mehr wusste er nicht – oder wollte es nicht sagen.']],
      ['Sind wir hier in Gefahr?', ['Die Berge schützen uns. Noch. Aber Pässe kann man überqueren.']],
    ],
    checks: [
      { id: 'menschenkenntnis', q: 'Hat der Wanderer die Wahrheit gesagt?', ok: 'Er hatte Brandlöcher im Mantel und zitterte noch. So etwas spielt man nicht.', fail: 'Woher soll ich das wissen? Ich kann den Leuten nicht in den Kopf schauen.', j: ['feuer_echt', 'Der Wanderer log nicht', 'Der Wanderer hatte Brandlöcher im Mantel – die Geschichte von den brennenden Dörfern scheint wahr.'] },
      { id: 'beruhigen', q: 'Wir werden vorbereitet sein. Niemand brennt dieses Dorf nieder.', ok: 'Ich … glaube dir. Danke. Vielleicht schlafe ich heute Nacht etwas besser.', fail: 'Leicht gesagt. Du hast die Augen des Wanderers nicht gesehen.' },
    ] },
  { key: 'wache', line: 'Im Nachbardorf haben sie angeblich eine Wache aufgestellt. Wovor haben die Angst?',
    j: ['nachbar_wache', 'Wache im Nachbardorf', 'Das Dorf hinter dem Ostkamm hat Wachen aufgestellt. Warum, weiß niemand.'],
    follow: [
      ['Welches Nachbardorf meinst du?', ['Das hinter dem Ostkamm. Wer dort das Sagen hat, weiß ich nicht – die reden nicht viel mit uns.']],
      ['Sollten wir auch Wachen aufstellen?', ['Ein Wachturm würde mich ruhiger schlafen lassen. Und ein paar Leute, die einen Speer halten können.']],
    ],
    checks: [
      { id: 'ueberreden', q: 'Statt zu rätseln, sollten wir mit ihnen reden. Kennst du dort jemanden?', ok: 'Meine Base hat dorthin geheiratet. Wenn du willst, schicke ich ihr eine Nachricht.', fail: 'Mit denen? Lieber nicht.', j: ['nachbar_kontakt', 'Ein Kontakt hinter dem Ostkamm', '{name} hat eine Base im Dorf hinter dem Ostkamm und könnte ihr eine Nachricht schicken.'] },
    ] },
  { key: 'lichter', line: 'Nachts sieht man manchmal kleine Lichter zwischen den Bäumen.',
    j: ['lichter', 'Lichter im Wald', 'Nachts tanzen grünliche Lichter zwischen den Bäumen. Wer hinging, kam verstört zurück.'],
    follow: [
      ['Was für Lichter?', ['Kleine, grünliche. Sie tanzen, wenn man nicht hinsieht, und verschwinden, wenn man hinsieht.']],
      ['Ist jemand hingegangen?', ['Der junge Stallbursche wollte mal. Er kam zurück und hat drei Tage nicht geredet.']],
    ],
    checks: [
      { id: 'altes_wissen', q: 'Irrlichter. Sie führen Wanderer in Sümpfe – oder zu Verborgenem.', ok: 'Zu Verborgenem? … Unter der großen Eiche im Westen soll einmal ein Schrein gestanden haben.', fail: 'Irrlichter, Geister … ich will davon nichts wissen.', j: ['lichter_eiche', 'Der Schrein unter der Eiche', 'Unter der großen Eiche im Westen soll einst ein Schrein gestanden haben – vielleicht führen die Lichter dorthin.'] },
      { id: 'flink', q: 'Ich bin leise und schnell genug, um mich anzuschleichen. Wann sieht man sie?', ok: 'In nebligen Nächten, kurz vor Mitternacht, am Waldrand hinter den Feldern.', fail: 'Leise? Dich hört man doch schon von Weitem.', j: ['lichter_zeit', 'Wann die Lichter tanzen', 'Die Lichter erscheinen in nebligen Nächten kurz vor Mitternacht am Waldrand hinter den Feldern.'] },
    ] },
  { key: 'eisen', line: 'Ein Händler meinte, Eisen wird knapp im ganzen Tal.',
    j: ['eisen', 'Eisen wird knapp', 'Laut einem Händler wird Eisen im ganzen Tal knapp, weil die Minen im Süden nichts mehr liefern.'],
    follow: [
      ['Warum wird es knapp?', ['Die Minen im Süden liefern nichts mehr. Krieg oder Streit, wer weiß das schon.']],
      ['Was bedeutet das für uns?', ['Ohne Eisen keine Werkzeuge, keine Nägel, keine Waffen. Wer jetzt Eisen hat, wird reich.']],
    ],
    checks: [
      { id: 'feilschen', q: 'Wenn Eisen knapp ist, steigt der Preis. Wer verkauft noch?', ok: 'Der Händler kommt jeden Monat über die Brücke. Für Felle oder Honig würde er tauschen, sagte er.', fail: 'Keine Ahnung. Ich bin doch kein Händler.', j: ['eisen_haendler', 'Ein Eisenhändler', 'Ein Händler kommt jeden Monat über die Brücke und tauscht Eisen gegen Felle oder Honig.'] },
    ] },
];
const NEED = {
  schmiede: ['Kohle und Eisen. Immer Kohle und Eisen.'], feld: ['Eine Mühle. Und jemanden, der die Krähen verjagt.'], wald: ['Ein Sägewerk würde mir den Rücken retten.'],
  jagd: ['Gute Pfeile. Und Ruhe im Wald.'], wirt: ['Mehr Gäste. Und ein Fass, das nicht leckt.'], heil: ['Kräuter, die nur oben in den Bergen wachsen.'],
  glaube: ['Einen Ort, an dem die Leute zur Ruhe kommen.'], wache: ['Mehr Leute, die Wache stehen. Allein sehe ich nicht alles.'], wissen: ['Pergament. Und Zeit zum Lesen.'],
  handel: ['Einen Markt. Dann kommen die Händler von allein.'], vieh: ['Heu für den Winter. Viel Heu.'], handwerk: ['Besseres Werkzeug.'],
};
const WORK_CHECK = {
  schmiede: { id: 'anpacken', q: 'Ich halte das Werkstück, du schlägst.', ok: 'Ha! Gute Arme. So geht es doppelt so schnell.', fail: 'Vorsicht! … Lass lieber, bevor du dir die Finger verbrennst.' },
  feld: { id: 'anpacken', q: 'Gib mir eine Sense, ich helfe dir.', ok: 'Du kannst ja richtig zupacken! Danke.', fail: 'Äh … die Sense hält man andersherum. Aber danke für den guten Willen.' },
  wald: { id: 'anpacken', q: 'Ich helfe dir, den Stamm zu tragen.', ok: 'Hau ruck! Mit dir geht das ja wie nichts.', fail: 'Uff – lass los, lass los! Das wird nichts.' },
  jagd: { id: 'spuren', q: 'Zeig mir die Spuren, ich lese sie für dich.', ok: 'Du hast recht – der zieht zum Bach. Du hast ein gutes Auge.', fail: 'Nein, das ist eine Hasenspur. Aber danke.', alt: { id: 'flink', q: 'Ich bin schneller als jeder Fuchs. Ich fang ihn dir.', ok: 'Du hast ihn verscheucht! So schnell kam ich nicht mal mit dem Blick hinterher.', fail: 'Der Fuchs lacht heute noch über dich.' } },
  wirt: { id: 'feilschen', q: 'Was hältst du von einem Preisnachlass für den Dorfmeister?', ok: 'Für dich … na gut, das nächste Bier geht aufs Haus.', fail: 'Nachlass? Ich bin doch kein Wohltätigkeitsverein.' },
  heil: { id: 'heilkunde', q: 'Gegen Fieber hilft Weidenrinde mit Honig, oder?', ok: 'Du kennst dich aus! Endlich jemand, mit dem man fachsimpeln kann.', fail: 'Weidenrinde, ja – aber nicht so viel, sonst blutet der Magen.' },
  glaube: { id: 'altes_wissen', q: 'Ich habe gelesen, dieses Tal hieß früher anders.', ok: 'Ja, „Moosherz“! Woher weißt du das? Das wissen nur noch die Alten.', fail: 'Hm. Davon habe ich nie gehört.' },
  wissen: { id: 'altes_wissen', q: 'Ich habe gelesen, dieses Tal hieß früher anders.', ok: 'Ja, „Moosherz“! Du hast die alten Schriften gelesen? Beeindruckend.', fail: 'Wo hast du das gelesen? In meinen Büchern steht nichts davon.' },
  wache: { id: 'anpacken', q: 'Lass uns eine Runde Schwertübung machen.', ok: 'Gute Deckung! Mit dir an der Seite fühle ich mich sicherer.', fail: 'Au. Du solltest öfter üben, {du}.' },
  handel: { id: 'feilschen', q: 'Was verlangst du für deine Ware?', ok: 'Für dich mache ich einen guten Preis – aber verrat es keinem.', fail: 'Mehr, als du zahlen willst, scheint mir.' },
  vieh: { id: 'anpacken', q: 'Ich helfe dir, den Zaun zu flicken.', ok: 'Danke! Jetzt bleiben die Schafe wenigstens drin.', fail: 'Hm, der Pfosten stand vorher gerader.' },
  handwerk: { id: 'flink', q: 'Lass mich mal, ich habe geschickte Finger.', ok: 'Oh, sauber gearbeitet!', fail: 'Hm. Das mache ich wohl nochmal neu.' },
};
const SORGEN_ASK = ['Ich habe Angst, dass wir nicht genug Vorräte haben. Und keiner redet darüber.', 'Es ist … meine Familie. Ich habe lange nichts von ihnen gehört.', 'Ich fühle mich manchmal überflüssig hier.', 'Die Nächte sind so laut in letzter Zeit. Ich weiß nicht, was da draußen ist.'];
const SORGEN_CHECKS = [
  { id: 'beruhigen', q: 'Atme durch. Was auch kommt – wir stehen das zusammen durch.', ok: 'Danke, {du}. Das tut gut zu hören.', fail: 'Schöne Worte. Aber Worte füllen keine Vorratskammer.' },
  { id: 'heilkunde', q: 'Schläfst du schlecht? Ich mische dir einen Kräutertee.', ok: 'Das würdest du tun? Danke … wirklich.', fail: 'Der letzte Tee hat nach Fußlappen geschmeckt. Danke, nein.' },
];
const DORF_ASK = ['Mehr Häuser. Wenn noch Leute kommen, wird es eng.', 'Eine Mauer. Oder wenigstens einen Zaun.', 'Ein Fest! Die Leute arbeiten nur noch.', 'Einen Brunnen näher am Platz.'];
const DORF_CHECK = { id: 'ueberreden', q: 'Hilf mir, die anderen für ein neues Haus zu begeistern.', ok: 'Na gut, ich rede mit den anderen. Für dich.', fail: 'Das musst du schon selbst machen, {du}.' };
const COLD_CHECKS = [
  { id: 'einschuechtern', q: 'Pass auf, wie du mit mir redest.', ok: 'Schon gut, schon gut … Ich hab es nicht so gemeint.', fail: 'Willst du mir drohen? Lächerlich.' },
  { id: 'menschenkenntnis', q: 'Was hast du eigentlich gegen mich?', ok: 'Du … hast mich lange nicht beachtet. Das hat wehgetan.', fail: 'Nichts. Lass mich einfach.' },
];
const CHECK_GENERIC = new Set(['ueberreden', 'einschuechtern', 'menschenkenntnis', 'beruhigen', 'anpacken']);
const RACE_UNLOCK = { elf: ['spuren'], zwerg: ['altes_wissen'], halbling: ['flink'] };
const RACE_NAME = { elf: 'Elf', zwerg: 'Zwerg', halbling: 'Halbling', mensch: 'Mensch' };

export function buildTalk(ctx) {
  // ctx: { name, job, wesen, stimmung, time, weather, season, freund, gebaeude[], du, race, herkunft, attrs, CHECKS, ATTRS, HERKUNFT, odds }
  const c = { ...ctx, gebaeude: ctx.gebaeude?.length ? pick(ctx.gebaeude) : 'das Langhaus' };
  const g = GROUP_OF[ctx.job] || 'handwerk';
  const cold = ['zurückhaltend', 'misstrauisch', 'feindselig'].includes(ctx.stimmung);
  const topics = ['geruechte', 'arbeit', 'dorf', 'wetter'];
  if (ctx.freund) topics.push('freunde');
  if (cold || ctx.wesen === 'ängstlich' || Math.random() < 0.3) topics.push('sorgen');
  const usedTopics = new Set(), usedRumors = new Set();
  const asked = new Set(), checked = new Set();

  // Sichtbarkeit einer Probe: allgemeine immer, besondere nur mit passender Herkunft, Volk oder hoher Eigenschaft
  const visible = (id) => {
    const ch = ctx.CHECKS[id]; if (!ch || checked.has(id)) return null;
    const fav = ctx.herkunft === ch.fav, race = (RACE_UNLOCK[ctx.race] || []).includes(id), high = (ctx.attrs?.[ch.attr] || 0) >= 4;
    if (!CHECK_GENERIC.has(id) && !fav && !race && !high) return null;
    const tags = [ctx.ATTRS[ch.attr]];
    if (fav) tags.push(ctx.HERKUNFT[ctx.herkunft].name); else if (race) tags.push(RACE_NAME[ctx.race]);
    return { tags, odds: ctx.odds(id) };
  };
  const checkOpt = (def, extra = {}) => {
    const v = visible(def.id); if (!v) return null;
    const q = ctx.race === 'zwerg' && def.zwerg ? def.zwerg : def.q;
    return { kind: 'check', check: def.id, def, tag: v.tags.map((t) => `[${t}]`).join(' '), hint: v.odds, text: fill(q, c), ...extra };
  };

  const nextTopic = () => {
    const free = topics.filter((t) => !usedTopics.has(t) || t === 'geruechte');
    let tp = pick(free.length ? free : ['wetter']);
    if (tp === 'geruechte' && usedRumors.size >= 2) tp = pick(topics.filter((t) => t !== 'geruechte')) || 'wetter';
    usedTopics.add(tp);
    if (tp === 'geruechte') { const r = pick(RUMORS.filter((x) => !usedRumors.has(x.key))) || RUMORS[0]; usedRumors.add(r.key); return { topic: tp, text: r.line, rumor: r }; }
    const line = tp === 'arbeit' ? pick(WORK[g]) : tp === 'wetter' ? `${pick(WEATHER[ctx.weather] || WEATHER.klar)} ${pick(SEASON[ctx.season] || SEASON.sommer)}` : tp === 'dorf' ? pick(VILLAGE) : tp === 'freunde' ? pick(FRIEND) : pick(WORRY);
    return { topic: tp, text: fill(line, c) };
  };

  // Antwortmöglichkeiten zum aktuellen Thema – untereinander, so viele, wie Charakter und Thema hergeben
  const options = (cur) => {
    const out = [];
    const follow = (id, q, ans, extra = {}) => { if (!asked.has(id)) out.push({ kind: 'follow', id, text: fill(q, c), answer: fill(pick(ans), c), ...extra }); };
    if (cur.rumor) {
      cur.rumor.follow.forEach(([q, a], i) => follow(cur.rumor.key + i, q, a, { journal: i === 0 ? cur.rumor.j : null }));
      for (const def of cur.rumor.checks) { const o = checkOpt(def); if (o) out.push(o); }
    } else if (cur.topic === 'arbeit') {
      follow('need', 'Was brauchst du am dringendsten?', NEED[g]);
      const wc = WORK_CHECK[g]; for (const def of [wc, wc.alt].filter(Boolean)) { const o = checkOpt(def); if (o) out.push(o); }
    } else if (cur.topic === 'sorgen') {
      follow('sorgen', 'Was bedrückt dich wirklich?', SORGEN_ASK);
      for (const def of SORGEN_CHECKS) { const o = checkOpt(def); if (o) out.push(o); }
    } else if (cur.topic === 'dorf') {
      follow('dorf', 'Was fehlt dem Dorf deiner Meinung nach?', DORF_ASK);
      const o = checkOpt(DORF_CHECK); if (o) out.push(o);
    } else if (cur.topic === 'wetter' && (ctx.herkunft === 'waldlaeufer' || ctx.race === 'elf')) {
      const o = checkOpt({ id: 'spuren', q: 'Riechst du das? Der Wind dreht. Morgen schlägt das Wetter um.', ok: 'Tatsächlich … jetzt, wo du es sagst. Du hast feine Sinne.', fail: 'Ich rieche nur den Misthaufen.' }); if (o) out.push(o);
    }
    if (cold) for (const def of COLD_CHECKS) { const o = checkOpt(def); if (o) out.push(o); }
    // Tonfall – drei zufällige
    const tones = ['freundlich', 'loben', 'scherzen', 'helfen', 'fragen', 'kritisieren'].sort(() => Math.random() - 0.5).slice(0, 3);
    for (const t of tones) out.push({ kind: 'tone', tone: t, tag: `[${TONE_LABEL[t]}]`, text: fill(pick(OPT[t]), c) });
    out.push({ kind: 'topic', text: 'Erzähl mir etwas anderes.' });
    return out;
  };
  const markAsked = (id) => asked.add(id), markChecked = (id) => checked.add(id);
  const checkText = (def, ok) => fill(ok ? def.ok : def.fail, c);
  const journal = (j) => (j ? { key: j[0], title: j[1], text: fill(j[2], c) } : null);
  const opener = () => {
    const parts = [pick(GREET[ctx.stimmung] || GREET.freundlich)];
    if (ctx.stimmung !== 'feindselig') { if (Math.random() < 0.5) parts.push(pick(TIME[ctx.time] || TIME.mittag)); if (Math.random() < 0.45) parts.push(pick(WESEN[ctx.wesen] || WESEN.bodenständig)); }
    return fill(parts.join(' '), c);
  };
  const reaction = (react) => fill(pick((WESEN_REACT[ctx.wesen] || {})[react] || REACT[react] || REACT.neutral), c);
  const bye = (react) => fill(pick(BYE[react === 'erfreut' || react === 'freundlich' ? 'gut' : react === 'veraergert' || react === 'kuehl' ? 'schlecht' : 'mittel']), c);
  const patience = { 'treu ergeben': 10, herzlich: 9, freundlich: 7, fremd: 6, zurückhaltend: 5, misstrauisch: 4, feindselig: 2 }[ctx.stimmung] ?? 6;
  return { opener, nextTopic, options, markAsked, markChecked, checkText, journal, reaction, bye, patience: patience + (ctx.wesen === 'gesellig' ? 2 : ctx.wesen === 'wortkarg' ? -2 : 0) };
}
