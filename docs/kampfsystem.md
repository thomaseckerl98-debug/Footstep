# Mossheart – Kampfsystem (Scharmützel und Schlachten)

Stand: 23.11.2026. Wird aus `game/kampf_items.js` erzeugt.

## So funktioniert es
- Du greifst automatisch an und bestimmst nur, wohin du läufst (WASD/Pfeiltasten oder Finger ziehen). Rote Kreise am Boden kündigen Einschläge an – rechtzeitig ausweichen!
- Gegner hinterlassen Erfahrung. Bei jedem Aufstieg wählst du aus 3 Angeboten (mit viel Glück 4–5) ein neues Item oder eine Stufe mehr. 70 Items, jedes bis Stufe 10, die Anzahl ist **nicht begrenzt**. Aufsteigen dauert spürbar länger als früher – ein starker Lauf endet nach 15 Minuten etwa bei Stufe 80–95. Ab etwa Minute 4 wird es ernst: Fernkämpfer, Mörser und rote Kreise verlangen Ausweichen. Wer früh nur eine Waffe hat, bekommt bis Stufe 12 garantiert eine neue Waffe angeboten; wer hinterherhinkt, trifft auf etwas weichere Gegner.
- **Seltenheit:** Jede Karte kann seltener sein und wirkt dann dauerhaft stärker: Ungewöhnlich +12 % (ca. 19 %), Selten +25 % (ca. 6,5 %), Episch +50 % (ca. 2,1 %), Legendär +100 % (ca. 0,4 %). Glück erhöht die Chancen.
- **Kombi:** Zwei Partner-Items ab Stufe 2 → die Waffe bekommt die **Prägung** des Partners (z. B. „Brennende Wurfaxt“). Jedes Item hat 3–5 Partner.
- **Fusion:** Ist eine Waffe auf Stufe 6 und hat eine aktive Kombi, wird sie „bereit“ (lila leuchtend). Die **nächste Truhe** verschmilzt sie mit dem Partner, z. B. „Glut-Wurfaxt“: Prägung 2,5-fach, +60 % Schaden, +1 Geschoss, schneller, größer. Jede Waffe kann einmal fusionieren.
- **Bund:** Zwei Partner-Gaben (keine Waffe) ab Stufe 2 → die Werte beider Gaben +25 % (beide ab Stufe 8: +60 %).
- **Merkmale:** Ab 3, 5 und 8 Items mit demselben Merkmal gibt es Set-Boni.
- **Legenden:** Drei bestimmte Items auf Stufe 6 → eine zusätzliche, sehr starke Legendenwaffe.
- **Relikte:** Sehr seltene, einzigartige Gegenstände im Goldrahmen – als Karte (unter 1 %), aus Anführer-Truhen (4 %) oder der Truhe des großen Anführers (35 %).
- Angebote bevorzugen Items, die zu deinem Aufbau passen (Partner, gleiche Merkmale, fast fertige Legenden).
- Gegner werden mit der Zeit stärker – und deutlich stärker, wenn du weit über dem Plan bist. Schützen schießen und werfen Brandtöpfe, Anführer und der große Anführer lassen Einschläge um dich niedergehen, ab Minute 2,5 schlägt auch die Umgebung zu.
- Alle 60 Sekunden eine Welle (von einer Seite), alle 5 Minuten eine gewaltige Welle rundherum, alle 2 Minuten ein Anführer mit Truhe, bei 80 % der Zeit der große Anführer. Kämpfe lassen sich jederzeit pausieren.
- **Marsch-Modus:** In manchen Kämpfen schlägst du dich von links nach rechts durch einen Korridor bis zum Ziel. Wer schneller vorstößt, trifft auf stärkere Gegner.
- Quests mit Kampf sind im Questmenü und im Questfenster mit gekreuzten Schwertern und der ungefähren Dauer markiert.
- Truhen von Anführern geben mehrere Stufen auf einmal (auch mit Seltenheit). Seltene Funde: Herz (Leben), Mondstein (alle Erfahrung einsammeln).

