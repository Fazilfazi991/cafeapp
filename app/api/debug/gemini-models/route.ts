import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        );
        const data = await response.json();
        const imageModels = data.models?.filter(
            (m: any) => m.name.includes('image') || m.name.includes('flash')
        );
        return NextResponse.json({ imageModels });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
