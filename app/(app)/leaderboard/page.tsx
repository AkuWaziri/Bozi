"use client";

import { useEffect, useState } from "react";
import { Trophy, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
};

export default function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: sessionData }, { data, error: leaderboardError }] =
        await Promise.all([
          supabase.auth.getSession(),
          supabase.rpc("bozi_get_leaderboard"),
        ]);

      setCurrentUserId(sessionData.session?.user.id ?? null);

      if (leaderboardError) {
        setError(leaderboardError.message);
      } else {
        setRows((data ?? []) as LeaderboardRow[]);
      }

      setLoading(false);
    }

    void load();
  }, []);

  const currentRank = currentUserId
    ? rows.findIndex((row) => row.user_id === currentUserId) + 1
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:px-8 md:py-10">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Community</p>
      <h1 className="mt-2 text-3xl font-black">Leaderboard</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Rankings are calculated from verified points earned across Bozi.</p>

      {currentRank > 0 && (
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Your rank</p>
          <p className="mt-1 text-2xl font-black">#{currentRank}</p>
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        <div className="grid grid-cols-[70px_1fr_130px] border-b border-[var(--line)] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          <span>Rank</span><span>Participant</span><span className="text-right">Points</span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--muted)]">Loading verified rankings…</div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--coral)]">Unable to load the leaderboard.</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--muted)]">No participants have earned points yet.</div>
        ) : (
          rows.map((row, index) => {
            const rank = index + 1;
            const isCurrentUser = row.user_id === currentUserId;
            const name = row.display_name?.trim() || "Anonymous participant";

            return (
              <div key={row.user_id} className={`grid grid-cols-[70px_1fr_130px] items-center border-b border-[var(--line)] px-5 py-5 last:border-0 ${isCurrentUser ? "bg-white/[.03]" : ""}`}>
                <span className={`font-black ${rank === 1 ? "text-[var(--lime)]" : "text-[var(--muted)]"}`}>{rank}</span>
                <span className="flex min-w-0 items-center gap-3">
                  {row.avatar_url ? (
                    <img src={row.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[.05]"><Users size={15} /></span>
                  )}
                  <span className="truncate text-sm font-semibold">{name}{isCurrentUser ? " · You" : ""}</span>
                </span>
                <span className="text-right text-sm font-bold">{row.total_points.toLocaleString()}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
        <Trophy size={17} className="mb-3 text-[var(--lime)]" />
        Quiz, verified X contribution, and confirmed GM rewards flow into the same server-controlled points ledger.
      </div>
    </div>
  );
}
