-- 031: Namens-NPCs und Namenlose, Gesundheit und Tod, faire Wahl (drei Wege + Lagerfeuer), Krisenhilfe für Bewohner
-- Grundsätze: Namens-NPCs kann man ansprechen, mitnehmen, befreunden. Namenlose arbeiten, leben, stimmen ab und können sterben.
-- Keine Lösch-Befehle: Tote und Fortgeschickte bleiben als Zeilen erhalten (village_id = null, tot_at gesetzt).

alter table public.npcs add column if not exists namenlos boolean not null default false;
alter table public.npcs add column if not exists zustand text not null default 'gesund';
alter table public.npcs add column if not exists zustand_bis timestamptz;
alter table public.npcs add column if not exists tot_at timestamptz;
alter table public.npcs add column if not exists todesursache text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'npcs_zustand_chk') then
    alter table public.npcs add constraint npcs_zustand_chk check (zustand in ('gesund', 'krank', 'verletzt'));
  end if;
end $$;
create index if not exists npcs_village_idx on public.npcs (village_id) where tot_at is null;

alter table public.dorf_amt add column if not exists lagerfeuer_at timestamptz;
alter table public.dorf_amt add column if not exists lagerfeuer_nein timestamptz;
alter table public.dorf_ereignisse add column if not exists geholfen jsonb not null default '{}';

create table if not exists public.dorf_taten (
  id bigserial primary key, player_id uuid not null references public.profiles(id) on delete cascade,
  village_id bigint not null references public.villages(id) on delete cascade,
  art text not null check (art in ('tat', 'krise')), titel text not null, at timestamptz not null default now());
create index if not exists dorf_taten_p on public.dorf_taten (player_id, village_id);
alter table public.dorf_taten enable row level security;
revoke all on public.dorf_taten from anon, authenticated;

/* ---------- Hilfsfunktionen ---------- */
create or replace function public.dorf_typen(p_v bigint) returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(e.value->>0), '{}') from jsonb_array_elements(coalesce((select layout from villages where id = p_v), '[]'::jsonb)) e;
$$;
create or replace function public.job_weiblich(p_job text) returns boolean language sql immutable as $$
  select coalesce(p_job, '') ~ '(in|frau|maid)$' or p_job in ('Wache', 'Dorfälteste');
$$;
-- Anzeige-Name: Namens-NPC → Name; Namenlose → „eine Weberin“ / „ein Bauer“
create or replace function public.npc_label(p_npc bigint, p_gross boolean default false) returns text language plpgsql stable security definer set search_path = public as $$
declare n npcs; t text;
begin
  select * into n from npcs where id = p_npc; if n.id is null then return case when p_gross then 'Jemand' else 'jemand' end; end if;
  if not n.namenlos then return n.name; end if;
  t := case when job_weiblich(n.job) then 'eine ' else 'ein ' end || n.job;
  if p_gross then t := upper(left(t, 1)) || substr(t, 2); end if;
  return t;
end $$;
-- wie viele Namens-NPCs ein Ort tragen kann: Dorf 3, Stadt bis 6, Großstadt bis 10
create or replace function public.npc_namen_cap(p_v bigint) returns int language sql stable security definer set search_path = public as $$
  select least(10, 2 + greatest(1, floor((select count(*) from npcs where village_id = p_v and tot_at is null) / 6.0)::int));
$$;
create or replace function public.volk_wort(p numeric) returns text language sql immutable as $$
  select case when p is null then null when p >= 70 then 'mögen dich sehr' when p >= 50 then 'mögen dich' when p >= 30 then 'kennen dich' else 'kennen dich kaum' end;
$$;
create or replace function public.volk_gunst(p_uid uuid, p_v bigint) returns numeric language sql stable security definer set search_path = public as $$
  select avg(coalesce(r.sympathy, 10)) from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = p_uid where x.village_id = p_v and x.namenlos;
$$;

-- neue namenlose Person: Beruf passend zu den Gebäuden, Aussehen aus vorhandenen Figuren gemischt
create or replace function public.npc_neu_namenlos(p_v bigint, p_job text default null) returns bigint language plpgsql security definer set search_path = public as $$
declare types text[]; j text; w int; base jsonb; nm text; nid bigint; owner uuid;
  mn text[] := array['Ansgar','Bertold','Cuno','Dietmar','Eberhard','Folkmar','Gernot','Hagen','Ingo','Jost','Konrad','Lothar','Merten','Notker','Otwin','Poppo','Rudolf','Siegbert','Thankmar','Ulrich','Volker','Walram','Wigand','Odo','Arnulf','Balduin','Egbert','Hartwig','Lambert','Meinrad','Gerlach','Henning','Ludger','Ruprecht','Tammo'];
  fn text[] := array['Adelheid','Berta','Clothilde','Dietlinde','Edda','Frieda','Gisela','Hedwig','Irmgard','Jutta','Kunigunde','Liutgard','Mechthild','Notburga','Oda','Richenza','Sigrid','Thea','Uta','Walburga','Agnes','Brigitta','Elsbeth','Gertrud','Hiltrud','Imma','Margret','Ricarda','Swanhild','Wendelgard'];
begin
  types := dorf_typen(p_v);
  j := p_job;
  if j is null then
    select ej.job into j from eco_jobs ej where ej.gebaeude = any(types) and exists (select 1 from npcs o where o.job = ej.job) order by random() limit 1;
    if j is null or random() < 0.35 then j := (array['Bauer','Bäuerin','Holzfäller','Hirte','Wäscherin','Bäuerin','Bauer'])[1 + floor(random() * 7)::int]; end if;
  end if;
  w := case when job_weiblich(j) then 1 else 0 end;
  select look into base from npcs where coalesce((look->>'w')::int, 0) = w order by random() limit 1;
  base := coalesce(base, '{}'::jsonb) - 'prop'
    || jsonb_build_object('w', w,
      'top', (select look->'top' from npcs where look ? 'top' order by random() limit 1),
      'legs', (select look->'legs' from npcs where look ? 'legs' order by random() limit 1),
      'hair', (select look->'hair' from npcs where look ? 'hair' order by random() limit 1),
      'skin', (select look->'skin' from npcs where look ? 'skin' order by random() limit 1));
  if w = 0 then base := base || jsonb_build_object('beard', (select look->'beard' from npcs where look ? 'beard' and coalesce((look->>'w')::int, 0) = 0 order by random() limit 1)); end if;
  base := base || coalesce((select jsonb_build_object('prop', look->'prop') from npcs where job = j and look ? 'prop' limit 1), '{}'::jsonb);
  nm := case when w = 1 then fn[1 + floor(random() * array_length(fn, 1))::int] else mn[1 + floor(random() * array_length(mn, 1))::int] end;
  insert into npcs (name, job, tier, look, village_id, traits, namenlos)
    values (nm, j, 3, base, p_v, jsonb_build_object('mut', floor(random() * 100), 'gier', floor(random() * 100), 'treue', 30 + floor(random() * 60), 'fleiss', 30 + floor(random() * 60), 'geselligkeit', floor(random() * 100)), true)
    returning id into nid;
  select owner_id into owner from villages where id = p_v;
  if owner is not null then
    insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (nid, owner, 8 + floor(random() * 15)::int, 25 + floor(random() * 20)::int) on conflict do nothing;
  end if;
  return nid;
