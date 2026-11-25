-- 040: Wahl mit verdeckter Checkliste, Kämpfe auf der Karte, alle Orte bereisbar, Dorf-Log (erzeugt von tools/m040.py)

alter table public.dorf_amt add column if not exists naechste_wahl timestamptz;
alter table public.welt_ereignisse add column if not exists helfer jsonb not null default '{}';
update public.dorf_amt d set naechste_wahl = greatest(coalesce(p.bewohner_seit, now()) + interval '7 days', now() + interval '1 day')
  from public.villages v join public.profiles p on p.id = v.owner_id where v.id = d.village_id and d.naechste_wahl is null;

-- Verdeckte Checkliste für die Wahl (der Spieler sieht sie nicht; nur die Stimmen spiegeln sie)
create or replace function public.amt_bedingungen(p_uid uuid, p_v bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare cnt int := 0; volk numeric; nl int; nt int; nk int; seit timestamptz; kap int; n record;
begin
  for n in select coalesce(r.sympathy, 0) sym from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = p_uid where x.village_id = p_v and not x.namenlos and x.tot_at is null loop
    if n.sym >= 60 then cnt := cnt + 1; end if;
  end loop;
  select count(*), avg(coalesce(r.sympathy, 10)) into nl, volk from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = p_uid where x.village_id = p_v and x.namenlos and x.tot_at is null;
  if nl > 0 and volk >= 50 then cnt := cnt + 1; end if;
  select count(distinct titel) into nt from dorf_taten where player_id = p_uid and village_id = p_v and art = 'tat';
  select count(distinct titel) into nk from dorf_taten where player_id = p_uid and village_id = p_v and art = 'krise';
  select bewohner_seit into seit from profiles where id = p_uid;
  select coalesce(kapitel, 1) into kap from dorf_amt where village_id = p_v;
  return json_build_object('liste', json_build_array(
      json_build_object('id', 'zeit', 'ok', now() >= coalesce(seit, now()) + interval '7 days'),
      json_build_object('id', 'fuersprecher', 'ok', cnt >= 3),
      json_build_object('id', 'tat', 'ok', nt >= 1),
      json_build_object('id', 'krise', 'ok', nk >= 1),
      json_build_object('id', 'volk', 'ok', nl = 0 or volk >= 50),
      json_build_object('id', 'chronik', 'ok', kap >= 3)));
end $$;
create or replace function public.amt_bed_zahl(p_uid uuid, p_v bigint) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from json_array_elements(amt_bedingungen(p_uid, p_v)->'liste') e where (e->>'ok')::boolean;
$$;

-- Kandidat ist nur, wer ALLE Bedingungen erfüllt (dann kommt die Lagerfeuer-Szene und Kapitel 3)
create or replace function public.amt_weg(p_uid uuid, p_v bigint) returns json language plpgsql stable security definer set search_path = public as $$
declare k int; ab timestamptz;
begin
  k := amt_bed_zahl(p_uid, p_v);
  select coalesce(bewohner_seit, now()) + interval '7 days' into ab from profiles where id = p_uid;
  return json_build_object('erfuellt', k, 'gesamt', 6, 'ab', ab, 'zeit_ok', now() >= ab, 'kandidat', k >= 6,
    'taten', (select coalesce(jsonb_agg(distinct titel), '[]') from dorf_taten where player_id = p_uid and village_id = p_v and art = 'tat'),
    'krisen', (select coalesce(jsonb_agg(distinct titel), '[]') from dorf_taten where player_id = p_uid and village_id = p_v and art = 'krise'),
    'volk', json_build_object('ja', (select coalesce(avg(coalesce(r.sympathy, 10)), 0) >= 50 from npcs x left join npc_relations r on r.npc_id = x.id and r.player_id = p_uid where x.village_id = p_v and x.namenlos and x.tot_at is null)),
    'naechste_wahl', (select naechste_wahl from dorf_amt where village_id = p_v));
end $$;

-- Automatische Wahl am Wahltag, wenn der Spieler (noch) nicht alle Bedingungen erfüllt: die Mehrheit geht an den Vorsteher
create or replace function public.amt_auto_wahl(p_v bigint, p_uid uuid) returns void language plpgsql security definer set search_path = public as $$
declare a dorf_amt; gid bigint; gname text; k int; ja int := 0; nein int := 0; st jsonb := '[]'; n record; p numeric; tot int; flip int; e jsonb; neu jsonb := '[]';
begin
  a := amt_init(p_v); gid := a.vorsteher_npc; select name into gname from npcs where id = gid;
  k := amt_bed_zahl(p_uid, p_v);
  for n in select x.id, x.name, x.namenlos, coalesce(r.sympathy, case when x.namenlos then 10 else 0 end) sym from npcs x
      left join npc_relations r on r.npc_id = x.id and r.player_id = p_uid where x.village_id = p_v and x.tot_at is null loop
    if n.id = gid then nein := nein + 1; st := st || jsonb_build_object('name', n.name, 'fuer', 'gegner'); continue; end if;
    p := greatest(0.02, least(0.7, 0.03 + 0.07 * k + n.sym / 500.0));
    if random() < p then ja := ja + 1; st := st || jsonb_build_object('name', case when n.namenlos then npc_label(n.id) else n.name end, 'fuer', 'du');
    else nein := nein + 1; st := st || jsonb_build_object('name', case when n.namenlos then npc_label(n.id) else n.name end, 'fuer', 'gegner'); end if;
  end loop;
  tot := ja + nein;
  if ja >= nein then  -- ohne alle Bedingungen bleibt die Mehrheit beim Vorsteher
    flip := greatest(1, ja - ((tot - 1) / 2));
    for e in select * from jsonb_array_elements(st) loop
      if flip > 0 and e->>'fuer' = 'du' then neu := neu || jsonb_set(e, '{fuer}', '"gegner"'); flip := flip - 1; ja := ja - 1; nein := nein + 1; else neu := neu || e; end if;
    end loop;
    st := neu;
  end if;
  insert into dorf_wahlen (village_id, player_id, gegner_npc, gegner_name, status, ja, nein, stimmen) values (p_v, p_uid, gid, gname, 'verloren', ja, nein, st);
  update dorf_amt set naechste_wahl = now() + interval '7 days' where village_id = p_v;
  perform eco_log(p_v, 'amt', 'Wahl des Dorfmeisters: ' || coalesce(gname, 'Der Vorsteher') || ' bleibt Vorsteher (' || nein || ' zu ' || ja || ' Stimmen).', gid, now());
end $$;

-- Wahltage prüfen (stündlich und beim Laden)
create or replace function public.amt_wahlen_pruefen() returns void language plpgsql security definer set search_path = public as $$
declare d record;
begin
  for d in select a.village_id, v.owner_id, a.lagerfeuer_at from dorf_amt a join villages v on v.id = a.village_id
      where v.owner_id is not null and a.naechste_wahl is not null and a.naechste_wahl <= now() and coalesce(a.meister_typ, 'npc') <> 'spieler' loop
    -- Wer alle Bedingungen erfüllt und am Lagerfeuer angenommen hat, wählt über Kapitel 3 (die Versammlung)
    if d.lagerfeuer_at is not null and amt_bed_zahl(d.owner_id, d.village_id) >= 6 then continue; end if;
    perform amt_auto_wahl(d.village_id, d.owner_id);
  end loop;
end $$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.amt_wahl(quest_runs)'::regprocedure);
  if position($n0$    update dorf_amt set wahl_ab = now() + interval '4 days', naechste_wahl = now() + interval '7 days' where village_id = v;$n0$ in d) = 0 then
    if position($o0$    update dorf_amt set wahl_ab = now() + interval '4 days' where village_id = v;$o0$ in d) = 0 then raise exception 'Patch amt_wahl(quest_runs): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$    update dorf_amt set wahl_ab = now() + interval '4 days' where village_id = v;$o0$, $n0$    update dorf_amt set wahl_ab = now() + interval '4 days', naechste_wahl = now() + interval '7 days' where village_id = v;$n0$);
  end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.amt_tick_all()'::regprocedure);
  if position($j$perform amt_wahlen_pruefen();$j$ in d) = 0 then d := regexp_replace(d, '\mbegin\M', 'begin ' || $j$perform amt_wahlen_pruefen();$j$); end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.amt_status()'::regprocedure);
  if position($n0$'unterwegs', spieler_unterwegs(auth.uid()), 'naechste_wahl', (select d.naechste_wahl from dorf_amt d join villages vv on vv.id = d.village_id where vv.owner_id = auth.uid()),$n0$ in d) = 0 then
    if position($o0$'unterwegs', spieler_unterwegs(auth.uid()),$o0$ in d) = 0 then raise exception 'Patch amt_status(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$'unterwegs', spieler_unterwegs(auth.uid()),$o0$, $n0$'unterwegs', spieler_unterwegs(auth.uid()), 'naechste_wahl', (select d.naechste_wahl from dorf_amt d join villages vv on vv.id = d.village_id where vv.owner_id = auth.uid()),$n0$);
  end if;
  if position($j$perform amt_wahlen_pruefen();$j$ in d) = 0 then d := regexp_replace(d, '\mbegin\M', 'begin ' || $j$perform amt_wahlen_pruefen();$j$); end if;
  execute d;
end $p$;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.trg_quest_taten()'::regprocedure);
  if position($n0$    if ((t.art = 'brett' and coalesce(t.schwierigkeit, 1) >= 3) or t.art in ('haupt', 'welt')) and not exists (select 1 from dorf_taten x where x.player_id = new.player_id and x.art = 'tat' and x.titel = t.titel) then
      insert into dorf_taten (player_id, village_id, art, titel) values (new.player_id, vid, 'tat', t.titel);$n0$ in d) = 0 then
    if position($o0$    if (t.art = 'brett' and coalesce(t.schwierigkeit, 1) >= 3) or t.art = 'haupt' then
      insert into dorf_taten (player_id, village_id, art, titel) values (new.player_id, vid, 'tat', t.titel);$o0$ in d) = 0 then raise exception 'Patch trg_quest_taten(): Ziel 0 fehlt'; end if;
    d := replace(d, $o0$    if (t.art = 'brett' and coalesce(t.schwierigkeit, 1) >= 3) or t.art = 'haupt' then
      insert into dorf_taten (player_id, village_id, art, titel) values (new.player_id, vid, 'tat', t.titel);$o0$, $n0$    if ((t.art = 'brett' and coalesce(t.schwierigkeit, 1) >= 3) or t.art in ('haupt', 'welt')) and not exists (select 1 from dorf_taten x where x.player_id = new.player_id and x.art = 'tat' and x.titel = t.titel) then
      insert into dorf_taten (player_id, village_id, art, titel) values (new.player_id, vid, 'tat', t.titel);$n0$);
  end if;
  execute d;
end $p$;


-- Alle Orte sind bereisbar
create or replace function public.besuchbar(p_id text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from welt_orte o where o.id = p_id);
$$;

-- Kämpfe auf der Weltkarte (Überfälle): mitkämpfen, wenn man vor Ort ist
create or replace function public.welt_kampf_info(p_ort text) returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', e.id, 'text', e.text, 'art', e.art,
      'gegner', case when e.text ~* '(wölf|wolf|bär|keiler|wild)' then 'tiere' else 'banditen' end,
      'hier', spieler_ort_jetzt(auth.uid()) = p_ort, 'geholfen', e.helfer ? auth.uid()::text, 'ort_name', ort_name(p_ort)) order by e.von desc), '[]'::json)
  from welt_ereignisse e where e.ort = p_ort and e.art in ('ueberfall', 'fehde') and not e.erledigt and (e.bis is null or e.bis > now());
