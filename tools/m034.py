# Erzeugt migrations/034_amt_reisen_mauern.sql aus den bestehenden Funktionen (029/031/032) plus Änderungen.
import re, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def fn(fname, name):
    s = open(os.path.join(R, 'migrations', fname)).read()
    m = re.search(r'create or replace function public\.' + re.escape(name) + r'\(.*?\$\$;[ \t]*\n', s, re.S)
    if not m: raise SystemExit('nicht gefunden: ' + name)
    return m.group(0)
def sub(t, a, b, n=1):
    if t.count(a) < 1: raise SystemExit('Stelle fehlt: ' + a[:80])
    return t.replace(a, b, n)
out = ["-- 034: 7 Tage Mindestzeit bis zur Wahl, eine Entscheidung pro Tag für den Dorfmeister, unterwegs = nicht im Dorf,",
       "--      Palisade und Steinmauer, Kapitel 4 (Hof von König Ottokar), neue Folgen-Schlüssel (gunst, bau, welt). Erzeugt von tools/m034.py.", ""]
out.append("""
alter table public.profiles add column if not exists bewohner_seit timestamptz not null default now();
update public.profiles set bewohner_seit = timestamptz '2026-11-24 12:00:00+01' where bewohner_seit > timestamptz '2026-11-24 12:00:00+01' and bewohner_seit < timestamptz '2026-11-25 06:00:00+01';
alter table public.dorf_ereignisse alter column frist drop not null;
alter table public.dorf_vorlagen add column if not exists bedingung jsonb not null default '{}';

/* ---------- Palisade und Steinmauer ---------- */
insert into public.eco_plots (id, size) values (90, 'U'), (91, 'U') on conflict (id) do nothing;
insert into public.eco_buildings (id, name, dat, size, kosten, arbeit, max_stufe, wohnraum, stimmung, schutz, lager, benoetigt, laut, zuzug, rolle, mehrfach) values
  ('palisade', 'Palisade', 'eine Palisade', 'U', '{"holz": 150}', 240, 1, 0, 2, 4, '{}', '{}', false, 0, 'schutz', false),
  ('steinmauer', 'Steinmauer', 'eine Steinmauer', 'U', '{"stein": 180, "holz": 40}', 560, 1, 0, 3, 8, '{}', '{palisade}', false, 0, 'schutz', false)
on conflict (id) do update set name = excluded.name, dat = excluded.dat, size = excluded.size, kosten = excluded.kosten, arbeit = excluded.arbeit, schutz = excluded.schutz, benoetigt = excluded.benoetigt, rolle = excluded.rolle, stimmung = excluded.stimmung;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.eco_candidates'::regproc);
  if position('palisade' in d) > 0 then return; end if;
  n := replace(d, '    select p.id into plot from eco_plots p
      where not exists', '    if b.size = ''U'' then
      plot := case b.id when ''palisade'' then 90 else 91 end;
      continue when exists (select 1 from jsonb_array_elements(coalesce(v.layout, ''[]''::jsonb)) x where (x->>1)::int = plot)
        or exists (select 1 from village_projects q where q.village_id = p_v and q.status in (''geplant'',''im_bau'') and q.plot = plot);
    else
    select p.id into plot from eco_plots p
      where p.size <> ''U'' and not exists');
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
""")

# --- q_apply_roles: neue Schlüssel gunst, bau, welt ---
t = fn('029_amt.sql', 'q_apply_roles')
t = sub(t, "  if f ? 'wahl' then perform amt_wahl(p_run); end if;", """  if f ? 'wahl' then perform amt_wahl(p_run); end if;
  if f ? 'gunst' or f ? 'bau' or f ? 'welt' then
    select id into vid from villages where owner_id = p_run.player_id;
    if vid is not null then
      perform amt_init(vid);
      if f ? 'gunst' then update dorf_amt set koenig_gunst = greatest(0, least(100, koenig_gunst + (f->>'gunst')::int)) where village_id = vid; end if;
      if f ? 'bau' then update village_eco set vorschlag = jsonb_build_object('gebaeude', f->>'bau', 'von', p_run.player_id, 'bis', now() + interval '7 days') where village_id = vid; end if;
      if f ? 'welt' then perform welt_bund(vid, f->'welt'->>'ort', coalesce(f->'welt'->>'art', 'handel'), f->'welt'->>'grund'); end if;
    end if;
  end if;""")
