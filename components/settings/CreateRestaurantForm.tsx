'use client'

import { useFormState } from 'react-dom'
import { createRestaurant } from '@/app/actions/settings'
import SubmitButton from '@/components/settings/SubmitButton'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateRestaurantForm() {
    const [state, formAction] = useFormState(createRestaurant, { error: null, success: false })
    const router = useRouter()

    useEffect(() => {
        if (state?.success) {
            // Refresh the page so the settings page can reload with the new restaurant data
            router.refresh()
        }
    }, [state?.success])

    return (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-1">Set Up Your Restaurant</h2>
            <p className="text-sm text-gray-500 mb-6">We couldn't find a restaurant profile for your account. Please fill in the details below to get started.</p>

            <form action={formAction} className="flex flex-col gap-4 max-w-md">
                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Restaurant Name *</label>
                    <input
                        name="name"
                        required
                        placeholder="e.g. The Rustic Spoon"
                        className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Cuisine Type *</label>
                    <select
                        name="cuisine_type"
                        required
                        className="w-full rounded-md px-4 py-2 bg-white border focus:outline-none focus:border-[#FF6B35] text-gray-700"
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
                        required
                        placeholder="e.g. Dubai"
                        className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-[#1A1A1A] block mb-1">Phone Number</label>
                    <input
                        name="phone"
                        type="tel"
                        placeholder="e.g. +971 50 123 4567"
                        className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none focus:border-[#FF6B35]"
                    />
                </div>

                {state?.error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-md flex gap-2 items-start">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{state.error}</span>
                    </div>
                )}

                {state?.success && (
                    <div className="p-3 bg-green-50 text-green-700 text-sm font-medium rounded-md flex gap-2 items-center animate-in fade-in">
                        <CheckCircle2 className="w-5 h-5" />
                        Restaurant created! Refreshing...
                    </div>
                )}

                <div className="mt-2">
                    <SubmitButton />
                </div>
            </form>
        </div>
    )
}
