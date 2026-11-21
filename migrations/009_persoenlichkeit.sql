-- Migration 009: Eigenes Wissen jeder Figur, Persönlichkeit, Gerüchte über den Spieler, Gefallen,
-- Notizbuch über Menschen (Diplomatie), KI-Status/Sperre, Spielleiter-Token für die Edge Function.

-- Wahrheit der Welt (nur was eine Figur kennt, wird ihr gegeben)
create table if not exists public.lore (key text primary key, title text not null, text text not null);
alter table public.lore enable row level security;
revoke all on public.lore from anon, authenticated;
insert into public.lore (key, title, text) values
 ('mine', 'Die verlassene Mine', 'Oben am alten Pass hinter dem Wasserfall liegt eine verlassene Eisenmine. Die Bergleute sollen zu tief gegraben haben; es gab einen Einsturz, drei Männer kamen nicht heraus.'),
 ('mine_silber', 'Silber in der Mine', 'Im tiefsten Stollen der Mine glänzt es nicht nach Eisen, sondern nach Silber. Wer dort arbeitete, wollte nie zurück.'),
 ('mine_chronik', 'Die Hammerkerbe', 'Der alte Pass heißt im Volksmund Hammerkerbe; in alten Chroniken ist dort von einer Zwergenmine die Rede.'),
 ('mine_pfad', 'Der Pfad zur Mine', 'Der Weg zur Mine beginnt hinter der zweiten Bachbiegung, wo die Steine moosig sind; ein Wildwechsel führt hinauf.'),
 ('hirsch', 'Der Silberhirsch', 'Ein Hirsch mit silbernem Geweih erscheint im Nebel am Waldrand. Er soll über den Wald wachen; wer ihn jagt, dem bringt der Winter Unglück.'),
 ('hirsch_faehrte', 'Fährte des Silberhirschs', 'An der Lichtung im Osten sind hoch oben Zweige abgeknickt – dort zieht der Silberhirsch entlang.'),
 ('hirsch_bote', 'Ein Bote des Wandels', 'Der Silberhirsch erscheint, bevor sich im Tal etwas Großes ändert.'),
 ('feuer', 'Feuer jenseits der Berge', 'Ein Wanderer berichtete von brennenden Dörfern jenseits der Berge; Reiter unter schwarzem Banner sollen dahinterstecken.'),
 ('feuer_echt', 'Der Wanderer log nicht', 'Der Wanderer hatte Brandlöcher im Mantel und zitterte – die Geschichte ist wahr.'),
 ('wache', 'Wache im Nachbardorf', 'Das Dorf hinter dem Ostkamm hat Wachen aufgestellt. Warum, weiß niemand.'),
 ('nachbar_kontakt', 'Ein Kontakt hinter dem Ostkamm', 'Es gibt Verwandtschaft ins Dorf hinter dem Ostkamm; über sie könnte man Nachrichten schicken.'),
 ('lichter', 'Lichter im Wald', 'Nachts tanzen grünliche Lichter zwischen den Bäumen. Wer hinging, kam verstört zurück.'),
 ('lichter_eiche', 'Der Schrein unter der Eiche', 'Unter der großen Eiche im Westen stand einst ein Schrein; vielleicht führen die Lichter dorthin.'),
 ('lichter_zeit', 'Wann die Lichter tanzen', 'Die Lichter erscheinen in nebligen Nächten kurz vor Mitternacht am Waldrand hinter den Feldern.'),
 ('eisen', 'Eisen wird knapp', 'Eisen wird im ganzen Tal knapp, weil die Minen im Süden nichts mehr liefern.'),
 ('eisen_haendler', 'Ein Eisenhändler', 'Ein Händler kommt jeden Monat über die Brücke und tauscht Eisen gegen Felle oder Honig.')
on conflict (key) do nothing;

create table if not exists public.npc_profiles (
  npc_id bigint primary key references public.npcs(id) on delete cascade,
  herkunft text not null, ziel text not null, angst text not null, geheimnis text not null,
  staerken text not null, schwaechen text not null, eigenart text not null,
  sturheit smallint not null default 0 check (sturheit between -3 and 3),
  wissen text[] not null default '{}'
);
alter table public.npc_profiles enable row level security;
revoke all on public.npc_profiles from anon, authenticated;

-- Was eine Figur selbst erfahren oder gehört hat (auch über Spieler)
create table if not exists public.npc_knowledge (
  id bigint generated always as identity primary key,
  npc_id bigint not null references public.npcs(id) on delete cascade,
  key text not null, text text not null check (length(text) <= 300),
  about_player uuid references public.profiles(id) on delete cascade,
  source text, created_at timestamptz not null default now(),
  unique (npc_id, key)
);
create index if not exists npc_knowledge_npc_idx on public.npc_knowledge (npc_id, created_at desc);
create index if not exists npc_knowledge_player_idx on public.npc_knowledge (about_player);
alter table public.npc_knowledge enable row level security;
revoke all on public.npc_knowledge from anon, authenticated;

-- Notizbuch des Spielers über Menschen
create table if not exists public.player_notes (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  npc_id bigint not null references public.npcs(id) on delete cascade,
  kind text not null check (kind in ('begegnung', 'fakt', 'eindruck', 'gefallen')),
  key text, text text not null check (length(text) <= 500),
  created_at timestamptz not null default now()
);
create unique index if not exists player_notes_key_idx on public.player_notes (player_id, npc_id, key) where key is not null;
create index if not exists player_notes_idx on public.player_notes (player_id, npc_id, created_at desc);
alter table public.player_notes enable row level security;
revoke all on public.player_notes from anon, authenticated;

