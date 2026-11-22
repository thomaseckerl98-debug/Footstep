-- Migration 020: Güter-Ampel. Statt Zahlen sieht man pro Gut, ob es im Dorf kein Problem ist (grün), geht aber dauert (gelb)
-- oder es bei uns gar nicht gibt (rot) – mit Begründung aus Gebäuden, Bewohnern, Jahreszeit und Zutaten.
create table if not exists public.eco_goods (
  id text primary key, name text not null, kat text not null, ord int not null, gebaeude text, jobs text[] not null default '{}',
  saison text, braucht text[] not null default '{}', basis text, ersatz text, verb text not null default 'kümmert sich darum', verb_pl text not null default 'kümmern sich darum'
);
alter table public.eco_goods add column if not exists verb_pl text not null default 'kümmern sich darum';
alter table public.eco_goods enable row level security;
revoke all on public.eco_goods from anon, authenticated;
insert into public.eco_goods (id, name, kat, ord, gebaeude, jobs, saison, braucht, basis, ersatz, verb, verb_pl) values
 ('getreide','Getreide','essen',1,'feld','{Bauer,Bäuerin}','feld','{}',null,null,'bestellt das Feld','bestellen das Feld'),
 ('mehl','Mehl','essen',2,'muehle','{Müllerin}',null,'{getreide}',null,'Gemahlen wird mühsam von Hand mit dem Mahlstein.','mahlt das Korn','mahlen das Korn'),
 ('brot','Brot','essen',3,'baeckerei','{Bäcker}',null,'{mehl}',null,'Gebacken wird zu Hause im eigenen Ofen – es reicht, aber frisches Brot für alle gibt es erst mit einer Bäckerei.','backt das Brot','backen das Brot'),
 ('wild','Wild und Felle','essen',4,'jagdhuette','{Jäger,Jägerin,Falknerin,Fallensteller}','jagd','{}',null,null,'geht auf die Jagd','gehen auf die Jagd'),
 ('fisch','Fisch','essen',5,null,'{Fischer}','jagd','{}',null,null,'fischt am Bach','fischen am Bach'),
 ('milch','Milch und Käse','essen',6,'stall','{Hirte,Stallbursche}',null,'{}',null,null,'versorgt das Vieh','versorgen das Vieh'),
 ('fleisch','Fleisch vom Vieh','essen',7,'stall','{Metzger,Hirte}',null,'{}',null,null,'schlachtet, wenn es nötig ist','schlachten, wenn es nötig ist'),
 ('eier','Eier','essen',8,null,'{}',null,'{}','haushalt',null,'',''),
 ('honig','Honig','essen',9,'imkerei','{Imkerin}','feld','{}',null,null,'pflegt die Bienen','pflegen die Bienen'),
 ('bier','Bier','essen',10,'brauerei','{Brauer}',null,'{getreide}',null,null,'braut das Bier','brauen das Bier'),
 ('holz','Holz','bau',20,'holzfaeller','{Holzfäller}',null,'{}','sammeln',null,'fällt Bäume','fällen Bäume'),
 ('bretter','Bretter','bau',21,'saegewerk','{Zimmermann,Wagner}',null,'{holz}',null,null,'sägt Bretter','sägen Bretter'),
 ('stein','Stein','bau',22,'steinmetz','{Steinmetz,Bergmann}',null,'{}',null,null,'bricht Stein','brechen Stein'),
 ('kohle','Holzkohle','handwerk',30,'koehlerei','{Köhler}',null,'{holz}',null,null,'brennt Kohle','brennen Kohle'),
 ('werkzeug','Werkzeug','handwerk',31,'schmiede','{Schmied}',null,'{kohle}',null,null,'schmiedet Werkzeug','schmieden Werkzeug'),
 ('waffen','Waffen und Rüstung','handwerk',32,'schmiede','{Waffenschmiedin,Rüstmacher}',null,'{kohle}',null,null,'schmiedet Klingen','schmieden Klingen'),
 ('wolle','Wolle','handwerk',33,'stall','{Hirte}',null,'{}',null,null,'schert die Schafe','scheren die Schafe'),
 ('stoff','Stoff und Kleidung','handwerk',34,'weberei','{Weberin,Schneiderin}',null,'{wolle}',null,null,'webt und näht','weben und nähen'),
 ('leder','Leder und Schuhe','handwerk',35,'gerberei','{Gerberin,Schuster}',null,'{wild}',null,null,'gerbt die Felle','gerben die Felle'),
 ('toepfe','Krüge und Töpfe','handwerk',36,'toepferei','{Töpfer}',null,'{}',null,null,'töpfert','töpfern'),
 ('kerzen','Kerzen','handwerk',37,'imkerei','{Kerzenzieherin}',null,'{honig}',null,null,'zieht Kerzen','ziehen Kerzen'),
 ('heilmittel','Kräuter und Heilmittel','handwerk',38,'heilerhaus','{Heilerin,Kräuterfrau,Alchemist}',null,'{}',null,null,'kennt die Kräuter','kennen die Kräuter')
