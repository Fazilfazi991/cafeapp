import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { adAccountId, adAccountName, adAccountCurrency } = body

        if (!adAccountId || !adAccountName || !adAccountCurrency) {
            return NextResponse.json({ error: 'Missing ad account details' }, { status: 400 })
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
        }

        const { error } = await supabase
            .from('connected_accounts')
            .update({
                ad_account_id: adAccountId,
                ad_account_name: adAccountName,
                ad_account_currency: adAccountCurrency
            })
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'facebook')

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[META_SELECT_AD_ACCOUNT_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
