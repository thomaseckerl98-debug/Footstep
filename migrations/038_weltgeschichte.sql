-- 038: Gemeinsame Weltgeschichte (erzeugt von tools/m038.py)

create table if not exists public.welt_lore (id text primary key, text text not null);
insert into public.welt_lore (id, text) values ('kurz', $l$Das Moosland: rau, menschlich, mittelalterlich, KEINE Magie (keine Götter, Geister, Zauber, Ungeheuer; Aberglaube ja, nie bewiesen). Völker: meist Menschen, dazu Zwerge (Graukamm), Elfen (Grünhag), Halblinge (Hügel im Süden). Das Hügelland (Tannhöhe, Seewinkel, Rotklamm) liegt in Hochtälern nördlich von Furtenau; die Alten sagen, das Tal hieß einst Moosherz – von hier stammte Hartmut, der vor 200 Jahren die Täler einte. Reiche: Königreich Moosherz (Hauptstadt Moosherz am Meer, Hof, Kanzlei mit der Schreiberin Irmentrud, Herzog Ansgar führt den Adel, Streit um das Bauernrecht; Orte Furtenau, Hollerbrück, Butterau, Goldacker, Kalkgrube, Ginsterhof). Grafschaft Rabenfels (Burg auf dem Felsen, Burgvogt Ragnolf, Kaplan Severin, Tochter des Grafen Gerlinde lebt im Kloster Morgenstern; Fleckfieber, Grenze geschlossen; Eisgrund mit Silbermine). Salzbund (Rat der Reeder, Salzwacht, Möwenkap, Tangfurt). Ostmark (Markgräfin Ysolde, Brandenstein, Traubenhang, Grenzfeste Kammwacht). Nebelmoor (Moorstämme, die Alte vom Moor). Frei: Krähenstieg mit den Graumänteln (Söldner und Spitzel mit Rabenring), Kloster Morgenstern, Rußgrund. Geschichte: Vor 20 Jahren verlor Moosherz den Grenzkrieg gegen die Ostmark und musste Kammwacht abtreten; bei Kammwacht verbrannte eine Scheune mit Menschen. Im Hügelland gab es vor wenigen Jahren einen Hungerwinter. Seit dem Frühjahr tauchen Rabenbriefe auf: jemand aus Rabenfels wirbt mit Silber und Drohungen um die Dörfer.$l$) on conflict (id) do update set text = excluded.text;
create table if not exists public.welt_zustand (key text primary key, titel text, wert jsonb not null default '{}', seit timestamptz not null default now(), player_id uuid references public.profiles(id) on delete set null, tat_id bigint);
create table if not exists public.welt_taten (
  id bigserial primary key, art text not null, ort text references public.welt_orte(id), titel text not null, text text not null, geruecht text,
  gross smallint not null default 1, player_id uuid references public.profiles(id) on delete set null, at timestamptz not null default now(), daten jsonb not null default '{}');
create index if not exists welt_taten_at on public.welt_taten (at desc);
create table if not exists public.welt_herrscher_hist (id bigserial primary key, reich text not null, alt text, neu text not null, grund text, player_id uuid, at timestamptz not null default now());
alter table public.profiles add column if not exists nachrichten_gesehen timestamptz not null default now();
alter table public.welt_lore enable row level security; alter table public.welt_zustand enable row level security; alter table public.welt_taten enable row level security; alter table public.welt_herrscher_hist enable row level security;
revoke all on public.welt_lore, public.welt_zustand, public.welt_taten, public.welt_herrscher_hist from anon, authenticated;


create or replace function public.npc_ort_id(p_npc bigint) returns text language sql stable security definer set search_path = public as $$
  select coalesce(n.welt_ort, (select o.id from welt_orte o where o.village_id = n.village_id)) from npcs n where n.id = p_npc;
$$;
create or replace function public.ort_abstand(p_a text, p_b text) returns int language sql stable security definer set search_path = public as $$
  select case when p_a is null or p_b is null then 0 when p_a = p_b then 0 else coalesce(reise_minuten(p_a, p_b), 0) end;
