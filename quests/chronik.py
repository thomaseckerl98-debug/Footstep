# Hauptquest „Chronik des Dorfes“ (Kapitel 1–3) und Aushänge des Dorfes (Rechtsfälle, Krisen, Briefe des Königs).
# Erzeugt migrations/030_chronik_inhalt.sql.
# Rollen: V = Vorsteher (der Bewohner, der das Dorf ohne Meister führt), A/B/C = weitere Bewohner. {held} = Spielername.
# Neue Folgen-Schlüssel: ansehen (Zahl), kapitel (nächstes Kapitel), wahl (True: Versammlung zählt die Stimmen).
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qlib import pruefe

KAP = []

# ───────────── Kapitel 1: Ein Platz am Feuer ─────────────
KAP.append(dict(id='chronik_1', kapitel=1, titel='Ein Platz am Feuer',
  kurz='Seit Meister Gundram gestorben ist, hat das Dorf keinen Dorfmeister. {V} hält es zusammen, so gut es geht – und sieht dich an.',
  rollen={'V': 'Vorsteher', 'A': 'Wer Hilfe auf dem Feld braucht', 'B': 'Streithahn am Zaun', 'C': 'Nachbar am Zaun'},
  start='brunnen', szenen={
  'brunnen': dict(ort='dorf', text='Früher Morgen am Brunnen. {V} schöpft Wasser und stellt den Eimer ab, als du kommst. „Seit Meister Gundram im letzten Winter gestorben ist, hält dieses Dorf niemand richtig zusammen. Ich tue, was ich kann – aber ich bin Vorsteher aus Verlegenheit, nicht aus Berufung.“ Er mustert dich. „Du lebst hier, {held}. Aber hier leben und dazugehören sind zwei verschiedene Dinge.“', optionen=[
    dict(text='„Was braucht das Dorf gerade?“', weiter='aufgaben'),
    dict(text='„Wer entscheidet jetzt, wenn ihr euch streitet?“', weiter='aufgaben', ergebnis='„Ich, notgedrungen. Bis die Versammlung einen neuen Dorfmeister wählt.“ Er zuckt die Schultern. „Aufgestellt wird nur, wen die Leute kennen und schätzen. Ansehen kann man nicht kaufen – man sammelt es, eine Hand voll Hilfe nach der anderen.“', folgen=dict(flag=['wahl_erklaert'])),
    dict(text='„Ich will eigentlich nur meine Ruhe.“', weiter='aufgaben', ergebnis='{V} lacht kurz. „Die wollen wir alle. Ruhe gibt es aber nur, wenn jemand die Unruhe wegräumt.“', folgen=dict(flag=['ruhe']))]),
  'aufgaben': dict(ort='dorf', text='„Zwei Dinge liegen heute an“, sagt {V}. „{A} kriegt das Korn allein nicht vom Feld, und es zieht Regen auf. Und {B} und {C} streiten seit drei Tagen um einen Zaun – bald fliegen da Steine.“', optionen=[
    dict(text='Zuerst aufs Feld zu {A}', weiter='feld'),
    dict(text='Zuerst zum Zaunstreit', weiter='zaun')]),
  'feld': dict(ort='feld', text='Die Garben liegen noch auf dem Acker, der Himmel im Westen wird grau. {A} wischt sich den Schweiß von der Stirn. „Allein schaffe ich das nie, bevor es gießt.“', optionen=[
    dict(text='Mit anpacken', tag='[Anpacken]', probe=dict(id='anpacken', dc=11),
      erfolg=dict(text='Garbe um Garbe schleppt ihr in die Scheune. Als die ersten Tropfen fallen, liegt die letzte im Trockenen.', folgen=dict(flag=['feld_besucht', 'feld_gut'], sym={'A': 4}, merkt={'A': '{held} hat mir geholfen, das Korn vor dem Regen einzubringen.'}), weiter='zwischen'),
      misserfolg=dict(text='Ihr schuftet, aber der Regen ist schneller. Ein Teil der Garben wird nass – immerhin nicht alle.', folgen=dict(flag=['feld_besucht', 'feld_halb'], sym={'A': 2}), weiter='zwischen')),
    dict(text='Die Nachbarskinder als Helfer holen', tag='[Überreden]', probe=dict(id='ueberreden', dc=10),
      erfolg=dict(text='Mit dem Versprechen von Honigbrot rennen fünf Kinder los. Lachend schleppen sie Garben, und der Regen findet nur noch leere Stoppeln.', folgen=dict(flag=['feld_besucht', 'feld_gut', 'kinder'], sym={'A': 3}, merkt={'A': '{held} hat das halbe Dorf zum Ernten zusammengetrommelt.'}), weiter='zwischen'),
      misserfolg=dict(text='Die Kinder kommen – und verschwinden nach der ersten Garbe wieder. Du und {A} schafft den Rest gerade so.', folgen=dict(flag=['feld_besucht', 'feld_halb'], sym={'A': 2}), weiter='zwischen'))]),
  'zaun': dict(ort='dorf', text='{B} und {C} stehen sich am Zaun gegenüber, beide mit roten Köpfen. „Der Zaun steht seit meinem Großvater hier!“, ruft {B}. „Und seit deinem Großvater wandert er jedes Jahr eine Elle in meinen Garten“, gibt {C} zurück. Ein paar Nachbarn schauen schon zu.', optionen=[
    dict(text='Genau hinsehen, wer hier flunkert', tag='[Menschenkenntnis]', probe=dict(id='menschenkenntnis', dc=12),
      erfolg=dict(text='Frisch aufgeworfene Erde an den Pfosten, und {B} weicht deinem Blick aus. Der Zaun wurde versetzt – vor Kurzem. Du sagst es ruhig, ohne Triumph. {B} schluckt und nickt.', folgen=dict(flag=['zaun_besucht', 'zaun_wahrheit'], sym={'C': 4, 'B': -1}, merkt={'C': '{held} hat im Zaunstreit die Wahrheit herausgefunden.'}), weiter='zwischen'),
      misserfolg=dict(text='Du findest nichts Eindeutiges. Die beiden streiten weiter, nur etwas leiser.', folgen=dict(flag=['zaun_besucht', 'zaun_offen']), weiter='zwischen')),
    dict(text='Einen neuen Zaun genau in der Mitte vorschlagen – gemeinsam gebaut', tag='[Überreden]', probe=dict(id='ueberreden', dc=11),
      erfolg=dict(text='Lange Stille. Dann lacht {C} auf. „Und wer bezahlt die Pfosten?“ – „Beide“, sagst du. Am Nachmittag graben sie Seite an Seite.', folgen=dict(flag=['zaun_besucht', 'zaun_kompromiss'], sym={'B': 3, 'C': 3}, merkt={'B': '{held} hat den Zaunstreit mit {C} gütlich beigelegt.', 'C': '{held} hat den Zaunstreit mit {B} gütlich beigelegt.'}), weiter='zwischen'),
      misserfolg=dict(text='„In der Mitte? Dann verliere ich ja eine halbe Elle!“ Beide sind sich plötzlich einig – gegen dich. Immerhin streiten sie nicht mehr miteinander.', folgen=dict(flag=['zaun_besucht', 'zaun_offen'], sym={'B': -1, 'C': -1}), weiter='zwischen')),
    dict(text='{B} recht geben', weiter='zwischen', ergebnis='{B} grinst. {C} spuckt aus und geht ins Haus. Das letzte Wort ist hier noch nicht gesprochen.', folgen=dict(flag=['zaun_besucht', 'zaun_partei'], sym={'B': 4, 'C': -5})),
    dict(text='{C} recht geben', weiter='zwischen', ergebnis='{C} nickt dir dankbar zu. {B} murmelt etwas von „Zugezogenen“ und stapft davon.', folgen=dict(flag=['zaun_besucht', 'zaun_partei'], sym={'C': 4, 'B': -5}))]),
  'zwischen': dict(ort='dorf', text='Der Tag ist halb um. Die Leute haben gesehen, wo du warst.', optionen=[
    dict(text='Noch zum Zaunstreit', wenn={'nicht_flag': 'zaun_besucht'}, weiter='zaun'),
    dict(text='Noch aufs Feld zu {A}', wenn={'nicht_flag': 'feld_besucht'}, weiter='feld'),
    dict(text='Zum Feuer vor dem Langhaus', weiter='abend')]),
  'abend': dict(ort='feuer', text='Am Abend brennt vor dem Langhaus ein Feuer. {V} reicht dir einen Becher warmen Apfelmost. „Die Leute reden über dich. Gut, meistens.“ Er zieht einen gefalteten Brief mit rotem Siegel aus der Jacke. „König Ottokar schreibt jedes Frühjahr. Steuern, Wege, Grenzen. Antworten müsste ein Dorfmeister – ich lege die Briefe in eine Kiste.“', optionen=[
    dict(text='„Warum stellst du dich nicht selbst zur Wahl?“', weiter='ende', ergebnis='„Vielleicht tue ich das. Irgendwer muss.“ Er starrt ins Feuer. „Aber ein Dorf verdient jemanden, der es will – nicht jemanden, der übrig bleibt.“', folgen=dict(sym={'V': 2})),
    dict(text='„Was müsste jemand tun, damit man ihm zuhört?“', weiter='ende', ergebnis='„Da sein, wenn es brennt. Und auch, wenn es nur nieselt.“ Er lächelt schief. „Hilf den Leuten bei ihren Bitten, nimm die Aufträge am Brett an, zieh los, wenn es draußen etwas zu klären gibt. Das spricht sich herum.“', folgen=dict(flag=['rat']))]),
  'ende': dict(ort='feuer', ende=True, text='Als du später nach Hause gehst, nickt dir {A} aus dem Fenster zu. Kein großer Moment – aber ein Anfang. Im Dorf wird man sich an diesen Tag erinnern.',
    folgen=dict(ansehen=12, kapitel=2, sym={'V': 2}, journal=['chronik_1', 'Ein Platz am Feuer', 'Seit Meister Gundrams Tod führt der Vorsteher das Dorf nur notgedrungen. Wer als Dorfmeister gewählt werden will, braucht Ansehen – durch Hilfe, Aufträge und Taten.'], chronik=['chronik_1', '{held} half bei der Ernte und am Zaun – der erste Schritt zum Dazugehören.'])),
}))

