"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Coins, Loader2, Users } from "lucide-react";
import { useEffect,useState } from "react";
import { supabase } from "../../../lib/supabase/client";

type Quest={id:string;slug:string;title:string;summary:string|null;quest_type:"educational"|"x";x_action:"post"|null;reward_points_enabled:boolean;reward_points:number;reward_stablecoin_enabled:boolean;reward_stablecoin_symbol:string|null;reward_stablecoin_amount:number|null};

export default function Quests(){
 const [quests,setQuests]=useState<Quest[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);
 useEffect(()=>{let mounted=true;(async()=>{const {data,error}=await supabase.from("bozi_quests").select("id,slug,title,summary,quest_type,x_action,reward_points_enabled,reward_points,reward_stablecoin_enabled,reward_stablecoin_symbol,reward_stablecoin_amount").eq("status","published").order("created_at",{ascending:false});if(!mounted)return;setLoading(false);if(error){setError(true);return}setQuests((data??[]) as Quest[])})();return()=>{mounted=false}},[]);
 return <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:px-8 md:py-10">
  <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Earn while you learn</p><h1 className="mt-2 text-3xl font-black tracking-tight">Quests</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Complete verified educational challenges and X campaigns. Every reward is configured and enforced server-side.</p>
  {loading?<div className="mt-10 flex items-center gap-2 text-sm text-[var(--muted)]"><Loader2 size={16} className="animate-spin"/> Loading published quests…</div>:error?<div className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 text-sm text-[var(--muted)]">Quests are temporarily unavailable. Please try again shortly.</div>:quests.length===0?<div className="mt-10 rounded-2xl border border-dashed border-[var(--line)] p-8 text-sm text-[var(--muted)]">No published quests yet.</div>:
  <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{quests.map(q=><Link href={`/quests/${q.slug}`} key={q.id} className="group rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 hover:border-white/20">
   <div className="flex items-center justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl ${q.quest_type==="x"?"bg-[var(--violet)]/10 text-[var(--violet)]":"bg-[var(--lime)]/10 text-[var(--lime)]"}`}>{q.quest_type==="x"?<Users size={18}/>:<BookOpen size={18}/>}</div><ArrowRight size={16} className="text-[var(--muted)] transition group-hover:text-[var(--lime)]"/></div>
   <div className="mt-5 flex items-center gap-2 text-xs font-bold"><span className={q.quest_type==="x"?"text-[var(--violet)]":"text-[var(--lime)]"}>{q.quest_type==="x"?"X Quest":"Educational Quest"}</span>{q.quest_type==="x"&&<span className="text-[var(--muted)]">· Post</span>}</div>
   <h2 className="mt-2 text-lg font-bold">{q.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{q.summary||"Open this quest to see the requirements."}</p>
   <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4 text-xs">{q.reward_points_enabled&&<span className="rounded-full border border-[var(--line)] px-2.5 py-1">+{q.reward_points} pts</span>}{q.reward_stablecoin_enabled&&<span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2.5 py-1"><Coins size={12}/>{q.reward_stablecoin_amount} {q.reward_stablecoin_symbol}</span>}</div>
  </Link>)}</div>}
 </div>
}
