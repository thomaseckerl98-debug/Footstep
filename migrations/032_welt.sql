-- 032: Die Welt – Reiche, Orte, Beziehungen, Ereignisse; NPC-Orte leben langsam weiter; Weltkarte für alle gleich.
-- Grundsatz Gleichgewicht: Orte wachsen langsam (Dörfer ca. ein Haus in zwei Wochen), Städte erobern keine Dörfer.
-- Fehden schwächen, aber vernichten nicht; jeder Ort hat einen Grund zu bestehen (Handel, Furcht, Lage, Glaube).

create table if not exists public.welt_reiche (id text primary key, name text not null, kurz text, herrscher text, farbe text, wappen text);
create table if not exists public.welt_orte (
  id text primary key, name text not null, art text not null check (art in ('dorf', 'stadt', 'grossstadt', 'burg', 'kloster')),
  reich text references public.welt_reiche(id), x int not null, y int not null, stil text, spezial text[] not null default '{}',
  haeuser int not null default 8, mauer smallint not null default 0, tuerme smallint not null default 0, einwohner int not null default 50,
  wohlstand numeric not null default 55, text text, existenz text, village_id bigint unique references public.villages(id) on delete set null,
  landschaft text, gegruendet timestamptz not null default now(), tick_at timestamptz not null default now());
create table if not exists public.welt_plaetze (id text primary key, name text, landschaft text not null, x int not null, y int not null, ort text references public.welt_orte(id));
create table if not exists public.welt_beziehungen (
  id bigserial primary key, a text not null references public.welt_orte(id), b text not null references public.welt_orte(id),
  art text not null check (art in ('handel', 'buendnis', 'rivalitaet', 'furcht', 'nachbar', 'vasall')), grund text, staerke int not null default 50,
  seit timestamptz not null default now(), unique (a, b, art));
create table if not exists public.welt_ereignisse (
  id bigserial primary key, ort text references public.welt_orte(id), ziel text references public.welt_orte(id), art text not null, text text not null,
  von timestamptz not null default now(), bis timestamptz not null default now() + interval '1 day', erledigt boolean not null default false, ref text unique);
create index if not exists welt_ereignisse_bis on public.welt_ereignisse (bis desc);
create index if not exists welt_ereignisse_von on public.welt_ereignisse (von desc);
alter table public.welt_reiche enable row level security; alter table public.welt_orte enable row level security; alter table public.welt_plaetze enable row level security;
alter table public.welt_beziehungen enable row level security; alter table public.welt_ereignisse enable row level security;
revoke all on public.welt_reiche, public.welt_orte, public.welt_plaetze, public.welt_beziehungen, public.welt_ereignisse from anon, authenticated;

