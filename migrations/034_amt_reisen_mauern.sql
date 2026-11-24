-- 034: 7 Tage Mindestzeit bis zur Wahl, eine Entscheidung pro Tag für den Dorfmeister, unterwegs = nicht im Dorf,
--      Palisade und Steinmauer, Kapitel 4 (Hof von König Ottokar), neue Folgen-Schlüssel (gunst, bau, welt). Erzeugt von tools/m034.py.


alter table public.profiles add column if not exists bewohner_seit timestamptz not null default now();
update public.profiles set bewohner_seit = timestamptz '2026-11-24 12:00:00+01' where bewohner_seit > timestamptz '2026-11-24 12:00:00+01' and bewohner_seit < timestamptz '2026-11-25 06:00:00+01';
alter table public.dorf_ereignisse alter column frist drop not null;
alter table public.dorf_vorlagen add column if not exists bedingung jsonb not null default '{}';

/* ---------- Palisade und Steinmauer ---------- */
insert into public.eco_plots (id, size) values (90, 'L'), (91, 'L') on conflict (id) do nothing;
insert into public.eco_buildings (id, name, dat, size, kosten, arbeit, max_stufe, wohnraum, stimmung, schutz, lager, benoetigt, laut, zuzug, rolle, mehrfach) values
  ('palisade', 'Palisade', 'eine Palisade', 'L', '{"holz": 150}', 240, 1, 0, 2, 4, '{}', '{}', false, 0, 'schutz', false),
  ('steinmauer', 'Steinmauer', 'eine Steinmauer', 'L', '{"stein": 180, "holz": 40}', 560, 1, 0, 3, 8, '{}', '{palisade}', false, 0, 'schutz', false)
