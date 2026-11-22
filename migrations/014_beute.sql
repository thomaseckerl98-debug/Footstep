-- Migration 014: Zufallsbeute. Ausrüstung = Grundtyp + Material + Eigenschaften, 5 Seltenheitsstufen, legendäre Einzelstücke (weltweit nur einmal).
-- Effekte bleiben glaubwürdig: Probenboni, Schutz, Haltbarkeit, Glücksbringer (einmal pro Quest neu würfeln), sicherer erster Versuch.
-- Gegen Stapeln: Pro Kategorie (Waffe, Rüstung, Kleidung, Talisman, Werkzeug) zählt automatisch das beste passende Stück.

create table if not exists public.gear_bases (
  id text primary key, name text not null, genus text not null check (genus in ('m','n','f','pl')),
  art text not null check (art in ('waffe','ruestung','kleidung','talisman')),
  bonus jsonb not null default '{}', schutz int not null default 0, gewicht int not null default 10,
  materialien jsonb not null,   -- [{"p":"Eiben","stufe":2,"bonus":{"flink":1}}]  stufe 0..3
  tags text[] not null default '{}'
);
create table if not exists public.gear_affixes (
  id text primary key, adj text not null, -- Adjektivstamm ohne Endung, z. B. 'ausbalanciert'
  arten text[] not null, tags text[] not null default '{}', bonus jsonb not null default '{}', schutz int not null default 0,
  spezial text, text text not null, gewicht int not null default 10
);
create table if not exists public.gear_legendary (
  id text primary key, basis text not null references public.gear_bases(id), name text not null,
  bonus jsonb not null, schutz int not null default 0, spezial text[] not null default '{}', geschichte text not null,
  besitzer uuid references public.profiles(id), gefunden_at timestamptz
);
create table if not exists public.player_gear (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  basis text not null references public.gear_bases(id), art text not null, name text not null,
  seltenheit text not null check (seltenheit in ('gewoehnlich','gut','selten','meister','legendaer')),
  bonus jsonb not null default '{}', schutz int not null default 0, spezial text[] not null default '{}',
  eigenschaften jsonb not null default '[]', beschreibung text not null default '',
  zustand int not null default 100 check (zustand between 0 and 100),
  legendaer text references public.gear_legendary(id), herkunft text not null default '',
  status text not null default 'besitz' check (status in ('besitz','abgelegt')),
  created_at timestamptz not null default now()
);
create index if not exists player_gear_owner_idx on public.player_gear (player_id, status);
alter table public.gear_bases enable row level security; alter table public.gear_affixes enable row level security;
alter table public.gear_legendary enable row level security; alter table public.player_gear enable row level security;
revoke all on public.gear_bases, public.gear_affixes, public.gear_legendary, public.player_gear from anon, authenticated;

