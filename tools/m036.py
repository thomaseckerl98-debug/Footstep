# Erzeugt migrations/036_reisen_orte_beschaeftigung.sql
# Standort des Spielers, Reisen zwischen Orten, Rückweg nach Quests, Ortsbesuche (7 Orte),
# Beschäftigung (1–12 Std.) mit Fertigkeiten, Quest-Zusammenfassung, KI-Nachschub (Datenbankseite).
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / 'migrations' / '036_reisen_orte_beschaeftigung.sql'
parts = []
A = parts.append

def patch(sig, pairs, inject_after_begin=None):
    """Live-Funktion per pg_get_functiondef ändern. Bricht ab, wenn ein Ziel fehlt; überspringt bereits angewandte Teile."""
    s = [f"do $p$ declare d text; begin\n  d := pg_get_functiondef('public.{sig}'::regprocedure);"]
    for i, (old, new) in enumerate(pairs):
        s.append(f"  if position($n{i}${new}$n{i}$ in d) = 0 then\n    if position($o{i}${old}$o{i}$ in d) = 0 then raise exception 'Patch {sig}: Ziel {i} fehlt'; end if;\n    d := replace(d, $o{i}${old}$o{i}$, $n{i}${new}$n{i}$);\n  end if;")
    if inject_after_begin:
        s.append(f"  if position($j${inject_after_begin}$j$ in d) = 0 then d := regexp_replace(d, '\\mbegin\\M', 'begin ' || $j${inject_after_begin}$j$); end if;")
    s.append("  execute d;\nend $p$;\n")
    A('\n'.join(s))

# ───────────── Schema ─────────────
A("""
alter table public.profiles add column if not exists aufenthalt text references public.welt_orte(id);
alter table public.profiles add column if not exists weg_von text;
alter table public.profiles add column if not exists weg_ab timestamptz;
alter table public.profiles add column if not exists weg_bis timestamptz;
alter table public.quest_runs add column if not exists heimweg_offen boolean not null default false;
alter table public.npcs add column if not exists welt_ort text references public.welt_orte(id);
alter table public.quest_templates add column if not exists fundort text;
alter table public.quest_templates add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.quest_templates add column if not exists erstellt_at timestamptz not null default now();
create index if not exists npcs_welt_ort_idx on public.npcs (welt_ort) where welt_ort is not null;

create table if not exists public.fertigkeiten (
  player_id uuid not null references public.profiles(id) on delete cascade,
  id text not null,
  xp numeric not null default 0,
  primary key (player_id, id)
);
create table if not exists public.beschaeftigung_arten (
  id text primary key, name text not null, text text not null, fert text[] not null, ertrag jsonb not null default '{}', jobs text[] not null default '{}', taetigkeit text not null, sort int not null default 0
);
create table if not exists public.beschaeftigung (
  id bigserial primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  art text not null references public.beschaeftigung_arten(id),
  start timestamptz not null default now(),
  bis timestamptz not null,
  ende_at timestamptz,
  ergebnis jsonb,
  gesehen boolean not null default false
);
create unique index if not exists beschaeftigung_aktiv on public.beschaeftigung (player_id) where ende_at is null;
alter table public.fertigkeiten enable row level security;
alter table public.beschaeftigung_arten enable row level security;
alter table public.beschaeftigung enable row level security;
revoke all on public.fertigkeiten, public.beschaeftigung_arten, public.beschaeftigung from anon, authenticated;

insert into public.beschaeftigung_arten (id, name, text, fert, ertrag, jobs, taetigkeit, sort) values
 ('holz', 'Holz schlagen', 'Mit den Holzfällern in den Wald: Stämme fällen, entasten, Scheite spalten. Hartes Brot, aber das Dorf friert nicht.', '{anpacken,flink}', '{"holz": 2.2}', '{Holzfäller,Zimmermann}', 'schlägt Holz', 1),
 ('feld', 'Auf den Feldern helfen', 'Furchen ziehen, Unkraut jäten, Garben binden. Wer mit den Bauern schwitzt, dem erzählen sie auch, was sie wirklich denken.', '{anpacken,menschenkenntnis}', '{"nahrung": 4}', '{Bauer,Bäuerin,Hirte}', 'arbeitet auf dem Feld', 2),
 ('bau', 'Auf der Baustelle mitarbeiten', 'Balken tragen, Lehm stampfen, Steine setzen. Was der Dorfrat gerade baut, wächst schneller.', '{anpacken,altes_wissen}', '{"bau": 1.5}', '{Zimmermann,Steinmetz,Maurer}', 'packt auf der Baustelle an', 3),
 ('jagd', 'Mit den Jägern auf die Pirsch', 'Fährten lesen, still sein, warten. Manchmal kommt man mit Fleisch heim, manchmal nur mit nassen Füßen.', '{spuren,flink}', '{"nahrung": 2.5}', '{Jäger,Jägerin,Falknerin}', 'ist auf der Pirsch', 4),
 ('kraeuter', 'Kräuter sammeln und trocknen', 'Schafgarbe, Arnika, Weidenrinde. Man lernt, was heilt und was tötet – oft ist es dieselbe Pflanze.', '{heilkunde,spuren}', '{"waren": 0.5}', '{Heilerin,Kräuterfrau,Alchemist}', 'sammelt Kräuter', 5),
 ('pflege', 'Kranke und Verletzte pflegen', 'Verbände wechseln, Fieber kühlen, zuhören. Wer krank ist, wird schneller gesund – und vergisst nicht, wer an seinem Bett saß.', '{heilkunde,beruhigen}', '{"heilen": 1}', '{Heilerin,Priesterin}', 'pflegt Kranke', 6),
 ('wache', 'Wache am Dorfrand stehen', 'Augen offen halten, Fremde ansprechen, nachts nicht einschlafen. Langweilig – bis es das nicht mehr ist.', '{einschuechtern,spuren}', '{"stimmung": 0.3}', '{Wache,Söldnerin,Hauptmann}', 'steht Wache', 7),
 ('uebung', 'Waffenübung', 'Hiebe gegen den Pfahl, Schritte im Sand, Ausweichen, bis die Beine brennen. Macht dich im Kampf zäher und schneller.', '{kampf,flink}', '{}', '{Wache,Söldnerin,Hauptmann,Schmied}', 'übt mit der Waffe', 8),
 ('schenke', 'In der Schenke erzählen und zuhören', 'Ein Krug, ein Lied, ein Gerücht. Man lernt Menschen lesen – und die Leute lernen dich kennen.', '{menschenkenntnis,ueberreden}', '{"sympathie": 1}', '{Wirt,Schankmaid,Barde}', 'sitzt in der Schenke', 9),
 ('markt', 'Mit Händlern feilschen', 'Waren tauschen, Preise drücken, Lügen erkennen. Das Dorf bekommt etwas mehr für sein Holz.', '{feilschen,ueberreden}', '{"waren": 0.6}', '{Händler,Wirt}', 'feilscht mit Händlern', 10),
 ('lernen', 'Bei den Alten lernen', 'Alte Geschichten, Namen von Sternen, wer wem was schuldet. Wissen ist leise – bis man es braucht.', '{altes_wissen,beruhigen}', '{}', '{Gelehrter,Schreiber,Mönch,Dorfälteste,Priesterin}', 'hört den Alten zu', 11),
 ('klettern', 'Klettern und Laufen am Hang', 'Felsen, Bäume, Geröll. Wer oft genug fällt, fällt irgendwann nicht mehr.', '{flink,anpacken}', '{}', '{Jäger,Hirte}', 'klettert am Hang', 12)
on conflict (id) do update set name = excluded.name, text = excluded.text, fert = excluded.fert, ertrag = excluded.ertrag, jobs = excluded.jobs, taetigkeit = excluded.taetigkeit, sort = excluded.sort;
""")

