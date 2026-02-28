export function buildPosterPrompt(params: {
    imageUrl: string,
    businessName: string,
    businessType: string,
    cuisine?: string,
    tone: string,
    primaryColor: string,
    caption: string,
    style: string
}): string {
    const { businessName, businessType, cuisine, tone, primaryColor, style } = params;
    let basePrompt = '';

    // Business Type Base Prompt
    if (businessType === 'restaurant' || businessType === 'cafe') {
        basePrompt = `Professional food photography social media poster for ${businessName}, a ${cuisine || 'fine'} restaurant. The food should look appetizing, fresh and delicious. Warm inviting atmosphere.`;
    } else if (businessType === 'salon' || businessType === 'spa') {
        basePrompt = `Elegant beauty and wellness social media poster for ${businessName}. Clean, luxurious aesthetic. Soft lighting, premium feel.`;
    } else if (businessType === 'gym' || businessType === 'fitness') {
        basePrompt = `Energetic fitness social media poster for ${businessName}. Dynamic, motivating aesthetic. Bold energy, strong visual impact.`;
    } else if (businessType === 'retail') {
        basePrompt = `Professional retail product social media poster for ${businessName}. Clean product showcase, lifestyle feel, aspirational aesthetic.`;
    } else if (businessType === 'real_estate') {
        basePrompt = `Premium real estate social media poster for ${businessName}. Sophisticated, professional, trustworthy aesthetic. Clean modern design.`;
    } else if (businessType === 'medical' || businessType === 'clinic') {
        basePrompt = `Professional medical and wellness social media poster for ${businessName}. Clean, trustworthy, caring aesthetic. Light, clinical but warm.`;
    } else if (businessType === 'education') {
        basePrompt = `Engaging educational social media poster for ${businessName}. Inspiring, professional, motivating aesthetic.`;
    } else {
        basePrompt = `Professional business social media poster for ${businessName}. Clean, modern, engaging aesthetic.`;
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
    if (style === 'minimal') {
        stylePrompt = " Minimalist design, lots of white space, subtle branding, elegant typography overlay.";
    } else if (style === 'bold') {
        stylePrompt = ` Bold graphic design, strong color blocking using ${primaryColor}, large text overlay, high impact.`;
    } else if (style === 'lifestyle') {
        stylePrompt = " Lifestyle photography feel, natural candid aesthetic, subtle text overlay, warm tones.";
    }

    // Technical Requirements
    const techPrompt = ` Social media post format, 1080x1080 pixels, professional photography quality, suitable for Instagram and Facebook, ${primaryColor} as accent color, high resolution, sharp details.`;

    const finalPrompt = basePrompt + tonePrompt + stylePrompt + techPrompt;
    return finalPrompt;
}
