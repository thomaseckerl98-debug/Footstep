# Weltereignisse (art 'welt'): einmalig für die ganze Welt. Wer zuerst abschließt, schreibt Geschichte.
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from qlib import O, B, P, S, R, MG, K, RZ, E, pruefe

Q = []
def KANON(key, kanon_titel, art, ort, titel, text, geruecht, gross=3, **extra):
    d = {'key': key, 'kanon_titel': kanon_titel, 'tat': {'art': art, 'ort': ort, 'gross': gross, 'titel': titel, 'text': text, 'geruecht': geruecht}}
    d.update(extra); return d

# ───────────── Die Nacht der Raben (Rabenfels) ─────────────
s = {}
s['start'] = S('burg', 'Rabenfels liegt unter einer Glocke aus Rauch. Auf den Gassen brennen Kleider von Fieberkranken, die Wachen tragen Tücher vor dem Mund. Als du durchs Tor kommst, läuten oben auf der Burg die Glocken – nicht zum Gottesdienst, sondern langsam, schwer. Eine Magd rennt an dir vorbei, es ist Wiebke aus der Burgküche. Sie erkennt dich nicht, aber sie keucht: „Der Graf hat das Fieber. Und der Vogt hat das Tor zum Turm schließen lassen.“',
  O('Wiebke hinterherlaufen', 'wiebke'),
  O('Zur Burgkapelle, zu Kaplan Severin', 'severin'),
  O('Im Dorf unter dem Felsen herumhören', 'dorf'))
s['dorf'] = S('dorf', 'In der Schenke unter dem Felsen sitzen Männer, die nicht trinken. „Ragnolf hat heute Mittag Graumäntel durchs Tor gelassen“, flüstert einer. „Zwanzig, vielleicht mehr. Wozu braucht man Meuchler, wenn der Graf ohnehin stirbt?“ Ein anderer: „Damit Gerlinde nicht rechtzeitig kommt. Die Tochter. Sie ist im Kloster Morgenstern. Wenn der Graf stirbt, bevor sie hier ist, nimmt sich der Vogt den Stuhl.“',
  O('Zur Burg, zu Wiebke', 'wiebke', folgen={'flag': ['graumaentel_gehoert']}),
  O('Zur Kapelle, zu Severin', 'severin', folgen={'flag': ['graumaentel_gehoert']}))
s['wiebke'] = S('burg', 'Wiebke zieht dich in einen Vorratskeller. „Der Graf liegt oben im Turm. Ragnolf lässt niemanden zu ihm, nicht einmal den Bader. Er sagt, wegen der Ansteckung.“ Sie dreht ihre Schürze in den Händen. „Ich habe ihm heute die Suppe gebracht. Er hat kaum Fieber gehabt. Er hat gezittert und sich übergeben. Das ist kein Fleckfieber, das ist etwas anderes.“',
  P('Fragen, was genau sie gesehen hat', 'heilkunde', 13,
    B('Zittern, Erbrechen, kalte Haut, kaum Fieber, enge Pupillen. Das ist kein Fieber. Das ist Eisenhut, in kleinen Gaben. Jemand vergiftet den Grafen langsam, damit es nach Fieber aussieht.', 'plan', folgen={'flag': ['gift_erkannt']}),
    B('Klingt schlimm, aber du kannst es nicht deuten.', 'plan')),
  O('„Kannst du mich zu ihm bringen?“', 'plan'))
s['severin'] = S('burg', 'Severin kniet nicht. Er steht am Altar und packt Bücher in eine Kiste, als wolle er fliehen. „Das Testament“, sagt er, als er dich sieht, ohne Begrüßung. „Der Graf hat es mir anvertraut. Gerlinde soll die Grafschaft erben. Ragnolf weiß es. Wenn er es findet, verbrennt er es, und dann gilt das alte Recht: Der Vogt verwaltet, bis ein Erbe kommt. Er wird dafür sorgen, dass keiner kommt.“',
  O('„Gib mir das Testament. Ich bringe es in Sicherheit.“', 'testament'),
  O('„Warum fliehst du nicht damit?“', 'severin2'))
s['severin2'] = S('burg', 'Severin lacht unglücklich. „Weil ich ein Feigling bin. Ich habe Ragnolf die Beichte abgenommen – ich weiß, was er vorhat, seit Wochen. Und ich habe nichts getan.“ Er drückt dir ein versiegeltes Pergament in die Hand. „Tu du es.“',
  O('Das Testament nehmen', 'plan', folgen={'flag': ['testament']}))
s['testament'] = S('burg', 'Severin zögert, dann gibt er dir ein versiegeltes Pergament. „Das Siegel des Grafen. Gerlinde muss es vor Zeugen öffnen.“', O('Es sicher verstauen', 'plan', folgen={'flag': ['testament']}))
s['plan'] = S('burg', 'Die Nacht kommt früh auf dem Felsen. Irgendwo oben stirbt ein alter Mann – oder wird getötet. Die Graumäntel stehen an den Treppen. Gerlinde ist Tage entfernt. Was jetzt geschieht, entscheidet über Rabenfels.',
  O('In den Turm schleichen, zum Grafen', 'turm'),
  O('Reiter nach Kloster Morgenstern schicken, damit Gerlinde kommt', 'bote'),
  O('Ragnolf direkt zur Rede stellen', 'ragnolf'))