-- Gefallen und Versprechen (später in Quests einlösbar)
create table if not exists public.npc_favors (
  id bigint generated always as identity primary key,
  npc_id bigint not null references public.npcs(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  art text not null check (art in ('gefallen', 'versprechen', 'rabatt')),
  text text not null check (length(text) <= 200),
  status text not null default 'offen' check (status in ('offen', 'eingeloest', 'gebrochen')),
  created_at timestamptz not null default now()
);
create index if not exists npc_favors_idx on public.npc_favors (player_id, npc_id);
alter table public.npc_favors enable row level security;
revoke all on public.npc_favors from anon, authenticated;

-- Token: wird separat gesetzt (insert into app_private (k, v) values ('fn_token', …)); steht nicht im Repo.
create table if not exists public.app_private (k text primary key, v text not null);
alter table public.app_private enable row level security;
revoke all on public.app_private from anon, authenticated;
create table if not exists public.ai_state (id int primary key default 1 check (id = 1), blocked_until timestamptz, grund text);
insert into public.ai_state (id) values (1) on conflict do nothing;
alter table public.ai_state enable row level security;
revoke all on public.ai_state from anon, authenticated;

create or replace function public.fn_token_ok(p text) returns boolean language sql stable security definer set search_path = public as $$
  select p is not null and length(p) >= 32 and exists (select 1 from app_private where k = 'fn_token' and v = p);
$$;
revoke execute on function public.fn_token_ok(text) from public, anon, authenticated;

-- KI-Status für die Oberfläche
create or replace function public.ai_status() returns json language plpgsql stable security definer set search_path = public as $$
declare st record; u record;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into st from ai_state where id = 1;
  select * into u from ai_usage where player_id = auth.uid() and day = (now() at time zone 'utc')::date;
  if st.blocked_until is not null and st.blocked_until > now() then
    return json_build_object('verfuegbar', false, 'grund', coalesce(st.grund, 'gemini_limit'), 'bis', st.blocked_until, 'rest', greatest(0, 60 - coalesce(u.calls, 0)));
  end if;
  if coalesce(u.calls, 0) >= 60 then
    return json_build_object('verfuegbar', false, 'grund', 'tageslimit', 'bis', ((now() at time zone 'utc')::date + 1)::timestamp at time zone 'utc', 'rest', 0);
  end if;
  return json_build_object('verfuegbar', true, 'rest', 60 - coalesce(u.calls, 0));
end;
$$;
revoke execute on function public.ai_status() from public, anon;
grant execute on function public.ai_status() to authenticated;

create or replace function public.ai_take_quota()
returns json language plpgsql security definer set search_path = public as $$
declare u record; d date := (now() at time zone 'utc')::date; st record;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into st from ai_state where id = 1;
  if st.blocked_until is not null and st.blocked_until > now() then return json_build_object('ok', false, 'grund', coalesce(st.grund, 'gemini_limit'), 'bis', st.blocked_until); end if;
  insert into ai_usage (player_id, day, calls, last_at) values (auth.uid(), d, 0, now() - interval '1 minute') on conflict do nothing;
  select * into u from ai_usage where player_id = auth.uid() and day = d for update;
  if u.calls >= 60 then return json_build_object('ok', false, 'grund', 'tageslimit', 'bis', (d + 1)::timestamp at time zone 'utc'); end if;
  if u.last_at > now() - interval '3 seconds' then return json_build_object('ok', false, 'grund', 'zu_schnell'); end if;
  update ai_usage set calls = calls + 1, last_at = now() where player_id = auth.uid() and day = d;
  return json_build_object('ok', true, 'rest', 59 - u.calls);
end;
$$;

create or replace function public.ai_mark_blocked(p_token text, p_until timestamptz, p_grund text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not fn_token_ok(p_token) then raise exception 'Nicht erlaubt'; end if;
  update ai_state set blocked_until = least(p_until, now() + interval '24 hours'), grund = left(p_grund, 40) where id = 1;
end;
$$;
revoke execute on function public.ai_mark_blocked(text, timestamptz, text) from public, anon;
grant execute on function public.ai_mark_blocked(text, timestamptz, text) to authenticated;

-- Zugriffsprüfung: eigene Bewohner oder Wanderer
create or replace function public.npc_reachable(p_npc bigint) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from npcs n where n.id = p_npc and (n.village_id is null or exists (select 1 from villages v where v.id = n.village_id and v.owner_id = auth.uid())));
$$;
revoke execute on function public.npc_reachable(bigint) from public, anon, authenticated;

-- Gerücht über eine Tat des Spielers verbreitet sich an die Freunde der Figur; deren Sympathie ändert sich leicht
create or replace function public.spread_deed(p_npc bigint, p_player uuid, p_key text, p_text text, p_delta int) returns void language plpgsql security definer set search_path = public as $$
begin
  with friends as (
    select case when b.npc_a = p_npc then b.npc_b else b.npc_a end as fid
    from npc_bonds b where (b.npc_a = p_npc or b.npc_b = p_npc) and b.sympathy >= 30
  ), ins as (
    insert into npc_knowledge (npc_id, key, text, about_player, source)
    select fid, p_key || ':' || p_player || ':' || current_date, left(p_text, 300), p_player, (select name from npcs where id = p_npc) from friends
    on conflict (npc_id, key) do nothing returning npc_id
  )
  insert into npc_relations (npc_id, player_id, sympathy, loyalty)
  select npc_id, p_player, greatest(-100, least(100, p_delta)), 0 from ins
  on conflict (npc_id, player_id) do update set sympathy = greatest(-100, least(100, npc_relations.sympathy + p_delta)), updated_at = now();
end;
$$;
revoke execute on function public.spread_deed(bigint, uuid, text, text, int) from public, anon, authenticated;

-- Gespräch (wie 007) + Taten sprechen sich herum
create or replace function public.talk_to_npc(p_npc bigint, p_tone text, p_topic text, p_conv text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); n record; r record; t jsonb; d int; recent boolean; gained int; react text; mem text; s int; l int; me text;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  if p_tone is null or p_tone <> all (array['freundlich', 'loben', 'scherzen', 'helfen', 'fragen', 'kritisieren']) then raise exception 'Ungültiger Ton'; end if;
  if p_topic is null or p_topic <> all (array['alltag', 'arbeit', 'wetter', 'dorf', 'freunde', 'sorgen', 'geruechte', 'persoenlich']) then p_topic := 'alltag'; end if;
  if p_conv is not null and length(p_conv) > 40 then raise exception 'Ungültig'; end if;
  select * into n from npcs where id = p_npc;
  if not found then raise exception 'Unbekannte Person'; end if;
  if not npc_reachable(p_npc) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  t := n.traits; select character_name into me from profiles where id = v_uid;
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
  if p_tone = 'kritisieren' and d <= -3 then perform spread_deed(p_npc, v_uid, 'kritik', coalesce(me, 'Der Dorfmeister') || ' hat ' || n.name || 's Arbeit schlechtgemacht.', -1); end if;
  if p_tone = 'helfen' and d > 2 then perform spread_deed(p_npc, v_uid, 'hilfe', coalesce(me, 'Der Dorfmeister') || ' hat ' || n.name || ' Hilfe angeboten.', 1); end if;
  return json_build_object('reaktion', react, 'stimmung', npc_stimmung(s), 'erinnerung', mem);
end;
$$;

-- Probe (wie 007) + Sturheit der Figur + Taten sprechen sich herum
create or replace function public.talk_check(p_npc bigint, p_check text, p_conv text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); n record; r record; me record; t jsonb; a jsonb; skill text; dc int; fav text; roll int; md int; bonus int; ok boolean; d int; s int; recent boolean; react text; mem text; stur int;
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
  if not npc_reachable(p_npc) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  select race, coalesce(herkunft, 'waldlaeufer') as herkunft, character_name into me from profiles where id = v_uid;
  a := char_attrs(me.race, me.herkunft); t := n.traits;
  select coalesce(sturheit, 0) into stur from npc_profiles where npc_id = p_npc; stur := coalesce(stur, 0);
  if p_check in ('ueberreden', 'feilschen', 'einschuechtern', 'menschenkenntnis') then dc := dc + stur; end if;
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
  if p_check = 'einschuechtern' then perform spread_deed(p_npc, v_uid, 'drohung', coalesce(me.character_name, 'Der Dorfmeister') || ' hat ' || n.name || ' eingeschüchtert.', -2); end if;
  if ok and p_check in ('anpacken', 'heilkunde', 'beruhigen') then perform spread_deed(p_npc, v_uid, 'gutetat', coalesce(me.character_name, 'Der Dorfmeister') || ' war gut zu ' || n.name || ' und hat geholfen.', 1); end if;
  return json_build_object('wurf', roll, 'mod', md, 'bonus', bonus, 'dc', dc, 'gesamt', roll + md + bonus, 'erfolg', ok, 'eigenschaft', skill, 'reaktion', react, 'stimmung', npc_stimmung(s));
end;
$$;

-- Was die Oberfläche über eine Figur wissen darf (ohne Geheimnisse)
create or replace function public.get_npc_brief(p_npc bigint) returns json language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if not npc_reachable(p_npc) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  return json_build_object(
    'wissen', coalesce((select wissen from npc_profiles where npc_id = p_npc), '{}'),
    'gefragt', (select coalesce(json_agg(key), '[]'::json) from player_notes where player_id = auth.uid() and npc_id = p_npc and kind = 'fakt'),
    'gehoert', (select coalesce(json_agg(text), '[]'::json) from (select text from npc_knowledge where npc_id = p_npc and about_player = auth.uid() order by created_at desc limit 3) k)
  );
end;
$$;
revoke execute on function public.get_npc_brief(bigint) from public, anon;
grant execute on function public.get_npc_brief(bigint) to authenticated;

-- Persönliches erfragen: die Figur öffnet sich nur, wenn genug Vertrauen da ist
create or replace function public.ask_personal(p_npc bigint, p_what text, p_conv text default null) returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); n record; pr record; s int; ok boolean; txt text; gesell int; menschen boolean;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  if p_what is null or p_what <> all (array['herkunft', 'ziel', 'angst', 'geheimnis']) then raise exception 'Ungültig'; end if;
  if not npc_reachable(p_npc) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  select * into n from npcs where id = p_npc; select * into pr from npc_profiles where npc_id = p_npc;
  if not found then return json_build_object('ok', false, 'grund', 'unbekannt'); end if;
  select coalesce(sympathy, 0) into s from npc_relations where npc_id = p_npc and player_id = v_uid; s := coalesce(s, 0);
  gesell := coalesce((n.traits->>'geselligkeit')::int, 50);
  select exists (select 1 from npc_memories where npc_id = p_npc and player_id = v_uid and kind = 'probe' and text = 'menschenkenntnis:gelungen' and created_at > now() - interval '30 minutes' and (p_conv is null or conv = p_conv)) into menschen;
  ok := case p_what
    when 'herkunft' then s >= case when gesell < 20 then 10 else -10 end
    when 'ziel' then s >= 5 or gesell >= 70
    when 'angst' then s >= 25 or (menschen and s >= 10)
    else s >= 50 or (menschen and s >= 20) end;
  if not ok then return json_build_object('ok', false, 'grund', 'vertrauen'); end if;
  txt := case p_what when 'herkunft' then pr.herkunft when 'ziel' then pr.ziel when 'angst' then pr.angst else pr.geheimnis end;
  insert into player_notes (player_id, npc_id, kind, key, text) values (v_uid, p_npc, 'fakt', p_what,
    case p_what when 'herkunft' then 'Über die Herkunft: „' when 'ziel' then 'Was ' || n.name || ' sich wünscht: „' when 'angst' then 'Wovor ' || n.name || ' Angst hat: „' else 'Ein Geheimnis, das ' || n.name || ' mir anvertraut hat: „' end || txt || '“')
  on conflict do nothing;
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta, conv) values (p_npc, v_uid, 'gespraech',
    case p_what when 'geheimnis' then 'Ich habe dir mein Geheimnis anvertraut.' when 'angst' then 'Ich habe dir von meiner Angst erzählt.' when 'ziel' then 'Ich habe dir erzählt, was ich mir wünsche.' else 'Ich habe dir erzählt, woher ich komme.' end, 0, p_conv);
  if p_what = 'geheimnis' then update npc_relations set loyalty = least(100, loyalty + 3) where npc_id = p_npc and player_id = v_uid; end if;
  return json_build_object('ok', true, 'text', txt);
