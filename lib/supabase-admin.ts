import { createClient as createSupabase } from '@supabase/supabase-js'

// Admin client that bypasses Row-Level Security (RLS)
// Uses the service-role key — only for server-side operations like poster uploads
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    return createSupabase(
        supabaseUrl,
        supabaseKey,
        { auth: { persistSession: false } }
    )
}
