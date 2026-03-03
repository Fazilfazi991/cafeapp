import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

        const { data: account } = await supabase
            .from('connected_accounts')
            .select('meta_pages_json, meta_page_id')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'facebook')
            .single()

        if (!account) return NextResponse.json({ error: 'Meta not connected' }, { status: 404 })

        return NextResponse.json({
            pages: account.meta_pages_json || [],
            selectedPageId: account.meta_page_id
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
