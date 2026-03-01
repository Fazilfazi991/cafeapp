import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase-server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── VIDEO ANALYSIS (existing) ──────────────────────────────────────────────
export async function analyzeVideoWithGemini(
    videoUrl: string,
    restaurantName: string,
    cuisineType: string
): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const mockPrompt = `Analyze this imaginary restaurant video of ${restaurantName} (${cuisineType}). Describe what food or scene is shown. Write a brief content brief for a social media caption. Include: main subject, mood, key details a customer would care about.`;
        const result = await model.generateContent(mockPrompt);
        const response = await result.response;
        return response.text() || 'A beautiful video showcasing our latest dishes and vibrant atmosphere.';
    } catch (error: any) {
        console.error('Gemini Error:', error);
        throw new Error(`Failed to analyze video with Gemini: ${error.message}`);
    }
}

// ─── PHOTO ENHANCEMENT (kept as utility) ────────────────────────────────────
export async function enhanceFoodPhoto(imageUrl: string): Promise<string> {
    try {
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);
        const imageBuffer = await imageRes.arrayBuffer();
        const mimeType = (imageRes.headers.get('content-type') || 'image/jpeg') as any;
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
        });

        const result = await model.generateContent([
            { inlineData: { mimeType, data: base64Image } },
            { text: `Enhance this food photo professionally. Better lighting, richer colors, sharper details. Keep same composition. Return only the enhanced image.` },
        ]);

        const parts = result.response.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
        if (!imagePart?.inlineData) return imageUrl;

        const supabase = createClient();
        const enhancedBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const filename = `enhanced/${Date.now()}-food.jpg`;
        const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filename, enhancedBuffer, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) return imageUrl;
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(filename);
        return urlData.publicUrl;
    } catch (err: any) {
        console.error('[GEMINI_ENHANCE_ERROR]', err?.message || err);
        return imageUrl;
    }
}

// ─── FULL POSTER GENERATION WITH GEMINI ─────────────────────────────────────

export interface PosterGenParams {
    photoUrl: string;
    logoUrl?: string;
    businessName: string;
    businessType: string;
    customText: string;
    phone: string;
    website: string;
    primaryColor: string;
    secondaryColor: string;
    tone: string;
    style: 'minimal' | 'bold' | 'lifestyle';
    restaurantId: string;
}

function buildPosterPrompt(params: PosterGenParams): string {
    const { style, customText, businessName, primaryColor, phone, website } = params;

    if (style === 'minimal') {
        return `Create a professional social media marketing poster (1080x1080px).

Use the provided food photo as the main background image, filling the entire canvas.

Design specifications:
- Dark gradient overlay on bottom 45% of the image for text readability
- If a logo image is provided (second image), place it in top-right corner inside a white rounded square (80x80px) with subtle shadow
- Large bold text "${customText}" in ${primaryColor} color, positioned in the bottom-left area above the business name
- Business name "${businessName}" in white below the custom text, slightly smaller font
- A thin ${primaryColor} accent line (4px height, 60px wide) above the custom text
- Solid ${primaryColor} strip at very bottom (50px height): phone "${phone}" on the left side, website "${website}" on the right side, both in white text
- Clean, minimal, professional food marketing aesthetic
- Do NOT show any hex color codes, style labels, or watermarks as visible text
- All text must be perfectly legible and spelled exactly as provided
- Output exactly 1080x1080 pixels`;
    }

    if (style === 'bold') {
        return `Create a bold, impactful social media marketing poster (1080x1080px).

Use the provided food photo for the top 58% of the poster.

Design specifications:
- Food photo fills the top 58% of the poster
- Gradient transition from photo into a solid ${primaryColor} background block for the bottom 42%
- If a logo image is provided (second image), place it in top-left corner inside a white rounded square with subtle shadow
- Large white bold text "${customText}" inside the ${primaryColor} color block, large and prominent
- Business name "${businessName}" in semi-transparent white below the custom text, uppercase with letter spacing
- A small divider line in semi-transparent white below the business name
- Phone "${phone}" and website "${website}" at the bottom of the color block in lighter white
- Strong, impactful, modern food marketing design
- Do NOT show any hex color codes, style labels, or watermarks as visible text
- All text must be perfectly legible and spelled exactly as provided
- Output exactly 1080x1080 pixels`;
    }

    // lifestyle
    return `Create an elegant lifestyle social media marketing poster (1080x1080px).

Design specifications:
- White/cream (#F8F8F6) clean background
- Thin ${primaryColor} accent bar across the very top edge (10px) and very bottom edge (10px)
- Business name "${businessName}" centered above the photo in ${primaryColor}, uppercase with wide letter spacing
- The provided food photo placed in a centered rounded rectangle (about 900x650px) with subtle shadow, taking the middle portion of the poster
- If a logo image is provided (second image), place it small in the top-right corner with a thin border
- Custom text "${customText}" centered below the photo in dark (#1A1A1A) bold text
- Phone "${phone}" and website "${website}" in gray below the custom text
- Premium editorial magazine-style aesthetic, clean and sophisticated
- Do NOT show any hex color codes, style labels, or watermarks as visible text
- All text must be perfectly legible and spelled exactly as provided
- Output exactly 1080x1080 pixels`;
}

