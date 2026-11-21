-- Migration 006: Gespräche mit Bewohnern. Wirkung wird serverseitig aus verdeckten Eigenschaften berechnet.
create or replace function public.npc_wesen(t jsonb)
returns text language sql immutable set search_path = public as $$
  select case
    when coalesce((t->>'geselligkeit')::int, 50) >= 70 then 'gesellig'
    when coalesce((t->>'geselligkeit')::int, 50) <= 25 then 'wortkarg'
    when coalesce((t->>'mut')::int, 50) >= 75 then 'stolz'
    when coalesce((t->>'mut')::int, 50) <= 20 then 'ängstlich'
    when coalesce((t->>'gier')::int, 50) >= 75 then 'geschäftstüchtig'
    when coalesce((t->>'fleiss')::int, 50) >= 72 then 'fleißig'
    when coalesce((t->>'fleiss')::int, 50) <= 22 then 'gemütlich'
    when coalesce((t->>'treue')::int, 50) >= 75 then 'treu'
    else 'bodenständig' end;
$$;

create or replace function public.npc_stimmung(s int)
returns text language sql immutable set search_path = public as $$
  select case when s is null then 'fremd' when s < -60 then 'feindselig' when s < -20 then 'misstrauisch'
              when s < 10 then 'zurückhaltend' when s < 40 then 'freundlich' when s < 70 then 'herzlich' else 'treu ergeben' end;
$$;

create or replace function public.get_my_residents()
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'residents', coalesce((
      select json_agg(json_build_object(
        'id', n.id, 'name', n.name, 'job', n.job, 'look', n.look, 'home_plot', n.home_plot,
        'stimmung', npc_stimmung(r.sympathy), 'wesen', npc_wesen(n.traits),
        'freund', (select case when b.npc_a = n.id then b.npc_b else b.npc_a end from npc_bonds b
                   where (b.npc_a = n.id or b.npc_b = n.id) and b.sympathy >= 30 order by b.sympathy desc limit 1),
        'erinnerung', (select m.text from npc_memories m where m.npc_id = n.id and m.player_id = auth.uid() order by m.created_at desc limit 1)
      ) order by n.id)
      from npcs n join villages v on v.id = n.village_id
      left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid()
      where v.owner_id = auth.uid()), '[]'::json),
    'wanderer', coalesce((
      select json_agg(json_build_object('id', w.id, 'name', w.name, 'job', w.job, 'look', w.look, 'wesen', npc_wesen(w.traits), 'stimmung', npc_stimmung(w.sympathy)))
      from (select n.id, n.name, n.job, n.look, n.traits, r.sympathy from npcs n
            left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid()
            where n.village_id is null and n.travel_to is null order by random() limit 3) w), '[]'::json)
  );
$$;
revoke execute on function public.get_my_residents() from public, anon;
grant execute on function public.get_my_residents() to authenticated;

create or replace function public.talk_to_npc(p_npc bigint, p_tone text, p_topic text default 'alltag')
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); n record; r record; t jsonb; d int; recent boolean; react text; mem text; s int; l int;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  if p_tone is null or p_tone <> all (array['freundlich', 'loben', 'scherzen', 'helfen', 'fragen', 'kritisieren']) then raise exception 'Ungültiger Ton'; end if;
  if p_topic is null or p_topic <> all (array['alltag', 'arbeit', 'wetter', 'dorf', 'freunde', 'sorgen', 'geruechte']) then p_topic := 'alltag'; end if;
  select * into n from npcs where id = p_npc;
  if not found then raise exception 'Unbekannte Person'; end if;
  if n.village_id is not null and not exists (select 1 from villages where id = n.village_id and owner_id = v_uid) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  t := n.traits;
  insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (p_npc, v_uid, 0, 0) on conflict do nothing;
  select * into r from npc_relations where npc_id = p_npc and player_id = v_uid for update;
  select exists (select 1 from npc_memories where npc_id = p_npc and player_id = v_uid and kind = 'gespraech' and created_at > now() - interval '20 minutes') into recent;
  d := case p_tone
    when 'freundlich' then 2
    when 'loben' then case when coalesce((t->>'fleiss')::int, 50) >= 55 then 4 else 2 end
    when 'scherzen' then case when coalesce((t->>'geselligkeit')::int, 50) >= 50 then 4 when coalesce((t->>'geselligkeit')::int, 50) <= 25 then -3 else 1 end
    when 'helfen' then case when coalesce((t->>'mut')::int, 50) >= 75 then 0 else 5 end
    when 'fragen' then case when coalesce((t->>'geselligkeit')::int, 50) >= 60 then 3 when coalesce((t->>'geselligkeit')::int, 50) <= 25 then -1 else 1 end
    else case when coalesce((t->>'fleiss')::int, 50) >= 70 then -1 when coalesce((t->>'mut')::int, 50) >= 70 then -6 else -4 end
  end + floor(random() * 3)::int - 1;
  if r.sympathy < -40 and d > 0 then d := greatest(0, d - 2); end if;
  if recent and d > 0 then d := 0; end if;
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
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (p_npc, v_uid, 'gespraech', mem, d);
  return json_build_object('reaktion', react, 'stimmung', npc_stimmung(s), 'erinnerung', mem);
end;
$$;
revoke execute on function public.talk_to_npc(bigint, text, text) from public, anon;
grant execute on function public.talk_to_npc(bigint, text, text) to authenticated;
