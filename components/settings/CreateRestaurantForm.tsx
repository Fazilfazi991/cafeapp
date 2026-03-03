'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function CreateRestaurantForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const form = e.currentTarget
        const formData = new FormData(form)

        try {
            const res = await fetch('/api/restaurants/setup', {
                method: 'POST',
                body: formData,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create restaurant')

            setSuccess(true)
            setTimeout(() => router.refresh(), 1000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-1">Set Up Your Restaurant</h2>
            <p className="text-sm text-gray-500 mb-6">We couldn't find a restaurant profile for your account. Please fill in the details below to get started.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
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

                {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-md flex gap-2 items-start">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-green-50 text-green-700 text-sm font-medium rounded-md flex gap-2 items-center animate-in fade-in">
                        <CheckCircle2 className="w-5 h-5" />
                        Restaurant created! Loading your dashboard...
                    </div>
                )}

                <div className="mt-2">
                    <button
                        type="submit"
                        disabled={loading || success}
                        className="bg-[#FF6B35] text-white rounded-md px-6 py-2.5 font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? 'Saving...' : 'Save & Continue'}
                    </button>
                </div>
            </form>
        </div>
    )
}