## Dauerhafte Stärken
- Eigenschaften: Stärke → Schaden, Geschick → Tempo, Sinne → Kritische Treffer und Sammelradius, Charme → Glück und Neu-Würfeln, Wissen → Erfahrung, Wille → Leben und Regeneration.
- Gegenstände: Schwert/Dolch/Bogen/Laterne/Kräutertasche → passende Waffe von Anfang an; Kettenhemd und Lederwams → Rüstung; weitere kleine Boni.
- Beute-Ausrüstung: je nach Seltenheit etwas mehr Schaden (höchstens +30 %).
- Dorf: Schmiede (Schaden), Wachturm (Geschosse, Kritische Treffer), Langhaus und Gasthaus (Leben), Heilerhaus und Alchemistenturm (Regeneration), Kaserne (Rüstung), Schrein (Glück), Schreibstube (Erfahrung), Jagdhütte.
- Helfer: Die zwei Bewohner, die dich am meisten mögen, und deine Quest-Begleiter erscheinen regelmäßig kurz im Kampf – je nach Beruf mit Pfeilsalven, Hammerschlägen, Heilung, Axtwirbel, Kampflied oder Schlachtruf.

## Wo es Kämpfe gibt
- Erkunden: Erlenbruch (Moderlinge), Versperrter Weg (Wegelagerer, Marsch), Hügelgrab (Untote), Alm (Wolfsrudel), Beerenhang (Bär) – je ca. 10 Minuten.
- Lange Quests: „Die Burg im Norden“ (Gruft, 12 Min.), „Über den Weißen Pass“ (Rudel, Marsch, 12 Min.), „Die Männer mit den Armbrüsten“ (Durchbruch am Ostkamm, Marsch, 15 Min.).
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

