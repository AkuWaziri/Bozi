# Bozi

Bozi is a creator-campaign marketplace built for **Base**. Brands publish clear campaign briefs and funded rewards; creators join, submit public work, and receive rewards when submissions are approved.

## Product flow
1. A brand connects a wallet on Base and creates a campaign brief.
2. The brand funds creator rewards in USDC on Base; a 5% protocol fee is shown separately.
3. Creators join eligible campaigns and submit public work links.
4. The campaign owner reviews submissions and approves or rejects them.
5. Approved work is paid in USDC from the campaign escrow. Unused funds can be refunded after the deadline once all participants are finalized.

## Stack
- Next.js / React / TypeScript
- Supabase for profiles, campaign metadata, submissions, and payout receipts
- Base mainnet (chain ID 8453)
- Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Solidity escrow contract in `contracts/BoziCampaignEscrow.sol`

## Configuration
Set these in the Vercel project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BOZI_ESCROW_ADDRESS` (after deploying and verifying `BoziCampaignEscrow` on Base)

Never put a Supabase service-role key in the browser. The contract constructor requires the Base USDC address and the designated protocol fee recipient.

## Important launch status
The current interface is the first marketplace migration. Campaign creation is currently a draft workflow; the escrow contract is source code only until it is tested, deployed, verified, and wired to the frontend. Do not represent draft campaigns as funded or treat a database status as proof of an on-chain payment. Before production, connect campaign creation, joining, submission, review and payout actions to the escrow and verify Base receipts server-side.

## Local checks
- `npm install`
- `npm run build`
- `forge test` (Foundry installed)

