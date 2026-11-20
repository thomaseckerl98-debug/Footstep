-- Footstep – Schritt 1: Login + Startdorf
-- Ausführen: Supabase-Dashboard > SQL Editor > New query > alles einfügen > Run

-- ───────────── Tabellen ─────────────
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  character_name text not null,
  created_at     timestamptz not null default now(),
  constraint character_name_len check (char_length(character_name) between 3 and 24)
);
create unique index profiles_character_name_key on public.profiles (lower(character_name));

create table public.villages (
  id               bigint generated always as identity primary key,
  owner_id         uuid not null unique references public.profiles(id) on delete cascade,
  name             text not null,
  x                int  not null check (x between 0 and 99),
  y                int  not null check (y between 0 and 99),
  -- Zeitprinzip: gespeichert wird nur der Stand + Zeitpunkt. Der aktuelle Wert
  -- wird beim Abruf aus (jetzt - stock_updated_at) berechnet. Kein Server-Prozess nötig.
  wood_stock       numeric not null default 100,
  wood_per_hour    numeric not null default 30,
  stock_updated_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (x, y)
);

-- ───────────── Zugriffsregeln (Row Level Security) ─────────────
alter table public.profiles enable row level security;
alter table public.villages enable row level security;

-- Namen dürfen alle Eingeloggten sehen (später für Weltkarte/Diplomatie).
create policy "profiles lesbar" on public.profiles
  for select to authenticated using (true);

-- Dörfer: vorerst nur das eigene sichtbar. Die Weltkarte kommt später über eine eigene Ansicht.
create policy "eigenes dorf lesbar" on public.villages
  for select to authenticated using (owner_id = auth.uid());

-- Bewusst KEINE insert/update/delete-Policies:
-- Clients können nichts direkt ändern, nur über Funktionen, die wir selbst schreiben.
-- Zusätzlich (Doppelsicherung) entziehen wir die Schreibrechte ganz:
revoke all on public.profiles, public.villages from anon;
revoke insert, update, delete, truncate on public.profiles, public.villages from authenticated;

-- ───────────── Neuer Spieler → Profil + Startdorf ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cname text := trim(coalesce(new.raw_user_meta_data->>'character_name', ''));
  vx int;
  vy int;
  tries int := 0;
begin
  if char_length(cname) < 3 then
    raise exception 'Charaktername muss mindestens 3 Zeichen haben';
  end if;

  insert into profiles (id, character_name) values (new.id, cname);

  loop
    vx := floor(random() * 100)::int;
    vy := floor(random() * 100)::int;
    begin
      insert into villages (owner_id, name, x, y)
      values (new.id, 'Dorf von ' || cname, vx, vy);
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 50 then
        raise exception 'Kein freier Platz auf der Karte';
      end if;
    end;
  end loop;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Funktionen für den Client ─────────────
-- Eigenes Dorf inkl. live berechnetem Holzstand und SERVER-Zeit.
create or replace function public.get_my_village()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
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

-- Ist der Charaktername noch frei? (wird vor der Registrierung abgefragt)
create or replace function public.character_name_available(p_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from profiles where lower(character_name) = lower(trim(p_name))
  );
$$;

revoke execute on function public.get_my_village() from public, anon;
grant  execute on function public.get_my_village() to authenticated;
grant  execute on function public.character_name_available(text) to anon, authenticated;