insert into public.gear_bases (id, name, genus, art, bonus, schutz, gewicht, materialien, tags) values
 ('bogen','Bogen','m','waffe','{"flink":1}',0,12,'[{"p":"Weiden","stufe":0,"bonus":{}},{"p":"Eschen","stufe":1,"bonus":{"spuren":1}},{"p":"Eiben","stufe":2,"bonus":{"flink":1}},{"p":"Horn","stufe":3,"bonus":{"flink":1,"einschuechtern":1}}]','{fern,holz}'),
 ('schwert','Schwert','n','waffe','{"einschuechtern":1,"anpacken":1}',0,10,'[{"p":"Bronze","stufe":0,"bonus":{}},{"p":"Eisen","stufe":1,"bonus":{"anpacken":1}},{"p":"Stahl","stufe":2,"bonus":{"einschuechtern":1}},{"p":"Faltstahl","stufe":3,"bonus":{"einschuechtern":1,"anpacken":1}}]','{klinge,metall}'),
 ('dolch','Dolch','m','waffe','{"einschuechtern":1}',0,12,'[{"p":"Bronze","stufe":0,"bonus":{}},{"p":"Eisen","stufe":1,"bonus":{"flink":1}},{"p":"Stahl","stufe":2,"bonus":{"einschuechtern":1}},{"p":"Faltstahl","stufe":3,"bonus":{"einschuechtern":1,"flink":1}}]','{klinge,metall,leise}'),
 ('axt','Axt','f','waffe','{"anpacken":1,"einschuechtern":1}',0,10,'[{"p":"Stein","stufe":0,"bonus":{}},{"p":"Eisen","stufe":1,"bonus":{"anpacken":1}},{"p":"Stahl","stufe":2,"bonus":{"einschuechtern":1}},{"p":"Bart","stufe":3,"bonus":{"anpacken":1,"einschuechtern":1}}]','{metall,holz}'),
 ('speer','Speer','m','waffe','{"anpacken":1}',0,9,'[{"p":"Hartholz","stufe":0,"bonus":{}},{"p":"Eschen","stufe":1,"bonus":{"flink":1}},{"p":"Eisen","stufe":2,"bonus":{"anpacken":1}},{"p":"Stahl","stufe":3,"bonus":{"anpacken":1,"einschuechtern":1}}]','{holz,metall}'),
 ('saebel','Säbel','m','waffe','{"einschuechtern":1,"flink":1}',0,7,'[{"p":"Eisen","stufe":1,"bonus":{}},{"p":"Stahl","stufe":2,"bonus":{"flink":1}},{"p":"Faltstahl","stufe":3,"bonus":{"einschuechtern":1,"flink":1}}]','{klinge,metall}'),
 ('wams','Wams','n','ruestung','{}',1,12,'[{"p":"Filz","stufe":0,"bonus":{}},{"p":"Leder","stufe":1,"bonus":{}},{"p":"Hartleder","stufe":2,"bonus":{"anpacken":1}},{"p":"Elchleder","stufe":3,"bonus":{"anpacken":1,"flink":1}}]','{leder,leise}'),
 ('gambeson','Gambeson','m','ruestung','{}',1,8,'[{"p":"Leinen","stufe":0,"bonus":{}},{"p":"Woll","stufe":1,"bonus":{"beruhigen":1}},{"p":"Steppleinen","stufe":2,"bonus":{"anpacken":1}}]','{stoff}'),
 ('kettenhemd','Kettenhemd','n','ruestung','{"flink":-1}',2,7,'[{"p":"Eisen","stufe":1,"bonus":{}},{"p":"Stahl","stufe":2,"bonus":{"einschuechtern":1}},{"p":"Feinstahl","stufe":3,"bonus":{"einschuechtern":1,"flink":1}}]','{metall}'),
 ('umhang','Umhang','m','kleidung','{"flink":1}',0,10,'[{"p":"Loden","stufe":0,"bonus":{}},{"p":"Woll","stufe":1,"bonus":{"spuren":1}},{"p":"Wachstuch","stufe":2,"bonus":{"flink":1}},{"p":"Otterfell","stufe":3,"bonus":{"flink":1,"ueberreden":1}}]','{stoff,leise}'),
 ('stiefel','Stiefel','pl','kleidung','{"spuren":1}',0,10,'[{"p":"Filz","stufe":0,"bonus":{}},{"p":"Leder","stufe":1,"bonus":{"flink":1}},{"p":"Wildleder","stufe":2,"bonus":{"flink":1}},{"p":"Robbenleder","stufe":3,"bonus":{"flink":1,"spuren":1}}]','{leder,leise}'),
 ('gewand','Gewand','n','kleidung','{"ueberreden":1}',0,8,'[{"p":"Leinen","stufe":0,"bonus":{}},{"p":"Woll","stufe":1,"bonus":{"feilschen":1}},{"p":"Samt","stufe":2,"bonus":{"ueberreden":1}},{"p":"Seiden","stufe":3,"bonus":{"ueberreden":1,"feilschen":1}}]','{stoff}'),
 ('amulett','Amulett','n','talisman','{"beruhigen":1}',0,8,'[{"p":"Knochen","stufe":0,"bonus":{}},{"p":"Bernstein","stufe":1,"bonus":{"menschenkenntnis":1}},{"p":"Silber","stufe":2,"bonus":{"ueberreden":1}},{"p":"Gold","stufe":3,"bonus":{"ueberreden":1,"feilschen":1}}]','{schmuck}'),
 ('ring','Ring','m','talisman','{"feilschen":1}',0,6,'[{"p":"Kupfer","stufe":0,"bonus":{}},{"p":"Silber","stufe":1,"bonus":{"ueberreden":1}},{"p":"Gold","stufe":2,"bonus":{"feilschen":1}},{"p":"Siegel","stufe":3,"bonus":{"ueberreden":1,"einschuechtern":1}}]','{schmuck}')
on conflict (id) do update set name = excluded.name, genus = excluded.genus, art = excluded.art, bonus = excluded.bonus, schutz = excluded.schutz, gewicht = excluded.gewicht, materialien = excluded.materialien, tags = excluded.tags;

