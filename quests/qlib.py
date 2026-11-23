# Kleine Helfer, um Quests kompakt zu schreiben, plus Prüfung (Ziele vorhanden, alles erreichbar, keine Sackgassen).
def O(text, weiter=None, tag=None, wenn=None, ergebnis=None, folgen=None):
    o = {'text': text}
    if tag: o['tag'] = tag
    if wenn: o['wenn'] = wenn
    if weiter: o['weiter'] = weiter
    if ergebnis: o['ergebnis'] = ergebnis
    if folgen: o['folgen'] = folgen
    return o

def B(text, weiter=None, folgen=None):
    b = {'text': text}
    if weiter: b['weiter'] = weiter
    if folgen: b['folgen'] = folgen
    return b

def P(text, probe, dc, ok, nok, tag=None, wenn=None, mod=None):
    pr = {'id': probe, 'dc': dc}
    if mod: pr['mod'] = mod
    o = {'text': text, 'tag': tag or '[' + {'flink': 'Flink', 'anpacken': 'Anpacken', 'spuren': 'Spuren lesen', 'heilkunde': 'Heilkunde', 'ueberreden': 'Überreden',
        'einschuechtern': 'Einschüchtern', 'beruhigen': 'Beruhigen', 'feilschen': 'Feilschen', 'menschenkenntnis': 'Menschenkenntnis', 'altes_wissen': 'Altes Wissen'}.get(probe, probe) + ']',
        'probe': pr, 'erfolg': ok, 'misserfolg': nok}
    if wenn: o['wenn'] = wenn
    return o

def S(ort, text, *optionen, gefahr=False):
    s = {'ort': ort, 'text': text, 'optionen': list(optionen)}
    if gefahr: s['gefahr'] = True
    return s

def R(ort, text, minuten, weiter, unterwegs=None, begegnung=None, chance=0.5):
    s = {'ort': ort, 'text': text, 'reise': {'minuten': minuten, 'weiter': weiter}}
    if unterwegs: s['reise']['text'] = unterwegs
    if begegnung: s['reise']['begegnung'] = {'chance': chance, 'szenen': begegnung}
    return s

def MG(ort, text, art, schwer, titel, ok, nok, *optionen, spieltext=None, gefahr=False):
    s = {'ort': ort, 'text': text, 'minispiel': {'art': art, 'schwer': schwer, 'titel': titel, 'erfolg': ok, 'misserfolg': nok}, 'optionen': list(optionen)}
    if spieltext: s['minispiel']['text'] = spieltext
    if gefahr: s['gefahr'] = True
    return s

def K(ort, text, titel, gegner, dauer, ok, nok, *optionen, schwer=2, kampfort=None, spieltext=None, modus=None):
    # Horde-Kampf (Scharmützel/Schlacht). dauer in Sekunden.
    s = {'ort': ort, 'text': text, 'gefahr': True, 'minispiel': {'art': 'kampf', 'schwer': schwer, 'titel': titel, 'gegner': gegner, 'dauer': dauer, 'kampfort': kampfort or ort, 'erfolg': ok, 'misserfolg': nok}, 'optionen': list(optionen)}
    if spieltext: s['minispiel']['text'] = spieltext
    if modus: s['minispiel']['modus'] = modus
    return s

def RZ(ort, text, frage, antworten, ok, nok, hinweise=(), versuche=3, falsch=None, *optionen):
    s = {'ort': ort, 'text': text, 'raetsel': {'frage': frage, 'antworten': list(antworten), 'hinweise': list(hinweise), 'versuche': versuche, 'erfolg': ok, 'misserfolg': nok}, 'optionen': list(optionen)}
    if falsch: s['raetsel']['falsch'] = falsch
    return s

def E(ort, text, folgen=None):
    s = {'ort': ort, 'text': text, 'ende': True}
    if folgen: s['folgen'] = folgen
    return s

def ziele(s):
    out = []
    for o in s.get('optionen', []):
        out += [o.get('weiter'), o.get('erfolg', {}).get('weiter'), o.get('misserfolg', {}).get('weiter')]
    for k in ('minispiel', 'raetsel'):
        if k in s: out += [s[k]['erfolg'].get('weiter'), s[k]['misserfolg'].get('weiter')]
    if 'reise' in s: out += [s['reise']['weiter']] + s['reise'].get('begegnung', {}).get('szenen', [])
    return [x for x in out if x]

def pruefe(qid, start, sz):
    for k, s in sz.items():
        for t in ziele(s): assert t in sz, f'{qid}: {k} → {t} fehlt'
        assert s.get('ende') or s.get('reise') or s.get('optionen') or s.get('minispiel') or s.get('raetsel'), f'{qid}: Sackgasse {k}'
        for o in s.get('optionen', []):
            if 'probe' not in o and not o.get('weiter') and not s.get('ende'): raise AssertionError(f'{qid}: Option ohne Ziel in {k}: {o["text"]}')
        for kk in ('minispiel', 'raetsel'):
            if kk in s:
                for br in ('erfolg', 'misserfolg'): assert s[kk][br].get('weiter'), f'{qid}: {kk}.{br} ohne Ziel in {k}'
    seen, st = set(), [start]
    while st:
        k = st.pop()
        if k in seen: continue
        seen.add(k); st += ziele(sz[k])
    un = set(sz) - seen
    assert not un, f'{qid}: unerreichbar {un}'
    ends = [k for k, s in sz.items() if s.get('ende')]
    return len(sz), len(ends)
