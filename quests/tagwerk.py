# Tagwerk: kleine Bitten der Bewohner, jeweils ein Minispiel. {held} = Spielername.
JAGD = ['Jäger', 'Jägerin', 'Falknerin', 'Pfeilmacher']
FELD = ['Bauer', 'Bäuerin', 'Müllerin', 'Imkerin']
WALD = ['Holzfäller', 'Köhler', 'Zimmermann', 'Wagner']
SCHMIEDE = ['Schmied', 'Waffenschmiedin', 'Rüstmacher']
STEIN = ['Steinmetz', 'Bergmann', 'Töpfer', 'Totengräber']
WASSER = ['Fischer', 'Fährmann', 'Wäscherin']
VIEH = ['Hirte', 'Stallbursche', 'Metzger', 'Gerberin']
HEIL = ['Heilerin', 'Kräuterfrau', 'Alchemist']
WIRT = ['Wirt', 'Schankmaid', 'Koch', 'Bäcker', 'Brauer']
GLAUBE = ['Priesterin', 'Mönch', 'Seherin', 'Dorfälteste']
WISSEN = ['Gelehrter', 'Schreiber', 'Barde']
WACHE = ['Wache', 'Söldnerin', 'Hauptmann']
NADEL = ['Schneiderin', 'Weberin', 'Schuster', 'Kerzenzieherin']
HANDEL = ['Händler']
RATTEN = ['Rattenfänger']

