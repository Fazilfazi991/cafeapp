import { createClient } from '@/lib/supabase-server'
import { schedulePostToBuffer, getBufferProfiles } from '@/lib/buffer'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const {
            platform,
            mediaUrl,
            posterUrl,
            caption,
            scheduledAt
        } = body

        if (!platform || !caption || !scheduledAt) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Get restaurant and check limits
        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id, plan, posts_used_this_month')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
        }

        // Rough plan limit check
        const limit = restaurant.plan === 'free' ? 3 : restaurant.plan === 'starter' ? 20 : 9999
        if (restaurant.posts_used_this_month >= limit) {
            return NextResponse.json({ error: 'Monthly post limit reached' }, { status: 403 })
        }

        // 2. Fetch connected Buffer accounts
        const { data: accounts } = await supabase
            .from('connected_accounts')
            .select('buffer_access_token')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'buffer')
            .limit(1)

        const bufferToken = accounts?.[0]?.buffer_access_token

        if (!bufferToken) {
            return NextResponse.json({ error: 'Buffer account not connected. Please add your access token in Settings.' }, { status: 400 })
        }

        // 3. Fetch actual profiles from Buffer
        const profiles = await getBufferProfiles(bufferToken)
        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ error: 'No social profiles found on your Buffer account. Please connect some channels on Buffer.com first.' }, { status: 400 })
        }

        // Match the requested platform to a Buffer service name
        const bufferServiceMatch = platform === 'gmb' ? 'googlebusinessprofile' : platform
        const targetProfiles = profiles.filter((p: any) => p.service === bufferServiceMatch)

        if (targetProfiles.length === 0) {
            return NextResponse.json({ error: `Could not find a connected ${platform} page on your Buffer account. Please add it first.` }, { status: 400 })
        }

        const profileIds = targetProfiles.map((p: any) => p.id)

        // 4. Schedule via Buffer
        const bufferPostIds = await schedulePostToBuffer(
            bufferToken,
            profileIds,
            caption,
            [posterUrl || mediaUrl], // prefer the generated poster
            new Date(scheduledAt)
        )

        // 5. Save to our database
        // We would link this to the media_library via media_id, but we'll accept raw urls for MVP
        const { data: postRecord, error: insertError } = await supabase
            .from('posts')
            .insert({
                restaurant_id: restaurant.id,
                selected_caption: caption,
                poster_url: posterUrl || mediaUrl,
                platforms: [platform],
                status: 'scheduled',
                scheduled_at: scheduledAt,
                buffer_post_id: bufferPostIds[0],
                post_type: posterUrl ? 'image' : 'video' // rough heuristic
            })
            .select()
            .single()

        if (insertError) {
            console.error('SUPABASE INSERT ERROR FULL:', insertError);
            throw insertError;
        }

        console.log('Successfully inserted post:', postRecord);

        // 6. Increment usage counter
        await supabase
            .from('restaurants')
            .update({ posts_used_this_month: restaurant.posts_used_this_month + 1 })
            .eq('id', restaurant.id)

        return NextResponse.json({ success: true, post: postRecord })

    } catch (error: any) {
        console.error('[BUFFER_SCHEDULE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