s['bote'] = S('burg', 'Im Stall findest du einen Burschen, Gunthram, der für ein paar Münzen jedes Pferd reitet. „Morgenstern? Zwei Tage. Wenn die Graumäntel mich nicht vorher erwischen.“',
  P('Ihn mit genug Mut ausstatten, dass er reitet', 'ueberreden', 12,
    B('Er nickt, blass. Minuten später hörst du Hufe auf dem Felsweg. Ob er durchkommt, wirst du erst später erfahren.', 'turm', folgen={'flag': ['bote']}),
    B('„Nein. Ich will leben.“ Er verschwindet im Heu.', 'turm')))
s['turm'] = MG('burg', 'Der Turm wird bewacht, aber die Wachen schauen nach außen, nicht nach innen. Ein alter Abwurfschacht für Küchenabfälle führt nach oben.', 'seil', 3, 'Durch den Schacht klettern',
  B('Du kommst oben heraus, verdreckt, in einer Kammer neben dem Schlafgemach. Durch die Tür hörst du schweres Atmen. Und eine leise Stimme: Ragnolf.', 'gemach'),
  B('Du rutschst ab, Lärm. Schritte. Du musst dich verstecken – und siehst nur noch, wie Ragnolf aus dem Gemach kommt und die Tür absperrt.', 'ragnolf', folgen={'flag': ['entdeckt']}))
s['gemach'] = S('burg', 'Ragnolf sitzt am Bett des Grafen. Er hält ihm einen Becher an die Lippen, sanft wie eine Amme. „Trink, Herr. Bald ist es vorbei.“ Der alte Mann trinkt. Ragnolf steht auf, geht hinaus, ohne dich zu bemerken. Der Graf sieht dich aus dem Halbdunkel an. Er weiß nicht, wer du bist. Aber er weiß, was in dem Becher war.',
  P('Dem Grafen helfen, das Gift loszuwerden', 'heilkunde', 13,
    B('Salzwasser, ein Finger im Hals, Kohle aus dem Kamin. Würdelos, aber es wirkt. Der Graf ist schwach – aber er wird diese Nacht überleben. „Wer bist du?“ – „Jemand, der nicht will, dass es so endet.“', 'graf_lebt', folgen={'flag': ['graf_gerettet']}),
    B('Du tust, was du kannst. Es reicht nicht. Der Graf greift nach deiner Hand und flüstert: „Gerlinde.“ Dann ist er still.', 'graf_tot'), mod={'gift_erkannt': -3}),
  O('Den Becher als Beweis an dich nehmen und verschwinden', 'graf_tot', folgen={'flag': ['becher']}))
s['graf_lebt'] = S('burg', 'Der Graf richtet sich mühsam auf. „Ragnolf.“ Er sagt den Namen wie ein Fluch und wie eine Trauer. „Dreißig Jahre.“ Draußen auf der Treppe Schritte, viele.',
  O('„Ihr müsst Euch zeigen, Herr. Vor allen. Heute Nacht noch.“', 'saal'),
  O('Den Grafen verstecken, bis Gerlinde kommt', 'versteck'))
s['graf_tot'] = S('burg', 'Die Glocken läuten jetzt schneller. Der Graf ist tot. Ragnolf wird im Morgengrauen vor dem versammelten Hof sprechen – als Verwalter, als Trauernder, als neuer Herr.',
  O('Vor dem Hof das Testament verlesen', 'saal_testament', wenn={'flag': 'testament'}),
  O('Vor dem Hof den Giftbecher zeigen', 'saal_becher', wenn={'flag': 'becher'}),
  O('Fliehen, solange es noch geht', 'ende_ragnolf'),
  O('Ragnolf zur Rede stellen', 'ragnolf'))
s['ragnolf'] = S('burg', 'Ragnolf empfängt dich in der Wachstube, als hätte er dich erwartet. Er spricht so leise, dass du dich vorbeugen musst. „Du bist der aus dem Hügelland. Der mit dem Ring des Königs, oder der ohne – das ist mir gleich.“ Er schenkt dir Wein ein. „Rabenfels braucht einen starken Herrn. Gerlinde ist eine Klosterfrau. Ich habe dreißig Jahre dieses Land regiert, während Wulfhard Hirsche jagte. Hilf mir, und das Hügelland ist frei von Abgaben, solange ich lebe.“',
  O('„Ich nehme an.“', 'ende_ragnolf_hilfe'),
  P('„Du hast deinen Herrn vergiftet. Kein Mensch folgt einem Giftmischer.“', 'einschuechtern', 15,
    B('Für einen Herzschlag verliert Ragnolf die Fassung. Dann lächelt er. „Beweise es.“ Aber du hast gesehen, dass er Angst hat.', 'saal', folgen={'flag': ['ragnolf_wankt']}),
    B('„Wer hat das gesagt? Die Magd?“ Er winkt die Wachen. Du entkommst, aber Wiebke wird heute Nacht nicht mehr in der Küche sein.', 'saal', folgen={'flag': ['wiebke_gefangen']}), wenn={'flag': 'gift_erkannt'}),
  O('Wortlos aufstehen und gehen', 'saal'))
s['versteck'] = S('burg', 'Ihr bringt den Grafen in Severins Sakristei. Drei Tage. Drei Tage, in denen Ragnolf die Burg durchsucht und erzählt, der Graf sei im Fieber in den Felsen gestürzt. Am dritten Abend Hufe auf dem Felsweg.',
  O('Hinaus, um zu sehen, wer kommt', 'ankunft'))