end $$;

/* ---------- Zuzug, Start, Bittsteller: Namenlose dazu, Tote ausgeschlossen ---------- */
create or replace function public.eco_zuzug(p_v bigint, p_at timestamptz, p_npc bigint default null) returns bigint language plpgsql security definer set search_path = public as $$
declare v villages; n npcs; types text[]; named int; nid bigint;
begin
  select * into v from villages where id = p_v;
  select coalesce(array_agg(x->>0), '{}') into types from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x;
  if p_npc is not null then select * into n from npcs where id = p_npc and village_id is null and tot_at is null;
  else
    select count(*) into named from npcs where village_id = p_v and not namenlos and tot_at is null;
    -- meist kommen namenlose Leute; eine neue Namensfigur nur, wenn der Ort noch Platz für Bekannte hat
    if named < npc_namen_cap(p_v) and random() < 0.35 then
      select w.* into n from npcs w left join eco_jobs j on j.job = w.job
        where w.village_id is null and w.travel_to is null and not w.reserviert and w.tot_at is null and not w.namenlos
        order by (case when j.gebaeude = any(types) and not exists (select 1 from npcs o where o.village_id = p_v and o.job = w.job) then 3 else 1 end) * random() desc limit 1;
    end if;
    if n.id is null then
      nid := npc_neu_namenlos(p_v);
      update village_eco set zuzug_at = p_at where village_id = p_v;
      perform eco_log(p_v, 'zuzug', npc_label(nid, true) || ' ist ins Dorf gezogen.', nid, p_at);
      return nid;
    end if;
  end if;
  if n.id is null then return null; end if;
  update npcs set village_id = p_v, home_plot = null, travel_to = null, namenlos = false where id = n.id;
  update village_eco set zuzug_at = p_at where village_id = p_v;
  perform eco_log(p_v, 'zuzug', n.name || ' (' || n.job || ') ist ins Dorf gezogen.', n.id, p_at);
  return n.id;
end $$;

-- neue Dörfer: 2 Namensfiguren + 7 Namenlose
create or replace function public.assign_start_residents(p_village bigint, p_count int default 8) returns int language plpgsql security definer set search_path = public as $$
declare v_owner uuid; n int := 0; r record; i int;
begin
  select owner_id into v_owner from villages where id = p_village;
  if v_owner is null then return 0; end if;
  for r in select id from npcs where village_id is null and travel_to is null and tot_at is null and not namenlos and not reserviert
    order by tier, random() limit 2 for update skip locked loop
    update npcs set village_id = p_village where id = r.id;
    insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (r.id, v_owner, 5 + floor(random() * 30)::int, 30 + floor(random() * 30)::int) on conflict (npc_id, player_id) do nothing;
    n := n + 1;
  end loop;
  for i in 1..greatest(0, coalesce(p_count, 8) + 1 - n) loop perform npc_neu_namenlos(p_village); n := n + 1; end loop;
  insert into npc_bonds (npc_a, npc_b, sympathy)
  select a.id, b.id, (floor(random() * 100) - 40)::int from npcs a join npcs b on a.id < b.id
  where a.village_id = p_village and b.village_id = p_village on conflict do nothing;
  return n;
end $$;

create or replace function public.amt_bittsteller(p_v bigint) returns boolean language plpgsql security definer set search_path = public as $$
declare v villages; n npcs; types text[]; nid bigint;
begin
  if exists (select 1 from dorf_ereignisse where village_id = p_v and vorlage = 'bittsteller' and status = 'offen') then return false; end if;
  select * into v from villages where id = p_v;
  select coalesce(array_agg(x->>0), '{}') into types from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x;
  if (select count(*) from npcs where village_id = p_v and not namenlos and tot_at is null) < npc_namen_cap(p_v) and random() < 0.4 then
    select w.* into n from npcs w left join eco_jobs j on j.job = w.job where w.village_id is null and w.travel_to is null and not w.reserviert and w.tot_at is null and not w.namenlos
      order by (case when j.gebaeude = any(types) and not exists (select 1 from npcs o where o.village_id = p_v and o.job = w.job) then 3 else 1 end) * random() desc limit 1;
  end if;
  if n.id is null then
    -- eine namenlose Familie bittet um Aufnahme; sie wartet vor dem Dorf (noch ohne Dorf)
    nid := npc_neu_namenlos(p_v); update npcs set village_id = null where id = nid; select * into n from npcs where id = nid;
  end if;
  update npcs set reserviert = true where id = n.id;
  insert into dorf_ereignisse (village_id, vorlage, rollen, daten, frist) values (p_v, 'bittsteller', jsonb_build_object('T', jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)),
    jsonb_build_object('beruf', n.job, 'wesen', 'Man sagt, ' || n.name || ' sei ' || npc_wesen(n.traits) || '.'), now() + interval '48 hours');
  return true;
end $$;

create or replace function public.get_my_residents() returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'residents', coalesce((
      select json_agg(json_build_object(
        'id', n.id, 'name', n.name, 'job', n.job, 'look', n.look, 'home_plot', n.home_plot, 'namenlos', n.namenlos, 'zustand', n.zustand,
        'stimmung', npc_stimmung(coalesce(r.sympathy, case when n.namenlos then 10 else 0 end)), 'wesen', npc_wesen(n.traits),
        'freund', case when n.namenlos then null else (select case when b.npc_a = n.id then b.npc_b else b.npc_a end from npc_bonds b
                   where (b.npc_a = n.id or b.npc_b = n.id) and b.sympathy >= 30 order by b.sympathy desc limit 1) end,
        'erinnerung', case when n.namenlos then null else (select m.text from npc_memories m where m.npc_id = n.id and m.player_id = auth.uid() order by m.created_at desc limit 1) end
      ) order by n.namenlos, n.id)
      from npcs n join villages v on v.id = n.village_id
      left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid()
      where v.owner_id = auth.uid() and n.tot_at is null), '[]'::json),
    'wanderer', coalesce((
      select json_agg(json_build_object('id', w.id, 'name', w.name, 'job', w.job, 'look', w.look, 'wesen', npc_wesen(w.traits), 'stimmung', npc_stimmung(w.sympathy)))
      from (select n.id, n.name, n.job, n.look, n.traits, r.sympathy from npcs n
            left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid()
            where n.village_id is null and n.travel_to is null and n.tot_at is null and not n.namenlos and not n.reserviert order by random() limit 3) w), '[]'::json)
  );
$$;

create or replace function public.npc_reachable(p_npc bigint) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from npcs n where n.id = p_npc and n.tot_at is null and not n.namenlos
    and (n.village_id is null or exists (select 1 from villages v where v.id = n.village_id and v.owner_id = auth.uid())));
$$;

