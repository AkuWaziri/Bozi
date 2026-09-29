import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const xClientId = process.env.X_CLIENT_ID;
const xRedirectUri = process.env.X_REDIRECT_URI;
const stateSecret = process.env.X_OAUTH_STATE_SECRET;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function b64(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(stateSecret!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Buffer.from(signature).toString("base64url");
}

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey || !xClientId || !xRedirectUri || !stateSecret || !serviceRoleKey) {
    return NextResponse.json({ error: "X connection is not configured." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await authClient.auth.getUser(token);
  if (!data.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const value = `${data.user.id}.${Date.now()}`;
  const state = `${b64(value)}.${await sign(value)}`;
  const verifier = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const challengeBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = Buffer.from(challengeBytes).toString("base64url");

  const response = NextResponse.json({
    url:
      `https://x.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(xClientId)}&redirect_uri=${encodeURIComponent(xRedirectUri)}&scope=${encodeURIComponent("tweet.read users.read")}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`,
  });

  response.cookies.set("bozi_x_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}