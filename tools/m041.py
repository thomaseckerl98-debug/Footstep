# Erzeugt migrations/041_wege_rang_diplomatie.sql
# Kürzere Wege (ganze Karte ≈ 4 Std.), genaue Position während Quests, Heimweg nur wenn man wirklich draußen ist,
# Abbrechen führt zu Fuß heim, Ansehen für Welt-/Ortsquests, Rätsel ohne Sackgasse, Rangliste der Dörfer,
# Diplomatie in Stufen −10…+10 (Menschen und Orte).
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from m036 import patch, parts as _p
OUT = pathlib.Path(__file__).resolve().parent.parent / 'migrations' / '041_wege_rang_diplomatie.sql'
_p.clear(); A = _p.append

A(r"""
alter table public.profiles add column if not exists weg_pos jsonb;
alter table public.profiles add column if not exists ruhm int not null default 0;

-- ───────── Wege: 4000 Kartenschritte ≈ 4 Stunden (vorher ≈ 24 Stunden) ─────────
create or replace function public.reise_minuten(p_von text, p_nach text) returns integer language sql stable security definer set search_path = public as $$
  select greatest(10, round(sqrt(power(a.x - b.x, 2) + power(a.y - b.y, 2)) / 4000.0 * 240))::int from welt_orte a, welt_orte b where a.id = p_von and b.id = p_nach;
$$;
-- Reisezeiten in Quest-Texten wurden für den alten Maßstab geschrieben → gleicher Faktor (1/6)
create or replace function public.q_reise_min(p_raw numeric) returns int language sql immutable as $$
  select case when coalesce(p_raw, 0) <= 0 then 0 else greatest(5, round(p_raw / 6.0))::int end;
$$;
-- Wie weit (in Gehminuten) ist der Spieler in dieser Quest gerade vom Dorf entfernt?
create or replace function public.q_draussen(p_run bigint) returns numeric language sql stable security definer set search_path = public as $$
  select case when r.flags ? 'draussen' then (r.flags->>'draussen')::numeric
              when t.def->'szenen'->r.szene->>'ort' = 'dorf' then 0
              else round(coalesce((r.flags->>'gelaufen')::numeric, 0) / 12.0) end
  from quest_runs r join quest_templates t on t.id = r.quest_id where r.id = p_run;
$$;
-- Tatsächliche Dauer einer Reise-Szene: heimwärts genau die Strecke, die man draußen ist
create or replace function public.q_reise_eff(p_run bigint, p_szene text) returns int language plpgsql stable security definer set search_path = public as $$
declare r quest_runs; sz jsonb; zo text; d numeric;
begin
  select * into r from quest_runs where id = p_run;
  sz := (select def->'szenen'->p_szene from quest_templates where id = r.quest_id);
  if sz is null or not sz ? 'reise' then return null; end if;
  zo := (select def->'szenen'->(sz->'reise'->>'weiter')->>'ort' from quest_templates where id = r.quest_id);
  d := q_draussen(p_run);
  if zo = 'dorf' and r.flags->>'start_ort' is null and d > 0 then return greatest(5, round(d))::int; end if;
  return q_reise_min((sz->'reise'->>'minuten')::numeric);
end $$;

create or replace function public.q_enter(p_run bigint, p_szene text) returns text language plpgsql security definer set search_path = public as $$
declare r quest_runs; sz jsonb; extra text := ''; m int; d numeric; zo text;
begin
  select * into r from quest_runs where id = p_run; sz := (select def->'szenen'->p_szene from quest_templates where id = r.quest_id);
  if sz is null then raise exception 'Szene fehlt: %', p_szene; end if;
  d := q_draussen(p_run);
  if sz ? 'reise' then
    m := q_reise_eff(p_run, p_szene);
    zo := (select def->'szenen'->(sz->'reise'->>'weiter')->>'ort' from quest_templates where id = r.quest_id);
    update quest_runs set szene = p_szene, updated_at = now(), warte_bis = now() + make_interval(mins => m),
      flags = flags || jsonb_build_object('gelaufen', coalesce((flags->>'gelaufen')::numeric, 0) + m, 'pos_von', d,
                                          'draussen', case when zo = 'dorf' and flags->>'start_ort' is null then 0 else d + m end)
      where id = p_run;
  else
    update quest_runs set szene = p_szene, updated_at = now(), warte_bis = null,
      flags = case when sz->>'ort' = 'dorf' and flags->>'start_ort' is null then flags || '{"draussen": 0}'::jsonb
                   when not flags ? 'draussen' then flags || jsonb_build_object('draussen', d) else flags end
      where id = p_run;
  end if;
  if coalesce((sz->>'ende')::boolean, false) then
    extra := q_apply(p_run, sz->'folgen'); update quest_runs set status = 'fertig' where id = p_run; update quest_runs set heimweg_offen = coalesce(q_heimweg_noetig(p_run, p_szene), false) where id = p_run;
    update quest_offers set status = 'erledigt' where run_id = p_run;
  end if;
  return extra;
end $$;

-- Heimweg nur, wenn man am Ende wirklich nicht daheim ist
create or replace function public.q_heimweg_noetig(p_run bigint, p_szene text) returns boolean language sql stable security definer set search_path = public as $$
  select not (coalesce(t.def->'heim', '[]'::jsonb) ? p_szene) and t.art <> 'erkundung' and not q_nebenbei(t.id)
     and (case when q_endort(r.id) is not null then q_endort(r.id) <> coalesce(heim_ort(r.player_id), '')
               else coalesce(t.def->'szenen'->p_szene->>'ort', '') <> 'dorf' and q_draussen(r.id) >= 10 end)
  from quest_runs r join quest_templates t on t.id = r.quest_id where r.id = p_run;
$$;

create or replace function public.q_heimweg_info(p_run bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare r quest_runs; von text; heim text; hm int; d numeric;
begin
  select * into r from quest_runs where id = p_run;
  heim := heim_ort(r.player_id); von := q_endort(p_run); d := q_draussen(p_run);
  hm := case when von is null then greatest(5, round(d))::int when von = heim then 0 else reise_minuten(von, heim) end;
  return json_build_object('von', von, 'von_name', ort_name(von), 'heim', json_build_object('id', heim, 'name', ort_name(heim), 'minuten', hm),
    'hier', case when von is not null and von <> heim then json_build_object('id', von, 'name', ort_name(von)) end,
    'weiter', (select coalesce(json_agg(json_build_object('id', o.id, 'name', o.name, 'art', o.art, 'minuten', m) order by m), '[]'::json)
               from (select o.*, case when von is null then reise_minuten(heim, o.id) + greatest(5, round(d))::int else reise_minuten(von, o.id) end m
                     from welt_orte o where besuchbar(o.id) and o.id is distinct from heim and o.id is distinct from von) o));
end $$;

-- Ungefähre Kartenposition eines Spielers, der irgendwo „draußen“ in einer Quest ist
create or replace function public.q_pos(p_run bigint, p_d numeric) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r quest_runs; a welt_orte; b welt_orte; seed numeric; ang numeric; u numeric; zz text;
begin
  select * into r from quest_runs where id = p_run;
  select * into a from welt_orte where id = coalesce(r.flags->>'start_ort', heim_ort(r.player_id));
  if a.id is null then return null; end if;
  zz := (select t.def->>'ziel' from quest_templates t where t.id = r.quest_id);
  select * into b from welt_orte where id = zz;
  if b.id is not null then
    u := least(1, p_d / greatest(1, reise_minuten(a.id, b.id)));
    return jsonb_build_object('x', round(a.x + (b.x - a.x) * u), 'y', round(a.y + (b.y - a.y) * u));
  end if;
  seed := ((r.id * 2654435761) % 10007) / 10007.0; ang := seed * 2 * pi(); u := p_d * 4000.0 / 240;
  return jsonb_build_object('x', round(least(3760, greatest(440, a.x + cos(ang) * u))), 'y', round(least(2740, greatest(470, a.y + sin(ang) * u * 0.8))));
end $$;

create or replace function public.quest_heimweg(p_run bigint, p_ziel text) returns json language plpgsql security definer set search_path = public as $$
declare r quest_runs; von text; heim text; ziel text; m int; d numeric; uid uuid := auth.uid();
begin
  select * into r from quest_runs where id = p_run and player_id = uid and status = 'fertig' and heimweg_offen for update;
  if not found then raise exception 'Hier gibt es keinen Weg zu wählen.'; end if;
  heim := heim_ort(uid); von := q_endort(r.id); d := q_draussen(r.id);
  if p_ziel = 'hier' then
    if von is null or von = heim then raise exception 'Hier ist kein Ort zum Bleiben.'; end if;
    update profiles set aufenthalt = von, weg_von = null, weg_ab = null, weg_bis = null, weg_pos = null where id = uid; ziel := von; m := 0;
  else
    ziel := case when p_ziel = 'heim' then heim else p_ziel end;
    if ziel is distinct from heim and not besuchbar(ziel) then raise exception 'Dorthin führt kein Weg.'; end if;
    m := case when von is null then case when ziel = heim then greatest(5, round(d))::int else reise_minuten(heim, ziel) + greatest(5, round(d))::int end
              when von = ziel then 0 else reise_minuten(von, ziel) end;
    update profiles set aufenthalt = case when ziel = heim then null else ziel end, weg_von = coalesce(von, heim), weg_ab = now(),
      weg_bis = case when m > 0 then now() + make_interval(mins => m) end,
      weg_pos = case when von is null then q_pos(r.id, d) end where id = uid;
  end if;
  update quest_runs set heimweg_offen = false where id = r.id;
  return json_build_object('ok', true, 'ziel', ziel, 'ziel_name', ort_name(ziel), 'minuten', m, 'ankunft', now() + make_interval(mins => m), 'daheim', ziel = heim);
end $$;

-- Abbrechen: wer draußen ist, muss zu Fuß heim (keine Abkürzung mehr)
create or replace function public.quest_abort(p_run bigint) returns json language plpgsql security definer set search_path = public as $$
declare r quest_runs; t quest_templates; uid uuid := auth.uid(); heim text; von text; d numeric; m int := 0;
begin
  select * into r from quest_runs where id = p_run and player_id = uid and status = 'laeuft' for update;
  if not found then return json_build_object('ok', true); end if;
  select * into t from quest_templates where id = r.quest_id;
  heim := heim_ort(uid); von := q_endort(r.id); d := q_draussen(r.id);
  -- Steckt man mitten in einer Reise, zählt der Teil der Strecke, der schon geschafft ist
  if r.warte_bis is not null and r.warte_bis > now() and r.flags ? 'pos_von' then
    d := (r.flags->>'pos_von')::numeric + ((r.flags->>'draussen')::numeric - (r.flags->>'pos_von')::numeric)
         * least(1, greatest(0, extract(epoch from (now() - r.updated_at)) / greatest(60, extract(epoch from (r.warte_bis - r.updated_at)))));
  end if;
  update quest_runs set status = 'abgebrochen', updated_at = now(), heimweg_offen = false where id = r.id;
  update quest_offers set status = 'offen', run_id = null where run_id = p_run and player_id = uid and slot <> 'individuell';
  if t.art <> 'erkundung' and not q_nebenbei(t.id) then
    if von is not null and t.fundort is not null then
      update profiles set aufenthalt = von, weg_von = null, weg_ab = null, weg_bis = null, weg_pos = null where id = uid;  -- man ist ja noch im Ort
      return json_build_object('ok', true, 'ort', von, 'ort_name', ort_name(von));
    end if;
    m := case when von is not null and von <> heim then reise_minuten(von, heim) when von is null then round(d)::int else 0 end;
    if m >= 5 then
      update profiles set aufenthalt = null, weg_von = coalesce(von, heim), weg_ab = now(), weg_bis = now() + make_interval(mins => m),
        weg_pos = case when von is null then q_pos(r.id, d) end where id = uid;
      return json_build_object('ok', true, 'weg', m, 'ankunft', now() + make_interval(mins => m), 'heim', ort_name(heim));
    end if;
  end if;
  return json_build_object('ok', true);
end $$;

-- ───────── Ansehen auch für Weltereignisse, Ortsquests und Kapitel ─────────
create or replace function public.trg_quest_ansehen() returns trigger language plpgsql security definer set search_path = public as $$
declare t quest_templates; n int;
begin
  if new.status = 'fertig' and old.status is distinct from 'fertig' then
    select * into t from quest_templates where id = new.quest_id;
    n := case t.art when 'brett' then case coalesce(t.schwierigkeit, 1) when 1 then 4 when 2 then 7 else 12 end
                    when 'erkundung' then 3 when 'haupt' then 10 when 'system' then 6 when 'ki' then 6
                    when 'welt' then 20 when 'ort' then 8 when 'chronik' then 8 else 0 end;
    if n > 0 then perform ansehen_add(new.player_id, n, 'Abenteuer: ' || coalesce(t.titel, 'unterwegs')); end if;
    if t.art = 'welt' then update profiles set ruhm = ruhm + 15 where id = new.player_id; end if;
    -- Wer in einem fremden Ort hilft, macht sein Dorf dort bekannter
    if t.fundort is not null and new.flags->>'start_ort' is not null and heim_ort(new.player_id) is not null then
      perform dipl_aendern(heim_ort(new.player_id), new.flags->>'start_ort', 3);
    end if;
  end if;
  return new;
end $$;
""")

