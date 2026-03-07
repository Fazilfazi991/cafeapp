import { createClient } from '@/lib/supabase-server'
import { getAuthUrl } from '@/lib/meta'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const type = url.searchParams.get('type') === 'ad' ? 'ad' : 'page';
        
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]
        if (!restaurant) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Generate the URL and redirect
        // getAuthUrl handles the console.log of the redirect_uri explicitly requested by the user
        const authUrl = getAuthUrl(restaurant.id, type)
        return NextResponse.redirect(authUrl)

    } catch (error) {
        console.error('[META_CONNECT_ERROR]', error)
        return NextResponse.redirect(new URL('/dashboard/settings?error=meta_connect_failed', request.url))
    }
}
