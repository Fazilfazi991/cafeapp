export function buildPosterPrompt(params: {
    imageUrl: string,
    businessName: string,
    businessType: string,
    cuisine?: string,
    tone: string,
    primaryColor: string,
    caption: string,
    style: string,
    includeText?: boolean,
    promotionalText?: string
}): string {
    const { businessType, cuisine, tone, primaryColor, style, includeText, promotionalText } = params;
    let basePrompt = '';

    // Business Type Base Prompt
    if (businessType === 'restaurant' || businessType === 'cafe') {
        basePrompt = `Highly stylized food advertisement poster. The food is placed centrally on a dramatic, dark aesthetic background (like deep navy blue, dark maroon, or rich black). Featuring dynamic abstract graphic elements like paint splatters, wavy brush strokes, or torn paper edges highlighting the dish. High-contrast, bold, premium aesthetic.`;
    } else if (businessType === 'salon' || businessType === 'spa') {
        basePrompt = `Elegant beauty and wellness social media poster. Clean, luxurious aesthetic. Soft lighting, premium feel.`;
    } else if (businessType === 'gym' || businessType === 'fitness') {
        basePrompt = `Energetic fitness social media poster. Dynamic, motivating aesthetic. Bold energy, strong visual impact.`;
    } else if (businessType === 'retail') {
        basePrompt = `Professional retail product social media poster. Clean product showcase, lifestyle feel, aspirational aesthetic.`;
    } else if (businessType === 'real_estate') {
        basePrompt = `Premium real estate social media poster. Sophisticated, professional, trustworthy aesthetic. Clean modern design.`;
    } else if (businessType === 'medical' || businessType === 'clinic') {
        basePrompt = `Professional medical and wellness social media poster. Clean, trustworthy, caring aesthetic. Light, clinical but warm.`;
    } else if (businessType === 'education') {
        basePrompt = `Engaging educational social media poster. Inspiring, professional, motivating aesthetic.`;
    } else {
        basePrompt = `Professional business social media poster. Clean, modern, engaging aesthetic.`;
    }

    // Tone Modifiers
    let tonePrompt = '';
    if (tone === 'casual') {
        tonePrompt = " Friendly, approachable, relaxed atmosphere. Natural lighting.";
    } else if (tone === 'fun') {
        tonePrompt = " Vibrant, playful, energetic. Bright colors, dynamic composition.";
    } else if (tone === 'professional') {
        tonePrompt = " Sophisticated, polished, corporate. Clean lines, premium feel.";
    } else if (tone === 'bold') {
        tonePrompt = " Strong, striking, powerful. High contrast, dramatic lighting.";
    }

    // Style Modifiers
    let stylePrompt = '';
    const textCommand = promotionalText ? ` Prominently display the exact text: "${promotionalText}".` : " Sharp, stylized typography overlay.";
    const boldTextCommand = promotionalText ? ` Large, playful, cursive text reading precisely: "${promotionalText}".` : " Large, playful, cursive 'Delicious Food Menu' text.";

    if (style === 'minimal') {
        stylePrompt = " Elegant composition with deep dark background, crisp central food spotlight, clean graphic lines.";
        if (includeText) stylePrompt += textCommand;
    } else if (style === 'bold') {
        stylePrompt = ` Extremely bold graphic design. Dark background with bright, contrasting organic paint splatters and wavy shapes using ${primaryColor}.`;
        if (includeText) stylePrompt += boldTextCommand;
    } else if (style === 'lifestyle') {
        stylePrompt = ` Premium, moody lifestyle advertisement. Rich, dark, warm tones. Abstract liquid splashes or energetic organic shapes in ${primaryColor} around the food.`;
    }

    // Technical Requirements
    let techPrompt = ` Social media post format, 1080x1080 pixels, professional photography quality, suitable for Instagram and Facebook, ${primaryColor} as accent color, high resolution, sharp details.`;

    if (includeText === false) {
        techPrompt += " CRITICAL: ABSOLUTELY NO TEXT. NO TYPOGRAPHY. NO LETTERS. NO LOGOS. DO NOT GENERATE TEXT.";
    }

    const finalPrompt = basePrompt + tonePrompt + stylePrompt + techPrompt;
    return finalPrompt;
}
