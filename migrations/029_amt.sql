-- Migration 029: Ansehen, Dorfmeister-Amt, Bürgerversammlung, Weichen (selbst führen oder Vorsteher mit 50 %), Amtsaufgaben.
-- Spieler beginnen als Bewohner. Ein Vorsteher (Bewohner) führt das Dorf mit halber Kraft, bis ein Spieler gewählt wird und annimmt.

/* ---------- Tabellen ---------- */
alter table public.profiles add column if not exists ansehen int not null default 0;

create table if not exists public.dorf_amt (
  village_id bigint primary key references public.villages(id) on delete cascade,
  meister_typ text not null default 'vorsteher' check (meister_typ in ('vorsteher', 'spieler')),
  vorsteher_npc bigint references public.npcs(id) on delete set null,
  meister_player uuid references public.profiles(id) on delete set null,
  fokus text not null default 'ausgewogen' check (fokus in ('ausgewogen', 'nahrung', 'baustoffe', 'handwerk', 'wachstum')),
  koenig_gunst int not null default 50,
  kapitel int not null default 1,
  seit timestamptz not null default now(),
  wahl_ab timestamptz,
  naechstes_ereignis timestamptz not null default now() + interval '3 hours'
);
create table if not exists public.ansehen_log (id bigserial primary key, player_id uuid not null references public.profiles(id) on delete cascade, delta int not null, grund text not null, at timestamptz not null default now());
create index if not exists ansehen_log_player on public.ansehen_log (player_id, at desc);
create table if not exists public.dorf_wahlen (
  id bigserial primary key, village_id bigint not null references public.villages(id) on delete cascade, player_id uuid not null references public.profiles(id) on delete cascade,
  gegner_npc bigint references public.npcs(id) on delete set null, gegner_name text, status text not null check (status in ('gewaehlt', 'verloren', 'angenommen', 'abgelehnt')),
  ja int not null, nein int not null, stimmen jsonb not null default '[]', gesehen boolean not null default false, created_at timestamptz not null default now(), entschieden_at timestamptz);
create table if not exists public.dorf_vorlagen (id text primary key, art text not null, titel text not null, text text not null, optionen jsonb not null, rollen text[] not null default '{}', auto int not null default 0, gewicht numeric not null default 1);
create table if not exists public.dorf_ereignisse (
  id bigserial primary key, village_id bigint not null references public.villages(id) on delete cascade, vorlage text not null references public.dorf_vorlagen(id),
  rollen jsonb not null default '{}', daten jsonb not null default '{}', status text not null default 'offen' check (status in ('offen', 'entschieden')),
  wahl int, ergebnis text, von text, created_at timestamptz not null default now(), frist timestamptz not null default now() + interval '36 hours', entschieden_at timestamptz);
create index if not exists dorf_ereignisse_v on public.dorf_ereignisse (village_id, status, created_at desc);

alter table public.dorf_amt enable row level security; alter table public.ansehen_log enable row level security; alter table public.dorf_wahlen enable row level security;
alter table public.dorf_vorlagen enable row level security; alter table public.dorf_ereignisse enable row level security;
revoke all on public.dorf_amt, public.ansehen_log, public.dorf_wahlen, public.dorf_vorlagen, public.dorf_ereignisse from anon, authenticated;

/* ---------- Ansehen ---------- */
create or replace function public.ansehen_add(p_uid uuid, p_delta int, p_grund text) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_uid is null or coalesce(p_delta, 0) = 0 then return; end if;
  update profiles set ansehen = greatest(0, ansehen + p_delta) where id = p_uid;
  insert into ansehen_log (player_id, delta, grund) values (p_uid, p_delta, left(p_grund, 120));
end $$;

create or replace function public.ansehen_wort(n int) returns text language sql immutable as $$
  select case when n >= 160 then 'Man vertraut dir' when n >= 120 then 'Man hört auf dich' when n >= 70 then 'Man schätzt dich' when n >= 30 then 'Man kennt dich' else 'Neu im Dorf' end;
$$;
create or replace function public.gunst_wort(n int) returns text language sql immutable as $$
  select case when n >= 80 then 'Der König hält große Stücke auf euch' when n >= 60 then 'Der König ist euch gewogen' when n >= 40 then 'Der König beobachtet euch' when n >= 20 then 'Der König ist verstimmt' else 'Der König ist erzürnt' end;
$$;

-- Ansehen aus Taten: Quests, Hilfe im Dorf, Mithelfen
create or replace function public.trg_quest_ansehen() returns trigger language plpgsql security definer set search_path = public as $$
declare t quest_templates; n int;
begin
  if new.status = 'fertig' and old.status is distinct from 'fertig' then
    select * into t from quest_templates where id = new.quest_id;
    n := case t.art when 'brett' then case coalesce(t.schwierigkeit, 1) when 1 then 4 when 2 then 7 else 12 end when 'erkundung' then 3 when 'haupt' then 10 when 'system' then 6 when 'ki' then 6 else 0 end;
    if n > 0 then perform ansehen_add(new.player_id, n, 'Abenteuer: ' || coalesce(t.titel, 'unterwegs')); end if;
  end if;
  return new;
end $$;
drop trigger if exists quest_ansehen on public.quest_runs;
create trigger quest_ansehen after update of status on public.quest_runs for each row execute function public.trg_quest_ansehen();

create or replace function public.trg_tagwerk_ansehen() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'offen' and new.status <> 'offen' then
    perform ansehen_add(new.player_id, case when new.status = 'erledigt' then 3 else 1 end, 'Hilfe: ' || coalesce((select name from npcs where id = new.npc_id), 'ein Nachbar'));
  end if;
  return new;
end $$;
drop trigger if exists tagwerk_ansehen on public.tagwerk;
create trigger tagwerk_ansehen after update of status on public.tagwerk for each row execute function public.trg_tagwerk_ansehen();

create or replace function public.trg_hilfe_ansehen() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.hilfe_at is distinct from old.hilfe_at and new.hilfe_at is not null then perform ansehen_add(new.id, 1, 'Beim Bau mit angepackt'); end if;
  return new;
end $$;
drop trigger if exists hilfe_ansehen on public.profiles;
create trigger hilfe_ansehen after update of hilfe_at on public.profiles for each row execute function public.trg_hilfe_ansehen();