s['ankunft'] = S('burg', 'Ob Reiter kommen, hängt davon ab, ob dein Bote durchgekommen ist. Hufe auf dem Felsweg – viele. Ragnolfs Graumäntel stehen am Tor.',
  O('Den Grafen auf die Mauer führen, damit alle ihn sehen', 'ende_wulfhard'),
  O('Kämpfen, um das Tor zu öffnen', 'kampf'))
s['saal'] = S('burg', 'Der große Saal im Morgengrauen. Der ganze Hof ist da, Ritter, Mägde, Graumäntel an den Wänden. Ragnolf steht vor dem leeren Stuhl des Grafen und hebt die Hand. „Unser Herr …“',
  O('Den Grafen hereinführen', 'ende_wulfhard', wenn={'flag': 'graf_gerettet'}),
  O('Das Testament verlesen', 'saal_testament', wenn={'flag': 'testament'}),
  O('Zur Waffe greifen', 'kampf'),
  O('Schweigen', 'ende_ragnolf'))
s['saal_testament'] = S('burg', 'Du trittst vor und brichst das Siegel. Gerlinde soll erben. Ein Raunen geht durch den Saal. Ragnolf lacht leise. „Ein Fremder mit einem Pergament. Wer sagt, dass das echt ist?“',
  P('Den Hof überzeugen: das Siegel, Severins Zeugnis, Ragnolfs Hast', 'ueberreden', 14,
    B('Severin tritt neben dich, zitternd, und sagt laut: „Ich war dabei, als der Graf es siegelte.“ Ein Ritter nach dem anderen tritt von Ragnolf weg.', 'ende_gerlinde'),
    B('Zu viele Graumäntel, zu wenig Mut. Die Ritter sehen weg.', 'kampf'), mod={'ragnolf_wankt': -2}))
s['saal_becher'] = S('burg', 'Du hebst den Becher hoch. „Riecht daran. Eisenhut. Der Vogt hat ihn eigenhändig eingeschenkt.“ Totenstille. Dann ruft Ragnolf: „Ergreift den Mörder!“ – und meint dich.',
  P('Ruhig bleiben und den Bader rufen lassen, damit er riecht', 'beruhigen', 13,
    B('Der Bader riecht, wird bleich und nickt. Die Graumäntel sehen einander an. Niemand will für einen Giftmischer sterben. Ragnolf zieht sein Schwert – allein.', 'ende_gerlinde'),
    B('Die Wachen packen dich. Ein Graumantel lächelt.', 'kampf')))
s['kampf'] = K('burg', 'Graumäntel, zwei Klingen jeder. Ragnolf gibt leise Befehle.', 'Die Nacht der Raben', 'banditen', 540,
  B('Die Graumäntel fliehen über die Mauer, als ihr Sold nicht mehr sicher ist. Ragnolf liegt verwundet im Saal. Der Hof sieht dich an.', 'nach_kampf'),
  B('Du wirst über die Mauer geworfen und überlebst den Sturz nur knapp. Als du wieder zu dir kommst, wehen über Rabenfels schwarze Fahnen mit einem Raben.', 'ende_ragnolf', folgen={'gefahr': 2}), schwer=3)
s['nach_kampf'] = S('burg', 'Ragnolf blutet. „Mach schon“, sagt er. „Oder lass es. Ohne mich zerfällt Rabenfels in einem Jahr.“',
  O('Ihn dem Hof übergeben und auf Gerlinde warten', 'ende_gerlinde'),
  O('Ihn laufen lassen – Rabenfels soll sein Blut nicht brauchen', 'ende_gerlinde_gnade'))

RF = 'rabenfels'
s['ende_wulfhard'] = E('burg', 'Der alte Graf steht auf der Mauer, gestützt auf deine Schulter, grau wie sein Beiname. Unten fällt der Hof auf die Knie. Ragnolf wird noch in derselben Stunde in Ketten gelegt. Wulfhard sieht lange auf die Ketten. Dann sagt er nur: „Dreißig Jahre.“ Er wird nicht mehr lange leben, das weiß jeder. Aber er wird nicht ermordet sterben.',
  {'chronik': ['nacht_wulfhard', 'Ich habe Graf Wulfhard vor dem Gift seines Vogts gerettet.'], 'beute': {'stufe': 2, 'text': 'Graf Wulfhard nimmt einen Ring von seiner Hand:'},
   'welt_kanon': KANON('rabenfels_nacht', 'Die Nacht der Raben: Graf Wulfhard überlebt den Giftanschlag seines Vogts Ragnolf', 'kanon', RF,
     'Der Vogt von Rabenfels in Ketten', '{held} aus {dorf} hat in Rabenfels den Giftanschlag des Burgvogts Ragnolf auf Graf Wulfhard vereitelt. Der Graf lebt, Ragnolf sitzt im Kerker, die Graumäntel sind aus der Burg geflohen.',
     'In Rabenfels soll der Vogt den alten Grafen vergiftet haben – und ein Fremder aus dem Hügelland hat ihn aufgehalten, heißt es.', 3,
     fakten={'ragnolf': 'kerker', 'herr': 'wulfhard'}, bez=[{'a': 'rabenfels', 'b': 'moosherz', 'art': 'nachbar', 'grund': 'Seit der Nacht der Raben vorsichtige Annäherung'}, {'a': 'kraehenstieg', 'b': 'rabenfels', 'art': 'rivalitaet', 'grund': 'Die Graumäntel haben in Rabenfels verloren'}])})
