import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return new NextResponse('Restaurant not found', { status: 404 })
        }

        // Deactivate or delete the account mapping
        await supabase
            .from('connected_accounts')
            .update({ is_active: false })
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'gmb')

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${appUrl}/dashboard/settings?gmb=disconnected`, 303)

    } catch (error: any) {
        console.error('[GMB_DISCONNECT_ERROR]', error)
        return new NextResponse(error.message || 'Internal Error', { status: 500 })
    }
}
