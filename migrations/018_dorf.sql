-- Migration 018: Das Dorf lebt. Rohstoffe (Holz, Stein, Nahrung, Waren) entstehen aus der Arbeit der Bewohner,
-- werden gegessen, verheizt und verbaut. Jahreszeiten, Lager, Stimmung, Zuzug und Wegzug.
-- Der Dorfrat plant selbst, was als Nächstes gebaut wird; Baumeister bauen langsam in Echtzeit.
-- Spieler sind Dorfbewohner: mithelfen, Vorschläge machen, durch Quests Vorräte bringen oder verlieren.
-- Takt: jede Stunde (pg_cron) und bei jedem Aufruf des eigenen Dorfes (holt verpasste Stunden nach).

-- ───────────── Daten ─────────────
create table if not exists public.eco_plots (id int primary key, size text not null check (size in ('S','M','L')));
insert into public.eco_plots (id, size) values (1,'L'),(2,'L'),(3,'L'),(4,'L'),(5,'L'),(6,'L'),(7,'L'),(8,'L'),(9,'M'),(10,'M'),(11,'M'),(12,'M'),(13,'M'),(14,'M'),(15,'M'),(16,'M'),(17,'M'),(18,'M'),(19,'M'),(20,'S'),(21,'S'),(22,'S'),(23,'S')
on conflict (id) do update set size = excluded.size;

create table if not exists public.eco_buildings (
  id text primary key, name text not null, dat text not null, size text not null check (size in ('S','M','L')),
  kosten jsonb not null, arbeit numeric not null, max_stufe int not null default 5,
  wohnraum int not null default 0, stimmung numeric not null default 0, schutz numeric not null default 0,
  lager jsonb not null default '{}', benoetigt text[] not null default '{}', laut boolean not null default false,
  zuzug numeric not null default 0, rolle text not null, mehrfach boolean not null default false
);
insert into public.eco_buildings (id, name, dat, size, kosten, arbeit, max_stufe, wohnraum, stimmung, schutz, lager, benoetigt, laut, zuzug, rolle, mehrfach) values
 ('huette','Hütte','eine Hütte','S','{"holz":20}',12,3,2,0,0,'{"nahrung":10}','{}',false,0,'wohnen',true),
 ('wohnhaus','Wohnhaus','ein Wohnhaus','S','{"holz":35,"stein":10}',30,6,3,1,0,'{"nahrung":15}','{}',false,0,'wohnen',true),
 ('langhaus','Langhaus','ein Langhaus','L','{"holz":100,"stein":30}',90,6,8,3,0,'{"nahrung":30}','{}',false,0,'gemeinschaft',false),
 ('gasthaus','Gasthaus','ein Gasthaus','M','{"holz":70,"stein":20}',60,6,2,4,0,'{}','{langhaus}',false,2,'gemeinschaft',false),
 ('feld','Feld','ein Feld','M','{"holz":10}',9,5,0,0,0,'{}','{}',false,0,'nahrung',true),
 ('scheune','Scheune','eine Scheune','M','{"holz":50}',36,5,0,0,0,'{"nahrung":150}','{}',false,0,'lager',false),
 ('muehle','Windmühle','eine Windmühle','M','{"holz":60,"stein":25}',72,4,0,0,0,'{}','{feld}',false,0,'nahrung',false),
 ('baeckerei','Bäckerei','eine Bäckerei','S','{"holz":35,"stein":25}',42,5,0,2,0,'{}','{muehle}',false,0,'nahrung',false),
 ('brauerei','Brauerei','eine Brauerei','M','{"holz":50,"stein":15}',54,4,0,2,0,'{}','{feld}',true,0,'gemeinschaft',false),
 ('imkerei','Imkerei','eine Imkerei','S','{"holz":20}',24,4,0,1,0,'{}','{}',false,0,'nahrung',false),
 ('stall','Viehstall','einen Viehstall','L','{"holz":60}',48,5,0,0,0,'{}','{}',true,0,'nahrung',false),
 ('jagdhuette','Jagdhütte','eine Jagdhütte','S','{"holz":30}',30,5,0,0,1,'{}','{}',false,0,'nahrung',false),
 ('holzfaeller','Holzfällerhütte','eine Holzfällerhütte','S','{"holz":15}',18,5,0,0,0,'{}','{}',true,0,'holz',false),
 ('saegewerk','Sägewerk','ein Sägewerk','M','{"holz":40,"waren":4}',48,4,0,0,0,'{}','{holzfaeller}',true,0,'holz',false),
 ('steinmetz','Steinmetzhütte','eine Steinmetzhütte','S','{"holz":25}',30,5,0,0,0,'{}','{}',true,0,'stein',false),
 ('koehlerei','Köhlerei','eine Köhlerei','S','{"holz":25}',24,4,0,0,0,'{}','{holzfaeller}',true,0,'waren',false),
 ('schmiede','Schmiede','eine Schmiede','M','{"holz":35,"stein":35}',60,5,0,0,1,'{}','{}',true,0,'waren',false),
 ('gerberei','Gerberei','eine Gerberei','S','{"holz":30}',30,4,0,0,0,'{}','{jagdhuette}',true,0,'waren',false),
 ('weberei','Weberei','eine Weberei','S','{"holz":35}',36,4,0,1,0,'{}','{stall}',false,0,'waren',false),
 ('toepferei','Töpferei','eine Töpferei','S','{"holz":25,"stein":10}',30,4,0,0,0,'{}','{}',false,0,'waren',false),
 ('markt','Marktplatz','einen Marktplatz','M','{"holz":40}',36,5,0,2,0,'{}','{}',false,1,'gemeinschaft',false),
 ('heilerhaus','Heilerhaus','ein Heilerhaus','S','{"holz":35,"stein":10}',42,5,0,2,0,'{}','{}',false,0,'gemeinschaft',false),
 ('schrein','Schrein','einen Schrein','S','{"stein":30}',24,4,0,2,0,'{}','{steinmetz}',false,0,'gemeinschaft',false),
 ('schreibstube','Schreibstube','eine Schreibstube','M','{"holz":35,"stein":35}',60,4,0,1,0,'{}','{langhaus}',false,0,'gemeinschaft',false),
 ('alchemistenturm','Alchemistenturm','einen Alchemistenturm','S','{"holz":15,"stein":50}',84,3,0,0,0,'{}','{schreibstube}',false,0,'gemeinschaft',false),
 ('wachturm','Wachturm','einen Wachturm','S','{"holz":40}',36,5,0,0,3,'{}','{}',false,0,'schutz',false),
 ('kaserne','Kaserne','eine Kaserne','L','{"holz":80,"stein":35,"waren":8}',108,4,4,-1,6,'{}','{schmiede,langhaus}',true,0,'schutz',false),
 ('lagerhaus','Lagerhaus','ein Lagerhaus','L','{"holz":70}',48,5,0,0,0,'{"holz":150,"stein":150,"nahrung":150,"waren":60}','{}',false,0,'lager',false)
on conflict (id) do update set name = excluded.name, dat = excluded.dat, size = excluded.size, kosten = excluded.kosten, arbeit = excluded.arbeit, max_stufe = excluded.max_stufe,
  wohnraum = excluded.wohnraum, stimmung = excluded.stimmung, schutz = excluded.schutz, lager = excluded.lager, benoetigt = excluded.benoetigt, laut = excluded.laut,
  zuzug = excluded.zuzug, rolle = excluded.rolle, mehrfach = excluded.mehrfach;

