# Weitere Brett-Vorlagen (Teil 2). Gleiche Regeln wie brett.py.
# Zusätzlicher Folgen-Schlüssel "dorf": wirkt auf das Dorf (nahrung, holz, stein, waren, stimmung – kleine Beträge).
# "zuzug": True → ein Wanderer aus der Gegend zieht ins Dorf (wenn Platz ist).
V2 = []

# ───────────── Leicht ─────────────
V2.append(dict(id='ziege', titel='Die Ziege im Hang', schwierigkeit=1,
  kurz='Die beste Milchziege von {A} ist ausgebüxt und meckert irgendwo oben am Felshang.',
  rollen={'A': 'Besitzer der Ziege', 'B': 'Nachbar mit offenem Gatter'},
  start='auftrag', szenen={
  'auftrag': dict(ort='dorf', text='{A} rennt dir entgegen, einen Strick in der Hand. „Hörst du das? Das ist Flocke. Irgendwer hat das Gatter offen gelassen, und jetzt hängt sie da oben im Hang fest.“', optionen=[
    dict(text='„Ich hole sie.“', weiter='hang'),
    dict(text='„Wessen Gatter war offen?“', weiter='hang', ergebnis='{A} zuckt die Schultern. „Das von {B}, glaube ich. Aber erst die Ziege.“', folgen=dict(flag=['gatter']))]),
  'hang': dict(ort='wald', text='Flocke steht auf einem schmalen Absatz, unter ihr Geröll. Sie meckert empört, als wäre alles deine Schuld.', optionen=[
    dict(text='Hinaufklettern', tag='[Flink]', probe=dict(id='flink', dc=10),
      erfolg=dict(text='Griff um Griff kletterst du hinauf und legst ihr den Strick um den Hals.', weiter='zurueck'),
      misserfolg=dict(text='Ein Stein bricht weg, du rutschst ein Stück ab und schürfst dir die Hände auf. Beim zweiten Versuch klappt es.', weiter='zurueck')),
    dict(text='Mit dem Seil von oben sichern', tag='[Seil]', wenn=dict(item='seil'), weiter='zurueck', ergebnis='Du knotest das Seil um eine Kiefer und lässt dich sicher hinab. Flocke lässt sich ohne Murren hochziehen.'),
    dict(text='Sie mit einer Handvoll Klee herunterlocken', tag='[Beruhigen]', probe=dict(id='beruhigen', dc=11),
      erfolg=dict(text='Flocke beäugt den Klee, dann dich, dann wieder den Klee. Schließlich hüpft sie Absatz für Absatz herunter.', weiter='zurueck'),
      misserfolg=dict(text='Flocke frisst lieber den Ginster neben sich. Du musst doch klettern – und kommst mit zerkratzten Armen zurück.', weiter='zurueck'))]),
  'zurueck': dict(ort='dorf', text='{A} drückt Flocke an sich, als wäre sie ein Kind. Hinter dem Zaun steht {B} und tut sehr beschäftigt.', optionen=[
    dict(text='{B} auf das Gatter ansprechen', wenn=dict(flag='gatter'), weiter='ende',
      ergebnis='{B} wird rot. „Ich war in Gedanken. Es tut mir leid.“ {B} verspricht {A} einen Krug Milch von den eigenen Tieren – und repariert das Gatter noch am selben Abend.',
      folgen=dict(sym={'A': 3, 'B': 1}, merkt={'B': '{held} hat mich auf das offene Gatter angesprochen, ohne Lärm darum zu machen.'})),
    dict(text='Nichts sagen – die Ziege ist ja zurück', weiter='ende', folgen=dict(sym={'A': 3, 'B': 2}, merkt={'A': '{held} hat Flocke aus dem Hang geholt.'})),
    dict(text='Laut verkünden, dass {B} schuld war', weiter='ende', ergebnis='Ein paar Leute drehen sich um. {B} murmelt etwas und verschwindet im Haus.',
      folgen=dict(sym={'A': 3, 'B': -4}, merkt={'B': '{held} hat mich wegen eines Gatters vor allen bloßgestellt.'}))]),
  'ende': dict(ort='dorf', ende=True, text='Am Abend steht ein kleiner Krug frische Ziegenmilch vor deiner Tür.', folgen=dict(dorf={'nahrung': 4}, beute=dict(stufe=1, chance=0.3, text='Unter dem Krug liegt etwas, das {A} wohl lange aufbewahrt hat.'))),
}))

V2.append(dict(id='kraeuter', titel='Kräuter vor dem Frost', schwierigkeit=1,
  kurz='{A} will vor dem ersten Frost Heilkräuter am Waldsaum sammeln und hätte gern Begleitung.',
  rollen={'A': 'Sammler', 'B': 'Wer krank im Bett liegt'},
  start='auftrag', szenen={
  'auftrag': dict(ort='dorf', text='{A} hat zwei Körbe dabei. „{B} hustet seit Tagen. Am Waldsaum wächst Lungenkraut und Weidenrinde gibt es am Bach. Kommst du mit? Allein dauert es ewig.“', optionen=[
    dict(text='Mitgehen', weiter='weg')]),
  'weg': dict(ort='wald', text='Der Waldsaum liegt still im Morgendunst. Spinnweben glitzern zwischen den Farnen.', reise=dict(minuten=1, weiter='lichtung', begegnung=dict(chance=0.35, szenen=['b_kaeuzchen']))),
  'b_kaeuzchen': dict(ort='wald', text='Ein junger Waldkauz sitzt am Boden, ein Flügel hängt schief. Er faucht dich an.', optionen=[
    dict(text='Den Flügel schienen', tag='[Heilkunde]', probe=dict(id='heilkunde', dc=11),
      erfolg=dict(text='Mit zwei Zweigen und einem Streifen Stoff richtest du den Flügel. Der Kauz hüpft ins Gebüsch und sieht dir nach.', folgen=dict(sym={'A': 2}, notiz='Wir haben unterwegs einen verletzten Waldkauz versorgt.'), weiter='lichtung'),
      misserfolg=dict(text='Er hackt dir in den Finger und flattert ungeschickt davon. Vielleicht schafft er es.', weiter='lichtung')),
    dict(text='Weitergehen – der Wald kümmert sich um seine Tiere', weiter='lichtung')]),
  'lichtung': dict(ort='wald', text='Am Saum wachsen zwei Pflanzen dicht beieinander, beide mit gefleckten Blättern. Eine davon ist Lungenkraut. Die andere sieht fast gleich aus.', optionen=[
    dict(text='Die Pflanzen genau unterscheiden', tag='[Heilkunde]', probe=dict(id='heilkunde', dc=11),
      erfolg=dict(text='Die echten Blätter sind rau wie eine Katzenzunge. Du sammelst nur die richtigen.', folgen=dict(flag=['richtig']), weiter='bach'),
      misserfolg=dict(text='Du bist dir nicht sicher und sammelst von beiden.', folgen=dict(flag=['gemischt']), weiter='bach')),
    dict(text='{A} entscheiden lassen', weiter='bach', ergebnis='{A} pflückt flink und sicher. „Rau wie eine Katzenzunge – das ist das richtige.“', folgen=dict(flag=['richtig']))]),
  'bach': dict(ort='wald', text='Am Bach schneidest du Weidenrinde. Auf dem Rückweg wird es kühl, der Atem dampft.', optionen=[
    dict(text='Zurück ins Dorf', weiter='heim')]),
  'heim': dict(ort='dorf', text='{A} kocht aus den Kräutern einen bitteren Sud für {B}.', optionen=[
    dict(text='Den Sud vorher selbst prüfen', wenn=dict(flag='gemischt'), tag='[Heilkunde]', probe=dict(id='heilkunde', dc=10),
      erfolg=dict(text='Du riechst es sofort: Ein paar falsche Blätter sind dabei. Ihr kocht neu, diesmal sauber.', weiter='ende_gut'),
      misserfolg=dict(text='Riecht bitter. Aber das soll so sein, oder?', weiter='ende_bauch')),
    dict(text='Den Sud bringen', wenn=dict(flag='gemischt'), weiter='ende_bauch'),
    dict(text='Den Sud bringen', wenn=dict(flag='richtig'), weiter='ende_gut')]),
  'ende_gut': dict(ort='dorf', ende=True, text='Zwei Tage später hustet {B} kaum noch und winkt dir vom Fenster aus zu. {A} hängt die übrigen Kräuter zum Trocknen unters Dach – genug für den ganzen Winter.',
    folgen=dict(sym={'A': 3, 'B': 4}, merkt={'B': '{held} hat mit {A} Kräuter für mich gesammelt, als ich krank war.'}, dorf={'stimmung': 2}, beute=dict(stufe=1, chance=0.25, text='{B} besteht darauf, dir etwas zu schenken.'))),
  'ende_bauch': dict(ort='dorf', ende=True, text='{B} hat eine Nacht lang Bauchkrämpfe – dann hilft der Sud doch noch. {A} sagt nichts, sammelt am nächsten Tag aber allein nach.',
    folgen=dict(sym={'A': 1, 'B': 1}, merkt={'B': '{held} hat mir Kräuter gebracht. Mein Bauch hat es mir nicht gedankt.'})),
}))