# ───────────── Kapitel 2: Trübes Wasser ─────────────
KAP.append(dict(id='chronik_2', kapitel=2, titel='Trübes Wasser',
  kurz='Das Brunnenwasser ist trüb, Kinder haben Bauchweh – und am Brunnen sucht man schon einen Schuldigen.',
  rollen={'V': 'Vorsteher', 'A': 'Wer beschuldigt wird', 'B': 'Wer anklagt', 'C': 'Wer mit zur Quelle geht'},
  start='brunnen', szenen={
  'brunnen': dict(ort='dorf', text='Am Brunnen steht eine Traube Menschen. Das Wasser im Eimer ist braun und riecht faulig, drei Kinder liegen mit Bauchkrämpfen im Bett. {B} schreit über alle hinweg: „Das ist {A}! Seit {A} oben am Bach arbeitet, ist das Wasser schlecht!“ {A} wird blass. {V} hebt die Hände, aber niemand hört auf ihn. Sein Blick sucht dich.', optionen=[
    dict(text='Die Menge beruhigen', tag='[Beruhigen]', probe=dict(id='beruhigen', dc=12),
      erfolg=dict(text='Du stellst dich auf den Brunnenrand und sprichst leise, bis die anderen leiser werden, um dich zu verstehen. „Erst nachsehen, dann urteilen.“ Die Fäuste sinken.', folgen=dict(flag=['menge_ruhig'], sym={'A': 3, 'V': 2}), weiter='aufbruch'),
      misserfolg=dict(text='Deine Worte gehen im Geschrei unter. Ein paar Leute ziehen zu {A}s Haus und werfen mit Dreck. {A} sieht dich an, als hättest du es verhindern können.', folgen=dict(flag=['tumult'], sym={'A': -1}), weiter='aufbruch')),
    dict(text='„Ich gehe zur Quelle und finde heraus, was los ist.“', weiter='aufbruch', ergebnis='{V} atmet auf. „Nimm {C} mit. {C} kennt den Weg hinauf besser als jeder andere.“'),
    dict(text='„{B} hat recht – {A} soll dafür geradestehen!“', weiter='beschuldigt')]),
  'beschuldigt': dict(ort='dorf', text='Jubel von {B}s Seite. {A} wird gezwungen, die Arbeit am Bach einzustellen, und schließt sich zu Hause ein. {V} schüttelt den Kopf. „Wir sehen trotzdem nach. Wenn {A} es war, finden wir es. Wenn nicht …“ Er spricht den Satz nicht zu Ende.', optionen=[
    dict(text='Zur Quelle aufbrechen', weiter='aufbruch', folgen=dict(flag=['ungerecht'], sym={'A': -6, 'B': 3}, merkt={'A': '{held} hat mich vor allen beschuldigt, das Wasser vergiftet zu haben.'}))]),
  'aufbruch': dict(ort='wald', text='{C} geht voraus, den Bach entlang, durch nassen Farn und über moosige Steine. Je höher ihr kommt, desto trüber wird das Wasser.', reise=dict(minuten=1, weiter='quelle', text='Der Weg zur Quelle führt bergauf durch dichten Wald.')),
  'quelle': dict(ort='wald', text='Die Quelle liegt in einer Mulde unter einem Hang. Das alte hölzerne Rinnwerk, das das Wasser zum Dorf leitet, ist zerbrochen. Schlamm und Geröll sind vom Hang gerutscht, und in der Rinne hat sich etwas verfangen.', optionen=[
    dict(text='Den Hang und die Spuren untersuchen', tag='[Spuren lesen]', probe=dict(id='spuren', dc=11),
      erfolg=dict(text='Die Erde ist frisch abgerutscht – nach den Regentagen. Keine Fußspuren, keine Gerberlohe. Nur der Berg, der sich bewegt hat.', folgen=dict(flag=['ursache']), weiter='quelle2'),
      misserfolg=dict(text='Überall Schlamm. Was hier passiert ist, kannst du nicht sicher sagen.', weiter='quelle2')),
    dict(text='An die alte Steinrinne denken, von der die Alten erzählen', tag='[Altes Wissen]', probe=dict(id='altes_wissen', dc=12),
      erfolg=dict(text='Unter dem Moos findest du sie: Eine Rinne aus behauenen Steinen, viel älter als das Holz. Gundrams Großvater muss sie gebaut haben. Sie ist nur zugeschwemmt.', folgen=dict(flag=['alte_rinne', 'ursache']), weiter='quelle2'),
      misserfolg=dict(text='Du erinnerst dich vage an Geschichten, aber nicht, wo genau sie lag.', weiter='quelle2')),
    dict(text='In der Rinne nachsehen, was sich dort verfangen hat', weiter='quelle2', ergebnis='Ein toter Fuchs, aufgedunsen, mitten im Wasserlauf. {C} würgt. Kein Wunder, dass das Wasser stinkt.', folgen=dict(flag=['fuchs']))]),
  'quelle2': dict(ort='wald', text='{C} krempelt die Ärmel hoch. „Wenn wir das heute nicht richten, trinkt das Dorf noch eine Woche Schlamm.“', optionen=[
    dict(text='Die Rinne flicken', weiter='flicken'),
    dict(text='Die alte Steinrinne freilegen', wenn={'flag': 'alte_rinne'}, weiter='heim', ergebnis='Mit vereinten Kräften schaufelt ihr Stein um Stein frei. Die alte Rinne trägt das Wasser sauber und sicher – sie wird die nächste Regenzeit überstehen.', folgen=dict(flag=['stein_frei', 'repariert'], sym={'C': 4}))]),
  'flicken': dict(ort='wald', text='Bretter, Nägel und eine Handvoll Werkzeug – mehr habt ihr nicht. Der Hammer muss sitzen.', minispiel=dict(art='hammer', schwer=2, titel='Die Rinne flicken', text='Schlag die Nägel sauber ein, damit das Wasser wieder läuft.',
      erfolg=dict(text='Die Rinne hält. Erst rinnt das Wasser braun, dann grau, dann klar. {C} jubelt.', folgen=dict(flag=['repariert'], sym={'C': 4}, merkt={'C': '{held} hat mit mir an der Quelle die Wasserrinne geflickt.'}), weiter='heim'),
      misserfolg=dict(text='Ein Brett splittert, ihr müsst improvisieren. Die Rinne läuft – aber es wird nicht ewig halten.', folgen=dict(flag=['halb'], sym={'C': 2}), weiter='heim')), optionen=[]),
  'heim': dict(ort='dorf', text='Zurück im Dorf wartet die Menge noch immer am Brunnen. {B} verschränkt die Arme, {A} steht abseits. Alle Blicke liegen auf dir.', optionen=[
    dict(text='Ruhig erklären, was du gefunden hast', wenn={'flag': 'ursache'}, weiter='ende_gut', ergebnis='Du erzählst vom abgerutschten Hang und der zerbrochenen Rinne. Kein Gift, keine Lohe – nur der Berg. Nach und nach nicken die Leute.', folgen=dict(flag=['wahrheit'], sym={'A': 5, 'B': 1}, merkt={'A': '{held} hat vor allen bewiesen, dass ich nicht schuld war.'})),
    dict(text='Den toten Fuchs zeigen', wenn={'flag': 'fuchs'}, weiter='ende_gut', ergebnis='Du legst den Kadaver in einem Sack vor den Brunnen. Ein Raunen geht durch die Menge. {B} wird kleinlaut.', folgen=dict(flag=['wahrheit'], sym={'A': 4})),
    dict(text='Alle aufrufen, die Quelle gemeinsam zu sichern', tag='[Überreden]', probe=dict(id='ueberreden', dc=12),
      erfolg=dict(text='„Jeder bringt morgen einen Stein und eine Schaufel mit!“ Und tatsächlich: Am nächsten Morgen zieht das halbe Dorf den Bach hinauf. Es wird ein Fest daraus.', folgen=dict(flag=['gemeinschaft'], dorf={'stimmung': 3}), weiter='ende_gut'),
      misserfolg=dict(text='Ein paar Leute murmeln Zustimmung, die meisten gehen nach Hause. Immerhin: Das Wasser ist wieder klar.', weiter='ende_hart')),
    dict(text='{A} vor allen um Verzeihung bitten', wenn={'flag': 'ungerecht'}, weiter='ende_hart', ergebnis='Es fällt dir schwer, und alle hören zu. {A} nickt nur knapp. Vergessen ist es nicht – aber es ist ein Anfang.', folgen=dict(sym={'A': 4})),
    dict(text='{V} die Schuld geben – die Rinne hätte längst jemand prüfen müssen', weiter='ende_hart', ergebnis='Einige nicken. {V} steht stumm da und sagt nichts. Später siehst du ihn allein am Brunnen sitzen.', folgen=dict(flag=['hart'], sym={'V': -6}, merkt={'V': '{held} hat mich vor allen für das schlechte Wasser verantwortlich gemacht.'}))]),
  'ende_gut': dict(ort='dorf', ende=True, text='Am Abend schöpft {V} einen Becher klares Wasser und reicht ihn dir. „Du hast heute etwas getan, das ich nicht geschafft habe: Du hast die Leute zusammengehalten.“ Leiser fügt er hinzu: „Man fängt an, deinen Namen zu nennen, wenn von der Versammlung die Rede ist.“',
    folgen=dict(ansehen=20, kapitel=3, dorf={'stimmung': 2, 'nahrung': 3}, sym={'V': 3}, journal=['chronik_2', 'Trübes Wasser', 'Die Quelle war verschüttet, nicht vergiftet. Man spricht davon, dass ich bei der nächsten Versammlung als Dorfmeister aufgestellt werden könnte – wenn mein Ansehen weiter wächst.'], chronik=['chronik_2', '{held} brachte das Wasser zurück und hielt das Dorf zusammen, als es nach einem Schuldigen suchte.'])),
  'ende_hart': dict(ort='dorf', ende=True, text='Das Wasser ist wieder klar, aber der Tag hinterlässt einen schalen Geschmack. Trotzdem: Die Leute haben gesehen, dass du hinaufgegangen bist, als andere nur geschrien haben.',
    folgen=dict(ansehen=12, kapitel=3, dorf={'nahrung': 2}, journal=['chronik_2', 'Trübes Wasser', 'Das Wasser fließt wieder. Wer bei der Versammlung als Dorfmeister antreten will, braucht noch mehr Ansehen.'], chronik=['chronik_2', '{held} brachte das Wasser zurück – nicht ohne Streit.'])),
}))

