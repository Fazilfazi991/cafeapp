import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const currentPath = request.nextUrl.pathname;

    // 1. Allow public access to /, /login, /signup
    if (currentPath === '/' || currentPath.startsWith('/login') || currentPath.startsWith('/signup')) {
        // If user is already logged in, they shouldn't be visiting login/signup
        if (user && (currentPath.startsWith('/login') || currentPath.startsWith('/signup'))) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
        return supabaseResponse
    }

    // 2. Redirect unauthenticated users to /login
    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Check onboarding status
    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('onboarding_complete')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

    const isComplete = restaurants?.[0]?.onboarding_complete ?? false;

    // 3. Redirect authenticated users with onboarding_complete = false to /onboarding/step-1
    if (!isComplete && !currentPath.startsWith('/onboarding')) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding/step-1'
        return NextResponse.redirect(url)
    }

    // 4. Redirect authenticated users with onboarding_complete = true away from /onboarding
    if (isComplete && currentPath.startsWith('/onboarding')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
