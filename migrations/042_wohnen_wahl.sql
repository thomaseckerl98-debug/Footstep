-- 042: Wohnen (Einziehen, mein_dorf), Ansehen pro Dorf, Wahl des Jarls jeden Sonntag 18 Uhr (erzeugt von tools/m042.py)

alter table public.profiles add column if not exists dorf_id bigint references public.villages(id);
alter table public.villages alter column owner_id drop not null;  -- KI-Dörfer, in die jemand zieht, haben keinen Gründer
update public.profiles p set dorf_id = (select v.id from public.villages v where v.owner_id = p.id order by v.id limit 1) where p.dorf_id is null;
create index if not exists profiles_dorf_idx on public.profiles (dorf_id);

create table if not exists public.dorf_ansehen (
  player_id uuid not null references public.profiles(id) on delete cascade,
  village_id bigint not null references public.villages(id) on delete cascade,
  ansehen int not null default 0,
  bis timestamptz not null default now(),
  primary key (player_id, village_id)
);
alter table public.dorf_ansehen enable row level security;
revoke all on public.dorf_ansehen from anon, authenticated;

alter table public.dorf_amt add column if not exists wahl_rang jsonb;
alter table public.dorf_wahlen drop constraint if exists dorf_wahlen_status_check;
alter table public.dorf_wahlen add constraint dorf_wahlen_status_check check (status = any (array['gewaehlt', 'verloren', 'angenommen', 'abgelehnt', 'bestaetigt', 'abgelaufen']));
alter table public.dorf_amt add column if not exists angebot_idx int;
alter table public.dorf_amt add column if not exists angebot_bis timestamptz;

-- Das Dorf, in dem ein Spieler wohnt (vorher: das Dorf, das er gegründet hat)
create or replace function public.mein_dorf(p_uid uuid) returns bigint language sql stable security definer set search_path = public as $$
  select coalesce((select dorf_id from profiles where id = p_uid), (select id from villages where owner_id = p_uid order by id limit 1));
$$;
create or replace function public.heim_ort(p_uid uuid) returns text language sql stable security definer set search_path = public as $$
  select o.id from welt_orte o where o.village_id = mein_dorf(p_uid) limit 1;
$$;
create or replace function public.dorf_spieler(p_v bigint) returns setof uuid language sql stable security definer set search_path = public as $$
  select p.id from profiles p where coalesce(p.dorf_id, (select v.id from villages v where v.owner_id = p.id order by v.id limit 1)) = p_v;
$$;

drop policy if exists "eigenes dorf lesbar" on public.villages;
create policy "eigenes dorf lesbar" on public.villages for select using (owner_id = auth.uid() or id = public.mein_dorf(auth.uid()));

-- Alle Funktionen, die „mein Dorf“ über den Gründer gesucht haben, auf mein_dorf() umstellen
do $$
declare f record; d text; n text; x text := '(auth\.uid\(\)|p_uid|v_uid|uid|me|p\.id|r\.player_id|p_run\.player_id|new\.player_id)(?![a-z_0-9])';
begin
  for f in select p.oid, p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
           and pg_get_functiondef(p.oid) ~ 'owner_id' and p.proname not in ('mein_dorf', 'dorf_spieler', 'handle_new_user') loop
    d := pg_get_functiondef(f.oid); n := d;
    n := regexp_replace(n, 'villages where owner_id = ' || x, 'villages where id = mein_dorf(\1)', 'g');
    n := regexp_replace(n, '\m(v|vv)\.owner_id = ' || x, '\1.id = mein_dorf(\2)', 'g');
    n := regexp_replace(n, '(update villages set [^;]*? where )owner_id = ' || x, '\1id = mein_dorf(\2)', 'g');
    if n <> d then execute n; end if;
  end loop;
end $$;

-- Neue Dorfämter bekommen gleich den nächsten Wahltermin
create or replace function public.naechster_sonntag() returns timestamptz language sql stable as $$
  select (s + case when s <= (now() at time zone 'Europe/Berlin') then interval '7 days' else interval '0' end) at time zone 'Europe/Berlin'
  from (select date_trunc('week', now() at time zone 'Europe/Berlin') + interval '6 days 18 hours' s) x;
$$;
create or replace function public.trg_amt_termin() returns trigger language plpgsql as $$
begin new.naechste_wahl := coalesce(new.naechste_wahl, naechster_sonntag()); return new; end $$;
drop trigger if exists amt_termin on public.dorf_amt;
create trigger amt_termin before insert on public.dorf_amt for each row execute function public.trg_amt_termin();
update public.dorf_amt set naechste_wahl = public.naechster_sonntag() where true;


