# Mossheart – Kampfsystem (Scharmützel und Schlachten)

Stand: 23.11.2026. Wird aus `game/kampf_items.js` erzeugt.

## So funktioniert es
- Du greifst automatisch an und bestimmst nur, wohin du läufst (WASD/Pfeiltasten oder Finger ziehen).
- Gegner hinterlassen Erfahrung. Bei jedem Aufstieg wählst du aus 3 Angeboten (mit viel Glück 4–5) ein neues Item oder eine Stufe mehr. Jedes Item hat bis zu 10 Stufen, die Anzahl der Items ist **nicht begrenzt**.
- **Kombi:** Zwei Partner-Items ab Stufe 2 → die Waffe bekommt die **Prägung** des Partners (z. B. „Brennende Wurfaxt“). Jedes Item hat 3–5 Partner.
- **Verschmolzen:** beide Partner ab Stufe 8 → Prägung doppelt so stark, Waffe +50 % Schaden.
- **Bund:** Zwei Partner-Gaben (keine Waffe) ab Stufe 2 → die Werte beider Gaben +25 % (verschmolzen +60 %).
- **Merkmale:** Ab 3, 5 und 8 Items mit demselben Merkmal gibt es Set-Boni.
- **Legenden:** Drei bestimmte Items auf Stufe 6 → eine zusätzliche, sehr starke Legendenwaffe.
- Angebote bevorzugen Items, die zu deinem Aufbau passen (Partner, gleiche Merkmale, fast fertige Legenden), damit am Ende fast immer etwas zusammenpasst.
- Gegner werden mit der Zeit stärker und etwas stärker, wenn du weit vorne bist – aber langsamer als du wachsen kannst.
- Alle 60 Sekunden eine Welle, alle 5 Minuten eine gewaltige Welle, alle 2 Minuten ein Anführer mit Truhe, bei 80 % der Zeit der große Anführer. Kämpfe lassen sich jederzeit pausieren.
- Quests mit Kampf sind im Questmenü und im Questfenster mit ⚔ und der ungefähren Dauer markiert.
- Truhen von Anführern geben mehrere Stufen auf einmal. Seltene Funde: Brot (Leben), Lichtstein (alle Erfahrung einsammeln).

## Dauerhafte Stärken
- Eigenschaften: Stärke → Schaden, Geschick → Tempo, Sinne → Kritische Treffer und Sammelradius, Charme → Glück und Neu-Würfeln, Wissen → Erfahrung, Wille → Leben und Regeneration.
- Gegenstände: Schwert/Dolch/Bogen/Laterne/Kräutertasche → passende Waffe von Anfang an; Kettenhemd und Lederwams → Rüstung; weitere kleine Boni.
- Beute-Ausrüstung: je nach Seltenheit etwas mehr Schaden (höchstens +30 %).
- Dorf: Schmiede (Schaden), Wachturm (Geschosse, Kritische Treffer), Langhaus und Gasthaus (Leben), Heilerhaus und Alchemistenturm (Regeneration), Kaserne (Rüstung), Schrein (Glück), Schreibstube (Erfahrung), Jagdhütte.
- Helfer: Die zwei Bewohner, die dich am meisten mögen, und deine Quest-Begleiter erscheinen regelmäßig kurz im Kampf – je nach Beruf mit Pfeilsalven, Hammerschlägen, Heilung, Axtwirbel, Kampflied oder Schlachtruf.

## Wo es Kämpfe gibt
- Erkunden: Erlenbruch (Moderlinge), Versperrter Weg (Wegelagerer), Hügelgrab (Untote), Alm (Wolfsrudel), Beerenhang (Bär) – je ca. 10 Minuten.
- Lange Quests: „Die Burg im Norden“ (Gruft, 12 Min.), „Über den Weißen Pass“ (Rudel, 12 Min.), „Die Männer mit den Armbrüsten“ (Schlacht am Ostkamm, 15 Min.).
- Übungsplatz im Quests-Menü: endlos, ohne Folgen, mit Rekord.
- Später: Belagerungen als Tower Defense (wenn Dörfer größer sind), offene Großschlachten auf der Weltkarte.

