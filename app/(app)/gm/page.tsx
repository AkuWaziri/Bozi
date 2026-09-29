"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, ShieldCheck, WalletCards, CheckCircle2, Loader2 } from "lucide-react";
import { createPublicClient, createWalletClient, custom, http, parseUnits } from "viem";
import { base } from "viem/chains";
import { supabase } from "../../../lib/supabase/client";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const GM_CONTRACT = "0xF46Fb1285e56e38077814B212F93ea5DD0CacCd1" as const;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const FEE = parseUnits("0.01", 6);

const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const gmAbi = [
  {
    type: "function",
    name: "gm",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

export default function GM() {
  const [wallet, setWallet] = useState("");
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [completed, setCompleted] = useState(false);

  const walletClient = useMemo(
    () =>
      typeof window !== "undefined" && window.ethereum
        ? createWalletClient({ chain: base, transport: custom(window.ethereum) })
        : null,
    [],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;

      const { data: rows } = await supabase
        .from("bozi_gm_checkins")
        .select("checkin_date")
        .eq("user_id", data.session.user.id)
        .eq("status", "confirmed")
        .order("checkin_date", { ascending: false })
        .limit(90);

      if (!rows?.length) return;
      const dates = new Set(rows.map((row) => row.checkin_date));
      const cursor = new Date();
      let count = 0;
      while (dates.has(cursor.toISOString().slice(0, 10))) {
        count += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
      if (active) setStreak(count);
    })();
    return () => {
      active = false;
    };
  }, [completed]);

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("Install a wallet such as MetaMask or Coinbase Wallet.");
      return;
    }
    const accounts = (await window.ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];
    const address = accounts?.[0]?.toLowerCase();
    if (address) setWallet(address);
  }

  async function switchToBase() {
    if (!window.ethereum) throw new Error("Wallet not found.");
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
    } catch (error: unknown) {
      const code = typeof error === "object" && error && "code" in error
        ? Number((error as { code?: number }).code)
        : 0;
      if (code !== 4902) throw error;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x2105",
          chainName: "Base",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"],
        }],
      });
    }
  }

  async function submitGM() {
    if (!walletClient || !wallet) {
      await connectWallet();
      return;
    }

    setBusy(true);
    setCompleted(false);
    setTxHash("");
    setStatus("Preparing Base transaction…");

    try {
      await switchToBase();

      const account = wallet as `0x${string}`;
      const allowance = await publicClient.readContract({
        address: USDC,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, GM_CONTRACT],
      });

      if (allowance < FEE) {
        setStatus("Approve 0.01 USDC for the GM contract…");
        const approvalHash = await walletClient.writeContract({
          account,
          address: USDC,
          abi: erc20Abi,
          functionName: "approve",
          args: [GM_CONTRACT, FEE],
          chain: base,
        });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }

      setStatus("Confirm the GM transaction in your wallet…");
      const hash = await walletClient.writeContract({
        account,
        address: GM_CONTRACT,
        abi: gmAbi,
        functionName: "gm",
        chain: base,
      });

      setTxHash(hash);
      setStatus("Waiting for onchain confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your Bozi session expired. Please sign in again.");

      setStatus("Verifying the confirmed GM…");
      const response = await fetch("/api/gm/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ txHash: hash, walletAddress: account }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "GM verification failed.");

      setCompleted(true);
      setStatus(result.pointsAwarded > 0 ? "+50 points earned." : "GM already recorded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "GM failed. No points were awarded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 md:px-8 md:py-10">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">Daily onchain activity</p>
      <h1 className="mt-2 text-3xl font-black">GM Streak</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Choose Base, sign the GM transaction, and earn points only after the transaction is confirmed and verified onchain.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--lime)]/10 text-[var(--lime)]"><Flame /></div>
            <div>
              <p className="text-sm text-[var(--muted)]">Current streak</p>
              <p className="text-3xl font-black">{streak} {streak === 1 ? "day" : "days"}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white/[.025] p-5">
            <label className="text-xs font-semibold text-[var(--muted)]">GM network</label>
            <div className="mt-2 rounded-xl border border-[var(--line)] bg-[#11151b] px-3 py-3 text-sm">Base Mainnet · USDC</div>
            <p className="mt-2 text-xs text-[var(--muted)]">0.01 USDC fee + normal Base gas.</p>
            <button
              onClick={submitGM}
              disabled={busy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--lime)] px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 size={17} className="animate-spin" /> : completed ? <CheckCircle2 size={17} /> : <WalletCards size={17} />}
              {busy ? "Processing…" : wallet ? "GM on Base" : "Connect wallet to GM"}
            </button>
            {wallet && <p className="mt-2 truncate text-center text-[10px] text-[var(--muted)]">{wallet}</p>}
            {status && <p className="mt-3 text-center text-xs font-semibold text-[var(--lime)]">{status}</p>}
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-center text-xs underline"
              >
                View transaction on BaseScan
              </a>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <p className="text-sm font-bold">Today</p>
          <div className="mt-5 space-y-3 text-sm">
            <Info icon={WalletCards} title="Onchain confirmation" text="Required before points are awarded." />
            <Info icon={ShieldCheck} title="50 points" text="Each confirmed GM earns 50 points." />
            <Info icon={Flame} title="$0.01 fee" text="Paid in USDC plus normal Base gas." />
          </div>
        </section>
      </div>

      <p className="mt-5 text-xs text-[var(--muted)]">
        Fee recipient is fixed in the deployed contract. Bozi verifies the transaction and GMCheckedIn event before awarding points.
      </p>
    </div>
  );
}

function Info({ icon: Icon, title, text }: { icon: typeof Flame; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-[var(--line)] p-3">
      <Icon size={17} className="mt-0.5 text-[var(--lime)]" />
      <div><p className="font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{text}</p></div>
    </div>
  );
}
