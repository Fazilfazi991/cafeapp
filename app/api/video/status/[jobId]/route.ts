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

        // 2. Check Gemini Operation status via REST
        const operationId = video.operation_id || video.id;
        const apiUri = `https://generativelanguage.googleapis.com/v1beta/operations/${operationId}?key=${process.env.GEMINI_API_KEY}`;
        
        console.log(`[VIDEO_STATUS] Polling REST for ${operationId}`);
        const response = await fetch(apiUri);
        const data = await response.json();

        if (!response.ok) {
            console.error('[VIDEO_STATUS_REST_ERROR]', data);
            return NextResponse.json({ 
                status: video.status,
                progress: video.status === 'processing' ? 50 : 10
            });
        }

        // 3. Handle status updates
        if (data.done) {
            if (data.error) {
                await supabase
                    .from('videos')
                    .update({ status: 'failed', error_message: data.error.message })
                    .eq('id', jobId);
                
                return NextResponse.json({ status: 'failed', error: data.error.message });
            }

            // Success! Extract video URL from response
            // The response structure for Veo is typically in data.response.video.uri or similar
            const videoUrl = data.response?.video?.uri || data.response?.uri;
            
            if (videoUrl) {
                await supabase
                    .from('videos')
                    .update({ status: 'completed', video_url: videoUrl })
                    .eq('id', jobId);
                
                return NextResponse.json({ status: 'completed', videoUrl });
            }
        }

        return NextResponse.json({ 
            status: video.status,
            progress: video.status === 'processing' ? 50 : 10
        });

    } catch (error: any) {
        console.error('[VIDEO_STATUS_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
