import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { postId } = body

        if (!postId) {
            return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: post, error: postErr } = await supabase
            .from('posts')
            .select('*, restaurants(*)')
            .eq('id', postId)
            .single()

        if (postErr || !post) throw new Error('Post not found')

        const restaurant = post.restaurants
        if (restaurant.user_id !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

        if (!post.boost_campaign_id) {
            return NextResponse.json({ error: 'Post is not boosted' }, { status: 400 })
        }

        const { data: connectedAccount } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'facebook')
            .maybeSingle()

        if (!connectedAccount || !connectedAccount.meta_user_access_token) {
            return NextResponse.json({ error: 'No ad account connected' }, { status: 400 })
        }

        const accessToken = connectedAccount.meta_user_access_token
        const campaignId = post.boost_campaign_id
        const fbApiVersion = 'v20.0'

        // Pause the campaign in Meta
        const pauseRes = await fetch(`https://graph.facebook.com/${fbApiVersion}/${campaignId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'PAUSED',
                access_token: accessToken
            })
        })

        if (!pauseRes.ok) {
            const err = await pauseRes.json()
            console.error('[META_PAUSE_ERR]', err)
            return NextResponse.json({ error: `Meta Error: ${err.error?.message || 'Failed to pause campaign'}` }, { status: 400 })
        }

        // Update Database
        const { error: updateErr } = await supabase
            .from('posts')
            .update({ boost_status: 'PAUSED' })
            .eq('id', postId)

        if (updateErr) throw updateErr

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[BOOST_STOP_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