# ───────────── Orte und Reisen ─────────────
A("""
create or replace function public.heim_ort(p_uid uuid) returns text language sql stable security definer set search_path = public as $$
  select o.id from welt_orte o join villages v on v.id = o.village_id where v.owner_id = p_uid order by v.id limit 1;
$$;
create or replace function public.ort_name(p_id text) returns text language sql stable security definer set search_path = public as $$
  select name from welt_orte where id = p_id;
$$;
-- Gehzeit: einmal quer über die ganze Karte (4000 Einheiten) = 24 Stunden
create or replace function public.reise_minuten(p_von text, p_nach text) returns int language sql stable security definer set search_path = public as $$
  select greatest(20, round(sqrt(power(a.x - b.x, 2) + power(a.y - b.y, 2)) / 4000.0 * 24 * 60))::int from welt_orte a, welt_orte b where a.id = p_von and b.id = p_nach;
$$;
create or replace function public.besuchbar(p_id text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from welt_orte o left join villages v on v.id = o.village_id where o.id = p_id and (o.id in ('moosherz', 'furtenau', 'hollerbrueck', 'rabenfels') or v.owner_id is not null));
$$;
create or replace function public.q_endort(p_run bigint) returns text language sql stable security definer set search_path = public as $$
  select case when t.fundort is not null then r.flags->>'start_ort'
              when exists (select 1 from welt_orte o where o.id = t.def->>'ziel') then t.def->>'ziel' end
  from quest_runs r join quest_templates t on t.id = r.quest_id where r.id = p_run;
$$;

-- Wo ist der Spieler gerade?  daheim | quest | wahl (Rückweg wählen) | weg (zu Fuß zu einem Ort) | ort (in einem anderen Ort)
create or replace function public.spieler_lage(p_uid uuid) returns json language plpgsql stable security definer set search_path = public as $$
declare q record; f record; p profiles; heim text;
begin
  heim := heim_ort(p_uid);
  select r.id, t.titel, r.begleiter, r.warte_bis into q from quest_runs r join quest_templates t on t.id = r.quest_id
   where r.player_id = p_uid and r.status = 'laeuft' and (t.art <> 'chronik' or coalesce((t.def->>'reise')::boolean, false)) and not (coalesce(t.def->'heim', '[]'::jsonb) ? r.szene)
   order by q_nebenbei(r.quest_id), r.id desc limit 1;
  if q.id is not null then
    return json_build_object('zustand', 'quest', 'run', q.id, 'titel', q.titel, 'begleiter', coalesce(to_json(q.begleiter), '[]'::json), 'reist', q.warte_bis is not null and q.warte_bis > now(), 'bis', q.warte_bis, 'heim', heim);
  end if;
  select r.id, t.titel into f from quest_runs r join quest_templates t on t.id = r.quest_id where r.player_id = p_uid and r.status = 'fertig' and r.heimweg_offen order by r.id desc limit 1;
  if f.id is not null then
    return json_build_object('zustand', 'wahl', 'run', f.id, 'titel', f.titel, 'ort', q_endort(f.id), 'ort_name', ort_name(q_endort(f.id)), 'begleiter', '[]'::json, 'heim', heim);
  end if;
  select * into p from profiles where id = p_uid;
  if p.weg_bis is not null and p.weg_bis > now() then
    return json_build_object('zustand', 'weg', 'nach', coalesce(p.aufenthalt, heim), 'nach_name', ort_name(coalesce(p.aufenthalt, heim)), 'von', p.weg_von, 'ab', p.weg_ab, 'bis', p.weg_bis, 'heim', heim, 'begleiter', '[]'::json, 'reist', true);
  end if;
  if p.aufenthalt is not null and p.aufenthalt is distinct from heim then
    return json_build_object('zustand', 'ort', 'ort', p.aufenthalt, 'ort_name', ort_name(p.aufenthalt), 'heim', heim, 'begleiter', '[]'::json);
  end if;
  return json_build_object('zustand', 'daheim', 'ort', heim, 'heim', heim);
end $$;

create or replace function public.spieler_ort_jetzt(p_uid uuid) returns text language sql stable security definer set search_path = public as $$
  select case when l->>'zustand' in ('daheim', 'ort') then l->>'ort' end from (select spieler_lage(p_uid) l) x;
$$;

create or replace function public.spieler_unterwegs(p_uid uuid) returns json language plpgsql stable security definer set search_path = public as $$
declare l jsonb;
begin
  l := spieler_lage(p_uid)::jsonb;
  if l->>'zustand' = 'daheim' then return null; end if;
  if l->>'zustand' = 'weg' then l := l || jsonb_build_object('titel', 'Auf dem Weg nach ' || coalesce(l->>'nach_name', 'Hause'));
  elsif l->>'zustand' = 'ort' then l := l || jsonb_build_object('titel', 'In ' || coalesce(l->>'ort_name', 'der Fremde'));
  end if;
  return l::json;
end $$;

create or replace function public.npc_reachable(p_npc bigint) returns boolean language plpgsql stable security definer set search_path = public as $$
declare n npcs; u json; hier text; vid bigint;
begin
  select * into n from npcs where id = p_npc;
  if n.id is null or n.tot_at is not null or n.namenlos then return false; end if;
  if n.village_id is null and n.welt_ort is null then return true; end if;
  select id into vid from villages where owner_id = auth.uid();
  u := spieler_unterwegs(auth.uid());
  if n.village_id = vid then
    return u is null or exists (select 1 from json_array_elements_text(u->'begleiter') b where b::bigint = p_npc);
  end if;
  hier := spieler_ort_jetzt(auth.uid());
  return hier is not null and hier = coalesce(n.welt_ort, (select o.id from welt_orte o where o.village_id = n.village_id));
end $$;

create or replace function public.pruefe_im_dorf(p_npc bigint default null) returns void language plpgsql stable security definer set search_path = public as $$
declare u json;
begin
  if p_npc is not null and npc_reachable(p_npc) then return; end if;
  u := spieler_unterwegs(auth.uid());
  if u is null then return; end if;
  if p_npc is not null and exists (select 1 from json_array_elements_text(u->'begleiter') b where b::bigint = p_npc) then return; end if;
  case u->>'zustand'
    when 'ort' then raise exception 'Du bist gerade in %. Das geht nur daheim – reise erst zurück.', u->>'ort_name';
    when 'weg' then raise exception 'Du bist auf dem Weg nach % (Ankunft % Uhr).', u->>'nach_name', to_char((u->>'bis')::timestamptz at time zone 'Europe/Berlin', 'HH24:MI');
    when 'wahl' then raise exception 'Dein Abenteuer („%“) ist vorbei – wähle erst deinen Weg: heimkehren, weiterziehen oder bleiben.', u->>'titel';
    else raise exception 'Du bist unterwegs („%“). Im Dorf kannst du gerade nichts tun – das geht erst wieder, wenn du zurück bist.', u->>'titel';
  end case;
end $$;

create or replace function public.reise_ziele() returns json language plpgsql stable security definer set search_path = public as $$
declare l json; von text; heim text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  l := spieler_lage(auth.uid()); heim := l->>'heim';
  von := case when l->>'zustand' in ('daheim', 'ort') then l->>'ort' when l->>'zustand' = 'wahl' then coalesce(l->>'ort', heim) end;
  return json_build_object('zustand', l->>'zustand', 'von', von, 'von_name', ort_name(von), 'heim', heim,
    'ziele', (select coalesce(json_agg(json_build_object('id', o.id, 'name', o.name, 'art', o.art, 'heim', o.id = heim, 'hier', o.id = von,
        'minuten', case when von is null or o.id = von then null else reise_minuten(von, o.id) end) order by o.id = heim desc, case when von is null then 0 else reise_minuten(von, o.id) end), '[]'::json)
      from welt_orte o where o.id = heim or besuchbar(o.id)));
end $$;

create or replace function public.reise_start(p_ziel text) returns json language plpgsql security definer set search_path = public as $$
declare l json; von text; heim text; ziel text; m int; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Nicht angemeldet'; end if;
  perform pruefe_frei();
  l := spieler_lage(uid); heim := l->>'heim';
  if l->>'zustand' not in ('daheim', 'ort') then raise exception 'Du bist gerade unterwegs.'; end if;
  von := l->>'ort'; ziel := case when p_ziel = 'heim' then heim else p_ziel end;
  if ziel = von then raise exception 'Da bist du schon.'; end if;
  if ziel is distinct from heim and not besuchbar(ziel) then raise exception 'Dorthin kannst du noch nicht reisen.'; end if;
  m := reise_minuten(von, ziel);
  update profiles set aufenthalt = case when ziel = heim then null else ziel end, weg_von = von, weg_ab = now(), weg_bis = now() + make_interval(mins => m) where id = uid;
  return json_build_object('ok', true, 'ziel', ziel, 'ziel_name', ort_name(ziel), 'minuten', m, 'ankunft', now() + make_interval(mins => m), 'daheim', ziel = heim);
end $$;

-- Rückweg nach einem Abenteuer
create or replace function public.q_heimweg_noetig(p_run bigint, p_szene text) returns boolean language sql stable security definer set search_path = public as $$
  select not (coalesce(t.def->'heim', '[]'::jsonb) ? p_szene) and t.art <> 'erkundung' and not q_nebenbei(t.id)
     and (q_endort(r.id) is not null or coalesce((r.flags->>'gelaufen')::numeric, 0) >= 30)
  from quest_runs r join quest_templates t on t.id = r.quest_id where r.id = p_run;
$$;
create or replace function public.q_heimweg_info(p_run bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare r quest_runs; von text; heim text; hm int;
begin
  select * into r from quest_runs where id = p_run;
  heim := heim_ort(r.player_id); von := q_endort(p_run);
  hm := case when von is null then greatest(10, round(coalesce((r.flags->>'gelaufen')::numeric, 0) * 0.5))::int when von = heim then 0 else reise_minuten(von, heim) end;
  return json_build_object('von', von, 'von_name', ort_name(von), 'heim', json_build_object('id', heim, 'name', ort_name(heim), 'minuten', hm),
    'hier', case when von is not null and von <> heim then json_build_object('id', von, 'name', ort_name(von)) end,
    'weiter', (select coalesce(json_agg(json_build_object('id', o.id, 'name', o.name, 'art', o.art, 'minuten', reise_minuten(coalesce(von, heim), o.id)) order by reise_minuten(coalesce(von, heim), o.id)), '[]'::json)
               from welt_orte o where besuchbar(o.id) and o.id is distinct from heim and o.id is distinct from von));
end $$;
create or replace function public.q_abschluss(p_run bigint) returns json language sql stable security definer set search_path = public as $$
  select json_build_object('titel', t.titel,
    'wege', (select coalesce(json_agg(x), '[]'::json) from (select x from jsonb_array_elements_text(coalesce(r.flags->'wege', '[]'::jsonb)) with ordinality w(x, n) order by n desc limit 6) y),
    'ertrag', coalesce(r.flags->'ertrag', '[]'::jsonb),
    'minuten', round(extract(epoch from (now() - r.started_at)) / 60),
    'gelaufen', coalesce((r.flags->>'gelaufen')::numeric, 0),
    'begleiter', (select coalesce(json_agg(n.name), '[]'::json) from npcs n where n.id = any(r.begleiter)))
  from quest_runs r join quest_templates t on t.id = r.quest_id where r.id = p_run;
$$;
create or replace function public.quest_heimweg(p_run bigint, p_ziel text) returns json language plpgsql security definer set search_path = public as $$
declare r quest_runs; von text; heim text; ziel text; m int; uid uuid := auth.uid();
begin
  select * into r from quest_runs where id = p_run and player_id = uid and status = 'fertig' and heimweg_offen for update;
  if not found then raise exception 'Hier gibt es keinen Weg zu wählen.'; end if;
  heim := heim_ort(uid); von := q_endort(r.id);
  if p_ziel = 'hier' then
    if von is null or von = heim then raise exception 'Hier ist kein Ort zum Bleiben.'; end if;
    update profiles set aufenthalt = von, weg_von = null, weg_ab = null, weg_bis = null where id = uid; ziel := von; m := 0;
  else
    ziel := case when p_ziel = 'heim' then heim else p_ziel end;
    if ziel is distinct from heim and not besuchbar(ziel) then raise exception 'Dorthin führt kein Weg.'; end if;
    m := case when von is null then case when ziel = heim then greatest(10, round(coalesce((r.flags->>'gelaufen')::numeric, 0) * 0.5))::int else reise_minuten(heim, ziel) end
              when von = ziel then 0 else reise_minuten(von, ziel) end;
    update profiles set aufenthalt = case when ziel = heim then null else ziel end, weg_von = coalesce(von, heim), weg_ab = now(),
      weg_bis = case when m > 0 then now() + make_interval(mins => m) end where id = uid;
  end if;
  update quest_runs set heimweg_offen = false where id = r.id;
  return json_build_object('ok', true, 'ziel', ziel, 'ziel_name', ort_name(ziel), 'minuten', m, 'ankunft', now() + make_interval(mins => m), 'daheim', ziel = heim);
end $$;

-- Dauer einer Quest (Summe der Wegstrecken; kürzester und längster Weg bis zu einem Ende)
create or replace function public.quest_dauer(p_quest text) returns json language plpgsql stable security definer set search_path = public as $$
declare t quest_templates; sz jsonb; st text[]; tot int[]; vis text[]; cur text; ct int; cv text; nxt text; mn int := null; mx int := 0; steps int := 0; o jsonb; heim text; hm int;
begin
  select * into t from quest_templates where id = p_quest; if not found then return null; end if;
  sz := t.def->'szenen';
  st := array[t.def->>'start']; tot := array[0]; vis := array[','];
  while array_length(st, 1) > 0 and steps < 3000 loop
    steps := steps + 1;
    cur := st[array_length(st, 1)]; ct := tot[array_length(tot, 1)]; cv := vis[array_length(vis, 1)];
    st := st[1:array_length(st, 1) - 1]; tot := tot[1:array_length(tot, 1) - 1]; vis := vis[1:array_length(vis, 1) - 1];
    if sz->cur is null or position(',' || cur || ',' in cv) > 0 then continue; end if;
    cv := cv || cur || ',';
    if sz->cur ? 'reise' then ct := ct + coalesce((sz->cur->'reise'->>'minuten')::numeric, 0)::int; end if;
    if coalesce((sz->cur->>'ende')::boolean, false) then mn := least(coalesce(mn, ct), ct); mx := greatest(mx, ct); continue; end if;
    for nxt in
      select x from (
        select sz->cur->'reise'->>'weiter' x
        union all select e->>'weiter' from jsonb_array_elements(coalesce(sz->cur->'optionen', '[]'::jsonb)) e
        union all select e->'erfolg'->>'weiter' from jsonb_array_elements(coalesce(sz->cur->'optionen', '[]'::jsonb)) e
        union all select e->'misserfolg'->>'weiter' from jsonb_array_elements(coalesce(sz->cur->'optionen', '[]'::jsonb)) e
        union all select sz->cur->'minispiel'->'erfolg'->>'weiter' union all select sz->cur->'minispiel'->'misserfolg'->>'weiter'
        union all select sz->cur->'raetsel'->'erfolg'->>'weiter' union all select sz->cur->'raetsel'->'misserfolg'->>'weiter'
      ) y where x is not null
    loop st := st || nxt; tot := tot || ct; vis := vis || cv; end loop;
  end loop;
  heim := heim_ort(auth.uid());
  hm := case when coalesce(jsonb_array_length(t.def->'heim'), 0) > 0 then 0
             when t.fundort is not null then 0
             when exists (select 1 from welt_orte w where w.id = t.def->>'ziel') then reise_minuten(t.def->>'ziel', heim)
             when mx >= 30 then round(mx * 0.5)::int else 0 end;
  return json_build_object('min', coalesce(mn, 0), 'max', mx, 'heimweg', hm, 'kampf', q_kampf(t.def));
end $$;
""")

