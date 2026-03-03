import { NextResponse } from 'next/server'

export async function GET() {
    return NextResponse.json({
        hasClientId: !!process.env.META_CLIENT_ID,
        clientIdValue: process.env.META_CLIENT_ID || 'undefined',
        hasClientSecret: !!process.env.META_CLIENT_SECRET,
        hasRedirectUri: !!process.env.META_REDIRECT_URI,
        redirectUriValue: process.env.META_REDIRECT_URI || 'undefined',
        nodeEnv: process.env.NODE_ENV
    })
}
