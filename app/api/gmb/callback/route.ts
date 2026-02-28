import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { exchangeCodeForTokens, getGMBAccounts, getGMBLocations } from '@/lib/gmb'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state') // restaurantId

        if (!code || !state) {
            return NextResponse.json({ error: 'Missing code or state parameters' }, { status: 400 })
        }

        console.log('[GMB_CALLBACK_START] received code and state:', { hasCode: !!code, state });
        const tokens = await exchangeCodeForTokens(code)
        console.log('[GMB_CALLBACK_TOKENS] exchanged successfully:', { hasAccess: !!tokens.access_token, hasRefresh: !!tokens.refresh_token });

        let accountId = null;
        let locationName = null;
        let accountName = null;

        try {
            console.log('[GMB_CALLBACK_FETCHING_ACCOUNTS] using access token');
            const accounts = await getGMBAccounts(tokens.access_token)
            console.log('[GMB_CALLBACK_ACCOUNTS_RES]', accounts?.length || 0, 'accounts found');
            if (accounts && accounts.length > 0) {
                const account = accounts[0]
                // account.name is like "accounts/123456"
                accountId = account.name.split('/')[1]
                accountName = account.accountName

                const locations = await getGMBLocations(accountId, tokens.access_token)
                if (locations && locations.length > 0) {
                    locationName = locations[0].name
                }
            }
        } catch (err) {
            console.error('[GMB_CALLBACK_ACCOUNTS_ERROR]', err)
        }

        const supabase = createClient()

        const { data: existingAccounts } = await supabase
            .from('connected_accounts')
            .select('id')
            .eq('restaurant_id', state)
            .eq('platform', 'gmb')

        const payload = {
            restaurant_id: state,
            platform: 'gmb',
            google_access_token: tokens.access_token,
            google_refresh_token: tokens.refresh_token,
            gmb_account_id: accountId,
            token_expires_at: tokens.expires_at,
            is_active: true
        }

        if (existingAccounts && existingAccounts.length > 0) {
            const { error: updateError } = await supabase
                .from('connected_accounts')
                .update(payload)
                .eq('id', existingAccounts[0].id)

            if (updateError) throw updateError
        } else {
            const { error: insertError } = await supabase
                .from('connected_accounts')
                .insert(payload)

            if (insertError) throw insertError
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${appUrl}/dashboard/settings?gmb=success`)

    } catch (error: any) {
        console.error('[GMB_CALLBACK_ERROR]', error)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${appUrl}/dashboard/settings?gmb=error`)
    }
}
