# Hauptquest Kapitel 4 „Der Brief des Königs“ und neue Aushänge für den Dorfmeister (eine Entscheidung pro Tag).
# Erzeugt migrations/035_kapitel4_aufgaben.sql.
# Rollen der Aushänge: T/O/H = Bewohner (Namensfiguren zuerst). Folgen: res, stim, sym, gunst, ansehen, verbannen, zuzug,
# neu: bau (Gebäude, das der Rat als Nächstes plant), welt ({ort, art, grund}: Abkommen oder Feindschaft mit einem Ort der Weltkarte).
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qlib import O, B, P, S, R, MG, K, E, pruefe

# ───────────── Kapitel 4: Der Brief des Königs ─────────────
Z = {}
Z['siegel'] = S('dorf', 'Ein Reiter in Grün und Gold hält vor dem Langhaus. Er überreicht dir einen Brief mit dem Siegel des goldenen Hirschs: König Ottokar ruft den neuen Dorfmeister an seinen Hof nach Moosherz – zur Huldigung, „und um zu sehen, wem wir das Hügelland anvertrauen“. {A} liest über deine Schulter mit und pfeift leise.',
  O('„Wir brechen morgen früh auf. {A}, du kommst mit.“', 'vertretung', ergebnis='{A} grinst. „Endlich mal raus hier.“', folgen={'sym': {'A': 3}}),
  O('Den Reiter nach Neuigkeiten aus Moosherz fragen', 'reiter'))
Z['reiter'] = S('dorf', 'Der Reiter nimmt einen Schluck Wasser. „Der König ist alt, aber nicht dumm. Graf Wulfhard von Rabenfels hat in letzter Zeit viele Dorfmeister zu Gast. Man sagt, er schenkt großzügig.“ Er sieht dich an. „Der König will wissen, wem Ihr dient.“',
  O('„Wir brechen morgen früh auf.“', 'vertretung', folgen={'flag': 'gewarnt'}))
Z['vertretung'] = S('dorf', 'Wer führt das Dorf, während du fort bist? {B} hat sich angeboten. {V} sitzt daneben und sagt nichts.',
  O('{B} vertritt mich', 'abschied', ergebnis='{B} richtet sich auf. „Ich passe auf, versprochen.“', folgen={'sym': {'B': 4}, 'flag': 'vertretung_b'}),
  O('{V} kennt das Amt – {V} vertritt mich', 'abschied', ergebnis='{V} nickt langsam. „Das ehrt mich. Geh nur.“', folgen={'sym': {'V': 5}, 'flag': 'vertretung_v'}))
Z['abschied'] = R('dorf', 'Im Morgengrauen stehen die Leute am Tor. Jemand drückt dir ein Brot in die Hand, ein Kind einen Stein mit Loch – „für Glück“.', 90, 'furtenau',
  unterwegs='Ihr folgt dem Silberlauf nach Süden. Die Wiesen werden weiter, die Dörfer größer.')
Z['furtenau'] = S('dorf', 'Furtenau ist voller Wagen, die auf die Furt warten. In der Schenke am Ufer fällt dir eine Gruppe in grauen Mänteln auf. Einer fragt den Wirt ein wenig zu laut, ob „der neue Meister aus dem Hügelland“ schon durch sei.',
  P('Unauffällig zuhören', 'menschenkenntnis', 12,
    B('Sie tragen unter den Mänteln ein Zeichen: einen schwarzen Raben. Männer aus Rabenfels – und sie warten auf dich.', 'aufbruch_furt', {'flag': 'raben_erkannt'}),
    B('Du verstehst nur Bruchstücke. Etwas über „den Brief“ und „die Brücke“.', 'aufbruch_furt')),
  O('Nicht auffallen und früh weiterziehen', 'aufbruch_furt'))
Z['aufbruch_furt'] = R('wald', 'Über die Furt, dann die alte Königsstraße entlang. Die Wälder um den Lichtwald stehen still.', 75, 'bruecke',
  unterwegs='Ihr reitet abwechselnd, {A} summt ein Lied aus dem Dorf.')
Z['bruecke'] = S('wald', 'An der Steinbrücke über den Ginsterbach versperrt ein umgestürzter Wagen den Weg. Zu ordentlich umgestürzt. Aus dem Gebüsch treten fünf Männer, Raben auf den Mänteln. „Den Brief, Meister. Und dann reitet heim.“',
  O('Die Waffe ziehen', 'kampf'),
  P('„Die Königswache reitet eine Stunde hinter uns.“', 'ueberreden', 13,
    B('Der Anführer zögert, sieht die Straße hinunter – und pfeift seine Leute zurück. „Wir sehen uns, Meister.“', 'nach_bruecke', {'flag': 'bluff'}),
    B('„Lüge“, sagt der Anführer ruhig. Seine Männer ziehen die Klingen.', 'kampf')),
  P('Durchs Unterholz ausweichen', 'flink', 11,
    B('Ihr schlagt euch ins Dickicht und kommt hinter der Brücke wieder auf die Straße. Niemand folgt euch.', 'nach_bruecke'),
    B('Ein Pfeil streift {A}s Arm, aber ihr kommt durch. Das kostet Kraft und Zeit.', 'nach_bruecke', {'sym': {'A': -1}})))
Z['kampf'] = K('wald', 'Die Raben greifen an.', 'Überfall an der Brücke', 'banditen', 480,
  B('Die letzten Angreifer fliehen in den Wald. Einer lässt eine Ledertasche fallen.', 'tasche'),
  B('Ihr müsst zurückweichen, aber der Brief bleibt in deiner Hand. Die Raben verschwinden mit eurem Proviant.', 'nach_bruecke', {'dorf': {'nahrung': -3}}),
  schwer=2, kampfort='wald')
