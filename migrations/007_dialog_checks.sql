-- Migration 007: Herkunft + Eigenschaften, Fertigkeitsproben im Gespräch (W20), Gesprächs-ID, Tagebuch (Gerüchte/Aufträge).
alter table public.npc_memories add column if not exists conv text;

-- Eigenschaften (1–6) aus Volk und Herkunft, serverseitig berechnet
create or replace function public.char_attrs(p_race text, p_herkunft text)
returns jsonb language sql immutable set search_path = public as $$
  with base as (
    select case coalesce(p_herkunft, 'waldlaeufer')
      when 'krieger'   then '{"staerke":4,"geschick":2,"sinne":1,"charme":1,"wissen":1,"wille":3}'::jsonb
      when 'haendler'  then '{"staerke":1,"geschick":2,"sinne":2,"charme":4,"wissen":2,"wille":1}'::jsonb
      when 'gelehrter' then '{"staerke":1,"geschick":1,"sinne":2,"charme":2,"wissen":4,"wille":2}'::jsonb
      when 'heiler'    then '{"staerke":1,"geschick":1,"sinne":2,"charme":2,"wissen":3,"wille":3}'::jsonb
      when 'schurke'   then '{"staerke":1,"geschick":4,"sinne":3,"charme":2,"wissen":1,"wille":1}'::jsonb
      else                  '{"staerke":2,"geschick":3,"sinne":3,"charme":1,"wissen":1,"wille":2}'::jsonb end as b
  ), mods as (
    select case coalesce(p_race, 'mensch')
      when 'elf'      then '{"geschick":1,"sinne":2,"staerke":-1}'::jsonb
      when 'zwerg'    then '{"staerke":2,"wille":1,"geschick":-1}'::jsonb
      when 'halbling' then '{"geschick":1,"charme":1,"staerke":-1}'::jsonb
      else                 '{"charme":1,"wille":1}'::jsonb end as m
  )
  select jsonb_object_agg(k, greatest(1, least(6, (b->>k)::int + coalesce((m->>k)::int, 0))))
  from base, mods, unnest(array['staerke','geschick','sinne','charme','wissen','wille']) k;
$$;

alter table public.profiles add column if not exists herkunft text check (herkunft in ('waldlaeufer','krieger','haendler','gelehrter','heiler','schurke'));

create or replace function public.get_my_character()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('name', p.character_name, 'race', p.race, 'herkunft', coalesce(p.herkunft, 'waldlaeufer'), 'look', p.look,
                           'attrs', char_attrs(p.race, coalesce(p.herkunft, 'waldlaeufer')))
  from profiles p where p.id = auth.uid();
$$;
revoke execute on function public.get_my_character() from public, anon;
grant execute on function public.get_my_character() to authenticated;

