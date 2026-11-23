# Kurze Erkundungen der Umgebung (art = 'erkundung'): 2–6 Szenen, kleine Funde, laufen nebenbei.
from qlib import O, B, P, S, R, MG, RZ, E, K

Q = []

def add(id, titel, kurz, start, sz):
    Q.append(dict(id='e_' + id, titel=titel, kurz=kurz, start=start, szenen=sz))

# 1 Der hohle Baum
sz = {}
sz['los'] = R('wald', 'Du streifst durch den Buchenwald hinter dem Dorf.', 10, 'baum', unterwegs='Du streifst durch den Wald.')
sz['baum'] = S('wald', 'Eine uralte Eiche, innen hohl. Aus dem Loch summt es – Bienen. Und weiter unten glänzt etwas.',
    O('Nach dem Glänzenden greifen', 'greifen'),
    O('Den Bienen etwas Honig abluchsen', 'honig'),
    O('Weitergehen', 'ende_nichts'))
sz['greifen'] = P('Schnell zugreifen', 'flink', 11, B('Du ziehst die Hand blitzschnell heraus: ein alter Kupferring, grün angelaufen. Und kein einziger Stich.', 'ende_ring'),
    B('Autsch. Zwei Stiche – und der Ring rutscht tiefer ins Loch.', 'ende_nichts', {'gefahr': 1}))
sz['greifen'] = S('wald', 'Du schiebst die Hand langsam ins Loch.', sz['greifen'])
sz['honig'] = MG('wald', 'Mit Rauch und Geduld …', 'fangen', 2, 'Honigwaben bergen',
    B('Eine Wabe, triefend vor Honig. Die Bienen sind kaum aufgewacht.', 'ende_honig'),
    B('Die Bienen wachen auf. Du rennst.', 'ende_nichts', {'gefahr': 1}))
sz['ende_ring'] = E('wald', 'Du steckst den Ring ein. Wer ihn wohl verloren hat?', {'beute': {'stufe': 1, 'chance': 0.6, 'text': 'Der Ring ist mehr wert, als er aussieht.'}})
sz['ende_honig'] = E('wald', 'Mit klebrigen Fingern kommst du heim. Der Honig geht an die Vorräte.', {'dorf': {'nahrung': 3, 'stimmung': 1}})
sz['ende_nichts'] = E('wald', 'Du gehst heim. Der Wald behält seine Geheimnisse.')
add('baum', 'Der hohle Baum', 'Hinter dem Dorf steht eine alte Eiche.', 'los', sz)

# 2 Der Steinkreis
sz = {}
sz['los'] = R('berg', 'Du steigst den Hügel hinauf, auf dem die alten Steine stehen.', 15, 'kreis', unterwegs='Du steigst zum Steinkreis hinauf.')
sz['kreis'] = RZ('berg', 'Sieben Steine im Kreis, mannshoch, voller Flechten. Auf dem größten ist eine Inschrift kaum noch zu lesen.',
    'Je mehr du von mir nimmst,\ndesto größer werde ich.',
    ['Loch', 'ein Loch', 'Grube', 'Graben'],
    B('Du sagst es laut. Nichts passiert – aber am Fuß des Steins entdeckst du eine Mulde, in der jemand Opfergaben hinterlassen hat. Ein Kupferstück und eine Feder.', 'ende_gut'),
    B('Der Stein schweigt. Ein Rabe krächzt, als würde er dich auslachen.', 'ende'),
    hinweise=['Graben hilft beim Nachdenken.', 'Ein Spaten macht es größer.'], versuche=3)
sz['ende_gut'] = E('berg', 'Du lässt die Feder liegen und nimmst nur das Kupferstück. Ein bisschen schlechtes Gewissen geht mit.', {'beute': {'stufe': 1, 'chance': 0.5}})
sz['ende'] = E('berg', 'Oben weht der Wind über das Tal. Von hier sieht man bis zum Fluss.')
add('steinkreis', 'Der Steinkreis', 'Auf dem Hügel stehen alte Steine.', 'los', sz)

