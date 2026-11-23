-- Migration 023: Minispiele und Rätsel in Quests, Tagwerk (Bewohner bitten um Hilfe), Erkunden (kurze Streifzüge, auch nebenbei).

-- Erkundungen laufen neben einer großen Quest her und blockieren nichts
create or replace function public.q_nebenbei(p_quest text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select art = 'erkundung' from quest_templates where id = p_quest), false);
$$;

-- Antworten vergleichen: Groß/klein, Umlaute, Satzzeichen und Artikel egal
create or replace function public.q_norm(t text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(replace(replace(replace(replace(lower(trim(coalesce(t, ''))), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
    '^(der|die|das|ein|eine|einen|den|dem) ', ''), '[^a-z0-9]', '', 'g');
$$;

-- Ein Zweig (erfolg/misserfolg) wird ausgeführt: Folgen anwenden, weiter zur nächsten Szene, Ergebnis merken
create or replace function public.q_branch(p_run bigint, br jsonb, res jsonb, ctx jsonb) returns void language plpgsql security definer set search_path = public as $$
declare txt text; extra text; nxt text;
begin
  txt := q_fill(br->>'text', ctx);
  extra := q_apply(p_run, br->'folgen');
  nxt := br->>'weiter';
  if nxt is not null then extra := trim(coalesce(extra, '') || ' ' || q_enter(p_run, nxt)); end if;
  update quest_runs set letztes = coalesce(letztes, '{}'::jsonb) || res || jsonb_build_object('text', txt, 'extra', extra) where id = p_run;
end;
$$;

create or replace function public.quest_view(p_run bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare r quest_runs; t quest_templates; sz jsonb; o jsonb; i int; opts jsonb := '[]'::jsonb; ctx jsonb; m jsonb; beg json; nv int; hints jsonb;
begin
  select * into r from quest_runs where id = p_run and player_id = auth.uid(); if not found then raise exception 'Unbekannte Quest'; end if;
  select * into t from quest_templates where id = r.quest_id; sz := t.def->'szenen'->r.szene; ctx := q_ctx(r);
  select coalesce(json_agg(json_build_object('id', n.id, 'name', n.name, 'beruf', n.job, 'look', n.look) order by array_position(r.begleiter, n.id)), '[]'::json) into beg from npcs n where n.id = any(r.begleiter);
  if not (sz ? 'reise') and not (sz ? 'ende') then
    i := 0;
    for o in select * from jsonb_array_elements(coalesce(sz->'optionen', '[]'::jsonb)) loop
      i := i + 1;
      if q_cond(r, o->'wenn') then
        ctx := q_ctx(r, o->'wenn');
        m := case when o ? 'probe' then q_mods(r, o->'probe') end;
        opts := opts || jsonb_build_object('nr', i, 'text', q_fill(o->>'text', ctx), 'tag', q_fill(o->>'tag', ctx), 'probe', o->'probe'->>'id',
          'hint', case when m is not null then q_odds((m->>'dc')::int - (m->>'summe')::int) end);
      end if;
    end loop;
    ctx := q_ctx(r);
  end if;
  nv := coalesce((r.flags->>('rv_' || r.szene))::int, 0);
  if sz ? 'raetsel' then
    select coalesce(jsonb_agg(q_fill(h, ctx)), '[]'::jsonb) into hints from (select h from jsonb_array_elements_text(coalesce(sz->'raetsel'->'hinweise', '[]'::jsonb)) with ordinality x(h, n) where n <= nv) y;
  end if;
  return json_build_object('run', r.id, 'quest', t.titel, 'art', t.art, 'szene', r.szene, 'status', r.status, 'ort', sz->>'ort', 'gefahr', coalesce((sz->>'gefahr')::boolean, false),
    'text', q_fill(sz->>'text', ctx), 'optionen', opts, 'begleiter', beg, 'letztes', r.letztes,
    'reise', case when sz ? 'reise' then json_build_object('minuten', sz->'reise'->'minuten', 'bis', r.warte_bis, 'bereit', r.warte_bis is null or r.warte_bis <= now(), 'text', q_fill(sz->'reise'->>'text', ctx)) end,
    'minispiel', case when sz ? 'minispiel' then json_build_object('art', sz->'minispiel'->>'art', 'schwer', coalesce((sz->'minispiel'->>'schwer')::int, 2),
        'titel', q_fill(sz->'minispiel'->>'titel', ctx), 'text', q_fill(sz->'minispiel'->>'text', ctx)) end,
    'raetsel', case when sz ? 'raetsel' then json_build_object('frage', q_fill(sz->'raetsel'->>'frage', ctx), 'uebrig', greatest(0, coalesce((sz->'raetsel'->>'versuche')::int, 3) - nv), 'hinweise', hints) end,
    'ende', coalesce((sz->>'ende')::boolean, false));
end;
$$;

create or replace function public.quest_minigame(p_run bigint, p_erfolg boolean) returns json language plpgsql security definer set search_path = public as $$
declare r quest_runs; sz jsonb; ctx jsonb;
begin
  select * into r from quest_runs where id = p_run and player_id = auth.uid() for update; if not found then raise exception 'Unbekannte Quest'; end if;
  if r.status <> 'laeuft' then raise exception 'Diese Quest ist beendet'; end if;
  sz := (select def->'szenen'->r.szene from quest_templates where id = r.quest_id);
  if not (sz ? 'minispiel') then raise exception 'Hier gibt es nichts zu spielen'; end if;
  update quest_runs set letztes = null where id = r.id;
  ctx := q_ctx(r);
  perform q_branch(r.id, case when p_erfolg then sz->'minispiel'->'erfolg' else sz->'minispiel'->'misserfolg' end,
    jsonb_build_object('wahl', coalesce(q_fill(sz->'minispiel'->>'titel', ctx), 'Versucht'), 'minispiel', jsonb_build_object('art', sz->'minispiel'->>'art', 'erfolg', p_erfolg)), ctx);
  return quest_view(r.id);
end;
$$;

create or replace function public.quest_answer(p_run bigint, p_text text) returns json language plpgsql security definer set search_path = public as $$
declare r quest_runs; sz jsonb; ctx jsonb; ok boolean; k text; n int; maxv int;
begin
  select * into r from quest_runs where id = p_run and player_id = auth.uid() for update; if not found then raise exception 'Unbekannte Quest'; end if;
  if r.status <> 'laeuft' then raise exception 'Diese Quest ist beendet'; end if;
  sz := (select def->'szenen'->r.szene from quest_templates where id = r.quest_id);
  if not (sz ? 'raetsel') then raise exception 'Hier gibt es kein Rätsel'; end if;
  if length(coalesce(p_text, '')) > 80 then raise exception 'Zu lang'; end if;
  update quest_runs set letztes = null where id = r.id;
  ctx := q_ctx(r);
  ok := q_norm(p_text) <> '' and exists (select 1 from jsonb_array_elements_text(sz->'raetsel'->'antworten') a where q_norm(a) = q_norm(p_text));
  k := 'rv_' || r.szene; n := coalesce((r.flags->>k)::int, 0); maxv := coalesce((sz->'raetsel'->>'versuche')::int, 3);
  if ok then
    perform q_branch(r.id, sz->'raetsel'->'erfolg', jsonb_build_object('wahl', '„' || p_text || '“', 'raetsel', true), ctx);
  else
    n := n + 1; update quest_runs set flags = flags || jsonb_build_object(k, n) where id = r.id;
    if n >= maxv then
      perform q_branch(r.id, sz->'raetsel'->'misserfolg', jsonb_build_object('wahl', '„' || p_text || '“', 'raetsel', false), ctx);
    else
      update quest_runs set letztes = jsonb_build_object('wahl', '„' || p_text || '“', 'text', coalesce(q_fill(sz->'raetsel'->>'falsch', ctx), 'Nichts geschieht. Das ist es nicht.'), 'raetsel', false) where id = r.id;
    end if;
  end if;
  return quest_view(r.id);
end;
$$;
revoke execute on function public.q_nebenbei(text), public.q_norm(text), public.q_branch(bigint, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.quest_view(bigint), public.quest_minigame(bigint, boolean), public.quest_answer(bigint, text) from public, anon;
grant execute on function public.quest_view(bigint), public.quest_minigame(bigint, boolean), public.quest_answer(bigint, text) to authenticated;

-- Die Prüfung „Du bist schon unterwegs“ und die laufende Quest ignorieren Erkundungen (Textersetzung in den bestehenden Funktionen)
do $do$
declare f text; d text;
begin
  foreach f in array array['public.quest_start(text,bigint[])', 'public.quest_take(bigint,bigint[])', 'public.quest_custom_start(text,bigint[])'] loop
    begin
      d := pg_get_functiondef(f::regprocedure);
      if position('q_nebenbei' in d) = 0 then
        d := replace(d, 'where player_id = auth.uid() and status = ''laeuft'')', 'where player_id = auth.uid() and status = ''laeuft'' and not q_nebenbei(quest_id))');
        execute d;
      end if;
    exception when undefined_function then raise notice 'fehlt: %', f;
    end;
  end loop;
  d := pg_get_functiondef('public.quest_list()'::regprocedure);
  if position('q_nebenbei' in d) = 0 then
    d := replace(d, 'q.status = ''laeuft'' order by q.id desc', 'q.status = ''laeuft'' and not q_nebenbei(q.quest_id) order by q.id desc');
    execute d;
  end if;
  -- Begegnungen: eine pro Reiseabschnitt statt nur eine pro Quest (lange Quests haben mehrere Etappen)
  d := pg_get_functiondef('public.quest_choose(bigint,integer)'::regprocedure);
  if position('''beg_'' || r.szene' in d) = 0 then
    d := replace(d, 'not (r.flags ? ''begegnung_gehabt'')', 'not (r.flags ? (''beg_'' || r.szene))');
    d := replace(d, 'set flags = flags || ''{"begegnung_gehabt":true}'' where id = r.id', 'set flags = flags || jsonb_build_object(''beg_'' || r.szene, true) where id = r.id');
    execute d;
  end if;
end $do$;

-- ───────────── Tagwerk: Bewohner bitten um Hilfe ─────────────
create table if not exists public.tagwerk_arten (
  id text primary key, jobs text[] not null, art text not null, schwer int not null default 2,
  titel text not null, bitte text not null, erfolg text not null, misserfolg text not null, dorf jsonb not null default '{}'
);
create table if not exists public.tagwerk (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles(id) on delete cascade, tag date not null,
  npc_id bigint not null references public.npcs(id) on delete cascade, art_id text not null references public.tagwerk_arten(id),
  status text not null default 'offen' check (status in ('offen','erledigt','verpatzt')), ergebnis text, created_at timestamptz not null default now(),
  unique (player_id, tag, npc_id)
);
alter table public.tagwerk_arten enable row level security; alter table public.tagwerk enable row level security;
revoke all on public.tagwerk_arten, public.tagwerk from anon, authenticated;

create or replace function public.heute() returns json language plpgsql security definer set search_path = public as $$
declare d date := berlin_day(); v villages; cnt int; lauf bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid();
  if not exists (select 1 from tagwerk where player_id = auth.uid() and tag = d) then
    insert into tagwerk (player_id, tag, npc_id, art_id)
    select auth.uid(), d, x.npc, x.art from (
      select distinct on (n.id) n.id as npc, a.id as art, random() as rnd from npcs n join tagwerk_arten a on n.job = any(a.jobs)
      where n.village_id = v.id order by n.id, random()) x
    order by x.rnd limit 3
    on conflict do nothing;
  end if;
  select count(*) into cnt from quest_runs q where q.player_id = auth.uid() and q_nebenbei(q.quest_id) and (q.started_at at time zone 'Europe/Berlin')::date = d;
  select q.id into lauf from quest_runs q where q.player_id = auth.uid() and q.status = 'laeuft' and q_nebenbei(q.quest_id) order by q.id desc limit 1;
  return json_build_object(
    'tagwerk', (select coalesce(json_agg(json_build_object('id', w.id, 'npc_id', n.id, 'npc', n.name, 'beruf', n.job, 'look', n.look, 'titel', a.titel, 'bitte', a.bitte,
        'art', a.art, 'schwer', a.schwer, 'status', w.status, 'ergebnis', w.ergebnis) order by w.id), '[]'::json)
      from tagwerk w join npcs n on n.id = w.npc_id join tagwerk_arten a on a.id = w.art_id where w.player_id = auth.uid() and w.tag = d),
    'erkunden', json_build_object('rest', greatest(0, 3 - cnt), 'lauf', lauf, 'neu_ab', berlin_midnight()),
    'neu_ab', berlin_midnight());
end;
$$;

create or replace function public.tagwerk_fertig(p_id bigint, p_erfolg boolean) returns json language plpgsql security definer set search_path = public as $$
declare w tagwerk; a tagwerk_arten; n npcs; vid bigint; me text; txt text; extra text := ''; lt json;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into w from tagwerk where id = p_id and player_id = auth.uid() and status = 'offen' for update;
  if w.id is null then return json_build_object('ok', false, 'grund', 'schon_erledigt'); end if;
  select * into a from tagwerk_arten where id = w.art_id; select * into n from npcs where id = w.npc_id;
  select id into vid from villages where owner_id = auth.uid(); select character_name into me from profiles where id = auth.uid();
  txt := replace(case when p_erfolg then a.erfolg else a.misserfolg end, '{held}', coalesce(me, 'du'));
  insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (n.id, auth.uid(), case when p_erfolg then 3 else 1 end, case when p_erfolg then 1 else 0 end)
    on conflict (npc_id, player_id) do update set sympathy = least(100, npc_relations.sympathy + case when p_erfolg then 3 else 1 end), loyalty = least(100, npc_relations.loyalty + case when p_erfolg then 1 else 0 end), updated_at = now();
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta)
    values (n.id, auth.uid(), 'gespraech', coalesce(me, 'Jemand') || case when p_erfolg then ' hat mir geholfen: ' else ' hat versucht, mir zu helfen: ' end || a.titel || '.', case when p_erfolg then 3 else 1 end);
  if p_erfolg and vid is not null and a.dorf <> '{}'::jsonb then perform eco_add(vid, a.dorf); extra := coalesce(eco_effekt(a.dorf), ''); end if;
  if p_erfolg and random() < 0.08 then
    lt := loot_roll(auth.uid(), 1, null, 'Tagwerk');
    extra := trim(extra || ' ' || n.name || ' drückt dir zum Dank etwas in die Hand: ' || (lt->>'name') || '.');
  end if;
  if vid is not null then perform eco_log(vid, 'hilfe', coalesce(me, 'Jemand') || ' hat ' || n.name || ' geholfen: ' || a.titel || '.', n.id); end if;
  update tagwerk set status = case when p_erfolg then 'erledigt' else 'verpatzt' end, ergebnis = txt where id = w.id;
  return json_build_object('ok', true, 'text', txt, 'extra', extra);
end;
$$;

create or replace function public.erkunden_start() returns json language plpgsql security definer set search_path = public as $$
declare d date := berlin_day(); cnt int; lauf bigint; t quest_templates; rid bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select q.id into lauf from quest_runs q where q.player_id = auth.uid() and q.status = 'laeuft' and q_nebenbei(q.quest_id) order by q.id desc limit 1;
  if lauf is not null then return json_build_object('ok', true, 'run', lauf); end if;
  select count(*) into cnt from quest_runs q where q.player_id = auth.uid() and q_nebenbei(q.quest_id) and (q.started_at at time zone 'Europe/Berlin')::date = d;
  if cnt >= 3 then return json_build_object('ok', false, 'grund', 'muede', 'ab', berlin_midnight()); end if;
  select * into t from quest_templates qt where qt.art = 'erkundung'
    order by (select count(*) from quest_runs q where q.player_id = auth.uid() and q.quest_id = qt.id and q.started_at > now() - interval '4 days'), random() limit 1;
  if t.id is null then return json_build_object('ok', false, 'grund', 'leer'); end if;
  insert into quest_runs (player_id, quest_id, szene) values (auth.uid(), t.id, t.def->>'start') returning id into rid;
  perform q_enter(rid, t.def->>'start');
  return json_build_object('ok', true, 'run', rid);
end;
$$;
revoke execute on function public.heute(), public.tagwerk_fertig(bigint, boolean), public.erkunden_start() from public, anon;
grant execute on function public.heute(), public.tagwerk_fertig(bigint, boolean), public.erkunden_start() to authenticated;
