'use client';

import { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Share2, Loader2, AlertCircle, Check } from 'lucide-react';

interface SchedulingModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    videoTitle?: string;
    onSuccess: () => void;
}

export default function SchedulingModal({ isOpen, onClose, videoUrl, videoTitle, onSuccess }: SchedulingModalProps) {
    const [caption, setCaption] = useState(videoTitle || '');
    const [scheduledDate, setScheduledDate] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
    const [isScheduling, setIsScheduling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSchedule = async () => {
        if (!caption || selectedPlatforms.length === 0) {
            setError('Please provide a caption and select at least one platform.');
            return;
        }

        setIsScheduling(true);
        setError(null);

        try {
            const postDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 5 * 60000);
            
            const response = await fetch('/api/meta/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platforms: selectedPlatforms,
                    imageUrl: videoUrl, // The API currently uses imageUrl field for both images and videos
                    caption,
                    scheduledTime: postDate.toISOString(),
                    postType: 'video' // We'll add this hint for the backend
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to schedule post');

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to schedule post.');
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Share2 size={20} className="text-[#FF6B35]" /> Schedule Reel
                        </h2>
                        <p className="text-sm text-gray-500">Plan your video for Instagram and Facebook</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Preview */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-700">Video Preview</label>
                            <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-inner border border-gray-100">
                                <video src={videoUrl} autoPlay muted loop className="w-full h-full object-cover" />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">Caption</label>
                                <textarea 
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    rows={4}
                                    placeholder="Write a catchy caption for your Reel..."
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF6B35] border-gray-200 outline-none text-sm resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">Schedule Date & Time</label>
                                <div className="relative">
                                    <input 
                                        type="datetime-local"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        className="w-full h-11 px-4 pl-10 border rounded-lg focus:ring-2 focus:ring-[#FF6B35] border-gray-200 outline-none text-sm"
                                    />
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                </div>
                                <p className="text-[10px] text-gray-400 italic">Leave empty to post in 5 minutes</p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-700">Platforms</label>
                                <div className="space-y-2">
                                    {['instagram', 'facebook'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setSelectedPlatforms(prev => 
                                                prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                                            )}
                                            className={`w-full p-3 border rounded-lg flex items-center justify-between transition-all ${selectedPlatforms.includes(p) ? 'border-[#FF6B35] bg-orange-50' : 'hover:border-gray-300'}`}
                                        >
                                            <span className="text-sm font-medium capitalize">{p}</span>
                                            {selectedPlatforms.includes(p) ? (
                                                <div className="w-5 h-5 bg-[#FF6B35] text-white rounded-full flex items-center justify-center">
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 border-2 border-gray-200 rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
                    <button 
                        onClick={onClose}
                        disabled={isScheduling}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSchedule}
                        disabled={isScheduling}
                        className="bg-[#FF6B35] text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e85a25] disabled:opacity-50 transition-all shadow-md shadow-orange-100"
                    >
                        {isScheduling ? <Loader2 className="animate-spin" size={18} /> : <Clock size={18} />}
                        {isScheduling ? 'Scheduling...' : 'Schedule Reel Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
