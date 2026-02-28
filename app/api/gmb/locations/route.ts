import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getValidGmbToken, getGMBAccounts, getGMBLocations } from '@/lib/gmb'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

        const accessToken = await getValidGmbToken(restaurant.id)

        const accounts = await getGMBAccounts(accessToken)
        if (!accounts || accounts.length === 0) {
            return NextResponse.json({ error: 'No GMB accounts found' }, { status: 400 })
        }

        const accountId = accounts[0].name.split('/')[1]
        const locations = await getGMBLocations(accountId, accessToken)

        return NextResponse.json({ success: true, locations })

    } catch (error: any) {
        console.error('[GMB_LOCATIONS_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
