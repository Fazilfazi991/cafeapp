import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { caption, imageUrl, scheduledTime, platforms } = body

        if (!caption || !imageUrl || !platforms || platforms.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get restaurant ID
        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) throw new Error('Restaurant not found')

        // Fetch user's connected meta account to ensure they actually have Facebook/IG linked
        const { data: metaAccount } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'facebook')
            .single()

        if (!metaAccount || !metaAccount.meta_access_token) {
            return NextResponse.json({ error: 'Meta account is not connected.' }, { status: 403 })
        }

        const fbPlatform = platforms.find((p: string) => p === 'facebook' || p === 'instagram');
        if (!fbPlatform) {
            return NextResponse.json({ error: 'No Meta platforms requested' }, { status: 400 })
        }

        // Calculate a publish time
        // If scheduledTime exists, use it. Otherwise post now.
        const scheduledDate = scheduledTime ? new Date(scheduledTime) : new Date();
        const runAt = scheduledDate.toISOString();

        // Save to our generic posts table for the Cron job to pick up
        const { data: insertedPost, error: insertError } = await supabase
            .from('posts')
            .insert({
                restaurant_id: restaurant.id,
                post_type: 'image',
                poster_url: imageUrl,
                selected_caption: caption,
                scheduled_at: runAt,
                // We store both "facebook" and "instagram" platforms requested here, the cron job parses them
                platforms: platforms.filter((p: string) => p === 'facebook' || p === 'instagram'),
                status: 'scheduled'
            })
            .select()
            .single()

        if (insertError) throw insertError

        return NextResponse.json({ success: true, post: insertedPost })

    } catch (error: any) {
        console.error('[META_SCHEDULE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Error scheduling post' }, { status: 500 })
    }
}