on conflict (id) do update set name = excluded.name, dat = excluded.dat, size = excluded.size, kosten = excluded.kosten, arbeit = excluded.arbeit, schutz = excluded.schutz, benoetigt = excluded.benoetigt, rolle = excluded.rolle, stimmung = excluded.stimmung;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.eco_candidates'::regproc);
  if position('palisade' in d) > 0 then return; end if;
  n := replace(d, '    select p.id into plot from eco_plots p
      where not exists', '    if b.id in (''palisade'', ''steinmauer'') then
      plot := case b.id when ''palisade'' then 90 else 91 end;
      continue when exists (select 1 from jsonb_array_elements(coalesce(v.layout, ''[]''::jsonb)) x where (x->>1)::int = plot)
        or exists (select 1 from village_projects q where q.village_id = p_v and q.status in (''geplant'',''im_bau'') and q.plot = plot);
    else
    select p.id into plot from eco_plots p
      where p.id < 90 and not exists');
  n := replace(n, 'order by eco_size(p.size), case when b.laut then -p.id else p.id end limit 1;', 'order by eco_size(p.size), case when b.laut then -p.id else p.id end limit 1;
    end if;');
  n := replace(n, '''Ein sicheres Gefühl schadet nie.''); end if;', '''Ein sicheres Gefühl schadet nie.''); end if;
    if b.id = ''palisade'' then s := s + case when (r->>''bewohner'')::int >= 8 then 8 else -12 end
      + case when exists (select 1 from dorf_ereignisse de where de.village_id = p_v and de.vorlage in (''woelfe'', ''fluechtlinge'', ''raeuber_nacht'', ''banditen_weg'') and de.created_at > now() - interval ''30 days'') then 18 else 0 end;
      grund := ''Ein Ring aus Pfählen hält Wölfe und Gesindel fern.''; end if;
    if b.id = ''steinmauer'' then s := s + case when cardinality(types) >= 12 then 6 else -25 end; grund := ''Eine Mauer aus Stein – erst damit ist ein Ort wirklich sicher.''; end if;');
  if n = d or position('plot := case b.id' in n) = 0 or position('end if;' || chr(10) || '    select array_agg(n.id) into ids' in replace(n, '    end if;' || chr(10) || '    continue when plot is null;', 'X')) < 0 then raise exception 'eco_candidates: Ersetzung fehlgeschlagen'; end if;
  if position('limit 1;
    end if;' in n) = 0 or position('Ring aus Pfählen' in n) = 0 then raise exception 'eco_candidates: Ersetzung unvollständig'; end if;
  execute n;
end $$;

/* ---------- Unterwegs: wer auf Reisen ist, ist nicht im Dorf ---------- */
create or replace function public.spieler_unterwegs(p_uid uuid) returns json language sql stable security definer set search_path = public as $$
  select json_build_object('run', q.id, 'titel', t.titel, 'art', t.art, 'begleiter', coalesce(to_json(q.begleiter), '[]'::json), 'reist', q.warte_bis is not null and q.warte_bis > now(),
    'rollen', q.rollen)
  from quest_runs q join quest_templates t on t.id = q.quest_id
  where q.player_id = p_uid and q.status = 'laeuft' and (t.art <> 'chronik' or coalesce((t.def->>'reise')::boolean, false))
  order by q_nebenbei(q.quest_id), q.id desc limit 1;
$$;
create or replace function public.pruefe_im_dorf(p_npc bigint default null) returns void language plpgsql stable security definer set search_path = public as $$
declare u json;
begin
  u := spieler_unterwegs(auth.uid());
  if u is null then return; end if;
  if p_npc is not null and exists (select 1 from json_array_elements_text(u->'begleiter') b where b::bigint = p_npc) then return; end if;
  raise exception 'Du bist unterwegs („%“). Im Dorf kannst du gerade nichts tun – das geht erst wieder, wenn du zurück bist.', u->>'titel';
end $$;

/* ---------- Welt: Abkommen aus Entscheidungen und Geschichten ---------- */
create or replace function public.welt_bund(p_v bigint, p_ort text, p_art text, p_grund text) returns void language plpgsql security definer set search_path = public as $$
declare me text; z welt_orte;
begin
  select id into me from welt_orte where village_id = p_v; select * into z from welt_orte where id = p_ort;
  if me is null or z.id is null then return; end if;
  insert into welt_beziehungen (a, b, art, grund) values (me, z.id, p_art, p_grund) on conflict (a, b, art) do update set grund = excluded.grund, staerke = least(100, welt_beziehungen.staerke + 10);
  perform welt_ereignis(me, case when p_art = 'rivalitaet' then 'fehde' else 'abkommen' end,
    (select name from welt_orte where id = me) || case p_art when 'handel' then ' handelt künftig mit ' when 'buendnis' then ' schließt ein Bündnis mit ' when 'rivalitaet' then ' hat sich ' || z.name || ' zum Feind gemacht' else ' steht nun in Verbindung mit ' end
      || case when p_art = 'rivalitaet' then '' else z.name end || coalesce(': ' || p_grund, '') || '.', interval '1 day', z.id);
end $$;

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
  if f ? 'gunst' or f ? 'bau' or f ? 'welt' then
    select id into vid from villages where owner_id = p_run.player_id;
    if vid is not null then
      perform amt_init(vid);
      if f ? 'gunst' then update dorf_amt set koenig_gunst = greatest(0, least(100, koenig_gunst + (f->>'gunst')::int)) where village_id = vid; end if;
      if f ? 'bau' then update village_eco set vorschlag = jsonb_build_object('gebaeude', f->>'bau', 'von', p_run.player_id, 'bis', now() + interval '7 days') where village_id = vid; end if;
      if f ? 'welt' then perform welt_bund(vid, f->'welt'->>'ort', coalesce(f->'welt'->>'art', 'handel'), f->'welt'->>'grund'); end if;
    end if;
  end if;
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
    select x.id, x.name, x.job into n from npcs x where x.village_id = v.id and x.tot_at is null and x.id <> all(used) order by x.namenlos, random() limit 1;
    if n.id is null then select x.id, x.name, x.job into n from npcs x where x.village_id = v.id and x.tot_at is null and x.id <> coalesce(a.vorsteher_npc, 0) order by x.namenlos, random() limit 1; end if;
    if n.id is null then return json_build_object('ok', false, 'grund', 'Im Dorf leben noch zu wenige Leute.'); end if;
    rol := rol || jsonb_build_object(r, jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)); used := used || n.id;
  end loop;
  insert into quest_runs (player_id, quest_id, szene, begleiter, rollen) values (auth.uid(), t.id, t.def->>'start', p_begleiter, rol) returning id into rid;
  return json_build_object('ok', true, 'view', quest_view(rid));
end $$;

create or replace function public.amt_weg(p_uid uuid, p_v bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare fz jsonb := '[]'; n record; cnt int := 0; alle boolean := true; named int := 0; volk numeric; nl int; taten jsonb; krisen jsonb; nt int; nk int; ab timestamptz; w1 boolean; w2 boolean; w3 boolean;
begin
  for n in select x.id, x.name, x.job, coalesce(r.sympathy, 0) sym from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = p_uid
      where x.village_id = p_v and not x.namenlos and x.tot_at is null order by coalesce(r.sympathy, 0) desc loop
    named := named + 1;
    fz := fz || jsonb_build_object('name', n.name, 'beruf', n.job, 'ja', n.sym >= 60, 'wort', npc_stimmung(n.sym));
    if n.sym >= 60 then cnt := cnt + 1; end if;
    if n.sym < 55 then alle := false; end if;
  end loop;
  select count(*), avg(coalesce(r.sympathy, 10)) into nl, volk from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = p_uid where x.village_id = p_v and x.namenlos and x.tot_at is null;
  if nl > 0 then
    if volk >= 50 then cnt := cnt + 1; end if;
    if volk < 60 then alle := false; end if;
  end if;
  select coalesce(jsonb_agg(titel order by at), '[]'), count(*) into taten, nt from dorf_taten where player_id = p_uid and village_id = p_v and art = 'tat';
  select coalesce(jsonb_agg(titel order by at), '[]'), count(*) into krisen, nk from dorf_taten where player_id = p_uid and village_id = p_v and art = 'krise';
  select coalesce(bewohner_seit, now()) + interval '7 days' into ab from profiles where id = p_uid;
  w1 := cnt >= 3 and nt >= 1; w2 := nk >= 1 and cnt >= 2; w3 := alle and named >= 2;
  return json_build_object('fuersprecher', fz, 'zahl', cnt,
    'volk', case when nl > 0 then json_build_object('ja', volk >= 50, 'wort', volk_wort(volk), 'anzahl', nl) else null end,
    'taten', taten, 'krisen', krisen, 'wege', json_build_array(w1, w2, w3), 'ab', ab, 'zeit_ok', now() >= ab, 'kandidat', (w1 or w2 or w3) and now() >= ab);
end $$;

create or replace function public.amt_apply(p_ev bigint, p_wahl int, p_von text, p_uid uuid) returns text language plpgsql security definer set search_path = public as $$
declare e dorf_ereignisse; t dorf_vorlagen; opt jsonb; f jsonb; k text; val text; nid bigint; res jsonb := '{}'; i int; txt text; fo text;
begin
  select * into e from dorf_ereignisse where id = p_ev for update; if e.status <> 'offen' then return e.ergebnis; end if;
  select * into t from dorf_vorlagen where id = e.vorlage;
  opt := t.optionen->greatest(0, least(jsonb_array_length(t.optionen) - 1, p_wahl)); f := coalesce(opt->'folgen', '{}');
  for k in select unnest(array['holz','stein','nahrung','waren']) loop if f->'res' ? k then res := res || jsonb_build_object(k, (f->'res'->>k)::numeric); end if; end loop;
  if f ? 'stim' and (f->>'stim')::numeric <> 0 then res := res || jsonb_build_object('stimmung', (f->>'stim')::numeric * 2); end if;
  if res <> '{}' then perform eco_add(e.village_id, res); end if;
  if f ? 'gunst' then update dorf_amt set koenig_gunst = greatest(0, least(100, koenig_gunst + (f->>'gunst')::int)) where village_id = e.village_id; end if;
  if f ? 'bau' then update village_eco set vorschlag = jsonb_build_object('gebaeude', f->>'bau', 'von', p_uid, 'bis', now() + interval '7 days') where village_id = e.village_id; end if;
  if f ? 'welt' then perform welt_bund(e.village_id, f->'welt'->>'ort', coalesce(f->'welt'->>'art', 'handel'), f->'welt'->>'grund'); end if;
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
  if t.art = 'krise' then
    fo := krise_folgen(e.id, p_wahl, case p_von when 'hilfe' then 0.25 when 'spieler' then 0.6 else 1.0 end);
    if coalesce(fo, '') <> '' then txt := txt || ' ' || fo; end if;
  end if;
  update dorf_ereignisse set status = 'entschieden', wahl = p_wahl, ergebnis = txt, von = p_von, entschieden_at = now() where id = e.id;
  perform eco_log(e.village_id, 'amt', t.titel || ': ' || txt, null, now());
  return txt;
end $$;

create or replace function public.amt_ereignis_neu(p_v bigint) returns bigint language plpgsql security definer set search_path = public as $$
declare types text[]; a dorf_amt; t dorf_vorlagen; rol jsonb := '{}'; r text; n record; used bigint[] := '{}'; eid bigint; ok boolean;
begin
  a := amt_init(p_v); types := dorf_typen(p_v);
  for t in select * from dorf_vorlagen where gewicht > 0 and art in ('rechtsfall', 'krise', 'koenig', 'handel', 'nachbarn', 'dorfleben', 'bau')
    and id not in (select vorlage from dorf_ereignisse where village_id = p_v and created_at > now() - interval '21 days')
    and (bedingung->>'ohne' is null or not ((bedingung->>'ohne') = any(types))) and (bedingung->>'mit' is null or (bedingung->>'mit') = any(types))
    and (art <> 'koenig' or a.meister_typ = 'spieler')
    order by random() * gewicht * (case art when 'koenig' then 0.6 when 'krise' then 1.2 else 1 end) desc loop
    rol := '{}'; used := array[coalesce(a.vorsteher_npc, 0)]; ok := true;
    foreach r in array t.rollen loop
      select x.id, x.name, x.job into n from npcs x where x.village_id = p_v and x.tot_at is null and x.id <> all(used) order by x.namenlos, random() limit 1;
      if n.id is null then ok := false; exit; end if;
      rol := rol || jsonb_build_object(r, jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)); used := used || n.id;
    end loop;
    continue when not ok;
    if a.meister_typ <> 'spieler' and t.art = 'krise' then
      -- Krise ohne Dorfmeister: die Bewohner können helfen, nach 10 Stunden entscheidet der Vorsteher
      insert into dorf_ereignisse (village_id, vorlage, rollen, frist) values (p_v, t.id, rol, now() + interval '10 hours') returning id into eid;
    else
      if a.meister_typ = 'spieler' then insert into dorf_ereignisse (village_id, vorlage, rollen, frist) values (p_v, t.id, rol, null) returning id into eid;
      else insert into dorf_ereignisse (village_id, vorlage, rollen) values (p_v, t.id, rol) returning id into eid; perform amt_apply(eid, t.auto, 'vorsteher', null); end if;
    end if;
    return eid;
  end loop;
  return null;
end $$;

create or replace function public.amt_bittsteller(p_v bigint) returns boolean language plpgsql security definer set search_path = public as $$
declare v villages; n npcs; types text[]; nid bigint;
begin
  if exists (select 1 from dorf_ereignisse where village_id = p_v and vorlage = 'bittsteller' and status = 'offen') then return false; end if;
  if exists (select 1 from dorf_ereignisse where village_id = p_v and (status = 'offen' or (created_at at time zone 'Europe/Berlin')::date = berlin_day())) then return false; end if;
  select * into v from villages where id = p_v;
  select coalesce(array_agg(x->>0), '{}') into types from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) x;
  if (select count(*) from npcs where village_id = p_v and not namenlos and tot_at is null) < npc_namen_cap(p_v) and random() < 0.4 then
    select w.* into n from npcs w left join eco_jobs j on j.job = w.job where w.village_id is null and w.travel_to is null and not w.reserviert and w.tot_at is null and not w.namenlos
      order by (case when j.gebaeude = any(types) and not exists (select 1 from npcs o where o.village_id = p_v and o.job = w.job) then 3 else 1 end) * random() desc limit 1;
  end if;
  if n.id is null then
    -- eine namenlose Familie bittet um Aufnahme; sie wartet vor dem Dorf (noch ohne Dorf)
    nid := npc_neu_namenlos(p_v); update npcs set village_id = null where id = nid; select * into n from npcs where id = nid;
  end if;
  update npcs set reserviert = true where id = n.id;
  insert into dorf_ereignisse (village_id, vorlage, rollen, daten, frist) values (p_v, 'bittsteller', jsonb_build_object('T', jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)),
    jsonb_build_object('beruf', n.job, 'wesen', 'Man sagt, ' || n.name || ' sei ' || npc_wesen(n.traits) || '.'), null);
  return true;
