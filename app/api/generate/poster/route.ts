import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateAllThreeStyles } from '@/lib/gemini'
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

        // Shared params for both Gemini and fallback
        const sharedParams = {
            photoUrl: imageUrl,
            logoUrl: brand.logo_url || undefined,
            businessName: restaurant.name,
            businessType: restaurant.cuisine_type || 'restaurant',
            customText: promotionalText || '',
            phone: restaurant.phone || '',
            website: restaurant.website || restaurant.email || '',
            primaryColor: brand.primary_color || '#FF6B35',
            secondaryColor: brand.secondary_color || '#FFFFFF',
            tone: 'professional',
            restaurantId: restaurant.id,
        }

        // ═══════════════════════════════════════════════════════════════════
        // PRIMARY: Generate with Gemini Pro Image
        // ═══════════════════════════════════════════════════════════════════
        try {
            console.log('[POSTER] Starting Gemini image generation...')
            const posters = await generateAllThreeStyles(sharedParams)
            console.log('[POSTER] Gemini generation successful!')

            return NextResponse.json({
                success: true,
                method: 'gemini',
                posters,
            })
        } catch (geminiError: any) {
            console.error('[POSTER] Gemini failed, falling back to HTML:', geminiError?.message)
        }

        // ═══════════════════════════════════════════════════════════════════
        // FALLBACK: Generate with HTML/Satori templates
        // ═══════════════════════════════════════════════════════════════════
        console.log('[POSTER] Using HTML/Satori fallback...')

        const templateParams = {
            photoUrl: imageUrl,
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

        const [minimalBuffer, boldBuffer, lifestyleBuffer] = await Promise.all([
            renderPosterToImage('minimal', templateParams),
            renderPosterToImage('bold', templateParams),
            renderPosterToImage('lifestyle', templateParams),
        ])

        const [minimalUrl, boldUrl, lifestyleUrl] = await Promise.all([
            uploadPosterToSupabase(minimalBuffer, restaurant.id, 'minimal'),
            uploadPosterToSupabase(boldBuffer, restaurant.id, 'bold'),
            uploadPosterToSupabase(lifestyleBuffer, restaurant.id, 'lifestyle'),
        ])

        return NextResponse.json({
            success: true,
            method: 'html_fallback',
            posters: {
                minimal: minimalUrl,
                bold: boldUrl,
                lifestyle: lifestyleUrl,
            },
        })

    } catch (error: any) {
        console.error('[POSTER_GENERATION_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Failed to generate posters' }, { status: 500 })
    }
}
