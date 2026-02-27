import Link from 'next/link'

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-[#FAFAFA]">
            <div className="z-10 max-w-5xl w-full flex-col items-center justify-center font-mono text-sm lg:flex text-center mb-12">
                <h1 className="text-6xl font-extrabold tracking-tight mb-4 text-[#1A1A1A]">
                    Post<span className="text-[#FF6B35]">Chef</span>
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
                    The AI-powered social media and local SEO automation platform built specifically for restaurants and cafeterias.
                </p>
                <div className="flex gap-4">
                    <Link href="/signup" className="bg-[#FF6B35] text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors text-lg">
                        Start Free Trial
                    </Link>
                    <Link href="/login" className="bg-white border text-[#1A1A1A] px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-lg">
                        Login
                    </Link>
                </div>
            </div>
        </main>
    )
}
