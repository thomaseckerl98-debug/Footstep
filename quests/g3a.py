# Sechs Geschichten für daheim (art 'haupt'): 2× Kampf, 2× Denken, 2× Überzeugen/Psychologie.
# Grundsatz: keine saubere Lösung ohne Preis, Menschen mit Gründen, Folgen, die man spürt.
from qlib import O, B, P, S, R, MG, K, RZ, E, pruefe

Q = []

# ───────────── 1. Kampf: Der Zoll an der Klamm ─────────────
s = {}
s['start'] = S('dorf', 'Ein Bauer kommt mit blutiger Lippe ins Dorf. An der Klamm, wo der Weg nach Süden durch die Felsen führt, hat sich ein Söldnertrupp eingenistet. Wer durch will, zahlt – mit Korn, mit Werkzeug, mit allem. „Einer von denen“, sagt der Bauer und spuckt aus, „ist der junge Lutz. Der vom Gerberhof. Den ihr im Hungerwinter weggejagt habt.“',
  O('Sofort zur Klamm aufbrechen', 'weg'),
  O('Erst die Alten nach Lutz fragen', 'lutz_frage'),
  O('Waffen und Vorräte packen, dann los', 'weg', ergebnis='Du schärfst die Klinge, packst Brot und Verbandszeug. Wer weiß, wie lange das dauert.', folgen={'flag': ['vorbereitet']}))
s['lutz_frage'] = S('dorf', 'Die alte Wäscherin wischt sich die Hände ab, bevor sie redet. „Der Gerberhof hatte drei Mäuler und kein Korn. Der Rat hat beschlossen: Wer nicht arbeiten kann, kriegt nichts aus dem Speicher. Lutz’ Mutter war krank. Sie ist im Februar gestorben. Lutz war vierzehn.“ Sie sieht dich nicht an. „Ich hab dafür gestimmt. Wir hatten selbst Kinder.“',
  O('„Ihr habt ihn verhungern lassen.“', 'weg', ergebnis='„Wir haben die anderen leben lassen“, sagt sie leise. „Das ist nicht dasselbe. Aber es fühlt sich so an.“', folgen={'flag': ['kennt_schuld']}),
  O('Schweigend nicken und aufbrechen', 'weg', folgen={'flag': ['kennt_schuld']}))
s['weg'] = R('wald', 'Der Weg nach Süden steigt an. Die Felsen rücken zusammen, das Licht wird grau.', 70, 'klamm', unterwegs='Du gehst {mit} Richtung Klamm.', begegnung=['b_fluechtling'], chance=0.5)
s['b_fluechtling'] = S('wald', 'Eine Frau mit zwei Kindern kommt dir entgegen, barfuß. „Sie haben uns die Schuhe genommen“, sagt sie. „Und den Esel. Der Anführer hat gelacht dabei.“ Das ältere Kind starrt auf deine Stiefel.',
  O('Dem Kind deine Ersatzschuhe geben', 'klamm', ergebnis='Die Schuhe sind viel zu groß. Das Kind läuft trotzdem, als hätte es Flügel.', folgen={'chronik': ['klamm_schuhe', 'Ich habe einem Kind an der Klamm meine Schuhe gegeben.']}),
  O('Fragen, wie viele es sind', 'klamm', ergebnis='„Sieben. Vielleicht acht. Und einer, der nicht dazugehört. Jung. Hat uns heimlich Brot zugesteckt.“', folgen={'flag': ['lutz_gut']}))
s['klamm'] = S('berg', 'Ein umgestürzter Karren versperrt den Weg, dahinter ein Feuer. Sieben Männer in zusammengestückelten Rüstungen. Ihr Anführer, ein breiter Kerl mit verbranntem Ohr, steht auf. „Zoll“, sagt er nur. Hinter ihm, am Rand, ein Junge mit zu großem Helm. Lutz. Er erkennt dich nicht – oder tut so.',
  P('„Ihr habt heute schon genug genommen. Zieht weiter.“', 'einschuechtern', 14,
    B('Der Anführer mustert dich lange. Dann lacht er. „Mut hast du. Aber Mut ist kein Zoll.“ Immerhin – seine Leute sind unruhig geworden.', 'verhandeln', folgen={'flag': ['eingeschuechtert']}),
    B('Gelächter. „Hört euch den an!“ Zwei Männer ziehen ihre Klingen.', 'kampf')),
  P('Lutz direkt ansprechen: „Ich weiß, was das Dorf dir angetan hat.“', 'menschenkenntnis', 12,
    B('Lutz zuckt zusammen. Sein Blick geht zu dir, dann zum Anführer – Angst. Er ist nicht freiwillig hier. Nicht mehr.', 'lutz_blick', folgen={'flag': ['lutz_zweifel']}),
    B('Lutz verzieht keine Miene. „Ich kenn dich nicht“, sagt er. Aber seine Hand zittert am Speer.', 'verhandeln'), wenn={'flag': 'kennt_schuld'}),
  O('Den Zoll zahlen und durchgehen', 'zahlen'),
  O('Ohne Worte angreifen', 'kampf', tag='[Kampf]'))
s['lutz_blick'] = S('berg', 'Der Anführer hat es bemerkt. Er legt Lutz eine schwere Hand auf die Schulter. „Der Junge gehört zu uns. Er schuldet uns sein Leben. Ohne uns wär er im Schnee verreckt – genau wie seine Mutter. Nicht wahr, Lutz?“ Lutz sagt nichts.',
  P('„Komm mit mir zurück, Lutz. Ich sorge dafür, dass du einen Platz bekommst.“', 'ueberreden', 13,
    B('Lutz sieht dich an. „Versprichst du das? Vor allen?“ Du nickst. Langsam nimmt er den Helm ab. Der Anführer flucht – und zieht das Schwert.', 'kampf_lutz', folgen={'flag': ['lutz_kommt']}),
    B('„Einen Platz?“ Lutz lacht bitter. „Den hatte ich schon mal.“ Er tritt einen Schritt zurück, zu den anderen.', 'verhandeln')),
  O('„Dann schuldest du ihnen nichts mehr. Ich zahle seine Schuld.“', 'freikauf'))
s['freikauf'] = S('berg', '„Seine Schuld?“ Der Anführer grinst. „Fünfzig Scheite Holz. Und dein Messer.“ Ein lächerlicher Preis – oder eine Prüfung, ob du es ernst meinst.',
  O('Zahlen. Holz und Messer.', 'ende_freikauf', wenn={'holz': 50}, folgen={'holz': -50, 'flag': ['lutz_kommt']}),
  O('„Das habe ich nicht dabei. Aber im Dorf.“', 'verhandeln', ergebnis='„Im Dorf.“ Er spuckt ins Feuer. „Das sagen alle.“'))
s['verhandeln'] = S('berg', 'Der Anführer verschränkt die Arme. „Also. Was ist dir der Weg wert?“ Seine Männer haben die Hände an den Waffen.',
  P('Den Zoll herunterhandeln und dafür sorgen, dass sie weiterziehen', 'feilschen', 13,
    B('Ihr einigt euch auf ein Fass Korn – und sein Wort, dass sie bis zum Neumond die Klamm verlassen. Ein Wort, das nicht viel wert sein mag. Aber es ist eins.', 'ende_handel'),
    B('„Du feilschst wie ein Krämer“, knurrt er. „Ich mag keine Krämer.“', 'kampf')),
  O('„Dann eben so.“ Die Klinge ziehen.', 'kampf', tag='[Kampf]'))
s['zahlen'] = S('berg', 'Du legst ab, was du hast. Der Anführer wiegt es in der Hand. „Klug. Die Klugen werden alt.“ Als du an Lutz vorbeigehst, flüstert er, fast unhörbar: „Sie wollen nächste Woche ins Dorf. Wenn alle auf dem Feld sind.“',
  O('Umkehren und das Dorf warnen', 'ende_warnung', folgen={'flag': ['gewarnt']}),
  O('Lutz zuflüstern: „Komm heute Nacht zum alten Grenzstein.“', 'nacht'))
s['nacht'] = S('wald', 'Der Grenzstein, Mitternacht. Du wartest lange. Dann Schritte – Lutz, allein, mit einem Bündel. „Wenn sie merken, dass ich weg bin, kommen sie sofort. Nicht nächste Woche.“',
  O('„Dann sind wir vorbereitet.“ Mit ihm ins Dorf eilen.', 'ende_nacht', folgen={'flag': ['lutz_kommt']}))