-- Rollen in Geschichten: zuerst Namensfiguren, dann Namenlose
create or replace function public.q_cast(p_uid uuid, p_rollen jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare v villages; keys text[]; picks record; res jsonb := '{}'::jsonb; i int := 0;
begin
  select * into v from villages where owner_id = p_uid;
  select array_agg(k order by k) into keys from jsonb_object_keys(coalesce(p_rollen, '{}'::jsonb)) k;
  if keys is null then return '{}'::jsonb; end if;
  for picks in select n.id, n.name, n.job from npcs n where n.village_id = v.id and n.tot_at is null order by n.namenlos, random() limit array_length(keys, 1) loop
    i := i + 1; res := res || jsonb_build_object(keys[i], jsonb_build_object('id', picks.id, 'name', picks.name, 'beruf', picks.job));
  end loop;
  if i < array_length(keys, 1) then return null; end if;
  return res;
end $$;

-- Begleiter: nur Namensfiguren, nur gesunde
create or replace function public.quest_list() returns json language plpgsql stable security definer set search_path = public as $$
declare v villages;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid();
  return json_build_object(
    'laufend', (select json_build_object('run', q.id, 'quest', q.quest_id, 'titel', t.titel) from quest_runs q join quest_templates t on t.id = q.quest_id where q.player_id = auth.uid() and q.status = 'laeuft' and not q_nebenbei(q.quest_id) order by q.id desc limit 1),
    'quests', (select coalesce(json_agg(json_build_object('id', t.id, 'titel', t.titel, 'beschreibung', t.beschreibung,
        'offen', not (t.voraussetzung ? 'wissen') or exists (select 1 from player_journal j where j.player_id = auth.uid() and j.key = t.voraussetzung->>'wissen'),
        'erledigt', exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.quest_id = t.id and q.status = 'fertig'),
        'hinweis', (select string_agg(n.name, ', ') from npcs n join npc_profiles p on p.npc_id = n.id where n.village_id = v.id and not n.namenlos and (t.voraussetzung->>'wissen') = any(p.wissen)))), '[]'::json) from quest_templates t where t.art = 'haupt'),
    'begleiter', (select coalesce(json_agg(json_build_object('id', n.id, 'name', n.name, 'beruf', n.job,
        'bereit', coalesce(r.sympathy, 0) >= 0 and n.zustand = 'gesund', 'zustand', n.zustand, 'stimmung', npc_stimmung(coalesce(r.sympathy, 0))) order by n.name), '[]'::json)
       from npcs n left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid() where n.village_id = v.id and not n.namenlos and n.tot_at is null)
  );
end $$;

-- Vorsteher: immer eine Namensfigur
create or replace function public.amt_init(p_v bigint) returns public.dorf_amt language plpgsql security definer set search_path = public as $$
declare a dorf_amt; nid bigint;
begin
  insert into dorf_amt (village_id) values (p_v) on conflict do nothing;
  select * into a from dorf_amt where village_id = p_v for update;
  if a.vorsteher_npc is null or not exists (select 1 from npcs where id = a.vorsteher_npc and village_id = p_v and not namenlos and tot_at is null) then
    select n.id into nid from npcs n where n.village_id = p_v and n.tot_at is null
      order by n.namenlos, array_position(array['Dorfälteste','Hauptmann','Priesterin','Wirt','Schmied','Gelehrter','Müllerin','Bauer'], n.job) nulls last, coalesce((n.traits->>'treue')::int, 50) desc, n.id limit 1;
    update dorf_amt set vorsteher_npc = nid where village_id = p_v returning * into a;
  end if;
  return a;
end $$;

/* ---------- Heute im Dorf: 2 Bitten von Bekannten, 1 von irgendwem ---------- */
create or replace function public.heute() returns json language plpgsql security definer set search_path = public as $$
declare d date := berlin_day(); v villages; cnt int; lauf bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid();
  if not exists (select 1 from tagwerk where player_id = auth.uid() and tag = d) then
    insert into tagwerk (player_id, tag, npc_id, art_id)
    select auth.uid(), d, x.npc, x.art from (
      select distinct on (n.id) n.id as npc, a.id as art, random() as rnd from npcs n join tagwerk_arten a on n.job = any(a.jobs)
      where n.village_id = v.id and not n.namenlos and n.tot_at is null and n.zustand = 'gesund' order by n.id, random()) x
    order by x.rnd limit 2 on conflict do nothing;
    insert into tagwerk (player_id, tag, npc_id, art_id)
    select auth.uid(), d, x.npc, x.art from (
      select distinct on (n.id) n.id as npc, a.id as art, random() as rnd from npcs n join tagwerk_arten a on n.job = any(a.jobs)
      where n.village_id = v.id and n.tot_at is null and n.zustand = 'gesund' and not exists (select 1 from tagwerk t where t.player_id = auth.uid() and t.tag = d and t.npc_id = n.id) order by n.id, random()) x
    order by x.rnd limit greatest(0, 3 - (select count(*) from tagwerk where player_id = auth.uid() and tag = d)) on conflict do nothing;
  end if;
  select count(*) into cnt from quest_runs q where q.player_id = auth.uid() and q_nebenbei(q.quest_id) and (q.started_at at time zone 'Europe/Berlin')::date = d;
  select q.id into lauf from quest_runs q where q.player_id = auth.uid() and q.status = 'laeuft' and q_nebenbei(q.quest_id) order by q.id desc limit 1;
  return json_build_object(
    'tagwerk', (select coalesce(json_agg(json_build_object('id', w.id, 'npc_id', n.id, 'npc', npc_label(n.id, true), 'namenlos', n.namenlos, 'beruf', n.job, 'look', n.look, 'titel', a.titel, 'bitte', a.bitte,
        'art', a.art, 'schwer', a.schwer, 'status', w.status, 'ergebnis', w.ergebnis) order by w.id), '[]'::json)
      from tagwerk w join npcs n on n.id = w.npc_id join tagwerk_arten a on a.id = w.art_id where w.player_id = auth.uid() and w.tag = d),
    'erkunden', json_build_object('rest', greatest(0, 3 - cnt), 'lauf', lauf, 'neu_ab', berlin_midnight()),
    'neu_ab', berlin_midnight());
end $$;

create or replace function public.tagwerk_fertig(p_id bigint, p_erfolg boolean) returns json language plpgsql security definer set search_path = public as $$
declare w tagwerk; a tagwerk_arten; n npcs; vid bigint; me text; txt text; extra text := ''; lt json; lab text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into w from tagwerk where id = p_id and player_id = auth.uid() and status = 'offen' for update;
  if w.id is null then return json_build_object('ok', false, 'grund', 'schon_erledigt'); end if;
  select * into a from tagwerk_arten where id = w.art_id; select * into n from npcs where id = w.npc_id;
  select id into vid from villages where owner_id = auth.uid(); select character_name into me from profiles where id = auth.uid();
  lab := npc_label(n.id, true);
  txt := replace(case when p_erfolg then a.erfolg else a.misserfolg end, '{held}', coalesce(me, 'du'));
  insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (n.id, auth.uid(), case when p_erfolg then 3 else 1 end, case when p_erfolg then 1 else 0 end)
    on conflict (npc_id, player_id) do update set sympathy = least(100, npc_relations.sympathy + case when p_erfolg then 3 else 1 end), loyalty = least(100, npc_relations.loyalty + case when p_erfolg then 1 else 0 end), updated_at = now();
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta)
    values (n.id, auth.uid(), 'gespraech', coalesce(me, 'Jemand') || case when p_erfolg then ' hat mir geholfen: ' else ' hat versucht, mir zu helfen: ' end || a.titel || '.', case when p_erfolg then 3 else 1 end);
  if p_erfolg and vid is not null and a.dorf <> '{}'::jsonb then perform eco_add(vid, a.dorf); extra := coalesce(eco_effekt(a.dorf), ''); end if;
  if p_erfolg and random() < 0.08 then
    lt := loot_roll(auth.uid(), 1, null, 'Tagwerk');
    extra := trim(extra || ' ' || lab || ' drückt dir zum Dank etwas in die Hand: ' || (lt->>'name') || '.');
  end if;
  if vid is not null then perform eco_log(vid, 'hilfe', coalesce(me, 'Jemand') || ' hat ' || npc_label(n.id) || ' geholfen: ' || a.titel || '.', n.id); end if;
  update tagwerk set status = case when p_erfolg then 'erledigt' else 'verpatzt' end, ergebnis = txt where id = w.id;
  return json_build_object('ok', true, 'text', txt, 'extra', extra);