Z['tasche'] = S('wald', 'In der Tasche: ein Brief mit dem Rabensiegel. „Bietet dem neuen Meister des Hügellands Silber. Nimmt er an, gehört das Land bald uns. Nimmt er nicht an – sorgt dafür, dass er den König nie erreicht.“ Unterzeichnet: W.',
  O('Den Brief einstecken – der König soll ihn sehen', 'nach_bruecke', folgen={'flag': 'rabenbrief'}),
  O('Den Brief verbrennen – keine Händel mit Grafen', 'nach_bruecke', folgen={'flag': 'brief_verbrannt'}))
Z['nach_bruecke'] = R('wald', 'Hinter der Brücke öffnet sich das Land. Am Abend seht ihr die Türme von Moosherz über dem Fluss.', 75, 'tor',
  unterwegs='Ihr reitet schweigend. {A} sieht sich öfter um als sonst.')
Z['tor'] = S('stadt', 'Das Südtor von Moosherz: Wachen in Grün und Gold, Händler, Bettler, Ochsenkarren. Ein Torwächter verlangt Zoll „für Fremde ohne Geleit“.',
  O('Das königliche Siegel zeigen', 'markt', ergebnis='Der Wächter wird blass, verbeugt sich und winkt euch durch.'),
  O('Zahlen – kein Aufsehen', 'markt', ergebnis='Zwei Ballen Tuch wechseln den Besitzer. Der Wächter grinst.', folgen={'dorf': {'waren': -2}}))
Z['markt'] = S('stadt', 'Moosherz ist laut und riesig. Am Dom läuten Glocken, auf dem Markt riecht es nach Salz aus Salzwacht und Wein aus der Ostmark. Bis zur Audienz bleibt ein halber Tag.',
  O('Ein Geschenk für den König kaufen', 'vorzimmer', ergebnis='Ein Krug Honigwein aus dem Hügelland, in feines Leinen gebunden. Nicht teuer – aber ehrlich.', folgen={'flag': 'geschenk', 'dorf': {'waren': -3}}),
  P('Den Schreiber der Kanzlei ausfindig machen', 'feilschen', 12,
    B('Für ein paar Münzen verrät er dir, was der König von neuen Meistern hören will: „Wahrheit. Er hasst Schmeichler.“', 'vorzimmer', {'flag': 'tipp_wahrheit'}),
    B('Der Schreiber nimmt die Münzen und sagt nur: „Seid pünktlich.“', 'vorzimmer')),
  O('Direkt zur Burg gehen', 'vorzimmer'))
Z['vorzimmer'] = MG('burg', 'Im Vorzimmer warten andere Dorfmeister: der dicke Müller aus Hollerbrück, eine strenge Frau aus Goldacker. Ein Hofmeister erklärt im Eiltempo, wer wann vortritt, wann man kniet und wie man den König anspricht.', 'merken', 2, 'Die Ordnung des Hofes',
  B('Du sagst dir alles im Kopf vor. Als dein Name fällt, weißt du genau, was zu tun ist.', 'thron', {'flag': 'etikette'}),
  B('Zu viel auf einmal. Du hoffst, dass dir niemand übel nimmt, wenn du einen Schritt zu früh kniest.', 'thron', {'flag': 'fauxpas'}),
  spieltext='Merke dir die Reihenfolge des Hofes.')
Z['thron'] = S('burg', 'Der Thronsaal ist kühl und hoch. König Ottokar ist alt, sein Bart weiß, aber seine Augen folgen jeder Bewegung. „Das Hügelland hat also einen neuen Meister.“ Er mustert dich lange. „Wem dienst du?“',
  O('„Euch, mein König. Und meinem Dorf.“ – Die Treue schwören', 'forderung', ergebnis='Der König nickt knapp. „Beides zugleich. Das ist schwerer, als du denkst.“', folgen={'gunst': 10, 'flag': 'treue'}),
  P('Treue schwören – und um einen Steuernachlass für den Winter bitten', 'ueberreden', 14,
    B('Ein Raunen geht durch den Saal. Dann lacht der König. „Mut hat er. Gut – ein Winter ohne Abgaben. Danach sehen wir weiter.“', 'forderung', {'gunst': 6, 'flag': ['treue', 'nachlass']}),
    B('Das Lächeln des Königs wird dünn. „Du kommst zum ersten Mal an meinen Hof und feilschst?“ Er winkt ab.', 'forderung', {'gunst': -4, 'flag': 'treue'})),
  O('Den Brief aus Rabenfels vorlegen', 'enthuellung', wenn={'flag': 'rabenbrief'}),
  O('„Mein Dorf dient sich selbst, Majestät. Aber wir sind gute Nachbarn.“', 'forderung', ergebnis='Totenstille. Ein Höfling hustet. Der König sagt nur: „Wir werden sehen.“', folgen={'gunst': -15, 'flag': 'eigenwillig', 'ansehen': 4}))
Z['enthuellung'] = S('burg', 'Der König liest den Brief zweimal. Dann reicht er ihn seiner Kanzlerin, ohne den Blick von dir zu nehmen. „Wulfhard.“ Er sagt es leise, und alle im Saal werden still. „Du hättest das Silber nehmen können.“',
  O('„Ich habe es nicht einmal angeboten bekommen. Nur Klingen an einer Brücke.“', 'rechte_hand'),
  O('„Mein Dorf ist nicht zu verkaufen.“', 'rechte_hand'))
Z['rechte_hand'] = S('burg', '„Dann sollst du meine Augen und Ohren im Hügelland sein.“ Der König steht auf – zum ersten Mal an diesem Tag. „Was dort geschieht, will ich wissen, bevor es Rabenfels weiß.“ Ein Diener bringt einen schmalen Ring mit dem Hirsch.',
  O('Den Ring annehmen', 'forderung', ergebnis='Der Ring ist kalt und schwer. Ein Versprechen – und eine Last.', folgen={'gunst': 20, 'flag': ['treue', 'rechte_hand'], 'ansehen': 6, 'item_plus': {'ring_des_koenigs': 1}}))