# ───────── Diplomatie in Stufen ─────────
A(r"""
-- Stufe −10…+10 aus Punkten: die ersten Stufen kommen schnell, die hohen brauchen lange
create or replace function public.dipl_stufe(p numeric) returns int language sql immutable as $$
  select (sign(coalesce(p, 0)) * (select count(*) from unnest(array[2,6,12,20,30,42,55,70,85,100]) s where abs(coalesce(p, 0)) >= s))::int;
$$;
create or replace function public.dipl_name(p_stufe int, p_ort boolean default false) returns text language sql immutable as $$
  select case when p_ort then
    case when p_stufe <= -10 then 'Erzfeinde' when p_stufe <= -7 then 'Feinde' when p_stufe <= -4 then 'Rivalen' when p_stufe <= -2 then 'Angespannt'
         when p_stufe <= 1 then 'Neutral' when p_stufe <= 3 then 'Freundlich' when p_stufe <= 6 then 'Partner' when p_stufe <= 9 then 'Verbündete' else 'Blutsbund' end
  else
    case when p_stufe <= -10 then 'Erzfeind' when p_stufe <= -7 then 'Feind' when p_stufe <= -4 then 'Feindselig' when p_stufe <= -2 then 'Misstrauisch'
         when p_stufe <= 1 then 'Neutral' when p_stufe <= 3 then 'Freundlich' when p_stufe <= 6 then 'Vertraut' when p_stufe <= 9 then 'Eng verbunden' else 'Freund fürs Leben' end
  end;
$$;

create table if not exists public.dorf_diplomatie (
  a text not null references public.welt_orte(id) on delete cascade,
  b text not null references public.welt_orte(id) on delete cascade,
  punkte numeric not null default 0,
  geaendert timestamptz not null default now(),
  primary key (a, b), check (a < b)
);
alter table public.dorf_diplomatie enable row level security;
revoke all on public.dorf_diplomatie from anon, authenticated;

-- Startwert je nach Ähnlichkeit: gleiches Reich, Bündnis oder Rivalität der Reiche, gleiche Bauweise → −2 … +2
create or replace function public.dipl_start(p_a text, p_b text) returns numeric language plpgsql stable security definer set search_path = public as $$
declare x welt_orte; y welt_orte; s numeric := 0; h numeric;
begin
  select * into x from welt_orte where id = p_a; select * into y from welt_orte where id = p_b;
  if x.reich is not null and x.reich = y.reich then s := s + 1.5; else s := s - 1; end if;
  if exists (select 1 from welt_beziehungen w where w.art = 'buendnis' and ((w.a = x.reich and w.b = y.reich) or (w.a = y.reich and w.b = x.reich))) then s := s + 1; end if;
  if exists (select 1 from welt_beziehungen w where w.art = 'rivalitaet' and ((w.a in (x.reich, x.id) and w.b in (y.reich, y.id)) or (w.a in (y.reich, y.id) and w.b in (x.reich, x.id)))) then s := s - 1.5; end if;
  if x.stil = y.stil then s := s + 0.5; end if;
  h := ((abs(hashtext(least(p_a, p_b) || greatest(p_a, p_b))) % 100) / 100.0 - 0.5);  -- etwas Eigenart
  s := least(2, greatest(-2, round(s + h)));
  return case s when 2 then 7 when 1 then 3 when -1 then -3 when -2 then -7 else 0 end;
end $$;
create or replace function public.dipl_punkte(p_a text, p_b text) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select punkte from dorf_diplomatie where a = least(p_a, p_b) and b = greatest(p_a, p_b)), dipl_start(p_a, p_b));
$$;
-- Langsam und mit abnehmender Wirkung nahe der Extreme
create or replace function public.dipl_aendern(p_a text, p_b text, p_delta numeric) returns int language plpgsql security definer set search_path = public as $$
declare cur numeric; neu numeric;
begin
  if p_a is null or p_b is null or p_a = p_b then return null; end if;
  cur := dipl_punkte(p_a, p_b);
  neu := least(100, greatest(-100, cur + p_delta * case when sign(p_delta) = sign(cur) then greatest(0.25, 1 - abs(cur) / 125.0) else 1 end));
  insert into dorf_diplomatie (a, b, punkte, geaendert) values (least(p_a, p_b), greatest(p_a, p_b), neu, now())
    on conflict (a, b) do update set punkte = excluded.punkte, geaendert = now();
  return dipl_stufe(neu);
end $$;

-- Für den Diplomatie-Reiter „Orte“
create or replace function public.dipl_orte() returns json language plpgsql stable security definer set search_path = public as $$
declare heim text := heim_ort(auth.uid());
begin
  if heim is null then return '[]'::json; end if;
  return (select coalesce(json_agg(json_build_object('id', o.id, 'name', o.name, 'art', o.art, 'reich', r.name, 'farbe', r.farbe,
      'stufe', dipl_stufe(p), 'name_stufe', dipl_name(dipl_stufe(p), true), 'minuten', reise_minuten(heim, o.id),
      'spieler', (select string_agg(pp.character_name, ', ') from villages v join profiles pp on pp.id = v.owner_id where v.id = o.village_id))
      order by dipl_stufe(p) desc, reise_minuten(heim, o.id)), '[]'::json)
    from (select o.*, dipl_punkte(heim, o.id) p from welt_orte o where o.id <> heim) o left join welt_reiche r on r.id = o.reich);
end $$;
""")

