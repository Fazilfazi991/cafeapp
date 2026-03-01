import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { enhancePhoto } from '@/lib/falai'
import { renderPosterToImage, uploadPosterToSupabase } from '@/lib/poster-renderer'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { imageUrl, promotionalText } = body

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing image URL' }, { status: 400 })
        }

        // Fetch restaurant + brand settings
        const { data: restaurants, error: fetchError } = await supabase
            .from('restaurants')
            .select('id, name, cuisine_type, phone, email, website, brand_settings(primary_color, secondary_color, logo_url, font_style)')
            .eq('user_id', user.id)
            .limit(1)

        if (fetchError) {
            console.error('[DATABASE_FETCH_ERROR]', fetchError)
        }

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.json({ error: fetchError ? `DB Error: ${fetchError.message}` : 'Restaurant not found' }, { status: 404 })
        }

        const brand = restaurant.brand_settings?.[0] || {
            primary_color: '#FF6B35',
            secondary_color: '#FFFFFF',
            logo_url: '',
            font_style: 'modern'
        }

        // STEP 1 — Enhance photo with fal.ai (graceful fallback if it fails)
        const enhancedPhotoUrl = await enhancePhoto(imageUrl)

        // STEP 2 — Shared template params
        const templateParams = {
            photoUrl: enhancedPhotoUrl,
            businessName: restaurant.name,
            tagline: restaurant.cuisine_type || '',
            customText: promotionalText || '',
            phone: restaurant.phone || '',
            website: restaurant.website || restaurant.email || '',
            logoUrl: brand.logo_url || '',
            primaryColor: brand.primary_color || '#FF6B35',
            secondaryColor: brand.secondary_color || '#FFFFFF',
            fontStyle: brand.font_style || 'modern',
        }

        // STEP 3 — Render all 3 templates in parallel using Satori (no Chrome needed)
        const [minimalBuffer, boldBuffer, lifestyleBuffer] = await Promise.all([
            renderPosterToImage('minimal', templateParams),
            renderPosterToImage('bold', templateParams),
            renderPosterToImage('lifestyle', templateParams),
        ])

        // STEP 4 — Upload all 3 to Supabase Storage
        const [minimalUrl, boldUrl, lifestyleUrl] = await Promise.all([
            uploadPosterToSupabase(minimalBuffer, restaurant.id, 'minimal'),
            uploadPosterToSupabase(boldBuffer, restaurant.id, 'bold'),
            uploadPosterToSupabase(lifestyleBuffer, restaurant.id, 'lifestyle'),
        ])

        return NextResponse.json({
            posters: {
                minimal: minimalUrl,
                bold: boldUrl,
                lifestyle: lifestyleUrl,
            }
        })

    } catch (error: any) {
        console.error('[POSTER_GENERATION_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Failed to generate posters' }, { status: 500 })
    }
}
