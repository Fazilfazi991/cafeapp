'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, ChevronDown } from 'lucide-react'

interface Page {
    id: string
    name: string
    meta_ig_id?: string | null
}

interface MetaPageSelectorProps {
    currentPageId: string | null
    currentPageName?: string | null
}

export default function MetaPageSelector({ currentPageId, currentPageName }: MetaPageSelectorProps) {
    const [pages, setPages] = useState<Page[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(currentPageId)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savedName, setSavedName] = useState<string | null>(currentPageName || null)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetch('/api/meta/pages')
            .then(r => r.json())
            .then(data => {
                setPages(data.pages || [])
                setSelectedId(data.selectedPageId || currentPageId)
            })
            .catch(() => setError('Could not load Facebook pages.'))
            .finally(() => setLoading(false))
    }, [])

    const handleSelect = async (pageId: string) => {
        setSelectedId(pageId)
        setSaving(true)
        setSaved(false)
        setError(null)

        try {
            const res = await fetch('/api/meta/select-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSavedName(data.pageName)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-3">
                <Loader2 size={14} className="animate-spin" />
                Loading your Facebook Pages...
            </div>
        )
    }

    if (pages.length === 0) {
        return (
            <p className="text-sm text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                No Facebook Pages found. Please reconnect Meta and make sure to grant access to your page.
            </p>
        )
    }

    if (pages.length === 1) {
        // Only one page — no choice to make, just confirm which one is active
        const page = pages[0]
        return (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                <span>Posting as <strong>{savedName || page.name}</strong>{page.meta_ig_id && ' + connected Instagram'}</span>
            </div>
        )
    }

    return (
        <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Post to Facebook Page:</label>
            <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                    <select
                        value={selectedId || ''}
                        onChange={e => handleSelect(e.target.value)}
                        disabled={saving}
                        className="w-full appearance-none border rounded-lg px-3 py-2 pr-8 text-sm bg-white focus:outline-none focus:border-[#FF6B35] disabled:opacity-50"
                    >
                        {pages.map((page) => (
                            <option key={page.id} value={page.id}>
                                {page.name}{page.meta_ig_id ? ' + Instagram' : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {saving && <Loader2 size={16} className="animate-spin text-gray-400 shrink-0" />}
                {saved && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
            </div>

            {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
            {saved && <p className="text-xs text-green-600 mt-1.5">✓ Now posting to <strong>{savedName}</strong></p>}
        </div>
    )
}