V2.append(dict(id='brunnen', titel='Der trübe Brunnen', schwierigkeit=1,
  kurz='Das Wasser im Dorfbrunnen schmeckt seit Tagen faulig. {A} bittet dich, der Sache auf den Grund zu gehen.',
  rollen={'A': 'Wer es bemerkt hat', 'B': 'Wer oben am Bach arbeitet'},
  start='auftrag', szenen={
  'auftrag': dict(ort='dorf', text='{A} hält dir einen Becher hin. Das Wasser ist leicht trüb und riecht nach nassem Laub und etwas Schlimmerem. „Der Brunnen wird vom Bach gespeist. Irgendwas stimmt oben nicht.“', optionen=[
    dict(text='Den Bach hinaufgehen', weiter='bach'),
    dict(text='Erst in den Brunnen hinabsteigen', tag='[Flink]', probe=dict(id='flink', dc=10),
      erfolg=dict(text='Unten ist das Wasser klar, wo es aus dem Rohr kommt – das Übel kommt also von oben.', folgen=dict(flag=['oben']), weiter='bach'),
      misserfolg=dict(text='Du rutschst ab und landest knietief im kalten Wasser. Gelernt hast du nur, dass es kalt ist.', weiter='bach'))]),
  'bach': dict(ort='wald', text='Ein Stück oberhalb des Dorfes staut sich der Bach. Dort liegt ein verendeter Hirsch halb im Wasser. Und noch weiter oben, wo {B} arbeitet, schwimmt ein bräunlicher Film.', optionen=[
    dict(text='Den Hirsch untersuchen', tag='[Spuren lesen]', probe=dict(id='spuren', dc=11),
      erfolg=dict(text='Eine Wunde am Hals, verheilt – er ist alt und krank gestorben, nicht erlegt. Aber er liegt seit Tagen da.', folgen=dict(flag=['hirsch']), weiter='entscheidung'),
      misserfolg=dict(text='Ein toter Hirsch. Mehr kannst du nicht sagen.', folgen=dict(flag=['hirsch']), weiter='entscheidung')),
    dict(text='Zu {B} hinaufgehen', weiter='b_gespraech')]),
  'b_gespraech': dict(ort='wald', text='{B} spült gerade Bottiche im Bach aus. „Ich mache das seit Jahren so. Das Wasser nimmt alles mit.“', optionen=[
    dict(text='„Das Dorf trinkt dieses Wasser.“', tag='[Überreden]', probe=dict(id='ueberreden', dc=11),
      erfolg=dict(text='{B} hält inne. „Daran hab ich nie gedacht. Ich grabe eine Grube hinter dem Haus.“', folgen=dict(flag=['b_einsicht'], sym={'B': 1}), weiter='entscheidung'),
      misserfolg=dict(text='„Ach was. Das bisschen.“', weiter='entscheidung')),
    dict(text='Zurück zum Hirsch', weiter='entscheidung')]),
  'entscheidung': dict(ort='wald', text='Der Hirsch muss aus dem Wasser – und eigentlich auch der Rest.', optionen=[
    dict(text='Den Hirsch selbst herausziehen', tag='[Anpacken]', probe=dict(id='anpacken', dc=11),
      erfolg=dict(text='Mit einem Ruck ziehst du das schwere Tier ans Ufer und bedeckst es mit Ästen. Der Füchse wegen.', weiter='ende'),
      misserfolg=dict(text='Zu schwer. Du holst Hilfe aus dem Dorf, und zu dritt schafft ihr es bis zum Abend.', weiter='ende')),
    dict(text='Die Leute im Dorf zusammenrufen', weiter='ende', ergebnis='Ein halbes Dutzend Leute kommt mit Seilen. Zusammen ist der Hirsch schnell aus dem Wasser.', folgen=dict(dorf={'stimmung': 1}))]),
  'ende': dict(ort='dorf', ende=True, text='Nach zwei Tagen ist das Wasser wieder klar. {A} trinkt den ersten Becher demonstrativ vor allen aus.',
    folgen=dict(sym={'A': 3}, merkt={'A': '{held} hat herausgefunden, warum unser Brunnen faulig war.'}, chronik=['brett_brunnen', 'Ich habe den Brunnen des Dorfes wieder sauber bekommen.'], dorf={'stimmung': 2})),
}))

V2.append(dict(id='waage', titel='Die falsche Waage', schwierigkeit=1,
  kurz='Ein fahrender Händler hat {A} beim Tausch übers Ohr gehauen, glaubt {A}. Er lagert noch am Dorfrand.',
  rollen={'A': 'Wer betrogen wurde', 'B': 'Wer gern handelt'},
  start='auftrag', szenen={
  'auftrag': dict(ort='dorf', text='{A} schüttet dir einen Beutel getrockneter Bohnen vor die Füße. „Für zwei Krüge Honig hat er mir das gegeben. Er sagt, es sind fünf Pfund. Das sind höchstens drei!“', optionen=[
    dict(text='Zum Händler gehen', weiter='lager')]),
  'lager': dict(ort='dorf', text='Der Händler sitzt am Feuer, eine Waage mit Messingschalen neben sich. „Beschwerden? Meine Waage lügt nicht, Freund.“', optionen=[
    dict(text='Die Waage heimlich prüfen', tag='[Flink]', probe=dict(id='flink', dc=11),
      erfolg=dict(text='Unter einer Schale klebt ein Klumpen Wachs mit eingedrückten Kieseln. Klug gemacht.', folgen=dict(flag=['beweis']), weiter='stellen'),
      misserfolg=dict(text='Er bemerkt deine Hand und zieht die Waage zu sich. „Finger weg.“', folgen=dict(flag=['gewarnt']), weiter='stellen')),
    dict(text='Ihm in die Augen sehen', tag='[Menschenkenntnis]', probe=dict(id='menschenkenntnis', dc=11),
      erfolg=dict(text='Sein Lächeln reicht nicht bis zu den Augen. Er weiß genau, was er getan hat.', folgen=dict(flag=['sicher']), weiter='stellen'),
      misserfolg=dict(text='Er wirkt wie ein ehrlicher Kerl. Vielleicht hat sich {A} verzählt?', weiter='stellen')),
    dict(text='{B} holen, die oder der kennt sich mit Gewichten aus', weiter='stellen', ergebnis='{B} hebt den Bohnensack prüfend an. „Drei Pfund. Großzügig gerechnet.“', folgen=dict(flag=['zeuge'], sym={'B': 1}))]),
  'stellen': dict(ort='dorf', text='Der Händler packt schon langsam zusammen.', optionen=[
    dict(text='Das Wachs vor allen zeigen', wenn=dict(flag='beweis'), weiter='ende_gut', ergebnis='Ein paar Leute treten näher. Der Händler hebt die Hände. „Schon gut, schon gut.“ Er legt {A} zwei Säcke dazu – und einen dritten, damit niemand weitererzählt, was er gesehen hat.'),
    dict(text='Auf einen fairen Ausgleich bestehen', tag='[Feilschen]', probe=dict(id='feilschen', dc=13, mod=dict(zeuge=-2, sicher=-1, gewarnt=2)),
      erfolg=dict(text='Er seufzt theatralisch. „Für den Frieden.“ {A} bekommt den fehlenden Sack – und du einen guten Rat für den nächsten Markt.', weiter='ende_gut'),
      misserfolg=dict(text='„Ich habe nichts falsch gemacht.“ Er spannt an und zieht davon.', weiter='ende_weg')),
    dict(text='Ihn einschüchtern', tag='[Einschüchtern]', probe=dict(id='einschuechtern', dc=12),
      erfolg=dict(text='Er sieht deine Schultern, dann sein Messer, dann wieder deine Schultern. Er zahlt.', folgen=dict(dorf={'stimmung': -1}), weiter='ende_gut'),
      misserfolg=dict(text='Er lacht dich aus und fährt davon. Einige im Dorf finden, du hast dich lächerlich gemacht.', weiter='ende_weg'))]),
  'ende_gut': dict(ort='dorf', ende=True, text='{A} hat bekommen, was {A} zusteht. Und der Händler wird sich gut überlegen, ob er hier noch einmal so handelt.',
    folgen=dict(sym={'A': 4}, merkt={'A': '{held} hat dafür gesorgt, dass der Händler mich nicht betrügt.'}, dorf={'nahrung': 6, 'waren': 2}, beute=dict(stufe=1, chance=0.35, text='Beim Abfahren wirft dir der Händler zähneknirschend etwas aus seinem Karren zu. „Damit wir quitt sind.“'))),
  'ende_weg': dict(ort='dorf', ende=True, text='Der Karren verschwindet hinter der Biegung. {A} klopft dir trotzdem auf die Schulter. „Du hast es versucht.“', folgen=dict(sym={'A': 1})),
}))

V2.append(dict(id='fest', titel='Wer führt den Erntetanz?', schwierigkeit=1,
  kurz='Zum Erntefest wollen {A} und {B} beide den ersten Tanz anführen. Das Dorf bittet dich, es zu klären.',
  rollen={'A': 'Tänzer', 'B': 'Tänzer', 'C': 'Wer die alten Lieder kennt'},
  start='streit', szenen={
  'streit': dict(ort='dorf', text='Der Platz ist mit Laub und Bändern geschmückt. {A} und {B} stehen sich gegenüber. „Ich führe seit drei Jahren!“ – „Eben deshalb ist es Zeit für jemand anderen!“', optionen=[
    dict(text='Beide erzählen lassen, warum es ihnen wichtig ist', tag='[Menschenkenntnis]', probe=dict(id='menschenkenntnis', dc=10),
      erfolg=dict(text='{A} geht es um Stolz. {B} geht es um etwas anderes: Die Eltern von {B} haben den Tanz früher geführt – und sind im letzten Winter gestorben.', folgen=dict(flag=['grund']), weiter='alte'),
      misserfolg=dict(text='Beide reden gleichzeitig. Du verstehst nur „Tradition“ und „ungerecht“.', weiter='alte')),
    dict(text='{C} nach dem alten Brauch fragen', weiter='alte')]),
  'alte': dict(ort='dorf', text='{C} lehnt sich zurück. „Früher gab es zwei Tänze. Einen für die Ernte und einen für die, die nicht mehr da sind. Den zweiten hat man irgendwann vergessen.“', optionen=[
    dict(text='„Dann gibt es dieses Jahr wieder zwei Tänze.“', weiter='ende_zwei', folgen=dict(flag=['zwei'])),
    dict(text='{A} soll führen – wer es kann, soll es tun', weiter='ende_a'),
    dict(text='{B} soll führen', wenn=dict(flag='grund'), weiter='ende_b')]),
  'ende_zwei': dict(ort='dorf', ende=True, text='Als die Fackeln brennen, führt {A} den Erntetanz – laut, wild, alle lachen. Später, als es still wird, führt {B} den alten Tanz. Niemand spricht dabei. Einige weinen.',
    folgen=dict(sym={'A': 2, 'B': 4, 'C': 3}, merkt={'B': '{held} hat dafür gesorgt, dass wir den alten Tanz für meine Eltern tanzen konnten.', 'C': '{held} hat einen vergessenen Brauch wieder lebendig gemacht.'}, chronik=['brett_fest_zwei', 'Beim Erntefest gab es auf meinen Vorschlag wieder zwei Tänze – auch einen für die Toten.'], dorf={'stimmung': 5})),
  'ende_a': dict(ort='dorf', ende=True, text='{A} führt den Tanz, und es wird ein schönes Fest. {B} tanzt mit – aber geht früh nach Hause.', folgen=dict(sym={'A': 3, 'B': -2}, dorf={'stimmung': 2})),
  'ende_b': dict(ort='dorf', ende=True, text='{B} führt den Tanz, unsicher erst, dann mit erhobenem Kopf. {A} schmollt eine Weile – und klatscht am Ende doch am lautesten.', folgen=dict(sym={'A': -1, 'B': 4}, merkt={'B': '{held} hat mich den Erntetanz führen lassen.'}, dorf={'stimmung': 3})),
}))

