import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createGMBPost, getValidGmbToken } from '@/lib/gmb'
import { publishToFacebook, publishToInstagram } from '@/lib/meta'

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
                    // Fetch Meta Account Details
                    const { data: metaAccount } = await supabase
                        .from('connected_accounts')
                        .select('meta_access_token, meta_page_id, meta_ig_id')
                        .eq('restaurant_id', post.restaurant_id)
                        .eq('platform', 'facebook')
                        .single()

                    if (!metaAccount || !metaAccount.meta_access_token) {
                        throw new Error('Meta account disconnected before publish')
                    }

                    // Publish to Facebook if requested
                    if (post.platforms.includes('facebook')) {
                        if (!metaAccount.meta_page_id) throw new Error('No Facebook Page ID attached')
                        await publishToFacebook(metaAccount.meta_page_id, metaAccount.meta_access_token, post.selected_caption, post.poster_url)
                        console.log(`[CRON] FB Published for post ${post.id}`)
                    }

                    // Publish to Instagram if requested
                    if (post.platforms.includes('instagram')) {
                        if (!metaAccount.meta_ig_id) throw new Error('No Instagram Business Account attached')
                        await publishToInstagram(metaAccount.meta_ig_id, metaAccount.meta_access_token, post.selected_caption, post.poster_url)
                        console.log(`[CRON] IG Published for post ${post.id}`)
                    }

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

                // If error is Meta Token related (e.g. OAuthException from FB/IG API)
                const errorString = err.message || '';
                if (errorString.toLowerCase().includes('oauth') || errorString.toLowerCase().includes('token') || errorString.toLowerCase().includes('disconnected') || errorString.toLowerCase().includes('session has been invalidated')) {
                    // Fetch restaurant email
                    const { data: rest } = await supabase
                        .from('restaurants')
                        .select('email, name')
                        .eq('id', post.restaurant_id)
                        .single()

                    if (rest && rest.email && process.env.RESEND_API_KEY) {
                        try {
                            const { Resend } = require('resend');
                            const resend = new Resend(process.env.RESEND_API_KEY);

                            await resend.emails.send({
                                from: 'PostChef <notifications@postchef.app>', // Change to verified domain later
                                to: rest.email,
                                subject: `Action Required: Reconnect Meta for ${rest.name}`,
                                html: `
                                    <h2>Your scheduled post failed to publish</h2>
                                    <p>Hi there,</p>
                                    <p>We tried to publish a scheduled post for <strong>${post.dish_name || 'your dish'}</strong>, but your Facebook/Instagram connection has expired or been revoked.</p>
                                    <p>Please log in to your PostChef dashboard and reconnect your Meta accounts on the settings page to resume scheduled posting.</p>
                                    <br/>
                                    <p>Thanks,</p>
                                    <p>The PostChef Team</p>
                                `
                            });
                            console.log(`[CRON] Sent expiry email alert to ${rest.email}`)
                        } catch (emailErr) {
                            console.error('[CRON] Failed to send email alert:', emailErr)
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, processed, failed })

    } catch (error: any) {
        console.error('[CRON_PUBLISH_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
