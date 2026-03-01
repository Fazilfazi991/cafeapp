'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'

export default function LogoUploader({
    defaultValue,
    restaurantId
}: {
    defaultValue?: string,
    restaurantId: string
}) {
    const [logoUrl, setLogoUrl] = useState<string | null>(defaultValue || null)
    const [isUploading, setIsUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (PNG, JPG, etc).')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Logo must be less than 5MB.')
            return
        }

        setIsUploading(true)
        setError(null)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `logo_${restaurantId}_${Date.now()}.${fileExt}`
            const filePath = `${restaurantId}/${fileName}`

            // Fix for Supabase Storage SDK stripping tokens/headers: use explicit fetch
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token || anonKey

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
                throw new Error(`Upload Failed: ${errorText}`);
            }

            const { data } = supabase.storage.from('media').getPublicUrl(filePath)
            setLogoUrl(data.publicUrl)

        } catch (err: any) {
            console.error('Logo upload error:', err)
            setError(err.message || 'Failed to upload logo.')
        } finally {
            setIsUploading(false)
        }
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0])
            e.dataTransfer.clearData()
        }
    }

    return (
        <div className="mb-6">
            <label className="text-sm font-medium text-[#1A1A1A] block mb-2">Business Logo</label>

            {/* Hidden input to pass the logo URL to the server action */}
            <input type="hidden" name="logo_url" value={logoUrl || ''} />

            <div
                className={`relative border-2 border-dashed rounded-xl p-6 transition-colors flex flex-col items-center justify-center text-center ${isDragging ? 'border-[#FF6B35] bg-[#FF6B35]/5' :
                    error ? 'border-red-300 bg-red-50' :
                        'border-gray-200 hover:border-gray-300'
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
            >
                {isUploading ? (
                    <div className="py-4 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin mb-2" />
                        <p className="text-sm text-gray-500">Uploading logo...</p>
                    </div>
                ) : logoUrl ? (
                    <div className="relative group">
                        <img
                            src={logoUrl}
                            alt="Business Logo"
                            className="max-h-32 object-contain rounded-md"
                        />
                        <button
                            type="button"
                            onClick={() => setLogoUrl(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="py-4">
                        <div className="w-12 h-12 bg-[#FF6B35]/10 text-[#FF6B35] rounded-full flex items-center justify-center mx-auto mb-3">
                            <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                            PNG, JPG or WEBP (max. 5MB)
                        </p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Select Logo
                        </button>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            handleFile(e.target.files[0])
                        }
                    }}
                />
            </div>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
    )
}
