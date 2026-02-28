import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2024-04-10', // specify expected API version
})

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const priceId = formData.get('priceId') as string
        const restaurantId = formData.get('restaurantId') as string

        if (!priceId || !restaurantId) {
            return new NextResponse('Missing parameters', { status: 400 })
        }

        // Since we don't have real products setup in the Stripe dashboard yet,
        // this will fail if the priceId doesn't actually exist in the user's Stripe account.
        // For local dev, you would create a product/price in the Stripe Dashboard and 
        // put that real ID in the form, OR use Stripe CLI to test webhooks.

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId, // e.g. price_1Nhxxxxxxxxxxxx depending on your Stripe dashboard
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/step-3`,
            metadata: {
                restaurantId,
            },
        })

        if (!session.url) {
            return new NextResponse('Failed to create session', { status: 500 })
        }

        return NextResponse.redirect(session.url, 303)
    } catch (error: any) {
        console.error('Stripe error:', error)
        return new NextResponse(error.message, { status: 500 })
    }
}
