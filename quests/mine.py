# Quest "Die verlassene Mine" als Szenengraph. Erzeugt quests/mine.json (wird in quest_templates gespeichert).
import json
HAND = ['Zimmermann', 'Steinmetz', 'Bergmann', 'Holzfäller', 'Schmied']
STARK = HAND + ['Bauer', 'Wache', 'Söldnerin', 'Hauptmann']
TIER = ['Jäger', 'Jägerin', 'Falknerin', 'Hirte']
S = {}
S['aufbruch'] = {'ort': 'dorf', 'text': 'Früh am Morgen stehst du {mit} am Dorfrand. Über dem Wasserfall hängt Nebel. Irgendwo dort oben, am alten Pass, soll die verlassene Mine liegen. Welchen Weg nimmst du?', 'optionen': [
  {'text': 'Den Wildwechsel hinter der zweiten Bachbiegung nehmen', 'tag': '[Tagebuch: Pfad zur Mine]', 'wenn': {'wissen': 'mine_pfad'}, 'weiter': 'reise_pfad'},
  {'text': 'Durch den Wald einen eigenen Weg suchen', 'tag': '[Spuren lesen]', 'probe': {'id': 'spuren', 'dc': 12},
   'erfolg': {'text': 'Du findest alte Kerben an den Bäumen – Wegzeichen der Bergleute.', 'weiter': 'reise_wald'},
   'misserfolg': {'text': 'Das Unterholz wird dichter. Ihr verliert Zeit und Kraft.', 'folgen': {'flag': ['erschoepft']}, 'weiter': 'reise_umweg'}},
  {'text': 'Den alten Karrenweg nehmen – länger, aber breit und offen', 'weiter': 'reise_karren'}]}
S['reise_pfad'] = {'ort': 'wald', 'text': 'Ihr folgt dem Wildwechsel bergauf. Moos dämpft eure Schritte, der Wasserfall rauscht immer leiser.', 'reise': {'minuten': 1, 'weiter': 'eingang', 'begegnung': {'chance': 0.35, 'szenen': ['b_wanderer', 'b_wolf']}}}
S['reise_wald'] = {'ort': 'wald', 'text': 'Von Kerbe zu Kerbe geht es durch den Nadelwald. Harzgeruch, das Knacken von Ästen.', 'reise': {'minuten': 2, 'weiter': 'eingang', 'begegnung': {'chance': 0.5, 'szenen': ['b_wanderer', 'b_wolf', 'b_haendler']}}}
S['reise_umweg'] = {'ort': 'wald', 'text': 'Dornen, Geröll, ein Bach, den ihr zweimal überquert. Es dauert.', 'reise': {'minuten': 3, 'weiter': 'eingang', 'begegnung': {'chance': 0.6, 'szenen': ['b_wanderer', 'b_wolf']}}}
S['reise_karren'] = {'ort': 'wald', 'text': 'Der alte Karrenweg windet sich in Kehren den Hang hinauf. Hier sind früher Erzwagen gefahren.', 'reise': {'minuten': 2, 'weiter': 'eingang', 'begegnung': {'chance': 0.7, 'szenen': ['b_haendler', 'b_wanderer']}}}
S['b_wanderer'] = {'ort': 'wald', 'text': 'Am Wegrand sitzt ein Mann mit blutigem Bein. Ein Wanderer aus dem Süden, sagt er – gestürzt am Geröllhang. Er ist blass.', 'optionen': [
  {'text': 'Die Wunde versorgen', 'tag': '[Heilkunde]', 'probe': {'id': 'heilkunde', 'dc': 11},
   'erfolg': {'text': 'Du reinigst und verbindest die Wunde. Er atmet auf. „Ich heiße Arvid. Das vergesse ich dir nicht.“ Dann flüstert er: „Im Stollen da oben brennt Licht. Jemand ist dort.“', 'folgen': {'flag': ['licht_im_stollen'], 'begleiter_sym': 2, 'chronik': ['arvid_gerettet', 'Ich habe Arvid, einem verletzten Wanderer, auf dem Weg zur Mine das Bein verbunden.']}, 'weiter': 'eingang'},
   'misserfolg': {'text': 'Du tust, was du kannst. Es reicht, damit er sich ins Tal schleppen kann. „Danke. Im Stollen ist jemand – sei vorsichtig.“', 'folgen': {'flag': ['licht_im_stollen'], 'chronik': ['arvid_geholfen', 'Ich habe einem verletzten Wanderer namens Arvid geholfen, so gut ich konnte.']}, 'weiter': 'eingang'}},
  {'text': 'Ihm Brot und Wasser geben und weiterziehen', 'weiter': 'eingang', 'ergebnis': 'Er nickt dankbar. „Im Stollen ist jemand“, murmelt er noch. „Sei vorsichtig.“', 'folgen': {'flag': ['licht_im_stollen'], 'chronik': ['arvid_geholfen', 'Ich habe einem verletzten Wanderer namens Arvid Brot und Wasser gegeben.']}},
  {'text': '{bb} soll ihn ins Dorf bringen', 'tag': '[{bb}]', 'wenn': {'begleiter': True}, 'weiter': 'eingang', 'ergebnis': '{bb} nickt ernst und stützt den Mann. „Geh du weiter. Ich bringe ihn heim.“ Den Rest des Weges bist du ohne {bb} unterwegs.', 'folgen': {'begleiter_sym': 4, 'begleiter_ab': True, 'chronik': ['arvid_heimgebracht', 'Auf dem Weg zur Mine haben wir einen verletzten Wanderer gefunden und ins Dorf bringen lassen.']}},
  {'text': 'Weitergehen. Du hast keine Zeit.', 'weiter': 'eingang', 'ergebnis': 'Sein Blick folgt dir noch lange.', 'folgen': {'begleiter_sym': -3, 'chronik': ['arvid_zurueckgelassen', 'Ich habe auf dem Weg zur Mine einen verletzten Wanderer zurückgelassen.']}}]}