$$;
-- Wann erreicht die Nachricht einer Tat einen Ort? (halbe Gehzeit; kleine Taten bleiben in der Gegend)
create or replace function public.welt_tat_ankunft(p_ort_tat text, p_at timestamptz, p_gross int, p_ort text) returns timestamptz language sql stable security definer set search_path = public as $$
  select case when m > case p_gross when 1 then 600 when 2 then 1500 else 100000 end then null else p_at + make_interval(mins => round(m * 0.5)::int) end
  from (select ort_abstand(p_ort_tat, p_ort) m) x;
$$;
create or replace function public.welt_tat_neu(p_art text, p_ort text, p_titel text, p_text text, p_geruecht text, p_gross int, p_player uuid, p_daten jsonb default '{}')
returns bigint language plpgsql security definer set search_path = public as $$
declare tid bigint;
begin
  insert into welt_taten (art, ort, titel, text, geruecht, gross, player_id, daten) values (p_art, p_ort, left(p_titel, 160), left(p_text, 600), left(p_geruecht, 600), greatest(1, least(3, coalesce(p_gross, 1))), p_player, coalesce(p_daten, '{}'))
  returning id into tid;
  insert into welt_ereignisse (ort, art, text, von, bis, erledigt, ref) values (p_ort, 'tat', left(p_text, 600), now(), now() + interval '14 days', true, 'tat:' || tid);
  return tid;
end $$;

-- Was erzählt man sich an einem Ort? (nur was schon angekommen ist; von weit her verzerrt)
create or replace function public.welt_neuigkeiten(p_ort text, p_n int default 6) returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', id, 'art', art, 'titel', titel, 'text', txt, 'von', von, 'frisch', frisch, 'quelle', quelle, 'folge', folge) order by at desc), '[]'::json) from (
    select t.id, t.art, t.titel, t.at, ort_name(t.ort) von,
      case when ort_abstand(t.ort, p_ort) > 500 and t.geruecht is not null then t.geruecht else t.text end txt,
      welt_tat_ankunft(t.ort, t.at, t.gross, p_ort) > now() - interval '48 hours' frisch,
      case when ort_abstand(t.ort, p_ort) = 0 then 'Es ist hier geschehen, jeder hat es mitbekommen.'
           when ort_abstand(t.ort, p_ort) < 240 then 'Ein Bote aus ' || coalesce(ort_name(t.ort), 'der Nähe') || ' hat es erzählt.'
           when ort_abstand(t.ort, p_ort) < 600 then 'Händler aus der Richtung von ' || coalesce(ort_name(t.ort), 'dort') || ' erzählen es.'
           else 'Man erzählt es sich, von weit her. Wer weiß, was davon stimmt.' end quelle,
      case t.art when 'herrscher' then 'Wenn oben einer stürzt, spüren wir das unten zuerst – bei den Abgaben und bei den Soldaten.'
                 when 'schlacht' then 'Krieg frisst Korn und Söhne. Hoffentlich bleibt er, wo er ist.'
                 when 'gebiet' then 'Grenzen verschieben sich, aber die Felder bleiben, wo sie sind. Fragt sich nur, wem man jetzt zahlt.'
                 when 'amt' then 'Ein neuer Dorfmeister … mal sehen, ob er was taugt. Die meisten fangen gut an.'
                 when 'kapitel' then 'Wer beim König ein und aus geht, hat bald Freunde – und Feinde.'
                 when 'kanon' then 'So etwas vergisst man nicht so schnell. Das wird man sich noch lange erzählen.'
                 else 'Wer weiß, was daraus wird.' end folge
    from welt_taten t
    where t.at > now() - interval '30 days' and welt_tat_ankunft(t.ort, t.at, t.gross, p_ort) <= now()
    order by t.at desc limit greatest(1, p_n)) y;
$$;

