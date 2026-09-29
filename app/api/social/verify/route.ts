import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const xBearerToken = process.env.X_BEARER_TOKEN;

function extractPostId(value: string) {
  const match = value.match(/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i);
  return match?.[1] ?? null;
}

function relevant(text: string, quest: { title: string; summary?: string | null; social_instructions?: string | null }) {
  const source = [quest.title, quest.summary, quest.social_instructions].filter(Boolean).join(" ").toLowerCase();
  const words = Array.from(new Set(
    source
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 5)
  ));
  if (!words.length) return true;
  const body = text.toLowerCase();
  return words.some((word) => body.includes(word));
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }
  if (!xBearerToken) {
    return NextResponse.json({ error: "X verification is not configured yet." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const questId = typeof body?.questId === "string" ? body.questId : "";
  const postUrl = typeof body?.postUrl === "string" ? body.postUrl.trim() : "";
  const postId = extractPostId(postUrl);

  if (!questId || !postId) {
    return NextResponse.json({ error: "Enter a valid X post URL." }, { status: 400 });
  }

  const { data: quest, error: questError } = await supabase
    .from("bozi_quests")
    .select("id,title,summary,social_instructions,social_points,social_task_enabled,status")
    .eq("id", questId)
    .eq("status", "published")
    .maybeSingle();

  if (questError || !quest || !quest.social_task_enabled) {
    return NextResponse.json({ error: "Social task is not available." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("bozi_profiles")
    .select("x_user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!profile?.x_user_id) {
    return NextResponse.json({ error: "Connect your X account in Profile first." }, { status: 400 });
  }

  const xResponse = await fetch(
    `https://api.x.com/2/tweets/${postId}?tweet.fields=author_id,text,created_at`,
    { headers: { Authorization: `Bearer ${xBearerToken}` }, cache: "no-store" }
  );

  if (!xResponse.ok) {
    return NextResponse.json({ error: "X could not verify that post." }, { status: 400 });
  }

  const xData = await xResponse.json();
  const tweet = xData?.data;
  if (!tweet?.id || !tweet?.author_id || typeof tweet.text !== "string") {
    return NextResponse.json({ error: "X post not found." }, { status: 400 });
  }

  if (tweet.author_id !== profile.x_user_id) {
    return NextResponse.json({ error: "That post is not from your connected X account." }, { status: 400 });
  }

  if (!relevant(tweet.text, quest)) {
    return NextResponse.json({ error: "The post does not appear to be related to this quest." }, { status: 400 });
  }

  const { data: reward, error: rewardError } = await supabase.rpc("bozi_submit_social_post", {
    p_quest_id: questId,
    p_post_url: postUrl,
    p_post_id: postId,
    p_x_author_id: tweet.author_id,
  });

  if (rewardError) {
    return NextResponse.json({ error: rewardError.message }, { status: 400 });
  }

  const result = Array.isArray(reward) ? reward[0] : reward;
  return NextResponse.json({
    approved: Boolean(result?.approved),
    pointsAwarded: Number(result?.points_awarded ?? 0),
    alreadySubmitted: Boolean(result?.already_submitted),
  });
}
