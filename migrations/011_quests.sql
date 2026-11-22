-- Migration 011: Gegenstände, Quest-Engine (Szenen, Bedingungen, Proben, Folgen, Reisen, Begegnungen), Chronik, Verletzungen.
alter table public.profiles add column if not exists zustand text not null default 'gesund';
alter table public.profiles add column if not exists zustand_bis timestamptz;

create table if not exists public.items (
  id text primary key, name text not null, art text not null check (art in ('waffe','ruestung','werkzeug','kleidung','fund')),
  bonus jsonb not null default '{}', schutz int not null default 0, beschreibung text not null default ''
);
alter table public.items enable row level security; revoke all on public.items from anon, authenticated;
insert into public.items (id, name, art, bonus, schutz, beschreibung) values
 ('bogen', 'Bogen', 'waffe', '{"flink":1}', 0, 'Ein Eibenbogen. Für die Jagd – und für Warnschüsse.'),
 ('schwert', 'Schwert', 'waffe', '{"einschuechtern":2,"anpacken":1}', 0, 'Schwer, scharf, respekteinflößend.'),
 ('dolch', 'Dolch', 'waffe', '{"einschuechtern":1}', 0, 'Klein genug für den Stiefel.'),
 ('lederwams', 'Lederwams', 'ruestung', '{}', 1, 'Gehärtetes Leder. Fängt Krallen und Steinschlag ab.'),
 ('kettenhemd', 'Kettenhemd', 'ruestung', '{"flink":-1}', 2, 'Schützt gut, macht aber langsamer.'),
 ('seil', 'Seil', 'werkzeug', '{"anpacken":1}', 0, 'Zwanzig Schritt Hanfseil.'),
 ('laterne', 'Laterne', 'werkzeug', '{}', 0, 'Licht für dunkle Orte.'),
 ('kraeutertasche', 'Kräutertasche', 'werkzeug', '{"heilkunde":2}', 0, 'Salben, Verbände, getrocknete Kräuter.'),
 ('alte_chronik', 'Alte Chronik', 'werkzeug', '{"altes_wissen":2}', 0, 'Abschriften alter Berichte über das Tal.'),
 ('dietrich', 'Dietrich', 'werkzeug', '{"flink":1}', 0, 'Öffnet Schlösser, wenn man weiß, wie.'),
 ('dunkler_umhang', 'Dunkler Umhang', 'kleidung', '{"flink":1}', 0, 'Wer ihn trägt, verschmilzt mit Schatten.'),
 ('feine_kleidung', 'Feine Kleidung', 'kleidung', '{"ueberreden":1,"feilschen":1}', 0, 'Macht Eindruck auf Händler und Ratsleute.'),
 ('silbererz', 'Silbererz', 'fund', '{}', 0, 'Glänzende Brocken aus der verlassenen Mine.')
on conflict (id) do nothing;

create table if not exists public.player_items (
  player_id uuid not null references public.profiles(id) on delete cascade, item_id text not null references public.items(id),
  menge int not null default 1 check (menge >= 0), primary key (player_id, item_id)
);
alter table public.player_items enable row level security; revoke all on public.player_items from anon, authenticated;

create table if not exists public.quest_templates (id text primary key, titel text not null, beschreibung text not null, voraussetzung jsonb not null default '{}', def jsonb not null);
alter table public.quest_templates enable row level security; revoke all on public.quest_templates from anon, authenticated;

