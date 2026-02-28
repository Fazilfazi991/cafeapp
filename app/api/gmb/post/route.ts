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
            .select('id, gmb_location_id, gmb_location_name')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'gmb')
            .single()

        if (!account || !account.gmb_location_id) {
            return NextResponse.json({ error: 'Please select a GMB location in Settings first' }, { status: 400 })
        }

        if (!imageUrl || !caption) {
            return NextResponse.json({ error: 'Missing image or caption' }, { status: 400 })
        }

        const accessToken = await getValidGmbToken(restaurant.id)

        const gmbPostId = await createGMBPost(account.gmb_location_id, imageUrl, caption, accessToken)

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