out.append(t)

# --- chronik_start: Namensfiguren bevorzugt, keine Toten ---
t = fn('029_amt.sql', 'chronik_start')
t = sub(t, "select x.id, x.name, x.job into n from npcs x where x.village_id = v.id and x.id <> all(used) order by random() limit 1;",
           "select x.id, x.name, x.job into n from npcs x where x.village_id = v.id and x.tot_at is null and x.id <> all(used) order by x.namenlos, random() limit 1;")
t = sub(t, "where x.village_id = v.id and x.id <> coalesce(a.vorsteher_npc, 0) order by random() limit 1;", "where x.village_id = v.id and x.tot_at is null and x.id <> coalesce(a.vorsteher_npc, 0) order by x.namenlos, random() limit 1;")
out.append(t)

# --- amt_weg: 7 Tage Mindestzeit ---
t = fn('031_bewohner_wahl.sql', 'amt_weg')
t = sub(t, "nk int; w1 boolean;", "nk int; ab timestamptz; w1 boolean;")
t = sub(t, "  w1 := cnt >= 3 and nt >= 1;", "  select coalesce(bewohner_seit, now()) + interval '7 days' into ab from profiles where id = p_uid;\n  w1 := cnt >= 3 and nt >= 1;")
t = sub(t, "'wege', json_build_array(w1, w2, w3), 'kandidat', w1 or w2 or w3);", "'wege', json_build_array(w1, w2, w3), 'ab', ab, 'zeit_ok', now() >= ab, 'kandidat', (w1 or w2 or w3) and now() >= ab);")
out.append(t)

# --- amt_apply: bau und welt ---
t = fn('031_bewohner_wahl.sql', 'amt_apply')
t = sub(t, "  if p_uid is not null and f ? 'ansehen' then", """  if f ? 'bau' then update village_eco set vorschlag = jsonb_build_object('gebaeude', f->>'bau', 'von', p_uid, 'bis', now() + interval '7 days') where village_id = e.village_id; end if;
  if f ? 'welt' then perform welt_bund(e.village_id, f->'welt'->>'ort', coalesce(f->'welt'->>'art', 'handel'), f->'welt'->>'grund'); end if;
  if p_uid is not null and f ? 'ansehen' then""")
out.append(t)

# --- amt_ereignis_neu: mehr Arten, 21 Tage ohne Wiederholung, beim Dorfmeister ohne Frist ---
t = fn('031_bewohner_wahl.sql', 'amt_ereignis_neu')
t = sub(t, "declare a dorf_amt;", "declare types text[]; a dorf_amt;")
t = sub(t, "  a := amt_init(p_v);", "  a := amt_init(p_v); types := dorf_typen(p_v);")
t = sub(t, "where gewicht > 0 and art in ('rechtsfall', 'krise', 'koenig')\n    and id not in (select vorlage from dorf_ereignisse where village_id = p_v and created_at > now() - interval '6 days')",
           "where gewicht > 0 and art in ('rechtsfall', 'krise', 'koenig', 'handel', 'nachbarn', 'dorfleben', 'bau')\n    and id not in (select vorlage from dorf_ereignisse where village_id = p_v and created_at > now() - interval '21 days')\n    and (bedingung->>'ohne' is null or not ((bedingung->>'ohne') = any(types))) and (bedingung->>'mit' is null or (bedingung->>'mit') = any(types))\n    and (art <> 'koenig' or a.meister_typ = 'spieler')")
t = sub(t, "      insert into dorf_ereignisse (village_id, vorlage, rollen) values (p_v, t.id, rol) returning id into eid;\n      if a.meister_typ <> 'spieler' then perform amt_apply(eid, t.auto, 'vorsteher', null); end if;",
           "      if a.meister_typ = 'spieler' then insert into dorf_ereignisse (village_id, vorlage, rollen, frist) values (p_v, t.id, rol, null) returning id into eid;\n      else insert into dorf_ereignisse (village_id, vorlage, rollen) values (p_v, t.id, rol) returning id into eid; perform amt_apply(eid, t.auto, 'vorsteher', null); end if;")
