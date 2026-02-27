import { createClient } from '@/lib/supabase-server'
import { generatePoster } from '@/lib/replicate'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { imageUrl } = body

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing image URL' }, { status: 400 })
        }

        // Get brand settings
        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id, name, cuisine_type, brand_settings(primary_color)')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
        }

        const brandColor = restaurant.brand_settings?.[0]?.primary_color || '#FF6B35'

        // Call Replicate
        // TEMPORARILY DISABLED: Bypassing image generation to allow free testing
        /*
        const posterUrl = await generatePoster(
            imageUrl,
            brandColor,
            restaurant.name,
            restaurant.cuisine_type || 'food'
        )
        */

        // For MVP testing without billed APIs, just return the original image
        const posterUrl = imageUrl;

        return NextResponse.json({ posterUrl })

    } catch (error: any) {
        console.error('[POSTER_GENERATE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