# 3 Der Bachlauf
sz = {}
sz['los'] = R('fluss', 'Du folgst dem Bach ein Stück aufwärts.', 10, 'bach', unterwegs='Du folgst dem Bach.')
sz['bach'] = S('fluss', 'An einer tiefen Stelle stehen Forellen still in der Strömung.',
    O('Mit der Hand eine Forelle kitzeln', 'fisch'),
    O('Nach Flusskieseln suchen', 'kiesel'))
sz['fisch'] = MG('fluss', 'Ganz langsam schiebst du die Hand unter den Fisch …', 'angeln', 1, 'Forelle kitzeln',
    B('Zack – die Forelle zappelt im Gras.', 'ende_fisch'), B('Platsch. Nur nasse Ärmel.', 'ende'))
sz['kiesel'] = MG('fluss', 'Zwischen den Kieseln funkelt manchmal etwas.', 'finden', 1, 'Kiesel durchsuchen',
    B('Ein Stück Bergkristall, klar wie Eis.', 'ende_kristall'), B('Nur Kiesel. Hübsche Kiesel, aber Kiesel.', 'ende'))
sz['ende_fisch'] = E('fluss', 'Die Forelle wandert in den Topf.', {'dorf': {'nahrung': 2}})
sz['ende_kristall'] = E('fluss', 'Der Kristall glitzert in deiner Hand.', {'dorf': {'waren': 1}, 'beute': {'stufe': 1, 'chance': 0.3}})
sz['ende'] = E('fluss', 'Das Rauschen des Bachs begleitet dich heim.')
add('bach', 'Am Bach', 'Der Bach plätschert am Dorf vorbei.', 'los', sz)

# 4 Der Wanderer
sz = {}
sz['los'] = R('wald', 'Du gehst den Weg zum Pass ein Stück hinauf.', 15, 'mann', unterwegs='Du wanderst den Passweg hinauf.')
sz['mann'] = S('wald', 'Am Wegrand sitzt ein alter Mann mit einem Wanderstab und einem leeren Beutel. „Hast du etwas zu essen, Freund? Ich erzähle dir dafür eine Geschichte.“',
    O('Brot mit ihm teilen', 'geschichte', folgen={'dorf': {'nahrung': -1}}),
    P('„Erst die Geschichte.“', 'ueberreden', 11, B('Er lacht. „Gut. Aber danach teilst du.“', 'geschichte'), B('„Nichts im Leben ist umsonst, Kind.“ Er schließt die Augen.', 'ende_weg')))
sz['geschichte'] = S('wald', 'Er erzählt von einem Dorf, das unter einem See versank, und einer Glocke, die noch immer läutet, wenn der Wind über das Wasser geht. „Hollerbrück hieß es“, sagt er. „Flussaufwärts. Frag mal am Brett danach.“',
    O('Ihm danken', 'ende_gut'))
sz['ende_gut'] = E('wald', 'Als du dich umdrehst, ist der Alte fort. Nur sein Wanderstab lehnt am Baum.', {'journal': ['hollerbrueck', 'Hollerbrück', 'Ein Wanderer erzählte von einem versunkenen Weiler flussaufwärts, in dem eine Glocke unter Wasser läutet.'], 'beute': {'stufe': 1, 'chance': 0.4}})
sz['ende_weg'] = E('wald', 'Du gehst weiter. Er pfeift dir hinterher.')
add('wanderer', 'Der alte Wanderer', 'Auf dem Passweg begegnet man manchmal Fremden.', 'los', sz)

