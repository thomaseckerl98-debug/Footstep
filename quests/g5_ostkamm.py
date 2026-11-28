# „Rauch über dem Ostkamm“ – Fortsetzung von „Die Männer mit den Armbrüsten“ (offene Enden: Wache / nichts getan).
# Erzeugt migrations/044_ostkamm.sql
import json, pathlib

def opt(text, weiter, **kw):
    o = {'text': text, 'weiter': weiter}; o.update(kw); return o
def probe(tag, text, pid, dc, erfolg, misserfolg, mod=None):
    p = {'id': pid, 'dc': dc}
    if mod: p['mod'] = mod
    return {'tag': tag, 'text': text, 'probe': p, 'erfolg': erfolg, 'misserfolg': misserfolg}

S = {}
S['start'] = {'ort': 'dorf', 'text': 'Seit Tagen hängt eine graue Fahne über dem Ostkamm. Heute Morgen fehlt am Waldrand eine ganze Reihe junger Eichen – über Nacht gefällt, die Stümpfe noch hell. Die Wache am Feuer hat nichts gehört. Am Brunnen redet man von nichts anderem: Kunos Leute kommen näher.',
  'optionen': [opt('Zum Kamm hinaufsteigen und sehen, wie weit sie sind', 'aufstieg'),
               probe('[Spuren lesen]', 'Erst die Spuren am Waldrand lesen', 'spuren', 13,
                     {'text': 'Die Holzfäller kommen nicht über den Weg, sondern durch die alte Rinne am Bach – ein Pfad, den kaum noch jemand kennt. Man könnte ihn sperren. Oder selbst benutzen.', 'folgen': {'flag': ['pfad']}, 'weiter': 'aufstieg'},
                     {'text': 'Zu viele Stiefel, zu viel Matsch. Du siehst nur, dass es viele waren.', 'weiter': 'aufstieg'})]}
S['aufstieg'] = {'ort': 'wald', 'text': 'Du steigst durch den Wald zum Ostkamm hinauf. Je höher du kommst, desto dichter der Rauch.', 'reise': {'text': 'Du steigst zum Ostkamm hinauf.', 'minuten': 240, 'weiter': 'kamm'}}
S['kamm'] = {'ort': 'wald', 'text': 'Der Meiler steht nicht mehr allein. Drei weitere qualmen, ein Schuppen ist neu, und zwischen den Zelten stapeln sich Fässer mit dem Zeichen von Turm und Krone. Eine frische Schneise zieht sich den Hang hinab – geradewegs auf euer Tal zu. Vogt Kuno lässt nicht roden. Er lässt einen Weg bauen.',
  'optionen': [opt('Nachts die Meiler löschen und die Fässer zerschlagen', 'nacht'),
               opt('Kuno offen zur Rede stellen', 'kuno'),
               opt('Umkehren und Verbündete holen', 'heim_hilfe')]}
S['nacht'] = {'ort': 'feuer', 'text': 'Du wartest, bis die Feuer im Lager nur noch glimmen. Zwei Wachen, ein Hund, vier Meiler.',
  'optionen': [probe('[Flink]', 'Durch die Rinne zu den Meilern schleichen', 'flink', 14,
                     {'text': 'Niemand sieht dich kommen.', 'weiter': 'sabotage'}, {'text': 'Der Hund hebt den Kopf. Dann bellt er.', 'weiter': 'entdeckt'}, mod={'pfad': -3})]}
S['sabotage'] = {'ort': 'wald', 'text': 'Wasser zischt in die Glut, Dauben splittern, Pech rinnt ins Moos. Als der Himmel grau wird, stehen Kunos Männer vor kalten Meilern und leeren Fässern – und fluchen in alle Richtungen.',
  'optionen': [opt('Ein Zeichen in den Schuppen ritzen: Dieser Wald ist nicht euer', 'heim_sieg', folgen={'flag': ['zeichen']}),
               opt('Unerkannt verschwinden', 'heim_sieg')]}
S['entdeckt'] = {'ort': 'wald', 'gefahr': True, 'text': 'Fackeln flammen auf. „Da! Am Meiler!“ Kunos Leute kommen von allen Seiten.',
  'optionen': [], 'minispiel': {'art': 'kampf', 'titel': 'Flucht vom Ostkamm', 'text': 'Schlag dich durch, bis der Wald dich verschluckt.', 'dauer': 420, 'schwer': 2, 'gegner': 'banditen', 'kampfort': 'wald',
    'erfolg': {'text': 'Du brichst durch ihre Reihe und verschwindest zwischen den Stämmen. Hinter dir brennt ein Meiler – nicht so, wie Kuno es wollte.', 'folgen': {'flag': ['kampf']}, 'weiter': 'heim_sieg'},
    'misserfolg': {'text': 'Ein Kolben trifft dich an der Schläfe. Du kommst im Unterholz zu dir, allein, blutend – aber frei.', 'folgen': {'gefahr': 2}, 'weiter': 'heim_flucht'}}}