on conflict (id) do update set name = excluded.name, kat = excluded.kat, ord = excluded.ord, gebaeude = excluded.gebaeude, jobs = excluded.jobs, saison = excluded.saison,
  braucht = excluded.braucht, basis = excluded.basis, ersatz = excluded.ersatz, verb = excluded.verb, verb_pl = excluded.verb_pl;

-- Ampel je Gut: grün = kein Problem, gelb = geht, dauert / knapp, rot = gibt es bei uns nicht
create or replace function public.eco_gueter(p_v bigint) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v villages; e village_eco; g eco_goods; season text; st jsonb := '{}'; acc jsonb := '[]'; ids bigint[]; nm text; cnt int; has_geb boolean;
  b eco_buildings; amp text; txt text; inp text; inp_rot text[]; inp_gelb text[]; lv int; pl int; essen numeric; vorrat_ok boolean; satz text;
begin
  select * into v from villages where id = p_v; select * into e from village_eco where village_id = p_v;
  season := coalesce(e.rates->>'season', eco_season(now()));
  essen := coalesce((e.rates->>'essen')::numeric, 2);
  vorrat_ok := coalesce((e.res->>'nahrung')::numeric, 0) > essen * 48;
  for g in select * from eco_goods order by ord loop
    select * into b from eco_buildings where id = g.gebaeude;
    pl := case when g.gebaeude is null then null else layout_plot(v.layout, g.gebaeude) end;
    has_geb := g.gebaeude is null or pl is not null;
    lv := case when pl is null then 1 else eco_lvl(e.stufen, pl) end;
    select array_agg(n.id) into ids from npcs n where n.village_id = p_v and n.job = any(g.jobs);
    cnt := coalesce(array_length(ids, 1), 0); nm := eco_names(ids);
    inp_rot := null; inp_gelb := null;
    foreach inp in array g.braucht loop
      if st->>inp = 'rot' then inp_rot := inp_rot || (select name from eco_goods where id = inp);
      elsif st->>inp = 'gelb' then inp_gelb := inp_gelb || (select name from eco_goods where id = inp); end if;
    end loop;
    if g.basis = 'haushalt' then
      amp := case when exists (select 1 from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x where x->>0 in ('huette','wohnhaus','langhaus')) then 'gruen' else 'gelb' end;
      txt := case when amp = 'gruen' then 'Ein paar Hühner hält fast jedes Haus.' else 'Ohne Häuser keine Hühner.' end;
    elsif cnt = 0 and g.basis = 'sammeln' then
      amp := 'gelb'; txt := 'Alle sammeln nebenbei Brennholz. Für größere Bauten reicht das nur langsam – uns fehlt jemand, der Bäume fällt.';
    elsif cnt = 0 and has_geb and g.gebaeude is not null then
      amp := 'rot'; txt := (case when b.dat like 'eine %' then 'Die ' when b.dat like 'einen %' then 'Der ' else 'Das ' end) || b.name || ' steht, aber niemand arbeitet dort. Es fehlt jemand, der das kann (' || array_to_string(g.jobs[1:2], ' oder ') || ').';
    elsif cnt = 0 and g.ersatz is not null and inp_rot is null and coalesce(array_length(g.braucht, 1), 0) > 0 then
      amp := 'gelb'; txt := g.ersatz;
    elsif cnt = 0 then
      amp := 'rot';
      txt := 'Gibt es bei uns nicht. Dafür bräuchten wir ' || case when g.gebaeude is not null then b.dat || ' und ' else '' end || 'jemanden, der das kann (' || array_to_string(g.jobs[1:2], ' oder ') || '). Bis dahin: im Nachbardorf tauschen.';
    else
      satz := nm || ' ' || case when cnt = 1 then g.verb else g.verb_pl end;
      if not has_geb then amp := 'gelb'; txt := satz || ' – aber ohne ' || b.dat || '. Es geht, dauert aber.';
      else amp := 'gruen'; txt := satz || case when lv >= 4 then ' – mit ' || b.name || ' aus Stein, das ist kaum zu schlagen.' when lv >= 2 then ' – und ' || b.name || ' wurde schon ausgebaut.' else '.' end; end if;
      if g.basis = 'sammeln' and amp = 'gelb' then txt := txt || ' Dazu sammeln alle nebenbei Brennholz.'; end if;
    end if;
    -- Jahreszeit
    if amp = 'gruen' and g.saison = 'feld' and season = 'winter' then amp := 'gelb'; txt := txt || ' Im Winter wächst nichts – ' || case when vorrat_ok then 'wir leben von dem, was eingelagert ist.' else 'und die Vorräte werden schon knapp.' end;
    elsif amp = 'gruen' and g.saison = 'feld' and season = 'fruehling' then txt := txt || ' Gerade ist Saatzeit, die Ernte kommt erst noch.';
    elsif amp = 'gruen' and g.saison = 'feld' and season = 'herbst' then txt := txt || ' Jetzt ist Erntezeit.'; end if;
    if amp = 'gruen' and g.saison = 'jagd' and season = 'winter' then txt := txt || ' Im Winter ist es mühsamer.'; end if;
    -- Zutaten
    if inp_rot is not null and amp <> 'rot' then amp := 'gelb'; txt := txt || ' Aber es fehlt an ' || array_to_string(inp_rot, ' und ') || '.'; end if;
    if inp_gelb is not null and amp = 'gruen' then amp := 'gelb'; txt := txt || ' ' || array_to_string(inp_gelb, ' und ') || ' ist selbst knapp.'; end if;
    st := st || jsonb_build_object(g.id, amp);
    acc := acc || jsonb_build_object('id', g.id, 'name', g.name, 'kat', g.kat, 'ampel', amp, 'text', txt,
      'menge', case amp when 'rot' then 'nichts' when 'gelb' then 'wenig'
        else case when g.basis is null and (lv >= 3 or cnt >= 2 or (g.saison = 'feld' and season = 'herbst')) then 'viel' else 'ausreichend' end end);
  end loop;
  return acc;