/* ---------- Amt einer Siedlung ---------- */
create or replace function public.amt_init(p_v bigint) returns public.dorf_amt language plpgsql security definer set search_path = public as $$
declare a dorf_amt; nid bigint;
begin
  insert into dorf_amt (village_id) values (p_v) on conflict do nothing;
  select * into a from dorf_amt where village_id = p_v for update;
  if a.vorsteher_npc is null or not exists (select 1 from npcs where id = a.vorsteher_npc and village_id = p_v) then
    select n.id into nid from npcs n where n.village_id = p_v
      order by array_position(array['Dorfälteste','Hauptmann','Priesterin','Wirt','Schmied','Gelehrter','Müllerin','Bauer'], n.job) nulls last, coalesce((n.traits->>'treue')::int, 50) desc, n.id limit 1;
    update dorf_amt set vorsteher_npc = nid where village_id = p_v returning * into a;
  end if;
  return a;
end $$;
insert into public.dorf_amt (village_id) select id from public.villages on conflict do nothing;

-- Leistung der Dorfführung: Spieler als Dorfmeister 100 %, Vorsteher 50 %
create or replace function public.amt_leistung(p_v bigint) returns numeric language sql stable security definer set search_path = public as $$
  select case when coalesce((select meister_typ from dorf_amt where village_id = p_v), 'vorsteher') = 'spieler' then 1.0 else 0.5 end;
$$;
create or replace function public.amt_ist_meister(p_uid uuid, p_v bigint) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from dorf_amt where village_id = p_v and meister_typ = 'spieler' and meister_player = p_uid);
$$;

/* ---------- Bürgerversammlung ---------- */
create or replace function public.amt_wahl(p_run public.quest_runs) returns void language plpgsql security definer set search_path = public as $$
declare v bigint; a dorf_amt; gid bigint; gname text; bonus int := 0; ans int; ja int := 0; nein int := 0; st jsonb := '[]'; n record; p numeric; fl jsonb;
begin
  select id into v from villages where owner_id = p_run.player_id; if v is null then return; end if;
  a := amt_init(v);
  select flags into fl from quest_runs where id = p_run.id;
  gid := coalesce((p_run.rollen->'V'->>'id')::bigint, a.vorsteher_npc); select name into gname from npcs where id = gid;
  bonus := (case when fl ? 'stimme_a' then 2 else 0 end) + (case when fl ? 'stimme_b' then 3 else 0 end) + (case when fl ? 'stimme_c' then 2 else 0 end)
         + (case when fl ? 'rede_gut' then 4 else 0 end) + (case when fl ? 'rede_ehrlich' then 2 else 0 end) + (case when fl ? 'rede_demut' then 2 else 0 end)
         - (case when fl ? 'rede_angriff' then 4 else 0 end) - (case when fl ? 'rede_holprig' then 1 else 0 end);
  select ansehen into ans from profiles where id = p_run.player_id;
  for n in select x.id, x.name, coalesce(r.sympathy, 0) sym from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = p_run.player_id where x.village_id = v loop
    if n.id = gid then nein := nein + 1; st := st || jsonb_build_object('name', n.name, 'fuer', 'gegner'); continue; end if;
    p := greatest(0.08, least(0.93, 0.47 + n.sym / 100.0 * 0.6 + (ans - 110) / 400.0 + bonus * 0.03));
    if random() < p then ja := ja + 1; st := st || jsonb_build_object('name', n.name, 'fuer', 'du');
    else nein := nein + 1; st := st || jsonb_build_object('name', n.name, 'fuer', 'gegner'); end if;
  end loop;
  insert into dorf_wahlen (village_id, player_id, gegner_npc, gegner_name, status, ja, nein, stimmen)
    values (v, p_run.player_id, gid, gname, case when ja > nein then 'gewaehlt' else 'verloren' end, ja, nein, st);
  if ja > nein then
    perform eco_log(v, 'amt', 'Die Bürgerversammlung hat ' || (select character_name from profiles where id = p_run.player_id) || ' mit ' || ja || ' zu ' || nein || ' Stimmen zum Dorfmeister gewählt.', null, now());
  else
    update dorf_amt set wahl_ab = now() + interval '4 days' where village_id = v;
    perform eco_log(v, 'amt', coalesce(gname, 'Der Vorsteher') || ' bleibt Vorsteher. Die Versammlung stimmte ' || nein || ' zu ' || ja || '.', gid, now());
  end if;
end $$;

-- Quest-Folgen erweitert: ansehen, kapitel, wahl (zusätzlich zu sym/merkt)
create or replace function public.q_apply_roles(p_run public.quest_runs, f jsonb) returns void language plpgsql security definer set search_path = public as $$
declare k text; v text; nid bigint; ctx jsonb := q_ctx(p_run); vid bigint;
begin
  if f ? 'sym' then for k, v in select * from jsonb_each_text(f->'sym') loop
    nid := (p_run.rollen->k->>'id')::bigint; continue when nid is null;
    insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (nid, p_run.player_id, 0, 0) on conflict do nothing;
    update npc_relations set sympathy = greatest(-100, least(100, sympathy + v::int)), updated_at = now() where npc_id = nid and player_id = p_run.player_id;
  end loop; end if;
  if f ? 'merkt' then for k, v in select * from jsonb_each_text(f->'merkt') loop
    nid := (p_run.rollen->k->>'id')::bigint; continue when nid is null;
    insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (nid, p_run.player_id, 'gespraech', left(q_fill(v, ctx), 300), coalesce((f->'sym'->>k)::int, 0));
  end loop; end if;
  if f ? 'ansehen' then perform ansehen_add(p_run.player_id, (f->>'ansehen')::int, 'Chronik: ' || coalesce((select titel from quest_templates where id = p_run.quest_id), '')); end if;
  if f ? 'kapitel' then
    select id into vid from villages where owner_id = p_run.player_id;
    if vid is not null then perform amt_init(vid); update dorf_amt set kapitel = greatest(kapitel, (f->>'kapitel')::int) where village_id = vid; end if;
  end if;
  if f ? 'wahl' then perform amt_wahl(p_run); end if;
end $$;