end $$;

create or replace function public.amt_tick(p_v bigint) returns void language plpgsql security definer set search_path = public as $$
declare a dorf_amt; e record; offen int; frei numeric;
begin
  update npcs set zustand = 'gesund', zustand_bis = null where village_id = p_v and zustand <> 'gesund' and zustand_bis < now();
  a := amt_init(p_v);
  if a.meister_typ = 'spieler' then
    -- Dorfmeister: genau eine Sache pro Tag; sie bleibt liegen, bis du entscheidest – niemand entscheidet für dich
    if not exists (select 1 from dorf_ereignisse where village_id = p_v and (status = 'offen' or (created_at at time zone 'Europe/Berlin')::date = berlin_day())) then
      select coalesce((rates->>'wohnraum')::numeric, 0) - coalesce((rates->>'bewohner')::numeric, 0) into frei from village_eco where village_id = p_v;
      if coalesce(frei, 0) >= 1 and random() < 0.3 and amt_bittsteller(p_v) then null; else perform amt_ereignis_neu(p_v); end if;
    end if;
    return;
  end if;
  update dorf_ereignisse set frist = now() + interval '12 hours' where village_id = p_v and status = 'offen' and frist is null;
  for e in select x.id, x.vorlage from dorf_ereignisse x where x.village_id = p_v and x.status = 'offen' and x.frist < now() loop
    perform amt_apply(e.id, (select auto from dorf_vorlagen where id = e.vorlage), 'vorsteher', null);
  end loop;
  if now() >= a.naechstes_ereignis then
    select count(*) into offen from dorf_ereignisse where village_id = p_v and status = 'offen' and vorlage <> 'bittsteller';
    if offen = 0 then perform amt_ereignis_neu(p_v); end if;
    update dorf_amt set naechstes_ereignis = now() + interval '16 hours' + random() * interval '12 hours' where village_id = p_v;
  end if;