end;
$$;

-- Überblick in Ampeln: Essen, Baumaterial, Werkzeug, Wohnraum, Stimmung, Schutz
create or replace function public.eco_ampeln(p_v bigint) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e village_eco; r jsonb; essen numeric; tage numeric; wohnfrei numeric; t_n numeric; mat text; matt text;
begin
  select * into e from village_eco where village_id = p_v; r := e.rates; if r is null then return '[]'; end if;
  essen := (r->>'essen')::numeric; tage := (e.res->>'nahrung')::numeric / greatest(0.1, essen * 24);
  wohnfrei := (r->>'wohnraum')::numeric - (r->>'bewohner')::numeric; t_n := coalesce((e.trend->>'nahrung')::numeric, 0);
  mat := case when (e.res->>'holz')::numeric < 10 then 'rot' when (e.res->>'holz')::numeric < 30 or (e.res->>'stein')::numeric < 10 then 'gelb' else 'gruen' end;
  matt := case mat when 'rot' then 'Kaum Holz im Lager. Gebaut wird erst, wenn wieder genug da ist.'
    when 'gelb' then case when (e.res->>'holz')::numeric < 30 then 'Holz ist knapp – Bauen dauert.' else 'Holz geht, aber Stein ist knapp.' end
    else 'Genug Holz und Stein für die nächsten Bauten.' end;
  return jsonb_build_array(
    jsonb_build_object('id', 'essen', 'name', 'Essen', 'menge', case when e.hunger_h > 0 then 'nichts' when tage < 3 then 'wenig' when tage < 10 then 'ausreichend' else 'viel' end, 'ampel', case when e.hunger_h > 0 or tage < 1 then 'rot' when tage < 3 or t_n < -0.15 then 'gelb' else 'gruen' end,
      'text', case when e.hunger_h > 0 then 'Die Vorräte sind leer. Es wird gehungert.' when tage < 1 then 'Die Vorräte reichen kaum noch bis morgen.'
        when tage < 3 then 'Die Vorräte reichen nur noch wenige Tage.' when t_n < -0.15 then 'Noch ist genug da, aber es wird mehr gegessen als hereinkommt.'
        when t_n > 0.15 then 'Es kommt mehr herein, als gegessen wird.' else 'Alle werden satt.' end),
    jsonb_build_object('id', 'bau', 'name', 'Baumaterial', 'menge', case when (e.res->>'holz')::numeric < 5 then 'nichts' when (e.res->>'holz')::numeric < 30 then 'wenig' when (e.res->>'holz')::numeric < 100 then 'ausreichend' else 'viel' end, 'ampel', mat, 'text', matt),
    jsonb_build_object('id', 'werkzeug', 'name', 'Werkzeug und Waren', 'menge', case when (e.res->>'waren')::numeric < 1 then 'nichts' when (e.res->>'waren')::numeric < 12 then 'wenig' when (e.res->>'waren')::numeric < 35 then 'ausreichend' else 'viel' end, 'ampel', case when (e.res->>'waren')::numeric < 3 then 'rot' when (e.res->>'waren')::numeric < 12 then 'gelb' else 'gruen' end,
      'text', case when (e.res->>'waren')::numeric < 3 then 'Werkzeug ist abgenutzt, Ersatz fehlt. Größere Ausbauten gehen so nicht.' when (e.res->>'waren')::numeric < 12 then 'Es reicht für den Alltag, für große Ausbauten wird es eng.' else 'Gutes Werkzeug für alle.' end),
    jsonb_build_object('id', 'wohnen', 'name', 'Wohnraum', 'menge', case when wohnfrei < 0 then 'zu wenig' when wohnfrei < 1 then 'knapp' when wohnfrei < 3 then 'ausreichend' else 'viel' end, 'ampel', case when wohnfrei < 0 then 'rot' when wohnfrei < 1 then 'gelb' else 'gruen' end,
      'text', case when wohnfrei < 0 then 'Die Häuser sind überfüllt.' when wohnfrei < 1 then 'Jedes Bett ist belegt. Neue Leute können erst kommen, wenn gebaut wird.' when wohnfrei < 3 then 'Für ein, zwei Neue ist noch Platz.' else 'Es gibt freie Betten für Neuankömmlinge.' end),
    jsonb_build_object('id', 'stimmung', 'name', 'Stimmung', 'menge', case when e.stimmung >= 80 then 'ausgelassen' when e.stimmung >= 65 then 'zufrieden' when e.stimmung >= 50 then 'ruhig' when e.stimmung >= 35 then 'gedrückt' else 'verzweifelt' end, 'ampel', case when e.stimmung < 35 then 'rot' when e.stimmung < 55 then 'gelb' else 'gruen' end,
      'text', case when e.stimmung >= 80 then 'Ausgelassen – es wird gelacht und gesungen.' when e.stimmung >= 65 then 'Die Leute sind zufrieden.' when e.stimmung >= 55 then 'Ruhig. Man kommt zurecht.' when e.stimmung >= 35 then 'Gedrückt. Es wird viel gemurrt.' else 'Verzweifelt. Manche denken ans Weggehen.' end),
    jsonb_build_object('id', 'schutz', 'name', 'Schutz', 'menge', case when (r->>'schutz')::numeric < 5 then 'kaum' when (r->>'schutz')::numeric < 12 then 'etwas' else 'gut' end, 'ampel', case when (r->>'schutz')::numeric < 5 then 'rot' when (r->>'schutz')::numeric < 12 then 'gelb' else 'gruen' end,
      'text', case when (r->>'schutz')::numeric < 5 then 'Kaum Schutz. Wer will, kommt ungesehen ins Dorf.' when (r->>'schutz')::numeric < 12 then 'Es gibt eine Wache, aber nicht rund um die Uhr.' else 'Das Dorf ist gut bewacht.' end)
  );