/* ---------- Aushänge: Rechtsfälle, Krisen, Briefe des Königs, Bittsteller ---------- */
create or replace function public.amt_text(p_txt text, p_rollen jsonb, p_daten jsonb) returns text language plpgsql immutable as $$
declare k text; val jsonb; t text := coalesce(p_txt, '');
begin
  for k, val in select * from jsonb_each(coalesce(p_rollen, '{}')) loop t := replace(t, '{' || k || '}', coalesce(val->>'name', '')); end loop;
  for k, val in select * from jsonb_each(coalesce(p_daten, '{}')) loop t := replace(t, '{' || k || '}', coalesce(val #>> '{}', '')); end loop;
  return t;
end $$;

create or replace function public.amt_apply(p_ev bigint, p_wahl int, p_von text, p_uid uuid) returns text language plpgsql security definer set search_path = public as $$
declare e dorf_ereignisse; t dorf_vorlagen; opt jsonb; f jsonb; k text; val text; nid bigint; res jsonb := '{}'; i int; txt text;
begin
  select * into e from dorf_ereignisse where id = p_ev for update; if e.status <> 'offen' then return e.ergebnis; end if;
  select * into t from dorf_vorlagen where id = e.vorlage;
  opt := t.optionen->greatest(0, least(jsonb_array_length(t.optionen) - 1, p_wahl)); f := coalesce(opt->'folgen', '{}');
  for k in select unnest(array['holz','stein','nahrung','waren']) loop if f->'res' ? k then res := res || jsonb_build_object(k, (f->'res'->>k)::numeric); end if; end loop;
  if f ? 'stim' and (f->>'stim')::numeric <> 0 then res := res || jsonb_build_object('stimmung', (f->>'stim')::numeric * 2); end if;
  if res <> '{}' then perform eco_add(e.village_id, res); end if;
  if f ? 'gunst' then update dorf_amt set koenig_gunst = greatest(0, least(100, koenig_gunst + (f->>'gunst')::int)) where village_id = e.village_id; end if;
  if p_uid is not null and f ? 'ansehen' then perform ansehen_add(p_uid, (f->>'ansehen')::int, 'Entscheidung: ' || t.titel); end if;
  if p_uid is not null and f ? 'sym' then for k, val in select * from jsonb_each_text(f->'sym') loop
    nid := (e.rollen->k->>'id')::bigint; continue when nid is null;
    insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (nid, p_uid, 0, 0) on conflict do nothing;
    update npc_relations set sympathy = greatest(-100, least(100, sympathy + val::int)), updated_at = now() where npc_id = nid and player_id = p_uid;
  end loop; end if;
  if f ? 'verbannen' then nid := (e.rollen->(f->>'verbannen')->>'id')::bigint;
    if nid is not null then update npcs set village_id = null, home_plot = null where id = nid and village_id = e.village_id; end if; end if;
  if e.vorlage = 'bittsteller' then
    nid := (e.rollen->'T'->>'id')::bigint;
    if coalesce((f->>'zuzug')::int, 0) > 0 and nid is not null then update npcs set reserviert = false where id = nid; perform eco_zuzug(e.village_id, now(), nid);
    elsif nid is not null then update npcs set reserviert = false where id = nid and village_id is null; end if;
  elsif coalesce((f->>'zuzug')::int, 0) > 0 then for i in 1..(f->>'zuzug')::int loop perform eco_zuzug(e.village_id, now()); end loop;
  end if;
  txt := amt_text(opt->>'ergebnis', e.rollen, e.daten);
  update dorf_ereignisse set status = 'entschieden', wahl = p_wahl, ergebnis = txt, von = p_von, entschieden_at = now() where id = e.id;
  perform eco_log(e.village_id, 'amt', t.titel || ': ' || txt, null, now());
  return txt;
end $$;

-- neuer Aushang (zufällig, mit passenden Bewohnern); bei einem Vorsteher entscheidet er sofort selbst
create or replace function public.amt_ereignis_neu(p_v bigint) returns bigint language plpgsql security definer set search_path = public as $$
declare a dorf_amt; t dorf_vorlagen; rol jsonb := '{}'; r text; n record; used bigint[] := '{}'; eid bigint; ok boolean;
begin
  a := amt_init(p_v);
  for t in select * from dorf_vorlagen where gewicht > 0 and art in ('rechtsfall', 'krise', 'koenig')
    and id not in (select vorlage from dorf_ereignisse where village_id = p_v and created_at > now() - interval '6 days')
    order by random() * gewicht * (case art when 'koenig' then 0.6 else 1 end) desc loop
    rol := '{}'; used := array[coalesce(a.vorsteher_npc, 0)]; ok := true;
    foreach r in array t.rollen loop
      select x.id, x.name, x.job into n from npcs x where x.village_id = p_v and x.id <> all(used) order by random() limit 1;
      if n.id is null then ok := false; exit; end if;
      rol := rol || jsonb_build_object(r, jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)); used := used || n.id;
    end loop;
    continue when not ok;
    insert into dorf_ereignisse (village_id, vorlage, rollen) values (p_v, t.id, rol) returning id into eid;
    if a.meister_typ <> 'spieler' then perform amt_apply(eid, t.auto, 'vorsteher', null); end if;
    return eid;
  end loop;
  return null;
end $$;

-- Bittsteller statt automatischem Zuzug, wenn ein Spieler Dorfmeister ist
create or replace function public.amt_bittsteller(p_v bigint) returns boolean language plpgsql security definer set search_path = public as $$
declare v villages; n npcs; types text[];
begin
  if exists (select 1 from dorf_ereignisse where village_id = p_v and vorlage = 'bittsteller' and status = 'offen') then return false; end if;
  select * into v from villages where id = p_v;
  select coalesce(array_agg(x->>0), '{}') into types from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x;
  select w.* into n from npcs w left join eco_jobs j on j.job = w.job where w.village_id is null and w.travel_to is null and not w.reserviert
    order by (case when j.gebaeude = any(types) and not exists (select 1 from npcs o where o.village_id = p_v and o.job = w.job) then 3 else 1 end) * random() desc limit 1;
  if n.id is null then return false; end if;
  update npcs set reserviert = true where id = n.id;
  insert into dorf_ereignisse (village_id, vorlage, rollen, daten, frist) values (p_v, 'bittsteller', jsonb_build_object('T', jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)),
    jsonb_build_object('beruf', n.job, 'wesen', 'Man sagt, ' || n.name || ' sei ' || npc_wesen(n.traits) || '.'), now() + interval '48 hours');
  return true;
