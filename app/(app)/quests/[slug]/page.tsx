"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Coins, Loader2, LockKeyhole, Users } from "lucide-react";
import { useEffect,useState } from "react";
import { supabase } from "../../../../lib/supabase/client";

type Quest={id:string;title:string;summary:string|null;quest_type:"educational"|"x";x_action:"post"|"follow"|null;x_target_username:string|null;x_instructions:string|null;reward_points_enabled:boolean;reward_points:number;reward_stablecoin_enabled:boolean;reward_stablecoin_symbol:string|null;reward_stablecoin_amount:number|null};
type Lesson={id:string;title:string|null;content_md:string|null};
type Question={id:string;prompt:string;options:any;points:number};

export default function QuestDetail(){
 const {slug}=useParams<{slug:string}>();const [quest,setQuest]=useState<Quest|null>(null);const [lesson,setLesson]=useState<Lesson|null>(null);const [questions,setQuestions]=useState<Question[]>([]);
 const [step,setStep]=useState(-1);const [selected,setSelected]=useState<string|null>(null);const [feedback,setFeedback]=useState<{correct:boolean;points:number;duplicate:boolean}|null>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [xInput,setXInput]=useState("");const [reward,setReward]=useState<any>(null);

 useEffect(()=>{let mounted=true;(async()=>{const {data:q,error}=await supabase.from("bozi_quests").select("id,title,summary,quest_type,x_action,x_target_username,x_instructions,reward_points_enabled,reward_points,reward_stablecoin_enabled,reward_stablecoin_symbol,reward_stablecoin_amount").eq("slug",slug).eq("status","published").maybeSingle();if(!mounted)return;if(error||!q){setLoading(false);return}setQuest(q as Quest);if(q.quest_type==="educational"){const {data:l}=await supabase.from("bozi_lessons").select("id,title,content_md").eq("quest_id",q.id).order("position").limit(1).maybeSingle();if(l){setLesson(l as Lesson);const {data:qs}=await supabase.from("bozi_question_public").select("id,prompt,options,points").eq("lesson_id",l.id).order("position");setQuestions((qs??[]) as Question[]);}}setStep(q.quest_type==="educational"?-1:0);setLoading(false)})();return()=>{mounted=false}},[slug]);

 if(loading)return <StateCard><Loader2 size={18} className="animate-spin"/> Loading quest…</StateCard>;
 if(!quest)return <StateCard>Quest not found.</StateCard>;

 const options=Array.isArray(questions[step]?.options)?questions[step].options.map((o:any,i:number)=>({key:String(o?.key??String.fromCharCode(97+i)),label:String(o?.label??o?.text??o)})):[];

 async function answer(){
  const q=questions[step];if(!q||!selected)return;setBusy(true);const {data,error}=await supabase.rpc("bozi_submit_quiz_answer",{p_question_id:q.id,p_selected_option_key:selected});setBusy(false);if(error){setMessage(error.message);return}const r=Array.isArray(data)?data[0]:data;setFeedback({correct:Boolean(r?.is_correct),points:Number(r?.points_awarded??0),duplicate:Boolean(r?.already_answered)})}
 async function finishEducation(){
  setBusy(true);const {data,error}=await supabase.rpc("bozi_claim_educational_reward",{p_quest_id:quest.id});setBusy(false);if(error){setMessage(error.message);return}const r=Array.isArray(data)?data[0]:data;setReward(r);setStep(questions.length+1)}
 async function verifyX(){
  setBusy(true);setMessage("");const {data:{session}}=await supabase.auth.getSession();if(!session){setMessage("Please sign in again.");setBusy(false);return}
  const endpoint=quest.x_action==="follow"?"/api/x/quest/follow":"/api/x/quest/post";
  const response=await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({questId:quest.id,...(quest.x_action==="post"?{postUrl:xInput}:{})})});
  const r=await response.json().catch(()=>({}));setBusy(false);if(!response.ok){setMessage(r.error||"Verification failed.");return}if(r?.stablecoinEnabled&&r?.claimId)await processPayout(r.claimId);setReward(r);setStep(1);
 }

 return <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:px-8 md:py-10">
  <Link href="/quests" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={15}/> Back to quests</Link>
  <div className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 md:p-8">
   <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]">{quest.quest_type==="x"?<Users size={15}/>:<BookOpen size={15}/>} {quest.quest_type==="x"?`X Quest · ${quest.x_action==="follow"?"Follow":"Post"}`:"Educational Quest"}</div>
   <h1 className="mt-4 text-2xl font-black md:text-3xl">{quest.title}</h1><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{quest.summary||"Complete the verified requirements to earn the configured reward."}</p>
   <div className="mt-5 flex flex-wrap gap-2 text-xs">{quest.reward_points_enabled&&<span className="rounded-full border border-[var(--line)] px-3 py-1.5">+{quest.reward_points} pts</span>}{quest.reward_stablecoin_enabled&&<span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1.5"><Coins size={12}/>{quest.reward_stablecoin_amount} {quest.reward_stablecoin_symbol}</span>}</div>

   {quest.quest_type==="educational"&&step===-1&&<><div className="mt-8 rounded-2xl border border-[var(--line)] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]">Lesson</p><h2 className="mt-2 text-lg font-bold">{lesson?.title||"Lesson"}</h2><article className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{lesson?.content_md||"This lesson is not available yet."}</article></div><button onClick={()=>setStep(questions.length?0:questions.length+1)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black">{questions.length?"Start quiz":"Complete quest"}<ArrowRight size={16}/></button></>}

   {quest.quest_type==="educational"&&step>=0&&step<questions.length&&<><div className="mt-8 text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]">Question {step+1} / {questions.length}</div><div className="mt-4 rounded-2xl border border-[var(--line)] p-5"><h2 className="text-lg font-bold">{questions[step].prompt}</h2><div className="mt-5 space-y-2">{options.map(o=><button key={o.key} disabled={busy||!!feedback} onClick={()=>setSelected(o.key)} className={`flex w-full justify-between rounded-xl border px-4 py-3 text-left text-sm ${selected===o.key?"border-[var(--lime)] bg-[var(--lime)]/10":"border-[var(--line)]"}`}><span>{o.label}</span>{selected===o.key&&<CheckCircle2 size={17} className="text-[var(--lime)]"/>}</button>)}</div>{feedback&&<div className="mt-4 rounded-xl border border-[var(--line)] p-3 text-sm">{feedback.correct?`Correct · +${feedback.points} points`:"Not quite. No points were awarded."}{feedback.duplicate&&" Already answered."}</div>}<div className="mt-5 flex flex-wrap gap-2"><button disabled={!selected||busy||!!feedback} onClick={answer} className="rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black">{busy?"Verifying…":"Check answer"}</button>{feedback&&<button onClick={()=>{if(step<questions.length-1){setStep(step+1);setSelected(null);setFeedback(null)}else finishEducation()}} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-bold">{step<questions.length-1?"Next question":"Finish quest"}</button>}</div></div></>}

   {quest.quest_type==="educational"&&step===questions.length+1&&<RewardCard reward={reward} fallback="Educational quest completed."/>}

   {quest.quest_type==="x"&&step===0&&<div className="mt-8 rounded-2xl border border-[var(--violet)]/30 bg-[var(--violet)]/5 p-5"><p className="text-sm font-bold">{quest.x_action==="follow"?`Follow ${quest.x_target_username||"the campaign account"} on X`:"Publish an original X post"}</p><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{quest.x_instructions|| (quest.x_action==="follow"?"Follow the target account, then verify the relationship.":"Publish the required post, then submit its URL.")}</p>{quest.x_action==="post"&&<input value={xInput} onChange={e=>setXInput(e.target.value)} placeholder="https://x.com/username/status/..." className="mt-4 w-full rounded-xl border border-[var(--line)] bg-black/10 px-4 py-3 text-sm outline-none"/>}<button onClick={verifyX} disabled={busy||(quest.x_action==="post"&&!xInput.trim())} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black disabled:opacity-40">{busy?<><Loader2 size={16} className="animate-spin"/> Verifying…</>:quest.x_action==="follow"?"Verify follow":"Verify post"}</button></div>}

   {quest.quest_type==="x"&&step===1&&<RewardCard reward={reward} fallback="X action verified."/>}
   {message&&<p className="mt-4 rounded-xl border border-[var(--line)] p-3 text-sm text-red-300">{message}</p>}
   <div className="mt-8 flex items-center gap-4 text-xs text-[var(--muted)]"><span className="flex items-center gap-2"><LockKeyhole size={14}/> Server verified</span>{quest.quest_type==="x"&&<span>Violation can permanently restrict future X campaigns.</span>}</div>
  </div>
 </div>
}

function RewardCard({reward,fallback}:{reward:any;fallback:string}){return <div className="mt-8 rounded-2xl border border-[var(--lime)]/30 bg-[var(--lime)]/10 p-5"><p className="font-bold">{fallback}</p><div className="mt-3 space-y-1 text-sm">{Number(reward?.points_awarded??reward?.pointsAwarded??0)>0&&<p className="text-[var(--lime)]">+{Number(reward?.points_awarded??reward?.pointsAwarded??0)} Bozi points</p>}{Boolean(reward?.stablecoin_enabled??reward?.stablecoinEnabled)&&<p className="text-[var(--lime)]">{reward?.stablecoin_amount??reward?.stablecoinAmount} {reward?.stablecoin_symbol??reward?.stablecoinSymbol} stablecoin reward queued for onchain payout.</p>}</div></div>}
function StateCard({children}:{children:React.ReactNode}){return <div className="mx-auto max-w-3xl px-4 py-12"><div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 text-sm text-[var(--muted)]">{children}</div></div>}