Z['forderung'] = S('burg', '„Nun zum Geschäft.“ Die Kanzlerin entrollt eine Karte. „Das Hügelland liegt offen zwischen Rabenfels und uns. Der König erwartet einen Beitrag.“',
  O('Zwei Leute für die Winterwache in Moosherz stellen', 'bankett', ergebnis='Die Kanzlerin notiert es. „Zwei kräftige Arme. Gut.“', folgen={'gunst': 6, 'flag': 'wache_gestellt', 'dorf': {'stimmung': -2}}),
  O('Korn als Abgabe liefern', 'bankett', ergebnis='„Zwanzig Säcke bis zum ersten Schnee.“ Das wird das Dorf spüren.', folgen={'gunst': 4, 'dorf': {'nahrung': -12}}, wenn={'nicht_flag': 'nachlass'}),
  O('Eine Palisade bauen – sie schützt das Hügelland und das Königreich', 'bankett', ergebnis='Die Kanzlerin hebt eine Braue, dann nickt sie. „Ein Bollwerk an der Grenze. Der König wird es gern sehen.“ Daheim wird der Rat die Palisade als Nächstes planen.', folgen={'gunst': 5, 'bau': 'palisade', 'flag': 'palisade_versprochen'}))
Z['bankett'] = S('burg', 'Am Abend gibt es ein Bankett. Neben dir sitzt der Gesandte der Markgräfin Ysolde aus Brandenstein, ihm gegenüber ein schweigsamer Mann mit Rabenring.',
  O('Mit dem Gesandten der Ostmark über Wein und Handel reden', 'heimweg', ergebnis='Er ist charmant und klug. Zum Abschied sagt er: „Brandenstein vergisst keine Freunde.“', folgen={'flag': 'ostmark_kontakt', 'welt': {'ort': 'brandenstein', 'art': 'handel', 'grund': 'Wein gegen Holz aus dem Hügelland'}}),
  O('Den Mann mit dem Rabenring beobachten', 'heimweg', ergebnis='Er verlässt das Bankett früh. Draußen wartet ein Reiter auf ihn – Richtung Norden.', folgen={'flag': 'rabe_beobachtet'}),
  O('Früh schlafen gehen – morgen ist ein langer Ritt', 'heimweg'))
Z['heimweg'] = R('wald', 'Im ersten Licht verlasst ihr Moosherz. Die Straße nach Norden kommt dir kürzer vor als auf dem Hinweg.', 120, 'heimkehr',
  unterwegs='{A} erzählt jedem Bauern am Weg, dass „unser Meister beim König war“.')
Z['heimkehr'] = S('dorf', 'Am Tor wartet das halbe Dorf. {B} und {V} stehen vorne. „Und?“, ruft jemand. „Was hat der König gesagt?“',
  O('Alles erzählen – auch von den Raben an der Brücke', 'ende', ergebnis='Die Leute hören still zu. Am Ende sagt {V}: „Dann wissen wir jetzt, wo wir stehen.“', folgen={'sym': {'V': 3, 'B': 2}}),
  O('Nur sagen: „Der König vertraut uns.“', 'ende', ergebnis='Jubel. Für heute reicht das.', folgen={'dorf': {'stimmung': 3}}))
Z['ende'] = E('dorf', 'Abends am Feuer drehst du den Brief des Königs in der Hand. Das Hügelland liegt zwischen zwei Mächten – und dein Dorf mittendrin. Was als Nächstes kommt, wird die Chronik erzählen.',
  {'ansehen': 15, 'kapitel': 5, 'journal': ['chronik_4', 'Der Brief des Königs', 'König Ottokar hat den neuen Dorfmeister des Hügellands empfangen. Graf Wulfhard von Rabenfels streckt die Hand nach dem Hügelland aus. Das Dorf liegt zwischen den Mächten.']})

KAP4 = dict(id='chronik_4', kapitel=4, titel='Der Brief des Königs', kurz='König Ottokar ruft den neuen Dorfmeister an seinen Hof nach Moosherz. Der Weg dorthin ist weiter, als es auf der Karte aussieht.',
  rollen={'V': 'Vorsteher', 'A': 'Wer dich begleitet', 'B': 'Wer das Dorf vertritt'}, start='siegel', szenen=Z, reise=True, ziel='moosherz')
pruefe('chronik_4', 'siegel', Z)

# ───────────── Neue Aushänge ─────────────
EV = []
def ev(id, art, titel, text, optionen, rollen='', auto=0, gewicht=1, bedingung=None):
    EV.append(dict(id=id, art=art, titel=titel, text=text, optionen=optionen, rollen=list(rollen), auto=auto, gewicht=gewicht, bedingung=bedingung or {}))
def o(text, ergebnis, **f):
    return dict(text=text, ergebnis=ergebnis, folgen=f)