-- Was ein Beruf hervorbringt (je Stunde), wo er am besten arbeitet, ob die Jahreszeit zählt, wie gut er baut, was er verbraucht.
create table if not exists public.eco_jobs (job text primary key, res text not null, rate numeric not null, gebaeude text, saison text, bau numeric not null default 0.15, holz_verbrauch numeric not null default 0);
insert into public.eco_jobs (job, res, rate, gebaeude, saison, bau, holz_verbrauch) values
 ('Holzfäller','holz',1.0,'holzfaeller',null,0.6,0), ('Zimmermann','holz',0.5,'saegewerk',null,1.0,0), ('Wagner','waren',0.21,'saegewerk',null,0.7,0),
 ('Steinmetz','stein',0.45,'steinmetz',null,0.8,0), ('Bergmann','stein',0.45,'steinmetz',null,0.5,0),
 ('Bauer','nahrung',0.75,'feld','feld',0.3,0), ('Bäuerin','nahrung',0.75,'feld','feld',0.3,0), ('Müllerin','nahrung',0.4,'muehle','feld',0.15,0),
 ('Bäcker','nahrung',0.5,'baeckerei',null,0.15,0.05), ('Imkerin','nahrung',0.3,'imkerei','feld',0.15,0),
 ('Jäger','nahrung',0.5,'jagdhuette','jagd',0.2,0), ('Jägerin','nahrung',0.5,'jagdhuette','jagd',0.2,0), ('Falknerin','nahrung',0.4,'jagdhuette','jagd',0.15,0),
 ('Fallensteller','nahrung',0.5,'jagdhuette','jagd',0.15,0), ('Rattenfänger','nahrung',0.2,'scheune',null,0.15,0),
 ('Hirte','nahrung',0.5,'stall',null,0.2,0), ('Stallbursche','nahrung',0.4,'stall',null,0.3,0), ('Metzger','nahrung',0.3,'stall',null,0.15,0),
 ('Fischer','nahrung',0.55,null,'jagd',0.15,0), ('Fährmann','waren',0.14,null,null,0.3,0), ('Koch','nahrung',0.3,'gasthaus',null,0.15,0),
 ('Wirt','stimmung',1,'gasthaus',null,0.15,0), ('Schankmaid','stimmung',1,'gasthaus',null,0.15,0), ('Barde','stimmung',1,'gasthaus',null,0.1,0), ('Brauer','stimmung',1,'brauerei',null,0.15,0),
 ('Schmied','waren',0.28,'schmiede',null,0.4,0.2), ('Waffenschmiedin','waren',0.21,'schmiede',null,0.3,0.15), ('Rüstmacher','waren',0.21,'schmiede',null,0.3,0.15),
 ('Schuster','waren',0.21,'gerberei',null,0.15,0), ('Pfeilmacher','waren',0.21,'jagdhuette',null,0.2,0), ('Köhler','waren',0.17,'koehlerei',null,0.3,0.4),
 ('Gerberin','waren',0.21,'gerberei',null,0.15,0), ('Schneiderin','waren',0.21,'weberei',null,0.15,0), ('Weberin','waren',0.21,'weberei',null,0.15,0),
 ('Töpfer','waren',0.21,'toepferei',null,0.2,0.05), ('Kerzenzieherin','waren',0.14,'imkerei',null,0.15,0), ('Wäscherin','stimmung',0.8,null,null,0.15,0),
 ('Heilerin','stimmung',1,'heilerhaus',null,0.15,0), ('Kräuterfrau','stimmung',1,'heilerhaus',null,0.15,0), ('Alchemist','stimmung',0.8,'alchemistenturm',null,0.15,0), ('Seherin','stimmung',0.8,'alchemistenturm',null,0.1,0),
 ('Priesterin','stimmung',1,'schrein',null,0.15,0), ('Mönch','stimmung',1,'schrein',null,0.2,0), ('Dorfälteste','stimmung',1,'langhaus',null,0.2,0), ('Totengräber','stimmung',0.6,'schrein',null,0.3,0),
 ('Wache','schutz',1,'wachturm',null,0.3,0), ('Hauptmann','schutz',1.5,'kaserne',null,0.3,0), ('Söldnerin','schutz',1,'kaserne',null,0.4,0),
 ('Schreiber','stimmung',0.6,'schreibstube',null,0.1,0), ('Gelehrter','stimmung',0.6,'schreibstube',null,0.1,0), ('Händler','waren',0.21,'markt',null,0.15,0)
on conflict (job) do update set res = excluded.res, rate = excluded.rate, gebaeude = excluded.gebaeude, saison = excluded.saison, bau = excluded.bau, holz_verbrauch = excluded.holz_verbrauch;

create table if not exists public.village_eco (
  village_id bigint primary key references public.villages(id) on delete cascade,
  res jsonb not null default '{"holz":60,"stein":20,"nahrung":120,"waren":10}',
  stufen jsonb not null default '{}',
  stimmung numeric not null default 60, bonus numeric not null default 0, hunger_h int not null default 0,
  tick_at timestamptz not null default now(), trend jsonb not null default '{}', rates jsonb,
  vorschlag jsonb, zuzug_at timestamptz
);
create table if not exists public.village_projects (
  id bigint generated always as identity primary key,
  village_id bigint not null references public.villages(id) on delete cascade,
  art text not null check (art in ('neu','ausbau')), gebaeude text not null references public.eco_buildings(id), plot int not null, stufe int not null,
  kosten jsonb not null, arbeit_soll numeric not null, arbeit_ist numeric not null default 0,
  status text not null default 'geplant' check (status in ('geplant','im_bau','fertig','verworfen')),
  grund text, vorgeschlagen uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), started_at timestamptz, done_at timestamptz
);
create index if not exists village_projects_v_idx on public.village_projects (village_id, status);
create table if not exists public.village_log (
  id bigint generated always as identity primary key, village_id bigint not null references public.villages(id) on delete cascade,
  at timestamptz not null default now(), art text not null, text text not null, npc_id bigint references public.npcs(id) on delete set null
);
create index if not exists village_log_v_idx on public.village_log (village_id, at desc);
alter table public.profiles add column if not exists dorf_gesehen timestamptz;
alter table public.profiles add column if not exists hilfe_at timestamptz;
alter table public.profiles add column if not exists vorschlag_at timestamptz;
alter table public.npcs add column if not exists reserviert boolean not null default false;

alter table public.eco_plots enable row level security; alter table public.eco_buildings enable row level security; alter table public.eco_jobs enable row level security;
alter table public.village_eco enable row level security; alter table public.village_projects enable row level security; alter table public.village_log enable row level security;
revoke all on public.eco_plots, public.eco_buildings, public.eco_jobs, public.village_eco, public.village_projects, public.village_log from anon, authenticated;

-- ───────────── Hilfsfunktionen ─────────────
create or replace function public.eco_season(t timestamptz) returns text language sql immutable as $$
  select case when extract(month from t at time zone 'Europe/Berlin') in (12,1,2) then 'winter' when extract(month from t at time zone 'Europe/Berlin') in (3,4,5) then 'fruehling'
              when extract(month from t at time zone 'Europe/Berlin') in (6,7,8) then 'sommer' else 'herbst' end;
$$;
create or replace function public.eco_sfak(kind text, season text) returns numeric language sql immutable as $$
  select case kind when 'feld' then (case season when 'fruehling' then 0.6 when 'sommer' then 1.1 when 'herbst' then 1.3 else 0.5 end)
                   when 'jagd' then (case season when 'winter' then 0.8 else 1.0 end) else 1.0 end;
