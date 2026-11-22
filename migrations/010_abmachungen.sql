-- Migration 010: Dorf-Anordnung in der Datenbank, Holz-Abrechnung, Aufträge/Abmachungen mit Bewohnern,
-- sichtbare Zusätze an Gebäuden (Tor, Zaun, Bank …), die nach Ablauf der Bauzeit wirklich im Dorf stehen.
alter table public.villages add column if not exists layout jsonb;

create table if not exists public.deal_templates (
  id text primary key, titel text not null, jobs text[] not null, gebaeude text not null, zusatz text not null,
  holz int not null default 0, dauer_h numeric not null default 8
);
alter table public.deal_templates enable row level security;
revoke all on public.deal_templates from anon, authenticated;
insert into public.deal_templates (id, titel, jobs, gebaeude, zusatz, holz, dauer_h) values
 ('tor_scheune', 'ein beschlagenes Tor für die Scheune', array['Zimmermann','Wagner','Holzfäller','Schmied'], 'scheune', 'tor', 10, 12),
 ('zaun_feld', 'einen Zaun um das Feld', array['Zimmermann','Bauer','Bäuerin','Hirte','Holzfäller'], 'feld', 'zaun', 8, 8),
 ('vogelscheuche_feld', 'eine Vogelscheuche für das Feld', array['Bauer','Bäuerin','Müllerin','Schneiderin','Hirte'], 'feld', 'vogelscheuche', 2, 4),
 ('bank_langhaus', 'eine Holzbank vor dem Langhaus', array['Zimmermann','Holzfäller','Wagner'], 'langhaus', 'bank', 4, 6),
 ('steinbank_langhaus', 'eine Steinbank vor dem Langhaus', array['Steinmetz'], 'langhaus', 'steinbank', 0, 10),
 ('blumen_wohnhaus', 'Blumenkästen am Wohnhaus', array['Wäscherin','Gerberin','Schneiderin','Weberin','Imkerin','Kräuterfrau','Bäuerin'], 'wohnhaus', 'blumen', 2, 4),
 ('laterne_langhaus', 'eine Laterne am Langhaus', array['Schmied','Kerzenzieherin','Zimmermann'], 'langhaus', 'laterne', 3, 6),
 ('geweih_langhaus', 'ein Hirschgeweih über der Tür des Langhauses', array['Jäger','Jägerin','Falknerin'], 'langhaus', 'geweih', 0, 6),
 ('fahne_wachturm', 'eine Fahne auf dem Wachturm', array['Wache','Hauptmann','Weberin','Schneiderin','Söldnerin'], 'wachturm', 'fahne', 2, 4),
 ('holzstapel_wohnhaus', 'einen Brennholzstapel am Wohnhaus', array['Holzfäller','Köhler','Bauer'], 'wohnhaus', 'holzstapel', 5, 4)
on conflict (id) do nothing;

