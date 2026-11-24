# Ortsquests: je eine in Moosherz, Furtenau, Hollerbrück, Rabenfels, dazu zwei Gastgeschichten für fremde Spielerdörfer.
from qlib import O, B, P, S, R, MG, K, RZ, E, pruefe

Q = []

# ───────────── Moosherz (Politik): Die Feder der Kanzlerin ─────────────
s = {}
s['start'] = S('stadt', 'In der Kanzlei riecht es nach Tinte und kaltem Wachs. Irmentrud, die Hofschreiberin, sieht nicht von ihren Papieren auf. „Morgen stimmt der Kronrat über das Bauernrecht ab. Wenn es durchkommt, darf jeder Bauer vor Gericht gegen seinen Herrn klagen. Wenn nicht, bleibt alles, wie es ist.“ Jetzt sieht sie auf. „Fünf Stimmen dafür, fünf dagegen. Eine schwankt: Freiherr von Brakel. Und ich brauche jemanden, den am Hof noch keiner kennt.“',
  O('„Was ist an Brakel so besonders?“', 'brakel'),
  O('„Warum ist dir das so wichtig?“', 'warum'),
  O('„Was springt für mich dabei heraus?“', 'lohn', ergebnis='„Die Gunst einer Frau, die eines Tages Kanzlerin sein wird“, sagt sie trocken. „Und einen Brief mit dem Siegel des Königs, wenn du ihn brauchst.“'))
s['warum'] = S('stadt', 'Irmentrud legt die Feder hin. „Mein Vater war Tuchhändler. Ein Herr hat ihm die Ware genommen und nie bezahlt. Vor Gericht hat der Richter gelacht – ein Bürger klagt gegen einen Edlen? Mein Vater hat sich ein Jahr später erhängt.“ Sie greift wieder zur Feder. „Es ist nicht persönlich. Es ist nur wahr.“',
  O('„Erzähl mir von Brakel.“', 'brakel', folgen={'flag': ['vater']}))
s['lohn'] = S('stadt', '„Also, hilfst du?“', O('„Erzähl mir von Brakel.“', 'brakel'))
s['brakel'] = S('stadt', '„Brakel ist alt, fromm und hat Schulden. Die Gegenseite – Herzog Ansgar und seine Freunde – hat ihm angeboten, die Schulden zu übernehmen, wenn er dagegen stimmt. Bisher hat er abgelehnt. Bisher.“ Sie schiebt dir drei Möglichkeiten hin, wie man Karten hinlegt. „Überzeug ihn. Oder finde heraus, womit Ansgar ihn erpresst. Oder …“ Sie zögert. „In Ansgars Schreibstube liegt ein Brief, der beweist, dass er Stimmen kauft. Den könnte jemand holen.“',
  O('Brakel aufsuchen und mit ihm reden', 'brakel_haus'),
  O('Sich in Ansgars Schreibstube schleichen', 'ansgar'),
  O('Erst am Markt herumhören – bei Mirela, der Seherin', 'mirela'))
s['mirela'] = S('stadt', 'Mirela sitzt unter einem bunten Tuch, eine Hand voller Ringe. „Ah, der Neue vom Hof.“ Sie lächelt. „Du willst wissen, was Brakel nachts wach hält? Das kostet.“',
  P('Ihren Preis herunterhandeln', 'feilschen', 12,
    B('„Na gut, weil du so hübsch feilschst.“ Sie beugt sich vor. „Brakels Sohn ist nicht tot, wie alle glauben. Er sitzt in Ansgars Kerker, wegen Spielschulden. Ansgar lässt ihn frei, wenn der Alte richtig stimmt.“', 'brakel_wissen', folgen={'flag': ['sohn']}),
    B('Sie lacht und zieht die Hand weg. „Komm wieder, wenn du Geld hast.“', 'brakel')),
  P('Lesen, ob sie für beide Seiten arbeitet', 'menschenkenntnis', 13,
    B('Ihr Lächeln sitzt eine Spur zu fest. Sie wird Ansgar erzählen, dass du gefragt hast – noch heute. Du sagst ihr nichts Wichtiges und gehst.', 'brakel', folgen={'flag': ['mirela_falsch']}),
    B('Sie wirkt ehrlich. So ehrlich, wie man auf einem Markt sein kann.', 'brakel')))
s['brakel_wissen'] = S('stadt', 'Jetzt verstehst du Brakels Zögern. Es geht nicht um Geld. Es geht um seinen Sohn.',
  O('Brakel aufsuchen', 'brakel_haus'), O('Den Sohn aus Ansgars Kerker holen', 'ansgar'))
s['brakel_haus'] = S('stadt', 'Freiherr von Brakel empfängt dich in einem Zimmer mit leeren Wänden – die Bilder hat er verkauft. Er ist höflich, müde, alt. „Das Bauernrecht. Ja. Ich weiß, was richtig wäre. Die Frage ist nur, was richtig ist für einen Mann in meiner Lage.“',
  P('„Recht ist nicht, was einem nützt. Recht ist, was man vor den Enkeln vertreten kann.“', 'ueberreden', 14,
    B('Er sieht lange aus dem Fenster. „Meine Enkel …“ Dann, leise: „Ich habe keine Enkel. Noch nicht.“ Er sieht dich an. „Es gibt Dinge, die du nicht weißt.“', 'brakel_offen'),
    B('„Schöne Worte“, sagt er. „Junge Worte. Ich war auch einmal jung.“ Er steht auf. Das Gespräch ist vorbei.', 'brakel_zu')),
  O('„Ich weiß von Eurem Sohn.“', 'brakel_sohn', wenn={'flag': 'sohn'}),
  P('„Eine Ordnung, in der nur die Mächtigen recht bekommen, ist keine Ordnung. Es ist ein Aufschub.“', 'altes_wissen', 13,
    B('„Ein Aufschub“, wiederholt er. „Bis zum nächsten Aufstand. Ich habe den letzten gesehen.“ Er nickt langsam. Er ist überzeugt – aber nicht frei.', 'brakel_offen'),
    B('Er hört höflich zu. Philosophie ist ein Luxus für Männer ohne Schulden.', 'brakel_zu')))
s['brakel_zu'] = S('stadt', 'Draußen auf der Treppe. Der Weg über Worte ist verbaut. Bleibt der andere.',
  O('In Ansgars Schreibstube einbrechen', 'ansgar'), O('Zu Irmentrud zurück und gestehen, dass es nicht geklappt hat', 'ende_nein'))
s['brakel_offen'] = S('stadt', '„Ansgar hat meinen Sohn“, sagt Brakel schließlich. „Spielschulden. Wenn ich falsch stimme, sehe ich ihn nie wieder.“ Seine Hände zittern. „Du verlangst, dass ich mein Kind für ein Gesetz opfere.“',
  O('„Ich hole ihn raus. Heute Nacht. Dann seid Ihr frei.“', 'ansgar', folgen={'flag': ['versprochen']}),
  O('„Ja. Das verlange ich. Für tausend Kinder, die nach ihm kommen.“', 'ende_opfer'),
  O('„Dann stimmt, wie Ihr müsst. Ich verstehe.“', 'ende_nein'))
s['brakel_sohn'] = S('stadt', 'Brakel wird kreidebleich. „Woher …?“ Dann sackt er zusammen. „Ja. Er lebt. Und er bleibt am Leben, solange ich dagegen stimme.“',
  O('„Ich hole ihn raus. Heute Nacht.“', 'ansgar', folgen={'flag': ['versprochen']}),
  O('„Dann stimmt dafür – und vertraut darauf, dass Ansgar es nicht wagt, ihm etwas zu tun, wenn alle davon wissen.“', 'oeffentlich'))
