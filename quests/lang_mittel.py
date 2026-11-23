# Lange Brett-Quests, Schwierigkeit „Mittel“ (2): 15–20 Szenen, Reisen, Minispiele, Rätsel, mehrere Enden.
from qlib import O, B, P, S, R, MG, RZ, E

Q = []

# ─────────────────────────── Die versunkene Glocke ───────────────────────────
sz = {}
sz['auftrag'] = S('dorf', '{A} breitet eine verblichene Zeichnung aus: ein kleiner Glockenturm über einem Weiher. „Hollerbrück. Ein Weiler, eine Stunde flussaufwärts. Seit dem großen Hochwasser verlassen. Die Glocke soll im Weiher liegen – gegossen aus gutem Bronzeguss. Stell dir vor, sie hinge bei uns am Langhaus!“ {B} schüttelt den Kopf. „Man sagt, dort spukt es. Nachts läutet es unter Wasser.“',
    O('„Ich sehe mir das an.“', 'weg'),
    O('„Spukt es wirklich?“', 'weg', ergebnis='{B} senkt die Stimme. „Ein Hirte hat es gehört. Dumpf, wie aus einem Grab. Aber Hirten trinken auch.“', folgen={'flag': ['spuk']}))
sz['weg'] = R('fluss', 'Ihr folgt dem Fluss nach Norden. Schilf, Weiden, verfallene Zäune – Hollerbrück hat die Natur zurückgeholt.', 45, 'weiler', unterwegs='Ihr wandert am Fluss entlang.', begegnung=['b_otter', 'b_floss'], chance=0.6)
sz['b_otter'] = S('fluss', 'Am Ufer balgen sich zwei Otter um einen Fisch. Einer lässt ihn fallen und starrt dich an.',
    O('Den Fisch liegen lassen und weitergehen', 'weiler', ergebnis='Die Otter zanken weiter. Irgendwie fühlt sich der Tag freundlicher an.'),
    O('Den Fisch einstecken – Abendessen', 'weiler', ergebnis='Die Otter keckern empört. Der Fisch ist trotzdem gut.', folgen={'dorf': {'nahrung': 1}}))
sz['b_floss'] = S('fluss', 'Ein halb versunkenes Floß hängt im Schilf fest. Darauf eine Kiste, mit Schlamm verkrustet.',
    P('Hinüberbalancieren', 'flink', 11, B('Du springst von Bohle zu Bohle und ziehst die Kiste ans Ufer: Werkzeug, verrostet, aber brauchbar.', 'weiler', {'dorf': {'waren': 2}}),
      B('Das Floß kippt, du landest bis zur Hüfte im kalten Wasser. Die Kiste versinkt.', 'weiler')),
    O('Liegen lassen', 'weiler'))
sz['weiler'] = S('ruine', 'Hollerbrück: sieben Häuser ohne Dächer, ein Steg, der ins Nichts führt, und der Glockenturm – schief, aber er steht. Aus einem der Häuser steigt dünner Rauch.',
    O('Zum Glockenturm', 'turm'),
    O('Dem Rauch nachgehen', 'huette'),
    O('Den Weiher untersuchen', 'weiher'))
sz['huette'] = S('ruine', 'In der einzigen Hütte mit Dach sitzt eine alte Frau am Feuer und flickt ein Netz. Sie sieht nicht auf. „Wegen der Glocke, nicht wahr? Ihr kommt alle wegen der Glocke.“',
    O('„Wer seid Ihr?“', 'rike', ergebnis='„Rike. Ich bin geblieben, als alle gingen. Jemand muss die Toten grüßen.“', folgen={'flag': ['rike']}),
    O('Zurück zum Turm', 'turm'))
sz['rike'] = S('ruine', 'Rike legt das Netz beiseite. „Mein Mann hat die Glocke gegossen. Ruprecht. Beim Hochwasser ist der Turm gekippt, die Glocke fiel in den Weiher – und er ist ihr nachgesprungen. Er kam nicht wieder hoch.“ Sie schweigt. „Wenn der Wind über das Wasser geht, singt sie manchmal. Das ist der ganze Spuk.“',
    O('„Darf ich sie heben?“', 'rike_frage'),
    P('Prüfen, ob sie die Wahrheit sagt', 'menschenkenntnis', 11, B('Jedes Wort ist wahr. Und sie hat Angst – nicht vor Geistern, sondern davor, wieder allein zu sein.', 'rike_frage', {'flag': ['rike_einsam']}),
      B('Ihr Gesicht ist wie verwittertes Holz. Du kannst nichts darin lesen.', 'rike_frage')))
