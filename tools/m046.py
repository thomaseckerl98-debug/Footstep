# Erzeugt migrations/046_schlachten.sql
# Schlachten: Belagerung, offene Feldschlacht, Zweikampf. Vorbereitung 12 Std. ab Login des Betroffenen (spätestens nach 48 Std.),
# Vorbereitungsaufgaben mit Risiko, Brieftauben an Mitspieler, Verbündete aus anderen Dörfern, Beitreten (offen, Hinterhalt, im Geheimen),
# 15-Minuten-Kampf verschiebt die Chance um −20 … +20, Würfel auf dem Server, Erzählung, Folgen.
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from m036 import patch, parts as _p
OUT = pathlib.Path(__file__).resolve().parent.parent / 'migrations' / '046_schlachten.sql'
_p.clear(); A = _p.append

A(r"""
create table if not exists public.schlachten (
  id bigserial primary key,
  art text not null check (art in ('belagerung', 'feldschlacht', 'zweikampf')),
  ort text not null references public.welt_orte(id),
  a_name text not null, v_name text not null,
  a_ort text references public.welt_orte(id), v_ort text references public.welt_orte(id),
  a_spieler uuid references public.profiles(id) on delete set null, v_spieler uuid references public.profiles(id) on delete set null,
  a_basis numeric not null default 10, v_basis numeric not null default 10,
  grund text, gegner text not null default 'banditen',
  status text not null default 'angekuendigt' check (status in ('angekuendigt', 'vorbereitung', 'kampf', 'vorbei')),
  erstellt timestamptz not null default now(), prep_ab timestamptz, prep_bis timestamptz, ende_bis timestamptz,
  ereignis_id bigint, ergebnis jsonb
);
create table if not exists public.schlacht_teilnehmer (
  id bigserial primary key,
  schlacht_id bigint not null references public.schlachten(id) on delete cascade,
  seite text not null check (seite in ('A', 'V')),
  typ text not null check (typ in ('spieler', 'npc', 'ort')),
  player_id uuid references public.profiles(id) on delete cascade, npc_id bigint references public.npcs(id) on delete cascade, herkunft text,
  name text not null, kaempfer int not null default 1,
  modus text not null default 'offen' check (modus in ('dorf', 'offen', 'hinterhalt', 'geheim')),
  ankunft timestamptz, kampf_mod numeric, kampf_at timestamptz, geheim_pp numeric not null default 0, geheim_text text,
  erstellt timestamptz not null default now()
);
create unique index if not exists schlacht_teiln_spieler on public.schlacht_teilnehmer (schlacht_id, player_id) where player_id is not null;
create unique index if not exists schlacht_teiln_npc on public.schlacht_teilnehmer (schlacht_id, npc_id) where npc_id is not null;
create table if not exists public.schlacht_aufgaben (
  id bigserial primary key,
  schlacht_id bigint not null references public.schlachten(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  seite text not null, aufgabe text not null, bis timestamptz not null,
  fertig boolean not null default false, erfolg boolean, pp numeric not null default 0, text text
);
create unique index if not exists schlacht_aufg_einmal on public.schlacht_aufgaben (schlacht_id, player_id, aufgabe);
create table if not exists public.schlacht_hilfe (
  id bigserial primary key,
  schlacht_id bigint not null references public.schlachten(id) on delete cascade,
  von uuid references public.profiles(id) on delete cascade, an uuid not null references public.profiles(id) on delete cascade,
  seite text not null, status text not null default 'offen', erstellt timestamptz not null default now()
);
alter table public.schlachten enable row level security; alter table public.schlacht_teilnehmer enable row level security;
alter table public.schlacht_aufgaben enable row level security; alter table public.schlacht_hilfe enable row level security;
revoke all on public.schlachten, public.schlacht_teilnehmer, public.schlacht_aufgaben, public.schlacht_hilfe from anon, authenticated;

-- ───────── Vorbereitungsaufgaben ─────────
create or replace function public.sch_katalog(p_art text) returns jsonb language sql immutable as $$
  select case when p_art = 'zweikampf' then $j$[
    {"id": "training", "name": "Bis zur Erschöpfung üben", "min": 120, "pp": 6, "risiko": 0.1, "fail": 2, "fert": "kampf", "text": "Schläge, Paraden, Atem. Immer wieder."},
    {"id": "gegner", "name": "Den Gegner beobachten", "min": 90, "pp": 5, "risiko": 0.25, "fail": 0, "fert": "menschenkenntnis", "text": "Wie steht er, wohin schaut er, bevor er zuschlägt?"},
    {"id": "ruhe", "name": "Schlafen und essen", "min": 120, "pp": 4, "risiko": 0, "fail": 0, "fert": "", "text": "Ausgeruht kämpft es sich besser."},
    {"id": "kraeuter", "name": "Kräutersud brauen", "min": 60, "pp": 3, "risiko": 0.15, "fail": -2, "fert": "heilkunde", "text": "Etwas gegen Schmerz und Müdigkeit."},
    {"id": "gebet", "name": "Am Schrein beten", "min": 60, "pp": 3, "risiko": 0, "fail": 0, "fert": "", "text": "Ruhe im Kopf, Kraft in den Armen."}
  ]$j$::jsonb else $j$[
    {"id": "fallen", "name": "Fallen am Waldrand", "min": 120, "pp": 6, "risiko": 0.15, "fail": 2, "fert": "spuren", "seite": "V", "text": "Gruben, Schlingen, angespitzte Pfähle im Unterholz."},
    {"id": "armbrust", "name": "Armbrustposten auf der Mauer", "min": 150, "pp": 7, "risiko": 0.1, "fail": 3, "fert": "anpacken", "seite": "V", "text": "Schützenstände, Bolzen, Deckung."},
    {"id": "palisade", "name": "Palisade und Gräben", "min": 180, "pp": 7, "risiko": 0.1, "fail": 3, "fert": "anpacken", "seite": "V", "text": "Pfähle setzen, Gräben ausheben, Lücken schließen."},
    {"id": "kinder", "name": "Kinder und Alte in Sicherheit", "min": 120, "pp": 4, "risiko": 0.05, "fail": 2, "fert": "menschenkenntnis", "seite": "V", "text": "In die Höhle über dem Dorf – mit Vorräten und Decken. Verringert Verluste."},
    {"id": "brunnen", "name": "Brunnen und Vorräte sichern", "min": 90, "pp": 4, "risiko": 0.05, "fail": 1, "fert": "anpacken", "seite": "V", "text": "Damit der Hunger nicht mitkämpft."},
    {"id": "waffen", "name": "Waffen schärfen", "min": 90, "pp": 5, "risiko": 0.05, "fail": 2, "fert": "anpacken", "text": "Äxte, Sensen, Speere – alles, was schneidet."},
    {"id": "rede", "name": "Eine Rede halten", "min": 60, "pp": 6, "risiko": 0.2, "fail": -3, "fert": "ueberreden", "text": "Die Leute brauchen Mut, keine Angst."},
    {"id": "kundschaft", "name": "Kundschafter ausschicken", "min": 90, "pp": 3, "risiko": 0.15, "fail": 0, "fert": "spuren", "text": "Wie viele sind es wirklich? Danach weißt du es genau."},
    {"id": "spion", "name": "Spion ins feindliche Lager", "min": 120, "pp": 5, "risiko": 0.3, "fail": -3, "fert": "flink", "text": "Wer weiß, was der Gegner plant, ist ihm einen Schritt voraus."},
    {"id": "vergiften", "name": "Vorräte des Feindes vergiften", "min": 150, "pp": 9, "risiko": 0.35, "fail": -4, "fert": "heilkunde", "text": "Gefährlich und unehrenhaft – aber wirksam."},
    {"id": "schrein", "name": "Ein Opfer am Schrein", "min": 60, "pp": 3, "risiko": 0.1, "fail": 0, "fert": "altes_wissen", "text": "Für den Segen der Alten."},
    {"id": "boten", "name": "Verbündete rufen", "min": 30, "pp": 0, "risiko": 0, "fail": 0, "fert": "", "text": "Brieftauben an alle, die dir vertrauen – in jedem Dorf. Wer kann, kommt."}
  ]$j$::jsonb end;
$$;

-- Wer gehört zu welcher Seite? Bewohner des verteidigten Dorfes zählen automatisch zu „V“
create or replace function public.sch_seite(p_id bigint, p_uid uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select seite from schlacht_teilnehmer where schlacht_id = p_id and player_id = p_uid),
    (select case when s.a_spieler = p_uid then 'A' when s.v_spieler = p_uid then 'V'
                 when s.art = 'belagerung' and s.v_ort is not null and heim_ort(p_uid) = s.v_ort then 'V'
                 when s.art = 'belagerung' and s.a_ort is not null and s.a_spieler is not null and heim_ort(p_uid) = s.a_ort then 'A' end from schlachten s where s.id = p_id));
$$;
create or replace function public.sch_betroffen(p_id bigint) returns setof uuid language sql stable security definer set search_path = public as $$
  select p.id from profiles p, schlachten s where s.id = p_id and (p.id in (s.a_spieler, s.v_spieler) or (s.art = 'belagerung' and s.v_ort is not null and heim_ort(p.id) = s.v_ort));
$$;

-- Stärke einer Seite: Grundstärke + angekommene Helfer (geheime zählen nicht als Kämpfer)
create or replace function public.sch_staerke(p_id bigint, p_seite text) returns numeric language sql stable security definer set search_path = public as $$
  select (case when p_seite = 'A' then s.a_basis else s.v_basis end)
       + coalesce((select sum(t.kaempfer * case t.typ when 'spieler' then 3 when 'npc' then 1 else 0.9 end) from schlacht_teilnehmer t
                   where t.schlacht_id = s.id and t.seite = p_seite and t.modus <> 'geheim' and t.modus <> 'dorf' and (t.ankunft is null or t.ankunft <= coalesce(s.prep_bis, now()))), 0)
  from schlachten s where s.id = p_id;
$$;

-- Vor- und Nachteile aus Sicht der Verteidiger (+ hilft V, − hilft A)
create or replace function public.sch_faktoren(p_id bigint) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s schlachten; f jsonb := '[]'; x record; vid bigint; res jsonb; k jsonb := sch_katalog((select art from schlachten where id = p_id));
begin
  select * into s from schlachten where id = p_id;
  for x in select a.*, (select e->>'name' from jsonb_array_elements(k) e where e->>'id' = a.aufgabe) nm from schlacht_aufgaben a where a.schlacht_id = p_id and a.fertig and a.pp <> 0 loop
    f := f || jsonb_build_object('text', x.nm || case when x.erfolg then '' else ' (misslungen)' end || case when x.seite = 'A' then ' – beim Gegner' else '' end,
                                 'pp', case when x.seite = 'V' then x.pp else -x.pp end);
  end loop;
  for x in select * from schlacht_teilnehmer t where t.schlacht_id = p_id and (t.modus = 'hinterhalt' or t.geheim_pp <> 0) loop
    if x.modus = 'hinterhalt' then f := f || jsonb_build_object('text', 'Hinterhalt: ' || x.name, 'pp', case when x.seite = 'V' then 4 else -4 end, 'verdeckt', true, 'seite', x.seite); end if;
    if x.geheim_pp <> 0 then f := f || jsonb_build_object('text', coalesce(x.geheim_text, 'Im Verborgenen'), 'pp', case when x.seite = 'V' then x.geheim_pp else -x.geheim_pp end, 'verdeckt', true, 'seite', x.seite); end if;
  end loop;
  if s.art = 'belagerung' and s.v_ort is not null then
    vid := (select village_id from welt_orte where id = s.v_ort);
    if vid is not null then
      select v.res into res from village_eco v where v.village_id = vid;
      if coalesce((res->>'nahrung')::numeric, 50) < 25 and not exists (select 1 from schlacht_aufgaben where schlacht_id = p_id and aufgabe = 'brunnen' and erfolg) then
        f := f || jsonb_build_object('text', 'Das Dorf hungert', 'pp', -5);
      end if;
      if not exists (select 1 from villages v, jsonb_array_elements(coalesce(v.layout, '[]'::jsonb)) e where v.id = vid and e->>0 in ('schmiede', 'kaserne')) then
        f := f || jsonb_build_object('text', 'Schlechte Waffen – keine Schmiede im Dorf', 'pp', -3);
      end if;
      if (select mauer from welt_orte where id = s.v_ort) >= 1 then f := f || jsonb_build_object('text', 'Mauern um das Dorf', 'pp', 3 * (select mauer from welt_orte where id = s.v_ort)); end if;
    end if;
    if exists (select 1 from sch_betroffen(p_id)) and not exists (select 1 from schlacht_aufgaben where schlacht_id = p_id and seite = 'V' and aufgabe = 'rede' and erfolg) then
      f := f || jsonb_build_object('text', 'Angst und Panik – niemand hat zu den Leuten gesprochen', 'pp', -5);
    end if;
  end if;
  return f;
end $$;

create or replace function public.sch_chance(p_id bigint) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare sa numeric := sch_staerke(p_id, 'A'); sv numeric := sch_staerke(p_id, 'V'); f jsonb := sch_faktoren(p_id); pp numeric; p0 numeric; mv numeric; ma numeric; p numeric; s schlachten;
begin
  select * into s from schlachten where id = p_id;
  select coalesce(sum((e->>'pp')::numeric), 0) into pp from jsonb_array_elements(f) e;
  if s.art = 'zweikampf' then p0 := 50 + (sv - sa) * 3; else p0 := 100 * power(greatest(sv, 0.1), 1.5) / (power(greatest(sv, 0.1), 1.5) + power(greatest(sa, 0.1), 1.5)); end if;
  p0 := least(90, greatest(10, p0 + pp));
  select avg(kampf_mod) into mv from schlacht_teilnehmer where schlacht_id = p_id and seite = 'V' and kampf_mod is not null;
  select avg(kampf_mod) into ma from schlacht_teilnehmer where schlacht_id = p_id and seite = 'A' and kampf_mod is not null;
  p := least(97, greatest(3, p0 + least(20, greatest(-20, coalesce(mv, 0) - coalesce(ma, 0)))));
  return jsonb_build_object('a', round(sa, 1), 'v', round(sv, 1), 'anteil_v', round(100 * sv / greatest(sv + sa, 0.1)), 'faktoren', f, 'p0', round(p0), 'kampf', round(coalesce(mv, 0) - coalesce(ma, 0)), 'p', round(p));
end $$;

-- ───────── Anlegen ─────────
create or replace function public.sch_neu(p_art text, p_ort text, p_a_name text, p_v_name text, p_a_ort text, p_v_ort text, p_a_basis numeric, p_v_basis numeric,
                                          p_grund text, p_gegner text, p_a_spieler uuid, p_v_spieler uuid) returns bigint language plpgsql security definer set search_path = public as $$
declare sid bigint; eid bigint; spieler_betroffen boolean;
begin
  insert into schlachten (art, ort, a_name, v_name, a_ort, v_ort, a_spieler, v_spieler, a_basis, v_basis, grund, gegner)
  values (p_art, p_ort, p_a_name, p_v_name, p_a_ort, p_v_ort, p_a_spieler, p_v_spieler, p_a_basis, p_v_basis, p_grund, coalesce(p_gegner, 'banditen')) returning id into sid;
  spieler_betroffen := exists (select 1 from sch_betroffen(sid));
  if not spieler_betroffen then update schlachten set status = 'vorbereitung', prep_ab = now(), prep_bis = now() + interval '12 hours', ende_bis = now() + interval '24 hours' where id = sid; end if;
  insert into welt_ereignisse (ort, ziel, art, text, von, bis, ref)
    values (p_ort, coalesce(p_a_ort, p_v_ort), 'schlacht', case p_art when 'belagerung' then 'Belagerung: ' when 'zweikampf' then 'Zweikampf: ' else 'Schlacht: ' end || p_a_name || ' gegen ' || p_v_name, now(), now() + interval '4 days', 'schlacht:' || sid)
    returning id into eid;
  update schlachten set ereignis_id = eid where id = sid;
  perform welt_tat_neu('schlacht', p_ort,
    case p_art when 'belagerung' then p_a_name || ' belagern ' || ort_name(p_ort) when 'zweikampf' then 'Zweikampf: ' || p_a_name || ' fordert ' || p_v_name else 'Schlacht bei ' || ort_name(p_ort) || ': ' || p_a_name || ' gegen ' || p_v_name end,
    coalesce(p_grund, '') || ' Wer helfen will, muss sich beeilen.', 'Man sagt, bei ' || ort_name(p_ort) || ' wird bald gekämpft.', case when p_art = 'zweikampf' then 1 else 2 end, null, jsonb_build_object('schlacht', sid));
  if p_v_ort is not null and (select village_id from welt_orte where id = p_v_ort) is not null then
    perform eco_log((select village_id from welt_orte where id = p_v_ort), 'krise', case p_art when 'belagerung' then p_a_name || ' ziehen gegen das Dorf. ' || coalesce(p_grund, '') else p_a_name || ' fordert ' || p_v_name || ' zum Zweikampf.' end, null, now());
  end if;
  return sid;
end $$;

-- Login des Betroffenen startet die 12 Stunden; spätestens nach 48 Stunden beginnt sie von selbst
create or replace function public.sch_start(p_id bigint) returns void language sql security definer set search_path = public as $$
  update schlachten set status = 'vorbereitung', prep_ab = now(), prep_bis = now() + interval '12 hours', ende_bis = now() + interval '36 hours'
  where id = p_id and status = 'angekuendigt';
$$;

-- ───────── Aufgaben ─────────
create or replace function public.sch_aufgaben_pruefen() returns void language plpgsql security definer set search_path = public as $$
declare a record; k jsonb; r numeric; st int; ok boolean; n record; s schlachten; kom int := 0; txt text;
begin
  for a in select * from schlacht_aufgaben where not fertig and bis <= now() for update skip locked loop
    select * into s from schlachten where id = a.schlacht_id;
    select e into k from jsonb_array_elements(sch_katalog(s.art)) e where e->>'id' = a.aufgabe;
    st := case when coalesce(k->>'fert', '') = '' then 0 else fert_stufe(coalesce((select xp from fertigkeiten where player_id = a.player_id and id = k->>'fert'), 0)) end;
    r := (k->>'risiko')::numeric * greatest(0.2, 1 - 0.1 * st);
    ok := random() >= r;
    txt := case when ok then k->>'text' else 'Es lief nicht wie geplant.' end;
    if a.aufgabe = 'boten' then
      kom := 0;
      -- Vertraute aus anderen Dörfern und Gerettete
      for n in select x.id, x.name, coalesce(v.name, 'der Fremde') von, r2.lebensretter, r2.loyalty from npc_relations r2 join npcs x on x.id = r2.npc_id left join villages v on v.id = x.village_id
               where r2.player_id = a.player_id and x.tot_at is null and (dipl_stufe(r2.sympathy) >= 7 or r2.lebensretter)
                 and coalesce(x.village_id, -1) is distinct from (select village_id from welt_orte where id = s.v_ort) and coalesce(x.zustand, '') <> 'verletzt' loop
        if random() < least(0.9, 0.4 + coalesce(n.loyalty, 30) / 200.0 + case when n.lebensretter then 0.3 else 0 end) then
          insert into schlacht_teilnehmer (schlacht_id, seite, typ, npc_id, name, herkunft, kaempfer, modus, ankunft)
            values (a.schlacht_id, a.seite, 'npc', n.id, n.name, n.von, 1, 'offen', now() + make_interval(mins => 30 + floor(random() * 240)::int)) on conflict do nothing;
          kom := kom + 1;
        end if;
      end loop;
      -- Befreundete Orte schicken Bewaffnete
      for n in select o.id, o.name, o.einwohner from welt_orte o where o.id <> coalesce(s.v_ort, '') and o.id <> coalesce(s.a_ort, '') and o.art in ('dorf', 'stadt', 'burg')
               and dipl_stufe(dipl_punkte(coalesce(case when a.seite = 'V' then s.v_ort else s.a_ort end, heim_ort(a.player_id)), o.id)) >= 4 loop
        if random() < 0.55 then
          insert into schlacht_teilnehmer (schlacht_id, seite, typ, herkunft, name, kaempfer, modus, ankunft)
            values (a.schlacht_id, a.seite, 'ort', n.id, 'Bewaffnete aus ' || n.name, greatest(2, least(12, coalesce(n.einwohner, 20) / 15)), 'offen', now() + make_interval(mins => 60 + floor(random() * 300)::int));
          kom := kom + 1;
        end if;
      end loop;
      txt := case when kom = 0 then 'Die Tauben fliegen – aber niemand schreibt zurück.' else kom || ' Antworten kommen zurück: Sie sind unterwegs.' end;
      ok := true;
    end if;
    update schlacht_aufgaben set fertig = true, erfolg = ok, text = txt, pp = case when ok then (k->>'pp')::numeric else (k->>'fail')::numeric end where id = a.id;
    perform fert_xp(a.player_id, coalesce(nullif(k->>'fert', ''), 'anpacken'), case when ok then 2 else 1 end);
  end loop;
end $$;

create or replace function public.schlacht_aufgabe(p_id bigint, p_aufgabe text) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s schlachten; sd text; k jsonb; bis timestamptz;
begin
  perform sch_aufgaben_pruefen();
  select * into s from schlachten where id = p_id for update;
  sd := sch_seite(p_id, uid);
  if sd is null then raise exception 'Du gehörst zu keiner Seite dieses Kampfes.'; end if;
  if s.status <> 'vorbereitung' or s.prep_bis <= now() then raise exception 'Die Zeit der Vorbereitung ist vorbei.'; end if;
  if spieler_ort_jetzt(uid) is distinct from s.ort and not (s.art = 'zweikampf') and not (sd = 'A' and s.a_spieler = uid and heim_ort(uid) = s.a_ort) then raise exception 'Vorbereiten kannst du nur vor Ort.'; end if;
  if exists (select 1 from schlacht_aufgaben where player_id = uid and not fertig) then raise exception 'Du bist schon mit einer Aufgabe beschäftigt.'; end if;
  select e into k from jsonb_array_elements(sch_katalog(s.art)) e where e->>'id' = p_aufgabe;
  if k is null then raise exception 'Unbekannte Aufgabe.'; end if;
  if k->>'seite' is not null and k->>'seite' <> sd then raise exception 'Das ist eine Aufgabe für die andere Seite.'; end if;
  bis := now() + make_interval(mins => (k->>'min')::int);
  if bis > s.prep_bis then raise exception 'Dafür reicht die Zeit nicht mehr (noch % Min.).', greatest(0, round(extract(epoch from (s.prep_bis - now())) / 60)); end if;
  insert into schlacht_aufgaben (schlacht_id, player_id, seite, aufgabe, bis) values (p_id, uid, sd, p_aufgabe, bis);
  return json_build_object('ok', true, 'bis', bis);
end $$;

-- Brieftaube an einen Mitspieler: „Hilf uns!“
create or replace function public.schlacht_hilfe_rufen(p_id bigint, p_an uuid) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sd text := sch_seite(p_id, uid);
begin
  if sd is null then raise exception 'Du gehörst zu keiner Seite dieses Kampfes.'; end if;
  if p_an = uid then raise exception 'An dich selbst?'; end if;
  insert into schlacht_hilfe (schlacht_id, von, an, seite) select p_id, uid, p_an, sd where not exists (select 1 from schlacht_hilfe where schlacht_id = p_id and an = p_an);
  return json_build_object('ok', true, 'text', 'Die Brieftaube ist unterwegs.');
end $$;

-- ───────── Beitreten (Dritte) ─────────
create or replace function public.schlacht_beitreten(p_id bigint, p_seite text, p_modus text, p_npcs bigint[], p_geheim text) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s schlachten; l json; von text; m int := 0; an timestamptz; nm text; n record; gid bigint; ch numeric; ok boolean; gpp numeric := 0; gtxt text; gr gilden; feind text;
begin
  select * into s from schlachten where id = p_id for update;
  if s.status in ('kampf', 'vorbei') then raise exception 'Der Kampf ist schon entschieden oder in vollem Gange.'; end if;
  if s.art = 'zweikampf' then raise exception 'In einen Zweikampf mischt man sich nicht ein.'; end if;
  if sch_seite(p_id, uid) is not null then raise exception 'Du gehörst schon zu einer Seite.'; end if;
  if p_seite not in ('A', 'V') or p_modus not in ('offen', 'hinterhalt', 'geheim') then raise exception 'Ungültige Wahl.'; end if;
  perform pruefe_frei();
  l := spieler_lage(uid);
  if l->>'zustand' not in ('daheim', 'ort') then raise exception 'Du bist gerade unterwegs.'; end if;
  von := l->>'ort'; select character_name into nm from profiles where id = uid;
  if von <> s.ort then m := reise_minuten(von, s.ort); end if;
  an := now() + make_interval(mins => m);
  if an > coalesce(s.prep_bis, now() + interval '12 hours') then raise exception 'Du kämest zu spät – bis % braucht man ca. % Min.', ort_name(s.ort), m; end if;
  if p_modus = 'geheim' then
    gid := gilde_von(uid);
    if gid is null then raise exception 'Im Geheimen zu handeln braucht eine Gilde.'; end if;
    select * into gr from gilden where id = gid;
    if p_geheim not in ('vergiften', 'waffen', 'lager', 'meucheln') then raise exception 'Was genau wollt ihr tun?'; end if;
    if p_geheim = 'meucheln' and gr.ruf < 80 then raise exception 'Einen Heerführer zu meucheln traut sich nur eine gefürchtete Gilde zu.'; end if;
    ch := gilde_chance('sabotage', coalesce(case when p_seite = 'V' then s.a_ort else s.v_ort end, s.ort),
            array(select id from gilde_mitglieder where gilde_id = gid and (player_id = uid or npc_id = any(coalesce(p_npcs, '{}')))))
          - case p_geheim when 'meucheln' then 0.25 when 'lager' then 0.05 else 0 end;
    ok := random() < ch;
    gpp := case when ok then case p_geheim when 'vergiften' then 8 when 'waffen' then 6 when 'lager' then 7 else 25 end else -3 end;
    feind := case when p_seite = 'V' then s.a_name else s.v_name end;
    gtxt := case p_geheim
      when 'vergiften' then case when ok then 'Die Wasserfässer von ' || feind || ' riechen seit der Nacht seltsam.' else 'Der Giftanschlag auf ' || feind || ' flog auf.' end
      when 'waffen' then case when ok then 'Bei ' || feind || ' fehlen über Nacht Waffen.' else 'Der Waffendiebstahl bei ' || feind || ' misslang.' end
      when 'lager' then case when ok then 'Im Lager von ' || feind || ' brennen die Vorräte.' else 'Das Feuer im Lager von ' || feind || ' wurde gelöscht, bevor es griff.' end
      else case when ok then 'Der Heerführer von ' || feind || ' wurde tot in seinem Zelt gefunden. Neben ihm: ' || gilde_zeichen_name(gr.zeichen) || '.' else 'Der Anschlag auf den Heerführer von ' || feind || ' scheiterte.' end end;
    update gilden set ruf = ruf + case when ok then case p_geheim when 'meucheln' then 20 else 8 end else 1 end where id = gid;
    perform fert_xp(uid, 'flink', case when ok then 6 else 3 end);
    if not ok and random() < 0.4 then perform dipl_aendern(heim_ort(uid), coalesce(case when p_seite = 'V' then s.a_ort else s.v_ort end, s.ort), -6); gtxt := gtxt || ' Man hat jemanden erkannt.'; end if;
  end if;
  insert into schlacht_teilnehmer (schlacht_id, seite, typ, player_id, name, herkunft, kaempfer, modus, ankunft, geheim_pp, geheim_text)
    values (p_id, p_seite, 'spieler', uid, nm, ort_name(heim_ort(uid)), 1, p_modus, an, gpp, gtxt);
  for n in select x.id, x.name, coalesce(v.name, 'der Fremde') vn from npcs x join npc_relations r on r.npc_id = x.id and r.player_id = uid left join villages v on v.id = x.village_id
           where x.id = any(coalesce(p_npcs, '{}')) and x.tot_at is null and (dipl_stufe(r.sympathy) >= 7 or r.lebensretter) loop
    insert into schlacht_teilnehmer (schlacht_id, seite, typ, npc_id, name, herkunft, kaempfer, modus, ankunft) values (p_id, p_seite, 'npc', n.id, n.name, n.vn, 1, case when p_modus = 'geheim' then 'geheim' else p_modus end, an) on conflict do nothing;
  end loop;
  if m > 0 then update profiles set aufenthalt = case when s.ort = heim_ort(uid) then null else s.ort end, weg_von = von, weg_ab = now(), weg_bis = an, weg_pos = null where id = uid; end if;
  if p_modus = 'offen' then perform dipl_aendern(heim_ort(uid), case when p_seite = 'V' then s.a_ort else s.v_ort end, -3); end if;
  update schlacht_hilfe set status = 'zugesagt' where schlacht_id = p_id and an = uid;
  return json_build_object('ok', true, 'minuten', m, 'ankunft', an, 'geheim', gtxt);
end $$;

-- ───────── Angriff / Herausforderung durch Spieler ─────────
create or replace function public.schlacht_angriff_planen(p_ziel text) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); heim text := heim_ort(uid); o welt_orte; st int; sid bigint; nm text; dorf text;
begin
  perform pruefe_frei();
  select * into o from welt_orte where id = p_ziel;
  if o.id is null or o.id = heim then raise exception 'Dieses Ziel geht nicht.'; end if;
  if o.art not in ('dorf', 'burg', 'stadt') then raise exception 'Das ist kein Ort, den man belagern kann.'; end if;
  if exists (select 1 from schlachten where status <> 'vorbei' and (a_ort = heim or v_ort = heim)) then raise exception 'Dein Dorf steckt schon in einem Kampf.'; end if;
  if exists (select 1 from schlachten where status <> 'vorbei' and (a_ort = p_ziel or v_ort = p_ziel)) then raise exception '% steckt schon in einem Kampf.', o.name; end if;
  if exists (select 1 from schlachten where a_spieler = uid and erstellt > now() - interval '3 days') then raise exception 'Deine Leute brauchen Ruhe – höchstens ein Angriff in drei Tagen.'; end if;
  st := dipl_stufe(dipl_punkte(heim, p_ziel));
  select character_name into nm from profiles where id = uid; dorf := ort_name(heim);
  sid := sch_neu('belagerung', p_ziel, 'die Leute aus ' || dorf, o.name, heim, p_ziel, round(dorf_staerke(heim) * 0.7, 1), dorf_staerke(p_ziel),
                 nm || ' aus ' || dorf || ' zieht mit Bewaffneten gegen ' || o.name || '.', 'banditen', uid, null);
  -- Ein Angriff ohne Feindschaft spricht sich herum
  perform dipl_aendern(heim, p_ziel, -6);
  if st >= 0 then
    perform ansehen_add(uid, -5, 'Angriff ohne Feindschaft auf ' || o.name);
    perform dipl_aendern(heim, x.id, -2) from welt_orte x where x.reich = o.reich and x.id not in (heim, p_ziel) and x.art <> 'dorf';
  end if;
  -- Wer selbst angreift, bereitet sich sofort vor; das Ziel bekommt seine 12 Stunden ab Login
  if not exists (select 1 from sch_betroffen(sid) x where x <> uid) then update schlachten set status = 'vorbereitung', prep_ab = now(), prep_bis = now() + interval '12 hours', ende_bis = now() + interval '36 hours' where id = sid; end if;
  return json_build_object('ok', true, 'id', sid, 'text', 'Der Angriff auf ' || o.name || ' ist beschlossen. ' || case when st >= 0 then 'Ohne Feindschaft – das wird man euch übelnehmen.' else '' end);
end $$;

create or replace function public.schlacht_fordern(p_gegner uuid) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a text; b text; sid bigint; ka int; kb int;
begin
  if p_gegner = uid then raise exception 'Gegen dich selbst?'; end if;
  if exists (select 1 from schlachten where art = 'zweikampf' and status <> 'vorbei' and (uid in (a_spieler, v_spieler) or p_gegner in (a_spieler, v_spieler))) then raise exception 'Einer von euch hat schon einen Zweikampf vor sich.'; end if;
  select character_name into a from profiles where id = uid; select character_name into b from profiles where id = p_gegner;
  ka := fert_stufe(coalesce((select xp from fertigkeiten where player_id = uid and id = 'kampf'), 0)); kb := fert_stufe(coalesce((select xp from fertigkeiten where player_id = p_gegner and id = 'kampf'), 0));
  sid := sch_neu('zweikampf', heim_ort(p_gegner), a, b, heim_ort(uid), heim_ort(p_gegner), 5 + ka, 5 + kb, a || ' hat ' || b || ' öffentlich herausgefordert.', 'banditen', uid, p_gegner);
  return json_build_object('ok', true, 'id', sid, 'text', 'Die Herausforderung ist ausgesprochen. ' || b || ' hat 12 Stunden zur Vorbereitung, sobald er davon erfährt.');
end $$;

-- ───────── Kampf und Auflösung ─────────
create or replace function public.schlacht_kampf_ende(p_id bigint, p_zeit int, p_dauer int, p_sieg boolean) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s schlachten; sd text; md numeric; f numeric;
begin
  select * into s from schlachten where id = p_id for update;
  if s.status <> 'kampf' then raise exception 'Jetzt wird hier nicht gekämpft.'; end if;
  sd := sch_seite(p_id, uid); if sd is null then raise exception 'Du gehörst zu keiner Seite.'; end if;
  insert into schlacht_teilnehmer (schlacht_id, seite, typ, player_id, name, modus) select p_id, sd, 'spieler', uid, (select character_name from profiles where id = uid), 'dorf'
    where not exists (select 1 from schlacht_teilnehmer where schlacht_id = p_id and player_id = uid);
  if (select kampf_mod from schlacht_teilnehmer where schlacht_id = p_id and player_id = uid) is not null then raise exception 'Du hast schon gekämpft.'; end if;
  f := least(1, greatest(0, p_zeit::numeric / greatest(1, p_dauer)));
  md := case when p_sieg then 20 else round((f - 0.5) * 40, 1) end;
  update schlacht_teilnehmer set kampf_mod = md, kampf_at = now() where schlacht_id = p_id and player_id = uid;
  perform fert_xp(uid, 'kampf', 2 + f * 4);
  perform sch_aufloesen_wenn(p_id);
  return json_build_object('ok', true, 'mod', md, 'stand', sch_chance(p_id));
end $$;

-- Begründungen
create or replace function public.sch_grund(p_art text, p_fall text) returns text language sql volatile as $$
  select (case p_fall
    when 'held' then array['Doch im Rücken der Verteidiger öffnete jemand ein Tor – Verrat, flüstert man später.', 'Dann kam Verstärkung über den Kamm, mit der niemand gerechnet hatte.', 'Ein Sturm drehte, Rauch trieb in die eigenen Reihen, und in der Verwirrung brach die Linie.']
    when 'wunder' then array['Ein einzelner Pfeil traf den Anführer der Gegenseite – und mit ihm fiel der Mut seiner Leute.', 'Im letzten Moment kamen Verbündete aus dem Wald, die niemand mehr erwartet hatte.', 'Ein Pferd scheute, die Fahne fiel, und plötzlich liefen sie.']
    when 'sieg' then array['Die Vorbereitung hat sich ausgezahlt.', 'Die Linie hielt, Stunde um Stunde, bis der Gegner aufgab.', 'Am Ende war es Mut und gute Arbeit, nicht Glück.']
    else array['Es waren zu viele.', 'Die Vorbereitung reichte nicht.', 'Die Mauer hielt nicht lange genug.'] end)[1 + floor(random() * 3)::int];
$$;

create or replace function public.sch_aufloesen_wenn(p_id bigint) returns void language plpgsql security definer set search_path = public as $$
declare s schlachten;
begin
  select * into s from schlachten where id = p_id;
  if s.status = 'kampf' and (now() >= s.ende_bis or not exists (
       select 1 from (select x from sch_betroffen(p_id) x union select player_id from schlacht_teilnehmer where schlacht_id = p_id and typ = 'spieler' and modus <> 'geheim' and (ankunft is null or ankunft <= s.prep_bis)) q(pid)
       where not exists (select 1 from schlacht_teilnehmer t where t.schlacht_id = p_id and t.player_id = q.pid and t.kampf_mod is not null))) then
    perform sch_aufloesen(p_id);
  end if;
end $$;

create or replace function public.sch_aufloesen(p_id bigint) returns void language plpgsql security definer set search_path = public as $$
declare s schlachten; c jsonb; p numeric; wurf numeric := random() * 100; vsieg boolean; gut boolean; fall text; txt text; sieger text; verlierer text;
        x record; vid bigint; aid bigint; tote text[] := '{}'; verletzt int := 0; ruhm_pl int; gefahr boolean;
begin
  select * into s from schlachten where id = p_id and status <> 'vorbei' for update;
  if s.id is null then return; end if;
  c := sch_chance(p_id); p := (c->>'p')::numeric;
  vsieg := wurf < p;
  -- „gut gekämpft“ aus Sicht der Spieler, die gekämpft haben
  gut := coalesce((select avg(case when seite = 'V' then kampf_mod else -kampf_mod end) from schlacht_teilnehmer where schlacht_id = p_id and kampf_mod is not null), 0) >= 0;
  sieger := case when vsieg then s.v_name else s.a_name end; verlierer := case when vsieg then s.a_name else s.v_name end;
  fall := case when vsieg and p < 35 then 'wunder' when not vsieg and p > 65 then 'held' when vsieg then 'sieg' else 'niederlage' end;
  txt := case s.art when 'zweikampf' then sieger || ' gewinnt den Zweikampf gegen ' || verlierer || '. '
                    when 'belagerung' then case when vsieg then s.v_name || ' hält stand. Die Belagerung durch ' || s.a_name || ' ist gebrochen. ' else s.a_name || ' brechen in ' || ort_name(s.ort) || ' ein. ' end
                    else sieger || ' gewinnt die Schlacht bei ' || ort_name(s.ort) || '. ' end
         || sch_grund(s.art, fall);
  if fall = 'held' then txt := 'Entgegen aller Erwartung verloren. ' || txt; end if;
  if fall = 'wunder' then txt := 'Ein unerwarteter Sieg! ' || txt; end if;
  -- Folgen für Spieler
  for x in select t.*, sch_seite(p_id, t.player_id) sd from schlacht_teilnehmer t where t.schlacht_id = p_id and t.typ = 'spieler' and (t.ankunft is null or t.ankunft <= coalesce(s.prep_bis, now())) loop
    ruhm_pl := case when (x.sd = 'V') = vsieg then case x.modus when 'geheim' then 0 when 'dorf' then 8 else 12 end else case when coalesce(x.kampf_mod, -99) >= 10 then 6 else 0 end end;
    if x.modus = 'geheim' and gilde_von(x.player_id) is not null and not (select geheim from gilden where id = gilde_von(x.player_id)) and (x.sd = 'V') = vsieg then ruhm_pl := 10; end if;
    if ruhm_pl > 0 then update profiles set ruhm = ruhm + ruhm_pl where id = x.player_id; end if;
    if x.modus = 'dorf' and (x.sd = 'V') = vsieg then perform ansehen_add(x.player_id, 8, case s.art when 'zweikampf' then 'Zweikampf gewonnen' else 'Das Dorf verteidigt' end); end if;
    if x.modus in ('offen', 'hinterhalt') then
      perform dipl_aendern(heim_ort(x.player_id), case when x.sd = 'V' then s.v_ort else s.a_ort end, case when (x.sd = 'V') = vsieg then 5 else 3 end);
      perform dipl_aendern(heim_ort(x.player_id), case when x.sd = 'V' then s.a_ort else s.v_ort end, -4);
    elsif x.modus = 'geheim' then
      perform dipl_aendern(heim_ort(x.player_id), case when x.sd = 'V' then s.v_ort else s.a_ort end, 7);
    end if;
  end loop;
  -- Verluste im verteidigten oder angreifenden Spielerdorf
  vid := (select village_id from welt_orte where id = case when vsieg then s.a_ort else s.v_ort end);
  if s.art <> 'zweikampf' and vid is not null then
    gefahr := p < 25 and not vsieg and not exists (select 1 from schlacht_aufgaben where schlacht_id = p_id and aufgabe = 'kinder' and erfolg);
    for x in select id, name, namenlos from npcs where village_id = vid and tot_at is null order by random() limit case when fall = 'held' then 2 else 4 end loop
      if gefahr and array_length(tote, 1) is null and random() < 0.35 then
        update npcs set tot_at = now(), todesursache = 'gefallen bei ' || ort_name(s.ort) where id = x.id; tote := tote || x.name;
      else
        update npcs set zustand = 'verletzt', zustand_bis = now() + interval '2 days' where id = x.id; verletzt := verletzt + 1;
      end if;
    end loop;
    perform eco_add(vid, '{"nahrung": -20, "holz": -15, "stimmung": -6}'::jsonb);
  end if;
  aid := (select village_id from welt_orte where id = case when vsieg then s.v_ort else s.a_ort end);
  if s.art <> 'zweikampf' and aid is not null then perform eco_add(aid, '{"nahrung": 10, "waren": 4, "stimmung": 6}'::jsonb); end if;
  if verletzt > 0 then txt := txt || ' ' || verletzt || ' Verletzte.'; end if;
  if array_length(tote, 1) > 0 then txt := txt || ' Gefallen: ' || array_to_string(tote, ', ') || '.'; end if;
  -- Orte untereinander
  if s.a_ort is not null and s.v_ort is not null then perform dipl_aendern(s.a_ort, s.v_ort, -8); end if;
  update schlachten set status = 'vorbei', ergebnis = jsonb_build_object('v_sieg', vsieg, 'p', p, 'wurf', round(wurf), 'fall', fall, 'text', txt, 'sieger', sieger, 'chance', c, 'tote', to_jsonb(tote), 'verletzt', verletzt) where id = p_id;
  update welt_ereignisse set erledigt = true, bis = now() + interval '12 hours', text = txt where id = s.ereignis_id;
  perform welt_tat_neu('schlacht', s.ort, case s.art when 'zweikampf' then sieger || ' gewinnt den Zweikampf' else sieger || ' siegt bei ' || ort_name(s.ort) end, txt,
                       'Man erzählt sich, wie es bei ' || ort_name(s.ort) || ' ausgegangen ist.', case when s.art = 'zweikampf' then 1 else 2 end, null, jsonb_build_object('schlacht', p_id));
  for x in select village_id from welt_orte where id in (s.a_ort, s.v_ort) and village_id is not null loop
    perform eco_log(x.village_id, 'krise', txt, null, now());
  end loop;
end $$;

-- ───────── Takt: KI-Überfälle, Feldschlachten, Fristen ─────────
create or replace function public.schlachten_pruefen(p_ki boolean default false) returns void language plpgsql security definer set search_path = public as $$
declare s record; o record; f record; b numeric; feind record; gr text; nm text; ra record; rb record;
begin
  perform sch_aufgaben_pruefen();
  for s in select id from schlachten where status = 'angekuendigt' and erstellt < now() - interval '48 hours' loop perform sch_start(s.id); end loop;
  update schlachten set status = 'kampf' where status = 'vorbereitung' and prep_bis <= now();
  for s in select id from schlachten where status = 'kampf' loop perform sch_aufloesen_wenn(s.id); end loop;
  if not p_ki then return; end if;  -- neue Kämpfe entstehen nur im stündlichen Takt
  -- KI-Überfälle auf Spielerdörfer: selten, nie zwei auf einmal, frühestens drei Tage nach Gründung
  for o in select w.* from welt_orte w join villages v on v.id = w.village_id
           where exists (select 1 from dorf_spieler(v.id)) and v.created_at < now() - interval '3 days'
             and not exists (select 1 from schlachten x where (x.v_ort = w.id or x.a_ort = w.id) and (x.status <> 'vorbei' or x.erstellt > now() - interval '5 days')) loop
    if random() < 0.015 then
      select x.id, x.name, dipl_stufe(dipl_punkte(o.id, x.id)) st into feind from welt_orte x where x.id <> o.id and x.art in ('dorf', 'burg', 'stadt')
        order by dipl_punkte(o.id, x.id), random() limit 1;
      b := dorf_staerke(o.id);
      if feind.id is not null and feind.st <= -4 then
        perform sch_neu('belagerung', o.id, 'Bewaffnete aus ' || feind.name, o.name, feind.id, o.id, round(b * (0.8 + random() * 0.6), 1), b,
                        'Der Streit mit ' || feind.name || ' ist zu weit gegangen.', 'banditen', null, null);
      else
        gr := (array['Plünderer aus dem Nebelmoor', 'Söldner ohne Herrn', 'eine Räuberbande aus den Bergen', 'Wilderer mit Armbrüsten'])[1 + floor(random() * 4)::int];
        perform sch_neu('belagerung', o.id, gr, o.name, null, o.id, round(b * (0.7 + random() * 0.6), 1), b,
                        'Späher haben sie im Wald gesehen. Sie wollen Vorräte – und nehmen sie sich mit Gewalt.', 'banditen', null, null);
      end if;
    end if;
  end loop;
  -- Offene Feldschlachten zwischen verfeindeten Reichen – jeder kann sich anschließen
  if not exists (select 1 from schlachten where art = 'feldschlacht' and status <> 'vorbei') and random() < 0.01 then
    select w.a, w.b into f from welt_beziehungen w join welt_reiche x on x.id = w.a join welt_reiche y on y.id = w.b where w.art = 'rivalitaet' order by random() limit 1;
    if f.a is not null then
      select o.id, o.name, o.x, o.y into ra from welt_orte o where o.reich = f.a and o.art in ('burg', 'stadt') order by random() limit 1;
      select o.id, o.name, o.x, o.y into rb from welt_orte o where o.reich = f.b and o.art in ('burg', 'stadt') order by sqrt(power(o.x - coalesce(ra.x, 0), 2) + power(o.y - coalesce(ra.y, 0), 2)) limit 1;
      if ra.id is not null and rb.id is not null then
        perform sch_neu('feldschlacht', ra.id, (select name from welt_reiche where id = f.a), (select name from welt_reiche where id = f.b), ra.id, rb.id,
                        round(dorf_staerke(ra.id) * 0.8, 1), round(dorf_staerke(rb.id) * 0.8, 1), 'Die alte Feindschaft bricht wieder auf. Vor ' || ra.name || ' sammeln sich die Heere.', 'banditen', null, null);
      end if;
    end if;
  end if;
end $$;
""")

