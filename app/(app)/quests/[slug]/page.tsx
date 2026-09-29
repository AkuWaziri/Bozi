"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";

type Quest = {
  id: string;
  slug?: string | null;
  title: string;
  category?: string | null;
  difficulty?: string | null;
  description?: string | null;
};

type Lesson = Record<string, unknown> & {
  id: string;
  title?: string | null;
  content?: string | null;
};

type Question = Record<string, unknown> & {
  id: string;
  question?: string | null;
  question_text?: string | null;
  options?: string[] | null;
};

export default function QuestDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [quest, setQuest] = useState<Quest | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(-1);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const bySlug = await supabase.from("bozi_quests").select("*").eq("slug", slug).maybeSingle();
      let questRow = bySlug.data;

      if (!questRow && !bySlug.error) {
        const byId = await supabase.from("bozi_quests").select("*").eq("id", slug).maybeSingle();
        questRow = byId.data;
      }

      if (!mounted) return;

      if (bySlug.error && bySlug.error.code !== "PGRST116") {
        setError(true);
        setLoading(false);
        return;
      }

      if (!questRow) {
        setLoading(false);
        return;
      }

      const lessonQuery = await supabase
        .from("bozi_lessons")
        .select("*")
        .eq("quest_id", questRow.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const lessonRow = lessonQuery.data;
      let questionRows: Question[] = [];

      if (lessonRow?.id) {
        const questionsQuery = await supabase
          .from("bozi_question_public")
          .select("*")
          .eq("lesson_id", lessonRow.id)
          .order("created_at", { ascending: true });

        if (questionsQuery.error) {
          setError(true);
          setLoading(false);
          return;
        }

        questionRows = (questionsQuery.data ?? []) as Question[];
      }

      if (!mounted) return;

      setQuest(questRow as Quest);
      setLesson(lessonRow as Lesson | null);
      setQuestions(questionRows);
      setStep(lessonRow ? -1 : questionRows.length ? 0 : -2);
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return <StateCard><Loader2 size={18} className="animate-spin" /> Loading quest…</StateCard>;
  }

  if (error) {
    return <StateCard>Unable to load this quest right now. Please try again.</StateCard>;
  }

  if (!quest) {
    return <StateCard>Quest not found.</StateCard>;
  }

  const lessonContent = lesson?.content;
  const currentQuestion = step >= 0 ? questions[step] : null;
  const questionText = currentQuestion?.question_text || currentQuestion?.question || "Question";
  const options = Array.isArray(currentQuestion?.options) ? currentQuestion.options : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:px-8 md:py-10">
      <Link href="/quests" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-white">
        <ArrowLeft size={15} /> Back to quests
      </Link>

      <div className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 md:p-8">
        <div className="flex items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <span>{quest.category || "Quest"}{quest.difficulty ? ` · ${quest.difficulty}` : ""}</span>
          <span>{questions.length ? `${Math.max(step, 0) + 1} / ${questions.length}` : ""}</span>
        </div>

        <h1 className="mt-5 text-2xl font-black md:text-3xl">{quest.title}</h1>
        {quest.description && <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{quest.description}</p>}

        {step === -2 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
            This quest has no published questions yet.
          </div>
        ) : step === -1 ? (
          <>
            <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]">
              <BookOpen size={15} /> Lesson
            </div>
            <article className="mt-4 whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-white/[.025] p-5 text-sm leading-7 text-[var(--muted)]">
              {lessonContent || "This lesson has not been published yet."}
            </article>
            <button
              onClick={() => setStep(questions.length ? 0 : -2)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black"
            >
              {questions.length ? "Start quiz" : "Done"} <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]">
              Question {step + 1}
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/[.025] p-5">
              <h2 className="text-lg font-bold">{questionText}</h2>
              <div className="mt-5 space-y-2">
                {options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelected(index)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${
                      selected === index
                        ? "border-[var(--lime)] bg-[var(--lime)]/10"
                        : "border-[var(--line)] hover:bg-white/[.03]"
                    }`}
                  >
                    <span>{option}</span>
                    {selected === index && <CheckCircle2 size={17} className="text-[var(--lime)]" />}
                  </button>
                ))}
              </div>
            </div>
            <button
              disabled={selected === null}
              onClick={() => { if (step < questions.length - 1) { setStep(step + 1); setSelected(null); } else { setStep(questions.length); } }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step < questions.length - 1 ? "Next question" : "Finish quiz"} <ArrowRight size={16} />
            </button>
          </>
        )}

        {step === questions.length && questions.length > 0 && (
          <div className="mt-5 rounded-2xl border border-[var(--lime)]/30 bg-[var(--lime)]/10 p-5">
            <p className="font-bold">Quiz completed.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Your answers are ready for server verification. Points are awarded only after the backend validates each answer.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-2"><Clock3 size={14} /> Learn at your pace</span>
          <span className="flex items-center gap-2"><LockKeyhole size={14} /> Browser never awards points</span>
        </div>
      </div>
    </div>
  );
}

function StateCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 text-sm text-[var(--muted)]">
        {children}
      </div>
    </div>
  );
}