# Rechtsfälle
ev('erbe', 'rechtsfall', 'Das Erbe der alten Gerda', 'Die alte Gerda ist gestorben. {T} und {O} streiten um ihre Hütte: {T} hat sie gepflegt, {O} ist ihr Neffe.', [
  o('Die Hütte geht an {T}, die sie gepflegt hat', '{T} weint vor Erleichterung. {O} spricht wochenlang kein Wort mit dir.', sym={'T': 6, 'O': -5}),
  o('Der Neffe erbt – Blut ist Blut', '{O} zieht ein, {T} bleibt mit leeren Händen. Viele im Dorf finden das hart.', sym={'T': -6, 'O': 4}, stim=-1),
  o('Die Hütte wird geteilt: {T} wohnt, {O} bekommt den Garten', 'Keiner ist glücklich, keiner ganz unglücklich. So ist Recht manchmal.', sym={'T': 2, 'O': 1}, stim=1),
], 'TO')
ev('falsches_mass', 'rechtsfall', 'Das falsche Maß', '{O} hat beim Mehl von {T} nachgewogen: {T}s Scheffel ist kleiner als er sein sollte. {T} sagt, das Holz sei eben geschrumpft.', [
  o('Ein neues, geeichtes Maß für alle anschaffen', 'Ab sofort misst das ganze Dorf mit demselben Maß. Kostet etwas, spart Streit.', res={'waren': -2}, stim=1),
  o('{T} muss den Schaden doppelt ersetzen', '{T} zahlt. Der Ruf ist ruiniert, das Maß jetzt richtig.', sym={'T': -6, 'O': 3}, res={'nahrung': 3}),
  o('Es bei einer Ermahnung belassen', '{T} verspricht Besserung. {O} glaubt kein Wort.', sym={'T': 2, 'O': -3}),
], 'TO')
ev('hundebiss', 'rechtsfall', 'Der bissige Hund', 'Der Hund von {T} hat das Kind von {O} gebissen. Nicht schlimm, aber {O} verlangt, dass der Hund getötet wird.', [
  o('Der Hund muss weg', '{T} bringt den Hund in den Wald. Als er zurückkommt, sieht er niemanden an.', sym={'T': -7, 'O': 4}),
  o('Der Hund kommt an die Kette', 'Der Hund bellt jetzt angekettet. {O} ist halb zufrieden.', sym={'T': 1, 'O': 1}),
  o('{T} zahlt den Heiler und schenkt dem Kind einen Welpen', 'Das Kind ist entzückt. {O} lacht zum ersten Mal seit Tagen.', sym={'T': 2, 'O': 4}, res={'waren': -1}, stim=1),
], 'TO')
ev('wasserrecht', 'rechtsfall', 'Wer bekommt das Wasser?', 'Im Sommer hat {T} den Bach für die eigenen Beete aufgestaut. Unten bei {O} kam kaum noch etwas an. Jetzt will {O} das Wehr einreißen.', [
  o('Feste Tage: jeder bekommt das Wasser abwechselnd', 'Ein Wasserplan hängt am Langhaus. Erstaunlich, wie wenig dann noch gestritten wird.', sym={'T': 1, 'O': 2}, stim=2),
  o('Das Wehr wird eingerissen', '{O} jubelt, {T} flucht. Die Beete oben werden trocken.', sym={'T': -5, 'O': 4}, res={'nahrung': -2}),
  o('{T} darf stauen, muss {O} aber einen Teil der Ernte abgeben', 'Ein Handel, der beiden etwas bringt. {O} murrt trotzdem.', sym={'T': 3, 'O': 0}, res={'nahrung': 2}),
], 'TO')
ev('verleumdung', 'rechtsfall', 'Böse Zungen', '{O} erzählt überall, {T} habe beim letzten Fest die Gemeinschaftskasse angefasst. {T} verlangt, dass {O} das öffentlich zurücknimmt.', [
  o('Die Kasse nachzählen lassen', 'Die Kasse stimmt bis auf den letzten Pfennig. {O} muss sich entschuldigen.', sym={'T': 5, 'O': -4}, stim=1),
  o('Beide zum Schweigen verpflichten', 'Offiziell redet keiner mehr. Inoffiziell wird nun noch mehr geflüstert.', sym={'T': -2, 'O': -1}, stim=-1),
  o('{O} muss eine Woche lang den Dorfplatz fegen', 'Das ganze Dorf sieht {O} fegen. Gelernt hat {O} etwas – geliebt wirst du dafür nicht.', sym={'T': 4, 'O': -6}),
], 'TO')
ev('verlobung', 'rechtsfall', 'Die gebrochene Verlobung', '{T} sollte im Frühjahr heiraten. Nun hat die Braut einen anderen genommen. {T} verlangt die Mitgift zurück, die schon gezahlt war.', [
  o('Die Mitgift muss zurück', '{T} bekommt die Mitgift wieder. Die Braut bekommt die Schadenfreude des Dorfes.', sym={'T': 5}, stim=0),
  o('Die Hälfte – beide Familien tragen Schuld', 'Ein Kompromiss. Am Brunnen redet man trotzdem noch monatelang darüber.', sym={'T': 1}, stim=1),
  o('Das ist Sache der Familien, nicht des Dorfes', '{T} hatte auf dich gehofft. Die Familien werden das unter sich regeln – laut.', sym={'T': -4}, stim=-1),
], 'T')