# ───────────── Mittel ─────────────
V2.append(dict(id='woelfe', titel='Spuren am Pferch', schwierigkeit=2,
  kurz='Zweimal in einer Woche wurden Schafe von {A} gerissen. {A} will die Wölfe tot sehen, {B} warnt davor.',
  rollen={'A': 'Wer Schafe verloren hat', 'B': 'Wer den Wald kennt', 'C': 'Wer die Fallen stellt'},
  start='pferch', szenen={
  'pferch': dict(ort='dorf', text='Am Pferch liegen Wollbüschel im Gras. {A} ist außer sich. „Zwei Lämmer! Ich will, dass jemand diese Bestien erledigt.“ {B} schüttelt den Kopf. „Seit oben am Hang gerodet wird, finden die Wölfe kein Wild mehr. Töte das Rudel, und das nächste kommt.“', optionen=[
    dict(text='Den Spuren in den Wald folgen', tag='[Spuren lesen]', probe=dict(id='spuren', dc=12),
      erfolg=dict(text='Die Spuren sind ungleich – ein Tier zieht ein Bein nach. Ein verletzter Wolf jagt, was er kriegen kann.', folgen=dict(flag=['lahm']), weiter='wald'),
      misserfolg=dict(text='Im Laub verlierst du die Fährte, findest sie aber am Bach wieder.', weiter='wald')),
    dict(text='{B} um Rat fragen', weiter='wald', ergebnis='„Such nach dem, was nicht ins Bild passt“, sagt {B}. „Ein gesundes Rudel holt sich keine Lämmer aus einem Pferch am Dorf.“', folgen=dict(flag=['rat']))]),
  'wald': dict(ort='wald', text='Unter einem umgestürzten Baum liegt eine Wölfin. Ihr Hinterlauf steckt noch in einem rostigen Tellereisen. Hinter ihr, im Dunkel, bewegen sich zwei kleine Schatten.', gefahr=True, optionen=[
    dict(text='Langsam näher gehen und das Eisen öffnen', tag='[Beruhigen]', probe=dict(id='beruhigen', dc=13),
      erfolg=dict(text='Sie knurrt, aber sie lässt dich. Mit einem Ächzen springt das Eisen auf. Die Wölfin humpelt mit ihren Jungen tiefer in den Wald – weg vom Dorf.', folgen=dict(flag=['befreit']), weiter='eisen'),
      misserfolg=dict(text='Sie schnappt zu. Ihre Zähne streifen deinen Arm. Du weichst zurück, das Eisen bleibt zu.', folgen=dict(gefahr=1), weiter='entscheidung')),
    dict(text='Den Jungen etwas Fleisch hinwerfen und warten', weiter='entscheidung', ergebnis='Die Kleinen schlingen. Die Wölfin beobachtet dich, ohne den Blick abzuwenden.'),
    dict(text='Zurück ins Dorf und berichten', weiter='entscheidung')]),
  'entscheidung': dict(ort='wald', text='Die Wölfin wird so nicht jagen können – außer Lämmer in einem Pferch.', optionen=[
    dict(text='Sie mit dem Bogen erlösen', tag='[Bogen]', wenn=dict(item='bogen'), weiter='eisen', ergebnis='Ein Pfeil, schnell und sauber. Die Jungen fliehen ins Unterholz.', folgen=dict(flag=['getoetet'])),
    dict(text='Ein zweiter Versuch mit dem Eisen – mit Hilfe von {B}', tag='[Anpacken]', probe=dict(id='anpacken', dc=12, mod=dict(rat=-2)),
      erfolg=dict(text='{B} hält einen Mantel vor ihren Kopf, du stemmst das Eisen auf. Sie verschwindet mit den Jungen.', folgen=dict(flag=['befreit'], sym={'B': 3}), weiter='eisen'),
      misserfolg=dict(text='Das Eisen ist zu verrostet. Ihr geht ohne sie.', weiter='eisen')),
    dict(text='Sie liegen lassen', weiter='eisen')]),
  'eisen': dict(ort='wald', text='Das Tellereisen trägt ein Zeichen, eingeschlagen ins Metall. Es gehört {C} – und Tellereisen hatte das Dorf eigentlich verboten.', optionen=[
    dict(text='{C} zur Rede stellen', weiter='c_rede'),
    dict(text='Das Eisen verschwinden lassen und schweigen', weiter='schluss', folgen=dict(flag=['geschwiegen'], merkt={'C': '{held} hat mein Eisen gefunden – und nichts gesagt.'}, sym={'C': 3}))]),
  'c_rede': dict(ort='dorf', text='{C} verschränkt die Arme. „Ja, das ist meins. Die Füchse holen mir die Hühner. Was soll ich denn tun?“', optionen=[
    dict(text='„Bau einen Zaun. Ich helfe dir dabei.“', tag='[Überreden]', probe=dict(id='ueberreden', dc=12),
      erfolg=dict(text='{C} brummt. „Na gut. Aber du schleppst die Pfähle.“ Am Abend steht ein Zaun – und alle Eisen liegen in der Schmiede.', folgen=dict(sym={'C': 2}, flag=['zaun'], dorf={'holz': -3}), weiter='schluss'),
      misserfolg=dict(text='„Spar dir deine Ratschläge.“', folgen=dict(sym={'C': -2}), weiter='schluss')),
    dict(text='Es vor dem ganzen Dorf ansprechen', weiter='schluss', ergebnis='Alle Eisen werden eingesammelt. {C} redet eine Woche lang kein Wort mit dir.', folgen=dict(sym={'C': -5, 'B': 2}, merkt={'C': '{held} hat mich wegen der Fallen vor allen angeprangert.'}))]),
  'schluss': dict(ort='dorf', text='Zurück am Pferch wartet {A}. „Und? Sind sie tot?“', optionen=[
    dict(text='„Die Wölfin ist frei und zieht weiter. Es wird keine Lämmer mehr kosten.“', wenn=dict(flag='befreit'), weiter='ende',
      ergebnis='{A} sieht dich lange an. „Wenn noch ein Lamm fehlt, bist du schuld.“ Aber es fehlt keines mehr.',
      folgen=dict(sym={'A': 1, 'B': 5}, merkt={'B': '{held} hat die Wölfin aus dem Eisen befreit. Der Wald vergisst so etwas nicht.'}, chronik=['brett_woelfe_frei', 'Ich habe eine Wölfin aus einem Tellereisen befreit, statt sie zu töten.'], beute=dict(stufe=2, chance=0.5, text='Ein paar Tage später legt dir {B} etwas vor die Tür. „Für jemanden, der zuhört, wenn der Wald redet.“'))),
    dict(text='„Es ist vorbei. Sie hat nicht mehr gelitten.“', wenn=dict(flag='getoetet'), weiter='ende',
      folgen=dict(sym={'A': 4, 'B': -1}, merkt={'A': '{held} hat das Tier erledigt, das meine Lämmer gerissen hat.'}, chronik=['brett_woelfe_tot', 'Ich habe eine verletzte Wölfin erlöst, die Lämmer gerissen hat.'])),
    dict(text='„Ich konnte nichts tun. Bau den Pferch höher.“', wenn=dict(nicht_flag='befreit'), weiter='ende',
      ergebnis='{A} flucht – aber am nächsten Morgen schleppt {A} Pfähle für einen höheren Zaun.', folgen=dict(sym={'A': -1}, dorf={'nahrung': -4}))]),
  'ende': dict(ort='dorf', ende=True, text='Nachts heulen weit oben im Wald die Wölfe. Diesmal klingt es nicht nach einer Drohung.'),
}))

V2.append(dict(id='verlobung', titel='Ein Versprechen im Geheimen', schwierigkeit=2,
  kurz='{A} und {B} wollen heiraten – doch {C} ist strikt dagegen. {A} bittet dich um Hilfe.',
  rollen={'A': 'Verliebte Person', 'B': 'Verliebte Person', 'C': 'Wer dagegen ist'},
  start='bitte', szenen={
  'bitte': dict(ort='dorf', text='{A} zieht dich hinter die Scheune. „{B} und ich wollen zum Frühjahr heiraten. Aber {C} hat gedroht, uns das Leben schwer zu machen, wenn wir es wagen. Ich weiß nicht, warum. Kannst du mit {C} reden?“', optionen=[
    dict(text='„Ich rede mit {C}.“', weiter='c_haus'),
    dict(text='„Warum ist {C} so dagegen?“', tag='[Menschenkenntnis]', probe=dict(id='menschenkenntnis', dc=12),
      erfolg=dict(text='{A} zögert. „Früher war {C} selbst verlobt. Mit jemandem aus meiner Familie. Es endete schlecht.“', folgen=dict(flag=['vergangenheit']), weiter='c_haus'),
      misserfolg=dict(text='„Ich weiß es wirklich nicht.“', weiter='c_haus'))]),
  'c_haus': dict(ort='dorf', text='{C} schält Rüben und sieht nicht auf. „Wenn du wegen der zwei kommst: nein. Aus dieser Familie kommt nur Kummer.“', optionen=[
    dict(text='„Was ist damals passiert?“', wenn=dict(flag='vergangenheit'), weiter='geschichte'),
    dict(text='„Die beiden lieben sich. Was hast du davon, es zu verhindern?“', tag='[Überreden]', probe=dict(id='ueberreden', dc=14),
      erfolg=dict(text='{C} legt das Messer hin. „Nichts. Vermutlich nichts.“ Ein langes Schweigen. „Lass mich nachdenken.“', folgen=dict(flag=['nachdenken']), weiter='entscheidung'),
      misserfolg=dict(text='„Raus aus meinem Haus.“', folgen=dict(sym={'C': -2}), weiter='entscheidung')),
    dict(text='„Wenn du ihnen schadest, bekommst du es mit mir zu tun.“', tag='[Einschüchtern]', probe=dict(id='einschuechtern', dc=13),
      erfolg=dict(text='{C} wird bleich. „Schon gut. Sollen sie doch.“ Aber in den Augen von {C} liegt etwas Bitteres.', folgen=dict(flag=['gedroht'], sym={'C': -4}), weiter='entscheidung'),
      misserfolg=dict(text='{C} lacht kalt. „Du bist nicht der Erste, der mir droht.“', folgen=dict(sym={'C': -3}), weiter='entscheidung'))]),
  'geschichte': dict(ort='dorf', text='{C} schweigt lange. Dann: „Wir wollten heiraten. Eine Woche vorher war er weg. Hat nicht einmal einen Brief dagelassen. Seine Familie hat so getan, als wäre ich nie gewesen.“', optionen=[
    dict(text='„Das war nicht {A}. Lass {A} nicht dafür bezahlen.“', tag='[Beruhigen]', probe=dict(id='beruhigen', dc=11),
      erfolg=dict(text='{C} wischt sich über die Augen. „Du hast recht. Verdammt, du hast recht.“', folgen=dict(flag=['versoehnt']), weiter='entscheidung'),
      misserfolg=dict(text='„Das sagst du so leicht.“ Aber {C} wirkt nachdenklich.', folgen=dict(flag=['nachdenken']), weiter='entscheidung'))]),
  'entscheidung': dict(ort='dorf', text='Am Abend wartet {A} mit {B} am Dorfbrunnen.', optionen=[
    dict(text='„{C} wird euch nichts in den Weg legen.“', wenn=dict(flag='versoehnt'), weiter='ende_fest',
      ergebnis='Zum Fest im Frühjahr kommt {C} als Erste und bringt einen Laib Honigbrot. Niemand fragt, warum {C} dabei die Hand von {A} so lange hält.'),
    dict(text='„{C} denkt darüber nach. Gebt ihr Zeit.“', wenn=dict(flag='nachdenken'), weiter='ende_zeit'),
    dict(text='„{C} hat nachgegeben. Fragt nicht, wie.“', wenn=dict(flag='gedroht'), weiter='ende_kalt'),
    dict(text='„Heiratet trotzdem. Es ist euer Leben.“', weiter='ende_trotz')]),
  'ende_fest': dict(ort='dorf', ende=True, text='Die Hochzeit wird das schönste Fest seit Jahren.',
    folgen=dict(sym={'A': 5, 'B': 5, 'C': 4}, merkt={'A': '{held} hat dafür gesorgt, dass {B} und ich heiraten können.', 'C': '{held} hat mir zugehört, als ich die alte Geschichte erzählt habe.'}, chronik=['brett_hochzeit', 'Ich habe {C} mit der Familie von {A} versöhnt. {A} und {B} heiraten.'], dorf={'stimmung': 6}, beute=dict(stufe=2, chance=0.6, text='Nach der Hochzeit drückt dir {A} ein Geschenk in die Hand. „Ohne dich hätten wir das nicht geschafft.“'))),
  'ende_zeit': dict(ort='dorf', ende=True, text='Ein paar Wochen später sieht man {C} mit {B} reden. Höflich, vorsichtig. Es ist ein Anfang.', folgen=dict(sym={'A': 3, 'B': 2, 'C': 1}, dorf={'stimmung': 2})),
  'ende_kalt': dict(ort='dorf', ende=True, text='Die Hochzeit findet statt. {C} bleibt ihr fern und grüßt dich seitdem nicht mehr.', folgen=dict(sym={'A': 3, 'B': 3}, merkt={'C': '{held} hat mir gedroht, damit diese Hochzeit stattfindet.'}, dorf={'stimmung': 1})),
  'ende_trotz': dict(ort='dorf', ende=True, text='{A} und {B} heiraten still, nur mit ein paar Freunden. {C} schlägt am Tag danach die Tür so laut zu, dass es das ganze Dorf hört.', folgen=dict(sym={'A': 2, 'B': 2, 'C': -2})),
}))