-- Kurzfassung für die KI: Kanon, heutige Herrscher, jüngste große Ereignisse
create or replace function public.welt_lore_kurz() returns text language sql stable security definer set search_path = public as $$
  select (select text from welt_lore where id = 'kurz')
    || ' HEUTE herrschen: ' || (select string_agg(r.name || ': ' || r.herrscher, '; ' order by r.id) from welt_reiche r where r.id <> 'frei') || '.'
    || coalesce(' Kanon-Ereignisse (gelten für die ganze Welt, nie widersprechen): ' || (select string_agg(z.titel, ' | ' order by z.seit) from welt_zustand z) || '.', '')
    || coalesce(' Jüngste Nachrichten: ' || (select string_agg(t.text, ' | ') from (select text from welt_taten where gross >= 2 order by at desc limit 5) t) || '.', '');
$$;

create or replace function public.welt_bez(p_a text, p_b text, p_art text, p_grund text) returns void language plpgsql security definer set search_path = public as $$
declare bid bigint;
begin
  select id into bid from welt_beziehungen where (a = p_a and b = p_b) or (a = p_b and b = p_a) order by id limit 1;
  if bid is null then insert into welt_beziehungen (a, b, art, grund, staerke, seit) values (p_a, p_b, p_art, p_grund, 2, now());
  else update welt_beziehungen set art = p_art, grund = p_grund, seit = now() where id = bid; end if;
end $$;

create or replace function public.welt_herrscher_wechsel(p_reich text, p_neu text, p_grund text, p_player uuid) returns void language plpgsql security definer set search_path = public as $$
declare alt text;
begin
  select herrscher into alt from welt_reiche where id = p_reich;
  if alt is null or alt = p_neu then return; end if;
  update welt_reiche set herrscher = p_neu where id = p_reich;
  insert into welt_herrscher_hist (reich, alt, neu, grund, player_id) values (p_reich, alt, p_neu, p_grund, p_player);
end $$;

create or replace function public.welt_ort_wechsel(p_ort text, p_reich text) returns void language sql security definer set search_path = public as $$
  update welt_orte set reich = p_reich where id = p_ort and exists (select 1 from welt_reiche where id = p_reich);
$$;

-- Platzhalter in Weltereignis-Texten
create or replace function public.q_welt_fill(p_run bigint, p_t text) returns text language sql stable security definer set search_path = public as $$
  select replace(replace(coalesce(p_t, ''), '{held}', coalesce(p.character_name, 'Jemand')), '{dorf}', coalesce(v.name, 'einem Dorf im Hügelland'))
  from quest_runs r join profiles p on p.id = r.player_id left join villages v on v.owner_id = r.player_id where r.id = p_run;
$$;
-- Folge 'welt_tat': Nachricht ohne Weltveränderung (z. B. Hauptquest-Kapitel)
create or replace function public.q_welt_tat(p_run bigint, f jsonb) returns text language plpgsql security definer set search_path = public as $$
declare r quest_runs;
begin
  select * into r from quest_runs where id = p_run;
  perform welt_tat_neu(coalesce(f->>'art', 'kapitel'), coalesce(f->>'ort', heim_ort(r.player_id)), q_welt_fill(p_run, f->>'titel'), q_welt_fill(p_run, f->>'text'), q_welt_fill(p_run, f->>'geruecht'), coalesce((f->>'gross')::int, 1), r.player_id, '{}');
  return '';
end $$;
-- Folge 'welt_kanon': einmalige Weltveränderung (wer zuerst abschließt, schreibt Geschichte)
create or replace function public.q_welt_kanon(p_run bigint, f jsonb) returns text language plpgsql security definer set search_path = public as $$
declare r quest_runs; k text := f->>'key'; z welt_zustand; tid bigint; b jsonb; t jsonb := f->'tat';
begin
  select * into r from quest_runs where id = p_run;
  select * into z from welt_zustand where key = k;
  if z.key is not null then
    return ' Doch als du zurückkommst, erzählt man sich längst etwas anderes: ' || coalesce(z.titel, 'Die Geschichte ist schon geschrieben') || '. Was du erlebt hast, bleibt deine Geschichte.';
  end if;
  tid := welt_tat_neu(coalesce(t->>'art', 'kanon'), t->>'ort', q_welt_fill(p_run, t->>'titel'), q_welt_fill(p_run, t->>'text'), q_welt_fill(p_run, t->>'geruecht'), coalesce((t->>'gross')::int, 3), r.player_id, f - 'tat');
  insert into welt_zustand (key, titel, wert, player_id, tat_id) values (k, q_welt_fill(p_run, coalesce(f->>'kanon_titel', t->>'titel')), coalesce(f->'fakten', '{}'), r.player_id, tid);
  if f ? 'herrscher' then perform welt_herrscher_wechsel(f->'herrscher'->>'reich', f->'herrscher'->>'name', q_welt_fill(p_run, t->>'titel'), r.player_id); end if;
  if f ? 'ort_wechsel' then perform welt_ort_wechsel(f->'ort_wechsel'->>'ort', f->'ort_wechsel'->>'reich'); end if;
  if f ? 'bez' then for b in select * from jsonb_array_elements(f->'bez') loop perform welt_bez(b->>'a', b->>'b', b->>'art', b->>'grund'); end loop; end if;
  return ' Das wird das ganze Land erfahren.';
