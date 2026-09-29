-- BOZI QUIZ SCORING
-- Run this in Supabase SQL Editor once.
-- The database function is the only place that can validate answers and award quiz points.

create or replace function public.bozi_submit_quiz_answer(
  p_question_id uuid,
  p_selected_option_key text
)
returns table (
  is_correct boolean,
  points_awarded integer,
  already_answered boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_question public.bozi_questions%rowtype;
  v_is_correct boolean;
  v_points integer := 0;
  v_existing public.bozi_quiz_attempts%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_question
  from public.bozi_questions q
  join public.bozi_lessons l on l.id = q.lesson_id
  join public.bozi_quests quest on quest.id = l.quest_id
  where q.id = p_question_id
    and quest.status = 'published';

  if not found then
    raise exception 'Question not found';
  end if;

  select *
  into v_existing
  from public.bozi_quiz_attempts
  where user_id = v_user_id
    and question_id = p_question_id;

  if found then
    return query select v_existing.is_correct, v_existing.points_awarded, true;
    return;
  end if;

  v_is_correct :=
    p_selected_option_key = v_question.correct_option_key;

  if v_is_correct then
    v_points := v_question.points;
  end if;

  insert into public.bozi_quiz_attempts (
    user_id,
    question_id,
    selected_option_key,
    is_correct,
    points_awarded
  )
  values (
    v_user_id,
    p_question_id,
    p_selected_option_key,
    v_is_correct,
    v_points
  );

  if v_is_correct and v_points <> 0 then
    insert into public.bozi_points_ledger (
      user_id,
      source_type,
      source_id,
      points,
      description
    )
    values (
      v_user_id,
      'quiz',
      p_question_id,
      v_points,
      'Correct quiz answer'
    )
    on conflict (user_id, source_type, source_id) do nothing;
  end if;

  return query select v_is_correct, v_points, false;
end;
$$;

revoke all on function public.bozi_submit_quiz_answer(uuid, text) from public;
grant execute on function public.bozi_submit_quiz_answer(uuid, text) to authenticated;