# 5 Die Fuchsfalle
sz = {}
sz['los'] = R('wald', 'Du durchstreifst das Unterholz am Feldrand.', 10, 'falle', unterwegs='Du streifst durch das Unterholz.')
sz['falle'] = S('wald', 'Ein Fuchs sitzt mit dem Hinterlauf in einer rostigen Schlinge fest. Er faucht, als du näherkommst.',
    P('Ihn befreien', 'beruhigen', 12, B('Du sprichst leise, bis er still hält, und lockerst die Schlinge. Er humpelt davon – und dreht sich einmal um.', 'ende_frei'),
      B('Er beißt dir in die Hand, bevor du ihn befreit hast. Aber frei ist er.', 'ende_frei', {'gefahr': 1})),
    O('Die Schlinge mitnehmen und den Fuchs erlösen', 'ende_fell'),
    O('Ihn sitzen lassen', 'ende'))
sz['ende_frei'] = E('wald', 'Am nächsten Morgen liegt vor deiner Tür ein toter Hase. Zufall, sicher.', {'dorf': {'nahrung': 1, 'stimmung': 1}})
sz['ende_fell'] = E('wald', 'Das Fell geht an die Gerberei.', {'dorf': {'waren': 1}})
sz['ende'] = E('wald', 'Das Fauchen hörst du noch lange.')
add('fuchs', 'Die Schlinge', 'Am Feldrand legt jemand Schlingen.', 'los', sz)

# 6 Die Ruine am Hang
sz = {}
sz['los'] = R('ruine', 'Am Hang über dem Dorf stehen Mauerreste einer alten Hütte.', 20, 'ruine', unterwegs='Du kletterst zur Ruine hinauf.')
sz['ruine'] = S('ruine', 'Brennnesseln, ein eingestürzter Herd, eine Kiste unter Schutt.',
    O('Die Kiste öffnen', 'kiste'),
    O('Den Herd untersuchen', 'herd'))
sz['kiste'] = MG('ruine', 'Ein rostiges Schloss hält die Kiste zu.', 'schloss', 2, 'Die Kiste knacken',
    B('Das Schloss gibt nach. In der Kiste: Werkzeug, eingewickelt in geöltes Leder.', 'ende_kiste'), B('Das Schloss ist stärker. Die Kiste bleibt zu.', 'ende'))
sz['herd'] = P('Nach losen Steinen suchen', 'spuren', 11, B('Im Herd, hinter einem losen Stein: ein Säckchen mit alten Münzen.', 'ende_muenzen'), B('Nur Ruß und Mäusenester.', 'ende'))
sz['herd'] = S('ruine', 'Du tastest den Herd ab.', sz['herd'])
sz['ende_kiste'] = E('ruine', 'Das Werkzeug ist noch gut.', {'dorf': {'waren': 2}})
sz['ende_muenzen'] = E('ruine', 'Wer hier wohl gewohnt hat?', {'beute': {'stufe': 1, 'chance': 0.8, 'text': 'Neben den Münzen liegt noch etwas.'}})
sz['ende'] = E('ruine', 'Du kletterst wieder hinunter.')
add('ruine', 'Die Ruine am Hang', 'Am Hang stehen alte Mauerreste.', 'los', sz)

# 7 Pilzwiese
sz = {}
sz['los'] = R('wald', 'Nach dem Regen riecht der Wald nach Erde.', 10, 'wiese', unterwegs='Du suchst nach Pilzen.')
sz['wiese'] = MG('wald', 'Eine Lichtung voller Pilze – essbare und giftige durcheinander.', 'pilze', 2, 'Pilze sammeln',
    B('Ein Korb voller guter Pilze.', 'ende_gut'), B('Du traust dich nicht und lässt die meisten stehen.', 'ende'))
sz['ende_gut'] = E('wald', 'Heute Abend gibt es Pilzsuppe.', {'dorf': {'nahrung': 3}})
sz['ende'] = E('wald', 'Lieber vorsichtig.')
add('pilze', 'Die Pilzlichtung', 'Nach dem Regen stehen die Pilze.', 'los', sz)

