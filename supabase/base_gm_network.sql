insert into public.bozi_gm_networks (
  network_key,
  display_name,
  chain_id,
  contract_address,
  explorer_tx_base_url,
  fee_token_symbol,
  fee_token_address,
  enabled
)
values (
  'base',
  'Base Mainnet',
  8453,
  '0xF46Fb1285e56e38077814B212F93ea5DD0CacCd1',
  'https://basescan.org/tx/',
  'USDC',
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  true
)
on conflict (network_key) do update
set
  display_name = excluded.display_name,
  chain_id = excluded.chain_id,
  contract_address = excluded.contract_address,
  explorer_tx_base_url = excluded.explorer_tx_base_url,
  fee_token_symbol = excluded.fee_token_symbol,
  fee_token_address = excluded.fee_token_address,
  enabled = true;
