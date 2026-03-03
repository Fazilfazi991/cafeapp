'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = createClient()

    const user_id = formData.get('user_id') as string
    const restaurant_id = formData.get('restaurant_id') as string

    if (!user_id || !restaurant_id) {
        return { error: 'Missing security context. Please refresh and try again.', success: false }
    }

    const name = formData.get('name') as string
    const website = formData.get('website') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const cuisine_type = formData.get('cuisine_type') as string
    const font_style = formData.get('font_style') as string
    const email = formData.get('email') as string
    const logo_url = formData.get('logo_url') as string
    const instagram = formData.get('instagram') as string

    try {

        // Update restaurants table
        const { error: restError } = await supabase
            .from('restaurants')
            .update({ name, website, phone, address, business_type: 'restaurant', cuisine_type, email, instagram })
            .eq('user_id', user_id)

        if (restError) throw new Error(`Restaurant Update Error: ${restError.message} (Code: ${restError.code})`)

        // Check if brand_settings exists
        const { data: existingBrand } = await supabase
            .from('brand_settings')
            .select('id')
            .eq('restaurant_id', restaurant_id)
            .single()

        if (existingBrand) {
            // Update brand_settings table
            const { error: brandError } = await supabase
                .from('brand_settings')
                .update({ font_style, logo_url })
                .eq('restaurant_id', restaurant_id)

            if (brandError) throw new Error(`Brand Update Error: ${brandError.message}`)
        } else {
            // Create brand_settings if it doesn't exist yet
            const { error: brandInsertError } = await supabase
                .from('brand_settings')
                .insert({
                    restaurant_id: restaurant_id,
                    font_style,
                    logo_url: logo_url || '',
                    primary_color: '#FF6B35', // default
                    secondary_color: '#1A1A1A' // default
                })

            if (brandInsertError) throw new Error(`Brand Insert Error: ${brandInsertError.message}`)
        }

        revalidatePath('/dashboard/settings')
        return { error: null, success: true }

    } catch (error: any) {
        console.error('Error saving profile:', error);
        return { error: error.message || 'An unknown error occurred', success: false }
    }
}

export async function createRestaurant(prevState: any, formData: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated', success: false }

    const name = formData.get('name') as string
    const cuisine_type = formData.get('cuisine_type') as string
    const city = formData.get('city') as string
    const phone = formData.get('phone') as string

    if (!name || !cuisine_type || !city) {
        return { error: 'Please fill in Restaurant Name, Cuisine Type, and City.', success: false }
    }

    try {
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

        await supabase.from('brand_settings').insert({
            restaurant_id: restaurant.id,
            font_style: 'modern',
            logo_url: '',
            primary_color: '#FF6B35',
            secondary_color: '#1A1A1A',
        })

        revalidatePath('/dashboard/settings')
        return { error: null, success: true }

    } catch (error: any) {
        console.error('Error creating restaurant:', error)
        return { error: error.message || 'Could not create restaurant.', success: false }
    }
}
