-- Migration 021: Tempo. Das Dorf wächst über Monate statt Wochen: Ausbauten werden von Stufe zu Stufe deutlich teurer,
-- Bauen dauert länger (Arbeitsstunden ×2,5), Grundkosten ×1,5, große Ausbauten brauchen genug Lagerplatz.
insert into public.eco_buildings (id, name, dat, size, kosten, arbeit, rolle)
select v.id, b.name, b.dat, b.size, v.kosten, v.arbeit, b.rolle from (values
 ('huette','{"holz":30}'::jsonb,30),
 ('wohnhaus','{"holz":53,"stein":15}'::jsonb,75),
 ('langhaus','{"holz":150,"stein":45}'::jsonb,225),
 ('gasthaus','{"holz":105,"stein":30}'::jsonb,150),
 ('feld','{"holz":15}'::jsonb,22.5),
 ('scheune','{"holz":75}'::jsonb,90),
 ('muehle','{"holz":90,"stein":38}'::jsonb,180),
 ('baeckerei','{"holz":53,"stein":38}'::jsonb,105),
 ('brauerei','{"holz":75,"stein":23}'::jsonb,135),
 ('imkerei','{"holz":30}'::jsonb,60),
 ('stall','{"holz":90}'::jsonb,120),
 ('jagdhuette','{"holz":45}'::jsonb,75),
 ('holzfaeller','{"holz":23}'::jsonb,45),
 ('saegewerk','{"holz":60,"waren":6}'::jsonb,120),
 ('steinmetz','{"holz":38}'::jsonb,75),
 ('koehlerei','{"holz":38}'::jsonb,60),
 ('schmiede','{"holz":53,"stein":53}'::jsonb,150),
 ('gerberei','{"holz":45}'::jsonb,75),
 ('weberei','{"holz":53}'::jsonb,90),
 ('toepferei','{"holz":38,"stein":15}'::jsonb,75),
 ('markt','{"holz":60}'::jsonb,90),
 ('heilerhaus','{"holz":53,"stein":15}'::jsonb,105),
 ('schrein','{"stein":45}'::jsonb,60),
 ('schreibstube','{"holz":53,"stein":53}'::jsonb,150),
 ('alchemistenturm','{"holz":23,"stein":75}'::jsonb,210),
 ('wachturm','{"holz":60}'::jsonb,90),
 ('kaserne','{"holz":120,"stein":53,"waren":12}'::jsonb,270),
 ('lagerhaus','{"holz":105}'::jsonb,120)
) v(id, kosten, arbeit) join public.eco_buildings b on b.id = v.id
on conflict (id) do update set kosten = excluded.kosten, arbeit = excluded.arbeit;

insert into public.eco_jobs (job, res, rate, gebaeude, saison, bau, holz_verbrauch) values
 ('Holzfäller','holz',0.8,'holzfaeller',null,0.6,0), ('Zimmermann','holz',0.35,'saegewerk',null,1.0,0)
on conflict (job) do update set rate = excluded.rate;

create or replace function public.eco_kosten(b public.eco_buildings, stufe int) returns jsonb language sql immutable as $$
  -- Neubau = Grundkosten; jede Ausbaustufe kostet deutlich mehr als die vorige; ab Stufe 3 Werkzeug, ab Stufe 4 Stein
  select (select jsonb_object_agg(k, ceil(v::numeric * power(1.6, greatest(0, stufe - 1)))) from jsonb_each_text(b.kosten) x(k, v))
    || case when stufe >= 3 then jsonb_build_object('waren', ceil(coalesce((b.kosten->>'holz')::numeric, 0) * 0.06 * power(1.5, stufe - 2)) + ceil(coalesce((b.kosten->>'waren')::numeric, 0) * power(1.6, stufe - 1))) else '{}'::jsonb end
    || case when stufe >= 4 then jsonb_build_object('stein', ceil(coalesce((b.kosten->>'stein')::numeric, 0) * power(1.6, stufe - 1) + coalesce((b.kosten->>'holz')::numeric, 0) * 0.4 * power(1.6, stufe - 3))) else '{}'::jsonb end;
$$;

