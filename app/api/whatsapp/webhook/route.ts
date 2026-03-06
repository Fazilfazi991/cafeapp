import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// The verification token you set in the Meta App Developer Dashboard
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'postchef-whatsapp-webhook'

/**
 * GET handler: Meta calls this endpoint to verify the webhook subscription
 * You need to add this URL and the WEBHOOK_VERIFY_TOKEN to your Meta App settings
 */
export async function GET(request: Request) {
    const url = new URL(request.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('[WHATSAPP_WEBHOOK] Webhook verified successfully.')
        return new Response(challenge, { status: 200 })
    }

    return new Response('Forbidden', { status: 403 })
}

/**
 * POST handler: Meta sends delivery receipts and incoming messages here
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()

        // Meta sends batches of entries
        if (body.object !== 'whatsapp_business_account') {
            return NextResponse.json({ received: true })
        }

        const supabase = createClient()

        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field !== 'messages') continue

                const value = change.value

                // --- DELIVERY STATUS RECEIPTS ---
                for (const status of value.statuses || []) {
                    const { id: messageId, status: deliveryStatus, recipient_id } = status

                    if (deliveryStatus === 'delivered') {
                        console.log(`[WHATSAPP_WEBHOOK] Message ${messageId} delivered to ${recipient_id}`)
                        // Note: We track counts at the broadcast level, not per-message
                        // For per-message tracking, you'd need to store message IDs at the time of send
                    }

                    if (deliveryStatus === 'failed') {
                        console.warn(`[WHATSAPP_WEBHOOK] Message ${messageId} FAILED for ${recipient_id}`)
                    }
                }

                // --- INBOUND MESSAGES (OPT-OUTS) ---
                for (const message of value.messages || []) {
                    const fromPhone = message.from  // E.164 format
                    const messageText = message.text?.body?.trim().toUpperCase()

                    console.log(`[WHATSAPP_WEBHOOK] Inbound from ${fromPhone}: "${messageText}"`)

                    // Handle STOP keyword for opt-out
                    const STOP_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'END', 'OPTOUT', 'OPT OUT']

                    if (messageText && STOP_KEYWORDS.some(kw => messageText.includes(kw))) {
                        // Find the contact by phone number and mark as opted out
                        const { data: contact, error } = await supabase
                            .from('contacts')
                            .update({ opted_out: true })
                            .eq('phone_number', `+${fromPhone}`) // Inbound phone numbers come without the '+'
                            .select()

                        if (error) {
                            console.error('[WHATSAPP_WEBHOOK] Failed to opt-out contact:', error)
                        } else if (contact && contact.length > 0) {
                            console.log(`[WHATSAPP_WEBHOOK] Contact ${fromPhone} has opted out. Record updated.`)
                        } else {
                            // Try with exact format match
                            await supabase
                                .from('contacts')
                                .update({ opted_out: true })
                                .eq('phone_number', fromPhone)
                        }
                    }
                }
            }
        }

        // Always return 200 to Meta, otherwise it will retry
        return NextResponse.json({ received: true })

    } catch (error: any) {
        console.error('[WHATSAPP_WEBHOOK_ERROR]', error)
        // Still return 200 to prevent Meta from disabling the webhook
        return NextResponse.json({ received: true })
    }
}