s['oeffentlich'] = S('stadt', 'Brakel starrt dich an. „Du meinst … es öffentlich machen? Im Kronrat?“',
  P('„Ein Gefangener, von dem jeder weiß, ist eine Schande. Ein Gefangener, von dem niemand weiß, ist ein Druckmittel.“', 'ueberreden', 13,
    B('Ein langer Atemzug. „Gut. Dann sprechen wir morgen beide.“', 'ende_rat_offen'),
    B('„Nein. Das ist zu gefährlich.“ Er schickt dich fort.', 'brakel_zu')))
s['ansgar'] = R('stadt', 'Nacht über Moosherz. Ansgars Stadthaus liegt hinter dem Dom, Wachen an der Vordertür. Der Hof ist dunkel.', 25, 'einbruch', unterwegs='Du schleichst durch die Gassen der Hauptstadt.')
s['einbruch'] = MG('stadt', 'Die Hintertür ist verriegelt, ein altes Schloss. Ein Wächter geht alle paar Minuten vorbei.', 'schloss', 3, 'Das Schloss knacken',
  B('Das Schloss gibt nach. Du gleitest in einen dunklen Flur.', 'innen'),
  B('Das Schloss klemmt. Schritte nähern sich!', 'erwischt'))
s['innen'] = S('stadt', 'Links die Schreibstube, rechts eine Treppe nach unten. Von unten Husten. Ein Gefangener. Oben Licht – jemand ist noch wach. Du hast Zeit für eins.',
  O('Die Schreibstube: der Brief', 'brief'),
  O('Der Keller: Brakels Sohn', 'keller'))
s['brief'] = S('stadt', 'Der Brief liegt im zweiten Fach, versiegelt mit Ansgars Wappen. Eine Liste: Namen, Summen, Stimmen. Brakel steht drauf. Und drei andere aus dem Kronrat.',
  O('Den Brief mitnehmen und verschwinden', 'flucht', folgen={'flag': ['brief']}))
s['keller'] = S('stadt', 'Ein junger Mann, mager, an die Wand gekettet. „Wer bist du?“ – „Dein Vater schickt mich.“ Er weint.',
  P('Die Kette lösen', 'anpacken', 12,
    B('Der Ring an der Wand gibt nach. Ihr schleicht die Treppe hoch.', 'flucht', folgen={'flag': ['sohn_frei']}),
    B('Zu laut. Oben gehen Türen auf.', 'erwischt')))
s['erwischt'] = K('stadt', 'Wachen mit Knüppeln und Laternen. „Ein Dieb!“', 'Flucht durch Moosherz', 'banditen', 240,
  B('Du schlägst dich durch und verschwindest in den Gassen – mit leeren Händen, aber frei.', 'flucht'),
  B('Sie werfen dich auf die Straße, nach einer gründlichen Tracht Prügel. Ansgar weiß jetzt, dass jemand an seiner Tür war.', 'ende_nein', folgen={'gefahr': 1}), schwer=2)
s['flucht'] = S('stadt', 'Morgengrauen. Der Kronrat tagt in einer Stunde.',
  O('Mit dem Brief zu Irmentrud', 'ende_brief', wenn={'flag': 'brief'}),
  O('Brakels Sohn zu seinem Vater bringen', 'ende_sohn', wenn={'flag': 'sohn_frei'}),
  O('Mit leeren Händen zu Irmentrud', 'ende_nein'))
s['ende_brief'] = E('stadt', 'Irmentrud liest den Brief im Kronrat vor. Ansgar tobt, drei Räte werden blass, der König lässt die Abstimmung verschieben. Das Bauernrecht kommt nicht durch – noch nicht. Aber Ansgars Stimmenkauf ist ans Licht gekommen. „Das Gesetz braucht noch einen Winter“, sagt Irmentrud. „Ansgar braucht jetzt einen sehr guten Anwalt.“ Sie lächelt zum ersten Mal.',
  {'chronik': ['moosherz_brief', 'Ich habe in Moosherz einen Brief gestohlen, der einen Herzog bloßstellte.'], 'gunst': 6, 'beute': {'stufe': 2, 'text': 'Irmentrud drückt dir ein Päckchen in die Hand:'}})
s['ende_sohn'] = E('stadt', 'Brakel umarmt seinen Sohn vor allen. Eine Stunde später stimmt er für das Bauernrecht. Es kommt durch, mit einer Stimme Mehrheit. Ab heute darf jeder Bauer im Königreich gegen seinen Herrn klagen. Ansgar hat einen neuen Feind – und ahnt, wer es ist.',
  {'chronik': ['moosherz_bauernrecht', 'Ich habe Brakels Sohn befreit. Das Bauernrecht ist Gesetz.'], 'gunst': 10, 'beute': {'stufe': 2, 'text': 'Brakel schenkt dir, was ihm von seinem Vermögen geblieben ist:'}})
s['ende_rat_offen'] = E('stadt', 'Im Kronrat erhebt sich Brakel und spricht von seinem Sohn in Ansgars Kerker. Totenstille. Der König lässt den jungen Mann noch am selben Tag holen. Das Bauernrecht kommt durch. Ansgar verlässt den Hof. Manchmal ist Licht die schärfste Waffe.',
  {'chronik': ['moosherz_licht', 'Ich habe Brakel überzeugt, seine Erpressung öffentlich zu machen. Das Bauernrecht ist Gesetz.'], 'gunst': 12, 'beute': {'stufe': 2}})
s['ende_opfer'] = E('stadt', 'Brakel stimmt dafür. Das Bauernrecht kommt durch. Drei Tage später findet man seinen Sohn tot in einem Graben vor der Stadt. Spielschulden, heißt es. Irmentrud zündet eine Kerze für ihn an. „Gesetze“, sagt sie, „werden immer mit fremdem Blut geschrieben.“',
  {'chronik': ['moosherz_opfer', 'Ich habe von Brakel verlangt, seinen Sohn für ein Gesetz zu opfern. Er hat es getan.'], 'gunst': 8})
s['ende_nein'] = E('stadt', 'Der Kronrat lehnt das Bauernrecht ab, fünf zu sechs. Irmentrud nimmt es ohne Regung hin. „Nächstes Jahr“, sagt sie. „Oder das danach.“ Draußen auf dem Markt geht das Leben weiter, als sei nichts gewesen. Für die meisten ist auch nichts gewesen.',
  {'chronik': ['moosherz_nein', 'In Moosherz ist das Bauernrecht gescheitert. Ich war dabei.']})
Q.append(dict(id='o_moosherz', titel='Die Feder der Kanzlerin', fundort='moosherz', kurz='Morgen entscheidet der Kronrat über das Bauernrecht. Eine Stimme fehlt – und Irmentrud braucht jemanden, den am Hof niemand kennt.', start='start', szenen=s, schwer=2))

# ───────────── Furtenau (Denken): Die Karren ohne Licht ─────────────
s = {}
s['start'] = S('stadt', 'Im Furtkrug flüstert man von den Karren ohne Licht. Jede dritte Nacht rumpeln sie über die Furt nach Norden, Richtung Rabenfels, verhüllt, ohne Laterne. Fährmann Gerwin, der sonst jeden Reisenden kennt, sagt nichts dazu. Hedda, die Wirtin, stellt dir einen Krug hin: „Wenn du rausfindest, was das ist, sag es mir zuerst. Mein Sohn dient beim Grafen.“',
  O('Gerwin direkt fragen', 'gerwin'),
  O('Nachts an der Furt auf die Lauer legen', 'lauer'),
  O('Die Spuren der Karren bei Tag untersuchen', 'spuren'))
