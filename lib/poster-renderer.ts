import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { createClient } from '@/lib/supabase-server';

export async function renderPosterToImage(
    html: string,
    format: 'square' | 'story' = 'square'
): Promise<Buffer> {
    const isLocal = process.env.NODE_ENV === 'development';
    const width = 1080;
    const height = format === 'square' ? 1080 : 1920;

    const browser = await puppeteer.launch({
        args: isLocal
            ? ['--no-sandbox', '--disable-setuid-sandbox']
            : (chromium as any).args,
        defaultViewport: { width, height },
        executablePath: isLocal
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : await chromium.executablePath(),
        headless: true,
    });

    const page = await browser.newPage();

    // Must set viewport before content to ensure correct layout calculation
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    // Load the full HTML document and wait for ALL network requests to settle
    // (fonts, images from Supabase URLs etc.)
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Extra safety: wait for all <img> tags to finish loading
    await page.evaluate(() => {
        const imgs = Array.from(document.images);
        const pending = imgs.filter(img => !img.complete);
        if (pending.length === 0) return Promise.resolve();
        return Promise.all(
            pending.map(img =>
                new Promise<void>(resolve => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // don't hang on broken images
                })
            )
        );
    });

    // Screenshot exactly the poster dimensions
    const buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
    });

    await browser.close();

    return Buffer.from(buffer);
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
            upsert: true
        });

    if (uploadError) {
        throw new Error(`Failed to upload poster to storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(filename);

    return publicUrlData.publicUrl;
}