end;
$$;
revoke execute on function public.ask_personal(bigint, text, text) from public, anon;
grant execute on function public.ask_personal(bigint, text, text) to authenticated;

-- Notizen des Spielers (eigenes Notizbuch)
create or replace function public.add_note(p_npc bigint, p_kind text, p_text text, p_key text default null) returns json language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_kind <> all (array['begegnung', 'eindruck']) then raise exception 'Ungültig'; end if;
  if not npc_reachable(p_npc) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  if p_key is not null and p_key !~ '^[a-z0-9_]{2,40}$' then raise exception 'Ungültiger Schlüssel'; end if;
  insert into player_notes (player_id, npc_id, kind, key, text) values (auth.uid(), p_npc, p_kind, p_key, left(p_text, 500)) on conflict do nothing;
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.add_note(bigint, text, text, text) from public, anon;
grant execute on function public.add_note(bigint, text, text, text) to authenticated;

-- Nur die Edge Function (mit Token) darf KI-Erinnerungen und Gefallen eintragen
create or replace function public.npc_remember(p_token text, p_npc bigint, p_text text, p_conv text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not fn_token_ok(p_token) then raise exception 'Nicht erlaubt'; end if;
  if auth.uid() is null or not npc_reachable(p_npc) then raise exception 'Nicht erlaubt'; end if;
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta, conv) values (p_npc, auth.uid(), 'ki', left(p_text, 200), 0, left(p_conv, 40));
end;
$$;
revoke execute on function public.npc_remember(text, bigint, text, text) from public, anon;
grant execute on function public.npc_remember(text, bigint, text, text) to authenticated;

create or replace function public.add_favor(p_token text, p_npc bigint, p_art text, p_text text) returns json language plpgsql security definer set search_path = public as $$
declare s int; n text;
begin
  if not fn_token_ok(p_token) then raise exception 'Nicht erlaubt'; end if;
  if auth.uid() is null or not npc_reachable(p_npc) then raise exception 'Nicht erlaubt'; end if;
  if p_art <> all (array['gefallen', 'versprechen', 'rabatt']) then raise exception 'Ungültig'; end if;
  select coalesce(sympathy, 0) into s from npc_relations where npc_id = p_npc and player_id = auth.uid();
  if coalesce(s, 0) < 10 then return json_build_object('ok', false, 'grund', 'vertrauen'); end if;
  if (select count(*) from npc_favors where npc_id = p_npc and player_id = auth.uid() and status = 'offen') >= 2 then return json_build_object('ok', false, 'grund', 'genug'); end if;
  if exists (select 1 from npc_favors where npc_id = p_npc and player_id = auth.uid() and created_at > now() - interval '20 hours') then return json_build_object('ok', false, 'grund', 'heute_schon'); end if;
  select name into n from npcs where id = p_npc;
  insert into npc_favors (npc_id, player_id, art, text) values (p_npc, auth.uid(), p_art, left(p_text, 200));
  insert into player_notes (player_id, npc_id, kind, text) values (auth.uid(), p_npc, 'gefallen', case p_art when 'gefallen' then n || ' schuldet mir einen Gefallen: ' when 'versprechen' then n || ' hat mir versprochen: ' else n || ' macht mir einen besseren Preis: ' end || left(p_text, 200));
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.add_favor(text, bigint, text, text) from public, anon;
grant execute on function public.add_favor(text, bigint, text, text) to authenticated;

