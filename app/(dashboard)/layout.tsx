import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Calendar, PenSquare, Settings, LogOut, FolderOpen, AlertTriangle } from 'lucide-react'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('plan, plan_end_date')
        .eq('user_id', user.id)
        .limit(1)

    const restaurant = restaurants?.[0]

    let isExpired = false
    let daysRemaining = 999

    if (restaurant) {
        if (restaurant.plan === 'expired') {
            isExpired = true
        } else if (restaurant.plan_end_date) {
            const endDate = new Date(restaurant.plan_end_date)
            const now = new Date()
            const diffTime = endDate.getTime() - now.getTime()
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (daysRemaining <= 0) {
                isExpired = true
            }
        }
    }

    if (isExpired) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-8 text-[#1A1A1A]">
                <div className="bg-white border border-red-200 rounded-xl p-12 max-w-lg w-full text-center shadow-sm">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Your subscription has expired</h1>
                    <p className="text-gray-600 mb-8">
                        Your free trial or billing period has ended. Please contact us to renew your access to PostChef and continue automating your social media.
                    </p>
                    <a href="mailto:support@example.com" className="inline-block bg-[#1A1A1A] text-white font-medium rounded-md px-6 py-3 hover:bg-gray-800 transition-colors">
                        Contact Support to Renew
                    </a>
                </div>
            </div>
        )
    }

    const signOut = async () => {
        'use server'
        const supabase = createClient()
        await supabase.auth.signOut()
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex text-[#1A1A1A]">
            {/* Sidebar */}
            <aside className="w-64 bg-[#1A1A1A] text-white hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#FF6B35]"></div>
                    <span className="font-bold text-xl tracking-tight">PostChef</span>
                </div>
                <nav className="p-4 flex flex-col gap-2 flex-1">
                    <Link href="/dashboard" className="px-4 py-3 hover:bg-gray-800 rounded-md font-medium text-sm flex items-center gap-3 transition-colors">
                        <LayoutDashboard size={18} />
                        Overview
                    </Link>
                    <Link href="/dashboard/create" className="px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md font-medium text-sm flex items-center gap-3 transition-colors">
                        <PenSquare size={18} />
                        Create Post
                    </Link>
                    <Link href="/dashboard/calendar" className="px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md font-medium text-sm flex items-center gap-3 transition-colors">
                        <Calendar size={18} />
                        Calendar
                    </Link>
                    <Link href="/dashboard/media" className="px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md font-medium text-sm flex items-center gap-3 transition-colors">
                        <FolderOpen size={18} />
                        Media Library
                    </Link>
                    <Link href="/dashboard/settings" className="px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md font-medium text-sm flex items-center gap-3 transition-colors mt-auto">
                        <Settings size={18} />
                        Settings
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 border-b bg-white flex items-center justify-end px-8">
                    <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-gray-500">{user.email}</div>
                        <form action={signOut}>
                            <button className="p-2 text-gray-400 hover:text-[#1A1A1A] hover:bg-gray-100 rounded-md transition-colors" title="Sign Out">
                                <LogOut size={18} />
                            </button>
                        </form>
                    </div>
                </header>

                {/* Expiry Warning Banner */}
                {daysRemaining <= 5 && daysRemaining > 0 && (
                    <div className="bg-yellow-50 border-b border-yellow-200 px-8 py-3 flex items-center gap-3 text-yellow-800 text-sm font-medium">
                        <AlertTriangle size={16} className="text-yellow-600" />
                        Your plan expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}. Please contact us to renew your subscription.
                    </div>
                )}

                <main className="p-8 flex-1">
                    {children}
                </main>
            </div>
        </div>
    )
}