create or replace function public.save_character(p_look jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_look is null or jsonb_typeof(p_look) <> 'object' then raise exception 'Ungültige Auswahl'; end if;
  for k in select jsonb_object_keys(p_look) loop
    if k <> all (array['race', 'face', 'skin', 'hair', 'hairStyle', 'beard', 'eyes', 'cloak', 'herkunft']) then raise exception 'Unbekanntes Merkmal: %', k; end if;
  end loop;
  if coalesce(p_look->>'race', '') <> all (array['mensch', 'elf', 'zwerg', 'halbling']) then raise exception 'Ungültiges Volk'; end if;
  if coalesce(p_look->>'herkunft', 'waldlaeufer') <> all (array['waldlaeufer','krieger','haendler','gelehrter','heiler','schurke']) then raise exception 'Ungültige Herkunft'; end if;
  if coalesce(p_look->>'face', '') <> all (array['kantig', 'rund', 'schmal']) then raise exception 'Ungültiges Gesicht'; end if;
  if coalesce(p_look->>'skin', '') !~ '^[0-7]$' then raise exception 'Ungültige Hautfarbe'; end if;
  if coalesce(p_look->>'hair', '') <> all (array['schwarz', 'dunkel', 'braun', 'kupfer', 'rot', 'blond', 'hellblond', 'asch', 'grau', 'weiss']) then raise exception 'Ungültige Haarfarbe'; end if;
  if coalesce(p_look->>'hairStyle', '') <> all (array['kurz', 'lang', 'zopf', 'dutt', 'locken', 'wild', 'glatze']) then raise exception 'Ungültige Frisur'; end if;
  if coalesce(p_look->>'beard', '') <> all (array['keiner', 'stoppel', 'kurz', 'lang', 'schnurr', 'zopfbart']) then raise exception 'Ungültiger Bart'; end if;
  if coalesce(p_look->>'eyes', '') <> all (array['braun', 'hasel', 'gruen', 'blau', 'grau', 'bernstein']) then raise exception 'Ungültige Augenfarbe'; end if;
  if coalesce(p_look->>'cloak', '') <> all (array['wald', 'nacht', 'wein', 'erde', 'stein', 'ocker']) then raise exception 'Ungültige Umhangfarbe'; end if;
  update profiles
     set race = p_look->>'race', herkunft = coalesce(p_look->>'herkunft', 'waldlaeufer'),
         look = jsonb_build_object('race', p_look->>'race', 'herkunft', coalesce(p_look->>'herkunft', 'waldlaeufer'), 'face', p_look->>'face', 'skin', (p_look->>'skin')::int,
                                   'hair', p_look->>'hair', 'hairStyle', p_look->>'hairStyle', 'beard', p_look->>'beard', 'eyes', p_look->>'eyes', 'cloak', p_look->>'cloak')
   where id = auth.uid();
  return get_my_character();
end;
$$;
revoke execute on function public.save_character(jsonb) from public, anon;
grant execute on function public.save_character(jsonb) to authenticated;

-- Gespräch: Abklingzeit gilt nur zwischen verschiedenen Gesprächen; pro Gespräch höchstens +8 Sympathie
-- alte 3-Parameter-Version bleibt vorerst bestehen (Client ruft immer mit p_conv auf)
create or replace function public.talk_to_npc(p_npc bigint, p_tone text, p_topic text default 'alltag', p_conv text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); n record; r record; t jsonb; d int; recent boolean; gained int; react text; mem text; s int; l int;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  if p_tone is null or p_tone <> all (array['freundlich', 'loben', 'scherzen', 'helfen', 'fragen', 'kritisieren']) then raise exception 'Ungültiger Ton'; end if;
  if p_topic is null or p_topic <> all (array['alltag', 'arbeit', 'wetter', 'dorf', 'freunde', 'sorgen', 'geruechte']) then p_topic := 'alltag'; end if;
  if p_conv is not null and length(p_conv) > 40 then raise exception 'Ungültig'; end if;
  select * into n from npcs where id = p_npc;
  if not found then raise exception 'Unbekannte Person'; end if;
  if n.village_id is not null and not exists (select 1 from villages where id = n.village_id and owner_id = v_uid) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  t := n.traits;
  insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (p_npc, v_uid, 0, 0) on conflict do nothing;
  select * into r from npc_relations where npc_id = p_npc and player_id = v_uid for update;
  select exists (select 1 from npc_memories where npc_id = p_npc and player_id = v_uid and kind in ('gespraech', 'probe') and created_at > now() - interval '20 minutes' and conv is distinct from p_conv) into recent;
  select coalesce(sum(greatest(sympathy_delta, 0)), 0) into gained from npc_memories where npc_id = p_npc and player_id = v_uid and p_conv is not null and conv = p_conv;
  d := case p_tone
    when 'freundlich' then 2
    when 'loben' then case when coalesce((t->>'fleiss')::int, 50) >= 55 then 4 else 2 end
    when 'scherzen' then case when coalesce((t->>'geselligkeit')::int, 50) >= 50 then 4 when coalesce((t->>'geselligkeit')::int, 50) <= 25 then -3 else 1 end
    when 'helfen' then case when coalesce((t->>'mut')::int, 50) >= 75 then 0 else 5 end
    when 'fragen' then case when coalesce((t->>'geselligkeit')::int, 50) >= 60 then 3 when coalesce((t->>'geselligkeit')::int, 50) <= 25 then -1 else 1 end
    else case when coalesce((t->>'fleiss')::int, 50) >= 70 then -1 when coalesce((t->>'mut')::int, 50) >= 70 then -6 else -4 end
  end + floor(random() * 3)::int - 1;
  if r.sympathy < -40 and d > 0 then d := greatest(0, d - 2); end if;
  if (recent or gained >= 8) and d > 0 then d := 0; end if;
  s := greatest(-100, least(100, r.sympathy + d));
  l := greatest(0, least(100, r.loyalty + case when d >= 4 then 1 when d <= -4 then -1 else 0 end));
  update npc_relations set sympathy = s, loyalty = l, updated_at = now() where npc_id = p_npc and player_id = v_uid;
  react := case when recent and d >= 0 then 'kurz' when d >= 3 then 'erfreut' when d >= 1 then 'freundlich' when d = 0 then 'neutral' when d >= -3 then 'kuehl' else 'veraergert' end;
  mem := case p_tone
    when 'loben' then 'Du hast mich gelobt.'
    when 'scherzen' then case when d > 0 then 'Wir haben zusammen gelacht.' else 'Dein Scherz kam nicht gut an.' end
    when 'helfen' then case when d > 2 then 'Du hast mir deine Hilfe angeboten.' else 'Du wolltest mir helfen – als ob ich das nötig hätte.' end
    when 'kritisieren' then 'Du hast meine Arbeit kritisiert.'
    when 'fragen' then 'Du hast dich nach mir erkundigt.'
    else 'Wir haben uns nett unterhalten.' end;
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta, conv) values (p_npc, v_uid, 'gespraech', mem, d, p_conv);
  return json_build_object('reaktion', react, 'stimmung', npc_stimmung(s), 'erinnerung', mem);
