import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SubmitButton from '@/components/settings/SubmitButton'

export default async function Step2() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const saveBrandDetails = async (formData: FormData) => {
        'use server'
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Get the restaurant ID for this user
        const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const restaurant = restaurants?.[0]

        if (!restaurant) {
            redirect('/onboarding/step-1?error=Restaurant not found')
        }

        const tone_of_voice = formData.get('tone_of_voice') as string
        const primary_color = formData.get('primary_color') as string
        const logo_url = formData.get('logo_url') as string // we'll skip actual file upload for this MVP step

        try {
            // Calculate 30 day trial dates
            const now = new Date()
            const thirtyDaysFromNow = new Date()
            thirtyDaysFromNow.setDate(now.getDate() + 30)

            // 2. Update restaurant tone, mark onboarding complete, and set trial plan
            const { error: updateError } = await supabase
                .from('restaurants')
                .update({
                    tone_of_voice,
                    onboarding_complete: true,
                    plan: 'active',
                    plan_start_date: now.toISOString(),
                    plan_end_date: thirtyDaysFromNow.toISOString()
                })
                .eq('id', restaurant.id)
                
            if (updateError) console.error('[ONBOARDING_UPDATE_ERR]', updateError)

            // 3. Upsert brand settings
            const { error: insertError } = await supabase
                .from('brand_settings')
                .upsert({
                    restaurant_id: restaurant.id,
                    primary_color,
                    logo_url: logo_url || null,
                    font_style: 'modern'
                }, { onConflict: 'restaurant_id' })

            if (insertError) console.error('[ONBOARDING_INSERT_ERR]', insertError)

        } catch (err) {
            console.error('[ONBOARDING_FATAL_ERR]', err)
        }

        redirect('/dashboard')
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-foreground">
            <div className="mb-8">
                <p className="text-sm font-semibold text-[#FF6B35] mb-2">Step 2 of 2</p>
                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Brand & Tone</h1>
                <p className="text-gray-500">How do you want your AI generated posts to look and sound?</p>
            </div>

            <form action={saveBrandDetails} className="flex flex-col gap-6">
                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-2">Caption Tone of Voice *</label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'casual', label: 'Casual', desc: 'Friendly, like talking to a neighbor.' },
                            { id: 'fun', label: 'Fun', desc: 'Upbeat, lots of emojis and energy.' },
                            { id: 'professional', label: 'Professional', desc: 'Clean, polished, informative.' },
                            { id: 'bold', label: 'Bold', desc: 'Confident, edgy, appetite-inducing.' }
                        ].map(tone => (
                            <label key={tone.id} className="cursor-pointer">
                                <input type="radio" name="tone_of_voice" value={tone.id} required className="peer sr-only" />
                                <div className="border rounded-lg p-4 peer-checked:border-[#FF6B35] peer-checked:ring-1 peer-checked:ring-[#FF6B35] peer-checked:bg-orange-50 transition-all hover:bg-gray-50">
                                    <div className="font-semibold text-[#1A1A1A] mb-1">{tone.label}</div>
                                    <div className="text-xs text-gray-500">{tone.desc}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-2">Primary Brand Color *</label>
                    <p className="text-xs text-gray-500 mb-3">Used for auto-generated poster overlays.</p>
                    <div className="flex gap-4 items-center">
                        <input
                            name="primary_color"
                            type="color"
                            defaultValue="#FF6B35"
                            required
                            className="w-16 h-16 p-1 rounded border cursor-pointer"
                        />
                        <span className="text-sm text-gray-600">Pick a color that matches your logo.</span>
                    </div>
                </div>

                <SubmitButton 
                    text="Complete Setup & Go to Dashboard"
                    loadingText="Completing Setup..."
                    className="bg-[#1A1A1A] text-white rounded-md px-4 py-3 mt-4 font-medium hover:bg-gray-800 transition-colors w-full flex items-center justify-center gap-2 disabled:opacity-70"
                />
            </form>
        </div>
    )
}
