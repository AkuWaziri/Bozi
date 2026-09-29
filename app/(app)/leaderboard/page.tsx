import { Trophy, Users } from "lucide-react";

const rows = [
  ["—","Your rank","Sign in to participate"],
  ["1","—","Points will appear here"],
  ["2","—","Points will appear here"],
  ["3","—","Points will appear here"],
];

export default function Leaderboard() {
 return <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:px-8 md:py-10">
  <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Community</p><h1 className="mt-2 text-3xl font-black">Leaderboard</h1><p className="mt-2 text-sm text-[var(--muted)]">Rankings will be calculated from the verified points ledger.</p>
  <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
   <div className="grid grid-cols-[70px_1fr_130px] border-b border-[var(--line)] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"><span>Rank</span><span>Participant</span><span className="text-right">Points</span></div>
   {rows.map(([rank,name,points],i)=><div key={i} className="grid grid-cols-[70px_1fr_130px] items-center border-b border-[var(--line)] px-5 py-5 last:border-0"><span className={`font-black ${rank==="1"?"text-[var(--lime)]":"text-[var(--muted)]"}`}>{rank}</span><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/[.05]"><Users size={15}/></span><span className="text-sm font-semibold">{name}</span></span><span className="text-right text-sm font-bold">{points}</span></div>)}
  </div>
  <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]"><Trophy size={17} className="mb-3 text-[var(--lime)]"/>The leaderboard will combine quest, verified X contribution and confirmed GM points without allowing client-side edits.</div>
 </div>;
}
