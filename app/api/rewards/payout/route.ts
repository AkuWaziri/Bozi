import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, createWalletClient, http, parseUnits, getAddress, type Address } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const ERC20=[{type:"function",name:"transfer",stateMutability:"nonpayable",inputs:[{name:"to",type:"address"},{name:"amount",type:"uint256"}],outputs:[{type:"bool"}]}] as const;

export async function POST(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, service=process.env.SUPABASE_SERVICE_ROLE_KEY, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const key=process.env.BOZI_REWARD_PRIVATE_KEY, rpc=process.env.BOZI_REWARD_RPC_URL;
 if(!url||!service||!anon)return NextResponse.json({error:"Reward service is not configured."},{status:503});
 const auth=request.headers.get("authorization");const token=auth?.startsWith("Bearer ")?auth.slice(7):null;if(!token)return NextResponse.json({error:"Authentication required."},{status:401});
 const authDb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:user,error}=await authDb.auth.getUser(token);if(error||!user.user)return NextResponse.json({error:"Invalid session."},{status:401});
 const body=await request.json().catch(()=>null);const claimId=typeof body?.claimId==="string"?body.claimId:"";if(!claimId)return NextResponse.json({error:"Reward claim is required."},{status:400});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:xClaim}=await db.from("bozi_x_quest_claims").select("*").eq("id",claimId).eq("user_id",user.user.id).maybeSingle();
 const claim=xClaim;
 if(!claim){
   const {data:educational}=await db.from("bozi_quest_reward_claims").select("*").eq("id",claimId).eq("user_id",user.user.id).eq("reward_type","stablecoin").maybeSingle();
   if(!educational)return NextResponse.json({error:"Reward claim not found."},{status:404});
   const {data:profile}=await db.from("bozi_profiles").select("wallet_address").eq("user_id",user.user.id).maybeSingle();
   if(!profile?.wallet_address)return NextResponse.json({error:"Connect a wallet before receiving the stablecoin reward."},{status:400});
   if(educational.status==="confirmed")return NextResponse.json({status:"confirmed",txHash:educational.tx_hash});
   if(!key)return NextResponse.json({status:"pending",message:"Stablecoin payout is queued for the configured payout signer."});
   if(educational.chain_id!==8453)return NextResponse.json({error:"Unsupported payout network."},{status:400});
   let recipient:Address,tokenAddress:Address;try{recipient=getAddress(profile.wallet_address);tokenAddress=getAddress(educational.token_address)}catch{return NextResponse.json({error:"Invalid payout address."},{status:400})}
   const locked=await db.from("bozi_quest_reward_claims").update({status:"processing",updated_at:new Date().toISOString()}).eq("id",claimId).eq("status","pending").select("id").maybeSingle();
   if(!locked.data)return NextResponse.json({status:"pending",message:"Another payout attempt is already processing."});
   try{
     const account=privateKeyToAccount(key as `0x${string}`),transport=http(rpc||"https://mainnet.base.org"),wallet=createWalletClient({account,chain:base,transport}),publicClient=createPublicClient({chain:base,transport});
     const hash=await wallet.writeContract({address:tokenAddress,abi:ERC20,functionName:"transfer",args:[recipient,parseUnits(String(educational.amount_numeric),6)]});
     await publicClient.waitForTransactionReceipt({hash});
     await db.from("bozi_quest_reward_claims").update({status:"confirmed",tx_hash:hash,updated_at:new Date().toISOString()}).eq("id",claimId);
     return NextResponse.json({status:"confirmed",txHash:hash});
   }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Payout failed."},{status:500})}
 }
 if(!claim.stablecoin_enabled)return NextResponse.json({status:"not_required"});
 if(claim.payout_status==="confirmed")return NextResponse.json({status:"confirmed",txHash:claim.payout_tx_hash});
 if(claim.payout_status==="processing")return NextResponse.json({status:"pending",message:"Another payout attempt is already processing."});
 if(!key)return NextResponse.json({status:"pending",message:"Stablecoin payout is queued for the configured payout signer."});
 if(claim.stablecoin_chain_id!==8453)return NextResponse.json({error:"Unsupported payout network."},{status:400});
 let recipient:Address,tokenAddress:Address;try{recipient=getAddress(claim.payout_wallet);tokenAddress=getAddress(claim.stablecoin_token_address)}catch{return NextResponse.json({error:"Invalid payout configuration."},{status:400})}
 const locked=await db.from("bozi_x_quest_claims").update({payout_status:"processing",updated_at:new Date().toISOString()}).eq("id",claimId).eq("payout_status","pending").select("id").maybeSingle();
 if(!locked.data)return NextResponse.json({status:"pending",message:"Another payout attempt is already processing."});
 try{
   const account=privateKeyToAccount(key as `0x${string}`),transport=http(rpc||"https://mainnet.base.org"),wallet=createWalletClient({account,chain:base,transport}),publicClient=createPublicClient({chain:base,transport});
   const hash=await wallet.writeContract({address:tokenAddress,abi:ERC20,functionName:"transfer",args:[recipient,parseUnits(String(claim.stablecoin_amount),Number(claim.stablecoin_decimals))]});
   await publicClient.waitForTransactionReceipt({hash});
   await db.from("bozi_x_quest_claims").update({payout_status:"confirmed",payout_tx_hash:hash,updated_at:new Date().toISOString()}).eq("id",claimId);
   return NextResponse.json({status:"confirmed",txHash:hash});
 }catch(e){await db.from("bozi_x_quest_claims").update({payout_status:"failed",updated_at:new Date().toISOString()}).eq("id",claimId);return NextResponse.json({error:e instanceof Error?e.message:"Payout failed."},{status:500})}
}
