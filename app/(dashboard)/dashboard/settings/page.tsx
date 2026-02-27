import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BufferTokenForm from '@/components/settings/BufferTokenForm'

export default async function SettingsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('*, brand_settings(*)')
        .eq('user_id', user.id)
        .limit(1)

    const restaurant = restaurants?.[0]

    if (!restaurant) return null

    const updateProfile = async (formData: FormData) => {
        'use server'
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const name = formData.get('name') as string
        const website = formData.get('website') as string

        await supabase
            .from('restaurants')
            .update({ name, website })
            .eq('user_id', user.id)

        // Normally would trigger a revalidatePath here, but simple redirect for now
        redirect('/dashboard/settings')
    }

    // Removed Buffer Server Action - Now using Client Component

    return (
        <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            <div className="flex flex-col gap-8">

                {/* Profile Settings */}
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-4">Restaurant Profile</h2>
                    <form action={updateProfile} className="flex flex-col gap-4 max-w-md">
                        <div>
                            <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Restaurant Name</label>
                            <input
                                name="name"
                                defaultValue={restaurant.name}
                                required
                                className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Website</label>
                            <input
                                name="website"
                                defaultValue={restaurant.website || ''}
                                className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                            />
                        </div>
                        <button className="bg-[#1A1A1A] text-white rounded-md px-4 py-2 mt-2 font-medium hover:bg-gray-800 transition-colors w-fit">
                            Save Changes
                        </button>
                    </form>
                </div>

                {/* Billing Overview */}
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-4">Billing & Plan</h2>

                    <div className="flex items-center justify-between border rounded-lg p-4 bg-gray-50 mb-6">
                        <div>
                            <p className="font-semibold text-[#1A1A1A] capitalize">{restaurant.plan} Plan</p>
                            <p className="text-sm text-gray-500">You are currently using {restaurant.posts_used_this_month} of {restaurant.plan === 'free' ? 3 : restaurant.plan === 'starter' ? 20 : 'unlimited'} monthly posts.</p>
                        </div>

                        {restaurant.plan === 'free' && (
                            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Current</span>
                        )}
                    </div>

                    <form action="/api/stripe/portal" method="POST">
                        <button disabled className="bg-gray-100 text-gray-400 cursor-not-allowed border rounded-md px-4 py-2 font-medium hover:bg-gray-200 transition-colors">
                            Manage Billing (Coming Soon)
                        </button>
                    </form>

                </div>

                {/* Integrations */}
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-4">Integrations</h2>

                    <div className="mb-4">
                        <h3 className="font-semibold text-[#1A1A1A] mb-1">Buffer Access Token</h3>
                        <p className="text-sm text-gray-500 mb-3">Paste your personal Buffer access token to enable automatic posting.</p>

                        <BufferTokenForm initialToken={restaurant.connected_accounts?.find((a: any) => a.platform === 'buffer')?.buffer_access_token || ''} />
                    </div>

                </div>

            </div>
        </div>
    )
}
