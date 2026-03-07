import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// This would typically be called by Vercel Cron or similar scheduler
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // Uncomment for production security
            // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient()
        
        // Find all active boosts
        const { data: activePosts, error } = await supabase
            .from('posts')
            .select('id, boost_campaign_id, restaurant_id, restaurants(user_id)')
            .eq('boost_status', 'ACTIVE')
            .not('boost_campaign_id', 'is', null)

        if (error) {
            console.error('[BOOST_STATS_DB_ERROR]', error)
            return NextResponse.json({ error: 'DB Error' }, { status: 500 })
        }

        if (!activePosts || activePosts.length === 0) {
            return NextResponse.json({ message: 'No active boosts found' })
        }

        let processed = 0;
        const fbApiVersion = 'v20.0'

        for (const post of activePosts) {
            try {
                // Find token
                const { data: account } = await supabase
                    .from('connected_accounts')
                    .select('meta_user_access_token')
                    .eq('restaurant_id', post.restaurant_id)
                    .eq('platform', 'facebook')
                    .maybeSingle()
                
                if (!account?.meta_user_access_token) continue;

                const token = account.meta_user_access_token;
                const campaignId = post.boost_campaign_id;

                // Meta Insights API requires fetching the campaign insights
                const insightsRes = await fetch(`https://graph.facebook.com/${fbApiVersion}/${campaignId}/insights?fields=reach,spend&access_token=${token}`)
                
                if (!insightsRes.ok) {
                    console.error(`[META_INSIGHTS_ERR] Campaign ${campaignId}`, await insightsRes.text())
                    continue;
                }

                const insightsData = await insightsRes.json()
                const dataBlock = insightsData.data && insightsData.data[0] ? insightsData.data[0] : null
                
                // Fetch the actual campaign status to check if it's completed
                const statusRes = await fetch(`https://graph.facebook.com/${fbApiVersion}/${campaignId}?fields=status,effective_status&access_token=${token}`)
                let remoteStatus = 'ACTIVE'
                if (statusRes.ok) {
                    const statusData = await statusRes.json()
                    const effStatus = statusData.effective_status || statusData.status
                    if (effStatus === 'PAUSED') remoteStatus = 'PAUSED'
                    if (effStatus === 'ARCHIVED' || effStatus === 'DELETED') remoteStatus = 'COMPLETED'
                    // Campaign could be completed if end date passed
                }

                if (dataBlock || remoteStatus !== 'ACTIVE') {
                    const updates: any = {}
                    if (dataBlock) {
                        updates.boost_reach = parseInt(dataBlock.reach || '0')
                        updates.boost_spend = parseFloat(dataBlock.spend || '0')
                    }
                    if (remoteStatus !== 'ACTIVE') {
                        updates.boost_status = remoteStatus
                    }

                    await supabase
                        .from('posts')
                        .update(updates)
                        .eq('id', post.id)
                    
                    processed++;
                }

            } catch (err) {
                console.error(`[BOOST_STATS_POST_ERROR] Post ${post.id}`, err)
            }
        }

        return NextResponse.json({ success: true, processed, total: activePosts.length })

    } catch (error: any) {
        console.error('[BOOST_STATS_CRON_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
