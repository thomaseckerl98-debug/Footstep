# Lange Brett-Quests, Schwierigkeit „Schwer“ (3): mehrtägige Reisen in Echtzeit, Rätsel, Minispiele, Gefahr, mehrere Enden.
from qlib import O, B, P, S, R, MG, RZ, E, K

Q = []

# ─────────────────────────── Die Burg im Norden ───────────────────────────
sz = {}
sz['auftrag'] = S('dorf', '{A} zieht dich in eine Ecke und rollt ein Stück Leder aus: eine Karte, alt, an den Rändern zerfressen. Das Tal, der Fluss – und im Norden, hinter dem Moor, eine Burg mit drei Türmen. „Mein Großvater hat sie aus einer Truhe. Er sagte, dort liegt das Herz des Tals. Ich kann das Dorf nicht so lange allein lassen. Du schon.“',
    O('„Was heißt: das Herz des Tals?“', 'herz'),
    O('„Ich gehe.“', 'packen'))
sz['herz'] = S('dorf', '{A} zuckt die Schultern. „Früher hieß das Tal Moosherz. Die Burgherren haben es so genannt – weil das Moos hier selbst im Winter grün bleibt. Irgendwann waren sie weg, und mit ihnen die Geschichten. Vielleicht findest du sie wieder.“',
    O('„Ich gehe.“', 'packen'))
sz['packen'] = S('dorf', 'Die Reise wird Tage dauern: erst durch den Kiefernwald bis zum Moor, dort eine Nacht, dann über das Moor bis zu den Ruinen. {B} bietet an, dir Proviant mitzugeben.',
    O('Proviant nehmen und aufbrechen', 'reise1', folgen={'flag': ['proviant'], 'dorf': {'nahrung': -5}}),
    O('Mit leichtem Gepäck aufbrechen', 'reise1'))
sz['reise1'] = R('wald', 'Du brichst bei Sonnenaufgang auf. Der Weg führt nach Norden, durch Kiefernwald, der immer dunkler wird.', 360, 'moorrand',
    unterwegs='Du wanderst nach Norden durch den Kiefernwald.', begegnung=['b_koehler', 'b_falle'], chance=0.7)
sz['b_koehler'] = S('wald', 'Rauch zwischen den Bäumen: ein Köhlermeiler. Ein rußschwarzer Mann winkt dich heran. „Zur Burg? Dann merk dir: Auf dem Moor nur dort gehen, wo das Wollgras wächst. Wo es grün und glatt ist, ist es tief.“',
    O('„Danke.“ Ihm etwas Proviant dalassen', 'moorrand', wenn={'flag': 'proviant'}, ergebnis='Der Köhler beißt in dein Brot und grinst. „Und an der Burg: Die Hunde sind tot, aber die Fallen nicht.“', folgen={'flag': ['moor_tipp', 'fallen_tipp']}),
    O('„Danke.“ Weitergehen', 'moorrand', folgen={'flag': ['moor_tipp']}))
sz['b_falle'] = S('wald', 'Ein Knacken unter deinem Fuß – ein Schlingendraht, gespannt zwischen zwei Bäumen. Jemand jagt hier.',
    P('Zurückspringen', 'flink', 12, B('Gerade noch. Der Draht schnalzt ins Leere.', 'moorrand'), B('Der Draht reißt dir das Bein weg. Du humpelst weiter.', 'moorrand', {'gefahr': 1})))
sz['moorrand'] = S('feuer', 'Am Rand des Moors schlägst du dein Lager auf. Nebel kriecht über das Wasser, irgendwo ruft eine Rohrdommel. Weit draußen, als dunkler Strich am Horizont, die Burg.',
    O('Feuer machen und ausruhen', 'nacht'),
    P('Nach Spuren anderer Reisender suchen', 'spuren', 12, B('Frische Spuren, drei Paar Stiefel, ein Hund. Jemand ist vor dir zur Burg unterwegs.', 'nacht', {'flag': ['rivalen']}),
      B('Nur Nebel und Matsch.', 'nacht')))
sz['nacht'] = S('feuer', 'Mitten in der Nacht weckt dich ein Geräusch: Schritte, ganz nah. Eine Gestalt steht am Rand des Feuerscheins – ein Junge, mager, mit großen Augen. „Bitte“, flüstert er. „Habt Ihr etwas zu essen?“',
    O('Ihm von deinem Proviant geben', 'junge', wenn={'flag': 'proviant'}, folgen={'flag': ['junge_freund']}),
    P('Fragen, was er hier draußen tut', 'menschenkenntnis', 12, B('Er ist kein Dieb. Er ist geflohen – von den Männern, mit denen er zur Burg wollte. „Sie haben mich geschlagen, weil ich zu langsam war.“', 'junge', {'flag': ['junge_freund', 'rivalen']}),
      B('Er druckst herum. Als du kurz wegsiehst, ist er verschwunden – und mit ihm dein Wasserschlauch.', 'reise2')),
    O('Ihn verscheuchen', 'reise2'))
sz['junge'] = S('feuer', 'Der Junge heißt Tammo. Er isst, als hätte er seit Tagen nichts gehabt. „Drei Männer“, sagt er schließlich. „Grabräuber. Ihr Anführer heißt Wendel. Sie suchen das Grab der Burgherrin. Sie sagen, darin liegt Silber.“',
    O('„Komm mit mir. Allein überlebst du das Moor nicht.“', 'reise2', folgen={'flag': ['tammo_dabei']}),
    O('„Geh zurück nach Süden. Im Dorf hilft man dir.“', 'reise2', ergebnis='Tammo nickt und verschwindet im Nebel nach Süden. Du hoffst, er findet den Weg.', folgen={'flag': ['tammo_sued']}))
sz['reise2'] = R('berg', 'Im Morgengrauen betrittst du das Moor. Schritt für Schritt, Bult für Bult.', 480, 'moormitte',
    unterwegs='Du durchquerst das Moor.')
sz['moormitte'] = S('fluss', 'Mitten im Moor endet der Pfad an einer breiten, schwarzen Wasserfläche. Ein umgestürzter Baum liegt darüber – glitschig, schmal.',
    O('Über den Baum balancieren', 'balance'),
    O('Den Rat des Köhlers befolgen und dem Wollgras folgen', 'wollgras', wenn={'flag': 'moor_tipp'}),
    O('Tammo kennt einen Umweg', 'tammo_weg', wenn={'flag': 'tammo_dabei'}))
sz['balance'] = MG('fluss', 'Der Stamm schwankt unter deinen Füßen.', 'steg', 3, 'Über den Baumstamm',
    B('Mit ausgebreiteten Armen schaffst du es hinüber.', 'burgtor'),
    B('Du rutschst ab und versinkst bis zur Brust im kalten Moor. Mühsam ziehst du dich heraus – nass, zitternd, aber lebendig.', 'burgtor', {'gefahr': 1}),
    gefahr=True)
sz['wollgras'] = S('fluss', 'Weiße Wollgrasbüschel wiegen sich im Wind wie eine Spur. Du folgst ihnen – und der Boden trägt.', O('Weiter zur Burg', 'burgtor'))
sz['tammo_weg'] = S('fluss', 'Tammo führt dich über einen alten Bohlenweg, halb im Moor versunken. „Den haben die Grabräuber nicht gefunden.“', O('Weiter zur Burg', 'burgtor', folgen={'flag': ['vorsprung']}))
sz['burgtor'] = S('ruine', 'Die Burg ist größer, als die Karte vermuten ließ: drei Türme, einer eingestürzt, Mauern voller Efeu. Das Haupttor ist verschüttet. Daneben eine kleine Pforte mit einem eisernen Gitter, verschlossen mit einem alten Schloss.',
    O('Das Schloss knacken', 'schloss'),
    P('Über die eingestürzte Mauer klettern', 'flink', 13, B('Stein für Stein kletterst du hinauf und lässt dich in den Hof gleiten.', 'hof'),
      B('Ein Stein bricht aus der Mauer. Du stürzt, schlägst hart auf – und landest trotzdem im Hof.', 'hof', {'gefahr': 1})))
