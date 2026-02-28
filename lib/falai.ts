import { fal } from '@fal-ai/client';

// Configure the client
// Requires FAL_KEY environment variable to be set
fal.config({
    credentials: process.env.FAL_KEY,
});

export async function generatePoster(
    imageUrl: string,
    brandColor: string,
    restaurantName: string,
    cuisineType: string
): Promise<string> {
    try {
        // Standard prompt engineering for a food poster using Flux
        const prompt = `A highly stylized, professional social media advertisement or poster for a restaurant. 
    The main focus is the food shown in this image: ${imageUrl}. 
    Incorporate the brand color ${brandColor} into the lighting, background accents, or subtle graphic elements. 
    The style should be appetizing, modern, and high-quality food photography suitable for Instagram.
    Do not add messy text, keep it clean. Subtle aesthetic.`

        const result = await fal.subscribe('fal-ai/flux/schnell', {
            input: {
                prompt: prompt,
                // @ts-ignore - Fal AI types are outdated for this model
                image_url: imageUrl, // Some flux models accept image prompts
                image_size: 'square_hd',
                num_inference_steps: 4, // Schnell is fast
                guidance_scale: 3.5,
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === 'IN_PROGRESS') {
                    update.logs.map((log) => log.message).forEach(console.log);
                }
            },
        });

        // The result typically contains a deeply nested array of images
        // Note: The exact return type shape depends on the specific fal model chosen
        const generatedUrl = (result.data as any).images?.[0]?.url;

        if (!generatedUrl) {
            throw new Error('Fal.ai returned no image URL')
        }

        return generatedUrl;

    } catch (error: any) {
        console.error('Fal AI Error:', error);
        throw new Error(`Failed to generate poster: ${error.message}`);
    }
}
