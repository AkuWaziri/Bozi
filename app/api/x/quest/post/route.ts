import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const bearer=process.env.X_BEARER_TOKEN;

function postId(value:string){return value.match(/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i)?.[1]??null}
function relevant(text:string, quest:{title:string;summary:string|null;x_instructions:string|null}){
 const source=[quest.title,quest.summary,quest.x_instructions].filter(Boolean).join(" ").toLowerCase();
 const words=[...new Set(source.split(/[^a-z0-9]+/).filter(w=>w.length>=5))];
 return !words.length || words.some(w=>text.toLowerCase().includes(w));
}

export async function POST(request:NextRequest){
 if(!url||!anon||!bearer)return NextResponse.json({error:"X verification is not configured."},{status:503});
 const auth=request.headers.get("authorization");const token=auth?.startsWith("Bearer ")?auth.slice(7):null;
 if(!token)return NextResponse.json({error:"Authentication required."},{status:401});
 const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:user,error:userError}=await db.auth.getUser(token);if(userError||!user.user)return NextResponse.json({error:"Invalid session."},{status:401});
 const body=await request.json().catch(()=>null);const questId=typeof body?.questId==="string"?body.questId:"";const postUrl=typeof body?.postUrl==="string"?body.postUrl.trim():"";const id=postId(postUrl);
 if(!questId||!id)return NextResponse.json({error:"Enter a valid X post URL."},{status:400});
 const {data:q,error:qe}=await db.from("bozi_quests").select("id,title,summary,x_action,x_instructions,reward_points_enabled,reward_points,reward_stablecoin_enabled,reward_stablecoin_symbol,reward_stablecoin_amount,status,quest_type,quest_starts_at,quest_expires_at").eq("id",questId).eq("status","published").eq("quest_type","x").maybeSingle();
 if(qe||!q||q.x_action!=="post")return NextResponse.json({error:"This is not an active X Post quest."},{status:400});
 const now=Date.now();const start=new Date(q.quest_starts_at).getTime();const end=q.quest_expires_at?new Date(q.quest_expires_at).getTime():Infinity;if(now<start)return NextResponse.json({error:"This X quest has not started yet."},{status:403});if(now>=end)return NextResponse.json({error:"This X quest has expired."},{status:403});\n const {data:p}=await db.from("bozi_profiles").select("x_user_id,wallet_address").eq("user_id",user.user.id).maybeSingle();
 if(!p?.x_user_id)return NextResponse.json({error:"Connect your X account in Profile first."},{status:400});
 const xrUser=await fetch(`https://api.x.com/2/users/${p.x_user_id}?user.fields=verified,verified_type`,{headers:{Authorization:`Bearer ${bearer}`},cache:"no-store"});
 if(!xrUser.ok)return NextResponse.json({error:"X verification could not confirm your account status. Try again."},{status:503});
 const xu=await xrUser.json();
 if(xu?.data?.verified!==true)return NextResponse.json({error:"You must have an active blue verified check on X to participate in X quests."},{status:403});
 const restricted=await db.rpc("bozi_is_x_restricted",{p_x_user_id:p.x_user_id});if(restricted.data)return NextResponse.json({error:"This X account is temporarily restricted from X campaigns after a deleted rewarded post."},{status:403});
 const xr=await fetch(`https://api.x.com/2/tweets/${id}?tweet.fields=author_id,text,created_at`,{headers:{Authorization:`Bearer ${bearer}`},cache:"no-store"});
 if(!xr.ok)return NextResponse.json({error:"X could not verify that post."},{status:400});
 const xd=await xr.json();const tweet=xd?.data;
 if(!tweet?.id||!tweet?.author_id||typeof tweet.text!=="string")return NextResponse.json({error:"X post not found."},{status:400});
 if(tweet.author_id!==p.x_user_id)return NextResponse.json({error:"That post is not from your connected X account."},{status:400});
 if(!relevant(tweet.text,q))return NextResponse.json({error:"The post does not satisfy this campaign's requirements."},{status:400});
 const {data:claim,error:ce}=await db.rpc("bozi_claim_x_reward",{p_quest_id:questId,p_x_user_id:p.x_user_id,p_action:"post",p_post_url:postUrl,p_post_id:id});
 if(ce)return NextResponse.json({error:ce.message},{status:400});
 const r=Array.isArray(claim)?claim[0]:claim;
 return NextResponse.json({verified:true,claimId:r?.claim_id,pointsAwarded:Number(r?.points_awarded??0),stablecoinEnabled:Boolean(r?.stablecoin_enabled),stablecoinAmount:r?.stablecoin_amount??null,stablecoinSymbol:r?.stablecoin_symbol??null});
}
