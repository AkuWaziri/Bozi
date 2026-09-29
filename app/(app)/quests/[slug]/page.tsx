"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, LockKeyhole } from "lucide-react";

const questions = [
  { q: "What is the main purpose of a stablecoin?", options: ["To maintain a target value", "To replace every blockchain", "To guarantee profit"], answer: 0 },
  { q: "Why does collateral matter in many DeFi systems?", options: ["It provides a security mechanism", "It removes all risk", "It makes transactions free"], answer: 0 },
];

export default function QuestDetail() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const q = questions[step];

  return <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:px-8 md:py-10">
    <Link href="/quests" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-white"><ArrowLeft size={15}/> Back to quests</Link>
    <div className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 md:p-8">
      <div className="flex items-center justify-between text-xs text-[var(--muted)]"><span>Demo quest</span><span>{step + 1} / {questions.length}</span></div>
      <h1 className="mt-5 text-2xl font-black md:text-3xl">How stablecoins work</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">This is the lesson preview. The production version will load administrator-authored educational content from Supabase and require the participant to read it before answering.</p>
      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/[.025] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--lime)]">Question {step + 1}</p><h2 className="mt-3 text-lg font-bold">{q.q}</h2><div className="mt-5 space-y-2">{q.options.map((option,i)=><button key={option} onClick={() => setSelected(i)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${selected===i ? "border-[var(--lime)] bg-[var(--lime)]/10" : "border-[var(--line)] hover:bg-white/[.03]"}`}><span>{option}</span>{selected===i && <CheckCircle2 size={17} className="text-[var(--lime)]"/>}</button>)}</div></div>
      <button disabled={selected===null} onClick={() => { if(step < questions.length-1){setStep(step+1);setSelected(null)} else setDone(true)}} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">{done ? "Completed" : step < questions.length-1 ? "Next question" : "Finish quest"} <ArrowRight size={16}/></button>
      {done && <div className="mt-5 rounded-2xl border border-[var(--lime)]/30 bg-[var(--lime)]/10 p-4 text-sm"><p className="font-bold">Quiz preview complete.</p><p className="mt-1 text-[var(--muted)]">Production scoring will be server-verified. Correct answers will award 10 points once per question.</p><Link href="/profile" className="mt-3 inline-flex items-center gap-2 font-semibold text-[var(--lime)]">Continue <ExternalLink size={14}/></Link></div>}
      <div className="mt-8 flex items-center gap-2 text-xs text-[var(--muted)]"><LockKeyhole size={14}/> Points are never awarded directly by the browser.</div>
    </div>
  </div>;
}