insert into public.gear_affixes (id, adj, arten, tags, bonus, schutz, spezial, text, gewicht) values
 ('ausbalanciert','ausbalanciert','{waffe}','{}','{"flink":1}',0,null,'Liegt perfekt in der Hand.',10),
 ('gezackt','gezackt','{waffe}','{klinge}','{"einschuechtern":1}',0,null,'Die Schneide ist grausam gezahnt – allein der Anblick wirkt.',8),
 ('schwer','wuchtig','{waffe}','{metall}','{"anpacken":1}',0,null,'Mehr Gewicht hinter jedem Hieb.',8),
 ('jaegerkerben','gekerbt','{waffe}','{fern,holz}','{"spuren":1}',0,null,'Kerben eines alten Jägers zählen erlegtes Wild.',7),
 ('leise','umwickelt','{waffe,kleidung,ruestung}','{leise}','{"flink":1}',0,null,'Gefettet und umwickelt – kein Klirren, kein Knarzen.',9),
 ('verziert','verziert','{waffe,talisman,kleidung}','{}','{"ueberreden":1}',0,null,'Feine Arbeit, die Respekt verschafft.',8),
 ('gehaertet','gehärtet','{ruestung}','{}','{}',1,null,'Hält mehr aus, als man ihm ansieht.',10),
 ('leicht','leicht','{ruestung}','{}','{"flink":1}',0,null,'Erstaunlich leicht für seinen Schutz.',8),
 ('gepolstert','gepolstert','{ruestung}','{}','{"anpacken":1}',0,null,'Dicke Polster dämpfen Stöße.',7),
 ('zaeh','zäh','{ruestung}','{}','{}',0,'unverwuestlich','Nutzt sich kaum ab.',6),
 ('edel','edel','{kleidung,talisman}','{}','{"ueberreden":1,"feilschen":1}',0,null,'Wer das trägt, wird anders behandelt.',7),
 ('wetterfest','wetterfest','{kleidung}','{}','{"spuren":1}',0,null,'Regen perlt ab, der Wind findet keinen Weg hinein.',8),
 ('beruhigend','abgegriffen','{talisman}','{}','{"beruhigen":1}',0,null,'Viele Hände haben es gehalten, wenn es schwer wurde.',8),
 ('glueck','glückbringend','{talisman,kleidung}','{}','{}',0,'neuwurf','Ein Glücksbringer. Man sagt, er hilft, wenn es darauf ankommt (einmal pro Abenteuer neu würfeln).',5),
 ('kundig','beschriftet','{talisman}','{}','{"altes_wissen":1}',0,null,'Winzige, alte Zeichen bedecken es.',6),
 ('wachsam','wachsam','{talisman,kleidung}','{}','{"menschenkenntnis":1}',0,null,'Man fühlt sich damit aufmerksamer – vielleicht ist es nur Einbildung.',6)
on conflict (id) do update set adj = excluded.adj, arten = excluded.arten, tags = excluded.tags, bonus = excluded.bonus, schutz = excluded.schutz, spezial = excluded.spezial, text = excluded.text, gewicht = excluded.gewicht;

insert into public.gear_legendary (id, basis, name, bonus, schutz, spezial, geschichte) values
 ('sturmeibe','bogen','Sturmeibe des Fährmanns','{"flink":3,"spuren":1}',0,'{erster_sicher_flink}','Geschnitzt aus einer Eibe, die an der alten Fähre vom Blitz gespalten wurde. Der erste Schuss jedes Abenteuers trifft.'),
 ('narbenwams','wams','Narbenwams','{"anpacken":1}',3,'{unverwuestlich}','Ein Wams voller geflickter Risse. Wer es trug, kam immer nach Hause – nur nie ohne Narbe.'),
 ('witwenklinge','dolch','Witwenklinge','{"einschuechtern":3,"menschenkenntnis":1}',0,'{}','In die Klinge sind sieben Namen geritzt. Die Witwe, der sie gehörte, hat keinen davon vergessen.'),
 ('graumantel','umhang','Graumantel der Grenzläufer','{"flink":3,"spuren":1}',0,'{}','Die Grenzläufer vom Pass trugen solche Mäntel. Dieser hat drei Winter im Schnee überdauert.'),
 ('brueckenbrecher','axt','Brückenbrecher','{"anpacken":3,"einschuechtern":2}',0,'{}','Mit dieser Axt soll ein einzelner Mann die Brücke über die Klamm gekappt haben – mit dem Feind darauf.'),
 ('vogtsring','ring','Siegelring des letzten Vogts','{"ueberreden":2,"feilschen":2}',0,'{neuwurf}','Das Siegel öffnet noch immer Türen, obwohl es den Vogt längst nicht mehr gibt.'),
 ('steppenhorn','bogen','Hornbogen der Reiterin','{"flink":2,"einschuechtern":1,"spuren":1}',0,'{}','Aus Horn und Sehne geleimt, weit im Osten. Wie er ins Tal kam, weiß niemand.'),
 ('eisenhemd','kettenhemd','Eisenhemd vom Roten Feld','{"einschuechtern":2}',3,'{}','Gefunden auf dem alten Schlachtfeld. Die Ringe sind dunkel – ob vom Rost oder vom Blut, sagt man nicht.')
on conflict (id) do update set basis = excluded.basis, name = excluded.name, bonus = excluded.bonus, schutz = excluded.schutz, spezial = excluded.spezial, geschichte = excluded.geschichte;

-- Hilfen
create or replace function public.jsonb_add_bonus(a jsonb, b jsonb) returns jsonb language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from (
    select k, sum(v)::int v from (select key k, value::int v from jsonb_each_text(coalesce(a,'{}')) union all select key, value::int from jsonb_each_text(coalesce(b,'{}'))) x group by k having sum(v) <> 0) y;
$$;
create or replace function public.adj_end(adj text, genus text) returns text language sql immutable set search_path = public as $$
  select initcap(left(adj,1)) || substr(adj,2) || case genus when 'm' then 'er' when 'n' then 'es' else 'e' end;
