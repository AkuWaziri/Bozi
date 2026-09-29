-- Public leaderboard aggregate.
-- This exposes totals only, not individual ledger entries.

create or replace function public.bozi_get_leaderboard()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.display_name,
    p.avatar_url,
    coalesce(sum(l.points), 0)::bigint as total_points
  from public.bozi_profiles p
  left join public.bozi_points_ledger l
    on l.user_id = p.user_id
  group by p.user_id, p.display_name, p.avatar_url
  order by total_points desc, p.user_id;
$$;

revoke all on function public.bozi_get_leaderboard() from public;
grant execute on function public.bozi_get_leaderboard() to authenticated;
