import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found');
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    try {
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: "Create a simple poster for a restaurant" },
                    // providing dummy image to see if it allows image inputs
                    { inlineData: { mimeType: 'image/jpeg', data: Buffer.from('dummy').toString('base64') } }
                ]
            }]
        });
        console.log("Success");
    } catch (e) {
        console.error("ERROR:");
        console.error(e.message);
    }
}

main();
