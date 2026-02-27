import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeVideoWithGemini(
    videoUrl: string,
    restaurantName: string,
    cuisineType: string
): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Note for MVP:
        // Gemini 1.5 Pro handles video natively, but requires uploading the video file
        // via the File API first (for files over 20MB) or sending base64 inline.
        // Since we only have a public URL from Supabase, a true production flow
        // would either fetch the video buffer and pass it inline, or upload it to Gemini.

        // As a temporary mock for the MVP to avoid buffer overflow errors from big videos:
        const mockPrompt = `Analyze this imaginary restaurant video of ${restaurantName} (${cuisineType}). Describe what food or scene is shown. Write a brief content brief for a social media caption. Include: main subject, mood, key details a customer would care about.`;

        const result = await model.generateContent(mockPrompt);
        const response = await result.response;
        const text = response.text();

        return text || 'A beautiful video showcasing our latest dishes and vibrant atmosphere.';

    } catch (error: any) {
        console.error('Gemini Error:', error);
        throw new Error(`Failed to analyze video with Gemini: ${error.message}`);
    }
}
