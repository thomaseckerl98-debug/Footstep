-- Migration 002: Weltkarte
-- Liefert alle Dörfer mit öffentlichen Angaben (Position, Dorfname, Charaktername).
-- Rohstoffe und andere private Werte bleiben unsichtbar.
create or replace function public.get_world_map()
returns table (x int, y int, village_name text, character_name text, is_me boolean)
language sql
security definer
stable
set search_path = public
as $$
  select v.x, v.y, v.name, p.character_name, (v.owner_id = auth.uid())
  from villages v
  join profiles p on p.id = v.owner_id
  order by p.character_name;
$$;

revoke execute on function public.get_world_map() from public, anon;
grant  execute on function public.get_world_map() to authenticated;