end $$;
create or replace function public.q_welt_ok(v jsonb) returns boolean language sql stable security definer set search_path = public as $$
  select (not coalesce(v, '{}') ? 'welt_nicht' or not exists (select 1 from welt_zustand where key = v->>'welt_nicht'))
     and (not coalesce(v, '{}') ? 'welt' or exists (select 1 from welt_zustand where key = v->>'welt'));
$$;

-- Neuigkeiten, die beim Spieler angekommen sind (für das Popup)
create or replace function public.welt_nachrichten_neu(p_uid uuid) returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', t.id, 'art', t.art, 'titel', t.titel, 'text', case when ort_abstand(t.ort, h.ort) > 500 and t.geruecht is not null then t.geruecht else t.text end, 'von', ort_name(t.ort), 'ich', t.player_id = p_uid) order by t.at desc), '[]'::json)
  from (select coalesce(spieler_ort_jetzt(p_uid), heim_ort(p_uid)) ort, (select nachrichten_gesehen from profiles where id = p_uid) ab) h
  join lateral (select * from welt_taten t where t.at > now() - interval '14 days' and welt_tat_ankunft(t.ort, t.at, t.gross, h.ort) between h.ab and now() order by t.at desc limit 4) t on true;
$$;
create or replace function public.nachrichten_gesehen() returns void language sql security definer set search_path = public as $$
  update profiles set nachrichten_gesehen = now() where id = auth.uid();
$$;

-- Weltgeschichte am Brett
create or replace function public.welt_quests() returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', t.id, 'titel', t.titel, 'kurz', t.kurz, 'fundort', t.fundort, 'fundort_name', ort_name(t.fundort), 'dauer', quest_dauer(t.id),
      'geschehen', (select json_build_object('titel', z.titel, 'wer', p.character_name, 'seit', z.seit, 'ich', z.player_id = auth.uid()) from welt_zustand z left join profiles p on p.id = z.player_id where z.key = t.def->>'kanon'),
      'laeuft', exists (select 1 from quest_runs q where q.player_id = auth.uid() and q.quest_id = t.id and q.status = 'laeuft'),
      'hier', t.fundort is null or spieler_ort_jetzt(auth.uid()) = t.fundort) order by t.titel), '[]'::json)
  from quest_templates t where t.art = 'welt' and q_welt_ok(t.voraussetzung);
