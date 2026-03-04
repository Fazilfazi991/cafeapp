import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: restaurants } = await supabase
            .from('restaurants').select('id').eq('user_id', user.id).limit(1)
        const restaurant = restaurants?.[0]
        if (!restaurant) return NextResponse.json({ error: 'No restaurant' })

        const { data: account } = await supabase
            .from('connected_accounts')
            .select('meta_page_id, meta_access_token, meta_ig_id')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'facebook')
            .single()

        if (!account) return NextResponse.json({ error: 'No connected Meta account' })

        // Test 1: Check if the Page token is valid
        const tokenCheckRes = await fetch(
            `https://graph.facebook.com/v19.0/${account.meta_page_id}?fields=name,fan_count&access_token=${account.meta_access_token}`
        )
        const tokenCheck = await tokenCheckRes.json()

        // Test 2: Fetch 3 recent posts from this page to confirm publishing works
        const postsRes = await fetch(
            `https://graph.facebook.com/v19.0/${account.meta_page_id}/feed?limit=3&access_token=${account.meta_access_token}`
        )
        const recentPosts = await postsRes.json()

        return NextResponse.json({
            pageId: account.meta_page_id,
            igId: account.meta_ig_id,
            tokenValid: !tokenCheck.error,
            pageName: tokenCheck.name,
            tokenError: tokenCheck.error || null,
            recentFeedPosts: recentPosts.data || recentPosts.error
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message })
    }
}