S['kuno'] = {'ort': 'wald', 'text': 'Kuno empfängt dich vor seinem Zelt, den roten Mantel um die Schultern. „Du schon wieder.“ Er deutet auf die Schneise. „Mein Herr will Holz. Viel Holz. Ihr habt Wald. Also – was bietest du, bevor ich ihn mir nehme?“',
  'optionen': [probe('[Feilschen]', '„Holz aus dem Windbruch, Jahr für Jahr – dafür bleibt der Hang stehen.“', 'feilschen', 15,
                     {'text': 'Kuno rechnet laut. Dann schlägt er ein. „Windbruch. Aber jede Fuhre pünktlich, sonst komme ich selbst.“', 'weiter': 'heim_handel'},
                     {'text': '„Windbruch? Dafür baue ich keinen Weg.“', 'weiter': 'kuno_droht'}),
               probe('[Einschüchtern]', '„Wir sind nicht mehr allein. Hinter uns stehen andere Dörfer – und sie wissen, wer ihr seid.“', 'einschuechtern', 16,
                     {'text': 'Zum ersten Mal sieht Kuno unsicher aus. „Bis zum Kamm“, knurrt er. „Keinen Schritt weiter. Bis mein Herr entscheidet.“', 'weiter': 'heim_rueckzug'},
                     {'text': 'Kuno lacht. „Dann sollen sie kommen.“', 'weiter': 'kuno_droht'}),
               opt('Die Urkunde von Moosherz vorzeigen', 'urkunde', wenn={'wissen': 'moosherz'})]}
S['urkunde'] = {'ort': 'wald', 'text': 'Kuno liest die Abschrift zweimal. „Eine Urkunde der alten Herrin. Mein Herr fürchtet nichts so sehr wie einen Streit vor dem König.“ Er rollt das Papier zusammen und gibt es dir zurück. „Wir bleiben jenseits des Kamms. Fürs Erste.“',
  'optionen': [opt('Heimkehren', 'heim_rueckzug')]}
S['kuno_droht'] = {'ort': 'wald', 'text': '„Geh nach Hause und sag deinen Bauern, sie sollen ihre Äxte schärfen. Wenn der Weg fertig ist, kommen wir.“',
  'optionen': [opt('Gehen – und das Tal vorbereiten', 'heim_hilfe')]}
S['heim_hilfe'] = {'ort': 'wald', 'text': 'Du machst dich auf den Rückweg. Jede Stunde zählt.', 'reise': {'text': 'Du eilst ins Tal.', 'minuten': 240, 'weiter': 'rat'}}
S['rat'] = {'ort': 'dorf', 'text': 'Im Langhaus ist kein Platz mehr frei. Du erzählst von der Schneise, den Fässern, Kunos Worten. Dann wird es still. Alle sehen dich an. „Wen holen wir?“',
  'optionen': [opt('Bero und die Furtenauer', 'aufgebot', wenn={'wissen': 'bero'}, folgen={'flag': ['furtenau']}),
               opt('Harrek und seine Söldner vom Steg', 'aufgebot', wenn={'wissen': 'harrek'}, folgen={'flag': ['harrek']}),
               opt('Alle, die eine Axt halten können', 'aufgebot'),
               opt('Niemanden. Wir verteidigen nur das Dorf.', 'ende_wall')]}
S['aufgebot'] = {'ort': 'dorf', 'text': 'Am Morgen steht ein bunter Haufen am Waldrand: Holzfäller mit Äxten, Hirten mit Schleudern, die Schmiedin mit einem Hammer. Keiner von ihnen ist ein Krieger. Alle sind gekommen.',
  'optionen': [opt('Zum Kamm hinauf', 'zug')]}