s['kampf'] = K('berg', 'Stahl blitzt im Feuerschein. Die Söldner fächern sich auf, der Anführer brüllt Befehle.', 'Kampf an der Klamm', 'banditen', 420,
  B('Der letzte Söldner flieht in die Felsen. Der Anführer liegt im Staub, lebt aber. Lutz steht da, den Speer gesenkt, und weiß nicht, wohin.', 'nach_kampf'),
  B('Ein Schlag gegen den Kopf, Dunkelheit. Als du aufwachst, sind sie fort – mit allem, was du hattest. Und mit Lutz.', 'ende_niederlage', folgen={'gefahr': 2}), schwer=2)
s['kampf_lutz'] = K('berg', 'Lutz steht neben dir, den Speer in zitternden Händen. Gegen seine alten Kameraden.', 'Rücken an Rücken', 'banditen', 360,
  B('Sie fliehen. Lutz sinkt auf die Knie und übergibt sich. Dann sieht er dich an. „Du hast es versprochen. Vor allen.“', 'ende_lutz'),
  B('Ihr werdet zurückgedrängt, aber sie verfolgen euch nicht. Lutz blutet am Arm. „Weiter“, keucht er. „Nur weg hier.“', 'ende_lutz', folgen={'gefahr': 1}), schwer=2)
s['nach_kampf'] = S('berg', 'Der Anführer hustet Blut. „Mach schon“, sagt er. Lutz schaut dich an, als ob du jetzt entscheidest, was für ein Mensch er werden soll.',
  O('Den Anführer laufen lassen. „Komm nie wieder.“', 'ende_gnade'),
  O('Ihn gefesselt ins Dorf bringen, damit der Rat richtet', 'ende_gericht'),
  O('Lutz die Wahl lassen', 'lutz_wahl'))
s['lutz_wahl'] = S('berg', 'Lutz steht lange über dem Mann, der ihm Brot und Prügel gegeben hat. Dann wirft er den Speer weg. „Ich will nicht so werden wie ihr. Wie ihr alle.“ Er meint auch das Dorf.',
  O('Ihm die Hand reichen', 'ende_lutz'))
s['ende_lutz'] = E('dorf', 'Im Dorf wird getuschelt, als du mit Lutz zurückkommst. Die alte Wäscherin geht als Erste auf ihn zu. Sie sagt nichts, sie drückt ihm nur einen Laib Brot in die Hand. Er nimmt ihn. Ob das reicht, wird sich zeigen. Aber es ist ein Anfang.',
  {'chronik': ['klamm_lutz', 'Ich habe Lutz vom Gerberhof nach Hause gebracht. Das Dorf schuldet ihm mehr als ein Brot.'], 'beute': {'stufe': 2, 'text': 'Lutz gibt dir das Einzige, was er aus seiner Söldnerzeit behalten will:'}, 'begleiter_sym': 4})
s['ende_freikauf'] = E('dorf', 'Lutz geht neben dir her, schweigend, bis das Dorf in Sicht kommt. Dann bleibt er stehen. „Warum?“ Du hast keine gute Antwort. Vielleicht, weil jemand dafür bezahlen sollte, was im Hungerwinter passiert ist. Vielleicht du.',
  {'chronik': ['klamm_freikauf', 'Ich habe Lutz freigekauft. Fünfzig Scheite und ein Messer – billiger als ein schlechtes Gewissen.']})
s['ende_handel'] = E('dorf', 'Das Fass Korn tut weh. Aber niemand ist gestorben. Als du zurückblickst, steht Lutz am Feuer und schaut dir nach. Du wirst nie erfahren, ob er dich erkannt hat.',
  {'dorf': {'nahrung': -20}, 'chronik': ['klamm_handel', 'Ich habe an der Klamm verhandelt statt zu kämpfen. Lutz ist geblieben, wo er war.']})
s['ende_warnung'] = E('dorf', 'Das Dorf stellt Wachen auf, Tag und Nacht. Als die Söldner kommen, finden sie verschlossene Tore und Fackeln. Sie ziehen ab. Einer bleibt zurück und wirft etwas über den Zaun: einen zu großen Helm.',
  {'chronik': ['klamm_warnung', 'Lutz hat uns gewarnt. Er ist bei den Söldnern geblieben – oder sie haben ihn nicht gehen lassen.'], 'beute': {'stufe': 1, 'text': 'Im Helm steckt etwas, eingewickelt in ein Tuch:'}})
s['ende_nacht'] = E('dorf', 'Sie kommen im Morgengrauen und finden ein wachendes Dorf. Nach kurzem Gefecht ziehen sie ab. Lutz hat die ganze Zeit neben dem Tor gestanden, kreidebleich. Danach redet zum ersten Mal seit Jahren jemand mit ihm, als gehöre er dazu.',
  {'chronik': ['klamm_nacht', 'Lutz ist nachts zu mir gekommen. Er hat das Dorf gerettet, das ihn verstoßen hat.'], 'beute': {'stufe': 1}})
s['ende_gnade'] = E('dorf', 'Der Anführer humpelt davon. Lutz kommt mit dir, aber er redet den ganzen Weg kein Wort. Vielleicht hätte er sich etwas anderes gewünscht. Vielleicht genau das.',
  {'chronik': ['klamm_gnade', 'Ich habe den Söldnerführer laufen lassen. Gnade oder Dummheit – das wird sich zeigen.']})
s['ende_gericht'] = E('dorf', 'Der Rat verurteilt den Söldner zur Arbeit im Steinbruch. Gerecht, sagen die einen. Die anderen sagen, der Rat habe sich schon einmal geirrt, im Hungerwinter. Lutz sitzt in der hintersten Reihe und hört zu.',
  {'chronik': ['klamm_gericht', 'Ich habe den Söldnerführer vor den Rat gebracht. Das Dorf hat gerichtet – und sich selbst dabei zugesehen.'], 'beute': {'stufe': 1}})
s['ende_niederlage'] = E('dorf', 'Mit leeren Händen und dröhnendem Schädel kehrst du heim. Die Klamm bleibt gesperrt, bis die Söldner von selbst weiterziehen. Manchmal verliert man. Wichtig ist, was man daraus macht.',
  {'chronik': ['klamm_niederlage', 'Ich habe an der Klamm verloren.']})
Q.append(dict(id='g_klamm', titel='Der Zoll an der Klamm', kurz='Söldner sperren den Weg nach Süden. Einer von ihnen ist ein Junge, den das Dorf einmal verstoßen hat.', start='start', szenen=s, schwer=2))

# ───────────── 2. Kampf: Was im Moor heult ─────────────
s = {}
s['start'] = S('dorf', 'Drei Schafe in drei Nächten, zerrissen am Rand des Moores. Die Leute reden von einem Werwolf. Der Schmied hat Silbernägel geschmiedet, die Kinder schlafen bei Licht. Der Hirte schwört, er habe es gesehen: groß wie ein Kalb, mit Augen wie Glut.',
  O('Mit dem Hirten zu den Kadavern gehen', 'kadaver'),
  O('Im Dorf fragen, wer zuletzt im Moor war', 'fragen'),
  O('Silbernägel einstecken und gleich los', 'weg', folgen={'flag': ['silber']}))
s['fragen'] = S('dorf', 'Niemand geht freiwillig ins Moor. Nur der alte Ebbo, der Torfstecher, der seit dem Tod seiner Frau draußen in einer Hütte lebt. „Der redet mit Hunden“, sagt jemand. „Und mit Toten.“ Und dann: Vor einem Monat hat der Rat Ebbo das Torfrecht entzogen. Weil er nicht mehr zahlen konnte.',
  O('Zu Ebbos Hütte gehen', 'weg', folgen={'flag': ['ebbo_verdacht']}),
  O('Erst die Kadaver ansehen', 'kadaver'))
s['kadaver'] = MG('wald', 'Die Kadaver liegen im Schilf. Fliegen. Der Hirte hält sich die Nase zu. Du kniest dich hin und liest, was der Boden erzählt.', 'spuren', 2, 'Spuren deuten',
  B('Keine Klauen, keine riesigen Pfoten. Hundespuren – große, aber Hunde. Zwei. Und dazwischen der Abdruck eines Stiefels mit geflicktem Absatz.', 'weg', folgen={'flag': ['hundespur', 'stiefel']}),
  B('Der Boden ist zertrampelt, du erkennst nichts Sicheres. Nur: Was immer es war, es war nicht allein.', 'weg'))
s['weg'] = R('wald', 'Das Moor beginnt, wo die Birken krumm werden. Der Boden schmatzt unter jedem Schritt. Nebel kriecht zwischen den Grasbulten hervor.', 45, 'hütte', unterwegs='Du gehst {mit} ins Nebelmoor.', begegnung=['b_irrlicht'], chance=0.4)
s['b_irrlicht'] = S('wald', 'Ein Licht schwebt über dem Wasser, flackernd, lockend. Der Hirte, falls er mitkam, würde jetzt beten. Es zieht dich in eine andere Richtung als den Pfad.',
  P('Dem Licht nicht folgen und den festen Weg suchen', 'spuren', 11,
    B('Du hältst dich an die Birken. Das Licht verlischt, enttäuscht, so scheint es.', 'hütte'),
    B('Ein Fehltritt, du versinkst bis zur Hüfte. Mühsam ziehst du dich heraus, durchnässt und frierend.', 'hütte', folgen={'flag': ['nass']})))
