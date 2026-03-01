import { createClient } from '@/lib/supabase-server'
import { enhancePhoto, generateThreeStyles, removeBackground } from '@/lib/falai'
import { compositePoster } from '@/lib/poster-compositor'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { imageUrl, includeText } = body

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing image URL' }, { status: 400 })
        }

        // Get brand settings
        const { data: restaurants, error: fetchError } = await supabase
            .from('restaurants')
            .select('id, name, cuisine_type, business_type, tone_of_voice, phone, email, address, website, brand_settings(primary_color, secondary_color, logo_url)')
            .eq('user_id', user.id)
            .limit(1)

        if (fetchError) {
            console.error('[DATABASE_FETCH_ERROR]', fetchError)
        }

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.json({ error: fetchError ? `DB Error: ${fetchError.message}` : 'Restaurant not found' }, { status: 404 })
        }

        const brand = restaurant.brand_settings?.[0] || { primary_color: '#FF6B35', logo_url: '' }

        // STEP 1 - Enhance photo and Extract Background
        const [enhancedUrl, subjectUrl] = await Promise.all([
            enhancePhoto(imageUrl),
            removeBackground(imageUrl) // fal-ai/bria/background/remove
        ]);

        // STEP 2 - Generate 3 style variations
        const { minimal, bold, lifestyle } = await generateThreeStyles({
            imageUrl: enhancedUrl,
            businessName: restaurant.name,
            businessType: restaurant.business_type || 'restaurant',
            cuisine: restaurant.cuisine_type || '',
            tone: restaurant.tone_of_voice || 'professional',
            primaryColor: brand.primary_color,
            secondaryColor: brand.secondary_color || '#000000',
            caption: body.caption || '', // Not directly used in fal but good for logging or future logic
            includeText: includeText ?? true
        })

        // STEP 3 - Add logo + contact strip to each
        const minimalFinal = await compositePoster({
            posterUrl: minimal,
            subjectUrl: subjectUrl,
            logoUrl: brand.logo_url,
            businessName: restaurant.name,
            phone: restaurant.phone,
            website: restaurant.website,
            email: restaurant.email,
            address: restaurant.address,
            primaryColor: brand.primary_color,
            secondaryColor: brand.secondary_color || '#000000'
        })

        const boldFinal = await compositePoster({
            posterUrl: bold,
            subjectUrl: subjectUrl,
            logoUrl: brand.logo_url,
            businessName: restaurant.name,
            phone: restaurant.phone,
            website: restaurant.website,
            email: restaurant.email,
            address: restaurant.address,
            primaryColor: brand.primary_color,
            secondaryColor: brand.secondary_color || '#000000'
        })

        const lifestyleFinal = await compositePoster({
            posterUrl: lifestyle,
            subjectUrl: subjectUrl,
            logoUrl: brand.logo_url,
            businessName: restaurant.name,
            phone: restaurant.phone,
            website: restaurant.website,
            email: restaurant.email,
            address: restaurant.address,
            primaryColor: brand.primary_color,
            secondaryColor: brand.secondary_color || '#000000'
        })

        // STEP 4 - Return all three + source
        return NextResponse.json({
            posters: {
                minimal: minimalFinal,
                bold: boldFinal,
                lifestyle: lifestyleFinal
            },
            enhanced_source: enhancedUrl
        })

    } catch (error: any) {
        console.error('[POSTER_GENERATE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
