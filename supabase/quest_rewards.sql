-- Bozi quest model + reward hardening
-- Run once in Supabase SQL Editor.

alter table public.bozi_quests
  add column if not exists quest_type text not null default 'educational'
    check (quest_type in ('educational','x')),
  add column if not exists x_action text
    check (x_action in ('post','follow','like','repost')),
  add column if not exists x_target_username text,
  add column if not exists x_target_user_id text,
  add column if not exists x_instructions text,
  add column if not exists reward_points_enabled boolean not null default true,
  add column if not exists reward_points integer not null default 0,
  add column if not exists reward_stablecoin_enabled boolean not null default false,
  add column if not exists reward_stablecoin_symbol text,
  add column if not exists reward_stablecoin_token_address text,
  add column if not exists reward_stablecoin_decimals integer,
  add column if not exists reward_stablecoin_amount numeric(30,18),
  add column if not exists reward_stablecoin_chain_id bigint;

create table if not exists public.bozi_reward_tokens (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null,
  symbol text not null,
  token_address text not null,
  decimals integer not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(chain_id, token_address)
);

alter table public.bozi_reward_tokens enable row level security;
drop policy if exists "reward tokens readable by authenticated" on public.bozi_reward_tokens;
create policy "reward tokens readable by authenticated"
  on public.bozi_reward_tokens for select to authenticated
  using (enabled = true);

insert into public.bozi_reward_tokens(chain_id,symbol,token_address,decimals,enabled)
values (8453,'USDC','0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',6,true)
on conflict (chain_id,token_address) do update
set symbol=excluded.symbol,decimals=excluded.decimals,enabled=excluded.enabled;

create table if not exists public.bozi_x_participant_restrictions (
  id uuid primary key default gen_random_uuid(),
  x_user_id text not null unique,
  status text not null default 'blacklisted'
    check (status in ('blacklisted','cleared')),
  source_quest_id uuid references public.bozi_quests(id),
  reason text not null,
  violated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bozi_x_restrictions_status_idx
  on public.bozi_x_participant_restrictions(status);

alter table public.bozi_x_participant_restrictions enable row level security;

create table if not exists public.bozi_x_quest_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.bozi_quests(id) on delete cascade,
  x_user_id text not null,
  action text not null check (action in ('post','follow','like','repost')),
  post_url text,
  post_id text,
  status text not null default 'pending'
    check (status in ('pending','verified','rewarded','violated','blacklisted','rejected')),
  points_awarded integer not null default 0,
  stablecoin_enabled boolean not null default false,
  stablecoin_symbol text,
  stablecoin_token_address text,
  stablecoin_decimals integer,
  stablecoin_amount numeric(30,18),
  payout_wallet text,
  payout_status text not null default 'not_required'
    check (payout_status in ('not_required','pending','processing','confirmed','failed')),
  payout_tx_hash text,
  verified_at timestamptz,
  rewarded_at timestamptz,
  violated_at timestamptz,
  violation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, quest_id),
  unique(post_id)
);

create index if not exists bozi_x_claims_x_user_idx
  on public.bozi_x_quest_claims(x_user_id);
create index if not exists bozi_x_claims_quest_idx
  on public.bozi_x_quest_claims(quest_id);

alter table public.bozi_x_quest_claims enable row level security;
drop policy if exists "x claims readable by owner" on public.bozi_x_quest_claims;
create policy "x claims readable by owner"
  on public.bozi_x_quest_claims for select to authenticated
  using (user_id = auth.uid());

create table if not exists public.bozi_quest_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.bozi_quests(id) on delete cascade,
  reward_type text not null check (reward_type in ('points','stablecoin')),
  amount_numeric numeric(30,18) not null,
  token_symbol text,
  token_address text,
  chain_id bigint,
  tx_hash text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,quest_id,reward_type)
);

alter table public.bozi_quest_reward_claims enable row level security;
drop policy if exists "quest rewards readable by owner" on public.bozi_quest_reward_claims;
create policy "quest rewards readable by owner"
  on public.bozi_quest_reward_claims for select to authenticated
  using (user_id = auth.uid());

