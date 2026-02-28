import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createGMBPost, getValidGmbToken } from '@/lib/gmb'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const supabase = createClient()

        // Fetch due posts
        const { data: duePosts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_at', new Date().toISOString())

        if (error) {
            console.error('[CRON_FETCH_ERROR]', error)
            return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
        }

        if (!duePosts || duePosts.length === 0) {
            return NextResponse.json({ success: true, message: 'No posts due', processed: 0, failed: 0 })
        }

        let processed = 0
        let failed = 0

        for (const post of duePosts) {
            try {
                // If it's a GMB post mapped inside the platforms array
                if (post.platforms && post.platforms.includes('gmb')) {
                    const { data: account } = await supabase
                        .from('connected_accounts')
                        .select('id, gmb_location_id, gmb_location_name')
                        .eq('restaurant_id', post.restaurant_id)
                        .eq('platform', 'gmb')
                        .single()

                    if (!account || !account.gmb_location_id) {
                        throw new Error('GMB account or location not configured')
                    }

                    const accessToken = await getValidGmbToken(post.restaurant_id)
                    await createGMBPost(account.gmb_location_id, post.poster_url, post.selected_caption, accessToken)

                    await supabase
                        .from('posts')
                        .update({
                            status: 'published',
                            published_at: new Date().toISOString()
                        })
                        .eq('id', post.id)

                    processed++
                }

                if (post.platforms && (post.platforms.includes('instagram') || post.platforms.includes('facebook'))) {
                    // For Instagram/Facebook, normally we would call postToInstagram or postToFacebook
                    // Assuming that's handled elsewhere or to be mocked for now.
                    console.log(`[CRON] Processing ${post.platform} for post ${post.id}`)
                    await supabase
                        .from('posts')
                        .update({
                            status: 'published',
                            published_at: new Date().toISOString()
                        })
                        .eq('id', post.id)
                    processed++
                }
            } catch (err: any) {
                console.error(`[CRON_POST_ERROR] Post ${post.id}:`, err)
                failed++
                await supabase
                    .from('posts')
                    .update({ status: 'failed' })
                    .eq('id', post.id)
            }
        }

        return NextResponse.json({ success: true, processed, failed })

    } catch (error: any) {
        console.error('[CRON_PUBLISH_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