# Handel
ev('salzhaendler', 'handel', 'Der Salzhändler aus Salzwacht', 'Ein Händler aus Salzwacht bietet einen Wagen voll Salz – genug, um den ganzen Winter Fleisch und Fisch einzulegen. Er will Holz dafür, viel Holz.', [
  o('Salz gegen Holz tauschen', 'Der Händler fährt mit vollem Wagen davon. Im Keller stapeln sich die Fässer mit Gepökeltem.', res={'holz': -25, 'nahrung': 14}, welt={'ort': 'salzwacht', 'art': 'handel', 'grund': 'Salz gegen Holz'}),
  o('Nur die Hälfte nehmen', 'Ein vorsichtiger Handel. Genug für den Winter, nicht mehr.', res={'holz': -12, 'nahrung': 6}),
  o('Ablehnen – Holz brauchen wir selbst', 'Der Händler zuckt mit den Schultern und fährt weiter nach Furtenau.'),
])
ev('kaeseband', 'handel', 'Ein Bund mit Butterau', 'Aus Butterau kommt ein Bote: Sie suchen ein Dorf, das ihnen Holz für neue Ställe liefert. Dafür bieten sie jeden Monat Käse und Butter.', [
  o('Einschlagen – ein fester Handel', 'Ab jetzt rollen jeden Monat Wagen zwischen den Dörfern. Die Leute freuen sich auf den Käse.', res={'holz': -15, 'nahrung': 10}, stim=2, welt={'ort': 'butterau', 'art': 'handel', 'grund': 'Holz gegen Käse und Butter'}),
  o('Erst einmal eine einzelne Lieferung', 'Ein Probehandel. Der Käse ist ausgezeichnet.', res={'holz': -6, 'nahrung': 4}),
  o('Ablehnen', 'Der Bote reitet enttäuscht heim.'),
])
ev('wanderschmied', 'handel', 'Der Wanderschmied', 'Ein Schmied aus Eisgrund zieht durch und bietet an, eine Woche lang Werkzeug zu schmieden – gegen Kost, Logis und ein paar Waren.', [
  o('Ihn aufnehmen', 'Eine Woche lang klingt der Hammer bis in die Nacht. Danach hat jeder Bauer eine scharfe Sichel.', res={'waren': -3, 'nahrung': -3}, stim=2),
  o('Nur Kost und Logis anbieten, keine Waren', 'Er nimmt an, arbeitet aber nur halbe Tage. Immerhin.', res={'nahrung': -2}, stim=1),
  o('Weiterschicken', 'Er zieht weiter nach Furtenau.'),
])
ev('pelzkauf', 'handel', 'Pelzhändler aus Wolfsheim', 'Fallensteller aus Wolfsheim bieten warme Pelze an. Der Winter wird hart, sagen sie. Sie wollen Korn.', [
  o('Pelze für alle kaufen', 'Niemand friert diesen Winter. Aber die Kornkammer ist sichtbar leerer.', res={'nahrung': -10}, stim=3, welt={'ort': 'wolfsheim', 'art': 'handel', 'grund': 'Korn gegen Pelze'}),
  o('Nur für die Alten und Kinder', 'Die Schwächsten sind versorgt. Die anderen ziehen eine Lage mehr an.', res={'nahrung': -4}, stim=1),
  o('Ablehnen – wir haben Wolle', 'Die Fallensteller ziehen grummelnd weiter.'),
])
ev('weinangebot', 'handel', 'Wein aus der Ostmark', 'Ein Händler aus Brandenstein bietet Wein für das nächste Fest. Er sagt, die Markgräfin suche Freunde im Hügelland.', [
  o('Wein kaufen und den Gruß erwidern', 'Das nächste Fest wird legendär. Und in Brandenstein merkt man sich deinen Namen.', res={'waren': -4}, stim=4, welt={'ort': 'brandenstein', 'art': 'handel', 'grund': 'Wein für die Feste'}),
  o('Wein kaufen, aber keine Grüße', 'Guter Wein, keine Politik.', res={'waren': -4}, stim=3),
  o('Ablehnen', 'Der Händler verabschiedet sich höflich.', gunst=1),
])
ev('marktrecht', 'handel', 'Ein eigener Markttag?', '{T} schlägt vor, einmal im Monat einen Markttag abzuhalten. Händler aus der Umgebung würden kommen – und Fremde, Lärm und Diebe auch.', [
  o('Ja, einen Markttag einführen', 'Am ersten Markttag ist das Dorf voller Stimmen. Ein paar Hühner verschwinden, aber die Kasse klingelt.', sym={'T': 4}, res={'waren': 4}, stim=1),
  o('Erst einen einzigen Versuch', 'Ein kleiner Markt, ein paar Händler. Man wird sehen.', sym={'T': 2}, res={'waren': 2}),
  o('Nein, wir bleiben unter uns', '{T} ist enttäuscht. Die Alten nicken zufrieden.', sym={'T': -3}),
], 'T')

# Nachbarn und Welt
ev('furtenau_fest', 'nachbarn', 'Einladung nach Furtenau', 'Furtenau lädt zum Wettkampf ein: Stammwerfen, Seilziehen, Wettlauf. Der Gewinner bekommt ein Fass Bier – der Verlierer den Spott des ganzen Hügellands.', [
  o('Die Stärksten schicken', 'Eure Leute holen den Sieg im Seilziehen! Das Fass wird noch tagelang gefeiert.', stim=4, ansehen=1, welt={'ort': 'furtenau', 'art': 'buendnis', 'grund': 'Freunde seit dem Wettkampf'}),
  o('Absagen – zu viel Arbeit', 'In Furtenau wundert man sich ein wenig.', stim=-1),
])
ev('rabenfels_gesandter', 'nachbarn', 'Ein Gesandter aus Rabenfels', 'Ein Mann in grauem Mantel überbringt Grüße von Graf Wulfhard. Der Graf biete „Schutz und Silber“, wenn das Dorf ihm künftig Holz statt dem König Korn liefere.', [
  o('Höflich ablehnen', 'Der Gesandte lächelt dünn. „Der Graf hat Geduld.“', gunst=3),
  o('Das Silber nehmen, aber nichts versprechen', 'Das Silber ist echt. In Moosherz wird man es erfahren – früher oder später.', res={'waren': 6}, gunst=-8),
  o('Den Gesandten vom Hof jagen', 'Die Leute johlen. In Rabenfels wird man sich das merken.', gunst=5, stim=2, welt={'ort': 'rabenfels', 'art': 'rivalitaet', 'grund': 'Der Gesandte wurde verjagt'}),
])
ev('kloster_bitte', 'nachbarn', 'Bitte des Klosters', 'Die Mönche von Kloster Morgenstern bitten um Holz für einen neuen Dachstuhl. Sie bieten an, dafür jeden Kranken aus dem Dorf aufzunehmen.', [
  o('Holz spenden', 'Die Mönche segnen das Dorf beim nächsten Besuch. Und sie halten Wort.', res={'holz': -15}, stim=2, welt={'ort': 'morgenstern', 'art': 'buendnis', 'grund': 'Holz für den Dachstuhl, Pflege für die Kranken'}),
  o('Holz verkaufen, nicht verschenken', 'Die Mönche zahlen in Bier und Kräutern.', res={'holz': -15, 'waren': 3}),
  o('Ablehnen', 'Der Mönch nickt und geht. Gott verzeiht – sagt er.'),
])
ev('moorleute', 'nachbarn', 'Leute aus dem Moor', 'Drei Moorleute aus Unkenpfuhl stehen am Dorfrand und bieten Torf zum Heizen an. Viele im Dorf trauen ihnen nicht.', [
  o('Torf kaufen', 'Der Torf brennt langsam und warm. Und die Moorleute kommen wieder – freundlicher als gedacht.', res={'waren': -2, 'holz': 8}, welt={'ort': 'unkenpfuhl', 'art': 'handel', 'grund': 'Torf für den Winter'}),
  o('Freundlich, aber bestimmt wegschicken', 'Die Moorleute gehen. Einer spuckt aus.'),
])
ev('graumaentel', 'nachbarn', 'Ein Mann im grauen Mantel', 'Nachts klopft ein Mann im grauen Mantel an deine Tür. „Krähenstieg bietet Schutz. Für einen kleinen Beitrag im Jahr geschieht euren Wagen auf der Straße nichts.“', [
  o('Zahlen – die Graumäntel fürchtet sogar der König', 'Der Mann verschwindet so leise, wie er kam. Auf der Straße wird es ruhiger.', res={'waren': -5}, welt={'ort': 'kraehenstieg', 'art': 'furcht', 'grund': 'Man zahlt, man schweigt'}),
  o('Ablehnen', '„Wie Ihr meint.“ Eine Woche später brennt eine Heumiete. Zufall, sagt man.', res={'nahrung': -4}, stim=-2),
  o('Dem König melden', 'Ein Brief geht nach Moosherz. Ob der König etwas unternimmt? Die Graumäntel jedenfalls wissen es nun.', gunst=6, stim=-1),
])
ev('fluechtlinge_rabenfels', 'nachbarn', 'Flüchtlinge aus dem Norden', 'Eine Familie aus einem Dorf bei Rabenfels bittet um Aufnahme. Der Graf habe ihre Abgaben verdoppelt. Nehmt ihr sie auf, wird Rabenfels das als Beleidigung sehen.', [
  o('Aufnehmen', 'Die Familie weint vor Dankbarkeit. In Rabenfels ist man weniger begeistert.', zuzug=1, stim=1, welt={'ort': 'rabenfels', 'art': 'rivalitaet', 'grund': 'Geflohene Bauern aufgenommen'}),
  o('Nach Moosherz weiterschicken – mit Proviant', 'Die Familie zieht weiter. Gesehen hat dich trotzdem jeder.', res={'nahrung': -3}),
  o('Zurückschicken', 'Die Familie geht schweigend. Einige im Dorf schauen dich lange an.', stim=-2),
])

