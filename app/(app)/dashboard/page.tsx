"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Flame, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";

type Stats = {
  total_points: number;
  completed_quests: number;
  gm_streak: number;
  rank: number;
};

type Quest = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  lesson_points: number;
  social_points: number;
  social_task_enabled: boolean;
};

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!mounted) return;

      setEmail(user?.email ?? null);
      if (!user) {
        setStats(null);
        return;
      }

      const [{ data: statsData, error: statsError }, { data: questData }] =
        await Promise.all([
          supabase.rpc("bozi_get_dashboard_stats"),
          supabase
            .from("bozi_quests")
            .select("id, slug, title, summary, lesson_points, social_points, social_task_enabled")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

      if (!mounted) return;

      if (statsError) {
        setError(true);
      } else {
        const row = Array.isArray(statsData) ? statsData[0] : statsData;
        setStats((row ?? null) as Stats | null);
      }

      setQuests((questData ?? []) as Quest[]);
    }

    void load();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      if (!session?.user) setStats(null);
      else void load();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 pb-24 md:px-8 md:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">{email ? "Welcome back" : "Welcome to Bozi"}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Learn something useful today.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Complete quests, prove what you learned, and build your points history.</p>
        </div>
        <Link href="/quests" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black">
          Explore quests <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Trophy} label="Total points" value={stats ? stats.total_points.toLocaleString() : "—"} note={error ? "Points unavailable" : "Verified points earned"} />
        <Stat icon={BookOpen} label="Quests completed" value={stats ? stats.completed_quests.toLocaleString() : "—"} note="Fully completed quizzes" />
        <Stat icon={Flame} label="GM streak" value={stats ? stats.gm_streak.toLocaleString() : "—"} note="Confirmed GM activity" />
        <Stat icon={CheckCircle2} label="Rank" value={stats?.rank ? `#${stats.rank}` : "—"} note="Leaderboard position" />
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Discover</p><h2 className="mt-1 text-2xl font-bold">Available quests</h2></div>
          <Link href="/quests" className="text-sm font-semibold text-[var(--muted)]">View all</Link>
        </div>

        {quests.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">No published quests yet.</div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {quests.map((q) => (
              <Link href={`/quests/${q.slug}`} key={q.id} className="group rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:-translate-y-0.5 hover:border-white/20">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/[.05] px-2.5 py-1 text-[11px] text-[var(--muted)]">Quest</span>
                  <span className="text-sm font-bold text-[var(--lime)]">+{q.lesson_points + (q.social_task_enabled ? q.social_points : 0)}</span>
                </div>
                <h3 className="mt-8 text-lg font-bold">{q.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--muted)]">{q.summary || "Lesson, questions and an optional contribution task."}</p>
                <div className="mt-6 border-t border-[var(--line)] pt-4 text-sm font-semibold group-hover:text-[var(--lime)]">Start quest →</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 rounded-2xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
        <span className="font-semibold text-white">Bozi account.</span>{" "}
        {email ? <>Signed in as <span className="font-semibold text-white">{email}</span>. Your verified activity will build your points history.</> : "Your verified activity will build your points history."}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, note }: { icon: typeof Trophy; label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <Icon size={18} className="text-[var(--lime)]" />
      <p className="mt-5 text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{note}</p>
    </div>
  );
}
