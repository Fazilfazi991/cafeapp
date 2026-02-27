import Replicate from "replicate";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function generatePoster(
    imageUrl: string,
    brandColor: string,
    restaurantName: string,
    cuisineType: string
): Promise<string> {
    try {
        const prompt = `A highly stylized, professional social media advertisement or poster for a restaurant named ${restaurantName} (${cuisineType}). 
The main focus is the food shown in this image URL: ${imageUrl}. 
Incorporate the brand color ${brandColor} into the lighting, background accents, or subtle graphic elements. 
The style should be appetizing, modern, and high-quality food photography suitable for Instagram.
Do not add messy text, keep it clean. Subtle aesthetic.`;

        const output = await replicate.run(
            "black-forest-labs/flux-schnell",
            {
                input: {
                    prompt: prompt,
                    aspect_ratio: "1:1",
                }
            }
        );

        // Replicate's flux-schnell returns an array of strings (URLs)
        const generatedUrl = Array.isArray(output) ? output[0] : output;

        if (!generatedUrl || typeof generatedUrl !== 'string') {
            throw new Error('Replicate returned no image URL');
        }

        return generatedUrl;

    } catch (error: any) {
        console.error('Replicate Error:', error);
        throw new Error(`Failed to generate poster: ${error.message}`);
    }
}