s['hütte'] = S('wald', 'Ebbos Hütte steht auf Pfählen. Davor zwei Hunde, groß, mager, mit verfilztem Fell – Wolfshunde. Sie knurren nicht. Sie warten. In der Tür steht Ebbo, ein Beil in der Hand. „Ich weiß, warum du kommst. Sie sind’s nicht gewesen.“',
  O('„Die Spuren sagen etwas anderes.“', 'ebbo_streit', wenn={'flag': 'hundespur'}),
  P('Seine Augen lesen: lügt er?', 'menschenkenntnis', 12,
    B('Er lügt nicht – nicht ganz. Er glaubt, was er sagt. Aber er verschweigt etwas. Er hat Angst, und nicht vor dir.', 'ebbo_angst'),
    B('Sein Gesicht ist wie Torf: braun, rissig, unlesbar.', 'ebbo_streit')),
  O('Ohne Warnung angreifen, bevor die Hunde es tun', 'kampf_hunde', tag='[Kampf]'))
s['ebbo_streit'] = S('wald', '„Die Spuren!“ Ebbo lacht heiser. „Meine Hunde waren hier, angebunden, jede Nacht. Aber ihr glaubt ja lieber an Werwölfe – oder an den Alten, dem ihr das Torfrecht genommen habt.“ Die Hunde stellen die Nackenhaare auf.',
  P('Ruhig bleiben und die Hunde besänftigen', 'beruhigen', 13,
    B('Du gehst in die Hocke, redest leise. Der größere Hund schnüffelt an deiner Hand. Ebbo senkt das Beil. „Na gut. Komm rein.“', 'ebbo_angst'),
    B('Ein Hund springt. Ebbo schreit etwas – zu spät.', 'kampf_hunde')),
  O('„Zeig mir deine Stiefel.“', 'stiefel', wenn={'flag': 'stiefel'}))
s['stiefel'] = S('wald', 'Ebbo zögert, dann hebt er einen Fuß. Der Absatz ist heil. „Zufrieden?“ Aber an der Wand hängt ein zweites Paar. Mit geflicktem Absatz. Zu klein für Ebbo.',
  O('„Wem gehören die?“', 'ebbo_angst'))
s['ebbo_angst'] = S('wald', 'Drinnen riecht es nach Rauch und nassem Hund. Ebbo setzt sich schwer. „Mein Enkel. Jannik. Kam vor zwei Monaten aus Rabenfels, desertiert. Wenn sie ihn finden, hängen sie ihn. Er hat Hunger. Er hat die Hunde nachts mitgenommen. Ich hab’s zu spät gemerkt.“ Er sieht dich an. „Er ist da draußen. Er kommt heute Nacht wieder.“',
  O('„Dann warten wir auf ihn. Zusammen.“', 'nacht'),
  O('„Das muss das Dorf erfahren.“', 'ende_verrat', ergebnis='Ebbo sagt nichts mehr. Er sieht nur zu, wie du gehst.'))
s['nacht'] = S('wald', 'Die Nacht kommt schnell im Moor. Du liegst mit Ebbo im Schilf. Gegen Mitternacht: Hecheln, Schritte. Ein junger Mann, abgemagert, mit einem Messer, die Hunde an der Leine. Aber nicht nur er. Hinter ihm, im Nebel, Fackeln. Drei Reiter in Grau. Häscher aus Rabenfels.',
  O('Jannik warnen und die Häscher aufhalten', 'kampf_haescher', tag='[Kampf]'),
  P('Die Häscher mit einer Lüge auf eine falsche Fährte schicken', 'ueberreden', 14,
    B('„Der Deserteur? Richtung Furt, vor einer Stunde.“ Der Anführer mustert dich, dann reißt er sein Pferd herum. Jannik zittert im Schilf.', 'jannik'),
    B('„Du lügst.“ Der Anführer zieht das Schwert. „Und wer lügt, versteckt etwas.“', 'kampf_haescher')),
  O('Still bleiben. Die Häscher tun lassen, was sie tun.', 'ende_haescher'))
s['kampf_hunde'] = K('wald', 'Die Wolfshunde greifen an, schnell und lautlos.', 'Die Hunde im Moor', 'tiere', 240,
  B('Die Hunde liegen still. Ebbo kniet weinend neben ihnen. „Sie waren alles, was ich hatte.“ Später findest du heraus, wer sie nachts mitgenommen hat. Aber das bringt keinen Hund zurück.', 'ende_hunde'),
  B('Du fliehst blutend aus dem Moor.', 'ende_flucht', folgen={'gefahr': 1}), schwer=1)
s['kampf_haescher'] = K('wald', 'Fackeln, Pferde, Stahl. Ebbos Hunde stürzen sich auf die Pferde, Jannik schreit.', 'Häscher aus Rabenfels', 'banditen', 360,
  B('Die Häscher fliehen, einer ist verwundet. Sie werden wiederkommen – oder melden, dass im Hügelland jemand Deserteure schützt.', 'jannik', folgen={'flag': ['haescher_geschlagen']}),
  B('Jannik wird gepackt und aufs Pferd geworfen. Ebbo schreit seinen Namen in den Nebel.', 'ende_haescher', folgen={'gefahr': 1}), schwer=2)
s['jannik'] = S('wald', 'Jannik sitzt in Ebbos Hütte, eingehüllt in eine Decke. „Ich wollte nicht stehlen. Aber ich konnte nicht ins Dorf. Jeder hätte gefragt, wer ich bin.“ Ebbo hält seine Hand. Die Schafe, die zerrissenen Schafe – jemand muss dafür geradestehen.',
  O('„Komm mit ins Dorf. Erzähl es selbst. Ich stehe neben dir.“', 'ende_beichte'),
  O('Die Schafe selbst bezahlen und schweigen', 'ende_schweigen', folgen={'holz': -30}),
  O('Jannik helfen, weiter nach Süden zu fliehen', 'ende_flucht_jannik'))
s['ende_beichte'] = E('dorf', 'Der Rat hört Jannik an. Es gibt Geschrei, dann Schweigen, dann einen Vorschlag: Er hütet den Winter über die Schafe, um sie abzuarbeiten. Ebbo bekommt sein Torfrecht zurück – auf Bewährung. Der Werwolf ist tot. Ein Junge lebt.',
  {'chronik': ['moor_beichte', 'Ich habe Jannik vor den Rat gebracht – nicht als Gefangenen, sondern als jemanden, der etwas zu sagen hat.'], 'beute': {'stufe': 2, 'text': 'Ebbo drückt dir etwas in die Hand, das seiner Frau gehörte:'}})
s['ende_schweigen'] = E('dorf', 'Du sagst dem Dorf, der Werwolf sei tot, und bezahlst die Schafe aus eigener Tasche. Die Kinder schlafen wieder ohne Licht. Nur du weißt, was im Moor lebt. Eine Lüge, die niemandem schadet. Hoffst du.',
  {'chronik': ['moor_schweigen', 'Ich habe für Jannik gelogen. Der Werwolf ist tot, sage ich. Es stimmt sogar.'], 'beute': {'stufe': 1}})
s['ende_flucht_jannik'] = E('dorf', 'Du bringst Jannik bis zur Straße nach Süden, gibst ihm Brot und einen Namen, den er benutzen kann. Ebbo bleibt allein im Moor. Er winkt dir nicht nach, als du zurückkommst. Aber er nickt.',
  {'chronik': ['moor_flucht', 'Ich habe einem Deserteur zur Flucht verholfen. Rabenfels würde mich dafür hängen.']})
s['ende_haescher'] = E('dorf', 'Die Häscher reiten mit Jannik davon. In Rabenfels hängen sie Deserteure am Tor. Ebbo kommt nicht mehr ins Dorf, nie mehr. Die Schafe werden nicht mehr gerissen. Das Dorf nennt dich den, der den Werwolf vertrieben hat.',
  {'chronik': ['moor_haescher', 'Ich habe zugesehen, wie sie Jannik mitnahmen. Das Dorf feiert mich dafür.']})
s['ende_verrat'] = E('dorf', 'Der Rat schickt Männer ins Moor. Jannik flieht, die Hunde werden erschlagen, Ebbo verliert seine Hütte. Das Dorf ist sicher. Es hat dich nur ein Stück von dir selbst gekostet.',
  {'chronik': ['moor_verrat', 'Ich habe Ebbo verraten. Es war das Richtige für das Dorf. Glaube ich.']})
