"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";

type Quest = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  lesson_points: number;
  social_points: number;
  social_task_enabled: boolean;
};

export default function Quests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadQuests() {
      const { data, error: queryError } = await supabase
        .from("bozi_quests")
        .select("id, slug, title, summary, lesson_points, social_points, social_task_enabled")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      setLoading(false);

      if (queryError) {
        setError(true);
        return;
      }

      setQuests((data ?? []) as Quest[]);
    }

    void loadQuests();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:px-8 md:py-10">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Learn</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Quests</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Focused lessons followed by questions that test what you just learned.
      </p>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 size={16} className="animate-spin" /> Loading published quests…
        </div>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 text-sm text-[var(--muted)]">
          Quests are temporarily unavailable. Please try again shortly.
        </div>
      ) : quests.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--line)] p-8 text-sm text-[var(--muted)]">
          No published quests yet. Check back soon.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quests.map((quest) => (
            <Link
              href={`/quests/${quest.slug}`}
              key={quest.id}
              className="group rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--lime)]/10 text-[var(--lime)]">
                  <BookOpen size={18} />
                </div>
                <ArrowRight size={16} className="text-[var(--muted)] transition group-hover:text-[var(--lime)]" />
              </div>

              <p className="mt-5 text-xs font-semibold text-[var(--lime)]">
                {quest.lesson_points + (quest.social_task_enabled ? quest.social_points : 0)} points available
              </p>
              <h2 className="mt-1 text-lg font-bold">{quest.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                {quest.summary || "Open this quest to start the lesson and quiz."}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1"><Clock3 size={13} /> Lesson + quiz</span>
                {quest.social_task_enabled && <span>+ X task</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