create table if not exists public.npc_deals (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  village_id bigint not null references public.villages(id) on delete cascade,
  npc_id bigint not null references public.npcs(id) on delete cascade,
  vorlage text not null references public.deal_templates(id),
  plot_id int not null,
  status text not null default 'wartet_holz' check (status in ('wartet_holz', 'in_arbeit', 'fertig', 'verfallen')),
  faellig_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists npc_deals_village_idx on public.npc_deals (village_id, status);
alter table public.npc_deals enable row level security;
revoke all on public.npc_deals from anon, authenticated;

create table if not exists public.village_extras (
  village_id bigint not null references public.villages(id) on delete cascade,
  plot_id int not null, gebaeude text not null, zusatz text not null,
  npc_id bigint references public.npcs(id) on delete set null, created_at timestamptz not null default now(),
  primary key (village_id, plot_id, zusatz)
);
alter table public.village_extras enable row level security;
revoke all on public.village_extras from anon, authenticated;

create or replace function public.village_wood(v public.villages) returns numeric language sql stable as $$
  select floor(v.wood_stock + v.wood_per_hour * extract(epoch from (now() - v.stock_updated_at)) / 3600.0);
$$;

-- Anordnung speichern (Testmodus: ohne Kosten). Format: [[typ, bauplatz], …]
create or replace function public.set_layout(p_layout jsonb) returns json language plpgsql security definer set search_path = public as $$
declare e jsonb; seen int[] := '{}'; pid int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if jsonb_typeof(p_layout) <> 'array' or jsonb_array_length(p_layout) > 23 then raise exception 'Ungültige Anordnung'; end if;
  for e in select * from jsonb_array_elements(p_layout) loop
    if jsonb_typeof(e) <> 'array' or jsonb_array_length(e) <> 2 then raise exception 'Ungültige Anordnung'; end if;
    if (e->>0) <> all (array['huette','wohnhaus','langhaus','gasthaus','feld','scheune','muehle','baeckerei','brauerei','imkerei','stall','jagdhuette','holzfaeller','saegewerk','steinmetz','koehlerei','schmiede','gerberei','weberei','toepferei','markt','heilerhaus','schrein','schreibstube','alchemistenturm','wachturm','kaserne','lagerhaus']) then raise exception 'Unbekanntes Gebäude'; end if;
    pid := (e->>1)::int; if pid < 1 or pid > 23 or pid = any(seen) then raise exception 'Ungültiger Bauplatz'; end if; seen := seen || pid;
  end loop;
  update villages set layout = p_layout where owner_id = auth.uid();
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.set_layout(jsonb) from public, anon;
grant execute on function public.set_layout(jsonb) to authenticated;

-- Bauplatz eines Gebäudetyps im eigenen Dorf (erster Treffer)
create or replace function public.layout_plot(p_layout jsonb, p_type text) returns int language sql immutable as $$
  select (e->>1)::int from jsonb_array_elements(coalesce(p_layout, '[]'::jsonb)) e where e->>0 = p_type order by (e->>1)::int limit 1;
$$;

-- Zustand des Dorfes; schließt fällige Aufträge ab (Gebäudezusatz entsteht, Beziehung wächst) und lässt alte verfallen
create or replace function public.get_village_state() returns json language plpgsql security definer set search_path = public as $$
declare v villages; d record; t deal_templates; n npcs; me text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); if not found then return null; end if;
  select character_name into me from profiles where id = auth.uid();
  for d in select * from npc_deals where village_id = v.id and status = 'in_arbeit' and faellig_at <= now() loop
    select * into t from deal_templates where id = d.vorlage; select * into n from npcs where id = d.npc_id;
    insert into village_extras (village_id, plot_id, gebaeude, zusatz, npc_id) values (v.id, coalesce(layout_plot(v.layout, t.gebaeude), d.plot_id), t.gebaeude, t.zusatz, d.npc_id) on conflict do nothing;
    update npc_deals set status = 'fertig', updated_at = now() where id = d.id;
    insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (d.npc_id, auth.uid(), 4, 2)
      on conflict (npc_id, player_id) do update set sympathy = least(100, npc_relations.sympathy + 4), loyalty = least(100, npc_relations.loyalty + 2), updated_at = now();
    insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (d.npc_id, auth.uid(), 'gespraech', 'Ich habe ' || t.titel || ' fertig gebaut. Wir haben zusammen etwas geschaffen.', 4);
    insert into player_notes (player_id, npc_id, kind, text) values (auth.uid(), d.npc_id, 'begegnung', n.name || ' hat Wort gehalten: ' || upper(left(t.titel, 1)) || substr(t.titel, 2) || ' ist fertig.');
    perform spread_deed(d.npc_id, auth.uid(), 'bau_' || t.zusatz, n.name || ' hat für ' || coalesce(me, 'den Dorfmeister') || ' ' || t.titel || ' gebaut.', 0);
  end loop;
  for d in select * from npc_deals where village_id = v.id and status = 'wartet_holz' and created_at < now() - interval '3 days' loop
    select * into t from deal_templates where id = d.vorlage; select * into n from npcs where id = d.npc_id;
    update npc_deals set status = 'verfallen', updated_at = now() where id = d.id;
    update npc_relations set sympathy = greatest(-100, sympathy - 2), updated_at = now() where npc_id = d.npc_id and player_id = auth.uid();
    insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (d.npc_id, auth.uid(), 'gespraech', 'Ich habe auf dein Holz gewartet – vergeblich.', -2);
    insert into player_notes (player_id, npc_id, kind, text) values (auth.uid(), d.npc_id, 'begegnung', 'Ich habe ' || n.name || ' das Holz für ' || t.titel || ' nie gebracht. ' || n.name || ' war enttäuscht.');
  end loop;
  return json_build_object(
    'layout', v.layout, 'holz', village_wood(v),
    'extras', (select coalesce(json_agg(json_build_object('plot', e.plot_id, 'gebaeude', e.gebaeude, 'zusatz', e.zusatz, 'status', 'fertig')), '[]'::json) from village_extras e where e.village_id = v.id),
    'auftraege', (select coalesce(json_agg(json_build_object('id', d2.id, 'npc_id', d2.npc_id, 'npc', n2.name, 'titel', t2.titel, 'gebaeude', t2.gebaeude, 'zusatz', t2.zusatz, 'plot', coalesce(layout_plot(v.layout, t2.gebaeude), d2.plot_id), 'holz', t2.holz, 'status', d2.status, 'faellig_at', d2.faellig_at) order by d2.created_at), '[]'::json)
      from npc_deals d2 join deal_templates t2 on t2.id = d2.vorlage join npcs n2 on n2.id = d2.npc_id where d2.village_id = v.id and d2.status in ('wartet_holz', 'in_arbeit'))
  );
