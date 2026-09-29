"use client";

import { BookOpen, Flame, Trophy, ArrowRight, CheckCircle2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";

const quests=[
  {title:"How stablecoins actually work",project:"Crypto fundamentals",questions:8,points:80,tag:"Beginner",icon:"◉"},
  {title:"Inside a modern L2",project:"Ethereum ecosystem",questions:10,points:100,tag:"Intermediate",icon:"◇"},
  {title:"DeFi liquidity, explained",project:"DeFi",questions:12,points:120,tag:"Intermediate",icon:"✦"}
];

export default function Home(){
 const [session, setSession] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 useEffect(() => {
  let mounted = true;
  supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setLoading(false); } });
  const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
  return () => { mounted = false; listener.subscription.unsubscribe(); };
 }, []);
 const signOut = async () => { await supabase.auth.signOut(); };
 return <main className="min-h-screen">
  <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
   <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--lime)] text-sm font-black text-black">B</div><span className="text-xl font-bold tracking-tight">bozi</span></div>
   <div className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex"><a href="#quests" className="hover:text-white">Quests</a><a href="#how" className="hover:text-white">How it works</a><a href="#leaderboard" className="hover:text-white">Leaderboard</a></div>
   {!loading && session ? <div className="flex items-center gap-2"><Link href="/dashboard" className="rounded-full border border-[var(--line)] bg-white/[.04] px-4 py-2 text-sm font-semibold hover:bg-white/[.08]">Dashboard</Link><button onClick={signOut} className="rounded-full border border-[var(--line)] bg-white/[.04] px-4 py-2 text-sm font-semibold hover:bg-white/[.08]">Sign out</button></div> : <Link href="/auth" className="rounded-full border border-[var(--line)] bg-white/[.04] px-4 py-2 text-sm font-semibold hover:bg-white/[.08]">Sign in</Link>}
  </nav>

  <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.15fr_.85fr] md:px-8 md:pt-24">
   <div>
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/[.035] px-3 py-1.5 text-xs font-medium text-[var(--muted)]"><Sparkles size={13} className="text-[var(--lime)]"/> Crypto learning, with a reason to come back</div>
    <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.045em] md:text-7xl">Learn crypto.<br/><span className="text-[var(--lime)]">Earn points.</span></h1>
    <p className="mt-7 max-w-xl text-base leading-7 text-[var(--muted)] md:text-lg">Bozi turns crypto education into quests. Learn how projects work, prove what you know, contribute useful content, and build your reputation.</p>
    <div className="mt-9 flex flex-wrap gap-3"><Link href="/auth" className="flex items-center gap-2 rounded-xl bg-[var(--lime)] px-5 py-3.5 font-bold text-black">Start learning <ArrowRight size={17}/></Link><Link href="/auth" className="rounded-xl border border-[var(--line)] px-5 py-3.5 font-semibold">View quests</Link></div>
    <div className="mt-10 flex flex-wrap gap-6 text-sm text-[var(--muted)]"><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[var(--lime)]"/> 10 pts per correct answer</span><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[var(--cyan)]"/> 20 pts for verified X posts</span></div>
   </div>
   <div className="relative">
    <div className="absolute -inset-8 rounded-full bg-[var(--violet)]/10 blur-3xl"/>
    <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-5"><div><p className="text-xs uppercase tracking-[.16em] text-[var(--muted)]">Your progress</p><p className="mt-1 text-2xl font-bold">1,240 <span className="text-sm font-medium text-[var(--muted)]">pts</span></p></div><div className="rounded-xl bg-[var(--lime)]/10 p-3 text-[var(--lime)]"><Trophy size={21}/></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[var(--line)] bg-white/[.025] p-4"><Flame size={18} className="text-[var(--lime)]"/><p className="mt-3 text-2xl font-bold">7</p><p className="text-xs text-[var(--muted)]">day streak</p></div><div className="rounded-2xl border border-[var(--line)] bg-white/[.025] p-4"><BookOpen size={18} className="text-[var(--violet)]"/><p className="mt-3 text-2xl font-bold">12</p><p className="text-xs text-[var(--muted)]">quests done</p></div></div>
      <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white/[.025] p-4"><div className="flex justify-between text-xs"><span className="text-[var(--muted)]">Next rank</span><span className="font-semibold">Scholar</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[72%] rounded-full bg-[var(--lime)]"/></div><p className="mt-2 text-right text-xs text-[var(--muted)]">360 pts to go</p></div>
    </div>
   </div>
  </section>

  <section id="quests" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
   <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Explore</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Start with a quest</h2></div><a className="hidden text-sm font-semibold text-[var(--muted)] hover:text-white md:block" href="#">See all quests →</a></div>
   <div className="mt-7 grid gap-4 md:grid-cols-3">{quests.map(q=><article key={q.title} className="group rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:-translate-y-1 hover:border-white/20"><div className="flex items-center justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-white/[.05] text-lg">{q.icon}</div><span className="rounded-full bg-white/[.05] px-2.5 py-1 text-[11px] text-[var(--muted)]">{q.tag}</span></div><p className="mt-6 text-xs text-[var(--muted)]">{q.project}</p><h3 className="mt-1 text-lg font-bold leading-6">{q.title}</h3><div className="mt-6 flex items-center justify-between border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]"><span>{q.questions} questions</span><span className="font-bold text-[var(--lime)]">+{q.points} pts</span></div></article>)}</div>
  </section>

  <section id="how" className="border-y border-[var(--line)] bg-white/[.015]"><div className="mx-auto max-w-7xl px-5 py-20 md:px-8"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--violet)]">Simple by design</p><h2 className="mt-2 text-3xl font-bold">Learn something. Prove it. Get rewarded.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">{[["01","Learn","Read a focused lesson about a real crypto project or concept."],["02","Prove","Answer questions tied directly to what you just learned."],["03","Contribute","Write an original post, get it verified, and keep building your score."]].map(([n,t,d])=><div key={n} className="rounded-2xl border border-[var(--line)] p-6"><span className="text-xs font-bold text-[var(--lime)]">{n}</span><h3 className="mt-8 text-xl font-bold">{t}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{d}</p></div>)}</div></div></section>

  <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-sm text-[var(--muted)] md:flex-row md:items-center md:justify-between md:px-8"><div className="flex items-center gap-2 font-semibold text-white"><div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--lime)] text-xs font-black text-black">B</div>bozi</div><div className="flex items-center gap-2"><Users size={14}/> Built for people who want to actually understand crypto.</div></footer>
 </main>
}