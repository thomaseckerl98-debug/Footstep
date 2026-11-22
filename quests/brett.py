# Vorlagen für das tägliche Quest-Brett. Rollen {A} {B} {C} werden mit echten Bewohnern des Dorfes besetzt.
# Folgen-Schlüssel wie in der Engine, zusätzlich: "sym": {"A": 5} (Beziehung zur Rollen-Figur), "merkt": {"A": "Satz aus Sicht der Figur"}.
import json

V = []

V.append(dict(id='vorrat', titel='Der verschwundene Vorrat', schwierigkeit=1,
  kurz='{A} vermisst einen Sack Saatgut aus dem Vorratsschuppen. Jemand im Dorf muss ihn genommen haben.',
  rollen={'A': 'Bestohlene Person', 'B': 'Verdächtige Person', 'C': 'Zeuge'},
  start='auftrag', szenen={
  'auftrag': dict(ort='dorf', text='{A} steht vor dem offenen Schuppen, die Hände in die Hüften gestemmt. „Ein ganzer Sack Saatgut. Weg. Ohne den wird mein Feld im Frühjahr kahl bleiben.“', optionen=[
    dict(text='„Ich finde heraus, wer das war.“', weiter='spuren'),
    dict(text='„Beruhig dich erst mal. Wir finden ihn.“', tag='[Beruhigen]', probe=dict(id='beruhigen', dc=10),
      erfolg=dict(text='{A} atmet durch. „Du hast recht. Ich hab mich da reingesteigert.“', folgen=dict(sym={'A': 2}), weiter='spuren'),
      misserfolg=dict(text='„Beruhigen? Das ist mein Winter, der da fehlt!“', weiter='spuren'))]),
  'spuren': dict(ort='dorf', text='Im Staub vor dem Schuppen sind Spuren, und an der Tür hängt ein Faden grober, brauner Wolle.', optionen=[
    dict(text='Den Spuren folgen', tag='[Spuren lesen]', probe=dict(id='spuren', dc=11),
      erfolg=dict(text='Die Spuren führen zum Haus von {B} – und dort, halb unter Stroh versteckt, liegt der Sack.', folgen=dict(flag=['beweis']), weiter='entdeckt'),
      misserfolg=dict(text='Die Spuren verlieren sich zwischen den Häusern.', weiter='zeuge')),
    dict(text='Herumfragen, wer etwas gesehen hat', weiter='zeuge')]),
  'zeuge': dict(ort='dorf', text='{C} kratzt sich am Kinn. „Gestern Abend? Da hab ich {B} mit einem Sack über der Schulter gesehen. Hab mir nichts dabei gedacht.“', optionen=[
    dict(text='Zu {B} gehen', weiter='entdeckt', folgen=dict(merkt={'C': 'Ich habe {held} erzählt, was ich gesehen habe. Hoffentlich war das richtig.'}))]),
  'entdeckt': dict(ort='dorf', text='{B} sieht dich kommen und wird blass. „Ich … meine Kinder hatten Hunger. Ich wollte es zurückgeben, sobald ich kann. Bitte sag es nicht {A}.“', optionen=[
    dict(text='Lügt {B}?', tag='[Menschenkenntnis]', wenn=dict(nicht_flag='geprueft'), probe=dict(id='menschenkenntnis', dc=11),
      erfolg=dict(text='Die Angst ist echt. In der Küche steht ein leerer Topf.', folgen=dict(flag=['geprueft', 'wahrheit']), weiter='entdeckt'),
      misserfolg=dict(text='Du kannst es nicht sagen.', folgen=dict(flag=['geprueft']), weiter='entdeckt')),
    dict(text='Den Sack zurückbringen und {A} die Wahrheit sagen', weiter='ende_wahrheit',
      ergebnis='{A} nimmt den Sack schweigend entgegen. Dann geht {A} hinüber zu {B}. Was die beiden reden, hörst du nicht.',
      folgen=dict(sym={'A': 4, 'B': -4}, merkt={'A': '{held} hat mein Saatgut gefunden und mir die Wahrheit über {B} gesagt.', 'B': '{held} hat mich verraten, obwohl ich gefleht habe.'}, chronik=['brett_vorrat_wahrheit', 'Ich habe herausgefunden, dass {B} das Saatgut von {A} genommen hat – und es offen gesagt.'])),
    dict(text='Den Sack heimlich zurücklegen und schweigen', weiter='ende_still',
      ergebnis='In der Nacht stellst du den Sack zurück in den Schuppen. {A} findet ihn am Morgen und hält es für ein Wunder.',
      folgen=dict(sym={'A': 1, 'B': 6}, merkt={'B': '{held} hat geschwiegen und mich gerettet. Das vergesse ich nicht.'}, chronik=['brett_vorrat_still', 'Ich habe für {B} geschwiegen und das Saatgut heimlich zurückgebracht.'])),
    dict(text='„Wir gehen zusammen zu {A}. Du erklärst es selbst.“', tag='[Überreden]', probe=dict(id='ueberreden', dc=12, mod=dict(wahrheit=-2)),
      erfolg=dict(text='{B} nickt zitternd. Vor {A} bricht {B} in Tränen aus. {A} schweigt lange – dann bietet {A} an, das Saatgut zu teilen.', folgen=dict(sym={'A': 4, 'B': 4}, merkt={'A': '{held} hat dafür gesorgt, dass {B} ehrlich zu mir war.', 'B': '{held} hat mir geholfen, das Richtige zu tun.'}, chronik=['brett_vorrat_versoehnt', '{A} und {B} haben sich versöhnt – ich habe sie zusammengebracht.']), weiter='ende_gut'),
      misserfolg=dict(text='{B} schüttelt den Kopf. „Das kann ich nicht.“ Du bringst den Sack allein zurück.', folgen=dict(sym={'A': 2, 'B': -2}), weiter='ende_wahrheit'))]),
  'ende_wahrheit': dict(ort='dorf', ende=True, text='Das Saatgut ist zurück. Im Dorf wird man darüber reden.', folgen=dict(beute=dict(stufe=1, chance=0.6, text='Am Abend steht {A} vor deiner Tür und drückt dir zum Dank etwas in die Hand, das lange im Schuppen lag.'))),
  'ende_still': dict(ort='dorf', ende=True, text='Ein Geheimnis mehr, das du trägst. Belohnt wirst du dafür nicht – aber {B} wird es dir nicht vergessen.'),
  'ende_gut': dict(ort='dorf', ende=True, text='Manchmal ist ein Streit der Anfang von etwas Besserem.', folgen=dict(beute=dict(stufe=1, chance=0.8, text='{A} und {B} haben zusammengelegt und schenken dir etwas – als Dank dafür, dass du sie zusammengebracht hast.'))),
}))