$$;
-- Beute würfeln und dem Spieler geben. p_stufe 1 (leicht) .. 3 (schwer) verschiebt die Seltenheit.
create or replace function public.loot_roll(p_uid uuid, p_stufe int default 1, p_art text default null, p_herkunft text default '') returns json language plpgsql security definer set search_path = public as $$
declare s int := greatest(1, least(3, coalesce(p_stufe, 1))); x numeric := random() * 100; sel text; b gear_bases; m jsonb; leg gear_legendary;
  naff int; aff record; bonus jsonb; schutz int; spez text[] := '{}'; props jsonb := '[]'; adjs text[] := '{}'; nm text; beschr text; maxstufe int; gid bigint;
  meister text[] := array['Haldor','Ingrun','Berthold','Wenzel','Agathe','Ruprecht','Sigrun','Oswin'];
begin
  -- Seltenheit: Stufe 1: 60/25/11/3.5/0.5 · Stufe 2: 45/30/17/6.5/1.5 · Stufe 3: 30/32/24/11/3
  sel := case
    when x < (case s when 1 then 0.5 when 2 then 1.5 else 3 end) then 'legendaer'
    when x < (case s when 1 then 4 when 2 then 8 else 14 end) then 'meister'
    when x < (case s when 1 then 15 when 2 then 25 else 38 end) then 'selten'
    when x < (case s when 1 then 40 when 2 then 55 else 70 end) then 'gut'
    else 'gewoehnlich' end;
  if sel = 'legendaer' then
    select * into leg from gear_legendary l where l.besitzer is null and (p_art is null or exists (select 1 from gear_bases gb where gb.id = l.basis and gb.art = p_art)) order by random() limit 1 for update skip locked;
    if leg.id is null then sel := 'meister'; -- alle vergeben: dann eben ein Meisterstück
    else
      update gear_legendary set besitzer = p_uid, gefunden_at = now() where id = leg.id;
      select * into b from gear_bases where id = leg.basis;
      insert into player_gear (player_id, basis, art, name, seltenheit, bonus, schutz, spezial, eigenschaften, beschreibung, legendaer, herkunft)
      values (p_uid, b.id, b.art, leg.name, 'legendaer', jsonb_add_bonus(b.bonus, leg.bonus), b.schutz + leg.schutz, leg.spezial, '[]', leg.geschichte, leg.id, coalesce(p_herkunft, ''))
      returning id into gid;
      return (select gear_json(g) from player_gear g where g.id = gid);
    end if;
  end if;
  select * into b from gear_bases gb where p_art is null or gb.art = p_art order by -ln(random()) / gb.gewicht limit 1;
  maxstufe := case sel when 'gewoehnlich' then 0 when 'gut' then 1 when 'selten' then 2 else 3 end;
  select e into m from jsonb_array_elements(b.materialien) e where (e->>'stufe')::int <= maxstufe order by (e->>'stufe')::int desc, random() limit 1;
  if sel in ('gut','selten') and random() < 0.35 then -- etwas Streuung beim Material
    select e into m from jsonb_array_elements(b.materialien) e where (e->>'stufe')::int <= maxstufe order by random() limit 1;
  end if;
  if m is null then select e into m from jsonb_array_elements(b.materialien) e order by (e->>'stufe')::int limit 1; end if;
  bonus := jsonb_add_bonus(b.bonus, m->'bonus'); schutz := b.schutz + case when (m->>'stufe')::int >= 3 and b.art = 'ruestung' then 1 else 0 end;
  naff := case sel when 'gewoehnlich' then 0 when 'gut' then 1 when 'selten' then 2 else 3 end;
  for aff in select * from gear_affixes a where b.art = any(a.arten) and (cardinality(a.tags) = 0 or a.tags && b.tags) order by -ln(random()) / a.gewicht limit naff loop
    bonus := jsonb_add_bonus(bonus, aff.bonus); schutz := schutz + aff.schutz;
    if aff.spezial is not null then spez := spez || aff.spezial; end if;
    props := props || jsonb_build_object('id', aff.id, 'text', aff.text); adjs := adjs || aff.adj;
  end loop;
  nm := m->>'p' || lower(b.name);
  if b.id = 'wams' and m->>'p' = 'Leder' then nm := 'Lederwams'; end if;
  if array_length(adjs, 1) >= 1 then nm := adj_end(adjs[1], b.genus) || ' ' || nm; end if;
  if sel = 'meister' then nm := nm || ' aus ' || meister[1 + floor(random() * array_length(meister, 1))::int] || 's Werkstatt'; end if;
  beschr := case sel when 'gewoehnlich' then 'Einfach, aber brauchbar.' when 'gut' then 'Solide Handwerksarbeit.' when 'selten' then 'So etwas findet man nicht auf jedem Markt.' else 'Ein Meisterstück. Wer es sieht, fragt nach dem Schmied.' end;
  insert into player_gear (player_id, basis, art, name, seltenheit, bonus, schutz, spezial, eigenschaften, beschreibung, herkunft)
  values (p_uid, b.id, b.art, nm, sel, bonus, schutz, spez, props, beschr, coalesce(p_herkunft, ''))
  returning id into gid;
  return (select gear_json(g) from player_gear g where g.id = gid);