sz['schloss'] = MG('ruine', 'Das Schloss ist rostig, aber kunstvoll gearbeitet. Mit einem Draht und Geduld …', 'schloss', 3, 'Das Burgschloss knacken',
    B('Klack. Das Gitter schwingt quietschend auf.', 'hof'),
    B('Dein Draht bricht ab. Du musst doch über die Mauer.', 'burgtor_mauer'),
    spieltext='Ein Stift nach dem anderen.')
sz['burgtor_mauer'] = S('ruine', 'Es bleibt nur die Mauer.',
    P('Klettern', 'flink', 12, B('Du schaffst es in den Hof.', 'hof'), B('Du stürzt, schlägst auf, aber bist drinnen.', 'hof', {'gefahr': 1})))
sz['hof'] = S('ruine', 'Im Burghof wachsen junge Birken zwischen den Pflastersteinen. Drei Türen: zum Bergfried, zur Kapelle, zum Wohnturm. In der Ecke liegt eine frische Feuerstelle – noch warm.',
    O('Zum Wohnturm', 'wohnturm'),
    O('Zur Kapelle', 'kapelle'),
    O('Zum Bergfried', 'bergfried'))
sz['wohnturm'] = S('ruine', 'Im Wohnturm: verrottete Möbel, eine eingestürzte Treppe – und an der Wand drei verblasste Gemälde. Ein Reh am Waldrand. Ein Wolf im Schnee. Ein Rabe auf einem Turm. Darunter, in Stein gemeißelt: „In dieser Reihe kam das Glück, in dieser Reihe ging es.“',
    O('Die Bilder genau ansehen', 'bilder'),
    P('Nach einem Tagebuch oder Schriften suchen', 'altes_wissen', 12, B('In einer Nische findest du ein in Wachstuch gewickeltes Buch: die Chronik der Burgherrin Adelheid. Die letzte Seite: „Wer zu meinem Grab will, nenne die Namen der Kinder, die ich verlor.“ Darunter drei Namen: Ilse, Bertolt, Wigand.', 'hof2', {'flag': ['namen']}),
      B('Nur Staub und Mäusedreck.', 'hof2')))
sz['bilder'] = S('ruine', 'Reh, Wolf, Rabe. Reh, Wolf, Rabe. Du prägst dir die Reihenfolge ein.', O('Zurück in den Hof', 'hof2', folgen={'flag': ['bilder']}))
sz['hof2'] = S('ruine', 'Zurück im Hof. Der Wind pfeift durch die leeren Fenster.',
    O('Zum Wohnturm', 'wohnturm', wenn={'nicht_flag': 'namen'}),
    O('Zur Kapelle', 'kapelle'),
    O('Zum Bergfried', 'bergfried'))
sz['bergfried'] = S('ruine', 'Der Bergfried ist innen hohl. Eine Leiter führt nach oben – zur Hälfte verrottet. Von oben fällt Licht.',
    P('Hinaufsteigen', 'flink', 13, B('Oben, auf der Plattform, liegt ein Bündel in einer Mauernische: ein Wappenrock mit einem Moosblatt darauf, und darin eingewickelt ein Schlüssel aus Bronze.', 'hof3', {'flag': ['schluessel']}),
      B('Eine Sprosse bricht. Du rutschst ab und fängst dich gerade noch – ohne oben gewesen zu sein.', 'hof3', {'gefahr': 1})),
    O('Lieber nicht', 'hof3'))
sz['hof3'] = S('ruine', 'Der Hof. Die warme Feuerstelle macht dich unruhig.',
    O('Zur Kapelle', 'kapelle'),
    O('Zum Wohnturm', 'wohnturm', wenn={'nicht_flag': 'namen'}))
sz['kapelle'] = S('ruine', 'In der Kapelle ist der Boden aufgebrochen. Eine Treppe führt hinunter in die Gruft – und dort unten flackert Licht. Stimmen. „… sag ich doch, die Tür geht nicht auf! Wendel, das ist verflucht!“',
    O('Leise hinunterschleichen', 'gruft_schleich'),
    O('Sich zeigen und mit ihnen reden', 'wendel'),
    O('Warten, bis sie aufgeben', 'warten', wenn={'flag': 'vorsprung'}))
sz['warten'] = S('ruine', 'Du wartest hinter einer Säule. Nach einer Stunde kommen drei Männer fluchend die Treppe herauf und verschwinden im Hof. „Morgen mit Hämmern!“',
    O('Hinunter in die Gruft', 'grufttuer'))
sz['gruft_schleich'] = S('ruine', 'Die Treppe ist dunkel, die Männer sind abgelenkt.',
    P('Sich an den Männern vorbeischleichen', 'flink', 14, B('Im Schatten der Säulen gleitest du an ihnen vorbei bis zur Gruftür.', 'grufttuer', {'flag': ['unbemerkt']}),
      B('Ein Stein knirscht unter deinem Fuß. Drei Köpfe drehen sich um.', 'wendel')))
sz['wendel'] = S('ruine', 'Wendel ist ein schmaler Mann mit einer Narbe über dem Auge. Seine beiden Begleiter heben Spitzhacken. „Noch ein Schatzsucher. Schlechtes Timing, Freund.“',
    P('„Die Tür öffnet sich nur mit Wissen. Ohne mich kommt ihr nicht hinein.“', 'ueberreden', 13, B('Wendel kneift die Augen zusammen. „Gut. Mach auf. Dann teilen wir.“', 'grufttuer', {'flag': ['wendel_dabei']}),
      B('„Dann prügeln wir das Wissen eben aus dir heraus.“', 'kampf')),
    P('„Ihr habt Tammo halb verhungern lassen. Verschwindet.“', 'einschuechtern', 14, B('Die beiden Handlanger sehen sich an. Einer lässt die Hacke sinken. „Ich hab den Jungen nicht geschlagen“, murmelt er. Sie ziehen ab. Wendel spuckt aus und folgt ihnen.', 'grufttuer'),
      B('Wendel lacht. „Der Junge war ein Nichtsnutz.“', 'kampf'), wenn={'flag': 'junge_freund'}),
    O('Kämpfen', 'kampf'))
sz['kampf'] = K('hoehle', 'In der engen Gruft ist kein Platz für Heldentum. Wendel brüllt, seine Männer stürmen los – und aus den Seitengängen kommen noch mehr: Wendel hat Verstärkung mitgebracht.',
    'Kampf in der Gruft', 'banditen', 720,
    B('Als der letzte Grabräuber die Treppe hinaufflieht, wird es still. Wendel ist mit ihnen verschwunden. Nur sein Hut liegt noch im Staub.', 'grufttuer'),
    B('Ein Hieb trifft dich an der Seite, du gehst zu Boden – aber die Männer fliehen, als von oben Steine herunterpoltern. Tammo? Oder nur die alte Burg?', 'grufttuer', {'gefahr': 2}),
    spieltext='Wendel und seine Grabräuber – überstehe den Ansturm.', kampfort='hoehle')
sz['grufttuer'] = S('hoehle', 'Vor dir: eine schwere Tür aus Bronze. In ihrer Mitte drei Drehscheiben mit Tierbildern – Reh, Wolf, Rabe, Bär, Fuchs, Eule. Darunter steht: „In dieser Reihe kam das Glück.“',
    O('Die Scheiben drehen', 'code'),
    O('Den Bronzeschlüssel in das Schlüsselloch unten stecken', 'tuer_schluessel', wenn={'flag': 'schluessel'}))