# 8 Der Felsüberhang
sz = {}
sz['los'] = R('berg', 'Du kletterst die Felsen oberhalb des Wasserfalls hinauf.', 20, 'fels', unterwegs='Du kletterst bergauf.')
sz['fels'] = S('berg', 'Unter einem Felsüberhang sind Zeichnungen an die Wand gemalt: Hirsche, Jäger, eine Sonne. Daneben ein schmaler Spalt.',
    O('Die Zeichnungen genau betrachten', 'bilder'),
    O('Durch den Spalt kriechen', 'spalt'))
sz['bilder'] = P('Die Bilder deuten', 'altes_wissen', 12, B('Die Zeichnungen zeigen den Weg der Herden im Winter – hinunter zum Fluss. Gut zu wissen für die Jäger.', 'ende_wissen'), B('Hübsch, aber rätselhaft.', 'ende'))
sz['bilder'] = S('berg', 'Du kniest vor der Felswand.', sz['bilder'])
sz['spalt'] = MG('hoehle', 'Der Spalt ist eng. Sehr eng.', 'balance', 2, 'Durch den Spalt',
    B('Dahinter eine kleine Kammer – und darin ein Feuerstein-Messer, uralt und noch scharf.', 'ende_messer'), B('Du steckst fest, windest dich zurück und hast blaue Flecken.', 'ende', {'gefahr': 1}))
sz['ende_wissen'] = E('berg', 'Du erzählst den Jägern davon.', {'dorf': {'nahrung': 2}, 'journal': ['felsbilder', 'Die Felsbilder', 'Über dem Wasserfall zeigen alte Bilder den Winterweg der Herden zum Fluss.']})
sz['ende_messer'] = E('hoehle', 'Ein Messer, älter als jedes Dorf.', {'beute': {'stufe': 2, 'chance': 0.5}})
sz['ende'] = E('berg', 'Du steigst wieder ab.')
add('felsbilder', 'Der Felsüberhang', 'Oberhalb des Wasserfalls gibt es Felsen.', 'los', sz)

# 9 Der verirrte Hirte
sz = {}
sz['los'] = R('wald', 'Du gehst am Waldrand entlang.', 10, 'kind', unterwegs='Du gehst am Waldrand entlang.')
sz['kind'] = S('wald', 'Ein Junge mit einem Stock sitzt weinend auf einem Stein. „Meine Lämmer sind weggelaufen. Wenn ich ohne sie heimkomme …“',
    O('Ihm helfen', 'laemmer'),
    O('Ihm sagen, er soll heimgehen', 'ende_nein'))
sz['laemmer'] = MG('wald', 'Drei Lämmer springen zwischen den Büschen herum.', 'laemmer', 1, 'Lämmer einfangen',
    B('Alle drei! Der Junge strahlt.', 'ende_gut'), B('Zwei von dreien. Besser als nichts.', 'ende_halb'))
sz['ende_gut'] = E('wald', 'Der Junge erzählt es jedem im Dorf.', {'dorf': {'stimmung': 2}})
sz['ende_halb'] = E('wald', 'Das dritte Lamm kommt am Abend von allein zurück.', {'dorf': {'stimmung': 1}})
sz['ende_nein'] = E('wald', 'Er schnieft und geht.')
add('laemmer', 'Der kleine Hirte', 'Am Waldrand weinen manchmal Kinder.', 'los', sz)

# 10 Das Wrack am Fluss
sz = {}
sz['los'] = R('fluss', 'Du gehst flussabwärts bis zur großen Biegung.', 20, 'wrack', unterwegs='Du gehst flussabwärts.')
sz['wrack'] = S('fluss', 'Ein gekentertes Boot hängt zwischen den Steinen. Ladung treibt im seichten Wasser.',
    O('Hinüberbalancieren', 'steine'),
    O('Vom Ufer aus nach Treibgut angeln', 'angeln'))
sz['steine'] = MG('fluss', 'Von Stein zu Stein, das Wasser reißt.', 'steg', 2, 'Über die Steine',
    B('Im Boot: ein Fass Salzfisch und eine Rolle Tuch.', 'ende_gut'), B('Du rutschst ab und wirst ein Stück mitgerissen. Klatschnass und mit leeren Händen.', 'ende', {'gefahr': 1}))