end;
$$;
revoke execute on function public.loot_roll(uuid, int, text, text) from public, anon, authenticated;

create or replace function public.gear_json(g player_gear) returns json language sql stable set search_path = public as $$
  select json_build_object('id', g.id, 'name', g.name, 'art', g.art, 'basis', g.basis, 'seltenheit', g.seltenheit,
    'stufe', case g.seltenheit when 'gewoehnlich' then 'Gewöhnlich' when 'gut' then 'Gut' when 'selten' then 'Selten' when 'meister' then 'Meisterstück' else 'Legendär' end,
    'bonus', g.bonus, 'schutz', case when g.zustand > 0 then g.schutz else 0 end, 'schutz_basis', g.schutz, 'spezial', g.spezial, 'eigenschaften', g.eigenschaften,
    'beschreibung', g.beschreibung, 'zustand', g.zustand, 'herkunft', g.herkunft, 'legendaer', g.legendaer is not null);
$$;

-- Alles, was der Spieler wirksam bei sich trägt (Katalog-Gegenstände + Ausrüstung)
create or replace function public.p_equipment(p_uid uuid) returns table (src text, ref text, basis text, art text, bonus jsonb, schutz int, spezial text[], unverwuestlich boolean)
language sql stable security definer set search_path = public as $$
  select 'item', i.id, i.id, i.art, i.bonus, i.schutz, '{}'::text[], true from player_items p join items i on i.id = p.item_id where p.player_id = p_uid and p.menge > 0
  union all
  select 'gear', g.id::text, g.basis, g.art, g.bonus, case when g.zustand > 0 then g.schutz else 0 end, g.spezial, 'unverwuestlich' = any(g.spezial)
  from player_gear g where g.player_id = p_uid and g.status = 'besitz';
$$;
revoke execute on function public.p_equipment(uuid) from public, anon, authenticated;

-- Wirksamer Bonus für eine Probe: getragene Rüstung = höchster Schutz (mit ihren Vor- und Nachteilen), sonst je Kategorie das beste Stück
create or replace function public.p_check_bonus(p_uid uuid, p_check text) returns int language sql stable security definer set search_path = public as $$
  with e as (select * from p_equipment(p_uid)),
  arm as (select coalesce((bonus->>p_check)::int, 0) b from e where art = 'ruestung' order by schutz desc, (select coalesce(sum(value::int),0) from jsonb_each_text(bonus)) desc limit 1),
  rest as (select art, max(coalesce((bonus->>p_check)::int, 0)) b from e where art <> 'ruestung' and art <> 'fund' group by art)
  select least(5, coalesce((select b from arm), 0) + coalesce((select sum(greatest(b, 0)) from rest), 0))::int;  -- Ausrüstung bringt höchstens +5
$$;
revoke execute on function public.p_check_bonus(uuid, text) from public, anon, authenticated;

create or replace function public.p_has(p_uid uuid, p_basis text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from p_equipment(p_uid) e where e.basis = p_basis or (p_basis = 'lederwams' and e.basis = 'wams'));
$$;
revoke execute on function public.p_has(uuid, text) from public, anon, authenticated;
create or replace function public.p_spezial(p_uid uuid, p_s text) returns text language sql stable security definer set search_path = public as $$
  select g.name from player_gear g where g.player_id = p_uid and g.status = 'besitz' and p_s = any(g.spezial) order by g.id limit 1;
$$;
revoke execute on function public.p_spezial(uuid, text) from public, anon, authenticated;

-- Bedingungen: Gegenstände aus Katalog oder Ausrüstung
create or replace function public.q_cond(p_run quest_runs, w jsonb) returns boolean language plpgsql stable security definer set search_path = public as $$
declare me record; a jsonb; k text;
begin
  if w is null or w = '{}'::jsonb then return true; end if;
  select race, coalesce(herkunft, 'waldlaeufer') herkunft into me from profiles where id = p_run.player_id;
  if w ? 'herkunft' and not (me.herkunft in (select jsonb_array_elements_text(w->'herkunft'))) then return false; end if;
  if w ? 'volk' and not (coalesce(me.race, 'mensch') in (select jsonb_array_elements_text(w->'volk'))) then return false; end if;
  if w ? 'item' and not p_has(p_run.player_id, w->>'item') then return false; end if;
  if w ? 'nicht_item' and p_has(p_run.player_id, w->>'nicht_item') then return false; end if;
  if w ? 'item_eines' and not exists (select 1 from jsonb_array_elements_text(w->'item_eines') x where p_has(p_run.player_id, x)) then return false; end if;
  if w ? 'begleiter' and (w->>'begleiter')::boolean <> (coalesce(array_length(p_run.begleiter, 1), 0) > 0) then return false; end if;
  if w ? 'begleiter_beruf' and not exists (select 1 from npcs n where n.id = any(p_run.begleiter) and n.job in (select jsonb_array_elements_text(w->'begleiter_beruf'))) then return false; end if;
  if w ? 'flag' and not (p_run.flags ? (w->>'flag')) then return false; end if;
  if w ? 'nicht_flag' and (p_run.flags ? (w->>'nicht_flag')) then return false; end if;
  if w ? 'wissen' and not exists (select 1 from player_journal where player_id = p_run.player_id and key = w->>'wissen') then return false; end if;
  if w ? 'holz' and (select village_wood(v) from villages v where v.owner_id = p_run.player_id) < (w->>'holz')::numeric then return false; end if;
  if w ? 'attr' then a := char_attrs(me.race, me.herkunft); for k in select jsonb_object_keys(w->'attr') loop if (a->>k)::int < (w->'attr'->>k)::int then return false; end if; end loop; end if;
  return true;
