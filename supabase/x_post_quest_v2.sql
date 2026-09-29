-- Bozi: simplify X campaigns to Post-only and add winner limits + temporary deletion restrictions.
-- Run after supabase/quest_rewards.sql.

alter table public.bozi_quests
  add column if not exists x_max_winners integer not null default 1;

update public.bozi_quests
set status='archived',
    x_action=null,
    x_instructions=null,
    updated_at=now()
where quest_type='x'
  and x_action is distinct from 'post';

alter table public.bozi_quests
  drop constraint if exists bozi_quests_x_action_check;

alter table public.bozi_quests
  add constraint bozi_quests_x_action_check
  check (x_action is null or x_action = 'post');

alter table public.bozi_quests
  drop constraint if exists bozi_quests_x_max_winners_check;

alter table public.bozi_quests
  add constraint bozi_quests_x_max_winners_check
  check (x_max_winners between 1 and 100000);

alter table public.bozi_x_participant_restrictions
  add column if not exists expires_at timestamptz;

create index if not exists bozi_x_restrictions_expires_idx
  on public.bozi_x_participant_restrictions(expires_at);

-- Existing permanent restrictions are converted to a seven-day window from their
-- recorded violation time. This prevents old rows from remaining permanent.
update public.bozi_x_participant_restrictions
set expires_at = violated_at + interval '7 days',
    status = 'blacklisted',
    updated_at = now()
where expires_at is null;

-- The new system has only one X action: Post.
-- Historical follow/like/repost claim rows are retained as audit history.
-- New reward claims can only be created for Post quests.