# ───────────── Fertigkeiten und Beschäftigung ─────────────
A("""
create or replace function public.fert_stufe(p_xp numeric) returns int language sql immutable set search_path = public as $$
  select least(6, floor((sqrt(1 + 4 * greatest(0, coalesce(p_xp, 0)) / 3.0) - 1) / 2))::int;
$$;
create or replace function public.fert_bonus(p_uid uuid, p_id text) returns int language sql stable security definer set search_path = public as $$
  select case when s >= 5 then 3 when s >= 3 then 2 when s >= 1 then 1 else 0 end from (select fert_stufe(coalesce((select xp from fertigkeiten where player_id = p_uid and id = p_id), 0)) s) x;
$$;
create or replace function public.fert_xp(p_uid uuid, p_id text, p_h numeric) returns void language sql security definer set search_path = public as $$
  insert into fertigkeiten (player_id, id, xp) values (p_uid, p_id, greatest(0, p_h)) on conflict (player_id, id) do update set xp = fertigkeiten.xp + greatest(0, excluded.xp);
$$;

-- Schreibt die Arbeit gut (voll, wenn die Zeit um ist; anteilig beim Abbrechen)
create or replace function public.beschaeftigung_abschluss(p_uid uuid, p_abbruch boolean default false) returns json language plpgsql security definer set search_path = public as $$
declare b beschaeftigung; a beschaeftigung_arten; h numeric; vid bigint; f text; i int := 0; vor int; nach int; fl jsonb := '[]'::jsonb; eff text := ''; d jsonb := '{}'::jsonb;
  pr village_projects; nids bigint[]; nm text; sym int; res jsonb; prof profiles;
begin
  select * into b from beschaeftigung where player_id = p_uid and ende_at is null for update;
  if b.id is null then return null; end if;
  if not p_abbruch and b.bis > now() then return null; end if;
  select * into a from beschaeftigung_arten where id = b.art;
  select * into prof from profiles where id = p_uid;
  h := round(extract(epoch from (least(now(), b.bis) - b.start)) / 3600.0, 2);
  select id into vid from villages where owner_id = p_uid;
  foreach f in array a.fert loop
    i := i + 1;
    vor := fert_stufe(coalesce((select xp from fertigkeiten where player_id = p_uid and id = f), 0));
    perform fert_xp(p_uid, f, h * case when i = 1 then 1 else 0.5 end);
    nach := fert_stufe((select xp from fertigkeiten where player_id = p_uid and id = f));
    fl := fl || jsonb_build_object('id', f, 'vorher', vor, 'nachher', nach, 'xp', round((select xp from fertigkeiten where player_id = p_uid and id = f), 1));
  end loop;
  if vid is not null and h >= 0.25 then
    perform eco_tick(vid);
    for f in select k from jsonb_object_keys(a.ertrag) k where k in ('holz', 'stein', 'nahrung', 'waren') loop d := d || jsonb_build_object(f, round((a.ertrag->>f)::numeric * h, 1)); end loop;
    if d <> '{}'::jsonb then perform eco_add(vid, d); eff := coalesce(eco_effekt(d), ''); end if;
    if a.ertrag ? 'bau' then
      select * into pr from village_projects where village_id = vid and status = 'im_bau' order by id limit 1 for update;
      if pr.id is not null then
        update village_projects set arbeit_ist = least(arbeit_soll, arbeit_ist + (a.ertrag->>'bau')::numeric * h) where id = pr.id returning * into pr;
        if pr.arbeit_ist >= pr.arbeit_soll then perform eco_finish(pr.id, now()); eff := trim(eff || ' Der Bau ist fertig geworden!'); else eff := trim(eff || ' Die Baustelle ist ein gutes Stück vorangekommen.'); end if;
      else eff := trim(eff || ' Gerade wird nichts gebaut – du hast beim Ausbessern geholfen.'); end if;
    end if;
    if a.ertrag ? 'heilen' then
      update npcs set zustand_bis = zustand_bis - make_interval(secs => round(h * 3600 * (a.ertrag->>'heilen')::numeric)) where village_id = vid and zustand in ('krank', 'verletzt') and zustand_bis > now();
      eff := trim(eff || ' Wer krank war, kommt schneller wieder auf die Beine.');
    end if;
    if a.ertrag ? 'stimmung' then update village_eco set stimmung = least(100, stimmung + (a.ertrag->>'stimmung')::numeric * h) where village_id = vid; eff := trim(eff || ' Die Leute schlafen ruhiger.'); end if;
    sym := least(5, greatest(1, round(h / 2)::int)) + case when a.ertrag ? 'sympathie' then 2 else 0 end;
    select array_agg(n.id order by n.namenlos, random()) into nids from npcs n where n.village_id = vid and n.tot_at is null and (n.job = any(a.jobs) or a.ertrag ? 'sympathie');
    if nids is not null then
      insert into npc_relations (npc_id, player_id, sympathy, loyalty) select x, p_uid, 0, 0 from unnest(nids) x on conflict do nothing;
      update npc_relations set sympathy = least(100, sympathy + sym), updated_at = now() where player_id = p_uid and npc_id = any(nids[1:4]);
      nm := eco_names(nids[1:3]);
      if not (select namenlos from npcs where id = nids[1]) then
        insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (nids[1], p_uid, 'gespraech', prof.character_name || ' hat ' || round(h) || ' Stunden mit uns gearbeitet (' || a.name || ').', sym);
      end if;
    end if;
    if h >= 3 then perform ansehen_add(p_uid, least(4, floor(h / 3)::int), a.name); end if;
    perform eco_log(vid, 'hilfe', prof.character_name || ' ' || a.taetigkeit || ' (' || round(h) || ' Std.).', null);
  end if;
  res := jsonb_build_object('art', a.id, 'name', a.name, 'stunden', h, 'geplant', round(extract(epoch from (b.bis - b.start)) / 3600.0, 1), 'abbruch', p_abbruch and b.bis > now(),
    'fertigkeiten', fl, 'ertrag', eff, 'mit', nm);
  update beschaeftigung set ende_at = least(now(), b.bis), ergebnis = res, gesehen = p_abbruch where id = b.id;
  return res::json;
end $$;

create or replace function public.pruefe_frei() returns void language plpgsql security definer set search_path = public as $$
declare b record;
begin
  perform beschaeftigung_abschluss(auth.uid(), false);
  select x.bis, a.name into b from beschaeftigung x join beschaeftigung_arten a on a.id = x.art where x.player_id = auth.uid() and x.ende_at is null;
  if b.name is not null then raise exception 'Du bist gerade beschäftigt (%, bis % Uhr). Brich es ab, wenn du etwas anderes tun willst.', b.name, to_char(b.bis at time zone 'Europe/Berlin', 'HH24:MI'); end if;
end $$;

create or replace function public.beschaeftigung_status() returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); neu json;
begin
  if uid is null then raise exception 'Nicht angemeldet'; end if;
  perform beschaeftigung_abschluss(uid, false);
  select ergebnis into neu from beschaeftigung where player_id = uid and ende_at is not null and not gesehen order by id desc limit 1;
  update beschaeftigung set gesehen = true where player_id = uid and ende_at is not null and not gesehen;
  return json_build_object(
    'aktiv', (select json_build_object('art', a.id, 'name', a.name, 'taetigkeit', a.taetigkeit, 'start', b.start, 'bis', b.bis) from beschaeftigung b join beschaeftigung_arten a on a.id = b.art where b.player_id = uid and b.ende_at is null),
    'fertig', neu,
    'arten', (select coalesce(json_agg(json_build_object('id', a.id, 'name', a.name, 'text', a.text, 'fert', a.fert) order by a.sort), '[]'::json) from beschaeftigung_arten a),
    'fertigkeiten', (select coalesce(json_object_agg(f.id, json_build_object('xp', round(f.xp, 1), 'stufe', fert_stufe(f.xp), 'bonus', fert_bonus(uid, f.id))), '{}'::json) from fertigkeiten f where f.player_id = uid),
    'frei', spieler_unterwegs(uid) is null);
end $$;

create or replace function public.beschaeftigung_start(p_art text, p_stunden int) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Nicht angemeldet'; end if;
  perform pruefe_im_dorf(); perform pruefe_frei();
  if p_stunden is null or p_stunden < 1 or p_stunden > 12 then raise exception 'Zwischen 1 und 12 Stunden.'; end if;
  if not exists (select 1 from beschaeftigung_arten where id = p_art) then raise exception 'Unbekannte Beschäftigung'; end if;
  if exists (select 1 from quest_runs where player_id = uid and status = 'laeuft' and not q_nebenbei(quest_id)) then raise exception 'Erst das laufende Abenteuer beenden.'; end if;
  insert into beschaeftigung (player_id, art, bis) values (uid, p_art, now() + make_interval(hours => p_stunden));
  return beschaeftigung_status();
end $$;

create or replace function public.beschaeftigung_abbrechen() returns json language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  return json_build_object('ergebnis', beschaeftigung_abschluss(auth.uid(), true), 'status', beschaeftigung_status());
end $$;
""")