end;
$$;

-- Probe: Gegenstandsbonus jetzt aus p_check_bonus
create or replace function public.q_mods(p_run quest_runs, pr jsonb) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me record; a jsonb; skill text; fav text; helpers text[]; md int; bonus int; items_b int; beg int; wund int; dc int; k text;
begin
  select race, coalesce(herkunft, 'waldlaeufer') herkunft, zustand, zustand_bis into me from profiles where id = p_run.player_id;
  select x.skill, x.fav, x.helpers into skill, fav, helpers from (values
    ('spuren', 'sinne', 'waldlaeufer', array['Jäger','Jägerin','Falknerin','Hirte']), ('menschenkenntnis', 'sinne', 'schurke', array['Wirt','Schankmaid','Priesterin','Seherin']),
    ('ueberreden', 'charme', 'haendler', array['Händler','Wirt','Barde','Schankmaid']), ('einschuechtern', 'staerke', 'krieger', array['Wache','Söldnerin','Hauptmann','Schmied']),
    ('altes_wissen', 'wissen', 'gelehrter', array['Gelehrter','Schreiber','Mönch','Priesterin','Dorfälteste']), ('flink', 'geschick', 'schurke', array['Jäger','Jägerin','Stallbursche']),
    ('beruhigen', 'wille', 'heiler', array['Heilerin','Priesterin','Wäscherin']), ('feilschen', 'charme', 'haendler', array['Händler','Wirt']),
    ('heilkunde', 'wissen', 'heiler', array['Heilerin','Kräuterfrau','Alchemist']), ('anpacken', 'staerke', 'krieger', array['Zimmermann','Steinmetz','Holzfäller','Bergmann','Schmied','Bauer'])
  ) as x(id, skill, fav, helpers) where x.id = pr->>'id';
  a := char_attrs(me.race, me.herkunft);
  md := (a->>skill)::int - 2; bonus := case when me.herkunft = fav then 2 else 0 end;
  items_b := p_check_bonus(p_run.player_id, pr->>'id');
  beg := case when exists (select 1 from npcs n where n.id = any(p_run.begleiter) and n.job = any(helpers)) then 2 else 0 end;
  wund := case when me.zustand = 'verletzt' and me.zustand_bis > now() then -2 else 0 end;
  dc := coalesce((pr->>'dc')::int, 12);
  if pr ? 'mod' then for k in select jsonb_object_keys(pr->'mod') loop if p_run.flags ? k then dc := dc + (pr->'mod'->>k)::int; end if; end loop; end if;
  return jsonb_build_object('eigenschaft', skill, 'mod', md, 'herkunft', bonus, 'items', items_b, 'begleiter', beg, 'wunde', wund, 'dc', dc, 'summe', md + bonus + items_b + beg + wund);
end;
$$;

