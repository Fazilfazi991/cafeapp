import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function WelcomePage() {
    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 text-foreground">
            
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-2">
                <CheckCircle2 className="w-12 h-12 text-green-600 animate-[bounce_1s_ease-in-out_1]" />
            </div>

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-[#1A1A1A]">Email Confirmed!</h1>
                <p className="text-gray-500 text-base">
                    Welcome to Brand Pilot. Your account is ready. 
                    Let's set up your restaurant profile.
                </p>
            </div>

            <div className="w-full mt-4">
                <Link
                    href="/dashboard"
                    className="flex justify-center items-center w-full bg-[#1A1A1A] rounded-md px-4 py-3 text-white font-medium hover:bg-gray-800 transition-colors group"
                >
                    Get Started 
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
            </div>
            
            <p className="mt-4 text-center text-xs text-gray-400">
                By continuing you agree to our{' '}
                <Link href="/terms" className="text-gray-500 underline hover:text-[#1A1A1A] transition-colors">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-gray-500 underline hover:text-[#1A1A1A] transition-colors">Privacy Policy</Link>.
            </p>
        </div>
    )
}