sz['tuer_schluessel'] = S('hoehle', 'Der Schlüssel passt – aber er dreht sich erst, als die Scheiben richtig stehen.', O('Die Scheiben drehen', 'code'))
sz['code'] = RZ('hoehle', 'Drei Scheiben, sechs Tiere. Die Reihenfolge des Glücks …',
    'Welche drei Tiere, in welcher Reihenfolge? (zum Beispiel: Bär, Fuchs, Eule)',
    ['Reh Wolf Rabe', 'Reh, Wolf, Rabe', 'Reh-Wolf-Rabe'],
    B('Die Scheiben rasten ein: Reh. Wolf. Rabe. Ein tiefes Grollen – und die Bronzetür schwingt auf. Kalte, uralte Luft strömt dir entgegen.', 'gruft'),
    B('Nach dem dritten Versuch rastet etwas falsch ein. Ein Mechanismus knackt, und aus der Decke rieselt Staub. Die Tür bleibt zu. Du hörst Wendels Leute oben zurückkommen.', 'flucht'),
    hinweise=['Die Bilder im Wohnturm erzählen eine Geschichte.', 'Ein Tier am Waldrand, eines im Schnee, eines auf einem Turm.'], versuche=3, falsch='Die Scheiben rasten nicht ein.')
sz['flucht'] = S('ruine', 'Es ist Zeit zu gehen. Mit leeren Händen.', O('Den Heimweg antreten', 'heim_leer'))
sz['gruft'] = S('hoehle', 'Die Gruft der Burgherrin: ein steinerner Sarg, darauf eine Frau aus Stein mit einem Moosblatt in den Händen. Rundherum drei kleinere Särge. Und an der Wand eine zweite Inschrift, über einer Nische mit einem verschlossenen Kästchen.',
    O('Die Inschrift lesen', 'namen'))
sz['namen'] = RZ('hoehle', 'Die Inschrift ist kaum lesbar.',
    'Wer mein Erbe will, nenne die Kinder, die ich verlor – das Erstgeborene zuerst.',
    ['Ilse Bertolt Wigand', 'Ilse, Bertolt, Wigand', 'Ilse, Bertolt und Wigand'],
    B('Als du die Namen aussprichst, springt das Kästchen in der Nische auf. Kein Silber. Ein Siegelring mit dem Moosblatt, eine Urkunde – und ein kleines Säckchen mit Saatkörnern, die nach zweihundert Jahren noch glänzen.', 'erbe'),
    B('Das Kästchen bleibt zu. Du könntest es aufbrechen – aber etwas in dir sträubt sich.', 'kaestchen'),
    hinweise=['Die Chronik der Burgherrin nennt die Namen.', 'Auch die kleinen Särge tragen Namen – wenn man den Staub abwischt.'], versuche=3, falsch='Nichts geschieht.')
sz['kaestchen'] = S('hoehle', 'Das Kästchen ist alt und klein.',
    O('Behutsam das Schloss öffnen', 'kaestchen_schloss'),
    O('Die kleinen Särge abstauben', 'saerge'),
    O('Es lassen', 'heim_leer'))
sz['saerge'] = S('hoehle', 'Unter dem Staub: drei Namen. Ilse. Bertolt. Wigand. Und Jahreszahlen, die zeigen, wer zuerst geboren wurde.', O('Die Namen nennen', 'erbe', ergebnis='Als du die Namen aussprichst, springt das Kästchen auf.'))
sz['kaestchen_schloss'] = MG('hoehle', 'Ein winziges Schloss, fein gearbeitet.', 'schloss', 2, 'Das Kästchen öffnen',
    B('Das Kästchen springt auf.', 'erbe'), B('Das Schloss verklemmt sich endgültig. Das Kästchen bleibt verschlossen.', 'heim_leer'))
sz['erbe'] = S('hoehle', 'Die Urkunde ist auf Pergament geschrieben: „Dieses Tal, Moosherz genannt, gehört denen, die es bestellen.“ Unterzeichnet von Adelheid, Herrin von Moosherz. Wer dieses Papier hat, hat ein Wort mitzureden, wenn je ein Herr Anspruch auf das Tal erhebt.',
    O('Alles einpacken und heimkehren', 'heim'),
    O('Die Saatkörner hierlassen – sie gehören zu ihr', 'heim', folgen={'flag': ['saat_gelassen']}),
    O('Wendel einen Anteil geben, wie versprochen', 'wendel_teil', wenn={'flag': 'wendel_dabei'}))
sz['wendel_teil'] = S('hoehle', 'Wendel starrt auf den Ring, die Urkunde, die Körner. „Das ist alles? Kein Silber?“ Er lacht bitter, nimmt den Ring und geht. „Behalt dein Papier.“',
    O('Heimkehren', 'heim', folgen={'flag': ['ring_weg']}))
sz['heim'] = R('berg', 'Der Rückweg ist lang: zurück über das Moor, durch den Kiefernwald, nach Hause.', 600, 'ankunft',
    unterwegs='Du bist auf dem langen Heimweg.', begegnung=['b_heim_tammo'], chance=0.6)
sz['b_heim_tammo'] = S('wald', 'Am Moorrand wartet jemand: Tammo, der Junge. „Ich hab gewusst, dass du zurückkommst.“',
    O('„Komm mit ins Dorf.“', 'ankunft', folgen={'flag': ['tammo_mit']}))
sz['heim_leer'] = R('berg', 'Mit leeren Händen machst du dich auf den langen Weg nach Hause.', 600, 'ende_leer', unterwegs='Du bist auf dem langen Heimweg.')
sz['ankunft'] = S('dorf', 'Nach Tagen siehst du die Rauchsäulen des Dorfes. {A} kommt dir entgegengelaufen.',
    O('{A} die Urkunde zeigen', 'ende_urkunde'),
    O('Tammo vorstellen', 'ende_tammo', wenn={'flag': 'tammo_mit'}))
sz['ende_urkunde'] = E('dorf', '{A} liest die Urkunde dreimal, setzt sich auf einen Stein und lacht, bis die Tränen kommen. „Moosherz. Das Herz des Tals.“ Die Urkunde hängt jetzt im Langhaus, und die alten Saatkörner werden im Frühjahr gesät.',
    {'sym': {'A': 6, 'B': 3}, 'merkt': {'A': '{held} hat die Burg im Norden gefunden und die Urkunde von Moosherz heimgebracht.'},
     'chronik': ['s_burg', 'Ich habe die Burg der Herrin Adelheid gefunden. Die Urkunde von Moosherz liegt jetzt im Langhaus.'],
     'journal': ['moosherz', 'Die Urkunde von Moosherz', 'In der Gruft der Burg im Norden lag die Urkunde der Herrin Adelheid: Das Tal gehört denen, die es bestellen. Sie liegt jetzt im Langhaus.'],
     'dorf': {'stimmung': 8, 'nahrung': 10}, 'beute': {'stufe': 3, 'chance': 0.85, 'text': 'In der Gruft hast du noch etwas gefunden, das Adelheid gehört hat.'}})
