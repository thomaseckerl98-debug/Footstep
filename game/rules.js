// Spielregeln, die Client und Server teilen: Herkunft, Eigenschaften, Fertigkeitsproben.
// Der Server (char_attrs, talk_check) rechnet dasselbe; gewürfelt wird nur dort.
export const ATTRS = { staerke: 'Stärke', geschick: 'Geschick', sinne: 'Sinne', charme: 'Charme', wissen: 'Wissen', wille: 'Wille' };
export const HERKUNFT = {
  waldlaeufer: { name: 'Waldläufer', desc: 'Lebt mit dem Wald, liest Spuren, ist schnell und leise.', base: { staerke: 2, geschick: 3, sinne: 3, charme: 1, wissen: 1, wille: 2 } },
  krieger: { name: 'Krieger', desc: 'Kraft und Standhaftigkeit. Wird respektiert, manchmal gefürchtet.', base: { staerke: 4, geschick: 2, sinne: 1, charme: 1, wissen: 1, wille: 3 } },
  haendler: { name: 'Händler', desc: 'Redegewandt, kennt Preise und Leute, schließt Geschäfte.', base: { staerke: 1, geschick: 2, sinne: 2, charme: 4, wissen: 2, wille: 1 } },
  gelehrter: { name: 'Gelehrter', desc: 'Kennt alte Schriften, Karten und Geschichten.', base: { staerke: 1, geschick: 1, sinne: 2, charme: 2, wissen: 4, wille: 2 } },
  heiler: { name: 'Heiler', desc: 'Kräuter, Wunden und ruhige Worte. Beruhigt Ängstliche.', base: { staerke: 1, geschick: 1, sinne: 2, charme: 2, wissen: 3, wille: 3 } },
  schurke: { name: 'Schurke', desc: 'Flink, durchschaut Lügen, nimmt es mit Regeln nicht so genau.', base: { staerke: 1, geschick: 4, sinne: 3, charme: 2, wissen: 1, wille: 1 } },
};
const RACE_MOD = { elf: { geschick: 1, sinne: 2, staerke: -1 }, zwerg: { staerke: 2, wille: 1, geschick: -1 }, halbling: { geschick: 1, charme: 1, staerke: -1 }, mensch: { charme: 1, wille: 1 } };
export function charAttrs(race = 'mensch', herkunft = 'waldlaeufer') {
  const b = (HERKUNFT[herkunft] || HERKUNFT.waldlaeufer).base, m = RACE_MOD[race] || RACE_MOD.mensch, out = {};
  for (const k of Object.keys(ATTRS)) out[k] = Math.max(1, Math.min(6, b[k] + (m[k] || 0)));
  return out;
}
// Proben: Eigenschaft, Grundschwierigkeit, Herkunft mit +2. Muss zu talk_check (Migration 007) passen.
export const CHECKS = {
  spuren: { attr: 'sinne', dc: 12, fav: 'waldlaeufer', name: 'Spuren lesen' },
  menschenkenntnis: { attr: 'sinne', dc: 13, fav: 'schurke', name: 'Menschenkenntnis' },
  ueberreden: { attr: 'charme', dc: 13, fav: 'haendler', name: 'Überreden' },
  einschuechtern: { attr: 'staerke', dc: 14, fav: 'krieger', name: 'Einschüchtern' },
  altes_wissen: { attr: 'wissen', dc: 12, fav: 'gelehrter', name: 'Altes Wissen' },
  flink: { attr: 'geschick', dc: 12, fav: 'schurke', name: 'Flink' },
  beruhigen: { attr: 'wille', dc: 12, fav: 'heiler', name: 'Beruhigen' },
  feilschen: { attr: 'charme', dc: 14, fav: 'haendler', name: 'Feilschen' },
  heilkunde: { attr: 'wissen', dc: 11, fav: 'heiler', name: 'Heilkunde' },
  anpacken: { attr: 'staerke', dc: 11, fav: 'krieger', name: 'Anpacken' },
};
// Wahrscheinlichkeit (grob, ohne Wesen der Figur) – nur für die Anzeige "leicht / schwer"
export function checkOdds(id, attrs, herkunft) {
  const c = CHECKS[id]; if (!c) return 0;
  const need = c.dc - ((attrs?.[c.attr] ?? 2) - 2) - (herkunft === c.fav ? 2 : 0);
  return Math.max(0.05, Math.min(0.95, (21 - need) / 20));
}
export const oddsWord = (p) => (p >= 0.75 ? 'leicht' : p >= 0.55 ? 'machbar' : p >= 0.35 ? 'schwer' : 'sehr schwer');