-- Kandidaten mit Vertrauen → Stimmen. Spieler: Zuneigung der Dorfleute + Ansehen, gedämpft durch die verdeckte Checkliste.
create or replace function public.amt_kandidaten(p_v bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare a dorf_amt; r jsonb := '[]'; x record; s numeric; k int; nv int; tot numeric;
begin
  a := amt_init(p_v);
  for x in select p.id, p.character_name nm, coalesce(p.ansehen, 0) ans from profiles p where p.id in (select dorf_spieler(p_v)) loop
    select avg(coalesce(rr.sympathy, case when n.namenlos then 10 else 0 end)) into s from npcs n left join npc_relations rr on rr.npc_id = n.id and rr.player_id = x.id where n.village_id = p_v and n.tot_at is null;
    k := amt_bed_zahl(x.id, p_v);
    s := (0.7 * greatest(coalesce(s, 0), 0) + 0.2 * least(greatest(x.ans, 0), 150)) * case when k >= 6 then 1 else 0.2 + 0.1 * k end
         + case when a.meister_typ = 'spieler' and a.meister_player = x.id then 8 else 0 end;
    r := r || jsonb_build_object('typ', 'spieler', 'id', x.id, 'name', x.nm, 'score', round(greatest(s, 1), 2));
  end loop;
  for x in select n.id, n.name from npcs n where n.village_id = p_v and n.tot_at is null and not n.namenlos loop
    s := case when x.id = a.vorsteher_npc then 55 + case when coalesce(a.meister_typ, '') <> 'spieler' then 10 else 0 end
              else 12 + (abs(hashtext(x.name || to_char(now(), 'IYYYIW'))) % 22) end;
    r := r || jsonb_build_object('typ', 'npc', 'id', x.id, 'name', x.name, 'score', s);
  end loop;
  nv := (select count(*) from npcs where village_id = p_v and tot_at is null) + (select count(*) from dorf_spieler(p_v));
  select sum(power((e->>'score')::numeric, 2)) into tot from jsonb_array_elements(r) e;
  return coalesce((select jsonb_agg(e || jsonb_build_object('stimmen', round(nv * power((e->>'score')::numeric, 2) / greatest(tot, 1))) order by (e->>'score')::numeric desc)
                   from jsonb_array_elements(r) e), '[]'::jsonb);
end $$;

-- Das Amt wandert die Rangfolge hinab, bis jemand annimmt (NPCs nehmen immer an)
create or replace function public.amt_angebot_weiter(p_v bigint, p_ab int) returns void language plpgsql security definer set search_path = public as $$
declare a dorf_amt; e jsonb; i int; uid uuid; alt text;
begin
  select * into a from dorf_amt where village_id = p_v for update;
  if a.wahl_rang is null then return; end if;
  for i in greatest(0, p_ab) .. jsonb_array_length(a.wahl_rang) - 1 loop
    e := a.wahl_rang->i;
    if e->>'typ' = 'npc' then
      alt := case when a.meister_typ = 'spieler' then (select character_name from profiles where id = a.meister_player) end;
      update dorf_amt set meister_typ = 'vorsteher', vorsteher_npc = (e->>'id')::bigint, meister_player = null, angebot_idx = null, angebot_bis = null,
        seit = case when meister_typ = 'spieler' or vorsteher_npc is distinct from (e->>'id')::bigint then now() else seit end where village_id = p_v;
      perform eco_log(p_v, 'amt', case when a.vorsteher_npc = (e->>'id')::bigint and coalesce(a.meister_typ, '') <> 'spieler' then (e->>'name') || ' bleibt Vorsteher des Dorfes.'
                                       else (e->>'name') || ' führt jetzt das Dorf.' || coalesce(' ' || alt || ' hat das Amt verloren.', '') end, (e->>'id')::bigint, now());
      return;
    end if;
    uid := (e->>'id')::uuid;
    if uid not in (select dorf_spieler(p_v)) then continue; end if;
    if a.meister_typ = 'spieler' and a.meister_player = uid then
      update dorf_wahlen set status = 'bestaetigt', gesehen = true where id = (select max(id) from dorf_wahlen where village_id = p_v and player_id = uid);
      update dorf_amt set angebot_idx = null, angebot_bis = null where village_id = p_v;
      perform eco_log(p_v, 'amt', (e->>'name') || ' bleibt Jarl – die Leute haben wieder ihm ihr Vertrauen geschenkt.', null, now());
      return;
    end if;
    update dorf_wahlen set status = 'gewaehlt', gesehen = false where id = (select max(id) from dorf_wahlen where village_id = p_v and player_id = uid);
    update dorf_amt set angebot_idx = i, angebot_bis = now() + interval '24 hours' where village_id = p_v;
    return;
  end loop;
end $$;

create or replace function public.amt_wahl_woche(p_v bigint) returns void language plpgsql security definer set search_path = public as $$
declare rang jsonb; tot int; x record; best jsonb; top jsonb;
begin
  rang := amt_kandidaten(p_v);
  if jsonb_array_length(rang) = 0 then update dorf_amt set naechste_wahl = naechster_sonntag() where village_id = p_v; return; end if;
  select coalesce(sum((e->>'stimmen')::int), 0) into tot from jsonb_array_elements(rang) e;
  update dorf_amt set wahl_rang = rang, angebot_idx = null, angebot_bis = null, naechste_wahl = naechster_sonntag() where village_id = p_v;
  update dorf_wahlen set status = 'abgelaufen' where village_id = p_v and status = 'gewaehlt';
  for x in select id from dorf_spieler(p_v) id loop
    select e into best from jsonb_array_elements(rang) e where e->>'id' <> x.id::text limit 1;
    insert into dorf_wahlen (village_id, player_id, gegner_npc, gegner_name, status, ja, nein, stimmen)
    values (p_v, x.id, case when best->>'typ' = 'npc' then (best->>'id')::bigint end, best->>'name', 'verloren',
            coalesce((select (e->>'stimmen')::int from jsonb_array_elements(rang) e where e->>'id' = x.id::text), 0),
            tot - coalesce((select (e->>'stimmen')::int from jsonb_array_elements(rang) e where e->>'id' = x.id::text), 0),
            (select coalesce(jsonb_agg(jsonb_build_object('name', e->>'name', 'stimmen', (e->>'stimmen')::int, 'du', e->>'id' = x.id::text)), '[]'::jsonb) from (select * from jsonb_array_elements(rang) limit 6) z(e)));
  end loop;
  top := rang->0;
  perform eco_log(p_v, 'amt', 'Wahl des Jarls: Die meisten Stimmen bekommt ' || (top->>'name') || ' (' || (top->>'stimmen') || ' von ' || tot || ').', null, now());
  perform amt_angebot_weiter(p_v, 0);
end $$;

create or replace function public.amt_wahlen_pruefen() returns void language plpgsql security definer set search_path = public as $$
declare d record;
begin
  for d in select a.village_id from dorf_amt a where a.naechste_wahl is not null and a.naechste_wahl <= now() and exists (select 1 from dorf_spieler(a.village_id)) loop
    perform amt_wahl_woche(d.village_id);
  end loop;
  for d in select village_id, angebot_idx from dorf_amt where angebot_bis is not null and angebot_bis < now() loop
    update dorf_wahlen set status = 'abgelaufen' where village_id = d.village_id and status = 'gewaehlt';
    perform amt_angebot_weiter(d.village_id, d.angebot_idx + 1);
  end loop;
end $$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.amt_antwort(boolean)'::regprocedure);
  if position($n0$update dorf_wahlen set status = 'abgelehnt', entschieden_at = now(), gesehen = true where id = w.id;
    if (select angebot_idx from dorf_amt where village_id = v.id) is not null then perform amt_angebot_weiter(v.id, (select angebot_idx from dorf_amt where village_id = v.id) + 1);
      return json_build_object('ok', true, 'text', 'Du bleibst Bewohner. Die Leute fragen jetzt den Nächsten, dem sie vertrauen.'); end if;$n0$ in d) = 0 then
    if position($o0$update dorf_wahlen set status = 'abgelehnt', entschieden_at = now(), gesehen = true where id = w.id;$o0$ in d) = 0 then raise exception 'Patch amt_antwort(boolean): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$update dorf_wahlen set status = 'abgelehnt', entschieden_at = now(), gesehen = true where id = w.id;$o0$, $n0$update dorf_wahlen set status = 'abgelehnt', entschieden_at = now(), gesehen = true where id = w.id;
    if (select angebot_idx from dorf_amt where village_id = v.id) is not null then perform amt_angebot_weiter(v.id, (select angebot_idx from dorf_amt where village_id = v.id) + 1);
      return json_build_object('ok', true, 'text', 'Du bleibst Bewohner. Die Leute fragen jetzt den Nächsten, dem sie vertrauen.'); end if;$n0$);
  end if;
  if position($n1$update dorf_amt set meister_typ = 'spieler', meister_player = auth.uid(), kapitel = greatest(kapitel, 4), seit = now(), naechstes_ereignis = now() + interval '20 hours', angebot_idx = null, angebot_bis = null where village_id = v.id;$n1$ in d) = 0 then
    if position($o1$update dorf_amt set meister_typ = 'spieler', meister_player = auth.uid(), kapitel = greatest(kapitel, 4), seit = now(), naechstes_ereignis = now() + interval '20 hours' where village_id = v.id;$o1$ in d) = 0 then raise exception 'Patch amt_antwort(boolean): Ziel 1 fehlt'; end if;
    d := replace(d, $o1$update dorf_amt set meister_typ = 'spieler', meister_player = auth.uid(), kapitel = greatest(kapitel, 4), seit = now(), naechstes_ereignis = now() + interval '20 hours' where village_id = v.id;$o1$, $n1$update dorf_amt set meister_typ = 'spieler', meister_player = auth.uid(), kapitel = greatest(kapitel, 4), seit = now(), naechstes_ereignis = now() + interval '20 hours', angebot_idx = null, angebot_bis = null where village_id = v.id;$n1$);
  end if;
  execute d;