end;
$$;
revoke execute on function public.eco_gueter(bigint), public.eco_ampeln(bigint) from public, anon, authenticated;

-- Anzeige und Gespräche bekommen Ampeln und Güter
create or replace function public.eco_view(p_v bigint, p_uid uuid) returns json language plpgsql stable security definer set search_path = public as $$
declare e village_eco; r jsonb; pr village_projects; pl village_projects; b eco_buildings; ids bigint[]; rate numeric; fehlt text[]; k text; val text; essen numeric; wohnfrei numeric; prof profiles;
begin
  select * into e from village_eco where village_id = p_v; r := e.rates; if r is null then return null; end if;
  select * into prof from profiles where id = p_uid;
  select * into pr from village_projects where village_id = p_v and status = 'im_bau' order by id limit 1;
  select * into pl from village_projects where village_id = p_v and status = 'geplant' order by id limit 1;
  essen := (r->>'essen')::numeric; wohnfrei := (r->>'wohnraum')::numeric - (r->>'bewohner')::numeric;
  if pl.id is not null then
    for k, val in select * from jsonb_each_text(pl.kosten) loop if coalesce((e.res->>k)::numeric, 0) < val::numeric then fehlt := fehlt || eco_res_name(k); end if; end loop;
  end if;
  select array_agg(n.id) into ids from npcs n join eco_jobs j on j.job = n.job where n.village_id = p_v and j.bau >= 0.5;
  return json_build_object(
    'jahreszeit', r->>'season',
    'vorraete', (select json_agg(json_build_object('res', k2, 'name', eco_res_name(k2),
        'wort', eco_word((e.res->>k2)::numeric, (r->'cap'->>k2)::numeric, case k2 when 'nahrung' then essen * 24 else 5 end),
        'anteil', round(least(1, (e.res->>k2)::numeric / greatest(1, (r->'cap'->>k2)::numeric)), 2),
        'trend', case when coalesce((e.trend->>k2)::numeric, 0) > 0.15 then 'steigt' when coalesce((e.trend->>k2)::numeric, 0) < -0.15 then 'sinkt' else 'gleich' end) order by ord)
      from unnest(array['nahrung','holz','stein','waren']) with ordinality u(k2, ord)),
    'stimmung', case when e.stimmung >= 80 then 'ausgelassen' when e.stimmung >= 65 then 'zufrieden' when e.stimmung >= 50 then 'ruhig' when e.stimmung >= 35 then 'gedrückt' else 'verzweifelt' end,
    'hunger', e.hunger_h > 0,
    'wohnen', case when wohnfrei < 0 then 'überfüllt' when wohnfrei < 1 then 'eng' when wohnfrei < 3 then 'etwas Platz' else 'viel Platz' end,
    'schutz', case when (r->>'schutz')::numeric >= 12 then 'gut geschützt' when (r->>'schutz')::numeric >= 5 then 'bewacht' else 'kaum geschützt' end,
    'bau', case when pr.id is not null then json_build_object('id', pr.id, 'art', pr.art, 'gebaeude', pr.gebaeude, 'name', (select name from eco_buildings where id = pr.gebaeude), 'dat', (select dat from eco_buildings where id = pr.gebaeude),
        'plot', pr.plot, 'stufe', pr.stufe, 'fortschritt', round(least(1, pr.arbeit_ist / pr.arbeit_soll), 2), 'grund', pr.grund,
        'fertig_etwa', now() + make_interval(secs => greatest(0, pr.arbeit_soll - pr.arbeit_ist) / greatest(0.3, (r->>'bau')::numeric * (0.7 + 0.6 * e.stimmung / 100)) * 3600),
        'baumeister', eco_names(ids)) end,
    'plan', case when pl.id is not null then json_build_object('id', pl.id, 'art', pl.art, 'gebaeude', pl.gebaeude, 'name', (select name from eco_buildings where id = pl.gebaeude), 'dat', (select dat from eco_buildings where id = pl.gebaeude),
        'plot', pl.plot, 'stufe', pl.stufe, 'grund', pl.grund, 'fehlt', fehlt, 'seit', pl.created_at, 'vorschlag', pl.vorgeschlagen is not null) end,
    'stufen', e.stufen,
    'ampeln', eco_ampeln(p_v), 'gueter', eco_gueter(p_v),
    'chronik', (select coalesce(json_agg(json_build_object('at', l.at, 'art', l.art, 'text', l.text) order by l.at desc), '[]'::json) from (select * from village_log where village_id = p_v order by at desc limit 14) l),
    'neu', (select coalesce(json_agg(json_build_object('at', l.at, 'art', l.art, 'text', l.text) order by l.at), '[]'::json) from (select * from village_log where village_id = p_v and art in ('bau','zuzug','wegzug','not','gut') and at > coalesce(prof.dorf_gesehen, now() - interval '2 days') order by at desc limit 8) l),
    'hilfe_ab', case when prof.hilfe_at > now() - interval '4 hours' then prof.hilfe_at + interval '4 hours' end,
    'vorschlag_ab', case when prof.vorschlag_at > now() - interval '20 hours' then prof.vorschlag_at + interval '20 hours' end
  );
