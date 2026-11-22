-- Migration 017: get_npc_brief liefert zusätzlich den größten Rivalen der Figur (für Gesprächsfäden über das Dorf).
create or replace function public.get_npc_brief(p_npc bigint) returns json language plpgsql stable security definer set search_path = public as $function$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if not npc_reachable(p_npc) then raise exception 'Diese Person lebt nicht in deinem Dorf'; end if;
  return json_build_object(
    'wissen', coalesce((select wissen from npc_profiles where npc_id = p_npc), '{}'),
    'gefragt', (select coalesce(json_agg(key), '[]'::json) from player_notes where player_id = auth.uid() and npc_id = p_npc and kind = 'fakt'),
    'gehoert', (select coalesce(json_agg(text), '[]'::json) from (select text from npc_knowledge where npc_id = p_npc and about_player = auth.uid() order by created_at desc limit 3) k),
    'auftrag_optionen', deal_options(p_npc),
    'abmachung', (select json_build_object('id', d.id, 'titel', t.titel, 'holz', t.holz, 'status', d.status, 'faellig_at', d.faellig_at) from npc_deals d join deal_templates t on t.id = d.vorlage where d.npc_id = p_npc and d.player_id = auth.uid() and d.status in ('wartet_holz', 'in_arbeit') limit 1),
    'holz', (select village_wood(v) from villages v where v.owner_id = auth.uid()),
    'rivale', (select n.name from npc_bonds b join npcs n on n.id = case when b.npc_a = p_npc then b.npc_b else b.npc_a end where (b.npc_a = p_npc or b.npc_b = p_npc) and b.sympathy < -10 order by b.sympathy limit 1)
  );
end;
$function$;
