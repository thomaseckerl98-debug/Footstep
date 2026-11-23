// Pixel-Symbole (12×12) für die 50 Kampf-Items und 12 Legenden. iconURL(id) → Data-URL (gecacht).
const PAL = {
  k: '#1a1410', w: '#8a5a32', W: '#4a3220', m: '#c8ccd4', M: '#6a7080', s: '#f4f8fc', g: '#e8b840', G: '#9a7020',
  r: '#d03a2a', R: '#7a1a1a', o: '#f08a3a', y: '#ffe070', b: '#6ab0e8', B: '#2a5a9a', i: '#c8f0ff', l: '#6ac04a', L: '#2e6a2a',
  p: '#b8a0f0', P: '#6a50a8', e: '#ece0c4', c: '#a87a50', C: '#5a4030', n: '#9a9a9a', N: '#4a4a4e', f: '#ffffff', v: '#a8e050', t: '#2a2a30', h: '#e8b090', u: '#5a8ad0',
};
const I = {
  kurzschwert: ['..........sm', '.........smM', '........smM.', '.......smM..', '......smM...', '.....smM....', '..g.smM.....', '...gsM......', '...Gg.......', '..WG.g......', '.WW.........', 'kW..........'],
  wurfaxt: ['...MMMm.....', '..MmmssM....', '.Mmmmsm.....', '.MmmmmMw....', '..MMMM.w....', '.......w....', '........w...', '........w...', '.........w..', '.........w..', '..........W.', '..........W.'],
  speer: ['..........ss', '.........smM', '........mMM.', '.......kMk..', '......w.....', '.....w......', '....w.......', '...w........', '..w.........', '.w..........', 'W...........', '............'],
  bogen: ['...ww.......', '..w..e......', '.w...e......', '.w....e.....', 'w.....e.....', 'w..mMMe>....', 'w.....e.....', '.w....e.....', '.w...e......', '..w..e......', '...ww.......', '............'],
  armbrust: ['............', '..e......e..', '...e....e...', '....e..e....', 'wwwwwwwwwwMs', 'WWWWWWWWWW..', '....ee......', '...W........', '...W........', '..WW........', '............', '............'],
  schleuder: ['.w.......w..', '.w.......w..', '..w.....w...', '..cw...wc...', '...cw.wc....', '....nNn.....', '....nnn.....', '.....w......', '.....w......', '.....w......', '.....W......', '............'],
  wurfmesser: ['......s.....', '.....sm..s..', '....smM.sm..', '...smM.smM..', '...gM.smM...', '..Wg.gsM....', '.WW..WgM....', '.....WW.....', '....WW......', '............', '............', '............'],
  kraeuterbeutel: ['.....l.l....', '....lLlL....', '.....LL.....', '....cccc....', '...ccccCc...', '..cclclccC..', '..cllllccC..', '..ccllcccC..', '..cccccccC..', '...cccccC...', '....CCCC....', '............'],
  fackel: ['.....y......', '....yoy.....', '....oyo.....', '...oyyro....', '...oroor....', '....rRr.....', '....WwW.....', '.....w......', '.....w......', '.....w......', '.....W......', '.....W......'],
  glutstein: ['............', '....rrrr....', '...roooRr...', '..rooyyoRr..', '..royyyyoR..', '..royyyyoR..', '..rooyyoRR..', '...rooooR...', '....RRRR....', '..o......o..', '.o..o..o..o.', '............'],
  eiszapfen: ['bbbbbbbbbbbb', '.iBi.iBi.iB.', '.iB..iB..iB.', '.ib..ib..ib.', '..b..ib...b.', '..b...b...b.', '......b.....', '......b.....', '............', '..i.....i...', '.i.i...i.i..', '............'],
  frostkranz: ['.....i......', '...i.b.i....', '..b.....b...', '.i.......i..', 'ib.......bi.', '.i.......i..', '..b.....b...', '...i.b.i....', '.....i......', '....ifi.....', '.....i......', '............'],
  donnerkeil: ['....tttt....', '..ttNNNNtt..', '.tNNNNNNNNt.', '..tttyttt...', '.....y......', '....yy......', '...yyyyy....', '.....yy.....', '.....y......', '....y.......', '...y........', '............'],
  sturmglocke: ['.....g......', '....GgG.....', '...gyyyG....', '...gyggG....', '..gyggggG...', '..gyggggG...', '.gyggggggG..', '.GGGGGGGGG..', '.....G......', '..y.....y...', '.y.......y..', '............'],
  moorkrug: ['....CCC.....', '.....c......', '....ccc.....', '...cvvvc....', '..cvlvvvc...', '..cvvvlvc...', '..cvvvvvc...', '...cvvvc....', '....ccc.....', '..v......v..', '.vlv....vlv.', '............'],
  dornenranke: ['l.....L.....', 'Ll...L.L....', '.L..L...L.l.', '..LL..l..LL.', '..L..LLl..L.', '.L..L...L.L.', 'L..L..l..L..', '..L..LLL..L.', '.L..L...L...', 'L..L.....L..', '..L...l...L.', '.L....L.....'],
  wurzelschlag: ['............', '.....w......', '....wW......', '...w.w..w...', '..w..ww.w...', '.....wwww...', '.n..ww..w.n.', 'nnn.w....nnn', 'nnnwWw.wnnnn', 'NNwNNWwNNNNN', 'NwNNNNWNNNNN', 'NNNNNNNNNNNN'],
  geisterlaterne: ['.....kk.....', '....k..k....', '....kkkk....', '...kpppPk...', '...kpffpk...', '...kpffpk...', '...kpppPk...', '....kkkk....', '..p.....p...', '.p.p...p.p..', '..p.....p...', '............'],
  rabenschwarm: ['............', '.tt.....tt..', 'tttt...tttt.', '.ttgy.tttgy.', '..tt...tt...', '............', '....tt......', '...tttt.....', '....ttgy....', '.....tt.....', '............', '............'],
  wolfsgeist: ['...p....p...', '...pp..pp...', '...ppppppp..', '..pfppppfpp.', '..ppppppppp.', '...pppPppp..', '....ppppp...', '.....kpk....', '....ppppp...', '...p.p.p.p..', '............', '............'],
  bienenkorb: ['.....c......', '....cccc....', '...cgcccc...', '..cccgcccc..', '..gcccgccc..', '.cccccccccc.', '.cgcckkccgc.', '.ccccccccccc', '..y......y..', '.yty....yty.', '..y......y..', '............'],
  kriegshorn: ['............', '.........ee.', '........eeee', '.......eeeGe', '......eeeG..', '.....eeeG...', '....eeeG....', '..eeeeG.....', '.eeeGG......', 'GeeG........', 'GGG.........', '............'],
  bumerang: ['............', '..cc........', '..cwc.......', '...cwc......', '....cwc.....', '.....cwc....', '.....cwwc...', '....cwwc....', '...cwwc.....', '..cwwc......', '..ccc.......', '............'],
  morgenstern: ['......M.....', '.....MnM....', '...MMnnnMM..', '.....nnn....', '...MMnnnMM..', '.....MnM....', '......M.....', '......k.....', '.....k......', '....k.......', '...WW.......', '..WW........'],
  kriegshammer: ['..MMMMMMM...', '..MmmmmmM...', '..MmssmmM...', '..MMMMMMM...', '.....W......', '.....w......', '.....w......', '.....w......', '.....w......', '.....W......', '....WWW.....', '............'],
  runenstein: ['............', '...NNNNN....', '..NnnnnnN...', '.NnnpnnnnN..', '.NnnpppnnnN.', '.NnnpnpnnN..', '.NnnpnnpnN..', '.NnnpnnnnN..', '.NnnnnnnnN..', '..NNNNNNN...', '............', '............'],
  sonnenspiegel: ['.y...y...y..', '..y..y..y...', '...ggggg....', 'y.gyyyyyg.y.', '..gyfffyg...', 'yygyfffygyy.', '..gyfffyg...', 'y.gyyyyyg.y.', '...ggggg....', '..y..y..y...', '.y...y...y..', '............'],
  mondsichel: ['....pppp....', '..ppfp......', '.pffp.......', '.pfp........', 'pfp.........', 'pfp.........', 'pfp.........', '.pfp........', '.pffp.......', '..ppfp......', '....pppp....', '............'],
  eisenwille: ['............', '..MMMMMMMM..', '.MmmmmmmmmM.', '.MmssmmmmmM.', '.MmmmmmmmmM.', '.MmmmMMmmmM.', '..MmmmmmmM..', '..MmmmmmmM..', '...MmmmmM...', '....MmmM....', '.....MM.....', '............'],
  falkenauge: ['............', '...gggggg...', '..gyyyyyyg..', '.gyyykkyyyg.', 'gyyykkkkyyyg', 'gyyykkfkyyyg', '.gyyykkyyyg.', '..gyyyyyyg..', '...gggggg...', '............', '............', '............'],
  hasenpfote: ['............', '...e.e......', '..eee.e.....', '..eheeee....', '...eeeeee...', '....eeeeee..', '.....eeeee..', '......eeee..', '......c.c...', '.....c..c...', '.....cc.cc..', '............'],
  gluecksklee: ['............', '...ll..ll...', '..lllllllll.', '..llllLllll.', '...llLLLll..', '..llllLllll.', '..lllllllll.', '...ll.Lll...', '......L.....', '.....L......', '....L.......', '............'],
  moosherz: ['............', '..ll....ll..', '.lllL..lllL.', 'llLlllllLlll', 'lllLllllllLl', 'lLllllLllll.', '.llllLlllll.', '..lllllLll..', '...llllll...', '....llll....', '.....ll.....', '............'],
  eulenfeder: ['.........e..', '........eeC.', '.......eeeC.', '......eeeC..', '.....eeeC...', '....eeeC....', '...eeeC.....', '..eeeC......', '..eeC.......', '.cC.........', 'c...........', '............'],
  schleifstein: ['............', '............', '..nnnnnnnn..', '.nnnnnnnnnn.', '.nfnnnnnnnn.', '.nnnnnnnnnn.', '.NNNNNNNNNN.', '..NNNNNNNN..', '...s........', '....s.......', '.....s......', '............'],
  zunderbuechse: ['.....y......', '....yo......', '...cccc.....', '..ccccccc...', '..cGGGGGc...', '..cGyoyGc...', '..cGoyoGc...', '..cGGGGGc...', '..ccccccc...', '..CCCCCCC...', '............', '............'],
  frostzahn: ['............', '..i......i..', '..ii....ii..', '..iib..bii..', '...ib..bi...', '...ib..bi...', '...ib..bi...', '....b..b....', '....b..b....', '.....bb.....', '............', '............'],
  blitzbernstein: ['.....GG.....', '....GggG....', '...GgyygG...', '...Ggyyg....', '..Ggyyygg...', '..Ggykyyg...', '..Ggyykyg...', '..Ggyyyyg...', '...Ggyygg...', '....GggG....', '.....GG.....', '............'],
  schlangenzahn: ['............', '..ee....ee..', '..eee..eee..', '...ee..ee...', '...ee..ee...', '...ev..ve...', '....v..v....', '....v..v....', '.....vv.....', '.....v......', '.....v......', '............'],
  wolfsfell: ['............', '..c......c..', '..cc....cc..', '..cccccccc..', '.cccnnnnccc.', '.ccnnnnnncc.', '.ccnnnnnncc.', '.ccnnnnnncc.', '..cnnnnnnc..', '..cc.cc.cc..', '..c..c...c..', '............'],
  riesenring: ['............', '....pppp....', '...pffppp...', '...g....g...', '..g......g..', '..g......g..', '..g......g..', '..g......g..', '...g....g...', '....gggg....', '............', '............'],
  sanduhr: ['.WWWWWWWWW..', '..geeeeeg...', '..geyyyeg...', '...geyeg....', '....gyg.....', '.....g......', '....gyg.....', '...geyeg....', '..geyyyeg...', '..gyyyyyg...', '.WWWWWWWWW..', '............'],
  doppelsehne: ['..w......w..', '.w.e....w.e.', 'w..e...w..e.', 'w...e..w...e', 'w...e..w...e', 'w...e..w...e', 'w...e..w...e', 'w..e...w..e.', '.w.e....w.e.', '..w......w..', '............', '............'],
  magnetstein: ['............', '..rr....MM..', '.rrr....MMM.', '.rr......MM.', '.rr......MM.', '.rr......MM.', '.rrr....MMM.', '..rrrrMMMM..', '...rrrMMM...', '............', '..b..b..b...', '............'],
  kraehenfeder: ['.........t..', '........ttu.', '.......tttu.', '......tttu..', '.....tttu...', '....tttu....', '...tttu.....', '..tttu......', '..ttu.......', '.Nu.........', 'N...........', '............'],
  dornenpanzer: ['..l......l..', '.lMMMMMMMMl.', '.MmmmLmmmmM.', 'lMmmLLLmmmMl', '.MmmmLmmmmM.', '.MmLmmmmLmM.', 'lMLLLmmLLLMl', '.MmLmmmmLmM.', '..MmmmmmmM..', '..lMmmmmMl..', '....MMMM....', '............'],
  kriegsbemalung: ['............', '...hhhhhh...', '..hhhhhhhh..', '..hrrhhrrh..', '..hhkhhkhh..', '..rhhhhhhr..', '..rrhhhhrr..', '..hrrhhrrh..', '...hhrrhh...', '....hhhh....', '............', '............'],
  wegzehrung: ['............', '............', '...cccccc...', '..cooooooc..', '.cooccocooc.', '.coooooooocC', '.cooocooooc.', '..cccccccc..', '..CCCCCCCC..', '............', '............', '............'],
  ahnenstein: ['.....NN.....', '....NnnN....', '...NnnnnN...', '...NngnnN...', '..NnngnnnN..', '..NngggnnN..', '..NnngnnnN..', '..NnngnnnN..', '.NnnnnnnnnN.', '.NNNNNNNNNN.', 'LLLLLLLLLLLL', '............'],
  trollblut: ['....kkk.....', '.....M......', '....kkk.....', '...kLllk....', '..kLllllk...', '..klLlllk...', '..kllllLk...', '..klllllk...', '...kllLk....', '....kkk.....', '............', '............'],
  // Legenden
  feuersturm: ['..o.....o...', '.oyo...oyo..', '..o.rrr.o...', '...roooR....', 'o.royyoR.o..', 'yorygyyoRoy.', 'o.royyoR.o..', '...roooR....', '..o.RRR.o...', '.oyo...oyo..', '..o.....o...', '............'],
  ewigerwinter: ['i....i....i.', '.i...i...i..', '..i..b..i...', '...i.b.i....', '....ibi.....', 'iibbbfbbbii.', '....ibi.....', '...i.b.i....', '..i..b..i...', '.i...i...i..', 'i....i....i.', '............'],
  gewitterzorn: ['.tttttttttt.', 'tNNNNNNNNNNt', '.ttyttttytt.', '...y....y...', '..yy...yy...', '.yyyyy.yyyy.', '...yy...yy..', '...y....y...', '..y....y....', '.y....y.....', '............', '............'],
  wildejagd: ['.p.p....p.p.', '.ppp....ppp.', 'pfpp...pfpp.', 'pppp...pppp.', '.ppppppppp..', '..pppppppp..', '..p.p..p.p..', '............', '.....w......', '....wew.....', '...w.e.w....', '.....e......'],
  weltenwurzel: ['....llll....', '..llLlllLl..', '.llllLlllll.', '..llLllLll..', '....lwwl....', '.....ww.....', '.....ww.....', '....wwww....', '..ww.ww.ww..', '.w..w..w..w.', 'w..w....w..w', '............'],
  klingentanz: ['.....s......', '..s..m..s...', '...smMsm....', '....mMm.....', '.smmMfMmms..', '....mMm.....', '...smMsm....', '..s..m..s...', '.....s......', '............', '............', '............'],
  seuchenwind: ['...vvvv.....', '.vvlvvvvv...', 'vvvvvlvvvv..', '.vvvvvvvlvv.', '..vvlvvvvv..', '....vvvvv...', '.v....v...v.', 'vlv......vlv', '.v..v.....v.', '...vlv......', '....v.......', '............'],
  totentanz: ['.p..ee...p..', 'pfp.eee.pfp.', '.p.ekekep...', '...eeeee....', '....eke.....', '..e.eee.e...', '.e..e.e..e..', '...e...e....', '..e.....e...', '.p.......p..', 'pfp.....pfp.', '.p.......p..'],
  ahnenhammer: ['.MMMMMMMMMM.', '.MgggmmgggM.', '.MgmssmmggM.', '.MMMMMMMMMM.', '.....WW.....', '.....ww.....', '.....ww.....', '.....ww.....', '.n...ww...n.', 'nNn..WW..nNn', 'NNNNNNNNNNNN', '............'],
  sonnenrad: ['y....y....y.', '.y...y...y..', '..y.ggg.y...', '...gyyyg....', 'yyyyfffyyyy.', '...gyyyg....', '..y.ggg.y...', '.y...y...y..', 'y....y....y.', '............', '............', '............'],
  pfeilregen: ['.e..e..e..e.', '.e..e..e..e.', '.e..e..e..e.', '.m..m..m..m.', 'mMm.mMmmMmmM', '............', '..e..e..e...', '..e..e..e...', '..m..m..m...', '.mMm.mMmmMm.', '............', 'LLLLLLLLLLLL'],
  sturmwirbel: ['....MMw.....', '...Mmmw..cc.', '......w.cwc.', '.cc....cwc..', 'cwc.........', '.cwc....w...', '..cc...ww...', '......wMMM..', '.....w.MmmM.', '............', '..MMw.......', '.Mmmw.......'],
};
const cache = {};
export function iconURL(id) {
  if (cache[id]) return cache[id];
  const rows = I[id]; if (!rows) return null;
  const cv = document.createElement('canvas'); cv.width = 14; cv.height = 14; const g = cv.getContext('2d');
  const set = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  // dunkle Kontur um alle Pixel
  const on = (x, y) => y >= 0 && y < 12 && x >= 0 && x < 12 && PAL[(rows[y] || '')[x]];
  for (let y = -1; y <= 12; y++) for (let x = -1; x <= 12; x++) if (!on(x, y) && (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1))) set(x + 1, y + 1, 'rgba(20,14,10,.85)');
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const c = PAL[(rows[y] || '')[x]]; if (c) set(x + 1, y + 1, c); }
  return (cache[id] = cv.toDataURL());
}
export const HAT_ICON = (id) => !!I[id];