end;
$$;

create or replace function public.eco_talk(p_v bigint, p_npc bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare g jsonb; e village_eco; pr village_projects; pl village_projects; j eco_jobs; n npcs; knapp text[]; k text; essen numeric;
begin
  select * into e from village_eco where village_id = p_v; if e.rates is null then return null; end if;
  select * into n from npcs where id = p_npc; select * into j from eco_jobs where job = n.job;
  select * into pr from village_projects where village_id = p_v and status = 'im_bau' order by id limit 1;
  select * into pl from village_projects where village_id = p_v and status = 'geplant' order by id limit 1;
  essen := (e.rates->>'essen')::numeric; g := eco_gueter(p_v);
  foreach k in array array['nahrung','holz','stein','waren'] loop
    if (e.res->>k)::numeric < greatest(case k when 'nahrung' then essen * 24 else 5 end, (e.rates->'cap'->>k)::numeric * 0.12) then knapp := knapp || eco_res_name(k); end if;
  end loop;
  return json_build_object(
    'bau', (select dat from eco_buildings where id = pr.gebaeude), 'bau_art', pr.art, 'bau_name', (select name from eco_buildings where id = pr.gebaeude),
    'baut_mit', pr.id is not null and coalesce(j.bau, 0) >= 0.5,
    'plan', (select dat from eco_buildings where id = pl.gebaeude), 'plan_name', (select name from eco_buildings where id = pl.gebaeude), 'plan_grund', pl.grund,
    'knapp', knapp,
    'rot', (select array_agg(x->>'name') from (select x from jsonb_array_elements(g) x where x->>'ampel' = 'rot' and x->>'kat' <> 'bau' order by random() limit 3) y),
    'gruen', (select array_agg(x->>'name') from (select x from jsonb_array_elements(g) x where x->>'ampel' = 'gruen' and x->>'id' <> 'eier' order by random() limit 3) y), 'hunger', e.hunger_h > 0, 'jahreszeit', e.rates->>'season',
    'stimmung', case when e.stimmung >= 80 then 'ausgelassen' when e.stimmung >= 65 then 'zufrieden' when e.stimmung >= 50 then 'ruhig' when e.stimmung >= 35 then 'gedrückt' else 'verzweifelt' end,
    'ohne_werkstatt', j.gebaeude is not null and layout_plot((select layout from villages where id = p_v), j.gebaeude) is null,
    'werkstatt', (select name from eco_buildings where id = j.gebaeude),
    'neu_gebaut', (select l.text from village_log l where l.village_id = p_v and l.art = 'bau' and l.at > now() - interval '3 days' order by l.at desc limit 1),
    'neu_bewohner', (select x.name from village_log l join npcs x on x.id = l.npc_id where l.village_id = p_v and l.art = 'zuzug' and l.at > now() - interval '5 days' and x.id <> p_npc order by l.at desc limit 1),
    'selbst_neu', exists (select 1 from village_log l where l.village_id = p_v and l.art = 'zuzug' and l.npc_id = p_npc and l.at > now() - interval '5 days')
  );
end;
$$;

-- Dorfrat: Lager gelten nur als voll, wenn Baumaterial überläuft oder Wintervorräte keinen Platz haben
create or replace function public.eco_candidates(p_v bigint, r jsonb, res jsonb, stim numeric, hunger int, p_limit int default 6) returns jsonb language plpgsql security definer set search_path = public as $$
declare v villages; e village_eco; b eco_buildings; lay record; acc jsonb := '[]'; s numeric; grund text; plot int; ids bigint[]; nm text;
  essen numeric := (r->>'essen')::numeric; netto_n numeric := (r->'p'->>'nahrung')::numeric + (r->'b'->>'nahrung')::numeric - essen;
  tage numeric := (res->>'nahrung')::numeric / greatest(0.1, essen * 24); frei numeric := (r->>'wohnraum')::numeric - (r->>'bewohner')::numeric;
  voll boolean; vs text; kost jsonb; lv int; cnt int; types text[];
begin
  select * into v from villages where id = p_v; select * into e from village_eco where village_id = p_v;
  select coalesce(array_agg(x->>0), '{}') into types from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x;
  -- Lager zählen als voll, wenn Baumaterial überläuft – oder im Sommer/Herbst die Wintervorräte keinen Platz mehr haben
  voll := exists (select 1 from jsonb_each_text(res) x(k, val) where (r->'cap'->>k) is not null and val::numeric > 0.85 * (r->'cap'->>k)::numeric
    and (k in ('holz','stein') or (k = 'nahrung' and r->>'season' in ('sommer','herbst'))));
  vs := case when e.vorschlag is not null and (e.vorschlag->>'bis')::timestamptz > now() then e.vorschlag->>'gebaeude' end;
  -- Neubauten
  for b in select * from eco_buildings loop
    continue when not b.mehrfach and b.id = any(types);
    continue when not (b.benoetigt <@ types);
    continue when exists (select 1 from village_projects p where p.village_id = p_v and p.status in ('geplant','im_bau') and p.gebaeude = b.id and p.art = 'neu');
    select p.id into plot from eco_plots p
      where not exists (select 1 from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x where (x->>1)::int = p.id)
        and not exists (select 1 from village_projects q where q.village_id = p_v and q.status in ('geplant','im_bau') and q.plot = p.id)
        and eco_size(p.size) >= eco_size(b.size)
      order by eco_size(p.size), case when b.laut then -p.id else p.id end limit 1;
    continue when plot is null;
    select array_agg(n.id) into ids from npcs n join eco_jobs j on j.job = n.job where n.village_id = p_v and j.gebaeude = b.id;
    cnt := coalesce(array_length(ids, 1), 0); s := 0; grund := null;
    if cnt > 0 and not (b.id = any(types)) then s := s + 25 * cnt; nm := eco_names(ids);
      grund := nm || case when cnt = 1 then ' hat' else ' haben' end || ' dafür bisher keinen richtigen Arbeitsplatz.'; end if;
    if b.rolle = 'nahrung' and (netto_n < 0 or tage < 3 or hunger > 0) and (cnt > 0 or b.id = 'feld') then s := s + 30 + case when hunger > 0 then 20 else 0 end; grund := coalesce(grund, 'Es wird mehr gegessen, als hereinkommt.'); end if;
    if b.rolle = 'wohnen' then
      if frei <= 1 then s := s + 45 + case when b.id = 'wohnhaus' and (res->>'stein')::numeric >= 10 then 8 else 0 end; grund := 'In den Häusern wird es eng.';
      elsif frei <= 3 then s := s + 8; grund := 'Damit Platz ist, wenn jemand herziehen will.'; else s := s - 30; end if;
    end if;
    if b.rolle = 'lager' and voll then s := s + 25; grund := coalesce(grund, 'Die Lager sind fast voll – was mehr kommt, verdirbt.'); end if;
    if b.rolle = 'lager' and not voll then s := s - 5; end if;
    if b.rolle = 'gemeinschaft' then s := s + case when stim < 55 then 20 else 3 end + b.zuzug * 3; if stim < 55 then grund := coalesce(grund, 'Die Stimmung im Dorf ist gedrückt.'); end if; end if;
    if b.rolle = 'schutz' then s := s + 4 + case when (r->>'bewohner')::int >= 10 then 8 else 0 end; grund := coalesce(grund, 'Ein sicheres Gefühl schadet nie.'); end if;
    if cnt = 0 and b.rolle not in ('wohnen','lager','schutz') and b.id <> 'feld' then
      if frei >= 2 then s := s + 3; grund := coalesce(grund, 'Vielleicht zieht so jemand her, der dort arbeiten will.'); else s := s - 15; end if;
    end if;
    if b.id = 'feld' and cnt = 0 then s := s - 10; end if;
    if b.id = 'feld' and b.id = any(types) then s := s - 15; end if;
    kost := eco_kosten(b, 1);
    s := s - (coalesce((kost->>'holz')::numeric, 0) + coalesce((kost->>'stein')::numeric, 0) * 1.5 + coalesce((kost->>'waren')::numeric, 0) * 3) / 15;
    if vs = b.id then s := s + 40; grund := 'Ein Vorschlag aus dem Dorf.'; end if;
    s := s + random() * 6;
    acc := acc || jsonb_build_object('art', 'neu', 'gebaeude', b.id, 'name', b.name, 'plot', plot, 'stufe', 1, 'kosten', kost, 'arbeit', b.arbeit, 'score', round(s, 1), 'grund', coalesce(grund, 'Das Dorf wächst.'));
  end loop;
  -- Ausbauten
  for lay in select x->>0 as typ, (x->>1)::int as plot from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x loop
    select * into b from eco_buildings where id = lay.typ; continue when b.id is null;
    lv := eco_lvl(e.stufen, lay.plot); continue when lv >= b.max_stufe;
    continue when exists (select 1 from village_projects p where p.village_id = p_v and p.status in ('geplant','im_bau') and p.plot = lay.plot);
    select array_agg(n.id) into ids from npcs n join eco_jobs j on j.job = n.job where n.village_id = p_v and j.gebaeude = b.id;
    cnt := coalesce(array_length(ids, 1), 0); s := -6 * lv; grund := null;
    if cnt > 0 and b.rolle not in ('wohnen','lager') then s := s + 8 + 6 * cnt; grund := eco_names(ids) || case when cnt = 1 then ' könnte' else ' könnten' end || ' dort mehr schaffen.'; end if;
    if b.rolle = 'nahrung' and cnt > 0 and (netto_n < 0 or tage < 3) then s := s + 20; grund := 'Es wird mehr gegessen, als hereinkommt.'; end if;
    if b.wohnraum > 0 and frei <= 1 then s := s + 30; grund := 'In den Häusern wird es eng.'; end if;
    if b.rolle = 'lager' and voll then s := s + 22; grund := 'Die Lager sind fast voll.'; end if;
    if b.stimmung > 0 and stim < 55 then s := s + 10; grund := coalesce(grund, 'Die Stimmung im Dorf ist gedrückt.'); end if;
    continue when grund is null and vs is distinct from b.id;
    kost := eco_kosten(b, lv + 1);
    s := s - (coalesce((kost->>'holz')::numeric, 0) + coalesce((kost->>'stein')::numeric, 0) * 1.5 + coalesce((kost->>'waren')::numeric, 0) * 3) / 15;
    if vs = b.id then s := s + 35; grund := 'Ein Vorschlag aus dem Dorf.'; end if;
    s := s + random() * 6;
    acc := acc || jsonb_build_object('art', 'ausbau', 'gebaeude', b.id, 'name', b.name, 'plot', lay.plot, 'stufe', lv + 1, 'kosten', kost, 'arbeit', ceil(b.arbeit * (0.5 + 0.35 * (lv + 1))), 'score', round(s, 1), 'grund', coalesce(grund, 'Ein Vorschlag aus dem Dorf.'));
  end loop;
  return (select coalesce(jsonb_agg(x order by (x->>'score')::numeric desc), '[]'::jsonb) from (select x from jsonb_array_elements(acc) x order by (x->>'score')::numeric desc limit p_limit) y);
end;
$$;
revoke execute on function public.eco_view(bigint, uuid), public.eco_talk(bigint, bigint), public.eco_candidates(bigint, jsonb, jsonb, numeric, int, int) from public, anon, authenticated;