end;
$$;
revoke execute on function public.talk_to_npc(bigint, text, text, text) from public, anon;
grant execute on function public.talk_to_npc(bigint, text, text, text) to authenticated;

-- Fertigkeitsprobe im Gespräch: W20 + (Eigenschaft − 2) + 2 bei passender Herkunft gegen Schwierigkeit
create or replace function public.talk_check(p_npc bigint, p_check text, p_conv text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); n record; r record; me record; t jsonb; a jsonb; skill text; dc int; fav text; roll int; md int; bonus int; ok boolean; d int; s int; recent boolean; react text; mem text;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  select x.skill, x.dc, x.fav into skill, dc, fav from (values
    ('spuren', 'sinne', 12, 'waldlaeufer'), ('menschenkenntnis', 'sinne', 13, 'schurke'), ('ueberreden', 'charme', 13, 'haendler'),
    ('einschuechtern', 'staerke', 14, 'krieger'), ('altes_wissen', 'wissen', 12, 'gelehrter'), ('flink', 'geschick', 12, 'schurke'),
    ('beruhigen', 'wille', 12, 'heiler'), ('feilschen', 'charme', 14, 'haendler'), ('heilkunde', 'wissen', 11, 'heiler'), ('anpacken', 'staerke', 11, 'krieger')
  ) as x(id, skill, dc, fav) where x.id = p_check;
  if skill is null then raise exception 'Unbekannte Probe'; end if;
  select * into n from npcs where id = p_npc;
  if not found then raise exception 'Unbekannte Person'; end if;
  if n.village_id is not null and not exists (select 1 from villages where id = n.village_id and owner_id = v_uid) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  select race, coalesce(herkunft, 'waldlaeufer') as herkunft into me from profiles where id = v_uid;
  a := char_attrs(me.race, me.herkunft); t := n.traits;
  -- Wesen beeinflusst die Schwierigkeit
  if p_check in ('ueberreden', 'feilschen') and coalesce((t->>'geselligkeit')::int, 50) <= 30 then dc := dc + 2; end if;
  if p_check = 'einschuechtern' then dc := dc + case when coalesce((t->>'mut')::int, 50) >= 70 then 3 when coalesce((t->>'mut')::int, 50) <= 30 then -3 else 0 end; end if;
  if p_check = 'menschenkenntnis' and coalesce((t->>'geselligkeit')::int, 50) >= 70 then dc := dc - 2; end if;
  roll := 1 + floor(random() * 20)::int; md := (a->>skill)::int - 2; bonus := case when me.herkunft = fav then 2 else 0 end;
  ok := roll = 20 or (roll <> 1 and roll + md + bonus >= dc);
  insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (p_npc, v_uid, 0, 0) on conflict do nothing;
  select * into r from npc_relations where npc_id = p_npc and player_id = v_uid for update;
  select exists (select 1 from npc_memories where npc_id = p_npc and player_id = v_uid and kind = 'probe' and text like p_check || ':%' and created_at > now() - interval '20 minutes' and conv is distinct from p_conv) into recent;
  d := case when p_check = 'einschuechtern' then case when ok then -1 else -5 end when ok then 3 else -2 end;
  if recent and d > 0 then d := 0; end if;
  s := greatest(-100, least(100, r.sympathy + d));
  update npc_relations set sympathy = s, loyalty = greatest(0, least(100, loyalty + case when ok and d > 0 then 1 else 0 end)), updated_at = now() where npc_id = p_npc and player_id = v_uid;
  react := case when ok then case when d > 0 then 'erfreut' else 'neutral' end else case when d <= -4 then 'veraergert' else 'kuehl' end end;
  mem := p_check || ':' || case when ok then 'gelungen' else 'misslungen' end;
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta, conv) values (p_npc, v_uid, 'probe', mem, d, p_conv);
  return json_build_object('wurf', roll, 'mod', md, 'bonus', bonus, 'dc', dc, 'gesamt', roll + md + bonus, 'erfolg', ok, 'eigenschaft', skill, 'reaktion', react, 'stimmung', npc_stimmung(s));