S['b_wolf'] = {'ort': 'wald', 'text': 'Zwischen den Stämmen ein graues Fell. Ein Wolf, mager, mit gesenktem Kopf – und er ist nicht allein.', 'optionen': [
  {'text': 'Einen Warnpfeil vor ihre Pfoten schießen', 'tag': '[Bogen]', 'wenn': {'item': 'bogen'}, 'probe': {'id': 'flink', 'dc': 10},
   'erfolg': {'text': 'Der Pfeil zischt in den Boden. Die Wölfe weichen zurück und verschwinden.', 'weiter': 'eingang'},
   'misserfolg': {'text': 'Der Pfeil geht weit daneben – die Wölfe kommen näher!', 'weiter': 'b_wolf_angriff'}},
  {'text': 'Groß machen, brüllen, den Stock schwingen', 'tag': '[Einschüchtern]', 'probe': {'id': 'einschuechtern', 'dc': 12},
   'erfolg': {'text': 'Die Wölfe ziehen sich knurrend zurück.', 'weiter': 'eingang'}, 'misserfolg': {'text': 'Sie lassen sich nicht beeindrucken.', 'weiter': 'b_wolf_angriff'}},
  {'text': '{bb} kennt die Tiere – lass {bb} machen', 'tag': '[{bb}]', 'wenn': {'begleiter_beruf': TIER}, 'weiter': 'eingang', 'ergebnis': '{bb} hebt langsam die Hand, spricht leise und weicht Schritt für Schritt zurück. Die Wölfe verlieren das Interesse. „Hungrig, nicht böse“, sagt {bb}.', 'folgen': {'begleiter_sym': 3, 'begleiter_loy': 1}},
  {'text': 'Leise gegen den Wind ausweichen', 'tag': '[Schleichen]', 'probe': {'id': 'flink', 'dc': 12},
   'erfolg': {'text': 'Ihr schleicht in weitem Bogen vorbei. Die Wölfe bemerken euch nicht.', 'weiter': 'eingang'}, 'misserfolg': {'text': 'Ein Ast bricht. Köpfe fahren herum.', 'weiter': 'b_wolf_angriff'}}]}
