
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        // @ts-ignore
        const models = await genAI.listModels();
        return NextResponse.json(models);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
