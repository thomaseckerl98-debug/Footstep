-- Migration 012: Inspiration wie bei Pen & Paper – 10 eigene Antworten pro Spieler und Tag (deutsche Mitternacht).
-- KI-Notizen nach Gesprächen zählen nicht als Inspiration, nur gegen ein großzügiges Tageslimit (Schutz des kostenlosen Gemini-Kontingents).
alter table public.ai_usage add column if not exists insp int not null default 0;

create or replace function public.berlin_day() returns date language sql stable as $$ select (now() at time zone 'Europe/Berlin')::date $$;
create or replace function public.berlin_midnight() returns timestamptz language sql stable as $$ select ((now() at time zone 'Europe/Berlin')::date + 1)::timestamp at time zone 'Europe/Berlin' $$;

create or replace function public.ai_take_quota(p_art text) returns json language plpgsql security definer set search_path = public as $$
declare u record; d date := berlin_day(); st record; insp_max int := 10; call_max int := 60; is_insp boolean := coalesce(p_art, 'inspiration') = 'inspiration';
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into st from ai_state where id = 1;
  if st.blocked_until is not null and st.blocked_until > now() then return json_build_object('ok', false, 'grund', coalesce(st.grund, 'gemini_limit'), 'bis', st.blocked_until); end if;
  insert into ai_usage (player_id, day, calls, last_at) values (auth.uid(), d, 0, now() - interval '1 minute') on conflict do nothing;
  select * into u from ai_usage where player_id = auth.uid() and day = d for update;
  if is_insp and u.insp >= insp_max then return json_build_object('ok', false, 'grund', 'inspiration', 'bis', berlin_midnight(), 'rest', 0); end if;
  if u.calls >= call_max then return json_build_object('ok', false, 'grund', 'tageslimit', 'bis', berlin_midnight(), 'rest', greatest(0, insp_max - u.insp)); end if;
  if u.last_at > now() - interval '3 seconds' then return json_build_object('ok', false, 'grund', 'zu_schnell'); end if;
  update ai_usage set calls = calls + 1, insp = insp + case when is_insp then 1 else 0 end, last_at = now() where player_id = auth.uid() and day = d;
  return json_build_object('ok', true, 'rest', insp_max - u.insp - case when is_insp then 1 else 0 end, 'max', insp_max);
end;
$$;
revoke execute on function public.ai_take_quota(text) from public, anon; grant execute on function public.ai_take_quota(text) to authenticated;

-- Fehlgeschlagene KI-Antwort: Inspiration zurückgeben (nur die Edge-Funktion darf das)
create or replace function public.ai_refund(p_token text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not fn_token_ok(p_token) then raise exception 'Nicht erlaubt'; end if;
  update ai_usage set insp = greatest(0, insp - 1), calls = greatest(0, calls - 1) where player_id = auth.uid() and day = berlin_day();
end;
$$;
revoke execute on function public.ai_refund(text) from public, anon; grant execute on function public.ai_refund(text) to authenticated;

create or replace function public.ai_status() returns json language plpgsql stable security definer set search_path = public as $$
declare st record; u record; insp_max int := 10; rest int; ki boolean;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into st from ai_state where id = 1;
  select * into u from ai_usage where player_id = auth.uid() and day = berlin_day();
  rest := greatest(0, insp_max - coalesce(u.insp, 0));
  ki := not (st.blocked_until is not null and st.blocked_until > now()) and coalesce(u.calls, 0) < 60;
  if st.blocked_until is not null and st.blocked_until > now() then
    return json_build_object('verfuegbar', false, 'ki', false, 'grund', coalesce(st.grund, 'gemini_limit'), 'bis', st.blocked_until, 'rest', rest, 'max', insp_max);
  end if;
  if coalesce(u.calls, 0) >= 60 then return json_build_object('verfuegbar', false, 'ki', false, 'grund', 'tageslimit', 'bis', berlin_midnight(), 'rest', rest, 'max', insp_max); end if;
  if rest = 0 then return json_build_object('verfuegbar', false, 'ki', true, 'grund', 'inspiration', 'bis', berlin_midnight(), 'rest', 0, 'max', insp_max); end if;
  return json_build_object('verfuegbar', true, 'ki', true, 'rest', rest, 'max', insp_max);
end;
$$;
revoke execute on function public.ai_status() from public, anon; grant execute on function public.ai_status() to authenticated;
