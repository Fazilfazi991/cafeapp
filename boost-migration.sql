-- Add Boost fields to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS boost_campaign_id text,
ADD COLUMN IF NOT EXISTS boost_ad_id text,
ADD COLUMN IF NOT EXISTS boost_budget numeric,
ADD COLUMN IF NOT EXISTS boost_duration_days int,
ADD COLUMN IF NOT EXISTS boost_status text,
ADD COLUMN IF NOT EXISTS boost_reach int,
ADD COLUMN IF NOT EXISTS boost_spend numeric;

-- Add Ad Account fields to connected_accounts table
ALTER TABLE connected_accounts
ADD COLUMN IF NOT EXISTS ad_account_id text,
ADD COLUMN IF NOT EXISTS ad_account_name text,
ADD COLUMN IF NOT EXISTS ad_account_currency text,
ADD COLUMN IF NOT EXISTS ad_accounts_json jsonb;
