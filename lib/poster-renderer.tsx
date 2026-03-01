import satori from 'satori';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase-server';
import { PosterTemplateParams, buildMinimalCleanSatori, buildBoldImpactSatori, buildLifestyleFrameSatori } from './poster-templates';

// Fetch a font as ArrayBuffer for Satori
async function fetchFont(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);
    return res.arrayBuffer();
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
    // Load fonts at render time (Vercel edge-compatible approach)
    const [interRegular, interBold, interBlack] = await Promise.all([
        fetchFont('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff'),
        fetchFont('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff'),
        fetchFont('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff'),
    ]);

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