## Merkmale (Set-Boni)
| Merkmal | ab 3 | ab 5 | ab 8 |
|---|---|---|---|
| Stahl | +6 % kritische Treffer | +15 % Schaden | +12 % kritische Treffer, Kritische ×2,5 |
| Wurf | +1 Geschoss | 12 % schneller | +2 Geschosse |
| Fernkampf | Geschosse fliegen 20 % schneller | Geschosse durchbohren 1 weiteren Gegner | +25 % Schaden |
| Feuer | Brand +50 % | +15 % Fläche | Brennende Gegner explodieren beim Tod |
| Eis | Verlangsamung +30 % | +40 % Schaden gegen Verlangsamte | Gefrorene zerspringen und treffen Nachbarn |
| Blitz | Ketten springen 1× weiter | 10 % schneller | Ketten springen 3× weiter |
| Gift | Gift +50 % | Gift springt beim Tod über | Gift +150 % |
| Natur | +0,5 Leben pro Sekunde | +15 % Fläche | +2 Leben pro Sekunde, +20 % Leben |
| Geist | Wirkungen halten 20 % länger | Jeder 20. Kill ruft einen Geist | +30 % Schaden |
| Tier | Tiere +25 % Schaden | +1 Tier/Geschoss | Tiere +75 % Schaden |
| Erde | +2 Rüstung | +20 % Fläche | Alle 6 s bebt die Erde um dich |
| Licht | +15 % Erfahrung | +15 % Schaden | Jeder Levelaufstieg heilt dich ganz |
| Aura | +15 % Fläche | +2 Rüstung | +30 % Fläche |

