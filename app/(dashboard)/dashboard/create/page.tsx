'use client'

import { useState, useEffect } from 'react'
import MediaUploader from '@/components/create/MediaUploader'
import { Loader2, Wand2, Calendar, LayoutTemplate, Info } from 'lucide-react'

type Platform = 'instagram' | 'facebook' | 'gmb'

export default function CreatePostPage() {
    const [step, setStep] = useState<1 | 2 | 3>(1)

    const [restaurantInfo, setRestaurantInfo] = useState<any>(null)

    useEffect(() => {
        fetch('/api/restaurants/me').then(r => r.json()).then(data => {
            if (!data.error) setRestaurantInfo(data)
        })
    }, [])

    // Media State
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
    const [fileType, setFileType] = useState<'image' | 'video' | null>(null)
    const [error, setError] = useState<string | null>(null)

    // AI Generation State
    const [isGenerating, setIsGenerating] = useState(false)
    const [posterUrl, setPosterUrl] = useState<string | null>(null)
    const [captions, setCaptions] = useState<{ option1: string, option2: string, option3: string } | null>(null)
    const [gmbCaption, setGmbCaption] = useState<string | null>(null)

    // Selection State
    const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram'])
    const [selectedCaption, setSelectedCaption] = useState<string>('')

    // Scheduling State
    const [isScheduling, setIsScheduling] = useState(false)
    const [scheduledDate, setScheduledDate] = useState<string>('')

    const handleTogglePlatform = (p: Platform) => {
        if (p === 'gmb') {
            const canAccess = restaurantInfo?.plan === 'pro' || restaurantInfo?.plan === 'business';
            if (!canAccess) return; // Disallow selection
        }

        setSelectedPlatforms(prev => {
            if (prev.includes(p)) {
                if (prev.length === 1) return prev; // Keep at least one
                return prev.filter(x => x !== p)
            }
            return [...prev, p]
        })
    }

    const handleUploadComplete = async (url: string, type: 'image' | 'video', name: string) => {
        setUploadedUrl(url)
        setFileType(type)
        setError(null)
        setStep(2)
    }

    const generateAIContent = async () => {
        if (!uploadedUrl) return
        setIsGenerating(true)
        setError(null)

        try {
            const primaryPlatform = selectedPlatforms.find(p => p !== 'gmb') || 'instagram'
            const hasGMB = selectedPlatforms.includes('gmb')

            let videoBrief = ''
            if (fileType === 'video') {
                const res = await fetch('/api/generate/video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoUrl: uploadedUrl })
                })
                const text = await res.text()
                let videoRes;
                try { videoRes = JSON.parse(text) } catch (e) { throw new Error(text) }
                if (!res.ok) throw new Error(videoRes.error || text)
                videoBrief = videoRes.brief
            } else {
                const res = await fetch('/api/generate/poster', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: uploadedUrl })
                })
                const text = await res.text()
                let data;
                try { data = JSON.parse(text) } catch (e) { throw new Error(text) }
                if (!res.ok) throw new Error(data.error || text)
                setPosterUrl(data.posterUrl)
            }

            const capRes = await fetch('/api/generate/caption', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: primaryPlatform,
                    postType: fileType,
                    extraContext: videoBrief
                })
            })
            const capText = await capRes.text()
            let captionRes;
            try { captionRes = JSON.parse(capText) } catch (e) { throw new Error(capText) }
            if (!capRes.ok) throw new Error(captionRes.error || capText)

            setCaptions(captionRes.captions)
            setSelectedCaption(captionRes.captions.option1)

            if (hasGMB) {
                const gmbRes = await fetch('/api/generate/caption', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform: 'gmb',
                        postType: fileType,
                        extraContext: videoBrief
                    })
                })
                const gmbText = await gmbRes.text()
                let gmbCaptionRes;
                try { gmbCaptionRes = JSON.parse(gmbText) } catch (e) { throw new Error(gmbText) }
                if (gmbRes.ok && gmbCaptionRes.captions) {
                    setGmbCaption(gmbCaptionRes.captions.option1)
                }
            } else {
                setGmbCaption(null)
            }

            setStep(3)

        } catch (err: any) {
            console.error('Generate Error:', err)
            let errMsg = err?.message || err;
            if (typeof errMsg === 'object') {
                errMsg = JSON.stringify(errMsg);
            }
            setError(String(errMsg))
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSchedule = async () => {
        if (!uploadedUrl || !selectedCaption) return
        setIsScheduling(true)
        setError(null)

        try {
            const postDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 5 * 60000)

            for (const platform of selectedPlatforms) {
                if (platform === 'gmb') {
                    const response = await fetch('/api/gmb/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imageUrl: posterUrl || uploadedUrl,
                            caption: gmbCaption || selectedCaption,
                            scheduledTime: postDate.toISOString()
                        })
                    })
                    const data = await response.json()
                    if (!response.ok) throw new Error(`[GMB] ${data.error || 'Failed to schedule post'}`)
                } else {
                    const response = await fetch('/api/buffer/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            platform: platform,
                            mediaUrl: uploadedUrl,
                            posterUrl: posterUrl,
                            caption: selectedCaption,
                            scheduledAt: postDate.toISOString()
                        })
                    })
                    const data = await response.json()
                    if (!response.ok) throw new Error(`[${platform}] ${data.error || 'Failed to schedule post'}`)
                }
            }

            alert('Posts scheduled successfully!')
            setStep(1)
            setUploadedUrl(null)
            setPosterUrl(null)
            setCaptions(null)
            setGmbCaption(null)
            setScheduledDate('')
            setSelectedPlatforms(['instagram'])

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Failed to schedule post.')
        } finally {
            setIsScheduling(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Create New Post</h1>
                <p className="text-gray-500">Upload a photo or video and let AI handle the rest.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Workflow */}
                <div className="flex flex-col gap-6">

                    {/* Step 1: Media */}
                    <div className={`bg-white rounded-xl border p-6 shadow-sm transition-opacity ${step !== 1 && 'opacity-50'}`}>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center">1</span>
                            Upload Media
                        </h2>

                        {error && <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>}

                        {!uploadedUrl ? (
                            <MediaUploader
                                onUploadComplete={handleUploadComplete}
                                onUploadError={setError}
                            />
                        ) : (
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-200 rounded border overflow-hidden">
                                        {fileType === 'image' ? (
                                            <img src={uploadedUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <video src={uploadedUrl} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Media uploaded successfully</p>
                                        <button onClick={() => { setUploadedUrl(null); setStep(1); setPosterUrl(null); setCaptions(null); setGmbCaption(null); }} className="text-xs text-blue-600 hover:underline">Change file</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Generation config */}
                    <div className={`bg-white rounded-xl border p-6 shadow-sm transition-opacity ${step < 2 && 'opacity-50 pointer-events-none'}`}>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center">2</span>
                            AI Generation
                        </h2>

                        <div className="mb-6">
                            <label className="text-sm font-medium mb-3 block">Select Platforms:</label>
                            <div className="flex flex-wrap gap-3">
                                {(['instagram', 'facebook', 'gmb'] as Platform[]).map(p => {
                                    const isSelected = selectedPlatforms.includes(p);
                                    let isDisabled = false;
                                    let tooltip = '';

                                    if (p === 'gmb') {
                                        const canAccessGMB = restaurantInfo?.plan === 'pro' || restaurantInfo?.plan === 'business';
                                        if (!canAccessGMB) {
                                            isDisabled = true;
                                            tooltip = "Upgrade to Pro to post to GMB";
                                        }
                                    }

                                    return (
                                        <div key={p} className="relative group flex-1 min-w-[120px]">
                                            <button
                                                onClick={() => handleTogglePlatform(p)}
                                                disabled={isDisabled}
                                                className={`w-full px-4 py-3 text-sm font-semibold rounded-lg border capitalize transition-all ${isSelected
                                                        ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-md'
                                                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                                                    } ${isDisabled
                                                        ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                                        : ''
                                                    }`}
                                            >
                                                {p === 'gmb' ? 'Google My Business' : p}
                                            </button>

                                            {tooltip && (
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 flex items-center gap-1 shadow-lg">
                                                    <Info size={14} className="text-orange-400" />
                                                    {tooltip}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            onClick={generateAIContent}
                            disabled={isGenerating || step === 3}
                            className="w-full py-3 bg-[#1A1A1A] text-white rounded-md font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                            {isGenerating ? (
                                <><Loader2 className="animate-spin" size={18} /> Generating Magic...</>
                            ) : (
                                <><Wand2 size={18} /> Generate Poster & Captions</>
                            )}
                        </button>
                    </div>

                    {/* Step 3: Caption Selection */}
                    {captions && step === 3 && (
                        <div className="bg-white rounded-xl border p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center">3</span>
                                Choose Caption
                            </h2>
                            <div className="flex flex-col gap-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">Primary Platform Caption:</p>
                                {[captions.option1, captions.option2, captions.option3].map((opt, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedCaption(opt)}
                                        className={`p-4 border rounded-lg cursor-pointer transition-colors text-sm ${selectedCaption === opt ? 'border-[#FF6B35] bg-orange-50 ring-1 ring-[#FF6B35]' : 'hover:bg-gray-50'}`}
                                    >
                                        {opt}
                                    </div>
                                ))}
                            </div>

                            {selectedPlatforms.includes('gmb') && gmbCaption && (
                                <div className="mt-6 pt-6 border-t">
                                    <div className="flex items-center gap-2 mb-3">
                                        <p className="text-sm font-medium text-gray-700">Google My Business Caption:</p>
                                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Auto-optimized</span>
                                    </div>
                                    <div className="p-4 border rounded-lg bg-gray-50 text-sm ring-1 ring-gray-200">
                                        {gmbCaption}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">This dedicated short caption will be used when posting to Google.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Right Column: Live Preview */}
                <div className="bg-white rounded-xl border p-6 shadow-sm h-[800px] flex flex-col sticky top-8">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <LayoutTemplate size={20} className="text-gray-400" />
                        Live Preview
                    </h2>

                    <div className="flex-1 bg-gray-50 rounded-xl overflow-hidden border flex flex-col relative max-w-[400px] mx-auto w-full shadow-inner">
                        <div className="h-14 bg-white border-b flex items-center px-4 gap-3 shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                            <div className="font-bold text-sm">Your Restaurant</div>
                        </div>

                        <div className="aspect-square bg-gray-100 flex items-center justify-center shrink-0 w-full overflow-hidden border-b relative">
                            {isGenerating ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 gap-3">
                                    <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
                                    <span className="text-sm font-medium animate-pulse">Rendering fal.ai poster...</span>
                                </div>
                            ) : posterUrl ? (
                                <img src={posterUrl} className="w-full h-full object-cover" />
                            ) : uploadedUrl ? (
                                <div className="w-full h-full relative group">
                                    <img src={uploadedUrl} className="w-full h-full object-cover blur-sm opacity-50" />
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-500 uppercase tracking-widest text-sm">Original Photo</div>
                                </div>
                            ) : (
                                <span className="text-gray-400 font-medium">No media uploaded</span>
                            )}
                        </div>

                        <div className="p-4 bg-white flex-1 overflow-y-auto">
                            {isGenerating ? (
                                <div className="space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                                    <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                                    <div className="h-3 bg-gray-200 rounded w-4/6 animate-pulse"></div>
                                </div>
                            ) : selectedCaption ? (
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedCaption}</p>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Caption preview will appear here...</p>
                            )}
                        </div>
                    </div>

                    {/* Actions Footer */}
                    {step === 3 && (
                        <div className="mt-6 pt-6 border-t flex flex-col gap-4 animate-in fade-in">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-700">Schedule Time (Optional)</label>
                                <input
                                    type="datetime-local"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#FF6B35]"
                                />
                                <p className="text-xs text-gray-500">Leave blank to schedule for 5 minutes from now.</p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    disabled={isScheduling}
                                    className="flex-1 py-3 px-4 bg-gray-100 text-[#1A1A1A] rounded-md font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Save Draft
                                </button>
                                <button
                                    onClick={handleSchedule}
                                    disabled={isScheduling}
                                    className="flex-1 py-3 px-4 bg-[#FF6B35] text-white rounded-md font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {isScheduling ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
                                    {isScheduling ? 'Scheduling...' : 'Schedule'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
