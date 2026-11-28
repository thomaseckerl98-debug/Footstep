do $t$ declare c text; parts text[]; i int; r text := ''; begin
  select content into c from http_get('https://raw.githubusercontent.com/thomaseckerl98-debug/Footstep/9566ccd85e00f6eb154dc1670d0b224e05e9aedd/migrations/043_gilde.sql');
  parts := regexp_split_to_array(c, E'\n(?=create or replace function|do \\$|create table|alter table|insert into npc_relations|revoke|grant|create unique)');
  for i in 1 .. 40 loop execute parts[i]; end loop;
  begin execute $q2$create or replace function public.gilde_ausfuehren(p_auftrag bigint) returns void language plpgsql security definer set search_path = public as $fn$
declare a gilde_auftraege; g gilden; adef jsonb; ms bigint[]; ch numeric; wurf numeric := random(); ausg text; namen text; enttarnt boolean := false; schl int;
        heim text; hv bigint; rufp int; t record; xpgain numeric; k text; erz text; kinfo jsonb := '{}'; verletzt text[] := '{}'; zielname text; zeichen text;
begin
  select * into a from gilde_auftraege where id = p_auftrag and status = 'werbung' for update;
  if a.id is null then return; end if;
end $fn$$q2$; r := r || '2:ok '; exception when others then r := r || '2:' || left(sqlerrm, 50) || ' '; end;
  begin execute $q7$create or replace function public.gilde_ausfuehren(p_auftrag bigint) returns void language plpgsql security definer set search_path = public as $fn$
declare a gilde_auftraege; g gilden; adef jsonb; ms bigint[]; ch numeric; wurf numeric := random(); ausg text; namen text; enttarnt boolean := false; schl int;
        heim text; hv bigint; rufp int; t record; xpgain numeric; k text; erz text; kinfo jsonb := '{}'; verletzt text[] := '{}'; zielname text; zeichen text;
begin
  select * into a from gilde_auftraege where id = p_auftrag and status = 'werbung' for update;
  if a.id is null then return; end if;
  select * into g from gilden where id = a.gilde_id; adef := gilde_art(a.art); zielname := ort_name(a.ziel); zeichen := gilde_zeichen_name(g.zeichen);
  select array_agg(mitglied_id) into ms from gilde_teilnahme where auftrag_id = a.id and antwort;
  if ms is null then
    update gilde_auftraege set status = 'abgesagt', ergebnis = jsonb_build_object('text', 'Niemand ist der Brieftaube gefolgt. Der Auftrag fällt ausg.') where id = a.id; return;
  end if;
end $fn$$q7$; r := r || '7:ok '; exception when others then r := r || '7:' || left(sqlerrm, 50) || ' '; end;
  begin execute $q13$create or replace function public.gilde_ausfuehren(p_auftrag bigint) returns void language plpgsql security definer set search_path = public as $fn$
declare a gilde_auftraege; g gilden; adef jsonb; ms bigint[]; ch numeric; wurf numeric := random(); ausg text; namen text; enttarnt boolean := false; schl int;
        heim text; hv bigint; rufp int; t record; xpgain numeric; k text; erz text; kinfo jsonb := '{}'; verletzt text[] := '{}'; zielname text; zeichen text;
begin
  select * into a from gilde_auftraege where id = p_auftrag and status = 'werbung' for update;
  if a.id is null then return; end if;
  select * into g from gilden where id = a.gilde_id; adef := gilde_art(a.art); zielname := ort_name(a.ziel); zeichen := gilde_zeichen_name(g.zeichen);
  select array_agg(mitglied_id) into ms from gilde_teilnahme where auftrag_id = a.id and antwort;
  if ms is null then
    update gilde_auftraege set status = 'abgesagt', ergebnis = jsonb_build_object('text', 'Niemand ist der Brieftaube gefolgt. Der Auftrag fällt ausg.') where id = a.id; return;
  end if;
  select string_agg(coalesce(p.character_name, n.name), ', ') into namen from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms);
  ch := gilde_chance(a.art, a.ziel, ms);
  ausg := case when wurf < ch then 'erfolg' when wurf < ch + 0.15 then 'teil' else 'fehl' end;
  select max((gilde_fert(x)->>'schleichen')::int) into schl from unnest(ms) x;
  if g.geheim then enttarnt := random() < greatest(0.01, case ausg when 'fehl' then 0.35 when 'teil' then 0.12 else 0.03 end - schl * 0.02); end if;
  heim := heim_ort(a.von); hv := mein_dorf(a.von);