patch('get_people_notes()', [
    ("'erlebt', (select count(*) from npc_memories m where m.npc_id = n.id and m.player_id = v_uid)",
     "'erlebt', (select count(*) from npc_memories m where m.npc_id = n.id and m.player_id = v_uid),\n        'stufe', case when r.npc_id is null then null else dipl_stufe(r.sympathy) end, 'stufe_name', case when r.npc_id is null then 'Unbekannt' else dipl_name(dipl_stufe(r.sympathy)) end"),
])

patch('quest_view(bigint)', [
    ("'reise_min', (select (t.def->'szenen'->x->'reise'->>'minuten')::numeric from (select coalesce(o->>'weiter', o->'erfolg'->>'weiter') x) y where (t.def->'szenen'->x->'reise'->>'minuten')::numeric >= 20)",
     "'reise_min', (select q_reise_eff(r.id, x) from (select coalesce(o->>'weiter', o->'erfolg'->>'weiter') x) y where q_reise_eff(r.id, x) >= 20)"),
])
patch('quest_dauer(text)', [
    ("ct := ct + coalesce((sz->cur->'reise'->>'minuten')::numeric, 0)::int;", "ct := ct + q_reise_min(coalesce((sz->cur->'reise'->>'minuten')::numeric, 0));"),
    ("when mx >= 30 then round(mx * 0.5)::int else 0 end;", "when mx >= 10 then round(mx * 0.5)::int else 0 end;"),
])