S['b_wolf_angriff'] = {'ort': 'wald', 'gefahr': True, 'text': 'Ein Wolf springt!', 'optionen': [
  {'text': 'Den Wolf abwehren', 'tag': '[Anpacken]', 'probe': {'id': 'anpacken', 'dc': 12},
   'erfolg': {'text': 'Du stößt ihn zurück. Das Rudel flieht in den Wald.', 'weiter': 'eingang'}, 'misserfolg': {'text': 'Zähne schlagen zu, dann ist der Spuk vorbei.', 'folgen': {'gefahr': True}, 'weiter': 'eingang'}},
  {'text': 'Auf einen Felsen springen', 'tag': '[Flink]', 'probe': {'id': 'flink', 'dc': 11},
   'erfolg': {'text': 'Mit einem Satz bist du oben. Die Wölfe umkreisen den Felsen und ziehen ab.', 'weiter': 'eingang'}, 'misserfolg': {'text': 'Du rutschst ab und schlägst hart auf.', 'folgen': {'gefahr': True}, 'weiter': 'eingang'}}]}
S['b_haendler'] = {'ort': 'wald', 'text': 'Ein Händler mit Maultier kommt euch entgegen. „Zur Mine? Mutig. Ich hätte da eine Laterne – für etwas Holz.“', 'optionen': [
  {'text': 'Die Laterne für 15 Holz kaufen', 'wenn': {'nicht_item': 'laterne', 'holz': 15}, 'weiter': 'eingang', 'ergebnis': 'Er grinst. „Gute Wahl. Da unten ist es finster.“', 'folgen': {'holz': -15, 'item_plus': {'laterne': 1}}},
  {'text': 'Den Preis drücken', 'tag': '[Feilschen]', 'wenn': {'nicht_item': 'laterne', 'holz': 8}, 'probe': {'id': 'feilschen', 'dc': 12},
   'erfolg': {'text': '„Acht Holz, und du erzählst keinem davon.“ Abgemacht.', 'folgen': {'holz': -8, 'item_plus': {'laterne': 1}}, 'weiter': 'eingang'},
   'misserfolg': {'text': 'Er bleibt hart. „Fünfzehn, mein Freund.“ Du lässt es.', 'weiter': 'eingang'}},
  {'text': 'Nach der Mine fragen', 'weiter': 'eingang', 'ergebnis': '„Da treibt sich ein Bergmann herum. Brun heißt er, aus Erzklamm. Hat eine kranke Tochter.“', 'folgen': {'flag': ['brun_bekannt']}},
  {'text': 'Grüßen und weitergehen', 'weiter': 'eingang'}]}
S['eingang'] = {'ort': 'mine', 'text': 'Der Eingang ist halb verschüttet, die Holzstützen sind morsch. Aus der Tiefe weht kalter Wind.', 'optionen': [
  {'text': '{bb} soll die Stützen prüfen', 'tag': '[{bb}]', 'wenn': {'begleiter_beruf': HAND, 'nicht_flag': 'gesichert'}, 'weiter': 'eingang', 'ergebnis': '{bb} klopft jeden Balken ab und keilt zwei lockere Stützen fest. „Jetzt hält es. Hoffentlich.“', 'folgen': {'flag': ['gesichert'], 'begleiter_sym': 2}},
  {'text': 'Die Laterne anzünden und hinein', 'wenn': {'item': 'laterne'}, 'weiter': 'stollen', 'folgen': {'flag': ['licht']}},
  {'text': 'Eine Fackel aus Harz und Kienspan machen', 'tag': '[Spuren lesen]', 'wenn': {'nicht_item': 'laterne'}, 'probe': {'id': 'spuren', 'dc': 10},
   'erfolg': {'text': 'Die Fackel knistert und wirft tanzende Schatten.', 'folgen': {'flag': ['licht']}, 'weiter': 'stollen'},
   'misserfolg': {'text': 'Das Harz will nicht brennen. Ihr müsst im Halbdunkel gehen.', 'folgen': {'flag': ['dunkel']}, 'weiter': 'stollen'}},
  {'text': 'Ohne Licht hinein', 'weiter': 'stollen', 'folgen': {'flag': ['dunkel']}}]}