end $$;

create or replace function public.krieg_verluste(p_v bigint, p_gegner numeric, p_kaempfer int, p_grund text default 'im Kampf') returns json language plpgsql security definer set search_path = public as $$
declare types text[]; ausr numeric := 1; loy numeric; ges numeric; staerke numeric; verh numeric; x record; tote text[] := '{}'; verl int := 0; owner uuid;
begin
  select owner_id into owner from villages where id = p_v;
  types := dorf_typen(p_v);
  ausr := 1 + 0.15 * (select count(*) from unnest(types) t where t = 'schmiede') + 0.25 * (select count(*) from unnest(types) t where t = 'kaserne') + 0.12 * (select count(*) from unnest(types) t where t = 'wachturm')
    + case when 'steinmauer' = any(types) then 0.7 when 'palisade' = any(types) then 0.3 else 0 end;
  select avg(coalesce(r.loyalty, 30)), avg(case when n.zustand = 'gesund' then 1.0 else 0.5 end) into loy, ges
    from npcs n left join npc_relations r on r.npc_id = n.id and r.player_id = owner where n.village_id = p_v and n.tot_at is null;
  staerke := greatest(0.3, p_kaempfer * ausr * (0.6 + coalesce(loy, 30) / 250.0) * coalesce(ges, 1) / 3.0);
  verh := p_gegner / staerke;
  for x in select n.id, n.namenlos from npcs n where n.village_id = p_v and n.tot_at is null and n.zustand = 'gesund'
      order by (n.job in ('Wache','Hauptmann','Söldnerin','Jäger','Jägerin','Holzfäller')) desc, n.namenlos desc, random() limit greatest(1, p_kaempfer) loop
    if random() < least(0.45, 0.05 * power(verh, 1.5)) * (case when x.namenlos then 1 else 0.35 end) then
      tote := tote || npc_tot(x.id, p_grund);
    elsif random() < least(0.8, 0.25 * verh) then
      perform npc_erkrankt(x.id, 'verletzt', 1.5 + random() * 2); verl := verl + 1;
    end if;
  end loop;
  return json_build_object('tote', to_json(tote), 'verletzte', verl, 'verhaeltnis', round(verh, 2));
end $$;

create or replace function public.get_my_residents() returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'residents', coalesce((
      select json_agg(json_build_object(
        'id', n.id, 'name', n.name, 'job', n.job, 'look', n.look, 'home_plot', n.home_plot, 'namenlos', n.namenlos, 'zustand', n.zustand,
        'unterwegs', exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.status = 'laeuft' and n.id = any(q.begleiter)),
        'stimmung', npc_stimmung(coalesce(r.sympathy, case when n.namenlos then 10 else 0 end)), 'wesen', npc_wesen(n.traits),
        'freund', case when n.namenlos then null else (select case when b.npc_a = n.id then b.npc_b else b.npc_a end from npc_bonds b
                   where (b.npc_a = n.id or b.npc_b = n.id) and b.sympathy >= 30 order by b.sympathy desc limit 1) end,
        'erinnerung', case when n.namenlos then null else (select m.text from npc_memories m where m.npc_id = n.id and m.player_id = auth.uid() order by m.created_at desc limit 1) end
      ) order by n.namenlos, n.id)
      from npcs n join villages v on v.id = n.village_id
      left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid()
      where v.owner_id = auth.uid() and n.tot_at is null), '[]'::json),
    'wanderer', coalesce((
      select json_agg(json_build_object('id', w.id, 'name', w.name, 'job', w.job, 'look', w.look, 'wesen', npc_wesen(w.traits), 'stimmung', npc_stimmung(w.sympathy)))
      from (select n.id, n.name, n.job, n.look, n.traits, r.sympathy from npcs n
            left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid()
            where n.village_id is null and n.travel_to is null and n.tot_at is null and not n.namenlos and not n.reserviert order by random() limit 3) w), '[]'::json)
  );
$$;