sz['rike_frage'] = S('ruine', '„Heben?“ Rike lacht leise. „Versuch es. Ruprecht hat ein Seil an die Krone gebunden, bevor er sprang. Es muss noch da unten sein. Aber der Turm ist verschlossen – sein Zeichen steht an der Tür. Wer es versteht, darf hinein.“',
    O('Zum Turm gehen', 'turm'))
sz['turm'] = RZ('ruine', 'Die Tür des Turms ist mit einem Riegel verschlossen, in den Kerben geschnitten sind. Darüber, in das Holz gebrannt, ein Spruch.',
    'Ich wache ohne Augen und spreche ohne Mund.\nWer mich ruft, dem antworte ich –\ndoch nur mit seinen eigenen Worten.\nNenne mich, und ich öffne mich.',
    ['Echo', 'Widerhall', 'das Echo'],
    B('Du sprichst das Wort laut aus – und aus dem Turm kommt es zurück: „…cho … cho“. Im Riegel klickt etwas. Ruprecht hatte Humor.', 'oben'),
    B('Du gibst auf und stemmst die Tür mit der Schulter auf. Morsches Holz splittert – laut. Sehr laut.', 'oben', {'flag': ['laut']}),
    hinweise=['Ruf etwas in einen leeren Turm. Was passiert?', 'Berge und Brunnen können es auch.'], versuche=3, falsch='Stille. Nur der Wind im Schilf.')
sz['oben'] = S('ruine', 'Im Turm führt eine Leiter nach oben. Von der Plattform aus siehst du den Weiher: grün, still – und knapp unter der Oberfläche den Umriss eines Seils, das an einem Pfahl hängt.',
    O('Zum Weiher hinunter', 'weiher'))
sz['weiher'] = MG('fluss', 'Der Weiher ist tiefer, als er aussieht. Irgendwo da unten liegt die Glocke. Mit einem Haken an einer Leine könntest du nach dem alten Seil angeln.',
    'angeln', 2, 'Nach dem Seil angeln',
    B('Der Haken greift! Du ziehst und ziehst, bis ein schleimiges, aber festes Seil aus dem Wasser kommt. Es spannt sich – irgendwo da unten hängt etwas Schweres daran.', 'seil', {'flag': ['seil_da']}),
    B('Dein Haken verfängt sich zweimal in Wurzeln. Am Ende hast du nur Schlamm und Algen.', 'weiher_nochmal'),
    O('Stattdessen hinuntertauchen', 'tauchen'),
    spieltext='Warte, bis die Leine zuckt – dann halte sie straff.')
sz['weiher_nochmal'] = S('fluss', 'Das Wasser ist kalt, die Sonne steht schon tief.',
    O('Hinuntertauchen', 'tauchen'),
    O('Rike um Hilfe bitten', 'rike_hilft', wenn={'flag': 'rike'}),
    O('Aufgeben und heimkehren', 'heim_leer'))
sz['rike_hilft'] = S('ruine', 'Rike kommt mit ihrem Netz zum Ufer. „Er liegt links vom Pfahl. Ich weiß es seit zwanzig Jahren.“ Mit einem Wurf fängt sie das Seilende. „Zieh.“',
    O('Ziehen', 'seil', folgen={'flag': ['seil_da', 'rike_half']}))
sz['tauchen'] = S('fluss', 'Du holst tief Luft und tauchst. Grünes Dämmerlicht, Kälte, die in die Knochen beißt.',
    P('Tiefer hinunter', 'anpacken', 13, B('Unten, im Schlamm, ertastest du kaltes Metall – und das Seil an der Krone. Du bindest deine Leine daran und schießt nach oben.', 'seil', {'flag': ['seil_da']}),
      B('Die Kälte drückt dir die Brust zusammen. Du kommst keuchend hoch, ohne etwas gefunden zu haben – und mit einem bösen Husten.', 'heim_leer', {'gefahr': 1})), gefahr=True)
sz['seil'] = MG('fluss', 'Das Seil spannt sich über einem alten Pfahl. Ziehen allein reicht nicht – du musst im richtigen Moment Zug geben, damit die Glocke sich aus dem Schlamm löst.',
    'axt', 2, 'Im Takt ziehen',
    B('Mit einem schmatzenden Geräusch löst sich die Glocke. Langsam, Zug um Zug, steigt sie aus dem Wasser – grün von Patina, aber unversehrt. Als der Wind darüberstreicht, summt sie leise.', 'gehoben'),
    B('Das Seil reißt an einer morschen Stelle. Die Glocke sinkt zurück. Nur ein Stück der Krone bleibt am Seil hängen.', 'heim_stueck'),
    spieltext='Zieh, wenn der Zeiger im hellen Feld ist.')