V.append(dict(id='brief', titel='Ein Brief für die Mühle', schwierigkeit=1,
  kurz='{A} bittet dich, einen versiegelten Brief zur Mühle am Bach zu bringen. Persönlich, sagt {A}, und schnell.',
  rollen={'A': 'Absender', 'B': 'Empfänger'},
  start='auftrag', szenen={
  'auftrag': dict(ort='dorf', text='{A} drückt dir einen gefalteten Brief mit einem Wachssiegel in die Hand. „Für {B}. Gib ihn niemand anderem. Und … lies ihn nicht.“', optionen=[
    dict(text='Losgehen', weiter='weg')]),
  'weg': dict(ort='wald', text='Der Pfad zur Mühle folgt dem Bach. Das Wasser glitzert, irgendwo klopft ein Specht.', reise=dict(minuten=1, weiter='zweifel', begegnung=dict(chance=0.3, szenen=['b_haendler', 'b_wanderer']))),
  'b_haendler': dict(ort='wald', text='Ein Händler hockt am Wegrand und flickt seinen Karren. „Hilf mir kurz, Freund? Das Rad will nicht.“', optionen=[
    dict(text='Mit anpacken', tag='[Anpacken]', probe=dict(id='anpacken', dc=10),
      erfolg=dict(text='Das Rad sitzt. Der Händler drückt dir zum Dank etwas in die Hand.', folgen=dict(beute=dict(stufe=1, chance=1, text='„Für deine Mühe“, sagt er und gibt dir etwas aus seinem Karren.')), weiter='zweifel'),
      misserfolg=dict(text='Ihr flucht beide, aber am Ende hält es irgendwie.', weiter='zweifel')),
    dict(text='Keine Zeit, der Brief eilt', weiter='zweifel')]),
  'b_wanderer': dict(ort='wald', text='Ein alter Mann sitzt auf einem Stein. „Zur Mühle? Grüß mir das Wasserrad. Wir sind zusammen alt geworden.“ Er lacht leise.', optionen=[
    dict(text='Ein Stück mit ihm reden', weiter='zweifel', ergebnis='Er erzählt von früher, als die Mühle noch drei Räder hatte.')]),
  'zweifel': dict(ort='wald', text='Kurz vor der Mühle löst sich das Siegel ein wenig. Man könnte hineinschauen, ohne dass es jemand merkt.', optionen=[
    dict(text='Hineinschauen', tag='[Flink]', probe=dict(id='flink', dc=11),
      erfolg=dict(text='Du liest: „Ich habe es nie vergessen. Komm zum Fest. Bitte.“ Du klebst das Siegel sauber wieder zu.', folgen=dict(flag=['gelesen']), weiter='muehle'),
      misserfolg=dict(text='Das Siegel bricht ganz. Jetzt sieht man, dass jemand den Brief geöffnet hat.', folgen=dict(flag=['gelesen', 'siegel_kaputt']), weiter='muehle')),
    dict(text='Den Brief ungelesen lassen', weiter='muehle', folgen=dict(flag=['treu']))]),
  'muehle': dict(ort='dorf', text='{B} wischt sich das Mehl von den Händen und nimmt den Brief. Als {B} den Absender erkennt, wird es still.', optionen=[
    dict(text='Abwarten', wenn=dict(nicht_flag='siegel_kaputt'), weiter='antwort'),
    dict(text='„Das Siegel war schon kaputt, als …“', tag='[Überreden]', wenn=dict(flag='siegel_kaputt'), probe=dict(id='ueberreden', dc=13),
      erfolg=dict(text='{B} glaubt dir – oder will dir glauben.', weiter='antwort'),
      misserfolg=dict(text='{B} sieht dich lange an. „Du hast ihn gelesen.“', folgen=dict(sym={'B': -4, 'A': -3}, merkt={'B': '{held} hat meinen Brief gelesen. Neugieriges Volk.'}), weiter='antwort')),
    dict(text='Die Wahrheit sagen: „Ich habe hineingeschaut. Es tut mir leid.“', wenn=dict(flag='gelesen'), weiter='antwort', ergebnis='{B} schnaubt – dann lächelt {B} schief. „Wenigstens ehrlich.“', folgen=dict(sym={'B': 1}))]),
  'antwort': dict(ort='dorf', text='{B} schreibt ein paar Zeilen auf die Rückseite und faltet den Brief neu. „Bring ihn zurück. Und sag {A} … nein. Bring ihn einfach.“', optionen=[
    dict(text='Zurück zu {A}', weiter='ende', folgen=dict(sym={'A': 4, 'B': 2}, merkt={'A': '{held} hat meinen Brief zu {B} gebracht – und eine Antwort mitgebracht.', 'B': '{held} hat mir einen Brief von {A} gebracht. Nach all den Jahren.'}, chronik=['brett_brief', 'Ich habe einen Brief zwischen {A} und {B} getragen. Was darin stand, war wichtig.']))]),
  'ende': dict(ort='dorf', ende=True, text='{A} liest die Antwort und dreht sich weg, damit du die Augen nicht siehst. „Danke“, sagt {A} leise.', folgen=dict(beute=dict(stufe=1, chance=0.6, text='Dann holt {A} etwas aus einer alten Truhe. „Nimm. Bei mir liegt es nur herum.“'))),
}))

