-- 045: Anmeldung (Namen), halber Heimweg nach Scheitern/Abbruch/Besuch (erzeugt von tools/m045.py)
do $p$ declare d text; begin
  d := pg_get_functiondef('public.npc_neu_namenlos(bigint,text)'::regprocedure);
  if position($n0$  -- freien Namen wählen; sind alle vergeben, bekommt der Name einen Beinamen
  select x into nm from unnest(case when w = 1 then fn else mn end) x where not exists (select 1 from npcs o where lower(o.name) = lower(x)) order by random() limit 1;
  while nm is null or exists (select 1 from npcs o where lower(o.name) = lower(nm)) loop
    nm := (case when w = 1 then fn else mn end)[1 + floor(random() * array_length(case when w = 1 then fn else mn end, 1))::int] || ' '
          || (array['vom Bach', 'vom Hang', 'am Brunnen', 'vom Moor', 'vom Wald', 'an der Furt', 'vom Steg', 'am Tor', 'vom Feld', 'vom Hügel', 'von der Mühle', 'am Weiher'])[1 + floor(random() * 12)::int];
  end loop;$n0$ in d) = 0 then
    if position($o0$  nm := case when w = 1 then fn[1 + floor(random() * array_length(fn, 1))::int] else mn[1 + floor(random() * array_length(mn, 1))::int] end;$o0$ in d) = 0 then raise exception 'Patch npc_neu_namenlos(bigint,text): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$  nm := case when w = 1 then fn[1 + floor(random() * array_length(fn, 1))::int] else mn[1 + floor(random() * array_length(mn, 1))::int] end;$o0$, $n0$  -- freien Namen wählen; sind alle vergeben, bekommt der Name einen Beinamen
  select x into nm from unnest(case when w = 1 then fn else mn end) x where not exists (select 1 from npcs o where lower(o.name) = lower(x)) order by random() limit 1;
  while nm is null or exists (select 1 from npcs o where lower(o.name) = lower(nm)) loop
    nm := (case when w = 1 then fn else mn end)[1 + floor(random() * array_length(case when w = 1 then fn else mn end, 1))::int] || ' '
          || (array['vom Bach', 'vom Hang', 'am Brunnen', 'vom Moor', 'vom Wald', 'an der Furt', 'vom Steg', 'am Tor', 'vom Feld', 'vom Hügel', 'von der Mühle', 'am Weiher'])[1 + floor(random() * 12)::int];
  end loop;$n0$);
  end if;
  execute d;
end $p$;


-- Endete die Quest mit einem Scheitern? (Name der Endszene)
create or replace function public.q_misserfolg(p_run bigint) returns boolean language sql stable security definer set search_path = public as $$
  select r.status = 'abgebrochen' or r.szene ~ '(leer|flucht|fehl|zurueck|nichts|verlor|scheiter|gefangen|niederlage)' from quest_runs r where r.id = p_run;
$$;
create or replace function public.heim_halb(p_m int) returns int language sql immutable as $$ select case when p_m <= 0 then p_m else greatest(5, ceil(p_m / 2.0))::int end; $$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.q_heimweg_info(bigint)'::regprocedure);
  if position($n0$hm := case when von is null then greatest(5, round(d))::int when von = heim then 0 else reise_minuten(von, heim) end;
  if q_misserfolg(p_run) then hm := heim_halb(hm); end if;$n0$ in d) = 0 then
    if position($o0$hm := case when von is null then greatest(5, round(d))::int when von = heim then 0 else reise_minuten(von, heim) end;$o0$ in d) = 0 then raise exception 'Patch q_heimweg_info(bigint): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$hm := case when von is null then greatest(5, round(d))::int when von = heim then 0 else reise_minuten(von, heim) end;$o0$, $n0$hm := case when von is null then greatest(5, round(d))::int when von = heim then 0 else reise_minuten(von, heim) end;
  if q_misserfolg(p_run) then hm := heim_halb(hm); end if;$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.quest_heimweg(bigint,text)'::regprocedure);
  if position($n0$    if ziel = heim and q_misserfolg(r.id) then m := heim_halb(m); end if;
    update profiles set aufenthalt = case when ziel = heim then null else ziel end, weg_von = coalesce(von, heim), weg_ab = now(),$n0$ in d) = 0 then
    if position($o0$    update profiles set aufenthalt = case when ziel = heim then null else ziel end, weg_von = coalesce(von, heim), weg_ab = now(),$o0$ in d) = 0 then raise exception 'Patch quest_heimweg(bigint,text): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$    update profiles set aufenthalt = case when ziel = heim then null else ziel end, weg_von = coalesce(von, heim), weg_ab = now(),$o0$, $n0$    if ziel = heim and q_misserfolg(r.id) then m := heim_halb(m); end if;
    update profiles set aufenthalt = case when ziel = heim then null else ziel end, weg_von = coalesce(von, heim), weg_ab = now(),$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.quest_abort(bigint)'::regprocedure);
  if position($n0$    m := heim_halb(m);
    if m >= 5 then$n0$ in d) = 0 then
    if position($o0$    if m >= 5 then$o0$ in d) = 0 then raise exception 'Patch quest_abort(bigint): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$    if m >= 5 then$o0$, $n0$    m := heim_halb(m);
    if m >= 5 then$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.reise_start(text)'::regprocedure);
  if position($n0$  m := reise_minuten(von, ziel); if ziel = heim then m := heim_halb(m); end if;$n0$ in d) = 0 then
    if position($o0$  m := reise_minuten(von, ziel);$o0$ in d) = 0 then raise exception 'Patch reise_start(text): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$  m := reise_minuten(von, ziel);$o0$, $n0$  m := reise_minuten(von, ziel); if ziel = heim then m := heim_halb(m); end if;$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.reise_ziele()'::regprocedure);
  if position($n0$'minuten', case when von is null or o.id = von then null when o.id = heim then heim_halb(reise_minuten(von, o.id)) else reise_minuten(von, o.id) end)$n0$ in d) = 0 then
    if position($o0$'minuten', case when von is null or o.id = von then null else reise_minuten(von, o.id) end)$o0$ in d) = 0 then raise exception 'Patch reise_ziele(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$'minuten', case when von is null or o.id = von then null else reise_minuten(von, o.id) end)$o0$, $n0$'minuten', case when von is null or o.id = von then null when o.id = heim then heim_halb(reise_minuten(von, o.id)) else reise_minuten(von, o.id) end)$n0$);
  end if;
  execute d;
end $p$;

revoke execute on function public.q_misserfolg(bigint) from public, anon, authenticated;