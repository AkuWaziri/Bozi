import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request:NextRequest){
 const expected=process.env.CRON_SECRET;if(expected&&request.headers.get("authorization")!==`Bearer ${expected}`)return NextResponse.json({error:"Unauthorized"},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY,bearer=process.env.X_BEARER_TOKEN;
 if(!url||!service||!bearer)return NextResponse.json({error:"Monitor is not configured."},{status:503});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:claims}=await db.from("bozi_x_quest_claims").select("id,quest_id,x_user_id,action,post_id,status").eq("status","rewarded").limit(100);
 let checked=0,violations=0;
 for(const claim of claims??[]){
   const {data:q}=await db.from("bozi_quests").select("id,x_action,x_target_username,x_target_user_id").eq("id",claim.quest_id).maybeSingle();
   if(!q)continue;
   let violated=false,reason="";
   if(claim.action==="post"&&claim.post_id){
     const r=await fetch(`https://api.x.com/2/tweets/${claim.post_id}?tweet.fields=id,author_id`,{headers:{Authorization:`Bearer ${bearer}`},cache:"no-store"});
     if(!r.ok){violated=true;reason="Rewarded X post is no longer available."}
     else{const j=await r.json();if(!j?.data?.id||j.data.author_id!==claim.x_user_id){violated=true;reason="Rewarded X post no longer belongs to the verified account."}}
   }else if(claim.action==="follow"){
     let target=q.x_target_user_id as string|null;
     if(!target&&q.x_target_username){const tr=await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(q.x_target_username.replace(/^@/,""))}`,{headers:{Authorization:`Bearer ${bearer}`},cache:"no-store"});if(tr.ok){const tj=await tr.json();target=tj?.data?.id??null}}
     if(target){
       let next="",following=false;
       for(let page=0;page<10&&!following;page++){
         const u=new URL(`https://api.x.com/2/users/${claim.x_user_id}/following`);u.searchParams.set("max_results","1000");if(next)u.searchParams.set("pagination_token",next);
         const fr=await fetch(u,{headers:{Authorization:`Bearer ${bearer}`},cache:"no-store"});if(!fr.ok)break;
         const fj=await fr.json();following=Array.isArray(fj?.data)&&fj.data.some((x:any)=>String(x.id)===String(target));next=fj?.meta?.next_token??"";if(!next)break;
       }
       if(!following){violated=true;reason="Rewarded X follow relationship is no longer active."}
     }
   }
   checked++;
   if(violated){
     await db.from("bozi_x_participant_restrictions").upsert({x_user_id:claim.x_user_id,status:"blacklisted",source_quest_id:claim.quest_id,reason,violated_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"x_user_id"});
     await db.from("bozi_x_quest_claims").update({status:"blacklisted",violated_at:new Date().toISOString(),violation_reason:reason,updated_at:new Date().toISOString()}).eq("x_user_id",claim.x_user_id).in("status",["pending","verified","rewarded"]);
     violations++;
   }
 }
 return NextResponse.json({checked,violations});
}
