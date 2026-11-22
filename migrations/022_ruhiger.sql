-- Migration 022: Das Dorf wächst noch ruhiger (Grundkosten ×1,4, Bauzeit ×1,5 gegenüber 021 – simuliertes Jahr: ca. 7 neue Gebäude, 3 Ausbauten).
-- Güter und Überblick bekommen Mengenwörter (nichts, wenig, ausreichend, viel) statt sichtbarer Ampeln.
insert into public.eco_buildings (id, name, dat, size, kosten, arbeit, rolle)
select v.id, b.name, b.dat, b.size, v.kosten, v.arbeit, b.rolle from (values
 ('huette','{"holz":42}'::jsonb,45),
 ('wohnhaus','{"holz":75,"stein":21}'::jsonb,112),
 ('langhaus','{"holz":210,"stein":63}'::jsonb,338),
 ('gasthaus','{"holz":147,"stein":42}'::jsonb,225),
 ('feld','{"holz":21}'::jsonb,34),
 ('scheune','{"holz":105}'::jsonb,135),
 ('muehle','{"holz":126,"stein":54}'::jsonb,270),
 ('baeckerei','{"holz":75,"stein":54}'::jsonb,158),
 ('brauerei','{"holz":105,"stein":33}'::jsonb,202),
 ('imkerei','{"holz":42}'::jsonb,90),
 ('stall','{"holz":126}'::jsonb,180),
 ('jagdhuette','{"holz":63}'::jsonb,112),
 ('holzfaeller','{"holz":33}'::jsonb,68),
 ('saegewerk','{"holz":84,"waren":9}'::jsonb,180),
 ('steinmetz','{"holz":54}'::jsonb,112),
 ('koehlerei','{"holz":54}'::jsonb,90),
 ('schmiede','{"holz":75,"stein":75}'::jsonb,225),
 ('gerberei','{"holz":63}'::jsonb,112),
 ('weberei','{"holz":75}'::jsonb,135),
 ('toepferei','{"holz":54,"stein":21}'::jsonb,112),
 ('markt','{"holz":84}'::jsonb,135),
 ('heilerhaus','{"holz":75,"stein":21}'::jsonb,158),
 ('schrein','{"stein":63}'::jsonb,90),
 ('schreibstube','{"holz":75,"stein":75}'::jsonb,225),
 ('alchemistenturm','{"holz":33,"stein":105}'::jsonb,315),
 ('wachturm','{"holz":84}'::jsonb,135),
 ('kaserne','{"holz":168,"stein":75,"waren":17}'::jsonb,405),
 ('lagerhaus','{"holz":147}'::jsonb,180)
) v(id, kosten, arbeit) join public.eco_buildings b on b.id = v.id
on conflict (id) do update set kosten = excluded.kosten, arbeit = excluded.arbeit;

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
