-- Edge Functions access Arena data through their server-side service-role client.
-- Browser roles remain revoked and cannot access these tables directly.
grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.profiles,
  public.arena_parties,
  public.arena_ratings,
  public.arena_matches
to service_role;

grant execute on function public.finalize_arena_match(
  uuid, uuid, uuid, boolean, jsonb, jsonb, bigint, jsonb, jsonb
) to service_role;