s['ende_hunde'] = E('dorf', 'Du kommst mit zwei Hundefellen zurück. Das Dorf jubelt: der Werwolf ist tot. Ebbo kommt nie wieder ins Dorf. Erst Wochen später erfährst du von dem Jungen, den er versteckte.',
  {'chronik': ['moor_hunde', 'Ich habe Ebbos Hunde getötet. Sie waren nicht das Ungeheuer.']})
s['ende_flucht'] = E('dorf', 'Mit zerbissenem Arm kommst du zurück. Das Moor behält seine Geheimnisse.', {'chronik': ['moor_flucht_selbst', 'Das Moor hat mich zurückgeschickt.']})
Q.append(dict(id='g_moor', titel='Was im Moor heult', kurz='Etwas reißt Schafe am Moor. Das Dorf spricht von einem Werwolf. Die Spuren erzählen etwas anderes.', start='start', szenen=s, schwer=2))

# ───────────── 3. Denken: Das Siegel der Witwe ─────────────
s = {}
s['start'] = S('dorf', 'Die alte Gesine ist gestorben, reich für Dorfverhältnisse: ein Hof, zwei Kühe, ein Silberbecher. Jetzt liegen zwei Testamente auf dem Tisch des Rats. Eins vermacht alles ihrer Nichte Marlene, die sie gepflegt hat. Das andere ihrem Neffen Kaspar, der in der Stadt lebt. Beide tragen Gesines Siegel. Der Rat bittet dich, die Wahrheit zu finden.',
  O('Die Testamente genau untersuchen', 'papiere'),
  O('Mit Marlene sprechen', 'marlene'),
  O('Mit Kaspar sprechen', 'kaspar'))
s['papiere'] = S('dorf', 'Zwei Pergamente. Marlenes Testament ist fleckig, die Schrift zittrig, datiert auf den Herbst. Kaspars ist sauber, mit fester Hand geschrieben, datiert auf den Winter – also später. Das Siegel: ein Ährenkranz. Bei Kaspars Testament ist das Wachs dunkler.',
  P('Das Siegel vergleichen', 'altes_wissen', 12,
    B('In Marlenes Siegel ist ein winziger Riss im Ährenkranz – eine Kerbe im Siegelring. Kaspars Siegel ist makellos. Entweder wurde der Ring repariert … oder es ist ein anderer Ring.', 'papiere2', folgen={'flag': ['kerbe']}),
    B('Für dich sehen beide Siegel gleich aus.', 'papiere2')),
  O('Die Schrift vergleichen', 'papiere2', ergebnis='Gesines Hände zitterten im letzten Jahr, das weiß jeder. Kaspars Testament ist mit ruhiger Hand geschrieben. Hat sie es diktiert? Wem?', folgen={'flag': ['schrift']}))
s['papiere2'] = S('dorf', 'Wo ist Gesines Siegelring jetzt? Der Rat weiß es nicht. Im Nachlass war er nicht.',
  O('Marlene befragen', 'marlene'), O('Kaspar befragen', 'kaspar'), O('Gesines Hof durchsuchen', 'hof'))
s['marlene'] = S('dorf', 'Marlene ist rotäugig und müde. „Drei Jahre hab ich sie gewaschen, gefüttert, ihr vorgelesen. Kaspar kam zweimal. Zur Kirmes.“ Sie verschränkt die Arme. „Ja, ich will den Hof. Ich hab ihn verdient.“',
  P('Fragen, wo der Siegelring ist', 'menschenkenntnis', 11,
    B('Sie zögert eine Sekunde zu lange. „Weiß ich nicht.“ Sie weiß es.', 'marlene2', folgen={'flag': ['marlene_luegt']}),
    B('„Keine Ahnung. Tante Gesine trug ihn immer.“', 'marlene2')),
  O('„Hat Gesine dir je gesagt, was sie wollte?“', 'marlene2', ergebnis='„Sie hat gesagt, Kaspar soll den Becher kriegen. Weil er ihn als Kind so mochte. Sonst nichts.“', folgen={'flag': ['becher']}))
s['marlene2'] = S('dorf', 'Marlene steht auf. „Ich muss die Kühe melken. Meine Kühe.“',
  O('Kaspar befragen', 'kaspar', wenn={'nicht_flag': 'kaspar_besucht'}), O('Gesines Hof durchsuchen', 'hof'), O('Zum Rat gehen und entscheiden', 'rat'))
s['kaspar'] = S('dorf', 'Kaspar trägt Stadtkleider und ein freundliches Lächeln. „Tante Gesine hat mir im Winter geschrieben. Sie hatte Angst, dass Marlene sie bestiehlt. Ich bin sofort gekommen, und sie hat mir das Testament diktiert. Dem Schreiber Ulf aus Furtenau.“',
  P('Seine Geschichte prüfen: Wann genau war er da?', 'menschenkenntnis', 13,
    B('„Im Januar“, sagt er. Aber im Januar war der Pass zugeschneit, drei Wochen lang. Das weißt du. Er weiß es offenbar nicht.', 'kaspar2', folgen={'flag': ['januar']}),
    B('Seine Geschichte klingt glatt. Zu glatt? Oder einfach wahr?', 'kaspar2')),
  O('„Darf ich den Brief sehen, den sie dir schrieb?“', 'kaspar2', ergebnis='„Verbrannt. Sie bat mich darum.“ Natürlich.', folgen={'flag': ['kaspar_besucht']}))
s['kaspar2'] = S('dorf', 'Kaspar lächelt weiter. „Ich will Marlene nichts Böses. Sie kann bleiben, als Magd.“',
  O('Gesines Hof durchsuchen', 'hof'), O('Marlene befragen', 'marlene', wenn={'nicht_flag': 'marlene_luegt'}), O('Zum Rat gehen und entscheiden', 'rat'))
s['hof'] = MG('dorf', 'Gesines Kammer. Ein Bett, eine Truhe mit Schloss, ein Spinnrad. Unter dem Bett eine lose Diele.', 'schloss', 2, 'Die Truhe öffnen',
  B('Klick. In der Truhe: Wäsche, ein Gebetbuch – und darin eingelegt ein Zettel mit Gesines zittriger Schrift.', 'zettel', folgen={'flag': ['zettel']}),
  B('Das Schloss gibt nicht nach. Aber unter der Diele findest du etwas.', 'diele'))
s['zettel'] = RZ('dorf', 'Auf dem Zettel steht ein Vers – Gesine liebte Rätsel, das wusste jeder. Darunter: „Wer dies löst, weiß, wo mein Wille ruht.“',
  'Ich trag dein Zeichen, doch schreib ich nie; ich mach dich wahr und lüge nie. Wer mich verliert, verliert den Mund, mit dem er spricht zur letzten Stund. Was bin ich?',
  ['siegel', 'siegelring', 'ring', 'der siegelring', 'das siegel', 'mein siegel'],
  B('Der Siegelring. Und dann siehst du es: Am Spinnrad, in der Spindel versteckt, steckt ein Ring mit einem Ährenkranz – und einer Kerbe.', 'ring', folgen={'flag': ['ring']}),
  B('Du kommst nicht drauf. Aber unter der Diele ist noch etwas.', 'diele'),
  hinweise=['Es hat mit Wachs zu tun.', 'Gesine trug ihn am Finger.'], versuche=3)
s['diele'] = S('dorf', 'Unter der Diele: ein kleiner Lederbeutel. Darin drei Silbermünzen mit dem Stempel der Stadtmünze – und eine Quittung über einen Siegelring, gefertigt von einem Goldschmied in Furtenau. Bestellt im Dezember. Auf den Namen Kaspar.',
  O('Damit zum Rat', 'rat', folgen={'flag': ['quittung']}))
s['ring'] = S('dorf', 'Der echte Ring hat die Kerbe. Also ist Marlenes Testament mit dem echten Ring gesiegelt – und Kaspars mit einem nachgemachten. Aber warum hat Marlene gezögert, als du nach dem Ring fragtest? Weil sie wusste, wo er war. Hat sie ihn versteckt, damit niemand ein neues Testament siegeln kann? Oder hat Gesine ihn selbst versteckt?',
  O('Zum Rat, mit allem, was du weißt', 'rat'))
