import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import SubmitButton from '@/components/settings/SubmitButton'

export default function Login({ searchParams }: { searchParams: { message: string } }) {
    const signIn = async (formData: FormData) => {
        'use server'

        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const supabase = createClient()

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return redirect(`/login?message=${encodeURIComponent(error.message)}`)
        }

        return redirect('/dashboard')
    }

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
            <form
                className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
                action={signIn}
            >
                <h2 className="text-3xl font-bold mb-6 text-[#1A1A1A]">Welcome back to Brand Pilot</h2>

                <label className="text-md font-medium text-[#1A1A1A]" htmlFor="email">
                    Email
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-4 focus:outline-none focus:border-[#FF6B35]"
                    name="email"
                    placeholder="you@example.com"
                    required
                />

                <label className="text-md font-medium text-[#1A1A1A]" htmlFor="password">
                    Password
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-4 focus:outline-none focus:border-[#FF6B35]"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                />

                <SubmitButton
                    text="Sign In"
                    loadingText="Signing in..."
                    className="bg-[#FF6B35] rounded-md px-4 py-2 text-white mb-2 font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                />

                {searchParams?.message && (
                    <p className={`mt-4 p-4 text-center rounded-md text-sm ${searchParams.message.toLowerCase().includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {searchParams.message}
                    </p>
                )}
            </form>
            <p className="mt-6 text-center text-xs text-gray-400">
                By continuing you agree to our{' '}
                <Link href="/terms" className="text-gray-500 underline hover:text-[#1A1A1A] transition-colors">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-gray-500 underline hover:text-[#1A1A1A] transition-colors">Privacy Policy</Link>.
            </p>
        </div>
    )
}