-- Kontext für die KI: nur das eigene Wissen der Figur
create or replace function public.get_npc_context(p_npc bigint)
returns json language plpgsql stable security definer set search_path = public as $$
declare n record; v_uid uuid := auth.uid(); r record; pr record;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  select * into n from npcs where id = p_npc;
  if not found then raise exception 'Unbekannte Person'; end if;
  if not npc_reachable(p_npc) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  select * into r from npc_relations where npc_id = p_npc and player_id = v_uid;
  select * into pr from npc_profiles where npc_id = p_npc;
  return json_build_object(
    'npc', json_build_object('name', n.name, 'beruf', n.job, 'wesen', npc_wesen(n.traits), 'stimmung_zum_helden', npc_stimmung(coalesce(r.sympathy, 0)), 'kennt_den_helden', r.npc_id is not null,
      'vertrauen', case when coalesce(r.sympathy, 0) >= 50 then 'hoch' when coalesce(r.sympathy, 0) >= 20 then 'mittel' when coalesce(r.sympathy, 0) >= -10 then 'gering' else 'keins' end,
      'loyalitaet', case when coalesce(r.loyalty, 0) >= 40 then 'hoch' when coalesce(r.loyalty, 0) >= 15 then 'wachsend' else 'gering' end,
      'herkunft', pr.herkunft, 'ziel', pr.ziel, 'angst', pr.angst, 'geheimnis', pr.geheimnis, 'staerken', pr.staerken, 'schwaechen', pr.schwaechen, 'eigenart', pr.eigenart,
      'ueberzeugbarkeit', case when coalesce(pr.sturheit, 0) >= 2 then 'sehr stur' when coalesce(pr.sturheit, 0) = 1 then 'eher stur' when coalesce(pr.sturheit, 0) <= -2 then 'leicht zu überzeugen' else 'normal' end),
    'eigenes_wissen', (select coalesce(json_agg(l.text), '[]'::json) from lore l where l.key = any(coalesce(pr.wissen, '{}'))),
    'gehoert', (select coalesce(json_agg(k.source || ' erzählte: ' || k.text), '[]'::json) from (select source, text from npc_knowledge where npc_id = p_npc order by created_at desc limit 8) k),
    'erinnerungen', (select coalesce(json_agg(m.text), '[]'::json) from (select text from npc_memories where npc_id = p_npc and player_id = v_uid and kind in ('gespraech', 'ki') order by created_at desc limit 8) m),
    'gefallen', (select coalesce(json_agg(f.art || ': ' || f.text), '[]'::json) from npc_favors f where f.npc_id = p_npc and f.player_id = v_uid and f.status = 'offen'),
    'held', (select json_build_object('name', p.character_name, 'volk', coalesce(p.race, 'mensch'), 'herkunft', coalesce(p.herkunft, 'waldlaeufer'), 'eigenschaften', char_attrs(p.race, coalesce(p.herkunft, 'waldlaeufer'))) from profiles p where p.id = v_uid),
    'tagebuch_des_helden', (select coalesce(json_agg(j.title), '[]'::json) from (select title from player_journal where player_id = v_uid order by created_at desc limit 12) j),
    'freunde', (select coalesce(json_agg(o.name), '[]'::json) from (select x.name from npc_bonds b join npcs x on x.id = case when b.npc_a = p_npc then b.npc_b else b.npc_a end where (b.npc_a = p_npc or b.npc_b = p_npc) and b.sympathy >= 40 limit 3) o),
    'rivalen', (select coalesce(json_agg(o.name), '[]'::json) from (select x.name from npc_bonds b join npcs x on x.id = case when b.npc_a = p_npc then b.npc_b else b.npc_a end where (b.npc_a = p_npc or b.npc_b = p_npc) and b.sympathy <= -30 limit 2) o)
  );
end;
$$;

-- Notizbuch über Menschen (Diplomatie-Reiter): keine Zahlen, nur Eindrücke und Erlebtes
create or replace function public.get_people_notes() returns json language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  return (
    select coalesce(json_agg(x order by x->>'gruppe', x->>'name'), '[]'::json) from (
      select json_build_object(
        'id', n.id, 'name', n.name, 'beruf', n.job, 'wesen', npc_wesen(n.traits),
        'gruppe', case when v.owner_id = v_uid then 'dorf' else 'begegnung' end,
        'eindruck',
          case
            when r.npc_id is null then 'Ich kenne ' || n.name || ' bisher nur vom Sehen.'
            when r.sympathy >= 60 and r.loyalty >= 20 then n.name || ' würde mir beistehen, wenn es hart auf hart kommt. Ich vertraue ' || n.name || '.'
            when r.sympathy >= 35 then 'Ich glaube, ' || n.name || ' mag mich. Wir verstehen uns gut.'
            when r.sympathy >= 10 then n.name || ' ist freundlich zu mir, aber richtig kennen wir uns noch nicht.'
            when r.sympathy > -10 then 'Schwer zu sagen, was ' || n.name || ' von mir hält.'
            when r.sympathy > -35 then n.name || ' begegnet mir mit Misstrauen. Ich sollte vorsichtig sein.'
            else n.name || ' kann mich nicht ausstehen. Hilfe erwarte ich von dort keine.' end
          || case when r.npc_id is null then '' else ' ' || case npc_wesen(n.traits)
            when 'gesellig' then 'Ein offener Mensch, der gern redet.' when 'wortkarg' then 'Redet nicht viel – Worte muss man sich verdienen.'
            when 'stolz' then 'Stolz. Mit Druck kommt man da nicht weit.' when 'ängstlich' then 'Wirkt oft besorgt.'
            when 'geschäftstüchtig' then 'Denkt in Preisen und Gegenleistungen.' when 'fleißig' then 'Immer bei der Arbeit.'
            when 'gemütlich' then 'Lässt sich durch nichts aus der Ruhe bringen.' when 'treu' then 'Steht zu den Seinen.' else 'Ein bodenständiger Mensch.' end end
          || case when r.npc_id is not null and (select count(*) from npc_memories m where m.npc_id = n.id and m.player_id = v_uid) >= 4 then
               case when coalesce(pr.sturheit, 0) >= 2 then ' Lässt sich kaum umstimmen.' when coalesce(pr.sturheit, 0) <= -2 then ' Lässt sich gut überzeugen.' else '' end else '' end,
        'notizen', (select coalesce(json_agg(json_build_object('art', pn.kind, 'text', pn.text, 'am', pn.created_at) order by pn.created_at desc), '[]'::json) from (select * from player_notes where player_id = v_uid and npc_id = n.id order by created_at desc limit 12) pn),
        'gefallen', (select coalesce(json_agg(f.text), '[]'::json) from npc_favors f where f.npc_id = n.id and f.player_id = v_uid and f.status = 'offen'),
        'erlebt', (select count(*) from npc_memories m where m.npc_id = n.id and m.player_id = v_uid)
      ) as x
      from npcs n left join villages v on v.id = n.village_id
      left join npc_relations r on r.npc_id = n.id and r.player_id = v_uid
      left join npc_profiles pr on pr.npc_id = n.id
      where v.owner_id = v_uid or r.npc_id is not null
    ) q
  );
end;
$$;
revoke execute on function public.get_people_notes() from public, anon;
grant execute on function public.get_people_notes() to authenticated;

-- Was man sich im Tal über den Spieler erzählt
create or replace function public.get_my_reputation() returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('wer', n.name, 'text', k.text, 'quelle', k.source) order by k.created_at desc), '[]'::json)
  from (select * from npc_knowledge where about_player = auth.uid() order by created_at desc limit 10) k join npcs n on n.id = k.npc_id;
