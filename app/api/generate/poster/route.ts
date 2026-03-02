import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { analyzeFoodPhoto } from '@/lib/gemini';
import { generateCaptions } from '@/lib/openai';
import { renderHTMLToPNG, uploadToStorage } from '@/lib/poster-renderer';
import { getMinimalTemplate, getBoldTemplate, getLifestyleTemplate, PosterTemplateData } from '@/lib/poster-templates';

export async function POST(req: Request) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { imageUrl, customText, dishName: providedDishName } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
        }

        // STEP 1 — Get all restaurant data
        const { data: restaurant, error: fetchError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (fetchError || !restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        const { data: brand } = await supabase
            .from('brand_settings')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .single();

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

        // STEP 3 — Generate captions using dish info
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

        // STEP 4 — Convert uploaded photo to base64
        console.log('Fetching photo to Base64...');
        const photoResp = await fetch(imageUrl);
        if (!photoResp.ok) throw new Error('Failed to fetch the uploaded photo');
        const photoBuffer = await photoResp.arrayBuffer();
        const photoBase64 = Buffer.from(photoBuffer).toString('base64');

        // STEP 5 — Convert logo to base64 if exists
        let logoBase64 = null;
        if (brand?.logo_url) {
            console.log('Fetching logo to Base64...');
            try {
                const logoResp = await fetch(brand.logo_url);
                if (logoResp.ok) {
                    const logoBuffer = await logoResp.arrayBuffer();
                    logoBase64 = Buffer.from(logoBuffer).toString('base64');
                }
            } catch (e) {
                console.log('Logo fetch failed:', e);
            }
        }

        // STEP 6 — Build template data
        const templateData: PosterTemplateData = {
            photoBase64: photoBase64,
            logoBase64: logoBase64 || null,
            businessName: restaurant.name || '',
            customText: customText || analysis.dishName,
            phone: restaurant.phone || '',
            website: restaurant.website || '',
            primaryColor: brand?.primary_color || '#FF6B35',
            secondaryColor: brand?.secondary_color || '#FFFFFF'
        };

        console.log('Template data summary:', {
            hasPhoto: !!templateData.photoBase64,
            hasLogo: !!templateData.logoBase64,
            businessName: templateData.businessName,
            customText: templateData.customText,
            phone: templateData.phone,
            website: templateData.website,
            primaryColor: templateData.primaryColor
        });

        // STEP 7 — Render 3 HTML templates with Puppeteer
        console.log('Rendering HTML templates with Puppeteer...');
        const [minBuf, boldBuf, lifeBuf] = await Promise.all([
            renderHTMLToPNG(getMinimalTemplate(templateData)),
            renderHTMLToPNG(getBoldTemplate(templateData)),
            renderHTMLToPNG(getLifestyleTemplate(templateData))
        ]);

        // STEP 8 — Upload all 3 to Supabase Storage
        console.log('Uploading posters to Supabase...');
        const [minUrl, boldUrl, lifeUrl] = await Promise.all([
            uploadToStorage(minBuf, restaurant.id, 'minimal'),
            uploadToStorage(boldBuf, restaurant.id, 'bold'),
            uploadToStorage(lifeBuf, restaurant.id, 'lifestyle')
        ]);

        // STEP 9 — Return everything
        console.log('Complete! Returning data...');
        return NextResponse.json({
            success: true,
            dishName: analysis.dishName,
            posters: {
                minimal: minUrl,
                bold: boldUrl,
                lifestyle: lifeUrl
            },
            captions: captions
        });

    } catch (error: any) {
        console.error('[POSTER_GENERATION_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to generate posters' }, { status: 500 });
    }
}
