-- 033: Hilfsfunktionen aus 031/032 nicht über die API aufrufbar machen
revoke execute on function public.dorf_typen(bigint), public.trg_quest_taten(), public.trg_welt_neues_dorf(), public.job_weiblich(text), public.volk_wort(numeric),
  public.krise_risiko(text, int), public.krise_hilfe_info(text), public.welt_wohlstand_wort(numeric) from public, anon, authenticated;