# ───────── Kartenposition während Quests ─────────
A(r"""
create or replace function public.welt_spieler(p_uid uuid, p_ort text, p_ich boolean) returns json language plpgsql stable security definer set search_path = public as $$
declare q record; t numeric; d numeric; l json; a welt_orte; b welt_orte; nm text; pos jsonb;
begin
  nm := (select character_name from profiles where id = p_uid);
  l := spieler_lage(p_uid);
  if l->>'zustand' = 'weg' then
    select * into a from welt_orte where id = l->>'von'; select * into b from welt_orte where id = l->>'nach';
    pos := (select weg_pos from profiles where id = p_uid);
    t := least(1, greatest(0, extract(epoch from (now() - (l->>'ab')::timestamptz)) / greatest(60, extract(epoch from ((l->>'bis')::timestamptz - (l->>'ab')::timestamptz)))));
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', json_build_object('titel', 'Auf dem Weg nach ' || b.name, 'art', 'weg', 'reist', true, 'bis', l->>'bis', 't', round(t, 3),
      'pos', json_build_object('x', round(coalesce((pos->>'x')::numeric, a.x) + (b.x - coalesce((pos->>'x')::numeric, a.x)) * t), 'y', round(coalesce((pos->>'y')::numeric, a.y) + (b.y - coalesce((pos->>'y')::numeric, a.y)) * t))));
  elsif l->>'zustand' = 'ort' then
    select * into b from welt_orte where id = l->>'ort';
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', json_build_object('titel', 'In ' || b.name, 'art', 'ort', 'reist', false, 'pos', json_build_object('x', b.x + 18, 'y', b.y + 26), 'ort_id', b.id));
  elsif l->>'zustand' = 'wahl' and l->>'ort' is not null then
    select * into b from welt_orte where id = l->>'ort';
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', json_build_object('titel', l->>'titel', 'art', 'wahl', 'reist', false, 'pos', json_build_object('x', b.x + 18, 'y', b.y + 26)));
  end if;
  select r.id, r.szene, r.warte_bis, r.updated_at, r.flags, tp.titel, tp.art, tp.def->'szenen'->r.szene->>'ort' ort, tp.def->>'ziel' ziel, coalesce(tp.def->'heim', '[]'::jsonb) ? r.szene daheim, r.flags->>'start_ort' start_ort into q
    from quest_runs r join quest_templates tp on tp.id = r.quest_id where r.player_id = p_uid and (r.status = 'laeuft' or (r.status = 'fertig' and r.heimweg_offen)) order by r.status = 'laeuft' desc, q_nebenbei(r.quest_id), r.id desc limit 1;
  if q.id is null then
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', null);
  end if;
  if q.start_ort is not null then
    select * into b from welt_orte where id = q.start_ort;
    return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort, 'unterwegs', json_build_object('titel', q.titel, 'art', q.art, 'reist', q.warte_bis is not null and q.warte_bis > now(), 'pos', json_build_object('x', b.x + 30, 'y', b.y - 20)));
  end if;
  d := q_draussen(q.id); t := 1;
  if q.warte_bis is not null and q.warte_bis > now() and q.flags ? 'pos_von' then
    t := least(1, greatest(0, extract(epoch from (now() - q.updated_at)) / greatest(60, extract(epoch from (q.warte_bis - q.updated_at)))));
    d := (q.flags->>'pos_von')::numeric + (d - (q.flags->>'pos_von')::numeric) * t;
  end if;
  return json_build_object('name', nm, 'ich', p_ich, 'ort', p_ort,
    'unterwegs', json_build_object('titel', q.titel, 'art', q.art, 'ziel_art', coalesce(q.ort, 'wald'), 'ziel_ort', q.ziel, 'daheim', q.daheim or d < 1,
      't', round(t, 3), 'pos', case when d >= 1 then q_pos(q.id, d) end, 'minuten_weg', round(d), 'reist', q.warte_bis is not null and q.warte_bis > now(), 'bis', q.warte_bis));
end $$;
""")

