import Link from 'next/link'

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            <header className="px-8 py-6 border-b bg-white flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#FF6B35]"></div>
                    <span className="font-bold text-xl tracking-tight text-[#1A1A1A]">PostChef</span>
                </Link>
                <div className="text-sm font-medium text-gray-500">
                    Account Setup
                </div>
            </header>
            <main className="flex-1 flex flex-col items-center py-12 px-4">
                <div className="w-full max-w-2xl bg-white rounded-xl border shadow-sm p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
