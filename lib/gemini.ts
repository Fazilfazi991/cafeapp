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

// ─── PHOTO ANALYSIS (Vision extraction) ───────────────────────────────────────
export async function analyzeFoodPhoto(
  imageUrl: string
): Promise<{
  dishName: string;
  description: string;
  ingredients: string[];
  cuisine: string;
}> {
  try {
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);
    const imageBuffer = await imageRes.arrayBuffer();
    const mimeType = (imageRes.headers.get('content-type') || 'image/jpeg') as any;
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Image } },
      {
        text: `Analyze this food photo and return ONLY a JSON object with no markdown:
{
  "dishName": "exact name of the dish",
  "description": "appetizing 2 sentence description of how it looks and tastes",
  "ingredients": ["main", "visible", "ingredients"],
  "cuisine": "type of cuisine"
}`,
      },
    ]);

    const text = result.response.text();
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (error: any) {
    console.error('Gemini Vision Analysis Error:', error);
    // Fallback if vision fails
    return {
      dishName: 'Delicious Dish',
      description: 'A mouthwatering culinary creation prepared to perfection.',
      ingredients: ['fresh ingredients'],
      cuisine: 'International',
    };
  }
}


// ─── FULL POSTER GENERATION WITH GEMINI ─────────────────────────────────────

export async function generatePosterWithGemini(
  params: {
    photoUrl: string
    logoUrl?: string
    businessName: string
    businessType: string
    customText: string
    dishName: string
    dishDescription: string
    phone: string
    website: string
    primaryColor: string
    tone: string
    style: 'minimal' | 'bold' | 'lifestyle'
    restaurantId: string
  }
): Promise<string> {
  // No longer fetching photoUrl or logoUrl since the flash-image model generates posters from scratch based on text prompts.

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image-preview',
    generationConfig: {
      responseModalities: ['IMAGE']
    } as any
  })

  const basePrompt = `Restaurant: ${params.businessName}
Dish: ${params.dishName}
Description: ${params.dishDescription}

Design requirements:
- Dark moody background with dramatic warm lighting on the food
- The dish should be the hero, centered and beautifully lit
- Display the dish name in large, elegant, legible font at the bottom
- Display the restaurant name in smaller text below the dish name
- Rich warm color palette: deep browns, golds, ambers
- Style: premium Dubai restaurant advertisement
- Photorealistic, high quality
- NO prices, NO fake logos, NO extra text
- Square 1:1 aspect ratio, Instagram ready`

  // Keeping 3 styles so the frontend still gets 3 options, but with subtle variations of the main design
  const stylePrompts = {
    minimal: basePrompt,
    bold: basePrompt + `\n- Give the backdrop a very subtle, moody ${params.primaryColor} colored lighting accent.`,
    lifestyle: basePrompt + `\n- Add a subtle elegant lifestyle element in the dark blurred background, like a candlestick or wine glass.`
  }

  const parts: any[] = [
    { text: stylePrompts[params.style] }
  ]

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: parts
    }]
  })

  const responseParts = result.response.candidates?.[0]?.content?.parts

  if (!responseParts || responseParts.length === 0) {
    throw new Error('No response parts from Gemini')
  }

  console.log('Response parts count:', responseParts.length)
  console.log('Part types:', responseParts.map((p: any) => p.text ? 'text' : p.inlineData ? 'image' : 'unknown'))

  const imagePart = responseParts.find((p: any) => p.inlineData?.data && p.inlineData?.mimeType?.startsWith('image/'))

  if (!imagePart?.inlineData?.data) {
    console.error('Parts received:', JSON.stringify(responseParts.map((p: any) => ({
      hasText: !!p.text,
      hasImage: !!p.inlineData,
      mimeType: p.inlineData?.mimeType
    }))))
    throw new Error('Gemini did not return an image. Check console for response details.')
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')

  // Instead of uploading to Supabase where we are hitting RLS errors without a service role key,
  // we will return the image as a base64 Data URL so the frontend can display and use it directly.
  const imageBase64 = imagePart.inlineData.data;
  return `data:image/png;base64,${imageBase64}`
}

export async function generateAllPosters(
  params: Omit<Parameters<typeof generatePosterWithGemini>[0], 'style'>
): Promise<{
  minimal: string
  bold: string
  lifestyle: string
}> {
  // Generate sequentially to avoid rate limits on the image model
  const minimal = await generatePosterWithGemini({ ...params, style: 'minimal' })
  const bold = await generatePosterWithGemini({ ...params, style: 'bold' })
  const lifestyle = await generatePosterWithGemini({ ...params, style: 'lifestyle' })

  return { minimal, bold, lifestyle }
}