# ───────────── Ortsbesuch ─────────────
A("""
create or replace function public.ort_besuch() returns json language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); l json; o welt_orte; vid bigint; owner uuid; heim text;
begin
  if uid is null then raise exception 'Nicht angemeldet'; end if;
  l := spieler_lage(uid);
  if l->>'zustand' <> 'ort' then return null; end if;
  select * into o from welt_orte where id = l->>'ort'; vid := o.village_id; heim := l->>'heim';
  select owner_id into owner from villages where id = vid;
  return json_build_object('id', o.id, 'name', o.name, 'art', o.art, 'text', o.text, 'existenz', o.existenz, 'stil', o.stil,
    'reich', (select json_build_object('name', r.name, 'herrscher', r.herrscher) from welt_reiche r where r.id = o.reich),
    'bild', case when o.art in ('grossstadt', 'stadt') then 'stadt' when o.art = 'burg' then 'burg' else 'dorf' end,
    'heim', json_build_object('id', heim, 'name', ort_name(heim), 'minuten', reise_minuten(o.id, heim)),
    'bewohner', (select coalesce(json_agg(json_build_object('id', n.id, 'name', n.name, 'beruf', n.job, 'look', n.look, 'namenlos', n.namenlos, 'zustand', n.zustand,
        'stimmung', npc_stimmung(coalesce(r.sympathy, 0)), 'wesen', npc_wesen(n.traits), 'kennt', r.npc_id is not null) order by n.namenlos, n.id), '[]'::json)
      from npcs n left join npc_relations r on r.npc_id = n.id and r.player_id = uid
      where n.tot_at is null and (n.welt_ort = o.id or (vid is not null and n.village_id = vid))),
    'spieler', (select coalesce(json_agg(json_build_object('name', p.character_name, 'look', p.look, 'heimat', ort_name(heim_ort(p.id)), 'hausherr', p.id = owner)), '[]'::json)
      from profiles p where p.id <> uid and spieler_ort_jetzt(p.id) = o.id),
    'quests', (select coalesce(json_agg(json_build_object('id', t.id, 'titel', t.titel, 'beschreibung', t.beschreibung, 'kurz', t.kurz,
        'erledigt', exists (select 1 from quest_runs q where q.player_id = uid and q.quest_id = t.id and q.status = 'fertig'), 'dauer', quest_dauer(t.id)) order by t.titel), '[]'::json)
      from quest_templates t where t.fundort = o.id or (t.fundort = 'spielerdorf' and owner is not null and owner <> uid)));
end $$;

-- Welt-NPCs (Bewohner der Städte, die man besuchen kann)
create or replace function public.npc_neu_welt(p_ort text, p_name text, p_job text, p_w int, p_namenlos boolean, p_traits jsonb default null) returns bigint language plpgsql security definer set search_path = public as $$
declare base jsonb; nid bigint;
begin
  select look into base from npcs where coalesce((look->>'w')::int, 0) = p_w and look is not null order by random() limit 1;
  base := coalesce(base, '{}'::jsonb) - 'prop'
    || jsonb_build_object('w', p_w,
      'top', (select look->'top' from npcs where look ? 'top' order by random() limit 1),
      'legs', (select look->'legs' from npcs where look ? 'legs' order by random() limit 1),
      'hair', (select look->'hair' from npcs where look ? 'hair' order by random() limit 1),
      'skin', (select look->'skin' from npcs where look ? 'skin' order by random() limit 1));
  if p_w = 0 then base := base || jsonb_build_object('beard', (select look->'beard' from npcs where look ? 'beard' and coalesce((look->>'w')::int, 0) = 0 order by random() limit 1)); end if;
  base := base || coalesce((select jsonb_build_object('prop', look->'prop') from npcs where job = p_job and look ? 'prop' limit 1), '{}'::jsonb);
  insert into npcs (name, job, tier, look, village_id, welt_ort, traits, namenlos)
  values (p_name, p_job, case when p_namenlos then 3 else 2 end, base, null, p_ort,
    coalesce(p_traits, jsonb_build_object('mut', floor(random() * 100), 'gier', floor(random() * 100), 'treue', 30 + floor(random() * 60), 'fleiss', 30 + floor(random() * 60), 'geselligkeit', floor(random() * 100))), p_namenlos)
  returning id into nid;
  return nid;
end $$;

create or replace function public.npc_wohnort(p_npc bigint) returns text language sql stable security definer set search_path = public as $$
  select coalesce(ort_name(n.welt_ort), (select v.name from villages v where v.id = n.village_id)) from npcs n where n.id = p_npc;
$$;
""")

