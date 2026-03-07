'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

interface SubmitButtonProps {
    text?: string;
    loadingText?: string;
    className?: string;
}

export default function SubmitButton({ 
    text = 'Save Changes', 
    loadingText = 'Saving...',
    className = "bg-[#1A1A1A] text-white rounded-md px-4 py-2 mt-2 font-medium hover:bg-gray-800 transition-colors w-fit flex items-center justify-center gap-2 disabled:opacity-70"
}: SubmitButtonProps) {
    const { pending } = useFormStatus()
    return (
        <button 
            type="submit" 
            disabled={pending}
            className={className}
        >
            {pending && <Loader2 className="animate-spin" size={16} />}
            {pending ? loadingText : text}
        </button>
    )
}