sz['angeln'] = MG('fluss', 'Mit einem Ast und einem Haken …', 'angeln', 2, 'Treibgut angeln',
    B('Ein Bündel Tuch, nass, aber gut.', 'ende_tuch'), B('Nur Algen.', 'ende'))
sz['ende_gut'] = E('fluss', 'Was der Fluss nimmt, gibt er manchmal zurück.', {'dorf': {'nahrung': 4, 'waren': 2}})
sz['ende_tuch'] = E('fluss', 'Das Tuch trocknet auf der Leine.', {'dorf': {'waren': 2}})
sz['ende'] = E('fluss', 'Der Fluss behält das Boot.')
add('wrack', 'Das Wrack an der Biegung', 'Flussabwärts strandet manchmal Treibgut.', 'los', sz)

# 11 Der Nebelmorgen
sz = {}
sz['los'] = R('wald', 'Dichter Nebel liegt über den Wiesen.', 10, 'nebel', unterwegs='Du gehst in den Nebel hinaus.')
sz['nebel'] = S('wald', 'Im Nebel hörst du ein Glöckchen. Dann eine Stimme, ganz nah: „Rate, wer ich bin, dann zeig ich dir etwas Schönes.“',
    O('„Wer bist du?“', 'raetsel'), O('Zurück ins Dorf', 'ende'))
sz['raetsel'] = RZ('wald', 'Die Stimme kichert.',
    'Ich habe keine Flügel und fliege doch,\nich habe keine Augen und weine doch.\nWer bin ich?',
    ['Wolke', 'eine Wolke', 'die Wolke', 'Nebel'],
    B('„Richtig!“ Der Nebel reißt auf, und vor dir liegt eine Wiese voller Wildkräuter, die du nie zuvor gesehen hast. Als du dich umdrehst, ist niemand da.', 'ende_gut'),
    B('„Falsch, falsch!“ Das Glöckchen verklingt. Der Nebel bleibt.', 'ende'),
    hinweise=['Schau nach oben.', 'Sie bringt den Regen.'], versuche=3)
sz['ende_gut'] = E('wald', 'Mit einem Arm voller Kräuter kommst du heim.', {'dorf': {'stimmung': 1, 'waren': 1}, 'beute': {'stufe': 1, 'chance': 0.4}})
sz['ende'] = E('wald', 'Der Nebel lichtet sich erst am Mittag.')
add('nebel', 'Der Nebelmorgen', 'An manchen Morgen liegt Nebel über den Wiesen.', 'los', sz)

# 12 Der Bienenschwarm / Beeren
sz = {}
sz['los'] = R('wald', 'Am sonnigen Südhang wachsen Beerensträucher.', 10, 'beeren', unterwegs='Du gehst zum Südhang.')
sz['beeren'] = S('wald', 'Die Sträucher hängen voll. Aber auf der anderen Seite brummt etwas Großes.',
    O('Schnell pflücken', 'pfluecken'), O('Nachsehen, was da brummt', 'baer'))
sz['pfluecken'] = MG('wald', 'Rote, blaue, schwarze Beeren – nicht alle sind essbar.', 'finden', 2, 'Beeren pflücken',
    B('Ein voller Korb, keine einzige giftige dabei.', 'ende_gut'), B('Zu viele Tollkirschen dazwischen. Du schüttest lieber alles weg.', 'ende'))
sz['baer'] = S('wald', 'Ein Bär! Jung, aber ein Bär. Er frisst Beeren und sieht dich an.', gefahr=True, *[
    P('Langsam zurückweichen', 'beruhigen', 12, B('Er frisst weiter. Du bist weg.', 'ende'), B('Er brummt und kommt einen Schritt näher. Du rennst – und stolperst.', 'ende', {'gefahr': 1})),
    O('Dich dem Bären stellen', 'baer_kampf'),
    O('Ihm die Beeren lassen', 'ende')])