S['zug'] = {'ort': 'wald', 'text': 'Ihr steigt gemeinsam zum Kamm hinauf, nicht als Spione, sondern als Menge.', 'reise': {'text': 'Ihr zieht zum Ostkamm.', 'minuten': 240, 'weiter': 'schlacht'}}
S['schlacht'] = {'ort': 'wald', 'gefahr': True, 'text': 'Kunos Männer haben euch kommen sehen. Armbrüste hinter Holzstapeln, ein Graben quer über die Schneise.',
  'optionen': [], 'minispiel': {'art': 'kampf', 'modus': 'marsch', 'titel': 'Die Schlacht um die Schneise', 'text': 'Kämpft euch bis zu den Meilern durch.', 'dauer': 900, 'schwer': 3, 'gegner': 'banditen', 'kampfort': 'wald',
    'erfolg': {'text': 'Der Graben fällt, dann die Holzstapel. Als Kuno sieht, dass seine Leute laufen, läuft er mit.', 'weiter': 'ende_befreit'},
    'misserfolg': {'text': 'Die Bolzen sind zu viele. Ihr müsst zurück, schleppt eure Verwundeten den Hang hinab.', 'folgen': {'gefahr': 1}, 'weiter': 'ende_zurueck'}}}
for k, ziel, txt in [('heim_sieg', 'ende_sabotage', 'Im ersten Licht steigst du ins Tal hinab.'), ('heim_rueckzug', 'ende_rueckzug', 'Mit Kunos Wort im Rücken gehst du heim.'),
                     ('heim_handel', 'ende_handel', 'Mit einem Handschlag, der nach Pech riecht, gehst du heim.'), ('heim_flucht', 'ende_flucht', 'Humpelnd suchst du den Weg nach Hause.')]:
    S[k] = {'ort': 'wald', 'text': txt, 'reise': {'text': 'Du gehst nach Hause.', 'minuten': 240, 'weiter': ziel}}

J = ['rabenfels', 'Die Herren von Rabenfels']
S['ende_sabotage'] = {'ort': 'dorf', 'ende': True, 'text': 'Eine Woche lang steigt kein Rauch über dem Ostkamm auf. Dann zieht Kunos Lager weiter nach Osten. Niemand im Tal weiß genau, warum – aber alle wissen, wem sie es verdanken.',
  'folgen': {'dorf': {'holz': 15, 'stimmung': 8}, 'chronik': ['ostkamm_sabotage', 'Ich habe Kunos Meiler am Ostkamm in einer Nacht zerstört. Seine Leute sind abgezogen.'],
             'journal': J + ['Vogt Kuno hat den Ostkamm verlassen, nachdem seine Meiler in einer Nacht zerstört wurden. Ulrich von Rabenfels wird das nicht vergessen.'], 'beute': {'text': 'In einem der Fässer lag etwas, das nicht nach Pech roch.', 'stufe': 3, 'chance': 0.6}}}
S['ende_rueckzug'] = {'ort': 'dorf', 'ende': True, 'text': 'Die Schneise wächst nicht weiter. Am Kamm qualmt es noch, aber es ist ihr Wald, nicht eurer. Ein Waffenstillstand, mehr nicht – doch er hält.',
  'folgen': {'dorf': {'stimmung': 5}, 'chronik': ['ostkamm_rueckzug', 'Ich habe Vogt Kuno dazu gebracht, jenseits des Ostkamms zu bleiben – ohne einen Tropfen Blut.'],
             'journal': J + ['Vogt Kuno bleibt jenseits des Ostkamms – vorerst. Ein Waffenstillstand ohne Brief und Siegel.']}}
S['ende_handel'] = {'ort': 'dorf', 'ende': True, 'text': 'Jeden Monat rollt eine Fuhre Windbruch zum Kamm. Der Hang bleibt stehen. Manche im Dorf nennen es klug. Andere nennen es Tribut.',
  'folgen': {'dorf': {'holz': -10, 'stimmung': 2}, 'chronik': ['ostkamm_handel', 'Ich habe mit Vogt Kuno einen Handel geschlossen: Windbruch gegen den Wald am Hang.'],
             'journal': J + ['Mit Vogt Kuno gilt ein Handel: Windbruch gegen den Wald am Hang. Ob das ein Frieden ist oder ein Tribut, darüber streitet das Dorf.']}}
S['ende_flucht'] = {'ort': 'dorf', 'ende': True, 'text': 'Du kommst heim, mit leeren Händen und einer Platzwunde. Am Kamm wird weiter gerodet. Aber jetzt weiß Kuno, dass jemand im Tal sich wehrt.',
  'folgen': {'dorf': {'stimmung': -2}, 'chronik': ['ostkamm_flucht', 'Mein Anschlag auf Kunos Lager am Ostkamm ist gescheitert. Ich bin knapp entkommen.']}}
