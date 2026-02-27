import { createClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
    const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!stripeSecret) {
        return new Response('Webhook secret missing', { status: 400 })
    }

    const payload = await req.text()
    const sig = req.headers.get('stripe-signature') || ''

    // This requires the Stripe library, so we will stub it gracefully if the user doesn't have stripe keys.
    try {
        const Stripe = require('stripe').default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2024-04-10',
        });

        const event = stripe.webhooks.constructEvent(payload, sig, stripeSecret)

        // Handle successful checkout
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const restaurantId = session.metadata?.restaurantId

            if (restaurantId) {
                const supabase = createClient()
                // Finalize server-to-server confirmation
                await supabase
                    .from('restaurants')
                    .update({
                        onboarding_complete: true,
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: session.subscription,
                        plan: 'starter' // Map your Stripe Price IDs to the plan enum string
                    })
                    .eq('id', restaurantId)
            }
        }

        return new Response('OK', { status: 200 })
    } catch (err: any) {
        console.error('Webhook signature verification failed.', err.message)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
}
