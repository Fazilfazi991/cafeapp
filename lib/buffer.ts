// Note: In a real production app, the Buffer integration requires OAuth 2.0 flow.
// The user would authorize PostChef, we'd save their token in connected_accounts, 
// and then use that token to schedule posts.

// For MVP purposes, since setting up OAuth loops requires a public domain and active Buffer Developer app,
// we will mock the Buffer scheduling logic here to demonstrate the architecture,
// but it will seamlessly swap to actual API calls once OAuth is configured.

export async function getBufferProfiles(accessToken: string) {
  const response = await fetch('https://api.bufferapp.com/1/profiles.json', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errText = await response.text()
    console.error("BUFFER PROFILE FETCH RAW ERROR:", errText, "STATUS:", response.status)
    throw new Error(`Buffer API Error fetching profiles: ${errText || response.statusText}`);
  }

  const data = await response.json();
  return data; // Array of profile objects
}

export async function schedulePostToBuffer(
  accessToken: string,
  profileIds: string[],
  text: string,
  mediaUrls: string[],
  scheduledAt: Date
) {
  try {
    const params = new URLSearchParams();
    profileIds.forEach(id => params.append('profile_ids[]', id));
    params.append('text', text);

    if (mediaUrls.length > 0) {
      params.append('media[photo]', mediaUrls[0]);
    }

    params.append('scheduled_at', scheduledAt.toISOString());

    // The real API call:
    const response = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`
      },
      body: params
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      throw new Error(`Buffer API Error scheduling: ${errData?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('[BUFFER SUCCESS] Scheduled post:', data);
    return data.updates.map((u: any) => u.id);

  } catch (error: any) {
    console.error('Buffer Error:', error);
    throw new Error(`Failed to schedule post: ${error.message}`);
  }
}