$$;
create or replace function public.eco_lvl(st jsonb, p int) returns int language sql immutable as $$ select coalesce((st->>p::text)::int, 1); $$;
create or replace function public.eco_size(s text) returns int language sql immutable as $$ select case s when 'S' then 1 when 'M' then 2 else 3 end; $$;
create or replace function public.eco_kosten(b public.eco_buildings, stufe int) returns jsonb language sql immutable as $$
  -- Neubau = Grundkosten; Ausbau auf Stufe n kostet mehr, ab Stufe 4 zusätzlich Stein
  select (select jsonb_object_agg(k, ceil(v::numeric * case when stufe <= 1 then 1 else 0.5 + 0.35 * stufe end)) from jsonb_each_text(b.kosten) x(k, v))
    || case when stufe >= 3 then jsonb_build_object('waren', ceil(coalesce((b.kosten->>'holz')::numeric, 0) * 0.08 * (stufe - 2)) + coalesce((b.kosten->>'waren')::numeric, 0)) else '{}'::jsonb end
    || case when stufe >= 4 then jsonb_build_object('stein', ceil(coalesce((b.kosten->>'stein')::numeric, 0) * (0.5 + 0.35 * stufe) + coalesce((b.kosten->>'holz')::numeric, 0) * 0.3 * (stufe - 2))) else '{}'::jsonb end;
$$;
create or replace function public.eco_names(ids bigint[]) returns text language sql stable as $$
  select case when count(*) = 0 then null when count(*) = 1 then min(name) when count(*) = 2 then string_agg(name, ' und ' order by name)
    else string_agg(name, ', ' order by name) filter (where rn < count_all) || ' und ' || max(name) filter (where rn = count_all) end
  from (select name, row_number() over (order by name) rn, count(*) over () count_all from npcs where id = any(ids)) x;
$$;
create or replace function public.eco_log(p_v bigint, p_art text, p_text text, p_npc bigint default null, p_at timestamptz default now()) returns void language sql security definer set search_path = public as $$
  insert into village_log (village_id, at, art, text, npc_id) values (p_v, p_at, p_art, p_text, p_npc);
$$;

-- Stündliche Grundwerte eines Dorfes (ohne Stimmung/Hunger, die kommen im Takt dazu)
create or replace function public.eco_rates(p_v bigint, p_season text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v villages; e village_eco; n record; j eco_jobs; pl int; fac numeric; amt numeric;
  ph numeric := 0; ps numeric := 0; pn numeric := 0; pw numeric := 0; bh numeric := 0; bs numeric := 0; bn numeric := 0; bw numeric := 0;
  stim numeric := 0; schutz numeric := 0; bau numeric := 0; cnt int := 0; wohn numeric := 0; gstim numeric := 0; zuz numeric := 0;
  cap jsonb := '{"holz":120,"stein":80,"nahrung":150,"waren":40}'; b eco_buildings; lay record; lv int; k text; val text;
begin
  select * into v from villages where id = p_v; select * into e from village_eco where village_id = p_v;
  for n in select id, job from npcs where village_id = p_v loop
    cnt := cnt + 1; ph := ph + 0.05; pn := pn + 0.08; pw := pw - 0.006;   -- jeder sammelt nebenbei Brennholz und Essbares, Werkzeug nutzt sich ab
    select * into j from eco_jobs where job = n.job;
    if j.job is null then pn := pn + 0.15; ph := ph + 0.1; bau := bau + 0.15; continue; end if;
    pl := layout_plot(v.layout, j.gebaeude);
    fac := case when j.gebaeude is null then 0.8 when pl is null then 0.5 else 1 + 0.2 * (eco_lvl(e.stufen, pl) - 1) end;
    amt := j.rate * fac * eco_sfak(j.saison, p_season);
    if j.res = 'holz' then if j.bau >= 0.5 then bh := bh + amt; else ph := ph + amt; end if;
    elsif j.res = 'stein' then if j.bau >= 0.5 then bs := bs + amt; else ps := ps + amt; end if;
    elsif j.res = 'nahrung' then if j.bau >= 0.5 then bn := bn + amt; else pn := pn + amt; end if;
    elsif j.res = 'waren' then if j.bau >= 0.5 then bw := bw + amt; else pw := pw + amt; end if;
    elsif j.res = 'stimmung' then stim := stim + 3 * j.rate * fac;
    elsif j.res = 'schutz' then schutz := schutz + 3 * j.rate * fac; end if;
    ph := ph - j.holz_verbrauch; bau := bau + j.bau;
  end loop;
  for lay in select e2->>0 as typ, (e2->>1)::int as plot from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) e2 loop
    select * into b from eco_buildings where id = lay.typ; continue when b.id is null;
    lv := eco_lvl(e.stufen, lay.plot);
    wohn := wohn + floor(b.wohnraum * (1 + 0.34 * (lv - 1)));
    gstim := gstim + b.stimmung * (1 + 0.1 * (lv - 1)); schutz := schutz + b.schutz * (1 + 0.1 * (lv - 1)); zuz := zuz + b.zuzug;
    for k, val in select * from jsonb_each_text(b.lager) loop cap := jsonb_set(cap, array[k], to_jsonb((cap->>k)::numeric + val::numeric * lv)); end loop;
  end loop;
  return jsonb_build_object('p', jsonb_build_object('holz', ph, 'stein', ps, 'nahrung', pn, 'waren', pw), 'b', jsonb_build_object('holz', bh, 'stein', bs, 'nahrung', bn, 'waren', bw),
    'essen', cnt * 0.3, 'heizen', cnt * case p_season when 'winter' then 0.04 when 'sommer' then 0 else 0.02 end,
    'bau', bau, 'bewohner', cnt, 'wohnraum', wohn, 'cap', cap, 'stim_jobs', least(20, stim), 'stim_geb', least(20, gstim * 3), 'schutz', schutz, 'zuzug', zuz, 'season', p_season);
end;
$$;

-- Dorfrat: Kandidaten für das nächste Bauprojekt, beste zuerst (mit Begründung in Worten)
create or replace function public.eco_candidates(p_v bigint, r jsonb, res jsonb, stim numeric, hunger int, p_limit int default 6) returns jsonb language plpgsql security definer set search_path = public as $$
declare v villages; e village_eco; b eco_buildings; lay record; acc jsonb := '[]'; s numeric; grund text; plot int; ids bigint[]; nm text;
  essen numeric := (r->>'essen')::numeric; netto_n numeric := (r->'p'->>'nahrung')::numeric + (r->'b'->>'nahrung')::numeric - essen;
  tage numeric := (res->>'nahrung')::numeric / greatest(0.1, essen * 24); frei numeric := (r->>'wohnraum')::numeric - (r->>'bewohner')::numeric;
  voll boolean; vs text; kost jsonb; lv int; cnt int; types text[];