end $$;

-- stündlich: abgelaufene Entscheidungen fällt der Vorsteher, neue Aushänge entstehen
create or replace function public.amt_tick(p_v bigint) returns void language plpgsql security definer set search_path = public as $$
declare a dorf_amt; e record; offen int;
begin
  a := amt_init(p_v);
  for e in select x.id, x.vorlage from dorf_ereignisse x where x.village_id = p_v and x.status = 'offen' and x.frist < now() loop
    perform amt_apply(e.id, (select auto from dorf_vorlagen where id = e.vorlage), 'vorsteher', null);
  end loop;
  if now() >= a.naechstes_ereignis then
    select count(*) into offen from dorf_ereignisse where village_id = p_v and status = 'offen' and vorlage <> 'bittsteller';
    if offen = 0 then perform amt_ereignis_neu(p_v); end if;
    update dorf_amt set naechstes_ereignis = now() + interval '16 hours' + random() * interval '12 hours' where village_id = p_v;
  end if;
end $$;
create or replace function public.amt_tick_all() returns void language plpgsql security definer set search_path = public as $$
declare v record; begin for v in select id from villages loop begin perform amt_tick(v.id); exception when others then null; end; end loop; end $$;
do $$ begin
  if exists (select 1 from cron.job where jobname = 'mossheart-amt') then perform cron.unschedule('mossheart-amt'); end if;
  perform cron.schedule('mossheart-amt', '17 * * * *', 'select public.amt_tick_all()');
end $$;

/* ---------- Wirtschaft: Leistung der Führung, Fokus, Bittsteller ---------- */
create or replace function public.eco_tick(p_v bigint)
 returns void language plpgsql security definer set search_path to 'public' as $function$
#variable_conflict use_variable
declare e village_eco; h int; i int; t timestamptz; season text := ''; r jsonb; dirty boolean := true; pr village_projects; f numeric; bauend boolean;
  holz numeric; stein numeric; nahrung numeric; waren numeric; stim numeric; bonus numeric; hunger int; cap jsonb; target numeric; tage numeric;
  c jsonb; ok boolean; k text; val text; d_holz numeric; d_stein numeric; d_nahr numeric; d_war numeric; w record; p numeric; start_at timestamptz; weg boolean := false;
  lf numeric; fk text; fh numeric := 1; fs numeric := 1; fn numeric := 1; fw numeric := 1; fz numeric := 1; meister boolean;
