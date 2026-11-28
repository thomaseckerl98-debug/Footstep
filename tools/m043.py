# Erzeugt migrations/043_gilde.sql
# Gilden: gründen (Ruhm ≥ 30 oder Ansehen ≥ 100), geheim oder öffentlich, Mitglieder (NPCs mit Stufe ≥ +7 oder Lebensretter,
# Spieler per Brieftaube), Ränge, Fertigkeiten, Gildenaufträge mit 24 Std. Zusagefrist, Würfel, Erzählung, Verletzungen,
# Gerüchte (Neuigkeiten mit Laufzeit), Ruf und Boten von Herrschern.
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from m036 import patch, parts as _p
OUT = pathlib.Path(__file__).resolve().parent.parent / 'migrations' / '043_gilde.sql'
_p.clear(); A = _p.append

A(r"""
alter table public.npc_relations add column if not exists lebensretter boolean not null default false;

create table if not exists public.gilden (
  id bigserial primary key,
  name text not null,
  zeichen text not null default 'feder',
  farbe text not null default '#2a2a32',
  geheim boolean not null default true,
  gruender uuid references public.profiles(id) on delete set null,
  ruf int not null default 0,
  erstellt timestamptz not null default now(),
  modus_at timestamptz not null default now(),
  angebot_at timestamptz
);
create unique index if not exists gilden_name_key on public.gilden (lower(name));
create table if not exists public.gilde_mitglieder (
  id bigserial primary key,
  gilde_id bigint not null references public.gilden(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete cascade,
  npc_id bigint references public.npcs(id) on delete cascade,
  rang text not null default 'anwaerter' check (rang in ('anwaerter', 'klinge', 'meister', 'gildenmeister')),
  seit timestamptz not null default now(),
  verletzt_bis timestamptz,
  xp jsonb not null default '{}',
  check ((player_id is null) <> (npc_id is null))
);
create unique index if not exists gilde_mitglieder_player on public.gilde_mitglieder (player_id) where player_id is not null;
create unique index if not exists gilde_mitglieder_npc on public.gilde_mitglieder (npc_id) where npc_id is not null;
create table if not exists public.gilde_einladungen (
  id bigserial primary key,
  gilde_id bigint not null references public.gilden(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  von uuid references public.profiles(id) on delete set null,
  bis timestamptz not null default now() + interval '48 hours',
  status text not null default 'offen' check (status in ('offen', 'angenommen', 'abgelehnt', 'abgelaufen'))
);
create table if not exists public.gilde_auftraege (
  id bigserial primary key,
  gilde_id bigint not null references public.gilden(id) on delete cascade,
  art text not null check (art in ('auskundschaften', 'einschuechtern', 'sabotage', 'diebstahl')),
  ziel text not null references public.welt_orte(id),
  von uuid references public.profiles(id) on delete set null,
  status text not null default 'werbung' check (status in ('werbung', 'fertig', 'abgesagt')),
  frist timestamptz not null default now() + interval '24 hours',
  erstellt timestamptz not null default now(),
  ergebnis jsonb
);
create table if not exists public.gilde_teilnahme (
  auftrag_id bigint not null references public.gilde_auftraege(id) on delete cascade,
  mitglied_id bigint not null references public.gilde_mitglieder(id) on delete cascade,
  antwort boolean,
  antwort_at timestamptz,
  primary key (auftrag_id, mitglied_id)
);
create table if not exists public.gilde_angebote (
  id bigserial primary key,
  gilde_id bigint not null references public.gilden(id) on delete cascade,
  reich text, ort text, text text not null, art text not null,
  status text not null default 'offen', erstellt timestamptz not null default now()
);
create table if not exists public.ort_effekte (
  id bigserial primary key, ort text not null references public.welt_orte(id) on delete cascade,
  art text not null, wert numeric not null, bis timestamptz not null
);
alter table public.gilden enable row level security; alter table public.gilde_mitglieder enable row level security;
alter table public.gilde_einladungen enable row level security; alter table public.gilde_auftraege enable row level security;
alter table public.gilde_teilnahme enable row level security; alter table public.gilde_angebote enable row level security; alter table public.ort_effekte enable row level security;
revoke all on public.gilden, public.gilde_mitglieder, public.gilde_einladungen, public.gilde_auftraege, public.gilde_teilnahme, public.gilde_angebote, public.ort_effekte from anon, authenticated;

-- Lebensretter: Quest-Folge „gerettet“: ["A"] markiert die Rolle
create or replace function public.q_gerettet(p_run bigint, p_rollen jsonb) returns void language plpgsql security definer set search_path = public as $$
declare r quest_runs; k text; nid bigint;
begin
  select * into r from quest_runs where id = p_run;
  for k in select jsonb_array_elements_text(p_rollen) loop
    nid := (r.rollen->k->>'id')::bigint;
    if nid is not null then
      insert into npc_relations (npc_id, player_id, sympathy, loyalty, lebensretter) values (nid, r.player_id, 20, 40, true)
        on conflict (npc_id, player_id) do update set lebensretter = true;
    end if;
  end loop;
end $$;
""")

patch('q_apply(bigint,jsonb)', [
    ("  perform q_apply_roles(r, f);\n", "  perform q_apply_roles(r, f);\n  if f ? 'gerettet' then perform q_gerettet(r.id, f->'gerettet'); end if;\n"),
])

