import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.redirect(new URL('/login', req.url))

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (restaurant) {
            await supabase
                .from('connected_accounts')
                .update({ is_active: false, meta_access_token: null, meta_page_id: null, meta_ig_id: null, meta_pages_json: null })
                .eq('restaurant_id', restaurant.id)
                .eq('platform', 'facebook')
        }

        return NextResponse.redirect(new URL('/dashboard/settings', req.url))

    } catch (error: any) {
        console.error('[META_DISCONNECT_ERROR]', error)
        return NextResponse.redirect(new URL('/dashboard/settings?error=disconnect_failed', req.url))
    }
}
