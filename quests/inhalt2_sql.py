# Erzeugt migrations/024_inhalt2.sql aus quests/inhalt2.json
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(root, 'quests/inhalt2.json')))
J = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
sql = f"""-- Migration 024: lange Brett-Quests (Mittel/Schwer), Erkundungen, Tagwerk-Bitten. Erzeugt von quests/inhalt2_sql.py.
-- Alte Schwierigkeiten neu einordnen: die bisherigen „Mittel“ werden „Einfach“, die bisherigen „Schwer“ werden „Mittel“.
update public.quest_templates set schwierigkeit = 1 where art = 'brett' and id in ('b_grenzstein','b_fieber','b_woelfe','b_verlobung','b_schuld','b_fremde','b_nebel');
update public.quest_templates set schwierigkeit = 2 where art = 'brett' and id in ('b_hohlweg','b_brand','b_eber','b_zoll','b_spitzel','b_damm');

insert into public.quest_templates (id, titel, beschreibung, kurz, art, schwierigkeit, rollen, def)
select e->>'id', e->>'titel', e->>'kurz', e->>'kurz', 'brett', (e->>'schwierigkeit')::int, e->'rollen', e->'def' from jsonb_array_elements($q${J(d['brett'])}$q$::jsonb) e
on conflict (id) do update set titel = excluded.titel, beschreibung = excluded.beschreibung, kurz = excluded.kurz, art = excluded.art, schwierigkeit = excluded.schwierigkeit, rollen = excluded.rollen, def = excluded.def;

insert into public.quest_templates (id, titel, beschreibung, kurz, art, def)
select e->>'id', e->>'titel', e->>'kurz', e->>'kurz', 'erkundung', e->'def' from jsonb_array_elements($q${J(d['erkundung'])}$q$::jsonb) e
on conflict (id) do update set titel = excluded.titel, beschreibung = excluded.beschreibung, kurz = excluded.kurz, art = excluded.art, def = excluded.def;

insert into public.tagwerk_arten (id, jobs, art, schwer, titel, bitte, erfolg, misserfolg, dorf)
select e->>'id', array(select jsonb_array_elements_text(e->'jobs')), e->>'art', (e->>'schwer')::int, e->>'titel', e->>'bitte', e->>'erfolg', e->>'misserfolg', e->'dorf'
from jsonb_array_elements($q${J(d['tagwerk'])}$q$::jsonb) e
on conflict (id) do update set jobs = excluded.jobs, art = excluded.art, schwer = excluded.schwer, titel = excluded.titel, bitte = excluded.bitte, erfolg = excluded.erfolg, misserfolg = excluded.misserfolg, dorf = excluded.dorf;
"""
open(os.path.join(root, 'migrations/024_inhalt2.sql'), 'w').write(sql)
print(len(sql))