$$;
revoke execute on function public.get_my_reputation() from public, anon;
grant execute on function public.get_my_reputation() to authenticated;
insert into public.npc_profiles (npc_id, herkunft, ziel, angst, geheimnis, staerken, schwaechen, eigenart, sturheit, wissen) values
(1, 'Ich komme aus dem Tal jenseits des Ostkamms. Ich habe als Kind einen Brand überlebt. Seitdem fange ich lieber neu an, als zurückzuschauen.', 'Ich will einmal über die Berge ziehen und sehen, was dahinter liegt.', 'Allein zu sein, wenn ich alt bin.', 'Mein richtiger Name ist ein anderer. Ich habe ihn abgelegt, als ich hierher kam.', 'verlässlich im Handwerk', 'bequem, schiebt Arbeit gern auf', 'misstraut allem, was neu ist', 0, array['feuer']::text[]),
(2, 'Ich komme aus dem Tal jenseits des Ostkamms. Ich kam wegen der Liebe. Die ist fort – geblieben bin ich wegen des Tals.', 'Ich will einmal über die Berge ziehen und sehen, was dahinter liegt.', 'Krankheit. Ich habe zu viele daran sterben sehen.', 'Ich besuche heimlich jemanden im Dorf hinter dem Ostkamm.', 'treu, hält Wort, mutig, packt zu, wenn andere zögern, bringt Leute zusammen und zum Lachen', 'bequem, schiebt Arbeit gern auf, denkt zuerst an den eigenen Vorteil', 'riecht immer ein wenig nach Rauch', 1, array['mine','eisen','mine_silber','mine_chronik']::text[]),
(3, 'Ich komme aus einem Kloster – ich bin dort als Waise aufgewachsen. Den harten Winter vor zehn Jahren haben nur wenige überstanden. Ich war einer davon.', 'Ich möchte jemanden finden, mit dem ich alt werden kann.', 'Die Dunkelheit im Wald. Seit ich ein Kind war, gehe ich nachts nicht hinein.', 'Ich kann gar nicht richtig lesen. Ich tue nur so.', 'bringt Leute zusammen und zum Lachen', 'denkt zuerst an den eigenen Vorteil, wechselt schnell die Seiten, wenn es sich lohnt', 'flucht leise vor sich hin', -2, array['mine']::text[]),
(4, 'Ich komme aus der Flussniederung, wo jeden Frühling das Wasser kommt. Als das Hochwasser kam, haben wir alles verloren.', 'Ich möchte jemanden finden, mit dem ich alt werden kann.', 'Feuer. Ich habe gesehen, was es anrichtet.', 'Ich trage einen Brief meiner Mutter bei mir, den ich nie geöffnet habe.', 'bringt Leute zusammen und zum Lachen, großzügig', 'ängstlich, meidet Streit', 'summt beim Arbeiten alte Lieder', -3, array['feuer']::text[]),
(5, 'Ich komme aus einem Kloster – ich bin dort als Waise aufgewachsen. Nach einem Streit mit meinem Bruder musste ich gehen.', 'Ich will einmal über die Berge ziehen und sehen, was dahinter liegt.', 'Allein zu sein, wenn ich alt bin.', 'Als junger Mensch habe ich gestohlen, um zu überleben.', 'mutig, packt zu, wenn andere zögern, großzügig', 'bequem, schiebt Arbeit gern auf, verschlossen, vertraut kaum jemandem, stur und stolz', 'sammelt glatte Flusskiesel', 3, array['lichter']::text[]),
(6, 'Ich komme aus der Flussniederung, wo jeden Frühling das Wasser kommt. Als das Hochwasser kam, haben wir alles verloren.', 'Ich träume davon, einmal ein Fest für das ganze Tal auszurichten.', 'Feuer. Ich habe gesehen, was es anrichtet.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'bringt Leute zusammen und zum Lachen, großzügig', 'bequem, schiebt Arbeit gern auf, wechselt schnell die Seiten, wenn es sich lohnt, ängstlich, meidet Streit', 'redet bei der Arbeit mit dem Werkzeug', -3, array['lichter']::text[]),
(7, 'Ich komme aus den Sümpfen im Westen. Ich war Soldat, bevor ich das hier gelernt habe. Darüber rede ich nicht gern.', 'Ich will, dass meine Kinder es einmal besser haben als ich.', 'Die Dunkelheit im Wald. Seit ich ein Kind war, gehe ich nachts nicht hinein.', 'Ich habe auf den Silberhirsch geschossen. Seitdem verfolgt mich das Pech.', 'unermüdlich bei der Arbeit, treu, hält Wort', 'ängstlich, meidet Streit', 'redet bei der Arbeit mit dem Werkzeug', 0, array['lichter','lichter_eiche']::text[]),
(8, 'Ich komme von hier, aus dem Tal – meine Familie lebt seit Generationen hier. Ich habe als Kind einen Brand überlebt. Seitdem fange ich lieber neu an, als zurückzuschauen.', 'Ich will genug Silber sparen, um mir ein Haus aus Stein zu bauen.', 'Dass man mich vergisst, wenn ich nicht mehr bin.', 'Ich kann gar nicht richtig lesen. Ich tue nur so.', 'unermüdlich bei der Arbeit', 'denkt zuerst an den eigenen Vorteil', 'flucht leise vor sich hin', 1, array['hirsch','lichter','mine','hirsch_bote','mine_pfad']::text[]),
(9, 'Ich komme von einem Hof oben am Pass. Ich habe als Kind einen Brand überlebt. Seitdem fange ich lieber neu an, als zurückzuschauen.', 'Ich will die verlassene Mine mit eigenen Augen sehen.', 'Dass ich versage, wenn es wirklich darauf ankommt.', 'Ich besitze ein Stück einer alten Karte. Ich zeige es niemandem.', 'mutig, packt zu, wenn andere zögern, großzügig', 'wechselt schnell die Seiten, wenn es sich lohnt, stur und stolz', 'spricht nie über die Vergangenheit', 2, array['hirsch','lichter','hirsch_faehrte','hirsch_bote']::text[]),
(10, 'Ich komme aus einer Familie von Wanderhändlern, wir waren nie lange an einem Ort. Nach einem Streit mit meinem Bruder musste ich gehen.', 'Ich will meine Schwester finden. Sie ist im Krieg jenseits der Berge verschwunden.', 'Dass man mich auslacht, wenn ich etwas falsch mache.', 'Ich kann gar nicht richtig lesen. Ich tue nur so.', 'unermüdlich bei der Arbeit, treu, hält Wort, großzügig', 'ängstlich, meidet Streit', 'erzählt gern dieselben Geschichten', 0, array['hirsch','lichter','hirsch_faehrte','hirsch_bote','lichter_eiche','lichter_zeit']::text[]),
(11, 'Ich komme aus einem Fischerdorf an der Küste, drei Wochen Fußmarsch von hier. Ein Wanderprediger hat mir gesagt, hier würde ich gebraucht.', 'Ich will etwas schaffen, das mich überdauert.', 'Die Reiter mit dem schwarzen Banner. Ich träume von ihnen.', 'Ich trage einen Brief meiner Mutter bei mir, den ich nie geöffnet habe.', 'unermüdlich bei der Arbeit', 'wechselt schnell die Seiten, wenn es sich lohnt, ängstlich, meidet Streit, verschlossen, vertraut kaum jemandem', 'sammelt glatte Flusskiesel', 0, array['feuer']::text[]),
(12, 'Ich komme aus der Flussniederung, wo jeden Frühling das Wasser kommt. Ich war Soldat, bevor ich das hier gelernt habe. Darüber rede ich nicht gern.', 'Ich will, dass dieses Dorf nie wieder leer steht. Dafür würde ich viel tun.', 'Dass das Dorf zerfällt, wenn sich keiner kümmert.', 'Mein richtiger Name ist ein anderer. Ich habe ihn abgelegt, als ich hierher kam.', 'unermüdlich bei der Arbeit, treu, hält Wort, mutig, packt zu, wenn andere zögern, bringt Leute zusammen und zum Lachen', 'nachtragend, wenn man gekränkt hat', 'schnitzt in jeder Pause kleine Figuren', 1, array['feuer']::text[]),
(13, 'Ich komme von einem Hof oben am Pass. Den harten Winter vor zehn Jahren haben nur wenige überstanden. Ich war einer davon.', 'Ich will etwas schaffen, das mich überdauert.', 'Die Reiter mit dem schwarzen Banner. Ich träume von ihnen.', 'Ich habe einmal jemanden im Stich gelassen, der mich gebraucht hätte.', 'großzügig', 'ängstlich, meidet Streit', 'riecht immer ein wenig nach Rauch', -1, array['hirsch','lichter','hirsch_faehrte','hirsch_bote']::text[]),
(14, 'Ich komme aus dem Tal jenseits des Ostkamms. Ich war Soldat, bevor ich das hier gelernt habe. Darüber rede ich nicht gern.', 'Ich will etwas schaffen, das mich überdauert.', 'Dass man mich auslacht, wenn ich etwas falsch mache.', 'Ich besuche heimlich jemanden im Dorf hinter dem Ostkamm.', 'unermüdlich bei der Arbeit', 'ängstlich, meidet Streit', 'flucht leise vor sich hin', 0, array['eisen']::text[]),
(15, 'Ich komme aus einer Stadt im Süden, die ich nie wiedersehen will. Ein Wanderprediger hat mir gesagt, hier würde ich gebraucht.', 'Ich will, dass dieses Dorf nie wieder leer steht. Dafür würde ich viel tun.', 'Krankheit. Ich habe zu viele daran sterben sehen.', 'Ich habe einmal Geld aus der Dorfkasse genommen, als es mir schlecht ging. Zurückgezahlt habe ich es nie.', 'treu, hält Wort, großzügig', 'bequem, schiebt Arbeit gern auf, verschlossen, vertraut kaum jemandem', 'flucht leise vor sich hin', 1, array['hirsch']::text[]),
(16, 'Ich komme aus einer Stadt im Süden, die ich nie wiedersehen will. Ich kam wegen der Liebe. Die ist fort – geblieben bin ich wegen des Tals.', 'Ich träume davon, einmal ein Fest für das ganze Tal auszurichten.', 'Dass das Dorf zerfällt, wenn sich keiner kümmert.', 'Ich besitze ein Stück einer alten Karte. Ich zeige es niemandem.', 'unermüdlich bei der Arbeit, mutig, packt zu, wenn andere zögern, bringt Leute zusammen und zum Lachen, großzügig', 'wechselt schnell die Seiten, wenn es sich lohnt', 'summt beim Arbeiten alte Lieder', 0, array['mine','eisen','mine_chronik','mine_pfad','eisen_haendler']::text[]),
(17, 'Ich komme aus einer Stadt im Süden, die ich nie wiedersehen will. Mein Vater hat mir das Handwerk beigebracht, kurz bevor er starb.', 'Ich will etwas schaffen, das mich überdauert.', 'Krankheit. Ich habe zu viele daran sterben sehen.', 'Ich besitze ein Stück einer alten Karte. Ich zeige es niemandem.', 'unermüdlich bei der Arbeit, großzügig', 'wechselt schnell die Seiten, wenn es sich lohnt', 'erzählt gern dieselben Geschichten', -1, array['hirsch']::text[]),
(18, 'Ich komme aus einer Stadt im Süden, die ich nie wiedersehen will. Mit sechzehn bin ich davongelaufen und nie zurückgekehrt.', 'Ich will, dass meine Kinder es einmal besser haben als ich.', 'Die Dunkelheit im Wald. Seit ich ein Kind war, gehe ich nachts nicht hinein.', 'Ich besuche heimlich jemanden im Dorf hinter dem Ostkamm.', 'verlässlich im Handwerk', 'ängstlich, meidet Streit, verschlossen, vertraut kaum jemandem', 'erzählt gern dieselben Geschichten', 0, array['eisen']::text[]),
(19, 'Ich komme aus einer Stadt im Süden, die ich nie wiedersehen will. Den harten Winter vor zehn Jahren haben nur wenige überstanden. Ich war einer davon.', 'Ich will genug Silber sparen, um mir ein Haus aus Stein zu bauen.', 'Krankheit. Ich habe zu viele daran sterben sehen.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'verlässlich im Handwerk', 'denkt zuerst an den eigenen Vorteil, verschlossen, vertraut kaum jemandem', 'redet bei der Arbeit mit dem Werkzeug', 1, array['lichter','lichter_zeit']::text[]),
(20, 'Ich komme von hier, aus dem Tal – meine Familie lebt seit Generationen hier. Mein Vater hat mir das Handwerk beigebracht, kurz bevor er starb.', 'Ich möchte jemanden finden, mit dem ich alt werden kann.', 'Die Dunkelheit im Wald. Seit ich ein Kind war, gehe ich nachts nicht hinein.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'großzügig', 'wechselt schnell die Seiten, wenn es sich lohnt, ängstlich, meidet Streit', 'sammelt glatte Flusskiesel', -3, array['lichter','hirsch','mine','lichter_eiche','lichter_zeit','hirsch_bote','mine_pfad']::text[]),
(21, 'Ich komme aus den Sümpfen im Westen. Ich kam wegen der Liebe. Die ist fort – geblieben bin ich wegen des Tals.', 'Ich möchte jemanden finden, mit dem ich alt werden kann.', 'Feuer. Ich habe gesehen, was es anrichtet.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'bringt Leute zusammen und zum Lachen', 'bequem, schiebt Arbeit gern auf, wechselt schnell die Seiten, wenn es sich lohnt, ängstlich, meidet Streit', 'sammelt glatte Flusskiesel', -3, array['feuer']::text[]),
(22, 'Ich komme von hier, aus dem Tal – meine Familie lebt seit Generationen hier. Mein Vater hat mir das Handwerk beigebracht, kurz bevor er starb.', 'Ich will einmal über die Berge ziehen und sehen, was dahinter liegt.', 'Allein zu sein, wenn ich alt bin.', 'Ich habe einmal Geld aus der Dorfkasse genommen, als es mir schlecht ging. Zurückgezahlt habe ich es nie.', 'treu, hält Wort, mutig, packt zu, wenn andere zögern', 'denkt zuerst an den eigenen Vorteil, verschlossen, vertraut kaum jemandem, stur und stolz', 'lacht laut und ansteckend', 3, array['feuer','wache','feuer_echt','nachbar_kontakt']::text[]),
(23, 'Ich komme aus einem Fischerdorf an der Küste, drei Wochen Fußmarsch von hier. Ich kam wegen der Liebe. Die ist fort – geblieben bin ich wegen des Tals.', 'Ich will einfach in Ruhe leben und meinen Frieden haben.', 'Dass man mich vergisst, wenn ich nicht mehr bin.', 'Ich kann gar nicht richtig lesen. Ich tue nur so.', 'verlässlich im Handwerk', 'wechselt schnell die Seiten, wenn es sich lohnt', 'spricht nie über die Vergangenheit', 0, array['wache']::text[]),
(24, 'Ich komme aus dem Tal jenseits des Ostkamms. Den harten Winter vor zehn Jahren haben nur wenige überstanden. Ich war einer davon.', 'Ich will etwas tun, über das man noch in hundert Jahren redet.', 'Dass ich versage, wenn es wirklich darauf ankommt.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'mutig, packt zu, wenn andere zögern', 'bequem, schiebt Arbeit gern auf, denkt zuerst an den eigenen Vorteil', 'flucht leise vor sich hin', 2, array['feuer','feuer_echt']::text[]),
(25, 'Ich komme aus dem Tal jenseits des Ostkamms. Ich kam wegen der Liebe. Die ist fort – geblieben bin ich wegen des Tals.', 'Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Dass man mich vergisst, wenn ich nicht mehr bin.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'unermüdlich bei der Arbeit', 'nachtragend, wenn man gekränkt hat', 'erzählt gern dieselben Geschichten', -1, array['mine','mine_pfad']::text[]),
(26, 'Ich komme aus einer Familie von Wanderhändlern, wir waren nie lange an einem Ort. Den harten Winter vor zehn Jahren haben nur wenige überstanden. Ich war einer davon.', 'Ich will, dass dieses Dorf nie wieder leer steht. Dafür würde ich viel tun.', 'Dass ich versage, wenn es wirklich darauf ankommt.', 'Ich besuche heimlich jemanden im Dorf hinter dem Ostkamm.', 'verlässlich im Handwerk', 'verschlossen, vertraut kaum jemandem', 'misstraut allem, was neu ist', 2, array['hirsch','hirsch_bote']::text[]),
(27, 'Ich komme aus einem Bergdorf im Norden, das es heute nicht mehr gibt. Nach einem Streit mit meinem Bruder musste ich gehen.', 'Ich möchte jemanden finden, mit dem ich alt werden kann.', 'Dass das Dorf zerfällt, wenn sich keiner kümmert.', 'Ich besitze ein Stück einer alten Karte. Ich zeige es niemandem.', 'bringt Leute zusammen und zum Lachen, großzügig', 'bequem, schiebt Arbeit gern auf', 'schnitzt in jeder Pause kleine Figuren', -2, array['feuer','eisen','mine','feuer_echt','eisen_haendler','mine_silber','mine_chronik']::text[]),
(28, 'Ich komme aus der Flussniederung, wo jeden Frühling das Wasser kommt. Nach einem Streit mit meinem Bruder musste ich gehen.', 'Ich will etwas schaffen, das mich überdauert.', 'Die Reiter mit dem schwarzen Banner. Ich träume von ihnen.', 'Ich besuche heimlich jemanden im Dorf hinter dem Ostkamm.', 'großzügig', 'wechselt schnell die Seiten, wenn es sich lohnt, ängstlich, meidet Streit', 'schnitzt in jeder Pause kleine Figuren', -1, array['feuer','eisen','hirsch','eisen_haendler','hirsch_faehrte']::text[]),
(29, 'Ich komme aus einem Kloster – ich bin dort als Waise aufgewachsen. Ich war Soldat, bevor ich das hier gelernt habe. Darüber rede ich nicht gern.', 'Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Dass das Dorf zerfällt, wenn sich keiner kümmert.', 'Ich habe einmal jemanden im Stich gelassen, der mich gebraucht hätte.', 'unermüdlich bei der Arbeit, mutig, packt zu, wenn andere zögern', 'verschlossen, vertraut kaum jemandem, stur und stolz', 'glaubt fest an Vorzeichen', 3, array['feuer','mine','feuer_echt','mine_silber','mine_pfad']::text[]),
(30, 'Ich komme aus einer Familie von Wanderhändlern, wir waren nie lange an einem Ort. Ich war Soldat, bevor ich das hier gelernt habe. Darüber rede ich nicht gern.', 'Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Krankheit. Ich habe zu viele daran sterben sehen.', 'Ich trage einen Brief meiner Mutter bei mir, den ich nie geöffnet habe.', 'unermüdlich bei der Arbeit, bringt Leute zusammen und zum Lachen', 'denkt zuerst an den eigenen Vorteil', 'redet bei der Arbeit mit dem Werkzeug', 0, array['feuer','eisen','mine','hirsch','hirsch_faehrte']::text[]),
(31, 'Ich komme aus einer Familie von Wanderhändlern, wir waren nie lange an einem Ort. Ich habe lange als Tagelöhner geschuftet, bis ich hier Ruhe fand.', 'Ich will etwas tun, über das man noch in hundert Jahren redet.', 'Dass das Dorf zerfällt, wenn sich keiner kümmert.', 'Ich trage einen Brief meiner Mutter bei mir, den ich nie geöffnet habe.', 'mutig, packt zu, wenn andere zögern', 'bequem, schiebt Arbeit gern auf, verschlossen, vertraut kaum jemandem', 'spricht nie über die Vergangenheit', 3, array['hirsch','hirsch_faehrte']::text[]),
(32, 'Ich komme aus einer Familie von Wanderhändlern, wir waren nie lange an einem Ort. Ich war Soldat, bevor ich das hier gelernt habe. Darüber rede ich nicht gern.', 'Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Krankheit. Ich habe zu viele daran sterben sehen.', 'Ich habe einmal jemanden im Stich gelassen, der mich gebraucht hätte.', 'unermüdlich bei der Arbeit, treu, hält Wort', 'verschlossen, vertraut kaum jemandem', 'riecht immer ein wenig nach Rauch', 2, array['hirsch','hirsch_bote']::text[]),
(33, 'Ich komme von einem Hof oben am Pass. Nach einem Streit mit meinem Bruder musste ich gehen.', 'Eines Tages will ich einen eigenen Stand auf einem großen Markt haben.', 'Die Dunkelheit im Wald. Seit ich ein Kind war, gehe ich nachts nicht hinein.', 'Als junger Mensch habe ich gestohlen, um zu überleben.', 'unermüdlich bei der Arbeit, treu, hält Wort', 'denkt zuerst an den eigenen Vorteil, ängstlich, meidet Streit', 'spricht nie über die Vergangenheit', 0, array['hirsch','mine','hirsch_faehrte','mine_chronik']::text[]),
(34, 'Ich komme von hier, aus dem Tal – meine Familie lebt seit Generationen hier. Ich habe als Kind einen Brand überlebt. Seitdem fange ich lieber neu an, als zurückzuschauen.', 'Eines Tages will ich einen eigenen Stand auf einem großen Markt haben.', 'Feuer. Ich habe gesehen, was es anrichtet.', 'Als junger Mensch habe ich gestohlen, um zu überleben.', 'treu, hält Wort', 'bequem, schiebt Arbeit gern auf, denkt zuerst an den eigenen Vorteil, ängstlich, meidet Streit', 'riecht immer ein wenig nach Rauch', -2, array['mine','eisen','mine_silber','mine_chronik','mine_pfad']::text[]),
(35, 'Ich komme aus einem Kloster – ich bin dort als Waise aufgewachsen. Ein Wanderprediger hat mir gesagt, hier würde ich gebraucht.', 'Ich will etwas schaffen, das mich überdauert.', 'Allein zu sein, wenn ich alt bin.', 'Ich habe auf den Silberhirsch geschossen. Seitdem verfolgt mich das Pech.', 'unermüdlich bei der Arbeit, großzügig', 'nachtragend, wenn man gekränkt hat', 'summt beim Arbeiten alte Lieder', 1, array['lichter','hirsch','mine','lichter_eiche','lichter_zeit']::text[]),
(36, 'Ich komme aus der Flussniederung, wo jeden Frühling das Wasser kommt. Ein Wanderprediger hat mir gesagt, hier würde ich gebraucht.', 'Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Feuer. Ich habe gesehen, was es anrichtet.', 'Mein richtiger Name ist ein anderer. Ich habe ihn abgelegt, als ich hierher kam.', 'unermüdlich bei der Arbeit', 'nachtragend, wenn man gekränkt hat', 'spricht nie über die Vergangenheit', 0, array['hirsch','mine']::text[]),
(37, 'Ich komme aus der Flussniederung, wo jeden Frühling das Wasser kommt. Mit sechzehn bin ich davongelaufen und nie zurückgekehrt.', 'Ich will meine Schwester finden. Sie ist im Krieg jenseits der Berge verschwunden.', 'Allein zu sein, wenn ich alt bin.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'treu, hält Wort, mutig, packt zu, wenn andere zögern', 'denkt zuerst an den eigenen Vorteil', 'redet bei der Arbeit mit dem Werkzeug', 2, array['mine','mine_silber','mine_chronik']::text[]),
(38, 'Ich komme aus einem Bergdorf im Norden, das es heute nicht mehr gibt. Ein Wanderprediger hat mir gesagt, hier würde ich gebraucht.', 'Ich will etwas schaffen, das mich überdauert.', 'Dass man mich vergisst, wenn ich nicht mehr bin.', 'Ich besuche heimlich jemanden im Dorf hinter dem Ostkamm.', 'unermüdlich bei der Arbeit', 'wechselt schnell die Seiten, wenn es sich lohnt', 'redet bei der Arbeit mit dem Werkzeug', 0, array['hirsch','mine','hirsch_faehrte','mine_pfad']::text[]),
(39, 'Ich komme aus dem Tal jenseits des Ostkamms. Den harten Winter vor zehn Jahren haben nur wenige überstanden. Ich war einer davon.', 'Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Allein zu sein, wenn ich alt bin.', 'Ich besitze ein Stück einer alten Karte. Ich zeige es niemandem.', 'unermüdlich bei der Arbeit', 'nachtragend, wenn man gekränkt hat', 'flucht leise vor sich hin', 1, array['lichter','hirsch','mine','mine_silber']::text[]),
(40, 'Ich komme aus einem Fischerdorf an der Küste, drei Wochen Fußmarsch von hier. Ich habe als Kind einen Brand überlebt. Seitdem fange ich lieber neu an, als zurückzuschauen.', 'Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Dass man mich vergisst, wenn ich nicht mehr bin.', 'Ich habe auf den Silberhirsch geschossen. Seitdem verfolgt mich das Pech.', 'unermüdlich bei der Arbeit, bringt Leute zusammen und zum Lachen', 'nachtragend, wenn man gekränkt hat', 'sammelt glatte Flusskiesel', -1, array['lichter','mine','lichter_eiche','lichter_zeit']::text[]),
(41, 'Ich komme aus dem Tal jenseits des Ostkamms. Ich war Soldat, bevor ich das hier gelernt habe. Darüber rede ich nicht gern.', 'Ich will, dass meine Kinder es einmal besser haben als ich.', 'Dass ich versage, wenn es wirklich darauf ankommt.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'treu, hält Wort, mutig, packt zu, wenn andere zögern, bringt Leute zusammen und zum Lachen', 'bequem, schiebt Arbeit gern auf', 'kaut ständig auf einem Grashalm', 2, array['lichter','hirsch','mine','lichter_eiche','hirsch_faehrte','mine_silber']::text[]),
(42, 'Ich komme aus einem Bergdorf im Norden, das es heute nicht mehr gibt. Mit sechzehn bin ich davongelaufen und nie zurückgekehrt.', 'Ich will etwas tun, über das man noch in hundert Jahren redet.', 'Dass man mich vergisst, wenn ich nicht mehr bin.', 'Ich habe einmal jemanden im Stich gelassen, der mich gebraucht hätte.', 'großzügig', 'verschlossen, vertraut kaum jemandem', 'summt beim Arbeiten alte Lieder', 2, array['feuer','wache','mine','feuer_echt','mine_pfad']::text[]),
(43, 'Ich komme aus einem Kloster – ich bin dort als Waise aufgewachsen. Ich habe lange als Tagelöhner geschuftet, bis ich hier Ruhe fand.', 'Ich will einmal über die Berge ziehen und sehen, was dahinter liegt.', 'Dass ich versage, wenn es wirklich darauf ankommt.', 'Ich habe einmal Geld aus der Dorfkasse genommen, als es mir schlecht ging. Zurückgezahlt habe ich es nie.', 'verlässlich im Handwerk', 'nachtragend, wenn man gekränkt hat', 'glaubt fest an Vorzeichen', 2, array['mine','eisen','mine_silber','mine_pfad']::text[]),
(44, 'Ich komme von hier, aus dem Tal – meine Familie lebt seit Generationen hier. Ein Wanderprediger hat mir gesagt, hier würde ich gebraucht.', 'Eines Tages will ich einen eigenen Stand auf einem großen Markt haben.', 'Dass das Dorf zerfällt, wenn sich keiner kümmert.', 'Ich schulde einem Händler im Süden viel Geld. Wenn er mich findet …', 'unermüdlich bei der Arbeit, treu, hält Wort, mutig, packt zu, wenn andere zögern', 'denkt zuerst an den eigenen Vorteil', 'riecht immer ein wenig nach Rauch', 2, array['hirsch','lichter','hirsch_faehrte','hirsch_bote']::text[]),
(45, 'Ich komme aus einer Familie von Wanderhändlern, wir waren nie lange an einem Ort. Ich kam wegen der Liebe. Die ist fort – geblieben bin ich wegen des Tals.', 'Ich will so viel besitzen, dass ich nie wieder hungern muss.', 'Die Reiter mit dem schwarzen Banner. Ich träume von ihnen.', 'Ich habe auf den Silberhirsch geschossen. Seitdem verfolgt mich das Pech.', 'treu, hält Wort, bringt Leute zusammen und zum Lachen', 'denkt zuerst an den eigenen Vorteil', 'flucht leise vor sich hin', -1, array['hirsch','hirsch_bote']::text[]),
(46, 'Ich komme aus dem Tal jenseits des Ostkamms. Ich habe lange als Tagelöhner geschuftet, bis ich hier Ruhe fand.', 'Ich will genug Silber sparen, um mir ein Haus aus Stein zu bauen.', 'Dass das Dorf zerfällt, wenn sich keiner kümmert.', 'Ich habe einmal Geld aus der Dorfkasse genommen, als es mir schlecht ging. Zurückgezahlt habe ich es nie.', 'mutig, packt zu, wenn andere zögern', 'denkt zuerst an den eigenen Vorteil', 'schnitzt in jeder Pause kleine Figuren', 2, array['wache','nachbar_kontakt']::text[]),
(47, 'Ich komme aus den Sümpfen im Westen. Den harten Winter vor zehn Jahren haben nur wenige überstanden. Ich war einer davon.', 'Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Krankheit. Ich habe zu viele daran sterben sehen.', 'Ich kann gar nicht richtig lesen. Ich tue nur so.', 'unermüdlich bei der Arbeit, treu, hält Wort, mutig, packt zu, wenn andere zögern', 'denkt zuerst an den eigenen Vorteil, stur und stolz', 'spricht nie über die Vergangenheit', 3, array['feuer','feuer_echt']::text[]),
(48, 'Ich komme von hier, aus dem Tal – meine Familie lebt seit Generationen hier. Mit sechzehn bin ich davongelaufen und nie zurückgekehrt.', 'Ich will etwas tun, über das man noch in hundert Jahren redet.', 'Dass das Dorf zerfällt, wenn sich keiner kümmert.', 'Ich besuche heimlich jemanden im Dorf hinter dem Ostkamm.', 'treu, hält Wort, mutig, packt zu, wenn andere zögern', 'stur und stolz', 'riecht immer ein wenig nach Rauch', 2, array['feuer','feuer_echt']::text[]),
(49, 'Ich komme von einem Hof oben am Pass. Als das Hochwasser kam, haben wir alles verloren.', 'Ich will in meinem Handwerk zu den Besten im ganzen Tal gehören.', 'Die Reiter mit dem schwarzen Banner. Ich träume von ihnen.', 'Als junger Mensch habe ich gestohlen, um zu überleben.', 'unermüdlich bei der Arbeit', 'wechselt schnell die Seiten, wenn es sich lohnt', 'erzählt gern dieselben Geschichten', 0, array['hirsch','lichter','hirsch_faehrte']::text[]),
(50, 'Ich komme aus einem Fischerdorf an der Küste, drei Wochen Fußmarsch von hier. Als das Hochwasser kam, haben wir alles verloren.', 'Ich will einmal über die Berge ziehen und sehen, was dahinter liegt.', 'Allein zu sein, wenn ich alt bin.', 'Ich besitze ein Stück einer alten Karte. Ich zeige es niemandem.', 'verlässlich im Handwerk', 'nachtragend, wenn man gekränkt hat', 'riecht immer ein wenig nach Rauch', 1, array['lichter','hirsch','mine','lichter_eiche','lichter_zeit','mine_silber','mine_chronik']::text[])
on conflict (npc_id) do nothing;
