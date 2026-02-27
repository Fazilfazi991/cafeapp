import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Step3() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('user_id', user.id)
        .limit(1)

    const restaurant = restaurants?.[0]

    if (!restaurant) {
        redirect('/onboarding/step-1') // kick back if they skipped steps
    }

    // Deduplicated chooseFreePlan definition

    const chooseFreePlan = async () => {
        'use server'
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
            .from('restaurants')
            .update({
                onboarding_complete: true,
                plan: 'free'
            })
            .eq('user_id', user.id)

        redirect('/dashboard')
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-foreground">
            <div className="mb-8">
                <p className="text-sm font-semibold text-[#FF6B35] mb-2">Step 3 of 3</p>
                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Connect & Subscribe</h1>
                <p className="text-gray-500">Final step! Connect your social accounts and choose a plan.</p>
            </div>

            <div className="flex flex-col gap-8">
                {/* Connections Section */}
                <div className="border rounded-xl p-6 bg-gray-50">
                    <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Integrations</h2>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black text-white rounded-md flex items-center justify-center font-bold">B</div>
                                <div>
                                    <h3 className="font-medium text-[#1A1A1A]">Buffer</h3>
                                    <p className="text-xs text-gray-500">Required for automated posting</p>
                                </div>
                            </div>
                            <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 font-medium rounded-md text-sm border cursor-not-allowed">
                                Coming Soon
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center font-bold">G</div>
                                <div>
                                    <h3 className="font-medium text-[#1A1A1A]">Google My Business</h3>
                                    <p className="text-xs text-gray-500">Boost local SEO</p>
                                </div>
                            </div>
                            <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 font-medium rounded-md text-sm border cursor-not-allowed">
                                Coming Soon
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pricing/Checkout Section */}
                <div>
                    <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Select Plan</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Free Tier Bypass */}
                        <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-[#FF6B35] transition-colors flex flex-col">
                            <h3 className="text-lg font-bold">Free</h3>
                            <div className="mt-2 mb-4">
                                <span className="text-3xl font-extrabold">$0</span>
                                <span className="text-gray-500 text-sm">/mo</span>
                            </div>
                            <ul className="text-sm text-gray-600 gap-2 flex flex-col mb-6 flex-1">
                                <li>✓ 3 AI Posts per month</li>
                                <li>✕ No AI Videos</li>
                                <li>✓ 1 Platform</li>
                                <li>✕ No GMB Posts</li>
                            </ul>
                            <form action={chooseFreePlan}>
                                <button className="w-full py-2 bg-gray-100 text-[#1A1A1A] rounded-md font-medium hover:bg-gray-200 transition-colors">
                                    Choose Free
                                </button>
                            </form>
                        </div>

                        <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-[#FF6B35] transition-colors flex flex-col">
                            <h3 className="text-lg font-bold">Starter</h3>
                            <div className="mt-2 mb-4">
                                <span className="text-3xl font-extrabold">$29</span>
                                <span className="text-gray-500 text-sm">/mo</span>
                            </div>
                            <ul className="text-sm text-gray-600 gap-2 flex flex-col mb-6 flex-1">
                                <li>✓ 20 AI Posts per month</li>
                                <li>✓ 3 AI Videos per month</li>
                                <li>✓ 2 Platforms (IG, FB)</li>
                                <li>✕ No GMB Posts</li>
                            </ul>
                            <form action="/api/stripe/checkout" method="POST">
                                <input type="hidden" name="priceId" value="price_starter" />
                                <input type="hidden" name="restaurantId" value={restaurant.id} />
                                <button className="w-full py-2 bg-white border border-[#1A1A1A] text-[#1A1A1A] rounded-md font-medium hover:bg-gray-50 transition-colors">
                                    Choose Starter
                                </button>
                            </form>
                        </div>

                        <div className="border-2 border-[#FF6B35] relative rounded-xl p-6 bg-orange-50 flex flex-col">
                            <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#FF6B35] text-white text-xs px-2 py-1 rounded-full font-bold">
                                POPULAR
                            </div>
                            <h3 className="text-lg font-bold">Pro</h3>
                            <div className="mt-2 mb-4">
                                <span className="text-3xl font-extrabold">$59</span>
                                <span className="text-gray-500 text-sm">/mo</span>
                            </div>
                            <ul className="text-sm text-gray-600 gap-2 flex flex-col mb-6 flex-1">
                                <li>✓ Unlimited AI Posts</li>
                                <li>✓ Unlimited AI Videos</li>
                                <li>✓ All Platforms included</li>
                                <li>✓ GMB SEO Posts included</li>
                            </ul>
                            <form action="/api/stripe/checkout" method="POST">
                                <input type="hidden" name="priceId" value="price_pro" />
                                <input type="hidden" name="restaurantId" value={restaurant.id} />
                                <button className="w-full py-2 bg-[#FF6B35] text-white rounded-md font-medium hover:bg-orange-600 transition-colors shadow-sm">
                                    Choose Pro
                                </button>
                            </form>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    )
}
