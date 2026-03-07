'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, ChevronDown } from 'lucide-react'

type AdAccount = {
    id: string;
    account_id: string;
    name: string;
    currency: string;
}

export default function AdAccountSelector({ 
    initialAccountId, 
    initialAccountName, 
    initialAccountCurrency,
    adAccountsJson = []
}: { 
    initialAccountId: string | null;
    initialAccountName: string | null;
    initialAccountCurrency: string | null;
    adAccountsJson: AdAccount[];
}) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(!initialAccountId)
    const [loading, setLoading] = useState(false)
    const [selectedId, setSelectedId] = useState(initialAccountId || (adAccountsJson.length > 0 ? adAccountsJson[0].id : ''))

    const handleSave = async () => {
        const account = adAccountsJson.find(a => a.id === selectedId)
        if (!account) return

        try {
            setLoading(true)
            const res = await fetch('/api/meta/select-ad-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adAccountId: account.id,
                    adAccountName: account.name,
                    adAccountCurrency: account.currency
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to update ad account')
            }

            setIsEditing(false)
            router.refresh()
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isEditing && initialAccountId) {
        return (
            <div>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                    {initialAccountName} <span className="text-gray-500 font-normal">({initialAccountCurrency})</span>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-[#FF6B35] hover:text-[#e85a25] font-semibold underline px-1"
                    >
                        Change
                    </button>
                </p>
            </div>
        )
    }

    if (adAccountsJson.length === 0) {
        return <p className="text-sm text-red-500 font-medium mt-1">No ad accounts found on this Facebook profile.</p>
    }

    return (
        <div className="mt-2 text-sm flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1 max-w-xs text-black">
                <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    disabled={loading}
                    className="w-full appearance-none bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#FF6B35] focus:border-[#FF6B35] block px-3 py-2 pr-8"
                >
                    <option value="" disabled>Select Ad Account</option>
                    {adAccountsJson.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.currency})
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ChevronDown size={16} />
                </div>
            </div>
            
            <button
                onClick={handleSave}
                disabled={loading || !selectedId}
                className="bg-[#1A1A1A] text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
            </button>
            {initialAccountId && (
                <button
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                    className="text-gray-500 hover:text-gray-700 px-2 py-2 font-medium"
                >
                    Cancel
                </button>
            )}
        </div>
    )
}