# ───────────── Kapitel 3: Die Versammlung ─────────────
KAP.append(dict(id='chronik_3', kapitel=3, titel='Die Versammlung',
  kurz='Der Rat ruft die Bürgerversammlung zusammen. Man nennt deinen Namen – und {V} will das Amt behalten.',
  rollen={'V': 'Vorsteher (Gegenkandidat)', 'A': 'Wer zu dir hält', 'B': 'Wer zweifelt', 'C': 'Wer ein Versprechen will'},
  start='aufruf', szenen={
  'aufruf': dict(ort='dorf', text='Am Brett hängt ein frischer Aushang: Bürgerversammlung im Langhaus, morgen bei Sonnenuntergang. Darunter, in {V}s krakeliger Schrift, zwei Namen. Einer davon ist deiner. {V} tritt neben dich. „Ich trete auch an. Ich habe das Dorf durch den Winter gebracht – das soll etwas zählen.“', optionen=[
    dict(text='„Möge der Bessere gewinnen.“', weiter='runde', folgen=dict(sym={'V': 2})),
    dict(text='„Du hast es gut gemacht. Aber das Dorf braucht mehr als Durchhalten.“', weiter='runde'),
    dict(text='„Tritt zurück. Du bist müde, das sieht jeder.“', weiter='runde', folgen=dict(sym={'V': -5}, merkt={'V': '{held} hat mir vor der Versammlung geraten, aufzugeben.'}))]),
  'runde': dict(ort='dorf', text='Bis zur Versammlung bleibt dir ein Tag. Wen willst du noch aufsuchen?', optionen=[
    dict(text='{A} besuchen', wenn={'nicht_flag': 'besuch_a'}, weiter='besuch_a'),
    dict(text='{B} besuchen – {B} zweifelt an dir', wenn={'nicht_flag': 'besuch_b'}, weiter='besuch_b'),
    dict(text='{C} besuchen – {C} will etwas von dir', wenn={'nicht_flag': 'besuch_c'}, weiter='besuch_c'),
    dict(text='Zur Versammlung ins Langhaus', weiter='versammlung')]),
  'besuch_a': dict(ort='dorf', text='{A} empfängt dich mit einem Grinsen. „Ich weiß schon, was ich ins Töpfchen werfe. Soll ich morgen etwas für dich sagen, bevor du sprichst?“', optionen=[
    dict(text='„Das wäre mir eine Ehre.“', weiter='runde', folgen=dict(flag=['besuch_a', 'stimme_a'], sym={'A': 2})),
    dict(text='„Lieber nicht – die Leute sollen selbst entscheiden.“', weiter='runde', ergebnis='{A} nickt anerkennend. „So einer bist du also.“', folgen=dict(flag=['besuch_a'], sym={'A': 3}))]),
  'besuch_b': dict(ort='dorf', text='{B} lässt dich nur bis zur Tür. „Was weißt du schon vom Führen? Unter Gundram haben wir drei magere Jahre gehabt, und er war ein kluger Mann.“', optionen=[
    dict(text='Herausfinden, was {B} wirklich fürchtet', tag='[Menschenkenntnis]', probe=dict(id='menschenkenntnis', dc=12),
      erfolg=dict(text='Es geht nicht um dich. {B} hat damals den Hof der Eltern verloren, weil niemand half. Du versprichst nichts Großes – nur, dass bei dir niemand allein gelassen wird. {B} schweigt lange. „Ich denk drüber nach.“', folgen=dict(flag=['besuch_b', 'stimme_b'], sym={'B': 4}, merkt={'B': '{held} hat verstanden, warum ich Angst vor einem neuen Dorfmeister habe.'}), weiter='runde'),
      misserfolg=dict(text='{B} schließt die Tür. Vielleicht war heute nicht der richtige Tag.', folgen=dict(flag=['besuch_b']), weiter='runde')),
    dict(text='Mit Taten überzeugen: an Brunnen und Ernte erinnern', tag='[Überreden]', probe=dict(id='ueberreden', dc=13),
      erfolg=dict(text='„Das stimmt wohl“, brummt {B}. „Du warst da, als andere nur geredet haben.“', folgen=dict(flag=['besuch_b', 'stimme_b'], sym={'B': 2}), weiter='runde'),
      misserfolg=dict(text='„Ein paar gute Tage machen noch keinen Dorfmeister.“ Die Tür bleibt halb geschlossen.', folgen=dict(flag=['besuch_b']), weiter='runde'))]),
  'besuch_c': dict(ort='dorf', text='{C} kommt gleich zur Sache. „Das Unterdorf hat keinen eigenen Brunnen. Versprich mir, dass du einen bauen lässt, wenn du gewählt wirst – dann hast du meine Stimme und die meiner Nachbarn.“', optionen=[
    dict(text='„Versprochen.“', weiter='runde', folgen=dict(flag=['besuch_c', 'stimme_c', 'versprechen_brunnen'], sym={'C': 3}, merkt={'C': '{held} hat mir vor der Wahl einen Brunnen fürs Unterdorf versprochen.'})),
    dict(text='Etwas Kleineres aushandeln: zuerst eine neue Pumpe', tag='[Feilschen]', probe=dict(id='feilschen', dc=11),
      erfolg=dict(text='{C} überlegt, dann schlägt er ein. „Eine Pumpe. Aber eine ordentliche.“', folgen=dict(flag=['besuch_c', 'stimme_c'], sym={'C': 2}), weiter='runde'),
      misserfolg=dict(text='„Also willst du gar nichts versprechen.“ {C} wendet sich ab.', folgen=dict(flag=['besuch_c'], sym={'C': -1}), weiter='runde')),
    dict(text='„Ich verspreche nichts, was ich nicht sicher halten kann.“', weiter='runde', ergebnis='{C} mustert dich. „Ehrlich. Selten genug.“ Ob das für eine Stimme reicht, verrät {C} nicht.', folgen=dict(flag=['besuch_c'], sym={'C': 2}))]),
  'versammlung': dict(ort='feuer', text='Das Langhaus ist voll bis unter die Balken, Fackeln qualmen, Kinder sitzen auf den Schultern der Eltern. {V} spricht zuerst – ruhig, ehrlich, von einem harten Winter, den alle überlebt haben. Es gibt Beifall. Dann wird es still. Alle sehen dich an.', optionen=[
    dict(text='Ehrlich sagen, was du im Dorf gesehen hast – und was fehlt', weiter='abstimmung', ergebnis='Du sprichst vom Wasser, vom Zaun, von den Briefen des Königs in {V}s Kiste. Keine großen Worte. Hier und da nickt jemand.', folgen=dict(flag=['rede_ehrlich'])),
    dict(text='Ein Bild von der Zukunft malen: Markt, Mauern, Ansehen beim König', tag='[Überreden]', probe=dict(id='ueberreden', dc=13),
      erfolg=dict(text='Du redest, und die Leute vergessen das Qualmen der Fackeln. Am Ende ruft jemand von hinten deinen Namen, und andere stimmen ein.', folgen=dict(flag=['rede_gut']), weiter='abstimmung'),
      misserfolg=dict(text='Du verhaspelst dich, die großen Worte klingen hohl. Ein paar Leute grinsen.', folgen=dict(flag=['rede_holprig']), weiter='abstimmung')),
    dict(text='{V} danken und vorschlagen, ihn als Ratgeber zu behalten', weiter='abstimmung', ergebnis='{V} sieht überrascht auf. Ein warmes Murmeln geht durch den Saal – so redet man hier gern miteinander.', folgen=dict(flag=['rede_demut'], sym={'V': 6}, merkt={'V': '{held} hat mich vor allen gewürdigt und mir einen Platz im Rat angeboten.'})),
    dict(text='{V}s Fehler aufzählen', weiter='abstimmung', ergebnis='Du zählst auf, was im Winter schiefging. Es ist alles wahr – und trotzdem verziehen manche das Gesicht. Man tritt nicht nach.', folgen=dict(flag=['rede_angriff'], sym={'V': -8}, merkt={'V': '{held} hat vor der Versammlung über mich hergezogen.'}))]),
  'abstimmung': dict(ort='feuer', ende=True, text='Jeder Bewohner legt eine Bohne in einen der beiden Krüge – weiß für dich, schwarz für {V}. Es ist so still, dass man das Klicken der Bohnen hört. Dann kippt der Älteste die Krüge auf den Tisch und beginnt zu zählen.',
    folgen=dict(ansehen=5, wahl=True, journal=['chronik_3', 'Die Versammlung', 'Bei der Bürgerversammlung im Langhaus stand ich gegen den Vorsteher zur Wahl.'])),
}))

