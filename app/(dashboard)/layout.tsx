import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Calendar, PenSquare, Settings, LogOut, FolderOpen, AlertTriangle, Users } from 'lucide-react'

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
        .select('id, plan, plan_end_date')
        .eq('user_id', user.id)
        .limit(1)

    const restaurant = restaurants?.[0]

    let isExpired = false
    let daysRemaining = 999
    let metaDisconnected = false

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

        // Fetch Meta Account status
        const { data: metaAccount } = await supabase
            .from('connected_accounts')
            .select('is_active, meta_token_expires_at')
            .eq('restaurant_id', restaurant.id)
            .eq('platform', 'facebook')
            .maybeSingle()

        if (metaAccount) {
            if (metaAccount.is_active === false) {
                metaDisconnected = true
            } else if (metaAccount.meta_token_expires_at) {
                const expiryDate = new Date(metaAccount.meta_token_expires_at)
                if (expiryDate <= new Date()) {
                    metaDisconnected = true
                }
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
                        Your free trial or billing period has ended. Please contact us to renew your access to Brand Pilot and continue automating your social media.
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

    const navLinks = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
        { href: '/dashboard/create', icon: PenSquare, label: 'Create' },
        { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
        { href: '/dashboard/media', icon: FolderOpen, label: 'Media' },
        { href: '/dashboard/contacts', icon: Users, label: 'Contacts' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ]

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex text-[#1A1A1A]">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-[#1A1A1A] text-white hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#FF6B35]"></div>
                    <span className="font-bold text-xl tracking-tight">Brand Pilot</span>
                </div>
                <nav className="p-4 flex flex-col gap-2 flex-1">
                    {navLinks.map(({ href, icon: Icon, label, isNew }) => (
                        <Link key={href} href={href} className="px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md font-medium text-sm flex items-center gap-3 transition-colors relative group">
                            <Icon size={18} />
                            {label}
                            {isNew && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FF6B35] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                    NEW
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-8">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 md:hidden">
                        <div className="w-7 h-7 rounded bg-[#FF6B35]"></div>
                        <span className="font-bold text-lg tracking-tight">Brand Pilot</span>
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="text-sm font-medium text-gray-500 hidden sm:block">{user.email}</div>
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

                {/* Meta Expiry Warning Banner */}
                {metaDisconnected && (
                    <Link href="/dashboard/settings" className="block bg-red-50 border-b border-red-200 px-8 py-3 flex items-center gap-3 text-red-800 text-sm font-medium hover:bg-red-100 transition-colors">
                        <AlertTriangle size={16} className="text-red-600 shrink-0" />
                        Your Facebook/Instagram connection has expired or been disconnected. Click here to reconnect in Settings.
                    </Link>
                )}

                <main className="p-4 md:p-8 flex-1 pb-24 md:pb-8">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1A1A1A] text-white flex items-center justify-around h-16 z-50 border-t border-gray-800">
                {navLinks.map(({ href, icon: Icon, label }) => (
                    <Link key={href} href={href} className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-gray-400 hover:text-white transition-colors">
                <span className="text-[10px] font-medium">{label}</span>
                    </Link>
                ))}
            </nav>

            {/* Legal footer — desktop only, sits above mobile nav */}
            <div className="hidden md:block fixed bottom-0 left-0 w-64 border-t border-gray-800 bg-[#1A1A1A] px-4 py-3">
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
                    <span>·</span>
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">Terms</Link>
                </div>
            </div>
        </div>
    )
}
