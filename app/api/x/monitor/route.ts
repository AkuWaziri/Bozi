import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request:NextRequest){
  const expected=process.env.CRON_SECRET;
  if(expected&&request.headers.get("authorization")!==`Bearer ${expected}`)
    return NextResponse.json({error:"Unauthorized"},{status:401});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bearer=process.env.X_BEARER_TOKEN;

  if(!url||!service||!bearer)
    return NextResponse.json({error:"Monitor is not configured."},{status:503});

  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:claims,error}=await db
    .from("bozi_x_quest_claims")
    .select("id,quest_id,x_user_id,action,post_id,status")
    .eq("action","post")
    .eq("status","rewarded")
    .not("post_id","is",null)
    .limit(100);

  if(error)
    return NextResponse.json({error:error.message},{status:500});

  let checked=0;
  let violations=0;

  for(const claim of claims??[]){
    if(!claim.post_id) continue;

    const response=await fetch(
      `https://api.x.com/2/tweets/${claim.post_id}?tweet.fields=id,author_id`,
      {headers:{Authorization:`Bearer ${bearer}`},cache:"no-store"}
    );

    checked++;

    // Only a confirmed missing Post is a campaign violation. Authentication,
    // permission, rate-limit, or transient API failures must never blacklist
    // a participant.
    let deleted=false;
    if(response.status===404){
      deleted=true;
    }else if(response.ok){
      const payload=await response.json().catch(()=>null);
      deleted=!payload?.data?.id;
    }

    if(!deleted) continue;

    const reason="Rewarded X post was deleted.";
    const expiresAt=new Date(Date.now()+7*24*60*60*1000).toISOString();
    const now=new Date().toISOString();

    await db.from("bozi_x_participant_restrictions").upsert({
      x_user_id:claim.x_user_id,
      status:"blacklisted",
      source_quest_id:claim.quest_id,
      reason,
      violated_at:now,
      expires_at:expiresAt,
      updated_at:now
    },{onConflict:"x_user_id"});

    await db.from("bozi_x_quest_claims")
      .update({
        status:"blacklisted",
        violated_at:now,
        violation_reason:reason,
        updated_at:now
      })
      .eq("x_user_id",claim.x_user_id)
      .eq("action","post")
      .in("status",["pending","verified","rewarded"]);

    violations++;
  }

  return NextResponse.json({checked,violations});
}
