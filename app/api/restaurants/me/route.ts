import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id, name, city, plan, connected_accounts(platform, is_active)')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return new NextResponse('Restaurant not found', { status: 404 })
        }

        return NextResponse.json({
            id: restaurant.id,
            name: restaurant.name,
            city: restaurant.city || '',
            plan: restaurant.plan,
            isGmbConnected: restaurant.connected_accounts?.some((a: any) => a.platform === 'gmb' && a.is_active) || false
        })

    } catch (error: any) {
        console.error('[RESTAURANTS_ME_ERROR]', error)
        return new NextResponse(error.message || 'Internal Error', { status: 500 })
    }
}