s['ende_gerlinde'] = E('burg', 'Zwei Tage später reitet Gerlinde durch das Tor von Rabenfels, in grauem Klostergewand, mit kurzgeschorenem Haar. Sie geht wortlos an Ragnolf in seinen Ketten vorbei und setzt sich auf den Stuhl ihres Vaters. Ihre erste Anordnung: Die Grenze wird für Ärzte und Korn geöffnet, nicht für Soldaten. Ihre zweite: Der Vogt wird nicht gehängt. Er wird in das Kloster geschickt, in ihre alte Zelle.',
  {'chronik': ['nacht_gerlinde', 'Ich habe geholfen, dass Gerlinde Gräfin von Rabenfels wurde.'], 'beute': {'stufe': 2, 'text': 'Gräfin Gerlinde lässt dir überreichen:'},
   'welt_kanon': KANON('rabenfels_nacht', 'Die Nacht der Raben: Gerlinde wird Gräfin von Rabenfels', 'herrscher', RF,
     'Gräfin Gerlinde herrscht in Rabenfels', 'In Rabenfels ist Graf Wulfhard gestorben, vergiftet von seinem Vogt Ragnolf. Doch {held} aus {dorf} hat das Testament gerettet: Seine Tochter Gerlinde ist jetzt Gräfin. Sie öffnet die Grenze für Ärzte und Korn.',
     'Rabenfels hat eine Herrin, eine Nonne, sagt man. Und der alte Vogt sitzt in einer Klosterzelle.', 3,
     herrscher={'reich': 'rabenfels', 'name': 'Gräfin Gerlinde'}, fakten={'ragnolf': 'kloster', 'herr': 'gerlinde', 'wulfhard': 'tot'},
     bez=[{'a': 'rabenfels', 'b': 'moosherz', 'art': 'handel', 'grund': 'Gräfin Gerlinde öffnet die Grenze für Korn und Arznei'}, {'a': 'kraehenstieg', 'b': 'rabenfels', 'art': 'rivalitaet', 'grund': 'Die Graumäntel haben in Rabenfels verloren'}])})
s['ende_gerlinde_gnade'] = E('burg', 'Ragnolf humpelt in die Nacht hinaus, ohne sich umzudrehen. Gerlinde kommt zwei Tage später und wird Gräfin. Als sie hört, dass du den Vogt hast gehen lassen, sieht sie dich lange an. „Mein Vater hätte ihn hängen lassen“, sagt sie. „Und ich hätte ihn dafür gehasst.“ Irgendwo jenseits der Grenze lebt jetzt ein Mann, der dreißig Jahre Macht verloren hat.',
  {'chronik': ['nacht_gnade', 'Ich habe Ragnolf gehen lassen. Gerlinde ist Gräfin.'], 'beute': {'stufe': 1},
   'welt_kanon': KANON('rabenfels_nacht', 'Die Nacht der Raben: Gerlinde wird Gräfin, Ragnolf flieht', 'herrscher', RF,
     'Gräfin Gerlinde herrscht in Rabenfels – der Vogt ist auf der Flucht', 'Graf Wulfhard ist tot, vergiftet. Seine Tochter Gerlinde ist Gräfin von Rabenfels. Der Vogt Ragnolf ist geflohen – {held} aus {dorf} soll ihn haben gehen lassen.',
     'Der Rabe von Rabenfels ist ausgeflogen, sagt man. Niemand weiß, wohin.', 3,
     herrscher={'reich': 'rabenfels', 'name': 'Gräfin Gerlinde'}, fakten={'ragnolf': 'flucht', 'herr': 'gerlinde', 'wulfhard': 'tot'},
     bez=[{'a': 'rabenfels', 'b': 'moosherz', 'art': 'handel', 'grund': 'Gräfin Gerlinde öffnet die Grenze für Korn und Arznei'}])})
s['ende_ragnolf'] = E('burg', 'Im Morgengrauen spricht Ragnolf zum Hof. Er trauert glaubhaft um seinen Herrn. Er verspricht Ordnung, Brot und Stärke. Über dem Tor hängen sie eine neue Fahne auf: ein schwarzer Rabe auf grauem Grund. Gerlinde wird nie in Rabenfels ankommen. Man wird erzählen, sie sei auf dem Weg im Fieber gestorben.',
  {'chronik': ['nacht_ragnolf', 'Ragnolf hat in Rabenfels die Macht ergriffen. Ich war dabei und konnte es nicht verhindern.'],
   'welt_kanon': KANON('rabenfels_nacht', 'Die Nacht der Raben: Burgvogt Ragnolf reißt Rabenfels an sich', 'herrscher', RF,
     'Der Rabe herrscht in Rabenfels', 'Graf Wulfhard von Rabenfels ist tot. Sein Burgvogt Ragnolf hat die Grafschaft an sich gerissen; über dem Tor weht ein schwarzer Rabe. Die Graumäntel aus Krähenstieg stehen jetzt in seinem Sold. Moosherz ist in Sorge.',
     'Der alte Graf ist tot, und ein Rabe sitzt auf seinem Stuhl, heißt es. Man sagt, er hat ihn vergiftet.', 3,
     herrscher={'reich': 'rabenfels', 'name': 'Ragnolf der Rabe'}, fakten={'ragnolf': 'herrscher', 'herr': 'ragnolf', 'wulfhard': 'tot'},
     bez=[{'a': 'rabenfels', 'b': 'moosherz', 'art': 'rivalitaet', 'grund': 'Der Rabe von Rabenfels rüstet gegen Moosherz'}, {'a': 'kraehenstieg', 'b': 'rabenfels', 'art': 'buendnis', 'grund': 'Die Graumäntel dienen dem Raben'}])})
