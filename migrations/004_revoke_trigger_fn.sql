-- Migration 004: Trigger-Funktion nicht per API aufrufbar
revoke execute on function public.handle_new_user() from public, anon, authenticated;
