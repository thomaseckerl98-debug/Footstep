// Erzeugt die Startdaten der Welt (Reiche, Orte, Plätze, Beziehungen) als SQL aus game/welt_daten.js.
// Aufruf: node tools/welt_sql.mjs > migrations/032b_welt_daten.sql
import { REICHE, ORTE, SPIELERPLAETZE, BEZIEHUNGEN } from '../game/welt_daten.js';
const q = (v) => v == null ? 'null' : typeof v === 'number' ? String(v) : Array.isArray(v) ? `array[${v.map(q).join(',')}]::text[]` : `'${String(v).replace(/'/g, "''")}'`;
const out = ['-- automatisch erzeugt aus game/welt_daten.js (tools/welt_sql.mjs)'];
for (const [id, r] of Object.entries(REICHE)) out.push(`insert into public.welt_reiche (id, name, kurz, herrscher, farbe, wappen) values (${[id, r.name, r.kurz, r.herrscher, r.farbe, r.wappen].map(q).join(', ')}) on conflict (id) do update set name = excluded.name, kurz = excluded.kurz, herrscher = excluded.herrscher, farbe = excluded.farbe, wappen = excluded.wappen;`);
for (const o of ORTE) out.push(`insert into public.welt_orte (id, name, art, reich, x, y, stil, spezial, haeuser, mauer, tuerme, wohlstand, einwohner, text, existenz) values (${[o.id, o.name, o.art, o.reich, o.x, o.y, o.stil, o.spezial, o.haeuser, o.mauer, o.tuerme, 55, Math.round(o.haeuser * ({ dorf: 6, stadt: 14, grossstadt: 32, burg: 10, kloster: 6 }[o.art]) * 1.0), o.text, o.existenz].map(q).join(', ')}) on conflict (id) do nothing;`);
for (const p of SPIELERPLAETZE) out.push(`insert into public.welt_plaetze (id, name, landschaft, x, y) values (${[p.id, p.name, p.landschaft, p.x, p.y].map(q).join(', ')}) on conflict (id) do nothing;`);
for (const [a, b, art, grund] of BEZIEHUNGEN) out.push(`insert into public.welt_beziehungen (a, b, art, grund) values (${[a, b, art, grund].map(q).join(', ')}) on conflict (a, b, art) do nothing;`);
console.log(out.join('\n'));