create or replace function public.amt_status() returns json language plpgsql security definer set search_path = public as $$
declare v villages; a dorf_amt; prof profiles; kap quest_templates; runid bigint; frei boolean; grund text; w dorf_wahlen; vname text; weg json; meister boolean; lf json;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from villages where owner_id = auth.uid(); if v.id is null then return null; end if;
  perform amt_tick(v.id);
  a := amt_init(v.id); select * into prof from profiles where id = auth.uid(); select name into vname from npcs where id = a.vorsteher_npc;
  meister := a.meister_typ = 'spieler' and a.meister_player = auth.uid();
  weg := amt_weg(auth.uid(), v.id);
  select * into kap from quest_templates where art = 'chronik' and schwierigkeit = a.kapitel;
  select q.id into runid from quest_runs q join quest_templates t on t.id = q.quest_id where q.player_id = auth.uid() and q.status = 'laeuft' and t.art = 'chronik' order by q.id desc limit 1;
  frei := kap.id is not null; grund := null;
  if kap.id is not null and a.kapitel = 3 and runid is null then
    if a.meister_typ = 'spieler' then frei := false; grund := 'Du bist bereits Dorfmeister.';
    elsif not (weg->>'zeit_ok')::boolean then frei := false; grund := 'Du lebst noch nicht lange genug hier. Frühestens ab ' || to_char((weg->>'ab')::timestamptz at time zone 'Europe/Berlin', 'DD.MM.') || ' kann man dich vorschlagen.';
    elsif not (weg->>'kandidat')::boolean then frei := false; grund := 'Noch hat dich niemand als Anführer vorgeschlagen. Dafür musst du dem Dorf erst zeigen, wer du bist.';
    elsif a.lagerfeuer_at is null then frei := false; grund := 'Am Lagerfeuer wollen dich die Leute vorschlagen. Nimmst du an?';
    elsif a.wahl_ab is not null and a.wahl_ab > now() then frei := false; grund := 'Die nächste Versammlung ist frühestens am ' || to_char(a.wahl_ab at time zone 'Europe/Berlin', 'DD.MM. "um" HH24:MI') || ' Uhr.';
    end if;
  end if;
  if kap.id is not null and a.kapitel >= 4 and runid is null and not meister then frei := false; grund := 'Nur wer Dorfmeister ist, wird an den Hof des Königs gerufen.'; end if;
  if kap.id is not null and runid is null and exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.status = 'laeuft' and not q_nebenbei(q.quest_id)) then frei := false; grund := coalesce(grund, 'Erst das laufende Abenteuer beenden.'); end if;
  if not meister and a.kapitel = 3 and (weg->>'kandidat')::boolean and a.lagerfeuer_at is null then
    select json_build_object('neu', a.lagerfeuer_nein is null,
      'redner', (select json_build_object('name', x.name, 'beruf', x.job, 'look', x.look) from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = auth.uid()
                 where x.village_id = v.id and not x.namenlos and x.tot_at is null and x.id <> coalesce(a.vorsteher_npc, 0) order by coalesce(r.sympathy, 0) desc limit 1),
      'zweiter', (select x.name from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = auth.uid()
                 where x.village_id = v.id and not x.namenlos and x.tot_at is null and x.id <> coalesce(a.vorsteher_npc, 0) order by coalesce(r.sympathy, 0) desc offset 1 limit 1),
      'vorsteher', vname, 'volk', weg->'volk', 'wege', weg->'wege', 'taten', weg->'taten', 'krisen', weg->'krisen') into lf;
  end if;
  select * into w from dorf_wahlen where village_id = v.id and player_id = auth.uid() order by id desc limit 1;
  return json_build_object(
    'ansehen', json_build_object('wort', ansehen_wort(prof.ansehen), 'stufe', least(4, case when prof.ansehen >= 160 then 4 when prof.ansehen >= 120 then 3 when prof.ansehen >= 70 then 2 when prof.ansehen >= 30 then 1 else 0 end),
      'anteil', least(1.0, prof.ansehen / 160.0), 'kandidat', (weg->>'kandidat')::boolean,
      'zuletzt', (select coalesce(json_agg(json_build_object('delta', l.delta, 'grund', l.grund) order by l.at desc), '[]'::json) from (select * from ansehen_log where player_id = auth.uid() order by at desc limit 5) l)),
    'weg', weg, 'lagerfeuer', lf, 'unterwegs', spieler_unterwegs(auth.uid()),
    'naechster', case when meister and not exists (select 1 from dorf_ereignisse where village_id = v.id and status = 'offen') then berlin_midnight() end,
    'kapitel', a.kapitel,
    'chronik', case when kap.id is null then null else json_build_object('id', kap.id, 'kapitel', a.kapitel, 'titel', kap.titel, 'kurz', amt_text(kap.kurz, jsonb_build_object('V', jsonb_build_object('name', coalesce(vname, 'Der Vorsteher'))), '{}'), 'run', runid, 'frei', frei, 'grund', grund,
      'erledigt', exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.quest_id = kap.id and q.status = 'fertig')) end,
    'amt', json_build_object('typ', a.meister_typ, 'ich', meister, 'vorsteher', vname, 'vorsteher_id', a.vorsteher_npc, 'fokus', a.fokus, 'seit', a.seit,
      'leistung', case when a.meister_typ = 'spieler' then 100 else 50 end, 'gunst', gunst_wort(a.koenig_gunst), 'koenig', 'König Ottokar'),
    'wahl', case when w.id is null then null else json_build_object('id', w.id, 'status', w.status, 'ja', w.ja, 'nein', w.nein, 'gegner', w.gegner_name, 'gesehen', w.gesehen, 'stimmen', w.stimmen) end,
    'offen', (select coalesce(json_agg(json_build_object('id', e.id, 'art', t.art, 'titel', t.titel, 'text', amt_text(t.text, e.rollen, e.daten), 'frist', e.frist,
        'optionen', (select json_agg(amt_text(o->>'text', e.rollen, e.daten)) from jsonb_array_elements(t.optionen) o)) order by e.created_at), '[]'::json)
      from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage where e.village_id = v.id and e.status = 'offen' and meister),
    'krisen', (select coalesce(json_agg(json_build_object('id', e.id, 'titel', t.titel, 'text', amt_text(t.text, e.rollen, e.daten), 'frist', e.frist, 'hilfe', krise_hilfe_info(t.id),
        'geholfen', e.geholfen ? auth.uid()::text) order by e.created_at), '[]'::json)
      from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage where e.village_id = v.id and e.status = 'offen' and t.art = 'krise' and not meister),
    'aushaenge', (select coalesce(json_agg(x order by x->>'am' desc), '[]'::json) from (select json_build_object('id', e.id, 'art', t.art, 'titel', t.titel, 'text', amt_text(t.text, e.rollen, e.daten), 'ergebnis', e.ergebnis, 'von', e.von,
        'wahl', amt_text(t.optionen->(e.wahl)->>'text', e.rollen, e.daten), 'am', e.entschieden_at) x
      from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage where e.village_id = v.id and e.status = 'entschieden' order by e.entschieden_at desc limit 4) s),
    'trauer', (select coalesce(json_agg(json_build_object('text', l.text, 'am', l.at) order by l.at desc), '[]'::json)
      from (select * from village_log where village_id = v.id and art = 'tod' and at > now() - interval '7 days' order by at desc limit 5) l)
  );