create or replace function public.eco_rates(p_v bigint, p_season text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v villages; e village_eco; n record; j eco_jobs; pl int; fac numeric; amt numeric;
  ph numeric := 0; ps numeric := 0; pn numeric := 0; pw numeric := 0; bh numeric := 0; bs numeric := 0; bn numeric := 0; bw numeric := 0;
  stim numeric := 0; schutz numeric := 0; bau numeric := 0; cnt int := 0; wohn numeric := 0; gstim numeric := 0; zuz numeric := 0;
  cap jsonb := '{"holz":200,"stein":150,"nahrung":150,"waren":40}'; b eco_buildings; lay record; lv int; k text; val text;
begin
  select * into v from villages where id = p_v; select * into e from village_eco where village_id = p_v;
  for n in select id, job from npcs where village_id = p_v loop
    cnt := cnt + 1; ph := ph + 0.02; pn := pn + 0.08; pw := pw - 0.006;   -- jeder sammelt nebenbei etwas Brennholz und Essbares, Werkzeug nutzt sich ab
    select * into j from eco_jobs where job = n.job;
    if j.job is null then pn := pn + 0.15; ph := ph + 0.05; bau := bau + 0.15; continue; end if;
    pl := layout_plot(v.layout, j.gebaeude);
    fac := case when j.gebaeude is null then 0.8 when pl is null then 0.5 else 1 + 0.15 * (eco_lvl(e.stufen, pl) - 1) end;
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
    'essen', cnt * 0.3, 'heizen', cnt * case p_season when 'winter' then 0.03 when 'sommer' then 0 else 0.015 end,
    'bau', bau, 'bewohner', cnt, 'wohnraum', wohn, 'cap', cap, 'stim_jobs', least(20, stim), 'stim_geb', least(20, gstim * 3), 'schutz', schutz, 'zuzug', zuz, 'season', p_season);
end;
$$;

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
    continue when exists (select 1 from jsonb_each_text(kost) x(k, val) where val::numeric > coalesce((r->'cap'->>k)::numeric, 9999));
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
    continue when exists (select 1 from jsonb_each_text(kost) x(k, val) where val::numeric > coalesce((r->'cap'->>k)::numeric, 9999));
    s := s - (coalesce((kost->>'holz')::numeric, 0) + coalesce((kost->>'stein')::numeric, 0) * 1.5 + coalesce((kost->>'waren')::numeric, 0) * 3) / 15;
    if vs = b.id then s := s + 35; grund := 'Ein Vorschlag aus dem Dorf.'; end if;
    s := s + random() * 6;
    acc := acc || jsonb_build_object('art', 'ausbau', 'gebaeude', b.id, 'name', b.name, 'plot', lay.plot, 'stufe', lv + 1, 'kosten', kost, 'arbeit', ceil(b.arbeit * power(1.5, lv)), 'score', round(s, 1), 'grund', coalesce(grund, 'Ein Vorschlag aus dem Dorf.'));
  end loop;
  return (select coalesce(jsonb_agg(x order by (x->>'score')::numeric desc), '[]'::jsonb) from (select x from jsonb_array_elements(acc) x order by (x->>'score')::numeric desc limit p_limit) y);
end;
$$;

create or replace function public.eco_add(p_v bigint, d jsonb) returns void language plpgsql security definer set search_path = public as $$
declare e village_eco; k text; val text; nres jsonb; cap jsonb;
begin
  perform eco_tick(p_v);
  select * into e from village_eco where village_id = p_v for update; if not found then return; end if;
  nres := e.res; cap := coalesce(e.rates->'cap', '{"holz":200,"stein":150,"nahrung":150,"waren":40}');
  for k, val in select * from jsonb_each_text(d) loop
    if k = 'stimmung' then update village_eco set bonus = greatest(-25, least(25, bonus + val::numeric)) where village_id = p_v;
    elsif k in ('holz','stein','nahrung','waren') then nres := jsonb_set(nres, array[k], to_jsonb(greatest(0, least(coalesce((cap->>k)::numeric, 999), coalesce((nres->>k)::numeric, 0) + val::numeric)))); end if;
  end loop;
  update village_eco set res = nres where village_id = p_v;
end;
$$;
revoke execute on function public.eco_kosten(public.eco_buildings, int), public.eco_rates(bigint, text), public.eco_candidates(bigint, jsonb, jsonb, numeric, int, int), public.eco_add(bigint, jsonb) from public, anon, authenticated;