-- Folgen: Gefahrstufe gegen Schutz, Abnutzung, Beute
create or replace function public.q_apply(p_run_id bigint, f jsonb) returns text language plpgsql security definer set search_path = public as $$
declare r quest_runs; k text; v text; out text := ''; arm record; ctx jsonb; nid bigint; gst int; lt json; n int;
begin
  if f is null or f = '{}'::jsonb then return ''; end if;
  select * into r from quest_runs where id = p_run_id for update; ctx := q_ctx(r);
  if f ? 'flag' then update quest_runs set flags = flags || (select jsonb_object_agg(x, true) from jsonb_array_elements_text(f->'flag') x) where id = r.id; end if;
  if f ? 'item_plus' then for k, v in select * from jsonb_each_text(f->'item_plus') loop
    insert into player_items (player_id, item_id, menge) values (r.player_id, k, v::int) on conflict (player_id, item_id) do update set menge = player_items.menge + excluded.menge;
    out := out || ' Erhalten: ' || (select name from items where id = k) || case when v::int > 1 then ' ×' || v else '' end || '.'; end loop; end if;
  if f ? 'item_minus' then for k, v in select * from jsonb_each_text(f->'item_minus') loop update player_items set menge = greatest(0, menge - v::int) where player_id = r.player_id and item_id = k; end loop; end if;
  if f ? 'holz' then update villages set wood_stock = greatest(0, village_wood(villages) + (f->>'holz')::numeric), stock_updated_at = now() where owner_id = r.player_id; out := out || ' Holz ' || (f->>'holz') || '.'; end if;
  if (f ? 'begleiter_sym' or f ? 'begleiter_loy') and coalesce(array_length(r.begleiter, 1), 0) > 0 then
    foreach nid in array r.begleiter loop
      insert into npc_relations (npc_id, player_id, sympathy, loyalty) values (nid, r.player_id, 0, 0) on conflict do nothing;
      update npc_relations set sympathy = greatest(-100, least(100, sympathy + coalesce((f->>'begleiter_sym')::int, 0))), loyalty = greatest(0, least(100, loyalty + coalesce((f->>'begleiter_loy')::int, 0))), updated_at = now() where npc_id = nid and player_id = r.player_id;
    end loop; end if;
  if f ? 'notiz' and coalesce(array_length(r.begleiter, 1), 0) > 0 then
    insert into player_notes (player_id, npc_id, kind, text) values (r.player_id, r.begleiter[1], 'begegnung', left(q_fill(f->>'notiz', ctx), 500));
    insert into npc_memories (npc_id, player_id, kind, text, sympathy_delta) values (r.begleiter[1], r.player_id, 'gespraech', 'Wir haben zusammen ein Abenteuer erlebt. ' || q_fill(f->>'notiz', ctx), 0);
  end if;
  if f ? 'chronik' then insert into chronicle (player_id, key, text) values (r.player_id, f->'chronik'->>0, q_fill(f->'chronik'->>1, ctx)) on conflict do nothing; end if;
  if f ? 'journal' then insert into player_journal (player_id, kind, key, title, text) values (r.player_id, 'auftrag', f->'journal'->>0, f->'journal'->>1, f->'journal'->>2) on conflict do nothing; out := out || ' Tagebuch: ' || (f->'journal'->>1) || '.'; end if;
  if f ? 'begleiter_ab' and coalesce(array_length(r.begleiter, 1), 0) > 0 then update quest_runs set begleiter = begleiter[2:] where id = r.id; end if;
  if f ? 'gefahr' then
    gst := case when jsonb_typeof(f->'gefahr') = 'number' then (f->>'gefahr')::int else 1 end;
    select e.src, e.ref, e.schutz, e.unverwuestlich, coalesce(g.name, i.name) as name into arm
      from p_equipment(r.player_id) e left join player_gear g on e.src = 'gear' and g.id::text = e.ref left join items i on e.src = 'item' and i.id = e.ref
      where e.art = 'ruestung' and e.schutz > 0 order by e.schutz desc limit 1;
    if arm.name is not null and arm.schutz >= gst then
      out := out || ' Dein ' || arm.name || ' fängt das Schlimmste ab.';
      if arm.src = 'gear' and not arm.unverwuestlich then
        update player_gear set zustand = greatest(0, zustand - 20) where id = arm.ref::bigint returning zustand into n;
        if n = 0 then out := out || ' Es ist jetzt beschädigt und schützt nicht mehr, bis es repariert wird.'; end if;
      end if;
    else
      update profiles set zustand = 'verletzt', zustand_bis = now() + interval '6 hours' where id = r.player_id;
      out := out || case when arm.name is not null then ' Selbst dein ' || arm.name || ' hilft hier nicht.' else '' end || ' Du bist verletzt (Proben −2 für einige Stunden).';
    end if;
  end if;
  if f ? 'beute' and random() < coalesce((f->'beute'->>'chance')::numeric, 1) then
    lt := loot_roll(r.player_id, coalesce((f->'beute'->>'stufe')::int, 1), f->'beute'->>'art', (select titel from quest_templates where id = r.quest_id));
    out := out || ' Gefunden: ' || (lt->>'name') || ' (' || (lt->>'stufe') || ').';
    update quest_runs set letztes = coalesce(letztes, '{}'::jsonb) || jsonb_build_object('beute', lt) where id = r.id;
  end if;
  return trim(out);
end;
$$;