sz['ende_tammo'] = E('dorf', 'Tammo steht schüchtern hinter dir, bis {B} ihm eine Schüssel Eintopf in die Hand drückt. Die Urkunde hängt bald im Langhaus – und Tammo schläft im Heu und folgt dir überallhin wie ein junger Hund.',
    {'sym': {'A': 6, 'B': 4}, 'chronik': ['s_burg_tammo', 'Ich habe die Burg im Norden gefunden, die Urkunde von Moosherz heimgebracht – und den Jungen Tammo gerettet.'],
     'journal': ['moosherz', 'Die Urkunde von Moosherz', 'In der Gruft der Burg im Norden lag die Urkunde der Herrin Adelheid: Das Tal gehört denen, die es bestellen. Sie liegt jetzt im Langhaus.'],
     'dorf': {'stimmung': 10, 'nahrung': 10}, 'beute': {'stufe': 3, 'chance': 0.85, 'text': 'In der Gruft hast du noch etwas gefunden, das Adelheid gehört hat.'}})
sz['ende_leer'] = E('dorf', 'Du kommst heim, müde und mit leeren Händen. {A} nickt nur. „Die Burg ist geduldig. Sie wartet seit zweihundert Jahren – sie wartet auch noch ein bisschen länger.“',
    {'sym': {'A': 2}, 'chronik': ['s_burg_leer', 'Ich war an der Burg im Norden, kam aber nicht in die Gruft.']})
Q.append(dict(id='s_burg', titel='Die Burg im Norden', schwierigkeit=3, kurz='{A} besitzt eine alte Karte: Hinter dem Moor im Norden steht eine Burg, in der „das Herz des Tals“ liegen soll. Eine Reise über mehrere Tage.',
    rollen={'A': 'Wer die Karte hat', 'B': 'Wer Proviant gibt'}, start='auftrag', szenen=sz))

# ─────────────────────────── Die Männer mit den Armbrüsten ───────────────────────────
sz = {}
sz['auftrag'] = S('dorf', '{A} wirft einen Armbrustbolzen auf den Tisch. Eisen, schwarz, mit einem eingeschlagenen Zeichen: ein Turm mit einer Krone. „Steckte in meinem besten Hirsch – oder was davon übrig war. Die haben ihm nur das Fell genommen und den Rest liegen lassen. Seit Wochen geht das so. Und gestern brannte es am Ostkamm.“ {B} ist blass. „Wer jagt so? Wer brennt Wald ab?“',
    O('„Ich finde es heraus.“', 'vorbereitung'),
    P('Das Zeichen auf dem Bolzen deuten', 'altes_wissen', 13, B('Turm mit Krone – das Wappen der Herren von Rabenfels, jenseits des Ostkamms. Ihnen gehört das Land bis zum Fluss. Behaupten sie jedenfalls.', 'vorbereitung', {'flag': ['rabenfels']}),
      B('Das Zeichen sagt dir nichts.', 'vorbereitung')))
sz['vorbereitung'] = S('dorf', 'Der Ostkamm ist einen halben Tag entfernt. Was immer dort oben ist – du solltest nicht ohne Plan losgehen.',
    O('Einen Begleiter mitnehmen und aufbrechen', 'reise1', wenn={'begleiter': True}),
    O('Allein aufbrechen', 'reise1'))
sz['reise1'] = R('wald', 'Du steigst durch den Wald zum Ostkamm hinauf. Je höher du kommst, desto stärker riecht es nach kaltem Rauch.', 240, 'brand',
    unterwegs='Du steigst zum Ostkamm hinauf.', begegnung=['b_reh', 'b_fluechtlinge'], chance=0.6)
sz['b_reh'] = S('wald', 'Ein Reh kreuzt deinen Weg – mit einem Bolzen im Schenkel. Es humpelt, zittert, flieht nicht.',
    P('Den Bolzen entfernen', 'heilkunde', 13, B('Du ziehst den Bolzen heraus und drückst Moos auf die Wunde. Das Reh springt davon. Der Bolzen trägt dasselbe Zeichen.', 'brand', {'flag': ['bolzen2']}),
      B('Das Reh reißt sich los. Der Bolzen bleibt stecken.', 'brand')),
    O('Es erlösen', 'brand', ergebnis='Schnell und sauber. Wenigstens leidet es nicht mehr.', folgen={'dorf': {'nahrung': 3}}))
sz['b_fluechtlinge'] = S('wald', 'Eine Köhlerfamilie kommt dir entgegen, mit allem, was sie tragen kann. „Kehrt um“, sagt die Frau. „Die Leute von Rabenfels haben unseren Meiler genommen. Sie sagen, der Wald gehört jetzt ihnen.“',
    O('„Geht in mein Dorf. Man wird euch helfen.“', 'brand', folgen={'flag': ['koehler_geschickt', 'rabenfels']}),
    O('„Wie viele sind es?“', 'brand', ergebnis='„Zehn, zwölf. Armbrüste. Ein Vogt mit einem roten Mantel befiehlt.“', folgen={'flag': ['vogt', 'rabenfels']}))
sz['brand'] = S('wald', 'Oben am Kamm: eine Brandschneise, so breit wie ein Dorf. Verkohlte Stümpfe. Und dahinter, auf einer Lichtung, ein Lager – Zelte, Holzstapel, ein großer Meiler, der qualmt. Männer in grauen Wämsern mit Armbrüsten auf dem Rücken.',
    O('Das Lager aus der Deckung beobachten', 'beobachten'),
    O('Offen ins Lager gehen', 'offen'),
    O('Nach Spuren rund ums Lager suchen', 'spuren'))
sz['spuren'] = MG('wald', 'Rund um das Lager kreuzen sich Fährten: Wild, Männer, Pferde. Wer geht wohin?', 'spuren', 3, 'Fährten lesen',
    B('Ein Muster: Jeden Abend ziehen vier Männer nach Westen – Richtung Dorf. Und morgens kommen sie mit Fellen zurück. Außerdem führt ein Pfad zu einem einzelnen Zelt etwas abseits. Dort wohnt wohl jemand Wichtiges.', 'beobachten2', {'flag': ['muster']}),
    B('Zu viele Fährten. Du verlierst den Überblick und wärst beinahe einem Wachposten in die Arme gelaufen.', 'beobachten2'))
sz['beobachten'] = S('wald', 'Stundenlang liegst du im Farn. Du zählst zwölf Männer. Einer trägt einen roten Mantel und brüllt Befehle. Etwas abseits steht ein einzelnes Zelt mit einer Kiste davor.',
    O('Weiter', 'beobachten2', folgen={'flag': ['vogt']}))
sz['beobachten2'] = S('wald', 'Die Sonne sinkt. Im Lager werden Feuer entzündet.',
    O('Nachts zum Zelt des Vogts schleichen', 'schleichen'),
    O('Morgen offen ins Lager gehen', 'offen'),
    O('Heimkehren und das Dorf warnen', 'heim_warnen'))
sz['schleichen'] = S('wald', 'Die Nacht ist mondlos. Die Wachen sitzen am Feuer.',
    P('Zum Zelt schleichen', 'flink', 14, B('Du erreichst das Zelt ungesehen.', 'zelt'), B('Ein Zweig knackt. Eine Wache ruft: „Wer da?“', 'erwischt'), mod={'muster': -2}))
sz['zelt'] = S('wald', 'Im Zelt ist niemand. Ein Feldbett, eine Laterne, und eine eisenbeschlagene Kiste mit einem Vorhängeschloss.',
    O('Die Kiste öffnen', 'kiste'))
sz['kiste'] = MG('wald', 'Das Schloss ist neu und gut. Draußen lacht jemand am Feuer.', 'schloss', 3, 'Die Kiste des Vogts öffnen',
    B('Das Schloss springt auf. In der Kiste: Silbermünzen, ein Siegel – und ein Brief. „An den Vogt Kuno. Roden Sie den Wald bis zum Fluss. Die Bauern dort haben keine Rechte. Wer sich widersetzt, wird vertrieben. – Ulrich von Rabenfels.“', 'brief', {'flag': ['brief']}),
    B('Der Draht bricht. Schritte nähern sich dem Zelt.', 'erwischt'))
