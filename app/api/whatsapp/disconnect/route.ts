import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { restaurantId } = await request.json()

        if (!restaurantId) {
            return NextResponse.json({ error: 'Missing restaurant ID' }, { status: 400 })
        }

        const supabase = createClient()

        // Nullify all WhatsApp specific columns inside the connected_accounts table to disconnect
        const payload = {
            whatsapp_business_account_id: null,
            whatsapp_phone_number_id: null,
            whatsapp_access_token: null,
            whatsapp_phone_number: null,
        }

        const { error: updateErr } = await supabase
            .from('connected_accounts')
            .update(payload)
            .eq('restaurant_id', restaurantId)
            .eq('platform', 'facebook')

        if (updateErr) throw new Error(`DB Update Error: ${updateErr.message}`)

        return NextResponse.json({ success: true, message: 'WhatsApp Disconnected Successfully' })

    } catch (error: any) {
        console.error('[WHATSAPP_DISCONNECT_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Failed to disconnect WhatsApp' }, { status: 500 })
    }
}
