import { FilePlus2, Settings2, Users } from "lucide-react";

export default function Admin() {
 return <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:px-8 md:py-10">
  <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--violet)]">Operations</p><h1 className="mt-2 text-3xl font-black">Admin</h1><p className="mt-2 text-sm text-[var(--muted)]">Create and manage educational quests, verification rules and participant activity.</p>
  <div className="mt-8 grid gap-4 md:grid-cols-3"><AdminCard icon={FilePlus2} title="Quest builder" text="Create lessons, questions, answers and reward rules."/><AdminCard icon={Settings2} title="Verification" text="Review X submissions and manage verification outcomes."/><AdminCard icon={Users} title="Participants" text="Review profiles, activity and moderation history."/></div>
  <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">Admin access will be protected by Supabase authorization. No public user will be able to create quests or award points.</div>
 </div>;
}
function AdminCard({icon:Icon,title,text}:{icon:typeof FilePlus2,title:string,text:string}){return <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"><Icon size={19} className="text-[var(--violet)]"/><h2 className="mt-6 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p><button className="mt-5 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold">Open</button></section>}
