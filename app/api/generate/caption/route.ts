import { createClient } from '@/lib/supabase-server'
import { generateCaptions } from '@/lib/openai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { platform, postType, extraContext, contentType } = body

        if (!platform || !postType) {
            return NextResponse.json({ error: 'Missing platform or postType' }, { status: 400 })
        }

        // Get restaurant details for context
        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('name, business_type, cuisine_type, city, tone_of_voice')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
        }

        const captions = await generateCaptions(
            restaurant.name,
            restaurant.business_type || restaurant.cuisine_type || 'Business',
            restaurant.city || '',
            restaurant.tone_of_voice || 'casual',
            platform,
            postType,
            extraContext,
            contentType
        )

        return NextResponse.json({ captions })

    } catch (error: any) {
        console.error('[CAPTION_GENERATE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
