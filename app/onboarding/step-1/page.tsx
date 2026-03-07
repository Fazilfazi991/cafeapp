import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SubmitButton from '@/components/settings/SubmitButton'

export default async function Step1() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const saveRestaurantDetails = async (formData: FormData) => {
        'use server'
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const name = formData.get('name') as string
        const cuisine_type = formData.get('cuisine_type') as string
        const city = formData.get('city') as string
        const branches = formData.get('branches') as string
        const website = formData.get('website') as string
        const phone = formData.get('phone') as string

        // Check if restaurant already exists to prevent duplicates on double-clicks
        const { data: existingRestaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

        let error = null;

        if (existingRestaurant) {
            const { error: updateError } = await supabase
                .from('restaurants')
                .update({
                    name,
                    cuisine_type,
                    city,
                    website: website || null,
                    phone: phone || null,
                })
                .eq('id', existingRestaurant.id)
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('restaurants')
                .insert({
                    user_id: user.id,
                    name,
                    business_type: 'restaurant',
                    cuisine_type,
                    city,
                    website: website || null,
                    phone: phone || null,
                })
            error = insertError;
        }

        if (error) {
            console.error('[ONBOARDING_STEP1_ERROR]', {
                error,
                existingRestaurant,
                user: user.id
            })
            redirect(`/onboarding/step-1?error=${encodeURIComponent(error.message || 'Could not save details')}`)
        }

        console.log('[ONBOARDING_STEP1_SUCCESS]', { user: user.id, action: existingRestaurant ? 'UPDATE' : 'INSERT' })

        redirect('/onboarding/step-2')
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-foreground">
            <div className="mb-8">
                <p className="text-sm font-semibold text-[#FF6B35] mb-2">Step 1 of 3</p>
                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Tell us about your restaurant</h1>
                <p className="text-gray-500">We'll use this to optimize your social media content.</p>
            </div>

            <form action={saveRestaurantDetails} className="flex flex-col gap-5">
                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Restaurant Name *</label>
                    <input
                        name="name"
                        placeholder="e.g. The Rustic Spoon"
                        required
                        className="w-full rounded-md px-4 py-3 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Cuisine Type *</label>
                    <select
                        name="cuisine_type"
                        required
                        className="w-full rounded-md px-4 py-3 bg-white border focus:outline-none focus:border-[#FF6B35] text-gray-700"
                    >
                        <option value="">Select a cuisine...</option>
                        <option value="Arabic">Arabic</option>
                        <option value="Indian">Indian</option>
                        <option value="Asian">Asian</option>
                        <option value="American">American</option>
                        <option value="Italian">Italian</option>
                        <option value="Mediterranean">Mediterranean</option>
                        <option value="Fast Food">Fast Food</option>
                        <option value="Cafe & Bakery">Cafe & Bakery</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">City *</label>
                    <input
                        name="city"
                        placeholder="e.g. Austin, TX"
                        required
                        className="w-full rounded-md px-4 py-3 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Number of branches *</label>
                    <select
                        name="branches"
                        required
                        className="w-full rounded-md px-4 py-3 bg-white border focus:outline-none focus:border-[#FF6B35] text-gray-700"
                    >
                        <option value="">Select branches...</option>
                        <option value="1">1</option>
                        <option value="2-5">2-5</option>
                        <option value="5+">5+</option>
                    </select>
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Website (Optional)</label>
                    <input
                        name="website"
                        type="url"
                        placeholder="https://..."
                        className="w-full rounded-md px-4 py-3 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Phone number *</label>
                    <input
                        name="phone"
                        type="tel"
                        required
                        placeholder="e.g. +1 234 567 8900"
                        className="w-full rounded-md px-4 py-3 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                </div>

                <SubmitButton 
                    text="Continue"
                    loadingText="Saving..."
                    className="bg-[#1A1A1A] text-white rounded-md px-4 py-3 mt-4 font-medium hover:bg-gray-800 transition-colors w-full flex items-center justify-center gap-2 disabled:opacity-70"
                />
            </form>
        </div>
    )
}