V.append(dict(id='grenzstein', titel='Streit um den Grenzstein', schwierigkeit=2,
  kurz='{A} und {B} streiten, wem das Stück Land am alten Grenzstein gehört. Das Dorf erwartet, dass jemand entscheidet.',
  rollen={'A': 'Streitpartei', 'B': 'Streitpartei', 'C': 'Älteste Stimme'},
  start='streit', szenen={
  'streit': dict(ort='dorf', text='Am Feldrand stehen sich {A} und {B} gegenüber. „Der Stein stand immer hier!“ – „Weil du ihn letzten Herbst versetzt hast!“ Ein paar Leute sehen zu.', optionen=[
    dict(text='Dazwischengehen und beide beruhigen', tag='[Beruhigen]', probe=dict(id='beruhigen', dc=12),
      erfolg=dict(text='Die Stimmen werden leiser. Beide sind bereit, dich anzuhören.', folgen=dict(flag=['ruhig']), weiter='pruefen'),
      misserfolg=dict(text='„Halt dich raus!“, rufen beide gleichzeitig. Immerhin sind sie sich da einig.', weiter='pruefen')),
    dict(text='„Ich sehe mir den Stein an.“', weiter='pruefen')]),
  'pruefen': dict(ort='wald', text='Der Grenzstein ist alt und bemoost. Am Boden daneben sieht man eine frische Kuhle, als hätte man ihn bewegt – oder als hätten Wildschweine gewühlt.', optionen=[
    dict(text='Den Boden genau untersuchen', tag='[Spuren lesen]', probe=dict(id='spuren', dc=13),
      erfolg=dict(text='Die Kuhle stammt von Schweinen. Aber unter dem Moos zeigt eine verwitterte Kerbe in Richtung von {B}s Feld.', folgen=dict(flag=['kerbe']), weiter='wissen'),
      misserfolg=dict(text='Du wirst nicht schlau daraus.', weiter='wissen')),
    dict(text='Die alten Zeichen auf dem Stein deuten', tag='[Altes Wissen]', probe=dict(id='altes_wissen', dc=12),
      erfolg=dict(text='Das Zeichen ist ein altes Flurmal: Die Grenze verläuft entlang der Kerbe – und die zeigt zu {B}.', folgen=dict(flag=['kerbe', 'gedeutet']), weiter='wissen'),
      misserfolg=dict(text='Die Zeichen sind zu verwittert.', weiter='wissen')),
    dict(text='{C} fragen, wie es früher war', weiter='aelteste')]),
  'aelteste': dict(ort='dorf', text='{C} lehnt sich zurück. „Als ich jung war, hat der Stein weiter drüben gestanden. Aber das ist lange her, und das Gedächtnis ist ein Lügner.“', optionen=[
    dict(text='Zurück zum Feld', weiter='wissen', folgen=dict(flag=['erinnerung']))]),
  'wissen': dict(ort='dorf', text='Alle warten auf dein Wort. {A} sieht dich hoffnungsvoll an, {B} mit verschränkten Armen.', optionen=[
    dict(text='Für {B} entscheiden: Die alte Kerbe zählt.', wenn=dict(flag='kerbe'), weiter='ende',
      ergebnis='{B} nickt zufrieden. {A} schluckt – aber gegen das alte Zeichen kann niemand etwas sagen.',
      folgen=dict(beute=dict(stufe=2, chance=0.7, text='{B} drückt dir später etwas in die Hand. „Für deinen klaren Blick.“'), sym={'B': 5, 'A': -1, 'C': 2}, merkt={'B': '{held} hat gerecht entschieden – mit Beweis.', 'A': '{held} hat gegen mich entschieden. Aber mit Beweis.'}, chronik=['brett_grenze_beweis', 'Ich habe den Grenzstreit zwischen {A} und {B} mit einem alten Flurmal entschieden.'])),
    dict(text='Für {A} entscheiden – {A} braucht das Land dringender.', weiter='ende',
      ergebnis='{A} atmet auf. {B} spuckt aus und geht.',
      folgen=dict(beute=dict(stufe=2, chance=0.7, text='{A} kommt am Abend vorbei und gibt dir etwas. „Das hab ich dir versprochen, wenn du zu mir hältst.“'), sym={'A': 6, 'B': -6}, merkt={'A': '{held} hat zu mir gehalten.', 'B': '{held} hat mir mein Land genommen. Das merke ich mir.'}, chronik=['brett_grenze_a', 'Im Grenzstreit habe ich mich auf die Seite von {A} gestellt.'])),
    dict(text='Teilen: Jeder bekommt die Hälfte, und beide pflügen gemeinsam.', tag='[Überreden]', probe=dict(id='ueberreden', dc=14, mod=dict(ruhig=-2, erinnerung=-1)),
      erfolg=dict(text='Lange Stille. Dann streckt {A} die Hand aus. {B} schlägt ein – zögernd, aber ein.', folgen=dict(beute=dict(stufe=2, chance=0.9, text='Beide legen zusammen und schenken dir etwas. „Ohne dich hätten wir uns die Köpfe eingeschlagen.“'), sym={'A': 4, 'B': 4, 'C': 3}, merkt={'A': '{held} hat einen Frieden gefunden, den ich nicht gesehen habe.', 'B': '{held} hat uns beide überredet. Klug.'}, chronik=['brett_grenze_frieden', 'Ich habe den Grenzstreit zwischen {A} und {B} geschlichtet.']), weiter='ende'),
      misserfolg=dict(text='„Teilen? Mit dem?“ Beide gehen im Zorn. Der Streit ist nicht vorbei.', folgen=dict(sym={'A': -2, 'B': -2}, chronik=['brett_grenze_offen', 'Der Grenzstreit zwischen {A} und {B} schwelt weiter.']), weiter='ende'))]),
  'ende': dict(ort='dorf', ende=True, text='Der Stein steht, wo er steht. Ob die Wunden heilen, wird sich zeigen.'),
}))

