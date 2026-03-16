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

  // 1. Prepare base prompt and style variations
  const stylePrompts = {
    // Variation 1
    minimal: `Using this exact food photo as reference, restyle ONLY the background and lighting. Keep the dish exactly as it appears in the photo. Apply Dark moody background, dramatic candlelight, deep browns and golds, premium fine dining aesthetic style to the background and lighting only.
- Do NOT add the restaurant name as text on the poster. Do NOT add any contact info, phone numbers, or addresses - NO extra text.
- Square 1:1 aspect ratio, Instagram ready`,

    // Variation 2
    lifestyle: `Using this exact food photo as reference, restyle ONLY the background and lighting. Keep the dish exactly as it appears in the photo. Apply Clean white marble background, bright natural daylight, fresh and appetizing, minimalist modern style, light pastel accents, health-conscious cafe aesthetic style to the background and lighting only.
- Do NOT add the restaurant name as text on the poster. Do NOT add any contact info, phone numbers, or addresses - NO extra text.
- Square 1:1 aspect ratio, Instagram ready`,

    // Variation 3 (No reference photo needed)
    bold: `Restaurant: ${params.businessName}
Dish: ${params.dishName}
Description: ${params.dishDescription}
- Generate an appetizing food poster for this dish.
- Style: Deep royal blue or emerald green background, bold and energetic, vivid colors, modern street food meets premium style, Instagram-worthy pop aesthetic popular in UAE food scene.
- The dish should be the hero, centered and beautifully lit.
- Display the dish name in large, elegant, legible font in the lower-middle area.
- Do NOT add the restaurant name as text on the poster. Do NOT add any contact info, phone numbers, or addresses - NO extra text.
- Square 1:1 aspect ratio, Instagram ready`
  }

  // 2. Fetch the reference image if needed for Variation 1 or 2
  const parts: any[] = [];

  if (params.style === 'minimal' || params.style === 'lifestyle') {
    try {
      const refImageRes = await fetch(params.photoUrl);
      if (!refImageRes.ok) throw new Error('Failed to fetch reference photo');
      const refBuffer = await refImageRes.arrayBuffer();
      const mimeType = refImageRes.headers.get('content-type') || 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType,
          data: Buffer.from(refBuffer).toString('base64')
        }
      });
    } catch (err) {
      console.warn('Could not load reference image, falling back to text generation:', err);
    }
  }

  // Add the text prompt for the chosen style
  parts.push({ text: stylePrompts[params.style] });

  // 3. Generate Image
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

  const imagePart = responseParts.find((p: any) => p.inlineData?.data && p.inlineData?.mimeType?.startsWith('image/'))

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini did not return an image. Check console for response details.')
  }

  const imageBase64 = imagePart.inlineData.data;
  let finalImageBuffer = Buffer.from(imageBase64, 'base64');
  try {
    // Force the base image to exactly 1080x1080 so our 1080x1080 SVGs don't throw out-of-bounds errors.
    finalImageBuffer = (await sharp(finalImageBuffer)
      .resize(1080, 1080, { fit: 'cover' })
      .toBuffer()) as any;

    return await applyPosterOverlays(finalImageBuffer, {
      phone: params.phone,
      address: params.address,
      logoUrl: params.logoUrl
    });
  } catch (err) {
    console.error('Failed to process image:', err);
    return `data:image/png;base64,${imageBase64}`;
  }
}

export async function applyPosterOverlays(
  imageBuffer: Buffer,
  params: {
    phone: string;
    address: string;
    logoUrl?: string;
  }
): Promise<string> {
  try {
    const composites: sharp.OverlayOptions[] = [];

    // --- A. Footer Bar & Text Overlay ---
    const footerHeight = 80;
    const footerSvg = Buffer.from(`
      <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="${1080 - footerHeight}" width="1080" height="${footerHeight}" fill="rgba(0,0,0,0.6)" />
        <text x="35" y="${1080 - footerHeight + 50}" font-family="Arial, sans-serif" font-size="32" fill="white">📞 ${params.phone}</text>
        <text x="1045" y="${1080 - footerHeight + 50}" text-anchor="end" font-family="Arial, sans-serif" font-size="32" fill="white">📍 ${params.address}</text>
      </svg>
    `);

    composites.push({
      input: footerSvg,
      top: 0,
      left: 0
    });

    // --- B. Logo Overlay ---
    if (params.logoUrl) {
      try {
        const logoRes = await fetch(params.logoUrl);
        if (logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer();
          const logoSize = 120;
          const padding = 30;
          const borderSize = logoSize + 8;

          const maskSvg = Buffer.from(
            `<svg width="${logoSize}" height="${logoSize}" xmlns="http://www.w3.org/2000/svg">
              <circle cx="${logoSize / 2}" cy="${logoSize / 2}" r="${logoSize / 2}" fill="white" />
            </svg>`
          );

          const roundedLogo = await sharp(Buffer.from(logoBuffer))
            .resize(logoSize, logoSize, { fit: 'cover' })
            .composite([{ input: maskSvg, blend: 'dest-in' }])
            .png()
            .toBuffer();

          const whiteCircleSvg = Buffer.from(
            `<svg width="${borderSize}" height="${borderSize}" xmlns="http://www.w3.org/2000/svg">
              <circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2}" fill="white" />
            </svg>`
          );

          const logoWithWhiteBorder = await sharp(whiteCircleSvg)
            .composite([{ input: roundedLogo, gravity: 'center' }])
            .png()
            .toBuffer();

          composites.push({
            input: logoWithWhiteBorder,
            gravity: 'northeast',
            top: padding,
            left: 1080 - borderSize - padding
          });
        }
      } catch (err) {
        console.warn('Failed to process logo overlay:', err);
      }
    }

    const finalBuffer = await sharp(imageBuffer)
      .composite(composites)
      .jpeg({ quality: 90 })
      .toBuffer();

    return `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Overlay composition failed:', err);
    return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
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