for k in KAP:
    n, e = pruefe(k['id'], k['start'], k['szenen'])
    print(k['id'], n, 'Szenen', e, 'Enden', file=sys.stderr)

# ───────────── Aushänge des Dorfes ─────────────
# art: rechtsfall | krise | koenig. Rollen: T (Täter/Betroffener), O (Opfer/Kläger), H (Helfer). auto = Wahl des Vorstehers, wenn kein Spieler Dorfmeister ist.
# Folgen je Option: stim (Stimmung), res {holz, stein, nahrung, waren}, sym {T: n, O: n, H: n}, gunst (beim König), ansehen, verbannen ('T'), zuzug (Zahl).
EV = []
def ev(id, art, titel, text, optionen, rollen='', auto=0, gewicht=1):
    EV.append(dict(id=id, art=art, titel=titel, text=text, optionen=optionen, rollen=list(rollen), auto=auto, gewicht=gewicht))
def o(text, ergebnis, **f):
    return dict(text=text, ergebnis=ergebnis, folgen=f)

ev('brotdieb', 'rechtsfall', 'Brot aus der Vorratskammer', '{O} hat {T} beim Diebstahl von zwei Laiben Brot erwischt. {T} sagt, die Kinder hätten seit zwei Tagen kaum gegessen. {O} will eine Strafe sehen.', [
  o('Verzeihen – {T} arbeitet es bei {O} ab', '{T} schuftet eine Woche bei {O}. Am Ende teilen die beiden sogar ein Abendbrot.', sym={'T': 6, 'O': -1}, stim=1),
  o('Eine Buße in Waren zahlen lassen', '{T} zahlt mit dem wenigen, was da ist. {O} ist zufrieden, {T} verbittert.', sym={'T': -4, 'O': 3}, res={'waren': 2}),
  o('Einen Tag an den Pranger', 'Der Pranger lockt Zuschauer und Spott. Gestohlen wird so schnell nicht mehr – aber die Stimmung ist gedrückt.', sym={'T': -10, 'O': 2}, stim=-2),
  o('Aus der Gemeinschaftskasse Brot für die Familie geben', 'Niemand muss im Dorf hungern, sagst du. {O} murrt, die anderen nicken.', sym={'T': 8, 'O': -2}, res={'nahrung': -4}, stim=2, ansehen=1),
], 'TO', auto=1)
ev('grenzstein', 'rechtsfall', 'Der wandernde Grenzstein', 'Der Grenzstein zwischen den Äckern von {T} und {O} steht über Nacht drei Schritte weiter in {O}s Feld. {T} schwört, nichts damit zu tun zu haben.', [
  o('Den Stein zurücksetzen und {T} verwarnen', 'Der Stein kommt zurück an seinen Platz. {T} schweigt verbissen.', sym={'T': -3, 'O': 3}),
  o('Die Alten befragen, wo die Grenze wirklich lag', 'Die Alten streiten eine Stunde – und geben {O} recht. Die Sache ist sauber entschieden.', sym={'T': -2, 'O': 4}, stim=1),
  o('Einen Streifen Gemeindeland als Ausgleich teilen', 'Beide bekommen ein Stück mehr, keiner hat ganz verloren. Ungewöhnlich, aber es wirkt.', sym={'T': 3, 'O': 2}, res={'nahrung': -2}, stim=1),
], 'TO', auto=0)
ev('schlaegerei', 'rechtsfall', 'Schlägerei in der Schenke', 'Gestern Abend sind {T} und {O} in der Schenke aneinandergeraten. Ein Tisch ist zerbrochen, {O} hat ein blaues Auge. Jeder sagt, der andere habe angefangen.', [
  o('Beide zahlen den Tisch je zur Hälfte', 'Beide zahlen zähneknirschend. Der Wirt ist zufrieden.', sym={'T': -1, 'O': -1}, res={'waren': 1}),
  o('{T} muss sich öffentlich entschuldigen', '{T} entschuldigt sich vor allen. {O} grinst schief.', sym={'T': -4, 'O': 3}),
  o('Beide eine Woche gemeinsam Holz hacken lassen', 'Nach drei Tagen reden sie wieder miteinander, nach fünf lachen sie. Und der Holzstapel wächst.', sym={'T': 2, 'O': 2}, res={'holz': 6}, stim=1),
], 'TO', auto=0)
ev('schulden', 'rechtsfall', 'Geliehenes Silber', '{O} hat {T} im Frühjahr Silber für Saatgut geliehen. Die Ernte war mager, und {T} kann nicht zurückzahlen. {O} verlangt, dass {T} die Kuh hergibt.', [
  o('{T} muss die Kuh abgeben', '{O} bekommt die Kuh. {T}s Familie wird den Winter ohne Milch verbringen.', sym={'T': -8, 'O': 4}, stim=-1),
  o('Aufschub bis zur nächsten Ernte gewähren', '{O} murrt, aber willigt ein – mit deinem Wort als Pfand.', sym={'T': 5, 'O': -2}),
  o('Das Dorf übernimmt einen Teil der Schuld', 'Aus den Vorräten wird ein Teil beglichen. {O} ist zufrieden, {T} unendlich dankbar.', sym={'T': 7, 'O': 2}, res={'waren': -3}, ansehen=1),
], 'TO', auto=1)
ev('wilderei', 'rechtsfall', 'Wilderei im Königsforst', 'Ein Förster des Königs hat {T} mit einem erlegten Hirsch im Königsforst erwischt. Er verlangt, dass das Dorf den Wilderer bestraft – sonst meldet er es dem König.', [
  o('{T} hart bestrafen, wie das Gesetz es will', '{T} muss eine schwere Buße zahlen. Der Förster nickt zufrieden.', sym={'T': -8}, gunst=5, stim=-1),
  o('Den Förster mit Waren besänftigen', 'Ein paar Ballen Tuch, und der Förster hat nichts gesehen. Der König erfährt nichts – vorerst.', res={'waren': -4}, sym={'T': 4}),
  o('{T} in Schutz nehmen: Das Dorf hungert, der König hat genug Hirsche', 'Die Leute jubeln dir zu. Der Förster reitet wütend davon.', sym={'T': 6}, gunst=-8, stim=3, ansehen=1),
], 'T', auto=0)
ev('geruecht', 'rechtsfall', 'Böse Zungen', '{T} erzählt überall, {O} habe die eigene Ziege verhext, weil die Milch sauer wurde. Kinder werfen schon mit Steinen nach {O}s Tür.', [
  o('{T} öffentlich zur Rede stellen', '{T} muss vor allen zugeben, dass es nur Gerede war. Die Steine hören auf.', sym={'T': -4, 'O': 5}),
  o('Die Kinder zurechtweisen und die Sache ruhen lassen', 'Die Steine hören auf, das Gerede nicht ganz.', sym={'O': 2}),
  o('{T} aus dem Dorf weisen', '{T} packt die Sachen. Niemand wird hier mehr wegen Hexerei verdächtigt – aber manche flüstern jetzt über dich.', verbannen='T', sym={'O': 6}, stim=-3),
], 'TO', auto=1)
ev('fundsache', 'rechtsfall', 'Der Beutel im Bach', '{T} hat im Bach einen Lederbeutel mit Münzen gefunden. {O} behauptet, es sei der eigene – kann es aber nicht beweisen.', [
  o('{O} soll den Inhalt beschreiben', '{O} beschreibt die Münzen genau, bis auf die Kerbe in einer davon. Der Beutel geht zurück.', sym={'O': 4, 'T': 1}),
  o('Der Finder darf ihn behalten', '{T} strahlt. {O} geht wortlos.', sym={'T': 4, 'O': -4}),
  o('Den Inhalt für die Dorfkasse einziehen', 'Beide gehen leer aus, aber das Dorf hat etwas davon.', sym={'T': -2, 'O': -2}, res={'waren': 3}),
], 'TO', auto=0)
ev('schweine', 'rechtsfall', 'Schweine im Gemüsegarten', '{T}s Schweine haben über Nacht {O}s Gemüsegarten verwüstet. Kohl, Rüben, alles zertrampelt.', [
  o('{T} ersetzt den Schaden mit Nahrung', '{T} bringt zwei Säcke Rüben. {O} ist besänftigt.', sym={'T': -2, 'O': 3}),
  o('Beide bauen gemeinsam einen festen Zaun', 'Ein Zaun, der hält – und ein Nachmittag, an dem die beiden wieder miteinander reden.', sym={'T': 2, 'O': 2}, res={'holz': -3}),
  o('Ein Schwein wird geschlachtet und geteilt', 'Es gibt ein kleines Fest. {T} ist nicht begeistert, alle anderen schon.', sym={'T': -3, 'O': 2}, res={'nahrung': 5}, stim=2),
], 'TO', auto=0)
ev('fieber', 'krise', 'Fieber im Unterdorf', 'In drei Häusern liegen Leute mit hohem Fieber. {H} meint, es könnte sich ausbreiten.', [
  o('Die Häuser absperren, bis es vorüber ist', 'Die Kranken bleiben unter sich. Das Fieber breitet sich nicht aus, aber die Arbeit bleibt liegen.', res={'nahrung': -3, 'waren': -2}, stim=-1),
  o('{H} soll mit Kräutern von Haus zu Haus gehen', '{H} wacht drei Nächte durch. Das Fieber sinkt, und alle wissen, wem sie es verdanken.', sym={'H': 5}, res={'waren': -2}, stim=2),
  o('Abwarten – Fieber kommt und geht', 'Nach einer Woche liegt das halbe Dorf flach. Es geht gut aus, aber die Leute sind verstimmt.', stim=-4, res={'nahrung': -2}),
], 'H', auto=1)
ev('scheunenbrand', 'krise', 'Feuer in der Scheune', 'Mitten in der Nacht brennt eine Scheune! Die Flammen greifen nach dem Nachbardach. {H} läuft schon mit Eimern.', [
  o('Alle zur Eimerkette – das Dach retten', 'Eine lange Kette bis zum Bach. Die Scheune ist verloren, das Nachbarhaus gerettet.', res={'holz': -5}, stim=2, sym={'H': 3}),
  o('Erst das Korn aus der Scheune holen', 'Ihr rettet die Hälfte des Korns. Das Nachbardach fängt Feuer und brennt ab.', res={'nahrung': 3, 'holz': -9}, stim=-2),
  o('Das Vieh befreien und die Flammen eindämmen', 'Kein Tier verbrennt. Das Feuer frisst die Scheune, aber nicht mehr.', res={'holz': -6}, stim=1),
], 'H', auto=0)
ev('woelfe', 'krise', 'Wölfe an den Weiden', 'Zwei Schafe sind gerissen, und im Morgennebel hat {H} ein Rudel am Waldrand gesehen.', [
  o('Eine Jagd ausrufen', 'Die Jäger ziehen los und kommen mit zwei Fellen zurück. Das Rudel weicht in die Berge.', sym={'H': 3}, res={'waren': 2}, stim=1),
  o('Feste Pferche für die Nacht bauen', 'Die Pferche kosten Holz, aber kein Schaf geht mehr verloren.', res={'holz': -5}),
  o('Feuer an den Weiden brennen lassen', 'Die Feuer halten die Wölfe fern – und verbrauchen jede Nacht Holz.', res={'holz': -3}, stim=1),
], 'H', auto=1)
ev('duerre', 'krise', 'Der Brunnen sinkt', 'Seit Wochen kein Regen. Der Brunnen gibt nur noch trübes Wasser, und die Felder werden gelb.', [
  o('Den Brunnen tiefer graben', 'Drei Tage Arbeit, und dann sprudelt es wieder. Es hat Steine und Schweiß gekostet.', res={'stein': -5}, stim=1),
  o('Wasser rationieren', 'Jeder bekommt seinen Anteil. Es reicht – knapp, und mit langen Gesichtern.', stim=-2),
  o('Wasser vom Bach in Fässern heranschaffen', 'Ein mühsamer Weg, aber die Felder werden gerettet.', res={'holz': -3, 'nahrung': 2}),
], '', auto=1)
ev('sturm', 'krise', 'Nach dem Sturm', 'Ein Herbststurm hat Dächer abgedeckt und Bäume entwurzelt. {H} fragt, womit man anfangen soll.', [
  o('Zuerst die Häuser der Alten und Kranken', 'Die Schwächsten haben als Erste wieder ein Dach. Das spricht sich herum.', res={'holz': -4}, stim=3),
  o('Zuerst die Vorratsscheunen', 'Das Korn bleibt trocken. Ein paar Leute schlafen zwei Nächte im Langhaus.', res={'holz': -4, 'nahrung': 2}),
  o('Das Sturmholz sammeln und verkaufen', 'Aus dem Unglück wird ein kleines Geschäft. Die Dächer warten etwas länger.', res={'holz': 6, 'waren': 2}, stim=-2),
], 'H', auto=0)
ev('fluechtlinge', 'krise', 'Fremde am Dorfrand', 'Eine Familie mit einem Karren steht am Dorfrand – Flüchtlinge aus einem Dorf jenseits der Berge, das abgebrannt ist. Sie bitten um Obdach.', [
  o('Sie aufnehmen', 'Die Familie bleibt. Sie bringen fleißige Hände mit – und hungrige Münder.', zuzug=1, res={'nahrung': -3}, stim=1, ansehen=1),
  o('Ihnen Vorräte geben und weiterschicken', 'Mit gefüllten Säcken ziehen sie weiter. Sie danken dir trotzdem.', res={'nahrung': -3}),
  o('Sie abweisen', 'Der Karren rollt davon. Ein paar Kinder winken ihm nach.', stim=-2),
], '', auto=1)
ev('steuer', 'koenig', 'Der Steuereintreiber', 'Ein Steuereintreiber König Ottokars steht mit zwei Bewaffneten am Brunnen. Er verlangt den Herbstzehnt: Holz und Waren.', [
  o('Den vollen Zehnt zahlen', 'Der Eintreiber notiert alles sorgfältig. „Der König wird es erfahren.“', res={'holz': -8, 'waren': -4}, gunst=8),
  o('Um Aufschub bitten – die Ernte war mager', 'Der Eintreiber gewährt einen Monat. Freundlich ist er dabei nicht.', gunst=-2),
  o('Nur die Hälfte zahlen', 'Der Eintreiber zieht die Brauen hoch, nimmt aber, was er kriegt.', res={'holz': -4, 'waren': -2}, gunst=1),
  o('Die Zahlung verweigern', 'Der Eintreiber reitet davon. Im Dorf feiern sie dich – in der Burg wird man das anders sehen.', gunst=-12, stim=3),
], '', auto=0)
ev('truppen', 'koenig', 'Männer für die Grenze', 'Ein Bote des Königs bringt einen Befehl: Das Dorf soll zwei kräftige Leute für den Grenzwall stellen, für einen Sommer.', [
  o('Zwei Freiwillige schicken', 'Zwei junge Leute ziehen los, stolz und ein bisschen ängstlich. Der König merkt sich die Treue.', gunst=8, stim=-2),
  o('Statt Leuten Vorräte schicken', 'Ein Karren mit Proviant rollt zur Grenze. Der Bote ist halbwegs zufrieden.', res={'nahrung': -6}, gunst=3),
  o('Den Befehl ablehnen – die Hände werden gebraucht', 'Der Bote zieht mit grimmigem Gesicht ab.', gunst=-8, stim=1),
], '', auto=0)
ev('gesandter', 'koenig', 'Ein Gesandter auf Durchreise', 'Ein Gesandter des Königs reist mit Gefolge durch und will im Dorf übernachten.', [
  o('Ein Fest zu seinen Ehren', 'Musik, Braten, Tanz. Der Gesandte reist mit glänzenden Augen weiter – und lobt das Dorf in der Burg.', res={'nahrung': -6}, gunst=6, stim=2),
  o('Einfache, ehrliche Gastfreundschaft', 'Brot, Suppe, ein warmes Bett. Der Gesandte bedankt sich höflich.', res={'nahrung': -2}, gunst=2),
  o('Ihn an die Schenke verweisen', 'Der Gesandte rümpft die Nase und bezahlt für sein Zimmer.', gunst=-3, res={'waren': 1}),
], '', auto=1)
ev('burgholz', 'koenig', 'Holz für die Burg', 'König Ottokar lässt seine Burg ausbauen. Ein Baumeister bittet um Bauholz aus euren Wäldern.', [
  o('Reichlich Holz liefern', 'Lange Stämme rollen zur Burg. Der Baumeister verspricht, den König daran zu erinnern.', res={'holz': -10}, gunst=7),
  o('Eine kleine Lieferung', 'Ein Wagen Holz – nicht viel, aber guter Wille.', res={'holz': -4}, gunst=2),
  o('Ablehnen, das Dorf braucht sein Holz', 'Der Baumeister zieht leer ab.', gunst=-5),
], '', auto=1)