end $$;

create or replace function public.welt_tick() returns void language plpgsql security definer set search_path = public as $$
declare o record; dt numeric; tr int; neg int; target numeric; cap int; base numeric; wl numeric; hs int; mz int; tz int; art_neu text; drohung boolean;
  r record; sa numeric; sb numeric; los text; sieg text; ln text; sn text; spez text; liefer text; zo record;
begin
  -- Spielerdörfer: Größe und Ereignisse aus dem echten Spiel
  for o in select w.id, w.name, w.village_id, v.layout, v.name vname from welt_orte w join villages v on v.id = w.village_id loop
    update welt_orte set name = coalesce(nullif(o.vname, ''), name),
      haeuser = (select count(*) from jsonb_array_elements(coalesce(o.layout, '[]'::jsonb)) e where e->>0 not in ('feld', 'palisade', 'steinmauer')),
      mauer = (select case when bool_or(e->>0 = 'steinmauer') then 2 when bool_or(e->>0 = 'palisade') then 1 else 0 end from jsonb_array_elements(coalesce(o.layout, '[]'::jsonb)) e),
      tuerme = (select count(*) from jsonb_array_elements(coalesce(o.layout, '[]'::jsonb)) e where e->>0 in ('wachturm', 'kaserne')),
      einwohner = (select count(*) from npcs where village_id = o.village_id and tot_at is null), tick_at = now()
    where id = o.id;
    insert into welt_ereignisse (ort, art, text, von, bis, ref)
    select o.id, case e.vorlage when 'scheunenbrand' then 'brand' when 'fieber' then 'seuche' when 'woelfe' then 'ueberfall' when 'sturm' then 'sturm' when 'duerre' then 'duerre' else 'krise' end,
      t.titel || ' in ' || o.name || '.', e.entschieden_at, e.entschieden_at + interval '30 hours', 'de' || e.id
    from dorf_ereignisse e join dorf_vorlagen t on t.id = e.vorlage
    where e.village_id = o.village_id and t.art = 'krise' and e.status = 'entschieden' and e.entschieden_at > now() - interval '30 hours' on conflict (ref) do nothing;
    insert into welt_ereignisse (ort, art, text, von, bis, ref)
    select o.id, 'bau', o.name || ': ' || coalesce((select b.name from eco_buildings b where b.id = p.gebaeude), 'ein Gebäude') || case when p.art = 'neu' then ' fertig gebaut.' else ' ausgebaut.' end,
      p.done_at, p.done_at + interval '20 hours', 'vp' || p.id
    from village_projects p where p.village_id = o.village_id and p.status = 'fertig' and p.done_at > now() - interval '20 hours' on conflict (ref) do nothing;
    insert into welt_ereignisse (ort, art, text, von, bis, ref)
    select o.id, 'trauer', l.text, l.at, l.at + interval '1 day', 'vl' || l.id from village_log l where l.village_id = o.village_id and l.art = 'tod' and l.at > now() - interval '1 day' on conflict (ref) do nothing;
  end loop;

  -- NPC-Orte
  for o in select * from welt_orte where village_id is null loop
    dt := least(16, extract(epoch from (now() - o.tick_at)) / 10800.0);
    continue when dt < 0.8;
    select count(*) into tr from welt_beziehungen where art = 'handel' and (a = o.id or b = o.id);
    select count(*) into neg from welt_ereignisse where (ort = o.id or (ziel = o.id and art = 'fehde')) and bis > now() and art in ('brand', 'seuche', 'ueberfall', 'fehde');
    target := 44 + 6 * least(tr, 5) + case o.art when 'grossstadt' then 8 when 'stadt' then 4 else 0 end + case when 'gilde' = any(o.spezial) then 10 else 0 end - 12 * neg;
    wl := greatest(5, least(98, o.wohlstand + (target - o.wohlstand) * least(0.6, 0.06 * dt) + (random() - 0.5) * 3));
    hs := o.haeuser; mz := o.mauer; tz := o.tuerme; art_neu := o.art;
    cap := case o.art when 'dorf' then 22 when 'stadt' then 48 when 'grossstadt' then 95 when 'burg' then 30 else 12 end;
    base := case o.art when 'dorf' then 0.010 when 'stadt' then 0.02 when 'grossstadt' then 0.03 when 'burg' then 0.006 else 0.004 end;
    -- langsames Wachstum
    if neg = 0 and random() < base * dt * (0.4 + wl / 100) * (case when hs < cap then 1 else 0.08 end) then
      hs := hs + 1;
      perform welt_ereignis(o.id, 'bau', 'In ' || o.name || ' wird ein neues Haus gebaut.', interval '18 hours');
    end if;
    if o.art = 'dorf' and hs >= 22 and wl > 72 and random() < 0.003 * dt then
      art_neu := 'stadt'; perform welt_ereignis(o.id, 'aufstieg', o.name || ' ist zur Stadt herangewachsen. Man spricht von einem Marktrecht.', interval '3 days');
    end if;
    drohung := hs > 18 or exists (select 1 from welt_ereignisse where (ort = o.id or ziel = o.id) and art in ('fehde', 'ueberfall') and von > now() - interval '30 days')
      or exists (select 1 from welt_beziehungen where art = 'rivalitaet' and (a = o.id or b = o.id));
    if mz < (case o.art when 'dorf' then 1 when 'kloster' then 1 else 3 end) and wl > 58 and drohung and random() < 0.004 * dt then
      mz := mz + 1;
      perform welt_ereignis(o.id, 'mauer', o.name || ' errichtet ' || case mz when 1 then 'eine Palisade.' when 2 then 'eine Steinmauer.' else 'mächtige Wehrmauern.' end, interval '2 days');
    end if;
    if tz < greatest(1, hs / 9) and wl > 50 and random() < 0.004 * dt then
      tz := tz + 1; perform welt_ereignis(o.id, 'turm', 'In ' || o.name || ' steht ein neuer Wachturm.', interval '1 day');
    end if;
    -- Ereignisse
    if random() < 0.0013 * dt then
      if hs > 4 and random() < 0.6 then hs := hs - 1; end if; wl := wl - 6;
      perform welt_ereignis(o.id, 'brand', 'Feuer in ' || o.name || '! ' || (array['Eine Scheune brennt nieder.', 'Ein Haus am Markt steht in Flammen.', 'Der Wind trägt die Funken über die Dächer.'])[1 + floor(random() * 3)::int], make_interval(hours => 18 + floor(random() * 22)::int));
    elsif random() < 0.0006 * dt * (case when 'moor' = any(o.spezial) or o.art = 'grossstadt' then 1.6 else 1 end) then
      wl := wl - 10; perform welt_ereignis(o.id, 'seuche', 'In ' || o.name || ' geht ein Fieber um. Die Tore bleiben zu.', make_interval(days => 3 + floor(random() * 4)::int));
    elsif random() < 0.004 * dt then
      wl := wl + 2; perform welt_ereignis(o.id, 'fest', o.name || ' feiert ' || (array['ein Erntefest.', 'eine Hochzeit.', 'den Tag des Schutzheiligen.', 'einen Markttag mit Gauklern.'])[1 + floor(random() * 4)::int], interval '20 hours');
    elsif mz = 0 and not ('gilde' = any(o.spezial)) and random() < 0.001 * dt then
      wl := wl - 8; if random() < 0.3 and hs > 4 then hs := hs - 1; end if;
      perform welt_ereignis(o.id, 'ueberfall', 'Räuber haben ' || o.name || ' überfallen. Ohne Mauer hatten die Leute kaum eine Chance.', interval '14 hours');
    end if;
    update welt_orte set wohlstand = round(greatest(5, least(98, wl)), 1), haeuser = hs, mauer = mz, tuerme = tz, art = art_neu, tick_at = now(),
      einwohner = round(hs * case art_neu when 'dorf' then 6 when 'stadt' then 14 when 'grossstadt' then 32 when 'burg' then 10 else 6 end * (0.85 + wl / 330))
    where id = o.id;
  end loop;

  -- Handelszüge auf den Straßen
  for r in select * from welt_beziehungen where art = 'handel' and random() < 0.06 loop
    if not exists (select 1 from welt_ereignisse where art = 'handelszug' and ort = r.a and ziel = r.b and bis > now()) then
      perform welt_ereignis(r.a, 'handelszug', 'Ein Handelszug ist unterwegs: ' || coalesce(r.grund, 'Waren') || '.', interval '8 hours', r.b);
    end if;
  end loop;
  -- Fehden: schwächen, aber erobern nie; Orte mit gefürchteter Gilde bleiben unbehelligt
  if not exists (select 1 from welt_ereignisse where art = 'fehde' and bis > now()) and random() < 0.06 then
    select b.* into r from welt_beziehungen b join welt_orte x on x.id = b.a join welt_orte y on y.id = b.b
      where b.art = 'rivalitaet' and not ('gilde' = any(x.spezial)) and not ('gilde' = any(y.spezial)) and x.village_id is null and y.village_id is null order by random() limit 1;
    if r.id is not null then
      select name into ln from welt_orte where id = r.a; select name into sn from welt_orte where id = r.b;
      perform welt_ereignis(r.a, 'fehde', 'Fehde zwischen ' || ln || ' und ' || sn || ': ' || coalesce(r.grund, 'alter Groll') || '.', make_interval(days => 2 + floor(random() * 4)::int), r.b);
    end if;
  end if;
  for r in select e.*, x.name xn, y.name yn, x.haeuser * (1 + 0.3 * x.mauer) + 2 * x.tuerme + x.wohlstand / 10 xs, y.haeuser * (1 + 0.3 * y.mauer) + 2 * y.tuerme + y.wohlstand / 10 ys, y.mauer ym, x.mauer xm
      from welt_ereignisse e join welt_orte x on x.id = e.ort join welt_orte y on y.id = e.ziel where e.art = 'fehde' and e.bis < now() and not e.erledigt loop
    sa := r.xs * (0.7 + random() * 0.6); sb := r.ys * (0.7 + random() * 0.6);
    if sa >= sb then sieg := r.ort; los := r.ziel; ln := r.yn; sn := r.xn; else sieg := r.ziel; los := r.ort; ln := r.xn; sn := r.yn; end if;
    update welt_orte set wohlstand = greatest(5, wohlstand - 6), haeuser = case when mauer = 0 and random() < 0.4 and haeuser > 4 then haeuser - 1 else haeuser end where id = los;
    update welt_orte set wohlstand = least(98, wohlstand + 3) where id = sieg;
    update welt_ereignisse set erledigt = true where id = r.id;
    perform welt_ereignis(sieg, 'frieden', 'Die Fehde ist beigelegt. ' || ln || ' musste ' || sn || ' Vieh und Silber zahlen – erobert wurde niemand.', interval '1 day', los);
  end loop;
  -- neue Handelsabkommen: wer etwas hat, das einer Stadt fehlt
  if random() < 0.02 then
    select o2.*, s into r from welt_orte o2, unnest(o2.spezial) s
      where o2.village_id is null and s in ('kuehe', 'korn', 'salz', 'silber', 'wein', 'holz', 'fischerei', 'kohle', 'wolle', 'kraeuter', 'pilze', 'steinbruch', 'torf', 'pelz', 'harz', 'bier') order by random() limit 1;
    if r.id is not null then
      select x.* into zo from welt_orte x where x.art in ('stadt', 'grossstadt') and x.id <> r.id and sqrt(power(x.x - r.x, 2) + power(x.y - r.y, 2)) < 1500
        and not exists (select 1 from welt_beziehungen b where (b.a = r.id and b.b = x.id) or (b.a = x.id and b.b = r.id)) order by random() limit 1;
      if zo.id is not null then
        liefer := case r.s when 'kuehe' then 'Milch und Käse' when 'korn' then 'Korn' when 'salz' then 'Salz' when 'silber' then 'Silber' when 'wein' then 'Wein' when 'holz' then 'Holz' when 'fischerei' then 'Fisch'
          when 'kohle' then 'Holzkohle' when 'wolle' then 'Wolle' when 'kraeuter' then 'Kräuter' when 'pilze' then 'Heilpilze' when 'steinbruch' then 'Bausteine' when 'torf' then 'Torf' when 'pelz' then 'Pelze' when 'harz' then 'Harz' else 'Bier' end;
        insert into welt_beziehungen (a, b, art, grund) values (r.id, zo.id, 'handel', liefer) on conflict do nothing;
        perform welt_ereignis(r.id, 'abkommen', r.name || ' liefert künftig ' || liefer || ' nach ' || zo.name || '.', interval '1 day', zo.id);
      end if;
    end if;
  end if;
