import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A]">
            {/* Simple header */}
            <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#FF6B35]"></div>
                    <span className="font-bold text-lg tracking-tight">Brand Pilot</span>
                </Link>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                    <Link href="/privacy" className="hover:text-[#1A1A1A] transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-[#1A1A1A] transition-colors">Terms</Link>
                    <Link href="/login" className="bg-[#1A1A1A] text-white px-4 py-1.5 rounded-md font-medium hover:bg-gray-800 transition-colors">Login</Link>
                </div>
            </header>

            <main>{children}</main>

            {/* Footer */}
            <footer className="border-t bg-white mt-16 px-6 py-8 text-center text-sm text-gray-400">
                <p>© {new Date().getFullYear()} Brand Pilot. All rights reserved.</p>
                <div className="flex items-center justify-center gap-4 mt-2">
                    <Link href="/privacy" className="hover:text-[#1A1A1A] transition-colors">Privacy Policy</Link>
                    <span>·</span>
                    <Link href="/terms" className="hover:text-[#1A1A1A] transition-colors">Terms of Service</Link>
                </div>
            </footer>
        </div>
    )
}