create or replace function public.bozi_admin_upsert_quest_v2(
  p_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
  p_quest_type text,
  p_x_action text,
  p_x_target_username text,
  p_x_target_user_id text,
  p_x_instructions text,
  p_reward_points_enabled boolean,
  p_reward_points integer,
  p_reward_stablecoin_enabled boolean,
  p_reward_stablecoin_symbol text,
  p_reward_stablecoin_token_address text,
  p_reward_stablecoin_decimals integer,
  p_reward_stablecoin_amount numeric,
  p_reward_stablecoin_chain_id bigint,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
begin
  if not public.bozi_is_admin() then raise exception 'Admin access required'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'Title required'; end if;
  if nullif(trim(p_slug),'') is null then raise exception 'Slug required'; end if;
  if p_quest_type not in ('educational','x') then raise exception 'Invalid quest type'; end if;
  if p_status not in ('draft','published','archived') then raise exception 'Invalid status'; end if;

  if p_quest_type = 'educational' then
    if p_x_action is not null or p_x_target_username is not null or p_x_target_user_id is not null then
      raise exception 'Educational quests cannot have an X action';
    end if;
  else
    if p_x_action not in ('post','follow') then raise exception 'X quests require Post or Follow'; end if;
    if p_x_action = 'follow' and nullif(trim(p_x_target_username),'') is null then
      raise exception 'Follow quests require a target X account';
    end if;
    if p_x_action = 'post' and nullif(trim(p_x_instructions),'') is null then
      raise exception 'Post quests require instructions';
    end if;
  end if;

  if p_reward_points_enabled and greatest(coalesce(p_reward_points,0),0) = 0 then
    raise exception 'Points reward must be greater than zero when enabled';
  end if;

  if p_reward_stablecoin_enabled then
    if nullif(trim(p_reward_stablecoin_symbol),'') is null
      or nullif(trim(p_reward_stablecoin_token_address),'') is null
      or p_reward_stablecoin_decimals is null
      or coalesce(p_reward_stablecoin_amount,0) <= 0
      or p_reward_stablecoin_chain_id is null then
      raise exception 'Complete stablecoin reward configuration is required';
    end if;

    if not exists (
      select 1 from public.bozi_reward_tokens
      where enabled = true
        and chain_id = p_reward_stablecoin_chain_id
        and lower(token_address) = lower(trim(p_reward_stablecoin_token_address))
    ) then
      raise exception 'Stablecoin token is not allowlisted';
    end if;
  end if;

  if p_id is null then
    insert into public.bozi_quests(
      slug,title,summary,status,published_at,created_by,
      quest_type,x_action,x_target_username,x_target_user_id,x_instructions,
      reward_points_enabled,reward_points,
      reward_stablecoin_enabled,reward_stablecoin_symbol,reward_stablecoin_token_address,
      reward_stablecoin_decimals,reward_stablecoin_amount,reward_stablecoin_chain_id
    )
    values(
      lower(trim(p_slug)),trim(p_title),nullif(trim(p_summary),''),p_status,
      case when p_status='published' then now() else null end,auth.uid(),
      p_quest_type,case when p_quest_type='x' then p_x_action else null end,
      nullif(trim(p_x_target_username),''),nullif(trim(p_x_target_user_id),''),
      nullif(trim(p_x_instructions),''),
      coalesce(p_reward_points_enabled,false),greatest(coalesce(p_reward_points,0),0),
      coalesce(p_reward_stablecoin_enabled,false),nullif(trim(p_reward_stablecoin_symbol),''),
      nullif(trim(p_reward_stablecoin_token_address),''),
      p_reward_stablecoin_decimals,p_reward_stablecoin_amount,p_reward_stablecoin_chain_id
    )
    returning id into v_id;
  else
    update public.bozi_quests set
      slug=lower(trim(p_slug)), title=trim(p_title), summary=nullif(trim(p_summary),''),
      status=p_status,
      published_at=case when p_status='published' then coalesce(published_at,now()) else null end,
      updated_at=now(),
      quest_type=p_quest_type,
      x_action=case when p_quest_type='x' then p_x_action else null end,
      x_target_username=case when p_quest_type='x' then nullif(trim(p_x_target_username),'') else null end,
      x_target_user_id=case when p_quest_type='x' then nullif(trim(p_x_target_user_id),'') else null end,
      x_instructions=case when p_quest_type='x' then nullif(trim(p_x_instructions),'') else null end,
      reward_points_enabled=coalesce(p_reward_points_enabled,false),
      reward_points=greatest(coalesce(p_reward_points,0),0),
      reward_stablecoin_enabled=coalesce(p_reward_stablecoin_enabled,false),
      reward_stablecoin_symbol=case when p_reward_stablecoin_enabled then nullif(trim(p_reward_stablecoin_symbol),'') else null end,
      reward_stablecoin_token_address=case when p_reward_stablecoin_enabled then nullif(trim(p_reward_stablecoin_token_address),'') else null end,
      reward_stablecoin_decimals=case when p_reward_stablecoin_enabled then p_reward_stablecoin_decimals else null end,
      reward_stablecoin_amount=case when p_reward_stablecoin_enabled then p_reward_stablecoin_amount else null end,
      reward_stablecoin_chain_id=case when p_reward_stablecoin_enabled then p_reward_stablecoin_chain_id else null end
    where id=p_id;
    if not found then raise exception 'Quest not found'; end if;
    v_id:=p_id;
  end if;
  return v_id;
end;
$$;

revoke all on function public.bozi_admin_upsert_quest_v2(uuid,text,text,text,text,text,text,text,text,boolean,integer,boolean,text,text,integer,numeric,bigint,text) from public;
grant execute on function public.bozi_admin_upsert_quest_v2(uuid,text,text,text,text,text,text,text,text,boolean,integer,boolean,text,text,integer,numeric,bigint,text) to authenticated;

create or replace function public.bozi_is_x_restricted(p_x_user_id text)
returns boolean
language sql
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.bozi_x_participant_restrictions
    where x_user_id = p_x_user_id and status='blacklisted'
  );