A(r"""
-- Wer in den Quests gerettet wurde, verdankt dir das Leben
do $$ begin
  update quest_templates set def = jsonb_set(def, '{szenen,heim,folgen,gerettet}', '["A"]') where id = 'b_nebel' and def->'szenen'->'heim' ? 'folgen';
  update quest_templates set def = jsonb_set(def, '{szenen,heim,folgen}', '{"gerettet": ["A"]}') where id = 'b_nebel' and not def->'szenen'->'heim' ? 'folgen';
  update quest_templates set def = jsonb_set(def, '{szenen,ende_gut,folgen,gerettet}', '["B"]') where id = 'b_kraeuter' and def->'szenen'->'ende_gut' ? 'folgen';
end $$;
insert into npc_relations (npc_id, player_id, sympathy, loyalty, lebensretter)
  select (r.rollen->(case r.quest_id when 'b_nebel' then 'A' else 'B' end)->>'id')::bigint, r.player_id, 20, 40, true from quest_runs r
  where r.status = 'fertig' and ((r.quest_id = 'b_nebel' and r.szene = 'heim') or (r.quest_id = 'b_kraeuter' and r.szene = 'ende_gut'))
    and (r.rollen->(case r.quest_id when 'b_nebel' then 'A' else 'B' end)->>'id') is not null
  on conflict (npc_id, player_id) do update set lebensretter = true;

-- ───────── Grundlagen ─────────
create or replace function public.gilde_von(p_uid uuid) returns bigint language sql stable security definer set search_path = public as $$
  select gilde_id from gilde_mitglieder where player_id = p_uid;
$$;
create or replace function public.gilde_ruf_wort(p int) returns text language sql immutable as $$
  select case when p >= 140 then 'Legendär' when p >= 80 then 'Gefürchtet' when p >= 40 then 'Bekannt' when p >= 15 then 'Geflüstert' else 'Unbekannt' end;
$$;
create or replace function public.gilde_max(p_ruf int) returns int language sql immutable as $$ select 12 + greatest(0, p_ruf) / 20; $$;

-- Fertigkeiten eines Mitglieds (1 … 10): kampf, schleichen, gift, ueberzeugen, spuren
create or replace function public.gilde_fert(p_m bigint) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m gilde_mitglieder; n npcs; t jsonb; j text; o jsonb := '{}'; k text; base numeric; xp jsonb;
begin
  select * into m from gilde_mitglieder where id = p_m; xp := coalesce(m.xp, '{}');
  if m.player_id is not null then
    for k, j in select * from (values ('kampf', 'kampf'), ('schleichen', 'flink'), ('gift', 'heilkunde'), ('ueberzeugen', 'ueberreden'), ('spuren', 'spuren')) v(a, b) loop
      o := o || jsonb_build_object(k, least(10, 1 + fert_stufe(coalesce((select f.xp from fertigkeiten f where f.player_id = m.player_id and f.id = j), 0)) + fert_stufe(coalesce((xp->>k)::numeric, 0))));
    end loop;
    return o;
  end if;
  select * into n from npcs where id = m.npc_id; t := coalesce(n.traits, '{}'); j := coalesce(n.job, '');
  base := 1 + coalesce((t->>'mut')::numeric, 50) / 40 + case when j in ('Hauptmann', 'Wache', 'Söldnerin', 'Schmied', 'Rüstmacher', 'Metzger', 'Bergmann') then 2 else 0 end;
  o := o || jsonb_build_object('kampf', least(10, floor(base) + fert_stufe(coalesce((xp->>'kampf')::numeric, 0))));
  base := 1 + (100 - coalesce((t->>'geselligkeit')::numeric, 50)) / 50 + case when j in ('Rattenfänger', 'Falknerin', 'Hirte', 'Totengräber', 'Stallbursche') then 2 else 0 end;
  o := o || jsonb_build_object('schleichen', least(10, floor(base) + fert_stufe(coalesce((xp->>'schleichen')::numeric, 0))));
  base := 1 + case when j in ('Kräuterfrau', 'Alchemist', 'Imkerin', 'Seherin', 'Priesterin', 'Mönch') then 3 else 0 end;
  o := o || jsonb_build_object('gift', least(10, floor(base) + fert_stufe(coalesce((xp->>'gift')::numeric, 0))));
  base := 1 + coalesce((t->>'geselligkeit')::numeric, 50) / 40 + case when j in ('Händler', 'Wirt', 'Priesterin', 'Dorfälteste', 'Schreiber', 'Gelehrter') then 2 else 0 end;
  o := o || jsonb_build_object('ueberzeugen', least(10, floor(base) + fert_stufe(coalesce((xp->>'ueberzeugen')::numeric, 0))));
  base := 1 + coalesce((t->>'fleiss')::numeric, 50) / 60 + case when j in ('Falknerin', 'Hirte', 'Rattenfänger', 'Pfeilmacher') then 3 else 0 end;
  o := o || jsonb_build_object('spuren', least(10, floor(base) + fert_stufe(coalesce((xp->>'spuren')::numeric, 0))));
  return o;
end $$;

-- Gewichte der Fertigkeiten und Risiken je Auftragsart
create or replace function public.gilde_art(p_art text) returns jsonb language sql immutable as $$
  select case p_art
    when 'auskundschaften' then '{"name": "Auskundschaften", "w": {"spuren": 0.5, "schleichen": 0.5}, "risiko": 0.05, "ruf": 3, "text": "Herausfinden, wie stark der Ort wirklich ist und wer ihn verteidigt."}'
    when 'einschuechtern' then '{"name": "Einschüchtern", "w": {"ueberzeugen": 0.5, "kampf": 0.5}, "risiko": 0.10, "ruf": 8, "text": "Dem Ort klarmachen, dass man euch besser nicht reizt – und dass Gaben willkommen sind."}'
    when 'sabotage' then '{"name": "Sabotage", "w": {"schleichen": 0.5, "gift": 0.3, "kampf": 0.2}, "risiko": 0.20, "ruf": 10, "text": "Vorräte verderben, Sehnen zerschneiden, Werkzeug verschwinden lassen. Der Ort ist drei Tage lang geschwächt."}'
    else '{"name": "Diebstahl", "w": {"schleichen": 0.7, "spuren": 0.3}, "risiko": 0.15, "ruf": 6, "text": "Holen, was andere horten – Holz, Korn, Werkzeug – für dein Dorf."}' end::jsonb;
$$;

-- Chance: Team (bester voll, weitere abnehmend) gegen die Stärke des Ziels
create or replace function public.gilde_chance(p_art text, p_ziel text, p_mitglieder bigint[]) returns numeric language plpgsql stable security definer set search_path = public as $$
declare w jsonb := gilde_art(p_art)->'w'; sc numeric[] := '{}'; x bigint; f jsonb; s numeric; tot numeric := 0; i int := 0; d numeric;
begin
  foreach x in array coalesce(p_mitglieder, '{}') loop
    f := gilde_fert(x); s := 0;
    s := coalesce((f->>'kampf')::numeric, 0) * coalesce((w->>'kampf')::numeric, 0) + coalesce((f->>'schleichen')::numeric, 0) * coalesce((w->>'schleichen')::numeric, 0)
       + coalesce((f->>'gift')::numeric, 0) * coalesce((w->>'gift')::numeric, 0) + coalesce((f->>'ueberzeugen')::numeric, 0) * coalesce((w->>'ueberzeugen')::numeric, 0)
       + coalesce((f->>'spuren')::numeric, 0) * coalesce((w->>'spuren')::numeric, 0);
    sc := sc || s;
  end loop;
  for s in select v from unnest(sc) v order by v desc loop
    tot := tot + s * (array[1, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1])[least(7, i + 1)]; i := i + 1;
  end loop;
  d := 4 + sqrt(greatest(1, dorf_staerke(p_ziel))) * 1.2;
  return least(0.92, greatest(0.08, 0.5 + (tot - d) / 12));
end $$;
""")