sz['gehoben'] = S('fluss', 'Die Glocke liegt im Gras. Rike steht daneben, die Hand auf dem kalten Metall. „Ruprechts Stimme“, sagt sie leise.',
    O('„Sie gehört nach Hause – in unser Dorf.“', 'ende_dorf'),
    O('„Sie soll hier bleiben. Bei Euch.“', 'ende_bleibt'),
    O('„Kommt mit uns, Rike. Mit der Glocke.“', 'rike_mit', wenn={'flag': 'rike'}))
sz['rike_mit'] = S('ruine', 'Rike sieht zu den leeren Häusern, zum Weiher, zum Turm. Lange.',
    P('„Hier grüßt Ihr nur noch die Toten. Bei uns gibt es Lebende, die Euch brauchen.“', 'ueberreden', 11,
      B('Sie lacht und weint gleichzeitig. „Ruprecht hätte gesagt: Alte Närrin, worauf wartest du?“ Sie packt ihr Netz.', 'ende_rike'),
      B('„Nein. Nimm die Glocke. Ich bleibe bei ihm.“', 'ende_dorf'), mod={'rike_einsam': -3, 'rike_half': -2}))
sz['heim_stueck'] = S('fluss', 'Du hältst ein Stück der Glockenkrone in der Hand. Immerhin.',
    O('Heimkehren', 'ende_stueck'))
sz['heim_leer'] = S('fluss', 'Die Glocke bleibt, wo sie ist. Auf dem Heimweg hörst du, wie der Wind über den Weiher streicht. Ein tiefer Ton. Vielleicht ein Abschied.',
    O('Heimkehren', 'ende_leer'))
sz['ende_dorf'] = E('dorf', 'Mit dem Karren von {A} bringt ihr die Glocke ins Dorf. Am Abend hängt sie am Langhaus. Beim ersten Schlag kommen alle aus den Häusern – und einige weinen, ohne zu wissen warum.',
    {'sym': {'A': 4, 'B': 2}, 'merkt': {'A': '{held} hat die Glocke aus dem Weiher von Hollerbrück gehoben.'}, 'chronik': ['m_glocke_dorf', 'Ich habe die versunkene Glocke von Hollerbrück gehoben. Sie hängt jetzt am Langhaus.'], 'dorf': {'stimmung': 5, 'waren': 2},
     'beute': {'stufe': 2, 'chance': 0.4, 'text': 'In der Glocke, eingeklemmt im Klöppel, steckt etwas, das Ruprecht dort versteckt haben muss.'}})
sz['ende_bleibt'] = E('ruine', 'Ihr richtet die Glocke am Ufer auf. Rike streicht darüber, und sie klingt – klar, weit über das Wasser. „Danke“, sagt Rike. Mehr nicht. Als du gehst, läutet es hinter dir.',
    {'sym': {'A': -1}, 'chronik': ['m_glocke_rike', 'Ich habe die Glocke von Hollerbrück gehoben – und sie bei Rike gelassen.'], 'journal': ['rike', 'Rike von Hollerbrück', 'Rike lebt allein im verlassenen Weiler Hollerbrück. Die Glocke ihres Mannes steht jetzt am Ufer.'],
     'beute': {'stufe': 2, 'chance': 0.7, 'text': 'Rike drückt dir etwas in die Hand, das Ruprecht gehört hat. „Er hätte gewollt, dass es jemand benutzt.“'}})
sz['ende_rike'] = E('dorf', 'Zwei Tage später rumpelt ein Karren ins Dorf: die Glocke, ein Bündel Netze – und Rike, die alle mit dem Satz begrüßt: „Ihr seid also die Lebenden.“ Die Glocke hängt jetzt am Langhaus, und Rike sitzt jeden Abend darunter.',
    {'sym': {'A': 4, 'B': 3}, 'chronik': ['m_glocke_beide', 'Rike von Hollerbrück ist mit der Glocke ihres Mannes in unser Dorf gekommen.'], 'dorf': {'stimmung': 7},
     'beute': {'stufe': 2, 'chance': 0.6, 'text': 'Rike schenkt dir zum Einzug etwas aus Ruprechts Werkstatt.'}})
sz['ende_stueck'] = E('dorf', 'Das Stück Bronze hängt jetzt über der Tür des Langhauses. Es klingt nicht – aber jeder, der vorbeigeht, berührt es kurz.',
    {'sym': {'A': 1}, 'dorf': {'stimmung': 1, 'waren': 1}})
