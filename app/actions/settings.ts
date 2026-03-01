'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { error: 'Not authenticated', success: false }
    }

    const name = formData.get('name') as string
    const website = formData.get('website') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const business_type = formData.get('business_type') as string
    const font_style = formData.get('font_style') as string

    try {
        // Get the restaurant ID first
        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            
        const restaurant = restaurants?.[0]
        if (!restaurant) return { error: 'Restaurant not found', success: false }

        // Update restaurants table
        const { error: restError } = await supabase
            .from('restaurants')
            .update({ name, website, phone, address, business_type })
            .eq('user_id', user.id)
            
        if (restError) throw new Error(`Restaurant Update Error: ${restError.message} (Code: ${restError.code})`)
            
        // Check if brand_settings exists
        const { data: existingBrand } = await supabase
            .from('brand_settings')
            .select('id')
            .eq('restaurant_id', restaurant.id)
            .single()

        if (existingBrand) {
            // Update brand_settings table
            const { error: brandError } = await supabase
                .from('brand_settings')
                .update({ font_style })
                .eq('restaurant_id', restaurant.id)

            if (brandError) throw new Error(`Brand Update Error: ${brandError.message}`)
        } else {
            // Create brand_settings if it doesn't exist yet
            const { error: brandInsertError } = await supabase
                .from('brand_settings')
                .insert({ 
                    restaurant_id: restaurant.id, 
                    font_style,
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