s['ende_ragnolf_hilfe'] = E('burg', 'Du hilfst Ragnolf, die Nacht zu überstehen. Am Morgen weht über Rabenfels die Fahne mit dem schwarzen Raben, und in deiner Tasche liegt ein Brief mit Rabensiegel: Das Hügelland zahlt keine Abgaben, solange Ragnolf lebt. Er wird lange leben wollen. Und er wird sich erinnern, wer ihm geholfen hat – und dass so jemand auch anderen helfen könnte.',
  {'chronik': ['nacht_ragnolf_hilfe', 'Ich habe Ragnolf geholfen, Herr von Rabenfels zu werden.'], 'beute': {'stufe': 2, 'text': 'Ragnolf hält Wort und lässt dir bringen:'},
   'welt_kanon': KANON('rabenfels_nacht', 'Die Nacht der Raben: Burgvogt Ragnolf reißt Rabenfels an sich – mit Hilfe aus dem Hügelland', 'herrscher', RF,
     'Der Rabe herrscht in Rabenfels', 'Graf Wulfhard von Rabenfels ist tot. Sein Burgvogt Ragnolf hat die Grafschaft an sich gerissen, und man sagt, {held} aus {dorf} habe ihm dabei geholfen. Über dem Tor weht ein schwarzer Rabe.',
     'Der Rabe sitzt auf dem Grafenstuhl, und Hügelländer haben ihm die Leiter gehalten, flüstert man.', 3,
     herrscher={'reich': 'rabenfels', 'name': 'Ragnolf der Rabe'}, fakten={'ragnolf': 'herrscher', 'herr': 'ragnolf', 'wulfhard': 'tot'},
     bez=[{'a': 'rabenfels', 'b': 'moosherz', 'art': 'rivalitaet', 'grund': 'Der Rabe von Rabenfels rüstet gegen Moosherz'}, {'a': 'kraehenstieg', 'b': 'rabenfels', 'art': 'buendnis', 'grund': 'Die Graumäntel dienen dem Raben'}])})
Q.append(dict(id='w_nacht_der_raben', titel='Die Nacht der Raben', fundort='rabenfels', kanon='rabenfels_nacht', kurz='In Rabenfels liegt der alte Graf im Sterben, und sein Vogt hat das Tor zum Turm verschlossen. Was in dieser Nacht geschieht, verändert die Grafschaft – für alle.', start='start', szenen=s, schwer=3))

# ───────────── Die Schlacht um Kammwacht ─────────────
s = {}
s['start'] = S('dorf', 'Ein königlicher Reiter mit dem goldenen Hirsch auf dem Mantel hält auf dem Dorfplatz und liest vor: „König Ottokar ruft den Heerbann. Kammwacht, die Feste, die uns im Grenzkrieg genommen wurde, soll zurück ins Königreich. Wer eine Waffe tragen kann, sammle sich in Hollerbrück.“ Dann reitet er weiter. Auf dem Platz ist es still. Ein paar Alte sehen zu Boden. Sie waren schon einmal bei Kammwacht.',
  O('Sich dem Heerbann anschließen', 'aufbruch'),
  O('Erst mit einem der Alten reden', 'alte'))
s['alte'] = S('dorf', 'Der alte Zimmermann spuckt aus. „Kammwacht. Da haben sie uns damals hingeschickt, junge Kerle, und wer zurückkam, kam als ein anderer zurück. Es gibt dort eine Scheune. Gab. Frag nicht.“ Er sieht dich an. „Wenn du gehst, dann komm als derselbe zurück.“',
  O('Aufbrechen', 'aufbruch', folgen={'flag': ['scheune_erinnert']}))
s['aufbruch'] = R('wald', 'Der Weg nach Osten führt über Hollerbrück, wo das Heer sich sammelt, und dann hinauf in die Vorberge des Ostkamms.', 240, 'lager', unterwegs='Du ziehst mit dem Heerbann nach Osten.')
s['lager'] = S('feuer', 'Das Heerlager vor Kammwacht: tausend Feuer, Pferdemist, Gebete. Hauptmann Bruno aus Moosherz führt die Hügelländer. Die Feste thront auf einem Grat, die Mauern grau, oben die Fahne der Ostmark. „Morgen früh stürmen wir“, sagt Bruno. „Der Herzog Ansgar führt den Angriff. Er hat Befehl gegeben: Wer sich nicht ergibt, wird nicht geschont. Auch die im Dorf unter der Feste nicht.“',
  O('„Das Dorf? Da leben Bauern.“', 'befehl'),
  O('Die Mauern auskundschaften', 'kundschaft'),
  O('Nachts ins Dorf unter der Feste schleichen', 'dorf_nacht'))
s['befehl'] = S('feuer', 'Bruno sieht dich lange an. „Ich war vor zwanzig Jahren hier. Ich weiß, was du meinst.“ Er senkt die Stimme. „Ansgar will Rache für den Grenzkrieg und ein Exempel. Wenn die Feste fällt, bevor er das Dorf erreicht, gibt es nichts mehr zu strafen.“',
  O('„Dann muss die Feste schnell fallen. Ohne Blutbad.“', 'kundschaft', folgen={'flag': ['bruno_verbuendet']}),
  O('„Befehl ist Befehl.“', 'sturm'))
