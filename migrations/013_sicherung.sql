-- Migration 013: Datenbank wachhalten (ping für den GitHub-Aufruf) und tägliche Schnappschüsse aller Spieldaten (7 Tage Ringpuffer + manueller Platz 0).
create extension if not exists pg_cron;

create or replace function public.ping() returns text language sql stable as $$ select 'ok'::text $$;
revoke execute on function public.ping() from public; grant execute on function public.ping() to anon, authenticated;

create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.snapshots (
  slot int primary key,            -- 1..7 = Wochentag, 0 = manuell vor riskanten Änderungen
  taken_at timestamptz not null,
  tabellen jsonb not null,
  zeilen int not null,
  bytes int not null
);
revoke all on backup.snapshots from public, anon, authenticated;

create or replace function backup.take_snapshot(p_slot int default null) returns json language plpgsql security definer set search_path = public, backup as $$
declare t record; j jsonb; alles jsonb := '{}'::jsonb; n int; total int := 0; s int := coalesce(p_slot, extract(isodow from now() at time zone 'Europe/Berlin')::int);
begin
  for t in select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1 loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb), count(*) from public.%I x', t.table_name) into j, n;
    alles := alles || jsonb_build_object(t.table_name, j); total := total + n;
  end loop;
  insert into backup.snapshots (slot, taken_at, tabellen, zeilen, bytes) values (s, now(), alles, total, octet_length(alles::text))
  on conflict (slot) do update set taken_at = excluded.taken_at, tabellen = excluded.tabellen, zeilen = excluded.zeilen, bytes = excluded.bytes;
  return json_build_object('slot', s, 'tabellen', (select count(*) from jsonb_object_keys(alles)), 'zeilen', total, 'bytes', octet_length(alles::text));
end;
$$;
revoke execute on function backup.take_snapshot(int) from public, anon, authenticated;

select cron.schedule('mossheart-sicherung', '30 2 * * *', $c$select backup.take_snapshot()$c$);

-- Sicherheitscheck 22.11.: feste search_path, alte Funktionsvarianten nicht mehr aufrufbar
alter function public.ping() set search_path = public;
alter function public.layout_plot set search_path = public;
alter function public.berlin_day() set search_path = public;
alter function public.village_wood(villages) set search_path = public;
alter function public.berlin_midnight() set search_path = public;
alter function public.q_fill(text, jsonb) set search_path = public;
alter function public.q_odds(int) set search_path = public;
revoke execute on function public.ai_take_quota() from authenticated, public;
revoke execute on function public.talk_to_npc(bigint, text, text) from authenticated, public;
