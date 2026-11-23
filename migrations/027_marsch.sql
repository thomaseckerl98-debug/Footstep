-- Migration 027: Kampf-Modus (z. B. 'marsch' = von links nach rechts durchschlagen) an den Client geben
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.quest_view(bigint)'::regprocedure);
  if position('''modus''' in d) = 0 then
    d := replace(d, $r$'boss', sz->'minispiel'->>'boss')$r$, $r$'boss', sz->'minispiel'->>'boss', 'modus', sz->'minispiel'->>'modus')$r$);
    if position('''modus''' in d) = 0 then raise exception 'quest_view: Muster nicht gefunden'; end if;
    execute d;
  end if;
end $do$;