ev('antritt', 'koenig', 'Ein Brief mit rotem Siegel', 'Ein Reiter bringt einen Brief von König Ottokar: Er hat von deiner Wahl gehört und erwartet, dass du ihm als Dorfmeister die Treue schwörst – als seine rechte Hand in diesem Tal.', [
  o('Dem König feierlich die Treue schwören', 'Der Reiter nimmt deinen Schwur mit. „Der König vergisst seine Getreuen nicht.“', gunst=12),
  o('Höflich antworten, aber nichts versprechen', 'Ein kluger Brief: freundlich, unverbindlich. Man wird in der Burg darüber nachdenken.', gunst=3),
  o('Kühl antworten: Das Dorf gehört seinen Bewohnern', 'Der Reiter liest den Brief mit hochgezogenen Brauen. Im Dorf erzählt man es sich mit Stolz.', gunst=-8, stim=2),
], '', auto=0, gewicht=0)

# Bittsteller (eigene Logik: ein echter Wanderer will einziehen)
BITT = dict(id='bittsteller', art='bittsteller', titel='Ein Bittsteller am Tor',
  text='{T}, {beruf}, steht mit einem Bündel am Dorfplatz und bittet darum, im Dorf wohnen zu dürfen. {wesen}', optionen=[
    o('Aufnehmen', '{T} bedankt sich und sucht sich eine Ecke im Dorf.', zuzug=1),
    o('Abweisen', '{T} nickt stumm und zieht weiter.', stim=0),
  ], rollen=['T'], auto=0, gewicht=0)

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
kap = [dict(id=k['id'], titel=k['titel'], kurz=k['kurz'], kapitel=k['kapitel'], rollen=k['rollen'], **{'def': {'start': k['start'], 'szenen': k['szenen']}}) for k in KAP]
sql = f"""-- Migration 030: Inhalte der Hauptquest (Chronik, Kapitel 1–3) und Aushänge des Dorfes. Erzeugt von quests/chronik.py.
insert into public.quest_templates (id, titel, beschreibung, kurz, art, schwierigkeit, rollen, def)
select e->>'id', e->>'titel', e->>'kurz', e->>'kurz', 'chronik', (e->>'kapitel')::int, e->'rollen', e->'def' from jsonb_array_elements($q${J(kap)}$q$::jsonb) e
on conflict (id) do update set titel = excluded.titel, beschreibung = excluded.beschreibung, kurz = excluded.kurz, art = excluded.art, schwierigkeit = excluded.schwierigkeit, rollen = excluded.rollen, def = excluded.def;

insert into public.dorf_vorlagen (id, art, titel, text, optionen, rollen, auto, gewicht)
select e->>'id', e->>'art', e->>'titel', e->>'text', e->'optionen', array(select jsonb_array_elements_text(e->'rollen')), (e->>'auto')::int, (e->>'gewicht')::numeric from jsonb_array_elements($q${J(EV + [BITT])}$q$::jsonb) e
on conflict (id) do update set art = excluded.art, titel = excluded.titel, text = excluded.text, optionen = excluded.optionen, rollen = excluded.rollen, auto = excluded.auto, gewicht = excluded.gewicht;
"""
open(os.path.join(root, 'migrations/030_chronik_inhalt.sql'), 'w').write(sql)
print(len(KAP), 'Kapitel,', len(EV), 'Aushänge,', len(sql), 'Zeichen', file=sys.stderr)