# Dorfleben
ev('erntefest', 'dorfleben', 'Wie feiern wir das Fest?', 'Das Fest steht vor der Tür. {T} will ein großes Gelage, {O} meint, man solle sparen – der Winter kommt.', [
  o('Ein großes Fest!', 'Musik, Braten, Tanz bis zum Morgen. Die Kammer ist leerer, die Herzen voller.', sym={'T': 4, 'O': -2}, res={'nahrung': -8}, stim=5),
  o('Ein bescheidenes Fest', 'Ein schöner Abend, aber kein großer. Alle sind zufrieden, keiner begeistert.', res={'nahrung': -3}, stim=2),
  o('Dieses Jahr fällt das Fest aus', 'Der Winter wird sicherer. Aber still im Dorf.', sym={'T': -4, 'O': 3}, stim=-3),
], 'TO')
ev('hochzeit', 'dorfleben', 'Eine Hochzeit', '{T} heiratet. Die Familie bittet darum, dass das Dorf ein Schwein und ein Fass Bier beisteuert – so sei es Brauch.', [
  o('Schwein und Bier geben', 'Die Hochzeit wird gefeiert, als gehöre das ganze Dorf zur Familie.', sym={'T': 6}, res={'nahrung': -5, 'waren': -1}, stim=3),
  o('Nur das Bier', 'Ein fröhliches Fest, wenn auch mit weniger Braten.', sym={'T': 2}, res={'waren': -1}, stim=1),
  o('Das zahlen die Familien selbst', '{T} nickt höflich. Der Tanzboden bleibt halb leer.', sym={'T': -3}),
], 'T')
ev('kinder_schule', 'dorfleben', 'Wer lehrt die Kinder?', '{T} kann lesen und schreiben und bietet an, den Kindern im Winter Unterricht zu geben – wenn das Dorf ihm dafür Holz und Essen stellt.', [
  o('Ja – die Kinder sollen lernen', 'Im Langhaus sitzen bald zwölf Kinder und kritzeln Buchstaben auf Schiefer.', sym={'T': 5}, res={'holz': -4, 'nahrung': -3}, stim=2, ansehen=1),
  o('Nur für die, deren Eltern zahlen', 'Ein paar Kinder lernen. Die anderen schauen durchs Fenster.', sym={'T': 2}),
  o('Nein, die Kinder werden auf dem Feld gebraucht', '{T} seufzt. Die Kinder jubeln.', sym={'T': -3}),
], 'T')
ev('streit_nachbarn', 'dorfleben', 'Lärm in der Nacht', '{O} beschwert sich: {T} feiert jede Nacht bis spät, singt und lärmt. {T} sagt, das Leben sei kurz.', [
  o('Ab Mitternacht ist Ruhe', 'Eine einfache Regel. {T} hält sich daran – meistens.', sym={'T': -2, 'O': 3}),
  o('{T} darf feiern, aber nur am Wochenende', 'Ein Kompromiss, mit dem beide leben können.', sym={'T': 1, 'O': 1}, stim=1),
  o('Das ist nicht deine Sache', 'Die beiden streiten weiter. Lauter.', sym={'T': 1, 'O': -4}, stim=-1),
], 'TO')
ev('heiler_streit', 'dorfleben', 'Kräuter oder Gebete?', '{T} ist krank. {O} will ihn mit Kräutern behandeln, die Familie will lieber einen Mönch aus Morgenstern holen. Beides auf einmal geht nicht.', [
  o('Die Kräuter von {O}', '{O} wacht drei Nächte. {T} wird gesund – und {O} ist plötzlich sehr gefragt.', sym={'T': 3, 'O': 5}),
  o('Den Mönch holen', 'Der Mönch kommt, betet, verordnet Ruhe. {T} wird langsam gesund.', sym={'T': 4, 'O': -3}, res={'waren': -2}),
], 'TO')
ev('verirrtes_kind', 'dorfleben', 'Ein Kind im Wald verirrt', 'Das Kind von {T} ist nicht vom Beerensammeln zurückgekommen. Es wird dunkel. Die Leute warten auf dein Wort.', [
  o('Alle suchen – sofort, mit Fackeln', 'Um Mitternacht findet man das Kind schlafend unter einer Tanne. Das ganze Dorf lacht und weint.', sym={'T': 8}, stim=4, ansehen=2),
  o('Nur die Jäger schicken, die anderen bleiben', 'Die Jäger finden das Kind im Morgengrauen, durchgefroren, aber heil.', sym={'T': 3}, stim=1),
], 'T', auto=0)
ev('aberglaube', 'dorfleben', 'Die schwarze Katze', 'Seit {O} eine schwarze Katze hält, ist die Milch zweimal sauer geworden. Einige Leute verlangen, dass die Katze verschwindet – und {O} gleich mit.', [
  o('Unsinn – die Katze bleibt', 'Du stellst dich vor {O}. Die Milch wird trotzdem sauer, wenn es warm ist. Aber das Geraune verstummt.', sym={'O': 6}, stim=-1, ansehen=1),
  o('Die Katze muss weg, {O} bleibt', '{O} gibt die Katze einem Bauern im Nachbardorf. Die Milch bleibt wie sie ist.', sym={'O': -4}, stim=1),
], 'O')

