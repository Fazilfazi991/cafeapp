/**
 * WhatsApp Business API Integration
 */

/**
 * Exchange the code retrieved from Meta Embedded Signup for a long-lived access token
 */
export async function exchangeWhatsappCodeForToken(code: string) {
    const META_CLIENT_ID = process.env.NEXT_PUBLIC_META_APP_ID!;
    const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET!;

    const params = new URLSearchParams({
        client_id: META_CLIENT_ID,
        client_secret: META_CLIENT_SECRET,
        code: code,
    });

    const response = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to exchange WhatsApp code for token: ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Fetches the specific WhatsApp Business accounts and phone numbers attached to a given Whatsapp Access Token
 */
export async function getWhatsappPhoneNumbers(wabaId: string, accessToken: string) {
    // 1. Fetch the phone numbers attached to this WhatsApp Business Account
    const res = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${accessToken}`);

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to fetch WhatsApp Phone Numbers: ${error}`);
    }

    const data = await res.json();
    return data.data || [];
}

/**
 * Creates the required Message Template ("daily_special") in the WhatsApp Business Account.
 * Note: Message templates must be approved by Meta before they can be sent outside the 24-hour service window.
 */
export async function createDailySpecialTemplate(wabaId: string, accessToken: string) {
    const templatePayload = {
        name: "daily_special",
        category: "MARKETING",
        language: "en",
        components: [
            {
                type: "HEADER",
                format: "IMAGE"
            },
            {
                type: "BODY",
                text: "🍽️ Today's Special at {{1}}!\n\n{{2}} - {{3}}\n\n📍 {{4}} | 📞 {{5}}\n\nReply STOP to unsubscribe",
                example: {
                    body_text: [
                        [
                            "Luigi's Italian",
                            "Classic Margherita Pizza",
                            "Fresh mozzarella over our signature crushed tomato sauce with torn basil.",
                            "123 Main St",
                            "+1-555-0199"
                        ]
                    ]
                }
            }
        ]
    };

    const response = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(templatePayload)
    });

    if (!response.ok) {
        const err = await response.text();
        // If it fails because the template already exists, that's fine. We can ignore that specific error.
        if (err.includes("already exists")) {
            console.log("[WhatsApp] Template 'daily_special' already exists.");
            return true;
        }
        throw new Error(`Failed to create WhatsApp template 'daily_special': ${err}`);
    }

    return await response.json();
}

/**
 * Checks the status of a specific message template to see if it's APPROVED, PENDING, or REJECTED
 */
export async function getTemplateStatus(wabaId: string, templateName: string, accessToken: string) {
    const res = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates?name=${templateName}&access_token=${accessToken}`);

    if (!res.ok) {
        throw new Error("Failed to fetch template status");
    }

    const data = await res.json();
    if (data.data && data.data.length > 0) {
        return data.data[0].status; // e.g. "APPROVED", "PENDING", "REJECTED"
    }
    return null;
}

/**
 * Uploads an image URL to WhatsApp Media Hosting and returns a Media ID.
 * The media ID is required to attach images to template messages.
 */
export async function uploadMediaToWhatsApp(phoneNumberId: string, accessToken: string, imageUrl: string): Promise<string> {
    // First, download the image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image for WhatsApp upload: ${imageUrl}`);
    const imgBuffer = await imgRes.arrayBuffer();

    // Detect content type
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    // Upload as a form-data multipart request to the WhatsApp media endpoint
    const formData = new FormData();
    const blob = new Blob([imgBuffer], { type: contentType });
    formData.append('file', blob, 'poster.jpg');
    formData.append('type', contentType);
    formData.append('messaging_product', 'whatsapp');

    const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/media`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: formData
    });

    if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Failed to upload media to WhatsApp: ${errText}`);
    }

    const uploadData = await uploadRes.json();
    return uploadData.id;
}

/**
 * Sends a single WhatsApp template message (daily_special) to one recipient.
 */
export async function sendWhatsAppTemplateMessage(
    phoneNumberId: string,
    accessToken: string,
    recipientPhone: string,
    mediaId: string,
    restaurantName: string,
    customMessage: string,
    dishName: string = '',
    address: string = '',
    phone: string = ''
) {
    const body = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: {
            name: "daily_special",
            language: { code: "en" },
            components: [
                {
                    type: "header",
                    parameters: [{ type: "image", image: { id: mediaId } }]
                },
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: restaurantName },
                        { type: "text", text: dishName || customMessage },
                        { type: "text", text: customMessage },
                        { type: "text", text: address || "Visit us" },
                        { type: "text", text: phone || "" }
                    ]
                }
            ]
        }
    };

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`WhatsApp send failed for ${recipientPhone}: ${errText}`);
    }

    return await res.json();
}

/**
 * Broadcasts a WhatsApp template message to a list of contacts.
 * Respects the 1,000 message/day limit - will broadcast up to the limit and stop.
 * Returns { sent, failed, skipped }
 */
export async function broadcastWhatsappMessage(
    phoneNumberId: string,
    accessToken: string,
    contacts: Array<{ phone_number: string }>,
    mediaId: string,
    restaurantName: string,
    customMessage: string,
    alreadySentToday: number = 0,
    restaurantPhone: string = '',
    restaurantAddress: string = ''
) {
    const DAILY_LIMIT = 1000;
    const remaining = DAILY_LIMIT - alreadySentToday;

    if (remaining <= 0) {
        console.log('[WHATSAPP_BROADCAST] Daily limit reached, skipping broadcast.');
        return { sent: 0, failed: 0, skipped: contacts.length };
    }

    const eligible = contacts.slice(0, remaining);
    const BATCH_SIZE = 50;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
        const batch = eligible.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(batch.map(contact =>
            sendWhatsAppTemplateMessage(
                phoneNumberId,
                accessToken,
                contact.phone_number,
                mediaId,
                restaurantName,
                customMessage,
                '',
                restaurantAddress,
                restaurantPhone
            )
        ));

        for (const result of results) {
            if (result.status === 'fulfilled') sent++;
            else {
                failed++;
                console.error('[WHATSAPP_BROADCAST_FAIL]', result.reason?.message);
            }
        }

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < eligible.length) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    return { sent, failed, skipped: contacts.length - eligible.length };
}

