import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BufferTokenForm from '@/components/settings/BufferTokenForm'
import GmbLocationManager from '@/components/settings/GmbLocationManager'

export default async function SettingsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('*, brand_settings(*), connected_accounts(*)')
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
                    <h2 className="text-lg font-bold mb-4">Business Profile</h2>
                    <form action={updateProfile} className="flex flex-col gap-4 max-w-md">
                        <div>
                            <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Business Name</label>
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

                </div>

                {/* Integrations */}
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-4">Integrations</h2>

                    <div className="mb-8">
                        <h3 className="font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">🗺️ Google My Business</h3>

                        {(() => {
                            const gmbAccount = restaurant.connected_accounts?.find((a: any) => a.platform === 'gmb');

                            if (gmbAccount && gmbAccount.is_active) {
                                return (
                                    <div className="border rounded-lg p-5 bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-medium text-[#1A1A1A] text-sm">Google My Business</span>
                                                <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Connected
                                                </span>
                                            </div>
                                            <GmbLocationManager initialLocationName={gmbAccount.gmb_location_name} />
                                        </div>
                                        <form action="/api/gmb/disconnect" method="POST">
                                            <button className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-transparent hover:border-red-100">
                                                Disconnect
                                            </button>
                                        </form>
                                    </div>
                                );
                            }

                            return (
                                <div className="border rounded-lg p-5">
                                    <p className="text-sm text-gray-600 mb-4">Boost your local search ranking by posting directly to Google.</p>

                                    <form action="/api/gmb/connect">
                                        <button
                                            className="bg-[#1A1A1A] text-white border-transparent border rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors w-full sm:w-auto"
                                        >
                                            Connect Google My Business
                                        </button>
                                    </form>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="mb-4 pt-6 mt-6 border-t border-gray-100">
                        <h3 className="font-semibold text-[#1A1A1A] mb-1">Buffer Access Token</h3>
                        <p className="text-sm text-gray-500 mb-3">Paste your personal Buffer access token to enable automatic posting.</p>

                        <BufferTokenForm initialToken={restaurant.connected_accounts?.find((a: any) => a.platform === 'buffer')?.buffer_access_token || ''} />
                    </div>

                </div>

            </div>
        </div>
    )
}