s['rat'] = S('dorf', 'Der Rat sitzt um den Tisch. Marlene auf der einen Seite, Kaspar auf der anderen. Alle sehen dich an.',
  O('„Kaspars Testament ist gefälscht. Der Ring beweist es.“', 'ende_beweis', wenn={'flag': 'ring'}),
  O('„Kaspar hat sich einen Ring machen lassen. Hier ist die Quittung.“', 'ende_beweis', wenn={'flag': 'quittung'}),
  P('„Kaspar war im Januar gar nicht hier. Der Pass war zu.“', 'ueberreden', 12,
    B('Kaspar wird blass. Dann rot. Dann gesteht er nicht – aber er zieht sein Testament zurück. „Ich will keinen Streit in der Familie.“', 'ende_rueckzug'),
    B('„Ich kam über die Furt“, sagt Kaspar ruhig. Der Rat zuckt mit den Schultern. Zweifel bleibt.', 'ende_teilung'), wenn={'flag': 'januar'}),
  O('„Ich kann nichts beweisen. Teilt den Hof.“', 'ende_teilung'),
  O('„Marlene hat den Ring versteckt. Auch sie hat gelogen.“', 'ende_beide', wenn={'flag': 'marlene_luegt'}))
s['ende_beweis'] = E('dorf', 'Kaspar wird aus dem Dorf gewiesen, seine Fälschung vor allen verbrannt. Marlene bekommt den Hof. Als alle gegangen sind, kommt sie zu dir. „Ich hab den Ring versteckt“, sagt sie. „Damit er genau das nicht tun kann. Gesine hat es gewusst.“ Sie gibt dir den Silberbecher. „Den hätte sie dir gegönnt.“',
  {'chronik': ['siegel_beweis', 'Ich habe Kaspars Fälschung aufgedeckt. Marlene hat den Hof – und mir einen Becher geschenkt.'], 'beute': {'stufe': 2, 'text': 'Marlene drückt dir den Silberbecher in die Hand – und noch etwas aus Gesines Truhe:'}})
s['ende_rueckzug'] = E('dorf', 'Kaspar reist ab, ohne sich zu verabschieden. Marlene bekommt den Hof. Ob er ein Betrüger war oder nur ein Mann, der sich in eine schlechte Idee verrannt hat, wirst du nie ganz wissen.',
  {'chronik': ['siegel_rueckzug', 'Kaspar hat sein Testament zurückgezogen. Ohne Beweis, aber mit genug Zweifel.'], 'beute': {'stufe': 1}})
s['ende_teilung'] = E('dorf', 'Der Rat teilt: Marlene den Hof, Kaspar die Kühe und den Becher. Beide sind unzufrieden. Das, sagt der Älteste, ist meistens ein Zeichen, dass es gerecht war. Du bist dir da nicht so sicher.',
  {'chronik': ['siegel_teilung', 'Gesines Erbe wurde geteilt. Niemand ist zufrieden. Vielleicht war das gerecht.']})
s['ende_beide'] = E('dorf', 'Der Rat ist empört – über beide. Marlene muss sich erklären. Sie tut es, mit Tränen: Sie habe den Ring versteckt, weil sie Kaspar nicht traute. Am Ende bekommt sie den Hof, aber das Dorf sieht sie anders an. Wahrheit hat ihren Preis, auch wenn sie richtig ist.',
  {'chronik': ['siegel_beide', 'Ich habe beide Lügen aufgedeckt. Die Wahrheit war richtig – und sie hat trotzdem jemandem wehgetan.'], 'beute': {'stufe': 1}})
Q.append(dict(id='g_siegel', titel='Das Siegel der Witwe', kurz='Zwei Testamente, ein Siegel, und eine Tote, die Rätsel liebte. Der Rat bittet dich, die Wahrheit zu finden.', start='start', szenen=s, schwer=1))

# ───────────── 4. Denken: Die stille Krankheit ─────────────
s = {}
s['start'] = S('dorf', 'Im Haus des Böttchers Harm sind alle krank: Harm, seine Frau, die drei Kinder. Bauchkrämpfe, Zittern, graue Haut. Seit dem Frühjahr wird es schlimmer. Sonst ist im Dorf niemand krank. Die Leute bekreuzigen sich, wenn sie vorbeigehen. „Ein Fluch“, flüstern sie. „Harm hat sich mit der Kräuterfrau gestritten.“',
  O('Das Haus der Familie untersuchen', 'haus'),
  O('Mit der Kräuterfrau sprechen', 'kraeuterfrau'),
  O('Die Kranken selbst untersuchen', 'kranke'))
s['kranke'] = S('dorf', 'Die Jüngste liegt auf dem Strohsack, ihr Zahnfleisch hat einen bläulichen Saum. Harm kann kaum die Hand heben. „Wir essen, was alle essen“, flüstert er. „Wir trinken aus dem Brunnen wie alle.“',
  P('Die Anzeichen deuten', 'heilkunde', 13,
    B('Der blaue Saum am Zahnfleisch, das Zittern – kein Fieber, keine Seuche. So etwas hast du einmal bei einem Bergmann gesehen. Gift. Langsames Gift, das sich im Körper sammelt.', 'haus', folgen={'flag': ['gift_erkannt']}),
    B('Das ist keine Krankheit, die du kennst. Aber Fluch? Daran glaubst du nicht.', 'haus')))
s['haus'] = S('dorf', 'Das Haus ist sauber, ärmlich. Fässer in jeder Ecke – Harm ist Böttcher. In der Küche glänzt ein neuer Kessel, kupferrot, im Frühjahr gekauft von einem fahrenden Händler. Daneben Krüge mit Apfelmost, ein Topf mit sauren Bohnen.',
  O('Den Kessel genauer ansehen', 'kessel'),
  O('Die Fässer untersuchen', 'faesser'),
  O('Den Most probieren', 'most', ergebnis='Süß, sehr süß. Harm sagt, sie trinken ihn seit dem Frühjahr jeden Abend – das letzte Fass vom Vorjahr, gesüßt nach einem alten Rezept seiner Großmutter.'))
s['kessel'] = S('dorf', 'Der Kessel ist innen verzinnt – schlecht. An mehreren Stellen glänzt grauweißes Metall durch. Der Händler hat behauptet, es sei Zinn. Ist es das?',
  P('Das Metall erkennen', 'altes_wissen', 13,
    B('Es ist kein reines Zinn. Es ist weich, lässt sich mit dem Fingernagel ritzen – Blei. Wer darin Saures kocht, kocht Gift.', 'spur', folgen={'flag': ['blei_kessel']}),
    B('Du bist dir nicht sicher. Metall ist Metall.', 'spur')))
s['faesser'] = S('dorf', 'Die Fässer sind gut gemacht, Harm versteht sein Handwerk. Eins steht abseits: das Mostfass. An der Innenseite eine graue Kruste. „Großmutters Rezept“, sagt Harms Frau schwach. „Bleizucker. Macht den Most süß und haltbar.“',
  O('„Bleizucker?!“', 'spur', ergebnis='Sie weiß nicht, was sie sagt. Für sie ist es Zucker. Für dich ist es die Antwort – oder ein Teil davon.', folgen={'flag': ['bleizucker']}))
s['most'] = S('dorf', 'Der süße Nachgeschmack bleibt lange auf der Zunge. Ein bisschen metallisch.',
  O('Die Fässer untersuchen', 'faesser'), O('Den Kessel ansehen', 'kessel'))
s['kraeuterfrau'] = S('dorf', 'Die Kräuterfrau wohnt am Waldrand. Sie lacht freudlos, als du von Fluch sprichst. „Harm hat mir im Winter Fässer versprochen und nicht geliefert. Ich hab ihn verflucht, ja. Mit Worten. Wenn Worte töten könnten, wäre das halbe Dorf tot.“ Sie wird ernst. „Aber was die haben, ist kein Fluch. Bring mir eine Probe von dem, was sie essen.“',
  O('Zurück zum Haus, Proben holen', 'haus', folgen={'flag': ['kf_hilft']}),
  P('„Sie geben dir die Schuld. Wenn du hilfst, hört das auf.“', 'ueberreden', 10,
    B('Sie seufzt. „Na gut. Ich komme mit.“', 'haus', folgen={'flag': ['kf_hilft', 'kf_dabei']}),
    B('„Das hört nie auf“, sagt sie. „Aber bring mir die Probe.“', 'haus', folgen={'flag': ['kf_hilft']})))
s['spur'] = S('dorf', 'Du hast genug gesehen, um zu wissen: Das Gift kommt aus diesem Haus. Die Frage ist nur noch, was du damit machst – und wem du es sagst. Draußen hat sich eine Menge gesammelt. Jemand hat eine Fackel. „Verbrennt die Hexe!“, ruft einer. Sie meinen die Kräuterfrau.',
  O('Vor die Menge treten und erklären', 'menge'),
  O('Erst die Familie behandeln, dann die Menge', 'behandeln'))