S['stollen'] = {'ort': 'stollen', 'text': 'Ihr tastet euch tiefer. An einer Abzweigung: frische Kratzspuren und ein Geräusch wie Metall auf Stein. Jemand ist hier.', 'optionen': [
  {'text': 'Erst den Seitengang absuchen – die alten Bergleute haben hier gelagert', 'tag': '[Spuren lesen]', 'wenn': {'nicht_flag': 'gesucht'}, 'probe': {'id': 'spuren', 'dc': 12, 'mod': {'dunkel': 2}},
   'erfolg': {'text': 'Hinter eingestürzten Brettern steht eine verrottete Kiste. Darin, in geöltes Tuch gewickelt, liegt etwas, das die Jahre überstanden hat.', 'folgen': {'flag': ['gesucht'], 'beute': {'stufe': 2, 'chance': 1, 'text': 'Was die Bergleute hier zurückgelassen haben, gehört jetzt dir.'}}, 'weiter': 'stollen'},
   'misserfolg': {'text': 'Nur Schutt und Rattenkot. Und das Hämmern weiter vorne ist verstummt.', 'folgen': {'flag': ['gesucht']}, 'weiter': 'ueberrascht'}},
  {'text': 'Leise näherschleichen', 'tag': '[Schleichen]', 'probe': {'id': 'flink', 'dc': 12, 'mod': {'dunkel': 2}},
   'erfolg': {'text': 'Du schleichst bis an einen Felsvorsprung und hörst einen Mann murmeln: „… nur noch ein Stück, dann reicht es für die Medizin, Lene …“', 'folgen': {'flag': ['belauscht']}, 'weiter': 'fremder'},
   'misserfolg': {'text': 'Ein Stein knirscht unter deinem Fuß. Das Hämmern verstummt.', 'weiter': 'ueberrascht'}},
  {'text': 'Lauschen und abwarten', 'tag': '[Sinne]', 'probe': {'id': 'spuren', 'dc': 13, 'mod': {'dunkel': 2}},
   'erfolg': {'text': 'Ein Mann, allein, erschöpft. Er spricht mit sich selbst – von einer kranken Tochter.', 'folgen': {'flag': ['belauscht']}, 'weiter': 'fremder'},
   'misserfolg': {'text': 'Plötzlich ist es still. Zu still.', 'weiter': 'ueberrascht'}},
  {'text': 'Laut rufen: „Wer ist da?“', 'weiter': 'fremder'}]}
S['ueberrascht'] = {'ort': 'stollen', 'gefahr': True, 'text': 'Aus der Dunkelheit stürzt ein Mann mit erhobener Spitzhacke auf dich zu!', 'optionen': [
  {'text': 'Ausweichen', 'tag': '[Flink]', 'probe': {'id': 'flink', 'dc': 12},
   'erfolg': {'text': 'Die Hacke kracht neben dir in den Fels. „Halt!“, rufst du – der Mann erstarrt.', 'weiter': 'fremder'},
   'misserfolg': {'text': 'Der Stiel trifft dich, bevor er erkennt, dass du kein Räuber bist.', 'folgen': {'gefahr': True}, 'weiter': 'fremder'}},
  {'text': '{bb} stellt sich dazwischen', 'tag': '[{bb}]', 'wenn': {'begleiter': True}, 'weiter': 'fremder', 'ergebnis': '{bb} packt den Stiel der Hacke. Einen Moment ringen beide – dann lässt der Mann los.', 'folgen': {'begleiter_loy': 2, 'begleiter_sym': 2}},
  {'text': 'Die Klinge ziehen', 'tag': '[Waffe]', 'wenn': {'item_eines': ['schwert', 'dolch']}, 'weiter': 'fremder', 'ergebnis': 'Im Licht blitzt Stahl. Der Mann lässt die Hacke sinken.'}]}
