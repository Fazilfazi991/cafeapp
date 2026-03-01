import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { createClient } from '@/lib/supabase-server';

export async function renderPosterToImage(
    html: string,
    format: 'square' | 'story' = 'square'
): Promise<Buffer> {
    const isLocal = process.env.NODE_ENV === 'development';

    const browser = await puppeteer.launch({
        args: isLocal ? puppeteer.defaultArgs() : (chromium as any).args,
        defaultViewport: isLocal ? { width: 1080, height: 1080 } : (chromium as any).defaultViewport,
        executablePath: isLocal
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // Default Windows Path, change if needed
            : await chromium.executablePath(),
        headless: isLocal ? true : (chromium as any).headless,
    });

    const page = await browser.newPage();

    // Set viewport explicitly to trigger right sizing
    await page.setViewport({
        width: format === 'square' ? 1080 : 1080,
        height: format === 'square' ? 1080 : 1920
    });

    await page.setContent(html);

    // Wait for images to load correctly (the logo and photoUrl)
    await page.waitForSelector('img').catch(() => { }); // catch in case there are no images
    await page.evaluate(() => {
        return Promise.all(
            Array.from(document.images)
                .filter(img => !img.complete)
                .map(img => new Promise(resolve => {
                    img.onload = img.onerror = resolve;
                }))
        );
    });

    // We take the screenshot directly of the viewport
    const buffer = await page.screenshot({
        type: 'png',
        clip: {
            x: 0,
            y: 0,
            width: format === 'square' ? 1080 : 1080,
            height: format === 'square' ? 1080 : 1920
        }
    });

    await browser.close();

    // The result from page.screenshot is a Uint8Array. Buffer.from handles it safely.
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

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media') // reusing the media bucket (it contains posters)
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