end $$;

create or replace function public.welt_spieler(p_uid uuid, p_ort text, p_ich boolean) returns json language plpgsql stable security definer set search_path = public as $$
declare q record; t numeric; dist numeric; seed numeric;
begin
  select r.id, r.szene, r.warte_bis, r.updated_at, tp.titel, tp.art, coalesce(tp.schwierigkeit, 1) sw, tp.def->'szenen'->r.szene->>'ort' ort, tp.def->>'ziel' ziel into q
    from quest_runs r join quest_templates tp on tp.id = r.quest_id where r.player_id = p_uid and r.status = 'laeuft' order by q_nebenbei(r.quest_id), r.id desc limit 1;
  if q.id is null then
    return json_build_object('name', (select character_name from profiles where id = p_uid), 'ich', p_ich, 'ort', p_ort, 'unterwegs', null);
  end if;
  t := case when q.warte_bis is not null and q.warte_bis > now() then 0.1 + 0.85 * least(1, greatest(0, extract(epoch from (now() - q.updated_at)) / greatest(60, extract(epoch from (q.warte_bis - q.updated_at))))) else 1 end;
  seed := ((q.id * 2654435761) % 10007) / 10007.0;
  dist := case q.art when 'erkundung' then 70 + seed * 80 when 'chronik' then 0 + seed * 40 when 'haupt' then 220 + seed * 160 when 'ki' then 200 + seed * 220
    else case q.sw when 1 then 150 + seed * 120 when 2 then 260 + seed * 170 else 420 + seed * 300 end end;
  return json_build_object('name', (select character_name from profiles where id = p_uid), 'ich', p_ich, 'ort', p_ort,
    'unterwegs', json_build_object('titel', q.titel, 'art', q.art, 'ziel_art', coalesce(q.ort, 'wald'), 'ziel_ort', q.ziel, 't', round(t, 3), 'seed', round(seed, 4), 'dist', round(dist), 'reist', q.warte_bis is not null and q.warte_bis > now(), 'bis', q.warte_bis));