# ───────── Rangliste der Dörfer ─────────
A(r"""
-- Kampfkraft eines Ortes (verdeckt): Kämpfer × Ausrüstung × Mauern × Wohlstand
create or replace function public.dorf_staerke(p_ort text) returns numeric language plpgsql stable security definer set search_path = public as $$
declare o welt_orte; v villages; k numeric := 0; f numeric := 1; st jsonb; x jsonb; lv int; sp record;
begin
  select * into o from welt_orte where id = p_ort; if o.id is null then return 0; end if;
  if o.village_id is not null then
    select * into v from villages where id = o.village_id;
    select count(*) * 1.0 into k from npcs where village_id = v.id and tot_at is null and coalesce(zustand, '') not in ('krank', 'verletzt');
    k := k + 0.5 * (select count(*) from npcs where village_id = v.id and tot_at is null and coalesce(zustand, '') in ('krank', 'verletzt'));
    select stufen into st from village_eco where village_id = v.id;
    for x in select * from jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) loop
      lv := coalesce((st->>(x->>1))::int, 1);
      f := f * case x->>0 when 'schmiede' then 1 + 0.07 * lv when 'kaserne' then 1 + 0.08 * lv when 'wachturm' then 1 + 0.04 * lv else 1 end;
    end loop;
    for sp in select p.id, p.ansehen, coalesce(p.ruhm, 0) ruhm from profiles p where p.id = v.owner_id loop
      k := k + 4 + 1.5 * fert_stufe(coalesce((select xp from fertigkeiten where player_id = sp.id and id = 'kampf'), 0))
             + (select count(*) from player_gear where player_id = sp.id and status = 'besitz') * 0.6 + sp.ruhm / 25.0;
    end loop;
  else
    k := greatest(3, coalesce(o.einwohner, 10) * case o.art when 'burg' then 0.8 when 'kloster' then 0.15 else 0.3 end);
  end if;
  f := f * (1 + 0.22 * coalesce(o.mauer, 0) + 0.04 * coalesce(o.tuerme, 0)) * (0.8 + coalesce(o.wohlstand, 50) / 250.0);
  return round(k * f, 2);
end $$;

-- Jedes Dorf gegen jedes: erwartete Siege im Krieg (Kräfteverhältnis), daraus die Rangfolge
create or replace function public.dorf_rangliste() returns json language sql stable security definer set search_path = public as $$
  with rs as (select id, greatest(dorf_staerke(id), 0.1) s from welt_orte where art = 'dorf'),
       ex as (select a.id, coalesce(sum(power(a.s, 1.5) / (power(a.s, 1.5) + power(b.s, 1.5))), 0) / greatest(1, (select count(*) - 1 from rs)) e
              from rs a left join rs b on b.id <> a.id group by a.id),
       y as (select o.id, o.name, r.name reich, r.farbe, ex.e,
                    (select string_agg(pp.character_name, ', ') from villages v join profiles pp on pp.id = v.owner_id where v.id = o.village_id) spieler,
                    row_number() over (order by ex.e desc, o.id) rang,
                    case when ex.e >= 0.85 then 6 when ex.e >= 0.68 then 5 when ex.e >= 0.5 then 4 when ex.e >= 0.33 then 3 when ex.e >= 0.16 then 2 else 1 end stufe
             from ex join welt_orte o on o.id = ex.id left join welt_reiche r on r.id = o.reich)
  select coalesce(json_agg(json_build_object('rang', rang, 'id', id, 'name', name, 'reich', reich, 'farbe', farbe, 'ich', id = heim_ort(auth.uid()),
      'spieler', spieler, 'stufe', stufe, 'staerke', case stufe when 6 then 'Gefürchtet' when 5 then 'Mächtig' when 4 then 'Stark' when 3 then 'Wehrhaft' when 2 then 'Verwundbar' else 'Schwach' end)
      order by rang), '[]'::json) from y;
$$;
""")

