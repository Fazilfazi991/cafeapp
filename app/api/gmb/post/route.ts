import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createGMBPost, getValidGmbToken } from '@/lib/gmb'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { imageUrl, caption, postId } = body

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id, plan')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
        }

        const { data: account } = await supabase
            .from('connected_accounts')
            .select('id')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'gmb')
            .single()

        if (!account) {
            return NextResponse.json({ error: 'GMB account not configured' }, { status: 400 })
        }

        if (!imageUrl || !caption) {
            return NextResponse.json({ error: 'Missing image or caption' }, { status: 400 })
        }

        const accessToken = await getValidGmbToken(restaurant.id)

        // Fetch location dynamically
        const { getGMBAccounts, getGMBLocations } = await import('@/lib/gmb')
        const accounts = await getGMBAccounts(accessToken)
        if (!accounts || accounts.length === 0) {
            return NextResponse.json({ error: 'No GMB accounts found for this user' }, { status: 400 })
        }
        const accountId = accounts[0].name.split('/')[1]

        const locations = await getGMBLocations(accountId, accessToken)
        if (!locations || locations.length === 0) {
            return NextResponse.json({ error: 'No GMB locations found for this account' }, { status: 400 })
        }
        const locationName = locations[0].name

        const gmbPostId = await createGMBPost(locationName, imageUrl, caption, accessToken)

        if (postId) {
            await supabase
                .from('posts')
                .update({ status: 'published', published_at: new Date().toISOString() })
                .eq('id', postId)
                .eq('restaurant_id', restaurant.id)
        } else {
            // If there's no postId, we can insert it as a completed record
            await supabase.from('posts').insert({
                restaurant_id: restaurant.id,
                platforms: ['gmb'],
                post_type: 'image',
                poster_url: imageUrl,
                selected_caption: caption,
                status: 'published',
                published_at: new Date().toISOString()
            })
        }

        return NextResponse.json({ success: true, gmbPostId })

    } catch (error: any) {
        console.error('[GMB_POST_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
