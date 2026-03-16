import { NextResponse } from 'next/server';
import { getManusTaskStatus } from '@/lib/manus';
import { applyPosterOverlays } from '@/lib/gemini';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get('taskId');
        const restaurantId = searchParams.get('restaurantId');

        if (!taskId || !restaurantId) {
            return NextResponse.json({ error: 'Missing taskId or restaurantId' }, { status: 400 });
        }

        const task = await getManusTaskStatus(taskId);

        if (task.status === 'completed' && task.resultUrl) {
            // Task is done, now apply our branding overlays
            const supabase = createClient();
            
            // Fetch restaurant and brand info for overlays
            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', restaurantId)
                .single();

            const { data: brand } = await supabase
                .from('brand_settings')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .single();

            if (!restaurant) {
                return NextResponse.json({ error: 'Restaurant no longer found' }, { status: 404 });
            }

            // Download the generated image
            const imageRes = await fetch(task.resultUrl);
            if (!imageRes.ok) throw new Error('Failed to download generated poster from Manus');
            const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

            // Apply overlays
            const finalBase64 = await applyPosterOverlays(imageBuffer, {
                phone: restaurant.phone || '',
                address: restaurant.address || 'Dubai, UAE',
                logoUrl: brand?.logo_url || undefined
            });

            return NextResponse.json({ 
                status: 'completed', 
                imageUrl: finalBase64 
            });
        }

        if (task.status === 'failed') {
            return NextResponse.json({ status: 'failed', error: task.error || 'Manus generation failed' });
        }

        // Still pending or running
        return NextResponse.json({ status: task.status });

    } catch (error: any) {
        console.error('[MANUS_STATUS_ERROR]', error);
        return NextResponse.json({ status: 'failed', error: error.message }, { status: 500 });
    }
}
