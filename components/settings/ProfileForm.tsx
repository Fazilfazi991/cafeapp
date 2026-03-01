'use client'

import { useFormState } from 'react-dom'
import { updateProfile } from '@/app/actions/settings'
import SubmitButton from '@/components/settings/SubmitButton'
import LogoUploader from '@/components/settings/LogoUploader'
import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function ProfileForm({ restaurant }: { restaurant: any }) {
    const [state, formAction] = useFormState(updateProfile, { error: null, success: false })
    const [showSuccess, setShowSuccess] = useState(false)

    useEffect(() => {
        if (state?.success) {
            setShowSuccess(true)
            const t = setTimeout(() => setShowSuccess(false), 3000)
            return () => clearTimeout(t)
        }
    }, [state?.success])

    return (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Business Profile</h2>
            <form action={formAction} className="flex flex-col gap-4 max-w-md">
                <input type="hidden" name="user_id" value={restaurant.user_id} />
                <input type="hidden" name="restaurant_id" value={restaurant.id} />

                <LogoUploader
                    defaultValue={restaurant.brand_settings?.[0]?.logo_url}
                    restaurantId={restaurant.id}
                />

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

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Phone Number</label>
                    <input
                        name="phone"
                        defaultValue={restaurant.phone || ''}
                        placeholder="(555) 123-4567"
                        className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Used on your AI generated posters.</p>
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Email Address</label>
                    <input
                        name="email"
                        type="email"
                        defaultValue={restaurant.email || ''}
                        placeholder="hello@yourbusiness.com"
                        className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Used on your AI generated posters.</p>
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Business Address</label>
                    <textarea
                        name="address"
                        defaultValue={restaurant.address || ''}
                        placeholder="123 Main St, City, ST 12345"
                        rows={2}
                        className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35] resize-none"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Used to provide local context to AI captions.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Business Type</label>
                        <select
                            name="business_type"
                            defaultValue={restaurant.business_type || 'restaurant'}
                            className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                        >
                            <option value="restaurant">Restaurant / Cafe</option>
                            <option value="salon">Salon / Spa</option>
                            <option value="gym">Gym / Fitness</option>
                            <option value="retail">Retail Store</option>
                            <option value="real_estate">Real Estate</option>
                            <option value="medical">Medical / Clinic</option>
                            <option value="education">Education</option>
                            <option value="other">Other Business</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Font Style</label>
                        <select
                            name="font_style"
                            defaultValue={restaurant.brand_settings?.[0]?.font_style || 'modern'}
                            className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                        >
                            <option value="modern">Modern (Sans-serif)</option>
                            <option value="classic">Classic (Serif)</option>
                            <option value="playful">Playful (Rounded)</option>
                            <option value="elegant">Elegant (Script)</option>
                        </select>
                    </div>
                </div>

                {state?.error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-md flex gap-2 items-start mt-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="grow break-all">{state.error}</span>
                    </div>
                )}

                {showSuccess && (
                    <div className="p-3 bg-green-50 text-green-700 text-sm font-medium rounded-md flex gap-2 items-center mt-2 animate-in fade-in">
                        <CheckCircle2 className="w-5 h-5" />
                        Settings saved successfully!
                    </div>
                )}

                <div className="mt-2">
                    <SubmitButton />
                </div>
            </form>
        </div>
    )
}
