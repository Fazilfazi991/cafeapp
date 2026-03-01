import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase-server';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeVideoWithGemini(
    videoUrl: string,
    restaurantName: string,
    cuisineType: string
): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Note for MVP:
        // Gemini 1.5 Pro handles video natively, but requires uploading the video file
        // via the File API first (for files over 20MB) or sending base64 inline.
        // Since we only have a public URL from Supabase, a true production flow
        // would either fetch the video buffer and pass it inline, or upload it to Gemini.

        // As a temporary mock for the MVP to avoid buffer overflow errors from big videos:
        const mockPrompt = `Analyze this imaginary restaurant video of ${restaurantName} (${cuisineType}). Describe what food or scene is shown. Write a brief content brief for a social media caption. Include: main subject, mood, key details a customer would care about.`;

        const result = await model.generateContent(mockPrompt);
        const response = await result.response;
        const text = response.text();

        return text || 'A beautiful video showcasing our latest dishes and vibrant atmosphere.';

    } catch (error: any) {
        console.error('Gemini Error:', error);
        throw new Error(`Failed to analyze video with Gemini: ${error.message}`);
    }
}

export async function enhanceFoodPhoto(imageUrl: string): Promise<string> {
    try {
        // 1. Fetch the source image and convert to base64
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);
        const imageBuffer = await imageRes.arrayBuffer();
        const mimeType = (imageRes.headers.get('content-type') || 'image/jpeg') as any;
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        // 2. Send to Gemini Flash with image response modality
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
            } as any,
        });

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType,
                    data: base64Image,
                },
            },
            {
                text: `Enhance this food photo professionally. Make the food look more appetizing with:
- Better lighting and brightness
- Richer, more vibrant colors
- Sharper details and textures
- Professional food photography aesthetic
Keep the same composition and framing. Return only the enhanced image.`,
            },
        ]);

        const parts = result.response.candidates?.[0]?.content?.parts || [];

        // 3. Find the image part in the response
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
        if (!imagePart?.inlineData) {
            console.warn('[GEMINI_ENHANCE] No image in response, returning original');
            return imageUrl;
        }

        // 4. Upload enhanced image to Supabase Storage
        const { createClient } = await import('@/lib/supabase-server');
        const enhancedBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const supabase = createClient();
        const filename = `enhanced/${Date.now()}-food.jpg`;

        const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filename, enhancedBuffer, {
                contentType: 'image/jpeg',
                upsert: true,
            });

        if (uploadError) {
            console.warn('[GEMINI_ENHANCE] Upload failed, returning original:', uploadError.message);
            return imageUrl;
        }

        const { data: urlData } = supabase.storage.from('media').getPublicUrl(filename);
        return urlData.publicUrl;

    } catch (err: any) {
        console.error('[GEMINI_ENHANCE_ERROR]', err?.message || err);
        return imageUrl; // graceful fallback — never break the poster flow
    }
}