S['fremder'] = {'ort': 'stollen', 'text': 'Ein abgemagerter Mann mit Staub im Bart. „Brun“, sagt er. „Bergmann aus Erzklamm. Seit dort die Mine eingestürzt ist, gibt es keine Arbeit. Hier unten glänzt es nach Silber. Meine Tochter ist krank – ohne Silber keine Medizin.“', 'optionen': [
  {'text': 'Lügt er?', 'tag': '[Menschenkenntnis]', 'wenn': {'nicht_flag': 'geprueft'}, 'probe': {'id': 'menschenkenntnis', 'dc': 12},
   'erfolg': {'text': 'Seine Hände zittern, sein Blick nicht. Er sagt die Wahrheit.', 'folgen': {'flag': ['geprueft', 'wahrheit']}, 'weiter': 'fremder'},
   'misserfolg': {'text': 'Du wirst nicht schlau aus ihm.', 'folgen': {'flag': ['geprueft']}, 'weiter': 'fremder'}},
  {'text': 'Schweigen und ihn weiterschürfen lassen', 'weiter': 'einsturz', 'ergebnis': 'Brun sieht dich lange an. „Danke.“ Das Hämmern setzt wieder ein.', 'folgen': {'flag': ['brun_ok'], 'chronik': ['brun_gedeckt', 'Ich habe Brun heimlich in der Mine schürfen lassen.']}},
  {'text': 'Das Silber teilen – halb für ihn, halb für das Dorf', 'weiter': 'einsturz', 'ergebnis': 'Ihr schlagt gemeinsam Erz aus der Wand. Brun lacht zum ersten Mal.', 'folgen': {'flag': ['brun_ok'], 'item_plus': {'silbererz': 1}, 'begleiter_sym': 1, 'chronik': ['brun_geteilt', 'Ich habe mit Brun das Silber in der Mine geteilt.']}},
  {'text': '„Komm mit ins Dorf. Wir brauchen Bergleute – und für deine Tochter finden wir Hilfe.“', 'tag': '[Überreden]', 'probe': {'id': 'ueberreden', 'dc': 12, 'mod': {'belauscht': -2, 'wahrheit': -1}},
   'erfolg': {'text': 'Brun schluckt. „Du meinst das ernst?“ Er nickt langsam. „Ich hole Lene. Dann kommen wir.“', 'folgen': {'flag': ['brun_ok'], 'begleiter_sym': 2, 'chronik': ['brun_eingeladen', 'Ich habe Brun und seine kranke Tochter Lene in unser Dorf eingeladen.'], 'journal': ['brun_kommt', 'Brun will kommen', 'Der Bergmann Brun will mit seiner kranken Tochter Lene in unser Dorf ziehen. Er kennt die Mine wie kein anderer.']}, 'weiter': 'einsturz'},
   'misserfolg': {'text': '„Schöne Worte“, sagt Brun. „Die hab ich schon oft gehört.“', 'folgen': {'flag': ['brun_ok']}, 'weiter': 'einsturz'}},
  {'text': '„Verschwinde. Die Mine gehört unserem Dorf.“', 'tag': '[Einschüchtern]', 'probe': {'id': 'einschuechtern', 'dc': 11},
   'erfolg': {'text': 'Brun weicht zurück, rafft seinen Beutel und geht. Ein paar Brocken Erz bleiben liegen.', 'folgen': {'flag': ['brun_weg'], 'item_plus': {'silbererz': 2}, 'begleiter_sym': -2, 'chronik': ['brun_vertrieben', 'Ich habe Brun aus der Mine gejagt, obwohl seine Tochter krank ist.']}, 'weiter': 'einsturz'},
   'misserfolg': {'text': 'Brun spuckt aus. „Versuch’s doch.“ Im selben Moment bebt der Boden.', 'folgen': {'flag': ['brun_feind'], 'chronik': ['brun_feind', 'Brun, der Bergmann aus Erzklamm, ist nicht gut auf mich zu sprechen.']}, 'weiter': 'einsturz'}}]}
