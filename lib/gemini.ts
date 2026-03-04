import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase-server';
import sharp from 'sharp';

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
    address: string
    primaryColor: string
    tone: string
    style: 'minimal' | 'bold' | 'lifestyle'
    restaurantId: string
  }
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image-preview',
    generationConfig: {
      responseModalities: ['IMAGE']
    } as any
  })

  // The base instructions common to all styles - omitting the footer text
  const basePrompt = `Restaurant: ${params.businessName}
Dish: ${params.dishName}
Description: ${params.dishDescription}

Design requirements:
- The dish should be the hero, centered and beautifully lit
- Display the dish name in large, elegant, legible font in the lower-middle area
- Do NOT add the restaurant name as text on the poster
- Do NOT add any contact info, phone numbers, or addresses - NO extra text
- Add a small circular logo placeholder in the top-right corner
- Photorealistic, high quality
- NO prices, NO fake logos (except the placeholder)
- Square 1:1 aspect ratio, Instagram ready`

  const stylePrompts = {
    minimal: basePrompt + `
- Style: Dark moody background, dramatic candlelight, deep browns and golds, premium fine dining aesthetic`,

    bold: basePrompt + `
- Style: Deep royal blue or emerald green background, bold and energetic, vivid colors, modern street food meets premium style, Instagram-worthy pop aesthetic popular in UAE food scene`,

    lifestyle: basePrompt + `
- Style: Clean white marble background, bright natural daylight, fresh and appetizing, minimalist modern style, light pastel accents, health-conscious cafe aesthetic`
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

  const imagePart = responseParts.find((p: any) => p.inlineData?.data && p.inlineData?.mimeType?.startsWith('image/'))

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini did not return an image. Check console for response details.')
  }

  const imageBase64 = imagePart.inlineData.data;
  let finalImageBuffer = Buffer.from(imageBase64, 'base64');

  try {
    const composites: sharp.OverlayOptions[] = [];

    // --- 1. Footer Bar & Text Overlay ---
    // Create an SVG with the dark bar and the white text
    const footerHeight = 70;
    const footerSvg = Buffer.from(`
      <svg width="1080" height="1080">
        <rect x="0" y="${1080 - footerHeight}" width="1080" height="${footerHeight}" fill="#1c1917" />
        <text flex="1" x="40" y="${1080 - footerHeight + 42}" font-family="Arial, sans-serif" font-size="24" fill="white" font-weight="600">Contact number: ${params.phone}</text>
        <text flex="1" x="1040" y="${1080 - footerHeight + 42}" text-anchor="end" font-family="Arial, sans-serif" font-size="24" fill="white" font-weight="600">Address: ${params.address}</text>
      </svg>
    `);

    composites.push({
      input: footerSvg,
      top: 0,
      left: 0
    });

    // --- 2. Logo Overlay ---
    if (params.logoUrl) {
      console.log('Fetching logo from:', params.logoUrl);
      const logoRes = await fetch(params.logoUrl);
      if (logoRes.ok) {
        const logoBuffer = await logoRes.arrayBuffer();

        // Target size for the logo (reduced to 55px per user request)
        const logoSize = 55;
        const padding = 15;

        // Create an SVG mask for circular crop
        const circleSvg = Buffer.from(
          `<svg width="${logoSize}" height="${logoSize}">
            <circle cx="${logoSize / 2}" cy="${logoSize / 2}" r="${logoSize / 2}" fill="white"/>
          </svg>`
        );

        // Crop the logo image to a circle
        const resizedLogo = await sharp(Buffer.from(logoBuffer))
          .resize(logoSize, logoSize, { fit: 'cover' })
          .composite([{ input: circleSvg, blend: 'dest-in' }])
          .png()
          .toBuffer();

        // White border background circle
        const borderSize = logoSize + 4;
        const borderSvg = Buffer.from(
          `<svg width="${borderSize}" height="${borderSize}">
            <circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2}" fill="white"/>
          </svg>`
        );

        // Composite the logo onto the white border
        const logoWithBorder = await sharp(borderSvg)
          .composite([{ input: resizedLogo, gravity: 'center' }])
          .png()
          .toBuffer();

        // Add to main image composite instructions (top-right with 15px padding)
        composites.push({
          input: logoWithBorder,
          gravity: 'northeast',
          top: padding,
          left: 1080 - borderSize - padding
        });
      }
    }

    // --- 3. Apply all overlays ---
    finalImageBuffer = (await sharp(finalImageBuffer)
      .composite(composites)
      .jpeg({ quality: 90 })
      .toBuffer()) as any;

    return `data:image/jpeg;base64,${finalImageBuffer.toString('base64')}`;

  } catch (err) {
    console.error('Failed to composite image:', err);
    // If compositing fails, return the original Gemini image
    return `data:image/png;base64,${imageBase64}`;
  }
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
