"use client";

import { BookOpen, Flame, Trophy, ArrowRight, CheckCircle2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";



export default function Home(){
 const [session, setSession] = useState<any>(null);
 const [loading, setLoading] = useState(true); const [stats,setStats]=useState<any>(null); const [liveQuests,setLiveQuests]=useState<any[]>([]);
 useEffect(() => {
  let mounted = true;
  supabase.auth.getSession().then(async ({ data }) => { if (mounted) { setSession(data.session); if(data.session){ const [{data:s},{data:q}]=await Promise.all([supabase.rpc("bozi_get_dashboard_stats"),supabase.from("bozi_quests").select("id,slug,title,summary,lesson_points,social_points,social_task_enabled").eq("status","published").order("created_at",{ascending:false}).limit(3)]); setStats(Array.isArray(s)?s[0]:s); setLiveQuests(q??[]); } setLoading(false); } });
  const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
  return () => { mounted = false; listener.subscription.unsubscribe(); };
 }, []);
 const signOut = async () => { await supabase.auth.signOut(); };
 return <main className="min-h-screen">
  <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
   <Link href="/" className="flex items-center gap-3"><img src="/bozi-logo.svg" alt="Bozi" className="h-10 w-10 object-contain" /><span className="text-xl font-bold tracking-tight">Bozi</span></Link>
   <div className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex"><a href="#quests" className="hover:text-white">Quests</a><a href="#how" className="hover:text-white">How it works</a><a href="#leaderboard" className="hover:text-white">Leaderboard</a></div>
   {!loading && session ? <div className="flex items-center gap-2"><Link href="/dashboard" className="rounded-full border border-[var(--line)] bg-white/[.04] px-4 py-2 text-sm font-semibold hover:bg-white/[.08]">Dashboard</Link><button onClick={signOut} className="rounded-full border border-[var(--line)] bg-white/[.04] px-4 py-2 text-sm font-semibold hover:bg-white/[.08]">Sign out</button></div> : <Link href="/auth" className="rounded-full border border-[var(--line)] bg-white/[.04] px-4 py-2 text-sm font-semibold hover:bg-white/[.08]">Sign in</Link>}
  </nav>

  <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.15fr_.85fr] md:px-8 md:pt-24">
   <div>
    <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.045em] md:text-7xl">Learn crypto.<br/><span className="text-[var(--lime)]">Contribute. Earn points.</span></h1>
    <p className="mt-7 max-w-xl text-base leading-7 text-[var(--muted)] md:text-lg">Bozi turns crypto education into quests. Learn how projects work, prove what you know, contribute useful content, and build your reputation. Earn Points.</p>
    <div className="mt-9 flex flex-wrap gap-3"><Link href="/auth" className="flex items-center gap-2 rounded-xl bg-[var(--lime)] px-5 py-3.5 font-bold text-black">Start learning <ArrowRight size={17}/></Link><Link href="/auth" className="rounded-xl border border-[var(--line)] px-5 py-3.5 font-semibold">View quests</Link></div>
   </div>
   <div className="relative">
    <div className="absolute -inset-8 rounded-full bg-[var(--violet)]/10 blur-3xl"/>
    <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-5"><div><p className="text-xs uppercase tracking-[.16em] text-[var(--muted)]">Your progress</p><p className="mt-1 text-2xl font-bold">{session ? Number(stats?.total_points ?? 0).toLocaleString() : "10"} <span className="text-sm font-medium text-[var(--muted)]">pts</span></p></div><div className="rounded-xl bg-[var(--lime)]/10 p-3 text-[var(--lime)]"><Trophy size={21}/></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[var(--line)] bg-white/[.025] p-4"><Flame size={18} className="text-[var(--lime)]"/><p className="mt-3 text-2xl font-bold">{session ? stats?.gm_streak ?? 0 : "50"}</p><p className="text-xs text-[var(--muted)]">{session ? "GM streak" : "GM reward"}</p></div><div className="rounded-2xl border border-[var(--line)] bg-white/[.025] p-4"><BookOpen size={18} className="text-[var(--violet)]"/><p className="mt-3 text-2xl font-bold">{session ? stats?.completed_quests ?? 0 : "10"}</p><p className="text-xs text-[var(--muted)]">{session ? "quests done" : "quiz reward"}</p></div></div>
      <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white/[.025] p-4"><div className="flex justify-between text-xs"><span className="text-[var(--muted)]">Verified learning</span><span className="font-semibold">{session ? "Rank #" + (stats?.rank ?? "—") : "Server verified"}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[72%] rounded-full bg-[var(--lime)]"/></div><p className="mt-2 text-right text-xs text-[var(--muted)]">360 pts to go</p></div>
    </div>
   </div>
  </section>

  <section id="quests" className="mx-auto max-w-7xl px-4 py-14 sm:px-5 md:px-8 md:py-16">
   <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]/80 p-5 shadow-2xl sm:p-7">
    <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--lime)]/10 blur-3xl"/>
    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
     <div className="min-w-0">
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lime)]/20 bg-[var(--lime)]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--lime)]"><BookOpen size={13}/> Explore</div>
      <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-.03em] sm:text-4xl">Start with a quest</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Learn something useful, prove what you know, and earn points.</p>
     </div>
     <Link href="/quests" className="inline-flex w-fit shrink-0 items-center rounded-xl border border-[var(--line)] bg-white/[.03] px-4 py-2.5 text-sm font-semibold transition hover:border-white/20 hover:bg-white/[.06]">See all quests <span className="ml-2">→</span></Link>
    </div>
    <div className="relative mt-7 grid gap-3 sm:gap-4 md:grid-cols-3">{liveQuests.map(q=><Link href={"/quests/"+q.slug} key={q.id} className="group min-w-0 rounded-2xl border border-[var(--line)] bg-black/10 p-5 transition hover:-translate-y-1 hover:border-white/20"><div className="flex items-center justify-between gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[.05]"><BookOpen size={18}/></div><span className="shrink-0 text-sm font-bold text-[var(--lime)]">+{Number(q.lesson_points||0)+Number(q.social_task_enabled?q.social_points||0:0)} pts</span></div><p className="mt-6 text-xs text-[var(--muted)]">Quest</p><h3 className="mt-1 break-words text-lg font-bold leading-6">{q.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--muted)]">{q.summary||"Lesson, quiz and contribution task."}</p></Link>) }</div>
   </div>
  </section>

  <section id="how" className="border-y border-[var(--line)] bg-white/[.015]"><div className="mx-auto max-w-7xl px-5 py-20 md:px-8"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--violet)]">Simple by design</p><h2 className="mt-2 text-3xl font-bold">Learn something. Prove it. Get rewarded.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">{[["01","Learn","Read a focused lesson about a real crypto project or concept."],["02","Prove","Answer questions tied directly to what you just learned."],["03","Contribute","Write an original post, get it verified, and keep building your score."]].map(([n,t,d])=><div key={n} className="rounded-2xl border border-[var(--line)] p-6"><span className="text-xs font-bold text-[var(--lime)]">{n}</span><h3 className="mt-8 text-xl font-bold">{t}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{d}</p></div>)}</div></div></section>

  <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-sm text-[var(--muted)] md:flex-row md:items-center md:justify-between md:px-8"><div className="flex items-center gap-2 font-semibold text-white"><img src="/bozi-logo.svg" alt="Bozi" className="h-8 w-8 object-contain" />Bozi</div><div className="flex items-center gap-2"><Users size={14}/> Built for the crypto enthuziast and contributors.</div></footer>
 </main>
}