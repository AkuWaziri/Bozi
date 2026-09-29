-- Bozi X blue-check eligibility
alter table public.bozi_profiles
  add column if not exists x_verified boolean not null default false;

-- Existing connections are rechecked live when an X quest is claimed.
-- This column is informational/UI state and is refreshed on OAuth reconnect.
