import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found');
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-image',
        generationConfig: {}
    });

    try {
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: "Create a 1080x1080 poster for a pizza restaurant" }
                ]
            }]
        });

        // Log parts specifically
        const parts = result.response.candidates?.[0]?.content?.parts;
        console.log("Parts returned:", JSON.stringify(parts, null, 2));

    } catch (e) {
        console.error("ERROR:");
        console.error(e.message);
    }
}

main();