end $$;

create or replace function public.trg_tagwerk_ansehen() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'offen' and new.status <> 'offen' then
    perform ansehen_add(new.player_id, case when new.status = 'erledigt' then 3 else 1 end, 'Hilfe: ' || npc_label(new.npc_id));
  end if;
  return new;
end $$;

-- Ansehen färbt auf die Namenlosen ab: wer dem Dorf hilft, wird von den Leuten gemocht
create or replace function public.ansehen_add(p_uid uuid, p_delta int, p_grund text) returns void language plpgsql security definer set search_path = public as $$
declare vid bigint; d int;
begin
  if p_uid is null or coalesce(p_delta, 0) = 0 then return; end if;
  update profiles set ansehen = greatest(0, ansehen + p_delta) where id = p_uid;
  insert into ansehen_log (player_id, delta, grund) values (p_uid, p_delta, left(p_grund, 120));
  select id into vid from villages where owner_id = p_uid;
  if vid is null then return; end if;
  d := case when p_delta > 0 then greatest(1, round(p_delta / 2.0)::int) else p_delta end;
  insert into npc_relations (npc_id, player_id, sympathy, loyalty)
    select x.id, p_uid, 10, 30 from npcs x where x.village_id = vid and x.namenlos and x.tot_at is null on conflict do nothing;
  update npc_relations r set sympathy = greatest(-100, least(100, r.sympathy + d)), updated_at = now()
    from npcs x where x.id = r.npc_id and r.player_id = p_uid and x.village_id = vid and x.namenlos and x.tot_at is null;
end $$;

/* ---------- Gesundheit, Verletzung, Tod ---------- */
create or replace function public.npc_tot(p_npc bigint, p_grund text) returns text language plpgsql security definer set search_path = public as $$
declare n npcs; lab text;
begin
  select * into n from npcs where id = p_npc and tot_at is null; if n.id is null then return null; end if;
  lab := npc_label(n.id, true);
  update npcs set tot_at = now(), todesursache = left(p_grund, 120), village_id = null, home_plot = null, zustand = 'gesund', zustand_bis = null, reserviert = true where id = n.id;
  if n.village_id is not null then
    perform eco_log(n.village_id, 'tod', case when n.namenlos then lab || ' ist gestorben (' || p_grund || ').' else n.name || ', ' || case when job_weiblich(n.job) then 'unsere ' else 'unser ' end || n.job || ', ist gestorben (' || p_grund || '). Das ganze Dorf trauert.' end, null, now());
    if not n.namenlos then update village_eco set bonus = bonus - 8 where village_id = n.village_id; else update village_eco set bonus = bonus - 2 where village_id = n.village_id; end if;
  end if;
  return lab;
end $$;

create or replace function public.npc_erkrankt(p_npc bigint, p_zustand text, p_tage double precision) returns void language sql security definer set search_path = public as $$
  update npcs set zustand = p_zustand, zustand_bis = now() + make_interval(secs => (p_tage * 86400)::int) where id = p_npc and tot_at is null;
$$;

-- Verluste bei Kämpfen (Wölfe, Überfälle, später Kriege): Vorbereitung, Ausrüstung, Loyalität und Gesundheit entscheiden
create or replace function public.krieg_verluste(p_v bigint, p_gegner numeric, p_kaempfer int, p_grund text default 'im Kampf') returns json language plpgsql security definer set search_path = public as $$
declare types text[]; ausr numeric := 1; loy numeric; ges numeric; staerke numeric; verh numeric; x record; tote text[] := '{}'; verl int := 0; owner uuid;
begin
  select owner_id into owner from villages where id = p_v;
  types := dorf_typen(p_v);
  ausr := 1 + 0.15 * (select count(*) from unnest(types) t where t = 'schmiede') + 0.25 * (select count(*) from unnest(types) t where t = 'kaserne') + 0.12 * (select count(*) from unnest(types) t where t = 'wachturm');
  select avg(coalesce(r.loyalty, 30)), avg(case when n.zustand = 'gesund' then 1.0 else 0.5 end) into loy, ges
    from npcs n left join npc_relations r on r.npc_id = n.id and r.player_id = owner where n.village_id = p_v and n.tot_at is null;
  staerke := greatest(0.3, p_kaempfer * ausr * (0.6 + coalesce(loy, 30) / 250.0) * coalesce(ges, 1) / 3.0);
  verh := p_gegner / staerke;
  for x in select n.id, n.namenlos from npcs n where n.village_id = p_v and n.tot_at is null and n.zustand = 'gesund'
      order by (n.job in ('Wache','Hauptmann','Söldnerin','Jäger','Jägerin','Holzfäller')) desc, n.namenlos desc, random() limit greatest(1, p_kaempfer) loop
    if random() < least(0.45, 0.05 * power(verh, 1.5)) * (case when x.namenlos then 1 else 0.35 end) then
      tote := tote || npc_tot(x.id, p_grund);
    elsif random() < least(0.8, 0.25 * verh) then
      perform npc_erkrankt(x.id, 'verletzt', 1.5 + random() * 2); verl := verl + 1;
    end if;
  end loop;
  return json_build_object('tote', to_json(tote), 'verletzte', verl, 'verhaeltnis', round(verh, 2));
end $$;

-- Risiko einer Krisen-Entscheidung (nach Vorlage und gewählter Option)
create or replace function public.krise_risiko(p_vorlage text, p_wahl int) returns jsonb language sql immutable as $$
  select case p_vorlage
    when 'fieber' then case p_wahl when 0 then '{"krank":3,"tot":0.08}' when 1 then '{"krank":2,"tot":0.03}' else '{"krank":5,"tot":0.3}' end
    when 'scheunenbrand' then case p_wahl when 0 then '{"verletzt":0.5,"tot":0.05}' when 1 then '{"verletzt":0.7,"tot":0.12}' else '{"verletzt":0.3,"tot":0.03}' end
    when 'woelfe' then case p_wahl when 0 then '{"kampf":2.2}' else '{"verletzt":0.1}' end
    when 'sturm' then '{"verletzt":0.35,"tot":0.02}'
    when 'fluechtlinge' then '{"krank":1}'
    else '{}' end::jsonb;
$$;

