import puppeteer from 'puppeteer';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function renderHTMLToPNG(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for all fonts to be loaded before snapping screenshot
        await page.evaluateHandle('document.fonts.ready');
        await new Promise(resolve => setTimeout(resolve, 500));

        const screenshot = await page.screenshot({ type: 'png' });
        return screenshot as Buffer;
    } finally {
        await browser.close();
    }
}

export async function uploadToStorage(
    token: string,
    buffer: Buffer,
    restaurantId: string,
    templateName: string
): Promise<string> {
    const timestamp = Date.now();
    const fileName = `poster_${templateName}_${timestamp}.png`;
    const filePath = `${restaurantId}/${fileName}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/media/${filePath}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'apiKey': anonKey as string,
            'Content-Type': 'image/png',
            'x-upsert': 'false'
        },
        body: buffer as any
    });

    if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Upload Failed: ${errorText}`);
    }

    // Return the public URL manually since we are not using the SDK here
    return `${supabaseUrl}/storage/v1/object/public/media/${filePath}`;
}
