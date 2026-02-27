'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, Image as ImageIcon, Video, Trash2, FolderOpen } from 'lucide-react'
import { MediaLibrary } from '@/types'

export default function MediaLibraryPage() {
    const [media, setMedia] = useState<MediaLibrary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchMedia()
    }, [])

    const fetchMedia = async () => {
        try {
            setLoading(true)

            // Because of our RLS policies (which might need to be added for this table), 
            // we can directly select without passing a restaurant_id.
            // But just to be safe, we'll fetch explicitly by user's restaurant if RLS doesn't catch it seamlessly on select
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!restaurant) return

            const { data: mediaData, error: mediaError } = await supabase
                .from('media_library')
                .select('*')
                .eq('restaurant_id', restaurant.id)
                .order('uploaded_at', { ascending: false })

            if (mediaError) throw mediaError

            setMedia(mediaData || [])
        } catch (err: any) {
            console.error(err)
            setError('Failed to load media.')
        } finally {
            setLoading(false)
        }
    }

    const deleteMedia = async (id: string, fileUrl: string) => {
        if (!confirm('Are you sure you want to delete this file? Any existing posts using it will lose their image.')) return

        try {
            // 1. Delete from database
            const { error: dbError } = await supabase
                .from('media_library')
                .delete()
                .eq('id', id)

            if (dbError) throw dbError

            // 2. Delete from storage bucket
            const pathParts = fileUrl.split('/')
            const fileName = pathParts[pathParts.length - 1]
            await supabase.storage.from('media').remove([fileName])

            // Update UI
            setMedia(media.filter(m => m.id !== id))
        } catch (err: any) {
            console.error(err)
            alert('Failed to delete media.')
        }
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Media Library</h1>
                    <p className="text-gray-500">Manage all the photos and videos you've uploaded.</p>
                </div>
                <div className="bg-orange-50 text-[#FF6B35] px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 w-fit">
                    <FolderOpen size={18} />
                    {media.length} Files
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                    <Loader2 size={32} className="animate-spin mb-4 text-[#FF6B35]" />
                    <p>Loading your media...</p>
                </div>
            ) : media.length === 0 ? (
                <div className="bg-white border rounded-xl p-16 text-center shadow-sm">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <ImageIcon size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Your library is empty</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">You haven't uploaded any media yet. Upload photos and videos when creating a new post to populate this library.</p>
                    <a href="/dashboard/create" className="inline-flex items-center justify-center px-6 py-3 bg-[#1A1A1A] text-white rounded-md font-bold hover:bg-gray-800 transition-colors">
                        Upload in Create Post
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {media.map((item) => (
                        <div key={item.id} className="group relative bg-gray-100 rounded-xl overflow-hidden aspect-square border shadow-sm">
                            {item.file_type === 'video' ? (
                                <video src={item.file_url} className="w-full h-full object-cover" />
                            ) : (
                                <img src={item.file_url} alt="Media" className="w-full h-full object-cover" />
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => deleteMedia(item.id, item.file_url)}
                                        className="p-1.5 bg-white/20 hover:bg-red-500 text-white rounded-md backdrop-blur-sm transition-colors"
                                        title="Delete forever"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 text-white text-xs font-medium">
                                    {item.file_type === 'video' ? <Video size={14} /> : <ImageIcon size={14} />}
                                    <span className="truncate">{item.file_name || 'Uploaded File'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