-- Wahl treffen: Glücksbringer (einmal neu würfeln) und "erster Versuch sicher"
create or replace function public.quest_choose(p_run bigint, p_nr int) returns json language plpgsql security definer set search_path = public as $$
declare r quest_runs; sz jsonb; o jsonb; br jsonb; m jsonb; roll int; roll1 int; ok boolean; nxt text; txt text; extra text; ctx jsonb; res jsonb; pool jsonb; glueck text; sicher text; hilfe text := null;
begin
  select * into r from quest_runs where id = p_run and player_id = auth.uid() for update; if not found then raise exception 'Unbekannte Quest'; end if;
  if r.status <> 'laeuft' then raise exception 'Diese Quest ist beendet'; end if;
  sz := (select def->'szenen'->r.szene from quest_templates where id = r.quest_id);
  if sz ? 'reise' then
    if r.warte_bis is not null and r.warte_bis > now() then raise exception 'Ihr seid noch unterwegs'; end if;
    nxt := sz->'reise'->>'weiter'; pool := sz->'reise'->'begegnung'->'szenen';
    if pool is not null and random() < coalesce((sz->'reise'->'begegnung'->>'chance')::numeric, 0) and not (r.flags ? 'begegnung_gehabt') then
      nxt := pool->>(floor(random() * jsonb_array_length(pool)))::int; update quest_runs set flags = flags || '{"begegnung_gehabt":true}' where id = r.id;
    end if;
    perform q_enter(r.id, nxt);
    update quest_runs set letztes = null where id = r.id;
    return quest_view(r.id);
  end if;
  o := sz->'optionen'->(p_nr - 1);
  if o is null or not q_cond(r, o->'wenn') then raise exception 'Diese Wahl gibt es nicht'; end if;
  ctx := q_ctx(r, o->'wenn');
  update quest_runs set letztes = null where id = r.id;
  res := jsonb_build_object('wahl', q_fill(o->>'text', ctx));
  if o ? 'probe' then
    m := q_mods(r, o->'probe'); roll := 1 + floor(random() * 20)::int;
    ok := roll = 20 or (roll <> 1 and roll + (m->>'summe')::int >= (m->>'dc')::int);
    sicher := case when o->'probe'->>'id' = 'flink' and not (r.flags ? 'erster_sicher_genutzt') then p_spezial(r.player_id, 'erster_sicher_flink') end;
    if sicher is not null then
      update quest_runs set flags = flags || '{"erster_sicher_genutzt":true}' where id = r.id;
      if not ok then ok := true; hilfe := sicher || ': Der erste Versuch gelingt.'; end if;
    end if;
    glueck := case when not ok and not (r.flags ? 'neuwurf_genutzt') then p_spezial(r.player_id, 'neuwurf') end;
    if glueck is not null then
      roll1 := roll; roll := 1 + floor(random() * 20)::int;
      ok := roll = 20 or (roll <> 1 and roll + (m->>'summe')::int >= (m->>'dc')::int);
      update quest_runs set flags = flags || '{"neuwurf_genutzt":true}' where id = r.id;
      hilfe := glueck || ': neu gewürfelt (' || roll1 || ' → ' || roll || ').';
    end if;
    br := case when ok then o->'erfolg' else o->'misserfolg' end;
    res := res || jsonb_build_object('probe', m || jsonb_build_object('id', o->'probe'->>'id', 'wurf', roll, 'gesamt', roll + (m->>'summe')::int, 'erfolg', ok, 'hilfe', hilfe));
  else br := o; end if;
  select * into r from quest_runs where id = p_run;
  txt := q_fill(case when o ? 'probe' then br->>'text' else o->>'ergebnis' end, ctx);
  extra := q_apply(r.id, br->'folgen');
  nxt := coalesce(br->>'weiter', o->>'weiter');
  if nxt is not null then extra := trim(extra || ' ' || q_enter(r.id, nxt)); end if;
  update quest_runs set letztes = coalesce(letztes, '{}'::jsonb) || res || jsonb_build_object('text', txt, 'extra', extra) where id = r.id;
  return quest_view(r.id);
end;
$$;

create or replace function public.get_inventory() returns json language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform ensure_starter_items(auth.uid());
  return json_build_object(
    'items', (select coalesce(json_agg(json_build_object('id', i.id, 'name', i.name, 'art', i.art, 'bonus', i.bonus, 'schutz', i.schutz, 'beschreibung', i.beschreibung, 'menge', p.menge) order by i.art, i.name), '[]'::json) from player_items p join items i on i.id = p.item_id where p.player_id = auth.uid() and p.menge > 0),
    'ausruestung', (select coalesce(json_agg(gear_json(g) order by array_position(array['legendaer','meister','selten','gut','gewoehnlich'], g.seltenheit), g.id desc), '[]'::json) from player_gear g where g.player_id = auth.uid() and g.status = 'besitz'),
    'zustand', (select json_build_object('zustand', case when zustand_bis > now() then zustand else 'gesund' end, 'bis', case when zustand_bis > now() then zustand_bis end) from profiles where id = auth.uid()),
    'chronik', (select coalesce(json_agg(json_build_object('text', c.text, 'am', c.created_at) order by c.created_at desc), '[]'::json) from (select * from chronicle where player_id = auth.uid() order by created_at desc limit 30) c)
  );
end;
$$;

-- Ausrüstung ablegen (Legendäres kehrt in die Welt zurück)
create or replace function public.gear_discard(p_id bigint) returns json language plpgsql security definer set search_path = public as $$
declare g player_gear;
begin
  update player_gear set status = 'abgelegt' where id = p_id and player_id = auth.uid() and status = 'besitz' returning * into g;
  if g.id is null then return json_build_object('ok', false); end if;
  if g.legendaer is not null then update gear_legendary set besitzer = null, gefunden_at = null where id = g.legendaer and besitzer = auth.uid(); end if;
  return json_build_object('ok', true, 'name', g.name);
end;
$$;
revoke execute on function public.gear_discard(bigint) from public, anon; grant execute on function public.gear_discard(bigint) to authenticated;

-- Die Mine bekommt Beute: am Ende sicher (mittlere Stufe)
update public.quest_templates set def = jsonb_set(def, '{szenen,ende,folgen}', (def->'szenen'->'ende'->'folgen') || '{"beute":{"stufe":2,"chance":1}}') where id = 'mine';
