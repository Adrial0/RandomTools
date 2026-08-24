-- Arena rating belongs to fights a player actively initiates.
-- Defenses record wins/losses but never gain or lose rating.
create or replace function public.finalize_arena_match(
  p_request_id uuid,
  p_attacker uuid,
  p_defender uuid,
  p_attacker_won boolean,
  p_attacker_snapshot jsonb,
  p_defender_snapshot jsonb,
  p_seed bigint,
  p_report jsonb,
  p_replay jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a_rating integer;
  d_rating integer;
  expected numeric;
  delta integer;
  winner uuid;
  match_id uuid;
begin
  if p_attacker = p_defender then raise exception 'Cannot fight your own defense'; end if;

  select id into match_id from arena_matches where request_id=p_request_id;
  if match_id is not null then
    return (select jsonb_build_object('matchId',id,'ratingChange',attacker_rating_change,'newRating',attacker_rating_before+attacker_rating_change) from arena_matches where id=match_id);
  end if;

  insert into arena_ratings(user_id) values(p_attacker) on conflict(user_id) do nothing;
  insert into arena_ratings(user_id) values(p_defender) on conflict(user_id) do nothing;
  perform 1 from arena_ratings where user_id in (p_attacker,p_defender) order by user_id for update;
  select rating into a_rating from arena_ratings where user_id=p_attacker;
  select rating into d_rating from arena_ratings where user_id=p_defender;

  expected=1.0/(1.0+power(10.0,(d_rating-a_rating)/400.0));
  delta=round(32*((case when p_attacker_won then 1 else 0 end)-expected));
  winner=case when p_attacker_won then p_attacker else p_defender end;

  update arena_ratings
  set rating=greatest(0,rating+delta),
      wins=wins+(case when p_attacker_won then 1 else 0 end),
      losses=losses+(case when p_attacker_won then 0 else 1 end),
      updated_at=now()
  where user_id=p_attacker;

  update arena_ratings
  set defense_wins=defense_wins+(case when p_attacker_won then 0 else 1 end),
      defense_losses=defense_losses+(case when p_attacker_won then 1 else 0 end),
      updated_at=now()
  where user_id=p_defender;

  insert into arena_matches(request_id,attacker_id,defender_id,winner_id,attacker_snapshot,defender_snapshot,seed,attacker_rating_before,defender_rating_before,attacker_rating_change,defender_rating_change,report,replay)
  values(p_request_id,p_attacker,p_defender,winner,p_attacker_snapshot,p_defender_snapshot,p_seed,a_rating,d_rating,delta,0,p_report,p_replay)
  returning id into match_id;

  return jsonb_build_object('matchId',match_id,'ratingChange',delta,'newRating',greatest(0,a_rating+delta));
end;
$$;

revoke all on function public.finalize_arena_match(uuid,uuid,uuid,boolean,jsonb,jsonb,bigint,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.finalize_arena_match(uuid,uuid,uuid,boolean,jsonb,jsonb,bigint,jsonb,jsonb) to service_role;
