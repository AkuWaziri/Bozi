"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: "https://bozi.quest/auth" },
          });

    if (result.error) {
      setMessage(result.error.message);
      setBusy(false);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm your address, then sign in.");
      setBusy(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl md:p-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <img src="/bozi-logo.svg" alt="Bozi" className="h-10 w-10 object-contain" />
            <span className="text-xl font-black tracking-tight">bozi</span>
          </Link>

          <div className="mt-10">
            <div className="mb-4 inline-flex rounded-xl bg-[var(--lime)]/10 p-3 text-[var(--lime)]">
              <ShieldCheck size={21} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              {mode === "signin" ? "Welcome back." : "Create your Bozi account."}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {mode === "signin"
                ? "Sign in to continue your learning, contribution and eran points."
                : "Start learning quests and build your onchain learning reputation."}
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Email</span>
              <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-black/20 px-3">
                <Mail size={17} className="text-[var(--muted)]" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-transparent py-3.5 text-sm outline-none" />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Password</span>
              <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="w-full rounded-xl border border-[var(--line)] bg-black/20 px-3 py-3.5 text-sm outline-none focus:border-[var(--lime)]/60" />
            </label>

            {message && <div className="rounded-xl border border-[var(--line)] bg-white/[.03] px-3 py-3 text-sm leading-5 text-[var(--muted)]">{message}</div>}

            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3.5 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }} className="mt-6 w-full text-center text-sm text-[var(--muted)] hover:text-white">
            {mode === "signin" ? "New to Bozi? Create an account" : "Already have an account? Sign in"}
          </button>
        </section>
      </div>
    </main>
  );
}