s['spuren'] = MG('fluss', 'Am Ufer, wo die Karren aus dem Wasser kommen: tiefe Radspuren, schwer beladen nach Norden. Aber zurück nach Süden kommen sie leicht. Und im Schlamm etwas anderes.', 'spuren', 2, 'Spuren lesen',
  B('Fußspuren neben den Karren – kleine. Kinderfüße. Und ein Stück Stoff am Gestrüpp, verkrustet mit etwas Gelbem. Eiter.', 'nachdenken', folgen={'flag': ['kinder', 'krank']}),
  B('Du erkennst nur Räder und Hufe. Schwer nach Norden, leicht zurück. Was bringen sie hin?', 'nachdenken'))
s['gerwin'] = S('fluss', 'Gerwin flickt ein Netz und sieht nicht auf. „Karren? Ich sehe viele Karren.“',
  P('„Du zählst beim Reden Münzen. Wie viel bekommst du fürs Schweigen?“', 'menschenkenntnis', 13,
    B('Seine Hand erstarrt in der Tasche. Lange Stille. „Nichts“, sagt er dann. „Ich bekomme nichts. Ich mache es umsonst. Und jetzt geh.“ Umsonst? Gerwin?', 'nachdenken', folgen={'flag': ['gerwin_umsonst']}),
    B('„Ich zähle, wie viele Fragen du noch stellst, bevor ich dich in den Fluss werfe.“', 'nachdenken')),
  P('Ihm drohen, ihn beim Vogt zu melden', 'einschuechtern', 14,
    B('Er wird weiß. „Tu das nicht. Bitte. Da hängen Leben dran. Nicht meins.“', 'nachdenken', folgen={'flag': ['gerwin_umsonst']}),
    B('„Melde mich doch. Der Vogt kommt jeden Monat zum Essen.“', 'nachdenken')))
s['nachdenken'] = RZ('stadt', 'Was weißt du? Karren nach Norden, schwer beladen. Zurück leicht. Gerwin schweigt, ohne Geld zu nehmen. In Rabenfels hält der Graf seine Grenze geschlossen – keiner darf raus. Und Gerwins Frau stammt aus Rabenfels.',
  'Wenn niemand Rabenfels verlassen darf und die Karren schwer nach Norden fahren und leicht zurückkommen: Wen holen sie heraus?',
  ['menschen', 'flüchtlinge', 'fluechtlinge', 'kranke', 'leute', 'flüchtende', 'kinder', 'familien'],
  B('Menschen. Sie bringen Vorräte hin und schmuggeln Leute heraus, versteckt unter leeren Säcken. Leicht ist der Karren nur, wenn man nicht weiß, was ein Kind wiegt.', 'lauer', folgen={'flag': ['geloest']}),
  B('Du kommst nicht drauf. Aber heute Nacht fährt wieder ein Karren.', 'lauer'),
  hinweise=['Leicht heißt nicht leer.', 'Was darf Rabenfels nicht verlassen?'], versuche=3)
s['lauer'] = R('fluss', 'Nacht an der Furt. Nebel auf dem Wasser, Frösche. Du liegst im Schilf und wartest.', 40, 'karren', unterwegs='Du wartest im Schilf an der Furt.')
s['karren'] = S('fluss', 'Ein Karren, ohne Licht, zwei Maultiere, ein Kutscher mit Kapuze. Mitten in der Furt bleibt er stecken. Unter der Plane: Husten. Ein Kind fängt an zu weinen und wird sofort still gemacht. Und vom Nordufer: Pferdegetrappel. Grenzreiter aus Rabenfels.',
  O('Dem Kutscher helfen, den Karren freizubekommen', 'freimachen'),
  O('Die Grenzreiter ablenken', 'ablenken'),
  O('Abwarten und beobachten', 'beobachten'))
s['freimachen'] = MG('fluss', 'Das Rad steckt zwischen zwei Steinen. Der Kutscher – es ist Gerwin – zerrt verzweifelt. Die Reiter kommen näher.', 'axt', 2, 'Das Rad freihebeln',
  B('Mit einem Ruck kommt der Karren frei. Gerwin starrt dich an, dann treibt er die Maultiere ans Südufer.', 'sued'),
  B('Zu spät. Die Reiter sind da.', 'reiter'))
s['ablenken'] = P('Laut rufend in die Gegenrichtung laufen', 'flink', 13,
  B('Die Reiter folgen dir ins Schilf, fluchend, und verlieren dich im Nebel. Als du zurückkommst, ist der Karren fort.', 'sued'),
  B('Einer folgt dir, die anderen reiten weiter zum Karren.', 'reiter'))
s['ablenken'] = S('fluss', 'Du musst sie weglocken – schnell.', s['ablenken'])
s['beobachten'] = S('fluss', 'Die Reiter umstellen den Karren. Ihr Anführer reißt die Plane weg. Darunter: sechs Menschen. Zwei Kinder, eine Frau mit eitrigen Wunden, drei Männer. „Seuchenflüchtlinge“, sagt der Anführer. „In Rabenfels ist das Fleckfieber ausgebrochen. Der Graf hat die Grenze geschlossen, damit es sich nicht ausbreitet. Und ihr bringt es in den Süden.“',
  O('Eingreifen', 'reiter'),
  O('Weiter zusehen', 'ende_reiter'))
s['reiter'] = S('fluss', 'Drei Reiter, Schwerter gezogen. Der Anführer: „Zurück nach Norden mit ihnen. Oder sie bleiben hier liegen.“ Gerwin steht zwischen ihnen und dem Karren. „Das sind Kinder!“ – „Das sind Kranke. Wie viele willst du in Furtenau begraben?“ Er hat nicht ganz unrecht. Das ist das Furchtbare.',
  P('„Lasst sie durch. Ich bringe sie in Quarantäne, abseits der Stadt.“', 'ueberreden', 14,
    B('Der Anführer zögert. „Du nimmst das auf dich? Wenn das Fieber nach Furtenau kommt, hängt man dich.“ Du nickst. Er spuckt aus und wendet sein Pferd.', 'quarantaene'),
    B('„Nein.“ Er hebt das Schwert.', 'kampf')),
  O('Die Waffe ziehen', 'kampf'),
  O('„Bringt sie zurück. Er hat recht.“', 'ende_zurueck'))
s['kampf'] = K('fluss', 'Stahl über dem Wasser, Maultiere scheuen, Kinder schreien.', 'Kampf in der Furt', 'banditen', 300,
  B('Die Reiter fliehen nach Norden. Gerwin bringt den Karren ans Südufer, zitternd.', 'sued'),
  B('Du wirst niedergeschlagen. Als du aufwachst, sind Reiter und Karren fort – nach Norden.', 'ende_zurueck', folgen={'gefahr': 1}), schwer=2)
s['sued'] = S('fluss', 'Am Südufer, im Schutz der Weiden. Gerwin hebt die Plane. Sechs Menschen, eine Frau mit Fieberflecken am Hals. „Meine Schwägerin“, sagt er. „Der Rest sind Nachbarn. Wir bringen sie in die alte Fischerhütte und dann weiter.“ Er sieht dich an. „Weiter. Nach Furtenau. Auf den Markt. Unter Leute.“',
  O('„Nein. Erst Quarantäne. Vierzig Tage in der Hütte.“', 'quarantaene'),
  O('„Ilsabe, die Kräuterfrau, muss sie sehen.“', 'ilsabe'),
  O('Hedda erzählen, was du gefunden hast', 'ende_hedda'))
s['ilsabe'] = S('stadt', 'Ilsabe kommt in der Dämmerung, ein Tuch vor dem Mund. Sie untersucht die Frau lange. „Fleckfieber. Läuse tragen es. Wenn man die Kleider verbrennt und sie wäscht, breitet es sich nicht aus. Die anderen sind nur erschöpft.“ Sie sieht Gerwin an. „Du hättest sie fast auf den Markt gebracht.“',
  O('„Dann machen wir es richtig.“', 'quarantaene', folgen={'flag': ['ilsabe']}))