create or replace function public.krise_folgen(p_ev bigint, p_wahl int, p_faktor numeric) returns text language plpgsql security definer set search_path = public as $$
declare e dorf_ereignisse; r jsonb; heiler boolean; teile text[] := '{}'; kr int; x record; n int := 0; lab text; kv json; grund text;
begin
  select * into e from dorf_ereignisse where id = p_ev; r := krise_risiko(e.vorlage, p_wahl);
  if r = '{}'::jsonb then return ''; end if;
  heiler := 'heilerhaus' = any(dorf_typen(e.village_id));
  grund := case e.vorlage when 'fieber' then 'am Fieber' when 'scheunenbrand' then 'beim Brand' when 'sturm' then 'im Sturm' when 'woelfe' then 'bei der Wolfsjagd' else 'bei einem Unglück' end;
  if r ? 'krank' then
    kr := round((r->>'krank')::numeric * p_faktor * (0.5 + random()))::int;
    for x in select id from npcs where village_id = e.village_id and tot_at is null and zustand = 'gesund' order by namenlos desc, random() limit kr loop
      perform npc_erkrankt(x.id, 'krank', case when heiler then 1 else 2 end + random()); n := n + 1;
    end loop;
    if n = 1 then teile := teile || 'Eine Person liegt krank im Bett.'::text; elsif n > 1 then teile := teile || (n || ' Leute liegen krank im Bett.'); end if;
  end if;
  if r ? 'verletzt' and random() < (r->>'verletzt')::numeric * p_faktor then
    select id into x from npcs where village_id = e.village_id and tot_at is null and zustand = 'gesund' order by namenlos desc, random() limit 1;
    if x.id is not null then perform npc_erkrankt(x.id, 'verletzt', 1.5 + random() * 2); teile := teile || (npc_label(x.id, true) || ' wurde verletzt.'); end if;
  end if;
  if r ? 'tot' and random() < (r->>'tot')::numeric * p_faktor * (case when heiler then 0.5 else 1 end) then
    select id into x from npcs where village_id = e.village_id and tot_at is null
      order by (case when namenlos then 1 else 0.18 end) * (case when zustand <> 'gesund' then 2 else 1 end) * random() desc limit 1;
    if x.id is not null then lab := npc_tot(x.id, grund); teile := teile || (lab || ' hat es nicht überlebt.'); end if;
  end if;
  if r ? 'kampf' then
    kv := krieg_verluste(e.village_id, (r->>'kampf')::numeric * p_faktor, 3, grund);
    if (kv->>'verletzte')::int > 0 then teile := teile || ((kv->>'verletzte') || case when (kv->>'verletzte')::int = 1 then ' Jäger kam verletzt zurück.' else ' kamen verletzt zurück.' end); end if;
    if json_array_length(kv->'tote') > 0 then teile := teile || ((select string_agg(t, ' und ') from json_array_elements_text(kv->'tote') t) || ' kam nicht mehr nach Hause.'); end if;
  end if;
  return array_to_string(teile, ' ');
end $$;

/* ---------- Aushänge: Krisen warten auf Hilfe der Bewohner, Folgen für Leib und Leben ---------- */
create or replace function public.amt_apply(p_ev bigint, p_wahl int, p_von text, p_uid uuid) returns text language plpgsql security definer set search_path = public as $$
declare e dorf_ereignisse; t dorf_vorlagen; opt jsonb; f jsonb; k text; val text; nid bigint; res jsonb := '{}'; i int; txt text; fo text;
begin
  select * into e from dorf_ereignisse where id = p_ev for update; if e.status <> 'offen' then return e.ergebnis; end if;
  select * into t from dorf_vorlagen where id = e.vorlage;
  opt := t.optionen->greatest(0, least(jsonb_array_length(t.optionen) - 1, p_wahl)); f := coalesce(opt->'folgen', '{}');
  for k in select unnest(array['holz','stein','nahrung','waren']) loop if f->'res' ? k then res := res || jsonb_build_object(k, (f->'res'->>k)::numeric); end if; end loop;
  if f ? 'stim' and (f->>'stim')::numeric <> 0 then res := res || jsonb_build_object('stimmung', (f->>'stim')::numeric * 2); end if;
  if res <> '{}' then perform eco_add(e.village_id, res); end if;
  if f ? 'gunst' then update dorf_amt set koenig_gunst = greatest(0, least(100, koenig_gunst + (f->>'gunst')::int)) where village_id = e.village_id; end if;
  if p_uid is not null and f ? 'ansehen' then perform ansehen_add(p_uid, (f->>'ansehen')::int, 'Entscheidung: ' || t.titel); end if;
  if p_uid is not null and f ? 'sym' then for k, val in select * from jsonb_each_text(f->'sym') loop
    nid := (e.rollen->k->>'id')::bigint; continue when nid is null;
    insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (nid, p_uid, 0, 0) on conflict do nothing;
    update npc_relations set sympathy = greatest(-100, least(100, sympathy + val::int)), updated_at = now() where npc_id = nid and player_id = p_uid;
  end loop; end if;
  if f ? 'verbannen' then nid := (e.rollen->(f->>'verbannen')->>'id')::bigint;
    if nid is not null then update npcs set village_id = null, home_plot = null where id = nid and village_id = e.village_id; end if; end if;
  if e.vorlage = 'bittsteller' then
    nid := (e.rollen->'T'->>'id')::bigint;
    if coalesce((f->>'zuzug')::int, 0) > 0 and nid is not null then update npcs set reserviert = false where id = nid; perform eco_zuzug(e.village_id, now(), nid);
    elsif nid is not null then update npcs set reserviert = false where id = nid and village_id is null; end if;
  elsif coalesce((f->>'zuzug')::int, 0) > 0 then for i in 1..(f->>'zuzug')::int loop perform eco_zuzug(e.village_id, now()); end loop;
  end if;
  txt := amt_text(opt->>'ergebnis', e.rollen, e.daten);
  if t.art = 'krise' then
    fo := krise_folgen(e.id, p_wahl, case p_von when 'hilfe' then 0.25 when 'spieler' then 0.6 else 1.0 end);
    if coalesce(fo, '') <> '' then txt := txt || ' ' || fo; end if;
  end if;
  update dorf_ereignisse set status = 'entschieden', wahl = p_wahl, ergebnis = txt, von = p_von, entschieden_at = now() where id = e.id;
  perform eco_log(e.village_id, 'amt', t.titel || ': ' || txt, null, now());
  return txt;
end $$;

create or replace function public.amt_ereignis_neu(p_v bigint) returns bigint language plpgsql security definer set search_path = public as $$
declare a dorf_amt; t dorf_vorlagen; rol jsonb := '{}'; r text; n record; used bigint[] := '{}'; eid bigint; ok boolean;
begin
  a := amt_init(p_v);
  for t in select * from dorf_vorlagen where gewicht > 0 and art in ('rechtsfall', 'krise', 'koenig')
    and id not in (select vorlage from dorf_ereignisse where village_id = p_v and created_at > now() - interval '6 days')
    order by random() * gewicht * (case art when 'koenig' then 0.6 when 'krise' then 1.2 else 1 end) desc loop
    rol := '{}'; used := array[coalesce(a.vorsteher_npc, 0)]; ok := true;
    foreach r in array t.rollen loop
      select x.id, x.name, x.job into n from npcs x where x.village_id = p_v and x.tot_at is null and x.id <> all(used) order by x.namenlos, random() limit 1;
      if n.id is null then ok := false; exit; end if;
      rol := rol || jsonb_build_object(r, jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)); used := used || n.id;
    end loop;
    continue when not ok;
    if a.meister_typ <> 'spieler' and t.art = 'krise' then
      -- Krise ohne Dorfmeister: die Bewohner können helfen, nach 10 Stunden entscheidet der Vorsteher
      insert into dorf_ereignisse (village_id, vorlage, rollen, frist) values (p_v, t.id, rol, now() + interval '10 hours') returning id into eid;
    else
      insert into dorf_ereignisse (village_id, vorlage, rollen) values (p_v, t.id, rol) returning id into eid;
      if a.meister_typ <> 'spieler' then perform amt_apply(eid, t.auto, 'vorsteher', null); end if;
    end if;
    return eid;
  end loop;
  return null;