begin
  select * into v from villages where id = p_v; select * into e from village_eco where village_id = p_v;
  select coalesce(array_agg(x->>0), '{}') into types from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x;
  -- Lager zählen als voll, wenn Baumaterial überläuft – oder im Sommer/Herbst die Wintervorräte keinen Platz mehr haben
  voll := exists (select 1 from jsonb_each_text(res) x(k, val) where (r->'cap'->>k) is not null and val::numeric > 0.85 * (r->'cap'->>k)::numeric
    and (k in ('holz','stein') or (k = 'nahrung' and r->>'season' in ('sommer','herbst'))));
  vs := case when e.vorschlag is not null and (e.vorschlag->>'bis')::timestamptz > now() then e.vorschlag->>'gebaeude' end;
  -- Neubauten
  for b in select * from eco_buildings loop
    continue when not b.mehrfach and b.id = any(types);
    continue when not (b.benoetigt <@ types);
    continue when exists (select 1 from village_projects p where p.village_id = p_v and p.status in ('geplant','im_bau') and p.gebaeude = b.id and p.art = 'neu');
    select p.id into plot from eco_plots p
      where not exists (select 1 from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x where (x->>1)::int = p.id)
        and not exists (select 1 from village_projects q where q.village_id = p_v and q.status in ('geplant','im_bau') and q.plot = p.id)
        and eco_size(p.size) >= eco_size(b.size)
      order by eco_size(p.size), case when b.laut then -p.id else p.id end limit 1;
    continue when plot is null;
    select array_agg(n.id) into ids from npcs n join eco_jobs j on j.job = n.job where n.village_id = p_v and j.gebaeude = b.id;
    cnt := coalesce(array_length(ids, 1), 0); s := 0; grund := null;
    if cnt > 0 and not (b.id = any(types)) then s := s + 25 * cnt; nm := eco_names(ids);
      grund := nm || case when cnt = 1 then ' hat' else ' haben' end || ' dafür bisher keinen richtigen Arbeitsplatz.'; end if;
    if b.rolle = 'nahrung' and (netto_n < 0 or tage < 3 or hunger > 0) and (cnt > 0 or b.id = 'feld') then s := s + 30 + case when hunger > 0 then 20 else 0 end; grund := coalesce(grund, 'Es wird mehr gegessen, als hereinkommt.'); end if;
    if b.rolle = 'wohnen' then
      if frei <= 1 then s := s + 45 + case when b.id = 'wohnhaus' and (res->>'stein')::numeric >= 10 then 8 else 0 end; grund := 'In den Häusern wird es eng.';
      elsif frei <= 3 then s := s + 8; grund := 'Damit Platz ist, wenn jemand herziehen will.'; else s := s - 30; end if;
    end if;
    if b.rolle = 'lager' and voll then s := s + 25; grund := coalesce(grund, 'Die Lager sind fast voll – was mehr kommt, verdirbt.'); end if;
    if b.rolle = 'lager' and not voll then s := s - 5; end if;
    if b.rolle = 'gemeinschaft' then s := s + case when stim < 55 then 20 else 3 end + b.zuzug * 3; if stim < 55 then grund := coalesce(grund, 'Die Stimmung im Dorf ist gedrückt.'); end if; end if;
    if b.rolle = 'schutz' then s := s + 4 + case when (r->>'bewohner')::int >= 10 then 8 else 0 end; grund := coalesce(grund, 'Ein sicheres Gefühl schadet nie.'); end if;
    if cnt = 0 and b.rolle not in ('wohnen','lager','schutz') and b.id <> 'feld' then
      if frei >= 2 then s := s + 3; grund := coalesce(grund, 'Vielleicht zieht so jemand her, der dort arbeiten will.'); else s := s - 15; end if;
    end if;
    if b.id = 'feld' and cnt = 0 then s := s - 10; end if;
    if b.id = 'feld' and b.id = any(types) then s := s - 15; end if;
    kost := eco_kosten(b, 1);
    s := s - (coalesce((kost->>'holz')::numeric, 0) + coalesce((kost->>'stein')::numeric, 0) * 1.5 + coalesce((kost->>'waren')::numeric, 0) * 3) / 15;
    if vs = b.id then s := s + 40; grund := 'Ein Vorschlag aus dem Dorf.'; end if;
    s := s + random() * 6;
    acc := acc || jsonb_build_object('art', 'neu', 'gebaeude', b.id, 'name', b.name, 'plot', plot, 'stufe', 1, 'kosten', kost, 'arbeit', b.arbeit, 'score', round(s, 1), 'grund', coalesce(grund, 'Das Dorf wächst.'));
  end loop;
  -- Ausbauten
  for lay in select x->>0 as typ, (x->>1)::int as plot from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x loop
    select * into b from eco_buildings where id = lay.typ; continue when b.id is null;
    lv := eco_lvl(e.stufen, lay.plot); continue when lv >= b.max_stufe;
    continue when exists (select 1 from village_projects p where p.village_id = p_v and p.status in ('geplant','im_bau') and p.plot = lay.plot);
    select array_agg(n.id) into ids from npcs n join eco_jobs j on j.job = n.job where n.village_id = p_v and j.gebaeude = b.id;
    cnt := coalesce(array_length(ids, 1), 0); s := -6 * lv; grund := null;
    if cnt > 0 and b.rolle not in ('wohnen','lager') then s := s + 8 + 6 * cnt; grund := eco_names(ids) || case when cnt = 1 then ' könnte' else ' könnten' end || ' dort mehr schaffen.'; end if;
    if b.rolle = 'nahrung' and cnt > 0 and (netto_n < 0 or tage < 3) then s := s + 20; grund := 'Es wird mehr gegessen, als hereinkommt.'; end if;
    if b.wohnraum > 0 and frei <= 1 then s := s + 30; grund := 'In den Häusern wird es eng.'; end if;
    if b.rolle = 'lager' and voll then s := s + 22; grund := 'Die Lager sind fast voll.'; end if;
    if b.stimmung > 0 and stim < 55 then s := s + 10; grund := coalesce(grund, 'Die Stimmung im Dorf ist gedrückt.'); end if;
    continue when grund is null and vs is distinct from b.id;
    kost := eco_kosten(b, lv + 1);
    s := s - (coalesce((kost->>'holz')::numeric, 0) + coalesce((kost->>'stein')::numeric, 0) * 1.5 + coalesce((kost->>'waren')::numeric, 0) * 3) / 15;
    if vs = b.id then s := s + 35; grund := 'Ein Vorschlag aus dem Dorf.'; end if;
    s := s + random() * 6;
    acc := acc || jsonb_build_object('art', 'ausbau', 'gebaeude', b.id, 'name', b.name, 'plot', lay.plot, 'stufe', lv + 1, 'kosten', kost, 'arbeit', ceil(b.arbeit * (0.5 + 0.35 * (lv + 1))), 'score', round(s, 1), 'grund', coalesce(grund, 'Ein Vorschlag aus dem Dorf.'));
  end loop;
  return (select coalesce(jsonb_agg(x order by (x->>'score')::numeric desc), '[]'::jsonb) from (select x from jsonb_array_elements(acc) x order by (x->>'score')::numeric desc limit p_limit) y);
end;
$$;

create or replace function public.eco_nom(dat text) returns text language sql immutable as $$ select regexp_replace(dat, '^einen ', 'ein '); $$;
create or replace function public.eco_res_name(k text) returns text language sql immutable as $$
  select case k when 'holz' then 'Holz' when 'stein' then 'Stein' when 'nahrung' then 'Vorräte' when 'waren' then 'Werkzeug und Waren' else k end;
$$;

-- Ein Bauprojekt ist fertig: Gebäude erscheint / Stufe steigt, Chronik
create or replace function public.eco_finish(p_proj bigint, p_at timestamptz) returns void language plpgsql security definer set search_path = public as $$
declare pr village_projects; b eco_buildings; ids bigint[]; txt text;
begin
  select * into pr from village_projects where id = p_proj for update; select * into b from eco_buildings where id = pr.gebaeude;
  update village_projects set status = 'fertig', done_at = p_at, arbeit_ist = arbeit_soll where id = pr.id;
  if pr.art = 'neu' then
    update villages set layout = coalesce(layout, '[]'::jsonb) || jsonb_build_array(jsonb_build_array(pr.gebaeude, pr.plot)) where id = pr.village_id;
    select array_agg(n.id) into ids from npcs n join eco_jobs j on j.job = n.job where n.village_id = pr.village_id and j.gebaeude = pr.gebaeude;
    txt := upper(left(eco_nom(b.dat), 1)) || substr(eco_nom(b.dat), 2) || ' ist fertig' || case when ids is not null then '. ' || eco_names(ids) || case when array_length(ids, 1) = 1 then ' arbeitet' else ' arbeiten' end || ' jetzt dort.' else '.' end;
  else
    update village_eco set stufen = jsonb_set(stufen, array[pr.plot::text], to_jsonb(pr.stufe)) where village_id = pr.village_id;
    txt := case when b.dat like 'eine %' then 'Die ' when b.dat like 'einen %' then 'Der ' else 'Das ' end || b.name || ' wurde ausgebaut'
      || case when pr.stufe >= 4 then ' – jetzt mit Mauern aus Stein.' else ' und ist jetzt größer.' end;
  end if;
  perform eco_log(pr.village_id, 'bau', txt, null, p_at);