sz['ende_leer'] = E('dorf', 'Du kommst mit leeren Händen zurück. {A} seufzt. „Vielleicht im Sommer, wenn das Wasser wärmer ist.“', {'sym': {'A': 0}})
Q.append(dict(id='m_glocke', titel='Die versunkene Glocke', schwierigkeit=2, kurz='{A} will die versunkene Glocke aus dem verlassenen Weiler Hollerbrück holen. {B} sagt, dort spukt es.',
    rollen={'A': 'Wer die Glocke will', 'B': 'Wer an den Spuk glaubt'}, start='auftrag', szenen=sz))

# ─────────────────────────── Das Herbstfest von Furtenau ───────────────────────────
sz = {}
sz['auftrag'] = S('dorf', '{A} wedelt mit einem Stück Rinde, auf das jemand Buchstaben gekratzt hat. „Furtenau lädt zum Herbstfest! Bogenschießen, Stammlauf, Würfeln – und wer die meisten Wettkämpfe gewinnt, bekommt das Ehrenband und einen Wagen Saatgut für sein Dorf.“ {B} grinst. „Letztes Jahr hat Bero aus Furtenau alles gewonnen. Er redet heute noch davon.“',
    O('„Dann wird es Zeit, dass Bero verliert.“', 'weg'),
    O('„Wer ist dieser Bero?“', 'weg', ergebnis='„Groß, laut, gut mit dem Bogen“, sagt {B}. „Und er schummelt beim Würfeln. Das weiß jeder, aber keiner kann es beweisen.“', folgen={'flag': ['bero_schummelt']}))
sz['weg'] = R('wald', 'Furtenau liegt anderthalb Stunden flussabwärts, dort, wo die Furt über den Fluss führt.', 90, 'ankunft', unterwegs='Ihr wandert nach Furtenau.', begegnung=['b_haendlerin'], chance=0.5)
sz['b_haendlerin'] = S('wald', 'Eine Händlerin mit einem Esel überholt dich. „Auch zum Fest? Ein Rat: Der Stamm beim Stammlauf ist auf der linken Seite glatter. Wer rechts läuft, fällt seltener.“',
    O('„Danke für den Rat.“', 'ankunft', folgen={'flag': ['tipp_stamm']}))
sz['ankunft'] = S('dorf', 'Furtenau ist voller Menschen. Bänder flattern an Stangen, es riecht nach gebratenen Äpfeln und Bier. Auf dem Platz steht Bero – breit wie eine Tür – und ruft: „Na? Wer will heute verlieren?“ Ein Schreiber mit Tafel verkündet: „Drei Wettkämpfe! Wer zwei gewinnt, bekommt das Ehrenband!“',
    O('Zum Bogenschießen', 'bogen'))
sz['bogen'] = MG('dorf', 'Am Rand der Wiese stehen Strohscheiben. Bero schießt zuerst – drei Pfeile, alle nah an der Mitte. Die Menge johlt. Dann bist du dran. Der Wind frischt auf.',
    'bogen', 2, 'Bogenschießen',
    B('Dein letzter Pfeil sitzt mitten im Schwarzen. Bero starrt die Scheibe an, als hätte sie ihn beleidigt. „Glück“, murmelt er.', 'stamm', {'flag': ['sieg_bogen']}),
    B('Knapp daneben. Bero klopft dir auf die Schulter, viel zu fest. „Nächstes Jahr, Kleines.“', 'stamm'),
    spieltext='Schieß, wenn die Scheibe dort ist, wo der Wind deinen Pfeil hintreibt.')
sz['stamm'] = MG('fluss', 'Über einen Seitenarm des Flusses liegt ein entrindeter Stamm. Wer hinüberkommt, ohne ins Wasser zu fallen, gewinnt – wer schneller ist, gewinnt mehr. Bero rennt los, schwankt, schafft es.',
    'steg', 2, 'Stammlauf',
    B('Du tänzelst über den Stamm wie über eine Straße. Drüben wartet ein Mädchen mit einer Blumenkrone, das dich ernst ansieht. „Du warst schneller als Bero.“', 'wuerfeln', {'flag': ['sieg_stamm']}),
    B('Auf halber Strecke kippt die Welt. Platsch. Unter Gelächter ziehst du dich ans Ufer.', 'wuerfeln'),
    O('Rechts laufen, wie die Händlerin geraten hat', 'stamm_tipp', wenn={'flag': 'tipp_stamm'}),
    spieltext='Halte das Gleichgewicht, bis du drüben bist.')