## Waffen (40)
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
| Geisterlaterne | Geist, Licht | Irrlichter suchen sich ihre Opfer. | Spukend: 18 % Chance, beim Kill einen Geist zu rufen (Stufe 5) | Krähenfeder, Eulenfeder, Runenstein, Rabenschwarm, Sternenstaub |
| Rabenschwarm | Geist, Tier | Raben kreisen und stürzen sich auf Gegner. | Suchend: Geschosse suchen sich ihr Ziel (Stufe 5) | Geisterlaterne, Wolfsfell, Krähenfeder, Falkenauge |
| Wolfsgeist | Tier, Geist | Geisterwölfe jagen an deiner Seite. | Reißend: Blutung (14 Schaden/s, stapelt sich bis 5) (Stufe 5) | Wolfsfell, Jagdbogen, Hasenpfote, Kriegsbemalung |
| Bienenkorb | Tier, Gift, Natur | Bienenschwärme stürzen sich auf die nächsten Gegner. | Giftig: Vergiftet (9,5 Schaden/s, stapelt sich) (Stufe 5) | Kräuterbeutel, Moorkrug, Wolfsfell, Moosherz |
| Kriegshorn | Stahl, Aura | Ein Hornstoß wirft alle Gegner vor dir zurück und schwächt sie. | Flink: 23 % schneller (Stufe 5) | Speer, Sturmglocke, Kriegsbemalung, Kriegsbanner |
| Bumerang | Wurf | Fliegt hinaus und kehrt zurück – trifft doppelt. | Doppelt: +2 Geschoss/Treffer (Stufe 5) | Hasenpfote, Magnetstein, Wurfaxt |
| Morgenstern | Stahl, Aura | Eine schwere Kugel an der Kette wirbelt um dich. | Schwer: +30 % Schaden (Stufe 5) | Eisenwille, Trollblut, Kriegshammer |
| Kriegshammer | Stahl, Erde | Schmettert auf den Boden – alles in der Nähe wird getroffen. | Betäubend: 18 % Chance zu betäuben (Stufe 5) | Wurfaxt, Morgenstern, Wurzelschlag, Ahnenstein |
| Runenstein | Geist, Erde | Hinterlässt Runen, die explodieren, wenn Gegner sie berühren. | Verflucht: Getroffene nehmen 18 % mehr Schaden (Stufe 5) | Geisterlaterne, Ahnenstein, Eulenfeder, Glücksklee |
| Sonnenspiegel | Licht, Feuer | Ein Lichtstrahl kreist um dich. | Riesig: +30 % Fläche und Größe (Stufe 5) | Mondsichel, Zunderbüchse, Ahnenstein, Glücksklee |
| Mondsichel | Licht, Geist | Sicheln drehen sich spiralförmig nach außen. | Splitternd: Zerbricht beim Treffer in 3 Splitter (Stufe 5) | Sonnenspiegel, Frostkranz, Krähenfeder, Doppelsehne |
| Feuerwirbel | Feuer, Aura | Eine Feuerhose zieht wild um dich herum. | Brennend: Setzt in Brand (13 Schaden/s) (Stufe 5) | Zunderbüchse, Kriegsbanner, Kriegstrommel |
| Blasrohr | Gift, Fernkampf | Schnelle Giftpfeile auf die nächsten Gegner. | Giftig: Vergiftet (9,5 Schaden/s, stapelt sich) (Stufe 5) | Nachtschatten, Jagdfalke, Doppelsehne |
| Kugelblitz | Blitz, Wurf | Eine langsame Blitzkugel, die alles in ihrer Nähe trifft. | Donnernd: Blitz springt auf 2 Gegner über (Stufe 5) | Sturmfeder, Sternenstaub, Kriegstrommel |
| Gletscherspeer | Eis, Fernkampf | Ein Eisspeer, der durch ganze Reihen fliegt und sie gefrieren lässt. | Frostig: Verlangsamt um 40 %, 10 % Chance zu erstarren (Stufe 5) | Eisherz, Jagdfalke, Rundschild |
| Lederpeitsche | Tier, Stahl | Peitscht abwechselnd nach links und rechts. | Reißend: Blutung (14 Schaden/s, stapelt sich bis 5) (Stufe 5) | Zahnkette, Kriegsbanner, Sense |
| Sense | Geist, Stahl | Ein weiter Rundumschlag, der Leben stiehlt. | Durstig: Heilt dich um 1,8 % des Schadens (Stufe 5) | Lederpeitsche, Mondstein, Zahnkette |
| Steinhagel | Erde, Wurf | Felsbrocken prasseln auf eine Stelle mit vielen Gegnern. | Betäubend: 18 % Chance zu betäuben (Stufe 5) | Drachenschuppe, Rundschild, Kriegstrommel |
| Rundschild | Stahl, Erde | Schilde kreisen um dich, halten Geschosse auf und stoßen Gegner weg. | Schützend: 9 % Chance auf einen Schutzschild (Stufe 5) | Steinhagel, Gletscherspeer, Eisherz, Drachenschuppe |
| Jagdfalke | Tier, Fernkampf | Ein Falke stößt in langen Bahnen durch die Gegner. | Durchbohrend: Durchbohrt 2 weitere Gegner (Stufe 5) | Blasrohr, Gletscherspeer, Sturmfeder, Falkenauge |
| Pilzring | Natur, Gift | Pilze sprießen um dich und platzen zu Sporenwolken. | Berstend: 30 % Chance auf Explosion (Stufe 5) | Nachtschatten, Quellwasser, Sternenstaub |
| Kriegstrommel | Aura, Erde | Jeder Trommelschlag trifft alles um dich und macht dich kurz schneller. | Flink: 23 % schneller (Stufe 5) | Feuerwirbel, Kugelblitz, Steinhagel, Kriegsbanner |
| Sternenstaub | Licht, Geist | Sterne stürzen irgendwo auf den Kampfplatz und reißen Krater. | Riesig: +30 % Fläche und Größe (Stufe 5) | Kugelblitz, Pilzring, Mondstein, Geisterlaterne |

