import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(
    req: Request,
    { params }: { params: { jobId: string } }
) {
    try {
        const jobId = params.jobId;
        const supabase = createClient();
        
        // 1. Get video record
        const { data: video, error: fetchError } = await supabase
            .from('videos')
            .select('*')
            .eq('id', jobId)
            .single();

        if (fetchError || !video) {
            return NextResponse.json({ error: 'Video record not found' }, { status: 404 });
        }

        if (video.status === 'completed' || video.status === 'failed') {
            return NextResponse.json({ 
                status: video.status, 
                videoUrl: video.video_url,
                error: video.error_message 
            });
        }

        // 2. Check operation status via new SDK
        const operationName = video.operation_id;
        console.log(`[VIDEO_STATUS] Received jobId: ${jobId}, fetched operation_id: ${operationName}`);
        
        if (!operationName) {
            return NextResponse.json({ 
                status: 'failed', 
                error: 'No operation ID found for this video' 
            });
        }

        console.log(`[VIDEO_STATUS] refreshing operation via SDK: ${operationName}`);
        
        // @ts-ignore
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ 
            apiKey: process.env.GEMINI_API_KEY || '' 
        });

        // Recreate operation object and refresh
        // @ts-ignore
        let operation = await ai.operations.get({ name: operationName });
        
        if (!operation.done) {
            console.log(`[VIDEO_STATUS] Operation ${operationName} still in progress`);
            return NextResponse.json({ 
                status: 'processing',
                progress: 50
            });
        }

        // 3. Handle completion
        console.log(`[VIDEO_STATUS] Operation ${operationName} is DONE`);
        
        if (operation.error) {
            console.error('[VIDEO_STATUS_SDK_ERROR]', operation.error);
            await supabase
                .from('videos')
                .update({ status: 'failed', error_message: operation.error.message })
                .eq('id', jobId);
            
            return NextResponse.json({ status: 'failed', error: operation.error.message });
        }

        // Success! Extract video data using the new SDK structure
        const generatedVideo = operation.response?.generatedVideos?.[0] || operation.response?.generateVideoResponse?.generatedSamples?.[0];
        const videoBytes = generatedVideo?.video?.bytesBase64Encoded;
        const videoUri = generatedVideo?.video?.uri;
        
        if (videoBytes || videoUri) {
            let buffer: Buffer;
            
            if (videoBytes) {
                console.log(`[VIDEO_STATUS] Received base64 video for ${jobId}, uploading...`);
                buffer = Buffer.from(videoBytes, 'base64');
            } else {
                console.log(`[VIDEO_STATUS] No bytes found. Fetching from URI: ${videoUri}`);
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

            const fileName = `${jobId}.mp4`;
            
            const { error: uploadError } = await supabase
                .storage
                .from('videos')
                .upload(fileName, buffer, {
                    contentType: 'video/mp4',
                    upsert: true
                });

            if (uploadError) {
                console.error('[VIDEO_UPLOAD_ERROR]', uploadError);
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
            
            await supabase
                .from('videos')
                .update({ 
                    status: 'completed', 
                    video_url: publicUrl,
                    thumbnail_url: publicUrl.replace('.mp4', '.jpg')
                })
                .eq('id', jobId);
            
            return NextResponse.json({ status: 'completed', videoUrl: publicUrl });
        } else {
            console.error('[VIDEO_STATUS_MISSING_DATA] No video data (bytes or URI) found in response');
            throw new Error('No video data found in SDK response');
        }

        return NextResponse.json({ 
            status: 'processing',
            progress: 50 // Placeholder progress
        });

    } catch (error: any) {
        console.error('[VIDEO_STATUS_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
