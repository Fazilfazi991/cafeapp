export function buildCaptionPrompt(params: {
    businessName: string,
    businessType: string,
    cuisine?: string,
    tone: string,
    city: string,
    platform: 'instagram' | 'facebook' | 'gmb',
    contentType: string
}): string {
    const { businessName, businessType, cuisine, tone, city, platform } = params;
    let basePrompt = '';

    // Business Type Prompts
    if (businessType === 'restaurant' || businessType === 'cafe') {
        basePrompt = `You are a social media manager for ${businessName}, a ${cuisine || 'quality'} restaurant in ${city}. You write mouth-watering, engaging captions that make people hungry and want to visit immediately.`;
    } else if (businessType === 'salon' || businessType === 'spa') {
        basePrompt = `You are a social media manager for ${businessName}, a premium salon and spa in ${city}. You write elegant, aspirational captions that make people want to treat themselves.`;
    } else if (businessType === 'gym' || businessType === 'fitness') {
        basePrompt = `You are a social media manager for ${businessName}, a fitness center in ${city}. You write motivating, energetic captions that inspire people to get active.`;
    } else if (businessType === 'retail') {
        basePrompt = `You are a social media manager for ${businessName}, a retail store in ${city}. You write compelling captions that showcase products and drive purchase decisions.`;
    } else if (businessType === 'real_estate') {
        basePrompt = `You are a social media manager for ${businessName}, a real estate company in ${city}. You write professional captions that build trust and showcase properties.`;
    } else if (businessType === 'medical' || businessType === 'clinic') {
        basePrompt = `You are a social media manager for ${businessName}, a medical and wellness clinic in ${city}. You write caring, trustworthy captions that inform and reassure patients.`;
    } else if (businessType === 'education') {
        basePrompt = `You are a social media manager for ${businessName}, an educational institution in ${city}. You write inspiring captions that motivate learning.`;
    } else {
        basePrompt = `You are a social media manager for ${businessName}, a business in ${city}. You write engaging social media captions.`;
    }

    // Tone Modifiers
    let tonePrompt = '';
    if (tone === 'casual') {
        tonePrompt = "\nUse friendly, conversational language. Short sentences. Relatable.";
    } else if (tone === 'fun') {
        tonePrompt = "\nUse playful language, relevant emojis, exciting punctuation! Make it entertaining.";
    } else if (tone === 'professional') {
        tonePrompt = "\nUse polished, sophisticated language. Formal but approachable. No slang.";
    } else if (tone === 'bold') {
        tonePrompt = "\nUse powerful, direct language. Strong statements. Action-oriented words.";
    }

    // Platform Modifiers
    let platformPrompt = '';
    if (platform === 'instagram') {
        platformPrompt = "\nWrite 3 caption options. Each under 150 words. Include 5-8 relevant hashtags. Include 2-3 emojis. End with a call to action.";
    } else if (platform === 'facebook') {
        platformPrompt = "\nWrite 3 caption options. Each under 100 words. Conversational tone. No hashtags. End with a question to encourage comments.";
    } else if (platform === 'gmb') {
        platformPrompt = `\nWrite 3 caption options. Each under 60 words. Mention ${city}. SEO-friendly. No hashtags. Sound like a local business update. Include a call to action.`;
    }

    // Format Instruction
    const formatInstruction = "\nReturn as valid JSON only:\n{\n  \"option1\": \"caption here\",\n  \"option2\": \"caption here\",\n  \"option3\": \"caption here\"\n}";

    return basePrompt + tonePrompt + platformPrompt + formatInstruction;
}