# Bewohner der vier Städte (nur einmal anlegen)
TOWNS = {
  'moosherz': [
    ('Irmentrud', 'Schreiber', 1, {'mut': 40, 'gier': 35, 'treue': 85, 'fleiss': 90, 'geselligkeit': 30},
     ('Tochter eines Tuchhändlers, hat sich mit Fleiß bis in die Kanzlei des Königs geschrieben.', 'Ein Gesetz durchbringen, das auch Bauern vor Gericht eine Stimme gibt.', 'Dass der König sie fallen lässt, sobald sie unbequem wird.', 'Sie kopiert heimlich Briefe des Grafen von Rabenfels, die über ihren Tisch gehen.', 'Genau, unbestechlich, merkt sich jedes Wort.', 'Kühl, misstrauisch, hält Gefühle für Schwäche.', 'Trägt immer Tintenflecken an den Fingern und korrigiert Leute, die falsch zitieren.', 2)),
    ('Bruno', 'Hauptmann', 0, {'mut': 80, 'gier': 45, 'treue': 60, 'fleiss': 55, 'geselligkeit': 70},
     ('Bauernsohn aus Goldacker, im Grenzkrieg gegen die Ostmark zum Hauptmann der Stadtwache aufgestiegen.', 'Genug Geld für einen Hof mit Blick aufs Meer.', 'Wieder Männer in eine Schlacht führen zu müssen, die er nicht gewinnen kann.', 'Er lässt Schmuggler am Hafen passieren, wenn der Preis stimmt – das Geld schickt er an Kriegswitwen.', 'Mutig, praktisch, Leute folgen ihm.', 'Bestechlich, trinkt zu viel, verachtet Höflinge.', 'Erzählt jede Geschichte zweimal und jedes Mal wird der Feind größer.', 0)),
    ('Mirela', 'Seherin', 1, {'mut': 55, 'gier': 60, 'treue': 25, 'fleiss': 40, 'geselligkeit': 85},
     ('Kam mit fahrendem Volk aus dem Süden, blieb in Moosherz und liest am Markt aus Händen.', 'Wissen, wer ihre Mutter verraten hat.', 'Erkannt zu werden – sie ist nicht die, für die man sie hält.', 'Sie verkauft Gerüchte an beide Seiten: an den Hof und an die Leute aus Rabenfels.', 'Liest Menschen wie offene Bücher, charmant.', 'Lügt aus Gewohnheit, bindet sich an niemanden.', 'Lacht, bevor sie eine schlechte Nachricht ausspricht.', -1)),
  ],
  'furtenau': [
    ('Gerwin', 'Händler', 0, {'mut': 45, 'gier': 55, 'treue': 70, 'fleiss': 75, 'geselligkeit': 60},
     ('Fährmann in vierter Generation an der Furt, inzwischen mit eigenem Lagerhaus.', 'Eine Brücke bauen, damit seine Kinder nicht im Fluss ertrinken wie sein Bruder.', 'Hochwasser im Frühjahr.', 'Er weiß, wer nachts mit verhüllten Karren über die Furt nach Norden fährt – und schweigt dafür.', 'Kennt jeden Reisenden, kann rechnen, verlässlich.', 'Geizig, misstraut Fremden, hängt an alten Rechten.', 'Zählt beim Reden unbewusst Münzen in der Tasche.', 1)),
    ('Hedda', 'Wirt', 1, {'mut': 70, 'gier': 40, 'treue': 65, 'fleiss': 80, 'geselligkeit': 90},
     ('Witwe, führt den Furtkrug seit zwanzig Jahren allein.', 'Dass ihr Sohn aus dem Dienst bei Graf Wulfhard zurückkommt.', 'Einen Brief mit schwarzem Siegel zu bekommen.', 'Sie versteckt im Keller einen Deserteur aus Rabenfels.', 'Herzlich, hört alles, hat Freunde überall.', 'Mischt sich ein, trägt Groll lange.', 'Nennt jeden Gast nach seinem Lieblingsgetränk statt nach seinem Namen.', 0)),
    ('Ilsabe', 'Kräuterfrau', 1, {'mut': 35, 'gier': 30, 'treue': 55, 'fleiss': 70, 'geselligkeit': 25},
     ('Ist vor Jahren aus dem Nebelmoor gekommen und verkauft auf dem Markt Kräuter und Salben.', 'Ein Mittel gegen das Sumpffieber finden.', 'Als Hexe verbrannt zu werden wie ihre Lehrmeisterin.', 'Ihr Fiebertrank wirkt – aber nur, weil eine Zutat aus einem Grab stammt.', 'Kennt jede Pflanze, geduldig, geschickte Hände.', 'Scheu, verschlossen, erträgt keine Menschenmengen.', 'Riecht an allem, bevor sie es anfasst.', 1)),
  ],
  'hollerbrueck': [
    ('Anselm', 'Müller', 0, {'mut': 30, 'gier': 65, 'treue': 50, 'fleiss': 85, 'geselligkeit': 45},
     ('Erbte die Mühle an der Brücke von seinem Schwiegervater.', 'Dass das Dorf ihn endlich respektiert statt nur zu brauchen.', 'Dass seine Frau herausfindet, wie viel Schulden er hat.', 'Er mahlt Getreide aus Goldacker zu und verkauft es als eigenes – mit gestrecktem Mehl.', 'Fleißig, kennt jeden Bauern, guter Rechner.', 'Ängstlich, neidisch, redet hinter Rücken.', 'Klopft sich ständig Mehl von der Jacke, auch wenn keins da ist.', 1)),
    ('Kordula', 'Wache', 1, {'mut': 85, 'gier': 20, 'treue': 90, 'fleiss': 70, 'geselligkeit': 40},
     ('Ehemalige Söldnerin, bewacht seit dem Brückenzoll-Streit die Hollerbrücke.', 'Dass niemand mehr an dieser Brücke stirbt.', 'Ihre eigene Wut.', 'Sie hat vor Jahren den Mann getötet, dessen Witwe ihr jeden Morgen Brot bringt.', 'Furchtlos, gerecht, wachsam.', 'Hart, wortkarg, verzeiht sich selbst nichts.', 'Streicht vor jeder Antwort mit dem Daumen über die Narbe am Kinn.', 2)),
    ('Tönnies', 'Hirte', 0, {'mut': 50, 'gier': 15, 'treue': 60, 'fleiss': 45, 'geselligkeit': 75},
     ('Hütet die Schafe von halb Hollerbrück auf den Hängen über dem Fluss.', 'Einmal das Meer sehen.', 'Die Stille nach einem Wolfsangriff.', 'Er hat gesehen, wer die Grenzsteine zwischen Hollerbrück und Ginsterhof versetzt hat.', 'Ruhig, beobachtet genau, Tiere vertrauen ihm.', 'Träumer, verpasst Termine, glaubt an Zeichen.', 'Pfeift Melodien, die er sich selbst ausgedacht hat, und gibt ihnen Namen.', -1)),
  ],
  'rabenfels': [
    ('Ragnolf', 'Hauptmann', 0, {'mut': 75, 'gier': 70, 'treue': 40, 'fleiss': 80, 'geselligkeit': 35},
     ('Burgvogt von Rabenfels, rechte Hand von Graf Wulfhard seit dessen Jugend.', 'Dass Rabenfels nie wieder vor Moosherz das Knie beugt.', 'Dass der Graf ihn eines Tages für einen Jüngeren ersetzt.', 'Er plant ohne Wissen des Grafen einen Anschlag am Hof von Moosherz.', 'Klug, entschlossen, hervorragender Taktiker.', 'Kalt, rachsüchtig, hält Mitleid für Dummheit.', 'Spricht leise, sodass sich jeder vorbeugen muss.', 2)),
    ('Wiebke', 'Magd', 1, {'mut': 45, 'gier': 25, 'treue': 50, 'fleiss': 90, 'geselligkeit': 55},
     ('Küchenmagd auf der Burg, aufgewachsen im Dorf unter dem Felsen.', 'Mit ihrem Liebsten, einem Stallknecht, fortgehen.', 'Dass jemand erfährt, was sie in der Küche gehört hat.', 'Sie hat den Vogt nachts mit einem Fremden mit Rabenring reden hören.', 'Unauffällig, flink, kennt jeden Gang der Burg.', 'Ängstlich gegenüber Mächtigen, plappert, wenn sie nervös ist.', 'Wischt sich die Hände an der Schürze ab, auch wenn sie sauber sind.', -1)),
    ('Severin', 'Priesterin', 0, {'mut': 35, 'gier': 20, 'treue': 70, 'fleiss': 60, 'geselligkeit': 50},
     ('Burgkaplan, kam aus dem Kloster Morgenstern auf den Felsen.', 'Den Grafen zu einem gerechten Herrscher machen.', 'Dass er selbst zu feige ist, das Richtige zu tun.', 'Er hat dem Vogt die Beichte abgenommen – und weiß von dem Plan.', 'Gebildet, sanft, findet die richtigen Worte.', 'Zaudernd, gibt Mächtigen zu oft nach.', 'Zitiert alte Sprüche und vergisst dann, wie sie enden.', 0)),
  ],
}
NAMELESS = {
  'moosherz': [('Gunzelin', 'Händler', 0), ('Ermengard', 'Wäscherin', 1), ('Hademar', 'Wache', 0), ('Reinhild', 'Schankmaid', 1), ('Isenbart', 'Schmied', 0), ('Wolfhild', 'Bäuerin', 1)],
  'furtenau': [('Bernward', 'Bauer', 0), ('Gerberga', 'Wäscherin', 1), ('Liudolf', 'Händler', 0), ('Adalind', 'Schankmaid', 1)],
  'hollerbrueck': [('Ekkehard', 'Bauer', 0), ('Hildegund', 'Bäuerin', 1), ('Volkwin', 'Holzfäller', 0)],
  'rabenfels': [('Ortwin', 'Wache', 0), ('Sigmar', 'Wache', 0), ('Mathild', 'Wäscherin', 1), ('Gunthram', 'Stallbursche', 0), ('Waltraud', 'Magd', 1)],
}
def q(s): return "'" + s.replace("'", "''") + "'"
import json as _json
lines = ["do $n$ declare nid bigint; begin"]
for ort, people in TOWNS.items():
    lines.append(f"  if not exists (select 1 from npcs where welt_ort = {q(ort)}) then")
    for name, job, w, tr, prof in people:
        her, ziel, angst, geh, st, sw, eig, stur = prof
        lines.append(f"    nid := npc_neu_welt({q(ort)}, {q(name)}, {q(job)}, {w}, false, {q(_json.dumps(tr))}::jsonb);")
        lines.append(f"    insert into npc_profiles (npc_id, herkunft, ziel, angst, geheimnis, staerken, schwaechen, eigenart, sturheit, wissen) values (nid, {q(her)}, {q(ziel)}, {q(angst)}, {q(geh)}, {q(st)}, {q(sw)}, {q(eig)}, {stur}, '{{}}') on conflict (npc_id) do nothing;")
    for name, job, w in NAMELESS[ort]:
        lines.append(f"    perform npc_neu_welt({q(ort)}, {q(name)}, {q(job)}, {w}, true);")
    lines.append("  end if;")