s['behandeln'] = MG('dorf', 'Die Familie muss sofort aufhören, Most zu trinken und aus dem Kessel zu essen. Aber das Gift ist schon in ihnen. Die Kräuterfrau kennt ein Mittel – wenn sie hier wäre. Sonst bleibt nur, was du selbst weißt.', 'kraeuter', 2, 'Ein Gegenmittel mischen',
  B('Milch, Eiweiß, ein Sud aus Brennnessel – es wird Wochen dauern, aber das Zittern lässt schon nach einer Stunde nach. Sie werden leben.', 'menge', folgen={'flag': ['geheilt']}),
  B('Du tust, was du kannst. Ob es reicht, weiß niemand.', 'menge'))
s['menge'] = S('dorf', 'Die Menge vor dem Haus. Fackeln, Wut, Angst – vor allem Angst. Wenn es kein Fluch ist, ist es etwas, das jeden treffen kann. Das macht mehr Angst als eine Hexe.',
  P('„Es ist Blei! Im Most und im Kessel! Die Kräuterfrau hat nichts getan!“', 'ueberreden', 13,
    B('Erst Stille. Dann fragt jemand: „Blei? Meine Großmutter hat auch Bleizucker benutzt.“ Plötzlich rennen die Leute nach Hause, zu ihren eigenen Mostfässern. Die Fackeln sind vergessen.', 'ende_wahrheit'),
    B('„Ausreden! Die Hexe hat ihn bezahlt!“ Die Menge drängt vorwärts.', 'ende_angst'), wenn={'flag': 'bleizucker'}),
  P('„Der Kessel des Händlers ist vergiftet! Wer hat noch einen gekauft?“', 'ueberreden', 12,
    B('Drei Hände gehen hoch. Gemurmel, dann Panik – aber die richtige Art von Panik. Die Kessel werden in den Bach geworfen.', 'ende_wahrheit'),
    B('Niemand glaubt dir. Ein Kessel? Lächerlich.', 'ende_angst'), wenn={'flag': 'blei_kessel'}),
  P('Die Menge beruhigen, ohne Beweis', 'beruhigen', 15,
    B('Deine Ruhe steckt an. Einer nach dem anderen senkt die Fackel. „Morgen“, sagt jemand. „Morgen reden wir weiter.“', 'ende_aufschub'),
    B('Es nützt nichts.', 'ende_angst')))
s['ende_wahrheit'] = E('dorf', 'In drei weiteren Häusern findet man Bleizucker, in zweien einen der Kessel. Niemand sonst war schon so krank wie Harms Familie – noch nicht. Die Kräuterfrau bekommt keine Entschuldigung. Aber am nächsten Markttag kaufen die Leute wieder bei ihr. Das ist im Dorf dasselbe.',
  {'chronik': ['krankheit_wahrheit', 'Ich habe das Gift in Harms Haus gefunden. Kein Fluch – Blei. Das Dorf hat seine Fackeln gelöscht.'], 'beute': {'stufe': 2, 'text': 'Harm, noch zitternd, gibt dir das Beste, was er hat:'}})
s['ende_aufschub'] = E('dorf', 'Die Nacht vergeht ohne Feuer. Am Morgen ist die Wut verraucht, aber der Verdacht bleibt an der Kräuterfrau kleben. Harms Familie erholt sich langsam, seit sie keinen Most mehr trinken – ein Zufall, sagen die Leute.',
  {'chronik': ['krankheit_aufschub', 'Ich habe die Menge beruhigt, aber die Wahrheit kam nicht ans Licht.']})
s['ende_angst'] = E('dorf', 'Die Menge zieht zum Waldrand. Die Kräuterfrau ist geflohen, ihre Hütte brennt. Harms Familie erholt sich trotzdem, weil sie nach deinem Rat keinen Most mehr trinkt. Das Dorf glaubt, der Fluch sei mit dem Feuer gebrochen.',
  {'chronik': ['krankheit_angst', 'Sie haben die Hütte der Kräuterfrau verbrannt. Ich hatte die Wahrheit und konnte sie nicht hörbar machen.']})
Q.append(dict(id='g_krankheit', titel='Die stille Krankheit', kurz='Eine Familie siecht dahin, sonst niemand. Das Dorf flüstert von einem Fluch – und hat schon jemanden im Verdacht.', start='start', szenen=s, schwer=1))

# ───────────── 5. Überzeugen/Philosophie: Der Prediger von der Heide ─────────────
s = {}
s['start'] = S('dorf', 'Seit drei Tagen predigt ein Wanderprediger auf dem Dorfplatz. Bruder Anshelm, hager, mit Augen, die brennen. „Fremde bringen Seuchen, Diebstahl und Unglauben!“ Und das Schlimme: Letzten Monat hat tatsächlich ein Fremder Hühner gestohlen. Die Menge wird jeden Abend größer. Heute verlangt Anshelm, dass die zwei Familien, die im Sommer aus Rabenfels gekommen sind, das Dorf verlassen.',
  O('Zuhören, was er genau sagt', 'predigt'),
  O('Mit den Familien aus Rabenfels sprechen', 'familien'),
  O('Nach dem Prediger fragen: Wer ist er?', 'herkunft'))
s['predigt'] = S('dorf', '„Ich frage euch“, ruft Anshelm, „wer hat euer Korn gegessen im letzten Winter? Wer schläft in den Häusern, die eure Söhne bauen sollten? Ist es Hass, das eigene Haus zu schützen? Oder ist es Liebe?“ Die Leute nicken. Er sagt nicht nur Falsches. Das macht ihn gefährlich.',
  P('Seine Rede durchschauen: Was will er wirklich?', 'menschenkenntnis', 12,
    B('Er glaubt, was er sagt – aber er braucht die Menge. Jedes Nicken nährt ihn. Er schaut immer wieder zu einem Mann am Rand: dem reichen Bauern Gottfried, der die Hälfte des Brachlands will, auf dem die Rabenfelser siedeln.', 'nach_predigt', folgen={'flag': ['gottfried']}),
    B('Er ist ein Fanatiker. Oder ein Heiliger. Schwer zu sagen bei Männern mit brennenden Augen.', 'nach_predigt')))
s['herkunft'] = S('dorf', 'Der Wirt weiß mehr. „Anshelm kam aus dem Kloster Morgenstern. Rausgeworfen, sagt man. Und seit er hier ist, sitzt er jeden Abend bei Gottfried am Tisch. Isst gut für einen Bettelmönch.“',
  O('Zu den Familien gehen', 'familien', folgen={'flag': ['gottfried']}), O('Die nächste Predigt anhören', 'predigt', folgen={'flag': ['gottfried']}))
s['familien'] = S('dorf', 'Die Rabenfelser wohnen in zwei Hütten auf dem Brachland, die sie selbst gebaut haben. Eine Frau, Agathe, flickt Netze. „Wir sind geflohen, weil der Graf unsere Männer in den Krieg holen wollte. Wir arbeiten. Wir zahlen. Wir haben niemandem etwas genommen.“ Ein Junge hinter ihr senkt den Kopf. Agathe merkt es nicht.',
  O('Den Jungen beiseite nehmen', 'junge'),
  O('„Ich werde für euch sprechen.“', 'nach_predigt', folgen={'flag': ['versprochen']}))
s['junge'] = S('dorf', 'Der Junge heißt Mats, zwölf Jahre. Nach langem Schweigen platzt es aus ihm heraus: „Die Hühner. Das war ich. Meine kleine Schwester hatte Hunger. Ich wollte es zurückzahlen.“ Er weint. Wenn das herauskommt, hat Anshelm recht – irgendwie.',
  O('„Wir sagen es gemeinsam. Vor allen.“', 'nach_predigt', folgen={'flag': ['mats_beichte']}),
  O('„Das bleibt unter uns.“', 'nach_predigt', folgen={'flag': ['mats_geheim']}))
s['nach_predigt'] = S('dorf', 'Am Abend steht Anshelm wieder auf dem Brunnenrand. „Wer stellt sich mir entgegen?“, ruft er. Die Menge dreht sich um – zu dir.',
  O('Öffentlich mit ihm streiten', 'disput1'),
  O('Ihn nach der Predigt allein aufsuchen', 'allein'),
  O('Gottfrieds Spiel aufdecken', 'gottfried_aufdecken', wenn={'flag': 'gottfried'}))
