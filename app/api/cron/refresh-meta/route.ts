import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Setup a Supabase client with the Service Role key to bypass RLS for background jobs
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
    try {
        // Authenticate the cron request to ensure only Vercel (or authorized callers) can trigger it
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('[CRON_META_REFRESH] Starting daily token refresh check...')

        // Calculate the threshold date (10 days from now).
        // If a token expires BEFORE this threshold, we need to refresh it.
        const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()

        // Find all connected Facebook accounts where the token expires soon (or has already expired)
        const { data: accountsToRefresh, error: fetchError } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('platform', 'facebook')
            .not('meta_user_access_token', 'is', null)
            .lte('meta_token_expires_at', tenDaysFromNow)

        if (fetchError) {
            throw new Error(`Failed to fetch accounts to refresh: ${fetchError.message}`)
        }

        console.log(`[CRON_META_REFRESH] Found ${accountsToRefresh.length} accounts needing refresh.`)

        let refreshedCount = 0
        const errors: any[] = []

        const META_CLIENT_ID = process.env.META_CLIENT_ID!
        const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET!

        // Loop through each account and attempt to refresh the token using Facebook's Token Exchange endpoint
        for (const account of accountsToRefresh) {
            try {
                console.log(`Refreshing Meta token for account ID: ${account.id}`)

                const params = new URLSearchParams({
                    grant_type: 'fb_exchange_token',
                    client_id: META_CLIENT_ID,
                    client_secret: META_CLIENT_SECRET,
                    fb_exchange_token: account.meta_user_access_token,
                })

                const response = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`)

                if (!response.ok) {
                    const errText = await response.text()
                    throw new Error(`Meta API Error: ${errText}`)
                }

                const data = await response.json()

                // Usually returns { access_token, token_type, expires_in }
                const newAccessToken = data.access_token
                const expiresInMs = (data.expires_in || 5184000) * 1000
                const newExpiresAt = new Date(Date.now() + expiresInMs).toISOString()

                // Update the database with the new token and new expiration date
                const { error: updateError } = await supabase
                    .from('connected_accounts')
                    .update({
                        meta_user_access_token: newAccessToken,
                        meta_token_expires_at: newExpiresAt,
                    })
                    .eq('id', account.id)

                if (updateError) {
                    throw new Error(`Failed to update DB: ${updateError.message}`)
                }

                refreshedCount++
            } catch (err: any) {
                console.error(`[CRON_META_REFRESH] Error refreshing account ${account.id}:`, err)
                errors.push({ accountId: account.id, error: err.message })
            }
        }

        console.log(`[CRON_META_REFRESH] Completed. Refreshed: ${refreshedCount}, Errors: ${errors.length}`)

        return NextResponse.json({
            success: true,
            totalChecked: accountsToRefresh.length,
            refreshedCount,
            errors,
        })

    } catch (error: any) {
        console.error('[CRON_META_REFRESH_FATAL]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
