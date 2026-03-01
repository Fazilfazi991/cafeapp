import { fal } from "@fal-ai/client";
import { buildPosterPrompt } from "./poster-prompt-builder";

// Configure Fal.ai SDK
fal.config({ credentials: process.env.FAL_KEY });

export async function generatePoster(params: {
    imageUrl: string,
    businessName: string,
    businessType: string,
    cuisine?: string,
    tone: string,
    primaryColor: string,
    secondaryColor: string,
    caption: string,
    style: 'minimal' | 'bold' | 'lifestyle',
    includeText?: boolean
}): Promise<string> {

    const builtPrompt = buildPosterPrompt({
        imageUrl: params.imageUrl,
        businessName: params.businessName,
        businessType: params.businessType,
        cuisine: params.cuisine,
        tone: params.tone,
        primaryColor: params.primaryColor,
        caption: params.caption,
        style: params.style,
        includeText: params.includeText
    });

    let result: any;
    try {
        result = await fal.subscribe("fal-ai/flux/schnell", {
            input: {
                prompt: builtPrompt,
                image_url: params.imageUrl,
                image_size: "square_hd",
                num_inference_steps: 12, // Flux Schnell has a hard max of 12 steps
                guidance_scale: 3.5,
                num_images: 1,
                strength: 0.85, // High strength to allow dark backgrounds to form (subject will be composited back in)
                enable_safety_checker: true
            } as any,
            pollInterval: 2000,
        });
    } catch (err: any) {
        throw new Error(`[FAL_AI_FLUX_ERROR] ${err.message} - ${JSON.stringify(err)}`);
    }

    const data = result.data || result; // Handle both SDK versions
    if (!data.images || data.images.length === 0) {
        throw new Error("[FAL_AI_FLUX_ERROR] Fal.ai generation failed to return an image.");
    }

    return data.images[0].url;
}

export async function generateThreeStyles(params: {
    imageUrl: string,
    businessName: string,
    businessType: string,
    cuisine?: string,
    tone: string,
    primaryColor: string,
    secondaryColor: string,
    caption: string,
    includeText?: boolean
}) {
    // Call in parallel for speed
    const [minimal, bold, lifestyle] = await Promise.all([
        generatePoster({ ...params, style: 'minimal', includeText: params.includeText }),
        generatePoster({ ...params, style: 'bold', includeText: params.includeText }),
        generatePoster({ ...params, style: 'lifestyle', includeText: params.includeText })
    ]);

    return { minimal, bold, lifestyle };
}

export async function removeBackground(imageUrl: string): Promise<string> {
    const result: any = await fal.subscribe("fal-ai/bria/background/remove", {
        input: { image_url: imageUrl } as any
    });

    const data = result.data || result;
    if (!data.image?.url) {
        throw new Error("Failed to remove background.");
    }

    return data.image.url;
}

export async function enhancePhoto(imageUrl: string): Promise<string> {
    let result: any;
    try {
        result = await fal.subscribe("fal-ai/clarity-upscaler", {
            input: {
                image_url: imageUrl,
                scale: 2,
                creativity: 0.3
            } as any
        });
    } catch (err: any) {
        throw new Error(`[FAL_AI_ENHANCE_ERROR] ${err.message} - ${JSON.stringify(err)}`);
    }

    const data = result.data || result;
    if (!data.image?.url) {
        throw new Error("[FAL_AI_ENHANCE_ERROR] Failed to enhance photo - no url returned.");
    }

    return data.image.url;
}
