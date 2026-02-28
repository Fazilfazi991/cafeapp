import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/gmb'

export const dynamic = 'force-dynamic'

export async function GET() {
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

        const authUrl = getAuthUrl(restaurant.id)
        return NextResponse.redirect(authUrl)

    } catch (error: any) {
        console.error('[GMB_CONNECT_ERROR]', error)
        return new NextResponse(error.message || 'Internal Error', { status: 500 })
    }
}
