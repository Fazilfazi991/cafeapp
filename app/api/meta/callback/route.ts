import { createClient } from '@/lib/supabase-server'
import { exchangeCodeForTokens, getMetaAccounts } from '@/lib/meta'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state') // This is the restaurantId mapped via state param
        const error = url.searchParams.get('error')

        if (error || !code || !state) {
            console.error('[META_CALLBACK_ERROR] Missing valid code or state', { error })
            return NextResponse.redirect(new URL('/dashboard/settings?error=meta_auth_failed', request.url))
        }

        const restaurantId = state
        const supabase = createClient()

        // 1. Exchange OAuth code for a long-lived User Access Token
        const userAccessToken = await exchangeCodeForTokens(code)

        // 2. Fetch the Facebook Pages and attached Instagram accounts
        const pages = await getMetaAccounts(userAccessToken)

        if (pages.length === 0) {
            return NextResponse.redirect(new URL('/dashboard/settings?error=no_facebook_pages_found', request.url))
        }

        // For simplicity, we just take the first FB page the user authorized
        const targetPage = pages[0]

        // 3. Check if an existing Meta connected_account exists
        const { data: existingAccount } = await supabase
            .from('connected_accounts')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .eq('platform', 'facebook')
            .single()

        const payload = {
            meta_access_token: targetPage.access_token,
            meta_page_id: targetPage.id,
            meta_page_name: targetPage.name,
            meta_ig_id: targetPage.meta_ig_id,
            meta_pages_json: pages, // Save ALL pages so user can pick later
            is_active: true
        }

        if (existingAccount) {
            await supabase
                .from('connected_accounts')
                .update(payload)
                .eq('id', existingAccount.id)
        } else {
            await supabase
                .from('connected_accounts')
                .insert({ restaurant_id: restaurantId, platform: 'facebook', ...payload })
        }

        return NextResponse.redirect(new URL('/dashboard/settings?success=meta_connected', request.url))

    } catch (error) {
        console.error('[META_CALLBACK_ERROR_FATAL]', error)
        return NextResponse.redirect(new URL('/dashboard/settings?error=meta_callback_failed', request.url))
    }
}