V2.append(dict(id='schuld', titel='Der Schuldeneintreiber', schwierigkeit=2,
  kurz='Ein Mann aus der Stadt fordert von {A} eine alte Schuld zurück – mit zwei Schlägern im Schlepptau.',
  rollen={'A': 'Wer Schulden hat', 'B': 'Wer helfen könnte'},
  start='ankunft', szenen={
  'ankunft': dict(ort='dorf', text='Ein Mann in einem guten Mantel steht vor dem Haus von {A}, flankiert von zwei breiten Kerlen mit Knüppeln. „Drei Winter ist es her. Der Zins ist inzwischen höher als die Schuld. Heute wird gezahlt – so oder so.“ {A} steht blass in der Tür.', optionen=[
    dict(text='Dazwischentreten', weiter='verhandlung'),
    dict(text='Erst mit {A} reden', weiter='a_rede')]),
  'a_rede': dict(ort='dorf', text='{A} flüstert: „Ich habe mir Saatgut geliehen, nach dem Hagel damals. Die Hälfte habe ich längst zurückgezahlt. Aber er sagt, das zählt nicht, weil ich zu spät war.“', optionen=[
    dict(text='„Hast du einen Beleg für die Zahlung?“', weiter='verhandlung', ergebnis='{A} kramt einen zerknitterten Zettel hervor, mit einem halben Siegel. Besser als nichts.', folgen=dict(flag=['zettel']))]),
  'verhandlung': dict(ort='dorf', text='Der Mann mustert dich. „Und du bist? Der Vormund? Dann zahlst du.“', optionen=[
    dict(text='Den Zettel vorzeigen und rechnen', wenn=dict(flag='zettel'), tag='[Feilschen]', probe=dict(id='feilschen', dc=12),
      erfolg=dict(text='Du rechnest ihm vor, was gezahlt wurde, mit Zins, ehrlich gerechnet. Er verzieht das Gesicht. „Dann eben der Rest. Aber heute.“', folgen=dict(flag=['rest']), weiter='zahlen'),
      misserfolg=dict(text='„Ein Fetzen Papier. Nett.“', weiter='drohung')),
    dict(text='Die Zahl in den Schriften nachprüfen', tag='[Altes Wissen]', probe=dict(id='altes_wissen', dc=13),
      erfolg=dict(text='Du kennst das Landrecht: Ein Zins darf die Schuld nicht übersteigen. Er weiß das auch – und weiß, dass du es weißt.', folgen=dict(flag=['rest']), weiter='zahlen'),
      misserfolg=dict(text='Du redest von Rechten, die du nicht genau kennst. Er grinst.', weiter='drohung')),
    dict(text='„Geh. Hier holst du nichts.“', tag='[Einschüchtern]', probe=dict(id='einschuechtern', dc=14),
      erfolg=dict(text='Einer der Schläger tritt einen Schritt zurück. Der Mann schnaubt. „Wir sprechen uns wieder.“ Aber er geht.', folgen=dict(flag=['vertrieben']), weiter='ende_weg'),
      misserfolg=dict(text='Der größere der beiden Kerle hebt den Knüppel.', weiter='kampf'))]),
  'drohung': dict(ort='dorf', text='„Zahlen oder ich nehme mir, was es wert ist.“ Er sieht zur Ziege von {A}, dann zum Werkzeug an der Wand.', optionen=[
    dict(text='Leute aus dem Dorf zusammenrufen', weiter='zahlen', ergebnis='Nach und nach kommen Leute aus den Häusern. Gegen ein halbes Dorf mögen zwei Knüppel nicht so viel. Der Mann lässt mit sich reden.', folgen=dict(flag=['rest'], sym={'B': 2})),
    dict(text='Sich ihm in den Weg stellen', weiter='kampf')]),
  'kampf': dict(ort='dorf', gefahr=True, text='Der erste Schlag kommt schneller als erwartet.', optionen=[
    dict(text='Zurückschlagen', tag='[Anpacken]', probe=dict(id='anpacken', dc=13),
      erfolg=dict(text='Du duckst dich, packst den Knüppel und stößt den Kerl in den Matsch. Der zweite überlegt es sich anders.', folgen=dict(flag=['vertrieben']), weiter='ende_weg'),
      misserfolg=dict(text='Ein Treffer an der Schulter wirft dich zu Boden. {B} zieht dich weg, bevor der zweite Schlag kommt.', folgen=dict(gefahr=2, sym={'B': 2}), weiter='zahlen')),
    dict(text='Ausweichen und den Mann selbst packen', tag='[Flink]', probe=dict(id='flink', dc=13),
      erfolg=dict(text='Plötzlich hast du den Mann im Mantel am Kragen. Seine Schläger erstarren. „Schon gut! Wir gehen!“', folgen=dict(flag=['vertrieben']), weiter='ende_weg'),
      misserfolg=dict(text='Du stolperst, der Knüppel trifft dich am Rücken.', folgen=dict(gefahr=1), weiter='zahlen'))]),
  'zahlen': dict(ort='dorf', text='Am Ende geht es nur noch um den Rest der Schuld. Das Dorf könnte ihn gemeinsam aufbringen.', optionen=[
    dict(text='Aus den Vorräten des Dorfes zahlen', weiter='ende_bezahlt', folgen=dict(dorf={'waren': -4, 'nahrung': -6})),
    dict(text='{A} soll selbst zahlen, wie es geht', weiter='ende_selbst')]),
  'ende_bezahlt': dict(ort='dorf', ende=True, text='Der Mann quittiert mit einem Siegel, diesmal vollständig. {A} hat Tränen in den Augen. „Ich zahle es dem Dorf zurück. Jeden Krümel.“',
    folgen=dict(sym={'A': 6, 'B': 2}, merkt={'A': '{held} hat dafür gesorgt, dass das Dorf meine Schuld getragen hat.'}, chronik=['brett_schuld_dorf', 'Das Dorf hat die alte Schuld von {A} gemeinsam beglichen.'], dorf={'stimmung': 3})),
  'ende_selbst': dict(ort='dorf', ende=True, text='{A} gibt die beiden besten Werkzeuge her. Die Schuld ist getilgt, aber die Arbeit wird jetzt schwerer.', folgen=dict(sym={'A': 2}, dorf={'waren': -2})),
  'ende_weg': dict(ort='dorf', ende=True, text='Der Mann und seine Schläger ziehen ab. {A} fällt dir um den Hals. Ob sie wiederkommen, wird sich zeigen.',
    folgen=dict(sym={'A': 5}, merkt={'A': '{held} hat den Schuldeneintreiber vertrieben.'}, chronik=['brett_schuld_weg', 'Ich habe einen Schuldeneintreiber aus der Stadt aus dem Dorf gejagt.'], beute=dict(stufe=2, chance=0.4, text='Einer der Schläger hat im Matsch etwas verloren.'))),
}))