V.append(dict(id='fieber', titel='Fieber im Dorf', schwierigkeit=2,
  kurz='Das Kind von {A} glüht vor Fieber. Die Kräuter im Dorf sind aufgebraucht – im Wald wächst Weidenröschen, aber dort streunen Wölfe.',
  rollen={'A': 'Elternteil', 'B': 'Kundige Person'},
  start='krank', szenen={
  'krank': dict(ort='dorf', text='Im Halbdunkel der Hütte liegt ein Kind unter Fellen, das Gesicht nass vom Schweiß. {A} hält seine Hand. „{B} sagt, nur frisches Weidenröschen hilft noch.“', optionen=[
    dict(text='Das Kind selbst untersuchen', tag='[Heilkunde]', probe=dict(id='heilkunde', dc=12),
      erfolg=dict(text='Du kühlst die Stirn mit nassen Tüchern und flößt Wasser ein. Das verschafft Zeit.', folgen=dict(flag=['zeit']), weiter='aufbruch'),
      misserfolg=dict(text='Du weißt nicht genug darüber. Es bleibt nur der Wald.', weiter='aufbruch')),
    dict(text='„Ich hole die Kräuter.“', weiter='aufbruch')]),
  'aufbruch': dict(ort='wald', text='Der Wald ist still und kalt. Irgendwo in den Senken soll das Weidenröschen wachsen.', reise=dict(minuten=2, weiter='senke', begegnung=dict(chance=0.5, szenen=['woelfe']))),
  'woelfe': dict(ort='wald', gefahr=True, text='Zwei Wölfe treten aus dem Unterholz. Mager, hungrig, wachsam.', optionen=[
    dict(text='Warnschuss', tag='[Bogen]', wenn=dict(item='bogen'), probe=dict(id='flink', dc=10),
      erfolg=dict(text='Der Pfeil fährt zwischen ihnen in den Boden. Sie fliehen.', weiter='senke'),
      misserfolg=dict(text='Daneben – einer springt dich an, bevor beide abhauen.', folgen=dict(gefahr=1), weiter='senke')),
    dict(text='Groß machen und brüllen', tag='[Einschüchtern]', probe=dict(id='einschuechtern', dc=12),
      erfolg=dict(text='Sie weichen zurück.', weiter='senke'),
      misserfolg=dict(text='Ein Biss, dann sind sie fort.', folgen=dict(gefahr=1), weiter='senke')),
    dict(text='{bb} kennt sich mit Tieren aus', tag='[{bb}]', wenn=dict(begleiter_beruf=['Jäger', 'Jägerin', 'Hirte', 'Falknerin']), weiter='senke', ergebnis='{bb} führt euch in weitem Bogen gegen den Wind vorbei.', folgen=dict(begleiter_sym=2))]),
  'senke': dict(ort='wald', text='In einer feuchten Senke leuchten violette Blüten. Daneben: ein zweiter Strauch – größer, aber du bist nicht sicher, ob er nicht giftig ist.', optionen=[
    dict(text='Die Pflanzen genau bestimmen', tag='[Heilkunde]', probe=dict(id='heilkunde', dc=11),
      erfolg=dict(text='Der kleine ist das Weidenröschen, der große ist Fingerhut – giftig. Gut, dass du hingesehen hast.', folgen=dict(flag=['richtig']), weiter='rueckweg'),
      misserfolg=dict(text='Du nimmst von beiden. Sicher ist sicher.', folgen=dict(flag=['beides']), weiter='rueckweg')),
    dict(text='Einfach den großen Strauch nehmen – mehr hilft mehr', weiter='rueckweg', folgen=dict(flag=['falsch']))]),
  'rueckweg': dict(ort='wald', text='Mit vollen Taschen eilst du zurück.', reise=dict(minuten=1, weiter='heilen')),
  'heilen': dict(ort='dorf', text='{B} nimmt dir die Pflanzen ab und betrachtet sie genau.', optionen=[
    dict(text='Abwarten', wenn=dict(flag='richtig'), weiter='ende_gut', ergebnis='„Genau das“, murmelt {B} und braut einen Sud. In der Nacht sinkt das Fieber.',
      folgen=dict(sym={'A': 8, 'B': 3}, merkt={'A': '{held} hat meinem Kind das Leben gerettet.', 'B': '{held} kennt sich mit Kräutern aus. Das hätte ich nicht gedacht.'}, chronik=['brett_fieber_gerettet', 'Ich habe Weidenröschen für das kranke Kind von {A} geholt. Es ist wieder gesund.'])),
    dict(text='Abwarten', wenn=dict(flag='beides'), weiter='ende_gut', ergebnis='{B} sortiert den Fingerhut aus und schüttelt den Kopf. „Gut, dass du mir beides gebracht hast.“ Das Fieber sinkt bis zum Morgen.',
      folgen=dict(sym={'A': 6, 'B': 2}, merkt={'A': '{held} hat Kräuter für mein Kind geholt.'}, chronik=['brett_fieber_gerettet', 'Ich habe Kräuter für das kranke Kind von {A} geholt. Es ist wieder gesund.'])),
    dict(text='Abwarten', wenn=dict(flag='falsch'), weiter='ende_knapp', ergebnis='{B} wird bleich. „Das ist Fingerhut! Hätte ich das gekocht …“ {B} schickt dich noch einmal los, diesmal mit genauer Beschreibung. Erst im Morgengrauen sinkt das Fieber.',
      folgen=dict(sym={'A': 2, 'B': -2}, merkt={'B': '{held} hätte beinahe Gift gebracht. Gut, dass ich nachgesehen habe.'}, chronik=['brett_fieber_knapp', 'Ich hätte dem kranken Kind von {A} beinahe Gift gebracht. Es ging gerade noch gut.']))]),
  'ende_gut': dict(ort='dorf', ende=True, text='Am nächsten Tag sitzt das Kind schon wieder am Feuer und fragt, wann du mal wieder Geschichten erzählst.', folgen=dict(beute=dict(stufe=2, chance=1, text='{A} besteht darauf, dass du etwas annimmst. „Ohne dich … nimm es. Bitte.“'))),
  'ende_knapp': dict(ort='dorf', ende=True, text='Das Kind wird gesund. Aber du wirst diese Nacht nicht so schnell vergessen.'),
}))