# ───────── Spieleraktionen ─────────
A(r"""
create or replace function public.gilde_gruenden(p_name text, p_zeichen text, p_farbe text, p_geheim boolean) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p profiles; gid bigint; nm text := btrim(coalesce(p_name, ''));
begin
  if uid is null then raise exception 'Nicht angemeldet'; end if;
  if gilde_von(uid) is not null then raise exception 'Du gehörst schon einer Gilde an.'; end if;
  select * into p from profiles where id = uid;
  if coalesce(p.ruhm, 0) < 30 and coalesce(p.ansehen, 0) < 100 then raise exception 'Noch kennt dich niemand gut genug. Du brauchst mehr Ruhm im Land oder mehr Ansehen im Dorf.'; end if;
  if char_length(nm) < 3 or char_length(nm) > 40 then raise exception 'Der Name muss 3 bis 40 Zeichen lang sein.'; end if;
  if exists (select 1 from gilden where lower(name) = lower(nm)) then raise exception 'Diesen Namen trägt schon eine Gilde.'; end if;
  insert into gilden (name, zeichen, farbe, geheim, gruender) values (nm, coalesce(nullif(p_zeichen, ''), 'feder'), coalesce(nullif(p_farbe, ''), '#2a2a32'), coalesce(p_geheim, true), uid) returning id into gid;
  insert into gilde_mitglieder (gilde_id, player_id, rang) values (gid, uid, 'gildenmeister');
  if not coalesce(p_geheim, true) then
    perform welt_tat_neu('gilde', heim_ort(uid), 'Eine neue Gilde: ' || nm, p.character_name || ' hat die Gilde „' || nm || '“ gegründet und sucht Gefährten.', 'Man hört von einer neuen Gilde, „' || nm || '“.', 1, uid, '{}');
  end if;
  return json_build_object('ok', true, 'gilde', gid);
end $$;

-- Wen darf ich einladen? NPCs mit Stufe ≥ +7 oder die mir das Leben verdanken (aus allen Dörfern)
create or replace function public.gilde_kandidaten() returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', n.id, 'name', n.name, 'beruf', n.job, 'look', n.look, 'wohnort', coalesce(v.name, 'unterwegs'),
      'stufe', dipl_stufe(r.sympathy), 'lebensretter', r.lebensretter) order by r.lebensretter desc, r.sympathy desc), '[]'::json)
  from npc_relations r join npcs n on n.id = r.npc_id left join villages v on v.id = n.village_id
  where r.player_id = auth.uid() and n.tot_at is null and not n.namenlos and (dipl_stufe(r.sympathy) >= 7 or r.lebensretter)
    and not exists (select 1 from gilde_mitglieder m where m.npc_id = n.id);
$$;

create or replace function public.gilde_einladen_npc(p_npc bigint) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid bigint := gilde_von(uid); g gilden; r npc_relations; n npcs; p numeric; mr text;
begin
  if gid is null then raise exception 'Du hast keine Gilde.'; end if;
  select rang into mr from gilde_mitglieder where player_id = uid;
  if mr not in ('meister', 'gildenmeister') then raise exception 'Einladen dürfen nur Meister und der Gildenmeister.'; end if;
  select * into g from gilden where id = gid;
  if (select count(*) from gilde_mitglieder where gilde_id = gid) >= gilde_max(g.ruf) then raise exception 'Die Gilde ist voll. Mehr Ruf bringt mehr Platz.'; end if;
  select * into r from npc_relations where npc_id = p_npc and player_id = uid; select * into n from npcs where id = p_npc;
  if n.id is null or n.tot_at is not null then raise exception 'Diese Person gibt es nicht mehr.'; end if;
  if r.npc_id is null or not (dipl_stufe(r.sympathy) >= 7 or r.lebensretter) then raise exception 'So sehr vertraut dir % noch nicht.', n.name; end if;
  if exists (select 1 from gilde_mitglieder where npc_id = p_npc) then raise exception '% gehört schon einer Gilde an.', n.name; end if;
  p := least(0.97, 0.45 + coalesce(r.loyalty, 30) / 150.0 + case when r.lebensretter then 0.3 else 0 end + (dipl_stufe(r.sympathy) - 7) * 0.05);
  if random() > p then
    update npc_relations set sympathy = sympathy - 2 where npc_id = p_npc and player_id = uid;
    return json_build_object('ok', false, 'text', n.name || ' liest die Nachricht lange. „Ich kann nicht. Nicht so etwas. Frag mich nicht noch einmal.“');
  end if;
  insert into gilde_mitglieder (gilde_id, npc_id, rang) values (gid, p_npc, 'anwaerter');
  return json_build_object('ok', true, 'text', case when r.lebensretter then n.name || ' schickt die Taube zurück, mit einem Wort: „Immer.“ Wer einem das Leben gerettet hat, dem folgt man.'
                                                 else n.name || ' nickt langsam. „Wenn du es bist, der fragt – dann ja.“' end);
end $$;

create or replace function public.gilde_spieler_liste() returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', p.id, 'name', p.character_name, 'wohnort', ort_name(heim_ort(p.id)), 'in_gilde', gilde_von(p.id) is not null) order by p.character_name), '[]'::json)
  from profiles p where p.id <> auth.uid();
$$;

-- Brieftaube an einen anderen Spieler
create or replace function public.gilde_einladen_spieler(p_player uuid) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid bigint := gilde_von(uid); mr text; nm text;
begin
  if gid is null then raise exception 'Du hast keine Gilde.'; end if;
  select rang into mr from gilde_mitglieder where player_id = uid;
  if mr not in ('meister', 'gildenmeister') then raise exception 'Einladen dürfen nur Meister und der Gildenmeister.'; end if;
  if gilde_von(p_player) is not null then raise exception 'Diese Person gehört schon einer Gilde an.'; end if;
  if exists (select 1 from gilde_einladungen where gilde_id = gid and player_id = p_player and status = 'offen' and bis > now()) then raise exception 'Die Brieftaube ist schon unterwegs.'; end if;
  insert into gilde_einladungen (gilde_id, player_id, von) values (gid, p_player, uid);
  select character_name into nm from profiles where id = p_player;
  return json_build_object('ok', true, 'text', 'Die Brieftaube fliegt zu ' || nm || '. Die Einladung gilt zwei Tage.');
end $$;

create or replace function public.gilde_einladung_antwort(p_id bigint, p_ja boolean) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e gilde_einladungen; g gilden;
begin
  select * into e from gilde_einladungen where id = p_id and player_id = uid and status = 'offen' for update;
  if e.id is null or e.bis < now() then raise exception 'Diese Einladung gilt nicht mehr.'; end if;
  if not p_ja then update gilde_einladungen set status = 'abgelehnt' where id = e.id; return json_build_object('ok', true); end if;
  if gilde_von(uid) is not null then raise exception 'Du gehörst schon einer Gilde an.'; end if;
  select * into g from gilden where id = e.gilde_id;
  if (select count(*) from gilde_mitglieder where gilde_id = g.id) >= gilde_max(g.ruf) then raise exception 'Die Gilde ist inzwischen voll.'; end if;
  update gilde_einladungen set status = 'angenommen' where id = e.id;
  insert into gilde_mitglieder (gilde_id, player_id, rang) values (g.id, uid, 'klinge');
  return json_build_object('ok', true, 'text', 'Du bist jetzt Mitglied von „' || g.name || '“.');
end $$;

create or replace function public.gilde_rang(p_mitglied bigint, p_rang text) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid bigint := gilde_von(uid); m gilde_mitglieder;
begin
  if (select rang from gilde_mitglieder where player_id = uid) <> 'gildenmeister' then raise exception 'Ränge vergibt nur der Gildenmeister.'; end if;
  select * into m from gilde_mitglieder where id = p_mitglied and gilde_id = gid;
  if m.id is null then raise exception 'Kein Mitglied deiner Gilde.'; end if;
  if p_rang = 'entlassen' then
    if m.player_id = uid then raise exception 'Du kannst dich nicht selbst entlassen.'; end if;
    delete from gilde_mitglieder where id = m.id; return json_build_object('ok', true);
  end if;
  if p_rang not in ('anwaerter', 'klinge', 'meister') then raise exception 'Unbekannter Rang.'; end if;
  if m.player_id = uid then raise exception 'Deinen eigenen Rang kannst du nicht ändern.'; end if;
  update gilde_mitglieder set rang = p_rang where id = m.id;
  return json_build_object('ok', true);
end $$;

create or replace function public.gilde_verlassen() returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid bigint := gilde_von(uid); m gilde_mitglieder; nf uuid;
begin
  if gid is null then raise exception 'Du hast keine Gilde.'; end if;
  select * into m from gilde_mitglieder where player_id = uid;
  delete from gilde_mitglieder where id = m.id;
  if m.rang = 'gildenmeister' then
    select player_id into nf from gilde_mitglieder where gilde_id = gid and player_id is not null order by (rang = 'meister') desc, seit limit 1;
    if nf is not null then update gilde_mitglieder set rang = 'gildenmeister' where player_id = nf;
    else delete from gilden where id = gid; end if;  -- ohne Spieler löst sich die Gilde auf
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.gilde_modus(p_geheim boolean) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g gilden;
begin
  select * into g from gilden where id = gilde_von(uid);
  if (select rang from gilde_mitglieder where player_id = uid) <> 'gildenmeister' then raise exception 'Das entscheidet der Gildenmeister.'; end if;
  if g.geheim = p_geheim then return json_build_object('ok', true); end if;
  if g.modus_at > now() - interval '7 days' then raise exception 'Das geht erst wieder am %.', to_char((g.modus_at + interval '7 days') at time zone 'Europe/Berlin', 'DD.MM. HH24:MI'); end if;
  update gilden set geheim = p_geheim, modus_at = now() where id = g.id;
  if not p_geheim then
    perform welt_tat_neu('gilde', heim_ort(uid), 'Die Gilde „' || g.name || '“ zeigt ihr Gesicht', 'Die Gilde „' || g.name || '“ tritt aus dem Schatten. Ihre Mitglieder bekennen sich offen zu ihrem Zeichen.', 'Die mit dem Zeichen – man sagt, jetzt weiß man, wer sie sind.', 1, uid, '{}');
  end if;
  return json_build_object('ok', true);
end $$;
""")