T = [
 # id, jobs, art, schwer, titel, bitte, erfolg, misserfolg, dorf
 ('jagd_scheibe', JAGD, 'bogen', 2, 'Übungsschießen', 'Ich hab eine neue Bogensehne gedreht. Schieß du mal – ich will sehen, ob sie zieht oder schlägt.', 'Mitten ins Stroh! Die Sehne taugt. Heute Abend gibt es Kaninchen.', 'Daneben, daneben … Liegt an der Sehne. Bestimmt an der Sehne.', {'nahrung': 2}),
 ('jagd_kraehen', JAGD, 'bogen', 1, 'Krähen am Feldrand', 'Die Krähen holen sich das Saatgut. Kannst du sie mit ein paar Pfeilen verscheuchen?', 'Die Krähen sind weg. Das Saatgut bleibt im Boden.', 'Die Krähen lachen dich aus. Ehrlich, das klang wie Lachen.', {'nahrung': 2}),
 ('jagd_faehrte', JAGD, 'spuren', 2, 'Welche Fährte ist frisch?', 'Am Bach kreuzen sich drei Fährten. Welche ist von heute Morgen? Ich will nicht umsonst einen halben Tag laufen.', 'Die frische Fährte führt zu einem Rehbock. Mit deiner Hilfe kommt Fleisch auf den Tisch.', 'Die Fährte war von vorgestern. Ein langer Tag für nichts.', {'nahrung': 3}),
 ('feld_unkraut', FELD, 'kraeuter', 1, 'Unkraut zupfen', 'Zwischen dem Kohl wuchert allerhand. Hilf mir, das Unkraut rauszuziehen – aber nicht den Kohl!', 'Das Beet ist sauber, der Kohl atmet auf.', 'Du hast mehr Kohl als Unkraut gezogen. Nun ja. Gibt es eben heute Kohlsuppe.', {'nahrung': 2}),
 ('feld_huehner', FELD + VIEH, 'huehner', 2, 'Die Hühner sind los', 'Jemand hat den Stall offen gelassen. Hilf mir, die Hühner wieder einzufangen, bevor der Fuchs sie findet!', 'Alle Hühner sind wieder drin. Sie gackern beleidigt.', 'Zwei Hühner sitzen jetzt auf dem Dach. Die holen wir morgen.', {'nahrung': 2}),
 ('feld_saat', FELD, 'merken', 2, 'Die Saatreihen', 'Ich hab mir die Reihenfolge der Beete gemerkt – und wieder vergessen. Du warst doch dabei. Weißt du sie noch?', 'Genau so! Rüben, Bohnen, Kohl. Du hast ein besseres Gedächtnis als ich.', 'Bohnen bei den Rüben? Das wird ein seltsamer Sommer.', {'nahrung': 2}),
 ('feld_bienen', ['Imkerin'], 'fangen', 2, 'Der ausgerissene Schwarm', 'Ein Schwarm ist ausgezogen und hängt im Apfelbaum. Hilf mir, die Königin in den Korb zu bekommen.', 'Der Schwarm summt zufrieden in seinem neuen Korb. Im Herbst gibt es Honig.', 'Der Schwarm ist weitergezogen. Ich hoffe, er findet ein gutes Zuhause.', {'nahrung': 2, 'stimmung': 1}),
 ('wald_spalten', WALD, 'axt', 2, 'Holz spalten', 'Der Stapel muss vor dem Regen gespalten sein. Nimm die zweite Axt und hilf mir.', 'Ein ordentlicher Stapel, sauber gespalten. Das wärmt eine Woche.', 'Die Axt steckt im Klotz und will nicht raus. Halb so viel geschafft wie gedacht.', {'holz': 4}),
 ('wald_balken', ['Zimmermann', 'Wagner'], 'hammer', 2, 'Zapfen und Nut', 'Die Balken müssen verzapft werden. Halt das Holz und schlag den Keil ein – im richtigen Moment.', 'Passt wie angegossen. Das hält hundert Jahre.', 'Der Keil sitzt schief. Wir fangen nochmal an.', {'holz': 2, 'waren': 1}),
 ('wald_meiler', ['Köhler'], 'timing', 2, 'Den Meiler zudecken', 'Der Meiler zieht zu viel Luft. Wir müssen ihn im richtigen Moment mit Erde abdecken, sonst verbrennt alles zu Asche.', 'Der Meiler glimmt ruhig. In drei Tagen gibt es gute Kohle.', 'Zu spät. Ein Teil ist zu Asche verbrannt.', {'waren': 2}),
 ('schmiede_hammer', SCHMIEDE, 'hammer', 2, 'Am Amboss', 'Das Eisen ist heiß. Schlag du, ich halte. Aber nur, wenn es glüht – nicht, wenn es schon kalt wird!', 'Ein sauberer Nagel nach dem anderen. Du hast eine gute Hand.', 'Krumm. Alles krumm. Wir schmelzen das wieder ein.', {'waren': 2}),
 ('schmiede_blasebalg', SCHMIEDE, 'timing', 1, 'Den Blasebalg treten', 'Die Esse braucht Luft. Tritt den Blasebalg im Takt – nicht zu schnell, nicht zu langsam.', 'Die Glut faucht weißgelb. Genau richtig.', 'Die Glut ist eingeschlafen. Das kostet uns den halben Morgen.', {'waren': 1}),
 ('stein_meissel', STEIN, 'meissel', 2, 'Den Stein spalten', 'Der Block hat eine Ader. Wenn du genau dort triffst, springt er sauber auf.', 'Der Stein springt in zwei glatte Hälften. Schöne Arbeit.', 'Der Stein bröselt. Daraus wird höchstens Schotter.', {'stein': 3}),
 ('stein_sortieren', STEIN, 'finden', 2, 'Gute Steine, schlechte Steine', 'Aus dem Geröll brauchen wir die festen Brocken – keine mit Rissen. Hilf mir sortieren.', 'Ein Karren voll guter Steine. Damit lässt sich bauen.', 'Die Hälfte hat Risse. Na ja, für den Weg reicht es.', {'stein': 2}),
 ('wasser_angeln', WASSER, 'angeln', 2, 'Ein paar Fische für die Pfanne', 'Die Forellen stehen heute gut. Nimm die zweite Rute – mal sehen, wer mehr fängt.', 'Ein ganzer Korb voll! Heute Abend riecht das halbe Dorf nach gebratenem Fisch.', 'Die Fische haben heute andere Pläne.', {'nahrung': 3}),
 ('wasser_netz', WASSER, 'nadel', 2, 'Das Netz flicken', 'Ein Hecht hat das Netz zerrissen. Hilf mir, die Maschen zu knoten.', 'Das Netz ist wieder dicht. Morgen geht es raus.', 'Die Knoten halten nicht. Ich mach das heute Abend nochmal.', {'nahrung': 1}),
 ('wasser_waesche', ['Wäscherin'], 'timing', 1, 'Wäsche schlagen', 'Die Laken müssen auf den Stein geschlagen werden – im Takt, sonst reißen sie.', 'Blütenweiß. Fast.', 'Ein Laken ist im Fluss davongeschwommen.', {'stimmung': 1}),
 ('vieh_laemmer', VIEH, 'laemmer', 2, 'Die Lämmer zählen', 'Die Lämmer springen durcheinander. Hilf mir, sie in den Pferch zu treiben – alle!', 'Alle Lämmer sind drin und blöken um die Wette.', 'Eins fehlt. Es steht vermutlich auf irgendeinem Felsen und lacht.', {'nahrung': 2}),
 ('vieh_melken', VIEH, 'timing', 1, 'Melken', 'Die Kuh ist eigen. Ruhig, gleichmäßig – sonst tritt sie den Eimer um.', 'Ein voller Eimer, warm und schaumig.', 'Der Eimer liegt im Stroh. Die Kuh sieht zufrieden aus.', {'nahrung': 2}),
 ('heil_kraeuter', HEIL, 'kraeuter', 2, 'Kräuter sortieren', 'Die Kinder haben Kräuter gesammelt – leider auch ein paar giftige. Hilf mir, die guten herauszusuchen.', 'Nur gute Kräuter im Korb. Damit kann ich Salben machen.', 'Ich sortiere lieber nochmal selbst nach. Sicher ist sicher.', {'stimmung': 1, 'waren': 1}),
 ('heil_pilze', HEIL + FELD, 'pilze', 2, 'Pilze aus dem Wald', 'Es hat geregnet, die Pilze stehen. Aber Vorsicht – der Knollenblätterpilz sieht dem Champignon zum Verwechseln ähnlich.', 'Ein Korb voller guter Pilze. Morgen gibt es Pilzsuppe.', 'Ich werfe den ganzen Korb weg. Lieber hungrig als tot.', {'nahrung': 2}),
 ('heil_mixtur', ['Alchemist', 'Heilerin'], 'merken', 3, 'Die Mixtur', 'Drei Tropfen davon, zwei davon … in genau der Reihenfolge. Merk sie dir, ich habe keine Hand frei.', 'Die Mixtur färbt sich golden. Perfekt.', 'Es zischt und stinkt nach faulen Eiern. Das war wohl falsch.', {'stimmung': 1}),
 ('wirt_bestellung', WIRT, 'bestellung', 2, 'Viel los in der Schänke', 'Heute ist die Hölle los! Merk dir die Bestellungen, ich komme nicht hinterher.', 'Jeder hat bekommen, was er wollte. Ein seltenes Wunder.', 'Ein Bauer hat Met statt Bier bekommen – und ist trotzdem glücklich.', {'stimmung': 2}),
 ('wirt_teig', ['Bäcker', 'Koch'], 'timing', 2, 'Das Brot aus dem Ofen', 'Das Brot muss raus, genau dann, wenn die Kruste goldbraun ist. Keinen Moment später.', 'Duftendes Brot, knusprig und warm. Das halbe Dorf steht vor der Tür.', 'Ein bisschen schwarz. Die Hühner freuen sich.', {'nahrung': 2, 'stimmung': 1}),
 ('wirt_wuerfel', WIRT + HANDEL, 'wuerfel', 2, 'Ein Spiel am Abend', 'Mir ist langweilig, und die Gäste sind gegangen. Eine Runde Knobeln?', 'Gewonnen! Und gelacht haben wir auch.', 'Verloren. Aber es war ein schöner Abend.', {'stimmung': 1}),
 ('glaube_runen', GLAUBE, 'runen', 2, 'Die alten Zeichen', 'Auf dem Schrein sind die Zeichen verwittert. Hilf mir, sie in der richtigen Reihenfolge nachzuziehen.', 'Die Zeichen leuchten frisch. Die Ahnen werden zufrieden sein.', 'Ich glaube, da steht jetzt „Mehl“ statt „Segen“.', {'stimmung': 2}),
 ('glaube_lied', GLAUBE + WISSEN, 'lied', 2, 'Das Erntelied', 'Beim Fest soll das alte Lied gesungen werden. Ich spiele dir die Melodie vor – sing sie nach.', 'Wunderschön. Beim Fest singst du mit!', 'Na ja. Beim Fest stellst du dich lieber hinten hin.', {'stimmung': 2}),
 ('wissen_abschrift', WISSEN, 'merken', 2, 'Eine Abschrift', 'Ich lese dir die Zeilen vor, du merkst sie dir. Meine Augen sind nicht mehr die besten.', 'Wort für Wort richtig. Ein Gedächtnis wie ein Buch.', 'Hmm. Da steht jetzt etwas über Schweine, das vorher nicht da stand.', {'stimmung': 1}),
 ('wache_schiessen', WACHE, 'bogen', 3, 'Schießübung der Wache', 'Die Wache übt heute. Zeig, ob du im Ernstfall treffen würdest.', 'Respekt. Wenn es brennt, rufen wir dich.', 'Bleib im Ernstfall lieber hinter der Mauer.', {'stimmung': 1}),
 ('wache_nacht', WACHE, 'finden', 2, 'Nachtwache', 'Halte mit mir Wache. Wenn sich am Waldrand etwas bewegt – sag es mir.', 'Nur ein Fuchs. Aber du hast ihn als Erste(r) gesehen.', 'Du bist eingenickt. Zum Glück war nichts.', {'stimmung': 1}),
 ('nadel_naehen', NADEL, 'nadel', 2, 'Eine Naht', 'Diese Naht muss gerade werden, sonst sitzt der Mantel schief. Ruhige Hand!', 'Gerade wie ein Strich. Der Mantel wird schön.', 'Krumm wie ein Hundeschwanz. Ich trenne das wieder auf.', {'waren': 2}),
 ('nadel_kerzen', ['Kerzenzieherin'], 'timing', 2, 'Kerzen ziehen', 'Eintauchen, warten, eintauchen. Zu schnell, und das Wachs reißt.', 'Ein Bündel glatter Kerzen. Der Winter wird hell.', 'Klumpige Kerzen. Brennen tun sie trotzdem.', {'waren': 1}),
 ('handel_feilschen', HANDEL, 'wuerfel', 3, 'Ein Handel mit Fremden', 'Fremde Händler wollen um den Preis würfeln. Ich bin zu nervös – würfel du für mich.', 'Ein guter Preis! Das Dorf profitiert.', 'Ein schlechter Preis. Aber ein Handel ist ein Handel.', {'waren': 3}),
 ('ratten_jagd', RATTEN + WIRT, 'ratten', 2, 'Ratten im Speicher', 'Im Kornspeicher wimmelt es. Hilf mir, die Biester zu erwischen, bevor sie das ganze Korn fressen.', 'Der Speicher ist rattenfrei. Fürs Erste.', 'Die Ratten waren schneller. Und frecher.', {'nahrung': 3}),
]

def daten():
    return [dict(id=t[0], jobs=t[1], art=t[2], schwer=t[3], titel=t[4], bitte=t[5], erfolg=t[6], misserfolg=t[7], dorf=t[8]) for t in T]

if __name__ == '__main__':
    import json
    d = daten()
    alle = set(sum((x['jobs'] for x in d), []))
    print(len(d), 'Tagwerke für', len(alle), 'Berufe')
