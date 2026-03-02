export function buildCaptionPrompt(params: {
    restaurantName: string,
    cuisineType: string,
    city: string,
    tone: string,
    dishName: string,
    dishDescription: string,
    platform: 'instagram' | 'facebook' | 'gmb'
}): string {
    const { restaurantName, cuisineType, city, tone, dishName, dishDescription, platform } = params;

    let basePrompt = `You are a social media manager for ${restaurantName}, a ${cuisineType} restaurant in ${city} with a ${tone} voice.\n\n`;
    basePrompt += `The photo shows: ${dishName}\nAbout this dish: ${dishDescription}\n\n`;

    if (platform === 'instagram') {
        basePrompt += `Write 3 Instagram captions specifically about ${dishName}. Mention the dish by name in at least 2 of the 3 captions. Make people hungry and want to visit the restaurant to try it.\nInclude 5-7 relevant food hashtags.\nInclude #${city.replace(/\s+/g, '')}Food #${city.replace(/\s+/g, '')}Eats hashtags.\nEach caption under 150 words.\n\n`;
    } else if (platform === 'facebook') {
        basePrompt += `Write 3 Facebook caption options specifically about ${dishName}. Each under 100 words. Conversational tone. No hashtags. End with a question to encourage comments.\n\n`;
    } else if (platform === 'gmb') {
        basePrompt += `Write a short Google My Business post specifically about ${dishName}. Mention the location (${city}), sound like a local restaurant update, under 60 words, no hashtags, include a call to action to come try it.\n\n`;
    }

    const formatInstruction = `Return as valid JSON only:\n{\n  "option1": "caption here",\n  "option2": "caption here",\n  "option3": "caption here"\n}`;

    return basePrompt + formatInstruction;
}
