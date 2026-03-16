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

        // 2. Initialize parameters
        console.log(`[VIDEO_API] Starting generation for ${videoRecord.id}`);

        // 3. Call Veo 3.1 API via direct REST
        const apiUri = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning`;
        
        const payload = {
            instances: [{
                prompt: prompt
            }],
            parameters: {
                aspectRatio: aspectRatio,
                durationSeconds: duration
            }
        };

        // Note: Reference image support in predictLongRunning might differ
        // For now, we follow the exact structure provided for prompt-based generation
        if (referenceImage) {
            const matches = referenceImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                // @ts-ignore
                payload.instances[0].image = {
                    mimeType: matches[1],
                    data: matches[2]
                };
            }
        }

        console.log(`[VIDEO_API] Calling Veo 3.1 predictLongRunning for ${videoRecord.id}`);
        const response = await fetch(apiUri, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY || ''
            },
            body: JSON.stringify(payload)
        });

        console.log(`[VIDEO_API] Veo API Status: ${response.status}`);
        
        const text = await response.text();
        console.log(`[VIDEO_API] Raw response: ${text.substring(0, 500)}`);

        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseErr: any) {
            console.error('[VIDEO_API] JSON parse error:', parseErr.message);
            throw new Error(`Invalid JSON from Veo API (Status ${response.status})`);
        }
        
        if (!response.ok) {
            console.error('[VIDEO_REST_ERROR]', data);
            throw new Error(data.error?.message || `API error: ${response.status}`);
        }

        const operation = data;
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