create table if not exists public.quest_runs (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  quest_id text not null references public.quest_templates(id),
  szene text not null, begleiter bigint[] not null default '{}', flags jsonb not null default '{}',
  status text not null default 'laeuft' check (status in ('laeuft','fertig','abgebrochen')),
  warte_bis timestamptz, letztes jsonb, started_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists quest_runs_player_idx on public.quest_runs (player_id, status);
alter table public.quest_runs enable row level security; revoke all on public.quest_runs from anon, authenticated;

create table if not exists public.chronicle (
  id bigint generated always as identity primary key, player_id uuid not null references public.profiles(id) on delete cascade,
  key text not null, text text not null, created_at timestamptz not null default now(), unique (player_id, key)
);
alter table public.chronicle enable row level security; revoke all on public.chronicle from anon, authenticated;

-- Startausrüstung je Herkunft (einmalig)
create or replace function public.ensure_starter_items(p_uid uuid) returns void language plpgsql security definer set search_path = public as $$
declare h text;
begin
  if exists (select 1 from player_items where player_id = p_uid) then return; end if;
  select coalesce(herkunft, 'waldlaeufer') into h from profiles where id = p_uid;
  insert into player_items (player_id, item_id, menge)
  select p_uid, x, 1 from unnest(case h
    when 'krieger' then array['schwert','kettenhemd'] when 'haendler' then array['feine_kleidung','dolch','laterne']
    when 'gelehrter' then array['alte_chronik','laterne'] when 'heiler' then array['kraeutertasche','lederwams']
    when 'schurke' then array['dietrich','dunkler_umhang','dolch'] else array['bogen','lederwams','seil'] end) x
  on conflict do nothing;
end;
$$;
revoke execute on function public.ensure_starter_items(uuid) from public, anon, authenticated;

create or replace function public.get_inventory() returns json language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform ensure_starter_items(auth.uid());
  return json_build_object(
    'items', (select coalesce(json_agg(json_build_object('id', i.id, 'name', i.name, 'art', i.art, 'bonus', i.bonus, 'schutz', i.schutz, 'beschreibung', i.beschreibung, 'menge', p.menge) order by i.art, i.name), '[]'::json) from player_items p join items i on i.id = p.item_id where p.player_id = auth.uid() and p.menge > 0),
    'zustand', (select json_build_object('zustand', case when zustand_bis > now() then zustand else 'gesund' end, 'bis', case when zustand_bis > now() then zustand_bis end) from profiles where id = auth.uid()),
    'chronik', (select coalesce(json_agg(json_build_object('text', c.text, 'am', c.created_at) order by c.created_at desc), '[]'::json) from (select * from chronicle where player_id = auth.uid() order by created_at desc limit 30) c)
  );
end;
$$;
revoke execute on function public.get_inventory() from public, anon; grant execute on function public.get_inventory() to authenticated;

-- Platzhalter füllen: {held} {b1} {bb} {mit}
create or replace function public.q_fill(p_txt text, p_ctx jsonb) returns text language plpgsql immutable as $$
declare k text; v text; r text := coalesce(p_txt, '');
begin
  for k, v in select * from jsonb_each_text(p_ctx) loop r := replace(r, '{' || k || '}', coalesce(v, '')); end loop;
  return r;
end;
$$;

create or replace function public.q_ctx(p_run quest_runs, p_wenn jsonb default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare held text; names text[]; bb text;
begin
  select character_name into held from profiles where id = p_run.player_id;
  select array_agg(n.name order by array_position(p_run.begleiter, n.id)) into names from npcs n where n.id = any(p_run.begleiter);
  if p_wenn ? 'begleiter_beruf' then
    select n.name into bb from npcs n where n.id = any(p_run.begleiter) and n.job in (select jsonb_array_elements_text(p_wenn->'begleiter_beruf')) order by array_position(p_run.begleiter, n.id) limit 1;
  end if;
  return jsonb_build_object('held', coalesce(held, 'du'), 'b1', coalesce(names[1], ''), 'bb', coalesce(bb, names[1], ''),
    'mit', case when coalesce(array_length(names, 1), 0) = 0 then 'allein' when array_length(names, 1) = 1 then 'mit ' || names[1] else 'mit ' || names[1] || ' und ' || names[2] end);
end;
$$;
revoke execute on function public.q_ctx(quest_runs, jsonb) from public, anon, authenticated;

create or replace function public.q_cond(p_run quest_runs, w jsonb) returns boolean language plpgsql stable security definer set search_path = public as $$
declare me record; a jsonb; k text;
begin
  if w is null or w = '{}'::jsonb then return true; end if;
  select race, coalesce(herkunft, 'waldlaeufer') herkunft into me from profiles where id = p_run.player_id;
  if w ? 'herkunft' and not (me.herkunft in (select jsonb_array_elements_text(w->'herkunft'))) then return false; end if;
  if w ? 'volk' and not (coalesce(me.race, 'mensch') in (select jsonb_array_elements_text(w->'volk'))) then return false; end if;
  if w ? 'item' and not exists (select 1 from player_items where player_id = p_run.player_id and item_id = w->>'item' and menge > 0) then return false; end if;
  if w ? 'nicht_item' and exists (select 1 from player_items where player_id = p_run.player_id and item_id = w->>'nicht_item' and menge > 0) then return false; end if;
  if w ? 'item_eines' and not exists (select 1 from player_items where player_id = p_run.player_id and menge > 0 and item_id in (select jsonb_array_elements_text(w->'item_eines'))) then return false; end if;
  if w ? 'begleiter' and (w->>'begleiter')::boolean <> (coalesce(array_length(p_run.begleiter, 1), 0) > 0) then return false; end if;
  if w ? 'begleiter_beruf' and not exists (select 1 from npcs n where n.id = any(p_run.begleiter) and n.job in (select jsonb_array_elements_text(w->'begleiter_beruf'))) then return false; end if;
  if w ? 'flag' and not (p_run.flags ? (w->>'flag')) then return false; end if;
  if w ? 'nicht_flag' and (p_run.flags ? (w->>'nicht_flag')) then return false; end if;
  if w ? 'wissen' and not exists (select 1 from player_journal where player_id = p_run.player_id and key = w->>'wissen') then return false; end if;
  if w ? 'holz' and (select village_wood(v) from villages v where v.owner_id = p_run.player_id) < (w->>'holz')::numeric then return false; end if;
  if w ? 'attr' then a := char_attrs(me.race, me.herkunft); for k in select jsonb_object_keys(w->'attr') loop if (a->>k)::int < (w->'attr'->>k)::int then return false; end if; end loop; end if;
  return true;
end;
$$;
revoke execute on function public.q_cond(quest_runs, jsonb) from public, anon, authenticated;

-- Probe: W20 + (Eigenschaft−2) + Herkunft + Gegenstände + Begleiter − Verletzung, Schwierigkeit ± Merker
create or replace function public.q_mods(p_run quest_runs, pr jsonb) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me record; a jsonb; skill text; fav text; helpers text[]; md int; bonus int; items_b int; beg int; wund int; dc int; k text;
begin
  select race, coalesce(herkunft, 'waldlaeufer') herkunft, zustand, zustand_bis into me from profiles where id = p_run.player_id;
  select x.skill, x.fav, x.helpers into skill, fav, helpers from (values
    ('spuren', 'sinne', 'waldlaeufer', array['Jäger','Jägerin','Falknerin','Hirte']), ('menschenkenntnis', 'sinne', 'schurke', array['Wirt','Schankmaid','Priesterin','Seherin']),
    ('ueberreden', 'charme', 'haendler', array['Händler','Wirt','Barde','Schankmaid']), ('einschuechtern', 'staerke', 'krieger', array['Wache','Söldnerin','Hauptmann','Schmied']),
    ('altes_wissen', 'wissen', 'gelehrter', array['Gelehrter','Schreiber','Mönch','Priesterin','Dorfälteste']), ('flink', 'geschick', 'schurke', array['Jäger','Jägerin','Stallbursche']),
    ('beruhigen', 'wille', 'heiler', array['Heilerin','Priesterin','Wäscherin']), ('feilschen', 'charme', 'haendler', array['Händler','Wirt']),
    ('heilkunde', 'wissen', 'heiler', array['Heilerin','Kräuterfrau','Alchemist']), ('anpacken', 'staerke', 'krieger', array['Zimmermann','Steinmetz','Holzfäller','Bergmann','Schmied','Bauer'])
  ) as x(id, skill, fav, helpers) where x.id = pr->>'id';
  a := char_attrs(me.race, me.herkunft);
  md := (a->>skill)::int - 2; bonus := case when me.herkunft = fav then 2 else 0 end;
  select coalesce(sum((i.bonus->>(pr->>'id'))::int), 0) into items_b from player_items p join items i on i.id = p.item_id where p.player_id = p_run.player_id and p.menge > 0 and i.bonus ? (pr->>'id');
  beg := case when exists (select 1 from npcs n where n.id = any(p_run.begleiter) and n.job = any(helpers)) then 2 else 0 end;
  wund := case when me.zustand = 'verletzt' and me.zustand_bis > now() then -2 else 0 end;
  dc := coalesce((pr->>'dc')::int, 12);
  if pr ? 'mod' then for k in select jsonb_object_keys(pr->'mod') loop if p_run.flags ? k then dc := dc + (pr->'mod'->>k)::int; end if; end loop; end if;
  return jsonb_build_object('eigenschaft', skill, 'mod', md, 'herkunft', bonus, 'items', items_b, 'begleiter', beg, 'wunde', wund, 'dc', dc, 'summe', md + bonus + items_b + beg + wund);
end;
$$;
revoke execute on function public.q_mods(quest_runs, jsonb) from public, anon, authenticated;

-- Folgen anwenden; gibt Zusatztext zurück (z. B. Rüstung fängt Schlag ab)
create or replace function public.q_apply(p_run_id bigint, f jsonb) returns text language plpgsql security definer set search_path = public as $$
declare r quest_runs; k text; v text; out text := ''; arm record; ctx jsonb; nid bigint;
begin
  if f is null or f = '{}'::jsonb then return ''; end if;
  select * into r from quest_runs where id = p_run_id for update; ctx := q_ctx(r);
  if f ? 'flag' then update quest_runs set flags = flags || (select jsonb_object_agg(x, true) from jsonb_array_elements_text(f->'flag') x) where id = r.id; end if;
  if f ? 'item_plus' then for k, v in select * from jsonb_each_text(f->'item_plus') loop
    insert into player_items (player_id, item_id, menge) values (r.player_id, k, v::int) on conflict (player_id, item_id) do update set menge = player_items.menge + excluded.menge;
    out := out || ' Erhalten: ' || (select name from items where id = k) || case when v::int > 1 then ' ×' || v else '' end || '.'; end loop; end if;
  if f ? 'item_minus' then for k, v in select * from jsonb_each_text(f->'item_minus') loop update player_items set menge = greatest(0, menge - v::int) where player_id = r.player_id and item_id = k; end loop; end if;
  if f ? 'holz' then update villages set wood_stock = village_wood(villages) + (f->>'holz')::numeric, stock_updated_at = now() where owner_id = r.player_id; out := out || ' Holz ' || (f->>'holz') || '.'; end if;
  if (f ? 'begleiter_sym' or f ? 'begleiter_loy') and coalesce(array_length(r.begleiter, 1), 0) > 0 then
    foreach nid in array r.begleiter loop
      insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (nid, r.player_id, 0, 0) on conflict do nothing;
      update npc_relations set sympathy = greatest(-100, least(100, sympathy + coalesce((f->>'begleiter_sym')::int, 0))), loyalty = greatest(0, least(100, loyalty + coalesce((f->>'begleiter_loy')::int, 0))), updated_at = now() where npc_id = nid and player_id = r.player_id;
    end loop; end if;
  if f ? 'notiz' and coalesce(array_length(r.begleiter, 1), 0) > 0 then
    insert into player_notes (player_id, npc_id, kind, text) values (r.player_id, r.begleiter[1], 'begegnung', q_fill(f->>'notiz', ctx));
    insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (r.begleiter[1], r.player_id, 'gespraech', 'Wir haben zusammen die Mine erlebt. ' || q_fill(f->>'notiz', ctx), 0);
  end if;
  if f ? 'chronik' then insert into chronicle (player_id, key, text) values (r.player_id, f->'chronik'->>0, q_fill(f->'chronik'->>1, ctx)) on conflict do nothing; end if;
  if f ? 'journal' then insert into player_journal (player_id, kind, key, title, text) values (r.player_id, 'auftrag', f->'journal'->>0, f->'journal'->>1, f->'journal'->>2) on conflict do nothing; out := out || ' Tagebuch: ' || (f->'journal'->>1) || '.'; end if;
  if f ? 'begleiter_ab' and coalesce(array_length(r.begleiter, 1), 0) > 0 then update quest_runs set begleiter = begleiter[2:] where id = r.id; end if;
  if f ? 'gefahr' then
    select i.name, i.schutz into arm from player_items p join items i on i.id = p.item_id where p.player_id = r.player_id and p.menge > 0 and i.schutz > 0 order by i.schutz desc limit 1;
    if arm.name is not null then out := out || ' Dein ' || arm.name || ' fängt das Schlimmste ab.';
    else update profiles set zustand = 'verletzt', zustand_bis = now() + interval '6 hours' where id = r.player_id; out := out || ' Du bist verletzt (Proben −2 für einige Stunden).'; end if;
  end if;
  return trim(out);
end;
$$;
revoke execute on function public.q_apply(bigint, jsonb) from public, anon, authenticated;

create or replace function public.q_odds(n int) returns text language sql immutable as $$
  select case when n <= 6 then 'leicht' when n <= 10 then 'machbar' when n <= 14 then 'schwer' else 'sehr schwer' end;
$$;

create or replace function public.quest_view(p_run bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare r quest_runs; t quest_templates; sz jsonb; o jsonb; i int; opts jsonb := '[]'::jsonb; ctx jsonb; m jsonb; beg json;
begin
  select * into r from quest_runs where id = p_run and player_id = auth.uid(); if not found then raise exception 'Unbekannte Quest'; end if;
  select * into t from quest_templates where id = r.quest_id; sz := t.def->'szenen'->r.szene; ctx := q_ctx(r);
  select coalesce(json_agg(json_build_object('id', n.id, 'name', n.name, 'beruf', n.job, 'look', n.look) order by array_position(r.begleiter, n.id)), '[]'::json) into beg from npcs n where n.id = any(r.begleiter);
  if not (sz ? 'reise') and not (sz ? 'ende') then
    i := 0;
    for o in select * from jsonb_array_elements(sz->'optionen') loop
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
  return json_build_object('run', r.id, 'quest', t.titel, 'szene', r.szene, 'status', r.status, 'ort', sz->>'ort', 'gefahr', coalesce((sz->>'gefahr')::boolean, false),
    'text', q_fill(sz->>'text', ctx), 'optionen', opts, 'begleiter', beg, 'letztes', r.letztes,
    'reise', case when sz ? 'reise' then json_build_object('minuten', sz->'reise'->'minuten', 'bis', r.warte_bis, 'bereit', r.warte_bis is null or r.warte_bis <= now()) end,
    'ende', coalesce((sz->>'ende')::boolean, false));
end;
$$;
revoke execute on function public.quest_view(bigint) from public, anon; grant execute on function public.quest_view(bigint) to authenticated;

-- Szene betreten: Reisezeit setzen bzw. Ende abschließen
create or replace function public.q_enter(p_run bigint, p_szene text) returns text language plpgsql security definer set search_path = public as $$
declare r quest_runs; sz jsonb; extra text := '';
begin
  select * into r from quest_runs where id = p_run; sz := (select def->'szenen'->p_szene from quest_templates where id = r.quest_id);
  if sz is null then raise exception 'Szene fehlt: %', p_szene; end if;
  update quest_runs set szene = p_szene, updated_at = now(), warte_bis = case when sz ? 'reise' then now() + make_interval(secs => (sz->'reise'->>'minuten')::numeric * 60) else null end where id = p_run;
  if coalesce((sz->>'ende')::boolean, false) then extra := q_apply(p_run, sz->'folgen'); update quest_runs set status = 'fertig' where id = p_run; end if;
  return extra;
end;
$$;
revoke execute on function public.q_enter(bigint, text) from public, anon, authenticated;

create or replace function public.quest_choose(p_run bigint, p_nr int) returns json language plpgsql security definer set search_path = public as $$
declare r quest_runs; sz jsonb; o jsonb; br jsonb; m jsonb; roll int; ok boolean; nxt text; txt text; extra text; ctx jsonb; res jsonb; pool jsonb;
begin
  select * into r from quest_runs where id = p_run and player_id = auth.uid() for update; if not found then raise exception 'Unbekannte Quest'; end if;
  if r.status <> 'laeuft' then raise exception 'Diese Quest ist beendet'; end if;
  sz := (select def->'szenen'->r.szene from quest_templates where id = r.quest_id);
  if sz ? 'reise' then
    if r.warte_bis is not null and r.warte_bis > now() then raise exception 'Ihr seid noch unterwegs'; end if;
    nxt := sz->'reise'->>'weiter'; pool := sz->'reise'->'begegnung'->'szenen';
    if pool is not null and random() < coalesce((sz->'reise'->'begegnung'->>'chance')::numeric, 0) and not (r.flags ? 'begegnung_gehabt') then
      nxt := pool->>(floor(random() * jsonb_array_length(pool)))::int; update quest_runs set flags = flags || '{"begegnung_gehabt":true}' where id = r.id;
    end if;
    perform q_enter(r.id, nxt);
    update quest_runs set letztes = null where id = r.id;
    return quest_view(r.id);
  end if;
  o := sz->'optionen'->(p_nr - 1);
  if o is null or not q_cond(r, o->'wenn') then raise exception 'Diese Wahl gibt es nicht'; end if;
  ctx := q_ctx(r, o->'wenn');
  res := jsonb_build_object('wahl', q_fill(o->>'text', ctx));
  if o ? 'probe' then
    m := q_mods(r, o->'probe'); roll := 1 + floor(random() * 20)::int;
    ok := roll = 20 or (roll <> 1 and roll + (m->>'summe')::int >= (m->>'dc')::int);
    br := case when ok then o->'erfolg' else o->'misserfolg' end;
    res := res || jsonb_build_object('probe', m || jsonb_build_object('id', o->'probe'->>'id', 'wurf', roll, 'gesamt', roll + (m->>'summe')::int, 'erfolg', ok));
  else br := o; end if;
  txt := q_fill(case when o ? 'probe' then br->>'text' else o->>'ergebnis' end, ctx);
  extra := q_apply(r.id, br->'folgen');
  nxt := coalesce(br->>'weiter', o->>'weiter');
  if nxt is not null then extra := trim(extra || ' ' || q_enter(r.id, nxt)); end if;
  update quest_runs set letztes = res || jsonb_build_object('text', txt, 'extra', extra) where id = r.id;
  return quest_view(r.id);
end;
$$;
revoke execute on function public.quest_choose(bigint, int) from public, anon; grant execute on function public.quest_choose(bigint, int) to authenticated;

-- Verfügbare Quests (mit Hinweis, wer im Dorf mehr weiß) und laufende Quest
create or replace function public.quest_list() returns json language plpgsql stable security definer set search_path = public as $$
declare v villages;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid();
  return json_build_object(
    'laufend', (select json_build_object('run', id, 'quest', quest_id) from quest_runs where player_id = auth.uid() and status = 'laeuft' order by id desc limit 1),
    'quests', (select coalesce(json_agg(json_build_object('id', t.id, 'titel', t.titel, 'beschreibung', t.beschreibung,
        'offen', exists (select 1 from player_journal j where j.player_id = auth.uid() and j.key = t.voraussetzung->>'wissen'),
        'erledigt', exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.quest_id = t.id and q.status = 'fertig'),
        'hinweis', (select string_agg(n.name, ', ') from npcs n join npc_profiles p on p.npc_id = n.id where n.village_id = v.id and (t.voraussetzung->>'wissen') = any(p.wissen)))), '[]'::json) from quest_templates t),
    'begleiter', (select coalesce(json_agg(json_build_object('id', n.id, 'name', n.name, 'beruf', n.job, 'bereit', coalesce(r.sympathy, 0) >= 0, 'stimmung', npc_stimmung(coalesce(r.sympathy, 0))) order by n.name), '[]'::json)
       from npcs n left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid() where n.village_id = v.id)
  );
end;
$$;
revoke execute on function public.quest_list() from public, anon; grant execute on function public.quest_list() to authenticated;

create or replace function public.quest_start(p_quest text, p_begleiter bigint[]) returns json language plpgsql security definer set search_path = public as $$
declare t quest_templates; v villages; rid bigint; nein text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform ensure_starter_items(auth.uid());
  select * into t from quest_templates where id = p_quest; if not found then raise exception 'Unbekannte Quest'; end if;
  if exists (select 1 from quest_runs where player_id = auth.uid() and status = 'laeuft') then raise exception 'Du bist schon unterwegs'; end if;
  if (t.voraussetzung ? 'wissen') and not exists (select 1 from player_journal where player_id = auth.uid() and key = t.voraussetzung->>'wissen') then raise exception 'Davon weißt du noch nichts'; end if;
  select * into v from villages where owner_id = auth.uid();
  p_begleiter := coalesce(p_begleiter, '{}');
  if array_length(p_begleiter, 1) > 2 then raise exception 'Höchstens zwei Begleiter'; end if;
  if exists (select 1 from unnest(p_begleiter) b left join npcs n on n.id = b where n.id is null or n.village_id is distinct from v.id) then raise exception 'Begleiter müssen in deinem Dorf leben'; end if;
  select string_agg(n.name, ', ') into nein from npcs n left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid() where n.id = any(p_begleiter) and coalesce(r.sympathy, 0) < 0;
  if nein is not null then return json_build_object('ok', false, 'grund', 'Nicht bereit, mit dir zu gehen: ' || nein); end if;
  insert into quest_runs (player_id, quest_id, szene, begleiter) values (auth.uid(), t.id, t.def->>'start', p_begleiter) returning id into rid;
  return json_build_object('ok', true, 'view', quest_view(rid));
end;
$$;
revoke execute on function public.quest_start(text, bigint[]) from public, anon; grant execute on function public.quest_start(text, bigint[]) to authenticated;

create or replace function public.quest_abort(p_run bigint) returns json language plpgsql security definer set search_path = public as $$
begin
  update quest_runs set status = 'abgebrochen', updated_at = now() where id = p_run and player_id = auth.uid() and status = 'laeuft';
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.quest_abort(bigint) from public, anon; grant execute on function public.quest_abort(bigint) to authenticated;