begin
  select * into e from village_eco where village_id = p_v for update;
  if not found then insert into village_eco (village_id) values (p_v) on conflict do nothing; select * into e from village_eco where village_id = p_v for update; end if;
  h := floor(extract(epoch from (now() - e.tick_at)) / 3600)::int;
  if h < 1 then return; end if;
  -- Führung: Dorfmeister (Spieler) 100 %, Vorsteher 50 % bei Bau und Holz/Stein/Waren; der Fokus verschiebt die Arbeit
  select coalesce(meister_typ = 'spieler', false), coalesce(fokus, 'ausgewogen') into meister, fk from dorf_amt where village_id = p_v;
  meister := coalesce(meister, false); lf := case when meister then 1.0 else 0.5 end; fk := coalesce(fk, 'ausgewogen');
  if meister then
    if fk = 'nahrung' then fn := 1.25; fh := 0.95; fs := 0.95; fw := 0.95;
    elsif fk = 'baustoffe' then fh := 1.2; fs := 1.2; fn := 0.97; fw := 0.95;
    elsif fk = 'handwerk' then fw := 1.3; fh := 0.97; fs := 0.97;
    elsif fk = 'wachstum' then fz := 1.8; end if;
  end if;
  start_at := e.tick_at;
  if h > 336 then start_at := e.tick_at + make_interval(hours => h - 336); h := 336; end if;
  holz := (e.res->>'holz')::numeric; stein := (e.res->>'stein')::numeric; nahrung := (e.res->>'nahrung')::numeric; waren := (e.res->>'waren')::numeric;
  stim := e.stimmung; bonus := e.bonus; hunger := e.hunger_h;
  for i in 1..h loop
    t := start_at + make_interval(hours => i);
    if dirty or eco_season(t) <> season then
      season := eco_season(t); r := eco_rates(p_v, season); cap := r->'cap'; dirty := false;
      select * into pr from village_projects where village_id = p_v and status in ('geplant','im_bau') order by id limit 1;
    end if;
    f := (0.7 + 0.6 * stim / 100) * case when hunger > 0 then 0.85 else 1 end;
    bauend := pr.id is not null and pr.status = 'im_bau';
    d_holz := ((r->'p'->>'holz')::numeric + (r->'b'->>'holz')::numeric * case when bauend then 0.5 else 1 end) * f * lf * fh - (r->>'heizen')::numeric;
    d_stein := ((r->'p'->>'stein')::numeric + (r->'b'->>'stein')::numeric * case when bauend then 0.5 else 1 end) * f * lf * fs;
    d_nahr := ((r->'p'->>'nahrung')::numeric + (r->'b'->>'nahrung')::numeric * case when bauend then 0.5 else 1 end) * f * fn - (r->>'essen')::numeric * case when nahrung < (r->>'essen')::numeric * 24 then 0.7 else 1 end;
    d_war := ((r->'p'->>'waren')::numeric + (r->'b'->>'waren')::numeric * case when bauend then 0.5 else 1 end) * f * lf * fw;
    holz := greatest(0, least((cap->>'holz')::numeric, holz + d_holz)); stein := greatest(0, least((cap->>'stein')::numeric, stein + d_stein));
    nahrung := greatest(0, least((cap->>'nahrung')::numeric, nahrung + d_nahr)); waren := greatest(0, least((cap->>'waren')::numeric, waren + d_war));
    if nahrung <= 0 then
      if hunger = 0 then perform eco_log(p_v, 'not', 'Die Vorräte sind aufgebraucht. Im Dorf wird gehungert.', null, t); end if;
      hunger := hunger + 1;
    elsif hunger > 0 then hunger := greatest(0, hunger - 2); if hunger = 0 then perform eco_log(p_v, 'gut', 'Es gibt wieder genug zu essen.', null, t); end if;
    end if;
    if pr.id is null then
      c := eco_candidates(p_v, r, jsonb_build_object('holz', holz, 'stein', stein, 'nahrung', nahrung, 'waren', waren), stim, hunger, 1);
      if jsonb_array_length(c) > 0 then
        insert into village_projects (village_id, art, gebaeude, plot, stufe, kosten, arbeit_soll, grund, created_at)
          values (p_v, c->0->>'art', c->0->>'gebaeude', (c->0->>'plot')::int, (c->0->>'stufe')::int, c->0->'kosten', (c->0->>'arbeit')::numeric, c->0->>'grund', t)
          returning * into pr;
        perform eco_log(p_v, 'plan', 'Der Dorfrat hat beschlossen: ' || case when pr.art = 'neu' then eco_nom((select dat from eco_buildings where id = pr.gebaeude)) || ' soll gebaut werden.' else (select name from eco_buildings where id = pr.gebaeude) || ' soll ausgebaut werden.' end || ' ' || pr.grund, null, t);
      end if;
    end if;
    if pr.id is not null and pr.status = 'geplant' then
      ok := true;
      for k, val in select * from jsonb_each_text(pr.kosten) loop
        if (case k when 'holz' then holz when 'stein' then stein when 'nahrung' then nahrung else waren end) < val::numeric then ok := false; end if;
      end loop;
      if ok then
        holz := holz - coalesce((pr.kosten->>'holz')::numeric, 0); stein := stein - coalesce((pr.kosten->>'stein')::numeric, 0); waren := waren - coalesce((pr.kosten->>'waren')::numeric, 0);
        update village_projects set status = 'im_bau', started_at = t where id = pr.id returning * into pr; dirty := true;
      elsif pr.created_at < t - interval '5 days' and pr.vorgeschlagen is null then
        update village_projects set status = 'verworfen' where id = pr.id;
        perform eco_log(p_v, 'plan', 'Der Dorfrat hat den Plan für ' || (select dat from eco_buildings where id = pr.gebaeude) || ' vorerst verschoben – es fehlte zu lange an Material.', null, t);
        pr := null; dirty := true;
      end if;
    elsif pr.id is not null and pr.status = 'im_bau' then
      update village_projects set arbeit_ist = arbeit_ist + (r->>'bau')::numeric * f * lf where id = pr.id returning * into pr;
      if pr.arbeit_ist >= pr.arbeit_soll then perform eco_finish(pr.id, t); pr := null; dirty := true; end if;
    end if;
    tage := nahrung / greatest(0.1, (r->>'essen')::numeric * 24);
    target := 45 + (r->>'stim_jobs')::numeric + (r->>'stim_geb')::numeric
      + case when hunger > 0 then -30 when tage < 1 then -10 when tage > 3 then 8 else 0 end
      + case when (r->>'bewohner')::numeric > (r->>'wohnraum')::numeric then -15 else 3 end
      + case season when 'winter' then -5 when 'sommer' then 3 else 0 end + bonus;
    target := greatest(0, least(100, target));
    stim := stim + (target - stim) * 0.1; bonus := bonus * 0.995;
    if not dirty and hunger = 0 and tage >= 2 and stim >= 45 and (r->>'wohnraum')::numeric - (r->>'bewohner')::numeric >= 1
       and (e.zuzug_at is null or e.zuzug_at < t - interval '24 hours') then
      p := (0.006 + (r->>'zuzug')::numeric * 0.004 + greatest(0, stim - 50) / 100 * 0.006) * fz;
      if random() < p then
        if meister then
          -- als Dorfmeister entscheidest du selbst, wer einzieht
          if t > now() - interval '2 hours' and amt_bittsteller(p_v) then e.zuzug_at := t; update village_eco set zuzug_at = t where village_id = p_v; end if;
        elsif eco_zuzug(p_v, t) is not null then dirty := true; e.zuzug_at := t; end if;
      end if;
    end if;
    if hunger >= 72 and (r->>'bewohner')::int > 6 and not weg then
      select n.id, n.name into w from npcs n left join eco_jobs j on j.job = n.job where n.village_id = p_v and coalesce(j.res, '') <> 'nahrung' and not n.reserviert
        order by coalesce((n.traits->>'treue')::int, 50), random() limit 1;
      if w.id is not null then
        update npcs set village_id = null, home_plot = null where id = w.id;
        perform eco_log(p_v, 'wegzug', w.name || ' hat das Dorf verlassen. Der Hunger war zu groß.', w.id, t);
        dirty := true;
      end if;
      hunger := 0; weg := true;
    end if;
  end loop;
  update village_eco set res = jsonb_build_object('holz', round(holz, 2), 'stein', round(stein, 2), 'nahrung', round(nahrung, 2), 'waren', round(waren, 2)),
    stimmung = round(stim, 2), bonus = round(bonus, 3), hunger_h = hunger, tick_at = start_at + make_interval(hours => h), rates = r,
    trend = jsonb_build_object('holz', round(d_holz, 3), 'stein', round(d_stein, 3), 'nahrung', round(d_nahr, 3), 'waren', round(d_war, 3))
  where village_id = p_v;
end;
$function$;