export async function generateFullPoster(params: PosterGenParams): Promise<string> {
    // 1. Fetch food photo as base64
    const photoResp = await fetch(params.photoUrl);
    if (!photoResp.ok) throw new Error(`Failed to fetch photo: ${photoResp.status}`);
    const photoBuffer = await photoResp.arrayBuffer();
    const photoBase64 = Buffer.from(photoBuffer).toString('base64');
    const photoMime = photoResp.headers.get('content-type') || 'image/jpeg';

    // 2. Fetch logo as base64 if exists
    let logoBase64: string | null = null;
    let logoMime = 'image/png';
    if (params.logoUrl) {
        try {
            const logoResp = await fetch(params.logoUrl);
            if (logoResp.ok) {
                const logoBuffer = await logoResp.arrayBuffer();
                logoBase64 = Buffer.from(logoBuffer).toString('base64');
                logoMime = logoResp.headers.get('content-type') || 'image/png';
            }
        } catch {
            console.warn('[GEMINI_POSTER] Failed to fetch logo, proceeding without');
        }
    }

    // 3. Build the prompt
    const posterPrompt = buildPosterPrompt(params);

    // 4. Build content array with images + prompt
    const contents: any[] = [
        { inlineData: { mimeType: photoMime, data: photoBase64 } },
    ];

    if (logoBase64) {
        contents.push({ inlineData: { mimeType: logoMime, data: logoBase64 } });
    }

    contents.push({ text: posterPrompt });

    // 5. Call Gemini image generation
    // Try multiple model names in case one isn't available
    const modelNames = [
        'gemini-2.0-flash-preview-image-generation',
        'gemini-2.0-flash-exp',
    ];

    let lastError: Error | null = null;

    for (const modelName of modelNames) {
        try {
            console.log(`[GEMINI_POSTER] Trying model: ${modelName} for style: ${params.style}`);

            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseModalities: ['IMAGE', 'TEXT'],
                } as any,
            });

            const result = await model.generateContent(contents);
            const parts = result.response.candidates?.[0]?.content?.parts || [];

            // 6. Extract image from response
            const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

            if (!imagePart?.inlineData?.data) {
                console.warn(`[GEMINI_POSTER] No image returned from ${modelName}`);
                continue; // try next model
            }

            console.log(`[GEMINI_POSTER] Got image from ${modelName} for style: ${params.style}`);

            // 7. Upload to Supabase
            const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
            const supabase = createClient();
            const filename = `posters/${params.restaurantId}/${Date.now()}-${params.style}.png`;

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filename, buffer, { contentType: 'image/png', upsert: true });

            if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            const { data: urlData } = supabase.storage.from('media').getPublicUrl(filename);
            return urlData.publicUrl;

        } catch (err: any) {
            console.error(`[GEMINI_POSTER] Model ${modelName} failed:`, err?.message);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error('All Gemini models failed to generate poster');
}

// ─── GENERATE ALL THREE STYLES IN PARALLEL ──────────────────────────────────

export async function generateAllThreeStyles(
    params: Omit<PosterGenParams, 'style'>
): Promise<{ minimal: string; bold: string; lifestyle: string }> {
    const [minimal, bold, lifestyle] = await Promise.all([
        generateFullPoster({ ...params, style: 'minimal' }),
        generateFullPoster({ ...params, style: 'bold' }),
        generateFullPoster({ ...params, style: 'lifestyle' }),
    ]);

    return { minimal, bold, lifestyle };
}
