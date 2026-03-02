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
  const photoResp = await fetch(params.photoUrl)
  const photoBuffer = await photoResp.arrayBuffer()
  const photoBase64 = Buffer.from(photoBuffer).toString('base64')
  const photoMime = photoResp.headers.get('content-type') || 'image/jpeg'

  let logoBase64: string | null = null
  let logoMime = 'image/png'
  if (params.logoUrl) {
    try {
      const logoResp = await fetch(params.logoUrl)
      const logoBuffer = await logoResp.arrayBuffer()
      logoBase64 = Buffer.from(logoBuffer).toString('base64')
      logoMime = logoResp.headers.get('content-type') || 'image/png'
    } catch (e) {
      console.log('Logo fetch failed, skipping')
    }
  }

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
      
      I am providing you with:
      1. A food photo to use as background
      ${logoBase64 ? '2. A business logo to place on the poster' : ''}
      
      Design requirements:
      - Use the provided photo as full background
      - Add a dark gradient overlay on bottom 40%
      - ${logoBase64 ? 'Place the logo in top-right corner inside a white rounded square with shadow' : ''}
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
      - Clean minimal professional aesthetic
      - No placeholder text, no Lorem ipsum
      - All text must be perfectly legible
    `,

    bold: `
      ${basePrompt}
      
      I am providing:
      1. A food photo for the top section
      ${logoBase64 ? '2. A business logo' : ''}
      
      Design:
      - Food photo fills top 58% of poster
      - Solid ${params.primaryColor} background 
        for bottom 42%
      - ${logoBase64 ? 'Logo top-left corner on photo section, white rounded background' : ''}
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
      
      I am providing:
      1. A food photo for center placement
      ${logoBase64 ? '2. A business logo' : ''}
      
      Design:
      - Clean white/cream (#F8F8F6) background
      - Food photo centered in a rounded rectangle 
        with subtle shadow, filling middle portion
      - Thin ${params.primaryColor} color bars 
        at very top and very bottom edges
      - "${params.businessName}" above photo 
        in ${params.primaryColor} uppercase spaced
      - "${params.customText}" below photo 
        in dark charcoal bold text  
      - ${logoBase64 ? 'Small logo top-right with light border' : ''}
      - "${params.phone}" and "${params.website}" 
        near bottom in gray
      - Premium editorial magazine aesthetic
      - Perfectly legible text throughout
    `
  }

  const parts: any[] = [
    {
      inlineData: {
        mimeType: photoMime,
        data: photoBase64
      }
    }
  ]

  if (logoBase64) {
    parts.push({
      inlineData: {
        mimeType: logoMime,
        data: logoBase64
      }
    })
  }

  parts.push({
    text: stylePrompts[params.style]
  })

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

  const supabase = createClient()
  const fileName = `posters/${params.restaurantId}/${Date.now()}-${params.style}.png`

  // Using media bucket as it's the standard for this app based on earlier code
  // We can switch to posters if required, but earlier code used 'media'
  const { error: uploadError } = await supabase.storage
    .from('posters')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    })

  if (uploadError) {
    // try fallback to media bucket just in case someone didn't create 'posters'
    const { error: mediaUploadError } = await supabase.storage
      .from('media')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (mediaUploadError) {
      throw new Error(`Upload failed: ${uploadError.message} / ${mediaUploadError.message}`)
    }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName)
    console.log('Poster generated (fallback bucket):', publicUrl)
    return publicUrl
  }

  const { data: { publicUrl } } = supabase.storage.from('posters').getPublicUrl(fileName)

  console.log('Poster generated:', publicUrl)
  return publicUrl
}

export async function generateAllPosters(
  params: Omit<Parameters<typeof generatePosterWithGemini>[0], 'style'>
): Promise<{
  minimal: string
  bold: string
  lifestyle: string
}> {
  const [minimal, bold, lifestyle] = await Promise.all([
    generatePosterWithGemini({ ...params, style: 'minimal' }),
    generatePosterWithGemini({ ...params, style: 'bold' }),
    generatePosterWithGemini({ ...params, style: 'lifestyle' })
  ])

  return { minimal, bold, lifestyle }
}