end;
$$;
revoke execute on function public.talk_check(bigint, text, text) from public, anon;
grant execute on function public.talk_check(bigint, text, text) to authenticated;

-- Tagebuch: Gerüchte und Aufträge aus Gesprächen (Grundlage für spätere Quests)
create table if not exists public.player_journal (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('geruecht', 'auftrag', 'ereignis')),
  key text not null,
  title text not null check (length(title) <= 80),
  text text not null check (length(text) <= 600),
  source_npc bigint references public.npcs(id) on delete set null,
  status text not null default 'offen' check (status in ('offen', 'erledigt', 'verworfen')),
  created_at timestamptz not null default now(),
  unique (player_id, key)
);
create index if not exists player_journal_npc_idx on public.player_journal (source_npc);
alter table public.player_journal enable row level security;
revoke all on public.player_journal from anon, authenticated;

create or replace function public.add_journal(p_kind text, p_key text, p_title text, p_text text, p_npc bigint default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_key !~ '^[a-z0-9_]{2,40}$' then raise exception 'Ungültiger Schlüssel'; end if;
  insert into player_journal (player_id, kind, key, title, text, source_npc) values (auth.uid(), p_kind, p_key, left(p_title, 80), left(p_text, 600), p_npc)
  on conflict (player_id, key) do nothing;
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.add_journal(text, text, text, text, bigint) from public, anon;
grant execute on function public.add_journal(text, text, text, text, bigint) to authenticated;

create or replace function public.get_journal()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('kind', j.kind, 'key', j.key, 'title', j.title, 'text', j.text, 'status', j.status, 'npc', n.name, 'created_at', j.created_at) order by j.created_at desc), '[]'::json)
  from player_journal j left join npcs n on n.id = j.source_npc where j.player_id = auth.uid();
$$;
revoke execute on function public.get_journal() from public, anon;
grant execute on function public.get_journal() to authenticated;