# Bau und Schutz
ev('palisade_frage', 'bau', 'Ein Zaun gegen die Wildnis?', '{T} hat Wolfsspuren am Dorfrand gefunden. „Eine Palisade aus Pfählen – rund ums Dorf. Dann schlafen wir ruhiger.“', [
  o('Ja – der Rat soll die Palisade als Nächstes bauen', 'Der Rat nickt. Sobald genug Holz da ist, beginnen die Arbeiten.', sym={'T': 4}, bau='palisade', stim=1),
  o('Noch nicht – erst Häuser und Felder', '{T} murmelt etwas von Wölfen, die nicht warten.', sym={'T': -2}),
], 'T', bedingung={'ohne': 'palisade'})
ev('steinmauer_frage', 'bau', 'Stein statt Holz', '{T} klopft gegen die Palisade. „Die hält Wölfe ab. Aber kein Heer.“ Eine Mauer aus Stein würde Jahre halten – und viel kosten.', [
  o('Die Steinmauer planen', 'Steinhauer messen die Linie ab. Es wird lange dauern, aber das Dorf wird eine Festung.', sym={'T': 4}, bau='steinmauer'),
  o('Die Palisade reicht', 'Die Pfähle bleiben. Vorerst.', sym={'T': -1}),
], 'T', bedingung={'mit': 'palisade', 'ohne': 'steinmauer'})
ev('brunnen_neu', 'bau', 'Ein zweiter Brunnen', '{T} und {O} schlagen vor, am anderen Ende des Dorfes einen zweiten Brunnen zu graben. Das kostet Arbeit und Stein.', [
  o('Graben lassen', 'Nach zwei Wochen sprudelt frisches Wasser. Die Wege sind kürzer, die Laune besser.', sym={'T': 3, 'O': 3}, res={'stein': -10}, stim=3),
  o('Später vielleicht', 'Die beiden zucken mit den Schultern.'),
], 'TO')
ev('wegebau', 'bau', 'Der Weg im Schlamm', 'Nach jedem Regen versinkt der Weg zum Feld im Schlamm. {T} will ihn mit Steinen befestigen.', [
  o('Den Weg pflastern', 'Ein ordentlicher Weg – endlich keine verlorenen Holzschuhe mehr.', sym={'T': 3}, res={'stein': -8}, stim=2),
  o('Bretter auslegen reicht', 'Die Bretter halten einen Winter. Immerhin.', res={'holz': -4}, stim=1),
  o('Der Schlamm hat noch keinem geschadet', '{T} schaut auf seine Stiefel und sagt nichts.', sym={'T': -2}),
], 'T')

# Krisen
ev('raeuber_nacht', 'krise', 'Räuber in der Nacht', 'Heute Nacht haben Räuber zwei Ziegen und einen Sack Mehl gestohlen. {T} hat sie in Richtung Wald laufen sehen.', [
  o('Mit den Jägern hinterher', 'Im Morgengrauen kommen die Jäger mit den Ziegen zurück. Vom Mehl keine Spur.', sym={'T': 3}, res={'nahrung': -2}),
  o('Nachtwachen aufstellen', 'Ab jetzt wacht jede Nacht jemand am Tor. Gestohlen wird nichts mehr.', stim=1, res={'nahrung': -3}),
  o('Eine Palisade bauen – ein für alle Mal', 'Der Rat plant die Palisade. Bis dahin hält man die Augen offen.', bau='palisade', res={'nahrung': -3}),
], 'T', bedingung={'ohne': 'palisade'})
ev('hagel', 'krise', 'Hagel über den Feldern', 'Ein Hagelschauer hat die halbe Ernte zerschlagen. {T} fragt, ob man die Vorräte jetzt schon rationieren soll.', [
  o('Sofort rationieren', 'Kleinere Portionen, längere Gesichter – aber genug bis zum Frühjahr.', stim=-2, res={'nahrung': 4}),
  o('Erst abwarten', 'Man hofft auf einen milden Winter.', res={'nahrung': -6}),
  o('In Butterau Vorräte kaufen', 'Die Wagen aus Butterau kommen gerade rechtzeitig.', res={'waren': -5, 'nahrung': 8}),
], 'T')
ev('brunnen_gift', 'krise', 'Der Brunnen stinkt', 'Seit gestern riecht das Wasser im Brunnen faulig. {T} hat eine tote Ratte heraufgeholt – vielleicht nicht die einzige.', [
  o('Den Brunnen ausschöpfen und reinigen', 'Drei Tage harte Arbeit, dann ist das Wasser wieder klar.', stim=1, res={'holz': -3}),
  o('Wasser vom Bach holen, bis es sich bessert', 'Ein mühsamer Umweg – aber niemand wird krank.', stim=-1),
], 'T')
ev('fuchs_huehner', 'krise', 'Der Fuchs im Hühnerstall', 'Zum dritten Mal in einer Woche hat ein Fuchs Hühner gerissen. {T} will Fallen aufstellen, {O} fürchtet um die Hunde.', [
  o('Fallen aufstellen', 'Nach zwei Nächten sitzt der Fuchs in der Falle. Leider vorher auch der Hund von {O}.', sym={'T': 3, 'O': -3}),
  o('Den Stall besser verschließen', 'Ein neuer Riegel, verstärkte Bretter. Der Fuchs zieht weiter.', res={'holz': -3}, sym={'T': 1, 'O': 2}),
], 'TO')

