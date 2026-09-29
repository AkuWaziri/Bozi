"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";

type Quest = { id: string; title: string; slug?: string | null; category?: string | null; difficulty?: string | null; description?: string | null; summary?: string | null; social_task_enabled?: boolean; social_instructions?: string | null; social_points?: number };
type Lesson = { id: string; title?: string | null; content_md?: string | null; content?: string | null };
type Question = { id: string; prompt?: string | null; question?: string | null; options?: unknown; points?: number };

export default function QuestDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(-1);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number; duplicate: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [socialUrl, setSocialUrl] = useState("");
  const [socialSubmitting, setSocialSubmitting] = useState(false);
  const [socialResult, setSocialResult] = useState<{ points: number; already: boolean } | null>(null);
  const [socialError, setSocialError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const first = await supabase.from("bozi_quests").select("*").eq("slug", slug).maybeSingle();
      let q = first.data;
      if (!q && !first.error) q = (await supabase.from("bozi_quests").select("*").eq("id", slug).maybeSingle()).data;
      if (!mounted) return;
      if (first.error && first.error.code !== "PGRST116") { setError(true); setLoading(false); return; }
      if (!q) { setLoading(false); return; }

      const lessonResult = await supabase.from("bozi_lessons").select("*").eq("quest_id", q.id).order("position").limit(1).maybeSingle();
      const l = lessonResult.data;
      let qs: Question[] = [];
      if (l) {
        const result = await supabase.from("bozi_question_public").select("*").eq("lesson_id", l.id).order("position");
        if (result.error) { setError(true); setLoading(false); return; }
        qs = (result.data ?? []) as Question[];
      }
      if (!mounted) return;
      setQuest(q as Quest);
      setLesson(l as Lesson | null);
      setQuestions(qs);
      setStep(l ? -1 : qs.length ? 0 : -2);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [slug]);

  if (loading) return <StateCard><Loader2 size={18} className="animate-spin" /> Loading quest…</StateCard>;
  if (error) return <StateCard>Unable to load this quest right now. Please try again.</StateCard>;
  if (!quest) return <StateCard>Quest not found.</StateCard>;

  const q = step >= 0 ? questions[step] : null;
  const rawOptions = Array.isArray(q?.options) ? q.options : [];
  const options = rawOptions.map((item, index) => {
    if (item && typeof item === "object") {
      const x = item as Record<string, unknown>;
      return { key: String(x.key ?? x.id ?? String.fromCharCode(97 + index)), label: String(x.label ?? x.text ?? x.value ?? x.key ?? "") };
    }
    return { key: String.fromCharCode(97 + index), label: String(item ?? "") };
  });

  async function checkAnswer() {
    if (!q || !selected) return;
    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc("bozi_submit_quiz_answer", {
      p_question_id: q.id,
      p_selected_option_key: selected,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(true);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    setFeedback({
      correct: Boolean(result?.is_correct),
      points: Number(result?.points_awarded ?? 0),
      duplicate: Boolean(result?.already_answered),
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:px-8 md:py-10">
      <Link href="/quests" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-white"><ArrowLeft size={15} /> Back to quests</Link>
      <div className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 md:p-8">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]"><span>{quest.category || "Quest"}{quest.difficulty ? ` · ${quest.difficulty}` : ""}</span><span>{questions.length && step >= 0 ? `${step + 1} / ${questions.length}` : ""}</span></div>
        <h1 className="mt-5 text-2xl font-black md:text-3xl">{quest.title}</h1>
        {quest.description && <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{quest.description}</p>}

        {step === -2 && <div className="mt-8 rounded-2xl border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">This quest has no published questions yet.</div>}

        {step === -1 && (
          <>
            <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]"><BookOpen size={15} /> {lesson?.title || "Lesson"}</div>
            <article className="mt-4 whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-white/[.025] p-5 text-sm leading-7 text-[var(--muted)]">{lesson?.content_md || lesson?.content || "This lesson has not been published yet."}</article>
            <button onClick={() => setStep(questions.length ? 0 : -2)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black">{questions.length ? "Start quiz" : "Done"} <ArrowRight size={16} /></button>
          </>
        )}

        {step >= 0 && step < questions.length && q && (
          <>
            <div className="mt-6 text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]">Question {step + 1}</div>
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/[.025] p-5">
              <h2 className="text-lg font-bold">{q.prompt || q.question}</h2>
              <div className="mt-5 space-y-2">
                {options.map((option) => <button key={option.key} disabled={submitting || feedback !== null} onClick={() => setSelected(option.key)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${selected === option.key ? "border-[var(--lime)] bg-[var(--lime)]/10" : "border-[var(--line)] hover:bg-white/[.03]"}`}><span>{option.label}</span>{selected === option.key && <CheckCircle2 size={17} className="text-[var(--lime)]" />}</button>)}
              </div>
            </div>

            {feedback && <div className={`mt-4 rounded-2xl border p-4 text-sm ${feedback.correct ? "border-[var(--lime)]/30 bg-[var(--lime)]/10" : "border-[var(--line)] bg-white/[.025]"}`}><p className="font-bold">{feedback.correct ? `Correct · +${feedback.points} points` : "Not quite"}</p><p className="mt-1 text-[var(--muted)]">{feedback.duplicate ? "Already submitted. No additional points were awarded." : feedback.correct ? "Your answer was verified on the server." : "No points were awarded."}</p></div>}

            <button disabled={selected === null || submitting || feedback !== null} onClick={checkAnswer} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">{submitting ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Check answer"}{!submitting && !feedback && <ArrowRight size={16} />}</button>

            {feedback && <button onClick={() => { if (step < questions.length - 1) { setStep(step + 1); setSelected(null); setFeedback(null); } else { setStep(questions.length); } }} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold">{step < questions.length - 1 ? "Next question" : "Finish quiz"} <ArrowRight size={16} /></button>}
          </>
        )}

        {step === questions.length && questions.length > 0 && (
  <div className="mt-5 rounded-2xl border border-[var(--lime)]/30 bg-[var(--lime)]/10 p-5">
    <p className="font-bold">Quiz completed.</p>
    <p className="mt-1 text-sm text-[var(--muted)]">Correct answers have been verified server-side and credited to your Bozi points ledger.</p>
  </div>
)}

{step === questions.length && quest.social_task_enabled && (
  <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/[.025] p-5">
    <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]">X task · +{quest.social_points ?? 20} points</p>
    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
      {quest.social_instructions || "Write an original X post about what you learned in this quest, then submit the post URL."}
    </p>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input
        value={socialUrl}
        onChange={(e) => { setSocialUrl(e.target.value); setSocialError(""); }}
        placeholder="https://x.com/username/status/..."
        className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-black/10 px-4 py-3 text-sm outline-none focus:border-[var(--lime)]"
        disabled={socialSubmitting || socialResult !== null}
      />
      <button
        disabled={!socialUrl.trim() || socialSubmitting || socialResult !== null}
        onClick={async () => {
          setSocialSubmitting(true);
          setSocialError("");
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            setSocialError("Please sign in again.");
            setSocialSubmitting(false);
            return;
          }
          const response = await fetch("/api/social/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ questId: quest.id, postUrl: socialUrl.trim() }),
          });
          const result = await response.json().catch(() => ({}));
          setSocialSubmitting(false);
          if (!response.ok) {
            setSocialError(result.error || "Unable to verify this post.");
            return;
          }
          setSocialResult({ points: Number(result.pointsAwarded || 0), already: Boolean(result.alreadySubmitted) });
        }}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {socialSubmitting ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify post"}
      </button>
    </div>
    {socialError && <p className="mt-3 text-sm text-red-400">{socialError}</p>}
    {socialResult && (
      <p className="mt-3 text-sm text-[var(--lime)]">
        {socialResult.already ? "This post was already rewarded." : `Verified · +${socialResult.points} points`}
      </p>
    )}
  </div>
)}

{step === questions.length && questions.length > 0 && (
  <Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 font-semibold text-[var(--lime)]">Back to dashboard <ArrowRight size={14} /></Link>
)}

        <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]"><span className="flex items-center gap-2"><Clock3 size={14} /> Learn at your pace</span><span className="flex items-center gap-2"><LockKeyhole size={14} /> Points verified by database</span></div>
      </div>
    </div>
  );
}

function StateCard({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-12"><div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 text-sm text-[var(--muted)]">{children}</div></div>;
}