# ───────── Aufträge ─────────
A(r"""
create or replace function public.gilde_auftrag_vorschau(p_ziel text, p_art text) returns json language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid bigint := gilde_von(uid); ms bigint[];
begin
  if gid is null then return null; end if;
  select array_agg(id) into ms from gilde_mitglieder where gilde_id = gid and coalesce(verletzt_bis, now() - interval '1 second') < now();
  return json_build_object('art', gilde_art(p_art), 'chance_alle', round(gilde_chance(p_art, p_ziel, ms) * 100), 'chance_du', round(gilde_chance(p_art, p_ziel, array[(select id from gilde_mitglieder where player_id = uid)]) * 100),
    'verfuegbar', coalesce(array_length(ms, 1), 0), 'ziel', ort_name(p_ziel), 'minuten', reise_minuten(heim_ort(uid), p_ziel));
end $$;

create or replace function public.gilde_auftrag_planen(p_ziel text, p_art text) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid bigint := gilde_von(uid); mr text; aid bigint; me bigint;
begin
  if gid is null then raise exception 'Du hast keine Gilde.'; end if;
  select id, rang into me, mr from gilde_mitglieder where player_id = uid;
  if mr not in ('meister', 'gildenmeister') then raise exception 'Aufträge planen nur Meister und der Gildenmeister.'; end if;
  if p_art not in ('auskundschaften', 'einschuechtern', 'sabotage', 'diebstahl') then raise exception 'Unbekannte Auftragsart.'; end if;
  if p_ziel = heim_ort(uid) then raise exception 'Nicht gegen das eigene Dorf.'; end if;
  if not exists (select 1 from welt_orte where id = p_ziel) then raise exception 'Diesen Ort gibt es nicht.'; end if;
  if exists (select 1 from gilde_auftraege where gilde_id = gid and status = 'werbung') then raise exception 'Es läuft schon ein Auftrag. Erst wenn er vorbei ist, kann der nächste geplant werden.'; end if;
  insert into gilde_auftraege (gilde_id, art, ziel, von) values (gid, p_art, p_ziel, uid) returning id into aid;
  insert into gilde_teilnahme (auftrag_id, mitglied_id, antwort, antwort_at)
    select aid, m.id, case when m.id = me then true end, case when m.id = me then now() else now() + make_interval(mins => 5 + floor(random() * 240)::int) end
    from gilde_mitglieder m where m.gilde_id = gid and coalesce(m.verletzt_bis, now() - interval '1 second') < now();
  return json_build_object('ok', true, 'id', aid, 'text', 'Die Brieftauben sind unterwegs. Alle haben 24 Stunden Zeit, zuzusagen.');
end $$;

create or replace function public.gilde_auftrag_antwort(p_auftrag bigint, p_ja boolean) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me bigint;
begin
  select id into me from gilde_mitglieder where player_id = uid;
  update gilde_teilnahme set antwort = p_ja, antwort_at = now() where auftrag_id = p_auftrag and mitglied_id = me
    and exists (select 1 from gilde_auftraege a where a.id = p_auftrag and a.status = 'werbung');
  if not found then raise exception 'Dieser Auftrag wartet nicht mehr auf dich.'; end if;
  perform gilde_pruefen();
  return json_build_object('ok', true);
end $$;

-- Erzählung je Art und Ausgang
create or replace function public.gilde_erzaehlung(p_art text, p_aus text, p_namen text, p_ziel text, p_gilde text, p_zeichen text, p_geheim boolean) returns text language sql immutable as $$
  select replace(replace(replace(case p_art || ':' || p_aus
    when 'auskundschaften:erfolg' then '{N} verbringen eine Nacht und einen Tag in {Z}: am Brunnen, in der Schenke, auf dem Wall. Am Ende weißt du, wie viele Klingen der Ort hat – und wo seine Mauer bröckelt.'
    when 'auskundschaften:teil' then '{N} sehen einiges in {Z}, aber nicht alles. Ein misstrauischer Wächter hat ihnen zu genau nachgesehen.'
    when 'auskundschaften:fehl' then '{N} kommen mit leeren Händen aus {Z} zurück. Man hat sie bemerkt und zum Tor hinausbegleitet.'
    when 'einschuechtern:erfolg' then 'Am Morgen findet der Älteste von {Z} {C} an seiner Tür. Am Abend steht ein Karren mit Gaben am Wegkreuz. Niemand sagt ein Wort, aber alle haben verstanden.'
    when 'einschuechtern:teil' then '{N} machen in {Z} Eindruck – aber nicht genug. Ein paar Leute fürchten euch jetzt, die anderen sind nur wütend.'
    when 'einschuechtern:fehl' then 'In {Z} lacht man {N} aus. Ein Stein fliegt, dann noch einer. Sie ziehen ab, und in {Z} wird von nun an die Nachtwache verdoppelt.'
    when 'sabotage:erfolg' then 'In einer mondlosen Nacht schleichen {N} durch {Z}. Am Morgen sind die Bogensehnen zerschnitten, das Korn feucht, die Äxte stumpf. Zurück bleibt nur {C}.'
    when 'sabotage:teil' then '{N} schaffen nur die Hälfte: Ein Hund schlägt an, bevor das Werk getan ist. {Z} ist geschwächt, aber gewarnt.'
    when 'sabotage:fehl' then 'Fackeln, Rufe, ein Gerangel am Speicher. {N} entkommen nur knapp aus {Z} – mit Prellungen und ohne getane Arbeit.'
    when 'diebstahl:erfolg' then 'Was in {Z} gehortet wurde, wechselt in einer Nacht den Besitzer. {N} sind zurück, bevor der Hahn kräht, die Säcke schwer.'
    when 'diebstahl:teil' then '{N} erwischen nur einen Teil der Vorräte von {Z}, bevor sie fliehen müssen.'
    else '{N} werden in {Z} auf frischer Tat ertappt. Mit Mühe und ohne Beute entkommen sie in den Wald.' end,
    '{N}', p_namen), '{Z}', p_ziel), '{C}', case when p_geheim then 'das Zeichen ' || coalesce(p_zeichen, 'der Gilde') else 'das Zeichen der Gilde „' || p_gilde || '“' end);
$$;

create or replace function public.gilde_zeichen_name(p text) returns text language sql immutable as $$
  select case p when 'feder' then 'einer schwarzen Feder' when 'dolch' then 'eines gekreuzten Dolches' when 'auge' then 'eines offenen Auges'
    when 'rabe' then 'eines Raben' when 'mond' then 'einer Mondsichel' when 'wolf' then 'eines Wolfskopfs' else 'eines geheimen Zeichens' end;
$$;

-- Auftrag ausführen: Würfel, Folgen, Erzählung
create or replace function public.gilde_ausfuehren(p_auftrag bigint) returns void language plpgsql security definer set search_path = public as $$
declare a gilde_auftraege; g gilden; adef jsonb; ms bigint[]; ch numeric; wurf numeric := random(); ausg text; namen text; enttarnt boolean := false; schl int;
        heim text; hv bigint; rufp int; t record; xpgain numeric; k text; erz text; kinfo jsonb := '{}'; verletzt text[] := '{}'; zielname text; zeichen text;
begin
  select * into a from gilde_auftraege where id = p_auftrag and status = 'werbung' for update;
  if a.id is null then return; end if;
  select * into g from gilden where id = a.gilde_id; adef := gilde_art(a.art); zielname := ort_name(a.ziel); zeichen := gilde_zeichen_name(g.zeichen);
  select array_agg(mitglied_id) into ms from gilde_teilnahme where auftrag_id = a.id and antwort;
  if ms is null then
    update gilde_auftraege set status = 'abgesagt', ergebnis = jsonb_build_object('text', 'Niemand ist der Brieftaube gefolgt. Der Auftrag fällt ausg.') where id = a.id; return;
  end if;
  select string_agg(coalesce(p.character_name, n.name), ', ') into namen from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms);
  ch := gilde_chance(a.art, a.ziel, ms);
  ausg := case when wurf < ch then 'erfolg' when wurf < ch + 0.15 then 'teil' else 'fehl' end;
  select max((gilde_fert(x)->>'schleichen')::int) into schl from unnest(ms) x;
  if g.geheim then enttarnt := random() < greatest(0.01, case ausg when 'fehl' then 0.35 when 'teil' then 0.12 else 0.03 end - schl * 0.02); end if;
  heim := heim_ort(a.von); hv := mein_dorf(a.von);
  -- Folgen
  if ausg <> 'fehl' then
    if a.art = 'auskundschaften' then
      kinfo := jsonb_build_object('staerke', (select x->>'staerke' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'rang', (select x->>'rang' from json_array_elements(dorf_rangliste()) x where x->>'id' = a.ziel),
        'kaempfer', round(dorf_staerke(a.ziel) * case ausg when 'erfolg' then 1 else 0.7 + random() * 0.6 end), 'mauer', (select mauer from welt_orte where id = a.ziel));
    elsif a.art = 'einschuechtern' then
      if hv is not null then perform eco_add(hv, jsonb_build_object('nahrung', case ausg when 'erfolg' then 14 else 5 end, 'waren', case ausg when 'erfolg' then 4 else 1 end)); end if;
      perform dipl_aendern(heim, a.ziel, -2);
    elsif a.art = 'sabotage' then
      insert into ort_effekte (ort, art, wert, bis) values (a.ziel, 'geschwaecht', case ausg when 'erfolg' then 0.2 else 0.1 end, now() + interval '3 days');
    elsif a.art = 'diebstahl' and hv is not null then
      perform eco_add(hv, jsonb_build_object('holz', case ausg when 'erfolg' then 25 else 10 end, 'nahrung', case ausg when 'erfolg' then 18 else 6 end, 'waren', case ausg when 'erfolg' then 5 else 2 end));
    end if;
  end if;
  if enttarnt or (not g.geheim and a.art <> 'auskundschaften') then perform dipl_aendern(heim, a.ziel, case when enttarnt then -8 else -3 end); end if;
  -- Verletzungen und Erfahrung
  for t in select m.*, coalesce(p.character_name, n.name) nm from gilde_mitglieder m left join profiles p on p.id = m.player_id left join npcs n on n.id = m.npc_id where m.id = any(ms) loop
    if random() < (adef->>'risiko')::numeric * case ausg when 'fehl' then 2 when 'teil' then 1 else 0.4 end then
      update gilde_mitglieder set verletzt_bis = now() + make_interval(days => 1 + floor(random() * 3)::int) where id = t.id;
      if t.npc_id is not null then update npcs set zustand = 'verletzt', zustand_bis = now() + interval '2 days' where id = t.npc_id; end if;
      verletzt := verletzt || t.nm;
    end if;
    xpgain := case ausg when 'erfolg' then 6 when 'teil' then 4 else 2 end;  -- wie Übungsstunden
    for k in select jsonb_object_keys(adef->'w') loop
      if t.player_id is not null then
        perform fert_xp(t.player_id, case k when 'schleichen' then 'flink' when 'gift' then 'heilkunde' when 'ueberzeugen' then 'ueberreden' else k end, xpgain * (adef->'w'->>k)::numeric);
      else
        update gilde_mitglieder set xp = jsonb_set(xp, array[k], to_jsonb(coalesce((xp->>k)::numeric, 0) + xpgain * (adef->'w'->>k)::numeric)) where id = t.id;
      end if;
    end loop;
  end loop;
  rufp := case ausg when 'erfolg' then (adef->>'ruf')::int when 'teil' then (adef->>'ruf')::int / 2 else case when enttarnt then 1 else 0 end end;
  update gilden set ruf = ruf + rufp where id = g.id;
  if not g.geheim and rufp > 0 then update profiles set ruhm = ruhm + greatest(1, rufp / 2) where id in (select player_id from gilde_mitglieder where id = any(ms) and player_id is not null); end if;
  erz := gilde_erzaehlung(a.art, ausg, namen, zielname, g.name, zeichen, g.geheim and not enttarnt);
  if enttarnt then erz := erz || ' Schlimmer noch: Man hat ein Gesicht erkannt. In ' || zielname || ' weiß man jetzt, wer hinter dem Zeichen steckt.'; end if;
  if array_length(verletzt, 1) > 0 then erz := erz || ' Verletzt: ' || array_to_string(verletzt, ', ') || '.'; end if;
  update gilde_auftraege set status = 'fertig', ergebnis = jsonb_build_object('ausgang', ausg, 'chance', round(ch * 100), 'text', erz, 'teilnehmer', namen, 'enttarnt', enttarnt, 'ruf', rufp, 'info', kinfo, 'verletzt', to_jsonb(verletzt)) where id = a.id;
  -- Gerüchte: Wer nicht in der Gilde ist, hört nur vom Zeichen (oder vom Namen, wenn die Gilde offen ist oder enttarnt wurde)
  if a.art <> 'auskundschaften' and ausg <> 'fehl' then
    perform welt_tat_neu('gilde', a.ziel,
      case when g.geheim and not enttarnt then 'Das Zeichen ' || zeichen || ' in ' || zielname else 'Die Gilde „' || g.name || '“ in ' || zielname end,
      case a.art when 'sabotage' then 'In ' || zielname || ' sind über Nacht Vorräte verdorben und Waffen unbrauchbar geworden.' when 'diebstahl' then 'In ' || zielname || ' fehlen ganze Vorräte. Niemand hat etwas gesehen.' else zielname || ' zahlt neuerdings Gaben an Unbekannte.' end
        || case when g.geheim and not enttarnt then ' Gefunden wurde nur das Zeichen ' || zeichen || '.' else ' Man weiß: Es war die Gilde „' || g.name || '“.' end,
      case when g.geheim and not enttarnt then 'Man sagt, im Tal treibt eine Bruderschaft mit dem Zeichen ' || zeichen || ' ihr Unwesen.' else 'Man erzählt sich von der Gilde „' || g.name || '“ und was sie in ' || zielname || ' getan hat.' end,
      1, null, jsonb_build_object('gilde', g.id));
  end if;
end $$;

-- Antworten der NPCs, Fristen, Boten. Läuft stündlich und bei jedem Blick in den Gilden-Reiter.
create or replace function public.gilde_pruefen() returns void language plpgsql security definer set search_path = public as $$
declare t record; a record; g record; r record; risk numeric;
begin
  for t in select tn.*, m.npc_id, ga.art, ga.von from gilde_teilnahme tn join gilde_mitglieder m on m.id = tn.mitglied_id join gilde_auftraege ga on ga.id = tn.auftrag_id
           where tn.antwort is null and m.npc_id is not null and tn.antwort_at <= now() and ga.status = 'werbung' loop
    select * into r from npc_relations where npc_id = t.npc_id and player_id = t.von;
    risk := (gilde_art(t.art)->>'risiko')::numeric;
    update gilde_teilnahme set antwort = random() < least(0.95, greatest(0.15, 0.35 + coalesce(r.loyalty, 30) / 200.0 + coalesce(r.sympathy, 0) / 250.0 - risk * 1.5 + case when r.lebensretter then 0.2 else 0 end)), antwort_at = now()
      where auftrag_id = t.auftrag_id and mitglied_id = t.mitglied_id;
  end loop;
  for a in select ga.id from gilde_auftraege ga where ga.status = 'werbung' and (ga.frist <= now() or not exists (select 1 from gilde_teilnahme tn where tn.auftrag_id = ga.id and tn.antwort is null)) loop
    perform gilde_ausfuehren(a.id);
  end loop;
  update gilde_einladungen set status = 'abgelaufen' where status = 'offen' and bis < now();
  delete from ort_effekte where bis < now() - interval '1 day';
  -- Herrscher werden aufmerksam
  for g in select * from gilden where ruf >= 80 and (angebot_at is null or angebot_at < now() - interval '7 days') loop
    select x.* into r from (select w.id, w.name, w.herrscher, (select o.id from welt_orte o where o.reich = w.id order by o.einwohner desc limit 1) ort from welt_reiche w where w.id <> 'frei' order by random() limit 1) x;
    if r.id is not null then
      insert into gilde_angebote (gilde_id, reich, ort, art, text) values (g.id, r.id, r.ort, 'buendnis',
        'Ein Bote in den Farben von ' || r.name || ' sucht euch. ' || r.herrscher || ' lässt ausrichten: Wer so viel Furcht verbreitet, ist besser Freund als Feind. Man bietet euch ein Bündnis an – und Schutz, solange ihr dessen Feinde meidet.');
      update gilden set angebot_at = now() where id = g.id;
    end if;
  end loop;
end $$;

create or replace function public.gilde_angebot_antwort(p_id bigint, p_ja boolean) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); an gilde_angebote;
begin
  select * into an from gilde_angebote where id = p_id and gilde_id = gilde_von(uid) and status = 'offen' for update;
  if an.id is null then raise exception 'Dieses Angebot gilt nicht mehr.'; end if;
  if (select rang from gilde_mitglieder where player_id = uid) <> 'gildenmeister' then raise exception 'Das entscheidet der Gildenmeister.'; end if;
  update gilde_angebote set status = case when p_ja then 'angenommen' else 'abgelehnt' end where id = an.id;
  if an.ort is not null then perform dipl_aendern(heim_ort(uid), an.ort, case when p_ja then 8 else -3 end); end if;
  if p_ja then update gilden set ruf = ruf + 5 where id = an.gilde_id; end if;
  return json_build_object('ok', true, 'text', case when p_ja then 'Ihr habt eingeschlagen. Ab heute habt ihr einen mächtigen Freund – und seine Feinde sind jetzt auch eure.' else 'Der Bote reitet davon. Man wird sich merken, dass ihr abgelehnt habt.' end);
end $$;

-- Alles für den Gilden-Reiter
create or replace function public.gilde_status() returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid bigint; g gilden; p profiles;
begin
  perform gilde_pruefen();
  gid := gilde_von(uid); select * into p from profiles where id = uid;
  if gid is null then
    return json_build_object('gilde', null, 'kann_gruenden', coalesce(p.ruhm, 0) >= 30 or coalesce(p.ansehen, 0) >= 100, 'ruhm', coalesce(p.ruhm, 0), 'ansehen', coalesce(p.ansehen, 0),
      'einladungen', (select coalesce(json_agg(json_build_object('id', e.id, 'gilde', gg.name, 'zeichen', gg.zeichen, 'farbe', gg.farbe, 'geheim', gg.geheim, 'von', pv.character_name, 'bis', e.bis)), '[]'::json)
                      from gilde_einladungen e join gilden gg on gg.id = e.gilde_id left join profiles pv on pv.id = e.von where e.player_id = uid and e.status = 'offen' and e.bis > now()));
  end if;
  select * into g from gilden where id = gid;
  return json_build_object(
    'gilde', json_build_object('id', g.id, 'name', g.name, 'zeichen', g.zeichen, 'zeichen_name', gilde_zeichen_name(g.zeichen), 'farbe', g.farbe, 'geheim', g.geheim, 'ruf', g.ruf, 'ruf_wort', gilde_ruf_wort(g.ruf),
      'max', gilde_max(g.ruf), 'modus_ab', g.modus_at + interval '7 days'),
    'ich', (select json_build_object('id', id, 'rang', rang) from gilde_mitglieder where player_id = uid), 'ruhm', coalesce(p.ruhm, 0),
    'mitglieder', (select coalesce(json_agg(json_build_object('id', m.id, 'spieler', m.player_id is not null, 'ich', m.player_id = uid, 'name', coalesce(pp.character_name, n.name),
        'beruf', n.job, 'look', coalesce(n.look, pp.look), 'rang', m.rang, 'fert', gilde_fert(m.id), 'wohnort', coalesce(ort_name(heim_ort(m.player_id)), vv.name, 'unterwegs'),
        'verletzt_bis', case when m.verletzt_bis > now() then m.verletzt_bis end, 'lebensretter', coalesce((select lebensretter from npc_relations where npc_id = m.npc_id and player_id = uid), false))
        order by array_position(array['gildenmeister', 'meister', 'klinge', 'anwaerter'], m.rang), m.seit), '[]'::json)
      from gilde_mitglieder m left join profiles pp on pp.id = m.player_id left join npcs n on n.id = m.npc_id left join villages vv on vv.id = n.village_id where m.gilde_id = gid),
    'auftraege', (select coalesce(json_agg(json_build_object('id', a.id, 'art', a.art, 'art_name', gilde_art(a.art)->>'name', 'ziel', ort_name(a.ziel), 'status', a.status, 'frist', a.frist, 'ergebnis', a.ergebnis,
        'zusagen', (select count(*) from gilde_teilnahme tn where tn.auftrag_id = a.id and tn.antwort), 'absagen', (select count(*) from gilde_teilnahme tn where tn.auftrag_id = a.id and not tn.antwort),
        'offen', (select count(*) from gilde_teilnahme tn where tn.auftrag_id = a.id and tn.antwort is null),
        'meine', (select tn.antwort from gilde_teilnahme tn join gilde_mitglieder mm on mm.id = tn.mitglied_id where tn.auftrag_id = a.id and mm.player_id = uid),
        'eingeladen', exists (select 1 from gilde_teilnahme tn join gilde_mitglieder mm on mm.id = tn.mitglied_id where tn.auftrag_id = a.id and mm.player_id = uid),
        'risiko', round((gilde_art(a.art)->>'risiko')::numeric * 100)) order by a.erstellt desc), '[]'::json)
      from (select * from gilde_auftraege where gilde_id = gid order by erstellt desc limit 8) a),
    'angebote', (select coalesce(json_agg(json_build_object('id', an.id, 'text', an.text)), '[]'::json) from gilde_angebote an where an.gilde_id = gid and an.status = 'offen'),
    'kandidaten', gilde_kandidaten());
end $$;
""")

