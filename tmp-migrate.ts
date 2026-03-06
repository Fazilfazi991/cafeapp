import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addMetaColumns() {
    console.log("Checking and adding meta token columns...");

    // There is no direct DDL RPC by default, but we can try to just use edge functions or the SQL editor.
    // However, users usually run migrations manually in the dashboard, or we can use a raw REST query if pg_exec exists.
    // Let's check if the columns exist or try to just insert dummy data and catch the error.
    console.log("Please run this SQL in your Supabase SQL Editor:");
    console.log("");
    console.log("ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS meta_user_access_token text;");
    console.log("ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS meta_token_expires_at timestamp with time zone;");
    console.log("");
}

addMetaColumns();