-- Vorschläge im Dorfrat: Bewohner brauchen Ansehen, der Dorfmeister erteilt Bauaufträge
create or replace function public.dorf_vorschlagen(p_gebaeude text) returns json language plpgsql security definer set search_path = public as $$
declare v villages; e village_eco; prof profiles; pl village_projects; c jsonb; x jsonb; ant text; nm text; meister boolean;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); select * into prof from profiles where id = auth.uid();
  perform eco_tick(v.id);
  meister := amt_ist_meister(auth.uid(), v.id);
  if not meister and prof.ansehen < 70 then
    select n.name into nm from npcs n where n.id = (select vorsteher_npc from amt_init(v.id));
    return json_build_object('ok', true, 'text', coalesce(nm, 'Der Vorsteher') || ' hört dir höflich zu. „Kluger Gedanke. Aber im Rat zählt die Stimme von jemandem, den alle kennen.“ (Dafür brauchst du mehr Ansehen.)');
  end if;
  if prof.vorschlag_at > now() - interval '20 hours' then return json_build_object('ok', false, 'grund', 'schon_heute', 'ab', prof.vorschlag_at + interval '20 hours'); end if;
  select * into e from village_eco where village_id = v.id;
  c := eco_candidates(v.id, e.rates, e.res, e.stimmung, e.hunger_h, 40);
  select y into x from jsonb_array_elements(c) y where y->>'gebaeude' = p_gebaeude order by (y->>'score')::numeric desc limit 1;
  if x is null then return json_build_object('ok', false, 'grund', 'geht_nicht'); end if;
  update village_eco set vorschlag = jsonb_build_object('gebaeude', p_gebaeude, 'von', auth.uid(), 'bis', now() + interval '3 days') where village_id = v.id;
  update profiles set vorschlag_at = now() where id = auth.uid();
  select n.name into nm from npcs n where n.village_id = v.id order by coalesce((n.traits->>'geselligkeit')::int, 50) desc, random() limit 1;
  select * into pl from village_projects where village_id = v.id and status = 'geplant' order by id limit 1 for update;
  if pl.id is not null and pl.gebaeude = p_gebaeude then
    ant := 'Das ist ohnehin geplant. ' || coalesce(nm, 'Jemand') || ' lacht: „Da sind wir uns ja einig.“';
  elsif pl.id is null or pl.vorgeschlagen is null or meister then
    if pl.id is not null then update village_projects set status = 'verworfen' where id = pl.id; end if;
    insert into village_projects (village_id, art, gebaeude, plot, stufe, kosten, arbeit_soll, grund, vorgeschlagen)
      values (v.id, x->>'art', x->>'gebaeude', (x->>'plot')::int, (x->>'stufe')::int, x->'kosten', (x->>'arbeit')::numeric, case when meister then 'Ein Bauauftrag des Dorfmeisters ' || prof.character_name || '.' else 'Ein Vorschlag von ' || prof.character_name || '.' end, auth.uid());
    perform eco_log(v.id, 'plan', prof.character_name || case when meister then ' hat als Dorfmeister angeordnet, ' else ' hat im Dorfrat vorgeschlagen, ' end || case when x->>'art' = 'neu' then (select dat from eco_buildings where id = p_gebaeude) || ' zu bauen' else (select case when dat like 'eine %' then 'die ' when dat like 'einen %' then 'den ' else 'das ' end || name from eco_buildings where id = p_gebaeude) || ' auszubauen' end || case when meister then '.' else '. Der Rat ist einverstanden.' end);
    ant := case when meister then coalesce(nm, 'Der Rat') || ' nickt: „Wird gemacht, Meister. Sobald das Material da ist, fangen wir an.“' else coalesce(nm, 'Der Dorfrat') || ' nickt: „Gute Idee. So machen wir es – als Nächstes, sobald das Material da ist.“' end;
  else
    ant := coalesce(nm, 'Der Dorfrat') || ' kratzt sich am Kopf: „Wir haben gerade schon einen Vorschlag auf dem Tisch. Danach gern.“';
  end if;
  return json_build_object('ok', true, 'text', ant);
end $$;

/* ---------- RPCs für den Client ---------- */
create or replace function public.amt_status() returns json language plpgsql security definer set search_path = public as $$
declare v villages; a dorf_amt; prof profiles; kap quest_templates; runid bigint; frei boolean; grund text; w dorf_wahlen; vname text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); if v.id is null then return null; end if;
  perform amt_tick(v.id);
  a := amt_init(v.id); select * into prof from profiles where id = auth.uid(); select name into vname from npcs where id = a.vorsteher_npc;
  select * into kap from quest_templates where art = 'chronik' and schwierigkeit = a.kapitel;
  select q.id into runid from quest_runs q join quest_templates t on t.id = q.quest_id where q.player_id = auth.uid() and q.status = 'laeuft' and t.art = 'chronik' order by q.id desc limit 1;
  frei := kap.id is not null; grund := null;
  if kap.id is not null and a.kapitel = 3 then
    if a.meister_typ = 'spieler' then frei := false; grund := 'Du bist bereits Dorfmeister.';
    elsif prof.ansehen < 120 then frei := false; grund := 'Noch kennen dich zu wenige gut genug, um dich aufzustellen. (' || ansehen_wort(prof.ansehen) || ' – nötig: Man hört auf dich)';
    elsif a.wahl_ab is not null and a.wahl_ab > now() then frei := false; grund := 'Die nächste Versammlung ist frühestens am ' || to_char(a.wahl_ab at time zone 'Europe/Berlin', 'DD.MM. "um" HH24:MI') || ' Uhr.';
    end if;
  end if;
  if kap.id is not null and exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.status = 'laeuft' and q.id <> coalesce(runid, 0) and not q_nebenbei(q.quest_id)) then frei := false; grund := coalesce(grund, 'Erst das laufende Abenteuer beenden.'); end if;
  select * into w from dorf_wahlen where village_id = v.id and player_id = auth.uid() order by id desc limit 1;
  return json_build_object(
    'ansehen', json_build_object('wort', ansehen_wort(prof.ansehen), 'stufe', least(4, case when prof.ansehen >= 160 then 4 when prof.ansehen >= 120 then 3 when prof.ansehen >= 70 then 2 when prof.ansehen >= 30 then 1 else 0 end),
      'anteil', least(1.0, prof.ansehen / 160.0), 'kandidat', prof.ansehen >= 120,
      'zuletzt', (select coalesce(json_agg(json_build_object('delta', l.delta, 'grund', l.grund) order by l.at desc), '[]'::json) from (select * from ansehen_log where player_id = auth.uid() order by at desc limit 5) l)),
    'kapitel', a.kapitel,
    'chronik', case when kap.id is null then null else json_build_object('id', kap.id, 'kapitel', a.kapitel, 'titel', kap.titel, 'kurz', amt_text(kap.kurz, jsonb_build_object('V', jsonb_build_object('name', coalesce(vname, 'Der Vorsteher'))), '{}'), 'run', runid, 'frei', frei, 'grund', grund,
      'erledigt', exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.quest_id = kap.id and q.status = 'fertig')) end,
    'amt', json_build_object('typ', a.meister_typ, 'ich', a.meister_typ = 'spieler' and a.meister_player = auth.uid(), 'vorsteher', vname, 'vorsteher_id', a.vorsteher_npc, 'fokus', a.fokus, 'seit', a.seit,
      'leistung', case when a.meister_typ = 'spieler' then 100 else 50 end, 'gunst', gunst_wort(a.koenig_gunst), 'koenig', 'König Ottokar'),
    'wahl', case when w.id is null then null else json_build_object('id', w.id, 'status', w.status, 'ja', w.ja, 'nein', w.nein, 'gegner', w.gegner_name, 'gesehen', w.gesehen, 'stimmen', w.stimmen) end,
    'offen', (select coalesce(json_agg(json_build_object('id', e.id, 'art', t.art, 'titel', t.titel, 'text', amt_text(t.text, e.rollen, e.daten), 'frist', e.frist,
        'optionen', (select json_agg(amt_text(o->>'text', e.rollen, e.daten)) from jsonb_array_elements(t.optionen) o)) order by e.created_at), '[]'::json)
      from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage where e.village_id = v.id and e.status = 'offen' and a.meister_typ = 'spieler' and a.meister_player = auth.uid()),
    'aushaenge', (select coalesce(json_agg(x order by x->>'am' desc), '[]'::json) from (select json_build_object('id', e.id, 'art', t.art, 'titel', t.titel, 'text', amt_text(t.text, e.rollen, e.daten), 'ergebnis', e.ergebnis, 'von', e.von,
        'wahl', amt_text(t.optionen->(e.wahl)->>'text', e.rollen, e.daten), 'am', e.entschieden_at) x
      from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage where e.village_id = v.id and e.status = 'entschieden' order by e.entschieden_at desc limit 4) s)
  );