lines.append("end $n$;\n")
A('\n'.join(lines))

# ───────────── KI-Nachschub (Datenbankseite) ─────────────
A("""
create or replace function public.quest_nachschub_bedarf(p_uid uuid) returns json language plpgsql stable security definer set search_path = public as $$
declare offen int; heute boolean; n int;
begin
  select count(*) into offen from quest_templates t
   where t.art = 'haupt' and t.fundort is null and (t.owner_id is null or t.owner_id = p_uid)
     and (not (t.voraussetzung ? 'wissen') or exists (select 1 from player_journal j where j.player_id = p_uid and j.key = t.voraussetzung->>'wissen'))
     and not exists (select 1 from quest_runs q where q.player_id = p_uid and q.quest_id = t.id and q.status in ('fertig', 'laeuft'));
  select exists (select 1 from quest_templates where owner_id = p_uid and erstellt_at >= (berlin_day()::timestamp at time zone 'Europe/Berlin')) into heute;
  select count(*) into n from quest_templates where owner_id = p_uid;
  return json_build_object('offen', offen, 'noetig', offen <= 2 and not heute, 'schreibt', exists (select 1 from quest_templates where owner_id = p_uid and art = 'entwurf' and erstellt_at > now() - interval '10 minutes'),
    'art', (array['ueberzeugen', 'kampf', 'denken'])[1 + n % 3]);
end $$;

create or replace function public.quest_nachschub_context(p_token text) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b json; v villages; me record; tid text; art text; thema text;
begin
  if not fn_token_ok(p_token) then raise exception 'Nicht erlaubt'; end if;
  b := quest_nachschub_bedarf(uid);
  if not (b->>'noetig')::boolean then raise exception 'Kein Nachschub nötig'; end if;
  art := b->>'art';
  thema := case art
    when 'kampf' then (array['Ein Söldnertrupp hat sich an einem Wegkreuz eingenistet und verlangt Wegzoll – aber einer von ihnen stammt aus dem Dorf.',
                             'Etwas reißt nachts Vieh. Die Leute reden von einem Ungeheuer, die Spuren erzählen etwas anderes.',
                             'Räuber haben eine Tochter des Dorfes verschleppt; die Familie will zahlen, der Dorfrat will kämpfen.',
                             'Eine alte Fehde zwischen zwei Familien eskaliert – beide bitten den Helden, auf ihrer Seite zu stehen.'])[1 + floor(random() * 4)::int]
    when 'denken' then (array['Ein Testament, das zwei Erben begünstigt, und ein Siegel, das nicht passt.',
                              'Eine Krankheit trifft nur eine einzige Familie – Zufall, Fluch oder Gift?',
                              'Aus dem Kornspeicher verschwindet jede Nacht ein wenig, obwohl die Tür verriegelt bleibt.',
                              'Ein Fremder behauptet, der verschollene Sohn einer Bewohnerin zu sein, und weiß Dinge, die nur er wissen kann.'])[1 + floor(random() * 4)::int]
    else (array['Ein Wanderprediger hetzt gegen Fremde, und die Leute hören ihm zu, weil er in manchem recht hat.',
                'Ein Bewohner will das Dorf verlassen und einen anderen mitnehmen, der eigentlich gebraucht wird.',
                'Ein Dieb wird gefasst, der aus Not gestohlen hat; das Opfer verlangt eine harte Strafe.',
                'Zwei Bewohner streiten über eine Schuld von früher. Beide erzählen die Wahrheit – aber nur ihre.'])[1 + floor(random() * 4)::int]
  end;
  tid := 'n_' || substr(md5(uid::text || clock_timestamp()::text), 1, 12);
  insert into quest_templates (id, titel, beschreibung, kurz, art, schwierigkeit, rollen, def, owner_id) values (tid, 'Eine neue Geschichte', thema, thema, 'entwurf', 2, '{}', '{}', uid);
  select * into v from villages where owner_id = uid;
  select character_name, race, coalesce(herkunft, 'waldlaeufer') herkunft into me from profiles where id = uid;
  return json_build_object('tid', tid, 'art', art, 'thema', thema,
    'held', json_build_object('name', me.character_name, 'volk', me.race, 'herkunft', me.herkunft, 'eigenschaften', char_attrs(me.race, me.herkunft)),
    'dorf', v.name,
    'bewohner', (select coalesce(json_agg(json_build_object('id', n.id, 'name', n.name, 'beruf', n.job, 'stimmung_zum_helden', npc_stimmung(coalesce(rel.sympathy, 0)),
        'ziel', pr.ziel, 'angst', pr.angst, 'eigenart', pr.eigenart, 'staerken', pr.staerken, 'schwaechen', pr.schwaechen)), '[]'::json)
      from npcs n left join npc_profiles pr on pr.npc_id = n.id left join npc_relations rel on rel.npc_id = n.id and rel.player_id = uid
      where n.village_id = v.id and not n.namenlos and n.tot_at is null),
    'chronik', (select coalesce(json_agg(c.text), '[]'::json) from (select text from chronicle where player_id = uid order by created_at desc limit 10) c),
    'tagebuch', (select coalesce(json_agg(j.title), '[]'::json) from (select title from player_journal where player_id = uid order by created_at desc limit 12) j),
    'bisher', (select coalesce(json_agg(t.titel), '[]'::json) from quest_templates t where t.owner_id = uid and t.art = 'haupt'));
end $$;

create or replace function public.quest_nachschub_install(p_token text, p_tid text, p_titel text, p_beschreibung text, p_def jsonb, p_rollen jsonb, p_rollen_namen jsonb) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v villages; k text; val jsonb; rol jsonb := '{}'::jsonb;
begin
  if not fn_token_ok(p_token) then raise exception 'Nicht erlaubt'; end if;
  if not exists (select 1 from quest_templates where id = p_tid and owner_id = uid and art = 'entwurf') then raise exception 'Unbekannter Entwurf'; end if;
  select * into v from villages where owner_id = uid;
  for k, val in select * from jsonb_each(coalesce(p_rollen, '{}'::jsonb)) loop
    if k in ('A', 'B', 'C') then
      select rol || jsonb_build_object(k, jsonb_build_object('id', n.id, 'name', n.name, 'beruf', n.job)) into rol from npcs n where n.id = (val #>> '{}')::bigint and n.village_id = v.id;
    end if;
  end loop;
  update quest_templates set titel = left(coalesce(nullif(p_titel, ''), 'Eine neue Geschichte'), 80), beschreibung = left(coalesce(nullif(p_beschreibung, ''), beschreibung), 400),
    art = 'haupt', rollen = coalesce(p_rollen_namen, '{}'::jsonb), def = p_def || jsonb_build_object('feste_rollen', rol) where id = p_tid;
  return json_build_object('ok', true, 'id', p_tid);
end $$;

create or replace function public.quest_nachschub_fail(p_token text, p_tid text) returns void language sql security definer set search_path = public as $$
  update quest_templates set art = 'verworfen' where id = p_tid and owner_id = auth.uid() and art = 'entwurf' and fn_token_ok(p_token);
$$;
""")