sz['baer_kampf'] = K('wald', 'Du bleibst stehen. Der Bär richtet sich auf – und das Gebrüll lockt alles an, was im Wald Hunger hat.', 'Der Beerenhang', 'wildnis', 600,
    B('Der Bär trottet davon, und mit ihm der Rest. Die Sträucher gehören dir.', 'ende_baer'), B('Du flüchtest den Hang hinunter, zerkratzt und zerschunden.', 'ende', {'gefahr': 1}),
    spieltext='Halte zehn Minuten durch.', kampfort='wald')
sz['ende_baer'] = E('wald', 'Mit einem Korb voller Beeren und einer Geschichte, die dir keiner glauben wird, kehrst du heim.', {'dorf': {'nahrung': 4, 'stimmung': 2}, 'beute': {'stufe': 1, 'chance': 0.5}})
sz['ende_gut'] = E('wald', 'Beeren für alle.', {'dorf': {'nahrung': 2, 'stimmung': 1}})
sz['ende'] = E('wald', 'Du kehrst heim.')
add('beeren', 'Der Beerenhang', 'Am Südhang wachsen Beeren.', 'los', sz)

# 13 Moderlinge im Bruch
sz = {}
sz['los'] = R('wald', 'Hinter dem Erlenbruch riecht es seltsam süßlich.', 15, 'bruch', unterwegs='Du gehst zum Erlenbruch.')
sz['bruch'] = S('wald', 'Zwischen den Erlen blubbert der Boden. Grünliche Klumpen schieben sich aus dem Schlamm – Moderlinge, so nennen die Alten sie. Sie werden mehr.',
    O('Angreifen, bevor es zu viele werden', 'kampf'), O('Leise zurückgehen und im Dorf Bescheid sagen', 'ende_warnung'))
sz['kampf'] = K('wald', 'Die Moderlinge drehen sich zu dir um. Alle gleichzeitig.', 'Der Erlenbruch', 'wald', 600,
    B('Der letzte Moderling zerfällt zu Erde. Der süßliche Geruch verfliegt.', 'ende_gut'), B('Du ziehst dich zurück, über und über mit Schlamm bedeckt.', 'ende', {'gefahr': 1}), kampfort='wald')
sz['ende_gut'] = E('wald', 'Im Schlamm, wo die Moderlinge herkamen, glitzert etwas.', {'dorf': {'stimmung': 2}, 'beute': {'stufe': 1, 'chance': 0.7, 'text': 'Etwas, das jemand vor langer Zeit im Bruch verloren hat.'}})
sz['ende_warnung'] = E('dorf', 'Die Jäger meiden den Bruch jetzt. Vorerst.')
sz['ende'] = E('wald', 'Der Bruch gehört heute den Moderlingen.')
add('moder', 'Der Erlenbruch', 'Im Erlenbruch regt sich etwas.', 'los', sz)

# 14 Wegelagerer
sz = {}
sz['los'] = R('wald', 'Du gehst den Handelsweg ein Stück nach Süden.', 15, 'weg', unterwegs='Du gehst den Handelsweg entlang.')
sz['weg'] = S('wald', 'Ein umgestürzter Baum versperrt den Weg – zu sauber umgestürzt. Hinter den Büschen klirrt Metall. „Geldbeutel her, und keiner wird verletzt.“',
    O('„Hol ihn dir.“', 'kampf'), P('Sie wegschicken', 'einschuechtern', 13, B('„Pah. Nicht wert.“ Die Wegelagerer verschwinden im Wald.', 'ende'), B('Sie lachen. Dann ziehen sie die Messer.', 'kampf')))
