// Note: In a real production app, the Buffer integration requires OAuth 2.0 flow.
// The user would authorize PostChef, we'd save their token in connected_accounts, 
// and then use that token to schedule posts.

// For MVP purposes, since setting up OAuth loops requires a public domain and active Buffer Developer app,
// we will mock the Buffer scheduling logic here to demonstrate the architecture,
// but it will seamlessly swap to actual API calls once OAuth is configured.

export async function schedulePostToBuffer(
  accessToken: string,
  profileIds: string[],
  text: string,
  mediaUrls: string[],
  scheduledAt: Date
) {
  try {
    // This is the actual shape of the Buffer Create Post API
    const body = {
      profile_ids: profileIds,
      text: text,
      media: {
        ...(mediaUrls.length > 0 && { photo: mediaUrls[0] }) // buffer uses specific fields depending on media type
      },
      scheduled_at: scheduledAt.toISOString(),
    };

    // The real API call:
    const response = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`
      },
      // @ts-ignore
      body: new URLSearchParams(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      throw new Error(`Buffer API Error: ${errData?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('[BUFFER SUCCESS] Scheduled post:', data);
    return data.updates.map((u: any) => u.id);

  } catch (error: any) {
    console.error('Buffer Error:', error);
    throw new Error(`Failed to schedule post: ${error.message}`);
  }
}