S['einsturz'] = {'ort': 'stollen', 'gefahr': True, 'text': 'Ein dumpfes Grollen. Staub rieselt aus der Decke – dann kracht ein Balken. Der Stollen bricht ein!', 'optionen': [
  {'text': 'Alle zum Ausgang!', 'tag': '[Flink]', 'probe': {'id': 'flink', 'dc': 13, 'mod': {'gesichert': -3, 'dunkel': 2, 'erschoepft': 2}},
   'erfolg': {'text': 'Ihr stürzt ins Freie, hinter euch donnern die Felsen.', 'folgen': {'begleiter_loy': 2}, 'weiter': 'nach_einsturz'},
   'misserfolg': {'text': 'Ein Brocken trifft dich an der Schulter, aber du kommst raus.', 'folgen': {'gefahr': True}, 'weiter': 'nach_einsturz'}},
  {'text': '{bb} soll die Decke abstützen', 'tag': '[{bb}]', 'wenn': {'begleiter_beruf': STARK}, 'probe': {'id': 'anpacken', 'dc': 11, 'mod': {'gesichert': -3}},
   'erfolg': {'text': '{bb} stemmt sich gegen den Balken. „Lauft!“ Ihr schafft es – {bb} zuletzt, mit einem schiefen Grinsen.', 'folgen': {'begleiter_loy': 3, 'begleiter_sym': 4, 'chronik': ['mine_gerettet', 'In der Mine hat {bb} uns alle beim Einsturz gerettet.'], 'notiz': 'Beim Einsturz der Mine hat {bb} die Decke gehalten, bis wir draußen waren. Das vergesse ich nicht.'}, 'weiter': 'nach_einsturz'},
   'misserfolg': {'text': 'Der Balken gibt nach. Ihr kommt raus, aber nicht ohne Blessuren.', 'folgen': {'gefahr': True, 'begleiter_loy': 1}, 'weiter': 'nach_einsturz'}},
  {'text': 'Den Balken selbst stemmen', 'tag': '[Anpacken]', 'probe': {'id': 'anpacken', 'dc': 13, 'mod': {'gesichert': -3}},
   'erfolg': {'text': 'Du hältst den Balken, bis alle draußen sind. Dann lässt du los und springst.', 'folgen': {'begleiter_sym': 4, 'begleiter_loy': 3, 'notiz': 'In der Mine habe ich die Decke gehalten, bis alle draußen waren.'}, 'weiter': 'nach_einsturz'},
   'misserfolg': {'text': 'Der Balken ist zu schwer. Er drückt dich zu Boden, bevor du dich befreist.', 'folgen': {'gefahr': True}, 'weiter': 'nach_einsturz'}},
  {'text': 'Brun mitreißen', 'tag': '[Flink]', 'wenn': {'flag': 'brun_ok'}, 'probe': {'id': 'flink', 'dc': 12, 'mod': {'gesichert': -2}},
   'erfolg': {'text': 'Du packst Brun am Arm. Gemeinsam stolpert ihr ins Licht.', 'folgen': {'flag': ['brun_gerettet'], 'chronik': ['brun_gerettet', 'Ich habe Brun beim Einsturz der Mine das Leben gerettet.']}, 'weiter': 'nach_einsturz'},
   'misserfolg': {'text': 'Ihr kommt beide raus – du mit einer blutenden Stirn.', 'folgen': {'flag': ['brun_gerettet'], 'gefahr': True, 'chronik': ['brun_gerettet', 'Ich habe Brun beim Einsturz der Mine das Leben gerettet.']}, 'weiter': 'nach_einsturz'}}]}
S['nach_einsturz'] = {'ort': 'mine', 'text': 'Draußen legt sich der Staub. Ihr hustet, blinzelt ins Licht, zählt durch – alle da. Und Brun?', 'optionen': [
  {'text': 'Zu Brun gehen', 'wenn': {'flag': 'brun_gerettet'}, 'weiter': 'draussen',
   'ergebnis': 'Brun sitzt auf einem Stein, Staub im Bart, und starrt auf den verschütteten Eingang. Dann nestelt er etwas aus seinem Hemd. „Das wollte ich für Lenes Medizin verkaufen. Aber ohne dich läge ich jetzt da drin.“ Er drückt es dir in die Hand und schließt deine Finger darum. „Ich finde einen anderen Weg. Versprochen.“',
   'folgen': {'beute': {'stufe': 2, 'chance': 1, 'art': 'talisman', 'text': 'Bruns Geschenk:'}, 'chronik': ['brun_dank', 'Brun hat mir nach dem Einsturz etwas geschenkt, das er eigentlich für die Medizin seiner Tochter verkaufen wollte.'], 'journal': ['brun_tochter', 'Bruns Tochter Lene', 'Brun aus Erzklamm braucht Medizin für seine kranke Tochter Lene. Vielleicht kann ich helfen.']}},
  {'text': 'Nach Brun rufen', 'wenn': {'flag': 'brun_ok', 'nicht_flag': 'brun_gerettet'}, 'weiter': 'draussen',
   'ergebnis': 'Lange nichts. Dann Husten, ein Fluch – und aus einem schmalen Nebenschacht kriecht Brun, die Stirn blutig, aber lebendig. Er sieht dich an, nickt einmal und humpelt den Hang hinunter Richtung Erzklamm.',
   'folgen': {'chronik': ['brun_ueberlebt', 'Brun hat den Einsturz der Mine überlebt und ist nach Erzklamm zurückgehumpelt.'], 'journal': ['brun_tochter', 'Bruns Tochter Lene', 'Brun aus Erzklamm braucht Medizin für seine kranke Tochter Lene.']}},
  {'text': 'Nach Brun sehen', 'wenn': {'flag': 'brun_feind'}, 'weiter': 'draussen',
   'ergebnis': 'Von Brun keine Spur. Ob er es durch einen anderen Schacht hinausgeschafft hat oder unter den Felsen liegt, wirst du heute nicht erfahren.',
   'folgen': {'chronik': ['brun_verschollen', 'Seit dem Einsturz der Mine weiß niemand, was aus Brun geworden ist.']}},
  {'text': 'Durchatmen', 'wenn': {'flag': 'brun_weg'}, 'weiter': 'draussen',
   'ergebnis': 'Brun war längst fort, als die Decke kam. Vielleicht war das sein Glück. Vielleicht deins.'}]}