## Waffen (28)
| Waffe | Merkmale | Wirkung | gibt Partnern | Kombi-Partner |
|---|---|---|---|---|
| Kurzschwert | Stahl | Hiebe vor dir, bei höheren Stufen auch hinter dir. | Scharf: +15 % kritische Treffer (Stufe 5) | Schleifstein, Glücksklee, Wurfmesser, Kriegsbemalung |
| Wurfaxt | Stahl, Wurf | Fliegt im hohen Bogen und fällt durch alles hindurch. | Wuchtig: Stößt Gegner 50px zurück (Stufe 5) | Eisenwille, Kriegshammer, Zunderbüchse, Riesenring, Bumerang |
| Speer | Stahl, Fernkampf | Ein Stoß in Blickrichtung, durchbohrt ganze Reihen. | Durchbohrend: Durchbohrt 2 weitere Gegner (Stufe 5) | Falkenauge, Kriegshorn, Blitzbernstein, Armbrust, Donnerkeil |
| Jagdbogen | Fernkampf, Natur | Pfeile auf den nächsten Gegner. | Suchend: Geschosse suchen sich ihr Ziel (Stufe 5) | Doppelsehne, Falkenauge, Wolfsgeist, Schlangenzahn, Zunderbüchse |
| Armbrust | Fernkampf, Stahl | Langsame, schwere Bolzen in Blickrichtung, die alles durchschlagen. | Schwer: +30 % Schaden (Stufe 5) | Speer, Schleifstein, Frostzahn, Sanduhr |
| Schleuder | Fernkampf, Wurf | Steine, die von Gegner zu Gegner springen. | Springend: Prallt 2× zum nächsten Gegner ab (Stufe 5) | Magnetstein, Glücksklee, Eiszapfen, Glutstein |
| Wurfmesser | Stahl, Wurf | Schnelle Messerfächer in Laufrichtung. | Doppelt: +2 Geschoss/Treffer (Stufe 5) | Kurzschwert, Doppelsehne, Schlangenzahn, Hasenpfote, Kriegsbemalung |
| Kräuterbeutel | Natur, Aura | Bitterer Dunst um dich, der Gegner schwächt und dich stärkt. | Durstig: Heilt dich um 1,8 % des Schadens (Stufe 5) | Moosherz, Schlangenzahn, Riesenring, Bienenkorb, Wegzehrung |
| Fackel | Feuer | Ein Flammenstoß in Blickrichtung. | Brennend: Setzt in Brand (13 Schaden/s) (Stufe 5) | Zunderbüchse, Riesenring, Glutstein, Sturmglocke |
| Glutstein | Feuer, Wurf | Glühende Steine, die beim Aufprall bersten. | Berstend: 30 % Chance auf Explosion (Stufe 5) | Fackel, Ahnenstein, Riesenring, Schleuder |
| Eiszapfen | Eis | Zapfen fallen vom Himmel auf zufällige Gegner. | Frostig: Verlangsamt um 40 %, 10 % Chance zu erstarren (Stufe 5) | Frostzahn, Frostkranz, Sanduhr, Schleuder |
| Frostkranz | Eis, Aura | Eissplitter kreisen um dich. | Splitternd: Zerbricht beim Treffer in 3 Splitter (Stufe 5) | Eiszapfen, Mondsichel, Krähenfeder, Eisenwille |
| Donnerkeil | Blitz | Blitze schlagen in zufällige Gegner ein. | Donnernd: Blitz springt auf 2 Gegner über (Stufe 5) | Blitzbernstein, Sturmglocke, Sanduhr, Speer, Eulenfeder |
| Sturmglocke | Blitz, Aura | Ein Glockenschlag sendet eine Druckwelle um dich herum. | Betäubend: 18 % Chance zu betäuben (Stufe 5) | Donnerkeil, Fackel, Kriegshorn, Eisenwille |
| Moorkrug | Gift, Wurf | Zerplatzt und hinterlässt giftige Pfützen. | Giftig: Vergiftet (9,5 Schaden/s, stapelt sich) (Stufe 5) | Schlangenzahn, Riesenring, Krähenfeder, Bienenkorb |
| Dornenranke | Natur | Dornen wachsen in vier Richtungen aus dem Boden. | Dornig: Getötete Gegner verschießen 5 Dornen (Stufe 5) | Dornenpanzer, Wurzelschlag, Moosherz, Schlangenzahn |
| Wurzelschlag | Natur, Erde | Wurzeln brechen unter Gegnern in deiner Nähe hervor und halten sie fest. | Riesig: +30 % Fläche und Größe (Stufe 5) | Dornenranke, Kriegshammer, Trollblut, Frostzahn |
| Geisterlaterne | Geist, Licht | Irrlichter suchen sich ihre Opfer. | Spukend: 18 % Chance, beim Kill einen Geist zu rufen (Stufe 5) | Krähenfeder, Eulenfeder, Runenstein, Rabenschwarm |
| Rabenschwarm | Geist, Tier | Raben kreisen und stürzen sich auf Gegner. | Suchend: Geschosse suchen sich ihr Ziel (Stufe 5) | Geisterlaterne, Wolfsfell, Krähenfeder, Falkenauge |
| Wolfsgeist | Tier, Geist | Geisterwölfe jagen an deiner Seite. | Reißend: Blutung (14 Schaden/s, stapelt sich bis 5) (Stufe 5) | Wolfsfell, Jagdbogen, Hasenpfote, Kriegsbemalung |
| Bienenkorb | Tier, Gift, Natur | Bienenschwärme stürzen sich auf die nächsten Gegner. | Giftig: Vergiftet (9,5 Schaden/s, stapelt sich) (Stufe 5) | Kräuterbeutel, Moorkrug, Wolfsfell, Moosherz |
| Kriegshorn | Stahl, Aura | Ein Hornstoß wirft alle Gegner vor dir zurück und schwächt sie. | Flink: 23 % schneller (Stufe 5) | Speer, Sturmglocke, Kriegsbemalung |
| Bumerang | Wurf | Fliegt hinaus und kehrt zurück – trifft doppelt. | Doppelt: +2 Geschoss/Treffer (Stufe 5) | Hasenpfote, Magnetstein, Wurfaxt |
| Morgenstern | Stahl, Aura | Eine schwere Kugel an der Kette wirbelt um dich. | Schwer: +30 % Schaden (Stufe 5) | Eisenwille, Trollblut, Kriegshammer |
| Kriegshammer | Stahl, Erde | Schmettert auf den Boden – alles in der Nähe wird getroffen. | Betäubend: 18 % Chance zu betäuben (Stufe 5) | Wurfaxt, Morgenstern, Wurzelschlag, Ahnenstein |
| Runenstein | Geist, Erde | Hinterlässt Runen, die explodieren, wenn Gegner sie berühren. | Verflucht: Getroffene nehmen 18 % mehr Schaden (Stufe 5) | Geisterlaterne, Ahnenstein, Eulenfeder, Glücksklee |
| Sonnenspiegel | Licht, Feuer | Ein Lichtstrahl kreist um dich. | Riesig: +30 % Fläche und Größe (Stufe 5) | Mondsichel, Zunderbüchse, Ahnenstein, Glücksklee |
| Mondsichel | Licht, Geist | Sicheln drehen sich spiralförmig nach außen. | Splitternd: Zerbricht beim Treffer in 3 Splitter (Stufe 5) | Sonnenspiegel, Frostkranz, Krähenfeder, Doppelsehne |

