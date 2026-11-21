-- Migration 005: Charaktererstellung (Volk + Aussehen am Profil). Werte werden serverseitig geprüft.
alter table public.profiles add column if not exists race text check (race in ('mensch', 'elf', 'zwerg', 'halbling'));
alter table public.profiles add column if not exists look jsonb;

create or replace function public.get_my_character()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object('name', p.character_name, 'race', p.race, 'look', p.look)
  from profiles p where p.id = auth.uid();
$$;
revoke execute on function public.get_my_character() from public, anon;
grant execute on function public.get_my_character() to authenticated;

create or replace function public.save_character(p_look jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_look is null or jsonb_typeof(p_look) <> 'object' then raise exception 'Ungültige Auswahl'; end if;
  for k in select jsonb_object_keys(p_look) loop
    if k <> all (array['race', 'face', 'skin', 'hair', 'hairStyle', 'beard', 'eyes', 'cloak']) then raise exception 'Unbekanntes Merkmal: %', k; end if;
  end loop;
  if coalesce(p_look->>'race', '') <> all (array['mensch', 'elf', 'zwerg', 'halbling']) then raise exception 'Ungültiges Volk'; end if;
  if coalesce(p_look->>'face', '') <> all (array['kantig', 'rund', 'schmal']) then raise exception 'Ungültiges Gesicht'; end if;
  if coalesce(p_look->>'skin', '') !~ '^[0-7]$' then raise exception 'Ungültige Hautfarbe'; end if;
  if coalesce(p_look->>'hair', '') <> all (array['schwarz', 'dunkel', 'braun', 'kupfer', 'rot', 'blond', 'hellblond', 'asch', 'grau', 'weiss']) then raise exception 'Ungültige Haarfarbe'; end if;
  if coalesce(p_look->>'hairStyle', '') <> all (array['kurz', 'lang', 'zopf', 'dutt', 'locken', 'wild', 'glatze']) then raise exception 'Ungültige Frisur'; end if;
  if coalesce(p_look->>'beard', '') <> all (array['keiner', 'stoppel', 'kurz', 'lang', 'schnurr', 'zopfbart']) then raise exception 'Ungültiger Bart'; end if;
  if coalesce(p_look->>'eyes', '') <> all (array['braun', 'hasel', 'gruen', 'blau', 'grau', 'bernstein']) then raise exception 'Ungültige Augenfarbe'; end if;
  if coalesce(p_look->>'cloak', '') <> all (array['wald', 'nacht', 'wein', 'erde', 'stein', 'ocker']) then raise exception 'Ungültige Umhangfarbe'; end if;
  update profiles
     set race = p_look->>'race',
         look = jsonb_build_object('race', p_look->>'race', 'face', p_look->>'face', 'skin', (p_look->>'skin')::int, 'hair', p_look->>'hair',
                                   'hairStyle', p_look->>'hairStyle', 'beard', p_look->>'beard', 'eyes', p_look->>'eyes', 'cloak', p_look->>'cloak')
   where id = auth.uid();
  return get_my_character();
end;
$$;
revoke execute on function public.save_character(jsonb) from public, anon;
grant execute on function public.save_character(jsonb) to authenticated;