s['quarantaene'] = S('fluss', 'Die alte Fischerhütte, abseits. Kleider brennen, Wasser kocht. Gerwin bringt Essen, Ilsabe Kräuter. In der Stadt ahnt niemand etwas. Aber du hast etwas auf dich genommen: Wenn es schiefgeht, bist du schuld.',
  O('Die Sache dem Stadtrat melden – offen', 'ende_offen'),
  O('Schweigen und abwarten, bis die vierzig Tage um sind', 'ende_schweigen'))
s['ende_offen'] = E('stadt', 'Der Stadtrat tobt, dann rechnet er. Vierzig Tage, eine Hütte, eine Kräuterfrau – das ist billiger als ein Krieg mit dem Grafen oder eine Seuche. Die Flüchtlinge dürfen bleiben. Gerwin sagt dir am Abend, er habe nicht gewusst, dass man so etwas laut sagen kann.',
  {'chronik': ['furtenau_offen', 'Ich habe die Seuchenflüchtlinge in Furtenau dem Rat gemeldet. Sie dürfen bleiben – nach vierzig Tagen.'], 'beute': {'stufe': 2, 'text': 'Gerwin gibt dir etwas aus seinem Lagerhaus:'}})
s['ende_schweigen'] = E('stadt', 'Vierzig Tage. Niemand stirbt, niemand steckt sich an. Gerwins Schwägerin überlebt. Die Karren ohne Licht fahren weiter, jetzt mit einem Halt bei der Fischerhütte. Du weißt, dass es Glück war. Glück und Ilsabes Kräuter.',
  {'chronik': ['furtenau_schweigen', 'Ich habe geholfen, Seuchenflüchtlinge heimlich nach Furtenau zu bringen. Es ist gut gegangen.'], 'beute': {'stufe': 1}})
s['ende_hedda'] = E('stadt', 'Hedda hört zu, ohne zu unterbrechen. Dann steht sie auf. „Mein Sohn ist bei den Grenzreitern“, sagt sie. „Wenn er einen von diesen Karren aufhält, ist er ein Held. Wenn er einen durchlässt, ist er ein Deserteur.“ Sie schenkt dir nach. „Danke, dass du es mir gesagt hast. Jetzt muss ich mit dem Wissen leben.“',
  {'chronik': ['furtenau_hedda', 'Ich habe Hedda erzählt, was über die Furt fährt. Jetzt weiß sie, wovor ihr Sohn steht.']})
s['ende_zurueck'] = E('fluss', 'Die Reiter treiben den Karren zurück nach Norden. Gerwin steht bis zu den Knien im Wasser und sieht ihnen nach. Er wird nie wieder ein Wort mit dir reden. Ob du Furtenau vor einer Seuche bewahrt hast oder sechs Menschen den Tod gebracht – beides kann wahr sein.',
  {'chronik': ['furtenau_zurueck', 'Die Flüchtlinge wurden nach Rabenfels zurückgebracht. Ich habe es zugelassen.']})
s['ende_reiter'] = E('fluss', 'Die Reiter nehmen den Karren mit. Gerwin wird abgeführt. Am nächsten Morgen ist das Lagerhaus versiegelt. Niemand im Furtkrug redet mehr über Karren ohne Licht.',
  {'chronik': ['furtenau_reiter', 'Ich habe an der Furt zugesehen. Gerwin sitzt jetzt in Rabenfels.']})
Q.append(dict(id='o_furtenau', titel='Die Karren ohne Licht', fundort='furtenau', kurz='Jede dritte Nacht rumpeln verhüllte Karren über die Furt nach Norden. Der Fährmann schweigt – ausgerechnet er.', start='start', szenen=s, schwer=2))

# ───────────── Hollerbrück (Psychologie/Vermittlung): Die Steine am Hang ─────────────
s = {}
s['start'] = S('dorf', 'An der Hollerbrücke steht eine Menge mit Heugabeln, auf der anderen Seite Leute aus Ginsterhof mit Knüppeln. Dazwischen Kordula, die Brückenwächterin, die Hand am Schwert. „Jemand hat die Grenzsteine am Hang versetzt“, erklärt sie dir, ohne den Blick von den Männern zu nehmen. „Zwanzig Schritt weiter nach Ginsterhof. Jede Seite sagt, es war die andere. Wenn das so weitergeht, gibt es heute Tote.“',
  P('Dazwischentreten und beide Seiten zum Reden bringen', 'beruhigen', 13,
    B('„Wer zuschlägt, hat verloren, egal was die Steine sagen.“ Ein Moment Stille. Dann senkt einer die Heugabel. Dann noch einer. Kordula nickt dir zu.', 'pause'),
    B('Jemand wirft einen Stein. Er trifft niemanden – diesmal. Kordula zieht blank, und das hält sie zurück. Vorerst.', 'pause', folgen={'flag': ['angespannt']})),
  O('Kordula fragen, was sie weiß', 'kordula'))
s['kordula'] = S('dorf', 'Kordula streicht mit dem Daumen über die Narbe am Kinn. „Weiß? Nichts. Ich weiß nur, dass Anselm, der Müller, Schulden hat. Und dass ihm das Feld am Hang gehört. Und dass Tönnies, der Hirte, seit drei Tagen nicht mehr ins Dorf kommt.“',
  O('Erst die Menge beruhigen', 'pause'))
s['pause'] = S('dorf', 'Die Leute gehen auseinander, murrend. Kordula gibt dir einen Tag. „Wenn du bis morgen Abend nicht weißt, wer es war, entscheiden die Heugabeln.“',
  O('Zum Müller Anselm', 'anselm'),
  O('Den Hirten Tönnies auf den Hängen suchen', 'toennies_weg'),
  O('Die Grenzsteine selbst ansehen', 'steine'))
s['steine'] = MG('berg', 'Die Steine am Hang. Alt, moosbewachsen – an der Unterseite. Oben ist das Moos abgerieben. Darunter der alte Abdruck im Boden, zwanzig Schritt hangaufwärts.', 'spuren', 2, 'Den Boden lesen',
  B('Frische Kratzspuren, ein Hebel wurde benutzt. Fußspuren: schwere Stiefel, ein Mann, der hinkt. Und Mehl. Feines, weißes Mehl in den Ritzen.', 'pause2', folgen={'flag': ['mehl']}),
  B('Jemand hat sie bewegt, das ist klar. Wer, verrät der Boden dir nicht.', 'pause2'))
s['pause2'] = S('dorf', 'Wohin jetzt?', O('Zum Müller Anselm', 'anselm', wenn={'nicht_flag': 'anselm_besucht'}), O('Den Hirten Tönnies suchen', 'toennies_weg', wenn={'nicht_flag': 'toennies_besucht'}), O('Zu Kordula, um zu berichten', 'bericht'))
s['anselm'] = S('dorf', 'Anselm klopft sich Mehl von der Jacke. Es ist keins da. „Die Steine? Ginsterhof war das, ganz sicher. Die wollen schon lange unser Weideland.“ Er redet zu schnell.',
  P('Seine Nervosität deuten', 'menschenkenntnis', 12,
    B('Er hat Angst – nicht vor Ginsterhof. Vor seiner Frau, die hinter ihm am Mehlsack steht und zuhört. Was er verbirgt, verbirgt er vor ihr.', 'anselm2', folgen={'flag': ['anselm_angst', 'anselm_besucht']}),
    B('Er ist ein ängstlicher Mann. Das allein beweist nichts.', 'anselm2', folgen={'flag': ['anselm_besucht']})),
  O('„In den Ritzen der Steine war Mehl.“', 'anselm_mehl', wenn={'flag': 'mehl'}))
