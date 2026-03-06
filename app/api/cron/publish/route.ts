import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createGMBPost, getValidGmbToken } from '@/lib/gmb'
import { publishToFacebook, publishToInstagram } from '@/lib/meta'
import { uploadMediaToWhatsApp, broadcastWhatsappMessage } from '@/lib/whatsapp'

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

                // === WHATSAPP ===
                if (post.platforms && post.platforms.includes('whatsapp')) {
                    // Fetch the WhatsApp account credentials from connected_accounts
                    const { data: waAccount } = await supabase
                        .from('connected_accounts')
                        .select('whatsapp_access_token, whatsapp_phone_number_id, whatsapp_business_account_id, restaurants(name, phone, address)')
                        .eq('restaurant_id', post.restaurant_id)
                        .eq('platform', 'facebook')
                        .single()

                    if (!waAccount || !waAccount.whatsapp_access_token || !waAccount.whatsapp_phone_number_id) {
                        console.warn(`[CRON_WA] WhatsApp not connected for post ${post.id}, skipping.`)
                    } else {
                        // Fetch contacts that have not opted out
                        const { data: contacts } = await supabase
                            .from('contacts')
                            .select('phone_number')
                            .eq('restaurant_id', post.restaurant_id)
                            .eq('opted_out', false)

                        if (!contacts || contacts.length === 0) {
                            console.log(`[CRON_WA] No opted-in contacts for restaurant ${post.restaurant_id}`)
                        } else {
                            // Count how many messages already sent today to enforce 1000/day limit
                            const todayStart = new Date()
                            todayStart.setHours(0, 0, 0, 0)

                            const { data: todaysPosts } = await supabase
                                .from('posts')
                                .select('whatsapp_delivered_count')
                                .eq('restaurant_id', post.restaurant_id)
                                .gte('published_at', todayStart.toISOString())
                                .not('whatsapp_delivered_count', 'is', null)

                            const alreadySentToday = todaysPosts?.reduce((sum: number, p: any) => sum + (p.whatsapp_delivered_count || 0), 0) || 0

                            // Upload image to WhatsApp media hosting
                            const mediaId = await uploadMediaToWhatsApp(
                                waAccount.whatsapp_phone_number_id,
                                waAccount.whatsapp_access_token,
                                post.poster_url
                            )

                            // Get restaurant info for template variables
                            const restaurant = (waAccount as any).restaurants
                            const restaurantName = restaurant?.name || 'Our Restaurant'
                            const restaurantPhone = restaurant?.phone || ''
                            const restaurantAddress = restaurant?.address || ''
                            const customMessage = post.whatsapp_custom_message || post.selected_caption || ''

                            // Broadcast to all eligible contacts
                            const { sent, failed, skipped } = await broadcastWhatsappMessage(
                                waAccount.whatsapp_phone_number_id,
                                waAccount.whatsapp_access_token,
                                contacts,
                                mediaId,
                                restaurantName,
                                customMessage,
                                alreadySentToday,
                                restaurantPhone,
                                restaurantAddress
                            )

                            console.log(`[CRON_WA] Post ${post.id}: sent=${sent}, failed=${failed}, skipped=${skipped}`)

                            // Update delivery stats on the post
                            await supabase
                                .from('posts')
                                .update({
                                    whatsapp_delivered_count: sent,
                                    whatsapp_failed_count: failed
                                })
                                .eq('id', post.id)
                        }

                        // Mark post as published (if it isn't already from Meta publishing above)
                        await supabase
                            .from('posts')
                            .update({ status: 'published', published_at: new Date().toISOString() })
                            .eq('id', post.id)
                            .eq('status', 'scheduled') // Only if not already published

                        processed++
                    }
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
                    // Flag the account as disconnected so the dashboard banner shows up
                    await supabase
                        .from('connected_accounts')
                        .update({ is_active: false })
                        .eq('restaurant_id', post.restaurant_id)
                        .eq('platform', 'facebook')

                    console.log(`[CRON] Flagged Meta account as disconnected for restaurant ${post.restaurant_id}`)
                }
            }
        }

        return NextResponse.json({ success: true, processed, failed })

    } catch (error: any) {
        console.error('[CRON_PUBLISH_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