S['draussen'] = {'ort': 'wald', 'text': 'Draußen. Staub, Sonnenlicht, Vogelgezwitscher. Hinter euch ist der Stollen verschüttet – vorerst. Ihr macht euch auf den Heimweg.', 'reise': {'minuten': 1, 'weiter': 'lagerfeuer'}}
S['lagerfeuer'] = {'ort': 'feuer', 'text': 'Am Abend sitzt du {mit} am Feuer am Waldrand. Die Funken steigen in den Nachthimmel.', 'optionen': [
  {'text': '„Danke dir, {b1}. Ohne dich hätte ich das nicht geschafft.“', 'tag': '[{b1}]', 'wenn': {'begleiter': True}, 'weiter': 'ende', 'ergebnis': '{b1} schaut ins Feuer. „Für dich doch.“ Es ist ein stilles, gutes Schweigen.', 'folgen': {'begleiter_sym': 5, 'begleiter_loy': 2, 'notiz': 'Am Lagerfeuer nach der Mine habe ich {b1} gedankt. Ein guter Moment.'}},
  {'text': '„Erzähl mir etwas, das sonst keiner über dich weiß, {b1}.“', 'tag': '[{b1}]', 'wenn': {'begleiter': True}, 'weiter': 'ende', 'ergebnis': '{b1} zögert. Dann erzählt {b1} leise von früher, von Dingen, über die im Dorf niemand spricht. Zwischen euch ist etwas gewachsen.', 'folgen': {'begleiter_sym': 4, 'begleiter_loy': 3, 'notiz': 'Am Lagerfeuer nach der Mine hat sich {b1} mir geöffnet. Ich glaube, wir sind uns nähergekommen.'}},
  {'text': 'In die Sterne schauen und an Brun denken', 'wenn': {'flag': 'brun_ok'}, 'weiter': 'ende', 'ergebnis': 'Ob er es nach Hause geschafft hat? Ob seine Tochter gesund wird?'},
  {'text': 'Das Erz im Feuerschein betrachten und Pläne schmieden', 'wenn': {'item': 'silbererz'}, 'weiter': 'ende', 'ergebnis': 'Silber. Wenn dort mehr davon liegt, könnte das Dorf reich werden – oder gierig.'},
  {'text': 'Schlafen', 'weiter': 'ende'}]}
S['ende'] = {'ort': 'feuer', 'ende': True, 'text': 'Die verlassene Mine – vorerst abgeschlossen. Was du dort getan hast, wird man sich erzählen.', 'folgen': {'chronik': ['mine_besucht', 'Ich war in der verlassenen Mine am alten Pass.']}}
open('/home/claude/footstep-repo/quests/mine.json', 'w').write(json.dumps({'start': 'aufbruch', 'szenen': S}, ensure_ascii=False))
print(len(json.dumps({'start': 'aufbruch', 'szenen': S}, ensure_ascii=False)))
