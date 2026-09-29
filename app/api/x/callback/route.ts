import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const xClientId = process.env.X_CLIENT_ID;
const xClientSecret = process.env.X_CLIENT_SECRET;
const xRedirectUri = process.env.X_REDIRECT_URI;
const stateSecret = process.env.X_OAUTH_STATE_SECRET;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function fromB64(value: string) {
  return Buffer.from(value, "base64url").toString();
}

async function verify(value: string, signature: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(stateSecret!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, Buffer.from(signature, "base64url"), new TextEncoder().encode(value));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verifier = request.cookies.get("bozi_x_verifier")?.value;

  if (!code || !state || !verifier || !xClientId || !xClientSecret || !xRedirectUri || !stateSecret || !serviceRoleKey || !supabaseUrl) {
    return NextResponse.redirect(new URL("/profile?x=error", request.url));
  }

  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return NextResponse.redirect(new URL("/profile?x=error", request.url));

  const value = fromB64(encoded);
  if (!(await verify(value, signature))) return NextResponse.redirect(new URL("/profile?x=error", request.url));

  const [userId, issuedAt] = value.split(".");
  if (!userId || Date.now() - Number(issuedAt) > 600000) {
    return NextResponse.redirect(new URL("/profile?x=error", request.url));
  }

  const basic = Buffer.from(`${xClientId}:${xClientSecret}`).toString("base64");
  const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: xClientId,
      redirect_uri: xRedirectUri,
      code_verifier: verifier,
    }),
  });

  if (!tokenResponse.ok) return NextResponse.redirect(new URL("/profile?x=error", request.url));

  const tokenData = await tokenResponse.json();
  const meResponse = await fetch("https://api.x.com/2/users/me?user.fields=username,name,profile_image_url", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!meResponse.ok) return NextResponse.redirect(new URL("/profile?x=error", request.url));

  const me = await meResponse.json();
  const user = me.data;
  if (!user?.id) return NextResponse.redirect(new URL("/profile?x=error", request.url));

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await admin
    .from("bozi_profiles")
    .update({
      x_user_id: user.id,
      x_handle: user.username ? `@${user.username}` : null,
      avatar_url: user.profile_image_url ?? null,
    })
    .eq("user_id", userId);

  const response = NextResponse.redirect(new URL(error ? "/profile?x=error" : "/profile?x=connected", request.url));
  response.cookies.delete("bozi_x_verifier");
  return response;
}