$$;
create or replace function public.welt_chronik_spieler() returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('titel', z.titel, 'wer', p.character_name, 'seit', z.seit) order by z.seit desc), '[]'::json) from welt_zustand z left join profiles p on p.id = z.player_id;
$$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.q_apply(bigint,jsonb)'::regprocedure);
  if position($n0$  if f ? 'welt_tat' then out := out || coalesce(q_welt_tat(r.id, f->'welt_tat'), ''); end if;
  if f ? 'welt_kanon' then out := out || coalesce(q_welt_kanon(r.id, f->'welt_kanon'), ''); end if;
  if trim(out) <> '' then update quest_runs set flags = jsonb_set(flags, '{ertrag}'$n0$ in d) = 0 then
    if position($o0$  if trim(out) <> '' then update quest_runs set flags = jsonb_set(flags, '{ertrag}'$o0$ in d) = 0 then raise exception 'Patch q_apply(bigint,jsonb): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$  if trim(out) <> '' then update quest_runs set flags = jsonb_set(flags, '{ertrag}'$o0$, $n0$  if f ? 'welt_tat' then out := out || coalesce(q_welt_tat(r.id, f->'welt_tat'), ''); end if;
  if f ? 'welt_kanon' then out := out || coalesce(q_welt_kanon(r.id, f->'welt_kanon'), ''); end if;
  if trim(out) <> '' then update quest_runs set flags = jsonb_set(flags, '{ertrag}'$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.quest_start(text,bigint[])'::regprocedure);
  if position($n0$select * into t from quest_templates where id = p_quest and art in ('haupt', 'welt') and (owner_id is null or owner_id = auth.uid()); if not found then raise exception 'Unbekannte Quest'; end if;
  if not q_welt_ok(t.voraussetzung) then raise exception 'Die Zeiten haben sich geändert – diese Geschichte gibt es so nicht mehr.'; end if;
  if t.art = 'welt' and exists (select 1 from welt_zustand where key = t.def->>'kanon') then raise exception 'Das ist bereits geschehen.'; end if;$n0$ in d) = 0 then
    if position($o0$select * into t from quest_templates where id = p_quest and art = 'haupt' and (owner_id is null or owner_id = auth.uid()); if not found then raise exception 'Unbekannte Quest'; end if;$o0$ in d) = 0 then raise exception 'Patch quest_start(text,bigint[]): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$select * into t from quest_templates where id = p_quest and art = 'haupt' and (owner_id is null or owner_id = auth.uid()); if not found then raise exception 'Unbekannte Quest'; end if;$o0$, $n0$select * into t from quest_templates where id = p_quest and art in ('haupt', 'welt') and (owner_id is null or owner_id = auth.uid()); if not found then raise exception 'Unbekannte Quest'; end if;
  if not q_welt_ok(t.voraussetzung) then raise exception 'Die Zeiten haben sich geändert – diese Geschichte gibt es so nicht mehr.'; end if;
  if t.art = 'welt' and exists (select 1 from welt_zustand where key = t.def->>'kanon') then raise exception 'Das ist bereits geschehen.'; end if;$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.quest_list()'::regprocedure);
  if position($n0$from quest_templates t where t.art = 'haupt' and t.fundort is null and (t.owner_id is null or t.owner_id = auth.uid()) and q_welt_ok(t.voraussetzung)),
    'welt', welt_quests(),$n0$ in d) = 0 then
    if position($o0$from quest_templates t where t.art = 'haupt' and t.fundort is null and (t.owner_id is null or t.owner_id = auth.uid())),$o0$ in d) = 0 then raise exception 'Patch quest_list(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$from quest_templates t where t.art = 'haupt' and t.fundort is null and (t.owner_id is null or t.owner_id = auth.uid())),$o0$, $n0$from quest_templates t where t.art = 'haupt' and t.fundort is null and (t.owner_id is null or t.owner_id = auth.uid()) and q_welt_ok(t.voraussetzung)),
    'welt', welt_quests(),$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.ort_besuch()'::regprocedure);
  if position($n0$from quest_templates t where t.art = 'haupt' and q_welt_ok(t.voraussetzung) and (t.fundort = o.id or (t.fundort = 'spielerdorf' and owner is not null and owner <> uid))),
    'neuigkeiten', welt_neuigkeiten(o.id, 4));$n0$ in d) = 0 then
    if position($o0$from quest_templates t where t.fundort = o.id or (t.fundort = 'spielerdorf' and owner is not null and owner <> uid)));$o0$ in d) = 0 then raise exception 'Patch ort_besuch(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$from quest_templates t where t.fundort = o.id or (t.fundort = 'spielerdorf' and owner is not null and owner <> uid)));$o0$, $n0$from quest_templates t where t.art = 'haupt' and q_welt_ok(t.voraussetzung) and (t.fundort = o.id or (t.fundort = 'spielerdorf' and owner is not null and owner <> uid))),
    'neuigkeiten', welt_neuigkeiten(o.id, 4));$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.amt_status()'::regprocedure);
  if position($n0$'unterwegs', spieler_unterwegs(auth.uid()), 'nachrichten', welt_nachrichten_neu(auth.uid()),$n0$ in d) = 0 then
    if position($o0$'unterwegs', spieler_unterwegs(auth.uid()),$o0$ in d) = 0 then raise exception 'Patch amt_status(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$'unterwegs', spieler_unterwegs(auth.uid()),$o0$, $n0$'unterwegs', spieler_unterwegs(auth.uid()), 'nachrichten', welt_nachrichten_neu(auth.uid()),$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.get_npc_context(bigint)'::regprocedure);
  if position($n0$'wohnort', npc_wohnort(n.id), 'welt_und_lage_kanon', welt_lore_kurz(), 'was_man_sich_hier_erzaehlt', (select coalesce(json_agg((e->>'text') || ' (' || (e->>'quelle') || ')'), '[]'::json) from json_array_elements(welt_neuigkeiten(npc_ort_id(n.id), 5)) e),$n0$ in d) = 0 then
    if position($o0$'wohnort', npc_wohnort(n.id),$o0$ in d) = 0 then raise exception 'Patch get_npc_context(bigint): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$'wohnort', npc_wohnort(n.id),$o0$, $n0$'wohnort', npc_wohnort(n.id), 'welt_und_lage_kanon', welt_lore_kurz(), 'was_man_sich_hier_erzaehlt', (select coalesce(json_agg((e->>'text') || ' (' || (e->>'quelle') || ')'), '[]'::json) from json_array_elements(welt_neuigkeiten(npc_ort_id(n.id), 5)) e),$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.get_npc_brief(bigint)'::regprocedure);
  if position($n0$'wohnort', npc_wohnort(p_npc), 'neuigkeiten', welt_neuigkeiten(npc_ort_id(p_npc), 4),$n0$ in d) = 0 then
    if position($o0$'wohnort', npc_wohnort(p_npc),$o0$ in d) = 0 then raise exception 'Patch get_npc_brief(bigint): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$'wohnort', npc_wohnort(p_npc),$o0$, $n0$'wohnort', npc_wohnort(p_npc), 'neuigkeiten', welt_neuigkeiten(npc_ort_id(p_npc), 4),$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.quest_custom_context(text,bigint)'::regprocedure);
  if position($n0$'dorf', v.name || ' im Hügelland. WELT-KANON (unbedingt beachten, nie widersprechen, die Geschichte bleibt persönlich und verändert keine Herrscher oder Grenzen): ' || welt_lore_kurz(),$n0$ in d) = 0 then
    if position($o0$'dorf', v.name,$o0$ in d) = 0 then raise exception 'Patch quest_custom_context(text,bigint): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$'dorf', v.name,$o0$, $n0$'dorf', v.name || ' im Hügelland. WELT-KANON (unbedingt beachten, nie widersprechen, die Geschichte bleibt persönlich und verändert keine Herrscher oder Grenzen): ' || welt_lore_kurz(),$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.quest_nachschub_context(text)'::regprocedure);
  if position($n0$'dorf', v.name || ' im Hügelland. WELT-KANON (unbedingt beachten, nie widersprechen, die Geschichte bleibt persönlich und verändert keine Herrscher oder Grenzen): ' || welt_lore_kurz(),$n0$ in d) = 0 then
    if position($o0$'dorf', v.name,$o0$ in d) = 0 then raise exception 'Patch quest_nachschub_context(text): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$'dorf', v.name,$o0$, $n0$'dorf', v.name || ' im Hügelland. WELT-KANON (unbedingt beachten, nie widersprechen, die Geschichte bleibt persönlich und verändert keine Herrscher oder Grenzen): ' || welt_lore_kurz(),$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.amt_antwort(boolean)'::regprocedure);
  if position($n0$    perform ansehen_add(auth.uid(), 10, 'Zum Dorfmeister gewählt');
    perform welt_tat_neu('amt', heim_ort(auth.uid()), 'Neuer Dorfmeister in ' || v.name, nm || ' hat in ' || v.name || ' den Amtseid geleistet und führt jetzt das Dorf.', 'In ' || v.name || ' soll ein Fremder das Sagen übernommen haben, heißt es.', 1, auth.uid(), '{}');$n0$ in d) = 0 then
    if position($o0$    perform ansehen_add(auth.uid(), 10, 'Zum Dorfmeister gewählt');$o0$ in d) = 0 then raise exception 'Patch amt_antwort(boolean): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$    perform ansehen_add(auth.uid(), 10, 'Zum Dorfmeister gewählt');$o0$, $n0$    perform ansehen_add(auth.uid(), 10, 'Zum Dorfmeister gewählt');
    perform welt_tat_neu('amt', heim_ort(auth.uid()), 'Neuer Dorfmeister in ' || v.name, nm || ' hat in ' || v.name || ' den Amtseid geleistet und führt jetzt das Dorf.', 'In ' || v.name || ' soll ein Fremder das Sagen übernommen haben, heißt es.', 1, auth.uid(), '{}');$n0$);
  end if;
  execute d;
