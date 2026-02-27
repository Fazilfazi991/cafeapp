'use client'

import { useState } from 'react'

export default function BufferTokenForm({ initialToken }: { initialToken: string }) {
    const [token, setToken] = useState(initialToken)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage(null)

        try {
            const res = await fetch('/api/settings/buffer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to save token')
            }

            setMessage({ type: 'success', text: 'Token saved successfully!' })
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <form onSubmit={handleSave} className="flex flex-col gap-3 max-w-lg">
            {message && (
                <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}
            <input
                type="password"
                placeholder="Paste your Buffer token here..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="w-full rounded-md px-4 py-2 bg-inherit border focus:outline-none text-sm focus:border-[#FF6B35]"
            />
            <button
                type="submit"
                disabled={isSaving}
                className="bg-[#1A1A1A] text-white rounded-md px-4 py-2 font-medium hover:bg-gray-800 transition-colors w-fit disabled:opacity-50"
            >
                {isSaving ? 'Saving...' : 'Save Token'}
            </button>
        </form>
    )
}
