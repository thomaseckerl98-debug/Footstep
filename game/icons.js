// Pixel-Symbole für die Menüleiste (16×16). '.' = transparent.
const PAL = {
  o: '#1a1410', r: '#d0ae6a', R: '#8a6a3a', w: '#b49a72', W: '#6b4b2e', d: '#3a2618', y: '#ffd27a',
  s: '#e0a87e', S: '#a8724e', h: '#3d2a1c', c: '#3f5a74', C: '#6888a6', f: '#d8c49a', F: '#9a845e',
  b: '#9a6a3c', B: '#5e3e22', g: '#e8c25a', G: '#a8842e', p: '#efe3c2', P: '#bfae86', m: '#7a9a52', M: '#4f7036',
  u: '#5a88b8', x: '#b04a32', X: '#7a2e20', k: '#b8bcc4', K: '#6a6e78', t: '#5a3e28',
};
export const ICONS = {
  dorf: [
    '................', '.......oo.......', '......orro......', '.....orrRro.....', '....orrrrrro....', '...orRrrrrRro...',
    '..orrrrrrrrrro..', '.oooooooooooooo.', '..owwwwwwwwwwo..', '..owyywddwyywo..', '..owyywddwyywo..', '..owwwwddwwwwo..',
    '..oWwwwddwwwWo..', '..oWWWWddWWWWo..', '..oooooooooooo..', '................'],
  bewohner: [
    '................', '...ooo.....ooo..', '..ohhho...ohhho.', '..ossso...ossso.', '..ossso...ossso.', '...oso.....oso..',
    '..occco...oxxxo.', '.occCcco.oxxXxxo', '.occCcco.oxxXxxo', '.occCcco.oxxXxxo', '..occco...oxxxo.', '..obobo...oBoBo.',
    '..oBoBo...oBoBo.', '..oo.oo...oo.oo.', '................', '................'],
  charakter: [
    '......oooo......', '.....occcco.....', '....occCCcco....', '...occsssscco...', '...ocssssssco...', '...ocsShhSsco...',
    '...ocssssssco...', '....ocsssco.....', '...offffffffo...', '..offFffffFffo..', '.occcccCCccccco.', '.occccCccCcccco.',
    '.occccCccCcccco.', '.occgcccccgccco.', '.oooooooooooooo.', '................'],
  inventar: [
    '................', '......oooo......', '.....obBBbo.....', '......oBBo......', '....oooooooo....', '...obbbbbbbbo...',
    '..obbbbgGbbbbo..', '..obbbbGgbbbbo..', '..obbbbbbbbbbo..', '..obBbbbbbbbBo..', '..obbbbbbbbbbo..', '..obBbbbbbbbBo..',
    '...obbbbbbbbo...', '....oooooooo....', '................', '................'],
  quest: [
    '................', '..oooooooooooo..', '.oPppppppppppPo.', '..opppppppppo...', '..opPPPpPPPpo...', '..oppppppppppo..',
    '..opPPpPPPPpo...', '..oppppppppppo..', '..opPPPPpPPpo...', '..oppppppppppo..', '..opPPpPPPPpo...', '..oppppppppppo..',
    '.oPppppppppppPo.', '..oooooooooooo..', '................', '................'],
  quests: [
    '................', '.oooooooooooooo.', '.obbbbbbbbbbbbo.', '.obpxppbbpxppbo.', '.obpPPpbbpPPpbo.', '.obppppbbppppbo.',
    '.obpPPpbbpPPpbo.', '.obppppbbppppbo.', '.obbbbbbbbbbbbo.', '.obbbpxpppbbbbo.', '.obbbpPPPpbbbbo.', '.obbbpppppbbbbo.',
    '.oooooooooooooo.', '...oBo....oBo...', '...oBo....oBo...', '...ooo....ooo...'],
  karte: [
    '................', '.ooooo.ooooo.oo.', '.oppmo.oppmo.oo.', '.opmMo.omMpo.oo.', '.omMmo.oppmo.oo.', '.opmpo.opxpo.oo.',
    '.oppmo.omxmo.oo.', '.omupo.oxxxo.oo.', '.ouupo.opxpo.oo.', '.ouumo.oppmo.oo.', '.opmmo.omMmo.oo.', '.oppmo.oppmo.oo.',
    '.ooooo.ooooo.oo.', '................', '................', '................'],
  training: [
    '................', '..oo........oo..', '.okKo......oKko.', '.oKkKo....oKkKo.', '..oKkKo..oKkKo..', '...oKkKooKkKo...',
    '....oKkKKkKo....', '.....oKkkKo.....', '.....oKkkKo.....', '....oKkKKkKo....', '...oboKooKobo...', '..obBo.oo.oBbo..',
    '.obBo......oBbo.', '.oBo........oBo.', '..o..........o..', '................'],
  diplomatie: [
    'oo............oo', 'okko........okko', '.okKo......oKko.', '..okKo....oKko..', '...okKo..oKko...', '....okKooKko....',
    '.....okKKko.....', '......oKKo......', '.....okKKko.....', '....okKooKko....', '..oookKo.oKkooo.', '.ogGooo...oooGgo',
    '.oGgo......ogGo.', '..oto......oto..', '..oo........oo..', '................'],
};
export function drawIcon(cv, name, locked = false, scale = 3) {
  const grid = ICONS[name];
  cv.width = 16 * scale; cv.height = 16 * scale;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  grid.forEach((row, y) => [...row.padEnd(16, '.').slice(0, 16)].forEach((ch, x) => { if (PAL[ch]) { c.fillStyle = PAL[ch]; c.fillRect(x * scale, y * scale, scale, scale); } }));
  if (locked) { // Vorhängeschloss unten rechts
    const L = ['..ooo...', '.o...o..', '.o...o..', 'ooooooo.', 'ogggggo.', 'oggoggo.', 'ogggggo.', 'ooooooo.'];
    const lp = { o: '#1a1410', g: '#e8c25a' };
    L.forEach((row, y) => [...row].forEach((ch, x) => { if (lp[ch]) { c.fillStyle = lp[ch]; c.fillRect((8 + x) * scale, (8 + y) * scale, scale, scale); } }));
  }
}
