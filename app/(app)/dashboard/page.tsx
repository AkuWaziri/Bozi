"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Flame, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";

const previewQuests = [
  { title: "How stablecoins work", category: "Fundamentals", reward: 80, progress: "Start quest" },
  { title: "Inside a modern L2", category: "Ethereum", reward: 100, progress: "Start quest" },
  { title: "DeFi liquidity, explained", category: "DeFi", reward: 120, progress: "Start quest" },
];

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setEmail(data.session?.user.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return <div className="mx-auto max-w-7xl px-4 py-7 pb-24 md:px-8 md:py-10">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-medium text-[var(--muted)]">{email ? "Welcome back" : "Welcome to Bozi"}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Learn something useful today.</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Complete quests, prove what you learned, and build your points history.</p>
      </div>
      <Link href="/quests" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black">Explore quests <ArrowRight size={16}/></Link>
    </div>

    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat icon={Trophy} label="Total points" value="0" note="Start earning points" />
      <Stat icon={BookOpen} label="Quests completed" value="0" note="Your progress" />
      <Stat icon={Flame} label="GM streak" value="0" note="Optional activity" />
      <Stat icon={CheckCircle2} label="Rank" value="—" note="Leaderboard" />
    </div>

    <section className="mt-10">
      <div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Discover</p><h2 className="mt-1 text-2xl font-bold">Available quests</h2></div><Link href="/quests" className="text-sm font-semibold text-[var(--muted)]">View all</Link></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">{previewQuests.map((q) => <Link href="/quests/demo" key={q.title} className="group rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:-translate-y-0.5 hover:border-white/20">
        <div className="flex items-center justify-between"><span className="rounded-full bg-white/[.05] px-2.5 py-1 text-[11px] text-[var(--muted)]">{q.category}</span><span className="text-sm font-bold text-[var(--lime)]">+{q.reward}</span></div>
        <h3 className="mt-8 text-lg font-bold">{q.title}</h3><p className="mt-2 text-sm text-[var(--muted)]">Lesson, questions and an optional contribution task.</p>
        <div className="mt-6 border-t border-[var(--line)] pt-4 text-sm font-semibold group-hover:text-[var(--lime)]">{q.progress} →</div>
      </Link>)}</div>
    </section>

    <div className="mt-8 rounded-2xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
      <span className="font-semibold text-white">Bozi account.</span> {email ? <>Signed in as <span className="font-semibold text-white">{email}</span>. Your verified activity will build your points history.</> : "Your verified activity will build your points history."}
    </div>
  </div>;
}

function Stat({ icon: Icon, label, value, note }: { icon: typeof Trophy; label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4"><Icon size={18} className="text-[var(--lime)]"/><p className="mt-5 text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-[11px] text-[var(--muted)]">{note}</p></div>;
}