# Sabotage schwächt den Ort in der Rangliste und später in Schlachten
patch('dorf_staerke(text)', [
    ("  return round(k * f, 2);", "  f := f * (1 - least(0.6, coalesce((select sum(wert) from ort_effekte where ort = p_ort and art = 'geschwaecht' and bis > now()), 0)));\n  return round(k * f, 2);"),
])
patch('amt_tick_all()', [], inject_after_begin='perform gilde_pruefen();')

A(r"""
revoke execute on function public.q_gerettet(bigint, jsonb), public.gilde_von(uuid), public.gilde_fert(bigint), public.gilde_chance(text, text, bigint[]), public.gilde_ausfuehren(bigint), public.gilde_pruefen() from public, anon, authenticated;
revoke execute on function public.gilde_gruenden(text, text, text, boolean), public.gilde_kandidaten(), public.gilde_einladen_npc(bigint), public.gilde_spieler_liste(), public.gilde_einladen_spieler(uuid),
  public.gilde_einladung_antwort(bigint, boolean), public.gilde_rang(bigint, text), public.gilde_verlassen(), public.gilde_modus(boolean), public.gilde_auftrag_vorschau(text, text),
  public.gilde_auftrag_planen(text, text), public.gilde_auftrag_antwort(bigint, boolean), public.gilde_angebot_antwort(bigint, boolean), public.gilde_status() from public, anon;
grant execute on function public.gilde_gruenden(text, text, text, boolean), public.gilde_kandidaten(), public.gilde_einladen_npc(bigint), public.gilde_spieler_liste(), public.gilde_einladen_spieler(uuid),
  public.gilde_einladung_antwort(bigint, boolean), public.gilde_rang(bigint, text), public.gilde_verlassen(), public.gilde_modus(boolean), public.gilde_auftrag_vorschau(text, text),
  public.gilde_auftrag_planen(text, text), public.gilde_auftrag_antwort(bigint, boolean), public.gilde_angebot_antwort(bigint, boolean), public.gilde_status() to authenticated;
""")
OUT.write_text('-- 043: Gilden – gründen, Mitglieder, Brieftauben, Ränge, Aufträge, Gerüchte, Ruf (erzeugt von tools/m043.py)\n' + '\n'.join(_p))
print(OUT, OUT.stat().st_size)
