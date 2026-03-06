-- 1. Add WhatsApp credentials to connected_accounts table
ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id text;
ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS whatsapp_business_account_id text;
ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS whatsapp_access_token text;
ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS whatsapp_phone_number text;

-- 2. Create contacts table for WhatsApp broadcasting
CREATE TABLE IF NOT EXISTS contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    name text,
    phone_number text NOT NULL,
    group_name text,
    opted_out boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Index for faster querying of contacts by restaurant
CREATE INDEX IF NOT EXISTS idx_contacts_restaurant_id ON contacts(restaurant_id);

-- 3. Add WhatsApp specific tracking columns to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS whatsapp_custom_message text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS whatsapp_target_group text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS whatsapp_delivered_count integer DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS whatsapp_failed_count integer DEFAULT 0;
