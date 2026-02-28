import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { scheduleGMBPost, getValidGmbToken } from '@/lib/gmb'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { imageUrl, caption, scheduledTime } = body

        if (!imageUrl || !caption || !scheduledTime) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

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
            return NextResponse.json({ error: 'GMB account not connected' }, { status: 400 })
        }

        // Validate token exists to ensure they are authenticated
        const accessToken = await getValidGmbToken(restaurant.id)

        const post = await scheduleGMBPost(
            restaurant.id,
            imageUrl,
            caption,
            scheduledTime,
            accessToken
        )

        return NextResponse.json({ success: true, post })

    } catch (error: any) {
        console.error('[GMB_SCHEDULE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