$$;
create or replace function public.welt_kampf_ende(p_ereignis bigint, p_erfolg boolean) returns json language plpgsql security definer set search_path = public as $$
declare e welt_ereignisse; uid uuid := auth.uid(); nm text; vid bigint; heim text;
begin
  select * into e from welt_ereignisse where id = p_ereignis for update;
  if e.id is null or e.erledigt or e.art not in ('ueberfall', 'fehde') then raise exception 'Dieser Kampf ist schon vorbei.'; end if;
  if spieler_ort_jetzt(uid) is distinct from e.ort then raise exception 'Du musst vor Ort sein, um mitzukämpfen.'; end if;
  if e.helfer ? uid::text then raise exception 'Du hast hier schon gekämpft.'; end if;
  perform pruefe_frei();
  update welt_ereignisse set helfer = helfer || jsonb_build_object(uid::text, p_erfolg) where id = e.id;
  select character_name into nm from profiles where id = uid; heim := heim_ort(uid);
  select id into vid from villages where owner_id = uid;
  if not p_erfolg then
    update profiles set zustand = 'verletzt', zustand_bis = now() + interval '4 hours' where id = uid;
    return json_build_object('ok', true, 'erfolg', false, 'text', 'Du musst dich zurückziehen, verletzt. Andere werden es versuchen.');
  end if;
  update welt_ereignisse set erledigt = true, bis = now() where id = e.id;
  perform ansehen_add(uid, 6, 'Gekämpft: ' || e.text);
  if e.ort = heim and vid is not null then insert into dorf_taten (player_id, village_id, art, titel) values (uid, vid, 'krise', e.text); end if;
  perform welt_tat_neu('kampf', e.ort, nm || ' kämpft bei ' || coalesce(ort_name(e.ort), 'einem Ort'), nm || ' hat bei ' || coalesce(ort_name(e.ort), 'einem Ort') || ' gekämpft: ' || e.text || ' Die Gefahr ist gebannt.', null, 1, uid, jsonb_build_object('ereignis', e.id));
  return json_build_object('ok', true, 'erfolg', true, 'text', 'Geschafft. Die Gefahr ist gebannt, und man wird davon erzählen.');
end $$;

-- Dorf-Log: die letzten Einträge, neue markiert (für das Popup „Seit deinem letzten Besuch“)
create or replace function public.dorf_log() returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('text', l.text, 'art', l.art, 'at', l.at, 'neu', l.at > coalesce(p.dorf_gesehen, now() - interval '1 day')) order by l.at desc), '[]'::json)
  from profiles p join villages v on v.owner_id = p.id
  join lateral (select * from village_log x where x.village_id = v.id order by x.at desc limit 25) l on true
  where p.id = auth.uid();
$$;

revoke execute on function public.amt_bedingungen(uuid, bigint), public.amt_bed_zahl(uuid, bigint), public.amt_auto_wahl(bigint, uuid), public.amt_wahlen_pruefen() from public, anon, authenticated;
revoke execute on function public.welt_kampf_info(text), public.welt_kampf_ende(bigint, boolean), public.dorf_log() from public, anon;
grant execute on function public.welt_kampf_info(text), public.welt_kampf_ende(bigint, boolean), public.dorf_log() to authenticated;