end;
$$;

-- Zuzug: ein Wanderer zieht ein – bevorzugt jemand, dessen Arbeitsplatz im Dorf schon steht
create or replace function public.eco_zuzug(p_v bigint, p_at timestamptz, p_npc bigint default null) returns bigint language plpgsql security definer set search_path = public as $$
declare v villages; n npcs; types text[];
begin
  select * into v from villages where id = p_v;
  select coalesce(array_agg(x->>0), '{}') into types from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x;
  if p_npc is not null then select * into n from npcs where id = p_npc and village_id is null;
  else
    select w.* into n from npcs w left join eco_jobs j on j.job = w.job
      where w.village_id is null and w.travel_to is null and not w.reserviert
      order by (case when j.gebaeude = any(types) and not exists (select 1 from npcs o where o.village_id = p_v and o.job = w.job) then 3 else 1 end) * random() desc limit 1;
  end if;
  if n.id is null then return null; end if;
  update npcs set village_id = p_v, home_plot = null, travel_to = null where id = n.id;
  update village_eco set zuzug_at = p_at where village_id = p_v;
  perform eco_log(p_v, 'zuzug', n.name || ' (' || n.job || ') ist ins Dorf gezogen.', n.id, p_at);
  return n.id;
end;
$$;

-- Der Takt: holt alle verpassten Stunden nach (höchstens 14 Tage)
create or replace function public.eco_tick(p_v bigint) returns void language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare e village_eco; h int; i int; t timestamptz; season text := ''; r jsonb; dirty boolean := true; pr village_projects; f numeric; bauend boolean;
  holz numeric; stein numeric; nahrung numeric; waren numeric; stim numeric; bonus numeric; hunger int; cap jsonb; target numeric; tage numeric;
  c jsonb; ok boolean; k text; val text; d_holz numeric; d_stein numeric; d_nahr numeric; d_war numeric; w record; p numeric; start_at timestamptz; weg boolean := false;
begin
  select * into e from village_eco where village_id = p_v for update;
  if not found then insert into village_eco (village_id) values (p_v) on conflict do nothing; select * into e from village_eco where village_id = p_v for update; end if;
  h := floor(extract(epoch from (now() - e.tick_at)) / 3600)::int;
  if h < 1 then return; end if;
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
    d_holz := ((r->'p'->>'holz')::numeric + (r->'b'->>'holz')::numeric * case when bauend then 0.5 else 1 end) * f - (r->>'heizen')::numeric;
    d_stein := ((r->'p'->>'stein')::numeric + (r->'b'->>'stein')::numeric * case when bauend then 0.5 else 1 end) * f;
    d_nahr := ((r->'p'->>'nahrung')::numeric + (r->'b'->>'nahrung')::numeric * case when bauend then 0.5 else 1 end) * f - (r->>'essen')::numeric * case when nahrung < (r->>'essen')::numeric * 24 then 0.7 else 1 end;   -- knapp: es wird rationiert
    d_war := ((r->'p'->>'waren')::numeric + (r->'b'->>'waren')::numeric * case when bauend then 0.5 else 1 end) * f;
    holz := greatest(0, least((cap->>'holz')::numeric, holz + d_holz)); stein := greatest(0, least((cap->>'stein')::numeric, stein + d_stein));
    nahrung := greatest(0, least((cap->>'nahrung')::numeric, nahrung + d_nahr)); waren := greatest(0, least((cap->>'waren')::numeric, waren + d_war));
    if nahrung <= 0 then
      if hunger = 0 then perform eco_log(p_v, 'not', 'Die Vorräte sind aufgebraucht. Im Dorf wird gehungert.', null, t); end if;
      hunger := hunger + 1;
    elsif hunger > 0 then hunger := greatest(0, hunger - 2); if hunger = 0 then perform eco_log(p_v, 'gut', 'Es gibt wieder genug zu essen.', null, t); end if;
    end if;
    -- Bauprojekt
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
      update village_projects set arbeit_ist = arbeit_ist + (r->>'bau')::numeric * f where id = pr.id returning * into pr;
      if pr.arbeit_ist >= pr.arbeit_soll then perform eco_finish(pr.id, t); pr := null; dirty := true; end if;
    end if;
    -- Stimmung: strebt langsam einem Zielwert zu
    tage := nahrung / greatest(0.1, (r->>'essen')::numeric * 24);
    target := 45 + (r->>'stim_jobs')::numeric + (r->>'stim_geb')::numeric
      + case when hunger > 0 then -30 when tage < 1 then -10 when tage > 3 then 8 else 0 end
      + case when (r->>'bewohner')::numeric > (r->>'wohnraum')::numeric then -15 else 3 end
      + case season when 'winter' then -5 when 'sommer' then 3 else 0 end + bonus;
    target := greatest(0, least(100, target));
    stim := stim + (target - stim) * 0.1; bonus := bonus * 0.995;
    -- Zuzug und Wegzug
    if not dirty and hunger = 0 and tage >= 2 and stim >= 45 and (r->>'wohnraum')::numeric - (r->>'bewohner')::numeric >= 1
       and (e.zuzug_at is null or e.zuzug_at < t - interval '24 hours') then
      p := 0.006 + (r->>'zuzug')::numeric * 0.004 + greatest(0, stim - 50) / 100 * 0.006;
      if random() < p and eco_zuzug(p_v, t) is not null then dirty := true; e.zuzug_at := t; end if;
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
$$;

create or replace function public.eco_tick_all() returns int language plpgsql security definer set search_path = public as $$
declare v record; n int := 0;
begin
  for v in select id from villages loop perform eco_tick(v.id); n := n + 1; end loop;
  return n;
end;
$$;

-- Änderungen von außen (Quests, Abmachungen): kleine Beträge auf die Vorräte, Stimmungsbonus
create or replace function public.eco_add(p_v bigint, d jsonb) returns void language plpgsql security definer set search_path = public as $$
declare e village_eco; k text; val text; nres jsonb; cap jsonb;
begin
  perform eco_tick(p_v);
  select * into e from village_eco where village_id = p_v for update; if not found then return; end if;
  nres := e.res; cap := coalesce(e.rates->'cap', '{"holz":120,"stein":80,"nahrung":150,"waren":40}');
  for k, val in select * from jsonb_each_text(d) loop
    if k = 'stimmung' then update village_eco set bonus = greatest(-25, least(25, bonus + val::numeric)) where village_id = p_v;
    elsif k in ('holz','stein','nahrung','waren') then nres := jsonb_set(nres, array[k], to_jsonb(greatest(0, least(coalesce((cap->>k)::numeric, 999), coalesce((nres->>k)::numeric, 0) + val::numeric)))); end if;
  end loop;
  update village_eco set res = nres where village_id = p_v;
end;
$$;

