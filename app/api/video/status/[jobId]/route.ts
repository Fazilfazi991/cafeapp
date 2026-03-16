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
        const operationName = video.operation_id || `operations/${video.id}`;
        // Ensure operation name starts with 'operations/'
        const normalizedOpName = operationName.startsWith('operations/') ? operationName : `operations/${operationName}`;
        
        const apiUri = `https://generativelanguage.googleapis.com/v1beta/${normalizedOpName}`;
        
        console.log(`[VIDEO_STATUS] Polling Veo 3.1 for ${normalizedOpName}`);
        const response = await fetch(apiUri, {
            headers: {
                'x-goog-api-key': process.env.GEMINI_API_KEY || ''
            }
        });
        const data = await response.json();

        if (!response.ok) {
            console.error('[VIDEO_STATUS_REST_ERROR]', data);
            return NextResponse.json({ 
                status: video.status,
                progress: 10
            });
        }

        // 3. Handle completion
        if (data.done) {
            if (data.error) {
                console.error('[VIDEO_STATUS_API_ERROR]', data.error);
                await supabase
                    .from('videos')
                    .update({ status: 'failed', error_message: data.error.message })
                    .eq('id', jobId);
                
                return NextResponse.json({ status: 'failed', error: data.error.message });
            }

            // Success! Extract video data
            // Structure: response.videos[0].video.uri OR response.videos[0].video.bytesBase64Encoded
            const videoData = data.response?.videos?.[0]?.video;
            let finalVideoUrl = videoData?.uri;

            if (videoData?.bytesBase64Encoded) {
                console.log(`[VIDEO_STATUS] Received base64 video for ${jobId}, uploading to Supabase...`);
                const buffer = Buffer.from(videoData.bytesBase64Encoded, 'base64');
                const fileName = `${jobId}.mp4`;
                
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('videos')
                    .upload(fileName, buffer, {
                        contentType: 'video/mp4',
                        upsert: true
                    });

                if (uploadError) {
                    console.error('[VIDEO_UPLOAD_ERROR]', uploadError);
                    throw new Error(`Failed to upload video to storage: ${uploadError.message}`);
                }

                const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
                finalVideoUrl = publicUrl;
            }
            
            if (finalVideoUrl) {
                await supabase
                    .from('videos')
                    .update({ 
                        status: 'completed', 
                        video_url: finalVideoUrl,
                        thumbnail_url: finalVideoUrl.replace('.mp4', '.jpg') // Placeholder thumbnail strategy
                    })
                    .eq('id', jobId);
                
                return NextResponse.json({ status: 'completed', videoUrl: finalVideoUrl });
            } else {
                throw new Error('No video URL or data found in API response');
            }
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