create or replace function public.bozi_is_x_restricted(p_x_user_id text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_restricted boolean;
begin
  select exists(
    select 1
    from public.bozi_x_participant_restrictions
    where x_user_id = trim(p_x_user_id)
      and status = 'blacklisted'
      and expires_at is not null
      and expires_at > now()
  ) into v_restricted;

  if not v_restricted then
    update public.bozi_x_participant_restrictions
    set status='cleared', updated_at=now()
    where x_user_id=trim(p_x_user_id)
      and status='blacklisted'
      and expires_at is not null
      and expires_at <= now();
  end if;

  return v_restricted;
end;
$$;

revoke all on function public.bozi_is_x_restricted(text) from public;
grant execute on function public.bozi_is_x_restricted(text) to authenticated;

drop function if exists public.bozi_blacklist_x_user(text,uuid,text);
drop function if exists public.bozi_blacklist_x_user_internal(text,uuid,text);

create or replace function public.bozi_admin_upsert_quest_v2(
  p_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
  p_quest_type text,
  p_x_action text,
  p_x_instructions text,
  p_x_max_winners integer,
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
  if not public.bozi_is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(trim(p_title),'') is null then
    raise exception 'Title required';
  end if;

  if nullif(trim(p_slug),'') is null then
    raise exception 'Slug required';
  end if;

  if p_quest_type not in ('educational','x') then
    raise exception 'Invalid quest type';
  end if;

  if p_status not in ('draft','published','archived') then
    raise exception 'Invalid status';
  end if;

  if p_quest_type = 'educational' then
    if p_x_action is not null or p_x_instructions is not null then
      raise exception 'Educational quests cannot have X campaign settings';
    end if;
  else
    if p_x_action <> 'post' then
      raise exception 'X quests support Post only';
    end if;
    if nullif(trim(p_x_instructions),'') is null then
      raise exception 'X Post quests require instructions';
    end if;
    if coalesce(p_x_max_winners,0) < 1 then
      raise exception 'Number of winners must be at least 1';
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
      select 1
      from public.bozi_reward_tokens
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
      quest_type,x_action,x_instructions,x_max_winners,
      reward_points_enabled,reward_points,
      reward_stablecoin_enabled,reward_stablecoin_symbol,reward_stablecoin_token_address,
      reward_stablecoin_decimals,reward_stablecoin_amount,reward_stablecoin_chain_id
    )
    values(
      lower(trim(p_slug)),trim(p_title),nullif(trim(p_summary),''),p_status,
      case when p_status='published' then now() else null end,auth.uid(),
      p_quest_type,
      case when p_quest_type='x' then p_x_action else null end,
      case when p_quest_type='x' then nullif(trim(p_x_instructions),'') else null end,
      case when p_quest_type='x' then greatest(p_x_max_winners,1) else 1 end,
      coalesce(p_reward_points_enabled,false),greatest(coalesce(p_reward_points,0),0),
      coalesce(p_reward_stablecoin_enabled,false),
      case when p_reward_stablecoin_enabled then nullif(trim(p_reward_stablecoin_symbol),'') else null end,
      case when p_reward_stablecoin_enabled then nullif(trim(p_reward_stablecoin_token_address),'') else null end,
      case when p_reward_stablecoin_enabled then p_reward_stablecoin_decimals else null end,
      case when p_reward_stablecoin_enabled then p_reward_stablecoin_amount else null end,
      case when p_reward_stablecoin_enabled then p_reward_stablecoin_chain_id else null end
    )
    returning id into v_id;
  else
    update public.bozi_quests
    set slug=lower(trim(p_slug)),
        title=trim(p_title),
        summary=nullif(trim(p_summary),''),
        status=p_status,
        published_at=case when p_status='published' then coalesce(published_at,now()) else null end,
        updated_at=now(),
        quest_type=p_quest_type,
        x_action=case when p_quest_type='x' then p_x_action else null end,
        x_instructions=case when p_quest_type='x' then nullif(trim(p_x_instructions),'') else null end,
        x_max_winners=case when p_quest_type='x' then greatest(p_x_max_winners,1) else 1 end,
        reward_points_enabled=coalesce(p_reward_points_enabled,false),
        reward_points=greatest(coalesce(p_reward_points,0),0),
        reward_stablecoin_enabled=coalesce(p_reward_stablecoin_enabled,false),
        reward_stablecoin_symbol=case when p_reward_stablecoin_enabled then nullif(trim(p_reward_stablecoin_symbol),'') else null end,
        reward_stablecoin_token_address=case when p_reward_stablecoin_enabled then nullif(trim(p_reward_stablecoin_token_address),'') else null end,
        reward_stablecoin_decimals=case when p_reward_stablecoin_enabled then p_reward_stablecoin_decimals else null end,
        reward_stablecoin_amount=case when p_reward_stablecoin_enabled then p_reward_stablecoin_amount else null end,
        reward_stablecoin_chain_id=case when p_reward_stablecoin_enabled then p_reward_stablecoin_chain_id else null end
    where id=p_id;

    if not found then
      raise exception 'Quest not found';
    end if;

    v_id:=p_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.bozi_admin_upsert_quest_v2(uuid,text,text,text,text,text,text,integer,boolean,integer,boolean,text,text,integer,numeric,bigint,text) from public;
grant execute on function public.bozi_admin_upsert_quest_v2(uuid,text,text,text,text,text,text,integer,boolean,integer,boolean,text,text,integer,numeric,bigint,text) to authenticated;

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
  already_claimed boolean,
  winners_count integer,
  max_winners integer
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
  v_winners integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_quest
  from public.bozi_quests
  where id=p_quest_id
    and status='published'
    and quest_type='x'
    and x_action='post';

  if not found then
    raise exception 'X Post quest is not available';
  end if;

  if p_action <> 'post' then
    raise exception 'Only X Post quests are supported';
  end if;

  if nullif(trim(p_post_id),'') is null or nullif(trim(p_post_url),'') is null then
    raise exception 'Post URL is required';
  end if;

  if public.bozi_is_x_restricted(p_x_user_id) then
    raise exception 'This X account is temporarily restricted from X campaigns';
  end if;

  select *
  into v_profile
  from public.bozi_profiles
  where user_id=v_user_id;

  if not found or v_profile.x_user_id is null or v_profile.x_user_id <> trim(p_x_user_id) then
    raise exception 'Connected X account does not match verification identity';
  end if;

  select *
  into v_claim
  from public.bozi_x_quest_claims
  where user_id=v_user_id
    and quest_id=p_quest_id
  for update;

  if found then
    return query
      select v_claim.id,v_claim.points_awarded,v_claim.stablecoin_enabled,
        v_claim.stablecoin_amount,v_claim.stablecoin_symbol,v_claim.payout_wallet,true,
        (select count(*)::integer from public.bozi_x_quest_claims where quest_id=p_quest_id and status='rewarded'),
        v_quest.x_max_winners;
    return;
  end if;

  -- Serialize winner allocation per quest so two simultaneous claims cannot
  -- both take the final winner slot.
  perform pg_advisory_xact_lock(hashtext('bozi:xquest:'||p_quest_id::text));

  select count(*)::integer
  into v_winners
  from public.bozi_x_quest_claims
  where quest_id=p_quest_id
    and status='rewarded';

  if v_winners >= v_quest.x_max_winners then
    raise exception 'All winners for this X Post quest have already been allocated';
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
    v_user_id,p_quest_id,trim(p_x_user_id),'post',trim(p_post_url),trim(p_post_id),'rewarded',
    v_points,v_quest.reward_stablecoin_enabled,v_quest.reward_stablecoin_symbol,
    v_quest.reward_stablecoin_token_address,v_quest.reward_stablecoin_decimals,
    v_quest.reward_stablecoin_amount,v_wallet,
    case when v_quest.reward_stablecoin_enabled then 'pending' else 'not_required' end,
    now(),now()
  )
  returning * into v_claim;

  if v_points > 0 then
    insert into public.bozi_points_ledger(user_id,source_type,source_id,points,description)
    values(v_user_id,'social_post',v_claim.id,v_points,'Verified X Post quest reward')
    on conflict (user_id,source_type,source_id) do nothing;
  end if;

  return query
    select v_claim.id,v_points,v_claim.stablecoin_enabled,v_claim.stablecoin_amount,
      v_claim.stablecoin_symbol,v_wallet,false,v_winners+1,v_quest.x_max_winners;
end;
$$;

revoke all on function public.bozi_claim_x_reward(uuid,text,text,text,text) from public;
grant execute on function public.bozi_claim_x_reward(uuid,text,text,text,text) to authenticated;

-- Remove old reward-state helper; the payout route can continue to settle the
-- stablecoin claim server-side without exposing a signer to the browser.
drop function if exists public.bozi_begin_x_payout(uuid);
