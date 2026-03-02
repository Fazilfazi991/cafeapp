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
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Wait an extra moment to ensure fonts load
        await new Promise(resolve => setTimeout(resolve, 500));

        const screenshot = await page.screenshot({ type: 'png' });
        return screenshot as Buffer;
    } finally {
        await browser.close();
    }
}

export async function uploadToStorage(
    buffer: Buffer,
    restaurantId: string,
    templateName: string
): Promise<string> {
    // using admin client to bypass RLS for server-side generation
    const supabase = createAdminClient();
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