s['anselm_mehl'] = S('dorf', 'Anselm wird grau wie sein Mehl. Seine Frau lässt den Sack fallen. „Anselm?“',
  O('Ihn allein sprechen', 'anselm_allein'),
  O('Vor seiner Frau weiterfragen', 'anselm_frau'))
s['anselm2'] = S('dorf', 'Anselm wischt sich die Stirn.', O('Ihn allein sprechen', 'anselm_allein'), O('Gehen', 'pause2', folgen={'flag': ['anselm_besucht']}))
s['anselm_allein'] = S('dorf', 'Hinter der Mühle bricht er zusammen. „Ich schulde dem Händler aus Goldacker vierzig Silber. Mit dem Feld bis zum alten Stein kann ich die Mühle nicht halten. Mit zwanzig Schritt mehr Acker vielleicht. Ich dachte, Ginsterhof merkt es nicht. Es sind doch nur zwanzig Schritt.“ Er weint. „Meine Frau darf es nicht wissen. Sie würde mich verlassen.“',
  O('„Du musst es vor allen sagen. Sonst sterben morgen Menschen für deine zwanzig Schritt.“', 'gestaendnis', folgen={'flag': ['anselm_beichte']}),
  P('„Lass uns einen Weg finden, wie du die Schulden abbezahlst – und dann sagst du es.“', 'ueberreden', 12,
    B('Er nickt, zitternd. „Wenn jemand neben mir steht …“', 'gestaendnis', folgen={'flag': ['anselm_beichte', 'hilfe']}),
    B('„Nein! Niemand darf es wissen!“ Er rennt in die Mühle.', 'pause2')),
  O('„Ich sage nichts. Aber setz die Steine heute Nacht zurück.“', 'ende_heimlich'))
s['anselm_frau'] = S('dorf', 'Vor seiner Frau gesteht er alles, stammelnd. Sie hört zu, die Arme verschränkt. Dann sagt sie ruhig: „Vierzig Silber. Und du hast es mir nicht gesagt.“ Sie dreht sich um und geht ins Haus. Die Tür bleibt offen.',
  O('Anselm zur Brücke bringen', 'gestaendnis', folgen={'flag': ['anselm_beichte']}))
s['toennies_weg'] = R('berg', 'Die Hänge über dem Fluss. Schafe, Wind, ein einsamer Pfiff, der eine Melodie sein könnte.', 30, 'toennies')
s['toennies'] = S('berg', 'Tönnies sitzt auf einem Felsen und schnitzt. „Ich hab gewusst, dass jemand kommt“, sagt er. „Der Bussard ist dreimal über mich gekreist.“ Er hat etwas gesehen, das merkst du. Er hat Angst, es zu sagen.',
  P('Ihn reden lassen, ohne zu drängen', 'beruhigen', 11,
    B('Du setzt dich, siehst den Schafen zu. Nach langer Zeit: „Es war der Müller. Nachts, mit einer Stange. Er hat geweint dabei.“ Tönnies sieht dich an. „Er ist kein schlechter Mann. Er ist nur ein ängstlicher.“', 'pause2', folgen={'flag': ['zeuge', 'toennies_besucht']}),
    B('„Ich hab nichts gesehen“, sagt er und pfeift weiter.', 'pause2', folgen={'flag': ['toennies_besucht']})),
  P('„Wenn du schweigst und morgen jemand stirbt, wirst du das nie mehr los.“', 'einschuechtern', 13,
    B('Er wird blass. „Der Müller. Mit einer Stange. Bitte sag nicht, dass ich es war, der es verraten hat.“', 'pause2', folgen={'flag': ['zeuge', 'toennies_besucht']}),
    B('Er dreht sich weg und geht zu seinen Schafen.', 'pause2', folgen={'flag': ['toennies_besucht']})))
s['bericht'] = S('dorf', 'Kordula hört zu. „Und?“',
  O('„Es war Anselm. Er hat Schulden.“', 'anklage', wenn={'flag': 'zeuge'}),
  O('„Es war Anselm. Er will es selbst sagen.“', 'gestaendnis', wenn={'flag': 'anselm_beichte'}),
  O('„Ich weiß es nicht.“', 'ende_heugabeln'))
s['anklage'] = S('dorf', 'An der Brücke, beide Dörfer versammelt. Du sagst, was du weißt. Anselm wird gepackt, sein Gesicht ist leer. Jemand aus Ginsterhof ruft: „Hängt ihn!“ Und Kordula, die Hand am Schwert, sieht dich an. Sie wartet, was du sagst.',
  P('„Er hat aus Angst gehandelt, nicht aus Bosheit. Er soll den Schaden bezahlen, nicht mit seinem Leben.“', 'ueberreden', 13,
    B('Murren, aber die Hände lassen Anselm los. Der Rat beider Dörfer beschließt: Er arbeitet ein Jahr für Ginsterhof umsonst. Seine Mühle behält er.', 'ende_urteil'),
    B('Die Wut ist größer als deine Worte. Kordula muss dazwischengehen, um Blut zu verhindern.', 'ende_hart')))
s['gestaendnis'] = S('dorf', 'Anselm steht auf der Brücke vor beiden Dörfern. Er sagt es. Alles. Die Schulden, die Nacht, die zwanzig Schritt. Am Ende steht seine Frau neben ihm. Sie hält seine Hand nicht – aber sie steht da.',
  O('„Jetzt lasst uns reden, wie er die Schuld begleicht.“', 'ende_beichte'))
s['ende_beichte'] = E('dorf', 'Ginsterhof bekommt seine Steine zurück und ein Jahr lang Mehl umsonst. Anselm verkauft eine Kuh und zahlt den Händler aus Goldacker. Seine Frau redet eine Woche nicht mit ihm, dann wieder. Kordula sagt zu dir, an der Brücke, im Abendlicht: „Ich hätte es mit dem Schwert gelöst. Damals hätte ich das.“',
  {'chronik': ['holler_beichte', 'Ich habe Anselm dazu gebracht, vor zwei Dörfern zu gestehen. Niemand ist gestorben.'], 'beute': {'stufe': 2, 'text': 'Kordula gibt dir etwas aus ihrer Söldnerzeit:'}})
s['ende_urteil'] = E('dorf', 'Anselm arbeitet ein Jahr für Ginsterhof. Er redet mit niemandem mehr in Hollerbrück. Tönnies, der dich verraten sah, wer es verraten hat, pfeift ein neues Lied, wenn du vorbeikommst. Es klingt traurig.',
  {'chronik': ['holler_urteil', 'Ich habe Anselm angeklagt und um Gnade gebeten. Er lebt – mit der Schande.'], 'beute': {'stufe': 1}})
s['ende_heimlich'] = E('dorf', 'In der Nacht stehen die Steine wieder an ihrem Platz. Am Morgen sagen beide Dörfer, die andere Seite habe eingelenkt. Keiner hat gewonnen, keiner verloren. Anselm hat weiter Schulden. Und du weißt etwas, das du niemandem sagen kannst.',
  {'chronik': ['holler_heimlich', 'Ich habe Anselms Geheimnis bewahrt. Die Steine stehen wieder – und die Schulden bleiben.']})
s['ende_hart'] = E('dorf', 'Kordula verhindert Blut, aber nur knapp. Anselm wird aus Hollerbrück gejagt, die Mühle fällt an seinen Gläubiger. Die Grenze ist wieder, wo sie war. Der Frieden auch – fast.',
  {'chronik': ['holler_hart', 'Anselm wurde verjagt. Die Steine stehen wieder.']})
s['ende_heugabeln'] = E('dorf', 'Am nächsten Abend gehen die Heugabeln los. Kordula hält die Brücke, verwundet. Es gibt keine Toten, nur gebrochene Knochen und einen Groll, der für Generationen reichen wird.',
  {'chronik': ['holler_heugabeln', 'An der Hollerbrücke wurde gekämpft. Ich habe es nicht verhindert.']})
