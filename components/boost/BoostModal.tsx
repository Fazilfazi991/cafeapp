'use client'

import { useState, useEffect } from 'react'
import { X, Target, Users, Globe, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Post } from '@/types'

interface BoostModalProps {
    post: Post
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    adAccountCurrency?: string
}

export default function BoostModal({ post, isOpen, onClose, onSuccess, adAccountCurrency = 'AED' }: BoostModalProps) {
    const [goal, setGoal] = useState<'ENGAGEMENT' | 'REACH' | 'VISITS'>('ENGAGEMENT')
    const [radius, setRadius] = useState<number>(5)
    const [budget, setBudget] = useState<number>(20)
    const [durationDays, setDurationDays] = useState<number>(7)
    
    // Call To Action State
    const [ctaType, setCtaType] = useState<string>('CALL_NOW')
    const defaultPhone = post.restaurants?.phone || ''
    const defaultWebsite = post.restaurants?.brand_settings?.[0]?.website_url || ''
    const [ctaValue, setCtaValue] = useState<string>(defaultPhone)

    useEffect(() => {
        if (ctaType === 'CALL_NOW') setCtaValue(defaultPhone)
        else if (['LEARN_MORE', 'ORDER_NOW', 'BOOK_NOW', 'GET_DIRECTIONS'].includes(ctaType)) setCtaValue(defaultWebsite)
        else setCtaValue('')
    }, [ctaType, defaultPhone, defaultWebsite])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const totalSpend = budget * durationDays

    const handleBoost = async () => {
        if (budget < 20 && adAccountCurrency === 'AED') {
            setError('Minimum daily budget is 20 AED')
            return
        }

        try {
            setLoading(true)
            setError(null)

            const res = await fetch('/api/boost/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: post.id,
                    goal,
                    radiusKm: radius,
                    budget,
                    durationDays,
                    ctaType,
                    ctaValue
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to boost post')
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>⚡</span> Boost Post
                        </h2>
                        <p className="text-sm text-gray-500">Reach more people locally with Meta Ads</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Settings Column */}
                        <div className="space-y-8">
                            
                            {/* GOAL */}
                            <div>
                                <h3 className="font-semibold text-sm text-gray-900 mb-3 uppercase tracking-wider">Goal</h3>
                                <div className="space-y-3">
                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${goal === 'ENGAGEMENT' ? 'border-[#FF6B35] bg-orange-50 ring-1 ring-[#FF6B35]' : 'hover:border-gray-300'}`}>
                                        <input type="radio" checked={goal === 'ENGAGEMENT'} onChange={() => setGoal('ENGAGEMENT')} className="mt-1 accent-[#FF6B35]" />
                                        <div>
                                            <div className="font-medium flex items-center gap-1.5"><Target size={16} className="text-[#FF6B35]" /> Get More Engagement</div>
                                            <p className="text-xs text-gray-500 mt-0.5">Optimize for likes, comments, and shares.</p>
                                        </div>
                                    </label>
                                    
                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${goal === 'REACH' ? 'border-[#FF6B35] bg-orange-50 ring-1 ring-[#FF6B35]' : 'hover:border-gray-300'}`}>
                                        <input type="radio" checked={goal === 'REACH'} onChange={() => setGoal('REACH')} className="mt-1 accent-[#FF6B35]" />
                                        <div>
                                            <div className="font-medium flex items-center gap-1.5"><Users size={16} className="text-[#FF6B35]" /> Reach More People</div>
                                            <p className="text-xs text-gray-500 mt-0.5">Show your ad to the maximum number of people.</p>
                                        </div>
                                    </label>

                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${goal === 'VISITS' ? 'border-[#FF6B35] bg-orange-50 ring-1 ring-[#FF6B35]' : 'hover:border-gray-300'}`}>
                                        <input type="radio" checked={goal === 'VISITS'} onChange={() => setGoal('VISITS')} className="mt-1 accent-[#FF6B35]" />
                                        <div>
                                            <div className="font-medium flex items-center gap-1.5"><Globe size={16} className="text-[#FF6B35]" /> Drive Website Visits</div>
                                            <p className="text-xs text-gray-500 mt-0.5">Send people to your restaurant's website.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* AUDIENCE */}
                            <div>
                                <h3 className="font-semibold text-sm text-gray-900 mb-3 uppercase tracking-wider">Audience</h3>
                                <div className="p-4 rounded-lg border bg-gray-50">
                                    <p className="font-medium text-sm mb-1">People near my restaurant</p>
                                    <p className="text-xs text-gray-500 mb-4">Ages 18 - 65</p>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium text-gray-600">
                                            <span>Radius</span>
                                            <span>{radius} km</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="1" max="25" step="1" 
                                            value={radius} 
                                            onChange={(e) => setRadius(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                                        />
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>1 km</span>
                                            <span>25 km</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CALL TO ACTION */}
                            <div>
                                <h3 className="font-semibold text-sm text-gray-900 mb-3 uppercase tracking-wider">Call to Action</h3>
                                <div className="space-y-4">
                                    <div>
                                        <select 
                                            value={ctaType}
                                            onChange={(e) => setCtaType(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none bg-white text-sm"
                                        >
                                            <option value="CALL_NOW">📞 Call Now (Recommended)</option>
                                            <option value="LEARN_MORE">🌐 Learn More</option>
                                            <option value="GET_DIRECTIONS">📍 Get Directions</option>
                                            <option value="ORDER_NOW">🛒 Order Now</option>
                                            <option value="SEND_MESSAGE">💬 Send Message</option>
                                            <option value="BOOK_NOW">📅 Book Now</option>
                                            <option value="NO_BUTTON">None</option>
                                        </select>
                                    </div>
                                    {['LEARN_MORE', 'ORDER_NOW', 'BOOK_NOW', 'GET_DIRECTIONS'].includes(ctaType) && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
                                            <input 
                                                type="url"
                                                value={ctaValue}
                                                onChange={(e) => setCtaValue(e.target.value)}
                                                placeholder="https://your-website.com"
                                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none text-sm transition-shadow"
                                            />
                                        </div>
                                    )}
                                    {ctaType === 'CALL_NOW' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                                            <input 
                                                type="tel"
                                                value={ctaValue}
                                                onChange={(e) => setCtaValue(e.target.value)}
                                                placeholder="+971 50 123 4567"
                                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none text-sm transition-shadow"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BUDGET & DURATION */}
                            <div>
                                <h3 className="font-semibold text-sm text-gray-900 mb-3 uppercase tracking-wider">Budget & Duration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Daily Budget</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{adAccountCurrency}</span>
                                            <input 
                                                type="number" 
                                                min="20"
                                                value={budget}
                                                onChange={(e) => setBudget(parseInt(e.target.value) || 20)}
                                                className="w-full pl-12 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none transition-shadow"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">Min. 20 {adAccountCurrency}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                                        <select 
                                            value={durationDays}
                                            onChange={(e) => setDurationDays(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none transition-shadow bg-white"
                                        >
                                            <option value={3}>3 Days</option>
                                            <option value={7}>7 Days</option>
                                            <option value={14}>14 Days</option>
                                            <option value={30}>30 Days</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Preview Column */}
                        <div className="bg-gray-50 p-6 rounded-xl border flex flex-col">
                            <h3 className="font-semibold text-sm text-gray-900 mb-3 uppercase tracking-wider">Ad Preview</h3>
                            <p className="text-xs text-gray-500 mb-4">Your ad will look like this on Facebook & Instagram</p>
                            
                            <div className="flex-1 bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
                                <div className="p-3 border-b flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                    <div>
                                        <div className="w-24 h-2.5 bg-gray-200 rounded"></div>
                                        <div className="w-16 h-2 bg-gray-100 rounded mt-1.5"></div>
                                    </div>
                                    <span className="ml-auto text-xs text-gray-400">Sponsored</span>
                                </div>
                                <div className="p-3">
                                    <p className="text-sm text-gray-800 line-clamp-3 mb-2">{post.selected_caption}</p>
                                </div>
                                <div className="w-full bg-gray-100 aspect-square relative border-t border-b">
                                    {post.poster_url ? (
                                        <img src={post.poster_url} alt="Post preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <ImageIcon size={48} />
                                        </div>
                                    )}
                                </div>
                                {ctaType !== 'NO_BUTTON' && (
                                    <div className="p-3 bg-gray-50 flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            {ctaType === 'CALL_NOW' ? 'Call Now' :
                                             ctaType === 'LEARN_MORE' ? 'Learn More' :
                                             ctaType === 'GET_DIRECTIONS' ? 'Get Directions' :
                                             ctaType === 'ORDER_NOW' ? 'Order Now' :
                                             ctaType === 'SEND_MESSAGE' ? 'Send Message' :
                                             ctaType === 'BOOK_NOW' ? 'Book Now' : 'Action'}
                                        </span>
                                        <button disabled className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-xs font-semibold">Action</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Total Ad Spend</p>
                        <p className="text-2xl font-bold flex items-baseline gap-1">
                            {totalSpend} <span className="text-sm font-medium text-gray-500">{adAccountCurrency}</span>
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-md font-medium text-gray-600 hover:bg-gray-200 transition-colors w-full sm:w-auto"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleBoost}
                            disabled={loading}
                            className="bg-[#1A1A1A] text-white px-8 py-2.5 rounded-md font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto min-w-[140px]"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Boost Now →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
