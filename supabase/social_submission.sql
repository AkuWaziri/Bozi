create or replace function public.bozi_submit_social_post(
  p_quest_id uuid,p_post_url text,p_post_id text,p_x_author_id text
)
returns table(approved boolean,points_awarded integer,already_submitted boolean)
language plpgsql security definer set search_path=public as $$
declare
 v_user_id uuid:=auth.uid(); v_quest public.bozi_quests%rowtype; v_profile public.bozi_profiles%rowtype; v_submission public.bozi_social_submissions%rowtype; v_points integer;
begin
 if v_user_id is null then raise exception 'Not authenticated'; end if;
 if p_quest_id is null then raise exception 'Quest is required'; end if;
 if p_post_url is null or trim(p_post_url)='' then raise exception 'Post URL is required'; end if;
 if p_post_id is null or trim(p_post_id)='' then raise exception 'Post ID is required'; end if;
 if p_x_author_id is null or trim(p_x_author_id)='' then raise exception 'X author ID is required'; end if;

 select * into v_quest from public.bozi_quests where id=p_quest_id and status='published';
 if not found or not v_quest.social_task_enabled then raise exception 'Social task is not available'; end if;

 select * into v_profile from public.bozi_profiles where user_id=v_user_id;
 if not found or v_profile.x_user_id is null then raise exception 'Connect your X account before submitting a post'; end if;
 if v_profile.x_user_id<>p_x_author_id then raise exception 'The submitted post is not from your connected X account'; end if;

 select * into v_submission from public.bozi_social_submissions where user_id=v_user_id and quest_id=p_quest_id and status='approved' order by submitted_at desc limit 1;
 if found then return query select true,v_submission.points_awarded,true; return; end if;

 if exists(select 1 from public.bozi_social_submissions where post_id=p_post_id and status='approved') then raise exception 'This X post has already been rewarded'; end if;

 if exists(select 1 from public.bozi_social_submissions where user_id=v_user_id and status='approved' and submitted_at>=date_trunc('day',now() at time zone 'utc') and submitted_at<date_trunc('day',now() at time zone 'utc')+interval '1 day') then
  raise exception 'You have already earned the social-post reward today';
 end if;

 v_points:=coalesce(v_quest.social_points,20);
 insert into public.bozi_social_submissions(user_id,quest_id,post_url,post_id,status,points_awarded,submitted_at,reviewed_at)
 values(v_user_id,p_quest_id,trim(p_post_url),trim(p_post_id),'approved',v_points,now(),now()) returning * into v_submission;

 insert into public.bozi_points_ledger(user_id,source_type,source_id,points,description)
 values(v_user_id,'social_post',v_submission.id,v_points,'Verified X post')
 on conflict (user_id,source_type,source_id) do nothing;

 return query select true,v_points,false;
end; $$;

revoke all on function public.bozi_submit_social_post(uuid,text,text,text) from public;
grant execute on function public.bozi_submit_social_post(uuid,text,text,text) to authenticated;
