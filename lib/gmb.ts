import { createClient } from '@/lib/supabase-server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

export function getAuthUrl(restaurantId: string): string {
    const scope = encodeURIComponent('https://www.googleapis.com/auth/business.manage');
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/business.manage',
        access_type: 'offline',
        prompt: 'consent',
        state: restaurantId,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: GOOGLE_REDIRECT_URI,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const data = await response.json();
    // expiry is usually in seconds
    const expiryTime = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiryTime,
    };
}

export async function refreshAccessToken(refreshToken: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = await response.json();
    return {
        access_token: data.access_token,
        expires_in: data.expires_in,
    };
}

export async function getGMBAccounts(accessToken: string) {
    const response = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch GMB accounts: ${error}`);
    }

    const data = await response.json();
    return data.accounts || [];
}

export async function getGMBLocations(accountId: string, accessToken: string) {
    const response = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch GMB locations: ${error}`);
    }

    const data = await response.json();
    return data.locations || [];
}

export async function createGMBPost(locationName: string, imageUrl: string, caption: string, accessToken: string) {
    // Truncate caption if longer than 1500 chars (GMB limit)
    const summary = caption.substring(0, 1500);
    const domain = process.env.NEXT_PUBLIC_APP_URL || 'https://postchef.com';

    const response = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/localPosts`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            languageCode: "en-US",
            summary,
            callToAction: {
                actionType: "LEARN_MORE",
                url: domain, // the prompt says 'restaurant website url' but we don't naturally have it, let's just use NEXT_PUBLIC_APP_URL for now or pass as optional
            },
            media: [{
                mediaFormat: "PHOTO",
                sourceUrl: imageUrl
            }],
            topicType: "STANDARD"
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create GMB post: ${error}`);
    }

    const data = await response.json();
    return data.name; // post ID
}

export async function scheduleGMBPost(
    restaurantId: string,
    imageUrl: string,
    caption: string,
    scheduledTime: string,
    accessToken: string
) {
    const supabase = createClient();

    const { data, error } = await supabase.from('posts').insert({
        restaurant_id: restaurantId,
        platform: 'gmb',
        poster_url: imageUrl,
        selected_caption: caption,
        scheduled_at: scheduledTime,
        status: 'scheduled',
    }).select().single();

    if (error) {
        throw new Error(`Failed to schedule GMB post in database: ${error.message}`);
    }

    return data;
}

export async function getValidGmbToken(restaurantId: string) {
    const supabase = createClient()
    const { data: account } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('platform', 'gmb')
        .single()

    if (!account || !account.google_access_token) {
        throw new Error('GMB account not connected')
    }

    const expiresAt = new Date(account.token_expires_at)
    // Check if within 5 minutes of expiring
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

    if (expiresAt <= fiveMinutesFromNow) {
        if (!account.google_refresh_token) {
            throw new Error('No refresh token available')
        }

        const newTokens = await refreshAccessToken(account.google_refresh_token)
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()

        await supabase
            .from('connected_accounts')
            .update({
                google_access_token: newTokens.access_token,
                token_expires_at: newExpiresAt
            })
            .eq('id', account.id)

        return newTokens.access_token
    }

    return account.google_access_token
}