V.append(dict(id='hohlweg', titel='Die Räuber vom Hohlweg', schwierigkeit=3,
  kurz='Am Hohlweg werden Reisende überfallen. {A} hat dort Waren verloren und will, dass jemand die Räuber vertreibt – so oder so.',
  rollen={'A': 'Geschädigte Person', 'B': 'Wer die Gegend kennt'},
  start='auftrag', szenen={
  'auftrag': dict(ort='dorf', text='{A} zeigt dir einen zerrissenen Beutel. „Drei Männer, vermummt. Sie haben alles genommen. Wenn das so weitergeht, kommt kein Händler mehr zu uns.“ {B} fügt leise hinzu: „Ich kenne einen Pfad oberhalb des Hohlwegs.“', optionen=[
    dict(text='Den oberen Pfad nehmen und die Räuber beobachten', weiter='pfad'),
    dict(text='Offen den Hohlweg hinaufgehen – sollen sie nur kommen', weiter='offen')]),
  'pfad': dict(ort='wald', text='Ihr klettert über Wurzeln und Geröll, bis ihr auf den Hohlweg hinabsehen könnt.', reise=dict(minuten=2, weiter='lager')),
  'offen': dict(ort='wald', text='Der Hohlweg ist eng, die Böschungen hoch. Ein guter Ort für einen Hinterhalt.', reise=dict(minuten=1, weiter='hinterhalt')),
  'hinterhalt': dict(ort='wald', gefahr=True, text='Steine poltern. Drei Gestalten springen auf den Weg, Knüppel und ein rostiges Messer in den Händen. „Beutel her!“', optionen=[
    dict(text='Kämpfen', tag='[Anpacken]', probe=dict(id='anpacken', dc=14),
      erfolg=dict(text='Du schlägst den ersten nieder, die anderen zögern. Einer lässt die Kapuze fallen – ein abgemagerter Junge.', folgen=dict(flag=['gesiegt']), weiter='entlarvt'),
      misserfolg=dict(text='Ein Knüppel trifft dich hart. Aber dann rutscht einem die Kapuze herunter – ein Junge, kaum älter als fünfzehn.', folgen=dict(gefahr=2), weiter='entlarvt')),
    dict(text='Die Waffe ziehen und drohen', tag='[Einschüchtern]', wenn=dict(item_eines=['schwert', 'axt', 'dolch', 'saebel', 'speer']), probe=dict(id='einschuechtern', dc=12),
      erfolg=dict(text='Stahl blitzt. Die drei weichen zurück, einer stolpert und verliert die Kapuze – ein Junge.', weiter='entlarvt'),
      misserfolg=dict(text='Sie greifen trotzdem an.', folgen=dict(gefahr=2), weiter='entlarvt')),
    dict(text='„Wartet. Warum tut ihr das?“', tag='[Menschenkenntnis]', probe=dict(id='menschenkenntnis', dc=13),
      erfolg=dict(text='Du siehst die zitternden Hände, die eingefallenen Wangen. Das sind keine Räuber. Das sind Hungrige.', folgen=dict(flag=['verstanden']), weiter='entlarvt'),
      misserfolg=dict(text='Die Antwort ist ein Knüppelhieb.', folgen=dict(gefahr=2), weiter='entlarvt'))]),
  'lager': dict(ort='wald', text='Unter euch, in einer Felsnische: ein armseliges Lager. Drei Männer – nein, zwei Männer und ein Junge – teilen sich einen dürren Hasen. Neben ihnen liegen {A}s Waren, unberührt.', optionen=[
    dict(text='Lauschen', tag='[Schleichen]', probe=dict(id='flink', dc=12),
      erfolg=dict(text='„Die Waren tauschen wir in Salzwacht gegen Korn. Dann gehen wir heim nach Erzklamm. Seit die Mine eingestürzt ist …“', folgen=dict(flag=['verstanden', 'unentdeckt']), weiter='entscheidung'),
      misserfolg=dict(text='Ein Stein löst sich. Die drei springen auf.', weiter='hinterhalt')),
    dict(text='Ein Seil spannen und eine Falle am Ausgang der Nische stellen', tag='[Anpacken]', wenn=dict(item='seil'), probe=dict(id='anpacken', dc=11),
      erfolg=dict(text='Die Falle sitzt. Wenn sie fliehen wollen, gehen sie zu Boden.', folgen=dict(flag=['falle']), weiter='entscheidung'),
      misserfolg=dict(text='Das Seil verheddert sich.', weiter='entscheidung')),
    dict(text='Hinuntersteigen und sie stellen', weiter='entscheidung')]),
  'entlarvt': dict(ort='wald', text='Der Älteste hebt die Hände. „Wir sind aus Erzklamm. Die Mine ist eingestürzt, es gibt kein Brot mehr. Wir wollten niemandem wehtun.“', optionen=[
    dict(text='Weiter', weiter='entscheidung')]),
  'entscheidung': dict(ort='wald', text='Die Räuber sind in deiner Hand. {A}s Waren liegen da. Was jetzt?', optionen=[
    dict(text='Die Waren nehmen und sie laufen lassen', weiter='ende', ergebnis='Sie verschwinden zwischen den Bäumen. Einer dreht sich noch einmal um und nickt dir zu.',
      folgen=dict(beute=dict(stufe=3, chance=0.8, text='Am Wegrand, wo sie gelagert haben, liegt etwas zurückgelassen – vielleicht absichtlich, als Dank.'), sym={'A': 4}, merkt={'A': '{held} hat meine Waren zurückgebracht. Die Räuber sind fort.'}, chronik=['brett_hohlweg_frei', 'Ich habe die Räuber vom Hohlweg laufen lassen – hungrige Leute aus Erzklamm.'])),
    dict(text='Sie gefangen nehmen und ins Dorf bringen', tag='[Anpacken]', probe=dict(id='anpacken', dc=12, mod=dict(falle=-4, gesiegt=-2)),
      erfolg=dict(text='Gefesselt führst du sie ins Dorf. {A} ist zufrieden. Was mit ihnen geschieht, entscheidet die Versammlung.', folgen=dict(beute=dict(stufe=3, chance=1, text='{A} gibt dir als Belohnung etwas aus der zurückgewonnenen Ware.'), sym={'A': 6, 'B': 1}, merkt={'A': '{held} hat die Räuber gefangen. Endlich Ruhe.'}, chronik=['brett_hohlweg_gefangen', 'Ich habe die Räuber vom Hohlweg gefangen ins Dorf gebracht.']), weiter='ende'),
      misserfolg=dict(text='Zwei entkommen, nur der Junge bleibt zurück. Er weint.', folgen=dict(sym={'A': 3}, chronik=['brett_hohlweg_junge', 'Am Hohlweg habe ich einen jungen Räuber aus Erzklamm gefangen. Die anderen sind entkommen.']), weiter='ende')),
    dict(text='„Kommt mit ins Dorf. Arbeit gegen Brot – das ist besser als der Hohlweg.“', tag='[Überreden]', probe=dict(id='ueberreden', dc=14, mod=dict(verstanden=-3)),
      erfolg=dict(text='Lange Stille. Dann nickt der Älteste. „Wenn ihr uns nehmt, arbeiten wir.“ {A} ist skeptisch, aber die Waren sind zurück.', folgen=dict(beute=dict(stufe=3, chance=1, text='Der Älteste gibt dir das Einzige, was er von zu Hause mitgenommen hat. „Damit du weißt, dass wir es ernst meinen.“'), sym={'A': 2, 'B': 4}, merkt={'A': '{held} hat die Räuber ins Dorf geholt. Ich traue ihnen nicht. Aber meine Waren sind zurück.', 'B': '{held} hat aus Räubern Arbeiter gemacht. Mutig.'}, chronik=['brett_hohlweg_arbeit', 'Ich habe den Räubern vom Hohlweg Arbeit im Dorf angeboten. Sie kamen mit.'], journal=['erzklamm_fluechtlinge', 'Leute aus Erzklamm', 'Drei Männer aus Erzklamm arbeiten jetzt im Dorf. In Erzklamm herrscht Hunger, seit die Mine eingestürzt ist.']), weiter='ende'),
      misserfolg=dict(text='„Damit ihr uns dann aufknüpft? Nein.“ Sie lassen die Waren fallen und fliehen.', folgen=dict(sym={'A': 3}), weiter='ende'))]),
  'ende': dict(ort='dorf', ende=True, text='Der Hohlweg ist wieder frei. Doch Erzklamm hungert, und das wird nicht die letzte Geschichte sein.'),
}))

