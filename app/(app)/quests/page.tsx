import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock3 } from "lucide-react";

const quests = [
  ["How stablecoins work","Fundamentals","Beginner",80,"8 questions"],
  ["Inside a modern L2","Ethereum","Intermediate",100,"10 questions"],
  ["DeFi liquidity, explained","DeFi","Intermediate",120,"12 questions"],
  ["Reading tokenomics without the hype","Research","Intermediate",100,"10 questions"],
  ["How bridges move assets","Infrastructure","Beginner",90,"9 questions"],
  ["Crypto wallets, explained","Fundamentals","Beginner",70,"7 questions"],
];

export default function Quests() {
  return <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:px-8 md:py-10">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Learn</p><h1 className="mt-2 text-3xl font-black tracking-tight">Quests</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Focused lessons followed by questions that test the material you just read.</p>
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{quests.map(([title,category,level,points,questions]) => <Link href="/quests/demo" key={title} className="group rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 hover:border-white/20">
      <div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--lime)]/10 text-[var(--lime)]"><BookOpen size={18}/></div><span className="text-sm font-bold text-[var(--lime)]">+{points}</span></div>
      <p className="mt-5 text-xs text-[var(--muted)]">{category} · {level}</p><h2 className="mt-1 text-lg font-bold">{title}</h2>
      <div className="mt-6 flex items-center gap-4 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]"><span className="flex items-center gap-1"><CheckCircle2 size={13}/> {questions}</span><span className="flex items-center gap-1"><Clock3 size={13}/> 5–10 min</span><ArrowRight className="ml-auto" size={15}/></div>
    </Link>)}</div>
  </div>;
}
