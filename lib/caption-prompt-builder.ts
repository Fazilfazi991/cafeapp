export function buildCaptionPrompt(params: {
    businessName: string,
    businessType: string,
    cuisine?: string,
    tone: string,
    city: string,
    platform: 'instagram' | 'facebook' | 'gmb',
    contentType: string
}): string {
    const { businessName, cuisine, tone, city, platform } = params;

    const finalCuisine = cuisine || params.businessType || 'restaurant';
    const basePrompt = `You are a social media manager for ${businessName}, a ${finalCuisine} restaurant in ${city} with a ${tone} voice. Write mouth-watering captions that make people hungry and want to visit immediately.`;

    // Tone Modifiers (removed since it's now in the base prompt instruction, but we can keep subtle tweaks or let the base handle it)
    // Actually, user requested the base prompt verbatim. We will omit the explicit tone appends and just formatting.

    // Platform Modifiers
    let platformPrompt = '';
    if (platform === 'instagram') {
        platformPrompt = "\nWrite 3 caption options. Each under 150 words. Include 5-8 relevant hashtags. Include 2-3 emojis. End with a call to action.";
    } else if (platform === 'facebook') {
        platformPrompt = "\nWrite 3 caption options. Each under 100 words. Conversational tone. No hashtags. End with a question to encourage comments.";
    } else if (platform === 'gmb') {
        return `Write a short Google My Business post for ${businessName}, a ${finalCuisine} restaurant in ${city}. Mention the location, sound like a local restaurant update, under 60 words, no hashtags, include a call to action.\nReturn as valid JSON only:\n{\n  "option1": "caption here",\n  "option2": "caption here",\n  "option3": "caption here"\n}`;
    }

    // Format Instruction
    const formatInstruction = "\nReturn as valid JSON only:\n{\n  \"option1\": \"caption here\",\n  \"option2\": \"caption here\",\n  \"option3\": \"caption here\"\n}";

    return basePrompt + platformPrompt + formatInstruction;
}
