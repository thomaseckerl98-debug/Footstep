// Gespräche mit Bewohnern: Satzbaukasten. Jede Unterhaltung wird aus Beruf, Wesen, Stimmung, Tageszeit,
// Wetter, Jahreszeit, Freunden und den Gebäuden des Dorfes zusammengesetzt (viele tausend Kombinationen).
// Die Wirkung (Sympathie, Erinnerung) berechnet der Server (talk_to_npc); hier entstehen nur die Worte.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fill = (s, c) => s.replace(/\{(\w+)\}/g, (_, k) => c[k] ?? '');

const GREET = {
  'treu ergeben': ['{du}! Für dich lasse ich alles stehen und liegen.', 'Da bist du ja, {du}. Ich hab gehofft, dass du vorbeikommst.', 'Komm her, setz dich zu mir. Was gibt es?', 'Schön, dich zu sehen. Wirklich.'],
  herzlich: ['{du}! Komm her, setz dich einen Moment.', 'Ah, {du}. Du kommst wie gerufen.', 'Hallo {du}! Gut siehst du aus.', 'Na, wenn das nicht {du} ist!'],
  freundlich: ['Hallo {du}.', 'Ah, {du}. Was gibt\'s?', 'Grüß dich, {du}.', 'Oh, hallo. Brauchst du etwas?'],
  zurückhaltend: ['Ja? …', 'Hm. {du}.', 'Was willst du?', 'Ich hab gerade viel zu tun, {du}.'],
  misstrauisch: ['Was willst du schon wieder?', 'Du schon wieder.', 'Sag, was du willst, und dann lass mich arbeiten.', 'Hm. Ich trau dir nicht ganz, {du}.'],
  feindselig: ['Verschwinde, {du}.', 'Mit dir rede ich nicht.', 'Geh mir aus den Augen.', 'Was bildest du dir ein, mich anzusprechen?'],
  fremd: ['Seid gegrüßt, Fremder.', 'Oh – Ihr seid neu im Dorf, oder?', 'Guten Tag. Ich bin nur auf der Durchreise.', 'Hallo. Hübsches Dorf habt Ihr.'],
};
const TIME = { morgen: ['Früh auf heute?', 'Der Tau liegt noch auf dem Gras.', 'Der Morgen ist die beste Zeit.'], mittag: ['Die Sonne steht hoch.', 'Bald gibt\'s Essen.', 'Mitten am Tag, und ich bin schon so müde.'], abend: ['Langer Tag gewesen.', 'Das Abendlicht ist schön heute.', 'Gleich ist Feierabend.'], nacht: ['So spät noch unterwegs?', 'Die Sterne sind klar heute.', 'Eigentlich sollte ich längst schlafen.'] };
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
  wissen: ['Schreiber', 'Gelehrter'], handel: ['Händler'], wasser: ['Fährmann', 'Fischer', 'Wäscherin'],
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
  wasser: ['Das Bachwasser ist eiskalt heute. Meine Hände spüre ich kaum noch.', 'Am Wasser hört man alles – die Leute reden gern, wenn sie herkommen.', 'Der Bach führt heute viel Wasser. Da muss man aufpassen.', 'Ein Steg am Bach würde mir die Arbeit leichter machen.', 'Seife aus Asche und Fett. Nicht schön, aber es wirkt.'],
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
const VILLAGE = ['Seit {gebaeude} steht, ist hier mehr los.', 'Ich bin froh über {gebaeude_akk}. Das hat uns gefehlt.', 'Das Dorf wächst. Manchmal erkenne ich es kaum wieder.', 'Wir bräuchten mehr Wohnraum, wenn noch Leute kommen.', 'Ich finde, {gebaeude} steht an einer seltsamen Stelle.', 'Die Leute reden viel über {gebaeude_akk}.'];
const FRIEND = ['{freund} und ich haben gestern lange geredet.', '{freund} und ich kennen uns schon ewig.', '{freund} hat mir geholfen, als es mir schlecht ging.', 'Ohne {freund} wäre ich längst weitergezogen.', '{freund} ist der einzige, der mich versteht.'];
// Gesprächsfäden: jede Frage (Knoten) hat Antworten; „nach“ schaltet tiefere Fragen frei. So entsteht ein Gespräch mit Tiefe.
const N = (id, q, a, nach = [], extra = {}) => ({ id, q, a: Array.isArray(a) ? a : [a], nach, ...extra });
const WORRY = [
  { line: 'Ich weiß nicht, ob wir den Winter schaffen.', tree: [
    N('s_w1', 'Was fehlt uns denn?', ['Holz, Vorräte, ein dichtes Dach über jedem Kopf. Such dir was aus.', 'Vorräte vor allem. Wenn der Schnee früh kommt, wird es eng.'], ['s_w2', 's_w3']),
    N('s_w2', 'Was würdest du an meiner Stelle tun?', ['Einen Vorratsspeicher bauen. Und jeden Sack zählen, bevor der Frost kommt.', 'Mit den Nachbarn reden. Allein kommt hier keiner durch einen harten Winter.'], []),
    N('s_w3', 'War es schon mal so knapp?', ['Vor drei Wintern. Wir haben Rinde gekocht. Das will ich nie wieder.', 'Einmal. Da sind zwei Familien gegangen und nie zurückgekommen.'], ['s_w4']),
    N('s_w4', 'Wer ist damals gegangen?', ['Leute, die heute in Furtenau wohnen sollen. Ob es ihnen besser geht, weiß keiner.'], []),
  ] },
  { line: 'Ich schlafe schlecht in letzter Zeit.', tree: [
    N('s_s1', 'Woran liegt das?', ['Träume. Und Geräusche nachts, die ich mir nicht erklären kann.', 'Zu viele Gedanken. Und das Knacken im Gebälk.'], ['s_s2']),
    N('s_s2', 'Was für Geräusche?', ['Schritte am Waldrand. Wenn ich nachsehe, ist niemand da.', 'Ein Pfeifen, ganz leise, wie ein Signal. Vielleicht bilde ich es mir ein.'], ['s_s3']),
    N('s_s3', 'Hast du es jemandem erzählt?', ['Nein. Die halten mich sonst für verrückt. Du bist der Erste.', 'Der Wache. Die hat nur gelacht.'], []),
  ] },
  { line: 'Manchmal frage ich mich, ob es woanders besser wäre.', tree: [
    N('s_g1', 'Denkst du daran zu gehen?', ['Manchmal. Wenn der Tag lang war und keiner danke sagt.', 'Nicht wirklich. Aber der Gedanke kommt immer wieder.'], ['s_g2', 's_g3']),
    N('s_g2', 'Wohin würdest du gehen?', ['Nach Salzwacht, ans Meer. Ich habe das Meer noch nie gesehen.', 'Über die Berge. Einfach, um zu wissen, was dahinter liegt.'], []),
    N('s_g3', 'Was hält dich hier?', ['Die Leute. Ein paar zumindest.', 'Ehrlich? Dass ich nicht weiß, ob es woanders wirklich besser ist.'], []),
  ], check: { id: 'ueberreden', q: 'Bleib. Hier wirst du gebraucht – mehr, als du denkst.', ok: 'Meinst du das ernst? … Dann bleibe ich. Fürs Erste.', fail: 'Gebraucht? Das sagen alle, bis man weg ist.' } },
  { line: 'Es wird viel geredet im Dorf. Nicht alles ist gut.', tree: [
    N('s_r1', 'Was wird denn geredet?', ['Über dich, ehrlich gesagt. Manche fragen sich, ob du weißt, was du tust.', 'Dass nicht alle hier ihren Teil beitragen. Namen nennt natürlich keiner laut.', 'Dass es Streit um Land und Vorräte geben wird, wenn das Dorf weiter wächst.'], ['s_r2', 's_r3']),
    N('s_r2', 'Wer sagt so etwas?', ['{rivale_satz}'], ['s_r4']),
    N('s_r3', 'Und was denkst du selbst?', ['Ich denke, Gerede ist billig. Taten zählen.', 'Ich warte ab. Noch hast du mich nicht enttäuscht.'], []),
    N('s_r4', 'Soll ich mit dieser Person reden?', ['Wenn du es tust, dann ohne meinen Namen. Bitte.', 'Lieber nicht sofort. Lass es erst ruhen.'], []),
  ], check: { id: 'menschenkenntnis', q: 'Du redest nicht nur von den anderen, oder?', ok: 'Nein … ich habe selbst Zweifel. Nicht an dir. An allem hier.', fail: 'Was willst du damit sagen?' } },
  { line: 'Ich habe das Gefühl, keiner sieht, was ich hier leiste.', tree: [
    N('s_l1', 'Was machst du alles, was keiner sieht?', ['Früh aufstehen, bevor alle anderen. Dinge reparieren, die keiner kaputt gesehen hat.', 'Ich springe ein, wo jemand fehlt. Jeden Tag.'], ['s_l2']),
    N('s_l2', 'Was würdest du dir wünschen?', ['Einmal gefragt werden statt nur gerufen.', 'Ein Danke. Mehr nicht.'], []),
  ] },
];
const RIVALE_SATZ = { mit: ['{rivale} vor allem. Aber das hast du nicht von mir.', 'Frag {rivale}. Die Zunge sitzt da locker.'], ohne: ['Ich nenne keine Namen. Das macht nur Ärger.', 'Mal der eine, mal die andere. Wie das so ist.'] };
const WORK_TREE = (g) => [
  N('w_need', 'Was brauchst du am dringendsten?', NEED[g], ['w_need2']),
  N('w_need2', 'Und wenn du es hättest – was würde sich ändern?', ['Ich könnte mehr schaffen. Und vielleicht mal einen Abend frei nehmen.', 'Dann müsste ich nicht jeden Tag improvisieren. Das zehrt.', 'Dann könnte ich endlich etwas machen, worauf ich wirklich stolz bin.'], ['w_proud']),
  N('w_proud', 'Worauf bist du bei deiner Arbeit am meisten stolz?', ['Auf das erste Stück, das wirklich gut war. Ich hab es heute noch.', 'Dass sich die Leute auf mich verlassen können. Das ist mehr wert als jedes Lob.', 'Auf meine Hände. Sie haben mehr gelernt als mein Kopf.'], []),
  N('w_how', 'Wie bist du zu deinem Handwerk gekommen?', TOPIC_ANSWER.arbeit.fragen, ['w_teach']),
  N('w_teach', 'Würdest du es jemandem beibringen?', ['Wenn jemand Geduld hat – gern. Die meisten wollen nur schnell fertig werden.', 'Vielleicht. Aber erst muss ich jemanden finden, dem ich mein Werkzeug anvertraue.'], []),
  N('w_hard', 'Was ist das Schwerste daran?', ['Die Tage, an denen nichts gelingt. Und davon gibt es mehr, als man denkt.', 'Der Winter. Kalte Finger machen schlechte Arbeit.', 'Dass keiner sieht, wie viel Arbeit drinsteckt.'], []),
];
// Berufsfäden: jede Berufsgruppe hat eigene Fragen, die tiefer gehen (↳)
const JOB_TREE = {
  schmiede: [
    N('j_s1', 'Was schmiedest du am liebsten?', ['Pflugscharen. Klingt langweilig, aber ohne sie hungert das Dorf.', 'Messer. Ein gutes Messer begleitet einen Menschen ein Leben lang.'], ['j_s2']),
    N('j_s2', 'Woran erkennst du guten Stahl?', ['Am Klang. Guter Stahl singt, schlechter scheppert.', 'An den Funken. Kurz und hell – dann taugt er.'], ['j_s3']),
    N('j_s3', 'Gab es je ein Stück, das du bereust?', ['Einmal. Eine Klinge für einen Mann, der sie gegen seinen Bruder erhob. Seitdem frage ich, wofür.', 'Noch nicht. Aber ich fürchte den Tag.'], []),
    N('j_s4', 'Was braucht die Esse, um richtig zu brennen?', ['Holzkohle. Mit nassem Holz frisst sie das Doppelte und wird trotzdem nicht heiß genug.', 'Kohle und Geduld. Und einen Blasebalg, der nicht pfeift.'], []),
  ],
  feld: [
    N('j_f1', 'Was baust du an?', ['Roggen vor allem, der verträgt die Kälte hier oben. Dazu Rüben und Kohl.', 'Gerste und Roggen. Hafer, wenn Platz ist.'], ['j_f2']),
    N('j_f2', 'Was ist das Schwerste daran?', ['Das Warten. Man sät und kann dann nur noch hoffen.', 'Der Hagel. Eine Stunde, und ein Jahr Arbeit liegt im Dreck.'], ['j_f3']),
    N('j_f3', 'Und wenn eine Ernte ausfällt?', ['Dann tauschen wir mit den Nachbarn und essen Rüben, bis wir sie nicht mehr sehen können.', 'Dann zeigt sich, wer Freunde hat.'], []),
    N('j_f4', 'Welche Zeit im Jahr magst du am liebsten?', ['Die Erntewoche. Alle helfen, und abends wird gefeiert.', 'Den ersten warmen Frühlingstag, wenn der Boden dampft.'], []),
  ],
  wald: [
    N('j_w1', 'Wie suchst du dir einen Baum aus?', ['Gerade gewachsen, nicht zu jung. Und nie den ältesten im Hain.', 'Ich frage mich, was der Wald entbehren kann. Klingt seltsam, ist aber so.'], ['j_w2']),
    N('j_w2', 'Warum nie den ältesten?', ['Weil er die anderen schützt, vor Wind und Schnee. Fällst du ihn, liegt im nächsten Sturm der halbe Hain.', 'Aus Respekt. Und weil mein Großvater es so gehalten hat.'], ['j_w3']),
    N('j_w3', 'Wird der Wald nicht immer kleiner?', ['Am Rand schon. Wir pflanzen nach, wo wir schlagen. Nicht alle tun das.', 'Wenn wir nicht aufpassen, ja. Und dann holen sich die Tiere unsere Felder.'], ['j_w4']),
    N('j_w4', 'Die Tiere?', ['Wo Wald fehlt, kommen Wölfe und Wildschweine ans Dorf. Sie sind nicht böse – nur hungrig.'], []),
  ],
  jagd: [
    N('j_j1', 'Was jagst du am liebsten?', ['Rehe. Klug und vorsichtig – man muss klüger sein.', 'Hasen mit der Schlinge. Weniger Ruhm, mehr im Topf.'], ['j_j2']),
    N('j_j2', 'Hast du im Wald je etwas gesehen, das du dir nicht erklären kannst?', ['Einen Fuchs, der mir drei Tage lang gefolgt ist. Nicht gejagt – gefolgt.', 'Eine Lichtung, auf der kein Vogel singt. Da geh ich nicht mehr hin.'], []),
    N('j_j3', 'Wie viel darf man jagen?', ['Nie das Muttertier im Frühjahr. Nie mehr, als man tragen kann.', 'So viel, dass im nächsten Jahr noch genug da ist.'], ['j_j4']),
    N('j_j4', 'Wie lernt man Spuren lesen?', ['Mit Geduld und kalten Füßen. Jahrelang.', 'Fang im eigenen Hof an: Wer war heute Nacht da? Katze, Marder oder Fuchs?'], []),
  ],
  wirt: [
    N('j_r1', 'Was ist dein bestes Gericht?', ['Linseneintopf mit Speck. Wer den nicht mag, ist krank.', 'Forelle mit Kräuterbutter – wenn jemand fischt.'], []),
    N('j_r2', 'Was erzählen dir die Leute abends?', ['Alles. Wer wen mag, wer wem was schuldet. Ich vergesse es sofort wieder. Offiziell.', 'Mehr, als ihnen am nächsten Morgen lieb ist.'], ['j_r3']),
    N('j_r3', 'Und inoffiziell?', ['Inoffiziell sind hier mehr Leute verliebt, als es zugeben würden.', 'Gib mir einen aus, dann reden wir.'], []),
    N('j_r4', 'Wer ist dein schwierigster Gast?', ['Der, der anschreiben lässt und dann wegzieht.', 'Barden. Singen gegen Freibier – und singen schlecht.'], []),
  ],
  heil: [
    N('j_h1', 'Welches Kraut ist das wichtigste?', ['Schafgarbe. Stillt Blut, senkt Fieber und wächst überall.', 'Weidenrinde gegen Schmerzen. Aber mit Maß.'], ['j_h2']),
    N('j_h2', 'Wer hat dir das beigebracht?', ['Meine Großmutter. Sie konnte am Geruch sagen, was einem fehlt.', 'Ein Wanderheiler, dem ich einen Winter lang die Tasche getragen habe.'], ['j_h3']),
    N('j_h3', 'Gibt es etwas, das du nicht heilen kannst?', ['Viel zu viel. Fieber im tiefen Winter. Kummer.', 'Die Lungenkrankheit der Bergleute. Da hilft nur klare Luft – und Glück.'], ['j_h4']),
    N('j_h4', 'Was tust du dann?', ['Dabeibleiben. Manchmal ist das das Einzige, was hilft.'], []),
  ],
  glaube: [
    N('j_g1', 'Woran glaubst du?', ['An das, was bleibt, wenn wir gehen: Erinnerung, Arbeit, Kinder.', 'An die Ahnen. Sie haben dieses Tal urbar gemacht. Wir schulden ihnen etwas.'], ['j_g2']),
    N('j_g2', 'Was kommt nach dem Tod?', ['Wir werden Teil des Waldes. Kein schlechter Gedanke.', 'Ich weiß es nicht. Wer es zu wissen behauptet, lügt.'], []),
    N('j_g3', 'Wozu braucht ein Dorf jemanden wie dich?', ['Damit jemand zuhört, wenn keiner mehr reden will.', 'Für Hochzeiten, Abschiede und die Nächte dazwischen.'], []),
    N('j_g4', 'Was erzählen die Alten über dieses Tal?', ['Dass es früher Moosherz hieß, weil das Moos hier selbst im Winter grün bleibt.', 'Dass hier einmal ein Dorf stand, an das sich niemand mehr erinnert.'], []),
  ],
  wache: [
    N('j_a1', 'Was siehst du von oben?', ['Rauch aus dem Nachbardorf, Krähen über dem Wald. Und Ärger, bevor er da ist.', 'Meistens Nebel. Manchmal einen Reiter am Kamm.'], ['j_a2']),
    N('j_a2', 'Hattest du je wirklich Angst?', ['Einmal. Fackeln am Waldrand, mitten in der Nacht. Es waren nur Köhler – gezittert habe ich trotzdem.', 'Jeden Tag ein bisschen. Wer keine Angst hat, passt nicht auf.'], ['j_a3']),
    N('j_a3', 'Wie schützt man ein Dorf wie unseres?', ['Mit Augen zuerst. Wer früh warnt, muss weniger kämpfen.', 'Mit Freunden. Ein Bündnis ist besser als jede Mauer.'], []),
    N('j_a4', 'Hast du gedient?', ['Zwei Jahre, für einen Herrn, an den ich nicht mehr denken will.', 'Nein. Ich hab es mir selbst beigebracht – mit Stöcken, gegen Bäume.'], []),
  ],
  wissen: [
    N('j_k1', 'Was schreibst du gerade auf?', ['Die Geschichten der Alten, bevor sie mit ihnen sterben.', 'Wer wann was gebaut hat. Irgendwann will das jemand wissen.'], ['j_k2']),
    N('j_k2', 'Was ist das Älteste, das du je gelesen hast?', ['Eine Karte des Tals. Unser Dorf fehlt darauf – dafür ist im Norden eine Burg eingezeichnet.', 'Einen Brief über einen harten Winter vor hundert Jahren. Er klingt wie heute.'], ['j_k3']),
    N('j_k3', 'Eine Burg im Norden?', ['Ruinen inzwischen, heißt es. Vielleicht findest du sie eines Tages.'], []),
    N('j_k4', 'Warum ist Wissen so wichtig?', ['Weil sich Fehler sonst wiederholen.', 'Weil man ohne Geschichte nur Leute ist, die zufällig nebeneinander wohnen.'], []),
  ],
  handel: [
    N('j_t1', 'Was verkauft sich am besten?', ['Salz, Nadeln, Eisen – alles, was man nicht selbst machen kann.', 'Neuigkeiten. Wer welche mitbringt, verkauft alles andere leichter.'], ['j_t2']),
    N('j_t2', 'Was haben wir, das andere wollen?', ['{gut_satz}'], ['j_t3']),
    N('j_t3', 'Und was müssen wir uns von anderen holen?', ['{fehlt_satz}'], []),
  ],
  wasser: [
    N('j_b1', 'Was weiß man am Wasser, das sonst keiner weiß?', ['Wer nachts zum Bach kommt – und warum.', 'Wann die Schneeschmelze kommt. Das Wasser riecht dann anders.'], ['j_b2']),
    N('j_b2', 'Hat der Bach je Schaden angerichtet?', ['Vor sieben Jahren. Die Flut hat zwei Häuser mitgenommen.', 'Jedes Frühjahr ein bisschen. Er holt sich das Ufer zurück.'], []),
    N('j_b3', 'Was wünschst du dir?', ['Einen Steg. Und einmal im Leben das Meer sehen.'], []),
  ],
  vieh: [
    N('j_v1', 'Haben deine Tiere Namen?', ['Die alten schon. Die Leitziege heißt Hexe – sie weiß, warum.', 'Nur die, die ich nicht schlachten muss.'], ['j_v2']),
    N('j_v2', 'Wovor hast du Angst?', ['Vor Wölfen im Winter. Und vor Krankheit im Stall – die nimmt alles.', 'Vor einem Sommer ohne Regen. Dann gibt es kein Heu.'], []),
    N('j_v3', 'Was braucht ein guter Stall?', ['Trockenes Stroh, dichte Wände und jemanden, der nachts nach dem Rechten sieht.'], []),
  ],
  handwerk: [
    N('j_c1', 'Woran arbeitest du gerade?', ['An etwas, das später jemand für selbstverständlich halten wird. So ist das mit gutem Handwerk.', 'An einem Auftrag für eine Hochzeit. Mehr verrate ich nicht.'], ['j_c2']),
    N('j_c2', 'Was macht gute Arbeit aus?', ['Dass man sie nicht bemerkt, bis sie fehlt.', 'Dass sie länger hält als der, der sie gemacht hat.'], []),
    N('j_c3', 'Woher bekommst du dein Material?', ['Aus dem Dorf, wenn es geht. Sonst vom Händler – und der nimmt, was er will.', '{fehlt_satz}'], []),
  ],
};
const DORF_TREE = [
  N('d_miss', 'Was fehlt dem Dorf deiner Meinung nach?', ['Mehr Häuser. Wenn noch Leute kommen, wird es eng.', 'Eine Mauer. Oder wenigstens einen Zaun.', 'Ein Fest! Die Leute arbeiten nur noch.', 'Einen Brunnen näher am Platz.'], ['d_why']),
  N('d_why', 'Warum gerade das?', ['Weil ich jeden Tag sehe, wie es fehlt.', 'Weil sonst irgendwann die Ersten gehen. Und dann die Nächsten.'], ['d_help']),
  N('d_help', 'Würdest du mithelfen, wenn wir es angehen?', ['Wenn du vorangehst – ja.', 'Sag Bescheid. Ich bringe meine Hände mit.'], []),
  N('d_people', 'Wie kommst du mit den anderen hier aus?', ['{leute_satz}'], ['d_rival']),
  N('d_rival', 'Was ist zwischen dir und {rivale}?', ['Alte Geschichte. Es ging um Land – oder um Stolz, je nachdem, wen du fragst.', 'Ein Versprechen, das nicht gehalten wurde. Mehr sage ich dazu nicht.'], [], { braucht: 'rivale' }),
  N('d_lead', 'Was hältst du vom Dorfrat?', ['{fuehrung_satz}'], []),
];
const WETTER_TREE = () => [
  N('t_morgen', 'Was meinst du, wie wird es morgen?', TOPIC_ANSWER.wetter.fragen, ['t_woher']),
  N('t_woher', 'Woran erkennst du das?', ['An den Schwalben. Und am Knie meiner Großmutter – das lügt nie.', 'Am Rauch. Steigt er gerade, bleibt es schön. Kriecht er, kommt Regen.'], []),
  N('t_winter', 'Wie war der letzte Winter hier?', ['Hart. Der Schnee lag bis zu den Fensterläden.', 'Lang. Im Frühjahr waren alle dünner und stiller.'], ['t_durch']),
  N('t_durch', 'Was hat euch durchgebracht?', ['Zusammenhalt. Und Rübensuppe. Sehr viel Rübensuppe.', 'Dass wir die Vorräte geteilt haben. Auch mit denen, die wenig hatten.'], []),
];
const FREUND_TREE = () => [
  N('f_wie', 'Wie habt ihr euch kennengelernt?', TOPIC_ANSWER.freunde.fragen, ['f_mag']),
  N('f_mag', 'Was magst du an {freund}?', ['Dass {freund} nie lügt. Auch wenn es weh tut.', 'Das Lachen. Man hört es durchs halbe Dorf.', 'Dass {freund} da ist, wenn es drauf ankommt. Ohne viele Worte.'], []),
  N('f_glueck', 'Ist {freund} glücklich hier?', ['Glaube schon. Aber frag am besten selbst.', 'Manchmal wirkt {freund} abwesend. Ich weiß nicht, warum.'], []),
];
const HUB = {
  geruechte: { label: 'Neuigkeiten', q: 'Was gibt es Neues?' }, arbeit: { label: 'Arbeit', q: 'Wie läuft die Arbeit?' }, dorf: { label: 'Das Dorf', q: 'Was hältst du von unserem Dorf?' },
  wetter: { label: 'Wetter', q: 'Was sagst du zum Wetter?' }, freunde: { label: '{freund}', q: 'Wie geht es {freund}?' }, sorgen: { label: 'Sorgen', q: 'Du wirkst bedrückt. Was ist los?' }, persoenlich: { label: 'Über dich', q: 'Erzähl mir etwas von dir.' },
};
const WRAP = ['Mehr gibt es dazu eigentlich nicht zu sagen.', 'Na ja. So ist das eben.', 'Das war’s, glaube ich.', 'Genug davon. Was liegt dir sonst auf dem Herzen?'];
const OPT = {
  freundlich: ['Schön, dich zu sehen, {name}.', 'Wie geht es dir, {name}?', 'Ich wollte nur mal Hallo sagen.', 'Lass dich nicht stören – ich freu mich, dass du hier bist.'],
  loben: ['Du machst das wirklich gut, {name}.', 'Ohne dich wäre das Dorf ärmer.', 'Ich sehe, wie viel du arbeitest. Danke.', 'Das ist gute Arbeit.'],
  scherzen: ['Na, heute schon was Vernünftiges gemacht? Ich auch nicht.', 'Wenn das so weitergeht, wählen sie dich noch in den Dorfrat.', 'Pass auf, sonst holen dich die Waldgeister!', 'Hast du heute in einen Eimer Essig gebissen?'],
  helfen: ['Kann ich dir zur Hand gehen?', 'Brauchst du etwas? Sag es einfach.', 'Lass mich mit anpacken.', 'Wenn dich etwas bedrückt, kannst du es mir sagen.'],
  fragen: ['Was gibt es Neues im Dorf?', 'Erzähl mal, wie läuft deine Arbeit?', 'Was denkst du über unser Dorf?', 'Woher kommst du eigentlich, {name}?'],
  kritisieren: ['Du könntest dich mehr anstrengen.', 'Das geht auch schneller, oder?', 'Ich erwarte mehr von dir.', 'So wird das nichts.'],
};
// Was der Held zum aktuellen Thema sagt (je Tonfall) – damit die Antworten zum Gesagten passen
const TOPIC_REPLY = {
  arbeit: { freundlich: ['Klingt nach einem langen Tag. Wie hältst du durch?'], loben: ['Man sieht, dass du dein Handwerk verstehst.'], scherzen: ['Wenn das so weitergeht, brauchst du bald einen Lehrling – oder zwei.'], helfen: ['Soll ich dir zur Hand gehen?'], fragen: ['Wie bist du eigentlich zu deinem Handwerk gekommen?'], kritisieren: ['Ehrlich gesagt sieht das etwas nachlässig aus.'] },
  wetter: { freundlich: ['Ja, man merkt die Jahreszeit.'], loben: ['Du hast ein gutes Gespür für das Wetter.'], scherzen: ['Wenn das so bleibt, baden wir bald alle im Bach.'], helfen: ['Brauchst du etwas, um gut durchs Wetter zu kommen?'], fragen: ['Was meinst du, wie wird es morgen?'], kritisieren: ['Das Wetter ist keine Ausrede, langsamer zu arbeiten.'] },
  dorf: { freundlich: ['Ich bin auch froh, dass es vorangeht.'], loben: ['Ohne Leute wie dich würde das Dorf nicht wachsen.'], scherzen: ['Bald brauchen wir eine Stadtmauer – für all die Leute, die herziehen wollen.'], helfen: ['Wenn dir etwas im Dorf fehlt, sag es mir.'], fragen: ['Was sollten wir als Nächstes bauen?'], kritisieren: ['Manche hier könnten mehr fürs Dorf tun.'] },
  freunde: { freundlich: ['Schön, dass ihr euch habt.'], loben: ['Ihr zwei haltet gut zusammen. Das tut dem Dorf gut.'], scherzen: ['Ihr zwei? Ich frag mich schon länger, wer hier wem nachläuft.'], helfen: ['Wenn ihr mal Hilfe braucht, sagt Bescheid.'], fragen: ['Wie habt ihr euch kennengelernt?'], kritisieren: ['Ihr redet viel. Arbeitet ihr auch so viel?'] },
  sorgen: { freundlich: ['Das klingt schwer. Ich höre dir zu.'], loben: ['Dass du trotzdem jeden Tag weitermachst, zeigt Stärke.'], scherzen: ['Kopf hoch – schlimmer als mein Gesang kann es nicht werden.'], helfen: ['Was kann ich tun, damit es dir besser geht?'], fragen: ['Seit wann geht dir das schon so?'], kritisieren: ['Jammern hilft niemandem.'] },
  geruechte: { freundlich: ['Spannend. Danke, dass du es mir erzählst.'], loben: ['Du hast die Ohren immer offen, was?'], scherzen: ['Und morgen erzählst du mir, dass die Krähen sprechen können?'], helfen: ['Wenn da etwas dran ist, kümmere ich mich darum.'], fragen: ['Glaubst du selbst daran?'], kritisieren: ['Gerede. Davon wird keiner satt.'] },
  persoenlich: { freundlich: ['Danke, dass du mir das erzählst.'], loben: ['Du bist ein guter Mensch, {name}.'], scherzen: ['Und ich dachte, ich wäre hier der Geheimnisvolle.'], helfen: ['Wenn ich dir irgendwie helfen kann – sag es.'], fragen: ['Und wie geht es dir heute wirklich?'], kritisieren: ['Du machst es dir manchmal zu einfach.'] },
};
// Was die Figur darauf erwidert, wenn es gut ankommt (erfreut/freundlich/neutral)
const TOPIC_ANSWER = {
  arbeit: { freundlich: ['Man gewöhnt sich dran. Und abends schmeckt das Bier umso besser.', 'Mit Pausen und Geduld. Und manchmal mit Fluchen.'], loben: ['Danke. Das hört man selten.', 'Das tut gut zu hören. Wirklich.'], scherzen: ['Ha! Einen Lehrling hätte ich gern – aber bitte einen, der zuhört.'], helfen: ['Gern! Ein zweites Paar Hände kann ich immer brauchen.', 'Das ist lieb. Heute schaffe ich es noch allein, aber ich merke es mir.'], fragen: ['Mein Vater hat es mir gezeigt, und irgendwann konnte ich es besser als er.', 'Durch Zufall. Und dann bin ich einfach dabei geblieben.'], kritisieren: ['Hm. Vielleicht hast du recht. Ich gebe mir mehr Mühe.'] },
  wetter: { freundlich: ['Ja. Man lebt hier mit dem Wetter, nicht dagegen.'], loben: ['Ach was, ich schaue einfach in den Himmel.'], scherzen: ['Im Bach baden? Nur über meine Leiche – der ist eiskalt!'], helfen: ['Ein paar Scheite Holz mehr könnten nicht schaden. Danke.'], fragen: ['Die Schwalben fliegen tief … ich würde sagen, es wird nicht besser.', 'Der Wind kommt von den Bergen. Morgen wird es klar.'], kritisieren: ['Schon gut, schon gut. Ich arbeite ja.'] },
  dorf: { freundlich: ['Ja. Man spürt, dass hier etwas entsteht.'], loben: ['Ach was. Jeder trägt seinen Teil bei.'], scherzen: ['Eine Stadtmauer! Und dann einen König, der sich mit Steuern bedankt.'], helfen: ['Danke. Ein paar Bänke am Platz würden allen guttun.'], fragen: ['Mehr Häuser, wenn du mich fragst. Es wird langsam eng.', 'Einen Brunnen näher am Platz. Das Wasserholen kostet jeden Tag Zeit.', 'Ein Gasthaus. Dann kämen auch mal Reisende vorbei.'], kritisieren: ['Da hast du nicht ganz unrecht. Aber sag das nicht zu laut.'] },
  freunde: { freundlich: ['Ja. Ohne {freund} wäre vieles schwerer.'], loben: ['Danke. Wir passen aufeinander auf.'], scherzen: ['Ha! Frag lieber nicht, sonst wird {freund} rot.'], helfen: ['Das sage ich {freund}. Das wird sich freuen.'], fragen: ['Beim Holzhacken. {freund} hat mir die Axt geklaut – aus Versehen, heißt es bis heute.', 'Am ersten Abend hier. Wir saßen am Feuer und haben bis zum Morgen geredet.'], kritisieren: ['Wir arbeiten genug, keine Sorge.'] },
  sorgen: { freundlich: ['Danke. Das hilft mehr, als du denkst.'], loben: ['Meinst du? … Danke.'], scherzen: ['Ha … ja, das hat gutgetan. Danke.'], helfen: ['Vielleicht … einfach ab und zu fragen, wie es mir geht.'], fragen: ['Schon eine Weile. Seit dem letzten harten Winter.'], kritisieren: ['Du hast ja recht. Ich reiße mich zusammen.'] },
  geruechte: { freundlich: ['Gern. Wer weiß, was davon stimmt.'], loben: ['Man hört so einiges, wenn man zuhört.'], scherzen: ['Die Krähen? Die erzählen nur Lügen, das weiß doch jeder.'], helfen: ['Wenn du der Sache nachgehst – sei vorsichtig.'], fragen: ['Halb, halb. In jedem Gerücht steckt ein Körnchen Wahrheit.'], kritisieren: ['Satt nicht, aber vielleicht schlauer.'] },
  persoenlich: { freundlich: ['Es tut gut, mal darüber zu reden.'], loben: ['Ach, hör auf … aber danke.'], scherzen: ['Ha! Jeder hat seine Geheimnisse, {du}.'], helfen: ['Danke. Ich weiß das zu schätzen.'], fragen: ['Heute? Besser als gestern. Das ist schon viel.'], kritisieren: ['Mag sein. Jeder trägt sein Päckchen.'] },
};
const TRANS = ['', '', 'Ach, übrigens: ', 'Weißt du was? ', 'Sag mal … ', 'Was anderes: '];
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
  { key: 'mine', wer: 'jemanden, der mit Stein oder Erz arbeitet', line: 'Man sagt, in den Bergen gibt es eine verlassene Mine.',
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
  { key: 'hirsch', wer: 'die Jäger oder den Hirten', line: 'Angeblich lebt im Wald ein Hirsch mit silbernem Geweih.',
    j: ['hirsch', 'Der Silberhirsch', '{name} erzählt von einem Hirsch mit silbernem Geweih, der im Nebel am Waldrand erscheint und über den Wald wachen soll.'],
    follow: [
      ['Hast du ihn selbst gesehen?', ['Einmal, glaube ich. Im Nebel, am Waldrand. Dann war er weg, als hätte es ihn nie gegeben.', 'Nein. Aber der Hirte schwört, er hat ihn gesehen.']],
      ['Was bedeutet so ein Hirsch?', ['Die Alten sagen, er wacht über den Wald. Wer ihn jagt, dem bringt der Winter Unglück.']],
    ],
    checks: [
      { id: 'spuren', q: 'Wo hat man ihn zuletzt gesehen? Ich lese die Fährte.', ok: 'An der Lichtung im Osten. Abgeknickte Zweige, ganz hoch oben – so groß ist kein gewöhnlicher Hirsch.', fail: 'Fährten? Im Nebel verschwinden auch Spuren.', j: ['hirsch_faehrte', 'Fährte des Silberhirschs', 'An der Lichtung im Osten sind hoch oben Zweige abgeknickt – der Silberhirsch könnte dort entlanggezogen sein.'] },
      { id: 'altes_wissen', q: 'Silberne Hirsche kommen in alten Liedern vor – als Boten.', ok: 'Boten? … Meine Großmutter sagte, er erscheint, bevor sich etwas Großes ändert.', fail: 'Lieder. Hm. Ich kenne nur Trinklieder.', j: ['hirsch_bote', 'Ein Bote des Wandels', 'Der Silberhirsch soll erscheinen, bevor sich etwas Großes ändert.'] },
    ] },
  { key: 'feuer', wer: 'Leute, die viel herumkommen – Wachen oder Fährleute', line: 'Ein Wanderer hat erzählt, jenseits der Berge brennen Dörfer.',
    j: ['feuer', 'Feuer jenseits der Berge', 'Ein Wanderer berichtete {name} von brennenden Dörfern jenseits der Berge. Reiter unter schwarzem Banner sollen dahinterstecken.'],
    follow: [
      ['Wer steckt dahinter?', ['Er sprach von Reitern unter einem schwarzen Banner. Mehr wusste er nicht – oder wollte es nicht sagen.']],
      ['Sind wir hier in Gefahr?', ['Die Berge schützen uns. Noch. Aber Pässe kann man überqueren.']],
    ],
    checks: [
      { id: 'menschenkenntnis', q: 'Hat der Wanderer die Wahrheit gesagt?', ok: 'Er hatte Brandlöcher im Mantel und zitterte noch. So etwas spielt man nicht.', fail: 'Woher soll ich das wissen? Ich kann den Leuten nicht in den Kopf schauen.', j: ['feuer_echt', 'Der Wanderer log nicht', 'Der Wanderer hatte Brandlöcher im Mantel – die Geschichte von den brennenden Dörfern scheint wahr.'] },
      { id: 'beruhigen', q: 'Wir werden vorbereitet sein. Niemand brennt dieses Dorf nieder.', ok: 'Ich … glaube dir. Danke. Vielleicht schlafe ich heute Nacht etwas besser.', fail: 'Leicht gesagt. Du hast die Augen des Wanderers nicht gesehen.' },
    ] },
  { key: 'wache', wer: 'den Wirt, in der Schänke hört man alles', line: 'Im Nachbardorf haben sie angeblich eine Wache aufgestellt. Wovor haben die Angst?',
    j: ['nachbar_wache', 'Wache im Nachbardorf', 'Das Dorf hinter dem Ostkamm hat Wachen aufgestellt. Warum, weiß niemand.'],
    follow: [
      ['Welches Nachbardorf meinst du?', ['Das hinter dem Ostkamm. Wer dort das Sagen hat, weiß ich nicht – die reden nicht viel mit uns.']],
      ['Sollten wir auch Wachen aufstellen?', ['Ein Wachturm würde mich ruhiger schlafen lassen. Und ein paar Leute, die einen Speer halten können.']],
    ],
    checks: [
      { id: 'ueberreden', q: 'Statt zu rätseln, sollten wir mit ihnen reden. Kennst du dort jemanden?', ok: 'Meine Base hat dorthin geheiratet. Wenn du willst, schicke ich ihr eine Nachricht.', fail: 'Mit denen? Lieber nicht.', j: ['nachbar_kontakt', 'Ein Kontakt hinter dem Ostkamm', '{name} hat eine Base im Dorf hinter dem Ostkamm und könnte ihr eine Nachricht schicken.'] },
    ] },
  { key: 'lichter', wer: 'die Alten oder jemanden vom Glauben', line: 'Nachts sieht man manchmal kleine Lichter zwischen den Bäumen.',
    j: ['lichter', 'Lichter im Wald', 'Nachts tanzen grünliche Lichter zwischen den Bäumen. Wer hinging, kam verstört zurück.'],
    follow: [
      ['Was für Lichter?', ['Kleine, grünliche. Sie tanzen, wenn man nicht hinsieht, und verschwinden, wenn man hinsieht.']],
      ['Ist jemand hingegangen?', ['Der junge Stallbursche wollte mal. Er kam zurück und hat drei Tage nicht geredet.']],
    ],
    checks: [
      { id: 'altes_wissen', q: 'Irrlichter. Sie führen Wanderer in Sümpfe – oder zu Verborgenem.', ok: 'Zu Verborgenem? … Unter der großen Eiche im Westen soll einmal ein Schrein gestanden haben.', fail: 'Irrlichter, Geister … ich will davon nichts wissen.', j: ['lichter_eiche', 'Der Schrein unter der Eiche', 'Unter der großen Eiche im Westen soll einst ein Schrein gestanden haben – vielleicht führen die Lichter dorthin.'] },
      { id: 'flink', q: 'Ich bin leise und schnell genug, um mich anzuschleichen. Wann sieht man sie?', ok: 'In nebligen Nächten, kurz vor Mitternacht, am Waldrand hinter den Feldern.', fail: 'Leise? Dich hört man doch schon von Weitem.', j: ['lichter_zeit', 'Wann die Lichter tanzen', 'Die Lichter erscheinen in nebligen Nächten kurz vor Mitternacht am Waldrand hinter den Feldern.'] },
    ] },
  { key: 'eisen', wer: 'einen Schmied oder Händler', line: 'Ein Händler meinte, Eisen wird knapp im ganzen Tal.',
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
  handel: ['Einen Markt. Dann kommen die Händler von allein.'], wasser: ['Einen Steg am Bach. Und Seife, die nicht nach Asche riecht.'], vieh: ['Heu für den Winter. Viel Heu.'], handwerk: ['Besseres Werkzeug.'],
};
const WORK_CHECK = {
  schmiede: { id: 'anpacken', q: 'Ich halte das Werkstück, du schlägst.', ok: 'Ha! Gute Arme. So geht es doppelt so schnell.', fail: 'Vorsicht! … Lass lieber, bevor du dir die Finger verbrennst.' },
  feld: { id: 'anpacken', q: 'Gib mir eine Sense, ich helfe dir.', ok: 'Du kannst ja richtig zupacken! Danke.', fail: 'Äh … die Sense hält man andersherum. Aber danke für den guten Willen.' },
  wald: { id: 'anpacken', q: 'Ich helfe dir, den Stamm zu tragen.', ok: 'Hau ruck! Mit dir geht das ja wie nichts.', fail: 'Uff – lass los, lass los! Das wird nichts.' },
  jagd: { id: 'spuren', q: 'Zeig mir die Spuren, ich lese sie für dich.', ok: 'Du hast recht – der zieht zum Bach. Du hast ein gutes Auge.', fail: 'Nein, das ist eine Hasenspur. Aber danke.', alt: { id: 'flink', q: 'Ich bin schneller als jeder Fuchs. Ich fang ihn dir.', ok: 'Du hast ihn verscheucht! So schnell kam ich nicht mal mit dem Blick hinterher.', fail: 'Der Fuchs lacht heute noch über dich.' } },
  wirt: { id: 'feilschen', q: 'Was hältst du von einem Nachbarschaftspreis?', ok: 'Für dich … na gut, das nächste Bier geht aufs Haus.', fail: 'Nachlass? Ich bin doch kein Wohltätigkeitsverein.' },
  heil: { id: 'heilkunde', q: 'Gegen Fieber hilft Weidenrinde mit Honig, oder?', ok: 'Du kennst dich aus! Endlich jemand, mit dem man fachsimpeln kann.', fail: 'Weidenrinde, ja – aber nicht so viel, sonst blutet der Magen.' },
  glaube: { id: 'altes_wissen', q: 'Ich habe gelesen, dieses Tal hieß früher anders.', ok: 'Ja, „Moosherz“! Woher weißt du das? Das wissen nur noch die Alten.', fail: 'Hm. Davon habe ich nie gehört.' },
  wissen: { id: 'altes_wissen', q: 'Ich habe gelesen, dieses Tal hieß früher anders.', ok: 'Ja, „Moosherz“! Du hast die alten Schriften gelesen? Beeindruckend.', fail: 'Wo hast du das gelesen? In meinen Büchern steht nichts davon.' },
  wache: { id: 'anpacken', q: 'Lass uns eine Runde Schwertübung machen.', ok: 'Gute Deckung! Mit dir an der Seite fühle ich mich sicherer.', fail: 'Au. Du solltest öfter üben, {du}.' },
  wasser: { id: 'anpacken', q: 'Ich helfe dir, die nassen Körbe zu tragen.', ok: 'Danke! Die sind schwerer, als sie aussehen.', fail: 'Vorsicht – jetzt liegt die Hälfte im Bach.' },
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
const NO_RUMOR = ['Neues? Nicht, dass ich wüsste. Hier passiert ja nichts.', 'Gerüchte? Da fragst du die Falsche. Ich höre nur, was der Wind erzählt.', 'Ich kümmere mich um meine Arbeit, nicht um Gerede.'];
const PERS_OPEN = { gesellig: ['Von mir? Ha, frag ruhig – ich erzähle gern.'], wortkarg: ['… Was willst du wissen?'], stolz: ['Warum interessiert dich das?'], ängstlich: ['Von mir? Oh … da gibt es nicht viel zu erzählen.'], geschäftstüchtig: ['Neugierig, was? Gut, frag.'], sonst: ['Von mir? Was willst du denn wissen?', 'Hm. Na gut, frag.'] };
const PERS_Q = { herkunft: 'Woher kommst du eigentlich?', ziel: 'Was wünschst du dir vom Leben?', angst: 'Gibt es etwas, wovor du Angst hast?' };
const REFUSE = { wortkarg: ['…', 'Das geht dich nichts an.'], stolz: ['Das geht dich nichts an.', 'So gut kennen wir uns noch nicht.'], ängstlich: ['Ich … lieber nicht. Noch nicht.'], gesellig: ['Ha, netter Versuch! Vielleicht erzähle ich dir das, wenn wir mal einen getrunken haben.'], sonst: ['Vielleicht erzähle ich dir das irgendwann. Nicht heute.', 'Hm. Darüber rede ich nicht mit jedem.', 'Lass uns über etwas anderes reden.'] };
const GEHEIM_CHECK = { id: 'menschenkenntnis', q: 'Da ist doch noch etwas, das dich beschäftigt. Das sehe ich dir an.', ok: '', fail: 'Was soll da sein? Nichts. Gar nichts.', personal: 'geheimnis' };
const CHECK_GENERIC = new Set(['ueberreden', 'einschuechtern', 'menschenkenntnis', 'beruhigen', 'anpacken']);
const RACE_UNLOCK = { elf: ['spuren'], zwerg: ['altes_wissen'], halbling: ['flink'] };
const RACE_NAME = { elf: 'Elf', zwerg: 'Zwerg', halbling: 'Halbling', mensch: 'Mensch' };

export function buildTalk(ctx) {
  // ctx: { name, job, wesen, stimmung, time, weather, season, freund, gebaeude[], du, race, herkunft, attrs, CHECKS, ATTRS, HERKUNFT, odds }
  const gb = ctx.gebaeude?.length ? pick(ctx.gebaeude) : { nom: 'das Langhaus', akk: 'das Langhaus' };
  const c = { ...ctx, gebaeude: gb.nom || gb, gebaeude_akk: gb.akk || gb };
  const g = GROUP_OF[ctx.job] || 'handwerk';
  const cold = ['zurückhaltend', 'misstrauisch', 'feindselig'].includes(ctx.stimmung);
  const topics = ['geruechte', 'arbeit', 'dorf', 'wetter'];
  if (ctx.freund) topics.push('freunde');
  if (cold || ctx.wesen === 'ängstlich' || Math.random() < 0.35) topics.push('sorgen');
  topics.push('persoenlich');
  const visited = new Set(), usedRumors = new Set();
  const asked = new Set(), checked = new Set(), unlocked = new Set();
  const known = (k) => !ctx.wissen || ctx.wissen.includes(k);
  const askedPersonal = new Set(ctx.gefragt || []);
  const worry = ctx.dorf?.hunger ? { line: 'Die Vorräte sind leer. Ich weiß nicht, wie lange wir das durchhalten.', tree: [
    N('s_h1', 'Wie schlimm ist es?', ['Die Kinder fragen abends, ob es morgen etwas gibt. Was soll ich da sagen?', 'Wir teilen, was da ist. Aber es ist zu wenig.'], ['s_h2']),
    N('s_h2', 'Was können wir tun?', ['Jagen, sammeln, tauschen. Jede Handvoll hilft. Wenn du draußen etwas findest – bring es mit.', 'Durchhalten. Und beim nächsten Mal früher Vorräte anlegen.'], []),
  ] } : pick(WORRY);
  c.rivale_satz = fill(pick(ctx.rivale ? RIVALE_SATZ.mit : RIVALE_SATZ.ohne), c);
  c.leute_satz = fill(ctx.rivale ? pick(['Mit den meisten gut. Mit {rivale} … reden wir lieber nicht.', ctx.freund ? '{freund} mag ich sehr. {rivale} geht mir aus dem Weg – und ich {rivale}.' : 'Die meisten mag ich. {rivale} geht mir aus dem Weg – und ich {rivale}.']) : pick(['Gut. Man hilft sich hier, das ist das Schöne.', ctx.freund ? '{freund} ist mir am liebsten. Mit dem Rest komme ich aus.' : 'Die meisten mag ich. Mit dem Rest komme ich aus.']), { ...c, freund_oder_viele: ctx.freund || 'Die meisten' });
  const st = ctx.dorf?.stimmung;
  c.fuehrung_satz = st === 'ausgelassen' || st === 'zufrieden' ? pick(['Die machen das ordentlich. Es geht voran, und keiner muss hungern.', 'Gut. Die hören zu, wenn man etwas zu sagen hat.'])
    : st === 'gedrückt' || st === 'verzweifelt' ? pick(['Ehrlich? Die reden viel und bauen wenig.', 'Die sollten sich mehr um die Vorräte kümmern als um ihre Pläne.'])
    : pick(['Man wird sehen. Die Richtung stimmt, das Tempo nicht immer.', 'Die meisten Beschlüsse sind vernünftig. Manche nicht.']);
  // Was im Dorf gerade los ist (aus dem Dorf-Kreislauf): Bau, Pläne, was es gibt und was fehlt
  const D = ctx.dorf || null;
  const liste = (a) => (a && a.length ? (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]) : '');
  c.bau = D?.bau || ''; c.plan = D?.plan || ''; c.plan_grund = D?.plan_grund || ''; c.werkstatt = D?.werkstatt || 'eine Werkstatt';
  c.neu_bewohner = D?.neu_bewohner || ''; c.knapp = liste(D?.knapp);
  c.gut_satz = D?.gruen?.length ? `${liste(D.gruen)}. Davon haben wir genug – vielleicht sogar zum Tauschen.` : 'Ehrlich? Noch nicht viel. Wir kommen gerade so über die Runden.';
  c.fehlt_satz = D?.rot?.length ? `${liste(D.rot)} – das gibt es bei uns schlicht nicht. Wer das braucht, muss ins Nachbardorf.` : 'Im Moment kommen wir ganz gut allein zurecht.';
  let tonesUsed = 0;

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

  // Themen-Übersicht („Hub“): von hier aus wird jedes Gespräch eröffnet
  const rumorLeft = () => RUMORS.some((x) => known(x.key) && !usedRumors.has(x.key)) && usedRumors.size < 3;
  const hubTopics = () => topics.filter((tp) => tp !== 'persoenlich' || askedPersonal.size < 4).map((tp) => ({
    topic: tp, label: fill(HUB[tp].label, c), text: fill(HUB[tp].q, c),
    visited: visited.has(tp) && !(tp === 'geruechte' && rumorLeft()),
  }));
  // Ein Thema betreten: die Figur antwortet mit dem Einstieg, danach gibt es Folgefragen
  const enterTopic = (tp) => {
    visited.add(tp);
    if (tp === 'geruechte') {
      const r = pick(RUMORS.filter((x) => known(x.key) && !usedRumors.has(x.key)));
      if (!r || usedRumors.size >= 3) { usedRumors.add('_'); return { topic: 'geruechte', text: pick(NO_RUMOR), nodes: [] }; }
      usedRumors.add(r.key);
      const nodes = r.follow.map(([q, a], k) => N(r.key + k, q, a, k === 0 ? [r.key + '_wer'] : [], { journal: k === 0 ? r.j : null }));
      nodes.push(N(r.key + '_wer', 'Wer könnte mehr darüber wissen?', [`Frag mal ${r.wer}.`, `Am ehesten ${r.wer}. Ich hab es auch nur gehört.`], []));
      for (const n of nodes) if (!n.id.endsWith('_wer')) unlocked.add(n.id);
      return { topic: tp, text: r.line, rumor: r, nodes, child: new Set([r.key + '_wer']) };
    }
    if (tp === 'persoenlich') return { topic: tp, text: fill(pick(PERS_OPEN[ctx.wesen] || PERS_OPEN.sonst), c), nodes: [] };
    let line, nodes, check = null;
    if (tp === 'arbeit') {
      line = pick(WORK[g]); nodes = [...WORK_TREE(g), ...(JOB_TREE[g] || [])];
      if (D?.baut_mit && D.bau) {
        line = pick([`Ich bin gerade beim Bau – ${D.bau_art === 'ausbau' ? 'das ' + D.bau_name + ' wird ausgebaut' : D.bau + ' entsteht'}. Jeden Tag ein Stück.`, `Viel zu tun. Wir bauen gerade ${D.bau_art === 'ausbau' ? 'am ' + D.bau_name : D.bau}.`]);
        nodes.unshift(N('e_bau', 'Wie kommt ihr mit dem Bau voran?', D.knapp?.includes('Holz') ? ['Langsam. Holz ist knapp, oft warten wir auf die nächste Fuhre.', 'Es geht – wenn genug Holz da ist. Im Moment ist es das nicht.'] : ['Gut! Wenn nichts dazwischenkommt, sind wir bald fertig.', 'Es wächst. Komm doch mal vorbei und pack mit an.'], []));
      } else if (D?.ohne_werkstatt) {
        line = pick([`Ohne richtige Werkstatt ist das alles mühsam. Eine ${D.werkstatt} würde vieles ändern.`, 'Ich mache, was ich kann – aber mir fehlt der richtige Platz dafür.']);
        nodes.unshift(N('e_ws', 'Was würde sich mit einer eigenen Werkstatt ändern?', [D.plan_name === D.werkstatt ? 'Alles! Und der Dorfrat will sie ja bald bauen. Ich kann es kaum erwarten.' : 'Ich könnte doppelt so viel schaffen. Ich hoffe, der Dorfrat sieht das auch so.'], []));
      }
    }
    else if (tp === 'wetter') { line = `${pick(WEATHER[ctx.weather] || WEATHER.klar)} ${pick(SEASON[ctx.season] || SEASON.sommer)}`; nodes = WETTER_TREE(); }
    else if (tp === 'dorf') {
      line = pick(VILLAGE); nodes = DORF_TREE.filter((n) => (!n.braucht || ctx[n.braucht]) && !(D && ['d_miss', 'd_why', 'd_help'].includes(n.id)));
      if (D) {
        if (D.hunger) line = 'Die Vorräte sind leer. Die Leute hungern – so kann es nicht weitergehen.';
        else if (D.selbst_neu) line = 'Ich bin ja erst seit Kurzem hier. Aber es gefällt mir. Glaube ich.';
        else if (D.neu_gebaut && Math.random() < 0.6) line = `Hast du schon gehört? ${D.neu_gebaut}`;
        else if (D.bau && Math.random() < 0.6) line = `Man hört es den ganzen Tag hämmern – ${D.bau_art === 'ausbau' ? 'das ' + D.bau_name + ' wird ausgebaut' : 'es wird ' + D.bau + ' gebaut'}.`;
        const ex = [];
        if (D.bau) ex.push(N('d_bau', 'Was wird da gerade gebaut?', [`${D.bau_art === 'ausbau' ? 'Das ' + D.bau_name + ' wird ausgebaut' : (D.bau.charAt(0).toUpperCase() + D.bau.slice(1)) + '. Der Dorfrat hat es so beschlossen'}. Ich finde, das war richtig.`, `${D.bau_art === 'ausbau' ? 'Das ' + D.bau_name + ' wird größer' : (D.bau.charAt(0).toUpperCase() + D.bau.slice(1))}. Wurde auch Zeit.`], []));
        if (D.plan) ex.push(N('d_plan', 'Was hat der Dorfrat als Nächstes vor?', [`Als Nächstes soll ${D.plan} entstehen. ${D.plan_grund}`], ['d_plan2']));
        if (D.plan) ex.push(N('d_plan2', 'Was fehlt dafür noch?', [D.knapp?.length ? `Vor allem ${liste(D.knapp)}. Sobald das da ist, geht es los.` : 'Eigentlich nichts mehr. Es kann bald losgehen.'], []));
        if (D.rot?.length) ex.push(N('d_fehlt', 'Was fehlt uns im Dorf am meisten?', [`${D.rot[0]}. Gibt es hier einfach nicht. Wer das braucht, muss ins Nachbardorf.`], ['d_tausch']));
        if (D.rot?.length) ex.push(N('d_tausch', 'Wo bekommen wir so etwas her?', ['Tauschen. Mit dem Dorf hinter dem Ostkamm vielleicht. Mit einem Marktplatz kämen die Händler zu uns.', 'Von fahrenden Händlern – wenn mal einer vorbeikommt. Oder jemand zieht her, der es kann.'], []));
        if (D.gruen?.length) ex.push(N('d_gut', 'Worin sind wir gut?', ['{gut_satz}'], []));
        if (D.neu_bewohner) ex.push(N('d_neu', `Kennst du schon ${D.neu_bewohner}?`, [`Ein bisschen. Scheint in Ordnung zu sein. Mal sehen, ob ${D.neu_bewohner} bleibt.`, `Wir haben kurz geredet. Neue Gesichter tun dem Dorf gut.`], []));
        nodes = [...ex, ...nodes];
      }
    }
    else if (tp === 'freunde') { line = pick(FRIEND); nodes = FREUND_TREE(); }
    else { line = worry.line; nodes = [N('s_root', 'Was bedrückt dich wirklich?', SORGEN_ASK, []), ...worry.tree]; check = worry.check || null; }
    // Wurzeln: Knoten, die von keinem anderen freigeschaltet werden
    const child = new Set(nodes.flatMap((n) => n.nach));
    for (const n of nodes) if (!child.has(n.id)) unlocked.add(n.id);
    return { topic: tp, text: fill(line, c), nodes, check, child };
  };
  const nextTopic = () => enterTopic(pick(topics.filter((t) => !visited.has(t))) || 'wetter');

  // Antwortmöglichkeiten: im Hub die Themen, in einem Thema dessen Folgefragen
  const options = (cur) => {
    const out = [];
    const ab = ctx.abmachung;
    const dealOpts = () => {
      if (ab && ab.status === 'wartet_holz') out.push({ kind: 'deliver', tag: '[Abmachung]', text: `Hier ist das Holz für ${ab.titel}.`, hint: (ctx.holz ?? 0) >= ab.holz ? 'Holz aus dem Dorflager – ist da' : 'Holz aus dem Dorflager – reicht gerade nicht' });
      if (ab && ab.status === 'in_arbeit' && !asked.has('stand')) out.push({ kind: 'follow', id: 'stand', tag: '[Abmachung]', text: `Wie kommst du mit ${ab.titel} voran?`, answer: fill(pick(['Gut! {fertig} ist es fertig, versprochen.', 'Läuft. Ich arbeite jeden Tag daran – {fertig} kannst du es dir ansehen.']), { ...c, fertig: ctx.whenText?.(ab.faellig_at) || 'Bald' }) });
      if (!ab) for (const d of (ctx.deals || []).slice(0, 2)) out.push({ kind: 'deal', tag: '[Auftrag]', vorlage: d.id, text: `Könntest du ${d.titel} anfertigen?`, hint: (d.holz ? (d.holz <= 4 ? 'etwas Holz aus dem Lager' : 'Holz aus dem Lager') + ', ' : '') + (d.dauer_h <= 5 ? 'dauert ein paar Stunden' : d.dauer_h <= 9 ? 'dauert einen halben Tag' : 'dauert etwa einen Tag') });
    };
    if (!cur) {
      for (const h of hubTopics()) out.push({ kind: 'enter', topic: h.topic, label: h.label, text: h.text, visited: h.visited });
      dealOpts();
      if (cold) for (const def of COLD_CHECKS) { const o = checkOpt(def); if (o) out.push(o); }
      return out;
    }
    for (const n of cur.nodes || []) {
      if (asked.has(n.id) || !unlocked.has(n.id)) continue;
      out.push({ kind: 'follow', id: n.id, text: fill(n.q, c), answer: fill(pick(n.a), c), nach: n.nach, journal: n.journal || null, deeper: !!cur.child?.has(n.id) });
    }
    if (cur.rumor) for (const def of cur.rumor.checks) {
      const d = def.j && !known(def.j[0]) ? { ...def, ok: `Ehrlich? Mehr weiß ich darüber nicht. Frag mal ${cur.rumor.wer}.`, j: null } : def;
      const o = checkOpt(d); if (o) out.push(o);
    }
    if (cur.topic === 'arbeit') { const wc = WORK_CHECK[g]; for (const def of [wc, wc.alt].filter(Boolean)) { const o = checkOpt(def); if (o) out.push(o); } dealOpts(); }
    if (cur.topic === 'persoenlich') {
      for (const [k, q] of Object.entries(PERS_Q)) if (!askedPersonal.has(k)) out.push({ kind: 'personal', what: k, text: q });
      if (!askedPersonal.has('geheimnis')) { const o = checkOpt(GEHEIM_CHECK); if (o) out.push(o); }
    }
    if (cur.topic === 'sorgen') { for (const def of [...SORGEN_CHECKS, cur.check].filter(Boolean)) { const o = checkOpt(def); if (o) out.push(o); } }
    if (cur.topic === 'dorf') { const o = checkOpt(DORF_CHECK); if (o) out.push(o); }
    if (cur.topic === 'wetter' && (ctx.herkunft === 'waldlaeufer' || ctx.race === 'elf')) {
      const o = checkOpt({ id: 'spuren', q: 'Riechst du das? Der Wind dreht. Morgen schlägt das Wetter um.', ok: 'Tatsächlich … jetzt, wo du es sagst. Du hast feine Sinne.', fail: 'Ich rieche nur den Misthaufen.' }); if (o) out.push(o);
    }
    if (cur.topic === 'geruechte' && rumorLeft()) out.push({ kind: 'enter', topic: 'geruechte', inline: true, text: 'Hast du noch mehr gehört?' });
    // Haltung zeigen – höchstens zwei Mal pro Thema, damit es ein Gespräch bleibt und kein Abfragen
    if (tonesUsed < 2) {
      const tones = ['freundlich', 'loben', 'scherzen', 'helfen', 'fragen', 'kritisieren'].sort(() => Math.random() - 0.5).slice(0, 2);
      for (const t of tones) out.push({ kind: 'tone', tone: t, tag: `[${TONE_LABEL[t]}]`, text: fill(pick(TOPIC_REPLY[cur.topic]?.[t] || OPT[t]), c) });
    }
    return out;
  };
  // Hat ein Thema noch echten Gesprächsstoff (Folgefragen, Proben)?
  const exhausted = (cur) => !options(cur).some((o) => o.kind !== 'tone' && !(o.kind === 'enter' && o.inline));
  const unlock = (ids) => { for (const id of ids || []) unlocked.add(id); };
  const resetThread = () => { tonesUsed = 0; };
  const useTone = () => { tonesUsed++; };
  const wrap = () => fill(pick(WRAP), c);
  const markAsked = (id) => asked.add(id), markChecked = (id) => checked.add(id), markPersonal = (k) => askedPersonal.add(k);
  const personalTopic = () => enterTopic('persoenlich');
  const refuse = () => fill(pick(REFUSE[ctx.wesen] || REFUSE.sonst), c);
  const checkText = (def, ok) => fill(ok ? def.ok : def.fail, c);
  const journal = (j) => (j ? { key: j[0], title: j[1], text: fill(j[2], c) } : null);
  const dealText = (r, kind) => {
    const g = { ...c, holz: r.holz, titel: r.titel || ctx.abmachung?.titel || '', dauer: r.dauer_h ? `${r.dauer_h} Stunden` : 'ein paar Stunden', fertig: ctx.whenText?.(r.faellig_at) || 'Bald' };
    if (kind === 'deliver') return fill(r.ok ? pick(['Danke! Dann fange ich gleich an. {fertig} ist es fertig.', 'Gutes Holz. Damit lässt sich arbeiten – {fertig} kannst du es dir ansehen.']) : r.grund === 'zu_wenig_holz' ? 'Das reicht nicht. Ich brauche {holz} Holz – so viel hast du gerade nicht.' : 'Welches Holz? Wir hatten doch gar nichts ausgemacht.', { ...g, holz: r.braucht ?? r.holz });
    if (r.ok) return fill(r.status === 'in_arbeit' ? pick(['Gern, das mache ich. Gib mir {dauer}, dann ist es fertig.', 'Abgemacht. In {dauer} steht es.']) : pick(['Abgemacht. Bring mir {holz} Holz, dann mache ich {titel}. Wenn ich das Holz habe, brauche ich etwa {dauer}.', 'Das kann ich. Aber ohne Holz geht nichts – {holz} Stück brauche ich. Dann ist es nach etwa {dauer} fertig.']), g);
    const no = { keine_lust: ctx.stimmung === 'misstrauisch' || ctx.stimmung === 'feindselig' ? ['Für dich? Eher nicht.'] : ['Hm … nicht jetzt. Frag mich, wenn wir uns besser kennen.'], beschaeftigt: ['Ich habe schon eine Arbeit für dich angefangen. Eins nach dem anderen.'], laeuft: ['Darum kümmert sich doch schon jemand.'], schon_da: ['Das gibt es doch schon.'] }[r.grund];
    return fill(no ? pick(no) : 'Dafür bin ich nicht die Richtige.', g);
  };
  const opener = () => {
    const parts = [pick(GREET[ctx.stimmung] || GREET.freundlich)];
    if (ctx.stimmung !== 'feindselig') { if (Math.random() < 0.5) parts.push(pick(TIME[ctx.time] || TIME.mittag)); if (Math.random() < 0.45) parts.push(pick(WESEN[ctx.wesen] || WESEN.bodenständig)); }
    return fill(parts.join(' '), c);
  };
  const reaction = (react, tone, topic) => {
    const ans = TOPIC_ANSWER[topic]?.[tone];
    if (ans && ['erfreut', 'freundlich', 'neutral'].includes(react)) {
      const pre = react === 'erfreut' && ctx.wesen === 'gesellig' && Math.random() < 0.3 ? 'Ha! ' : react === 'neutral' && ['loben', 'scherzen'].includes(tone) ? 'Hm. ' : '';
      return fill(pre + pick(ans), c);
    }
    return fill(pick((WESEN_REACT[ctx.wesen] || {})[react] || REACT[react] || REACT.neutral), c);
  };
  const transition = (text) => pick(TRANS) + text;
  const setDeal = (ab, holz) => { ctx.abmachung = ab; if (holz != null) ctx.holz = holz; ctx.deals = []; };
  const bye = (react) => fill(pick(BYE[react === 'erfreut' || react === 'freundlich' ? 'gut' : react === 'veraergert' || react === 'kuehl' ? 'schlecht' : 'mittel']), c);
  const patience = { 'treu ergeben': 10, herzlich: 9, freundlich: 7, fremd: 6, zurückhaltend: 5, misstrauisch: 4, feindselig: 2 }[ctx.stimmung] ?? 6;
  return { opener, nextTopic, enterTopic, hubTopics, exhausted, unlock, resetThread, useTone, wrap, options, markAsked, markChecked, markPersonal, personalTopic, refuse, transition, dealText, setDeal, checkText, journal, reaction, bye, patience: patience + (ctx.wesen === 'gesellig' ? 2 : ctx.wesen === 'wortkarg' ? -2 : 0) };
}