sz['brief'] = S('wald', 'Mit dem Brief in der Tasche schleichst du zurück in die Dunkelheit.',
    O('Heimkehren – mit Beweisen', 'heim_beweis'))
sz['erwischt'] = S('wald', 'Fackeln. Rufe. Zwei Männer packen dich und schleifen dich vor einen Mann im roten Mantel. Vogt Kuno betrachtet dich wie einen Käfer. „Ein Spion. Aus dem Dorf am Fluss, nehme ich an.“', gefahr=True, *[
    P('„Ich bin nur ein Wanderer.“', 'menschenkenntnis', 14, B('Kuno glaubt dir nicht – aber er ist müde und gelangweilt. „Werft ihn in den Wald. Wenn ich ihn wiedersehe, hängt er.“', 'heim_warnen', {'gefahr': 1}),
      B('„Lügner.“ Er nickt seinen Männern zu. Sie schlagen dich, bis alles dunkel wird. Du wachst am Fuß des Kamms auf, ohne Stiefel.', 'heim_warnen', {'gefahr': 2})),
    P('Sich losreißen und fliehen', 'flink', 15, B('Du reißt dich los, rennst, ein Bolzen zischt an deinem Ohr vorbei – und dann bist du im Dunkel des Waldes verschwunden.', 'heim_warnen'),
      B('Ein Bolzen streift deine Schulter. Du entkommst trotzdem, blutend.', 'heim_warnen', {'gefahr': 2}))])
sz['offen'] = S('wald', 'Am Morgen gehst du offen ins Lager. Armbrüste richten sich auf dich. Vogt Kuno tritt aus einem Zelt, den roten Mantel über den Schultern. „Mutig. Oder dumm. Was willst du?“',
    O('„Ihr wildert und brennt auf unserem Land.“', 'kuno_streit'),
    P('„Wir könnten uns einigen. Ihr braucht Holz, wir brauchen den Wald.“', 'feilschen', 14, B('Kuno reibt sich das Kinn. „Ein Handel? Ich höre.“', 'handel'), B('„Ich handle nicht mit Bauern.“', 'kuno_streit')))
sz['kuno_streit'] = S('wald', 'Kuno lacht. „Euer Land? Der Herr von Rabenfels sagt, das Land gehört ihm bis zum Fluss. Und der Herr hat Armbrüste. Ihr habt … was? Mistgabeln?“',
    O('„Wir haben eine Urkunde.“', 'urkunde', wenn={'wissen': 'moosherz'}),
    O('Gehen – und das Dorf warnen', 'heim_warnen'))
sz['urkunde'] = S('wald', 'Du erzählst von der Urkunde der Herrin Adelheid: Das Tal gehört denen, die es bestellen. Kuno wird still. „Eine Urkunde von Moosherz? Wenn die echt ist, sieht die Sache anders aus. Mein Herr fürchtet nichts so sehr wie einen Rechtsstreit vor dem Grafen.“',
    O('„Dann zieht ab.“', 'abzug'))
sz['abzug'] = S('wald', 'Kuno sieht lange auf den qualmenden Meiler. „Ich ziehe bis zum Kamm zurück. Westlich davon rührt keiner meiner Männer einen Baum an. Bis mein Herr entschieden hat.“',
    O('Heimkehren', 'heim_sieg'))
sz['handel'] = S('wald', '„Ihr bekommt Holz vom Ostkamm“, sagst du, „den Hang hinunter bis zur Brandschneise. Dafür bleibt der Wald westlich davon unberührt, und das Wildern hört auf.“ Kuno überlegt. „Und was bekommt ihr?“',
    P('„Ruhe. Und jede zehnte Fuhre Holz.“', 'feilschen', 14, B('Kuno lacht und schlägt ein. „Du hättest Händler werden sollen.“', 'heim_handel', {'flag': ['handel_gut']}),
      B('„Ruhe – mehr nicht. Nimm es oder lass es.“', 'heim_handel')))
sz['heim_beweis'] = R('wald', 'Du eilst den Kamm hinunter nach Hause, den Brief des Herrn von Rabenfels in der Tasche.', 300, 'dorfrat_beweis', unterwegs='Du eilst nach Hause.')
sz['heim_warnen'] = R('wald', 'Du machst dich auf den Weg nach Hause, um das Dorf zu warnen.', 300, 'dorfrat', unterwegs='Du eilst nach Hause.')
sz['heim_sieg'] = R('wald', 'Leichten Herzens steigst du hinab ins Tal.', 300, 'ende_abzug', unterwegs='Du wanderst nach Hause.')
sz['heim_handel'] = R('wald', 'Mit einem Handschlag im Rücken gehst du heim.', 300, 'ende_handel', unterwegs='Du wanderst nach Hause.')
sz['dorfrat'] = S('dorf', 'Im Langhaus drängen sich die Leute. Du erzählst von den Armbrüsten, dem Meiler, dem Vogt. {A} ballt die Fäuste. {B} weint fast. „Was sollen wir tun?“',
    O('„Wir holen Hilfe aus Furtenau.“', 'furtenau', wenn={'wissen': 'bero'}),
    O('„Wir holen Harrek und seine Leute vom Steg.“', 'harrek', wenn={'wissen': 'harrek'}),
    O('„Wir bewachen den Waldrand. Tag und Nacht.“', 'wache'),
    O('„Wir können nichts tun.“', 'ende_nichts'))
sz['dorfrat_beweis'] = S('dorf', 'Im Langhaus liest du den Brief laut vor. Totenstille. Dann redet alles durcheinander. {A} schlägt mit der Faust auf den Tisch. „Mit diesem Brief gehen wir zum Grafen!“',
    O('„Ich bringe ihn selbst zum Grafen.“', 'graf'),
    O('„Wir zeigen ihn dem Vogt. Wenn er weiß, dass wir es wissen, zieht er ab.“', 'erpressen'))
sz['graf'] = R('berg', 'Die Reise zum Sitz des Grafen dauert einen ganzen Tag.', 600, 'grafsitz', unterwegs='Du reist zum Sitz des Grafen.')
sz['grafsitz'] = S('ruine', 'Der Graf ist ein müder alter Mann, der den Brief mit spitzen Fingern hält. „Rabenfels. Immer Rabenfels.“ Er sieht dich an. „Warum sollte ich mich für ein paar Bauern mit einem Mächtigen streiten?“',
    P('„Weil Rabenfels morgen Euer Land will, wenn er heute unseres bekommt.“', 'ueberreden', 15, B('Der Graf schweigt lange. Dann ruft er einen Schreiber. „Ein Brief an Rabenfels. Er soll seine Hunde zurückpfeifen.“', 'heim_graf'),
      B('„Ich werde darüber nachdenken.“ Das heißt: nein.', 'heim_graf_nein'), mod={'brief': -2}))
sz['heim_graf'] = R('berg', 'Mit dem Siegel des Grafen reist du heim.', 600, 'ende_graf', unterwegs='Du reist nach Hause.')
sz['heim_graf_nein'] = R('berg', 'Enttäuscht reist du heim.', 600, 'wache', unterwegs='Du reist nach Hause.')
sz['erpressen'] = S('wald', 'Du steigst noch einmal zum Lager hinauf und hältst Kuno eine Abschrift des Briefes unter die Nase. „Das Original liegt sicher. Wenn der Graf erfährt, was Euer Herr vorhat …“',
    P('„… zieht Ihr besser heute noch ab.“', 'einschuechtern', 14, B('Kuno wird blass. Am nächsten Tag ist das Lager leer.', 'ende_abzug'), B('Kuno lacht. „Der Graf? Der schläft seit zehn Jahren.“', 'wache')))
