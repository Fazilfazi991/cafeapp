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

        console.log('=== STARTING POSTER GENERATION ===');
        console.log('MANUS_API_KEY exists:', !!process.env.MANUS_API_KEY);
        console.log('MANUS_API_KEY value:', process.env.MANUS_API_KEY?.substring(0, 10));

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

        // STEP 4 — Generate posters with Manus API (Async)
        console.log('Using Manus API for poster generation');
        const headline = offerText?.trim() || customText?.trim() || analysis.dishName;

        try {
            const { createManusTask } = await import('@/lib/manus');
            
            // Validate API Key presence
            if (!process.env.MANUS_API_KEY) {
                throw new Error('MANUS_API_KEY is not configured in environment variables.');
            }

            let imageBuffer: Buffer | undefined = undefined;
            if (imageUrl && !imageUrl.startsWith('data:')) {
                console.log('Fetching image buffer for Manus base64 embedding...');
                const imgRes = await fetch(imageUrl);
                if (imgRes.ok) {
                    imageBuffer = Buffer.from(await imgRes.arrayBuffer());
                    console.log(`Fetched image buffer. Size: ${imageBuffer.length} bytes`);
                } else {
                    console.warn(`Failed to fetch image from URL: ${imgRes.statusText}`);
                }
            }

            const styles = ['minimal', 'bold', 'lifestyle'] as const;
            
            // Build prompts for each style
            const stylePrompts = {
                minimal: `Using this food photo as reference, restyle ONLY the background and lighting. Keep the dish exactly as it appears. Apply Dark moody background, dramatic candlelight, deep browns and golds, premium fine dining aesthetic. NO TEXT. NO TYPOGRAPHY.`,
                lifestyle: `Using this food photo as reference, restyle ONLY the background and lighting. Keep the dish exactly as it appears. Apply Clean white marble background, bright natural daylight, fresh healthy cafe aesthetic. NO TEXT. NO TYPOGRAPHY.`,
                bold: `Generate an appetizing food poster for ${analysis.dishName}. Style: ${restaurant.name} brand colors, bold energetic graphic design, vivid colors, modern street food aesthetic. Display the dish name "${analysis.dishName}" in large elegant font. NO ADDRESS OR PHONE NUMBERS.`
            };

            const taskPromises = styles.map(style => 
                createManusTask({ 
                    prompt: stylePrompts[style], 
                    imageBuffer: style === 'bold' ? undefined : imageBuffer 
                }).then(id => ({ style, taskId: id }))
            );

            const taskResults = await Promise.all(taskPromises);
            const tasks = taskResults.reduce((acc, curr) => ({ ...acc, [curr.style]: curr.taskId }), {});

            console.log('Manus tasks created! Returning task IDs for polling...');
            return NextResponse.json({
                success: true,
                isAsync: true,
                restaurantId: restaurant.id,
                dishName: analysis.dishName,
                tasks,
                captions
            });

        } catch (manusError: any) {
            console.error('=== MANUS_INIT_FAILED ===');
            console.error(manusError);
            return NextResponse.json({ 
                error: 'Poster generation failed. Please try again.',
                details: manusError.message,
                stack: manusError.stack
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('=== POSTER_GENERATION_ERROR ===');
        console.error(error);
        return NextResponse.json({ error: error.message || 'Failed to generate posters' }, { status: 500 });
    }
}