$$;
revoke all on function public.bozi_is_x_restricted(text) from public;
grant execute on function public.bozi_is_x_restricted(text) to authenticated;

create or replace function public.bozi_blacklist_x_user(
  p_x_user_id text,
  p_source_quest_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.bozi_is_admin() then raise exception 'Admin access required'; end if;
  insert into public.bozi_x_participant_restrictions(x_user_id,status,source_quest_id,reason)
  values(trim(p_x_user_id),'blacklisted',p_source_quest_id,trim(p_reason))
  on conflict (x_user_id) do update set
    status='blacklisted',
    source_quest_id=excluded.source_quest_id,
    reason=excluded.reason,
    violated_at=now(),
    updated_at=now();
  return true;
end;
$$;
revoke all on function public.bozi_blacklist_x_user(text,uuid,text) from public;
grant execute on function public.bozi_blacklist_x_user(text,uuid,text) to authenticated;


create or replace function public.bozi_claim_x_reward(
  p_quest_id uuid,
  p_x_user_id text,
  p_action text,
  p_post_url text default null,
  p_post_id text default null
)
returns table(
  claim_id uuid,
  points_awarded integer,
  stablecoin_enabled boolean,
  stablecoin_amount numeric,
  stablecoin_symbol text,
  payout_wallet text,
  already_claimed boolean
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_quest public.bozi_quests%rowtype;
  v_profile public.bozi_profiles%rowtype;
  v_claim public.bozi_x_quest_claims%rowtype;
  v_points integer;
  v_wallet text;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_quest from public.bozi_quests
  where id=p_quest_id and status='published' and quest_type='x';
  if not found then raise exception 'X quest is not available'; end if;
  if p_action <> v_quest.x_action then raise exception 'Invalid X action'; end if;

  if exists(select 1 from public.bozi_x_participant_restrictions where x_user_id=trim(p_x_user_id) and status='blacklisted') then
    raise exception 'This X account is permanently restricted from X campaigns';
  end if;

  select * into v_profile from public.bozi_profiles where user_id=v_user_id;
  if not found or v_profile.x_user_id is null or v_profile.x_user_id<>trim(p_x_user_id) then
    raise exception 'Connected X account does not match verification identity';
  end if;

  select * into v_claim from public.bozi_x_quest_claims
  where user_id=v_user_id and quest_id=p_quest_id
  for update;
  if found then
    return query select v_claim.id,v_claim.points_awarded,v_claim.stablecoin_enabled,
      v_claim.stablecoin_amount,v_claim.stablecoin_symbol,v_claim.payout_wallet,true;
    return;
  end if;

  v_wallet := v_profile.wallet_address;
  if v_quest.reward_stablecoin_enabled and nullif(trim(v_wallet),'') is null then
    raise exception 'Connect a wallet before claiming a stablecoin reward';
  end if;

  v_points := case when v_quest.reward_points_enabled then greatest(v_quest.reward_points,0) else 0 end;

  insert into public.bozi_x_quest_claims(
    user_id,quest_id,x_user_id,action,post_url,post_id,status,
    points_awarded,stablecoin_enabled,stablecoin_symbol,stablecoin_token_address,
    stablecoin_decimals,stablecoin_amount,payout_wallet,payout_status,verified_at,rewarded_at
  )
  values(
    v_user_id,p_quest_id,trim(p_x_user_id),p_action,nullif(trim(p_post_url),''),
    nullif(trim(p_post_id),''),'rewarded',v_points,v_quest.reward_stablecoin_enabled,
    v_quest.reward_stablecoin_symbol,v_quest.reward_stablecoin_token_address,
    v_quest.reward_stablecoin_decimals,v_quest.reward_stablecoin_amount,v_wallet,
    case when v_quest.reward_stablecoin_enabled then 'pending' else 'not_required' end,
    now(),now()
  )
  returning * into v_claim;

  if v_points > 0 then
    insert into public.bozi_points_ledger(user_id,source_type,source_id,points,description)
    values(v_user_id,case when p_action='post' then 'social_post' else 'social_'||p_action end,v_claim.id,v_points,'Verified X quest reward')
    on conflict (user_id,source_type,source_id) do nothing;
  end if;

  return query select v_claim.id,v_points,v_claim.stablecoin_enabled,
    v_claim.stablecoin_amount,v_claim.stablecoin_symbol,v_wallet,false;
end;
$$;

revoke all on function public.bozi_claim_x_reward(uuid,text,text,text,text) from public;
grant execute on function public.bozi_claim_x_reward(uuid,text,text,text,text) to authenticated;

create or replace function public.bozi_blacklist_x_user_internal(
  p_x_user_id text,
  p_source_quest_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if nullif(trim(p_x_user_id),'') is null then raise exception 'X user ID required'; end if;

  insert into public.bozi_x_participant_restrictions(x_user_id,status,source_quest_id,reason)
  values(trim(p_x_user_id),'blacklisted',p_source_quest_id,trim(p_reason))
  on conflict (x_user_id) do update set
    status='blacklisted',
    source_quest_id=excluded.source_quest_id,
    reason=excluded.reason,
    violated_at=now(),
    updated_at=now();

  update public.bozi_x_quest_claims
  set status='blacklisted',violated_at=now(),violation_reason=trim(p_reason),updated_at=now()
  where x_user_id=trim(p_x_user_id) and status in ('pending','verified','rewarded');

  return true;
end;
$$;

revoke all on function public.bozi_blacklist_x_user_internal(text,uuid,text) from public;
grant execute on function public.bozi_blacklist_x_user_internal(text,uuid,text) to authenticated;


create or replace function public.bozi_claim_educational_reward(p_quest_id uuid)
returns table(
  points_awarded integer,
  stablecoin_enabled boolean,
  stablecoin_amount numeric,
  stablecoin_symbol text,
  stablecoin_claim_id uuid,
  already_claimed boolean
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_quest public.bozi_quests%rowtype;
  v_total integer;
  v_correct integer;
  v_points integer;
  v_already boolean;
  v_stable_claim uuid;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  select * into v_quest from public.bozi_quests where id=p_quest_id and status='published' and quest_type='educational';
  if not found then raise exception 'Educational quest is not available'; end if;

  select count(*),count(*) filter(where a.is_correct)
    into v_total,v_correct
  from public.bozi_questions q
  join public.bozi_lessons l on l.id=q.lesson_id
  left join public.bozi_quiz_attempts a on a.question_id=q.id and a.user_id=v_user_id
  where l.quest_id=p_quest_id;

  if v_total=0 or v_correct<>v_total then raise exception 'Complete every quiz question correctly before claiming the quest reward'; end if;

  select exists(select 1 from public.bozi_quest_reward_claims where user_id=v_user_id and quest_id=p_quest_id and reward_type='points') into v_already;

  v_points:=case when v_quest.reward_points_enabled then greatest(v_quest.reward_points,0) else 0 end;

  if v_points>0 and not v_already then
    insert into public.bozi_quest_reward_claims(user_id,quest_id,reward_type,amount_numeric,status)
    values(v_user_id,p_quest_id,'points',v_points,'confirmed')
    on conflict(user_id,quest_id,reward_type) do nothing;

    insert into public.bozi_points_ledger(user_id,source_type,source_id,points,description)
    values(v_user_id,'quest_reward',p_quest_id,v_points,'Completed educational quest')
    on conflict(user_id,source_type,source_id) do nothing;
  end if;

  if v_quest.reward_stablecoin_enabled then
    insert into public.bozi_quest_reward_claims(user_id,quest_id,reward_type,amount_numeric,token_symbol,token_address,chain_id,status)
    values(v_user_id,p_quest_id,'stablecoin',v_quest.reward_stablecoin_amount,v_quest.reward_stablecoin_symbol,v_quest.reward_stablecoin_token_address,v_quest.reward_stablecoin_chain_id,'pending')
    on conflict(user_id,quest_id,reward_type) do nothing
    returning id into v_stable_claim;
  end if;

  return query select v_points,v_quest.reward_stablecoin_enabled,v_quest.reward_stablecoin_amount,v_quest.reward_stablecoin_symbol,v_stable_claim,v_already;
end;
$$;

revoke all on function public.bozi_claim_educational_reward(uuid) from public;
grant execute on function public.bozi_claim_educational_reward(uuid) to authenticated;


create or replace function public.bozi_begin_x_payout(p_claim_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_ok boolean;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  update public.bozi_x_quest_claims
  set payout_status='processing',updated_at=now()
  where id=p_claim_id and user_id=v_user and stablecoin_enabled=true and payout_status='pending';
  get diagnostics v_ok = row_count;
  return v_ok;
end;
$$;
revoke all on function public.bozi_begin_x_payout(uuid) from public;
grant execute on function public.bozi_begin_x_payout(uuid) to authenticated;