sz['furtenau'] = S('dorf', 'Du schickst einen Boten nach Furtenau. Zwei Tage später stehen zwanzig Furtenauer am Waldrand – Bero vorneweg. „Wer brennt hier Wälder ab?“',
    O('Gemeinsam zum Lager ziehen', 'aufmarsch'))
sz['harrek'] = S('dorf', 'Harrek kommt mit seinen vier Söldnern vom Steg. Er betrachtet den Bolzen. „Rabenfels. Für die haben wir mal gekämpft. Die zahlen schlecht und hängen schnell.“',
    O('Gemeinsam zum Lager ziehen', 'aufmarsch'))
sz['aufmarsch'] = R('wald', 'Ihr zieht zum Ostkamm hinauf – nicht als Spione, sondern als Menge.', 240, 'konfrontation', unterwegs='Ihr steigt gemeinsam zum Kamm hinauf.')
sz['konfrontation'] = K('wald', 'Kuno sieht die Menge aus dem Wald kommen. Seine Männer greifen nach den Armbrüsten. Wenn jetzt jemand zögert, wird es eine Schlacht.',
    'Die Schlacht am Ostkamm', 'banditen', 900,
    B('Kunos Männer weichen zurück, dann fliehen sie. Am Ende steht nur noch Kuno da – und dann rennt auch er. Das Lager gehört euch.', 'ende_sieg_menge'),
    B('Es wird hässlich – kurz, wild, blutig. Du gehst zu Boden, aber deine Leute halten stand, bis Kunos Männer fliehen.', 'ende_sieg_kampf', {'gefahr': 1}),
    P('„Geht. Heute noch. Sonst wird es hässlich.“', 'einschuechtern', 12, B('Kuno spuckt aus, aber er gibt das Zeichen zum Abzug. Bis zum Abend ist das Lager leer.', 'ende_sieg_menge'),
      B('Ein Bolzen fliegt. Dann ein zweiter. Es wird hässlich – kurz, wild, dann fliehen Kunos Männer.', 'ende_sieg_kampf', {'gefahr': 1})),
    spieltext='Schlagt euch durch Kunos Söldner bis zu seinem Lager durch.', kampfort='wald', modus='marsch')
sz['wache'] = S('dorf', 'Das Dorf stellt Wachen an den Waldrand. Jede Nacht sitzt jemand am Feuer und horcht. Nach zwei Wochen kommen keine Wilderer mehr – aber am Ostkamm qualmt der Meiler weiter.',
    O('So muss es fürs Erste reichen', 'ende_wache'))
sz['ende_abzug'] = E('dorf', 'Am Ostkamm wird es still. Der Meiler erlischt. Im Frühjahr wachsen zwischen den verkohlten Stümpfen die ersten Birken.',
    {'sym': {'A': 5, 'B': 5}, 'chronik': ['s_armbrust_abzug', 'Ich habe den Vogt von Rabenfels zum Abzug vom Ostkamm gebracht.'], 'journal': ['rabenfels', 'Die Herren von Rabenfels', 'Ulrich von Rabenfels beansprucht das Land bis zum Fluss. Sein Vogt Kuno hat sich vom Ostkamm zurückgezogen – vorerst.'],
     'dorf': {'stimmung': 6, 'holz': 20}, 'beute': {'stufe': 3, 'chance': 0.6, 'text': 'Im verlassenen Lager liegt etwas, das die Männer in der Eile vergessen haben.'}})
sz['ende_handel'] = E('dorf', 'Die Leute von Rabenfels roden den Osthang – aber nur bis zur Schneise. Jede zehnte Fuhre Holz rollt ins Dorf. Nicht jeder findet das richtig. Aber das Wildern hat aufgehört.',
    {'sym': {'A': 2, 'B': 3}, 'chronik': ['s_armbrust_handel', 'Ich habe mit Vogt Kuno von Rabenfels einen Handel geschlossen: Holz gegen Ruhe.'], 'journal': ['rabenfels', 'Die Herren von Rabenfels', 'Ulrich von Rabenfels beansprucht das Land bis zum Fluss. Mit seinem Vogt Kuno gibt es einen Handel: Holz vom Osthang gegen Ruhe.'],
     'dorf': {'holz': 40, 'stimmung': 2}})
sz['ende_graf'] = E('dorf', 'Ein Bote des Grafen reitet zum Lager am Ostkamm. Am nächsten Morgen ist es leer. Im Langhaus hängt jetzt neben dem Ehrenband eine Abschrift des gräflichen Briefes.',
    {'sym': {'A': 6, 'B': 6}, 'chronik': ['s_armbrust_graf', 'Ich habe den Brief des Herrn von Rabenfels zum Grafen gebracht. Rabenfels musste abziehen.'], 'journal': ['rabenfels', 'Die Herren von Rabenfels', 'Ulrich von Rabenfels wollte das Tal bis zum Fluss roden. Der Graf hat es ihm verboten – auf meine Bitte.'],
     'dorf': {'stimmung': 10, 'holz': 15}, 'beute': {'stufe': 3, 'chance': 0.8, 'text': 'Der Graf lässt dir zum Dank etwas aus seiner Rüstkammer überreichen.'}})
sz['ende_sieg_menge'] = E('dorf', 'Zwei Dörfer haben gemeinsam einen Herrn vertrieben. Am Abend wird in Furtenau und bei uns gleichzeitig gefeiert.',
    {'sym': {'A': 5, 'B': 5}, 'chronik': ['s_armbrust_menge', 'Gemeinsam mit Verbündeten haben wir die Männer von Rabenfels vom Ostkamm vertrieben.'], 'dorf': {'stimmung': 8, 'holz': 25},
     'beute': {'stufe': 3, 'chance': 0.7, 'text': 'Im Lager findet sich Beute.'}})
sz['ende_sieg_kampf'] = E('dorf', 'Es gab Verletzte, auf beiden Seiten. Aber das Lager ist geräumt. Über das, was an diesem Tag geschah, redet im Dorf noch lange niemand gern.',
    {'sym': {'A': 4, 'B': 2}, 'chronik': ['s_armbrust_kampf', 'Wir haben die Männer von Rabenfels im Kampf vom Ostkamm vertrieben.'], 'dorf': {'stimmung': 2, 'holz': 25},
     'beute': {'stufe': 3, 'chance': 0.8, 'text': 'Unter den zurückgelassenen Waffen ist etwas Besonderes.'}})
sz['ende_wache'] = E('dorf', 'Das Dorf schläft wieder ruhiger. Doch am Ostkamm steigt weiter Rauch auf, und jeder weiß: Das ist nicht vorbei.',
    {'sym': {'A': 2, 'B': 2}, 'chronik': ['s_armbrust_wache', 'Ich habe das Dorf vor den Männern von Rabenfels gewarnt. Seitdem halten wir Wache.'], 'dorf': {'stimmung': -1}})
sz['ende_nichts'] = E('dorf', 'Das Dorf schweigt. Die Wilderer kommen weiter, und eines Morgens ist die halbe Jagdbeute des Winters fort.', {'sym': {'A': -2, 'B': -1}, 'dorf': {'nahrung': -15, 'stimmung': -4}})
Q.append(dict(id='s_armbrust', titel='Die Männer mit den Armbrüsten', schwierigkeit=3, kurz='Fremde wildern mit schwarzen Armbrustbolzen in unseren Wäldern, und am Ostkamm brennt der Wald. {A} will wissen, wer dahintersteckt.',
    rollen={'A': 'Wer den Bolzen fand', 'B': 'Wer Angst hat'}, start='auftrag', szenen=sz))