sz['stamm_tipp'] = MG('fluss', 'Du setzt den Fuß auf die rechte, rauere Seite des Stamms. Er gibt dir Halt.', 'steg', 1, 'Stammlauf (rechte Seite)',
    B('Leichtfüßig drüben. Die Händlerin am Ufer zwinkert dir zu.', 'wuerfeln', {'flag': ['sieg_stamm']}),
    B('Selbst auf der guten Seite rutschst du ab. Platsch.', 'wuerfeln'))
sz['wuerfeln'] = S('dorf', 'Im Festzelt wird geknobelt. Bero sitzt schon am Tisch, schüttelt einen Lederbecher und grinst. „Bis zwanzig. Wer eine Eins wirft, verliert seinen Topf.“',
    O('Gegen Bero würfeln', 'wuerfeln_spiel'),
    P('Erst seinen Becher beobachten', 'menschenkenntnis', 12, B('Bero hat zwei Würfel im Becher – einen normalen und einen, der nie eine Eins zeigt. Er tauscht sie geschickt.', 'betrug'),
      B('Du siehst nichts Verdächtiges. Vielleicht ist er einfach gut.', 'wuerfeln_spiel'), mod={'bero_schummelt': -2}))
sz['betrug'] = S('dorf', 'Bero merkt, dass du ihn ansiehst. Sein Grinsen wird schmaler.',
    O('Ihn vor allen bloßstellen', 'bloss'),
    O('Leise verlangen, dass er mit deinem Würfel spielt', 'wuerfeln_fair', ergebnis='Bero zögert, dann schiebt er den Becher rüber. „Wie du willst.“ Unter dem Tisch verschwindet ein Würfel in seiner Tasche.', folgen={'flag': ['bero_geschont']}))
sz['bloss'] = S('dorf', 'Du greifst in seinen Becher und hältst den falschen Würfel hoch. Stille im Zelt. Dann bricht der Lärm los. Bero wird rot wie ein Apfel – und dann blass.',
    O('Den Schreiber entscheiden lassen', 'urteil', folgen={'flag': ['sieg_wuerfel', 'bero_blamiert']}))
sz['urteil'] = S('dorf', 'Der Schreiber räuspert sich. „Wer betrügt, verliert den Wettkampf.“ Bero stürmt aus dem Zelt.',
    O('Zur Siegerehrung', 'ehrung'))
sz['wuerfeln_spiel'] = MG('dorf', 'Bero schüttelt den Becher, als wollte er ihn erwürgen.', 'wuerfel', 3, 'Bauernknobeln gegen Bero',
    B('Deine letzte Runde bringt dich genau auf zwanzig. Das Zelt tobt.', 'ehrung', {'flag': ['sieg_wuerfel']}),
    B('Bero erreicht die Zwanzig vor dir. Er küsst seinen Becher.', 'ehrung'))
sz['wuerfeln_fair'] = MG('dorf', 'Mit deinem Würfel ist Bero plötzlich nervös.', 'wuerfel', 2, 'Bauernknobeln (ehrlich)',
    B('Gewonnen – ehrlich und knapp.', 'ehrung', {'flag': ['sieg_wuerfel']}),
    B('Verloren – aber diesmal ehrlich.', 'ehrung'))
sz['ehrung'] = S('dorf', 'Der Schreiber klopft auf seine Tafel. „Zwei Siege braucht es für das Ehrenband. Im Bogenschießen siegte …“',
    O('Gespannt zuhören', 'z1', wenn={'flag': 'sieg_bogen'}),
    O('Gespannt zuhören', 'z0', wenn={'nicht_flag': 'sieg_bogen'}))
sz['z1'] = S('dorf', '„… das Dorf von {held}!“ Jubel bei deinen Leuten. „Und auf dem Stamm …“',
    O('Weiter zuhören', 'band', wenn={'flag': 'sieg_stamm'}),
    O('Weiter zuhören', 'zw', wenn={'nicht_flag': 'sieg_stamm'}))
sz['z0'] = S('dorf', '„… Bero aus Furtenau!“ Die Furtenauer johlen. „Und auf dem Stamm …“',
    O('Weiter zuhören', 'zw', wenn={'flag': 'sieg_stamm'}),
    O('Weiter zuhören', 'niederlage', wenn={'nicht_flag': 'sieg_stamm'}))
sz['zw'] = S('dorf', '„Es steht unentschieden! Das Würfeln entscheidet. Und im Würfeln …“',
    O('Den Atem anhalten', 'band', wenn={'flag': 'sieg_wuerfel'}),
    O('Den Atem anhalten', 'niederlage', wenn={'nicht_flag': 'sieg_wuerfel'}))
