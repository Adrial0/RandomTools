-- Guildmaster asynchronous Arena schema.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  guild_name text not null check (char_length(guild_name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arena_parties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  party_power integer not null check (party_power between 1 and 10000000),
  member_count smallint not null check (member_count between 1 and 5),
  combat_version integer not null default 1,
  published_at timestamptz not null default now()
);

create table if not exists public.arena_ratings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rating integer not null default 1000 check (rating >= 0),
  wins integer not null default 0,
  losses integer not null default 0,
  defense_wins integer not null default 0,
  defense_losses integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.arena_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  attacker_id uuid not null references auth.users(id) on delete cascade,
  defender_id uuid not null references auth.users(id) on delete cascade,
  winner_id uuid not null references auth.users(id) on delete cascade,
  attacker_snapshot jsonb not null,
  defender_snapshot jsonb not null,
  seed bigint not null,
  attacker_rating_before integer not null,
  defender_rating_before integer not null,
  attacker_rating_change integer not null,
  defender_rating_change integer not null,
  report jsonb not null default '[]'::jsonb,
  replay jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists arena_ratings_rank_idx on public.arena_ratings(rating desc, wins desc);
create index if not exists arena_matches_attacker_idx on public.arena_matches(attacker_id, created_at desc);
create index if not exists arena_matches_defender_idx on public.arena_matches(defender_id, created_at desc);
create index if not exists arena_parties_power_idx on public.arena_parties(party_power);

alter table public.profiles enable row level security;
alter table public.arena_parties enable row level security;
alter table public.arena_ratings enable row level security;
alter table public.arena_matches enable row level security;

-- The browser uses authenticated Edge Functions, not direct table access.
revoke all on public.profiles, public.arena_parties, public.arena_ratings, public.arena_matches from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.arena_parties, public.arena_ratings, public.arena_matches to service_role;

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
  -- Stable lock order prevents two simultaneous cross-challenges from deadlocking.
  perform 1 from arena_ratings where user_id in (p_attacker,p_defender) order by user_id for update;
  select rating into a_rating from arena_ratings where user_id=p_attacker;
  select rating into d_rating from arena_ratings where user_id=p_defender;

  expected=1.0/(1.0+power(10.0,(d_rating-a_rating)/400.0));
  delta=round(32*((case when p_attacker_won then 1 else 0 end)-expected));
  winner=case when p_attacker_won then p_attacker else p_defender end;

  update arena_ratings set rating=greatest(0,rating+delta),wins=wins+(case when p_attacker_won then 1 else 0 end),losses=losses+(case when p_attacker_won then 0 else 1 end),updated_at=now() where user_id=p_attacker;
  update arena_ratings set rating=greatest(0,rating-delta),defense_wins=defense_wins+(case when p_attacker_won then 0 else 1 end),defense_losses=defense_losses+(case when p_attacker_won then 1 else 0 end),updated_at=now() where user_id=p_defender;

  insert into arena_matches(request_id,attacker_id,defender_id,winner_id,attacker_snapshot,defender_snapshot,seed,attacker_rating_before,defender_rating_before,attacker_rating_change,defender_rating_change,report,replay)
  values(p_request_id,p_attacker,p_defender,winner,p_attacker_snapshot,p_defender_snapshot,p_seed,a_rating,d_rating,delta,-delta,p_report,p_replay)
  returning id into match_id;

  return jsonb_build_object('matchId',match_id,'ratingChange',delta,'newRating',greatest(0,a_rating+delta));
end;
$$;

revoke all on function public.finalize_arena_match(uuid,uuid,uuid,boolean,jsonb,jsonb,bigint,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.finalize_arena_match(uuid,uuid,uuid,boolean,jsonb,jsonb,bigint,jsonb,jsonb) to service_role;