Q.append(dict(id='o_hollerbrueck', titel='Die Steine am Hang', fundort='hollerbrueck', kurz='Zwei Dörfer stehen sich an der Hollerbrücke mit Heugabeln gegenüber. Jemand hat die Grenzsteine versetzt.', start='start', szenen=s, schwer=1))

# ───────────── Rabenfels (Kampf/Infiltration): Unter dem Rabenfelsen ─────────────
s = {}
s['start'] = S('burg', 'Rabenfels ist ein Felsen mit einer Burg darauf und einem Dorf darunter, das immer im Schatten liegt. In der Küche der Burg, wo du dich als Tagelöhner hast einstellen lassen, zieht dich die Magd Wiebke in eine Ecke. „Du bist nicht von hier“, flüstert sie. „Gut. Ich muss es jemandem sagen, der nicht von hier ist.“ Sie hat gehört, wie Burgvogt Ragnolf nachts mit einem Fremden sprach. Mit einem, der einen Rabenring trägt. Über Moosherz. Über Gift.',
  O('„Erzähl mir alles.“', 'wiebke'),
  O('„Warum gehst du nicht zum Grafen?“', 'graf'))
s['graf'] = S('burg', '„Zum Grafen?“ Wiebke lacht erstickt. „Ragnolf ist seit dreißig Jahren seine rechte Hand. Wem glaubt er – ihm oder einer Küchenmagd?“ Sie zieht an ihrer Schürze. „Und wenn der Graf es weiß? Wenn er es befohlen hat?“',
  O('„Dann erzähl mir alles.“', 'wiebke'))
s['wiebke'] = S('burg', '„Beim Erntedankfest in Moosherz soll der König Wein aus Rabenfels bekommen. Ein Geschenk, als Zeichen des Friedens. Ragnolf hat gesagt, der Wein wird der letzte sein, den Ottokar trinkt. Der Fremde soll das Gift bringen. Heute Nacht. In die Kapelle.“ Sie zittert. „Kaplan Severin weiß es auch. Er hat Ragnolf die Beichte abgenommen.“',
  O('Den Kaplan aufsuchen', 'severin'),
  O('Heute Nacht in der Kapelle auf der Lauer liegen', 'nacht'),
  O('Sich in Ragnolfs Kammer schleichen und Beweise suchen', 'kammer'))
s['wiebke'] ['optionen'].append(O('An den Rabenbrief aus Kapitel 4 denken – du hast ihn schon einmal gesehen', 'rabenbrief', wenn={'wissen': 'chronik_4'}))
s['rabenbrief'] = S('burg', 'Ein Rabenring. Du erinnerst dich an den Brief, den du auf dem Weg nach Moosherz gefunden hast – an das Siegel mit dem Raben. Dieselben Leute. Der Plan reicht weiter zurück, als Wiebke ahnt. Und weiter hinauf.',
  O('Den Kaplan aufsuchen', 'severin', folgen={'flag': ['rabe_bekannt']}), O('Heute Nacht in der Kapelle lauern', 'nacht', folgen={'flag': ['rabe_bekannt']}))
s['severin'] = S('burg', 'Kaplan Severin kniet in der Kapelle. Er erschrickt, als du von Gift sprichst. „Das Beichtgeheimnis“, sagt er. „Ich darf nichts sagen. Gott wird richten.“ Seine Hände zittern.',
  P('„Gott richtet nach der Tat. Du kannst sie verhindern.“', 'ueberreden', 13,
    B('Er schließt die Augen. „Ich sage nichts. Aber heute Nacht lasse ich die Sakristeitür offen. Hinter dem Wandteppich kann man alles hören.“', 'nacht', folgen={'flag': ['sakristei']}),
    B('„Geh“, sagt er. „Bitte geh.“ Aber er hat nicht gesagt, du sollst nicht wiederkommen.', 'nacht')),
  P('„Wenn der König stirbt, gibt es Krieg. Wie viele Beichten wirst du dann hören? Von Witwen?“', 'einschuechtern', 12,
    B('Er bricht zusammen. „Der Fremde heißt Corvin. Er kommt aus Krähenstieg, von den Graumänteln. Mitternacht. Ich lasse die Sakristei offen.“', 'nacht', folgen={'flag': ['sakristei', 'corvin']}),
    B('Er schüttelt nur den Kopf, weinend.', 'nacht')))
s['kammer'] = MG('burg', 'Ragnolfs Kammer liegt im Turm. Die Wache macht alle Viertelstunde ihre Runde. Die Tür ist verschlossen.', 'schloss', 3, 'Ragnolfs Tür',
  B('Drinnen: Karten von Moosherz, eine Liste mit Namen von Höflingen – und ein Fläschchen, leer, mit eingeritztem Raben. Und ein Brief: „Der Wein muss vor dem dritten Tag des Festes geöffnet werden.“', 'nacht', folgen={'flag': ['beweis']}),
  B('Schritte auf der Treppe! Du verschwindest gerade noch rechtzeitig in einer Nische.', 'nacht'))
s['nacht'] = R('burg', 'Mitternacht. Die Burg schläft. Nur der Wind heult um den Felsen.', 20, 'kapelle', unterwegs='Du schleichst durch die dunklen Gänge der Burg.')
s['kapelle'] = S('burg', 'In der Kapelle: zwei Gestalten im Kerzenlicht. Ragnolf, leise wie immer. Und ein Mann in grauem Mantel, mit einem Ring, der im Licht wie ein Rabenauge blitzt. Er stellt ein Kästchen auf den Altar. „Nachtschatten und Eisenhut. Er wird einschlafen und nicht aufwachen. Niemand wird es schmecken.“',
  O('Hinter dem Wandteppich bleiben und alles hören', 'lauschen', wenn={'flag': 'sakristei'}),
  O('Hervortreten und beide stellen', 'stellen'),
  O('Warten, bis sie gehen, dann das Kästchen stehlen', 'stehlen'))
s['lauschen'] = S('burg', 'Du hörst alles. Namen. Daten. Und dann: „Der Graf weiß nichts?“ – „Der Graf ist alt und weich“, sagt Ragnolf. „Wenn Ottokar tot ist, wird der Graf König sein, ob er will oder nicht. Und ich werde neben ihm stehen.“ Der Graf ist unschuldig. Das ändert alles.',
  O('Zum Grafen gehen – sofort, mit dem, was du gehört hast', 'graf_nacht'),
  O('Das Kästchen nach dem Treffen stehlen', 'stehlen', folgen={'flag': ['graf_unschuldig']}))
s['stellen'] = S('burg', 'Du trittst hervor. Ragnolf dreht sich langsam um. „Der Tagelöhner.“ Er lächelt nicht. „Corvin. Töte ihn.“',
  P('„Ich bin nicht allein. Die halbe Burg weiß Bescheid.“', 'einschuechtern', 15,
    B('Corvin zögert. Ragnolf durchschaut den Bluff – aber Corvin nicht. Der Graumantel flieht durch das Seitentor. Ragnolf steht allein vor dir.', 'ragnolf_allein'),
    B('„Lügner“, sagt Ragnolf.', 'kampf')),
  O('Die Waffe ziehen', 'kampf'))
s['kampf'] = K('burg', 'Corvin zieht zwei Klingen, Ragnolf ruft die Wache. Von überall kommen Schritte.', 'Kampf in der Burgkapelle', 'banditen', 480,
  B('Corvin liegt am Boden, Ragnolf ist durch eine Geheimtür geflohen. Auf dem Altar steht das Kästchen mit dem Gift.', 'nach_kampf'),
  B('Du schlägst dich bis zum Tor durch und fliehst über den Felsen ins Tal – verwundet, gejagt, aber mit dem Kästchen.', 'flucht', folgen={'gefahr': 2}), schwer=3, modus=None)
