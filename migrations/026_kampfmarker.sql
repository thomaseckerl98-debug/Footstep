-- Migration 026: Quests mit Kampf kennzeichnen (Dauer des längsten Kampfes in Minuten)
create or replace function public.q_kampf(d jsonb) returns int language sql immutable set search_path = public as $$
  select ceil(max((s.value->'minispiel'->>'dauer')::numeric) / 60)::int
  from jsonb_each(coalesce(d->'szenen', '{}'::jsonb)) s where s.value->'minispiel'->>'art' = 'kampf';
$$;

do $do$
declare d text;
begin
  -- Brett: Kampf-Minuten je Angebot
  d := pg_get_functiondef('public.quest_board()'::regprocedure);
  if position('''kampf''' in d) = 0 then
    d := replace(d, $r$'schwierigkeit', tp.schwierigkeit,$r$, $r$'schwierigkeit', tp.schwierigkeit, 'kampf', q_kampf(tp.def),$r$);
    if position('''kampf''' in d) = 0 then raise exception 'quest_board: Muster nicht gefunden'; end if;
    execute d;
  end if;
  -- Questfenster: Kampf-Minuten der ganzen Quest
  d := pg_get_functiondef('public.quest_view(bigint)'::regprocedure);
  if position('''kampf_quest''' in d) = 0 then
    d := replace(d, $r$'quest', t.titel,$r$, $r$'quest', t.titel, 'kampf_quest', q_kampf(t.def),$r$);
    if position('''kampf_quest''' in d) = 0 then raise exception 'quest_view: Muster nicht gefunden'; end if;
    execute d;
  end if;
end $do$;
