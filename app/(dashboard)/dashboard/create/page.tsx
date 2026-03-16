'use client'

import { useState, useEffect } from 'react'
import MediaUploader from '@/components/create/MediaUploader'
import { createClient } from '@/lib/supabase'
import { Loader2, Wand2, Calendar, LayoutTemplate, Info } from 'lucide-react'

type Platform = 'instagram' | 'facebook' | 'gmb' | 'whatsapp'

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
    const [generationProgress, setGenerationProgress] = useState<string>('')
    const [posters, setPosters] = useState<{ minimal: string, bold: string, lifestyle: string } | null>(null)
    const [selectedStyle, setSelectedStyle] = useState<'minimal' | 'bold' | 'lifestyle'>('minimal')
    const [captions, setCaptions] = useState<{ option1: string, option2: string, option3: string } | null>(null)
    const [gmbCaption, setGmbCaption] = useState<string | null>(null)

    // Selection State
    const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram'])
    const [selectedCaption, setSelectedCaption] = useState<string>('')
    const [contentType, setContentType] = useState<string>('Promotional Post')
    const [customText, setCustomText] = useState<string>('')
    const [offerText, setOfferText] = useState<string>('')
    const [dishName, setDishName] = useState('')

    // Results state
    const [isScheduling, setIsScheduling] = useState(false)
    const [scheduledDate, setScheduledDate] = useState<string>('')

    // WhatsApp State
    const [waConnected, setWaConnected] = useState(false)
    const [waPhone, setWaPhone] = useState<string | null>(null)
    const [waTemplateApproved, setWaTemplateApproved] = useState(false)
    const [whatsappMessage, setWhatsappMessage] = useState<string>('')
    const [waContactsCount, setWaContactsCount] = useState<number>(0)

    useEffect(() => {
        if (restaurantInfo?.id) {
            fetch(`/api/whatsapp/status?restaurantId=${restaurantInfo.id}`)
                .then(r => r.json())
                .then(data => {
                    setWaConnected(data.connected)
                    setWaPhone(data.phoneNumber)
                    setWaTemplateApproved(data.templateStatus === 'APPROVED')
                })

            fetch(`/api/contacts?restaurantId=${restaurantInfo.id}`)
                .then(r => r.json())
                .then(data => {
                    if (data.contacts) setWaContactsCount(data.contacts.filter((c: any) => !c.opted_out).length)
                })
        }
    }, [restaurantInfo?.id])

    const handleTogglePlatform = (p: Platform) => {
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
                setGenerationProgress('Analyzing video content...')
                const res = await fetch('/api/generate/video-brief', {
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
                setGenerationProgress('✨ Generating with Gemini AI...')
                try {
                    setGenerationProgress('✨ Initiating AI generation...');
                    const posterRes = await fetch('/api/generate/poster', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrl: uploadedUrl, caption: '', customText, offerText, dishName })
                    })
                    const posterText = await posterRes.text()
                    let data;
                    try { data = JSON.parse(posterText) } catch (e) { throw new Error(posterText) }
                    if (!posterRes.ok) throw new Error(data.error || posterText)

                    if (data.isAsync) {
                        const styleList = ['minimal', 'bold', 'lifestyle'] as const;
                        const taskIds = data.tasks;
                        const restaurantId = data.restaurantId;
                        const completedPosters: any = {};
                        
                        setGenerationProgress('✨ Waiting for Manus AI... (this may take 30-60s)');
                        
                        const startTime = Date.now();
                        const MAX_POLLING_TIME = 180000; // 3 minutes

                        while (Object.keys(completedPosters).length < styleList.length) {
                            if (Date.now() - startTime > MAX_POLLING_TIME) {
                                throw new Error('Generation took longer than usual. Please try again.');
                            }

                            for (const style of styleList) {
                                if (completedPosters[style]) continue;

                                const statusRes = await fetch(`/api/generate/poster/status?taskId=${taskIds[style]}&restaurantId=${restaurantId}`);
                                if (!statusRes.ok) continue;

                                const statusData = await statusRes.json();
                                if (statusData.status === 'completed' && statusData.imageUrl) {
                                    completedPosters[style] = statusData.imageUrl;
                                    setPosters((prev: any) => ({ ...prev, [style]: statusData.imageUrl }));
                                    if (style === 'minimal') setSelectedStyle('minimal');
                                    
                                    const remaining = styleList.length - Object.keys(completedPosters).length;
                                    if (remaining > 0) {
                                        setGenerationProgress(`✨ ${remaining} variations remaining...`);
                                    }
                                } else if (statusData.status === 'failed') {
                                    console.error(`Task for ${style} failed:`, statusData.error);
                                    // Fallback to original image if one fail
                                    completedPosters[style] = uploadedUrl;
                                    setPosters((prev: any) => ({ ...prev, [style]: uploadedUrl }));
                                }
                            }

                            if (Object.keys(completedPosters).length < styleList.length) {
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                        }
                    } else {
                        setPosters(data.posters)
                        setSelectedStyle('minimal')
                    }

                    // Use the dishName returned from analysis if user didn't provide one
                    if (data.dishName && !dishName) {
                        setDishName(data.dishName);
                    }
                } catch (posterErr: any) {
                    console.error('[POSTER_GEN_BYPASS]', posterErr);
                    // Fallback to the original image if AI poster generation fails
                    setPosters({ minimal: uploadedUrl, bold: uploadedUrl, lifestyle: uploadedUrl });
                    setSelectedStyle('minimal');
                }
            }

            setGenerationProgress('Writing captions...')

            const capRes = await fetch('/api/generate/caption', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: primaryPlatform,
                    postType: fileType,
                    extraContext: videoBrief,
                    contentType: contentType,
                    dishName: dishName
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
                        extraContext: videoBrief,
                        contentType: contentType,
                        dishName: dishName
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
            setGenerationProgress('')
        }
    }

    const handleSchedule = async () => {
        if (!uploadedUrl || !selectedCaption) return
        setIsScheduling(true)
        setError(null)

        try {
            const postDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 5 * 60000)

            // If the selected image is a base64 blob (from Gemini), upload it via server API
            // which uses the admin client to bypass Supabase RLS restrictions
            let finalImageUrl: string = posters ? posters[selectedStyle] : (uploadedUrl || '')
            if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
                const uploadRes = await fetch('/api/upload/poster', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64Image: finalImageUrl })
                })
                const uploadData = await uploadRes.json()
                if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload poster image')
                finalImageUrl = uploadData.publicUrl
            }

            for (const platform of selectedPlatforms) {
                if (platform === 'gmb') {
                    const response = await fetch('/api/gmb/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imageUrl: finalImageUrl,
                            caption: gmbCaption || selectedCaption,
                            scheduledTime: postDate.toISOString()
                        })
                    })
                    const data = await response.json()
                    if (!response.ok) throw new Error(`[GMB] ${data.error || 'Failed to schedule post'}`)
                }
            }
            const metaPlatforms = selectedPlatforms.filter(p => ['facebook', 'instagram', 'whatsapp'].includes(p));
            if (metaPlatforms.length > 0) {
                const response = await fetch('/api/meta/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platforms: metaPlatforms,
                        imageUrl: finalImageUrl,
                        caption: selectedCaption,
                        whatsappCustomMessage: selectedPlatforms.includes('whatsapp') ? whatsappMessage : undefined,
                        scheduledTime: postDate.toISOString()
                    })
                })
                const data = await response.json()
                if (!response.ok) throw new Error(`[Meta/WA] ${data.error || 'Failed to schedule post'}`)
                if (data.warnings?.length > 0) {
                    setError(`⚠️ Partial success: ${data.warnings.join(', ')}`)
                }
            }

            if (!error) {
                alert('Posts scheduled successfully!')
            }
            setStep(1)
            setUploadedUrl(null)
            setPosters(null)
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
                                        <button onClick={() => { setUploadedUrl(null); setStep(1); setPosters(null); setCaptions(null); setGmbCaption(null); setDishName(''); }} className="text-xs text-blue-600 hover:underline">Change file</button>
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
                            <div className="grid grid-cols-2 gap-3">
                                {(['instagram', 'facebook', 'gmb', 'whatsapp'] as Platform[]).map(p => {
                                    const isSelected = selectedPlatforms.includes(p);
                                    let isDisabled = false;
                                    let tooltip = '';
                                    if (p === 'whatsapp') {
                                        if (!waConnected) { isDisabled = true; tooltip = 'Connect WhatsApp in Settings first' }
                                        else if (!waTemplateApproved) { isDisabled = true; tooltip = 'Message template pending Meta approval' }
                                    }

                                    const label = p === 'gmb' ? 'Google My Business'
                                        : p === 'whatsapp' ? 'WhatsApp 📱'
                                        : p === 'instagram' ? 'Instagram'
                                        : 'Facebook';

                                    return (
                                        <div key={p} title={tooltip}>
                                            <button
                                                disabled={isDisabled}
                                                onClick={() => handleTogglePlatform(p)}
                                                className={`w-full px-4 py-3 text-sm font-semibold rounded-lg border transition-all ${isSelected
                                                    ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-md'
                                                    : isDisabled
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            {!waConnected && (
                                <p className="text-xs text-gray-400 mt-2">
                                    💡 <span className="font-medium">WhatsApp</span> is available once you connect it in{' '}
                                    <a href="/dashboard/settings" className="text-[#FF6B35] hover:underline">Settings</a>.
                                </p>
                            )}
                        </div>

                        <div className="mb-6">
                            <label className="text-sm font-medium mb-3 block">Post Content Type:</label>
                            <select
                                value={contentType}
                                onChange={(e) => setContentType(e.target.value)}
                                className="w-full rounded-md px-4 py-3 bg-white border border-gray-200 focus:outline-none focus:border-[#FF6B35] text-sm text-gray-700 shadow-sm"
                            >
                                <option value="Promotional Post">Promotional Post</option>
                                <option value="Educational/Tips Post">Educational/Tips Post</option>
                                <option value="Behind the Scenes">Behind the Scenes</option>
                                <option value="Product/Service Spotlight">Product/Service Spotlight</option>
                                <option value="Customer Testimonial">Customer Testimonial</option>
                                <option value="Seasonal/Holiday Post">Seasonal/Holiday Post</option>
                                <option value="Announcement">Announcement</option>
                                <option value="Engagement Post">Engagement Post</option>
                            </select>
                        </div>

                        {fileType === 'image' && (
                            <div className="mb-6 flex flex-col gap-5 p-5 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <label className="text-sm font-semibold text-gray-800 block mb-1.5">Dish Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Crispy Samosa, Grilled Chicken, Chocolate Cake"
                                        value={dishName}
                                        onChange={(e) => setDishName(e.target.value)}
                                        className="w-full text-sm p-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] shadow-sm transition-all"
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1.5">Leave blank and AI will detect it automatically</p>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-800 block mb-1.5">Special Offer <span className="text-gray-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 25% OFF, Buy 1 Get 1, Free Delivery!"
                                        value={offerText}
                                        onChange={(e) => setOfferText(e.target.value)}
                                        className="w-full text-sm p-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] shadow-sm transition-all"
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1.5">Leave blank if no offer</p>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-800 block mb-1.5">Custom Headline <span className="text-gray-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Weekend Special, New on Menu, Chef's Pick"
                                        value={customText}
                                        onChange={(e) => setCustomText(e.target.value)}
                                        className="w-full text-sm p-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] shadow-sm transition-all"
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1.5">Leave blank to use dish name</p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={generateAIContent}
                            disabled={isGenerating || step === 3}
                            className="w-full py-3 bg-[#1A1A1A] text-white rounded-md font-bold flex flex-col items-center justify-center hover:bg-gray-800 disabled:opacity-50 transition-colors h-14"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="flex items-center gap-2 mb-0.5"><Loader2 className="animate-spin" size={16} /> <span className="text-sm">Creating with AI...</span></div>
                                    <span className="text-[10px] text-gray-400 font-normal tracking-wider uppercase">{generationProgress}</span>
                                </>
                            ) : (
                                <div className="flex items-center gap-2"><Wand2 size={18} /> <span>Generate Poster & Captions</span></div>
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

                            {posters && (
                                <div className="mt-8">
                                    <h3 className="text-sm font-medium text-gray-700 mb-3 block">Select Your Poster Style:</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['minimal', 'bold', 'lifestyle'] as const).map(style => (
                                            <div
                                                key={style}
                                                onClick={() => setSelectedStyle(style)}
                                                className={`border rounded-lg p-2 cursor-pointer transition-all ${selectedStyle === style ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/20 bg-orange-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                                                    <img src={posters[style]} className="w-full h-full object-cover" />
                                                </div>
                                                <p className="text-xs font-semibold text-center capitalize">{style}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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

                            {selectedPlatforms.includes('whatsapp') && (
                                <div className="mt-6 pt-6 border-t">
                                    <div className="flex items-center gap-2 mb-3">
                                        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">📱 WhatsApp Override Message</p>
                                        <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Optional</span>
                                    </div>
                                    <textarea
                                        value={whatsappMessage}
                                        onChange={(e) => setWhatsappMessage(e.target.value)}
                                        placeholder="Leave blank to use the standard caption. This text replaces the {{2}} variable in your daily_special template."
                                        className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:border-[#FF6B35] min-h-[80px] bg-gray-50"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        Will be sent to <strong>{waContactsCount}</strong> opted-in contacts.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Right Column: Live Preview */}
                <div className="bg-white rounded-xl border p-6 shadow-sm flex flex-col sticky top-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <LayoutTemplate size={20} className="text-gray-400" />
                            Live Preview
                        </h2>
                        <div className="flex gap-1">
                            {selectedPlatforms.map(p => (
                                <span key={p} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider text-white"
                                    style={{
                                        background: p === 'instagram'
                                            ? 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'
                                            : p === 'facebook' ? '#1877f2' : p === 'whatsapp' ? '#25D366' : '#34a853'
                                    }}>
                                    {p === 'gmb' ? 'GMB' : p === 'instagram' ? 'IG' : p === 'whatsapp' ? 'WA' : 'FB'}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Helper to render the media area */}
                    {(() => {
                        const mediaContent = (aspectClass: string) => (
                            <div className={`${aspectClass} bg-gray-100 w-full overflow-hidden relative shrink-0`}>
                                {isGenerating ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 gap-2">
                                        <Loader2 className="animate-spin text-[#FF6B35]" size={28} />
                                        <span className="text-xs font-medium animate-pulse">Generating...</span>
                                    </div>
                                ) : posters ? (
                                    <img src={posters[selectedStyle]} className="w-full h-full object-cover" />
                                ) : uploadedUrl ? (
                                    <div className="relative w-full h-full">
                                        <img src={uploadedUrl} className="w-full h-full object-cover blur-sm opacity-60" />
                                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-500 uppercase tracking-widest">Original Photo</div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">No media uploaded</div>
                                )}
                            </div>
                        )

                        const logoEl = restaurantInfo?.logo_url
                            ? <img src={restaurantInfo.logo_url} className="rounded-full object-cover border" style={{ width: 40, height: 40 }} />
                            : <div className="rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ width: 40, height: 40, background: '#FF6B35' }}>{(restaurantInfo?.name || 'R')[0].toUpperCase()}</div>

                        const name = restaurantInfo?.name || 'Your Restaurant'
                        const caption = selectedCaption || ''

                        // === INSTAGRAM ===
                        if (selectedPlatforms.includes('instagram') && !selectedPlatforms.includes('facebook')) {
                            return (
                                <div className="border rounded-xl overflow-hidden bg-white max-w-[360px] mx-auto w-full shadow-sm">
                                    {/* IG Header */}
                                    <div className="flex items-center justify-between px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                                                <div className="bg-white p-0.5 rounded-full">
                                                    {restaurantInfo?.logo_url
                                                        ? <img src={restaurantInfo.logo_url} className="rounded-full object-cover" style={{ width: 38, height: 38 }} />
                                                        : <div className="rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#f09433,#bc1888)' }}>{name[0].toUpperCase()}</div>
                                                    }
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm leading-tight">{name.toLowerCase().replace(/\s+/g, '_')}</div>
                                                <div className="text-[10px] text-gray-400">Sponsored</div>
                                            </div>
                                        </div>
                                        <span className="text-gray-400 text-lg">···</span>
                                    </div>
                                    {/* IG Square Image */}
                                    {mediaContent('aspect-square')}
                                    {/* IG Actions */}
                                    <div className="px-3 pt-2 pb-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🤍</span>
                                                <span className="text-xl">💬</span>
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                            </div>
                                            <span className="text-xl">🔖</span>
                                        </div>
                                        <div className="text-xs font-semibold mb-0.5">1,248 likes</div>
                                        {caption ? (
                                            <p className="text-xs text-gray-800">
                                                <span className="font-semibold">{name.toLowerCase().replace(/\s+/g, '_')} </span>
                                                <span className="line-clamp-3">{caption}</span>
                                            </p>
                                        ) : <p className="text-xs text-gray-400 italic">Caption will appear here...</p>}
                                        <p className="text-[10px] text-gray-400 mt-1">View all 86 comments</p>
                                        <p className="text-[10px] text-gray-400">2 HOURS AGO</p>
                                    </div>
                                </div>
                            )
                        }

                        // === FACEBOOK ===
                        if (selectedPlatforms.includes('facebook') && !selectedPlatforms.includes('instagram')) {
                            return (
                                <div className="border rounded-xl overflow-hidden bg-white max-w-[400px] mx-auto w-full shadow-sm">
                                    {/* FB Header */}
                                    <div className="flex items-start justify-between px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            {logoEl}
                                            <div>
                                                <div className="font-semibold text-[13px] text-[#1877f2] leading-tight">{name}</div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-gray-500">Sponsored ·</span>
                                                    <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-gray-400 text-lg">···</span>
                                    </div>
                                    {/* Caption above image (FB style) */}
                                    {caption && (
                                        <div className="px-3 pb-2">
                                            <p className="text-[13px] text-gray-800 line-clamp-3">{caption}</p>
                                        </div>
                                    )}
                                    {/* FB Landscape Image */}
                                    {mediaContent('aspect-[4/3]')}\
                                    {/* FB Action Bar */}
                                    <div className="px-3 py-1 border-t">
                                        <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2 pt-1">
                                            <span>👍❤️😮</span><span>2.4K</span>
                                            <span className="ml-auto">348 comments · 87 shares</span>
                                        </div>
                                        <div className="flex border-t pt-1">
                                            {['👍 Like', '💬 Comment', '↗ Share'].map(a => (
                                                <button key={a} className="flex-1 text-center text-[12px] font-semibold text-gray-600 py-1 hover:bg-gray-100 rounded">{a}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        // === BOTH IG + FB ===
                        if (selectedPlatforms.includes('instagram') && selectedPlatforms.includes('facebook')) {
                            return (
                                <div className="border rounded-xl overflow-hidden bg-white max-w-[360px] mx-auto w-full shadow-sm">
                                    <div className="flex items-center justify-between px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#f09433,#bc1888)' }}>
                                                <div className="bg-white p-0.5 rounded-full">
                                                    {restaurantInfo?.logo_url
                                                        ? <img src={restaurantInfo.logo_url} className="rounded-full object-cover" style={{ width: 36, height: 36 }} />
                                                        : <div className="rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#f09433,#bc1888)' }}>{name[0]}</div>
                                                    }
                                                </div>
                                            </div>
                                            <div className="font-semibold text-sm">{name}</div>
                                        </div>
                                        <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded">IG + FB</span>
                                    </div>
                                    {mediaContent('aspect-square')}
                                    <div className="px-3 pt-2 pb-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-xl">🤍</span><span className="text-xl">💬</span>
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                        </div>
                                        {caption ? (
                                            <p className="text-xs text-gray-800 line-clamp-3">
                                                <span className="font-semibold">{name} </span>{caption}
                                            </p>
                                        ) : <p className="text-xs text-gray-400 italic">Caption will appear here...</p>}
                                    </div>
                                </div>
                            )
                        }

                        // === GMB ===
                        if (selectedPlatforms.includes('gmb')) {
                            return (
                                <div className="border rounded-xl overflow-hidden bg-white max-w-[380px] mx-auto w-full shadow-sm mb-4">
                                    {/* GMB Google-style header */}
                                    <div className="bg-white px-4 pt-4 pb-3">
                                        <div className="flex items-center gap-3 mb-3">
                                            {logoEl}
                                            <div className="flex-1">
                                                <div className="font-bold text-[13px] text-gray-900 leading-tight">{name}</div>
                                                <div className="text-[11px] text-yellow-500 leading-tight">★★★★★ <span className="text-gray-500">(124)</span></div>
                                                <div className="text-[10px] text-gray-400">Restaurant · Dubai</div>
                                            </div>
                                            <img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" className="w-6 h-6" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-[#1a73e8] bg-blue-50 px-2 py-0.5 rounded-full">What's New</span>
                                            <span className="text-[10px] text-gray-400">Just now</span>
                                        </div>
                                    </div>
                                    {/* GMB 16:9 image */}
                                    {mediaContent('aspect-video')}
                                    <div className="p-4">
                                        {caption ? (
                                            <p className="text-[13px] text-gray-700 line-clamp-4">{caption}</p>
                                        ) : <p className="text-[13px] text-gray-400 italic">Caption preview will appear here...</p>}
                                        <button className="mt-3 text-[12px] font-semibold text-[#1a73e8] border border-[#1a73e8] rounded-md px-4 py-1.5">Learn more</button>
                                    </div>
                                    {/* GMB reactions */}
                                    <div className="border-t px-4 py-2 flex gap-4">
                                        {['👍 Like', '❤️ Love', '💬 Share'].map(a => (
                                            <button key={a} className="text-[11px] text-gray-500 font-medium">{a}</button>
                                        ))}
                                    </div>
                                </div>
                            )
                        }

                        // === WHATSAPP ===
                        if (selectedPlatforms.includes('whatsapp')) {
                            const waTemplateBody = `🍽️ Today's Special at ${name}!\n\n${whatsappMessage || caption || 'Your caption will go here...'}\n\nReply STOP to unsubscribe`;

                            return (
                                <div className="max-w-[360px] mx-auto w-full rounded-2xl overflow-hidden flex flex-col pt-12 items-end shadow-sm relative group bg-[#EFEAE2]">
                                    {/* App-like Background wallpaper */}
                                    <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-whatsapp-background-theme.jpg")', backgroundSize: 'cover' }}></div>

                                    {/* Chat Header Fake */}
                                    <div className="absolute top-0 left-0 right-0 h-14 bg-[#075E54] flex items-center px-3 gap-3 z-10 shadow-sm text-white">
                                        <div className="w-6 text-white">&larr;</div>
                                        <div className="w-8 h-8 bg-gray-300 rounded-full overflow-hidden flex-shrink-0">
                                            {restaurantInfo?.logo_url ? <img src={restaurantInfo.logo_url} className="w-full h-full object-cover" /> : null}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-[15px] truncate leading-tight">{name}</div>
                                            <div className="text-[11px] text-white/80">Business Account</div>
                                        </div>
                                    </div>

                                    {/* The Chat Bubble */}
                                    <div className="bg-white rounded-lg rounded-tl-sm shadow-sm m-4 mb-6 self-start max-w-[85%] relative z-10 p-1">
                                        <div className="absolute top-0 -left-[10px] w-0 h-0 border-[10px] border-transparent border-t-white border-r-white"></div>

                                        {/* Image Header */}
                                        <div className="rounded overflow-hidden mb-2 border border-gray-100 bg-gray-100">
                                            {mediaContent('aspect-square')}
                                        </div>

                                        {/* Template Body */}
                                        <div className="px-1.5 pb-2">
                                            <div className="text-[14px] text-gray-800 whitespace-pre-wrap leading-snug">{waTemplateBody}</div>
                                            <div className="flex items-center justify-end gap-1 mt-1 -mb-1">
                                                <span className="text-[10px] text-gray-400">12:00 PM</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        // Default empty state
                        return (
                            <div className="border-[2px] border-dashed border-gray-200 rounded-xl max-w-[360px] mx-auto w-full aspect-[4/5] flex items-center justify-center text-gray-400 bg-gray-50 flex-col gap-2 shadow-sm">
                                <LayoutTemplate size={32} className="opacity-50" />
                                <span className="text-sm font-medium">Select a platform to preview</span>
                            </div>
                        )

                    })()}


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
