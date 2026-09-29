import { Flame, ShieldCheck, WalletCards } from "lucide-react";

export default function GM() {
 return <div className="mx-auto max-w-4xl px-4 py-8 pb-24 md:px-8 md:py-10">
  <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Daily onchain activity</p><h1 className="mt-2 text-3xl font-black">GM Streak</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Choose a supported network, sign the GM transaction, and earn points only after the transaction is confirmed onchain.</p>
  <div className="mt-8 grid gap-4 md:grid-cols-[1.25fr_.75fr]">
   <section className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 md:p-8"><div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--lime)]/10 text-[var(--lime)]"><Flame/></div><div><p className="text-sm text-[var(--muted)]">Current streak</p><p className="text-3xl font-black">— days</p></div></div><div className="mt-8 rounded-2xl border border-[var(--line)] bg-white/[.025] p-5"><label className="text-xs font-semibold text-[var(--muted)]">GM network</label><select className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[#11151b] px-3 py-3 text-sm outline-none"><option>Select a network</option></select><button className="mt-3 w-full rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black">Connect wallet to GM</button></div></section>
   <section className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6"><p className="text-sm font-bold">Today</p><div className="mt-5 space-y-3 text-sm"><Info icon={WalletCards} title="Onchain confirmation" text="Required before points are awarded."/><Info icon={ShieldCheck} title="50 points" text="Each confirmed GM earns 50 points."/><Info icon={Flame} title="$0.01 fee" text="Equivalent fee plus normal network gas." /></div></section>
  </div>
  <p className="mt-5 text-xs text-[var(--muted)]">Fee recipient: configured server-side for the Bozi GM contract. The browser will not decide whether a GM earned points.</p>
 </div>;
}
function Info({icon:Icon,title,text}:{icon:typeof Flame,title:string,text:string}){return <div className="flex gap-3 rounded-xl border border-[var(--line)] p-3"><Icon size={17} className="mt-0.5 text-[var(--lime)]"/><div><p className="font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{text}</p></div></div>}
