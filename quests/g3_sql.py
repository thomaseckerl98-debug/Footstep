# Erzeugt migrations/037_geschichten3.sql aus g3a.py und g3b.py
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import g3a, g3b
qs = g3a.Q + g3b.Q
rows = []
for q in qs:
    d = {'start': q['start'], 'szenen': q['szenen']}
    rows.append({'id': q['id'], 'titel': q['titel'], 'kurz': q['kurz'], 'schwer': q['schwer'], 'fundort': q.get('fundort'), 'def': d})
J = json.dumps(rows, ensure_ascii=False)
assert '$q$' not in J
sql = f"""-- 037: Zwölf neue Geschichten (6 daheim, 4 in Städten, 2 Gastgeschichten). Erzeugt von quests/g3_sql.py
insert into public.quest_templates (id, titel, beschreibung, kurz, art, schwierigkeit, rollen, def, fundort)
select e->>'id', e->>'titel', e->>'kurz', e->>'kurz', 'haupt', (e->>'schwer')::int, '{{}}'::jsonb, e->'def', e->>'fundort' from jsonb_array_elements($q${J}$q$::jsonb) e
on conflict (id) do update set titel = excluded.titel, beschreibung = excluded.beschreibung, kurz = excluded.kurz, art = excluded.art, schwierigkeit = excluded.schwierigkeit, def = excluded.def, fundort = excluded.fundort;
"""
out = pathlib.Path(__file__).resolve().parent.parent / 'migrations' / '037_geschichten3.sql'
out.write_text(sql); print(out, len(sql), len(qs))
