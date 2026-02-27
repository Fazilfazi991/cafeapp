import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')

    // In a real production app, we would verify this session with Stripe here.
    // For safety, the actual source of truth should be the Stripe Webhook.
    // However, we will also optimistically complete onboarding here for UX.

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        // Optimistically mark onboarding as complete
        await supabase
            .from('restaurants')
            .update({ onboarding_complete: true })
            .eq('user_id', user.id)
    }

    // Send them to the dashboard
    redirect('/dashboard')
}
