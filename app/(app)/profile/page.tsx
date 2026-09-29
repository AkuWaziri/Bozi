"use client";

import { CheckCircle2, Link2, ShieldCheck, UserRound, Wallet, Copy, ExternalLink, Save, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

type Activity={id:string;source_type:string;points:number;description:string;created_at:string};

export default function Profile() {
 const router=useRouter(); const [email,setEmail]=useState<string|null>(null); const [userId,setUserId]=useState<string|null>(null);
 const [displayName,setDisplayName]=useState(""); const [wallet,setWallet]=useState(""); const [xConnected,setXConnected]=useState(false); const [xHandle,setXHandle]=useState<string|null>(null);
 const [points,setPoints]=useState(0); const [activity,setActivity]=useState<Activity[]>([]); const [xLoading,setXLoading]=useState(false); const [saving,setSaving]=useState(false); const [status,setStatus]=useState("");

 useEffect(()=>{let mounted=true;(async()=>{const {data}=await supabase.auth.getSession();const user=data.session?.user;if(!user){router.replace("/auth");return}
  const [{data:p},{data:l}]=await Promise.all([
   supabase.from("bozi_profiles").select("display_name,x_user_id,x_handle,wallet_address").eq("user_id",user.id).maybeSingle(),
   supabase.from("bozi_points_ledger").select("id,source_type,points,description,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(12)
  ]);
  if(mounted){setUserId(user.id);setEmail(user.email??null);setDisplayName(p?.display_name??"");setWallet(p?.wallet_address??"");setXConnected(Boolean(p?.x_user_id));setXHandle(p?.x_handle??null);setPoints((l??[]).reduce((s,r)=>s+Number(r.points||0),0));setActivity((l??[]) as Activity[]);}
 })();return()=>{mounted=false}},[router]);

 const save=async()=>{if(!userId)return;setSaving(true);const {error}=await supabase.from("bozi_profiles").update({display_name:displayName.trim()||null,wallet_address:wallet.trim().toLowerCase()||null}).eq("user_id",userId);setStatus(error?error.message:"Profile saved.");setSaving(false)};
 const connectX=async()=>{setXLoading(true);const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token){setStatus("Your session expired.");setXLoading(false);return}const response=await fetch("/api/x/connect",{headers:{Authorization:"Bearer "+session.access_token}});const result=await response.json().catch(()=>({}));if(response.ok&&result.url)window.location.href=result.url;else{setStatus(result.error||"Unable to connect X.");setXLoading(false)}};
 const connectWallet=async()=>{const eth=(window as any).ethereum;if(!eth){setStatus("Install an EVM wallet such as MetaMask or Coinbase Wallet.");return}try{const accounts=await eth.request({method:"eth_requestAccounts"});const a=String(accounts?.[0]??"");if(a){setWallet(a);setStatus("Wallet connected. Save your profile to link it.");}}catch(e){setStatus(e instanceof Error?e.message:"Wallet connection cancelled.")}};
 const copy=async()=>{if(wallet)await navigator.clipboard?.writeText(wallet);setStatus("Wallet address copied.")};

 return <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:px-8 md:py-10">
  <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--violet)]">Account</p><h1 className="mt-2 text-3xl font-black">Profile</h1>
  <div className="mt-8 grid gap-4 md:grid-cols-2">
   <Card icon={UserRound} title="Your account"><p className="text-sm text-[var(--muted)]">{email??"Signed in account"}</p><label className="mt-5 block text-xs font-semibold text-[var(--muted)]">Display name</label><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="How you want to appear" className="mt-2 w-full rounded-xl border border-[var(--line)] bg-black/10 px-3 py-3 text-sm outline-none focus:border-[var(--lime)]"/><button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black disabled:opacity-60">{saving?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>}Save profile</button>{status&&<p className="mt-3 text-xs text-[var(--muted)]">{status}</p>}<button onClick={async()=>{await supabase.auth.signOut();router.replace("/")}} className="mt-3 block text-xs font-semibold text-[var(--muted)]">Sign out</button></Card>
   <Card icon={StarIcon} title="Points"><p className="text-4xl font-black text-[var(--lime)]">{points.toLocaleString()}</p><p className="mt-1 text-sm text-[var(--muted)]">Recent verified activity</p><div className="mt-5 space-y-2">{activity.length?activity.slice(0,5).map(a=><div key={a.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] p-3"><div className="min-w-0"><p className="truncate text-xs font-semibold">{a.description||a.source_type}</p><p className="text-[10px] text-[var(--muted)]">{new Date(a.created_at).toLocaleDateString()}</p></div><span className="ml-3 text-xs font-bold text-[var(--lime)]">+{a.points}</span></div>):<p className="text-xs text-[var(--muted)]">No points activity yet.</p>}</div></Card>
   <Card icon={Link2} title="X verification"><p className="text-sm text-[var(--muted)]">{xConnected?<>Connected as <span className="font-semibold text-white">{xHandle}</span>.</>:"Connect X before submitting contribution posts."}</p><button onClick={connectX} disabled={xLoading||xConnected} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold disabled:opacity-50">{xConnected?<><CheckCircle2 size={15} className="text-[var(--lime)]"/>Connected</>:xLoading?"Connecting…":"Connect X"}</button></Card>
   <Card icon={Wallet} title="Wallet"><p className="text-sm text-[var(--muted)]">Link the EVM wallet used for onchain Bozi activity.</p><div className="mt-4 flex gap-2"><input value={wallet} onChange={e=>setWallet(e.target.value)} placeholder="0x…" className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-black/10 px-3 py-3 text-xs outline-none"/><button onClick={connectWallet} className="rounded-xl border border-[var(--line)] px-3 text-xs font-bold">Connect</button></div>{wallet&&<div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--muted)]"><span className="truncate">{wallet}</span><button onClick={copy}><Copy size={13}/></button><a href={"https://basescan.org/address/"+wallet} target="_blank" rel="noreferrer"><ExternalLink size={13}/></a></div>}<button onClick={save} disabled={saving} className="mt-3 w-full rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-bold">Save wallet</button></Card>
   <Card icon={ShieldCheck} title="Security"><p className="text-sm leading-6 text-[var(--muted)]">Points are written by server-verified activity. Profile edits never create or modify points.</p></Card>
  </div>
 </div>;
}
function Card({icon:Icon,title,children}:{icon:any,title:string,children:React.ReactNode}){return <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"><Icon size={19} className="text-[var(--lime)]"/><h2 className="mt-5 text-lg font-bold">{title}</h2><div className="mt-2">{children}</div></section>}
function StarIcon(){return <span className="text-xl text-[var(--lime)]">✦</span>}