## Gaben (30)
| Gabe | Merkmale | Wirkung | gibt Partnern | Kombi-Partner |
|---|---|---|---|---|
| Eisenwille | Erde | +12 % Leben, +1 Rüstung je zwei Stufen. | Wuchtig: Stößt Gegner 50px zurück (Stufe 5) | Wurfaxt, Frostkranz, Sturmglocke, Morgenstern, Wegzehrung |
| Falkenauge | Fernkampf | Geschosse +10 % schneller, +4 % kritische Treffer. | Suchend: Geschosse suchen sich ihr Ziel (Stufe 5) | Speer, Jagdbogen, Rabenschwarm, Doppelsehne, Jagdfalke |
| Hasenpfote | Tier | +7 % Laufgeschwindigkeit. | Flink: 23 % schneller (Stufe 5) | Wurfmesser, Wolfsgeist, Bumerang, Magnetstein |
| Glücksklee | Natur | Mehr Glück: bessere Angebote, +3 % kritische Treffer. | Scharf: +15 % kritische Treffer (Stufe 5) | Kurzschwert, Schleuder, Runenstein, Sonnenspiegel |
| Moosherz | Natur | +0,4 Leben pro Sekunde. | Durstig: Heilt dich um 1,8 % des Schadens (Stufe 5) | Kräuterbeutel, Dornenranke, Bienenkorb, Trollblut, Wegzehrung |
| Eulenfeder | Licht | +10 % Erfahrung. | Verflucht: Getroffene nehmen 18 % mehr Schaden (Stufe 5) | Geisterlaterne, Donnerkeil, Runenstein, Magnetstein |
| Schleifstein | Stahl | +8 % Schaden. | Schwer: +30 % Schaden (Stufe 5) | Kurzschwert, Armbrust, Kriegsbemalung, Ahnenstein |
| Zunderbüchse | Feuer | Brand +15 %, +3 % Schaden. | Brennend: Setzt in Brand (13 Schaden/s) (Stufe 5) | Fackel, Wurfaxt, Jagdbogen, Sonnenspiegel, Feuerwirbel |
| Frostzahn | Eis | Verlangsamung +6 %, +4 % Schaden gegen Verlangsamte. | Frostig: Verlangsamt um 40 %, 10 % Chance zu erstarren (Stufe 5) | Eiszapfen, Armbrust, Wurzelschlag, Trollblut |
| Blitzbernstein | Blitz | Ketten springen weiter, +3 % Tempo. | Donnernd: Blitz springt auf 2 Gegner über (Stufe 5) | Donnerkeil, Speer, Sanduhr, Magnetstein |
| Schlangenzahn | Gift | Gift +20 %, Gift hält länger. | Giftig: Vergiftet (9,5 Schaden/s, stapelt sich) (Stufe 5) | Jagdbogen, Wurfmesser, Kräuterbeutel, Moorkrug, Dornenranke |
| Wolfsfell | Tier | Tiere +12 % Schaden, +3 % Laufgeschwindigkeit. | Reißend: Blutung (14 Schaden/s, stapelt sich bis 5) (Stufe 5) | Wolfsgeist, Rabenschwarm, Bienenkorb, Dornenpanzer |
| Riesenring | Aura | +9 % Fläche und Größe. | Riesig: +30 % Fläche und Größe (Stufe 5) | Wurfaxt, Kräuterbeutel, Fackel, Glutstein, Moorkrug |
| Sanduhr | Licht | Alle Waffen 5 % schneller. | Flink: 23 % schneller (Stufe 5) | Armbrust, Eiszapfen, Donnerkeil, Blitzbernstein |
| Doppelsehne | Fernkampf, Wurf | +1 Geschoss auf Stufe 3, 6 und 9. | Doppelt: +2 Geschoss/Treffer (Stufe 5) | Jagdbogen, Wurfmesser, Falkenauge, Mondsichel, Blasrohr |
| Magnetstein | Erde | Erfahrung aus größerer Entfernung einsammeln. | Springend: Prallt 2× zum nächsten Gegner ab (Stufe 5) | Schleuder, Bumerang, Hasenpfote, Eulenfeder, Blitzbernstein |
| Krähenfeder | Geist | Wirkungen halten 10 % länger. | Spukend: 18 % Chance, beim Kill einen Geist zu rufen (Stufe 5) | Frostkranz, Moorkrug, Geisterlaterne, Rabenschwarm, Mondsichel |
| Dornenpanzer | Natur, Erde | +1 Rüstung, wer dich trifft, nimmt Schaden. | Dornig: Getötete Gegner verschießen 5 Dornen (Stufe 5) | Dornenranke, Wolfsfell, Trollblut |
| Kriegsbemalung | Stahl | Kritische Treffer +15 % stärker. | Reißend: Blutung (14 Schaden/s, stapelt sich bis 5) (Stufe 5) | Kurzschwert, Wurfmesser, Wolfsgeist, Kriegshorn, Schleifstein |
| Wegzehrung | Natur | +8 % Leben, jeder Levelaufstieg heilt. | Schützend: 9 % Chance auf einen Schutzschild (Stufe 5) | Moosherz, Eisenwille, Kräuterbeutel |
| Ahnenstein | Erde, Licht | +4 % Schaden und +4 % Erfahrung. | Berstend: 30 % Chance auf Explosion (Stufe 5) | Glutstein, Kriegshammer, Runenstein, Sonnenspiegel, Schleifstein |
| Trollblut | Natur | +0,25 Leben pro Sekunde, +5 % Leben. Auf Stufe 10: einmal wiederaufstehen. | Betäubend: 18 % Chance zu betäuben (Stufe 5) | Wurzelschlag, Morgenstern, Moosherz, Frostzahn, Dornenpanzer |
| Drachenschuppe | Feuer, Erde | +1 Rüstung, Brand +10 %. | Brennend: Setzt in Brand (13 Schaden/s) (Stufe 5) | Steinhagel, Rundschild, Eisherz |
| Nachtschatten | Gift, Natur | Gift +15 %, vergiftete Gegner nehmen mehr Schaden. | Verflucht: Getroffene nehmen 18 % mehr Schaden (Stufe 5) | Blasrohr, Pilzring, Quellwasser |
| Sturmfeder | Blitz, Tier | +5 % Laufgeschwindigkeit, Ketten springen weiter. | Flink: 23 % schneller (Stufe 5) | Kugelblitz, Jagdfalke, Zahnkette |
| Mondstein | Geist, Licht | +3 % kritische Treffer, +5 % Erfahrung. | Spukend: 18 % Chance, beim Kill einen Geist zu rufen (Stufe 5) | Sense, Sternenstaub, Quellwasser |
| Kriegsbanner | Stahl, Aura | +5 % Schaden, +5 % Fläche. | Schwer: +30 % Schaden (Stufe 5) | Feuerwirbel, Lederpeitsche, Kriegstrommel, Kriegshorn |
| Quellwasser | Natur, Licht | +0,3 Leben pro Sekunde, Brot und Herzen heilen doppelt. | Durstig: Heilt dich um 1,8 % des Schadens (Stufe 5) | Pilzring, Nachtschatten, Mondstein |
| Zahnkette | Tier, Stahl | Kritische Treffer +10 % stärker, Blutung +10 %. | Scharf: +15 % kritische Treffer (Stufe 5) | Lederpeitsche, Sense, Sturmfeder |
| Eisherz | Eis | Verlangsamung +5 %; unter halbem Leben +3 Rüstung. | Frostig: Verlangsamt um 40 %, 10 % Chance zu erstarren (Stufe 5) | Gletscherspeer, Rundschild, Drachenschuppe |

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