end $p$;


-- Ein KI-Dorf bekommt beim ersten Zuzug ein echtes Dorf mit Bewohnern
create or replace function public.dorf_anlegen(p_ort text) returns bigint language plpgsql security definer set search_path = public as $$
declare o welt_orte; vid bigint; tries int := 0; r record; i int;
begin
  select * into o from welt_orte where id = p_ort for update;
  if o.village_id is not null then return o.village_id; end if;
  loop
    begin
      insert into villages (owner_id, name, x, y, landschaft) values (null, o.name, floor(random() * 100)::int, floor(random() * 100)::int, coalesce(o.landschaft, 'hochtal')) returning id into vid;
      exit;
    exception when unique_violation then tries := tries + 1; if tries > 60 then raise exception 'Kein Platz für ein neues Dorf'; end if;
    end;
  end loop;
  update welt_orte set village_id = vid where id = o.id;
  for r in select id from npcs where village_id is null and travel_to is null and tot_at is null and not namenlos and not reserviert order by tier, random() limit 2 for update skip locked loop
    update npcs set village_id = vid where id = r.id;
  end loop;
  for i in 1 .. least(10, greatest(5, coalesce(o.einwohner, 10) / 3)) loop perform npc_neu_namenlos(vid); end loop;
  insert into npc_bonds (npc_a, npc_b, sympathy)
    select a.id, b.id, (floor(random() * 100) - 40)::int from npcs a join npcs b on a.id < b.id where a.village_id = vid and b.village_id = vid on conflict do nothing;
  perform amt_init(vid);
  return vid;
