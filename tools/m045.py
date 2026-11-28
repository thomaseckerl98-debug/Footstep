# Erzeugt migrations/045_anmeldung_heimweg.sql
# 1) Neue Spieler: Namen der Dorfleute gingen aus → Anmeldung schlug fehl („Kein freier Platz auf der Karte“).
# 2) Heimweg nach Abbruch, Scheitern oder einem Besuch dauert nur halb so lang.
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from m036 import patch, parts as _p
OUT = pathlib.Path(__file__).resolve().parent.parent / 'migrations' / '045_anmeldung_heimweg.sql'
_p.clear(); A = _p.append

patch('npc_neu_namenlos(bigint,text)', [
    ("  nm := case when w = 1 then fn[1 + floor(random() * array_length(fn, 1))::int] else mn[1 + floor(random() * array_length(mn, 1))::int] end;",
     """  -- freien Namen wählen; sind alle vergeben, bekommt der Name einen Beinamen
  select x into nm from unnest(case when w = 1 then fn else mn end) x where not exists (select 1 from npcs o where lower(o.name) = lower(x)) order by random() limit 1;
  while nm is null or exists (select 1 from npcs o where lower(o.name) = lower(nm)) loop
    nm := (case when w = 1 then fn else mn end)[1 + floor(random() * array_length(case when w = 1 then fn else mn end, 1))::int] || ' '
          || (array['vom Bach', 'vom Hang', 'am Brunnen', 'vom Moor', 'vom Wald', 'an der Furt', 'vom Steg', 'am Tor', 'vom Feld', 'vom Hügel', 'von der Mühle', 'am Weiher'])[1 + floor(random() * 12)::int];
  end loop;"""),
])

A(r"""
-- Endete die Quest mit einem Scheitern? (Name der Endszene)
create or replace function public.q_misserfolg(p_run bigint) returns boolean language sql stable security definer set search_path = public as $$
  select r.status = 'abgebrochen' or r.szene ~ '(leer|flucht|fehl|zurueck|nichts|verlor|scheiter|gefangen|niederlage)' from quest_runs r where r.id = p_run;
$$;
create or replace function public.heim_halb(p_m int) returns int language sql immutable as $$ select case when p_m <= 0 then p_m else greatest(5, ceil(p_m / 2.0))::int end; $$;
""")
patch('q_heimweg_info(bigint)', [
    ("hm := case when von is null then greatest(5, round(d))::int when von = heim then 0 else reise_minuten(von, heim) end;",
     "hm := case when von is null then greatest(5, round(d))::int when von = heim then 0 else reise_minuten(von, heim) end;\n  if q_misserfolg(p_run) then hm := heim_halb(hm); end if;"),
])
patch('quest_heimweg(bigint,text)', [
    ("    update profiles set aufenthalt = case when ziel = heim then null else ziel end, weg_von = coalesce(von, heim), weg_ab = now(),",
     "    if ziel = heim and q_misserfolg(r.id) then m := heim_halb(m); end if;\n    update profiles set aufenthalt = case when ziel = heim then null else ziel end, weg_von = coalesce(von, heim), weg_ab = now(),"),
])
patch('quest_abort(bigint)', [
    ("    if m >= 5 then", "    m := heim_halb(m);\n    if m >= 5 then"),
])
# Heim von einem Besuch (z. B. wenn man doch nicht einzieht): halbe Zeit
patch('reise_start(text)', [("  m := reise_minuten(von, ziel);", "  m := reise_minuten(von, ziel); if ziel = heim then m := heim_halb(m); end if;")])
patch('reise_ziele()', [("'minuten', case when von is null or o.id = von then null else reise_minuten(von, o.id) end)",
                         "'minuten', case when von is null or o.id = von then null when o.id = heim then heim_halb(reise_minuten(von, o.id)) else reise_minuten(von, o.id) end)")])
A("revoke execute on function public.q_misserfolg(bigint) from public, anon, authenticated;")
OUT.write_text('-- 045: Anmeldung (Namen), halber Heimweg nach Scheitern/Abbruch/Besuch (erzeugt von tools/m045.py)\n' + '\n'.join(_p))
print(OUT, OUT.stat().st_size)