## Relikte (im Goldrahmen)
| Relikt | Wirkung |
|---|---|
| Herz des Waldes | Alle Natur-Merkmale zählen doppelt, +40 % Leben, +1 Leben pro Sekunde. |
| Ruprechts Glocke | Alle 8 Sekunden läutet sie: eine riesige Druckwelle betäubt alles. |
| Adelheids Siegel | +1 Geschoss für alle Waffen und +20 % Schaden. |
| Phönixfeder | Einmal aus der Asche auferstehen; danach brennt alles um dich. |
| Sand der Zeit | Alle Waffen 25 % schneller. |
| Mondsilberklinge | Kritische Treffer schleudern Blitze auf drei Gegner. |
| Krone des Rattenkönigs | Jeder 15. Kill ruft eine Rattenschar, die für dich kämpft. |
| Auge des Sturms | Gegner in deiner Nähe sind stark verlangsamt, Geschosse fliegen 30 % schneller. |

## Gegner
- Wald: Moderling, Wolf, Keiler, Dornspucker, Krähe – Anführer: Der Moderkeiler
- Söldner: Söldner, Plünderer, Schildträger, Armbrustschütze, Kampfhund – Anführer: Vogt Kuno
- Gruft: Knochenmann, Schatten, Grabwächter, Irrlicht, Fledermaus – Anführerin: Die Gruftwächterin
- Berg: Eiswicht, Bergwolf, Schneebär, Steinwerfer, Eiskrähe – Anführer: Der weiße Bär
- Wildnis: Frischling, Wolf, Bär, Dornspucker, Wespe – Anführer: Der Höhlenbär
- Tiere: Riesenratte, Wiesel, Dachs, Speikröte, Ratte – Anführer: Der Rattenkönig