V2.append(dict(id='fremde', titel='Die Fremden am Fluss', schwierigkeit=2,
  kurz='Am Flussufer haben Fremde ein Lager aufgeschlagen. {A} will sie verjagen, {B} will ihnen helfen.',
  rollen={'A': 'Wer Angst hat', 'B': 'Wer helfen will'},
  start='dorf', szenen={
  'dorf': dict(ort='dorf', text='„Sechs Leute, zwei Karren, ein Feuer“, sagt {A}. „Wer weiß, was die wollen. Gestern hat jemand Rüben vom Feld genommen.“ {B} schüttelt den Kopf. „Es sind Kinder dabei. Ich hab sie gesehen.“', optionen=[
    dict(text='Zum Lager gehen', weiter='weg')]),
  'weg': dict(ort='wald', text='Der Pfad führt am Fluss entlang. Rauch steigt zwischen den Erlen auf.', reise=dict(minuten=1, weiter='lager')),
  'lager': dict(ort='feuer', text='Am Feuer sitzen müde Gesichter. Ein grauhaariger Mann steht auf. „Wir wollen keinen Ärger. Unser Dorf liegt drei Tage flussaufwärts. Lag. Es ist niedergebrannt. Wir suchen nur einen Ort für den Winter.“', optionen=[
    dict(text='Prüfen, ob er die Wahrheit sagt', tag='[Menschenkenntnis]', probe=dict(id='menschenkenntnis', dc=12),
      erfolg=dict(text='Er sagt die Wahrheit. Und er verschweigt etwas: Einer von ihnen ist krank und liegt im Karren.', folgen=dict(flag=['krank']), weiter='karren'),
      misserfolg=dict(text='Du kannst ihn nicht lesen. Müde Menschen sehen alle gleich aus.', weiter='entscheidung')),
    dict(text='„Wer hat die Rüben genommen?“', weiter='entscheidung', ergebnis='Ein Junge senkt den Kopf. Der Alte legt ihm die Hand auf die Schulter. „Er hatte Hunger. Wir arbeiten es ab.“', folgen=dict(flag=['ehrlich']))]),
  'karren': dict(ort='feuer', text='Im Karren liegt eine Frau mit glühender Stirn. Kein Ausschlag, keine Flecken – aber hohes Fieber.', optionen=[
    dict(text='Sie untersuchen', tag='[Heilkunde]', probe=dict(id='heilkunde', dc=12),
      erfolg=dict(text='Eine entzündete Wunde am Bein, nichts Ansteckendes. Mit Ruhe und sauberem Verband wird sie es schaffen.', folgen=dict(flag=['nicht_ansteckend']), weiter='entscheidung'),
      misserfolg=dict(text='Du weißt nicht, was sie hat. Und das macht dir Sorgen.', weiter='entscheidung'))]),
  'entscheidung': dict(ort='feuer', text='Die Fremden sehen dich an. Was du jetzt sagst, wird im Dorf Gewicht haben.', optionen=[
    dict(text='„Kommt mit. Für die Arbeit eurer Hände gibt es Brot und ein Dach.“', weiter='dorf_rueck', folgen=dict(flag=['aufgenommen'])),
    dict(text='„Ihr könnt bleiben, wo ihr seid. Wir bringen euch, was wir entbehren können.“', weiter='dorf_rueck', folgen=dict(flag=['versorgt'], dorf={'nahrung': -8})),
    dict(text='„Zieht weiter. Für euch ist hier kein Platz.“', weiter='dorf_rueck', folgen=dict(flag=['vertrieben']))]),
  'dorf_rueck': dict(ort='dorf', text='Zurück im Dorf warten {A} und {B} – und noch ein paar andere.', optionen=[
    dict(text='Die Aufnahme verteidigen', wenn=dict(flag='aufgenommen'), tag='[Überreden]', probe=dict(id='ueberreden', dc=12, mod=dict(nicht_ansteckend=-3, ehrlich=-1)),
      erfolg=dict(text='„Es ist keine Seuche, und sie wollen arbeiten“, sagst du. {A} murrt, nickt dann aber. Die meisten Fremden ziehen im Frühjahr weiter – eine Familie bleibt.', folgen=dict(zuzug=True, sym={'B': 4, 'A': 1}, dorf={'stimmung': 1, 'nahrung': -5}), weiter='ende_auf'),
      misserfolg=dict(text='Die Stimmung kippt. Am Ende dürfen die Fremden nur bis zum ersten Schnee in der alten Scheune schlafen.', folgen=dict(sym={'B': 2, 'A': -1}, dorf={'stimmung': -2, 'nahrung': -4}), weiter='ende_halb')),
    dict(text='Erzählen, dass das Dorf ihnen etwas abgibt', wenn=dict(flag='versorgt'), weiter='ende_halb', folgen=dict(sym={'B': 3})),
    dict(text='Berichten, dass sie weiterziehen', wenn=dict(flag='vertrieben'), weiter='ende_weg', folgen=dict(sym={'A': 3, 'B': -4}, merkt={'B': '{held} hat die Fremden am Fluss in den Winter geschickt.'}))]),
  'ende_auf': dict(ort='dorf', ende=True, text='Eine fremde Familie hat ein neues Zuhause. Das Dorf ist ein Stück größer geworden – und ein Stück wärmer.',
    folgen=dict(merkt={'B': '{held} hat die Fremden ins Dorf geholt. Ich bin stolz auf uns.'}, chronik=['brett_fremde_auf', 'Ich habe die Fremden vom Fluss ins Dorf geholt.'])),
  'ende_halb': dict(ort='dorf', ende=True, text='Die Fremden überwintern am Rand des Dorfes. Im Frühjahr sind sie fort. Ein geschnitzter Vogel bleibt auf deiner Türschwelle zurück.', folgen=dict(chronik=['brett_fremde_halb', 'Das Dorf hat den Fremden vom Fluss über den Winter geholfen.'])),
  'ende_weg': dict(ort='dorf', ende=True, text='Am nächsten Morgen ist das Lager am Fluss leer. Nur die Feuerstelle raucht noch.', folgen=dict(chronik=['brett_fremde_weg', 'Ich habe die Fremden vom Fluss weggeschickt.'])),
}))

V2.append(dict(id='nebel', titel='Vermisst im Nebel', schwierigkeit=2,
  kurz='{A} ist gestern zum Holzsammeln in den Wald gegangen und nicht zurückgekehrt. {B} hat Angst um {A}.',
  rollen={'A': 'Vermisste Person', 'B': 'Wer sich sorgt'},
  start='sorge', szenen={
  'sorge': dict(ort='dorf', text='{B} hat nicht geschlafen. „{A} wollte nur Reisig holen, drüben beim Moor. Dann kam der Nebel. Bitte, such mit mir.“', optionen=[
    dict(text='Sofort losgehen', weiter='moor'),
    dict(text='Laterne und Seil mitnehmen', wenn=dict(item='laterne'), weiter='moor', folgen=dict(flag=['licht']), ergebnis='Die Laterne schneidet ein kleines, warmes Loch in den Nebel.')]),
  'moor': dict(ort='wald', text='Der Nebel hängt wie nasse Wolle zwischen den Birken. Irgendwo gluckst Wasser. Der Pfad teilt sich.', optionen=[
    dict(text='Nach Spuren suchen', tag='[Spuren lesen]', probe=dict(id='spuren', dc=12, mod=dict(licht=-2)),
      erfolg=dict(text='Abgebrochene Zweige, ein verlorenes Reisigbündel – nach links, zum Moor hin.', weiter='rufen'),
      misserfolg=dict(text='Alles sieht gleich aus. Ihr geht nach rechts – und landet nach einer Stunde wieder an der Gabelung.', folgen=dict(flag=['verirrt']), weiter='rufen')),
    dict(text='Laut rufen und lauschen', weiter='rufen')]),
  'rufen': dict(ort='wald', text='Ihr ruft. Lange nichts. Dann, ganz schwach, eine Antwort – von irgendwo vor euch, wo der Boden schwarz und weich wird.', optionen=[
    dict(text='Vorsichtig weitergehen', tag='[Flink]', probe=dict(id='flink', dc=12),
      erfolg=dict(text='Von Grasbult zu Grasbult tastest du dich vor.', weiter='fund'),
      misserfolg=dict(text='Du trittst daneben und versinkst bis zur Hüfte. {B} zieht dich heraus, nass und zitternd.', folgen=dict(gefahr=1), weiter='fund')),
    dict(text='Äste auslegen und einen sicheren Pfad bauen', tag='[Anpacken]', probe=dict(id='anpacken', dc=11),
      erfolg=dict(text='Langsam, aber sicher wächst ein Weg aus Ästen über das Moor.', folgen=dict(flag=['pfad']), weiter='fund'),
      misserfolg=dict(text='Die Äste versinken. Ihr müsst es doch so versuchen.', weiter='fund'))]),
  'fund': dict(ort='wald', text='{A} sitzt auf einem umgestürzten Stamm, ein Bein seltsam abgewinkelt, die Lippen blau vor Kälte. „Ich dachte, keiner kommt mehr.“', optionen=[
    dict(text='Das Bein schienen', tag='[Heilkunde]', probe=dict(id='heilkunde', dc=12),
      erfolg=dict(text='Du richtest das Bein und schienst es mit zwei Ästen. {A} beißt in einen Lederriemen und schreit nicht.', folgen=dict(flag=['geschient']), weiter='heim'),
      misserfolg=dict(text='Du bindest es, so gut es geht. Jeder Schritt wird eine Qual.', weiter='heim')),
    dict(text='{A} einfach tragen', tag='[Anpacken]', probe=dict(id='anpacken', dc=13, mod=dict(pfad=-3)),
      erfolg=dict(text='Du nimmst {A} auf den Rücken. Es ist weit, aber ihr schafft es.', folgen=dict(flag=['getragen']), weiter='heim'),
      misserfolg=dict(text='Nach hundert Schritten brecht ihr fast zusammen. {B} läuft ins Dorf und holt Hilfe.', weiter='heim'))]),
  'heim': dict(ort='dorf', ende=True, text='Im Dorf wird {A} in Decken gewickelt. Das Bein wird heilen. {B} lässt deine Hand nicht los.',
    folgen=dict(sym={'A': 6, 'B': 5}, merkt={'A': '{held} hat mich aus dem Nebelmoor geholt. Ich verdanke dir mein Leben.', 'B': '{held} hat mit mir nach {A} gesucht, als sonst keiner ging.'}, chronik=['brett_nebel', 'Ich habe {A} verletzt im Nebelmoor gefunden und ins Dorf zurückgebracht.'], dorf={'stimmung': 2}, beute=dict(stufe=2, chance=0.4, text='Als {A} wieder laufen kann, bringt {A} dir etwas vorbei. „Für den, der nicht aufgegeben hat.“'))),
}))