sz['kampf'] = K('wald', 'Aus den Büschen kommen mehr, als du gedacht hast.', 'Wegelagerer', 'banditen', 600,
    B('Du brichst durch den Hohlweg. Die Wegelagerer fliehen und lassen ihre Beute zurück.', 'ende_gut'), B('Du rennst zurück zum Dorf, verfolgt von höhnischem Gelächter.', 'ende', {'gefahr': 1}), kampfort='wald', modus='marsch', spieltext='Schlag dich durch den Hohlweg bis zum anderen Ende.')
sz['ende_gut'] = E('wald', 'Unter dem Baum liegt ein Sack mit Diebesgut. Was man davon zurückgeben kann, gibst du zurück.', {'dorf': {'waren': 3, 'stimmung': 1}, 'beute': {'stufe': 2, 'chance': 0.5}})
sz['ende'] = E('wald', 'Den Handelsweg meidest du heute.')
add('wegelagerer', 'Der versperrte Weg', 'Auf dem Handelsweg lauert manchmal Gesindel.', 'los', sz)

# 15 Das Hügelgrab
sz = {}
sz['los'] = R('ruine', 'Auf der Heide liegt ein alter Grabhügel. Heute steht der Eingang offen.', 20, 'grab', unterwegs='Du gehst über die Heide.')
sz['grab'] = S('hoehle', 'Ein Gang aus Steinplatten führt in den Hügel. Drinnen klappert es. Knochen auf Stein.',
    O('Hineingehen', 'kampf'), O('Den Eingang mit Steinen verschließen', 'ende_zu'))
sz['kampf'] = K('hoehle', 'Aus den Nischen steigen die Toten des Hügels.', 'Das Hügelgrab', 'gruft', 600,
    B('Die Knochen fallen in sich zusammen. In der hintersten Kammer steht eine Truhe.', 'ende_gut'), B('Du stolperst ins Freie und schiebst einen Stein vor den Eingang.', 'ende', {'gefahr': 1}), kampfort='hoehle')
sz['ende_gut'] = E('hoehle', 'Die Grabbeigaben sind alt und schön.', {'beute': {'stufe': 2, 'chance': 0.85, 'text': 'Eine Grabbeigabe, älter als jedes Dorf im Tal.'}})
sz['ende_zu'] = E('ruine', 'Was im Hügel ist, bleibt im Hügel.')
sz['ende'] = E('ruine', 'Das Klappern hörst du noch auf dem Heimweg.')
add('huegelgrab', 'Das Hügelgrab', 'Auf der Heide liegt ein alter Grabhügel.', 'los', sz)

# 16 Das Rudel
sz = {}
sz['los'] = R('berg', 'Du steigst zu den Almwiesen hinauf.', 20, 'alm', unterwegs='Du steigst zur Alm hinauf.')
sz['alm'] = S('berg', 'Auf der Alm liegen zwei gerissene Schafe. Die Spuren führen zu den Felsen – und von dort beobachten dich gelbe Augen.',
    O('Dem Rudel entgegentreten', 'kampf'), O('Die Hirten warnen', 'ende_warnung'))
sz['kampf'] = K('berg', 'Der Leitwolf heult. Von allen Seiten kommen sie.', 'Das Rudel auf der Alm', 'wildnis', 600,
    B('Das Rudel zieht sich in die Berge zurück. Die Herden sind sicher.', 'ende_gut'), B('Du ziehst dich zurück. Die Wölfe bleiben.', 'ende', {'gefahr': 1}), kampfort='berg')
sz['ende_gut'] = E('berg', 'Die Hirten schenken dir einen Käse, groß wie ein Wagenrad.', {'dorf': {'nahrung': 5, 'stimmung': 2}})
sz['ende_warnung'] = E('berg', 'Die Hirten treiben die Herden tiefer ins Tal.', {'dorf': {'nahrung': -1}})
sz['ende'] = E('berg', 'Heute Nacht werden die Hirten wachen.')
add('rudel', 'Die Alm', 'Auf der Alm verschwinden Schafe.', 'los', sz)

if __name__ == '__main__':
    from qlib import pruefe
    for q in Q: print(q['id'], pruefe(q['id'], q['start'], q['szenen']))
