import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) throw new Error('Restaurant not found')

        // Update connected account to remove ad fields
        const { error: updateErr } = await supabase
            .from('connected_accounts')
            .update({
                ad_account_id: null,
                ad_account_name: null,
                ad_account_currency: null,
                ad_accounts_json: null
            })
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'facebook')

        if (updateErr) throw updateErr

        return NextResponse.redirect(new URL('/dashboard/settings?success=ad_account_disconnected', request.url))

    } catch (error) {
        console.error('[META_AD_DISCONNECT_ERROR]', error)
        return NextResponse.redirect(new URL('/dashboard/settings?error=disconnect_failed', request.url))
    }
}
