import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { analyzeFoodPhoto, generateAllPosters } from '@/lib/gemini';
import { generateCaptions } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { imageUrl, customText, dishName: providedDishName, offerText } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
        }

        // STEP 1 — Get restaurant data
        const { data: restaurants, error: fetchError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);

        const restaurant = restaurants?.[0];

        if (fetchError || !restaurant) {
            console.error('[POSTER_API] Restaurant fetch error:', fetchError);
            return NextResponse.json({ error: fetchError ? fetchError.message : 'Restaurant not found for user' }, { status: 404 });
        }

        const { data: brands } = await supabase
            .from('brand_settings')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .limit(1);

        const brand = brands?.[0];

        // STEP 2 — Analyze photo with Gemini Vision (or use provided dishName)
        console.log('Analyzing photo...');
        let analysis: { dishName: string; description: string; ingredients: string[]; cuisine: string };

        if (providedDishName?.trim()) {
            analysis = {
                dishName: providedDishName,
                description: `A delicious serving of our signature ${providedDishName}.`,
                ingredients: [],
                cuisine: restaurant.cuisine_type || 'International'
            };
        } else {
            analysis = await analyzeFoodPhoto(imageUrl);
        }

        console.log('Dish identified:', analysis.dishName);

        // STEP 3 — Generate captions
        console.log('Generating captions...');
        const captions = await generateCaptions({
            restaurantName: restaurant.name || 'Our Restaurant',
            cuisineType: restaurant.cuisine_type || restaurant.business_type || 'Restaurant',
            city: restaurant.city || '',
            tone: restaurant.tone_of_voice || 'casual',
            dishName: analysis.dishName,
            dishDescription: analysis.description,
            platform: 'instagram'
        });

        // STEP 4 — Generate posters with Gemini AI
        console.log('Generating posters with Gemini AI...');
        const headline = offerText?.trim() || customText?.trim() || analysis.dishName;

        const posters = await generateAllPosters({
            photoUrl: imageUrl,
            logoUrl: brand?.logo_url || undefined,
            businessName: restaurant.name || 'Our Restaurant',
            businessType: restaurant.cuisine_type || 'Restaurant',
            customText: headline,
            dishName: analysis.dishName,
            dishDescription: analysis.description,
            phone: restaurant.phone || '',
            website: restaurant.website || '',
            primaryColor: brand?.primary_color || '#FF6B35',
            tone: restaurant.tone_of_voice || 'casual',
            restaurantId: restaurant.id,
        });

        console.log('Complete! Returning data...');
        return NextResponse.json({
            success: true,
            dishName: analysis.dishName,
            posters,
            captions
        });

    } catch (error: any) {
        console.error('[POSTER_GENERATION_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to generate posters' }, { status: 500 });
    }
}