s['kundschaft'] = MG('berg', 'Im Morgennebel kriechst du am Grat entlang. Die Mauern sind alt, an der Nordseite bröckelt der Mörtel. Und dort, eine Pforte für Wasserträger, kaum bewacht.', 'spuren', 3, 'Die Mauern lesen',
  B('Die Wasserpforte. Durch sie kämen zwanzig Mann in die Feste, bevor jemand Alarm schlägt.', 'entscheidung', folgen={'flag': ['pforte']}),
  B('Nebel, Fels, Wachen. Nichts, was einen Sturm überflüssig macht.', 'entscheidung'))
s['dorf_nacht'] = S('dorf', 'Das Dorf unter der Feste: zwanzig Häuser, Weinstöcke, Kinder, die im Schlaf husten. Eine alte Frau steht vor ihrer Tür und sieht dich an, als wüsste sie, wer du bist. „Ihr kommt also wieder“, sagt sie. „Beim letzten Mal habt ihr meine Schwester in einer Scheune verbrannt.“',
  P('„Ich bin nicht gekommen, um zu verbrennen. Wer führt die Feste?“', 'menschenkenntnis', 12,
    B('Sie mustert dich, dann redet sie: „Kommandant Leuthold. Ein alter Mann. Er will nicht sterben für eine Markgräfin, die ihm seit einem Jahr keinen Sold schickt. Er würde reden – wenn ihm jemand das Leben seiner Leute verspricht.“', 'entscheidung', folgen={'flag': ['leuthold']}),
    B('Sie schließt die Tür vor deiner Nase.', 'entscheidung')),
  O('Leise wieder gehen', 'entscheidung'))
s['entscheidung'] = S('feuer', 'Das Morgengrauen färbt den Grat rot. Die Hörner blasen. Ansgars Ritter sitzen auf. Was jetzt geschieht, wird in Moosherz und in Brandenstein erzählt werden – und in jeder Schenke dazwischen.',
  O('Mit zwanzig Hügelländern durch die Wasserpforte, bevor der Sturm beginnt', 'pforte', wenn={'flag': 'pforte'}),
  O('Zu Kommandant Leuthold gehen und um Übergabe verhandeln', 'leuthold', wenn={'flag': 'leuthold'}),
  O('Mit dem Heer stürmen', 'sturm'),
  O('Bruno überreden, Ansgar aufzuhalten, und einen Frieden vorschlagen', 'frieden'))
s['pforte'] = K('berg', 'Ein schmaler Gang, nasser Stein, dann der Hof der Feste. Die Verteidiger rennen zu den Mauern – und finden euch hinter sich.', 'In der Feste Kammwacht', 'banditen', 480,
  B('Das Tor schwingt von innen auf, bevor Ansgars Ritter es erreichen. Die Besatzung legt die Waffen nieder. Auf dem Turm reißt jemand die Fahne der Ostmark herunter.', 'nach_fall'),
  B('Ihr werdet in den Hof zurückgedrängt. Draußen beginnt der Sturm, und er wird lang und blutig.', 'sturm_blutig', folgen={'gefahr': 1}), schwer=3)
s['leuthold'] = S('burg', 'Leuthold ist ein müder Mann mit grauem Bart, der dich in seiner Kammer empfängt, das Schwert auf dem Tisch. „Sie wollen also die Feste. Und was bekommen meine Leute?“',
  P('„Freien Abzug mit Waffen und Ehre. Und das Dorf bleibt unberührt – mein Wort und das von Hauptmann Bruno.“', 'ueberreden', 14,
    B('Er schweigt lange. „Ein Wort aus dem Hügelland.“ Dann steht er auf. „Gut. Ich öffne das Tor bei Sonnenaufgang. Wenn dein Herzog trotzdem ins Dorf reitet, komme ich zurück und hole dich.“', 'uebergabe'),
    B('„Worte. Ansgar hat schon einmal Worte gebrochen.“ Er lässt dich hinausbringen.', 'sturm'), mod={'bruno_verbuendet': -2}))
s['frieden'] = S('feuer', 'Bruno hört dich an, dann geht er mit dir zu Ansgar. Der Herzog lacht. Aber im Zelt sitzt auch ein Gesandter des Salzbundes, der nur offene Straßen will, und eine Botin der Markgräfin Ysolde, die schon seit Tagen wartet.',
  P('„Kammwacht bleibt bei der Ostmark – aber der Weg über den Pass wird frei für Moosherzer Händler, und die Ostmark zahlt für zwanzig Jahre Zoll.“', 'feilschen', 15,
    B('Die Botin der Ostmark nickt langsam. Der Salzbund-Gesandte klatscht in die Hände. Ansgar flucht, aber er weiß, dass der König Geld lieber mag als Gräber.', 'ende_frieden'),
    B('Ansgar wirft dich aus dem Zelt. „Bauern sollen kämpfen, nicht reden.“', 'sturm')))
s['sturm'] = K('berg', 'Leitern an den Mauern, Pech von oben, Schreie. Du kletterst mit den Hügelländern hinauf.', 'Sturm auf Kammwacht', 'banditen', 660,
  B('Ihr seid auf der Mauer. Die Verteidiger weichen zurück, dann fliehen sie. Kammwacht fällt.', 'nach_fall'),
  B('Die Leitern brechen, der Sturm scheitert. Bei Sonnenuntergang zieht sich das Heer zurück. Kammwacht hält.', 'ende_niederlage', folgen={'gefahr': 2}), schwer=3)
