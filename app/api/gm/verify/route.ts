import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  http,
  parseEventLogs,
  type Hex,
} from "viem";
import { base, mainnet, arbitrum, optimism, polygon } from "viem/chains";

const GM_ABI = [
  {
    type: "event",
    name: "GMCheckedIn",
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "day", type: "uint256" },
      { indexed: false, name: "feeAmount", type: "uint256" },
    ],
  },
] as const;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const networkKey = typeof body?.networkKey === "string" ? body.networkKey.trim().toLowerCase() : "base";
  const txHash = typeof body?.txHash === "string" ? body.txHash.trim() : "";
  const walletAddress =
    typeof body?.walletAddress === "string" ? body.walletAddress.trim().toLowerCase() : "";

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash) || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json({ error: "Invalid transaction or wallet address." }, { status: 400 });
  }

  const { data: network, error: networkError } = await supabase
    .from("bozi_gm_networks")
    .select("id, chain_id, contract_address, enabled")
    .eq("network_key", networkKey)
    .eq("enabled", true)
    .maybeSingle();

  if (networkError || !network?.contract_address) {
    return NextResponse.json({ error: "Selected GM network is not configured." }, { status: 503 });
  }

  const chains = { base, ethereum: mainnet, arbitrum, optimism, polygon } as const;
  const chain = chains[networkKey as keyof typeof chains];
  if (!chain || Number(network.chain_id) !== chain.id) {
    return NextResponse.json({ error: "This GM network is not supported by the verifier yet." }, { status: 400 });
  }
  const client = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) });

  try {
    const hash = txHash as Hex;
    const [tx, receipt] = await Promise.all([
      client.getTransaction({ hash }),
      client.getTransactionReceipt({ hash }),
    ]);

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "GM transaction failed onchain." }, { status: 400 });
    }

    if (tx.from.toLowerCase() !== walletAddress) {
      return NextResponse.json({ error: "Transaction sender does not match the connected wallet." }, { status: 400 });
    }

    if (!tx.to || tx.to.toLowerCase() !== network.contract_address.toLowerCase()) {
      return NextResponse.json({ error: "Transaction was not sent to the Bozi GM contract." }, { status: 400 });
    }

    const logs = parseEventLogs({
      abi: GM_ABI,
      logs: receipt.logs,
      eventName: "GMCheckedIn",
    });

    const matchingLog = logs.find(
      (log) => log.args.user.toLowerCase() === walletAddress,
    );

    if (!matchingLog) {
      return NextResponse.json({ error: "No valid GMCheckedIn event was found." }, { status: 400 });
    }

    const checkinDate = new Date().toISOString().slice(0, 10);

    const { data: reward, error: rewardError } = await supabase.rpc(
      "bozi_confirm_gm",
      {
        p_network_id: network.id,
        p_wallet_address: walletAddress,
        p_tx_hash: txHash.toLowerCase(),
        p_checkin_date: checkinDate,
      },
    );

    if (rewardError) {
      return NextResponse.json({ error: rewardError.message }, { status: 400 });
    }

    const result = Array.isArray(reward) ? reward[0] : reward;
    return NextResponse.json({
      confirmed: Boolean(result?.confirmed),
      pointsAwarded: Number(result?.points_awarded ?? 0),
      alreadyRecorded: Boolean(result?.already_recorded),
      txHash,
    });
  } catch (error) {
    console.error("GM verification failed", error);
    return NextResponse.json({ error: "Unable to verify the GM transaction yet." }, { status: 400 });
  }
}
