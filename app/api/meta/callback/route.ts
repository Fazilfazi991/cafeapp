import { createClient } from '@/lib/supabase-server'
import { exchangeCodeForTokens, getMetaAccounts, getMetaAdAccounts } from '@/lib/meta'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const stateParam = url.searchParams.get('state') // This is the restaurantId mapped via state param
        const error = url.searchParams.get('error')

        if (error || !code || !stateParam) {
            console.error('[META_CALLBACK_ERROR] Missing valid code or state', { error })
            return NextResponse.redirect(new URL('/dashboard/settings?error=meta_auth_failed', request.url))
        }

        // Check if state has _ad suffix indicating Ad connection
        const isAdConnection = stateParam.endsWith('_ad');
        const restaurantId = isAdConnection ? stateParam.replace('_ad', '') : stateParam;
        
        const supabase = createClient()

        // 1. Exchange OAuth code for a long-lived User Access Token
        const userTokenData = await exchangeCodeForTokens(code)

        // Calculate expiration date (usually 60 days from now)
        const expiresInMs = (userTokenData.expiresIn || 5184000) * 1000;
        const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

        // Check if an existing Meta connected_account exists
        const { data: existingAccount } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('platform', 'facebook')
            .maybeSingle()

        let payload: any = {
            meta_user_access_token: userTokenData.accessToken,
            meta_token_expires_at: expiresAt,
            is_active: true
        }

        if (isAdConnection) {
            // Fetch Ad Accounts
            const adAccounts = await getMetaAdAccounts(userTokenData.accessToken);
            if (adAccounts.length === 0) {
                // Not returning error because maybe they don't have ad accounts but it's fine, we just update the token
                console.warn('[META_CALLBACK] No Ad accounts found for this user.');
            }
            
            payload = {
                ...payload,
                ad_accounts_json: adAccounts
            }
            
            // If they have exactly one ad account, auto-select it. Otherwise, force selection in UI.
            if (adAccounts.length === 1) {
                payload.ad_account_id = adAccounts[0].id;
                payload.ad_account_name = adAccounts[0].name;
                payload.ad_account_currency = adAccounts[0].currency;
            } else {
                // Clear any existing selected ad account so they are forced to choose
                payload.ad_account_id = null;
                payload.ad_account_name = null;
                payload.ad_account_currency = null;
            }

        } else {
            // Fetch the Facebook Pages and attached Instagram accounts
            const pages = await getMetaAccounts(userTokenData.accessToken)
            
            if (pages.length === 0 && !existingAccount) {
                return NextResponse.redirect(new URL('/dashboard/settings?error=no_facebook_pages_found', request.url))
            }
            
            const targetPage = pages.length > 0 ? pages[0] : null;

            if (targetPage) {
                payload = {
                    ...payload,
                    meta_access_token: targetPage.access_token,
                    meta_page_id: targetPage.id,
                    meta_ig_id: targetPage.meta_ig_id,
                    meta_pages_json: pages,
                }
            }
        }

        if (existingAccount) {
            const { error: updateErr } = await supabase
                .from('connected_accounts')
                .update(payload)
                .eq('id', existingAccount.id)
            if (updateErr) throw new Error(`DB Update Error: ${updateErr.message}`)
        } else {
            const { error: insertErr } = await supabase
                .from('connected_accounts')
                .insert({ restaurant_id: restaurantId, platform: 'facebook', ...payload })
            if (insertErr) throw new Error(`DB Insert Error: ${insertErr.message}`)
        }

        return NextResponse.redirect(new URL('/dashboard/settings?success=meta_connected', request.url))


    } catch (error: any) {
        console.error('[META_CALLBACK_ERROR_FATAL]', error)
        return NextResponse.redirect(new URL(`/dashboard/settings?error=${encodeURIComponent(error.message || 'meta_callback_failed')}`, request.url))
    }
}
