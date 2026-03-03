import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const formData = await req.formData()
        const name = formData.get('name') as string
        const cuisine_type = formData.get('cuisine_type') as string
        const city = formData.get('city') as string
        const phone = formData.get('phone') as string

        if (!name || !cuisine_type || !city) {
            return NextResponse.json({ error: 'Restaurant Name, Cuisine Type, and City are required.' }, { status: 400 })
        }

        // Check if restaurant already exists for this user
        const { data: existing } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'A restaurant already exists for this account.' }, { status: 409 })
        }

        const { data: restaurant, error: insertError } = await supabase
            .from('restaurants')
            .insert({
                user_id: user.id,
                name,
                cuisine_type,
                city,
                phone: phone || null,
                business_type: 'restaurant',
                onboarding_complete: true,
                plan: 'active',
                plan_start_date: new Date().toISOString(),
                plan_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .select()
            .single()

        if (insertError) throw new Error(insertError.message)

        // Insert default brand settings
        await supabase.from('brand_settings').insert({
            restaurant_id: restaurant.id,
            font_style: 'modern',
            logo_url: '',
            primary_color: '#FF6B35',
            secondary_color: '#1A1A1A',
        })

        return NextResponse.json({ success: true, restaurantId: restaurant.id })

    } catch (error: any) {
        console.error('[RESTAURANTS_SETUP_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
    }
}