end $$;

create or replace function public.dorf_einzug_info() returns json language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); l json; o welt_orte;
begin
  l := spieler_lage(uid);
  if l->>'zustand' <> 'ort' then return json_build_object('kann', false); end if;
  select * into o from welt_orte where id = l->>'ort';
  if o.art <> 'dorf' then return json_build_object('kann', false, 'grund', 'In ' || o.name || ' kann man sich nicht einfach niederlassen – das geht nur in Dörfern.'); end if;
  return json_build_object('kann', true, 'ort', o.id, 'name', o.name, 'jarl', amt_ist_meister(uid, mein_dorf(uid)),
    'spieler', (select coalesce(json_agg(p.character_name), '[]'::json) from profiles p where o.village_id is not null and p.id in (select dorf_spieler(o.village_id)) and p.id <> uid),
    'zurueck', exists (select 1 from dorf_ansehen a where a.player_id = uid and a.village_id = o.village_id));
end $$;

create or replace function public.dorf_einziehen() returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); l json; o welt_orte; alt bigint; vid bigint; p profiles; altname text;
begin
  if uid is null then raise exception 'Nicht angemeldet'; end if;
  l := spieler_lage(uid);
  if l->>'zustand' <> 'ort' then raise exception 'Um einzuziehen, musst du vor Ort sein.'; end if;
  select * into o from welt_orte where id = l->>'ort';
  if o.art <> 'dorf' then raise exception 'Einziehen geht nur in Dörfer.'; end if;
  if exists (select 1 from beschaeftigung where player_id = uid and ende_at is null) then raise exception 'Du bist gerade beschäftigt.'; end if;
  select * into p from profiles where id = uid for update;
  alt := mein_dorf(uid); altname := (select name from villages where id = alt);
  vid := coalesce(o.village_id, dorf_anlegen(o.id));
  if vid = alt then raise exception 'Hier wohnst du schon.'; end if;
  if amt_ist_meister(uid, alt) then
    update dorf_amt set meister_typ = 'vorsteher', meister_player = null, seit = now() where village_id = alt;
    perform eco_log(alt, 'amt', p.character_name || ' hat das Amt des Jarls niedergelegt und ist fortgezogen.', null, now());
  end if;
  insert into dorf_ansehen (player_id, village_id, ansehen, bis) values (uid, alt, coalesce(p.ansehen, 0), now())
    on conflict (player_id, village_id) do update set ansehen = excluded.ansehen, bis = now();
  update profiles set dorf_id = vid, ansehen = coalesce((select ansehen from dorf_ansehen where player_id = uid and village_id = vid), 0),
    bewohner_seit = now(), aufenthalt = null, weg_von = null, weg_ab = null, weg_bis = null, weg_pos = null, dorf_gesehen = now() where id = uid;
  perform eco_log(alt, 'zuzug', p.character_name || ' ist fortgezogen – nach ' || o.name || '.', null, now());
  perform eco_log(vid, 'zuzug', p.character_name || ' ist aus ' || coalesce(altname, 'der Fremde') || ' zugezogen. Noch kennt ihn hier kaum jemand.', null, now());
  perform amt_init(vid);
  return json_build_object('ok', true, 'dorf', o.name);