# ─────────────────────────── Über den Weißen Pass ───────────────────────────
sz = {}
sz['auftrag'] = S('dorf', '{A} hustet in ein Tuch. „Das Salz ist aus. Ohne Salz kein Pökelfleisch, kein Käse, der den Winter übersteht. Die Händler kommen nicht mehr – der Weg unten herum ist versperrt. Bleibt der Weiße Pass. Zwei Tage hin, zwei zurück. Im Schnee.“ {B} schüttelt den Kopf. „Im Winter geht da keiner rüber.“',
    O('„Ich gehe.“', 'packen'),
    O('„Was weiß man über den Pass?“', 'packen', ergebnis='„Auf halber Höhe steht eine Schutzhütte“, sagt {A}. „Und oben ein alter Wegstein. Man sagt, wer seine Frage beantwortet, findet den Weg auch im Nebel.“', folgen={'flag': ['wegstein']}))
sz['packen'] = S('dorf', 'Du packst warme Kleidung, Seil, Proviant. {B} drückt dir einen Beutel mit getrockneten Äpfeln in die Hand. „Für die Hütte. Falls jemand Hunger hat.“',
    O('Aufbrechen', 'reise1', folgen={'flag': ['aepfel']}))
sz['reise1'] = R('berg', 'Der Weg steigt steil an. Bald liegt Schnee, erst knöcheltief, dann bis zu den Knien.', 480, 'huette',
    unterwegs='Du steigst durch den Schnee zum Pass hinauf.', begegnung=['b_steinbock', 'b_lawine'], chance=0.7)
sz['b_steinbock'] = S('berg', 'Auf einem Felsvorsprung steht ein Steinbock und sieht auf dich herab. Dann springt er davon – genau dort, wo du gehen wolltest, rutscht ein Brett aus Schnee ins Tal.',
    O('Dem Steinbock danken und einen anderen Weg nehmen', 'huette'))
sz['b_lawine'] = S('berg', 'Über dir knackt es. Ein Schneebrett löst sich vom Hang.', gefahr=True, *[
    P('Zur Seite rennen', 'flink', 13, B('Du wirfst dich hinter einen Felsen. Der Schnee donnert vorbei.', 'huette'), B('Der Schnee reißt dich mit. Du gräbst dich mühsam frei – mit tauben Fingern.', 'huette', {'gefahr': 1}))])
sz['huette'] = S('feuer', 'Bei Einbruch der Dunkelheit erreichst du die Schutzhütte. Drinnen brennt ein kleines Feuer. Eine Frau und zwei Kinder kauern davor, die Lippen blau. „Unser Karren ist abgestürzt“, sagt die Frau. „Mein Mann ist losgegangen, Hilfe holen. Vor zwei Tagen.“',
    O('Die getrockneten Äpfel teilen', 'familie', wenn={'flag': 'aepfel'}, folgen={'flag': ['geteilt']}),
    O('Feuerholz sammeln und das Feuer größer machen', 'feuer'),
    O('Fragen, wohin ihr Mann gegangen ist', 'mann'))
sz['familie'] = S('feuer', 'Die Kinder essen mit großen Augen. Die Frau heißt Svanja. „Wir wollten zu meiner Schwester über den Pass. Wir dachten, wir schaffen es vor dem Schnee.“',
    O('Fragen, wohin ihr Mann gegangen ist', 'mann'),
    O('Feuerholz sammeln', 'feuer'))
sz['feuer'] = MG('berg', 'Draußen ist es stockdunkel und eiskalt. Unter dem Schnee liegt totes Holz – wenn du es findest und spaltest, bevor deine Finger erfrieren.', 'axt', 2, 'Feuerholz spalten',
    B('Bald prasselt ein ordentliches Feuer. Die Kinder schlafen ein, aneinandergekuschelt.', 'mann', {'flag': ['warm']}),
    B('Deine Finger sind zu steif. Das Feuer bleibt klein, die Nacht wird lang.', 'mann', {'gefahr': 1}))
sz['mann'] = S('feuer', 'Svanja zeigt in die Dunkelheit. „Nach oben. Zum Pass. Er wollte über die Eiskante abkürzen.“',
    O('Bei Tagesanbruch nach ihm suchen', 'suche'),
    O('Erst die Familie ins Tal bringen', 'tal'),
    O('Weiter zum Pass – das Salz geht vor', 'reise2'))
sz['tal'] = R('berg', 'Du führst Svanja und die Kinder ein Stück abwärts, bis zu einem Hirtenunterstand, wo sie sicher warten können. Dann wieder hinauf.', 180, 'suche', unterwegs='Du bringst die Familie in Sicherheit.')
sz['suche'] = S('berg', 'Im Morgengrauen folgst du den Spuren nach oben. Sie führen zu einer Eiskante – ein schmaler Sims über einem Abgrund. Am anderen Ende, zusammengekauert an einem Felsen, ein Mann.',
    O('Über den Sims zu ihm', 'sims'),
    O('Mit dem Seil sichern und hinüber', 'sims_seil', wenn={'item': 'seil'}))
sz['sims'] = MG('berg', 'Der Sims ist vereist und kaum fußbreit. Unter dir: nichts als weißer Nebel.', 'eis', 3, 'Über die Eiskante',
    B('Schritt für Schritt erreichst du den Mann. Er lebt – knapp.', 'mann_gerettet'),
    B('Deine Füße rutschen weg. Du hängst an einer Kante, ziehst dich hoch, zitternd, mit aufgeschürften Händen – und gibst auf.', 'reise2', {'gefahr': 2}), gefahr=True)
sz['sims_seil'] = MG('berg', 'Das Seil um einen Felsen geschlungen, tastest du dich voran.', 'eis', 1, 'Über die Eiskante (gesichert)',
    B('Mit dem Seil ist es fast leicht. Der Mann lebt.', 'mann_gerettet'),
    B('Selbst gesichert rutschst du ab und baumelst am Seil. Du schaffst es zurück, aber nicht hinüber.', 'reise2', {'gefahr': 1}))
sz['mann_gerettet'] = S('berg', 'Der Mann heißt Jorin. Sein Bein ist gebrochen. „Svanja? Die Kinder?“ Als du nickst, weint er.',
    P('Das Bein schienen und ihn hinuntertragen', 'heilkunde', 13, B('Mit zwei Ästen und deinem Gürtel schienst du das Bein. Gemeinsam humpelt ihr zur Hütte hinunter. Svanja schreit, als sie euch sieht – vor Freude.', 'wiedersehen', {'flag': ['jorin']}),
      B('Das Schienen misslingt, Jorin schreit vor Schmerz. Ihr braucht den ganzen Tag bis zur Hütte.', 'wiedersehen', {'flag': ['jorin']})))
sz['wiedersehen'] = S('feuer', 'Die Familie ist wieder zusammen. Svanja drückt dir die Hand. „Über den Pass musst du allein. Aber nimm das hier.“ Sie gibt dir ein Stück Pergament: eine Wegskizze für den Abstieg auf der anderen Seite.',
    O('Weiter zum Pass', 'reise2', folgen={'flag': ['skizze']}))
sz['reise2'] = R('berg', 'Der Aufstieg zum Pass ist der schwerste Teil. Wind peitscht dir Schnee ins Gesicht.', 360, 'wegstein', unterwegs='Du kämpfst dich zum Pass hinauf.')
sz['wegstein'] = RZ('berg', 'Auf der Passhöhe steht ein mannshoher Stein, halb im Schnee. Nebel zieht auf, so dicht, dass du die Hand vor Augen kaum siehst. In den Stein gemeißelt sind Worte.',
    'Ich wandere durch das Tal und bewege mich nicht.\nIch habe ein Bett und schlafe nie.\nIch habe einen Mund und spreche nie.\nFolge mir, und du findest hinab.',
    ['Fluss', 'der Fluss', 'Bach', 'Strom'],
    B('Natürlich – der Fluss. Du lauschst: Irgendwo unter dem Schnee gluckert Schmelzwasser. Du folgst ihm, und es führt dich sicher hinab.', 'abstieg'),
    B('Der Nebel bleibt. Du irrst stundenlang umher, bis du endlich einen Weg hinab findest – erschöpft und halb erfroren.', 'abstieg', {'gefahr': 1}),
    hinweise=['Was hat ein Bett, aber schläft nie?', 'Hör genau hin. Unter dem Schnee fließt etwas.'], versuche=3, falsch='Der Nebel wird dichter.')