-- Holz im Lager (für Abmachungen und alte Stellen): kommt jetzt aus dem Dorf-Kreislauf
create or replace function public.village_wood(v public.villages) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(floor((select (res->>'holz')::numeric from village_eco where village_id = v.id)), 0);
$$;

-- ───────────── Anzeige in Worten ─────────────
create or replace function public.eco_word(val numeric, cap numeric, bedarf numeric) returns text language sql immutable as $$
  select case when val < 1 then 'leer' when val < greatest(bedarf, cap * 0.12) then 'knapp' when val < cap * 0.4 then 'ausreichend' when val < cap * 0.75 then 'gut gefüllt' when val < cap * 0.95 then 'reichlich' else 'randvoll' end;
$$;
create or replace function public.eco_view(p_v bigint, p_uid uuid) returns json language plpgsql stable security definer set search_path = public as $$
declare e village_eco; r jsonb; pr village_projects; pl village_projects; b eco_buildings; ids bigint[]; rate numeric; fehlt text[]; k text; val text; essen numeric; wohnfrei numeric; prof profiles;
begin
  select * into e from village_eco where village_id = p_v; r := e.rates; if r is null then return null; end if;
  select * into prof from profiles where id = p_uid;
  select * into pr from village_projects where village_id = p_v and status = 'im_bau' order by id limit 1;
  select * into pl from village_projects where village_id = p_v and status = 'geplant' order by id limit 1;
  essen := (r->>'essen')::numeric; wohnfrei := (r->>'wohnraum')::numeric - (r->>'bewohner')::numeric;
  if pl.id is not null then
    for k, val in select * from jsonb_each_text(pl.kosten) loop if coalesce((e.res->>k)::numeric, 0) < val::numeric then fehlt := fehlt || eco_res_name(k); end if; end loop;
  end if;
  select array_agg(n.id) into ids from npcs n join eco_jobs j on j.job = n.job where n.village_id = p_v and j.bau >= 0.5;
  return json_build_object(
    'jahreszeit', r->>'season',
    'vorraete', (select json_agg(json_build_object('res', k2, 'name', eco_res_name(k2),
        'wort', eco_word((e.res->>k2)::numeric, (r->'cap'->>k2)::numeric, case k2 when 'nahrung' then essen * 24 else 5 end),
        'anteil', round(least(1, (e.res->>k2)::numeric / greatest(1, (r->'cap'->>k2)::numeric)), 2),
        'trend', case when coalesce((e.trend->>k2)::numeric, 0) > 0.15 then 'steigt' when coalesce((e.trend->>k2)::numeric, 0) < -0.15 then 'sinkt' else 'gleich' end) order by ord)
      from unnest(array['nahrung','holz','stein','waren']) with ordinality u(k2, ord)),
    'stimmung', case when e.stimmung >= 80 then 'ausgelassen' when e.stimmung >= 65 then 'zufrieden' when e.stimmung >= 50 then 'ruhig' when e.stimmung >= 35 then 'gedrückt' else 'verzweifelt' end,
    'hunger', e.hunger_h > 0,
    'wohnen', case when wohnfrei < 0 then 'überfüllt' when wohnfrei < 1 then 'eng' when wohnfrei < 3 then 'etwas Platz' else 'viel Platz' end,
    'schutz', case when (r->>'schutz')::numeric >= 12 then 'gut geschützt' when (r->>'schutz')::numeric >= 5 then 'bewacht' else 'kaum geschützt' end,
    'bau', case when pr.id is not null then json_build_object('id', pr.id, 'art', pr.art, 'gebaeude', pr.gebaeude, 'name', (select name from eco_buildings where id = pr.gebaeude), 'dat', (select dat from eco_buildings where id = pr.gebaeude),
        'plot', pr.plot, 'stufe', pr.stufe, 'fortschritt', round(least(1, pr.arbeit_ist / pr.arbeit_soll), 2), 'grund', pr.grund,
        'fertig_etwa', now() + make_interval(secs => greatest(0, pr.arbeit_soll - pr.arbeit_ist) / greatest(0.3, (r->>'bau')::numeric * (0.7 + 0.6 * e.stimmung / 100)) * 3600),
        'baumeister', eco_names(ids)) end,
    'plan', case when pl.id is not null then json_build_object('id', pl.id, 'art', pl.art, 'gebaeude', pl.gebaeude, 'name', (select name from eco_buildings where id = pl.gebaeude), 'dat', (select dat from eco_buildings where id = pl.gebaeude),
        'plot', pl.plot, 'stufe', pl.stufe, 'grund', pl.grund, 'fehlt', fehlt, 'seit', pl.created_at, 'vorschlag', pl.vorgeschlagen is not null) end,
    'stufen', e.stufen,
    'chronik', (select coalesce(json_agg(json_build_object('at', l.at, 'art', l.art, 'text', l.text) order by l.at desc), '[]'::json) from (select * from village_log where village_id = p_v order by at desc limit 14) l),
    'neu', (select coalesce(json_agg(json_build_object('at', l.at, 'art', l.art, 'text', l.text) order by l.at), '[]'::json) from (select * from village_log where village_id = p_v and art in ('bau','zuzug','wegzug','not','gut') and at > coalesce(prof.dorf_gesehen, now() - interval '2 days') order by at desc limit 8) l),
    'hilfe_ab', case when prof.hilfe_at > now() - interval '4 hours' then prof.hilfe_at + interval '4 hours' end,
    'vorschlag_ab', case when prof.vorschlag_at > now() - interval '20 hours' then prof.vorschlag_at + interval '20 hours' end
  );
end;
$$;

-- ───────────── Spieler-Handlungen ─────────────
create or replace function public.dorf_gesehen() returns void language sql security definer set search_path = public as $$
  update profiles set dorf_gesehen = now() where id = auth.uid();
$$;

create or replace function public.dorf_mithelfen() returns json language plpgsql security definer set search_path = public as $$
declare v villages; pr village_projects; prof profiles; amt numeric := 3; ids bigint[]; nid bigint; txt text; nm text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); select * into prof from profiles where id = auth.uid();
  perform eco_tick(v.id);
  if prof.hilfe_at > now() - interval '4 hours' then return json_build_object('ok', false, 'grund', 'muede', 'ab', prof.hilfe_at + interval '4 hours'); end if;
  select * into pr from village_projects where village_id = v.id and status = 'im_bau' order by id limit 1 for update;
  if pr.id is null then return json_build_object('ok', false, 'grund', 'keine_baustelle'); end if;
  if prof.herkunft = 'krieger' then amt := amt + 1; end if;
  if prof.zustand = 'verletzt' and prof.zustand_bis > now() then amt := amt - 1.5; end if;
  update village_projects set arbeit_ist = least(arbeit_soll, arbeit_ist + amt) where id = pr.id returning * into pr;
  update profiles set hilfe_at = now() where id = auth.uid();
  select array_agg(n.id) into ids from npcs n join eco_jobs j on j.job = n.job where n.village_id = v.id and j.bau >= 0.5;
  if ids is not null then
    foreach nid in array ids loop
      insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (nid, auth.uid(), 1, 0)
        on conflict (npc_id, player_id) do update set sympathy = least(100, npc_relations.sympathy + 1), updated_at = now();
    end loop;
    insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (ids[1], auth.uid(), 'gespraech', prof.character_name || ' hat mit mir an ' || (select dat from eco_buildings where id = pr.gebaeude) || ' gebaut.', 1);
  end if;
  nm := eco_names(ids);
  perform eco_log(v.id, 'hilfe', prof.character_name || ' hat beim Bau mit angepackt.', null);
  if pr.arbeit_ist >= pr.arbeit_soll then perform eco_finish(pr.id, now()); txt := 'Mit deiner Hilfe wird es heute noch fertig!';
  else txt := case when nm is not null then nm || case when array_length(ids, 1) = 1 then ' nickt' else ' nicken' end || ' dir zu. ' else '' end || 'Ein gutes Stück geschafft.'; end if;
  return json_build_object('ok', true, 'text', txt, 'fertig', pr.arbeit_ist >= pr.arbeit_soll);