A(r"""
-- ───────── Für die Oberfläche ─────────
create or replace function public.schlacht_status() returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sr record;
begin
  perform schlachten_pruefen(false);
  -- Die 12 Stunden beginnen, wenn die Verteidiger (oder der Geforderte) davon erfahren
  for sr in select id from schlachten where status = 'angekuendigt' and sch_seite(id, uid) = 'V' loop perform sch_start(sr.id); end loop;
  return (select coalesce(json_agg(x order by (x->>'meine')::boolean desc, x->>'erstellt' desc), '[]'::json) from (
    select json_build_object('id', s.id, 'art', s.art, 'ort', s.ort, 'ort_name', ort_name(s.ort), 'a_name', s.a_name, 'v_name', s.v_name, 'grund', s.grund, 'gegner', s.gegner,
      'status', s.status, 'erstellt', s.erstellt, 'prep_bis', s.prep_bis, 'ende_bis', s.ende_bis, 'ergebnis', s.ergebnis,
      'meine', sch_seite(s.id, uid) is not null, 'seite', sch_seite(s.id, uid), 'betroffen', uid in (select sch_betroffen(s.id)),
      'chance', case when sch_seite(s.id, uid) is not null or s.status = 'vorbei' then sch_chance(s.id) end,
      'kraefte', json_build_object('v', (select coalesce(json_agg(json_build_object('name', t.name, 'typ', t.typ, 'herkunft', t.herkunft, 'kaempfer', t.kaempfer, 'modus', t.modus, 'unterwegs', t.ankunft > now())), '[]'::json)
                                            from schlacht_teilnehmer t where t.schlacht_id = s.id and t.seite = 'V' and (t.modus not in ('geheim', 'hinterhalt') or sch_seite(s.id, uid) = 'V' or t.player_id = uid)),
                                   'a', (select coalesce(json_agg(json_build_object('name', t.name, 'typ', t.typ, 'herkunft', t.herkunft, 'kaempfer', t.kaempfer, 'modus', t.modus, 'unterwegs', t.ankunft > now())), '[]'::json)
                                            from schlacht_teilnehmer t where t.schlacht_id = s.id and t.seite = 'A' and (t.modus not in ('geheim', 'hinterhalt') or sch_seite(s.id, uid) = 'A' or t.player_id = uid)),
                                   'schaetzung_v', round(sch_staerke(s.id, 'V') * case when sch_seite(s.id, uid) = 'V' then 1 else 0.8 + random() * 0.4 end),
                                   'schaetzung_a', round(sch_staerke(s.id, 'A') * case when exists (select 1 from schlacht_aufgaben where schlacht_id = s.id and aufgabe = 'kundschaft' and erfolg and seite = sch_seite(s.id, uid)) or sch_seite(s.id, uid) = 'A' then 1 else 0.75 + random() * 0.5 end),
                                   'genau', exists (select 1 from schlacht_aufgaben where schlacht_id = s.id and aufgabe = 'kundschaft' and erfolg and seite = sch_seite(s.id, uid))),
      'katalog', case when sch_seite(s.id, uid) is not null then (select jsonb_agg(e || jsonb_build_object(
          'erledigt', exists (select 1 from schlacht_aufgaben a where a.schlacht_id = s.id and a.player_id = uid and a.aufgabe = e->>'id'),
          'andere', (select string_agg(pp.character_name, ', ') from schlacht_aufgaben a join profiles pp on pp.id = a.player_id where a.schlacht_id = s.id and a.aufgabe = e->>'id' and a.player_id <> uid)))
          from jsonb_array_elements(sch_katalog(s.art)) e where e->>'seite' is null or e->>'seite' = sch_seite(s.id, uid)) end,
      'aufgaben', (select coalesce(json_agg(json_build_object('aufgabe', a.aufgabe, 'bis', a.bis, 'fertig', a.fertig, 'erfolg', a.erfolg, 'text', a.text, 'pp', a.pp) order by a.bis), '[]'::json)
                   from schlacht_aufgaben a where a.schlacht_id = s.id and a.player_id = uid),
      'mein_kampf', (select kampf_mod from schlacht_teilnehmer where schlacht_id = s.id and player_id = uid),
      'angekommen', coalesce((select ankunft <= now() from schlacht_teilnehmer where schlacht_id = s.id and player_id = uid), true),
      'hilfe_von', (select pp.character_name from schlacht_hilfe h join profiles pp on pp.id = h.von where h.schlacht_id = s.id and h.an = uid and h.status = 'offen' limit 1),
      'minuten', reise_minuten(coalesce(spieler_ort_jetzt(uid), heim_ort(uid)), s.ort),
      'gefahr', s.status <> 'vorbei' and (sch_chance(s.id)->>'p0')::numeric < 25) x
    from schlachten s where s.status <> 'vorbei' or (s.erstellt > now() - interval '3 days' and (sch_seite(s.id, uid) is not null))) q(x));
end $$;

-- Verbündete, die man mitnehmen kann (Stufe ≥ +7 oder Gerettete)
create or replace function public.schlacht_verbuendete() returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', n.id, 'name', n.name, 'beruf', n.job, 'wohnort', coalesce(v.name, 'unterwegs'), 'lebensretter', r.lebensretter, 'stufe', dipl_stufe(r.sympathy)) order by r.lebensretter desc, r.sympathy desc), '[]'::json)
  from npc_relations r join npcs n on n.id = r.npc_id left join villages v on v.id = n.village_id
  where r.player_id = auth.uid() and n.tot_at is null and coalesce(n.zustand, '') <> 'verletzt' and (dipl_stufe(r.sympathy) >= 7 or r.lebensretter);
$$;
""")