s['sturm_blutig'] = K('berg', 'Ihr kämpft im Hof, während draußen die Ritter gegen das Tor rennen.', 'Der lange Sturm', 'banditen', 420,
  B('Am Abend fällt die Feste – teuer erkauft.', 'nach_fall'),
  B('Kammwacht hält. Das Heer zieht ab.', 'ende_niederlage', folgen={'gefahr': 2}), schwer=3)
s['nach_fall'] = S('burg', 'Kammwacht ist gefallen. Herzog Ansgar reitet durch das Tor, sieht sich um und zeigt hinunter ins Dorf. „Und jetzt die da unten. Für den Grenzkrieg.“ Seine Ritter wenden die Pferde.',
  P('Dich mit den Hügelländern in den Weg stellen', 'einschuechtern', 14,
    B('Zwanzig Bauern mit blutigen Äxten stehen zwischen den Rittern und dem Dorf. Bruno stellt sich dazu. Ansgar sieht sie an, sieht dich an – und reitet zurück in die Feste. Das Dorf schläft heute Nacht ohne Feuer.', 'ende_sieg_gnade'),
    B('Die Ritter reiten an euch vorbei. Später brennt im Dorf eine Scheune.', 'ende_sieg_brand')),
  O('Nichts tun', 'ende_sieg_brand'))
s['uebergabe'] = S('burg', 'Bei Sonnenaufgang öffnet sich das Tor von Kammwacht. Leutholds Leute ziehen ab, die Waffen geschultert, und niemand hält sie auf, weil Bruno und die Hügelländer am Wegrand stehen. Ansgar tobt. Das Dorf unter der Feste bleibt still.', O('Die Feste betreten', 'ende_uebergabe'))

KW = 'kammwacht'
s['ende_sieg_gnade'] = E('burg', 'Über Kammwacht weht wieder der goldene Hirsch. In Moosherz läuten die Glocken, König Ottokar soll geweint haben. Im Dorf unter der Feste bringt dir die alte Frau am nächsten Morgen Brot. Sie sagt nichts. Das muss sie auch nicht.',
  {'chronik': ['kammwacht_gnade', 'Kammwacht ist gefallen. Ich habe das Dorf darunter vor Ansgars Rittern geschützt.'], 'beute': {'stufe': 2, 'text': 'Hauptmann Bruno drückt dir etwas in die Hand:'},
   'welt_kanon': KANON('kammwacht_schlacht', 'Die Schlacht um Kammwacht: Moosherz erobert die Feste zurück – das Dorf bleibt verschont', 'schlacht', KW,
     'Kammwacht ist wieder moosherzisch', 'Das Heer von König Ottokar hat die Feste Kammwacht im Sturm genommen. Als Herzog Ansgar das Dorf unter der Feste strafen wollte, stellten sich {held} aus {dorf} und die Hügelländer seinen Rittern in den Weg.',
     'Kammwacht ist gefallen, sagt man, und Bauern aus dem Hügelland haben einem Herzog die Stirn geboten.', 3,
     ort_wechsel={'ort': KW, 'reich': 'moosherz'}, fakten={'kammwacht': 'moosherz'},
     bez=[{'a': 'moosherz', 'b': 'brandenstein', 'art': 'rivalitaet', 'grund': 'Kammwacht ist wieder moosherzisch'}])})
s['ende_sieg_brand'] = E('burg', 'Über Kammwacht weht der goldene Hirsch. Im Dorf darunter brennt eine Scheune, und diesmal hat niemand die Tür zugehalten, weil niemand mehr drin war – die Leute sind in die Weinberge geflohen. Ansgar lässt sich in Moosherz feiern. Die Ostmark wird das nicht vergessen.',
  {'chronik': ['kammwacht_brand', 'Kammwacht ist gefallen. Das Dorf darunter hat gebrannt.'], 'beute': {'stufe': 1},
   'welt_kanon': KANON('kammwacht_schlacht', 'Die Schlacht um Kammwacht: Moosherz erobert die Feste zurück, das Dorf darunter brennt', 'schlacht', KW,
     'Kammwacht ist gefallen – und das Dorf brennt', 'Das Heer von König Ottokar hat die Feste Kammwacht zurückerobert. Herzog Ansgars Ritter haben danach das Dorf unter der Feste in Brand gesteckt. In der Ostmark schwört man Rache.',
     'Wieder brennt es bei Kammwacht, erzählt man. Manche Dinge ändern sich nie.', 3,
     ort_wechsel={'ort': KW, 'reich': 'moosherz'}, fakten={'kammwacht': 'moosherz', 'dorf_verbrannt': True},
     bez=[{'a': 'moosherz', 'b': 'brandenstein', 'art': 'rivalitaet', 'grund': 'Das Dorf bei Kammwacht brannte'}])})
