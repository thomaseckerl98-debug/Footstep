# Mossheart – Schritt 1: Login + Startdorf

Spiele-Link: https://mossheart.onrender.com (Ersatz: https://thomaseckerl98-debug.github.io/Footstep/)

Statische Website (kein eigener Server) + Supabase (Login & Datenbank, Gratis-Tarif).

## Einrichtung (ca. 15 Minuten)

1. **Supabase-Konto** auf supabase.com anlegen, "New project" (Region möglichst Frankfurt), Datenbank-Passwort notieren.
2. **E-Mail-Bestätigung ausschalten** (für die Freundesrunde einfacher):
   Authentication → Sign In / Providers (Menü kann je nach Version anders heißen) → Email → "Confirm email" aus.
3. **Datenbank anlegen:** SQL Editor → New query → kompletten Inhalt von `supabase/schema.sql` einfügen → Run.
4. **Schlüssel eintragen:** Project Settings → API → "Project URL" und den `anon`/`publishable` Key in `config.js` einsetzen.
   Den `service_role`/`secret` Key niemals einsetzen.
5. **Lokal testen** (Ordner öffnen, Terminal):
   `python3 -m http.server 8000` → im Browser http://localhost:8000
   (Direkt per Doppelklick auf index.html funktioniert nicht, weil Browser dort Module blockieren.)
6. **Für Freunde online stellen:** Ordner als statische Seite hosten, z. B. GitHub Pages oder Cloudflare Pages (nach meinem Kenntnisstand kostenlos, bitte prüfen).

## Was es kann

- Registrieren mit E-Mail, Passwort und Charaktername (eindeutig)
- Anmelden / Abmelden, Sitzung bleibt im Browser erhalten
- Automatisch ein Startdorf auf einem zufälligen freien Feld einer 100×100-Karte
- Holz-Zähler als Test des Zeitprinzips: Stand + Zeitstempel in der Datenbank, aktueller Wert wird beim Abruf aus der **Serverzeit** berechnet. Die Geräteuhr des Spielers spielt keine Rolle.

## Sicherheit

- Spieler können nur ihr eigenes Dorf lesen und nichts direkt in der Datenbank ändern.
- Alles, was später etwas verändert (bauen, angreifen), läuft über eigene Datenbankfunktionen.

## Nächste Schritte

Gebäude und Bauschlange → Weltkarte → Quests/Spielleiter → Diplomatie.
