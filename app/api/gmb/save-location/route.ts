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
        const { locationId, locationName } = body

        if (!locationId || !locationName) {
            return NextResponse.json({ error: 'Missing location details' }, { status: 400 })
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

        const { error } = await supabase
            .from('connected_accounts')
            .update({
                gmb_location_id: locationId,
                gmb_location_name: locationName
            })
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'gmb')

        if (error) {
            throw error
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[GMB_SAVE_LOCATION_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
