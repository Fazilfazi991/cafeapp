'use client'

import { useState } from 'react'
import MediaUploader from '@/components/create/MediaUploader'
import { Loader2, Wand2, Calendar, LayoutTemplate } from 'lucide-react'

type Platform = 'instagram' | 'facebook' | 'gmb'

export default function CreatePostPage() {
    const [step, setStep] = useState<1 | 2 | 3>(1)

    // Media State
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
    const [fileType, setFileType] = useState<'image' | 'video' | null>(null)
    const [error, setError] = useState<string | null>(null)

    // AI Generation State
    const [isGenerating, setIsGenerating] = useState(false)
    const [posterUrl, setPosterUrl] = useState<string | null>(null)
    const [captions, setCaptions] = useState<{ option1: string, option2: string, option3: string } | null>(null)

    // Selection State
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>('instagram')
    const [selectedCaption, setSelectedCaption] = useState<string>('')

    // Scheduling State
    const [isScheduling, setIsScheduling] = useState(false)
    const [scheduledDate, setScheduledDate] = useState<string>('')

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

                const capRes = await fetch('/api/generate/caption', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform: selectedPlatform,
                        postType: fileType,
                        extraContext: videoRes.brief
                    })
                })
                const capText = await capRes.text()
                let captionRes;
                try { captionRes = JSON.parse(capText) } catch (e) { throw new Error(capText) }
                if (!capRes.ok) throw new Error(captionRes.error || capText)

                setCaptions(captionRes.captions)
                setSelectedCaption(captionRes.captions.option1)
                setStep(3)

            } else {
                const posterPromise = fetch('/api/generate/poster', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: uploadedUrl })
                }).then(async res => {
                    const text = await res.text()
                    let data;
                    try { data = JSON.parse(text) } catch (e) { throw new Error(text) }
                    if (!res.ok) throw new Error(data.error || text)
                    return data
                })

                const captionPromise = fetch('/api/generate/caption', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ platform: selectedPlatform, postType: fileType })
                }).then(async res => {
                    const text = await res.text()
                    let data;
                    try { data = JSON.parse(text) } catch (e) { throw new Error(text) }
                    if (!res.ok) throw new Error(data.error || text)
                    return data
                })

                const [posterRes, captionRes] = await Promise.all([posterPromise, captionPromise])

                setPosterUrl(posterRes.posterUrl)
                setCaptions(captionRes.captions)
                setSelectedCaption(captionRes.captions.option1)
                setStep(3)
            }

        } catch (err: any) {
            console.error('Generate Error:', err)
            // Prevent [object Object] from showing up
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
            // Default to "now" if no date selected for MVP purposes
            const postDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 5 * 60000)

            const response = await fetch('/api/buffer/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: selectedPlatform,
                    mediaUrl: uploadedUrl,
                    posterUrl: posterUrl,
                    caption: selectedCaption,
                    scheduledAt: postDate.toISOString()
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to schedule post')
            }

            // Normally we'd redirect or show a success modal
            alert('Post scheduled successfully!')
            // Reset form
            setStep(1)
            setUploadedUrl(null)
            setPosterUrl(null)
            setCaptions(null)
            setScheduledDate('')

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
                                        <button onClick={() => { setUploadedUrl(null); setStep(1); setPosterUrl(null); setCaptions(null); }} className="text-xs text-blue-600 hover:underline">Change file</button>
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

                        <div className="mb-4">
                            <label className="text-sm font-medium mb-2 block">Optimize for Platform:</label>
                            <div className="flex gap-2">
                                {(['instagram', 'facebook', 'gmb'] as Platform[]).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedPlatform(p)}
                                        className={`px-4 py-2 text-sm font-medium rounded-md border capitalize transition-colors ${selectedPlatform === p ? 'bg-[#FF6B35] text-white border-[#FF6B35]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {p === 'gmb' ? 'Google Business' : p}
                                    </button>
                                ))}
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
                        {/* Instagram Style Header Mockup */}
                        <div className="h-14 bg-white border-b flex items-center px-4 gap-3 shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                            <div className="font-bold text-sm">Your Restaurant</div>
                        </div>

                        {/* Media Area */}
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

                        {/* Caption Area */}
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
