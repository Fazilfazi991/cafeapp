import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCaptions(
    restaurantName: string,
    cuisineType: string,
    city: string,
    toneOfVoice: string,
    platform: 'instagram' | 'facebook' | 'gmb',
    postType: string,
    extraContext?: string
) {
    let platformInstructions = '';
    if (platform === 'instagram') {
        platformInstructions = 'Be engaging, use emojis, include 3-5 relevant hashtags, and keep it under 150 words. Focus on visual aesthetic and appetite appeal.';
    } else if (platform === 'facebook') {
        platformInstructions = 'Be conversational and friendly. Do not use hashtags. Keep it under 100 words. Focus on community and family-friendly dining.';
    } else if (platform === 'gmb') {
        platformInstructions = `Be short and local-SEO optimized. MUST mention the city (${city}). Do not use hashtags. Keep it under 60 words. Sound like a helpful local search result update.`;
    }

    const systemPrompt = `You are an expert social media manager for ${restaurantName}, a ${cuisineType} restaurant in ${city}.
Your brand voice is strictly: ${toneOfVoice}.

${extraContext ? `The content you are writing for is a video with this description/brief: "${extraContext}"` : ''}

Generate 3 different caption options for a ${postType} post on ${platform}.
${platformInstructions}

You must return the response as a raw JSON object with exactly this schema:
{
  "option1": "First caption text here",
  "option2": "Second caption text here",
  "option3": "Third caption text here"
}

Do not include any markdown formatting blocks like \`\`\`json. Return only the raw JSON string.`;

    // 1. Try OpenAI First
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
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

            const result = await model.generateContent(systemPrompt);
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
