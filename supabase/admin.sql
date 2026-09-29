-- Bozi admin controls. Run once in Supabase SQL Editor.
create or replace function public.bozi_is_admin()
returns boolean language sql security definer set search_path=public as $$
 select exists(select 1 from public.bozi_admins where user_id=auth.uid());
$$;
revoke all on function public.bozi_is_admin() from public;
grant execute on function public.bozi_is_admin() to authenticated;

create or replace function public.bozi_admin_list_quests()
returns setof public.bozi_quests language sql security definer set search_path=public as $$
 select q.* from public.bozi_quests q where public.bozi_is_admin() order by q.created_at desc;
$$;
revoke all on function public.bozi_admin_list_quests() from public;
grant execute on function public.bozi_admin_list_quests() to authenticated;

create or replace function public.bozi_admin_upsert_quest(p_id uuid,p_slug text,p_title text,p_summary text,p_lesson_points integer,p_social_points integer,p_social_task_enabled boolean,p_social_instructions text,p_status text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not public.bozi_is_admin() then raise exception 'Admin access required'; end if;
 if p_title is null or trim(p_title)='' then raise exception 'Title required'; end if;
 if p_slug is null or trim(p_slug)='' then raise exception 'Slug required'; end if;
 if p_status not in ('draft','published','archived') then raise exception 'Invalid status'; end if;
 if p_id is null then
  insert into public.bozi_quests(slug,title,summary,lesson_points,social_points,social_task_enabled,social_instructions,status,published_at,created_by)
  values(lower(trim(p_slug)),trim(p_title),nullif(trim(p_summary),''),greatest(coalesce(p_lesson_points,0),0),greatest(coalesce(p_social_points,20),0),coalesce(p_social_task_enabled,false),nullif(trim(p_social_instructions),''),p_status,case when p_status='published' then now() else null end,auth.uid())
  returning id into v_id;
 else
  update public.bozi_quests set slug=lower(trim(p_slug)),title=trim(p_title),summary=nullif(trim(p_summary),''),lesson_points=greatest(coalesce(p_lesson_points,0),0),social_points=greatest(coalesce(p_social_points,20),0),social_task_enabled=coalesce(p_social_task_enabled,false),social_instructions=nullif(trim(p_social_instructions),''),status=p_status,published_at=case when p_status='published' then coalesce(published_at,now()) else null end,updated_at=now() where id=p_id;
  if not found then raise exception 'Quest not found'; end if; v_id:=p_id;
 end if; return v_id;
end; $$;
revoke all on function public.bozi_admin_upsert_quest(uuid,text,text,text,integer,integer,boolean,text,text) from public;
grant execute on function public.bozi_admin_upsert_quest(uuid,text,text,text,integer,integer,boolean,text,text) to authenticated;

create or replace function public.bozi_admin_upsert_lesson(p_id uuid,p_quest_id uuid,p_position integer,p_title text,p_content_md text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not public.bozi_is_admin() then raise exception 'Admin access required'; end if;
 if not exists(select 1 from public.bozi_quests where id=p_quest_id) then raise exception 'Quest not found'; end if;
 if p_id is null then insert into public.bozi_lessons(quest_id,position,title,content_md) values(p_quest_id,greatest(p_position,1),trim(p_title),p_content_md) returning id into v_id;
 else update public.bozi_lessons set quest_id=p_quest_id,position=greatest(p_position,1),title=trim(p_title),content_md=p_content_md,updated_at=now() where id=p_id; if not found then raise exception 'Lesson not found'; end if; v_id:=p_id; end if;
 return v_id;
exception when unique_violation then raise exception 'A lesson already exists at that position for this quest';
end; $$;
revoke all on function public.bozi_admin_upsert_lesson(uuid,uuid,integer,text,text) from public;
grant execute on function public.bozi_admin_upsert_lesson(uuid,uuid,integer,text,text) to authenticated;

create or replace function public.bozi_admin_upsert_question(p_id uuid,p_lesson_id uuid,p_position integer,p_prompt text,p_options jsonb,p_correct_option_key text,p_explanation text,p_points integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not public.bozi_is_admin() then raise exception 'Admin access required'; end if;
 if jsonb_typeof(p_options)<>'array' or jsonb_array_length(p_options)<2 then raise exception 'At least two options required'; end if;
 if p_id is null then insert into public.bozi_questions(lesson_id,position,prompt,options,correct_option_key,explanation,points) values(p_lesson_id,greatest(p_position,1),trim(p_prompt),p_options,trim(p_correct_option_key),nullif(trim(p_explanation),''),greatest(coalesce(p_points,10),0)) returning id into v_id;
 else update public.bozi_questions set lesson_id=p_lesson_id,position=greatest(p_position,1),prompt=trim(p_prompt),options=p_options,correct_option_key=trim(p_correct_option_key),explanation=nullif(trim(p_explanation),''),points=greatest(coalesce(p_points,10),0),updated_at=now() where id=p_id; if not found then raise exception 'Question not found'; end if; v_id:=p_id; end if;
 return v_id;
exception when unique_violation then raise exception 'A question already exists at that position for this lesson';
end; $$;
revoke all on function public.bozi_admin_upsert_question(uuid,uuid,integer,text,jsonb,text,text,integer) from public;
grant execute on function public.bozi_admin_upsert_question(uuid,uuid,integer,text,jsonb,text,text,integer) to authenticated;

create or replace function public.bozi_admin_list_submissions()
returns table(id uuid,user_id uuid,quest_id uuid,post_url text,post_id text,status text,points_awarded integer,submitted_at timestamptz,reviewed_at timestamptz,display_name text,x_handle text)
language sql security definer set search_path=public as $$
 select s.id,s.user_id,s.quest_id,s.post_url,s.post_id,s.status,s.points_awarded,s.submitted_at,s.reviewed_at,p.display_name,p.x_handle
 from public.bozi_social_submissions s left join public.bozi_profiles p on p.user_id=s.user_id
 where public.bozi_is_admin() order by s.submitted_at desc limit 100;
$$;
revoke all on function public.bozi_admin_list_submissions() from public;
grant execute on function public.bozi_admin_list_submissions() to authenticated;

create or replace function public.bozi_admin_review_submission(p_submission_id uuid,p_status text,p_note text)
returns boolean language plpgsql security definer set search_path=public as $$
declare s public.bozi_social_submissions%rowtype;
begin
 if not public.bozi_is_admin() then raise exception 'Admin access required'; end if;
 if p_status not in ('approved','rejected') then raise exception 'Invalid status'; end if;
 select * into s from public.bozi_social_submissions where id=p_submission_id for update;
 if not found then raise exception 'Submission not found'; end if;
 if s.status='approved' and p_status='rejected' then raise exception 'Approved rewards cannot be revoked here'; end if;
 update public.bozi_social_submissions set status=p_status,reviewer=auth.uid(),note=nullif(trim(p_note),''),reviewed_at=now() where id=p_submission_id;
 return true;
end; $$;
revoke all on function public.bozi_admin_review_submission(uuid,text,text) from public;
grant execute on function public.bozi_admin_review_submission(uuid,text,text) to authenticated;