end $$;


do $$
declare f record; d text; n text; mit_npc text[] := array['talk_to_npc', 'talk_check', 'ask_personal', 'create_deal'];
  liste text[] := array['dorf_mithelfen', 'dorf_vorschlagen', 'tagwerk_fertig', 'amt_entscheiden', 'amt_fokus', 'amt_verbannen', 'amt_ruecktritt', 'krise_helfen', 'amt_lagerfeuer', 'deliver_deal', 'erkunden_start', 'talk_to_npc', 'talk_check', 'ask_personal', 'create_deal'];
begin
  for f in select p.oid, p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace join pg_language l on l.oid = p.prolang
           where s.nspname = 'public' and p.proname = any(liste) and l.lanname = 'plpgsql' loop
    d := pg_get_functiondef(f.oid);
    continue when position('pruefe_im_dorf' in d) > 0;
    n := regexp_replace(d, '(AS \$function\$.*?\mbegin\M)', '\1 perform pruefe_im_dorf(' || case when f.proname = any(mit_npc) then 'p_npc' else '' end || ');');
    if n = d then raise exception 'Sperre nicht eingefügt: %', f.proname; end if;
    execute n;
  end loop;
end $$;

revoke execute on function public.spieler_unterwegs(uuid), public.welt_bund(bigint, text, text, text) from public, anon, authenticated;
revoke execute on function public.pruefe_im_dorf(bigint) from public, anon;