sz['band'] = S('dorf', '„Das Ehrenband geht an das Dorf von {held}!“ Jemand hängt dir ein rotes Band um. Die Leute aus Furtenau klatschen – manche ehrlich, manche zähneknirschend.',
    O('Bero suchen', 'bero_ende', wenn={'flag': 'bero_blamiert'}),
    O('Bero die Hand reichen', 'ende_sieg_freund', wenn={'nicht_flag': 'bero_blamiert'}),
    O('Den Wagen Saatgut nehmen und heimkehren', 'heim_sieg'))
sz['bero_ende'] = S('dorf', 'Bero sitzt hinter dem Zelt auf einem Fass. „Mein Vater hat mich verprügelt, wenn ich verloren habe“, sagt er, ohne aufzusehen. „Jedes Jahr. Bis er starb. Ich weiß nicht, wie man verliert.“',
    O('„Dann lern es. Es tut weniger weh, als du denkst.“', 'ende_sieg_freund', ergebnis='Bero lacht, rau und überrascht. „Du bist seltsam, weißt du das?“'),
    O('Ihn sitzen lassen', 'heim_sieg'))
sz['heim_sieg'] = R('wald', 'Mit einem Wagen voller Saatgut und dem roten Band um den Hals geht es heim.', 90, 'ende_sieg', unterwegs='Ihr fahrt den Wagen heim.')
sz['niederlage'] = S('dorf', '„Das Ehrenband geht … an Bero aus Furtenau!“ Bero reckt die Faust. Als er an dir vorbeigeht, sagt er leise: „War knapp. Nächstes Jahr wieder?“',
    O('„Nächstes Jahr.“', 'heim_nieder'))
sz['heim_nieder'] = R('wald', 'Ohne Band, aber mit vielen Geschichten geht es heim.', 90, 'ende_nieder', unterwegs='Ihr wandert heim.')
sz['ende_sieg'] = E('dorf', 'Im Dorf wird das rote Band am Langhaus aufgehängt. {A} erzählt die Geschichte jeden Abend – jedes Mal mit mehr Pfeilen im Schwarzen.',
    {'sym': {'A': 3, 'B': 3}, 'chronik': ['m_fest_sieg', 'Ich habe beim Herbstfest in Furtenau das Ehrenband für unser Dorf gewonnen.'], 'dorf': {'stimmung': 5, 'nahrung': 15},
     'beute': {'stufe': 2, 'chance': 0.5, 'text': 'Unter dem Saatgut liegt ein Preis, den der Schreiber vergessen hat zu erwähnen.'}})
sz['ende_sieg_freund'] = E('dorf', 'Bero begleitet dich bis an den Rand von Furtenau. „Wenn ihr mal Hilfe braucht – Furtenau hat starke Arme.“ Der Wagen Saatgut rumpelt hinter dir her.',
    {'sym': {'A': 3, 'B': 3}, 'chronik': ['m_fest_freund', 'Ich habe beim Herbstfest gewonnen – und Bero aus Furtenau zum Freund gemacht.'], 'journal': ['bero', 'Bero aus Furtenau', 'Bero, der laute Wettkämpfer aus Furtenau, hat mir Hilfe angeboten, wenn unser Dorf sie braucht.'],
     'dorf': {'stimmung': 5, 'nahrung': 15}, 'beute': {'stufe': 2, 'chance': 0.6, 'text': 'Zum Abschied schenkt dir Bero etwas aus seiner Truhe. „Damit du nächstes Jahr eine Chance hast.“'}})
sz['ende_nieder'] = E('dorf', 'Daheim fragt {B} sofort: „Und?“ Du zuckst die Schultern. „Nächstes Jahr.“ {B} lacht. „Das hat Bero letztes Jahr auch zu uns gesagt.“', {'sym': {'A': 1, 'B': 1}, 'dorf': {'stimmung': 1}})
Q.append(dict(id='m_fest', titel='Das Herbstfest von Furtenau', schwierigkeit=2, kurz='Furtenau lädt zum Herbstfest. {A} will, dass du für unser Dorf antrittst – gegen den ungeschlagenen Bero.',
    rollen={'A': 'Wer dich anmeldet', 'B': 'Wer Bero kennt'}, start='auftrag', szenen=sz))

# ─────────────────────────── Gift im Mühlbach ───────────────────────────
sz = {}
sz['auftrag'] = S('dorf', '{A} hält dir einen Eimer hin. Darin treiben drei tote Forellen, die Bäuche weiß nach oben. „Seit zwei Tagen. Der ganze Mühlbach stinkt. Und gestern hat die Ziege von {B} daraus getrunken und liegt seitdem.“',
    O('„Ich finde heraus, woher das kommt.“', 'bach'),
    O('Erst nach der Ziege sehen', 'ziege'))
