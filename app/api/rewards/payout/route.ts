import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, createWalletClient, http, parseUnits, getAddress } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const ERC20=[{type:"function",name:"transfer",stateMutability:"nonpayable",inputs:[{name:"to",type:"address"},{name:"amount",type:"uint256"}],outputs:[{type:"bool"}]}] as const;

export async function POST(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, key=process.env.BOZI_REWARD_PRIVATE_KEY, rpc=process.env.BOZI_REWARD_RPC_URL;
 if(!url||!service||!anon)return NextResponse.json({error:"Reward service is not configured."},{status:503});
 const auth=request.headers.get("authorization");const token=auth?.startsWith("Bearer ")?auth.slice(7):null;if(!token)return NextResponse.json({error:"Authentication required."},{status:401});
 const authDb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:user,error}=await authDb.auth.getUser(token);if(error||!user.user)return NextResponse.json({error:"Invalid session."},{status:401});
 const body=await request.json().catch(()=>null);const claimId=typeof body?.claimId==="string"?body.claimId:"";if(!claimId)return NextResponse.json({error:"Reward claim is required."},{status:400});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:claim}=await db.from("bozi_x_quest_claims").select("*").eq("id",claimId).eq("user_id",user.user.id).maybeSingle();
 if(!claim)return NextResponse.json({error:"Reward claim not found."},{status:404});
 if(!claim.stablecoin_enabled)return NextResponse.json({status:"not_required"});
 if(claim.payout_status==="confirmed")return NextResponse.json({status:"confirmed",txHash:claim.payout_tx_hash});
 if(!key)return NextResponse.json({status:"pending",message:"Stablecoin payout is queued for the configured payout signer."});
 if(Number(claim.stablecoin_amount)<=0||claim.stablecoin_chain_id!==8453)return NextResponse.json({error:"Unsupported payout configuration."},{status:400});
 let recipient:string;try{recipient=getAddress(claim.payout_wallet)}catch{return NextResponse.json({error:"Invalid payout wallet."},{status:400})}
 let tokenAddress:string;try{tokenAddress=getAddress(claim.stablecoin_token_address)}catch{return NextResponse.json({error:"Invalid stablecoin token."},{status:400})}
 const account=privateKeyToAccount(key as `0x${string}`);
 const transport=http(rpc||"https://mainnet.base.org");
 const wallet=createWalletClient({account,chain:base,transport});
 const publicClient=createPublicClient({chain:base,transport});
 const amount=parseUnits(String(claim.stablecoin_amount),Number(claim.stablecoin_decimals));
 await db.from("bozi_x_quest_claims").update({payout_status:"pending",updated_at:new Date().toISOString()}).eq("id",claimId);
 try{
   const hash=await wallet.writeContract({address:tokenAddress,abi:ERC20,functionName:"transfer",args:[recipient,amount]});
   await publicClient.waitForTransactionReceipt({hash});
   await db.from("bozi_x_quest_claims").update({payout_status:"confirmed",payout_tx_hash:hash,rewarded_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",claimId);
   return NextResponse.json({status:"confirmed",txHash:hash});
 }catch(e){
   await db.from("bozi_x_quest_claims").update({payout_status:"failed",updated_at:new Date().toISOString()}).eq("id",claimId);
   return NextResponse.json({error:e instanceof Error?e.message:"Payout failed."},{status:500});
 }
}
