import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Fetch restaurant basics
        const { data: restaurants, error: restError } = await supabase
            .from('restaurants')
            .select('id, name, city, plan, connected_accounts(platform, is_active)')
            .eq('user_id', user.id)
            .limit(1)

        if (restError) throw new Error(restError.message)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return new NextResponse('Restaurant not found', { status: 404 })
        }

        // Fetch brand settings separately (more reliable than a join)
        const { data: brandData } = await supabase
            .from('brand_settings')
            .select('logo_url')
            .eq('restaurant_id', restaurant.id)
            .maybeSingle()

        return NextResponse.json({
            id: restaurant.id,
            name: restaurant.name || '',
            city: restaurant.city || '',
            plan: restaurant.plan,
            logo_url: brandData?.logo_url || null,
            isGmbConnected: (restaurant.connected_accounts as any[])?.some((a) => a.platform === 'gmb' && a.is_active) || false
        })

    } catch (error: any) {
        console.error('[RESTAURANTS_ME_ERROR]', error)
        return new NextResponse(error.message || 'Internal Error', { status: 500 })
    }
}