# ───────────── Bestehende Funktionen anpassen ─────────────
# q_enter: Wegstrecke mitzählen, Rückweg-Wahl am Ende
patch('q_enter(bigint,text)', [
  ("update quest_runs set szene = p_szene, updated_at = now(),",
   "update quest_runs set szene = p_szene, updated_at = now(), flags = case when sz ? 'reise' then jsonb_set(flags, '{gelaufen}', to_jsonb(coalesce((flags->>'gelaufen')::numeric, 0) + coalesce((sz->'reise'->>'minuten')::numeric, 0))) else flags end,"),
  ("update quest_runs set status = 'fertig' where id = p_run;",
   "update quest_runs set status = 'fertig' where id = p_run; update quest_runs set heimweg_offen = coalesce(q_heimweg_noetig(p_run, p_szene), false) where id = p_run;"),
])
# quest_choose: Entscheidungen mitschreiben, Übung bei Proben
patch('quest_choose(bigint,integer)', [
  ("  select * into r from quest_runs where id = p_run;\n  txt := q_fill(",
   "  update quest_runs set flags = jsonb_set(flags, '{wege}', coalesce(flags->'wege', '[]'::jsonb) || to_jsonb(q_fill(o->>'text', ctx))) where id = p_run;\n  if o ? 'probe' then perform fert_xp(r.player_id, o->'probe'->>'id', 0.3); end if;\n  select * into r from quest_runs where id = p_run;\n  txt := q_fill("),
])
# q_apply: Ertrag mitschreiben
patch('q_apply(bigint,jsonb)', [
  ("  return trim(out);\nend;",
   "  if trim(out) <> '' then update quest_runs set flags = jsonb_set(flags, '{ertrag}', coalesce(flags->'ertrag', '[]'::jsonb) || to_jsonb(trim(out))) where id = r.id; end if;\n  return trim(out);\nend;"),
])
# q_mods: Fertigkeit (Übung) zählt bei Proben
patch('q_mods(quest_runs,jsonb)', [
  ("'wunde', wund, 'dc', dc, 'summe', md + bonus + items_b + beg + wund)",
   "'wunde', wund, 'uebung', fert_bonus(p_run.player_id, pr->>'id'), 'dc', dc, 'summe', md + bonus + items_b + beg + wund + fert_bonus(p_run.player_id, pr->>'id'))"),
])
# quest_view: Reisezeit an Optionen, Rückweg-Wahl und Zusammenfassung am Ende
patch('quest_view(bigint)', [
  ("'hint', case when m is not null then q_odds((m->>'dc')::int - (m->>'summe')::int) end);",
   "'hint', case when m is not null then q_odds((m->>'dc')::int - (m->>'summe')::int) end,\n          'reise_min', (select (t.def->'szenen'->x->'reise'->>'minuten')::numeric from (select coalesce(o->>'weiter', o->'erfolg'->>'weiter') x) y where (t.def->'szenen'->x->'reise'->>'minuten')::numeric >= 20));"),
  ("'ende', coalesce((sz->>'ende')::boolean, false));",
   "'ende', coalesce((sz->>'ende')::boolean, false),\n    'heimweg', case when r.heimweg_offen then q_heimweg_info(r.id) end,\n    'abschluss', case when coalesce((sz->>'ende')::boolean, false) then q_abschluss(r.id) end);"),
])
# quest_start: Ortsquests (am Ort), feste Rollen (KI-Nachschub), nur eigene Vorlagen, beschäftigt?
patch('quest_start(text,bigint[])', [
  ("  perform ensure_starter_items(auth.uid());",
   "  perform ensure_starter_items(auth.uid()); perform pruefe_frei();"),
  ("  select * into t from quest_templates where id = p_quest; if not found then raise exception 'Unbekannte Quest'; end if;",
   "  select * into t from quest_templates where id = p_quest and art = 'haupt' and (owner_id is null or owner_id = auth.uid()); if not found then raise exception 'Unbekannte Quest'; end if;\n  if t.fundort is null then perform pruefe_im_dorf();\n  elsif spieler_ort_jetzt(auth.uid()) is null or not (spieler_ort_jetzt(auth.uid()) = t.fundort or (t.fundort = 'spielerdorf' and spieler_ort_jetzt(auth.uid()) <> heim_ort(auth.uid()) and exists (select 1 from welt_orte o join villages vv on vv.id = o.village_id where o.id = spieler_ort_jetzt(auth.uid()) and vv.owner_id is not null))) then raise exception 'Diese Geschichte beginnt woanders.';\n  elsif coalesce(array_length(p_begleiter, 1), 0) > 0 then raise exception 'Deine Begleiter sind daheim geblieben.'; end if;"),
  ("insert into quest_runs (player_id, quest_id, szene, begleiter) values (auth.uid(), t.id, t.def->>'start', p_begleiter) returning id into rid;",
   "insert into quest_runs (player_id, quest_id, szene, begleiter, rollen, flags) values (auth.uid(), t.id, t.def->>'start', p_begleiter, coalesce(t.def->'feste_rollen', '{}'::jsonb), case when t.fundort is not null then jsonb_build_object('start_ort', spieler_ort_jetzt(auth.uid())) else '{}'::jsonb end) returning id into rid;"),
])
patch('quest_take(bigint,bigint[])', [], inject_after_begin="perform pruefe_im_dorf(); perform pruefe_frei();")
patch('quest_custom_start(text,bigint[])', [], inject_after_begin="perform pruefe_im_dorf(); perform pruefe_frei();")
patch('chronik_start(bigint[])', [], inject_after_begin="perform pruefe_im_dorf(); perform pruefe_frei();")
patch('erkunden_start()', [], inject_after_begin="perform pruefe_frei();")
patch('tagwerk_fertig(bigint,boolean)', [], inject_after_begin="perform pruefe_frei();")
patch('dorf_mithelfen()', [], inject_after_begin="perform pruefe_frei();")
# Geschäfte nur mit Leuten aus dem eigenen Dorf
patch('create_deal(bigint,text)', [
  ("  select * into v from villages where owner_id = auth.uid(); select * into n from npcs where id = p_npc; select * into t from deal_templates where id = p_vorlage;",
   "  select * into v from villages where owner_id = auth.uid(); select * into n from npcs where id = p_npc; select * into t from deal_templates where id = p_vorlage;\n  if n.village_id is distinct from v.id then raise exception 'Abmachungen triffst du nur mit Leuten aus deinem Dorf.'; end if;"),
])
patch('get_npc_brief(bigint)', [
  ("'auftrag_optionen', deal_options(p_npc),",
   "'auftrag_optionen', case when (select village_id from npcs where id = p_npc) = vid then deal_options(p_npc) else '[]'::json end, 'wohnort', npc_wohnort(p_npc), 'fremd', (select village_id from npcs where id = p_npc) is distinct from vid,"),
])
patch('get_npc_context(bigint)', [
  ("'npc', json_build_object('name', n.name, 'beruf', n.job,",
   "'npc', json_build_object('name', n.name, 'beruf', n.job, 'wohnort', npc_wohnort(n.id), 'fremd_fuer_den_helden', n.village_id is distinct from (select id from villages where owner_id = v_uid),"),
])
# talk_to_npc (ältere Überladung): gleiche Erreichbarkeits-Regel
patch('talk_to_npc(bigint,text,text)', [
  ("  if n.village_id is not null and not exists (select 1 from villages where id = n.village_id and owner_id = v_uid) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;",
   "  if not npc_reachable(p_npc) then raise exception 'Diese Person ist gerade nicht hier'; end if;"),
])
# quest_list: nur eigene + allgemeine Geschichten, ohne Ortsquests; Nachschub-Info
patch('quest_list()', [
  ("from quest_templates t where t.art = 'haupt'),",
   "from quest_templates t where t.art = 'haupt' and t.fundort is null and (t.owner_id is null or t.owner_id = auth.uid())),\n    'nachschub', quest_nachschub_bedarf(auth.uid()),"),
])
# Kampf: Waffenübung macht zäher
patch('kampf_werte()', [
  ("'bauten', bauten,", "'bauten', bauten, 'uebung', fert_stufe(coalesce((select xp from fertigkeiten where player_id = uid and id = 'kampf'), 0)),"),
])

