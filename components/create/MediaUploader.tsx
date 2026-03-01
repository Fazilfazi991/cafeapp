'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { ImagePlus, Loader2, X } from 'lucide-react'

interface MediaUploaderProps {
    onUploadComplete: (url: string, fileType: 'image' | 'video', fileName: string) => void
    onUploadError: (error: string) => void
}

export default function MediaUploader({ onUploadComplete, onUploadError }: MediaUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const supabase = createClient()

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true)
        } else if (e.type === 'dragleave') {
            setIsDragging(false)
        }
    }, [])

    const uploadFile = async (file: File) => {
        if (!file) return

        // Basic validation
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')

        if (!isImage && !isVideo) {
            onUploadError('Please upload an image or video file.')
            return
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            onUploadError('File size must be less than 50MB.')
            return
        }

        setIsUploading(true)
        setIsDragging(false)

        try {
            // Create local preview
            const objectUrl = URL.createObjectURL(file)
            setPreviewUrl(objectUrl)

            // Get authenticated user (to scope the upload)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get the restaurant ID for this user since files should be organized by restaurant
            const { data: restaurants } = await supabase
                .from('restaurants')
                .select('id')
                .eq('user_id', user.id)
                .limit(1)

            const restaurantId = restaurants?.[0]?.id
            if (!restaurantId) throw new Error('Restaurant not found')

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
            const filePath = `${restaurantId}/${fileName}`
            const bucket = isImage ? 'media' : 'videos' // We'll put both in 'media' for simplicity based on implementation plan

            // Extract supabase URL and ANON key from env dynamically using standard NEXT_PUBLIC vars
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

            // Get the current session to get the access token
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token || anonKey

            // Manually fetch to Supabase Storage API to bypass the SDK hiding the 422 errors
            const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/media/${filePath}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apiKey': anonKey as string,
                    'Content-Type': file.type,
                    'x-upsert': 'false'
                },
                body: file
            });

            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                throw new Error(`[STORAGE_UPLOAD_REST] Status: ${uploadRes.status}, Body: ${errorText}`);
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('media')
                .getPublicUrl(filePath)

            // Save to media_library table
            const { data: mediaRecord, error: dbError } = await supabase
                .from('media_library')
                .insert({
                    restaurant_id: restaurantId,
                    file_url: publicUrlData.publicUrl,
                    file_type: isImage ? 'image' : 'video',
                    file_name: file.name,
                    size_bytes: file.size
                })
                .select()
                .single()

            if (dbError) throw new Error(`[DB_INSERT] ${dbError.message} (Code: ${dbError.code}, Details: ${dbError.details})`)

            onUploadComplete(publicUrlData.publicUrl, isImage ? 'image' : 'video', file.name)

        } catch (err: any) {
            console.error('Upload error:', err)
            onUploadError(
                err?.message
                    ? `Upload Failed: ${err.message}`
                    : `Upload Failed: ${JSON.stringify(err)}`
            )
            setPreviewUrl(null)
        } finally {
            setIsUploading(false)
        }
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            uploadFile(files[0])
        }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        if (e.target.files && e.target.files.length > 0) {
            uploadFile(e.target.files[0])
        }
    }

    const resetUpload = () => {
        setPreviewUrl(null)
        // In a real app we might want to delete the file from storage if they cancel, but for MVP we leave it
    }

    if (previewUrl) {
        return (
            <div className="relative rounded-xl border overflow-hidden bg-gray-50 aspect-video flex items-center justify-center">
                {isUploading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 flex-col gap-2">
                        <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
                        <span className="text-sm font-medium text-[#1A1A1A]">Uploading media...</span>
                    </div>
                )}

                {/* We do a cheap trick to guess if it's a video by looking at the blob url, 
            but in reality the parent component should manage the file type. 
            For preview, we'll just try an img tag. */}
                <img src={previewUrl} alt="Upload preview" className="max-h-full max-w-full object-contain" />

                {!isUploading && (
                    <button
                        onClick={resetUpload}
                        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-red-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        )
    }

    return (
        <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-all
        flex flex-col items-center justify-center aspect-video cursor-pointer bg-gray-50 hover:bg-gray-100
        ${isDragging ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-300'}
      `}
        >
            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleChange}
            />
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-[#FF6B35] text-white' : 'bg-white shadow-sm text-gray-400'}`}>
                    <ImagePlus size={24} />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">
                    {isDragging ? 'Drop it here!' : 'Click to upload or drag & drop'}
                </h3>
                <p className="text-sm text-gray-500 max-w-xs">
                    SVG, PNG, JPG, or MP4 (max. 50MB)
                </p>
            </label>
        </div>
    )
}