s['ragnolf_allein'] = S('burg', 'Ragnolf und du, allein in der Kapelle. Er greift nicht an. „Was willst du? Geld? Ich kann dich reich machen.“ Er meint es ernst.',
  O('„Ich will, dass du dich dem Grafen stellst.“', 'graf_nacht'),
  P('„Du wirst dich selbst anzeigen. Sonst trägt Wiebke die Liste mit deinen Namen nach Moosherz.“', 'ueberreden', 15,
    B('Lange Stille. Dann nimmt er sein Schwert ab und legt es auf den Altar. „Der Graf soll es von mir hören. Nicht von einer Magd.“', 'ende_gestaendnis'),
    B('Er lacht. „Dann stirbt sie. Und du mit ihr.“ Er zieht.', 'kampf')),
  O('Das Geld nehmen', 'ende_bestochen'))
s['stehlen'] = MG('burg', 'Die beiden gehen. Das Kästchen steht auf dem Altar – unbewacht? Ein Faden spannt sich davor, an einer Glocke.', 'nadel', 3, 'Den Faden umgehen',
  B('Du hast das Kästchen. Niemand hat dich gehört.', 'flucht', folgen={'flag': ['gift']}),
  B('Die Glocke schellt!', 'kampf'))
s['nach_kampf'] = S('burg', 'Die Wachen stürmen herein – und mit ihnen Graf Wulfhard, im Nachthemd, ein Schwert in der Hand. Er sieht Corvin, das Kästchen, dich. „Was ist hier los?“',
  O('Ihm alles erzählen', 'ende_graf'))
s['graf_nacht'] = S('burg', 'Graf Wulfhard hört dich im Nachtgewand an, in seinem Schlafgemach, umgeben von Wachen. Er unterbricht nicht. Am Ende sitzt er sehr still. „Ragnolf hat mir das Leben gerettet. Zweimal. Und jetzt will er mich zum Königsmörder machen.“',
  O('„Ihr müsst ihn aufhalten. Heute Nacht.“', 'ende_graf'))
s['flucht'] = R('wald', 'Über den Felsen, durch den Wald, das Kästchen unter dem Hemd. Hinter dir Hunde.', 40, 'ende_flucht')
s['ende_graf'] = E('burg', 'Ragnolf wird in der Morgendämmerung festgenommen, an der Stalltür, mit gepacktem Pferd. Corvin schweigt unter der Folter. Graf Wulfhard schickt einen Brief nach Moosherz – nicht mit Wein, sondern mit der Wahrheit. Ob König Ottokar ihm glaubt, ist eine andere Frage. Wiebke bekommt eine Stelle als Hausdame – und darf ihren Stallknecht heiraten.',
  {'chronik': ['rabenfels_graf', 'Ich habe in Rabenfels einen Giftanschlag auf König Ottokar aufgedeckt. Der Graf war unschuldig.'], 'gunst': 15, 'welt': {'ort': 'rabenfels', 'art': 'buendnis', 'grund': 'Du hast den Grafen vor seinem eigenen Vogt bewahrt'}, 'beute': {'stufe': 2, 'text': 'Graf Wulfhard überreicht dir selbst:'}})
s['ende_gestaendnis'] = E('burg', 'Ragnolf geht selbst zum Grafen. Was in dieser Nacht gesprochen wurde, erfährt niemand. Am Morgen ist Ragnolf fort, verbannt, sagt man. Der Wein aus Rabenfels kommt nie in Moosherz an. Der Frieden hält. Noch.',
  {'chronik': ['rabenfels_gestaendnis', 'Ich habe Ragnolf gezwungen, sich dem Grafen zu stellen. Der Wein kam nie in Moosherz an.'], 'gunst': 10, 'beute': {'stufe': 1}})
s['ende_flucht'] = E('wald', 'Du bringst das Kästchen nach Moosherz. Am Hof glaubt man dir – halb. König Ottokar lässt den Wein aus Rabenfels in den Fluss gießen und die Grenze verstärken. Krieg liegt in der Luft. In Rabenfels sucht man einen Tagelöhner mit deinem Gesicht.',
  {'chronik': ['rabenfels_flucht', 'Ich bin aus Rabenfels geflohen, mit dem Gift für den König unter dem Hemd.'], 'gunst': 8, 'welt': {'ort': 'rabenfels', 'art': 'rivalitaet', 'grund': 'Ein Giftanschlag auf den König kam aus Rabenfels'}})
s['ende_bestochen'] = E('burg', 'Ragnolf zahlt gut. Du verlässt Rabenfels reicher, als du gekommen bist. Wiebke sieht dich am Tor, und du kannst ihren Blick nicht erwidern. Was am Erntedankfest in Moosherz geschieht, liegt jetzt nicht mehr in deiner Hand. Nur auf deinem Gewissen.',
  {'chronik': ['rabenfels_bestochen', 'Ich habe Ragnolfs Geld genommen.'], 'beute': {'stufe': 2, 'text': 'In dem Beutel, den Ragnolf dir gibt, liegt mehr als Silber:'}})
Q.append(dict(id='o_rabenfels', titel='Unter dem Rabenfelsen', fundort='rabenfels', kurz='Eine Küchenmagd auf der Burg hat etwas gehört, das sie nicht hätte hören dürfen: Gift, ein Rabenring und der Name des Königs.', start='start', szenen=s, schwer=3))

# ───────────── Gastgeschichten in fremden Spielerdörfern ─────────────
s = {}
s['start'] = S('dorf', 'Am Brunnen dieses Dorfes streiten zwei Frauen, laut genug, dass es das halbe Dorf hört. Die eine sagt, die andere habe nachts Wasser für ihren Garten geschöpft, obwohl der Brunnen seit dem trockenen Sommer kaum noch etwas gibt. Die andere sagt, das sei gelogen. Als sie dich sehen, verstummen sie. Ein Fremder. „Du hast nichts damit zu tun“, sagt die eine. „Genau deshalb“, sagt die andere, „soll er entscheiden.“',
  O('Sich die beiden Geschichten anhören', 'hoeren'),
  O('Den Brunnen selbst untersuchen', 'brunnen'))
s['hoeren'] = S('dorf', 'Die eine, Berthe, hat Spuren gesehen: nasse Erde am Morgen, eine Tropfspur zum Garten der anderen. Die andere, Oda, hat einen Säugling und einen kranken Mann. Sie sagt, sie habe nur für sie geschöpft, tagsüber, wie erlaubt.',
  P('Lesen, wer lügt', 'menschenkenntnis', 12,
    B('Oda lügt – aber nicht ganz. Sie hat nachts geschöpft. Für ihr Kind, nicht für den Garten. Sie schämt sich.', 'entscheiden', folgen={'flag': ['oda_nacht']}),
    B('Beide glauben, was sie sagen.', 'entscheiden')),
  O('Den Brunnen untersuchen', 'brunnen'))
s['brunnen'] = MG('dorf', 'Der Brunnenschacht ist tief. Unten glitzert wenig Wasser. Am Seil: frische Fasern, als hätte es jemand nachts benutzt. Und am Rand eine Rinne, die jemand gegraben hat – zum Garten von Berthe!', 'spuren', 2, 'Den Brunnen lesen',
  B('Die Rinne ist frisch. Wer nachts schöpft und das Wasser auf den Weg kippt, legt eine Spur, die zum Nachbarn führt. Jemand wollte, dass es nach Oda aussieht – oder Berthe hat selbst geschöpft und die Spur gelegt.', 'entscheiden', folgen={'flag': ['rinne']}),
  B('Nasse Erde, ein Seil. Mehr erzählt der Brunnen nicht.', 'entscheiden'))