# ───────── Rätsel ohne Sackgasse: „Die Burg im Norden“ ─────────
A(r"""
do $$ declare d jsonb;
begin
  select def into d from quest_templates where id = 'b_s_burg';
  if d is null or d->'szenen' ? 'code_fehl' then return; end if;
  d := jsonb_set(d, '{szenen,code,raetsel,misserfolg}', '{"text": "Nach dem dritten Versuch rastet etwas falsch ein. Ein Mechanismus knackt, Staub rieselt aus der Decke – dann ist es still. Die Scheiben lassen sich nicht mehr drehen. Noch nicht.", "weiter": "code_fehl", "folgen": {"flag": ["code_gesperrt", "an_der_tuer"]}}'::jsonb);
  d := jsonb_set(d, '{szenen,code_fehl}', $j${"ort": "hoehle", "text": "Du setzt dich auf die kalte Treppe. Irgendwo im Stein tickt der Mechanismus, langsam wie ein Herzschlag. Nach einer Weile klickt es leise: Die Scheiben sind wieder frei. Wer diese Tür gebaut hat, wollte Unwissende aufhalten – nicht Suchende.", "optionen": [
    {"text": "Oben in der Burg nach Hinweisen suchen", "weiter": "hof_zurueck"},
    {"text": "Es noch einmal versuchen", "weiter": "code2"}]}$j$::jsonb);
  d := jsonb_set(d, '{szenen,code2}', $j${"ort": "hoehle", "text": "Drei Scheiben, sechs Tiere. Diesmal nimmst du dir Zeit.", "raetsel": {"frage": "Welche drei Tiere, in welcher Reihenfolge? (zum Beispiel: Bär, Fuchs, Eule)", "antworten": ["Reh Wolf Rabe", "Reh, Wolf, Rabe", "Reh-Wolf-Rabe", "Reh, Wolf und Rabe"], "hinweise": ["Die Bilder im Wohnturm erzählen eine Geschichte.", "Ein Tier am Waldrand, eines im Schnee, eines auf einem Turm."], "versuche": 3,
    "erfolg": {"text": "Die Scheiben rasten ein: Reh. Wolf. Rabe. Ein tiefes Grollen – und die Bronzetür schwingt auf. Kalte, uralte Luft strömt dir entgegen.", "weiter": "gruft"},
    "misserfolg": {"text": "Der Mechanismus bleibt diesmal stumm. Die Tür rührt sich nicht.", "weiter": "code_fehl2"}}}$j$::jsonb);
  d := jsonb_set(d, '{szenen,code_fehl2}', $j${"ort": "hoehle", "text": "Die Bronzetür hält dicht. Aber das Mauerwerk daneben ist alt, und an einer Stelle sickert Wasser durch die Fugen.", "optionen": [
    {"tag": "[Anpacken]", "text": "Die nassen Steine neben der Tür herausbrechen", "probe": {"id": "anpacken", "dc": 14},
     "erfolg": {"text": "Stein um Stein löst sich. Mit blutigen Fingern zwängst du dich durch das Loch – hinein in die Gruft.", "weiter": "gruft", "folgen": {"gefahr": 1}},
     "misserfolg": {"text": "Die Steine sitzen fester, als sie aussehen. Ein Brocken löst sich und trifft dich an der Schulter. Hier kommst du heute nicht weiter.", "weiter": "flucht", "folgen": {"gefahr": 1}}},
    {"text": "Aufgeben und gehen", "weiter": "flucht"}]}$j$::jsonb);
  d := jsonb_set(d, '{szenen,hof_zurueck}', $j${"ort": "ruine", "text": "Du steigst wieder hinauf in den Hof. Die Bronzetür läuft dir nicht davon.", "optionen": [
    {"text": "Zum Wohnturm", "wenn": {"nicht_flag": "bilder"}, "weiter": "wohnturm"},
    {"text": "Noch einmal zu den Bildern im Wohnturm", "wenn": {"flag": "bilder"}, "weiter": "bilder"},
    {"text": "Zum Bergfried", "wenn": {"nicht_flag": "schluessel"}, "weiter": "bergfried"},
    {"text": "Hinunter zur Bronzetür", "weiter": "grufttuer"}]}$j$::jsonb);
  -- Bronzetür: Rückweg nach oben und nach einer Sperre der zweite Anlauf
  d := jsonb_set(d, '{szenen,grufttuer,optionen}', $j$[
    {"text": "Die Scheiben drehen", "wenn": {"nicht_flag": "code_gesperrt"}, "weiter": "code"},
    {"text": "Die Scheiben drehen", "wenn": {"flag": "code_gesperrt"}, "weiter": "code2"},
    {"text": "Den Bronzeschlüssel in das Schlüsselloch unten stecken", "wenn": {"flag": "schluessel"}, "weiter": "tuer_schluessel"},
    {"text": "Erst noch einmal oben in der Burg umsehen", "weiter": "hof_zurueck", "folgen": {"flag": ["an_der_tuer"]}}]$j$::jsonb);
  d := jsonb_set(d, '{szenen,tuer_schluessel,optionen}', $j$[
    {"text": "Die Scheiben drehen", "wenn": {"nicht_flag": "code_gesperrt"}, "weiter": "code"},
    {"text": "Die Scheiben drehen", "wenn": {"flag": "code_gesperrt"}, "weiter": "code2"}]$j$::jsonb);
  -- Wer schon unten war, muss nicht noch einmal an den Grabräubern vorbei
  d := jsonb_set(d, '{szenen,bilder,optionen}', $j$[{"text": "Zurück in den Hof", "weiter": "hof2", "folgen": {"flag": ["bilder"]}}, {"text": "Gleich hinunter zur Bronzetür", "wenn": {"flag": "an_der_tuer"}, "weiter": "grufttuer", "folgen": {"flag": ["bilder"]}}]$j$::jsonb);
  d := jsonb_set(d, '{szenen,hof2,optionen}', (d->'szenen'->'hof2'->'optionen') || '[{"text": "Hinunter zur Bronzetür", "wenn": {"flag": "an_der_tuer"}, "weiter": "grufttuer"}]'::jsonb);
  d := jsonb_set(d, '{szenen,hof3,optionen}', (d->'szenen'->'hof3'->'optionen') || '[{"text": "Hinunter zur Bronzetür", "wenn": {"flag": "an_der_tuer"}, "weiter": "grufttuer"}]'::jsonb);
  update quest_templates set def = d where id = 'b_s_burg';
end $$;

-- „Die Männer mit den Armbrüsten“: kein Zeitsprung, und das offene Ende führt zu einer Fortsetzung
do $$ declare d jsonb;
begin
  select def into d from quest_templates where id = 'b_s_armbrust';
  if d is null then return; end if;
  d := jsonb_set(d, '{szenen,wache,text}', '"Das Dorf stellt Wachen an den Waldrand. Heute Nacht sitzt jemand am Feuer und horcht, morgen der Nächste. Fürs Erste kommen keine Wilderer mehr – aber am Ostkamm qualmt der Meiler weiter."'::jsonb);
  d := jsonb_set(d, '{szenen,ende_wache,folgen,journal}', '["rabenfels_offen", "Rauch über dem Ostkamm", "Die Männer von Rabenfels sitzen noch immer am Ostkamm. Wir halten Wache – aber irgendwann muss jemand etwas unternehmen."]'::jsonb);
  d := jsonb_set(d, '{szenen,ende_nichts,folgen,journal}', '["rabenfels_offen", "Rauch über dem Ostkamm", "Die Männer von Rabenfels sitzen noch immer am Ostkamm und nehmen sich, was sie wollen."]'::jsonb);
  update quest_templates set def = d where id = 'b_s_armbrust';
end $$;

-- Ansehen nachholen für Weltereignisse, Ortsquests und Kapitel, die bisher nichts brachten
do $$ declare x record;
begin
  for x in select r.player_id, t.titel, t.art, count(*) n from quest_runs r join quest_templates t on t.id = r.quest_id
           where r.status = 'fertig' and t.art in ('welt', 'ort', 'chronik')
             and not exists (select 1 from ansehen_log l where l.player_id = r.player_id and l.grund = 'Abenteuer: ' || t.titel)
           group by 1, 2, 3 loop
    perform ansehen_add(x.player_id, case x.art when 'welt' then 20 else 8 end, 'Abenteuer: ' || x.titel);
    if x.art = 'welt' then update profiles set ruhm = ruhm + 15 where id = x.player_id; end if;
  end loop;
end $$;

revoke execute on function public.q_draussen(bigint), public.q_reise_eff(bigint, text), public.q_pos(bigint, numeric), public.dipl_start(text, text), public.dipl_punkte(text, text), public.dipl_aendern(text, text, numeric), public.dorf_staerke(text) from public, anon, authenticated;
revoke execute on function public.dipl_orte(), public.dorf_rangliste() from public, anon;
grant execute on function public.dipl_orte(), public.dorf_rangliste() to authenticated;
""")
OUT.write_text('-- 041: kürzere Wege, Position in Quests, Heimweg/Abbrechen, Ansehen, Rätsel, Rangliste, Diplomatie-Stufen (erzeugt von tools/m041.py)\n' + '\n'.join(_p))
print(OUT, OUT.stat().st_size)