## Gaben (22)
| Gabe | Merkmale | Wirkung | gibt Partnern | Kombi-Partner |
|---|---|---|---|---|
| Eisenwille | Erde | +12 % Leben, +1 Rüstung je zwei Stufen. | Wuchtig: Stößt Gegner 50px zurück (Stufe 5) | Wurfaxt, Frostkranz, Sturmglocke, Morgenstern, Wegzehrung |
| Falkenauge | Fernkampf | Geschosse +10 % schneller, +4 % kritische Treffer. | Suchend: Geschosse suchen sich ihr Ziel (Stufe 5) | Speer, Jagdbogen, Rabenschwarm, Doppelsehne |
| Hasenpfote | Tier | +7 % Laufgeschwindigkeit. | Flink: 23 % schneller (Stufe 5) | Wurfmesser, Wolfsgeist, Bumerang, Magnetstein |
| Glücksklee | Natur | Mehr Glück: bessere Angebote, +3 % kritische Treffer. | Scharf: +15 % kritische Treffer (Stufe 5) | Kurzschwert, Schleuder, Runenstein, Sonnenspiegel |
| Moosherz | Natur | +0,4 Leben pro Sekunde. | Durstig: Heilt dich um 1,8 % des Schadens (Stufe 5) | Kräuterbeutel, Dornenranke, Bienenkorb, Trollblut, Wegzehrung |
| Eulenfeder | Licht | +10 % Erfahrung. | Verflucht: Getroffene nehmen 18 % mehr Schaden (Stufe 5) | Geisterlaterne, Donnerkeil, Runenstein, Magnetstein |
| Schleifstein | Stahl | +8 % Schaden. | Schwer: +30 % Schaden (Stufe 5) | Kurzschwert, Armbrust, Kriegsbemalung, Ahnenstein |
| Zunderbüchse | Feuer | Brand +15 %, +3 % Schaden. | Brennend: Setzt in Brand (13 Schaden/s) (Stufe 5) | Fackel, Wurfaxt, Jagdbogen, Sonnenspiegel |
| Frostzahn | Eis | Verlangsamung +6 %, +4 % Schaden gegen Verlangsamte. | Frostig: Verlangsamt um 40 %, 10 % Chance zu erstarren (Stufe 5) | Eiszapfen, Armbrust, Wurzelschlag, Trollblut |
| Blitzbernstein | Blitz | Ketten springen weiter, +3 % Tempo. | Donnernd: Blitz springt auf 2 Gegner über (Stufe 5) | Donnerkeil, Speer, Sanduhr, Magnetstein |
| Schlangenzahn | Gift | Gift +20 %, Gift hält länger. | Giftig: Vergiftet (9,5 Schaden/s, stapelt sich) (Stufe 5) | Jagdbogen, Wurfmesser, Kräuterbeutel, Moorkrug, Dornenranke |
| Wolfsfell | Tier | Tiere +12 % Schaden, +3 % Laufgeschwindigkeit. | Reißend: Blutung (14 Schaden/s, stapelt sich bis 5) (Stufe 5) | Wolfsgeist, Rabenschwarm, Bienenkorb, Dornenpanzer |
| Riesenring | Aura | +9 % Fläche und Größe. | Riesig: +30 % Fläche und Größe (Stufe 5) | Wurfaxt, Kräuterbeutel, Fackel, Glutstein, Moorkrug |
| Sanduhr | Licht | Alle Waffen 5 % schneller. | Flink: 23 % schneller (Stufe 5) | Armbrust, Eiszapfen, Donnerkeil, Blitzbernstein |
| Doppelsehne | Fernkampf, Wurf | +1 Geschoss auf Stufe 3, 6 und 9. | Doppelt: +2 Geschoss/Treffer (Stufe 5) | Jagdbogen, Wurfmesser, Falkenauge, Mondsichel |
| Magnetstein | Erde | Erfahrung aus größerer Entfernung einsammeln. | Springend: Prallt 2× zum nächsten Gegner ab (Stufe 5) | Schleuder, Bumerang, Hasenpfote, Eulenfeder, Blitzbernstein |
| Krähenfeder | Geist | Wirkungen halten 10 % länger. | Spukend: 18 % Chance, beim Kill einen Geist zu rufen (Stufe 5) | Frostkranz, Moorkrug, Geisterlaterne, Rabenschwarm, Mondsichel |
| Dornenpanzer | Natur, Erde | +1 Rüstung, wer dich trifft, nimmt Schaden. | Dornig: Getötete Gegner verschießen 5 Dornen (Stufe 5) | Dornenranke, Wolfsfell, Trollblut |
| Kriegsbemalung | Stahl | Kritische Treffer +15 % stärker. | Reißend: Blutung (14 Schaden/s, stapelt sich bis 5) (Stufe 5) | Kurzschwert, Wurfmesser, Wolfsgeist, Kriegshorn, Schleifstein |
| Wegzehrung | Natur | +8 % Leben, jeder Levelaufstieg heilt. | Schützend: 9 % Chance auf einen Schutzschild (Stufe 5) | Moosherz, Eisenwille, Kräuterbeutel |
| Ahnenstein | Erde, Licht | +4 % Schaden und +4 % Erfahrung. | Berstend: 30 % Chance auf Explosion (Stufe 5) | Glutstein, Kriegshammer, Runenstein, Sonnenspiegel, Schleifstein |
| Trollblut | Natur | +0,25 Leben pro Sekunde, +5 % Leben. Auf Stufe 10: einmal wiederaufstehen. | Betäubend: 18 % Chance zu betäuben (Stufe 5) | Wurzelschlag, Morgenstern, Moosherz, Frostzahn, Dornenpanzer |

