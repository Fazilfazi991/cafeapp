import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Log request size to debug potential 413s
        const contentLength = req.headers.get('content-length');
        console.log(`[VIDEO_API] Received request. Size: ${contentLength} bytes`);

        let body;
        try {
            body = await req.json();
        } catch (jsonErr) {
            console.error('[VIDEO_API] JSON parse error:', jsonErr);
            return NextResponse.json({ 
                error: 'Invalid JSON request. The image might be too large or the payload corrupted.' 
            }, { status: 400 });
        }
        let { 
            title, 
            prompt, 
            negativePrompt, 
            aspectRatio = '9:16', 
            duration = 8, 
            generateAudio = true,
            restaurantId,
            referenceImage
        } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        // 0. Auto-resolve restaurantId if missing
        if (!restaurantId) {
            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('id')
                .eq('user_id', user.id)
                .limit(1)
                .single();
            
            if (restaurant) {
                restaurantId = restaurant.id;
            }
        }

        // 1. Create DB record
        const { data: videoRecord, error: dbError } = await supabase
            .from('videos')
            .insert({
                restaurant_id: restaurantId,
                title,
                prompt,
                negative_prompt: negativePrompt,
                aspect_ratio: aspectRatio,
                duration,
                generate_audio: generateAudio,
                status: 'pending'
            })
            .select()
            .single();

        if (dbError) throw dbError;

        // 2. Initialize Google GenAI SDK (Veo 3.1)
        console.log(`[VIDEO_API] Initializing GoogleGenAI SDK for ${videoRecord.id}`);
        // @ts-ignore
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ 
            apiKey: process.env.GEMINI_API_KEY || '' 
        });

        // 3. Call generateVideos
        console.log(`[VIDEO_API] Calling generateVideos for ${videoRecord.id}`);
        const operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: prompt,
            config: {
                aspectRatio: aspectRatio,
                numberOfVideos: 1,
            }
        });

        console.log(`[VIDEO_API] Operation created: ${operation.name}`);

        // Update record with operation info if available, or just mark as processing
        await supabase
            .from('videos')
            .update({ 
                status: 'processing',
                operation_id: operation?.name
            })
            .eq('id', videoRecord.id);

        return NextResponse.json({ 
            success: true, 
            jobId: videoRecord.id,
            operationId: operation?.name || videoRecord.id
        });

    } catch (error: any) {
        console.error('[VIDEO_GENERATE_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to initiate video generation' }, { status: 500 });
    }
}
