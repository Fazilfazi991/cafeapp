import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { caption, imageUrl, scheduledTime, platforms } = body

        if (!caption || !imageUrl || !platforms || platforms.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get restaurant ID
        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) throw new Error('Restaurant not found')

        // Fetch user's connected meta account to ensure they actually have Facebook/IG linked
        const { data: metaAccount } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'facebook')
            .single()

        if (!metaAccount || !metaAccount.meta_access_token) {
            return NextResponse.json({ error: 'Meta account is not connected.' }, { status: 403 })
        }

        const fbPlatform = platforms.find((p: string) => p === 'facebook' || p === 'instagram');
        if (!fbPlatform) {
            return NextResponse.json({ error: 'No Meta platforms requested' }, { status: 400 })
        }

        let finalImageUrl = imageUrl;

        // If it's a base64 data URL (from Gemini), Facebook will reject it. We must upload to Supabase Storage first.
        if (finalImageUrl.startsWith('data:image')) {
            const base64Data = finalImageUrl.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${restaurant.id}/${Date.now()}-poster.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('media') // reusing the existing media bucket
                .upload(fileName, buffer, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) {
                console.error('[STORAGE_UPLOAD_ERROR]', uploadError);
                throw new Error('Failed to upload generated poster to storage for publishing.');
            }

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(fileName);

            finalImageUrl = publicUrl;
        }

        // Calculate a publish time
        // If scheduledTime exists, use it. Otherwise post now.
        const scheduledDate = scheduledTime ? new Date(scheduledTime) : new Date();
        const runAt = scheduledDate.toISOString();

        // If scheduled time is within 10 minutes, publish immediately bypass the daily cron limitations
        const isImmediate = (scheduledDate.getTime() - Date.now()) < 10 * 60 * 1000;

        let finalStatus = isImmediate ? 'published' : 'scheduled';
        let publishedAt = isImmediate ? new Date().toISOString() : null;

        if (isImmediate) {
            // Let's import the publish functions dynamically or at the top
            const { publishToFacebook, publishToInstagram } = await import('@/lib/meta');

            if (platforms.includes('facebook')) {
                if (!metaAccount.meta_page_id) throw new Error('No Facebook Page ID attached')
                await publishToFacebook(metaAccount.meta_page_id, metaAccount.meta_access_token, caption, finalImageUrl)
            }
            if (platforms.includes('instagram')) {
                if (!metaAccount.meta_ig_id) throw new Error('No Instagram Business Account attached')
                await publishToInstagram(metaAccount.meta_ig_id, metaAccount.meta_access_token, caption, finalImageUrl)
            }
        }

        // Save to our generic posts table
        // We know it either succeeded or was scheduled for later if it reaches here
        const { data: insertedPost, error: insertError } = await supabase
            .from('posts')
            .insert({
                restaurant_id: restaurant.id,
                post_type: 'image',
                poster_url: finalImageUrl,
                selected_caption: caption,
                scheduled_at: runAt,
                published_at: publishedAt,
                // We store both "facebook" and "instagram" platforms requested here, the cron job parses them
                platforms: platforms.filter((p: string) => p === 'facebook' || p === 'instagram'),
                status: finalStatus
            })
            .select()
            .single()

        if (insertError) throw insertError

        return NextResponse.json({ success: true, post: insertedPost })

    } catch (error: any) {
        console.error('[META_SCHEDULE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Error scheduling post' }, { status: 500 })
    }
}