end $fn$$q13$; r := r || '13:ok '; exception when others then r := r || '13:' || left(sqlerrm, 50) || ' '; end;
  begin execute $q28$create or replace function public.gilde_ausfuehren(p_auftrag bigint) returns void language plpgsql security definer set search_path = public as $fn$
declare a gilde_auftraege; g gilden; adef jsonb; ms bigint[]; ch numeric; wurf numeric := random(); ausg text; namen text; enttarnt boolean := false; schl int;
        heim text; hv bigint; rufp int; t record; xpgain numeric; k text; erz text; kinfo jsonb := '{}'; verletzt text[] := '{}'; zielname text; zeichen text;
begin
  select * into a from gilde_auftraege where id = p_auftrag and status = 'werbung' for update;
  if a.id is null then return; end if;
  select * into g from gilden where id = a.gilde_id; adef := gilde_art(a.art); zielname := ort_name(a.ziel); zeichen := gilde_zeichen_name(g.zeichen);
  select array_agg(mitglied_id) into ms from gilde_teilnahme where auftrag_id = a.id and antwort;
  if ms is null then
    update gilde_auftraege set status = 'abgesagt', ergebnis = jsonb_build_object('text', 'Niemand ist der Brieftaube gefolgt. Der Auftrag fällt ausg.') where id = a.id; return;
  end if;
  select string_agg(coalesce(p.character_name, n.name), ', ') into namen from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms);
  ch := gilde_chance(a.art, a.ziel, ms);
  ausg := case when wurf < ch then 'erfolg' when wurf < ch + 0.15 then 'teil' else 'fehl' end;
  select max((gilde_fert(x)->>'schleichen')::int) into schl from unnest(ms) x;
  if g.geheim then enttarnt := random() < greatest(0.01, case ausg when 'fehl' then 0.35 when 'teil' then 0.12 else 0.03 end - schl * 0.02); end if;
  heim := heim_ort(a.von); hv := mein_dorf(a.von);
  -- Folgen
  if ausg <> 'fehl' then
    if a.art = 'auskundschaften' then
      kinfo := jsonb_build_object('staerke', (select x->>'staerke' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'rang', (select x->>'rang' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'kaempfer', round(dorf_staerke(a.ziel) * case ausg when 'erfolg' then 1 else 0.7 + random() * 0.6 end), 'mauer', (select mauer from welt_orte where id = a.ziel));
    elsif a.art = 'einschuechtern' then
      if hv is not null then perform eco_add(hv, jsonb_build_object('nahrung', case ausg when 'erfolg' then 14 else 5 end, 'waren', case ausg when 'erfolg' then 4 else 1 end)); end if;
      perform dipl_aendern(heim, a.ziel, -2);
    elsif a.art = 'sabotage' then
      insert into ort_effekte (ort, art, wert, bis) values (a.ziel, 'geschwaecht', case ausg when 'erfolg' then 0.2 else 0.1 end, now() + interval '3 days');
    elsif a.art = 'diebstahl' and hv is not null then
      perform eco_add(hv, jsonb_build_object('holz', case ausg when 'erfolg' then 25 else 10 end, 'nahrung', case ausg when 'erfolg' then 18 else 6 end, 'waren', case ausg when 'erfolg' then 5 else 2 end));
    end if;
  end if;
end $fn$$q28$; r := r || '28:ok '; exception when others then r := r || '28:' || left(sqlerrm, 50) || ' '; end;
  begin execute $q29$create or replace function public.gilde_ausfuehren(p_auftrag bigint) returns void language plpgsql security definer set search_path = public as $fn$
declare a gilde_auftraege; g gilden; adef jsonb; ms bigint[]; ch numeric; wurf numeric := random(); ausg text; namen text; enttarnt boolean := false; schl int;
        heim text; hv bigint; rufp int; t record; xpgain numeric; k text; erz text; kinfo jsonb := '{}'; verletzt text[] := '{}'; zielname text; zeichen text;
begin
  select * into a from gilde_auftraege where id = p_auftrag and status = 'werbung' for update;
  if a.id is null then return; end if;
  select * into g from gilden where id = a.gilde_id; adef := gilde_art(a.art); zielname := ort_name(a.ziel); zeichen := gilde_zeichen_name(g.zeichen);
  select array_agg(mitglied_id) into ms from gilde_teilnahme where auftrag_id = a.id and antwort;
  if ms is null then
    update gilde_auftraege set status = 'abgesagt', ergebnis = jsonb_build_object('text', 'Niemand ist der Brieftaube gefolgt. Der Auftrag fällt ausg.') where id = a.id; return;
  end if;
  select string_agg(coalesce(p.character_name, n.name), ', ') into namen from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms);
  ch := gilde_chance(a.art, a.ziel, ms);
  ausg := case when wurf < ch then 'erfolg' when wurf < ch + 0.15 then 'teil' else 'fehl' end;
  select max((gilde_fert(x)->>'schleichen')::int) into schl from unnest(ms) x;
  if g.geheim then enttarnt := random() < greatest(0.01, case ausg when 'fehl' then 0.35 when 'teil' then 0.12 else 0.03 end - schl * 0.02); end if;
  heim := heim_ort(a.von); hv := mein_dorf(a.von);
  -- Folgen
  if ausg <> 'fehl' then
    if a.art = 'auskundschaften' then
      kinfo := jsonb_build_object('staerke', (select x->>'staerke' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'rang', (select x->>'rang' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'kaempfer', round(dorf_staerke(a.ziel) * case ausg when 'erfolg' then 1 else 0.7 + random() * 0.6 end), 'mauer', (select mauer from welt_orte where id = a.ziel));
    elsif a.art = 'einschuechtern' then
      if hv is not null then perform eco_add(hv, jsonb_build_object('nahrung', case ausg when 'erfolg' then 14 else 5 end, 'waren', case ausg when 'erfolg' then 4 else 1 end)); end if;
      perform dipl_aendern(heim, a.ziel, -2);
    elsif a.art = 'sabotage' then
      insert into ort_effekte (ort, art, wert, bis) values (a.ziel, 'geschwaecht', case ausg when 'erfolg' then 0.2 else 0.1 end, now() + interval '3 days');
    elsif a.art = 'diebstahl' and hv is not null then
      perform eco_add(hv, jsonb_build_object('holz', case ausg when 'erfolg' then 25 else 10 end, 'nahrung', case ausg when 'erfolg' then 18 else 6 end, 'waren', case ausg when 'erfolg' then 5 else 2 end));
    end if;
  end if;
  if enttarnt or (not g.geheim and a.art <> 'auskundschaften') then perform dipl_aendern(heim, a.ziel, case when enttarnt then -8 else -3 end); end if;
end $fn$$q29$; r := r || '29:ok '; exception when others then r := r || '29:' || left(sqlerrm, 50) || ' '; end;
  begin execute $q45$create or replace function public.gilde_ausfuehren(p_auftrag bigint) returns void language plpgsql security definer set search_path = public as $fn$
declare a gilde_auftraege; g gilden; adef jsonb; ms bigint[]; ch numeric; wurf numeric := random(); ausg text; namen text; enttarnt boolean := false; schl int;
        heim text; hv bigint; rufp int; t record; xpgain numeric; k text; erz text; kinfo jsonb := '{}'; verletzt text[] := '{}'; zielname text; zeichen text;
begin
  select * into a from gilde_auftraege where id = p_auftrag and status = 'werbung' for update;
  if a.id is null then return; end if;
  select * into g from gilden where id = a.gilde_id; adef := gilde_art(a.art); zielname := ort_name(a.ziel); zeichen := gilde_zeichen_name(g.zeichen);
  select array_agg(mitglied_id) into ms from gilde_teilnahme where auftrag_id = a.id and antwort;
  if ms is null then
    update gilde_auftraege set status = 'abgesagt', ergebnis = jsonb_build_object('text', 'Niemand ist der Brieftaube gefolgt. Der Auftrag fällt ausg.') where id = a.id; return;
  end if;
  select string_agg(coalesce(p.character_name, n.name), ', ') into namen from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms);
  ch := gilde_chance(a.art, a.ziel, ms);
  ausg := case when wurf < ch then 'erfolg' when wurf < ch + 0.15 then 'teil' else 'fehl' end;
  select max((gilde_fert(x)->>'schleichen')::int) into schl from unnest(ms) x;
  if g.geheim then enttarnt := random() < greatest(0.01, case ausg when 'fehl' then 0.35 when 'teil' then 0.12 else 0.03 end - schl * 0.02); end if;
  heim := heim_ort(a.von); hv := mein_dorf(a.von);
  -- Folgen
  if ausg <> 'fehl' then
    if a.art = 'auskundschaften' then
      kinfo := jsonb_build_object('staerke', (select x->>'staerke' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'rang', (select x->>'rang' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'kaempfer', round(dorf_staerke(a.ziel) * case ausg when 'erfolg' then 1 else 0.7 + random() * 0.6 end), 'mauer', (select mauer from welt_orte where id = a.ziel));
    elsif a.art = 'einschuechtern' then
      if hv is not null then perform eco_add(hv, jsonb_build_object('nahrung', case ausg when 'erfolg' then 14 else 5 end, 'waren', case ausg when 'erfolg' then 4 else 1 end)); end if;
      perform dipl_aendern(heim, a.ziel, -2);
    elsif a.art = 'sabotage' then
      insert into ort_effekte (ort, art, wert, bis) values (a.ziel, 'geschwaecht', case ausg when 'erfolg' then 0.2 else 0.1 end, now() + interval '3 days');
    elsif a.art = 'diebstahl' and hv is not null then
      perform eco_add(hv, jsonb_build_object('holz', case ausg when 'erfolg' then 25 else 10 end, 'nahrung', case ausg when 'erfolg' then 18 else 6 end, 'waren', case ausg when 'erfolg' then 5 else 2 end));
    end if;
  end if;
  if enttarnt or (not g.geheim and a.art <> 'auskundschaften') then perform dipl_aendern(heim, a.ziel, case when enttarnt then -8 else -3 end); end if;
  -- Verletzungen und Erfahrung
  for t in select m.*, coalesce(p.character_name, n.name) nm from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms) loop
    if random() < (adef->>'risiko')::numeric * case ausg when 'fehl' then 2 when 'teil' then 1 else 0.4 end then
      update gilde_mitglieder set verletzt_bis = now() + make_interval(days => 1 + floor(random() * 3)::int) where id = t.id;
      if t.npc_id is not null then update npcs set zustand = 'verletzt', zustand_bis = now() + interval '2 days' where id = t.npc_id; end if;
      verletzt := verletzt || t.nm;
    end if;
    xpgain := case ausg when 'erfolg' then 6 when 'teil' then 4 else 2 end;  -- wie Übungsstunden
    for k in select jsonb_object_keys(adef->'w') loop
      if t.player_id is not null then
        perform fert_xp(t.player_id, case k when 'schleichen' then 'flink' when 'gift' then 'heilkunde' when 'ueberzeugen' then 'ueberreden' else k end, xpgain * (adef->'w'->>k)::numeric);
      else
        update gilde_mitglieder set xp = jsonb_set(xp, array[k], to_jsonb(coalesce((xp->>k)::numeric, 0) + xpgain * (adef->'w'->>k)::numeric)) where id = t.id;
      end if;
    end loop;
  end loop;
end $fn$$q45$; r := r || '45:ok '; exception when others then r := r || '45:' || left(sqlerrm, 50) || ' '; end;
  begin execute $q48$create or replace function public.gilde_ausfuehren(p_auftrag bigint) returns void language plpgsql security definer set search_path = public as $fn$
declare a gilde_auftraege; g gilden; adef jsonb; ms bigint[]; ch numeric; wurf numeric := random(); ausg text; namen text; enttarnt boolean := false; schl int;
        heim text; hv bigint; rufp int; t record; xpgain numeric; k text; erz text; kinfo jsonb := '{}'; verletzt text[] := '{}'; zielname text; zeichen text;
begin
  select * into a from gilde_auftraege where id = p_auftrag and status = 'werbung' for update;
  if a.id is null then return; end if;
  select * into g from gilden where id = a.gilde_id; adef := gilde_art(a.art); zielname := ort_name(a.ziel); zeichen := gilde_zeichen_name(g.zeichen);
  select array_agg(mitglied_id) into ms from gilde_teilnahme where auftrag_id = a.id and antwort;
  if ms is null then
    update gilde_auftraege set status = 'abgesagt', ergebnis = jsonb_build_object('text', 'Niemand ist der Brieftaube gefolgt. Der Auftrag fällt ausg.') where id = a.id; return;
  end if;
  select string_agg(coalesce(p.character_name, n.name), ', ') into namen from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms);
  ch := gilde_chance(a.art, a.ziel, ms);
  ausg := case when wurf < ch then 'erfolg' when wurf < ch + 0.15 then 'teil' else 'fehl' end;
  select max((gilde_fert(x)->>'schleichen')::int) into schl from unnest(ms) x;
  if g.geheim then enttarnt := random() < greatest(0.01, case ausg when 'fehl' then 0.35 when 'teil' then 0.12 else 0.03 end - schl * 0.02); end if;
  heim := heim_ort(a.von); hv := mein_dorf(a.von);
  -- Folgen
  if ausg <> 'fehl' then
    if a.art = 'auskundschaften' then
      kinfo := jsonb_build_object('staerke', (select x->>'staerke' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'rang', (select x->>'rang' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'kaempfer', round(dorf_staerke(a.ziel) * case ausg when 'erfolg' then 1 else 0.7 + random() * 0.6 end), 'mauer', (select mauer from welt_orte where id = a.ziel));
    elsif a.art = 'einschuechtern' then
      if hv is not null then perform eco_add(hv, jsonb_build_object('nahrung', case ausg when 'erfolg' then 14 else 5 end, 'waren', case ausg when 'erfolg' then 4 else 1 end)); end if;
      perform dipl_aendern(heim, a.ziel, -2);
    elsif a.art = 'sabotage' then
      insert into ort_effekte (ort, art, wert, bis) values (a.ziel, 'geschwaecht', case ausg when 'erfolg' then 0.2 else 0.1 end, now() + interval '3 days');
    elsif a.art = 'diebstahl' and hv is not null then
      perform eco_add(hv, jsonb_build_object('holz', case ausg when 'erfolg' then 25 else 10 end, 'nahrung', case ausg when 'erfolg' then 18 else 6 end, 'waren', case ausg when 'erfolg' then 5 else 2 end));
    end if;
  end if;
  if enttarnt or (not g.geheim and a.art <> 'auskundschaften') then perform dipl_aendern(heim, a.ziel, case when enttarnt then -8 else -3 end); end if;
  -- Verletzungen und Erfahrung
  for t in select m.*, coalesce(p.character_name, n.name) nm from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms) loop
    if random() < (adef->>'risiko')::numeric * case ausg when 'fehl' then 2 when 'teil' then 1 else 0.4 end then
      update gilde_mitglieder set verletzt_bis = now() + make_interval(days => 1 + floor(random() * 3)::int) where id = t.id;
      if t.npc_id is not null then update npcs set zustand = 'verletzt', zustand_bis = now() + interval '2 days' where id = t.npc_id; end if;
      verletzt := verletzt || t.nm;
    end if;
    xpgain := case ausg when 'erfolg' then 6 when 'teil' then 4 else 2 end;  -- wie Übungsstunden
    for k in select jsonb_object_keys(adef->'w') loop
      if t.player_id is not null then
        perform fert_xp(t.player_id, case k when 'schleichen' then 'flink' when 'gift' then 'heilkunde' when 'ueberzeugen' then 'ueberreden' else k end, xpgain * (adef->'w'->>k)::numeric);
      else
        update gilde_mitglieder set xp = jsonb_set(xp, array[k], to_jsonb(coalesce((xp->>k)::numeric, 0) + xpgain * (adef->'w'->>k)::numeric)) where id = t.id;
      end if;
    end loop;
  end loop;
  rufp := case ausg when 'erfolg' then (adef->>'ruf')::int when 'teil' then (adef->>'ruf')::int / 2 else case when enttarnt then 1 else 0 end end;
  update gilden set ruf = ruf + rufp where id = g.id;
  if not g.geheim and rufp > 0 then update profiles set ruhm = ruhm + greatest(1, rufp / 2) where id in (select player_id from gilde_mitglieder where id = any(ms) and player_id is not null); end if;
end $fn$$q48$; r := r || '48:ok '; exception when others then r := r || '48:' || left(sqlerrm, 50) || ' '; end;
  begin execute $q52$create or replace function public.gilde_ausfuehren(p_auftrag bigint) returns void language plpgsql security definer set search_path = public as $fn$
declare a gilde_auftraege; g gilden; adef jsonb; ms bigint[]; ch numeric; wurf numeric := random(); ausg text; namen text; enttarnt boolean := false; schl int;
        heim text; hv bigint; rufp int; t record; xpgain numeric; k text; erz text; kinfo jsonb := '{}'; verletzt text[] := '{}'; zielname text; zeichen text;
begin
  select * into a from gilde_auftraege where id = p_auftrag and status = 'werbung' for update;
  if a.id is null then return; end if;
  select * into g from gilden where id = a.gilde_id; adef := gilde_art(a.art); zielname := ort_name(a.ziel); zeichen := gilde_zeichen_name(g.zeichen);
  select array_agg(mitglied_id) into ms from gilde_teilnahme where auftrag_id = a.id and antwort;
  if ms is null then
    update gilde_auftraege set status = 'abgesagt', ergebnis = jsonb_build_object('text', 'Niemand ist der Brieftaube gefolgt. Der Auftrag fällt ausg.') where id = a.id; return;
  end if;
  select string_agg(coalesce(p.character_name, n.name), ', ') into namen from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms);
  ch := gilde_chance(a.art, a.ziel, ms);
  ausg := case when wurf < ch then 'erfolg' when wurf < ch + 0.15 then 'teil' else 'fehl' end;
  select max((gilde_fert(x)->>'schleichen')::int) into schl from unnest(ms) x;
  if g.geheim then enttarnt := random() < greatest(0.01, case ausg when 'fehl' then 0.35 when 'teil' then 0.12 else 0.03 end - schl * 0.02); end if;
  heim := heim_ort(a.von); hv := mein_dorf(a.von);
  -- Folgen
  if ausg <> 'fehl' then
    if a.art = 'auskundschaften' then
      kinfo := jsonb_build_object('staerke', (select x->>'staerke' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'rang', (select x->>'rang' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'kaempfer', round(dorf_staerke(a.ziel) * case ausg when 'erfolg' then 1 else 0.7 + random() * 0.6 end), 'mauer', (select mauer from welt_orte where id = a.ziel));
    elsif a.art = 'einschuechtern' then
      if hv is not null then perform eco_add(hv, jsonb_build_object('nahrung', case ausg when 'erfolg' then 14 else 5 end, 'waren', case ausg when 'erfolg' then 4 else 1 end)); end if;
      perform dipl_aendern(heim, a.ziel, -2);
    elsif a.art = 'sabotage' then
      insert into ort_effekte (ort, art, wert, bis) values (a.ziel, 'geschwaecht', case ausg when 'erfolg' then 0.2 else 0.1 end, now() + interval '3 days');
    elsif a.art = 'diebstahl' and hv is not null then
      perform eco_add(hv, jsonb_build_object('holz', case ausg when 'erfolg' then 25 else 10 end, 'nahrung', case ausg when 'erfolg' then 18 else 6 end, 'waren', case ausg when 'erfolg' then 5 else 2 end));
    end if;
  end if;
  if enttarnt or (not g.geheim and a.art <> 'auskundschaften') then perform dipl_aendern(heim, a.ziel, case when enttarnt then -8 else -3 end); end if;
  -- Verletzungen und Erfahrung
  for t in select m.*, coalesce(p.character_name, n.name) nm from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms) loop
    if random() < (adef->>'risiko')::numeric * case ausg when 'fehl' then 2 when 'teil' then 1 else 0.4 end then
      update gilde_mitglieder set verletzt_bis = now() + make_interval(days => 1 + floor(random() * 3)::int) where id = t.id;
      if t.npc_id is not null then update npcs set zustand = 'verletzt', zustand_bis = now() + interval '2 days' where id = t.npc_id; end if;
      verletzt := verletzt || t.nm;
    end if;
    xpgain := case ausg when 'erfolg' then 6 when 'teil' then 4 else 2 end;  -- wie Übungsstunden
    for k in select jsonb_object_keys(adef->'w') loop
      if t.player_id is not null then
        perform fert_xp(t.player_id, case k when 'schleichen' then 'flink' when 'gift' then 'heilkunde' when 'ueberzeugen' then 'ueberreden' else k end, xpgain * (adef->'w'->>k)::numeric);
      else
        update gilde_mitglieder set xp = jsonb_set(xp, array[k], to_jsonb(coalesce((xp->>k)::numeric, 0) + xpgain * (adef->'w'->>k)::numeric)) where id = t.id;
      end if;
    end loop;
  end loop;
  rufp := case ausg when 'erfolg' then (adef->>'ruf')::int when 'teil' then (adef->>'ruf')::int / 2 else case when enttarnt then 1 else 0 end end;
  update gilden set ruf = ruf + rufp where id = g.id;
  if not g.geheim and rufp > 0 then update profiles set ruhm = ruhm + greatest(1, rufp / 2) where id in (select player_id from gilde_mitglieder where id = any(ms) and player_id is not null); end if;
  erz := gilde_erzaehlung(a.art, ausg, namen, zielname, g.name, zeichen, g.geheim and not enttarnt);
  if enttarnt then erz := erz || ' Schlimmer noch: Man hat ein Gesicht erkannt. In ' || zielname || ' weiß man jetzt, wer hinter dem Zeichen steckt.'; end if;
  if array_length(verletzt, 1) > 0 then erz := erz || ' Verletzt: ' || array_to_string(verletzt, ', ') || '.'; end if;
  update gilde_auftraege set status = 'fertig', ergebnis = jsonb_build_object('ausgang', ausg, 'chance', round(ch * 100), 'text', erz, 'teilnehmer', namen, 'enttarnt', enttarnt, 'ruf', rufp, 'info', kinfo, 'verletzt', to_jsonb(verletzt)) where id = a.id;
end $fn$$q52$; r := r || '52:ok '; exception when others then r := r || '52:' || left(sqlerrm, 50) || ' '; end;
  raise exception 'BISECT %', r; end $t$;