/* ---------- Startdaten (aus game/welt_daten.js) ---------- */
-- automatisch erzeugt aus game/welt_daten.js (tools/welt_sql.mjs)
insert into public.welt_reiche (id, name, kurz, herrscher, farbe, wappen) values ('moosherz', 'Königreich Moosherz', 'Moosherz', 'König Ottokar', '#d9a531', 'Goldener Hirsch auf Grün') on conflict (id) do update set name = excluded.name, kurz = excluded.kurz, herrscher = excluded.herrscher, farbe = excluded.farbe, wappen = excluded.wappen;
insert into public.welt_reiche (id, name, kurz, herrscher, farbe, wappen) values ('rabenfels', 'Grafschaft Rabenfels', 'Rabenfels', 'Graf Wulfhard der Graue', '#5b7fa8', 'Schwarzer Rabe auf Grau') on conflict (id) do update set name = excluded.name, kurz = excluded.kurz, herrscher = excluded.herrscher, farbe = excluded.farbe, wappen = excluded.wappen;
insert into public.welt_reiche (id, name, kurz, herrscher, farbe, wappen) values ('salzbund', 'Salzbund der Küstenstädte', 'Salzbund', 'Der Rat der Reeder', '#3a9a96', 'Weißes Schiff auf Blau') on conflict (id) do update set name = excluded.name, kurz = excluded.kurz, herrscher = excluded.herrscher, farbe = excluded.farbe, wappen = excluded.wappen;
insert into public.welt_reiche (id, name, kurz, herrscher, farbe, wappen) values ('ostmark', 'Mark Ostmark', 'Ostmark', 'Markgräfin Ysolde', '#b0453b', 'Rote Traube auf Gold') on conflict (id) do update set name = excluded.name, kurz = excluded.kurz, herrscher = excluded.herrscher, farbe = excluded.farbe, wappen = excluded.wappen;
insert into public.welt_reiche (id, name, kurz, herrscher, farbe, wappen) values ('nebelmoor', 'Stämme des Nebelmoors', 'Moorstämme', 'Die Alte vom Moor', '#7a8a3a', 'Unke im Schilf') on conflict (id) do update set name = excluded.name, kurz = excluded.kurz, herrscher = excluded.herrscher, farbe = excluded.farbe, wappen = excluded.wappen;
insert into public.welt_reiche (id, name, kurz, herrscher, farbe, wappen) values ('frei', 'Freie Orte', 'frei', 'niemandem untertan', '#9a8f80', '') on conflict (id) do update set name = excluded.name, kurz = excluded.kurz, herrscher = excluded.herrscher, farbe = excluded.farbe, wappen = excluded.wappen;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('moosherz', 'Moosherz', 'grossstadt', 'moosherz', 1720, 2392, 'ziegel', array['hof','markt','dom','hafen']::text[], 72, 3, 9, 55, 'Die Königsstadt am Silberlauf. Hier sitzt König Ottokar, hier werden Gesetze gemacht und Münzen geprägt.', 'Sitz des Königs, größter Markt des Mooslands.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('furtenau', 'Furtenau', 'stadt', 'moosherz', 1995, 1648, 'stroh', array['furt','markt','fest']::text[], 31, 1, 2, 55, 'Wo die Furt über den Silberlauf führt, rastet jeder Händler. Berühmt für das Herbstfest und laute Wettkämpfer.', 'Die einzige Furt weit und breit – wer den Fluss quert, kommt durch Furtenau.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('hollerbrueck', 'Hollerbrück', 'dorf', 'moosherz', 2295, 1945, 'stroh', array['bruecke','muehle']::text[], 12, 0, 0, 55, 'Ein Dorf an der alten Steinbrücke über den Mühlbach, umgeben von Holunderhecken.', 'Die Brücke und die Mühle versorgen das ganze Hügelland mit Mehl.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('butterau', 'Butterau', 'dorf', 'moosherz', 1360, 2010, 'stroh', array['kuehe','kaese']::text[], 10, 0, 0, 55, 'Grüne Weiden, schwarz-weiße Kühe, der beste Käse des Königreichs.', 'Butterau liefert Milch, Käse und Fleisch nach Moosherz. Wer Butterau angreift, hungert die Hauptstadt aus – der König schützt es.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('goldacker', 'Goldacker', 'dorf', 'moosherz', 1930, 2170, 'stroh', array['korn','muehle']::text[], 14, 0, 0, 55, 'Weizenfelder bis zum Horizont, drei Windmühlen auf dem Hügel.', 'Die Kornkammer der Hauptstadt.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('kalkgrube', 'Kalkgrube', 'dorf', 'moosherz', 2620, 760, 'schiefer', array['steinbruch']::text[], 8, 0, 1, 55, 'Ein staubiges Dorf am Steinbruch unter dem Graukamm.', 'Fast jeder Stein in Moosherz kommt aus der Kalkgrube.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('ginsterhof', 'Ginsterhof', 'dorf', 'moosherz', 2560, 2300, 'stroh', array['schafe','wolle']::text[], 7, 0, 0, 55, 'Verstreute Höfe auf der Heide, Schafe zwischen gelbem Ginster.', 'Wolle für die Webstühle von Furtenau.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('rabenfels', 'Rabenfels', 'burg', 'rabenfels', 1290, 800, 'schiefer', array['burg','fels']::text[], 24, 3, 6, 55, 'Eine düstere Burg auf einem Felsen über dem Rabenwasser. Sitz von Graf Wulfhard dem Grauen.', 'Seit dreihundert Jahren nie erobert – der Fels ist steiler als jede Leiter.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('eisgrund', 'Eisgrund', 'stadt', 'rabenfels', 1700, 660, 'schiefer', array['mine','silber']::text[], 21, 2, 2, 55, 'Eine Bergbaustadt in den Ausläufern des Graukamms. Tag und Nacht klingen die Hämmer.', 'Silber aus Eisgrund prägt die Münzen beider Reiche – keiner kann es sich leisten, die Minen zu zerstören.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('weisswacht', 'Weißwacht', 'burg', 'rabenfels', 1955, 470, 'schiefer', array['pass','zoll']::text[], 6, 3, 3, 55, 'Eine kleine Feste, die den Weißen Pass bewacht.', 'Wer über den Pass will, zahlt hier Zoll.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('foehrenbach', 'Föhrenbach', 'dorf', 'rabenfels', 880, 1000, 'holz', array['holz','harz']::text[], 9, 0, 0, 55, 'Holzfäller und Harzsammler zwischen hohen Föhren.', 'Die Werften von Salzwacht brauchen Föhrenbachs Stämme.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('wolfsheim', 'Wolfsheim', 'dorf', 'rabenfels', 1520, 1080, 'holz', array['jagd','pelz']::text[], 9, 1, 1, 55, 'Jäger und Fallensteller am Rand der Rabenhöhen.', 'Pelze für den Winter – die Grafschaft lebt im Frost davon.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('salzwacht', 'Salzwacht', 'grossstadt', 'salzbund', 560, 1590, 'ziegelrot', array['hafen','salz','werft','markt']::text[], 60, 2, 7, 55, 'Die große Hafenstadt an der Mündung des Rabenwassers. Möwen, Teer und Salz, Schiffe aus fernen Ländern.', 'Salz, Fisch und Schiffe – ohne Salzwacht verdirbt im Winter das Fleisch des halben Landes.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('moewenkap', 'Möwenkap', 'dorf', 'salzbund', 440, 1150, 'ziegelrot', array['fischerei','leuchtturm']::text[], 9, 0, 1, 55, 'Fischerhütten unter einem Leuchtturm auf dem Kap.', 'Der Leuchtturm bringt jedes Schiff sicher nach Salzwacht.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('tangfurt', 'Tangfurt', 'dorf', 'salzbund', 900, 2580, 'ziegelrot', array['fischerei','salzgarten']::text[], 8, 0, 0, 55, 'Salzgärten und Tangfelder an der Südküste.', 'Die Salzgärten von Tangfurt gehören dem Salzbund – und der schützt sein Salz.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('brandenstein', 'Brandenstein', 'stadt', 'ostmark', 3720, 1400, 'ziegel', array['burg','wein','markt']::text[], 34, 2, 4, 55, 'Die Hauptstadt der Ostmark, umgeben von Rebhängen. Sitz der Markgräfin Ysolde.', 'Die Mark hält den Kammpass – und ihr Wein ist am Königshof begehrt.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('traubenhang', 'Traubenhang', 'dorf', 'ostmark', 3760, 1930, 'ziegel', array['wein']::text[], 9, 0, 0, 55, 'Winzerhäuser zwischen Rebstöcken in der Sonne.', 'Der beste Rote der Welt, sagen die Winzer. Niemand widerspricht laut.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('kammwacht', 'Kammwacht', 'burg', 'ostmark', 3450, 1660, 'schiefer', array['pass','zoll']::text[], 5, 3, 4, 55, 'Die Grenzfeste am Kammpass zwischen Moderwald und Ostmark.', 'Der einzige Weg durch den Ostkamm.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('unkenpfuhl', 'Unkenpfuhl', 'dorf', 'nebelmoor', 3020, 2500, 'schilf', array['moor','stelzen','torf']::text[], 10, 1, 0, 55, 'Pfahlhäuser über dem Wasser, verbunden durch Bohlenwege. Die Moorleute sind misstrauisch gegen Fremde.', 'Im Moor findet sich kein Heer zurecht. Und Torf heizt im Winter ganze Städte.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('kraehenstieg', 'Krähenstieg', 'dorf', 'frei', 3270, 2700, 'schilf', array['gilde','moor']::text[], 11, 1, 1, 55, 'Ein stilles Dorf am Rand des Moors. Hier haben die Graumäntel ihr Haus – eine Gilde, über die man nur flüstert.', 'Niemand rührt Krähenstieg an. Wer es versucht, wacht nicht mehr auf – sagt man über die Graumäntel. Selbst der König zahlt lieber, als sie sich zum Feind zu machen.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('moorhain', 'Moorhain', 'dorf', 'nebelmoor', 2860, 2740, 'schilf', array['kraeuter','pilze']::text[], 7, 0, 0, 55, 'Kräuterweiber und Pilzsammler auf einer Insel im Moor.', 'Heilkräuter, die nur hier wachsen – jeder Heiler im Land kauft in Moorhain.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('morgenstern', 'Kloster Morgenstern', 'kloster', 'frei', 2090, 2560, 'ziegel', array['kloster','heiler','bier']::text[], 6, 1, 1, 55, 'Ein Kloster mit Glockenturm, Kräutergarten und Brauhaus.', 'Die Mönche heilen jeden, gleich welches Banner er trägt. Wer das Kloster angreift, verliert jeden Segen.') on conflict (id) do nothing;
insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, text, existenz) values ('russgrund', 'Rußgrund', 'dorf', 'frei', 2930, 1580, 'holz', array['kohle','holz']::text[], 7, 0, 0, 55, 'Köhler im tiefen Moderwald. Rauch steigt aus den Meilern, Tag und Nacht.', 'Ohne die Holzkohle aus Rußgrund steht jede Schmiede still.') on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_hochtal', 'Tannhöhe', 'hochtal', 2445, 905) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_seeufer', 'Seewinkel', 'seeufer', 2440, 1640) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_klamm', 'Rotklamm', 'klamm', 2245, 1235) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_heide', 'Heidrun', 'heide', 2420, 2470) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_urwald', 'Moosgrund', 'urwald', 3090, 1170) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_fjord', 'Nebelfjord', 'fjord', 520, 900) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_hochtal2', 'Firnhang', 'hochtal', 2880, 780) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_seeufer2', 'Unkenried', 'seeufer', 1200, 1450) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_klamm2', 'Wolfsschlucht', 'klamm', 1620, 1350) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_heide2', 'Ginsterau', 'heide', 2780, 2250) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_urwald2', 'Farnwinkel', 'urwald', 1000, 1800) on conflict (id) do nothing;
insert into public.welt_plaetze (id, name, landschaft, x, y) values ('p_fjord2', 'Kliffhafen', 'fjord', 420, 2150) on conflict (id) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('butterau', 'moosherz', 'handel', 'Milch, Käse und Fleisch für die Hauptstadt') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('goldacker', 'moosherz', 'handel', 'Korn') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('eisgrund', 'moosherz', 'handel', 'Silber für die Münze – trotz aller Spannungen') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('eisgrund', 'rabenfels', 'handel', 'Silber und Eisen') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('salzwacht', 'moosherz', 'handel', 'Salz und Fisch') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('salzwacht', 'furtenau', 'handel', 'Salz') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('salzwacht', 'rabenfels', 'handel', 'Salz gegen Pelze') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('moewenkap', 'salzwacht', 'handel', 'Fisch') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('tangfurt', 'salzwacht', 'handel', 'Salz aus den Gärten') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('foehrenbach', 'salzwacht', 'handel', 'Stämme für die Werft') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('russgrund', 'furtenau', 'handel', 'Holzkohle für die Schmieden') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('ginsterhof', 'furtenau', 'handel', 'Wolle') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('traubenhang', 'brandenstein', 'handel', 'Wein') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('brandenstein', 'furtenau', 'handel', 'Wein über den Kammpass') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('unkenpfuhl', 'morgenstern', 'handel', 'Torf und Moorkräuter') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('moorhain', 'morgenstern', 'handel', 'Heilpilze') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('kalkgrube', 'moosherz', 'handel', 'Stein für Mauern und Dom') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('hollerbrueck', 'furtenau', 'handel', 'Mehl') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('wolfsheim', 'rabenfels', 'handel', 'Pelze') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('unkenpfuhl', 'brandenstein', 'handel', 'Torf für den Winter') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('moosherz', 'salzwacht', 'buendnis', 'Handelsbund seit dem Großen Winter') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('brandenstein', 'salzwacht', 'buendnis', 'Wein gegen Salz, Schiffe gegen Wagen') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('moosherz', 'rabenfels', 'rivalitaet', 'Streit um das Silber von Eisgrund') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('rabenfels', 'salzwacht', 'rivalitaet', 'Fischrechte am Rabenwasser') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('brandenstein', 'moosherz', 'rivalitaet', 'Zölle am Kammpass') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('unkenpfuhl', 'ginsterhof', 'rivalitaet', 'Weidestreit am Moorrand') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('kraehenstieg', 'moorhain', 'furcht', 'Man zahlt, man schweigt') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('kraehenstieg', 'moosherz', 'furcht', 'Der König zahlt lieber, als sich die Graumäntel zum Feind zu machen') on conflict (a, b, art) do nothing;
insert into public.welt_beziehungen (a, b, art, grund) values ('kraehenstieg', 'unkenpfuhl', 'furcht', 'Alte Abmachungen im Nebel') on conflict (a, b, art) do nothing;

/* ---------- Spielerdörfer auf der Karte ---------- */
create or replace function public.welt_ort_fuer_dorf(p_v bigint) returns text language plpgsql security definer set search_path = public as $$
declare v villages; pl welt_plaetze; oid text := 'v' || p_v; nm text;
begin
  if exists (select 1 from welt_orte where village_id = p_v) then return (select id from welt_orte where village_id = p_v); end if;
  select * into v from villages where id = p_v; if v.id is null then return null; end if;
  select * into pl from welt_plaetze where ort is null order by (landschaft = coalesce(v.landschaft, '')) desc, id limit 1;
  if pl.id is null then return null; end if;
  nm := case when coalesce(v.name, '') = '' or v.name like 'Dorf von %' then coalesce(pl.name, v.name) else v.name end;
  if nm is distinct from v.name then update villages set name = nm where id = p_v; end if;
  insert into welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, village_id, landschaft, text, existenz)
  values (oid, nm, 'dorf', 'moosherz', pl.x, pl.y,
    case coalesce(v.landschaft, '') when 'hochtal' then 'holz' when 'seeufer' then 'stroh' when 'klamm' then 'schiefer' when 'heide' then 'stroh' when 'urwald' then 'holz' when 'fjord' then 'ziegelrot' else 'stroh' end,
    case coalesce(v.landschaft, '') when 'seeufer' then array['fischerei'] when 'fjord' then array['fischerei'] when 'klamm' then array['fels'] when 'hochtal' then array['weide'] when 'urwald' then array['holz'] when 'heide' then array['schafe'] else '{}'::text[] end,
    0, p_v, v.landschaft, 'Ein junges Dorf im Königreich Moosherz.', 'Hier lebt ' || coalesce((select character_name from profiles where id = v.owner_id), 'jemand') || ' mit den Dorfleuten.')
  on conflict (id) do nothing;
  update welt_plaetze set ort = oid where id = pl.id;
  insert into welt_beziehungen (a, b, art, grund) values (oid, 'moosherz', 'vasall', 'Untertan von König Ottokar') on conflict do nothing;
  insert into welt_beziehungen (a, b, art, grund)
    select oid, o.id, 'nachbar', 'Nachbardorf' from welt_orte o where o.village_id is not null and o.id <> oid and sqrt(power(o.x - pl.x, 2) + power(o.y - pl.y, 2)) < 1000 on conflict do nothing;
  return oid;
end $$;
create or replace function public.trg_welt_neues_dorf() returns trigger language plpgsql security definer set search_path = public as $$
begin perform welt_ort_fuer_dorf(new.id); return new; end $$;
drop trigger if exists welt_neues_dorf on public.villages;
create trigger welt_neues_dorf after insert on public.villages for each row execute function public.trg_welt_neues_dorf();

create or replace function public.welt_wohlstand_wort(w numeric) returns text language sql immutable as $$
  select case when w >= 80 then 'blühend' when w >= 62 then 'wohlhabend' when w >= 45 then 'gut versorgt' when w >= 30 then 'karg' else 'in Not' end;
$$;

create or replace function public.welt_ereignis(p_ort text, p_art text, p_text text, p_dauer interval, p_ziel text default null, p_ref text default null) returns void language sql security definer set search_path = public as $$
  insert into welt_ereignisse (ort, ziel, art, text, von, bis, ref) values (p_ort, p_ziel, p_art, p_text, now(), now() + p_dauer, p_ref) on conflict (ref) do nothing;
$$;

/* ---------- Das Leben der Welt (alle 3 Stunden) ---------- */
create or replace function public.welt_tick() returns void language plpgsql security definer set search_path = public as $$
declare o record; dt numeric; tr int; neg int; target numeric; cap int; base numeric; wl numeric; hs int; mz int; tz int; art_neu text; drohung boolean;
  r record; sa numeric; sb numeric; los text; sieg text; ln text; sn text; spez text; liefer text; zo record;
begin
  -- Spielerdörfer: Größe und Ereignisse aus dem echten Spiel
  for o in select w.id, w.name, w.village_id, v.layout, v.name vname from welt_orte w join villages v on v.id = w.village_id loop
    update welt_orte set name = coalesce(nullif(o.vname, ''), name),
      haeuser = (select count(*) from jsonb_array_elements(coalesce(o.layout, '[]'::jsonb)) e where e->>0 <> 'feld'),
      tuerme = (select count(*) from jsonb_array_elements(coalesce(o.layout, '[]'::jsonb)) e where e->>0 in ('wachturm', 'kaserne')),
      einwohner = (select count(*) from npcs where village_id = o.village_id and tot_at is null), tick_at = now()
    where id = o.id;
    insert into welt_ereignisse (ort, art, text, von, bis, ref)
    select o.id, case e.vorlage when 'scheunenbrand' then 'brand' when 'fieber' then 'seuche' when 'woelfe' then 'ueberfall' when 'sturm' then 'sturm' when 'duerre' then 'duerre' else 'krise' end,
      t.titel || ' in ' || o.name || '.', e.entschieden_at, e.entschieden_at + interval '30 hours', 'de' || e.id
    from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage
    where e.village_id = o.village_id and t.art = 'krise' and e.status = 'entschieden' and e.entschieden_at > now() - interval '30 hours' on conflict (ref) do nothing;
    insert into welt_ereignisse (ort, art, text, von, bis, ref)
    select o.id, 'bau', o.name || ': ' || coalesce((select b.name from eco_buildings b where b.id = p.gebaeude), 'ein Gebäude') || case when p.art = 'neu' then ' fertig gebaut.' else ' ausgebaut.' end,
      p.done_at, p.done_at + interval '20 hours', 'vp' || p.id
    from village_projects p where p.village_id = o.village_id and p.status = 'fertig' and p.done_at > now() - interval '20 hours' on conflict (ref) do nothing;
    insert into welt_ereignisse (ort, art, text, von, bis, ref)
    select o.id, 'trauer', l.text, l.at, l.at + interval '1 day', 'vl' || l.id from village_log l where l.village_id = o.village_id and l.art = 'tod' and l.at > now() - interval '1 day' on conflict (ref) do nothing;
  end loop;

  -- NPC-Orte
  for o in select * from welt_orte where village_id is null loop
    dt := least(16, extract(epoch from (now() - o.tick_at)) / 10800.0);
    continue when dt < 0.8;
    select count(*) into tr from welt_beziehungen where art = 'handel' and (a = o.id or b = o.id);
    select count(*) into neg from welt_ereignisse where (ort = o.id or (ziel = o.id and art = 'fehde')) and bis > now() and art in ('brand', 'seuche', 'ueberfall', 'fehde');
    target := 44 + 6 * least(tr, 5) + case o.art when 'grossstadt' then 8 when 'stadt' then 4 else 0 end + case when 'gilde' = any(o.spezial) then 10 else 0 end - 12 * neg;
    wl := greatest(5, least(98, o.wohlstand + (target - o.wohlstand) * least(0.6, 0.06 * dt) + (random() - 0.5) * 3));
    hs := o.haeuser; mz := o.mauer; tz := o.tuerme; art_neu := o.art;
    cap := case o.art when 'dorf' then 22 when 'stadt' then 48 when 'grossstadt' then 95 when 'burg' then 30 else 12 end;
    base := case o.art when 'dorf' then 0.010 when 'stadt' then 0.02 when 'grossstadt' then 0.03 when 'burg' then 0.006 else 0.004 end;
    -- langsames Wachstum
    if neg = 0 and random() < base * dt * (0.4 + wl / 100) * (case when hs < cap then 1 else 0.08 end) then
      hs := hs + 1;
      perform welt_ereignis(o.id, 'bau', 'In ' || o.name || ' wird ein neues Haus gebaut.', interval '18 hours');
    end if;
    if o.art = 'dorf' and hs >= 22 and wl > 72 and random() < 0.003 * dt then
      art_neu := 'stadt'; perform welt_ereignis(o.id, 'aufstieg', o.name || ' ist zur Stadt herangewachsen. Man spricht von einem Marktrecht.', interval '3 days');
    end if;
    drohung := hs > 18 or exists (select 1 from welt_ereignisse where (ort = o.id or ziel = o.id) and art in ('fehde', 'ueberfall') and von > now() - interval '30 days')
      or exists (select 1 from welt_beziehungen where art = 'rivalitaet' and (a = o.id or b = o.id));
    if mz < (case o.art when 'dorf' then 1 when 'kloster' then 1 else 3 end) and wl > 58 and drohung and random() < 0.004 * dt then
      mz := mz + 1;
      perform welt_ereignis(o.id, 'mauer', o.name || ' errichtet ' || case mz when 1 then 'eine Palisade.' when 2 then 'eine Steinmauer.' else 'mächtige Wehrmauern.' end, interval '2 days');
    end if;
    if tz < greatest(1, hs / 9) and wl > 50 and random() < 0.004 * dt then
      tz := tz + 1; perform welt_ereignis(o.id, 'turm', 'In ' || o.name || ' steht ein neuer Wachturm.', interval '1 day');
    end if;
    -- Ereignisse
    if random() < 0.004 * dt then
      if hs > 4 and random() < 0.6 then hs := hs - 1; end if; wl := wl - 6;
      perform welt_ereignis(o.id, 'brand', 'Feuer in ' || o.name || '! ' || (array['Eine Scheune brennt nieder.', 'Ein Haus am Markt steht in Flammen.', 'Der Wind trägt die Funken über die Dächer.'])[1 + floor(random() * 3)::int], make_interval(hours => 18 + floor(random() * 22)::int));
    elsif random() < 0.0015 * dt * (case when 'moor' = any(o.spezial) or o.art = 'grossstadt' then 1.6 else 1 end) then
      wl := wl - 10; perform welt_ereignis(o.id, 'seuche', 'In ' || o.name || ' geht ein Fieber um. Die Tore bleiben zu.', make_interval(days => 3 + floor(random() * 4)::int));
    elsif random() < 0.004 * dt then
      wl := wl + 2; perform welt_ereignis(o.id, 'fest', o.name || ' feiert ' || (array['ein Erntefest.', 'eine Hochzeit.', 'den Tag des Schutzheiligen.', 'einen Markttag mit Gauklern.'])[1 + floor(random() * 4)::int], interval '20 hours');
    elsif mz = 0 and not ('gilde' = any(o.spezial)) and random() < 0.003 * dt then
      wl := wl - 8; if random() < 0.3 and hs > 4 then hs := hs - 1; end if;
      perform welt_ereignis(o.id, 'ueberfall', 'Räuber haben ' || o.name || ' überfallen. Ohne Mauer hatten die Leute kaum eine Chance.', interval '14 hours');
    end if;
    update welt_orte set wohlstand = round(greatest(5, least(98, wl)), 1), haeuser = hs, mauer = mz, tuerme = tz, art = art_neu, tick_at = now(),
      einwohner = round(hs * case art_neu when 'dorf' then 6 when 'stadt' then 8.5 when 'grossstadt' then 11 when 'burg' then 9 else 5 end * (0.85 + wl / 330))
    where id = o.id;
  end loop;

  -- Handelszüge auf den Straßen
  for r in select * from welt_beziehungen where art = 'handel' and random() < 0.06 loop
    if not exists (select 1 from welt_ereignisse where art = 'handelszug' and ort = r.a and ziel = r.b and bis > now()) then
      perform welt_ereignis(r.a, 'handelszug', 'Ein Handelszug ist unterwegs: ' || coalesce(r.grund, 'Waren') || '.', interval '8 hours', r.b);
    end if;
  end loop;
  -- Fehden: schwächen, aber erobern nie; Orte mit gefürchteter Gilde bleiben unbehelligt
  if not exists (select 1 from welt_ereignisse where art = 'fehde' and bis > now()) and random() < 0.06 then
    select b.* into r from welt_beziehungen b join welt_orte x on x.id = b.a join welt_orte y on y.id = b.b
      where b.art = 'rivalitaet' and not ('gilde' = any(x.spezial)) and not ('gilde' = any(y.spezial)) and x.village_id is null and y.village_id is null order by random() limit 1;
    if r.id is not null then
      select name into ln from welt_orte where id = r.a; select name into sn from welt_orte where id = r.b;
      perform welt_ereignis(r.a, 'fehde', 'Fehde zwischen ' || ln || ' und ' || sn || ': ' || coalesce(r.grund, 'alter Groll') || '.', make_interval(days => 2 + floor(random() * 4)::int), r.b);
    end if;
  end if;
  for r in select e.*, x.name xn, y.name yn, x.haeuser * (1 + 0.3 * x.mauer) + 2 * x.tuerme + x.wohlstand / 10 xs, y.haeuser * (1 + 0.3 * y.mauer) + 2 * y.tuerme + y.wohlstand / 10 ys, y.mauer ym, x.mauer xm
      from welt_ereignisse e join welt_orte x on x.id = e.ort join welt_orte y on y.id = e.ziel where e.art = 'fehde' and e.bis < now() and not e.erledigt loop
    sa := r.xs * (0.7 + random() * 0.6); sb := r.ys * (0.7 + random() * 0.6);
    if sa >= sb then sieg := r.ort; los := r.ziel; ln := r.yn; sn := r.xn; else sieg := r.ziel; los := r.ort; ln := r.xn; sn := r.yn; end if;
    update welt_orte set wohlstand = greatest(5, wohlstand - 6), haeuser = case when mauer = 0 and random() < 0.4 and haeuser > 4 then haeuser - 1 else haeuser end where id = los;
    update welt_orte set wohlstand = least(98, wohlstand + 3) where id = sieg;
    update welt_ereignisse set erledigt = true where id = r.id;
    perform welt_ereignis(sieg, 'frieden', 'Die Fehde ist beigelegt. ' || ln || ' musste ' || sn || ' Vieh und Silber zahlen – erobert wurde niemand.', interval '1 day', los);
  end loop;
  -- neue Handelsabkommen: wer etwas hat, das einer Stadt fehlt
  if random() < 0.02 then
    select o2.*, s into r from welt_orte o2, unnest(o2.spezial) s
      where o2.village_id is null and s in ('kuehe', 'korn', 'salz', 'silber', 'wein', 'holz', 'fischerei', 'kohle', 'wolle', 'kraeuter', 'pilze', 'steinbruch', 'torf', 'pelz', 'harz', 'bier') order by random() limit 1;
    if r.id is not null then
      select x.* into zo from welt_orte x where x.art in ('stadt', 'grossstadt') and x.id <> r.id and sqrt(power(x.x - r.x, 2) + power(x.y - r.y, 2)) < 1500
        and not exists (select 1 from welt_beziehungen b where (b.a = r.id and b.b = x.id) or (b.a = x.id and b.b = r.id)) order by random() limit 1;
      if zo.id is not null then
        liefer := case r.s when 'kuehe' then 'Milch und Käse' when 'korn' then 'Korn' when 'salz' then 'Salz' when 'silber' then 'Silber' when 'wein' then 'Wein' when 'holz' then 'Holz' when 'fischerei' then 'Fisch'
          when 'kohle' then 'Holzkohle' when 'wolle' then 'Wolle' when 'kraeuter' then 'Kräuter' when 'pilze' then 'Heilpilze' when 'steinbruch' then 'Bausteine' when 'torf' then 'Torf' when 'pelz' then 'Pelze' when 'harz' then 'Harz' else 'Bier' end;
        insert into welt_beziehungen (a, b, art, grund) values (r.id, zo.id, 'handel', liefer) on conflict do nothing;
        perform welt_ereignis(r.id, 'abkommen', r.name || ' liefert künftig ' || liefer || ' nach ' || zo.name || '.', interval '1 day', zo.id);
      end if;
    end if;
  end if;
end $$;

/* ---------- Spieler auf der Karte ---------- */
create or replace function public.welt_spieler(p_uid uuid, p_ort text, p_ich boolean) returns json language plpgsql stable security definer set search_path = public as $$
declare q record; t numeric; dist numeric; seed numeric;
begin
  select r.id, r.szene, r.warte_bis, r.updated_at, tp.titel, tp.art, coalesce(tp.schwierigkeit, 1) sw, tp.def->'szenen'->r.szene->>'ort' ort into q
    from quest_runs r join quest_templates tp on tp.id = r.quest_id where r.player_id = p_uid and r.status = 'laeuft' order by q_nebenbei(r.quest_id), r.id desc limit 1;
  if q.id is null then
    return json_build_object('name', (select character_name from profiles where id = p_uid), 'ich', p_ich, 'ort', p_ort, 'unterwegs', null);
  end if;
  t := case when q.warte_bis is not null and q.warte_bis > now() then 0.1 + 0.85 * least(1, greatest(0, extract(epoch from (now() - q.updated_at)) / greatest(60, extract(epoch from (q.warte_bis - q.updated_at))))) else 1 end;
  seed := ((q.id * 2654435761) % 10007) / 10007.0;
  dist := case q.art when 'erkundung' then 70 + seed * 80 when 'chronik' then 0 + seed * 40 when 'haupt' then 220 + seed * 160 when 'ki' then 200 + seed * 220
    else case q.sw when 1 then 150 + seed * 120 when 2 then 260 + seed * 170 else 420 + seed * 300 end end;
  return json_build_object('name', (select character_name from profiles where id = p_uid), 'ich', p_ich, 'ort', p_ort,
    'unterwegs', json_build_object('titel', q.titel, 'art', q.art, 'ziel_art', coalesce(q.ort, 'wald'), 't', round(t, 3), 'seed', round(seed, 4), 'dist', round(dist), 'reist', q.warte_bis is not null and q.warte_bis > now(), 'bis', q.warte_bis));
end $$;

create or replace function public.welt_karte() returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  if coalesce((select min(tick_at) from welt_orte where village_id is null), now()) < now() - interval '4 hours' then perform welt_tick(); end if;
  return json_build_object('jetzt', now(),
    'reiche', (select json_object_agg(id, json_build_object('name', name, 'kurz', kurz, 'herrscher', herrscher, 'farbe', farbe, 'wappen', wappen)) from welt_reiche),
    'orte', (select json_agg(json_build_object('id', o.id, 'name', o.name, 'art', o.art, 'reich', o.reich, 'x', o.x, 'y', o.y, 'stil', o.stil, 'spezial', o.spezial,
        'haeuser', o.haeuser, 'mauer', o.mauer, 'tuerme', o.tuerme, 'einwohner', o.einwohner, 'wohlstand', welt_wohlstand_wort(o.wohlstand), 'text', o.text, 'existenz', o.existenz, 'landschaft', o.landschaft,
        'spieler', case when o.village_id is null then null else (select json_build_object('name', p.character_name, 'ich', v.owner_id = me,
            'gebaeude', (select coalesce(json_agg(e->>0), '[]'::json) from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) e),
            'fuehrung', (select case when a.meister_typ = 'spieler' then p.character_name || ' (Dorfmeister)' else coalesce((select name from npcs where id = a.vorsteher_npc), 'ein Vorsteher') || ' (Vorsteher)' end from dorf_amt a where a.village_id = v.id))
          from villages v join profiles p on p.id = v.owner_id where v.id = o.village_id) end) order by o.y) from welt_orte o),
    'beziehungen', (select coalesce(json_agg(json_build_object('a', a, 'b', b, 'art', art, 'grund', grund)), '[]'::json) from welt_beziehungen),
    'ereignisse', (select coalesce(json_agg(json_build_object('id', id, 'ort', ort, 'ziel', ziel, 'art', art, 'text', text, 'von', von, 'bis', bis) order by von desc), '[]'::json) from welt_ereignisse where bis > now() and not erledigt),
    'chronik', (select coalesce(json_agg(x order by x->>'von' desc), '[]'::json) from (select json_build_object('id', id, 'ort', ort, 'ziel', ziel, 'art', art, 'text', text, 'von', von) x
        from welt_ereignisse where art not in ('handelszug', 'bau') order by von desc limit 30) s),
    'spieler', (select coalesce(json_agg(welt_spieler(v.owner_id, o.id, v.owner_id = me)), '[]'::json) from welt_orte o join villages v on v.id = o.village_id)
  );
end $$;

/* ---------- Start: Spielerdörfer verorten, erstes Leben ---------- */
do $$ declare v record; begin
  for v in select id from villages where owner_id is not null order by id loop perform welt_ort_fuer_dorf(v.id); end loop;
end $$;
insert into public.welt_beziehungen (a, b, art, grund) select o.id, 'furtenau', 'handel', 'Kleinhandel und das Herbstfest' from public.welt_orte o where o.village_id is not null on conflict do nothing;
select public.welt_ereignis('furtenau', 'fest', 'Furtenau feiert den Wintermarkt – Gaukler, Glühwein und ein Wettkampf im Stammwerfen.', interval '2 days', null, 'start_fest');
select public.welt_ereignis('unkenpfuhl', 'fehde', 'Fehde zwischen Unkenpfuhl und Ginsterhof: Weidestreit am Moorrand.', interval '3 days', 'ginsterhof', 'start_fehde');
select public.welt_ereignis('salzwacht', 'handelszug', 'Ein Handelszug ist unterwegs: Salz und Fisch.', interval '8 hours', 'moosherz', 'start_zug1');
select public.welt_ereignis('eisgrund', 'handelszug', 'Ein Handelszug ist unterwegs: Silber für die Münze.', interval '8 hours', 'moosherz', 'start_zug2');
select public.welt_ereignis('wolfsheim', 'brand', 'Feuer in Wolfsheim! Eine Scheune brennt nieder.', interval '20 hours', null, 'start_brand');

do $$ begin
  if exists (select 1 from cron.job where jobname = 'mossheart-welt') then perform cron.unschedule('mossheart-welt'); end if;
  perform cron.schedule('mossheart-welt', '41 */3 * * *', 'select public.welt_tick()');
end $$;

revoke execute on function public.welt_tick(), public.welt_ort_fuer_dorf(bigint), public.welt_ereignis(text, text, text, interval, text, text), public.welt_spieler(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.welt_karte() from public, anon;
grant execute on function public.welt_karte() to authenticated;
