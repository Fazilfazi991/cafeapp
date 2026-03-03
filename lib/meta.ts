import { createClient } from '@/lib/supabase-server';

/**
 * Generate the OAuth URL to redirect the user to Meta
 */
export function getAuthUrl(restaurantId: string): string {
    const META_CLIENT_ID = process.env.META_CLIENT_ID!;
    const META_REDIRECT_URI = process.env.META_REDIRECT_URI!;

    const scopes = [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_content_publish'
    ].join(',');

    const params = new URLSearchParams({
        client_id: META_CLIENT_ID,
        redirect_uri: META_REDIRECT_URI,
        state: restaurantId,
        response_type: 'code',
        scope: scopes,
    });

    const url = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;

    // Explicitly requested by user: Console log the URL so they can verify the exact redirect_uri matches
    console.log('[META API] Generated OAuth URL:', url);
    console.log('[META API] Expected Redirect URI:', META_REDIRECT_URI);

    return url;
}

/**
 * Exchange the short-lived OAuth code for a long-lived User Access Token
 */
export async function exchangeCodeForTokens(code: string) {
    const META_CLIENT_ID = process.env.META_CLIENT_ID!;
    const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET!;
    const META_REDIRECT_URI = process.env.META_REDIRECT_URI!;

    const params = new URLSearchParams({
        client_id: META_CLIENT_ID,
        client_redirect_uri: META_REDIRECT_URI,
        redirect_uri: META_REDIRECT_URI,
        client_secret: META_CLIENT_SECRET,
        code: code,
    });

    // 1. Get short-lived token
    const shortLivedResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`);

    if (!shortLivedResponse.ok) {
        const error = await shortLivedResponse.text();
        throw new Error(`Failed to exchange code for short-lived token: ${error}`);
    }

    const shortLivedData = await shortLivedResponse.json();

    // 2. Exchange for long-lived User Token
    const longParams = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: META_CLIENT_ID,
        client_secret: META_CLIENT_SECRET,
        fb_exchange_token: shortLivedData.access_token,
    });

    const longLivedResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${longParams.toString()}`);

    if (!longLivedResponse.ok) {
        const error = await longLivedResponse.text();
        throw new Error(`Failed to exchange short-lived token for long-lived token: ${error}`);
    }

    const longLivedData = await longLivedResponse.json();
    return longLivedData.access_token;
}

/**
 * Fetch the connected User's Facebook Pages and attached Instagram Accounts
 */
export async function getMetaAccounts(userAccessToken: string) {
    // Get the Pages
    const pagesResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
    if (!pagesResponse.ok) throw new Error('Failed to fetch Facebook Pages');

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];

    // For each page, try to get the connected Instagram Business Account
    const enrichedPages = await Promise.all(pages.map(async (page: any) => {
        try {
            const igResponse = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
            const igData = igResponse.json();
            return {
                ...page,
                meta_ig_id: (await igData).instagram_business_account?.id || null,
            };
        } catch (e) {
            return { ...page, meta_ig_id: null };
        }
    }));

    return enrichedPages;
}


/**
 * Publish a photo to a Facebook Page
 */
export async function publishToFacebook(pageId: string, pageAccessToken: string, message: string, imageUrl: string) {
    const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: imageUrl,
            message: message,
            access_token: pageAccessToken
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Facebook Publish Error: ${error}`);
    }

    return await response.json(); // returns { id: "post_id", post_id: "pageid_postid" }
}

/**
 * Publish a photo to Instagram
 * Requires a 2-step process: 1) Create Media Container 2) Publish Container
 */
export async function publishToInstagram(igUserId: string, userAccessToken: string, caption: string, imageUrl: string) {
    // 1. Create Media Container
    const containerResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image_url: imageUrl,
            caption: caption,
            access_token: userAccessToken
        }),
    });

    if (!containerResponse.ok) {
        const error = await containerResponse.text();
        throw new Error(`Instagram Media Container Creation Error: ${error}`);
    }

    const { id: creationId } = await containerResponse.json();

    // 2. Publish Media
    const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            creation_id: creationId,
            access_token: userAccessToken
        }),
    });

    if (!publishResponse.ok) {
        const error = await publishResponse.text();
        throw new Error(`Instagram Publish Error: ${error}`);
    }

    return await publishResponse.json(); // returns { id: "ig_media_id" }
}