end $$;

create or replace function public.chronik_start(p_begleiter bigint[]) returns json language plpgsql security definer set search_path = public as $$
declare v villages; a dorf_amt; t quest_templates; rol jsonb; r text; n record; used bigint[]; rid bigint; nein text; st json;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); a := amt_init(v.id);
  st := amt_status();
  if json_typeof(st->'chronik') is distinct from 'object' then return json_build_object('ok', false, 'grund', 'Die Chronik geht bald weiter.'); end if;
  if (st->'chronik'->>'run') is not null then return json_build_object('ok', true, 'view', quest_view((st->'chronik'->>'run')::bigint)); end if;
  if not (st->'chronik'->>'frei')::boolean then return json_build_object('ok', false, 'grund', st->'chronik'->>'grund'); end if;
  select * into t from quest_templates where id = st->'chronik'->>'id';
  p_begleiter := coalesce(p_begleiter, '{}');
  if array_length(p_begleiter, 1) > 2 then raise exception 'Höchstens zwei Begleiter'; end if;
  if exists (select 1 from unnest(p_begleiter) b left join npcs x on x.id = b where x.id is null or x.village_id is distinct from v.id) then raise exception 'Begleiter müssen in deinem Dorf leben'; end if;
  select string_agg(x.name, ', ') into nein from npcs x left join npc_relations rr on rr.npc_id = x.id and rr.player_id = auth.uid() where x.id = any(p_begleiter) and coalesce(rr.sympathy, 0) < 0;
  if nein is not null then return json_build_object('ok', false, 'grund', 'Nicht bereit, mit dir zu gehen: ' || nein); end if;
  -- Rollen: V ist der Vorsteher, die anderen zufällige Bewohner (keine Begleiter)
  rol := '{}'; used := p_begleiter || coalesce(a.vorsteher_npc, 0);
  if a.vorsteher_npc is not null then select x.id, x.name, x.job into n from npcs x where x.id = a.vorsteher_npc; rol := jsonb_build_object('V', jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)); end if;
  for r in select k from jsonb_object_keys(t.rollen) k where k <> 'V' order by k loop
    select x.id, x.name, x.job into n from npcs x where x.village_id = v.id and x.id <> all(used) order by random() limit 1;
    if n.id is null then select x.id, x.name, x.job into n from npcs x where x.village_id = v.id and x.id <> coalesce(a.vorsteher_npc, 0) order by random() limit 1; end if;
    if n.id is null then return json_build_object('ok', false, 'grund', 'Im Dorf leben noch zu wenige Leute.'); end if;
    rol := rol || jsonb_build_object(r, jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)); used := used || n.id;
  end loop;
  insert into quest_runs (player_id, quest_id, szene, begleiter, rollen) values (auth.uid(), t.id, t.def->>'start', p_begleiter, rol) returning id into rid;
  return json_build_object('ok', true, 'view', quest_view(rid));
end $$;

create or replace function public.amt_antwort(p_ja boolean) returns json language plpgsql security definer set search_path = public as $$
declare v villages; w dorf_wahlen; nm text; eid bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); perform amt_init(v.id);
  select * into w from dorf_wahlen where village_id = v.id and player_id = auth.uid() and status = 'gewaehlt' order by id desc limit 1 for update;
  if w.id is null then return json_build_object('ok', false, 'grund', 'Keine offene Wahl.'); end if;
  select character_name into nm from profiles where id = auth.uid();
  if p_ja then
    update dorf_wahlen set status = 'angenommen', entschieden_at = now(), gesehen = true where id = w.id;
    update dorf_amt set meister_typ = 'spieler', meister_player = auth.uid(), kapitel = greatest(kapitel, 4), seit = now(), naechstes_ereignis = now() + interval '20 hours' where village_id = v.id;
    perform ansehen_add(auth.uid(), 10, 'Zum Dorfmeister gewählt');
    perform eco_add(v.id, '{"stimmung": 4}');
    perform eco_log(v.id, 'amt', nm || ' hat den Amtseid geleistet und ist jetzt Dorfmeister. ' || coalesce(w.gegner_name, 'Der Vorsteher') || ' übergibt die Schlüssel des Langhauses.', null, now());
    insert into dorf_ereignisse (village_id, vorlage, rollen, frist) values (v.id, 'antritt', '{}', now() + interval '72 hours') returning id into eid;
    return json_build_object('ok', true, 'text', 'Du hast den Amtseid geleistet. Von heute an führst du das Dorf.');
  else
    update dorf_wahlen set status = 'abgelehnt', entschieden_at = now(), gesehen = true where id = w.id;
    update dorf_amt set wahl_ab = now() + interval '3 days' where village_id = v.id;
    perform eco_log(v.id, 'amt', nm || ' hat die Wahl angenommen – und das Amt dann doch abgelehnt. ' || coalesce(w.gegner_name, 'Der Vorsteher') || ' führt das Dorf weiter.', null, now());
    return json_build_object('ok', true, 'text', 'Du bleibst Bewohner. ' || coalesce(w.gegner_name, 'Der Vorsteher') || ' führt das Dorf weiter – mit halber Kraft. In ein paar Tagen kannst du erneut antreten.');
  end if;
