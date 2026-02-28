import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

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
        const business_type = formData.get('business_type') as string
        const cuisine_type = formData.get('cuisine_type') as string
        const city = formData.get('city') as string
        const website = formData.get('website') as string

        const { error } = await supabase
            .from('restaurants')
            .insert({
                user_id: user.id,
                name,
                business_type,
                cuisine_type,
                city,
                website: website || null,
            })

        if (error) {
            console.error(error)
            redirect('/onboarding/step-1?error=Could not save details')
        }

        redirect('/onboarding/step-2')
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-foreground">
            <div className="mb-8">
                <p className="text-sm font-semibold text-[#FF6B35] mb-2">Step 1 of 3</p>
                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Tell us about your business</h1>
                <p className="text-gray-500">We'll use this to optimize your social media content.</p>
            </div>

            <form action={saveRestaurantDetails} className="flex flex-col gap-5">
                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Business Name *</label>
                    <input
                        name="name"
                        placeholder="e.g. The Rustic Spoon"
                        required
                        className="w-full rounded-md px-4 py-3 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Business Type *</label>
                    <select
                        name="business_type"
                        required
                        className="w-full rounded-md px-4 py-3 bg-white border focus:outline-none focus:border-[#FF6B35] text-gray-700"
                    >
                        <option value="">Select a type...</option>
                        <option value="Restaurant">Restaurant</option>
                        <option value="Cafe">Cafe</option>
                        <option value="Retail">Retail</option>
                        <option value="Salon & Spa">Salon & Spa</option>
                        <option value="Gym & Fitness">Gym & Fitness</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Medical & Clinic">Medical & Clinic</option>
                        <option value="Education">Education</option>
                        <option value="Hotel">Hotel</option>
                        <option value="Automotive">Automotive</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Cuisine / Sub-Type (Optional)</label>
                    <select
                        name="cuisine_type"
                        className="w-full rounded-md px-4 py-3 bg-white border focus:outline-none focus:border-[#FF6B35] text-gray-700"
                    >
                        <option value="">Select a cuisine...</option>
                        <option value="Italian">Italian</option>
                        <option value="American">American</option>
                        <option value="Mexican">Mexican</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Cafe/Bakery">Cafe / Bakery</option>
                        <option value="Fast Food">Fast Food</option>
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
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Website (Optional)</label>
                    <input
                        name="website"
                        type="url"
                        placeholder="https://..."
                        className="w-full rounded-md px-4 py-3 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                </div>

                <button className="bg-[#1A1A1A] text-white rounded-md px-4 py-3 mt-4 font-medium hover:bg-gray-800 transition-colors w-full">
                    Continue
                </button>
            </form>
        </div>
    )
}
