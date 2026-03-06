import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ContactsPage from '@/components/contacts/ContactsPage'

export const dynamic = 'force-dynamic'

export default async function Page() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

    const restaurant = restaurants?.[0]

    if (!restaurant) {
        redirect('/dashboard/settings')
    }

    return <ContactsPage restaurantId={restaurant.id} />
}