## Legenden (12)
| Legende | braucht (je Stufe 6) | Wirkung |
|---|---|---|
| Feuersturm | Fackel + Glutstein + Zunderbüchse | Ein Ring aus Feuerbällen kreist unaufhörlich um dich. |
| Ewiger Winter | Eiszapfen + Frostkranz + Frostzahn | Alle 6 Sekunden gefriert alles um dich herum. |
| Gewitterzorn | Donnerkeil + Sturmglocke + Blitzbernstein | Ein Dauergewitter folgt dir. |
| Die Wilde Jagd | Wolfsgeist + Jagdbogen + Wolfsfell | Ein Rudel Geisterwölfe stürmt mit dir. |
| Weltenwurzel | Dornenranke + Wurzelschlag + Moosherz | Wurzeln brechen überall um dich hervor und heilen dich. |
| Klingentanz | Kurzschwert + Wurfmesser + Kriegsbemalung | Klingen wirbeln um dich und schießen in alle Richtungen. |
| Seuchenwind | Moorkrug + Bienenkorb + Schlangenzahn | Eine riesige Giftwolke zieht mit dir. |
| Totentanz | Geisterlaterne + Rabenschwarm + Krähenfeder | Unzählige Geister fallen über deine Feinde her. |
| Hammer der Ahnen | Kriegshammer + Eisenwille + Ahnenstein | Ein gewaltiger Schlag erschüttert den ganzen Kampfplatz. |
| Sonnenrad | Sonnenspiegel + Mondsichel + Sanduhr | Vier Strahlen drehen sich um dich wie ein Rad. |
| Pfeilregen | Jagdbogen + Armbrust + Falkenauge | Pfeile regnen ununterbrochen auf alles vor dir. |
| Sturmwirbel | Bumerang + Wurfaxt + Riesenring | Ein Wirbel aus Äxten und Bumerangs dreht sich um dich. |

## Gegner
- Wald: Moderling, Wolf, Keiler, Dornspucker, Krähe – Anführer: Der Moderkeiler
- Söldner: Söldner, Plünderer, Schildträger, Armbrustschütze, Kampfhund – Anführer: Vogt Kuno
- Gruft: Knochenmann, Schatten, Grabwächter, Irrlicht, Fledermaus – Anführerin: Die Gruftwächterin
- Berg: Eiswicht, Bergwolf, Schneebär, Steinwerfer, Eiskrähe – Anführer: Der weiße Bär
- Wildnis: Frischling, Wolf, Bär, Dornspucker, Wespe – Anführer: Der Höhlenbär
- Tiere: Riesenratte, Wiesel, Dachs, Speikröte, Ratte – Anführer: Der Rattenkönig
