import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getWhatsappPhoneNumbers, createDailySpecialTemplate } from '@/lib/whatsapp'

export async function POST(request: Request) {
    try {
        const { code, restaurantId, metaAccessToken } = await request.json()

        if (!code || !restaurantId || !metaAccessToken) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        const supabase = createClient()

        // 1. With the Embedded Signup Flow, the frontend already provides the WABA (WhatsApp Business Account ID)
        // and Phone Number ID that the user selected inside the Meta popup. 
        // We will fetch these details using the system User Token (metaAccessToken)

        // Let's assume the frontend passes exactly what it gets from the Meta SDK response
        const { whatsappBusinessAccountId, whatsappPhoneNumberId } = await request.json();

        if (!whatsappBusinessAccountId || !whatsappPhoneNumberId) {
            return NextResponse.json({ error: 'Missing WhatsApp account IDs' }, { status: 400 })
        }

        // 2. Fetch the actual phone number string for display
        const phoneNumbers = await getWhatsappPhoneNumbers(whatsappBusinessAccountId, metaAccessToken);
        const selectedPhone = phoneNumbers.find((p: any) => p.id === whatsappPhoneNumberId);

        if (!selectedPhone) {
            return NextResponse.json({ error: 'Phone number not found in WhatsApp Business Account' }, { status: 400 })
        }

        const phoneNumberDisplay = selectedPhone.display_phone_number;

        // 3. Trigger creation of the daily_special template
        try {
            await createDailySpecialTemplate(whatsappBusinessAccountId, metaAccessToken);
            console.log(`[WHATSAPP] Triggered template creation for WABA: ${whatsappBusinessAccountId}`);
        } catch (templateErr) {
            console.error('[WHATSAPP] Failed to auto-create daily_special template:', templateErr);
            // We do not fail the whole connection if the template creation fails, 
            // the user will see a warning in the dashboard and can retry or wait.
        }

        // 4. Save to Database
        const payload = {
            whatsapp_business_account_id: whatsappBusinessAccountId,
            whatsapp_phone_number_id: whatsappPhoneNumberId,
            whatsapp_access_token: metaAccessToken, // Often the same system user token is used for WA
            whatsapp_phone_number: phoneNumberDisplay,
            is_active: true
        }

        // Check if existing record
        const { data: existingAccount } = await supabase
            .from('connected_accounts')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .eq('platform', 'facebook')
            .maybeSingle()

        if (existingAccount) {
            const { error: updateErr } = await supabase
                .from('connected_accounts')
                .update(payload)
                .eq('id', existingAccount.id)
            if (updateErr) throw new Error(`DB Update Error: ${updateErr.message}`)
        } else {
            // In highly unlikely scenario they connected WA without FB first
            const { error: insertErr } = await supabase
                .from('connected_accounts')
                .insert({ restaurant_id: restaurantId, platform: 'facebook', ...payload })
            if (insertErr) throw new Error(`DB Insert Error: ${insertErr.message}`)
        }

        return NextResponse.json({ success: true, message: 'WhatsApp Connected Successfully', phoneNumber: phoneNumberDisplay })

    } catch (error: any) {
        console.error('[WHATSAPP_CONNECT_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Failed to connect WhatsApp' }, { status: 500 })
    }
}