sz['abstieg'] = S('berg', 'Auf der anderen Seite des Passes liegt das Salzdorf Lauterquell, eingeklemmt zwischen zwei Felswänden. Rauch steigt aus den Siedehäusern.',
    O('Zum Salzsieder', 'sieder'))
sz['sieder'] = S('dorf', 'Der Salzsieder ist ein dicker Mann mit roten Händen. „Salz? Über den Pass? Im Winter?“ Er lacht. „Dafür will ich mehr als sonst. Viel mehr.“',
    P('Feilschen', 'feilschen', 14, B('Nach langem Hin und Her: zwei Säcke für einen anständigen Preis.', 'salz', {'flag': ['salz_gut']}),
      B('Ein Sack, und der war teuer.', 'salz')),
    O('Von Svanja und Jorin erzählen', 'jorin_bekannt', wenn={'flag': 'jorin'}))
sz['jorin_bekannt'] = S('dorf', '„Jorin? Svanja?“ Der Sieder wird blass. „Svanja ist die Schwester meiner Frau. Sie leben?“ Als du nickst, umarmt er dich – mit Salz an den Händen.',
    O('Weiter', 'salz', folgen={'flag': ['salz_gut', 'sieder_freund']}))
sz['salz'] = S('dorf', 'Die Säcke sind schwer. Der Rückweg auch.',
    O('Über den Pass zurück', 'rueck'),
    O('Den Sieder um einen Maulesel bitten', 'esel', wenn={'flag': 'sieder_freund'}))
sz['esel'] = S('dorf', '„Nimm Grete. Sie kennt den Pass besser als jeder Mensch. Schick sie mit Svanja zurück, wenn der Schnee schmilzt.“',
    O('Mit Grete über den Pass', 'rueck', folgen={'flag': ['esel']}))
sz['rueck'] = R('berg', 'Der Rückweg über den Pass: wieder Schnee, wieder Wind, aber diesmal kennst du den Weg.', 480, 'woelfe', unterwegs='Du trägst das Salz über den Pass zurück.')
sz['woelfe'] = S('berg', 'Kurz vor der Schutzhütte, in der Dämmerung: Augen zwischen den Felsen. Drei Wölfe, mager vom Winter. Sie riechen das Pökelfleisch in deinem Proviant.', gefahr=True, *[
    O('Kämpfen', 'woelfe_kampf'),
    O('Mit dem Bogen vertreiben', 'woelfe_bogen', wenn={'item': 'bogen'}),
    P('Ein Feuer entfachen und sie verscheuchen', 'anpacken', 14, B('Funken, Rauch – die Wölfe weichen zurück und verschwinden in der Nacht.', 'heim'), B('Das Feuer will nicht brennen. Ein Wolf schnappt nach deinem Bein, bevor sie fliehen.', 'heim', {'gefahr': 2})),
    O('Ihnen das Pökelfleisch hinwerfen', 'heim', ergebnis='Die Wölfe stürzen sich darauf. Du gehst rückwärts davon, ohne sie aus den Augen zu lassen. Das Salz ist wichtiger als das Fleisch.')])
sz['woelfe_kampf'] = K('berg', 'Du ziehst deine Waffe. Die drei Wölfe knurren – und aus den Felsen kommen mehr. Viel mehr. Ein ganzes Rudel, ausgehungert vom Winter.',
    'Das Rudel am Pass', 'berg', 720,
    B('Der letzte Wolf flieht jaulend in die Dunkelheit. Du stehst keuchend im blutigen Schnee – das Salz ist sicher.', 'heim'),
    B('Die Wölfe reißen dich zu Boden. Erst als du ihnen das Pökelfleisch hinwirfst, lassen sie ab. Das Salz behältst du – und ein paar Narben.', 'heim', {'gefahr': 2}),
    spieltext='Kämpf dich durch das Rudel über den Pass hinab.', kampfort='berg', modus='marsch')
sz['woelfe_bogen'] = MG('berg', 'Du spannst den Bogen. Ein Schuss vor ihre Pfoten sollte reichen.', 'bogen', 2, 'Die Wölfe vertreiben',
    B('Der Pfeil schlägt zwischen ihnen in den Schnee. Sie fliehen.', 'heim'),
    B('Der Pfeil geht weit daneben. Die Wölfe kommen näher – du musst ihnen das Fleisch hinwerfen.', 'heim'))
sz['heim'] = R('berg', 'Der Abstieg ins Tal. Unten siehst du den Rauch deines Dorfes.', 300, 'ankunft', unterwegs='Du steigst ins Tal hinab.')
sz['ankunft'] = S('dorf', 'Als du mit dem Salz ins Dorf kommst, läuft {A} dir entgegen.',
    O('Das Salz abladen', 'ende_gut', wenn={'flag': 'salz_gut'}),
    O('Das Salz abladen', 'ende_wenig', wenn={'nicht_flag': 'salz_gut'}))
sz['ende_gut'] = E('dorf', 'Zwei Säcke Salz! Noch am selben Abend wird gepökelt, gesalzen, eingelegt. {A} sagt: „Diesen Winter verhungert keiner.“ Und im Frühjahr kommt Grete der Maulesel mit Svanjas Familie über den Pass – mit einem Gruß aus Lauterquell.',
    {'sym': {'A': 6, 'B': 5}, 'merkt': {'A': '{held} ist im Winter über den Weißen Pass gegangen und hat Salz für uns alle geholt.'},
     'chronik': ['s_pass_gut', 'Ich bin im Winter über den Weißen Pass gegangen und habe zwei Säcke Salz aus Lauterquell geholt.'],
     'journal': ['lauterquell', 'Lauterquell', 'Jenseits des Weißen Passes liegt das Salzdorf Lauterquell. Der Salzsieder dort ist uns freundlich gesinnt.'],
     'dorf': {'nahrung': 40, 'stimmung': 6}, 'beute': {'stufe': 3, 'chance': 0.7, 'text': 'Der Salzsieder hat dir noch etwas in die Säcke gesteckt – zum Dank.'}})
sz['ende_wenig'] = E('dorf', 'Ein Sack Salz – nicht viel, aber genug, um das Wichtigste zu pökeln. {A} klopft dir auf die Schulter. „Besser als nichts. Viel besser.“',
    {'sym': {'A': 4, 'B': 3}, 'chronik': ['s_pass', 'Ich bin im Winter über den Weißen Pass gegangen und habe Salz geholt.'], 'dorf': {'nahrung': 20, 'stimmung': 3},
     'beute': {'stufe': 2, 'chance': 0.5, 'text': 'In Lauterquell hast du unterwegs etwas Nützliches erstanden.'}})
Q.append(dict(id='s_pass', titel='Über den Weißen Pass', schwierigkeit=3, kurz='Das Salz geht aus, und der einzige Weg zu den Salzsiedern führt über den verschneiten Weißen Pass. {A} bittet dich zu gehen. Mehrere Tage.',
    rollen={'A': 'Wer das Salz braucht', 'B': 'Wer zweifelt'}, start='auftrag', szenen=sz))