s['ende_uebergabe'] = E('burg', 'Kammwacht gehört wieder zu Moosherz, und kein Tropfen Blut ist geflossen. In Moosherz nennen sie es eine Schande – eine Feste ohne Sturm. In den Dörfern beiderseits der Grenze nennen sie es ein Wunder. Leuthold schickt dir einen Brief aus Brandenstein: „Du hast Wort gehalten. Das ist selten.“',
  {'chronik': ['kammwacht_uebergabe', 'Ich habe Kammwacht ohne Blut übergeben lassen.'], 'beute': {'stufe': 2, 'text': 'Leutholds Brief liegt etwas bei:'},
   'welt_kanon': KANON('kammwacht_schlacht', 'Kammwacht: Die Feste wird ohne Kampf an Moosherz übergeben', 'gebiet', KW,
     'Kammwacht ergibt sich ohne Kampf', 'Die Feste Kammwacht ist ohne Sturm an König Ottokar gefallen: {held} aus {dorf} hat mit dem Kommandanten Leuthold freien Abzug ausgehandelt. Das Dorf unter der Feste blieb unberührt.',
     'Eine Feste, die sich ergibt, ohne dass einer stirbt? Das gibt es also doch, erzählt man.', 3,
     ort_wechsel={'ort': KW, 'reich': 'moosherz'}, fakten={'kammwacht': 'moosherz', 'unblutig': True},
     bez=[{'a': 'moosherz', 'b': 'brandenstein', 'art': 'nachbar', 'grund': 'Kammwacht wechselte ohne Blut den Herrn'}])})
s['ende_frieden'] = E('feuer', 'Es gibt keine Schlacht. Kammwacht bleibt bei der Ostmark, aber über den Pass rollen bald Wagen aus Moosherz, und die Ostmark zahlt. Ansgar reitet wütend heim. Der König, sagt man, habe gelacht, als er von der Abmachung hörte – zum ersten Mal seit Jahren.',
  {'chronik': ['kammwacht_frieden', 'Ich habe vor Kammwacht einen Frieden ausgehandelt statt einer Schlacht.'], 'beute': {'stufe': 2, 'text': 'Der Gesandte des Salzbundes schenkt dir:'},
   'welt_kanon': KANON('kammwacht_schlacht', 'Kammwacht: Frieden statt Schlacht – die Ostmark zahlt Zoll an Moosherz', 'kanon', KW,
     'Frieden vor Kammwacht', 'Vor Kammwacht gab es keine Schlacht: {held} aus {dorf} hat einen Frieden ausgehandelt. Kammwacht bleibt bei der Ostmark, doch Moosherzer Händler ziehen frei über den Pass, und die Ostmark zahlt zwanzig Jahre Zoll.',
     'Statt Krieg gibt es jetzt Wagen über den Pass, erzählt man. Der Salzbund reibt sich die Hände.', 3,
     fakten={'kammwacht': 'ostmark', 'frieden': True},
     bez=[{'a': 'moosherz', 'b': 'brandenstein', 'art': 'handel', 'grund': 'Frieden von Kammwacht: freier Pass und Zoll'}])})
s['ende_niederlage'] = E('wald', 'Das Heer zieht ab, geschlagen, die Toten auf Karren. Kammwacht hält. In Brandenstein feiert die Markgräfin. Auf dem Heimweg reden die Hügelländer nicht. Manche werden nie darüber reden, so wie ihre Väter.',
  {'chronik': ['kammwacht_niederlage', 'Wir haben vor Kammwacht verloren.'],
   'welt_kanon': KANON('kammwacht_schlacht', 'Die Schlacht um Kammwacht: Das Heer des Königs wird zurückgeschlagen', 'schlacht', KW,
     'Niederlage vor Kammwacht', 'Das Heer von König Ottokar ist vor Kammwacht gescheitert. Die Feste hält, die Ostmark feiert. Auch {held} aus {dorf} kämpfte auf den Leitern.',
     'Wieder hat Moosherz bei Kammwacht verloren, erzählt man. Der alte König soll getobt haben.', 3,
     fakten={'kammwacht': 'ostmark', 'niederlage': True},
     bez=[{'a': 'brandenstein', 'b': 'moosherz', 'art': 'furcht', 'grund': 'Moosherz fürchtet nach Kammwacht die Ostmark'}])})
Q.append(dict(id='w_kammwacht', titel='Die Schlacht um Kammwacht', fundort=None, kanon='kammwacht_schlacht', ziel='kammwacht', kurz='König Ottokar ruft den Heerbann: Die Feste Kammwacht, im Grenzkrieg verloren, soll zurück. Was dort geschieht, wird überall erzählt werden.', start='start', szenen=s, schwer=3))

for qd in Q: print(qd['id'], pruefe(qd['id'], qd['start'], qd['szenen']))
rows = [{'id': q['id'], 'titel': q['titel'], 'kurz': q['kurz'], 'schwer': q['schwer'], 'fundort': q.get('fundort'),
         'def': {k: v for k, v in {'start': q['start'], 'szenen': q['szenen'], 'kanon': q['kanon'], 'ziel': q.get('ziel')}.items() if v is not None}} for q in Q]
J = json.dumps(rows, ensure_ascii=False); assert '$q$' not in J
sql = f"""-- 039: Weltereignisse (einmalig, verändern die Welt für alle). Erzeugt von quests/g4.py
insert into public.quest_templates (id, titel, beschreibung, kurz, art, schwierigkeit, rollen, def, fundort)
select e->>'id', e->>'titel', e->>'kurz', e->>'kurz', 'welt', (e->>'schwer')::int, '{{}}'::jsonb, e->'def', e->>'fundort' from jsonb_array_elements($q${J}$q$::jsonb) e
on conflict (id) do update set titel = excluded.titel, beschreibung = excluded.beschreibung, kurz = excluded.kurz, art = excluded.art, schwierigkeit = excluded.schwierigkeit, def = excluded.def, fundort = excluded.fundort;
"""
out = pathlib.Path(__file__).resolve().parent.parent / 'migrations' / '039_weltereignisse.sql'
out.write_text(sql); print(out, len(sql))