out.append(t)

# --- amt_bittsteller: zählt beim Dorfmeister als die Entscheidung des Tages ---
t = fn('031_bewohner_wahl.sql', 'amt_bittsteller')
t = sub(t, "  if exists (select 1 from dorf_ereignisse where village_id = p_v and vorlage = 'bittsteller' and status = 'offen') then return false; end if;",
           "  if exists (select 1 from dorf_ereignisse where village_id = p_v and vorlage = 'bittsteller' and status = 'offen') then return false; end if;\n  if exists (select 1 from dorf_ereignisse where village_id = p_v and (status = 'offen' or (created_at at time zone 'Europe/Berlin')::date = berlin_day())) then return false; end if;")
t = sub(t, "jsonb_build_object('beruf', n.job, 'wesen', 'Man sagt, ' || n.name || ' sei ' || npc_wesen(n.traits) || '.'), now() + interval '48 hours');",
           "jsonb_build_object('beruf', n.job, 'wesen', 'Man sagt, ' || n.name || ' sei ' || npc_wesen(n.traits) || '.'), null);")
out.append(t)

# --- amt_tick: genau eine Entscheidung pro Tag für den Dorfmeister, offen bis entschieden ---
t = fn('031_bewohner_wahl.sql', 'amt_tick')
t = sub(t, "declare a dorf_amt; e record; offen int;", "declare a dorf_amt; e record; offen int; frei numeric;")
t = sub(t, "  a := amt_init(p_v);\n  for e in", """  a := amt_init(p_v);
  if a.meister_typ = 'spieler' then
    -- Dorfmeister: genau eine Sache pro Tag; sie bleibt liegen, bis du entscheidest – niemand entscheidet für dich
    if not exists (select 1 from dorf_ereignisse where village_id = p_v and (status = 'offen' or (created_at at time zone 'Europe/Berlin')::date = berlin_day())) then
      select coalesce((rates->>'wohnraum')::numeric, 0) - coalesce((rates->>'bewohner')::numeric, 0) into frei from village_eco where village_id = p_v;
      if coalesce(frei, 0) >= 1 and random() < 0.3 and amt_bittsteller(p_v) then null; else perform amt_ereignis_neu(p_v); end if;
    end if;
    return;
  end if;
  update dorf_ereignisse set frist = now() + interval '12 hours' where village_id = p_v and status = 'offen' and frist is null;
  for e in""")
out.append(t)

# --- krieg_verluste: Mauern schützen ---
t = fn('031_bewohner_wahl.sql', 'krieg_verluste')
t = sub(t, "+ 0.12 * (select count(*) from unnest(types) t where t = 'wachturm');", "+ 0.12 * (select count(*) from unnest(types) t where t = 'wachturm')\n    + case when 'steinmauer' = any(types) then 0.7 when 'palisade' = any(types) then 0.3 else 0 end;")
out.append(t)

# --- get_my_residents: wer mit dir unterwegs ist, ist nicht im Dorf ---
t = fn('031_bewohner_wahl.sql', 'get_my_residents')
t = sub(t, "'namenlos', n.namenlos, 'zustand', n.zustand,", "'namenlos', n.namenlos, 'zustand', n.zustand,\n        'unterwegs', exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.status = 'laeuft' and n.id = any(q.begleiter)),")
out.append(t)

