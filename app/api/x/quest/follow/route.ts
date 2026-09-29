import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const bearer=process.env.X_BEARER_TOKEN;

export async function POST(request:NextRequest){
 if(!url||!anon||!bearer)return NextResponse.json({error:"X verification is not configured."},{status:503});
 const auth=request.headers.get("authorization");const token=auth?.startsWith("Bearer ")?auth.slice(7):null;if(!token)return NextResponse.json({error:"Authentication required."},{status:401});
 const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:user,error:userError}=await db.auth.getUser(token);if(userError||!user.user)return NextResponse.json({error:"Invalid session."},{status:401});
 const body=await request.json().catch(()=>null);const questId=typeof body?.questId==="string"?body.questId:"";if(!questId)return NextResponse.json({error:"Quest is required."},{status:400});
 const {data:q,error:qe}=await db.from("bozi_quests").select("id,x_action,x_target_username,x_target_user_id,status,quest_type").eq("id",questId).eq("status","published").eq("quest_type","x").maybeSingle();
 if(qe||!q||q.x_action!=="follow")return NextResponse.json({error:"This is not an active X Follow quest."},{status:400});
 const {data:p}=await db.from("bozi_profiles").select("x_user_id,wallet_address").eq("user_id",user.user.id).maybeSingle();if(!p?.x_user_id)return NextResponse.json({error:"Connect your X account in Profile first."},{status:400});
 const restricted=await db.rpc("bozi_is_x_restricted",{p_x_user_id:p.x_user_id});if(restricted.data)return NextResponse.json({error:"This X account is permanently restricted from X campaigns."},{status:403});
 let target=q.x_target_user_id as string|null;
 if(!target&&q.x_target_username){const tr=await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(q.x_target_username.replace(/^@/,""))}`,{headers:{Authorization:`Bearer ${bearer}`},cache:"no-store"});if(!tr.ok)return NextResponse.json({error:"Unable to resolve the campaign X account."},{status:400});const tj=await tr.json();target=tj?.data?.id??null;}
 if(!target)return NextResponse.json({error:"Campaign target X account is not configured."},{status:400});
 let next="";let following=false;
 for(let page=0;page<10&&!following;page++){
   const endpoint=new URL(`https://api.x.com/2/users/${p.x_user_id}/following`);
   endpoint.searchParams.set("max_results","1000");if(next)endpoint.searchParams.set("pagination_token",next);
   const fr=await fetch(endpoint,{headers:{Authorization:`Bearer ${bearer}`},cache:"no-store"});if(!fr.ok)return NextResponse.json({error:"X could not verify the follow relationship."},{status:400});
   const fj=await fr.json();following=Array.isArray(fj?.data)&&fj.data.some((u:any)=>String(u.id)===String(target));next=fj?.meta?.next_token??"";if(!next)break;
 }
 if(!following)return NextResponse.json({error:"X does not show that you follow the campaign account yet."},{status:400});
 const {data:claim,error:ce}=await db.rpc("bozi_claim_x_reward",{p_quest_id:questId,p_x_user_id:p.x_user_id,p_action:"follow"});
 if(ce)return NextResponse.json({error:ce.message},{status:400});
 const r=Array.isArray(claim)?claim[0]:claim;
 return NextResponse.json({verified:true,claimId:r?.claim_id,pointsAwarded:Number(r?.points_awarded??0),stablecoinEnabled:Boolean(r?.stablecoin_enabled),stablecoinAmount:r?.stablecoin_amount??null,stablecoinSymbol:r?.stablecoin_symbol??null});
}
