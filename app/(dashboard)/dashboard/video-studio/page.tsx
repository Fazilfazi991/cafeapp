'use client';

import { useState, useEffect } from 'react';
import { 
    Video, 
    Play, 
    Download, 
    Share2, 
    RefreshCcw, 
    Clock, 
    AlertCircle,
    Layout,
    Image as ImageIcon,
    X
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import SchedulingModal from '@/components/create/SchedulingModal';

const TEMPLATES = [
    { 
        icon: '🍽️', 
        label: 'Food Showcase', 
        prompt: 'Cinematic slow motion close-up of dish on an elegant plate, steam rising, warm golden lighting, dark moody restaurant background, 4K quality, professional food photography style' 
    },
    { 
        icon: '☕', 
        label: 'Cafe Ambiance', 
        prompt: 'Warm cozy cafe interior, soft morning light through windows, coffee being poured, pastries on counter, customers in soft focus background, ambient cafe sounds, cinematic style' 
    },
    { 
        icon: '🎉', 
        label: 'Special Offer', 
        prompt: 'Vibrant and energetic food promotion video, colorful dish presentation, bold colors, modern UAE restaurant aesthetic, upbeat mood' 
    },
    { 
        icon: '📍', 
        label: 'Restaurant Tour', 
        prompt: 'Smooth cinematic walkthrough of a modern restaurant interior, elegant table settings, warm ambient lighting, inviting atmosphere, Dubai fine dining aesthetic' 
    }
];

export default function VideoStudio() {
    const supabase = createClient();
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('9:16');
    const [duration, setDuration] = useState(8);
    const [generateAudio, setGenerateAudio] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
    
    // Scheduling Modal State
    const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
    const [selectedVideoToSchedule, setSelectedVideoToSchedule] = useState<{url: string, title: string} | null>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (data) setHistory(data);
    };

    const openSchedulingModal = (url: string, videoTitle: string) => {
        setSelectedVideoToSchedule({ url, title: videoTitle });
        setIsSchedulingModalOpen(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Still show a basic size limit for UX
        if (file.size > 14 * 1024 * 1024) {
            alert('File is too large. Max size is 14MB.');
            return;
        }

        setReferenceFileName(file.name);
        
        try {
            const compressedBase64 = await compressImage(file);
            setReferenceImage(compressedBase64);
        } catch (err) {
            console.error('[VIDEO_STUDIO] Compression failed:', err);
            // Fallback to basic FileReader if canvas fails
            const reader = new FileReader();
            reader.onloadend = () => {
                setReferenceImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1024;

                    if (width > height && width > maxDim) {
                        height = (height * maxDim) / width;
                        width = maxDim;
                    } else if (height > maxDim) {
                        width = (width * maxDim) / height;
                        height = maxDim;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG with 0.8 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const removeImage = () => {
        setReferenceImage(null);
        setReferenceFileName(null);
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setStatus('loading');
        setErrorMessage(null);
        try {
            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    prompt,
                    negativePrompt,
                    aspectRatio,
                    duration,
                    generateAudio,
                    referenceImage
                })
            });

            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const rawText = await response.text();
                console.error('[VIDEO_STUDIO] Non-JSON response:', rawText);
                setErrorMessage(`Server Error: ${rawText.substring(0, 50)}...`);
                setStatus('error');
                setIsGenerating(false);
                return;
            }

            if (data.success) {
                pollStatus(data.jobId);
            } else {
                setErrorMessage(data.error || 'Failed to initiate video generation');
                setStatus('error');
                setIsGenerating(false);
            }
        } catch (err: any) {
            console.error('[VIDEO_STUDIO] Fetch error:', err);
            setErrorMessage(err.message || 'An unexpected error occurred');
            setStatus('error');
            setIsGenerating(false);
        }
    };

    const pollStatus = async (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/video/status/${jobId}`);
                const contentType = res.headers.get('content-type');
                
                let data;
                if (contentType && contentType.includes('application/json')) {
                    data = await res.json();
                } else {
                    const rawText = await res.text();
                    console.error('[VIDEO_STUDIO] Poll Non-JSON:', rawText);
                    return; // Continue polling or handle error
                }

                if (data.status === 'completed') {
                    setVideoUrl(data.videoUrl);
                    setStatus('success');
                    setIsGenerating(false);
                    clearInterval(interval);
                    fetchHistory();
                } else if (data.status === 'failed') {
                    setErrorMessage(data.error || 'Video generation failed on the server');
                    setStatus('error');
                    setIsGenerating(false);
                    clearInterval(interval);
                }
            } catch (err: any) {
                console.error('[VIDEO_STUDIO] Status Check Error:', err);
                setErrorMessage(err.message || 'Status check failed');
                clearInterval(interval);
            }
        }, 5000);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Video Studio</h1>
                <p className="text-gray-500">Create stunning promotional videos for your restaurant using Gemini Veo 3.0.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side — Controls */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700">Prompt Templates</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.label}
                                    onClick={() => setPrompt(t.prompt)}
                                    className="flex items-center gap-2 p-3 text-sm border rounded-lg hover:border-[#FF6B35] hover:bg-orange-50 transition-all text-left"
                                >
                                    <span>{t.icon}</span>
                                    <span className="font-medium">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Video Title</label>
                            <input 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Summer Biryani Ad..."
                                className="w-full h-11 px-4 border rounded-lg focus:ring-2 focus:ring-[#FF6B35] border-gray-200 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <label className="text-sm font-semibold text-gray-700">Video Prompt</label>
                                <span className="text-[10px] text-gray-400 font-mono italic">Powered by Gemini Veo 3.0</span>
                            </div>
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={5}
                                placeholder="Describe your video... e.g. A slow cinematic close-up of a steaming plate of biryani..."
                                className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-[#FF6B35] border-gray-200 outline-none transition-all resize-none text-sm"
                            />
                        </div>

                        {/* Reference Image Section */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Reference Image (Optional)</label>
                            <p className="text-[11px] text-gray-500">Upload a food photo to guide the video style and content</p>
                            
                            {!referenceImage ? (
                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 group-hover:border-[#FF6B35] group-hover:bg-orange-50 transition-all">
                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-[#FF6B35] transition-colors">
                                            <ImageIcon size={20} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
                                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">JPG, PNG up to 10MB</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 p-3 border rounded-xl bg-gray-50 border-gray-200">
                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border bg-white flex-shrink-0">
                                        <img src={referenceImage} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-700 truncate">{referenceFileName}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Ready to use</p>
                                    </div>
                                    <button 
                                        onClick={removeImage}
                                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">Duration</label>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    {[5, 8].map(d => (
                                        <button 
                                            key={d}
                                            onClick={() => setDuration(d)}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${duration === d ? 'bg-white shadow-sm text-[#FF6B35]' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {d}s
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">Audio</label>
                                <button 
                                    onClick={() => setGenerateAudio(!generateAudio)}
                                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium border transition-all flex items-center justify-between ${generateAudio ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                                >
                                    <span>Ambient Music</span>
                                    <span className={`w-2 h-2 rounded-full ${generateAudio ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Aspect Ratio</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: '9:16 Reels', val: '9:16' },
                                    { label: '16:9 Wide', val: '16:9' },
                                    { label: '1:1 Square', val: '1:1' }
                                ].map(({ label, val }) => (
                                    <button
                                        key={val}
                                        onClick={() => setAspectRatio(val)}
                                        className={`py-2 px-1 text-[10px] font-bold border rounded-lg uppercase tracking-wider transition-all ${aspectRatio === val ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]' : 'border-gray-200 text-gray-400'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={!prompt || isGenerating}
                        className={`w-full h-14 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-100 ${(!prompt || isGenerating) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-[#FF6B35] hover:bg-[#e85a25]'}`}
                    >
                        <Video size={22} />
                        {isGenerating ? 'Generating Video...' : '🎬 Generate Video'}
                    </button>
                    <p className="text-center text-[11px] text-gray-400 italic">~2-3 minutes to generate high-quality output</p>
                </div>

                {/* Right Side — Preview */}
                <div className="lg:col-span-7">
                    <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl min-h-[500px] flex flex-col items-center justify-center p-8 text-center sticky top-8">
                        {status === 'idle' && (
                            <div className="space-y-4 max-w-sm">
                                <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto">
                                    <Play size={40} />
                                </div>
                                <h3 className="text-xl font-bold">Your video will appear here</h3>
                                <p className="text-gray-400 text-sm">Fill in a prompt and click generate to see the magic of Gemini AI Studio.</p>
                            </div>
                        )}

                        {status === 'loading' && (
                            <div className="space-y-8 w-full max-w-md">
                                <div className="space-y-4">
                                    <div className="w-24 h-24 bg-orange-50 text-[#FF6B35] rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                                        <Video size={48} />
                                    </div>
                                    <h3 className="text-2xl font-bold">🎬 Generating your video...</h3>
                                    <p className="text-gray-500">This usually takes 2-3 minutes. You can stay on this page or check back later.</p>
                                </div>
                                
                                <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full bg-[#FF6B35] animate-sliding-progress rounded-full"></div>
                                </div>
                            </div>
                        )}

                        {status === 'success' && videoUrl && (
                            <div className="w-full space-y-6">
                                <div className="aspect-[9/16] max-h-[550px] mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl relative group">
                                    <video 
                                        src={videoUrl} 
                                        autoPlay 
                                        muted 
                                        loop 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                                    <button 
                                        onClick={() => openSchedulingModal(videoUrl, title || 'New Studio Reel')}
                                        className="flex items-center justify-center gap-2 bg-[#FF6B35] text-white py-3 px-4 rounded-xl font-bold hover:bg-[#e85a25] transition-all"
                                    >
                                        <Share2 size={18} /> Schedule Reel
                                    </button>
                                    <a 
                                        href={videoUrl} 
                                        download 
                                        className="flex items-center justify-center gap-2 bg-gray-100 text-[#1A1A1A] py-3 px-4 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
                                    >
                                        <Download size={18} /> Download
                                    </a>
                                    <button onClick={handleGenerate} className="col-span-2 flex items-center justify-center gap-2 border-2 border-gray-100 text-gray-500 py-3 px-4 rounded-xl font-bold hover:bg-gray-50 transition-all">
                                        <RefreshCcw size={18} /> Regenerate
                                    </button>
                                </div>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-4 max-w-sm text-red-600">
                                <AlertCircle size={48} className="mx-auto" />
                                <h3 className="text-xl font-bold">Generation Failed</h3>
                                <p className="text-red-500 text-sm opacity-80">{errorMessage || 'Video generation limit reached or server unavailable. Please try again later.'}</p>
                                <button onClick={() => setStatus('idle')} className="mt-4 px-6 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-all">Try Again</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Section */}
            <section className="space-y-6 pt-12 border-t">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Clock className="text-gray-400" /> Recent Studio Videos
                    </h2>
                </div>

                {history.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-12 text-center text-gray-400 italic">
                        No videos generated yet. Start your first cinematic masterpiece!
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {history.map((v) => (
                            <div key={v.id} className="group relative aspect-[9/16] bg-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                {v.video_url ? (
                                    <video src={v.video_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
                                        <Video className="text-gray-400 animate-pulse" size={32} />
                                        <span className="text-[10px] font-bold uppercase text-gray-500">{v.status}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                    <p className="text-white text-[10px] font-bold truncate mb-1">{v.title || 'Untitled'}</p>
                                    <div className="flex gap-2">
                                        <a href={v.video_url} download className="p-1.5 bg-white/20 hover:bg-white text-white hover:text-orange-600 rounded-md transition-all">
                                            <Download size={14} />
                                        </a>
                                        <button 
                                            onClick={() => openSchedulingModal(v.video_url, v.title || 'Studio Reel')}
                                            className="p-1.5 bg-white/20 hover:bg-white text-white hover:text-orange-600 rounded-md transition-all flex-1 text-[10px] font-bold"
                                        >
                                            Schedule
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {isSchedulingModalOpen && selectedVideoToSchedule && (
                <SchedulingModal 
                    isOpen={isSchedulingModalOpen}
                    onClose={() => setIsSchedulingModalOpen(false)}
                    videoUrl={selectedVideoToSchedule.url}
                    videoTitle={selectedVideoToSchedule.title}
                    onSuccess={() => {
                        alert('Video scheduled successfully! You can see it in your Calendar.');
                    }}
                />
            )}
            
            <style jsx global>{`
                @keyframes sliding-progress {
                    0% { width: 0%; left: 0; }
                    50% { width: 40%; left: 30%; }
                    100% { width: 0%; left: 100%; }
                }
                .animate-sliding-progress {
                    animation: sliding-progress 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}
