import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Log request size to debug potential 413s
        const contentLength = req.headers.get('content-length');
        console.log(`[VEO] Received request. Size: ${contentLength} bytes`);

        let body;
        try {
            body = await req.json();
        } catch (jsonErr) {
            console.error('[VEO] JSON parse error:', jsonErr);
            return NextResponse.json({ 
                error: 'Invalid JSON request. The image might be too large or the payload corrupted.' 
            }, { status: 400 });
        }

        const { 
            title, 
            prompt, 
            aspectRatio = '9:16', 
            duration = 8,
            restaurantId: providedRestaurantId
        } = body;

        console.log('[VEO] Starting with prompt:', prompt);

        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        // Auto-resolve restaurantId if missing
        let restaurantId = providedRestaurantId;
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
        if (!restaurantId) {
            console.error('[VEO] No restaurant found for user:', user.id);
            return NextResponse.json({ 
                error: 'Please select or create a restaurant before generating videos.' 
            }, { status: 400 });
        }

        // 1. Create DB record for tracking
        console.log(`[VEO] Attempting insert. User: ${user.id}, Restaurant: ${restaurantId}`);
        const { data: videoRecord, error: dbError } = await supabase
            .from('videos')
            .insert({
                restaurant_id: restaurantId,
                title: title || 'New Studio Reel',
                prompt,
                aspect_ratio: aspectRatio,
                duration,
                status: 'pending'
            })
            .select()
            .single();

        if (dbError) throw dbError;

        // 2. Initialize Google GenAI SDK
        console.log('[VEO] Initializing GoogleGenAI SDK...');
        const ai = new GoogleGenAI({ 
            apiKey: process.env.GEMINI_API_KEY! 
        });

        console.log('[VEO] Calling generateVideos...');
        
        // Exact implementation as requested
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: prompt,
            config: {
                aspectRatio: aspectRatio,
                numberOfVideos: 1,
            }
        });

        console.log('[VEO] Operation created:', JSON.stringify(operation));

        // Update DB with operation name immediately
        await supabase
            .from('videos')
            .update({ 
                status: 'processing',
                operation_id: operation.name
            })
            .eq('id', videoRecord.id);

        // 3. Poll until complete (Wait for up to 10 minutes)
        const operationName = operation.name;
        console.log('[VEO] Operation name:', operationName);

        let done = false;
        let attempts = 0;
        const maxAttempts = 60;
        const delay = 10000; // 10 seconds
        let finalResponse = null;

        while (!done && attempts < maxAttempts) {
            console.log(`[VEO] Polling attempt ${attempts + 1}/${maxAttempts} for ${videoRecord.id}...`);
            await new Promise(r => setTimeout(r, delay));
            attempts++;

            try {
                const pollResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
                    {
                        headers: {
                            'x-goog-api-key': process.env.GEMINI_API_KEY!
                        }
                    }
                );
                
                const pollData = await pollResponse.json();
                console.log('[VEO] Poll response status:', pollResponse.status);
                
                if (pollData.done) {
                    done = true;
                    finalResponse = pollData;
                }
            } catch (pollErr: any) {
                console.error('[VEO] Polling error:', pollErr.message);
                // Continue polling unless it's a critical failure
            }
        }

        if (!done || !finalResponse) {
            const timeoutError = 'Video generation timed out after 10 minutes';
            console.error(`[VEO] ${timeoutError}`);
            await supabase
                .from('videos')
                .update({ status: 'failed', error_message: timeoutError })
                .eq('id', videoRecord.id);
            throw new Error(timeoutError);
        }

        console.log('[VEO] Done! Response data available.');

        // 4. Extract video details
        // Structure: finalResponse.response.generateVideoResponse.generatedSamples[0].video
        const video = finalResponse
            ?.response
            ?.generateVideoResponse
            ?.generatedSamples?.[0]
            ?.video;

        console.log('[VEO] Video object summary:', video ? 'Found' : 'Not Found');

        if (!video) {
            const noVideoError = 'No video found in response';
            await supabase
                .from('videos')
                .update({ status: 'failed', error_message: noVideoError })
                .eq('id', videoRecord.id);
            throw new Error(noVideoError);
        }

        const videoBytes = video.bytesBase64Encoded;
        const videoUri = video.uri;

        console.log('[VEO] Has bytes:', !!videoBytes);
        console.log('[VEO] Has URI:', !!videoUri);

        let finalVideoUrl = videoUri;

        if (videoBytes || videoUri) {
            let buffer: Buffer;
            
            if (videoBytes) {
                console.log('[VEO] Using provided bytes from response.');
                buffer = Buffer.from(videoBytes, 'base64');
            } else {
                console.log('[VEO] No bytes provided. Fetching from URI:', videoUri);
                const videoResponse = await fetch(videoUri!, {
                    headers: { 
                        'x-goog-api-key': process.env.GEMINI_API_KEY! 
                    }
                });
                if (!videoResponse.ok) {
                    throw new Error(`Failed to fetch video bytes from URI: ${videoResponse.statusText}`);
                }
                buffer = Buffer.from(await videoResponse.arrayBuffer());
            }

            console.log('[VEO] Uploading video to Supabase Storage...');
            const fileName = `studio-${videoRecord.id}.mp4`;
            
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(fileName, buffer, { 
                    contentType: 'video/mp4',
                    upsert: true
                });
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(fileName);
            
            finalVideoUrl = publicUrl;
        }

        if (finalVideoUrl) {
            console.log('[VEO] Final video URL:', finalVideoUrl);
            await supabase
                .from('videos')
                .update({ 
                    status: 'completed', 
                    video_url: finalVideoUrl,
                    thumbnail_url: finalVideoUrl.replace('.mp4', '.jpg')
                })
                .eq('id', videoRecord.id);

            return NextResponse.json({ 
                success: true, 
                videoUrl: finalVideoUrl,
                jobId: videoRecord.id 
            });
        }

        throw new Error('Could not resolve a stable video URL from the response');

    } catch (error: any) {
        console.error('[VEO] Fatal Error:', error.message);
        return NextResponse.json(
            { error: error.message }, 
            { status: 500 }
        );
    }
}
