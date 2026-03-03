import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
        const restaurantId = restaurants?.[0]?.id
        if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

        const body = await req.json()
        const { base64Image } = body

        if (!base64Image || !base64Image.startsWith('data:image')) {
            return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
        }

        // Use admin client to bypass RLS for this internal server-side upload
        const adminSupabase = createAdminClient()
        const base64Data = base64Image.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        const fileName = `${restaurantId}/${Date.now()}-poster.jpg`

        const { error: uploadError } = await adminSupabase.storage
            .from('media')
            .upload(fileName, buffer, {
                contentType: 'image/jpeg',
                upsert: true
            })

        if (uploadError) {
            console.error('[POSTER_UPLOAD_ERROR]', uploadError)
            throw new Error(uploadError.message)
        }

        const { data: { publicUrl } } = adminSupabase.storage
            .from('media')
            .getPublicUrl(fileName)

        return NextResponse.json({ success: true, publicUrl })

    } catch (error: any) {
        console.error('[UPLOAD_POSTER_ROUTE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
    }
}
