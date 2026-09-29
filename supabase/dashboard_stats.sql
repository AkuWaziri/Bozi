create or replace function public.bozi_get_dashboard_stats()
returns table (
  total_points bigint,
  completed_quests bigint,
  gm_streak bigint,
  rank bigint
)
language sql
security definer
set search_path = public
as $$
  with current_user_data as (
    select auth.uid() as user_id
  ),
  totals as (
    select coalesce(sum(l.points), 0)::bigint as total_points
    from public.bozi_points_ledger l
    join current_user_data u on u.user_id = l.user_id
  ),
  quest_totals as (
    select
      q.id as quest_id,
      count(bq.id)::bigint as question_count
    from public.bozi_quests q
    join public.bozi_lessons bl on bl.quest_id = q.id
    left join public.bozi_questions bq on bq.lesson_id = bl.id
    where q.status = 'published'
    group by q.id
  ),
  quest_completed as (
    select count(*)::bigint as completed_quests
    from quest_totals qt
    where qt.question_count > 0
      and not exists (
        select 1
        from public.bozi_lessons bl
        join public.bozi_questions bq on bq.lesson_id = bl.id
        where bl.quest_id = qt.quest_id
          and not exists (
            select 1
            from public.bozi_quiz_attempts qa
            join current_user_data u on u.user_id = qa.user_id
            where qa.question_id = bq.id
              and qa.is_correct = true
          )
      )
  ),
  leaderboard as (
    select
      p.user_id,
      coalesce(sum(l.points), 0)::bigint as total_points
    from public.bozi_profiles p
    left join public.bozi_points_ledger l on l.user_id = p.user_id
    group by p.user_id
  ),
  ranked as (
    select
      user_id,
      dense_rank() over (order by total_points desc)::bigint as rank
    from leaderboard
  ),
  confirmed_gm_dates as (
    select distinct checkin_date
    from public.bozi_gm_checkins
    where user_id = (select user_id from current_user_data)
      and status = 'confirmed'
  ),
  gm_streak_calc as (
    select count(*)::bigint as gm_streak
    from confirmed_gm_dates d
    where d.checkin_date <= current_date
      and not exists (
        select 1
        from generate_series(
          d.checkin_date,
          current_date,
          interval '1 day'
        ) missing(day)
        where missing.day::date not in (
          select checkin_date from confirmed_gm_dates
        )
      )
  )
  select
    totals.total_points,
    quest_completed.completed_quests,
    coalesce((select gm_streak from gm_streak_calc), 0)::bigint as gm_streak,
    coalesce(ranked.rank, 0)::bigint as rank
  from totals
  cross join quest_completed
  left join current_user_data u on true
  left join ranked on ranked.user_id = u.user_id;
$$;

revoke all on function public.bozi_get_dashboard_stats() from public;
grant execute on function public.bozi_get_dashboard_stats() to authenticated;