s['disput1'] = S('dorf', '„Du sprichst von Liebe zum eigenen Haus“, sagst du. Anshelm lächelt. „Und du? Liebst du die Fremden mehr als deine Nachbarn? Würdest du dein Brot einem Rabenfelser geben, wenn dein Kind hungert?“ Eine Falle. Jedes Ja macht dich zum Verräter, jedes Nein zu seinem Gefolgsmann.',
  P('„Wenn mein Kind hungert, frage ich nicht, woher der kommt, der mit mir teilt.“', 'ueberreden', 13,
    B('Ein Raunen. Eine Frau ruft: „Agathe hat mir im Winter Fisch gebracht!“ Anshelm verzieht das Gesicht. Der erste Riss.', 'disput2', folgen={'flag': ['riss']}),
    B('„Schöne Worte“, höhnt Anshelm. „Satte Worte.“ Gelächter.', 'disput2')),
  P('„Du stellst falsche Fragen. Die Wahl ist nicht zwischen Nachbar und Fremdem. Sondern zwischen Angst und Arbeit.“', 'altes_wissen', 14,
    B('Die Leute denken nach. Anshelm merkt, dass Denken sein Feind ist. Er wird lauter.', 'disput2', folgen={'flag': ['riss']}),
    B('Zu abstrakt. Die Menge will einfache Antworten. Anshelm hat sie.', 'disput2')))
s['disput2'] = S('dorf', 'Anshelm hebt die Arme. „Dann sag ihnen die Wahrheit! Wer hat die Hühner gestohlen?“ Er weiß es. Irgendwie weiß er es. Mats steht in der Menge, weiß wie eine Wand.',
  O('Mit Mats nach vorn treten und es selbst sagen lassen', 'ende_beichte', wenn={'flag': 'mats_beichte'}),
  O('„Ein hungriges Kind. Und was hat dein Gönner Gottfried gestohlen?“', 'gottfried_aufdecken', wenn={'flag': 'gottfried'}),
  P('Die Leute an ihre eigenen Hungerwinter erinnern', 'beruhigen', 13,
    B('„Wer von euch hat nie aus Not etwas genommen?“ Stille. Lange. Dann geht der Erste. Und der Zweite. Anshelm bleibt allein auf dem Brunnenrand.', 'ende_leer'),
    B('„Not ist keine Entschuldigung!“, brüllt jemand. Die Stimmung kippt.', 'ende_vertreibung')),
  O('Schweigen', 'ende_vertreibung'))
s['allein'] = S('dorf', 'Anshelm sitzt allein in der Kapelle, das Gesicht in den Händen. Ohne Menge ist er ein müder Mann. „Was willst du?“',
  P('„Warum hat dich das Kloster rausgeworfen?“', 'menschenkenntnis', 12,
    B('Lange Stille. „Ich habe den Abt angeklagt. Er hat die Spenden der Armen für Wein ausgegeben. Niemand hat mir geglaubt. Niemand.“ Er sieht auf. „Jetzt hören sie mir zu.“', 'allein2', folgen={'flag': ['wunde']}),
    B('„Das geht dich nichts an.“', 'allein2')))
s['allein2'] = S('dorf', 'Anshelm steht auf. „Ich habe gesehen, was Menschen tun, wenn man ihnen vertraut. Lieber schütze ich sie vor Fremden als vor sich selbst.“',
  P('„Du warst im Recht, und keiner hat dich gehört. Jetzt hast du unrecht, und alle hören zu. Willst du so jemand sein?“', 'ueberreden', 14,
    B('Er zuckt, als hättest du ihn geschlagen. Dann setzt er sich wieder. „Was soll ich tun?“, fragt er leise. Am nächsten Morgen ist er fort. Auf dem Brunnen liegt ein Zettel: „Vergebt mir.“', 'ende_umkehr'),
    B('„Geh“, sagt er. „Und komm morgen zur Predigt.“', 'nach_predigt2'), wenn={'flag': 'wunde'}),
  O('„Morgen werde ich dir widersprechen. Vor allen.“', 'nach_predigt2'))
s['nach_predigt2'] = S('dorf', 'Der nächste Abend. Anshelm steht auf dem Brunnen. Er sieht dich an, bevor er beginnt.', O('Öffentlich mit ihm streiten', 'disput1'))
s['gottfried_aufdecken'] = S('dorf', '„Wer profitiert, wenn die Rabenfelser gehen?“, fragst du laut. „Wer will das Brachland? Bei wem isst Bruder Anshelm jeden Abend?“ Alle Köpfe drehen sich zu Gottfried. Er läuft rot an. Anshelm starrt ihn an – er hat es nicht gewusst. Oder nicht wissen wollen.',
  O('Gottfried vor dem Rat zur Rede stellen', 'ende_gottfried'))
s['ende_beichte'] = E('dorf', 'Mats sagt es mit zitternder Stimme. Die Menge ist still. Dann tritt Agathe vor und verspricht, die Hühner zu ersetzen, doppelt. Anshelm öffnet den Mund – und schließt ihn wieder. Wer jetzt noch Fremde hasst, hasst ein weinendes Kind. Das bringen nicht viele fertig.',
  {'chronik': ['prediger_beichte', 'Mats hat gestanden, vor allen. Die Wahrheit hat Anshelm entwaffnet, nicht ich.'], 'beute': {'stufe': 1, 'text': 'Agathe bringt dir am nächsten Tag etwas aus Rabenfels:'}})
s['ende_leer'] = E('dorf', 'Am nächsten Morgen ist Anshelm weitergezogen, in ein anderes Dorf, zu anderen Ängsten. Die Rabenfelser bleiben. Das Brachland auch. Der Streit ist nicht gelöst, nur vertagt – wie fast alle Streite.',
  {'chronik': ['prediger_leer', 'Ich habe die Menge an ihre eigene Not erinnert. Anshelm ist weitergezogen.']})
s['ende_umkehr'] = E('dorf', 'Anshelm ist fort. Ob er zurück ins Kloster ging oder in ein anderes Dorf, um dort anders zu predigen, weiß niemand. Die Menge löst sich auf. Ein Mann wollte gehört werden. Am Ende hat ihm jemand zugehört.',
  {'chronik': ['prediger_umkehr', 'Ich habe Anshelm zugehört, als niemand es tat. Er hat aufgehört zu predigen.'], 'beute': {'stufe': 2, 'text': 'In der Kapelle hat er etwas für dich zurückgelassen:'}})
s['ende_gottfried'] = E('dorf', 'Der Rat entzieht Gottfried den Anspruch auf das Brachland. Anshelm verlässt das Dorf noch in derselben Nacht – beschämt, sagt man. Die Rabenfelser bleiben. Aber in Gottfrieds Haus brennt jetzt jede Nacht lange Licht. Er vergisst nicht.',
  {'chronik': ['prediger_gottfried', 'Ich habe aufgedeckt, wer hinter dem Prediger stand. Gottfried hat jetzt einen Feind: mich.'], 'beute': {'stufe': 1}})
s['ende_vertreibung'] = E('dorf', 'Die Rabenfelser packen noch in derselben Woche. Agathe sieht dich nicht an, als sie geht. Anshelm predigt noch einen Monat, dann zieht er weiter. Das Brachland bekommt Gottfried. Das Dorf ist ein bisschen ärmer geworden – nicht an Korn.',
  {'chronik': ['prediger_vertreibung', 'Die Rabenfelser mussten gehen. Ich habe es nicht verhindert.']})
Q.append(dict(id='g_prediger', titel='Der Prediger von der Heide', kurz='Ein Wanderprediger hetzt gegen Fremde – und in manchem hat er recht. Heute will er zwei Familien vertreiben.', start='start', szenen=s, schwer=2))

# ───────────── 6. Psychologie: Der Mann, der nicht schlafen will ─────────────
s = {}
s['start'] = S('dorf', 'Mitten in der Nacht wird an deine Tür gehämmert. Die Frau des Zimmermanns Rutger, im Nachthemd. „Er hat sich im Haus eingeschlossen. Mit einer Fackel. Er sagt, er brennt alles nieder, wenn jemand reinkommt. Er sagt, die Toten kommen wieder.“ Rutger war im Grenzkrieg. Seit er zurück ist, schläft er nicht.',
  O('Sofort hingehen', 'haus'),
  O('Unterwegs fragen: Was ist im Krieg passiert?', 'frage'))
s['frage'] = S('dorf', 'Sie redet schnell, atemlos. „Er redet nie davon. Nur einmal, betrunken: von einer Scheune bei Kammwacht. Dass er die Tür zugehalten hat. Mehr nicht.“ Sie weint. „Er ist ein guter Mann. Er war ein guter Mann.“',
  O('Zum Haus', 'haus', folgen={'flag': ['scheune']}))
s['haus'] = S('dorf', 'Vor dem Haus stehen Nachbarn mit Eimern. Durch das Fenster sieht man Fackelschein. Rutgers Stimme: „Bleibt weg! Ich seh euch! Ich seh eure Gesichter!“ Einer der Nachbarn will die Tür eintreten.',
  O('Den Nachbarn zurückhalten', 'tuer', ergebnis='„Wenn du die Tür eintrittst, zündet er das Haus an. Lass mich.“'),
  O('Die Tür eintreten lassen', 'ende_gewalt'))
