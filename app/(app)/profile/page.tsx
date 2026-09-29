"use client";

import { Link2, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function Profile() {
 const router = useRouter();
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

 const signOut = async () => {
  await supabase.auth.signOut();
  router.replace("/");
 };

 return <div className="mx-auto max-w-4xl px-4 py-8 pb-24 md:px-8 md:py-10">
  <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--violet)]">Account</p><h1 className="mt-2 text-3xl font-black">Profile</h1>
  <div className="mt-8 grid gap-4 md:grid-cols-2">
   <Card icon={UserRound} title="Your account">
    <p className="text-sm text-[var(--muted)]">{email ? <>Signed in with <span className="font-semibold text-white">{email}</span>.</> : "Your Bozi account and email authentication are managed here."}</p>
    <button onClick={signOut} className="mt-5 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold transition hover:bg-white/[.05]">Sign out</button>
   </Card>
   <Card icon={Link2} title="X verification"><p className="text-sm text-[var(--muted)]">Verify your X account before submitting posts for contribution points.</p><button className="mt-5 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold">Connect X</button></Card>
   <Card icon={Wallet} title="Wallet"><p className="text-sm text-[var(--muted)]">Your wallet will be linked for onchain GM verification.</p><button className="mt-5 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold">Connect wallet</button></Card>
   <Card icon={ShieldCheck} title="Account security"><p className="text-sm text-[var(--muted)]">Verified activities and points are protected by server-side checks.</p></Card>
  </div>
 </div>;
}
function Card({icon:Icon,title,children}:{icon:typeof UserRound,title:string,children:React.ReactNode}){return <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"><Icon size={19} className="text-[var(--lime)]"/><h2 className="mt-5 text-lg font-bold">{title}</h2><div className="mt-2">{children}</div></section>}