# Briefe des Königs
ev('koenig_jagd', 'koenig', 'Der König will jagen', 'Ein Brief aus Moosherz: König Ottokar will im Herbst in den Wäldern des Hügellands jagen. Das Dorf soll Quartier und Verpflegung für sein Gefolge stellen.', [
  o('Mit Freuden – das Beste aus Küche und Keller', 'Der König jagt drei Tage und reist zufrieden ab. Das Dorf ist erschöpft, aber stolz.', gunst=10, res={'nahrung': -12}, stim=2),
  o('Annehmen, aber bescheiden', 'Der König ist höflich. Man sieht ihm an, dass er mehr erwartet hatte.', gunst=3, res={'nahrung': -5}),
  o('Um Aufschub bitten – die Ernte war schlecht', 'Der König verschiebt die Jagd. Er wird sich erinnern.', gunst=-4),
])
ev('koenig_recht', 'koenig', 'Ein Urteil des Königs', 'Der König verlangt, dass ein Wilddieb aus dem Dorf nach Moosherz gebracht wird. {T} wurde mit einem Reh erwischt – in den königlichen Wäldern.', [
  o('{T} ausliefern', '{T} wird abgeführt. Was in Moosherz geschieht, erfährt man erst im Frühjahr.', gunst=8, sym={'T': -10}, stim=-3, verbannen='T'),
  o('Eine Buße für {T} zahlen', 'Das Dorf zahlt für {T}. Der König ist halb zufrieden, {T} ewig dankbar.', gunst=2, sym={'T': 8}, res={'waren': -6}),
  o('Antworten, man habe niemanden gefunden', 'Der Bote reitet ab. Lügen haben kurze Beine – oder lange Ohren.', gunst=-6, sym={'T': 5}),
], 'T')
ev('koenig_strasse', 'koenig', 'Die Königsstraße', 'Der König will die Straße von Furtenau nach Norden ausbauen. Jedes Dorf am Weg soll zwei Wochen lang Leute zum Pflastern schicken.', [
  o('Leute schicken', 'Die Straße wächst. Händler kommen jetzt öfter – und schneller.', gunst=6, res={'waren': 2, 'nahrung': -3}),
  o('Stattdessen Holz liefern', 'Der König nimmt das Holz. Die Straße wird trotzdem gebaut.', gunst=3, res={'holz': -15}),
  o('Ablehnen – die Felder brauchen jeden', 'Der Bote notiert die Absage mit spitzer Feder.', gunst=-7),
])
ev('koenig_kanzlerin', 'koenig', 'Die Kanzlerin fragt nach Rabenfels', 'Die Kanzlerin des Königs schreibt: „Was hört man im Hügelland über Graf Wulfhard? Jede Nachricht wird belohnt.“', [
  o('Alles berichten, was man weiß', 'Ein langer Brief geht nach Moosherz. Wenige Tage später kommt ein Beutel Silber zurück.', gunst=6, res={'waren': 3}),
  o('Höflich antworten: Man höre nichts', 'Die Kanzlerin schreibt nicht zurück.', gunst=-1),
  o('Antworten, das Hügelland mische sich nicht ein', 'Neutralität ist ein Wort, das man in Moosherz nicht gern liest.', gunst=-5, stim=1),
])

BITT = None
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
kap = [dict(id=KAP4['id'], titel=KAP4['titel'], kurz=KAP4['kurz'], kapitel=4, rollen=KAP4['rollen'], **{'def': {'start': KAP4['start'], 'szenen': KAP4['szenen'], 'reise': True, 'ziel': 'moosherz'}})]
sql = f"""-- Migration 035: Hauptquest Kapitel 4 „Der Brief des Königs“ und neue Aushänge für den Dorfmeister. Erzeugt von quests/amt2.py.
insert into public.items (id, name, beschreibung, art, bonus)
select 'ring_des_koenigs', 'Ring des Königs', 'Ein schmaler Ring mit dem goldenen Hirsch. Wer ihn zeigt, spricht für König Ottokar im Hügelland.', 'fund', '{{"ueberreden": 1, "einschuechtern": 1}}'::jsonb
where not exists (select 1 from public.items where id = 'ring_des_koenigs');

insert into public.quest_templates (id, titel, beschreibung, kurz, art, schwierigkeit, rollen, def)
select e->>'id', e->>'titel', e->>'kurz', e->>'kurz', 'chronik', (e->>'kapitel')::int, e->'rollen', e->'def' from jsonb_array_elements($q${J(kap)}$q$::jsonb) e
on conflict (id) do update set titel = excluded.titel, beschreibung = excluded.beschreibung, kurz = excluded.kurz, art = excluded.art, schwierigkeit = excluded.schwierigkeit, rollen = excluded.rollen, def = excluded.def;

insert into public.dorf_vorlagen (id, art, titel, text, optionen, rollen, auto, gewicht, bedingung)
select e->>'id', e->>'art', e->>'titel', e->>'text', e->'optionen', array(select jsonb_array_elements_text(e->'rollen')), (e->>'auto')::int, (e->>'gewicht')::numeric, e->'bedingung' from jsonb_array_elements($q${J(EV)}$q$::jsonb) e
on conflict (id) do update set art = excluded.art, titel = excluded.titel, text = excluded.text, optionen = excluded.optionen, rollen = excluded.rollen, auto = excluded.auto, gewicht = excluded.gewicht, bedingung = excluded.bedingung;
"""
open(os.path.join(root, 'migrations/035_kapitel4_aufgaben.sql'), 'w').write(sql)
print('Kapitel 4:', len(Z), 'Szenen ·', len(EV), 'neue Aushänge ·', len(sql), 'Zeichen', file=sys.stderr)