s['tuer'] = S('dorf', 'Du stehst vor der Tür. Drinnen atmet jemand schwer. „Wer da?“',
  O('„Ich bin es, {held}. Ich will nur reden.“', 'reden1'),
  P('Leise durchs Fenster einsteigen, solange er abgelenkt ist', 'flink', 14,
    B('Du gleitest durch das Fenster in die Kammer. Rutger steht mit dem Rücken zu dir, die Fackel zitternd über einem Strohhaufen.', 'drinnen_heimlich'),
    B('Ein Stuhl fällt um. Rutger fährt herum, die Fackel hoch. „Ihr seid gekommen!“', 'reden_panik')))
s['reden1'] = S('dorf', '„Reden.“ Ein bitteres Lachen. „Die wollten auch reden. Damals. Die haben an die Tür geklopft und gerufen. Und ich hab sie zugehalten.“ Stille. „Hörst du sie auch?“',
  P('„Ich höre nur dich, Rutger. Und deine Frau, die draußen weint.“', 'beruhigen', 12,
    B('Ein langer Atemzug hinter der Tür. „Gerda?“ – „Sie ist hier.“ Das Zittern in seiner Stimme ändert sich. Weniger Angst. Mehr Schmerz.', 'reden2', folgen={'flag': ['ruhig1']}),
    B('„Lügner! Ihr seid alle Lügner!“ Etwas knistert. Rauch.', 'reden_panik')),
  O('„Erzähl mir von der Scheune.“', 'scheune', wenn={'flag': 'scheune'}))
s['reden_panik'] = S('dorf', 'Rauch quillt unter der Tür hervor. Rutger schreit, nicht vor Wut – vor Angst. „Ich hab’s nicht gewollt! Sie haben gesagt, die Scheune ist voller Feinde!“',
  P('Ruhig und fest: „Rutger. Leg die Fackel in den Eimer neben dir. Jetzt.“', 'beruhigen', 14,
    B('Zischen. Der Rauch wird weniger. Dann ein Schluchzen.', 'reden2', folgen={'flag': ['ruhig1']}),
    B('Er hört dich nicht mehr.', 'feuer')),
  O('Die Tür eintreten und ihn rausziehen', 'feuer'))
s['feuer'] = MG('dorf', 'Flammen lecken am Stroh. Rutger kauert in der Ecke, die Arme über dem Kopf. Du musst ihn raus, bevor das Dach Feuer fängt.', 'seil', 2, 'Durch den Rauch',
  B('Du packst ihn am Kragen und schleifst ihn hinaus. Hinter euch löschen die Nachbarn. Das Haus steht noch. Rutger liegt im nassen Gras und starrt in den Himmel.', 'gras'),
  B('Du schaffst es hinaus, aber verbrennst dir die Hände. Die Nachbarn retten das Haus. Rutger lebt.', 'gras', folgen={'gefahr': 1}))
s['drinnen_heimlich'] = S('dorf', 'Du stehst hinter ihm. Er murmelt Namen. Viele Namen. Er hat sie alle behalten.',
  O('Ihm die Fackel aus der Hand nehmen', 'gras', ergebnis='Er wehrt sich nicht. Als hätte er darauf gewartet, dass jemand ihn aufhält.'),
  O('„Rutger.“ Ganz leise seinen Namen sagen', 'reden2'))
s['scheune'] = S('dorf', 'Lange Stille. Dann redet er, und es kommt wie Wasser durch einen Dammbruch. Der Hauptmann sagte, in der Scheune bei Kammwacht verstecken sich Feinde. Sie sollten die Tür zuhalten, während andere Feuer legten. Er hielt die Tür. Dann hörte er die Stimmen. Frauen. Kinder. Er hielt die Tür trotzdem. Weil der Hauptmann daneben stand.',
  P('„Du hast einen Befehl befolgt. Die Schuld trägt der, der ihn gab.“', 'ueberreden', 13,
    B('„Sag das den Kindern“, flüstert er. Aber die Fackel sinkt. Er will dir glauben. Er kann noch nicht.', 'reden2', folgen={'flag': ['entlastet']}),
    B('„Das sagen alle“, schreit er. „Das macht es nicht besser!“', 'reden_panik')),
  P('„Du hast es nicht vergessen. Das heißt, du bist kein Ungeheuer.“', 'beruhigen', 12,
    B('Ein Laut, halb Schluchzen, halb Lachen. „Ein Ungeheuer könnte schlafen.“ Die Tür öffnet sich einen Spalt.', 'reden2', folgen={'flag': ['angenommen']}),
    B('Er antwortet nicht.', 'reden2')))
s['reden2'] = S('dorf', 'Die Tür öffnet sich. Rutger steht da, grau, abgemagert, die Fackel gesenkt. „Was soll ich jetzt tun? Mit all dem?“',
  O('„Es jemandem erzählen. Nicht nur mir. Dem Priester, deiner Frau, irgendwem.“', 'ende_reden'),
  O('„Etwas tun, das es nicht wiedergutmacht, aber das Gegenteil davon ist.“', 'ende_tat', wenn={'flag': 'entlastet'}),
  O('„Es mit mir tragen. Komm morgen mit auf die Wache. Wir reden, während wir wach bleiben.“', 'ende_wache', wenn={'flag': 'angenommen'}),
  O('„Schlafen. Du musst schlafen. Ich hole die Kräuterfrau.“', 'ende_kraeuter'))
s['gras'] = S('dorf', 'Rutger liegt im Gras. Seine Frau kniet neben ihm. Er sieht dich an. „Warum hast du mich nicht brennen lassen?“',
  O('„Weil die Kinder in der Scheune auch nicht brennen sollten. Und du auch nicht.“', 'ende_reden'),
  O('Schweigen und seine Hand halten, bis es hell wird', 'ende_wache'))
s['ende_reden'] = E('dorf', 'Rutger redet. Erst mit dir, dann mit Gerda, dann – nach Wochen – mit dem Priester. Er schläft nicht viel besser. Aber er schläft. An manchen Tagen sitzt er vor seinem Haus und schnitzt kleine Holzfiguren. Für jedes Kind eine. Er hat ihre Namen nie erfahren, also gibt er ihnen welche.',
  {'chronik': ['rutger_reden', 'Ich habe Rutger die Fackel abgenommen – mit Worten. Er schnitzt jetzt Figuren für die Kinder aus der Scheune.'], 'beute': {'stufe': 2, 'text': 'Eines Tages steht eine der Figuren vor deiner Tür, und noch etwas daneben:'}})
s['ende_tat'] = E('dorf', 'Rutger baut im Frühjahr eine Scheune für die Rabenfelser Flüchtlinge am Dorfrand. Ohne Lohn. Mit einer Tür, die von innen aufgeht. Er sagt niemandem, warum. Du weißt es.',
  {'chronik': ['rutger_tat', 'Rutger hat eine Scheune gebaut, deren Tür von innen aufgeht.'], 'beute': {'stufe': 1}})
s['ende_wache'] = E('dorf', 'Ihr steht von nun an manchmal zusammen Wache, nachts, wenn er nicht schlafen kann. Er redet wenig. Aber er ist nicht allein dabei. Manchmal ist das alles, was man jemandem geben kann.',
  {'chronik': ['rutger_wache', 'Ich stehe manchmal nachts mit Rutger Wache. Wir reden wenig.'], 'beute': {'stufe': 1}})
s['ende_kraeuter'] = E('dorf', 'Die Kräuterfrau gibt ihm Mohnsaft. Er schläft drei Tage. Danach ist er ruhiger – bis der Saft aufgebraucht ist. Dann kommt er wieder, um mehr zu holen. Manche Wunden schließt man nicht mit Kräutern.',
  {'chronik': ['rutger_kraeuter', 'Rutger schläft jetzt – mit Mohnsaft. Ich weiß nicht, ob das Hilfe war.']})
s['ende_gewalt'] = E('dorf', 'Die Tür kracht auf, Rutger schreit, die Fackel fällt ins Stroh. Das Haus brennt bis auf die Grundmauern. Rutger überlebt. Er wird nie wieder ein Wort mit dir reden.',
  {'chronik': ['rutger_gewalt', 'Ich habe zugelassen, dass sie Rutgers Tür eintraten. Sein Haus ist abgebrannt.'], 'dorf': {'holz': -30}})
Q.append(dict(id='g_rutger', titel='Der Mann, der nicht schlafen will', kurz='Ein Heimkehrer aus dem Grenzkrieg hat sich mit einer Fackel eingeschlossen. Er sagt, die Toten kommen wieder.', start='start', szenen=s, schwer=2))

for qd in Q: print(qd['id'], pruefe(qd['id'], qd['start'], qd['szenen']))