s['entscheiden'] = S('dorf', 'Die beiden warten. Das halbe Dorf wartet. Und du bist nur ein Gast.',
  O('„Die Rinne führt zu Berthe. Wer hat sie gegraben?“', 'ende_rinne', wenn={'flag': 'rinne'}),
  P('„Oda hat nachts geschöpft – für ihr Kind. Wer will ihr das vorwerfen?“', 'ueberreden', 12,
    B('Stille. Dann nickt Berthe, widerwillig. „Für ein Kind. Gut. Aber sag es nächstes Mal.“', 'ende_kind'),
    B('„Gesetz ist Gesetz“, sagt Berthe. Die Leute murmeln zustimmend.', 'ende_streit'), wenn={'flag': 'oda_nacht'}),
  O('„Teilt das Wasser nach Köpfen, nicht nach Gärten.“', 'ende_regel'))
s['ende_rinne'] = E('dorf', 'Berthe wird rot. Sie hat die Rinne gegraben, um Oda loszuwerden, die ihr den Platz am Brunnen streitig macht. Das Dorf lacht über sie, dann vergisst es. Oda bringt dir am Abend einen Kanten Brot – mehr hat sie nicht.',
  {'chronik': ['gast_brunnen', 'In einem fremden Dorf habe ich einen Brunnenstreit geschlichtet.'], 'beute': {'stufe': 1}})
s['ende_kind'] = E('dorf', 'Die Leute gehen auseinander. Oda weint vor Erleichterung. Berthe brummt. Im Dorf wird man noch lange von dem Fremden reden, der am Brunnen recht gesprochen hat.',
  {'chronik': ['gast_kind', 'In einem fremden Dorf habe ich für eine Mutter gesprochen.'], 'beute': {'stufe': 1}})
s['ende_regel'] = E('dorf', 'Die Regel ist einfach, und deshalb hält sie. Keine der beiden ist zufrieden, und beide befolgen sie. Der Dorfrat schreibt sie auf ein Brett und hängt es an den Brunnen.',
  {'chronik': ['gast_regel', 'In einem fremden Dorf habe ich eine Brunnenregel vorgeschlagen.']})
s['ende_streit'] = E('dorf', 'Oda muss eine Strafe zahlen. Sie zahlt mit ihrem letzten Huhn. Als du gehst, steht sie am Zaun und sieht dir nach.', {'chronik': ['gast_streit', 'Ich habe in einem fremden Dorf nicht helfen können.']})
Q.append(dict(id='o_gast_brunnen', titel='Streit am fremden Brunnen', fundort='spielerdorf', kurz='Zwei Frauen streiten am Brunnen. Weil du fremd bist, sollst du entscheiden.', start='start', szenen=s, schwer=1))

s = {}
s['start'] = S('dorf', 'Am Rand dieses Dorfes steht eine Frau vor einem leeren Haus und redet mit jemandem, der nicht da ist. Die Leute gehen vorbei, ohne hinzusehen. „Elske“, sagt einer dir leise. „Ihr Sohn ist vor einem Jahr zum Söldnerdienst gegangen und nicht zurückgekommen. Sie deckt jeden Abend für ihn den Tisch.“',
  O('Zu ihr gehen', 'elske'),
  O('Weitergehen', 'ende_weiter'))
s['elske'] = S('dorf', 'Elske lächelt dich an, als hätte sie dich erwartet. „Du kommst von draußen. Hast du meinen Jorin gesehen? Groß, rote Haare, lacht laut.“ Auf dem Tisch hinter ihr: zwei Teller, zwei Becher, ein Brot.',
  P('Behutsam fragen, was sie zuletzt von ihm gehört hat', 'beruhigen', 11,
    B('„Ein Brief. Im Winter. Er schrieb, er komme im Frühling.“ Sie holt ihn, zerknittert. Unter dem Brief, in fremder Hand, steht etwas, das sie nicht lesen kann: „Gefallen bei Kammwacht. Der Hauptmann.“', 'brief'),
    B('Sie weicht aus. „Er kommt bald. Ich weiß es.“', 'warten')),
  O('„Ich habe ihn gesehen.“ (lügen)', 'luege'))
s['warten'] = S('dorf', 'Sie stellt einen dritten Becher hin. Für dich.', O('Mit ihr am Tisch sitzen', 'brief', ergebnis='Ihr esst schweigend. Dann holt sie einen Brief, zerknittert, und legt ihn vor dich hin.'))
s['brief'] = S('dorf', 'Sie weiß es nicht. Niemand hat es ihr vorgelesen. Oder sie hat nicht zugehört.',
  O('Ihr vorlesen, was da steht', 'wahrheit'),
  O('Den Brief zusammenfalten und schweigen', 'ende_schweigen'))
s['wahrheit'] = S('dorf', 'Du liest es vor. Elske sitzt lange still. Dann nimmt sie den zweiten Teller vom Tisch und stellt ihn in den Schrank. Ganz langsam. „Ich wusste es“, sagt sie. „Ich wollte nur nicht, dass es jemand sagt.“',
  P('Bei ihr bleiben, bis sie weinen kann', 'beruhigen', 12,
    B('Sie weint die ganze Nacht. Am Morgen kommen die Nachbarinnen, zum ersten Mal seit einem Jahr. Sie bringen Brot. Sie bleiben.', 'ende_trauer'),
    B('Sie bittet dich zu gehen. Aber sie sagt danke.', 'ende_trauer')))
s['luege'] = S('dorf', 'Ihr Gesicht leuchtet auf. „Wo? Wann? Geht es ihm gut?“ Jetzt musst du die Lüge weitertragen.',
  O('Die Lüge zurücknehmen und ihr die Wahrheit sagen', 'brief', ergebnis='„Verzeih. Ich habe gelogen.“ Ihr Lächeln erlischt nicht gleich. Dann holt sie den Brief.'),
  O('Weiterlügen: „Er ist im Süden. Er kommt, wenn er kann.“', 'ende_luege'))
s['ende_trauer'] = E('dorf', 'Als du gehst, steht Elske am Fenster und winkt. Auf dem Tisch hinter ihr steht nur noch ein Teller. Ein Nachbar hält dich am Zaun auf. „Wir hätten es ihr sagen müssen“, sagt er. „Wir haben uns nicht getraut.“',
  {'chronik': ['gast_elske', 'In einem fremden Dorf habe ich einer Mutter die Wahrheit über ihren Sohn vorgelesen.'], 'beute': {'stufe': 1, 'text': 'Elske gibt dir etwas, das Jorin gehörte:'}})
s['ende_schweigen'] = E('dorf', 'Du gibst ihr den Brief zurück. Sie deckt weiter für zwei. Vielleicht ist das Barmherzigkeit. Vielleicht ist es nur Feigheit mit freundlichem Gesicht.', {'chronik': ['gast_elske_schweigen', 'Ich habe einer Mutter nicht gesagt, dass ihr Sohn tot ist.']})
s['ende_luege'] = E('dorf', 'Elske strahlt, als du gehst. Morgen wird sie wieder für zwei decken, und übermorgen, und im Frühling wird sie am Weg stehen. Und du wirst nie wieder hierher kommen können, ohne an sie zu denken.', {'chronik': ['gast_elske_luege', 'Ich habe einer Mutter gesagt, ihr toter Sohn lebe.']})
s['ende_weiter'] = E('dorf', 'Du gehst weiter. Hinter dir redet Elske mit dem leeren Haus.', {})
Q.append(dict(id='o_gast_elske', titel='Der gedeckte Tisch', fundort='spielerdorf', kurz='Eine Frau deckt jeden Abend für ihren Sohn, der nicht zurückkommt. Niemand im Dorf traut sich, mit ihr zu reden.', start='start', szenen=s, schwer=1))

for qd in Q: print(qd['id'], pruefe(qd['id'], qd['start'], qd['szenen']))
