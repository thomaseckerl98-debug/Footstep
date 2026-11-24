-- Migration 028: Rollen mit Startausrüstung, eigene Landschaft je Dorf
-- * villages.landschaft: jede Gegend (hochtal, seeufer, klamm, heide, urwald, fjord); neue Dörfer bekommen die am wenigsten genutzte
-- * profiles.startpaket_at: Startausrüstung der Rolle wird genau einmal vergeben (bei der ersten Rollenwahl)
-- * get_my_village liefert id + landschaft, get_my_character liefert startpaket

alter table public.villages add column if not exists landschaft text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'villages_landschaft_check') then
    alter table public.villages add constraint villages_landschaft_check check (landschaft is null or landschaft in ('hochtal','seeufer','klamm','heide','urwald','fjord'));
  end if;
end $$;

-- bestehende Dörfer: verschiedene Gegenden
update public.villages set landschaft = 'hochtal' where id = 2 and landschaft is null;
update public.villages set landschaft = 'seeufer' where id = 3 and landschaft is null;
update public.villages set landschaft = 'klamm'   where id = 4 and landschaft is null;

create or replace function public.village_landschaft_default() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.landschaft is null then
    select l into new.landschaft from unnest(array['hochtal','seeufer','klamm','heide','urwald','fjord']) with ordinality as t(l, n)
     order by (select count(*) from villages v where v.landschaft = t.l), n limit 1;
  end if;
  return new;
end $$;
drop trigger if exists trg_village_landschaft on public.villages;
create trigger trg_village_landschaft before insert on public.villages for each row execute function public.village_landschaft_default();

-- übrige Dörfer ohne Gegend (falls vorhanden) einzeln zuweisen
do $$ declare v record; begin
  for v in select id from public.villages where landschaft is null order by id loop
    update public.villages set landschaft = (select l from unnest(array['hochtal','seeufer','klamm','heide','urwald','fjord']) with ordinality as t(l, n)
      order by (select count(*) from villages x where x.landschaft = t.l), n limit 1) where id = v.id;
  end loop;
end $$;

create or replace function public.get_my_village()
returns json language sql security definer stable set search_path = public as $$
  select json_build_object(
    'id',             v.id,
    'landschaft',     v.landschaft,
    'village_name',   v.name,
    'character_name', p.character_name,
    'x',              v.x,
    'y',              v.y,
    'wood',           v.wood_stock + v.wood_per_hour * extract(epoch from (now() - v.stock_updated_at)) / 3600.0,
    'wood_per_hour',  v.wood_per_hour,
    'server_now',     now()
  )
  from villages v
  join profiles p on p.id = v.owner_id
  where v.owner_id = auth.uid();
$$;
revoke execute on function public.get_my_village() from public, anon;
grant execute on function public.get_my_village() to authenticated;

-- Startausrüstung je Rolle
alter table public.profiles add column if not exists startpaket_at timestamptz;
create or replace function public.rolle_startpaket(p_rolle text) returns text[] language sql immutable as $$
  select case p_rolle
    when 'waldlaeufer' then array['bogen','lederwams']
    when 'krieger'     then array['schwert','kettenhemd']
    when 'haendler'    then array['dolch','feine_kleidung']
    when 'gelehrter'   then array['alte_chronik','laterne']
    when 'heiler'      then array['kraeutertasche','seil']
    when 'schurke'     then array['dolch','dietrich','dunkler_umhang']
    else array[]::text[] end;
$$;

create or replace function public.get_my_character()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('name', p.character_name, 'race', p.race, 'herkunft', coalesce(p.herkunft, 'waldlaeufer'), 'look', p.look,
                           'attrs', char_attrs(p.race, coalesce(p.herkunft, 'waldlaeufer')),
                           'rolle_gewaehlt', p.herkunft is not null, 'startpaket', p.startpaket_at is not null)
  from profiles p where p.id = auth.uid();
$$;
revoke execute on function public.get_my_character() from public, anon;
grant execute on function public.get_my_character() to authenticated;

create or replace function public.save_character(p_look jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare k text; it text; rolle text; got timestamptz;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_look is null or jsonb_typeof(p_look) <> 'object' then raise exception 'Ungültige Auswahl'; end if;
  for k in select jsonb_object_keys(p_look) loop
    if k <> all (array['race', 'face', 'skin', 'hair', 'hairStyle', 'beard', 'eyes', 'cloak', 'herkunft']) then raise exception 'Unbekanntes Merkmal: %', k; end if;
  end loop;
  if coalesce(p_look->>'race', '') <> all (array['mensch', 'elf', 'zwerg', 'halbling']) then raise exception 'Ungültiges Volk'; end if;
  if coalesce(p_look->>'herkunft', 'waldlaeufer') <> all (array['waldlaeufer','krieger','haendler','gelehrter','heiler','schurke']) then raise exception 'Ungültige Rolle'; end if;
  if coalesce(p_look->>'face', '') <> all (array['kantig', 'rund', 'schmal']) then raise exception 'Ungültiges Gesicht'; end if;
  if coalesce(p_look->>'skin', '') !~ '^[0-7]$' then raise exception 'Ungültige Hautfarbe'; end if;
  if coalesce(p_look->>'hair', '') <> all (array['schwarz', 'dunkel', 'braun', 'kupfer', 'rot', 'blond', 'hellblond', 'asch', 'grau', 'weiss']) then raise exception 'Ungültige Haarfarbe'; end if;
  if coalesce(p_look->>'hairStyle', '') <> all (array['kurz', 'lang', 'zopf', 'dutt', 'locken', 'wild', 'glatze']) then raise exception 'Ungültige Frisur'; end if;
  if coalesce(p_look->>'beard', '') <> all (array['keiner', 'stoppel', 'kurz', 'lang', 'schnurr', 'zopfbart']) then raise exception 'Ungültiger Bart'; end if;
  if coalesce(p_look->>'eyes', '') <> all (array['braun', 'hasel', 'gruen', 'blau', 'grau', 'bernstein']) then raise exception 'Ungültige Augenfarbe'; end if;
  if coalesce(p_look->>'cloak', '') <> all (array['wald', 'nacht', 'wein', 'erde', 'stein', 'ocker']) then raise exception 'Ungültige Umhangfarbe'; end if;
  rolle := coalesce(p_look->>'herkunft', 'waldlaeufer');
  update profiles
     set race = p_look->>'race', herkunft = rolle,
         look = jsonb_build_object('race', p_look->>'race', 'herkunft', rolle, 'face', p_look->>'face', 'skin', (p_look->>'skin')::int,
                                   'hair', p_look->>'hair', 'hairStyle', p_look->>'hairStyle', 'beard', p_look->>'beard', 'eyes', p_look->>'eyes', 'cloak', p_look->>'cloak')
   where id = auth.uid()
   returning startpaket_at into got;
  -- Startausrüstung: nur beim ersten Mal (eine spätere Rollenänderung bringt keine neuen Gegenstände)
  if got is null then
    foreach it in array rolle_startpaket(rolle) loop
      insert into player_items (player_id, item_id, menge) values (auth.uid(), it, 1)
        on conflict (player_id, item_id) do update set menge = greatest(player_items.menge, 1);
    end loop;
    update profiles set startpaket_at = now() where id = auth.uid();
  end if;
  return get_my_character();
end;
$$;
revoke execute on function public.save_character(jsonb) from public, anon;
grant execute on function public.save_character(jsonb) to authenticated;