# ───────────── Schwer ─────────────
V2.append(dict(id='eber', titel='Der alte Eber', schwierigkeit=3,
  kurz='Ein riesiger Keiler verwüstet nachts die Felder. Die Jäger wollen ihn töten – {A} sagt, mit dem Tier stimmt etwas nicht.',
  rollen={'A': 'Wer den Wald kennt', 'B': 'Wer ihn töten will'},
  start='feld', szenen={
  'feld': dict(ort='dorf', text='Das Feld sieht aus wie gepflügt, nur kreuz und quer. Tiefe Hufabdrücke, größer als eine Hand. {B} prüft die Speerspitze. „Heute Nacht hole ich ihn mir.“ {A} hält dich am Ärmel zurück. „Wildschweine meiden Dörfer. Er nicht. Irgendwas treibt ihn.“', optionen=[
    dict(text='Mit {A} den Spuren folgen', weiter='wald'),
    dict(text='Mit {B} auf der Lauer liegen', weiter='lauer')]),
  'lauer': dict(ort='feld', text='Mitternacht. Der Mond hinter Wolken. Dann bricht etwas durch die Hecke – ein Keiler, so groß wie ein Kalb, ein Hauer abgebrochen. Er schnaubt, schwankt, wühlt.', gefahr=True, optionen=[
    dict(text='Genau hinsehen', tag='[Sinne]', probe=dict(id='spuren', dc=13),
      erfolg=dict(text='In seiner Flanke steckt etwas Dunkles, Metallisches. Die Wunde eitert. Er hat Schmerzen – und Hunger.', folgen=dict(flag=['wunde']), weiter='lauer_wahl'),
      misserfolg=dict(text='Ein riesiger Schatten. Mehr siehst du nicht.', weiter='lauer_wahl'))]),
  'lauer_wahl': dict(ort='feld', gefahr=True, text='{B} hebt den Speer.', optionen=[
    dict(text='{B} den Wurf lassen', weiter='kampf'),
    dict(text='{B} zurückhalten', tag='[Überreden]', probe=dict(id='ueberreden', dc=13, mod=dict(wunde=-3)),
      erfolg=dict(text='{B} senkt zögernd den Speer. Der Keiler trollt sich in den Wald.', folgen=dict(sym={'B': -1}), weiter='wald'),
      misserfolg=dict(text='„Aus dem Weg!“ {B} wirft.', weiter='kampf'))]),
  'kampf': dict(ort='feld', gefahr=True, text='Der Speer streift ihn nur. Brüllend wendet sich der Keiler – und kommt direkt auf euch zu.', optionen=[
    dict(text='Ihn mit dem Speer abfangen', tag='[Anpacken]', probe=dict(id='anpacken', dc=15),
      erfolg=dict(text='Du stemmst den Schaft in den Boden. Der Keiler läuft hinein. Es ist schnell vorbei.', folgen=dict(flag=['erlegt']), weiter='nach_kampf'),
      misserfolg=dict(text='Der Aufprall schleudert dich durch die Luft. Als du aufstehst, liegt der Keiler still – {B} hat den zweiten Speer geworfen.', folgen=dict(flag=['erlegt'], gefahr=2), weiter='nach_kampf')),
    dict(text='Zur Seite springen und ihn ins Leere laufen lassen', tag='[Flink]', probe=dict(id='flink', dc=14),
      erfolg=dict(text='Er donnert an dir vorbei, durch den Zaun, in den Wald. Fort.', weiter='wald'),
      misserfolg=dict(text='Ein Hauer reißt dir das Bein auf, bevor er im Dunkel verschwindet.', folgen=dict(gefahr=2), weiter='wald'))]),
  'nach_kampf': dict(ort='feld', text='Im Fackelschein seht ihr es: In der Flanke des Tieres steckt eine eiserne Armbrustspitze, schwarz vom Eiter. Kein Jäger aus dem Dorf benutzt solche Bolzen.', optionen=[
    dict(text='Die Spitze an dich nehmen', weiter='ende_erlegt', folgen=dict(flag=['spitze']))]),
  'wald': dict(ort='wald', text='Die Fährte führt tief in den Wald, an Wurzeln vorbei, die der Keiler zerfetzt hat. An einer Suhle findet ihr ihn liegend, keuchend. Er sieht euch – und steht nicht auf.', optionen=[
    dict(text='Langsam näher gehen', tag='[Beruhigen]', probe=dict(id='beruhigen', dc=14),
      erfolg=dict(text='Er grunzt warnend, bleibt aber liegen. In seiner Flanke steckt eine Armbrustspitze, tief im entzündeten Fleisch.', folgen=dict(flag=['nah']), weiter='heilen'),
      misserfolg=dict(text='Er rappelt sich hoch und stürmt auf euch zu. {A} reißt dich hinter eine Eiche. Der Keiler bricht zusammen, ein paar Schritte vor euch.', folgen=dict(gefahr=1), weiter='heilen')),
    dict(text='Ihn aus der Ferne erlösen', tag='[Bogen]', wenn=dict(item='bogen'), weiter='ende_erlegt', ergebnis='Ein Pfeil. Er hebt den Kopf, legt ihn wieder hin. Als ihr näher kommt, seht ihr die Armbrustspitze in seiner Flanke.', folgen=dict(flag=['erlegt', 'spitze']))]),
  'heilen': dict(ort='wald', text='{A} kniet sich neben dich. „Wenn wir das Eisen herausbekommen, hat er eine Chance. Er wird uns nicht danken – aber er wird nicht mehr ins Dorf kommen.“', optionen=[
    dict(text='Die Spitze herausschneiden', tag='[Heilkunde]', probe=dict(id='heilkunde', dc=15, mod=dict(nah=-2)),
      erfolg=dict(text='Ein schneller Schnitt, ein Ruck, ein Schwall. Der Keiler brüllt – und bleibt liegen. {A} streut gekaute Schafgarbe in die Wunde. Am Morgen ist die Suhle leer.', folgen=dict(flag=['geheilt', 'spitze']), weiter='ende_geheilt'),
      misserfolg=dict(text='Die Spitze sitzt zu tief. Er wehrt sich, verletzt dich am Arm. {A} erlöst ihn schließlich mit dem Messer.', folgen=dict(flag=['erlegt', 'spitze'], gefahr=1), weiter='ende_erlegt')),
    dict(text='Ihn erlösen', weiter='ende_erlegt', folgen=dict(flag=['erlegt', 'spitze']))]),
  'ende_geheilt': dict(ort='dorf', ende=True, text='Der Keiler kommt nie wieder. Manchmal, sagt {A}, sieht man im Frühjahr am Moor einen großen Schatten mit nur einem Hauer – und eine Rotte Frischlinge hinter ihm. Die eiserne Spitze aber gibt Rätsel auf: Wer jagt hier mit Armbrüsten?',
    folgen=dict(sym={'A': 6, 'B': -2}, merkt={'A': '{held} hat dem alten Keiler das Eisen herausgeschnitten. So etwas tut kaum jemand.', 'B': '{held} hat mir die Beute weggenommen. Ich weiß nicht, ob das mutig war oder dumm.'}, chronik=['brett_eber_geheilt', 'Ich habe einen verwundeten Keiler im Wald geheilt, statt ihn zu töten. In ihm steckte eine fremde Armbrustspitze.'], journal=['armbrust', 'Fremde Armbrüste', 'Im Wald um das Dorf jagt jemand mit eisernen Armbrustbolzen. Kein Jäger aus dem Dorf benutzt so etwas.'], beute=dict(stufe=3, chance=0.5, text='An der leeren Suhle liegt etwas im Schlamm, das nicht dorthin gehört – verloren von demjenigen, der den Keiler angeschossen hat.'))),
  'ende_erlegt': dict(ort='dorf', ende=True, text='Der Keiler wird zerlegt, das Dorf isst eine Woche lang Fleisch. {B} lässt sich feiern. Du aber drehst die schwarze Armbrustspitze zwischen den Fingern: Wer jagt hier mit so etwas?',
    folgen=dict(sym={'B': 4, 'A': -1}, merkt={'B': '{held} war dabei, als wir den großen Keiler erlegt haben.'}, chronik=['brett_eber_erlegt', 'Wir haben den alten Keiler erlegt, der die Felder verwüstet hat. In ihm steckte eine fremde Armbrustspitze.'], journal=['armbrust', 'Fremde Armbrüste', 'Im Wald um das Dorf jagt jemand mit eisernen Armbrustbolzen. Kein Jäger aus dem Dorf benutzt so etwas.'], dorf={'nahrung': 25, 'waren': 2}, beute=dict(stufe=2, chance=0.5, text='{B} gibt dir einen Anteil – „wer mitjagt, teilt“.'))),
}))

