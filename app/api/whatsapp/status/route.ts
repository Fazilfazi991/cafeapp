import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getTemplateStatus } from '@/lib/whatsapp'

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const restaurantId = url.searchParams.get('restaurantId')

        if (!restaurantId) {
            return NextResponse.json({ error: 'Missing restaurant ID' }, { status: 400 })
        }

        const supabase = createClient()

        // 1. Check if WhatsApp is connected at all
        const { data: metaAccount, error } = await supabase
            .from('connected_accounts')
            .select('whatsapp_business_account_id, whatsapp_phone_number, whatsapp_access_token, is_active')
            .eq('restaurant_id', restaurantId)
            .eq('platform', 'facebook')
            .maybeSingle()

        if (error || !metaAccount || !metaAccount.whatsapp_business_account_id || !metaAccount.is_active) {
            return NextResponse.json({
                connected: false,
                phoneNumber: null,
                templateStatus: null
            })
        }

        // 2. Fetch the template approval status from Meta
        let templateStatus = null;
        try {
            templateStatus = await getTemplateStatus(
                metaAccount.whatsapp_business_account_id,
                'daily_special',
                metaAccount.whatsapp_access_token
            );
        } catch (err) {
            console.error('[WHATSAPP_STATUS] Failed to fetch template status:', err)
            // Default to PENDING if we can't fetch it, to be safe and prevent broadcasting errors
            templateStatus = "PENDING";
        }

        return NextResponse.json({
            connected: true,
            phoneNumber: metaAccount.whatsapp_phone_number,
            templateStatus: templateStatus
        })

    } catch (error: any) {
        console.error('[WHATSAPP_STATUS_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Failed to check status' }, { status: 500 })
    }
}
