"use client";

import { useEffect, useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { FilePlus2, Plus, Save, ShieldCheck } from "lucide-react";
import { supabase } from "../../../lib/supabase/client";

type Quest = {
  id:string; slug:string; title:string; summary:string|null; status:string;
  quest_type:"educational"|"x"; x_action:"post"|null;
  x_instructions:string|null; x_max_winners:number;
  reward_points_enabled:boolean; reward_points:number;
  reward_stablecoin_enabled:boolean; reward_stablecoin_symbol:string|null;
  reward_stablecoin_token_address:string|null; reward_stablecoin_decimals:number|null;
  reward_stablecoin_amount:number|null; reward_stablecoin_chain_id:number|null;
};
type Lesson={id:string;quest_id:string;position:number;title:string;content_md:string};
type Question={id:string;lesson_id:string;position:number;prompt:string;options:any;correct_option_key:string;explanation:string|null;points:number};
type Token={chain_id:number;symbol:string;token_address:string;decimals:number};

const emptyQuest:Quest={
  id:"",slug:"new-quest",title:"New quest",summary:"",status:"draft",
  quest_type:"educational",x_action:null,x_instructions:"",x_max_winners:1,
  reward_points_enabled:true,reward_points:20,reward_stablecoin_enabled:false,
  reward_stablecoin_symbol:null,reward_stablecoin_token_address:null,reward_stablecoin_decimals:null,
  reward_stablecoin_amount:null,reward_stablecoin_chain_id:null
};

export default function Admin(){
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [quests,setQuests]=useState<Quest[]>([]);
  const [selected,setSelected]=useState<Quest|null>(null);
  const [lessons,setLessons]=useState<Lesson[]>([]);
  const [lesson,setLesson]=useState<Lesson|null>(null);
  const [questions,setQuestions]=useState<Question[]>([]);
  const [tokens,setTokens]=useState<Token[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data}=await supabase.rpc("bozi_is_admin");
    setAllowed(Boolean(data));
    if(data){await loadQuests();const {data:ts}=await supabase.from("bozi_reward_tokens").select("chain_id,symbol,token_address,decimals").eq("enabled",true);setTokens((ts??[]) as Token[]);}
  })()},[]);

  const loadQuests=async()=>{const {data,error}=await supabase.rpc("bozi_admin_list_quests");if(error)setMessage(error.message);else setQuests((data??[]) as Quest[])};
  const selectQuest=async(q:Quest)=>{setSelected(q);setLesson(null);setQuestions([]);const {data}=await supabase.rpc("bozi_admin_list_lessons",{p_quest_id:q.id});setLessons((data??[]) as Lesson[])};
  const saveQuest=async()=>{
    if(!selected)return;
    setBusy(true);setMessage("");
    const {data,error}=await supabase.rpc("bozi_admin_upsert_quest_v2",{
      p_id:selected.id||null,p_slug:selected.slug,p_title:selected.title,p_summary:selected.summary??"",
      p_quest_type:selected.quest_type,p_x_action:selected.quest_type==="x"?selected.x_action:null,
      p_x_instructions:selected.quest_type==="x"?selected.x_instructions:null,
      p_x_max_winners:selected.quest_type==="x"?Number(selected.x_max_winners):1,
      p_reward_points_enabled:selected.reward_points_enabled,p_reward_points:Number(selected.reward_points),
      p_reward_stablecoin_enabled:selected.reward_stablecoin_enabled,
      p_reward_stablecoin_symbol:selected.reward_stablecoin_symbol,
      p_reward_stablecoin_token_address:selected.reward_stablecoin_token_address,
      p_reward_stablecoin_decimals:selected.reward_stablecoin_decimals,
      p_reward_stablecoin_amount:selected.reward_stablecoin_amount==null?null:Number(selected.reward_stablecoin_amount),
      p_reward_stablecoin_chain_id:selected.reward_stablecoin_chain_id,
      p_status:selected.status
    });
    setMessage(error?error.message:"Quest saved.");
    if(!error){setSelected({...selected,id:String(data)});await loadQuests();}
    setBusy(false);
  };
  const newQuest=()=>{setSelected({...emptyQuest});setLessons([]);setLesson(null);setQuestions([])};
  const selectLesson=async(l:Lesson)=>{setLesson(l);const {data}=await supabase.rpc("bozi_admin_list_questions",{p_lesson_id:l.id});setQuestions((data??[]) as Question[])};
  const newLesson=()=>setLesson({id:"",quest_id:selected?.id||"",position:lessons.length+1,title:"New lesson",content_md:"# Lesson\n\nWrite the lesson here."});
  const saveLesson=async()=>{if(!selected||!lesson)return;setBusy(true);const {data,error}=await supabase.rpc("bozi_admin_upsert_lesson",{p_id:lesson.id||null,p_quest_id:selected.id,p_position:Number(lesson.position),p_title:lesson.title,p_content_md:lesson.content_md});setMessage(error?error.message:"Lesson saved.");if(!error){const {data:ls}=await supabase.rpc("bozi_admin_list_lessons",{p_quest_id:selected.id});setLessons((ls??[]) as Lesson[]);if(data)setLesson({...lesson,id:String(data)})}setBusy(false)};
  const saveQuestion=async(q:Question)=>{if(!lesson)return;setBusy(true);const {data,error}=await supabase.rpc("bozi_admin_upsert_question",{p_id:q.id||null,p_lesson_id:lesson.id,p_position:Number(q.position),p_prompt:q.prompt,p_options:q.options,p_correct_option_key:q.correct_option_key,p_explanation:q.explanation??"",p_points:Number(q.points)});setMessage(error?error.message:"Question saved.");if(!error){const {data:qs}=await supabase.rpc("bozi_admin_list_questions",{p_lesson_id:lesson.id});setQuestions((qs??[]) as Question[])}setBusy(false)};

  if(allowed===null)return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[var(--muted)]">Checking admin access…</div>;
  if(!allowed)return <div className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-3xl font-black">Admin</h1><p className="mt-3 text-sm text-[var(--muted)]">This account is not authorized for Bozi administration.</p></div>;

  return <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:px-8 md:py-10">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--violet)]">Operations</p><h1 className="mt-2 text-3xl font-black">Quest studio</h1><p className="mt-2 text-sm text-[var(--muted)]">Configure educational and X campaigns with independent points and stablecoin rewards.</p></div>
      <button onClick={newQuest} className="inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black"><Plus size={16}/> New quest</button>
    </div>
    {message&&<div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 text-xs text-[var(--muted)]">{message}</div>}

    <div className="mt-8 grid gap-5 xl:grid-cols-[300px_1fr]">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <div className="flex items-center justify-between"><h2 className="font-bold">Quests</h2><FilePlus2 size={17}/></div>
        <div className="mt-4 space-y-2">{quests.map(q=><button key={q.id} onClick={()=>selectQuest(q)} className={"w-full rounded-xl border p-3 text-left "+(selected?.id===q.id?"border-[var(--lime)] bg-[var(--lime)]/5":"border-[var(--line)]")}><p className="truncate text-sm font-semibold">{q.title}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{q.quest_type==="x"?"X Quest":"Educational"} · {q.status}</p></button>)}</div>
      </section>

      <section className="space-y-5">
        {selected ? <>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Title"><Input value={selected.title} onChange={e=>setSelected({...selected,title:e.target.value})}/></Field>
              <Field label="Slug"><Input value={selected.slug} onChange={e=>setSelected({...selected,slug:e.target.value})}/></Field>
              <Field label="Quest type"><Select value={selected.quest_type} onChange={e=>{const type=e.target.value as Quest["quest_type"];setSelected({...selected,quest_type:type,x_action:type==="x"?"post":null,x_instructions:type==="x"?selected.x_instructions:null,x_max_winners:type==="x"?selected.x_max_winners:1})}}><option value="educational">Educational Quest</option><option value="x">X Quest</option></Select></Field>
              <Field label="Status"><Select value={selected.status} onChange={e=>setSelected({...selected,status:e.target.value})}><option>draft</option><option>published</option><option>archived</option></Select></Field>
            </div>
            <Field label="Summary"><TextArea value={selected.summary??""} onChange={e=>setSelected({...selected,summary:e.target.value})}/></Field>

            {selected.quest_type==="x" && <div className="mt-5 rounded-2xl border border-[var(--violet)]/30 bg-[var(--violet)]/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--violet)]">X Post campaign</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Action"><Input value="Post" disabled/></Field>
                <Field label="Number of winners"><Input type="number" min="1" step="1" value={selected.x_max_winners} onChange={e=>setSelected({...selected,x_max_winners:Math.max(1,Number(e.target.value)||1)})}/></Field>
              </div>
              <Field label="Post requirements"><TextArea value={selected.x_instructions??""} onChange={e=>setSelected({...selected,x_instructions:e.target.value})}/></Field>
              <p className="mt-2 text-xs text-[var(--muted)]">The first verified participants up to the winner limit receive the configured reward.</p>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--lime)]/25 bg-[var(--lime)]/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]">Reward configuration</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] p-3 text-sm"><input type="checkbox" checked={selected.reward_points_enabled} onChange={e=>setSelected({...selected,reward_points_enabled:e.target.checked})}/> Bozi points</label>
                <Field label="Points amount"><Input type="number" min="0" value={selected.reward_points} disabled={!selected.reward_points_enabled} onChange={e=>setSelected({...selected,reward_points:Number(e.target.value)})}/></Field>
                <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] p-3 text-sm"><input type="checkbox" checked={selected.reward_stablecoin_enabled} onChange={e=>setSelected({...selected,reward_stablecoin_enabled:e.target.checked})}/> Stablecoin reward</label>
                <Field label="Token"><Select disabled={!selected.reward_stablecoin_enabled} value={selected.reward_stablecoin_token_address??""} onChange={e=>{const t=tokens.find(x=>x.token_address.toLowerCase()===e.target.value.toLowerCase());setSelected({...selected,reward_stablecoin_token_address:t?.token_address??null,reward_stablecoin_symbol:t?.symbol??null,reward_stablecoin_decimals:t?.decimals??null,reward_stablecoin_chain_id:t?.chain_id??null})}}><option value="">Select allowlisted token</option>{tokens.map(t=><option key={t.chain_id+":"+t.token_address} value={t.token_address}>{t.symbol} · chain {t.chain_id}</option>)}</Select></Field>
                <Field label="Stablecoin amount"><Input type="number" min="0" step="0.000001" disabled={!selected.reward_stablecoin_enabled} value={selected.reward_stablecoin_amount??""} onChange={e=>setSelected({...selected,reward_stablecoin_amount:e.target.value===""?null:Number(e.target.value)})}/></Field>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">Stablecoin payouts require a participant wallet and are released only after server verification.</p>
            </div>

            <button onClick={saveQuest} disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black"><Save size={15}/> Save quest</button>
          </div>

          {selected.quest_type==="educational" && <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold">Lessons</h2><button onClick={newLesson} disabled={!selected.id} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-bold">Add lesson</button></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">{lessons.map(l=><button key={l.id} onClick={()=>selectLesson(l)} className={"rounded-xl border p-3 text-left "+(lesson?.id===l.id?"border-[var(--violet)]":"border-[var(--line)]")}><span className="text-[10px] text-[var(--muted)]">Lesson {l.position}</span><p className="mt-1 text-sm font-semibold">{l.title}</p></button>)}</div>
            {lesson&&<div className="mt-5 border-t border-[var(--line)] pt-5"><div className="grid gap-3 md:grid-cols-[80px_1fr]"><Field label="Pos"><Input type="number" value={lesson.position} onChange={e=>setLesson({...lesson,position:Number(e.target.value)})}/></Field><Field label="Title"><Input value={lesson.title} onChange={e=>setLesson({...lesson,title:e.target.value})}/></Field></div><Field label="Markdown lesson"><TextArea className="min-h-48" value={lesson.content_md} onChange={e=>setLesson({...lesson,content_md:e.target.value})}/></Field><button onClick={saveLesson} disabled={busy||!selected.id} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold">Save lesson</button></div>}
          </div>}

          {selected.quest_type==="educational" && lesson?.id&&<div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold">Questions</h2><button onClick={()=>setQuestions([...questions,{id:"",lesson_id:lesson.id,position:questions.length+1,prompt:"New question",options:[{key:"a",label:"Option A"},{key:"b",label:"Option B"}],correct_option_key:"a",explanation:"",points:10}])} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-bold">Add question</button></div>
            <div className="mt-4 space-y-4">{questions.map((q,i)=><QuestionEditor key={q.id||"new-"+i} q={q} onChange={next=>setQuestions(questions.map((x,j)=>j===i?next:x))} onSave={()=>saveQuestion(q)} busy={busy}/>)}</div>
          </div>}
        </> : <div className="rounded-2xl border border-dashed border-[var(--line)] p-10 text-sm text-[var(--muted)]">Select a quest or create a new one.</div>}
      </section>
    </div>
    <div className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={15} className="text-[var(--lime)]"/> A deleted rewarded X post triggers a 7-day X campaign restriction. Educational quests and GM Streak remain available.</div>
  </div>;
}