end $p$;


update quest_templates set def = jsonb_set(def, '{szenen,thron,optionen,0,folgen,welt_tat}', '{"art":"kapitel","ort":"moosherz","gross":2,"titel":"{dorf} schwört dem König Treue","text":"{held}, Dorfmeister von {dorf}, hat König Ottokar im Thronsaal von Moosherz die Treue geschworen.","geruecht":"Das Hügelland soll vor dem König gekniet haben, erzählt man."}'::jsonb)
 where id = 'chronik_4' and def #> '{szenen,thron,optionen,0,folgen}' is not null;
update quest_templates set def = jsonb_set(def, '{szenen,thron,optionen,3,folgen,welt_tat}', '{"art":"kapitel","ort":"moosherz","gross":2,"titel":"{dorf} verweigert den Kniefall","text":"{held} aus {dorf} hat vor König Ottokar erklärt, das Dorf diene sich selbst. Am Hof spricht man von Hochmut – oder von Mut.","geruecht":"Ein Bauer aus dem Hügelland soll dem König ins Gesicht gelacht haben."}'::jsonb)
 where id = 'chronik_4' and def #> '{szenen,thron,optionen,3,folgen}' is not null;
update quest_templates set def = jsonb_set(def, '{szenen,rechte_hand,optionen,0,folgen,welt_tat}', '{"art":"kapitel","ort":"moosherz","gross":2,"titel":"{held} trägt den Ring des Königs","text":"König Ottokar hat {held} aus {dorf} zu seinen Augen und Ohren im Hügelland gemacht, nachdem ein Rabenbrief aus Rabenfels vor dem Thron lag.","geruecht":"Der König hat einen Hügelländer mit einem Ring belohnt – wegen eines Briefes, sagt man, und in Rabenfels ist man nicht erfreut."}'::jsonb)
 where id = 'chronik_4' and def #> '{szenen,rechte_hand,optionen,0,folgen}' is not null;
update quest_templates set voraussetzung = coalesce(voraussetzung, '{}') || '{"welt_nicht":"rabenfels_nacht"}' where id = 'o_rabenfels';

revoke execute on function public.npc_ort_id(bigint), public.ort_abstand(text, text), public.welt_tat_ankunft(text, timestamptz, int, text), public.welt_tat_neu(text, text, text, text, text, int, uuid, jsonb),
  public.welt_neuigkeiten(text, int), public.welt_lore_kurz(), public.welt_bez(text, text, text, text), public.welt_herrscher_wechsel(text, text, text, uuid), public.welt_ort_wechsel(text, text),
  public.q_welt_fill(bigint, text), public.q_welt_tat(bigint, jsonb), public.q_welt_kanon(bigint, jsonb), public.q_welt_ok(jsonb), public.welt_nachrichten_neu(uuid) from public, anon, authenticated;
revoke execute on function public.nachrichten_gesehen(), public.welt_quests(), public.welt_chronik_spieler() from public, anon;
grant execute on function public.nachrichten_gesehen(), public.welt_quests(), public.welt_chronik_spieler() to authenticated;
