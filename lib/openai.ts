import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { buildCaptionPrompt } from '@/lib/caption-prompt-builder';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export async function generateCaptions(params: {
    restaurantName: string,
    cuisineType: string,
    city: string,
    tone: string,
    dishName: string,
    dishDescription: string,
    platform: 'instagram' | 'facebook' | 'gmb',
    extraContext?: string
}) {
    const { restaurantName, cuisineType, city, tone, dishName, dishDescription, platform, extraContext } = params;

    const systemPrompt = buildCaptionPrompt({
        restaurantName,
        cuisineType,
        city,
        tone: tone,
        dishName,
        dishDescription,
        platform
    });

    const finalPrompt = extraContext ? `${systemPrompt}\n\nThe content you are writing for is a video with this description/brief: "${extraContext}"` : systemPrompt;

    // 1. Try OpenAI First
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: finalPrompt },
                { role: 'user', content: 'Generate the 3 caption options.' }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        const resultText = response.choices[0].message.content;
        if (!resultText) throw new Error('No content returned from OpenAI');

        console.log("Successfully generated captions via OpenAI");
        return JSON.parse(resultText);

    } catch (openaiError: any) {
        console.warn('OpenAI failed (likely quota). Falling back to Gemini...', openaiError.message);

        // 2. Fallback to Gemini
        try {
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json",
                }
            });

            const result = await model.generateContent(finalPrompt);
            const response = await result.response;
            const resultText = response.text();

            if (!resultText) throw new Error('No content returned from Gemini');

            console.log("Successfully generated captions via Gemini Fallback");
            return JSON.parse(resultText);

        } catch (geminiError: any) {
            console.error('Both OpenAI and Gemini failed!', geminiError);
            throw new Error(`Failed to generate captions on both platforms. Gemini error: ${geminiError.message}`);
        }
    }
}
