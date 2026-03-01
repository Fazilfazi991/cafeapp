import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { enhancePhoto } from '@/lib/falai'
import { renderTemplate } from '@/lib/poster-templates'
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

        // Get brand settings
        const { data: restaurants, error: fetchError } = await supabase
            .from('restaurants')
            .select('id, name, cuisine_type, business_type, tone_of_voice, phone, email, address, website, brand_settings(primary_color, secondary_color, logo_url, font_style)')
            .eq('user_id', user.id)
            .limit(1)

        if (fetchError) {
            console.error('[DATABASE_FETCH_ERROR]', fetchError)
        }

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.json({ error: fetchError ? `DB Error: ${fetchError.message}` : 'Restaurant not found' }, { status: 404 })
        }

        const brand = restaurant.brand_settings?.[0] || { primary_color: '#FF6B35', secondary_color: '#FFFFFF', logo_url: '', font_style: 'modern' }

        // STEP 1 - Enhance photo with fal.ai
        const enhancedPhotoUrl = await enhancePhoto(imageUrl)

        // STEP 2 - Build parameters and render 3 HTML templates
        const templateParams = {
            photoUrl: enhancedPhotoUrl,
            businessName: restaurant.name,
            tagline: restaurant.cuisine_type || 'Restaurant', // Using cuisine_type as default tagline for restaurants
            customText: promotionalText,
            phone: restaurant.phone,
            website: restaurant.website || restaurant.email, // fallback to email if no web
            logoUrl: brand.logo_url,
            primaryColor: brand.primary_color,
            secondaryColor: brand.secondary_color || '#FFFFFF',
            fontStyle: brand.font_style || 'modern'
        }

        const [minimalHtml, boldHtml, lifestyleHtml] = await Promise.all([
            renderTemplate('minimal', templateParams),
            renderTemplate('bold', templateParams),
            renderTemplate('lifestyle', templateParams)
        ]);

        // STEP 3 - Screenshots via Puppeteer Serverless + Upload to Supabase Storage
        const [minimalBuffer, boldBuffer, lifestyleBuffer] = await Promise.all([
            renderPosterToImage(minimalHtml, 'square'),
            renderPosterToImage(boldHtml, 'square'),
            renderPosterToImage(lifestyleHtml, 'square')
        ]);

        const [minimalUrl, boldUrl, lifestyleUrl] = await Promise.all([
            uploadPosterToSupabase(minimalBuffer, restaurant.id, 'minimal'),
            uploadPosterToSupabase(boldBuffer, restaurant.id, 'bold'),
            uploadPosterToSupabase(lifestyleBuffer, restaurant.id, 'lifestyle')
        ]);

        return NextResponse.json({
            posters: {
                minimal: minimalUrl,
                bold: boldUrl,
                lifestyle: lifestyleUrl
            }
        })

    } catch (error: any) {
        console.error('[POSTER_GENERATION_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Failed to generate posters' }, { status: 500 })
    }
}
