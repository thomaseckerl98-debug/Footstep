-- Migration 008: Kontext und Kontingent für freie Gespräche mit KI-Unterstützung (Edge Function npc-talk).
-- Die KI formuliert nur; Wirkungen laufen weiter über talk_to_npc / talk_check / add_journal.
create table if not exists public.ai_usage (
  player_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  calls int not null default 0,
  last_at timestamptz not null default now(),
  primary key (player_id, day)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- Höchstens 60 KI-Antworten pro Spieler und Tag, mindestens 3 Sekunden Abstand
create or replace function public.ai_take_quota()
returns json language plpgsql security definer set search_path = public as $$
declare u record; d date := (now() at time zone 'utc')::date;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  insert into ai_usage (player_id, day, calls, last_at) values (auth.uid(), d, 0, now() - interval '1 minute') on conflict do nothing;
  select * into u from ai_usage where player_id = auth.uid() and day = d for update;
  if u.calls >= 60 then return json_build_object('ok', false, 'grund', 'tageslimit'); end if;
  if u.last_at > now() - interval '3 seconds' then return json_build_object('ok', false, 'grund', 'zu_schnell'); end if;
  update ai_usage set calls = calls + 1, last_at = now() where player_id = auth.uid() and day = d;
  return json_build_object('ok', true, 'rest', 59 - u.calls);
end;
$$;
revoke execute on function public.ai_take_quota() from public, anon;
grant execute on function public.ai_take_quota() to authenticated;

create or replace function public.get_npc_context(p_npc bigint)
returns json language plpgsql stable security definer set search_path = public as $$
declare n record; v_uid uuid := auth.uid(); s int;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  select * into n from npcs where id = p_npc;
  if not found then raise exception 'Unbekannte Person'; end if;
  if n.village_id is not null and not exists (select 1 from villages where id = n.village_id and owner_id = v_uid) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  select sympathy into s from npc_relations where npc_id = p_npc and player_id = v_uid;
  return json_build_object(
    'npc', json_build_object('name', n.name, 'beruf', n.job, 'wesen', npc_wesen(n.traits), 'stimmung', npc_stimmung(coalesce(s, 0)), 'kennt_dich', s is not null),
    'erinnerungen', (select coalesce(json_agg(m.text), '[]'::json) from (select text from npc_memories where npc_id = p_npc and player_id = v_uid and kind = 'gespraech' order by created_at desc limit 6) m),
    'held', (select json_build_object('name', p.character_name, 'volk', coalesce(p.race, 'mensch'), 'herkunft', coalesce(p.herkunft, 'waldlaeufer'), 'eigenschaften', char_attrs(p.race, coalesce(p.herkunft, 'waldlaeufer'))) from profiles p where p.id = v_uid),
    'tagebuch', (select coalesce(json_agg(j.title), '[]'::json) from (select title from player_journal where player_id = v_uid order by created_at desc limit 12) j),
    'freunde', (select coalesce(json_agg(o.name), '[]'::json) from (select x.name from npc_bonds b join npcs x on x.id = case when b.npc_a = p_npc then b.npc_b else b.npc_a end where (b.npc_a = p_npc or b.npc_b = p_npc) and b.sympathy >= 40 limit 3) o)
  );
end;
$$;
revoke execute on function public.get_npc_context(bigint) from public, anon;
grant execute on function public.get_npc_context(bigint) to authenticated;