end;
$$;
revoke execute on function public.get_village_state() from public, anon;
grant execute on function public.get_village_state() to authenticated;

-- Welche Aufträge diese Figur im Dorf übernehmen könnte
create or replace function public.deal_options(p_npc bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare v villages; n npcs;
begin
  select * into v from villages where owner_id = auth.uid(); select * into n from npcs where id = p_npc;
  if v.id is null or n.village_id is distinct from v.id then return '[]'::json; end if;
  return (select coalesce(json_agg(json_build_object('id', t.id, 'titel', t.titel, 'holz', t.holz, 'dauer_h', t.dauer_h)), '[]'::json)
    from deal_templates t
    where n.job = any(t.jobs) and layout_plot(v.layout, t.gebaeude) is not null
      and not exists (select 1 from village_extras e where e.village_id = v.id and e.plot_id = layout_plot(v.layout, t.gebaeude) and e.zusatz = t.zusatz)
      and not exists (select 1 from npc_deals d where d.village_id = v.id and d.vorlage = t.id and d.status in ('wartet_holz', 'in_arbeit')));
end;
$$;
revoke execute on function public.deal_options(bigint) from public, anon, authenticated;

create or replace function public.create_deal(p_npc bigint, p_vorlage text) returns json language plpgsql security definer set search_path = public as $$
declare v villages; n npcs; t deal_templates; s int; plot int; st text; fa timestamptz;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); select * into n from npcs where id = p_npc; select * into t from deal_templates where id = p_vorlage;
  if v.id is null or n.id is null or t.id is null or n.village_id is distinct from v.id then return json_build_object('ok', false, 'grund', 'unmoeglich'); end if;
  if not (n.job = any(t.jobs)) then return json_build_object('ok', false, 'grund', 'kann_nicht'); end if;
  plot := layout_plot(v.layout, t.gebaeude); if plot is null then return json_build_object('ok', false, 'grund', 'kein_gebaeude'); end if;
  if exists (select 1 from village_extras e where e.village_id = v.id and e.plot_id = plot and e.zusatz = t.zusatz) then return json_build_object('ok', false, 'grund', 'schon_da'); end if;
  if exists (select 1 from npc_deals d where d.village_id = v.id and d.vorlage = t.id and d.status in ('wartet_holz', 'in_arbeit')) then return json_build_object('ok', false, 'grund', 'laeuft'); end if;
  if (select count(*) from npc_deals d where d.npc_id = p_npc and d.status in ('wartet_holz', 'in_arbeit')) >= 1 then return json_build_object('ok', false, 'grund', 'beschaeftigt'); end if;
  select coalesce(sympathy, 0) into s from npc_relations where npc_id = p_npc and player_id = auth.uid(); s := coalesce(s, 0);
  if s < (case when coalesce((n.traits->>'fleiss')::int, 50) < 25 then 15 else -5 end) then return json_build_object('ok', false, 'grund', 'keine_lust'); end if;
  if t.holz = 0 then st := 'in_arbeit'; fa := now() + make_interval(secs => t.dauer_h * 3600); else st := 'wartet_holz'; end if;
  insert into npc_deals (player_id, village_id, npc_id, vorlage, plot_id, status, faellig_at) values (auth.uid(), v.id, p_npc, t.id, plot, st, fa);
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (p_npc, auth.uid(), 'gespraech', 'Wir haben abgemacht: ich baue ' || t.titel || case when t.holz > 0 then ', sobald du mir ' || t.holz || ' Holz bringst.' else '.' end, 0);
  insert into player_notes (player_id, npc_id, kind, text) values (auth.uid(), p_npc, 'gefallen', 'Abmachung: ' || n.name || ' baut ' || t.titel || case when t.holz > 0 then ', wenn ich ' || t.holz || ' Holz bringe.' else ' – ohne Gegenleistung.' end);
  return json_build_object('ok', true, 'status', st, 'holz', t.holz, 'dauer_h', t.dauer_h, 'titel', t.titel, 'faellig_at', fa);
