-- Migration 003: Welt-Figuren (jede Figur gibt es nur einmal in der Welt), Beziehungen und Erinnerungen.
-- Sympathie/Loyalität sind pro Spieler gespeichert und für Clients verdeckt (nur Stimmungswörter).

create table public.npcs (
  id          bigint generated always as identity primary key,
  name        text not null,
  job         text not null,
  tier        smallint not null default 1 check (tier between 1 and 3),
  look        jsonb not null,                       -- Bauplan der Figur (Grafik wird daraus erzeugt)
  village_id  bigint references public.villages(id) on delete set null,  -- null = Wanderer ohne Dorf
  home_plot   int,
  traits      jsonb not null default '{}'::jsonb,   -- verdeckte Eigenschaften
  travel_to   bigint references public.villages(id) on delete set null,  -- für spätere Reisen zwischen Dörfern
  depart_at   timestamptz,
  arrive_at   timestamptz,
  created_at  timestamptz not null default now()
);
create unique index npcs_name_key on public.npcs (lower(name));
create index npcs_village_idx on public.npcs (village_id);
create index npcs_travel_to_idx on public.npcs (travel_to);

create table public.npc_relations (                 -- Figur -> Spieler
  npc_id     bigint not null references public.npcs(id) on delete cascade,
  player_id  uuid   not null references public.profiles(id) on delete cascade,
  sympathy   smallint not null default 0 check (sympathy between -100 and 100),
  loyalty    smallint not null default 0 check (loyalty between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (npc_id, player_id)
);
create index npc_relations_player_idx on public.npc_relations (player_id);

create table public.npc_bonds (                     -- Figur <-> Figur
  npc_a      bigint not null references public.npcs(id) on delete cascade,
  npc_b      bigint not null references public.npcs(id) on delete cascade,
  sympathy   smallint not null default 0 check (sympathy between -100 and 100),
  updated_at timestamptz not null default now(),
  primary key (npc_a, npc_b),
  check (npc_a < npc_b)
);
create index npc_bonds_b_idx on public.npc_bonds (npc_b);

create table public.npc_memories (                  -- gemeinsame Erlebnisse (z. B. Feldarbeit, Quest)
  id             bigint generated always as identity primary key,
  npc_id         bigint not null references public.npcs(id) on delete cascade,
  player_id      uuid   not null references public.profiles(id) on delete cascade,
  kind           text not null,
  text           text not null,
  sympathy_delta smallint not null default 0,
  created_at     timestamptz not null default now()
);
create index npc_memories_lookup_idx on public.npc_memories (npc_id, player_id, created_at desc);
create index npc_memories_player_idx on public.npc_memories (player_id);

alter table public.npcs enable row level security;
alter table public.npc_relations enable row level security;
alter table public.npc_bonds enable row level security;
alter table public.npc_memories enable row level security;
revoke all on public.npcs, public.npc_relations, public.npc_bonds, public.npc_memories from anon, authenticated;

-- 50 Gründer-Figuren der Welt
insert into public.npcs (name, job, tier, look, traits) values
  ('Gunnar', 'Schmied', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#d49a72","hair":"#3d2a1c","beard":"kurz","top":"#5a4a3a","apron":"#6b4a2e","prop":"hammer"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Hilde', 'Waffenschmiedin', 2, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"zopf","skin":"#e4b48c","hair":"#8a4a2a","top":"#7a3a2a","apron":"#4e3420","prop":"zange"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Torvald', 'Rüstmacher', 3, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"glatze","skin":"#f0c8a0","hair":"#8e8c88","beard":"lang","top":"#6a6e78","prop":"hammer"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Bertram', 'Bäcker', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#e4b48c","hair":"#c8a860","top":"#e0d6c0","apron":"#f2eee4","hat":"kochmuetze","hatColor":"#f2eee4","prop":"brot"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ilsa', 'Müllerin', 1, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"lang","skin":"#f0c8a0","hair":"#c8a860","top":"#b8a888","apron":"#e8e0cc","hat":"kopftuch","hatColor":"#d8c89a","prop":"sack"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Konrad', 'Bauer', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#b8805a","hair":"#6b4528","beard":"kurz","top":"#7a6a3a","hat":"hut","hatColor":"#c9b070","prop":"heugabel"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Mathilda', 'Bäuerin', 1, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"lang","skin":"#d49a72","hair":"#6b4528","top":"#8a5a3a","apron":"#d8c8a0","hat":"kopftuch","hatColor":"#a84a3a","prop":"korb"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ulf', 'Hirte', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#d49a72","hair":"#6b4528","beard":"lang","top":"#8a7a5a","cape":"#6a5a40","hat":"fellmuetze","hatColor":"#7a5a3a","prop":"hirtenstab"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Leif', 'Jäger', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#e4b48c","hair":"#c8a860","beard":"stoppel","top":"#4a5a3a","cape":"#5a4a32","hat":"kappe","hatColor":"#4a3a2a","prop":"bogen","quiver":"#5e3a20","fletch":"#e8e0cc"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Frida', 'Jägerin', 1, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"zopf","skin":"#f0c8a0","hair":"#c8a860","top":"#5a6a3a","cape":"#4a3a2a","prop":"speer"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Osric', 'Fischer', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#b8805a","hair":"#8e8c88","beard":"kurz","top":"#4a6a7a","hat":"kappe","hatColor":"#3a4a5a","prop":"angel"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Wilma', 'Wäscherin', 1, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"dutt","skin":"#e4b48c","hair":"#6b4528","top":"#6a7a8a","apron":"#d8d0c0","prop":"waesche"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Haldor', 'Holzfäller', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"wild","skin":"#e4b48c","hair":"#a8482a","beard":"lang","top":"#8a3a2a","prop":"axt"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Brand', 'Köhler', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#8f5e3c","hair":"#2a2018","beard":"kurz","top":"#3a3430","prop":"schaufel"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Gerold', 'Zimmermann', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#d49a72","hair":"#c8a860","top":"#9a8462","apron":"#6b4a2e","prop":"saege"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Aldric', 'Steinmetz', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#b8805a","hair":"#a89a80","beard":"stoppel","top":"#9a9890","apron":"#7a7468","hat":"kappe","hatColor":"#8a8478","prop":"hammer"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Runa', 'Gerberin', 2, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"lang","skin":"#d49a72","hair":"#3d2a1c","top":"#6a5032","apron":"#4a3a28","prop":"messer"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Elsbeth', 'Schneiderin', 2, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"dutt","skin":"#f0c8a0","hair":"#c8a860","top":"#7a4a6a","prop":"schere"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Agnes', 'Weberin', 2, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"lang","skin":"#e4b48c","hair":"#6b4528","top":"#5a6a8a","hat":"haube","hatColor":"#ece6d8","prop":"garn"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Wolf', 'Totengräber', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#f0c8a0","hair":"#8e8c88","beard":"stoppel","top":"#3a3a3a","hat":"hut","hatColor":"#2a2626","prop":"laterne"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Odo', 'Schuster', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"glatze","skin":"#d49a72","hair":"#3d2a1c","beard":"schnurr","top":"#6a5a4a","apron":"#4a3a2a","prop":"hammer"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ruprecht', 'Pfeilmacher', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#e4b48c","hair":"#6b4528","beard":"kurz","top":"#6a7a4a","vest":"#5a3e22","prop":"pfeile"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Merten', 'Wagner', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#b8805a","hair":"#6b4528","top":"#8a6a3a","prop":"rad"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ole', 'Fährmann', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#d49a72","hair":"#dcd8d0","beard":"lang","top":"#4a5a6a","cape":"#3a4048","prop":"ruder"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ottilie', 'Kerzenzieherin', 2, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"dutt","skin":"#f0c8a0","hair":"#a89a80","top":"#8a7a9a","apron":"#e8e0cc","prop":"kerze"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ansgar', 'Töpfer', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#8f5e3c","hair":"#2a2018","top":"#a86a4a","apron":"#7a5a3a","prop":"topf"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Lothar', 'Brauer', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#e4b48c","hair":"#8a4a2a","beard":"kurz","top":"#7a5a2a","apron":"#5a4228","prop":"krug"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Eckhart', 'Wirt', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"glatze","skin":"#f0c8a0","hair":"#8e8c88","beard":"schnurr","top":"#e8e0cc","vest":"#6a3a2a","prop":"krug"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Liesel', 'Schankmaid', 1, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"lang","skin":"#e4b48c","hair":"#c8a860","top":"#e8e0cc","vest":"#7a2a2a","prop":"krug"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Falk', 'Koch', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#b8805a","hair":"#3d2a1c","beard":"stoppel","top":"#e8e4d8","hat":"kochmuetze","hatColor":"#f2eee4","prop":"kelle"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ivar', 'Metzger', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#d49a72","hair":"#a8482a","beard":"kurz","top":"#d8d0c0","apron":"#c09088","prop":"beil"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ragna', 'Imkerin', 2, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"zopf","skin":"#e4b48c","hair":"#c8a860","top":"#c9a95a","hat":"hut","hatColor":"#e8e0cc","prop":"honig"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Gudrun', 'Kräuterfrau', 1, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"lang","skin":"#d49a72","hair":"#8e8c88","top":"#5a6a4a","cape":"#44543a","hat":"kapuze","hatColor":"#44543a","prop":"kraeuter"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Kunz', 'Bergmann', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#b8805a","hair":"#2a2018","beard":"kurz","top":"#5a5248","hat":"kappe","hatColor":"#3a3430","prop":"spitzhacke"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ida', 'Heilerin', 1, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"lang","skin":"#6a4028","hair":"#2a2018","top":"#e8e8e0","hat":"haube","hatColor":"#f2f0ea","prop":"kraeuter"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Hedwig', 'Dorfälteste', 3, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"dutt","skin":"#e4b48c","hair":"#dcd8d0","top":"#6a5a6a","robe":true,"prop":"gehstock"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Roderich', 'Alchemist', 3, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#f0c8a0","hair":"#dcd8d0","beard":"lang","top":"#4a3a5a","robe":true,"prop":"trank"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Sigrun', 'Priesterin', 3, '{"w":1,"belt":"#b88a3e","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"lang","skin":"#e4b48c","hair":"#8a4a2a","top":"#e8e4d8","robe":true,"hat":"stirnreif","prop":"buch"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Jorund', 'Mönch', 3, '{"w":0,"belt":"#c9b070","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"glatze","skin":"#d49a72","hair":"#6b4528","top":"#6a5a42","robe":true,"hat":"kapuze","hatColor":"#5e4e38","prop":"buch"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Edwin', 'Schreiber', 3, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#f0c8a0","hair":"#3d2a1c","top":"#3a4a6a","robe":true,"prop":"schriftrolle"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Wilfried', 'Gelehrter', 3, '{"w":0,"belt":"#8a8a8a","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#8f5e3c","hair":"#8e8c88","beard":"lang","top":"#5a5450","robe":true,"prop":"buch"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Wenzel', 'Barde', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#e4b48c","hair":"#6b4528","beard":"schnurr","top":"#8a3a5a","cape":"#3a5a8a","hat":"barett","hatColor":"#5a2a4a","prop":"laute"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Ottmar', 'Händler', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#b8805a","hair":"#3d2a1c","beard":"kurz","top":"#6a3a6a","vest":"#c9a95a","hat":"hut","hatColor":"#4a2a3a","prop":"beutel"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Svea', 'Falknerin', 2, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"zopf","skin":"#f0c8a0","hair":"#a89a80","top":"#5a4a3a","cape":"#6a5a3a","prop":"falke"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Jost', 'Stallbursche', 1, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#d49a72","hair":"#c8a860","top":"#9a8a6a","hat":"kappe","hatColor":"#6a5a3a","prop":"buerste"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Harald', 'Wache', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#e4b48c","hair":"#6b4528","beard":"kurz","top":"#6a6e78","vest":"#7a2a2a","hat":"helm","prop":"speer"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Siegmund', 'Hauptmann', 3, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#d49a72","hair":"#8e8c88","beard":"kurz","top":"#6a6e78","vest":"#2a4a7a","cape":"#7a2a2a","prop":"schwert"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Yrsa', 'Söldnerin', 3, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"zopf","skin":"#8f5e3c","hair":"#2a2018","top":"#5a5048","cape":"#3a3430","prop":"schwert"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Klaas', 'Rattenfänger', 2, '{"w":0,"belt":"#3a2618","legs":"#4a3e30","boots":"#3a2a1e","hairStyle":"kurz","skin":"#f0c8a0","hair":"#a8482a","beard":"stoppel","top":"#5a6a3a","hat":"hut","hatColor":"#6a3a2a","prop":"kaefig"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int)),
  ('Marit', 'Seherin', 3, '{"w":1,"belt":"#3a2618","legs":"#5a4a3a","boots":"#3a2a1e","hairStyle":"lang","skin":"#f0c8a0","hair":"#dcd8d0","top":"#3a2a5a","robe":true,"cape":"#2a1a3a","hat":"kapuze","hatColor":"#2a1a3a","prop":"stab"}'::jsonb, jsonb_build_object('fleiss', floor(random()*101)::int, 'mut', floor(random()*101)::int, 'gier', floor(random()*101)::int, 'treue', floor(random()*101)::int, 'geselligkeit', floor(random()*101)::int))
;

-- Startbewohner: freie Figuren (ohne Dorf) ziehen ein, einfache Berufe zuerst
create or replace function public.assign_start_residents(p_village bigint, p_count int default 8)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  n int := 0;
  r record;
begin
  select owner_id into v_owner from villages where id = p_village;
  if v_owner is null then return 0; end if;
  for r in
    select id from npcs
    where village_id is null and travel_to is null
    order by tier, random()
    limit p_count
    for update skip locked
  loop
    update npcs set village_id = p_village where id = r.id;
    insert into npc_relations (npc_id, player_id, sympathy, loyalty)
    values (r.id, v_owner, 5 + floor(random() * 30)::int, 30 + floor(random() * 30)::int)
    on conflict (npc_id, player_id) do nothing;
    n := n + 1;
  end loop;
  insert into npc_bonds (npc_a, npc_b, sympathy)
  select a.id, b.id, (floor(random() * 100) - 40)::int
  from npcs a join npcs b on a.id < b.id
  where a.village_id = p_village and b.village_id = p_village
  on conflict do nothing;
  return n;
end;
$$;
revoke execute on function public.assign_start_residents(bigint, int) from public, anon, authenticated;

create or replace function public.on_village_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform assign_start_residents(new.id);
  return new;
end;
$$;
revoke execute on function public.on_village_created() from public, anon, authenticated;

create trigger village_start_residents
  after insert on public.villages
  for each row execute function public.on_village_created();

-- Bewohner des eigenen Dorfes + ein paar Wanderer. Sympathie nur als Wort.
create or replace function public.get_my_residents()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'residents', coalesce((
      select json_agg(json_build_object(
        'id', n.id, 'name', n.name, 'job', n.job, 'look', n.look, 'home_plot', n.home_plot,
        'stimmung', case
          when r.sympathy is null then 'fremd'
          when r.sympathy < -60 then 'feindselig'
          when r.sympathy < -20 then 'misstrauisch'
          when r.sympathy < 10 then 'zurückhaltend'
          when r.sympathy < 40 then 'freundlich'
          when r.sympathy < 70 then 'herzlich'
          else 'treu ergeben' end,
        'freund', (select case when b.npc_a = n.id then b.npc_b else b.npc_a end
                   from npc_bonds b where (b.npc_a = n.id or b.npc_b = n.id) and b.sympathy >= 30
                   order by b.sympathy desc limit 1),
        'erinnerung', (select m.text from npc_memories m
                       where m.npc_id = n.id and m.player_id = auth.uid()
                       order by m.created_at desc limit 1)
      ) order by n.id)
      from npcs n
      join villages v on v.id = n.village_id
      left join npc_relations r on r.npc_id = n.id and r.player_id = auth.uid()
      where v.owner_id = auth.uid()
    ), '[]'::json),
    'wanderer', coalesce((
      select json_agg(json_build_object('id', w.id, 'name', w.name, 'job', w.job, 'look', w.look))
      from (select id, name, job, look from npcs where village_id is null and travel_to is null order by random() limit 3) w
    ), '[]'::json)
  );
$$;
revoke execute on function public.get_my_residents() from public, anon;
grant execute on function public.get_my_residents() to authenticated;

-- bestehende Dörfer bekommen ihre Startbewohner
select public.assign_start_residents(id) from public.villages order by id;