sz['ziege'] = S('dorf', 'Die Ziege liegt im Stroh und zittert. {B} streichelt ihr den Kopf.',
    P('Sie untersuchen', 'heilkunde', 11, B('Ihr Maul riecht bitter, fast wie Eichenlohe. Kein Fieber – Gift. Mit viel Wasser aus dem Brunnen kommt sie vielleicht durch.', 'bach', {'flag': ['lohe'], 'sym': {'B': 2}}),
      B('Du weißt nicht, was ihr fehlt. {B} sieht dich hoffnungsvoll an. Du nickst nur.', 'bach')))
sz['bach'] = R('fluss', 'Ihr folgt dem Mühlbach bachaufwärts. Der Gestank wird stärker.', 30, 'stelle', unterwegs='Ihr folgt dem Bach.')
sz['stelle'] = S('fluss', 'An einer Biegung färbt sich das Wasser bräunlich. Am Ufer: Fußspuren, Karrenfurchen und ein Haufen faulender Rinde. Weiter oben klappert eine Mühle – nicht eure, eine fremde.',
    O('Die Spuren lesen', 'spuren'),
    O('Die Rinde untersuchen', 'rinde'),
    O('Zur fremden Mühle', 'muehle'))
sz['spuren'] = MG('fluss', 'Die Spuren sind ein Durcheinander: Menschen, Tiere, Karren. Welche gehören zusammen?', 'spuren', 2, 'Fährten ordnen',
    B('Jetzt siehst du es: Ein Karren kommt nachts von der fremden Mühle, kippt etwas ab und fährt zurück. Immer dieselbe Achse – sie schleift rechts.', 'stelle2', {'flag': ['karren']}),
    B('Zu viele Spuren. Du wirst daraus nicht schlau.', 'stelle2'))
sz['rinde'] = MG('fluss', 'Zwischen der Rinde wachsen Pflanzen, die sich verfärbt haben. Manche davon sind giftig – und vielleicht der Grund. Oder auch nicht.', 'kraeuter', 2, 'Pflanzen am Ufer prüfen',
    B('Die Pflanzen sind harmlos – es ist die Rinde selbst. Gerbrinde, Eichenlohe, in Mengen, die einen Bach umbringen.', 'stelle2', {'flag': ['lohe']}),
    B('Du rupfst die falschen Pflanzen aus und hast danach brennende Finger. Klüger bist du nicht.', 'stelle2'))
sz['stelle2'] = S('fluss', 'Die Sonne steht hoch. Die fremde Mühle klappert weiter oben.',
    O('Die Spuren lesen', 'spuren', wenn={'nicht_flag': 'karren'}),
    O('Die Rinde untersuchen', 'rinde', wenn={'nicht_flag': 'lohe'}),
    O('Zur fremden Mühle', 'muehle'))
sz['muehle'] = S('fluss', 'Die Mühle gehört nicht zu eurem Dorf – sie steht auf dem Land eines Mannes namens Gebhard. Hinter der Mühle: Gerbbottiche, Felle zum Trocknen, ein Karren mit schiefer Achse. Gebhard selbst, ein hagerer Mann mit gelben Fingern, kommt dir entgegen. „Was willst du?“',
    O('„Euer Abfall vergiftet unseren Bach.“', 'gebhard'),
    P('Heimlich den Karren ansehen', 'flink', 11, B('Die rechte Achse schleift. Auf der Ladefläche: Reste nasser Eichenlohe.', 'gebhard', {'flag': ['karren', 'beweis']}),
      B('Ein Hund bellt dich an. Gebhard sieht genau, wohin du geschaut hast.', 'gebhard'), wenn={'nicht_flag': 'beweis'}))
sz['gebhard'] = S('fluss', 'Gebhard verschränkt die Arme. „Ich gerbe, seit ich denken kann. Wohin mit der Lohe? In den Wald? Da verbrennt sie nicht. Und der Bach war schon immer schmutzig.“',
    O('Mit Beweisen konfrontieren', 'beweise', wenn={'flag': 'karren'}),
    P('„Eine Grube hinter der Mühle – und das Problem ist gelöst.“', 'ueberreden', 13,
      B('Gebhard brummt. „Eine Grube. Wer gräbt die?“', 'grube'), B('„Ich grabe keine Gruben für Leute, die mir Vorschriften machen.“', 'drohen'), mod={'lohe': -2}),
    O('Drohen, es seinem Herrn zu melden', 'drohen'))
