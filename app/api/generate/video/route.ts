import { createClient } from '@/lib/supabase-server'
import { analyzeVideoWithGemini } from '@/lib/gemini'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { videoUrl } = body

        if (!videoUrl) {
            return NextResponse.json({ error: 'Missing video URL' }, { status: 400 })
        }

        // Get restaurant details for context
        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('name, cuisine_type')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
        }

        const brief = await analyzeVideoWithGemini(
            videoUrl,
            restaurant.name,
            restaurant.cuisine_type || 'restaurant'
        )

        return NextResponse.json({ brief })

    } catch (error: any) {
        console.error('[VIDEO_GENERATE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
