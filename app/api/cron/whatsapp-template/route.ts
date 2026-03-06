import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getTemplateStatus, createDailySpecialTemplate } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const supabase = createClient()

        // We need to poll status for any active WhatsApp account
        const { data: accounts, error } = await supabase
            .from('connected_accounts')
            .select('restaurant_id, whatsapp_business_account_id, whatsapp_access_token')
            .eq('platform', 'facebook')
            .eq('is_active', true)
            .not('whatsapp_business_account_id', 'is', null)

        if (error) {
            console.error('[CRON_TEMPLATE_FETCH_ERROR]', error)
            return NextResponse.json({ error: 'Failed to fetch WhatsApp accounts' }, { status: 500 })
        }

        if (!accounts || accounts.length === 0) {
            return NextResponse.json({ success: true, message: 'No active WhatsApp accounts to poll', processed: 0 })
        }

        let processed = 0

        for (const account of accounts) {
            try {
                // Fetch the template status directly from Meta
                const status = await getTemplateStatus(
                    account.whatsapp_business_account_id,
                    'daily_special',
                    account.whatsapp_access_token
                );

                if (status === null) {
                    // This means the template literally does not exist. We should probably try to create it again just in case.
                    await createDailySpecialTemplate(account.whatsapp_business_account_id, account.whatsapp_access_token);
                    console.log(`[CRON_TEMPLATE] Created missing daily_special template for ${account.restaurant_id}`);
                }

                // If it is APPROVED, we do nothing. The API endpoints just poll Meta dynamically. 
                // We could cache this status in the DB in the future to save Meta API calls,
                // but for now, dynamic polling per user request/cron is fine.
                console.log(`[CRON_TEMPLATE] WABA ${account.whatsapp_business_account_id} Template Status: ${status}`);
                processed++;

            } catch (err: any) {
                console.error(`[CRON_TEMPLATE_POLL_ERROR] Account ${account.restaurant_id}:`, err)
            }
        }

        return NextResponse.json({ success: true, processed })

    } catch (error: any) {
        console.error('[CRON_TEMPLATE_ROOT_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