sz['beweise'] = S('fluss', 'Du beschreibst die schiefe Achse, die Spuren, die Lohe am Ufer. Gebhard wird still. „Gut. Es war ich. Aber der Herr will mehr Leder, schneller – und jede Grube kostet mich einen Tag.“',
    O('„Dann graben wir sie gemeinsam. Heute.“', 'grube'),
    O('„Das ist nicht mein Problem.“', 'drohen'))
sz['grube'] = MG('fluss', 'Gebhard reicht dir einen Spaten. Der Boden ist steinig, Wurzeln überall.', 'axt', 2, 'Die Grube ausheben',
    B('Bis zum Abend ist die Grube tief genug. Gebhard schüttet die erste Ladung Lohe hinein – nicht in den Bach. „Du hast kräftigere Arme, als du aussiehst.“', 'versoehnt'),
    B('Die Wurzeln sind stärker als du. Gebhard nimmt dir den Spaten ab. „Ich mach’s morgen. Versprochen.“', 'halb'))
sz['versoehnt'] = S('fluss', 'Am Feuer vor der Mühle teilt Gebhard sein Brot mit dir. „Wenn euer Dorf mal Leder braucht – sagt Bescheid. Für einen guten Preis.“',
    O('Heimkehren', 'heim_gut'))
sz['halb'] = S('fluss', 'Ob Gebhard Wort hält, wird sich zeigen.', O('Heimkehren', 'heim_halb'))
sz['drohen'] = S('fluss', 'Gebhard spuckt aus. „Melde, was du willst. Der Herr wohnt drei Tage weit weg und hat noch nie einen Brief beantwortet.“',
    P('„Dann komme ich wieder. Mit dem ganzen Dorf.“', 'einschuechtern', 13, B('Gebhard sieht dich lange an. Dann winkt er ab. „Schon gut. Ich kipp es woanders hin.“', 'heim_halb'),
      B('„Mach das.“ Er dreht dir den Rücken zu.', 'heim_schlecht')))
sz['heim_gut'] = R('fluss', 'Der Bach plätschert schon klarer, als du heimgehst.', 30, 'ende_gut')
sz['heim_halb'] = R('fluss', 'Du gehst heim. Der Bach ist noch braun – aber vielleicht nicht mehr lange.', 30, 'ende_halb')
sz['heim_schlecht'] = R('fluss', 'Mit leeren Händen gehst du heim.', 30, 'ende_schlecht')
sz['ende_gut'] = E('dorf', 'Nach einer Woche schwimmen wieder Forellen im Mühlbach. Die Ziege von {B} steht auf wackligen Beinen im Stall und meckert beleidigt. Und einmal im Monat bringt ein Karren mit gerader Achse Leder aus Gebhards Mühle.',
    {'sym': {'A': 4, 'B': 4}, 'merkt': {'A': '{held} hat herausgefunden, wer unseren Bach vergiftet hat – und es friedlich gelöst.'}, 'chronik': ['m_bach_gut', 'Ich habe den Gerber Gebhard überzeugt, seine Lohe nicht mehr in den Mühlbach zu kippen.'],
     'journal': ['gebhard', 'Gebhard der Gerber', 'Gebhard gerbt an einer Mühle bachaufwärts. Er hat versprochen, unserem Dorf Leder zu einem guten Preis zu überlassen.'], 'dorf': {'nahrung': 6, 'waren': 4},
     'beute': {'stufe': 2, 'chance': 0.4, 'text': 'Gebhard schickt dir ein Geschenk aus seiner Werkstatt.'}})
sz['ende_halb'] = E('dorf', 'Der Bach klart langsam auf, aber nicht ganz. {A} fischt trotzdem wieder – und schimpft jeden Tag ein bisschen weniger.', {'sym': {'A': 2, 'B': 1}, 'dorf': {'nahrung': 2}})
sz['ende_schlecht'] = E('dorf', 'Der Bach bleibt braun. {A} stellt Eimer unter die Dachrinne, um Regenwasser zu sammeln. Irgendwann wird das ein Streit mit Furtenau oder mit dem Herrn – aber nicht heute.', {'sym': {'A': 0}, 'dorf': {'nahrung': -6, 'stimmung': -2}})
Q.append(dict(id='m_bach', titel='Gift im Mühlbach', schwierigkeit=2, kurz='Im Mühlbach treiben tote Fische, und die Ziege von {B} ist krank. {A} will wissen, wer dahintersteckt.',
    rollen={'A': 'Wer am Bach fischt', 'B': 'Wem die Ziege gehört'}, start='auftrag', szenen=sz))
