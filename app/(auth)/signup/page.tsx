import { createClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SubmitButton from '@/components/settings/SubmitButton'

export default function Signup({ searchParams }: { searchParams: { message: string } }) {
    const signUp = async (formData: FormData) => {
        'use server'

        const origin = headers().get('origin')
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const supabase = createClient()

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                // We must use origin here, ensuring we fallback appropriately if NEXT_PUBLIC_APP_URL is missing on Vercel
                emailRedirectTo: `${origin}/api/auth/callback`,
            },
        })

        if (error) {
            return redirect(`/signup?message=${encodeURIComponent(error.message)}`)
        }

        return redirect('/signup?message=Check email to continue sign in process')
    }

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
            <form
                className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
                action={signUp}
            >
                <h2 className="text-3xl font-bold mb-6 text-[#1A1A1A]">Create a Brand Pilot Account</h2>

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
                    minLength={6}
                    required
                />

                <SubmitButton
                    text="Sign Up"
                    loadingText="Signing up..."
                    className="bg-[#1A1A1A] rounded-md px-4 py-2 text-white mb-2 font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                />

                {searchParams?.message && (
                    <p className="mt-4 p-4 bg-blue-100 text-blue-600 text-center rounded-md text-sm">
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