end;
$$;
revoke execute on function public.create_deal(bigint, text) from public, anon;
grant execute on function public.create_deal(bigint, text) to authenticated;

create or replace function public.deliver_deal(p_deal bigint) returns json language plpgsql security definer set search_path = public as $$
declare v villages; d npc_deals; t deal_templates; w numeric; fa timestamptz;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid() for update;
  select * into d from npc_deals where id = p_deal and village_id = v.id and status = 'wartet_holz' for update;
  if d.id is null then return json_build_object('ok', false, 'grund', 'keine_abmachung'); end if;
  select * into t from deal_templates where id = d.vorlage;
  w := village_wood(v);
  if w < t.holz then return json_build_object('ok', false, 'grund', 'zu_wenig_holz', 'holz', w, 'braucht', t.holz); end if;
  update villages set wood_stock = w - t.holz, stock_updated_at = now() where id = v.id;
  fa := now() + make_interval(secs => t.dauer_h * 3600);
  update npc_deals set status = 'in_arbeit', faellig_at = fa, updated_at = now() where id = d.id;
  update npc_relations set sympathy = least(100, sympathy + 2), updated_at = now() where npc_id = d.npc_id and player_id = auth.uid();
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (d.npc_id, auth.uid(), 'gespraech', 'Du hast mir das Holz gebracht, wie abgemacht.', 2);
  return json_build_object('ok', true, 'faellig_at', fa, 'holz', w - t.holz);
end;
$$;
revoke execute on function public.deliver_deal(bigint) from public, anon;
grant execute on function public.deliver_deal(bigint) to authenticated;

-- Kurzinfo für das Gespräch: + mögliche Aufträge und laufende Abmachung mit dieser Figur
create or replace function public.get_npc_brief(p_npc bigint) returns json language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if not npc_reachable(p_npc) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  return json_build_object(
    'wissen', coalesce((select wissen from npc_profiles where npc_id = p_npc), '{}'),
    'gefragt', (select coalesce(json_agg(key), '[]'::json) from player_notes where player_id = auth.uid() and npc_id = p_npc and kind = 'fakt'),
    'gehoert', (select coalesce(json_agg(text), '[]'::json) from (select text from npc_knowledge where npc_id = p_npc and about_player = auth.uid() order by created_at desc limit 3) k),
    'auftrag_optionen', deal_options(p_npc),
    'abmachung', (select json_build_object('id', d.id, 'titel', t.titel, 'holz', t.holz, 'status', d.status, 'faellig_at', d.faellig_at) from npc_deals d join deal_templates t on t.id = d.vorlage where d.npc_id = p_npc and d.player_id = auth.uid() and d.status in ('wartet_holz', 'in_arbeit') limit 1),
    'holz', (select village_wood(v) from villages v where v.owner_id = auth.uid())
  );
end;
$$;

-- Gerolds mündliches Versprechen aus dem ersten KI-Gespräch (21.11.) als echte Abmachung übernommen (einmalig, siehe Chat).