# --- amt_status: Mindestzeit, Kapitel 4 nur für den Dorfmeister, unterwegs, nächste Entscheidung ---
t = fn('031_bewohner_wahl.sql', 'amt_status')
t = sub(t, "    elsif not (weg->>'kandidat')::boolean then frei := false; grund := 'Noch hat dich niemand als Anführer vorgeschlagen. Dafür musst du dem Dorf erst zeigen, wer du bist.';",
           "    elsif not (weg->>'zeit_ok')::boolean then frei := false; grund := 'Du lebst noch nicht lange genug hier. Frühestens ab ' || to_char((weg->>'ab')::timestamptz at time zone 'Europe/Berlin', 'DD.MM.') || ' kann man dich vorschlagen.';\n    elsif not (weg->>'kandidat')::boolean then frei := false; grund := 'Noch hat dich niemand als Anführer vorgeschlagen. Dafür musst du dem Dorf erst zeigen, wer du bist.';")
t = sub(t, "  if kap.id is not null and runid is null and exists", "  if kap.id is not null and a.kapitel >= 4 and runid is null and not meister then frei := false; grund := 'Nur wer Dorfmeister ist, wird an den Hof des Königs gerufen.'; end if;\n  if kap.id is not null and runid is null and exists")
t = sub(t, "    'weg', weg, 'lagerfeuer', lf,", "    'weg', weg, 'lagerfeuer', lf, 'unterwegs', spieler_unterwegs(auth.uid()),\n    'naechster', case when meister and not exists (select 1 from dorf_ereignisse where village_id = v.id and status = 'offen') then berlin_midnight() end,")
out.append(t)

# --- welt_tick: Mauern der Spielerdörfer; welt_spieler: festes Reiseziel ---
t = fn('032_welt.sql', 'welt_tick')
t = sub(t, "haeuser = (select count(*) from jsonb_array_elements(coalesce(o.layout, '[]'::jsonb)) e where e->>0 <> 'feld'),",
           "haeuser = (select count(*) from jsonb_array_elements(coalesce(o.layout, '[]'::jsonb)) e where e->>0 not in ('feld', 'palisade', 'steinmauer')),\n      mauer = (select case when bool_or(e->>0 = 'steinmauer') then 2 when bool_or(e->>0 = 'palisade') then 1 else 0 end from jsonb_array_elements(coalesce(o.layout, '[]'::jsonb)) e),")
out.append(t)
t = fn('032_welt.sql', 'welt_spieler')
t = sub(t, "tp.def->'szenen'->r.szene->>'ort' ort into q", "tp.def->'szenen'->r.szene->>'ort' ort, tp.def->>'ziel' ziel into q")
t = sub(t, "'ziel_art', coalesce(q.ort, 'wald'),", "'ziel_art', coalesce(q.ort, 'wald'), 'ziel_ort', q.ziel,")
out.append(t)

# --- Sperren: im Dorf handeln nur, wer auch dort ist ---
out.append("""
do $$
declare f record; d text; n text; mit_npc text[] := array['talk_to_npc', 'talk_check', 'ask_personal', 'create_deal'];
  liste text[] := array['dorf_mithelfen', 'dorf_vorschlagen', 'tagwerk_fertig', 'amt_entscheiden', 'amt_fokus', 'amt_verbannen', 'amt_ruecktritt', 'krise_helfen', 'amt_lagerfeuer', 'deliver_deal', 'erkunden_start', 'talk_to_npc', 'talk_check', 'ask_personal', 'create_deal'];
begin
  for f in select p.oid, p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace join pg_language l on l.oid = p.prolang
           where s.nspname = 'public' and p.proname = any(liste) and l.lanname = 'plpgsql' loop
    d := pg_get_functiondef(f.oid);
    continue when position('pruefe_im_dorf' in d) > 0;
    n := regexp_replace(d, '(AS \\$function\\$.*?\\mbegin\\M)', '\\1 perform pruefe_im_dorf(' || case when f.proname = any(mit_npc) then 'p_npc' else '' end || ');');
    if n = d then raise exception 'Sperre nicht eingefügt: %', f.proname; end if;
    execute n;
  end loop;
end $$;

revoke execute on function public.spieler_unterwegs(uuid), public.welt_bund(bigint, text, text, text) from public, anon, authenticated;
revoke execute on function public.pruefe_im_dorf(bigint) from public, anon;
""")
open(os.path.join(R, 'migrations/034_amt_reisen_mauern.sql'), 'w').write('\n'.join(out))
print('ok', sum(len(x) for x in out))
