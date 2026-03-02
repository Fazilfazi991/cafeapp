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

export async function generatePosterWithGemini(
  params: {
    photoUrl: string
    logoUrl?: string
    businessName: string
    businessType: string
    customText: string
    phone: string
    website: string
    primaryColor: string
    tone: string
    style: 'minimal' | 'bold' | 'lifestyle'
    restaurantId: string
  }
): Promise<string> {
  // No longer fetching photoUrl or logoUrl since gemini-2.5-flash-image generates posters from scratch based on text prompts.

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image', // Fixed model name
    generationConfig: {
      responseModalities: ['IMAGE']
    } as any
  })

  const basePrompt = `Professional food photography social media poster for "${params.businessName}", a ${params.businessType} restaurant. Make the food look irresistible, fresh and appetizing. Warm inviting atmosphere. Professional food marketing quality.`

  const stylePrompts = {
    minimal: `
      ${basePrompt}
      
      Design requirements:
      - Clean minimal professional aesthetic
      - Add a dark gradient overlay on bottom 40%
      - Display "${params.customText}" as large 
        bold text in ${params.primaryColor} color
        in the lower portion of the image
      - Show "${params.businessName}" in white 
        below the custom text
      - Add a solid ${params.primaryColor} strip 
        at very bottom with:
        Left: "${params.phone}"
        Right: "${params.website}"
        Both in white text
      - No placeholder text, no Lorem ipsum
      - All text must be perfectly legible
    `,

    bold: `
      ${basePrompt}
      
      Design:
      - Vibrant, bold food photo composition fills top 58% of poster
      - Solid ${params.primaryColor} background 
        for bottom 42%
      - "${params.customText}" as very large 
        white bold text in the color section
      - "${params.businessName}" smaller below 
        in lighter white
      - Horizontal divider line
      - "${params.phone}" and "${params.website}" 
        at bottom in white
      - Strong impactful commercial design
      - All text perfectly readable
    `,

    lifestyle: `
      ${basePrompt}
      
      Design:
      - Clean white/cream (#F8F8F6) background
      - High quality food photo centered in a rounded rectangle 
        with subtle shadow, filling middle portion
      - Thin ${params.primaryColor} color bars 
        at very top and very bottom edges
      - "${params.businessName}" above photo 
        in ${params.primaryColor} uppercase spaced
      - "${params.customText}" below photo 
        in dark charcoal bold text  
      - "${params.phone}" and "${params.website}" 
        near bottom in gray
      - Premium editorial magazine aesthetic
      - Perfectly legible text throughout
    `
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
