"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Flame, Home, Trophy, User, ShieldCheck, Menu, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/quests", label: "Quests", icon: BookOpen },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/gm", label: "GM Streak", icon: Flame },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[var(--line)] bg-[var(--panel)]/95 p-5 backdrop-blur-xl lg:block">
        <Brand />
        <nav className="mt-10 space-y-1">
          {nav.map((item) => <NavItem key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + "/")} />)}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-[var(--line)] bg-white/[.025] p-4">
          <p className="text-xs font-semibold text-[var(--muted)]">Bozi points</p>
          <p className="mt-1 text-2xl font-black">—</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Connect your account to begin</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--bg)]/90 px-4 backdrop-blur-xl lg:ml-64 lg:px-8">
        <button onClick={() => setOpen(!open)} className="rounded-xl border border-[var(--line)] p-2 lg:hidden" aria-label="Open navigation">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="hidden lg:block"><span className="text-sm text-[var(--muted)]">Your learning space</span></div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/profile" className="rounded-xl border border-[var(--line)] bg-white/[.025] px-3 py-2 text-sm font-semibold hover:bg-white/[.06]">Sign in</Link>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setOpen(false)}>
        <div className="h-full w-72 border-r border-[var(--line)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
          <Brand />
          <nav className="mt-8 space-y-1">
            {nav.map((item) => <NavItem key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + "/")} onClick={() => setOpen(false)} />)}
          </nav>
        </div>
      </div>}

      <main className="min-h-[calc(100vh-4rem)] lg:ml-64">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-[var(--line)] bg-[var(--panel)]/95 p-1 backdrop-blur-xl lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium ${active ? "text-[var(--lime)]" : "text-[var(--muted)]"}`}><Icon size={17}/>{item.label === "Leaderboard" ? "Ranks" : item.label}</Link>
        })}
      </nav>
    </div>
  );
}

function Brand() {
  return <Link href="/" className="flex items-center gap-3">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--lime)] text-sm font-black text-black">B</span>
    <span className="text-xl font-black tracking-tight">bozi</span>
  </Link>;
}

function NavItem({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon: typeof Home; active: boolean; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-[var(--lime)]/10 text-[var(--lime)]" : "text-[var(--muted)] hover:bg-white/[.04] hover:text-white"}`}>
    <Icon size={17}/>{label}
  </Link>;
}