end $$;

create or replace function public.amt_gesehen(p_wahl bigint) returns void language sql security definer set search_path = public as $$
  update dorf_wahlen set gesehen = true where id = p_wahl and player_id = auth.uid();
$$;

create or replace function public.amt_ruecktritt() returns json language plpgsql security definer set search_path = public as $$
declare v villages; nm text;
begin
  select * into v from villages where owner_id = auth.uid();
  if not amt_ist_meister(auth.uid(), v.id) then return json_build_object('ok', false, 'grund', 'Du bist nicht Dorfmeister.'); end if;
  select character_name into nm from profiles where id = auth.uid();
  update dorf_amt set meister_typ = 'vorsteher', meister_player = null, wahl_ab = now() + interval '3 days', fokus = 'ausgewogen' where village_id = v.id;
  perform amt_init(v.id);
  perform eco_log(v.id, 'amt', nm || ' hat das Amt des Dorfmeisters niedergelegt. Der Vorsteher übernimmt wieder.', null, now());
  return json_build_object('ok', true);
end $$;

create or replace function public.amt_fokus(p_fokus text) returns json language plpgsql security definer set search_path = public as $$
declare v villages; nm text;
begin
  select * into v from villages where owner_id = auth.uid();
  if not amt_ist_meister(auth.uid(), v.id) then return json_build_object('ok', false, 'grund', 'Nur der Dorfmeister legt den Fokus fest.'); end if;
  if p_fokus not in ('ausgewogen', 'nahrung', 'baustoffe', 'handwerk', 'wachstum') then raise exception 'Unbekannter Fokus'; end if;
  perform eco_tick(v.id);
  update dorf_amt set fokus = p_fokus where village_id = v.id;
  select character_name into nm from profiles where id = auth.uid();
  perform eco_log(v.id, 'amt', 'Ratssitzung: ' || nm || ' legt den Schwerpunkt auf ' || case p_fokus when 'nahrung' then 'Nahrung und Vorräte' when 'baustoffe' then 'Holz und Stein' when 'handwerk' then 'Handwerk und Waren' when 'wachstum' then 'Zuzug und Wachstum' else 'ein ausgewogenes Dorfleben' end || '.', null, now());
  return json_build_object('ok', true);
end $$;

create or replace function public.amt_entscheiden(p_ereignis bigint, p_wahl int) returns json language plpgsql security definer set search_path = public as $$
declare v villages; e dorf_ereignisse; txt text;
begin
  select * into v from villages where owner_id = auth.uid();
  select * into e from dorf_ereignisse where id = p_ereignis and village_id = v.id;
  if e.id is null or e.status <> 'offen' then return json_build_object('ok', false, 'grund', 'Darüber ist schon entschieden.'); end if;
  if not amt_ist_meister(auth.uid(), v.id) then return json_build_object('ok', false, 'grund', 'Darüber entscheidet der Dorfmeister.'); end if;
  txt := amt_apply(e.id, p_wahl, 'spieler', auth.uid());
  return json_build_object('ok', true, 'text', txt);
end $$;

create or replace function public.amt_verbannen(p_npc bigint) returns json language plpgsql security definer set search_path = public as $$
declare v villages; n npcs; nm text;
begin
  select * into v from villages where owner_id = auth.uid();
  if not amt_ist_meister(auth.uid(), v.id) then return json_build_object('ok', false, 'grund', 'Nur der Dorfmeister kann jemanden aus dem Dorf weisen.'); end if;
  select * into n from npcs where id = p_npc and village_id = v.id;
  if n.id is null then return json_build_object('ok', false, 'grund', 'Diese Person lebt nicht in deinem Dorf.'); end if;
  if n.id = (select vorsteher_npc from dorf_amt where village_id = v.id) then return json_build_object('ok', false, 'grund', 'Den alten Vorsteher kannst du nicht einfach fortschicken – das Dorf würde es dir nie verzeihen.'); end if;
  select character_name into nm from profiles where id = auth.uid();
  update npcs set village_id = null, home_plot = null where id = n.id;
  insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (n.id, auth.uid(), 0, 0) on conflict do nothing;
  update npc_relations set sympathy = greatest(-100, sympathy - 40), updated_at = now() where npc_id = n.id and player_id = auth.uid();
  update npc_relations set sympathy = greatest(-100, sympathy - 2), updated_at = now() where player_id = auth.uid() and npc_id in (select id from npcs where village_id = v.id);
  perform eco_add(v.id, '{"stimmung": -4}');
  perform ansehen_add(auth.uid(), -3, n.name || ' aus dem Dorf gewiesen');
  perform eco_log(v.id, 'amt', 'Dorfmeister ' || nm || ' hat ' || n.name || ' aus dem Dorf gewiesen.', n.id, now());
  return json_build_object('ok', true, 'text', n.name || ' packt die Sachen und verlässt das Dorf. Ein paar Leute schauen betreten zu Boden.');
end $$;

revoke execute on function public.amt_status(), public.chronik_start(bigint[]), public.amt_antwort(boolean), public.amt_gesehen(bigint), public.amt_ruecktritt(), public.amt_fokus(text),
  public.amt_entscheiden(bigint, int), public.amt_verbannen(bigint) from public, anon;
grant execute on function public.amt_status(), public.chronik_start(bigint[]), public.amt_antwort(boolean), public.amt_gesehen(bigint), public.amt_ruecktritt(), public.amt_fokus(text),
  public.amt_entscheiden(bigint, int), public.amt_verbannen(bigint) to authenticated;
revoke execute on function public.ansehen_add(uuid, int, text), public.amt_init(bigint), public.amt_wahl(public.quest_runs), public.amt_apply(bigint, int, text, uuid), public.amt_ereignis_neu(bigint),
  public.amt_bittsteller(bigint), public.amt_tick(bigint), public.amt_tick_all() from public, anon, authenticated;
