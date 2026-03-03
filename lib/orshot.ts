import axios from 'axios'
import { createAdminClient } from '@/lib/supabase-admin'

const ORSHOT_API_KEY = process.env.ORSHOT_API_KEY!
const ORSHOT_ENDPOINT = 'https://api.orshot.com/v1/studio/render'

const truncateAtWord = (text: string, maxLength: number): string => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    return lastSpace > 0
        ? truncated.substring(0, lastSpace) + '...'
        : truncated + '...'
}

export async function generateOrshotPoster(
    params: {
        templateId: string
        photoUrl: string
        logoUrl?: string | null
        dishName: string
        customHeadline?: string
        offerText?: string
        description: string
        phone: string
        website: string
        instagramHandle?: string
        ctaText?: string
        restaurantName: string
        restaurantId: string
        token: string
    }
): Promise<string> {

    // Build modifications as KEY-VALUE OBJECT
    const modifications: Record<string, string> = {
        food_photo: params.photoUrl,
        dish_name: params.dishName || params.customHeadline || 'Special Dish',
        headline: params.customHeadline || 'Special',
        description: truncateAtWord(params.description, 85),
        phone: params.phone || '',
        website: params.website || '',
        instagram_handle: params.instagramHandle || '',
        'Book Now': params.ctaText || 'Order Now',
        offer_text: params.offerText?.trim() || ''
    }

    // Add logo only if exists
    if (params.logoUrl) {
        modifications.logo = params.logoUrl
    }

    console.log('Calling Orshot API...')
    console.log('Template ID:', params.templateId)
    console.log('Modifications:', JSON.stringify(modifications, null, 2))

    const response = await axios.post(
        ORSHOT_ENDPOINT,
        {
            templateId: params.templateId,
            modifications,
            response: {
                format: 'png',
                type: 'base64'
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${ORSHOT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    )

    console.log('Orshot response status:', response.status)
    console.log('[DEBUG_ORSHOT_RESPONSE_BODY]:', JSON.stringify(response.data, null, 2))

    // Extract base64 image from response
    const base64Data = response.data?.data?.content

    if (!base64Data) {
        console.error('Full response:', JSON.stringify(response.data, null, 2))
        throw new Error('No image content in Orshot response')
    }

    // Remove data:image/png;base64, prefix
    const base64Clean = base64Data.includes(',')
        ? base64Data.split(',')[1]
        : base64Data

    // Convert to buffer
    const imageBuffer = Buffer.from(base64Clean, 'base64')

    // Upload to Supabase Storage via raw fetch with user auth token
    const fileName = `${params.restaurantId}/${Date.now()}-poster.png`
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/posters/${fileName}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${params.token}`,
            'apiKey': anonKey as string,
            'Content-Type': 'image/png',
            'x-upsert': 'false'
        },
        body: imageBuffer as any
    });

    if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Storage upload failed: ${errorText}`)
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/posters/${fileName}`

    console.log('Poster ready:', publicUrl)
    return publicUrl
}

export async function generateAllOrshotPosters(
    baseParams: Omit<Parameters<typeof generateOrshotPoster>[0], 'templateId'>
): Promise<{
    minimal: string;
    bold: string;
    lifestyle: string;
}> {
    const templateId1 = process.env.ORSHOT_TEMPLATE_1!
    const templateId2 = process.env.ORSHOT_TEMPLATE_2 || templateId1
    const templateId3 = process.env.ORSHOT_TEMPLATE_3 || templateId1

    const [minimal, bold, lifestyle] = await Promise.all([
        generateOrshotPoster({
            ...baseParams,
            templateId: templateId1
        }),
        generateOrshotPoster({
            ...baseParams,
            templateId: templateId2
        }),
        generateOrshotPoster({
            ...baseParams,
            templateId: templateId3
        })
    ]);

    return { minimal, bold, lifestyle };
}