end;
$$;

create or replace function public.dorf_vorschlaege() returns json language plpgsql security definer set search_path = public as $$
declare v villages; e village_eco;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); perform eco_tick(v.id);
  select * into e from village_eco where village_id = v.id;
  return (select coalesce(json_agg(json_build_object('gebaeude', x->>'gebaeude', 'name', x->>'name', 'art', x->>'art', 'stufe', (x->>'stufe')::int, 'grund', x->>'grund')), '[]'::json)
    from jsonb_array_elements(eco_candidates(v.id, e.rates, e.res, e.stimmung, e.hunger_h, 12)) x where (x->>'score')::numeric > -40);
end;
$$;

create or replace function public.dorf_vorschlagen(p_gebaeude text) returns json language plpgsql security definer set search_path = public as $$
declare v villages; e village_eco; prof profiles; pl village_projects; c jsonb; x jsonb; ant text; nm text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); select * into prof from profiles where id = auth.uid();
  perform eco_tick(v.id);
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
  elsif pl.id is null or pl.vorgeschlagen is null then
    if pl.id is not null then update village_projects set status = 'verworfen' where id = pl.id; end if;
    insert into village_projects (village_id, art, gebaeude, plot, stufe, kosten, arbeit_soll, grund, vorgeschlagen)
      values (v.id, x->>'art', x->>'gebaeude', (x->>'plot')::int, (x->>'stufe')::int, x->'kosten', (x->>'arbeit')::numeric, 'Ein Vorschlag von ' || prof.character_name || '.', auth.uid());
    perform eco_log(v.id, 'plan', prof.character_name || ' hat im Dorfrat vorgeschlagen, ' || case when x->>'art' = 'neu' then (select dat from eco_buildings where id = p_gebaeude) || ' zu bauen' else (select case when dat like 'eine %' then 'die ' when dat like 'einen %' then 'den ' else 'das ' end || name from eco_buildings where id = p_gebaeude) || ' auszubauen' end || '. Der Rat ist einverstanden.');
    ant := coalesce(nm, 'Der Dorfrat') || ' nickt: „Gute Idee. So machen wir es – als Nächstes, sobald das Material da ist.“';
  else
    ant := coalesce(nm, 'Der Dorfrat') || ' kratzt sich am Kopf: „Wir haben gerade schon einen Vorschlag auf dem Tisch. Danach gern.“';
  end if;
  return json_build_object('ok', true, 'text', ant);
end;
$$;

-- ───────────── Dorfzustand (ersetzt die alte Holz-Abrechnung) ─────────────
create or replace function public.get_village_state() returns json language plpgsql security definer set search_path = public as $$
declare v villages; d record; t deal_templates; n npcs; me text; pr village_projects;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); if not found then return null; end if;
  perform eco_tick(v.id);
  select * into v from villages where id = v.id;
  select character_name into me from profiles where id = auth.uid();
  for d in select * from npc_deals where village_id = v.id and status = 'in_arbeit' and faellig_at <= now() loop
    select * into t from deal_templates where id = d.vorlage; select * into n from npcs where id = d.npc_id;
    insert into village_extras (village_id, plot_id, gebaeude, zusatz, npc_id) values (v.id, coalesce(layout_plot(v.layout, t.gebaeude), d.plot_id), t.gebaeude, t.zusatz, d.npc_id) on conflict do nothing;
    update npc_deals set status = 'fertig', updated_at = now() where id = d.id;
    insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (d.npc_id, auth.uid(), 4, 2)
      on conflict (npc_id, player_id) do update set sympathy = least(100, npc_relations.sympathy + 4), loyalty = least(100, npc_relations.loyalty + 2), updated_at = now();
    insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (d.npc_id, auth.uid(), 'gespraech', 'Ich habe ' || t.titel || ' fertig gebaut. Wir haben zusammen etwas geschaffen.', 4);
    insert into player_notes (player_id, npc_id, kind, text) values (auth.uid(), d.npc_id, 'begegnung', n.name || ' hat Wort gehalten: ' || upper(left(t.titel, 1)) || substr(t.titel, 2) || ' ist fertig.');
    perform spread_deed(d.npc_id, auth.uid(), 'bau_' || t.zusatz, n.name || ' hat für ' || coalesce(me, 'uns') || ' ' || t.titel || ' gebaut.', 0);
    perform eco_log(v.id, 'bau', n.name || ' hat ' || t.titel || ' fertig gebaut.', d.npc_id);
  end loop;
  for d in select * from npc_deals where village_id = v.id and status = 'wartet_holz' and created_at < now() - interval '3 days' loop
    select * into t from deal_templates where id = d.vorlage; select * into n from npcs where id = d.npc_id;
    update npc_deals set status = 'verfallen', updated_at = now() where id = d.id;
    update npc_relations set sympathy = greatest(-100, sympathy - 2), updated_at = now() where npc_id = d.npc_id and player_id = auth.uid();
    insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (d.npc_id, auth.uid(), 'gespraech', 'Ich habe auf das Holz gewartet – vergeblich.', -2);
    insert into player_notes (player_id, npc_id, kind, text) values (auth.uid(), d.npc_id, 'begegnung', 'Ich habe ' || n.name || ' das Holz für ' || t.titel || ' nie gebracht. ' || n.name || ' war enttäuscht.');
  end loop;
  select * into pr from village_projects where village_id = v.id and status = 'im_bau' order by id limit 1;
  return json_build_object(
    'layout', v.layout, 'holz', village_wood(v), 'dorf', eco_view(v.id, auth.uid()),
    'baustelle', case when pr.id is not null then json_build_object('plot', pr.plot, 'gebaeude', pr.gebaeude, 'art', pr.art, 'fortschritt', round(least(1, pr.arbeit_ist / pr.arbeit_soll), 2)) end,
    'extras', (select coalesce(json_agg(json_build_object('plot', e.plot_id, 'gebaeude', e.gebaeude, 'zusatz', e.zusatz, 'status', 'fertig')), '[]'::json) from village_extras e where e.village_id = v.id),
    'auftraege', (select coalesce(json_agg(json_build_object('id', d2.id, 'npc_id', d2.npc_id, 'npc', n2.name, 'titel', t2.titel, 'gebaeude', t2.gebaeude, 'zusatz', t2.zusatz, 'plot', coalesce(layout_plot(v.layout, t2.gebaeude), d2.plot_id), 'holz', t2.holz, 'status', d2.status, 'faellig_at', d2.faellig_at) order by d2.created_at), '[]'::json)
      from npc_deals d2 join deal_templates t2 on t2.id = d2.vorlage join npcs n2 on n2.id = d2.npc_id where d2.village_id = v.id and d2.status in ('wartet_holz', 'in_arbeit'))
  );
end;
$$;