V2.append(dict(id='zoll', titel='Der Zoll am Steg', schwierigkeit=3,
  kurz='Bewaffnete eines fremden Herrn haben den Steg über den Fluss besetzt und verlangen Zoll von jedem, auch von {A}.',
  rollen={'A': 'Wer über den Fluss muss', 'B': 'Wer kämpfen will', 'C': 'Wer verhandeln will'},
  start='bericht', szenen={
  'bericht': dict(ort='dorf', text='{A} kommt mit leerem Karren zurück. „Sie wollten ein Drittel von allem. Im Namen eines Herrn von Kaltenbrunn, von dem ich nie gehört habe.“ {B} ballt die Fäuste. „Fünf Mann? Die jagen wir weg.“ {C} schüttelt den Kopf. „Und morgen kommen fünfzig.“', optionen=[
    dict(text='Selbst zum Steg gehen', weiter='weg')]),
  'weg': dict(ort='wald', text='Der Weg zum Steg führt durch Erlen und Schilf. Schon von weitem hörst du Stimmen und das Klirren von Rüstungen.', reise=dict(minuten=1, weiter='steg')),
  'steg': dict(ort='wald', text='Fünf Männer in zusammengewürfelten Rüstungen. Ihr Anführer, ein Mann mit Narbe am Kinn, lehnt an einem Pfosten. „Der Herr von Kaltenbrunn schützt diesen Steg. Schutz kostet.“', optionen=[
    dict(text='Ihr Abzeichen und ihre Ausrüstung mustern', tag='[Sinne]', probe=dict(id='spuren', dc=13),
      erfolg=dict(text='Die Wappen sind frisch aufgemalt, die Rüstungen von verschiedenen Schlachtfeldern. Keine Truppe eines Herrn – Söldner, die sich selbst einen Herrn ausgedacht haben.', folgen=dict(flag=['falsch']), weiter='wahl'),
      misserfolg=dict(text='Bewaffnete Männer. Mehr musst du nicht wissen.', weiter='wahl')),
    dict(text='Nach dem Herrn von Kaltenbrunn fragen', tag='[Altes Wissen]', probe=dict(id='altes_wissen', dc=14),
      erfolg=dict(text='Kaltenbrunn ist eine Ruine, seit zwanzig Jahren. Du sagst es nicht laut – noch nicht.', folgen=dict(flag=['falsch', 'ruine']), weiter='wahl'),
      misserfolg=dict(text='Der Name sagt dir nichts.', weiter='wahl'))]),
  'wahl': dict(ort='wald', text='Der Narbige wartet. Hinter dir rauscht der Fluss.', optionen=[
    dict(text='„Kaltenbrunn ist seit zwanzig Jahren eine Ruine. Wessen Zoll ist das wirklich?“', wenn=dict(flag='ruine'), tag='[Einschüchtern]', probe=dict(id='einschuechtern', dc=13),
      erfolg=dict(text='Einer der Männer lacht nervös. Der Narbige sieht dich lange an. „Kluger Kopf. Sag, was du willst.“', folgen=dict(flag=['durchschaut']), weiter='angebot'),
      misserfolg=dict(text='„Dann eben in meinem Namen.“ Er zieht sein Schwert eine Handbreit.', weiter='angebot')),
    dict(text='Verhandeln', tag='[Feilschen]', probe=dict(id='feilschen', dc=15, mod=dict(falsch=-2)),
      erfolg=dict(text='Am Ende einigt ihr euch auf einen kleinen Wegzoll – einmal im Monat, nicht von jedem Karren.', folgen=dict(flag=['einigung']), weiter='ende_einigung'),
      misserfolg=dict(text='„Ein Drittel. Oder ihr geht schwimmen.“', weiter='angebot')),
    dict(text='Mit {B} und ein paar anderen zurückkommen und angreifen', weiter='kampf')]),
  'angebot': dict(ort='wald', text='„Hör zu“, sagt der Narbige leiser. „Wir haben im Krieg gedient, für einen Herrn, der uns nie bezahlt hat. Wir wollen nicht rauben. Wir wollen nur überleben.“', optionen=[
    dict(text='„Dann schützt den Steg wirklich – für Brot und Unterkunft.“', tag='[Überreden]', probe=dict(id='ueberreden', dc=14, mod=dict(durchschaut=-3)),
      erfolg=dict(text='Er streckt dir die Hand hin. „Für Brot und ein Dach halten wir die Räuber vom Hohlweg fern. Abgemacht.“', folgen=dict(flag=['waechter']), weiter='ende_waechter'),
      misserfolg=dict(text='„Brot? Wir sind keine Bettler.“', weiter='kampf')),
    dict(text='„Verschwindet, bevor das ganze Tal hier steht.“', tag='[Einschüchtern]', probe=dict(id='einschuechtern', dc=14, mod=dict(durchschaut=-2)),
      erfolg=dict(text='Er spuckt aus, aber er gibt seinen Männern ein Zeichen. Am Abend ist der Steg frei.', weiter='ende_frei'),
      misserfolg=dict(text='„Mutig. Und dumm.“', weiter='kampf'))]),
  'kampf': dict(ort='wald', gefahr=True, text='Mit {B} und vier anderen aus dem Dorf stehst du am Steg. Die Söldner bilden eine Reihe.', optionen=[
    dict(text='Angreifen', tag='[Anpacken]', probe=dict(id='anpacken', dc=15),
      erfolg=dict(text='Es ist schnell und hässlich. Zwei Söldner springen in den Fluss, die anderen fliehen. Niemand aus dem Dorf stirbt.', folgen=dict(sym={'B': 4}), weiter='ende_frei'),
      misserfolg=dict(text='Die Söldner wissen, was sie tun. Ihr müsst euch zurückziehen, {B} blutet am Kopf. Am nächsten Morgen sind sie trotzdem fort – zu viel Ärger für zu wenig Beute.', folgen=dict(gefahr=2, sym={'B': 2}, dorf={'stimmung': -3}), weiter='ende_frei')),
    dict(text='Einen Hinterhalt im Schilf legen', tag='[Flink]', probe=dict(id='flink', dc=14),
      erfolg=dict(text='Aus dem Schilf heraus überrascht ihr sie. Sie geben auf, bevor jemand ernsthaft verletzt wird.', weiter='ende_frei'),
      misserfolg=dict(text='Einer bemerkt euch. Es kommt doch zum Kampf.', folgen=dict(gefahr=1), weiter='ende_frei'))]),
  'ende_einigung': dict(ort='dorf', ende=True, text='Der Steg bleibt offen, gegen einen kleinen Zoll. Nicht jeder im Dorf ist zufrieden – aber niemand musste bluten.',
    folgen=dict(sym={'C': 4, 'B': -2, 'A': 2}, chronik=['brett_zoll_einigung', 'Ich habe mit den Söldnern am Steg einen kleinen Zoll ausgehandelt.'], dorf={'waren': -2})),
  'ende_waechter': dict(ort='dorf', ende=True, text='Fünf Söldner bewachen jetzt den Steg – für das Dorf. Ihr Anführer nennt sich Harrek und grüßt dich jedes Mal mit einem knappen Nicken.',
    folgen=dict(sym={'C': 5, 'A': 3}, merkt={'C': '{held} hat aus Wegelagerern Wächter gemacht. Das hätte ich nie gedacht.'}, chronik=['brett_zoll_waechter', 'Die Söldner am Steg bewachen jetzt für Brot und Unterkunft den Weg für unser Dorf.'], journal=['harrek', 'Harrek vom Steg', 'Harrek und vier Söldner, ehemals Soldaten ohne Sold, bewachen jetzt den Steg für unser Dorf.'], dorf={'nahrung': -10, 'stimmung': 2}, beute=dict(stufe=3, chance=0.5, text='Harrek gibt dir etwas aus seinem Kriegsgepäck. „Ich brauche es nicht mehr. Du vielleicht.“'))),
  'ende_frei': dict(ort='dorf', ende=True, text='Der Steg ist wieder frei. Abends erzählt man sich am Feuer, wie es war – jedes Mal ein bisschen heldenhafter.',
    folgen=dict(sym={'B': 3, 'A': 3}, merkt={'B': '{held} hat mit mir den Steg freigekämpft.'}, chronik=['brett_zoll_frei', 'Wir haben die falschen Zöllner vom Steg vertrieben.'], dorf={'stimmung': 3}, beute=dict(stufe=2, chance=0.6, text='Am Steg haben die Söldner in der Eile etwas zurückgelassen.'))),
}))

V2.append(dict(id='spitzel', titel='Wer verrät das Dorf?', schwierigkeit=3,
  kurz='Räuber wussten genau, wann der Vorratswagen unterwegs war. Jemand im Dorf muss geredet haben – {A}, {B} oder {C}.',
  rollen={'A': 'Verdächtige Person', 'B': 'Verdächtige Person', 'C': 'Verdächtige Person'},
  start='ueberfall', szenen={
  'ueberfall': dict(ort='dorf', text='Der Vorratswagen kam leer zurück. Die Räuber haben gewartet, genau an der Stelle, an genau dem Tag. Nur drei Leute wussten davon: {A}, {B} und {C}. Das Dorf erwartet, dass du herausfindest, wer geredet hat.', optionen=[
    dict(text='Mit {A} reden', weiter='a'),
    dict(text='Mit {B} reden', weiter='b'),
    dict(text='Mit {C} reden', weiter='c')]),
  'a': dict(ort='dorf', text='{A} ist wütend. „Ich? Ich habe die halbe Ladung selbst gepackt! Frag lieber, wer neuerdings so viel Zeit im Gasthaus in Furtenau verbringt.“', optionen=[
    dict(text='Prüfen, ob {A} ehrlich ist', tag='[Menschenkenntnis]', wenn=dict(nicht_flag='a_geprueft'), probe=dict(id='menschenkenntnis', dc=13),
      erfolg=dict(text='Die Wut ist echt. {A} hat nichts zu verbergen – aber {A} deutet auf jemanden.', folgen=dict(flag=['a_geprueft', 'a_unschuldig']), weiter='a'),
      misserfolg=dict(text='Du kannst {A} nicht einschätzen.', folgen=dict(flag=['a_geprueft']), weiter='a')),
    dict(text='„Wer war in Furtenau?“', weiter='ueberblick', ergebnis='„{B}. Dreimal in diesem Monat. Angeblich wegen einer Tante.“', folgen=dict(flag=['furtenau'])),
    dict(text='Zurück', weiter='ueberblick')]),
  'b': dict(ort='dorf', text='{B} weicht deinem Blick aus. „Ja, ich war in Furtenau. Meine Tante ist krank. Ist das verboten?“', optionen=[
    dict(text='Nach der Tante fragen', tag='[Menschenkenntnis]', wenn=dict(nicht_flag='b_geprueft'), probe=dict(id='menschenkenntnis', dc=14),
      erfolg=dict(text='Bei der Tante zittert die Stimme nicht. Aber als du nach dem Gasthaus fragst, schon. {B} verheimlicht etwas – nur vielleicht nicht das, was du denkst.', folgen=dict(flag=['b_geprueft', 'b_geheimnis']), weiter='b'),
      misserfolg=dict(text='{B} wirkt nervös. Aber wer wäre das nicht?', folgen=dict(flag=['b_geprueft']), weiter='b')),
    dict(text='„Was ist im Gasthaus passiert?“', wenn=dict(flag='b_geheimnis'), weiter='ueberblick', ergebnis='{B} wird rot. „Ich … habe gespielt. Würfel. Und verloren. Mehr als ich habe. Aber ich habe niemandem vom Wagen erzählt! Ich schwöre!“', folgen=dict(flag=['spielschulden'])),
    dict(text='Zurück', weiter='ueberblick')]),
  'c': dict(ort='dorf', text='{C} ist die Ruhe selbst. „Schlimme Sache. Ich helfe gern, wo ich kann. Brauchst du etwas?“', optionen=[
    dict(text='Die Hütte von {C} durchsuchen, solange {C} auf dem Feld ist', tag='[Flink]', wenn=dict(nicht_flag='c_gesucht'), probe=dict(id='flink', dc=14),
      erfolg=dict(text='Unter einer losen Diele: ein Beutel mit fremden Münzen. Mehr, als {C} in einem Jahr verdient.', folgen=dict(flag=['c_gesucht', 'muenzen']), weiter='c'),
      misserfolg=dict(text='Du findest nichts – und {C} kommt früher zurück, als dir lieb ist. {C} sagt nichts, aber sieht dich lange an.', folgen=dict(flag=['c_gesucht', 'c_gewarnt']), weiter='c')),
    dict(text='{C} unterwegs beobachten', tag='[Spuren lesen]', wenn=dict(nicht_flag='c_beobachtet'), probe=dict(id='spuren', dc=13, mod=dict(c_gewarnt=3)),
      erfolg=dict(text='In der Dämmerung schleicht {C} zum alten Hohlweg und legt etwas unter einen Stein. Eine Nachricht.', folgen=dict(flag=['c_beobachtet', 'nachricht']), weiter='c'),
      misserfolg=dict(text='{C} geht nur zum Feld und zurück. Wenn {C} etwas weiß, ist {C} vorsichtig.', folgen=dict(flag=['c_beobachtet']), weiter='c')),
    dict(text='Zurück', weiter='ueberblick')]),
  'ueberblick': dict(ort='dorf', text='Das Dorf wartet auf eine Antwort. Du kannst weiter nachforschen oder jemanden benennen.', optionen=[
    dict(text='Weiter mit {A} reden', weiter='a'), dict(text='Weiter mit {B} reden', weiter='b'), dict(text='Weiter mit {C} reden', weiter='c'),
    dict(text='Jemanden benennen', weiter='urteil')]),
  'urteil': dict(ort='dorf', text='Auf dem Platz stehen alle drei. Die Leute schweigen.', optionen=[
    dict(text='{C} mit den Münzen und der Nachricht konfrontieren', wenn=dict(flag='nachricht'), weiter='c_gestaendnis'),
    dict(text='{C} mit den Münzen konfrontieren', wenn=dict(flag='muenzen', nicht_flag='nachricht'), tag='[Einschüchtern]', probe=dict(id='einschuechtern', dc=14),
      erfolg=dict(text='{C} bricht ein.', weiter='c_gestaendnis'),
      misserfolg=dict(text='„Gespart. Seit Jahren.“ Ohne mehr Beweise glaubt man {C}.', weiter='ende_offen')),
    dict(text='{B} beschuldigen', weiter='ende_falsch'),
    dict(text='„Ich weiß es nicht sicher. Ich beschuldige niemanden.“', weiter='ende_offen')]),
  'c_gestaendnis': dict(ort='dorf', text='{C} sackt in sich zusammen. „Sie haben gedroht, mein Haus anzuzünden. Dann haben sie bezahlt. Ich dachte, ein Wagen … was ist schon ein Wagen.“', optionen=[
    dict(text='Verbannung fordern', weiter='ende_verbannt'),
    dict(text='„Hilf uns, die Räuber in eine Falle zu locken. Dann sehen wir weiter.“', tag='[Überreden]', probe=dict(id='ueberreden', dc=13),
      erfolg=dict(text='{C} nickt, bleich. Mit einer falschen Nachricht lockt ihr die Räuber in einen Hinterhalt. Zwei werden gefangen, die anderen fliehen und kommen nicht wieder.', folgen=dict(dorf={'nahrung': 15, 'waren': 3}), weiter='ende_falle'),
      misserfolg=dict(text='{C} schüttelt nur den Kopf und weint. Das Dorf entscheidet sich für die Verbannung.', weiter='ende_verbannt'))]),
  'ende_verbannt': dict(ort='dorf', ende=True, text='{C} verlässt das Dorf am nächsten Morgen mit einem Bündel. Niemand winkt. Ein Teil der Vorräte bleibt verloren.',
    folgen=dict(sym={'A': 3, 'B': 4, 'C': -10}, merkt={'C': '{held} hat mich überführt. Ich hätte es an deiner Stelle auch getan.', 'B': '{held} hat herausgefunden, dass ich es nicht war.'}, chronik=['brett_spitzel_verbannt', 'Ich habe {C} als Spitzel der Räuber überführt. {C} musste gehen.'], dorf={'stimmung': -2})),
  'ende_falle': dict(ort='dorf', ende=True, text='Ein Teil der Vorräte kommt zurück. {C} darf bleiben – unter Aufsicht, mit gesenktem Kopf. Und das Dorf hat etwas über Gnade gelernt.',
    folgen=dict(sym={'A': 3, 'B': 4, 'C': 5}, merkt={'C': '{held} hat mir eine zweite Chance gegeben, obwohl ich das Dorf verraten habe.'}, chronik=['brett_spitzel_falle', 'Ich habe {C} überführt – und mit einer Falle die Räuber gefasst.'], beute=dict(stufe=3, chance=0.6, text='Bei den gefangenen Räubern findet sich Beute aus anderen Überfällen. Ein Stück davon gibt dir das Dorf.'))),
  'ende_falsch': dict(ort='dorf', ende=True, text='{B} wird aus dem Dorf gejagt, schreiend, dass es nicht wahr ist. Zwei Wochen später werden wieder Vorräte überfallen.',
    folgen=dict(sym={'B': -12, 'C': 2}, merkt={'B': '{held} hat mich für etwas verurteilt, das ich nicht getan habe.'}, chronik=['brett_spitzel_falsch', 'Ich habe {B} des Verrats beschuldigt. Die Überfälle hörten nicht auf.'], dorf={'stimmung': -4, 'nahrung': -8})),
  'ende_offen': dict(ort='dorf', ende=True, text='Ohne Urteil geht das Dorf auseinander. Das Misstrauen bleibt – wie ein Splitter unter der Haut.', folgen=dict(dorf={'stimmung': -2})),
}))