# Während der Vorbereitung: keine anderen Abenteuer, keine Beschäftigung
patch('pruefe_frei()', [
    ("  perform beschaeftigung_abschluss(auth.uid(), false);",
     "  perform beschaeftigung_abschluss(auth.uid(), false);\n  if exists (select 1 from schlachten s where s.status = 'vorbereitung' and auth.uid() in (select sch_betroffen(s.id))) then\n    raise exception 'Dein Dorf bereitet sich auf einen Kampf vor. Andere Abenteuer müssen warten – nutze die Zeit für die Vorbereitung.';\n  end if;\n  if exists (select 1 from schlacht_aufgaben where player_id = auth.uid() and not fertig and bis > now()) then raise exception 'Du bist gerade mit der Kampfvorbereitung beschäftigt.'; end if;"),
])
patch('amt_tick_all()', [], inject_after_begin='perform schlachten_pruefen(true);')

A(r"""
revoke execute on function public.sch_katalog(text), public.sch_seite(bigint, uuid), public.sch_betroffen(bigint), public.sch_staerke(bigint, text), public.sch_faktoren(bigint), public.sch_chance(bigint),
  public.sch_neu(text, text, text, text, text, text, numeric, numeric, text, text, uuid, uuid), public.sch_start(bigint), public.sch_aufgaben_pruefen(), public.sch_grund(text, text),
  public.sch_aufloesen_wenn(bigint), public.sch_aufloesen(bigint), public.schlachten_pruefen(boolean) from public, anon, authenticated;
revoke execute on function public.schlacht_aufgabe(bigint, text), public.schlacht_hilfe_rufen(bigint, uuid), public.schlacht_beitreten(bigint, text, text, bigint[], text), public.schlacht_angriff_planen(text),
  public.schlacht_fordern(uuid), public.schlacht_kampf_ende(bigint, int, int, boolean), public.schlacht_status(), public.schlacht_verbuendete() from public, anon;
grant execute on function public.schlacht_aufgabe(bigint, text), public.schlacht_hilfe_rufen(bigint, uuid), public.schlacht_beitreten(bigint, text, text, bigint[], text), public.schlacht_angriff_planen(text),
  public.schlacht_fordern(uuid), public.schlacht_kampf_ende(bigint, int, int, boolean), public.schlacht_status(), public.schlacht_verbuendete() to authenticated;
""")
OUT.write_text('-- 046: Schlachten – Belagerung, Feldschlacht, Zweikampf (erzeugt von tools/m046.py)\n' + '\n'.join(_p))
print(OUT, OUT.stat().st_size)
