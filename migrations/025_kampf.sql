-- Migration 025: Horde-Kämpfe. Kampfszenen in Quests (minispiel.art = 'kampf') und Kampfwerte für dauerhafte Boni.

-- quest_view: Kampf-Parameter an den Client geben (Antworten/Folgen bleiben verborgen)
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.quest_view(bigint)'::regprocedure);
  if position('''gegner''' in d) = 0 then
    d := replace(d, $r$'text', q_fill(sz->'minispiel'->>'text', ctx)) end,$r$,
      $r$'text', q_fill(sz->'minispiel'->>'text', ctx), 'dauer', (sz->'minispiel'->>'dauer')::int, 'gegner', sz->'minispiel'->>'gegner', 'kampfort', sz->'minispiel'->>'kampfort', 'boss', sz->'minispiel'->>'boss') end,$r$);
    if position('''gegner''' in d) = 0 then raise exception 'quest_view: Muster nicht gefunden'; end if;
    execute d;
  end if;
end $do$;

-- Dauerhafte Stärken für Kämpfe: Eigenschaften, Gegenstände, Ausrüstung, Dorfgebäude, vertraute Bewohner als Helfer
create or replace function public.kampf_werte() returns json
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); v villages; st jsonb; bauten jsonb := '{}'::jsonb; x jsonb; lv int;
begin
  if uid is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = uid order by id limit 1;
  if v.id is not null then
    select stufen into st from village_eco where village_id = v.id;
    for x in select * from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) loop
      lv := coalesce((st->>(x->>1))::int, 1);
      bauten := bauten || jsonb_build_object(x->>0, greatest(lv, coalesce((bauten->>(x->>0))::int, 0)));
    end loop;
  end if;
  return json_build_object(
    'attrs', (select char_attrs(p.race, coalesce(p.herkunft, 'waldlaeufer')) from profiles p where p.id = uid),
    'ausruestung', (select coalesce(json_agg(item_id), '[]'::json) from player_items where player_id = uid and menge > 0),
    'gear', (select coalesce(json_agg(seltenheit), '[]'::json) from player_gear where player_id = uid and status = 'besitz'),
    'bauten', bauten,
    'helfer', (select coalesce(json_agg(json_build_object('id', n.id, 'name', n.name, 'beruf', n.job, 'look', n.look) order by r.sympathy desc), '[]'::json)
               from (select * from npc_relations where player_id = uid and sympathy >= 30 order by sympathy desc limit 2) r
               join npcs n on n.id = r.npc_id where v.id is not null and n.village_id = v.id));
end $$;
revoke all on function public.kampf_werte() from public, anon;
grant execute on function public.kampf_werte() to authenticated;