end $$;

revoke execute on function public.mein_dorf(uuid), public.dorf_spieler(bigint), public.amt_kandidaten(bigint), public.amt_angebot_weiter(bigint, int), public.amt_wahl_woche(bigint), public.dorf_anlegen(text) from public, anon, authenticated;
revoke execute on function public.dorf_einzug_info(), public.dorf_einziehen() from public, anon;
grant execute on function public.dorf_einzug_info(), public.dorf_einziehen() to authenticated;
grant execute on function public.mein_dorf(uuid) to authenticated;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.get_my_village()'::regprocedure);
  if position($n0$join profiles p on p.id = auth.uid()$n0$ in d) = 0 then
    if position($o0$join profiles p on p.id = v.owner_id$o0$ in d) = 0 then raise exception 'Patch get_my_village(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$join profiles p on p.id = v.owner_id$o0$, $n0$join profiles p on p.id = auth.uid()$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.get_world_map()'::regprocedure);
  if position($n0$join profiles p on mein_dorf(p.id) = v.id$n0$ in d) = 0 then
    if position($o0$join profiles p on p.id = v.owner_id$o0$ in d) = 0 then raise exception 'Patch get_world_map(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$join profiles p on p.id = v.owner_id$o0$, $n0$join profiles p on mein_dorf(p.id) = v.id$n0$);
  end if;
  if position($n1$(p.id = auth.uid())$n1$ in d) = 0 then
    if position($o1$(v.id = mein_dorf(auth.uid()))$o1$ in d) = 0 then raise exception 'Patch get_world_map(): Ziel 1 fehlt'; end if;
    d := replace(d, $o1$(v.id = mein_dorf(auth.uid()))$o1$, $n1$(p.id = auth.uid())$n1$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.welt_karte()'::regprocedure);
  if position($n0$'spieler', (select coalesce(json_agg(welt_spieler(pl.id, o.id, pl.id = me)), '[]'::json) from profiles pl join welt_orte o on o.village_id = mein_dorf(pl.id))$n0$ in d) = 0 then
    if position($o0$'spieler', (select coalesce(json_agg(welt_spieler(v.owner_id, o.id, v.id = mein_dorf(me))), '[]'::json) from welt_orte o join villages v on v.id = o.village_id)$o0$ in d) = 0 then raise exception 'Patch welt_karte(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$'spieler', (select coalesce(json_agg(welt_spieler(v.owner_id, o.id, v.id = mein_dorf(me))), '[]'::json) from welt_orte o join villages v on v.id = o.village_id)$o0$, $n0$'spieler', (select coalesce(json_agg(welt_spieler(pl.id, o.id, pl.id = me)), '[]'::json) from profiles pl join welt_orte o on o.village_id = mein_dorf(pl.id))$n0$);
  end if;
  if position($n1$from villages v join profiles p on p.id = (select x from dorf_spieler(v.id) x order by x = me desc, x limit 1) where v.id = o.village_id) end)$n1$ in d) = 0 then
    if position($o1$from villages v join profiles p on p.id = v.owner_id where v.id = o.village_id) end)$o1$ in d) = 0 then raise exception 'Patch welt_karte(): Ziel 1 fehlt'; end if;
    d := replace(d, $o1$from villages v join profiles p on p.id = v.owner_id where v.id = o.village_id) end)$o1$, $n1$from villages v join profiles p on p.id = (select x from dorf_spieler(v.id) x order by x = me desc, x limit 1) where v.id = o.village_id) end)$n1$);
  end if;
  if position($n2$(select json_build_object('name', (select string_agg(pq.character_name, ' & ') from profiles pq where pq.id in (select dorf_spieler(v.id))), 'ich', v.id = mein_dorf(me),$n2$ in d) = 0 then
    if position($o2$(select json_build_object('name', p.character_name, 'ich', v.id = mein_dorf(me),$o2$ in d) = 0 then raise exception 'Patch welt_karte(): Ziel 2 fehlt'; end if;
    d := replace(d, $o2$(select json_build_object('name', p.character_name, 'ich', v.id = mein_dorf(me),$o2$, $n2$(select json_build_object('name', (select string_agg(pq.character_name, ' & ') from profiles pq where pq.id in (select dorf_spieler(v.id))), 'ich', v.id = mein_dorf(me),$n2$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.dipl_orte()'::regprocedure);
  if position($n0$(select string_agg(pp.character_name, ', ') from profiles pp where o.village_id is not null and pp.id in (select dorf_spieler(o.village_id)))$n0$ in d) = 0 then
    if position($o0$(select string_agg(pp.character_name, ', ') from villages v join profiles pp on pp.id = v.owner_id where v.id = o.village_id)$o0$ in d) = 0 then raise exception 'Patch dipl_orte(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$(select string_agg(pp.character_name, ', ') from villages v join profiles pp on pp.id = v.owner_id where v.id = o.village_id)$o0$, $n0$(select string_agg(pp.character_name, ', ') from profiles pp where o.village_id is not null and pp.id in (select dorf_spieler(o.village_id)))$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.dorf_rangliste()'::regprocedure);
  if position($n0$(select string_agg(pp.character_name, ', ') from profiles pp where o.village_id is not null and pp.id in (select dorf_spieler(o.village_id)))$n0$ in d) = 0 then
    if position($o0$(select string_agg(pp.character_name, ', ') from villages v join profiles pp on pp.id = v.owner_id where v.id = o.village_id)$o0$ in d) = 0 then raise exception 'Patch dorf_rangliste(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$(select string_agg(pp.character_name, ', ') from villages v join profiles pp on pp.id = v.owner_id where v.id = o.village_id)$o0$, $n0$(select string_agg(pp.character_name, ', ') from profiles pp where o.village_id is not null and pp.id in (select dorf_spieler(o.village_id)))$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.dorf_staerke(text)'::regprocedure);
  if position($n0$from profiles p where p.id in (select dorf_spieler(v.id)) loop$n0$ in d) = 0 then
    if position($o0$from profiles p where p.id = v.owner_id loop$o0$ in d) = 0 then raise exception 'Patch dorf_staerke(text): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$from profiles p where p.id = v.owner_id loop$o0$, $n0$from profiles p where p.id in (select dorf_spieler(v.id)) loop$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.ort_besuch()'::regprocedure);
  if position($n0$'hausherr', vid is not null and p.id in (select dorf_spieler(vid))$n0$ in d) = 0 then
    if position($o0$'hausherr', p.id = owner$o0$ in d) = 0 then raise exception 'Patch ort_besuch(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$'hausherr', p.id = owner$o0$, $n0$'hausherr', vid is not null and p.id in (select dorf_spieler(vid))$n0$);
  end if;
  if position($n1$(t.fundort = 'spielerdorf' and vid is not null and exists (select 1 from dorf_spieler(vid) x where x <> uid))$n1$ in d) = 0 then
    if position($o1$(t.fundort = 'spielerdorf' and owner is not null and owner <> uid)$o1$ in d) = 0 then raise exception 'Patch ort_besuch(): Ziel 1 fehlt'; end if;
    d := replace(d, $o1$(t.fundort = 'spielerdorf' and owner is not null and owner <> uid)$o1$, $n1$(t.fundort = 'spielerdorf' and vid is not null and exists (select 1 from dorf_spieler(vid) x where x <> uid))$n1$);
  end if;
  execute d;
end $p$;
