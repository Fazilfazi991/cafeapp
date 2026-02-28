'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

export default function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button 
            type="submit" 
            disabled={pending}
            className="bg-[#1A1A1A] text-white rounded-md px-4 py-2 mt-2 font-medium hover:bg-gray-800 transition-colors w-fit flex items-center justify-center gap-2 disabled:opacity-70"
        >
            {pending && <Loader2 className="animate-spin" size={16} />}
            {pending ? 'Saving...' : 'Save Changes'}
        </button>
    )
}