V2.append(dict(id='damm', titel='Wenn der Damm bricht', schwierigkeit=3,
  kurz='Nach tagelangem Regen droht das alte Wehr oberhalb des Dorfes zu brechen. {A} schlägt Alarm.',
  rollen={'A': 'Wer Alarm schlägt', 'B': 'Wer am Ufer wohnt'},
  start='alarm', szenen={
  'alarm': dict(ort='dorf', gefahr=True, text='Es ist Nacht und es schüttet. {A} hämmert an deine Tür. „Das alte Wehr! Es knirscht und ächzt. Wenn es bricht, steht das Unterdorf unter Wasser – das Haus von {B} zuerst!“', optionen=[
    dict(text='Zum Wehr laufen', weiter='wehr'),
    dict(text='Erst das Unterdorf wecken', weiter='wecken', folgen=dict(flag=['gewarnt']))]),
  'wecken': dict(ort='dorf', text='Du hämmerst an Türen. Leute stolpern verschlafen ins Freie, Kinder auf den Armen. {B} will nicht gehen. „Mein Vorrat! Meine Werkstatt!“', optionen=[
    dict(text='{B} mit Gewalt herausziehen', tag='[Anpacken]', probe=dict(id='anpacken', dc=12),
      erfolg=dict(text='Du packst {B} und ziehst. {B} flucht – und dankt dir später.', folgen=dict(flag=['b_sicher']), weiter='wehr'),
      misserfolg=dict(text='{B} reißt sich los und rennt zurück ins Haus.', weiter='wehr')),
    dict(text='{B} gut zureden', tag='[Beruhigen]', probe=dict(id='beruhigen', dc=12),
      erfolg=dict(text='„Dinge kann man ersetzen.“ {B} nickt und geht mit.', folgen=dict(flag=['b_sicher']), weiter='wehr'),
      misserfolg=dict(text='{B} hört nicht zu.', weiter='wehr'))]),
  'wehr': dict(ort='wald', gefahr=True, text='Das Wehr ist ein alter Damm aus Stämmen und Steinen. Wasser schießt schon durch Lücken. Ein Stamm in der Mitte biegt sich bedrohlich.', optionen=[
    dict(text='Den Stamm mit Pfählen abstützen', tag='[Anpacken]', probe=dict(id='anpacken', dc=15),
      erfolg=dict(text='Mit drei Pfählen und deinem ganzen Gewicht hältst du ihn. Leute aus dem Dorf schleppen Säcke voll Erde heran. Gegen Morgen hält das Wehr.', folgen=dict(flag=['gehalten']), weiter='morgen'),
      misserfolg=dict(text='Der Stamm bricht mit einem Knall. Das Wasser reißt dich von den Füßen, du klammerst dich an eine Wurzel.', folgen=dict(flag=['gebrochen'], gefahr=2), weiter='morgen')),
    dict(text='Einen Graben ausheben, damit das Wasser seitlich abläuft', tag='[Altes Wissen]', probe=dict(id='altes_wissen', dc=14),
      erfolg=dict(text='Du erinnerst dich an alte Wasserbauer: Entlasten statt halten. Ihr hebt am Rand einen Graben aus. Das Wasser findet den neuen Weg – das Wehr bleibt stehen, das Unterdorf trocken.', folgen=dict(flag=['gehalten', 'graben']), weiter='morgen'),
      misserfolg=dict(text='Der Graben ist zu flach. Das Wehr bricht trotzdem, aber weniger heftig.', folgen=dict(flag=['gebrochen', 'teil']), weiter='morgen')),
    dict(text='Das Wehr gezielt an der Seite öffnen, wo die Felder liegen', weiter='morgen', ergebnis='Du hebelst zwei Stämme heraus. Das Wasser schießt über die Felder statt durchs Dorf. Die Häuser bleiben trocken – die Wintersaat ist fort.', folgen=dict(flag=['felder']))]),
  'morgen': dict(ort='dorf', text='Der Morgen dämmert grau.', optionen=[
    dict(text='Nachsehen', wenn=dict(flag='gehalten'), weiter='ende_gehalten'),
    dict(text='Nachsehen', wenn=dict(flag='felder'), weiter='ende_felder'),
    dict(text='Nachsehen', wenn=dict(flag='gebrochen'), weiter='ende_flut')]),
  'ende_gehalten': dict(ort='dorf', ende=True, text='Das Wehr hält. Schlammige, erschöpfte Menschen sitzen am Ufer und lachen, ohne zu wissen warum. {A} umarmt jeden, auch dich.',
    folgen=dict(sym={'A': 5, 'B': 5}, merkt={'B': '{held} hat in der Regennacht das Wehr gehalten. Mein Haus steht noch.', 'A': '{held} ist mit mir zum Wehr gelaufen, als alle anderen noch schliefen.'}, chronik=['brett_damm_gehalten', 'In der Regennacht haben wir das alte Wehr gehalten.'], dorf={'stimmung': 5, 'holz': -5}, beute=dict(stufe=2, chance=0.5, text='{B} schenkt dir zum Dank etwas aus der geretteten Werkstatt.'))),
  'ende_felder': dict(ort='dorf', ende=True, text='Kein Haus ist beschädigt, aber das Feld ist ein See. Im Frühjahr wird neu gesät werden müssen. Manche nennen es klug, andere hätten lieber gefragt werden wollen.',
    folgen=dict(sym={'B': 4, 'A': 1}, chronik=['brett_damm_felder', 'Ich habe das Wehr zu den Feldern hin geöffnet, um das Dorf zu retten.'], dorf={'nahrung': -20, 'stimmung': -1})),
  'ende_flut': dict(ort='dorf', ende=True, text='Das Unterdorf steht knietief im Schlamm. Vorräte sind verdorben, die Werkstatt von {B} ist verwüstet. Aber alle leben – zumindest dafür hat es gereicht.',
    folgen=dict(sym={'A': 2, 'B': 1}, chronik=['brett_damm_flut', 'Das alte Wehr ist in der Regennacht gebrochen. Das Unterdorf wurde überflutet.'], dorf={'nahrung': -25, 'holz': -10, 'waren': -3, 'stimmung': -4})),
}))
