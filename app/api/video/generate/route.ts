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

        const body = await req.json();
        const { 
            title, 
            prompt, 
            negativePrompt, 
            aspectRatio = '9:16', 
            duration = 8, 
            generateAudio = true,
            restaurantId,
            referenceImage // Base64 optional
        } = body;

        if (!prompt || !restaurantId) {
            return NextResponse.json({ error: 'Missing prompt or restaurantId' }, { status: 400 });
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

        // 2. Initialize Gemini Veo
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        // @ts-ignore - Veo 3.0 might not be in the typings yet
        const model = genAI.getGenerativeModel({ model: "veo-3.0-generate-preview" });

        console.log(`[VIDEO_API] Starting generation for ${videoRecord.id}`);

        // Prepare prompt with base64 reference if exists
        let finalPrompt = prompt;
        // In the future, we might use the actual generative components for multi-modal
        // For now, if referenceImage is provided, it's handled as part of the specialized VEO call if supported
        
        // 3. Call Veo API
        // @ts-ignore
        const operation = await model.generateVideo({
            prompt: finalPrompt,
            config: {
                aspectRatio: aspectRatio,
                durationSeconds: duration,
                generateAudio: generateAudio
            }
        });

        // Update record with operation info if available, or just mark as processing
        await supabase
            .from('videos')
            .update({ status: 'processing' })
            .eq('id', videoRecord.id);

        return NextResponse.json({ 
            success: true, 
            jobId: videoRecord.id,
            operationId: operation?.name || videoRecord.id // Use internal ID if operation name is missing
        });

    } catch (error: any) {
        console.error('[VIDEO_GENERATE_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to initiate video generation' }, { status: 500 });
    }
}