end $$;

-- stündlich: Genesung, abgelaufene Entscheidungen, neue Aushänge
create or replace function public.amt_tick(p_v bigint) returns void language plpgsql security definer set search_path = public as $$
declare a dorf_amt; e record; offen int;
begin
  update npcs set zustand = 'gesund', zustand_bis = null where village_id = p_v and zustand <> 'gesund' and zustand_bis < now();
  a := amt_init(p_v);
  for e in select x.id, x.vorlage from dorf_ereignisse x where x.village_id = p_v and x.status = 'offen' and x.frist < now() loop
    perform amt_apply(e.id, (select auto from dorf_vorlagen where id = e.vorlage), 'vorsteher', null);
  end loop;
  if now() >= a.naechstes_ereignis then
    select count(*) into offen from dorf_ereignisse where village_id = p_v and status = 'offen' and vorlage <> 'bittsteller';
    if offen = 0 then perform amt_ereignis_neu(p_v); end if;
    update dorf_amt set naechstes_ereignis = now() + interval '16 hours' + random() * interval '12 hours' where village_id = p_v;
  end if;
end $$;

/* ---------- Große Taten und abgewendete Krisen ---------- */
create or replace function public.trg_quest_taten() returns trigger language plpgsql security definer set search_path = public as $$
declare t quest_templates; vid bigint;
begin
  if new.status = 'fertig' and old.status is distinct from 'fertig' then
    select * into t from quest_templates where id = new.quest_id; select id into vid from villages where owner_id = new.player_id;
    if vid is null or t.id is null then return new; end if;
    if (t.art = 'brett' and coalesce(t.schwierigkeit, 1) >= 3) or t.art = 'haupt' then
      insert into dorf_taten (player_id, village_id, art, titel) values (new.player_id, vid, 'tat', t.titel);
    elsif t.id = 'chronik_2' and coalesce(new.szene, '') like 'ende_gut%' then
      insert into dorf_taten (player_id, village_id, art, titel) values (new.player_id, vid, 'krise', 'Das Brunnenwasser gerettet');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists quest_taten on public.quest_runs;
create trigger quest_taten after update of status on public.quest_runs for each row execute function public.trg_quest_taten();
-- bisherige Taten nachtragen (faire Ausgangslage)
insert into public.dorf_taten (player_id, village_id, art, titel, at)
select q.player_id, v.id, 'tat', t.titel, q.updated_at from public.quest_runs q join public.quest_templates t on t.id = q.quest_id join public.villages v on v.owner_id = q.player_id
where q.status = 'fertig' and ((t.art = 'brett' and coalesce(t.schwierigkeit, 1) >= 3) or t.art = 'haupt')
  and not exists (select 1 from public.dorf_taten d where d.player_id = q.player_id and d.titel = t.titel);

