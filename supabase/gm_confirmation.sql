create or replace function public.bozi_confirm_gm(
  p_network_id uuid,
  p_wallet_address text,
  p_tx_hash text,
  p_checkin_date date
)
returns table (
  confirmed boolean,
  points_awarded integer,
  already_recorded boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.bozi_gm_checkins%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_wallet_address is null or lower(p_wallet_address) = '' then
    raise exception 'Wallet address required';
  end if;

  select *
  into v_existing
  from public.bozi_gm_checkins
  where network_id = p_network_id
    and tx_hash = lower(p_tx_hash);

  if found then
    return query select
      (v_existing.status = 'confirmed'),
      v_existing.points_awarded,
      true;
    return;
  end if;

  if exists (
    select 1
    from public.bozi_gm_checkins
    where user_id = v_user_id
      and checkin_date = p_checkin_date
      and status = 'confirmed'
  ) then
    raise exception 'Already checked in today';
  end if;

  insert into public.bozi_gm_checkins (
    user_id,
    network_id,
    wallet_address,
    tx_hash,
    checkin_date,
    status,
    points_awarded,
    confirmed_at
  )
  values (
    v_user_id,
    p_network_id,
    lower(p_wallet_address),
    lower(p_tx_hash),
    p_checkin_date,
    'confirmed',
    50,
    now()
  );

  insert into public.bozi_points_ledger (
    user_id,
    source_type,
    source_id,
    points,
    description
  )
  select
    v_user_id,
    'gm',
    g.id,
    50,
    'Confirmed onchain GM'
  from public.bozi_gm_checkins g
  where g.network_id = p_network_id
    and g.tx_hash = lower(p_tx_hash)
  on conflict (user_id, source_type, source_id) do nothing;

  return query select true, 50, false;
end;
$$;

revoke all on function public.bozi_confirm_gm(uuid, text, text, date) from public;
grant execute on function public.bozi_confirm_gm(uuid, text, text, date) to authenticated;