V.append(dict(id='brand', titel='Feuer in der Nacht', schwierigkeit=3,
  kurz='Mitten in der Nacht brennt die Scheune von {A}. Jemand behauptet, {B} sei kurz vorher dort gewesen.',
  rollen={'A': 'Geschädigte Person', 'B': 'Beschuldigte Person', 'C': 'Wer etwas gesehen hat'},
  start='feuer', szenen={
  'feuer': dict(ort='dorf', gefahr=True, text='Rufe reißen dich aus dem Schlaf. Flammen schlagen aus dem Dach der Scheune von {A}. Drinnen brüllt das Vieh.', optionen=[
    dict(text='Hineinlaufen und das Vieh befreien', tag='[Flink]', probe=dict(id='flink', dc=13),
      erfolg=dict(text='Du reißt das Tor auf, die Tiere stürmen hinaus. Hinter dir kracht ein Balken.', folgen=dict(flag=['vieh'], sym={'A': 4}), weiter='loeschen'),
      misserfolg=dict(text='Rauch, Hitze, ein brennender Balken streift dich. Aber die Tiere sind draußen.', folgen=dict(flag=['vieh'], sym={'A': 4}, gefahr=2), weiter='loeschen')),
    dict(text='Eine Eimerkette organisieren', tag='[Überreden]', probe=dict(id='ueberreden', dc=11),
      erfolg=dict(text='Auf dein Kommando reihen sich alle auf. Eimer um Eimer fliegt ins Feuer.', folgen=dict(flag=['kette']), weiter='loeschen'),
      misserfolg=dict(text='Alle laufen durcheinander.', weiter='loeschen'))]),
  'loeschen': dict(ort='dorf', text='Im Morgengrauen ist das Feuer aus. Die Scheune ist eine schwarze Ruine. {C} zieht dich beiseite: „Ich hab {B} gestern Abend dort gesehen. Mit einer Laterne.“', optionen=[
    dict(text='Die Brandstelle untersuchen', tag='[Spuren lesen]', probe=dict(id='spuren', dc=14),
      erfolg=dict(text='Das Feuer begann nicht am Tor, wo {B} gestanden haben soll, sondern hinten, bei der Heuluke. Dort liegt eine umgekippte Öllampe – die von {A} selbst.', folgen=dict(flag=['unfall']), weiter='anklage'),
      misserfolg=dict(text='Asche und Ruß. Nichts, was eindeutig wäre.', weiter='anklage')),
    dict(text='{C} genauer befragen', tag='[Menschenkenntnis]', probe=dict(id='menschenkenntnis', dc=13),
      erfolg=dict(text='{C} weicht deinem Blick aus. Zwischen {C} und {B} gibt es alten Streit – um ein Mädchen, vor Jahren.', folgen=dict(flag=['groll']), weiter='anklage'),
      misserfolg=dict(text='{C} klingt sicher.', weiter='anklage'))]),
  'anklage': dict(ort='dorf', text='Das halbe Dorf steht vor der Ruine. {A} zeigt auf {B}. „Warst du es?“ {B} schüttelt stumm den Kopf. Alle sehen dich an.', optionen=[
    dict(text='„Es war ein Unfall. Die Lampe von {A} lag an der Heuluke.“', wenn=dict(flag='unfall'), weiter='ende',
      ergebnis='Ein Raunen. {A} wird rot und senkt den Kopf. {B} sieht dich an, als hättest du gerade ein Leben gerettet – und vielleicht hast du das.',
      folgen=dict(beute=dict(stufe=3, chance=1, text='Am nächsten Morgen drückt dir {B} ein Erbstück in die Hand. „Du hast mir mehr gerettet als meinen Ruf.“'), sym={'B': 8, 'A': 1, 'C': -3}, merkt={'B': '{held} hat bewiesen, dass ich es nicht war. Ich stehe in dieser Schuld.', 'C': '{held} hat mich vor allen bloßgestellt.'}, chronik=['brett_brand_unfall', 'Ich habe bewiesen, dass der Brand bei {A} ein Unfall war – und {B} vor einer falschen Anklage bewahrt.'])),
    dict(text='„{C} hat einen alten Groll gegen {B}. Ich glaube {C} nicht.“', wenn=dict(flag='groll'), weiter='ende',
      ergebnis='{C} läuft rot an und geht. Der Verdacht gegen {B} bleibt im Raum – aber er wackelt.',
      folgen=dict(sym={'B': 4, 'C': -5}, merkt={'C': '{held} hat mich vor allen einen Lügner genannt.', 'B': '{held} hat zu mir gehalten.'}, chronik=['brett_brand_groll', 'Beim Brand bei {A} habe ich die Aussage von {C} angezweifelt.'])),
    dict(text='„Ich weiß es nicht. Aber ohne Beweis wird niemand verurteilt.“', tag='[Beruhigen]', probe=dict(id='beruhigen', dc=13),
      erfolg=dict(text='Die Menge murrt, aber sie zerstreut sich. Niemand wird heute bestraft.', folgen=dict(sym={'B': 3}), weiter='ende'),
      misserfolg=dict(text='„Wer soll es sonst gewesen sein?“ {B} muss das Dorf für eine Weile meiden.', folgen=dict(sym={'B': -2, 'A': 2}, chronik=['brett_brand_verdacht', 'Nach dem Brand bei {A} fällt ein Schatten auf {B}.']), weiter='ende')),
    dict(text='{B} beschuldigen', weiter='ende', ergebnis='{B} sieht dich an, als hättest du zugeschlagen. Dann geht {B}, ohne ein Wort.',
      folgen=dict(sym={'A': 4, 'B': -10, 'C': 3}, merkt={'B': '{held} hat mich verurteilt, ohne Beweis. Das verzeihe ich nicht.', 'A': '{held} hat mir geholfen, den Schuldigen zu finden.'}, chronik=['brett_brand_schuld', 'Ich habe {B} für den Brand bei {A} verantwortlich gemacht.']))]),
  'ende': dict(ort='dorf', ende=True, text='Die Scheune muss neu gebaut werden. Und was in dieser Nacht gesagt wurde, bleibt.'),
}))

out = [{'id': 'b_' + v['id'], 'titel': v['titel'], 'kurz': v['kurz'], 'schwierigkeit': v['schwierigkeit'], 'rollen': v['rollen'], 'def': {'start': v['start'], 'szenen': v['szenen']}} for v in V]
# Prüfen: alle Ziele vorhanden
for q in out:
    sz = q['def']['szenen']
    def tg(o):
        for k in ('weiter',):
            if k in o: yield o[k]
        for b in ('erfolg', 'misserfolg'):
            if b in o and 'weiter' in o[b]: yield o[b]['weiter']
    for k, s in sz.items():
        for o in s.get('optionen', []):
            for t in tg(o): assert t in sz, (q['id'], k, t)
        if 'reise' in s:
            assert s['reise']['weiter'] in sz
            for t in s['reise'].get('begegnung', {}).get('szenen', []): assert t in sz, (q['id'], t)
    assert any(s.get('ende') for s in sz.values())
json.dump(out, open('quests/brett.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'Vorlagen', sum(len(q['def']['szenen']) for q in out), 'Szenen')