-- Weg zur Versammlung: (1) 3 Fürsprecher + große Tat · (2) abgewendete Krise + 2 Fürsprecher · (3) fast alle mögen dich sehr
create or replace function public.amt_weg(p_uid uuid, p_v bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare fz jsonb := '[]'; n record; cnt int := 0; alle boolean := true; named int := 0; volk numeric; nl int; taten jsonb; krisen jsonb; nt int; nk int; w1 boolean; w2 boolean; w3 boolean;
begin
  for n in select x.id, x.name, x.job, coalesce(r.sympathy, 0) sym from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = p_uid
      where x.village_id = p_v and not x.namenlos and x.tot_at is null order by coalesce(r.sympathy, 0) desc loop
    named := named + 1;
    fz := fz || jsonb_build_object('name', n.name, 'beruf', n.job, 'ja', n.sym >= 60, 'wort', npc_stimmung(n.sym));
    if n.sym >= 60 then cnt := cnt + 1; end if;
    if n.sym < 55 then alle := false; end if;
  end loop;
  select count(*), avg(coalesce(r.sympathy, 10)) into nl, volk from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = p_uid where x.village_id = p_v and x.namenlos and x.tot_at is null;
  if nl > 0 then
    if volk >= 50 then cnt := cnt + 1; end if;
    if volk < 60 then alle := false; end if;
  end if;
  select coalesce(jsonb_agg(titel order by at), '[]'), count(*) into taten, nt from dorf_taten where player_id = p_uid and village_id = p_v and art = 'tat';
  select coalesce(jsonb_agg(titel order by at), '[]'), count(*) into krisen, nk from dorf_taten where player_id = p_uid and village_id = p_v and art = 'krise';
  w1 := cnt >= 3 and nt >= 1; w2 := nk >= 1 and cnt >= 2; w3 := alle and named >= 2;
  return json_build_object('fuersprecher', fz, 'zahl', cnt,
    'volk', case when nl > 0 then json_build_object('ja', volk >= 50, 'wort', volk_wort(volk), 'anzahl', nl) else null end,
    'taten', taten, 'krisen', krisen, 'wege', json_build_array(w1, w2, w3), 'kandidat', w1 or w2 or w3);
end $$;

-- Wahl: Namensfiguren und Namenlose stimmen ab
create or replace function public.amt_wahl(p_run public.quest_runs) returns void language plpgsql security definer set search_path = public as $$
declare v bigint; a dorf_amt; gid bigint; gname text; bonus int := 0; ans int; ja int := 0; nein int := 0; st jsonb := '[]'; n record; p numeric; fl jsonb; volk numeric;
begin
  select id into v from villages where owner_id = p_run.player_id; if v is null then return; end if;
  a := amt_init(v);
  select flags into fl from quest_runs where id = p_run.id;
  gid := coalesce((p_run.rollen->'V'->>'id')::bigint, a.vorsteher_npc); select name into gname from npcs where id = gid;
  bonus := (case when fl ? 'stimme_a' then 2 else 0 end) + (case when fl ? 'stimme_b' then 3 else 0 end) + (case when fl ? 'stimme_c' then 2 else 0 end)
         + (case when fl ? 'rede_gut' then 4 else 0 end) + (case when fl ? 'rede_ehrlich' then 2 else 0 end) + (case when fl ? 'rede_demut' then 2 else 0 end)
         - (case when fl ? 'rede_angriff' then 4 else 0 end) - (case when fl ? 'rede_holprig' then 1 else 0 end);
  select ansehen into ans from profiles where id = p_run.player_id;
  volk := coalesce(volk_gunst(p_run.player_id, v), 20);
  for n in select x.id, x.name, x.namenlos, coalesce(r.sympathy, case when x.namenlos then 10 else 0 end) sym from npcs x
      left join npc_relations r on r.npc_id = x.id and r.player_id = p_run.player_id where x.village_id = v and x.tot_at is null loop
    if n.id = gid then nein := nein + 1; st := st || jsonb_build_object('name', n.name, 'fuer', 'gegner'); continue; end if;
    p := greatest(0.08, least(0.95, 0.38 + n.sym / 100.0 * 0.7 + case when n.namenlos then (volk - 40) / 400.0 else 0 end + (ans - 100) / 900.0 + bonus * 0.03));
    if random() < p then ja := ja + 1; st := st || jsonb_build_object('name', case when n.namenlos then npc_label(n.id) else n.name end, 'fuer', 'du');
    else nein := nein + 1; st := st || jsonb_build_object('name', case when n.namenlos then npc_label(n.id) else n.name end, 'fuer', 'gegner'); end if;
  end loop;
  insert into dorf_wahlen (village_id, player_id, gegner_npc, gegner_name, status, ja, nein, stimmen)
    values (v, p_run.player_id, gid, gname, case when ja > nein then 'gewaehlt' else 'verloren' end, ja, nein, st);
  if ja > nein then
    perform eco_log(v, 'amt', 'Die Bürgerversammlung hat ' || (select character_name from profiles where id = p_run.player_id) || ' mit ' || ja || ' zu ' || nein || ' Stimmen zum Dorfmeister gewählt.', null, now());
  else
    update dorf_amt set wahl_ab = now() + interval '4 days' where village_id = v;
    perform eco_log(v, 'amt', coalesce(gname, 'Der Vorsteher') || ' bleibt Vorsteher. Die Versammlung stimmte ' || nein || ' zu ' || ja || '.', gid, now());
  end if;
end $$;

/* ---------- Client-RPCs ---------- */
create or replace function public.krise_hilfe_info(p_vorlage text) returns json language sql immutable as $$
  select case p_vorlage
    when 'fieber' then json_build_object('spiel', 'kraeuter', 'text', 'Kräuter für die Kranken sammeln')
    when 'scheunenbrand' then json_build_object('spiel', 'timing', 'text', 'In die Eimerkette')
    when 'woelfe' then json_build_object('spiel', 'bogen', 'text', 'Mit den Jägern ziehen')
    when 'duerre' then json_build_object('spiel', 'merken', 'text', 'Das Wasser einteilen')
    when 'sturm' then json_build_object('spiel', 'hammer', 'text', 'Dächer flicken')
    when 'fluechtlinge' then json_build_object('spiel', 'bestellung', 'text', 'Den Fremden ein Lager richten')
    else json_build_object('spiel', 'timing', 'text', 'Mit anpacken') end;
$$;

create or replace function public.krise_helfen(p_ereignis bigint, p_erfolg boolean) returns json language plpgsql security definer set search_path = public as $$
declare v villages; e dorf_ereignisse; t dorf_vorlagen; txt text; vn text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid();
  select * into e from dorf_ereignisse where id = p_ereignis and village_id = v.id for update;
  if e.id is null or e.status <> 'offen' then return json_build_object('ok', false, 'grund', 'Die Sache ist schon entschieden.'); end if;
  select * into t from dorf_vorlagen where id = e.vorlage;
  if t.art <> 'krise' then return json_build_object('ok', false, 'grund', 'Hier kannst du nicht helfen.'); end if;
  if amt_ist_meister(auth.uid(), v.id) then return json_build_object('ok', false, 'grund', 'Als Dorfmeister entscheidest du am Brett.'); end if;
  if e.geholfen ? auth.uid()::text then return json_build_object('ok', false, 'grund', 'Du hast schon geholfen.'); end if;
  update dorf_ereignisse set geholfen = geholfen || jsonb_build_object(auth.uid()::text, p_erfolg) where id = e.id;
  if p_erfolg then
    txt := amt_apply(e.id, t.auto, 'hilfe', auth.uid());
    insert into dorf_taten (player_id, village_id, art, titel) values (auth.uid(), v.id, 'krise', t.titel);
    perform ansehen_add(auth.uid(), 8, 'Krise abgewendet: ' || t.titel);
    return json_build_object('ok', true, 'erfolg', true, 'text', txt);
  end if;
  perform ansehen_add(auth.uid(), 2, 'Bei der Krise geholfen: ' || t.titel);
  select name into vn from npcs where id = (select vorsteher_npc from amt_init(v.id));
  return json_build_object('ok', true, 'erfolg', false, 'text', 'Du hast getan, was du konntest. Ganz abwenden ließ es sich nicht – ' || coalesce(vn, 'der Vorsteher') || ' wird entscheiden, wie es weitergeht.');
end $$;

create or replace function public.amt_lagerfeuer(p_ja boolean) returns json language plpgsql security definer set search_path = public as $$
declare v villages; me text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); perform amt_init(v.id);
  if p_ja then
    update dorf_amt set lagerfeuer_at = now() where village_id = v.id;
    select character_name into me from profiles where id = auth.uid();
    perform eco_log(v.id, 'amt', 'Am Lagerfeuer wurde ' || coalesce(me, 'jemand') || ' als Dorfmeister vorgeschlagen – und hat angenommen. Es soll eine Versammlung geben.', null, now());
    return json_build_object('ok', true, 'text', 'Die Leute jubeln. Bald soll es eine Versammlung geben.');
  end if;
  update dorf_amt set lagerfeuer_nein = now() where village_id = v.id;
  return json_build_object('ok', true, 'text', 'Du lehnst dankend ab. Die Leute nicken – das Angebot steht.');
end $$;