# welt_spieler: Position für alle Zustände
A("""
create or replace function public.welt_spieler(p_uid uuid, p_ort text, p_ich boolean)
 returns json language plpgsql stable security definer set search_path = public as $$
declare q record; t numeric; dist numeric; seed numeric; l json; a welt_orte; b welt_orte; nm text;
begin
  nm := (select character_name from profiles where id = p_uid);
  l := spieler_lage(p_uid);
  if l->>'zustand' = 'weg' then
    select * into a from welt_orte where id = l->>'von'; select * into b from welt_orte where id = l->>'nach';
    t := least(1, greatest(0, extract(epoch from (now() - (l->>'ab')::timestamptz)) / greatest(60, extract(epoch from ((l->>'bis')::timestamptz - (l->>'ab')::timestamptz)))));
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', json_build_object('titel', 'Auf dem Weg nach ' || b.name, 'art', 'weg', 'reist', true, 'bis', l->>'bis', 't', round(t, 3),
      'pos', json_build_object('x', round(a.x + (b.x - a.x) * t), 'y', round(a.y + (b.y - a.y) * t))));
  elsif l->>'zustand' = 'ort' then
    select * into b from welt_orte where id = l->>'ort';
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', json_build_object('titel', 'In ' || b.name, 'art', 'ort', 'reist', false, 'pos', json_build_object('x', b.x + 18, 'y', b.y + 26), 'ort_id', b.id));
  elsif l->>'zustand' = 'wahl' and l->>'ort' is not null then
    select * into b from welt_orte where id = l->>'ort';
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', json_build_object('titel', l->>'titel', 'art', 'wahl', 'reist', false, 'pos', json_build_object('x', b.x + 18, 'y', b.y + 26)));
  end if;
  select r.id, r.szene, r.warte_bis, r.updated_at, tp.titel, tp.art, coalesce(tp.schwierigkeit, 1) sw, tp.def->'szenen'->r.szene->>'ort' ort, tp.def->>'ziel' ziel, coalesce(tp.def->'heim', '[]'::jsonb) ? r.szene daheim, r.flags->>'start_ort' start_ort into q
    from quest_runs r join quest_templates tp on tp.id = r.quest_id where r.player_id = p_uid and (r.status = 'laeuft' or (r.status = 'fertig' and r.heimweg_offen)) order by r.status = 'laeuft' desc, q_nebenbei(r.quest_id), r.id desc limit 1;
  if q.id is null then
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', null);
  end if;
  if q.start_ort is not null then
    select * into b from welt_orte where id = q.start_ort;
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', json_build_object('titel', q.titel, 'art', q.art, 'reist', q.warte_bis is not null and q.warte_bis > now(), 'pos', json_build_object('x', b.x + 30, 'y', b.y - 20)));
  end if;
  t := case when q.warte_bis is not null and q.warte_bis > now() then 0.1 + 0.85 * least(1, greatest(0, extract(epoch from (now() - q.updated_at)) / greatest(60, extract(epoch from (q.warte_bis - q.updated_at))))) else 1 end;
  seed := ((q.id * 2654435761) % 10007) / 10007.0;
  dist := case q.art when 'erkundung' then 70 + seed * 80 when 'chronik' then 0 + seed * 40 when 'haupt' then 220 + seed * 160 when 'ki' then 200 + seed * 220
    else case q.sw when 1 then 150 + seed * 120 when 2 then 260 + seed * 170 else 420 + seed * 300 end end;
  return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort,
    'unterwegs', json_build_object('titel', q.titel, 'art', q.art, 'ziel_art', coalesce(q.ort, 'wald'), 'ziel_ort', q.ziel, 'daheim', q.daheim, 't', round(t, 3), 'seed', round(seed, 4), 'dist', round(dist), 'reist', q.warte_bis is not null and q.warte_bis > now(), 'bis', q.warte_bis));
end $$;
""")

# Rechte
A("""
revoke execute on function public.heim_ort(uuid), public.reise_minuten(text, text), public.besuchbar(text), public.q_endort(bigint), public.spieler_lage(uuid), public.spieler_ort_jetzt(uuid),
  public.q_heimweg_noetig(bigint, text), public.q_heimweg_info(bigint), public.q_abschluss(bigint), public.fert_bonus(uuid, text), public.fert_xp(uuid, text, numeric),
  public.beschaeftigung_abschluss(uuid, boolean), public.npc_neu_welt(text, text, text, int, boolean, jsonb), public.npc_wohnort(bigint), public.quest_nachschub_bedarf(uuid),
  public.ort_name(text), public.fert_stufe(numeric), public.welt_spieler(uuid, text, boolean), public.spieler_unterwegs(uuid) from public, anon, authenticated;
revoke execute on function public.pruefe_frei(), public.npc_reachable(bigint), public.pruefe_im_dorf(bigint) from public, anon;
revoke execute on function public.reise_ziele(), public.reise_start(text), public.quest_heimweg(bigint, text), public.quest_dauer(text), public.beschaeftigung_status(), public.beschaeftigung_start(text, int),
  public.beschaeftigung_abbrechen(), public.ort_besuch(), public.quest_nachschub_context(text), public.quest_nachschub_install(text, text, text, text, jsonb, jsonb, jsonb), public.quest_nachschub_fail(text, text) from public, anon;
grant execute on function public.reise_ziele(), public.reise_start(text), public.quest_heimweg(bigint, text), public.quest_dauer(text), public.beschaeftigung_status(), public.beschaeftigung_start(text, int),
  public.beschaeftigung_abbrechen(), public.ort_besuch(), public.quest_nachschub_context(text), public.quest_nachschub_install(text, text, text, text, jsonb, jsonb, jsonb), public.quest_nachschub_fail(text, text) to authenticated;
""")

OUT.write_text('-- 036: Reisen zwischen Orten, Rückweg nach Quests, Ortsbesuche, Beschäftigung und Fertigkeiten, KI-Nachschub (erzeugt von tools/m036.py)\n' + '\n'.join(parts))
print(OUT, OUT.stat().st_size)
