import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateAllPosters } from '@/lib/gemini'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { imageUrl, promotionalText, customText } = body

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing image URL' }, { status: 400 })
        }

        // Fetch restaurant + brand settings
        const { data: restaurants, error: fetchError } = await supabase
            .from('restaurants')
            .select('id, name, cuisine_type, phone, email, website, business_type, tone_of_voice, brand_settings(primary_color, secondary_color, logo_url, font_style)')
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

        // ═══════════════════════════════════════════════════════════════════
        // PRIMARY: Generate with Gemini Pro Image
        // ═══════════════════════════════════════════════════════════════════
        try {
            console.log('[POSTER] Starting Gemini image generation...')
            const posters = await generateAllPosters({
                photoUrl: imageUrl,
                logoUrl: brand.logo_url || undefined,
                businessName: restaurant.name,
                businessType: restaurant.business_type || restaurant.cuisine_type || 'restaurant',
                customText: promotionalText || customText || restaurant.name,
                phone: restaurant.phone || '',
                website: restaurant.website || '',
                primaryColor: brand.primary_color || '#FF6B35',
                tone: restaurant.tone_of_voice || 'casual',
                restaurantId: restaurant.id
            })
            console.log('[POSTER] Gemini generation successful!')

            return NextResponse.json({
                success: true,
                method: 'gemini',
                posters,
            })
        } catch (geminiError: any) {
            console.error('[POSTER] Gemini failed:', geminiError?.message)
        }

        // ═══════════════════════════════════════════════════════════════════
        // FALLBACK: Return the original uploaded image for all 3 styles
        // ═══════════════════════════════════════════════════════════════════
        console.log('[POSTER] Returning original image as fallback...')
        return NextResponse.json({
            success: true,
            method: 'fallback',
            posters: {
                minimal: imageUrl,
                bold: imageUrl,
                lifestyle: imageUrl,
            },
        })

    } catch (error: any) {
        console.error('[POSTER_GENERATION_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Failed to generate posters' }, { status: 500 })
    }
}
