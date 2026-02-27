import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { token } = body

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 })
        }

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
        }

        const { data: accounts, error: selectError } = await supabase
            .from('connected_accounts')
            .select('id')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'buffer')

        if (selectError) {
            console.error("BUFFER SAVE SELECT ERROR:", selectError)
            return NextResponse.json({ error: 'Database error reading accounts' }, { status: 500 })
        }

        if (accounts && accounts.length > 0) {
            const { error: updateError } = await supabase
                .from('connected_accounts')
                .update({ access_token: token, is_active: true })
                .eq('id', accounts[0].id)

            if (updateError) {
                console.error("BUFFER SAVE UPDATE ERROR:", updateError)
                return NextResponse.json({ error: 'Database error updating account' }, { status: 500 })
            }
        } else {
            const { error: insertError } = await supabase
                .from('connected_accounts')
                .insert({
                    restaurant_id: restaurant.id,
                    platform: 'buffer',
                    access_token: token,
                    is_active: true,
                    platform_user_id: 'manual_token'
                })

            if (insertError) {
                console.error("BUFFER SAVE INSERT ERROR:", insertError)
                return NextResponse.json({ error: 'Database error inserting account' }, { status: 500 })
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[BUFFER_SAVE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
