import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getMetaAccounts } from '@/lib/meta'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { pageId } = await req.json()
        if (!pageId) return NextResponse.json({ error: 'pageId is required' }, { status: 400 })

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

        const { data: account } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'facebook')
            .single()

        if (!account?.meta_pages_json) return NextResponse.json({ error: 'No pages found. Please reconnect Meta.' }, { status: 404 })

        // Find the chosen page in the saved list
        const pages = account.meta_pages_json as any[]
        const chosenPage = pages.find((p: any) => p.id === pageId)
        if (!chosenPage) return NextResponse.json({ error: 'Page not found in connected list' }, { status: 404 })

        // Fetch the instagram_business_account for the chosen page
        let igId = chosenPage.meta_ig_id || null
        if (!igId) {
            try {
                const igRes = await fetch(`https://graph.facebook.com/v19.0/${chosenPage.id}?fields=instagram_business_account&access_token=${chosenPage.access_token}`)
                const igData = await igRes.json()
                igId = igData.instagram_business_account?.id || null
            } catch (e) {
                igId = null
            }
        }

        await supabase
            .from('connected_accounts')
            .update({
                meta_page_id: chosenPage.id,
                meta_access_token: chosenPage.access_token,
                meta_ig_id: igId,
            })
            .eq('id', account.id)

        return NextResponse.json({ success: true, pageName: chosenPage.name })

    } catch (error: any) {
        console.error('[META_SELECT_PAGE_ERROR]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