function Field({label,children}:{label:string;children:ReactNode}){return <label className="block text-xs font-semibold text-[var(--muted)]">{label}<div className="mt-2">{children}</div></label>}
function Input(p:InputHTMLAttributes<HTMLInputElement>){return <input {...p} className={"w-full rounded-xl border border-[var(--line)] bg-black/10 px-3 py-2.5 text-sm outline-none "+(p.className??"")}/>}
function TextArea(p:TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea {...p} className={"w-full rounded-xl border border-[var(--line)] bg-black/10 px-3 py-2.5 text-sm outline-none "+(p.className??"")}/>}
function Select(p:SelectHTMLAttributes<HTMLSelectElement>){return <select {...p} className="w-full rounded-xl border border-[var(--line)] bg-black/10 px-3 py-2.5 text-sm outline-none"/>}
function QuestionEditor({q,onChange,onSave,busy}:{q:Question;onChange:(q:Question)=>void;onSave:()=>void;busy:boolean}){
 const options=Array.isArray(q.options)?q.options:[];
 return <div className="rounded-xl border border-[var(--line)] p-4">
  <div className="grid gap-3 md:grid-cols-[70px_1fr_90px]"><Field label="Pos"><Input type="number" value={q.position} onChange={(e:any)=>onChange({...q,position:Number(e.target.value)})}/></Field><Field label="Prompt"><Input value={q.prompt} onChange={(e:any)=>onChange({...q,prompt:e.target.value})}/></Field><Field label="Points"><Input type="number" value={q.points} onChange={(e:any)=>onChange({...q,points:Number(e.target.value)})}/></Field></div>
  <div className="mt-3 grid gap-2 md:grid-cols-2">{options.map((o:any,i:number)=><div key={i} className="flex gap-2"><Input value={o.label??o.text??String(o)} onChange={(e:any)=>{const next=options.slice();next[i]={...next[i],key:next[i]?.key||String.fromCharCode(97+i),label:e.target.value};onChange({...q,options:next})}}/><button onClick={()=>onChange({...q,correct_option_key:options[i]?.key||String.fromCharCode(97+i)})} className={"rounded-lg px-3 text-xs font-bold "+(q.correct_option_key===(options[i]?.key||String.fromCharCode(97+i))?"bg-[var(--lime)] text-black":"border border-[var(--line)]")}>Correct</button></div>)}</div>
  <div className="mt-3"><Field label="Explanation"><TextArea value={q.explanation??""} onChange={(e:any)=>onChange({...q,explanation:e.target.value})}/></Field></div>
  <button onClick={onSave} disabled={busy} className="mt-3 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-bold">Save question</button>
 </div>
}