S['ende_befreit'] = {'ort': 'dorf', 'ende': True, 'text': 'Am Abend brennen am Ostkamm keine Meiler mehr, sondern Freudenfeuer. Die Schneise wird wieder zuwachsen. Und in den Tälern ringsum erzählt man, dass ein kleines Dorf die Männer von Rabenfels vertrieben hat.',
  'folgen': {'dorf': {'holz': 25, 'stimmung': 10}, 'chronik': ['ostkamm_befreit', 'Mit dem ganzen Dorf haben wir Vogt Kuno vom Ostkamm vertrieben.'],
             'journal': J + ['Das Dorf hat Vogt Kuno in offener Schlacht vom Ostkamm vertrieben. Ulrich von Rabenfels hat jetzt einen Grund, uns zu hassen – und einen, uns zu fürchten.'],
             'beute': {'text': 'Unter Kunos zurückgelassenen Sachen ist etwas Besonderes.', 'stufe': 3, 'chance': 0.85}}}
S['ende_zurueck'] = {'ort': 'dorf', 'ende': True, 'text': 'Ihr habt verloren, aber nicht alles. Kuno weiß jetzt, dass das Tal kämpft – und baut seine Schneise langsamer. Die Verwundeten heilen. Die Wut bleibt.',
  'folgen': {'dorf': {'stimmung': -3}, 'chronik': ['ostkamm_zurueck', 'Wir haben am Ostkamm gegen Kunos Männer gekämpft und mussten zurück.']}}
S['ende_wall'] = {'ort': 'dorf', 'ende': True, 'text': 'Ihr hebt einen Graben am Waldrand aus und stellt Pfähle hinein. Kuno kommt nicht – noch nicht. Aber das Dorf schläft hinter seinem Wall ruhiger.',
  'folgen': {'dorf': {'holz': -10, 'stimmung': 3}, 'chronik': ['ostkamm_wall', 'Wir haben das Dorf gegen die Männer vom Ostkamm befestigt.']}}

DEF = {'start': 'start', 'szenen': S}
sql = f"""-- 044: „Rauch über dem Ostkamm“ – Fortsetzung der Armbrust-Geschichte (erzeugt von quests/g5_ostkamm.py)
insert into public.quest_templates (id, titel, beschreibung, kurz, art, schwierigkeit, rollen, voraussetzung, def)
values ('g_ostkamm', 'Rauch über dem Ostkamm', 'Kunos Leute schlagen eine Schneise auf euer Tal zu. Diesmal reicht Wachehalten nicht mehr.',
        'Kunos Leute schlagen eine Schneise auf euer Tal zu. Diesmal reicht Wachehalten nicht mehr.', 'haupt', 3, '{{}}', '{{"wissen": "rabenfels_offen"}}', $q${json.dumps(DEF, ensure_ascii=False)}$q$::jsonb)
on conflict (id) do update set titel = excluded.titel, beschreibung = excluded.beschreibung, kurz = excluded.kurz, def = excluded.def, voraussetzung = excluded.voraussetzung;
-- Wer die Armbrust-Geschichte schon offen beendet hat, bekommt den Hinweis nachträglich
insert into public.player_journal (player_id, kind, key, title, text)
select distinct r.player_id, 'auftrag', 'rabenfels_offen', 'Rauch über dem Ostkamm', 'Die Männer von Rabenfels sitzen noch immer am Ostkamm. Wir halten Wache – aber irgendwann muss jemand etwas unternehmen.'
from public.quest_runs r where r.quest_id = 'b_s_armbrust' and r.status = 'fertig' and r.szene in ('ende_wache', 'ende_nichts')
  and not exists (select 1 from public.player_journal j where j.player_id = r.player_id and j.key = 'rabenfels_offen');
"""
out = pathlib.Path(__file__).resolve().parent.parent / 'migrations' / '044_ostkamm.sql'
out.write_text(sql); print(out, len(sql))
# Prüfen: alle Ziele vorhanden
ziele = set()
for k, v in S.items():
    for o in v.get('optionen', []):
        for w in (o.get('weiter'), (o.get('erfolg') or {}).get('weiter'), (o.get('misserfolg') or {}).get('weiter')):
            if w: ziele.add(w)
    if 'reise' in v: ziele.add(v['reise']['weiter'])
    if 'minispiel' in v: ziele |= {v['minispiel']['erfolg']['weiter'], v['minispiel']['misserfolg']['weiter']}
print('fehlend:', ziele - set(S))
