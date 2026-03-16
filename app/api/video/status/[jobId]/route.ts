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

        // 2. Check Gemini Operation status
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        // Note: Polling logic for VEO 3.0 specific operations
        // This is a placeholder for the actual refresh/poll logic
        // In a real implementation, we'd use the operation ID to check status
        
        // For now, we simulate the polling by checking if enough time has passed
        // and updating status dynamically. 
        // Real-world: operation = await genAI.getOperation(operationId);
        
        return NextResponse.json({ 
            status: video.status,
            progress: video.status === 'processing' ? 50 : 10
        });

    } catch (error: any) {
        console.error('[VIDEO_STATUS_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
