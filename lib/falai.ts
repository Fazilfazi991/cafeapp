import { fal } from "@fal-ai/client";

// Configure Fal.ai SDK
fal.config({ credentials: process.env.FAL_KEY });

export async function enhancePhoto(imageUrl: string): Promise<string> {
    try {
        const result: any = await fal.subscribe("fal-ai/clarity-upscaler", {
            input: {
                image_url: imageUrl,
                scale: 2,
                creativity: 0.3,
                resemblance: 0.9
            } as any
        });

        const data = result.data || result;
        if (data.image && data.image.url) {
            return data.image.url;
        }

        return imageUrl; // fallback to original
    } catch (err: any) {
        console.error("[FAL_AI_UPSCALE_ERROR]", err);
        return imageUrl; // graceful fallback, never break the flow
    }
}
