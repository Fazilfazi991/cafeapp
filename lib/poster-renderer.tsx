import satori from 'satori';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase-server';
import { PosterTemplateParams, buildMinimalCleanSatori, buildBoldImpactSatori, buildLifestyleFrameSatori } from './poster-templates';

// Read Inter font from the locally bundled @fontsource/inter package
// (Google Fonts CDN blocks server-side requests and returns HTML)
function loadFont(weight: 400 | 700 | 900): Buffer {
    const fontPath = path.join(process.cwd(), 'node_modules', '@fontsource', 'inter', 'files', `inter-latin-${weight}-normal.woff`);
    return fs.readFileSync(fontPath);
}

// Convert a remote URL to a base64 data URL so Satori can embed it inline
export async function toDataUrl(url: string): Promise<string> {
    try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const mime = res.headers.get('content-type') || 'image/jpeg';
        const base64 = Buffer.from(buf).toString('base64');
        return `data:${mime};base64,${base64}`;
    } catch {
        return url;
    }
}

export async function renderPosterToImage(
    style: 'minimal' | 'bold' | 'lifestyle',
    params: PosterTemplateParams
): Promise<Buffer> {
    // Load fonts from disk (synchronous — no network request)
    const interRegular = loadFont(400);
    const interBold = loadFont(700);
    const interBlack = loadFont(900);

    // Pre-fetch images as base64 data URLs
    const [photoDataUrl, logoDataUrl] = await Promise.all([
        params.photoUrl ? toDataUrl(params.photoUrl) : Promise.resolve(''),
        params.logoUrl ? toDataUrl(params.logoUrl) : Promise.resolve(''),
    ]);

    const enrichedParams: PosterTemplateParams = {
        ...params,
        photoUrl: photoDataUrl,
        logoUrl: logoDataUrl || undefined,
    };

    // Pick the Satori element tree for this style
    let element: React.ReactNode;
    if (style === 'minimal') element = buildMinimalCleanSatori(enrichedParams);
    else if (style === 'bold') element = buildBoldImpactSatori(enrichedParams);
    else element = buildLifestyleFrameSatori(enrichedParams);

    // Render to SVG string via Satori
    const svg = await satori(element as any, {
        width: 1080,
        height: 1080,
        fonts: [
            { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
            { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
            { name: 'Inter', data: interBlack, weight: 900, style: 'normal' },
        ],
    });

    // Convert SVG → PNG using sharp (cross-platform, Vercel-native, no native binaries)
    const pngBuffer = await sharp(Buffer.from(svg))
        .resize(1080, 1080)
        .png()
        .toBuffer();

    return pngBuffer;
}

export async function uploadPosterToSupabase(
    buffer: Buffer,
    restaurantId: string,
    templateName: string
): Promise<string> {
    const supabase = createClient();
    const timestamp = Date.now();
    const filename = `posters/${restaurantId}/${timestamp}-${templateName}.png`;

    const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filename, buffer, {
            contentType: 'image/png',
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Failed to upload poster: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(filename);

    return publicUrlData.publicUrl;
}