-- Abmachungen: das Holz kommt jetzt aus dem Dorflager
create or replace function public.deliver_deal(p_deal bigint) returns json language plpgsql security definer set search_path = public as $$
declare v villages; d npc_deals; t deal_templates; w numeric; fa timestamptz;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid();
  perform eco_tick(v.id);
  select * into d from npc_deals where id = p_deal and village_id = v.id and status = 'wartet_holz' for update;
  if d.id is null then return json_build_object('ok', false, 'grund', 'keine_abmachung'); end if;
  select * into t from deal_templates where id = d.vorlage;
  w := village_wood(v);
  if w < t.holz then return json_build_object('ok', false, 'grund', 'zu_wenig_holz', 'holz', w, 'braucht', t.holz); end if;
  perform eco_add(v.id, jsonb_build_object('holz', -t.holz));
  fa := now() + make_interval(secs => t.dauer_h * 3600);
  update npc_deals set status = 'in_arbeit', faellig_at = fa, updated_at = now() where id = d.id;
  update npc_relations set sympathy = least(100, sympathy + 2), updated_at = now() where npc_id = d.npc_id and player_id = auth.uid();
  insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (d.npc_id, auth.uid(), 'gespraech', 'Du hast mir das Holz aus dem Lager geholt, wie abgemacht.', 2);
  return json_build_object('ok', true, 'faellig_at', fa, 'holz', village_wood(v));
end;
$$;

-- Für Gespräche: was im Dorf gerade los ist (aus Sicht einer Figur)
create or replace function public.eco_talk(p_v bigint, p_npc bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare e village_eco; pr village_projects; pl village_projects; j eco_jobs; n npcs; knapp text[]; k text; essen numeric;
begin
  select * into e from village_eco where village_id = p_v; if e.rates is null then return null; end if;
  select * into n from npcs where id = p_npc; select * into j from eco_jobs where job = n.job;
  select * into pr from village_projects where village_id = p_v and status = 'im_bau' order by id limit 1;
  select * into pl from village_projects where village_id = p_v and status = 'geplant' order by id limit 1;
  essen := (e.rates->>'essen')::numeric;
  foreach k in array array['nahrung','holz','stein','waren'] loop
    if (e.res->>k)::numeric < greatest(case k when 'nahrung' then essen * 24 else 5 end, (e.rates->'cap'->>k)::numeric * 0.12) then knapp := knapp || eco_res_name(k); end if;
  end loop;
  return json_build_object(
    'bau', (select dat from eco_buildings where id = pr.gebaeude), 'bau_art', pr.art, 'bau_name', (select name from eco_buildings where id = pr.gebaeude),
    'baut_mit', pr.id is not null and coalesce(j.bau, 0) >= 0.5,
    'plan', (select dat from eco_buildings where id = pl.gebaeude), 'plan_name', (select name from eco_buildings where id = pl.gebaeude), 'plan_grund', pl.grund,
    'knapp', knapp, 'hunger', e.hunger_h > 0, 'jahreszeit', e.rates->>'season',
    'stimmung', case when e.stimmung >= 80 then 'ausgelassen' when e.stimmung >= 65 then 'zufrieden' when e.stimmung >= 50 then 'ruhig' when e.stimmung >= 35 then 'gedrückt' else 'verzweifelt' end,
    'ohne_werkstatt', j.gebaeude is not null and layout_plot((select layout from villages where id = p_v), j.gebaeude) is null,
    'werkstatt', (select name from eco_buildings where id = j.gebaeude),
    'neu_gebaut', (select l.text from village_log l where l.village_id = p_v and l.art = 'bau' and l.at > now() - interval '3 days' order by l.at desc limit 1),
    'neu_bewohner', (select x.name from village_log l join npcs x on x.id = l.npc_id where l.village_id = p_v and l.art = 'zuzug' and l.at > now() - interval '5 days' and x.id <> p_npc order by l.at desc limit 1),
    'selbst_neu', exists (select 1 from village_log l where l.village_id = p_v and l.art = 'zuzug' and l.npc_id = p_npc and l.at > now() - interval '5 days')
  );
end;
$$;

create or replace function public.get_npc_brief(p_npc bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare vid bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if not npc_reachable(p_npc) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  select id into vid from villages where owner_id = auth.uid();
  return json_build_object(
    'wissen', coalesce((select wissen from npc_profiles where npc_id = p_npc), '{}'),
    'gefragt', (select coalesce(json_agg(key), '[]'::json) from player_notes where player_id = auth.uid() and npc_id = p_npc and kind = 'fakt'),
    'gehoert', (select coalesce(json_agg(text), '[]'::json) from (select text from npc_knowledge where npc_id = p_npc and about_player = auth.uid() order by created_at desc limit 3) k),
    'auftrag_optionen', deal_options(p_npc),
    'abmachung', (select json_build_object('id', d.id, 'titel', t.titel, 'holz', t.holz, 'status', d.status, 'faellig_at', d.faellig_at) from npc_deals d join deal_templates t on t.id = d.vorlage where d.npc_id = p_npc and d.player_id = auth.uid() and d.status in ('wartet_holz', 'in_arbeit') limit 1),
    'holz', (select village_wood(v) from villages v where v.owner_id = auth.uid()),
    'rivale', (select n.name from npc_bonds b join npcs n on n.id = case when b.npc_a = p_npc then b.npc_b else b.npc_a end where (b.npc_a = p_npc or b.npc_b = p_npc) and b.sympathy < -10 order by b.sympathy limit 1),
    'dorf', case when (select village_id from npcs where id = p_npc) = vid then eco_talk(vid, p_npc) end
  );
end;
$$;

-- ───────────── Neue Dörfer, bestehende Dörfer, Rechte, Takt ─────────────
create or replace function public.eco_on_village() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.layout is null then update villages set layout = '[["langhaus",1],["wohnhaus",3],["feld",13]]'::jsonb where id = new.id; end if;
  insert into village_eco (village_id) values (new.id) on conflict do nothing;
  perform eco_log(new.id, 'gruendung', 'Das Dorf wurde gegründet.');
  return new;
end;
$$;
do $do$ begin
  if not exists (select 1 from pg_trigger where tgname = 'eco_on_village') then
    create trigger eco_on_village after insert on public.villages for each row execute function public.eco_on_village();
  end if;
end $do$;

update public.villages set layout = '[["langhaus",1],["wohnhaus",3],["schmiede",4],["scheune",6],["wachturm",9],["feld",13]]'::jsonb where layout is null;
insert into public.village_eco (village_id, tick_at) select id, now() - interval '1 hour' from public.villages on conflict do nothing;

revoke execute on function public.set_layout(jsonb) from authenticated;
revoke execute on function public.eco_season(timestamptz), public.eco_sfak(text, text), public.eco_lvl(jsonb, int), public.eco_size(text), public.eco_kosten(public.eco_buildings, int),
  public.eco_names(bigint[]), public.eco_log(bigint, text, text, bigint, timestamptz), public.eco_rates(bigint, text), public.eco_candidates(bigint, jsonb, jsonb, numeric, int, int),
  public.eco_res_name(text), public.eco_nom(text), public.eco_finish(bigint, timestamptz), public.eco_zuzug(bigint, timestamptz, bigint), public.eco_tick(bigint), public.eco_tick_all(), public.eco_add(bigint, jsonb),
  public.eco_word(numeric, numeric, numeric), public.eco_view(bigint, uuid), public.eco_talk(bigint, bigint), public.eco_on_village() from public, authenticated;
grant execute on function public.get_village_state(), public.deliver_deal(bigint), public.get_npc_brief(bigint), public.dorf_gesehen(), public.dorf_mithelfen(), public.dorf_vorschlaege(), public.dorf_vorschlagen(text) to authenticated;
revoke execute on function public.dorf_gesehen(), public.dorf_mithelfen(), public.dorf_vorschlaege(), public.dorf_vorschlagen(text) from public;
grant execute on function public.ping() to anon;

select cron.schedule('mossheart-dorf', '7 * * * *', $$select public.eco_tick_all()$$);