create or replace function public.amt_status() returns json language plpgsql security definer set search_path = public as $$
declare v villages; a dorf_amt; prof profiles; kap quest_templates; runid bigint; frei boolean; grund text; w dorf_wahlen; vname text; weg json; meister boolean; lf json;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); if v.id is null then return null; end if;
  perform amt_tick(v.id);
  a := amt_init(v.id); select * into prof from profiles where id = auth.uid(); select name into vname from npcs where id = a.vorsteher_npc;
  meister := a.meister_typ = 'spieler' and a.meister_player = auth.uid();
  weg := amt_weg(auth.uid(), v.id);
  select * into kap from quest_templates where art = 'chronik' and schwierigkeit = a.kapitel;
  select q.id into runid from quest_runs q join quest_templates t on t.id = q.quest_id where q.player_id = auth.uid() and q.status = 'laeuft' and t.art = 'chronik' order by q.id desc limit 1;
  frei := kap.id is not null; grund := null;
  if kap.id is not null and a.kapitel = 3 and runid is null then
    if a.meister_typ = 'spieler' then frei := false; grund := 'Du bist bereits Dorfmeister.';
    elsif not (weg->>'kandidat')::boolean then frei := false; grund := 'Noch hat dich niemand als Anführer vorgeschlagen. Dafür musst du dem Dorf erst zeigen, wer du bist.';
    elsif a.lagerfeuer_at is null then frei := false; grund := 'Am Lagerfeuer wollen dich die Leute vorschlagen. Nimmst du an?';
    elsif a.wahl_ab is not null and a.wahl_ab > now() then frei := false; grund := 'Die nächste Versammlung ist frühestens am ' || to_char(a.wahl_ab at time zone 'Europe/Berlin', 'DD.MM. "um" HH24:MI') || ' Uhr.';
    end if;
  end if;
  if kap.id is not null and runid is null and exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.status = 'laeuft' and not q_nebenbei(q.quest_id)) then frei := false; grund := coalesce(grund, 'Erst das laufende Abenteuer beenden.'); end if;
  if not meister and a.kapitel = 3 and (weg->>'kandidat')::boolean and a.lagerfeuer_at is null then
    select json_build_object('neu', a.lagerfeuer_nein is null,
      'redner', (select json_build_object('name', x.name, 'beruf', x.job, 'look', x.look) from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = auth.uid()
                 where x.village_id = v.id and not x.namenlos and x.tot_at is null and x.id <> coalesce(a.vorsteher_npc, 0) order by coalesce(r.sympathy, 0) desc limit 1),
      'zweiter', (select x.name from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = auth.uid()
                 where x.village_id = v.id and not x.namenlos and x.tot_at is null and x.id <> coalesce(a.vorsteher_npc, 0) order by coalesce(r.sympathy, 0) desc offset 1 limit 1),
      'vorsteher', vname, 'volk', weg->'volk', 'wege', weg->'wege', 'taten', weg->'taten', 'krisen', weg->'krisen') into lf;
  end if;
  select * into w from dorf_wahlen where village_id = v.id and player_id = auth.uid() order by id desc limit 1;
  return json_build_object(
    'ansehen', json_build_object('wort', ansehen_wort(prof.ansehen), 'stufe', least(4, case when prof.ansehen >= 160 then 4 when prof.ansehen >= 120 then 3 when prof.ansehen >= 70 then 2 when prof.ansehen >= 30 then 1 else 0 end),
      'anteil', least(1.0, prof.ansehen / 160.0), 'kandidat', (weg->>'kandidat')::boolean,
      'zuletzt', (select coalesce(json_agg(json_build_object('delta', l.delta, 'grund', l.grund) order by l.at desc), '[]'::json) from (select * from ansehen_log where player_id = auth.uid() order by at desc limit 5) l)),
    'weg', weg, 'lagerfeuer', lf,
    'kapitel', a.kapitel,
    'chronik', case when kap.id is null then null else json_build_object('id', kap.id, 'kapitel', a.kapitel, 'titel', kap.titel, 'kurz', amt_text(kap.kurz, jsonb_build_object('V', jsonb_build_object('name', coalesce(vname, 'Der Vorsteher'))), '{}'), 'run', runid, 'frei', frei, 'grund', grund,
      'erledigt', exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.quest_id = kap.id and q.status = 'fertig')) end,
    'amt', json_build_object('typ', a.meister_typ, 'ich', meister, 'vorsteher', vname, 'vorsteher_id', a.vorsteher_npc, 'fokus', a.fokus, 'seit', a.seit,
      'leistung', case when a.meister_typ = 'spieler' then 100 else 50 end, 'gunst', gunst_wort(a.koenig_gunst), 'koenig', 'König Ottokar'),
    'wahl', case when w.id is null then null else json_build_object('id', w.id, 'status', w.status, 'ja', w.ja, 'nein', w.nein, 'gegner', w.gegner_name, 'gesehen', w.gesehen, 'stimmen', w.stimmen) end,
    'offen', (select coalesce(json_agg(json_build_object('id', e.id, 'art', t.art, 'titel', t.titel, 'text', amt_text(t.text, e.rollen, e.daten), 'frist', e.frist,
        'optionen', (select json_agg(amt_text(o->>'text', e.rollen, e.daten)) from jsonb_array_elements(t.optionen) o)) order by e.created_at), '[]'::json)
      from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage where e.village_id = v.id and e.status = 'offen' and meister),
    'krisen', (select coalesce(json_agg(json_build_object('id', e.id, 'titel', t.titel, 'text', amt_text(t.text, e.rollen, e.daten), 'frist', e.frist, 'hilfe', krise_hilfe_info(t.id),
        'geholfen', e.geholfen ? auth.uid()::text) order by e.created_at), '[]'::json)
      from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage where e.village_id = v.id and e.status = 'offen' and t.art = 'krise' and not meister),
    'aushaenge', (select coalesce(json_agg(x order by x->>'am' desc), '[]'::json) from (select json_build_object('id', e.id, 'art', t.art, 'titel', t.titel, 'text', amt_text(t.text, e.rollen, e.daten), 'ergebnis', e.ergebnis, 'von', e.von,
        'wahl', amt_text(t.optionen->(e.wahl)->>'text', e.rollen, e.daten), 'am', e.entschieden_at) x
      from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage where e.village_id = v.id and e.status = 'entschieden' order by e.entschieden_at desc limit 4) s),
    'trauer', (select coalesce(json_agg(json_build_object('text', l.text, 'am', l.at) order by l.at desc), '[]'::json)
      from (select * from village_log where village_id = v.id and art = 'tod' and at > now() - interval '7 days' order by at desc limit 5) l)
  );
end $$;

/* ---------- Bestehende Dörfer: auf 3 Namensfiguren kürzen ---------- */
do $$
declare v record; keep bigint[]; firstn bigint; w text[];
begin
  for v in select id, owner_id from villages where owner_id is not null loop
    if (select count(*) from npcs where village_id = v.id and not namenlos) <= 3 then continue; end if;
    select array_agg(id) into keep from (
      select n.id from npcs n left join npc_relations r on r.npc_id = n.id and r.player_id = v.owner_id
      where n.village_id = v.id and not n.namenlos
      order by coalesce(r.sympathy, 0) + coalesce(r.loyalty, 0) / 3.0 + 8 * (select count(*) from npc_memories m where m.npc_id = n.id and m.player_id = v.owner_id) desc, n.id limit 3) s;
    -- Wissen der künftig Namenlosen geht an die erste Namensfigur über, damit keine Geschichte verschlossen bleibt
    firstn := keep[1];
    select array_agg(distinct x) into w from npc_profiles p, unnest(coalesce(p.wissen, '{}')) x where p.npc_id in (select id from npcs where village_id = v.id and not (id = any(keep)));
    if w is not null and firstn is not null then
      update npc_profiles set wissen = (select array_agg(distinct y) from unnest(coalesce(wissen, '{}') || w) y) where npc_id = firstn;
      if not found then begin insert into npc_profiles (npc_id, wissen) values (firstn, w); exception when others then null; end; end if;
    end if;
    update npcs set namenlos = true where village_id = v.id and not (id = any(keep));
    perform amt_init(v.id);
  end loop;
end $$;

revoke execute on function public.npc_label(bigint, boolean), public.npc_namen_cap(bigint), public.volk_gunst(uuid, bigint), public.npc_neu_namenlos(bigint, text),
  public.npc_tot(bigint, text), public.npc_erkrankt(bigint, text, double precision), public.krieg_verluste(bigint, numeric, int, text), public.krise_folgen(bigint, int, numeric),
  public.amt_weg(uuid, bigint) from public, anon, authenticated;
revoke execute on function public.krise_helfen(bigint, boolean), public.amt_lagerfeuer(boolean) from public, anon;
grant execute on function public.krise_helfen(bigint, boolean), public.amt_lagerfeuer(boolean) to authenticated;
