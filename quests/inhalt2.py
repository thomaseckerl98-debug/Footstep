# Baut quests/inhalt2.json: lange Brett-Quests, Erkundungen, Tagwerk.
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from qlib import pruefe
import lang_mittel, lang_schwer, erkundung, tagwerk
brett = []
for q in lang_mittel.Q + lang_schwer.Q:
    pruefe(q['id'], q['start'], q['szenen'])
    brett.append({'id': 'b_' + q['id'], 'titel': q['titel'], 'kurz': q['kurz'], 'schwierigkeit': q['schwierigkeit'], 'rollen': q['rollen'], 'def': {'start': q['start'], 'szenen': q['szenen']}})
erk = []
for q in erkundung.Q:
    pruefe(q['id'], q['start'], q['szenen'])
    erk.append({'id': q['id'], 'titel': q['titel'], 'kurz': q['kurz'], 'def': {'start': q['start'], 'szenen': q['szenen']}})
out = {'brett': brett, 'erkundung': erk, 'tagwerk': tagwerk.daten()}
p = os.path.join(os.path.dirname(__file__), 'inhalt2.json')
json.dump(out, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(brett), 'Brett', sum(len(q['def']['szenen']) for q in brett), 'Szenen;', len(erk), 'Erkundungen;', len(out['tagwerk']), 'Tagwerke;', os.path.getsize(p), 'Bytes')
